/**
 * DraftPromptModal.tsx
 * Modal pour proposer la restauration d'un brouillon récent
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Plus, Clock, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CreatorDraft } from '@/hooks/useCreatorDraft';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface DraftPromptModalProps {
  isOpen: boolean;
  drafts: CreatorDraft[];
  onRestoreDraft: (draftId: string) => void;
  onStartNew: () => void;
  onDeleteDraft?: (draftId: string) => void;
  onClose: () => void;
}

export const DraftPromptModal: React.FC<DraftPromptModalProps> = ({
  isOpen,
  drafts,
  onRestoreDraft,
  onStartNew,
  onDeleteDraft,
  onClose
}) => {
  if (!isOpen || drafts.length === 0) return null;

  const mostRecentDraft = drafts[0];
  const hasMultipleDrafts = drafts.length > 1;

  const formatDraftTime = (timestamp: number) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true, locale: fr });
    } catch {
      return 'récemment';
    }
  };

  const getDraftPreview = (draft: CreatorDraft) => {
    if (draft.caption) return draft.caption.slice(0, 50) + (draft.caption.length > 50 ? '...' : '');
    if (draft.segments?.length) return `${draft.segments.length} segment(s)`;
    if (draft.transcript) return draft.transcript.slice(0, 50) + '...';
    return 'Brouillon sans titre';
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="bg-gradient-to-b from-card to-background rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.1 }}
              className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary/20 to-cyan-500/20 flex items-center justify-center"
            >
              <FileText className="w-10 h-10 text-primary" />
            </motion.div>

            {/* Title */}
            <h3 className="text-xl font-bold text-center mb-2 text-foreground">
              Brouillon disponible
            </h3>

            {/* Subtitle */}
            <p className="text-muted-foreground text-sm text-center mb-6">
              Tu as un projet en cours. Veux-tu le reprendre ?
            </p>

            {/* Draft preview card */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-white/5 rounded-xl p-4 mb-6 border border-white/10"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground font-medium truncate">
                    {getDraftPreview(mostRecentDraft)}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>{formatDraftTime(mostRecentDraft.timestamp)}</span>
                  </div>
                </div>
                {onDeleteDraft && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-red-400 shrink-0"
                    onClick={() => onDeleteDraft(mostRecentDraft.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </motion.div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 h-12"
                onClick={onStartNew}
              >
                <Plus className="w-4 h-4 mr-2" />
                Nouveau
              </Button>

              <Button
                className="flex-1 h-12 bg-gradient-to-r from-primary to-cyan-500 hover:from-primary/90 hover:to-cyan-500/90"
                onClick={() => onRestoreDraft(mostRecentDraft.id)}
              >
                Reprendre
              </Button>
            </div>

            {/* Multiple drafts hint */}
            {hasMultipleDrafts && (
              <p className="text-xs text-center text-muted-foreground mt-4">
                {drafts.length} brouillons disponibles
              </p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default DraftPromptModal;
