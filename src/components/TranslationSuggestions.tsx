import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, ThumbsUp, ThumbsDown, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface TranslationSuggestionsProps {
  sourceText: string;
  translatedText: string;
  translationLogId?: string;
  onSuggestionSubmitted?: () => void;
}

export const TranslationSuggestions = ({
  sourceText,
  translatedText,
  translationLogId,
  onSuggestionSubmitted
}: TranslationSuggestionsProps) => {
  const [showSuggestionForm, setShowSuggestionForm] = useState(false);
  const [suggestedTranslation, setSuggestedTranslation] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleFeedback = async (feedbackType: 'positive' | 'negative') => {
    try {
      setIsSubmitting(true);

      const { error } = await supabase
        .from('translation_feedback')
        .insert({
          translation_log_id: translationLogId,
          user_id: user?.id,
          feedback_type: feedbackType,
          notes: feedbackType === 'positive' ? 'Traduction correcte' : 'Traduction à améliorer'
        });

      if (error) throw error;

      toast({
        title: feedbackType === 'positive' ? '👍 Merci !' : '👎 Noté',
        description: feedbackType === 'positive' 
          ? 'Votre retour positif nous aide à améliorer le modèle.'
          : 'Nous prendrons en compte votre retour pour améliorer les traductions.'
      });

      if (feedbackType === 'negative') {
        setShowSuggestionForm(true);
      }
    } catch (error) {
      console.error('Feedback error:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'enregistrer votre retour.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSuggestionSubmit = async () => {
    if (!suggestedTranslation.trim()) {
      toast({
        title: 'Suggestion requise',
        description: 'Veuillez proposer une traduction améliorée.',
        variant: 'destructive'
      });
      return;
    }

    try {
      setIsSubmitting(true);

      const { error } = await supabase
        .from('translation_feedback')
        .insert({
          translation_log_id: translationLogId,
          user_id: user?.id,
          feedback_type: 'correction',
          suggested_translation: suggestedTranslation,
          notes: notes || undefined
        });

      if (error) throw error;

      toast({
        title: '✨ Suggestion enregistrée',
        description: 'Merci ! Votre suggestion aidera à améliorer le modèle.'
      });

      setSuggestedTranslation("");
      setNotes("");
      setShowSuggestionForm(false);
      onSuggestionSubmitted?.();
    } catch (error) {
      console.error('Suggestion error:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'enregistrer votre suggestion.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!translatedText) return null;

  return (
    <Card className="p-4 space-y-4 bg-accent/5">
      <div className="flex items-center gap-2">
        <Lightbulb className="h-4 w-4 text-primary" />
        <h3 className="font-semibold text-sm">Améliorer cette traduction</h3>
        <Badge variant="secondary" className="text-xs ml-auto">
          Communautaire
        </Badge>
      </div>

      {!showSuggestionForm ? (
        <>
          <p className="text-sm text-muted-foreground">
            Cette traduction vous semble-t-elle correcte ?
          </p>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleFeedback('positive')}
              disabled={isSubmitting}
              className="flex-1"
            >
              <ThumbsUp className="h-3 w-3 mr-2" />
              Correcte
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleFeedback('negative')}
              disabled={isSubmitting}
              className="flex-1"
            >
              <ThumbsDown className="h-3 w-3 mr-2" />
              À améliorer
            </Button>
          </div>
        </>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium mb-1 block">
              Proposition de traduction améliorée *
            </label>
            <Textarea
              placeholder="Proposez une meilleure traduction..."
              value={suggestedTranslation}
              onChange={(e) => setSuggestedTranslation(e.target.value)}
              className="min-h-20 bariba-text"
            />
          </div>

          <div>
            <label className="text-xs font-medium mb-1 block">
              Notes explicatives (optionnel)
            </label>
            <Textarea
              placeholder="Expliquez pourquoi cette traduction est meilleure..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-16"
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleSuggestionSubmit}
              disabled={isSubmitting || !suggestedTranslation.trim()}
              className="flex-1"
              size="sm"
            >
              <Send className="h-3 w-3 mr-2" />
              Envoyer la suggestion
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowSuggestionForm(false);
                setSuggestedTranslation("");
                setNotes("");
              }}
              disabled={isSubmitting}
              size="sm"
            >
              Annuler
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
};
