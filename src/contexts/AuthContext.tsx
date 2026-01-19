import React, { createContext, useContext, useState, useCallback } from 'react';
import { User, UserRole, Station, STATION_ROLES } from '@/types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  changePassword: (oldPassword: string, newPassword: string) => Promise<boolean>;
  hasRole: (role: UserRole) => boolean;
  hasAnyRole: (roles: UserRole[]) => boolean;
  canViewVollstation: () => boolean;
  canEditPatients: () => boolean;
  canDeletePatients: () => boolean;
  canAssignStation: () => boolean;
  canViewStation: (station: Station) => boolean;
  canAccessAdminCenter: () => boolean;
  getVisibleStations: () => Station[];
  isReadOnly: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Pflege-Rollen Mapping (read-only per station)
export const PFLEGE_ROLES: Record<Station, UserRole> = {
  'A': 'pflege_a',
  'B': 'pflege_b',
  'C': 'pflege_c',
  'D': 'pflege_d',
};

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
  {
    id: '9',
    username: 'pflege_a',
    password: 'pflege123',
    displayName: 'Sr. Krause (A)',
    roles: ['pflege_a'],
    createdAt: new Date().toISOString(),
  },
  {
    id: '10',
    username: 'pflege_b',
    password: 'pflege123',
    displayName: 'Sr. Fischer (B)',
    roles: ['pflege_b'],
    createdAt: new Date().toISOString(),
  },
  {
    id: '11',
    username: 'pflege_c',
    password: 'pflege123',
    displayName: 'Sr. Weber (C)',
    roles: ['pflege_c'],
    createdAt: new Date().toISOString(),
  },
  {
    id: '12',
    username: 'pflege_d',
    password: 'pflege123',
    displayName: 'Sr. Becker (D)',
    roles: ['pflege_d'],
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

  const changePassword = useCallback(async (oldPassword: string, newPassword: string): Promise<boolean> => {
    if (!user) return false;
    
    // Find the user in mock data
    const mockUser = MOCK_USERS.find(u => u.id === user.id);
    if (!mockUser) return false;
    
    // Verify old password
    if (mockUser.password !== oldPassword) return false;
    
    // Update password in mock data (in a real app this would be an API call)
    mockUser.password = newPassword;
    return true;
  }, [user]);

  const hasRole = useCallback((role: UserRole): boolean => {
    return user?.roles.includes(role) ?? false;
  }, [user]);

  const hasAnyRole = useCallback((roles: UserRole[]): boolean => {
    return roles.some(role => user?.roles.includes(role));
  }, [user]);

  // Check if user has only read-only roles (Pflege)
  const isReadOnly = useCallback((): boolean => {
    if (!user) return true;
    // If user has any of the editing roles, they're not read-only
    const editingRoles: UserRole[] = ['ADMIN', 'MANAGER', 'INTAKE', 'arzt_a', 'arzt_b', 'arzt_c', 'arzt_d'];
    return !editingRoles.some(role => user.roles.includes(role));
  }, [user]);

  const canViewVollstation = useCallback((): boolean => {
    return hasAnyRole(['ADMIN', 'MANAGER', 'VOLL_VIEW']);
  }, [hasAnyRole]);

  const canEditPatients = useCallback((): boolean => {
    // Pflege roles cannot edit
    if (isReadOnly()) return false;
    return hasAnyRole(['ADMIN', 'MANAGER']);
  }, [hasAnyRole, isReadOnly]);

  const canDeletePatients = useCallback((): boolean => {
    // Pflege roles cannot delete
    if (isReadOnly()) return false;
    return hasAnyRole(['ADMIN', 'MANAGER']);
  }, [hasAnyRole, isReadOnly]);

  const canAssignStation = useCallback((): boolean => {
    // Pflege roles cannot assign
    if (isReadOnly()) return false;
    return hasAnyRole(['ADMIN', 'MANAGER', 'arzt_a', 'arzt_b', 'arzt_c', 'arzt_d']);
  }, [hasAnyRole, isReadOnly]);

  const canViewStation = useCallback((station: Station): boolean => {
    if (hasAnyRole(['ADMIN', 'MANAGER'])) return true;
    const stationRole = STATION_ROLES[station];
    const pflegeRole = PFLEGE_ROLES[station];
    return hasRole(stationRole) || hasRole(pflegeRole);
  }, [hasRole, hasAnyRole]);

  const canAccessAdminCenter = useCallback((): boolean => {
    return hasRole('ADMIN');
  }, [hasRole]);

  const getVisibleStations = useCallback((): Station[] => {
    if (hasAnyRole(['ADMIN', 'MANAGER'])) {
      return ['A', 'B', 'C', 'D'];
    }
    const stations: Station[] = [];
    if (hasRole('arzt_a') || hasRole('pflege_a')) stations.push('A');
    if (hasRole('arzt_b') || hasRole('pflege_b')) stations.push('B');
    if (hasRole('arzt_c') || hasRole('pflege_c')) stations.push('C');
    if (hasRole('arzt_d') || hasRole('pflege_d')) stations.push('D');
    return stations;
  }, [hasRole, hasAnyRole]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        logout,
        changePassword,
        hasRole,
        hasAnyRole,
        canViewVollstation,
        canEditPatients,
        canDeletePatients,
        canAssignStation,
        canViewStation,
        canAccessAdminCenter,
        getVisibleStations,
        isReadOnly,
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
