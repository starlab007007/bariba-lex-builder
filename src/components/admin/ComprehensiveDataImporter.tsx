import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DataQualityValidator } from "./DataQualityValidator";
import { SmartDataImporter } from "./SmartDataImporter";
import { 
  Database, 
  Trash2, 
  Upload, 
  Download, 
  AlertTriangle, 
  CheckCircle2, 
  Loader2, 
  FileText, 
  BookOpen, 
  Languages,
  RefreshCw 
} from "lucide-react";

interface ImportStats {
  phrasesProcessed: number;
  phrasesImported: number;
  dictionaryProcessed: number;
  dictionaryImported: number;
  duplicatesRemoved: number;
  errors: string[];
}

interface FileImportStatus {
  status: 'idle' | 'importing' | 'success' | 'error';
  count: number;
  message: string;
  timestamp?: Date;
}

interface DatabaseStats {
  trainingPhrases: number;
  dictionaryEntries: number;
  idiomaticExpressions: number;
  lastUpdated?: Date;
}

export function ComprehensiveDataImporter() {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState<ImportStats | null>(null);
  const [backupCreated, setBackupCreated] = useState(false);
  
  const [file1Status, setFile1Status] = useState<FileImportStatus>({ status: 'idle', count: 0, message: '' });
  const [file2Status, setFile2Status] = useState<FileImportStatus>({ status: 'idle', count: 0, message: '' });
  const [dictionaryStatus, setDictionaryStatus] = useState<FileImportStatus>({ status: 'idle', count: 0, message: '' });
  const [dbStats, setDbStats] = useState<DatabaseStats | null>(null);

  useEffect(() => {
    loadDatabaseStats();
  }, []);

  const loadDatabaseStats = async () => {
    try {
      const [phrasesCount, dictCount, idiomsCount] = await Promise.all([
        supabase.from('training_phrases').select('*', { count: 'exact', head: true }),
        supabase.from('dictionary_entries').select('*', { count: 'exact', head: true }),
        supabase.from('idiomatic_expressions').select('*', { count: 'exact', head: true })
      ]);

      setDbStats({
        trainingPhrases: phrasesCount.count || 0,
        dictionaryEntries: dictCount.count || 0,
        idiomaticExpressions: idiomsCount.count || 0,
        lastUpdated: new Date()
      });
    } catch (error) {
      console.error('Error loading database stats:', error);
    }
  };

  const createBackup = async () => {
    try {
      setIsProcessing(true);
      setProgress(10);
      toast({ title: "🔄 Création du backup..." });

      const { data: phrases } = await supabase.from('training_phrases').select('*');
      const { data: dictionary } = await supabase.from('dictionary_entries').select('*');
      const { data: idioms } = await supabase.from('idiomatic_expressions').select('*');

      setProgress(50);

      const backup = {
        timestamp: new Date().toISOString(),
        training_phrases: phrases || [],
        dictionary_entries: dictionary || [],
        idiomatic_expressions: idioms || []
      };

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

      await supabase.from('translation_memory').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      setProgress(25);
      
      await supabase.from('training_phrases').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      setProgress(50);
      
      await supabase.from('idiomatic_expressions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      setProgress(75);
      
      await supabase.from('dictionary_entries').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      setProgress(100);

      localStorage.removeItem('dictionary_cache_v2');
      localStorage.removeItem('dictionary_cache');

      await loadDatabaseStats();

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

  const importFile1 = async () => {
    setFile1Status({ status: 'importing', count: 0, message: 'Chargement...' });
    setIsProcessing(true);
    
    try {
      const response = await fetch('/traducteur_final.json');
      const data = await response.json();
      
      setFile1Status({ status: 'importing', count: data.length, message: `${data.length} paires trouvées, import en cours...` });
      
      const uniquePhrases = new Map();
      data.forEach((item: any) => {
        const key = `${item.french}|||${item.bariba}`;
        if (!uniquePhrases.has(key)) {
          uniquePhrases.set(key, item);
        }
      });

      const toImport = Array.from(uniquePhrases.values()).map((item: any) => ({
        french_text: item.french,
        bariba_text: item.bariba,
        source: 'traducteur_final',
        quality_score: 1.0,
        is_validated: true,
        metadata: { imported_at: new Date().toISOString() }
      }));

      let imported = 0;
      for (let i = 0; i < toImport.length; i += 1000) {
        const batch = toImport.slice(i, i + 1000);
        const { error } = await supabase.from('training_phrases').insert(batch);
        if (error) throw error;
        imported += batch.length;
        setFile1Status({ status: 'importing', count: imported, message: `${imported}/${toImport.length} importées...` });
      }

      setFile1Status({ 
        status: 'success', 
        count: imported, 
        message: `✅ ${imported} paires importées avec succès`,
        timestamp: new Date()
      });
      
      await loadDatabaseStats();
      
      toast({
        title: "Fichier 1 importé",
        description: `${imported} phrases d'entraînement importées`,
      });
    } catch (error: any) {
      setFile1Status({ status: 'error', count: 0, message: `❌ Erreur: ${error.message}` });
      toast({
        title: "Erreur d'import",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const importFile2 = async () => {
    setFile2Status({ status: 'importing', count: 0, message: 'Chargement...' });
    setIsProcessing(true);
    
    try {
      const response = await fetch('/traducteur_complet_2.json');
      const data = await response.json();
      
      setFile2Status({ status: 'importing', count: data.length, message: `${data.length} paires trouvées, import en cours...` });
      
      const uniquePhrases = new Map();
      data.forEach((item: any) => {
        const key = `${item.french}|||${item.bariba}`;
        if (!uniquePhrases.has(key)) {
          uniquePhrases.set(key, item);
        }
      });

      const toImport = Array.from(uniquePhrases.values()).map((item: any) => ({
        french_text: item.french,
        bariba_text: item.bariba,
        source: 'traducteur_complet_2',
        quality_score: 1.0,
        is_validated: true,
        metadata: { imported_at: new Date().toISOString() }
      }));

      let imported = 0;
      for (let i = 0; i < toImport.length; i += 1000) {
        const batch = toImport.slice(i, i + 1000);
        const { error } = await supabase.from('training_phrases').insert(batch);
        if (error) throw error;
        imported += batch.length;
        setFile2Status({ status: 'importing', count: imported, message: `${imported}/${toImport.length} importées...` });
      }

      setFile2Status({ 
        status: 'success', 
        count: imported, 
        message: `✅ ${imported} paires importées avec succès`,
        timestamp: new Date()
      });
      
      await loadDatabaseStats();
      
      toast({
        title: "Fichier 2 importé",
        description: `${imported} phrases d'entraînement importées`,
      });
    } catch (error: any) {
      setFile2Status({ status: 'error', count: 0, message: `❌ Erreur: ${error.message}` });
      toast({
        title: "Erreur d'import",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const importDictionary = async () => {
    setDictionaryStatus({ status: 'importing', count: 0, message: 'Chargement...' });
    setIsProcessing(true);
    
    try {
      const response = await fetch('/dictionnaire-10-3.json');
      const data = await response.json();
      
      setDictionaryStatus({ status: 'importing', count: data.length, message: `${data.length} entrées trouvées, import en cours...` });
      
      const toImport = data.map((item: any) => ({
        word: item.word || item.baatonum || '',
        definition: item.definition || item.francais || '',
        phonetic: item.phonetic || null,
        part_of_speech: item.part_of_speech || item.pos || null,
        example_bariba: item.example_bariba || item.examples_baatonum || [],
        example_francais: item.example_francais || item.examples_french || [],
        variants: item.variants || [],
        french_keywords: item.french_keywords || [],
        quality_score: 1.0,
        is_verified: true,
        metadata: { source: 'dictionnaire-10-3', imported_at: new Date().toISOString() }
      }));

      let imported = 0;
      for (let i = 0; i < toImport.length; i += 1000) {
        const batch = toImport.slice(i, i + 1000);
        const { error } = await supabase.from('dictionary_entries').insert(batch);
        if (error) throw error;
        imported += batch.length;
        setDictionaryStatus({ status: 'importing', count: imported, message: `${imported}/${toImport.length} importées...` });
      }

      setDictionaryStatus({ 
        status: 'success', 
        count: imported, 
        message: `✅ ${imported} entrées importées avec succès`,
        timestamp: new Date()
      });
      
      await loadDatabaseStats();
      
      toast({
        title: "Dictionnaire importé",
        description: `${imported} entrées importées`,
      });
    } catch (error: any) {
      setDictionaryStatus({ status: 'error', count: 0, message: `❌ Erreur: ${error.message}` });
      toast({
        title: "Erreur d'import",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusIcon = (status: FileImportStatus['status']) => {
    switch (status) {
      case 'importing': return <Loader2 className="h-5 w-5 animate-spin text-primary" />;
      case 'success': return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'error': return <AlertTriangle className="h-5 w-5 text-destructive" />;
      default: return <FileText className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: FileImportStatus['status']) => {
    switch (status) {
      case 'importing': return <Badge variant="outline" className="bg-primary/10">En cours</Badge>;
      case 'success': return <Badge variant="outline" className="bg-green-500/10 text-green-500">Importé</Badge>;
      case 'error': return <Badge variant="destructive">Erreur</Badge>;
      default: return <Badge variant="outline">Non importé</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Database Statistics */}
      {dbStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              État Actuel de la Base de Données
            </CardTitle>
            <CardDescription>
              Données actuellement utilisées par le système SMT
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Languages className="h-4 w-4 text-primary" />
                  <span className="font-semibold">Phrases d'entraînement</span>
                </div>
                <p className="text-3xl font-bold">{dbStats.trainingPhrases.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground mt-1">paires FR-BBA</p>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen className="h-4 w-4 text-primary" />
                  <span className="font-semibold">Dictionnaire</span>
                </div>
                <p className="text-3xl font-bold">{dbStats.dictionaryEntries.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground mt-1">entrées</p>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="font-semibold">Expressions idiomatiques</span>
                </div>
                <p className="text-3xl font-bold">{dbStats.idiomaticExpressions.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground mt-1">expressions</p>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Dernière mise à jour : {dbStats.lastUpdated?.toLocaleString('fr-FR')}
              </p>
              <Button onClick={loadDatabaseStats} variant="outline" size="sm">
                <RefreshCw className="mr-2 h-4 w-4" />
                Actualiser
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>⚠️ Import des Données Premium SMT</AlertTitle>
        <AlertDescription>
          Importez fichier par fichier pour un contrôle total. Vérifiez l'état après chaque import.
          <br />
          <strong>Important :</strong> Créez un backup avant de supprimer les anciennes données.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="smart" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="smart">🤖 Import Intelligent</TabsTrigger>
          <TabsTrigger value="files">Import Manuel</TabsTrigger>
          <TabsTrigger value="quality">Validation & Export</TabsTrigger>
          <TabsTrigger value="manage">Gestion</TabsTrigger>
        </TabsList>

        <TabsContent value="smart" className="space-y-4">
          <SmartDataImporter />
        </TabsContent>

        <TabsContent value="files" className="space-y-4">
          {/* File 1: traducteur_final.json */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getStatusIcon(file1Status.status)}
                  <div>
                    <CardTitle className="text-lg">Fichier 1 : traducteur_final.json</CardTitle>
                    <CardDescription>44,770 paires FR-BBA premium</CardDescription>
                  </div>
                </div>
                {getStatusBadge(file1Status.status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {file1Status.message && (
                <Alert>
                  <AlertDescription>{file1Status.message}</AlertDescription>
                </Alert>
              )}
              {file1Status.timestamp && (
                <p className="text-sm text-muted-foreground">
                  Importé le {file1Status.timestamp.toLocaleString('fr-FR')}
                </p>
              )}
              <Button
                onClick={importFile1}
                disabled={isProcessing}
                className="w-full"
              >
                {file1Status.status === 'importing' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Import en cours...
                  </>
                ) : file1Status.status === 'success' ? (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Réimporter ({file1Status.count} paires)
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Importer traducteur_final.json
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* File 2: traducteur_complet_2.json */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getStatusIcon(file2Status.status)}
                  <div>
                    <CardTitle className="text-lg">Fichier 2 : traducteur_complet_2.json</CardTitle>
                    <CardDescription>36,854 paires FR-BBA premium</CardDescription>
                  </div>
                </div>
                {getStatusBadge(file2Status.status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {file2Status.message && (
                <Alert>
                  <AlertDescription>{file2Status.message}</AlertDescription>
                </Alert>
              )}
              {file2Status.timestamp && (
                <p className="text-sm text-muted-foreground">
                  Importé le {file2Status.timestamp.toLocaleString('fr-FR')}
                </p>
              )}
              <Button
                onClick={importFile2}
                disabled={isProcessing}
                className="w-full"
              >
                {file2Status.status === 'importing' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Import en cours...
                  </>
                ) : file2Status.status === 'success' ? (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Réimporter ({file2Status.count} paires)
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Importer traducteur_complet_2.json
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Dictionary: dictionnaire-10-3.json */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getStatusIcon(dictionaryStatus.status)}
                  <div>
                    <CardTitle className="text-lg">Dictionnaire : dictionnaire-10-3.json</CardTitle>
                    <CardDescription>110,331 entrées de dictionnaire</CardDescription>
                  </div>
                </div>
                {getStatusBadge(dictionaryStatus.status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {dictionaryStatus.message && (
                <Alert>
                  <AlertDescription>{dictionaryStatus.message}</AlertDescription>
                </Alert>
              )}
              {dictionaryStatus.timestamp && (
                <p className="text-sm text-muted-foreground">
                  Importé le {dictionaryStatus.timestamp.toLocaleString('fr-FR')}
                </p>
              )}
              <Button
                onClick={importDictionary}
                disabled={isProcessing}
                className="w-full"
              >
                {dictionaryStatus.status === 'importing' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Import en cours...
                  </>
                ) : dictionaryStatus.status === 'success' ? (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Réimporter ({dictionaryStatus.count} entrées)
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Importer dictionnaire-10-3.json
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quality" className="space-y-4">
          <DataQualityValidator />
        </TabsContent>

        <TabsContent value="manage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Gestion des Données</CardTitle>
              <CardDescription>
                Backup et suppression des anciennes données
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Créer un backup
                </h4>
                <Button
                  onClick={createBackup}
                  disabled={isProcessing}
                  variant={backupCreated ? "outline" : "default"}
                  className="w-full"
                >
                  {backupCreated ? (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Backup créé
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Créer le backup
                    </>
                  )}
                </Button>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <Trash2 className="h-4 w-4" />
                  Supprimer les anciennes données
                </h4>
                <Button
                  onClick={clearAllData}
                  disabled={isProcessing}
                  variant="destructive"
                  className="w-full"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Supprimer toutes les anciennes données
                </Button>
              </div>

              {isProcessing && progress > 0 && (
                <div className="space-y-2">
                  <Progress value={progress} />
                  <p className="text-sm text-center text-muted-foreground">
                    {Math.round(progress)}%
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
