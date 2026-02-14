import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { X, Heart, MessageCircle, Trash2, Edit, Lock, Globe, ChevronUp, ChevronDown, Play, Pause, Volume2 } from 'lucide-react';
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
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const post = posts[currentIndex];

  useEffect(() => {
    setCurrentIndex(initialIndex);
    setDeleteConfirm(false);
  }, [initialIndex, isOpen]);

  useEffect(() => {
    // Cleanup audio/video on index change
    audioRef.current?.pause();
    videoRef.current?.pause();
    setIsPlaying(false);
    setDeleteConfirm(false);
  }, [currentIndex]);

  const goNext = () => {
    if (currentIndex < posts.length - 1) setCurrentIndex(i => i + 1);
  };
  const goPrev = () => {
    if (currentIndex > 0) setCurrentIndex(i => i - 1);
  };

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.y < -60) goNext();
    else if (info.offset.y > 60) goPrev();
  };

  const togglePlay = () => {
    if (post.media_type === 'video' && videoRef.current) {
      if (isPlaying) videoRef.current.pause();
      else videoRef.current.play();
      setIsPlaying(!isPlaying);
    } else if (post.audio_url) {
      if (!audioRef.current) {
        audioRef.current = new Audio(post.audio_url);
        audioRef.current.onended = () => setIsPlaying(false);
      }
      if (isPlaying) audioRef.current.pause();
      else audioRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  const handleDelete = () => {
    if (deleteConfirm) {
      onDelete(post.id);
      if (posts.length <= 1) onClose();
      else if (currentIndex >= posts.length - 1) setCurrentIndex(i => i - 1);
      setDeleteConfirm(false);
    } else {
      setDeleteConfirm(true);
      setTimeout(() => setDeleteConfirm(false), 3000);
    }
  };

  if (!post) return null;

  const hasVideo = post.media_type === 'video' && post.media_url;
  const hasImage = (post.media_type === 'image' || post.media_type === 'photo') && post.media_url;
  const hasThumbnail = post.thumbnail_url;

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
                  <p className="text-white/60 text-sm text-center max-w-[250px] line-clamp-3">
                    {post.transcript_fr || post.transcript_ba || 'Publication audio'}
                  </p>
                </div>
              )}

              {/* Play overlay for audio-only or paused video */}
              {(!hasVideo || !isPlaying) && post.audio_url && (
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={togglePlay}
                  className="absolute bottom-24 left-1/2 -translate-x-1/2 w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center"
                >
                  {isPlaying ? (
                    <Pause className="w-7 h-7 text-white" />
                  ) : (
                    <Play className="w-7 h-7 text-white ml-1" fill="white" />
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
            <div className="absolute right-4 bottom-32 flex flex-col gap-4 z-10">
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

            {/* Bottom stats bar */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
              <div className="flex items-center gap-6 text-white">
                <span className="flex items-center gap-1.5 text-sm">
                  <Heart className="w-4 h-4" /> {post.likes_count}
                </span>
                <span className="flex items-center gap-1.5 text-sm">
                  <MessageCircle className="w-4 h-4" /> {post.comments_count}
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
