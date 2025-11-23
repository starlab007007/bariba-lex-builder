import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { smtInitializer } from '@/services/SMTInitializer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Upload, Loader2, Database, FileText, Book, Trash2, Download, RefreshCw, CheckCircle, AlertCircle, Shield } from 'lucide-react';

interface DataStats {
  totalPhrases: number;
  totalDictionary: number;
  totalIdioms: number;
  phrasesBySource: Record<string, number>;
  avgQuality: number;
}

interface ImportPreview {
  type: 'phrases' | 'dictionary' | 'idioms';
  count: number;
  sample: any[];
  quality: number;
  detectedFields: string[];
  mappedFields?: { source: string; target: string; }[];
  confidence: number;
}

export default function UnifiedDataManager() {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState<DataStats | null>(null);
  const [activeTab, setActiveTab] = useState('import');

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [phrasesRes, dictRes, idiomsRes] = await Promise.all([
        supabase.from('training_phrases').select('source, quality_score', { count: 'exact' }),
        supabase.from('dictionary_entries').select('id', { count: 'exact' }),
        supabase.from('idiomatic_expressions').select('id', { count: 'exact' })
      ]);

      const phrasesBySource: Record<string, number> = {};
      let totalQuality = 0;
      let qualityCount = 0;

      phrasesRes.data?.forEach(p => {
        phrasesBySource[p.source || 'unknown'] = (phrasesBySource[p.source || 'unknown'] || 0) + 1;
        if (p.quality_score) {
          totalQuality += p.quality_score;
          qualityCount++;
        }
      });

      setStats({
        totalPhrases: phrasesRes.count || 0,
        totalDictionary: dictRes.count || 0,
        totalIdioms: idiomsRes.count || 0,
        phrasesBySource,
        avgQuality: qualityCount > 0 ? totalQuality / qualityCount : 0
      });
    } catch (error: any) {
      console.error('Error loading stats:', error);
    }
  };

  const handleExport = async () => {
    try {
      const [phrases, dictionary, idioms] = await Promise.all([
        supabase.from('training_phrases').select('*'),
        supabase.from('dictionary_entries').select('*'),
        supabase.from('idiomatic_expressions').select('*')
      ]);

      const exportData = {
        export_date: new Date().toISOString(),
        phrases: phrases.data || [],
        dictionary: dictionary.data || [],
        idioms: idioms.data || []
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: "✅ Export réussi",
        description: "Toutes les données ont été exportées",
      });
    } catch (error: any) {
      toast({
        title: "❌ Erreur d'export",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleClearAll = async () => {
    if (!confirm("⚠️ ATTENTION: Supprimer TOUTES les données (phrases, dictionnaire, idiomes)? Cette action est IRRÉVERSIBLE!")) return;
    if (!confirm("Êtes-vous ABSOLUMENT SÛR? Tapez OUI dans l'alerte suivante.")) return;

    try {
      await Promise.all([
        supabase.from('training_phrases').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('dictionary_entries').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('idiomatic_expressions').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      ]);

      await loadStats();
      
      toast({
        title: "✅ Données supprimées",
        description: "Toutes les données ont été supprimées",
      });
    } catch (error: any) {
      toast({
        title: "❌ Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* PHASE 5: Auth Status Banner */}
      {!user && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            ❌ Vous devez être connecté en tant qu'administrateur pour importer des données.
            <a href="/auth" className="ml-2 underline font-semibold">Se connecter</a>
          </AlertDescription>
        </Alert>
      )}
      
      {user && (
        <Alert className="bg-green-500/10 border-green-500/20">
          <Shield className="h-4 w-4 text-green-500" />
          <AlertDescription className="flex items-center justify-between">
            <div>
              <span className="font-semibold">Connecté:</span> {user.email}
              <Badge className="ml-2" variant={isAdmin ? "default" : "secondary"}>
                {isAdmin ? "Admin" : "User"}
              </Badge>
            </div>
            <CheckCircle className="h-5 w-5 text-green-500" />
          </AlertDescription>
        </Alert>
      )}

      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold">Gestion Unifiée des Données</h2>
          <p className="text-muted-foreground">Import intelligent par type de données</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadStats}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Exporter tout
          </Button>
          <Button variant="destructive" onClick={handleClearAll} disabled={!user}>
            <Trash2 className="h-4 w-4 mr-2" />
            Tout supprimer
          </Button>
        </div>
      </div>

      {/* Statistiques */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Phrases SMT</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalPhrases.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {Object.keys(stats.phrasesBySource).length} sources
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Dictionnaire</CardTitle>
              <Book className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalDictionary.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Entrées totales</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Idiomes</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalIdioms.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Expressions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Qualité moyenne</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(stats.avgQuality * 100).toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">Score global</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="import" disabled={!user}>Import Intelligent</TabsTrigger>
          <TabsTrigger value="phrases" disabled={!user}>Phrases SMT</TabsTrigger>
          <TabsTrigger value="dictionary" disabled={!user}>Dictionnaire</TabsTrigger>
          <TabsTrigger value="idioms" disabled={!user}>Idiomes</TabsTrigger>
        </TabsList>

        <TabsContent value="import">
          <GeneralImportTab user={user} onComplete={loadStats} />
        </TabsContent>

        <TabsContent value="phrases">
          <PhrasesImportTab user={user} onComplete={loadStats} />
        </TabsContent>

        <TabsContent value="dictionary">
          <DictionaryImportTab user={user} onComplete={loadStats} />
        </TabsContent>

        <TabsContent value="idioms">
          <IdiomsImportTab user={user} onComplete={loadStats} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============= GENERAL IMPORT TAB =============
function GeneralImportTab({ user, onComplete }: { user: any; onComplete: () => void }) {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [importedCount, setImportedCount] = useState<number | null>(null);

  const detectType = (data: any[]): ImportPreview | null => {
    if (!data || data.length === 0) return null;

    const first = data[0];
    const fields = Object.keys(first);

    // PHASE 6: Validation checks
    console.log("🔍 Détection de type:", { fields, sample: first });

    // Phrases patterns
    const frPatterns = ['french', 'francais', 'français', 'fr', 'french_text', 'texte_fr'];
    const bbaPatterns = ['bariba', 'baatonum', 'bba', 'bariba_text', 'bba_latn', 'bba_latin'];
    
    const hasFr = fields.some(f => frPatterns.some(p => f.toLowerCase().includes(p)));
    const hasBba = fields.some(f => bbaPatterns.some(p => f.toLowerCase().includes(p)));

    if (hasFr && hasBba) {
      const frField = fields.find(f => frPatterns.some(p => f.toLowerCase().includes(p)))!;
      const bbaField = fields.find(f => bbaPatterns.some(p => f.toLowerCase().includes(p)))!;

      return {
        type: 'phrases',
        count: data.length,
        sample: data.slice(0, 3),
        quality: 85,
        detectedFields: [frField, bbaField],
        mappedFields: [
          { source: frField, target: 'french_text' },
          { source: bbaField, target: 'bariba_text' }
        ],
        confidence: 95
      };
    }

    // Dictionary patterns
    const wordPatterns = ['word', 'mot', 'bariba', 'baatonum'];
    const defPatterns = ['definition', 'def', 'french', 'francais', 'français'];
    
    const hasWord = fields.some(f => wordPatterns.some(p => f.toLowerCase() === p || f.toLowerCase().includes(p)));
    const hasDef = fields.some(f => defPatterns.some(p => f.toLowerCase() === p || f.toLowerCase().includes(p)));

    if (hasWord && hasDef) {
      const wordField = fields.find(f => wordPatterns.some(p => f.toLowerCase().includes(p)))!;
      const defField = fields.find(f => defPatterns.some(p => f.toLowerCase().includes(p)))!;

      return {
        type: 'dictionary',
        count: data.length,
        sample: data.slice(0, 3),
        quality: 80,
        detectedFields: [wordField, defField],
        mappedFields: [
          { source: wordField, target: 'word' },
          { source: defField, target: 'definition' }
        ],
        confidence: 90
      };
    }

    // Idioms patterns
    const frExprPatterns = ['french_expression', 'expression_francaise', 'francais'];
    const bbaExprPatterns = ['bariba_expression', 'expression_bariba', 'baatonum'];
    
    const hasFrExpr = fields.some(f => frExprPatterns.some(p => f.toLowerCase().includes(p)));
    const hasBbaExpr = fields.some(f => bbaExprPatterns.some(p => f.toLowerCase().includes(p)));

    if (hasFrExpr && hasBbaExpr) {
      const frExprField = fields.find(f => frExprPatterns.some(p => f.toLowerCase().includes(p)))!;
      const bbaExprField = fields.find(f => bbaExprPatterns.some(p => f.toLowerCase().includes(p)))!;

      return {
        type: 'idioms',
        count: data.length,
        sample: data.slice(0, 3),
        quality: 85,
        detectedFields: [frExprField, bbaExprField],
        mappedFields: [
          { source: frExprField, target: 'french_expression' },
          { source: bbaExprField, target: 'bariba_expression' }
        ],
        confidence: 90
      };
    }

    return null;
  };

  const analyzeFile = async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const arrayData = Array.isArray(data) ? data : data.data || data.items || [];

      console.log("📁 Fichier analysé:", { totalEntries: arrayData.length });

      const detected = detectType(arrayData);
      if (!detected) {
        toast({
          title: "❌ Format non reconnu",
          description: "Impossible de détecter le type de données",
          variant: "destructive",
        });
        return;
      }

      setPreview(detected);
      toast({
        title: "✅ Analyse terminée",
        description: `Type détecté: ${detected.type} (${detected.confidence}% confiance)`,
      });
    } catch (error: any) {
      toast({
        title: "❌ Erreur d'analyse",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setImportedCount(null);
      analyzeFile(selectedFile);
    }
  };

  const handleImport = async () => {
    // PHASE 1: Authentication Check
    if (!user) {
      toast({
        title: "❌ Authentification requise",
        description: "Vous devez être connecté en tant qu'administrateur pour importer des données",
        variant: "destructive",
      });
      return;
    }

    if (!file || !preview) return;

    console.log("🚀 DÉBUT IMPORT:", {
      type: preview.type,
      totalEntries: preview.count,
      user: user.email,
      timestamp: new Date().toISOString()
    });

    setLoading(true);
    setProgress(0);

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const arrayData = Array.isArray(data) ? data : data.data || data.items || [];

      let imported = 0;
      let skipped = 0;
      const errors: { batch: number; error: string; code?: string; details?: string; hint?: string }[] = [];
      const errorDetails: string[] = [];
      const batchSize = 100;

      // PHASE 2 & 3: Enhanced Error Handling with Detailed Logging
      for (let i = 0; i < arrayData.length; i += batchSize) {
        const batch = arrayData.slice(i, i + batchSize);
        setProgress((i / arrayData.length) * 100);

        try {
          if (preview.type === 'phrases') {
            const items = batch.map((item: any) => ({
              french_text: item[preview.mappedFields![0].source],
              bariba_text: item[preview.mappedFields![1].source],
              source: `import_${new Date().toISOString().split('T')[0]}`,
              quality_score: 0.85,
              created_by: user.id
            })).filter((item: any) => item.french_text && item.bariba_text);

            const { error, count } = await supabase.from('training_phrases').upsert(items, {
              onConflict: 'french_text,bariba_text',
              count: 'exact'
            });

            if (error) {
              console.error(`❌ BATCH ${i}-${i+batchSize} ERROR:`, {
                message: error.message,
                code: error.code,
                details: error.details,
                hint: error.hint
              });
              errors.push({
                batch: i,
                error: error.message,
                code: error.code,
                details: error.details,
                hint: error.hint
              });
              errorDetails.push(`Batch ${i}: ${error.message} (${error.code || 'N/A'})`);
            } else {
              const actualImported = count || items.length;
              imported += actualImported;
              skipped += items.length - actualImported;
              console.log(`✅ BATCH ${i}-${i+batchSize}: ${actualImported} importées, ${items.length - actualImported} doublons ignorés`);
            }

          } else if (preview.type === 'dictionary') {
            const items = batch.map((item: any) => ({
              word: item[preview.mappedFields![0].source],
              definition: item[preview.mappedFields![1].source],
              created_by: user.id
            })).filter((item: any) => item.word && item.definition);

            const { error, count } = await supabase.from('dictionary_entries').upsert(items, {
              onConflict: 'word',
              count: 'exact'
            });

            if (error) {
              console.error(`❌ BATCH ${i}-${i+batchSize} ERROR:`, {
                message: error.message,
                code: error.code,
                details: error.details,
                hint: error.hint
              });
              errors.push({
                batch: i,
                error: error.message,
                code: error.code,
                details: error.details,
                hint: error.hint
              });
              errorDetails.push(`Batch ${i}: ${error.message} (${error.code || 'N/A'})`);
            } else {
              const actualImported = count || items.length;
              imported += actualImported;
              skipped += items.length - actualImported;
              console.log(`✅ BATCH ${i}-${i+batchSize}: ${actualImported} importées, ${items.length - actualImported} doublons ignorés`);
            }

          } else if (preview.type === 'idioms') {
            const items = batch.map((item: any) => ({
              french_expression: item[preview.mappedFields![0].source],
              bariba_expression: item[preview.mappedFields![1].source],
              category: item.category || item.categorie || 'général',
              created_by: user.id
            })).filter((item: any) => item.french_expression && item.bariba_expression);

            const { error, count } = await supabase.from('idiomatic_expressions').upsert(items, {
              onConflict: 'french_expression',
              count: 'exact'
            });

            if (error) {
              console.error(`❌ BATCH ${i}-${i+batchSize} ERROR:`, {
                message: error.message,
                code: error.code,
                details: error.details,
                hint: error.hint
              });
              errors.push({
                batch: i,
                error: error.message,
                code: error.code,
                details: error.details,
                hint: error.hint
              });
              errorDetails.push(`Batch ${i}: ${error.message} (${error.code || 'N/A'})`);
            } else {
              const actualImported = count || items.length;
              imported += actualImported;
              skipped += items.length - actualImported;
              console.log(`✅ BATCH ${i}-${i+batchSize}: ${actualImported} importées, ${items.length - actualImported} doublons ignorés`);
            }
          }
        } catch (batchError: any) {
          console.error(`❌ BATCH ${i} EXCEPTION:`, batchError);
          errors.push({
            batch: i,
            error: batchError.message,
            code: 'EXCEPTION',
            details: batchError.stack
          });
          errorDetails.push(`Batch ${i}: ${batchError.message} (EXCEPTION)`);
        }
      }

      setProgress(100);
      setImportedCount(imported);

      // PHASE 4: Refresh SMT after phrase import
      if (preview.type === 'phrases') {
        console.log("🔄 Rafraîchissement SMT...");
        const smtStatus = await smtInitializer.refresh();
        console.log("✅ SMT Status:", smtStatus);
        toast({
          title: "🔄 SMT Rafraîchi",
          description: `${smtStatus.phrasesCount.toLocaleString()} phrases actives`,
        });
      }

      onComplete();

      // PHASE 2: Detailed Success/Error Report
      console.log("📊 RAPPORT FINAL:", {
        totalAnalyzed: arrayData.length,
        imported,
        skipped,
        errors: errors.length,
        errorDetails
      });

      if (errors.length > 0) {
        toast({
          title: "⚠️ Import partiel",
          description: `✅ ${imported} importées, ⚠️ ${skipped} doublons, ❌ ${errors.length} erreurs`,
          variant: "destructive",
          action: errors.length > 0 ? (
            <Button variant="outline" size="sm" onClick={() => {
              console.log("📋 ERREURS DÉTAILLÉES:", errors);
              alert(`Erreurs d'import:\n\n${errorDetails.join('\n\n')}`);
            }}>
              Voir erreurs
            </Button>
          ) : undefined
        });
      } else if (skipped > 0) {
        toast({
          title: "✅ Import terminé",
          description: `${imported.toLocaleString()} nouvelles entrées, ${skipped} doublons ignorés`,
        });
      } else {
        toast({
          title: "✅ Import terminé",
          description: `${imported.toLocaleString()} éléments importés`,
        });
      }

    } catch (error: any) {
      console.error('❌ Import error:', error);
      toast({
        title: "❌ Erreur d'import",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import Intelligent Multi-Format</CardTitle>
        <CardDescription>
          Détecte automatiquement le type de données et les importe dans la table appropriée
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="border-2 border-dashed rounded-lg p-8 text-center">
          <input
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
            id="general-import"
            disabled={loading || !user}
          />
          <label htmlFor="general-import" className="cursor-pointer flex flex-col items-center gap-2">
            <Upload className="h-8 w-8 text-muted-foreground" />
            <div className="text-sm text-muted-foreground">
              {file ? file.name : 'Sélectionner un fichier JSON'}
            </div>
          </label>
        </div>

        {preview && (
          <div className="space-y-2 p-4 border rounded-lg bg-muted/50">
            <div className="flex items-center gap-2">
              <Badge variant="default">{preview.type.toUpperCase()}</Badge>
              <span className="text-sm">Confiance: {preview.confidence}%</span>
            </div>
            <div className="text-sm space-y-1">
              <div><strong>Entrées:</strong> {preview.count.toLocaleString()}</div>
              <div><strong>Champs détectés:</strong> {preview.detectedFields.join(', ')}</div>
              {preview.mappedFields && (
                <div className="mt-2 text-xs">
                  <div><strong>Mapping:</strong></div>
                  {preview.mappedFields.map((m, i) => (
                    <div key={i} className="ml-2">• {m.source} → {m.target}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {loading && (
          <div className="space-y-2">
            <Progress value={progress} />
            <p className="text-sm text-center text-muted-foreground">
              Import en cours: {Math.round(progress)}%
            </p>
          </div>
        )}

        {importedCount !== null && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              ✅ {importedCount.toLocaleString()} éléments importés avec succès
            </AlertDescription>
          </Alert>
        )}

        <Button 
          onClick={handleImport} 
          disabled={!preview || loading || !user}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Import en cours...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Importer {preview?.count.toLocaleString() || 0} éléments
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

// ============= PHRASES IMPORT TAB =============
function PhrasesImportTab({ user, onComplete }: { user: any; onComplete: () => void }) {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const analyzeFile = async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const arrayData = Array.isArray(data) ? data : data.data || data.items || [];

      const first = arrayData[0];
      const fields = Object.keys(first);

      // Detect FR and BBA fields
      const frPatterns = ['french', 'francais', 'français', 'fr', 'french_text', 'texte_fr'];
      const bbaPatterns = ['bariba', 'baatonum', 'bba', 'bariba_text', 'bba_latn', 'bba_latin'];
      
      const frField = fields.find(f => frPatterns.some(p => f.toLowerCase().includes(p)));
      const bbaField = fields.find(f => bbaPatterns.some(p => f.toLowerCase().includes(p)));

      if (!frField || !bbaField) {
        throw new Error(`Champs français ou bariba non trouvés. Champs disponibles: ${fields.join(', ')}`);
      }

      setPreview({
        type: 'phrases',
        count: arrayData.length,
        sample: arrayData.slice(0, 3),
        quality: 85,
        detectedFields: [frField, bbaField],
        mappedFields: [
          { source: frField, target: 'french_text' },
          { source: bbaField, target: 'bariba_text' }
        ],
        confidence: 95
      });

      toast({
        title: "✅ Analyse terminée",
        description: `${arrayData.length.toLocaleString()} paires FR-BBA détectées`,
      });
    } catch (error: any) {
      toast({
        title: "❌ Erreur d'analyse",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      analyzeFile(selectedFile);
    }
  };

  const handleImport = async () => {
    // PHASE 1: Authentication Check
    if (!user) {
      toast({
        title: "❌ Authentification requise",
        description: "Vous devez être connecté pour importer des phrases SMT",
        variant: "destructive",
      });
      return;
    }

    if (!file || !preview) return;

    console.log("🚀 DÉBUT IMPORT PHRASES SMT:", {
      totalPhrases: preview.count,
      user: user.email
    });

    setLoading(true);
    setProgress(0);

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const arrayData = Array.isArray(data) ? data : data.data || data.items || [];

      let imported = 0;
      let skipped = 0;
      const errors: { batch: number; error: string; code?: string; details?: string; hint?: string }[] = [];
      const errorDetails: string[] = [];
      const batchSize = 100;

      for (let i = 0; i < arrayData.length; i += batchSize) {
        const batch = arrayData.slice(i, i + batchSize);
        setProgress((i / arrayData.length) * 100);

        try {
          const items = batch.map((item: any) => ({
            french_text: item[preview.mappedFields![0].source],
            bariba_text: item[preview.mappedFields![1].source],
            source: `import_${new Date().toISOString().split('T')[0]}`,
            quality_score: 0.85,
            created_by: user.id
          })).filter((item: any) => item.french_text && item.bariba_text);

          const { error, count } = await supabase.from('training_phrases').upsert(items, {
            onConflict: 'french_text,bariba_text',
            count: 'exact'
          });

          if (error) {
            console.error(`❌ BATCH ${i}-${i+batchSize} ERROR:`, {
              message: error.message,
              code: error.code,
              details: error.details,
              hint: error.hint
            });
            errors.push({
              batch: i,
              error: error.message,
              code: error.code,
              details: error.details,
              hint: error.hint
            });
            errorDetails.push(`Batch ${i}: ${error.message} (${error.code || 'N/A'})`);
          } else {
            const actualImported = count || items.length;
            imported += actualImported;
            skipped += items.length - actualImported;
            console.log(`✅ BATCH ${i}-${i+batchSize}: ${actualImported} importées, ${items.length - actualImported} doublons ignorés`);
          }
        } catch (batchError: any) {
          console.error(`❌ BATCH ${i} EXCEPTION:`, batchError);
          errors.push({
            batch: i,
            error: batchError.message,
            code: 'EXCEPTION',
            details: batchError.stack
          });
          errorDetails.push(`Batch ${i}: ${batchError.message} (EXCEPTION)`);
        }
      }

      setProgress(100);

      // Refresh SMT system after import
      console.log("🔄 Rafraîchissement SMT...");
      const smtStatus = await smtInitializer.refresh();
      console.log("✅ SMT Status:", smtStatus);

      onComplete();

      console.log("📊 RAPPORT FINAL PHRASES:", {
        totalAnalyzed: arrayData.length,
        imported,
        skipped,
        errors: errors.length,
        errorDetails
      });

      if (errors.length > 0) {
        toast({
          title: "⚠️ Import partiel",
          description: `✅ ${imported} importées, ⚠️ ${skipped} doublons, ❌ ${errors.length} erreurs. SMT: ${smtStatus.phrasesCount.toLocaleString()}`,
          variant: "destructive",
          action: (
            <Button variant="outline" size="sm" onClick={() => {
              console.log("📋 ERREURS DÉTAILLÉES:", errors);
              alert(`Erreurs d'import:\n\n${errorDetails.join('\n\n')}`);
            }}>
              Voir erreurs
            </Button>
          )
        });
      } else if (skipped > 0) {
        toast({
          title: "✅ Import terminé",
          description: `${imported.toLocaleString()} nouvelles, ${skipped} doublons. SMT: ${smtStatus.phrasesCount.toLocaleString()} actives`,
        });
      } else {
        toast({
          title: "✅ Import réussi",
          description: `${imported.toLocaleString()} phrases. SMT: ${smtStatus.phrasesCount.toLocaleString()} actives`,
        });
      }

    } catch (error: any) {
      console.error('❌ Import error:', error);
      toast({
        title: "❌ Erreur d'import",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import de Phrases SMT</CardTitle>
        <CardDescription>
          Import dédié aux paires de phrases français-bariba pour le système SMT
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="border-2 border-dashed rounded-lg p-8 text-center">
          <input
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
            id="phrases-import"
            disabled={loading || !user}
          />
          <label htmlFor="phrases-import" className="cursor-pointer flex flex-col items-center gap-2">
            <FileText className="h-8 w-8 text-muted-foreground" />
            <div className="text-sm text-muted-foreground">
              {file ? file.name : 'Sélectionner un fichier JSON'}
            </div>
          </label>
        </div>

        {preview && (
          <div className="space-y-2 p-4 border rounded-lg bg-muted/50">
            <div className="flex items-center gap-2">
              <Badge variant="default">PHRASES SMT</Badge>
            </div>
            <div className="text-sm space-y-1">
              <div><strong>Paires FR-BBA:</strong> {preview.count.toLocaleString()}</div>
              <div><strong>Champs:</strong> {preview.detectedFields.join(', ')}</div>
            </div>
          </div>
        )}

        {loading && (
          <div className="space-y-2">
            <Progress value={progress} />
            <p className="text-sm text-center text-muted-foreground">
              Import en cours: {Math.round(progress)}%
            </p>
          </div>
        )}

        <Button 
          onClick={handleImport} 
          disabled={!preview || loading || !user}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Import en cours...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Importer {preview?.count.toLocaleString() || 0} phrases
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

// ============= DICTIONARY IMPORT TAB =============
function DictionaryImportTab({ user, onComplete }: { user: any; onComplete: () => void }) {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const analyzeFile = async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const arrayData = Array.isArray(data) ? data : data.data || data.items || [];

      const first = arrayData[0];
      const fields = Object.keys(first);

      // Detect word and definition fields
      const wordPatterns = ['word', 'mot', 'bariba', 'baatonum'];
      const defPatterns = ['definition', 'def', 'french', 'francais', 'français'];
      
      const wordField = fields.find(f => wordPatterns.some(p => f.toLowerCase().includes(p)));
      const defField = fields.find(f => defPatterns.some(p => f.toLowerCase().includes(p)));

      if (!wordField || !defField) {
        throw new Error(`Champs mot ou définition non trouvés. Champs disponibles: ${fields.join(', ')}`);
      }

      setPreview({
        type: 'dictionary',
        count: arrayData.length,
        sample: arrayData.slice(0, 3),
        quality: 80,
        detectedFields: [wordField, defField],
        mappedFields: [
          { source: wordField, target: 'word' },
          { source: defField, target: 'definition' }
        ],
        confidence: 90
      });

      toast({
        title: "✅ Analyse terminée",
        description: `${arrayData.length.toLocaleString()} entrées de dictionnaire détectées`,
      });
    } catch (error: any) {
      toast({
        title: "❌ Erreur d'analyse",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      analyzeFile(selectedFile);
    }
  };

  const handleImport = async () => {
    // PHASE 1: Authentication Check
    if (!user) {
      toast({
        title: "❌ Authentification requise",
        description: "Vous devez être connecté pour importer le dictionnaire",
        variant: "destructive",
      });
      return;
    }

    if (!file || !preview) return;

    console.log("🚀 DÉBUT IMPORT DICTIONNAIRE:", {
      totalEntries: preview.count,
      user: user.email
    });

    setLoading(true);
    setProgress(0);

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const arrayData = Array.isArray(data) ? data : data.data || data.items || [];

      let imported = 0;
      let skipped = 0;
      const errors: { batch: number; error: string; code?: string; details?: string; hint?: string }[] = [];
      const errorDetails: string[] = [];
      const batchSize = 100;

      for (let i = 0; i < arrayData.length; i += batchSize) {
        const batch = arrayData.slice(i, i + batchSize);
        setProgress((i / arrayData.length) * 100);

        try {
          const items = batch.map((item: any) => ({
            word: item[preview.mappedFields![0].source],
            definition: item[preview.mappedFields![1].source],
            created_by: user.id
          })).filter((item: any) => item.word && item.definition);

          const { error, count } = await supabase.from('dictionary_entries').upsert(items, {
            onConflict: 'word',
            count: 'exact'
          });

          if (error) {
            console.error(`❌ BATCH ${i}-${i+batchSize} ERROR:`, {
              message: error.message,
              code: error.code,
              details: error.details,
              hint: error.hint
            });
            errors.push({
              batch: i,
              error: error.message,
              code: error.code,
              details: error.details,
              hint: error.hint
            });
            errorDetails.push(`Batch ${i}: ${error.message} (${error.code || 'N/A'})`);
          } else {
            const actualImported = count || items.length;
            imported += actualImported;
            skipped += items.length - actualImported;
            console.log(`✅ BATCH ${i}-${i+batchSize}: ${actualImported} importées, ${items.length - actualImported} doublons ignorés`);
          }
        } catch (batchError: any) {
          console.error(`❌ BATCH ${i} EXCEPTION:`, batchError);
          errors.push({
            batch: i,
            error: batchError.message,
            code: 'EXCEPTION',
            details: batchError.stack
          });
          errorDetails.push(`Batch ${i}: ${batchError.message} (EXCEPTION)`);
        }
      }

      setProgress(100);

      onComplete();

      console.log("📊 RAPPORT FINAL DICTIONNAIRE:", {
        totalAnalyzed: arrayData.length,
        imported,
        skipped,
        errors: errors.length,
        errorDetails
      });

      if (errors.length > 0) {
        toast({
          title: "⚠️ Import partiel",
          description: `✅ ${imported} importées, ⚠️ ${skipped} doublons, ❌ ${errors.length} erreurs`,
          variant: "destructive",
          action: (
            <Button variant="outline" size="sm" onClick={() => {
              console.log("📋 ERREURS DÉTAILLÉES:", errors);
              alert(`Erreurs d'import:\n\n${errorDetails.join('\n\n')}`);
            }}>
              Voir erreurs
            </Button>
          )
        });
      } else if (skipped > 0) {
        toast({
          title: "✅ Import terminé",
          description: `${imported.toLocaleString()} nouvelles entrées, ${skipped} doublons ignorés`,
        });
      } else {
        toast({
          title: "✅ Import réussi",
          description: `${imported.toLocaleString()} entrées de dictionnaire importées`,
        });
      }

    } catch (error: any) {
      console.error('❌ Import error:', error);
      toast({
        title: "❌ Erreur d'import",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import de Dictionnaire</CardTitle>
        <CardDescription>
          Import dédié aux entrées de dictionnaire bariba-français
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="border-2 border-dashed rounded-lg p-8 text-center">
          <input
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
            id="dictionary-import"
            disabled={loading || !user}
          />
          <label htmlFor="dictionary-import" className="cursor-pointer flex flex-col items-center gap-2">
            <Book className="h-8 w-8 text-muted-foreground" />
            <div className="text-sm text-muted-foreground">
              {file ? file.name : 'Sélectionner un fichier JSON'}
            </div>
          </label>
        </div>

        {preview && (
          <div className="space-y-2 p-4 border rounded-lg bg-muted/50">
            <div className="flex items-center gap-2">
              <Badge variant="default">DICTIONNAIRE</Badge>
            </div>
            <div className="text-sm space-y-1">
              <div><strong>Entrées:</strong> {preview.count.toLocaleString()}</div>
              <div><strong>Champs:</strong> {preview.detectedFields.join(', ')}</div>
            </div>
          </div>
        )}

        {loading && (
          <div className="space-y-2">
            <Progress value={progress} />
            <p className="text-sm text-center text-muted-foreground">
              Import en cours: {Math.round(progress)}%
            </p>
          </div>
        )}

        <Button 
          onClick={handleImport} 
          disabled={!preview || loading || !user}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Import en cours...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Importer {preview?.count.toLocaleString() || 0} entrées
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

// ============= IDIOMS IMPORT TAB =============
function IdiomsImportTab({ user, onComplete }: { user: any; onComplete: () => void }) {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const analyzeFile = async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const arrayData = Array.isArray(data) ? data : data.data || data.items || [];

      const first = arrayData[0];
      const fields = Object.keys(first);

      // Detect expression fields
      const frExprPatterns = ['french_expression', 'expression_francaise', 'francais'];
      const bbaExprPatterns = ['bariba_expression', 'expression_bariba', 'baatonum'];
      
      const frExprField = fields.find(f => frExprPatterns.some(p => f.toLowerCase().includes(p)));
      const bbaExprField = fields.find(f => bbaExprPatterns.some(p => f.toLowerCase().includes(p)));

      if (!frExprField || !bbaExprField) {
        throw new Error(`Champs expressions non trouvés. Champs disponibles: ${fields.join(', ')}`);
      }

      setPreview({
        type: 'idioms',
        count: arrayData.length,
        sample: arrayData.slice(0, 3),
        quality: 85,
        detectedFields: [frExprField, bbaExprField],
        mappedFields: [
          { source: frExprField, target: 'french_expression' },
          { source: bbaExprField, target: 'bariba_expression' }
        ],
        confidence: 90
      });

      toast({
        title: "✅ Analyse terminée",
        description: `${arrayData.length.toLocaleString()} idiomes détectés`,
      });
    } catch (error: any) {
      toast({
        title: "❌ Erreur d'analyse",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      analyzeFile(selectedFile);
    }
  };

  const handleImport = async () => {
    // PHASE 1: Authentication Check
    if (!user) {
      toast({
        title: "❌ Authentification requise",
        description: "Vous devez être connecté pour importer des idiomes",
        variant: "destructive",
      });
      return;
    }

    if (!file || !preview) return;

    console.log("🚀 DÉBUT IMPORT IDIOMES:", {
      totalIdioms: preview.count,
      user: user.email
    });

    setLoading(true);
    setProgress(0);

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const arrayData = Array.isArray(data) ? data : data.data || data.items || [];

      let imported = 0;
      let skipped = 0;
      const errors: { batch: number; error: string; code?: string; details?: string; hint?: string }[] = [];
      const errorDetails: string[] = [];
      const batchSize = 100;

      for (let i = 0; i < arrayData.length; i += batchSize) {
        const batch = arrayData.slice(i, i + batchSize);
        setProgress((i / arrayData.length) * 100);

        try {
          const items = batch.map((item: any) => ({
            french_expression: item[preview.mappedFields![0].source],
            bariba_expression: item[preview.mappedFields![1].source],
            category: item.category || item.categorie || 'général',
            created_by: user.id
          })).filter((item: any) => item.french_expression && item.bariba_expression);

          const { error, count } = await supabase.from('idiomatic_expressions').upsert(items, {
            onConflict: 'french_expression',
            count: 'exact'
          });

          if (error) {
            console.error(`❌ BATCH ${i}-${i+batchSize} ERROR:`, {
              message: error.message,
              code: error.code,
              details: error.details,
              hint: error.hint
            });
            errors.push({
              batch: i,
              error: error.message,
              code: error.code,
              details: error.details,
              hint: error.hint
            });
            errorDetails.push(`Batch ${i}: ${error.message} (${error.code || 'N/A'})`);
          } else {
            const actualImported = count || items.length;
            imported += actualImported;
            skipped += items.length - actualImported;
            console.log(`✅ BATCH ${i}-${i+batchSize}: ${actualImported} importées, ${items.length - actualImported} doublons ignorés`);
          }
        } catch (batchError: any) {
          console.error(`❌ BATCH ${i} EXCEPTION:`, batchError);
          errors.push({
            batch: i,
            error: batchError.message,
            code: 'EXCEPTION',
            details: batchError.stack
          });
          errorDetails.push(`Batch ${i}: ${batchError.message} (EXCEPTION)`);
        }
      }

      setProgress(100);

      onComplete();

      console.log("📊 RAPPORT FINAL IDIOMES:", {
        totalAnalyzed: arrayData.length,
        imported,
        skipped,
        errors: errors.length,
        errorDetails
      });

      if (errors.length > 0) {
        toast({
          title: "⚠️ Import partiel",
          description: `✅ ${imported} importées, ⚠️ ${skipped} doublons, ❌ ${errors.length} erreurs`,
          variant: "destructive",
          action: (
            <Button variant="outline" size="sm" onClick={() => {
              console.log("📋 ERREURS DÉTAILLÉES:", errors);
              alert(`Erreurs d'import:\n\n${errorDetails.join('\n\n')}`);
            }}>
              Voir erreurs
            </Button>
          )
        });
      } else if (skipped > 0) {
        toast({
          title: "✅ Import terminé",
          description: `${imported.toLocaleString()} nouveaux idiomes, ${skipped} doublons ignorés`,
        });
      } else {
        toast({
          title: "✅ Import réussi",
          description: `${imported.toLocaleString()} idiomes importés`,
        });
      }

    } catch (error: any) {
      console.error('❌ Import error:', error);
      toast({
        title: "❌ Erreur d'import",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import d'Idiomes</CardTitle>
        <CardDescription>
          Import dédié aux expressions idiomatiques français-bariba
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="border-2 border-dashed rounded-lg p-8 text-center">
          <input
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
            id="idioms-import"
            disabled={loading || !user}
          />
          <label htmlFor="idioms-import" className="cursor-pointer flex flex-col items-center gap-2">
            <Database className="h-8 w-8 text-muted-foreground" />
            <div className="text-sm text-muted-foreground">
              {file ? file.name : 'Sélectionner un fichier JSON'}
            </div>
          </label>
        </div>

        {preview && (
          <div className="space-y-2 p-4 border rounded-lg bg-muted/50">
            <div className="flex items-center gap-2">
              <Badge variant="default">IDIOMES</Badge>
            </div>
            <div className="text-sm space-y-1">
              <div><strong>Idiomes:</strong> {preview.count.toLocaleString()}</div>
              <div><strong>Champs:</strong> {preview.detectedFields.join(', ')}</div>
            </div>
          </div>
        )}

        {loading && (
          <div className="space-y-2">
            <Progress value={progress} />
            <p className="text-sm text-center text-muted-foreground">
              Import en cours: {Math.round(progress)}%
            </p>
          </div>
        )}

        <Button 
          onClick={handleImport} 
          disabled={!preview || loading || !user}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Import en cours...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Importer {preview?.count.toLocaleString() || 0} idiomes
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}