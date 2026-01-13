import React, { useState } from 'react';
import { Archive, RotateCcw, Search } from 'lucide-react';
import { usePatients } from '@/contexts/PatientContext';
import { Patient, STATION_LABELS, VOLL_STATION_LABELS } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

const ArchivePage: React.FC = () => {
  const { getArchivedPatients, restorePatient } = usePatients();
  const [searchTerm, setSearchTerm] = useState('');
  const [patientToRestore, setPatientToRestore] = useState<Patient | null>(null);

  const archivedPatients = getArchivedPatients();

  const filteredPatients = archivedPatients.filter(patient => {
    const searchLower = searchTerm.toLowerCase();
    return (
      patient.firstName.toLowerCase().includes(searchLower) ||
      patient.lastName.toLowerCase().includes(searchLower) ||
      patient.caseNumber?.toLowerCase().includes(searchLower) ||
      patient.diagnosis.toLowerCase().includes(searchLower)
    );
  });

  const handleRestore = () => {
    if (patientToRestore) {
      restorePatient(patientToRestore.id);
      const stationInfo = patientToRestore.admissionType === 'VOLLSTATION' 
        ? patientToRestore.vollStation 
          ? `Vollstation ${VOLL_STATION_LABELS[patientToRestore.vollStation]}`
          : 'Vollstation (ohne Zuweisung)'
        : patientToRestore.station 
          ? `Teilstation ${STATION_LABELS[patientToRestore.station]}`
          : 'Teilstation Vorgespräche';
      toast.success(`Patient "${patientToRestore.firstName} ${patientToRestore.lastName}" wurde wiederhergestellt (${stationInfo})`);
      setPatientToRestore(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE');
  };

  const getStationBadge = (patient: Patient) => {
    if (patient.admissionType === 'VOLLSTATION') {
      return patient.vollStation 
        ? <Badge variant="secondary">{VOLL_STATION_LABELS[patient.vollStation]}</Badge>
        : <Badge variant="outline">Vollstation</Badge>;
    } else {
      return patient.station 
        ? <Badge>{STATION_LABELS[patient.station]}</Badge>
        : <Badge variant="outline">Vorgespräche</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Archive className="h-6 w-6" />
            Archiv
          </h1>
          <p className="text-muted-foreground mt-1">
            Archivierte Patienten ({archivedPatients.length})
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Suchen nach Name, Fallnummer oder Diagnose..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Table */}
      <div className="clinic-card">
        <div className="overflow-x-auto">
          {filteredPatients.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {searchTerm ? 'Keine Ergebnisse gefunden' : 'Keine archivierten Patienten vorhanden'}
            </div>
          ) : (
            <table className="clinic-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Fallnummer</th>
                  <th>Geburtsdatum</th>
                  <th>Diagnose</th>
                  <th>Aufnahmeart</th>
                  <th>Station</th>
                  <th>Archiviert am</th>
                  <th className="w-24">Aktion</th>
                </tr>
              </thead>
              <tbody>
                {filteredPatients.map(patient => (
                  <tr key={patient.id}>
                    <td className="font-medium">
                      {patient.firstName} {patient.lastName}
                    </td>
                    <td className="font-mono text-sm">
                      {patient.caseNumber || '-'}
                    </td>
                    <td>{formatDate(patient.birthDate)}</td>
                    <td className="max-w-xs truncate" title={patient.diagnosis}>
                      {patient.diagnosis}
                    </td>
                    <td>
                      <Badge variant={patient.admissionType === 'VOLLSTATION' ? 'secondary' : 'default'}>
                        {patient.admissionType === 'VOLLSTATION' ? 'Vollstation' : 'Teilstation'}
                      </Badge>
                    </td>
                    <td>{getStationBadge(patient)}</td>
                    <td className="text-muted-foreground">
                      {formatDate(patient.lastModifiedAt)}
                    </td>
                    <td>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setPatientToRestore(patient)}
                        className="gap-1"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Wiederherstellen
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Restore Confirmation */}
      <AlertDialog open={!!patientToRestore} onOpenChange={() => setPatientToRestore(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Patient wiederherstellen?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchten Sie den Patienten <strong>{patientToRestore?.firstName} {patientToRestore?.lastName}</strong> wiederherstellen?
              {patientToRestore && (
                <span className="block mt-2">
                  Der Patient wird wieder in 
                  {patientToRestore.admissionType === 'VOLLSTATION' 
                    ? patientToRestore.vollStation 
                      ? ` Vollstation ${VOLL_STATION_LABELS[patientToRestore.vollStation]}`
                      : ' Vollstation (ohne Zuweisung)'
                    : patientToRestore.station 
                      ? ` Teilstation ${STATION_LABELS[patientToRestore.station]}`
                      : ' Teilstation Vorgespräche'
                  } aufgenommen.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestore}>
              Wiederherstellen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ArchivePage;
