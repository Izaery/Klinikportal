import React from 'react';
import { useParams, Navigate, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
 import { usePatients } from '@/contexts/PatientContext';
 import { useAuth } from '@/contexts/AuthContext';
import { PatientTable } from '@/components/patients/PatientTable';
import { Patient, Station, STATION_LABELS } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const StationPreInterviewPage: React.FC = () => {
  const { station } = useParams<{ station: string }>();
  const { canViewStation, canEditPatients, canDeletePatients, hasAnyRole } = useAuth();
  const { getStationPreInterviewPatients, archivePatient, moveToWaitingList } = usePatients();
  const navigate = useNavigate();
  const [patientToDelete, setPatientToDelete] = useState<Patient | null>(null);
  const [patientToAdmit, setPatientToAdmit] = useState<Patient | null>(null);
  const [admissionDate, setAdmissionDate] = useState<Date | undefined>(undefined);

  // Validate station parameter
  if (!station || !['A', 'B', 'C', 'D'].includes(station)) {
    return <Navigate to="/teilstation/overview" replace />;
  }

  const stationKey = station as Station;

  // Check permission
  if (!canViewStation(stationKey)) {
    return <Navigate to="/dashboard" replace />;
  }

  const patients = getStationPreInterviewPatients(stationKey);

  // Ärzte und Manager können Aufnahme durchführen
  const canAdmit = hasAnyRole(['ADMIN', 'MANAGER', 'arzt_a', 'arzt_b', 'arzt_c', 'arzt_d']);

  const columns = [
    { key: 'lastName' as const, label: 'Nachname', sortable: true },
    { key: 'firstName' as const, label: 'Vorname', sortable: true },
    { key: 'birthDate' as const, label: 'Geburtsdatum', sortable: true },
    { key: 'preInterviewDate' as const, label: 'Vorgesprächstermin', sortable: true },
    { key: 'diagnosis' as const, label: 'Diagnose', sortable: true },
    { key: 'urgency' as const, label: 'Dringlichkeit', sortable: true },
    { key: 'lastModifiedAt' as const, label: 'Geändert von', sortable: true },
    ...(canAdmit ? [{ key: 'admissionAction' as const, label: 'Aufnahme', width: '120px' }] : []),
    ...((canEditPatients() || canDeletePatients()) ? [{ key: 'actions' as const, label: 'Aktionen', width: '100px' }] : []),
  ];

  const handleEdit = (patient: Patient) => {
    navigate(`/patient/edit/${patient.id}`);
  };

  const handleDelete = (patient: Patient) => {
    setPatientToDelete(patient);
  };

  const handleAdmit = (patient: Patient) => {
    setPatientToAdmit(patient);
    setAdmissionDate(undefined);
  };

  const confirmDelete = () => {
    if (patientToDelete) {
      archivePatient(patientToDelete.id);
      toast.success(`Patient ${patientToDelete.lastName}, ${patientToDelete.firstName} wurde archiviert`);
      setPatientToDelete(null);
    }
  };

  const confirmAdmit = () => {
    if (patientToAdmit) {
      moveToWaitingList(patientToAdmit.id, admissionDate?.toISOString());
      toast.success(`${patientToAdmit.lastName}, ${patientToAdmit.firstName} wurde auf die Warteliste verschoben`);
      setPatientToAdmit(null);
      setAdmissionDate(undefined);
    }
  };

  const badgeVariant = `station${stationKey}` as 'stationA' | 'stationB' | 'stationC' | 'stationD';

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-foreground">{STATION_LABELS[stationKey]} - Vorgesprächsliste</h1>
        <Badge variant={badgeVariant} className="text-sm">
          {patients.length} Patienten
        </Badge>
      </div>

      <PatientTable
        patients={patients}
        columns={columns}
        onEdit={canEditPatients() ? handleEdit : undefined}
        onDelete={canDeletePatients() ? handleDelete : undefined}
        onAdmit={canAdmit ? handleAdmit : undefined}
        emptyMessage={`Keine Patienten in der Vorgesprächsliste von ${STATION_LABELS[stationKey]}`}
      />

      <AlertDialog open={!!patientToDelete} onOpenChange={() => setPatientToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Patient archivieren?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchten Sie den Patienten <strong>{patientToDelete?.lastName}, {patientToDelete?.firstName}</strong> wirklich archivieren? 
              Der Patient wird aus allen Listen entfernt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Archivieren
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!patientToAdmit} onOpenChange={() => {
        setPatientToAdmit(null);
        setAdmissionDate(undefined);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Auf Warteliste setzen</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>
                  <strong>{patientToAdmit?.lastName}, {patientToAdmit?.firstName}</strong> wird auf die Warteliste von {STATION_LABELS[stationKey]} verschoben.
                </p>
                
                <div className="space-y-2">
                  <Label>Aufnahmedatum (optional)</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !admissionDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {admissionDate ? format(admissionDate, "PPP", { locale: de }) : <span>Datum auswählen</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={admissionDate}
                        onSelect={setAdmissionDate}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                        locale={de}
                      />
                    </PopoverContent>
                  </Popover>
                  <p className="text-xs text-muted-foreground">
                    Das Aufnahmedatum kann auch später festgelegt werden.
                  </p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={confirmAdmit}>
              Auf Warteliste setzen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default StationPreInterviewPage;
