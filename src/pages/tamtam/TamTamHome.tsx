import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useCallback } from 'react';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';
import { useAudioDescription } from '@/contexts/AudioDescriptionContext';
import { useUnifiedAudio } from '@/hooks/useUnifiedAudio';
import { useTamTamPosts } from '@/hooks/useTamTamPosts';
import { triggerFeedback } from '@/utils/tamtamFeedback';
import { 
  Search, Video, Radio, Mic, MessageCircle, 
  Heart, Share2, ChevronDown, TrendingUp, X,
  Volume2, Loader2, Play
} from 'lucide-react';
import { RaconteMoiAssistant } from '@/components/tamtam/RaconteMoiAssistant';
import { TamTamVideoFeed } from '@/components/tamtam/TamTamVideoFeed';
import { TamTamAudioFeed } from '@/components/tamtam/TamTamAudioFeed';
import FullscreenCreator from '@/components/tamtam/FullscreenCreator';

// ═══════════════════════════════════════════════════════════════════════════════
// 🏠 TAM-TAM HOME - VERSION SIMPLIFIÉE & INCLUSIVE
// ═══════════════════════════════════════════════════════════════════════════════
// Design: Épuré, accessible, sans doublons
// Optimisé pour les utilisateurs non-lettrés (grandes icônes, audio feedback)
// ═══════════════════════════════════════════════════════════════════════════════

type FeedMode = 'creation' | 'radio' | 'mavoix';

