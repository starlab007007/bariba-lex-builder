import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, Reorder, AnimatePresence } from 'framer-motion';
import { 
  Scissors, Trash2, Plus, Play, Pause, RotateCcw, 
  ChevronLeft, ChevronRight, Sparkles, Check, X,
  GripVertical, Volume2, VolumeX, Wand2
} from 'lucide-react';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';
import { triggerFeedback } from '@/utils/tamtamFeedback';

export interface TimelineSegment {
  id: string;
  blob: Blob;
  type: 'audio' | 'video' | 'photo';
  duration: number;
  startTime: number;
  endTime: number;
  thumbnail?: string;
  isMuted?: boolean;
  transition?: TransitionType;
}

export type TransitionType = 'none' | 'fade' | 'slide' | 'zoom' | 'blur';

const TRANSITIONS: { id: TransitionType; label: string; icon: string }[] = [
  { id: 'none', label: 'Aucune', icon: '➖' },
  { id: 'fade', label: 'Fondu', icon: '🌫️' },
  { id: 'slide', label: 'Glisser', icon: '➡️' },
  { id: 'zoom', label: 'Zoom', icon: '🔍' },
  { id: 'blur', label: 'Flou', icon: '💨' },
];

interface TimelineEditorProps {
  segments: TimelineSegment[];
  onSegmentsChange: (segments: TimelineSegment[]) => void;
  onClose: () => void;
  onConfirm: (segments: TimelineSegment[]) => void;
}

