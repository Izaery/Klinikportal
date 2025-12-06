import React, { createContext, useContext, useState, useCallback } from 'react';
import { User, UserRole, Station, STATION_ROLES } from '@/types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  hasRole: (role: UserRole) => boolean;
  hasAnyRole: (roles: UserRole[]) => boolean;
  canViewVollstation: () => boolean;
  canEditPatients: () => boolean;
  canDeletePatients: () => boolean;
  canAssignStation: () => boolean;
  canViewStation: (station: Station) => boolean;
  canAccessAdminCenter: () => boolean;
  getVisibleStations: () => Station[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock users for demonstration
const MOCK_USERS: Array<User & { password: string }> = [
  {
    id: '1',
    username: 'admin',
    password: 'admin123',
    displayName: 'Dr. Admin',
    roles: ['ADMIN'],
    createdAt: new Date().toISOString(),
  },
  {
    id: '2',
    username: 'manager',
    password: 'manager123',
    displayName: 'Fr. Manager',
    roles: ['MANAGER'],
    createdAt: new Date().toISOString(),
  },
  {
    id: '3',
    username: 'aufnahme',
    password: 'aufnahme123',
    displayName: 'Hr. Aufnahme',
    roles: ['INTAKE'],
    createdAt: new Date().toISOString(),
  },
  {
    id: '4',
    username: 'voll_view',
    password: 'voll123',
    displayName: 'Fr. Vollansicht',
    roles: ['VOLL_VIEW'],
    createdAt: new Date().toISOString(),
  },
  {
    id: '5',
    username: 'arzt_a',
    password: 'arzt123',
    displayName: 'Dr. Schmidt (A)',
    roles: ['arzt_a'],
    createdAt: new Date().toISOString(),
  },
  {
    id: '6',
    username: 'arzt_b',
    password: 'arzt123',
    displayName: 'Dr. Müller (B)',
    roles: ['arzt_b'],
    createdAt: new Date().toISOString(),
  },
  {
    id: '7',
    username: 'arzt_c',
    password: 'arzt123',
    displayName: 'Dr. Meier (C)',
    roles: ['arzt_c'],
    createdAt: new Date().toISOString(),
  },
  {
    id: '8',
    username: 'arzt_d',
    password: 'arzt123',
    displayName: 'Dr. Wagner (D)',
    roles: ['arzt_d'],
    createdAt: new Date().toISOString(),
  },
];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    const foundUser = MOCK_USERS.find(
      u => u.username === username && u.password === password
    );
    
    if (foundUser) {
      const { password: _, ...userWithoutPassword } = foundUser;
      setUser(userWithoutPassword);
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
  }, []);

  const hasRole = useCallback((role: UserRole): boolean => {
    return user?.roles.includes(role) ?? false;
  }, [user]);

  const hasAnyRole = useCallback((roles: UserRole[]): boolean => {
    return roles.some(role => user?.roles.includes(role));
  }, [user]);

  const canViewVollstation = useCallback((): boolean => {
    return hasAnyRole(['ADMIN', 'MANAGER', 'VOLL_VIEW']);
  }, [hasAnyRole]);

  const canEditPatients = useCallback((): boolean => {
    return hasAnyRole(['ADMIN', 'MANAGER']);
  }, [hasAnyRole]);

  const canDeletePatients = useCallback((): boolean => {
    return hasAnyRole(['ADMIN', 'MANAGER']);
  }, [hasAnyRole]);

  const canAssignStation = useCallback((): boolean => {
    return hasAnyRole(['ADMIN', 'MANAGER', 'arzt_a', 'arzt_b', 'arzt_c', 'arzt_d']);
  }, [hasAnyRole]);

  const canViewStation = useCallback((station: Station): boolean => {
    if (hasAnyRole(['ADMIN', 'MANAGER'])) return true;
    const stationRole = STATION_ROLES[station];
    return hasRole(stationRole);
  }, [hasRole, hasAnyRole]);

  const canAccessAdminCenter = useCallback((): boolean => {
    return hasRole('ADMIN');
  }, [hasRole]);

  const getVisibleStations = useCallback((): Station[] => {
    if (hasAnyRole(['ADMIN', 'MANAGER'])) {
      return ['A', 'B', 'C', 'D'];
    }
    const stations: Station[] = [];
    if (hasRole('arzt_a')) stations.push('A');
    if (hasRole('arzt_b')) stations.push('B');
    if (hasRole('arzt_c')) stations.push('C');
    if (hasRole('arzt_d')) stations.push('D');
    return stations;
  }, [hasRole, hasAnyRole]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        logout,
        hasRole,
        hasAnyRole,
        canViewVollstation,
        canEditPatients,
        canDeletePatients,
        canAssignStation,
        canViewStation,
        canAccessAdminCenter,
        getVisibleStations,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
