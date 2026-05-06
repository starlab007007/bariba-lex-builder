import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Repeat, ChevronDown } from 'lucide-react';

interface FullscreenAudioPlayerProps {
  isOpen: boolean;
  onClose: () => void;
  post: any;
  accentColor?: string;
  emoji?: string;
  gradient?: string;
}

const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5, 2] as const;

export const FullscreenAudioPlayer: React.FC<FullscreenAudioPlayerProps> = ({
  isOpen, onClose, post, accentColor = '#FF8C42', emoji = '🎙️', gradient = 'from-orange-500 to-amber-400',
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [isLooping, setIsLooping] = useState(false);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  useEffect(() => {
    if (!isOpen) {
      audioRef.current?.pause();
      setIsPlaying(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onMeta = () => { if (audio.duration && isFinite(audio.duration)) setDuration(audio.duration); };
    const onUpdate = () => {
      if (!audio.duration || !isFinite(audio.duration)) return;
      setCurrentTime(audio.currentTime);
      setProgress((audio.currentTime / audio.duration) * 100);
    };
    const onEnded = () => {
      if (isLooping) { audio.currentTime = 0; audio.play(); }
      else { setIsPlaying(false); setProgress(0); setCurrentTime(0); }
    };
    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('timeupdate', onUpdate);
    audio.addEventListener('ended', onEnded);
    if (audio.duration && isFinite(audio.duration)) setDuration(audio.duration);
    return () => { audio.removeEventListener('loadedmetadata', onMeta); audio.removeEventListener('timeupdate', onUpdate); audio.removeEventListener('ended', onEnded); };
  }, [isLooping]);

  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;
    if (isPlaying) { audioRef.current.pause(); setIsPlaying(false); }
    else { audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {}); }
  }, [isPlaying]);

  const seek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audioRef.current.currentTime = pct * duration;
  }, [duration]);

  const cycleSpeed = useCallback(() => {
    const idx = SPEED_OPTIONS.indexOf(speed as any);
    const next = SPEED_OPTIONS[(idx + 1) % SPEED_OPTIONS.length];
    setSpeed(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  }, [speed]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 280 }}
          className="fixed inset-0 z-[200] flex flex-col"
          style={{ background: '#0A0A0A' }}
        >
          <audio ref={audioRef} src={post?.audio_url} preload="auto" />

          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-14 pb-4">
            <motion.button whileTap={{ scale: 0.9 }} onClick={onClose} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
              <ChevronDown className="w-5 h-5 text-white" />
            </motion.button>
            <div className="text-center flex-1 px-4">
              <p className="text-white/60 text-xs font-medium uppercase tracking-wider">En écoute</p>
            </div>
            <div className="w-10" />
          </div>

          {/* Artwork */}
          <div className="flex-1 flex flex-col items-center justify-center px-8">
            <div className="relative mb-8">
              {isPlaying && (
                <motion.div className="absolute -inset-8 rounded-full"
                  style={{ background: `radial-gradient(circle, ${accentColor}40 0%, transparent 70%)` }}
                  animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                />
              )}
              <motion.div
                className={`w-56 h-56 sm:w-64 sm:h-64 rounded-full bg-gradient-to-br ${gradient} shadow-2xl flex items-center justify-center border-4 border-white/20`}
                animate={isPlaying ? { rotate: 360 } : {}}
                transition={isPlaying ? { duration: 4, repeat: Infinity, ease: 'linear' } : {}}
              >
                <div className="w-44 h-44 sm:w-52 sm:h-52 rounded-full border-2 border-white/10 flex items-center justify-center">
                  <div className="w-24 h-24 rounded-full bg-black/50 flex items-center justify-center shadow-inner">
                    <span className="text-5xl">{emoji}</span>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Title & Author */}
            <div className="text-center mb-6 px-4 w-full max-w-sm">
              <h2 className="text-white text-xl font-bold leading-tight mb-1 line-clamp-2">
                {post?.title || post?.transcript_fr?.slice(0, 60) || 'Audio'}
              </h2>
              <p className="text-white/50 text-sm">{post?.profile?.display_name || 'Utilisateur'}</p>
            </div>
          </div>

          {/* Controls */}
          <div className="px-6 pb-10 space-y-4">
            {/* Progress bar */}
            <div>
              <div className="w-full h-2 rounded-full bg-white/10 cursor-pointer relative" onClick={seek}>
                <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: accentColor }} />
                <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white shadow-md" style={{ left: `calc(${progress}% - 8px)` }} />
              </div>
              <div className="flex justify-between mt-1.5">
                <span className="text-white/40 text-xs tabular-nums">{formatTime(currentTime)}</span>
                <span className="text-white/40 text-xs tabular-nums">{duration > 0 ? formatTime(duration) : '--:--'}</span>
              </div>
            </div>

            {/* Main controls */}
            <div className="flex items-center justify-center gap-6">
              <motion.button whileTap={{ scale: 0.85 }} onClick={() => { if (audioRef.current) audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 15); }}
                className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                <SkipBack className="w-5 h-5 text-white" />
              </motion.button>

              <motion.button whileTap={{ scale: 0.9 }} onClick={togglePlay}
                className="w-18 h-18 rounded-full flex items-center justify-center shadow-xl" style={{ width: 72, height: 72, background: accentColor }}>
                {isPlaying ? <Pause className="w-8 h-8 text-white fill-white" /> : <Play className="w-8 h-8 text-white fill-white ml-1" />}
              </motion.button>

              <motion.button whileTap={{ scale: 0.85 }} onClick={() => { if (audioRef.current) audioRef.current.currentTime = Math.min(duration, audioRef.current.currentTime + 15); }}
                className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                <SkipForward className="w-5 h-5 text-white" />
              </motion.button>
            </div>

            {/* Secondary controls */}
            <div className="flex items-center justify-center gap-4">
              <motion.button whileTap={{ scale: 0.9 }} onClick={cycleSpeed}
                className="px-3 py-1.5 rounded-full text-xs font-bold"
                style={{ background: speed !== 1 ? `${accentColor}30` : 'rgba(255,255,255,0.1)', color: speed !== 1 ? accentColor : 'rgba(255,255,255,0.6)' }}>
                {speed}x
              </motion.button>
              <motion.button whileTap={{ scale: 0.9 }} onClick={() => setIsLooping(!isLooping)}
                className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{ background: isLooping ? `${accentColor}30` : 'rgba(255,255,255,0.1)' }}>
                <Repeat className="w-4 h-4" style={{ color: isLooping ? accentColor : 'rgba(255,255,255,0.5)' }} />
              </motion.button>
              <motion.button whileTap={{ scale: 0.9 }} onClick={() => { setIsMuted(!isMuted); if (audioRef.current) audioRef.current.muted = !isMuted; }}
                className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{ background: isMuted ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.1)' }}>
                {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-white/50" />}
              </motion.button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FullscreenAudioPlayer;