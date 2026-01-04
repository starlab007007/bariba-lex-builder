import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Play, Pause, RotateCcw, Check, Volume2, VolumeX, Scissors,
  Trash2, Copy, Music, Sparkles, Type, Palette, Wand2,
  Settings, Filter, Maximize2, Minimize2,
  SkipBack, SkipForward, Sliders, Plus
} from 'lucide-react';

export interface TimelineSegment {
  id: string;
  blob: Blob;
  type: 'audio' | 'video' | 'photo';
  duration: number;
  startTime: number;
  endTime: number;
  thumbnail?: string;
  isMuted?: boolean;
  filter?: string;
  volume?: number;
}

interface TimelineEditorProps {
  segments: TimelineSegment[];
  onSegmentsChange: (segments: TimelineSegment[]) => void;
  onClose: () => void;
  onConfirm: (segments: TimelineSegment[]) => void;
  language?: 'fr' | 'ba';
}

type EditTool = 'trim' | 'split' | 'filter' | 'music' | 'text' | 'sticker' | 'effects' | 'adjust' | null;

interface TextOverlay {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  fontFamily: string;
  startTime: number;
  endTime: number;
}

const FILTERS = [
  { id: 'none', name: 'Original', icon: '📷', css: 'none' },
  { id: 'warm', name: 'Chaud', icon: '🔥', css: 'sepia(0.3) saturate(1.4)' },
  { id: 'cool', name: 'Froid', icon: '❄️', css: 'hue-rotate(10deg) saturate(0.9)' },
  { id: 'vivid', name: 'Vif', icon: '🌈', css: 'saturate(1.8) contrast(1.2)' },
  { id: 'vintage', name: 'Vintage', icon: '📻', css: 'sepia(0.5) contrast(1.1)' },
  { id: 'bw', name: 'N&B', icon: '🎬', css: 'grayscale(1) contrast(1.2)' },
];

const MUSIC_TRACKS = [
  { id: 'm1', title: 'Afro Vibes', duration: 120 },
  { id: 'm2', title: 'Chill Beats', duration: 90 },
  { id: 'm3', title: 'Upbeat Dance', duration: 60 },
  { id: 'm4', title: 'Lo-Fi Study', duration: 180 },
];

