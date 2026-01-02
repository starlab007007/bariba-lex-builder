import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useCallback } from 'react';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';
import { useAudioDescription } from '@/contexts/AudioDescriptionContext';
import { useTamTamPosts } from '@/hooks/useTamTamPosts';
import { triggerFeedback } from '@/utils/tamtamFeedback';
import { 
  Menu, X, Home, Search, Video, Radio, Mic, Users, Zap, 
  MessageCircle, Settings, ChevronRight, Globe, Heart, 
  Play, Music, Star, Share2, ChevronDown, TrendingUp
} from 'lucide-react';
import { RaconteMoiAssistant } from '@/components/tamtam/RaconteMoiAssistant';
import { TamTamVideoFeed } from '@/components/tamtam/TamTamVideoFeed';
import { TamTamAudioFeed } from '@/components/tamtam/TamTamAudioFeed';
import FullscreenCreator from '@/components/tamtam/FullscreenCreator';

// ═══════════════════════════════════════════════════════════════════════════════
// 🏠 TAM-TAM HOME - KUAISHOU/TIKTOK IMMERSIVE EXPERIENCE
// ═══════════════════════════════════════════════════════════════════════════════
// Design: Full-screen feeds + Floating header + Bottom navigation
// Features: Welcome → Video Feed → Audio Feed with snap scroll
// ═══════════════════════════════════════════════════════════════════════════════

type BottomTab = 'fil' | 'chat' | 'groupes' | 'direct';
type FeedMode = 'creation' | 'radio' | 'mavoix';

interface MenuItem {
  icon: string;
  label: string;
  labelBa: string;
  path: string;
  gradient: string;
}

const menuItems: MenuItem[] = [
  { icon: '🏠', label: 'Accueil', labelBa: 'Sòó', path: '/tamtam', gradient: 'from-blue-500 to-cyan-400' },
  { icon: '💬', label: 'Social', labelBa: 'Sósìyálù', path: '/tamtam/social', gradient: 'from-emerald-500 to-teal-400' },
  { icon: '🛒', label: 'Marché', labelBa: 'Ọjà', path: '/tamtam/market', gradient: 'from-orange-500 to-amber-400' },
  { icon: '👤', label: 'Profil', labelBa: 'Profaili', path: '/tamtam/profile', gradient: 'from-purple-500 to-pink-400' },
];

const feedModes: { id: FeedMode; emoji: string; label: string; labelBa: string; desc: string }[] = [
  { id: 'creation', emoji: '🎬', label: 'Création', labelBa: 'Ṣíṣẹ̀dá', desc: 'Vidéos & Photos' },
  { id: 'radio', emoji: '📻', label: 'Radio', labelBa: 'Rédíò', desc: 'Patrimoine Audio' },
  { id: 'mavoix', emoji: '🎤', label: 'Ma Voix', labelBa: 'Ohùn Mi', desc: 'Messages Vocaux' },
];

