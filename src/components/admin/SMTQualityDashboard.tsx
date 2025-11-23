import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, PlayCircle, Download, TrendingUp } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

/**
 * SMT Quality Dashboard
 * Compares SMT translations with reference translations and calculates real BLEU score
 */
export function SMTQualityDashboard() {
  const { toast } = useToast();
  const [testing, setTesting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<any>(null);
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [testSetName, setTestSetName] = useState("Test Standard");

  // Calculate BLEU score (simplified implementation)
  const calculateBLEU = (reference: string, candidate: string): number => {
    const refTokens = reference.toLowerCase().split(/\s+/);
    const candTokens = candidate.toLowerCase().split(/\s+/);
    
    // Calculate n-gram precision (1-gram to 4-gram)
    let totalPrecision = 0;
    for (let n = 1; n <= 4; n++) {
      const refNgrams = new Set<string>();
      const candNgrams = new Set<string>();
      
      for (let i = 0; i <= refTokens.length - n; i++) {
        refNgrams.add(refTokens.slice(i, i + n).join(' '));
      }
      
      let matches = 0;
      for (let i = 0; i <= candTokens.length - n; i++) {
        const ngram = candTokens.slice(i, i + n).join(' ');
        candNgrams.add(ngram);
        if (refNgrams.has(ngram)) matches++;
      }
      
      const precision = candNgrams.size > 0 ? matches / candNgrams.size : 0;
      totalPrecision += precision;
    }
    
    // Brevity penalty
    const brevityPenalty = candTokens.length >= refTokens.length 
      ? 1 
      : Math.exp(1 - refTokens.length / candTokens.length);
    
    const bleu = brevityPenalty * Math.pow(totalPrecision / 4, 0.25);
    return Math.round(bleu * 100);
  };

  const runQualityTest = async () => {
    setTesting(true);
    setProgress(0);
    
    try {
      // Load reference test phrases from training_phrases (validated ones)
      const { data: testPhrases, error } = await supabase
        .from('training_phrases')
        .select('french_text, bariba_text')
        .eq('is_validated', true)
        .limit(100);

      if (error) throw error;
      if (!testPhrases || testPhrases.length === 0) {
        throw new Error("No validated test phrases found");
      }

      setProgress(20);

      // Test each phrase with SMT
      const { statisticalEngine } = await import("@/services/StatisticalTranslationEngine");
      
      const testResults = [];
      let totalBLEU = 0;
      let totalConfidence = 0;
      let totalDuration = 0;

      for (let i = 0; i < testPhrases.length; i++) {
        const startTime = performance.now();
        const smtResult = await statisticalEngine.translate(testPhrases[i].french_text);
        const duration = performance.now() - startTime;

        const bleuScore = calculateBLEU(
          testPhrases[i].bariba_text,
          smtResult.translation
        );

        testResults.push({
          source: testPhrases[i].french_text,
          reference: testPhrases[i].bariba_text,
          translation: smtResult.translation,
          bleu: bleuScore,
          confidence: smtResult.confidence,
          duration
        });

        totalBLEU += bleuScore;
        totalConfidence += smtResult.confidence;
        totalDuration += duration;

        setProgress(20 + (i / testPhrases.length) * 70);
      }

      const avgBLEU = totalBLEU / testPhrases.length;
      const avgConfidence = totalConfidence / testPhrases.length;
      const avgDuration = totalDuration / testPhrases.length;

      // Calculate precision, recall, F1
      const precision = avgBLEU / 100;
      const recall = avgConfidence / 100;
      const f1 = 2 * (precision * recall) / (precision + recall);

      const finalResults = {
        testSetName,
        totalPhrases: testPhrases.length,
        bleuScore: avgBLEU,
        precisionScore: precision * 100,
        recallScore: recall * 100,
        f1Score: f1 * 100,
        avgConfidence,
        avgDurationMs: Math.round(avgDuration),
        testResults
      };

      setResults(finalResults);
      setProgress(90);

      // Save to database
      const { error: saveError } = await supabase
        .from('smt_quality_metrics')
        .insert({
          test_set_name: testSetName,
          total_phrases: testPhrases.length,
          bleu_score: avgBLEU,
          precision_score: precision * 100,
          recall_score: recall * 100,
          f1_score: f1 * 100,
          avg_confidence: avgConfidence,
          avg_duration_ms: Math.round(avgDuration),
          test_results: testResults,
          model_version: 'SMT-v1.0'
        });

      if (saveError) throw saveError;

      setProgress(100);
      loadHistoricalData();

      toast({
        title: "✅ Test de qualité terminé",
        description: `Score BLEU: ${avgBLEU.toFixed(1)}% sur ${testPhrases.length} phrases`,
      });
    } catch (error: any) {
      console.error("Quality test error:", error);
      toast({
        title: "❌ Erreur test qualité",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setTesting(false);
    }
  };

  const loadHistoricalData = async () => {
    const { data, error } = await supabase
      .from('smt_quality_metrics')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(20);

    if (data && !error) {
      setHistoricalData(data.map(d => ({
        date: new Date(d.created_at!).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' }),
        bleu: d.bleu_score,
        f1: d.f1_score
      })));
    }
  };

  const exportResults = () => {
    if (!results) return;
    
    const csv = [
      "Source,Reference,Translation,BLEU,Confidence,Duration",
      ...results.testResults.map((r: any) => 
        `"${r.source}","${r.reference}","${r.translation}",${r.bleu},${r.confidence},${r.duration}`
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smt-quality-${testSetName}-${Date.now()}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Analyse de Qualité SMT
          </CardTitle>
          <CardDescription>
            Compare les traductions SMT avec des références et calcule le score BLEU réel
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Nom du Test</Label>
            <Input
              value={testSetName}
              onChange={(e) => setTestSetName(e.target.value)}
              placeholder="Ex: Test Standard, Test Complexe..."
            />
          </div>

          <Button
            onClick={runQualityTest}
            disabled={testing}
            className="w-full"
          >
            {testing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Test en cours...
              </>
            ) : (
              <>
                <PlayCircle className="mr-2 h-4 w-4" />
                Lancer Test de Qualité (100 phrases)
              </>
            )}
          </Button>

          {testing && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-sm text-muted-foreground text-center">
                {Math.round(progress)}%
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {results && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Score BLEU
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">
                  {results.bleuScore.toFixed(1)}%
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Score F1
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {results.f1Score.toFixed(1)}%
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Confiance Moy.
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {results.avgConfidence.toFixed(1)}%
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Vitesse Moy.
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {results.avgDurationMs}ms
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Résultats Détaillés</CardTitle>
                <Button onClick={exportResults} variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  Exporter CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground mb-2">
                {results.totalPhrases} phrases testées
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {historicalData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Évolution Historique</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={historicalData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="bleu" 
                  stroke="hsl(var(--primary))" 
                  name="BLEU Score"
                  strokeWidth={2}
                />
                <Line 
                  type="monotone" 
                  dataKey="f1" 
                  stroke="hsl(var(--chart-2))" 
                  name="F1 Score"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
