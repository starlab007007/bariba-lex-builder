import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, AlertCircle, XCircle, Loader2, Play } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ValidationIssue {
  id: string;
  word: string;
  severity: 'error' | 'warning' | 'info';
  category: string;
  message: string;
  field: string;
}

export default function DictionaryValidator() {
  const { toast } = useToast();
  const [isValidating, setIsValidating] = useState(false);
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [stats, setStats] = useState<any>(null);

  const validateDictionary = async () => {
    setIsValidating(true);
    const foundIssues: ValidationIssue[] = [];

    try {
      const { data: entries, error } = await supabase
        .from('dictionary_entries')
        .select('*');

      if (error) throw error;

      let errorCount = 0;
      let warningCount = 0;
      let infoCount = 0;

      entries.forEach((entry: any) => {
        // Validation 1: Verbes avec groupe mais sans racine
        if (entry.verbal_group && !entry.verb_root) {
          foundIssues.push({
            id: entry.id,
            word: entry.word,
            severity: 'error',
            category: 'Verbe',
            message: 'Groupe verbal défini mais racine verbale manquante',
            field: 'verb_root'
          });
          errorCount++;
        }

        // Validation 2: Verbes avec racine mais sans groupe
        if (entry.verb_root && !entry.verbal_group) {
          foundIssues.push({
            id: entry.id,
            word: entry.word,
            severity: 'warning',
            category: 'Verbe',
            message: 'Racine verbale définie mais groupe verbal manquant',
            field: 'verbal_group'
          });
          warningCount++;
        }

        // Validation 3: Noms avec classe mais sans pluriel
        if (entry.nominal_class && !entry.plural_form && entry.part_of_speech?.includes('n')) {
          foundIssues.push({
            id: entry.id,
            word: entry.word,
            severity: 'warning',
            category: 'Nom',
            message: 'Classe nominale définie mais forme plurielle manquante',
            field: 'plural_form'
          });
          warningCount++;
        }

        // Validation 4: Pluriel sans classe nominale
        if (entry.plural_form && !entry.nominal_class) {
          foundIssues.push({
            id: entry.id,
            word: entry.word,
            severity: 'error',
            category: 'Nom',
            message: 'Forme plurielle définie mais classe nominale manquante',
            field: 'nominal_class'
          });
          errorCount++;
        }

        // Validation 5: Classe nominale invalide
        const validClasses = ['b', 'g', 'm', 'n', 's', 't', 'w', 'y'];
        if (entry.nominal_class && !validClasses.includes(entry.nominal_class)) {
          foundIssues.push({
            id: entry.id,
            word: entry.word,
            severity: 'error',
            category: 'Nom',
            message: `Classe nominale invalide: "${entry.nominal_class}". Classes valides: ${validClasses.join(', ')}`,
            field: 'nominal_class'
          });
          errorCount++;
        }

        // Validation 6: Groupe verbal invalide
        if (entry.verbal_group && (entry.verbal_group < 1 || entry.verbal_group > 5)) {
          foundIssues.push({
            id: entry.id,
            word: entry.word,
            severity: 'error',
            category: 'Verbe',
            message: `Groupe verbal invalide: ${entry.verbal_group}. Doit être entre 1 et 5`,
            field: 'verbal_group'
          });
          errorCount++;
        }

        // Validation 7: Verbe sans type
        if ((entry.verb_root || entry.verbal_group) && !entry.verb_type) {
          foundIssues.push({
            id: entry.id,
            word: entry.word,
            severity: 'warning',
            category: 'Verbe',
            message: 'Information verbale présente mais type de verbe manquant',
            field: 'verb_type'
          });
          warningCount++;
        }

        // Validation 8: Catégorie grammaticale manquante
        if (!entry.part_of_speech) {
          foundIssues.push({
            id: entry.id,
            word: entry.word,
            severity: 'info',
            category: 'Général',
            message: 'Catégorie grammaticale non définie',
            field: 'part_of_speech'
          });
          infoCount++;
        }

        // Validation 9: Pattern tonal manquant
        if (!entry.tone_pattern) {
          foundIssues.push({
            id: entry.id,
            word: entry.word,
            severity: 'info',
            category: 'Phonétique',
            message: 'Pattern tonal non défini',
            field: 'tone_pattern'
          });
          infoCount++;
        }

        // Validation 10: Définition courte
        if (entry.definition && entry.definition.length < 10) {
          foundIssues.push({
            id: entry.id,
            word: entry.word,
            severity: 'info',
            category: 'Général',
            message: 'Définition très courte (moins de 10 caractères)',
            field: 'definition'
          });
          infoCount++;
        }

        // Validation 11: Exemples manquants pour entrées principales
        if (entry.is_main_entry && (!entry.example_bariba || entry.example_bariba.length === 0)) {
          foundIssues.push({
            id: entry.id,
            word: entry.word,
            severity: 'info',
            category: 'Général',
            message: 'Entrée principale sans exemple Baatɔnum',
            field: 'example_bariba'
          });
          infoCount++;
        }

        // Validation 12: Cohérence radical/racine
        if (entry.verb_radical && entry.verb_root && !entry.verb_radical.includes(entry.verb_root)) {
          foundIssues.push({
            id: entry.id,
            word: entry.word,
            severity: 'warning',
            category: 'Verbe',
            message: 'Le radical verbal ne contient pas la racine verbale',
            field: 'verb_radical'
          });
          warningCount++;
        }
      });

      setIssues(foundIssues);
      setStats({
        total: entries.length,
        errors: errorCount,
        warnings: warningCount,
        info: infoCount,
        valid: entries.length - foundIssues.length
      });

      toast({
        title: 'Validation terminée',
        description: `${foundIssues.length} problème(s) trouvé(s) sur ${entries.length} entrées`
      });
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsValidating(false);
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-warning" />;
      default:
        return <CheckCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'error':
        return <Badge variant="destructive">Erreur</Badge>;
      case 'warning':
        return <Badge variant="outline" className="border-warning text-warning">Avertissement</Badge>;
      default:
        return <Badge variant="secondary">Info</Badge>;
    }
  };

  const filterIssues = (severity: string) => {
    return issues.filter(issue => issue.severity === severity);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Validateur de Cohérence Grammaticale
          </CardTitle>
          <CardDescription>
            Vérifiez automatiquement la cohérence des informations grammaticales du dictionnaire
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button
              onClick={validateDictionary}
              disabled={isValidating}
              className="w-full"
              size="lg"
            >
              {isValidating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Validation en cours...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Lancer la validation
                </>
              )}
            </Button>

            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold">{stats.total}</p>
                      <p className="text-xs text-muted-foreground">Total</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-destructive">{stats.errors}</p>
                      <p className="text-xs text-muted-foreground">Erreurs</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-warning">{stats.warnings}</p>
                      <p className="text-xs text-muted-foreground">Avertissements</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-muted-foreground">{stats.info}</p>
                      <p className="text-xs text-muted-foreground">Infos</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-primary">{stats.valid}</p>
                      <p className="text-xs text-muted-foreground">Valides</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {issues.length > 0 && (
              <Tabs defaultValue="all" className="mt-6">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="all">
                    Tous ({issues.length})
                  </TabsTrigger>
                  <TabsTrigger value="error">
                    Erreurs ({filterIssues('error').length})
                  </TabsTrigger>
                  <TabsTrigger value="warning">
                    Avertissements ({filterIssues('warning').length})
                  </TabsTrigger>
                  <TabsTrigger value="info">
                    Infos ({filterIssues('info').length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="all">
                  <ScrollArea className="h-[500px] rounded-md border">
                    <div className="p-4 space-y-2">
                      {issues.map((issue, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                        >
                          {getSeverityIcon(issue.severity)}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold">{issue.word}</span>
                              {getSeverityBadge(issue.severity)}
                              <Badge variant="outline" className="text-xs">
                                {issue.category}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{issue.message}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Champ: <code className="bg-muted px-1 rounded">{issue.field}</code>
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="error">
                  <ScrollArea className="h-[500px] rounded-md border">
                    <div className="p-4 space-y-2">
                      {filterIssues('error').map((issue, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-3 p-3 rounded-lg border border-destructive/50 hover:bg-destructive/5 transition-colors"
                        >
                          {getSeverityIcon(issue.severity)}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold">{issue.word}</span>
                              <Badge variant="outline" className="text-xs">
                                {issue.category}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{issue.message}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Champ: <code className="bg-muted px-1 rounded">{issue.field}</code>
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="warning">
                  <ScrollArea className="h-[500px] rounded-md border">
                    <div className="p-4 space-y-2">
                      {filterIssues('warning').map((issue, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-3 p-3 rounded-lg border border-warning/50 hover:bg-warning/5 transition-colors"
                        >
                          {getSeverityIcon(issue.severity)}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold">{issue.word}</span>
                              <Badge variant="outline" className="text-xs">
                                {issue.category}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{issue.message}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Champ: <code className="bg-muted px-1 rounded">{issue.field}</code>
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="info">
                  <ScrollArea className="h-[500px] rounded-md border">
                    <div className="p-4 space-y-2">
                      {filterIssues('info').map((issue, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                        >
                          {getSeverityIcon(issue.severity)}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold">{issue.word}</span>
                              <Badge variant="outline" className="text-xs">
                                {issue.category}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{issue.message}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Champ: <code className="bg-muted px-1 rounded">{issue.field}</code>
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
