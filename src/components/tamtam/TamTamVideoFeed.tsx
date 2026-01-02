import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { 
  Heart, Mic, Share2, Bookmark, Play, Pause, 
  MessageCircle, RefreshCw, Volume2, VolumeX,
  MoreHorizontal, Flag, Download
} from 'lucide-react';
import { useFrenchTTS } from '@/hooks/useFrenchTTS';
import { triggerFeedback } from '@/utils/tamtamFeedback';
import { cn } from '@/lib/utils';

// Topic icons for visual categorization
const TOPIC_ICONS: Record<string, string> = {
  agriculture: '🌾',
  sante: '🩺',
  education: '📚',
  marche: '🛒',
  culture: '🎭',
  religion: '🕌',
  humour: '😂',
  musique: '🎵',
  conte: '📖',
  default: '🎬'
};

interface VideoPost {
  id: string;
  media_url: string;
  audio_url?: string;
  thumbnail_url?: string | null;
  transcript_fr?: string | null;
  transcript_ba?: string | null;
  template_id?: string | null;
  topic?: string | null;
  duration_seconds?: number | null;
  user?: {
    display_name?: string;
    avatar_url?: string;
    username?: string;
  };
  likes_count?: number;
  comments_count?: number;
  shares_count?: number;
  created_at: string;
}

interface TamTamVideoFeedProps {
  posts: VideoPost[];
  onLike?: (postId: string) => void;
  onComment?: (postId: string) => void;
  onShare?: (postId: string) => void;
  onRemix?: (postId: string) => void;
  onSave?: (postId: string) => void;
  onRespond?: (postId: string) => void;
}

