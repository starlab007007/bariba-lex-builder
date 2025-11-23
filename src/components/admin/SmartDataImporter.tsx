import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Upload, CheckCircle2, AlertTriangle, Loader2, FileJson, Zap } from "lucide-react";

interface DetectedStructure {
  type: 'phrases' | 'dictionary' | 'unknown';
  frenchColumn: string | null;
  baribaColumn: string | null;
  wordColumn: string | null;
  definitionColumn: string | null;
  sampleData: any[];
  confidence: number;
}

export function SmartDataImporter() {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [detectedStructure, setDetectedStructure] = useState<DetectedStructure | null>(null);
  const [importResult, setImportResult] = useState<{ imported: number; errors: number } | null>(null);

  const detectStructure = (data: any[]): DetectedStructure => {
    if (!data || data.length === 0) {
      return {
        type: 'unknown',
        frenchColumn: null,
        baribaColumn: null,
        wordColumn: null,
        definitionColumn: null,
        sampleData: [],
        confidence: 0
      };
    }

    const sample = data.slice(0, 10);
    const keys = Object.keys(data[0] || {});
    
    // Détecter les colonnes françaises
    const frenchKeys = ['french', 'french_text', 'francais', 'fr', 'source', 'source_text'];
    const frenchColumn = keys.find(k => 
      frenchKeys.some(fk => k.toLowerCase().includes(fk.toLowerCase()))
    );

    // Détecter les colonnes Bariba
    const baribaKeys = ['bariba', 'bariba_text', 'baatonum', 'bba', 'target', 'target_text'];
    const baribaColumn = keys.find(k => 
      baribaKeys.some(bk => k.toLowerCase().includes(bk.toLowerCase()))
    );

    // Détecter les colonnes dictionnaire
    const wordKeys = ['word', 'mot', 'baatonum', 'bariba', 'entry'];
    const wordColumn = keys.find(k => 
      wordKeys.some(wk => k.toLowerCase().includes(wk.toLowerCase()))
    );

    const definitionKeys = ['definition', 'def', 'francais', 'french', 'meaning'];
    const definitionColumn = keys.find(k => 
      definitionKeys.some(dk => k.toLowerCase().includes(dk.toLowerCase()))
    );

    // Déterminer le type
    let type: 'phrases' | 'dictionary' | 'unknown' = 'unknown';
    let confidence = 0;

    if (frenchColumn && baribaColumn) {
      type = 'phrases';
      confidence = 90;
    } else if (wordColumn && definitionColumn) {
      type = 'dictionary';
      confidence = 85;
    } else if (keys.length === 2) {
      // Fallback: si 2 colonnes, supposer phrase FR-BBA
      type = 'phrases';
      confidence = 60;
    }

    return {
      type,
      frenchColumn: frenchColumn || keys[0] || null,
      baribaColumn: baribaColumn || keys[1] || null,
      wordColumn: wordColumn || keys[0] || null,
      definitionColumn: definitionColumn || keys[1] || null,
      sampleData: sample,
      confidence
    };
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
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

    setFile(selectedFile);
    setDetectedStructure(null);
    setImportResult(null);
    
    // Analyser automatiquement
    await analyzeFile(selectedFile);
  };

  const analyzeFile = async (fileToAnalyze: File) => {
    setIsAnalyzing(true);
    toast({ title: "🔍 Analyse du fichier..." });

    try {
      const text = await fileToAnalyze.text();
      const data = JSON.parse(text);
      
      const arrayData = Array.isArray(data) ? data : Object.values(data);
      
      if (arrayData.length === 0) {
        throw new Error("Le fichier est vide");
      }

      const structure = detectStructure(arrayData);
      setDetectedStructure(structure);

      if (structure.confidence < 50) {
        toast({
          title: "⚠️ Structure incertaine",
          description: "La structure du fichier n'a pas pu être détectée avec certitude. Vérifiez les colonnes détectées.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "✅ Analyse terminée",
          description: `Type détecté: ${structure.type} (confiance: ${structure.confidence}%)`
        });
      }
    } catch (error: any) {
      toast({
        title: "❌ Erreur d'analyse",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const importData = async () => {
    if (!file || !detectedStructure) return;

    setIsImporting(true);
    setProgress(0);
    toast({ title: "📥 Import en cours..." });

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const arrayData = Array.isArray(data) ? data : Object.values(data);

      let imported = 0;
      let errors = 0;

      if (detectedStructure.type === 'phrases') {
        setProgress(10);
        
        // Nettoyer et préparer les données
        const cleanedData = arrayData
          .filter(item => {
            const french = item[detectedStructure.frenchColumn!];
            const bariba = item[detectedStructure.baribaColumn!];
            return french && bariba && 
                   typeof french === 'string' && 
                   typeof bariba === 'string' &&
                   french.trim().length > 0 && 
                   bariba.trim().length > 0;
          })
          .map(item => ({
            french_text: String(item[detectedStructure.frenchColumn!]).trim(),
            bariba_text: String(item[detectedStructure.baribaColumn!]).trim(),
            source: file.name.replace('.json', ''),
            quality_score: 1.0,
            is_validated: true
          }));

        console.log(`Données nettoyées: ${cleanedData.length}/${arrayData.length}`);
        
        // Import par batch
        const batchSize = 500;
        for (let i = 0; i < cleanedData.length; i += batchSize) {
          const batch = cleanedData.slice(i, i + batchSize);
          
          const { error } = await supabase
            .from('training_phrases')
            .insert(batch);

          if (error) {
            console.error('Batch error:', error);
            errors += batch.length;
          } else {
            imported += batch.length;
          }

          const progressPercent = 10 + (80 * (i + batch.length)) / cleanedData.length;
          setProgress(progressPercent);
        }

      } else if (detectedStructure.type === 'dictionary') {
        setProgress(10);
        
        // Nettoyer et préparer les données du dictionnaire
        const cleanedData = arrayData
          .filter(item => {
            const word = item[detectedStructure.wordColumn!];
            const definition = item[detectedStructure.definitionColumn!];
            return word && definition && 
                   typeof word === 'string' && 
                   typeof definition === 'string' &&
                   word.trim().length > 0 && 
                   definition.trim().length > 0;
          })
          .map(item => ({
            word: String(item[detectedStructure.wordColumn!]).trim(),
            definition: String(item[detectedStructure.definitionColumn!]).trim(),
            phonetic: item.phonetic || item.phon || null,
            part_of_speech: item.part_of_speech || item.pos || item.nature || null,
            example_bariba: Array.isArray(item.example_bariba) ? item.example_bariba : 
                           Array.isArray(item.examples) ? item.examples : [],
            example_francais: Array.isArray(item.example_francais) ? item.example_francais :
                             Array.isArray(item.exemples_fr) ? item.exemples_fr : [],
            variants: Array.isArray(item.variants) ? item.variants : [],
            french_keywords: Array.isArray(item.french_keywords) ? item.french_keywords : [],
            quality_score: 1.0,
            is_verified: true
          }));

        console.log(`Données nettoyées: ${cleanedData.length}/${arrayData.length}`);
        
        // Import par batch
        const batchSize = 500;
        for (let i = 0; i < cleanedData.length; i += batchSize) {
          const batch = cleanedData.slice(i, i + batchSize);
          
          const { error } = await supabase
            .from('dictionary_entries')
            .insert(batch);

          if (error) {
            console.error('Batch error:', error);
            errors += batch.length;
          } else {
            imported += batch.length;
          }

          const progressPercent = 10 + (80 * (i + batch.length)) / cleanedData.length;
          setProgress(progressPercent);
        }
      }

      setProgress(100);
      setImportResult({ imported, errors });

      if (imported > 0) {
        toast({
          title: "✅ Import réussi",
          description: `${imported} entrées importées${errors > 0 ? ` (${errors} erreurs)` : ''}`
        });
      } else {
        toast({
          title: "⚠️ Aucune donnée importée",
          description: "Vérifiez la structure de vos données",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error('Import error:', error);
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Import Intelligent Automatique
        </CardTitle>
        <CardDescription>
          Importez n'importe quel fichier JSON - le système détecte automatiquement les colonnes FR/BBA
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>🤖 Détection Automatique</AlertTitle>
          <AlertDescription>
            Le système analyse automatiquement votre fichier et détecte les colonnes françaises et Bariba.
            Aucune configuration manuelle nécessaire.
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label htmlFor="file-upload">Sélectionner un fichier JSON</Label>
          <Input
            id="file-upload"
            type="file"
            accept=".json"
            onChange={handleFileChange}
            disabled={isAnalyzing || isImporting}
          />
          {file && (
            <p className="text-sm text-muted-foreground">
              Fichier sélectionné: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
            </p>
          )}
        </div>

        {isAnalyzing && (
          <div className="flex items-center gap-2 p-4 border rounded-lg">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Analyse en cours...</span>
          </div>
        )}

        {detectedStructure && (
          <div className="space-y-4">
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>Structure détectée</AlertTitle>
              <AlertDescription>
                <div className="space-y-2 mt-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={detectedStructure.confidence >= 70 ? "default" : "outline"}>
                      Type: {detectedStructure.type}
                    </Badge>
                    <Badge variant={detectedStructure.confidence >= 70 ? "default" : "destructive"}>
                      Confiance: {detectedStructure.confidence}%
                    </Badge>
                  </div>
                  
                  {detectedStructure.type === 'phrases' && (
                    <div className="text-sm space-y-1">
                      <div><strong>Colonne française:</strong> {detectedStructure.frenchColumn}</div>
                      <div><strong>Colonne Bariba:</strong> {detectedStructure.baribaColumn}</div>
                    </div>
                  )}
                  
                  {detectedStructure.type === 'dictionary' && (
                    <div className="text-sm space-y-1">
                      <div><strong>Colonne mot:</strong> {detectedStructure.wordColumn}</div>
                      <div><strong>Colonne définition:</strong> {detectedStructure.definitionColumn}</div>
                    </div>
                  )}
                  
                  {detectedStructure.sampleData.length > 0 && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm font-medium">
                        Aperçu des données (cliquez pour voir)
                      </summary>
                      <pre className="text-xs bg-muted p-2 rounded mt-2 overflow-auto max-h-40">
                        {JSON.stringify(detectedStructure.sampleData.slice(0, 3), null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </AlertDescription>
            </Alert>

            <Button
              onClick={importData}
              disabled={isImporting || detectedStructure.confidence < 30}
              className="w-full"
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
                  Lancer l'import automatique
                </>
              )}
            </Button>

            {isImporting && (
              <Progress value={progress} className="w-full" />
            )}
          </div>
        )}

        {importResult && (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>Résultat de l'import</AlertTitle>
            <AlertDescription>
              <div className="space-y-1 mt-2">
                <div className="text-green-600 font-semibold">
                  ✅ {importResult.imported.toLocaleString()} entrées importées avec succès
                </div>
                {importResult.errors > 0 && (
                  <div className="text-red-600">
                    ❌ {importResult.errors.toLocaleString()} erreurs
                  </div>
                )}
                <p className="text-sm text-muted-foreground mt-2">
                  Les données sont maintenant disponibles pour le système de traduction SMT.
                </p>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <Alert>
          <FileJson className="h-4 w-4" />
          <AlertTitle>Format attendu</AlertTitle>
          <AlertDescription>
            <div className="text-sm space-y-1 mt-2">
              <div><strong>Pour les phrases:</strong> Colonnes avec "french/francais/fr" et "bariba/baatonum/bba"</div>
              <div><strong>Pour le dictionnaire:</strong> Colonnes avec "word/mot" et "definition/def"</div>
              <div className="text-muted-foreground text-xs mt-2">
                Le système s'adapte automatiquement aux différentes structures de données.
              </div>
            </div>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
