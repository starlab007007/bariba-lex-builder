import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Database, Trash2, Upload, Download } from "lucide-react";

interface ImportStats {
  phrasesProcessed: number;
  phrasesImported: number;
  dictionaryProcessed: number;
  dictionaryImported: number;
  duplicatesRemoved: number;
  errors: string[];
}

export function ComprehensiveDataImporter() {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState<ImportStats | null>(null);
  const [backupCreated, setBackupCreated] = useState(false);

  const createBackup = async () => {
    try {
      setIsProcessing(true);
      setProgress(10);
      toast({ title: "🔄 Création du backup..." });

      // Backup training phrases
      const { data: phrases } = await supabase
        .from('training_phrases')
        .select('*');

      // Backup dictionary
      const { data: dictionary } = await supabase
        .from('dictionary_entries')
        .select('*');

      // Backup idioms
      const { data: idioms } = await supabase
        .from('idiomatic_expressions')
        .select('*');

      setProgress(50);

      // Create backup JSON
      const backup = {
        timestamp: new Date().toISOString(),
        training_phrases: phrases || [],
        dictionary_entries: dictionary || [],
        idiomatic_expressions: idioms || []
      };

      // Download backup
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      setProgress(100);
      setBackupCreated(true);
      toast({ 
        title: "✅ Backup créé", 
        description: "Les anciennes données ont été sauvegardées" 
      });
    } catch (error: any) {
      toast({ 
        title: "❌ Erreur backup", 
        description: error.message,
        variant: "destructive" 
      });
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const clearAllData = async () => {
    if (!confirm("⚠️ ATTENTION: Cette action va supprimer TOUTES les anciennes données. Voulez-vous continuer ?")) {
      return;
    }

    try {
      setIsProcessing(true);
      setProgress(10);
      toast({ title: "🗑️ Suppression des anciennes données..." });

      // Clear all tables
      await supabase.from('translation_memory').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      setProgress(25);
      
      await supabase.from('training_phrases').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      setProgress(50);
      
      await supabase.from('idiomatic_expressions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      setProgress(75);
      
      await supabase.from('dictionary_entries').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      setProgress(100);

      // Clear localStorage cache
      localStorage.removeItem('dictionary_cache_v2');
      localStorage.removeItem('dictionary_cache');

      toast({ 
        title: "✅ Données supprimées", 
        description: "Toutes les anciennes données ont été effacées" 
      });
    } catch (error: any) {
      toast({ 
        title: "❌ Erreur suppression", 
        description: error.message,
        variant: "destructive" 
      });
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const importComprehensiveData = async () => {
    try {
      setIsProcessing(true);
      setProgress(0);
      const newStats: ImportStats = {
        phrasesProcessed: 0,
        phrasesImported: 0,
        dictionaryProcessed: 0,
        dictionaryImported: 0,
        duplicatesRemoved: 0,
        errors: []
      };

      toast({ title: "📥 Chargement des fichiers..." });

      // Load all 3 files
      const [file1Response, file2Response, dictResponse] = await Promise.all([
        fetch('/traducteur_final.json'),
        fetch('/traducteur_complet_2.json'),
        fetch('/dictionnaire-10-3.json')
      ]);

      const phrases1 = await file1Response.json();
      const phrases2 = await file2Response.json();
      const dictData = await dictResponse.json();

      setProgress(10);
      toast({ title: "🔄 Fusion et déduplication des phrases..." });

      // Merge and deduplicate phrases
      const allPhrases = [...phrases1, ...phrases2];
      const uniquePhrases = new Map();

      for (const phrase of allPhrases) {
        const key = `${phrase.french}|||${phrase.bariba}`.toLowerCase();
        if (!uniquePhrases.has(key)) {
          uniquePhrases.set(key, {
            french_text: phrase.french,
            bariba_text: phrase.bariba,
            source: 'premium_merged',
            quality_score: 1.0,
            is_validated: true
          });
        } else {
          newStats.duplicatesRemoved++;
        }
      }

      newStats.phrasesProcessed = uniquePhrases.size;
      setProgress(20);

      // Import phrases in batches of 1000
      const phrasesArray = Array.from(uniquePhrases.values());
      const batchSize = 1000;
      
      for (let i = 0; i < phrasesArray.length; i += batchSize) {
        const batch = phrasesArray.slice(i, i + batchSize);
        const { error } = await supabase
          .from('training_phrases')
          .insert(batch);

        if (error) {
          newStats.errors.push(`Phrases batch ${i / batchSize + 1}: ${error.message}`);
        } else {
          newStats.phrasesImported += batch.length;
        }

        const progressPhrases = 20 + (30 * (i + batch.length)) / phrasesArray.length;
        setProgress(progressPhrases);
      }

      toast({ title: "📚 Import du dictionnaire..." });
      setProgress(50);

      // Process dictionary entries
      const dictEntries = Array.isArray(dictData) ? dictData : Object.values(dictData);
      newStats.dictionaryProcessed = dictEntries.length;

      const formattedDict = dictEntries.map((entry: any) => ({
        word: entry.word || entry.mot || '',
        definition: entry.definition || entry.def || '',
        part_of_speech: entry.part_of_speech || entry.pos || entry.nature || null,
        phonetic: entry.phonetic || entry.phon || null,
        example_bariba: Array.isArray(entry.example_bariba) ? entry.example_bariba : 
                        Array.isArray(entry.exemples) ? entry.exemples : [],
        example_francais: Array.isArray(entry.example_francais) ? entry.example_francais :
                         Array.isArray(entry.exemples_fr) ? entry.exemples_fr : [],
        french_keywords: Array.isArray(entry.french_keywords) ? entry.french_keywords :
                        Array.isArray(entry.mots_cles) ? entry.mots_cles : [],
        variants: Array.isArray(entry.variants) ? entry.variants :
                 Array.isArray(entry.variantes) ? entry.variantes : [],
        source: 'final_premium',
        quality_score: 1.0,
        is_verified: true
      }));

      // Import dictionary in batches
      for (let i = 0; i < formattedDict.length; i += batchSize) {
        const batch = formattedDict.slice(i, i + batchSize);
        const { error } = await supabase
          .from('dictionary_entries')
          .insert(batch);

        if (error) {
          newStats.errors.push(`Dictionary batch ${i / batchSize + 1}: ${error.message}`);
        } else {
          newStats.dictionaryImported += batch.length;
        }

        const progressDict = 50 + (50 * (i + batch.length)) / formattedDict.length;
        setProgress(progressDict);
      }

      setStats(newStats);
      setProgress(100);

      toast({ 
        title: "✅ Import terminé", 
        description: `${newStats.phrasesImported} phrases + ${newStats.dictionaryImported} entrées importées` 
      });
    } catch (error: any) {
      toast({ 
        title: "❌ Erreur import", 
        description: error.message,
        variant: "destructive" 
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Import Complet des Données Premium
        </CardTitle>
        <CardDescription>
          Fusion de traducteur_final.json (44,770) + traducteur_complet_2.json (36,854) + dictionnaire-10-3.json (110,331)
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <Alert>
          <AlertDescription>
            <strong>⚠️ Processus en 3 étapes :</strong>
            <ol className="list-decimal list-inside mt-2 space-y-1">
              <li>Créer un backup des anciennes données</li>
              <li>Supprimer toutes les anciennes données</li>
              <li>Importer les nouvelles données (fusion + déduplication)</li>
            </ol>
          </AlertDescription>
        </Alert>

        {/* Step 1: Backup */}
        <div className="space-y-2">
          <h4 className="font-semibold flex items-center gap-2">
            <Download className="h-4 w-4" />
            Étape 1: Backup des anciennes données
          </h4>
          <Button
            onClick={createBackup}
            disabled={isProcessing || backupCreated}
            variant={backupCreated ? "outline" : "default"}
            className="w-full"
          >
            {backupCreated ? "✅ Backup créé" : "Créer le backup"}
          </Button>
        </div>

        {/* Step 2: Clear */}
        <div className="space-y-2">
          <h4 className="font-semibold flex items-center gap-2">
            <Trash2 className="h-4 w-4" />
            Étape 2: Supprimer les anciennes données
          </h4>
          <Button
            onClick={clearAllData}
            disabled={isProcessing || !backupCreated}
            variant="destructive"
            className="w-full"
          >
            Supprimer toutes les anciennes données
          </Button>
        </div>

        {/* Step 3: Import */}
        <div className="space-y-2">
          <h4 className="font-semibold flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Étape 3: Importer les nouvelles données
          </h4>
          <Button
            onClick={importComprehensiveData}
            disabled={isProcessing}
            className="w-full"
          >
            Importer les données premium (80k+ paires)
          </Button>
        </div>

        {isProcessing && (
          <div className="space-y-2">
            <Progress value={progress} />
            <p className="text-sm text-muted-foreground text-center">
              {progress.toFixed(0)}% complété
            </p>
          </div>
        )}

        {stats && (
          <Alert>
            <AlertDescription>
              <strong>📊 Résultats de l'import :</strong>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li><strong>Phrases :</strong> {stats.phrasesImported.toLocaleString()} / {stats.phrasesProcessed.toLocaleString()} importées</li>
                <li><strong>Dictionnaire :</strong> {stats.dictionaryImported.toLocaleString()} / {stats.dictionaryProcessed.toLocaleString()} importées</li>
                <li><strong>Doublons supprimés :</strong> {stats.duplicatesRemoved.toLocaleString()}</li>
                {stats.errors.length > 0 && (
                  <li className="text-destructive">
                    <strong>Erreurs :</strong> {stats.errors.length}
                    <ul className="ml-4 mt-1">
                      {stats.errors.slice(0, 3).map((err, i) => (
                        <li key={i} className="text-xs">{err}</li>
                      ))}
                    </ul>
                  </li>
                )}
              </ul>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
