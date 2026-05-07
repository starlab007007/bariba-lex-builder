import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Download, 
  RefreshCw,
  FileJson,
  Database,
  Eye,
  TrendingUp
} from "lucide-react";

interface QualityScore {
  overall: number;
  completeness: number;
  consistency: number;
  uniqueness: number;
  details: string[];
}

interface DataEntry {
  id: string;
  type: 'phrase' | 'dictionary';
  content: any;
  quality_score: number;
  created_at: string;
  source: string;
}

interface ValidationResult {
  totalEntries: number;
  validEntries: number;
  invalidEntries: number;
  averageQuality: number;
  issues: Array<{
    type: string;
    severity: 'error' | 'warning' | 'info';
    message: string;
    count: number;
  }>;
}

export function DataQualityValidator() {
  const { toast } = useToast();
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [recentEntries, setRecentEntries] = useState<DataEntry[]>([]);
  const [selectedType, setSelectedType] = useState<'all' | 'phrase' | 'dictionary'>('all');
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  useEffect(() => {
    loadRecentEntries();
  }, [selectedType]);

  const loadRecentEntries = async () => {
    try {
      let phrasesData: DataEntry[] = [];
      let dictData: DataEntry[] = [];

      if (selectedType === 'all' || selectedType === 'phrase') {
        const { data: phrases } = await supabase
          .from('training_phrases')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(25);
        
        phrasesData = (phrases || []).map(p => ({
          id: p.id,
          type: 'phrase' as const,
          content: { french: p.french_text, bariba: p.bariba_text },
          quality_score: p.quality_score || 0,
          created_at: p.created_at || '',
          source: p.source || 'unknown'
        }));
      }

      if (selectedType === 'all' || selectedType === 'dictionary') {
        const { data: dict } = await supabase
          .from('dictionary_entries')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(25);
        
        dictData = (dict || []).map(d => ({
          id: d.id,
          type: 'dictionary' as const,
          content: { word: d.word, definition: d.definition },
          quality_score: d.quality_score || 0,
          created_at: d.created_at || '',
          source: 'dictionary'
        }));
      }

      const combined = [...phrasesData, ...dictData]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 50);

      setRecentEntries(combined);
    } catch (error) {
      console.error('Error loading entries:', error);
    }
  };

  const validatePhrase = (french: string, bariba: string): QualityScore => {
    const details: string[] = [];
    let completeness = 0;
    let consistency = 0;
    let uniqueness = 100;

    // Completeness checks
    if (french && french.trim().length > 0) completeness += 33;
    if (bariba && bariba.trim().length > 0) completeness += 33;
    if (french && french.trim().length > 5 && bariba && bariba.trim().length > 5) {
      completeness += 34;
    } else {
      details.push('Texte trop court');
    }

    // Consistency checks
    if (french && bariba) {
      const frenchWords = french.split(/\s+/).length;
      const baribaWords = bariba.split(/\s+/).length;
      const ratio = Math.min(frenchWords, baribaWords) / Math.max(frenchWords, baribaWords);
      
      if (ratio > 0.3) {
        consistency = 100;
      } else {
        consistency = ratio * 100 * 3;
        details.push('Déséquilibre entre FR et BBA');
      }
    }

    // Check for special characters
    if (french && /[<>{}[\]\\]/.test(french)) {
      uniqueness -= 20;
      details.push('Caractères spéciaux suspects en FR');
    }
    if (bariba && /[<>{}[\]\\]/.test(bariba)) {
      uniqueness -= 20;
      details.push('Caractères spéciaux suspects en BBA');
    }

    const overall = (completeness + consistency + uniqueness) / 3;

    return { overall, completeness, consistency, uniqueness, details };
  };

  const validateDictionary = (word: string, definition: string): QualityScore => {
    const details: string[] = [];
    let completeness = 0;
    let consistency = 0;
    let uniqueness = 100;

    // Completeness checks
    if (word && word.trim().length > 0) completeness += 50;
    if (definition && definition.trim().length > 0) completeness += 50;

    if (!word || word.trim().length === 0) {
      details.push('Mot manquant');
    }
    if (!definition || definition.trim().length === 0) {
      details.push('Définition manquante');
    }
    if (definition && definition.length < 5) {
      details.push('Définition trop courte');
    }

    // Consistency checks
    consistency = 100;
    if (word && /\s{2,}/.test(word)) {
      consistency -= 30;
      details.push('Espaces multiples dans le mot');
    }
    if (definition && /[<>{}[\]\\]/.test(definition)) {
      uniqueness -= 20;
      details.push('Caractères spéciaux suspects');
    }

    const overall = (completeness + consistency + uniqueness) / 3;

    return { overall, completeness, consistency, uniqueness, details };
  };

  const runValidation = async () => {
    setIsValidating(true);
    toast({ title: "🔍 Validation en cours..." });

    try {
      const issues: ValidationResult['issues'] = [];
      let totalEntries = 0;
      let validEntries = 0;
      let invalidEntries = 0;
      let totalQuality = 0;

      // Validate phrases
      const { data: phrases } = await supabase
        .from('training_phrases')
        .select('french_text, bariba_text');

      if (phrases) {
        totalEntries += phrases.length;
        phrases.forEach(phrase => {
          const score = validatePhrase(phrase.french_text, phrase.bariba_text);
          totalQuality += score.overall;
          
          if (score.overall >= 70) {
            validEntries++;
          } else {
            invalidEntries++;
          }

          if (score.details.length > 0) {
            score.details.forEach(detail => {
              const existing = issues.find(i => i.message === detail);
              if (existing) {
                existing.count++;
              } else {
                issues.push({
                  type: 'phrase',
                  severity: score.overall < 50 ? 'error' : score.overall < 70 ? 'warning' : 'info',
                  message: detail,
                  count: 1
                });
              }
            });
          }
        });
      }

      // Validate dictionary
      const { data: dict } = await supabase
        .from('dictionary_entries')
        .select('word, definition');

      if (dict) {
        totalEntries += dict.length;
        dict.forEach(entry => {
          const score = validateDictionary(entry.word, entry.definition);
          totalQuality += score.overall;
          
          if (score.overall >= 70) {
            validEntries++;
          } else {
            invalidEntries++;
          }

          if (score.details.length > 0) {
            score.details.forEach(detail => {
              const existing = issues.find(i => i.message === detail);
              if (existing) {
                existing.count++;
              } else {
                issues.push({
                  type: 'dictionary',
                  severity: score.overall < 50 ? 'error' : score.overall < 70 ? 'warning' : 'info',
                  message: detail,
                  count: 1
                });
              }
            });
          }
        });
      }

      const result: ValidationResult = {
        totalEntries,
        validEntries,
        invalidEntries,
        averageQuality: totalEntries > 0 ? totalQuality / totalEntries : 0,
        issues: issues.sort((a, b) => b.count - a.count)
      };

      setValidationResult(result);

      toast({ 
        title: "✅ Validation terminée", 
        description: `${validEntries}/${totalEntries} entrées valides (${result.averageQuality.toFixed(1)}% qualité moyenne)` 
      });
    } catch (error: any) {
      toast({ 
        title: "❌ Erreur validation", 
        description: error.message,
        variant: "destructive" 
      });
    } finally {
      setIsValidating(false);
    }
  };

  const exportData = async (dataType: 'all' | 'phrases' | 'dictionary') => {
    setIsExporting(true);
    setExportProgress(0);
    toast({ title: "📦 Export en cours..." });

    try {
      const exportData: any = {
        timestamp: new Date().toISOString(),
        version: '1.0',
        data: {}
      };

      if (dataType === 'all' || dataType === 'phrases') {
        setExportProgress(10);
        const { data: phrases } = await supabase
          .from('training_phrases')
          .select('*');
        exportData.data.training_phrases = phrases || [];
        setExportProgress(40);
      }

      if (dataType === 'all' || dataType === 'dictionary') {
        setExportProgress(50);
        const { data: dict } = await supabase
          .from('dictionary_entries')
          .select('*');
        exportData.data.dictionary_entries = dict || [];
        setExportProgress(80);
      }

      const { data: idioms } = await supabase
        .from('idiomatic_expressions')
        .select('*');
      exportData.data.idiomatic_expressions = idioms || [];

      setExportProgress(90);

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `export_${dataType}_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      setExportProgress(100);

      toast({ 
        title: "✅ Export réussi", 
        description: `Données exportées vers ${a.download}` 
      });
    } catch (error: any) {
      toast({ 
        title: "❌ Erreur export", 
        description: error.message,
        variant: "destructive" 
      });
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  const getQualityColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    return "text-red-500";
  };

  const getQualityBadge = (score: number) => {
    if (score >= 80) return <Badge className="bg-green-500/10 text-green-500">Excellent</Badge>;
    if (score >= 60) return <Badge className="bg-yellow-500/10 text-yellow-500">Bon</Badge>;
    return <Badge variant="destructive">Faible</Badge>;
  };

  const getSeverityIcon = (severity: 'error' | 'warning' | 'info') => {
    switch (severity) {
      case 'error': return <XCircle className="h-4 w-4 text-destructive" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'info': return <CheckCircle2 className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Validation Automatique de la Qualité
          </CardTitle>
          <CardDescription>
            Analysez la qualité des données importées et détectez les problèmes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={runValidation}
            disabled={isValidating}
            className="w-full"
          >
            {isValidating ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Validation en cours...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Lancer la validation
              </>
            )}
          </Button>

          {validationResult && (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-4">
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Total</div>
                  <div className="text-2xl font-bold">{validationResult.totalEntries.toLocaleString()}</div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Valides</div>
                  <div className="text-2xl font-bold text-green-500">{validationResult.validEntries.toLocaleString()}</div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Problèmes</div>
                  <div className="text-2xl font-bold text-red-500">{validationResult.invalidEntries.toLocaleString()}</div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Qualité Moyenne</div>
                  <div className={`text-2xl font-bold ${getQualityColor(validationResult.averageQuality)}`}>
                    {validationResult.averageQuality.toFixed(1)}%
                  </div>
                </div>
              </div>

              {validationResult.issues.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3">Problèmes détectés</h4>
                  <div className="space-y-2">
                    {validationResult.issues.slice(0, 10).map((issue, idx) => (
                      <Alert key={idx}>
                        <div className="flex items-center gap-3">
                          {getSeverityIcon(issue.severity)}
                          <div className="flex-1">
                            <AlertDescription>
                              <span className="font-medium">{issue.message}</span>
                              <span className="text-muted-foreground ml-2">({issue.count} occurrences)</span>
                            </AlertDescription>
                          </div>
                        </div>
                      </Alert>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="recent" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="recent">
            <Eye className="mr-2 h-4 w-4" />
            Visualisation
          </TabsTrigger>
          <TabsTrigger value="export">
            <Download className="mr-2 h-4 w-4" />
            Export
          </TabsTrigger>
        </TabsList>

        <TabsContent value="recent" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Dernières Entrées Importées</CardTitle>
                  <CardDescription>50 entrées les plus récentes avec scores de qualité</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={selectedType} onValueChange={(v: any) => setSelectedType(v)}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes</SelectItem>
                      <SelectItem value="phrase">Phrases</SelectItem>
                      <SelectItem value="dictionary">Dictionnaire</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={loadRecentEntries} variant="outline" size="sm">
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Contenu</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Qualité</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentEntries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>
                          <Badge variant={entry.type === 'phrase' ? 'default' : 'outline'}>
                            {entry.type === 'phrase' ? 'Phrase' : 'Dico'}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-md">
                          {entry.type === 'phrase' ? (
                            <div className="space-y-1">
                              <div className="text-sm"><strong>FR:</strong> {entry.content.french?.substring(0, 50)}...</div>
                              <div className="text-sm text-muted-foreground"><strong>BBA:</strong> {entry.content.bariba?.substring(0, 50)}...</div>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <div className="text-sm font-medium">{entry.content.word}</div>
                              <div className="text-sm text-muted-foreground">{entry.content.definition?.substring(0, 50)}...</div>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{entry.source}</Badge>
                        </TableCell>
                        <TableCell>
                          {getQualityBadge(entry.quality_score * 100)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(entry.created_at).toLocaleDateString('fr-FR')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="export" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileJson className="h-5 w-5" />
                Export des Données
              </CardTitle>
              <CardDescription>
                Exportez vos données vers JSON pour sauvegarde externe
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <Button
                  onClick={() => exportData('phrases')}
                  disabled={isExporting}
                  variant="outline"
                  className="h-24 flex-col"
                >
                  <Database className="h-6 w-6 mb-2" />
                  <span>Phrases d'entraînement</span>
                </Button>
                <Button
                  onClick={() => exportData('dictionary')}
                  disabled={isExporting}
                  variant="outline"
                  className="h-24 flex-col"
                >
                  <Database className="h-6 w-6 mb-2" />
                  <span>Dictionnaire</span>
                </Button>
                <Button
                  onClick={() => exportData('all')}
                  disabled={isExporting}
                  className="h-24 flex-col"
                >
                  <Download className="h-6 w-6 mb-2" />
                  <span>Toutes les données</span>
                </Button>
              </div>

              {isExporting && (
                <div className="space-y-2">
                  <Progress value={exportProgress} />
                  <p className="text-sm text-center text-muted-foreground">
                    Export en cours... {exportProgress}%
                  </p>
                </div>
              )}

              <Alert>
                <AlertDescription>
                  Les exports incluent toutes les métadonnées et peuvent être utilisés pour restauration ou analyse externe.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
