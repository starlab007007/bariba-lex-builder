/**
 * Visualisation et Édition des Données du Dictionnaire
 * 
 * Affiche les entrées du dictionnaire actuellement dans le système
 * Permet de les modifier, supprimer ou en ajouter
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  BookOpen, 
  Search, 
  Edit, 
  Trash2,
  Download,
  RefreshCw,
  Filter
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { systemConfig } from '@/services/SystemConfigService';

interface DictionaryEntry {
  id: string;
  word: string;
  definition: string;
  part_of_speech: string | null;
  phonetic: string | null;
  is_verified: boolean;
  quality_score: number | null;
  created_at: string;
  example_bariba: string[] | null;
  example_francais: string[] | null;
}

export default function DictionaryDataViewer() {
  const { toast } = useToast();
  const [entries, setEntries] = useState<DictionaryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEntry, setSelectedEntry] = useState<DictionaryEntry | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({ word: '', definition: '', phonetic: '' });
  
  // Filtres avancés
  const [filterVerified, setFilterVerified] = useState<string>('all');
  const [filterPOS, setFilterPOS] = useState<string>('all');
  const [filterQualityMin, setFilterQualityMin] = useState<number>(0);

  useEffect(() => {
    loadDictionaryData();
  }, []);

  const loadDictionaryData = async () => {
    setIsLoading(true);
    try {
      const limit = systemConfig.get('databaseQueryLimit');
      const { data, error } = await supabase
        .from('dictionary_entries')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      setEntries(data || []);
      console.log(`📚 ${data?.length || 0} entrées du dictionnaire chargées`);
    } catch (error) {
      console.error('Erreur chargement dictionnaire:', error);
      toast({
        title: "Erreur de chargement",
        description: "Impossible de charger les données du dictionnaire",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredEntries = entries.filter(entry => {
    // Filtre de recherche
    const matchesSearch = 
      entry.word.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.definition.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Filtre vérifié
    const matchesVerified = 
      filterVerified === 'all' ||
      (filterVerified === 'verified' && entry.is_verified) ||
      (filterVerified === 'unverified' && !entry.is_verified);
    
    // Filtre partie du discours
    const matchesPOS = 
      filterPOS === 'all' ||
      entry.part_of_speech === filterPOS;
    
    // Filtre qualité
    const matchesQuality = 
      !entry.quality_score || entry.quality_score >= filterQualityMin;
    
    return matchesSearch && matchesVerified && matchesPOS && matchesQuality;
  });

  const handleEdit = (entry: DictionaryEntry) => {
    setSelectedEntry(entry);
    setEditForm({
      word: entry.word,
      definition: entry.definition,
      phonetic: entry.phonetic || ''
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedEntry) return;

    try {
      const { error } = await supabase
        .from('dictionary_entries')
        .update({
          word: editForm.word,
          definition: editForm.definition,
          phonetic: editForm.phonetic || null
        })
        .eq('id', selectedEntry.id);

      if (error) throw error;

      toast({
        title: "Modifié",
        description: "Entrée mise à jour avec succès"
      });

      setIsEditDialogOpen(false);
      loadDictionaryData();
    } catch (error) {
      console.error('Erreur mise à jour:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour l'entrée",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette entrée du dictionnaire ?')) return;

    try {
      const { error } = await supabase
        .from('dictionary_entries')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Supprimé",
        description: "Entrée supprimée avec succès"
      });

      loadDictionaryData();
    } catch (error) {
      console.error('Erreur suppression:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'entrée",
        variant: "destructive"
      });
    }
  };

  const handleExport = () => {
    const json = JSON.stringify(entries, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dictionnaire-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Export réussi",
      description: `${entries.length} entrées exportées`
    });
  };

  const resetFilters = () => {
    setFilterVerified('all');
    setFilterPOS('all');
    setFilterQualityMin(0);
    setSearchQuery('');
  };

  // Obtenir les parties du discours uniques
  const uniquePOS = Array.from(new Set(entries.map(e => e.part_of_speech).filter(Boolean))) as string[];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Données du Dictionnaire</CardTitle>
          <CardDescription>Chargement...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-40 bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Données du Dictionnaire
              </CardTitle>
              <CardDescription>
                {entries.length} entrées actuellement en base de données
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={loadDictionaryData} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Actualiser
              </Button>
              <Button onClick={handleExport} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Exporter
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Recherche */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un mot ou une définition..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filtres avancés */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded-lg bg-muted/50">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filtres</span>
            </div>
            
            <Select value={filterVerified} onValueChange={setFilterVerified}>
              <SelectTrigger>
                <SelectValue placeholder="Vérification" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="verified">Vérifiés</SelectItem>
                <SelectItem value="unverified">Non vérifiés</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterPOS} onValueChange={setFilterPOS}>
              <SelectTrigger>
                <SelectValue placeholder="Catégorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes catégories</SelectItem>
                {uniquePOS.map(pos => (
                  <SelectItem key={pos} value={pos}>{pos}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  type="number"
                  placeholder="Qualité min"
                  value={filterQualityMin}
                  onChange={(e) => setFilterQualityMin(Number(e.target.value))}
                  min="0"
                  max="100"
                />
              </div>
              <Button onClick={resetFilters} variant="ghost" size="sm">
                Réinitialiser
              </Button>
            </div>
          </div>

          {/* Statistiques */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="text-sm text-muted-foreground">Total</div>
              <div className="text-2xl font-bold">{entries.length}</div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-sm text-muted-foreground">Vérifiées</div>
              <div className="text-2xl font-bold">
                {entries.filter(e => e.is_verified).length}
              </div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-sm text-muted-foreground">Score moyen</div>
              <div className="text-2xl font-bold">
                {Math.round(
                  entries.reduce((sum, e) => sum + (e.quality_score || 0), 0) / entries.length
                )}%
              </div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-sm text-muted-foreground">Catégories</div>
              <div className="text-2xl font-bold">
                {uniquePOS.length}
              </div>
            </div>
          </div>

          {/* Résultats filtrés */}
          {filteredEntries.length !== entries.length && (
            <div className="text-sm text-muted-foreground">
              Affichage de {filteredEntries.length} sur {entries.length} entrées
            </div>
          )}

          {/* Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mot Baatonum</TableHead>
                  <TableHead>Définition</TableHead>
                  <TableHead>Catégorie</TableHead>
                  <TableHead>Phonétique</TableHead>
                  <TableHead>Qualité</TableHead>
                  <TableHead>Vérifié</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntries.slice(0, 50).map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-bariba font-medium">
                      {entry.word}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {entry.definition}
                    </TableCell>
                    <TableCell>
                      {entry.part_of_speech && (
                        <Badge variant="outline">{entry.part_of_speech}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {entry.phonetic || '-'}
                    </TableCell>
                    <TableCell>
                      {entry.quality_score ? `${entry.quality_score}%` : '-'}
                    </TableCell>
                    <TableCell>
                      {entry.is_verified ? (
                        <Badge variant="default">Oui</Badge>
                      ) : (
                        <Badge variant="secondary">Non</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(entry)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(entry.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredEntries.length > 50 && (
            <p className="text-sm text-muted-foreground text-center">
              Affichage de 50 sur {filteredEntries.length} résultats
            </p>
          )}
        </CardContent>
      </Card>

      {/* Dialog d'édition */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier l'entrée</DialogTitle>
            <DialogDescription>
              Modifiez l'entrée du dictionnaire Baatonum-Français
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Mot Baatonum</Label>
              <Input
                value={editForm.word}
                onChange={(e) => setEditForm({ ...editForm, word: e.target.value })}
                className="font-bariba"
              />
            </div>
            <div>
              <Label>Définition Française</Label>
              <Textarea
                value={editForm.definition}
                onChange={(e) => setEditForm({ ...editForm, definition: e.target.value })}
                rows={3}
              />
            </div>
            <div>
              <Label>Phonétique</Label>
              <Input
                value={editForm.phonetic}
                onChange={(e) => setEditForm({ ...editForm, phonetic: e.target.value })}
                placeholder="Optionnel"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleSaveEdit}>
                Enregistrer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
