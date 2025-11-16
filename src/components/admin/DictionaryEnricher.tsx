import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, AlertCircle, Download } from 'lucide-react';
import { parseFullDictionaryEntry, detectTonePattern, extractExamples } from '@/utils/baatonumParser';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function DictionaryEnricher() {
  const { toast } = useToast();
  const [isEnriching, setIsEnriching] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState({
    total: 0,
    enriched: 0,
    skipped: 0,
    errors: 0
  });
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()} - ${message}`]);
  };

  const enrichDictionary = async () => {
    setIsEnriching(true);
    setProgress(0);
    setStats({ total: 0, enriched: 0, skipped: 0, errors: 0 });
    setLogs([]);

    try {
      addLog('📚 Récupération des entrées du dictionnaire...');
      
      // Récupérer toutes les entrées
      const { data: entries, error: fetchError } = await supabase
        .from('dictionary_entries')
        .select('*')
        .order('word');

      if (fetchError) throw fetchError;
      if (!entries || entries.length === 0) {
        toast({
          title: 'Aucune entrée',
          description: 'Le dictionnaire est vide',
          variant: 'destructive'
        });
        return;
      }

      addLog(`✅ ${entries.length} entrées trouvées`);
      setStats(prev => ({ ...prev, total: entries.length }));

      // Traiter chaque entrée
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        const progressPercent = ((i + 1) / entries.length) * 100;
        setProgress(progressPercent);

        addLog(`Traitement: ${entry.word}...`);

        try {
          // Vérifier si l'entrée a déjà des informations grammaticales complètes
          if (entry.nominal_class || entry.verb_root || entry.adjective_forms) {
            addLog(`⏭️ ${entry.word} - Déjà enrichi`);
            setStats(prev => ({ ...prev, skipped: prev.skipped + 1 }));
            continue;
          }

          // Construire une entrée formatée pour le parser
          const formattedEntry = buildFormattedEntry(entry);
          
          // Parser l'entrée
          const parsed = parseFullDictionaryEntry(formattedEntry);
          
          if (!parsed) {
            addLog(`⚠️ ${entry.word} - Impossible de parser`);
            setStats(prev => ({ ...prev, skipped: prev.skipped + 1 }));
            continue;
          }

          // Détecter le pattern de tons
          const tonePattern = detectTonePattern(entry.word);

          // Extraire des exemples si manquants
          const examples = entry.definition ? extractExamples(entry.definition) : [];

          // Préparer les données enrichies
          const enrichedData: any = {
            updated_at: new Date().toISOString()
          };

          // Ajouter les informations selon le type
          if (parsed.nominalClass) {
            enrichedData.nominal_class = parsed.nominalClass;
            enrichedData.plural_form = parsed.pluralForm;
            enrichedData.plural_class = parsed.pluralClass;
          }

          if (parsed.verbRoot) {
            enrichedData.verb_root = parsed.verbRoot;
            enrichedData.verb_radical = parsed.verbRadical;
            enrichedData.accomplished_form = parsed.accomplishedForm;
            enrichedData.negative_form = parsed.negativeForm;
            enrichedData.verbal_group = parsed.verbalGroup;
            enrichedData.verb_type = parsed.verbType;
          }

          if (tonePattern) {
            enrichedData.tone_pattern = tonePattern;
          }

          if (parsed.crossReference) {
            enrichedData.cross_reference = parsed.crossReference;
            enrichedData.is_main_entry = false;
          }

          // Mettre à jour l'entrée si des données ont été enrichies
          if (Object.keys(enrichedData).length > 1) {
            const { error: updateError } = await supabase
              .from('dictionary_entries')
              .update(enrichedData)
              .eq('id', entry.id);

            if (updateError) {
              addLog(`❌ ${entry.word} - Erreur: ${updateError.message}`);
              setStats(prev => ({ ...prev, errors: prev.errors + 1 }));
            } else {
              addLog(`✅ ${entry.word} - Enrichi avec succès`);
              setStats(prev => ({ ...prev, enriched: prev.enriched + 1 }));
            }
          } else {
            addLog(`⏭️ ${entry.word} - Aucune donnée à enrichir`);
            setStats(prev => ({ ...prev, skipped: prev.skipped + 1 }));
          }

        } catch (error: any) {
          addLog(`❌ ${entry.word} - Erreur: ${error.message}`);
          setStats(prev => ({ ...prev, errors: prev.errors + 1 }));
        }

        // Pause pour éviter de surcharger la base
        if (i % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      addLog('🎉 Enrichissement terminé!');
      toast({
        title: 'Enrichissement terminé',
        description: `${stats.enriched} entrées enrichies, ${stats.skipped} ignorées, ${stats.errors} erreurs`
      });

    } catch (error: any) {
      addLog(`❌ Erreur fatale: ${error.message}`);
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsEnriching(false);
    }
  };

  // Construire une entrée formatée pour le parser
  const buildFormattedEntry = (entry: any): string => {
    const parts: string[] = [entry.word];
    
    if (entry.part_of_speech) {
      parts.push(entry.part_of_speech);
    }
    
    if (entry.definition) {
      parts.push(entry.definition);
    }

    return parts.join(' ');
  };

  const exportLogs = () => {
    const logText = logs.join('\n');
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `enrichment-log-${new Date().toISOString()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Enrichissement Automatique du Dictionnaire</CardTitle>
          <CardDescription>
            Analyse et enrichit automatiquement les entrées du dictionnaire avec les informations grammaticales Baatɔnum
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Cet outil analyse chaque entrée pour extraire automatiquement :
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Classes nominales et formes plurielles</li>
                <li>Formes verbales (racine, radical, accompli, négatif)</li>
                <li>Patterns de tons</li>
                <li>Références croisées</li>
              </ul>
            </AlertDescription>
          </Alert>

          <div className="flex gap-4">
            <Button 
              onClick={enrichDictionary} 
              disabled={isEnriching}
              className="flex-1"
            >
              {isEnriching ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enrichissement en cours...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Lancer l'enrichissement
                </>
              )}
            </Button>

            {logs.length > 0 && (
              <Button 
                onClick={exportLogs} 
                variant="outline"
              >
                <Download className="mr-2 h-4 w-4" />
                Exporter les logs
              </Button>
            )}
          </div>

          {isEnriching && (
            <div className="space-y-2">
              <Progress value={progress} className="w-full" />
              <p className="text-sm text-muted-foreground text-center">
                {Math.round(progress)}% complété
              </p>
            </div>
          )}

          {(stats.total > 0 || isEnriching) && (
            <div className="grid grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{stats.total}</div>
                  <p className="text-xs text-muted-foreground">Total</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-green-600">{stats.enriched}</div>
                  <p className="text-xs text-muted-foreground">Enrichies</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-yellow-600">{stats.skipped}</div>
                  <p className="text-xs text-muted-foreground">Ignorées</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-red-600">{stats.errors}</div>
                  <p className="text-xs text-muted-foreground">Erreurs</p>
                </CardContent>
              </Card>
            </div>
          )}

          {logs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Journal d'activité</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-muted p-4 rounded-md max-h-64 overflow-y-auto font-mono text-xs space-y-1">
                  {logs.slice(-50).map((log, i) => (
                    <div key={i}>{log}</div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}