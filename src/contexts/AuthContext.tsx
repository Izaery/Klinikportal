import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { User, UserRole, Station, STATION_ROLES } from '@/types';
import { authApi, getAuthToken, setAuthToken } from '@/lib/api-client';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  changePassword: (newPassword: string, currentPassword?: string) => Promise<boolean>;
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

// Map database role strings to UserRole type
const mapDbRoleToUserRole = (dbRole: string): UserRole | null => {
  const validRoles: UserRole[] = [
    'ADMIN', 'MANAGER', 'INTAKE', 'VOLL_VIEW',
    'arzt_a', 'arzt_b', 'arzt_c', 'arzt_d', 'arzt_allgemein',
    'pflege_a', 'pflege_b', 'pflege_c', 'pflege_d'
  ];
  return validRoles.includes(dbRole as UserRole) ? (dbRole as UserRole) : null;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch user data from API
  const fetchUserData = useCallback(async (): Promise<User | null> => {
    try {
      const { data, error } = await authApi.getCurrentUser();

      if (error || !data) {
        console.error('Error fetching user:', error);
        return null;
      }

      const roles: UserRole[] = (data.roles || [])
        .map((r: string) => mapDbRoleToUserRole(r))
        .filter((r: UserRole | null): r is UserRole => r !== null);

      return {
        id: data.id,
        username: data.username,
        displayName: data.displayName,
        roles,
        createdAt: data.createdAt,
      };
    } catch (error) {
      console.error('Error in fetchUserData:', error);
      return null;
    }
  }, []);

  // Initialize auth state from stored token
  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = getAuthToken();
        if (token) {
          const userData = await fetchUserData();
          if (userData) {
            setUser(userData);
          } else {
            // Token invalid, clear it
            setAuthToken(null);
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        setAuthToken(null);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, [fetchUserData]);

  const login = useCallback(async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error } = await authApi.login(username, password);

      if (error || !data) {
        return { success: false, error: error || 'Anmeldung fehlgeschlagen' };
      }

      const roles: UserRole[] = (data.user.roles || [])
        .map((r: string) => mapDbRoleToUserRole(r))
        .filter((r: UserRole | null): r is UserRole => r !== null);

      const userData: User = {
        id: data.user.id,
        username: data.user.username,
        displayName: data.user.displayName,
        roles,
        createdAt: new Date().toISOString(),
      };

      setUser(userData);
      return { success: true };
    } catch (error) {
      console.error('Login exception:', error);
      return { success: false, error: 'Ein unerwarteter Fehler ist aufgetreten' };
    }
  }, []);

  const logout = useCallback(async () => {
    authApi.logout();
    setUser(null);
  }, []);

  const changePassword = useCallback(async (newPassword: string, currentPassword?: string): Promise<boolean> => {
    try {
      if (!currentPassword) {
        console.error('Current password required for standalone mode');
        return false;
      }
      const { error } = await authApi.changePassword(currentPassword, newPassword);
      return !error;
    } catch {
      return false;
    }
  }, []);

  const hasRole = useCallback((role: UserRole): boolean => {
    return user?.roles.includes(role) ?? false;
  }, [user]);

  const hasAnyRole = useCallback((roles: UserRole[]): boolean => {
    return roles.some(role => user?.roles.includes(role));
  }, [user]);

  // Check if user has only read-only roles (Pflege)
  const isReadOnly = useCallback((): boolean => {
    if (!user) return true;
    const editingRoles: UserRole[] = ['ADMIN', 'MANAGER', 'INTAKE', 'arzt_a', 'arzt_b', 'arzt_c', 'arzt_d', 'arzt_allgemein'];
    return !editingRoles.some(role => user.roles.includes(role));
  }, [user]);

  const canViewVollstation = useCallback((): boolean => {
    return hasAnyRole(['ADMIN', 'MANAGER', 'VOLL_VIEW']);
  }, [hasAnyRole]);

  const canEditPatients = useCallback((): boolean => {
    if (isReadOnly()) return false;
    return hasAnyRole(['ADMIN', 'MANAGER', 'INTAKE', 'arzt_a', 'arzt_b', 'arzt_c', 'arzt_d', 'arzt_allgemein']);
  }, [hasAnyRole, isReadOnly]);

  const canDeletePatients = useCallback((): boolean => {
    if (isReadOnly()) return false;
    return hasAnyRole(['ADMIN', 'MANAGER', 'arzt_a', 'arzt_b', 'arzt_c', 'arzt_d', 'arzt_allgemein']);
  }, [hasAnyRole, isReadOnly]);

  const canAssignStation = useCallback((): boolean => {
    if (isReadOnly()) return false;
    return hasAnyRole(['ADMIN', 'MANAGER', 'arzt_a', 'arzt_b', 'arzt_c', 'arzt_d', 'arzt_allgemein']);
  }, [hasAnyRole, isReadOnly]);

  const canViewStation = useCallback((station: Station): boolean => {
    if (hasAnyRole(['ADMIN', 'MANAGER', 'INTAKE'])) return true;
    const stationRole = STATION_ROLES[station];
    const pflegeRole = PFLEGE_ROLES[station];
    return hasRole(stationRole) || hasRole(pflegeRole);
  }, [hasRole, hasAnyRole]);

  const canAccessAdminCenter = useCallback((): boolean => {
    return hasRole('ADMIN');
  }, [hasRole]);

  const getVisibleStations = useCallback((): Station[] => {
    if (hasAnyRole(['ADMIN', 'MANAGER', 'INTAKE', 'arzt_allgemein'])) {
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
        isLoading,
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
