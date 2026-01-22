import React from 'react';
import { useParams, Navigate, useNavigate } from 'react-router-dom';
import { usePatients } from '@/contexts/PatientContext';
import { useAuth } from '@/contexts/AuthContext';
import { PatientTable } from '@/components/patients/PatientTable';
import { Patient, Station, STATION_LABELS } from '@/types';
import { Badge } from '@/components/ui/badge';
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

const StationWaitingListPage: React.FC = () => {
  const { station } = useParams<{ station: string }>();
  const { canViewStation, canEditPatients, canDeletePatients } = useAuth();
  const { getStationWaitingListPatients, archivePatient } = usePatients();
  const navigate = useNavigate();
  const [patientToDelete, setPatientToDelete] = React.useState<Patient | null>(null);

  // Validate station parameter
  if (!station || !['A', 'B', 'C', 'D'].includes(station)) {
    return <Navigate to="/teilstation/overview" replace />;
  }

  const stationKey = station as Station;

  // Check permission
  if (!canViewStation(stationKey)) {
    return <Navigate to="/dashboard" replace />;
  }

  const patients = getStationWaitingListPatients(stationKey);

  const columns = [
    { key: 'lastName' as const, label: 'Nachname', sortable: true },
    { key: 'firstName' as const, label: 'Vorname', sortable: true },
    { key: 'birthDate' as const, label: 'Geburtsdatum', sortable: true },
    { key: 'admissionDate' as const, label: 'Aufnahmedatum', sortable: true },
    { key: 'diagnosis' as const, label: 'Diagnose', sortable: true },
    { key: 'urgency' as const, label: 'Dringlichkeit', sortable: true },
    { key: 'lastModifiedAt' as const, label: 'Geändert von', sortable: true },
    ...((canEditPatients() || canDeletePatients()) ? [{ key: 'actions' as const, label: 'Aktionen', width: '100px' }] : []),
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

  const badgeVariant = `station${stationKey}` as 'stationA' | 'stationB' | 'stationC' | 'stationD';

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-foreground">{STATION_LABELS[stationKey]} - Warteliste</h1>
        <Badge variant={badgeVariant} className="text-sm">
          {patients.length} Patienten
        </Badge>
      </div>

      <PatientTable
        patients={patients}
        columns={columns}
        onEdit={canEditPatients() ? handleEdit : undefined}
        onDelete={canDeletePatients() ? handleDelete : undefined}
        emptyMessage={`Keine Patienten auf der Warteliste von ${STATION_LABELS[stationKey]}`}
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

export default StationWaitingListPage;
