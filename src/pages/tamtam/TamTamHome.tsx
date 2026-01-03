import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, Search, Bell } from 'lucide-react';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';
import { useAudioDescription } from '@/contexts/AudioDescriptionContext';
import { useTamTamPosts } from '@/hooks/useTamTamPosts';
import { useFeedAlgorithm } from '@/hooks/useFeedAlgorithm';
import { triggerFeedback } from '@/utils/tamtamFeedback';
import { RaconteMoiAssistant } from '@/components/tamtam/RaconteMoiAssistant';
import { SideMenuDrawer } from '@/components/tamtam/SideMenuDrawer';
import { TransparentFeedHeader, FeedSubMode } from '@/components/tamtam/TransparentFeedHeader';
import { BottomTabBar, BottomTabId } from '@/components/tamtam/BottomTabBar';
import { TamTamVideoFeed } from '@/components/tamtam/TamTamVideoFeed';
import { TamTamAudioFeed } from '@/components/tamtam/TamTamAudioFeed';
import { TamTamMessagesHub } from '@/components/tamtam/TamTamMessagesHub';
import { TamTamCommunities } from '@/components/tamtam/TamTamCommunities';
import { TamTamLiveList } from '@/components/tamtam/TamTamLiveList';
import { TamTamUserSearch } from '@/components/tamtam/TamTamUserSearch';
import FullscreenCreator from '@/components/tamtam/FullscreenCreator';
import { useToast } from '@/hooks/use-toast';

