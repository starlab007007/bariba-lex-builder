import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Plus, Wand2, Loader2, CheckCircle, XCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function TrainingDataEnhancer() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPhrases, setGeneratedPhrases] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, validated: 0, pending: 0 });
  const { toast } = useToast();

  const loadStats = async () => {
    const { data, error } = await supabase
      .from('training_phrases')
      .select('is_validated, source');

    if (!error && data) {
      const total = data.length;
      const validated = data.filter(p => p.is_validated).length;
      const pending = total - validated;
      setStats({ total, validated, pending });
    }
  };

  useState(() => {
    loadStats();
  });

  const generatePhrases = async (mode: 'generate' | 'augment') => {
    setIsGenerating(true);
    setGeneratedPhrases([]);

    try {
      toast({
        title: "🤖 Génération en cours...",
        description: `Mode: ${mode === 'generate' ? 'Création de nouvelles phrases' : 'Augmentation du dictionnaire'}`,
      });

      const { data, error } = await supabase.functions.invoke('enhance-training-data', {
        body: {
          mode,
          count: mode === 'generate' ? 15 : 10
        }
      });

      if (error) throw error;

      setGeneratedPhrases(data.phrases || []);
      await loadStats();

      toast({
        title: "✅ Génération réussie",
        description: `${data.generated_count} nouvelles phrases créées avec IA avancée`,
      });

    } catch (error: any) {
      console.error('Error generating phrases:', error);
      toast({
        title: "❌ Erreur",
        description: error.message || "Impossible de générer les phrases",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const validatePhrase = async (phraseId: string, isValid: boolean) => {
    try {
      const { error } = await supabase
        .from('training_phrases')
        .update({ 
          is_validated: isValid,
          quality_score: isValid ? 0.95 : 0.3
        })
        .eq('id', phraseId);

      if (error) throw error;

      setGeneratedPhrases(prev => 
        prev.map(p => p.id === phraseId ? { ...p, is_validated: isValid } : p)
      );

      await loadStats();

      toast({
        title: isValid ? "✅ Phrase validée" : "❌ Phrase rejetée",
        description: isValid ? "Ajoutée aux données d'entraînement" : "Marquée comme invalide",
      });

    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Enrichissement IA des Données d'Entraînement
          </h2>
          <p className="text-muted-foreground mt-1">
            Générez automatiquement de nouvelles phrases d'entraînement avec Lovable AI
          </p>
        </div>

        <div className="flex gap-2">
          <Badge variant="outline" className="text-sm">
            {stats.total} Total
          </Badge>
          <Badge variant="default" className="text-sm">
            {stats.validated} Validées
          </Badge>
          <Badge variant="secondary" className="text-sm">
            {stats.pending} En attente
          </Badge>
        </div>
      </div>

      {/* Info Alert */}
      <Alert>
        <Sparkles className="h-4 w-4" />
        <AlertDescription>
          <strong>Architecture Transformer Seq2Seq</strong> : Ce système utilise Lovable AI (Gemini 2.5 Flash) 
          pour générer des paires de phrases French-Bariba en appliquant :
          <ul className="list-disc ml-6 mt-2 space-y-1">
            <li><strong>Tokenisation</strong> : Reconnaissance des caractères spéciaux bariba (ɔ, ɛ, ɡ, kp, tons)</li>
            <li><strong>Analyse Sémantique</strong> : Mapping contextuel des concepts français vers bariba</li>
            <li><strong>Génération Morphologique</strong> : Application des patterns grammaticaux bariba</li>
            <li><strong>Validation</strong> : Vérification contre le dictionnaire existant</li>
          </ul>
        </AlertDescription>
      </Alert>

      {/* Action Buttons */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <Plus className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg mb-2">Génération de Nouvelles Phrases</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Créez des phrases complètement nouvelles en utilisant le vocabulaire du dictionnaire. 
                L'IA génère des phrases diversifiées couvrant différents contextes.
              </p>
              <Button 
                onClick={() => generatePhrases('generate')}
                disabled={isGenerating}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Génération en cours...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Générer 15 Phrases
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-secondary/10 rounded-lg">
              <Wand2 className="h-6 w-6 text-secondary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg mb-2">Augmentation du Dictionnaire</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Générez des variations de phrases à partir des entrées du dictionnaire. 
                L'IA crée des contextes d'utilisation variés pour chaque mot.
              </p>
              <Button 
                onClick={() => generatePhrases('augment')}
                disabled={isGenerating}
                variant="secondary"
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Augmentation en cours...
                  </>
                ) : (
                  <>
                    <Wand2 className="mr-2 h-4 w-4" />
                    Augmenter avec 10 Entrées
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Generated Phrases */}
      {generatedPhrases.length > 0 && (
        <Card className="p-6">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-primary" />
            Phrases Générées ({generatedPhrases.length})
          </h3>
          <div className="space-y-4">
            {generatedPhrases.map((phrase) => (
              <div key={phrase.id} className="p-4 border rounded-lg space-y-2">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div>
                      <span className="text-xs font-medium text-muted-foreground">Français:</span>
                      <p className="text-sm">{phrase.french_text}</p>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-muted-foreground">Bariba:</span>
                      <p className="text-sm bariba-text text-primary">{phrase.bariba_text}</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-xs">
                        {phrase.source}
                      </Badge>
                      {phrase.is_validated !== null && (
                        <Badge variant={phrase.is_validated ? "default" : "destructive"} className="text-xs">
                          {phrase.is_validated ? "Validée" : "Rejetée"}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {phrase.is_validated === null && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => validatePhrase(phrase.id, true)}
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => validatePhrase(phrase.id, false)}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Methodology Info */}
      <Card className="p-6 bg-gradient-to-br from-accent/5 to-primary/5">
        <h3 className="font-semibold text-lg mb-3">Méthodologie d'Entraînement NMT</h3>
        <div className="space-y-3 text-sm text-muted-foreground">
          <div>
            <strong className="text-foreground">1. Tokenisation Bariba :</strong> Le modèle apprend à reconnaître 
            les morphèmes spécifiques (kp, ɡ, ɔ, ɛ) et les marques tonales (á, à, ã).
          </div>
          <div>
            <strong className="text-foreground">2. Encodage Français :</strong> L'encodeur Transformer analyse 
            la phrase française et crée une représentation sémantique vectorielle.
          </div>
          <div>
            <strong className="text-foreground">3. Décodage Bariba :</strong> Le décodeur génère la traduction 
            token par token en appliquant la grammaire bariba (S+V+O).
          </div>
          <div>
            <strong className="text-foreground">4. Apprentissage Supervisé :</strong> Le modèle compare ses 
            prédictions aux traductions correctes et ajuste ses paramètres.
          </div>
        </div>
      </Card>
    </div>
  );
}