const bottomTabs: { id: BottomTab; icon: typeof Home; label: string; labelBa: string }[] = [
  { id: 'fil', icon: Home, label: 'Fil', labelBa: 'Ìtàn' },
  { id: 'chat', icon: MessageCircle, label: 'Chat', labelBa: 'Ọ̀rọ̀' },
  { id: 'groupes', icon: Users, label: 'Groupes', labelBa: 'Àwùjọ' },
  { id: 'direct', icon: Zap, label: 'Direct', labelBa: 'Tààrà' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// SIDE MENU
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
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
        />
        
        <motion.div
          initial={{ x: '-100%' }}
          animate={{ x: 0 }}
          exit={{ x: '-100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed left-0 top-0 bottom-0 w-[300px] z-50 overflow-hidden"
          style={{ background: 'linear-gradient(180deg, #0a0a0f 0%, #1a1a2e 50%, #0f0f1a 100%)' }}
        >
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <motion.div 
                  className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 flex items-center justify-center shadow-lg shadow-orange-500/30"
                  animate={{ rotate: [0, 5, -5, 0] }}
                  transition={{ repeat: Infinity, duration: 4 }}
                >
                  <span className="text-3xl">🥁</span>
                </motion.div>
                <div>
                  <h2 className="text-2xl font-black bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">TAM-TAM</h2>
                  <p className="text-xs text-white/50">{currentLang === 'ba' ? 'Ohùn Àwùjọ' : 'Social Audio'}</p>
                </div>
              </div>
              <motion.button whileTap={{ scale: 0.9 }} onClick={onClose} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                <X className="w-5 h-5 text-white" />
              </motion.button>
            </div>
          </div>

          <div className="p-4 space-y-2">
            {menuItems.map((item, index) => (
              <motion.button
                key={item.path}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => { onNavigate(item.path); onClose(); }}
                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-all group"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.gradient} flex items-center justify-center shadow-lg`}>
                  <span className="text-2xl">{item.icon}</span>
                </div>
                <p className="text-white font-semibold flex-1 text-left">{currentLang === 'ba' ? item.labelBa : item.label}</p>
                <ChevronRight className="w-5 h-5 text-white/30 group-hover:text-white/60" />
              </motion.button>
            ))}
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10">
            <motion.button whileTap={{ scale: 0.98 }} onClick={() => onNavigate('/tamtam/settings')} className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10">
              <Settings className="w-5 h-5 text-white/60" />
              <span className="text-white/60 text-sm">{currentLang === 'ba' ? 'Ètò' : 'Paramètres'}</span>
            </motion.button>
            <div className="flex items-center justify-center gap-2 mt-4">
              <Globe className="w-4 h-4 text-white/40" />
              <span className="text-white/40 text-xs">{currentLang === 'ba' ? 'Bàátɔ̀nú' : 'Français'}</span>
            </div>
          </div>
        </motion.div>
      </>
    )}
  </AnimatePresence>
);

// ═══════════════════════════════════════════════════════════════════════════════
// FLOATING HEADER
// ═══════════════════════════════════════════════════════════════════════════════

const FloatingHeader: React.FC<{
  currentMode: FeedMode;
  onModeChange: (mode: FeedMode) => void;
  onMenuOpen: () => void;
  onSearch: () => void;
  currentLang: string;
}> = ({ currentMode, onModeChange, onMenuOpen, onSearch, currentLang }) => (
  <motion.header
    initial={{ y: -100, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    className="fixed top-0 left-0 right-0 z-40 safe-area-top"
  >
    <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-none" />
    
    <div className="relative px-4 py-3">
      <div className="flex items-center justify-between">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onMenuOpen}
          className="w-11 h-11 rounded-full bg-black/30 backdrop-blur-xl flex items-center justify-center border border-white/10"
        >
          <Menu className="w-5 h-5 text-white" />
        </motion.button>

        <div className="flex items-center">
          {feedModes.map((mode) => {
            const isActive = currentMode === mode.id;
            return (
              <motion.button
                key={mode.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => onModeChange(mode.id)}
                className="relative px-3 py-2"
              >
                <div className="flex flex-col items-center">
                  <span className={`text-sm font-bold transition-all ${isActive ? 'text-white' : 'text-white/50'}`}>
                    {mode.emoji} {currentLang === 'ba' ? mode.labelBa : mode.label}
                  </span>
                  {isActive && <span className="text-[10px] text-white/60 mt-0.5">{mode.desc}</span>}
                </div>
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-white"
                    transition={{ type: 'spring', bounce: 0.3 }}
                  />
                )}
              </motion.button>
            );
          })}
        </div>

        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onSearch}
          className="w-11 h-11 rounded-full bg-black/30 backdrop-blur-xl flex items-center justify-center border border-white/10"
        >
          <Search className="w-5 h-5 text-white" />
        </motion.button>
      </div>
    </div>
  </motion.header>
);

