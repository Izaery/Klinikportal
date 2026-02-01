import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Patient, Station, VollStation } from '@/types';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';
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
  admissionType: row.admission_type,
  urgency: row.urgency || undefined,
  station: row.station || undefined,
  onWaitingList: row.on_waiting_list || false,
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
});

export const PatientProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  // Fetch patients from database
  const fetchPatients = useCallback(async () => {
    if (!isAuthenticated) {
      setPatients([]);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .order('last_modified_at', { ascending: false });

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

  // Initial fetch
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
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;
      
      if (!userId) {
        toast({
          title: 'Fehler',
          description: 'Nicht angemeldet.',
          variant: 'destructive',
        });
        return null;
      }

      const dbData = {
        first_name: patientData.firstName,
        last_name: patientData.lastName,
        birth_date: patientData.birthDate,
        gender: patientData.gender,
        case_number: patientData.caseNumber || null,
        phone: patientData.phone || null,
        email: patientData.email || null,
        catchment_area: patientData.catchmentArea,
        diagnosis: patientData.diagnosis,
        external_referral: patientData.externalReferral,
        substance_abuse: patientData.substanceAbuse,
        substance_abuse_details: patientData.substanceAbuseDetails || null,
        relevant_conditions: patientData.relevantConditions,
        relevant_conditions_details: patientData.relevantConditionsDetails || null,
        notes: patientData.notes || null,
        admission_type: patientData.admissionType,
        urgency: patientData.urgency || null,
        station: patientData.station || null,
        on_waiting_list: patientData.onWaitingList || false,
        voll_station: patientData.vollStation || null,
        secondary_station: patientData.secondaryStation || null,
        monday_call: patientData.mondayCall || false,
        pre_interview_date: patientData.preInterviewDate || null,
        admission_date: patientData.admissionDate || null,
        created_by: userId,
        created_by_display_name: user.displayName,
        last_modified_by: userId,
        last_modified_by_display_name: user.displayName,
      };

      const { data, error } = await supabase
        .from('patients')
        .insert(dbData)
        .select()
        .single();

      if (error) {
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
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;
      
      if (!userId) return false;

      const dbUpdates: Record<string, any> = {
        last_modified_by: userId,
        last_modified_by_display_name: user.displayName,
      };

      // Map Patient fields to DB columns
      if (updates.firstName !== undefined) dbUpdates.first_name = updates.firstName;
      if (updates.lastName !== undefined) dbUpdates.last_name = updates.lastName;
      if (updates.birthDate !== undefined) dbUpdates.birth_date = updates.birthDate;
      if (updates.gender !== undefined) dbUpdates.gender = updates.gender;
      if (updates.caseNumber !== undefined) dbUpdates.case_number = updates.caseNumber || null;
      if (updates.phone !== undefined) dbUpdates.phone = updates.phone || null;
      if (updates.email !== undefined) dbUpdates.email = updates.email || null;
      if (updates.catchmentArea !== undefined) dbUpdates.catchment_area = updates.catchmentArea;
      if (updates.diagnosis !== undefined) dbUpdates.diagnosis = updates.diagnosis;
      if (updates.externalReferral !== undefined) dbUpdates.external_referral = updates.externalReferral;
      if (updates.substanceAbuse !== undefined) dbUpdates.substance_abuse = updates.substanceAbuse;
      if (updates.substanceAbuseDetails !== undefined) dbUpdates.substance_abuse_details = updates.substanceAbuseDetails || null;
      if (updates.relevantConditions !== undefined) dbUpdates.relevant_conditions = updates.relevantConditions;
      if (updates.relevantConditionsDetails !== undefined) dbUpdates.relevant_conditions_details = updates.relevantConditionsDetails || null;
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes || null;
      if (updates.admissionType !== undefined) dbUpdates.admission_type = updates.admissionType;
      if (updates.urgency !== undefined) dbUpdates.urgency = updates.urgency || null;
      if (updates.station !== undefined) dbUpdates.station = updates.station || null;
      if (updates.onWaitingList !== undefined) dbUpdates.on_waiting_list = updates.onWaitingList;
      if (updates.vollStation !== undefined) dbUpdates.voll_station = updates.vollStation || null;
      if (updates.secondaryStation !== undefined) dbUpdates.secondary_station = updates.secondaryStation || null;
      if (updates.mondayCall !== undefined) dbUpdates.monday_call = updates.mondayCall;
      if (updates.preInterviewDate !== undefined) dbUpdates.pre_interview_date = updates.preInterviewDate || null;
      if (updates.admissionDate !== undefined) dbUpdates.admission_date = updates.admissionDate || null;
      if (updates.archived !== undefined) dbUpdates.archived = updates.archived;

      const { data, error } = await supabase
        .from('patients')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
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

  const getVollstationPatients = useCallback((): Patient[] => {
    return patients.filter(p => !p.archived && p.admissionType === 'VOLLSTATION');
  }, [patients]);

  const getTeilstationPatients = useCallback((): Patient[] => {
    return patients.filter(p => !p.archived && p.admissionType === 'TEILSTATION');
  }, [patients]);

  const getOpenTeilstationPatients = useCallback((): Patient[] => {
    return patients.filter(p => !p.archived && p.admissionType === 'TEILSTATION' && !p.station);
  }, [patients]);

  // Vorgesprächsliste: Station zugewiesen, aber noch nicht auf Warteliste
  const getStationPreInterviewPatients = useCallback((station: Station): Patient[] => {
    return patients.filter(p => !p.archived && p.admissionType === 'TEILSTATION' && p.station === station && !p.onWaitingList);
  }, [patients]);

  // Warteliste: Station zugewiesen und auf Warteliste
  const getStationWaitingListPatients = useCallback((station: Station): Patient[] => {
    return patients.filter(p => !p.archived && p.admissionType === 'TEILSTATION' && p.station === station && p.onWaitingList);
  }, [patients]);

  // Alle Patienten einer Station (Vorgesprächs- und Warteliste)
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
