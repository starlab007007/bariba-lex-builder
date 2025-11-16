import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useTranslationAI } from "@/hooks/useTranslationAI";
import { useAITranslation } from "@/hooks/useAITranslation";
import { ArrowRight, Brain, Sparkles, User, Loader2, RefreshCw } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ComparisonResult {
  input: string;
  direction: 'french-to-bariba' | 'bariba-to-french';
  localTranslation?: string;
  localTime?: number;
  apiTranslation?: string;
  apiTime?: number;
  apiConfidence?: number;
  humanTranslation?: string;
  timestamp: Date;
}

export default function TranslationComparisonDashboard() {
  const [inputText, setInputText] = useState("");
  const [direction, setDirection] = useState<'french-to-bariba' | 'bariba-to-french'>('french-to-bariba');
  const [results, setResults] = useState<ComparisonResult[]>([]);
  const [testing, setTesting] = useState(false);
  const { toast } = useToast();

  const {
    translateFrenchToBariba,
    translateBaribaToFrench,
    isInitialized: localReady
  } = useTranslationAI();

  const { translateWithAI, isLoading: apiLoading } = useAITranslation();

  const runComparison = async () => {
    if (!inputText.trim()) {
      toast({
        title: "Texte requis",
        description: "Veuillez saisir un texte à traduire",
        variant: "destructive"
      });
      return;
    }

    setTesting(true);

    const result: ComparisonResult = {
      input: inputText,
      direction,
      timestamp: new Date()
    };

    try {
      // Test Local Model
      if (localReady) {
        const startLocal = performance.now();
        try {
          if (direction === 'french-to-bariba') {
            result.localTranslation = await translateFrenchToBariba(inputText);
          } else {
            result.localTranslation = await translateBaribaToFrench(inputText);
          }
          result.localTime = Math.round(performance.now() - startLocal);
        } catch (err) {
          console.error('Local model error:', err);
          result.localTranslation = "❌ Erreur";
        }
      } else {
        result.localTranslation = "⏳ Modèle non initialisé";
      }

      // Test API Model
      const startAPI = performance.now();
      try {
        const sourceLang = direction === 'french-to-bariba' ? 'french' : 'bariba';
        const targetLang = direction === 'french-to-bariba' ? 'bariba' : 'french';
        
        const apiResult = await translateWithAI(inputText, sourceLang, targetLang);
        
        if (apiResult) {
          result.apiTranslation = apiResult.translation;
          result.apiConfidence = apiResult.confidence;
          result.apiTime = Math.round(performance.now() - startAPI);
        } else {
          result.apiTranslation = "❌ Erreur API";
        }
      } catch (err) {
        console.error('API error:', err);
        result.apiTranslation = "❌ Erreur API";
      }

      // Add to results
      setResults(prev => [result, ...prev]);

      toast({
        title: "✅ Comparaison terminée",
        description: `Local: ${result.localTime}ms | API: ${result.apiTime}ms`
      });

    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setTesting(false);
    }
  };

  const getDifferenceAnalysis = (result: ComparisonResult) => {
    const local = result.localTranslation || "";
    const api = result.apiTranslation || "";
    
    if (local === api) {
      return { status: "identical", message: "✅ Traductions identiques" };
    }
    
    const localWords = local.toLowerCase().split(/\s+/).filter(w => w.length > 0);
    const apiWords = api.toLowerCase().split(/\s+/).filter(w => w.length > 0);
    
    const commonWords = localWords.filter(word => apiWords.includes(word));
    const similarity = commonWords.length / Math.max(localWords.length, apiWords.length);
    
    if (similarity > 0.8) {
      return { status: "similar", message: "⚠️ Traductions similaires (>80%)" };
    } else if (similarity > 0.5) {
      return { status: "different", message: "⚠️ Traductions différentes (50-80%)" };
    } else {
      return { status: "very-different", message: "❌ Traductions très différentes (<50%)" };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <RefreshCw className="h-6 w-6 text-primary" />
          Tableau de Bord Comparatif des Traductions
        </h2>
        <p className="text-muted-foreground mt-1">
          Comparez les performances du modèle local vs API Lovable AI vs traductions humaines
        </p>
      </div>

      {/* Info */}
      <Alert>
        <Brain className="h-4 w-4" />
        <AlertDescription>
          <strong>Architecture de Comparaison</strong> : Testez la même phrase avec les 3 méthodes pour 
          identifier les forces et faiblesses de chaque approche. Le modèle local est rapide mais limité 
          au dictionnaire, l'API est plus intelligente mais coûte des crédits.
        </AlertDescription>
      </Alert>

      {/* Input Section */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Button
              variant={direction === 'french-to-bariba' ? 'default' : 'outline'}
              onClick={() => setDirection('french-to-bariba')}
              className="flex-1"
            >
              Français → Bariba
            </Button>
            <Button
              variant={direction === 'bariba-to-french' ? 'default' : 'outline'}
              onClick={() => setDirection('bariba-to-french')}
              className="flex-1"
            >
              Bariba → Français
            </Button>
          </div>

          <Input
            placeholder={direction === 'french-to-bariba' 
              ? "Entrez une phrase en français..." 
              : "Entrez une phrase en bariba..."}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className={direction === 'bariba-to-french' ? 'bariba-text' : ''}
          />

          <Button 
            onClick={runComparison}
            disabled={testing || !inputText.trim() || !localReady}
            className="w-full"
          >
            {testing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Comparaison en cours...
              </>
            ) : (
              <>
                <ArrowRight className="mr-2 h-4 w-4" />
                Comparer les 3 Méthodes
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Résultats de Comparaison ({results.length})</h3>
          
          {results.map((result, index) => {
            const analysis = getDifferenceAnalysis(result);
            
            return (
              <Card key={index} className="p-6">
                <div className="space-y-4">
                  {/* Input */}
                  <div className="pb-4 border-b">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline">
                        {result.direction === 'french-to-bariba' ? 'FR → BBA' : 'BBA → FR'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {result.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="font-medium text-foreground">
                      "{result.input}"
                    </p>
                  </div>

                  {/* Comparison Grid */}
                  <div className="grid md:grid-cols-3 gap-4">
                    {/* Local Model */}
                    <div className="p-4 bg-accent/20 rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Brain className="h-4 w-4 text-primary" />
                          <span className="font-semibold text-sm">Modèle Local</span>
                        </div>
                        {result.localTime && (
                          <Badge variant="secondary" className="text-xs">
                            {result.localTime}ms
                          </Badge>
                        )}
                      </div>
                      <p className={`text-sm ${result.direction === 'french-to-bariba' ? 'bariba-text' : ''}`}>
                        {result.localTranslation || "N/A"}
                      </p>
                      <div className="text-xs text-muted-foreground">
                        ✓ Gratuit • Rapide • Basé dictionnaire
                      </div>
                    </div>

                    {/* API Model */}
                    <div className="p-4 bg-primary/10 rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-primary" />
                          <span className="font-semibold text-sm">API Lovable AI</span>
                        </div>
                        <div className="flex gap-1">
                          {result.apiConfidence && (
                            <Badge variant="default" className="text-xs">
                              {result.apiConfidence}%
                            </Badge>
                          )}
                          {result.apiTime && (
                            <Badge variant="secondary" className="text-xs">
                              {result.apiTime}ms
                            </Badge>
                          )}
                        </div>
                      </div>
                      <p className={`text-sm ${result.direction === 'french-to-bariba' ? 'bariba-text' : ''}`}>
                        {result.apiTranslation || "N/A"}
                      </p>
                      <div className="text-xs text-muted-foreground">
                        💰 Payant • Contextuel • IA avancée
                      </div>
                    </div>

                    {/* Human Validation (Placeholder) */}
                    <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg space-y-2">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-green-600" />
                        <span className="font-semibold text-sm">Validation Humaine</span>
                      </div>
                      <p className="text-sm text-muted-foreground italic">
                        {result.humanTranslation || "Pas encore validée"}
                      </p>
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="w-full text-xs"
                        onClick={() => {
                          // TODO: Open validation dialog
                          toast({
                            title: "Fonctionnalité à venir",
                            description: "Interface de validation manuelle en développement"
                          });
                        }}
                      >
                        Ajouter validation humaine
                      </Button>
                    </div>
                  </div>

                  {/* Analysis */}
                  <div className={`p-3 rounded-lg ${
                    analysis.status === 'identical' ? 'bg-green-50 dark:bg-green-950/20' :
                    analysis.status === 'similar' ? 'bg-yellow-50 dark:bg-yellow-950/20' :
                    'bg-red-50 dark:bg-red-950/20'
                  }`}>
                    <p className="text-sm font-medium">{analysis.message}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {results.length === 0 && (
        <Card className="p-12">
          <div className="text-center space-y-2">
            <RefreshCw className="h-12 w-12 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">
              Aucune comparaison effectuée. Entrez un texte et lancez une comparaison.
            </p>
          </div>
        </Card>
      )}

      {/* Statistics */}
      {results.length > 0 && (
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Statistiques de Comparaison</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 bg-accent/20 rounded-lg">
              <p className="text-2xl font-bold text-primary">
                {Math.round(results.reduce((acc, r) => acc + (r.localTime || 0), 0) / results.length)}ms
              </p>
              <p className="text-sm text-muted-foreground">Temps moyen local</p>
            </div>
            <div className="p-4 bg-accent/20 rounded-lg">
              <p className="text-2xl font-bold text-primary">
                {Math.round(results.reduce((acc, r) => acc + (r.apiTime || 0), 0) / results.length)}ms
              </p>
              <p className="text-sm text-muted-foreground">Temps moyen API</p>
            </div>
            <div className="p-4 bg-accent/20 rounded-lg">
              <p className="text-2xl font-bold text-primary">
                {Math.round(results.reduce((acc, r) => acc + (r.apiConfidence || 0), 0) / results.length)}%
              </p>
              <p className="text-sm text-muted-foreground">Confiance API moyenne</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}