-- =====================================================
-- VOLLSTÄNDIGES DATABASE SETUP FÜR STANDALONE POSTGRESQL
-- Ohne Supabase / Ohne Internet-Abhängigkeiten
-- =====================================================

-- 1. DATENBANK ERSTELLEN (als postgres superuser ausführen)
-- CREATE DATABASE klinik_aufnahme;
-- \c klinik_aufnahme

-- 2. EXTENSION FÜR PASSWORT-HASHING
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =====================================================
-- ENUM TYPEN
-- =====================================================

CREATE TYPE gender AS ENUM ('m', 'w', 'd');
CREATE TYPE urgency AS ENUM ('elektiv', 'dringend');
CREATE TYPE admission_type AS ENUM ('VOLLSTATION', 'TEILSTATION');
CREATE TYPE station AS ENUM ('A', 'B', 'C', 'D');
CREATE TYPE voll_station AS ENUM ('E', 'F', 'G');
CREATE TYPE app_role AS ENUM (
  'ADMIN', 'MANAGER', 'INTAKE', 'VOLL_VIEW',
  'arzt_a', 'arzt_b', 'arzt_c', 'arzt_d', 'arzt_allgemein',
  'pflege_a', 'pflege_b', 'pflege_c', 'pflege_d'
);

-- =====================================================
-- AUTHENTIFIZIERUNGS-TABELLEN (ersetzt Supabase Auth)
-- =====================================================

-- Benutzer-Tabelle mit Passwort-Hash
CREATE TABLE public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  email_confirmed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_sign_in_at timestamptz
);

-- Index für schnelle Email-Suche
CREATE INDEX idx_users_email ON public.users(email);

-- =====================================================
-- ANWENDUNGS-TABELLEN
-- =====================================================

-- Profile
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  display_name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_profiles_username ON public.profiles(username);

-- Benutzer-Rollen
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, role)
);

CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);

-- Patienten
CREATE TABLE public.patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Stammdaten
  first_name text NOT NULL,
  last_name text NOT NULL,
  birth_date date NOT NULL,
  gender gender NOT NULL,
  case_number text UNIQUE,
  
  -- Kontakt
  phone text,
  email text,
  
  -- Medizinische Felder
  catchment_area boolean NOT NULL DEFAULT false,
  diagnosis text NOT NULL,
  external_referral boolean NOT NULL DEFAULT false,
  substance_abuse boolean NOT NULL DEFAULT false,
  substance_abuse_details text,
  relevant_conditions boolean NOT NULL DEFAULT false,
  relevant_conditions_details text,
  notes text,
  auftrag text,
  move_back_reason text,
  insurance text,
  
  -- Aufnahme
  admission_type admission_type NOT NULL,
  urgency urgency,
  station station,
  on_waiting_list boolean DEFAULT false,
  pre_interview_confirmed boolean DEFAULT false,
  voll_station voll_station,
  secondary_station voll_station,
  monday_call boolean,
  pre_interview_date timestamptz,
  admission_date timestamptz,
  
  -- Metadaten
  created_by uuid NOT NULL REFERENCES public.users(id),
  created_by_display_name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  last_modified_by uuid NOT NULL REFERENCES public.users(id),
  last_modified_by_display_name text NOT NULL,
  last_modified_at timestamptz DEFAULT now(),
  archived boolean NOT NULL DEFAULT false
);

CREATE INDEX idx_patients_station ON public.patients(station);
CREATE INDEX idx_patients_voll_station ON public.patients(voll_station);
CREATE INDEX idx_patients_admission_type ON public.patients(admission_type);
CREATE INDEX idx_patients_archived ON public.patients(archived);
CREATE INDEX idx_patients_on_waiting_list ON public.patients(on_waiting_list);
CREATE INDEX idx_patients_created_by ON public.patients(created_by);

-- =====================================================
-- SESSION-MANAGEMENT FÜR RLS
-- =====================================================

-- Funktion zum Setzen der aktuellen User-ID (vom Backend aufzurufen)
CREATE OR REPLACE FUNCTION public.set_current_user_id(user_id uuid)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('app.current_user_id', user_id::text, false);
END;
$$;

-- Funktion zum Abrufen der aktuellen User-ID
CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.current_user_id', true), '')::uuid;
$$;

-- =====================================================
-- ROLLEN-HILFSFUNKTIONEN
-- =====================================================

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles app_role[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = ANY(_roles)
  );
$$;

CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id uuid)
RETURNS app_role[] LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COALESCE(array_agg(role), '{}')
  FROM public.user_roles
  WHERE user_id = _user_id;
$$;

-- =====================================================
-- AUTHENTIFIZIERUNGS-FUNKTIONEN
-- =====================================================

