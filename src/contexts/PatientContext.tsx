import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Patient, Station, VollStation, PatientContact } from '@/types';
 import { useAuth } from './AuthContext';
import { patientsApi } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';

interface PatientContextType {
  patients: Patient[];
  isLoading: boolean;
  addPatient: (patient: Omit<Patient, 'id' | 'createdAt' | 'createdBy' | 'createdByDisplayName' | 'lastModifiedAt' | 'lastModifiedBy' | 'lastModifiedByDisplayName' | 'archived'>) => Promise<Patient | null>;
  updatePatient: (id: string, updates: Partial<Patient>) => Promise<boolean>;
  archivePatient: (id: string) => Promise<boolean>;
  restorePatient: (id: string) => Promise<boolean>;
  assignStation: (id: string, station: Station) => Promise<boolean>;
  moveToWaitingList: (id: string, admissionDate?: string) => Promise<boolean>;
  moveBackToAnfrageliste: (id: string, reason: string) => Promise<boolean>;
  confirmPreInterview: (id: string) => Promise<boolean>;
  addPatientContact: (id: string, content: string) => Promise<boolean>;
  getVollstationPatients: () => Patient[];
  getTeilstationPatients: () => Patient[];
  getOpenTeilstationPatients: () => Patient[];
  getStationPreInterviewPatients: (station: Station) => Patient[];
  getStationWaitingListPatients: (station: Station) => Patient[];
  getStationPatients: (station: Station) => Patient[];
  getVollStationPatients: (vollStation: VollStation) => Patient[];
  getArchivedPatients: () => Patient[];
  getRecentlyModified: (limit?: number) => Patient[];
  refreshPatients: () => Promise<void>;
}

const PatientContext = createContext<PatientContextType | undefined>(undefined);

// Helper to map DB row to Patient type
const mapDbToPatient = (row: any): Patient => ({
  id: row.id,
  firstName: row.first_name,
  lastName: row.last_name,
  birthDate: row.birth_date,
  gender: row.gender,
  caseNumber: row.case_number || undefined,
  phone: row.phone || undefined,
  email: row.email || undefined,
  catchmentArea: row.catchment_area,
  diagnosis: row.diagnosis,
  externalReferral: row.external_referral,
  substanceAbuse: row.substance_abuse,
  substanceAbuseDetails: row.substance_abuse_details || undefined,
  relevantConditions: row.relevant_conditions,
  relevantConditionsDetails: row.relevant_conditions_details || undefined,
  notes: row.notes || undefined,
  auftrag: row.auftrag || undefined,
  moveBackReason: row.move_back_reason || undefined,
  insurance: row.insurance || '',
  admissionType: row.admission_type,
  urgency: row.urgency || undefined,
  station: row.station || undefined,
  onWaitingList: row.on_waiting_list || false,
  preInterviewConfirmed: row.pre_interview_confirmed || false,
  vollStation: row.voll_station || undefined,
  secondaryStation: row.secondary_station || undefined,
  mondayCall: row.monday_call || false,
  preInterviewDate: row.pre_interview_date || undefined,
  admissionDate: row.admission_date || undefined,
  createdBy: row.created_by,
  createdByDisplayName: row.created_by_display_name,
  createdAt: row.created_at,
  lastModifiedBy: row.last_modified_by,
  lastModifiedByDisplayName: row.last_modified_by_display_name,
  lastModifiedAt: row.last_modified_at,
  archived: row.archived,
  contacts: Array.isArray(row.contacts)
    ? row.contacts.map((c: any): PatientContact => ({
        id: c.id,
        content: c.content,
        createdBy: c.created_by,
        createdByDisplayName: c.created_by_display_name,
        createdAt: c.created_at,
      }))
    : [],
});

