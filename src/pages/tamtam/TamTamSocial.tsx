import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Radio, Newspaper, Search, Users, Plus } from 'lucide-react';
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

const tabs: { id: string; icon: typeof Newspaper; label: keyof VoiceMenuLabels }[] = [
  { id: 'feed', icon: Newspaper, label: 'feed' },
  { id: 'messages', icon: MessageCircle, label: 'messages' },
  { id: 'communities', icon: Users, label: 'communities' },
  { id: 'live', icon: Radio, label: 'live' },
];

// Combined feed item type
type FeedItem = 
  | { type: 'post'; data: EnhancedPost; createdAt: Date }
  | { type: 'poll'; data: ReturnType<typeof useTamTamPolls>['polls'][0]; createdAt: Date };

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
  
  // Radio feed hook
  const radioFeed = useRadioFeed({ autoAdvance: true });
  const { rankPosts, recordInteraction } = useFeedAlgorithm({ prioritizeUtility: true, prioritizeCulture: true });

  const [activeTab, setActiveTab] = useState('feed');
  const [feedMode, setFeedMode] = useState<FeedMode>('creation');
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showCreatePoll, setShowCreatePoll] = useState(false);
  const [showStoryCreator, setShowStoryCreator] = useState(false);
  const [showMessagesHub, setShowMessagesHub] = useState(false);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [showGuidedCreator, setShowGuidedCreator] = useState(false);
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

  // Announce tab changes
  useEffect(() => {
    if (activeTab === 'messages') {
      announceScreen('messages');
    } else if (activeTab === 'live') {
      announceScreen('live');
    }
  }, [activeTab, announceScreen]);

  const handleTabChange = (tabId: string) => {
    triggerFeedback('notification', { haptic: true, sound: false });
    setActiveTab(tabId);
  };

  const handleOpenComments = async (postId: string) => {
    setCommentsModal({ isOpen: true, postId, comments: [], isLoading: true });
    const comments = await fetchComments(postId);
    setCommentsModal(prev => ({ ...prev, comments, isLoading: false }));
  };

  const handleAddComment = async (audioBase64: string, duration: number) => {
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
  };

  const handleShare = (postId: string) => {
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
  };

  const handleReaction = (postId: string, reaction: string) => {
    addReaction(postId, reaction);
  };

  const base64ToBlob = (base64: string, mimeType: string): Blob => {
    const byteCharacters = atob(base64.split(',')[1] || base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    return new Blob([new Uint8Array(byteNumbers)], { type: mimeType });
  };

  // Convert posts to enhanced format and combine with polls
  const enhancedPosts: EnhancedPost[] = posts.map(post => ({
    ...post,
    media_type: (post as any).media_type || 'audio',
    media_url: (post as any).media_url || null,
    thumbnail_url: (post as any).thumbnail_url || null,
    transcript_fr: (post as any).transcript_fr || (post as any).transcript || null,
    transcript_ba: (post as any).transcript_ba || null,
    feeling_emoji: (post as any).feeling_emoji || null,
  }));

  // Apply smart ranking algorithm
  const rankedPosts = rankPosts(enhancedPosts);

  // Combine posts and polls into a unified feed
  const feedItems: FeedItem[] = [
    ...rankedPosts.map(post => ({
      type: 'post' as const,
      data: post,
      createdAt: new Date(post.created_at)
    })),
    ...polls.map(poll => ({
      type: 'poll' as const,
      data: poll,
      createdAt: new Date(poll.created_at)
    }))
  ];

  // Update radio queue when posts change
  useEffect(() => {
    if (feedMode === 'radio' && rankedPosts.length > 0) {
      radioFeed.setQueue(rankedPosts);
    }
  }, [feedMode, rankedPosts.length]);

  // Handle post actions from RadioVisualFeedCard
  const handlePostAction = (action: PostActionType, postId: string) => {
    recordInteraction(postId, action === 'understood' ? 'understood' : action === 'question' ? 'question' : 'view');
    if (action === 'like') {
      addReaction(postId, 'like');
    }
  };

  const handlePostRespond = (type: 'imitate' | 'voice_reply', postId: string) => {
    recordInteraction(postId, 'imitate');
    setShowGuidedCreator(true);
  };

  const isLoading = postsLoading || pollsLoading;

  return (
    <div className="min-h-screen pb-28" style={{ background: 'linear-gradient(180deg, #F7F9FC 0%, #EEF3FF 50%, #F4F0FF 100%)' }}>
      {/* Top Bar Glass - Light Glass iOS 26.3 */}
      <div 
        className="sticky top-0 z-20"
        style={{ 
          background: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(40px) saturate(200%)',
          WebkitBackdropFilter: 'blur(40px) saturate(200%)',
          borderBottom: '1px solid rgba(230, 235, 245, 0.8)'
        }}
      >
        <div className="flex justify-between items-center p-3 safe-area-top">
          {/* Tabs Pills - Light Glass */}
          <div 
            className="inline-flex rounded-full p-1"
            style={{ 
              background: 'rgba(77, 163, 255, 0.08)',
              border: '1px solid rgba(77, 163, 255, 0.15)'
            }}
          >
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <motion.button
                  key={tab.id}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleTabChange(tab.id)}
                  className="px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-2"
                  style={isActive ? {
                    background: 'linear-gradient(135deg, #4DA3FF 0%, #5DEBFF 100%)',
                    color: 'white',
                    boxShadow: '0 4px 16px rgba(77, 163, 255, 0.3)'
                  } : {
                    color: '#6b7280'
                  }}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{getLabel(tab.label)}</span>
                </motion.button>
              );
            })}
          </div>
          
          {/* Live Badge + Search - Light Glass */}
          <div className="flex items-center gap-2">
            <motion.button
              whileTap={{ scale: 0.95 }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold"
              style={{
                background: 'linear-gradient(135deg, rgba(255, 111, 174, 0.15) 0%, rgba(139, 124, 255, 0.15) 100%)',
                border: '1px solid rgba(255, 111, 174, 0.25)',
                color: '#FF6FAE'
              }}
            >
              <span className="w-2 h-2 rounded-full bg-[#FF6FAE] animate-pulse" />
              LIVE
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowUserSearch(true)}
              className="p-2.5 rounded-full"
              style={{
                background: 'rgba(77, 163, 255, 0.1)',
                border: '1px solid rgba(77, 163, 255, 0.2)'
              }}
            >
              <Search className="w-5 h-5 text-[#4DA3FF]" />
            </motion.button>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'feed' && (
          <motion.div
            key="feed"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            {/* Feed Mode Selector */}
            <div className="p-3 border-b flex justify-center" style={{ background: 'rgba(255, 255, 255, 0.6)', borderColor: 'rgba(230, 235, 245, 0.8)' }}>
              <FeedModeSelector currentMode={feedMode} onModeChange={setFeedMode} />
            </div>

            {/* Stories */}
            <div className="border-b" style={{ background: 'rgba(255, 255, 255, 0.7)', borderColor: 'rgba(230, 235, 245, 0.8)' }}>
              <TamTamStories 
                stories={stories} 
                onCreateStory={() => setShowStoryCreator(true)}
                onCreatePost={() => setShowCreatePost(true)}
              />
            </div>

            {/* Friend Suggestions */}
            <TamTamFriendSuggestions 
              onMessage={(userId) => {
                setShowMessagesHub(true);
              }}
              onViewProfile={(userId) => {
                // Navigate to profile or open profile modal
              }}
            />

            {/* Gradient FAB - Light Glass Style */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              whileHover={{ scale: 1.08 }}
              onClick={() => setShowGuidedCreator(true)}
              className="fixed bottom-24 right-4 z-30 w-16 h-16 rounded-full flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #4DA3FF 0%, #5DEBFF 50%, #8B7CFF 100%)',
                boxShadow: '0 8px 32px rgba(77, 163, 255, 0.4), 0 0 0 4px rgba(77, 163, 255, 0.15)'
              }}
            >
              <Plus className="w-7 h-7 text-white" strokeWidth={2.5} />
            </motion.button>

            {/* Feed - Mode-specific rendering */}
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                  className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full"
                />
                <p className="mt-4 text-muted-foreground">{t('loading')}</p>
              </div>
            ) : feedMode === 'creation' ? (
              // TikTok-style video feed for Creation mode
              <TamTamVideoFeed
                posts={rankedPosts
                  .filter(p => p.media_type === 'video' || p.media_type === 'photo' || p.template_id)
                  .map(p => ({
                    ...p,
                    media_url: p.media_url || p.audio_url,
                    user: p.profile ? {
                      display_name: p.profile.display_name || undefined,
                      avatar_url: p.profile.avatar_url || undefined,
                      username: p.profile.username || undefined
                    } : undefined
                  }))}
                onLike={(id) => addReaction(id, 'like')}
                onComment={handleOpenComments}
                onShare={handleShare}
                onRemix={(id) => setShowGuidedCreator(true)}
                onSave={(id) => triggerFeedback('success')}
                onRespond={(id) => setShowGuidedCreator(true)}
              />
            ) : feedMode === 'radio' ? (
              // Vinyl audio feed for Radio mode
              <TamTamAudioFeed
                posts={rankedPosts
                  .filter(p => p.topic === 'culture' || p.topic === 'patrimoine' || p.culture_score)
                  .map(p => ({
                    ...p,
                    user: p.profile ? {
                      display_name: p.profile.display_name || undefined,
                      avatar_url: p.profile.avatar_url || undefined,
                      location: p.location_name || undefined
                    } : undefined
                  }))}
                mode="radio"
                onLike={(id) => addReaction(id, 'like')}
                onRespond={(id) => setShowGuidedCreator(true)}
                onShare={handleShare}
                onSave={(id) => triggerFeedback('success')}
              />
            ) : (
              // Vinyl audio feed for Ma Voix mode
              <TamTamAudioFeed
                posts={rankedPosts
                  .filter(p => p.media_type === 'audio' || p.location_name || !p.template_id)
                  .map(p => ({
                    ...p,
                    user: p.profile ? {
                      display_name: p.profile.display_name || undefined,
                      avatar_url: p.profile.avatar_url || undefined,
                      location: p.location_name || undefined
                    } : undefined
                  }))}
                mode="mavoix"
                onLike={(id) => addReaction(id, 'like')}
                onRespond={(id) => setShowGuidedCreator(true)}
                onShare={handleShare}
                onSave={(id) => triggerFeedback('success')}
              />
            )}
          </motion.div>
        )}

        {activeTab === 'messages' && (
          <motion.div
            key="messages"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
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
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="h-[calc(100vh-180px)]"
          >
            <TamTamCommunities />
          </motion.div>
        )}

        {activeTab === 'live' && (
          <motion.div
            key="live"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
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
        onMessage={(userId) => {
          setShowMessagesHub(true);
        }}
      />

      {/* Fullscreen Creator - Direct template selection */}
      <FullscreenCreator
        isOpen={showGuidedCreator}
        onClose={() => setShowGuidedCreator(false)}
        onComplete={async (data) => {
          // Create post with data from FullscreenCreator
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
          fetchPosts(); // Refresh feed
        }}
      />

    </div>
  );
}
