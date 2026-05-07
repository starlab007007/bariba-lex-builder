/**
 * Gestionnaire d'expressions idiomatiques
 * Permet aux admins de gérer les 2000+ idiomes baatonum
 */

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Search, Edit2, Trash2, Check, X, CheckSquare, Square } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Idiom {
  id: string;
  french_expression: string;
  bariba_expression: string;
  category: string;
  usage_context?: string;
  is_verified: boolean;
  created_at: string;
}

const CATEGORIES = [
  'émotions',
  'météo',
  'vie et mort',
  'santé',
  'argent',
  'relations',
  'état d\'esprit',
  'compétences',
  'abandon',
  'vie quotidienne',
  'travail',
  'famille',
  'nature',
  'temps'
];

export function IdiomManager() {
  const [idioms, setIdioms] = useState<Idiom[]>([]);
  const [filteredIdioms, setFilteredIdioms] = useState<Idiom[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingIdiom, setEditingIdiom] = useState<Idiom | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    french_expression: '',
    bariba_expression: '',
    category: 'vie quotidienne',
    usage_context: '',
    is_verified: false
  });

  // Statistiques
  const [stats, setStats] = useState({
    total: 0,
    verified: 0,
    byCategory: {} as Record<string, number>
  });

  useEffect(() => {
    loadIdioms();
  }, []);

  useEffect(() => {
    filterIdioms();
  }, [idioms, searchQuery, selectedCategory]);

  const loadIdioms = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('idiomatic_expressions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setIdioms(data || []);
      calculateStats(data || []);
      toast.success(`${data?.length || 0} idiomes chargés`);
    } catch (error: any) {
      toast.error(`Erreur: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStats = (data: Idiom[]) => {
    const total = data.length;
    const verified = data.filter(i => i.is_verified).length;
    const byCategory: Record<string, number> = {};

    data.forEach(idiom => {
      byCategory[idiom.category] = (byCategory[idiom.category] || 0) + 1;
    });

    setStats({ total, verified, byCategory });
  };

  const filterIdioms = () => {
    let filtered = idioms;

    // Filtre par catégorie
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(i => i.category === selectedCategory);
    }

    // Filtre par recherche
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(i =>
        i.french_expression.toLowerCase().includes(query) ||
        i.bariba_expression.toLowerCase().includes(query)
      );
    }

    setFilteredIdioms(filtered);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingIdiom) {
        // Mise à jour
        const { error } = await supabase
          .from('idiomatic_expressions')
          .update(formData)
          .eq('id', editingIdiom.id);

        if (error) throw error;
        toast.success('Idiome mis à jour');
      } else {
        // Création
        const { error } = await supabase
          .from('idiomatic_expressions')
          .insert([formData]);

        if (error) throw error;
        toast.success('Idiome ajouté');
      }

      setIsDialogOpen(false);
      resetForm();
      loadIdioms();
    } catch (error: any) {
      toast.error(`Erreur: ${error.message}`);
    }
  };

  const handleEdit = (idiom: Idiom) => {
    setEditingIdiom(idiom);
    setFormData({
      french_expression: idiom.french_expression,
      bariba_expression: idiom.bariba_expression,
      category: idiom.category,
      usage_context: idiom.usage_context || '',
      is_verified: idiom.is_verified
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cet idiome ?')) return;

    try {
      const { error } = await supabase
        .from('idiomatic_expressions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Idiome supprimé');
      loadIdioms();
    } catch (error: any) {
      toast.error(`Erreur: ${error.message}`);
    }
  };

  const toggleVerification = async (idiom: Idiom) => {
    try {
      const { error } = await supabase
        .from('idiomatic_expressions')
        .update({ is_verified: !idiom.is_verified })
        .eq('id', idiom.id);

      if (error) throw error;
      toast.success(idiom.is_verified ? 'Marqué non vérifié' : 'Marqué vérifié');
      loadIdioms();
    } catch (error: any) {
      toast.error(`Erreur: ${error.message}`);
    }
  };

  const resetForm = () => {
    setEditingIdiom(null);
    setFormData({
      french_expression: '',
      bariba_expression: '',
      category: 'vie quotidienne',
      usage_context: '',
      is_verified: false
    });
  };

  const selectAllNA = () => {
    const naIdioms = filteredIdioms.filter(
      idiom => !idiom.bariba_expression || 
               idiom.bariba_expression.trim() === '' || 
               idiom.bariba_expression.toUpperCase() === 'N/A'
    );
    const naIds = new Set(naIdioms.map(i => i.id));
    setSelectedIds(naIds);
    toast.success(`${naIds.size} idiomes N/A sélectionnés`);
  };

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredIdioms.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredIdioms.map(i => i.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) {
      toast.error('Aucun idiome sélectionné');
      return;
    }

    try {
      const { error } = await supabase
        .from('idiomatic_expressions')
        .delete()
        .in('id', Array.from(selectedIds));

      if (error) throw error;
      
      toast.success(`${selectedIds.size} idiomes supprimés`);
      setSelectedIds(new Set());
      setShowDeleteAlert(false);
      loadIdioms();
    } catch (error: any) {
      toast.error(`Erreur: ${error.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* En-tête avec statistiques */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Idiomes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Vérifiés</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.verified}</div>
            <p className="text-xs text-muted-foreground">
              {stats.total > 0 ? Math.round((stats.verified / stats.total) * 100) : 0}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Catégories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Object.keys(stats.byCategory).length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Non vérifiés</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {stats.total - stats.verified}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtres et actions */}
      <Card>
        <CardHeader>
          <CardTitle>Gestion des Expressions Idiomatiques</CardTitle>
          <CardDescription>
            Gérez les {stats.total} expressions idiomatiques baatonum
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-4">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher une expression..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Catégorie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes catégories</SelectItem>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>
                      {cat} ({stats.byCategory[cat] || 0})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={resetForm}>
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter
                  </Button>
                </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingIdiom ? 'Modifier' : 'Ajouter'} un idiome
                  </DialogTitle>
                  <DialogDescription>
                    Renseignez les expressions françaises et baatonum
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Expression française</label>
                    <Input
                      required
                      value={formData.french_expression}
                      onChange={(e) => setFormData({ ...formData, french_expression: e.target.value })}
                      placeholder="Ex: avoir le cafard"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Expression baatonum</label>
                    <Input
                      required
                      value={formData.bariba_expression}
                      onChange={(e) => setFormData({ ...formData, bariba_expression: e.target.value })}
                      placeholder="Ex: nim kɛ mɔ kpɛm"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Catégorie</label>
                    <Select 
                      value={formData.category} 
                      onValueChange={(val) => setFormData({ ...formData, category: val })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Contexte d'usage (optionnel)</label>
                    <Textarea
                      value={formData.usage_context}
                      onChange={(e) => setFormData({ ...formData, usage_context: e.target.value })}
                      placeholder="Explication du contexte d'utilisation..."
                      rows={3}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.is_verified}
                      onChange={(e) => setFormData({ ...formData, is_verified: e.target.checked })}
                      className="h-4 w-4"
                    />
                    <label className="text-sm">Marquer comme vérifié</label>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Annuler
                    </Button>
                    <Button type="submit">
                      {editingIdiom ? 'Mettre à jour' : 'Ajouter'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

          {/* Actions en bloc */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
              <span className="text-sm font-medium">
                {selectedIds.size} idiome{selectedIds.size > 1 ? 's' : ''} sélectionné{selectedIds.size > 1 ? 's' : ''}
              </span>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteAlert(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Supprimer la sélection
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedIds(new Set())}
              >
                Désélectionner tout
              </Button>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={selectAllNA}
            >
              Sélectionner tous les N/A
            </Button>
          </div>

          {/* Table des idiomes */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={selectedIds.size === filteredIdioms.length && filteredIdioms.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Français</TableHead>
                  <TableHead>Baatonum</TableHead>
                  <TableHead>Catégorie</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      Chargement...
                    </TableCell>
                  </TableRow>
                ) : filteredIdioms.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Aucun idiome trouvé
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredIdioms.map((idiom) => {
                    const isNA = !idiom.bariba_expression || 
                                 idiom.bariba_expression.trim() === '' || 
                                 idiom.bariba_expression.toUpperCase() === 'N/A';
                    return (
                      <TableRow key={idiom.id} className={isNA ? 'bg-orange-50/50 dark:bg-orange-950/10' : ''}>
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.has(idiom.id)}
                            onCheckedChange={() => toggleSelection(idiom.id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{idiom.french_expression}</TableCell>
                        <TableCell>
                          {isNA ? (
                            <Badge variant="destructive" className="font-mono">N/A</Badge>
                          ) : (
                            idiom.bariba_expression
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{idiom.category}</Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => toggleVerification(idiom)}
                          >
                            {idiom.is_verified ? (
                              <Check className="h-4 w-4 text-green-600" />
                            ) : (
                              <X className="h-4 w-4 text-orange-600" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEdit(idiom)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(idiom.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <div className="text-sm text-muted-foreground">
            Affichage de {filteredIdioms.length} sur {stats.total} idiomes
          </div>
        </CardContent>
      </Card>

      {/* Dialog de confirmation de suppression en bloc */}
      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer {selectedIds.size} idiome{selectedIds.size > 1 ? 's' : ''} ?
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
