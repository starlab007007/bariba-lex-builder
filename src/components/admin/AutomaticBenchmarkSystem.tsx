/**
 * Système de benchmarking automatique pour le SMT
 */
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Play, Download, RefreshCw, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { statisticalEngine } from "@/services/StatisticalTranslationEngine";

interface BenchmarkResult {
  phrase: string;
  reference: string;
  translation: string;
  bleu: number;
  speed: number;
  success: boolean;
}

const TEST_PHRASES = [
  { french: "Bonjour, comment allez-vous ?", bariba: "Kɔ́ɔ̀rɔ̀, yɑ̀ yɛ́ɛ̀ bɛ́?" },
  { french: "Je vais bien, merci.", bariba: "N yɛ̀ɛ́ nɔ̀ɔ̀rɑ̀, bɑ̀ɑ̀rí." },
  { french: "Quel est ton nom ?", bariba: "Yɑ̀ tɔ̀ɔ́ lɑ́ɑ́?" },
  { french: "Mon nom est Jean.", bariba: "N tɔɔ lɑɑ de Jean." },
  { french: "Où habites-tu ?", bariba: "Fóó má dòkù?" },
  { french: "J'habite à Parakou.", bariba: "N dòkù Parakou tí." },
  { french: "Le soleil brille aujourd'hui.", bariba: "Tíírú kà nàɑ́ bíkùrú." },
  { french: "Il fait très chaud.", bariba: "Gbésébèsé wɛ́ɛ̀ dɑ̀ɑ̀." },
  { french: "J'ai faim et soif.", bariba: "Kóó má lù, núú sɑ̀ɑ́ má lù." },
  { french: "Donne-moi de l'eau s'il te plaît.", bariba: "Nú wɔ̃̀ɔ̃́ n bɑ̀, à yɔ̃́ɔ̃̀." }
];

export function AutomaticBenchmarkSystem() {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<BenchmarkResult[]>([]);
  const { toast } = useToast();

  const calculateBleu = (reference: string, translation: string): number => {
    // Simplified BLEU score calculation
    const refWords = reference.toLowerCase().split(/\s+/);
    const transWords = translation.toLowerCase().split(/\s+/);
    
    const matches = transWords.filter(word => refWords.includes(word)).length;
    const precision = matches / Math.max(transWords.length, 1);
    const recall = matches / Math.max(refWords.length, 1);
    
    if (precision + recall === 0) return 0;
    const f1 = (2 * precision * recall) / (precision + recall);
    
    return Math.round(f1 * 100);
  };

  const runBenchmark = async () => {
    if (!statisticalEngine.isReady()) {
      toast({
        title: "❌ SMT non initialisé",
        description: "Importez d'abord les données premium via l'onglet Import SMT",
        variant: "destructive"
      });
      return;
    }

    setIsRunning(true);
    setProgress(0);
    setResults([]);

    const benchmarkResults: BenchmarkResult[] = [];

    for (let i = 0; i < TEST_PHRASES.length; i++) {
      const test = TEST_PHRASES[i];
      const startTime = Date.now();
      
      try {
        const result = statisticalEngine.translate(test.french);
        const speed = Date.now() - startTime;
        const bleu = calculateBleu(test.bariba, result.translation);
        
        benchmarkResults.push({
          phrase: test.french,
          reference: test.bariba,
          translation: result.translation,
          bleu,
          speed,
          success: bleu >= 50
        });
      } catch (error) {
        benchmarkResults.push({
          phrase: test.french,
          reference: test.bariba,
          translation: 'ERREUR',
          bleu: 0,
          speed: 0,
          success: false
        });
      }

      setProgress(((i + 1) / TEST_PHRASES.length) * 100);
      setResults([...benchmarkResults]);
      
      // Small delay to prevent UI freeze
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Save results to database
    try {
      const avgBleu = benchmarkResults.reduce((sum, r) => sum + r.bleu, 0) / benchmarkResults.length;
      const avgSpeed = benchmarkResults.reduce((sum, r) => sum + r.speed, 0) / benchmarkResults.length;
      const successRate = (benchmarkResults.filter(r => r.success).length / benchmarkResults.length) * 100;

      await supabase.from('model_performance').insert({
        model_version: 'smt-statistical-engine',
        metric_name: 'benchmark_test',
        metric_value: avgBleu,
        metadata: {
          avg_speed: avgSpeed,
          success_rate: successRate,
          total_tests: benchmarkResults.length,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error("Erreur sauvegarde benchmark:", error);
    }

    setIsRunning(false);
    toast({
      title: "✅ Benchmark terminé",
      description: `${benchmarkResults.filter(r => r.success).length}/${benchmarkResults.length} tests réussis`
    });
  };

  const exportResults = () => {
    const csv = [
      'Phrase,Référence,Traduction,BLEU,Vitesse (ms),Succès',
      ...results.map(r => 
        `"${r.phrase}","${r.reference}","${r.translation}",${r.bleu},${r.speed},${r.success}`
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smt-benchmark-${new Date().toISOString()}.csv`;
    a.click();
  };

  const avgBleu = results.length > 0
    ? Math.round(results.reduce((sum, r) => sum + r.bleu, 0) / results.length)
    : 0;
  
  const avgSpeed = results.length > 0
    ? Math.round(results.reduce((sum, r) => sum + r.speed, 0) / results.length)
    : 0;

  const successCount = results.filter(r => r.success).length;

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Benchmarking Automatique</h3>
            <p className="text-sm text-muted-foreground">
              Testez le SMT sur {TEST_PHRASES.length} phrases standard
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={runBenchmark}
              disabled={isRunning}
              size="sm"
            >
              {isRunning ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  En cours...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Lancer le test
                </>
              )}
            </Button>
            {results.length > 0 && (
              <Button onClick={exportResults} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Exporter CSV
              </Button>
            )}
          </div>
        </div>

        {isRunning && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">
                Progression: {Math.round(progress)}%
              </span>
              <span className="text-sm text-muted-foreground">
                {results.length} / {TEST_PHRASES.length}
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {results.length > 0 && (
          <div className="grid grid-cols-3 gap-4 mb-4">
            <Card className="p-4">
              <div className="text-sm text-muted-foreground mb-1">BLEU Moyen</div>
              <div className="text-2xl font-bold text-foreground">{avgBleu}%</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-muted-foreground mb-1">Vitesse Moyenne</div>
              <div className="text-2xl font-bold text-foreground">{avgSpeed}ms</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-muted-foreground mb-1">Taux de Réussite</div>
              <div className="text-2xl font-bold text-foreground">
                {successCount}/{results.length}
              </div>
            </Card>
          </div>
        )}
      </Card>

      {results.length > 0 && (
        <Card className="p-6">
          <h4 className="text-md font-semibold mb-4 text-foreground">Résultats Détaillés</h4>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {results.map((result, idx) => (
              <div key={idx} className="p-3 border border-border rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-foreground mb-1">
                      {result.phrase}
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div>Référence: <span className="bariba-text">{result.reference}</span></div>
                      <div>Traduction: <span className="bariba-text">{result.translation}</span></div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {result.success ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                    <div className="text-right">
                      <Badge variant={result.bleu >= 70 ? "default" : result.bleu >= 50 ? "secondary" : "destructive"}>
                        BLEU: {result.bleu}%
                      </Badge>
                      <div className="text-xs text-muted-foreground mt-1">
                        {result.speed}ms
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
