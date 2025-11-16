import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { BookOpen, CheckCircle2, AlertCircle } from "lucide-react";
import { useGamification } from "@/hooks/useGamification";

interface BiblicalEntry {
  reference: string;
  french: string;
  bariba: string;
}

export function BiblicalPhrasesImporter({ onSuccess }: { onSuccess?: () => void }) {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState({ total: 0, imported: 0, skipped: 0, errors: 0 });
  const { updateAchievement } = useGamification();

  const handleImport = async () => {
    setIsLoading(true);
    setProgress(0);
    setStats({ total: 0, imported: 0, skipped: 0, errors: 0 });

    try {
      // Load JSON file
      const response = await fetch('/src/data/fra_bba_dictionnary.json');
      const rawEntries: BiblicalEntry[] = await response.json();
      
      setStats(prev => ({ ...prev, total: rawEntries.length }));
      toast.info(`Chargement de ${rawEntries.length} phrases bibliques...`);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Vous devez être connecté pour importer");
        setIsLoading(false);
        return;
      }

      // Check existing phrases to avoid duplicates
      const { data: existingPhrases } = await supabase
        .from('training_phrases')
        .select('french_text, bariba_text')
        .eq('source', 'biblical');
      
      const existingSet = new Set(
        existingPhrases?.map(p => `${p.french_text}|${p.bariba_text}`) || []
      );

      // Process in batches
      const BATCH_SIZE = 1000;
      let imported = 0;
      let skipped = 0;
      let errors = 0;

      for (let i = 0; i < rawEntries.length; i += BATCH_SIZE) {
        const batch = rawEntries.slice(i, i + BATCH_SIZE);
        const phrasesToInsert = [];

        for (const raw of batch) {
          try {
            // Skip empty or invalid entries
            if (!raw.french || !raw.bariba || !raw.reference) {
              errors++;
              continue;
            }

            const key = `${raw.french}|${raw.bariba}`;
            
            // Skip if exists
            if (existingSet.has(key)) {
              skipped++;
              continue;
            }

            const phrase = {
              french_text: raw.french,
              bariba_text: raw.bariba,
              source: 'biblical',
              is_validated: true, // Biblical translations are high quality
              quality_score: 0.95, // High quality score for biblical sources
              metadata: {
                reference: raw.reference,
                source_type: 'bible'
              },
              created_by: user.id
            };

            phrasesToInsert.push(phrase);
          } catch (error) {
            console.error('Error processing phrase:', raw, error);
            errors++;
          }
        }

        // Insert batch
        if (phrasesToInsert.length > 0) {
          const { error } = await supabase
            .from('training_phrases')
            .insert(phrasesToInsert);

          if (error) {
            console.error('Batch insert error:', error);
            errors += phrasesToInsert.length;
          } else {
            imported += phrasesToInsert.length;
          }
        }

        // Update progress
        const currentProgress = Math.round(((i + batch.length) / rawEntries.length) * 100);
        setProgress(currentProgress);
        setStats({ total: rawEntries.length, imported, skipped, errors });

        // Pause to avoid UI blocking
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Award achievement
      await updateAchievement('phrases_contributed', imported);

      toast.success(`Import terminé: ${imported} phrases bibliques importées, ${skipped} doublons ignorés`);
      if (errors > 0) {
        toast.warning(`${errors} erreurs rencontrées lors de l'import`);
      }
      
      onSuccess?.();
    } catch (error) {
      console.error('Import error:', error);
      toast.error("Erreur lors de l'import des phrases bibliques");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Phrases Bibliques (152k+ phrases)
        </CardTitle>
        <CardDescription>
          Import du fichier fra_bba_dictionnary.json contenant les traductions bibliques Français-Bariba
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {stats.total > 0 && (
          <div className="space-y-2">
            <Progress value={progress} className="w-full" />
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
                <span>Total: {stats.total}</span>
              </div>
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                <span>Importé: {stats.imported}</span>
              </div>
              <div className="flex items-center gap-2 text-yellow-600">
                <AlertCircle className="h-4 w-4" />
                <span>Doublons: {stats.skipped}</span>
              </div>
              <div className="flex items-center gap-2 text-red-600">
                <AlertCircle className="h-4 w-4" />
                <span>Erreurs: {stats.errors}</span>
              </div>
            </div>
          </div>
        )}

        <Button 
          onClick={handleImport} 
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? "Import en cours..." : "Importer les phrases bibliques"}
        </Button>

        <div className="text-xs text-muted-foreground space-y-1">
          <p>⏱️ Durée estimée: 30-40 minutes</p>
          <p>📊 Traitement par lots de 1000 phrases</p>
          <p>✅ Marquage automatique comme validé (haute qualité)</p>
          <p>📖 Conservation des références bibliques</p>
          <p>🎯 Source: 'biblical' pour traçabilité</p>
        </div>
      </CardContent>
    </Card>
  );
}
