import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';
import { useAudioDescription } from '@/contexts/AudioDescriptionContext';
import { useUnifiedAudio } from '@/hooks/useUnifiedAudio';
import { useVoiceMenu } from '@/hooks/useVoiceMenu';
import { triggerFeedback } from '@/utils/tamtamFeedback';
import { 
  Volume2, Loader2, MessageCircle, Mic, Menu, X, Home, 
  ShoppingBag, User, Search, Video, Radio, Headphones,
  Users, Zap, Bell, Settings, ChevronRight, Sparkles,
  Heart, Play, Music, Globe, TrendingUp, Star, Crown
} from 'lucide-react';
import { RaconteMoiAssistant } from '@/components/tamtam/RaconteMoiAssistant';

// ═══════════════════════════════════════════════════════════════════════════════
// 🏠 TAM-TAM HOME - KUAISHOU/TIKTOK STYLE
// ═══════════════════════════════════════════════════════════════════════════════
// Design: Full-screen immersive + Floating header + Bottom navigation
// ═══════════════════════════════════════════════════════════════════════════════

// Types
type BottomTab = 'fil' | 'chat' | 'create' | 'groupes' | 'direct';
type FeedMode = 'creation' | 'radio' | 'mavoix';

interface MenuItem {
  icon: string;
  label: string;
  labelBa: string;
  path: string;
  color: string;
  gradient: string;
}

// Menu latéral items
const menuItems: MenuItem[] = [
  { 
    icon: '🏠', 
    label: 'Accueil', 
    labelBa: 'Sòó', 
    path: '/tamtam', 
    color: 'text-blue-500',
    gradient: 'from-blue-500 to-cyan-400'
  },
  { 
    icon: '💬', 
    label: 'Social', 
    labelBa: 'Sósìyálù', 
    path: '/tamtam/social', 
    color: 'text-emerald-500',
    gradient: 'from-emerald-500 to-teal-400'
  },
  { 
    icon: '🛒', 
    label: 'Marché', 
    labelBa: 'Ọjà', 
    path: '/tamtam/market', 
    color: 'text-orange-500',
    gradient: 'from-orange-500 to-amber-400'
  },
  { 
    icon: '👤', 
    label: 'Profil', 
    labelBa: 'Profaili', 
    path: '/tamtam/profile', 
    color: 'text-purple-500',
    gradient: 'from-purple-500 to-pink-400'
  },
];

// Feed modes configuration
const feedModes: { id: FeedMode; icon: typeof Video; emoji: string; label: string; labelBa: string }[] = [
  { id: 'creation', icon: Video, emoji: '🎬', label: 'Création', labelBa: 'Ṣíṣẹ̀dá' },
  { id: 'radio', icon: Radio, emoji: '📻', label: 'Radio', labelBa: 'Rédíò' },
  { id: 'mavoix', icon: Mic, emoji: '🎤', label: 'Ma Voix', labelBa: 'Ohùn Mi' },
];

