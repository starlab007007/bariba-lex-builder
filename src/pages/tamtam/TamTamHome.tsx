import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Home, Users, ShoppingBag, User, PlusCircle, Search, Mic,
  Menu, X, ChevronRight, Settings, Globe, Bell, Zap,
  MessageCircle, TrendingUp, Play, Heart, Star, Share2, Music
} from 'lucide-react';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';
import { useAudioDescription } from '@/contexts/AudioDescriptionContext';
import { useTamTamPosts } from '@/hooks/useTamTamPosts';
import { useFeedAlgorithm } from '@/hooks/useFeedAlgorithm';
import { triggerFeedback } from '@/utils/tamtamFeedback';
import { RaconteMoiAssistant } from '@/components/tamtam/RaconteMoiAssistant';
import FullscreenCreator from '@/components/tamtam/FullscreenCreator';
import { useToast } from '@/hooks/use-toast';

// ═══════════════════════════════════════════════════════════════════════════════
// 🏠 TAM-TAM HOME - KUAISHOU DNA DESIGN
// ═══════════════════════════════════════════════════════════════════════════════
// Charte:
// - Fond: #0B0B0B (Noir profond)
// - Accent: #FF7A00 (Orange vif)
// - Texte: #F2F2F2 (Blanc cassé) et #999999 (Gris)
// - Structure: Fullscreen, zéro bordure
// ═══════════════════════════════════════════════════════════════════════════════

type TabId = 'home' | 'social' | 'market' | 'profile';
type FeedMode = 'alune' | 'local' | 'live';

