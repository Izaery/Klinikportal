import React, { createContext, useContext, useState, useCallback } from 'react';
import { Patient, Station, VollStation, AdmissionType } from '@/types';
import { useAuth } from './AuthContext';

interface PatientContextType {
  patients: Patient[];
  addPatient: (patient: Omit<Patient, 'id' | 'createdAt' | 'createdBy' | 'createdByDisplayName' | 'lastModifiedAt' | 'lastModifiedBy' | 'lastModifiedByDisplayName' | 'archived'>) => void;
  updatePatient: (id: string, updates: Partial<Patient>) => void;
  archivePatient: (id: string) => void;
  assignStation: (id: string, station: Station) => void;
  getVollstationPatients: () => Patient[];
  getTeilstationPatients: () => Patient[];
  getOpenTeilstationPatients: () => Patient[];
  getStationPatients: (station: Station) => Patient[];
  getVollStationPatients: (vollStation: VollStation) => Patient[];
  getRecentlyModified: (limit?: number) => Patient[];
}

const PatientContext = createContext<PatientContextType | undefined>(undefined);

// Mock initial patients
const INITIAL_PATIENTS: Patient[] = [
  {
    id: '1',
    firstName: 'Hans',
    lastName: 'Müller',
    birthDate: '1965-03-15',
    gender: 'm',
    caseNumber: 'F2024001',
    phone: '0171-1234567',
    email: 'hans.mueller@email.de',
    catchmentArea: true,
    diagnosis: 'Depression F32.1',
    externalReferral: false,
    substanceAbuse: false,
    relevantConditions: true,
    relevantConditionsDetails: 'Diabetes Typ 2',
    notes: 'Erstaufnahme',
    admissionType: 'VOLLSTATION',
    createdBy: 'admin',
    createdByDisplayName: 'Dr. Admin',
    createdAt: '2024-01-15T10:30:00Z',
    lastModifiedBy: 'admin',
    lastModifiedByDisplayName: 'Dr. Admin',
    lastModifiedAt: '2024-01-15T10:30:00Z',
    archived: false,
  },
  {
    id: '2',
    firstName: 'Maria',
    lastName: 'Schmidt',
    birthDate: '1978-07-22',
    gender: 'w',
    phone: '0172-9876543',
    catchmentArea: true,
    diagnosis: 'Angststörung F41.0',
    externalReferral: true,
    substanceAbuse: false,
    relevantConditions: false,
    admissionType: 'TEILSTATION',
    urgency: 'elektiv',
    station: 'A',
    createdBy: 'aufnahme',
    createdByDisplayName: 'Hr. Aufnahme',
    createdAt: '2024-01-14T09:00:00Z',
    lastModifiedBy: 'arzt_a',
    lastModifiedByDisplayName: 'Dr. Schmidt (A)',
    lastModifiedAt: '2024-01-16T14:20:00Z',
    archived: false,
  },
  {
    id: '3',
    firstName: 'Peter',
    lastName: 'Weber',
    birthDate: '1990-11-08',
    gender: 'm',
    email: 'p.weber@mail.com',
    catchmentArea: false,
    diagnosis: 'Bipolare Störung F31.3',
    externalReferral: true,
    substanceAbuse: true,
    substanceAbuseDetails: 'Alkohol',
    relevantConditions: false,
    admissionType: 'TEILSTATION',
    urgency: 'dringend',
    createdBy: 'aufnahme',
    createdByDisplayName: 'Hr. Aufnahme',
    createdAt: '2024-01-16T11:45:00Z',
    lastModifiedBy: 'aufnahme',
    lastModifiedByDisplayName: 'Hr. Aufnahme',
    lastModifiedAt: '2024-01-16T11:45:00Z',
    archived: false,
  },
  {
    id: '4',
    firstName: 'Anna',
    lastName: 'Fischer',
    birthDate: '1985-04-30',
    gender: 'w',
    phone: '0163-5551234',
    catchmentArea: true,
    diagnosis: 'PTBS F43.1',
    externalReferral: false,
    substanceAbuse: false,
    relevantConditions: true,
    relevantConditionsDetails: 'Chronische Rückenschmerzen',
    admissionType: 'TEILSTATION',
    urgency: 'elektiv',
    station: 'B',
    createdBy: 'manager',
    createdByDisplayName: 'Fr. Manager',
    createdAt: '2024-01-13T16:00:00Z',
    lastModifiedBy: 'manager',
    lastModifiedByDisplayName: 'Fr. Manager',
    lastModifiedAt: '2024-01-17T09:15:00Z',
    archived: false,
  },
  {
    id: '5',
    firstName: 'Thomas',
    lastName: 'Becker',
    birthDate: '1972-09-12',
    gender: 'm',
    phone: '0151-7778899',
    email: 't.becker@example.de',
    catchmentArea: true,
    diagnosis: 'Schizophrenie F20.0',
    externalReferral: true,
    substanceAbuse: false,
    relevantConditions: false,
    admissionType: 'VOLLSTATION',
    createdBy: 'admin',
    createdByDisplayName: 'Dr. Admin',
    createdAt: '2024-01-12T08:30:00Z',
    lastModifiedBy: 'admin',
    lastModifiedByDisplayName: 'Dr. Admin',
    lastModifiedAt: '2024-01-12T08:30:00Z',
    archived: false,
  },
  {
    id: '6',
    firstName: 'Sabine',
    lastName: 'Klein',
    birthDate: '1995-02-28',
    gender: 'w',
    email: 'sabine.klein@web.de',
    catchmentArea: true,
    diagnosis: 'Essstörung F50.0',
    externalReferral: false,
    substanceAbuse: false,
    relevantConditions: false,
    notes: 'Ambulante Vorbehandlung vorhanden',
    admissionType: 'TEILSTATION',
    urgency: 'dringend',
    station: 'C',
    createdBy: 'aufnahme',
    createdByDisplayName: 'Hr. Aufnahme',
    createdAt: '2024-01-17T10:00:00Z',
    lastModifiedBy: 'arzt_c',
    lastModifiedByDisplayName: 'Dr. Meier (C)',
    lastModifiedAt: '2024-01-17T15:30:00Z',
    archived: false,
  },
  {
    id: '7',
    firstName: 'Klaus',
    lastName: 'Hoffmann',
    birthDate: '1960-06-05',
    gender: 'm',
    phone: '0170-4443322',
    catchmentArea: false,
    diagnosis: 'Zwangsstörung F42.2',
    externalReferral: true,
    substanceAbuse: false,
    relevantConditions: true,
    relevantConditionsDetails: 'Herzinsuffizienz',
    admissionType: 'TEILSTATION',
    urgency: 'elektiv',
    createdBy: 'aufnahme',
    createdByDisplayName: 'Hr. Aufnahme',
    createdAt: '2024-01-17T14:00:00Z',
    lastModifiedBy: 'aufnahme',
    lastModifiedByDisplayName: 'Hr. Aufnahme',
    lastModifiedAt: '2024-01-17T14:00:00Z',
    archived: false,
  },
];

