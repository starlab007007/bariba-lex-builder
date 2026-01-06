import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Users, ShoppingBag, User, Plus, Menu, ChevronRight, X, TrendingUp, Sparkles } from 'lucide-react';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';
import { useAudioDescription } from '@/contexts/AudioDescriptionContext';
import { useTamTamPosts } from '@/hooks/useTamTamPosts';
import { triggerFeedback } from '@/utils/tamtamFeedback';
import FullscreenCreator from '@/components/tamtam/FullscreenCreator';
import { TamTamCreatePost } from '@/components/tamtam/TamTamCreatePost';
import { useToast } from '@/hooks/use-toast';
import { useSideMenu } from './TamTamApp';

// ═══════════════════════════════════════════════════════════════════════════════
// 🏠 TAM-TAM HOME V7 - SANS HEADER + FIX AUDIO
// ═══════════════════════════════════════════════════════════════════════════════

type TabId = 'home' | 'social' | 'market' | 'profile';

const DEFAULT_AUDIO_URL = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';

// ═══════════════════════════════════════════════════════════════════════════════
// MENU CREATE
// ═══════════════════════════════════════════════════════════════════════════════

const CreateMenu: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSelectPatrimoine: () => void;
  onSelectMaVoix: () => void;
  onSelectCreateur: () => void;
  currentLang: string;
}> = ({ isOpen, onClose, onSelectPatrimoine, onSelectMaVoix, onSelectCreateur, currentLang }) => {
  const options = [
    { id: 'patrimoine', emoji: '🏛️', label: 'Patrimoine', labelBa: 'Kpààrà', desc: 'Culture & Traditions', gradient: 'from-[#FF8C42] to-[#FF5722]', icons: '📖🎵💬🌿', action: onSelectPatrimoine },
    { id: 'mavoix', emoji: '📢', label: 'Voix du Village', labelBa: 'Kùú dɔ̀ɔ̀rɔ̀', desc: 'Annonces & Messages', gradient: 'from-[#26D9B0] to-[#00BCD4]', icons: '📢🙏🎉❓', action: onSelectMaVoix },
    { id: 'creation', emoji: '🎬', label: 'Créateur', labelBa: 'Olùṣẹ̀dá', desc: 'Vidéo, Photo, Texte', gradient: 'from-[#7C4DFF] to-[#536DFE]', icons: '🎥📸✍️🔴', action: onSelectCreateur },
  ];

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
// BOTTOM TAB BAR
// ═══════════════════════════════════════════════════════════════════════════════

const BottomTabBar: React.FC<{
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  onCreatePress: () => void;
  currentLang: string;
}> = ({ activeTab, onTabChange, onCreatePress, currentLang }) => {
  const navigate = useNavigate();

  const tabs: { id: TabId; icon: typeof Home; label: string; labelBa: string }[] = [
    { id: 'home', icon: Home, label: 'Accueil', labelBa: 'Ilé' },
    { id: 'social', icon: Users, label: 'Social', labelBa: 'Àwùjọ' },
    { id: 'market', icon: ShoppingBag, label: 'Marché', labelBa: 'Ọjà' },
    { id: 'profile', icon: User, label: 'Profil', labelBa: 'Èmi' },
  ];

  const handleTabPress = (tabId: TabId) => {
    triggerFeedback('click');
    if (tabId === 'home') onTabChange(tabId);
    else if (tabId === 'social') navigate('/tamtam/social');
    else if (tabId === 'market') navigate('/tamtam/market');
    else if (tabId === 'profile') navigate('/tamtam/profile');
  };

  return (
    <motion.nav
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      className="fixed bottom-0 left-0 right-0 z-40"
      style={{
        background: 'linear-gradient(180deg, rgba(11, 11, 11, 0.95) 0%, rgba(11, 11, 11, 0.99) 100%)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="flex items-end justify-around px-2 pt-2 pb-1">
        {tabs.slice(0, 2).map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <motion.button key={tab.id} whileTap={{ scale: 0.9 }} onClick={() => handleTabPress(tab.id)} className="flex flex-col items-center gap-0.5 py-2 px-4 min-w-[60px]">
              <Icon className={`w-6 h-6 ${isActive ? 'text-[#FF7A00]' : 'text-white/50'}`} strokeWidth={isActive ? 2.5 : 2} />
              <span className={`text-[10px] font-medium ${isActive ? 'text-[#FF7A00]' : 'text-white/50'}`}>{currentLang === 'ba' ? tab.labelBa : tab.label}</span>
            </motion.button>
          );
        })}

        {/* CREATE */}
        <motion.button whileTap={{ scale: 0.9 }} onClick={onCreatePress} className="relative -mt-4">
          <div className="relative">
            <motion.div className="absolute inset-0 rounded-xl blur-lg" style={{ background: 'linear-gradient(45deg, #FF7A00, #FF5500)' }} animate={{ opacity: [0.5, 0.8, 0.5] }} transition={{ repeat: Infinity, duration: 2 }} />
            <div className="relative w-14 h-10 rounded-xl overflow-hidden shadow-xl">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-cyan-500" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#FF7A00] to-red-500" style={{ clipPath: 'polygon(30% 0, 100% 0, 100% 100%, 10% 100%)' }} />
              <div className="absolute inset-0 flex items-center justify-center"><Plus className="w-7 h-7 text-white" strokeWidth={3} /></div>
            </div>
          </div>
        </motion.button>

        {tabs.slice(2).map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <motion.button key={tab.id} whileTap={{ scale: 0.9 }} onClick={() => handleTabPress(tab.id)} className="flex flex-col items-center gap-0.5 py-2 px-4 min-w-[60px]">
              <Icon className={`w-6 h-6 ${isActive ? 'text-[#FF7A00]' : 'text-white/50'}`} strokeWidth={isActive ? 2.5 : 2} />
              <span className={`text-[10px] font-medium ${isActive ? 'text-[#FF7A00]' : 'text-white/50'}`}>{currentLang === 'ba' ? tab.labelBa : tab.label}</span>
            </motion.button>
          );
        })}
      </div>
    </motion.nav>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// WELCOME SECTION
