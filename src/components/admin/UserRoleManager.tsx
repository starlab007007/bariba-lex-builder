import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Shield, ShieldOff, Loader2, Search, PenTool, Trash2, Ban, CheckCircle, Edit, Key, Phone, GraduationCap } from 'lucide-react';

interface UserData {
  id: string;
  email: string;
  phone: string | null;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  banned: boolean;
  roles: string[];
}

export default function UserRoleManager() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { toast } = useToast();

  // Dialogs
  const [deleteUser, setDeleteUser] = useState<UserData | null>(null);
  const [banUser, setBanUser] = useState<UserData | null>(null);
  const [editUser, setEditUser] = useState<UserData | null>(null);
  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [revokeInfo, setRevokeInfo] = useState<{ user: UserData; role: string } | null>(null);

  useEffect(() => { loadUsers(); }, []);

  const callAdmin = async (body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke('admin-users', { body });
    if (error) throw new Error(error.message || 'Erreur serveur');
    if (data?.error) throw new Error(data.error);
    return data;
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await callAdmin({ action: 'list' });
      setUsers(data.users || []);
    } catch (error: any) {
      console.error(error);
      toast({ title: 'Erreur', description: error.message || 'Impossible de charger les utilisateurs', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleGrantRole = async (userId: string, role: string) => {
    try {
      setActionLoading(userId);
      const { error } = await supabase.from('user_roles').insert({ user_id: userId, role: role as 'admin' | 'editor' | 'user' | 'teacher' });
      if (error) throw error;
      toast({ title: 'Succès', description: `Rôle ${role} attribué` });
      await loadUsers();
    } catch (error: any) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRevokeRole = async () => {
    if (!revokeInfo) return;
    try {
      setActionLoading(revokeInfo.user.id);
      const { error } = await supabase.from('user_roles').delete().eq('user_id', revokeInfo.user.id).eq('role', revokeInfo.role as 'admin' | 'editor' | 'user' | 'teacher');
      if (error) throw error;
      toast({ title: 'Succès', description: `Rôle ${revokeInfo.role} révoqué` });
      await loadUsers();
    } catch (error: any) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } finally {
      setActionLoading(null);
      setRevokeInfo(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteUser) return;
    try {
      setActionLoading(deleteUser.id);
      await callAdmin({ action: 'delete', userId: deleteUser.id });
      toast({ title: 'Utilisateur supprimé' });
      await loadUsers();
    } catch (error: any) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } finally {
      setActionLoading(null);
      setDeleteUser(null);
    }
  };

  const handleBanToggle = async () => {
    if (!banUser) return;
    try {
      setActionLoading(banUser.id);
      await callAdmin({ action: banUser.banned ? 'unban' : 'ban', userId: banUser.id });
      toast({ title: banUser.banned ? 'Utilisateur réactivé' : 'Utilisateur désactivé' });
      await loadUsers();
    } catch (error: any) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } finally {
      setActionLoading(null);
      setBanUser(null);
    }
  };

  const handleEdit = async () => {
    if (!editUser) return;
    try {
      setActionLoading(editUser.id);
      await callAdmin({ action: 'update', userId: editUser.id, userData: { display_name: editName, username: editUsername } });
      toast({ title: 'Profil mis à jour' });
      await loadUsers();
    } catch (error: any) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } finally {
      setActionLoading(null);
      setEditUser(null);
    }
  };

  const openEdit = (u: UserData) => {
    setEditUser(u);
    setEditName(u.display_name || '');
    setEditUsername(u.username || '');
  };

  const filtered = users.filter(u =>
    (u.display_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.phone || '').includes(search) ||
    (u.username || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Gestion des Utilisateurs</CardTitle>
          <CardDescription>{users.length} utilisateurs inscrits</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input placeholder="Rechercher par nom, email, téléphone..." value={search} onChange={e => setSearch(e.target.value)} className="flex-1" />
            <Button variant="outline" onClick={() => setSearch('')} disabled={!search}>
              <Search className="h-4 w-4" />
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead>Téléphone</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Inscrit le</TableHead>
                    <TableHead>Dernière connexion</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Aucun utilisateur trouvé</TableCell>
                    </TableRow>
                  ) : filtered.map(u => (
                    <TableRow key={u.id} className={u.banned ? 'opacity-50' : ''}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{u.display_name || 'Sans nom'}</p>
                          <p className="text-xs text-muted-foreground">{u.username ? `@${u.username}` : u.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {u.phone ? (
                          <span className="flex items-center gap-1 text-sm">
                            <Phone className="h-3 w-3" />
                            {u.phone}
                          </span>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {u.banned && <Badge variant="destructive">Désactivé</Badge>}
                          {u.roles.includes('admin') && <Badge variant="default" className="gap-1"><Shield className="h-3 w-3" />Admin</Badge>}
                          {u.roles.includes('editor') && <Badge variant="outline" className="gap-1 border-blue-300 text-blue-700 bg-blue-50"><PenTool className="h-3 w-3" />Éditeur</Badge>}
                          {u.roles.includes('teacher') && <Badge variant="outline" className="gap-1 border-emerald-300 text-emerald-700 bg-emerald-50"><GraduationCap className="h-3 w-3" />Enseignant</Badge>}
                          {!u.roles.includes('admin') && !u.roles.includes('editor') && !u.roles.includes('teacher') && !u.banned && <Badge variant="secondary">Utilisateur</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{new Date(u.created_at).toLocaleDateString('fr-FR')}</TableCell>
                      <TableCell className="text-sm">{u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString('fr-FR') : '-'}</TableCell>
                      <TableCell>
                        <div className="flex gap-1 justify-end flex-wrap">
                          <Button variant="ghost" size="icon" title="Modifier" onClick={() => openEdit(u)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          {/* Role toggles */}
                          {u.roles.includes('admin') ? (
                            <Button variant="ghost" size="icon" title="Révoquer admin" onClick={() => setRevokeInfo({ user: u, role: 'admin' })}>
                              <ShieldOff className="h-4 w-4 text-destructive" />
                            </Button>
                          ) : (
                            <Button variant="ghost" size="icon" title="Promouvoir admin" onClick={() => handleGrantRole(u.id, 'admin')} disabled={actionLoading === u.id}>
                              <Shield className="h-4 w-4" />
                            </Button>
                          )}
                          {u.roles.includes('teacher') ? (
                            <Button variant="ghost" size="icon" title="Révoquer enseignant" onClick={() => setRevokeInfo({ user: u, role: 'teacher' })}>
                              <GraduationCap className="h-4 w-4 text-destructive" />
                            </Button>
                          ) : (
                            <Button variant="ghost" size="icon" title="Attribuer rôle enseignant" onClick={() => handleGrantRole(u.id, 'teacher')} disabled={actionLoading === u.id}>
                              <GraduationCap className="h-4 w-4 text-emerald-600" />
                            </Button>
                          )}
                          {/* Ban/Unban */}
                          <Button variant="ghost" size="icon" title={u.banned ? 'Réactiver' : 'Désactiver'} onClick={() => setBanUser(u)}>
                            {u.banned ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Ban className="h-4 w-4 text-orange-500" />}
                          </Button>
                          {/* Delete */}
                          <Button variant="ghost" size="icon" title="Supprimer" onClick={() => setDeleteUser(u)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editUser} onOpenChange={open => !open && setEditUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier l'utilisateur</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nom d'affichage</label>
              <Input value={editName} onChange={e => setEditName(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Nom d'utilisateur</label>
              <Input value={editUsername} onChange={e => setEditUsername(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>Annuler</Button>
            <Button onClick={handleEdit} disabled={actionLoading === editUser?.id}>
              {actionLoading === editUser?.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteUser} onOpenChange={open => !open && setDeleteUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer l'utilisateur ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. L'utilisateur <span className="font-semibold">{deleteUser?.display_name || deleteUser?.email}</span> sera définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Ban Confirmation */}
      <AlertDialog open={!!banUser} onOpenChange={open => !open && setBanUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{banUser?.banned ? 'Réactiver' : 'Désactiver'} l'utilisateur ?</AlertDialogTitle>
            <AlertDialogDescription>
              {banUser?.banned 
                ? `${banUser.display_name || banUser.email} pourra à nouveau se connecter.`
                : `${banUser?.display_name || banUser?.email} ne pourra plus se connecter.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleBanToggle}>{banUser?.banned ? 'Réactiver' : 'Désactiver'}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Revoke Role Confirmation */}
      <AlertDialog open={!!revokeInfo} onOpenChange={open => !open && setRevokeInfo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Révoquer le rôle {revokeInfo?.role} ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le rôle <span className="font-semibold">{revokeInfo?.role}</span> sera retiré de <span className="font-semibold">{revokeInfo?.user.display_name || revokeInfo?.user.email}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleRevokeRole} className="bg-destructive text-destructive-foreground">Révoquer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