export const PatientProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [patients, setPatients] = useState<Patient[]>(INITIAL_PATIENTS);
  const { user } = useAuth();

  const addPatient = useCallback((patientData: Omit<Patient, 'id' | 'createdAt' | 'createdBy' | 'createdByDisplayName' | 'lastModifiedAt' | 'lastModifiedBy' | 'lastModifiedByDisplayName' | 'archived'>) => {
    const now = new Date().toISOString();
    const newPatient: Patient = {
      ...patientData,
      id: Date.now().toString(),
      createdBy: user?.username || 'unknown',
      createdByDisplayName: user?.displayName || 'Unbekannt',
      createdAt: now,
      lastModifiedBy: user?.username || 'unknown',
      lastModifiedByDisplayName: user?.displayName || 'Unbekannt',
      lastModifiedAt: now,
      archived: false,
    };
    setPatients(prev => [...prev, newPatient]);
  }, [user]);

  const updatePatient = useCallback((id: string, updates: Partial<Patient>) => {
    setPatients(prev => prev.map(p => {
      if (p.id === id) {
        return {
          ...p,
          ...updates,
          lastModifiedBy: user?.username || 'unknown',
          lastModifiedByDisplayName: user?.displayName || 'Unbekannt',
          lastModifiedAt: new Date().toISOString(),
        };
      }
      return p;
    }));
  }, [user]);

  const archivePatient = useCallback((id: string) => {
    updatePatient(id, { archived: true });
  }, [updatePatient]);

  const assignStation = useCallback((id: string, station: Station) => {
    updatePatient(id, { station });
  }, [updatePatient]);

  const getVollstationPatients = useCallback((): Patient[] => {
    return patients.filter(p => !p.archived && p.admissionType === 'VOLLSTATION');
  }, [patients]);

  const getTeilstationPatients = useCallback((): Patient[] => {
    return patients.filter(p => !p.archived && p.admissionType === 'TEILSTATION');
  }, [patients]);

  const getOpenTeilstationPatients = useCallback((): Patient[] => {
    return patients.filter(p => !p.archived && p.admissionType === 'TEILSTATION' && !p.station);
  }, [patients]);

  const getStationPatients = useCallback((station: Station): Patient[] => {
    return patients.filter(p => !p.archived && p.admissionType === 'TEILSTATION' && p.station === station);
  }, [patients]);

  const getVollStationPatients = useCallback((vollStation: VollStation): Patient[] => {
    return patients.filter(p => !p.archived && p.admissionType === 'VOLLSTATION' && p.vollStation === vollStation);
  }, [patients]);

  const getRecentlyModified = useCallback((limit: number = 5): Patient[] => {
    return [...patients]
      .filter(p => !p.archived)
      .sort((a, b) => new Date(b.lastModifiedAt).getTime() - new Date(a.lastModifiedAt).getTime())
      .slice(0, limit);
  }, [patients]);

  return (
    <PatientContext.Provider
      value={{
        patients,
        addPatient,
        updatePatient,
        archivePatient,
        assignStation,
        getVollstationPatients,
        getTeilstationPatients,
        getOpenTeilstationPatients,
        getStationPatients,
        getVollStationPatients,
        getRecentlyModified,
      }}
    >
      {children}
    </PatientContext.Provider>
  );
};

export const usePatients = () => {
  const context = useContext(PatientContext);
  if (context === undefined) {
    throw new Error('usePatients must be used within a PatientProvider');
  }
  return context;
};
