import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { Menu, X, Home, MessageCircle, Users, Zap, Heart, Share2, Bookmark, Plus, Mic, Play, Pause, SkipBack, SkipForward, Volume2, ChevronRight, RefreshCw, UserPlus, Clock } from 'lucide-react';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';
import { useTamTamPosts, TamTamComment, uploadMediaToStorage } from '@/hooks/useTamTamPosts';
import { useVideoFeed } from '@/hooks/useVideoFeed';
import { TamTamCommentsModal } from '@/components/tamtam/TamTamCommentsModal';
import { TamTamCreatePost } from '@/components/tamtam/TamTamCreatePost';
import { TamTamCommunities } from '@/components/tamtam/TamTamCommunities';
import { TamTamLiveList } from '@/components/tamtam/TamTamLiveList';
import { TamTamMessagesHub } from '@/components/tamtam/TamTamMessagesHub';
import FullscreenCreator from '@/components/tamtam/FullscreenCreator';
import { triggerFeedback } from '@/utils/tamtamFeedback';
import { useToast } from '@/hooks/use-toast';
import { useSideMenu } from '@/pages/fitila/FitilaApp';
import { supabase } from '@/integrations/supabase/client';

// ═══════════════════════════════════════════════════════════════════════════════
// 📱 FITILA SOCIAL V8 - AVEC UPLOAD MEDIA + HEURES DE PUBLICATION
// ═══════════════════════════════════════════════════════════════════════════════

type FeedMode = 'patrimoine' | 'mavoix' | 'creation';
type BottomTab = 'fil' | 'chat' | 'groupes' | 'direct';

// Plus de musique par défaut - uniquement les audios enregistrés/sélectionnés par l'utilisateur

// Helper pour formater la date/heure de publication
const formatPublicationDate = (dateString: string | null): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const months = ['janv.', 'fév.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${day} ${month} ${year}, ${hours}:${minutes}`;
};

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPLATES POUR DISQUES VINYLE
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
  { id: 'conte', name: 'Conte', emoji: '🦁', gradient: 'from-orange-400 to-orange-600', bgGradient: 'from-orange-500 via-orange-400 to-amber-300', accentColor: '#FF8C42', decorEmojis: ['🦁', '🐘', '🌙'], category: 'patrimoine' },
  { id: 'chant', name: 'Chant', emoji: '🥁', gradient: 'from-purple-400 to-purple-600', bgGradient: 'from-purple-600 via-violet-500 to-purple-400', accentColor: '#9B59B6', decorEmojis: ['🥁', '🎉', '💃'], category: 'patrimoine' },
  { id: 'proverbe', name: 'Proverbe', emoji: '🧓', gradient: 'from-amber-400 to-amber-600', bgGradient: 'from-amber-500 via-yellow-400 to-orange-300', accentColor: '#F39C12', decorEmojis: ['🧓', '🙏', '✨'], category: 'patrimoine' },
  { id: 'annonce', name: 'Annonce', emoji: '📢', gradient: 'from-cyan-400 to-cyan-600', bgGradient: 'from-cyan-500 via-teal-400 to-emerald-300', accentColor: '#00BCD4', decorEmojis: ['📢', '🔔', '💬'], category: 'mavoix' },
  { id: 'question', name: 'Question', emoji: '❓', gradient: 'from-blue-400 to-blue-600', bgGradient: 'from-blue-500 via-indigo-400 to-blue-300', accentColor: '#3498DB', decorEmojis: ['❓', '🤔', '💭'], category: 'mavoix' },
  { id: 'merci', name: 'Merci', emoji: '🙏', gradient: 'from-emerald-400 to-emerald-600', bgGradient: 'from-emerald-500 via-teal-400 to-green-300', accentColor: '#2ECC71', decorEmojis: ['🙏', '💚', '🌟'], category: 'mavoix' },
];

const getTemplateById = (id: string | undefined, category: 'patrimoine' | 'mavoix'): DiskTemplate => {
  const found = diskTemplates.find(t => t.id === id);
  if (found) return found;
  return category === 'patrimoine' ? diskTemplates[0] : diskTemplates[3];
};

// ═══════════════════════════════════════════════════════════════════════════════
// MENU CREATE INTELLIGENT (SANS RÉPÉTITION)
// ═══════════════════════════════════════════════════════════════════════════════

