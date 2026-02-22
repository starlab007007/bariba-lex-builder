import React, { useState, useEffect, useMemo, useCallback, useRef, memo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { Menu, X, Home, MessageCircle, Users, Zap, Heart, Share2, Bookmark, Plus, Mic, Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, ChevronRight, RefreshCw } from 'lucide-react';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';
import { useTamTamPosts, TamTamComment, uploadMediaToStorage } from '@/hooks/useTamTamPosts';
import { usePostInteractions } from '@/hooks/usePostInteractions';
import { useVideoFeed } from '@/hooks/useVideoFeed';
import { TamTamCommentsModal } from '@/components/tamtam/TamTamCommentsModal';
import { TamTamCreatePost } from '@/components/tamtam/TamTamCreatePost';
import { TamTamCommunities } from '@/components/tamtam/TamTamCommunities';
import { AudioFeedCard } from '@/components/feed/AudioFeedCard';

import { TamTamLiveList } from '@/components/tamtam/TamTamLiveList';
import { TamTamMessagesHub } from '@/components/tamtam/TamTamMessagesHub';
import FullscreenCreator from '@/components/tamtam/FullscreenCreator';
import BranchingPlayer from '@/features/conte-vivant/components/BranchingPlayer';
import type { StoryGraph } from '@/features/conte-vivant/types/story.types';
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
  if (!id) return category === 'patrimoine' ? diskTemplates[0] : diskTemplates[3];
  // Exact match first, then prefix match (e.g. 'conte_animaux' starts with 'conte')
  const found = diskTemplates.find(t => t.id === id || id.startsWith(t.id));
  if (found) return found;
  // Keyword match as fallback
  const byKeyword = diskTemplates.find(t => id.includes(t.id));
  if (byKeyword) return byKeyword;
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
        className="fixed top-4 left-4 z-40 w-10 h-10 rounded-full bg-transparent flex items-center justify-center safe-area-top"
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

// AudioFeedCard imported from @/components/feed/AudioFeedCard

// ═══════════════════════════════════════════════════════════════════════════════
// VIDEO FEED CARD - FULLSCREEN KUAISHOU ULTRA-CLEAN
// ═══════════════════════════════════════════════════════════════════════════════

const VideoFeedCard: React.FC<{
  post: any;
  isActive: boolean;
  onComment: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  onPlayInteractive?: (storyId: string) => void;
}> = ({ post, isActive, onComment, isMuted, onToggleMute, onPlayInteractive }) => {
  const isInteractive = post.template_id === 'conte-vivant' || post.metadata?.is_interactive;
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showPlayIcon, setShowPlayIcon] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const navigate = useNavigate();

  // Support both tamtam_posts and videos table format
  const videoUrl = post.media_url || post.video_url || post.videoUrl;
  const thumbnailUrl = post.thumbnail_url || post.thumbnailUrl;
  const authorName = post.profile?.display_name || post.author?.name || 'Créateur';
  const authorUsername = post.profile?.username 
    ? `@${post.profile.username}` 
    : post.author?.username || '@fitila_user';
  const commentsCount = post.comments_count || post.commentsCount || 0;
  const avatarUrl = post.profile?.avatar_url || post.author?.avatarUrl;
  const authorId = post.profile?.user_id || post.author?.id || post.user_id;
  const feelingEmoji = post.feeling_emoji;

  const { isLiked, likesCount, toggleLike, isBookmarked, toggleBookmark, sharesCount, sharePost, isFollowing, toggleFollow } = usePostInteractions(post.id, authorId);

  useEffect(() => {
    if (!videoRef.current) return;
    if (isActive) {
      videoRef.current.muted = true;
      videoRef.current.play().then(() => {
        setIsPlaying(true);
        if (videoRef.current) videoRef.current.muted = isMuted;
      }).catch(() => {});
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  }, [isActive, isMuted]);

  const handleVideoTap = useCallback(() => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
    setShowPlayIcon(true);
    setTimeout(() => setShowPlayIcon(false), 600);
    triggerFeedback('notification');
  }, [isPlaying]);

  const handleProfileClick = useCallback(() => {
    if (authorId) navigate(`/fitila/user/${authorId}`);
  }, [authorId, navigate]);

  const handleFollow = useCallback(() => {
    toggleFollow();
    triggerFeedback('success');
  }, [toggleFollow]);

  return (
    <div className="h-[100dvh] h-screen w-screen max-w-full snap-start snap-always relative bg-black overflow-hidden">
      {/* Tap zone for play/pause */}
      <div className="absolute inset-0 z-10" onClick={handleVideoTap} />

      {/* Play/Pause indicator */}
      <AnimatePresence>
        {showPlayIcon && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 0.8, scale: 1 }}
            exit={{ opacity: 0, scale: 1.2 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none"
          >
            <div className="w-20 h-20 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
              {isPlaying ? (
                <Pause className="w-10 h-10 text-white" fill="white" />
              ) : (
                <Play className="w-10 h-10 text-white ml-1" fill="white" />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Video/Media - FULLSCREEN */}
      {post.media_type === 'photo' && post.media_url ? (
        <img 
          src={post.media_url} 
          alt="Post photo" 
          onLoad={() => setIsLoaded(true)}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`} 
        />
      ) : videoUrl ? (
        <video 
          ref={videoRef} 
          src={videoUrl} 
          poster=""
          loop 
          muted={isMuted}
          playsInline 
          preload={isActive ? 'auto' : 'metadata'} 
          onLoadedData={() => setIsLoaded(true)} 
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`} 
        />
      ) : thumbnailUrl ? (
        <img src={thumbnailUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-900 to-indigo-900">
          <span className="text-7xl">{feelingEmoji || '🎬'}</span>
        </div>
      )}
      
      {/* Loading state */}
      {!isLoaded && (videoUrl || post.media_type === 'photo') && !isInteractive && (
        <div className="absolute inset-0 bg-black flex items-center justify-center">
          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-10 h-10 border-2 border-white/30 border-t-white rounded-full" />
        </div>
      )}

      {/* Interactive Story Badge + Play Button */}
      {isInteractive && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/40">
          <span className="text-6xl mb-3">🎪</span>
          <p className="text-white font-bold text-lg mb-1">Conte Interactif</p>
          <p className="text-white/60 text-xs mb-4">
            {post.metadata?.total_segments || '?'} segments · {post.metadata?.total_endings || '?'} fins
          </p>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              const storyId = post.metadata?.story_id;
              if (storyId && onPlayInteractive) onPlayInteractive(storyId);
            }}
            className="px-8 py-3 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-base shadow-lg"
          >
            ▶️ Jouer le conte
          </motion.button>
        </div>
      )}

      {/* Author info - bottom left with @username, date & time */}
      <div 
        className="absolute bottom-0 left-0 right-16 sm:right-20 px-3 sm:px-4"
        style={{ paddingBottom: 'max(5rem, calc(env(safe-area-inset-bottom) + 5rem))' }}
      >
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="z-20 relative" 
          onClick={handleProfileClick}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full overflow-hidden border-2 border-white/30 shadow-lg flex-shrink-0">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-white/10 flex items-center justify-center">
                  <span className="text-sm">👤</span>
                </div>
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-white text-sm sm:text-base font-bold drop-shadow-lg truncate">{authorUsername}</span>
              <span className="text-white/60 text-xs sm:text-sm drop-shadow-md">
                {post.created_at ? new Date(post.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) + ' · ' + new Date(post.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''}
              </span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Right sidebar - Actions vertically centered */}
      <div 
        className="absolute right-2 sm:right-3 md:right-4 flex flex-col items-center gap-2 sm:gap-3 md:gap-4 z-20"
        style={{ top: '50%', transform: 'translateY(-10%)' }}
      >
        {/* Follow Avatar Button */}
        <div className="relative mb-1">
          <motion.button 
            whileTap={{ scale: 0.9 }} 
            onClick={handleProfileClick}
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-full overflow-hidden border-2 border-white/40 shadow-lg"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center">
                <span className="text-sm">👤</span>
              </div>
            )}
          </motion.button>
          {!isFollowing && (
            <motion.button 
              whileTap={{ scale: 0.8 }}
              onClick={(e) => { e.stopPropagation(); handleFollow(); }}
              className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-red-500 shadow-md z-30"
            >
              <Plus className="w-3 h-3 text-white" strokeWidth={3} />
              <span className="text-white text-[8px] font-bold">Suivre</span>
            </motion.button>
          )}
        </div>

        {/* Like */}
        <motion.button 
          whileTap={{ scale: 0.85 }} 
          onClick={() => { toggleLike(); triggerFeedback('notification'); }} 
          className="flex flex-col items-center"
        >
          <Heart className={`w-5 h-5 sm:w-6 sm:h-6 ${isLiked ? 'text-red-500 fill-red-500' : 'text-white'} drop-shadow-lg`} strokeWidth={1.5} />
          <span className="text-white/80 text-[10px] font-medium mt-0.5 drop-shadow-md">{likesCount}</span>
        </motion.button>
        
        {/* Comment */}
        <motion.button 
          whileTap={{ scale: 0.85 }} 
          onClick={onComment} 
          className="flex flex-col items-center"
        >
          <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white drop-shadow-lg" strokeWidth={1.5} />
          <span className="text-white/80 text-[10px] font-medium mt-0.5 drop-shadow-md">{commentsCount}</span>
        </motion.button>
        
        {/* Bookmark */}
        <motion.button 
          whileTap={{ scale: 0.85 }} 
          onClick={() => { toggleBookmark(); triggerFeedback('success'); }}
          className="flex flex-col items-center"
        >
          <Bookmark className={`w-5 h-5 sm:w-6 sm:h-6 ${isBookmarked ? 'text-amber-400 fill-amber-400' : 'text-white'} drop-shadow-lg`} strokeWidth={1.5} />
        </motion.button>
        
        {/* Share */}
        <motion.button 
          whileTap={{ scale: 0.85 }} 
          onClick={() => { sharePost(); triggerFeedback('send'); }} 
          className="flex flex-col items-center"
        >
          <Share2 className="w-5 h-5 sm:w-6 sm:h-6 text-white drop-shadow-lg" strokeWidth={1.5} />
          <span className="text-white/80 text-[10px] font-medium mt-0.5 drop-shadow-md">{sharesCount}</span>
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
  const { currentLang } = useTamTamLanguage();
  const { toast } = useToast();
  const { posts, isLoading, createPost, addReaction, addComment, fetchComments, fetchPosts } = useTamTamPosts();
  // ✅ FIX: Also fetch videos from the videos table (Village Chronicle, Griot Digital, etc.)
  const { videos: videoFeedItems, isLoading: isVideosLoading, refetch: refetchVideos } = useVideoFeed();
  const sideMenu = useSideMenu();

  const [activeTab, setActiveTab] = useState<BottomTab>('fil');
  const [feedMode, setFeedMode] = useState<FeedMode>('creation');
  const [isMuted, setIsMuted] = useState(false); // Audio plays automatically (Kuaishou-style)
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [showCreator, setShowCreator] = useState(false);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [createPostType, setCreatePostType] = useState<'patrimoine' | 'mavoix'>('patrimoine');
  const [currentPostIndex, setCurrentPostIndex] = useState(0);
  const [commentsModal, setCommentsModal] = useState<{ isOpen: boolean; postId: string | null; comments: TamTamComment[]; isLoading: boolean }>({ isOpen: false, postId: null, comments: [], isLoading: false });
  const [focusVideoId, setFocusVideoId] = useState<string | null>(null);
  const [interactiveStory, setInteractiveStory] = useState<{ graph: StoryGraph; id: string } | null>(null);

  const handlePlayInteractiveStory = useCallback(async (storyId: string) => {
    try {
      const { data } = await supabase.from('conte_vivant_stories').select('graph').eq('id', storyId).single();
      if (data?.graph) {
        setInteractiveStory({ graph: data.graph as unknown as StoryGraph, id: storyId });
      }
    } catch { toast({ title: '❌ Erreur chargement du conte' }); }
  }, [toast]);

  // Read ?video= param to scroll to published video
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const videoParam = params.get('video');
    if (videoParam) {
      setFeedMode('creation');
      setFocusVideoId(videoParam);
    }
  }, [location.search]);

  // Scroll to focused video after feed loads
  useEffect(() => {
    if (focusVideoId && !isVideosLoading && videoFeedItems.length > 0) {
      const idx = videoFeedItems.findIndex(v => v.id === focusVideoId);
      if (idx >= 0) {
        setCurrentPostIndex(idx);
        // Scroll after a short delay for DOM to be ready
        setTimeout(() => {
          const container = document.querySelector('.snap-y.snap-mandatory');
          if (container) {
            container.scrollTo({ top: idx * window.innerHeight, behavior: 'smooth' });
          }
        }, 300);
      }
      setFocusVideoId(null);
    }
  }, [focusVideoId, isVideosLoading, videoFeedItems]);

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

  // IMPORTANT: Fonction de création avec upload audio base64
  const handleCreatePost = useCallback(async (data: any) => {
    try {
      const topic = data.category === 'village_voice' ? 'mavoix' : (data.category || createPostType);
      
      // Upload audio base64 to storage if present
      let audioUrl = data.audio_url || null;
      if (!audioUrl && data.audio_base64) {
        try {
          const response = await fetch(data.audio_base64);
          const blob = await response.blob();
          const ext = blob.type.includes('mp4') ? 'mp4' : 'webm';
          const fileName = `posts/audio_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('tamtam-audio')
            .upload(fileName, blob, { contentType: blob.type || 'audio/webm' });
          if (!uploadError && uploadData) {
            const { data: urlData } = supabase.storage.from('tamtam-audio').getPublicUrl(uploadData.path);
            audioUrl = urlData.publicUrl;
          } else {
            console.error('[TamTamSocial] Audio upload error:', uploadError);
          }
        } catch (uploadErr) {
          console.error('[TamTamSocial] Audio base64 upload failed:', uploadErr);
        }
      }
      
      const postData = {
        ...data,
        audio_url: audioUrl,
        topic,
      };
      
      await createPost(postData);
      toast({ title: "✅ Publié!" });
      triggerFeedback('success');
      // createPost already calls fetchPosts internally - no double fetch
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
      // createPost already calls fetchPosts internally - no double fetch
      setShowCreator(false);
    } catch (error) {
      console.error('Erreur publication:', error);
      toast({ title: "❌ Erreur", description: "Impossible de publier. Réessayez.", variant: "destructive" });
    }
  }, [createPost, fetchPosts, toast]);

  // Filter posts - improved logic to show all posts matching the category
  // ✅ FIX: Combine tamtam_posts AND videos table for complete feed
  // OPTIMIZED: Separate useMemo for video card mapping (only recalculates when videoFeedItems changes)
  const videosAsVideoCards = useMemo(() => videoFeedItems.map(v => ({
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
      metadata: v.metadata,
      // Flag to identify this is from videos table
      _sourceTable: 'videos',
    })), [videoFeedItems]);

  const getCurrentPosts = useMemo(() => {
    const allPosts = posts.length > 0 ? posts : [];
    
    switch (feedMode) {
      case 'patrimoine':
        return allPosts.filter(p => {
          const post = p as any;
          return (
            post.topic === 'patrimoine' || 
            post.topic === 'culture' || 
            post.template_id?.includes('conte') ||
            post.template_id?.includes('chant') ||
            post.template_id?.includes('proverbe') ||
            (post.culture_score && post.culture_score > 0)
          );
        });
        
      case 'mavoix':
        return allPosts.filter(p => {
          const post = p as any;
          return (
            post.topic === 'mavoix' || 
            post.topic === 'annonce' ||
            post.topic === 'village_voice' ||
            post.template_id?.includes('annonce') ||
            post.template_id?.includes('question') ||
            post.template_id?.includes('merci')
          );
        });
        
      case 'creation':
        const creationFromPosts = allPosts.filter(p => {
          const post = p as any;
          return (post.media_type === 'video' || post.media_type === 'photo') && 
                 post.media_url && post.media_url.trim().length > 0 &&
                 post.topic !== 'patrimoine' && post.topic !== 'mavoix';
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
                // VIRTUALIZED: Only render posts near the current index
                getCurrentPosts.map((post, i) => {
                  // Only render posts within 2 of current index for memory efficiency
                  const shouldRender = Math.abs(i - currentPostIndex) <= 2;
                  if (!shouldRender) {
                    // Placeholder to maintain scroll position
                    return <div key={post.id} className="h-screen snap-start snap-always" style={{ height: '100vh' }} />;
                  }
                  return (
                    <VideoFeedCard 
                      key={post.id} 
                      post={post} 
                      isActive={i === currentPostIndex} 
                      onComment={() => handleOpenComments(post.id)} 
                      isMuted={isMuted}
                      onToggleMute={() => setIsMuted(prev => !prev)}
                      onPlayInteractive={handlePlayInteractiveStory}
                    />
                  );
                })
              ) : (
                // VIRTUALIZED: Only render audio posts near the current index
                getCurrentPosts.map((post, i) => {
                  const shouldRender = Math.abs(i - currentPostIndex) <= 2;
                  if (!shouldRender) {
                    return <div key={post.id} className="h-screen snap-start snap-always" style={{ height: '100vh' }} />;
                  }
                  const totalPosts = getCurrentPosts.length;
                  return (
                    <AudioFeedCard
                      key={post.id}
                      post={post}
                      isActive={i === currentPostIndex}
                      category={feedMode === 'patrimoine' ? 'patrimoine' : 'mavoix'}
                      onComment={() => handleOpenComments(post.id)}
                      hasPrevious={i > 0}
                      hasNext={i < totalPosts - 1}
                      onPrevious={() => {
                        if (i > 0) {
                          const container = document.querySelector('.snap-y.snap-mandatory');
                          if (container) container.scrollTo({ top: (i - 1) * window.innerHeight, behavior: 'smooth' });
                        }
                      }}
                      onNext={() => {
                        if (i < totalPosts - 1) {
                          const container = document.querySelector('.snap-y.snap-mandatory');
                          if (container) container.scrollTo({ top: (i + 1) * window.innerHeight, behavior: 'smooth' });
                        }
                      }}
                    />
                  );
                })
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

      <TamTamCreatePost isOpen={showCreatePost} onClose={() => setShowCreatePost(false)} onSubmit={handleCreatePost} initialCategory={createPostType === 'patrimoine' ? 'patrimoine' : createPostType === 'mavoix' ? 'village_voice' : undefined} />

      <FullscreenCreator open={showCreator} onClose={() => setShowCreator(false)} onPublish={handleCreatorComplete} />

      <TamTamCommentsModal isOpen={commentsModal.isOpen} onClose={() => setCommentsModal(prev => ({ ...prev, isOpen: false }))} comments={commentsModal.comments} onAddComment={async (audioBase64: string, duration: number) => {
        if (!commentsModal.postId) return;
        try {
          const { data: userData } = await supabase.auth.getUser();
          if (!userData?.user) {
            toast({ title: '🔐 Connexion requise', description: 'Connectez-vous pour commenter cette publication', variant: 'destructive' });
            return;
          }
          const audioBlob = await fetch(`data:audio/webm;base64,${audioBase64}`).then(r => r.blob());
          const audioUrl = await uploadMediaToStorage(audioBlob, 'audio', userData.user.id);
          await addComment(commentsModal.postId, { audio_url: audioUrl, duration_seconds: duration });
          const comments = await fetchComments(commentsModal.postId);
          setCommentsModal(prev => ({ ...prev, comments }));
        } catch (err) {
          console.error('Comment error:', err);
        }
      }} isLoading={commentsModal.isLoading} />

      {/* Interactive Story Player Overlay */}
      {interactiveStory && (
        <div className="fixed inset-0 z-[100] bg-black">
          <BranchingPlayer
            graph={interactiveStory.graph}
            storyId={interactiveStory.id}
            onClose={() => setInteractiveStory(null)}
          />
        </div>
      )}
    </div>
  );
}

export { TamTamSocial };
