/**
 * Gestionnaire de feedback utilisateur
 * Permet de valider les corrections et déclencher le réentraînement
 */

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Check, X, AlertTriangle, TrendingUp } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Feedback {
  id: string;
  feedback_type: string;
  notes: string | null;
  suggested_translation: string | null;
  translation_log_id: string | null;
  user_id: string | null;
  created_at: string;
  is_validated: boolean;
  validated_by: string | null;
  validated_at: string | null;
  used_for_training: boolean;
}

export function FeedbackManager() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRetraining, setIsRetraining] = useState(false);
  
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    validated: 0,
    usedForTraining: 0
  });

  useEffect(() => {
    loadFeedbacks();
  }, []);

  const loadFeedbacks = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('translation_feedback')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setFeedbacks(data || []);
      calculateStats(data || []);
    } catch (error: any) {
      toast.error(`Erreur: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStats = (data: Feedback[]) => {
    setStats({
      total: data.length,
      pending: data.filter(f => !f.is_validated).length,
      validated: data.filter(f => f.is_validated).length,
      usedForTraining: data.filter(f => f.used_for_training).length
    });
  };

  const validateFeedback = async (feedbackId: string, approve: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('translation_feedback')
        .update({
          is_validated: approve,
          validated_by: user?.id,
          validated_at: new Date().toISOString()
        })
        .eq('id', feedbackId);

      if (error) throw error;

      toast.success(approve ? 'Feedback approuvé' : 'Feedback rejeté');
      loadFeedbacks();
    } catch (error: any) {
      toast.error(`Erreur: ${error.message}`);
    }
  };

  const triggerRetraining = async () => {
    if (!confirm('Déclencher le réentraînement du modèle ? Cela peut prendre plusieurs minutes.')) {
      return;
    }

    try {
      setIsRetraining(true);
      toast.info('Réentraînement démarré...');

      const { data, error } = await supabase.functions.invoke('retrain-model', {
        body: { useValidatedFeedback: true }
      });

      if (error) throw error;

      toast.success(`Réentraînement terminé! ${data.trainedPairs} paires utilisées`);
      
      // Marquer les feedbacks comme utilisés
      await supabase
        .from('translation_feedback')
        .update({ used_for_training: true })
        .eq('is_validated', true)
        .eq('used_for_training', false);

      loadFeedbacks();
    } catch (error: any) {
      toast.error(`Erreur: ${error.message}`);
    } finally {
      setIsRetraining(false);
    }
  };

  const pendingFeedbacks = feedbacks.filter(f => !f.is_validated);
  const validatedFeedbacks = feedbacks.filter(f => f.is_validated);

  return (
    <div className="space-y-6">
      {/* Statistiques */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Feedback</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">En attente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Validés</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.validated}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Utilisés (entraînement)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.usedForTraining}</div>
          </CardContent>
        </Card>
      </div>

      {/* Actions principales */}
      <Card>
        <CardHeader>
          <CardTitle>Gestion du Feedback Utilisateur</CardTitle>
          <CardDescription>
            Validez les corrections et déclenchez le réentraînement du modèle
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <Button
              onClick={triggerRetraining}
              disabled={isRetraining || stats.validated - stats.usedForTraining === 0}
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              {isRetraining ? 'Réentraînement...' : `Réentraîner (${stats.validated - stats.usedForTraining} nouvelles corrections)`}
            </Button>
            {stats.pending > 10 && (
              <div className="flex items-center gap-2 text-sm text-orange-600">
                <AlertTriangle className="h-4 w-4" />
                {stats.pending} feedbacks en attente de validation
              </div>
            )}
          </div>

          <Tabs defaultValue="pending">
            <TabsList>
              <TabsTrigger value="pending">
                En attente ({pendingFeedbacks.length})
              </TabsTrigger>
              <TabsTrigger value="validated">
                Validés ({validatedFeedbacks.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending">
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Suggestion</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">
                          Chargement...
                        </TableCell>
                      </TableRow>
                    ) : pendingFeedbacks.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          Aucun feedback en attente
                        </TableCell>
                      </TableRow>
                    ) : (
                      pendingFeedbacks.map((feedback) => (
                        <TableRow key={feedback.id}>
                          <TableCell>
                            <Badge variant={feedback.feedback_type === 'correction' ? 'destructive' : 'default'}>
                              {feedback.feedback_type}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium max-w-xs truncate">
                            {feedback.suggested_translation || '-'}
                          </TableCell>
                          <TableCell className="max-w-md truncate">
                            {feedback.notes || '-'}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(feedback.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => validateFeedback(feedback.id, true)}
                              >
                                <Check className="h-4 w-4 text-green-600" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => validateFeedback(feedback.id, false)}
                              >
                                <X className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="validated">
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Suggestion</TableHead>
                      <TableHead>Utilisé</TableHead>
                      <TableHead>Date validation</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {validatedFeedbacks.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          Aucun feedback validé
                        </TableCell>
                      </TableRow>
                    ) : (
                      validatedFeedbacks.map((feedback) => (
                        <TableRow key={feedback.id}>
                          <TableCell>
                            <Badge>{feedback.feedback_type}</Badge>
                          </TableCell>
                          <TableCell className="font-medium max-w-xs truncate">
                            {feedback.suggested_translation || '-'}
                          </TableCell>
                          <TableCell>
                            {feedback.used_for_training ? (
                              <Badge variant="default">Oui</Badge>
                            ) : (
                              <Badge variant="outline">Non</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {feedback.validated_at ? new Date(feedback.validated_at).toLocaleDateString() : '-'}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
