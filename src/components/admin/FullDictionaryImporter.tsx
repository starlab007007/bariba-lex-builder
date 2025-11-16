import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Upload, CheckCircle2, AlertCircle } from "lucide-react";
import { useGamification } from "@/hooks/useGamification";

interface RawDictionaryEntry {
  word: string;
  phonetic?: string;
  part_of_speech?: string;
  definition: string;
  example_bariba?: string;
  example_francais?: string;
  notes?: string;
  source_flags?: string[];
  incertitude?: number;
}

export function FullDictionaryImporter({ onSuccess }: { onSuccess?: () => void }) {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState({ total: 0, imported: 0, skipped: 0, errors: 0 });
  const { updateAchievement } = useGamification();

  const extractVariants = (word: string): { main: string; variants: string[] } => {
    const parts = word.split('/').map(p => p.trim()).filter(p => p);
    return {
      main: parts[0] || word,
      variants: parts.slice(1)
    };
  };

  const extractFrenchKeywords = (definition: string): string[] => {
    const words = definition
      .toLowerCase()
      .replace(/[^\w\sàâäéèêëïîôùûüÿæœç]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2);
    
    const stopWords = ['les', 'des', 'une', 'pour', 'dans', 'avec', 'sans', 'sur', 'sous', 'par', 'qui', 'que', 'dont'];
    return [...new Set(words.filter(w => !stopWords.includes(w)))];
  };

  const calculateQualityScore = (entry: RawDictionaryEntry): number => {
    let score = 0;
    if (entry.phonetic) score += 0.2;
    if (entry.part_of_speech) score += 0.2;
    if (entry.example_bariba && entry.example_bariba.length > 0) score += 0.2;
    if (entry.example_francais && entry.example_francais.length > 0) score += 0.2;
    if (entry.definition.length > 20) score += 0.2;
    return score;
  };

  const handleImport = async () => {
    setIsLoading(true);
    setProgress(0);
    setStats({ total: 0, imported: 0, skipped: 0, errors: 0 });

    try {
      // Load JSON file
      const response = await fetch('/src/data/dictionnaire-10-2.json');
      const rawEntries: RawDictionaryEntry[] = await response.json();
      
      setStats(prev => ({ ...prev, total: rawEntries.length }));
      toast.info(`Chargement de ${rawEntries.length} entrées du dictionnaire...`);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Vous devez être connecté pour importer");
        setIsLoading(false);
        return;
      }

      // Check existing entries
      const { data: existingEntries } = await supabase
        .from('dictionary_entries')
        .select('word');
      
      const existingWords = new Set(existingEntries?.map(e => e.word.toLowerCase()) || []);

      // Process in batches
      const BATCH_SIZE = 500;
      let imported = 0;
      let skipped = 0;
      let errors = 0;

      for (let i = 0; i < rawEntries.length; i += BATCH_SIZE) {
        const batch = rawEntries.slice(i, i + BATCH_SIZE);
        const entriesToInsert = [];

        for (const raw of batch) {
          try {
            const { main, variants } = extractVariants(raw.word);
            
            // Skip if exists
            if (existingWords.has(main.toLowerCase())) {
              skipped++;
              continue;
            }

            const entry = {
              word: main,
              phonetic: raw.phonetic || null,
              part_of_speech: raw.part_of_speech || null,
              definition: raw.definition,
              example_bariba: raw.example_bariba ? [raw.example_bariba] : [],
              example_francais: raw.example_francais ? [raw.example_francais] : [],
              variants: variants,
              french_keywords: extractFrenchKeywords(raw.definition),
              quality_score: calculateQualityScore(raw),
              is_verified: true,
              created_by: user.id
            };

            entriesToInsert.push(entry);
          } catch (error) {
            console.error('Error processing entry:', raw, error);
            errors++;
          }
        }

        // Insert batch
        if (entriesToInsert.length > 0) {
          const { error } = await supabase
            .from('dictionary_entries')
            .insert(entriesToInsert);

          if (error) {
            console.error('Batch insert error:', error);
            errors += entriesToInsert.length;
          } else {
            imported += entriesToInsert.length;
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

      toast.success(`Import terminé: ${imported} entrées importées, ${skipped} doublons ignorés`);
      if (errors > 0) {
        toast.warning(`${errors} erreurs rencontrées lors de l'import`);
      }
      
      onSuccess?.();
    } catch (error) {
      console.error('Import error:', error);
      toast.error("Erreur lors de l'import du dictionnaire");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Dictionnaire Complet (68k+ entrées)
        </CardTitle>
        <CardDescription>
          Import du fichier dictionnaire-10-2.json contenant l'intégralité du dictionnaire Bariba-Français
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
          {isLoading ? "Import en cours..." : "Importer le dictionnaire complet"}
        </Button>

        <div className="text-xs text-muted-foreground space-y-1">
          <p>⏱️ Durée estimée: 15-20 minutes</p>
          <p>📊 Traitement par lots de 500 entrées</p>
          <p>✅ Vérification automatique des doublons</p>
          <p>🎯 Extraction automatique des variantes et mots-clés français</p>
        </div>
      </CardContent>
    </Card>
  );
}
