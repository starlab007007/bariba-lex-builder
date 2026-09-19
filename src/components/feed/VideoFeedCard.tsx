/**
 * VideoFeedCard - Memoized video card component for feed
 * OPTIMIZED: Zero spinners, instant thumbnail, engagement tracking
 */

import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, Share2, Bookmark, Play, Pause, Plus } from 'lucide-react';
import { triggerFeedback } from '@/utils/tamtamFeedback';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useFeedAudioAutoStop } from '@/hooks/useFeedAudioAutoStop';

interface VideoFeedCardProps {
  post: any;
  isActive: boolean;
  autoPlay?: boolean;
  onLike?: () => void;
  onComment: () => void;
  onShare?: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  onEngagement?: (videoId: string, type: 'view' | 'like' | 'share' | 'comment' | 'bookmark', data?: { watchMs?: number; totalMs?: number; completed?: boolean; replayed?: boolean }) => void;
  onSwipe?: (videoId: string, speedMs: number) => void;
  onPlayInteractive?: (storyId: string) => void;
  engagementTracker?: {
    trackView: (videoId: string, watchMs: number, totalMs: number, completed: boolean, replayed: boolean) => void;
    trackSwipe: (videoId: string, speedMs: number) => void;
    trackInteraction: (videoId: string, type: 'like' | 'share' | 'comment' | 'bookmark') => void;
    recordCategoryEngagement: (category: string) => void;
  };
}