// Configuration des modes de feed avec emojis XXL pour non-lettrés
const feedModes: { 
  id: FeedMode; 
  emoji: string; 
  label: string; 
  labelBa: string; 
  color: string;
  gradient: string;
}[] = [
  { 
    id: 'creation', 
    emoji: '🎬', 
    label: 'Vidéos', 
    labelBa: 'Fídíò', 
    color: '#8B5CF6',
    gradient: 'from-violet-500 to-purple-600'
  },
  { 
    id: 'radio', 
    emoji: '📻', 
    label: 'Radio', 
    labelBa: 'Rédíò', 
    color: '#F59E0B',
    gradient: 'from-amber-500 to-orange-600'
  },
  { 
    id: 'mavoix', 
    emoji: '🎤', 
    label: 'Ma Voix', 
    labelBa: 'Ohùn Mi', 
    color: '#10B981',
    gradient: 'from-emerald-500 to-teal-600'
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// FEED MODE SELECTOR - Gros boutons accessibles avec audio
// ═══════════════════════════════════════════════════════════════════════════════

const FeedModeSelector: React.FC<{
  currentMode: FeedMode;
  onModeChange: (mode: FeedMode) => void;
  currentLang: string;
  onSpeak: (text: string) => void;
  isSpeaking: boolean;
}> = ({ currentMode, onModeChange, currentLang, onSpeak, isSpeaking }) => {
  
  const handleModeClick = (mode: typeof feedModes[0]) => {
    triggerFeedback('notification', { haptic: true, sound: true });
    onModeChange(mode.id);
    // Lire le label à haute voix pour les non-lettrés
    onSpeak(currentLang === 'ba' ? mode.labelBa : mode.label);
  };

  return (
    <div className="px-4 py-3">
      <div className="flex gap-2 justify-center">
        {feedModes.map((mode) => {
          const isActive = currentMode === mode.id;
          
          return (
            <motion.button
              key={mode.id}
              whileTap={{ scale: 0.92 }}
              onClick={() => handleModeClick(mode)}
              className={`relative flex-1 max-w-[120px] flex flex-col items-center gap-2 py-4 px-3 rounded-2xl transition-all ${
                isActive 
                  ? 'bg-gradient-to-br shadow-lg' 
                  : 'bg-white/80 hover:bg-white border border-gray-100'
              }`}
              style={isActive ? {
                backgroundImage: `linear-gradient(135deg, ${mode.color}20 0%, ${mode.color}40 100%)`,
                borderColor: mode.color,
                borderWidth: 2,
              } : {}}
            >
              {/* Emoji XXL pour accessibilité */}
              <span className="text-4xl">{mode.emoji}</span>
              
              {/* Label */}
              <span className={`text-sm font-bold ${isActive ? 'text-gray-800' : 'text-gray-500'}`}>
                {currentLang === 'ba' ? mode.labelBa : mode.label}
              </span>
              
              {/* Indicateur actif */}
              {isActive && (
                <motion.div
                  layoutId="activeModeIndicator"
                  className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full"
                  style={{ backgroundColor: mode.color }}
                />
              )}
              
              {/* Bouton audio - pour écouter le nom */}
              <motion.div
                whileTap={{ scale: 0.9 }}
                onClick={(e) => {
                  e.stopPropagation();
                  onSpeak(currentLang === 'ba' ? mode.labelBa : mode.label);
                }}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-white/80 flex items-center justify-center shadow-sm"
              >
                {isSpeaking ? (
                  <Loader2 className="w-3 h-3 text-blue-500 animate-spin" />
                ) : (
                  <Volume2 className="w-3 h-3 text-blue-500" />
                )}
              </motion.div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// WELCOME CARD - Carte d'accueil avec Raconte-Moi
// ═══════════════════════════════════════════════════════════════════════════════

const WelcomeCard: React.FC<{
  onAssistantOpen: () => void;
  currentLang: string;
}> = ({ onAssistantOpen, currentLang }) => (
  <div className="min-h-[70vh] w-full snap-start snap-always relative bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 overflow-hidden flex flex-col items-center justify-center px-6 py-12">
    {/* Orbes animées en fond */}
    <div className="absolute inset-0 overflow-hidden">
      {[...Array(4)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-white/10 blur-3xl"
          style={{ 
            width: `${100 + i * 50}px`, 
            height: `${100 + i * 50}px`, 
            left: `${20 + i * 20}%`, 
            top: `${15 + i * 15}%` 
          }}
          animate={{ 
            x: [0, 20, -20, 0], 
            y: [0, -20, 20, 0],
            scale: [1, 1.1, 0.9, 1]
          }}
          transition={{ duration: 6 + i * 2, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </div>

    {/* Contenu principal */}
    <motion.div 
      initial={{ scale: 0.8, opacity: 0 }} 
      animate={{ scale: 1, opacity: 1 }} 
      transition={{ type: 'spring', delay: 0.2 }}
      className="relative text-center z-10"
    >
      {/* Bouton Raconte-Moi - GÉANT pour accessibilité */}
      <motion.button
        onClick={onAssistantOpen}
        className="relative mb-6"
        whileTap={{ scale: 0.95 }}
      >
        {/* Pulse animé */}
        <motion.div
          className="absolute inset-0 rounded-full bg-white/30"
          animate={{ scale: [1, 1.8, 1.8], opacity: [0.6, 0, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <motion.div
          className="absolute inset-0 rounded-full bg-white/20"
          animate={{ scale: [1, 2.2, 2.2], opacity: [0.4, 0, 0] }}
          transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
        />
        
        {/* Bouton principal */}
        <div className="relative w-32 h-32 rounded-full bg-white shadow-2xl flex items-center justify-center">
          <motion.div
            animate={{ y: [0, -3, 0] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          >
            <MessageCircle className="w-16 h-16 text-purple-600" strokeWidth={1.5} />
          </motion.div>
          
          {/* Badge micro */}
          <motion.div
            className="absolute -bottom-1 -right-1 w-10 h-10 rounded-full bg-green-500 flex items-center justify-center shadow-lg border-4 border-white"
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          >
            <Mic className="w-5 h-5 text-white" />
          </motion.div>
        </div>
      </motion.button>

      {/* Titre */}
      <motion.h1
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-3xl font-black text-white mb-2"
      >
        🎭 Raconte-Moi
      </motion.h1>
      
      <motion.p
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-white/80 text-lg mb-6"
      >
        {currentLang === 'ba' ? 'Tẹ́ láti bẹ̀rẹ̀' : 'Touchez pour parler'}
      </motion.p>

      {/* Pills thématiques - avec gros emojis */}
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="flex gap-3 justify-center flex-wrap"
      >
        {[
          { emoji: '🎵', label: currentLang === 'ba' ? 'Orin' : 'Musique' },
          { emoji: '📖', label: currentLang === 'ba' ? 'Ìtàn' : 'Contes' },
          { emoji: '🌍', label: currentLang === 'ba' ? 'Àṣà' : 'Culture' },
        ].map((item, i) => (
          <motion.div
            key={i}
            whileTap={{ scale: 0.95 }}
            className="px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center gap-2"
          >
            <span className="text-2xl">{item.emoji}</span>
            <span className="text-white font-medium">{item.label}</span>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>

    {/* Indicateur de scroll */}
    <motion.div 
      className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center text-white/70"
      animate={{ y: [0, 8, 0] }}
      transition={{ repeat: Infinity, duration: 1.5 }}
    >
      <ChevronDown className="w-8 h-8" />
      <span className="text-sm font-medium">{currentLang === 'ba' ? 'Swipe' : 'Glissez'}</span>
    </motion.div>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// BOUTON CRÉER - Flottant, accessible
// ═══════════════════════════════════════════════════════════════════════════════

const CreateButton: React.FC<{
  onClick: () => void;
  feedMode: FeedMode;
}> = ({ onClick, feedMode }) => {
  const mode = feedModes.find(m => m.id === feedMode) || feedModes[0];
  
  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      whileHover={{ scale: 1.05 }}
      onClick={() => {
        triggerFeedback('click');
        onClick();
      }}
      className="fixed bottom-6 right-4 z-30"
    >
      {/* Glow */}
      <motion.div
        className={`absolute inset-0 rounded-full bg-gradient-to-r ${mode.gradient} blur-xl opacity-50`}
        animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }}
        transition={{ repeat: Infinity, duration: 2 }}
      />
      
      {/* Bouton */}
      <div className={`relative w-16 h-16 rounded-full bg-gradient-to-r ${mode.gradient} shadow-2xl flex items-center justify-center`}>
        <span className="text-white text-3xl font-light">+</span>
      </div>
    </motion.button>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// SEARCH MODAL - Simplifié avec suggestions visuelles
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
        className="fixed inset-0 bg-black/90 backdrop-blur-xl z-50 flex flex-col"
      >
        <div className="p-4 pt-safe">
          {/* Barre de recherche */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-white/50" />
            <input
              type="text"
              placeholder={currentLang === 'ba' ? 'Wá...' : 'Rechercher...'}
              autoFocus
              className="w-full bg-white/10 border border-white/20 rounded-2xl pl-14 pr-14 py-4 text-lg text-white placeholder-white/50 focus:outline-none focus:border-white/40"
            />
            <motion.button 
              whileTap={{ scale: 0.9 }} 
              onClick={onClose} 
              className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center"
            >
              <X className="w-5 h-5 text-white" />
            </motion.button>
          </div>
          
          {/* Suggestions visuelles - avec gros emojis */}
          <div className="mt-8">
            <div className="flex items-center gap-2 mb-4 px-2">
              <TrendingUp className="w-5 h-5 text-pink-400" />
              <span className="text-white font-semibold">
                {currentLang === 'ba' ? 'Gbajúmọ̀' : 'Tendances'}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {[
                { emoji: '🎵', label: 'Musique' },
                { emoji: '📖', label: 'Contes' },
                { emoji: '🌾', label: 'Agriculture' },
                { emoji: '🩺', label: 'Santé' },
                { emoji: '🎭', label: 'Culture' },
                { emoji: '📢', label: 'Annonces' },
              ].map((item, i) => (
                <motion.button
                  key={i}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-3 p-4 rounded-2xl bg-white/10 hover:bg-white/15"
                >
                  <span className="text-3xl">{item.emoji}</span>
                  <span className="text-white font-medium">{item.label}</span>
                </motion.button>
              ))}
            </div>
          </div>
        </div>
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
  const { speakCurrentLang, stop } = useUnifiedAudio();
  const { posts } = useTamTamPosts();

  // États
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [feedMode, setFeedMode] = useState<FeedMode>('creation');
  const [showSearch, setShowSearch] = useState(false);
  const [showCreator, setShowCreator] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    announceAction(t('screenHome'));
  }, [announceAction, t]);

  // Fonction pour parler (TTS)
  const handleSpeak = useCallback(async (text: string) => {
    setIsSpeaking(true);
    try {
      await speakCurrentLang(text);
    } catch (e) {
      console.warn('TTS failed:', e);
    } finally {
      setIsSpeaking(false);
    }
  }, [speakCurrentLang]);

  const handleFeedModeChange = useCallback((mode: FeedMode) => {
    setFeedMode(mode);
  }, []);

  // Transformer les posts pour le feed vidéo
  const videoPosts = posts
    .filter(p => (p as any).media_type === 'video' || (p as any).template_id)
    .map(p => ({
      id: p.id,
      videoUrl: (p as any).media_url || p.audio_url || '',
      thumbnailUrl: (p as any).thumbnail_url,
      transcriptFr: (p as any).transcript_fr || (p as any).transcript,
      topic: (p as any).topic,
      duration: p.duration_seconds || 30,
      author: { 
        name: p.profile?.display_name || 'Utilisateur', 
        username: p.profile?.username || 'user', 
        avatarUrl: p.profile?.avatar_url 
      },
      likes: p.reactions_count || 0,
      comments: p.comments_count || 0,
      shares: 0,
    }));

  // Transformer les posts pour le feed audio
  const audioPosts = posts
    .filter(p => (p as any).media_type === 'audio' || p.audio_url)
    .map(p => ({
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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Sélecteur de mode - En haut, bien visible */}
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-lg border-b border-gray-100 shadow-sm">
        <FeedModeSelector
          currentMode={feedMode}
          onModeChange={handleFeedModeChange}
          currentLang={currentLang}
          onSpeak={handleSpeak}
          isSpeaking={isSpeaking}
        />
        
        {/* Bouton recherche discret */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowSearch(true)}
          className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center"
        >
          <Search className="w-5 h-5 text-gray-500" />
        </motion.button>
      </div>

      {/* Contenu principal avec scroll snap */}
      <div className="overflow-y-auto snap-y snap-mandatory" style={{ height: 'calc(100vh - 80px)' }}>
        {/* Carte d'accueil Raconte-Moi */}
        <WelcomeCard 
          onAssistantOpen={() => setIsAssistantOpen(true)} 
          currentLang={currentLang} 
        />

        {/* Feed selon le mode */}
        <div className="snap-start snap-always min-h-screen">
          {feedMode === 'creation' ? (
            <TamTamVideoFeed
              videos={videoPosts.length > 0 ? videoPosts : undefined}
              onLike={(id) => triggerFeedback('success')}
              onComment={(id) => {}}
              onShare={(id) => triggerFeedback('send')}
              onSave={(id) => triggerFeedback('success')}
            />
          ) : (
            <TamTamAudioFeed
              posts={audioPosts.length > 0 ? audioPosts : undefined}
              mode={feedMode === 'radio' ? 'radio' : 'mavoix'}
              onLike={(id) => triggerFeedback('success')}
              onReply={(id) => setShowCreator(true)}
              onShare={(id) => triggerFeedback('send')}
              onSave={(id) => triggerFeedback('success')}
            />
          )}
        </div>
      </div>

      {/* Bouton créer flottant */}
      <CreateButton onClick={() => setShowCreator(true)} feedMode={feedMode} />

      {/* Modals */}
      <SearchModal 
        isOpen={showSearch} 
        onClose={() => setShowSearch(false)} 
        currentLang={currentLang} 
      />

      <RaconteMoiAssistant 
        isOpen={isAssistantOpen} 
        onOpenChange={setIsAssistantOpen} 
      />

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
