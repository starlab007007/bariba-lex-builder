import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Sparkles, Loader2, Target, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function AutoEnrichPanel() {
  const { toast } = useToast();
  const [isEnriching, setIsEnriching] = useState(false);
  const [targetWords, setTargetWords] = useState(30000);
  const [targetPhrases, setTargetPhrases] = useState(40000);
  const [currentStats, setCurrentStats] = useState<any>(null);
  const [enrichmentProgress, setEnrichmentProgress] = useState(0);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  const loadCurrentStats = async () => {
    setIsLoadingStats(true);
    try {
      const { count: wordCount } = await supabase
        .from('dictionary_entries')
        .select('*', { count: 'exact', head: true });

      const { count: phraseCount } = await supabase
        .from('training_phrases')
        .select('*', { count: 'exact', head: true });

      setCurrentStats({ words: wordCount || 0, phrases: phraseCount || 0 });
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsLoadingStats(false);
    }
  };

  const startEnrichment = async () => {
    setIsEnriching(true);
    setEnrichmentProgress(0);

    try {
      toast({
        title: 'Enrichissement démarré',
        description: 'L\'IA génère de nouvelles données d\'entraînement. Cela peut prendre plusieurs minutes.'
      });

      // Simuler la progression
      const progressInterval = setInterval(() => {
        setEnrichmentProgress(prev => Math.min(prev + 1, 95));
      }, 500);

      const { data, error } = await supabase.functions.invoke('enrich-training-data', {
        body: {
          targetWords,
          targetPhrases
        }
      });

      clearInterval(progressInterval);
      setEnrichmentProgress(100);

      if (error) throw error;

      if (data.error) {
        if (data.error.includes('429') || data.error.includes('rate limit')) {
          toast({
            title: 'Limite atteinte',
            description: 'Trop de requêtes. Veuillez réessayer dans quelques instants.',
            variant: 'destructive'
          });
        } else if (data.error.includes('402') || data.error.includes('credits')) {
          toast({
            title: 'Crédits insuffisants',
            description: 'Veuillez ajouter des crédits à votre espace Lovable AI.',
            variant: 'destructive'
          });
        } else {
          throw new Error(data.error);
        }
        return;
      }

      toast({
        title: 'Enrichissement terminé',
        description: `${data.generated.words} mots et ${data.generated.phrases} phrases générées par l'IA`
      });

      // Recharger les statistiques
      await loadCurrentStats();
    } catch (error: any) {
      console.error('Error enriching data:', error);
      toast({
        title: 'Erreur',
        description: error.message || 'Erreur lors de l\'enrichissement automatique',
        variant: 'destructive'
      });
    } finally {
      setIsEnriching(false);
      setEnrichmentProgress(0);
    }
  };

  const getProgressPercent = (current: number, target: number) => {
    return Math.min(100, Math.round((current / target) * 100));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Enrichissement Automatique par IA
          </CardTitle>
          <CardDescription>
            Générez automatiquement des milliers de mots et phrases d'entraînement avec l'IA
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Statistiques actuelles */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label>État actuel de la base de données</Label>
                <Button
                  onClick={loadCurrentStats}
                  disabled={isLoadingStats}
                  variant="outline"
                  size="sm"
                >
                  {isLoadingStats ? (
                    <>
                      <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                      Chargement...
                    </>
                  ) : (
                    'Actualiser'
                  )}
                </Button>
              </div>

              {currentStats && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="border-2">
                    <CardContent className="pt-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Mots</span>
                          <Badge variant="secondary">
                            {currentStats.words.toLocaleString()} / {targetWords.toLocaleString()}
                          </Badge>
                        </div>
                        <Progress value={getProgressPercent(currentStats.words, targetWords)} />
                        <p className="text-xs text-muted-foreground">
                          {getProgressPercent(currentStats.words, targetWords)}% de l'objectif
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-2">
                    <CardContent className="pt-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Phrases</span>
                          <Badge variant="secondary">
                            {currentStats.phrases.toLocaleString()} / {targetPhrases.toLocaleString()}
                          </Badge>
                        </div>
                        <Progress value={getProgressPercent(currentStats.phrases, targetPhrases)} />
                        <p className="text-xs text-muted-foreground">
                          {getProgressPercent(currentStats.phrases, targetPhrases)}% de l'objectif
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>

            {/* Configuration des objectifs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="targetWords" className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Objectif de mots
                </Label>
                <Input
                  id="targetWords"
                  type="number"
                  value={targetWords}
                  onChange={(e) => setTargetWords(parseInt(e.target.value) || 30000)}
                  min={1000}
                  step={1000}
                  disabled={isEnriching}
                />
                <p className="text-xs text-muted-foreground">
                  Nombre total de mots à atteindre dans le dictionnaire
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="targetPhrases" className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Objectif de phrases
                </Label>
                <Input
                  id="targetPhrases"
                  type="number"
                  value={targetPhrases}
                  onChange={(e) => setTargetPhrases(parseInt(e.target.value) || 40000)}
                  min={1000}
                  step={1000}
                  disabled={isEnriching}
                />
                <p className="text-xs text-muted-foreground">
                  Nombre total de phrases d'entraînement à atteindre
                </p>
              </div>
            </div>

            {/* Bouton d'enrichissement */}
            <Button
              onClick={startEnrichment}
              disabled={isEnriching || !currentStats}
              className="w-full"
              size="lg"
            >
              {isEnriching ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enrichissement en cours... {enrichmentProgress}%
                </>
              ) : (
                <>
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Lancer l'enrichissement automatique
                </>
              )}
            </Button>

            {isEnriching && (
              <div className="space-y-2">
                <Progress value={enrichmentProgress} />
                <p className="text-sm text-center text-muted-foreground">
                  L'IA génère de nouvelles données d'entraînement...
                </p>
              </div>
            )}

            {/* Informations */}
            <div className="mt-6 p-4 bg-muted/50 rounded-lg">
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Comment ça fonctionne ?
              </h4>
              <ul className="text-xs space-y-1 text-muted-foreground">
                <li>• L'IA analyse les données existantes du dictionnaire</li>
                <li>• Génère de nouvelles entrées de mots avec variations linguistiques</li>
                <li>• Crée des phrases d'entraînement naturelles et variées</li>
                <li>• Assure la cohérence grammaticale selon les règles du Baatɔnum</li>
                <li>• Les nouvelles données sont marquées comme non-vérifiées</li>
                <li>• Processus automatique qui peut prendre 10-20 minutes</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
