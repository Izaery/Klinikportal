import React, { useState, useMemo } from 'react';
import { 
  Search, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown,
  Edit,
  Trash2,
  ChevronDown,
  ChevronUp,
  UserPlus
} from 'lucide-react';
import { Patient, Station, VollStation, URGENCY_LABELS, STATION_LABELS, VOLL_STATION_LABELS, GENDER_LABELS } from '@/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

type SortField = 'lastName' | 'firstName' | 'birthDate' | 'diagnosis' | 'station' | 'vollStation' | 'urgency' | 'lastModifiedAt' | 'preInterviewDate' | 'admissionDate' | 'waitingTime' | 'mondayCall';
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
  onAdmit?: (patient: Patient) => void;
  showStationAssign?: boolean;
  emptyMessage?: string;
}

export const PatientTable: React.FC<PatientTableProps> = ({
  patients,
  columns,
  onEdit,
  onDelete,
  onAssignStation,
  onAdmit,
  showStationAssign = false,
  emptyMessage = 'Keine Patienten gefunden',
}) => {
  const { canEditPatients, canDeletePatients, canAssignStation } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('lastName');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [expandedPatientId, setExpandedPatientId] = useState<string | null>(null);

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
        case 'preInterviewDate':
          aVal = a.preInterviewDate ? new Date(a.preInterviewDate).getTime() : 0;
          bVal = b.preInterviewDate ? new Date(b.preInterviewDate).getTime() : 0;
          break;
        case 'admissionDate':
          aVal = a.admissionDate ? new Date(a.admissionDate).getTime() : 0;
          bVal = b.admissionDate ? new Date(b.admissionDate).getTime() : 0;
          break;
        case 'waitingTime':
          aVal = a.preInterviewDate ? new Date().getTime() - new Date(a.preInterviewDate).getTime() : 0;
          bVal = b.preInterviewDate ? new Date().getTime() - new Date(b.preInterviewDate).getTime() : 0;
          break;
        case 'mondayCall':
          aVal = a.mondayCall ? 1 : 0;
          bVal = b.mondayCall ? 1 : 0;
          break;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [patients, searchTerm, sortField, sortDirection]);

  const handleSort = (field: string) => {
    const sortableFields: SortField[] = ['lastName', 'firstName', 'birthDate', 'diagnosis', 'station', 'vollStation', 'urgency', 'lastModifiedAt', 'preInterviewDate', 'admissionDate', 'waitingTime', 'mondayCall'];
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

  const calculateWaitingDays = (preInterviewDate: string | undefined): number | null => {
    if (!preInterviewDate) return null;
    const start = new Date(preInterviewDate);
    const today = new Date();
    const diffTime = today.getTime() - start.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getWaitingBadgeClass = (days: number | null): string => {
    if (days === null) return '';
    if (days < 30) return 'bg-green-500 text-white';
    if (days <= 60) return 'bg-yellow-500 text-black';
    return 'bg-red-500 text-white';
  };

  const toggleExpanded = (patientId: string) => {
    setExpandedPatientId(expandedPatientId === patientId ? null : patientId);
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
                <th style={{ width: '40px' }}></th>
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
                  <td colSpan={columns.length + 1} className="text-center py-8 text-muted-foreground">
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                filteredAndSortedPatients.map((patient) => (
                  <React.Fragment key={patient.id}>
                    <tr 
                      className={cn(
                        "animate-fade-in cursor-pointer hover:bg-muted/50 transition-colors",
                        expandedPatientId === patient.id && "bg-muted/30"
                      )}
                      onClick={() => toggleExpanded(patient.id)}
                    >
                      <td className="text-center">
                        {expandedPatientId === patient.id ? (
                          <ChevronUp className="h-4 w-4 mx-auto text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 mx-auto text-muted-foreground" />
                        )}
                      </td>
                      {columns.map((col) => (
                        <td key={col.key} onClick={(e) => col.key === 'actions' || col.key === 'stationAssign' ? e.stopPropagation() : undefined}>
                          {col.key === 'lastName' && patient.lastName}
                          {col.key === 'firstName' && patient.firstName}
                          {col.key === 'mondayCall' && (
                            <Badge variant={patient.mondayCall ? 'default' : 'secondary'}>
                              {patient.mondayCall ? 'Ja' : 'Nein'}
                            </Badge>
                          )}
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
                          {col.key === 'waitingTime' && (
                            (() => {
                              const days = calculateWaitingDays(patient.preInterviewDate);
                              if (days === null) return <span className="text-muted-foreground">-</span>;
                              return (
                                <Badge className={cn('font-medium', getWaitingBadgeClass(days))}>
                                  {days} {days === 1 ? 'Tag' : 'Tage'}
                                </Badge>
                              );
                            })()
                          )}
                          {col.key === 'preInterviewDate' && (
                            patient.preInterviewDate ? (
                              <span className="text-sm">{formatDate(patient.preInterviewDate)}</span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )
                          )}
                          {col.key === 'admissionDate' && (
                            patient.admissionDate ? (
                              <span className="text-sm">{formatDate(patient.admissionDate)}</span>
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
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onAssignStation?.(patient, 'A');
                                }}
                              >
                                A
                              </Button>
                              <Button 
                                size="xs" 
                                variant="stationB"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onAssignStation?.(patient, 'B');
                                }}
                              >
                                B
                              </Button>
                              <Button 
                                size="xs" 
                                variant="stationC"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onAssignStation?.(patient, 'C');
                                }}
                              >
                                C
                              </Button>
                              <Button 
                                size="xs" 
                                variant="stationD"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onAssignStation?.(patient, 'D');
                                }}
                              >
                                D
                              </Button>
                            </div>
                          )}
                          {col.key === 'admissionAction' && onAdmit && (
                            <Button 
                              size="sm" 
                              variant="success"
                              onClick={(e) => {
                                e.stopPropagation();
                                onAdmit(patient);
                              }}
                            >
                              <UserPlus className="h-4 w-4 mr-1" />
                              Aufnahme
                            </Button>
                          )}
                          {col.key === 'actions' && (
                            <div className="flex gap-2">
                              {canEditPatients() && onEdit && (
                                <Button 
                                  size="icon" 
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onEdit(patient);
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              )}
                              {canDeletePatients() && onDelete && (
                                <Button 
                                  size="icon" 
                                  variant="ghost"
                                  className="text-destructive hover:text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete(patient);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          )}
                        </td>
                      ))}
                    </tr>
                    {/* Expanded Details Row */}
                    {expandedPatientId === patient.id && (
                      <tr className="bg-muted/20">
                        <td colSpan={columns.length + 1} className="p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                            <div>
                              <h4 className="font-semibold mb-2 text-foreground">Stammdaten</h4>
                              <div className="space-y-1 text-muted-foreground">
                                <p><span className="font-medium text-foreground">Name:</span> {patient.lastName}, {patient.firstName}</p>
                                <p><span className="font-medium text-foreground">Geburtsdatum:</span> {formatDate(patient.birthDate)}</p>
                                <p><span className="font-medium text-foreground">Geschlecht:</span> {GENDER_LABELS[patient.gender]}</p>
                                {patient.caseNumber && (
                                  <p><span className="font-medium text-foreground">Fallnummer:</span> {patient.caseNumber}</p>
                                )}
                              </div>
                            </div>
                            
                            <div>
                              <h4 className="font-semibold mb-2 text-foreground">Kontakt</h4>
                              <div className="space-y-1 text-muted-foreground">
                                {patient.phone && <p><span className="font-medium text-foreground">Telefon:</span> {patient.phone}</p>}
                                {patient.email && <p><span className="font-medium text-foreground">E-Mail:</span> {patient.email}</p>}
                                {!patient.phone && !patient.email && <p>Keine Kontaktdaten</p>}
                              </div>
                            </div>
                            
                            <div>
                              <h4 className="font-semibold mb-2 text-foreground">Medizinische Daten</h4>
                              <div className="space-y-1 text-muted-foreground">
                                <p><span className="font-medium text-foreground">Diagnose:</span> {patient.diagnosis}</p>
                                <p><span className="font-medium text-foreground">Einzugsgebiet:</span> {patient.catchmentArea ? 'Ja' : 'Nein'}</p>
                                <p><span className="font-medium text-foreground">Externe Einweisung:</span> {patient.externalReferral ? 'Ja' : 'Nein'}</p>
                                {patient.substanceAbuse && (
                                  <p><span className="font-medium text-foreground">Suchtmittel:</span> {patient.substanceAbuseDetails}</p>
                                )}
                                {patient.relevantConditions && (
                                  <p><span className="font-medium text-foreground">Erkrankungen:</span> {patient.relevantConditionsDetails}</p>
                                )}
                              </div>
                            </div>
                            
                            <div>
                              <h4 className="font-semibold mb-2 text-foreground">Aufnahme</h4>
                              <div className="space-y-1 text-muted-foreground">
                                <p><span className="font-medium text-foreground">Aufnahmeart:</span> {patient.admissionType === 'VOLLSTATION' ? 'Vollstation' : 'Teilstation'}</p>
                                {patient.urgency && (
                                  <p><span className="font-medium text-foreground">Dringlichkeit:</span> {URGENCY_LABELS[patient.urgency]}</p>
                                )}
                                {patient.station && (
                                  <p><span className="font-medium text-foreground">Station:</span> {STATION_LABELS[patient.station]}</p>
                                )}
                                {patient.vollStation && (
                                  <p><span className="font-medium text-foreground">Station:</span> {VOLL_STATION_LABELS[patient.vollStation]}</p>
                                )}
                                {patient.preInterviewDate && (
                                  <p><span className="font-medium text-foreground">Vorgesprächstermin:</span> {formatDate(patient.preInterviewDate)}</p>
                                )}
                                {patient.admissionDate && (
                                  <p><span className="font-medium text-foreground">Aufnahmedatum:</span> {formatDate(patient.admissionDate)}</p>
                                )}
                              </div>
                            </div>
                            
                            {patient.notes && (
                              <div className="md:col-span-2">
                                <h4 className="font-semibold mb-2 text-foreground">Anmerkungen</h4>
                                <p className="text-muted-foreground">{patient.notes}</p>
                              </div>
                            )}
                            
                            <div>
                              <h4 className="font-semibold mb-2 text-foreground">Metadaten</h4>
                              <div className="space-y-1 text-muted-foreground">
                                <p><span className="font-medium text-foreground">Erstellt von:</span> {patient.createdByDisplayName}</p>
                                <p><span className="font-medium text-foreground">Erstellt am:</span> {formatDateTime(patient.createdAt)}</p>
                                <p><span className="font-medium text-foreground">Geändert von:</span> {patient.lastModifiedByDisplayName}</p>
                                <p><span className="font-medium text-foreground">Geändert am:</span> {formatDateTime(patient.lastModifiedAt)}</p>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
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