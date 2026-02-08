/**
 * VideoFeedCard - Memoized video card component for feed
 * OPTIMIZED: React.memo to prevent unnecessary re-renders
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
}

const VideoFeedCardComponent: React.FC<VideoFeedCardProps> = ({ 
  post, 
  isActive, 
  onLike, 
  onComment, 
  onShare, 
  isMuted, 
  onToggleMute 
}) => {
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showPlayIcon, setShowPlayIcon] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const navigate = useNavigate();

  // Support both tamtam_posts and videos table format
  const videoUrl = post.media_url || post.video_url || post.videoUrl;
  const thumbnailUrl = post.thumbnail_url || post.thumbnailUrl;
  const authorName = post.profile?.display_name || post.author?.name || 'Créateur';
  const likesCount = post.likes_count || post.likesCount || post.reactions_count || 0;
  const commentsCount = post.comments_count || post.commentsCount || 0;
  const sharesCount = post.shares_count || post.sharesCount || 0;
  const avatarUrl = post.profile?.avatar_url || post.author?.avatarUrl;
  const feelingEmoji = post.feeling_emoji;

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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.src = '';
      }
    };
  }, []);

  const handleProfileClick = useCallback(() => {
    const userId = post.profile?.user_id || post.author?.id;
    if (userId) {
      navigate(`/fitila/profile/${userId}`);
    }
  }, [post, navigate]);

  const handleLike = useCallback(() => {
    setIsLiked(prev => !prev);
    onLike();
    triggerFeedback('notification');
  }, [onLike]);

  const handleSave = useCallback(() => {
    setIsSaved(prev => !prev);
    triggerFeedback('success');
  }, []);

  // Tap to play/pause (Kuaishou-style)
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
    <div className="h-[100dvh] h-screen w-screen max-w-full snap-start snap-always relative bg-black overflow-hidden">
      {/* Tap zone for play/pause */}
      <div className="absolute inset-0 z-10" onClick={handleVideoTap} />

      {/* Play/Pause indicator — Kuaishou-style */}
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

      {/* Video/Media - FULLSCREEN ABSOLUTE */}
      {videoUrl ? (
        <video 
          ref={videoRef} 
          src={videoUrl} 
          poster={thumbnailUrl || undefined}
          loop 
          muted={isMuted}
          playsInline 
          preload={isActive ? 'auto' : 'none'} 
          onLoadedData={() => setIsLoaded(true)} 
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`} 
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
      
      {/* Loading state */}
      {!isLoaded && videoUrl && (
        <div className="absolute inset-0 bg-black flex items-center justify-center">
          <motion.div 
            animate={{ rotate: 360 }} 
            transition={{ repeat: Infinity, duration: 1 }} 
            className="w-10 h-10 border-2 border-white/30 border-t-white rounded-full" 
          />
        </div>
      )}
      
      {/* Author info - Minimal bottom left */}
      <div 
        className="absolute bottom-0 left-0 right-14 sm:right-16 px-3 sm:px-4"
        style={{ paddingBottom: 'max(3.5rem, calc(env(safe-area-inset-bottom) + 3.5rem))' }}
      >
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2" 
          onClick={handleProfileClick}
        >
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full overflow-hidden border border-white/20">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-white/10 flex items-center justify-center">
                <span className="text-xs">👤</span>
              </div>
            )}
          </div>
          <span className="text-white/80 text-xs sm:text-sm font-medium">{authorName}</span>
        </motion.div>
      </div>

      {/* Right sidebar - Actions */}
      <div 
        className="absolute right-2 sm:right-3 md:right-4 flex flex-col items-center gap-3 sm:gap-4 md:gap-5"
        style={{ bottom: 'max(4.5rem, calc(env(safe-area-inset-bottom) + 4.5rem))' }}
      >
        {/* Like */}
        <motion.button 
          whileTap={{ scale: 0.85 }} 
          onClick={handleLike}
          className="flex flex-col items-center"
        >
          <Heart className={`w-6 h-6 sm:w-7 sm:h-7 ${isLiked ? 'text-red-500 fill-red-500' : 'text-white'} drop-shadow-lg`} strokeWidth={1.5} />
          <span className="text-white/80 text-[10px] sm:text-[11px] font-medium mt-0.5 sm:mt-1 drop-shadow-md">
            {likesCount + (isLiked ? 1 : 0)}
          </span>
        </motion.button>
        
        {/* Comment */}
        <motion.button 
          whileTap={{ scale: 0.85 }} 
          onClick={onComment} 
          className="flex flex-col items-center"
        >
          <MessageCircle className="w-6 h-6 sm:w-7 sm:h-7 text-white drop-shadow-lg" strokeWidth={1.5} />
          <span className="text-white/80 text-[10px] sm:text-[11px] font-medium mt-0.5 sm:mt-1 drop-shadow-md">{commentsCount}</span>
        </motion.button>
        
        {/* Bookmark */}
        <motion.button 
          whileTap={{ scale: 0.85 }} 
          onClick={handleSave}
          className="flex flex-col items-center"
        >
          <Bookmark className={`w-6 h-6 sm:w-7 sm:h-7 ${isSaved ? 'text-amber-400 fill-amber-400' : 'text-white'} drop-shadow-lg`} strokeWidth={1.5} />
        </motion.button>
        
        {/* Share */}
        <motion.button 
          whileTap={{ scale: 0.85 }} 
          onClick={onShare} 
          className="flex flex-col items-center"
        >
          <Share2 className="w-6 h-6 sm:w-7 sm:h-7 text-white drop-shadow-lg" strokeWidth={1.5} />
          <span className="text-white/80 text-[10px] sm:text-[11px] font-medium mt-0.5 sm:mt-1 drop-shadow-md">{sharesCount}</span>
        </motion.button>
      </div>
    </div>
  );
};

// Memoize to prevent unnecessary re-renders
export const VideoFeedCard = memo(VideoFeedCardComponent, (prevProps, nextProps) => {
  // Only re-render if these critical props change
  return (
    prevProps.post.id === nextProps.post.id &&
    prevProps.isActive === nextProps.isActive &&
    prevProps.isMuted === nextProps.isMuted
  );
});

export default VideoFeedCard;
