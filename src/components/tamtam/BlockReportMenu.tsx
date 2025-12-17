import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Ban, Flag, X, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useUserBlocking } from '@/hooks/useUserBlocking';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const REPORT_REASONS = [
  { id: 'spam', label: '🚫 Spam', icon: '🚫' },
  { id: 'harassment', label: '😠 Harcèlement', icon: '😠' },
  { id: 'hate_speech', label: '🗣️ Discours haineux', icon: '🗣️' },
  { id: 'inappropriate', label: '🔞 Contenu inapproprié', icon: '🔞' },
  { id: 'violence', label: '⚔️ Violence', icon: '⚔️' },
  { id: 'misinformation', label: '📰 Fausse information', icon: '📰' },
  { id: 'other', label: '❓ Autre', icon: '❓' },
];

interface BlockReportMenuProps {
  userId: string;
  postId?: string;
  commentId?: string;
  userName?: string;
  trigger?: React.ReactNode;
  onBlock?: () => void;
  onReport?: () => void;
}

export default function BlockReportMenu({
  userId,
  postId,
  commentId,
  userName,
  trigger,
  onBlock,
  onReport
}: BlockReportMenuProps) {
  const { blockUser, isBlocked, unblockUser, reportContent } = useUserBlocking();
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [reportDetails, setReportDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const userIsBlocked = isBlocked(userId);

  const handleBlock = async () => {
    if (userIsBlocked) {
      await unblockUser(userId);
    } else {
      await blockUser(userId);
    }
    onBlock?.();
  };

  const handleReport = async () => {
    if (!selectedReason) return;

    setIsSubmitting(true);
    await reportContent(selectedReason, reportDetails, {
      userId,
      postId,
      commentId
    });
    setIsSubmitting(false);
    setShowReportModal(false);
    setSelectedReason(null);
    setReportDetails('');
    onReport?.();
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {trigger || (
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <AlertTriangle className="w-4 h-4" />
            </Button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={handleBlock} className="gap-2">
            <Ban className="w-4 h-4" />
            {userIsBlocked ? 'Débloquer' : 'Bloquer'} {userName || 'cet utilisateur'}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowReportModal(true)} className="gap-2 text-destructive">
            <Flag className="w-4 h-4" />
            Signaler
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Report Modal */}
      <AnimatePresence>
        {showReportModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center sm:items-center p-4"
            onClick={() => setShowReportModal(false)}
          >
            <motion.div
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              className="bg-card rounded-3xl w-full max-w-md p-6 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Flag className="w-5 h-5 text-destructive" />
                  Signaler un contenu
                </h3>
                <Button variant="ghost" size="icon" onClick={() => setShowReportModal(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <p className="text-sm text-muted-foreground">
                Pourquoi signalez-vous ce contenu ?
              </p>

              <div className="grid grid-cols-2 gap-2">
                {REPORT_REASONS.map((reason) => (
                  <Button
                    key={reason.id}
                    variant={selectedReason === reason.id ? 'default' : 'outline'}
                    size="sm"
                    className="justify-start"
                    onClick={() => setSelectedReason(reason.id)}
                  >
                    {reason.label}
                  </Button>
                ))}
              </div>

              <Textarea
                placeholder="Détails supplémentaires (optionnel)"
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                rows={3}
              />

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowReportModal(false)}
                >
                  Annuler
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={handleReport}
                  disabled={!selectedReason || isSubmitting}
                >
                  {isSubmitting ? 'Envoi...' : 'Signaler'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
