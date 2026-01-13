import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  UserPlus, 
  Building2, 
  Users, 
  ClipboardList,
  Shield,
  Archive,
  LogOut,
  ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  end?: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ to, icon, label, end }) => {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn('sidebar-item', isActive && 'active')
      }
    >
      {icon}
      <span>{label}</span>
    </NavLink>
  );
};

export const Sidebar: React.FC = () => {
  const { user, logout, canViewVollstation, canAccessAdminCenter, getVisibleStations, hasAnyRole } = useAuth();
  const location = useLocation();
  const [teilstationOpen, setTeilstationOpen] = React.useState(
    location.pathname.includes('/teilstation') || location.pathname.includes('/station')
  );

  const visibleStations = getVisibleStations();
  const canSeeStationTabs = visibleStations.length > 0 && !hasAnyRole(['INTAKE']);

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-sidebar border-r border-sidebar-border">
      <div className="flex h-full flex-col">
        {/* Logo/Header */}
        <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary">
            <Building2 className="h-5 w-5 text-sidebar-primary-foreground" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-sidebar-foreground">KlinikPortal</h1>
            <p className="text-xs text-sidebar-foreground/60">Patientenverwaltung</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <div className="space-y-1">
            <NavItem 
              to="/dashboard" 
              icon={<LayoutDashboard className="h-5 w-5" />} 
              label="Dashboard" 
            />
            
            <NavItem 
              to="/patient/new" 
              icon={<UserPlus className="h-5 w-5" />} 
              label="Patient anlegen" 
            />

            {canViewVollstation() && (
              <NavItem 
                to="/vollstation" 
                icon={<Users className="h-5 w-5" />} 
                label="Vollstation" 
              />
            )}

            {/* Teilstation Collapsible */}
            <Collapsible open={teilstationOpen} onOpenChange={setTeilstationOpen}>
              <CollapsibleTrigger className="sidebar-item w-full justify-between">
                <div className="flex items-center gap-3">
                  <ClipboardList className="h-5 w-5" />
                  <span>Teilstation</span>
                </div>
                <ChevronDown className={cn(
                  "h-4 w-4 transition-transform duration-200",
                  teilstationOpen && "rotate-180"
                )} />
              </CollapsibleTrigger>
              <CollapsibleContent className="pl-4 space-y-1 mt-1">
                <NavItem 
                  to="/teilstation/overview" 
                  icon={<span className="w-5 h-5 flex items-center justify-center text-xs">📊</span>} 
                  label="Übersicht" 
                />
                <NavItem 
                  to="/teilstation/open" 
                  icon={<span className="w-5 h-5 flex items-center justify-center text-xs">📋</span>} 
                  label="Vorgespräche" 
                />
                {canSeeStationTabs && (
                  <>
                    {visibleStations.includes('A') && (
                      <NavItem 
                        to="/station/A" 
                        icon={<span className="w-5 h-5 flex items-center justify-center rounded bg-station-a text-[10px] font-bold text-primary-foreground">A</span>} 
                        label="Station A" 
                      />
                    )}
                    {visibleStations.includes('B') && (
                      <NavItem 
                        to="/station/B" 
                        icon={<span className="w-5 h-5 flex items-center justify-center rounded bg-station-b text-[10px] font-bold text-primary-foreground">B</span>} 
                        label="Station B" 
                      />
                    )}
                    {visibleStations.includes('C') && (
                      <NavItem 
                        to="/station/C" 
                        icon={<span className="w-5 h-5 flex items-center justify-center rounded bg-station-c text-[10px] font-bold text-primary-foreground">C</span>} 
                        label="Station C" 
                      />
                    )}
                    {visibleStations.includes('D') && (
                      <NavItem 
                        to="/station/D" 
                        icon={<span className="w-5 h-5 flex items-center justify-center rounded bg-station-d text-[10px] font-bold text-primary-foreground">D</span>} 
                        label="Station D" 
                      />
                    )}
                  </>
                )}
              </CollapsibleContent>
            </Collapsible>

            {canAccessAdminCenter() && (
              <Collapsible>
                <CollapsibleTrigger className="sidebar-item w-full justify-between">
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5" />
                    <span>Admin-Center</span>
                  </div>
                  <ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent className="pl-4 space-y-1 mt-1">
                  <NavItem 
                    to="/admin" 
                    icon={<Users className="h-5 w-5" />} 
                    label="Benutzerverwaltung" 
                    end
                  />
                  <NavItem 
                    to="/admin/archive" 
                    icon={<Archive className="h-5 w-5" />} 
                    label="Archiv" 
                  />
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        </nav>

        {/* User Info & Logout */}
        <div className="border-t border-sidebar-border p-4">
          <div className="mb-3 px-2">
            <p className="text-sm font-medium text-sidebar-foreground">{user?.displayName}</p>
            <p className="text-xs text-sidebar-foreground/60">@{user?.username}</p>
          </div>
          <Button 
            variant="ghost" 
            className="w-full justify-start text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={logout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Abmelden
          </Button>
        </div>
      </div>
    </aside>
  );
};
