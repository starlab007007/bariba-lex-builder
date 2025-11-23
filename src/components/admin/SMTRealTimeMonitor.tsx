/**
 * SMT Real-Time Monitor - Suivi en temps réel des performances
 */
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, TrendingUp, TrendingDown, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface RealtimeMetric {
  timestamp: string;
  bleu: number;
  speed: number;
  confidence: number;
  method: string;
}

interface Alert {
  type: 'warning' | 'error' | 'info';
  message: string;
  timestamp: string;
}

export function SMTRealTimeMonitor() {
  const [metrics, setMetrics] = useState<RealtimeMetric[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [currentStats, setCurrentStats] = useState({
    avgBleu: 0,
    avgSpeed: 0,
    avgConfidence: 0,
    totalTranslations: 0
  });

  useEffect(() => {
    // Initial load
    loadRecentTranslations();

    // Poll every 5 seconds for updates
    const interval = setInterval(loadRecentTranslations, 5000);

    return () => clearInterval(interval);
  }, []);

  const loadRecentTranslations = async () => {
    try {
      const { data, error } = await supabase
        .from('translation_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      if (data && data.length > 0) {
        // Transform to metrics
        const newMetrics: RealtimeMetric[] = data.map(log => ({
          timestamp: new Date(log.created_at || '').toLocaleTimeString(),
          bleu: log.confidence_score || 0,
          speed: log.duration_ms || 0,
          confidence: log.confidence_score || 0,
          method: log.translation_method || 'unknown'
        }));

        setMetrics(newMetrics.reverse()); // Show chronological order

        // Calculate current stats
        const avgBleu = data.reduce((sum, t) => sum + (t.confidence_score || 0), 0) / data.length;
        const avgSpeed = data.reduce((sum, t) => sum + (t.duration_ms || 0), 0) / data.length;
        const avgConfidence = avgBleu;

        setCurrentStats({
          avgBleu: Math.round(avgBleu * 100) / 100,
          avgSpeed: Math.round(avgSpeed),
          avgConfidence: Math.round(avgConfidence * 100) / 100,
          totalTranslations: data.length
        });

        // Generate alerts
        const newAlerts: Alert[] = [];
        
        if (avgBleu < 50) {
          newAlerts.push({
            type: 'error',
            message: `BLEU score bas: ${avgBleu.toFixed(1)}% (cible: >70%)`,
            timestamp: new Date().toISOString()
          });
        }

        if (avgSpeed > 200) {
          newAlerts.push({
            type: 'warning',
            message: `Vitesse lente: ${avgSpeed.toFixed(0)}ms (cible: <120ms)`,
            timestamp: new Date().toISOString()
          });
        }

        const smtUsage = data.filter(t => t.translation_method === 'smt').length / data.length;
        if (smtUsage < 0.85) {
          newAlerts.push({
            type: 'warning',
            message: `Faible utilisation SMT: ${(smtUsage * 100).toFixed(0)}% (cible: >85%)`,
            timestamp: new Date().toISOString()
          });
        }

        setAlerts(newAlerts);
      }
    } catch (error) {
      console.error("Erreur chargement métriques temps réel:", error);
    }
  };

  const getTrend = (current: number, target: number, higherIsBetter: boolean = true) => {
    const isGood = higherIsBetter ? current >= target : current <= target;
    return isGood ? (
      <TrendingUp className="w-4 h-4 text-green-500" />
    ) : (
      <TrendingDown className="w-4 h-4 text-red-500" />
    );
  };

  return (
    <div className="space-y-6">
      {/* Alerts */}
      {alerts.length > 0 && (
        <Card className="p-4 border-yellow-500/50 bg-yellow-500/10">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-foreground mb-2">Alertes Système</h4>
              <div className="space-y-1">
                {alerts.map((alert, idx) => (
                  <div key={idx} className="text-sm text-muted-foreground">
                    • {alert.message}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Current Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-muted-foreground">BLEU Score</div>
            {getTrend(currentStats.avgBleu, 70)}
          </div>
          <div className="text-2xl font-bold text-foreground">{currentStats.avgBleu.toFixed(1)}%</div>
          <div className="text-xs text-muted-foreground mt-1">Cible: &gt;70%</div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-muted-foreground">Vitesse</div>
            {getTrend(currentStats.avgSpeed, 120, false)}
          </div>
          <div className="text-2xl font-bold text-foreground">{currentStats.avgSpeed}ms</div>
          <div className="text-xs text-muted-foreground mt-1">Cible: &lt;120ms</div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-muted-foreground">Confiance</div>
            {getTrend(currentStats.avgConfidence, 80)}
          </div>
          <div className="text-2xl font-bold text-foreground">{currentStats.avgConfidence.toFixed(1)}%</div>
          <div className="text-xs text-muted-foreground mt-1">Cible: &gt;80%</div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-muted-foreground">Traductions</div>
            <Activity className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-foreground">{currentStats.totalTranslations}</div>
          <div className="text-xs text-muted-foreground mt-1">Dernières 100</div>
        </Card>
      </div>

      {/* Performance Chart */}
      <Card className="p-6">
        <h4 className="text-md font-semibold mb-4 text-foreground">Évolution en temps réel</h4>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={metrics.slice(-20)}> {/* Last 20 data points */}
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="timestamp" 
              stroke="hsl(var(--muted-foreground))"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }}
            />
            <Line 
              type="monotone" 
              dataKey="bleu" 
              stroke="hsl(var(--primary))" 
              name="BLEU Score"
              strokeWidth={2}
            />
            <Line 
              type="monotone" 
              dataKey="speed" 
              stroke="hsl(var(--accent))" 
              name="Vitesse (ms)"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Method Distribution */}
      <Card className="p-4">
        <h4 className="text-md font-semibold mb-3 text-foreground">Méthodes de traduction</h4>
        <div className="flex flex-wrap gap-2">
          {Array.from(new Set(metrics.map(m => m.method))).map(method => {
            const count = metrics.filter(m => m.method === method).length;
            const percentage = (count / metrics.length * 100).toFixed(0);
            return (
              <Badge key={method} variant="secondary">
                {method}: {percentage}%
              </Badge>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