-- Benutzer erstellen
CREATE OR REPLACE FUNCTION public.create_user(
  p_email text,
  p_password text,
  p_username text,
  p_display_name text,
  p_roles app_role[] DEFAULT ARRAY['INTAKE']::app_role[]
)
RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- User erstellen
  INSERT INTO public.users (email, password_hash, email_confirmed)
  VALUES (p_email, crypt(p_password, gen_salt('bf', 12)), true)
  RETURNING id INTO v_user_id;
  
  -- Profil erstellen
  INSERT INTO public.profiles (user_id, username, display_name)
  VALUES (v_user_id, p_username, p_display_name);
  
  -- Rollen zuweisen
  INSERT INTO public.user_roles (user_id, role)
  SELECT v_user_id, unnest(p_roles);
  
  RETURN v_user_id;
END;
$$;

-- Login-Funktion (gibt User-ID zurück wenn erfolgreich)
CREATE OR REPLACE FUNCTION public.authenticate_user(
  p_email text,
  p_password text
)
RETURNS TABLE (
  user_id uuid,
  username text,
  display_name text,
  roles app_role[]
) LANGUAGE plpgsql AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Passwort prüfen
  SELECT u.id INTO v_user_id
  FROM public.users u
  WHERE u.email = p_email
    AND u.password_hash = crypt(p_password, u.password_hash)
    AND u.email_confirmed = true;
  
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Last sign in aktualisieren
  UPDATE public.users SET last_sign_in_at = now() WHERE id = v_user_id;
  
  -- User-Daten zurückgeben
  RETURN QUERY
  SELECT 
    v_user_id,
    p.username,
    p.display_name,
    public.get_user_roles(v_user_id)
  FROM public.profiles p
  WHERE p.user_id = v_user_id;
END;
$$;

-- Passwort ändern
CREATE OR REPLACE FUNCTION public.change_password(
  p_user_id uuid,
  p_old_password text,
  p_new_password text
)
RETURNS boolean LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.users
  SET password_hash = crypt(p_new_password, gen_salt('bf', 12)),
      updated_at = now()
  WHERE id = p_user_id
    AND password_hash = crypt(p_old_password, password_hash);
  
  RETURN FOUND;
END;
$$;

-- =====================================================
-- AUTO-UPDATE TRIGGER FÜR TIMESTAMPS
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_last_modified_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.last_modified_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_patients_last_modified_at
  BEFORE UPDATE ON public.patients
  FOR EACH ROW EXECUTE FUNCTION public.update_last_modified_at();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

-- Users Policies
CREATE POLICY "Users can view own data"
  ON public.users FOR SELECT
  USING (id = current_user_id());

CREATE POLICY "Users can update own data"
  ON public.users FOR UPDATE
  USING (id = current_user_id());

-- Profiles Policies
CREATE POLICY "Anyone can view profiles"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (user_id = current_user_id());

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (user_id = current_user_id());

-- User Roles Policies
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  USING (user_id = current_user_id());

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  USING (has_role(current_user_id(), 'ADMIN'));

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  USING (has_role(current_user_id(), 'ADMIN'))
  WITH CHECK (has_role(current_user_id(), 'ADMIN'));

-- Patients Policies
CREATE POLICY "Authenticated users can view non-archived patients"
  ON public.patients FOR SELECT
  USING (archived = false AND current_user_id() IS NOT NULL);

CREATE POLICY "Admins can view all patients including archived"
  ON public.patients FOR SELECT
  USING (has_role(current_user_id(), 'ADMIN'));

CREATE POLICY "Authorized users can create patients"
  ON public.patients FOR INSERT
  WITH CHECK (
    has_any_role(current_user_id(), ARRAY[
      'ADMIN', 'MANAGER', 'INTAKE',
      'arzt_a', 'arzt_b', 'arzt_c', 'arzt_d', 'arzt_allgemein'
    ]::app_role[])
  );

CREATE POLICY "Authorized users can update patients"
  ON public.patients FOR UPDATE
  USING (
    has_any_role(current_user_id(), ARRAY[
      'ADMIN', 'MANAGER', 'INTAKE',
      'arzt_a', 'arzt_b', 'arzt_c', 'arzt_d', 'arzt_allgemein'
    ]::app_role[])
  );

CREATE POLICY "Admins can delete patients"
  ON public.patients FOR DELETE
  USING (has_role(current_user_id(), 'ADMIN'));

-- =====================================================
-- ADMIN-BENUTZER ERSTELLEN
-- =====================================================

-- Ersten Admin-Benutzer anlegen (Passwort ändern!)
SELECT public.create_user(
  'admin@clinic.local',
  'ChangeMe123!',
  'admin',
  'Administrator',
  ARRAY['ADMIN']::app_role[]
);

