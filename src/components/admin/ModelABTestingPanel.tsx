/**
 * Panneau de test A/B pour comparer les modèles de traduction
 * Permet de tester SimplifiedAI, BaatonuAI et Lovable AI côte à côte
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Play, Plus, Trash2, Download, RefreshCw } from "lucide-react";
import { translationComparisonService, type ModelComparisonResult, type TranslationMetrics } from "@/services/TranslationComparison";
import { loadComprehensiveDictionary } from "@/data/fullDictionaryData";
import corpusData from "@/data/corpus_initial_2600.json";

const DEFAULT_TEST_PHRASES = [
  { phrase: "Bonjour, comment allez-vous ?", sourceLang: "french" as const, targetLang: "bariba" as const },
  { phrase: "Je vais bien merci", sourceLang: "french" as const, targetLang: "bariba" as const },
  { phrase: "Quel est ton nom ?", sourceLang: "french" as const, targetLang: "bariba" as const },
  { phrase: "La maison est grande", sourceLang: "french" as const, targetLang: "bariba" as const },
  { phrase: "J'aime manger du riz", sourceLang: "french" as const, targetLang: "bariba" as const }
];

export function ModelABTestingPanel() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [currentTest, setCurrentTest] = useState({
    phrase: "",
    sourceLang: "french" as "french" | "bariba",
    targetLang: "bariba" as "french" | "bariba",
    reference: ""
  });
  const [testResult, setTestResult] = useState<ModelComparisonResult | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [history, setHistory] = useState<ModelComparisonResult[]>([]);
  const [metrics, setMetrics] = useState<TranslationMetrics[]>([]);
  const [batchTests, setBatchTests] = useState(DEFAULT_TEST_PHRASES);
  const [isRunningBatch, setIsRunningBatch] = useState(false);

  useEffect(() => {
    initializeService();
  }, []);

  const initializeService = async () => {
    if (isInitialized) return;
    
    setIsInitializing(true);
    try {
      const dictionaryEntries = await loadComprehensiveDictionary();
      const examples = corpusData.map((item: any) => ({
        bariba: item.bariba || item.baatonum || "",
        french: item.french || item.francais || ""
      }));

      await translationComparisonService.initialize(
        dictionaryEntries,
        [],
        examples
      );

      setIsInitialized(true);
      toast.success("Service de comparaison initialisé");
    } catch (error: any) {
      toast.error("Erreur lors de l'initialisation: " + error.message);
    } finally {
      setIsInitializing(false);
    }
  };

  const runSingleTest = async () => {
    if (!currentTest.phrase.trim()) {
      toast.error("Veuillez entrer une phrase à tester");
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const result = await translationComparisonService.compareModels(
        currentTest.phrase,
        currentTest.sourceLang,
        currentTest.targetLang,
        currentTest.reference || undefined
      );

      setTestResult(result);
      setHistory(translationComparisonService.getHistory());
      setMetrics(translationComparisonService.calculateMetrics());
      toast.success("Test terminé");
    } catch (error: any) {
      toast.error("Erreur lors du test: " + error.message);
    } finally {
      setIsTesting(false);
    }
  };

  const runBatchTest = async () => {
    setIsRunningBatch(true);

    try {
      await translationComparisonService.runBatchTest(batchTests);
      setHistory(translationComparisonService.getHistory());
      setMetrics(translationComparisonService.calculateMetrics());
      toast.success(`Batch test terminé: ${batchTests.length} phrases testées`);
    } catch (error: any) {
      toast.error("Erreur lors du batch test: " + error.message);
    } finally {
      setIsRunningBatch(false);
    }
  };

  const exportResults = () => {
    const data = JSON.stringify(history, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ab-test-results-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Résultats exportés");
  };

  const clearHistory = () => {
    translationComparisonService.clearHistory();
    setHistory([]);
    setMetrics([]);
    setTestResult(null);
    toast.success("Historique effacé");
  };

  if (isInitializing) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center space-y-3">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-sm text-muted-foreground">Initialisation du service de comparaison...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Métriques globales */}
      {metrics.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          {metrics.map((metric) => (
            <Card key={metric.modelName}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium capitalize">{metric.modelName}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tests:</span>
                  <span className="font-medium">{metric.totalTests}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Confiance:</span>
                  <span className="font-medium">{metric.avgConfidence.toFixed(1)}%</span>
                </div>
                <Progress value={metric.avgConfidence} className="h-2" />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Durée:</span>
                  <span className="font-medium">{metric.avgDuration.toFixed(0)}ms</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Succès:</span>
                  <span className="font-medium">{metric.successRate.toFixed(1)}%</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Tabs defaultValue="single" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="single">Test Unique</TabsTrigger>
          <TabsTrigger value="batch">Batch Test</TabsTrigger>
          <TabsTrigger value="history">Historique</TabsTrigger>
        </TabsList>

        <TabsContent value="single" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Test A/B Unique</CardTitle>
              <CardDescription>
                Comparez les trois modèles sur une phrase de test
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Langue source</label>
                  <Select value={currentTest.sourceLang} onValueChange={(val: any) => setCurrentTest({ ...currentTest, sourceLang: val })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="french">Français</SelectItem>
                      <SelectItem value="bariba">Baatonum</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Langue cible</label>
                  <Select value={currentTest.targetLang} onValueChange={(val: any) => setCurrentTest({ ...currentTest, targetLang: val })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="french">Français</SelectItem>
                      <SelectItem value="bariba">Baatonum</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Phrase à traduire</label>
                <Textarea
                  placeholder="Entrez la phrase à tester..."
                  value={currentTest.phrase}
                  onChange={(e) => setCurrentTest({ ...currentTest, phrase: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Traduction de référence (optionnel)</label>
                <Textarea
                  placeholder="Traduction attendue pour comparaison..."
                  value={currentTest.reference}
                  onChange={(e) => setCurrentTest({ ...currentTest, reference: e.target.value })}
                  rows={2}
                />
              </div>

              <Button onClick={runSingleTest} disabled={isTesting || !isInitialized} className="w-full">
                {isTesting ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Test en cours...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Lancer le test A/B
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Résultats du test */}
          {testResult && (
            <div className="grid gap-4 md:grid-cols-3">
              {/* SimplifiedAI */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">SimplifiedAI</CardTitle>
                    <Badge variant="secondary">Gratuit</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm">{testResult.results.simplified.translation}</p>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Confiance:</span>
                      <span className="font-medium">{testResult.results.simplified.confidence}%</span>
                    </div>
                    <Progress value={testResult.results.simplified.confidence} className="h-1" />
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Durée:</span>
                      <span className="font-medium">{testResult.results.simplified.duration}ms</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* BaatonuAI */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">BaatonuAI</CardTitle>
                    <Badge variant="secondary">Transformers</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {testResult.results.baatonuAI.available ? (
                    <>
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-sm">{testResult.results.baatonuAI.translation}</p>
                      </div>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Confiance:</span>
                          <span className="font-medium">{testResult.results.baatonuAI.confidence}%</span>
                        </div>
                        <Progress value={testResult.results.baatonuAI.confidence} className="h-1" />
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Durée:</span>
                          <span className="font-medium">{testResult.results.baatonuAI.duration}ms</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="p-3 bg-muted rounded-lg text-center text-sm text-muted-foreground">
                      Modèle non disponible
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Lovable AI */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">Lovable AI</CardTitle>
                    <Badge variant="secondary">Cloud</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {testResult.results.lovableAI.available ? (
                    <>
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-sm">{testResult.results.lovableAI.translation}</p>
                      </div>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Confiance:</span>
                          <span className="font-medium">{testResult.results.lovableAI.confidence}%</span>
                        </div>
                        <Progress value={testResult.results.lovableAI.confidence} className="h-1" />
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Durée:</span>
                          <span className="font-medium">{testResult.results.lovableAI.duration}ms</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="p-3 bg-muted rounded-lg text-center text-sm text-muted-foreground">
                      Modèle non disponible
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="batch" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Batch Test</CardTitle>
                  <CardDescription>
                    Testez plusieurs phrases en série ({batchTests.length} phrases)
                  </CardDescription>
                </div>
                <Button onClick={runBatchTest} disabled={isRunningBatch || !isInitialized}>
                  {isRunningBatch ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Test en cours...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Lancer le batch
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {batchTests.map((test, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 border rounded">
                    <span className="text-sm flex-1">{test.phrase}</span>
                    <Badge variant="outline" className="text-xs">
                      {test.sourceLang} → {test.targetLang}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Historique des Tests</CardTitle>
                  <CardDescription>
                    {history.length} comparaisons effectuées
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button onClick={exportResults} variant="outline" size="sm" disabled={history.length === 0}>
                    <Download className="h-4 w-4 mr-2" />
                    Exporter
                  </Button>
                  <Button onClick={clearHistory} variant="outline" size="sm" disabled={history.length === 0}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Effacer
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {history.map((result) => (
                  <div key={result.testId} className="p-3 border rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{result.phrase}</span>
                      <Badge variant="outline">
                        {result.sourceLang} → {result.targetLang}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Simplified:</span>
                        <span className="ml-1 font-medium">{result.results.simplified.confidence}%</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">BaatonuAI:</span>
                        <span className="ml-1 font-medium">
                          {result.results.baatonuAI.available ? `${result.results.baatonuAI.confidence}%` : 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Lovable AI:</span>
                        <span className="ml-1 font-medium">
                          {result.results.lovableAI.available ? `${result.results.lovableAI.confidence}%` : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
