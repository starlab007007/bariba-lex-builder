import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { 
  MessageCircle, Radio, Newspaper, Search, Users, Plus, 
  Sparkles, Zap, Globe, Mic, Video, Camera, Music,
  TrendingUp, Heart, Bell, Settings, ChevronDown,
  Podcast, Headphones, Waves, Crown, Star
} from 'lucide-react';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';
import { useAudioDescription } from '@/contexts/AudioDescriptionContext';
import { useTamTamPosts, TamTamComment } from '@/hooks/useTamTamPosts';
import { useTamTamPolls } from '@/hooks/useTamTamPolls';
import { useRadioFeed } from '@/hooks/useRadioFeed';
import { useFeedAlgorithm } from '@/hooks/useFeedAlgorithm';
import { TamTamEnhancedFeedCard, EnhancedPost } from '@/components/tamtam/TamTamEnhancedFeedCard';
import { RadioVisualFeedCard, RadioVisualPost } from '@/components/tamtam/RadioVisualFeedCard';
import { TamTamPollCard } from '@/components/tamtam/TamTamPollCard';
import { TamTamStories } from '@/components/tamtam/TamTamStories';
import { TamTamCommentsModal } from '@/components/tamtam/TamTamCommentsModal';
import { TamTamCreatePost } from '@/components/tamtam/TamTamCreatePost';
import { TamTamVocalPoll } from '@/components/tamtam/TamTamVocalPoll';
import { TamTamStoryCreator } from '@/components/tamtam/TamTamStoryCreator';
import { TamTamUserSearch } from '@/components/tamtam/TamTamUserSearch';
import { TamTamFriendSuggestions } from '@/components/tamtam/TamTamFriendSuggestions';
import { TamTamCommunities } from '@/components/tamtam/TamTamCommunities';
import { TamTamLiveList } from '@/components/tamtam/TamTamLiveList';
import { TamTamMessagesHub } from '@/components/tamtam/TamTamMessagesHub';
import { FeedModeSelector, FeedMode } from '@/components/tamtam/FeedModeSelector';
import { RadioMiniPlayer } from '@/components/tamtam/RadioMiniPlayer';
import { TamTamVideoFeed } from '@/components/tamtam/TamTamVideoFeed';
import { TamTamAudioFeed } from '@/components/tamtam/TamTamAudioFeed';
import FullscreenCreator from '@/components/tamtam/FullscreenCreator';
import { PostActionType } from '@/components/tamtam/PostActionBar';
import { triggerFeedback } from '@/utils/tamtamFeedback';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useVoiceMenu, VoiceMenuLabels } from '@/hooks/useVoiceMenu';
import { SpeakerButton } from '@/components/tamtam/VoiceMenuItem';

// ═══════════════════════════════════════════════════════════════════════════════
// 🌟 TAM-TAM SOCIAL - ULTRA PREMIUM EXPERIENCE
// ═══════════════════════════════════════════════════════════════════════════════
// Design: iOS 18 Liquid Glass + Afro-Futurisme + TikTok Immersive
// ═══════════════════════════════════════════════════════════════════════════════

// Types
type MainTab = 'feed' | 'messages' | 'communities' | 'live';
type FeedSubMode = 'creation' | 'radio' | 'mavoix';

interface TabConfig {
  id: MainTab;
  icon: typeof Newspaper;
  label: string;
  emoji: string;
  gradient: string;
  activeColor: string;
}

// Configuration des onglets principaux
const mainTabs: TabConfig[] = [
  { 
    id: 'feed', 
    icon: Newspaper, 
    label: 'Fil', 
    emoji: '📰',
    gradient: 'from-blue-500 via-cyan-400 to-teal-400',
    activeColor: '#00D4FF'
  },
  { 
    id: 'messages', 
    icon: MessageCircle, 
    label: 'Chat', 
    emoji: '💬',
    gradient: 'from-purple-500 via-pink-500 to-rose-400',
    activeColor: '#FF6B9D'
  },
  { 
    id: 'communities', 
    icon: Users, 
    label: 'Groupes', 
    emoji: '👥',
    gradient: 'from-amber-500 via-orange-500 to-red-400',
    activeColor: '#FF8C42'
  },
  { 
    id: 'live', 
    icon: Radio, 
    label: 'Direct', 
    emoji: '🔴',
    gradient: 'from-red-500 via-rose-500 to-pink-400',
    activeColor: '#FF4757'
  },
];

