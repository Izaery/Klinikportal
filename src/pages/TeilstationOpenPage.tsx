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
  const [preInterviewDate, setPreInterviewDate] = useState<Date | undefined>(undefined);
  const [preInterviewTime, setPreInterviewTime] = useState<string>('');
  const [preInterviewDateError, setPreInterviewDateError] = useState<string>('');
  const [preInterviewTimeError, setPreInterviewTimeError] = useState<string>('');

  const patients = getOpenTeilstationPatients();

  const columns = [
    { key: 'waitingTime' as const, label: 'Wartezeit', sortable: true, width: '100px' },
    { key: 'lastName', label: 'Nachname', sortable: true },
    { key: 'firstName', label: 'Vorname', sortable: true },
    { key: 'birthDate', label: 'Geburtsdatum', sortable: true },
    { key: 'diagnosis', label: 'Diagnose', sortable: true },
    { key: 'urgency', label: 'Dringlichkeit', sortable: true, width: '140px' },
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
    setPreInterviewDate(undefined);
    setPreInterviewTime('');
    setPreInterviewDateError('');
    setPreInterviewTimeError('');
  };

  const confirmAssignStation = () => {
    let hasError = false;

    if (!preInterviewDate) {
      setPreInterviewDateError('Vorgesprächstermin ist erforderlich');
      hasError = true;
    } else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selectedDate = new Date(preInterviewDate);
      selectedDate.setHours(0, 0, 0, 0);

      if (selectedDate < today) {
        setPreInterviewDateError('Vorgesprächstermin darf nicht in der Vergangenheit liegen');
        hasError = true;
      }
    }

    if (!preInterviewTime) {
      setPreInterviewTimeError('Uhrzeit ist erforderlich');
      hasError = true;
    }

    if (hasError) return;

    if (stationAssignment && preInterviewDate) {
      // Combine date and time
      const [hours, minutes] = preInterviewTime.split(':').map(Number);
      const combinedDateTime = new Date(preInterviewDate);
      combinedDateTime.setHours(hours, minutes, 0, 0);

      updatePatient(stationAssignment.patient.id, { 
        station: stationAssignment.station,
        preInterviewDate: combinedDateTime.toISOString()
      });
      toast.success(`${stationAssignment.patient.lastName}, ${stationAssignment.patient.firstName} wurde Station ${stationAssignment.station} zugewiesen`);
      setStationAssignment(null);
      setPreInterviewDate(undefined);
      setPreInterviewTime('');
      setPreInterviewDateError('');
      setPreInterviewTimeError('');
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
        <h1 className="text-2xl font-bold text-foreground">Teilstation - Anfrageliste</h1>
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
        setPreInterviewDate(undefined);
        setPreInterviewTime('');
        setPreInterviewDateError('');
        setPreInterviewTimeError('');
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
                  <Label>Vorgesprächstermin *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !preInterviewDate && "text-muted-foreground",
                          preInterviewDateError && "border-destructive"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {preInterviewDate ? format(preInterviewDate, "PPP", { locale: de }) : <span>Datum auswählen</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={preInterviewDate}
                        onSelect={setPreInterviewDate}
                        disabled={(date) => date < today}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                        locale={de}
                      />
                    </PopoverContent>
                  </Popover>
                  {preInterviewDateError && (
                    <p className="text-sm text-destructive">{preInterviewDateError}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Uhrzeit *</Label>
                  <input
                    type="time"
                    value={preInterviewTime}
                    onChange={(e) => {
                      setPreInterviewTime(e.target.value);
                      setPreInterviewTimeError('');
                    }}
                    className={cn(
                      "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                      preInterviewTimeError && "border-destructive"
                    )}
                  />
                  {preInterviewTimeError && (
                    <p className="text-sm text-destructive">{preInterviewTimeError}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Datum und Uhrzeit müssen angegeben werden
                  </p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                let hasError = false;
                if (!preInterviewDate) {
                  e.preventDefault();
                  setPreInterviewDateError('Vorgesprächstermin ist erforderlich');
                  hasError = true;
                }
                if (!preInterviewTime) {
                  e.preventDefault();
                  setPreInterviewTimeError('Uhrzeit ist erforderlich');
                  hasError = true;
                }
                if (!hasError) {
                  confirmAssignStation();
                }
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