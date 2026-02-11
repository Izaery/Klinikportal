import React, { useState, useEffect, useCallback, Component, ErrorInfo, ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { UserPlus, Edit, Trash2, Eye, EyeOff, Shield, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { User, UserRole, ROLE_LABELS } from '@/types';
import { usersApi } from '@/lib/api-client';

// Error Boundary to catch render errors
class AdminErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('AdminCenterPage crashed:', error, info.componentStack);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 32, color: 'red' }}>
          <h2>Fehler in der Benutzerverwaltung</h2>
          <pre style={{ whiteSpace: 'pre-wrap', marginTop: 16 }}>
            {this.state.error?.message}
            {'\n\n'}
            {this.state.error?.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

const ALL_ROLES: UserRole[] = [
  'ADMIN', 'MANAGER', 'INTAKE', 'VOLL_VIEW', 
  'arzt_a', 'arzt_b', 'arzt_c', 'arzt_d',
  'pflege_a', 'pflege_b', 'pflege_c', 'pflege_d'
];

const AdminCenterPage: React.FC = () => {
  const { canAccessAdminCenter } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formDisplayName, setFormDisplayName] = useState('');
  const [formRoles, setFormRoles] = useState<UserRole[]>([]);
  const [showPassword, setShowPassword] = useState(false);

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      console.log('[AdminCenter] Loading users...');
      const { data, error } = await usersApi.getAll();
      console.log('[AdminCenter] API response:', { data, error });
      if (error) {
        toast.error('Fehler beim Laden der Benutzer: ' + error);
        return;
      }
      if (data) {
        const userList = Array.isArray(data) ? data : [];
        const mapped: User[] = userList.map((u: any) => {
          // pg driver may return roles as string "{ADMIN,MANAGER}" instead of array
          let roles: string[] = [];
          if (Array.isArray(u.roles)) {
            roles = u.roles;
          } else if (typeof u.roles === 'string') {
            // Parse PostgreSQL array notation "{ADMIN,MANAGER}"
            const cleaned = u.roles.replace(/^\{|\}$/g, '');
            roles = cleaned ? cleaned.split(',') : [];
          }
          return {
            id: u.id,
            username: u.username,
            displayName: u.display_name || u.displayName || u.username || 'Unbekannt',
            roles: roles as UserRole[],
            createdAt: u.created_at || u.createdAt || new Date().toISOString(),
          };
        });
        setUsers(mapped);
      }
    } catch {
      toast.error('Fehler beim Laden der Benutzer');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (canAccessAdminCenter()) {
      loadUsers();
    }
  }, [canAccessAdminCenter, loadUsers]);

  if (!canAccessAdminCenter()) {
    return <Navigate to="/dashboard" replace />;
  }

  const resetForm = () => {
    setFormUsername('');
    setFormPassword('');
    setFormDisplayName('');
    setFormRoles([]);
    setShowPassword(false);
  };

  const openCreateDialog = () => {
    resetForm();
    setEditingUser(null);
    setIsCreateDialogOpen(true);
  };

  const openEditDialog = (user: User) => {
    setFormUsername(user.username);
    setFormPassword('');
    setFormDisplayName(user.displayName);
    setFormRoles([...user.roles]);
    setEditingUser(user);
    setIsCreateDialogOpen(true);
  };

  const handleRoleToggle = (role: UserRole) => {
    setFormRoles(prev => 
      prev.includes(role) 
        ? prev.filter(r => r !== role)
        : [...prev, role]
    );
  };

  const handleSave = async () => {
    if (!formUsername.trim() || !formDisplayName.trim() || formRoles.length === 0) {
      toast.error('Bitte füllen Sie alle Pflichtfelder aus');
      return;
    }

    if (!editingUser && !formPassword.trim()) {
      toast.error('Passwort ist für neue Benutzer erforderlich');
      return;
    }

    setIsSaving(true);
    try {
      if (editingUser) {
        // Update roles
        const { error: rolesError } = await usersApi.updateRoles(editingUser.id, formRoles);
        if (rolesError) {
          toast.error('Fehler beim Aktualisieren der Rollen: ' + rolesError);
          return;
        }

        // Reset password if provided
        if (formPassword.trim()) {
          const { error: pwError } = await usersApi.resetPassword(editingUser.id, formPassword);
          if (pwError) {
            toast.error('Fehler beim Zurücksetzen des Passworts: ' + pwError);
            return;
          }
        }

        toast.success(`Benutzer "${formDisplayName}" wurde aktualisiert`);
      } else {
        // Create new user
        const { error } = await usersApi.create({
          username: formUsername.trim(),
          password: formPassword.trim(),
          displayName: formDisplayName.trim(),
          roles: formRoles,
        });

        if (error) {
          toast.error('Fehler beim Erstellen: ' + error);
          return;
        }

        toast.success(`Benutzer "${formDisplayName}" wurde erstellt`);
      }

      setIsCreateDialogOpen(false);
      resetForm();
      await loadUsers();
    } catch {
      toast.error('Ein unerwarteter Fehler ist aufgetreten');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!userToDelete) return;
    try {
      const { error } = await usersApi.delete(userToDelete.id);
      if (error) {
        toast.error('Fehler beim Löschen: ' + error);
        return;
      }
      toast.success(`Benutzer "${userToDelete.displayName}" wurde gelöscht`);
      setUserToDelete(null);
      await loadUsers();
    } catch {
      toast.error('Ein unerwarteter Fehler ist aufgetreten');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Admin-Center
          </h1>
          <p className="text-muted-foreground mt-1">Benutzerverwaltung</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadUsers} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Aktualisieren
          </Button>
          <Button onClick={openCreateDialog}>
            <UserPlus className="mr-2 h-4 w-4" />
            Neuer Benutzer
          </Button>
        </div>
      </div>

      {/* Users Table */}
      <div className="clinic-card">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
              Lade Benutzer...
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Keine Benutzer gefunden
            </div>
          ) : (
            <table className="clinic-table">
              <thead>
                <tr>
                  <th>Benutzername</th>
                  <th>Anzeigename</th>
                  <th>Rollen</th>
                  <th>Erstellt</th>
                  <th className="w-24">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id}>
                    <td className="font-mono text-sm">{user.username}</td>
                    <td className="font-medium">{user.displayName}</td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {user.roles.map(role => (
                          <Badge key={role} variant="secondary" className="text-xs">
                            {ROLE_LABELS[role]}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="text-muted-foreground">{formatDate(user.createdAt)}</td>
                    <td>
                      <div className="flex gap-2">
                        <Button 
                          size="icon" 
                          variant="ghost"
                          onClick={() => openEditDialog(user)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setUserToDelete(user)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingUser ? 'Benutzer bearbeiten' : 'Neuer Benutzer'}
            </DialogTitle>
            <DialogDescription>
              {editingUser 
                ? 'Bearbeiten Sie die Benutzerdaten. Lassen Sie das Passwort leer, um es nicht zu ändern.'
                : 'Erstellen Sie einen neuen Benutzer mit Zugangsdaten und Rollen.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="username">Benutzername *</Label>
              <Input
                id="username"
                value={formUsername}
                onChange={(e) => setFormUsername(e.target.value)}
                placeholder="z.B. mueller_a"
                disabled={!!editingUser}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">
                Passwort {editingUser ? '(leer lassen zum Beibehalten)' : '*'}
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  placeholder={editingUser ? 'Neues Passwort...' : 'Passwort eingeben'}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="displayName">Anzeigename *</Label>
              <Input
                id="displayName"
                value={formDisplayName}
                onChange={(e) => setFormDisplayName(e.target.value)}
                placeholder="z.B. Dr. Müller"
              />
            </div>

            <div className="space-y-2">
              <Label>Rollen *</Label>
              <div className="grid grid-cols-2 gap-2 p-3 rounded-lg border border-border">
                {ALL_ROLES.map(role => (
                  <div key={role} className="flex items-center space-x-2">
                    <Checkbox
                      id={`role-${role}`}
                      checked={formRoles.includes(role)}
                      onCheckedChange={() => handleRoleToggle(role)}
                    />
                    <Label htmlFor={`role-${role}`} className="text-sm font-normal cursor-pointer">
                      {ROLE_LABELS[role]}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Speichern...' : editingUser ? 'Speichern' : 'Erstellen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Benutzer löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchten Sie den Benutzer <strong>{userToDelete?.displayName}</strong> ({userToDelete?.username}) wirklich löschen? 
              Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminCenterPage;

// Wrapped export with error boundary
export const AdminCenterPageWithBoundary: React.FC = () => (
  <AdminErrorBoundary>
    <AdminCenterPage />
  </AdminErrorBoundary>
);
