import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useGamification } from '@/hooks/useGamification';
import { CheckCircle, XCircle, Loader2, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function BulkPhraseValidator() {
  const [selectedPhrases, setSelectedPhrases] = useState<Set<string>>(new Set());
  const [processing, setProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'validated' | 'unvalidated'>('unvalidated');
  const { toast } = useToast();
  const { updateAchievement } = useGamification();

  // Get total count of unvalidated phrases
  const { data: totalUnvalidated } = useQuery({
    queryKey: ['total-unvalidated-phrases'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('training_phrases')
        .select('*', { count: 'exact', head: true })
        .eq('is_validated', false);
      
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: phrases, isLoading, refetch } = useQuery({
    queryKey: ['phrases-for-validation', searchQuery, filterStatus],
    queryFn: async () => {
      let query = supabase
        .from('training_phrases')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (filterStatus === 'validated') {
        query = query.eq('is_validated', true);
      } else if (filterStatus === 'unvalidated') {
        query = query.eq('is_validated', false);
      }

      if (searchQuery) {
        query = query.or(`french_text.ilike.%${searchQuery}%,bariba_text.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const togglePhrase = (phraseId: string) => {
    const newSelected = new Set(selectedPhrases);
    if (newSelected.has(phraseId)) {
      newSelected.delete(phraseId);
    } else {
      newSelected.add(phraseId);
    }
    setSelectedPhrases(newSelected);
  };

  const selectAll = () => {
    if (phrases) {
      setSelectedPhrases(new Set(phrases.map(p => p.id)));
    }
  };

  const selectBatch = () => {
    if (phrases) {
      // Select up to 50 phrases
      const batch = phrases.slice(0, 50);
      setSelectedPhrases(new Set(batch.map(p => p.id)));
    }
  };

  const deselectAll = () => {
    setSelectedPhrases(new Set());
  };

  const handleValidateAll = async () => {
    if (!totalUnvalidated || totalUnvalidated === 0) {
      toast({
        title: 'Aucune phrase à valider',
        description: 'Toutes les phrases sont déjà validées',
      });
      return;
    }

    if (!confirm(`Êtes-vous sûr de vouloir valider TOUTES les ${totalUnvalidated} phrases non validées ? Cette action peut prendre du temps.`)) {
      return;
    }

    setProcessing(true);

    try {
      // Validate all unvalidated phrases in batches
      const BATCH_SIZE = 500;
      let totalValidated = 0;

      // Get all unvalidated phrase IDs
      const { data: allUnvalidated, error: fetchError } = await supabase
        .from('training_phrases')
        .select('id')
        .eq('is_validated', false);

      if (fetchError) throw fetchError;

      const phraseIds = allUnvalidated?.map(p => p.id) || [];

      // Process in batches
      for (let i = 0; i < phraseIds.length; i += BATCH_SIZE) {
        const batch = phraseIds.slice(i, i + BATCH_SIZE);
        
        const { error } = await supabase
          .from('training_phrases')
          .update({ is_validated: true })
          .in('id', batch);

        if (error) throw error;
        
        totalValidated += batch.length;
        
        // Show progress
        toast({
          title: 'Validation en cours...',
          description: `${totalValidated} / ${phraseIds.length} phrases validées`,
          duration: 1000,
        });

        // Pause to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Update gamification achievements
      await updateAchievement('phrases_validated', totalValidated);

      toast({
        title: '✅ Validation complète',
        description: `${totalValidated} phrases validées avec succès`,
        duration: 5000,
      });

      setSelectedPhrases(new Set());
      refetch();
    } catch (error: any) {
      console.error('Validate all error:', error);
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleBulkValidate = async (validate: boolean) => {
    if (selectedPhrases.size === 0) {
      toast({
        title: 'Aucune phrase sélectionnée',
        description: 'Veuillez sélectionner au moins une phrase',
        variant: 'destructive',
      });
      return;
    }

    setProcessing(true);

    try {
      const { error } = await supabase
        .from('training_phrases')
        .update({ is_validated: validate })
        .in('id', Array.from(selectedPhrases));

      if (error) throw error;

      // Update gamification achievements if validating
      if (validate) {
        await updateAchievement('phrases_validated', selectedPhrases.size);
      }

      toast({
        title: 'Mise à jour réussie',
        description: `${selectedPhrases.size} phrase(s) ${validate ? 'validée(s)' : 'invalidée(s)'}`,
      });

      setSelectedPhrases(new Set());
      refetch();
    } catch (error: any) {
      console.error('Bulk validation error:', error);
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedPhrases.size === 0) {
      toast({
        title: 'Aucune phrase sélectionnée',
        description: 'Veuillez sélectionner au moins une phrase',
        variant: 'destructive',
      });
      return;
    }

    if (!confirm(`Êtes-vous sûr de vouloir supprimer ${selectedPhrases.size} phrase(s) ?`)) {
      return;
    }

    setProcessing(true);

    try {
      const { error } = await supabase
        .from('training_phrases')
        .delete()
        .in('id', Array.from(selectedPhrases));

      if (error) throw error;

      toast({
        title: 'Suppression réussie',
        description: `${selectedPhrases.size} phrase(s) supprimée(s)`,
      });

      setSelectedPhrases(new Set());
      refetch();
    } catch (error: any) {
      console.error('Bulk delete error:', error);
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Validation en Masse</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              placeholder="Rechercher une phrase..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={filterStatus} onValueChange={(v: any) => setFilterStatus(v)}>
            <SelectTrigger className="w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              <SelectItem value="validated">Validées</SelectItem>
              <SelectItem value="unvalidated">Non validées</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Statistics Banner */}
        {totalUnvalidated !== undefined && totalUnvalidated > 0 && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-900 dark:text-yellow-200">
                  📊 {totalUnvalidated.toLocaleString()} phrases non validées
                </p>
                <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                  Vous pouvez valider tout en une fois ou par lots de 50
                </p>
              </div>
              <Button 
                onClick={handleValidateAll}
                disabled={processing}
                size="sm"
                className="bg-green-600 hover:bg-green-700"
              >
                {processing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                Valider TOUT ({totalUnvalidated})
              </Button>
            </div>
          </div>
        )}

        {/* Bulk Actions */}
        <div className="flex gap-2 items-center justify-between border-b pb-3">
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={selectAll} disabled={!phrases || phrases.length === 0}>
              Tout sélectionner (page)
            </Button>
            <Button variant="outline" size="sm" onClick={selectBatch} disabled={!phrases || phrases.length === 0}>
              Sélectionner 50
            </Button>
            <Button variant="outline" size="sm" onClick={deselectAll} disabled={selectedPhrases.size === 0}>
              Tout désélectionner
            </Button>
          </div>
          <span className="text-sm text-muted-foreground">
            {selectedPhrases.size} phrase(s) sélectionnée(s)
          </span>
        </div>

        {selectedPhrases.size > 0 && (
          <div className="flex gap-2 p-3 bg-accent/50 rounded-lg">
            <Button
              size="sm"
              onClick={() => handleBulkValidate(true)}
              disabled={processing}
              className="flex-1"
            >
              {processing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Valider
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkValidate(false)}
              disabled={processing}
              className="flex-1"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Invalider
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={processing}
            >
              Supprimer
            </Button>
          </div>
        )}

        {/* Phrases List */}
        <div className="space-y-2 max-h-[500px] overflow-y-auto">
          {isLoading ? (
            <div className="text-center py-8">Chargement...</div>
          ) : phrases && phrases.length > 0 ? (
            phrases.map((phrase) => (
              <div
                key={phrase.id}
                className={`flex items-start gap-3 p-3 border rounded-lg transition-colors cursor-pointer hover:bg-accent/50 ${
                  selectedPhrases.has(phrase.id) ? 'bg-accent border-primary' : ''
                }`}
                onClick={() => togglePhrase(phrase.id)}
              >
                <Checkbox
                  checked={selectedPhrases.has(phrase.id)}
                  onCheckedChange={() => togglePhrase(phrase.id)}
                  className="mt-1"
                />
                <div className="flex-1 space-y-1">
                  <div className="text-sm">
                    <span className="font-medium">FR:</span> {phrase.french_text}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <span className="font-medium">BR:</span> {phrase.bariba_text}
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    {phrase.is_validated ? (
                      <span className="text-green-600 flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Validée
                      </span>
                    ) : (
                      <span className="text-muted-foreground flex items-center gap-1">
                        <XCircle className="h-3 w-3" />
                        Non validée
                      </span>
                    )}
                    {phrase.quality_score && (
                      <span className="px-2 py-0.5 bg-primary/10 rounded">
                        Score: {(Number(phrase.quality_score) * 100).toFixed(0)}%
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Aucune phrase trouvée
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}