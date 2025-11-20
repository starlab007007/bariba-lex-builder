/**
 * Composant de test pour le système de traduction hybride
 * Permet de valider BaatonuTranslationAI, RAG, et tous les niveaux de la cascade
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useHybridTranslation } from '@/hooks/useHybridTranslation';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  FlaskConical, 
  ArrowRight, 
  CheckCircle2, 
  Clock,
  Zap,
  AlertCircle,
  TrendingUp,
  Sparkles
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const TEST_PHRASES = {
  simple: [
    "Bonjour, comment allez-vous ?",
    "Je suis heureux de te voir",
    "L'eau est froide",
  ],
  complex: [
    "Le professeur enseigne aux élèves dans la grande salle de classe",
    "Les enfants jouent avec leurs amis dans le jardin de l'école",
    "Ma mère cuisine un délicieux repas pour toute la famille",
  ],
  idiomatic: [
    "avoir la tête dans les nuages",
    "mettre la charrue avant les bœufs",
    "tourner autour du pot",
  ],
  grammatical: [
    "Les grands arbres donnent beaucoup d'ombrage",
    "La petite fille mange des fruits rouges",
    "Nous allons au marché tous les matins",
  ],
};

export const HybridTranslationTester = () => {
  const { toast } = useToast();
  const {
    translateFrenchToBariba,
    isLoading,
    isInitialized,
    getStats,
  } = useHybridTranslation();

  const [currentPhrase, setCurrentPhrase] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isTesting, setIsTesting] = useState(false);

  const testPhrase = async (phrase: string) => {
    try {
      const startTime = Date.now();
      const result = await translateFrenchToBariba(phrase);
      const duration = Date.now() - startTime;

      return {
        input: phrase,
        output: result.translation,
        confidence: result.confidence,
        method: result.method,
        duration,
        ragExamples: result.ragExamples,
      };
    } catch (error: any) {
      console.error('Erreur test:', error);
      return {
        input: phrase,
        output: 'ERREUR',
        confidence: 0,
        method: 'error',
        duration: 0,
        error: error.message,
      };
    }
  };

  const runSingleTest = async () => {
    if (!currentPhrase.trim()) {
      toast({
        title: "Erreur",
        description: "Entrez une phrase à tester",
        variant: "destructive",
      });
      return;
    }

    setIsTesting(true);
    try {
      const result = await testPhrase(currentPhrase);
      setResults([result, ...results]);
      
      toast({
        title: "Test réussi",
        description: `Méthode: ${result.method} (${result.confidence}%)`,
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const runBatchTest = async (category: keyof typeof TEST_PHRASES) => {
    setIsTesting(true);
    const batchResults: any[] = [];

    try {
      const phrases = TEST_PHRASES[category];
      
      for (const phrase of phrases) {
        const result = await testPhrase(phrase);
        batchResults.push(result);
        setResults(prev => [result, ...prev]);
      }

      const avgConfidence = batchResults.reduce((sum, r) => sum + r.confidence, 0) / batchResults.length;
      const avgDuration = batchResults.reduce((sum, r) => sum + r.duration, 0) / batchResults.length;

      toast({
        title: "Tests terminés",
        description: `${batchResults.length} phrases testées (${avgConfidence.toFixed(0)}% confiance moyenne, ${avgDuration.toFixed(0)}ms)`,
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const clearResults = () => {
    setResults([]);
  };

  const getMethodColor = (method: string) => {
    const colors: Record<string, string> = {
      idiom: 'bg-purple-500',
      context: 'bg-blue-500',
      rag: 'bg-green-500',
      simplified: 'bg-yellow-500',
      advanced: 'bg-orange-500',
      ai: 'bg-red-500',
      fallback: 'bg-gray-500',
      error: 'bg-destructive',
    };
    return colors[method] || 'bg-muted';
  };

  const getMethodIcon = (method: string) => {
    const icons: Record<string, any> = {
      idiom: Sparkles,
      context: Clock,
      rag: TrendingUp,
      simplified: Zap,
      advanced: FlaskConical,
      ai: Sparkles,
      fallback: AlertCircle,
      error: AlertCircle,
    };
    const Icon = icons[method] || FlaskConical;
    return <Icon className="w-4 h-4" />;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">Chargement du système de traduction...</p>
        </CardContent>
      </Card>
    );
  }

  if (!isInitialized) {
    return (
      <Card>
        <CardContent className="p-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Système de traduction non initialisé. Rechargez la page.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const stats = getStats();

  return (
    <div className="space-y-6">
      {/* Statistiques */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-primary" />
            Test du Système Hybride
          </CardTitle>
          <CardDescription>
            Valider BaatonuTranslationAI, RAG, et tous les niveaux de la cascade
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Idiomes</p>
              <p className="text-2xl font-bold">{stats.idiomCount}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Contexte</p>
              <p className="text-2xl font-bold">{stats.contextSize}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">SimplifiedAI</p>
              <Badge variant={stats.simplifiedReady ? "default" : "secondary"}>
                {stats.simplifiedReady ? "Actif" : "Inactif"}
              </Badge>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">BaatonuAI</p>
              <Badge variant={stats.advancedReady ? "default" : "secondary"}>
                {stats.advancedReady ? "Actif" : "Inactif"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Zone de test */}
      <Card>
        <CardHeader>
          <CardTitle>Test Manuel</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Entrez une phrase en français à traduire..."
            value={currentPhrase}
            onChange={(e) => setCurrentPhrase(e.target.value)}
            rows={3}
          />
          <Button
            onClick={runSingleTest}
            disabled={isTesting || !currentPhrase.trim()}
            className="w-full"
          >
            <FlaskConical className="w-4 h-4 mr-2" />
            Tester la Traduction
          </Button>
        </CardContent>
      </Card>

      {/* Tests par lot */}
      <Card>
        <CardHeader>
          <CardTitle>Tests par Catégorie</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="simple">
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="simple">Simple</TabsTrigger>
              <TabsTrigger value="complex">Complexe</TabsTrigger>
              <TabsTrigger value="idiomatic">Idiomes</TabsTrigger>
              <TabsTrigger value="grammatical">Grammaire</TabsTrigger>
            </TabsList>

            {Object.entries(TEST_PHRASES).map(([category, phrases]) => (
              <TabsContent key={category} value={category} className="space-y-4">
                <div className="space-y-2">
                  {phrases.map((phrase, idx) => (
                    <div key={idx} className="p-3 bg-muted rounded-lg text-sm">
                      {phrase}
                    </div>
                  ))}
                </div>
                <Button
                  onClick={() => runBatchTest(category as keyof typeof TEST_PHRASES)}
                  disabled={isTesting}
                  className="w-full"
                >
                  Tester ces {phrases.length} phrases
                </Button>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Résultats */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Résultats ({results.length})</CardTitle>
              <Button variant="outline" size="sm" onClick={clearResults}>
                Effacer
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {results.map((result, idx) => (
              <div
                key={idx}
                className="border rounded-lg p-4 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium">Entrée:</p>
                    <p className="text-muted-foreground">{result.input}</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground mx-4 mt-5" />
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium">Sortie:</p>
                    <p className="font-semibold">{result.output}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={`${getMethodColor(result.method)} text-white`}>
                    {getMethodIcon(result.method)}
                    <span className="ml-1">{result.method}</span>
                  </Badge>
                  <Badge variant="outline">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    {result.confidence}%
                  </Badge>
                  <Badge variant="outline">
                    <Clock className="w-3 h-3 mr-1" />
                    {result.duration}ms
                  </Badge>
                  {result.ragExamples && (
                    <Badge variant="outline">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      {result.ragExamples} exemples RAG
                    </Badge>
                  )}
                </div>

                {result.error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{result.error}</AlertDescription>
                  </Alert>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};