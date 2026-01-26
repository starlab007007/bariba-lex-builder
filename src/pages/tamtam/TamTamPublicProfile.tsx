import React, { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Play, 
  Pause,
  BadgeCheck,
  Loader2,
  MoreVertical
} from 'lucide-react';

// Kuaishou-style components
import { KuaishouProfileHeader } from '@/components/tamtam/KuaishouProfileHeader';
import { KuaishouStatsGrid } from '@/components/tamtam/KuaishouStatsGrid';
import { KuaishouActionButtons } from '@/components/tamtam/KuaishouActionButtons';
import { KuaishouBioPlayer } from '@/components/tamtam/KuaishouBioPlayer';
import { KuaishouProfileTabs } from '@/components/tamtam/KuaishouProfileTabs';

import { usePublicProfile } from '@/hooks/usePublicProfile';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';
import { TamTamPrivateMessages } from '@/components/tamtam/TamTamPrivateMessages';
import BlockReportMenu from '@/components/tamtam/BlockReportMenu';
import { triggerFeedback } from '@/utils/tamtamFeedback';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function TamTamPublicProfile() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { t } = useTamTamLanguage();
  const { profile, posts, isLoading, isOwnProfile, isFollowing, friendStatus, followUser, sendFriendRequest } = usePublicProfile(userId);
  
  const [showMessages, setShowMessages] = useState(false);
  const [isPlayingBio, setIsPlayingBio] = useState(false);
  const [activeTab, setActiveTab] = useState('posts');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleBack = () => {
    triggerFeedback('notification');
    navigate(-1);
  };

  const handleFollow = async () => {
    triggerFeedback('notification');
    await followUser();
  };

  const handleFriendRequest = async () => {
    triggerFeedback('send');
    await sendFriendRequest();
  };

  const handleMessage = () => {
    triggerFeedback('send');
    setShowMessages(true);
  };

  const handlePlayBio = async () => {
    if (!profile?.bio_audio_url) return;
    
    triggerFeedback('notification');
    if (isPlayingBio && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlayingBio(false);
    } else {
      setIsPlayingBio(true);
      audioRef.current = new Audio(profile.bio_audio_url);
      audioRef.current.onended = () => setIsPlayingBio(false);
      await audioRef.current.play();
    }
  };

  if (isLoading) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'linear-gradient(180deg, hsl(207 60% 97%) 0%, hsl(0 0% 100%) 50%)' }}
      >
        <Loader2 className="w-8 h-8 text-[hsl(var(--kuaishou-primary))] animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div 
        className="min-h-screen flex flex-col items-center justify-center p-4"
        style={{ background: 'linear-gradient(180deg, hsl(207 60% 97%) 0%, hsl(0 0% 100%) 50%)' }}
      >
        <p className="text-muted-foreground mb-4">Utilisateur non trouvé</p>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleBack}
          className="px-6 py-3 bg-[hsl(var(--kuaishou-primary))] text-white rounded-xl font-medium"
        >
          Retour
        </motion.button>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen pb-24"
      style={{ background: 'linear-gradient(180deg, hsl(207 60% 97%) 0%, hsl(0 0% 100%) 50%)' }}
    >
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-xl border-b border-[hsl(var(--kuaishou-border))] px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleBack}
              className="p-2 hover:bg-[hsl(var(--kuaishou-bg))] rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </motion.button>
            <h1 className="text-lg font-semibold text-foreground flex items-center gap-2">
              @{profile.username}
              {profile.is_verified && (
                <BadgeCheck className="w-5 h-5 text-[hsl(var(--kuaishou-primary))]" />
              )}
            </h1>
          </div>

          {/* Block/Report Menu */}
          {!isOwnProfile && (
            <BlockReportMenu
              userId={userId!}
              userName={profile.display_name || profile.username}
              trigger={
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  className="p-2 hover:bg-[hsl(var(--kuaishou-bg))] rounded-full transition-colors"
                >
                  <MoreVertical className="w-5 h-5 text-muted-foreground" />
                </motion.button>
              }
            />
          )}
        </div>
      </div>

      {/* Profile Header */}
      <KuaishouProfileHeader
        displayName={profile.display_name || ''}
        username={profile.username}
        avatarUrl={profile.avatar_url}
        isOwnProfile={false}
        isVerified={profile.is_verified}
        followersCount={profile.followers_count || 0}
        followingCount={profile.following_count || 0}
        likesCount={posts.reduce((acc, p) => acc + (p.likes_count || 0), 0)}
      />

      {/* Stats Grid */}
      <KuaishouStatsGrid
        postsCount={profile.posts_count || 0}
        followersCount={profile.followers_count || 0}
        followingCount={profile.following_count || 0}
        friendsCount={profile.friends_count || 0}
      />

      {/* Action Buttons */}
      <KuaishouActionButtons
        isOwnProfile={false}
        isFollowing={isFollowing}
        friendStatus={friendStatus}
        onFollow={handleFollow}
        onFriendRequest={handleFriendRequest}
        onMessage={handleMessage}
      />

      {/* Bio Audio Player */}
      <KuaishouBioPlayer
        bioAudioUrl={profile.bio_audio_url}
        bioTranscript={profile.bio_transcript_fr}
        isOwnProfile={false}
      />

      {/* Tabs */}
      <KuaishouProfileTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Posts Grid */}
      <div className="bg-white min-h-[200px] p-4">
        {activeTab === 'posts' && (
          <>
            {posts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Aucune publication</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1">
                {posts.map(post => (
                  <motion.div
                    key={post.id}
                    whileTap={{ scale: 0.98 }}
                    className="aspect-square bg-muted rounded-lg overflow-hidden relative group"
                  >
                    {post.media_url ? (
                      <img 
                        src={post.media_url} 
                        alt="" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-[hsl(var(--kuaishou-primary)/0.2)] to-[hsl(var(--kuaishou-primary)/0.1)] flex items-center justify-center">
                        <Play className="w-8 h-8 text-[hsl(var(--kuaishou-primary))]" />
                      </div>
                    )}
                    
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Play className="w-8 h-8 text-white" fill="white" />
                    </div>

                    <div className="absolute bottom-1 left-1 text-[10px] text-white bg-black/60 px-1.5 py-0.5 rounded">
                      {format(new Date(post.created_at), 'd MMM', { locale: fr })}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'communities' && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Communautés de l'utilisateur</p>
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Statistiques de l'utilisateur</p>
          </div>
        )}
      </div>

      {/* Private Messages Modal */}
      <TamTamPrivateMessages
        isOpen={showMessages}
        onClose={() => setShowMessages(false)}
        initialConversationId={userId}
      />
    </div>
  );
}