export const TimelineEditor: React.FC<TimelineEditorProps> = ({
  segments: initialSegments,
  onSegmentsChange,
  onClose,
  onConfirm
}) => {
  const { currentLang } = useTamTamLanguage();
  const [segments, setSegments] = useState<TimelineSegment[]>(initialSegments);
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [showTransitions, setShowTransitions] = useState(false);
  const [trimMode, setTrimMode] = useState<{ segmentId: string; type: 'start' | 'end' } | null>(null);
  
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());
  const playbackTimerRef = useRef<NodeJS.Timeout | null>(null);

  const totalDuration = segments.reduce((sum, s) => sum + (s.endTime - s.startTime), 0);

  // Generate thumbnails for video segments
  useEffect(() => {
    segments.forEach(segment => {
      if (segment.type === 'video' && !segment.thumbnail) {
        generateThumbnail(segment);
      }
    });
  }, []);

  const generateThumbnail = async (segment: TimelineSegment) => {
    const video = document.createElement('video');
    video.src = URL.createObjectURL(segment.blob);
    video.currentTime = 0.5;
    
    video.onloadeddata = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 120;
      canvas.height = 68;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const thumbnail = canvas.toDataURL('image/jpeg', 0.5);
        setSegments(prev => prev.map(s => 
          s.id === segment.id ? { ...s, thumbnail } : s
        ));
      }
      URL.revokeObjectURL(video.src);
    };
  };

  const handleReorder = (newOrder: TimelineSegment[]) => {
    setSegments(newOrder);
    triggerFeedback('notification');
  };

  const handleDeleteSegment = (segmentId: string) => {
    setSegments(prev => prev.filter(s => s.id !== segmentId));
    setSelectedSegment(null);
    triggerFeedback('notification');
  };

  const handleSplitSegment = (segmentId: string) => {
    const segment = segments.find(s => s.id === segmentId);
    if (!segment) return;

    const midPoint = (segment.startTime + segment.endTime) / 2;
    const newSegment1: TimelineSegment = {
      ...segment,
      id: `${segment.id}_1`,
      endTime: midPoint,
      duration: midPoint - segment.startTime
    };
    const newSegment2: TimelineSegment = {
      ...segment,
      id: `${segment.id}_2`,
      startTime: midPoint,
      duration: segment.endTime - midPoint
    };

    setSegments(prev => {
      const index = prev.findIndex(s => s.id === segmentId);
      const newSegments = [...prev];
      newSegments.splice(index, 1, newSegment1, newSegment2);
      return newSegments;
    });
    triggerFeedback('success');
  };

  const handleTrimSegment = (segmentId: string, type: 'start' | 'end', delta: number) => {
    setSegments(prev => prev.map(s => {
      if (s.id !== segmentId) return s;
      
      if (type === 'start') {
        const newStart = Math.max(0, Math.min(s.endTime - 0.5, s.startTime + delta));
        return { ...s, startTime: newStart, duration: s.endTime - newStart };
      } else {
        const newEnd = Math.max(s.startTime + 0.5, Math.min(s.duration, s.endTime + delta));
        return { ...s, endTime: newEnd, duration: newEnd - s.startTime };
      }
    }));
  };

  const handleSetTransition = (segmentId: string, transition: TransitionType) => {
    setSegments(prev => prev.map(s => 
      s.id === segmentId ? { ...s, transition } : s
    ));
    setShowTransitions(false);
    triggerFeedback('notification');
  };

  const handleToggleMute = (segmentId: string) => {
    setSegments(prev => prev.map(s => 
      s.id === segmentId ? { ...s, isMuted: !s.isMuted } : s
    ));
  };

  const playPreview = () => {
    setIsPlaying(true);
    setCurrentTime(0);
    
    let elapsed = 0;
    playbackTimerRef.current = setInterval(() => {
      elapsed += 0.1;
      setCurrentTime(elapsed);
      
      if (elapsed >= totalDuration) {
        stopPreview();
      }
    }, 100);
  };

  const stopPreview = () => {
    setIsPlaying(false);
    if (playbackTimerRef.current) {
      clearInterval(playbackTimerRef.current);
    }
  };

  const handleConfirm = () => {
    onSegmentsChange(segments);
    onConfirm(segments);
    triggerFeedback('success');
  };

  const selectedSegmentData = segments.find(s => s.id === selectedSegment);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black"
    >
      {/* Header */}
      <div className="ios-glass-dark px-4 py-3 flex items-center justify-between">
        <button onClick={onClose} className="p-2">
          <X className="w-5 h-5 text-white" />
        </button>
        <h2 className="text-white font-semibold">
          {currentLang === 'ba' ? 'Ṣàtúnṣe' : 'Éditer'}
        </h2>
        <button 
          onClick={handleConfirm}
          className="px-4 py-2 bg-primary rounded-full text-white text-sm font-medium"
        >
          <Check className="w-4 h-4" />
        </button>
      </div>

      {/* Preview Area */}
      <div className="h-[50vh] bg-gray-900 relative flex items-center justify-center">
        {selectedSegmentData ? (
          <div className="relative w-full h-full">
            {selectedSegmentData.type === 'video' && (
              <video
                ref={el => el && videoRefs.current.set(selectedSegmentData.id, el)}
                src={URL.createObjectURL(selectedSegmentData.blob)}
                className="w-full h-full object-contain"
                muted={selectedSegmentData.isMuted}
              />
            )}
            {selectedSegmentData.type === 'audio' && (
              <div className="flex flex-col items-center justify-center h-full">
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center">
                  <Volume2 className="w-16 h-16 text-white" />
                </div>
                <p className="text-white/60 mt-4">Audio - {selectedSegmentData.duration.toFixed(1)}s</p>
              </div>
            )}
            {selectedSegmentData.type === 'photo' && (
              <img 
                src={URL.createObjectURL(selectedSegmentData.blob)} 
                className="w-full h-full object-contain"
                alt="Photo"
              />
            )}
          </div>
        ) : (
          <p className="text-white/40">
            {currentLang === 'ba' ? 'Yan ìpínlẹ̀ kan' : 'Sélectionner un segment'}
          </p>
        )}

        {/* Playback controls */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={isPlaying ? stopPreview : playPreview}
            className="w-12 h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center"
          >
            {isPlaying ? (
              <Pause className="w-6 h-6 text-white" />
            ) : (
              <Play className="w-6 h-6 text-white ml-1" />
            )}
          </motion.button>
        </div>

        {/* Progress bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
          <motion.div 
            className="h-full bg-primary"
            style={{ width: `${(currentTime / totalDuration) * 100}%` }}
          />
        </div>
      </div>

      {/* Timeline */}
      <div className="flex-1 bg-gray-950 p-4">
        {/* Timeline header */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-white/60 text-sm">
            {segments.length} segments • {totalDuration.toFixed(1)}s
          </span>
          <div className="flex gap-2">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowTransitions(!showTransitions)}
              className={`p-2 rounded-lg ${showTransitions ? 'bg-primary' : 'bg-white/10'}`}
            >
              <Wand2 className="w-4 h-4 text-white" />
            </motion.button>
          </div>
        </div>

        {/* Segments list - Reorderable */}
        <Reorder.Group
          axis="x"
          values={segments}
          onReorder={handleReorder}
          className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide"
        >
          {segments.map((segment, index) => (
            <React.Fragment key={segment.id}>
              <Reorder.Item
                value={segment}
                className="flex-shrink-0"
              >
                <motion.div
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedSegment(segment.id)}
                  className={`relative w-24 h-16 rounded-lg overflow-hidden border-2 transition-colors cursor-grab active:cursor-grabbing ${
                    selectedSegment === segment.id 
                      ? 'border-primary' 
                      : 'border-transparent'
                  }`}
                >
                  {/* Thumbnail or placeholder */}
                  {segment.thumbnail ? (
                    <img src={segment.thumbnail} className="w-full h-full object-cover" alt="" />
                  ) : segment.type === 'video' ? (
                    <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-500" />
                  ) : segment.type === 'audio' ? (
                    <div className="w-full h-full bg-gradient-to-br from-green-500 to-teal-500 flex items-center justify-center">
                      <Volume2 className="w-6 h-6 text-white" />
                    </div>
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-orange-500 to-red-500" />
                  )}

                  {/* Duration badge */}
                  <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/60 text-[10px] text-white">
                    {(segment.endTime - segment.startTime).toFixed(1)}s
                  </div>

                  {/* Mute indicator */}
                  {segment.isMuted && (
                    <div className="absolute top-1 right-1">
                      <VolumeX className="w-3 h-3 text-white" />
                    </div>
                  )}

                  {/* Grip handle */}
                  <div className="absolute top-1 left-1 opacity-60">
                    <GripVertical className="w-3 h-3 text-white" />
                  </div>
                </motion.div>
              </Reorder.Item>

              {/* Transition indicator between segments */}
              {index < segments.length - 1 && (
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    setSelectedSegment(segment.id);
                    setShowTransitions(true);
                  }}
                  className="flex-shrink-0 w-8 h-16 flex items-center justify-center"
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                    segment.transition && segment.transition !== 'none'
                      ? 'bg-primary text-white'
                      : 'bg-white/10 text-white/40'
                  }`}>
                    {TRANSITIONS.find(t => t.id === segment.transition)?.icon || '➕'}
                  </div>
                </motion.button>
              )}
            </React.Fragment>
          ))}
        </Reorder.Group>

        {/* Segment controls */}
        {selectedSegmentData && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-3 bg-white/5 rounded-xl space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-white/80 text-sm">Segment {segments.findIndex(s => s.id === selectedSegment) + 1}</span>
              <div className="flex gap-2">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleToggleMute(selectedSegmentData.id)}
                  className={`p-2 rounded-lg ${selectedSegmentData.isMuted ? 'bg-red-500/20' : 'bg-white/10'}`}
                >
                  {selectedSegmentData.isMuted ? (
                    <VolumeX className="w-4 h-4 text-red-400" />
                  ) : (
                    <Volume2 className="w-4 h-4 text-white" />
                  )}
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleSplitSegment(selectedSegmentData.id)}
                  className="p-2 rounded-lg bg-white/10"
                >
                  <Scissors className="w-4 h-4 text-white" />
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleDeleteSegment(selectedSegmentData.id)}
                  className="p-2 rounded-lg bg-red-500/20"
                >
                  <Trash2 className="w-4 h-4 text-red-400" />
                </motion.button>
              </div>
            </div>

            {/* Trim controls */}
            <div className="flex items-center gap-3">
              <span className="text-white/60 text-xs w-12">Début</span>
              <input
                type="range"
                min={0}
                max={selectedSegmentData.endTime - 0.5}
                step={0.1}
                value={selectedSegmentData.startTime}
                onChange={(e) => {
                  const newStart = parseFloat(e.target.value);
                  setSegments(prev => prev.map(s => 
                    s.id === selectedSegmentData.id 
                      ? { ...s, startTime: newStart }
                      : s
                  ));
                }}
                className="flex-1 accent-primary"
              />
              <span className="text-white/60 text-xs w-10">{selectedSegmentData.startTime.toFixed(1)}s</span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-white/60 text-xs w-12">Fin</span>
              <input
                type="range"
                min={selectedSegmentData.startTime + 0.5}
                max={selectedSegmentData.duration}
                step={0.1}
                value={selectedSegmentData.endTime}
                onChange={(e) => {
                  const newEnd = parseFloat(e.target.value);
                  setSegments(prev => prev.map(s => 
                    s.id === selectedSegmentData.id 
                      ? { ...s, endTime: newEnd }
                      : s
                  ));
                }}
                className="flex-1 accent-primary"
              />
              <span className="text-white/60 text-xs w-10">{selectedSegmentData.endTime.toFixed(1)}s</span>
            </div>
          </motion.div>
        )}

        {/* Transition selector */}
        <AnimatePresence>
          {showTransitions && selectedSegment && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="mt-4 p-3 bg-white/5 rounded-xl"
            >
              <p className="text-white/60 text-sm mb-3">Transition</p>
              <div className="flex gap-2 flex-wrap">
                {TRANSITIONS.map(transition => (
                  <motion.button
                    key={transition.id}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleSetTransition(selectedSegment, transition.id)}
                    className={`px-3 py-2 rounded-lg flex items-center gap-2 ${
                      selectedSegmentData?.transition === transition.id
                        ? 'bg-primary text-white'
                        : 'bg-white/10 text-white/80'
                    }`}
                  >
                    <span>{transition.icon}</span>
                    <span className="text-sm">{transition.label}</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default TimelineEditor;
