import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Home, Search, MessageCircle, Users, Zap, Heart, Share2, Star, Plus, Mic, ChevronRight, Settings, TrendingUp, Play, Pause, SkipBack, SkipForward, Volume2, Repeat } from 'lucide-react';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';
import { useAudioDescription } from '@/contexts/AudioDescriptionContext';
import { useTamTamPosts, TamTamComment } from '@/hooks/useTamTamPosts';
import { useFeedAlgorithm } from '@/hooks/useFeedAlgorithm';
import { TamTamCommentsModal } from '@/components/tamtam/TamTamCommentsModal';
import { TamTamCreatePost } from '@/components/tamtam/TamTamCreatePost';
import { TamTamCommunities } from '@/components/tamtam/TamTamCommunities';
import { TamTamLiveList } from '@/components/tamtam/TamTamLiveList';
import { TamTamMessagesHub } from '@/components/tamtam/TamTamMessagesHub';
import FullscreenCreator from '@/components/tamtam/FullscreenCreator';
import { triggerFeedback } from '@/utils/tamtamFeedback';
import { useToast } from '@/hooks/use-toast';

// ═══════════════════════════════════════════════════════════════════════════════
// 📱 TAM-TAM SOCIAL V3 - DISQUES TEMPLATES + 3 FEEDS
// ═══════════════════════════════════════════════════════════════════════════════
// Features:
// - 3 Feeds: Patrimoine (audio), Ma Voix (audio), Création (vidéo)
// - Disques vinyle dynamiques selon template
// - Auto-play, scroll-snap, animations TikTok
// - Actions verticales droite (like, répondre, remix, partager, sauver)
// ═══════════════════════════════════════════════════════════════════════════════

type FeedMode = 'patrimoine' | 'mavoix' | 'creation';
type BottomTab = 'fil' | 'chat' | 'groupes' | 'direct';

// ═══════════════════════════════════════════════════════════════════════════════
// SYSTÈME DE TEMPLATES POUR DISQUES
// ═══════════════════════════════════════════════════════════════════════════════

interface DiskTemplate {
  id: string;
  name: string;
  emoji: string;
  gradient: string;
  bgGradient: string;
  accentColor: string;
  decorEmojis: string[];
  category: 'patrimoine' | 'mavoix';
}

const diskTemplates: DiskTemplate[] = [
  // Patrimoine templates
  { id: 'conte', name: 'Conte', emoji: '🦁', gradient: 'from-orange-400 to-orange-600', bgGradient: 'from-orange-500 via-orange-400 to-amber-300', accentColor: '#FF8C42', decorEmojis: ['🦁', '🐘', '🌙', '🌳'], category: 'patrimoine' },
  { id: 'chant', name: 'Chant', emoji: '🥁', gradient: 'from-purple-400 to-purple-600', bgGradient: 'from-purple-600 via-violet-500 to-purple-400', accentColor: '#9B59B6', decorEmojis: ['🥁', '🎉', '💃', '🔥'], category: 'patrimoine' },
  { id: 'proverbe', name: 'Proverbe', emoji: '🧓', gradient: 'from-amber-400 to-amber-600', bgGradient: 'from-amber-500 via-yellow-400 to-orange-300', accentColor: '#F39C12', decorEmojis: ['🧓', '🙏', '✨', '📿'], category: 'patrimoine' },
  { id: 'histoire', name: 'Histoire', emoji: '📜', gradient: 'from-red-400 to-red-600', bgGradient: 'from-red-600 via-rose-500 to-red-400', accentColor: '#E74C3C', decorEmojis: ['📜', '⚔️', '👑', '🏛️'], category: 'patrimoine' },
  { id: 'musique', name: 'Musique', emoji: '🎵', gradient: 'from-pink-400 to-pink-600', bgGradient: 'from-pink-500 via-rose-400 to-pink-300', accentColor: '#E91E63', decorEmojis: ['🎵', '🎶', '🎸', '🎺'], category: 'patrimoine' },
  
  // Ma Voix templates
  { id: 'annonce', name: 'Annonce', emoji: '📢', gradient: 'from-cyan-400 to-cyan-600', bgGradient: 'from-cyan-500 via-teal-400 to-emerald-300', accentColor: '#00BCD4', decorEmojis: ['📢', '🔔', '📣', '💬'], category: 'mavoix' },
  { id: 'question', name: 'Question', emoji: '❓', gradient: 'from-blue-400 to-blue-600', bgGradient: 'from-blue-500 via-indigo-400 to-blue-300', accentColor: '#3498DB', decorEmojis: ['❓', '🤔', '💭', '🧠'], category: 'mavoix' },
  { id: 'celebration', name: 'Célébration', emoji: '🎉', gradient: 'from-yellow-400 to-yellow-600', bgGradient: 'from-yellow-400 via-amber-300 to-orange-200', accentColor: '#F1C40F', decorEmojis: ['🎉', '🎊', '🥳', '✨'], category: 'mavoix' },
  { id: 'urgent', name: 'Urgent', emoji: '🚨', gradient: 'from-red-500 to-red-700', bgGradient: 'from-red-600 via-red-500 to-orange-400', accentColor: '#E74C3C', decorEmojis: ['🚨', '⚠️', '🆘', '❗'], category: 'mavoix' },
  { id: 'merci', name: 'Merci', emoji: '🙏', gradient: 'from-emerald-400 to-emerald-600', bgGradient: 'from-emerald-500 via-teal-400 to-green-300', accentColor: '#2ECC71', decorEmojis: ['🙏', '💚', '🌟', '😊'], category: 'mavoix' },
];

