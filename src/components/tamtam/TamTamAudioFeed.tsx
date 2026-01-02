import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import {
  Heart, Mic, Share2, Star, MessageCircle, Play, Pause,
  SkipForward, Volume2, VolumeX, ChevronUp, ChevronDown,
  Turtle, Rabbit, X, Check, Trash2, Send, Users, MapPin,
  Sparkles, Radio, Headphones, Wifi, WifiOff
} from 'lucide-react';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';
import { useToast } from '@/hooks/use-toast';
import { triggerFeedback } from '@/utils/tamtamFeedback';

// ═══════════════════════════════════════════════════════════════════════════
// 🎵 TAM-TAM AUDIO FEED - EXPÉRIENCE "TIKTOK + VINYLE + KARAOKÉ"
// ═══════════════════════════════════════════════════════════════════════════
//
// INNOVATION :
// 1. Disque vinyle rotatif généré dynamiquement selon le template
// 2. Feed plein écran avec scroll-snap vertical (swipe = audio suivant)
// 3. Auto-play intelligent avec gestion audio unique
// 4. Progress ring autour du disque
// 5. Actions TikTok-style (like, répondre audio, partager)
// 6. Mode "zéro lecture" avec TTS d'introduction
// 7. Réponse audio en bottom sheet
//
// ═══════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
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
  createdAt: Date;
  isLiked?: boolean;
  isSaved?: boolean;
}

interface TamTamAudioFeedProps {
  posts: AudioPost[];
  onLike: (postId: string) => void;
  onReply: (postId: string, audioBlob: Blob) => void;
  onShare: (postId: string, platform: 'whatsapp' | 'copy') => void;
  onSave: (postId: string) => void;
}

type FeedTab = 'pour_toi' | 'autour' | 'communaute';

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATES VISUELS (mapping des gradients et emojis)
// ═══════════════════════════════════════════════════════════════════════════

