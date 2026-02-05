/**
 * AudioFeedCard - Memoized audio card component for feed
 * OPTIMIZED: React.memo + proper cleanup of audio resources
 */

import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, MessageCircle, Share2, Bookmark, Play, Pause, SkipBack, SkipForward, Plus, Clock } from 'lucide-react';
import { triggerFeedback } from '@/utils/tamtamFeedback';

interface DiskTemplate {
  id: string;
  name: string;
  emoji: string;
  gradient: string;
  bgGradient: string;
  accentColor: string;
  decorEmojis: string[];
  category: 'patrimoine' | 'mavoix';
}

const diskTemplates: DiskTemplate[] = [
  { id: 'conte', name: 'Conte', emoji: '🦁', gradient: 'from-orange-400 to-orange-600', bgGradient: 'from-orange-500 via-orange-400 to-amber-300', accentColor: '#FF8C42', decorEmojis: ['🦁', '🐘', '🌙'], category: 'patrimoine' },
  { id: 'chant', name: 'Chant', emoji: '🥁', gradient: 'from-purple-400 to-purple-600', bgGradient: 'from-purple-600 via-violet-500 to-purple-400', accentColor: '#9B59B6', decorEmojis: ['🥁', '🎉', '💃'], category: 'patrimoine' },
  { id: 'proverbe', name: 'Proverbe', emoji: '🧓', gradient: 'from-amber-400 to-amber-600', bgGradient: 'from-amber-500 via-yellow-400 to-orange-300', accentColor: '#F39C12', decorEmojis: ['🧓', '🙏', '✨'], category: 'patrimoine' },
  { id: 'annonce', name: 'Annonce', emoji: '📢', gradient: 'from-cyan-400 to-cyan-600', bgGradient: 'from-cyan-500 via-teal-400 to-emerald-300', accentColor: '#00BCD4', decorEmojis: ['📢', '🔔', '💬'], category: 'mavoix' },
  { id: 'question', name: 'Question', emoji: '❓', gradient: 'from-blue-400 to-blue-600', bgGradient: 'from-blue-500 via-indigo-400 to-blue-300', accentColor: '#3498DB', decorEmojis: ['❓', '🤔', '💭'], category: 'mavoix' },
  { id: 'merci', name: 'Merci', emoji: '🙏', gradient: 'from-emerald-400 to-emerald-600', bgGradient: 'from-emerald-500 via-teal-400 to-green-300', accentColor: '#2ECC71', decorEmojis: ['🙏', '💚', '🌟'], category: 'mavoix' },
];

const getTemplateById = (id: string | undefined, category: 'patrimoine' | 'mavoix'): DiskTemplate => {
  const found = diskTemplates.find(t => t.id === id);
  if (found) return found;
  return category === 'patrimoine' ? diskTemplates[0] : diskTemplates[3];
};

const formatPublicationDate = (dateString: string | null): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const months = ['janv.', 'fév.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${day} ${month} ${year}, ${hours}:${minutes}`;
};

interface AudioFeedCardProps {
  post: any;
  isActive: boolean;
  onLike: () => void;
  onComment: () => void;
  onShare: () => void;
  category: 'patrimoine' | 'mavoix';
}

