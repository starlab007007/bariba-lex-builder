import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Heart, Mic, Share2, Bookmark, Play, Pause, Volume2, VolumeX,
  MoreHorizontal, Flag, Download, Users, ChevronDown,
  MessageCircle, RefreshCw, Sparkles, TrendingUp, Loader2, Shuffle
} from 'lucide-react';
import { useVideoFeed } from '@/hooks/useVideoFeed';
import { usePostInteractions } from '@/hooks/usePostInteractions';
import { useNavigate } from 'react-router-dom';
import { usePageVisibility } from '@/hooks/usePageVisibility';


// ═══════════════════════════════════════════════════════════════════════════
// 🎬 FITILA VIDEO FEED - TIKTOK-STYLE
// ═══════════════════════════════════════════════════════════════════════════

interface VideoPost {
  id: string;
  videoUrl: string;
  thumbnailUrl?: string;
  transcriptFr?: string;
  transcriptBa?: string;
  topic?: string;
  topicEmoji?: string;
  duration: number;
  author: {
    name: string;
    username: string;
    avatarUrl?: string;
  };
  likes: number;
  comments: number;
  shares: number;
  isLiked?: boolean;
  isSaved?: boolean;
}

interface TamTamVideoFeedProps {
  videos?: VideoPost[];
  posts?: any[]; // Compatibilité avec l'ancien format
  onLike?: (videoId: string) => void;
  onComment?: (videoId: string) => void;
  onShare?: (videoId: string) => void;
  onSave?: (videoId: string) => void;
  onRemix?: (videoId: string) => void;
  onRespond?: (videoId: string) => void;
}

type FeedTab = 'pour_toi' | 'tendances' | 'communaute';

const TOPIC_ICONS: Record<string, string> = {
  agriculture: '🌾', sante: '🩺', education: '📚', marche: '🛒',
  culture: '🎭', religion: '🕌', humour: '😂', musique: '🎵',
  conte: '📖', default: '🎬'
};

// Action Button Component
const ActionButton: React.FC<{
  icon: React.ElementType;
  label: string;
  isActive?: boolean;
  onClick: () => void;
}> = ({ icon: Icon, label, isActive, onClick }) => (
  <motion.button
    whileTap={{ scale: 0.85 }}
    onClick={onClick}
    className="flex flex-col items-center gap-1.5"
  >
    <div className={`w-16 h-16 rounded-full backdrop-blur-xl flex items-center justify-center shadow-2xl transition-all border border-white/10 ${
      isActive ? 'bg-gradient-to-br from-red-500 to-pink-500' : 'bg-black/50 hover:bg-black/70'
    }`}>
      <Icon className="w-8 h-8 text-white" fill={isActive ? "white" : "none"} strokeWidth={2.5} />
    </div>
    {label && <span className="text-white text-xs font-bold drop-shadow-lg">{label}</span>}
  </motion.button>
);