export const TimelineEditor: React.FC<TimelineEditorProps> = ({
  segments: initialSegments,
  onSegmentsChange,
  onClose,
  onConfirm,
  language = 'fr'
}) => {
  const [segments, setSegments] = useState<TimelineSegment[]>(initialSegments);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(segments[0]?.id || null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [activeTool, setActiveTool] = useState<EditTool>(null);
  const [showToolbar, setShowToolbar] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState('none');
  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [volume, setVolume] = useState(100);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isFullPreview, setIsFullPreview] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playbackTimerRef = useRef<number | null>(null);

  const totalDuration = segments.reduce((sum, s) => sum + (s.endTime - s.startTime), 0);
  const selectedSegment = segments.find(s => s.id === selectedSegmentId);

  const tools = [
    { id: 'trim', icon: Scissors, label: language === 'ba' ? 'Gé' : 'Découper', labelBa: 'Gé' },
    { id: 'filter', icon: Filter, label: language === 'ba' ? 'Asa' : 'Filtres', labelBa: 'Asa' },
    { id: 'adjust', icon: Sliders, label: language === 'ba' ? 'Satunse' : 'Ajuster', labelBa: 'Satunse' },
    { id: 'text', icon: Type, label: language === 'ba' ? 'Ọrọ' : 'Texte', labelBa: 'Ọrọ' },
    { id: 'music', icon: Music, label: language === 'ba' ? 'Orin' : 'Musique', labelBa: 'Orin' },
    { id: 'effects', icon: Wand2, label: language === 'ba' ? 'Awọn ipa' : 'Effets', labelBa: 'Awọn ipa' },
    { id: 'sticker', icon: Sparkles, label: language === 'ba' ? 'Aworan' : 'Stickers', labelBa: 'Aworan' },
  ];

  // Playback control
  useEffect(() => {
    if (isPlaying) {
      playbackTimerRef.current = window.setInterval(() => {
        setCurrentTime(prev => {
          const next = prev + (0.1 * playbackSpeed);
          if (next >= totalDuration) {
            setIsPlaying(false);
            return 0;
          }
          return next;
        });
      }, 100);
    } else {
      if (playbackTimerRef.current) {
        window.clearInterval(playbackTimerRef.current);
      }
    }
    return () => {
      if (playbackTimerRef.current) {
        window.clearInterval(playbackTimerRef.current);
      }
    };
  }, [isPlaying, totalDuration, playbackSpeed]);

  // Update video element when playing
  useEffect(() => {
    if (videoRef.current && selectedSegment) {
      const videoUrl = URL.createObjectURL(selectedSegment.blob);
      videoRef.current.src = videoUrl;
      if (isPlaying) {
        videoRef.current.play();
      } else {
        videoRef.current.pause();
      }
      return () => URL.revokeObjectURL(videoUrl);
    }
  }, [selectedSegment, isPlaying]);

  const togglePlay = () => setIsPlaying(!isPlaying);

  const handleSeek = (time: number) => {
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  const handleSplitSegment = () => {
    if (!selectedSegment) return;
    const midPoint = (selectedSegment.startTime + selectedSegment.endTime) / 2;
    const newSegments = [...segments];
    const index = newSegments.findIndex(s => s.id === selectedSegmentId);
    
    const seg1: TimelineSegment = {
      ...selectedSegment,
      id: `${selectedSegment.id}_1`,
      endTime: midPoint,
      duration: midPoint - selectedSegment.startTime
    };
    const seg2: TimelineSegment = {
      ...selectedSegment,
      id: `${selectedSegment.id}_2`,
      startTime: midPoint,
      duration: selectedSegment.endTime - midPoint
    };
    
    newSegments.splice(index, 1, seg1, seg2);
    setSegments(newSegments);
  };

  const handleDeleteSegment = () => {
    if (!selectedSegmentId) return;
    setSegments(segments.filter(s => s.id !== selectedSegmentId));
    setSelectedSegmentId(segments[0]?.id || null);
  };

  const handleDuplicateSegment = () => {
    if (!selectedSegment) return;
    const newSegment: TimelineSegment = {
      ...selectedSegment,
      id: `${selectedSegment.id}_copy_${Date.now()}`
    };
    const index = segments.findIndex(s => s.id === selectedSegmentId);
    const newSegments = [...segments];
    newSegments.splice(index + 1, 0, newSegment);
    setSegments(newSegments);
  };

  const handleApplyFilter = (filterId: string) => {
    setSelectedFilter(filterId);
    if (!selectedSegmentId) return;
    setSegments(segments.map(s => 
      s.id === selectedSegmentId ? { ...s, filter: filterId } : s
    ));
  };

  const addTextOverlay = () => {
    const newText: TextOverlay = {
      id: `text_${Date.now()}`,
      text: 'Nouveau texte',
      x: 50,
      y: 50,
      fontSize: 32,
      color: '#FFFFFF',
      fontFamily: 'Arial',
      startTime: currentTime,
      endTime: currentTime + 3
    };
    setTextOverlays([...textOverlays, newText]);
  };

  const handleConfirm = () => {
    onSegmentsChange(segments);
    onConfirm(segments);
  };

  const getFilterStyle = () => {
    const filter = FILTERS.find(f => f.id === selectedFilter);
    const adjustments = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
    return filter?.css === 'none' ? adjustments : `${filter?.css} ${adjustments}`;
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 bg-gradient-to-b from-black/80 to-transparent px-4 py-3 flex items-center justify-between relative z-20">
        <button 
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-xl flex items-center justify-center hover:bg-white/20 transition"
        >
          <X className="w-5 h-5 text-white" />
        </button>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowToolbar(!showToolbar)}
            className="px-3 py-2 rounded-full bg-white/10 backdrop-blur-xl text-white text-xs flex items-center gap-1"
          >
            <Settings className="w-4 h-4" />
            {showToolbar ? (language === 'ba' ? 'Fi pamọ' : 'Masquer') : (language === 'ba' ? 'Fi han' : 'Afficher')}
          </button>
          
          <button 
            onClick={handleConfirm}
            className="px-6 py-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold flex items-center gap-2 shadow-lg"
          >
            <Check className="w-5 h-5" />
            {language === 'ba' ? 'Pari' : 'Terminer'}
          </button>
        </div>
      </div>

      {/* Main Preview Area */}
      <div className="flex-1 relative overflow-hidden">
        {/* Video Preview */}
        <div className={`absolute inset-0 flex items-center justify-center ${isFullPreview ? '' : 'px-4'}`}>
          <div className="relative w-full h-full max-w-md max-h-full">
            <video
              ref={videoRef}
              className="w-full h-full object-contain rounded-2xl"
              style={{ filter: getFilterStyle() }}
              muted={selectedSegment?.isMuted}
              playsInline
            />
            
            {/* Text Overlays */}
            <AnimatePresence>
              {textOverlays
                .filter(t => currentTime >= t.startTime && currentTime <= t.endTime)
                .map(text => (
                  <motion.div
                    key={text.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    style={{
                      position: 'absolute',
                      left: `${text.x}%`,
                      top: `${text.y}%`,
                      fontSize: `${text.fontSize}px`,
                      color: text.color,
                      fontFamily: text.fontFamily,
                      fontWeight: 'bold',
                      textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                      transform: 'translate(-50%, -50%)',
                      pointerEvents: 'none',
                      zIndex: 10
                    }}
                  >
                    {text.text}
                  </motion.div>
                ))}
            </AnimatePresence>

            {/* Playback Controls Overlay */}
            <div className="absolute bottom-4 left-4 right-4 space-y-3">
              {/* Progress Bar */}
              <div className="relative">
                <div className="h-1 bg-white/20 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                    style={{ width: `${(currentTime / totalDuration) * 100}%` }}
                  />
                </div>
                <input
                  type="range"
                  min="0"
                  max={totalDuration}
                  step="0.1"
                  value={currentTime}
                  onChange={(e) => handleSeek(parseFloat(e.target.value))}
                  className="absolute inset-0 w-full opacity-0 cursor-pointer"
                />
              </div>

              {/* Time Display */}
              <div className="flex items-center justify-between text-white text-xs">
                <span>{Math.floor(currentTime)}s</span>
                <span>{Math.floor(totalDuration)}s</span>
              </div>

              {/* Control Buttons */}
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => handleSeek(Math.max(0, currentTime - 5))}
                  className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-xl flex items-center justify-center hover:bg-white/20 transition"
                >
                  <SkipBack className="w-5 h-5 text-white" />
                </button>

                <button
                  onClick={togglePlay}
                  className="w-14 h-14 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center shadow-lg hover:scale-105 transition"
                >
                  {isPlaying ? (
                    <Pause className="w-6 h-6 text-white" />
                  ) : (
                    <Play className="w-6 h-6 text-white ml-1" />
                  )}
                </button>

                <button
                  onClick={() => handleSeek(Math.min(totalDuration, currentTime + 5))}
                  className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-xl flex items-center justify-center hover:bg-white/20 transition"
                >
                  <SkipForward className="w-5 h-5 text-white" />
                </button>

                <button
                  onClick={() => handleSeek(0)}
                  className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-xl flex items-center justify-center hover:bg-white/20 transition"
                >
                  <RotateCcw className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Fullscreen Toggle */}
        <button
          onClick={() => setIsFullPreview(!isFullPreview)}
          className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/40 backdrop-blur-xl flex items-center justify-center z-10"
        >
          {isFullPreview ? (
            <Minimize2 className="w-5 h-5 text-white" />
          ) : (
            <Maximize2 className="w-5 h-5 text-white" />
          )}
        </button>
      </div>

      {/* Bottom Toolbar */}
      <AnimatePresence>
        {showToolbar && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="flex-shrink-0 bg-gradient-to-t from-black via-black/95 to-transparent"
          >
            {/* Tools Grid */}
            <div className="px-4 pt-4 pb-2">
              <div className="grid grid-cols-4 gap-3 mb-4">
                {tools.map(tool => (
                  <button
                    key={tool.id}
                    onClick={() => setActiveTool(activeTool === tool.id ? null : tool.id as EditTool)}
                    className={`flex flex-col items-center gap-2 p-3 rounded-2xl transition ${
                      activeTool === tool.id
                        ? 'bg-gradient-to-br from-purple-500/30 to-pink-500/30 border border-purple-500/50'
                        : 'bg-white/5 border border-white/10'
                    }`}
                  >
                    <tool.icon className="w-6 h-6 text-white" />
                    <span className="text-xs text-white font-medium">
                      {language === 'ba' ? tool.labelBa : tool.label}
                    </span>
                  </button>
                ))}
              </div>

              {/* Tool Panels */}
              <AnimatePresence mode="wait">
                {activeTool === 'filter' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="rounded-2xl bg-white/5 border border-white/10 p-4 mb-4"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-white font-semibold">
                        {language === 'ba' ? 'Awọn Asa' : 'Filtres'}
                      </h4>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {FILTERS.map(filter => (
                        <button
                          key={filter.id}
                          onClick={() => handleApplyFilter(filter.id)}
                          className={`aspect-square rounded-xl overflow-hidden border-2 transition ${
                            selectedFilter === filter.id
                              ? 'border-purple-500 scale-95'
                              : 'border-transparent hover:border-white/20'
                          }`}
                        >
                          <div
                            className="w-full h-full bg-gradient-to-br from-purple-400 to-pink-400 flex flex-col items-center justify-center"
                            style={{ filter: filter.css }}
                          >
                            <span className="text-2xl mb-1">{filter.icon}</span>
                            <span className="text-white text-xs font-medium">{filter.name}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {activeTool === 'adjust' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="rounded-2xl bg-white/5 border border-white/10 p-4 mb-4 space-y-4"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-white text-sm">
                          {language === 'ba' ? 'Imọlẹ' : 'Luminosité'}
                        </label>
                        <span className="text-white/70 text-sm">{brightness}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="200"
                        value={brightness}
                        onChange={(e) => setBrightness(parseInt(e.target.value))}
                        className="w-full accent-purple-500"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-white text-sm">
                          {language === 'ba' ? 'Iyatọ' : 'Contraste'}
                        </label>
                        <span className="text-white/70 text-sm">{contrast}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="200"
                        value={contrast}
                        onChange={(e) => setContrast(parseInt(e.target.value))}
                        className="w-full accent-purple-500"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-white text-sm">
                          {language === 'ba' ? 'Awọ' : 'Saturation'}
                        </label>
                        <span className="text-white/70 text-sm">{saturation}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="200"
                        value={saturation}
                        onChange={(e) => setSaturation(parseInt(e.target.value))}
                        className="w-full accent-purple-500"
                      />
                    </div>

                    <button
                      onClick={() => {
                        setBrightness(100);
                        setContrast(100);
                        setSaturation(100);
                      }}
                      className="w-full py-2 rounded-xl bg-white/10 text-white text-sm"
                    >
                      {language === 'ba' ? 'Tun bẹrẹ' : 'Réinitialiser'}
                    </button>
                  </motion.div>
                )}

                {activeTool === 'text' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="rounded-2xl bg-white/5 border border-white/10 p-4 mb-4"
                  >
                    <button
                      onClick={addTextOverlay}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold flex items-center justify-center gap-2"
                    >
                      <Plus className="w-5 h-5" />
                      {language === 'ba' ? 'Fi ọrọ kun' : 'Ajouter du texte'}
                    </button>
                    
                    {textOverlays.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {textOverlays.map(text => (
                          <div key={text.id} className="p-2 rounded-lg bg-white/5 text-white text-sm">
                            {text.text}
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}

                {activeTool === 'trim' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="rounded-2xl bg-white/5 border border-white/10 p-4 mb-4"
                  >
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={handleSplitSegment}
                        className="py-3 rounded-xl bg-white/10 text-white text-sm flex flex-col items-center gap-1"
                      >
                        <Scissors className="w-5 h-5" />
                        {language === 'ba' ? 'Pin' : 'Couper'}
                      </button>
                      <button
                        onClick={handleDuplicateSegment}
                        className="py-3 rounded-xl bg-white/10 text-white text-sm flex flex-col items-center gap-1"
                      >
                        <Copy className="w-5 h-5" />
                        {language === 'ba' ? 'Ẹda' : 'Dupliquer'}
                      </button>
                      <button
                        onClick={handleDeleteSegment}
                        className="py-3 rounded-xl bg-red-500/20 text-red-400 text-sm flex flex-col items-center gap-1"
                      >
                        <Trash2 className="w-5 h-5" />
                        {language === 'ba' ? 'Pa' : 'Supprimer'}
                      </button>
                    </div>
                  </motion.div>
                )}

                {activeTool === 'music' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="rounded-2xl bg-white/5 border border-white/10 p-4 mb-4"
                  >
                    <h4 className="text-white font-semibold mb-3">
                      {language === 'ba' ? 'Orin' : 'Musique'}
                    </h4>
                    <div className="space-y-2">
                      {MUSIC_TRACKS.map(track => (
                        <button
                          key={track.id}
                          className="w-full p-3 rounded-xl bg-white/5 hover:bg-white/10 text-left transition"
                        >
                          <div className="flex items-center gap-3">
                            <Music className="w-5 h-5 text-purple-400" />
                            <div className="flex-1">
                              <div className="text-white text-sm font-medium">{track.title}</div>
                              <div className="text-white/60 text-xs">{track.duration}s</div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>

                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-white text-sm flex items-center gap-2">
                          <Volume2 className="w-4 h-4" />
                          {language === 'ba' ? 'Iwọn ohun' : 'Volume'}
                        </label>
                        <span className="text-white/70 text-sm">{volume}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={volume}
                        onChange={(e) => setVolume(parseInt(e.target.value))}
                        className="w-full accent-purple-500"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Segment Timeline */}
            <div className="px-4 pb-6">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-white/60 text-xs">
                  {segments.length} {language === 'ba' ? 'awọn ipin' : 'segments'}
                </span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {segments.map((segment, idx) => (
                  <button
                    key={segment.id}
                    onClick={() => setSelectedSegmentId(segment.id)}
                    className={`flex-shrink-0 w-20 h-14 rounded-lg overflow-hidden border-2 transition ${
                      selectedSegmentId === segment.id
                        ? 'border-purple-500'
                        : 'border-white/10'
                    }`}
                  >
                    <div className="w-full h-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                      <span className="text-white text-xs">{idx + 1}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TimelineEditor;
