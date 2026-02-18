/**
 * AudioFeedCard - Memoized audio card component for feed
 * FEATURES: Karaoke sync + Speed control + Mute + Navigation + Badge type
 */

import React, { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, MessageCircle, Share2, Bookmark, Play, Pause, SkipBack, SkipForward, Plus, Clock, Mic, RefreshCw, Volume2, VolumeX } from 'lucide-react';
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
  if (!id) return category === 'patrimoine' ? diskTemplates[0] : diskTemplates[3];
  const found = diskTemplates.find(t => t.id === id || id.startsWith(t.id));
  if (found) return found;
  const byKeyword = diskTemplates.find(t => id.includes(t.id));
  if (byKeyword) return byKeyword;
  return category === 'patrimoine' ? diskTemplates[0] : diskTemplates[3];
};

const formatPublicationDate = (dateString: string | null): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const months = ['janv.', 'fév.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}, ${date.getHours().toString().padStart(2,'0')}:${date.getMinutes().toString().padStart(2,'0')}`;
};

const SPEED_CYCLE = [1, 1.5, 2, 0.75] as const;

// ── Karaoke word display ──
const KaraokeDisplay: React.FC<{ words: string[]; activeIndex: number; isPlaying: boolean }> = ({ words, activeIndex, isPlaying }) => {
  if (words.length === 0) return null;

  // Au repos : afficher tous les mots (jusqu'à 25). En lecture : fenêtre glissante autour du mot actif
  const showAll = !isPlaying || activeIndex < 0;
  const windowStart = showAll ? 0 : Math.max(0, activeIndex - 3);
  const windowEnd = showAll ? Math.min(words.length - 1, 24) : Math.min(words.length - 1, windowStart + 8);
  const visibleWords = words.slice(windowStart, windowEnd + 1);
  const relativeActive = activeIndex - windowStart;

  return (
    <div className="w-full max-w-xs rounded-2xl px-4 py-3 mb-3"
      style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.12)' }}
    >
      <div className="flex flex-wrap justify-center gap-x-1.5 gap-y-1 min-h-[2.5rem]">
        {visibleWords.map((word, i) => {
          const isCurrent = !showAll && i === relativeActive;
          const isPast = !showAll && i < relativeActive;
          return (
            <motion.span
              key={`${windowStart + i}-${word}`}
              animate={isCurrent ? { scale: [1, 1.15, 1.1], opacity: 1 } : {}}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="text-sm leading-snug transition-all duration-200"
              style={{
                color: isCurrent ? '#FFFFFF' : isPast ? 'rgba(255,255,255,0.45)' : showAll ? 'rgba(255,255,255,0.80)' : 'rgba(255,255,255,0.60)',
                textShadow: isCurrent ? '0 0 18px rgba(255,200,100,0.9), 0 0 32px rgba(255,140,66,0.6)' : 'none',
                fontWeight: isCurrent ? 800 : isPast ? 400 : 500,
              }}
            >
              {word}
            </motion.span>
          );
        })}
        {showAll && words.length > 25 && (
          <span className="text-white/40 text-xs">…</span>
        )}
      </div>
      {/* Indicateur live — uniquement en lecture */}
      {isPlaying && activeIndex >= 0 && (
        <div className="flex items-center justify-center gap-1 mt-1.5">
          {[0, 1, 2].map(i => (
            <motion.div key={i} className="w-1 h-1 rounded-full bg-white/60"
              animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
              transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }}
            />
          ))}
          <span className="text-white/40 text-[9px] ml-1 font-medium tracking-wide">EN DIRECT</span>
        </div>
      )}
    </div>
  );
};

interface AudioFeedCardProps {
  post: any;
  isActive: boolean;
  onLike: () => void;
  onComment: () => void;
  onShare: () => void;
  category: 'patrimoine' | 'mavoix';
  onNext?: () => void;
  onPrevious?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
}

