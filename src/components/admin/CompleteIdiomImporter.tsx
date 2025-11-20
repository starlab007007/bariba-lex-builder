/**
 * Importateur pour le fichier complet d'idiomes (2000+ expressions)
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, AlertCircle, CheckCircle2, FileJson } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export const CompleteIdiomImporter = () => {
  const { toast } = useToast();
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [importResult, setImportResult] = useState<any>(null);

  const importCompleteIdioms = async () => {
    try {
      setIsImporting(true);
      setProgress(10);
      setImportResult(null);

      toast({
        title: "Chargement des idiomes",
        description: "Récupération du fichier complet...",
      });

      // Charger le nouveau fichier JSON (format par catégories)
      const response = await fetch('/idiomes_fr_bariba.json');
      if (!response.ok) {
        throw new Error('Fichier non trouvé');
      }

      const idiomsData = await response.json();
      setProgress(30);

      // Transformer le format (objet avec catégories) en array plat
      const idiomsToInsert: any[] = [];
      
      // Si le format est un objet avec des catégories (nouveau format)
      if (typeof idiomsData === 'object' && !Array.isArray(idiomsData)) {
        Object.entries(idiomsData).forEach(([category, items]: [string, any]) => {
          if (Array.isArray(items)) {
            items.forEach((idiom: any) => {
              idiomsToInsert.push({
                french_expression: idiom.french,
                bariba_expression: idiom.bariba,
                category: category,
                usage_context: idiom.usage_context || null,
                is_verified: true,
              });
            });
          }
        });
      } else {
        // Format ancien (array direct)
        idiomsData.forEach((idiom: any) => {
          idiomsToInsert.push({
            french_expression: idiom.french,
            bariba_expression: idiom.bariba,
            category: idiom.category,
            usage_context: idiom.usage_context,
            is_verified: true,
          });
        });
      }

      console.log(`📚 ${idiomsToInsert.length} idiomes à importer`);

      setProgress(50);

      // Supprimer les anciennes entrées
      const { error: deleteError } = await supabase
        .from('idiomatic_expressions')
        .delete()
        .gte('created_at', '1900-01-01'); // Supprimer tout

      if (deleteError) {
        console.warn('Avertissement lors de la suppression:', deleteError);
      }

      setProgress(60);

      // Insérer par lots de 100
      const batchSize = 100;
      let inserted = 0;
      let errors = 0;

      for (let i = 0; i < idiomsToInsert.length; i += batchSize) {
        const batch = idiomsToInsert.slice(i, i + batchSize);
        
        const { error } = await supabase
          .from('idiomatic_expressions')
          .insert(batch);

        if (error) {
          console.error('Erreur batch:', error);
          errors += batch.length;
        } else {
          inserted += batch.length;
        }

        const currentProgress = 60 + Math.floor((i / idiomsToInsert.length) * 40);
        setProgress(currentProgress);
      }

      setProgress(100);

      const result = {
        total: idiomsToInsert.length,
        inserted,
        errors,
        categories: Array.from(new Set(idiomsToInsert.map((i: any) => i.category))),
      };

      setImportResult(result);

      toast({
        title: "Import terminé",
        description: `${inserted} idiomes importés avec succès`,
      });

    } catch (error: any) {
      console.error('Erreur:', error);
      toast({
        title: "Erreur d'import",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileJson className="w-5 h-5 text-primary" />
          Import Complet d'Idiomes
        </CardTitle>
        <CardDescription>
          Importer 14000+ expressions idiomatiques organisées par catégories en français-bariba
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Cet import va remplacer tous les idiomes existants par le fichier complet de 14000+ expressions organisées par catégories.
          </AlertDescription>
        </Alert>

        <Button
          onClick={importCompleteIdioms}
          disabled={isImporting}
          className="w-full"
          size="lg"
        >
          <Upload className="w-4 h-4 mr-2" />
          {isImporting ? "Import en cours..." : "Importer les Idiomes Complets"}
        </Button>

        {isImporting && (
          <div className="space-y-2">
            <Progress value={progress} />
            <p className="text-sm text-muted-foreground text-center">
              Progression: {progress}%
            </p>
          </div>
        )}

        {importResult && (
          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="w-5 h-5" />
              <h3 className="font-semibold">Import réussi</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{importResult.total}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Importés</p>
                <p className="text-2xl font-bold text-green-600">{importResult.inserted}</p>
              </div>
            </div>

            {importResult.errors > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {importResult.errors} erreurs lors de l'import
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <p className="text-sm font-semibold">Catégories importées:</p>
              <div className="flex flex-wrap gap-2">
                {importResult.categories.map((cat: string) => (
                  <span
                    key={cat}
                    className="px-2 py-1 text-xs bg-muted rounded-md"
                  >
                    {cat}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};