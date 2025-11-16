import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Download, FileJson, FileText, FileSpreadsheet, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function DictionaryExporter() {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [stats, setStats] = useState<any>(null);

  // Charger les statistiques
  const loadStats = async () => {
    const { data, error } = await supabase
      .from('dictionary_entries')
      .select('*', { count: 'exact', head: true });

    if (!error && data !== null) {
      setStats({ total: data });
    }
  };

  // Exporter en JSON
  const exportJSON = async () => {
    setIsExporting(true);
    try {
      const { data, error } = await supabase
        .from('dictionary_entries')
        .select('*')
        .order('word');

      if (error) throw error;

      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `dictionnaire-baatonu-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);

      toast({
        title: 'Export JSON réussi',
        description: `${data.length} entrées exportées`
      });
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Exporter en CSV
  const exportCSV = async () => {
    setIsExporting(true);
    try {
      const { data, error } = await supabase
        .from('dictionary_entries')
        .select('*')
        .order('word');

      if (error) throw error;

      // Définir les colonnes pour le CSV
      const columns = [
        'word', 'definition', 'part_of_speech', 'phonetic',
        'nominal_class', 'plural_form', 'plural_class',
        'verb_root', 'verb_radical', 'verb_type', 'verbal_group',
        'tone_pattern', 'accomplished_form', 'negative_form', 'benefactive_form',
        'adjective_forms', 'french_keywords', 'example_bariba', 'example_francais',
        'variants', 'cross_reference', 'grammatical_notes', 'usage_context',
        'is_main_entry', 'is_verified', 'quality_score'
      ];

      // Créer le header CSV
      let csv = columns.join(',') + '\n';

      // Ajouter les lignes
      data.forEach((entry: any) => {
        const row = columns.map(col => {
          let value = entry[col];
          
          // Gérer les tableaux et objets
          if (Array.isArray(value)) {
            value = value.join('; ');
          } else if (typeof value === 'object' && value !== null) {
            value = JSON.stringify(value);
          } else if (value === null || value === undefined) {
            value = '';
          }
          
          // Échapper les guillemets et entourer de guillemets si nécessaire
          value = String(value).replace(/"/g, '""');
          if (value.includes(',') || value.includes('\n') || value.includes('"')) {
            value = `"${value}"`;
          }
          
          return value;
        });
        csv += row.join(',') + '\n';
      });

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `dictionnaire-baatonu-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);

      toast({
        title: 'Export CSV réussi',
        description: `${data.length} entrées exportées`
      });
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Exporter en Excel (format TSV pour compatibilité)
  const exportExcel = async () => {
    setIsExporting(true);
    try {
      const { data, error } = await supabase
        .from('dictionary_entries')
        .select('*')
        .order('word');

      if (error) throw error;

      // Définir les colonnes
      const columns = [
        'Mot', 'Définition', 'Catégorie', 'Phonétique',
        'Classe Nominale', 'Forme Plurielle', 'Classe Plurielle',
        'Racine Verbale', 'Radical Verbal', 'Type de Verbe', 'Groupe Verbal',
        'Pattern Tonal', 'Forme Accomplie', 'Forme Négative', 'Forme Bénéfactive',
        'Formes Adjectivales', 'Mots-clés Français', 'Exemples Baatɔnum', 'Exemples Français',
        'Variantes', 'Référence Croisée', 'Notes Grammaticales', 'Contexte d\'Usage',
        'Entrée Principale', 'Vérifié', 'Score Qualité'
      ];

      const fields = [
        'word', 'definition', 'part_of_speech', 'phonetic',
        'nominal_class', 'plural_form', 'plural_class',
        'verb_root', 'verb_radical', 'verb_type', 'verbal_group',
        'tone_pattern', 'accomplished_form', 'negative_form', 'benefactive_form',
        'adjective_forms', 'french_keywords', 'example_bariba', 'example_francais',
        'variants', 'cross_reference', 'grammatical_notes', 'usage_context',
        'is_main_entry', 'is_verified', 'quality_score'
      ];

      // Créer le TSV (Tab Separated Values pour Excel)
      let tsv = columns.join('\t') + '\n';

      data.forEach((entry: any) => {
        const row = fields.map(field => {
          let value = entry[field];
          
          if (Array.isArray(value)) {
            value = value.join('; ');
          } else if (typeof value === 'object' && value !== null) {
            value = JSON.stringify(value);
          } else if (value === null || value === undefined) {
            value = '';
          }
          
          return String(value).replace(/\t/g, ' ');
        });
        tsv += row.join('\t') + '\n';
      });

      const blob = new Blob([tsv], { type: 'text/tab-separated-values;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `dictionnaire-baatonu-${new Date().toISOString().split('T')[0]}.xls`;
      link.click();
      URL.revokeObjectURL(url);

      toast({
        title: 'Export Excel réussi',
        description: `${data.length} entrées exportées`
      });
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export du Dictionnaire
          </CardTitle>
          <CardDescription>
            Exportez le dictionnaire complet avec toutes les informations grammaticales
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div>
                <p className="text-sm font-medium">Statistiques du dictionnaire</p>
                <Button
                  variant="link"
                  size="sm"
                  onClick={loadStats}
                  className="h-auto p-0 text-xs"
                >
                  Actualiser
                </Button>
              </div>
              {stats && (
                <Badge variant="secondary" className="text-lg">
                  {stats.total} entrées
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Export JSON */}
              <Card className="border-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileJson className="h-4 w-4" />
                    JSON
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Format structuré pour réimport et analyse
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={exportJSON}
                    disabled={isExporting}
                    className="w-full"
                    variant="outline"
                  >
                    {isExporting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Export...
                      </>
                    ) : (
                      <>
                        <Download className="mr-2 h-4 w-4" />
                        Exporter JSON
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Export CSV */}
              <Card className="border-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileText className="h-4 w-4" />
                    CSV
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Compatible avec Excel, Google Sheets
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={exportCSV}
                    disabled={isExporting}
                    className="w-full"
                    variant="outline"
                  >
                    {isExporting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Export...
                      </>
                    ) : (
                      <>
                        <Download className="mr-2 h-4 w-4" />
                        Exporter CSV
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Export Excel */}
              <Card className="border-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileSpreadsheet className="h-4 w-4" />
                    Excel
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Format Microsoft Excel (.xls)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={exportExcel}
                    disabled={isExporting}
                    className="w-full"
                    variant="outline"
                  >
                    {isExporting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Export...
                      </>
                    ) : (
                      <>
                        <Download className="mr-2 h-4 w-4" />
                        Exporter Excel
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>

            <div className="mt-6 p-4 bg-muted/50 rounded-lg">
              <h4 className="text-sm font-semibold mb-2">Informations incluses dans l'export :</h4>
              <ul className="text-xs space-y-1 text-muted-foreground">
                <li>• Mot et définition complète</li>
                <li>• Catégorie grammaticale et phonétique</li>
                <li>• Classes nominales (singulier et pluriel)</li>
                <li>• Informations verbales (racine, groupe, conjugaisons)</li>
                <li>• Patterns tonaux et formes dérivées</li>
                <li>• Exemples en Baatɔnum et en français</li>
                <li>• Notes grammaticales et contexte d'usage</li>
                <li>• Références croisées et variantes</li>
                <li>• Scores de qualité et statut de vérification</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
