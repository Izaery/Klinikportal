import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { usePatients } from '@/contexts/PatientContext';
import { useAuth } from '@/contexts/AuthContext';
import { PatientTable } from '@/components/patients/PatientTable';
import { Patient, Station } from '@/types';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
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

const TeilstationOpenPage: React.FC = () => {
  const { canEditPatients, canDeletePatients, canAssignStation } = useAuth();
  const { getOpenTeilstationPatients, archivePatient, updatePatient } = usePatients();
  const navigate = useNavigate();
  const [patientToDelete, setPatientToDelete] = useState<Patient | null>(null);
  const [stationAssignment, setStationAssignment] = useState<{ patient: Patient; station: Station } | null>(null);
  const [admissionDate, setAdmissionDate] = useState<Date | undefined>(undefined);
  const [admissionDateError, setAdmissionDateError] = useState<string>('');

  const patients = getOpenTeilstationPatients();

  const columns = [
    { key: 'lastName', label: 'Nachname', sortable: true },
    { key: 'firstName', label: 'Vorname', sortable: true },
    { key: 'birthDate', label: 'Geburtsdatum', sortable: true },
    { key: 'diagnosis', label: 'Diagnose', sortable: true },
    { key: 'preInterviewDate', label: 'Vorgesprächstermin', sortable: true },
    { key: 'urgency', label: 'Dringlichkeit', sortable: true },
    { key: 'lastModifiedAt', label: 'Geändert von', sortable: true },
    ...(canAssignStation() ? [{ key: 'stationAssign', label: 'Station zuweisen', width: '180px' }] : []),
    ...((canEditPatients() || canDeletePatients()) ? [{ key: 'actions', label: 'Aktionen', width: '100px' }] : []),
  ];

  const handleEdit = (patient: Patient) => {
    navigate(`/patient/edit/${patient.id}`);
  };

  const handleDelete = (patient: Patient) => {
    setPatientToDelete(patient);
  };

  const handleAssignStation = (patient: Patient, station: Station) => {
    setStationAssignment({ patient, station });
    setAdmissionDate(undefined);
    setAdmissionDateError('');
  };

  const confirmAssignStation = () => {
    if (!admissionDate) {
      setAdmissionDateError('Aufnahmedatum ist erforderlich');
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(admissionDate);
    selectedDate.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      setAdmissionDateError('Aufnahmedatum darf nicht in der Vergangenheit liegen');
      return;
    }

    if (stationAssignment) {
      updatePatient(stationAssignment.patient.id, { 
        station: stationAssignment.station,
        admissionDate: admissionDate.toISOString()
      });
      toast.success(`${stationAssignment.patient.lastName}, ${stationAssignment.patient.firstName} wurde Station ${stationAssignment.station} zugewiesen`);
      setStationAssignment(null);
      setAdmissionDate(undefined);
      setAdmissionDateError('');
    }
  };

  const confirmDelete = () => {
    if (patientToDelete) {
      archivePatient(patientToDelete.id);
      toast.success(`Patient ${patientToDelete.lastName}, ${patientToDelete.firstName} wurde archiviert`);
      setPatientToDelete(null);
    }
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Teilstation - Offen</h1>
        <p className="text-muted-foreground mt-1">
          Patienten ohne Station ({patients.length})
        </p>
      </div>

      <PatientTable
        patients={patients}
        columns={columns}
        onEdit={canEditPatients() ? handleEdit : undefined}
        onDelete={canDeletePatients() ? handleDelete : undefined}
        onAssignStation={handleAssignStation}
        showStationAssign={canAssignStation()}
        emptyMessage="Keine offenen Patienten - alle sind einer Station zugewiesen"
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

      <AlertDialog open={!!stationAssignment} onOpenChange={() => {
        setStationAssignment(null);
        setAdmissionDate(undefined);
        setAdmissionDateError('');
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Station zuweisen</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>
                  Weisen Sie <strong>{stationAssignment?.patient.lastName}, {stationAssignment?.patient.firstName}</strong> der 
                  Station {stationAssignment?.station} zu.
                </p>
                
                <div className="space-y-2">
                  <Label>Aufnahmedatum *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !admissionDate && "text-muted-foreground",
                          admissionDateError && "border-destructive"
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
                        disabled={(date) => date < today}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                        locale={de}
                      />
                    </PopoverContent>
                  </Popover>
                  {admissionDateError && (
                    <p className="text-sm text-destructive">{admissionDateError}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Muss am heutigen Tag oder in der Zukunft liegen
                  </p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                if (!admissionDate) {
                  e.preventDefault();
                  setAdmissionDateError('Aufnahmedatum ist erforderlich');
                  return;
                }
                confirmAssignStation();
              }}
            >
              Zuweisen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TeilstationOpenPage;