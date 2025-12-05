import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Clock } from 'lucide-react';
import { usePatients } from '@/contexts/PatientContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { STATION_LABELS, Station } from '@/types';

const TeilstationOverviewPage: React.FC = () => {
  const { 
    getTeilstationPatients, 
    getOpenTeilstationPatients,
    getStationPatients 
  } = usePatients();

  const allTeilstation = getTeilstationPatients();
  const openPatients = getOpenTeilstationPatients();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE');
  };

  const getDaysWaiting = (createdAt: string) => {
    const created = new Date(createdAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - created.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const StationMiniList: React.FC<{ station: Station }> = ({ station }) => {
    const patients = getStationPatients(station);
    const variant = `station${station}` as 'stationA' | 'stationB' | 'stationC' | 'stationD';
    const buttonVariant = `station${station}` as 'stationA' | 'stationB' | 'stationC' | 'stationD';

    return (
      <div className="clinic-card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Badge variant={variant}>{STATION_LABELS[station]}</Badge>
            <span className="text-sm text-muted-foreground">({patients.length})</span>
          </div>
          <Button variant={buttonVariant} size="sm" asChild>
            <Link to={`/station/${station}`}>
              Öffnen <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
        
        {patients.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Keine Patienten</p>
        ) : (
          <div className="space-y-2">
            {patients.slice(0, 5).map(patient => (
              <div key={patient.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <p className="font-medium text-sm">{patient.lastName}, {patient.firstName}</p>
                  <p className="text-xs text-muted-foreground truncate max-w-[200px]">{patient.diagnosis}</p>
                </div>
              </div>
            ))}
            {patients.length > 5 && (
              <p className="text-xs text-muted-foreground text-center pt-2">
                +{patients.length - 5} weitere
              </p>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Teilstation Übersicht</h1>
        <p className="text-muted-foreground mt-1">
          {allTeilstation.length} Patienten insgesamt
        </p>
      </div>

      {/* Patienten ohne Station */}
      <div className="clinic-card border-warning/50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-warning" />
            <h2 className="text-lg font-semibold text-foreground">Ohne Station</h2>
            <Badge variant="outline" className="text-warning border-warning">
              {openPatients.length}
            </Badge>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/teilstation/open">
              Alle anzeigen <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>

        {openPatients.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Alle Patienten sind einer Station zugewiesen
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="clinic-table">
              <thead>
                <tr>
                  <th>Nachname</th>
                  <th>Vorname</th>
                  <th>Angelegt am</th>
                  <th>Wartet seit</th>
                </tr>
              </thead>
              <tbody>
                {openPatients.slice(0, 5).map(patient => {
                  const daysWaiting = getDaysWaiting(patient.createdAt);
                  return (
                    <tr key={patient.id}>
                      <td className="font-medium">{patient.lastName}</td>
                      <td>{patient.firstName}</td>
                      <td>{formatDate(patient.createdAt)}</td>
                      <td>
                        <Badge variant={daysWaiting > 3 ? 'urgent' : 'secondary'}>
                          {daysWaiting} Tag{daysWaiting !== 1 ? 'e' : ''}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {openPatients.length > 5 && (
              <p className="text-sm text-muted-foreground text-center py-2">
                +{openPatients.length - 5} weitere Patienten ohne Station
              </p>
            )}
          </div>
        )}
      </div>

      {/* Station Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StationMiniList station="A" />
        <StationMiniList station="B" />
        <StationMiniList station="C" />
        <StationMiniList station="D" />
      </div>
    </div>
  );
};

export default TeilstationOverviewPage;