const templateVisuals: Record<string, { gradient: string; emoji: string; grooveColor: string }> = {
  // Patrimoine - Contes
  conte_animaux: { gradient: 'from-amber-500 via-orange-500 to-red-500', emoji: '🦁', grooveColor: 'rgba(251,191,36,0.3)' },
  conte_origine: { gradient: 'from-indigo-600 via-purple-600 to-pink-500', emoji: '🌍', grooveColor: 'rgba(139,92,246,0.3)' },
  conte_heros: { gradient: 'from-red-600 via-rose-600 to-pink-500', emoji: '⚔️', grooveColor: 'rgba(244,63,94,0.3)' },
  conte_enfant: { gradient: 'from-pink-400 via-purple-400 to-indigo-400', emoji: '👶', grooveColor: 'rgba(232,121,249,0.3)' },
  conte_ruse: { gradient: 'from-orange-500 via-amber-500 to-yellow-400', emoji: '🦊', grooveColor: 'rgba(251,146,60,0.3)' },
  conte_moral: { gradient: 'from-emerald-500 via-teal-500 to-cyan-500', emoji: '⚖️', grooveColor: 'rgba(20,184,166,0.3)' },
  
  // Patrimoine - Musique
  musique_mariage: { gradient: 'from-pink-500 via-rose-500 to-red-400', emoji: '💒', grooveColor: 'rgba(236,72,153,0.3)' },
  musique_naissance: { gradient: 'from-blue-300 via-indigo-300 to-purple-300', emoji: '👶', grooveColor: 'rgba(165,180,252,0.3)' },
  musique_travail: { gradient: 'from-yellow-500 via-amber-500 to-orange-500', emoji: '🌾', grooveColor: 'rgba(245,158,11,0.3)' },
  musique_funerailles: { gradient: 'from-gray-600 via-slate-600 to-gray-700', emoji: '🕯️', grooveColor: 'rgba(100,116,139,0.3)' },
  musique_fete: { gradient: 'from-fuchsia-500 via-purple-500 to-violet-600', emoji: '🥁', grooveColor: 'rgba(192,38,211,0.3)' },
  musique_initiation: { gradient: 'from-amber-600 via-orange-600 to-red-600', emoji: '👑', grooveColor: 'rgba(217,119,6,0.3)' },
  
  // Patrimoine - Proverbes
  proverbe_sagesse: { gradient: 'from-amber-600 via-yellow-600 to-orange-500', emoji: '🧓', grooveColor: 'rgba(217,119,6,0.3)' },
  proverbe_travail: { gradient: 'from-green-600 via-emerald-600 to-teal-500', emoji: '👨‍🌾', grooveColor: 'rgba(5,150,105,0.3)' },
  proverbe_famille: { gradient: 'from-blue-500 via-indigo-500 to-purple-500', emoji: '👨‍👩‍👧‍👦', grooveColor: 'rgba(99,102,241,0.3)' },
  proverbe_patience: { gradient: 'from-cyan-500 via-blue-500 to-indigo-500', emoji: '⏳', grooveColor: 'rgba(6,182,212,0.3)' },
  proverbe_nature: { gradient: 'from-green-500 via-emerald-500 to-teal-400', emoji: '🌳', grooveColor: 'rgba(16,185,129,0.3)' },
  proverbe_humilite: { gradient: 'from-violet-500 via-purple-500 to-fuchsia-500', emoji: '🙏', grooveColor: 'rgba(139,92,246,0.3)' },
  
  // Village Voice - Alertes
  alerte_meteo: { gradient: 'from-slate-600 via-blue-600 to-cyan-500', emoji: '⛈️', grooveColor: 'rgba(37,99,235,0.3)' },
  alerte_sante: { gradient: 'from-red-600 via-rose-600 to-pink-500', emoji: '🦠', grooveColor: 'rgba(225,29,72,0.3)' },
  alerte_route: { gradient: 'from-orange-600 via-amber-600 to-yellow-500', emoji: '🚧', grooveColor: 'rgba(234,88,12,0.3)' },
  alerte_animaux: { gradient: 'from-lime-600 via-green-600 to-emerald-500', emoji: '🐍', grooveColor: 'rgba(101,163,13,0.3)' },
  alerte_vol: { gradient: 'from-red-700 via-rose-700 to-pink-600', emoji: '🚨', grooveColor: 'rgba(190,18,60,0.3)' },
  
  // Village Voice - Célébrations
  joie_naissance: { gradient: 'from-pink-400 via-rose-400 to-red-300', emoji: '👶', grooveColor: 'rgba(244,114,182,0.3)' },
  joie_mariage: { gradient: 'from-red-400 via-pink-400 to-rose-300', emoji: '💒', grooveColor: 'rgba(251,113,133,0.3)' },
  joie_reussite: { gradient: 'from-indigo-500 via-blue-500 to-cyan-400', emoji: '🎓', grooveColor: 'rgba(99,102,241,0.3)' },
  joie_guerison: { gradient: 'from-green-400 via-emerald-400 to-teal-300', emoji: '💪', grooveColor: 'rgba(52,211,153,0.3)' },
  joie_generale: { gradient: 'from-yellow-400 via-amber-400 to-orange-400', emoji: '🎉', grooveColor: 'rgba(251,191,36,0.3)' },
  
  // Default
  default: { gradient: 'from-slate-500 via-gray-500 to-zinc-500', emoji: '🎙️', grooveColor: 'rgba(100,116,139,0.3)' },
};

// ═══════════════════════════════════════════════════════════════════════════
// COMPOSANT: DISQUE VINYLE DYNAMIQUE
// ═══════════════════════════════════════════════════════════════════════════

interface VinylDiscProps {
  templateId: string;
  emoji: string;
  gradient: string;
  isPlaying: boolean;
  progress: number; // 0-100
  amplitude?: number; // 0-1 pour animation selon le son
  size?: number;
}

