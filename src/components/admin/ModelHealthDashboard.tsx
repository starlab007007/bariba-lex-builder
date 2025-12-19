/**
 * Dashboard de santé des modèles actifs
 * ByT5 Expert, Bariba TTS, Bariba STT, Lovable AI
 */

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, CheckCircle, XCircle, AlertCircle, RefreshCw, ExternalLink } from "lucide-react";
import { modelHealthCheck, ModelHealthStatus } from "@/services/ModelHealthCheck";
import { supabase } from "@/integrations/supabase/client";

export const ModelHealthDashboard = () => {
  const [healthStatuses, setHealthStatuses] = useState<ModelHealthStatus[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [performanceMetrics, setPerformanceMetrics] = useState<any[]>([]);

  useEffect(() => {
    checkHealth();
    loadPerformanceMetrics();
  }, []);

  const checkHealth = async () => {
    setIsChecking(true);
    const statuses = await modelHealthCheck.checkAllModels();
    setHealthStatuses(statuses);
    setIsChecking(false);
  };

  const loadPerformanceMetrics = async () => {
    const { data } = await supabase
      .from('translation_logs')
      .select('translation_method, confidence_score, duration_ms')
      .order('created_at', { ascending: false })
      .limit(500);

    if (data) {
      const byMethod = data.reduce((acc: any, log: any) => {
        const method = log.translation_method || 'unknown';
        if (!acc[method]) {
          acc[method] = { count: 0, totalConfidence: 0, totalDuration: 0 };
        }
        acc[method].count++;
        acc[method].totalConfidence += log.confidence_score || 0;
        acc[method].totalDuration += log.duration_ms || 0;
        return acc;
      }, {});

      const metrics = Object.entries(byMethod).map(([method, stats]: [string, any]) => ({
        method,
        count: stats.count,
        avgConfidence: Math.round(stats.totalConfidence / stats.count),
        avgDuration: Math.round(stats.totalDuration / stats.count),
      }));

      setPerformanceMetrics(metrics);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'degraded': return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'offline': return <XCircle className="h-5 w-5 text-red-500" />;
      default: return <Activity className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'healthy': return 'default';
      case 'degraded': return 'secondary';
      case 'offline': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Santé des Modèles Actifs</h2>
        <Button onClick={checkHealth} disabled={isChecking} size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${isChecking ? 'animate-spin' : ''}`} />
          Vérifier
        </Button>
      </div>

      {/* Health Status Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {healthStatuses.map((status) => (
          <Card key={status.id} className="p-4">
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {getStatusIcon(status.status)}
                  <h3 className="font-semibold text-sm">{status.name}</h3>
                </div>
                <Badge variant={getStatusBadgeVariant(status.status) as any}>
                  {status.status}
                </Badge>
              </div>
              
              <div className="text-sm text-muted-foreground space-y-1">
                <div className="flex justify-between">
                  <span>Temps réponse:</span>
                  <span className="font-mono">{status.responseTime}ms</span>
                </div>
                <div className="flex justify-between">
                  <span>Dernière vérif:</span>
                  <span>{new Date(status.lastChecked).toLocaleTimeString()}</span>
                </div>
              </div>

              {status.endpoint && (
                <a 
                  href={status.endpoint.startsWith('http') ? status.endpoint : '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  {status.endpoint.includes('hf.space') ? 'HuggingFace Space' : 'Cloud Function'}
                </a>
              )}

              {status.error && (
                <div className="text-xs text-destructive bg-destructive/10 p-2 rounded">
                  {status.error}
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Performance Stats */}
      {performanceMetrics.length > 0 && (
        <Card className="p-6">
          <h3 className="text-xl font-bold mb-4">Statistiques de Performance</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-4">Méthode</th>
                  <th className="text-center py-2 px-4">Utilisations</th>
                  <th className="text-center py-2 px-4">Confiance Moy.</th>
                  <th className="text-center py-2 px-4">Durée Moy.</th>
                </tr>
              </thead>
              <tbody>
                {performanceMetrics.map((metric) => (
                  <tr key={metric.method} className="border-b hover:bg-muted/50">
                    <td className="py-2 px-4 font-medium">{metric.method}</td>
                    <td className="text-center py-2 px-4">{metric.count}</td>
                    <td className="text-center py-2 px-4">
                      <Badge variant={metric.avgConfidence >= 75 ? 'default' : 'secondary'}>
                        {metric.avgConfidence}%
                      </Badge>
                    </td>
                    <td className="text-center py-2 px-4">{metric.avgDuration}ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};
