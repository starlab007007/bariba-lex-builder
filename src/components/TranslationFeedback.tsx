import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ThumbsUp, ThumbsDown, MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useGamification } from '@/hooks/useGamification';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface TranslationFeedbackProps {
  translationLogId?: string;
  onFeedbackSubmitted?: () => void;
}

export default function TranslationFeedback({ translationLogId, onFeedbackSubmitted }: TranslationFeedbackProps) {
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [feedbackType, setFeedbackType] = useState<'positive' | 'negative' | 'correction'>('positive');
  const [suggestedTranslation, setSuggestedTranslation] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const { updateAchievement } = useGamification();

  const handleQuickFeedback = async (type: 'positive' | 'negative') => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast({
        title: 'Connexion requise',
        description: 'Vous devez être connecté pour donner votre avis',
        variant: 'destructive',
      });
      return;
    }

    if (!translationLogId) {
      toast({
        title: 'Erreur',
        description: 'Impossible d\'enregistrer le feedback',
        variant: 'destructive',
      });
      return;
    }

    const { error } = await supabase
      .from('translation_feedback')
      .insert({
        translation_log_id: translationLogId,
        user_id: user.id,
        feedback_type: type,
      });

    if (error) {
      console.error('Error submitting feedback:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'enregistrer votre avis',
        variant: 'destructive',
      });
    } else {
      // Update gamification achievements
      await updateAchievement('feedback_given');
      
      toast({
        title: 'Merci !',
        description: 'Votre avis a été enregistré',
      });
      onFeedbackSubmitted?.();
    }
  };

  const handleDetailedFeedback = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast({
        title: 'Connexion requise',
        description: 'Vous devez être connecté pour suggérer une amélioration',
        variant: 'destructive',
      });
      return;
    }

    if (!translationLogId) {
      toast({
        title: 'Erreur',
        description: 'Impossible d\'enregistrer le feedback',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    const { error } = await supabase
      .from('translation_feedback')
      .insert({
        translation_log_id: translationLogId,
        user_id: user.id,
        feedback_type: 'correction',
        suggested_translation: suggestedTranslation,
        notes: notes,
      });

    if (error) {
      console.error('Error submitting feedback:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'enregistrer votre suggestion',
        variant: 'destructive',
      });
    } else {
      // Update gamification achievements
      await updateAchievement('feedback_given');
      
      toast({
        title: 'Merci !',
        description: 'Votre suggestion a été enregistrée',
      });
      setShowFeedbackDialog(false);
      setSuggestedTranslation('');
      setNotes('');
      onFeedbackSubmitted?.();
    }

    setSubmitting(false);
  };

  return (
    <>
      <div className="flex items-center gap-2 justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleQuickFeedback('positive')}
          className="text-green-600 hover:text-green-700 hover:bg-green-50"
        >
          <ThumbsUp className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleQuickFeedback('negative')}
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <ThumbsDown className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowFeedbackDialog(true)}
          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
        >
          <MessageSquare className="h-4 w-4 mr-1" />
          Suggérer
        </Button>
      </div>

      <Dialog open={showFeedbackDialog} onOpenChange={setShowFeedbackDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suggérer une meilleure traduction</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Votre traduction suggérée
              </label>
              <Textarea
                value={suggestedTranslation}
                onChange={(e) => setSuggestedTranslation(e.target.value)}
                placeholder="Entrez une meilleure traduction..."
                rows={3}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">
                Notes (optionnel)
              </label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Expliquez pourquoi cette traduction est meilleure..."
                rows={2}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowFeedbackDialog(false)}
                disabled={submitting}
              >
                Annuler
              </Button>
              <Button
                onClick={handleDetailedFeedback}
                disabled={!suggestedTranslation.trim() || submitting}
              >
                Envoyer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}