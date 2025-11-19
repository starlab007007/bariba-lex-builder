import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Database, CheckCircle, AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export const FullDatasetImporter = () => {
  const { toast } = useToast();
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState<{
    total: number;
    imported: number;
    failed: number;
    categories: Record<string, number>;
  } | null>(null);

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setProgress(0);
    setStats(null);

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!Array.isArray(data)) {
        throw new Error("Le fichier doit contenir un tableau JSON");
      }

      const total = data.length;
      let imported = 0;
      let failed = 0;
      const categories: Record<string, number> = {};
      
      const batchSize = 100;
      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        const phrasesToInsert = batch.map((item: any) => {
          if (!item.french || !item.bariba) {
            failed++;
            return null;
          }

          // Compter les catégories
          if (item.categories && Array.isArray(item.categories)) {
            item.categories.forEach((cat: string) => {
              categories[cat] = (categories[cat] || 0) + 1;
            });
          }

          return {
            french_text: item.french.trim(),
            bariba_text: item.bariba.trim(),
            is_validated: true,
            source: 'full_dataset_import',
            metadata: {
              categories: item.categories || [],
              imported_at: new Date().toISOString()
            }
          };
        }).filter(Boolean);

        const { error } = await supabase
          .from('training_phrases')
          .insert(phrasesToInsert);

        if (error) {
          console.error('Batch import error:', error);
          failed += batch.length;
        } else {
          imported += phrasesToInsert.length;
        }

        setProgress(Math.round((i + batch.length) / total * 100));
      }

      setStats({ total, imported, failed, categories });

      toast({
        title: "Import réussi",
        description: `${imported} phrases importées sur ${total}`,
      });
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: "Erreur d'import",
        description: error instanceof Error ? error.message : "Une erreur s'est produite",
        variant: "destructive"
      });
    } finally {
      setImporting(false);
      event.target.value = '';
    }
  };

  const handleLoadDefaultDataset = async () => {
    setImporting(true);
    setProgress(0);
    setStats(null);

    try {
      const response = await fetch('/traducteur_complet.json');
      const data = await response.json();

      if (!Array.isArray(data)) {
        throw new Error("Le fichier par défaut doit contenir un tableau JSON");
      }

      const total = data.length;
      let imported = 0;
      let failed = 0;
      const categories: Record<string, number> = {};
      
      const batchSize = 100;
      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        const phrasesToInsert = batch.map((item: any) => {
          if (!item.french || !item.bariba) {
            failed++;
            return null;
          }

          if (item.categories && Array.isArray(item.categories)) {
            item.categories.forEach((cat: string) => {
              categories[cat] = (categories[cat] || 0) + 1;
            });
          }

          return {
            french_text: item.french.trim(),
            bariba_text: item.bariba.trim(),
            is_validated: true,
            source: 'default_dataset',
            metadata: {
              categories: item.categories || [],
              imported_at: new Date().toISOString()
            }
          };
        }).filter(Boolean);

        const { error } = await supabase
          .from('training_phrases')
          .insert(phrasesToInsert);

        if (error) {
          console.error('Batch import error:', error);
          failed += batch.length;
        } else {
          imported += phrasesToInsert.length;
        }

        setProgress(Math.round((i + batch.length) / total * 100));
      }

      setStats({ total, imported, failed, categories });

      toast({
        title: "Dataset par défaut chargé",
        description: `${imported} phrases importées sur ${total}`,
      });
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: "Erreur de chargement",
        description: error instanceof Error ? error.message : "Une erreur s'est produite",
        variant: "destructive"
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Import du Dataset Complet
          </CardTitle>
          <CardDescription>
            Importez le fichier traducteur_complet.json contenant 36k+ paires français-bariba
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button
              onClick={handleLoadDefaultDataset}
              disabled={importing}
              className="flex-1"
            >
              <Database className="mr-2 h-4 w-4" />
              Charger le dataset par défaut (36k+ phrases)
            </Button>
            
            <div className="flex-1">
              <input
                type="file"
                accept=".json"
                onChange={handleFileImport}
                disabled={importing}
                className="hidden"
                id="dataset-file-input"
              />
              <label htmlFor="dataset-file-input">
                <Button
                  disabled={importing}
                  className="w-full"
                  variant="outline"
                  asChild
                >
                  <span>
                    <Upload className="mr-2 h-4 w-4" />
                    Ou importer un fichier JSON
                  </span>
                </Button>
              </label>
            </div>
          </div>

          {importing && (
            <div className="space-y-2">
              <Progress value={progress} className="w-full" />
              <p className="text-sm text-muted-foreground text-center">
                Import en cours... {progress}%
              </p>
            </div>
          )}

          {stats && (
            <div className="mt-6 p-4 bg-muted rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Résultat de l'import:</span>
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    {stats.imported} importées
                  </span>
                  {stats.failed > 0 && (
                    <span className="flex items-center gap-1 text-destructive">
                      <AlertCircle className="h-4 w-4" />
                      {stats.failed} échouées
                    </span>
                  )}
                </div>
              </div>

              {Object.keys(stats.categories).length > 0 && (
                <div>
                  <p className="font-semibold mb-2">Catégories importées:</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {Object.entries(stats.categories)
                      .sort(([, a], [, b]) => b - a)
                      .map(([category, count]) => (
                        <div key={category} className="text-sm">
                          <span className="font-medium">{category}:</span>{" "}
                          <span className="text-muted-foreground">{count}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