const getTemplateById = (id: string | undefined, category: 'patrimoine' | 'mavoix'): DiskTemplate => {
  const found = diskTemplates.find(t => t.id === id);
  if (found) return found;
  // Default template by category
  return category === 'patrimoine' 
    ? diskTemplates.find(t => t.id === 'conte')!
    : diskTemplates.find(t => t.id === 'annonce')!;
};

// ═══════════════════════════════════════════════════════════════════════════════
// MENU CREATE - 3 OPTIONS
// ═══════════════════════════════════════════════════════════════════════════════

const CreateMenu: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSelectPatrimoine: () => void;
  onSelectMaVoix: () => void;
  onSelectCreateur: () => void;
  currentLang: string;
}> = ({ isOpen, onClose, onSelectPatrimoine, onSelectMaVoix, onSelectCreateur, currentLang }) => (
  <AnimatePresence>
    {isOpen && (
      <>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/60 backdrop-blur-md z-50" />
        <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25 }} className="fixed bottom-0 left-0 right-0 z-50 rounded-t-[32px]" style={{ background: 'linear-gradient(180deg, rgba(30, 30, 40, 0.98) 0%, rgba(20, 20, 28, 0.99) 100%)' }}>
          <div className="flex justify-center pt-3 pb-2"><div className="w-12 h-1.5 rounded-full bg-white/20" /></div>
          <div className="px-6 pb-4 flex items-center justify-between">
            <div className="flex items-center gap-3"><span className="text-3xl">🎙️</span><h2 className="text-white text-xl font-bold">{currentLang === 'ba' ? 'Ìkéde Tuntun' : 'Nouveau message'}</h2></div>
            <motion.button whileTap={{ scale: 0.9 }} onClick={onClose} className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center"><X className="w-6 h-6 text-white" /></motion.button>
          </div>
          <p className="text-center text-white/60 text-sm mb-6">{currentLang === 'ba' ? 'Fọwọ́ kan láti yan' : 'Touchez pour choisir'}</p>
          <div className="px-4 pb-8 space-y-4">
            <motion.button initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} whileTap={{ scale: 0.98 }} onClick={() => { onClose(); onSelectPatrimoine(); }} className="w-full rounded-3xl p-5 flex items-center gap-4" style={{ background: 'linear-gradient(135deg, #FF8C42 0%, #FF5722 100%)' }}>
              <div className="w-20 h-20 rounded-2xl bg-white/20 flex items-center justify-center"><span className="text-5xl">🏛️</span></div>
              <div className="flex-1 text-left"><h3 className="text-white text-2xl font-bold">Patrimoine</h3><p className="text-white/70 text-sm">Culture & Traditions</p><div className="flex gap-1 mt-2">📖🎵💬🌿🏛️</div></div>
            </motion.button>
            <motion.button initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} whileTap={{ scale: 0.98 }} onClick={() => { onClose(); onSelectMaVoix(); }} className="w-full rounded-3xl p-5 flex items-center gap-4" style={{ background: 'linear-gradient(135deg, #26D9B0 0%, #00BCD4 100%)' }}>
              <div className="w-20 h-20 rounded-2xl bg-white/20 flex items-center justify-center"><span className="text-5xl">📢</span></div>
              <div className="flex-1 text-left"><h3 className="text-white text-2xl font-bold">Voix du Village</h3><p className="text-white/70 text-sm">Annonces & Messages</p><div className="flex gap-1 mt-2">📢🙏🎉❓🚨</div></div>
            </motion.button>
            <motion.button initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} whileTap={{ scale: 0.98 }} onClick={() => { onClose(); onSelectCreateur(); }} className="w-full rounded-3xl p-5 flex items-center gap-4" style={{ background: 'linear-gradient(135deg, #7C4DFF 0%, #536DFE 100%)' }}>
              <div className="w-20 h-20 rounded-2xl bg-white/20 flex items-center justify-center"><span className="text-5xl">🎬</span></div>
              <div className="flex-1 text-left"><h3 className="text-white text-2xl font-bold">Créateur</h3><p className="text-white/70 text-sm">Vidéo, Photo, Texte</p><div className="flex gap-1 mt-2">🎥📸✍️🔴</div></div>
            </motion.button>
          </div>
        </motion.div>
      </>
    )}
  </AnimatePresence>
);