const AudioFeedCardComponent: React.FC<AudioFeedCardProps> = ({
  post,
  isActive,
  onLike,
  onComment,
  onShare,
  category
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const navigate = useNavigate();

  const template = getTemplateById(post.template_id, category);
  const totalLikes = (post.reactions?.like || 0) + (post.reactions?.love || 0) + (post.reactions?.laugh || 0);

  // Auto-play/pause based on isActive
  useEffect(() => {
    if (!audioRef.current) return;
    
    if (isActive && !isPlaying) {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    } else if (!isActive && isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, [isActive, isPlaying]);

  // Cleanup audio on unmount
  useEffect(() => {
    const audio = audioRef.current;
    return () => {
      if (audio) {
        audio.pause();
        audio.src = '';
      }
    };
  }, []);

  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      const pct = (audioRef.current.currentTime / audioRef.current.duration) * 100;
      setProgress(pct || 0);
    }
  }, []);

  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
    triggerFeedback('click');
  }, [isPlaying]);

  const skipBack = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 10);
    }
  }, []);

  const skipForward = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.min(audioRef.current.duration, audioRef.current.currentTime + 10);
    }
  }, []);

  const handleFollow = useCallback(() => {
    setIsFollowing(true);
    triggerFeedback('success');
  }, []);

  const handleLike = useCallback(() => {
    setIsLiked(prev => !prev);
    onLike();
    triggerFeedback('notification');
  }, [onLike]);

  return (
    <div className="h-[100dvh] h-screen w-screen max-w-full snap-start snap-always relative overflow-hidden">
      {/* Background gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br ${template.bgGradient}`} />
      <div className="absolute inset-0 bg-black/20" />
      
      {/* Audio element */}
      <audio
        ref={audioRef}
        src={post.audio_url}
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => setIsPlaying(false)}
        preload={isActive ? 'auto' : 'none'}
      />
      
      {/* Decorative emojis */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {template.decorEmojis.map((emoji, i) => (
          <motion.span
            key={i}
            className="absolute text-6xl opacity-10"
            style={{ 
              left: `${20 + i * 30}%`, 
              top: `${15 + i * 20}%`,
              transform: `rotate(${i * 15}deg)`
            }}
            animate={{ y: [0, -20, 0], rotate: [0, 10, 0] }}
            transition={{ duration: 4 + i, repeat: Infinity }}
          >
            {emoji}
          </motion.span>
        ))}
      </div>

      {/* Center vinyl disc */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div 
          className={`w-64 h-64 rounded-full bg-gradient-to-br ${template.gradient} shadow-2xl flex items-center justify-center border-4 border-white/30`}
          animate={isPlaying ? { rotate: 360 } : {}}
          transition={isPlaying ? { duration: 3, repeat: Infinity, ease: 'linear' } : {}}
        >
          {/* Vinyl grooves */}
          <div className="w-56 h-56 rounded-full border-2 border-white/10 flex items-center justify-center">
            <div className="w-48 h-48 rounded-full border border-white/10 flex items-center justify-center">
              {/* Center label */}
              <div className="w-24 h-24 rounded-full bg-black/40 flex items-center justify-center shadow-inner">
                <span className="text-5xl">{template.emoji}</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Play controls */}
      <div className="absolute bottom-40 left-0 right-0 flex items-center justify-center gap-6">
        <motion.button whileTap={{ scale: 0.9 }} onClick={skipBack} className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
          <SkipBack className="w-5 h-5 text-white" />
        </motion.button>
        
        <motion.button whileTap={{ scale: 0.9 }} onClick={togglePlay} className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-lg">
          {isPlaying ? (
            <Pause className="w-7 h-7 text-gray-800 fill-gray-800" />
          ) : (
            <Play className="w-7 h-7 text-gray-800 fill-gray-800 ml-1" />
          )}
        </motion.button>
        
        <motion.button whileTap={{ scale: 0.9 }} onClick={skipForward} className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
          <SkipForward className="w-5 h-5 text-white" />
        </motion.button>
      </div>

      {/* Progress bar */}
      <div className="absolute bottom-32 left-8 right-8">
        <div className="h-1 bg-white/30 rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-white rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Publication time */}
      {post.created_at && (
        <div className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/20 backdrop-blur-sm safe-area-top">
          <Clock className="w-3.5 h-3.5 text-white/70" />
          <span className="text-white/70 text-xs">{formatPublicationDate(post.created_at)}</span>
        </div>
      )}

      {/* Right sidebar */}
      <div className="absolute right-4 bottom-44 flex flex-col items-center gap-5">
        <motion.button whileTap={{ scale: 0.85 }} onClick={handleLike} className="flex flex-col items-center">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isLiked ? 'bg-red-500' : 'bg-black/30'}`}>
            <Heart className={`w-6 h-6 ${isLiked ? 'text-white fill-white' : 'text-white'}`} />
          </div>
          <span className="text-white text-[10px] mt-0.5">{totalLikes + (isLiked ? 1 : 0)}</span>
        </motion.button>
        
        <motion.button whileTap={{ scale: 0.85 }} onClick={onComment} className="flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-black/30 flex items-center justify-center">
            <MessageCircle className="w-6 h-6 text-white" />
          </div>
          <span className="text-white text-[10px] mt-0.5">{post.comments_count || 0}</span>
        </motion.button>
        
        <motion.button whileTap={{ scale: 0.85 }} onClick={onShare} className="flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-black/30 flex items-center justify-center">
            <Share2 className="w-6 h-6 text-white" />
          </div>
          <span className="text-white text-[10px] mt-0.5">Partager</span>
        </motion.button>
        
        <motion.button 
          whileTap={{ scale: 0.85 }} 
          onClick={() => { setIsSaved(!isSaved); triggerFeedback('success'); }} 
          className="flex flex-col items-center"
        >
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isSaved ? 'bg-amber-500' : 'bg-black/30'}`}>
            <Bookmark className={`w-6 h-6 ${isSaved ? 'text-white fill-white' : 'text-white'}`} />
          </div>
          <span className="text-white text-[10px] mt-0.5">{isSaved ? 'Sauvé' : 'Sauver'}</span>
        </motion.button>
      </div>

      {/* Author avatar bottom left */}
      <div className="absolute left-4 bottom-24">
        <div className="relative">
          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#FF7A00] to-[#FF5500] flex items-center justify-center border-2 border-white shadow-lg">
            <span className="text-lg">👤</span>
          </div>
          {!isFollowing && (
            <motion.button 
              whileTap={{ scale: 0.9 }} 
              onClick={handleFollow} 
              className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-[#FF7A00] flex items-center justify-center"
            >
              <Plus className="w-3 h-3 text-white" strokeWidth={3} />
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
};

// Memoize to prevent unnecessary re-renders
export const AudioFeedCard = memo(AudioFeedCardComponent, (prevProps, nextProps) => {
  return (
    prevProps.post.id === nextProps.post.id &&
    prevProps.isActive === nextProps.isActive
  );
});

export default AudioFeedCard;