const AudioFeedCardComponent: React.FC<AudioFeedCardProps> = ({
  post, isActive, onLike, onComment, onShare, category,
  onNext, onPrevious, hasPrevious, hasNext,
}) => {
  const navigate = useNavigate();
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(post.duration_seconds || 0);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [isMuted, setIsMuted] = useState(false);
  const [activeWordIndex, setActiveWordIndex] = useState(-1);
  const audioRef = useRef<HTMLAudioElement>(null);

  const template = getTemplateById(post.template_id, category);
  const totalLikes = (post.reactions?.like || 0) + (post.reactions?.love || 0) + (post.reactions?.laugh || 0);
  const hasAudio = post.audio_url && post.audio_url.trim().length > 0;

  const words = useMemo(() => {
    if (!post.transcript_fr) return [];
    return post.transcript_fr.trim().split(/\s+/).filter(Boolean);
  }, [post.transcript_fr]);

  // Auto-play/pause based on isActive
  useEffect(() => {
    if (!audioRef.current) return;
    if (!isActive && isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, [isActive, isPlaying]);

  // Reset on post change
  useEffect(() => {
    setIsPlaying(false);
    setProgress(0);
    setCurrentTime(0);
    setActiveWordIndex(-1);
    setPlaybackRate(1);
    setIsMuted(false);
  }, [post.id]);

  // Audio events + karaoke sync
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onMeta = () => {
      if (audio.duration && isFinite(audio.duration)) setAudioDuration(audio.duration);
    };
    const onUpdate = () => {
      const dur = audio.duration;
      if (!dur || !isFinite(dur)) return;
      const ct = audio.currentTime;
      setProgress((ct / dur) * 100);
      setCurrentTime(ct);
      if (words.length > 0) {
        const wordDuration = dur / words.length;
        setActiveWordIndex(Math.min(Math.floor(ct / wordDuration), words.length - 1));
      }
    };
    const onEnded = () => { setIsPlaying(false); setProgress(0); setCurrentTime(0); setActiveWordIndex(-1); };

    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('timeupdate', onUpdate);
    audio.addEventListener('ended', onEnded);
    if (audio.duration && isFinite(audio.duration)) setAudioDuration(audio.duration);

    return () => {
      audio.removeEventListener('loadedmetadata', onMeta);
      audio.removeEventListener('timeupdate', onUpdate);
      audio.removeEventListener('ended', onEnded);
    };
  }, [hasAudio, words]);

  // Cleanup on unmount
  useEffect(() => {
    const audio = audioRef.current;
    return () => { if (audio) { audio.pause(); audio.src = ''; } };
  }, []);

  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;
    if (isPlaying) { audioRef.current.pause(); setIsPlaying(false); }
    else { audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {}); }
    triggerFeedback('click');
  }, [isPlaying]);

  const skipBack = useCallback(() => {
    if (audioRef.current) audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 10);
  }, []);
  const skipForward = useCallback(() => {
    if (audioRef.current) audioRef.current.currentTime = Math.min(audioRef.current.duration || 0, audioRef.current.currentTime + 10);
  }, []);

  const cycleSpeed = useCallback(() => {
    const idx = SPEED_CYCLE.indexOf(playbackRate as any);
    const next = SPEED_CYCLE[(idx + 1) % SPEED_CYCLE.length];
    setPlaybackRate(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
    triggerFeedback('click');
  }, [playbackRate]);

  const toggleMuteHandler = useCallback(() => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    if (audioRef.current) audioRef.current.muted = newMuted;
    triggerFeedback('click');
  }, [isMuted]);

  const handleFollow = useCallback(() => { setIsFollowing(true); triggerFeedback('success'); }, []);
  const handleLike = useCallback(() => { setIsLiked(prev => !prev); onLike(); triggerFeedback('notification'); }, [onLike]);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const speedLabel = playbackRate === 1 ? '1x' : playbackRate === 0.75 ? '¾x' : `${playbackRate}x`;

  return (
    <div className="h-[100dvh] h-screen w-screen max-w-full snap-start snap-always relative overflow-hidden">
      {/* Background gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br ${template.bgGradient}`} />
      <div className="absolute inset-0 bg-black/20" />

      {/* Audio element */}
      <audio ref={audioRef} src={post.audio_url} onEnded={() => setIsPlaying(false)} preload={isActive ? 'auto' : 'none'} />

      {/* Decorative emojis */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {template.decorEmojis.map((emoji, i) => (
          <motion.span key={i} className="absolute text-6xl opacity-10"
            style={{ left: `${20 + i * 30}%`, top: `${15 + i * 20}%`, transform: `rotate(${i * 15}deg)` }}
            animate={{ y: [0, -20, 0], rotate: [0, 10, 0] }}
            transition={{ duration: 4 + i, repeat: Infinity }}
          >{emoji}</motion.span>
        ))}
      </div>

      {/* ── TOP BAR: Navigation + Badge type ── */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 pt-12 pb-2 z-10"
        style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, transparent 100%)' }}
      >
        <motion.button whileTap={{ scale: 0.9 }} onClick={onPrevious} disabled={!hasPrevious}
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: hasPrevious ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.07)' }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 11L3 7l4-4M11 7H3" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity={hasPrevious ? 1 : 0.35}/>
          </svg>
        </motion.button>

        <motion.button whileTap={{ scale: 0.9 }} onClick={onNext} disabled={!hasNext}
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: hasNext ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.07)' }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 3l4 4-4 4M3 7h8" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity={hasNext ? 1 : 0.35}/>
          </svg>
        </motion.button>
      </div>

      {/* Center vinyl disc */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative">
          {isPlaying && (
            <motion.div className="absolute -inset-6 rounded-full"
              style={{ background: `radial-gradient(circle, ${template.accentColor}30 0%, transparent 70%)` }}
              animate={{ scale: [1, 1.08, 1], opacity: [0.4, 0.7, 0.4] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            />
          )}
          <motion.div
            className={`w-52 h-52 rounded-full bg-gradient-to-br ${template.gradient} shadow-2xl flex items-center justify-center border-4 border-white/30`}
            animate={isPlaying ? { rotate: 360 } : {}}
            transition={isPlaying ? { duration: 3, repeat: Infinity, ease: 'linear' } : {}}
          >
            <div className="w-44 h-44 rounded-full border-2 border-white/10 flex items-center justify-center">
              <div className="w-36 h-36 rounded-full border border-white/10 flex items-center justify-center">
                <div className="w-20 h-20 rounded-full bg-black/40 flex items-center justify-center shadow-inner">
                  <span className="text-4xl">{template.emoji}</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Bottom content */}
      <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center px-4 pb-32">
        {/* Follow + Author */}
        <div className="flex items-center gap-3 mb-3">
          <span className="text-white/70 text-sm font-medium">{post.profile?.display_name || 'Utilisateur'}</span>
          {!isFollowing && (
            <motion.button whileTap={{ scale: 0.9 }} onClick={handleFollow}
              className="px-3 py-1 rounded-full text-white text-xs font-bold"
              style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.35)' }}
            >+ Suivre</motion.button>
          )}
        </div>

        {/* ── KARAOKE ── */}
        {words.length > 0 ? (
          <KaraokeDisplay words={words} activeIndex={activeWordIndex} isPlaying={isPlaying} />
        ) : post.transcript_fr ? (
          <div className="w-full max-w-xs rounded-xl px-4 py-2.5 mb-3"
            style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(10px)' }}
          >
            <p className="text-white/80 text-center text-xs leading-relaxed">"{post.transcript_fr.slice(0, 90)}..."</p>
          </div>
        ) : null}

        {/* Play controls */}
        <div className="flex items-center justify-center gap-5 mb-3">
          <span className="text-white/60 text-xs tabular-nums w-9 text-right">{formatTime(currentTime)}</span>
          <motion.button whileTap={{ scale: 0.9 }} onClick={skipBack}
            className="w-11 h-11 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.2)' }}
          >
            <SkipBack className="w-5 h-5 text-white" />
          </motion.button>
          <motion.button whileTap={{ scale: 0.9 }} onClick={togglePlay}
            className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-lg"
          >
            {isPlaying
              ? <Pause className="w-7 h-7 text-gray-800 fill-gray-800" />
              : <Play className="w-7 h-7 text-gray-800 fill-gray-800 ml-1" />
            }
          </motion.button>
          <motion.button whileTap={{ scale: 0.9 }} onClick={skipForward}
            className="w-11 h-11 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.2)' }}
          >
            <SkipForward className="w-5 h-5 text-white" />
          </motion.button>
          <span className="text-white/60 text-xs tabular-nums w-9">{audioDuration > 0 ? formatTime(audioDuration) : '--:--'}</span>
        </div>

        {/* Progress bar */}
        <div className="w-full max-w-xs h-1 bg-white/20 rounded-full overflow-hidden mb-3">
          <motion.div className="h-full bg-white rounded-full" style={{ width: `${progress}%` }} />
        </div>

        {/* Speed & Mute */}
        <div className="flex items-center gap-2">
          <motion.button whileTap={{ scale: 0.9 }} onClick={cycleSpeed}
            className="px-3 py-1.5 rounded-full text-xs font-bold transition-all"
            style={{
              background: playbackRate !== 1 ? 'rgba(255,200,80,0.3)' : 'rgba(255,255,255,0.18)',
              color: playbackRate !== 1 ? '#FFD166' : 'white',
              border: playbackRate !== 1 ? '1px solid rgba(255,200,80,0.5)' : '1px solid transparent',
            }}
          >{speedLabel}</motion.button>
          <motion.button whileTap={{ scale: 0.9 }} onClick={toggleMuteHandler}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-all"
            style={{
              background: isMuted ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.18)',
              border: isMuted ? '1px solid rgba(239,68,68,0.5)' : '1px solid transparent',
            }}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-white" />}
          </motion.button>
        </div>
      </div>

      {/* Publication time */}
      {post.created_at && (
        <div className="absolute top-4 right-16 flex items-center gap-1 px-2 py-1 rounded-full"
          style={{ background: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(8px)' }}
        >
          <Clock className="w-3 h-3 text-white/50" />
          <span className="text-white/50 text-[10px]">{formatPublicationDate(post.created_at)}</span>
        </div>
      )}

      {/* Right sidebar */}
      <div className="absolute right-4 bottom-36 flex flex-col items-center gap-4">
        <motion.button whileTap={{ scale: 0.85 }} onClick={handleLike} className="flex flex-col items-center">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isLiked ? 'bg-red-500' : 'bg-black/30'}`}>
            <Heart className={`w-6 h-6 ${isLiked ? 'text-white fill-white' : 'text-white'}`} />
          </div>
          <span className="text-white text-[10px] mt-0.5">{totalLikes + (isLiked ? 1 : 0)}</span>
        </motion.button>

        <motion.button whileTap={{ scale: 0.85 }} onClick={onComment} className="flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-black/30 flex items-center justify-center">
            <Mic className="w-6 h-6 text-white" />
          </div>
          <span className="text-white text-[10px] mt-0.5">{post.comments_count || 0}</span>
        </motion.button>

        <motion.button whileTap={{ scale: 0.85 }} onClick={onShare} className="flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-black/30 flex items-center justify-center">
            <Share2 className="w-6 h-6 text-white" />
          </div>
          <span className="text-white text-[10px] mt-0.5">Partager</span>
        </motion.button>

        <motion.button whileTap={{ scale: 0.85 }}
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
      <div className="absolute left-4 bottom-36">
        <div className="relative">
          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#FF7A00] to-[#FF5500] flex items-center justify-center border-2 border-white shadow-lg">
            <span className="text-lg">👤</span>
          </div>
          {!isFollowing && (
            <motion.button whileTap={{ scale: 0.9 }} onClick={handleFollow}
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

export const AudioFeedCard = memo(AudioFeedCardComponent, (prevProps, nextProps) => {
  return (
    prevProps.post.id === nextProps.post.id &&
    prevProps.isActive === nextProps.isActive
  );
});

export default AudioFeedCard;
