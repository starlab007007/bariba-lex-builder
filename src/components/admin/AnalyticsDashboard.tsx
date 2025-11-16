import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export default function AnalyticsDashboard() {
  const { data: translationStats } = useQuery({
    queryKey: ['translation-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('translation_logs')
        .select('created_at, confidence_score')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data;
    },
  });

  const { data: modelMetrics } = useQuery({
    queryKey: ['model-metrics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('model_performance')
        .select('*')
        .order('recorded_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
  });

  // Prepare chart data
  const safeTranslationStats = Array.isArray(translationStats) ? translationStats : [];
  
  const chartData = safeTranslationStats.slice(0, 20).reverse().map((log, index) => ({
    name: `T${index + 1}`,
    confidence: log.confidence_score || 0,
  }));

  const avgConfidence =
    safeTranslationStats.length > 0
      ? (
          safeTranslationStats.reduce(
            (sum, log) => sum + (log.confidence_score || 0),
            0
          ) / safeTranslationStats.length
        ).toFixed(2)
      : '0';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Analytics & Performance</h2>
        <p className="text-muted-foreground">
          Métriques et performances du modèle de traduction
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Confiance Moyenne
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgConfidence}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Total Traductions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {safeTranslationStats.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Métriques</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{modelMetrics?.length || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Scores de Confiance (20 dernières traductions)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="confidence"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Métriques du Modèle</CardTitle>
        </CardHeader>
        <CardContent>
          {modelMetrics && modelMetrics.length > 0 ? (
            <div className="space-y-4">
              {modelMetrics.slice(0, 10).map((metric) => (
                <div
                  key={metric.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <div className="font-medium">{metric.metric_name}</div>
                    <div className="text-sm text-muted-foreground">
                      Version: {metric.model_version}
                    </div>
                  </div>
                  <div className="text-xl font-bold">{metric.metric_value}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Aucune métrique disponible
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
