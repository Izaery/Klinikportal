import React, { createContext, useContext, useState, useCallback } from 'react';
import { Patient, Station, VollStation, AdmissionType } from '@/types';
import { useAuth } from './AuthContext';

interface PatientContextType {
  patients: Patient[];
  addPatient: (patient: Omit<Patient, 'id' | 'createdAt' | 'createdBy' | 'createdByDisplayName' | 'lastModifiedAt' | 'lastModifiedBy' | 'lastModifiedByDisplayName' | 'archived'>) => void;
  updatePatient: (id: string, updates: Partial<Patient>) => void;
  archivePatient: (id: string) => void;
  restorePatient: (id: string) => void;
  assignStation: (id: string, station: Station) => void;
  getVollstationPatients: () => Patient[];
  getTeilstationPatients: () => Patient[];
  getOpenTeilstationPatients: () => Patient[];
  getStationPatients: (station: Station) => Patient[];
  getVollStationPatients: (vollStation: VollStation) => Patient[];
  getArchivedPatients: () => Patient[];
  getRecentlyModified: (limit?: number) => Patient[];
}

const PatientContext = createContext<PatientContextType | undefined>(undefined);

// Mock initial patients
const INITIAL_PATIENTS: Patient[] = [
  // Vollstation E
  { id: '1', firstName: 'Hans', lastName: 'Müller', birthDate: '1965-03-15', gender: 'm', caseNumber: 'F2024001', phone: '0171-1234567', email: 'hans.mueller@email.de', catchmentArea: true, diagnosis: 'Depression F32.1', externalReferral: false, substanceAbuse: false, relevantConditions: true, relevantConditionsDetails: 'Diabetes Typ 2', notes: 'Erstaufnahme', admissionType: 'VOLLSTATION', vollStation: 'E', createdBy: 'admin', createdByDisplayName: 'Dr. Admin', createdAt: '2024-01-15T10:30:00Z', lastModifiedBy: 'admin', lastModifiedByDisplayName: 'Dr. Admin', lastModifiedAt: '2024-01-15T10:30:00Z', archived: false },
  { id: '2', firstName: 'Thomas', lastName: 'Becker', birthDate: '1972-09-12', gender: 'm', phone: '0151-7778899', email: 't.becker@example.de', catchmentArea: true, diagnosis: 'Schizophrenie F20.0', externalReferral: true, substanceAbuse: false, relevantConditions: false, admissionType: 'VOLLSTATION', vollStation: 'E', createdBy: 'admin', createdByDisplayName: 'Dr. Admin', createdAt: '2024-01-12T08:30:00Z', lastModifiedBy: 'admin', lastModifiedByDisplayName: 'Dr. Admin', lastModifiedAt: '2024-01-12T08:30:00Z', archived: false },
  { id: '3', firstName: 'Gerhard', lastName: 'Schulze', birthDate: '1958-11-20', gender: 'm', phone: '0160-1112233', catchmentArea: true, diagnosis: 'Schwere Depression F33.2', externalReferral: true, substanceAbuse: true, substanceAbuseDetails: 'Benzodiazepine', relevantConditions: true, relevantConditionsDetails: 'Bluthochdruck', admissionType: 'VOLLSTATION', vollStation: 'E', createdBy: 'manager', createdByDisplayName: 'Fr. Manager', createdAt: '2024-01-10T14:00:00Z', lastModifiedBy: 'manager', lastModifiedByDisplayName: 'Fr. Manager', lastModifiedAt: '2024-01-10T14:00:00Z', archived: false },
  { id: '4', firstName: 'Helga', lastName: 'Braun', birthDate: '1970-05-08', gender: 'w', email: 'h.braun@mail.de', catchmentArea: false, diagnosis: 'Paranoide Schizophrenie F20.0', externalReferral: true, substanceAbuse: false, relevantConditions: false, admissionType: 'VOLLSTATION', vollStation: 'E', createdBy: 'aufnahme', createdByDisplayName: 'Hr. Aufnahme', createdAt: '2024-01-11T09:00:00Z', lastModifiedBy: 'aufnahme', lastModifiedByDisplayName: 'Hr. Aufnahme', lastModifiedAt: '2024-01-11T09:00:00Z', archived: false },

  // Vollstation F
  { id: '5', firstName: 'Ursula', lastName: 'Krause', birthDate: '1962-02-14', gender: 'w', phone: '0172-5554433', catchmentArea: true, diagnosis: 'Bipolare Störung F31.1', externalReferral: false, substanceAbuse: false, relevantConditions: true, relevantConditionsDetails: 'Schilddrüsenunterfunktion', admissionType: 'VOLLSTATION', vollStation: 'F', createdBy: 'admin', createdByDisplayName: 'Dr. Admin', createdAt: '2024-01-13T11:00:00Z', lastModifiedBy: 'admin', lastModifiedByDisplayName: 'Dr. Admin', lastModifiedAt: '2024-01-13T11:00:00Z', archived: false },
  { id: '6', firstName: 'Werner', lastName: 'Zimmermann', birthDate: '1955-08-30', gender: 'm', phone: '0163-9998877', email: 'w.zimmermann@web.de', catchmentArea: true, diagnosis: 'Wahnhafte Störung F22.0', externalReferral: true, substanceAbuse: false, relevantConditions: true, relevantConditionsDetails: 'Diabetes, Niereninsuffizienz', admissionType: 'VOLLSTATION', vollStation: 'F', createdBy: 'manager', createdByDisplayName: 'Fr. Manager', createdAt: '2024-01-14T15:30:00Z', lastModifiedBy: 'manager', lastModifiedByDisplayName: 'Fr. Manager', lastModifiedAt: '2024-01-14T15:30:00Z', archived: false },
  { id: '7', firstName: 'Ingrid', lastName: 'Hartmann', birthDate: '1968-12-03', gender: 'w', email: 'ingrid.h@email.de', catchmentArea: true, diagnosis: 'Schwere depressive Episode F32.2', externalReferral: false, substanceAbuse: true, substanceAbuseDetails: 'Alkohol', relevantConditions: false, admissionType: 'VOLLSTATION', vollStation: 'F', createdBy: 'aufnahme', createdByDisplayName: 'Hr. Aufnahme', createdAt: '2024-01-15T08:00:00Z', lastModifiedBy: 'aufnahme', lastModifiedByDisplayName: 'Hr. Aufnahme', lastModifiedAt: '2024-01-15T08:00:00Z', archived: false },

  // Vollstation G
  { id: '8', firstName: 'Dieter', lastName: 'Vogel', birthDate: '1950-04-22', gender: 'm', phone: '0170-3332211', catchmentArea: false, diagnosis: 'Organische Halluzinose F06.0', externalReferral: true, substanceAbuse: false, relevantConditions: true, relevantConditionsDetails: 'Demenz im Frühstadium', admissionType: 'VOLLSTATION', vollStation: 'G', createdBy: 'admin', createdByDisplayName: 'Dr. Admin', createdAt: '2024-01-09T10:00:00Z', lastModifiedBy: 'admin', lastModifiedByDisplayName: 'Dr. Admin', lastModifiedAt: '2024-01-09T10:00:00Z', archived: false },
  { id: '9', firstName: 'Elfriede', lastName: 'Neumann', birthDate: '1948-07-17', gender: 'w', phone: '0151-2223344', email: 'e.neumann@mail.de', catchmentArea: true, diagnosis: 'Katatone Schizophrenie F20.2', externalReferral: true, substanceAbuse: false, relevantConditions: true, relevantConditionsDetails: 'Herzrhythmusstörungen', admissionType: 'VOLLSTATION', vollStation: 'G', createdBy: 'manager', createdByDisplayName: 'Fr. Manager', createdAt: '2024-01-08T13:00:00Z', lastModifiedBy: 'manager', lastModifiedByDisplayName: 'Fr. Manager', lastModifiedAt: '2024-01-08T13:00:00Z', archived: false },
  { id: '10', firstName: 'Rolf', lastName: 'Schwarz', birthDate: '1960-01-25', gender: 'm', email: 'rolf.schwarz@gmx.de', catchmentArea: true, diagnosis: 'Schizoaffektive Störung F25.0', externalReferral: false, substanceAbuse: false, relevantConditions: false, admissionType: 'VOLLSTATION', vollStation: 'G', createdBy: 'aufnahme', createdByDisplayName: 'Hr. Aufnahme', createdAt: '2024-01-16T09:30:00Z', lastModifiedBy: 'aufnahme', lastModifiedByDisplayName: 'Hr. Aufnahme', lastModifiedAt: '2024-01-16T09:30:00Z', archived: false },
  { id: '11', firstName: 'Monika', lastName: 'Richter', birthDate: '1975-09-11', gender: 'w', phone: '0172-6667788', catchmentArea: true, diagnosis: 'Akute polymorphe psychotische Störung F23.1', externalReferral: true, substanceAbuse: true, substanceAbuseDetails: 'Cannabis', relevantConditions: false, admissionType: 'VOLLSTATION', vollStation: 'G', createdBy: 'admin', createdByDisplayName: 'Dr. Admin', createdAt: '2024-01-17T11:00:00Z', lastModifiedBy: 'admin', lastModifiedByDisplayName: 'Dr. Admin', lastModifiedAt: '2024-01-17T11:00:00Z', archived: false },

  // Vollstation ohne Zuweisung
  { id: '12', firstName: 'Heinrich', lastName: 'Lange', birthDate: '1963-06-19', gender: 'm', phone: '0160-4445566', catchmentArea: true, diagnosis: 'Rezidivierende Depression F33.1', externalReferral: false, substanceAbuse: false, relevantConditions: false, admissionType: 'VOLLSTATION', createdBy: 'aufnahme', createdByDisplayName: 'Hr. Aufnahme', createdAt: '2024-01-17T16:00:00Z', lastModifiedBy: 'aufnahme', lastModifiedByDisplayName: 'Hr. Aufnahme', lastModifiedAt: '2024-01-17T16:00:00Z', archived: false },

  // Teilstation A
  { id: '13', firstName: 'Maria', lastName: 'Schmidt', birthDate: '1978-07-22', gender: 'w', phone: '0172-9876543', catchmentArea: true, diagnosis: 'Angststörung F41.0', externalReferral: true, substanceAbuse: false, relevantConditions: false, admissionType: 'TEILSTATION', urgency: 'elektiv', station: 'A', createdBy: 'aufnahme', createdByDisplayName: 'Hr. Aufnahme', createdAt: '2024-01-14T09:00:00Z', lastModifiedBy: 'arzt_a', lastModifiedByDisplayName: 'Dr. Schmidt (A)', lastModifiedAt: '2024-01-16T14:20:00Z', archived: false },
  { id: '14', firstName: 'Jürgen', lastName: 'Franke', birthDate: '1982-03-05', gender: 'm', email: 'j.franke@email.de', catchmentArea: true, diagnosis: 'Soziale Phobie F40.1', externalReferral: false, substanceAbuse: false, relevantConditions: false, admissionType: 'TEILSTATION', urgency: 'elektiv', station: 'A', createdBy: 'aufnahme', createdByDisplayName: 'Hr. Aufnahme', createdAt: '2024-01-13T10:00:00Z', lastModifiedBy: 'arzt_a', lastModifiedByDisplayName: 'Dr. Schmidt (A)', lastModifiedAt: '2024-01-15T11:00:00Z', archived: false },
  { id: '15', firstName: 'Claudia', lastName: 'Wolf', birthDate: '1990-11-18', gender: 'w', phone: '0163-1234567', email: 'c.wolf@web.de', catchmentArea: true, diagnosis: 'Panikstörung F41.0', externalReferral: true, substanceAbuse: false, relevantConditions: true, relevantConditionsDetails: 'Asthma', admissionType: 'TEILSTATION', urgency: 'dringend', station: 'A', createdBy: 'manager', createdByDisplayName: 'Fr. Manager', createdAt: '2024-01-15T14:00:00Z', lastModifiedBy: 'manager', lastModifiedByDisplayName: 'Fr. Manager', lastModifiedAt: '2024-01-15T14:00:00Z', archived: false },
  { id: '16', firstName: 'Stefan', lastName: 'Berger', birthDate: '1975-08-29', gender: 'm', phone: '0170-9998877', catchmentArea: false, diagnosis: 'Generalisierte Angststörung F41.1', externalReferral: false, substanceAbuse: false, relevantConditions: false, admissionType: 'TEILSTATION', urgency: 'elektiv', station: 'A', createdBy: 'aufnahme', createdByDisplayName: 'Hr. Aufnahme', createdAt: '2024-01-16T08:30:00Z', lastModifiedBy: 'arzt_a', lastModifiedByDisplayName: 'Dr. Schmidt (A)', lastModifiedAt: '2024-01-17T09:00:00Z', archived: false },

  // Teilstation B
  { id: '17', firstName: 'Anna', lastName: 'Fischer', birthDate: '1985-04-30', gender: 'w', phone: '0163-5551234', catchmentArea: true, diagnosis: 'PTBS F43.1', externalReferral: false, substanceAbuse: false, relevantConditions: true, relevantConditionsDetails: 'Chronische Rückenschmerzen', admissionType: 'TEILSTATION', urgency: 'elektiv', station: 'B', createdBy: 'manager', createdByDisplayName: 'Fr. Manager', createdAt: '2024-01-13T16:00:00Z', lastModifiedBy: 'manager', lastModifiedByDisplayName: 'Fr. Manager', lastModifiedAt: '2024-01-17T09:15:00Z', archived: false },
  { id: '18', firstName: 'Michael', lastName: 'Hofmann', birthDate: '1988-12-10', gender: 'm', email: 'm.hofmann@mail.de', catchmentArea: true, diagnosis: 'Anpassungsstörung F43.2', externalReferral: true, substanceAbuse: false, relevantConditions: false, admissionType: 'TEILSTATION', urgency: 'elektiv', station: 'B', createdBy: 'aufnahme', createdByDisplayName: 'Hr. Aufnahme', createdAt: '2024-01-14T11:00:00Z', lastModifiedBy: 'arzt_b', lastModifiedByDisplayName: 'Dr. Müller (B)', lastModifiedAt: '2024-01-16T10:00:00Z', archived: false },
  { id: '19', firstName: 'Petra', lastName: 'Lorenz', birthDate: '1979-06-14', gender: 'w', phone: '0151-8889900', catchmentArea: true, diagnosis: 'Dissoziative Störung F44.0', externalReferral: false, substanceAbuse: false, relevantConditions: false, admissionType: 'TEILSTATION', urgency: 'dringend', station: 'B', createdBy: 'manager', createdByDisplayName: 'Fr. Manager', createdAt: '2024-01-15T09:00:00Z', lastModifiedBy: 'arzt_b', lastModifiedByDisplayName: 'Dr. Müller (B)', lastModifiedAt: '2024-01-17T14:00:00Z', archived: false },
  { id: '20', firstName: 'Andreas', lastName: 'Keller', birthDate: '1992-02-20', gender: 'm', phone: '0172-3334455', email: 'a.keller@gmx.de', catchmentArea: false, diagnosis: 'Reaktive Depression F32.0', externalReferral: true, substanceAbuse: false, relevantConditions: false, admissionType: 'TEILSTATION', urgency: 'elektiv', station: 'B', createdBy: 'aufnahme', createdByDisplayName: 'Hr. Aufnahme', createdAt: '2024-01-16T13:00:00Z', lastModifiedBy: 'aufnahme', lastModifiedByDisplayName: 'Hr. Aufnahme', lastModifiedAt: '2024-01-16T13:00:00Z', archived: false },

  // Teilstation C
  { id: '21', firstName: 'Sabine', lastName: 'Klein', birthDate: '1995-02-28', gender: 'w', email: 'sabine.klein@web.de', catchmentArea: true, diagnosis: 'Essstörung F50.0', externalReferral: false, substanceAbuse: false, relevantConditions: false, notes: 'Ambulante Vorbehandlung vorhanden', admissionType: 'TEILSTATION', urgency: 'dringend', station: 'C', createdBy: 'aufnahme', createdByDisplayName: 'Hr. Aufnahme', createdAt: '2024-01-17T10:00:00Z', lastModifiedBy: 'arzt_c', lastModifiedByDisplayName: 'Dr. Meier (C)', lastModifiedAt: '2024-01-17T15:30:00Z', archived: false },
  { id: '22', firstName: 'Frank', lastName: 'Baumann', birthDate: '1983-09-07', gender: 'm', phone: '0160-7778899', catchmentArea: true, diagnosis: 'Bulimia nervosa F50.2', externalReferral: true, substanceAbuse: false, relevantConditions: false, admissionType: 'TEILSTATION', urgency: 'elektiv', station: 'C', createdBy: 'aufnahme', createdByDisplayName: 'Hr. Aufnahme', createdAt: '2024-01-12T14:00:00Z', lastModifiedBy: 'arzt_c', lastModifiedByDisplayName: 'Dr. Meier (C)', lastModifiedAt: '2024-01-14T16:00:00Z', archived: false },
  { id: '23', firstName: 'Karin', lastName: 'Schröder', birthDate: '1997-04-12', gender: 'w', email: 'k.schroeder@email.de', phone: '0172-1112233', catchmentArea: true, diagnosis: 'Anorexia nervosa F50.0', externalReferral: false, substanceAbuse: false, relevantConditions: true, relevantConditionsDetails: 'Osteoporose', admissionType: 'TEILSTATION', urgency: 'dringend', station: 'C', createdBy: 'manager', createdByDisplayName: 'Fr. Manager', createdAt: '2024-01-16T10:30:00Z', lastModifiedBy: 'manager', lastModifiedByDisplayName: 'Fr. Manager', lastModifiedAt: '2024-01-16T10:30:00Z', archived: false },
  { id: '24', firstName: 'Uwe', lastName: 'Peters', birthDate: '1980-01-30', gender: 'm', phone: '0163-4445566', catchmentArea: false, diagnosis: 'Atypische Essstörung F50.9', externalReferral: true, substanceAbuse: false, relevantConditions: false, admissionType: 'TEILSTATION', urgency: 'elektiv', station: 'C', createdBy: 'aufnahme', createdByDisplayName: 'Hr. Aufnahme', createdAt: '2024-01-17T08:00:00Z', lastModifiedBy: 'arzt_c', lastModifiedByDisplayName: 'Dr. Meier (C)', lastModifiedAt: '2024-01-17T12:00:00Z', archived: false },

  // Teilstation D
  { id: '25', firstName: 'Birgit', lastName: 'Engel', birthDate: '1986-10-05', gender: 'w', phone: '0170-5556677', email: 'b.engel@mail.de', catchmentArea: true, diagnosis: 'Zwangsstörung F42.0', externalReferral: false, substanceAbuse: false, relevantConditions: false, admissionType: 'TEILSTATION', urgency: 'elektiv', station: 'D', createdBy: 'aufnahme', createdByDisplayName: 'Hr. Aufnahme', createdAt: '2024-01-11T11:00:00Z', lastModifiedBy: 'arzt_d', lastModifiedByDisplayName: 'Dr. Wagner (D)', lastModifiedAt: '2024-01-15T10:00:00Z', archived: false },
  { id: '26', firstName: 'Martin', lastName: 'Sommer', birthDate: '1974-05-18', gender: 'm', phone: '0151-6667788', catchmentArea: true, diagnosis: 'Zwangsgedanken F42.0', externalReferral: true, substanceAbuse: false, relevantConditions: true, relevantConditionsDetails: 'Migräne', admissionType: 'TEILSTATION', urgency: 'dringend', station: 'D', createdBy: 'manager', createdByDisplayName: 'Fr. Manager', createdAt: '2024-01-12T09:00:00Z', lastModifiedBy: 'arzt_d', lastModifiedByDisplayName: 'Dr. Wagner (D)', lastModifiedAt: '2024-01-16T11:00:00Z', archived: false },
  { id: '27', firstName: 'Nicole', lastName: 'Winter', birthDate: '1991-08-23', gender: 'w', email: 'n.winter@web.de', catchmentArea: true, diagnosis: 'Zwangshandlungen F42.1', externalReferral: false, substanceAbuse: false, relevantConditions: false, admissionType: 'TEILSTATION', urgency: 'elektiv', station: 'D', createdBy: 'aufnahme', createdByDisplayName: 'Hr. Aufnahme', createdAt: '2024-01-14T15:00:00Z', lastModifiedBy: 'aufnahme', lastModifiedByDisplayName: 'Hr. Aufnahme', lastModifiedAt: '2024-01-14T15:00:00Z', archived: false },
  { id: '28', firstName: 'Oliver', lastName: 'Kaiser', birthDate: '1969-03-27', gender: 'm', phone: '0172-8889900', email: 'o.kaiser@gmx.de', catchmentArea: false, diagnosis: 'Zwangsstörung gemischt F42.2', externalReferral: true, substanceAbuse: false, relevantConditions: true, relevantConditionsDetails: 'Herzinsuffizienz', admissionType: 'TEILSTATION', urgency: 'elektiv', station: 'D', createdBy: 'manager', createdByDisplayName: 'Fr. Manager', createdAt: '2024-01-15T16:00:00Z', lastModifiedBy: 'arzt_d', lastModifiedByDisplayName: 'Dr. Wagner (D)', lastModifiedAt: '2024-01-17T10:00:00Z', archived: false },

  // Teilstation offen (ohne Station)
  { id: '29', firstName: 'Peter', lastName: 'Weber', birthDate: '1990-11-08', gender: 'm', email: 'p.weber@mail.com', catchmentArea: false, diagnosis: 'Bipolare Störung F31.3', externalReferral: true, substanceAbuse: true, substanceAbuseDetails: 'Alkohol', relevantConditions: false, admissionType: 'TEILSTATION', urgency: 'dringend', createdBy: 'aufnahme', createdByDisplayName: 'Hr. Aufnahme', createdAt: '2024-01-16T11:45:00Z', lastModifiedBy: 'aufnahme', lastModifiedByDisplayName: 'Hr. Aufnahme', lastModifiedAt: '2024-01-16T11:45:00Z', archived: false },
  { id: '30', firstName: 'Klaus', lastName: 'Hoffmann', birthDate: '1960-06-05', gender: 'm', phone: '0170-4443322', catchmentArea: false, diagnosis: 'Zwangsstörung F42.2', externalReferral: true, substanceAbuse: false, relevantConditions: true, relevantConditionsDetails: 'Herzinsuffizienz', admissionType: 'TEILSTATION', urgency: 'elektiv', createdBy: 'aufnahme', createdByDisplayName: 'Hr. Aufnahme', createdAt: '2024-01-17T14:00:00Z', lastModifiedBy: 'aufnahme', lastModifiedByDisplayName: 'Hr. Aufnahme', lastModifiedAt: '2024-01-17T14:00:00Z', archived: false },
  { id: '31', firstName: 'Renate', lastName: 'Fuchs', birthDate: '1977-12-01', gender: 'w', phone: '0163-2223344', email: 'r.fuchs@email.de', catchmentArea: true, diagnosis: 'Leichte Depression F32.0', externalReferral: false, substanceAbuse: false, relevantConditions: false, admissionType: 'TEILSTATION', urgency: 'elektiv', createdBy: 'aufnahme', createdByDisplayName: 'Hr. Aufnahme', createdAt: '2024-01-17T15:00:00Z', lastModifiedBy: 'aufnahme', lastModifiedByDisplayName: 'Hr. Aufnahme', lastModifiedAt: '2024-01-17T15:00:00Z', archived: false },
  { id: '32', firstName: 'Herbert', lastName: 'Stein', birthDate: '1965-04-09', gender: 'm', email: 'h.stein@web.de', catchmentArea: true, diagnosis: 'Somatoforme Störung F45.0', externalReferral: true, substanceAbuse: false, relevantConditions: true, relevantConditionsDetails: 'Chronische Schmerzen', admissionType: 'TEILSTATION', urgency: 'dringend', createdBy: 'manager', createdByDisplayName: 'Fr. Manager', createdAt: '2024-01-17T16:30:00Z', lastModifiedBy: 'manager', lastModifiedByDisplayName: 'Fr. Manager', lastModifiedAt: '2024-01-17T16:30:00Z', archived: false },
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

  const restorePatient = useCallback((id: string) => {
    updatePatient(id, { archived: false });
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

  const getArchivedPatients = useCallback((): Patient[] => {
    return patients.filter(p => p.archived);
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
        restorePatient,
        assignStation,
        getVollstationPatients,
        getTeilstationPatients,
        getOpenTeilstationPatients,
        getStationPatients,
        getVollStationPatients,
        getArchivedPatients,
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
