/**
 * Dashboard de monitoring en temps réel des traductions
 * Affiche les métriques de performance du système hybride
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { translationMonitoring, type MonitoringStats } from "@/services/TranslationMonitoringService";
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Activity, TrendingUp, Clock, Zap, AlertCircle, CheckCircle, RotateCcw } from "lucide-react";

const METHOD_COLORS: Record<string, string> = {
  idiom: '#10b981',      // Green (niveau 0)
  context: '#3b82f6',    // Blue (niveau 1-2)
  rag: '#8b5cf6',        // Purple (niveau 2.5)
  advanced: '#f59e0b',   // Orange (niveau 3)
  simplified: '#06b6d4', // Cyan (niveau 4)
  ai: '#ef4444',         // Red (niveau 5)
  fallback: '#6b7280'    // Gray (fallback)
};

const METHOD_LABELS: Record<string, string> = {
  idiom: 'Idiome',
  context: 'Cache/Contexte',
  rag: 'RAG Sémantique',
  advanced: 'SMT Engine',
  simplified: 'SimplifiedAI',
  ai: 'Lovable AI',
  fallback: 'Fallback'
};

const METHOD_LEVELS: Record<string, number> = {
  idiom: 0,
  context: 1,
  rag: 2,
  advanced: 3,
  simplified: 4,
  ai: 5,
  fallback: 6
};

export function TranslationMonitoringDashboard() {
  const [stats, setStats] = useState<MonitoringStats | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    // S'abonner aux changements de statistiques
    const unsubscribe = translationMonitoring.subscribe(setStats);
    
    return unsubscribe;
  }, []);

  // Auto-refresh toutes les 2 secondes si activé
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      setStats(translationMonitoring.getStats());
    }, 2000);
    
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const handleReset = () => {
    if (confirm('Réinitialiser toutes les métriques de monitoring ?')) {
      translationMonitoring.reset();
    }
  };

  if (!stats || stats.totalTranslations === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Monitoring Traductions</h2>
            <p className="text-muted-foreground">Aucune traduction enregistrée</p>
          </div>
        </div>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Activity className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">En attente de traductions...</p>
              <p className="text-sm text-muted-foreground mt-2">
                Effectuez des traductions pour voir les métriques en temps réel
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Préparer les données pour les graphiques
  const methodData = Object.entries(stats.byMethod)
    .sort((a, b) => METHOD_LEVELS[a[0]] - METHOD_LEVELS[b[0]])
    .map(([method, data]) => ({
      name: METHOD_LABELS[method] || method,
      count: data.count,
      percentage: data.percentage,
      avgConfidence: data.avgConfidence,
      avgDuration: data.avgDuration,
      color: METHOD_COLORS[method] || '#6b7280'
    }));

  const pieData = methodData.map(d => ({
    name: d.name,
    value: d.count,
    percentage: d.percentage
  }));

  // Calculer le score de qualité global
  const qualityScore = Math.round(
    (stats.avgConfidence * 0.6) + // 60% basé sur la confiance
    ((stats.avgDuration < 100 ? 100 : Math.max(0, 100 - (stats.avgDuration - 100) / 10)) * 0.4) // 40% basé sur la vitesse
  );

  // Déterminer si le système est optimal
  const smtPercentage = stats.byMethod['advanced']?.percentage || 0;
  const simplifiedPercentage = stats.byMethod['simplified']?.percentage || 0;
  const localPercentage = smtPercentage + simplifiedPercentage;
  const aiPercentage = stats.byMethod['ai']?.percentage || 0;
  
  const isOptimal = localPercentage >= 80 && aiPercentage <= 10;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Monitoring Traductions</h2>
          <p className="text-muted-foreground">
            {stats.totalTranslations} traductions • Mise à jour en temps réel
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <Activity className="h-4 w-4 mr-2" />
            {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
        </div>
      </div>

      {/* Statut du système */}
      <Card className={isOptimal ? 'border-green-500' : 'border-orange-500'}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isOptimal ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-500" />
                Système Optimal
              </>
            ) : (
              <>
                <AlertCircle className="h-5 w-5 text-orange-500" />
                Performance à Améliorer
              </>
            )}
          </CardTitle>
          <CardDescription>
            {isOptimal
              ? `${localPercentage}% des traductions utilisent SMT/SimplifiedAI (gratuit, rapide)`
              : `Seulement ${localPercentage}% via SMT/SimplifiedAI • ${aiPercentage}% via Lovable AI (coûteux)`
            }
          </CardDescription>
        </CardHeader>
      </Card>

      {/* KPIs principaux */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Traductions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTranslations}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Depuis le démarrage
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Confiance Moyenne</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgConfidence}%</div>
            <Progress value={stats.avgConfidence} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vitesse Moyenne</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgDuration}ms</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.avgDuration < 50 ? '⚡ Très rapide' : stats.avgDuration < 200 ? '✓ Rapide' : '⚠️ Lent'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Score Qualité</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{qualityScore}%</div>
            <Progress value={qualityScore} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Graphiques */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Répartition par méthode (Pie) */}
        <Card>
          <CardHeader>
            <CardTitle>Répartition par Niveau de Cascade</CardTitle>
            <CardDescription>Distribution des traductions par méthode</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name} (${percentage}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={methodData[index].color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Performance par méthode (Bar) */}
        <Card>
          <CardHeader>
            <CardTitle>Performance par Méthode</CardTitle>
            <CardDescription>Nombre de traductions et confiance moyenne</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={methodData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#3b82f6" name="Nombre" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Détails par méthode */}
      <Card>
        <CardHeader>
          <CardTitle>Détails par Méthode de Traduction</CardTitle>
          <CardDescription>Statistiques détaillées pour chaque niveau de la cascade</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {methodData.map((method) => (
              <div key={method.name} className="flex items-center gap-4 p-4 rounded-lg border">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge style={{ backgroundColor: method.color }}>
                      Niveau {METHOD_LEVELS[Object.keys(METHOD_LABELS).find(k => METHOD_LABELS[k] === method.name) || '']}
                    </Badge>
                    <span className="font-semibold">{method.name}</span>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Utilisations</p>
                      <p className="font-bold">{method.count}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Pourcentage</p>
                      <p className="font-bold">{method.percentage}%</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Confiance Moy.</p>
                      <p className="font-bold">{method.avgConfidence}%</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Vitesse Moy.</p>
                      <p className="font-bold">{method.avgDuration}ms</p>
                    </div>
                  </div>
                </div>
                
                <div className="w-32">
                  <Progress value={method.percentage} className="h-2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Dernières traductions */}
      <Card>
        <CardHeader>
          <CardTitle>10 Dernières Traductions</CardTitle>
          <CardDescription>Historique en temps réel (ordre chronologique inverse)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {stats.last10Translations.map((metric) => (
              <div key={metric.id} className="flex items-center gap-3 p-3 rounded-lg border text-sm">
                <Badge style={{ backgroundColor: METHOD_COLORS[metric.method] }}>
                  {METHOD_LABELS[metric.method]}
                </Badge>
                
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{metric.inputText}</p>
                  <p className="text-muted-foreground text-xs truncate">{metric.outputText}</p>
                </div>
                
                <div className="flex items-center gap-3 text-xs">
                  <div className="text-center">
                    <p className="text-muted-foreground">Confiance</p>
                    <p className="font-bold">{metric.confidence}%</p>
                  </div>
                  <div className="text-center">
                    <p className="text-muted-foreground">Durée</p>
                    <p className="font-bold">{metric.duration}ms</p>
                  </div>
                  <div className="text-center">
                    <p className="text-muted-foreground">Mots</p>
                    <p className="font-bold">{metric.wordCount}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
