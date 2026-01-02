import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Menu, X, Home, Search, MessageCircle, Users, Zap, 
  Heart, Share2, Bookmark, MoreHorizontal, Volume2, VolumeX,
  Play, Pause, ChevronRight, Settings, Globe, ShoppingBag,
  User, Star, Music, MapPin, Clock, Eye, Send, Mic,
  Video, Radio, Headphones, TrendingUp, Bell
} from 'lucide-react';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';
import { useAudioDescription } from '@/contexts/AudioDescriptionContext';
import { useTamTamPosts, TamTamComment } from '@/hooks/useTamTamPosts';
import { useTamTamPolls } from '@/hooks/useTamTamPolls';
import { useFeedAlgorithm } from '@/hooks/useFeedAlgorithm';
import { TamTamCommentsModal } from '@/components/tamtam/TamTamCommentsModal';
import { TamTamCreatePost } from '@/components/tamtam/TamTamCreatePost';
import { TamTamVocalPoll } from '@/components/tamtam/TamTamVocalPoll';
import { TamTamStoryCreator } from '@/components/tamtam/TamTamStoryCreator';
import { TamTamUserSearch } from '@/components/tamtam/TamTamUserSearch';
import { TamTamCommunities } from '@/components/tamtam/TamTamCommunities';
import { TamTamLiveList } from '@/components/tamtam/TamTamLiveList';
import { TamTamMessagesHub } from '@/components/tamtam/TamTamMessagesHub';
import FullscreenCreator from '@/components/tamtam/FullscreenCreator';
import { triggerFeedback } from '@/utils/tamtamFeedback';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// ═══════════════════════════════════════════════════════════════════════════════
// 📱 TAM-TAM SOCIAL - KUAISHOU/TIKTOK DESIGN
// ═══════════════════════════════════════════════════════════════════════════════
// Structure:
// - Header transparent flottant (style TikTok)
// - Menu hamburger latéral
// - Feed vidéo/audio plein écran
// - Bottom Navigation (Fil, Chat, +, Groupes, Direct)
// ═══════════════════════════════════════════════════════════════════════════════

type BottomTab = 'fil' | 'chat' | 'groupes' | 'direct';
type FeedMode = 'creation' | 'radio' | 'mavoix';

// Configuration du menu latéral
const menuItems = [
  { icon: '🏠', label: 'Accueil', labelBa: 'Ilé', path: '/tamtam', gradient: 'from-blue-500 to-cyan-400' },
  { icon: '💬', label: 'Social', labelBa: 'Àwùjọ', path: '/tamtam/social', gradient: 'from-emerald-500 to-teal-400' },
  { icon: '🛒', label: 'Marché', labelBa: 'Ọjà', path: '/tamtam/market', gradient: 'from-orange-500 to-amber-400' },
  { icon: '👤', label: 'Profil', labelBa: 'Profaili', path: '/tamtam/profile', gradient: 'from-purple-500 to-pink-400' },
];

// Configuration des modes de feed (header)
const feedModes: { id: FeedMode; label: string; labelBa: string }[] = [
  { id: 'creation', label: '🎬 Création', labelBa: '🎬 Ṣíṣẹ̀dá' },
  { id: 'radio', label: '📻 Radio', labelBa: '📻 Rédíò' },
  { id: 'mavoix', label: '🎤 Ma Voix', labelBa: '🎤 Ohùn Mi' },
];