// Helper to map Patient to DB format
const mapPatientToDb = (patient: Partial<Patient>): Record<string, any> => {
  const dbData: Record<string, any> = {};
  
  if (patient.firstName !== undefined) dbData.first_name = patient.firstName;
  if (patient.lastName !== undefined) dbData.last_name = patient.lastName;
  if (patient.birthDate !== undefined) dbData.birth_date = patient.birthDate;
  if (patient.gender !== undefined) dbData.gender = patient.gender;
  if (patient.caseNumber !== undefined) dbData.case_number = patient.caseNumber || null;
  if (patient.phone !== undefined) dbData.phone = patient.phone || null;
  if (patient.email !== undefined) dbData.email = patient.email || null;
  if (patient.catchmentArea !== undefined) dbData.catchment_area = patient.catchmentArea;
  if (patient.diagnosis !== undefined) dbData.diagnosis = patient.diagnosis;
  if (patient.externalReferral !== undefined) dbData.external_referral = patient.externalReferral;
  if (patient.substanceAbuse !== undefined) dbData.substance_abuse = patient.substanceAbuse;
  if (patient.substanceAbuseDetails !== undefined) dbData.substance_abuse_details = patient.substanceAbuseDetails || null;
  if (patient.relevantConditions !== undefined) dbData.relevant_conditions = patient.relevantConditions;
  if (patient.relevantConditionsDetails !== undefined) dbData.relevant_conditions_details = patient.relevantConditionsDetails || null;
  if (patient.notes !== undefined) dbData.notes = patient.notes || null;
  if (patient.auftrag !== undefined) dbData.auftrag = patient.auftrag || null;
  if (patient.moveBackReason !== undefined) dbData.move_back_reason = patient.moveBackReason || null;
  if (patient.insurance !== undefined) dbData.insurance = patient.insurance || null;
  if (patient.admissionType !== undefined) dbData.admission_type = patient.admissionType;
  if (patient.urgency !== undefined) dbData.urgency = patient.urgency || null;
  if (patient.station !== undefined) dbData.station = patient.station || null;
  if (patient.onWaitingList !== undefined) dbData.on_waiting_list = patient.onWaitingList;
  if (patient.preInterviewConfirmed !== undefined) dbData.pre_interview_confirmed = patient.preInterviewConfirmed;
  if (patient.vollStation !== undefined) dbData.voll_station = patient.vollStation || null;
  if (patient.secondaryStation !== undefined) dbData.secondary_station = patient.secondaryStation || null;
  if (patient.mondayCall !== undefined) dbData.monday_call = patient.mondayCall;
  if (patient.preInterviewDate !== undefined) dbData.pre_interview_date = patient.preInterviewDate || null;
  if (patient.admissionDate !== undefined) dbData.admission_date = patient.admissionDate || null;
  if (patient.archived !== undefined) dbData.archived = patient.archived;
  
  return dbData;
};

