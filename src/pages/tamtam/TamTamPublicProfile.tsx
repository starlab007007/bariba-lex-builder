import React, { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Play, 
  Pause,
  BadgeCheck,
  Loader2,
  MoreVertical,
  X,
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  ChevronUp,
  ChevronDown
} from 'lucide-react';

import { KuaishouProfileHeader } from '@/components/tamtam/KuaishouProfileHeader';
import { KuaishouStatsGrid } from '@/components/tamtam/KuaishouStatsGrid';
import { KuaishouActionButtons } from '@/components/tamtam/KuaishouActionButtons';
import { KuaishouBioPlayer } from '@/components/tamtam/KuaishouBioPlayer';
import { KuaishouProfileTabs } from '@/components/tamtam/KuaishouProfileTabs';

import { usePublicProfile } from '@/hooks/usePublicProfile';
import { usePostInteractions } from '@/hooks/usePostInteractions';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';
import { TamTamPrivateMessages } from '@/components/tamtam/TamTamPrivateMessages';
import BlockReportMenu from '@/components/tamtam/BlockReportMenu';
import { triggerFeedback } from '@/utils/tamtamFeedback';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// Post Viewer Overlay - fullscreen video/photo viewer with interactions
const PostViewerOverlay: React.FC<{
  posts: any[];
  initialIndex: number;
  onClose: () => void;
}> = ({ posts, initialIndex, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const post = posts[currentIndex];
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);

  const authorId = post?.user_id;
  const { isLiked, likesCount, toggleLike, isBookmarked, toggleBookmark, sharesCount, sharePost } = usePostInteractions(post?.id, authorId);

  if (!post) return null;

  const isVideo = post.media_type === 'video' || post.media_url?.includes('.mp4') || post.media_url?.includes('.webm');

  const goNext = () => {
    if (currentIndex < posts.length - 1) setCurrentIndex(currentIndex + 1);
  };
  const goPrev = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) { videoRef.current.pause(); } else { videoRef.current.play().catch(() => {}); }
    setIsPlaying(!isPlaying);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black flex items-center justify-center"
    >
      {/* Close */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={onClose}
        className="absolute top-4 right-4 z-50 w-10 h-10 rounded-full bg-black/50 flex items-center justify-center"
      >
        <X className="w-6 h-6 text-white" />
      </motion.button>

      {/* Counter */}
      <div className="absolute top-4 left-4 z-50 text-white/70 text-sm">
        {currentIndex + 1} / {posts.length}
      </div>

      {/* Media */}
      <div className="absolute inset-0" onClick={isVideo ? togglePlay : undefined}>
        {isVideo ? (
          <video
            ref={videoRef}
            src={post.media_url}
            poster={post.thumbnail_url || undefined}
            autoPlay
            loop
            playsInline
            className="w-full h-full object-contain"
          />
        ) : post.media_url ? (
          <img src={post.media_url} alt="" className="w-full h-full object-contain" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Play className="w-16 h-16 text-white/30" />
          </div>
        )}
      </div>

      {/* Navigation */}
      {currentIndex > 0 && (
        <motion.button whileTap={{ scale: 0.9 }} onClick={goPrev} className="absolute top-1/2 -translate-y-1/2 left-2 z-50 w-10 h-10 rounded-full bg-black/40 flex items-center justify-center">
          <ChevronUp className="w-6 h-6 text-white rotate-[-90deg]" />
        </motion.button>
      )}
      {currentIndex < posts.length - 1 && (
        <motion.button whileTap={{ scale: 0.9 }} onClick={goNext} className="absolute top-1/2 -translate-y-1/2 right-14 z-50 w-10 h-10 rounded-full bg-black/40 flex items-center justify-center">
          <ChevronDown className="w-6 h-6 text-white rotate-[-90deg]" />
        </motion.button>
      )}

      {/* Action buttons */}
      <div className="absolute right-3 bottom-32 flex flex-col items-center gap-4 z-50">
        <motion.button whileTap={{ scale: 0.85 }} onClick={() => { toggleLike(); triggerFeedback('notification'); }} className="flex flex-col items-center">
          <Heart className={`w-7 h-7 ${isLiked ? 'text-red-500 fill-red-500' : 'text-white'}`} />
          <span className="text-white text-xs mt-1">{likesCount}</span>
        </motion.button>
        <motion.button whileTap={{ scale: 0.85 }} onClick={() => { toggleBookmark(); triggerFeedback('success'); }} className="flex flex-col items-center">
          <Bookmark className={`w-7 h-7 ${isBookmarked ? 'text-amber-400 fill-amber-400' : 'text-white'}`} />
        </motion.button>
        <motion.button whileTap={{ scale: 0.85 }} onClick={() => { sharePost(); triggerFeedback('send'); }} className="flex flex-col items-center">
          <Share2 className="w-7 h-7 text-white" />
          <span className="text-white text-xs mt-1">{sharesCount}</span>
        </motion.button>
      </div>

      {/* Caption */}
      {post.transcript_fr && (
        <div className="absolute bottom-8 left-4 right-20 z-50">
          <p className="text-white text-sm bg-black/40 rounded-xl px-4 py-2 line-clamp-3">{post.transcript_fr}</p>
        </div>
      )}
    </motion.div>
  );
};