// Configuration bottom nav
const bottomTabs: { id: BottomTab; icon: typeof Home; label: string; labelBa: string }[] = [
  { id: 'fil', icon: Home, label: 'Fil', labelBa: 'Ìtàn' },
  { id: 'chat', icon: MessageCircle, label: 'Chat', labelBa: 'Ọ̀rọ̀' },
  { id: 'groupes', icon: Users, label: 'Groupes', labelBa: 'Ẹgbẹ́' },
  { id: 'direct', icon: Zap, label: 'Direct', labelBa: 'Tààrà' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// MENU LATÉRAL (HAMBURGER)
// ═══════════════════════════════════════════════════════════════════════════════

const SideMenu: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  currentLang: string;
  onNavigate: (path: string) => void;
}> = ({ isOpen, onClose, currentLang, onNavigate }) => (
  <AnimatePresence>
    {isOpen && (
      <>
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
        />
        
        {/* Menu Panel */}
        <motion.div
          initial={{ x: '-100%' }}
          animate={{ x: 0 }}
          exit={{ x: '-100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed left-0 top-0 bottom-0 w-[280px] z-50"
          style={{ background: 'linear-gradient(180deg, #0f0f1a 0%, #1a1a2e 100%)' }}
        >
          {/* Header du menu */}
          <div className="p-5 border-b border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <motion.div 
                  className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 flex items-center justify-center shadow-lg"
                  animate={{ rotate: [0, 5, -5, 0] }}
                  transition={{ repeat: Infinity, duration: 3 }}
                >
                  <span className="text-2xl">🥁</span>
                </motion.div>
                <div>
                  <h2 className="text-xl font-black text-white">TAM-TAM</h2>
                  <p className="text-xs text-white/50">Social Audio</p>
                </div>
              </div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center"
              >
                <X className="w-5 h-5 text-white" />
              </motion.button>
            </div>
          </div>

          {/* Menu Items */}
          <div className="p-3 space-y-1">
            {menuItems.map((item, index) => (
              <motion.button
                key={item.path}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.08 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => { onNavigate(item.path); onClose(); }}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all"
              >
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${item.gradient} flex items-center justify-center`}>
                  <span className="text-xl">{item.icon}</span>
                </div>
                <span className="text-white font-medium flex-1 text-left">
                  {currentLang === 'ba' ? item.labelBa : item.label}
                </span>
                <ChevronRight className="w-4 h-4 text-white/30" />
              </motion.button>
            ))}
          </div>

          {/* Footer */}
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10">
            <div className="flex items-center justify-center gap-2">
              <Globe className="w-4 h-4 text-white/40" />
              <span className="text-white/40 text-sm">
                {currentLang === 'ba' ? 'Bàátɔ̀nú' : 'Français'}
              </span>
            </div>
          </div>
        </motion.div>
      </>
    )}
  </AnimatePresence>
);

// ═══════════════════════════════════════════════════════════════════════════════
// HEADER FLOTTANT TRANSPARENT (STYLE TIKTOK)
// ═══════════════════════════════════════════════════════════════════════════════

const FloatingHeader: React.FC<{
  currentMode: FeedMode;
  onModeChange: (mode: FeedMode) => void;
  onMenuOpen: () => void;
  onSearch: () => void;
  currentLang: string;
  liveCount?: number;
}> = ({ currentMode, onModeChange, onMenuOpen, onSearch, currentLang, liveCount = 0 }) => (
  <div className="fixed top-0 left-0 right-0 z-40 safe-area-top">
    {/* Gradient pour lisibilité */}
    <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/40 to-transparent pointer-events-none" />
    
    <div className="relative px-4 py-3 flex items-center justify-between">
      {/* Menu Hamburger */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={onMenuOpen}
        className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center border border-white/10"
      >
        <Menu className="w-5 h-5 text-white" />
      </motion.button>

      {/* Feed Mode Tabs - Style TikTok */}
      <div className="flex items-center gap-1">
        {liveCount > 0 && (
          <motion.div
            className="flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/20 border border-red-500/30 mr-2"
            animate={{ opacity: [1, 0.7, 1] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          >
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-red-400 text-xs font-bold">LIVE</span>
          </motion.div>
        )}
        
        {feedModes.map((mode) => {
          const isActive = currentMode === mode.id;
          return (
            <motion.button
              key={mode.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => onModeChange(mode.id)}
              className="relative px-3 py-2"
            >
              <span className={`text-sm font-semibold transition-all ${
                isActive ? 'text-white' : 'text-white/50'
              }`}>
                {currentLang === 'ba' ? mode.labelBa : mode.label}
              </span>
              {isActive && (
                <motion.div
                  layoutId="headerTabIndicator"
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-1 rounded-full bg-white"
                />
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Search */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={onSearch}
        className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center border border-white/10"
      >
        <Search className="w-5 h-5 text-white" />
      </motion.button>
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// BOTTOM NAVIGATION (STYLE TIKTOK)
// ═══════════════════════════════════════════════════════════════════════════════

const BottomNavigation: React.FC<{
  activeTab: BottomTab;
  onTabChange: (tab: BottomTab) => void;
  onCreatePress: () => void;
  currentLang: string;
  unreadMessages?: number;
}> = ({ activeTab, onTabChange, onCreatePress, currentLang, unreadMessages = 0 }) => (
  <motion.nav
    initial={{ y: 100 }}
    animate={{ y: 0 }}
    className="fixed bottom-0 left-0 right-0 z-40 safe-area-bottom"
    style={{ 
      background: 'rgba(0, 0, 0, 0.95)', 
      backdropFilter: 'blur(20px)',
      borderTop: '1px solid rgba(255,255,255,0.08)'
    }}
  >
    <div className="flex items-center justify-around py-2">
      {/* Fil & Chat */}
      {bottomTabs.slice(0, 2).map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <motion.button
            key={tab.id}
            whileTap={{ scale: 0.9 }}
            onClick={() => onTabChange(tab.id)}
            className="flex flex-col items-center gap-1 px-4 py-2 relative"
          >
            <Icon className={`w-6 h-6 ${isActive ? 'text-white' : 'text-white/50'}`} strokeWidth={isActive ? 2.5 : 2} />
            <span className={`text-[10px] font-medium ${isActive ? 'text-white' : 'text-white/50'}`}>
              {currentLang === 'ba' ? tab.labelBa : tab.label}
            </span>
            {tab.id === 'chat' && unreadMessages > 0 && (
              <span className="absolute -top-1 right-0 min-w-[16px] h-[16px] px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                {unreadMessages > 99 ? '99+' : unreadMessages}
              </span>
            )}
          </motion.button>
        );
      })}

      {/* Bouton Create - Style TikTok */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={onCreatePress}
        className="relative -mt-5"
      >
        <div className="relative w-14 h-10 rounded-lg overflow-hidden shadow-2xl">
          {/* Gradient gauche (cyan) */}
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-blue-500" />
          {/* Gradient droite (rose) */}
          <div 
            className="absolute inset-0 bg-gradient-to-r from-pink-500 to-red-500" 
            style={{ clipPath: 'polygon(35% 0, 100% 0, 100% 100%, 15% 100%)' }} 
          />
          {/* Plus */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-white text-2xl font-bold">+</span>
          </div>
        </div>
      </motion.button>

      {/* Groupes & Direct */}
      {bottomTabs.slice(2).map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <motion.button
            key={tab.id}
            whileTap={{ scale: 0.9 }}
            onClick={() => onTabChange(tab.id)}
            className="flex flex-col items-center gap-1 px-4 py-2 relative"
          >
            {tab.id === 'direct' && (
              <motion.span
                className="absolute -top-1 right-0 w-2 h-2 rounded-full bg-red-500"
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ repeat: Infinity, duration: 1 }}
              />
            )}
            <Icon className={`w-6 h-6 ${isActive ? 'text-white' : 'text-white/50'}`} strokeWidth={isActive ? 2.5 : 2} />
            <span className={`text-[10px] font-medium ${isActive ? 'text-white' : 'text-white/50'}`}>
              {currentLang === 'ba' ? tab.labelBa : tab.label}
            </span>
          </motion.button>
        );
      })}
    </div>
  </motion.nav>
);

// ═══════════════════════════════════════════════════════════════════════════════
// VIDEO CARD (STYLE KUAISHOU)
// ═══════════════════════════════════════════════════════════════════════════════

const VideoCard: React.FC<{
  post: any;
  isActive: boolean;
  onLike: () => void;
  onComment: () => void;
  onShare: () => void;
  onSave: () => void;
  currentLang: string;
}> = ({ post, isActive, onLike, onComment, onShare, onSave, currentLang }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const handleLike = () => {
    setIsLiked(!isLiked);
    triggerFeedback('success');
    onLike();
  };

  const handleSave = () => {
    setIsSaved(!isSaved);
    triggerFeedback('success');
    onSave();
  };

  return (
    <div className="h-screen w-full snap-start snap-always relative bg-black">
      {/* Fond gradient si pas de vidéo */}
      <div 
        className="absolute inset-0"
        style={{
          background: `linear-gradient(135deg, 
            hsl(${Math.random() * 360}, 70%, 25%) 0%, 
            hsl(${Math.random() * 360}, 60%, 20%) 50%,
            hsl(${Math.random() * 360}, 50%, 15%) 100%)`
        }}
      />

      {/* Contenu central */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center px-8"
        >
          <span className="text-6xl mb-4 block">{post.feeling_emoji || '🎬'}</span>
          <p className="text-white text-lg font-medium leading-relaxed">
            {post.transcript_fr || post.transcript || 'Contenu TAM-TAM'}
          </p>
        </motion.div>
      </div>

      {/* Actions à droite - Style Kuaishou */}
      <div className="absolute right-3 bottom-32 flex flex-col items-center gap-5">
        {/* Avatar auteur */}
        <motion.div whileTap={{ scale: 0.9 }} className="relative mb-2">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-orange-500 flex items-center justify-center border-2 border-white overflow-hidden">
            {post.profile?.avatar_url ? (
              <img src={post.profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xl">👤</span>
            )}
          </div>
          <motion.div 
            className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-red-500 flex items-center justify-center border-2 border-white"
            whileTap={{ scale: 0.8 }}
          >
            <span className="text-white text-xs font-bold">+</span>
          </motion.div>
        </motion.div>

        {/* Like */}
        <motion.button whileTap={{ scale: 0.8 }} onClick={handleLike} className="flex flex-col items-center gap-1">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isLiked ? 'bg-red-500' : 'bg-black/30 backdrop-blur-md border border-white/10'}`}>
            <Heart className={`w-7 h-7 ${isLiked ? 'text-white fill-white' : 'text-white'}`} />
          </div>
          <span className="text-white text-xs font-bold">{post.reactions_count || '0'}</span>
        </motion.button>

        {/* Comment */}
        <motion.button whileTap={{ scale: 0.8 }} onClick={onComment} className="flex flex-col items-center gap-1">
          <div className="w-12 h-12 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center border border-white/10">
            <MessageCircle className="w-7 h-7 text-white" />
          </div>
          <span className="text-white text-xs font-bold">{post.comments_count || '0'}</span>
        </motion.button>

        {/* Favoris */}
        <motion.button whileTap={{ scale: 0.8 }} onClick={handleSave} className="flex flex-col items-center gap-1">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isSaved ? 'bg-amber-500' : 'bg-black/30 backdrop-blur-md border border-white/10'}`}>
            <Star className={`w-7 h-7 ${isSaved ? 'text-white fill-white' : 'text-white'}`} />
          </div>
          <span className="text-white text-xs font-bold">{isSaved ? '1' : '0'}</span>
        </motion.button>

        {/* Partage */}
        <motion.button whileTap={{ scale: 0.8 }} onClick={onShare} className="flex flex-col items-center gap-1">
          <div className="w-12 h-12 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center border border-white/10">
            <Share2 className="w-7 h-7 text-white" />
          </div>
          <span className="text-white text-xs font-bold">0</span>
        </motion.button>
      </div>

      {/* Info en bas à gauche - Style TikTok */}
      <div className="absolute left-4 bottom-24 max-w-[70%]">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-white font-bold">@{post.profile?.username || 'tamtam_user'}</span>
          <motion.button
            whileTap={{ scale: 0.95 }}
            className="px-3 py-1 rounded-full bg-red-500 text-white text-xs font-bold"
          >
            + {currentLang === 'ba' ? 'Tẹ̀lé' : 'Suivre'}
          </motion.button>
        </div>
        <p className="text-white text-sm line-clamp-2">
          {post.transcript_fr?.slice(0, 100) || 'Contenu audio TAM-TAM'} #Culture #Bénin
        </p>
        
        {/* Musique */}
        <motion.div 
          className="flex items-center gap-2 mt-2"
          animate={{ x: [-200, 0] }}
          transition={{ repeat: Infinity, duration: 8, ease: 'linear' }}
        >
          <Music className="w-4 h-4 text-white" />
          <span className="text-white/80 text-xs">🎵 Son original - TAM-TAM</span>
        </motion.div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// SEARCH MODAL
// ═══════════════════════════════════════════════════════════════════════════════

const SearchModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  currentLang: string;
}> = ({ isOpen, onClose, currentLang }) => (
  <AnimatePresence>
    {isOpen && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/95 backdrop-blur-xl z-50"
      >
        <div className="p-4 pt-safe">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
            <input
              type="text"
              placeholder={currentLang === 'ba' ? 'Wá...' : 'Rechercher...'}
              autoFocus
              className="w-full bg-white/10 border border-white/20 rounded-2xl pl-12 pr-12 py-4 text-white placeholder-white/50 focus:outline-none"
            />
            <motion.button whileTap={{ scale: 0.9 }} onClick={onClose} className="absolute right-4 top-1/2 -translate-y-1/2">
              <X className="w-5 h-5 text-white/50" />
            </motion.button>
          </div>
          
          <div className="mt-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-pink-500" />
              <span className="text-white font-semibold">{currentLang === 'ba' ? 'Gbajúmọ̀' : 'Tendances'}</span>
            </div>
            {['🎵 Musique', '📖 Contes', '🌾 Agriculture', '🩺 Santé', '🎭 Culture'].map((item, i) => (
              <motion.button
                key={i}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: i * 0.05 }}
                className="w-full text-left px-4 py-3 rounded-xl hover:bg-white/5 text-white flex items-center gap-3"
              >
                <span className="text-xl">{item.split(' ')[0]}</span>
                <span>{item.split(' ').slice(1).join(' ')}</span>
              </motion.button>
            ))}
          </div>
        </div>
      </motion.div>
    )}
  </AnimatePresence>
);

// ═══════════════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export default function TamTamSocial() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, currentLang } = useTamTamLanguage();
  const { announceScreen } = useAudioDescription();
  const { toast } = useToast();
  
  const { posts, isLoading, createPost, addReaction, fetchComments, addComment, fetchPosts } = useTamTamPosts();
  const { polls } = useTamTamPolls();
  const { rankPosts } = useFeedAlgorithm({ prioritizeUtility: true, prioritizeCulture: true });

  // États
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<BottomTab>('fil');
  const [feedMode, setFeedMode] = useState<FeedMode>('creation');
  const [showSearch, setShowSearch] = useState(false);
  const [showCreator, setShowCreator] = useState(false);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showCreatePoll, setShowCreatePoll] = useState(false);
  const [currentPostIndex, setCurrentPostIndex] = useState(0);
  const [unreadMessages] = useState(3);
  const [liveCount] = useState(2);

  const [commentsModal, setCommentsModal] = useState<{
    isOpen: boolean;
    postId: string | null;
    comments: TamTamComment[];
    isLoading: boolean;
  }>({ isOpen: false, postId: null, comments: [], isLoading: false });

  // Gestion de la navigation depuis d'autres pages
  useEffect(() => {
    const state = location.state as any;
    if (state?.tab) {
      setActiveTab(state.tab === 'messages' ? 'chat' : state.tab === 'communities' ? 'groupes' : state.tab === 'live' ? 'direct' : 'fil');
    }
    if (state?.openCreator) {
      setShowCreator(true);
    }
  }, [location.state]);

  useEffect(() => {
    announceScreen('social');
  }, [announceScreen]);

  const handleNavigate = useCallback((path: string) => {
    triggerFeedback('click');
    navigate(path);
  }, [navigate]);

  const handleTabChange = useCallback((tab: BottomTab) => {
    triggerFeedback('notification', { haptic: true, sound: false });
    setActiveTab(tab);
  }, []);

  const handleFeedModeChange = useCallback((mode: FeedMode) => {
    triggerFeedback('notification', { haptic: true, sound: false });
    setFeedMode(mode);
  }, []);

  const handleOpenComments = useCallback(async (postId: string) => {
    setCommentsModal({ isOpen: true, postId, comments: [], isLoading: true });
    const comments = await fetchComments(postId);
    setCommentsModal(prev => ({ ...prev, comments, isLoading: false }));
  }, [fetchComments]);

  const handleShare = useCallback((postId: string) => {
    triggerFeedback('send');
    if (navigator.share) {
      navigator.share({ title: 'TAM-TAM', text: 'Découvrez ce contenu !', url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({ title: "🔗 Lien copié !" });
    }
  }, [toast]);

  // Ranked posts
  const rankedPosts = useMemo(() => {
    const enhanced = posts.map(post => ({
      ...post,
      media_type: (post as any).media_type || 'audio',
      transcript_fr: (post as any).transcript_fr || (post as any).transcript || null,
    }));
    return rankPosts(enhanced);
  }, [posts, rankPosts]);

  return (
    <div className="min-h-screen bg-black">
      {/* Menu Latéral */}
      <SideMenu
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        currentLang={currentLang}
        onNavigate={handleNavigate}
      />

      {/* Header Flottant */}
      <FloatingHeader
        currentMode={feedMode}
        onModeChange={handleFeedModeChange}
        onMenuOpen={() => setIsMenuOpen(true)}
        onSearch={() => setShowSearch(true)}
        currentLang={currentLang}
        liveCount={liveCount}
      />

      {/* Contenu principal selon l'onglet */}
      <AnimatePresence mode="wait">
        {activeTab === 'fil' && (
          <motion.div
            key="fil"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-screen overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
          >
            {isLoading ? (
              <div className="h-screen flex items-center justify-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                  className="w-12 h-12 border-4 border-white border-t-transparent rounded-full"
                />
              </div>
            ) : rankedPosts.length > 0 ? (
              rankedPosts.map((post, index) => (
                <VideoCard
                  key={post.id}
                  post={post}
                  isActive={index === currentPostIndex}
                  onLike={() => addReaction(post.id, 'like')}
                  onComment={() => handleOpenComments(post.id)}
                  onShare={() => handleShare(post.id)}
                  onSave={() => triggerFeedback('success')}
                  currentLang={currentLang}
                />
              ))
            ) : (
              <div className="h-screen flex flex-col items-center justify-center px-8">
                <span className="text-6xl mb-4">🥁</span>
                <p className="text-white/60 text-center">
                  {currentLang === 'ba' ? 'Kò sí àkóónú' : 'Aucun contenu pour le moment'}
                </p>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowCreator(true)}
                  className="mt-6 px-6 py-3 rounded-full bg-gradient-to-r from-pink-500 to-orange-500 text-white font-bold"
                >
                  {currentLang === 'ba' ? 'Ṣẹ̀dá àkọ́kọ́' : 'Créer le premier'}
                </motion.button>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'chat' && (
          <motion.div key="chat" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="pt-20 pb-20">
            <TamTamMessagesHub isOpen={true} onClose={() => setActiveTab('fil')} />
          </motion.div>
        )}

        {activeTab === 'groupes' && (
          <motion.div key="groupes" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="pt-20 pb-20">
            <TamTamCommunities />
          </motion.div>
        )}

        {activeTab === 'direct' && (
          <motion.div key="direct" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="pt-20 pb-20">
            <TamTamLiveList />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Navigation */}
      <BottomNavigation
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onCreatePress={() => setShowCreator(true)}
        currentLang={currentLang}
        unreadMessages={unreadMessages}
      />

      {/* Modals */}
      <SearchModal isOpen={showSearch} onClose={() => setShowSearch(false)} currentLang={currentLang} />

      <TamTamCommentsModal
        isOpen={commentsModal.isOpen}
        onClose={() => setCommentsModal(prev => ({ ...prev, isOpen: false }))}
        comments={commentsModal.comments}
        onAddComment={async () => {}}
        isLoading={commentsModal.isLoading}
      />

      <TamTamCreatePost
        isOpen={showCreatePost}
        onClose={() => setShowCreatePost(false)}
        onSubmit={async (data) => {
          await createPost(data);
          triggerFeedback('success');
          toast({ title: "✅ Publié !" });
        }}
        onOpenPoll={() => setShowCreatePoll(true)}
      />

      <TamTamVocalPoll isOpen={showCreatePoll} onClose={() => setShowCreatePoll(false)} />

      <FullscreenCreator
        isOpen={showCreator}
        onClose={() => setShowCreator(false)}
        onComplete={async (data) => {
          await createPost({
            audio_url: data.audio_url,
            media_type: data.media_type,
            media_url: data.media_url,
            transcript_fr: data.transcript_fr || '',
            transcript_ba: data.transcript_ba || '',
            topic: data.topic,
            template_id: data.template_id,
            duration_seconds: data.duration_seconds,
          });
          toast({ title: "✅ Publié avec succès !" });
          triggerFeedback('success');
          fetchPosts();
          setShowCreator(false);
        }}
      />
    </div>
  );
}

// Export nommé
export { TamTamSocial };