const CreateMenu: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  currentFeed: FeedMode;
  onSelectPatrimoine: () => void;
  onSelectMaVoix: () => void;
  onSelectCreateur: () => void;
  currentLang: string;
}> = ({ isOpen, onClose, currentFeed, onSelectPatrimoine, onSelectMaVoix, onSelectCreateur, currentLang }) => {
  
  // ✅ FIX: Toujours afficher les 3 options (Patrimoine, Voix du Village, Création)
  const options = useMemo(() => {
    return [
      { id: 'patrimoine', emoji: '🏛️', label: 'Patrimoine', labelBa: 'Kpààrà', desc: 'Culture & Traditions', gradient: 'from-[#FF8C42] to-[#FF5722]', icons: '📖🎵💬🌿', action: onSelectPatrimoine },
      { id: 'mavoix', emoji: '📢', label: 'Voix du Village', labelBa: 'Kùú dɔ̀ɔ̀rɔ̀', desc: 'Annonces & Messages', gradient: 'from-[#26D9B0] to-[#00BCD4]', icons: '📢🙏🎉❓', action: onSelectMaVoix },
      { id: 'creation', emoji: '🎬', label: 'Création', labelBa: 'Ìṣẹ̀dá', desc: 'Vidéo, Photo, Journal', gradient: 'from-[#7C4DFF] to-[#536DFE]', icons: '🎥📸📺✨', action: onSelectCreateur },
    ];
  }, [onSelectPatrimoine, onSelectMaVoix, onSelectCreateur]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/60 backdrop-blur-md z-50" />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25 }}
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-[32px]"
            style={{ background: 'linear-gradient(180deg, rgba(30, 30, 40, 0.98) 0%, rgba(20, 20, 28, 0.99) 100%)' }}
          >
            <div className="flex justify-center pt-3 pb-2"><div className="w-12 h-1.5 rounded-full bg-white/20" /></div>
            
            <div className="px-6 pb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl">🎙️</span>
                <div>
                  <h2 className="text-white text-xl font-bold">{currentLang === 'ba' ? 'Ṣẹ̀dá Tuntun' : 'Créer'}</h2>
                  <p className="text-white/50 text-sm">{currentLang === 'ba' ? 'Yan ọ̀kan' : 'Choisissez une option'}</p>
                </div>
              </div>
              <motion.button whileTap={{ scale: 0.9 }} onClick={onClose} className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                <X className="w-6 h-6 text-white" />
              </motion.button>
            </div>

            <div className="px-4 pb-8 space-y-3">
              {options.map((opt, i) => (
                <motion.button
                  key={opt.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => { onClose(); opt.action(); }}
                  className={`w-full rounded-2xl p-4 flex items-center gap-4 bg-gradient-to-r ${opt.gradient}`}
                >
                  <div className="w-16 h-16 rounded-xl bg-white/20 flex items-center justify-center">
                    <span className="text-4xl">{opt.emoji}</span>
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="text-white text-xl font-bold">{currentLang === 'ba' ? opt.labelBa : opt.label}</h3>
                    <p className="text-white/70 text-sm">{opt.desc}</p>
                    <p className="text-lg mt-1">{opt.icons}</p>
                  </div>
                  <ChevronRight className="w-6 h-6 text-white/70" />
                </motion.button>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// FEED HEADER SIMPLE - TRANSPARENT MINIMAL AVEC SWIPE INDICATOR
// ═══════════════════════════════════════════════════════════════════════════════

const FeedIndicator: React.FC<{ 
  currentFeed: FeedMode; 
  onMenuOpen: () => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
}> = ({ currentFeed, onMenuOpen, onSwipeLeft, onSwipeRight }) => {
  const feedLabels: Record<FeedMode, { icon: string; label: string }> = {
    patrimoine: { icon: '🏛️', label: 'Patrimoine' },
    mavoix: { icon: '📢', label: 'Ma Voix' },
    creation: { icon: '🎬', label: 'Création' },
  };

  const feedOrder: FeedMode[] = ['patrimoine', 'mavoix', 'creation'];
  const currentIndex = feedOrder.indexOf(currentFeed);

  return (
    <>
      {/* Hamburger Menu Button - En haut à gauche */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={onMenuOpen}
        className="fixed top-4 left-4 z-40 w-10 h-10 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center safe-area-top"
      >
        <Menu className="w-5 h-5 text-white" />
      </motion.button>

      {/* Feed Indicator - Centré en haut (indicateur seulement, pas de clic) */}
      <div className="fixed top-0 left-0 right-0 z-30 safe-area-top pointer-events-none">
        <div className="flex justify-center pt-4">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-sm border border-white/10 bg-black/5">
            {/* Dots de navigation */}
            <div className="flex items-center gap-1.5">
              {feedOrder.map((mode, index) => (
                <div
                  key={mode}
                  className={`rounded-full transition-all duration-300 ${
                    index === currentIndex 
                      ? 'w-2 h-2 bg-white' 
                      : 'w-1.5 h-1.5 bg-white/30'
                  }`}
                />
              ))}
            </div>

            {/* Icon & Label */}
            <span className="text-lg">{feedLabels[currentFeed].icon}</span>
            <span className="text-white/90 text-sm font-medium">{feedLabels[currentFeed].label}</span>
          </div>
        </div>
      </div>

      {/* Swipe Arrows en bas - transparents avec label "Glisser" */}
      <div className="fixed bottom-24 left-0 right-0 z-30 pointer-events-none">
        <div className="flex items-center justify-center gap-12">
          {/* Left: < Glisser */}
          <motion.div 
            className="flex items-center gap-1"
            animate={{ x: [-3, 0, -3] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-white/40">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            <span className="text-white/40 text-sm">Glisser</span>
          </motion.div>

          {/* Right: Glisser > */}
          <motion.div 
            className="flex items-center gap-1"
            animate={{ x: [3, 0, 3] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
          >
            <span className="text-white/40 text-sm">Glisser</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-white/40">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </motion.div>
        </div>
      </div>
    </>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// BOTTOM TAB BAR - STYLE CLASSIQUE NOIR
// ═══════════════════════════════════════════════════════════════════════════════

const BottomTabBar: React.FC<{
  activeTab: BottomTab;
  onTabChange: (t: BottomTab) => void;
  onCreatePress: () => void;
  unreadMessages?: number;
  liveCount?: number;
}> = ({ activeTab, onTabChange, onCreatePress, unreadMessages = 0, liveCount = 0 }) => {
  const tabs: { id: BottomTab; icon: typeof Home; label: string; badge?: number }[] = [
    { id: 'fil', icon: Home, label: 'Fil' },
    { id: 'chat', icon: MessageCircle, label: 'Messages', badge: unreadMessages },
    { id: 'groupes', icon: Users, label: 'Groupes' },
    { id: 'direct', icon: Zap, label: 'Live', badge: liveCount },
  ];

  return (
    <motion.nav
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      className="fixed bottom-0 left-0 right-0 z-40 bg-black/90 backdrop-blur-lg border-t border-white/10"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center justify-around px-2 py-2">
        {tabs.slice(0, 2).map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <motion.button 
              key={tab.id} 
              whileTap={{ scale: 0.9 }} 
              onClick={() => onTabChange(tab.id)} 
              className="relative flex flex-col items-center gap-1 py-1 px-4"
            >
              <div className="relative">
                <Icon className={`w-6 h-6 ${isActive ? 'text-white' : 'text-white/50'}`} />
                {tab.badge && tab.badge > 0 && (
                  <span className="absolute -top-1 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] ${isActive ? 'text-white font-medium' : 'text-white/50'}`}>{tab.label}</span>
              {isActive && <motion.div layoutId="tabIndicator" className="absolute -bottom-1 w-8 h-0.5 rounded-full bg-gradient-to-r from-orange-400 to-pink-500" />}
            </motion.button>
          );
        })}

        {/* CREATE BUTTON */}
        <motion.button whileTap={{ scale: 0.9 }} onClick={onCreatePress} className="relative -mt-6">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-400 via-pink-500 to-purple-600 flex items-center justify-center shadow-lg shadow-pink-500/30">
            <Plus className="w-7 h-7 text-white" strokeWidth={2.5} />
          </div>
        </motion.button>

        {tabs.slice(2).map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <motion.button 
              key={tab.id} 
              whileTap={{ scale: 0.9 }} 
              onClick={() => onTabChange(tab.id)} 
              className="relative flex flex-col items-center gap-1 py-1 px-4"
            >
              <div className="relative">
                <Icon className={`w-6 h-6 ${isActive ? 'text-white' : 'text-white/50'}`} />
                {tab.badge && tab.badge > 0 && (
                  <span className="absolute -top-1 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-green-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] ${isActive ? 'text-white font-medium' : 'text-white/50'}`}>{tab.label}</span>
              {isActive && <motion.div layoutId="tabIndicator" className="absolute -bottom-1 w-8 h-0.5 rounded-full bg-gradient-to-r from-orange-400 to-pink-500" />}
            </motion.button>
          );
        })}
      </div>
    </motion.nav>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// AUDIO FEED CARD - AVEC TOUS LES BOUTONS
// ═══════════════════════════════════════════════════════════════════════════════

const AudioFeedCard: React.FC<{
  post: any;
  isActive: boolean;
  category: 'patrimoine' | 'mavoix';
  onLike: () => void;
  onComment: () => void;
  onShare: () => void;
  onFollow: () => void;
}> = ({ post, isActive, category, onLike, onComment, onShare, onFollow }) => {
  const template = getTemplateById(post.template_id, category);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
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
      triggerFeedback('click');
    }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  const handleLike = () => { setIsLiked(!isLiked); onLike(); triggerFeedback('notification'); };
  const handleFollow = () => { setIsFollowing(!isFollowing); onFollow(); triggerFeedback('success'); };

  return (
    <div className="h-screen w-full snap-start snap-always relative overflow-hidden">
      {/* Audio uniquement si l'utilisateur a enregistré/sélectionné un audio */}
      {post.audio_url && (
        <audio ref={audioRef} src={post.audio_url} loop preload="metadata" />
      )}
      
      {/* Background */}
      <div className={`absolute inset-0 bg-gradient-to-br ${template.bgGradient}`} />
      
      {/* Decorative emojis */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {template.decorEmojis.map((e, i) => (
          <motion.span key={i} className="absolute text-5xl opacity-20" style={{ left: `${5 + i * 30}%`, top: `${5 + (i % 2) * 80}%` }} animate={{ y: [0, -15, 0], rotate: [0, 5, -5, 0] }} transition={{ repeat: Infinity, duration: 4 + i, delay: i * 0.3 }}>{e}</motion.span>
        ))}
      </div>

      {/* Main content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center px-6 pt-20 pb-24">
        
        {/* Vinyl Disk */}
        <div className="relative mb-4">
          {isPlaying && (
            <motion.div className="absolute -inset-6 rounded-full" style={{ background: `radial-gradient(circle, ${template.accentColor}30 0%, transparent 70%)` }} animate={{ scale: [1, 1.08, 1], opacity: [0.4, 0.7, 0.4] }} transition={{ repeat: Infinity, duration: 1.5 }} />
          )}
          
          <motion.div className="relative w-44 h-44" animate={isPlaying ? { rotate: 360 } : { rotate: 0 }} transition={{ repeat: Infinity, duration: 4, ease: 'linear' }}>
            <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${template.gradient} shadow-2xl`}>
              {[...Array(10)].map((_, i) => (<div key={i} className="absolute rounded-full border border-black/10" style={{ inset: `${10 + i * 7}%` }} />))}
              <div className="absolute inset-[32%] rounded-full bg-white/90 shadow-inner flex items-center justify-center"><span className="text-4xl">{template.emoji}</span></div>
              <div className="absolute inset-0 rounded-full" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.25) 0%, transparent 50%)' }} />
            </div>
            <svg className="absolute inset-0 w-full h-full -rotate-90">
              <circle cx="50%" cy="50%" r="47%" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="5" />
              <circle cx="50%" cy="50%" r="47%" fill="none" stroke="white" strokeWidth="5" strokeLinecap="round" strokeDasharray={`${progress * 2.95} 295`} />
            </svg>
          </motion.div>

          {/* Tonearm */}
          <motion.div className="absolute -right-2 top-2 w-14 h-1.5 origin-right" animate={{ rotate: isPlaying ? -28 : -45 }} transition={{ type: 'spring', stiffness: 100 }}>
            <div className="w-full h-full bg-gradient-to-r from-gray-400 to-gray-300 rounded-full shadow" />
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white shadow" />
          </motion.div>
        </div>

        {/* Waveform */}
        <div className="flex justify-center gap-0.5 mb-3 h-5">
          {[...Array(30)].map((_, i) => (
            <motion.div key={i} className="w-1 rounded-full bg-white/50" animate={isPlaying ? { height: [3, Math.random() * 20 + 4, 3] } : { height: 3 }} transition={{ repeat: Infinity, duration: 0.35 + Math.random() * 0.25, delay: i * 0.015 }} />
          ))}
        </div>

        {/* Title & Author */}
        <h2 className="text-white text-lg font-bold text-center mb-1 px-4">{post.title || post.transcript_fr?.slice(0, 35) || template.name}</h2>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-white/60 text-sm">📍 {post.profile?.display_name || 'Utilisateur'} • {post.location_name || 'Communauté'}</span>
        </div>
        {/* Date/heure de publication */}
        <div className="flex items-center gap-1 mb-2">
          <Clock className="w-3 h-3 text-white/40" />
          <span className="text-white/40 text-xs">{formatPublicationDate(post.created_at)}</span>
        </div>

        {/* Follow button */}
        <motion.button whileTap={{ scale: 0.95 }} onClick={handleFollow} className={`px-4 py-1.5 rounded-full text-sm font-bold mb-3 ${isFollowing ? 'bg-white/20 text-white border border-white/30' : 'bg-white text-gray-900'}`}>
          {isFollowing ? '✓ Abonné' : '+ Suivre'}
        </motion.button>

        {/* Transcript */}
        {post.transcript_fr && (
          <div className="max-w-xs rounded-xl p-3 mb-3" style={{ background: 'rgba(0,0,0,0.25)' }}>
            <p className="text-white/85 text-center text-sm leading-relaxed">"{post.transcript_fr.slice(0, 80)}..."</p>
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center gap-3 mb-2">
          <span className="text-white/60 text-xs w-10 text-right">{formatTime(currentTime)}</span>
          <motion.button whileTap={{ scale: 0.9 }} className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center"><SkipBack className="w-4 h-4 text-white" /></motion.button>
          <motion.button whileTap={{ scale: 0.9 }} onClick={togglePlay} className="w-14 h-14 rounded-full bg-white flex items-center justify-center shadow-xl">
            {isPlaying ? <Pause className="w-7 h-7 text-gray-800" /> : <Play className="w-7 h-7 text-gray-800 ml-1" />}
          </motion.button>
          <motion.button whileTap={{ scale: 0.9 }} className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center"><SkipForward className="w-4 h-4 text-white" /></motion.button>
          <span className="text-white/60 text-xs w-10">{formatTime(duration)}</span>
        </div>

        {/* Speed & Volume */}
        <div className="flex items-center gap-2">
          <motion.button whileTap={{ scale: 0.95 }} className="px-3 py-1 rounded-full bg-white/15 text-white text-xs font-medium">1x</motion.button>
          <motion.button whileTap={{ scale: 0.95 }} className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center"><Volume2 className="w-4 h-4 text-white" /></motion.button>
        </div>
      </div>

      {/* RIGHT SIDE ACTIONS - TOUS LES BOUTONS */}
      <div className="absolute right-3 bottom-24 flex flex-col items-center gap-3">
        {/* Like */}
        <motion.button whileTap={{ scale: 0.85 }} onClick={handleLike} className="flex flex-col items-center">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isLiked ? 'bg-red-500' : 'bg-black/30'}`}>
            <Heart className={`w-6 h-6 ${isLiked ? 'text-white fill-white' : 'text-white'}`} />
          </div>
          <span className="text-white text-[10px] mt-0.5 font-medium">{post.reactions_count || 0}</span>
        </motion.button>
        
        {/* Répondre (Comment) */}
        <motion.button whileTap={{ scale: 0.85 }} onClick={onComment} className="flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-black/30 flex items-center justify-center">
            <Mic className="w-6 h-6 text-white" />
          </div>
          <span className="text-white text-[10px] mt-0.5">Répondre</span>
        </motion.button>
        
        {/* Remix */}
        <motion.button whileTap={{ scale: 0.85 }} className="flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-black/30 flex items-center justify-center">
            <RefreshCw className="w-6 h-6 text-white" />
          </div>
          <span className="text-white text-[10px] mt-0.5">Remix</span>
        </motion.button>
        
        {/* Partager */}
        <motion.button whileTap={{ scale: 0.85 }} onClick={onShare} className="flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-black/30 flex items-center justify-center">
            <Share2 className="w-6 h-6 text-white" />
          </div>
          <span className="text-white text-[10px] mt-0.5">Partager</span>
        </motion.button>
        
        {/* Sauver */}
        <motion.button whileTap={{ scale: 0.85 }} onClick={() => { setIsSaved(!isSaved); triggerFeedback('success'); }} className="flex flex-col items-center">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isSaved ? 'bg-amber-500' : 'bg-black/30'}`}>
            <Bookmark className={`w-6 h-6 ${isSaved ? 'text-white fill-white' : 'text-white'}`} />
          </div>
          <span className="text-white text-[10px] mt-0.5">{isSaved ? 'Sauvé' : 'Sauver'}</span>
        </motion.button>
      </div>

      {/* Author avatar bottom left */}
      <div className="absolute left-4 bottom-24">
        <div className="relative">
          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#FF7A00] to-[#FF5500] flex items-center justify-center border-2 border-white shadow-lg">
            <span className="text-lg">👤</span>
          </div>
          {!isFollowing && (
            <motion.button whileTap={{ scale: 0.9 }} onClick={handleFollow} className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-[#FF7A00] flex items-center justify-center">
              <Plus className="w-3 h-3 text-white" strokeWidth={3} />
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// VIDEO FEED CARD - FULLSCREEN KUAISHOU ULTRA-CLEAN
// ═══════════════════════════════════════════════════════════════════════════════

const VideoFeedCard: React.FC<{
  post: any;
  isActive: boolean;
  onLike: () => void;
  onComment: () => void;
  onShare: () => void;
}> = ({ post, isActive, onLike, onComment, onShare }) => {
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const navigate = useNavigate();

  // Support both tamtam_posts and videos table format
  const videoUrl = post.media_url || post.video_url;
  const thumbnailUrl = post.thumbnail_url;
  const authorName = post.profile?.display_name || 'Créateur';
  const likesCount = post.likes_count || post.reactions_count || 0;
  const commentsCount = post.comments_count || 0;
  const sharesCount = post.shares_count || 0;
  const avatarUrl = post.profile?.avatar_url;
  const feelingEmoji = post.feeling_emoji;

  useEffect(() => {
    if (isActive && videoRef.current) {
      videoRef.current.play().catch(() => {});
    } else if (videoRef.current) {
      videoRef.current.pause();
    }
  }, [isActive]);

  const handleProfileClick = () => {
    if (post.profile?.user_id) {
      navigate(`/fitila/profile/${post.profile.user_id}`);
    }
  };

  return (
    <div className="h-[100dvh] w-full snap-start snap-always relative bg-black overflow-hidden">
      {/* Video/Media - FULLSCREEN ABSOLUTE */}
      {videoUrl ? (
        <video 
          ref={videoRef} 
          src={videoUrl} 
          poster={thumbnailUrl || undefined}
          loop 
          muted 
          playsInline 
          preload={isActive ? 'auto' : 'metadata'} 
          onLoadedData={() => setIsLoaded(true)} 
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`} 
        />
      ) : thumbnailUrl ? (
        <img 
          src={thumbnailUrl} 
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-900 to-indigo-900">
          <span className="text-7xl">{feelingEmoji || '🎬'}</span>
        </div>
      )}
      
      {/* Loading state */}
      {!isLoaded && videoUrl && (
        <div className="absolute inset-0 bg-black flex items-center justify-center">
          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-10 h-10 border-2 border-white/30 border-t-white rounded-full" />
        </div>
      )}
      
      {/* Author info - Minimaliste en bas à gauche */}
      <div 
        className="absolute bottom-0 left-0 right-16 px-4"
        style={{ 
          paddingBottom: 'max(5rem, calc(env(safe-area-inset-bottom) + 5rem))'
        }}
      >
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2" 
          onClick={handleProfileClick}
        >
          {/* Avatar transparent */}
          <div className="w-9 h-9 rounded-full overflow-hidden border border-white/20">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-white/10 flex items-center justify-center">
                <span className="text-xs">👤</span>
              </div>
            )}
          </div>
          <span className="text-white/80 text-sm font-medium">{authorName}</span>
        </motion.div>
      </div>

      {/* Right sidebar - Actions 100% transparentes */}
      <div 
        className="absolute right-3 flex flex-col items-center gap-5"
        style={{ 
          bottom: 'max(6rem, calc(env(safe-area-inset-bottom) + 6rem))'
        }}
      >
        {/* Like - Transparent */}
        <motion.button 
          whileTap={{ scale: 0.85 }} 
          onClick={() => { setIsLiked(!isLiked); onLike(); triggerFeedback('notification'); }} 
          className="flex flex-col items-center"
        >
          <Heart className={`w-7 h-7 ${isLiked ? 'text-red-500 fill-red-500' : 'text-white'} drop-shadow-lg`} strokeWidth={1.5} />
          <span className="text-white/80 text-[11px] font-medium mt-1 drop-shadow-md">{likesCount + (isLiked ? 1 : 0)}</span>
        </motion.button>
        
        {/* Comment - Transparent */}
        <motion.button 
          whileTap={{ scale: 0.85 }} 
          onClick={onComment} 
          className="flex flex-col items-center"
        >
          <MessageCircle className="w-7 h-7 text-white drop-shadow-lg" strokeWidth={1.5} />
          <span className="text-white/80 text-[11px] font-medium mt-1 drop-shadow-md">{commentsCount}</span>
        </motion.button>
        
        {/* Bookmark - Transparent */}
        <motion.button 
          whileTap={{ scale: 0.85 }} 
          onClick={() => { setIsSaved(!isSaved); triggerFeedback('success'); }}
          className="flex flex-col items-center"
        >
          <Bookmark className={`w-7 h-7 ${isSaved ? 'text-amber-400 fill-amber-400' : 'text-white'} drop-shadow-lg`} strokeWidth={1.5} />
        </motion.button>
        
        {/* Share - Transparent */}
        <motion.button 
          whileTap={{ scale: 0.85 }} 
          onClick={onShare} 
          className="flex flex-col items-center"
        >
          <Share2 className="w-7 h-7 text-white drop-shadow-lg" strokeWidth={1.5} />
          <span className="text-white/80 text-[11px] font-medium mt-1 drop-shadow-md">{sharesCount}</span>
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
  const { currentLang } = useTamTamLanguage();
  const { toast } = useToast();
  const { posts, isLoading, createPost, addReaction, fetchComments, fetchPosts } = useTamTamPosts();
  // ✅ FIX: Also fetch videos from the videos table (Village Chronicle, Griot Digital, etc.)
  const { videos: videoFeedItems, isLoading: isVideosLoading, refetch: refetchVideos } = useVideoFeed();
  const sideMenu = useSideMenu();

  const [activeTab, setActiveTab] = useState<BottomTab>('fil');
  const [feedMode, setFeedMode] = useState<FeedMode>('creation');
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [showCreator, setShowCreator] = useState(false);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [createPostType, setCreatePostType] = useState<'patrimoine' | 'mavoix'>('patrimoine');
  const [currentPostIndex, setCurrentPostIndex] = useState(0);
  const [commentsModal, setCommentsModal] = useState<{ isOpen: boolean; postId: string | null; comments: TamTamComment[]; isLoading: boolean }>({ isOpen: false, postId: null, comments: [], isLoading: false });

  // Handle horizontal swipe - optimisé pour réactivité
  const handleDragEnd = useCallback((event: any, info: PanInfo) => {
    // Seuil réduit + détection par vélocité pour swipe plus intuitif
    const threshold = 30;
    const velocityThreshold = 200;
    const feeds: FeedMode[] = ['patrimoine', 'mavoix', 'creation'];
    const currentIndex = feeds.indexOf(feedMode);
    
    // Swipe basé sur offset OU vélocité (plus réactif)
    const swipeLeft = info.offset.x < -threshold || info.velocity.x < -velocityThreshold;
    const swipeRight = info.offset.x > threshold || info.velocity.x > velocityThreshold;
    
    if (swipeLeft && currentIndex < feeds.length - 1) {
      setFeedMode(feeds[currentIndex + 1]);
      setCurrentPostIndex(0);
      triggerFeedback('notification');
    } else if (swipeRight && currentIndex > 0) {
      setFeedMode(feeds[currentIndex - 1]);
      setCurrentPostIndex(0);
      triggerFeedback('notification');
    }
  }, [feedMode]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const idx = Math.round(e.currentTarget.scrollTop / window.innerHeight);
    if (idx !== currentPostIndex) setCurrentPostIndex(idx);
  }, [currentPostIndex]);

  const handleOpenComments = useCallback(async (postId: string) => {
    setCommentsModal({ isOpen: true, postId, comments: [], isLoading: true });
    const comments = await fetchComments(postId);
    setCommentsModal(prev => ({ ...prev, comments, isLoading: false }));
  }, [fetchComments]);

  const handleShare = useCallback((postId: string) => {
    triggerFeedback('send');
    if (navigator.share) navigator.share({ title: 'TAM-TAM', url: window.location.href });
    else { navigator.clipboard.writeText(window.location.href); toast({ title: "🔗 Lien copié!" }); }
  }, [toast]);

  // IMPORTANT: Fonction de création avec audio_url par défaut
  const handleCreatePost = useCallback(async (data: any) => {
    try {
      // Ne pas utiliser d'audio par défaut - uniquement l'audio enregistré par l'utilisateur
      const postData = {
        ...data,
        audio_url: data.audio_url || null,
        topic: createPostType,
      };
      
      await createPost(postData);
      toast({ title: "✅ Publié!" });
      triggerFeedback('success');
      fetchPosts();
      setShowCreatePost(false);
    } catch (error) {
      console.error('Erreur publication:', error);
      toast({ title: "❌ Erreur", description: "Impossible de publier. Réessayez.", variant: "destructive" });
    }
  }, [createPost, createPostType, fetchPosts, toast]);

  const handleCreatorComplete = useCallback(async (d: any) => {
    console.log('[TamTamSocial.handleCreatorComplete] Received:', {
      segments: d.segments?.length,
      mode: d.mode,
      caption: d.caption,
      templateId: d.effects?.templateId || d.exportJob?.templateId,
    });
    
    try {
      // Get user for upload
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id || 'anonymous';
      
      let mediaUrl = d.media_url || null;
      let audioUrl = d.audio_url || null; // Pas d'audio par défaut
      
      // ✅ FIX: Detect Radio Village Pro explicitly and force video type
      const isRadioVillagePro = d.exportJob?.templateId === 'radio_village_pro' 
        || d.caption?.includes('Radio Village')
        || d.effects?.templateId === 'radio_village_pro_01';
      
      // Upload media blob if present
      if (d.segments && d.segments.length > 0) {
        const firstSegment = d.segments[0];
        if (firstSegment.blob && firstSegment.blob.size > 0) {
          try {
            // ✅ FIX: Radio Village Pro always produces video
            const blobType = firstSegment.blob.type || '';
            let mediaType: 'video' | 'photo' | 'audio' = 'video';
            
            if (isRadioVillagePro) {
              mediaType = 'video';
              console.log('[TamTamSocial] Radio Village Pro detected, forcing video type');
            } else if (blobType.includes('video')) {
              mediaType = 'video';
            } else if (blobType.includes('image')) {
              mediaType = 'photo';
            } else if (blobType.includes('audio')) {
              mediaType = 'audio';
            } else if (d.mode === 'photo') {
              mediaType = 'photo';
            } else {
              mediaType = 'video';
            }
            
            console.log('[TamTamSocial] Uploading blob:', {
              size: firstSegment.blob.size,
              type: firstSegment.blob.type,
              mediaType
            });
            
            mediaUrl = await uploadMediaToStorage(firstSegment.blob, mediaType, userId);
            console.log('[TamTamSocial] Media uploaded:', mediaUrl);
            
            // For video/audio, use same URL for audio
            if (mediaType === 'video' || mediaType === 'audio') {
              audioUrl = mediaUrl;
            }
          } catch (uploadError) {
            console.error('[TamTamSocial] Upload error:', uploadError);
            toast({ title: "❌ Erreur upload", description: "Impossible d'uploader le média", variant: "destructive" });
            return;
          }
        } else {
          console.error('[TamTamSocial] Segment blob is empty or missing');
          toast({ title: "❌ Erreur", description: "Contenu vidéo manquant", variant: "destructive" });
          return;
        }
      } else {
        console.error('[TamTamSocial] No segments to upload');
        toast({ title: "❌ Erreur", description: "Aucun contenu à publier", variant: "destructive" });
        return;
      }
      
      const postData = {
        audio_url: audioUrl,
        media_type: isRadioVillagePro ? 'video' : (d.mode || 'video'),
        media_url: mediaUrl,
        transcript_fr: d.caption || '',
        transcript_ba: '',
        topic: 'creation',
        template_id: d.effects?.templateId || d.exportJob?.templateId || null,
        duration_seconds: d.segments?.reduce((sum: number, s: any) => {
          const dur = s.duration || (s.endTime - s.startTime);
          return sum + (isFinite(dur) ? dur : 0);
        }, 0) || 30,
      };
      
      console.log('[TamTamSocial] Creating post with data:', postData);
      await createPost(postData);
      toast({ title: "✅ Publié!" });
      triggerFeedback('success');
      fetchPosts();
      setShowCreator(false);
    } catch (error) {
      console.error('Erreur publication:', error);
      toast({ title: "❌ Erreur", description: "Impossible de publier. Réessayez.", variant: "destructive" });
    }
  }, [createPost, fetchPosts, toast]);

  // Filter posts - improved logic to show all posts matching the category
  // ✅ FIX: Combine tamtam_posts AND videos table for complete feed
  const getCurrentPosts = useMemo(() => {
    const allPosts = posts.length > 0 ? posts : [];
    
    // Convert videos from videos table to post-like format for display
    const videosAsVideoCards = videoFeedItems.map(v => ({
      id: v.id,
      audio_url: v.videoUrl, // For VideoFeedCard compatibility
      media_url: v.videoUrl,
      media_type: 'video',
      thumbnail_url: v.thumbnailUrl,
      transcript_fr: v.description || v.title,
      transcript_ba: null,
      topic: 'creation',
      template_id: v.templateId,
      template_name: v.templateName,
      duration_seconds: v.duration,
      likes_count: v.likesCount,
      comments_count: 0,
      shares_count: v.sharesCount,
      created_at: v.createdAt,
      is_public: true,
      profile: {
        display_name: v.author.name,
        username: v.author.username,
        avatar_url: v.author.avatarUrl,
      },
      reactions: { like: v.likesCount, love: 0, laugh: 0, wow: 0, pray: 0 },
      // Flag to identify this is from videos table
      _sourceTable: 'videos',
    }));
    
    switch (feedMode) {
      case 'patrimoine':
        // Patrimoine: audio posts with culture topics OR template-based culture content
        // ✅ FIX: Include ALL audio posts, not just those with specific topics
        const patrimoineFromPosts = allPosts.filter(p => {
          const post = p as any;
          const hasAudio = post.audio_url && post.audio_url.trim().length > 0;
          return hasAudio && (
            post.topic === 'patrimoine' || 
            post.topic === 'culture' || 
            post.template_id?.includes('conte') ||
            post.template_id?.includes('chant') ||
            post.template_id?.includes('proverbe') ||
            (post.culture_score && post.culture_score > 0) ||
            post.media_type === 'audio' ||
            !post.topic // Default audio posts go to patrimoine
          );
        });
        // If no specific patrimoine posts, show all audio posts
        if (patrimoineFromPosts.length === 0) {
          return allPosts.filter(p => {
            const post = p as any;
            return post.audio_url && post.audio_url.trim().length > 0;
          });
        }
        return patrimoineFromPosts;
        
      case 'mavoix':
        // Ma Voix: village voice, announcements, questions, polls
        // ✅ FIX: Include ALL audio posts that have specific "mavoix" topics
        const mavoixFromPosts = allPosts.filter(p => {
          const post = p as any;
          const hasAudio = post.audio_url && post.audio_url.trim().length > 0;
          return hasAudio && (
            post.topic === 'mavoix' || 
            post.topic === 'annonce' ||
            post.topic === 'village_voice' ||
            post.template_id?.includes('annonce') ||
            post.template_id?.includes('question') ||
            post.template_id?.includes('merci')
          );
        });
        // If no specific mavoix posts, show all audio posts as fallback
        if (mavoixFromPosts.length === 0) {
          return allPosts.filter(p => {
            const post = p as any;
            return post.audio_url && post.audio_url.trim().length > 0;
          });
        }
        return mavoixFromPosts;
        
      case 'creation':
        // ✅ FIX: Combine videos from BOTH tamtam_posts AND videos table
        const creationFromPosts = allPosts.filter(p => {
          const post = p as any;
          return (post.media_type === 'video' || post.media_type === 'photo') && 
                 post.media_url && post.media_url.trim().length > 0;
        });
        
        // Merge both sources, videos table first (newest template videos)
        const allCreationContent = [...videosAsVideoCards, ...creationFromPosts];
        
        // Sort by created_at descending
        allCreationContent.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        
        return allCreationContent;
    }
  }, [feedMode, posts, videoFeedItems]);

  return (
    <div className="fixed inset-0" style={{ background: '#0B0B0B' }}>
      <FeedIndicator currentFeed={feedMode} onMenuOpen={sideMenu.open} />

      <AnimatePresence mode="wait">
        {activeTab === 'fil' && (
          <motion.div
            key={feedMode}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            className="h-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
            onScroll={handleScroll}
          >
            {(isLoading || (feedMode === 'creation' && isVideosLoading)) ? (
              <div className="h-screen flex items-center justify-center">
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-10 h-10 border-3 border-[#FF7A00] border-t-transparent rounded-full" />
              </div>
            ) : getCurrentPosts.length > 0 ? (
              feedMode === 'creation' ? (
                getCurrentPosts.map((post, i) => (
                  <VideoFeedCard key={post.id} post={post} isActive={i === currentPostIndex} onLike={() => addReaction(post.id, 'like')} onComment={() => handleOpenComments(post.id)} onShare={() => handleShare(post.id)} />
                ))
              ) : (
                getCurrentPosts.map((post, i) => (
                  <AudioFeedCard key={post.id} post={post} isActive={i === currentPostIndex} category={feedMode === 'patrimoine' ? 'patrimoine' : 'mavoix'} onLike={() => addReaction(post.id, 'like')} onComment={() => handleOpenComments(post.id)} onShare={() => handleShare(post.id)} onFollow={() => triggerFeedback('success')} />
                ))
              )
            ) : (
              <div className="h-screen flex flex-col items-center justify-center px-8">
                <span className="text-7xl mb-4">{feedMode === 'patrimoine' ? '🏛️' : feedMode === 'mavoix' ? '📢' : '🎬'}</span>
                <p className="text-white text-xl font-bold mb-2">Aucun contenu</p>
                <p className="text-white/50 text-center mb-6">Soyez le premier à partager!</p>
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowCreateMenu(true)} className="px-6 py-3 rounded-full bg-[#FF7A00] text-white font-bold">Créer</motion.button>
              </div>
            )}
          </motion.div>
        )}
        
        {activeTab === 'chat' && <motion.div key="chat" className="pt-4 pb-20 h-full"><TamTamMessagesHub isOpen={true} onClose={() => setActiveTab('fil')} /></motion.div>}
        {activeTab === 'groupes' && <motion.div key="groupes" className="pt-4 pb-20 h-full"><TamTamCommunities /></motion.div>}
        {activeTab === 'direct' && <motion.div key="direct" className="pt-4 pb-20 h-full"><TamTamLiveList /></motion.div>}
      </AnimatePresence>

      <BottomTabBar activeTab={activeTab} onTabChange={setActiveTab} onCreatePress={() => setShowCreateMenu(true)} unreadMessages={3} liveCount={2} />

      <CreateMenu isOpen={showCreateMenu} onClose={() => setShowCreateMenu(false)} currentFeed={feedMode} onSelectPatrimoine={() => { setCreatePostType('patrimoine'); setShowCreatePost(true); }} onSelectMaVoix={() => { setCreatePostType('mavoix'); setShowCreatePost(true); }} onSelectCreateur={() => setShowCreator(true)} currentLang={currentLang} />

      <TamTamCreatePost isOpen={showCreatePost} onClose={() => setShowCreatePost(false)} onSubmit={handleCreatePost} />

      <FullscreenCreator open={showCreator} onClose={() => setShowCreator(false)} onPublish={handleCreatorComplete} />

      <TamTamCommentsModal isOpen={commentsModal.isOpen} onClose={() => setCommentsModal(prev => ({ ...prev, isOpen: false }))} comments={commentsModal.comments} onAddComment={async () => {}} isLoading={commentsModal.isLoading} />
    </div>
  );
}

export { TamTamSocial };
