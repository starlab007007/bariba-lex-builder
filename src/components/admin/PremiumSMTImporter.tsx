import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { smtInitializer } from "@/services/SMTInitializer";
import { 
  Upload, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2, 
  Database,
  Zap,
  RefreshCw
} from "lucide-react";

interface ImportStats {
  fileName: string;
  totalPairs: number;
  imported: number;
  filtered: number;
  errors: number;
  status: 'pending' | 'analyzing' | 'importing' | 'completed' | 'error';
}

export function PremiumSMTImporter() {
  const { toast } = useToast();
  const [file1, setFile1] = useState<File | null>(null);
  const [file2, setFile2] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState<ImportStats[]>([]);

  const handleFileChange = (fileNumber: 1 | 2) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.json')) {
      toast({
        title: "Format non supporté",
        description: "Seuls les fichiers JSON sont acceptés",
        variant: "destructive"
      });
      return;
    }

    if (fileNumber === 1) {
      setFile1(selectedFile);
    } else {
      setFile2(selectedFile);
    }
  };

  const importFile = async (file: File): Promise<ImportStats> => {
    const stat: ImportStats = {
      fileName: file.name,
      totalPairs: 0,
      imported: 0,
      filtered: 0,
      errors: 0,
      status: 'analyzing'
    };

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const arrayData = Array.isArray(data) ? data : Object.values(data);
      
      stat.totalPairs = arrayData.length;
      stat.status = 'importing';

      // Détecter les colonnes FR-BBA
      const sample = arrayData[0] || {};
      const keys = Object.keys(sample);
      
      const frenchKeys = ['french', 'french_text', 'francais', 'fr', 'source'];
      const baribaKeys = ['bariba', 'bariba_text', 'baatonum', 'bba', 'target'];
      
      const frenchColumn = keys.find(k => frenchKeys.some(fk => k.toLowerCase().includes(fk.toLowerCase()))) || keys[0];
      const baribaColumn = keys.find(k => baribaKeys.some(bk => k.toLowerCase().includes(bk.toLowerCase()))) || keys[1];

      // Nettoyer et filtrer les données
      const cleanedData = arrayData
        .filter(item => {
          const french = item[frenchColumn];
          const bariba = item[baribaColumn];
          const valid = french && bariba && 
                       typeof french === 'string' && 
                       typeof bariba === 'string' &&
                       french.trim().length > 0 && 
                       bariba.trim().length > 0;
          
          if (!valid) stat.filtered++;
          return valid;
        })
        .map(item => ({
          french_text: String(item[frenchColumn]).trim(),
          bariba_text: String(item[baribaColumn]).trim(),
          source: 'premium_merged',
          quality_score: 1.0,
          is_validated: true
        }));

      console.log(`${file.name}: ${cleanedData.length} paires valides / ${arrayData.length} totales`);

      // Import par batch de 1000
      const batchSize = 1000;
      for (let i = 0; i < cleanedData.length; i += batchSize) {
        const batch = cleanedData.slice(i, i + batchSize);
        
        const { error } = await supabase
          .from('training_phrases')
          .insert(batch);

        if (error) {
          console.error(`Erreur batch ${i}-${i + batchSize}:`, error);
          stat.errors += batch.length;
        } else {
          stat.imported += batch.length;
        }

        setProgress((i + batch.length) / cleanedData.length * 100);
      }

      stat.status = 'completed';
    } catch (error: any) {
      console.error(`Erreur import ${file.name}:`, error);
      stat.status = 'error';
      stat.errors = stat.totalPairs;
    }

    return stat;
  };

  const handleImport = async () => {
    const filesToImport = [file1, file2].filter(Boolean) as File[];
    
    if (filesToImport.length === 0) {
      toast({
        title: "Aucun fichier sélectionné",
        description: "Veuillez sélectionner au moins un fichier à importer",
        variant: "destructive"
      });
      return;
    }

    setIsImporting(true);
    setStats([]);
    setProgress(0);

    toast({
      title: "🚀 Import SMT Premium",
      description: "Import des données d'entraînement en cours..."
    });

    try {
      // Supprimer les anciennes données premium
      const { error: deleteError } = await supabase
        .from('training_phrases')
        .delete()
        .eq('source', 'premium_merged');

      if (deleteError) {
        console.warn('Erreur suppression anciennes données:', deleteError);
      }

      // Importer chaque fichier
      const results: ImportStats[] = [];
      for (let i = 0; i < filesToImport.length; i++) {
        const file = filesToImport[i];
        toast({
          title: `📥 Import ${i + 1}/${filesToImport.length}`,
          description: file.name
        });
        
        const result = await importFile(file);
        results.push(result);
        setStats([...results]);
      }

      const totalImported = results.reduce((sum, r) => sum + r.imported, 0);
      const totalErrors = results.reduce((sum, r) => sum + r.errors, 0);

      toast({
        title: "✅ Import terminé",
        description: `${totalImported.toLocaleString()} paires importées${totalErrors > 0 ? ` (${totalErrors} erreurs)` : ''}`
      });

    } catch (error: any) {
      console.error('Erreur import:', error);
      toast({
        title: "❌ Erreur d'import",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsImporting(false);
      setProgress(0);
    }
  };

  const handleInitializeSMT = async () => {
    setIsInitializing(true);
    try {
      toast({
        title: "🔄 Initialisation SMT",
        description: "Chargement des données dans le moteur..."
      });

      smtInitializer.reset();
      await smtInitializer.initialize();

      toast({
        title: "✅ SMT Initialisé",
        description: "Le moteur est prêt pour la traduction"
      });
    } catch (error: any) {
      toast({
        title: "❌ Erreur d'initialisation",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsInitializing(false);
    }
  };

  const totalImported = stats.reduce((sum, s) => sum + s.imported, 0);
  const hasImported = stats.length > 0 && totalImported > 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Import SMT Premium</h2>
        <p className="text-muted-foreground">
          Importez les fichiers de formation premium pour le moteur de traduction statistique
        </p>
      </div>

      <Alert>
        <Database className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-2">
            <p className="font-semibold">📦 Fichiers attendus:</p>
            <ul className="text-sm space-y-1 list-disc list-inside">
              <li><strong>traducteur_final.json</strong> - 44,770 paires FR-BBA premium</li>
              <li><strong>traducteur_complet_2.json</strong> - 36,854 paires FR-BBA</li>
            </ul>
            <p className="text-xs text-muted-foreground mt-2">
              Total attendu: ~80,000 paires de haute qualité pour le moteur SMT
            </p>
          </div>
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Fichier 1: traducteur_final.json</CardTitle>
            <CardDescription>44,770 paires FR-BBA premium</CardDescription>
          </CardHeader>
          <CardContent>
            <Input
              type="file"
              accept=".json"
              onChange={handleFileChange(1)}
              disabled={isImporting}
            />
            {file1 && (
              <div className="mt-2 text-sm text-muted-foreground">
                ✓ {file1.name} ({(file1.size / 1024 / 1024).toFixed(2)} MB)
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fichier 2: traducteur_complet_2.json</CardTitle>
            <CardDescription>36,854 paires FR-BBA</CardDescription>
          </CardHeader>
          <CardContent>
            <Input
              type="file"
              accept=".json"
              onChange={handleFileChange(2)}
              disabled={isImporting}
            />
            {file2 && (
              <div className="mt-2 text-sm text-muted-foreground">
                ✓ {file2.name} ({(file2.size / 1024 / 1024).toFixed(2)} MB)
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-4">
        <Button
          onClick={handleImport}
          disabled={isImporting || (!file1 && !file2)}
          className="flex-1"
          size="lg"
        >
          {isImporting ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Import en cours... {Math.round(progress)}%
            </>
          ) : (
            <>
              <Upload className="mr-2 h-5 w-5" />
              Importer les fichiers
            </>
          )}
        </Button>

        {hasImported && (
          <Button
            onClick={handleInitializeSMT}
            disabled={isInitializing}
            variant="default"
            size="lg"
          >
            {isInitializing ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Initialisation...
              </>
            ) : (
              <>
                <Zap className="mr-2 h-5 w-5" />
                Activer le SMT
              </>
            )}
          </Button>
        )}
      </div>

      {isImporting && progress > 0 && (
        <Progress value={progress} className="w-full" />
      )}

      {stats.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">Résultats de l'import</h3>
          {stats.map((stat, idx) => (
            <Card key={idx}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{stat.fileName}</CardTitle>
                  <Badge variant={
                    stat.status === 'completed' ? 'default' : 
                    stat.status === 'error' ? 'destructive' : 
                    'secondary'
                  }>
                    {stat.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Total</div>
                    <div className="text-2xl font-bold">{stat.totalPairs.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Importées</div>
                    <div className="text-2xl font-bold text-green-600">{stat.imported.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Filtrées</div>
                    <div className="text-2xl font-bold text-yellow-600">{stat.filtered.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Erreurs</div>
                    <div className="text-2xl font-bold text-red-600">{stat.errors.toLocaleString()}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          <Card className="bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                Statistiques Globales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Total importé</div>
                  <div className="text-3xl font-bold text-green-600">
                    {totalImported.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Qualité</div>
                  <div className="text-3xl font-bold">
                    {totalImported >= 80000 ? '🌟 Premium' : totalImported >= 10000 ? '✓ Bon' : '⚠️ Insuffisant'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">État SMT</div>
                  <div className="text-3xl font-bold">
                    {hasImported ? '✅ Prêt' : '⏳ En attente'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {hasImported && (
        <Alert>
          <RefreshCw className="h-4 w-4" />
          <AlertDescription>
            <p className="font-semibold">✅ Données importées avec succès!</p>
            <p className="text-sm mt-1">
              Cliquez sur "Activer le SMT" pour initialiser le moteur avec les nouvelles données,
              puis allez dans l'onglet "📊 Monitoring SMT" pour suivre les performances.
            </p>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
