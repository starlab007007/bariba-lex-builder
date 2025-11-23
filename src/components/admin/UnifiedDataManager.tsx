import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Upload, Loader2, Database, FileText, Book, Trash2, Download, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface DataStats {
  totalPhrases: number;
  totalDictionary: number;
  totalIdioms: number;
  phrasesBySource: Record<string, number>;
  avgQuality: number;
}

interface DataPreview {
  type: 'phrases' | 'dictionary' | 'idioms';
  count: number;
  sample: any[];
  quality: number;
  detectedFields: string[];
  mappedFields?: {
    source: string;
    target: string;
  }[];
  confidence: number;
}

export default function UnifiedDataManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [targetModel, setTargetModel] = useState<'smt' | 'dictionary' | 'idioms'>('smt');
  const [stats, setStats] = useState<DataStats | null>(null);
  const [preview, setPreview] = useState<DataPreview | null>(null);
  const [viewData, setViewData] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [filterSource, setFilterSource] = useState<string>('all');
  const itemsPerPage = 50;

  // Auto-load stats on mount
  useEffect(() => {
    loadStats();
  }, []);

  // Charger les statistiques
  const loadStats = async () => {
    try {
      const [phrasesRes, dictRes, idiomsRes] = await Promise.all([
        supabase.from('training_phrases').select('source, quality_score'),
        supabase.from('dictionary_entries').select('id'),
        supabase.from('idiomatic_expressions').select('id')
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
        totalPhrases: phrasesRes.data?.length || 0,
        totalDictionary: dictRes.data?.length || 0,
        totalIdioms: idiomsRes.data?.length || 0,
        phrasesBySource,
        avgQuality: qualityCount > 0 ? totalQuality / qualityCount : 0
      });
    } catch (error: any) {
      console.error('Error loading stats:', error);
    }
  };

  // Reconnaissance intelligente des champs (PHRASES ET IDIOMES uniquement)
  const detectFieldMapping = (data: any[]) => {
    if (!data || data.length === 0) return { type: null, mappings: [], confidence: 0, fields: [] };

    const firstItem = data[0];
    const fields = Object.keys(firstItem);

    // Patterns pour phrases (PRIORITÉ) - Support de TOUS les formats
    const frenchPatterns = ['french', 'francais', 'français', 'fr', 'french_text', 'texte_francais', 'texte_fr'];
    const baribaPatterns = ['bariba', 'baatonum', 'bba', 'bariba_text', 'texte_bariba', 'bba_latn', 'bba_latin'];
    
    // Patterns pour idiomes
    const frenchExprPatterns = ['french_expression', 'expression_francaise', 'idiom_fr'];
    const baribaExprPatterns = ['bariba_expression', 'expression_bariba', 'idiom_bba'];

    let bestMatch = { type: null as any, confidence: 0, mappings: [] as any[], fields: [] as string[] };

    // Test phrases (PRIORITÉ)
    const frenchField = fields.find(f => frenchPatterns.some(p => f.toLowerCase().includes(p)));
    const baribaField = fields.find(f => baribaPatterns.some(p => f.toLowerCase().includes(p)));
    
    if (frenchField && baribaField) {
      const validCount = data.filter(item => item[frenchField]?.trim() && item[baribaField]?.trim()).length;
      const confidence = (validCount / data.length) * 100;
      
      bestMatch = {
        type: 'phrases',
        confidence,
        mappings: [
          { source: frenchField, target: 'french_text' },
          { source: baribaField, target: 'bariba_text' }
        ],
        fields
      };
      return bestMatch; // Retourner immédiatement si phrases détectées
    }

    // Test idiomes
    const frExprField = fields.find(f => frenchExprPatterns.some(p => f.toLowerCase().includes(p)));
    const baExprField = fields.find(f => baribaExprPatterns.some(p => f.toLowerCase().includes(p)));
    
    if (frExprField && baExprField) {
      const validCount = data.filter(item => item[frExprField]?.trim() && item[baExprField]?.trim()).length;
      const confidence = (validCount / data.length) * 100;
      
      bestMatch = {
        type: 'idioms',
        confidence,
        mappings: [
          { source: frExprField, target: 'french_expression' },
          { source: baExprField, target: 'bariba_expression' }
        ],
        fields
      };
      return bestMatch;
    }

    // DICTIONNAIRE DÉTECTÉ: Rediriger vers AdvancedDictionaryManager
    const wordPatterns = ['word', 'mot', 'terme', 'entry', 'headword', 'lemme'];
    const definitionPatterns = ['definition', 'def', 'sens', 'meaning', 'traduction'];
    const wordField = fields.find(f => wordPatterns.some(p => f.toLowerCase().includes(p)));
    const defField = fields.find(f => definitionPatterns.some(p => f.toLowerCase().includes(p)));
    
    if (wordField && defField) {
      return {
        type: 'dictionary' as any,
        confidence: 80,
        mappings: [],
        fields
      };
    }

    return bestMatch;
  };

  // Analyser le fichier avec intelligence
  const analyzeFile = async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!Array.isArray(data)) {
        throw new Error('Le fichier doit contenir un tableau JSON');
      }

      if (data.length === 0) {
        throw new Error('Le fichier est vide');
      }

      // Détection intelligente
      const detection = detectFieldMapping(data);
      
      // BLOQUER les imports de dictionnaire
      if (detection.type === 'dictionary') {
        toast({
          title: "⚠️ Import de dictionnaire détecté",
          description: "Utilisez l'onglet 'Dictionnaire' dans la section Data pour importer les entrées de dictionnaire",
          variant: "destructive"
        });
        setFile(null);
        return;
      }
      
      if (!detection.type || detection.confidence < 50) {
        throw new Error(
          `Format non reconnu. Champs détectés: ${detection.fields.join(', ')}. ` +
          `Ce gestionnaire accepte uniquement les PHRASES de traduction français-bariba et les IDIOMES. ` +
          `Pour le dictionnaire, utilisez l'onglet 'Dictionnaire'.`
        );
      }

      // Compter les éléments valides selon le mapping
      let validCount = 0;
      let totalQuality = 0;

      if (detection.type === 'phrases') {
        const frField = detection.mappings.find(m => m.target === 'french_text')?.source;
        const baField = detection.mappings.find(m => m.target === 'bariba_text')?.source;
        
        validCount = data.filter((item: any) => 
          item[frField as string]?.trim() && item[baField as string]?.trim()
        ).length;
        
        data.forEach((item: any) => {
          if (item.quality_score) totalQuality += item.quality_score;
        });
      } else if (detection.type === 'idioms') {
        const frField = detection.mappings.find(m => m.target === 'french_expression')?.source;
        const baField = detection.mappings.find(m => m.target === 'bariba_expression')?.source;
        
        validCount = data.filter((item: any) => 
          item[frField as string]?.trim() && item[baField as string]?.trim()
        ).length;
      }

      const sample = data.slice(0, 20);

      setPreview({
        type: detection.type,
        count: validCount,
        sample,
        quality: validCount > 0 ? (totalQuality / validCount) * 100 : 0,
        detectedFields: detection.fields,
        mappedFields: detection.mappings,
        confidence: detection.confidence
      });

      toast({
        title: '✅ Analyse réussie',
        description: `${validCount} ${detection.type} valides détectés (${detection.confidence.toFixed(0)}% confiance)`,
      });
    } catch (error: any) {
      console.error('Erreur analyse:', error);
      toast({
        title: 'Erreur d\'analyse',
        description: error.message,
        variant: 'destructive',
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

  // Import intelligent avec mapping
  const handleImport = async () => {
    if (!file || !preview || !preview.mappedFields) return;

    // VÉRIFICATION CRITIQUE: Utilisateur authentifié
    if (!user?.id) {
      toast({
        title: "❌ Erreur d'authentification",
        description: "Vous devez être connecté pour importer des données. Veuillez vous reconnecter.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    setProgress(0);

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const batchSize = 200;
      let imported = 0;
      let skipped = 0;
      let errors = 0;
      const sourceName = `import_${new Date().toISOString().split('T')[0]}`;

      // Déduplication et nettoyage avec mapping
      const cleanedData = new Map();

      for (const item of data) {
        let key = '';
        let cleanItem: any = {};

        try {
          if (preview.type === 'phrases') {
            const frField = preview.mappedFields.find(m => m.target === 'french_text')?.source;
            const baField = preview.mappedFields.find(m => m.target === 'bariba_text')?.source;
            
            if (!frField || !baField) continue;
            
            const frText = item[frField]?.toString().trim();
            const baText = item[baField]?.toString().trim();
            
            if (!frText || !baText) {
              skipped++;
              continue;
            }
            
            key = `${frText}_${baText}`;
            cleanItem = {
              french_text: frText,
              bariba_text: baText,
              source: sourceName,
              is_validated: true,
              quality_score: item.quality_score || 0.85,
              created_by: user.id, // user.id vérifié ci-dessus
              metadata: item.categories ? { categories: item.categories } : null
            };
          } else if (preview.type === 'idioms') {
            const frField = preview.mappedFields.find(m => m.target === 'french_expression')?.source;
            const baField = preview.mappedFields.find(m => m.target === 'bariba_expression')?.source;
            
            if (!frField || !baField) continue;
            
            const frExpr = item[frField]?.toString().trim();
            const baExpr = item[baField]?.toString().trim();
            
            if (!frExpr || !baExpr) {
              skipped++;
              continue;
            }
            
            key = `${frExpr}_${baExpr}`;
            cleanItem = {
              french_expression: frExpr,
              bariba_expression: baExpr,
              category: item.category || item.categories?.[0] || 'general',
              is_verified: true,
              created_by: user.id // user.id vérifié ci-dessus
            };
          }

          // Garder le meilleur en cas de doublon
          if (!cleanedData.has(key) || 
              (item.quality_score && item.quality_score > (cleanedData.get(key).quality_score || 0))) {
            cleanedData.set(key, cleanItem);
          }
        } catch (err) {
          console.error('Erreur traitement item:', err);
          skipped++;
        }
      }

      const uniqueData = Array.from(cleanedData.values());
      
      if (uniqueData.length === 0) {
        throw new Error('Aucune donnée valide à importer après nettoyage');
      }

      // Import par batch
      for (let i = 0; i < uniqueData.length; i += batchSize) {
        const batch = uniqueData.slice(i, i + batchSize);
        const tableName = preview.type === 'phrases' 
          ? 'training_phrases' 
          : 'idiomatic_expressions';

        let result;
        try {
          result = await supabase.from(tableName).insert(batch);

          if (result.error) {
            console.error(`❌ Erreur batch ${i}:`, result.error);
            errors += batch.length;
            // Continuer avec le prochain batch au lieu de tout arrêter
            continue;
          }

          imported += batch.length;
          const progressPercent = (imported / uniqueData.length) * 100;
          setProgress(progressPercent);
          
          console.log(`✅ Batch ${Math.floor(i / batchSize) + 1}: ${batch.length} ${preview.type} importés (${progressPercent.toFixed(1)}%)`);
        } catch (batchError: any) {
          console.error(`Erreur sur batch ${i}-${i + batchSize}:`, batchError);
          errors += batch.length;
        }
      }

      // RAPPORT DÉTAILLÉ D'IMPORT
      const report = {
        total: data.length,
        imported,
        skipped,
        duplicates: data.length - imported - skipped - errors,
        errors,
        source: sourceName,
        type: preview.type,
        timestamp: new Date().toISOString()
      };
      
      console.log("📊 RAPPORT D'IMPORT COMPLET:", report);

      if (imported > 0) {
        toast({
          title: '✅ Import réussi',
          description: `${imported.toLocaleString()} ${preview.type} importés sur ${data.length.toLocaleString()} (${skipped} ignorés, ${errors} erreurs)`,
        });
      } else {
        toast({
          title: '⚠️ Import incomplet',
          description: `Aucune donnée importée. ${errors} erreurs, ${skipped} entrées invalides.`,
          variant: "destructive"
        });
      }

      await loadStats();
      
      // Rafraîchir le système SMT après import de phrases
      if (preview.type === 'phrases' && imported > 0) {
        console.log("🔄 Rafraîchissement du système SMT avec TOUTES les phrases...");
        try {
          const { smtInitializer } = await import('@/services/SMTInitializer');
          await smtInitializer.refresh();
          
          // Vérifier le statut après rafraîchissement
          const status = smtInitializer.getStatus();
          if (status) {
            console.log(`✅ SMT rafraîchi: ${status.phrasesCount.toLocaleString()} phrases chargées`);
            toast({
              title: "🚀 SMT Mis à Jour",
              description: `Moteur SMT activé avec ${status.phrasesCount.toLocaleString()} phrases FR-BBA`,
            });
          }
        } catch (err) {
          console.warn("⚠️ Erreur rafraîchissement SMT:", err);
        }
      }
      
      // Auto-switch to visualization tab
      if (preview.type === 'phrases') {
        await loadViewData('phrases');
      } else if (preview.type === 'idioms') {
        await loadViewData('idioms');
      }
      
      setFile(null);
      setPreview(null);
    } catch (error: any) {
      console.error('❌ Erreur import:', error);
      toast({
        title: 'Erreur d\'import',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  const loadViewData = async (type: 'phrases' | 'dictionary' | 'idioms') => {
    setLoading(true);
    try {
      let data: any[] = [];
      
      if (type === 'phrases') {
        // Charger TOUTES les phrases (AUCUNE LIMITE)
        console.log(`📊 Chargement de TOUTES les phrases (filtre: ${filterSource})...`);
        
        const query = filterSource !== 'all' 
          ? supabase.from('training_phrases').select('*').eq('source', filterSource).order('created_at', { ascending: false })
          : supabase.from('training_phrases').select('*').order('created_at', { ascending: false });
        
        const result = await query;
        if (result.error) throw result.error;
        data = result.data || [];
        
        console.log(`✅ ${data.length.toLocaleString()} phrases chargées depuis la DB`);
        
        toast({
          title: '✅ Données chargées',
          description: `${data.length.toLocaleString()} phrases affichées (sans limite)`,
        });
      } else if (type === 'dictionary') {
        // Charger TOUT le dictionnaire (pas de limite)
        const result = await supabase.from('dictionary_entries').select('*').order('created_at', { ascending: false });
        if (result.error) throw result.error;
        data = result.data || [];
        
        toast({
          title: '✅ Dictionnaire chargé',
          description: `${data.length} entrées affichées`,
        });
      } else {
        // Charger TOUS les idiomes (pas de limite)
        const result = await supabase.from('idiomatic_expressions').select('*').order('created_at', { ascending: false });
        if (result.error) throw result.error;
        data = result.data || [];
        
        toast({
          title: '✅ Idiomes chargés',
          description: `${data.length} expressions affichées`,
        });
      }

      setViewData(data);
      setCurrentPage(1); // Reset to first page
    } catch (error: any) {
      console.error('Error loading data:', error);
      toast({
        title: 'Erreur de chargement',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Supprimer toutes les données
  const handleClearAll = async () => {
    if (!confirm('⚠️ ATTENTION: Cette action supprimera TOUTES les données. Continuer?')) return;

    setLoading(true);
    try {
      await Promise.all([
        supabase.from('training_phrases').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('dictionary_entries').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('idiomatic_expressions').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      ]);

      localStorage.clear();

      toast({
        title: 'Nettoyage terminé',
        description: 'Toutes les données ont été supprimées',
      });

      await loadStats();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Export des données
  const handleExport = async () => {
    try {
      const [phrasesRes, dictRes, idiomsRes] = await Promise.all([
        supabase.from('training_phrases').select('*'),
        supabase.from('dictionary_entries').select('*'),
        supabase.from('idiomatic_expressions').select('*')
      ]);

      const exportData = {
        metadata: {
          exportedAt: new Date().toISOString(),
          totalPhrases: phrasesRes.data?.length || 0,
          totalDictionary: dictRes.data?.length || 0,
          totalIdioms: idiomsRes.data?.length || 0
        },
        training_phrases: phrasesRes.data || [],
        dictionary_entries: dictRes.data || [],
        idiomatic_expressions: idiomsRes.data || []
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();

      toast({
        title: 'Export terminé',
        description: 'Backup créé avec succès',
      });
    } catch (error: any) {
      toast({
        title: 'Erreur d\'export',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">Gestion Unifiée des Données</h2>
          <p className="text-muted-foreground">Import, visualisation et gestion centralisée</p>
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
          <Button variant="destructive" onClick={handleClearAll} disabled={loading}>
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
              <p className="text-xs text-muted-foreground">Entrées vérifiées</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Idiomes</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalIdioms.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Expressions fixes</p>
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

      <Tabs defaultValue="import" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="import">Import</TabsTrigger>
          <TabsTrigger value="phrases" onClick={() => loadViewData('phrases')}>Phrases SMT</TabsTrigger>
          <TabsTrigger value="dictionary" onClick={() => loadViewData('dictionary')}>Dictionnaire</TabsTrigger>
          <TabsTrigger value="idioms" onClick={() => loadViewData('idioms')}>Idiomes</TabsTrigger>
        </TabsList>

        {/* Import Tab */}
        <TabsContent value="import" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Import Intelligent de Données</CardTitle>
              <CardDescription>
                Détection automatique du type, validation, déduplication et import
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Import Intelligent:</strong> Le système détecte automatiquement le type de données 
                  (phrases pour SMT, entrées de dictionnaire, ou idiomes) et les importe dans la bonne table.
                </AlertDescription>
              </Alert>

              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                  disabled={loading}
                />
                <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-2">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <div className="text-sm text-muted-foreground">
                    {file ? file.name : 'Sélectionner un fichier JSON'}
                  </div>
                </label>
              </div>

              {preview && (
                <div className="space-y-3">
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-1">
                        <div><strong>Type:</strong> {preview.type} ({preview.confidence.toFixed(0)}% confiance)</div>
                        <div><strong>Valides:</strong> {preview.count} éléments</div>
                        {preview.quality > 0 && <div><strong>Qualité:</strong> {preview.quality.toFixed(1)}%</div>}
                      </div>
                    </AlertDescription>
                  </Alert>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Mapping des champs détecté</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-1 text-sm">
                        {preview.mappedFields?.map((m, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <Badge variant="outline">{m.source}</Badge>
                            <span>→</span>
                            <Badge>{m.target}</Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {loading && (
                <div className="space-y-2">
                  <Progress value={progress} />
                  <p className="text-sm text-center text-muted-foreground">{progress.toFixed(0)}%</p>
                </div>
              )}

              <Button onClick={handleImport} disabled={!file || !preview || loading} className="w-full">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Importer avec déduplication
              </Button>
            </CardContent>
          </Card>

          {preview && preview.sample.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Aperçu ({preview.sample.length} éléments)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-auto">
                  {preview.sample.map((item, idx) => {
                    const mappedData: any = {};
                    preview.mappedFields?.forEach(m => {
                      if (item[m.source]) mappedData[m.target] = item[m.source];
                    });
                    
                    return (
                      <div key={idx} className="p-3 border rounded">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          {Object.entries(mappedData).map(([key, value]) => (
                            <div key={key}>
                              <span className="font-semibold text-muted-foreground">{key}:</span>
                              <div className="mt-1">{String(value)}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* View Tabs */}
        <TabsContent value="phrases" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Données d'entraînement SMT</CardTitle>
                  <CardDescription>
                    {viewData.length > 0 ? `${viewData.length.toLocaleString()} phrases chargées` : 'Aucune donnée'}
                  </CardDescription>
                </div>
                <Button size="sm" variant="outline" onClick={() => loadViewData('phrases')} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                </Button>
              </div>
              {stats && Object.keys(stats.phrasesBySource).length > 0 && (
                <div className="flex gap-2 items-center mt-4">
                  <Label>Source:</Label>
                  <Select value={filterSource} onValueChange={(val) => {
                    setFilterSource(val);
                    loadViewData('phrases');
                  }}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Toutes les sources" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes les sources</SelectItem>
                      {Object.entries(stats.phrasesBySource).map(([source, count]) => (
                        <SelectItem key={source} value={source}>
                          {source} ({count})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardHeader>
            <CardContent>
              <div className="overflow-auto max-h-[600px]">
                <div className="min-w-[800px]">
                  <div className="grid grid-cols-4 gap-4 p-2 font-medium border-b">
                    <div>Français</div>
                    <div>Bariba</div>
                    <div>Source</div>
                    <div>Qualité</div>
                  </div>
                  {viewData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((item: any) => (
                    <div key={item.id} className="grid grid-cols-4 gap-4 p-2 border-b hover:bg-muted/50">
                      <div className="truncate">{item.french_text}</div>
                      <div className="truncate">{item.bariba_text}</div>
                      <div><Badge variant="outline">{item.source}</Badge></div>
                      <div>{item.quality_score ? (item.quality_score * 100).toFixed(0) + '%' : 'N/A'}</div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dictionary">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Dictionnaire Bariba-Français</CardTitle>
                  <CardDescription>
                    {viewData.length > 0 ? `${viewData.length.toLocaleString()} entrées chargées` : 'Aucune entrée'}
                  </CardDescription>
                </div>
                <Button size="sm" variant="outline" onClick={() => loadViewData('dictionary')} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-auto max-h-[600px]">
                <div className="min-w-[800px]">
                  <div className="grid grid-cols-3 gap-4 p-2 font-medium border-b">
                    <div>Mot (Bariba)</div>
                    <div>Définition (Français)</div>
                    <div>Type</div>
                  </div>
                  {viewData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((item: any) => (
                    <div key={item.id} className="grid grid-cols-3 gap-4 p-2 border-b hover:bg-muted/50">
                      <div className="font-medium">{item.word}</div>
                      <div className="truncate">{item.definition}</div>
                      <div>
                        {item.part_of_speech && <Badge variant="outline">{item.part_of_speech}</Badge>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="idioms">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Expressions idiomatiques</CardTitle>
                  <CardDescription>
                    {viewData.length > 0 ? `${viewData.length.toLocaleString()} expressions chargées` : 'Aucune expression'}
                  </CardDescription>
                </div>
                <Button size="sm" variant="outline" onClick={() => loadViewData('idioms')} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-auto max-h-[600px]">
                <div className="min-w-[800px]">
                  <div className="grid grid-cols-3 gap-4 p-2 font-medium border-b">
                    <div>Expression française</div>
                    <div>Expression bariba</div>
                    <div>Catégorie</div>
                  </div>
                  {viewData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((item: any) => (
                    <div key={item.id} className="grid grid-cols-3 gap-4 p-2 border-b hover:bg-muted/50">
                      <div>{item.french_expression}</div>
                      <div>{item.bariba_expression}</div>
                      <div>
                        <Badge variant="outline">{item.category}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
