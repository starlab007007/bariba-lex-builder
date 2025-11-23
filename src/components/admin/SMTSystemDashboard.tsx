import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { 
  Activity, 
  Database, 
  Zap, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Clock,
  TrendingUp,
  Layers,
  AlertCircle
} from "lucide-react";
import { smtInitializer } from "@/services/SMTInitializer";
import { statisticalEngine } from "@/services/StatisticalTranslationEngine";
import { enhancedCorrector } from "@/services/EnhancedGrammaticalCorrector";
import { translationCache } from "@/utils/TranslationCache";
import { trieIndex } from "@/utils/TrieIndex";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SystemStatus {
  smtInitialized: boolean;
  smtReady: boolean;
  correctorReady: boolean;
  trieReady: boolean;
  cacheActive: boolean;
  phrasesCount: number;
  dictionaryCount: number;
  initDuration: number;
}

interface TranslationLog {
  created_at: string;
  input_text: string;
  output_text: string;
  translation_method: string;
  confidence_score: number;
  duration_ms: number;
}

export function SMTSystemDashboard() {
  const { toast } = useToast();
  const [status, setStatus] = useState<SystemStatus>({
    smtInitialized: false,
    smtReady: false,
    correctorReady: false,
    trieReady: false,
    cacheActive: false,
    phrasesCount: 0,
    dictionaryCount: 0,
    initDuration: 0
  });
  const [recentTranslations, setRecentTranslations] = useState<TranslationLog[]>([]);
  const [isInitializing, setIsInitializing] = useState(false);
  const [metrics, setMetrics] = useState({
    totalTranslations: 0,
    avgSpeed: 0,
    cacheHitRate: 0,
    smtUsageRate: 0
  });

  useEffect(() => {
    loadSystemStatus();
    loadRecentTranslations();
    const interval = setInterval(() => {
      loadSystemStatus();
      loadRecentTranslations();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadSystemStatus = async () => {
    const initStatus = smtInitializer.getStatus();
    const cacheStats = translationCache.getStats();
    
    setStatus({
      smtInitialized: initStatus?.isInitialized || false,
      smtReady: statisticalEngine.isReady(),
      correctorReady: enhancedCorrector.isReady(),
      trieReady: trieIndex.getSize() > 0,
      cacheActive: cacheStats.size > 0,
      phrasesCount: initStatus?.phrasesCount || 0,
      dictionaryCount: initStatus?.dictionaryCount || 0,
      initDuration: initStatus?.duration || 0
    });

    setMetrics(prev => ({
      ...prev,
      cacheHitRate: cacheStats.hitRate
    }));
  };

  const loadRecentTranslations = async () => {
    const { data } = await supabase
      .from('translation_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (data) {
      setRecentTranslations(data);
      
      // Calculate metrics
      const total = data.length;
      const avgSpeed = data.reduce((sum, log) => sum + (log.duration_ms || 0), 0) / total;
      const smtCount = data.filter(log => 
        log.translation_method?.includes('statistical') || 
        log.translation_method?.includes('smt')
      ).length;

      setMetrics(prev => ({
        ...prev,
        totalTranslations: total,
        avgSpeed: Math.round(avgSpeed),
        smtUsageRate: Math.round((smtCount / total) * 100)
      }));
    }
  };

  const handleInitialize = async () => {
    setIsInitializing(true);
    try {
      toast({
        title: "🔄 Initialisation SMT",
        description: "Chargement des données en cours...",
      });

      await smtInitializer.initialize();
      
      toast({
        title: "✅ SMT Initialisé",
        description: "Le système est prêt pour la traduction",
      });

      await loadSystemStatus();
    } catch (error: any) {
      toast({
        title: "❌ Erreur d'initialisation",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsInitializing(false);
    }
  };

  const handleReinitialize = async () => {
    smtInitializer.reset();
    await handleInitialize();
  };

  const getStatusColor = (ready: boolean) => ready ? "text-green-500" : "text-red-500";
  const getStatusIcon = (ready: boolean) => ready ? CheckCircle2 : XCircle;

  return (
    <div className="space-y-6">
      {/* Header avec action */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Tableau de Bord SMT</h2>
          <p className="text-muted-foreground">
            Monitoring en temps réel du système de traduction statistique
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleInitialize}
            disabled={isInitializing || status.smtInitialized}
            variant={status.smtInitialized ? "outline" : "default"}
          >
            <Zap className="mr-2 h-4 w-4" />
            {status.smtInitialized ? "Déjà initialisé" : "Initialiser SMT"}
          </Button>
          {status.smtInitialized && (
            <Button onClick={handleReinitialize} variant="outline" disabled={isInitializing}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isInitializing ? 'animate-spin' : ''}`} />
              Réinitialiser
            </Button>
          )}
        </div>
      </div>

      {/* Alerte si pas initialisé */}
      {!status.smtInitialized && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Le système SMT n'est pas initialisé. Importez d'abord des données via l'onglet "Import SMT Premium", 
            puis cliquez sur "Initialiser SMT" pour activer le système.
          </AlertDescription>
        </Alert>
      )}

      {/* État des composants */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              {(() => {
                const Icon = getStatusIcon(status.smtReady);
                return <Icon className={`h-4 w-4 ${getStatusColor(status.smtReady)}`} />;
              })()}
              Moteur SMT
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={status.smtReady ? "default" : "secondary"}>
              {status.smtReady ? "Actif" : "Inactif"}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              {(() => {
                const Icon = getStatusIcon(status.correctorReady);
                return <Icon className={`h-4 w-4 ${getStatusColor(status.correctorReady)}`} />;
              })()}
              Correcteur
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={status.correctorReady ? "default" : "secondary"}>
              {status.correctorReady ? "Actif" : "Inactif"}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              {(() => {
                const Icon = getStatusIcon(status.trieReady);
                return <Icon className={`h-4 w-4 ${getStatusColor(status.trieReady)}`} />;
              })()}
              Index Trie
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={status.trieReady ? "default" : "secondary"}>
              {status.trieReady ? "Actif" : "Inactif"}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              {(() => {
                const Icon = getStatusIcon(status.cacheActive);
                return <Icon className={`h-4 w-4 ${getStatusColor(status.cacheActive)}`} />;
              })()}
              Cache
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={status.cacheActive ? "default" : "secondary"}>
              {status.cacheActive ? "Actif" : "Vide"}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Durée Init
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {(status.initDuration / 1000).toFixed(2)}s
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Données chargées */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Phrases d'Entraînement
            </CardTitle>
            <CardDescription>Paires FR-BBA chargées dans le moteur SMT</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-3xl font-bold">{status.phrasesCount.toLocaleString()}</span>
                <Badge variant={status.phrasesCount >= 10000 ? "default" : "secondary"}>
                  {status.phrasesCount >= 10000 ? "Premium" : "Insuffisant"}
                </Badge>
              </div>
              <Progress value={Math.min((status.phrasesCount / 10000) * 100, 100)} />
              <p className="text-xs text-muted-foreground">
                Minimum recommandé: 10,000 paires
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Entrées Dictionnaire
            </CardTitle>
            <CardDescription>Mots disponibles pour traduction directe</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-3xl font-bold">{status.dictionaryCount.toLocaleString()}</span>
                <Badge variant={status.dictionaryCount >= 1000 ? "default" : "secondary"}>
                  {status.dictionaryCount >= 1000 ? "Complet" : "Partiel"}
                </Badge>
              </div>
              <Progress value={Math.min((status.dictionaryCount / 10000) * 100, 100)} />
              <p className="text-xs text-muted-foreground">
                Recommandé: 10,000+ entrées
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Métriques de performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Métriques de Performance
          </CardTitle>
          <CardDescription>Statistiques des 10 dernières traductions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Traductions</p>
              <p className="text-2xl font-bold">{metrics.totalTranslations}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Vitesse Moyenne</p>
              <p className="text-2xl font-bold">{metrics.avgSpeed}ms</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Taux Cache</p>
              <p className="text-2xl font-bold">{metrics.cacheHitRate.toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Usage SMT</p>
              <p className="text-2xl font-bold">{metrics.smtUsageRate}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Traductions récentes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Traductions Récentes
          </CardTitle>
          <CardDescription>Dernières traductions effectuées par le système</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentTranslations.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucune traduction récente. Utilisez le traducteur pour voir l'activité.
              </p>
            ) : (
              recentTranslations.map((log, idx) => (
                <div key={idx} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{log.input_text}</p>
                      <p className="text-sm text-muted-foreground">→ {log.output_text}</p>
                    </div>
                    <Badge variant={log.translation_method?.includes('statistical') ? "default" : "secondary"}>
                      {log.translation_method || 'unknown'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Confiance: {log.confidence_score?.toFixed(0)}%</span>
                    <span>Durée: {log.duration_ms}ms</span>
                    <span>{new Date(log.created_at).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>📖 Comment utiliser le système SMT</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">1. Importer les données</h4>
            <p className="text-sm text-muted-foreground">
              Allez dans l'onglet "Import SMT Premium" et importez vos fichiers JSON contenant les paires FR-BBA.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">2. Initialiser le SMT</h4>
            <p className="text-sm text-muted-foreground">
              Cliquez sur "Initialiser SMT" pour charger les données dans le moteur de traduction.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">3. Vérifier l'état</h4>
            <p className="text-sm text-muted-foreground">
              Tous les composants (Moteur SMT, Correcteur, Index Trie, Cache) doivent être actifs.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">4. Traduire</h4>
            <p className="text-sm text-muted-foreground">
              Le traducteur utilise automatiquement le SMT si le système est initialisé. Allez sur la page principale et testez !
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
