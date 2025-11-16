import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { Shield, ShieldOff, Loader2, Search } from 'lucide-react';
import { z } from 'zod';

const emailSchema = z.string().trim().email({ message: "Email invalide" }).max(255);

interface UserWithRole {
  id: string;
  email: string;
  isAdmin: boolean;
  created_at: string;
}

export default function UserRoleManager() {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchEmail, setSearchEmail] = useState('');
  const [searchError, setSearchError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [showRevokeDialog, setShowRevokeDialog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      
      // Get all user roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Get all users from auth (admin only)
      const { data: { users: authUsers }, error: usersError } = await supabase.auth.admin.listUsers();

      if (usersError) throw usersError;

      // Combine data
      const usersWithRoles: UserWithRole[] = authUsers.map((user) => ({
        id: user.id,
        email: user.email || 'Email non disponible',
        isAdmin: rolesData?.some((role) => role.user_id === user.id && role.role === 'admin') || false,
        created_at: user.created_at,
      }));

      setUsers(usersWithRoles.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ));
    } catch (error: any) {
      console.error('Error loading users:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les utilisateurs',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const validateAndSearchEmail = () => {
    setSearchError('');
    
    try {
      emailSchema.parse(searchEmail);
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        setSearchError(error.errors[0].message);
      }
      return false;
    }
  };

  const handleGrantAdmin = async (userId: string, email: string) => {
    if (!validateAndSearchEmail() && searchEmail) return;

    try {
      setActionLoading(userId);

      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: 'admin' });

      if (error) throw error;

      toast({
        title: 'Succès',
        description: `Rôle admin attribué à ${email}`,
      });

      await loadUsers();
    } catch (error: any) {
      console.error('Error granting admin:', error);
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible d\'attribuer le rôle admin',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRevokeAdmin = async () => {
    if (!selectedUser) return;

    try {
      setActionLoading(selectedUser.id);

      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', selectedUser.id)
        .eq('role', 'admin');

      if (error) throw error;

      toast({
        title: 'Succès',
        description: `Rôle admin révoqué pour ${selectedUser.email}`,
      });

      await loadUsers();
    } catch (error: any) {
      console.error('Error revoking admin:', error);
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de révoquer le rôle admin',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
      setShowRevokeDialog(false);
      setSelectedUser(null);
    }
  };

  const openRevokeDialog = (user: UserWithRole) => {
    setSelectedUser(user);
    setShowRevokeDialog(true);
  };

  const filteredUsers = users.filter((user) =>
    user.email.toLowerCase().includes(searchEmail.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Gestion des Rôles Utilisateurs</CardTitle>
          <CardDescription>
            Attribuez ou révoquez les privilèges d'administrateur
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Bar */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  placeholder="Rechercher par email..."
                  value={searchEmail}
                  onChange={(e) => {
                    setSearchEmail(e.target.value);
                    setSearchError('');
                  }}
                  className={searchError ? 'border-destructive' : ''}
                />
                {searchError && (
                  <p className="text-sm text-destructive mt-1">{searchError}</p>
                )}
              </div>
              <Button
                variant="outline"
                onClick={() => setSearchEmail('')}
                disabled={!searchEmail}
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Users Table */}
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Date d'inscription</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        Aucun utilisateur trouvé
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.email}</TableCell>
                        <TableCell>
                          {user.isAdmin ? (
                            <Badge variant="default" className="gap-1">
                              <Shield className="h-3 w-3" />
                              Admin
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Utilisateur</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {new Date(user.created_at).toLocaleDateString('fr-FR')}
                        </TableCell>
                        <TableCell className="text-right">
                          {user.isAdmin ? (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => openRevokeDialog(user)}
                              disabled={actionLoading === user.id}
                            >
                              {actionLoading === user.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <ShieldOff className="mr-2 h-4 w-4" />
                                  Révoquer
                                </>
                              )}
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleGrantAdmin(user.id, user.email)}
                              disabled={actionLoading === user.id}
                            >
                              {actionLoading === user.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <Shield className="mr-2 h-4 w-4" />
                                  Attribuer Admin
                                </>
                              )}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Revoke Confirmation Dialog */}
      <AlertDialog open={showRevokeDialog} onOpenChange={setShowRevokeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la révocation</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir révoquer les privilèges d'administrateur pour{' '}
              <span className="font-semibold">{selectedUser?.email}</span> ?
              Cette action peut être annulée en réattribuant le rôle.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevokeAdmin}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Révoquer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