// ═══════════════════════════════════════════════════════════════════════════════
// BOTTOM NAVIGATION
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
    style={{ background: 'rgba(0, 0, 0, 0.98)', backdropFilter: 'blur(20px)', borderTop: '1px solid rgba(255,255,255,0.08)' }}
  >
    <div className="flex items-center justify-around py-2 px-4">
      {bottomTabs.slice(0, 2).map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <motion.button
            key={tab.id}
            whileTap={{ scale: 0.9 }}
            onClick={() => onTabChange(tab.id)}
            className="flex flex-col items-center gap-1 px-5 py-2 relative"
          >
            <Icon className={`w-6 h-6 ${isActive ? 'text-white' : 'text-white/50'}`} strokeWidth={isActive ? 2.5 : 2} />
            <span className={`text-[10px] font-medium ${isActive ? 'text-white' : 'text-white/50'}`}>
              {currentLang === 'ba' ? tab.labelBa : tab.label}
            </span>
            {tab.id === 'chat' && unreadMessages > 0 && (
              <span className="absolute -top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                {unreadMessages > 99 ? '99+' : unreadMessages}
              </span>
            )}
          </motion.button>
        );
      })}

      {/* Create Button - TikTok Style */}
      <motion.button whileTap={{ scale: 0.9 }} whileHover={{ scale: 1.05 }} onClick={onCreatePress} className="relative -mt-6">
        <motion.div
          className="absolute inset-0 rounded-2xl bg-gradient-to-r from-pink-500 via-red-500 to-orange-500 blur-xl opacity-60"
          animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.7, 0.4] }}
          transition={{ repeat: Infinity, duration: 2 }}
        />
        <div className="relative w-16 h-12 rounded-xl overflow-hidden shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500" />
          <div className="absolute inset-0 bg-gradient-to-r from-pink-500 via-red-500 to-orange-500" style={{ clipPath: 'polygon(30% 0, 100% 0, 100% 100%, 0 100%)' }} />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-white text-3xl font-light">+</span>
          </div>
        </div>
      </motion.button>

      {bottomTabs.slice(2).map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <motion.button
            key={tab.id}
            whileTap={{ scale: 0.9 }}
            onClick={() => onTabChange(tab.id)}
            className="flex flex-col items-center gap-1 px-5 py-2 relative"
          >
            {tab.id === 'direct' && (
              <motion.span className="absolute -top-1 right-1 w-2 h-2 rounded-full bg-red-500" animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 1 }} />
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
// WELCOME CARD
// ═══════════════════════════════════════════════════════════════════════════════

const WelcomeCard: React.FC<{
  onAssistantOpen: () => void;
  currentLang: string;
}> = ({ onAssistantOpen, currentLang }) => (
  <div className="h-screen w-full snap-start snap-always relative bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 overflow-hidden">
    <div className="absolute inset-0">
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-gradient-to-br from-purple-500/30 to-pink-500/30 blur-3xl"
          style={{ width: `${120 + i * 60}px`, height: `${120 + i * 60}px`, left: `${10 + i * 15}%`, top: `${10 + i * 12}%` }}
          animate={{ x: [0, 30, -30, 0], y: [0, -30, 30, 0], scale: [1, 1.2, 0.9, 1] }}
          transition={{ duration: 8 + i * 2, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </div>

    <div className="relative h-full flex flex-col items-center justify-center px-6">
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.2 }} className="text-center">
        <motion.button onClick={onAssistantOpen} className="relative mb-8" whileTap={{ scale: 0.95 }}>
          <motion.div className="absolute inset-0 rounded-full bg-white/20" animate={{ scale: [1, 2, 2], opacity: [0.5, 0, 0] }} transition={{ duration: 2.5, repeat: Infinity }} />
          <motion.div className="absolute inset-0 rounded-full bg-white/10" animate={{ scale: [1, 2.5, 2.5], opacity: [0.3, 0, 0] }} transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }} />
          
          <div className="relative w-36 h-36 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 shadow-2xl flex items-center justify-center">
            <div className="absolute inset-2 rounded-full bg-black/30 backdrop-blur-sm" />
            <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 2 }} className="relative">
              <MessageCircle className="w-14 h-14 text-white" strokeWidth={1.5} />
              <motion.div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-green-500 flex items-center justify-center shadow-lg" animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}>
                <Mic className="w-4 h-4 text-white" />
              </motion.div>
            </motion.div>
          </div>
        </motion.button>

        <motion.h1 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }} className="text-4xl font-black text-white mb-2">
          🎭 Raconte-Moi
        </motion.h1>
        <motion.p initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }} className="text-white/70 mb-8">
          {currentLang === 'ba' ? 'Olùrànlọ́wọ́ ohùn IA' : 'Assistant vocal IA'}
        </motion.p>

        <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.6 }} className="flex gap-3 justify-center flex-wrap">
          {[
            { emoji: '🎵', label: currentLang === 'ba' ? 'Orin' : 'Musique' },
            { emoji: '📖', label: currentLang === 'ba' ? 'Ìtàn' : 'Contes' },
            { emoji: '🌍', label: currentLang === 'ba' ? 'Àṣà' : 'Culture' },
          ].map((item, i) => (
            <motion.div key={i} whileHover={{ scale: 1.05 }} className="px-5 py-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20">
              <span className="text-2xl">{item.emoji}</span>
              <span className="text-white/80 text-sm font-medium ml-2">{item.label}</span>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>

      <motion.div className="absolute bottom-28 left-1/2 -translate-x-1/2 flex flex-col items-center text-white/50" animate={{ y: [0, 10, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>
        <ChevronDown className="w-6 h-6" />
        <span className="text-xs">{currentLang === 'ba' ? 'Swipe' : 'Glissez'}</span>
      </motion.div>
    </div>

    <div className="absolute right-4 bottom-36 flex flex-col gap-5">
      {[
        { icon: Heart, count: '12.4k' },
        { icon: MessageCircle, count: '892' },
        { icon: Star, count: '2.3k' },
        { icon: Share2, count: '456' },
      ].map((action, i) => (
        <motion.button key={i} initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.7 + i * 0.1 }} whileTap={{ scale: 0.9 }} className="flex flex-col items-center gap-1">
          <div className="w-12 h-12 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center border border-white/10">
            <action.icon className="w-6 h-6 text-white" />
          </div>
          <span className="text-white text-xs font-bold">{action.count}</span>
        </motion.button>
      ))}
    </div>
  </div>
);

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
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/95 backdrop-blur-xl z-50 flex flex-col pt-safe">
        <motion.div initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -30, opacity: 0 }} className="p-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
            <input
              type="text"
              placeholder={currentLang === 'ba' ? 'Wá...' : 'Rechercher...'}
              autoFocus
              className="w-full bg-white/10 border border-white/20 rounded-2xl pl-12 pr-12 py-4 text-white placeholder-white/50 focus:outline-none focus:border-white/40"
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
            {['🎵 Musique Bariba', '📖 Contes traditionnels', '🌾 Agriculture', '🩺 Santé communautaire', '🎭 Fêtes culturelles'].map((item, i) => (
              <motion.button
                key={i}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: i * 0.05 }}
                className="w-full text-left px-4 py-3 rounded-xl hover:bg-white/5 text-white flex items-center gap-3"
              >
                <span className="text-lg">{item.split(' ')[0]}</span>
                <span>{item.split(' ').slice(1).join(' ')}</span>
              </motion.button>
            ))}
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function TamTamHome() {
  const navigate = useNavigate();
  const { t, currentLang } = useTamTamLanguage();
  const { announceAction } = useAudioDescription();
  const { posts } = useTamTamPosts();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<BottomTab>('fil');
  const [feedMode, setFeedMode] = useState<FeedMode>('creation');
  const [showSearch, setShowSearch] = useState(false);
  const [showCreator, setShowCreator] = useState(false);
  const [unreadMessages] = useState(5);

  useEffect(() => {
    announceAction(t('screenHome'));
  }, [announceAction, t]);

  const handleNavigate = useCallback((path: string) => {
    triggerFeedback('click');
    navigate(path);
  }, [navigate]);

  const handleTabChange = useCallback((tab: BottomTab) => {
    triggerFeedback('notification', { haptic: true, sound: false });
    setActiveTab(tab);
    if (tab !== 'fil') {
      navigate('/tamtam/social', { state: { tab: tab === 'chat' ? 'messages' : tab === 'groupes' ? 'communities' : 'live' } });
    }
  }, [navigate]);

  const handleFeedModeChange = useCallback((mode: FeedMode) => {
    triggerFeedback('notification', { haptic: true, sound: false });
    setFeedMode(mode);
  }, []);

  // Transform posts for video feed
  const videoPosts = posts.filter(p => (p as any).media_type === 'video' || (p as any).template_id).map(p => ({
    id: p.id,
    videoUrl: (p as any).media_url || p.audio_url || '',
    thumbnailUrl: (p as any).thumbnail_url,
    transcriptFr: (p as any).transcript_fr || (p as any).transcript,
    topic: (p as any).topic,
    duration: p.duration_seconds || 30,
    author: { name: p.profile?.display_name || 'Utilisateur', username: p.profile?.username || 'user', avatarUrl: p.profile?.avatar_url },
    likes: p.reactions_count || 0,
    comments: p.comments_count || 0,
    shares: 0,
  }));

  // Transform posts for audio feed
  const audioPosts = posts.filter(p => (p as any).media_type === 'audio' || p.audio_url).map(p => ({
    id: p.id,
    audioUrl: p.audio_url || '',
    duration: p.duration_seconds || 60,
    templateId: (p as any).template_id || 'default',
    category: 'patrimoine' as const,
    subcategory: (p as any).topic || 'culture',
    emoji: (p as any).feeling_emoji || '🎵',
    visualEmojis: ['🎵', '🥁', '🎶', '✨', '🌍'],
    gradient: 'from-amber-500 via-orange-500 to-red-500',
    titleFr: (p as any).transcript_fr?.slice(0, 50) || 'Audio',
    titleBa: (p as any).transcript_ba?.slice(0, 50) || '',
    authorName: p.profile?.display_name || 'TAM-TAM',
    authorVillage: (p as any).location_name || 'Bénin',
    likes: p.reactions_count || 0,
    replies: p.comments_count || 0,
    shares: 0,
  }));

  return (
    <div className="min-h-screen bg-black overflow-hidden">
      <SideMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} currentLang={currentLang} onNavigate={handleNavigate} />

      <FloatingHeader
        currentMode={feedMode}
        onModeChange={handleFeedModeChange}
        onMenuOpen={() => setIsMenuOpen(true)}
        onSearch={() => setShowSearch(true)}
        currentLang={currentLang}
      />

      {/* Main Feed - Snap Scroll */}
      <div className="h-screen overflow-y-scroll snap-y snap-mandatory scrollbar-hide">
        {/* Welcome Card */}
        <WelcomeCard onAssistantOpen={() => setIsAssistantOpen(true)} currentLang={currentLang} />

        {/* Feed based on mode */}
        {feedMode === 'creation' ? (
          <div className="snap-start snap-always">
            <TamTamVideoFeed
              videos={videoPosts.length > 0 ? videoPosts : undefined}
              onLike={(id) => triggerFeedback('success')}
              onComment={(id) => {}}
              onShare={(id) => triggerFeedback('send')}
              onSave={(id) => triggerFeedback('success')}
            />
          </div>
        ) : (
          <div className="snap-start snap-always">
            <TamTamAudioFeed
              posts={audioPosts.length > 0 ? audioPosts : undefined}
              mode={feedMode === 'radio' ? 'radio' : 'mavoix'}
              onLike={(id) => triggerFeedback('success')}
              onReply={(id) => setShowCreator(true)}
              onShare={(id) => triggerFeedback('send')}
              onSave={(id) => triggerFeedback('success')}
            />
          </div>
        )}
      </div>

      <BottomNavigation
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onCreatePress={() => setShowCreator(true)}
        currentLang={currentLang}
        unreadMessages={unreadMessages}
      />

      <SearchModal isOpen={showSearch} onClose={() => setShowSearch(false)} currentLang={currentLang} />

      <RaconteMoiAssistant isOpen={isAssistantOpen} onOpenChange={setIsAssistantOpen} />

      <FullscreenCreator
        isOpen={showCreator}
        onClose={() => setShowCreator(false)}
        onComplete={async (data) => {
          triggerFeedback('success');
          setShowCreator(false);
        }}
      />
    </div>
  );
}
