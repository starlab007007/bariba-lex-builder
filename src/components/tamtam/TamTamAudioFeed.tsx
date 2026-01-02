import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { Heart, Mic, Share2, Bookmark, Play, Pause, SkipForward, SkipBack, Volume2 } from 'lucide-react';
import { useFrenchTTS } from '@/hooks/useFrenchTTS';
import { triggerFeedback } from '@/utils/tamtamFeedback';
import { cn } from '@/lib/utils';

// Template configurations with unique vinyl designs
const TEMPLATE_CONFIGS: Record<string, {
  gradient: string;
  emoji: string;
  grooveColor: string;
  glowColor: string;
  label: string;
}> = {
  conte_animal: {
    gradient: 'from-amber-500 via-orange-500 to-red-500',
    emoji: '🦁',
    grooveColor: 'rgba(251, 191, 36, 0.3)',
    glowColor: 'rgba(251, 146, 60, 0.6)',
    label: 'Conte Animal'
  },
  conte_proverbe: {
    gradient: 'from-purple-600 via-violet-500 to-indigo-500',
    emoji: '🌍',
    grooveColor: 'rgba(139, 92, 246, 0.3)',
    glowColor: 'rgba(167, 139, 250, 0.6)',
    label: 'Proverbe'
  },
  musique_tradition: {
    gradient: 'from-emerald-500 via-teal-500 to-cyan-500',
    emoji: '🥁',
    grooveColor: 'rgba(20, 184, 166, 0.3)',
    glowColor: 'rgba(45, 212, 191, 0.6)',
    label: 'Musique'
  },
  histoire_epopee: {
    gradient: 'from-red-600 via-rose-500 to-pink-500',
    emoji: '⚔️',
    grooveColor: 'rgba(244, 63, 94, 0.3)',
    glowColor: 'rgba(251, 113, 133, 0.6)',
    label: 'Épopée'
  },
  sagesse_ancien: {
    gradient: 'from-yellow-500 via-amber-500 to-orange-400',
    emoji: '🌟',
    grooveColor: 'rgba(245, 158, 11, 0.3)',
    glowColor: 'rgba(252, 211, 77, 0.6)',
    label: 'Sagesse'
  },
  default: {
    gradient: 'from-slate-600 via-gray-500 to-zinc-500',
    emoji: '🎵',
    grooveColor: 'rgba(100, 116, 139, 0.3)',
    glowColor: 'rgba(148, 163, 184, 0.6)',
    label: 'Audio'
  }
};

interface AudioPost {
  id: string;
  audio_url: string;
  transcript_fr?: string | null;
  transcript_ba?: string | null;
  template_id?: string | null;
  topic?: string | null;
  duration_seconds?: number | null;
  user?: {
    display_name?: string;
    avatar_url?: string;
    location?: string;
  };
  likes_count?: number;
  comments_count?: number;
  shares_count?: number;
  created_at: string;
}

interface TamTamAudioFeedProps {
  posts: AudioPost[];
  mode: 'radio' | 'mavoix';
  onLike?: (postId: string) => void;
  onRespond?: (postId: string) => void;
  onShare?: (postId: string) => void;
  onSave?: (postId: string) => void;
}

