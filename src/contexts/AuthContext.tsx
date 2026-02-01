import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { User, UserRole, Station, STATION_ROLES } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import type { Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  changePassword: (newPassword: string) => Promise<boolean>;
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
    'arzt_a', 'arzt_b', 'arzt_c', 'arzt_d',
    'pflege_a', 'pflege_b', 'pflege_c', 'pflege_d'
  ];
  return validRoles.includes(dbRole as UserRole) ? (dbRole as UserRole) : null;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);

  // Fetch user profile and roles
  const fetchUserData = useCallback(async (userId: string): Promise<User | null> => {
    try {
      // Fetch profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        return null;
      }

      if (!profile) {
        console.error('No profile found for user');
        return null;
      }

      // Fetch roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (rolesError) {
        console.error('Error fetching roles:', rolesError);
        return null;
      }

      const roles: UserRole[] = (rolesData || [])
        .map(r => mapDbRoleToUserRole(r.role))
        .filter((r): r is UserRole => r !== null);

      return {
        id: userId,
        username: profile.username,
        displayName: profile.display_name,
        roles,
        createdAt: profile.created_at,
      };
    } catch (error) {
      console.error('Error in fetchUserData:', error);
      return null;
    }
  }, []);

  // Initialize auth state
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchUserData(session.user.id).then(userData => {
          setUser(userData);
          setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      if (session?.user) {
        const userData = await fetchUserData(session.user.id);
        setUser(userData);
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchUserData]);

  const login = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Login error:', error);
        return { success: false, error: error.message };
      }

      if (data.user) {
        const userData = await fetchUserData(data.user.id);
        if (userData) {
          setUser(userData);
          return { success: true };
        }
        return { success: false, error: 'Benutzerprofil nicht gefunden' };
      }

      return { success: false, error: 'Anmeldung fehlgeschlagen' };
    } catch (error) {
      console.error('Login exception:', error);
      return { success: false, error: 'Ein unerwarteter Fehler ist aufgetreten' };
    }
  }, [fetchUserData]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  }, []);

  const changePassword = useCallback(async (newPassword: string): Promise<boolean> => {
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
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
        isAuthenticated: !!user && !!session,
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
