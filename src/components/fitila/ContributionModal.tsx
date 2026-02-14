import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, MessageSquarePlus, AlertTriangle, Check } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface ContributionModalProps {
  isOpen: boolean;
  onClose: () => void;
  context: {
    lessonId: string;
    lessonTitle: string;
    sectionIndex?: number;
    quizIndex?: number;
    type: 'correction' | 'suggestion';
  };
  lang: 'french' | 'bariba';
}

export function ContributionModal({ isOpen, onClose, context, lang }: ContributionModalProps) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const isFr = lang === 'french';

  const handleSubmit = async () => {
    if (!message.trim() || !user) return;
    setSending(true);
    try {
      // Store as a contribution
      await supabase.from('user_contributions').insert({
        user_id: user.id,
        action_type: context.type === 'correction' ? 'learning_correction' : 'learning_suggestion',
        points: context.type === 'correction' ? 8 : 5,
        reference_id: null,
      });

      // Store the feedback in dictionary_feedback (reuse existing table)
      await supabase.from('dictionary_feedback').insert({
        entry_id: '00000000-0000-0000-0000-000000000000', // placeholder
        feedback_type: context.type,
        field_name: `learn:${context.lessonId}:s${context.sectionIndex ?? ''}:q${context.quizIndex ?? ''}`,
        suggested_value: message.trim(),
        user_id: user.id,
        feedback_source: 'learning_module',
        notes: `Leçon: ${context.lessonTitle}`,
      });

      setSent(true);
      toast({
        title: isFr ? '✅ Merci pour votre contribution !' : '✅ Bɑɑkɑ win sɔmburu yira !',
        description: isFr ? '+8 points contributeur' : '+8 points',
      });
      setTimeout(() => {
        onClose();
        setSent(false);
        setMessage('');
      }, 1500);
    } catch (err) {
      console.error('Contribution error:', err);
      toast({ title: isFr ? 'Erreur' : 'Gbɛgbɛru', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          onClick={e => e.stopPropagation()}
          className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md p-6 space-y-4"
        >
          {sent ? (
            <div className="text-center py-8">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-600" />
              </motion.div>
              <h3 className="text-lg font-bold text-gray-800">
                {isFr ? 'Contribution envoyée !' : 'Sɔmburu yira kpe !'}
              </h3>
              <p className="text-gray-500 text-sm mt-1">
                {isFr ? 'Vous gagnez des points contributeur 🏅' : 'A points mɔ 🏅'}
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {context.type === 'correction' ? (
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                  ) : (
                    <MessageSquarePlus className="w-5 h-5 text-blue-500" />
                  )}
                  <h3 className="font-bold text-gray-800">
                    {context.type === 'correction'
                      ? (isFr ? 'Signaler une erreur' : 'Gbɛgbɛru yira')
                      : (isFr ? 'Proposer une amélioration' : 'Sɔmburu yira')}
                  </h3>
                </div>
                <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-500">
                <span className="font-semibold">{isFr ? 'Leçon' : 'Deburu'}:</span> {context.lessonTitle}
                {context.sectionIndex !== undefined && (
                  <span> • Section {context.sectionIndex + 1}</span>
                )}
                {context.quizIndex !== undefined && (
                  <span> • Quiz {context.quizIndex + 1}</span>
                )}
              </div>

              <Textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder={isFr
                  ? 'Décrivez la correction ou votre suggestion...'
                  : 'A win sɔmburu kɑ gbɛgbɛru yira...'}
                rows={4}
                className="rounded-xl"
              />

              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">
                  {isFr ? `+${context.type === 'correction' ? 8 : 5} pts contributeur` : `+${context.type === 'correction' ? 8 : 5} pts`}
                </span>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSubmit}
                  disabled={!message.trim() || sending || !user}
                  className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-6 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  {sending ? (isFr ? 'Envoi...' : 'Yira...') : (isFr ? 'Envoyer' : 'Yira')}
                </motion.button>
              </div>

              {!user && (
                <p className="text-amber-600 text-xs text-center">
                  {isFr ? '⚠️ Connectez-vous pour contribuer' : '⚠️ A doo kɑ sɔmburu yira'}
                </p>
              )}
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
