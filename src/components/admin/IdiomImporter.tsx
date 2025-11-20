/**
 * Importateur d'Idiomes Baatonum
 * 
 * Permet d'importer des expressions idiomatiques depuis:
 * - Un fichier JSON par défaut (idiomes_essentiels.json)
 * - Un fichier JSON personnalisé
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, Download, BookOpen, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Idiom {
  french_expression: string;
  bariba_expression: string;
  category: string;
  usage_context?: string;
}

export function IdiomImporter() {
  const { toast } = useToast();
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [importStats, setImportStats] = useState<{
    imported: number;
    failed: number;
    categories: Set<string>;
  } | null>(null);

  /**
   * Importe le fichier par défaut d'idiomes essentiels
   */
  const handleLoadDefaultIdioms = async () => {
    setIsImporting(true);
    setProgress(0);
    setImportStats(null);

    try {
      console.log('📚 Chargement des idiomes essentiels...');
      
      // Charger le fichier JSON par défaut
      const response = await fetch('/idiomes_essentiels.json');
      if (!response.ok) {
        throw new Error('Fichier idiomes_essentiels.json introuvable');
      }

      const data = await response.json();
      
      if (!Array.isArray(data)) {
        throw new Error('Format de fichier invalide');
      }

      console.log(`📊 ${data.length} idiomes à importer`);
      
      await importIdioms(data);

      toast({
        title: "Import réussi",
        description: `${data.length} expressions idiomatiques importées`,
      });
    } catch (error) {
      console.error('Erreur import idiomes:', error);
      toast({
        title: "Erreur d'import",
        description: error instanceof Error ? error.message : "Une erreur est survenue",
        variant: "destructive"
      });
    } finally {
      setIsImporting(false);
    }
  };

  /**
   * Importe un fichier JSON personnalisé
   */
  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setProgress(0);
    setImportStats(null);

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!Array.isArray(data)) {
        throw new Error('Le fichier doit contenir un tableau JSON');
      }

      console.log(`📊 ${data.length} idiomes à importer depuis ${file.name}`);
      
      await importIdioms(data);

      toast({
        title: "Import réussi",
        description: `${data.length} expressions idiomatiques importées`,
      });
    } catch (error) {
      console.error('Erreur import fichier:', error);
      toast({
        title: "Erreur d'import",
        description: error instanceof Error ? error.message : "Une erreur est survenue",
        variant: "destructive"
      });
    } finally {
      setIsImporting(false);
      // Reset input
      event.target.value = '';
    }
  };

  /**
   * Importe les idiomes dans Supabase
   */
  const importIdioms = async (idioms: any[]) => {
    let imported = 0;
    let failed = 0;
    const categories = new Set<string>();

    const batchSize = 50;
    const totalBatches = Math.ceil(idioms.length / batchSize);

    for (let i = 0; i < idioms.length; i += batchSize) {
      const batch = idioms.slice(i, i + batchSize);
      const currentBatch = Math.floor(i / batchSize) + 1;
      
      console.log(`📦 Batch ${currentBatch}/${totalBatches}: ${batch.length} idiomes`);
      
      try {
        // Préparer les données
        const idiomData = batch.map(idiom => ({
          french_expression: idiom.french_expression || idiom.francais || '',
          bariba_expression: idiom.bariba_expression || idiom.bariba || '',
          category: idiom.category || idiom.categorie || 'general',
          usage_context: idiom.usage_context || idiom.contexte || null,
          is_verified: true
        })).filter(idiom => idiom.french_expression && idiom.bariba_expression);

        // Insérer dans Supabase
        const { error } = await supabase
          .from('idiomatic_expressions')
          .insert(idiomData);

        if (error) {
          console.error(`❌ Erreur batch ${currentBatch}:`, error);
          failed += batch.length;
        } else {
          imported += idiomData.length;
          idiomData.forEach(idiom => categories.add(idiom.category));
          console.log(`✅ Batch ${currentBatch} importé`);
        }
      } catch (error) {
        console.error(`❌ Erreur batch ${currentBatch}:`, error);
        failed += batch.length;
      }

      // Mettre à jour la progression
      setProgress(Math.round(((i + batch.length) / idioms.length) * 100));
    }

    setImportStats({ imported, failed, categories });
    console.log(`✅ Import terminé: ${imported} réussis, ${failed} échecs`);
  };

  /**
   * Exporte les idiomes actuels en JSON
   */
  const handleExportIdioms = async () => {
    try {
      const { data, error } = await supabase
        .from('idiomatic_expressions')
        .select('*')
        .eq('is_verified', true)
        .order('category', { ascending: true });

      if (error) throw error;

      if (!data || data.length === 0) {
        toast({
          title: "Aucun idiome",
          description: "Aucun idiome à exporter",
          variant: "destructive"
        });
        return;
      }

      // Formater pour export
      const exportData = data.map(idiom => ({
        french_expression: idiom.french_expression,
        bariba_expression: idiom.bariba_expression,
        category: idiom.category,
        usage_context: idiom.usage_context
      }));

      // Télécharger
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `idiomes-baatonu-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: "Export réussi",
        description: `${data.length} idiomes exportés`,
      });
    } catch (error) {
      console.error('Erreur export:', error);
      toast({
        title: "Erreur d'export",
        description: "Impossible d'exporter les idiomes",
        variant: "destructive"
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Importateur d'Idiomes
        </CardTitle>
        <CardDescription>
          Importez des expressions idiomatiques essentielles Baatonum
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Boutons d'action */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Charger idiomes par défaut */}
          <Button
            onClick={handleLoadDefaultIdioms}
            disabled={isImporting}
            className="w-full"
          >
            <BookOpen className="h-4 w-4 mr-2" />
            Charger Idiomes Essentiels
          </Button>

          {/* Importer fichier personnalisé */}
          <div className="relative">
            <Input
              type="file"
              accept=".json"
              onChange={handleFileImport}
              disabled={isImporting}
              className="cursor-pointer"
            />
            <Upload className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none text-muted-foreground" />
          </div>

          {/* Exporter */}
          <Button
            onClick={handleExportIdioms}
            disabled={isImporting}
            variant="outline"
            className="w-full"
          >
            <Download className="h-4 w-4 mr-2" />
            Exporter
          </Button>
        </div>

        {/* Barre de progression */}
        {isImporting && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Import en cours...</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} />
          </div>
        )}

        {/* Statistiques d'import */}
        {importStats && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <div className="font-medium">Import terminé</div>
                <div className="text-sm text-muted-foreground">
                  • {importStats.imported} idiomes importés avec succès
                </div>
                {importStats.failed > 0 && (
                  <div className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {importStats.failed} échecs
                  </div>
                )}
                <div className="text-sm text-muted-foreground">
                  • {importStats.categories.size} catégories: {Array.from(importStats.categories).join(', ')}
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Information */}
        <Alert>
          <AlertDescription className="text-sm">
            <strong>Format attendu:</strong> Tableau JSON avec les champs{' '}
            <code className="bg-muted px-1 py-0.5 rounded">french_expression</code>,{' '}
            <code className="bg-muted px-1 py-0.5 rounded">bariba_expression</code>,{' '}
            <code className="bg-muted px-1 py-0.5 rounded">category</code>, et{' '}
            <code className="bg-muted px-1 py-0.5 rounded">usage_context</code> (optionnel).
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
