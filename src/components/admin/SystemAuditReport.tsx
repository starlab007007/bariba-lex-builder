/**
 * Rapport d'Audit Complet du Système
 * 
 * Affiche l'état actuel:
 * - Données d'entraînement
 * - Dictionnaire
 * - Modèles
 * - Performance
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Database, 
  BookOpen, 
  Brain, 
  CheckCircle, 
  AlertCircle,
  XCircle,
  RefreshCw,
  BarChart3
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { loadComprehensiveDictionary } from '@/data/fullDictionaryData';
import { loadEnhancedCorpus } from '@/data/enhancedCorpusLoader';
import { useToast } from '@/hooks/use-toast';

interface AuditData {
  dictionary: {
    totalEntries: number;
    supabaseEntries: number;
    dictEntries: number;
    biblicalEntries: number;
    hasBiblical: boolean;
  };
  trainingData: {
    totalPhrases: number;
    corpusInitial: number;
    biblicalPhrases: number;
    idioms: number;
    hasBiblical: boolean;
  };
  models: {
    simplifiedReady: boolean;
    advancedReady: boolean;
    llmReady: boolean;
  };
  performance: {
    avgConfidence: number;
    avgDuration: number;
    totalTranslations: number;
  };
}

export default function SystemAuditReport() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [auditData, setAuditData] = useState<AuditData | null>(null);

  useEffect(() => {
    performAudit();
  }, []);

  const performAudit = async () => {
    setIsLoading(true);
    try {
      console.log('🔍 Démarrage de l\'audit système...');

      // 1. Audit du dictionnaire
      const dictionaryEntries = await loadComprehensiveDictionary();
      const biblicalInDict = dictionaryEntries.filter(e => 
        e.source_flags.includes('biblical')
      ).length;

      // Compter les entrées par source
      const supabaseCount = dictionaryEntries.filter(e => 
        e.source_flags.includes('db')
      ).length;
      const dictCount = dictionaryEntries.filter(e => 
        e.source_flags.includes('dict')
      ).length;

      // 2. Audit des données d'entraînement
      const corpus = await loadEnhancedCorpus();
      const biblicalInCorpus = corpus.trainingPairs.filter(p => 
        p.source === 'biblical'
      ).length;

      // 3. Vérifier les idiomes
      const { data: idioms } = await supabase
        .from('idiomatic_expressions')
        .select('*', { count: 'exact' });

      // 4. Vérifier les logs de traduction
      const { data: logs } = await supabase
        .from('translation_logs')
        .select('confidence_score, duration_ms')
        .order('created_at', { ascending: false })
        .limit(1000);

      const avgConfidence = logs?.length 
        ? logs.reduce((sum, l) => sum + (l.confidence_score || 0), 0) / logs.length
        : 0;
      const avgDuration = logs?.length
        ? logs.reduce((sum, l) => sum + (l.duration_ms || 0), 0) / logs.length
        : 0;

      const audit: AuditData = {
        dictionary: {
          totalEntries: dictionaryEntries.length,
          supabaseEntries: supabaseCount,
          dictEntries: dictCount,
          biblicalEntries: biblicalInDict,
          hasBiblical: biblicalInDict > 0
        },
        trainingData: {
          totalPhrases: corpus.totalPairs,
          corpusInitial: corpus.trainingPairs.filter(p => p.source === 'corpus_initial').length,
          biblicalPhrases: biblicalInCorpus,
          idioms: idioms?.length || 0,
          hasBiblical: biblicalInCorpus > 0
        },
        models: {
          simplifiedReady: true,
          advancedReady: false,
          llmReady: false
        },
        performance: {
          avgConfidence: Math.round(avgConfidence),
          avgDuration: Math.round(avgDuration),
          totalTranslations: logs?.length || 0
        }
      };

      setAuditData(audit);
      console.log('✅ Audit terminé', audit);

    } catch (error) {
      console.error('Erreur audit:', error);
      toast({
        title: "Erreur d'audit",
        description: "Impossible de compléter l'audit système",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Audit Système</CardTitle>
          <CardDescription>Analyse en cours...</CardDescription>
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

  if (!auditData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Audit Système</CardTitle>
          <CardDescription>Erreur de chargement</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Audit Système Complet</h2>
          <p className="text-muted-foreground">
            État actuel du dictionnaire, des données d'entraînement et des modèles
          </p>
        </div>
        <Button onClick={performAudit} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualiser
        </Button>
      </div>

      {/* Alertes critiques */}
      {(auditData.dictionary.hasBiblical || auditData.trainingData.hasBiblical) && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>⚠️ DONNÉES BIBLIQUES DÉTECTÉES</strong>
            <ul className="mt-2 space-y-1 text-sm">
              {auditData.dictionary.hasBiblical && (
                <li>• {auditData.dictionary.biblicalEntries} entrées bibliques dans le dictionnaire</li>
              )}
              {auditData.trainingData.hasBiblical && (
                <li>• {auditData.trainingData.biblicalPhrases} phrases bibliques dans l'entraînement</li>
              )}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {(!auditData.dictionary.hasBiblical && !auditData.trainingData.hasBiblical) && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>✅ SYSTÈME NETTOYÉ</strong>
            <p className="mt-1 text-sm">Aucune donnée biblique détectée</p>
          </AlertDescription>
        </Alert>
      )}

      {/* Cartes de statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Dictionnaire */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dictionnaire</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{auditData.dictionary.totalEntries}</div>
            <div className="space-y-1 mt-2 text-xs text-muted-foreground">
              <div>• Supabase: {auditData.dictionary.supabaseEntries}</div>
              <div>• Fichier dict: {auditData.dictionary.dictEntries}</div>
              <div className={auditData.dictionary.hasBiblical ? 'text-destructive' : ''}>
                • Bibliques: {auditData.dictionary.biblicalEntries}
                {auditData.dictionary.hasBiblical && ' ⚠️'}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Données d'entraînement */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Entraînement</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{auditData.trainingData.totalPhrases}</div>
            <div className="space-y-1 mt-2 text-xs text-muted-foreground">
              <div>• Corpus: {auditData.trainingData.corpusInitial}</div>
              <div>• Idiomes: {auditData.trainingData.idioms}</div>
              <div className={auditData.trainingData.hasBiblical ? 'text-destructive' : ''}>
                • Bibliques: {auditData.trainingData.biblicalPhrases}
                {auditData.trainingData.hasBiblical && ' ⚠️'}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Modèles */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Modèles</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2 mt-2">
              <div className="flex items-center justify-between text-sm">
                <span>Simplifié</span>
                {auditData.models.simplifiedReady ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Avancé</span>
                {auditData.models.advancedReady ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>LLM</span>
                {auditData.models.llmReady ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Performance */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Performance</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{auditData.performance.avgConfidence}%</div>
            <div className="space-y-1 mt-2 text-xs text-muted-foreground">
              <div>Confiance moyenne</div>
              <div>• Durée: {auditData.performance.avgDuration}ms</div>
              <div>• {auditData.performance.totalTranslations} traductions</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Détails système */}
      <Card>
        <CardHeader>
          <CardTitle>Architecture du Système</CardTitle>
          <CardDescription>Comment le traducteur fonctionne actuellement</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">🎯 Cascade de Traduction (5 niveaux)</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <Badge variant="secondary">0</Badge>
                <div>
                  <div className="font-medium">Idiomes</div>
                  <div className="text-muted-foreground">
                    {auditData.trainingData.idioms} expressions figées (100% confiance, &lt;1ms)
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Badge variant="secondary">1</Badge>
                <div>
                  <div className="font-medium">Contexte conversationnel</div>
                  <div className="text-muted-foreground">
                    Mémoire des 100 dernières traductions (70%+ confiance)
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Badge variant="secondary">2</Badge>
                <div>
                  <div className="font-medium">SimplifiedTranslationAI</div>
                  <div className="text-muted-foreground">
                    Règles linguistiques + fuzzy matching sur {auditData.trainingData.corpusInitial} paires (40-95% confiance, &lt;50ms)
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Badge variant="secondary">3</Badge>
                <div>
                  <div className="font-medium">BaatonuTranslationAI</div>
                  <div className="text-muted-foreground">
                    {auditData.models.advancedReady ? 'Activé' : 'Désactivé'} (50-90% confiance, 200-500ms)
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Badge variant="secondary">4</Badge>
                <div>
                  <div className="font-medium">Lovable AI (fallback)</div>
                  <div className="text-muted-foreground">
                    Modèles LLM cloud (70-99% confiance, 1-3s, coût par requête)
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-2">📊 Sources de Données</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Dictionnaire Supabase</span>
                <span className="font-medium">{auditData.dictionary.supabaseEntries} entrées</span>
              </div>
              <div className="flex justify-between">
                <span>Dictionnaire fichier (dictionnaire-10-2.json)</span>
                <span className="font-medium">{auditData.dictionary.dictEntries} entrées</span>
              </div>
              <div className="flex justify-between">
                <span>Corpus initial (corpus_initial_2600.json)</span>
                <span className="font-medium">{auditData.trainingData.corpusInitial} paires</span>
              </div>
              <div className="flex justify-between">
                <span>Expressions idiomatiques</span>
                <span className="font-medium">{auditData.trainingData.idioms} idiomes</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-2">🧠 État des Modèles</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span>SimplifiedTranslationAI (règles linguistiques)</span>
                <Badge variant={auditData.models.simplifiedReady ? "default" : "secondary"}>
                  {auditData.models.simplifiedReady ? 'Actif' : 'Inactif'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>BaatonuTranslationAI (transformers)</span>
                <Badge variant={auditData.models.advancedReady ? "default" : "secondary"}>
                  {auditData.models.advancedReady ? 'Actif' : 'Inactif'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>NLLB-200 Fine-tuné</span>
                <Badge variant={auditData.models.llmReady ? "default" : "secondary"}>
                  {auditData.models.llmReady ? 'Actif' : 'Non entraîné'}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
