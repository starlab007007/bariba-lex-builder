import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Sparkles, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function GenerateTrainingPhrases() {
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  const handleGenerate = async () => {
    setGenerating(true);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      // Fetch dictionary entries with examples
      const { data: entries, error: fetchError } = await supabase
        .from('dictionary_entries')
        .select('word, example_francais, example_bariba')
        .not('example_francais', 'is', null)
        .not('example_bariba', 'is', null);

      if (fetchError) throw fetchError;

      if (!entries || entries.length === 0) {
        toast({
          title: 'Aucun exemple trouvé',
          description: 'Le dictionnaire ne contient pas d\'exemples à convertir en phrases d\'entraînement',
          variant: 'destructive',
        });
        return;
      }

      // Extract training phrases from examples
      const trainingPhrases: Array<{ french_text: string; bariba_text: string }> = [];

      for (const entry of entries) {
        const frenchExamples = entry.example_francais || [];
        const baribaExamples = entry.example_bariba || [];
        
        // Match French and Bariba examples by index
        const minLength = Math.min(frenchExamples.length, baribaExamples.length);
        
        for (let i = 0; i < minLength; i++) {
          if (frenchExamples[i] && baribaExamples[i]) {
            trainingPhrases.push({
              french_text: frenchExamples[i].trim(),
              bariba_text: baribaExamples[i].trim(),
            });
          }
        }
      }

      if (trainingPhrases.length === 0) {
        toast({
          title: 'Aucune phrase générée',
          description: 'Impossible de créer des phrases d\'entraînement à partir des exemples',
          variant: 'destructive',
        });
        return;
      }

      // Check for duplicates
      const uniquePhrases = Array.from(
        new Map(trainingPhrases.map(p => [`${p.french_text}|${p.bariba_text}`, p])).values()
      );

      // Get existing phrases to avoid duplicates
      const { data: existingPhrases } = await supabase
        .from('training_phrases')
        .select('french_text, bariba_text');

      const existingSet = new Set(
        existingPhrases?.map(p => `${p.french_text}|${p.bariba_text}`) || []
      );

      const newPhrases = uniquePhrases.filter(
        p => !existingSet.has(`${p.french_text}|${p.bariba_text}`)
      );

      if (newPhrases.length === 0) {
        toast({
          title: 'Aucune nouvelle phrase',
          description: 'Toutes les phrases extraites existent déjà dans la base',
        });
        return;
      }

      // Insert new phrases
      const { error: insertError } = await supabase
        .from('training_phrases')
        .insert(
          newPhrases.map(p => ({
            french_text: p.french_text,
            bariba_text: p.bariba_text,
            source: 'dictionary_examples',
            is_validated: false,
            created_by: user?.id,
          }))
        );

      if (insertError) throw insertError;

      toast({
        title: 'Phrases générées avec succès',
        description: `${newPhrases.length} phrases d'entraînement créées depuis les exemples du dictionnaire`,
      });
    } catch (error: any) {
      console.error('Error generating phrases:', error);
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Générer des Phrases depuis le Dictionnaire</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Extrait automatiquement les exemples de phrases du dictionnaire pour créer des données d'entraînement.
          Utile pour un premier entraînement du modèle.
        </p>
        <Button
          onClick={handleGenerate}
          disabled={generating}
          className="w-full"
        >
          {generating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Génération en cours...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Générer Phrases d'Entraînement
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}