// ═══════════════════════════════════════════════════════════════════════════════
// HEADER AVEC 3 ONGLETS DE FEED
// ═══════════════════════════════════════════════════════════════════════════════

const FloatingHeader: React.FC<{
  currentMode: FeedMode;
  onModeChange: (m: FeedMode) => void;
  onMenuOpen: () => void;
  onSearch: () => void;
  currentLang: string;
}> = ({ currentMode, onModeChange, onMenuOpen, onSearch, currentLang }) => {
  const modes: { id: FeedMode; label: string; emoji: string }[] = [
    { id: 'patrimoine', label: 'Patrimoine', emoji: '🏛️' },
    { id: 'mavoix', label: 'Ma Voix', emoji: '📢' },
    { id: 'creation', label: 'Création', emoji: '🎬' },
  ];

  return (
    <div className="fixed top-0 left-0 right-0 z-40 safe-area-top">
      <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-none" />
      <div className="relative px-4 py-3 flex items-center justify-between">
        <motion.button whileTap={{ scale: 0.9 }} onClick={onMenuOpen} className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.1)' }}><Menu className="w-5 h-5 text-white" /></motion.button>
        <div className="flex items-center gap-1 bg-black/30 rounded-full p-1">
          {modes.map((m) => {
            const isActive = currentMode === m.id;
            return (
              <motion.button key={m.id} whileTap={{ scale: 0.95 }} onClick={() => onModeChange(m.id)} className={`relative px-4 py-2 rounded-full transition-all ${isActive ? 'bg-white/20' : ''}`}>
                <span className={`text-sm font-semibold ${isActive ? 'text-white' : 'text-white/60'}`}>{m.emoji} {m.label}</span>
              </motion.button>
            );
          })}
        </div>
        <motion.button whileTap={{ scale: 0.9 }} onClick={onSearch} className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.1)' }}><Search className="w-5 h-5 text-white" /></motion.button>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// BOTTOM NAVIGATION
// ═══════════════════════════════════════════════════════════════════════════════

