import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Brain, Database, TrendingUp, AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function TrainingAnalytics() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['training-analytics'],
    queryFn: async () => {
      const [
        { count: dictionaryCount },
        { count: phrasesCount },
        { count: validatedPhrasesCount },
        { data: recentTranslations },
        { data: lowQualityEntries },
        { data: trainingHistory },
      ] = await Promise.all([
        supabase.from('dictionary_entries').select('*', { count: 'exact', head: true }),
        supabase.from('training_phrases').select('*', { count: 'exact', head: true }),
        supabase.from('training_phrases').select('*', { count: 'exact', head: true }).eq('is_validated', true),
        supabase
          .from('translation_logs')
          .select('confidence_score, created_at')
          .order('created_at', { ascending: false })
          .limit(100),
        supabase
          .from('dictionary_entries')
          .select('word, quality_score, is_verified')
          .lt('quality_score', 0.6)
          .eq('is_verified', false)
          .limit(10),
        supabase
          .from('ai_training_context')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10),
      ]);

      const avgConfidence = recentTranslations && recentTranslations.length > 0
        ? recentTranslations.reduce((sum, t) => sum + (Number(t.confidence_score) || 0), 0) / recentTranslations.length
        : 0;

      const validationRate = phrasesCount && phrasesCount > 0 
        ? ((validatedPhrasesCount || 0) / phrasesCount) * 100 
        : 0;

      return {
        dictionaryCount: dictionaryCount || 0,
        phrasesCount: phrasesCount || 0,
        validatedPhrasesCount: validatedPhrasesCount || 0,
        validationRate,
        avgConfidence,
        lowQualityEntries: lowQualityEntries || [],
        trainingHistory: trainingHistory || [],
        recentTranslations: recentTranslations || [],
      };
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  const confidenceData = stats?.recentTranslations
    .slice(0, 20)
    .reverse()
    .map((t, i) => ({
      index: i + 1,
      confidence: Number(t.confidence_score) * 100,
    })) || [];

  const trainingHistoryData = stats?.trainingHistory.map((t) => ({
    date: new Date(t.created_at).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' }),
    dictionary: t.dictionary_count,
    phrases: t.phrases_count,
  })) || [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Entrées Dictionnaire</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.dictionaryCount}</div>
            <p className="text-xs text-muted-foreground">mots disponibles</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Phrases Validées</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.validatedPhrasesCount}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.validationRate.toFixed(1)}% du total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Confiance Moyenne</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(stats?.avgConfidence || 0).toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">sur 100 dernières traductions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Entrées à Améliorer</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.lowQualityEntries.length}</div>
            <p className="text-xs text-muted-foreground">qualité &lt; 60%</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Évolution des Entraînements</CardTitle>
          </CardHeader>
          <CardContent>
            {trainingHistoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={trainingHistoryData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="dictionary" stroke="hsl(var(--primary))" name="Dictionnaire" />
                  <Line type="monotone" dataKey="phrases" stroke="hsl(var(--secondary))" name="Phrases" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                Aucun historique d'entraînement disponible
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Score de Confiance (20 dernières)</CardTitle>
          </CardHeader>
          <CardContent>
            {confidenceData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={confidenceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="index" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Bar dataKey="confidence" fill="hsl(var(--primary))" name="Confiance %" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                Aucune traduction disponible
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Entrées à Améliorer</CardTitle>
        </CardHeader>
        <CardContent>
          {stats && stats.lowQualityEntries.length > 0 ? (
            <div className="space-y-2">
              {stats.lowQualityEntries.map((entry: any) => (
                <div key={entry.word} className="flex items-center justify-between p-2 border border-border rounded">
                  <span className="font-medium">{entry.word}</span>
                  <span className="text-sm text-muted-foreground">
                    Score : {(Number(entry.quality_score) * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aucune entrée nécessitant une amélioration
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}