export default function TamTamHome() {
  const navigate = useNavigate();
  const { t, currentLang } = useTamTamLanguage();
  const { announceScreen } = useAudioDescription();
  const { toast } = useToast();
  
  const { 
    posts, 
    isLoading, 
    createPost, 
    addReaction, 
    fetchPosts 
  } = useTamTamPosts();
  
  const { rankPosts } = useFeedAlgorithm({ prioritizeUtility: true, prioritizeCulture: true });

  // States
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showCreator, setShowCreator] = useState(false);
  const [activeTab, setActiveTab] = useState<BottomTabId>('feed');
  const [feedMode, setFeedMode] = useState<FeedSubMode>('creation');
  const [unreadMessages] = useState(3);

  useEffect(() => {
    announceScreen('home');
  }, [announceScreen]);

  // Data transformations
  const enhancedPosts = useMemo(() => 
    posts.map(post => ({
      ...post,
      media_type: (post as any).media_type || 'audio',
      media_url: (post as any).media_url || null,
      thumbnail_url: (post as any).thumbnail_url || null,
      transcript_fr: (post as any).transcript_fr || (post as any).transcript || null,
      transcript_ba: (post as any).transcript_ba || null,
      feeling_emoji: (post as any).feeling_emoji || null,
      location_name: (post as any).location_name || null,
      culture_score: (post as any).culture_score || null,
    })), [posts]
  );

  const rankedPosts = useMemo(() => rankPosts(enhancedPosts), [rankPosts, enhancedPosts]);

  const handleReaction = useCallback((postId: string, reaction: string) => {
    addReaction(postId, reaction);
    triggerFeedback('success');
  }, [addReaction]);

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

  const handleTabChange = (tab: BottomTabId) => {
    triggerFeedback('notification', { haptic: true, sound: false });
    setActiveTab(tab);
  };

  const handleCreatePress = () => {
    triggerFeedback('click');
    setShowCreator(true);
  };

  // Filter posts based on feed mode
  const getFilteredPosts = useCallback(() => {
    if (feedMode === 'creation') {
      return rankedPosts.filter(p => 
        p.media_type === 'video' || p.media_type === 'photo' || p.template_id
      );
    } else if (feedMode === 'radio') {
      return rankedPosts.filter(p => 
        p.topic === 'culture' || p.topic === 'patrimoine' || p.culture_score
      );
    } else {
      return rankedPosts.filter(p => 
        p.media_type === 'audio' || !p.template_id
      );
    }
  }, [rankedPosts, feedMode]);

  const filteredPosts = getFilteredPosts();

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      {/* Side Menu Drawer */}
      <SideMenuDrawer 
        isOpen={isMenuOpen} 
        onClose={() => setIsMenuOpen(false)}
      />

      {/* Hamburger Menu Button - Always visible */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => {
          triggerFeedback('click');
          setIsMenuOpen(true);
        }}
        className="fixed top-safe left-4 z-40 w-10 h-10 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center"
        style={{ top: 'max(env(safe-area-inset-top, 12px), 12px)' }}
      >
        <Menu className="w-5 h-5 text-white" />
      </motion.button>

      {/* Notification Button */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        whileTap={{ scale: 0.9 }}
        className="fixed top-safe right-4 z-40 w-10 h-10 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center"
        style={{ top: 'max(env(safe-area-inset-top, 12px), 12px)' }}
      >
        <Bell className="w-5 h-5 text-white" />
        {unreadMessages > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unreadMessages}
          </span>
        )}
      </motion.button>

      {/* Main Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'feed' && (
          <motion.div
            key="feed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-full w-full"
          >
            {/* Transparent Feed Header */}
            <TransparentFeedHeader
              currentMode={feedMode}
              onModeChange={setFeedMode}
              onSearch={() => setShowSearch(true)}
            />

            {/* Feed Content */}
            {isLoading ? (
              <div className="h-full w-full flex items-center justify-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                  className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full"
                />
              </div>
            ) : feedMode === 'creation' ? (
              <TamTamVideoFeed
                videos={filteredPosts.map(p => ({
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
                  likes: p.likes_count || 0,
                  comments: p.comments_count || 0,
                  shares: 0,
                  isLiked: false,
                  isSaved: false,
                }))}
                onLike={(id) => handleReaction(id, 'like')}
                onComment={(id) => triggerFeedback('click')}
                onShare={handleShare}
                onSave={(id) => triggerFeedback('success')}
              />
            ) : (
              <TamTamAudioFeed
                posts={filteredPosts.map(p => ({
                  id: p.id,
                  audioUrl: p.audio_url || '',
                  duration: p.duration_seconds || 60,
                  templateId: p.template_id || (feedMode === 'radio' ? 'radio' : 'mavoix'),
                  category: (feedMode === 'radio' ? 'patrimoine' : 'village_voice') as any,
                  subcategory: p.topic || (feedMode === 'radio' ? 'culture' : 'annonce'),
                  emoji: p.feeling_emoji || (feedMode === 'radio' ? '📻' : '🎤'),
                  visualEmojis: feedMode === 'radio' 
                    ? ['🎵', '🥁', '🎶', '✨', '🌍'] 
                    : ['🎤', '💬', '👥', '📢', '🔊'],
                  gradient: feedMode === 'radio' 
                    ? 'from-amber-500 via-orange-500 to-red-500' 
                    : 'from-emerald-500 via-teal-500 to-cyan-500',
                  titleFr: p.transcript_fr?.slice(0, 50) || (feedMode === 'radio' ? 'Audio Patrimoine' : 'Message Vocal'),
                  titleBa: p.transcript_ba?.slice(0, 50) || '',
                  transcript: p.transcript_fr || undefined,
                  authorName: p.profile?.display_name || (feedMode === 'radio' ? 'TAM-TAM Radio' : 'Utilisateur'),
                  authorVillage: p.location_name || (feedMode === 'radio' ? 'Bénin' : 'Ma communauté'),
                  likes: p.likes_count || 0,
                  replies: p.comments_count || 0,
                  shares: 0,
                  isLiked: false,
                  isSaved: false,
                }))}
                onLike={(id) => handleReaction(id, 'like')}
                onReply={(id) => setShowCreator(true)}
                onShare={handleShare}
                onSave={(id) => triggerFeedback('success')}
              />
            )}
          </motion.div>
        )}

        {activeTab === 'chat' && (
          <motion.div
            key="chat"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="h-full w-full pt-safe bg-white"
          >
            <TamTamMessagesHub onClose={() => setActiveTab('feed')} />
          </motion.div>
        )}

        {activeTab === 'groups' && (
          <motion.div
            key="groups"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="h-full w-full pt-safe bg-white"
          >
            <TamTamCommunities />
          </motion.div>
        )}

        {activeTab === 'direct' && (
          <motion.div
            key="direct"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="h-full w-full pt-safe bg-white"
          >
            <TamTamLiveList />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Tab Bar */}
      <BottomTabBar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onCreatePress={handleCreatePress}
        unreadMessages={unreadMessages}
      />

      {/* Modals */}
      <TamTamUserSearch
        isOpen={showSearch}
        onClose={() => setShowSearch(false)}
        onMessage={(userId) => setActiveTab('chat')}
      />

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
        }}
      />

      <RaconteMoiAssistant 
        isOpen={isAssistantOpen} 
        onOpenChange={setIsAssistantOpen} 
      />
    </div>
  );
}
