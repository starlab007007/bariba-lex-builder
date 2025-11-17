import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MessageSquare, ThumbsUp, AlertCircle } from 'lucide-react';
import { useGamification } from '@/hooks/useGamification';

interface DictionaryFeedbackProps {
  entryId: string;
  entryWord: string;
}

export const DictionaryFeedback = ({ entryId, entryWord }: DictionaryFeedbackProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { updateAchievement } = useGamification();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackType, setFeedbackType] = useState<string>('correction');
  const [fieldName, setFieldName] = useState<string>('');
  const [suggestedValue, setSuggestedValue] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const handleSubmitFeedback = async () => {
    if (!user) {
      toast({
        title: "Connexion requise",
        description: "Veuillez vous connecter pour donner votre feedback.",
        variant: "destructive",
      });
      return;
    }

    if (!feedbackType || (feedbackType === 'correction' && !fieldName)) {
      toast({
        title: "Champs requis",
        description: "Veuillez remplir tous les champs requis.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('dictionary_feedback')
        .insert({
          entry_id: entryId,
          user_id: user.id,
          feedback_type: feedbackType,
          field_name: fieldName || null,
          suggested_value: suggestedValue || null,
          notes: notes || null,
        });

      if (error) throw error;

      // Add achievement
      await updateAchievement('feedback_given', 1);

      toast({
        title: "Merci pour votre feedback !",
        description: "Votre suggestion a été enregistrée et sera examinée par notre équipe.",
      });

      // Reset form
      setFeedbackType('correction');
      setFieldName('');
      setSuggestedValue('');
      setNotes('');
      setIsOpen(false);
    } catch (error: any) {
      console.error('Error submitting feedback:', error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de l'envoi du feedback.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickFeedback = async (type: 'helpful' | 'issue') => {
    if (!user) {
      toast({
        title: "Connexion requise",
        description: "Veuillez vous connecter pour donner votre feedback.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('dictionary_feedback')
        .insert({
          entry_id: entryId,
          user_id: user.id,
          feedback_type: type === 'helpful' ? 'other' : 'correction',
          notes: type === 'helpful' ? 'Entrée utile et correcte' : 'Cette entrée contient une erreur',
        });

      if (error) throw error;

      await updateAchievement('feedback_given', 1);

      toast({
        title: type === 'helpful' ? "Merci !" : "Feedback enregistré",
        description: type === 'helpful' 
          ? "Votre avis positif a été enregistré." 
          : "Nous examinerons cette entrée.",
      });
    } catch (error: any) {
      console.error('Error submitting quick feedback:', error);
    }
  };

  return (
    <div className="flex items-center gap-2 pt-4 border-t border-border/50">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleQuickFeedback('helpful')}
        className="text-xs"
      >
        <ThumbsUp className="h-3 w-3 mr-1" />
        Utile
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleQuickFeedback('issue')}
        className="text-xs"
      >
        <AlertCircle className="h-3 w-3 mr-1" />
        Signaler
      </Button>
      
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="text-xs ml-auto">
            <MessageSquare className="h-3 w-3 mr-1" />
            Améliorer cette entrée
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Améliorer l'entrée : {entryWord}</DialogTitle>
            <DialogDescription>
              Aidez-nous à améliorer la qualité du dictionnaire en signalant des erreurs ou en suggérant des améliorations.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="feedback-type">Type de feedback</Label>
              <Select value={feedbackType} onValueChange={setFeedbackType}>
                <SelectTrigger id="feedback-type">
                  <SelectValue placeholder="Sélectionnez un type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="correction">Correction d'erreur</SelectItem>
                  <SelectItem value="missing_info">Information manquante</SelectItem>
                  <SelectItem value="example_request">Demande d'exemple</SelectItem>
                  <SelectItem value="phonetic_correction">Correction phonétique</SelectItem>
                  <SelectItem value="other">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {feedbackType === 'correction' && (
              <div>
                <Label htmlFor="field-name">Champ à corriger</Label>
                <Select value={fieldName} onValueChange={setFieldName}>
                  <SelectTrigger id="field-name">
                    <SelectValue placeholder="Sélectionnez un champ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="definition">Définition</SelectItem>
                    <SelectItem value="phonetic">Phonétique</SelectItem>
                    <SelectItem value="part_of_speech">Catégorie grammaticale</SelectItem>
                    <SelectItem value="nominal_class">Classe nominale</SelectItem>
                    <SelectItem value="verbal_group">Groupe verbal</SelectItem>
                    <SelectItem value="examples">Exemples</SelectItem>
                    <SelectItem value="other">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label htmlFor="suggested-value">Valeur suggérée</Label>
              <Input
                id="suggested-value"
                value={suggestedValue}
                onChange={(e) => setSuggestedValue(e.target.value)}
                placeholder="Votre suggestion..."
              />
            </div>

            <div>
              <Label htmlFor="notes">Notes complémentaires</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Expliquez votre suggestion..."
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={isSubmitting}
              >
                Annuler
              </Button>
              <Button
                onClick={handleSubmitFeedback}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Envoi...' : 'Envoyer le feedback'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