const VinylDisc: React.FC<VinylDiscProps> = ({
  templateId,
  emoji,
  gradient,
  isPlaying,
  progress,
  amplitude = 0,
  size = 280
}) => {
  const visual = templateVisuals[templateId] || templateVisuals.default;
  const rotation = useMotionValue(0);
  const animationRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);
  
  // Animation de rotation continue
  useEffect(() => {
    if (isPlaying) {
      const animate = (time: number) => {
        if (lastTimeRef.current) {
          const delta = time - lastTimeRef.current;
          rotation.set(rotation.get() + (delta / 1000) * 15); // ~24 sec/tour
        }
        lastTimeRef.current = time;
        animationRef.current = requestAnimationFrame(animate);
      };
      animationRef.current = requestAnimationFrame(animate);
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      lastTimeRef.current = 0;
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, rotation]);

  const rotateTransform = useTransform(rotation, (r) => `rotate(${r}deg)`);
  
  // Calcul du dasharray pour le progress ring
  const circumference = 2 * Math.PI * (size / 2 - 8);
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* Progress Ring externe */}
      <svg
        className="absolute inset-0 -rotate-90"
        width={size}
        height={size}
      >
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2 - 8}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="6"
        />
        {/* Progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2 - 8}
          fill="none"
          stroke="rgba(255,255,255,0.9)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{ transition: 'stroke-dashoffset 0.3s ease' }}
        />
      </svg>
      
      {/* Glow effet selon amplitude */}
      <motion.div
        className={`absolute inset-4 rounded-full bg-gradient-to-br ${gradient} blur-xl`}
        animate={{
          scale: isPlaying ? 1 + amplitude * 0.15 : 1,
          opacity: isPlaying ? 0.6 + amplitude * 0.2 : 0.4,
        }}
        transition={{ duration: 0.1 }}
      />
      
      {/* Le Vinyle */}
      <motion.div
        className="absolute inset-4 rounded-full overflow-hidden shadow-2xl"
        style={{ transform: rotateTransform }}
      >
        {/* Fond gradient */}
        <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />
        
        {/* Rainures du vinyle (grooves) */}
        <div className="absolute inset-0">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full border"
              style={{
                inset: `${8 + i * 6}%`,
                borderColor: visual.grooveColor,
                borderWidth: i % 3 === 0 ? '2px' : '1px',
              }}
            />
          ))}
        </div>
        
        {/* Reflet qui glisse */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-transparent"
          style={{
            clipPath: 'polygon(0 0, 60% 0, 40% 100%, 0 100%)',
          }}
        />
        
        {/* Centre du disque (label) */}
        <div className="absolute inset-[30%] rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center shadow-inner">
          <motion.span
            className="text-5xl"
            animate={isPlaying ? {
              scale: [1, 1.1, 1],
            } : {}}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            {emoji}
          </motion.span>
        </div>
        
        {/* Trou central */}
        <div className="absolute inset-[46%] rounded-full bg-black shadow-inner" />
      </motion.div>
      
      {/* Aiguille/Bras (optionnel, pour effet authentique) */}
      {isPlaying && (
        <motion.div
          className="absolute -right-2 top-1/4 w-1 h-24 bg-gradient-to-b from-gray-300 to-gray-500 rounded-full origin-top"
          initial={{ rotate: -30 }}
          animate={{ rotate: -15 }}
          transition={{ duration: 0.5 }}
          style={{ transformOrigin: 'top center' }}
        />
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// COMPOSANT: ONDE SONORE ANIMÉE
// ═══════════════════════════════════════════════════════════════════════════

interface AudioWaveformProps {
  isPlaying: boolean;
  barCount?: number;
}

const AudioWaveform: React.FC<AudioWaveformProps> = ({ isPlaying, barCount = 40 }) => {
  return (
    <div className="flex items-center justify-center gap-[2px] h-12">
      {[...Array(barCount)].map((_, i) => (
        <motion.div
          key={i}
          className="w-1 bg-white/60 rounded-full"
          animate={isPlaying ? {
            height: [8, Math.random() * 32 + 16, 8],
          } : { height: 8 }}
          transition={{
            repeat: Infinity,
            duration: 0.4 + Math.random() * 0.3,
            delay: i * 0.02,
          }}
        />
      ))}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// COMPOSANT: CARTE AUDIO PLEIN ÉCRAN
// ═══════════════════════════════════════════════════════════════════════════

interface AudioCardProps {
  post: AudioPost;
  isActive: boolean;
  onLike: () => void;
  onReply: () => void;
  onShare: () => void;
  onSave: () => void;
}

const AudioCard: React.FC<AudioCardProps> = ({
  post,
  isActive,
  onLike,
  onReply,
  onShare,
  onSave
}) => {
  const { currentLang } = useTamTamLanguage();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [amplitude, setAmplitude] = useState(0);
  const [hasPlayedIntro, setHasPlayedIntro] = useState(false);
  
  const visual = templateVisuals[post.templateId] || templateVisuals.default;

  // Auto-play quand la carte devient active
  useEffect(() => {
    if (isActive && audioRef.current) {
      // TTS d'introduction
      if (!hasPlayedIntro) {
        const intro = `${post.titleFr} - ${post.authorVillage}`;
        const utterance = new SpeechSynthesisUtterance(intro);
        utterance.lang = 'fr-FR';
        utterance.rate = 1.1;
        utterance.volume = 0.7;
        utterance.onend = () => {
          audioRef.current?.play();
          setIsPlaying(true);
          setHasPlayedIntro(true);
        };
        window.speechSynthesis.speak(utterance);
        triggerFeedback('notification');
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
    } else if (!isActive && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, [isActive, hasPlayedIntro, post.titleFr, post.authorVillage]);

  // Mise à jour du progress
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateProgress = () => {
      const prog = (audio.currentTime / audio.duration) * 100;
      setProgress(prog);
      setCurrentTime(audio.currentTime);
      
      // Simuler amplitude (en vrai, utiliser Web Audio API)
      setAmplitude(Math.random() * 0.5 + 0.3);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
      // TTS de fin
      const utterance = new SpeechSynthesisUtterance('Swipez pour continuer');
      utterance.lang = 'fr-FR';
      utterance.rate = 1.2;
      utterance.volume = 0.5;
      window.speechSynthesis.speak(utterance);
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
      triggerFeedback('selection');
    }
  };

  const skip = (seconds: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime += seconds;
      triggerFeedback('light');
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
    triggerFeedback('selection');
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleLike = () => {
    onLike();
    triggerFeedback('success');
    // TTS feedback
    const utterance = new SpeechSynthesisUtterance('Ajouté à vos préférences');
    utterance.lang = 'fr-FR';
    utterance.rate = 1.3;
    utterance.volume = 0.6;
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div 
      className="h-screen w-full relative overflow-hidden snap-start snap-always"
      onClick={togglePlay}
    >
      {/* Audio Element */}
      <audio ref={audioRef} src={post.audioUrl} preload="auto" />
      
      {/* Background gradient + blur */}
      <div className={`absolute inset-0 bg-gradient-to-br ${post.gradient}`} />
      <div className="absolute inset-0 backdrop-blur-3xl bg-black/20" />
      
      {/* Emojis watermark en arrière-plan */}
      <div className="absolute inset-0 overflow-hidden opacity-10">
        {post.visualEmojis.map((emoji, i) => (
          <motion.span
            key={i}
            className="absolute text-8xl"
            initial={{ opacity: 0 }}
            animate={{ 
              opacity: [0.3, 0.6, 0.3],
              x: [0, 20, 0],
              y: [0, -10, 0],
            }}
            transition={{ 
              repeat: Infinity, 
              duration: 4 + i,
              delay: i * 0.5 
            }}
            style={{
              left: `${15 + (i * 20) % 70}%`,
              top: `${10 + (i * 25) % 60}%`,
            }}
          >
            {emoji}
          </motion.span>
        ))}
      </div>
      
      {/* Contenu principal */}
      <div className="relative h-full flex flex-col items-center justify-center px-4 pb-24">
        
        {/* Disque Vinyle */}
        <VinylDisc
          templateId={post.templateId}
          emoji={post.emoji}
          gradient={post.gradient}
          isPlaying={isPlaying}
          progress={progress}
          amplitude={amplitude}
          size={280}
        />
        
        {/* Onde sonore */}
        <div className="mt-6">
          <AudioWaveform isPlaying={isPlaying} />
        </div>
        
        {/* Titre et auteur */}
        <motion.div 
          className="mt-6 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-2xl font-bold text-white drop-shadow-lg">
            {currentLang === 'ba' ? post.titleBa : post.titleFr}
          </h2>
          <p className="text-white/70 mt-1 flex items-center justify-center gap-2">
            <MapPin className="w-4 h-4" />
            {post.authorName} • {post.authorVillage}
          </p>
        </motion.div>
        
        {/* Transcription (si disponible et mode lecture activé) */}
        {post.transcript && (
          <motion.div 
            className="mt-4 max-w-sm bg-black/30 backdrop-blur-sm rounded-2xl p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <p className="text-white/90 text-center text-sm leading-relaxed">
              "{post.transcript}"
            </p>
          </motion.div>
        )}
        
        {/* Temps et contrôles */}
        <div className="mt-6 flex items-center gap-6 text-white">
          <span className="text-sm opacity-70">{formatTime(currentTime)}</span>
          
          <button
            onClick={(e) => { e.stopPropagation(); skip(-10); }}
            className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center"
          >
            <span className="text-xs font-bold">-10</span>
          </button>
          
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={(e) => { e.stopPropagation(); togglePlay(); }}
            className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-xl"
          >
            {isPlaying ? (
              <Pause className="w-8 h-8 text-gray-800" />
            ) : (
              <Play className="w-8 h-8 text-gray-800 ml-1" />
            )}
          </motion.button>
          
          <button
            onClick={(e) => { e.stopPropagation(); skip(10); }}
            className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center"
          >
            <span className="text-xs font-bold">+10</span>
          </button>
          
          <span className="text-sm opacity-70">{formatTime(post.duration)}</span>
        </div>
        
        {/* Contrôles secondaires */}
        <div className="mt-4 flex items-center gap-4">
          <button
            onClick={(e) => { e.stopPropagation(); cyclePlaybackRate(); }}
            className="px-3 py-1.5 rounded-full bg-white/20 text-white text-sm font-bold flex items-center gap-1"
          >
            {playbackRate === 0.75 && <Turtle className="w-4 h-4" />}
            {playbackRate === 1.5 && <Rabbit className="w-4 h-4" />}
            {playbackRate}x
          </button>
          
          <button
            onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); if(audioRef.current) audioRef.current.muted = !isMuted; }}
            className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center"
          >
            {isMuted ? <VolumeX className="w-5 h-5 text-white" /> : <Volume2 className="w-5 h-5 text-white" />}
          </button>
          
          <button
            onClick={(e) => e.stopPropagation()}
            className="px-3 py-1.5 rounded-full bg-white/20 text-white text-sm flex items-center gap-1"
          >
            <Headphones className="w-4 h-4" />
            Data faible
          </button>
        </div>
      </div>
      
      {/* Colonne Actions (droite) */}
      <div className="absolute right-4 bottom-32 flex flex-col gap-4">
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={(e) => { e.stopPropagation(); handleLike(); }}
          className={`w-14 h-14 rounded-full backdrop-blur-md flex flex-col items-center justify-center shadow-lg ${
            post.isLiked ? 'bg-red-500' : 'bg-white/20'
          }`}
        >
          <Heart className={`w-7 h-7 ${post.isLiked ? 'text-white fill-white' : 'text-white'}`} />
          <span className="text-white text-xs font-bold">{post.likes}</span>
        </motion.button>
        
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={(e) => { e.stopPropagation(); onReply(); }}
          className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md flex flex-col items-center justify-center shadow-lg"
        >
          <Mic className="w-7 h-7 text-white" />
          <span className="text-white text-xs font-bold">{post.replies}</span>
        </motion.button>
        
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={(e) => { e.stopPropagation(); onShare(); }}
          className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md flex flex-col items-center justify-center shadow-lg"
        >
          <Share2 className="w-7 h-7 text-white" />
          <span className="text-white text-xs font-bold">{post.shares}</span>
        </motion.button>
        
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={(e) => { e.stopPropagation(); onSave(); }}
          className={`w-14 h-14 rounded-full backdrop-blur-md flex items-center justify-center shadow-lg ${
            post.isSaved ? 'bg-yellow-500' : 'bg-white/20'
          }`}
        >
          <Star className={`w-7 h-7 ${post.isSaved ? 'text-white fill-white' : 'text-white'}`} />
        </motion.button>
      </div>
      
      {/* Indicateur swipe */}
      <motion.div 
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center text-white/50"
        animate={{ y: [0, 8, 0] }}
        transition={{ repeat: Infinity, duration: 1.5 }}
      >
        <ChevronUp className="w-6 h-6" />
        <span className="text-xs">Swipez</span>
      </motion.div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// COMPOSANT: BOTTOM SHEET RÉPONSE AUDIO
// ═══════════════════════════════════════════════════════════════════════════

interface ReplySheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (isPublic: boolean) => void;
  postTitle: string;
}

const ReplySheet: React.FC<ReplySheetProps> = ({ isOpen, onClose, onSend, postTitle }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [hasRecording, setHasRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const timerRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (isOpen) {
      // TTS instruction
      const utterance = new SpeechSynthesisUtterance('Enregistrez votre réponse');
      utterance.lang = 'fr-FR';
      utterance.rate = 1.1;
      window.speechSynthesis.speak(utterance);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingTime(t => {
          if (t >= 30) {
            setIsRecording(false);
            setHasRecording(true);
            return t;
          }
          return t + 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isRecording]);

  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      setHasRecording(true);
      setTranscript('Votre message audio a été enregistré...');
      triggerFeedback('success');
    } else {
      setIsRecording(true);
      setRecordingTime(0);
      setHasRecording(false);
      setTranscript('');
      triggerFeedback('notification');
    }
  };

  const reset = () => {
    setIsRecording(false);
    setRecordingTime(0);
    setHasRecording(false);
    setTranscript('');
    triggerFeedback('light');
  };

  const handleSend = (isPublic: boolean) => {
    onSend(isPublic);
    triggerFeedback('success');
    const msg = isPublic ? 'Réponse publiée' : 'Message envoyé';
    const utterance = new SpeechSynthesisUtterance(msg);
    utterance.lang = 'fr-FR';
    window.speechSynthesis.speak(utterance);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 z-50 flex items-end"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25 }}
        onClick={e => e.stopPropagation()}
        className="w-full bg-gradient-to-b from-slate-800 to-slate-900 rounded-t-3xl min-h-[50vh] p-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-white">🎤 Répondre</h3>
            <p className="text-white/60 text-sm">à "{postTitle}"</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Zone d'enregistrement */}
        <div className="flex flex-col items-center py-8">
          {/* Timer */}
          <div className="text-4xl font-mono text-white mb-6">
            {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
            <span className="text-white/40 text-lg ml-2">/ 0:30</span>
          </div>

          {/* Progress bar */}
          <div className="w-full max-w-xs h-2 bg-white/20 rounded-full overflow-hidden mb-8">
            <motion.div 
              className="h-full bg-gradient-to-r from-red-500 to-orange-500"
              initial={{ width: 0 }}
              animate={{ width: `${(recordingTime / 30) * 100}%` }}
            />
          </div>

          {/* Bouton record */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={toggleRecording}
            className={`w-24 h-24 rounded-full flex items-center justify-center shadow-2xl ${
              isRecording 
                ? 'bg-red-500 animate-pulse' 
                : hasRecording 
                  ? 'bg-green-500' 
                  : 'bg-gradient-to-br from-red-500 to-orange-500'
            }`}
          >
            {isRecording ? (
              <div className="w-8 h-8 bg-white rounded-sm" />
            ) : hasRecording ? (
              <Check className="w-10 h-10 text-white" />
            ) : (
              <Mic className="w-10 h-10 text-white" />
            )}
          </motion.button>

          <p className="text-white/60 mt-4">
            {isRecording ? 'Appuyez pour arrêter' : hasRecording ? 'Enregistrement prêt' : 'Appuyez pour parler'}
          </p>
        </div>

        {/* Transcription */}
        {transcript && (
          <div className="bg-white/10 rounded-2xl p-4 mb-6">
            <p className="text-white/80 text-center">{transcript}</p>
          </div>
        )}

        {/* Actions */}
        {hasRecording && (
          <div className="space-y-3">
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => handleSend(true)}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold text-lg flex items-center justify-center gap-2"
            >
              <Users className="w-5 h-5" />
              Réponse publique
            </motion.button>
            
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => handleSend(false)}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-bold text-lg flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-5 h-5" />
              Message privé
            </motion.button>
            
            <button
              onClick={reset}
              className="w-full py-3 text-white/60 flex items-center justify-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Refaire
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL: AUDIO FEED
// ═══════════════════════════════════════════════════════════════════════════

export const TamTamAudioFeed: React.FC<TamTamAudioFeedProps> = ({
  posts,
  onLike,
  onReply,
  onShare,
  onSave
}) => {
  const { currentLang } = useTamTamLanguage();
  const [activeTab, setActiveTab] = useState<FeedTab>('pour_toi');
  const [activeIndex, setActiveIndex] = useState(0);
  const [replyingTo, setReplyingTo] = useState<AudioPost | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const tabs: { id: FeedTab; labelFr: string; labelBa: string; icon: any }[] = [
    { id: 'pour_toi', labelFr: 'Pour toi', labelBa: 'I yé', icon: Sparkles },
    { id: 'autour', labelFr: 'Autour de moi', labelBa: 'N kɛ̀rɛ̀', icon: MapPin },
    { id: 'communaute', labelFr: 'Communauté', labelBa: 'Jàmà', icon: Users },
  ];

  const handleTabChange = (tab: FeedTab) => {
    setActiveTab(tab);
    triggerFeedback('selection');
    
    // TTS du nom de l'onglet
    const tabData = tabs.find(t => t.id === tab);
    if (tabData) {
      const utterance = new SpeechSynthesisUtterance(
        currentLang === 'ba' ? tabData.labelBa : tabData.labelFr
      );
      utterance.lang = 'fr-FR';
      utterance.rate = 1.2;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Détection du scroll snap
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const itemHeight = container.clientHeight;
      const newIndex = Math.round(scrollTop / itemHeight);
      if (newIndex !== activeIndex) {
        setActiveIndex(newIndex);
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [activeIndex]);

  return (
    <div className="h-screen w-full bg-black flex flex-col">
      {/* Header avec onglets */}
      <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/80 to-transparent pt-safe">
        <div className="flex justify-center gap-6 py-4">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                activeTab === tab.id 
                  ? 'bg-white text-black font-bold' 
                  : 'text-white/60'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="text-sm">
                {currentLang === 'ba' ? tab.labelBa : tab.labelFr}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Feed scrollable avec snap */}
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
            onReply={() => setReplyingTo(post)}
            onShare={() => onShare(post.id, 'whatsapp')}
            onSave={() => onSave(post.id)}
          />
        ))}
      </div>

      {/* Bottom Sheet Réponse */}
      <AnimatePresence>
        {replyingTo && (
          <ReplySheet
            isOpen={!!replyingTo}
            onClose={() => setReplyingTo(null)}
            onSend={(isPublic) => {
              // Simuler l'envoi
              console.log(`Réponse ${isPublic ? 'publique' : 'privée'} à ${replyingTo.id}`);
              setReplyingTo(null);
            }}
            postTitle={replyingTo.titleFr}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default TamTamAudioFeed;
