import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Heart, MessageCircle, Share2, Volume2, VolumeX, Globe, Play, Pause, 
  Image, Video, Mic, BarChart3, MoreHorizontal, Bookmark, Loader2 
} from 'lucide-react';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { triggerFeedback, triggerReactionFeedback } from '@/utils/tamtamFeedback';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAudioServices } from '@/hooks/useAudioServices';
import BlockReportMenu from './BlockReportMenu';

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
  template_id?: string | null;
  topic?: string | null;
  location_name?: string | null;
  culture_score?: number | null;
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
  const audioServices = useAudioServices();
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [playingOptionId, setPlayingOptionId] = useState<string | null>(null);
  const [isSpeakingPost, setIsSpeakingPost] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const optionAudioRefs = useRef<Record<string, HTMLAudioElement>>({});

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
      .then(() => {
        setIsPlaying(true);
        triggerFeedback('record', { haptic: false });
      })
      .catch((err) => {
        console.warn('[TamTamEnhancedFeedCard] audio play failed:', err);
        setIsPlaying(false);
      });
  };

  // Read post aloud with TTS
  const handleReadPost = async () => {
    const textToRead = transcript || altTranscript;
    if (!textToRead) return;
    
    setIsSpeakingPost(true);
    triggerFeedback('record', { haptic: false });
    
    try {
      // Determine language and use appropriate TTS
      if (post.transcript_ba && (currentLang === 'ba' || !post.transcript_fr)) {
        await audioServices.speakBariba(post.transcript_ba);
      } else if (post.transcript_fr) {
        await audioServices.speakFrench(post.transcript_fr);
      }
    } catch (err) {
      console.error('[TamTamEnhancedFeedCard] TTS error:', err);
    } finally {
      setIsSpeakingPost(false);
    }
  };

  const handleTranslate = async () => {
    // Use ByT5 Expert for translation
    const textToTranslate = altTranscript || transcript;
    if (!textToTranslate) return;
    
    setIsTranslating(true);
    try {
      // Determine translation direction
      const hasBariba = !!post.transcript_ba;
      const hasFrench = !!post.transcript_fr;
      
      if (hasBariba && !hasFrench) {
        // Translate Bariba to French
        const result = await audioServices.translate(post.transcript_ba!, 'ba', 'fr');
        setTranslatedText(result);
      } else if (hasFrench && !hasBariba) {
        // Translate French to Bariba
        const result = await audioServices.translate(post.transcript_fr!, 'fr', 'ba');
        setTranslatedText(result);
      } else if (altTranscript) {
        // Fallback to context translation
        const from = currentLang === 'fr' ? 'ba' : 'fr';
        const to = currentLang;
        const result = await translateText(altTranscript, from, to);
        setTranslatedText(result);
      }
      
      triggerFeedback('success', { haptic: true, sound: false });
    } catch (err) {
      console.error('[TamTamEnhancedFeedCard] Translation error:', err);
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

    optionAudioRefs.current[optionId]
      .play()
      .then(() => setPlayingOptionId(optionId))
      .catch((err) => {
        console.warn('[TamTamEnhancedFeedCard] option audio play failed:', err);
        setPlayingOptionId(null);
      });
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
      className="feed-card-light overflow-hidden"
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
          <div className="flex flex-col">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              {getMediaIcon()}
              <span>
                {post.created_at && formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: fr })}
              </span>
            </div>
            {post.created_at && (
              <span className="text-xs text-gray-400">
                {new Date(post.created_at).toLocaleDateString('fr-FR', { 
                  day: 'numeric', 
                  month: 'short', 
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            )}
          </div>
        </div>
        {post.feeling_emoji && (
          <span className="text-2xl">{post.feeling_emoji}</span>
        )}
        {post.user_id && (
          <BlockReportMenu
            userId={post.user_id}
            postId={post.id}
            userName={post.profile?.display_name || post.profile?.username}
            trigger={
              <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <MoreHorizontal className="w-5 h-5 text-gray-500" />
              </button>
            }
          />
        )}
      </div>

      {/* Media Content - Support for multiple photos */}
      {post.media_type === 'photo' && post.media_url && (
        <div className="relative">
          {post.media_url.includes(',') ? (
            // Multiple photos - carousel style
            <div className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide">
              {post.media_url.split(',').map((url, idx) => (
                <div key={idx} className="flex-shrink-0 w-full snap-center">
                  <img 
                    src={url.trim()} 
                    alt={`Photo ${idx + 1}`} 
                    className="w-full max-h-96 object-cover"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          ) : (
            // Single photo
            <img 
              src={post.media_url} 
              alt="Post media" 
              className="w-full max-h-96 object-cover"
              loading="lazy"
            />
          )}
          
          {/* Photo count indicator for multiple photos */}
          {post.media_url.includes(',') && (
            <div className="absolute top-3 right-3 px-2 py-1 rounded-full bg-black/50 backdrop-blur-sm text-white text-xs font-medium">
              {post.media_url.split(',').length} photos
            </div>
          )}
          
          {/* Audio overlay button - only if audio exists */}
          {post.audio_url && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handlePlayPause}
              className="absolute bottom-4 right-4 w-14 h-14 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/20"
            >
              {isPlaying ? <Pause className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
            </motion.button>
          )}
        </div>
      )}

      {post.media_type === 'video' && post.media_url && (
        <div className="relative bg-black rounded-lg overflow-hidden">
          <video 
            src={post.media_url.split(',')[0]}
            poster={post.thumbnail_url || undefined}
            controls
            playsInline
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

      {/* Audio Player - Only show when audio exists */}
      {post.media_type !== 'poll' && post.audio_url && (
        <div className="px-4 py-3">
          <div className="audio-player-light flex items-center gap-3">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handlePlayPause}
              className="audio-play-button w-14 h-14 flex items-center justify-center"
            >
              {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
            </motion.button>
            
            {/* Waveform - Light colors */}
            <div className="flex-1 flex items-center gap-1 h-10">
              {Array.from({ length: 30 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="w-1 rounded-full"
                  style={{ background: 'linear-gradient(180deg, #4DA3FF 0%, #5DEBFF 100%)' }}
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

            <span className="text-sm text-gray-600 font-medium">
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

      {/* Transcript & Translation - Light Glass */}
      {(transcript || altTranscript) && (
        <div className="px-4 pb-2">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowTranscript(!showTranscript)}
              className="flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-full transition-colors"
              style={{ color: '#4DA3FF', background: 'rgba(77, 163, 255, 0.1)' }}
            >
              {showTranscript ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              {showTranscript ? 'Masquer' : 'Transcription'}
            </button>
            
            {/* TTS Read Button */}
            <button
              onClick={handleReadPost}
              disabled={isSpeakingPost || audioServices.isSpeaking}
              className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full disabled:opacity-50 transition-colors"
              style={{ color: '#10b981', background: 'rgba(16, 185, 129, 0.1)' }}
            >
              {isSpeakingPost ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
              Lire
            </button>
          </div>
          
          <AnimatePresence>
            {showTranscript && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-3 overflow-hidden"
              >
                <div className="rounded-2xl p-4" style={{ background: 'linear-gradient(135deg, rgba(77, 163, 255, 0.06) 0%, rgba(139, 124, 255, 0.06) 100%)', border: '1px solid rgba(77, 163, 255, 0.1)' }}>
                  <p className="text-gray-700 leading-relaxed">{transcript || altTranscript}</p>
                  
                  {altTranscript && (
                    <button
                      onClick={handleTranslate}
                      disabled={isTranslating}
                      className="mt-3 flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-full transition-colors"
                      style={{ color: '#8B7CFF', background: 'rgba(139, 124, 255, 0.1)' }}
                    >
                      <Globe className="w-4 h-4" />
                      {isTranslating ? 'Traduction...' : 'Traduire en ' + (currentLang === 'fr' ? 'Bariba' : 'Français')}
                    </button>
                  )}
                  
                  {translatedText && (
                    <div className="mt-3 pt-3 border-t border-gray-200/50">
                      <p className="text-gray-600 italic">{translatedText}</p>
                      {/* Read translation */}
                      <button
                        onClick={async () => {
                          if (currentLang === 'ba') {
                            await audioServices.speakFrench(translatedText);
                          } else {
                            await audioServices.speakBariba(translatedText);
                          }
                        }}
                        disabled={audioServices.isSpeaking}
                        className="mt-1 flex items-center gap-1 text-xs text-blue-500"
                      >
                        <Volume2 className="w-3 h-3" />
                        Écouter
                      </button>
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
