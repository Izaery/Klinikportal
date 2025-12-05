import React from 'react';
import { useNavigate } from 'react-router-dom';
import { usePatients } from '@/contexts/PatientContext';
import { useAuth } from '@/contexts/AuthContext';
import { PatientTable } from '@/components/patients/PatientTable';
import { Patient, Station } from '@/types';
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

const TeilstationOpenPage: React.FC = () => {
  const { canEditPatients, canDeletePatients, canAssignStation } = useAuth();
  const { getOpenTeilstationPatients, archivePatient, assignStation } = usePatients();
  const navigate = useNavigate();
  const [patientToDelete, setPatientToDelete] = React.useState<Patient | null>(null);

  const patients = getOpenTeilstationPatients();

  const columns = [
    { key: 'lastName', label: 'Nachname', sortable: true },
    { key: 'firstName', label: 'Vorname', sortable: true },
    { key: 'birthDate', label: 'Geburtsdatum', sortable: true },
    { key: 'diagnosis', label: 'Diagnose', sortable: true },
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
    assignStation(patient.id, station);
    toast.success(`${patient.lastName}, ${patient.firstName} wurde Station ${station} zugewiesen`);
  };

  const confirmDelete = () => {
    if (patientToDelete) {
      archivePatient(patientToDelete.id);
      toast.success(`Patient ${patientToDelete.lastName}, ${patientToDelete.firstName} wurde archiviert`);
      setPatientToDelete(null);
    }
  };

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
    </div>
  );
};

export default TeilstationOpenPage;