const VideoFeedCardComponent: React.FC<VideoFeedCardProps> = ({ 
  post, 
  isActive, 
  autoPlay = false,
  onLike, 
  onComment, 
  onShare, 
  isMuted, 
  onToggleMute,
  onEngagement,
  onSwipe,
  onPlayInteractive,
  engagementTracker,
}) => {
  const isInteractive = post.template_id === 'conte-vivant' || post.metadata?.is_interactive;
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showPlayIcon, setShowPlayIcon] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  // Arrêt universel de la vidéo (route, scroll, blur, hidden, pagehide) — pas de reprise auto
  useFeedAudioAutoStop(videoRef, setIsPlaying, { resetTime: false });

  // Engagement tracking refs
  const activatedAtRef = useRef<number>(0);
  const watchAccumRef = useRef<number>(0);
  const hasCompletedRef = useRef(false);
  const hasReplayedRef = useRef(false);
  const lastTimeRef = useRef<number>(0);

  const mediaUrl = post.media_url || post.video_url || post.videoUrl;
  const thumbnailUrl = post.thumbnail_url || post.thumbnailUrl;
  
  // Detect if this is a photo (image) or video based on media_type AND file extension
  const mediaType = String(post.media_type || '').toLowerCase();
  const isPhoto = mediaType === 'photo' || mediaType === 'image' || 
    /\.(jpg|jpeg|png|webp|gif|heic|heif|bmp|svg)(\?|$)/i.test(mediaUrl || '');
  const videoUrl = isPhoto ? null : mediaUrl;
  const photoUrl = isPhoto ? mediaUrl : null;
  
  const authorName = post.profile?.display_name || post.author?.name || 'Créateur';
  const rawUsername = post.profile?.username || post.author?.username || 'fitila_user';
  const authorUsername = `@${rawUsername.replace(/^@+/, '')}`;
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
      if (engagementTracker) {
        if (swipeSpeed < 3000) engagementTracker.trackSwipe(post.id, swipeSpeed);
        engagementTracker.trackView(post.id, watchAccumRef.current, totalMs, hasCompletedRef.current, hasReplayedRef.current);
        const cat = post.template_name || post.metadata?.category || 'general';
        if (watchAccumRef.current > 3000) engagementTracker.recordCategoryEngagement(cat);
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
    if (isPhoto) {
      setIsLoaded(true);
      return;
    }
    if (!videoRef.current) return;
    
    if (isActive) {
      if (autoPlay) {
        videoRef.current.muted = isMuted;
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          playPromise.then(() => setIsPlaying(true)).catch((e) => {
            console.warn('[VideoFeedCard] play() failed:', e.name);
            // Force muted autoplay as fallback (Safari/Chrome policy)
            if (videoRef.current) {
              videoRef.current.muted = true;
              videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {
                // Video truly cannot play — show as loaded anyway to avoid black screen
                setIsLoaded(true);
              });
            }
          });
        }
      } else {
        // Not auto-playing: just ensure loaded state for thumbnail display
        setIsLoaded(true);
      }
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
      try { videoRef.current.currentTime = 0; } catch (_) {}
    }
  }, [isActive, autoPlay, isMuted, isPhoto]);

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

  // Cleanup on unmount (videos only)
  useEffect(() => {
    if (isPhoto) return;
    const currentVideoUrl = videoUrl;
    return () => {
      if (videoRef.current) {
        try {
          videoRef.current.pause();
          videoRef.current.removeAttribute('src');
          videoRef.current.load();
        } catch (_) {}
      }
      if (currentVideoUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(currentVideoUrl);
      }
    };
  }, [videoUrl, isPhoto]);

  const handleProfileClick = useCallback(() => {
    if (authorId) navigate(`/fitila/profile/${authorId}`);
  }, [authorId, navigate]);

  const handleLike = useCallback(() => {
    setIsLiked(prev => !prev);
    onLike?.();
    onEngagement?.(post.id, 'like');
    engagementTracker?.trackInteraction(post.id, 'like');
    triggerFeedback('notification');
  }, [onLike, post.id, onEngagement, engagementTracker]);

  const handleSave = useCallback(() => {
    setIsSaved(prev => !prev);
    onEngagement?.(post.id, 'bookmark');
    engagementTracker?.trackInteraction(post.id, 'bookmark');
    triggerFeedback('success');
  }, [post.id, onEngagement, engagementTracker]);

  // Check if already following on activation
  useEffect(() => {
    if (!user || !authorId || authorId === user.id) return;
    supabase
      .from('tamtam_follows')
      .select('id')
      .eq('follower_id', user.id)
      .eq('following_id', authorId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setIsFollowing(true);
      });
  }, [user, authorId]);

  const handleFollow = useCallback(async () => {
    if (!user) {
      toast({ title: '🔐 Connexion requise', description: 'Connectez-vous pour suivre cet utilisateur.', variant: 'destructive' });
      return;
    }
    if (!authorId || authorId === user.id) return;

    if (isFollowing) {
      // Unfollow
      await supabase
        .from('tamtam_follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', authorId);
      setIsFollowing(false);
    } else {
      // Follow
      await supabase
        .from('tamtam_follows')
        .insert({ follower_id: user.id, following_id: authorId });
      setIsFollowing(true);
    }
    triggerFeedback('success');
  }, [user, authorId, isFollowing, toast]);

  const handleVideoTap = useCallback(() => {
    if (isPhoto) return; // No play/pause for photos
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
  }, [isPlaying, isPhoto]);

  return (
    <div 
      className="h-screen w-screen max-w-full snap-start snap-always relative overflow-hidden"
      style={{ 
        backgroundColor: 'transparent',
        height: '100dvh',
        minHeight: '-webkit-fill-available',
      }}
    >
      {/* Tap zone for play/pause (videos only) */}
      {!isPhoto && <div className="absolute inset-0 z-10" onClick={handleVideoTap} />}

      {/* Play/Pause indicator (videos only) */}
      {!isPhoto && (
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
      )}

      {/* PHOTO — render as img, always visible */}
      {isPhoto && photoUrl ? (
        <img 
          src={photoUrl} 
          alt={post.transcript_fr || ''}
          crossOrigin="anonymous"
          className="absolute inset-0 w-full h-full object-contain"
          style={{ backgroundColor: 'transparent' }}
          onLoad={() => setIsLoaded(true)}
          onError={() => setIsLoaded(true)}
        />
      ) : videoUrl ? (
        <video 
          ref={videoRef} 
          src={videoUrl} 
          poster={thumbnailUrl || undefined}
          crossOrigin="anonymous"
          loop 
          muted={isMuted}
          playsInline
          webkit-playsinline=""
          x-webkit-airplay="deny"
          preload={isActive ? 'auto' : 'metadata'} 
          onLoadedData={() => setIsLoaded(true)}
          onCanPlay={() => setIsLoaded(true)}
          onError={() => {
            console.warn('[VideoFeedCard] Video error for:', videoUrl);
            setIsLoaded(true);
          }}
          className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-200 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
          style={{ backgroundColor: 'transparent' }}
        />
      ) : thumbnailUrl ? (
        <img 
          src={thumbnailUrl} 
          alt=""
          crossOrigin="anonymous"
          className="absolute inset-0 w-full h-full object-contain"
          style={{ backgroundColor: 'transparent' }}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-900 to-indigo-900">
          <span className="text-7xl">{feelingEmoji || '🎬'}</span>
        </div>
      )}
      
      {/* Interactive Story Badge */}
      {isInteractive && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/40">
          <span className="text-6xl mb-3">🎪</span>
          <p className="text-white font-bold text-lg mb-1">Conte Interactif</p>
          <p className="text-white/60 text-xs mb-4">
            {post.metadata?.total_segments || '?'} segments · {post.metadata?.total_endings || '?'} fins
          </p>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              const storyId = post.metadata?.story_id;
              if (storyId && onPlayInteractive) onPlayInteractive(storyId);
            }}
            className="px-8 py-3 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-base shadow-lg"
          >
            ▶️ Jouer le conte
          </motion.button>
        </div>
      )}

      {post.product_id && post.product && (
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/fitila/market?product=${post.product_id}`);
          }}
          className="absolute left-3 right-16 sm:right-20 z-30 rounded-2xl border border-white/15 bg-black/55 p-3 text-left backdrop-blur-xl"
          style={{ bottom: 'max(10.5rem, calc(env(safe-area-inset-bottom) + 10.5rem))' }}
        >
          <div className="flex items-center gap-3 min-w-0">
            {(post.product.thumbnail_url || post.product.images?.[0]) ? (
              <img
                src={post.product.thumbnail_url || post.product.images?.[0]}
                alt=""
                className="h-12 w-12 shrink-0 rounded-xl object-cover"
              />
            ) : (
              <div className="h-12 w-12 shrink-0 rounded-xl bg-white/10 grid place-items-center">📦</div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs text-amber-300 font-semibold">Produit du Marché FITILA</p>
              <p className="truncate text-sm text-white font-bold">{post.product.title_fr || post.product.title}</p>
              <div className="mt-0.5 flex items-center gap-2 text-xs text-white/70">
                <span className="font-bold text-white">
                  {post.product.price != null ? `${Number(post.product.price).toLocaleString('fr-FR')} ${post.product.currency || 'XOF'}` : 'Prix à convenir'}
                </span>
                {post.product.location && <span className="truncate">· {post.product.location}</span>}
              </div>
            </div>
            <span className="shrink-0 rounded-full bg-amber-400 px-3 py-1.5 text-[11px] font-black text-black">Voir</span>
          </div>
        </motion.button>
      )}

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
              {(post.transcript_fr || post.transcript_ba) && (
                <p className="text-white/90 text-xs sm:text-sm drop-shadow-lg line-clamp-2 mt-0.5 leading-snug">
                  {post.transcript_fr || post.transcript_ba}
                </p>
              )}
              <span className="text-white/60 text-xs sm:text-sm drop-shadow-md mt-0.5">
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
    prevProps.isMuted === nextProps.isMuted &&
    prevProps.autoPlay === nextProps.autoPlay
  );
});

export default VideoFeedCard;