// Video Card Component
const VideoCard: React.FC<{
  post: VideoPost;
  isActive: boolean;
  onVideoEnded?: () => void;
  onComment: () => void;
  onRespond: () => void;
}> = ({ post, isActive, onVideoEnded, onComment, onRespond }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showOptions, setShowOptions] = useState(false);
  const [showLikeAnimation, setShowLikeAnimation] = useState(false);
  const lastTapRef = useRef<number>(0);
  const navigate = useNavigate();
  const isPageVisible = usePageVisibility();
  const wasPlayingBeforeHide = useRef(false);

  const authorId = (post.author as any)?.id || (post as any).user_id;
  const { isLiked, likesCount, toggleLike, isBookmarked, toggleBookmark, sharesCount, sharePost, isFollowing, toggleFollow } = usePostInteractions(post.id, authorId);

  const topicIcon = post.topicEmoji || TOPIC_ICONS[post.topic || 'default'] || TOPIC_ICONS.default;

  useEffect(() => {
    if (isActive && videoRef.current) {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    } else if (!isActive && videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  }, [isActive]);

  // Pause/resume on tab visibility
  useEffect(() => {
    if (!videoRef.current || !isActive) return;
    if (!isPageVisible) {
      wasPlayingBeforeHide.current = isPlaying;
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    } else if (wasPlayingBeforeHide.current) {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
      wasPlayingBeforeHide.current = false;
    }
  }, [isPageVisible, isActive]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => setProgress((video.currentTime / video.duration) * 100);
    const handleEnded = () => {
      if (onVideoEnded) {
        onVideoEnded();
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('ended', handleEnded);
    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('ended', handleEnded);
    };
  }, []);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) { videoRef.current.pause(); setIsPlaying(false); }
    else { videoRef.current.play().catch(() => {}); setIsPlaying(true); }
  };

  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      if (!isLiked) {
        toggleLike();
        setShowLikeAnimation(true);
        setTimeout(() => setShowLikeAnimation(false), 1000);
      }
    } else {
      togglePlay();
    }
    lastTapRef.current = now;
  };

  const handleLike = () => {
    toggleLike();
    if (!isLiked) {
      setShowLikeAnimation(true);
      setTimeout(() => setShowLikeAnimation(false), 800);
    }
  };

  const handleProfileClick = () => {
    if (authorId) navigate(`/fitila/user/${authorId}`);
  };

  return (
    <div className="h-screen w-full snap-start snap-always relative bg-black">
      <video
        ref={videoRef}
        src={post.videoUrl}
        poster={post.thumbnailUrl}
        className="absolute inset-0 w-full h-full object-cover"
        playsInline muted={isMuted}
        onClick={handleDoubleTap}
      />

      {/* Play indicator */}
      <AnimatePresence>
        {!isPlaying && (
          <motion.div
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none"
          >
            <div className="w-24 h-24 rounded-full bg-white/40 backdrop-blur-md flex items-center justify-center shadow-2xl">
              <Play className="w-12 h-12 text-white ml-2" fill="white" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-white/20">
        <motion.div className="h-full bg-white shadow-lg" style={{ width: `${progress}%` }} />
      </div>

      {/* Topic badge */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute top-16 left-4 px-4 py-2 rounded-full bg-black/50 backdrop-blur-xl border border-white/10 shadow-xl"
      >
        <span className="text-white text-base font-semibold flex items-center gap-2">
          <span className="text-2xl">{topicIcon}</span>
          {post.topic || 'Vidéo'}
        </span>
      </motion.div>


      {/* Author info */}
      <div className="absolute bottom-36 left-5 right-24 z-10">
        <div className="flex items-center gap-3 mb-4 cursor-pointer" onClick={handleProfileClick}>
          {post.author.avatarUrl ? (
            <img src={post.author.avatarUrl} alt={post.author.name} className="w-14 h-14 rounded-full border-2 border-white object-cover shadow-lg" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-2xl text-white border-2 border-white shadow-lg font-bold">
              {post.author.name[0].toUpperCase()}
            </div>
          )}
          <div>
            <p className="text-white font-bold text-lg drop-shadow-2xl">{post.author.name}</p>
            <p className="text-white/80 text-sm drop-shadow-lg">@{post.author.name?.toLowerCase().replace(/\s+/g, '_') || post.author.username}</p>
          </div>
        </div>

        {post.transcriptFr && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-black/50 backdrop-blur-xl rounded-2xl px-5 py-3 max-w-md border border-white/10 shadow-2xl"
          >
            <p className="text-white text-base leading-relaxed line-clamp-3">{post.transcriptFr}</p>
          </motion.div>
        )}
      </div>

      {/* Action buttons */}
      <div className="absolute right-4 bottom-40 flex flex-col gap-6 z-10">
        <ActionButton icon={Heart} label={String(likesCount)} isActive={isLiked} onClick={handleLike} />
        <ActionButton icon={MessageCircle} label={String(post.comments)} onClick={onComment} />
        <ActionButton icon={Mic} label="Répondre" onClick={onRespond} />
        <ActionButton icon={RefreshCw} label="Remix" onClick={() => {}} />
        <ActionButton icon={Share2} label={String(sharesCount || 'Partager')} onClick={() => sharePost()} />
        <ActionButton icon={Bookmark} label="" isActive={isBookmarked} onClick={() => toggleBookmark()} />
        <ActionButton icon={MoreHorizontal} label="" onClick={() => setShowOptions(true)} />
      </div>

      {/* Options sheet */}
      <AnimatePresence>
        {showOptions && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-end z-30"
            onClick={() => setShowOptions(false)}
          >
            <motion.div
              initial={{ y: 300 }}
              animate={{ y: 0 }}
              exit={{ y: 300 }}
              className="w-full bg-gradient-to-b from-gray-900 to-black rounded-t-3xl p-6 space-y-3 border-t-2 border-white/10"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-16 h-1.5 bg-white/20 rounded-full mx-auto mb-6" />
              <button className="w-full flex items-center gap-4 p-5 rounded-2xl bg-white/5 hover:bg-white/10">
                <Flag className="w-7 h-7 text-red-400" />
                <span className="text-white font-semibold text-lg">Signaler</span>
              </button>
              <button className="w-full flex items-center gap-4 p-5 rounded-2xl bg-white/5 hover:bg-white/10">
                <Download className="w-7 h-7 text-white" />
                <span className="text-white font-semibold text-lg">Télécharger</span>
              </button>
              <button className="w-full flex items-center gap-4 p-5 rounded-2xl bg-white/5 hover:bg-white/10">
                <Users className="w-7 h-7 text-white" />
                <span className="text-white font-semibold text-lg">Voir le profil</span>
              </button>
              <button onClick={() => setShowOptions(false)} className="w-full p-5 rounded-2xl bg-white/10 text-center font-bold text-white text-lg mt-4">
                Annuler
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Like animation */}
      <AnimatePresence>
        {showLikeAnimation && (
          <motion.div
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 1.8, opacity: 0 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
          >
            <Heart className="w-40 h-40 text-red-500 drop-shadow-2xl" fill="currentColor" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Swipe indicator */}
      <motion.div 
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center text-white/50 pointer-events-none"
        animate={{ y: [0, 12, 0] }}
        transition={{ repeat: Infinity, duration: 2 }}
      >
        <ChevronDown className="w-8 h-8" strokeWidth={3} />
        <span className="text-sm font-semibold">Swipez</span>
      </motion.div>
    </div>
  );
};

// No mock data - only show real published videos from database

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT - Export nommé ET default
// ═══════════════════════════════════════════════════════════════════════════

export const TamTamVideoFeed: React.FC<TamTamVideoFeedProps> = ({
  videos,
  posts,
  onLike = () => {},
  onComment = () => {},
  onShare = () => {},
  onSave = () => {},
  onRemix = () => {},
  onRespond = () => {},
}) => {
  // Fetch real videos from Supabase
  const { videos: dbVideos, isLoading: isFeedLoading } = useVideoFeed();

  // Only use real data - no mock fallback
  // Priority: props videos > posts converted > DB videos > empty array
  const videoData = videos || posts?.map(p => ({
    id: p.id || String(Math.random()),
    videoUrl: p.media_url || p.videoUrl || '',
    thumbnailUrl: p.thumbnail_url || p.thumbnailUrl,
    transcriptFr: p.transcript_fr || p.transcriptFr,
    transcriptBa: p.transcript_ba || p.transcriptBa,
    topic: p.topic,
    topicEmoji: p.feeling_emoji || p.topicEmoji,
    duration: p.duration_seconds || p.duration || 30,
    author: p.user || p.author || {
      name: p.profile?.display_name || 'Utilisateur FITILA',
      username: p.profile?.username || 'fitila_user',
      avatarUrl: p.profile?.avatar_url,
    },
    likes: p.likes_count || p.likes || 0,
    comments: p.comments_count || p.comments || 0,
    shares: p.shares || 0,
    isLiked: p.isLiked || false,
    isSaved: p.isSaved || false,
  })).filter((p: VideoPost) => p.videoUrl && p.videoUrl.trim().length > 0) || dbVideos.map(v => ({
    id: v.id,
    videoUrl: v.videoUrl,
    thumbnailUrl: v.thumbnailUrl || undefined,
    transcriptFr: v.description || undefined,
    topic: v.templateName || 'création',
    duration: v.duration,
    author: v.author,
    likes: v.likesCount,
    comments: 0,
    shares: v.sharesCount,
    isLiked: false,
    isSaved: false,
  }));

  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<FeedTab>('pour_toi');
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoMode, setAutoMode] = useState(true);
  const [shuffledData, setShuffledData] = useState<VideoPost[] | null>(null);
  const autoModeTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const displayData = shuffledData || videoData;

  const handleManualInteraction = useCallback(() => {
    setAutoMode(false);
    if (autoModeTimeoutRef.current) {
      clearTimeout(autoModeTimeoutRef.current);
    }
  }, []);

  const handleVideoEnded = useCallback((index: number) => {
    if (autoMode && index === currentIndex) {
      if (currentIndex < displayData.length - 1) {
        const nextIndex = currentIndex + 1;
        setCurrentIndex(nextIndex);
        containerRef.current?.scrollTo({
          top: nextIndex * containerRef.current.clientHeight,
          behavior: 'smooth',
        });
      }
    }
  }, [autoMode, currentIndex, displayData.length]);

  const handleShuffle = useCallback(() => {
    const shuffled = [...videoData].sort(() => Math.random() - 0.5);
    setShuffledData(shuffled);
    setCurrentIndex(0);
    setAutoMode(true);
    containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [videoData]);

  const tabs: { id: FeedTab; label: string; icon: React.ElementType }[] = [
    { id: 'pour_toi', label: 'Pour toi', icon: Sparkles },
    { id: 'tendances', label: 'Tendances', icon: TrendingUp },
    { id: 'communaute', label: 'Communauté', icon: Users },
  ];

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const cardHeight = container.clientHeight;
      const newIndex = Math.round(scrollTop / cardHeight);
      if (newIndex !== currentIndex && newIndex >= 0 && newIndex < displayData.length) {
        setCurrentIndex(newIndex);
      }
    };

    const handleTouch = () => handleManualInteraction();

    container.addEventListener('scroll', handleScroll, { passive: true });
    container.addEventListener('touchstart', handleTouch, { passive: true });
    container.addEventListener('mousedown', handleTouch);
    return () => {
      container.removeEventListener('scroll', handleScroll);
      container.removeEventListener('touchstart', handleTouch);
      container.removeEventListener('mousedown', handleTouch);
    };
  }, [currentIndex, displayData.length, handleManualInteraction]);

  return (
    <div className="h-screen w-full bg-black flex flex-col">
      {/* Header tabs */}
      <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black via-black/80 to-transparent pt-safe">
        <div className="flex justify-center gap-8 py-6 px-4">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-black font-bold shadow-2xl scale-105'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="text-sm font-semibold">{tab.label}</span>
            </button>
          ))}
          <button
            onClick={handleShuffle}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-all"
            title="Actualiser aléatoirement"
          >
            <Shuffle className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Feed - show empty state if no videos */}
      {displayData.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-white/70 px-8">
          <div className="text-7xl mb-6">🎬</div>
          <h3 className="text-xl font-bold text-white mb-2">Aucune vidéo publiée</h3>
          <p className="text-center text-white/60">
            Soyez le premier à créer du contenu ! Utilisez les templates pour publier vos vidéos.
          </p>
        </div>
      ) : (
        <div
          ref={containerRef}
          className="flex-1 overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
          style={{ scrollSnapType: 'y mandatory' }}
        >
          {displayData.map((video, index) => {
            const isNearby = Math.abs(index - currentIndex) <= 1;
            if (!isNearby) {
              return <div key={video.id} className="h-screen w-full snap-start snap-always bg-black" />;
            }
            return (
              <VideoCard
                key={video.id}
                post={video}
                isActive={index === currentIndex}
                onVideoEnded={() => handleVideoEnded(index)}
                onComment={() => onComment(video.id)}
                onRespond={() => onRespond(video.id)}
              />
            );
          })}
        </div>
      )}

      {/* Auto/Manual mode indicator */}
      {displayData.length > 0 && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20">
          <button
            onClick={() => setAutoMode(!autoMode)}
            className={`px-4 py-2 rounded-full text-xs font-semibold backdrop-blur-xl border transition-all ${
              autoMode
                ? 'bg-white/20 border-white/30 text-white'
                : 'bg-black/50 border-white/10 text-white/50'
            }`}
          >
            {autoMode ? '▶ Auto' : '✋ Manuel'}
          </button>
        </div>
      )}
    </div>
  );
};

// Export default pour compatibilité
export default TamTamVideoFeed;
