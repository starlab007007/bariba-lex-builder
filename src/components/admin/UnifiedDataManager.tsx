import { useState } from 'react';
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

  // Analyser le fichier
  const analyzeFile = async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!Array.isArray(data)) {
        throw new Error('Le fichier doit contenir un tableau JSON');
      }

      // Détection automatique du type
      let type: 'phrases' | 'dictionary' | 'idioms' = 'phrases';
      let validCount = 0;
      let totalQuality = 0;

      const sample = data.slice(0, 100);

      if (data[0]?.french_text && data[0]?.bariba_text) {
        type = 'phrases';
        validCount = data.filter((item: any) => item.french_text && item.bariba_text).length;
        data.forEach((item: any) => {
          if (item.quality_score) totalQuality += item.quality_score;
        });
      } else if (data[0]?.word && data[0]?.definition) {
        type = 'dictionary';
        validCount = data.filter((item: any) => item.word && item.definition).length;
      } else if (data[0]?.french_expression && data[0]?.bariba_expression) {
        type = 'idioms';
        validCount = data.filter((item: any) => item.french_expression && item.bariba_expression).length;
      }

      setPreview({
        type,
        count: validCount,
        sample,
        quality: validCount > 0 ? (totalQuality / validCount) * 100 : 0
      });

      toast({
        title: 'Analyse terminée',
        description: `${validCount} éléments valides détectés (${type})`,
      });
    } catch (error: any) {
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

  // Import unifié
  const handleImport = async () => {
    if (!file || !preview) return;

    setLoading(true);
    setProgress(0);

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const batchSize = 500;
      let imported = 0;
      const sourceName = `${targetModel}_premium`;

      // Déduplication et nettoyage
      const cleanedData = new Map();

      for (const item of data) {
        let key = '';
        let cleanItem: any = {};

        if (preview.type === 'phrases') {
          if (!item.french_text || !item.bariba_text) continue;
          key = `${item.french_text.trim()}_${item.bariba_text.trim()}`;
          cleanItem = {
            french_text: item.french_text.trim(),
            bariba_text: item.bariba_text.trim(),
            source: sourceName,
            is_validated: true,
            quality_score: item.quality_score || 0.8,
            created_by: user?.id
          };
        } else if (preview.type === 'dictionary') {
          if (!item.word || !item.definition) continue;
          key = item.word.trim();
          cleanItem = {
            word: item.word.trim(),
            definition: item.definition.trim(),
            part_of_speech: item.part_of_speech || null,
            phonetic: item.phonetic || null,
            is_verified: true,
            quality_score: 0.9,
            created_by: user?.id
          };
        } else if (preview.type === 'idioms') {
          if (!item.french_expression || !item.bariba_expression) continue;
          key = `${item.french_expression.trim()}_${item.bariba_expression.trim()}`;
          cleanItem = {
            french_expression: item.french_expression.trim(),
            bariba_expression: item.bariba_expression.trim(),
            category: item.category || 'general',
            is_verified: true,
            created_by: user?.id
          };
        }

        // Garder le meilleur en cas de doublon
        if (!cleanedData.has(key) || (item.quality_score > cleanedData.get(key).quality_score)) {
          cleanedData.set(key, cleanItem);
        }
      }

      const uniqueData = Array.from(cleanedData.values());
      const totalBatches = Math.ceil(uniqueData.length / batchSize);

      // Import par batch avec upsert
      for (let i = 0; i < uniqueData.length; i += batchSize) {
        const batch = uniqueData.slice(i, i + batchSize);
        const tableName = preview.type === 'phrases' 
          ? 'training_phrases' 
          : preview.type === 'dictionary' 
          ? 'dictionary_entries' 
          : 'idiomatic_expressions';

        let result;
        if (preview.type === 'dictionary') {
          result = await supabase.from(tableName).upsert(batch, { 
            onConflict: 'word',
            ignoreDuplicates: false 
          });
        } else if (preview.type === 'phrases') {
          // Pour phrases, on utilise insert car il n'y a pas de clé unique naturelle
          result = await supabase.from(tableName).insert(batch);
        } else {
          // Pour idiomes, insert aussi
          result = await supabase.from(tableName).insert(batch);
        }

        if (result.error) {
          console.error(`Erreur batch ${i}-${i + batchSize}:`, result.error);
          throw new Error(`Import échoué: ${result.error.message}`);
        }

        imported += batch.length;
        setProgress((imported / uniqueData.length) * 100);
      }

      toast({
        title: 'Import réussi',
        description: `${imported} éléments importés (${data.length - imported} doublons supprimés)`,
      });

      await loadStats();
      setFile(null);
      setPreview(null);
    } catch (error: any) {
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
    try {
      let data: any[] = [];
      
      if (type === 'phrases') {
        const query = filterSource !== 'all' 
          ? supabase.from('training_phrases').select('*').eq('source', filterSource).order('created_at', { ascending: false }).limit(500)
          : supabase.from('training_phrases').select('*').order('created_at', { ascending: false }).limit(500);
        
        const result = await query;
        if (result.error) throw result.error;
        data = result.data || [];
      } else if (type === 'dictionary') {
        const result = await supabase.from('dictionary_entries').select('*').order('created_at', { ascending: false }).limit(500);
        if (result.error) throw result.error;
        data = result.data || [];
      } else {
        const result = await supabase.from('idiomatic_expressions').select('*').order('created_at', { ascending: false }).limit(500);
        if (result.error) throw result.error;
        data = result.data || [];
      }

      setViewData(data);
    } catch (error: any) {
      console.error('Error loading data:', error);
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
              <div className="space-y-2">
                <Label htmlFor="targetModel">Modèle cible</Label>
                <Select value={targetModel} onValueChange={(val: string) => setTargetModel(val as 'smt' | 'dictionary' | 'idioms')}>
                  <SelectTrigger id="targetModel">
                    <SelectValue placeholder="Sélectionner un modèle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="smt">SMT (Statistical Machine Translation)</SelectItem>
                    <SelectItem value="dictionary">Dictionnaire</SelectItem>
                    <SelectItem value="idioms">Idiomes</SelectItem>
                  </SelectContent>
                </Select>
              </div>

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
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Détecté:</strong> {preview.count} {preview.type} valides
                    {preview.quality > 0 && ` (Qualité: ${preview.quality.toFixed(1)}%)`}
                  </AlertDescription>
                </Alert>
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
                <CardTitle>Aperçu (100 premiers éléments)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-auto">
                  {preview.sample.slice(0, 20).map((item, idx) => (
                    <div key={idx} className="p-2 border rounded text-sm">
                      <pre className="text-xs overflow-auto">{JSON.stringify(item, null, 2)}</pre>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* View Tabs */}
        <TabsContent value="phrases" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Données d'entraînement SMT ({viewData.length})</CardTitle>
              <div className="flex gap-2 items-center mt-2">
                <Label>Source:</Label>
                <Select value={filterSource} onValueChange={(val) => setFilterSource(val)}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Toutes les sources" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les sources</SelectItem>
                    {stats && Object.entries(stats.phrasesBySource).map(([source]) => (
                      <SelectItem key={source} value={source}>{source}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" variant="outline" onClick={() => loadViewData('phrases')}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
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
              <CardTitle>Dictionnaire ({viewData.length} entrées)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Visualisation disponible prochainement</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="idioms">
          <Card>
            <CardHeader>
              <CardTitle>Idiomes ({viewData.length} expressions)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Visualisation disponible prochainement</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