const BottomNavigation: React.FC<{
  activeTab: BottomTab;
  onTabChange: (t: BottomTab) => void;
  onCreatePress: () => void;
  currentLang: string;
}> = ({ activeTab, onTabChange, onCreatePress, currentLang }) => {
  const tabs: { id: BottomTab; icon: typeof Home; label: string }[] = [
    { id: 'fil', icon: Home, label: 'Fil' },
    { id: 'chat', icon: MessageCircle, label: 'Chat' },
    { id: 'groupes', icon: Users, label: 'Groupes' },
    { id: 'direct', icon: Zap, label: 'Direct' },
  ];

  return (
    <motion.nav initial={{ y: 100 }} animate={{ y: 0 }} className="fixed bottom-0 left-0 right-0 z-40 border-t" style={{ backgroundColor: 'rgba(11,11,11,0.95)', backdropFilter: 'blur(20px)', borderColor: 'rgba(255,255,255,0.1)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex items-end justify-around px-2 pt-2 pb-1">
        {tabs.slice(0, 2).map((t) => { const I = t.icon; const a = activeTab === t.id; return (<motion.button key={t.id} whileTap={{ scale: 0.9 }} onClick={() => onTabChange(t.id)} className="flex flex-col items-center gap-0.5 px-4 py-1.5 min-w-[55px]"><I className={`w-6 h-6 ${a ? 'text-white' : 'text-white/50'}`} /><span className={`text-[10px] font-medium ${a ? 'text-white' : 'text-white/50'}`}>{t.label}</span></motion.button>); })}
        <motion.button whileTap={{ scale: 0.9 }} onClick={onCreatePress} className="relative -mt-5"><div className="relative w-14 h-10 rounded-lg overflow-hidden shadow-xl"><div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-cyan-500" /><div className="absolute inset-0 bg-gradient-to-r from-[#FF7A00] to-red-500" style={{ clipPath: 'polygon(35% 0, 100% 0, 100% 100%, 15% 100%)' }} /><div className="absolute inset-0 flex items-center justify-center"><Plus className="w-6 h-6 text-white" strokeWidth={3} /></div></div></motion.button>
        {tabs.slice(2).map((t) => { const I = t.icon; const a = activeTab === t.id; return (<motion.button key={t.id} whileTap={{ scale: 0.9 }} onClick={() => onTabChange(t.id)} className="flex flex-col items-center gap-0.5 px-4 py-1.5 min-w-[55px]"><I className={`w-6 h-6 ${a ? 'text-white' : 'text-white/50'}`} /><span className={`text-[10px] font-medium ${a ? 'text-white' : 'text-white/50'}`}>{t.label}</span></motion.button>); })}
      </div>
    </motion.nav>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// AUDIO FEED CARD - DISQUE VINYLE AVEC TEMPLATE
// ═══════════════════════════════════════════════════════════════════════════════

const AudioFeedCard: React.FC<{
  post: any;
  isActive: boolean;
  category: 'patrimoine' | 'mavoix';
  onLike: () => void;
  onReply: () => void;
  onShare: () => void;
  onSave: () => void;
}> = ({ post, isActive, category, onLike, onReply, onShare, onSave }) => {
  const template = getTemplateById(post.template_id, category);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const duration = post.duration_seconds || 60;

  useEffect(() => {
    if (isActive && audioRef.current) {
      audioRef.current.play().catch(() => {});
      setIsPlaying(true);
    } else if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, [isActive]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const update = () => {
      setProgress((audio.currentTime / audio.duration) * 100 || 0);
      setCurrentTime(audio.currentTime);
    };
    audio.addEventListener('timeupdate', update);
    return () => audio.removeEventListener('timeupdate', update);
  }, []);

  const togglePlay = () => {
    if (audioRef.current) {
      isPlaying ? audioRef.current.pause() : audioRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  const skip = (sec: number) => {
    if (audioRef.current) audioRef.current.currentTime += sec;
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  return (
    <div className="h-screen w-full snap-start snap-always relative overflow-hidden">
      {post.audio_url && <audio ref={audioRef} src={post.audio_url} loop />}
      
      {/* Background gradient from template */}
      <div className={`absolute inset-0 bg-gradient-to-br ${template.bgGradient}`} />
      
      {/* Decorative emojis floating */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {template.decorEmojis.map((e, i) => (
          <motion.span
            key={i}
            className="absolute text-4xl opacity-30"
            style={{ left: `${10 + i * 25}%`, top: `${10 + (i % 2) * 70}%` }}
            animate={{ y: [0, -20, 0], rotate: [0, 10, -10, 0] }}
            transition={{ repeat: Infinity, duration: 4 + i, delay: i * 0.5 }}
          >
            {e}
          </motion.span>
        ))}
      </div>

      {/* Main content - Centered */}
      <div className="absolute inset-0 flex flex-col items-center justify-center px-8">
        
        {/* Vinyl Disk */}
        <div className="relative mb-6">
          {/* Glow */}
          {isPlaying && (
            <motion.div
              className="absolute -inset-8 rounded-full"
              style={{ background: `radial-gradient(circle, ${template.accentColor}40 0%, transparent 70%)` }}
              animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.8, 0.5] }}
              transition={{ repeat: Infinity, duration: 2 }}
            />
          )}
          
          {/* Disk container */}
          <motion.div
            className="relative w-56 h-56"
            animate={isPlaying ? { rotate: 360 } : { rotate: 0 }}
            transition={{ repeat: Infinity, duration: 4, ease: 'linear' }}
          >
            {/* Vinyl base with gradient */}
            <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${template.gradient} shadow-2xl`}>
              {/* Grooves (rainures) */}
              {[...Array(12)].map((_, i) => (
                <div key={i} className="absolute rounded-full border border-black/10" style={{ inset: `${8 + i * 6}%` }} />
              ))}
              
              {/* Center label with emoji */}
              <div className="absolute inset-[30%] rounded-full bg-white/90 shadow-inner flex items-center justify-center">
                <span className="text-5xl">{template.emoji}</span>
              </div>
              
              {/* Reflection */}
              <div className="absolute inset-0 rounded-full" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.3) 0%, transparent 50%)' }} />
            </div>
            
            {/* Progress ring */}
            <svg className="absolute inset-0 w-full h-full -rotate-90">
              <circle cx="50%" cy="50%" r="48%" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="8" />
              <circle
                cx="50%" cy="50%" r="48%" fill="none"
                stroke="white" strokeWidth="8" strokeLinecap="round"
                strokeDasharray={`${progress * 3.02} 302`}
              />
            </svg>
          </motion.div>

          {/* Tonearm */}
          <motion.div
            className="absolute -right-4 top-0 w-20 h-2 origin-right"
            animate={{ rotate: isPlaying ? -25 : -45 }}
            transition={{ type: 'spring', stiffness: 100 }}
          >
            <div className="w-full h-full bg-gradient-to-r from-gray-400 to-gray-300 rounded-full shadow-lg" />
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow" />
          </motion.div>
        </div>

        {/* Waveform visualization */}
        <div className="flex justify-center gap-0.5 mb-6 h-8">
          {[...Array(40)].map((_, i) => (
            <motion.div
              key={i}
              className="w-1 rounded-full"
              style={{ backgroundColor: 'rgba(255,255,255,0.6)' }}
              animate={isPlaying ? { height: [4, Math.random() * 30 + 5, 4] } : { height: 4 }}
              transition={{ repeat: Infinity, duration: 0.4 + Math.random() * 0.3, delay: i * 0.02 }}
            />
          ))}
        </div>

        {/* Title */}
        <h2 className="text-white text-2xl font-bold text-center mb-2">
          {post.title || post.transcript_fr?.slice(0, 40) || template.name}
        </h2>
        
        {/* Author & Location */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-white/70">📍</span>
          <span className="text-white/80">{post.profile?.display_name || 'Utilisateur'}</span>
          <span className="text-white/50">•</span>
          <span className="text-white/60">{post.location_name || 'Ma communauté'}</span>
        </div>

        {/* Transcript box */}
        {post.transcript_fr && (
          <div className="max-w-sm rounded-2xl p-4 mb-6" style={{ background: 'rgba(0,0,0,0.3)' }}>
            <p className="text-white/90 text-center text-sm leading-relaxed">"{post.transcript_fr.slice(0, 150)}..."</p>
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center gap-4 mb-4">
          <span className="text-white/70 text-sm w-12 text-right">{formatTime(currentTime)}</span>
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => skip(-10)} className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
            <SkipBack className="w-5 h-5 text-white" />
          </motion.button>
          <motion.button whileTap={{ scale: 0.9 }} onClick={togglePlay} className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-xl">
            {isPlaying ? <Pause className="w-10 h-10 text-gray-800" /> : <Play className="w-10 h-10 text-gray-800 ml-1" />}
          </motion.button>
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => skip(10)} className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
            <SkipForward className="w-5 h-5 text-white" />
          </motion.button>
          <span className="text-white/70 text-sm w-12">{formatTime(duration)}</span>
        </div>

        {/* Speed & Volume */}
        <div className="flex items-center gap-3">
          <motion.button whileTap={{ scale: 0.95 }} className="px-4 py-2 rounded-full bg-white/20 text-white text-sm font-medium">1x</motion.button>
          <motion.button whileTap={{ scale: 0.95 }} className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <Volume2 className="w-5 h-5 text-white" />
          </motion.button>
        </div>
      </div>

      {/* Right side actions (TikTok style) */}
      <div className="absolute right-4 bottom-32 flex flex-col items-center gap-6">
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => { setIsLiked(!isLiked); onLike(); }} className="flex flex-col items-center">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center ${isLiked ? 'bg-red-500' : 'bg-white/20'}`}>
            <Heart className={`w-7 h-7 ${isLiked ? 'text-white fill-white' : 'text-white'}`} />
          </div>
          <span className="text-white text-xs mt-1">{post.reactions_count || 0}</span>
        </motion.button>
        
        <motion.button whileTap={{ scale: 0.9 }} onClick={onReply} className="flex flex-col items-center">
          <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
            <Mic className="w-7 h-7 text-white" />
          </div>
          <span className="text-white text-xs mt-1">Répondre</span>
        </motion.button>
        
        <motion.button whileTap={{ scale: 0.9 }} className="flex flex-col items-center">
          <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
            <Repeat className="w-7 h-7 text-white" />
          </div>
          <span className="text-white text-xs mt-1">Remix</span>
        </motion.button>
        
        <motion.button whileTap={{ scale: 0.9 }} onClick={onShare} className="flex flex-col items-center">
          <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
            <Share2 className="w-7 h-7 text-white" />
          </div>
          <span className="text-white text-xs mt-1">Partager</span>
        </motion.button>
        
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => { setIsSaved(!isSaved); onSave(); }} className="flex flex-col items-center">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center ${isSaved ? 'bg-amber-500' : 'bg-white/20'}`}>
            <Star className={`w-7 h-7 ${isSaved ? 'text-white fill-white' : 'text-white'}`} />
          </div>
          <span className="text-white text-xs mt-1">{isSaved ? 'Sauvé' : 'Sauver'}</span>
        </motion.button>
      </div>

      {/* Bottom FAB for voice reply */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={onReply}
        className="absolute right-4 bottom-20 w-14 h-14 rounded-full bg-gradient-to-br from-[#FF7A00] to-[#FF5500] flex items-center justify-center shadow-xl"
      >
        <Mic className="w-7 h-7 text-white" />
        <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-white flex items-center justify-center">
          <Plus className="w-3 h-3 text-[#FF7A00]" strokeWidth={3} />
        </span>
      </motion.button>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// VIDEO FEED CARD
// ═══════════════════════════════════════════════════════════════════════════════

const VideoFeedCard: React.FC<{
  post: any;
  isActive: boolean;
  onLike: () => void;
  onComment: () => void;
  onShare: () => void;
}> = ({ post, isActive, onLike, onComment, onShare }) => {
  const [isLiked, setIsLiked] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (isActive && videoRef.current) {
      videoRef.current.play().catch(() => {});
    } else if (videoRef.current) {
      videoRef.current.pause();
    }
  }, [isActive]);

  return (
    <div className="h-screen w-full snap-start snap-always relative bg-black">
      {post.media_url ? (
        <video ref={videoRef} src={post.media_url} loop muted playsInline className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center" style={{ background: `linear-gradient(135deg, hsl(${(post.id?.charCodeAt(0) || 0) * 10 % 360}, 50%, 20%) 0%, #0B0B0B 100%)` }}>
          <span className="text-8xl">{post.feeling_emoji || '🎬'}</span>
        </div>
      )}
      
      {/* Bottom info */}
      <div className="absolute bottom-20 left-0 right-20 px-4" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%)' }}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#FF7A00] to-[#FF5500] border-2 border-white flex items-center justify-center overflow-hidden">
            <span className="text-xl">👤</span>
          </div>
          <span className="text-white font-bold">@{post.profile?.username || 'creator'}</span>
          <motion.button whileTap={{ scale: 0.95 }} className="px-4 py-1.5 rounded-full bg-[#FF7A00] text-white text-xs font-bold">Suivre</motion.button>
        </div>
        <p className="text-white text-sm mb-2">{post.transcript_fr || 'Création vidéo'}</p>
        <p className="text-white/60 text-xs">#TAM-TAM #Création</p>
      </div>

      {/* Right actions */}
      <div className="absolute right-4 bottom-32 flex flex-col items-center gap-5">
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => { setIsLiked(!isLiked); onLike(); }} className="flex flex-col items-center">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isLiked ? 'bg-red-500' : 'bg-black/40'}`}>
            <Heart className={`w-6 h-6 ${isLiked ? 'text-white fill-white' : 'text-white'}`} />
          </div>
          <span className="text-white text-xs mt-1">{post.reactions_count || 0}</span>
        </motion.button>
        <motion.button whileTap={{ scale: 0.9 }} onClick={onComment} className="flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-black/40 flex items-center justify-center"><MessageCircle className="w-6 h-6 text-white" /></div>
          <span className="text-white text-xs mt-1">{post.comments_count || 0}</span>
        </motion.button>
        <motion.button whileTap={{ scale: 0.9 }} onClick={onShare} className="flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-black/40 flex items-center justify-center"><Share2 className="w-6 h-6 text-white" /></div>
          <span className="text-white text-xs mt-1">Partager</span>
        </motion.button>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export default function TamTamSocial() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, currentLang } = useTamTamLanguage();
  const { announceScreen } = useAudioDescription();
  const { toast } = useToast();
  const { posts, isLoading, createPost, addReaction, fetchComments, fetchPosts } = useTamTamPosts();
  const { rankPosts } = useFeedAlgorithm({ prioritizeUtility: true, prioritizeCulture: true });

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<BottomTab>('fil');
  const [feedMode, setFeedMode] = useState<FeedMode>('patrimoine');
  const [showSearch, setShowSearch] = useState(false);
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [showCreator, setShowCreator] = useState(false);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [createPostType, setCreatePostType] = useState<'patrimoine' | 'mavoix'>('patrimoine');
  const [currentPostIndex, setCurrentPostIndex] = useState(0);
  const [commentsModal, setCommentsModal] = useState<{ isOpen: boolean; postId: string | null; comments: TamTamComment[]; isLoading: boolean }>({ isOpen: false, postId: null, comments: [], isLoading: false });

  useEffect(() => { announceScreen('social'); }, [announceScreen]);

  const handleNavigate = useCallback((p: string) => { triggerFeedback('click'); navigate(p); }, [navigate]);
  
  const handleShare = useCallback((postId: string) => {
    triggerFeedback('send');
    if (navigator.share) navigator.share({ title: 'TAM-TAM', url: window.location.href });
    else { navigator.clipboard.writeText(window.location.href); toast({ title: "🔗 Copié!" }); }
  }, [toast]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const idx = Math.round(e.currentTarget.scrollTop / window.innerHeight);
    if (idx !== currentPostIndex) setCurrentPostIndex(idx);
  }, [currentPostIndex]);

  // Filter posts by category
  const patrimoinePosts = useMemo(() => posts.filter(p => (p as any).topic === 'patrimoine' || (p as any).topic === 'culture'), [posts]);
  const maVoixPosts = useMemo(() => posts.filter(p => (p as any).topic === 'mavoix' || (p as any).topic === 'annonce'), [posts]);
  const creationPosts = useMemo(() => posts.filter(p => (p as any).media_type === 'video' || (p as any).media_type === 'photo'), [posts]);

  const getCurrentPosts = () => {
    switch (feedMode) {
      case 'patrimoine': return patrimoinePosts.length > 0 ? patrimoinePosts : posts.slice(0, 5);
      case 'mavoix': return maVoixPosts.length > 0 ? maVoixPosts : posts.slice(0, 5);
      case 'creation': return creationPosts.length > 0 ? creationPosts : posts.slice(0, 5);
    }
  };

  return (
    <div className="fixed inset-0" style={{ background: '#0B0B0B' }}>
      <FloatingHeader currentMode={feedMode} onModeChange={setFeedMode} onMenuOpen={() => setIsMenuOpen(true)} onSearch={() => setShowSearch(true)} currentLang={currentLang} />

      <AnimatePresence mode="wait">
        {activeTab === 'fil' && (
          <motion.div key="fil" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide" onScroll={handleScroll}>
            {isLoading ? (
              <div className="h-screen flex items-center justify-center">
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-10 h-10 border-3 border-[#FF7A00] border-t-transparent rounded-full" />
              </div>
            ) : getCurrentPosts().length > 0 ? (
              feedMode === 'creation' ? (
                getCurrentPosts().map((post, i) => (
                  <VideoFeedCard key={post.id} post={post} isActive={i === currentPostIndex} onLike={() => addReaction(post.id, 'like')} onComment={() => {}} onShare={() => handleShare(post.id)} />
                ))
              ) : (
                getCurrentPosts().map((post, i) => (
                  <AudioFeedCard key={post.id} post={post} isActive={i === currentPostIndex} category={feedMode === 'patrimoine' ? 'patrimoine' : 'mavoix'} onLike={() => addReaction(post.id, 'like')} onReply={() => setShowCreateMenu(true)} onShare={() => handleShare(post.id)} onSave={() => triggerFeedback('success')} />
                ))
              )
            ) : (
              <div className="h-screen flex flex-col items-center justify-center px-8">
                <span className="text-8xl mb-6">{feedMode === 'patrimoine' ? '🏛️' : feedMode === 'mavoix' ? '📢' : '🎬'}</span>
                <p className="text-white text-xl font-bold mb-2">Aucun contenu {feedMode}</p>
                <p className="text-white/60 text-center mb-6">Soyez le premier à partager!</p>
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowCreateMenu(true)} className="px-6 py-3 rounded-full bg-[#FF7A00] text-white font-bold">Créer</motion.button>
              </div>
            )}
          </motion.div>
        )}
        {activeTab === 'chat' && <motion.div key="chat" className="pt-16 pb-16 h-full"><TamTamMessagesHub isOpen={true} onClose={() => setActiveTab('fil')} /></motion.div>}
        {activeTab === 'groupes' && <motion.div key="groupes" className="pt-16 pb-16 h-full"><TamTamCommunities /></motion.div>}
        {activeTab === 'direct' && <motion.div key="direct" className="pt-16 pb-16 h-full"><TamTamLiveList /></motion.div>}
      </AnimatePresence>

      <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} onCreatePress={() => setShowCreateMenu(true)} currentLang={currentLang} />

      <CreateMenu isOpen={showCreateMenu} onClose={() => setShowCreateMenu(false)} onSelectPatrimoine={() => { setCreatePostType('patrimoine'); setShowCreatePost(true); }} onSelectMaVoix={() => { setCreatePostType('mavoix'); setShowCreatePost(true); }} onSelectCreateur={() => setShowCreator(true)} currentLang={currentLang} />

      <TamTamCreatePost isOpen={showCreatePost} onClose={() => setShowCreatePost(false)} onSubmit={async (data) => { await createPost({ ...data, topic: createPostType }); toast({ title: "✅ Publié!" }); fetchPosts(); }} onOpenPoll={() => {}} />

      <FullscreenCreator isOpen={showCreator} onClose={() => setShowCreator(false)} onComplete={async (d) => { await createPost({ audio_url: d.audio_url, media_type: d.media_type, media_url: d.media_url, transcript_fr: d.transcript_fr || '', transcript_ba: d.transcript_ba || '', topic: d.topic, template_id: d.template_id, duration_seconds: d.duration_seconds }); toast({ title: "✅ Publié!" }); fetchPosts(); setShowCreator(false); }} />

      <TamTamCommentsModal isOpen={commentsModal.isOpen} onClose={() => setCommentsModal(prev => ({ ...prev, isOpen: false }))} comments={commentsModal.comments} onAddComment={async () => {}} isLoading={commentsModal.isLoading} />
    </div>
  );
}

export { TamTamSocial };
