import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Volume2, Loader2, LogOut, Mic, Clock, Eye, Heart, 
  Grid3X3, Users, Camera, X, Check 
} from 'lucide-react';

// Kuaishou-style components
import { KuaishouProfileHeader } from '@/components/tamtam/KuaishouProfileHeader';
import { KuaishouStatsGrid } from '@/components/tamtam/KuaishouStatsGrid';
import { KuaishouActionButtons } from '@/components/tamtam/KuaishouActionButtons';
import { KuaishouBioPlayer } from '@/components/tamtam/KuaishouBioPlayer';
import { KuaishouProfileTabs } from '@/components/tamtam/KuaishouProfileTabs';
import { KuaishouPostFilters } from '@/components/tamtam/KuaishouPostFilters';

// Existing components
import { TamTamFollowersList } from '@/components/tamtam/TamTamFollowersList';
import { TamTamFriendsList } from '@/components/tamtam/TamTamFriendsList';
import { TamTamStories } from '@/components/tamtam/TamTamStories';
import { TamTamPrivateMessages } from '@/components/tamtam/TamTamPrivateMessages';
import { MyPostsGrid } from '@/components/tamtam/MyPostsGrid';
import { PostEditModal } from '@/components/tamtam/PostEditModal';
import { MyCommunities } from '@/components/tamtam/MyCommunities';
import { BroadcastModal } from '@/components/tamtam/BroadcastModal';
import { ProfileEditModal } from '@/components/tamtam/ProfileEditModal';
import { MyPostViewerOverlay } from '@/components/tamtam/MyPostViewerOverlay';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