// ═══════════════════════════════════════════════════════════════════════════════

const WelcomeSection: React.FC<{ onGoToSocial: () => void; onMenuOpen: () => void; currentLang: string }> = ({ onGoToSocial, onMenuOpen, currentLang }) => {
  const navigate = useNavigate();
  
  const feeds = [
    { id: 'patrimoine', emoji: '🏛️', label: 'Patrimoine', labelBa: 'Kpààrà', desc: 'Contes, proverbes, chants', gradient: 'from-orange-500 to-amber-400' },
    { id: 'mavoix', emoji: '📢', label: 'Ma Voix', labelBa: 'Ohùn Mi', desc: 'Annonces, messages', gradient: 'from-teal-500 to-cyan-400' },
    { id: 'creation', emoji: '🎬', label: 'Création', labelBa: 'Ìṣẹ̀dá', desc: 'Vidéos, photos', gradient: 'from-purple-500 to-indigo-400' },
  ];

  return (
    <div className="px-4 pt-4 pb-6">
      {/* Header simple avec hamburger */}
      <div className="flex items-center justify-between mb-6">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onMenuOpen}
          className="w-11 h-11 rounded-full flex items-center justify-center bg-white/10"
        >
          <Menu className="w-5 h-5 text-white" />
        </motion.button>
        
        <div className="flex items-center gap-2">
          <span className="text-2xl">🥁</span>
          <span className="text-white font-black text-xl">TAM-TAM</span>
        </div>
        
        <div className="w-11 h-11" /> {/* Spacer */}
      </div>

      {/* Welcome message */}
      <div className="mb-6 text-center">
        <h1 className="text-white text-2xl font-bold mb-2">
          {currentLang === 'ba' ? 'Ẹ káàbọ̀!' : 'Bienvenue!'}
        </h1>
        <p className="text-white/60 text-sm">
          {currentLang === 'ba' ? 'Kí ni o fẹ́ ṣe lónìí?' : 'Que voulez-vous découvrir?'}
        </p>
      </div>

      {/* Feed cards */}
      <div className="space-y-3 mb-6">
        {feeds.map((feed, i) => (
          <motion.button
            key={feed.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/tamtam/social')}
            className={`w-full rounded-2xl p-4 flex items-center gap-4 bg-gradient-to-r ${feed.gradient}`}
          >
            <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center">
              <span className="text-3xl">{feed.emoji}</span>
            </div>
            <div className="flex-1 text-left">
              <h3 className="text-white text-lg font-bold">{currentLang === 'ba' ? feed.labelBa : feed.label}</h3>
              <p className="text-white/80 text-sm">{feed.desc}</p>
            </div>
            <ChevronRight className="w-6 h-6 text-white/70" />
          </motion.button>
        ))}
      </div>

      {/* Trending section */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-5 h-5 text-[#FF7A00]" />
          <h2 className="text-white font-bold">{currentLang === 'ba' ? 'Àwọn tó gbajúmọ̀' : 'Tendances'}</h2>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {['🎵 Musique', '📚 Contes', '🌾 Agriculture', '🩺 Santé', '😂 Humour'].map((tag, i) => (
            <motion.button key={i} whileTap={{ scale: 0.95 }} className="flex-shrink-0 px-4 py-2 rounded-full bg-white/10 text-white text-sm whitespace-nowrap">
              {tag}
            </motion.button>
          ))}
        </div>
      </div>

      {/* AI Suggestion */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="rounded-2xl p-4 border border-[#FF7A00]/30"
        style={{ background: 'rgba(255, 122, 0, 0.1)' }}
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-full bg-[#FF7A00]/20 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-[#FF7A00]" />
          </div>
          <div>
            <h3 className="text-white font-bold text-sm">{currentLang === 'ba' ? 'Àbá AI' : 'Suggestion IA'}</h3>
            <p className="text-white/60 text-xs">Basé sur votre localisation</p>
          </div>
        </div>
        <p className="text-white/80 text-sm mb-3">
          "{currentLang === 'ba' ? 'Sọ̀rọ̀ nípa owó ọjà lónìí!' : 'Parlez des prix du marché aujourd\'hui!'}"
        </p>
        <motion.button whileTap={{ scale: 0.95 }} onClick={() => navigate('/tamtam/social')} className="w-full py-2.5 rounded-xl bg-[#FF7A00] text-white text-sm font-bold">
          {currentLang === 'ba' ? 'Bẹ̀rẹ̀' : 'Commencer'}
        </motion.button>
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
  const { toast } = useToast();
  const { createPost, fetchPosts } = useTamTamPosts();
  const sideMenu = useSideMenu();

  const [activeTab, setActiveTab] = useState<TabId>('home');
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [showCreator, setShowCreator] = useState(false);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [createPostType, setCreatePostType] = useState<'patrimoine' | 'mavoix'>('patrimoine');

  useEffect(() => {
    announceAction(t('screenHome'));
  }, [announceAction, t]);

  const handleCreatePost = useCallback(async (data: any) => {
    try {
      const postData = {
        ...data,
        audio_url: data.audio_url || DEFAULT_AUDIO_URL,
        topic: createPostType,
      };
      await createPost(postData);
      toast({ title: "✅ Publié!" });
      triggerFeedback('success');
      fetchPosts();
      setShowCreatePost(false);
    } catch (error) {
      toast({ title: "❌ Erreur", description: "Impossible de publier.", variant: "destructive" });
    }
  }, [createPost, createPostType, fetchPosts, toast]);

  const handleCreatorComplete = useCallback(async (d: any) => {
    try {
      const postData = {
        audio_url: d.audio_url || DEFAULT_AUDIO_URL,
        media_type: d.media_type || 'audio',
        media_url: d.media_url || null,
        transcript_fr: d.transcript_fr || '',
        transcript_ba: d.transcript_ba || '',
        topic: d.topic || 'creation',
        template_id: d.template_id || null,
        duration_seconds: d.duration_seconds || 30,
      };
      await createPost(postData);
      toast({ title: "✅ Publié!" });
      triggerFeedback('success');
      fetchPosts();
      setShowCreator(false);
    } catch (error) {
      toast({ title: "❌ Erreur", description: "Impossible de publier.", variant: "destructive" });
    }
  }, [createPost, fetchPosts, toast]);

  return (
    <div className="fixed inset-0 overflow-y-auto" style={{ background: '#0B0B0B' }}>
      <WelcomeSection onGoToSocial={() => navigate('/tamtam/social')} onMenuOpen={sideMenu.open} currentLang={currentLang} />

      <BottomTabBar activeTab={activeTab} onTabChange={setActiveTab} onCreatePress={() => setShowCreateMenu(true)} currentLang={currentLang} />

      <CreateMenu
        isOpen={showCreateMenu}
        onClose={() => setShowCreateMenu(false)}
        onSelectPatrimoine={() => { setCreatePostType('patrimoine'); setShowCreatePost(true); }}
        onSelectMaVoix={() => { setCreatePostType('mavoix'); setShowCreatePost(true); }}
        onSelectCreateur={() => setShowCreator(true)}
        currentLang={currentLang}
      />

      <TamTamCreatePost isOpen={showCreatePost} onClose={() => setShowCreatePost(false)} onSubmit={handleCreatePost} />

      <FullscreenCreator open={showCreator} onClose={() => setShowCreator(false)} onPublish={handleCreatorComplete} />
    </div>
  );
}
