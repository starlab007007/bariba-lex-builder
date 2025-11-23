/**
 * Visualisation et Édition des Données d'Entraînement
 * 
 * Affiche les données d'entraînement actuellement chargées dans le système
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
  Database, 
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

interface TrainingPhrase {
  id: string;
  french_text: string;
  bariba_text: string;
  source: string;
  quality_score: number | null;
  is_validated: boolean;
  created_at: string;
}

export default function TrainingDataViewer() {
  const { toast } = useToast();
  const [phrases, setPhrases] = useState<TrainingPhrase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPhrase, setSelectedPhrase] = useState<TrainingPhrase | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({ french: '', bariba: '' });
  
  // Filtres avancés
  const [filterValidated, setFilterValidated] = useState<string>('all');
  const [filterSource, setFilterSource] = useState<string>('all');
  const [filterQualityMin, setFilterQualityMin] = useState<number>(0);
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');

  useEffect(() => {
    loadTrainingData();
  }, []);

  const loadTrainingData = async () => {
    setIsLoading(true);
    try {
      const limit = systemConfig.get('databaseQueryLimit');
      const { data, error } = await supabase
        .from('training_phrases')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      setPhrases(data || []);
      console.log(`📚 ${data?.length || 0} phrases d'entraînement chargées`);
    } catch (error) {
      console.error('Erreur chargement données:', error);
      toast({
        title: "Erreur de chargement",
        description: "Impossible de charger les données d'entraînement",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredPhrases = phrases.filter(phrase => {
    // Filtre de recherche
    const matchesSearch = 
      phrase.french_text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      phrase.bariba_text.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Filtre validation
    const matchesValidated = 
      filterValidated === 'all' ||
      (filterValidated === 'validated' && phrase.is_validated) ||
      (filterValidated === 'unvalidated' && !phrase.is_validated);
    
    // Filtre source
    const matchesSource = 
      filterSource === 'all' ||
      phrase.source === filterSource;
    
    // Filtre qualité
    const matchesQuality = 
      !phrase.quality_score || phrase.quality_score >= filterQualityMin;
    
    // Filtre date
    const matchesDate = 
      !filterDateFrom ||
      new Date(phrase.created_at) >= new Date(filterDateFrom);
    
    return matchesSearch && matchesValidated && matchesSource && matchesQuality && matchesDate;
  });

  const handleEdit = (phrase: TrainingPhrase) => {
    setSelectedPhrase(phrase);
    setEditForm({
      french: phrase.french_text,
      bariba: phrase.bariba_text
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedPhrase) return;

    try {
      const { error } = await supabase
        .from('training_phrases')
        .update({
          french_text: editForm.french,
          bariba_text: editForm.bariba
        })
        .eq('id', selectedPhrase.id);

      if (error) throw error;

      toast({
        title: "Modifié",
        description: "Phrase mise à jour avec succès"
      });

      setIsEditDialogOpen(false);
      loadTrainingData();
    } catch (error) {
      console.error('Erreur mise à jour:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour la phrase",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette phrase d\'entraînement ?')) return;

    try {
      const { error } = await supabase
        .from('training_phrases')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Supprimé",
        description: "Phrase supprimée avec succès"
      });

      loadTrainingData();
    } catch (error) {
      console.error('Erreur suppression:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la phrase",
        variant: "destructive"
      });
    }
  };

  const handleExport = () => {
    const json = JSON.stringify(filteredPhrases, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `training-phrases-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Export réussi",
      description: `${filteredPhrases.length} phrases exportées`
    });
  };

  const resetFilters = () => {
    setFilterValidated('all');
    setFilterSource('all');
    setFilterQualityMin(0);
    setFilterDateFrom('');
    setSearchQuery('');
  };

  // Obtenir les sources uniques
  const uniqueSources = Array.from(new Set(phrases.map(p => p.source).filter(Boolean))) as string[];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Données d'Entraînement</CardTitle>
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
                <Database className="h-5 w-5" />
                Données d'Entraînement
              </CardTitle>
              <CardDescription>
                {phrases.length} phrases actuellement en base de données
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={loadTrainingData} variant="outline" size="sm">
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
              placeholder="Rechercher une phrase..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filtres avancés */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 border rounded-lg bg-muted/50">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filtres</span>
            </div>
            
            <Select value={filterValidated} onValueChange={setFilterValidated}>
              <SelectTrigger>
                <SelectValue placeholder="Validation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                <SelectItem value="validated">Validées</SelectItem>
                <SelectItem value="unvalidated">Non validées</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterSource} onValueChange={setFilterSource}>
              <SelectTrigger>
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes sources</SelectItem>
                {uniqueSources.map(source => (
                  <SelectItem key={source} value={source}>{source}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              type="number"
              placeholder="Qualité min (%)"
              value={filterQualityMin}
              onChange={(e) => setFilterQualityMin(Number(e.target.value))}
              min="0"
              max="100"
            />

            <div className="flex gap-2">
              <Input
                type="date"
                placeholder="Date depuis"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
              />
              <Button onClick={resetFilters} variant="ghost" size="sm">
                Reset
              </Button>
            </div>
          </div>

          {/* Résultats filtrés */}
          {filteredPhrases.length !== phrases.length && (
            <div className="text-sm text-muted-foreground">
              Affichage de {filteredPhrases.length} sur {phrases.length} phrases
            </div>
          )}

          {/* Statistiques */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="text-sm text-muted-foreground">Total</div>
              <div className="text-2xl font-bold">{phrases.length}</div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-sm text-muted-foreground">Validées</div>
              <div className="text-2xl font-bold">
                {phrases.filter(p => p.is_validated).length}
              </div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-sm text-muted-foreground">Score moyen</div>
              <div className="text-2xl font-bold">
                {Math.round(
                  phrases.reduce((sum, p) => sum + (p.quality_score || 0), 0) / phrases.length
                )}%
              </div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-sm text-muted-foreground">Sources</div>
              <div className="text-2xl font-bold">
                {new Set(phrases.map(p => p.source)).size}
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Français</TableHead>
                  <TableHead>Bariba</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Qualité</TableHead>
                  <TableHead>Validé</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPhrases.slice(0, 50).map((phrase) => (
                  <TableRow key={phrase.id}>
                    <TableCell className="max-w-xs truncate">
                      {phrase.french_text}
                    </TableCell>
                    <TableCell className="max-w-xs truncate font-bariba">
                      {phrase.bariba_text}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{phrase.source}</Badge>
                    </TableCell>
                    <TableCell>
                      {phrase.quality_score ? `${phrase.quality_score}%` : '-'}
                    </TableCell>
                    <TableCell>
                      {phrase.is_validated ? (
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
                          onClick={() => handleEdit(phrase)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(phrase.id)}
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

          {filteredPhrases.length > 50 && (
            <p className="text-sm text-muted-foreground text-center">
              Affichage de 50 sur {filteredPhrases.length} résultats
            </p>
          )}
        </CardContent>
      </Card>

      {/* Dialog d'édition */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier la phrase</DialogTitle>
            <DialogDescription>
              Modifiez la traduction français-bariba
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Français</Label>
              <Textarea
                value={editForm.french}
                onChange={(e) => setEditForm({ ...editForm, french: e.target.value })}
                rows={3}
              />
            </div>
            <div>
              <Label>Bariba</Label>
              <Textarea
                value={editForm.bariba}
                onChange={(e) => setEditForm({ ...editForm, bariba: e.target.value })}
                rows={3}
                className="font-bariba"
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