export const PatientProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  // Fetch patients from API
  const fetchPatients = useCallback(async () => {
    if (!isAuthenticated) {
      setPatients([]);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await patientsApi.getAll();

      if (error) {
        console.error('Error fetching patients:', error);
        toast({
          title: 'Fehler',
          description: 'Patientendaten konnten nicht geladen werden.',
          variant: 'destructive',
        });
        return;
      }

      setPatients((data || []).map(mapDbToPatient));
    } catch (error) {
      console.error('Error in fetchPatients:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, toast]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  const refreshPatients = useCallback(async () => {
    await fetchPatients();
  }, [fetchPatients]);

  const addPatient = useCallback(async (
    patientData: Omit<Patient, 'id' | 'createdAt' | 'createdBy' | 'createdByDisplayName' | 'lastModifiedAt' | 'lastModifiedBy' | 'lastModifiedByDisplayName' | 'archived'>
  ): Promise<Patient | null> => {
    if (!user) return null;

    try {
      const dbData = mapPatientToDb(patientData);

      const { data, error } = await patientsApi.create(dbData);

      if (error || !data) {
        console.error('Error adding patient:', error);
        toast({
          title: 'Fehler',
          description: 'Patient konnte nicht angelegt werden.',
          variant: 'destructive',
        });
        return null;
      }

      const newPatient = mapDbToPatient(data);
      setPatients(prev => [newPatient, ...prev]);
      
      toast({
        title: 'Erfolg',
        description: 'Patient wurde angelegt.',
      });
      
      return newPatient;
    } catch (error) {
      console.error('Error in addPatient:', error);
      return null;
    }
  }, [user, toast]);

  const updatePatient = useCallback(async (id: string, updates: Partial<Patient>): Promise<boolean> => {
    if (!user) return false;

    try {
      const dbUpdates = mapPatientToDb(updates);

      const { data, error } = await patientsApi.update(id, dbUpdates);

      if (error || !data) {
        console.error('Error updating patient:', error);
        toast({
          title: 'Fehler',
          description: 'Patient konnte nicht aktualisiert werden.',
          variant: 'destructive',
        });
        return false;
      }

      const updatedPatient = mapDbToPatient(data);
      setPatients(prev => prev.map(p => p.id === id ? updatedPatient : p));
      return true;
    } catch (error) {
      console.error('Error in updatePatient:', error);
      return false;
    }
  }, [user, toast]);

  const archivePatient = useCallback(async (id: string): Promise<boolean> => {
    const success = await updatePatient(id, { archived: true });
    if (success) {
      toast({
        title: 'Erfolg',
        description: 'Patient wurde archiviert.',
      });
    }
    return success;
  }, [updatePatient, toast]);

  const restorePatient = useCallback(async (id: string): Promise<boolean> => {
    const success = await updatePatient(id, { archived: false });
    if (success) {
      toast({
        title: 'Erfolg',
        description: 'Patient wurde wiederhergestellt.',
      });
    }
    return success;
  }, [updatePatient, toast]);

  const assignStation = useCallback(async (id: string, station: Station): Promise<boolean> => {
    return updatePatient(id, { station, onWaitingList: false });
  }, [updatePatient]);

  const moveToWaitingList = useCallback(async (id: string, admissionDate?: string): Promise<boolean> => {
    const updates: Partial<Patient> = { onWaitingList: true };
    if (admissionDate) {
      updates.admissionDate = admissionDate;
    }
    return updatePatient(id, updates);
  }, [updatePatient]);

  const moveBackToAnfrageliste = useCallback(async (id: string, reason: string): Promise<boolean> => {
    if (!user) return false;
    try {
      const { data, error } = await patientsApi.update(id, {
        station: null,
        on_waiting_list: false,
        pre_interview_date: null,
        pre_interview_confirmed: false,
        admission_date: null,
        move_back_reason: reason,
      });
      if (error || !data) {
        toast({ title: 'Fehler', description: 'Patient konnte nicht zurückgesetzt werden.', variant: 'destructive' });
        return false;
      }
      const updatedPatient = mapDbToPatient(data);
      setPatients(prev => prev.map(p => p.id === id ? updatedPatient : p));
      return true;
    } catch {
      return false;
    }
  }, [user, toast]);

  const confirmPreInterview = useCallback(async (id: string): Promise<boolean> => {
    return updatePatient(id, { preInterviewConfirmed: true } as Partial<Patient>);
  }, [updatePatient]);

  const addPatientContact = useCallback(async (id: string, content: string): Promise<boolean> => {
    if (!user) return false;
    try {
      const { data, error } = await patientsApi.addContact(id, content);
      if (error || !data) {
        toast({ title: 'Fehler', description: 'Kontakteintrag konnte nicht gespeichert werden.', variant: 'destructive' });
        return false;
      }
      const newContact: PatientContact = {
        id: data.id,
        content: data.content,
        createdBy: data.created_by,
        createdByDisplayName: data.created_by_display_name,
        createdAt: data.created_at,
      };
      setPatients(prev => prev.map(p =>
        p.id === id
          ? { ...p, contacts: [newContact, ...(p.contacts || [])] }
          : p
      ));
      toast({ title: 'Erfolg', description: 'Kontakteintrag gespeichert.' });
      return true;
    } catch {
      return false;
    }
  }, [user, toast]);

  const getVollstationPatients = useCallback((): Patient[] => {
    return patients.filter(p => !p.archived && p.admissionType === 'VOLLSTATION');
  }, [patients]);

  const getTeilstationPatients = useCallback((): Patient[] => {
    return patients.filter(p => !p.archived && p.admissionType === 'TEILSTATION');
  }, [patients]);

  const getOpenTeilstationPatients = useCallback((): Patient[] => {
    return patients.filter(p => !p.archived && p.admissionType === 'TEILSTATION' && !p.station);
  }, [patients]);

  const getStationPreInterviewPatients = useCallback((station: Station): Patient[] => {
    return patients.filter(p => !p.archived && p.admissionType === 'TEILSTATION' && p.station === station && !p.onWaitingList);
  }, [patients]);

  const getStationWaitingListPatients = useCallback((station: Station): Patient[] => {
    return patients.filter(p => !p.archived && p.admissionType === 'TEILSTATION' && p.station === station && p.onWaitingList);
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
        isLoading,
        addPatient,
        updatePatient,
        archivePatient,
        restorePatient,
        assignStation,
        moveToWaitingList,
        moveBackToAnfrageliste,
        confirmPreInterview,
        addPatientContact,
        getVollstationPatients,
        getTeilstationPatients,
        getOpenTeilstationPatients,
        getStationPreInterviewPatients,
        getStationWaitingListPatients,
        getStationPatients,
        getVollStationPatients,
        getArchivedPatients,
        getRecentlyModified,
        refreshPatients,
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
