/**
 * Interface admin pour fine-tuner NLLB-200 avec les données français-bariba
 */

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Download, Code, CheckCircle2, AlertCircle } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const NLLB200FineTuningPanel = () => {
  const { toast } = useToast();
  const [isPreparingData, setIsPreparingData] = useState(false);
  const [progress, setProgress] = useState(0);
  const [preparationResult, setPreparationResult] = useState<any>(null);
  const [maxPairs, setMaxPairs] = useState("50000");

  const prepareFineTuningData = async () => {
    try {
      setIsPreparingData(true);
      setProgress(10);

      toast({
        title: "Préparation des données",
        description: "Collecte de toutes les paires français-bariba...",
      });

      const { data, error } = await supabase.functions.invoke('fine-tune-nllb', {
        body: { maxPairs: parseInt(maxPairs) }
      });

      setProgress(50);

      if (error) throw error;

      setProgress(100);
      setPreparationResult(data);

      toast({
        title: "Données préparées !",
        description: `${data.statistics.total_pairs} paires prêtes pour le fine-tuning`,
      });
    } catch (error) {
      console.error("Erreur:", error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Échec de la préparation",
        variant: "destructive",
      });
    } finally {
      setIsPreparingData(false);
    }
  };

  const downloadTrainingData = async () => {
    if (!preparationResult) return;

    try {
      const { data, error } = await supabase
        .from('ai_training_context')
        .select('training_data')
        .eq('id', preparationResult.context_id)
        .single();

      if (error) throw error;

      // Créer un fichier JSONL à télécharger
      const jsonlContent = (data.training_data as any).jsonl_preview || '';
      const blob = new Blob([jsonlContent], { type: 'application/jsonl' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nllb-training-data-${Date.now()}.jsonl`;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: "Téléchargement réussi",
        description: "Fichier JSONL téléchargé",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de télécharger les données",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Fine-Tuning NLLB-200
          </CardTitle>
          <CardDescription>
            Préparez et lancez le fine-tuning de NLLB-200 (600M) sur vos 220k+ paires français-bariba
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Configuration */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre maximum de paires d'entraînement</Label>
              <Select value={maxPairs} onValueChange={setMaxPairs}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10000">10,000 paires (test rapide)</SelectItem>
                  <SelectItem value="50000">50,000 paires (recommandé)</SelectItem>
                  <SelectItem value="100000">100,000 paires (optimal)</SelectItem>
                  <SelectItem value="220000">220,000+ paires (complet)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={prepareFineTuningData}
              disabled={isPreparingData}
              className="w-full"
              size="lg"
            >
              <Download className="w-4 h-4 mr-2" />
              {isPreparingData ? "Préparation en cours..." : "Préparer les données"}
            </Button>

            {isPreparingData && (
              <div className="space-y-2">
                <Progress value={progress} />
                <p className="text-sm text-muted-foreground text-center">
                  Collecte et formatage des données...
                </p>
              </div>
            )}
          </div>

          {/* Résultats */}
          {preparationResult && (
            <div className="space-y-4 border-t pt-6">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="w-5 h-5" />
                <h3 className="font-semibold">Données prêtes pour le fine-tuning</h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Total de paires</p>
                  <p className="text-2xl font-bold">{preparationResult.statistics.total_pairs.toLocaleString()}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">FR → Bariba</p>
                  <p className="text-2xl font-bold">{preparationResult.statistics.french_to_bariba.toLocaleString()}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Phrases entraînement</p>
                  <p className="text-lg font-semibold">{preparationResult.statistics.sources.training_phrases.toLocaleString()}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Exemples dictionnaire</p>
                  <p className="text-lg font-semibold">{preparationResult.statistics.sources.dictionary_examples.toLocaleString()}</p>
                </div>
              </div>

              <Button onClick={downloadTrainingData} variant="outline" className="w-full">
                <Download className="w-4 h-4 mr-2" />
                Télécharger le fichier JSONL
              </Button>

              {/* Instructions Python */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Code className="w-4 h-4" />
                  Script Python pour Hugging Face
                </Label>
                <Textarea
                  value={preparationResult.instructions.python_script}
                  readOnly
                  rows={15}
                  className="font-mono text-xs"
                />
              </div>

              {/* Étapes suivantes */}
              <div className="space-y-3 bg-muted p-4 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div className="space-y-2">
                    <h4 className="font-semibold">Prochaines étapes :</h4>
                    <ol className="list-decimal list-inside space-y-1 text-sm">
                      {preparationResult.next_steps.map((step: string, i: number) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ol>
                  </div>
                </div>
              </div>

              {/* Recommandations */}
              <div className="space-y-2">
                <h4 className="font-semibold">Recommandations d'entraînement :</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between p-2 bg-muted rounded">
                    <span>Modèle de base:</span>
                    <Badge variant="secondary">facebook/nllb-200-distilled-600M</Badge>
                  </div>
                  <div className="flex justify-between p-2 bg-muted rounded">
                    <span>Learning rate:</span>
                    <Badge variant="secondary">5e-5</Badge>
                  </div>
                  <div className="flex justify-between p-2 bg-muted rounded">
                    <span>Batch size:</span>
                    <Badge variant="secondary">8</Badge>
                  </div>
                  <div className="flex justify-between p-2 bg-muted rounded">
                    <span>Epochs:</span>
                    <Badge variant="secondary">5</Badge>
                  </div>
                  <div className="flex justify-between p-2 bg-muted rounded">
                    <span>GPU recommandé:</span>
                    <Badge variant="secondary">A100 ou V100</Badge>
                  </div>
                  <div className="flex justify-between p-2 bg-muted rounded">
                    <span>Temps estimé:</span>
                    <Badge variant="secondary">~24-48h</Badge>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
