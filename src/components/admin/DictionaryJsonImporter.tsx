import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, X, FileJson } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface DictionaryJsonImporterProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface DictionaryEntry {
  word: string;
  phonetic?: string;
  part_of_speech?: string;
  definition: string;
  example_francais?: string[];
  example_bariba?: string[];
  french_keywords?: string[];
  variants?: string[];
}

export default function DictionaryJsonImporter({ onClose, onSuccess }: DictionaryJsonImporterProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const calculateQualityScore = (entry: DictionaryEntry): number => {
    let score = 0.5; // Base score
    
    if (entry.phonetic) score += 0.15;
    if (entry.example_francais && entry.example_francais.length > 0) score += 0.15;
    if (entry.example_bariba && entry.example_bariba.length > 0) score += 0.1;
    if (entry.definition && entry.definition.length > 50) score += 0.05;
    if (entry.french_keywords && entry.french_keywords.length > 0) score += 0.05;
    
    return Math.min(score, 1.0);
  };

  const parseJsonFile = async (file: File): Promise<DictionaryEntry[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const json = JSON.parse(e.target?.result as string);
          
          if (!Array.isArray(json)) {
            reject(new Error('Le fichier JSON doit contenir un tableau d\'entrées'));
            return;
          }
          
          const entries: DictionaryEntry[] = json.map((entry: any) => ({
            word: entry.word || entry.mot || '',
            phonetic: entry.phonetic || entry.phonetique || null,
            part_of_speech: entry.part_of_speech || entry.nature || null,
            definition: entry.definition || entry.def || '',
            example_francais: Array.isArray(entry.example_francais) 
              ? entry.example_francais 
              : (entry.exemples_fr ? [entry.exemples_fr] : []),
            example_bariba: Array.isArray(entry.example_bariba) 
              ? entry.example_bariba 
              : (entry.exemples_bariba ? [entry.exemples_bariba] : []),
            french_keywords: Array.isArray(entry.french_keywords) 
              ? entry.french_keywords 
              : (entry.mots_cles_fr ? entry.mots_cles_fr.split(',').map((k: string) => k.trim()) : []),
            variants: Array.isArray(entry.variants) 
              ? entry.variants 
              : (entry.variantes ? entry.variantes.split(',').map((v: string) => v.trim()) : []),
          }));
          
          resolve(entries);
        } catch (error) {
          reject(new Error('Erreur lors de la lecture du fichier JSON'));
        }
      };
      
      reader.onerror = () => reject(new Error('Erreur lors de la lecture du fichier'));
      reader.readAsText(file);
    });
  };

  const handleImport = async () => {
    if (!file) return;

    setLoading(true);
    setProgress(0);

    try {
      const entries = await parseJsonFile(file);
      
      if (entries.length === 0) {
        toast({
          title: 'Fichier vide',
          description: 'Le fichier ne contient aucune entrée valide',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      // Check for duplicates
      const words = entries.map(e => e.word);
      const { data: existingEntries } = await supabase
        .from('dictionary_entries')
        .select('word')
        .in('word', words);
      
      const existingWords = new Set(existingEntries?.map(e => e.word) || []);
      const newEntries = entries.filter(e => !existingWords.has(e.word));
      
      if (newEntries.length === 0) {
        toast({
          title: 'Aucune nouvelle entrée',
          description: 'Toutes les entrées existent déjà dans le dictionnaire',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      // Insert in batches of 500
      const batchSize = 500;
      let imported = 0;
      
      for (let i = 0; i < newEntries.length; i += batchSize) {
        const batch = newEntries.slice(i, i + batchSize);
        const dataToInsert = batch.map(entry => ({
          word: entry.word,
          phonetic: entry.phonetic,
          part_of_speech: entry.part_of_speech,
          definition: entry.definition,
          example_francais: entry.example_francais,
          example_bariba: entry.example_bariba,
          french_keywords: entry.french_keywords,
          variants: entry.variants,
          quality_score: calculateQualityScore(entry),
          is_verified: false,
          created_by: user?.id,
          updated_by: user?.id,
        }));

        const { error } = await supabase
          .from('dictionary_entries')
          .insert(dataToInsert);

        if (error) throw error;
        
        imported += batch.length;
        setProgress((imported / newEntries.length) * 100);
      }

      toast({
        title: 'Import réussi',
        description: `${imported} entrées importées (${existingWords.size} doublons ignorés)`,
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Import error:', error);
      toast({
        title: 'Erreur d\'import',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-card border border-border rounded-lg p-6 max-w-2xl w-full mx-4 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Importer un dictionnaire JSON</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-4">
          <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
            <FileJson className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-4">
              Format JSON attendu :
            </p>
            <pre className="text-xs bg-muted p-2 rounded text-left overflow-x-auto mb-4">
{`[
  {
    "word": "kparaku",
    "phonetic": "kparaku",
    "part_of_speech": "nom",
    "definition": "pierre",
    "example_francais": ["La pierre est lourde"],
    "example_bariba": ["Kparaku bɛ buru"],
    "french_keywords": ["pierre", "caillou"],
    "variants": ["kpara"]
  }
]`}
            </pre>
            
            <input
              type="file"
              accept=".json"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="hidden"
              id="json-upload"
            />
            <label htmlFor="json-upload">
              <Button asChild variant="outline">
                <span>
                  <Upload className="h-4 w-4 mr-2" />
                  Sélectionner un fichier JSON
                </span>
              </Button>
            </label>
            
            {file && (
              <p className="text-sm text-foreground mt-4">
                Fichier sélectionné : <strong>{file.name}</strong>
              </p>
            )}
          </div>

          {loading && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-sm text-center text-muted-foreground">
                Import en cours... {Math.round(progress)}%
              </p>
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Annuler
            </Button>
            <Button onClick={handleImport} disabled={!file || loading}>
              <Upload className="h-4 w-4 mr-2" />
              Importer
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}