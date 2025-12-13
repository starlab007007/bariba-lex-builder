import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Heart, MessageCircle, Share2, Volume2, VolumeX, Globe, Play, Pause, 
  Image, Video, Mic, BarChart3, MoreHorizontal, Bookmark 
} from 'lucide-react';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { triggerFeedback, triggerReactionFeedback } from '@/utils/tamtamFeedback';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

export interface EnhancedPost {
  id: string;
  user_id: string | null;
  audio_url: string;
  media_type: string;
  media_url: string | null;
  thumbnail_url: string | null;
  transcript_fr: string | null;
  transcript_ba: string | null;
  feeling_emoji: string | null;
  likes_count: number | null;
  comments_count: number | null;
  shares_count: number | null;
  duration_seconds: number | null;
  created_at: string | null;
  // Poll data
  poll_options?: { id: string; audio_url: string; votes: number; transcript?: string }[];
  poll_total_votes?: number;
  user_voted_option?: string;
  profile?: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
  reactions?: {
    like: number;
    love: number;
    laugh: number;
    wow: number;
    pray: number;
  };
}

interface TamTamEnhancedFeedCardProps {
  post: EnhancedPost;
  onReaction: (postId: string, reaction: string) => void;
  onComment: (postId: string) => void;
  onShare: (postId: string) => void;
  onVote?: (postId: string, optionId: string) => void;
}

const reactionEmojis = [
  { type: 'like', emoji: '👍' },
  { type: 'love', emoji: '❤️' },
  { type: 'laugh', emoji: '😂' },
  { type: 'wow', emoji: '😮' },
  { type: 'pray', emoji: '🙏' },
];

