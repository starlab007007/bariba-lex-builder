import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Pause, Globe, Mic } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { TamTamComment } from '@/hooks/useTamTamPosts';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';
import { SmartVoiceRecorder } from '@/components/voice/SmartVoiceRecorder';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface TamTamCommentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  comments: TamTamComment[];
  onAddComment: (audioBase64: string, duration: number) => Promise<void>;
  isLoading: boolean;
}

export const TamTamCommentsModal: React.FC<TamTamCommentsModalProps> = ({
  isOpen,
  onClose,
  comments,
  onAddComment,
  isLoading
}) => {
  const { currentLang, translateText, t } = useTamTamLanguage();
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [showRecorder, setShowRecorder] = useState(false);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const audioRefs = useRef<Record<string, HTMLAudioElement>>({});

  const handlePlay = (commentId: string, audioUrl: string) => {
    // Stop current playing
    if (playingId && audioRefs.current[playingId]) {
      audioRefs.current[playingId].pause();
      audioRefs.current[playingId].currentTime = 0;
    }

    if (playingId === commentId) {
      setPlayingId(null);
      return;
    }

    if (!audioRefs.current[commentId]) {
      audioRefs.current[commentId] = new Audio(audioUrl);
      audioRefs.current[commentId].onended = () => setPlayingId(null);
    }

    audioRefs.current[commentId].play();
    setPlayingId(commentId);
  };

  const handleTranslate = async (comment: TamTamComment) => {
    const sourceText = currentLang === 'fr' ? comment.transcript_ba : comment.transcript_fr;
    if (!sourceText || translations[comment.id]) return;

    const from = currentLang === 'fr' ? 'ba' : 'fr';
    const result = await translateText(sourceText, from, currentLang);
    setTranslations(prev => ({ ...prev, [comment.id]: result }));
  };

  const handleRecordingComplete = async (audioBase64: string) => {
    setShowRecorder(false);
    // Estimate duration from base64 length (rough approximation)
    const estimatedDuration = Math.round(audioBase64.length / 10000);
    await onAddComment(audioBase64, estimatedDuration);
  };

  useEffect(() => {
    // Cleanup audio refs on unmount
    return () => {
      Object.values(audioRefs.current).forEach(audio => {
        audio.pause();
      });
    };
  }, []);

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-lg bg-white rounded-t-3xl max-h-[80vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800">
            {t('audioComments')} ({comments.length})
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {comments.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Mic className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>{t('noComments')}</p>
              <p className="text-sm mt-1">{t('addComment')}</p>
            </div>
          ) : (
            comments.map(comment => {
              const transcript = currentLang === 'fr' ? comment.transcript_fr : comment.transcript_ba;
              const hasAltTranscript = currentLang === 'fr' ? comment.transcript_ba : comment.transcript_fr;
              
              return (
                <motion.div
                  key={comment.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex gap-3"
                >
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={comment.profile?.avatar_url || ''} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-400 to-blue-600 text-white">
                      {comment.profile?.display_name?.[0] || '?'}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-800 text-sm">
                        {comment.profile?.display_name || comment.profile?.username}
                      </span>
                      <span className="text-xs text-gray-400">
                        {comment.created_at && formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: fr })}
                      </span>
                    </div>

                    {/* Audio Bubble */}
                    <div className="bg-gradient-to-r from-blue-50 to-emerald-50 rounded-2xl p-3 inline-flex items-center gap-3 max-w-[250px]">
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handlePlay(comment.id, comment.audio_url)}
                        className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white flex-shrink-0"
                      >
                        {playingId === comment.id ? (
                          <Pause className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4 ml-0.5" />
                        )}
                      </motion.button>

                      <div className="flex-1 flex items-center gap-0.5">
                        {Array.from({ length: 15 }).map((_, i) => (
                          <motion.div
                            key={i}
                            className="w-0.5 bg-blue-400 rounded-full"
                            animate={{
                              height: playingId === comment.id ? [4, 12 + Math.random() * 8, 4] : 4
                            }}
                            transition={{
                              duration: 0.4,
                              repeat: playingId === comment.id ? Infinity : 0,
                              delay: i * 0.03
                            }}
                          />
                        ))}
                      </div>

                      <span className="text-xs text-gray-500">
                        {comment.duration_seconds ? `${comment.duration_seconds}s` : ''}
                      </span>
                    </div>

                    {/* Transcript */}
                    {transcript && (
                      <p className="text-sm text-gray-600 mt-1 ml-1">{transcript}</p>
                    )}

                    {/* Translate button */}
                    {hasAltTranscript && !translations[comment.id] && (
                      <button
                        onClick={() => handleTranslate(comment)}
                        className="flex items-center gap-1 text-xs text-emerald-500 mt-1 ml-1"
                      >
                        <Globe className="w-3 h-3" />
                        {t('translate')}
                      </button>
                    )}

                    {translations[comment.id] && (
                      <p className="text-sm text-gray-500 italic mt-1 ml-1">
                        {translations[comment.id]}
                      </p>
                    )}
                  </div>
                </motion.div>
              );
            })
          )}
        </div>

        {/* Add Comment */}
        <div className="p-4 border-t border-gray-100">
          <AnimatePresence mode="wait">
            {showRecorder ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
              >
              <SmartVoiceRecorder
                onRecordingComplete={handleRecordingComplete}
                language="bariba"
              />
              </motion.div>
            ) : (
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowRecorder(true)}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 rounded-2xl font-medium"
              >
                <Mic className="w-5 h-5" />
                {isLoading ? t('loading') : t('addComment')}
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
};
