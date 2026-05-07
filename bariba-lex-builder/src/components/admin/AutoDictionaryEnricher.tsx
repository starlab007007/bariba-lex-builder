import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Sparkles, CheckCircle, Loader2, TrendingUp, Database, BookOpen, MessageSquare } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';

interface EnrichmentStats {
  total_entries: number;
  total_enrichments: number;
  by_type: {
    idiom_match: number;
    training_phrase: number;
    translation_feedback: number;
  };
  by_field: {
    examples: number;
    grammatical_notes: number;
    usage_context: number;
  };
  avg_confidence: number;
}

interface Enrichment {
  id: string;
  entry_id: string;
  enrichment_type: string;
  field_name: string;
  suggested_value: string;
  confidence_score: number;
  applied: boolean;
  created_at: string;
  entry?: {
    word: string;
    definition: string;
  };
}

export default function AutoDictionaryEnricher() {
  const { toast } = useToast();
  const [isEnriching, setIsEnriching] = useState(false);
  const [stats, setStats] = useState<EnrichmentStats | null>(null);
  const [enrichments, setEnrichments] = useState<Enrichment[]>([]);
  const [isLoadingEnrichments, setIsLoadingEnrichments] = useState(false);
  const [applyingIds, setApplyingIds] = useState<Set<string>>(new Set());

  const runEnrichment = async () => {
    setIsEnriching(true);
    try {
      const { data, error } = await supabase.functions.invoke('enrich-dictionary');

      if (error) throw error;

      setStats(data.stats);
      
      toast({
        title: "Enrichissement terminé !",
        description: `${data.enrichments_count} suggestions d'enrichissement ont été générées.`,
      });

      await loadEnrichments();
    } catch (error: any) {
      console.error('Error enriching dictionary:', error);
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de l'enrichissement du dictionnaire",
        variant: "destructive",
      });
    } finally {
      setIsEnriching(false);
    }
  };

  const loadEnrichments = async () => {
    setIsLoadingEnrichments(true);
    try {
      const { data, error } = await supabase
        .from('dictionary_enrichments')
        .select(`
          *,
          entry:dictionary_entries(word, definition)
        `)
        .eq('applied', false)
        .order('confidence_score', { ascending: false })
        .limit(100);

      if (error) throw error;

      setEnrichments(data || []);
    } catch (error: any) {
      console.error('Error loading enrichments:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors du chargement des enrichissements",
        variant: "destructive",
      });
    } finally {
      setIsLoadingEnrichments(false);
    }
  };

  const applyEnrichment = async (enrichment: Enrichment) => {
    setApplyingIds(prev => new Set(prev).add(enrichment.id));

    try {
      let updateData: any = {};
      
      if (enrichment.field_name === 'examples') {
        const parsed = JSON.parse(enrichment.suggested_value);
        const { data: entry } = await supabase
          .from('dictionary_entries')
          .select('example_bariba, example_francais')
          .eq('id', enrichment.entry_id)
          .single();

        if (entry) {
          updateData.example_bariba = [...(entry.example_bariba || []), parsed.bariba];
          updateData.example_francais = [...(entry.example_francais || []), parsed.french];
        }
      } else if (enrichment.field_name === 'grammatical_notes') {
        const { data: entry } = await supabase
          .from('dictionary_entries')
          .select('grammatical_notes')
          .eq('id', enrichment.entry_id)
          .single();

        const existing = entry?.grammatical_notes || '';
        updateData.grammatical_notes = existing 
          ? `${existing}. ${enrichment.suggested_value}`
          : enrichment.suggested_value;
      } else if (enrichment.field_name === 'usage_context') {
        const { data: entry } = await supabase
          .from('dictionary_entries')
          .select('usage_context')
          .eq('id', enrichment.entry_id)
          .single();

        const existing = entry?.usage_context || '';
        updateData.usage_context = existing 
          ? `${existing}. ${enrichment.suggested_value}`
          : enrichment.suggested_value;
      }

      const { error: updateError } = await supabase
        .from('dictionary_entries')
        .update(updateData)
        .eq('id', enrichment.entry_id);

      if (updateError) throw updateError;

      const { error: markError } = await supabase
        .from('dictionary_enrichments')
        .update({ applied: true })
        .eq('id', enrichment.id);

      if (markError) throw markError;

      toast({
        title: "Enrichissement appliqué",
        description: `L'entrée "${enrichment.entry?.word}" a été enrichie avec succès.`,
      });

      await loadEnrichments();
    } catch (error: any) {
      console.error('Error applying enrichment:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors de l'application de l'enrichissement",
        variant: "destructive",
      });
    } finally {
      setApplyingIds(prev => {
        const next = new Set(prev);
        next.delete(enrichment.id);
        return next;
      });
    }
  };

  const applyAllHighConfidence = async () => {
    const highConfidence = enrichments.filter(e => e.confidence_score >= 0.85);
    
    if (highConfidence.length === 0) {
      toast({
        title: "Aucun enrichissement",
        description: "Aucun enrichissement avec confiance >= 85% trouvé.",
      });
      return;
    }

    setIsEnriching(true);
    let appliedCount = 0;

    for (const enrichment of highConfidence) {
      try {
        await applyEnrichment(enrichment);
        appliedCount++;
      } catch (error) {
        console.error('Error applying enrichment:', error);
      }
    }

    setIsEnriching(false);
    toast({
      title: "Enrichissement en masse terminé",
      description: `${appliedCount} enrichissements appliqués avec succès.`,
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'idiom_match': return <BookOpen className="h-4 w-4" />;
      case 'training_phrase': return <Database className="h-4 w-4" />;
      case 'translation_feedback': return <MessageSquare className="h-4 w-4" />;
      default: return <Sparkles className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'idiom_match': return 'Expression idiomatique';
      case 'training_phrase': return 'Phrase d\'entraînement';
      case 'translation_feedback': return 'Feedback utilisateur';
      default: return type;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Enrichissement automatique du dictionnaire
              </CardTitle>
              <CardDescription>
                Améliore automatiquement la qualité du dictionnaire en utilisant les idiomes, phrases d'entraînement et feedback utilisateur
              </CardDescription>
            </div>
            <Button
              onClick={runEnrichment}
              disabled={isEnriching}
              size="lg"
            >
              {isEnriching ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyse en cours...
                </>
              ) : (
                <>
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Lancer l'enrichissement
                </>
              )}
            </Button>
          </div>
        </CardHeader>

        {stats && (
          <CardContent>
            <div className="space-y-4">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>{stats.total_enrichments}</strong> suggestions d'enrichissement générées pour <strong>{stats.total_entries}</strong> entrées (confiance moyenne: <strong>{(stats.avg_confidence * 100).toFixed(1)}%</strong>)
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Par type de source</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Idiomes</span>
                      <Badge variant="outline">{stats.by_type.idiom_match}</Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Phrases</span>
                      <Badge variant="outline">{stats.by_type.training_phrase}</Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Feedback</span>
                      <Badge variant="outline">{stats.by_type.translation_feedback}</Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Par champ enrichi</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Exemples</span>
                      <Badge variant="outline">{stats.by_field.examples}</Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Notes</span>
                      <Badge variant="outline">{stats.by_field.grammatical_notes}</Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Contexte</span>
                      <Badge variant="outline">{stats.by_field.usage_context}</Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Qualité</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Confiance moyenne</span>
                        <span className="font-bold">{(stats.avg_confidence * 100).toFixed(1)}%</span>
                      </div>
                      <Progress value={stats.avg_confidence * 100} className="h-2" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Enrichissements proposés</CardTitle>
            <div className="flex gap-2">
              <Button
                onClick={loadEnrichments}
                variant="outline"
                size="sm"
                disabled={isLoadingEnrichments}
              >
                {isLoadingEnrichments ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Actualiser'
                )}
              </Button>
              <Button
                onClick={applyAllHighConfidence}
                variant="default"
                size="sm"
                disabled={isEnriching}
              >
                Appliquer haute confiance (&gt;85%)
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            <div className="space-y-3">
              {enrichments.length === 0 ? (
                <Alert>
                  <AlertDescription>
                    Aucun enrichissement en attente. Lancez l'analyse pour générer des suggestions.
                  </AlertDescription>
                </Alert>
              ) : (
                enrichments.map((enrichment) => (
                  <Card key={enrichment.id} className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="flex items-center gap-1">
                              {getTypeIcon(enrichment.enrichment_type)}
                              {getTypeLabel(enrichment.enrichment_type)}
                            </Badge>
                            <Badge variant={enrichment.confidence_score >= 0.85 ? "default" : "secondary"}>
                              {(enrichment.confidence_score * 100).toFixed(0)}% confiance
                            </Badge>
                          </div>
                          <h4 className="font-semibold text-lg">
                            {enrichment.entry?.word}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {enrichment.entry?.definition}
                          </p>
                        </div>
                      </div>

                      <div className="bg-muted/50 p-3 rounded-md space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <span className="text-muted-foreground">Champ :</span>
                          <Badge variant="outline">{enrichment.field_name}</Badge>
                        </div>
                        <div className="text-sm">
                          <span className="font-medium">Valeur suggérée :</span>
                          <p className="mt-1 p-2 bg-background rounded border">
                            {enrichment.field_name === 'examples' 
                              ? (() => {
                                  try {
                                    const parsed = JSON.parse(enrichment.suggested_value);
                                    return (
                                      <>
                                        <div className="font-medium">{parsed.bariba}</div>
                                        <div className="text-muted-foreground">{parsed.french}</div>
                                      </>
                                    );
                                  } catch {
                                    return enrichment.suggested_value;
                                  }
                                })()
                              : enrichment.suggested_value
                            }
                          </p>
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <Button
                          onClick={() => applyEnrichment(enrichment)}
                          disabled={applyingIds.has(enrichment.id)}
                          size="sm"
                        >
                          {applyingIds.has(enrichment.id) ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Application...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Appliquer
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
