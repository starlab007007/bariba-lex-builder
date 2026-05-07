import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, Share2, Volume2, VolumeX, Globe, Play, Pause, Image, Video, Mic, Loader2, StopCircle } from 'lucide-react';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';
import { TamTamPost } from '@/hooks/useTamTamPosts';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useFrenchTTS } from '@/hooks/useFrenchTTS';

interface TamTamFeedCardProps {
  post: TamTamPost;
  onReaction: (postId: string, reaction: string) => void;
  onComment: (postId: string) => void;
  onShare: (postId: string) => void;
}

const reactionEmojis = [
  { type: 'like', emoji: '👍', sound: '/sounds/like.mp3' },
  { type: 'love', emoji: '❤️', sound: '/sounds/love.mp3' },
  { type: 'laugh', emoji: '😂', sound: '/sounds/laugh.mp3' },
  { type: 'wow', emoji: '😮', sound: '/sounds/wow.mp3' },
  { type: 'pray', emoji: '🙏', sound: '/sounds/pray.mp3' },
];

export const TamTamFeedCard: React.FC<TamTamFeedCardProps> = ({
  post,
  onReaction,
  onComment,
  onShare
}) => {
  const { currentLang, translateText, t } = useTamTamLanguage();
  const [isPlaying, setIsPlaying] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  // TTS for reading transcript
  const { speak: speakFrench, stop: stopFrench, isSpeaking: isFrenchSpeaking, isSupported: isTTSSupported } = useFrenchTTS();

  const transcript = currentLang === 'fr' ? post.transcript_fr : post.transcript_ba;
  const altTranscript = currentLang === 'fr' ? post.transcript_ba : post.transcript_fr;

  const handlePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }

    audioRef.current
      .play()
      .then(() => setIsPlaying(true))
      .catch((err) => {
        console.warn('[TamTamFeedCard] audio play failed:', err);
        setIsPlaying(false);
      });
  };

  const handleTranslate = async () => {
    if (!altTranscript) return;
    
    setIsTranslating(true);
    try {
      const from = currentLang === 'fr' ? 'ba' : 'fr';
      const to = currentLang;
      const result = await translateText(altTranscript, from, to);
      setTranslatedText(result);
    } finally {
      setIsTranslating(false);
    }
  };

  // Handle reading transcript aloud (TTS)
  const handleReadTranscript = useCallback(() => {
    const textToRead = transcript || altTranscript;
    if (!textToRead) return;

    if (isFrenchSpeaking) {
      stopFrench();
    } else {
      // Only French TTS is supported currently
      if (currentLang === 'fr' && isTTSSupported) {
        speakFrench(textToRead);
      } else if (post.transcript_fr && isTTSSupported) {
        // Try to read the French version if available
        speakFrench(post.transcript_fr);
      } else {
        console.warn('[TamTamFeedCard] TTS not supported or no French transcript');
      }
    }
  }, [transcript, altTranscript, isFrenchSpeaking, stopFrench, speakFrench, currentLang, isTTSSupported, post.transcript_fr]);

  const handleReaction = (type: string) => {
    // Haptic feedback
    if (navigator.vibrate) navigator.vibrate(50);
    onReaction(post.id, type);
    setShowReactions(false);
  };

  const totalReactions = post.reactions 
    ? Object.values(post.reactions).reduce((a, b) => a + b, 0)
    : (post.likes_count || 0);

  const getMediaIcon = () => {
    switch (post.media_type) {
      case 'photo': return <Image className="w-4 h-4" />;
      case 'video': return <Video className="w-4 h-4" />;
      default: return <Mic className="w-4 h-4" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] overflow-hidden mb-4"
    >
      {/* Header */}
      <div className="flex items-center gap-3 p-4">
        <Avatar className="w-12 h-12 ring-2 ring-blue-100">
          <AvatarImage src={post.profile?.avatar_url || ''} />
          <AvatarFallback className="bg-gradient-to-br from-blue-400 to-blue-600 text-white">
            {post.profile?.display_name?.[0] || post.profile?.username?.[0] || '?'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <p className="font-semibold text-gray-800">
            {post.profile?.display_name || post.profile?.username || 'Utilisateur'}
          </p>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            {getMediaIcon()}
            <span>
              {post.created_at && formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: fr })}
            </span>
          </div>
        </div>
        {post.feeling_emoji && (
          <span className="text-2xl">{post.feeling_emoji}</span>
        )}
      </div>

      {/* Media Content */}
      {post.media_type === 'photo' && post.media_url && (
        <div className="relative">
          <img 
            src={post.media_url} 
            alt="Post media" 
            className="w-full max-h-96 object-cover"
          />
        </div>
      )}

      {post.media_type === 'video' && post.media_url && (
        <div className="relative bg-black">
          <video 
            src={post.media_url}
            poster={post.thumbnail_url || undefined}
            controls
            className="w-full max-h-96"
          />
        </div>
      )}

      {/* Audio Player - Only show when audio exists */}
      {post.audio_url && (
      <div className="px-4 py-3">
        <div className="flex items-center gap-3 bg-gradient-to-r from-blue-50 to-emerald-50 rounded-2xl p-3">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handlePlayPause}
            className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white shadow-lg"
          >
            {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
          </motion.button>
          
          {/* Waveform visualization */}
          <div className="flex-1 flex items-center gap-1 h-10">
            {Array.from({ length: 30 }).map((_, i) => (
              <motion.div
                key={i}
                className="w-1 bg-blue-400 rounded-full"
                animate={{
                  height: isPlaying ? [8, 20 + Math.random() * 20, 8] : 8
                }}
                transition={{
                  duration: 0.5,
                  repeat: isPlaying ? Infinity : 0,
                  delay: i * 0.05
                }}
              />
            ))}
          </div>

          <span className="text-sm text-gray-500 font-medium">
            {post.duration_seconds ? `${Math.floor(post.duration_seconds / 60)}:${(post.duration_seconds % 60).toString().padStart(2, '0')}` : '0:00'}
          </span>
        </div>
        
        <audio 
          ref={audioRef} 
          src={post.audio_url} 
          onEnded={() => setIsPlaying(false)}
        />
      </div>
      )}

      {/* Transcript Toggle + Read Button */}
      {(transcript || altTranscript) && (
        <div className="px-4 pb-2">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowTranscript(!showTranscript)}
              className="flex items-center gap-2 text-sm text-blue-500 font-medium"
            >
              {showTranscript ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              {showTranscript ? t('hideTranscription') : t('showTranscription')}
            </button>
            
            {/* Read aloud button (TTS) */}
            {isTTSSupported && (transcript || post.transcript_fr) && (
              <button
                onClick={handleReadTranscript}
                className={`flex items-center gap-2 text-sm font-medium ${
                  isFrenchSpeaking ? 'text-red-500' : 'text-emerald-500'
                }`}
              >
                {isFrenchSpeaking ? (
                  <>
                    <StopCircle className="w-4 h-4" />
                    Arrêter
                  </>
                ) : (
                  <>
                    <Volume2 className="w-4 h-4" />
                    Lire
                  </>
                )}
              </button>
            )}
          </div>
          
          <AnimatePresence>
            {showTranscript && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-2 overflow-hidden"
              >
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-gray-700">{transcript || altTranscript}</p>
                  
                  {altTranscript && (
                    <button
                      onClick={handleTranslate}
                      disabled={isTranslating}
                      className="mt-2 flex items-center gap-2 text-sm text-emerald-500 font-medium"
                    >
                      <Globe className="w-4 h-4" />
                      {isTranslating ? t('transcribing') : t('translate')}
                    </button>
                  )}
                  
                  {translatedText && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <p className="text-gray-600 italic">{translatedText}</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Reactions Summary */}
      {totalReactions > 0 && (
        <div className="px-4 py-2 flex items-center gap-2">
          <div className="flex -space-x-1">
            {post.reactions && Object.entries(post.reactions)
              .filter(([_, count]) => count > 0)
              .slice(0, 3)
              .map(([type]) => (
                <span key={type} className="text-lg">
                  {reactionEmojis.find(r => r.type === type)?.emoji}
                </span>
              ))}
          </div>
          <span className="text-sm text-gray-500">{totalReactions}</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-around border-t border-gray-100 py-2">
        {/* Like with long press for reactions */}
        <div className="relative">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => handleReaction('like')}
            onContextMenu={(e) => {
              e.preventDefault();
              setShowReactions(!showReactions);
            }}
            className="flex items-center gap-2 px-4 py-2 text-gray-500 hover:text-red-500 transition-colors"
          >
            <Heart className="w-6 h-6" />
          </motion.button>
          
          <AnimatePresence>
            {showReactions && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                className="absolute bottom-full left-0 mb-2 flex gap-1 bg-white rounded-full shadow-lg p-2"
              >
                {reactionEmojis.map((reaction) => (
                  <motion.button
                    key={reaction.type}
                    whileHover={{ scale: 1.3 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleReaction(reaction.type)}
                    className="text-2xl p-1 hover:bg-gray-100 rounded-full"
                  >
                    {reaction.emoji}
                  </motion.button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => onComment(post.id)}
          className="flex items-center gap-2 px-4 py-2 text-gray-500 hover:text-blue-500 transition-colors"
        >
          <MessageCircle className="w-6 h-6" />
          {post.comments_count ? <span className="text-sm">{post.comments_count}</span> : null}
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => onShare(post.id)}
          className="flex items-center gap-2 px-4 py-2 text-gray-500 hover:text-emerald-500 transition-colors"
        >
          <Share2 className="w-6 h-6" />
        </motion.button>
      </div>
    </motion.div>
  );
};
