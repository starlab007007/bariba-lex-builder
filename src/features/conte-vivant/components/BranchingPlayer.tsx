import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import KenBurnsPhoto from './KenBurnsPhoto';
import AudioWaveBar from './AudioWaveBar';
import ProgressDots from './ProgressDots';
import ChoiceOverlay from './ChoiceOverlay';
import EndingCard from './EndingCard';
import SegmentTransition from './SegmentTransition';
import type { StoryGraph, StorySegment } from '../types/story.types';

interface BranchingPlayerProps {
  graph: StoryGraph;
  storyId?: string;
  onClose: () => void;
  onComplete?: (pathTaken: string[], endingsUnlocked: string[]) => void;
}

export default function BranchingPlayer({ graph, onClose }: BranchingPlayerProps) {
  const [currentId, setCurrentId] = useState(graph.entry_segment);
  const [segKey, setSegKey] = useState(0);
  const [phase, setPhase] = useState<'playing' | 'choosing' | 'transitioning' | 'ending'>('playing');
  const [path, setPath] = useState<string[]>([]);
  const [endingsFound, setEndingsFound] = useState<Array<{ icon: string; name: string }>>([]);
  const [isPlaying, setIsPlaying] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const videoRef = useRef<HTMLVideoElement>(null);
  const narrationRef = useRef<HTMLAudioElement>(null);
  const bgMusicRef = useRef<HTMLAudioElement>(null);

  const seg = graph.segments[currentId];
  const totalEndings = Object.values(graph.segments).filter(s => s.is_ending).length;
  const maxDepth = Math.max(3, path.length + 2);

  // Audio playback for narration + background music
  useEffect(() => {
    if (phase !== 'playing' || !seg) return;

    const narrationUrl = seg.narrator_audio_url || seg.audio_url;
    if (narrationRef.current) {
      if (narrationUrl) {
        narrationRef.current.src = narrationUrl;
        narrationRef.current.play().catch(() => {});
      } else {
        narrationRef.current.pause();
        narrationRef.current.removeAttribute('src');
      }
    }

    if (bgMusicRef.current) {
      const musicUrl = seg.background_music_url;
      if (musicUrl && bgMusicRef.current.src !== musicUrl) {
        bgMusicRef.current.src = musicUrl;
        bgMusicRef.current.loop = true;
        bgMusicRef.current.volume = 0.25;
        bgMusicRef.current.play().catch(() => {});
      } else if (!musicUrl) {
        bgMusicRef.current.pause();
        bgMusicRef.current.removeAttribute('src');
      }
    }

    return () => {
      narrationRef.current?.pause();
    };
  }, [currentId, phase, seg]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      narrationRef.current?.pause();
      bgMusicRef.current?.pause();
    };
  }, []);

  // Timer: after durationSec → show choices or ending
  useEffect(() => {
    if (phase !== 'playing' || !seg) return;
    clearTimeout(timerRef.current);

    // For videos, wait for the video to end instead of using duration
    if (seg.mediaType === 'video') return;

    timerRef.current = setTimeout(() => {
      if (seg.is_ending) {
        setPhase('ending');
        trackEnding(seg);
      } else if (seg.is_choice_point && seg.choices?.length) {
        setPhase('choosing');
        try { navigator.vibrate?.(100); } catch {}
      }
    }, (seg.duration || 12) * 1000);

    return () => clearTimeout(timerRef.current);
  }, [currentId, phase, seg]);

  const trackEnding = useCallback((s: StorySegment) => {
    if (s.ending_badge && s.ending_title) {
      setEndingsFound(prev => {
        if (prev.some(e => e.name === s.ending_title)) return prev;
        return [...prev, { icon: s.ending_badge!, name: s.ending_title! }];
      });
    }
  }, []);

  const handleVideoEnded = useCallback(() => {
    if (!seg) return;
    if (seg.is_ending) {
      setPhase('ending');
      trackEnding(seg);
    } else if (seg.is_choice_point && seg.choices?.length) {
      setPhase('choosing');
      try { navigator.vibrate?.(100); } catch {}
    }
  }, [seg, trackEnding]);

  const goToSegment = useCallback((nextId: string) => {
    setPhase('transitioning');
    setTimeout(() => {
      setPath(p => [...p, currentId]);
      setCurrentId(nextId);
      setSegKey(k => k + 1);
      setPhase('playing');
      setIsPlaying(true);
    }, 300);
  }, [currentId]);

  const handleChoice = useCallback((choiceId: string) => {
    const choice = seg?.choices?.find(c => c.id === choiceId);
    if (choice) {
      try { navigator.vibrate?.(50); } catch {}
      goToSegment(choice.next_segment);
    }
  }, [seg, goToSegment]);

  const handleTimeout = useCallback(() => {
    const def = seg?.choices?.find(c => c.is_default) || seg?.choices?.[0];
    if (def) goToSegment(def.next_segment);
  }, [seg, goToSegment]);

  const handleReplay = () => {
    setCurrentId(graph.entry_segment);
    setPath([]);
    setSegKey(k => k + 1);
    setPhase('playing');
    setIsPlaying(true);
  };

  const handleTap = () => {
    if (phase === 'playing') {
      setIsPlaying(p => {
        if (videoRef.current) {
          if (p) videoRef.current.pause();
          else videoRef.current.play();
        }
        return !p;
      });
    }
  };

  // Get media URL
  const mediaUrl = seg?.media_url || seg?.video_url || seg?.image_urls?.[0];
  const isVideo = seg?.mediaType === 'video' || !!seg?.video_url;

  if (!seg) return null;

  return (
    <div
      className="relative w-full h-full overflow-hidden"
      style={{ backgroundColor: '#08080c' }}
      onClick={handleTap}
    >
      {/* Close button */}
      <button
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        className="absolute top-4 left-4 z-[60] w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center"
      >
        <X className="w-5 h-5 text-white" />
      </button>

      {/* Progress dots */}
      <ProgressDots current={path.length} total={maxDepth} />

      {/* Media layer */}
      <AnimatePresence mode="wait">
        <motion.div
          key={segKey}
          initial={{ opacity: 0 }}
          animate={{
            opacity: 1,
            scale: phase === 'choosing' ? 0.85 : 1,
            filter: phase === 'choosing' ? 'blur(4px)' : 'blur(0px)',
          }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="absolute inset-0"
        >
          {isVideo && mediaUrl ? (
            <video
              ref={videoRef}
              src={mediaUrl}
              className="w-full h-full object-cover"
              autoPlay
              playsInline
              loop
              onEnded={handleVideoEnded}
            />
          ) : mediaUrl ? (
            <KenBurnsPhoto src={mediaUrl} segKey={segKey} />
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0f0f18, #161622)' }}>
              <span className="text-6xl">{seg.ending_badge || '📖'}</span>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Dark overlay for choices */}
      <AnimatePresence>
        {phase === 'choosing' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[35] bg-black/40"
          />
        )}
      </AnimatePresence>

      {/* Audio wave bar */}
      <AudioWaveBar isPlaying={isPlaying && phase === 'playing'} />

      {/* Choice overlay */}
      <AnimatePresence>
        {phase === 'choosing' && seg.choices && seg.choices.length > 0 && (
          <ChoiceOverlay
            choices={seg.choices}
            onChoice={handleChoice}
            onTimeout={handleTimeout}
            timerDuration={5}
          />
        )}
      </AnimatePresence>

      {/* Transition */}
      <SegmentTransition show={phase === 'transitioning'} onMidpoint={() => {}} />

      {/* Audio elements (hidden) */}
      <audio ref={narrationRef} preload="auto" />
      <audio ref={bgMusicRef} preload="auto" />

      {/* Ending */}
      <AnimatePresence>
        {phase === 'ending' && (
          <EndingCard
            badge={{ icon: seg.ending_badge || '🏆', name: seg.ending_title || 'Fin' }}
            totalEndings={totalEndings}
            discoveredEndings={endingsFound}
            onReplay={handleReplay}
            onShare={() => {
              if (navigator.share) {
                navigator.share({ title: 'Conte Vivant', text: `J'ai obtenu le badge ${seg.ending_badge} !` }).catch(() => {});
              }
            }}
            onNext={onClose}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
