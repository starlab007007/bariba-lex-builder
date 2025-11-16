import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import TrainingPhraseImporter from './TrainingPhraseImporter';

export default function TrainingManager() {
  const [showImporter, setShowImporter] = useState(false);
  const [retraining, setRetraining] = useState(false);
  const { toast } = useToast();

  const { data: phrases, isLoading, refetch } = useQuery({
    queryKey: ['training-phrases'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_phrases')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
  });

  const handleRetrain = async () => {
    setRetraining(true);
    try {
      const { data, error } = await supabase.functions.invoke('retrain-model');

      if (error) throw error;

      toast({
        title: 'Entraînement terminé',
        description: 'Le modèle a été mis à jour avec succès',
      });
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setRetraining(false);
    }
  };

  const validatedCount = phrases?.filter((p) => p.is_validated).length || 0;
  const totalCount = phrases?.length || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Entraînement du Modèle IA</h2>
          <p className="text-muted-foreground">
            {validatedCount} / {totalCount} phrases validées
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowImporter(true)} variant="outline">
            <Upload className="mr-2 h-4 w-4" />
            Importer
          </Button>
          <Button onClick={handleRetrain} disabled={retraining}>
            <RefreshCw
              className={`mr-2 h-4 w-4 ${retraining ? 'animate-spin' : ''}`}
            />
            Réentraîner
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Phrases</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Phrases Validées</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{validatedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Taux de Validation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalCount > 0 ? Math.round((validatedCount / totalCount) * 100) : 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Phrases d'Entraînement Récentes</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Chargement...</div>
          ) : phrases && phrases.length > 0 ? (
            <div className="space-y-2">
              {phrases.slice(0, 10).map((phrase) => (
                <div
                  key={phrase.id}
                  className="flex items-start gap-3 p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="mt-1">
                    {phrase.is_validated ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="text-sm">
                      <span className="font-medium">FR:</span> {phrase.french_text}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium">BR:</span> {phrase.bariba_text}
                    </div>
                  </div>
                  {phrase.quality_score && (
                    <span className="text-xs px-2 py-1 bg-primary/10 rounded">
                      {phrase.quality_score}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Aucune phrase d'entraînement
            </div>
          )}
        </CardContent>
      </Card>

      {showImporter && (
        <TrainingPhraseImporter
          onClose={() => {
            setShowImporter(false);
            refetch();
          }}
        />
      )}
    </div>
  );
}
