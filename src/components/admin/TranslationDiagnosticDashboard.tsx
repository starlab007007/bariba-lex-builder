/**
 * Tableau de bord de diagnostic des traductions en temps réel
 * Affiche les métriques de performance et les modèles utilisés
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { Activity, Clock, DollarSign, Zap, TrendingUp, CheckCircle } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface TranslationLog {
  id: string;
  input_text: string;
  output_text: string;
  source_language: string;
  target_language: string;
  confidence_score: number;
  model_version: string;
  translation_method: string;
  duration_ms: number;
  created_at: string;
}

const COLORS = {
  idiom: '#10b981',
  context: '#3b82f6',
  rag: '#8b5cf6',
  simplified: '#f59e0b',
  advanced: '#06b6d4',
  ai: '#ef4444',
  fallback: '#6b7280'
};

export function TranslationDiagnosticDashboard() {
  const [logs, setLogs] = useState<TranslationLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    loadLogs();

    if (autoRefresh) {
      const interval = setInterval(loadLogs, 5000); // Refresh every 5 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const loadLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('translation_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setLogs(data || []);
    } catch (error: any) {
      console.error("Erreur lors du chargement des logs:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Statistiques globales
  const stats = {
    total: logs.length,
    avgConfidence: logs.length > 0 ? logs.reduce((sum, log) => sum + (log.confidence_score || 0), 0) / logs.length : 0,
    avgDuration: logs.length > 0 ? logs.reduce((sum, log) => sum + (log.duration_ms || 0), 0) / logs.length : 0,
    totalCost: 0, // Tous les modèles sont gratuits
    byMethod: logs.reduce((acc: any, log) => {
      const method = log.model_version || 'unknown';
      acc[method] = (acc[method] || 0) + 1;
      return acc;
    }, {})
  };

  // Données pour les graphiques
  const methodDistribution = Object.entries(stats.byMethod).map(([name, value]) => ({
    name,
    value: value as number
  }));

  const confidenceOverTime = logs.slice(0, 20).reverse().map((log, index) => ({
    index: index + 1,
    confidence: log.confidence_score || 0,
    method: log.model_version || 'unknown'
  }));

  const durationByMethod = Object.entries(
    logs.reduce((acc: any, log) => {
      const method = log.model_version || 'unknown';
      if (!acc[method]) {
        acc[method] = { total: 0, count: 0 };
      }
      acc[method].total += log.duration_ms || 0;
      acc[method].count += 1;
      return acc;
    }, {})
  ).map(([name, data]: [string, any]) => ({
    name,
    avgDuration: Math.round(data.total / data.count)
  }));

  return (
    <div className="space-y-6">
      {/* En-tête avec statistiques globales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Traductions Totales</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Dernières 100 traductions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Confiance Moyenne</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgConfidence.toFixed(1)}%</div>
            <Progress value={stats.avgConfidence} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Durée Moyenne</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgDuration.toFixed(0)}ms</div>
            <p className="text-xs text-muted-foreground">
              {stats.avgDuration < 100 ? '⚡ Très rapide' : stats.avgDuration < 500 ? '✓ Rapide' : '⏱ Moyen'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Coût Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">0€</div>
            <p className="text-xs text-muted-foreground">100% gratuit</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="realtime" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="realtime">Temps Réel</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="distribution">Distribution</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            <Badge variant={autoRefresh ? "default" : "outline"} className="cursor-pointer" onClick={() => setAutoRefresh(!autoRefresh)}>
              {autoRefresh ? "🔄 Auto-refresh ON" : "⏸ Auto-refresh OFF"}
            </Badge>
          </div>
        </div>

        <TabsContent value="realtime" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Traductions Récentes</CardTitle>
              <CardDescription>
                Les 20 dernières traductions effectuées (rafraîchissement auto: {autoRefresh ? 'activé' : 'désactivé'})
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {logs.slice(0, 20).map((log) => (
                  <div key={log.id} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge style={{ backgroundColor: COLORS[log.model_version as keyof typeof COLORS] || COLORS.fallback }}>
                          {log.model_version || 'unknown'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {log.source_language} → {log.target_language}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(log.created_at).toLocaleTimeString('fr-FR')}
                        </span>
                      </div>
                      <div className="text-sm">
                        <span className="font-medium">Entrée:</span> {log.input_text}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <span className="font-medium">Sortie:</span> {log.output_text}
                      </div>
                      <div className="flex items-center gap-4 text-xs">
                        <span className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          {log.confidence_score?.toFixed(1)}%
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {log.duration_ms || 0}ms
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Évolution de la Confiance</CardTitle>
              <CardDescription>Confiance des 20 dernières traductions</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={confidenceOverTime}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="index" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="confidence" stroke="#10b981" strokeWidth={2} name="Confiance (%)" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Durée Moyenne par Méthode</CardTitle>
              <CardDescription>Performance de chaque modèle de traduction</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={durationByMethod}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="avgDuration" fill="#3b82f6" name="Durée moyenne (ms)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distribution" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Distribution des Méthodes de Traduction</CardTitle>
              <CardDescription>Utilisation de chaque modèle dans le système hybride</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={methodDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {methodDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[entry.name as keyof typeof COLORS] || COLORS.fallback} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            {methodDistribution.map((method) => {
              const percentage = (method.value / stats.total) * 100;
              return (
                <Card key={method.name}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium capitalize">{method.name}</CardTitle>
                      <Badge style={{ backgroundColor: COLORS[method.name as keyof typeof COLORS] || COLORS.fallback }}>
                        {method.value}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Progress value={percentage} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-2">{percentage.toFixed(1)}% des traductions</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
