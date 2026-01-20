import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import {
  Heart, Mic, Share2, Star, Play, Pause,
  SkipBack, SkipForward, Volume2, VolumeX,
  ChevronUp, MapPin, Sparkles, Users
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════
// 🎵 TAM-TAM AUDIO FEED - EXPÉRIENCE TIKTOK + VINYLE
// ═══════════════════════════════════════════════════════════════════════════

interface AudioPost {
  id: string;
  audioUrl: string;
  duration: number;
  templateId: string;
  category: 'patrimoine' | 'village_voice';
  subcategory: string;
  emoji: string;
  visualEmojis: string[];
  gradient: string;
  titleFr: string;
  titleBa: string;
  transcript?: string;
  authorName: string;
  authorVillage: string;
  likes: number;
  replies: number;
  shares: number;
  createdAt?: Date;
  isLiked?: boolean;
  isSaved?: boolean;
}

interface TamTamAudioFeedProps {
  posts?: AudioPost[];
  mode?: 'radio' | 'mavoix';
  onLike?: (postId: string) => void;
  onReply?: (postId: string) => void;
  onShare?: (postId: string) => void;
  onSave?: (postId: string) => void;
  onRespond?: (postId: string) => void;
}

type FeedTab = 'pour_toi' | 'autour' | 'communaute';

// ═══════════════════════════════════════════════════════════════════════════
// VINYL DISC COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

interface VinylDiscProps {
  emoji: string;
  gradient: string;
  isPlaying: boolean;
  progress: number;
  size?: number;
}

const VinylDisc: React.FC<VinylDiscProps> = ({ emoji, gradient, isPlaying, progress, size = 220 }) => {
  const rotation = useMotionValue(0);
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  
  useEffect(() => {
    if (isPlaying) {
      const animate = (time: number) => {
        if (lastTimeRef.current) {
          const delta = time - lastTimeRef.current;
          rotation.set(rotation.get() + (delta / 1000) * 15);
        }
        lastTimeRef.current = time;
        animationRef.current = requestAnimationFrame(animate);
      };
      animationRef.current = requestAnimationFrame(animate);
    } else {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      lastTimeRef.current = 0;
    }
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, [isPlaying, rotation]);

  const rotateTransform = useTransform(rotation, (r) => `rotate(${r}deg)`);
  const circumference = 2 * Math.PI * (size / 2 - 6);
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* Glow */}
      <motion.div
        className={`absolute inset-0 rounded-full bg-gradient-to-br ${gradient} blur-2xl`}
        animate={{ scale: isPlaying ? [1, 1.1, 1] : 1, opacity: isPlaying ? [0.4, 0.6, 0.4] : 0.3 }}
        transition={{ repeat: Infinity, duration: 2 }}
      />
      
      {/* Progress Ring */}
      <svg className="absolute inset-0 -rotate-90" width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={size / 2 - 6} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="8" />
        <motion.circle
          cx={size / 2} cy={size / 2} r={size / 2 - 6}
          fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="8" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
          style={{ transition: 'stroke-dashoffset 0.3s ease' }}
        />
      </svg>
      
      {/* Vinyl */}
      <motion.div className="absolute inset-3 rounded-full overflow-hidden shadow-2xl" style={{ transform: rotateTransform }}>
        <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />
        {[...Array(15)].map((_, i) => (
          <div key={i} className="absolute rounded-full" style={{ inset: `${8 + i * 4}%`, border: `1px solid rgba(0,0,0,${0.1 + i * 0.015})` }} />
        ))}
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-transparent"
          style={{ clipPath: 'polygon(0 0, 55% 0, 35% 100%, 0 100%)' }}
          animate={isPlaying ? { opacity: [0.3, 0.5, 0.3] } : {}}
          transition={{ repeat: Infinity, duration: 1.5 }}
        />
        <div className="absolute inset-[28%] rounded-full bg-gradient-to-br from-amber-800 via-amber-900 to-amber-950 flex items-center justify-center shadow-inner border-2 border-amber-700/50">
          <motion.span className="text-6xl drop-shadow-lg" animate={isPlaying ? { scale: [1, 1.1, 1] } : {}} transition={{ repeat: Infinity, duration: 1.5 }}>
            {emoji}
          </motion.span>
        </div>
        <div className="absolute inset-[46%] rounded-full bg-black shadow-inner" />
      </motion.div>
      
      {/* Tonearm */}
      <motion.div
        className="absolute -right-4 top-4 origin-top-left"
        animate={{ rotate: isPlaying ? 28 : 5 }}
        transition={{ duration: 0.6, ease: "easeInOut" }}
      >
        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-gray-200 to-gray-400 shadow-lg border-2 border-gray-300" />
        <div className="w-2 h-20 bg-gradient-to-b from-gray-300 to-gray-500 rounded-full ml-1.5 shadow-md" />
        <div className="w-4 h-6 bg-gradient-to-b from-gray-400 to-gray-600 rounded-sm ml-0.5 shadow-md" />
      </motion.div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// AUDIO WAVEFORM
// ═══════════════════════════════════════════════════════════════════════════

const AudioWaveform: React.FC<{ isPlaying: boolean; barCount?: number }> = ({ isPlaying, barCount = 50 }) => (
  <div className="flex items-center justify-center gap-[2px] h-14 px-8">
    {[...Array(barCount)].map((_, i) => (
      <motion.div
        key={i}
        className="w-1 bg-white/70 rounded-full"
        animate={isPlaying ? { height: [8, Math.random() * 40 + 16, 8] } : { height: 8 }}
        transition={{ repeat: Infinity, duration: 0.35 + Math.random() * 0.25, delay: i * 0.015 }}
      />
    ))}
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════
// FLOATING EMOJIS
// ═══════════════════════════════════════════════════════════════════════════

const FloatingEmojis: React.FC<{ emojis: string[] }> = ({ emojis }) => {
  const positions = [
    { left: '5%', top: '8%', size: 'text-7xl', delay: 0 },
    { right: '8%', top: '5%', size: 'text-5xl', delay: 0.3 },
    { right: '5%', top: '35%', size: 'text-4xl', delay: 0.6 },
    { left: '8%', bottom: '25%', size: 'text-5xl', delay: 0.9 },
    { right: '15%', bottom: '35%', size: 'text-6xl', delay: 1.2 },
  ];

  return (
    <>
      {emojis.slice(0, 5).map((e, i) => (
        <motion.span
          key={i}
          className={`absolute ${positions[i].size} opacity-60`}
          style={{ left: positions[i].left, right: positions[i].right, top: positions[i].top, bottom: positions[i].bottom }}
          animate={{ opacity: [0.4, 0.7, 0.4], scale: [0.9, 1.1, 0.9], y: [0, -15, 0] }}
          transition={{ repeat: Infinity, duration: 4 + i, delay: positions[i].delay }}
        >
          {e}
        </motion.span>
      ))}
      <motion.div
        className="absolute right-8 bottom-[40%] text-5xl opacity-50"
        animate={{ rotate: [0, 15, 0], y: [0, -10, 0] }}
        transition={{ repeat: Infinity, duration: 3 }}
      >
        🎵
      </motion.div>
    </>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// AUDIO CARD
// ═══════════════════════════════════════════════════════════════════════════

interface AudioCardProps {
  post: AudioPost;
  isActive: boolean;
  onLike: () => void;
  onReply: () => void;
  onShare: () => void;
  onSave: () => void;
}

const AudioCard: React.FC<AudioCardProps> = ({ post, isActive, onLike, onReply, onShare, onSave }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showLikeAnimation, setShowLikeAnimation] = useState(false);
  const [isLiked, setIsLiked] = useState(post.isLiked || false);
  const [isSaved, setIsSaved] = useState(post.isSaved || false);
  const lastTapRef = useRef<number>(0);

  useEffect(() => {
    // Ne jouer que si l'audio existe réellement
    if (isActive && audioRef.current && post.audioUrl) {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    } else if (!isActive && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, [isActive, post.audioUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateProgress = () => {
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100);
        setCurrentTime(audio.currentTime);
      }
    };
    const handleEnded = () => { audio.currentTime = 0; audio.play(); };

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('ended', handleEnded);
    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) audioRef.current.pause();
      else audioRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 300 && !isLiked) {
      setIsLiked(true);
      setShowLikeAnimation(true);
      onLike();
      setTimeout(() => setShowLikeAnimation(false), 1000);
    }
    lastTapRef.current = now;
  };

  const skip = (seconds: number) => { if (audioRef.current) audioRef.current.currentTime += seconds; };
  const cyclePlaybackRate = () => {
    const rates = [1, 1.25, 1.5, 0.75];
    const nextRate = rates[(rates.indexOf(playbackRate) + 1) % rates.length];
    setPlaybackRate(nextRate);
    if (audioRef.current) audioRef.current.playbackRate = nextRate;
  };
  const formatTime = (t: number) => `${Math.floor(t / 60)}:${Math.floor(t % 60).toString().padStart(2, '0')}`;

  return (
    <div className="h-screen w-full relative overflow-hidden snap-start snap-always" onClick={handleDoubleTap}>
      {/* Audio uniquement si disponible */}
      {post.audioUrl && <audio ref={audioRef} src={post.audioUrl} preload="auto" muted={isMuted} />}
      
      {/* Background */}
      <div className={`absolute inset-0 bg-gradient-to-b ${post.gradient}`} />
      <FloatingEmojis emojis={post.visualEmojis} />
      
      {/* Like animation */}
      <AnimatePresence>
        {showLikeAnimation && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-50"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.5, opacity: 0 }}
          >
            <Heart className="w-40 h-40 text-white fill-white drop-shadow-2xl" />
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Main content */}
      <div className="relative h-full flex flex-col items-center justify-center px-4 pb-32 pt-20">
        <VinylDisc emoji={post.emoji} gradient={post.gradient} isPlaying={isPlaying} progress={progress} size={240} />
        
        <div className="mt-6">
          <AudioWaveform isPlaying={isPlaying} barCount={50} />
        </div>
        
        {/* Live transcription ticker between waveform and title */}
        {isPlaying && post.transcript && (
          <motion.div
            className="mt-3 px-6 overflow-hidden max-w-xs"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <motion.p
              className="text-white/90 text-sm text-center font-medium whitespace-nowrap"
              animate={{ x: post.transcript.length > 40 ? [0, -200, 0] : 0 }}
              transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
            >
              {post.transcript}
            </motion.p>
          </motion.div>
        )}
        
        <div className="mt-4 text-center">
          <h2 className="text-2xl font-bold text-white drop-shadow-lg">{post.titleFr}</h2>
          <p className="text-white/80 mt-1 flex items-center justify-center gap-2">
            <MapPin className="w-4 h-4" />
            {post.authorName} • {post.authorVillage}
          </p>
        </div>
        
        {post.transcript && (
          <motion.div className="mt-4 max-w-sm bg-black/30 backdrop-blur-md rounded-2xl p-4 border border-white/10">
            <p className="text-white/90 text-center text-sm leading-relaxed">"{post.transcript}"</p>
          </motion.div>
        )}
        
        {/* Controls */}
        <div className="mt-6 flex items-center gap-4">
          <span className="text-white/70 text-sm w-12 text-right">{formatTime(currentTime)}</span>
          <motion.button whileTap={{ scale: 0.9 }} onClick={(e) => { e.stopPropagation(); skip(-10); }} className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <SkipBack className="w-5 h-5 text-white" />
          </motion.button>
          <motion.button whileTap={{ scale: 0.9 }} onClick={(e) => { e.stopPropagation(); togglePlay(); }} className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-2xl">
            {isPlaying ? <Pause className="w-10 h-10 text-gray-800" /> : <Play className="w-10 h-10 text-gray-800 ml-1" />}
          </motion.button>
          <motion.button whileTap={{ scale: 0.9 }} onClick={(e) => { e.stopPropagation(); skip(10); }} className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <SkipForward className="w-5 h-5 text-white" />
          </motion.button>
          <span className="text-white/70 text-sm w-12">{formatTime(post.duration)}</span>
        </div>
        
        <div className="mt-4 flex items-center gap-3">
          <motion.button whileTap={{ scale: 0.95 }} onClick={(e) => { e.stopPropagation(); cyclePlaybackRate(); }} className="px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm text-white text-sm font-bold">
            {playbackRate}x
          </motion.button>
          <motion.button whileTap={{ scale: 0.95 }} onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }} className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
            {isMuted ? <VolumeX className="w-5 h-5 text-white" /> : <Volume2 className="w-5 h-5 text-white" />}
          </motion.button>
        </div>
      </div>
      
      {/* Action buttons */}
      <div className="absolute right-4 bottom-40 flex flex-col gap-5">
        <motion.button whileTap={{ scale: 0.85 }} onClick={(e) => { e.stopPropagation(); setIsLiked(!isLiked); onLike(); }} className={`w-16 h-16 rounded-full backdrop-blur-md flex flex-col items-center justify-center shadow-lg ${isLiked ? 'bg-red-500/80' : 'bg-white/20'}`}>
          <Heart className={`w-8 h-8 ${isLiked ? 'text-white fill-white' : 'text-white'}`} />
          <span className="text-white text-xs font-bold mt-0.5">{post.likes}</span>
        </motion.button>
        <motion.button whileTap={{ scale: 0.85 }} onClick={(e) => { e.stopPropagation(); onReply(); }} className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex flex-col items-center justify-center shadow-lg">
          <Mic className="w-8 h-8 text-white" />
          <span className="text-white text-xs font-bold mt-0.5">{post.replies}</span>
        </motion.button>
        <motion.button whileTap={{ scale: 0.85 }} onClick={(e) => { e.stopPropagation(); onShare(); }} className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex flex-col items-center justify-center shadow-lg">
          <Share2 className="w-8 h-8 text-white" />
          <span className="text-white text-xs font-bold mt-0.5">{post.shares}</span>
        </motion.button>
        <motion.button whileTap={{ scale: 0.85 }} onClick={(e) => { e.stopPropagation(); setIsSaved(!isSaved); onSave(); }} className={`w-16 h-16 rounded-full backdrop-blur-md flex items-center justify-center shadow-lg ${isSaved ? 'bg-yellow-500/80' : 'bg-white/20'}`}>
          <Star className={`w-8 h-8 ${isSaved ? 'text-white fill-white' : 'text-white'}`} />
        </motion.button>
      </div>
      
      {/* Swipe indicator */}
      <motion.div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center text-white/60" animate={{ y: [0, 10, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>
        <ChevronUp className="w-6 h-6" />
        <span className="text-xs">Swipez</span>
      </motion.div>
    </div>
  );
};

// Mock data - sans URLs audio par défaut (les vrais posts auront leurs propres audios)
const mockPosts: AudioPost[] = [
  {
    id: '1',
    audioUrl: undefined, // Pas d'audio par défaut - uniquement les vrais enregistrements
    duration: 180,
    templateId: 'conte_animaux',
    category: 'patrimoine',
    subcategory: 'conte',
    emoji: '🦁',
    visualEmojis: ['🦁', '🐘', '🐢', '🌙', '✨'],
    gradient: 'from-amber-500 via-orange-500 to-red-500',
    titleFr: 'Le Lion et la Gazelle',
    titleBa: 'Gàní kà Sèn',
    transcript: 'Il était une fois, dans la savane, un lion très fier qui rencontra une gazelle rusée...',
    authorName: 'Mamadou',
    authorVillage: 'Nikki',
    likes: 342, replies: 28, shares: 67,
  },
  {
    id: '2',
    audioUrl: undefined, // Pas d'audio par défaut
    duration: 210,
    templateId: 'musique_fete',
    category: 'patrimoine',
    subcategory: 'musique',
    emoji: '🥁',
    visualEmojis: ['🥁', '💃', '🕺', '🎉', '🔥'],
    gradient: 'from-fuchsia-500 via-purple-500 to-violet-600',
    titleFr: 'Chant de Mariage Traditionnel',
    titleBa: 'Sùmá Wèn',
    authorName: 'Aïcha',
    authorVillage: 'Parakou',
    likes: 589, replies: 45, shares: 123,
  },
  {
    id: '3',
    audioUrl: undefined, // Pas d'audio par défaut
    duration: 120,
    templateId: 'proverbe_sagesse',
    category: 'patrimoine',
    subcategory: 'proverbe',
    emoji: '🧓',
    visualEmojis: ['🧓', '💭', '💡', '🙏', '✨'],
    gradient: 'from-amber-600 via-yellow-600 to-orange-500',
    titleFr: 'Proverbe du Jour',
    titleBa: 'Kálá Wèn',
    transcript: 'Qui veut voyager loin ménage sa monture',
    authorName: 'Elder Kofi',
    authorVillage: 'Kandi',
    likes: 234, replies: 15, shares: 45,
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT - Export nommé ET default
// ═══════════════════════════════════════════════════════════════════════════

export const TamTamAudioFeed: React.FC<TamTamAudioFeedProps> = ({
  posts = mockPosts,
  mode = 'radio',
  onLike = () => {},
  onReply = () => {},
  onShare = () => {},
  onSave = () => {},
  onRespond,
}) => {
  // Utiliser onRespond ou onReply
  const handleReply = onRespond || onReply;
  
  const [activeTab, setActiveTab] = useState<FeedTab>('pour_toi');
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const tabs: { id: FeedTab; label: string; icon: React.ElementType }[] = [
    { id: 'pour_toi', label: 'Pour toi', icon: Sparkles },
    { id: 'autour', label: 'Autour', icon: MapPin },
    { id: 'communaute', label: 'Communauté', icon: Users },
  ];

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const itemHeight = container.clientHeight;
      const newIndex = Math.round(scrollTop / itemHeight);
      if (newIndex !== activeIndex && newIndex >= 0 && newIndex < posts.length) {
        setActiveIndex(newIndex);
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [activeIndex, posts.length]);

  return (
    <div className="h-screen w-full bg-black flex flex-col relative">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/60 to-transparent pt-safe pb-4">
        <div className="flex justify-center gap-4 pt-4">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full transition-all ${
                activeTab === tab.id ? 'bg-white text-black font-bold shadow-lg' : 'text-white/70 hover:text-white'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="text-sm">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Feed */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
        style={{ scrollSnapType: 'y mandatory' }}
      >
        {posts.map((post, index) => (
          <AudioCard
            key={post.id}
            post={post}
            isActive={index === activeIndex}
            onLike={() => onLike(post.id)}
            onReply={() => handleReply(post.id)}
            onShare={() => onShare(post.id)}
            onSave={() => onSave(post.id)}
          />
        ))}
      </div>
    </div>
  );
};

// Export default pour compatibilité
export default TamTamAudioFeed;
