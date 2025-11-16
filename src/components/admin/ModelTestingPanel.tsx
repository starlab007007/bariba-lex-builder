import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useTranslationAI } from '@/hooks/useTranslationAI';
import { useAITranslation } from '@/hooks/useAITranslation';
import { supabase } from '@/integrations/supabase/client';
import { FlaskConical, Zap, Brain, TrendingUp, Download } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface TestResult {
  id?: string;
  timestamp: Date;
  testPhrase: string;
  sourceLanguage: 'french' | 'bariba';
  targetLanguage: 'french' | 'bariba';
  localTranslation?: string;
  apiTranslation?: string;
  localTime?: number;
  apiTime?: number;
  localConfidence?: number;
  apiConfidence?: number;
}

export default function ModelTestingPanel() {
  const [testText, setTestText] = useState("");
  const [direction, setDirection] = useState<'french' | 'bariba'>('french');
  const [currentResult, setCurrentResult] = useState<TestResult | null>(null);
  const [testingLocal, setTestingLocal] = useState(false);
  const [testingAPI, setTestingAPI] = useState(false);
  const { toast } = useToast();

  // Hooks
  const { translateFrenchToBariba, translateBaribaToFrench, isInitialized } = useTranslationAI();
  const { translateWithAI } = useAITranslation();

  // Fetch test history
  const { data: testHistory, refetch: refetchHistory } = useQuery({
    queryKey: ['model-test-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('model_test_results')
        .select('*')
        .order('tested_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data;
    }
  });

  const testLocalModel = async () => {
    if (!testText.trim()) {
      toast({ title: "Erreur", description: "Veuillez saisir un texte", variant: "destructive" });
      return;
    }

    if (!isInitialized) {
      toast({ title: "Erreur", description: "Le modèle local n'est pas initialisé", variant: "destructive" });
      return;
    }

    setTestingLocal(true);
    const startTime = performance.now();

    try {
      let translation = "";
      if (direction === 'french') {
        translation = await translateFrenchToBariba(testText);
      } else {
        translation = await translateBaribaToFrench(testText);
      }

      const duration = Math.round(performance.now() - startTime);

      const result: TestResult = {
        timestamp: new Date(),
        testPhrase: testText,
        sourceLanguage: direction,
        targetLanguage: direction === 'french' ? 'bariba' : 'french',
        localTranslation: translation,
        localTime: duration,
        localConfidence: 85, // Estimate
      };

      setCurrentResult(prev => ({ ...prev, ...result }));

      toast({
        title: "Test Local Terminé",
        description: `Traduction effectuée en ${duration}ms`,
      });
    } catch (error) {
      console.error('Error testing local model:', error);
      toast({ title: "Erreur", description: "Échec du test local", variant: "destructive" });
    } finally {
      setTestingLocal(false);
    }
  };

  const testAPIModel = async () => {
    if (!testText.trim()) {
      toast({ title: "Erreur", description: "Veuillez saisir un texte", variant: "destructive" });
      return;
    }

    setTestingAPI(true);
    const startTime = performance.now();

    try {
      const sourceLang = direction;
      const targetLang = direction === 'french' ? 'bariba' : 'french';

      const result = await translateWithAI(testText, sourceLang, targetLang);
      const duration = Math.round(performance.now() - startTime);

      if (result) {
        const testResult: TestResult = {
          timestamp: new Date(),
          testPhrase: testText,
          sourceLanguage: direction,
          targetLanguage: targetLang,
          apiTranslation: result.translation,
          apiTime: duration,
          apiConfidence: result.confidence,
        };

        setCurrentResult(prev => ({ ...prev, ...testResult }));

        toast({
          title: "Test API Terminé",
          description: `Traduction effectuée en ${duration}ms (confiance: ${result.confidence}%)`,
        });
      }
    } catch (error) {
      console.error('Error testing API model:', error);
      toast({ title: "Erreur", description: "Échec du test API", variant: "destructive" });
    } finally {
      setTestingAPI(false);
    }
  };

  const testBoth = async () => {
    setCurrentResult(null);
    await Promise.all([testLocalModel(), testAPIModel()]);
  };

  const saveResult = async () => {
    if (!currentResult) return;

    try {
      const { error } = await supabase.from('model_test_results').insert({
        test_phrase: currentResult.testPhrase,
        source_language: currentResult.sourceLanguage,
        target_language: currentResult.targetLanguage,
        local_translation: currentResult.localTranslation,
        api_translation: currentResult.apiTranslation,
        local_confidence: currentResult.localConfidence,
        api_confidence: currentResult.apiConfidence,
        local_duration_ms: currentResult.localTime,
        api_duration_ms: currentResult.apiTime,
        tested_by: (await supabase.auth.getUser()).data.user?.id,
      });

      if (error) throw error;

      toast({ title: "Succès", description: "Résultat sauvegardé" });
      refetchHistory();
    } catch (error) {
      console.error('Error saving result:', error);
      toast({ title: "Erreur", description: "Échec de la sauvegarde", variant: "destructive" });
    }
  };

  const exportHistory = () => {
    if (!testHistory) return;

    const csv = [
      ['Date', 'Phrase', 'Direction', 'Traduction Locale', 'Traduction API', 'Temps Local (ms)', 'Temps API (ms)', 'Confiance Locale', 'Confiance API'].join(','),
      ...testHistory.map(r => [
        new Date(r.tested_at).toLocaleString(),
        `"${r.test_phrase}"`,
        `${r.source_language}->${r.target_language}`,
        `"${r.local_translation || ''}"`,
        `"${r.api_translation || ''}"`,
        r.local_duration_ms || '',
        r.api_duration_ms || '',
        r.local_confidence || '',
        r.api_confidence || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `model-tests-${Date.now()}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5" />
            Panneau de Test du Modèle
          </CardTitle>
          <CardDescription>
            Comparez les performances du modèle local et de l'API Lovable AI
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Test Input */}
          <div>
            <label className="text-sm font-medium mb-2 block">Texte à tester</label>
            <Textarea
              value={testText}
              onChange={(e) => setTestText(e.target.value)}
              placeholder="Saisissez une phrase pour tester..."
              rows={3}
              className="mb-2"
            />
            <div className="flex gap-2">
              <Button
                variant={direction === 'french' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDirection('french')}
              >
                Français → Bariba
              </Button>
              <Button
                variant={direction === 'bariba' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDirection('bariba')}
              >
                Bariba → Français
              </Button>
            </div>
          </div>

          {/* Test Buttons */}
          <div className="flex gap-2 flex-wrap">
            <Button onClick={testLocalModel} disabled={testingLocal || !isInitialized}>
              <Brain className="mr-2 h-4 w-4" />
              {testingLocal ? 'Test en cours...' : 'Tester Modèle Local'}
            </Button>
            <Button onClick={testAPIModel} disabled={testingAPI} variant="secondary">
              <Zap className="mr-2 h-4 w-4" />
              {testingAPI ? 'Test en cours...' : 'Tester API Lovable AI'}
            </Button>
            <Button onClick={testBoth} disabled={testingLocal || testingAPI || !isInitialized}>
              <TrendingUp className="mr-2 h-4 w-4" />
              Tester les Deux
            </Button>
          </div>

          {/* Results Display */}
          {currentResult && (
            <div className="grid md:grid-cols-2 gap-4 mt-6">
              {/* Local Model Result */}
              {currentResult.localTranslation && (
                <Card className="border-primary/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Brain className="h-4 w-4" />
                      Modèle Local
                      <Badge variant="outline" className="ml-auto">
                        {currentResult.localTime}ms
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm mb-2 font-medium">{currentResult.localTranslation}</p>
                    <div className="flex gap-2">
                      <Badge variant="secondary">Confiance: {currentResult.localConfidence}%</Badge>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* API Model Result */}
              {currentResult.apiTranslation && (
                <Card className="border-secondary/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      API Lovable AI
                      <Badge variant="outline" className="ml-auto">
                        {currentResult.apiTime}ms
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm mb-2 font-medium">{currentResult.apiTranslation}</p>
                    <div className="flex gap-2">
                      <Badge variant="secondary">Confiance: {currentResult.apiConfidence}%</Badge>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {currentResult && (currentResult.localTranslation || currentResult.apiTranslation) && (
            <Button onClick={saveResult} variant="outline" size="sm">
              Sauvegarder ce Résultat
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Test History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Historique des Tests</CardTitle>
            <Button onClick={exportHistory} variant="outline" size="sm" disabled={!testHistory?.length}>
              <Download className="mr-2 h-4 w-4" />
              Exporter CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {testHistory && testHistory.length > 0 ? (
            <div className="space-y-2">
              {testHistory.map((test) => (
                <Card key={test.id} className="p-3">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{test.test_phrase}</p>
                      <Badge variant="outline" className="mt-1">
                        {test.source_language} → {test.target_language}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(test.tested_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {test.local_translation && (
                      <div>
                        <span className="text-muted-foreground">Local:</span> {test.local_duration_ms}ms
                      </div>
                    )}
                    {test.api_translation && (
                      <div>
                        <span className="text-muted-foreground">API:</span> {test.api_duration_ms}ms
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              Aucun test enregistré
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
