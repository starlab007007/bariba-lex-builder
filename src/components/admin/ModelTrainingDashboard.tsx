/**
 * Dashboard de Fine-Tuning LLM
 * Gère le fine-tuning de Gemma-2B ou NLLB-200 sur les 220k+ paires
 */

import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Cpu, TrendingUp, Database, AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function ModelTrainingDashboard() {
  const [isTraining, setIsTraining] = useState(false);
  const [progress, setProgress] = useState(0);
  const [modelType, setModelType] = useState<'gemma-2b' | 'nllb-200'>('gemma-2b');
  const [maxPairs, setMaxPairs] = useState(5000);
  const [includeValidatedFeedback, setIncludeValidatedFeedback] = useState(true);
  const [trainingResult, setTrainingResult] = useState<any>(null);

  const startFineTuning = async () => {
    if (!confirm(`Préparer les données pour fine-tuning ${modelType.toUpperCase()} ? (${maxPairs} paires)`)) {
      return;
    }

    try {
      setIsTraining(true);
      setProgress(0);
      toast.info('Préparation des données pour fine-tuning...');

      // Simuler le progrès
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      const { data, error } = await supabase.functions.invoke('fine-tune-model', {
        body: {
          modelType,
          maxPairs,
          includeValidatedFeedback
        }
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (error) throw error;

      setTrainingResult(data);
      toast.success('Données préparées avec succès!');
    } catch (error: any) {
      toast.error(`Erreur: ${error.message}`);
    } finally {
      setIsTraining(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cpu className="h-5 w-5" />
            Fine-Tuning LLM Personnalisé
          </CardTitle>
          <CardDescription>
            Entraînez un modèle spécialisé Français-Baatonum sur 220k+ paires
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium mb-2 block">Modèle</label>
                <Select 
                  value={modelType} 
                  onValueChange={(val: 'gemma-2b' | 'nllb-200') => setModelType(val)}
                  disabled={isTraining}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gemma-2b">
                      Gemma-2B (Google) - Léger et rapide
                    </SelectItem>
                    <SelectItem value="nllb-200">
                      NLLB-200 (Meta) - Spécialisé multilingue
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  {modelType === 'gemma-2b' 
                    ? 'Recommandé pour débuter - Plus facile à héberger'
                    : 'Meilleure qualité pour langues à faibles ressources'}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Nombre de paires</label>
                <Select 
                  value={maxPairs.toString()} 
                  onValueChange={(val) => setMaxPairs(parseInt(val))}
                  disabled={isTraining}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1000">1,000 paires (test)</SelectItem>
                    <SelectItem value="5000">5,000 paires (recommandé)</SelectItem>
                    <SelectItem value="10000">10,000 paires</SelectItem>
                    <SelectItem value="50000">50,000 paires (max)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Plus de paires = meilleure qualité mais coût + élevé
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={includeValidatedFeedback}
                onChange={(e) => setIncludeValidatedFeedback(e.target.checked)}
                disabled={isTraining}
                className="h-4 w-4"
              />
              <label className="text-sm">
                Inclure les feedbacks utilisateur validés
              </label>
            </div>

            {isTraining && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Préparation en cours...</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} />
              </div>
            )}

            <div className="flex gap-4">
              <Button
                onClick={startFineTuning}
                disabled={isTraining}
                size="lg"
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                {isTraining ? 'Préparation...' : 'Préparer Fine-Tuning'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Résultat */}
      {trainingResult && (
        <Card className="border-green-200 bg-green-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700">
              <Database className="h-5 w-5" />
              Données Préparées
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <div className="text-sm text-muted-foreground">Total Paires</div>
                <div className="text-2xl font-bold">{trainingResult.summary.totalPairs}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Dictionnaire</div>
                <div className="text-2xl font-bold">{trainingResult.summary.dictionaryPairs}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Feedbacks</div>
                <div className="text-2xl font-bold">{trainingResult.summary.feedbackPairs}</div>
              </div>
            </div>

            <div>
              <div className="text-sm font-medium mb-2">Catégories couvertes:</div>
              <div className="flex flex-wrap gap-2">
                {trainingResult.summary.categories.map((cat: string) => (
                  <Badge key={cat} variant="outline">{cat}</Badge>
                ))}
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="text-sm font-medium mb-2">Prochaines étapes:</div>
              <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                {trainingResult.nextSteps.map((step: string, i: number) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Informations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Informations Importantes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <h4 className="font-semibold mb-2">📊 Performance attendue:</h4>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Gemma-2B: Confiance 75-90%, Latence 100-300ms</li>
              <li>NLLB-200: Confiance 80-95%, Latence 200-500ms</li>
              <li>Amélioration de +15-20 points vs modèle de base</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-2">💰 Coûts estimés:</h4>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Entraînement GPU (une fois): $100-500</li>
              <li>Hébergement modèle: $20-100/mois</li>
              <li>Inférence par requête: $0.0001-0.001</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-2">🔧 Configuration requise:</h4>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>API Hugging Face (pour Gemma-2B)</li>
              <li>ou Google Cloud Vertex AI</li>
              <li>ou Meta NLLB API (pour NLLB-200)</li>
            </ul>
          </div>

          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm">
              <strong>Note:</strong> Cette fonctionnalité prépare les données pour le fine-tuning. 
              Pour lancer le vrai entraînement, vous devrez configurer une API externe (Hugging Face, Google Cloud, etc.)
              et suivre leur documentation de fine-tuning.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
