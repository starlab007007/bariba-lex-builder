/**
 * Panneau de test rapide pour vérifier le système de traduction
 * Affiche les résultats avec détails sur la méthode, confiance et durée
 */

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useHybridTranslation } from "@/hooks/useHybridTranslation";
import { Loader2, Play, CheckCircle, AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface TestPhrase {
  french: string;
  category: 'simple' | 'courante' | 'complexe' | 'tres-complexe';
  expectedMethod?: string;
}

const TEST_PHRASES: TestPhrase[] = [
  { french: "Bonjour", category: 'simple', expectedMethod: 'SMT/SimplifiedAI' },
  { french: "Comment allez-vous ?", category: 'courante', expectedMethod: 'SMT' },
  { french: "Il porte de vieilles chaussures", category: 'complexe', expectedMethod: 'SMT/SimplifiedAI' },
  { french: "Demain vient à la maison", category: 'courante', expectedMethod: 'SMT' },
  { french: "Je vais au marché pour acheter des fruits", category: 'complexe', expectedMethod: 'SMT/SimplifiedAI' },
  { french: "La philosophie contemporaine européenne s'est développée au cours du vingtième siècle", category: 'tres-complexe', expectedMethod: 'Lovable AI' }
];

const METHOD_COLORS: Record<string, string> = {
  idiom: 'bg-green-500',
  context: 'bg-blue-500',
  rag: 'bg-purple-500',
  advanced: 'bg-orange-500',
  simplified: 'bg-cyan-500',
  ai: 'bg-red-500',
  fallback: 'bg-gray-500'
};

const METHOD_LABELS: Record<string, string> = {
  idiom: 'Idiome',
  context: 'Cache/Contexte',
  rag: 'RAG',
  advanced: 'SMT Engine',
  simplified: 'SimplifiedAI',
  ai: 'Lovable AI',
  fallback: 'Fallback'
};

export function TranslationTestPanel() {
  const { translateFrenchToBariba, isInitialized } = useHybridTranslation();
  const [results, setResults] = useState<Map<string, any>>(new Map());
  const [testing, setTesting] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const runTests = async () => {
    setTesting(true);
    setResults(new Map());
    setCurrentIndex(0);

    for (let i = 0; i < TEST_PHRASES.length; i++) {
      const phrase = TEST_PHRASES[i];
      setCurrentIndex(i);
      
      try {
        const result = await translateFrenchToBariba(phrase.french);
        setResults(prev => new Map(prev.set(phrase.french, {
          success: true,
          result
        })));
      } catch (error) {
        setResults(prev => new Map(prev.set(phrase.french, {
          success: false,
          error: error instanceof Error ? error.message : 'Erreur inconnue'
        })));
      }
      
      // Petite pause pour la lisibilité
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    setTesting(false);
  };

  if (!isInitialized) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="ml-2 text-muted-foreground">Initialisation du système...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>🧪 Test du Système de Traduction</CardTitle>
        <CardDescription>
          Testez {TEST_PHRASES.length} phrases pour vérifier que SMT et SimplifiedAI fonctionnent correctement
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <Button
            onClick={runTests}
            disabled={testing}
            className="flex items-center gap-2"
          >
            {testing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Test en cours... ({currentIndex + 1}/{TEST_PHRASES.length})
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Lancer les tests
              </>
            )}
          </Button>
          
          {testing && (
            <div className="flex-1">
              <Progress value={(currentIndex / TEST_PHRASES.length) * 100} />
            </div>
          )}
        </div>

        {results.size > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">Résultats des tests</h3>
            
            {TEST_PHRASES.map((phrase) => {
              const testResult = results.get(phrase.french);
              if (!testResult) return null;

              return (
                <div
                  key={phrase.french}
                  className="border rounded-lg p-4 space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {testResult.success ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        )}
                        <span className="font-medium">{phrase.french}</span>
                        <Badge variant="outline">{phrase.category}</Badge>
                      </div>
                      
                      {testResult.success && (
                        <>
                          <p className="text-sm text-muted-foreground mb-2">
                            → {testResult.result.translation}
                          </p>
                          
                          <div className="flex items-center gap-3 text-xs">
                            <Badge className={METHOD_COLORS[testResult.result.method]}>
                              {METHOD_LABELS[testResult.result.method]}
                            </Badge>
                            
                            <div className="flex items-center gap-1">
                              <span className="text-muted-foreground">Confiance:</span>
                              <span className="font-bold">{testResult.result.confidence}%</span>
                            </div>
                            
                            <div className="flex items-center gap-1">
                              <span className="text-muted-foreground">Durée:</span>
                              <span className="font-bold">{testResult.result.duration}ms</span>
                            </div>
                            
                            {phrase.expectedMethod && (
                              <div className="flex items-center gap-1">
                                <span className="text-muted-foreground">Attendu:</span>
                                <span className="text-xs">{phrase.expectedMethod}</span>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                      
                      {!testResult.success && (
                        <p className="text-sm text-red-500">
                          ❌ Erreur: {testResult.error}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            
            {/* Résumé */}
            <div className="mt-6 p-4 bg-muted rounded-lg">
              <h4 className="font-semibold mb-2">📊 Résumé</h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Total</p>
                  <p className="font-bold text-lg">{results.size}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Réussis</p>
                  <p className="font-bold text-lg text-green-500">
                    {Array.from(results.values()).filter(r => r.success).length}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Échecs</p>
                  <p className="font-bold text-lg text-red-500">
                    {Array.from(results.values()).filter(r => !r.success).length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