export default function TamTamPublicProfile() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { t } = useTamTamLanguage();
  const { profile, posts, isLoading, isOwnProfile, isFollowing, friendStatus, followUser, sendFriendRequest } = usePublicProfile(userId);
  
  const [showMessages, setShowMessages] = useState(false);
  const [isPlayingBio, setIsPlayingBio] = useState(false);
  const [activeTab, setActiveTab] = useState('posts');
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
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
      className="h-[100dvh] flex flex-col overflow-hidden"
      style={{ background: 'linear-gradient(180deg, hsl(207 60% 97%) 0%, hsl(0 0% 100%) 50%)' }}
    >
      {/* Header */}
      <div className="flex-shrink-0 z-20 bg-white/80 backdrop-blur-xl border-b border-[hsl(var(--kuaishou-border))] px-4 py-3">
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

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
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

        <KuaishouStatsGrid
        postsCount={profile.posts_count || 0}
        followersCount={profile.followers_count || 0}
        followingCount={profile.following_count || 0}
        friendsCount={profile.friends_count || 0}
        />

        <KuaishouActionButtons
        isOwnProfile={false}
        isFollowing={isFollowing}
        friendStatus={friendStatus}
        onFollow={handleFollow}
        onFriendRequest={handleFriendRequest}
        onMessage={handleMessage}
        />

        <KuaishouBioPlayer
        bioAudioUrl={profile.bio_audio_url}
        bioTranscript={profile.bio_transcript_fr}
        isOwnProfile={false}
        />

        <KuaishouProfileTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        />

        {/* Posts Grid */}
        <div className="bg-white p-4 pb-32">
        {activeTab === 'posts' && (
          <>
            {posts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Aucune publication</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1">
                {posts.map((post, index) => (
                  <motion.div
                    key={post.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setViewerIndex(index)}
                    className="aspect-square bg-muted rounded-lg overflow-hidden relative group cursor-pointer"
                  >
                    {post.media_url ? (
                      <img 
                        src={post.thumbnail_url || post.media_url} 
                        alt="" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-[hsl(var(--kuaishou-primary)/0.2)] to-[hsl(var(--kuaishou-primary)/0.1)] flex items-center justify-center">
                        <Play className="w-8 h-8 text-[hsl(var(--kuaishou-primary))]" />
                      </div>
                    )}
                    
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                      <div className="flex items-center gap-1 text-white text-xs">
                        <Heart className="w-4 h-4" />
                        <span>{post.likes_count || 0}</span>
                      </div>
                      <div className="flex items-center gap-1 text-white text-xs">
                        <MessageCircle className="w-4 h-4" />
                        <span>{post.comments_count || 0}</span>
                      </div>
                    </div>

                    {/* Video indicator */}
                    {(post.media_type === 'video' || post.media_url?.includes('.mp4')) && (
                      <div className="absolute top-1 right-1">
                        <Play className="w-4 h-4 text-white drop-shadow-lg" fill="white" />
                      </div>
                    )}

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
      </div>

      {/* Post Viewer Overlay */}
      <AnimatePresence>
        {viewerIndex !== null && (
          <PostViewerOverlay
            posts={posts}
            initialIndex={viewerIndex}
            onClose={() => setViewerIndex(null)}
          />
        )}
      </AnimatePresence>

      {/* Private Messages Modal */}
      <TamTamPrivateMessages
        isOpen={showMessages}
        onClose={() => setShowMessages(false)}
        initialConversationId={userId}
      />
    </div>
  );
}
