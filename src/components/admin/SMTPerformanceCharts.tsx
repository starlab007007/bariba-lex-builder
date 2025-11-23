/**
 * Graphiques de performance SMT avec tendances temporelles
 */
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Minus, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface PerformanceDataPoint {
  timestamp: string;
  bleu: number;
  speed: number;
  coverage: number;
  smtUsage: number;
}

interface SMTPerformanceChartsProps {
  performanceHistory: PerformanceDataPoint[];
  currentMetrics: {
    bleu: number;
    speed: number;
    coverage: number;
  };
}

export function SMTPerformanceCharts({ performanceHistory, currentMetrics }: SMTPerformanceChartsProps) {
  const calculateTrend = (data: PerformanceDataPoint[], key: keyof PerformanceDataPoint) => {
    if (data.length < 2) return 0;
    const recent = data.slice(-5);
    const avg = recent.reduce((sum, d) => sum + (d[key] as number), 0) / recent.length;
    const previous = data.slice(-10, -5);
    const prevAvg = previous.length > 0 
      ? previous.reduce((sum, d) => sum + (d[key] as number), 0) / previous.length
      : avg;
    return ((avg - prevAvg) / prevAvg) * 100;
  };

  const bleuTrend = calculateTrend(performanceHistory, 'bleu');
  const speedTrend = calculateTrend(performanceHistory, 'speed');
  const coverageTrend = calculateTrend(performanceHistory, 'coverage');

  const getTrendIcon = (trend: number) => {
    if (trend > 2) return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (trend < -2) return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-yellow-500" />;
  };

  const getTrendBadge = (trend: number) => {
    if (trend > 5) return <Badge className="bg-green-500/10 text-green-700">+{trend.toFixed(1)}%</Badge>;
    if (trend > 2) return <Badge className="bg-green-500/10 text-green-700">+{trend.toFixed(1)}%</Badge>;
    if (trend < -5) return <Badge className="bg-red-500/10 text-red-700">{trend.toFixed(1)}%</Badge>;
    if (trend < -2) return <Badge className="bg-red-500/10 text-red-700">{trend.toFixed(1)}%</Badge>;
    return <Badge className="bg-yellow-500/10 text-yellow-700">stable</Badge>;
  };

  const alerts = [];
  if (currentMetrics.bleu < 70) {
    alerts.push({ type: 'error', message: `Score BLEU faible (${currentMetrics.bleu}%). Importez plus de données premium.` });
  }
  if (currentMetrics.coverage < 85) {
    alerts.push({ type: 'warning', message: `Couverture faible (${currentMetrics.coverage}%). Enrichissez le corpus.` });
  }
  if (currentMetrics.speed > 150) {
    alerts.push({ type: 'warning', message: `Vitesse élevée (${currentMetrics.speed}ms). Optimisation recommandée.` });
  }

  return (
    <div className="space-y-6">
      {/* Alertes automatiques */}
      {alerts.map((alert, idx) => (
        <Alert key={idx} variant={alert.type === 'error' ? 'destructive' : 'default'}>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{alert.message}</AlertDescription>
        </Alert>
      ))}

      {/* Métriques principales avec tendances */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-muted-foreground">Score BLEU</h4>
            {getTrendIcon(bleuTrend)}
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-foreground">{currentMetrics.bleu}%</span>
            {getTrendBadge(bleuTrend)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Objectif: 75-85%
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-muted-foreground">Vitesse Moyenne</h4>
            {getTrendIcon(-speedTrend)} {/* Inversé car plus lent = pire */}
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-foreground">{currentMetrics.speed}ms</span>
            {getTrendBadge(-speedTrend)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Objectif: 40-120ms
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-muted-foreground">Couverture</h4>
            {getTrendIcon(coverageTrend)}
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-foreground">{currentMetrics.coverage}%</span>
            {getTrendBadge(coverageTrend)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Objectif: 92-96%
          </p>
        </Card>
      </div>

      {/* Graphique d'évolution BLEU */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 text-foreground">Évolution du Score BLEU</h3>
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={performanceHistory}>
            <defs>
              <linearGradient id="bleuGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="timestamp" 
              stroke="hsl(var(--muted-foreground))"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              domain={[0, 100]}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }}
            />
            <Area 
              type="monotone" 
              dataKey="bleu" 
              stroke="hsl(var(--primary))" 
              fillOpacity={1}
              fill="url(#bleuGradient)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      {/* Graphique vitesse et couverture */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 text-foreground">Vitesse & Couverture</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={performanceHistory}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="timestamp" 
              stroke="hsl(var(--muted-foreground))"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis 
              yAxisId="left"
              stroke="hsl(var(--muted-foreground))"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis 
              yAxisId="right" 
              orientation="right"
              stroke="hsl(var(--muted-foreground))"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }}
            />
            <Legend />
            <Line 
              yAxisId="left"
              type="monotone" 
              dataKey="speed" 
              stroke="hsl(var(--chart-2))" 
              strokeWidth={2}
              name="Vitesse (ms)"
            />
            <Line 
              yAxisId="right"
              type="monotone" 
              dataKey="coverage" 
              stroke="hsl(var(--chart-3))" 
              strokeWidth={2}
              name="Couverture (%)"
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Graphique utilisation SMT */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 text-foreground">Utilisation du SMT</h3>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={performanceHistory}>
            <defs>
              <linearGradient id="usageGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--chart-4))" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="hsl(var(--chart-4))" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="timestamp" 
              stroke="hsl(var(--muted-foreground))"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              domain={[0, 100]}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }}
            />
            <Area 
              type="monotone" 
              dataKey="smtUsage" 
              stroke="hsl(var(--chart-4))" 
              fillOpacity={1}
              fill="url(#usageGradient)"
              strokeWidth={2}
              name="Utilisation SMT (%)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
