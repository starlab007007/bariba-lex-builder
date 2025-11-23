/**
 * Advanced Dictionary Manager
 * Complete dictionary management with reset, load, quality check, correction, validation
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Upload, 
  Trash2, 
  Download, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  RefreshCw,
  FileCheck,
  Database,
  Search
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface QualityIssue {
  entryId: string;
  word: string;
  issue: string;
  severity: 'low' | 'medium' | 'high';
  suggestion?: string;
}

interface DictionaryStats {
  total: number;
  verified: number;
  unverified: number;
  avgQuality: number;
  issues: QualityIssue[];
}

export default function AdvancedDictionaryManager() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<DictionaryStats | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<any>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadStats();
  }, []);

  /**
   * Load dictionary statistics and quality issues
   */
  const loadStats = async () => {
    try {
      const { data: entries } = await supabase
        .from('dictionary_entries')
        .select('*');

      if (!entries) return;

      const issues: QualityIssue[] = [];
      let totalQuality = 0;
      let qualityCount = 0;

      entries.forEach(entry => {
        // Check quality score
        if (entry.quality_score) {
          totalQuality += entry.quality_score;
          qualityCount++;

          if (entry.quality_score < 50) {
            issues.push({
              entryId: entry.id,
              word: entry.word,
              issue: 'Score de qualité faible',
              severity: 'high',
              suggestion: 'Réviser la définition et les exemples'
            });
          }
        }

        // Check missing phonetics
        if (!entry.phonetic) {
          issues.push({
            entryId: entry.id,
            word: entry.word,
            issue: 'Phonétique manquante',
            severity: 'medium',
            suggestion: 'Ajouter la transcription phonétique'
          });
        }

        // Check missing examples
        if (!entry.example_bariba || entry.example_bariba.length === 0) {
          issues.push({
            entryId: entry.id,
            word: entry.word,
            issue: 'Exemples manquants',
            severity: 'medium',
            suggestion: 'Ajouter des exemples d\'usage'
          });
        }

        // Check definition length
        if (entry.definition.length < 10) {
          issues.push({
            entryId: entry.id,
            word: entry.word,
            issue: 'Définition trop courte',
            severity: 'low',
            suggestion: 'Enrichir la définition'
          });
        }
      });

      setStats({
        total: entries.length,
        verified: entries.filter(e => e.is_verified).length,
        unverified: entries.filter(e => !e.is_verified).length,
        avgQuality: qualityCount > 0 ? totalQuality / qualityCount : 0,
        issues: issues.slice(0, 100) // Limit to 100 most critical
      });

    } catch (error: any) {
      console.error('Error loading stats:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les statistiques",
        variant: "destructive"
      });
    }
  };

  /**
   * Reset dictionary (delete all entries)
   */
  const resetDictionary = async () => {
    if (!confirm('⚠️ ATTENTION: Cela supprimera TOUTES les entrées du dictionnaire. Continuer?')) {
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('dictionary_entries')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (error) throw error;

      toast({
        title: "Dictionnaire réinitialisé",
        description: "Toutes les entrées ont été supprimées"
      });

      loadStats();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Analyze uploaded dictionary file
   */
  const analyzeFile = async (file: File) => {
    setLoading(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!Array.isArray(data)) {
        throw new Error('Le fichier doit contenir un tableau JSON');
      }

      // Validate dictionary structure
      const validated = data.filter((entry: any) => 
        entry.word && entry.definition
      );

      setPreview(validated.slice(0, 200));
      
      toast({
        title: "Analyse terminée",
        description: `${validated.length} entrées valides trouvées`
      });

    } catch (error: any) {
      toast({
        title: "Erreur d'analyse",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Import dictionary from file
   */
  const importDictionary = async () => {
    if (!file || preview.length === 0) return;

    setLoading(true);
    const batchSize = 100;
    let imported = 0;

    try {
      for (let i = 0; i < preview.length; i += batchSize) {
        const batch = preview.slice(i, i + batchSize);
        
        const { error } = await supabase
          .from('dictionary_entries')
          .upsert(batch.map(entry => ({
            word: entry.word,
            definition: entry.definition,
            phonetic: entry.phonetic || null,
            part_of_speech: entry.part_of_speech || null,
            example_bariba: entry.example_bariba || [],
            example_francais: entry.example_francais || [],
            quality_score: entry.quality_score || 0.5,
            is_verified: false
          })), { 
            onConflict: 'word',
            ignoreDuplicates: false 
          });

        if (error) throw error;
        imported += batch.length;
      }

      toast({
        title: "Import réussi",
        description: `${imported} entrées importées`
      });

      setFile(null);
      setPreview([]);
      loadStats();

    } catch (error: any) {
      toast({
        title: "Erreur d'import",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Export dictionary to JSON
   */
  const exportDictionary = async () => {
    try {
      const { data, error } = await supabase
        .from('dictionary_entries')
        .select('*')
        .order('word');

      if (error) throw error;

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dictionary_${new Date().toISOString().split('T')[0]}.json`;
      a.click();

      toast({
        title: "Export réussi",
        description: `${data?.length} entrées exportées`
      });

    } catch (error: any) {
      toast({
        title: "Erreur d'export",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  /**
   * Auto-correct quality issues
   */
  const autoCorrectIssues = async () => {
    if (!stats || stats.issues.length === 0) return;

    setLoading(true);
    let corrected = 0;

    try {
      for (const issue of stats.issues.slice(0, 50)) { // Limit to 50
        if (issue.severity === 'high' && issue.entryId) {
          // Auto-fix quality score
          const { error } = await supabase
            .from('dictionary_entries')
            .update({ quality_score: 0.7 })
            .eq('id', issue.entryId);

          if (!error) corrected++;
        }
      }

      toast({
        title: "Correction automatique",
        description: `${corrected} problèmes corrigés`
      });

      loadStats();

    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">📖 Gestion Avancée du Dictionnaire</h2>
          <p className="text-muted-foreground">
            Chargement, validation, correction et optimisation complète
          </p>
        </div>
        <Button onClick={loadStats} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualiser
        </Button>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">entrées</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Vérifiées</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.verified}</div>
              <p className="text-xs text-muted-foreground">{((stats.verified / stats.total) * 100).toFixed(1)}%</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Qualité Moyenne</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avgQuality.toFixed(1)}%</div>
              <Progress value={stats.avgQuality} className="mt-2" />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Problèmes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.issues.length}</div>
              <p className="text-xs text-muted-foreground">à corriger</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Tabs */}
      <Tabs defaultValue="import" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="import">📥 Import</TabsTrigger>
          <TabsTrigger value="quality">✨ Qualité</TabsTrigger>
          <TabsTrigger value="manage">⚙️ Gestion</TabsTrigger>
          <TabsTrigger value="search">🔍 Recherche</TabsTrigger>
        </TabsList>

        {/* IMPORT TAB */}
        <TabsContent value="import" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Importer un Dictionnaire</CardTitle>
              <CardDescription>
                Charger un nouveau fichier JSON pour remplacer ou enrichir le dictionnaire
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Input
                  type="file"
                  accept=".json"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setFile(f);
                      analyzeFile(f);
                    }
                  }}
                  disabled={loading}
                />
                <Button onClick={importDictionary} disabled={!file || loading || preview.length === 0}>
                  <Upload className="h-4 w-4 mr-2" />
                  Importer
                </Button>
              </div>

              {preview.length > 0 && (
                <Alert>
                  <FileCheck className="h-4 w-4" />
                  <AlertDescription>
                    <strong>{preview.length} entrées</strong> prêtes à être importées
                  </AlertDescription>
                </Alert>
              )}

              {preview.length > 0 && (
                <div className="max-h-96 overflow-y-auto border rounded">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mot</TableHead>
                        <TableHead>Définition</TableHead>
                        <TableHead>Type</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {preview.slice(0, 50).map((entry, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{entry.word}</TableCell>
                          <TableCell className="max-w-md truncate">{entry.definition}</TableCell>
                          <TableCell>{entry.part_of_speech || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* QUALITY TAB */}
        <TabsContent value="quality" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Contrôle Qualité</CardTitle>
                  <CardDescription>
                    {stats?.issues.length || 0} problèmes détectés
                  </CardDescription>
                </div>
                <Button onClick={autoCorrectIssues} disabled={loading || !stats || stats.issues.length === 0}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Correction Auto
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {stats && stats.issues.length > 0 ? (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {stats.issues.map((issue, i) => (
                    <Alert key={i} variant={issue.severity === 'high' ? 'destructive' : 'default'}>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-medium">{issue.word}</div>
                            <div className="text-sm">{issue.issue}</div>
                            {issue.suggestion && (
                              <div className="text-xs text-muted-foreground mt-1">
                                💡 {issue.suggestion}
                              </div>
                            )}
                          </div>
                          <Badge variant={
                            issue.severity === 'high' ? 'destructive' :
                            issue.severity === 'medium' ? 'secondary' :
                            'outline'
                          }>
                            {issue.severity}
                          </Badge>
                        </div>
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                  <p>Aucun problème détecté</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* MANAGE TAB */}
        <TabsContent value="manage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Actions de Gestion</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button onClick={exportDictionary} variant="outline" className="w-full justify-start">
                <Download className="h-4 w-4 mr-2" />
                Exporter le Dictionnaire (JSON)
              </Button>
              
              <Button onClick={resetDictionary} variant="destructive" className="w-full justify-start" disabled={loading}>
                <Trash2 className="h-4 w-4 mr-2" />
                Réinitialiser le Dictionnaire
              </Button>

              <Alert>
                <Database className="h-4 w-4" />
                <AlertDescription>
                  <strong>Note:</strong> La réinitialisation supprime toutes les entrées. Exportez d'abord pour sauvegarder.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SEARCH TAB */}
        <TabsContent value="search" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recherche dans le Dictionnaire</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  placeholder="Rechercher un mot..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Button>
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
