import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Volume2, VolumeX, Languages, Clock, MapPin, RefreshCw, MessageCircle, Share2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';
import { useBaribaTTS } from '@/hooks/useBaribaTTS';
import { useFrenchTTS } from '@/hooks/useFrenchTTS';
import { PostActionBar, PostActionType } from './PostActionBar';
import { KaraokeSubtitles } from './KaraokeSubtitles';
import { triggerFeedback } from '@/utils/tamtamFeedback';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

// Extended post type for Radio-Visual feed
export interface RadioVisualPost {
  id: string;
  user_id: string | null;
  audio_url: string;
  audio_narration_url?: string | null;
  audio_narration_ba_url?: string | null;
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
  topic?: string | null;
  template_id?: string | null;
  action_buttons?: any[];
  location_name?: string | null;
  response_to_post_id?: string | null;
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

interface RadioVisualFeedCardProps {
  post: RadioVisualPost;
  mode: 'radio' | 'discovery' | 'village' | 'learning';
  autoplayAudio?: boolean;
  isCurrentInRadio?: boolean;
  onAction: (action: PostActionType, postId: string, data?: any) => void;
  onRespond: (type: 'imitate' | 'voice_reply', postId: string) => void;
  onComment: (postId: string) => void;
  onShare: (postId: string) => void;
}

// Topic icons mapping
const TOPIC_ICONS: Record<string, string> = {
  agriculture: '🌾',
  health: '🏥',
  market: '🛒',
  culture: '🎭',
  education: '📚',
  village: '🏘️',
  general: '💬'
};

export const RadioVisualFeedCard: React.FC<RadioVisualFeedCardProps> = ({
  post,
  mode,
  autoplayAudio = false,
  isCurrentInRadio = false,
  onAction,
  onRespond,
  onComment,
  onShare
}) => {
  const { currentLang } = useTamTamLanguage();
  const { speak: speakBariba, isSpeaking: isSpeakingBa } = useBaribaTTS();
  const { speak: speakFrench, isSpeaking: isSpeakingFr } = useFrenchTTS();
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [showTranscript, setShowTranscript] = useState(mode === 'learning');
  const [audioLang, setAudioLang] = useState<'fr' | 'ba'>(currentLang === 'ba' ? 'ba' : 'fr');
  const [activeAction, setActiveAction] = useState<PostActionType | null>(null);
  
  const audioRef = useRef<HTMLAudioElement>(null);

  // Get transcript based on selected language
  const transcript = audioLang === 'ba' ? post.transcript_ba : post.transcript_fr;
  const duration = post.duration_seconds || 30;
  const topicIcon = TOPIC_ICONS[post.topic || 'general'] || '💬';

  // Handle autoplay for radio mode
  useEffect(() => {
    if (autoplayAudio && isCurrentInRadio && audioRef.current) {
      audioRef.current.play().catch(console.error);
      setIsPlaying(true);
    }
  }, [autoplayAudio, isCurrentInRadio]);

  // Audio time tracking
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const togglePlay = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(console.error);
    }
    setIsPlaying(!isPlaying);
    triggerFeedback('notification');
  };

  const handleLanguageSwitch = async () => {
    const newLang = audioLang === 'fr' ? 'ba' : 'fr';
    setAudioLang(newLang);
    triggerFeedback('notification');
    
    // Speak in the new language if we have transcript
    const textToSpeak = newLang === 'ba' ? post.transcript_ba : post.transcript_fr;
    if (textToSpeak) {
      if (newLang === 'ba') {
        await speakBariba(textToSpeak);
      } else {
        await speakFrench(textToSpeak);
      }
    }
  };

  const handleActionClick = (action: PostActionType) => {
    setActiveAction(action);
    triggerFeedback('notification');
    
    if (action === 'imitate' || action === 'voice_reply') {
      onRespond(action, post.id);
    } else {
      onAction(action, post.id);
    }
    
    // Reset active action after animation
    setTimeout(() => setActiveAction(null), 500);
  };

  const timeAgo = post.created_at 
    ? formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: fr })
    : '';

  // Get audio URL based on selected language
  const audioUrl = audioLang === 'ba' 
    ? (post.audio_narration_ba_url || post.audio_url)
    : (post.audio_narration_url || post.audio_url);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white rounded-3xl shadow-sm overflow-hidden border ${
        isCurrentInRadio ? 'border-orange-500 ring-2 ring-orange-200' : 'border-gray-100'
      }`}
    >
      {/* Hidden audio element */}
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      {/* ======= COUCHE 1: REGARDER (Watch) ======= */}
      <div className="relative">
        {/* Topic badge */}
        {post.topic && (
          <div className="absolute top-3 left-3 z-10 px-3 py-1 rounded-full bg-black/50 text-white text-sm font-medium flex items-center gap-1">
            <span>{topicIcon}</span>
            <span className="capitalize">{post.topic}</span>
          </div>
        )}

        {/* Radio mode indicator */}
        {isCurrentInRadio && (
          <motion.div 
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="absolute top-3 right-3 z-10 px-3 py-1 rounded-full bg-orange-500 text-white text-sm font-medium flex items-center gap-1"
          >
            <Volume2 className="w-4 h-4" />
            <span>EN DIRECT</span>
          </motion.div>
        )}

        {/* Media content */}
        {post.media_url ? (
          post.media_type === 'video' ? (
            <video
              src={post.media_url}
              className="w-full aspect-video object-cover"
              controls={false}
              muted
              loop
              playsInline
            />
          ) : (
            <img
              src={post.media_url.split(',')[0]}
              alt="Post media"
              className="w-full aspect-video object-cover"
            />
          )
        ) : (
          // Audio-only visual
          <div className="w-full aspect-video bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center">
            <motion.div
              animate={isPlaying ? { scale: [1, 1.2, 1] } : {}}
              transition={{ repeat: Infinity, duration: 0.5 }}
            >
              <Volume2 className="w-20 h-20 text-white/80" />
            </motion.div>
          </div>
        )}

        {/* Play/Pause overlay */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/20"
        >
          <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-xl">
            {isPlaying ? (
              <Pause className="w-8 h-8 text-gray-800" />
            ) : (
              <Play className="w-8 h-8 text-gray-800 ml-1" />
            )}
          </div>
        </motion.button>

        {/* Progress bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20">
          <motion.div 
            className="h-full bg-white"
            style={{ width: `${(currentTime / duration) * 100}%` }}
          />
        </div>
      </div>

      {/* ======= COUCHE 2: COMPRENDRE (Understand) ======= */}
      <div className="p-4">
        {/* User info & metadata */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10 border-2 border-gray-100">
              <AvatarImage src={post.profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white font-bold">
                {post.profile?.username?.[0]?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-gray-800">
                {post.profile?.display_name || post.profile?.username || 'Anonyme'}
              </p>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Clock className="w-3 h-3" />
                <span>{timeAgo}</span>
                {post.location_name && (
                  <>
                    <MapPin className="w-3 h-3 ml-1" />
                    <span>{post.location_name}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Language toggle */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleLanguageSwitch}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium ${
              audioLang === 'ba' 
                ? 'bg-orange-100 text-orange-600' 
                : 'bg-blue-100 text-blue-600'
            }`}
          >
            <Languages className="w-4 h-4" />
            <span>{audioLang === 'ba' ? 'Bariba' : 'Français'}</span>
          </motion.button>
        </div>

        {/* Karaoke subtitles (shown in learning mode or when toggled) */}
        <AnimatePresence>
          {(showTranscript || mode === 'learning') && transcript && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-gray-50 rounded-xl mb-3 overflow-hidden"
            >
              <KaraokeSubtitles
                text={transcript}
                currentTime={currentTime}
                duration={duration}
                isPlaying={isPlaying}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Show/hide transcript button */}
        {transcript && mode !== 'learning' && (
          <button
            onClick={() => setShowTranscript(!showTranscript)}
            className="text-sm text-blue-500 font-medium mb-3"
          >
            {showTranscript ? 'Masquer le texte' : 'Voir le texte'}
          </button>
        )}

        {/* Feeling emoji */}
        {post.feeling_emoji && (
          <div className="mb-3">
            <span className="text-2xl">{post.feeling_emoji}</span>
          </div>
        )}

        {/* ======= COUCHE 3: AGIR (Act) ======= */}
        <PostActionBar
          onAction={(action) => handleActionClick(action)}
          activeAction={activeAction}
          showContextual={!!post.action_buttons?.length}
          contextualActions={post.action_buttons?.map((b: any) => b.type) || []}
          size="md"
        />

        {/* ======= COUCHE 4: CRÉER/RÉPONDRE ======= */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
          {/* Respond/Imitate button */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => onRespond('imitate', post.id)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium text-sm"
          >
            <RefreshCw className="w-4 h-4" />
            <span>{currentLang === 'ba' ? 'Ṣe báyìí' : 'Refaire'}</span>
          </motion.button>

          {/* Quick actions */}
          <div className="flex items-center gap-2">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => onComment(post.id)}
              className="flex items-center gap-1 px-3 py-2 bg-gray-100 rounded-xl text-gray-600"
            >
              <MessageCircle className="w-4 h-4" />
              <span className="text-sm">{post.comments_count || 0}</span>
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => onShare(post.id)}
              className="flex items-center gap-1 px-3 py-2 bg-gray-100 rounded-xl text-gray-600"
            >
              <Share2 className="w-4 h-4" />
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