export const TamTamEnhancedFeedCard: React.FC<TamTamEnhancedFeedCardProps> = ({
  post,
  onReaction,
  onComment,
  onShare,
  onVote
}) => {
  const { currentLang, translateText, t } = useTamTamLanguage();
  const [isPlaying, setIsPlaying] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [playingOptionId, setPlayingOptionId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const optionAudioRefs = useRef<Record<string, HTMLAudioElement>>({});

  const transcript = currentLang === 'fr' ? post.transcript_fr : post.transcript_ba;
  const altTranscript = currentLang === 'fr' ? post.transcript_ba : post.transcript_fr;

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
        triggerFeedback('record', { haptic: false });
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTranslate = async () => {
    // Use ByT5 Expert for translation
    const textToTranslate = altTranscript || transcript;
    if (!textToTranslate) return;
    
    setIsTranslating(true);
    try {
      const { byT5TranslationService } = await import('@/services/ByT5TranslationService');
      
      // Determine translation direction
      const hasBariba = !!post.transcript_ba;
      const hasFrench = !!post.transcript_fr;
      
      if (hasBariba && !hasFrench) {
        // Translate Bariba to French
        const result = await byT5TranslationService.translate(
          post.transcript_ba!,
          'bariba',
          'french'
        );
        setTranslatedText(result.translation);
      } else if (hasFrench && !hasBariba) {
        // Translate French to Bariba
        const result = await byT5TranslationService.translate(
          post.transcript_fr!,
          'french',
          'bariba'
        );
        setTranslatedText(result.translation);
      } else if (altTranscript) {
        // Fallback to context translation
        const from = currentLang === 'fr' ? 'ba' : 'fr';
        const to = currentLang;
        const result = await translateText(altTranscript, from, to);
        setTranslatedText(result);
      }
      
      triggerFeedback('success', { haptic: true, sound: false });
    } catch (err) {
      console.error('[TamTamEnhancedFeedCard] ByT5 translation error:', err);
      // Fallback to context translation
      if (altTranscript) {
        const from = currentLang === 'fr' ? 'ba' : 'fr';
        const to = currentLang;
        const result = await translateText(altTranscript, from, to);
        setTranslatedText(result);
      }
    } finally {
      setIsTranslating(false);
    }
  };

  const handleReaction = (type: string) => {
    triggerReactionFeedback(type);
    onReaction(post.id, type);
    setShowReactions(false);
  };

  const handleVote = (optionId: string) => {
    if (onVote && !post.user_voted_option) {
      triggerFeedback('success');
      onVote(post.id, optionId);
    }
  };

  const playOptionAudio = (optionId: string, audioUrl: string) => {
    // Stop current
    if (playingOptionId && optionAudioRefs.current[playingOptionId]) {
      optionAudioRefs.current[playingOptionId].pause();
    }

    if (playingOptionId === optionId) {
      setPlayingOptionId(null);
      return;
    }

    if (!optionAudioRefs.current[optionId]) {
      optionAudioRefs.current[optionId] = new Audio(audioUrl);
      optionAudioRefs.current[optionId].onended = () => setPlayingOptionId(null);
    }

    optionAudioRefs.current[optionId].play();
    setPlayingOptionId(optionId);
  };

  const totalReactions = post.reactions 
    ? Object.values(post.reactions).reduce((a, b) => a + b, 0)
    : (post.likes_count || 0);

  const getMediaIcon = () => {
    switch (post.media_type) {
      case 'photo': return <Image className="w-4 h-4" />;
      case 'video': return <Video className="w-4 h-4" />;
      case 'poll': return <BarChart3 className="w-4 h-4" />;
      default: return <Mic className="w-4 h-4" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] overflow-hidden"
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
        <button className="p-2 hover:bg-gray-100 rounded-full">
          <MoreHorizontal className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      {/* Media Content */}
      {post.media_type === 'photo' && post.media_url && (
        <div className="relative">
          <img 
            src={post.media_url} 
            alt="Post media" 
            className="w-full max-h-96 object-cover"
          />
          {/* Audio overlay button */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handlePlayPause}
            className="absolute bottom-4 right-4 w-14 h-14 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white"
          >
            {isPlaying ? <Pause className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
          </motion.button>
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

      {/* Poll Display */}
      {post.media_type === 'poll' && post.poll_options && (
        <div className="px-4 py-3 space-y-2">
          <div className="flex items-center gap-2 text-orange-600 font-medium mb-3">
            <BarChart3 className="w-5 h-5" />
            <span>Sondage Vocal</span>
          </div>
          
          {post.poll_options.map((option, idx) => {
            const percentage = post.poll_total_votes 
              ? Math.round((option.votes / post.poll_total_votes) * 100) 
              : 0;
            const isVoted = post.user_voted_option === option.id;
            
            return (
              <motion.button
                key={option.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleVote(option.id)}
                disabled={!!post.user_voted_option}
                className={`w-full relative overflow-hidden rounded-xl p-3 transition-all ${
                  isVoted 
                    ? 'bg-blue-100 ring-2 ring-blue-500' 
                    : 'bg-gray-50 hover:bg-gray-100'
                }`}
              >
                {/* Progress bar */}
                {post.user_voted_option && (
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    className="absolute left-0 top-0 bottom-0 bg-blue-200/50"
                  />
                )}
                
                <div className="relative flex items-center gap-3">
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      playOptionAudio(option.id, option.audio_url);
                    }}
                    className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm"
                  >
                    {playingOptionId === option.id ? (
                      <Pause className="w-4 h-4 text-blue-600" />
                    ) : (
                      <Play className="w-4 h-4 text-blue-600 ml-0.5" />
                    )}
                  </motion.button>
                  
                  <div className="flex-1 text-left">
                    <span className="font-medium text-gray-700">Option {idx + 1}</span>
                    {option.transcript && (
                      <p className="text-sm text-gray-500 truncate">{option.transcript}</p>
                    )}
                  </div>
                  
                  {post.user_voted_option && (
                    <span className="text-sm font-medium text-blue-600">{percentage}%</span>
                  )}
                </div>
              </motion.button>
            );
          })}
          
          {post.poll_total_votes !== undefined && (
            <p className="text-center text-sm text-gray-400 mt-2">
              {post.poll_total_votes} vote{post.poll_total_votes !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      )}

      {/* Audio Player - For non-poll posts */}
      {post.media_type !== 'poll' && (
        <div className="px-4 py-3">
          <div className="flex items-center gap-3 bg-gradient-to-r from-blue-50 to-emerald-50 rounded-2xl p-3">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handlePlayPause}
              className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white shadow-lg"
            >
              {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
            </motion.button>
            
            {/* Waveform */}
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

      {/* Transcript & Translation */}
      {(transcript || altTranscript) && (
        <div className="px-4 pb-2">
          <button
            onClick={() => setShowTranscript(!showTranscript)}
            className="flex items-center gap-2 text-sm text-blue-500 font-medium"
          >
            {showTranscript ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            {showTranscript ? 'Masquer' : 'Voir transcription'}
          </button>
          
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
                      {isTranslating ? 'Traduction...' : 'Traduire'}
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
        {/* Reactions */}
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
          onClick={() => {
            triggerFeedback('notification', { haptic: true, sound: false });
            onComment(post.id);
          }}
          className="flex items-center gap-2 px-4 py-2 text-gray-500 hover:text-blue-500 transition-colors"
        >
          <MessageCircle className="w-6 h-6" />
          {post.comments_count ? <span className="text-sm">{post.comments_count}</span> : null}
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => {
            triggerFeedback('send');
            onShare(post.id);
          }}
          className="flex items-center gap-2 px-4 py-2 text-gray-500 hover:text-emerald-500 transition-colors"
        >
          <Share2 className="w-6 h-6" />
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.9 }}
          className="flex items-center gap-2 px-4 py-2 text-gray-500 hover:text-amber-500 transition-colors"
        >
          <Bookmark className="w-6 h-6" />
        </motion.button>
      </div>
    </motion.div>
  );
};
