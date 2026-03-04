import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { X, Heart, MessageCircle, Share2, Trash2, Edit, Lock, Globe, ChevronUp, ChevronDown, Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { MyPost } from '@/hooks/useMyPosts';

interface MyPostViewerOverlayProps {
  posts: MyPost[];
  initialIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (post: MyPost) => void;
  onDelete: (postId: string) => void;
  onToggleVisibility: (postId: string, isPublic: boolean) => void;
}

const isVideoUrl = (url: string | null | undefined): boolean => {
  if (!url) return false;
  return /\.(mp4|webm|mov|avi|mkv)(\?|$)/i.test(url);
};

export const MyPostViewerOverlay: React.FC<MyPostViewerOverlayProps> = ({
  posts,
  initialIndex,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onToggleVisibility,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const post = posts[currentIndex];

  useEffect(() => {
    setCurrentIndex(initialIndex);
    setDeleteConfirm(false);
  }, [initialIndex, isOpen]);

  // Cleanup on unmount or close
  useEffect(() => {
    if (!isOpen) {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
      if (videoRef.current) { videoRef.current.pause(); }
      setIsPlaying(false);
      setIsMuted(true);
    }
  }, [isOpen]);

  // Cleanup and auto-play on index change
  useEffect(() => {
    if (!isOpen || !post) return;

    // Cleanup previous
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    setIsPlaying(false);
    setDeleteConfirm(false);

    const timer = setTimeout(() => {
      const hasVideo = (post.media_type === 'video' || isVideoUrl(post.media_url)) && post.media_url;
      if (hasVideo && videoRef.current) {
        videoRef.current.muted = true;
        setIsMuted(true);
        videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
      } else if (post.audio_url) {
        const audio = new Audio(post.audio_url);
        audio.onended = () => setIsPlaying(false);
        audioRef.current = audio;
        audio.play().then(() => setIsPlaying(true)).catch(() => {});
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [isOpen, currentIndex]);

  const goNext = useCallback(() => {
    if (currentIndex < posts.length - 1) setCurrentIndex(i => i + 1);
  }, [currentIndex, posts.length]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) setCurrentIndex(i => i - 1);
  }, [currentIndex]);

  const handleDragEnd = useCallback((_: any, info: PanInfo) => {
    if (info.offset.y < -60) goNext();
    else if (info.offset.y > 60) goPrev();
  }, [goNext, goPrev]);

  const togglePlay = useCallback(() => {
    const hasVideo = (post?.media_type === 'video' || isVideoUrl(post?.media_url)) && post?.media_url;
    if (hasVideo && videoRef.current) {
      if (isPlaying) videoRef.current.pause();
      else videoRef.current.play();
      setIsPlaying(!isPlaying);
    } else if (post?.audio_url) {
      if (!audioRef.current) {
        audioRef.current = new Audio(post.audio_url);
        audioRef.current.onended = () => setIsPlaying(false);
      }
      if (isPlaying) audioRef.current.pause();
      else audioRef.current.play();
      setIsPlaying(!isPlaying);
    }
  }, [post, isPlaying]);

  const toggleMute = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  }, []);

  const handleDelete = useCallback(() => {
    if (!post) return;
    if (deleteConfirm) {
      onDelete(post.id);
      if (posts.length <= 1) onClose();
      else if (currentIndex >= posts.length - 1) setCurrentIndex(i => i - 1);
      setDeleteConfirm(false);
    } else {
      setDeleteConfirm(true);
      setTimeout(() => setDeleteConfirm(false), 3000);
    }
  }, [post, deleteConfirm, posts.length, currentIndex, onDelete, onClose]);

  if (!post) return null;

  const hasVideo = (post.media_type === 'video' || isVideoUrl(post.media_url)) && post.media_url;
  const hasImage = (post.media_type === 'image' || post.media_type === 'photo') && post.media_url;
  const hasThumbnail = post.thumbnail_url;
  const description = post.transcript_fr || post.transcript_ba;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black"
        >
          <motion.div
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            className="w-full h-full flex flex-col"
          >
            {/* Media area */}
            <div className="flex-1 relative flex items-center justify-center overflow-hidden">
              {hasVideo ? (
                <video
                  ref={videoRef}
                  src={post.media_url!}
                  className="w-full h-full object-contain"
                  playsInline
                  muted
                  loop
                  onClick={togglePlay}
                />
              ) : hasImage || hasThumbnail ? (
                <img
                  src={post.media_url || post.thumbnail_url || ''}
                  alt=""
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <div className="w-32 h-32 rounded-full bg-white/10 flex items-center justify-center">
                    <span className="text-6xl">{post.feeling_emoji || '🎤'}</span>
                  </div>
                  {description && (
                    <p className="text-white/60 text-sm text-center max-w-[250px] line-clamp-3">
                      {description}
                    </p>
                  )}
                </div>
              )}

              {/* Play/Pause overlay */}
              {(post.audio_url || hasVideo) && (
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={togglePlay}
                  className="absolute bottom-28 left-1/2 -translate-x-1/2 w-14 h-14 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center"
                >
                  {isPlaying ? (
                    <Pause className="w-6 h-6 text-white" />
                  ) : (
                    <Play className="w-6 h-6 text-white ml-0.5" fill="white" />
                  )}
                </motion.button>
              )}

              {/* Mute toggle for video */}
              {hasVideo && (
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={toggleMute}
                  className="absolute bottom-28 right-6 w-10 h-10 bg-white/15 backdrop-blur-sm rounded-full flex items-center justify-center z-10"
                >
                  {isMuted ? (
                    <VolumeX className="w-4 h-4 text-white" />
                  ) : (
                    <Volume2 className="w-4 h-4 text-white" />
                  )}
                </motion.button>
              )}

              {/* Navigation hints */}
              {currentIndex > 0 && (
                <motion.button onClick={goPrev} className="absolute top-6 left-1/2 -translate-x-1/2 p-2">
                  <ChevronUp className="w-6 h-6 text-white/50" />
                </motion.button>
              )}
              {currentIndex < posts.length - 1 && (
                <motion.button onClick={goNext} className="absolute bottom-6 left-1/2 -translate-x-1/2 p-2">
                  <ChevronDown className="w-6 h-6 text-white/50" />
                </motion.button>
              )}

              {/* Counter */}
              <div className="absolute top-5 right-16 bg-black/40 backdrop-blur-sm rounded-full px-3 py-1">
                <span className="text-white text-xs font-medium">{currentIndex + 1}/{posts.length}</span>
              </div>
            </div>

            {/* Top bar */}
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
              <motion.button whileTap={{ scale: 0.9 }} onClick={onClose} className="w-10 h-10 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center">
                <X className="w-5 h-5 text-white" />
              </motion.button>
            </div>

            {/* Right action buttons */}
            <div className="absolute right-4 bottom-36 flex flex-col gap-4 z-10">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => onEdit(post)}
                className="w-12 h-12 bg-white/15 backdrop-blur-sm rounded-full flex items-center justify-center"
              >
                <Edit className="w-5 h-5 text-white" />
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => onToggleVisibility(post.id, !post.is_public)}
                className="w-12 h-12 bg-white/15 backdrop-blur-sm rounded-full flex items-center justify-center"
              >
                {post.is_public ? (
                  <Globe className="w-5 h-5 text-green-400" />
                ) : (
                  <Lock className="w-5 h-5 text-amber-400" />
                )}
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handleDelete}
                className={`w-12 h-12 backdrop-blur-sm rounded-full flex items-center justify-center ${
                  deleteConfirm ? 'bg-red-500/80' : 'bg-white/15'
                }`}
              >
                <Trash2 className={`w-5 h-5 ${deleteConfirm ? 'text-white' : 'text-red-400'}`} />
              </motion.button>
            </div>

            {/* Bottom stats & description bar */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
              {/* Description */}
              {description && (
                <p className="text-white/90 text-sm mb-2 line-clamp-2 max-w-[75%]">
                  {description}
                </p>
              )}
              <div className="flex items-center gap-5 text-white">
                <span className="flex items-center gap-1.5 text-sm">
                  <Heart className="w-4 h-4" /> {post.likes_count}
                </span>
                <span className="flex items-center gap-1.5 text-sm">
                  <MessageCircle className="w-4 h-4" /> {post.comments_count}
                </span>
                <span className="flex items-center gap-1.5 text-sm">
                  <Share2 className="w-4 h-4" /> {post.shares_count}
                </span>
                {post.duration_seconds && (
                  <span className="flex items-center gap-1.5 text-sm ml-auto">
                    <Volume2 className="w-4 h-4" />
                    {Math.floor(post.duration_seconds / 60)}:{String(post.duration_seconds % 60).padStart(2, '0')}
                  </span>
                )}
              </div>
              {post.is_public ? (
                <span className="text-xs text-green-400 mt-1 inline-block">🌍 Public</span>
              ) : (
                <span className="text-xs text-amber-400 mt-1 inline-block">🔒 Privé</span>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MyPostViewerOverlay;
