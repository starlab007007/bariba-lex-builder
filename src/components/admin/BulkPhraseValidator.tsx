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

  const deselectAll = () => {
    setSelectedPhrases(new Set());
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

        {/* Bulk Actions */}
        <div className="flex gap-2 items-center justify-between border-b pb-3">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={selectAll} disabled={!phrases || phrases.length === 0}>
              Tout sélectionner
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