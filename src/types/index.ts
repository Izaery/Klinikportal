// User Roles
export type UserRole = 
  | 'ADMIN' 
  | 'MANAGER' 
  | 'INTAKE' 
  | 'VOLL_VIEW' 
  | 'arzt_a' 
  | 'arzt_b' 
  | 'arzt_c' 
  | 'arzt_d'
  | 'arzt_allgemein'
  | 'pflege_a'
  | 'pflege_b'
  | 'pflege_c'
  | 'pflege_d';

export type AdmissionType = 'VOLLSTATION' | 'TEILSTATION';
export type Station = 'A' | 'B' | 'C' | 'D';
export type VollStation = 'E' | 'F' | 'G';
export type Gender = 'm' | 'w' | 'd';
export type Urgency = 'elektiv' | 'dringend';

export interface User {
  id: string;
  username: string;
  displayName: string;
  roles: UserRole[];
  createdAt: string;
}

export interface Patient {
  id: string;
  // Stammdaten
  firstName: string;
  lastName: string;
  birthDate: string;
  gender: Gender;
  caseNumber?: string; // Fallnummer - optional but unique
  
  // Kontakt
  phone?: string;
  email?: string;
  
  // Medizinische Felder
  catchmentArea: boolean; // Einzugsgebiet
  diagnosis: string;
  externalReferral: boolean; // Externe Einweisung
  substanceAbuse: boolean; // Suchtmittelabhängigkeit
  substanceAbuseDetails?: string;
  relevantConditions: boolean; // Relevante Erkrankungen/Behinderungen
  relevantConditionsDetails?: string;
  notes?: string; // Anmerkungen
  auftrag?: string; // Auftrag - Pflicht bei Teilstation
  
  // Aufnahme
  admissionType: AdmissionType;
  urgency?: Urgency; // Pflicht bei Teilstation
  station?: Station; // Nur bei Teilstation
  onWaitingList?: boolean; // Auf Warteliste (nach Vorgespräch, vor Aufnahme)
  preInterviewConfirmed?: boolean; // Vorgesprächstermin bestätigt
  vollStation?: VollStation; // Pflicht bei Vollstation (E, F, G)
  secondaryStation?: VollStation; // Optional bei Vollstation - sekundäre Station
  mondayCall?: boolean; // Montagsanruf - nur bei Vollstation
  preInterviewDate?: string; // Vorgesprächstermin - Pflicht bei Anlage
  admissionDate?: string; // Aufnahmedatum - Pflicht bei Stationszuweisung
  
  // Metadaten
  createdBy: string;
  createdByDisplayName: string;
  createdAt: string;
  lastModifiedBy: string;
  lastModifiedByDisplayName: string;
  lastModifiedAt: string;
  archived: boolean;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}

// Permission helpers
export const STATION_ROLES: Record<Station, UserRole> = {
  'A': 'arzt_a',
  'B': 'arzt_b',
  'C': 'arzt_c',
  'D': 'arzt_d',
};

export const ROLE_LABELS: Record<UserRole, string> = {
  'ADMIN': 'Administrator',
  'MANAGER': 'Manager',
  'INTAKE': 'Aufnahme',
  'VOLL_VIEW': 'Vollstation (Lesen)',
  'arzt_a': 'Arzt Station A',
  'arzt_b': 'Arzt Station B',
  'arzt_c': 'Arzt Station C',
  'arzt_d': 'Arzt Station D',
  'arzt_allgemein': 'Arzt (alle Stationen)',
  'pflege_a': 'Pflege Station A',
  'pflege_b': 'Pflege Station B',
  'pflege_c': 'Pflege Station C',
  'pflege_d': 'Pflege Station D',
};

export const GENDER_LABELS: Record<Gender, string> = {
  'm': 'männlich',
  'w': 'weiblich',
  'd': 'divers',
};

export const URGENCY_LABELS: Record<Urgency, string> = {
  'elektiv': 'Elektiv',
  'dringend': 'Dringend',
};

export const STATION_LABELS: Record<Station, string> = {
  'A': 'Station A',
  'B': 'Station B',
  'C': 'Station C',
  'D': 'Station D',
};

export const VOLL_STATION_LABELS: Record<VollStation, string> = {
  'E': 'Station E',
  'F': 'Station F',
  'G': 'Station G',
};
