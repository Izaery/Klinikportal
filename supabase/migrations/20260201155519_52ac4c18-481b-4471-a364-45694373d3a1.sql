-- Create enum types
CREATE TYPE public.gender AS ENUM ('m', 'w', 'd');
CREATE TYPE public.urgency AS ENUM ('elektiv', 'dringend');
CREATE TYPE public.admission_type AS ENUM ('VOLLSTATION', 'TEILSTATION');
CREATE TYPE public.station AS ENUM ('A', 'B', 'C', 'D');
CREATE TYPE public.voll_station AS ENUM ('E', 'F', 'G');
CREATE TYPE public.app_role AS ENUM (
  'ADMIN', 
  'MANAGER', 
  'INTAKE', 
  'VOLL_VIEW', 
  'arzt_a', 
  'arzt_b', 
  'arzt_c', 
  'arzt_d',
  'pflege_a',
  'pflege_b',
  'pflege_c',
  'pflege_d'
);

-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Create patients table
CREATE TABLE public.patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Stammdaten
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  birth_date DATE NOT NULL,
  gender gender NOT NULL,
  case_number TEXT UNIQUE,
  
  -- Kontakt
  phone TEXT,
  email TEXT,
  
  -- Medizinische Felder
  catchment_area BOOLEAN NOT NULL DEFAULT false,
  diagnosis TEXT NOT NULL,
  external_referral BOOLEAN NOT NULL DEFAULT false,
  substance_abuse BOOLEAN NOT NULL DEFAULT false,
  substance_abuse_details TEXT,
  relevant_conditions BOOLEAN NOT NULL DEFAULT false,
  relevant_conditions_details TEXT,
  notes TEXT,
  
  -- Aufnahme
  admission_type admission_type NOT NULL,
  urgency urgency,
  station station,
  on_waiting_list BOOLEAN DEFAULT false,
  voll_station voll_station,
  secondary_station voll_station,
  monday_call BOOLEAN DEFAULT false,
  pre_interview_date TIMESTAMP WITH TIME ZONE,
  admission_date TIMESTAMP WITH TIME ZONE,
  
  -- Metadaten
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_by_display_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_modified_by UUID REFERENCES auth.users(id) NOT NULL,
  last_modified_by_display_name TEXT NOT NULL,
  last_modified_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  archived BOOLEAN NOT NULL DEFAULT false
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

-- Security definer function to check user roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to check if user has any of the specified roles
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id UUID, _roles app_role[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = ANY(_roles)
  )
$$;

-- Get all roles for a user
CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id UUID)
RETURNS app_role[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(array_agg(role), ARRAY[]::app_role[])
  FROM public.user_roles
  WHERE user_id = _user_id
$$;

-- Profiles RLS Policies
CREATE POLICY "Users can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- User Roles RLS Policies
CREATE POLICY "Users can view own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'ADMIN'));

CREATE POLICY "Admins can manage roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'ADMIN'))
WITH CHECK (public.has_role(auth.uid(), 'ADMIN'));

-- Patients RLS Policies
CREATE POLICY "Authenticated users can view non-archived patients"
ON public.patients FOR SELECT
TO authenticated
USING (archived = false);

CREATE POLICY "Admins can view all patients including archived"
ON public.patients FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'ADMIN'));

CREATE POLICY "Authorized users can create patients"
ON public.patients FOR INSERT
TO authenticated
WITH CHECK (
  public.has_any_role(auth.uid(), ARRAY['ADMIN', 'MANAGER', 'INTAKE', 'arzt_a', 'arzt_b', 'arzt_c', 'arzt_d']::app_role[])
);

CREATE POLICY "Authorized users can update patients"
ON public.patients FOR UPDATE
TO authenticated
USING (
  public.has_any_role(auth.uid(), ARRAY['ADMIN', 'MANAGER', 'INTAKE', 'arzt_a', 'arzt_b', 'arzt_c', 'arzt_d']::app_role[])
);

CREATE POLICY "Admins can delete patients"
ON public.patients FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'ADMIN'));

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Update timestamp trigger for profiles
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update last_modified_at trigger for patients
CREATE OR REPLACE FUNCTION public.update_patient_modified_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_modified_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_patients_modified_at
BEFORE UPDATE ON public.patients
FOR EACH ROW
EXECUTE FUNCTION public.update_patient_modified_at();