// Hooks & contexts
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
import { ContributorBadgeCard } from '@/components/fitila/ContributorBadgeCard';

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
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, loading: authLoading, signOut } = useAuth();
  const { profile, loading: profileLoading, updateProfile } = useTamTamProfile();
  const { followersCount, followingCount, followers } = useTamTamFollows();
  const { friendsCount } = useTamTamFriends();
  const { stories } = useTamTamPosts();
  const { myGroups } = useTamTamCommunities();
  const { posts: myPosts, loading: postsLoading, toggleVisibility, deletePost, updatePost } = useMyPosts();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);
  const [showFriends, setShowFriends] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [messageTargetUserId, setMessageTargetUserId] = useState<string | undefined>(undefined);
  const [activeTab, setActiveTab] = useState('posts');
  const [postFilter, setPostFilter] = useState<'all' | 'public' | 'private'>('all');
  const [editingPost, setEditingPost] = useState<MyPost | null>(null);
  const [playingPostId, setPlayingPostId] = useState<string | null>(null);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  
  // Avatar upload state
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { t, currentLang, setLanguage } = useTamTamLanguage();
  const { announceAction } = useAudioDescription();
  const { speakCurrentLang } = useBilingualAudio();
  const { toast } = useToast();

  // Memoized derived data — avoid recomputation on every render
  const myStories = useMemo(
    () => stories.filter((s) => s.user_id === user?.id),
    [stories, user?.id]
  );

  const vocalStats = useMemo(() => ({
    totalRecordings: myPosts.length + myStories.length,
    totalDuration:
      myPosts.reduce((acc, p) => acc + (p.duration_seconds || 0), 0) +
      myStories.reduce((acc, s) => acc + (s.duration_seconds || 0), 0),
    storyViews: myStories.reduce((acc, s) => acc + (s.views_count || 0), 0),
    totalLikes: myPosts.reduce((acc, p) => acc + p.likes_count, 0),
  }), [myPosts, myStories]);

  const followersForBroadcast = useMemo(
    () => followers.map((f) => ({
      id: f.id,
      user_id: f.follower_id,
      username: f.profile?.username,
      display_name: f.profile?.display_name,
      avatar_url: f.profile?.avatar_url,
    })),
    [followers]
  );

  const totalLikesAll = useMemo(
    () => myPosts.reduce((acc, p) => acc + p.likes_count, 0),
    [myPosts]
  );
  const publicCount = useMemo(() => myPosts.filter((p) => p.is_public).length, [myPosts]);
  const privateCount = myPosts.length - publicCount;

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/fitila/auth', { replace: true });
    }
  }, [authLoading, user, navigate]);

  // Lock body scroll while any full-screen modal is open
  useEffect(() => {
    const anyOpen = !!avatarPreview || showEditProfile || viewerOpen || showLogoutConfirm;
    if (anyOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [avatarPreview, showEditProfile, viewerOpen, showLogoutConfirm]);

  useEffect(() => {
    announceAction(t('screenProfile'));
  }, [announceAction, t]);

  // Auto-open settings modal from query param
  useEffect(() => {
    if (searchParams.get('settings') === '1') {
      setShowEditProfile(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Avatar upload handlers
  const handleAvatarClick = () => {
    fileInputRef.current?.click();
    tamtamFeedback.play('click');
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: "Format invalide", description: "Veuillez sélectionner une image", variant: "destructive" });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Fichier trop volumineux", description: "La taille maximale est de 5MB", variant: "destructive" });
      return;
    }

    tamtamFeedback.play('click');
    setSelectedAvatarFile(file);
    const reader = new FileReader();
    reader.onload = (event) => setAvatarPreview(event.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleAvatarUpload = async () => {
    if (!selectedAvatarFile || !user) return;

    setIsUploadingAvatar(true);
    tamtamFeedback.play('send');

    try {
      const compressedFile = await compressImage(selectedAvatarFile);
      const fileName = `avatars/${user.id}_${Date.now()}.webp`;
      
      const { error: uploadError } = await supabase.storage
        .from('tamtam-audio')
        .upload(fileName, compressedFile, { contentType: 'image/webp', upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('tamtam-audio')
        .getPublicUrl(fileName);

      await updateProfile({ avatar_url: urlData.publicUrl });
      
      toast({ title: "✅ Photo mise à jour", description: "Votre photo de profil a été modifiée" });
      tamtamFeedback.play('success');
      cancelAvatarUpload();
    } catch (err: any) {
      console.error('[TamTamProfile] Avatar upload error:', err);
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const cancelAvatarUpload = () => {
    setAvatarPreview(null);
    setSelectedAvatarFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
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
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePlayPost = (post: MyPost) => {
    tamtamFeedback.play('click');
    // Open the viewer overlay instead of raw Audio
    const idx = myPosts.findIndex(p => p.id === post.id);
    if (idx >= 0) {
      setViewerIndex(idx);
      setViewerOpen(true);
    }
  };

  const handleEditPost = (post: MyPost) => {
    setEditingPost(post);
  };

  const handleSavePost = async (postId: string, updates: Partial<Pick<MyPost, 'transcript_fr' | 'transcript_ba' | 'feeling_emoji' | 'is_public'>>) => {
    const success = await updatePost(postId, updates);
    if (success) toast({ title: "✅ Publication modifiée" });
    return success;
  };

  const handleDeletePost = async (postId: string) => {
    const success = await deletePost(postId);
    if (success) toast({ title: "🗑️ Publication supprimée" });
    return success;
  };

  const handleToggleVisibility = async (postId: string, isPublic: boolean) => {
    const success = await toggleVisibility(postId, isPublic);
    if (success) {
      toast({ 
        title: isPublic ? "🌍 Publication publique" : "🔒 Publication privée",
        description: isPublic ? "Tout le monde peut voir cette publication" : "Seul vous pouvez voir cette publication"
      });
    }
  };

  const handleSettingPress = (id: string, labelKey: string) => {
    tamtamFeedback.play('click');
    speakCurrentLang(t(labelKey));
    if (id === 'notifications') {
      setShowEditProfile(true);
    } else if (id === 'language') {
      const next = currentLang === 'ba' ? 'fr' : 'ba';
      try { setLanguage(next); } catch {}
      toast({ title: next === 'ba' ? 'Bààtɔ̀nú' : 'Français' });
    } else if (id === 'help') {
      navigate('/fitila/learn');
    }
  };

  const handleLogout = async () => {
    tamtamFeedback.play('click');
    setShowLogoutConfirm(false);
    await signOut();
    navigate('/fitila/auth', { replace: true });
  };

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-[hsl(var(--kuaishou-bg))] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[hsl(var(--kuaishou-primary))] animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="font-bold text-lg">Profil indisponible</p>
        <p className="text-sm text-muted-foreground max-w-sm">
          Votre profil n'a pas pu être chargé. Réessayez ou reconnectez-vous.
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold"
          >
            Réessayer
          </button>
          <button
            onClick={async () => { await signOut(); navigate('/fitila/auth', { replace: true }); }}
            className="px-4 py-2 rounded-xl border font-bold"
          >
            Se reconnecter
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="h-[100dvh] flex flex-col"
      style={{ background: 'linear-gradient(180deg, hsl(207 60% 97%) 0%, hsl(0 0% 100%) 50%)' }}
    >
    <div className="flex-1 overflow-y-auto pb-24 scroll-smooth overscroll-contain">
      {/* Hidden file input for avatar */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Avatar Preview Modal */}
      <AnimatePresence>
        {avatarPreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-6 max-w-sm w-full text-center"
            >
              <Avatar className="w-40 h-40 mx-auto mb-4 border-4 border-[hsl(var(--kuaishou-primary)/0.3)]">
                <AvatarImage src={avatarPreview} />
                <AvatarFallback>?</AvatarFallback>
              </Avatar>
              <p className="text-sm text-muted-foreground mb-4">{t('profile_confirm_photo')}</p>
              <div className="flex gap-3 justify-center">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={cancelAvatarUpload}
                  disabled={isUploadingAvatar}
                  className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center"
                >
                  <X className="w-6 h-6 text-red-600" />
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleAvatarUpload}
                  disabled={isUploadingAvatar}
                  className="w-14 h-14 bg-green-500 rounded-full flex items-center justify-center"
                >
                  {isUploadingAvatar ? (
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  ) : (
                    <Check className="w-6 h-6 text-white" />
                  )}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Profile Header */}
      <KuaishouProfileHeader
        displayName={profile?.display_name || ''}
        username={profile?.username || ''}
        avatarUrl={profile?.avatar_url || null}
        isOwnProfile={true}
        isUploading={isUploadingAvatar}
        onAvatarClick={handleAvatarClick}
        followersCount={profile?.followers_count ?? followersCount}
        followingCount={profile?.following_count ?? followingCount}
        likesCount={totalLikesAll}
        onFollowersClick={() => setShowFollowers(true)}
        onFollowingClick={() => setShowFollowing(true)}
        onLikesClick={() => setActiveTab('stats')}
      />

      {/* Stats Grid */}
      <KuaishouStatsGrid
        postsCount={myPosts.length}
        followersCount={profile?.followers_count ?? followersCount}
        followingCount={profile?.following_count ?? followingCount}
        friendsCount={friendsCount}
        onPostsClick={() => setActiveTab('posts')}
        onFollowersClick={() => setShowFollowers(true)}
        onFollowingClick={() => setShowFollowing(true)}
        onFriendsClick={() => setShowFriends(true)}
      />

      {/* Action Buttons */}
      <KuaishouActionButtons
        isOwnProfile={true}
        onBroadcast={() => setShowBroadcast(true)}
        onOpenMessages={() => handleOpenMessages()}
        onEditProfile={() => setShowEditProfile(true)}
      />

      {/* Bio Audio Player */}
      <KuaishouBioPlayer
        bioAudioUrl={profile?.bio_audio_url || null}
        bioTranscript={currentLang === 'ba' ? profile?.bio_transcript_ba : profile?.bio_transcript_fr}
        isOwnProfile={true}
        isProcessing={isProcessing}
        onRecordBio={handleRecordBio}
        sourceLang={currentLang}
      />

      {/* Tabs */}
      <KuaishouProfileTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        postsCount={myPosts.length}
      />

      {/* Tab Content */}
      <div className="bg-white min-h-[300px]">
        {activeTab === 'posts' && (
          <>
            <KuaishouPostFilters
              filter={postFilter}
              onFilterChange={setPostFilter}
              totalCount={myPosts.length}
              publicCount={publicCount}
              privateCount={privateCount}
            />
            {postsLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 text-[hsl(var(--kuaishou-primary))] animate-spin" />
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
                onViewPost={(index) => {
                  setViewerIndex(index);
                  setViewerOpen(true);
                }}
              />
            )}
          </>
        )}

        {activeTab === 'communities' && (
          <div className="pt-4">
            <MyCommunities
              communities={myGroups}
              currentUserId={user?.id}
              onOpenChat={(id) => navigate(`/fitila/social?community=${id}`)}
            />
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="p-4 space-y-4">
            {/* Vocal Stats Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-br from-[hsl(var(--kuaishou-primary))] to-[hsl(var(--kuaishou-primary-dark))] rounded-3xl p-5 text-white"
            >
              <div className="flex items-center gap-2 mb-4">
                <Mic className="w-5 h-5" />
                <span className="text-sm font-medium">{t('vocalStats') || 'Statistiques Vocales'}</span>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-3 text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Mic className="w-4 h-4" />
                    <span className="text-2xl font-bold">{vocalStats.totalRecordings}</span>
                  </div>
                  <span className="text-xs opacity-80">{t('profile_stats_recordings')}</span>
                </div>
                
                <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-3 text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Clock className="w-4 h-4" />
                    <span className="text-2xl font-bold">{Math.floor(vocalStats.totalDuration / 60)}m</span>
                  </div>
                  <span className="text-xs opacity-80">{t('profile_stats_duration')}</span>
                </div>
                
                <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-3 text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Eye className="w-4 h-4" />
                    <span className="text-2xl font-bold">{vocalStats.storyViews}</span>
                  </div>
                  <span className="text-xs opacity-80">{t('profile_stats_views')}</span>
                </div>
                
                <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-3 text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Heart className="w-4 h-4" />
                    <span className="text-2xl font-bold">{vocalStats.totalLikes}</span>
                  </div>
                  <span className="text-xs opacity-80">{t('profile_stats_likes')}</span>
                </div>
              </div>
            </motion.div>

            {/* Contributor Badge */}
            <ContributorBadgeCard lang={currentLang === 'ba' ? 'ba' : 'fr'} compact />

            {/* Badges */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl p-4 border border-[hsl(var(--kuaishou-border))]"
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
                className="bg-white rounded-2xl p-4 border border-[hsl(var(--kuaishou-border))]"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📖</span>
                    <span className="text-sm font-medium">{t('profile_my_stories')}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{myStories.length}</span>
                </div>
                <TamTamStories 
                  stories={myStories} 
                  onCreateStory={() => navigate('/fitila/social')} 
                />
              </motion.div>
            )}

            {/* Settings */}
            <div className="space-y-3">
              {settingsItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleSettingPress(item.id, item.labelKey)}
                  className="w-full bg-white rounded-2xl p-4 border border-[hsl(var(--kuaishou-border))] flex items-center gap-4 active:scale-[0.98] transition-transform"
                >
                  <span className="text-2xl">{item.icon}</span>
                  <span className="flex-1 text-left font-medium">{t(item.labelKey)}</span>
                  <Volume2 className="w-5 h-5 text-muted-foreground" />
                  <span className="text-xl text-muted-foreground">→</span>
                </button>
              ))}

              {/* Logout button */}
              <button
                onClick={() => setShowLogoutConfirm(true)}
                className="w-full bg-destructive/10 rounded-2xl p-4 flex items-center gap-4 active:scale-[0.98] transition-transform"
              >
                <LogOut className="w-6 h-6 text-destructive" />
                <span className="flex-1 text-left font-medium text-destructive">{t('logout')}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* End scroll wrapper */}
      </div>

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

      {showEditProfile && (
        <ProfileEditModal
          isOpen={showEditProfile}
          onClose={() => setShowEditProfile(false)}
          profile={profile}
          onSave={async (updates) => {
            const result = await updateProfile(updates);
            if (!result.error) {
              toast({ title: "✅ Profil mis à jour" });
            }
            return result;
          }}
        />
      )}

      {/* Logout confirmation */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowLogoutConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl p-6 max-w-sm w-full text-center"
            >
              <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-destructive/10 flex items-center justify-center">
                <LogOut className="w-7 h-7 text-destructive" />
              </div>
              <h3 className="text-lg font-bold mb-1">{t('logout')}</h3>
              <p className="text-sm text-muted-foreground mb-5">
                {t('profile_logout_confirm') || 'Êtes-vous sûr de vouloir vous déconnecter ?'}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 py-3 rounded-2xl bg-muted text-foreground font-medium"
                >
                  {t('cancel') || 'Annuler'}
                </button>
                <button
                  onClick={handleLogout}
                  className="flex-1 py-3 rounded-2xl bg-destructive text-destructive-foreground font-medium"
                >
                  {t('logout')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <MyPostViewerOverlay
        posts={myPosts.filter(p => {
          if (postFilter === 'public') return p.is_public;
          if (postFilter === 'private') return !p.is_public;
          return true;
        })}
        initialIndex={viewerIndex}
        isOpen={viewerOpen}
        onClose={() => setViewerOpen(false)}
        onEdit={handleEditPost}
        onDelete={async (postId) => {
          await handleDeletePost(postId);
          if (myPosts.length <= 1) setViewerOpen(false);
        }}
        onToggleVisibility={handleToggleVisibility}
      />
    </div>
  );
}

// Utility function to compress image
async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    img.onload = () => {
      const maxSize = 500;
      let { width, height } = img;

      if (width > height) {
        if (width > maxSize) {
          height = (height * maxSize) / width;
          width = maxSize;
        }
      } else {
        if (height > maxSize) {
          width = (width * maxSize) / height;
          height = maxSize;
        }
      }

      canvas.width = width;
      canvas.height = height;
      ctx?.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to compress image'));
        },
        'image/webp',
        0.85
      );
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}
