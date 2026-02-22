/**
 * VideoFeedCard - Memoized video card component for feed
 * OPTIMIZED: Zero spinners, instant thumbnail, engagement tracking
 */

import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, Share2, Bookmark, Play, Pause, Plus } from 'lucide-react';
import { triggerFeedback } from '@/utils/tamtamFeedback';

interface VideoFeedCardProps {
  post: any;
  isActive: boolean;
  onLike: () => void;
  onComment: () => void;
  onShare: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  onEngagement?: (videoId: string, type: 'view' | 'like' | 'share' | 'comment' | 'bookmark', data?: { watchMs?: number; totalMs?: number; completed?: boolean; replayed?: boolean }) => void;
  onSwipe?: (videoId: string, speedMs: number) => void;
}

const VideoFeedCardComponent: React.FC<VideoFeedCardProps> = ({ 
  post, 
  isActive, 
  onLike, 
  onComment, 
  onShare, 
  isMuted, 
  onToggleMute,
  onEngagement,
  onSwipe,
}) => {
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showPlayIcon, setShowPlayIcon] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const navigate = useNavigate();

  // Engagement tracking refs
  const activatedAtRef = useRef<number>(0);
  const watchAccumRef = useRef<number>(0);
  const hasCompletedRef = useRef(false);
  const hasReplayedRef = useRef(false);
  const lastTimeRef = useRef<number>(0);

  const videoUrl = post.media_url || post.video_url || post.videoUrl;
  const thumbnailUrl = post.thumbnail_url || post.thumbnailUrl;
  const authorName = post.profile?.display_name || post.author?.name || 'Créateur';
  const authorUsername = post.profile?.username 
    ? `@${post.profile.username}` 
    : post.author?.username || '@fitila_user';
  const likesCount = post.likes_count || post.likesCount || post.reactions_count || 0;
  const commentsCount = post.comments_count || post.commentsCount || 0;
  const sharesCount = post.shares_count || post.sharesCount || 0;
  const avatarUrl = post.profile?.avatar_url || post.author?.avatarUrl;
  const authorId = post.profile?.user_id || post.author?.id || post.user_id;
  const feelingEmoji = post.feeling_emoji;

  // Track activation time for swipe speed
  useEffect(() => {
    if (isActive) {
      activatedAtRef.current = Date.now();
      watchAccumRef.current = 0;
      hasCompletedRef.current = false;
      hasReplayedRef.current = false;
      lastTimeRef.current = 0;
    } else if (activatedAtRef.current > 0) {
      // Card deactivated — send engagement data
      const swipeSpeed = Date.now() - activatedAtRef.current;
      const totalMs = (videoRef.current?.duration || post.duration_seconds || 30) * 1000;
      
      if (onSwipe && swipeSpeed < 3000) {
        onSwipe(post.id, swipeSpeed);
      }
      if (onEngagement) {
        onEngagement(post.id, 'view', {
          watchMs: watchAccumRef.current,
          totalMs,
          completed: hasCompletedRef.current,
          replayed: hasReplayedRef.current,
        });
      }
      activatedAtRef.current = 0;
    }
  }, [isActive, post.id]);

  useEffect(() => {
    if (!videoRef.current) return;
    
    if (isActive) {
      videoRef.current.muted = isMuted;
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
      videoRef.current.currentTime = 0;
    }
  }, [isActive, isMuted]);

  // Track watch time via timeupdate
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;

    const onTimeUpdate = () => {
      const currentTime = vid.currentTime * 1000;
      if (lastTimeRef.current > 0) {
        const delta = currentTime - lastTimeRef.current;
        if (delta > 0 && delta < 1000) {
          watchAccumRef.current += delta;
        }
      }
      lastTimeRef.current = currentTime;
    };

    const onEnded = () => {
      if (!hasCompletedRef.current) {
        hasCompletedRef.current = true;
      } else {
        hasReplayedRef.current = true;
      }
    };

    vid.addEventListener('timeupdate', onTimeUpdate);
    vid.addEventListener('ended', onEnded);
    return () => {
      vid.removeEventListener('timeupdate', onTimeUpdate);
      vid.removeEventListener('ended', onEnded);
    };
  }, [videoUrl]);

  // Cleanup on unmount
  useEffect(() => {
    const currentVideoUrl = videoUrl;
    return () => {
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.src = '';
      }
      if (currentVideoUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(currentVideoUrl);
      }
    };
  }, [videoUrl]);

  const handleProfileClick = useCallback(() => {
    if (authorId) navigate(`/fitila/profile/${authorId}`);
  }, [authorId, navigate]);

  const handleLike = useCallback(() => {
    setIsLiked(prev => !prev);
    onLike();
    onEngagement?.(post.id, 'like');
    triggerFeedback('notification');
  }, [onLike, post.id, onEngagement]);

  const handleSave = useCallback(() => {
    setIsSaved(prev => !prev);
    onEngagement?.(post.id, 'bookmark');
    triggerFeedback('success');
  }, [post.id, onEngagement]);

  const handleFollow = useCallback(() => {
    setIsFollowing(prev => !prev);
    triggerFeedback('success');
  }, []);

  const handleVideoTap = useCallback(() => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
    setShowPlayIcon(true);
    setTimeout(() => setShowPlayIcon(false), 600);
    triggerFeedback('notification');
  }, [isPlaying]);

  return (
    <div 
      className="h-[100dvh] h-screen w-screen max-w-full snap-start snap-always relative overflow-hidden"
      style={{ 
        background: thumbnailUrl ? `url(${thumbnailUrl}) center/cover no-repeat` : '#000',
        backgroundColor: '#000',
      }}
    >
      {/* Tap zone for play/pause */}
      <div className="absolute inset-0 z-10" onClick={handleVideoTap} />

      {/* Play/Pause indicator */}
      <AnimatePresence>
        {showPlayIcon && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 0.8, scale: 1 }}
            exit={{ opacity: 0, scale: 1.2 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none"
          >
            <div className="w-20 h-20 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
              {isPlaying ? (
                <Pause className="w-10 h-10 text-white" fill="white" />
              ) : (
                <Play className="w-10 h-10 text-white ml-1" fill="white" />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Video — loads over thumbnail background via opacity transition */}
      {videoUrl ? (
        <video 
          ref={videoRef} 
          src={videoUrl} 
          poster={thumbnailUrl || undefined}
          loop 
          muted={isMuted}
          playsInline 
          preload={isActive ? 'auto' : 'metadata'} 
          onLoadedData={() => setIsLoaded(true)} 
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-200 ${isLoaded ? 'opacity-100' : 'opacity-0'}`} 
        />
      ) : thumbnailUrl ? (
        <img 
          src={thumbnailUrl} 
          alt=""
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-900 to-indigo-900">
          <span className="text-7xl">{feelingEmoji || '🎬'}</span>
        </div>
      )}
      
      {/* NO SPINNER — thumbnail background is always visible */}

      {/* Author info - bottom left */}
      <div 
        className="absolute bottom-0 left-0 right-16 sm:right-20 px-3 sm:px-4"
        style={{ paddingBottom: 'max(5rem, calc(env(safe-area-inset-bottom) + 5rem))' }}
      >
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="z-20 relative" 
          onClick={handleProfileClick}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full overflow-hidden border-2 border-white/30 shadow-lg flex-shrink-0">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-white/10 flex items-center justify-center">
                  <span className="text-sm">👤</span>
                </div>
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-white text-sm sm:text-base font-bold drop-shadow-lg truncate">{authorUsername}</span>
              <span className="text-white/60 text-xs sm:text-sm drop-shadow-md">
                {post.created_at ? new Date(post.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) + ' · ' + new Date(post.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''}
              </span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Right sidebar - Actions */}
      <div 
        className="absolute right-2 sm:right-3 md:right-4 flex flex-col items-center gap-2 sm:gap-3 md:gap-4 z-20"
        style={{ top: '50%', transform: 'translateY(-10%)' }}
      >
        {/* Follow Avatar Button */}
        <div className="relative mb-1">
          <motion.button 
            whileTap={{ scale: 0.9 }} 
            onClick={handleProfileClick}
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-full overflow-hidden border-2 border-white/40 shadow-lg"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center">
                <span className="text-sm">👤</span>
              </div>
            )}
          </motion.button>
          {!isFollowing && (
            <motion.button 
              whileTap={{ scale: 0.8 }}
              onClick={(e) => { e.stopPropagation(); handleFollow(); }}
              className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center shadow-md z-30"
            >
              <Plus className="w-3 h-3 text-white" strokeWidth={3} />
            </motion.button>
          )}
        </div>

        {/* Like */}
        <motion.button 
          whileTap={{ scale: 0.85 }} 
          onClick={handleLike}
          className="flex flex-col items-center"
        >
          <Heart className={`w-5 h-5 sm:w-6 sm:h-6 ${isLiked ? 'text-red-500 fill-red-500' : 'text-white'} drop-shadow-lg`} strokeWidth={1.5} />
          <span className="text-white/80 text-[10px] font-medium mt-0.5 drop-shadow-md">
            {likesCount + (isLiked ? 1 : 0)}
          </span>
        </motion.button>
        
        {/* Comment */}
        <motion.button 
          whileTap={{ scale: 0.85 }} 
          onClick={onComment} 
          className="flex flex-col items-center"
        >
          <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white drop-shadow-lg" strokeWidth={1.5} />
          <span className="text-white/80 text-[10px] font-medium mt-0.5 drop-shadow-md">{commentsCount}</span>
        </motion.button>
        
        {/* Bookmark */}
        <motion.button 
          whileTap={{ scale: 0.85 }} 
          onClick={handleSave}
          className="flex flex-col items-center"
        >
          <Bookmark className={`w-5 h-5 sm:w-6 sm:h-6 ${isSaved ? 'text-amber-400 fill-amber-400' : 'text-white'} drop-shadow-lg`} strokeWidth={1.5} />
        </motion.button>
        
        {/* Share */}
        <motion.button 
          whileTap={{ scale: 0.85 }} 
          onClick={onShare} 
          className="flex flex-col items-center"
        >
          <Share2 className="w-5 h-5 sm:w-6 sm:h-6 text-white drop-shadow-lg" strokeWidth={1.5} />
          <span className="text-white/80 text-[10px] font-medium mt-0.5 drop-shadow-md">{sharesCount}</span>
        </motion.button>
      </div>
    </div>
  );
};

export const VideoFeedCard = memo(VideoFeedCardComponent, (prevProps, nextProps) => {
  return (
    prevProps.post.id === nextProps.post.id &&
    prevProps.isActive === nextProps.isActive &&
    prevProps.isMuted === nextProps.isMuted
  );
});

export default VideoFeedCard;
