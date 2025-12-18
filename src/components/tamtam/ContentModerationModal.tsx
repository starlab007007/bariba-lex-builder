import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, Mic, Flag, Ban, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useModerationSystem, REPORT_REASONS, ReportReason } from '@/hooks/useModerationSystem';
import { SmartVoiceRecorder } from '@/components/voice/SmartVoiceRecorder';
import { triggerFeedback } from '@/utils/tamtamFeedback';

interface ContentModerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser?: {
    id: string;
    name: string;
    avatar?: string;
  };
  targetPostId?: string;
  targetCommentId?: string;
}

export function ContentModerationModal({
  isOpen,
  onClose,
  targetUser,
  targetPostId,
  targetCommentId
}: ContentModerationModalProps) {
  const { reportContent, blockUser, isReporting, isBlocking } = useModerationSystem();
  
  const [step, setStep] = useState<'action' | 'reason' | 'details' | 'voice'>('action');
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [voiceDetails, setVoiceDetails] = useState<string | null>(null);

  const handleReport = async () => {
    if (!selectedReason) return;
    
    const success = await reportContent(selectedReason, {
      userId: targetUser?.id,
      postId: targetPostId,
      commentId: targetCommentId,
      details: voiceDetails || details || undefined
    });
    
    if (success) {
      triggerFeedback('success');
      onClose();
      resetState();
    }
  };

  const handleBlock = async () => {
    if (!targetUser) return;
    
    const success = await blockUser(targetUser.id);
    if (success) {
      triggerFeedback('notification');
      onClose();
      resetState();
    }
  };

  const resetState = () => {
    setStep('action');
    setSelectedReason(null);
    setDetails('');
    setVoiceDetails(null);
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] bg-black/50 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[80vh] overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-400 to-orange-500 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold">Modération</h2>
              <p className="text-xs text-gray-500">Signaler ou bloquer</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Target User Info */}
        {targetUser && (
          <div className="p-4 bg-gray-50 flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={targetUser.avatar} />
              <AvatarFallback className="bg-gradient-to-br from-gray-400 to-gray-600 text-white">
                {targetUser.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{targetUser.name}</p>
              <p className="text-xs text-gray-500">
                {targetPostId ? 'Publication' : targetCommentId ? 'Commentaire' : 'Utilisateur'}
              </p>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[50vh]">
          <AnimatePresence mode="wait">
            {/* Step 1: Choose Action */}
            {step === 'action' && (
              <motion.div
                key="action"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-3"
              >
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setStep('reason')}
                  className="w-full p-4 bg-orange-50 hover:bg-orange-100 rounded-2xl flex items-center gap-4 transition-colors"
                >
                  <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                    <Flag className="h-6 w-6 text-orange-600" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-semibold text-orange-900">Signaler</p>
                    <p className="text-sm text-orange-700">Signaler ce contenu comme inapproprié</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-orange-400" />
                </motion.button>

                {targetUser && (
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={handleBlock}
                    disabled={isBlocking}
                    className="w-full p-4 bg-red-50 hover:bg-red-100 rounded-2xl flex items-center gap-4 transition-colors"
                  >
                    <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                      {isBlocking ? (
                        <Loader2 className="h-6 w-6 text-red-600 animate-spin" />
                      ) : (
                        <Ban className="h-6 w-6 text-red-600" />
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-semibold text-red-900">Bloquer</p>
                      <p className="text-sm text-red-700">Ne plus voir ce contenu</p>
                    </div>
                  </motion.button>
                )}
              </motion.div>
            )}

            {/* Step 2: Choose Reason */}
            {step === 'reason' && (
              <motion.div
                key="reason"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-2"
              >
                <p className="text-sm text-gray-600 mb-3">Pourquoi signalez-vous ce contenu ?</p>
                {REPORT_REASONS.map((reason) => (
                  <motion.button
                    key={reason.value}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setSelectedReason(reason.value);
                      setStep('details');
                    }}
                    className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all ${
                      selectedReason === reason.value
                        ? 'bg-blue-100 border-2 border-blue-500'
                        : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                    }`}
                  >
                    <span className="text-2xl">{reason.icon}</span>
                    <span className="font-medium">{reason.label}</span>
                  </motion.button>
                ))}
              </motion.div>
            )}

            {/* Step 3: Add Details */}
            {step === 'details' && (
              <motion.div
                key="details"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <p className="text-sm text-gray-600">
                  Ajoutez des détails (optionnel)
                </p>
                
                <div className="space-y-3">
                  <Textarea
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    placeholder="Décrivez le problème..."
                    className="min-h-[100px] rounded-xl"
                  />
                  
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span>ou</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setStep('voice')}
                      className="gap-2"
                    >
                      <Mic className="h-4 w-4" />
                      Enregistrer vocal
                    </Button>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setStep('reason')}
                    className="flex-1"
                  >
                    Retour
                  </Button>
                  <Button
                    onClick={handleReport}
                    disabled={isReporting}
                    className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                  >
                    {isReporting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Envoyer'
                    )}
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 4: Voice Recording */}
            {step === 'voice' && (
              <motion.div
                key="voice"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <p className="text-sm text-gray-600 text-center">
                  Enregistrez votre signalement vocal
                </p>
                
                <SmartVoiceRecorder
                  onRecordingComplete={(audio) => {
                    setVoiceDetails(audio);
                    handleReport();
                  }}
                  language="french"
                />
                
                <Button
                  variant="outline"
                  onClick={() => setStep('details')}
                  className="w-full"
                >
                  Retour au texte
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default ContentModerationModal;
