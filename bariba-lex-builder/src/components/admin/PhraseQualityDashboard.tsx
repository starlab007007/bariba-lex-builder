import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Sparkles, AlertTriangle, CheckCircle, Lightbulb, Loader2 } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

export default function PhraseQualityDashboard() {
  const [analyzing, setAnalyzing] = useState(false);
  const { toast } = useToast();

  const { data: phrases, isLoading, refetch } = useQuery({
    queryKey: ['phrases-quality'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_phrases')
        .select('*')
        .order('quality_score', { ascending: true, nullsFirst: true })
        .limit(50);

      if (error) throw error;
      return data;
    },
  });

  const stats = phrases ? {
    total: phrases.length,
    withScore: phrases.filter(p => p.quality_score !== null).length,
    highQuality: phrases.filter(p => p.quality_score && p.quality_score >= 0.8).length,
    mediumQuality: phrases.filter(p => p.quality_score && p.quality_score >= 0.5 && p.quality_score < 0.8).length,
    lowQuality: phrases.filter(p => p.quality_score && p.quality_score < 0.5).length,
    avgScore: phrases.reduce((sum, p) => sum + (Number(p.quality_score) || 0), 0) / phrases.length,
  } : null;

  const handleAnalyze = async () => {
    setAnalyzing(true);

    try {
      const { data, error } = await supabase.functions.invoke('analyze-phrase-quality');

      if (error) throw error;

      toast({
        title: 'Analyse terminée',
        description: `${data.analyzed} phrase(s) analysée(s)`,
      });

      refetch();
    } catch (error: any) {
      console.error('Analysis error:', error);
      toast({
        title: 'Erreur d\'analyse',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const getQualityColor = (score: number | null) => {
    if (!score) return 'text-muted-foreground';
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.5) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getQualityLabel = (score: number | null) => {
    if (!score) return 'Non analysée';
    if (score >= 0.8) return 'Excellente';
    if (score >= 0.5) return 'Moyenne';
    return 'À améliorer';
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
            <p className="text-xs text-muted-foreground">phrases</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Excellentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats?.highQuality || 0}</div>
            <p className="text-xs text-muted-foreground">≥ 80%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Moyennes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats?.mediumQuality || 0}</div>
            <p className="text-xs text-muted-foreground">50-79%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">À améliorer</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats?.lowQuality || 0}</div>
            <p className="text-xs text-muted-foreground">&lt; 50%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Score Moyen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats ? (stats.avgScore * 100).toFixed(0) : 0}%</div>
            <Progress value={stats ? stats.avgScore * 100 : 0} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Analyze Button */}
      <Card>
        <CardHeader>
          <CardTitle>Analyse IA de la Qualité</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Utilisez l'IA pour analyser automatiquement la qualité de vos phrases d'entraînement.
            L'analyse évalue la grammaire, la cohérence et fournit des suggestions d'amélioration.
          </p>
          <Button
            onClick={handleAnalyze}
            disabled={analyzing || !phrases || phrases.length === 0}
            className="w-full"
          >
            {analyzing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analyse en cours...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Analyser la Qualité des Phrases
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Phrases List with Quality Details */}
      <Card>
        <CardHeader>
          <CardTitle>Détails par Phrase</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Chargement...</div>
          ) : phrases && phrases.length > 0 ? (
            <Accordion type="single" collapsible className="space-y-2">
              {phrases.map((phrase) => {
                const metadata = phrase.metadata as any;
                const issues = metadata?.issues || [];
                const suggestions = metadata?.suggestions || [];

                return (
                  <AccordionItem key={phrase.id} value={phrase.id}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center justify-between w-full pr-4">
                        <div className="flex-1 text-left">
                          <div className="text-sm font-medium truncate max-w-md">
                            {phrase.french_text}
                          </div>
                          <div className="text-xs text-muted-foreground truncate max-w-md">
                            {phrase.bariba_text}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {phrase.quality_score !== null ? (
                            <>
                              <Badge variant="outline" className={getQualityColor(phrase.quality_score)}>
                                {(Number(phrase.quality_score) * 100).toFixed(0)}%
                              </Badge>
                              <span className={`text-xs ${getQualityColor(phrase.quality_score)}`}>
                                {getQualityLabel(phrase.quality_score)}
                              </span>
                            </>
                          ) : (
                            <Badge variant="outline">Non analysée</Badge>
                          )}
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-3 pt-3">
                      {issues.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <AlertTriangle className="h-4 w-4 text-yellow-600" />
                            Problèmes détectés
                          </div>
                          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-6">
                            {issues.map((issue: string, idx: number) => (
                              <li key={idx}>{issue}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {suggestions.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <Lightbulb className="h-4 w-4 text-blue-600" />
                            Suggestions d'amélioration
                          </div>
                          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-6">
                            {suggestions.map((suggestion: string, idx: number) => (
                              <li key={idx}>{suggestion}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {issues.length === 0 && suggestions.length === 0 && phrase.quality_score !== null && (
                        <div className="flex items-center gap-2 text-sm text-green-600">
                          <CheckCircle className="h-4 w-4" />
                          Aucun problème détecté
                        </div>
                      )}

                      {phrase.quality_score === null && (
                        <div className="text-sm text-muted-foreground">
                          Cette phrase n'a pas encore été analysée. Cliquez sur "Analyser la Qualité" ci-dessus.
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Aucune phrase disponible
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}