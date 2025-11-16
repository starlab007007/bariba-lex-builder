import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Brain, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export default function ModelTrainingPanel() {
  const [training, setTraining] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const { data: latestContext, refetch } = useQuery({
    queryKey: ['latest-training-context'],
    queryFn: async () => {
      const { data } = await supabase
        .from('ai_training_context')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      return data;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ['training-readiness'],
    queryFn: async () => {
      const [
        { count: dictionaryCount },
        { count: phrasesCount },
      ] = await Promise.all([
        supabase.from('dictionary_entries').select('*', { count: 'exact', head: true }),
        supabase.from('training_phrases').select('*', { count: 'exact', head: true }).eq('is_validated', true),
      ]);

      return {
        dictionaryCount: dictionaryCount || 0,
        phrasesCount: phrasesCount || 0,
        isReady: (dictionaryCount || 0) >= 100 && (phrasesCount || 0) >= 50,
      };
    },
  });

  const handleTrain = async () => {
    if (!stats?.isReady) {
      toast({
        title: 'Données insuffisantes',
        description: 'Il faut au moins 100 mots et 50 phrases validées pour entraîner le modèle',
        variant: 'destructive',
      });
      return;
    }

    setTraining(true);
    setProgress(0);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 90));
      }, 1000);

      const { data, error } = await supabase.functions.invoke('retrain-model');

      clearInterval(progressInterval);
      setProgress(100);

      if (error) throw error;

      toast({
        title: 'Entraînement réussi',
        description: `Modèle entraîné avec ${data.metrics.dictionary_size} mots et ${data.metrics.training_phrases} phrases`,
      });

      refetch();
    } catch (error: any) {
      console.error('Training error:', error);
      toast({
        title: 'Erreur d\'entraînement',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setTraining(false);
      setProgress(0);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>État du Modèle</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {latestContext ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Version</span>
                <span className="font-medium">{latestContext.model_version}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Dernier entraînement</span>
                <span className="font-medium">
                  {new Date(latestContext.created_at).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Données utilisées</span>
                <span className="font-medium">
                  {latestContext.dictionary_count} mots, {latestContext.phrases_count} phrases
                </span>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Aucun modèle entraîné. Lancez votre premier entraînement ci-dessous.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Données Disponibles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              {(stats?.dictionaryCount || 0) >= 100 ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-yellow-500" />
              )}
              <div>
                <p className="text-sm font-medium">{stats?.dictionaryCount || 0} mots</p>
                <p className="text-xs text-muted-foreground">Minimum : 100</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {(stats?.phrasesCount || 0) >= 50 ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-yellow-500" />
              )}
              <div>
                <p className="text-sm font-medium">{stats?.phrasesCount || 0} phrases validées</p>
                <p className="text-xs text-muted-foreground">Minimum : 50</p>
              </div>
            </div>
          </div>

          {!stats?.isReady && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
              <p className="text-sm text-yellow-700 dark:text-yellow-400">
                Données insuffisantes pour l'entraînement. Ajoutez plus de mots au dictionnaire ou validez plus de phrases.
              </p>
            </div>
          )}

          {training && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-sm text-center text-muted-foreground">
                Entraînement en cours... {progress}%
              </p>
            </div>
          )}

          <Button 
            onClick={handleTrain} 
            disabled={!stats?.isReady || training}
            className="w-full"
          >
            {training ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Entraînement en cours...
              </>
            ) : (
              <>
                <Brain className="h-4 w-4 mr-2" />
                Entraîner le Modèle
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}