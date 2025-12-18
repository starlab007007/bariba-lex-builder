import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Radio, Newspaper, Plus, BarChart3, Search, Users } from 'lucide-react';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';
import { useAudioDescription } from '@/contexts/AudioDescriptionContext';
import { useTamTamPosts, TamTamComment } from '@/hooks/useTamTamPosts';
import { TamTamEnhancedFeedCard, EnhancedPost } from '@/components/tamtam/TamTamEnhancedFeedCard';
import { TamTamStories } from '@/components/tamtam/TamTamStories';
import { TamTamCommentsModal } from '@/components/tamtam/TamTamCommentsModal';
import { TamTamCreatePost } from '@/components/tamtam/TamTamCreatePost';
import { TamTamVocalPoll } from '@/components/tamtam/TamTamVocalPoll';
import { TamTamMicButton } from '@/components/tamtam/TamTamMicButton';
import { TamTamStoryCreator } from '@/components/tamtam/TamTamStoryCreator';
import { TamTamUserSearch } from '@/components/tamtam/TamTamUserSearch';
import { TamTamFriendSuggestions } from '@/components/tamtam/TamTamFriendSuggestions';
import { TamTamCommunities } from '@/components/tamtam/TamTamCommunities';
import { TamTamLiveList } from '@/components/tamtam/TamTamLiveList';
import { TamTamMessagesHub } from '@/components/tamtam/TamTamMessagesHub';
import { triggerFeedback } from '@/utils/tamtamFeedback';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const tabs = [
  { id: 'feed', icon: Newspaper, label: 'feed' },
  { id: 'messages', icon: MessageCircle, label: 'messages' },
  { id: 'communities', icon: Users, label: 'Communautés' },
  { id: 'live', icon: Radio, label: 'live' },
];

export default function TamTamSocial() {
  const { t } = useTamTamLanguage();
  const { announceScreen } = useAudioDescription();
  const { toast } = useToast();
  const { 
    posts, 
    stories, 
    isLoading, 
    createPost, 
    addReaction, 
    fetchComments, 
    addComment,
    createStory,
    fetchPosts
  } = useTamTamPosts();

  const [activeTab, setActiveTab] = useState('feed');
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showCreatePoll, setShowCreatePoll] = useState(false);
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [showStoryCreator, setShowStoryCreator] = useState(false);
  const [showMessagesHub, setShowMessagesHub] = useState(false);
  const [showUserSearch, setShowUserSearch] = useState(false);
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

  const handleCreatePoll = async (pollData: { question_audio_url: string; options: { audio_url: string }[] }) => {
    // For now, create as a special post with poll data
    await createPost({
      audio_url: pollData.question_audio_url,
      media_type: 'poll',
    });
    setShowCreatePoll(false);
  };

  const base64ToBlob = (base64: string, mimeType: string): Blob => {
    const byteCharacters = atob(base64.split(',')[1] || base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    return new Blob([new Uint8Array(byteNumbers)], { type: mimeType });
  };

  // Convert posts to enhanced format
  const enhancedPosts: EnhancedPost[] = posts.map(post => ({
    ...post,
    media_type: (post as any).media_type || 'audio',
    media_url: (post as any).media_url || null,
    thumbnail_url: (post as any).thumbnail_url || null,
    transcript_fr: (post as any).transcript_fr || (post as any).transcript || null,
    transcript_ba: (post as any).transcript_ba || null,
    feeling_emoji: (post as any).feeling_emoji || null,
  }));

  return (
    <div className="min-h-screen bg-[#FAFAFA] pb-24">
      {/* Tab Bar */}
      <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="flex justify-between items-center p-3">
          <div className="flex justify-center gap-2 flex-1">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <motion.button
                  key={tab.id}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all ${
                    isActive 
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg' 
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="hidden sm:inline">{t(tab.label)}</span>
                </motion.button>
              );
            })}
          </div>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowUserSearch(true)}
            className="p-2.5 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
          >
            <Search className="w-5 h-5 text-gray-600" />
          </motion.button>
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
            {/* Stories */}
            <div className="bg-white border-b border-gray-100">
              <TamTamStories 
                stories={stories} 
                onCreateStory={() => setShowCreatePost(true)}
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

            {/* Feed */}
            <div className="p-4 space-y-4">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                    className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full"
                  />
                  <p className="mt-4 text-gray-400">{t('loading')}</p>
                </div>
              ) : enhancedPosts.length === 0 ? (
                <div className="text-center py-12">
                  <Newspaper className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">{t('noData')}</p>
                  <p className="text-sm text-gray-400 mt-1">Soyez le premier à publier !</p>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowCreatePost(true)}
                    className="mt-4 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-medium"
                  >
                    Créer ma première publication
                  </motion.button>
                </div>
              ) : (
                enhancedPosts.map(post => (
                  <TamTamEnhancedFeedCard
                    key={post.id}
                    post={post}
                    onReaction={handleReaction}
                    onComment={handleOpenComments}
                    onShare={handleShare}
                  />
                ))
              )}
            </div>
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

      {/* Floating Create Button with Menu */}
      <div className="fixed bottom-24 right-4 z-30">
        <AnimatePresence>
          {showCreateMenu && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              className="absolute bottom-20 right-0 bg-white rounded-2xl shadow-xl p-2 space-y-1"
            >
              <button
                onClick={() => {
                  setShowCreatePost(true);
                  setShowCreateMenu(false);
                }}
                className="flex items-center gap-3 w-full px-4 py-3 hover:bg-gray-50 rounded-xl"
              >
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Plus className="w-5 h-5 text-blue-600" />
                </div>
                <span className="font-medium text-gray-700">Publication</span>
              </button>
              
              <button
                onClick={() => {
                  setShowCreatePoll(true);
                  setShowCreateMenu(false);
                }}
                className="flex items-center gap-3 w-full px-4 py-3 hover:bg-gray-50 rounded-xl"
              >
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-orange-600" />
                </div>
                <span className="font-medium text-gray-700">Sondage Vocal</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        
        <TamTamMicButton 
          onPress={() => setShowCreateMenu(!showCreateMenu)}
        />
      </div>

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
      />

      <TamTamVocalPoll
        isOpen={showCreatePoll}
        onClose={() => setShowCreatePoll(false)}
        onSubmit={handleCreatePoll}
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
    </div>
  );
}