// Configuration des onglets principaux
const mainTabs: { id: TabId; icon: typeof Home; label: string; labelBa: string; emoji: string }[] = [
  { id: 'home', icon: Home, label: 'Home', labelBa: 'Ilé', emoji: '🏠' },
  { id: 'social', icon: Users, label: 'Social', labelBa: 'Àwùjọ', emoji: '👥' },
  { id: 'market', icon: ShoppingBag, label: 'Market', labelBa: 'Ọjà', emoji: '🛒' },
  { id: 'profile', icon: User, label: 'Moi', labelBa: 'Èmi', emoji: '👤' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// TOP NAV MINIMALISTE (Style Kuaishou)
// ═══════════════════════════════════════════════════════════════════════════════

const TopNavBar: React.FC<{
  currentMode: FeedMode;
  onModeChange: (mode: FeedMode) => void;
  onSearch: () => void;
  onMenuOpen: () => void;
  currentLang: string;
}> = ({ currentMode, onModeChange, onSearch, onMenuOpen, currentLang }) => {
  const modes: { id: FeedMode; label: string; icon?: string }[] = [
    { id: 'live', label: '🔴 LIVE', icon: '🔴' },
    { id: 'alune', label: 'À la une' },
    { id: 'local', label: '📍 Local' },
  ];

  return (
    <div className="fixed top-0 left-0 right-0 z-40 safe-area-top">
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-none" />
      
      <div className="relative px-4 py-3 flex items-center justify-between">
        {/* Menu hamburger */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onMenuOpen}
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(255, 255, 255, 0.1)' }}
        >
          <Menu className="w-5 h-5 text-white" />
        </motion.button>

        {/* Mode tabs */}
        <div className="flex items-center gap-1">
          {modes.map((mode) => {
            const isActive = currentMode === mode.id;
            return (
              <motion.button
                key={mode.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => onModeChange(mode.id)}
                className="relative px-3 py-2"
              >
                <span className={`text-sm font-semibold transition-all ${
                  isActive ? 'text-white' : 'text-[#999999]'
                }`}>
                  {mode.label}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="topNavIndicator"
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-[3px] rounded-full bg-[#FF7A00]"
                  />
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Search avec micro */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onSearch}
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(255, 255, 255, 0.1)' }}
        >
          <div className="relative">
            <Search className="w-5 h-5 text-white" />
            <Mic className="w-2.5 h-2.5 text-[#FF7A00] absolute -bottom-0.5 -right-0.5" />
          </div>
        </motion.button>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// BOTTOM NAVIGATION (Style Kuaishou - Fond noir opaque)
// ═══════════════════════════════════════════════════════════════════════════════

const BottomNavBar: React.FC<{
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  onCreatePress: () => void;
  currentLang: string;
}> = ({ activeTab, onTabChange, onCreatePress, currentLang }) => {
  const navigate = useNavigate();

  const handleTabPress = (tabId: TabId) => {
    triggerFeedback('notification', { haptic: true, sound: false });
    
    switch (tabId) {
      case 'home':
        onTabChange(tabId);
        break;
      case 'social':
        navigate('/tamtam/social');
        break;
      case 'market':
        navigate('/tamtam/market');
        break;
      case 'profile':
        navigate('/tamtam/profile');
        break;
    }
  };

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-40 border-t"
      style={{
        backgroundColor: '#0B0B0B',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="flex items-end justify-around px-2 pt-2 pb-1">
        {mainTabs.slice(0, 2).map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <motion.button
              key={tab.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleTabPress(tab.id)}
              className="flex flex-col items-center gap-1 py-2 px-4 min-w-[60px]"
            >
              <Icon 
                className={`w-6 h-6 transition-colors ${isActive ? 'text-[#FF7A00]' : 'text-[#999999]'}`}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span className={`text-[10px] font-medium ${isActive ? 'text-[#FF7A00]' : 'text-[#999999]'}`}>
                {currentLang === 'ba' ? tab.labelBa : tab.label}
              </span>
            </motion.button>
          );
        })}

        {/* Bouton CREATE - ORANGE qui dépasse */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onCreatePress}
          className="relative -mt-6"
        >
          <div className="relative">
            {/* Glow */}
            <div className="absolute inset-0 bg-[#FF7A00] blur-xl opacity-50 rounded-full" />
            
            {/* Button */}
            <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-[#FF7A00] to-[#FF5500] flex items-center justify-center shadow-2xl">
              <PlusCircle className="w-7 h-7 text-white" strokeWidth={2.5} />
            </div>
          </div>
          <span className="block text-[10px] font-bold text-white mt-1 text-center">CREATE</span>
        </motion.button>

        {mainTabs.slice(2).map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <motion.button
              key={tab.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleTabPress(tab.id)}
              className="flex flex-col items-center gap-1 py-2 px-4 min-w-[60px]"
            >
              <Icon 
                className={`w-6 h-6 transition-colors ${isActive ? 'text-[#FF7A00]' : 'text-[#999999]'}`}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span className={`text-[10px] font-medium ${isActive ? 'text-[#FF7A00]' : 'text-[#999999]'}`}>
                {currentLang === 'ba' ? tab.labelBa : tab.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// SIDE MENU (Hamburger)
// ═══════════════════════════════════════════════════════════════════════════════

const SideMenu: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  currentLang: string;
  onNavigate: (path: string) => void;
}> = ({ isOpen, onClose, currentLang, onNavigate }) => {
  const menuItems = [
    { icon: '🏠', label: 'Accueil', labelBa: 'Ilé', path: '/tamtam', gradient: 'from-blue-500 to-cyan-400' },
    { icon: '💬', label: 'Social', labelBa: 'Àwùjọ', path: '/tamtam/social', gradient: 'from-emerald-500 to-teal-400' },
    { icon: '🛒', label: 'Marché', labelBa: 'Ọjà', path: '/tamtam/market', gradient: 'from-orange-500 to-amber-400' },
    { icon: '👤', label: 'Profil', labelBa: 'Profaili', path: '/tamtam/profile', gradient: 'from-purple-500 to-pink-400' },
  ];

  return (
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
            className="fixed left-0 top-0 bottom-0 w-[280px] z-50 overflow-y-auto"
            style={{ background: '#0B0B0B' }}
          >
            {/* Header */}
            <div className="p-5 border-b border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FF7A00] to-[#FF5500] flex items-center justify-center shadow-lg">
                    <span className="text-2xl">🥁</span>
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-white">TAM-TAM</h2>
                    <p className="text-[10px] text-[#999999]">Social Audio</p>
                  </div>
                </div>
                <motion.button whileTap={{ scale: 0.9 }} onClick={onClose} className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
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
                  transition={{ delay: index * 0.05 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => { onNavigate(item.path); onClose(); }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5"
                >
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${item.gradient} flex items-center justify-center`}>
                    <span className="text-xl">{item.icon}</span>
                  </div>
                  <span className="text-white font-medium flex-1 text-left">
                    {currentLang === 'ba' ? item.labelBa : item.label}
                  </span>
                  <ChevronRight className="w-4 h-4 text-[#999999]" />
                </motion.button>
              ))}
            </div>

            {/* Footer */}
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10">
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => onNavigate('/tamtam/settings')}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/5"
              >
                <Settings className="w-5 h-5 text-[#999999]" />
                <span className="text-[#999999] text-sm">{currentLang === 'ba' ? 'Ètò' : 'Paramètres'}</span>
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// FEED CARD (Style Kuaishou avec infos en bas)
// ═══════════════════════════════════════════════════════════════════════════════

const FeedCard: React.FC<{
  post: any;
  currentLang: string;
  onLike: () => void;
  onComment: () => void;
  onShare: () => void;
}> = ({ post, currentLang, onLike, onComment, onShare }) => {
  const [isLiked, setIsLiked] = useState(false);

  return (
    <div className="h-screen w-full snap-start snap-always relative" style={{ background: '#0B0B0B' }}>
      {/* Background gradient */}
      <div 
        className="absolute inset-0"
        style={{
          background: `linear-gradient(135deg, 
            hsl(${(post.id?.charCodeAt(0) || 0) * 10 % 360}, 50%, 15%) 0%, 
            #0B0B0B 100%)`
        }}
      />

      {/* Contenu central */}
      <div className="absolute inset-0 flex items-center justify-center px-8">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <span className="text-7xl mb-4 block">{post.feeling_emoji || '🎵'}</span>
          <p className="text-[#F2F2F2] text-lg font-medium leading-relaxed line-clamp-4">
            {post.transcript_fr || post.transcript || 'Contenu TAM-TAM'}
          </p>
        </motion.div>
      </div>

      {/* Zone d'information basse - Style Kuaishou */}
      <div 
        className="absolute bottom-20 left-0 right-0 px-4 py-4"
        style={{ background: 'linear-gradient(to top, rgba(11,11,11,0.95) 0%, transparent 100%)' }}
      >
        {/* Auteur + Suivre */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF7A00] to-[#FF5500] flex items-center justify-center overflow-hidden">
            {post.profile?.avatar_url ? (
              <img src={post.profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-lg">👤</span>
            )}
          </div>
          <span className="text-white font-bold">@{post.profile?.username || 'tamtam_user'}</span>
          <motion.button
            whileTap={{ scale: 0.95 }}
            className="px-4 py-1.5 rounded-full bg-[#FF7A00] text-white text-xs font-bold"
          >
            🟠 SUIVRE +
          </motion.button>
        </div>

        {/* Titre vocal */}
        <div className="flex items-center gap-2 mb-2">
          <Mic className="w-4 h-4 text-[#FF7A00]" />
          <div className="flex gap-0.5">
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                className="w-1 bg-[#FF7A00] rounded-full"
                animate={{ height: [4, 12, 4] }}
                transition={{ repeat: Infinity, duration: 0.5, delay: i * 0.1 }}
              />
            ))}
          </div>
          <span className="text-[#F2F2F2] text-sm line-clamp-1 flex-1">
            "{post.transcript_fr?.slice(0, 50) || 'Écoutez ce message vocal...'}"
          </span>
        </div>

        {/* Tags */}
        <p className="text-[#999999] text-sm mb-3">
          #TamTam #Bénin #Culture
        </p>

        {/* Actions horizontales */}
        <div className="flex items-center gap-6">
          <motion.button 
            whileTap={{ scale: 0.9 }}
            onClick={() => { setIsLiked(!isLiked); onLike(); }}
            className="flex items-center gap-1.5"
          >
            <Heart className={`w-5 h-5 ${isLiked ? 'text-red-500 fill-red-500' : 'text-white'}`} />
            <span className="text-white text-sm font-medium">{post.reactions_count || 0}</span>
          </motion.button>
          
          <motion.button whileTap={{ scale: 0.9 }} onClick={onComment} className="flex items-center gap-1.5">
            <MessageCircle className="w-5 h-5 text-white" />
            <span className="text-white text-sm font-medium">{post.comments_count || 0}</span>
          </motion.button>
          
          <motion.button whileTap={{ scale: 0.9 }} onClick={onShare} className="flex items-center gap-1.5">
            <Share2 className="w-5 h-5 text-white" />
            <span className="text-white text-sm font-medium">0</span>
          </motion.button>
          
          <motion.button whileTap={{ scale: 0.9 }} className="flex items-center gap-1.5 ml-auto">
            <Star className="w-5 h-5 text-white" />
            <span className="text-white text-sm font-medium">Enregistrer</span>
          </motion.button>
        </div>
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
        className="fixed inset-0 z-50"
        style={{ background: '#0B0B0B' }}
      >
        <div className="p-4 pt-safe">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#999999]" />
            <input
              type="text"
              placeholder={currentLang === 'ba' ? 'Wá...' : 'Rechercher...'}
              autoFocus
              className="w-full bg-white/10 border border-white/20 rounded-xl pl-12 pr-12 py-3.5 text-white placeholder-[#999999] focus:outline-none focus:border-[#FF7A00]"
            />
            <motion.button whileTap={{ scale: 0.9 }} onClick={onClose} className="absolute right-4 top-1/2 -translate-y-1/2">
              <X className="w-5 h-5 text-[#999999]" />
            </motion.button>
          </div>
          
          <div className="mt-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-[#FF7A00]" />
              <span className="text-white text-sm font-medium">Tendances</span>
            </div>
            {['🎵 Musique', '📖 Contes', '🌾 Agriculture', '🩺 Santé', '🎭 Culture'].map((item, i) => (
              <motion.button
                key={i}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: i * 0.05 }}
                className="w-full text-left px-4 py-3 rounded-lg hover:bg-white/5 text-white flex items-center gap-3"
              >
                <span className="text-xl">{item.split(' ')[0]}</span>
                <span className="text-sm">{item.split(' ').slice(1).join(' ')}</span>
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

export default function TamTamHome() {
  const navigate = useNavigate();
  const { t, currentLang } = useTamTamLanguage();
  const { announceAction } = useAudioDescription();
  const { toast } = useToast();
  const { posts, isLoading, createPost, addReaction, fetchPosts } = useTamTamPosts();
  const { rankPosts } = useFeedAlgorithm({ prioritizeUtility: true, prioritizeCulture: true });

  // États
  const [activeTab, setActiveTab] = useState<TabId>('home');
  const [feedMode, setFeedMode] = useState<FeedMode>('alune');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showCreator, setShowCreator] = useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);

  useEffect(() => {
    announceAction(t('screenHome'));
  }, [announceAction, t]);

  const handleNavigate = useCallback((path: string) => {
    triggerFeedback('click');
    navigate(path);
  }, [navigate]);

  // Posts classés
  const rankedPosts = posts.map(post => ({
    ...post,
    media_type: (post as any).media_type || 'audio',
    transcript_fr: (post as any).transcript_fr || (post as any).transcript || null,
    feeling_emoji: (post as any).feeling_emoji || null,
  }));

  return (
    <div className="fixed inset-0" style={{ background: '#0B0B0B' }}>
      {/* Side Menu */}
      <SideMenu
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        currentLang={currentLang}
        onNavigate={handleNavigate}
      />

      {/* Top Nav */}
      <TopNavBar
        currentMode={feedMode}
        onModeChange={setFeedMode}
        onSearch={() => setShowSearch(true)}
        onMenuOpen={() => setIsMenuOpen(true)}
        currentLang={currentLang}
      />

      {/* Feed Content */}
      <div className="absolute inset-0 pb-20 overflow-y-scroll snap-y snap-mandatory scrollbar-hide">
        {isLoading ? (
          <div className="h-screen flex items-center justify-center">
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} className="w-10 h-10 border-3 border-[#FF7A00] border-t-transparent rounded-full" />
          </div>
        ) : rankedPosts.length > 0 ? (
          rankedPosts.map((post) => (
            <FeedCard
              key={post.id}
              post={post}
              currentLang={currentLang}
              onLike={() => addReaction(post.id, 'like')}
              onComment={() => {}}
              onShare={() => triggerFeedback('send')}
            />
          ))
        ) : (
          <div className="h-screen flex flex-col items-center justify-center px-8">
            <span className="text-7xl mb-4">🥁</span>
            <p className="text-[#999999] text-center mb-6">Aucun contenu pour le moment</p>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowCreator(true)}
              className="px-6 py-3 rounded-full bg-[#FF7A00] text-white font-bold"
            >
              Créer le premier
            </motion.button>
          </div>
        )}
      </div>

      {/* Bottom Nav */}
      <BottomNavBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onCreatePress={() => setShowCreator(true)}
        currentLang={currentLang}
      />

      {/* Modals */}
      <SearchModal isOpen={showSearch} onClose={() => setShowSearch(false)} currentLang={currentLang} />
      
      <RaconteMoiAssistant isOpen={isAssistantOpen} onOpenChange={setIsAssistantOpen} />

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
          toast({ title: "✅ Publié !" });
          triggerFeedback('success');
          fetchPosts();
          setShowCreator(false);
        }}
      />
    </div>
  );
}