// Configuration des sous-modes du feed
const feedModes: { id: FeedSubMode; icon: typeof Video; label: string; emoji: string; description: string }[] = [
  { id: 'creation', icon: Video, label: 'Création', emoji: '🎬', description: 'Vidéos & Photos' },
  { id: 'radio', icon: Headphones, label: 'Radio', emoji: '📻', description: 'Patrimoine Audio' },
  { id: 'mavoix', icon: Mic, label: 'Ma Voix', emoji: '🎤', description: 'Messages Vocaux' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// COMPOSANTS UI PREMIUM
// ═══════════════════════════════════════════════════════════════════════════════

// Liquid Glass Header
const LiquidGlassHeader: React.FC<{
  activeTab: MainTab;
  onTabChange: (tab: MainTab) => void;
  onSearch: () => void;
  unreadMessages?: number;
  liveCount?: number;
}> = ({ activeTab, onTabChange, onSearch, unreadMessages = 0, liveCount = 0 }) => {
  const { scrollY } = useScroll();
  const headerOpacity = useTransform(scrollY, [0, 50], [0.85, 0.98]);
  const headerBlur = useTransform(scrollY, [0, 50], [20, 40]);

  return (
    <motion.header 
      className="sticky top-0 z-50 safe-area-top"
      style={{ 
        background: `rgba(255, 255, 255, 0.85)`,
        backdropFilter: 'blur(40px) saturate(180%)',
        WebkitBackdropFilter: 'blur(40px) saturate(180%)',
      }}
    >
      {/* Gradient accent line */}
      <div className="h-[2px] w-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
      
      <div className="px-4 py-3">
        {/* Top row: Logo + Actions */}
        <div className="flex items-center justify-between mb-3">
          {/* Logo TAM-TAM */}
          <motion.div 
            className="flex items-center gap-2"
            whileTap={{ scale: 0.95 }}
          >
            <div className="relative">
              <motion.div 
                className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 flex items-center justify-center shadow-lg"
                animate={{ 
                  boxShadow: [
                    '0 4px 20px rgba(251, 146, 60, 0.4)',
                    '0 4px 30px rgba(251, 146, 60, 0.6)',
                    '0 4px 20px rgba(251, 146, 60, 0.4)'
                  ]
                }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                <span className="text-xl">🥁</span>
              </motion.div>
              <motion.div 
                className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              />
            </div>
            <div>
              <h1 className="text-lg font-black bg-gradient-to-r from-amber-600 via-orange-500 to-red-500 bg-clip-text text-transparent">
                TAM-TAM
              </h1>
              <p className="text-[10px] text-gray-400 -mt-0.5 font-medium">Social Audio</p>
            </div>
          </motion.div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {/* Live indicator */}
            {liveCount > 0 && (
              <motion.button
                whileTap={{ scale: 0.9 }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                style={{
                  background: 'linear-gradient(135deg, rgba(255, 71, 87, 0.15) 0%, rgba(255, 107, 157, 0.15) 100%)',
                  border: '1px solid rgba(255, 71, 87, 0.3)',
                }}
              >
                <motion.span 
                  className="w-2 h-2 rounded-full bg-red-500"
                  animate={{ opacity: [1, 0.4, 1], scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                />
                <span className="text-red-500 text-xs font-bold">{liveCount} LIVE</span>
              </motion.button>
            )}

            {/* Notifications */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              className="relative w-10 h-10 rounded-full flex items-center justify-center"
              style={{
                background: 'rgba(0, 0, 0, 0.05)',
              }}
            >
              <Bell className="w-5 h-5 text-gray-600" />
              {unreadMessages > 0 && (
                <motion.span 
                  className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                >
                  {unreadMessages > 99 ? '99+' : unreadMessages}
                </motion.span>
              )}
            </motion.button>

            {/* Search */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={onSearch}
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)',
                border: '1px solid rgba(0, 212, 255, 0.2)',
              }}
            >
              <Search className="w-5 h-5 text-cyan-600" />
            </motion.button>
          </div>
        </div>

        {/* Main tabs */}
        <div className="flex gap-1 p-1 rounded-2xl" style={{ background: 'rgba(0, 0, 0, 0.04)' }}>
          {mainTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <motion.button
                key={tab.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => onTabChange(tab.id)}
                className="relative flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all"
                style={isActive ? {
                  background: `linear-gradient(135deg, ${tab.activeColor}15 0%, ${tab.activeColor}25 100%)`,
                } : {}}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTabBg"
                    className="absolute inset-0 rounded-xl"
                    style={{
                      background: `linear-gradient(135deg, ${tab.activeColor}20 0%, ${tab.activeColor}10 100%)`,
                      border: `1px solid ${tab.activeColor}30`,
                    }}
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                  />
                )}
                
                <div className="relative z-10 flex items-center gap-1.5">
                  <Icon 
                    className="w-4 h-4 transition-colors" 
                    style={{ color: isActive ? tab.activeColor : '#9CA3AF' }}
                  />
                  <span 
                    className="text-sm font-semibold transition-colors"
                    style={{ color: isActive ? tab.activeColor : '#6B7280' }}
                  >
                    {tab.label}
                  </span>
                  
                  {/* Badges */}
                  {tab.id === 'messages' && unreadMessages > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold">
                      {unreadMessages}
                    </span>
                  )}
                  {tab.id === 'live' && liveCount > 0 && (
                    <motion.span 
                      className="ml-1 w-2 h-2 rounded-full bg-red-500"
                      animate={{ opacity: [1, 0.4, 1] }}
                      transition={{ repeat: Infinity, duration: 1 }}
                    />
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    </motion.header>
  );
};

// Feed Mode Selector Premium
const FeedModeSelectorPremium: React.FC<{
  currentMode: FeedSubMode;
  onModeChange: (mode: FeedSubMode) => void;
}> = ({ currentMode, onModeChange }) => {
  return (
    <div className="px-4 py-3" style={{ background: 'rgba(255, 255, 255, 0.7)' }}>
      <div className="flex gap-2 p-1 rounded-2xl" style={{ background: 'rgba(0, 0, 0, 0.03)' }}>
        {feedModes.map((mode) => {
          const Icon = mode.icon;
          const isActive = currentMode === mode.id;
          
          return (
            <motion.button
              key={mode.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => onModeChange(mode.id)}
              className="relative flex-1 flex flex-col items-center gap-1 py-3 rounded-xl transition-all overflow-hidden"
            >
              {isActive && (
                <motion.div
                  layoutId="activeFeedMode"
                  className="absolute inset-0 rounded-xl"
                  style={{
                    background: mode.id === 'creation' 
                      ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(147, 51, 234, 0.15) 100%)'
                      : mode.id === 'radio'
                      ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(239, 68, 68, 0.15) 100%)'
                      : 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(6, 182, 212, 0.15) 100%)',
                    border: '1px solid rgba(0, 0, 0, 0.08)',
                  }}
                  transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
                />
              )}
              
              <div className="relative z-10 flex flex-col items-center">
                <span className="text-2xl mb-1">{mode.emoji}</span>
                <span className={`text-xs font-bold ${isActive ? 'text-gray-800' : 'text-gray-500'}`}>
                  {mode.label}
                </span>
                <span className={`text-[10px] ${isActive ? 'text-gray-600' : 'text-gray-400'}`}>
                  {mode.description}
                </span>
              </div>
              
              {isActive && (
                <motion.div
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full"
                  style={{
                    background: mode.id === 'creation' 
                      ? 'linear-gradient(90deg, #3B82F6, #9333EA)'
                      : mode.id === 'radio'
                      ? 'linear-gradient(90deg, #F59E0B, #EF4444)'
                      : 'linear-gradient(90deg, #10B981, #06B6D4)',
                  }}
                  layoutId="feedModeIndicator"
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

// Floating Action Button Premium
const FloatingActionButtonPremium: React.FC<{
  onClick: () => void;
  feedMode: FeedSubMode;
}> = ({ onClick, feedMode }) => {
  const getGradient = () => {
    switch (feedMode) {
      case 'creation': return 'from-blue-500 via-purple-500 to-pink-500';
      case 'radio': return 'from-amber-500 via-orange-500 to-red-500';
      case 'mavoix': return 'from-emerald-500 via-teal-500 to-cyan-500';
    }
  };

  const getIcon = () => {
    switch (feedMode) {
      case 'creation': return <Video className="w-7 h-7 text-white" />;
      case 'radio': return <Music className="w-7 h-7 text-white" />;
      case 'mavoix': return <Mic className="w-7 h-7 text-white" />;
    }
  };

  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      whileHover={{ scale: 1.05 }}
      onClick={onClick}
      className="fixed bottom-24 right-4 z-40"
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: 'spring', bounce: 0.4 }}
    >
      {/* Glow effect */}
      <motion.div
        className={`absolute inset-0 rounded-full bg-gradient-to-r ${getGradient()} blur-xl opacity-60`}
        animate={{ 
          scale: [1, 1.3, 1],
          opacity: [0.4, 0.7, 0.4]
        }}
        transition={{ repeat: Infinity, duration: 2 }}
      />
      
      {/* Button */}
      <div className={`relative w-16 h-16 rounded-full bg-gradient-to-r ${getGradient()} flex items-center justify-center shadow-2xl`}>
        {getIcon()}
        
        {/* Plus badge */}
        <motion.div
          className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-white shadow-lg flex items-center justify-center"
          animate={{ rotate: [0, 90, 0] }}
          transition={{ repeat: Infinity, duration: 3 }}
        >
          <Plus className="w-4 h-4 text-gray-800" strokeWidth={3} />
        </motion.div>
      </div>
    </motion.button>
  );
};

// Loading Skeleton Premium
const LoadingSkeletonPremium: React.FC = () => (
  <div className="flex flex-col items-center justify-center py-20 px-4">
    <motion.div
      className="relative w-20 h-20"
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
    >
      {/* Outer ring */}
      <div className="absolute inset-0 rounded-full border-4 border-gray-200" />
      {/* Animated gradient ring */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background: 'conic-gradient(from 0deg, transparent 0%, #3B82F6 25%, #9333EA 50%, #EC4899 75%, transparent 100%)',
          mask: 'radial-gradient(transparent 60%, black 60%)',
          WebkitMask: 'radial-gradient(transparent 60%, black 60%)',
        }}
      />
      {/* Center emoji */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ repeat: Infinity, duration: 1 }}
      >
        <span className="text-3xl">🥁</span>
      </motion.div>
    </motion.div>
    
    <motion.p
      className="mt-6 text-gray-500 font-medium"
      animate={{ opacity: [0.5, 1, 0.5] }}
      transition={{ repeat: Infinity, duration: 1.5 }}
    >
      Chargement du fil...
    </motion.p>
    
    {/* Skeleton cards */}
    <div className="w-full max-w-sm mt-8 space-y-4">
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={i}
          className="h-32 rounded-2xl"
          style={{ background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)' }}
          animate={{ backgroundPosition: ['200% 0', '-200% 0'] }}
          transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.2 }}
        />
      ))}
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export default function TamTamSocial() {
  const { t } = useTamTamLanguage();
  const { announceScreen } = useAudioDescription();
  const { toast } = useToast();
  const { speakLabel, getLabel, isSpeaking } = useVoiceMenu();
  
  const { 
    posts, 
    stories, 
    isLoading: postsLoading, 
    createPost, 
    addReaction, 
    fetchComments, 
    addComment,
    createStory,
    fetchPosts
  } = useTamTamPosts();

  const { polls, isLoading: pollsLoading, votePoll } = useTamTamPolls();
  const radioFeed = useRadioFeed({ autoAdvance: true });
  const { rankPosts, recordInteraction } = useFeedAlgorithm({ prioritizeUtility: true, prioritizeCulture: true });

  // États
  const [activeTab, setActiveTab] = useState<MainTab>('feed');
  const [feedMode, setFeedMode] = useState<FeedSubMode>('creation');
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showCreatePoll, setShowCreatePoll] = useState(false);
  const [showStoryCreator, setShowStoryCreator] = useState(false);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [showGuidedCreator, setShowGuidedCreator] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(3);
  const [liveCount, setLiveCount] = useState(2);
  
  const [commentsModal, setCommentsModal] = useState<{
    isOpen: boolean;
    postId: string | null;
    comments: TamTamComment[];
    isLoading: boolean;
  }>({
    isOpen: false,
    postId: null,
    comments: [],
    isLoading: false
  });

  // Announce screen on mount
  useEffect(() => {
    announceScreen('social');
  }, [announceScreen]);

  useEffect(() => {
    if (activeTab === 'messages') announceScreen('messages');
    else if (activeTab === 'live') announceScreen('live');
  }, [activeTab, announceScreen]);

  // Handlers
  const handleTabChange = useCallback((tabId: MainTab) => {
    triggerFeedback('notification', { haptic: true, sound: false });
    setActiveTab(tabId);
  }, []);

  const handleFeedModeChange = useCallback((mode: FeedSubMode) => {
    triggerFeedback('notification', { haptic: true, sound: false });
    setFeedMode(mode);
  }, []);

  const handleOpenComments = useCallback(async (postId: string) => {
    setCommentsModal({ isOpen: true, postId, comments: [], isLoading: true });
    const comments = await fetchComments(postId);
    setCommentsModal(prev => ({ ...prev, comments, isLoading: false }));
  }, [fetchComments]);

  const handleAddComment = useCallback(async (audioBase64: string, duration: number) => {
    if (!commentsModal.postId) return;

    try {
      const audioBlob = base64ToBlob(audioBase64, 'audio/webm');
      const fileName = `comment_${Date.now()}.webm`;
      
      const { error } = await supabase.storage
        .from('tamtam-audio')
        .upload(fileName, audioBlob, { contentType: 'audio/webm' });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('tamtam-audio')
        .getPublicUrl(fileName);

      await addComment(commentsModal.postId, {
        audio_url: urlData.publicUrl,
        duration_seconds: duration
      });

      triggerFeedback('success');
      const comments = await fetchComments(commentsModal.postId);
      setCommentsModal(prev => ({ ...prev, comments }));
    } catch (err: any) {
      triggerFeedback('error');
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    }
  }, [commentsModal.postId, addComment, fetchComments, toast]);

  const handleShare = useCallback((postId: string) => {
    triggerFeedback('send');
    if (navigator.share) {
      navigator.share({
        title: 'TAM-TAM',
        text: 'Découvrez ce post sur TAM-TAM !',
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({ title: "🔗 Lien copié !" });
    }
  }, [toast]);

  const handleReaction = useCallback((postId: string, reaction: string) => {
    addReaction(postId, reaction);
    triggerFeedback('success');
  }, [addReaction]);

  const base64ToBlob = (base64: string, mimeType: string): Blob => {
    const byteCharacters = atob(base64.split(',')[1] || base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    return new Blob([new Uint8Array(byteNumbers)], { type: mimeType });
  };

  // Data transformations
  const enhancedPosts: EnhancedPost[] = useMemo(() => 
    posts.map(post => ({
      ...post,
      media_type: (post as any).media_type || 'audio',
      media_url: (post as any).media_url || null,
      thumbnail_url: (post as any).thumbnail_url || null,
      transcript_fr: (post as any).transcript_fr || (post as any).transcript || null,
      transcript_ba: (post as any).transcript_ba || null,
      feeling_emoji: (post as any).feeling_emoji || null,
    })), [posts]
  );

  const rankedPosts = useMemo(() => rankPosts(enhancedPosts), [rankPosts, enhancedPosts]);

  // Update radio queue
  useEffect(() => {
    if (feedMode === 'radio' && rankedPosts.length > 0) {
      radioFeed.setQueue(rankedPosts);
    }
  }, [feedMode, rankedPosts.length]);

  const isLoading = postsLoading || pollsLoading;

  return (
    <div 
      className="min-h-screen pb-28"
      style={{ 
        background: 'linear-gradient(180deg, #FAFBFF 0%, #F0F4FF 30%, #FFF5F5 60%, #FFFAF0 100%)'
      }}
    >
      {/* Header Premium */}
      <LiquidGlassHeader
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onSearch={() => setShowUserSearch(true)}
        unreadMessages={unreadMessages}
        liveCount={liveCount}
      />

      {/* Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'feed' && (
          <motion.div
            key="feed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {/* Feed Mode Selector */}
            <FeedModeSelectorPremium 
              currentMode={feedMode} 
              onModeChange={handleFeedModeChange} 
            />

            {/* Stories */}
            <div 
              className="border-b"
              style={{ 
                background: 'rgba(255, 255, 255, 0.8)', 
                borderColor: 'rgba(0, 0, 0, 0.05)' 
              }}
            >
              <TamTamStories 
                stories={stories} 
                onCreateStory={() => setShowStoryCreator(true)}
                onCreatePost={() => setShowCreatePost(true)}
              />
            </div>

            {/* Friend Suggestions - Only in creation mode */}
            {feedMode === 'creation' && (
              <TamTamFriendSuggestions 
                onMessage={(userId) => {
                  setActiveTab('messages');
                }}
                onViewProfile={(userId) => {}}
              />
            )}

            {/* Feed Content */}
            {isLoading ? (
              <LoadingSkeletonPremium />
            ) : feedMode === 'creation' ? (
              <TamTamVideoFeed
                videos={rankedPosts
                  .filter(p => p.media_type === 'video' || p.media_type === 'photo' || p.template_id)
                  .map(p => ({
                    id: p.id,
                    videoUrl: p.media_url || p.audio_url || '',
                    thumbnailUrl: p.thumbnail_url || undefined,
                    transcriptFr: p.transcript_fr || undefined,
                    transcriptBa: p.transcript_ba || undefined,
                    topic: p.topic || undefined,
                    topicEmoji: p.feeling_emoji || undefined,
                    duration: p.duration_seconds || 30,
                    author: {
                      name: p.profile?.display_name || 'Utilisateur',
                      username: p.profile?.username || 'user',
                      avatarUrl: p.profile?.avatar_url || undefined,
                    },
                    likes: p.reactions_count || 0,
                    comments: p.comments_count || 0,
                    shares: 0,
                    isLiked: false,
                    isSaved: false,
                  }))}
                onLike={(id) => handleReaction(id, 'like')}
                onComment={handleOpenComments}
                onShare={handleShare}
                onSave={(id) => triggerFeedback('success')}
              />
            ) : feedMode === 'radio' ? (
              <TamTamAudioFeed
                posts={rankedPosts
                  .filter(p => p.topic === 'culture' || p.topic === 'patrimoine' || (p as any).culture_score)
                  .map(p => ({
                    id: p.id,
                    audioUrl: p.audio_url || '',
                    duration: p.duration_seconds || 60,
                    templateId: p.template_id || 'radio',
                    category: 'patrimoine' as const,
                    subcategory: p.topic || 'culture',
                    emoji: p.feeling_emoji || '📻',
                    visualEmojis: ['🎵', '🥁', '🎶', '✨', '🌍'],
                    gradient: 'from-amber-500 via-orange-500 to-red-500',
                    titleFr: p.transcript_fr?.slice(0, 50) || 'Audio Patrimoine',
                    titleBa: p.transcript_ba?.slice(0, 50) || '',
                    transcript: p.transcript_fr || undefined,
                    authorName: p.profile?.display_name || 'TAM-TAM Radio',
                    authorVillage: p.location_name || 'Bénin',
                    likes: p.reactions_count || 0,
                    replies: p.comments_count || 0,
                    shares: 0,
                    isLiked: false,
                    isSaved: false,
                  }))}
                onLike={(id) => handleReaction(id, 'like')}
                onReply={(id) => setShowGuidedCreator(true)}
                onShare={handleShare}
                onSave={(id) => triggerFeedback('success')}
              />
            ) : (
              <TamTamAudioFeed
                posts={rankedPosts
                  .filter(p => p.media_type === 'audio' || !p.template_id)
                  .map(p => ({
                    id: p.id,
                    audioUrl: p.audio_url || '',
                    duration: p.duration_seconds || 60,
                    templateId: p.template_id || 'mavoix',
                    category: 'village_voice' as const,
                    subcategory: 'annonce',
                    emoji: p.feeling_emoji || '🎤',
                    visualEmojis: ['🎤', '💬', '👥', '📢', '🔊'],
                    gradient: 'from-emerald-500 via-teal-500 to-cyan-500',
                    titleFr: p.transcript_fr?.slice(0, 50) || 'Message Vocal',
                    titleBa: p.transcript_ba?.slice(0, 50) || '',
                    transcript: p.transcript_fr || undefined,
                    authorName: p.profile?.display_name || 'Utilisateur',
                    authorVillage: p.location_name || 'Ma communauté',
                    likes: p.reactions_count || 0,
                    replies: p.comments_count || 0,
                    shares: 0,
                    isLiked: false,
                    isSaved: false,
                  }))}
                onLike={(id) => handleReaction(id, 'like')}
                onReply={(id) => setShowGuidedCreator(true)}
                onShare={handleShare}
                onSave={(id) => triggerFeedback('success')}
              />
            )}

            {/* FAB */}
            <FloatingActionButtonPremium
              onClick={() => setShowGuidedCreator(true)}
              feedMode={feedMode}
            />
          </motion.div>
        )}

        {activeTab === 'messages' && (
          <motion.div
            key="messages"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="h-[calc(100vh-180px)]"
          >
            <TamTamMessagesHub 
              isOpen={true}
              onClose={() => setActiveTab('feed')}
            />
          </motion.div>
        )}

        {activeTab === 'communities' && (
          <motion.div
            key="communities"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="h-[calc(100vh-180px)]"
          >
            <TamTamCommunities />
          </motion.div>
        )}

        {activeTab === 'live' && (
          <motion.div
            key="live"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="h-[calc(100vh-180px)]"
          >
            <TamTamLiveList />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
      <TamTamCommentsModal
        isOpen={commentsModal.isOpen}
        onClose={() => setCommentsModal(prev => ({ ...prev, isOpen: false }))}
        comments={commentsModal.comments}
        onAddComment={handleAddComment}
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

      <TamTamVocalPoll
        isOpen={showCreatePoll}
        onClose={() => setShowCreatePoll(false)}
      />

      <TamTamStoryCreator
        isOpen={showStoryCreator}
        onClose={() => setShowStoryCreator(false)}
        onStoryCreated={() => fetchPosts()}
      />

      <TamTamUserSearch
        isOpen={showUserSearch}
        onClose={() => setShowUserSearch(false)}
        onMessage={(userId) => setActiveTab('messages')}
      />

      <FullscreenCreator
        isOpen={showGuidedCreator}
        onClose={() => setShowGuidedCreator(false)}
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
        }}
      />
    </div>
  );
}

// Export nommé pour compatibilité
export { TamTamSocial };
