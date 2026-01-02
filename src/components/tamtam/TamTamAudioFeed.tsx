import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import {
  Heart, Mic, Share2, Star, Play, Pause, SkipForward, SkipBack,
  Volume2, VolumeX, ChevronUp, Turtle, Rabbit, X, Check, 
  Trash2, Users, MapPin, Sparkles, Radio, MessageCircle
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface AudioPost {
  id: string;
  audioUrl: string;
  duration: number;
  templateId: string;
  emoji: string;
  gradient: string;
  titleFr: string;
  titleBa: string;
  transcript?: string;
  authorName: string;
  authorVillage: string;
  likes: number;
  replies: number;
  shares: number;
  isLiked?: boolean;
  isSaved?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATES VISUELS
// ═══════════════════════════════════════════════════════════════════════════

const templateVisuals: Record<string, { gradient: string; emoji: string; grooveColor: string }> = {
  conte_animaux: { gradient: 'from-amber-500 via-orange-500 to-red-500', emoji: '🦁', grooveColor: 'rgba(251,191,36,0.3)' },
  conte_origine: { gradient: 'from-indigo-600 via-purple-600 to-pink-500', emoji: '🌍', grooveColor: 'rgba(139,92,246,0.3)' },
  conte_heros: { gradient: 'from-red-600 via-rose-600 to-pink-500', emoji: '⚔️', grooveColor: 'rgba(244,63,94,0.3)' },
  musique_mariage: { gradient: 'from-pink-500 via-rose-500 to-red-400', emoji: '💒', grooveColor: 'rgba(236,72,153,0.3)' },
  musique_fete: { gradient: 'from-fuchsia-500 via-purple-500 to-violet-600', emoji: '🥁', grooveColor: 'rgba(192,38,211,0.3)' },
  proverbe_sagesse: { gradient: 'from-amber-600 via-yellow-600 to-orange-500', emoji: '🧓', grooveColor: 'rgba(217,119,6,0.3)' },
  alerte_meteo: { gradient: 'from-slate-600 via-blue-600 to-cyan-500', emoji: '⛈️', grooveColor: 'rgba(37,99,235,0.3)' },
  default: { gradient: 'from-slate-500 via-gray-500 to-zinc-500', emoji: '🎙️', grooveColor: 'rgba(100,116,139,0.3)' },
};

// ═══════════════════════════════════════════════════════════════════════════
// COMPOSANT: DISQUE VINYLE
// ═══════════════════════════════════════════════════════════════════════════

const VinylDisc: React.FC<{
  templateId: string;
  emoji: string;
  gradient: string;
  isPlaying: boolean;
  progress: number;
  amplitude?: number;
  size?: number;
}> = ({ templateId, emoji, gradient, isPlaying, progress, amplitude = 0, size = 280 }) => {
  const visual = templateVisuals[templateId] || templateVisuals.default;
  const rotation = useMotionValue(0);
  const animationRef = useRef<number>();
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
    
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying, rotation]);

  const rotateTransform = useTransform(rotation, (r) => `rotate(${r}deg)`);
  const circumference = 2 * Math.PI * (size / 2 - 8);
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="absolute inset-0 -rotate-90" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2 - 8}
          fill="none"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth="8"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2 - 8}
          fill="none"
          stroke="rgba(255,255,255,0.95)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-300"
        />
      </svg>
      
      <motion.div
        className={`absolute inset-4 rounded-full bg-gradient-to-br ${gradient} blur-2xl`}
        animate={{
          scale: isPlaying ? 1 + amplitude * 0.2 : 1,
          opacity: isPlaying ? 0.7 + amplitude * 0.3 : 0.5,
        }}
        transition={{ duration: 0.1 }}
      />
      
      <motion.div
        className="absolute inset-4 rounded-full overflow-hidden shadow-2xl"
        style={{ transform: rotateTransform }}
      >
        <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />
        
        <div className="absolute inset-0">
          {[...Array(15)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full border"
              style={{
                inset: `${6 + i * 5.5}%`,
                borderColor: visual.grooveColor,
                borderWidth: i % 3 === 0 ? '2px' : '1px',
              }}
            />
          ))}
        </div>
        
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-transparent"
          style={{ clipPath: 'polygon(0 0, 55% 0, 45% 100%, 0 100%)' }}
        />
        
        <div className="absolute inset-[28%] rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center shadow-inner">
          <motion.span
            className="text-6xl"
            animate={isPlaying ? { scale: [1, 1.15, 1] } : {}}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            {emoji}
          </motion.span>
        </div>
        
        <div className="absolute inset-[45%] rounded-full bg-black shadow-2xl" />
      </motion.div>
      
      {isPlaying && (
        <motion.div
          className="absolute -right-3 top-[22%] w-1.5 h-28 bg-gradient-to-b from-gray-200 via-gray-400 to-gray-600 rounded-full origin-top shadow-lg"
          initial={{ rotate: -35 }}
          animate={{ rotate: -18 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          style={{ transformOrigin: 'top center' }}
        />
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// COMPOSANT: ONDE SONORE
// ═══════════════════════════════════════════════════════════════════════════

const AudioWaveform: React.FC<{ isPlaying: boolean; barCount?: number }> = ({ 
  isPlaying, 
  barCount = 50 
}) => {
  return (
    <div className="flex items-center justify-center gap-[2px] h-16">
      {[...Array(barCount)].map((_, i) => (
        <motion.div
          key={i}
          className="w-1 bg-white/70 rounded-full"
          animate={isPlaying ? {
            height: [10, Math.random() * 40 + 20, 10],
          } : { height: 10 }}
          transition={{
            repeat: Infinity,
            duration: 0.3 + Math.random() * 0.4,
            delay: i * 0.015,
            ease: "easeInOut"
          }}
        />
      ))}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// COMPOSANT: CARTE AUDIO
// ═══════════════════════════════════════════════════════════════════════════

const AudioCard: React.FC<{
  post: AudioPost;
  isActive: boolean;
  onLike: () => void;
  onReply: () => void;
  onShare: () => void;
  onSave: () => void;
}> = ({ post, isActive, onLike, onReply, onShare, onSave }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [amplitude, setAmplitude] = useState(0);
  const [isLiked, setIsLiked] = useState(post.isLiked || false);
  const [isSaved, setIsSaved] = useState(post.isSaved || false);
  
  const visual = templateVisuals[post.templateId] || templateVisuals.default;

  useEffect(() => {
    if (isActive && audioRef.current) {
      audioRef.current.play();
      setIsPlaying(true);
    } else if (!isActive && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, [isActive]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateProgress = () => {
      const prog = (audio.currentTime / audio.duration) * 100;
      setProgress(prog);
      setCurrentTime(audio.currentTime);
      setAmplitude(Math.random() * 0.6 + 0.3);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
    };

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const skip = (seconds: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime += seconds;
    }
  };

  const cyclePlaybackRate = () => {
    const rates = [1, 1.25, 1.5, 0.75];
    const currentIndex = rates.indexOf(playbackRate);
    const nextRate = rates[(currentIndex + 1) % rates.length];
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleLike = () => {
    setIsLiked(!isLiked);
    onLike();
  };

  const handleSave = () => {
    setIsSaved(!isSaved);
    onSave();
  };

  return (
    <div 
      className="h-screen w-full relative overflow-hidden snap-start snap-always"
      onClick={togglePlay}
    >
      <audio ref={audioRef} src={post.audioUrl} preload="auto" />
      
      <div className={`absolute inset-0 bg-gradient-to-br ${post.gradient}`} />
      <div className="absolute inset-0 backdrop-blur-3xl bg-black/30" />
      
      <div className="absolute inset-0 overflow-hidden opacity-[0.07]">
        {[post.emoji, '✨', '🎵', '💫'].map((emoji, i) => (
          <motion.span
            key={i}
            className="absolute text-9xl"
            initial={{ opacity: 0 }}
            animate={{ 
              opacity: [0.4, 0.7, 0.4],
              x: [0, 25, 0],
              y: [0, -15, 0],
              rotate: [0, 5, 0]
            }}
            transition={{ 
              repeat: Infinity, 
              duration: 5 + i,
              delay: i * 0.6 
            }}
            style={{
              left: `${10 + (i * 22) % 75}%`,
              top: `${8 + (i * 28) % 65}%`,
            }}
          >
            {emoji}
          </motion.span>
        ))}
      </div>
      
      <div className="relative h-full flex flex-col items-center justify-center px-6 pb-28">
        
        <VinylDisc
          templateId={post.templateId}
          emoji={post.emoji}
          gradient={post.gradient}
          isPlaying={isPlaying}
          progress={progress}
          amplitude={amplitude}
          size={300}
        />
        
        <div className="mt-8">
          <AudioWaveform isPlaying={isPlaying} />
        </div>
        
        <motion.div 
          className="mt-8 text-center max-w-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-3xl font-bold text-white drop-shadow-2xl mb-2">
            {post.titleFr}
          </h2>
          <p className="text-white/80 text-lg flex items-center justify-center gap-2">
            <MapPin className="w-5 h-5" />
            {post.authorName} • {post.authorVillage}
          </p>
        </motion.div>
        
        {post.transcript && (
          <motion.div 
            className="mt-6 max-w-lg bg-black/40 backdrop-blur-md rounded-3xl p-5 shadow-2xl"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
          >
            <p className="text-white/95 text-center text-base leading-relaxed">
              "{post.transcript}"
            </p>
          </motion.div>
        )}
        
        <div className="mt-8 flex items-center gap-6 text-white">
          <span className="text-base font-medium opacity-80">{formatTime(currentTime)}</span>
          
          <button
            onClick={(e) => { e.stopPropagation(); skip(-10); }}
            className="w-12 h-12 rounded-full bg-white/25 backdrop-blur-md flex items-center justify-center hover:bg-white/35 transition-colors"
          >
            <SkipBack className="w-5 h-5" fill="white" />
          </button>
          
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={(e) => { e.stopPropagation(); togglePlay(); }}
            className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-2xl hover:scale-105 transition-transform"
          >
            {isPlaying ? (
              <Pause className="w-10 h-10 text-gray-800" fill="currentColor" />
            ) : (
              <Play className="w-10 h-10 text-gray-800 ml-1" fill="currentColor" />
            )}
          </motion.button>
          
          <button
            onClick={(e) => { e.stopPropagation(); skip(10); }}
            className="w-12 h-12 rounded-full bg-white/25 backdrop-blur-md flex items-center justify-center hover:bg-white/35 transition-colors"
          >
            <SkipForward className="w-5 h-5" fill="white" />
          </button>
          
          <span className="text-base font-medium opacity-80">{formatTime(post.duration)}</span>
        </div>
        
        <div className="mt-5 flex items-center gap-4">
          <button
            onClick={(e) => { e.stopPropagation(); cyclePlaybackRate(); }}
            className="px-4 py-2 rounded-full bg-white/25 backdrop-blur-md text-white text-sm font-bold flex items-center gap-2 hover:bg-white/35 transition-colors"
          >
            {playbackRate === 0.75 && <Turtle className="w-4 h-4" />}
            {playbackRate === 1.5 && <Rabbit className="w-4 h-4" />}
            {playbackRate}x
          </button>
          
          <button
            onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); if(audioRef.current) audioRef.current.muted = !isMuted; }}
            className="w-11 h-11 rounded-full bg-white/25 backdrop-blur-md flex items-center justify-center hover:bg-white/35 transition-colors"
          >
            {isMuted ? <VolumeX className="w-5 h-5 text-white" /> : <Volume2 className="w-5 h-5 text-white" />}
          </button>
        </div>
      </div>
      
      <div className="absolute right-4 bottom-36 flex flex-col gap-5">
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={(e) => { e.stopPropagation(); handleLike(); }}
          className={`w-16 h-16 rounded-full backdrop-blur-xl flex flex-col items-center justify-center shadow-xl transition-all ${
            isLiked ? 'bg-red-500' : 'bg-white/25 hover:bg-white/35'
          }`}
        >
          <Heart className={`w-8 h-8 ${isLiked ? 'text-white' : 'text-white'}`} fill={isLiked ? 'white' : 'none'} />
          <span className="text-white text-xs font-bold mt-0.5">{post.likes + (isLiked ? 1 : 0)}</span>
        </motion.button>
        
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={(e) => { e.stopPropagation(); onReply(); }}
          className="w-16 h-16 rounded-full bg-white/25 backdrop-blur-xl flex flex-col items-center justify-center shadow-xl hover:bg-white/35 transition-all"
        >
          <Mic className="w-8 h-8 text-white" />
          <span className="text-white text-xs font-bold mt-0.5">{post.replies}</span>
        </motion.button>
        
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={(e) => { e.stopPropagation(); onShare(); }}
          className="w-16 h-16 rounded-full bg-white/25 backdrop-blur-xl flex flex-col items-center justify-center shadow-xl hover:bg-white/35 transition-all"
        >
          <Share2 className="w-8 h-8 text-white" />
          <span className="text-white text-xs font-bold mt-0.5">{post.shares}</span>
        </motion.button>
        
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={(e) => { e.stopPropagation(); handleSave(); }}
          className={`w-16 h-16 rounded-full backdrop-blur-xl flex items-center justify-center shadow-xl transition-all ${
            isSaved ? 'bg-yellow-500' : 'bg-white/25 hover:bg-white/35'
          }`}
        >
          <Star className={`w-8 h-8 ${isSaved ? 'text-white' : 'text-white'}`} fill={isSaved ? 'white' : 'none'} />
        </motion.button>
      </div>
      
      <motion.div 
        className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center text-white/60 pointer-events-none"
        animate={{ y: [0, 10, 0] }}
        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
      >
        <ChevronUp className="w-7 h-7" />
        <span className="text-sm font-medium">Swipez</span>
      </motion.div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

export default function TamTamAudioFeed() {
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const mockPosts: AudioPost[] = [
    {
      id: '1',
      audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
      duration: 180,
      templateId: 'conte_animaux',
      emoji: '🦁',
      gradient: 'from-amber-500 via-orange-500 to-red-500',
      titleFr: 'Le Lion et la Gazelle',
      titleBa: 'Gàní kà Sèn',
      transcript: 'Il était une fois, dans la savane, un lion très fier qui rencontra une gazelle rusée...',
      authorName: 'Mamadou',
      authorVillage: 'Nikki',
      likes: 342,
      replies: 28,
      shares: 67,
    },
    {
      id: '2',
      audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
      duration: 210,
      templateId: 'musique_fete',
      emoji: '🥁',
      gradient: 'from-fuchsia-500 via-purple-500 to-violet-600',
      titleFr: 'Chant de Mariage Traditionnel',
      titleBa: 'Sùmá Wèn',
      authorName: 'Aïcha',
      authorVillage: 'Parakou',
      likes: 589,
      replies: 45,
      shares: 123,
    },
    {
      id: '3',
      audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
      duration: 120,
      templateId: 'proverbe_sagesse',
      emoji: '🧓',
      gradient: 'from-amber-600 via-yellow-600 to-orange-500',
      titleFr: 'Proverbe du Jour',
      titleBa: 'Kálá Wèn',
      transcript: 'Qui veut voyager loin ménage sa monture',
      authorName: 'Elder Kofi',
      authorVillage: 'Kandi',
      likes: 234,
      replies: 15,
      shares: 45,
    },
  ];

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const itemHeight = container.clientHeight;
      const newIndex = Math.round(scrollTop / itemHeight);
      if (newIndex !== activeIndex && newIndex >= 0 && newIndex < mockPosts.length) {
        setActiveIndex(newIndex);
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [activeIndex, mockPosts.length]);

  return (
    <div className="h-screen w-full bg-black flex flex-col">
      <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/90 via-black/50 to-transparent pt-safe">
        <div className="flex justify-center gap-6 py-5 px-4">
          {[
            { id: 'pour_toi', label: 'Pour toi', icon: Sparkles },
            { id: 'autour', label: 'Autour', icon: MapPin },
            { id: 'communaute', label: 'Communauté', icon: Users },
          ].map((tab, i) => (
            <button
              key={tab.id}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full transition-all ${
                i === 0
                  ? 'bg-white text-black font-bold shadow-lg' 
                  : 'text-white/70 hover:text-white'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="text-sm font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div 
        ref={containerRef}
        className="flex-1 overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
        style={{ scrollSnapType: 'y mandatory' }}
      >
        {mockPosts.map((post, index) => (
          <AudioCard
            key={post.id}
            post={post}
            isActive={index === activeIndex}
            onLike={() => console.log('Like', post.id)}
            onReply={() => console.log('Reply', post.id)}
            onShare={() => console.log('Share', post.id)}
            onSave={() => console.log('Save', post.id)}
          />
        ))}
      </div>
    </div>
  );
}
