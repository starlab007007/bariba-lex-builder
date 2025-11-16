import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp, Database, Brain, Activity, Clock, Target } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

export default function ModelPerformanceDashboard() {
  // Fetch latest training context
  const { data: trainingContext } = useQuery({
    queryKey: ['latest-training-context'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_training_context')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch translation logs statistics
  const { data: translationStats } = useQuery({
    queryKey: ['translation-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('translation_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000);
      
      if (error) throw error;

      // Calculate stats
      const total = data.length;
      const avgConfidence = data.reduce((sum, log) => sum + (log.confidence_score || 0), 0) / total;
      const highQuality = data.filter(log => (log.confidence_score || 0) >= 70).length;
      
      // Group by language direction
      const frToBar = data.filter(log => log.source_language === 'french' && log.target_language === 'bariba').length;
      const barToFr = data.filter(log => log.source_language === 'bariba' && log.target_language === 'french').length;

      // Group by method
      const methodCounts: Record<string, number> = {};
      data.forEach(log => {
        const method = log.translation_method || 'unknown';
        methodCounts[method] = (methodCounts[method] || 0) + 1;
      });

      // Group by date for trend
      const dailyData: Record<string, number> = {};
      data.forEach(log => {
        const date = new Date(log.created_at).toLocaleDateString();
        dailyData[date] = (dailyData[date] || 0) + 1;
      });

      return {
        total,
        avgConfidence: Math.round(avgConfidence * 10) / 10,
        highQuality,
        successRate: Math.round((highQuality / total) * 100),
        frToBar,
        barToFr,
        methodCounts,
        dailyData: Object.entries(dailyData).map(([date, count]) => ({ date, count })).slice(-14)
      };
    }
  });

  // Fetch model test comparisons
  const { data: testComparisons } = useQuery({
    queryKey: ['model-test-comparisons'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('model_test_results')
        .select('*')
        .order('tested_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;

      // Calculate averages
      const withBoth = data.filter(d => d.local_translation && d.api_translation);
      const avgLocalTime = withBoth.reduce((sum, d) => sum + (d.local_duration_ms || 0), 0) / withBoth.length;
      const avgAPITime = withBoth.reduce((sum, d) => sum + (d.api_duration_ms || 0), 0) / withBoth.length;
      const avgLocalConf = withBoth.reduce((sum, d) => sum + (d.local_confidence || 0), 0) / withBoth.length;
      const avgAPIConf = withBoth.reduce((sum, d) => sum + (d.api_confidence || 0), 0) / withBoth.length;

      return {
        totalTests: data.length,
        avgLocalTime: Math.round(avgLocalTime),
        avgAPITime: Math.round(avgAPITime),
        avgLocalConf: Math.round(avgLocalConf),
        avgAPIConf: Math.round(avgAPIConf),
        comparisonData: withBoth.slice(0, 10).map(d => ({
          phrase: d.test_phrase.substring(0, 20) + '...',
          local: d.local_duration_ms,
          api: d.api_duration_ms
        }))
      };
    }
  });

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))'];

  return (
    <div className="space-y-6">
      {/* Model Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Version du Modèle</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{trainingContext?.model_version || 'N/A'}</div>
            <p className="text-xs text-muted-foreground">
              {trainingContext?.created_at && new Date(trainingContext.created_at).toLocaleDateString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Données d'Entraînement</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(trainingContext?.dictionary_count || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              + {(trainingContext?.phrases_count || 0).toLocaleString()} phrases
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Traductions Totales</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{translationStats?.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              Taux de succès: {translationStats?.successRate || 0}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Training Metrics */}
      {trainingContext?.metrics && (
        <Card>
          <CardHeader>
            <CardTitle>Métriques d'Entraînement</CardTitle>
            <CardDescription>Détails du dernier entraînement du modèle</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Entrées Dictionnaire</p>
                <p className="text-2xl font-bold">{trainingContext.dictionary_count.toLocaleString()}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Phrases Validées</p>
                <p className="text-2xl font-bold">{trainingContext.phrases_count.toLocaleString()}</p>
              </div>
              {typeof trainingContext.metrics === 'object' && trainingContext.metrics !== null && (
                <>
                  {(trainingContext.metrics as any).training_duration_ms && (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Durée Entraînement</p>
                      <p className="text-2xl font-bold">
                        {Math.round((trainingContext.metrics as any).training_duration_ms / 1000)}s
                      </p>
                    </div>
                  )}
                  {(trainingContext.metrics as any).patterns_identified && (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Patterns Identifiés</p>
                      <p className="text-2xl font-bold">{(trainingContext.metrics as any).patterns_identified}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Usage Statistics */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Évolution des Traductions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {translationStats?.dailyData && translationStats.dailyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={translationStats.dailyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))'
                    }}
                  />
                  <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Pas de données disponibles</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Répartition des Langues</CardTitle>
          </CardHeader>
          <CardContent>
            {translationStats && (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'FR → BAR', value: translationStats.frToBar },
                      { name: 'BAR → FR', value: translationStats.barToFr }
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="hsl(var(--primary))"
                    dataKey="value"
                  >
                    {[0, 1].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Model Comparison */}
      {testComparisons && testComparisons.totalTests > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Comparaison Modèle Local vs API
            </CardTitle>
            <CardDescription>Basé sur {testComparisons.totalTests} tests</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4 mb-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Temps Moyen Local</p>
                </div>
                <p className="text-2xl font-bold">{testComparisons.avgLocalTime}ms</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Temps Moyen API</p>
                </div>
                <p className="text-2xl font-bold">{testComparisons.avgAPITime}ms</p>
              </div>
              <div className="space-y-1">
                <Badge variant="outline">Local: {testComparisons.avgLocalConf}%</Badge>
                <p className="text-xs text-muted-foreground">Confiance moyenne</p>
              </div>
              <div className="space-y-1">
                <Badge variant="secondary">API: {testComparisons.avgAPIConf}%</Badge>
                <p className="text-xs text-muted-foreground">Confiance moyenne</p>
              </div>
            </div>

            {testComparisons.comparisonData.length > 0 && (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={testComparisons.comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="phrase" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis label={{ value: 'Temps (ms)', angle: -90, position: 'insideLeft' }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))'
                    }}
                  />
                  <Bar dataKey="local" fill="hsl(var(--primary))" name="Local" />
                  <Bar dataKey="api" fill="hsl(var(--secondary))" name="API" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quality Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Distribution de la Confiance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2">
            <div className="flex justify-between items-center">
              <span className="text-sm">Confiance Moyenne</span>
              <Badge variant="outline">{translationStats?.avgConfidence || 0}%</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Traductions Haute Qualité (≥70%)</span>
              <Badge>{translationStats?.highQuality || 0} / {translationStats?.total || 0}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Taux de Succès</span>
              <Badge variant="secondary">{translationStats?.successRate || 0}%</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