// Video Card Component
const VideoCard: React.FC<{
  post: VideoPost;
  isActive: boolean;
  onLike: () => void;
  onComment: () => void;
  onShare: () => void;
  onRemix: () => void;
  onSave: () => void;
  onRespond: () => void;
}> = ({ post, isActive, onLike, onComment, onShare, onRemix, onSave, onRespond }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showOptions, setShowOptions] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [hasPlayedIntro, setHasPlayedIntro] = useState(false);

  const { speak, isSpeaking } = useFrenchTTS();
  const topicIcon = TOPIC_ICONS[post.topic || 'default'] || TOPIC_ICONS.default;

  // Auto-play with TTS intro when active
  useEffect(() => {
    if (isActive && videoRef.current) {
      // Play short TTS intro
      if (!hasPlayedIntro) {
        const introText = post.topic 
          ? `${post.topic}${post.user?.display_name ? ` par ${post.user.display_name}` : ''}`
          : `Vidéo${post.user?.display_name ? ` de ${post.user.display_name}` : ''}`;
        
        speak(introText);
        setHasPlayedIntro(true);
        // Start video after brief TTS delay
        const timer = setTimeout(() => {
          videoRef.current?.play().catch(console.error);
          setIsPlaying(true);
        }, 1200);
        return () => clearTimeout(timer);
      } else {
        videoRef.current.play().catch(console.error);
        setIsPlaying(true);
      }
    } else if (!isActive && videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  }, [isActive, hasPlayedIntro, speak, post.topic, post.user]);

  // Video event handlers
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      const prog = (video.currentTime / video.duration) * 100;
      setProgress(prog);
    };

    const handleEnded = () => {
      video.currentTime = 0;
      video.play().catch(console.error);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('ended', handleEnded);
    };
  }, []);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch(console.error);
      setIsPlaying(true);
    }
    triggerFeedback('notification');
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
    triggerFeedback('notification');
  };

  const handleDoubleTap = () => {
    if (!isLiked) {
      setIsLiked(true);
      onLike();
      triggerFeedback('like');
      speak('Aimé');
    }
  };

  const handleLike = () => {
    setIsLiked(!isLiked);
    onLike();
    triggerFeedback('like');
    speak(isLiked ? 'Retiré' : 'Aimé');
  };

  const handleRespond = () => {
    onRespond();
    triggerFeedback('record');
    speak('Réponds en vidéo');
  };

  const handleRemix = () => {
    onRemix();
    triggerFeedback('notification');
    speak('Remixer');
  };

  const handleShare = () => {
    onShare();
    triggerFeedback('send');
    speak('Partager');
  };

  const handleSave = () => {
    setIsSaved(!isSaved);
    onSave();
    triggerFeedback('success');
    speak(isSaved ? 'Retiré' : 'Enregistré');
  };

  const handleLongPress = () => {
    setShowOptions(true);
    triggerFeedback('notification');
  };

  return (
    <div className="h-screen w-full snap-start snap-always relative bg-black">
      {/* Video */}
      <video
        ref={videoRef}
        src={post.media_url}
        poster={post.thumbnail_url || undefined}
        className="absolute inset-0 w-full h-full object-cover"
        playsInline
        loop
        muted={isMuted}
        onClick={togglePlay}
        onDoubleClick={handleDoubleTap}
        onContextMenu={(e) => {
          e.preventDefault();
          handleLongPress();
        }}
      />

      {/* Play/Pause overlay */}
      <AnimatePresence>
        {!isPlaying && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="absolute inset-0 flex items-center justify-center bg-black/20"
          >
            <div className="w-20 h-20 rounded-full bg-white/30 backdrop-blur-lg flex items-center justify-center">
              <Play className="w-10 h-10 text-white ml-1" fill="white" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-white/20">
        <motion.div
          className="h-full bg-white"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Topic badge */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute top-16 left-4 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-lg"
      >
        <span className="text-white text-sm font-medium">
          {topicIcon} {post.topic || 'Vidéo'}
        </span>
      </motion.div>

      {/* Mute button */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={toggleMute}
        className="absolute top-16 right-4 w-10 h-10 rounded-full bg-black/40 backdrop-blur-lg flex items-center justify-center"
      >
        {isMuted ? (
          <VolumeX className="w-5 h-5 text-white" />
        ) : (
          <Volume2 className="w-5 h-5 text-white" />
        )}
      </motion.button>

      {/* User info - Bottom left */}
      <div className="absolute bottom-32 left-4 right-20">
        <div className="flex items-center gap-3 mb-3">
          {post.user?.avatar_url ? (
            <img
              src={post.user.avatar_url}
              alt={post.user.display_name}
              className="w-12 h-12 rounded-full border-2 border-white object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-xl text-white border-2 border-white">
              {(post.user?.display_name || 'A')[0].toUpperCase()}
            </div>
          )}
          <div>
            <p className="text-white font-semibold text-lg drop-shadow-lg">
              {post.user?.display_name || 'Anonyme'}
            </p>
            {post.user?.username && (
              <p className="text-white/70 text-sm">@{post.user.username}</p>
            )}
          </div>
        </div>

        {/* Transcript / Smart subtitles */}
        {(post.transcript_fr || post.transcript_ba) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-black/40 backdrop-blur-sm rounded-xl px-4 py-2 max-w-sm"
          >
            <p className="text-white text-base line-clamp-2">
              {post.transcript_fr || post.transcript_ba}
            </p>
          </motion.div>
        )}

        {/* Topic pictos when no transcript */}
        {!post.transcript_fr && !post.transcript_ba && post.topic && (
          <div className="flex gap-2">
            {Object.entries(TOPIC_ICONS)
              .filter(([key]) => post.topic?.includes(key))
              .slice(0, 3)
              .map(([key, icon]) => (
                <span key={key} className="text-3xl drop-shadow-lg">{icon}</span>
              ))}
          </div>
        )}
      </div>

      {/* Action buttons - Right column XXL */}
      <div className="fixed right-3 bottom-36 flex flex-col gap-5 z-10">
        <ActionButton
          icon={Heart}
          label={String(post.likes_count || 0)}
          isActive={isLiked}
          activeColor="text-red-500"
          onClick={handleLike}
          size="xl"
        />
        <ActionButton
          icon={MessageCircle}
          label={String(post.comments_count || 0)}
          onClick={onComment}
          size="xl"
        />
        <ActionButton
          icon={Mic}
          label="Répondre"
          onClick={handleRespond}
          size="xl"
        />
        <ActionButton
          icon={RefreshCw}
          label="Remix"
          onClick={handleRemix}
          size="xl"
        />
        <ActionButton
          icon={Share2}
          label="Partager"
          onClick={handleShare}
          size="xl"
        />
        <ActionButton
          icon={Bookmark}
          label="Sauver"
          isActive={isSaved}
          activeColor="text-yellow-500"
          onClick={handleSave}
          size="xl"
        />
      </div>

      {/* Options modal */}
      <AnimatePresence>
        {showOptions && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 flex items-end z-20"
            onClick={() => setShowOptions(false)}
          >
            <motion.div
              initial={{ y: 300 }}
              animate={{ y: 0 }}
              exit={{ y: 300 }}
              className="w-full bg-card rounded-t-3xl p-6 space-y-4"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-12 h-1.5 bg-muted rounded-full mx-auto mb-4" />
              
              <button className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-muted/50">
                <Flag className="w-6 h-6 text-red-500" />
                <span className="text-foreground font-medium">Signaler</span>
              </button>
              
              <button className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-muted/50">
                <Download className="w-6 h-6 text-foreground" />
                <span className="text-foreground font-medium">Télécharger</span>
              </button>
              
              <button
                onClick={() => setShowOptions(false)}
                className="w-full p-4 rounded-xl bg-muted text-center font-medium"
              >
                Annuler
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Double-tap heart animation */}
      <AnimatePresence>
        {isLiked && (
          <motion.div
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 1.5, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <Heart className="w-32 h-32 text-red-500" fill="currentColor" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Action button component
const ActionButton: React.FC<{
  icon: typeof Heart;
  label: string;
  isActive?: boolean;
  activeColor?: string;
  onClick: () => void;
  size?: 'md' | 'xl';
}> = ({ icon: Icon, label, isActive, activeColor, onClick, size = 'md' }) => (
  <motion.button
    whileTap={{ scale: 0.85 }}
    onClick={onClick}
    className="flex flex-col items-center gap-1"
  >
    <div className={cn(
      "rounded-full bg-black/30 backdrop-blur-lg flex items-center justify-center",
      size === 'xl' ? "w-14 h-14" : "w-12 h-12",
      isActive && "bg-white/20"
    )}>
      <Icon
        className={cn(
          size === 'xl' ? "w-7 h-7" : "w-6 h-6",
          isActive ? activeColor : "text-white"
        )}
        fill={isActive ? "currentColor" : "none"}
      />
    </div>
    <span className="text-xs text-white/80 font-medium">{label}</span>
  </motion.button>
);

// Main Video Feed Component
export const TamTamVideoFeed: React.FC<TamTamVideoFeedProps> = ({
  posts,
  onLike,
  onComment,
  onShare,
  onRemix,
  onSave,
  onRespond
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const { speak } = useFrenchTTS();

  // Announce feed on mount
  useEffect(() => {
    speak('Feed Création. Glissez pour naviguer.');
  }, [speak]);

  // Handle scroll to detect current card
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const scrollTop = containerRef.current.scrollTop;
    const cardHeight = containerRef.current.clientHeight;
    const newIndex = Math.round(scrollTop / cardHeight);
    if (newIndex !== currentIndex && newIndex >= 0 && newIndex < posts.length) {
      setCurrentIndex(newIndex);
      triggerFeedback('notification');
    }
  }, [currentIndex, posts.length]);

  if (posts.length === 0) {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-8 text-center bg-black">
        <div className="w-24 h-24 rounded-full bg-white/10 flex items-center justify-center mb-6">
          <Play className="w-12 h-12 text-white/60" />
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">
          Aucune création
        </h3>
        <p className="text-white/60">
          Soyez le premier à créer une vidéo !
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="h-screen overflow-y-scroll snap-y snap-mandatory scrollbar-hide bg-black"
      style={{ scrollSnapType: 'y mandatory' }}
    >
      {posts.map((post, index) => (
        <VideoCard
          key={post.id}
          post={post}
          isActive={index === currentIndex}
          onLike={() => onLike?.(post.id)}
          onComment={() => onComment?.(post.id)}
          onShare={() => onShare?.(post.id)}
          onRemix={() => onRemix?.(post.id)}
          onSave={() => onSave?.(post.id)}
          onRespond={() => onRespond?.(post.id)}
        />
      ))}
    </div>
  );
};

export default TamTamVideoFeed;
