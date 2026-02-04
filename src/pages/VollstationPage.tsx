import React from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { usePatients } from '@/contexts/PatientContext.standalone';
import { useAuth } from '@/contexts/AuthContext.standalone';
import { PatientTable } from '@/components/patients/PatientTable';
import { Patient, VOLL_STATION_LABELS, URGENCY_LABELS } from '@/types';
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

const VollstationPage: React.FC = () => {
  const { canViewVollstation, canEditPatients, canDeletePatients } = useAuth();
  const { getVollstationPatients, archivePatient } = usePatients();
  const navigate = useNavigate();
  const [patientToDelete, setPatientToDelete] = React.useState<Patient | null>(null);

  if (!canViewVollstation()) {
    return <Navigate to="/dashboard" replace />;
  }

  const patients = getVollstationPatients();

  const columns = [
    { key: 'waitingTime' as const, label: 'Wartezeit', sortable: true, width: '100px' },
    { key: 'lastName' as const, label: 'Nachname', sortable: true },
    { key: 'firstName' as const, label: 'Vorname', sortable: true },
    { key: 'mondayCall' as const, label: 'Montagsanruf', sortable: true, width: '120px' },
    { key: 'birthDate' as const, label: 'Geburtsdatum', sortable: true },
    { key: 'urgency' as const, label: 'Dringlichkeit', sortable: true },
    { key: 'admissionDate' as const, label: 'Aufnahmedatum', sortable: true },
    { key: 'vollStation' as const, label: 'Station', sortable: true },
    { key: 'secondaryStation' as const, label: 'Zweite Station', sortable: true },
    { key: 'diagnosis' as const, label: 'Diagnose', sortable: true },
    { key: 'lastModifiedAt' as const, label: 'Geändert von', sortable: true },
    { key: 'actions' as const, label: 'Aktionen', width: '100px' },
  ];

  const handleEdit = (patient: Patient) => {
    navigate(`/patient/edit/${patient.id}`);
  };

  const handleDelete = (patient: Patient) => {
    setPatientToDelete(patient);
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
        <h1 className="text-2xl font-bold text-foreground">Vollstation</h1>
        <p className="text-muted-foreground mt-1">
          Alle vollstationären Patienten ({patients.length})
        </p>
      </div>

      <PatientTable
        patients={patients}
        columns={columns}
        onEdit={canEditPatients() ? handleEdit : undefined}
        onDelete={canDeletePatients() ? handleDelete : undefined}
        emptyMessage="Keine vollstationären Patienten vorhanden"
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

export default VollstationPage;
