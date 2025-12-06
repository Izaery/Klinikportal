import React, { useState, useMemo } from 'react';
import { 
  Search, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown,
  Edit,
  Trash2
} from 'lucide-react';
import { Patient, Station, VollStation, URGENCY_LABELS, STATION_LABELS, VOLL_STATION_LABELS } from '@/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

type SortField = 'lastName' | 'firstName' | 'birthDate' | 'diagnosis' | 'station' | 'vollStation' | 'urgency' | 'lastModifiedAt';
type SortDirection = 'asc' | 'desc';

interface Column {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string;
}

interface PatientTableProps {
  patients: Patient[];
  columns: Column[];
  onEdit?: (patient: Patient) => void;
  onDelete?: (patient: Patient) => void;
  onAssignStation?: (patient: Patient, station: Station) => void;
  showStationAssign?: boolean;
  emptyMessage?: string;
}

export const PatientTable: React.FC<PatientTableProps> = ({
  patients,
  columns,
  onEdit,
  onDelete,
  onAssignStation,
  showStationAssign = false,
  emptyMessage = 'Keine Patienten gefunden',
}) => {
  const { canEditPatients, canDeletePatients, canAssignStation } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('lastName');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const filteredAndSortedPatients = useMemo(() => {
    let filtered = patients;

    // Filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = patients.filter(p =>
        p.lastName.toLowerCase().includes(term) ||
        p.firstName.toLowerCase().includes(term) ||
        p.diagnosis?.toLowerCase().includes(term) ||
        p.caseNumber?.toLowerCase().includes(term)
      );
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      let aVal: string | number = '';
      let bVal: string | number = '';

      switch (sortField) {
        case 'lastName':
          aVal = a.lastName.toLowerCase();
          bVal = b.lastName.toLowerCase();
          break;
        case 'firstName':
          aVal = a.firstName.toLowerCase();
          bVal = b.firstName.toLowerCase();
          break;
        case 'birthDate':
          aVal = new Date(a.birthDate).getTime();
          bVal = new Date(b.birthDate).getTime();
          break;
        case 'diagnosis':
          aVal = (a.diagnosis || '').toLowerCase();
          bVal = (b.diagnosis || '').toLowerCase();
          break;
        case 'station':
          aVal = a.station || '';
          bVal = b.station || '';
          break;
        case 'vollStation':
          aVal = a.vollStation || '';
          bVal = b.vollStation || '';
          break;
        case 'urgency':
          aVal = a.urgency || '';
          bVal = b.urgency || '';
          break;
        case 'lastModifiedAt':
          aVal = new Date(a.lastModifiedAt).getTime();
          bVal = new Date(b.lastModifiedAt).getTime();
          break;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [patients, searchTerm, sortField, sortDirection]);

  const handleSort = (field: string) => {
    const sortableFields: SortField[] = ['lastName', 'firstName', 'birthDate', 'diagnosis', 'station', 'vollStation', 'urgency', 'lastModifiedAt'];
    if (!sortableFields.includes(field as SortField)) return;
    
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field as SortField);
      setSortDirection('asc');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE');
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const SortIcon: React.FC<{ field: string }> = ({ field }) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />;
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-4 w-4 ml-1" />
      : <ArrowDown className="h-4 w-4 ml-1" />;
  };

  const getStationBadgeVariant = (station: Station | undefined): "stationA" | "stationB" | "stationC" | "stationD" | "secondary" => {
    switch (station) {
      case 'A': return 'stationA';
      case 'B': return 'stationB';
      case 'C': return 'stationC';
      case 'D': return 'stationD';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Suchen nach Name, Diagnose, Fallnummer..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="clinic-table">
            <thead>
              <tr>
                {columns.map((col) => (
                  <th 
                    key={col.key} 
                    className={cn(col.sortable && 'cursor-pointer select-none')}
                    style={{ width: col.width }}
                    onClick={() => col.sortable && handleSort(col.key)}
                  >
                    <div className="flex items-center">
                      {col.label}
                      {col.sortable && <SortIcon field={col.key} />}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedPatients.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="text-center py-8 text-muted-foreground">
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                filteredAndSortedPatients.map((patient) => (
                  <tr key={patient.id} className="animate-fade-in">
                    {columns.map((col) => (
                      <td key={col.key}>
                        {col.key === 'lastName' && patient.lastName}
                        {col.key === 'firstName' && patient.firstName}
                        {col.key === 'birthDate' && formatDate(patient.birthDate)}
                        {col.key === 'diagnosis' && (
                          <span className="text-sm">{patient.diagnosis || '-'}</span>
                        )}
                        {col.key === 'station' && (
                          patient.station ? (
                            <Badge variant={getStationBadgeVariant(patient.station)}>
                              {STATION_LABELS[patient.station]}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )
                        )}
                        {col.key === 'vollStation' && (
                          patient.vollStation ? (
                            <Badge variant="secondary">
                              {VOLL_STATION_LABELS[patient.vollStation]}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )
                        )}
                        {col.key === 'urgency' && (
                          patient.urgency ? (
                            <Badge variant={patient.urgency === 'dringend' ? 'urgent' : 'elective'}>
                              {URGENCY_LABELS[patient.urgency]}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )
                        )}
                        {col.key === 'lastModifiedAt' && (
                          <div className="text-sm">
                            <div>{patient.lastModifiedByDisplayName}</div>
                            <div className="text-xs text-muted-foreground">
                              {formatDateTime(patient.lastModifiedAt)}
                            </div>
                          </div>
                        )}
                        {col.key === 'stationAssign' && showStationAssign && canAssignStation() && (
                          <div className="flex gap-1">
                            <Button 
                              size="xs" 
                              variant="stationA"
                              onClick={() => onAssignStation?.(patient, 'A')}
                            >
                              A
                            </Button>
                            <Button 
                              size="xs" 
                              variant="stationB"
                              onClick={() => onAssignStation?.(patient, 'B')}
                            >
                              B
                            </Button>
                            <Button 
                              size="xs" 
                              variant="stationC"
                              onClick={() => onAssignStation?.(patient, 'C')}
                            >
                              C
                            </Button>
                            <Button 
                              size="xs" 
                              variant="stationD"
                              onClick={() => onAssignStation?.(patient, 'D')}
                            >
                              D
                            </Button>
                          </div>
                        )}
                        {col.key === 'actions' && (
                          <div className="flex gap-2">
                            {canEditPatients() && onEdit && (
                              <Button 
                                size="icon" 
                                variant="ghost"
                                onClick={() => onEdit(patient)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                            {canDeletePatients() && onDelete && (
                              <Button 
                                size="icon" 
                                variant="ghost"
                                className="text-destructive hover:text-destructive"
                                onClick={() => onDelete(patient)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Count */}
      <div className="text-sm text-muted-foreground">
        {filteredAndSortedPatients.length} von {patients.length} Patienten
      </div>
    </div>
  );
};
