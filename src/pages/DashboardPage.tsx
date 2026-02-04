import React from 'react';
import { 
  Users, 
  Building2, 
  ClipboardList, 
  Clock
} from 'lucide-react';
import { usePatients } from '@/contexts/PatientContext.standalone';
import { useAuth } from '@/contexts/AuthContext.standalone';
import { Badge } from '@/components/ui/badge';
import { STATION_LABELS, URGENCY_LABELS, VOLL_STATION_LABELS } from '@/types';
import { useNavigate } from 'react-router-dom';

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { 
    getVollstationPatients, 
    getTeilstationPatients, 
    getOpenTeilstationPatients,
    getStationPatients,
    getVollStationPatients,
    getRecentlyModified 
  } = usePatients();

  const vollstationCount = getVollstationPatients().length;
  const teilstationCount = getTeilstationPatients().length;
  const openCount = getOpenTeilstationPatients().length;
  const recentPatients = getRecentlyModified(5);

  const stationCounts = {
    A: getStationPatients('A').length,
    B: getStationPatients('B').length,
    C: getStationPatients('C').length,
    D: getStationPatients('D').length,
  };

  const vollStationCounts = {
    E: getVollStationPatients('E').length,
    F: getVollStationPatients('F').length,
    G: getVollStationPatients('G').length,
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Willkommen zurück, {user?.displayName}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Vollstation */}
        <div 
          className="stat-card cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => navigate('/vollstation')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Vollstation</p>
              <p className="text-3xl font-bold text-foreground mt-1">{vollstationCount}</p>
            </div>
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="h-6 w-6 text-primary" />
            </div>
          </div>
        </div>

        {/* Teilstation Gesamt */}
        <div 
          className="stat-card cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => navigate('/teilstation/overview')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Teilstation Gesamt</p>
              <p className="text-3xl font-bold text-foreground mt-1">{teilstationCount}</p>
            </div>
            <div className="h-12 w-12 rounded-lg bg-accent/10 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-accent" />
            </div>
          </div>
        </div>

        {/* Vorgespräche */}
        <div 
          className="stat-card cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => navigate('/teilstation/open')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Anfrageliste Teilstation</p>
              <p className="text-3xl font-bold text-foreground mt-1">{openCount}</p>
            </div>
            <div className="h-12 w-12 rounded-lg bg-warning/10 flex items-center justify-center">
              <ClipboardList className="h-6 w-6 text-warning" />
            </div>
          </div>
          {openCount > 0 && (
            <p className="text-xs text-warning mt-2">
              {openCount} Patient(en) warten auf Zuweisung
            </p>
          )}
        </div>
      </div>

      {/* Vollstation Warteliste */}
      <div className="clinic-card">
        <h2 className="text-lg font-semibold text-foreground mb-4">Vollstation Warteliste</h2>
        <div className="grid grid-cols-3 gap-4">
          {(['E', 'F', 'G'] as const).map((station) => (
            <div 
              key={station} 
              className="p-4 rounded-lg border border-border bg-muted/30 text-center"
            >
              <Badge 
                variant="secondary"
                className="mb-2"
              >
                {VOLL_STATION_LABELS[station]}
              </Badge>
              <p className="text-2xl font-bold text-foreground">{vollStationCounts[station]}</p>
              <p className="text-xs text-muted-foreground">Patienten</p>
            </div>
          ))}
        </div>
      </div>

      {/* Teilstation Warteliste */}
      <div className="clinic-card">
        <h2 className="text-lg font-semibold text-foreground mb-4">Teilstation Warteliste</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {(['A', 'B', 'C', 'D'] as const).map((station) => (
            <div 
              key={station} 
              className="p-4 rounded-lg border border-border bg-muted/30 text-center cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => navigate(`/station/${station}/warteliste`)}
            >
              <Badge 
                variant={`station${station}` as 'stationA' | 'stationB' | 'stationC' | 'stationD'}
                className="mb-2"
              >
                {STATION_LABELS[station]}
              </Badge>
              <p className="text-2xl font-bold text-foreground">{stationCounts[station]}</p>
              <p className="text-xs text-muted-foreground">Patienten</p>
            </div>
          ))}
        </div>
      </div>

      {/* Zuletzt geändert */}
      <div className="clinic-card">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-foreground">Zuletzt geändert</h2>
        </div>
        
        {recentPatients.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">Keine Patienten vorhanden</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="clinic-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Aufnahme</th>
                  <th>Station</th>
                  <th>Diagnose</th>
                  <th>Geändert</th>
                </tr>
              </thead>
              <tbody>
                {recentPatients.map((patient) => (
                  <tr key={patient.id}>
                    <td className="font-medium">
                      {patient.lastName}, {patient.firstName}
                    </td>
                    <td>
                      <Badge variant={patient.admissionType === 'VOLLSTATION' ? 'vollstation' : 'teilstation'}>
                        {patient.admissionType === 'VOLLSTATION' ? 'Voll' : 'Teil'}
                      </Badge>
                    </td>
                    <td>
                      {patient.station ? (
                        <Badge variant={`station${patient.station}` as 'stationA' | 'stationB' | 'stationC' | 'stationD'}>
                          {STATION_LABELS[patient.station]}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="text-sm max-w-xs truncate">{patient.diagnosis || '-'}</td>
                    <td className="text-sm text-muted-foreground">
                      {formatDate(patient.lastModifiedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
