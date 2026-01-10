import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { TamTamMicButton } from '@/components/tamtam/TamTamMicButton';
import { TamTamFollowersList } from '@/components/tamtam/TamTamFollowersList';
import { TamTamFriendsList } from '@/components/tamtam/TamTamFriendsList';
import { TamTamStories } from '@/components/tamtam/TamTamStories';
import { TamTamPrivateMessages } from '@/components/tamtam/TamTamPrivateMessages';
import { ProfilePhotoUploader } from '@/components/tamtam/ProfilePhotoUploader';
import { MyPostsGrid } from '@/components/tamtam/MyPostsGrid';
import { PostEditModal } from '@/components/tamtam/PostEditModal';
import { MyCommunities } from '@/components/tamtam/MyCommunities';
import { BroadcastModal } from '@/components/tamtam/BroadcastModal';
import { Volume2, Play, Loader2, LogOut, Mic, Clock, Eye, Heart, Send, Grid3X3, Users, Bookmark, MessageCircle } from 'lucide-react';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';
import { useAudioDescription } from '@/contexts/AudioDescriptionContext';
import { useBilingualAudio } from '@/hooks/useBilingualAudio';
import { useTamTamProfile } from '@/hooks/useTamTamProfile';
import { useTamTamFollows } from '@/hooks/useTamTamFollows';
import { useTamTamFriends } from '@/hooks/useTamTamFriends';
import { useTamTamPosts } from '@/hooks/useTamTamPosts';
import { useTamTamCommunities } from '@/hooks/useTamTamCommunities';
import { useMyPosts, MyPost } from '@/hooks/useMyPosts';
import { useAuth } from '@/contexts/AuthContext';
import { tamtamFeedback } from '@/utils/tamtamFeedback';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const badges = [
  { icon: '⭐', color: 'bg-yellow-100' },
  { icon: '🎯', color: 'bg-blue-100' },
  { icon: '🏆', color: 'bg-amber-100' },
  { icon: '💎', color: 'bg-purple-100' },
];

const settingsItems = [
  { icon: '🔔', id: 'notifications', labelKey: 'notifications' },
  { icon: '🌐', id: 'language', labelKey: 'language' },
  { icon: '❓', id: 'help', labelKey: 'help' },
];

