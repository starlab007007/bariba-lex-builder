import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Upload, Loader2 } from 'lucide-react';

interface TrainingPhraseImporterProps {
  onClose: () => void;
}

export default function TrainingPhraseImporter({
  onClose,
}: TrainingPhraseImporterProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const parseFile = async (file: File): Promise<any[]> => {
    const text = await file.text();
    const lines = text.split('\n').filter((line) => line.trim());

    const phrases: any[] = [];

    for (const line of lines) {
      // Support multiple formats
      if (line.includes('|')) {
        const [french, bariba] = line.split('|').map((s) => s.trim());
        if (french && bariba) {
          phrases.push({ french_text: french, bariba_text: bariba });
        }
      } else if (line.includes('\t')) {
        const [french, bariba] = line.split('\t').map((s) => s.trim());
        if (french && bariba) {
          phrases.push({ french_text: french, bariba_text: bariba });
        }
      }
    }

    return phrases;
  };

  const handleImport = async () => {
    if (!file) return;

    setLoading(true);
    try {
      const phrases = await parseFile(file);

      if (phrases.length === 0) {
        throw new Error(
          'Aucune phrase valide trouvée. Format attendu: "français|bariba" ou "français[TAB]bariba"'
        );
      }

      const { error } = await supabase.from('training_phrases').insert(
        phrases.map((p) => ({
          french_text: p.french_text,
          bariba_text: p.bariba_text,
          source: 'import',
          created_by: user?.id,
        }))
      );

      if (error) throw error;

      toast({
        title: 'Import réussi',
        description: `${phrases.length} phrases importées`,
      });
      onClose();
    } catch (error: any) {
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
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Importer des Phrases d'Entraînement</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="border-2 border-dashed rounded-lg p-8 text-center">
            <input
              type="file"
              accept=".txt,.csv"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="hidden"
              id="file-upload"
              disabled={loading}
            />
            <label
              htmlFor="file-upload"
              className="cursor-pointer flex flex-col items-center gap-2"
            >
              <Upload className="h-8 w-8 text-muted-foreground" />
              <div className="text-sm text-muted-foreground">
                {file ? file.name : 'Cliquez pour sélectionner un fichier'}
              </div>
            </label>
          </div>

          <div className="text-sm text-muted-foreground space-y-2">
            <p className="font-medium">Formats acceptés:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>TXT ou CSV avec séparateur | (pipe)</li>
              <li>TXT avec séparateur TAB</li>
              <li>Format: français|bariba (une phrase par ligne)</li>
            </ul>
            <p className="text-xs pt-2">
              Exemple: "Bonjour|O daapu" ou "Comment vas-tu?|Kan gama?"
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Annuler
            </Button>
            <Button onClick={handleImport} disabled={!file || loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Importer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