-- =====================================================
-- FERTIG!
-- =====================================================

-- =====================================================
-- MIGRATIONEN FÜR BESTEHENDE DATENBANKEN (idempotent)
-- Auf bestehender lokaler DB ausführen, um neue Spalten nachzuziehen.
-- =====================================================
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS insurance text;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS auftrag text;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS move_back_reason text;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS pre_interview_confirmed boolean DEFAULT false;

-- monday_call: DEFAULT entfernen, damit unbeantwortet als NULL gespeichert wird
ALTER TABLE public.patients ALTER COLUMN monday_call DROP DEFAULT;

-- Patient-Kontakthistorie (mehrere Einträge pro Patient)
CREATE TABLE IF NOT EXISTS public.patient_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_by uuid NOT NULL,
  created_by_display_name text NOT NULL,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_patient_contacts_patient ON public.patient_contacts(patient_id);

-- Rechte für lokale Backend-User: bestehende eingeschränkte DB-User brauchen
-- mindestens Zugriff auf Tabelle und Sequenzen/Funktionen, sonst scheitert POST /contacts.
GRANT USAGE ON SCHEMA public TO PUBLIC;
GRANT SELECT, INSERT ON public.patient_contacts TO PUBLIC;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO PUBLIC;

ALTER TABLE public.patient_contacts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'patient_contacts'
      AND policyname = 'Authenticated users can view patient contacts'
  ) THEN
    CREATE POLICY "Authenticated users can view patient contacts"
      ON public.patient_contacts FOR SELECT
      USING (current_user_id() IS NOT NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'patient_contacts'
      AND policyname = 'Authorized users can create patient contacts'
  ) THEN
    CREATE POLICY "Authorized users can create patient contacts"
      ON public.patient_contacts FOR INSERT
      WITH CHECK (
        created_by = current_user_id()
        AND has_any_role(current_user_id(), ARRAY[
          'ADMIN', 'MANAGER', 'INTAKE',
          'arzt_a', 'arzt_b', 'arzt_c', 'arzt_d', 'arzt_allgemein',
          'pflege_a', 'pflege_b', 'pflege_c', 'pflege_d'
        ]::app_role[])
      );
  END IF;
END $$;

-- Fallback für Installationen mit eingeschränktem Backend-DB-User:
-- Die API kann Kontakte über diese Funktionen lesen/schreiben, ohne an direkten
-- Tabellenrechten/RLS des eingeloggten Datenbankusers zu scheitern. Die fachliche
-- Berechtigung wird weiterhin über app.current_user_id und Rollen geprüft.
CREATE OR REPLACE FUNCTION public.get_patient_contacts(p_patient_id uuid)
RETURNS TABLE (
  id uuid,
  patient_id uuid,
  content text,
  created_by uuid,
  created_by_display_name text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.patient_id, c.content, c.created_by, c.created_by_display_name, c.created_at
  FROM public.patient_contacts c
  WHERE c.patient_id = p_patient_id
    AND public.current_user_id() IS NOT NULL
  ORDER BY c.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.create_patient_contact(
  p_patient_id uuid,
  p_content text,
  p_created_by uuid,
  p_created_by_display_name text
)
RETURNS public.patient_contacts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_contact public.patient_contacts;
BEGIN
  IF public.current_user_id() IS NULL THEN
    RAISE EXCEPTION 'Nicht authentifiziert';
  END IF;

  IF p_created_by <> public.current_user_id() THEN
    RAISE EXCEPTION 'Benutzerkontext stimmt nicht überein';
  END IF;

  IF NOT public.has_any_role(public.current_user_id(), ARRAY[
    'ADMIN', 'MANAGER', 'INTAKE',
    'arzt_a', 'arzt_b', 'arzt_c', 'arzt_d', 'arzt_allgemein',
    'pflege_a', 'pflege_b', 'pflege_c', 'pflege_d'
  ]::app_role[]) THEN
    RAISE EXCEPTION 'Keine Berechtigung für Kontakteinträge';
  END IF;

  INSERT INTO public.patient_contacts (patient_id, content, created_by, created_by_display_name)
  VALUES (p_patient_id, btrim(p_content), p_created_by, p_created_by_display_name)
  RETURNING * INTO new_contact;

  RETURN new_contact;
END;
$$;

-- Diese Grants müssen nach dem Anlegen/Ersetzen der Funktionen erneut gesetzt werden,
-- damit auch eingeschränkte Backend-DB-User die Funktionen sicher aufrufen können.
GRANT USAGE ON SCHEMA public TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_current_user_id(uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_id() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_any_role(uuid, app_role[]) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_patient_contacts(uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_patient_contact(uuid, text, uuid, text) TO PUBLIC;
