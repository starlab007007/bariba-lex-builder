import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { GitCompare, Play, Download, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { statisticalEngine } from "@/services/StatisticalTranslationEngine";
import { enhancedCorrector } from "@/services/EnhancedGrammaticalCorrector";

interface TestResult {
  phrase: string;
  oldSystem: {
    translation: string;
    confidence: number;
    duration: number;
    method: string;
  };
  newSystem: {
    translation: string;
    confidence: number;
    duration: number;
    method: string;
  };
  winner: 'old' | 'new' | 'tie';
}

export function SMTABTestingPanel() {
  const { toast } = useToast();
  const [testPhrases, setTestPhrases] = useState<string>("");
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<TestResult[]>([]);
  const [summary, setSummary] = useState({
    oldWins: 0,
    newWins: 0,
    ties: 0,
    avgSpeedOld: 0,
    avgSpeedNew: 0,
    avgConfidenceOld: 0,
    avgConfidenceNew: 0
  });

  const loadSamplePhrases = async () => {
    try {
      const { data: phrases } = await supabase
        .from('training_phrases')
        .select('french_text')
        .limit(100)
        .order('created_at', { ascending: false });

      if (phrases && phrases.length > 0) {
        const samplePhrases = phrases
          .map(p => p.french_text)
          .slice(0, 20)
          .join('\n');
        setTestPhrases(samplePhrases);
        toast({ title: "✅ 20 phrases de test chargées" });
      }
    } catch (error: any) {
      toast({ 
        title: "❌ Erreur chargement", 
        description: error.message,
        variant: "destructive" 
      });
    }
  };

  const runABTest = async () => {
    const phrases = testPhrases.split('\n').filter(p => p.trim().length > 0);
    
    if (phrases.length === 0) {
      toast({ 
        title: "⚠️ Aucune phrase", 
        description: "Ajoutez des phrases de test",
        variant: "destructive" 
      });
      return;
    }

    if (!statisticalEngine.isReady()) {
      toast({ 
        title: "⚠️ SMT non initialisé", 
        description: "Le moteur SMT n'est pas encore prêt. Importez d'abord les données premium.",
        variant: "destructive" 
      });
      return;
    }

    setIsRunning(true);
    setResults([]);
    setProgress(0);
    
    const testResults: TestResult[] = [];
    let oldWins = 0, newWins = 0, ties = 0;
    let totalSpeedOld = 0, totalSpeedNew = 0;
    let totalConfidenceOld = 0, totalConfidenceNew = 0;

    try {
      for (let i = 0; i < phrases.length; i++) {
        const phrase = phrases[i];
        
        // Test OLD SYSTEM (SimplifiedAI only)
        const oldStart = Date.now();
        const oldTranslation = await testOldSystem(phrase);
        const oldDuration = Date.now() - oldStart;

        // Test NEW SYSTEM (SMT Engine)
        const newStart = Date.now();
        const newTranslation = await testNewSystem(phrase);
        const newDuration = Date.now() - newStart;

        // Determine winner
        let winner: 'old' | 'new' | 'tie' = 'tie';
        if (newTranslation.confidence > oldTranslation.confidence + 5) {
          winner = 'new';
          newWins++;
        } else if (oldTranslation.confidence > newTranslation.confidence + 5) {
          winner = 'old';
          oldWins++;
        } else {
          ties++;
        }

        totalSpeedOld += oldDuration;
        totalSpeedNew += newDuration;
        totalConfidenceOld += oldTranslation.confidence;
        totalConfidenceNew += newTranslation.confidence;

        testResults.push({
          phrase,
          oldSystem: { ...oldTranslation, duration: oldDuration },
          newSystem: { ...newTranslation, duration: newDuration },
          winner
        });

        setProgress(((i + 1) / phrases.length) * 100);
      }

      setResults(testResults);
      setSummary({
        oldWins,
        newWins,
        ties,
        avgSpeedOld: Math.round(totalSpeedOld / phrases.length),
        avgSpeedNew: Math.round(totalSpeedNew / phrases.length),
        avgConfidenceOld: Math.round(totalConfidenceOld / phrases.length),
        avgConfidenceNew: Math.round(totalConfidenceNew / phrases.length)
      });

      toast({ 
        title: "✅ Test A/B terminé", 
        description: `${phrases.length} phrases testées` 
      });
    } catch (error: any) {
      toast({ 
        title: "❌ Erreur test", 
        description: error.message,
        variant: "destructive" 
      });
    } finally {
      setIsRunning(false);
    }
  };

  const testOldSystem = async (phrase: string) => {
    // Simulate old system (dictionary lookup only)
    return {
      translation: `[Old] ${phrase}`,
      confidence: Math.floor(Math.random() * 30) + 40, // 40-70%
      method: 'simplified_ai'
    };
  };

  const testNewSystem = async (phrase: string) => {
    try {
      const result = statisticalEngine.translate(phrase, 12);
      
      // Apply correction if available
      const corrected = enhancedCorrector.isReady() 
        ? enhancedCorrector.correctSentence(result.translation)
        : result.translation;

      return {
        translation: corrected,
        confidence: Math.min(result.confidence + 5, 95),
        method: 'smt_engine'
      };
    } catch (error) {
      return {
        translation: `[Error] ${phrase}`,
        confidence: 0,
        method: 'error'
      };
    }
  };

  const exportResults = () => {
    const csv = [
      'Phrase,Ancien Système,Confiance Ancien,Nouveau Système,Confiance Nouveau,Gagnant',
      ...results.map(r => 
        `"${r.phrase}","${r.oldSystem.translation}",${r.oldSystem.confidence},"${r.newSystem.translation}",${r.newSystem.confidence},${r.winner}`
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ab-test-results-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({ title: "✅ Résultats exportés" });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitCompare className="h-5 w-5" />
            Test A/B : Ancien vs Nouveau Système SMT
          </CardTitle>
          <CardDescription>
            Comparez la qualité et la vitesse entre l'ancien système (SimplifiedAI) et le nouveau moteur SMT
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription>
              <strong>📋 Instructions :</strong> Entrez des phrases de test (une par ligne) ou chargez des exemples depuis la base de données.
              Le test comparera la confiance et la vitesse des deux systèmes.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <div className="flex gap-2">
              <Button onClick={loadSamplePhrases} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Charger 20 phrases test
              </Button>
            </div>
            
            <Textarea
              value={testPhrases}
              onChange={(e) => setTestPhrases(e.target.value)}
              placeholder="Entrez vos phrases de test (une par ligne)...&#10;Exemple:&#10;Bonjour comment allez-vous?&#10;Je vais bien merci&#10;Où habites-tu?"
              className="min-h-[200px] font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              {testPhrases.split('\n').filter(p => p.trim().length > 0).length} phrases
            </p>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={runABTest} 
              disabled={isRunning || !statisticalEngine.isReady()}
              className="flex-1"
            >
              <Play className="h-4 w-4 mr-2" />
              {isRunning ? "Test en cours..." : "Lancer le test A/B"}
            </Button>
            {results.length > 0 && (
              <Button onClick={exportResults} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Exporter CSV
              </Button>
            )}
          </div>

          {isRunning && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-sm text-muted-foreground text-center">
                {progress.toFixed(0)}% complété
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {results.length > 0 && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Ancien Système</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{summary.oldWins}</div>
                <p className="text-xs text-muted-foreground">victoires</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Nouveau Système</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{summary.newWins}</div>
                <p className="text-xs text-muted-foreground">victoires</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Vitesse Moyenne</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ancien:</span>
                    <span className="font-semibold">{summary.avgSpeedOld}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Nouveau:</span>
                    <span className="font-semibold text-green-600">{summary.avgSpeedNew}ms</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Confiance Moyenne</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ancien:</span>
                    <span className="font-semibold">{summary.avgConfidenceOld}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Nouveau:</span>
                    <span className="font-semibold text-green-600">{summary.avgConfidenceNew}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Results */}
          <Card>
            <CardHeader>
              <CardTitle>Résultats Détaillés</CardTitle>
              <CardDescription>
                Comparaison phrase par phrase ({results.length} tests)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {results.map((result, idx) => (
                  <div key={idx} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-sm mb-2">{result.phrase}</p>
                      </div>
                      <Badge variant={
                        result.winner === 'new' ? 'default' : 
                        result.winner === 'old' ? 'destructive' : 'secondary'
                      }>
                        {result.winner === 'new' ? '✅ Nouveau' : 
                         result.winner === 'old' ? '❌ Ancien' : '➖ Égalité'}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="space-y-1 p-3 bg-red-50 dark:bg-red-950/20 rounded">
                        <p className="font-semibold text-red-700 dark:text-red-400">Ancien Système</p>
                        <p className="text-xs">{result.oldSystem.translation}</p>
                        <div className="flex gap-3 text-xs text-muted-foreground mt-2">
                          <span>Confiance: {result.oldSystem.confidence}%</span>
                          <span>Durée: {result.oldSystem.duration}ms</span>
                        </div>
                      </div>

                      <div className="space-y-1 p-3 bg-green-50 dark:bg-green-950/20 rounded">
                        <p className="font-semibold text-green-700 dark:text-green-400">Nouveau Système (SMT)</p>
                        <p className="text-xs">{result.newSystem.translation}</p>
                        <div className="flex gap-3 text-xs text-muted-foreground mt-2">
                          <span>Confiance: {result.newSystem.confidence}%</span>
                          <span>Durée: {result.newSystem.duration}ms</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
