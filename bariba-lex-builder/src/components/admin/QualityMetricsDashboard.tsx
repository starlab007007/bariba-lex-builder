/**
 * Dashboard de Métriques de Qualité
 * 
 * Affiche les performances du système de traduction:
 * - Confiance moyenne, durée, coûts
 * - Distribution des méthodes utilisées
 * - Taux de succès
 * - Graphiques de tendances
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Activity, 
  TrendingUp, 
  Clock, 
  DollarSign, 
  Target,
  BarChart3,
  Download,
  RefreshCw
} from 'lucide-react';
import { performanceMetrics } from '@/services/PerformanceMetrics';
import { useToast } from '@/hooks/use-toast';

export default function QualityMetricsDashboard() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [metrics, setMetrics] = useState<any>(null);
  const [methodPerformance, setMethodPerformance] = useState<any>(null);

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    setIsLoading(true);
    try {
      // Charger les métriques historiques
      await performanceMetrics.loadHistoricalMetrics(1000);
      
      // Calculer les métriques
      const qualityMetrics = performanceMetrics.getQualityMetrics();
      const methodStats = performanceMetrics.getMethodPerformance();
      
      setMetrics(qualityMetrics);
      setMethodPerformance(methodStats);
    } catch (error) {
      console.error('Erreur chargement métriques:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les métriques",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportCSV = () => {
    try {
      const csv = performanceMetrics.exportToCSV();
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `metriques-traduction-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: "Export réussi",
        description: "Métriques exportées au format CSV"
      });
    } catch (error) {
      toast({
        title: "Erreur d'export",
        description: "Impossible d'exporter les métriques",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Métriques de Qualité</CardTitle>
          <CardDescription>Chargement des données...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!metrics) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Métriques de Qualité</CardTitle>
          <CardDescription>Aucune donnée disponible</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Effectuez des traductions pour commencer à collecter des métriques.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Métriques de Qualité</h2>
          <p className="text-muted-foreground">
            Performance et qualité du système de traduction
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadMetrics}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Exporter CSV
          </Button>
        </div>
      </div>

      {/* Cartes de métriques principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Confiance moyenne */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Confiance Moyenne
            </CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.averageConfidence}%</div>
            <Progress value={metrics.averageConfidence} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {metrics.averageConfidence >= 80 ? 'Excellent' : 
               metrics.averageConfidence >= 70 ? 'Bon' :
               metrics.averageConfidence >= 60 ? 'Acceptable' : 'À améliorer'}
            </p>
          </CardContent>
        </Card>

        {/* Durée moyenne */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Durée Moyenne
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.averageDuration}ms</div>
            <p className="text-xs text-muted-foreground mt-2">
              {metrics.averageDuration < 100 ? 'Très rapide' : 
               metrics.averageDuration < 500 ? 'Rapide' :
               metrics.averageDuration < 1000 ? 'Normal' : 'Lent'}
            </p>
          </CardContent>
        </Card>

        {/* Taux de succès */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Taux de Succès
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.successRate}%</div>
            <Progress value={metrics.successRate} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              Traductions avec confiance &gt; 70%
            </p>
          </CardContent>
        </Card>

        {/* Coût total */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Coût Total
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${metrics.totalCost}</div>
            <p className="text-xs text-muted-foreground mt-2">
              Crédits AI utilisés
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs pour détails */}
      <Tabs defaultValue="methods" className="space-y-4">
        <TabsList>
          <TabsTrigger value="methods">
            <BarChart3 className="h-4 w-4 mr-2" />
            Par Méthode
          </TabsTrigger>
          <TabsTrigger value="distribution">
            <Activity className="h-4 w-4 mr-2" />
            Distribution
          </TabsTrigger>
        </TabsList>

        {/* Performance par méthode */}
        <TabsContent value="methods" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance par Méthode</CardTitle>
              <CardDescription>
                Statistiques détaillées pour chaque méthode de traduction
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {methodPerformance && Object.entries(methodPerformance).map(([method, stats]: [string, any]) => (
                  <div key={method} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={
                          method === 'idiom' ? 'default' :
                          method === 'context' ? 'secondary' :
                          method === 'simplified' ? 'outline' : 'default'
                        }>
                          {method.toUpperCase()}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {stats.count} traductions
                        </span>
                      </div>
                      <span className="text-sm font-medium">
                        {stats.avgConfidence}% confiance
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Durée moy.</div>
                        <div className="font-medium">{stats.avgDuration}ms</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Succès</div>
                        <div className="font-medium">{stats.successRate}%</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Utilisations</div>
                        <div className="font-medium">{stats.count}</div>
                      </div>
                    </div>
                    <Progress value={stats.successRate} className="mt-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Distribution des méthodes */}
        <TabsContent value="distribution" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Distribution des Méthodes</CardTitle>
              <CardDescription>
                Répartition de l'utilisation de chaque méthode
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(metrics.methodDistribution).map(([method, count]: [string, any]) => {
                  const total = Object.values(metrics.methodDistribution).reduce((a: number, b: number) => (a as number) + (b as number), 0) as number;
                  const percentage = Math.round(((count as number) / total) * 100);
                  
                  return (
                    <div key={method}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium capitalize">{method}</span>
                        <span className="text-sm text-muted-foreground">
                          {count} ({percentage}%)
                        </span>
                      </div>
                      <Progress value={percentage} />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
