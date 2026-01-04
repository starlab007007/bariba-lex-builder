import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Play, Pause, RotateCcw, Check, Volume2, Scissors,
  Zap, Music, Sparkles, Filter, Maximize2, Minimize2, 
  SkipBack, SkipForward, RefreshCw, Activity, Wind, Heart,
  Glasses, Speaker, SlidersHorizontal, ArrowLeftRight
} from 'lucide-react';

// --- TYPES ---

export interface TimelineSegment {
  id: string;
  blob: Blob;
  type: 'audio' | 'video' | 'photo';
  duration: number;
  startTime: number;
  endTime: number;
  isMuted?: boolean;
  filter?: string;
  volume?: number;
}

interface VideoBlock {
  id: string;
  type: 'HOOK_1S' | 'MESSAGE' | 'PROOF' | 'END';
  segment: TimelineSegment;
  energy: 'calm' | 'medium' | 'dynamic';
  focus?: 'face' | 'product' | 'hands' | 'full';
}

interface AIBackground {
  id: string;
  name: string;
  emoji: string;
  reactivity: { voice_pulse: number; emotion_tint: number; gesture_echo: number; };
  gradient: string;
}

interface CulturalTemplate {
  id: string;
  emoji: string;
  name: string;
  nameBa: string;
  category: string;
  symbols: string[];
}

// --- DATA ---

const AI_BACKGROUNDS: AIBackground[] = [
  { id: 'real_room', name: 'Maison', emoji: '🏠', reactivity: { voice_pulse: 0.3, emotion_tint: 0.5, gesture_echo: 0.2 }, gradient: 'from-amber-900/40 to-orange-800/40' },
  { id: 'street_life', name: 'Rue/Village', emoji: '🏘️', reactivity: { voice_pulse: 0.4, emotion_tint: 0.6, gesture_echo: 0.3 }, gradient: 'from-green-900/40 to-teal-800/40' },
  { id: 'cyber_bamako', name: 'Futur', emoji: '🔮', reactivity: { voice_pulse: 0.9, emotion_tint: 0.8, gesture_echo: 0.9 }, gradient: 'from-fuchsia-900/40 to-purple-800/40' },
];

const CULTURAL_TEMPLATES: CulturalTemplate[] = [
  { id: 'conte', emoji: '🦁', name: 'Conte', nameBa: 'Itan', category: 'STORY', symbols: ['🦁', '🌙', '⭐'] },
  { id: 'hero', emoji: '⚔️', name: 'Héros', nameBa: 'Akọni', category: 'STORY', symbols: ['⚔️', '👑', '🔥'] },
  { id: 'market', emoji: '🏪', name: 'Marché', nameBa: 'Ọjọ ọja', category: 'MARKET', symbols: ['🏪', '💰', '🌾'] },
];

const FILTERS = [
  { id: 'none', name: 'Original', icon: '📷', css: 'none' },
  { id: 'warm', name: 'Chaud', icon: '🔥', css: 'sepia(0.3) saturate(1.4)' },
  { id: 'cool', name: 'Froid', icon: '❄️', css: 'hue-rotate(10deg) saturate(0.9)' },
  { id: 'vivid', name: 'Vif', icon: '🌈', css: 'saturate(1.8) contrast(1.2)' },
  { id: 'vintage', name: 'Vintage', icon: '📻', css: 'sepia(0.5) contrast(1.1)' },
  { id: 'bw', name: 'N&B', icon: '🎬', css: 'grayscale(1) contrast(1.2)' },
];

const MUSIC_TRACKS = [
  { id: 'kora_beat', name: 'Kora Trap', mood: 'Dynamic' },
  { id: 'talking_drum', name: 'Talking Drum', mood: 'Traditional' },
  { id: 'afro_chill', name: 'Afro Chill', mood: 'Calm' },
];

// --- COMPONENT ---

interface TimelineEditorProps {
  segments: TimelineSegment[];
  onSegmentsChange: (segments: TimelineSegment[]) => void;
  onClose: () => void;
  onConfirm: (segments: TimelineSegment[]) => void;
  language?: 'fr' | 'ba';
}

type EditMode = 'AUTO' | 'EDITOR';
type EditTool = 'blocks' | 'template' | 'background' | 'filter' | 'music' | 'vr' | null;