export default function TamTamProfile() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { profile, loading: profileLoading, updateProfile } = useTamTamProfile();
  const { followersCount, followingCount, followers } = useTamTamFollows();
  const { friendsCount } = useTamTamFriends();
  const { stories } = useTamTamPosts();
  const { myGroups } = useTamTamCommunities();
  const { posts: myPosts, loading: postsLoading, toggleVisibility, deletePost, updatePost } = useMyPosts();
  
  const [isPlayingBio, setIsPlayingBio] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);
  const [showFriends, setShowFriends] = useState(false);
  const [showStories, setShowStories] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [messageTargetUserId, setMessageTargetUserId] = useState<string | undefined>(undefined);
  const [activeTab, setActiveTab] = useState('posts');
  const [postFilter, setPostFilter] = useState<'all' | 'public' | 'private'>('all');
  const [editingPost, setEditingPost] = useState<MyPost | null>(null);
  const [playingPostId, setPlayingPostId] = useState<string | null>(null);
  
  const { t, currentLang } = useTamTamLanguage();
  const { announceAction } = useAudioDescription();
  const { speakCurrentLang } = useBilingualAudio();
  const { toast } = useToast();

  // Filter stories for current user
  const myStories = stories.filter(s => s.user_id === user?.id);

  // Calculate vocal stats
  const vocalStats = {
    totalRecordings: myPosts.length + myStories.length,
    totalDuration: myPosts.reduce((acc, p) => acc + (p.duration_seconds || 0), 0) + 
                   myStories.reduce((acc, s) => acc + (s.duration_seconds || 0), 0),
    storyViews: myStories.reduce((acc, s) => acc + (s.views_count || 0), 0),
    totalLikes: myPosts.reduce((acc, p) => acc + p.likes_count, 0)
  };

  // Prepare followers for broadcast
  const followersForBroadcast = followers.map(f => ({
    id: f.id,
    user_id: f.follower_id,
    username: f.profile?.username,
    display_name: f.profile?.display_name,
    avatar_url: f.profile?.avatar_url,
  }));

  useEffect(() => {
    if (!user) {
      navigate('/tamtam/auth');
    }
  }, [user, navigate]);

  useEffect(() => {
    announceAction(t('screenProfile'));
  }, [announceAction, t]);

  const handlePhotoUploaded = async (url: string) => {
    await updateProfile({ avatar_url: url });
  };

  const handleOpenMessages = (userId?: string) => {
    setMessageTargetUserId(userId);
    setShowMessages(true);
  };

  const handleRecordBio = async (result: {
    audioBase64: string;
    transcription?: string;
    translation?: string;
    sourceLang: 'ba' | 'fr';
  }) => {
    setIsProcessing(true);
    tamtamFeedback.play('send');
    
    try {
      const base64Data = result.audioBase64.includes(',') 
        ? result.audioBase64.split(',')[1] 
        : result.audioBase64;
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'audio/webm' });
      
      const fileName = `bio_${user?.id}_${Date.now()}.webm`;
      
      const { error: uploadError } = await supabase.storage
        .from('tamtam-audio')
        .upload(fileName, blob, { contentType: 'audio/webm' });
      
      if (uploadError) throw uploadError;
      
      const { data: urlData } = supabase.storage
        .from('tamtam-audio')
        .getPublicUrl(fileName);
      
      await updateProfile({
        bio_audio_url: urlData.publicUrl,
        bio_transcript_fr: result.sourceLang === 'fr' ? result.transcription : result.translation,
        bio_transcript_ba: result.sourceLang === 'ba' ? result.transcription : result.translation
      });
      
      toast({
        title: "✅ Bio enregistrée",
        description: result.transcription || "Votre bio audio a été sauvegardée"
      });
      
      tamtamFeedback.play('success');
    } catch (err: any) {
      console.error('[TamTamProfile] Bio recording error:', err);
      toast({
        title: "Erreur",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePlayBio = async () => {
    if (!profile?.bio_audio_url) return;
    
    tamtamFeedback.play('click');
    setIsPlayingBio(true);
    
    try {
      const audio = new Audio(profile.bio_audio_url);
      audio.onended = () => setIsPlayingBio(false);
      audio.onerror = () => setIsPlayingBio(false);
      await audio.play();
    } catch (err) {
      console.error('[TamTamProfile] Play bio error:', err);
      setIsPlayingBio(false);
    }
  };

  const handlePlayPost = (post: MyPost) => {
    tamtamFeedback.play('click');
    setPlayingPostId(post.id);
    const audio = new Audio(post.audio_url);
    audio.onended = () => setPlayingPostId(null);
    audio.play();
  };

  const handleEditPost = (post: MyPost) => {
    setEditingPost(post);
  };

  const handleSavePost = async (postId: string, updates: Partial<Pick<MyPost, 'transcript_fr' | 'transcript_ba' | 'feeling_emoji' | 'is_public'>>) => {
    const success = await updatePost(postId, updates);
    if (success) {
      toast({ title: "✅ Publication modifiée" });
    }
    return success;
  };

  const handleDeletePost = async (postId: string) => {
    const success = await deletePost(postId);
    if (success) {
      toast({ title: "🗑️ Publication supprimée" });
    }
    return success;
  };

  const handleToggleVisibility = async (postId: string, isPublic: boolean) => {
    const success = await toggleVisibility(postId, isPublic);
    if (success) {
      toast({ 
        title: isPublic ? "🌍 Publication publique" : "🔒 Publication privée",
        description: isPublic 
          ? "Tout le monde peut voir cette publication"
          : "Seul vous pouvez voir cette publication"
      });
    }
  };

  const handleSettingPress = (labelKey: string) => {
    tamtamFeedback.play('click');
    speakCurrentLang(t(labelKey));
  };

  const handleLogout = async () => {
    tamtamFeedback.play('click');
    await signOut();
    navigate('/tamtam/auth');
  };

  const stats = [
    { icon: '📢', value: myPosts.length, labelKey: 'posts', onClick: () => setActiveTab('posts') },
    { icon: '👥', value: followersCount, labelKey: 'followers', onClick: () => setShowFollowers(true) },
    { icon: '👣', value: followingCount, labelKey: 'following', onClick: () => setShowFollowing(true) },
    { icon: '🤝', value: friendsCount, labelKey: 'friends', onClick: () => setShowFriends(true) },
  ];

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin text-4xl">⏳</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header section */}
      <div className="px-4 pt-8 pb-4">
        {/* Profile photo with upload */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="flex justify-center mb-4"
        >
          <ProfilePhotoUploader 
            currentAvatarUrl={profile?.avatar_url || null}
            onPhotoUploaded={handlePhotoUploaded}
          />
        </motion.div>

        {/* Name and username */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center mb-4"
        >
          <h1 className="text-xl font-bold">
            {profile?.display_name || profile?.username || t('profile')}
          </h1>
          {profile?.username && (
            <p className="text-sm text-muted-foreground">@{profile.username}</p>
          )}
          <span className="inline-flex items-center gap-1 mt-2 px-3 py-1 bg-secondary/10 rounded-full">
            <span className="text-sm">🌐</span>
            <span className="text-xs font-medium text-secondary-foreground">
              {currentLang === 'ba' ? 'Bàátɔ̀nú' : 'Français'}
            </span>
          </span>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-4 gap-2 mb-4"
        >
          {stats.map((stat) => (
            <button
              key={stat.labelKey}
              onClick={stat.onClick}
              className="bg-card rounded-2xl p-3 text-center active:scale-95 transition-transform border border-border"
            >
              <span className="text-lg">{stat.icon}</span>
              <div className="text-lg font-bold mt-1">{stat.value}</div>
              <div className="text-[10px] text-muted-foreground">{t(stat.labelKey)}</div>
            </button>
          ))}
        </motion.div>

        {/* Action buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="flex gap-2 mb-4"
        >
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowBroadcast(true)}
            className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" />
            Message aux abonnés
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => handleOpenMessages()}
            className="py-2.5 px-4 bg-muted rounded-xl"
          >
            <MessageCircle className="w-5 h-5" />
          </motion.button>
        </motion.div>

        {/* Voice bio section - compact */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card rounded-2xl p-4 border border-border mb-4"
        >
          <div className="flex items-center gap-3">
            <div className="flex-1">
              {profile?.bio_audio_url ? (
                <button
                  onClick={handlePlayBio}
                  disabled={isPlayingBio}
                  className="w-full h-12 bg-muted rounded-xl flex items-center justify-center px-4 gap-3"
                >
                  {isPlayingBio ? (
                    <div className="flex gap-0.5">
                      {[...Array(20)].map((_, i) => (
                        <motion.div
                          key={i}
                          animate={{ height: [4, 16, 4] }}
                          transition={{ duration: 0.4, repeat: Infinity, delay: i * 0.05 }}
                          className="w-0.5 bg-primary rounded-full"
                        />
                      ))}
                    </div>
                  ) : (
                    <>
                      <Play className="w-5 h-5 text-primary" fill="currentColor" />
                      <span className="text-sm font-medium">🎙️ Bio audio</span>
                    </>
                  )}
                </button>
              ) : (
                <div className="text-sm text-muted-foreground">
                  Enregistrez votre bio audio →
                </div>
              )}
            </div>
            <TamTamMicButton
              size="sm"
              onRecordingComplete={handleRecordBio}
              autoTranscribe={true}
              autoTranslate={true}
              sourceLang={currentLang}
              disabled={isProcessing}
            />
          </div>
          {profile?.bio_transcript_fr && (
            <p className="text-xs text-muted-foreground mt-2 italic line-clamp-2">
              "{currentLang === 'ba' ? profile.bio_transcript_ba : profile.bio_transcript_fr}"
            </p>
          )}
        </motion.div>
      </div>

      {/* Tabs section */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full grid grid-cols-3 bg-muted/50 rounded-none border-b border-border">
          <TabsTrigger 
            value="posts" 
            className="flex items-center gap-2 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
          >
            <Grid3X3 className="w-4 h-4" />
            <span className="hidden sm:inline">Publications</span>
          </TabsTrigger>
          <TabsTrigger 
            value="communities"
            className="flex items-center gap-2 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
          >
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Communautés</span>
          </TabsTrigger>
          <TabsTrigger 
            value="stats"
            className="flex items-center gap-2 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
          >
            <Mic className="w-4 h-4" />
            <span className="hidden sm:inline">Stats</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="mt-4">
          {postsLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin text-4xl">⏳</div>
            </div>
          ) : (
            <MyPostsGrid
              posts={myPosts}
              filter={postFilter}
              onFilterChange={setPostFilter}
              onEdit={handleEditPost}
              onDelete={handleDeletePost}
              onToggleVisibility={handleToggleVisibility}
              onPlay={handlePlayPost}
            />
          )}
        </TabsContent>

        <TabsContent value="communities" className="mt-4">
          <MyCommunities
            communities={myGroups}
            currentUserId={user?.id}
            onOpenChat={(id) => navigate(`/tamtam/social?community=${id}`)}
          />
        </TabsContent>

        <TabsContent value="stats" className="mt-4 px-4 space-y-4">
          {/* Vocal Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-primary to-primary/60 rounded-3xl p-4 text-primary-foreground"
          >
            <div className="flex items-center gap-2 mb-4">
              <Mic className="w-5 h-5" />
              <span className="text-sm font-medium">{t('vocalStats') || 'Statistiques Vocales'}</span>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/20 rounded-2xl p-3 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Mic className="w-4 h-4" />
                  <span className="text-2xl font-bold">{vocalStats.totalRecordings}</span>
                </div>
                <span className="text-xs opacity-80">Enregistrements</span>
              </div>
              
              <div className="bg-white/20 rounded-2xl p-3 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Clock className="w-4 h-4" />
                  <span className="text-2xl font-bold">
                    {Math.floor(vocalStats.totalDuration / 60)}m
                  </span>
                </div>
                <span className="text-xs opacity-80">Durée totale</span>
              </div>
              
              <div className="bg-white/20 rounded-2xl p-3 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Eye className="w-4 h-4" />
                  <span className="text-2xl font-bold">{vocalStats.storyViews}</span>
                </div>
                <span className="text-xs opacity-80">Vues stories</span>
              </div>
              
              <div className="bg-white/20 rounded-2xl p-3 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Heart className="w-4 h-4" />
                  <span className="text-2xl font-bold">{vocalStats.totalLikes}</span>
                </div>
                <span className="text-xs opacity-80">J'aime reçus</span>
              </div>
            </div>
          </motion.div>

          {/* Badges */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card rounded-2xl p-4 border border-border"
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">🏅</span>
              <span className="text-sm font-medium">{t('badges')}</span>
            </div>
            <div className="flex justify-center gap-4">
              {badges.map((badge, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 + index * 0.1 }}
                  className={`w-14 h-14 ${badge.color} rounded-2xl flex items-center justify-center`}
                >
                  <span className="text-2xl">{badge.icon}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* My Stories */}
          {myStories.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-card rounded-2xl p-4 border border-border"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📖</span>
                  <span className="text-sm font-medium">Mes Stories</span>
                </div>
                <span className="text-xs text-muted-foreground">{myStories.length}</span>
              </div>
              <TamTamStories 
                stories={myStories} 
                onCreateStory={() => navigate('/tamtam/social')} 
              />
            </motion.div>
          )}

          {/* Settings */}
          <div className="space-y-3">
            {settingsItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleSettingPress(item.labelKey)}
                className="w-full bg-card rounded-2xl p-4 border border-border flex items-center gap-4 active:scale-[0.98] transition-transform"
              >
                <span className="text-2xl">{item.icon}</span>
                <span className="flex-1 text-left font-medium">
                  {t(item.labelKey)}
                </span>
                <Volume2 className="w-5 h-5 text-muted-foreground" />
                <span className="text-xl text-muted-foreground">→</span>
              </button>
            ))}

            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="w-full bg-destructive/10 rounded-2xl p-4 flex items-center gap-4 active:scale-[0.98] transition-transform"
            >
              <LogOut className="w-6 h-6 text-destructive" />
              <span className="flex-1 text-left font-medium text-destructive">
                {t('logout')}
              </span>
            </button>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <TamTamFollowersList
        userId={user?.id || ''}
        type="followers"
        isOpen={showFollowers}
        onClose={() => setShowFollowers(false)}
        onMessage={handleOpenMessages}
      />
      
      <TamTamFollowersList
        userId={user?.id || ''}
        type="following"
        isOpen={showFollowing}
        onClose={() => setShowFollowing(false)}
        onMessage={handleOpenMessages}
      />
      
      <TamTamFriendsList
        isOpen={showFriends}
        onClose={() => setShowFriends(false)}
        onMessage={handleOpenMessages}
      />
      
      <TamTamPrivateMessages
        isOpen={showMessages}
        onClose={() => {
          setShowMessages(false);
          setMessageTargetUserId(undefined);
        }}
      />

      <PostEditModal
        post={editingPost}
        isOpen={!!editingPost}
        onClose={() => setEditingPost(null)}
        onSave={handleSavePost}
        onDelete={handleDeletePost}
      />

      <BroadcastModal
        isOpen={showBroadcast}
        onClose={() => setShowBroadcast(false)}
        followers={followersForBroadcast}
      />
    </div>
  );
}
