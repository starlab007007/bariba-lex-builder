/**
 * Panneau de gestion des données - Réinitialisation, vidage et chargement
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import {
  Database,
  Trash2,
  RefreshCw,
  Upload,
  AlertTriangle,
  BookOpen,
  MessageSquare,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';

type DataType = 'dictionary' | 'training' | 'idioms';

interface DataStats {
  dictionary: number;
  training: number;
  idioms: number;
}

export const DataManagementPanel = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [stats, setStats] = useState<DataStats>({ dictionary: 0, training: 0, idioms: 0 });
  const [loading, setLoading] = useState<DataType | null>(null);
  const [progress, setProgress] = useState(0);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    type: DataType | null;
    action: 'clear' | 'reset' | null;
  }>({ open: false, type: null, action: null });

  // Charger les statistiques au montage
  useEffect(() => {
    loadStats();
  }, []);

  // Charger les statistiques
  const loadStats = async () => {
    try {
      const [dictCount, trainingCount, idiomsCount] = await Promise.all([
        supabase.from('dictionary_entries').select('*', { count: 'exact', head: true }),
        supabase.from('training_phrases').select('*', { count: 'exact', head: true }),
        supabase.from('idiomatic_expressions').select('*', { count: 'exact', head: true }),
      ]);

      setStats({
        dictionary: dictCount.count || 0,
        training: trainingCount.count || 0,
        idioms: idiomsCount.count || 0,
      });
    } catch (error) {
      console.error('Erreur chargement stats:', error);
    }
  };

  // Vider une table
  const clearData = async (type: DataType) => {
    try {
      setLoading(type);
      setProgress(10);

      let error = null;
      
      if (type === 'dictionary') {
        const result = await supabase
          .from('dictionary_entries')
          .delete()
          .gte('created_at', '1900-01-01');
        error = result.error;
      } else if (type === 'training') {
        const result = await supabase
          .from('training_phrases')
          .delete()
          .gte('created_at', '1900-01-01');
        error = result.error;
      } else if (type === 'idioms') {
        const result = await supabase
          .from('idiomatic_expressions')
          .delete()
          .gte('created_at', '1900-01-01');
        error = result.error;
      }

      if (error) throw error;

      setProgress(100);
      
      toast({
        title: 'Données supprimées',
        description: `Toutes les données ${type === 'dictionary' ? 'du dictionnaire' : type === 'training' ? "d'entraînement" : 'des idiomes'} ont été supprimées`,
      });

      await loadStats();
      queryClient.invalidateQueries();
    } catch (error: any) {
      console.error('Erreur suppression:', error);
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(null);
      setProgress(0);
    }
  };

  // Réinitialiser avec les données par défaut
  const resetToDefault = async (type: DataType) => {
    const files = {
      dictionary: '/dictionnaire-10-2.json',
      training: '/corpus_initial_2600.json',
      idioms: '/idiomes_complets.json',
    };

    try {
      setLoading(type);
      setProgress(10);

      // 1. Vider la table
      if (type === 'dictionary') {
        await supabase
          .from('dictionary_entries')
          .delete()
          .gte('created_at', '1900-01-01');
      } else if (type === 'training') {
        await supabase
          .from('training_phrases')
          .delete()
          .gte('created_at', '1900-01-01');
      } else if (type === 'idioms') {
        await supabase
          .from('idiomatic_expressions')
          .delete()
          .gte('created_at', '1900-01-01');
      }

      setProgress(30);

      // 2. Charger le fichier
      const response = await fetch(files[type]);
      if (!response.ok) throw new Error('Fichier non trouvé');

      const data = await response.json();
      setProgress(50);

      // 3. Préparer les données selon le type
      let dataToInsert: any[] = [];

      if (type === 'dictionary') {
        dataToInsert = Array.isArray(data) ? data : data.entries || [];
      } else if (type === 'training') {
        dataToInsert = Array.isArray(data) 
          ? data.map((item: any) => ({
              french_text: item.french_text || item.francais || item.french,
              bariba_text: item.bariba_text || item.bariba || item.baatonum,
              is_validated: true,
              source: 'default',
            }))
          : [];
      } else if (type === 'idioms') {
        dataToInsert = Array.isArray(data)
          ? data.map((item: any) => ({
              french_expression: item.french,
              bariba_expression: item.bariba,
              category: item.category,
              usage_context: item.usage_context,
              is_verified: true,
            }))
          : [];
      }

      setProgress(70);

      // 4. Insérer par lots
      const batchSize = 100;
      let inserted = 0;

      for (let i = 0; i < dataToInsert.length; i += batchSize) {
        const batch = dataToInsert.slice(i, i + batchSize);
        
        let error = null;
        if (type === 'dictionary') {
          const result = await supabase.from('dictionary_entries').insert(batch);
          error = result.error;
        } else if (type === 'training') {
          const result = await supabase.from('training_phrases').insert(batch);
          error = result.error;
        } else if (type === 'idioms') {
          const result = await supabase.from('idiomatic_expressions').insert(batch);
          error = result.error;
        }

        if (error) {
          console.error('Erreur batch:', error);
        } else {
          inserted += batch.length;
        }

        const currentProgress = 70 + Math.floor((i / dataToInsert.length) * 30);
        setProgress(currentProgress);
      }

      setProgress(100);

      toast({
        title: 'Réinitialisation réussie',
        description: `${inserted} entrées restaurées depuis les données par défaut`,
      });

      await loadStats();
      queryClient.invalidateQueries();
    } catch (error: any) {
      console.error('Erreur réinitialisation:', error);
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(null);
      setProgress(0);
    }
  };

  // Charger les stats au montage
  useEffect(() => {
    loadStats();
  }, []);

  const handleConfirmAction = () => {
    if (!confirmDialog.type || !confirmDialog.action) return;

    if (confirmDialog.action === 'clear') {
      clearData(confirmDialog.type);
    } else if (confirmDialog.action === 'reset') {
      resetToDefault(confirmDialog.type);
    }

    setConfirmDialog({ open: false, type: null, action: null });
  };

  const DataCard = ({ 
    type, 
    title, 
    description, 
    icon: Icon, 
    count 
  }: { 
    type: DataType; 
    title: string; 
    description: string; 
    icon: any; 
    count: number;
  }) => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className="w-5 h-5 text-primary" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <span className="text-sm font-medium">Entrées actuelles</span>
          <span className="text-2xl font-bold">{count.toLocaleString()}</span>
        </div>

        {loading === type && (
          <div className="space-y-2">
            <Progress value={progress} />
            <p className="text-sm text-muted-foreground text-center">
              Opération en cours... {progress}%
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-2">
          <Button
            variant="outline"
            onClick={() => setConfirmDialog({ open: true, type, action: 'reset' })}
            disabled={loading !== null}
            className="w-full"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Réinitialiser (Données par défaut)
          </Button>

          <Button
            variant="outline"
            onClick={() => loadStats()}
            disabled={loading !== null}
            className="w-full"
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Actualiser le compteur
          </Button>

          <Button
            variant="destructive"
            onClick={() => setConfirmDialog({ open: true, type, action: 'clear' })}
            disabled={loading !== null || count === 0}
            className="w-full"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Vider complètement
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Attention :</strong> Ces opérations sont irréversibles. Assurez-vous d'avoir des sauvegardes avant de supprimer des données.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <DataCard
          type="dictionary"
          title="Dictionnaire"
          description="Entrées du dictionnaire français-bariba"
          icon={BookOpen}
          count={stats.dictionary}
        />

        <DataCard
          type="training"
          title="Entraînement"
          description="Phrases pour l'entraînement du modèle"
          icon={MessageSquare}
          count={stats.training}
        />

        <DataCard
          type="idioms"
          title="Idiomes"
          description="Expressions idiomatiques"
          icon={Sparkles}
          count={stats.idioms}
        />
      </div>

      {/* Dialog de confirmation */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog.action === 'clear' ? 'Vider les données ?' : 'Réinitialiser les données ?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.action === 'clear' ? (
                <>
                  Cette action supprimera <strong>toutes</strong> les données{' '}
                  {confirmDialog.type === 'dictionary' ? 'du dictionnaire' : 
                   confirmDialog.type === 'training' ? "d'entraînement" : 
                   'des idiomes'}.
                  <br /><br />
                  <span className="text-destructive font-semibold">
                    Cette action est irréversible !
                  </span>
                </>
              ) : (
                <>
                  Cette action supprimera les données actuelles et les remplacera par les données par défaut.
                  <br /><br />
                  Les données personnalisées seront perdues.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmAction}
              className={confirmDialog.action === 'clear' ? 'bg-destructive' : ''}
            >
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};