export const TimelineEditor: React.FC<TimelineEditorProps> = ({
  segments: initialSegments,
  onSegmentsChange,
  onClose,
  onConfirm,
  language = 'fr'
}) => {
  // State Basics
  const [mode, setMode] = useState<EditMode>('AUTO');
  const [blocks, setBlocks] = useState<VideoBlock[]>([]);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<EditTool>(null);
  const [showToolbar, setShowToolbar] = useState(true);

  // Playback State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playbackTimerRef = useRef<number | null>(null);

  // Creative Settings
  const [selectedTemplate, setSelectedTemplate] = useState<CulturalTemplate | null>(null);
  const [selectedBackground, setSelectedBackground] = useState<AIBackground>(AI_BACKGROUNDS[0]);
  const [selectedFilter, setSelectedFilter] = useState('none');
  const [selectedMusic, setSelectedMusic] = useState<string | null>(null);
  
  // Adjustments
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [musicVolume, setMusicVolume] = useState(50);
  const [voiceVolume, setVoiceVolume] = useState(100);

  // VR & View Modes
  const [isVRMode, setIsVRMode] = useState(false);
  const [isFullPreview, setIsFullPreview] = useState(false);
  const [aiVariants, setAiVariants] = useState<'A' | 'B' | 'C'>('A');

  // Initialization
  useEffect(() => {
    if (initialSegments.length > 0 && blocks.length === 0) {
      const newBlocks: VideoBlock[] = initialSegments.map((seg, idx) => ({
        id: seg.id,
        type: idx === 0 ? 'HOOK_1S' : idx === initialSegments.length - 1 ? 'END' : 'MESSAGE',
        segment: seg,
        energy: 'medium',
        focus: 'full'
      }));
      setBlocks(newBlocks);
      setSelectedBlockId(newBlocks[0]?.id || null);
    }
  }, [initialSegments]);

  const totalDuration = blocks.reduce((sum, b) => sum + (b.segment.endTime - b.segment.startTime), 0);
  const selectedBlock = blocks.find(b => b.id === selectedBlockId);

  // Playback Logic
  useEffect(() => {
    if (isPlaying) {
      playbackTimerRef.current = window.setInterval(() => {
        setCurrentTime(prev => {
          if (prev >= totalDuration) { setIsPlaying(false); return 0; }
          return prev + 0.1;
        });
      }, 100);
    } else if (playbackTimerRef.current) {
      window.clearInterval(playbackTimerRef.current);
    }
    return () => { if (playbackTimerRef.current) window.clearInterval(playbackTimerRef.current); };
  }, [isPlaying, totalDuration]);

  const handleSeek = (time: number) => {
    setCurrentTime(time);
    if (videoRef.current) videoRef.current.currentTime = time;
  };

  const getFilterStyle = () => {
    const filter = FILTERS.find(f => f.id === selectedFilter);
    return `${filter?.css !== 'none' ? filter?.css : ''} brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
  };

  // VR Transformation Logic
  const getVRContainerStyle = () => {
    if (!isVRMode) return {};
    return {
      perspective: '1000px',
      transformStyle: 'preserve-3d' as const,
    };
  };

  const getVRVideoStyle = () => {
    if (!isVRMode) return { filter: getFilterStyle() };
    return {
      filter: getFilterStyle(),
      transform: 'scale(1.3)', // Fisheye simulation zoom
      maskImage: 'radial-gradient(circle, black 60%, transparent 100%)',
      WebkitMaskImage: 'radial-gradient(circle, black 60%, transparent 100%)'
    };
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black overflow-hidden flex flex-col font-sans">
      
      {/* --- HEADER --- */}
      <div className="flex-shrink-0 bg-gradient-to-b from-black/90 to-transparent px-4 py-3 flex items-center justify-between z-30">
        <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center hover:bg-white/20">
          <X className="w-5 h-5 text-white" />
        </button>
        
        <div className="flex items-center gap-2">
          {/* Mode Switcher */}
          <div className="flex items-center gap-1 bg-white/10 backdrop-blur-md rounded-full p-1">
            <button onClick={() => setMode('AUTO')} className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${mode === 'AUTO' ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' : 'text-white/60'}`}>
              AUTO ⚡
            </button>
            <button onClick={() => setMode('EDITOR')} className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${mode === 'EDITOR' ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' : 'text-white/60'}`}>
              PRO 🛠️
            </button>
          </div>
          
          <button onClick={() => onConfirm(blocks.map(b => b.segment))} className="px-6 py-2 rounded-full bg-white text-black font-bold flex items-center gap-2 shadow-[0_0_15px_rgba(255,255,255,0.3)]">
            <Check className="w-4 h-4" /> {language === 'ba' ? 'Pari' : 'Save'}
          </button>
        </div>
      </div>

      {/* --- PREVIEW AREA (VR & STANDARD) --- */}
      <div className="flex-1 relative overflow-hidden bg-[#1a1a1a]">
        
        {/* Dynamic Background */}
        <div className={`absolute inset-0 bg-gradient-to-br ${selectedBackground.gradient} transition-colors duration-1000`} />
        
        {/* Animated Grid for Depth */}
        <div className="absolute inset-0 opacity-20" style={{ 
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', 
          backgroundSize: '50px 50px',
          transform: isVRMode ? 'perspective(500px) rotateX(20deg)' : 'none',
          transition: 'transform 0.5s ease'
        }} />

        {/* The Video Stage */}
        <div className={`absolute inset-0 flex items-center justify-center transition-all duration-500 ${isFullPreview ? '' : 'p-4 pb-32'}`}>
          <div 
            className={`relative transition-all duration-500 ${isVRMode ? 'w-full h-full flex gap-4 px-8 items-center' : 'w-full max-w-md aspect-[9/16]'}`}
            style={getVRContainerStyle()}
          >
            {/* VR Left Eye (Only visible in VR mode) */}
            {isVRMode && (
              <div className="flex-1 h-3/4 rounded-[3rem] overflow-hidden border-4 border-white/20 bg-black relative shadow-2xl">
                 <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-white/50 animate-pulse">Left Eye Render</span>
                 </div>
                 {/* Duplicated Video for Stereoscopic effect */}
                 {selectedBlock && (
                   <video src={URL.createObjectURL(selectedBlock.segment.blob)} className="w-full h-full object-cover opacity-80" muted playsInline loop />
                 )}
              </div>
            )}

            {/* Main/Right Eye View */}
            <div className={`relative overflow-hidden shadow-2xl ${isVRMode ? 'flex-1 h-3/4 rounded-[3rem] border-4 border-white/20' : 'w-full h-full rounded-2xl'}`}>
               {selectedBlock ? (
                <video
                  ref={videoRef}
                  src={URL.createObjectURL(selectedBlock.segment.blob)}
                  className="w-full h-full object-cover"
                  style={getVRVideoStyle()}
                  muted={selectedBlock.segment.isMuted}
                  playsInline
                />
              ) : (
                <div className="w-full h-full bg-black/50 flex items-center justify-center text-white/30">No Media</div>
              )}

              {/* Cultural Symbols Layer */}
              {selectedTemplate && !isVRMode && (
                <div className="absolute top-0 left-0 w-full h-full pointer-events-none p-6 flex flex-wrap content-between">
                  <div className="w-full flex justify-between">
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-4xl drop-shadow-lg">{selectedTemplate.symbols[0]}</motion.div>
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2 }} className="text-4xl drop-shadow-lg">{selectedTemplate.symbols[1]}</motion.div>
                  </div>
                  <div className="w-full flex justify-center">
                     <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="px-4 py-2 bg-black/40 backdrop-blur-lg rounded-xl border border-white/10">
                        <span className="text-white font-serif italic">{language === 'ba' ? selectedTemplate.nameBa : selectedTemplate.name}</span>
                     </motion.div>
                  </div>
                </div>
              )}

              {/* VR Overlay HUD */}
              {isVRMode && (
                <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-green-500/20 to-transparent mix-blend-overlay" />
              )}
            </div>

          </div>
        </div>

        {/* View Controls */}
        <div className="absolute top-20 right-4 flex flex-col gap-3">
          <button onClick={() => setIsFullPreview(!isFullPreview)} className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center border border-white/10">
            {isFullPreview ? <Minimize2 className="w-5 h-5 text-white" /> : <Maximize2 className="w-5 h-5 text-white" />}
          </button>
          <button onClick={() => setIsVRMode(!isVRMode)} className={`w-10 h-10 rounded-full backdrop-blur-md flex items-center justify-center border transition-all ${isVRMode ? 'bg-purple-500 border-purple-400' : 'bg-black/40 border-white/10'}`}>
            <Glasses className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Timeline Scrubber */}
        <div className="absolute bottom-32 left-0 right-0 px-6 z-20">
          <div className="flex justify-between text-xs text-white/50 mb-2 font-mono">
            <span>{currentTime.toFixed(1)}s</span>
            <span>{totalDuration.toFixed(1)}s</span>
          </div>
          <div className="relative h-12 bg-black/40 backdrop-blur-md rounded-xl border border-white/10 flex items-center overflow-hidden px-2 gap-1">
            {blocks.map((block) => (
              <div 
                key={block.id}
                onClick={() => setSelectedBlockId(block.id)}
                className={`h-8 rounded-lg transition-all relative overflow-hidden cursor-pointer ${selectedBlockId === block.id ? 'ring-2 ring-purple-500 z-10' : 'opacity-60 hover:opacity-100'}`}
                style={{ flex: block.segment.duration }}
              >
                <div className={`absolute inset-0 bg-gradient-to-r ${block.type === 'HOOK_1S' ? 'from-red-500 to-orange-500' : 'from-blue-500 to-cyan-500'}`} />
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white uppercase tracking-wider">{block.type}</span>
              </div>
            ))}
            {/* Playhead */}
            <div 
              className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_10px_white] z-20 pointer-events-none"
              style={{ left: `${(currentTime / totalDuration) * 100}%` }}
            />
          </div>
        </div>

        {/* Playback Controls Main */}
        <div className="absolute bottom-40 w-full flex justify-center items-center gap-6 z-20 pointer-events-none">
           <div className="pointer-events-auto flex gap-4 bg-black/50 backdrop-blur-xl p-2 rounded-full border border-white/10">
              <button onClick={() => handleSeek(currentTime - 2)}><SkipBack className="w-5 h-5 text-white" /></button>
              <button onClick={() => setIsPlaying(!isPlaying)} className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition">
                {isPlaying ? <Pause className="w-5 h-5 text-black" /> : <Play className="w-5 h-5 text-black ml-1" />}
              </button>
              <button onClick={() => handleSeek(currentTime + 2)}><SkipForward className="w-5 h-5 text-white" /></button>
           </div>
        </div>
      </div>

      {/* --- BOTTOM TOOLBAR (EDITOR) --- */}
      <AnimatePresence>
        {showToolbar && (
          <motion.div 
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            className="flex-shrink-0 bg-[#0f0f0f] border-t border-white/10"
          >
            {/* Tool Selection */}
            <div className="flex items-center gap-4 px-4 py-3 overflow-x-auto no-scrollbar">
              {[
                { id: 'template', icon: Sparkles, label: language === 'ba' ? 'Apeere' : 'Template' },
                { id: 'background', icon: Activity, label: language === 'ba' ? 'Abẹlẹ' : 'Fond IA' },
                { id: 'filter', icon: Filter, label: language === 'ba' ? 'Asa' : 'Filtre' },
                { id: 'music', icon: Music, label: language === 'ba' ? 'Orin' : 'Son' },
              ].map(tool => (
                <button
                  key={tool.id}
                  onClick={() => setActiveTool(activeTool === tool.id ? null : tool.id as EditTool)}
                  className={`flex flex-col items-center gap-1 min-w-[60px] p-2 rounded-xl transition ${activeTool === tool.id ? 'bg-white/10 text-purple-400' : 'text-white/60 hover:text-white'}`}
                >
                  <tool.icon className="w-6 h-6" />
                  <span className="text-[10px] font-medium">{tool.label}</span>
                </button>
              ))}
            </div>

            {/* Dynamic Tool Panels */}
            <div className="bg-[#141414]">
              
              {/* FILTER PANEL */}
              {activeTool === 'filter' && (
                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} className="p-4 space-y-4">
                  <div className="flex gap-3 overflow-x-auto pb-2">
                    {FILTERS.map(f => (
                      <button key={f.id} onClick={() => setSelectedFilter(f.id)} className={`flex-shrink-0 flex flex-col items-center gap-2 ${selectedFilter === f.id ? 'opacity-100' : 'opacity-50'}`}>
                        <div className={`w-14 h-14 rounded-full bg-gray-800 flex items-center justify-center text-xl border-2 ${selectedFilter === f.id ? 'border-purple-500' : 'border-transparent'}`}>{f.icon}</div>
                        <span className="text-xs text-white">{f.name}</span>
                      </button>
                    ))}
                  </div>
                  {/* Adjustment Sliders */}
                  <div className="grid grid-cols-1 gap-4 pt-2 border-t border-white/10">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-white w-16">Lumière</span>
                      <input type="range" min="50" max="150" value={brightness} onChange={(e) => setBrightness(Number(e.target.value))} className="flex-1 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500" />
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-white w-16">Contraste</span>
                      <input type="range" min="50" max="150" value={contrast} onChange={(e) => setContrast(Number(e.target.value))} className="flex-1 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500" />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* MUSIC PANEL */}
              {activeTool === 'music' && (
                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} className="p-4 space-y-4">
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {MUSIC_TRACKS.map(track => (
                      <button key={track.id} onClick={() => setSelectedMusic(track.id)} className={`w-full flex items-center justify-between p-3 rounded-xl border transition ${selectedMusic === track.id ? 'bg-purple-500/20 border-purple-500/50' : 'bg-white/5 border-white/5'}`}>
                        <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"><Music className="w-4 h-4 text-white" /></div>
                           <div className="text-left">
                             <div className="text-sm font-bold text-white">{track.name}</div>
                             <div className="text-xs text-white/50">{track.mood}</div>
                           </div>
                        </div>
                        {selectedMusic === track.id && <div className="flex gap-0.5 items-end h-4"><div className="w-1 bg-purple-500 h-2 animate-pulse"/><div className="w-1 bg-purple-500 h-4 animate-pulse delay-75"/><div className="w-1 bg-purple-500 h-3 animate-pulse delay-150"/></div>}
                      </button>
                    ))}
                  </div>
                  {/* Audio Mixer */}
                  <div className="flex gap-6 pt-2 border-t border-white/10">
                    <div className="flex-1 space-y-2">
                       <div className="flex justify-between text-xs text-white/60"><span>Musique</span><span>{musicVolume}%</span></div>
                       <input type="range" value={musicVolume} onChange={(e) => setMusicVolume(Number(e.target.value))} className="w-full h-1 bg-gray-700 rounded-lg accent-purple-500" />
                    </div>
                    <div className="flex-1 space-y-2">
                       <div className="flex justify-between text-xs text-white/60"><span>Voix</span><span>{voiceVolume}%</span></div>
                       <input type="range" value={voiceVolume} onChange={(e) => setVoiceVolume(Number(e.target.value))} className="w-full h-1 bg-gray-700 rounded-lg accent-pink-500" />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TEMPLATE PANEL (Simplified for brevity) */}
              {activeTool === 'template' && (
                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} className="p-4">
                   <div className="grid grid-cols-2 gap-2">
                     {CULTURAL_TEMPLATES.map(tpl => (
                       <button key={tpl.id} onClick={() => setSelectedTemplate(tpl)} className={`p-3 rounded-xl border flex items-center gap-2 ${selectedTemplate?.id === tpl.id ? 'border-purple-500 bg-purple-500/10' : 'border-white/10 bg-white/5'}`}>
                         <span className="text-2xl">{tpl.emoji}</span>
                         <div className="text-left"><div className="text-sm font-bold text-white">{language === 'ba' ? tpl.nameBa : tpl.name}</div></div>
                       </button>
                     ))}
                   </div>
                </motion.div>
              )}

              {/* BACKGROUND PANEL (Simplified) */}
              {activeTool === 'background' && (
                 <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} className="p-4">
                    <div className="flex gap-2 overflow-x-auto">
                      {AI_BACKGROUNDS.map(bg => (
                        <button key={bg.id} onClick={() => setSelectedBackground(bg)} className={`relative flex-shrink-0 w-32 h-20 rounded-lg overflow-hidden border-2 ${selectedBackground.id === bg.id ? 'border-white' : 'border-transparent'}`}>
                          <div className={`absolute inset-0 bg-gradient-to-br ${bg.gradient}`} />
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-xl">{bg.emoji}</span>
                            <span className="text-[10px] text-white font-bold shadow-black drop-shadow-md">{bg.name}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                 </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TimelineEditor;