// Vinyl Disc Component with dynamic generation
const VinylDisc: React.FC<{
  config: typeof TEMPLATE_CONFIGS['default'];
  isPlaying: boolean;
  progress: number;
  audioLevel: number;
}> = ({ config, isPlaying, progress, audioLevel }) => {
  const rotation = useMotionValue(0);
  const rotationRef = useRef(0);
  const animationRef = useRef<number>();

  useEffect(() => {
    const animate = () => {
      if (isPlaying) {
        rotationRef.current += 0.25; // ~24 seconds per rotation
        rotation.set(rotationRef.current);
      }
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying, rotation]);

  // Generate vinyl grooves
  const grooves = Array.from({ length: 20 }, (_, i) => {
    const radius = 35 + i * 2.5;
    return (
      <circle
        key={i}
        cx="50%"
        cy="50%"
        r={`${radius}%`}
        fill="none"
        stroke={config.grooveColor}
        strokeWidth="0.5"
        opacity={0.5 + (i % 3) * 0.15}
      />
    );
  });

  return (
    <div className="relative w-64 h-64 mx-auto">
      {/* Glow effect that pulses with audio */}
      <motion.div
        className="absolute inset-0 rounded-full blur-2xl"
        style={{ background: config.glowColor }}
        animate={{
          scale: isPlaying ? [1, 1.1 + audioLevel * 0.2, 1] : 1,
          opacity: isPlaying ? [0.4, 0.6 + audioLevel * 0.3, 0.4] : 0.3
        }}
        transition={{ duration: 0.5, repeat: Infinity }}
      />

      {/* Progress ring */}
      <svg className="absolute inset-0 w-full h-full -rotate-90">
        <circle
          cx="50%"
          cy="50%"
          r="48%"
          fill="none"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="4"
        />
        <circle
          cx="50%"
          cy="50%"
          r="48%"
          fill="none"
          stroke="white"
          strokeWidth="4"
          strokeDasharray={`${progress * 3.02} 302`}
          strokeLinecap="round"
          className="drop-shadow-lg"
        />
      </svg>

      {/* Vinyl disc */}
      <motion.div
        className="absolute inset-4 rounded-full overflow-hidden"
        style={{ rotate: rotation }}
      >
        {/* Background gradient */}
        <div className={cn(
          "absolute inset-0 bg-gradient-to-br",
          config.gradient
        )} />

        {/* Vinyl grooves */}
        <svg className="absolute inset-0 w-full h-full">
          {grooves}
        </svg>

        {/* Center label */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-20 h-20 rounded-full bg-black/80 flex items-center justify-center shadow-inner">
            <span className="text-4xl">{config.emoji}</span>
          </div>
        </div>

        {/* Reflection */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-black/20" />
      </motion.div>

      {/* Sound wave bars */}
      <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex gap-1">
        {Array.from({ length: 7 }, (_, i) => (
          <motion.div
            key={i}
            className="w-1.5 rounded-full bg-white/80"
            animate={{
              height: isPlaying ? [8, 8 + Math.random() * 24 * audioLevel, 8] : 4
            }}
            transition={{
              duration: 0.2 + Math.random() * 0.1,
              repeat: Infinity,
              delay: i * 0.05
            }}
          />
        ))}
      </div>
    </div>
  );
};

// Single Audio Card Component
const AudioCard: React.FC<{
  post: AudioPost;
  isActive: boolean;
  onPlay: () => void;
  onPause: () => void;
  onLike: () => void;
  onRespond: () => void;
  onShare: () => void;
  onSave: () => void;
}> = ({ post, isActive, onPlay, onPause, onLike, onRespond, onShare, onSave }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(post.duration_seconds || 60);
  const [audioLevel, setAudioLevel] = useState(0);
  const [hasPlayedIntro, setHasPlayedIntro] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  
  const { speak, isSpeaking } = useFrenchTTS();

  const templateConfig = TEMPLATE_CONFIGS[post.template_id || 'default'] || TEMPLATE_CONFIGS.default;
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Auto-play with TTS intro when becoming active
  useEffect(() => {
    if (isActive && !hasPlayedIntro && audioRef.current) {
      const intro = `${templateConfig.label}. ${post.user?.display_name || 'Anonyme'}${post.user?.location ? ` de ${post.user.location}` : ''}`;
      speak(intro);
      setHasPlayedIntro(true);
      // Start audio after brief TTS delay
      const timer = setTimeout(() => {
        audioRef.current?.play().catch(console.error);
        setIsPlaying(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isActive, hasPlayedIntro, speak, templateConfig.label, post.user]);

  // Audio event handlers
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  // Simulate audio level for visualization
  useEffect(() => {
    if (!isPlaying) {
      setAudioLevel(0);
      return;
    }
    const interval = setInterval(() => {
      setAudioLevel(0.3 + Math.random() * 0.7);
    }, 100);
    return () => clearInterval(interval);
  }, [isPlaying]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      onPause();
    } else {
      audioRef.current.play().catch(console.error);
      setIsPlaying(true);
      onPlay();
    }
    triggerFeedback('notification');
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
    speak('Répondre en audio');
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
    speak(isSaved ? 'Retiré des favoris' : 'Enregistré');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-screen w-full snap-start snap-always flex flex-col items-center justify-center relative px-4">
      <audio ref={audioRef} src={post.audio_url} preload="metadata" />

      {/* Background gradient based on template */}
      <div className={cn(
        "absolute inset-0 opacity-20 bg-gradient-to-b",
        templateConfig.gradient
      )} />

      {/* Template label */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute top-24 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-black/30 backdrop-blur-lg"
      >
        <span className="text-white font-medium">
          {templateConfig.emoji} {templateConfig.label}
        </span>
      </motion.div>

      {/* Vinyl disc */}
      <div className="mb-12">
        <VinylDisc
          config={templateConfig}
          isPlaying={isPlaying}
          progress={progress}
          audioLevel={audioLevel}
        />
      </div>

      {/* User info */}
      <div className="text-center mb-8">
        <h3 className="text-xl font-bold text-foreground">
          {post.user?.display_name || 'Anonyme'}
        </h3>
        {post.user?.location && (
          <p className="text-sm text-muted-foreground mt-1">
            📍 {post.user.location}
          </p>
        )}
      </div>

      {/* Karaoke transcript */}
      {(post.transcript_fr || post.transcript_ba) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="max-w-sm mx-auto text-center mb-8 px-4"
        >
          <p className="text-lg text-foreground/90 line-clamp-2">
            {post.transcript_fr || post.transcript_ba}
          </p>
        </motion.div>
      )}

      {/* Playback controls */}
      <div className="flex items-center gap-6 mb-8">
        <button className="p-3 rounded-full bg-white/10 backdrop-blur-lg">
          <SkipBack className="w-6 h-6 text-white" />
        </button>
        
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={togglePlay}
          className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-2xl"
        >
          {isPlaying ? (
            <Pause className="w-10 h-10 text-gray-900" fill="currentColor" />
          ) : (
            <Play className="w-10 h-10 text-gray-900 ml-1" fill="currentColor" />
          )}
        </motion.button>
        
        <button className="p-3 rounded-full bg-white/10 backdrop-blur-lg">
          <SkipForward className="w-6 h-6 text-white" />
        </button>
      </div>

      {/* Time display */}
      <div className="text-white/60 text-sm mb-8">
        {formatTime(currentTime)} / {formatTime(duration)}
      </div>

      {/* Action buttons - Right column */}
      <div className="fixed right-4 bottom-1/3 flex flex-col gap-6 z-10">
        <ActionButton
          icon={Heart}
          label={String(post.likes_count || 0)}
          isActive={isLiked}
          activeColor="text-red-500"
          onClick={handleLike}
        />
        <ActionButton
          icon={Mic}
          label="Répondre"
          onClick={handleRespond}
        />
        <ActionButton
          icon={Share2}
          label="Partager"
          onClick={handleShare}
        />
        <ActionButton
          icon={Bookmark}
          label="Sauver"
          isActive={isSaved}
          activeColor="text-yellow-500"
          onClick={handleSave}
        />
      </div>
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
}> = ({ icon: Icon, label, isActive, activeColor, onClick }) => (
  <motion.button
    whileTap={{ scale: 0.85 }}
    onClick={onClick}
    className="flex flex-col items-center gap-1"
  >
    <div className={cn(
      "w-14 h-14 rounded-full bg-black/30 backdrop-blur-lg flex items-center justify-center",
      isActive && "bg-white/20"
    )}>
      <Icon
        className={cn(
          "w-7 h-7",
          isActive ? activeColor : "text-white"
        )}
        fill={isActive ? "currentColor" : "none"}
      />
    </div>
    <span className="text-xs text-white/80">{label}</span>
  </motion.button>
);

// Main Audio Feed Component
export const TamTamAudioFeed: React.FC<TamTamAudioFeedProps> = ({
  posts,
  mode,
  onLike,
  onRespond,
  onShare,
  onSave
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const { speak } = useFrenchTTS();

  // Announce mode on mount
  useEffect(() => {
    const modeLabel = mode === 'radio' ? 'Mode Radio Patrimoine' : 'Mode Ma Voix du Village';
    speak(modeLabel);
  }, [mode, speak]);

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
      <div className="h-screen flex flex-col items-center justify-center p-8 text-center">
        <div className="w-24 h-24 rounded-full bg-muted/20 flex items-center justify-center mb-6">
          <Volume2 className="w-12 h-12 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-semibold text-foreground mb-2">
          {mode === 'radio' ? 'Aucun contenu patrimoine' : 'Aucune voix du village'}
        </h3>
        <p className="text-muted-foreground">
          Soyez le premier à partager !
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="h-screen overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
      style={{ scrollSnapType: 'y mandatory' }}
    >
      {posts.map((post, index) => (
        <AudioCard
          key={post.id}
          post={post}
          isActive={index === currentIndex}
          onPlay={() => {}}
          onPause={() => {}}
          onLike={() => onLike?.(post.id)}
          onRespond={() => onRespond?.(post.id)}
          onShare={() => onShare?.(post.id)}
          onSave={() => onSave?.(post.id)}
        />
      ))}
    </div>
  );
};

export default TamTamAudioFeed;