// Bottom navigation config
const bottomTabs: { id: BottomTab; icon: typeof Home; label: string; labelBa: string }[] = [
  { id: 'fil', icon: Home, label: 'Fil', labelBa: 'Ìtàn' },
  { id: 'chat', icon: MessageCircle, label: 'Chat', labelBa: 'Ọ̀rọ̀' },
  { id: 'groupes', icon: Users, label: 'Groupes', labelBa: 'Àwùjọ' },
  { id: 'direct', icon: Zap, label: 'Direct', labelBa: 'Tààrà' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// COMPOSANTS
// ═══════════════════════════════════════════════════════════════════════════════

// Menu Latéral (Hamburger Menu)
const SideMenu: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  currentLang: string;
  onNavigate: (path: string) => void;
}> = ({ isOpen, onClose, currentLang, onNavigate }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />
          
          {/* Menu Panel */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed left-0 top-0 bottom-0 w-[280px] z-50 overflow-hidden"
            style={{
              background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f0f23 100%)',
            }}
          >
            {/* Header */}
            <div className="p-6 border-b border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <motion.div 
                    className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 flex items-center justify-center shadow-lg"
                    animate={{ rotate: [0, 5, -5, 0] }}
                    transition={{ repeat: Infinity, duration: 4 }}
                  >
                    <span className="text-2xl">🥁</span>
                  </motion.div>
                  <div>
                    <h2 className="text-xl font-black text-white">TAM-TAM</h2>
                    <p className="text-xs text-white/50">
                      {currentLang === 'ba' ? 'Ohùn Àwùjọ' : 'Social Audio'}
                    </p>
                  </div>
                </div>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={onClose}
                  className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
                >
                  <X className="w-5 h-5 text-white" />
                </motion.button>
              </div>
            </div>

            {/* Menu Items */}
            <div className="p-4 space-y-2">
              {menuItems.map((item, index) => (
                <motion.button
                  key={item.path}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    onNavigate(item.path);
                    onClose();
                  }}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-all group"
                >
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.gradient} flex items-center justify-center shadow-lg`}>
                    <span className="text-2xl">{item.icon}</span>
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-white font-semibold">
                      {currentLang === 'ba' ? item.labelBa : item.label}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-white/30 group-hover:text-white/60 transition-colors" />
                </motion.button>
              ))}
            </div>

            {/* Bottom section */}
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10">
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => onNavigate('/tamtam/settings')}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10"
              >
                <Settings className="w-5 h-5 text-white/60" />
                <span className="text-white/60 text-sm">
                  {currentLang === 'ba' ? 'Ètò' : 'Paramètres'}
                </span>
              </motion.button>
              
              {/* Language indicator */}
              <div className="flex items-center justify-center gap-2 mt-4">
                <Globe className="w-4 h-4 text-white/40" />
                <span className="text-white/40 text-xs">
                  {currentLang === 'ba' ? 'Bàátɔ̀nú' : 'Français'}
                </span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// Floating Header (Style TikTok)
const FloatingHeader: React.FC<{
  currentMode: FeedMode;
  onModeChange: (mode: FeedMode) => void;
  onMenuOpen: () => void;
  onSearch: () => void;
  currentLang: string;
}> = ({ currentMode, onModeChange, onMenuOpen, onSearch, currentLang }) => {
  return (
    <motion.header
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed top-0 left-0 right-0 z-40 safe-area-top"
    >
      {/* Gradient overlay for readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/30 to-transparent pointer-events-none" />
      
      <div className="relative px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Menu hamburger */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onMenuOpen}
            className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20"
          >
            <Menu className="w-5 h-5 text-white" />
          </motion.button>

          {/* Feed Mode Tabs (Style TikTok) */}
          <div className="flex items-center gap-1">
            {feedModes.map((mode) => {
              const isActive = currentMode === mode.id;
              return (
                <motion.button
                  key={mode.id}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onModeChange(mode.id)}
                  className="relative px-4 py-2"
                >
                  <span className={`text-sm font-semibold transition-all ${
                    isActive ? 'text-white' : 'text-white/50'
                  }`}>
                    {mode.emoji} {currentLang === 'ba' ? mode.labelBa : mode.label}
                  </span>
                  
                  {isActive && (
                    <motion.div
                      layoutId="activeHeaderTab"
                      className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full bg-white"
                      transition={{ type: 'spring', bounce: 0.3 }}
                    />
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* Search button */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onSearch}
            className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20"
          >
            <Search className="w-5 h-5 text-white" />
          </motion.button>
        </div>
      </div>
    </motion.header>
  );
};

// Bottom Navigation (Style Kuaishou/TikTok)
const BottomNavigation: React.FC<{
  activeTab: BottomTab;
  onTabChange: (tab: BottomTab) => void;
  onCreatePress: () => void;
  currentLang: string;
  unreadMessages?: number;
}> = ({ activeTab, onTabChange, onCreatePress, currentLang, unreadMessages = 0 }) => {
  return (
    <motion.nav
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      className="fixed bottom-0 left-0 right-0 z-40 safe-area-bottom"
      style={{
        background: 'rgba(0, 0, 0, 0.95)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
      }}
    >
      <div className="flex items-center justify-around py-2 px-2">
        {/* Left tabs */}
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
              <Icon 
                className={`w-6 h-6 transition-colors ${isActive ? 'text-white' : 'text-white/50'}`}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span className={`text-[10px] font-medium ${isActive ? 'text-white' : 'text-white/50'}`}>
                {currentLang === 'ba' ? tab.labelBa : tab.label}
              </span>
              
              {/* Badge for messages */}
              {tab.id === 'chat' && unreadMessages > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center"
                >
                  {unreadMessages > 99 ? '99+' : unreadMessages}
                </motion.span>
              )}
            </motion.button>
          );
        })}

        {/* Central Create Button */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          whileHover={{ scale: 1.05 }}
          onClick={onCreatePress}
          className="relative -mt-6"
        >
          {/* Glow effect */}
          <motion.div
            className="absolute inset-0 rounded-2xl bg-gradient-to-r from-pink-500 via-red-500 to-orange-500 blur-lg opacity-60"
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.4, 0.7, 0.4]
            }}
            transition={{ repeat: Infinity, duration: 2 }}
          />
          
          {/* Button */}
          <div className="relative w-14 h-10 rounded-xl bg-gradient-to-r from-pink-500 via-red-500 to-orange-500 flex items-center justify-center shadow-2xl">
            <div className="absolute inset-[2px] rounded-[10px] bg-black flex items-center justify-center">
              <motion.div
                animate={{ rotate: 90 }}
                transition={{ duration: 0.3 }}
                className="w-8 h-8 rounded-lg bg-gradient-to-r from-pink-500 via-red-500 to-orange-500 flex items-center justify-center"
              >
                <span className="text-white text-2xl font-light">+</span>
              </motion.div>
            </div>
          </div>
        </motion.button>

        {/* Right tabs */}
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
                  className="absolute -top-1 right-2 w-2 h-2 rounded-full bg-red-500"
                  animate={{ opacity: [1, 0.4, 1], scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                />
              )}
              <Icon 
                className={`w-6 h-6 transition-colors ${isActive ? 'text-white' : 'text-white/50'}`}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span className={`text-[10px] font-medium ${isActive ? 'text-white' : 'text-white/50'}`}>
                {currentLang === 'ba' ? tab.labelBa : tab.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </motion.nav>
  );
};

// Demo Video Card (Style Kuaishou)
const DemoVideoCard: React.FC<{
  onAssistantOpen: () => void;
  currentLang: string;
}> = ({ onAssistantOpen, currentLang }) => {
  return (
    <div className="relative h-screen w-full bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0">
        {/* Floating orbs */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-gradient-to-br from-purple-500/30 to-pink-500/30 blur-3xl"
            style={{
              width: `${150 + i * 50}px`,
              height: `${150 + i * 50}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              x: [0, 30, -30, 0],
              y: [0, -30, 30, 0],
              scale: [1, 1.2, 0.8, 1],
            }}
            transition={{
              duration: 10 + i * 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative h-full flex flex-col items-center justify-center px-8">
        {/* Main CTA - Raconte-Moi */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', delay: 0.3 }}
          className="text-center"
        >
          {/* Giant button */}
          <motion.button
            onClick={onAssistantOpen}
            className="relative mb-6"
            whileTap={{ scale: 0.95 }}
          >
            {/* Pulse rings */}
            <motion.div
              className="absolute inset-0 rounded-full bg-white/20"
              animate={{ scale: [1, 2, 2], opacity: [0.5, 0, 0] }}
              transition={{ duration: 2.5, repeat: Infinity }}
            />
            <motion.div
              className="absolute inset-0 rounded-full bg-white/10"
              animate={{ scale: [1, 2.5, 2.5], opacity: [0.3, 0, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
            />
            
            {/* Button */}
            <div className="relative w-40 h-40 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 shadow-2xl flex items-center justify-center">
              <div className="absolute inset-2 rounded-full bg-black/30 backdrop-blur-sm" />
              <div className="relative flex flex-col items-center">
                <motion.div
                  animate={{ y: [0, -5, 0] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                >
                  <MessageCircle className="w-16 h-16 text-white" strokeWidth={1.5} />
                </motion.div>
                <motion.div
                  className="absolute -top-2 -right-2 w-10 h-10 rounded-full bg-green-500 flex items-center justify-center shadow-lg"
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                >
                  <Mic className="w-5 h-5 text-white" />
                </motion.div>
              </div>
            </div>
          </motion.button>

          {/* Title */}
          <motion.h1
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-3xl font-black text-white mb-2"
          >
            🎭 Raconte-Moi
          </motion.h1>
          
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-white/70 text-sm mb-8"
          >
            {currentLang === 'ba' ? 'Olùrànlọ́wọ́ ohùn àkànṣe' : 'Assistant vocal IA personnalisé'}
          </motion.p>

          {/* Feature cards */}
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="flex gap-4 justify-center"
          >
            {[
              { emoji: '🎵', label: currentLang === 'ba' ? 'Orin' : 'Musique' },
              { emoji: '📖', label: currentLang === 'ba' ? 'Ìtàn' : 'Contes' },
              { emoji: '🌍', label: currentLang === 'ba' ? 'Àṣà' : 'Culture' },
            ].map((item, i) => (
              <motion.div
                key={i}
                whileHover={{ scale: 1.05 }}
                className="px-4 py-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20"
              >
                <span className="text-2xl block mb-1">{item.emoji}</span>
                <span className="text-white/80 text-xs font-medium">{item.label}</span>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>

      {/* Action buttons (Style Kuaishou) - Right side */}
      <div className="absolute right-4 bottom-32 flex flex-col gap-5">
        {[
          { icon: Heart, count: '12.4k', label: 'Likes' },
          { icon: MessageCircle, count: '892', label: 'Comments' },
          { icon: Star, count: '2.3k', label: 'Favoris' },
          { icon: Play, count: '45k', label: 'Vues' },
        ].map((action, i) => (
          <motion.button
            key={i}
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.8 + i * 0.1 }}
            whileTap={{ scale: 0.9 }}
            className="flex flex-col items-center gap-1"
          >
            <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
              <action.icon className="w-6 h-6 text-white" />
            </div>
            <span className="text-white text-xs font-bold">{action.count}</span>
          </motion.button>
        ))}
      </div>

      {/* User info (bottom left - Style TikTok) */}
      <motion.div
        initial={{ x: -50, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 1 }}
        className="absolute left-4 bottom-32 max-w-[70%]"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center border-2 border-white">
            <span className="text-xl">🥁</span>
          </div>
          <div>
            <p className="text-white font-bold">@tamtam_official</p>
            <motion.button
              whileTap={{ scale: 0.95 }}
              className="px-3 py-1 rounded-full bg-red-500 text-white text-xs font-bold mt-1"
            >
              + {currentLang === 'ba' ? 'Tẹ̀lé' : 'Suivre'}
            </motion.button>
          </div>
        </div>
        
        <p className="text-white text-sm leading-relaxed">
          {currentLang === 'ba' 
            ? '🎭 Ìtàn Àwọn Bàbá Wa - Patrimoine Bariba #Culture #Benin'
            : '🎭 Bienvenue sur TAM-TAM - La voix de nos ancêtres #Culture #Bénin'
          }
        </p>
        
        {/* Music tag */}
        <motion.div
          className="flex items-center gap-2 mt-3"
          animate={{ x: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 10 }}
        >
          <Music className="w-4 h-4 text-white" />
          <span className="text-white/80 text-xs">
            🎵 Son original - TAM-TAM Radio
          </span>
        </motion.div>
      </motion.div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export default function TamTamHome() {
  const navigate = useNavigate();
  const { t, currentLang } = useTamTamLanguage();
  const { announceAction } = useAudioDescription();
  const { speakCurrentLang, stop } = useUnifiedAudio();

  // États
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<BottomTab>('fil');
  const [feedMode, setFeedMode] = useState<FeedMode>('creation');
  const [showSearch, setShowSearch] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(5);

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
    
    // Navigation vers les pages appropriées
    switch (tab) {
      case 'fil':
        // Rester sur home avec le feed
        break;
      case 'chat':
        navigate('/tamtam/social', { state: { tab: 'messages' } });
        break;
      case 'groupes':
        navigate('/tamtam/social', { state: { tab: 'communities' } });
        break;
      case 'direct':
        navigate('/tamtam/social', { state: { tab: 'live' } });
        break;
    }
  }, [navigate]);

  const handleFeedModeChange = useCallback((mode: FeedMode) => {
    triggerFeedback('notification', { haptic: true, sound: false });
    setFeedMode(mode);
  }, []);

  const handleCreatePress = useCallback(() => {
    triggerFeedback('click');
    navigate('/tamtam/social', { state: { openCreator: true } });
  }, [navigate]);

  const handleAssistantOpen = useCallback(() => {
    triggerFeedback('click');
    setIsAssistantOpen(true);
  }, []);

  return (
    <div className="min-h-screen bg-black overflow-hidden">
      {/* Side Menu */}
      <SideMenu
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        currentLang={currentLang}
        onNavigate={handleNavigate}
      />

      {/* Floating Header */}
      <FloatingHeader
        currentMode={feedMode}
        onModeChange={handleFeedModeChange}
        onMenuOpen={() => setIsMenuOpen(true)}
        onSearch={() => setShowSearch(true)}
        currentLang={currentLang}
      />

      {/* Main Content - Full Screen Video/Content */}
      <div className="h-screen overflow-y-scroll snap-y snap-mandatory">
        <div className="snap-start snap-always">
          <DemoVideoCard
            onAssistantOpen={handleAssistantOpen}
            currentLang={currentLang}
          />
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onCreatePress={handleCreatePress}
        currentLang={currentLang}
        unreadMessages={unreadMessages}
      />

      {/* Raconte-Moi Assistant */}
      <RaconteMoiAssistant
        isOpen={isAssistantOpen}
        onOpenChange={setIsAssistantOpen}
      />

      {/* Search Modal */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-xl z-50 flex items-start justify-center pt-20"
          >
            <motion.div
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -50, opacity: 0 }}
              className="w-full max-w-md px-4"
            >
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
                <input
                  type="text"
                  placeholder={currentLang === 'ba' ? 'Wá...' : 'Rechercher...'}
                  autoFocus
                  className="w-full bg-white/10 border border-white/20 rounded-2xl pl-12 pr-4 py-4 text-white placeholder-white/50 focus:outline-none focus:border-white/40"
                />
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowSearch(false)}
                  className="absolute right-4 top-1/2 -translate-y-1/2"
                >
                  <X className="w-5 h-5 text-white/50" />
                </motion.button>
              </div>
              
              {/* Quick suggestions */}
              <div className="mt-6 space-y-3">
                <p className="text-white/50 text-sm px-2">
                  {currentLang === 'ba' ? 'Àwọn ìmọ̀ràn' : 'Suggestions'}
                </p>
                {['🎵 Musique traditionnelle', '📖 Contes Bariba', '🌾 Agriculture', '🩺 Santé'].map((item, i) => (
                  <motion.button
                    key={i}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: i * 0.1 }}
                    className="w-full text-left px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white"
                  >
                    {item}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
