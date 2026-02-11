import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useStoryGraph } from '../hooks/useStoryGraph';
import { useBranchPreload } from '../hooks/useBranchPreload';
import ChoiceOverlay from './ChoiceOverlay';
import EndingCard from './EndingCard';
import type { StoryGraph } from '../types/story.types';

interface BranchingPlayerProps {
  graph: StoryGraph;
  storyId: string;
  onClose: () => void;
  onComplete?: (pathTaken: string[], endingsUnlocked: string[]) => void;
}

export default function BranchingPlayer({ graph, storyId, onClose, onComplete }: BranchingPlayerProps) {
  const {
    currentSegment,
    currentSegmentId,
    pathTaken,
    choicesMade,
    isComplete,
    totalEndings,
    startStory,
    getChoices,
    getSegment,
    resolveChoice,
    resolveDefault,
  } = useStoryGraph({ graph });

  const { preloadSegments, getCachedUrl } = useBranchPreload();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showChoices, setShowChoices] = useState(false);
  const [endingsUnlocked, setEndingsUnlocked] = useState<string[]>([]);
  const [transitioning, setTransitioning] = useState(false);

  // Start story on mount
  useEffect(() => {
    startStory();
  }, [startStory]);

  // Preload next segments when current segment changes
  useEffect(() => {
    if (!currentSegment || !currentSegmentId) return;
    if (currentSegment.is_choice_point) {
      preloadSegments(currentSegment.choices, (segId) => {
        const seg = getSegment(segId);
        return seg?.video_url ?? seg?.audio_url;
      });
    }
  }, [currentSegmentId, currentSegment, preloadSegments, getSegment]);

  // Track time for choice overlay
  const handleTimeUpdate = useCallback(() => {
    if (!videoRef.current || !currentSegment) return;
    const remaining = videoRef.current.duration - videoRef.current.currentTime;
    if (remaining <= 5 && currentSegment.is_choice_point && !showChoices) {
      setShowChoices(true);
    }
  }, [currentSegment, showChoices]);

  // Handle video end
  const handleVideoEnded = useCallback(() => {
    if (!currentSegment) return;
    if (currentSegment.is_choice_point && !showChoices) {
      setShowChoices(true);
    } else if (!currentSegment.is_choice_point && !currentSegment.is_ending) {
      // Auto-advance for non-choice, non-ending segments
      resolveDefault();
    }
  }, [currentSegment, showChoices, resolveDefault]);

  // Handle choice selection
  const handleChoose = useCallback((choiceId: string) => {
    setShowChoices(false);
    setTransitioning(true);
    setTimeout(() => {
      resolveChoice(choiceId);
      setTransitioning(false);
    }, 300);
  }, [resolveChoice]);

  // Track ending
  useEffect(() => {
    if (isComplete && currentSegment?.is_ending) {
      const endingId = currentSegment.id;
      setEndingsUnlocked(prev => {
        if (prev.includes(endingId)) return prev;
        return [...prev, endingId];
      });
    }
  }, [isComplete, currentSegment]);

  // Get media URL (cached or original)
  const mediaUrl = currentSegmentId
    ? getCachedUrl(currentSegmentId) ?? currentSegment?.video_url ?? currentSegment?.audio_url
    : undefined;

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-[60] p-2 rounded-full bg-black/50 backdrop-blur-sm"
      >
        <X className="w-5 h-5 text-white" />
      </button>

      {/* Segment info */}
      {currentSegment && !isComplete && (
        <motion.div
          key={currentSegmentId}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-4 left-4 z-40 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-sm"
        >
          <span className="text-white text-xs font-medium">{currentSegment.title}</span>
        </motion.div>
      )}

      {/* Video/Image content */}
      <AnimatePresence mode="wait">
        {currentSegment && !isComplete && (
          <motion.div
            key={currentSegmentId}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0"
          >
            {currentSegment.video_url ? (
              <video
                ref={videoRef}
                src={mediaUrl}
                className="w-full h-full object-cover"
                autoPlay
                playsInline
                onTimeUpdate={handleTimeUpdate}
                onEnded={handleVideoEnded}
              />
            ) : currentSegment.image_urls?.[0] ? (
              <div className="w-full h-full relative">
                <img
                  src={currentSegment.image_urls[0]}
                  alt={currentSegment.title}
                  className="w-full h-full object-cover"
                />
                {currentSegment.audio_url && (
                  <audio
                    src={currentSegment.audio_url}
                    autoPlay
                    onEnded={handleVideoEnded}
                  />
                )}
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-900 to-indigo-900">
                <div className="text-center p-8">
                  <span className="text-6xl mb-4 block">📖</span>
                  <p className="text-white text-lg font-medium">{currentSegment.text_content ?? currentSegment.title}</p>
                </div>
                {currentSegment.audio_url && (
                  <audio
                    src={currentSegment.audio_url}
                    autoPlay
                    onEnded={handleVideoEnded}
                  />
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transition overlay */}
      <AnimatePresence>
        {transitioning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[45] bg-black/60"
          />
        )}
      </AnimatePresence>

      {/* Choice overlay */}
      {currentSegment && (
        <ChoiceOverlay
          choices={getChoices(currentSegment.id)}
          visible={showChoices && !isComplete}
          onChoose={handleChoose}
        />
      )}

      {/* Ending card */}
      {isComplete && currentSegment && (
        <EndingCard
          badge={currentSegment.ending_badge}
          endingTitle={currentSegment.ending_title}
          endingsUnlocked={endingsUnlocked.length}
          totalEndings={totalEndings}
          onReplay={() => {
            setEndingsUnlocked(prev => prev);
            startStory();
          }}
          onBack={onClose}
          onShare={() => {
            if (navigator.share) {
              navigator.share({
                title: 'Conte Vivant',
                text: `J'ai terminé ce conte interactif !`,
              }).catch(() => {});
            }
          }}
        />
      )}
    </div>
  );
}
