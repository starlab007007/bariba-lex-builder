import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Play, Pause, RotateCcw, Check, Volume2, VolumeX, Scissors,
  Zap, Music, Sparkles, Type, Wand2, Settings, Filter, Maximize2, 
  Minimize2, SkipBack, SkipForward, Sliders, Plus, RefreshCw,
  Eye, Target, Layers, Activity, Wind, Heart, AlertTriangle,
  Copy, Trash2, Timer, Smile, TrendingUp, Users, ShoppingBag,
  BookOpen, Cpu, Download, Share2, MessageCircle, ThumbsUp,
  ChevronRight, PenTool, Sticker, LayoutTemplate, Eraser, Image as ImageIcon
} from 'lucide-react';

// --- TYPES ---
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
  nameBa: string;
  emoji: string;
  tags: string[];
  reactivity: {
    voice_pulse: number;
    emotion_tint: number;
    gesture_echo: number;
    breath_flow: number;
  };
  gradient: string;
  pattern?: string;
}

interface CulturalTemplate {
  id: string;
  emoji: string;
  name: string;
  nameBa: string;
  category: string;
  symbols: string[];
  energy: 'calm' | 'medium' | 'high';
  structure: string[];
  tags: string[];
}

interface TextOverlay {
  id: string;
  emoji: string;
  position: { x: number; y: number };
  scale: number;
  rotation: number;
  startTime: number;
  endTime: number;
}

// --- DATA ---
const AI_BACKGROUNDS: AIBackground[] = [
  { id: 'real_room', name: 'Maison', nameBa: 'Ile', emoji: '🏠', tags: ['home', 'intimate'], reactivity: { voice_pulse: 0.3, emotion_tint: 0.5, gesture_echo: 0.2, breath_flow: 0.4 }, gradient: 'from-amber-900/40 to-orange-800/40', pattern: 'dots' },
  { id: 'street_life', name: 'Rue/Village', nameBa: 'Abule', emoji: '🏘️', tags: ['outdoor', 'community'], reactivity: { voice_pulse: 0.4, emotion_tint: 0.6, gesture_echo: 0.3, breath_flow: 0.5 }, gradient: 'from-green-900/40 to-teal-800/40', pattern: 'grid' },
  { id: 'market_scene', name: 'Marché', nameBa: 'Oja', emoji: '🏪', tags: ['commerce', 'vibrant'], reactivity: { voice_pulse: 0.6, emotion_tint: 0.7, gesture_echo: 0.5, breath_flow: 0.7 }, gradient: 'from-yellow-900/40 to-orange-700/40', pattern: 'waves' },
  { id: 'worksite', name: 'Travaux', nameBa: 'Iṣẹ', emoji: '🔨', tags: ['work', 'collective'], reactivity: { voice_pulse: 0.5, emotion_tint: 0.6, gesture_echo: 0.4, breath_flow: 0.6 }, gradient: 'from-gray-900/40 to-slate-800/40', pattern: 'lines' },
  { id: 'sacred_place', name: 'Lieu Sacré', nameBa: 'Ibi Mimọ', emoji: '🕌', tags: ['sacred', 'calm'], reactivity: { voice_pulse: 0.2, emotion_tint: 0.8, gesture_echo: 0.1, breath_flow: 0.3 }, gradient: 'from-purple-900/40 to-indigo-800/40', pattern: 'stars' },
  { id: 'nature_myth', name: 'Nature/Conte', nameBa: 'Igbo/Itan', emoji: '🌳', tags: ['nature', 'story'], reactivity: { voice_pulse: 0.3, emotion_tint: 0.6, gesture_echo: 0.2, breath_flow: 0.4 }, gradient: 'from-emerald-900/40 to-green-800/40', pattern: 'organic' },
  { id: 'celebration', name: 'Fête', nameBa: 'Ayẹyẹ', emoji: '🎉', tags: ['party', 'joy'], reactivity: { voice_pulse: 0.8, emotion_tint: 0.9, gesture_echo: 0.7, breath_flow: 0.8 }, gradient: 'from-pink-900/40 to-rose-700/40', pattern: 'confetti' },
  { id: 'health_clean', name: 'Santé', nameBa: 'Ilera', emoji: '🏥', tags: ['health', 'clean'], reactivity: { voice_pulse: 0.2, emotion_tint: 0.5, gesture_echo: 0.1, breath_flow: 0.3 }, gradient: 'from-blue-900/40 to-cyan-800/40', pattern: 'clean' },
  { id: 'alert_signal', name: 'Alerte', nameBa: 'Ikilọ', emoji: '🚨', tags: ['alert', 'urgent'], reactivity: { voice_pulse: 0.7, emotion_tint: 0.9, gesture_echo: 0.4, breath_flow: 0.6 }, gradient: 'from-red-900/40 to-orange-800/40', pattern: 'pulse' },
  { id: 'knowledge', name: 'Savoir', nameBa: 'Imọ', emoji: '📚', tags: ['teaching', 'demo'], reactivity: { voice_pulse: 0.4, emotion_tint: 0.5, gesture_echo: 0.3, breath_flow: 0.4 }, gradient: 'from-indigo-900/40 to-blue-800/40', pattern: 'book' },
  { id: 'living_gradient', name: 'Premium', nameBa: 'Ọla', emoji: '✨', tags: ['modern', 'premium'], reactivity: { voice_pulse: 0.9, emotion_tint: 1.0, gesture_echo: 0.8, breath_flow: 0.9 }, gradient: 'from-purple-600/40 via-pink-600/40 to-orange-500/40', pattern: 'shimmer' },
];

const CULTURAL_TEMPLATES: CulturalTemplate[] = [
  { id: 'conte_animaux', emoji: '🦁', name: 'Conte des animaux', nameBa: 'Itan ẹranko', category: 'STORY', symbols: ['🦁', '🌙', '⭐'], energy: 'calm', structure: ['HOOK_1S', 'MESSAGE', 'END'], tags: ['story', 'animals'] },
  { id: 'origine_monde', emoji: '🌍', name: 'Origine du monde', nameBa: 'Ipilẹṣẹ aye', category: 'STORY', symbols: ['🌍', '✨', '👑'], energy: 'calm', structure: ['HOOK_1S', 'MESSAGE', 'END'], tags: ['story', 'origin'] },
  { id: 'hero_legend', emoji: '⚔️', name: 'Héros légendaire', nameBa: 'Akọni itan', category: 'HISTORY', symbols: ['⚔️', '👑', '🔥'], energy: 'high', structure: ['HOOK_1S', 'MESSAGE', 'PROOF', 'END'], tags: ['history', 'hero'] },
  { id: 'reunion', emoji: '👥', name: 'Réunion', nameBa: 'Ipade', category: 'COMMUNITY', symbols: ['👥', '🗣️', '📢'], energy: 'medium', structure: ['HOOK_1S', 'MESSAGE', 'END'], tags: ['community', 'meeting'] },
  { id: 'travaux', emoji: '🔨', name: 'Travaux collectifs', nameBa: 'Iṣẹ papọ', category: 'COMMUNITY', symbols: ['🔨', '💪', '🤝'], energy: 'high', structure: ['HOOK_1S', 'MESSAGE', 'PROOF', 'END'], tags: ['community', 'work'] },
  { id: 'marche', emoji: '🏪', name: 'Jour de marché', nameBa: 'Ọjọ ọja', category: 'MARKET', symbols: ['🏪', '💰', '🌾'], energy: 'high', structure: ['HOOK_1S', 'MESSAGE', 'PROOF', 'END'], tags: ['market', 'commerce'] },
  { id: 'naissance', emoji: '👶', name: 'Naissance', nameBa: 'Ibibi', category: 'CELEBRATION', symbols: ['👶', '🎉', '🌟'], energy: 'high', structure: ['HOOK_1S', 'MESSAGE', 'END'], tags: ['celebration', 'birth'] },
  { id: 'mariage', emoji: '💒', name: 'Mariage', nameBa: 'Igbeyawo', category: 'CELEBRATION', symbols: ['💒', '💍', '🎉'], energy: 'high', structure: ['HOOK_1S', 'MESSAGE', 'PROOF', 'END'], tags: ['celebration', 'marriage'] },
  { id: 'reussite', emoji: '🎓', name: 'Réussite scolaire', nameBa: 'Aṣeyọri eko', category: 'CELEBRATION', symbols: ['🎓', '📚', '⭐'], energy: 'high', structure: ['HOOK_1S', 'MESSAGE', 'END'], tags: ['celebration', 'success'] },
  { id: 'guerison', emoji: '💪', name: 'Guérison', nameBa: 'Ilera', category: 'HEALTH', symbols: ['💪', '🏥', '💚'], energy: 'calm', structure: ['HOOK_1S', 'MESSAGE', 'END'], tags: ['health', 'healing'] },
  { id: 'plantes', emoji: '🌿', name: 'Plantes médicinales', nameBa: 'Eweko ibile', category: 'HEALTH', symbols: ['🌿', '💊', '🍃'], energy: 'calm', structure: ['HOOK_1S', 'MESSAGE', 'PROOF', 'END'], tags: ['health', 'plants'] },
  { id: 'alerte_meteo', emoji: '⛈️', name: 'Alerte météo', nameBa: 'Ikilọ oju-ọjọ', category: 'ALERT', symbols: ['⛈️', '🚨', '⚠️'], energy: 'high', structure: ['HOOK_1S', 'MESSAGE', 'END'], tags: ['alert', 'weather'] },
  { id: 'alerte_sante', emoji: '🦠', name: 'Alerte sanitaire', nameBa: 'Ikilọ ilera', category: 'ALERT', symbols: ['🦠', '🚨', '🏥'], energy: 'high', structure: ['HOOK_1S', 'MESSAGE', 'END'], tags: ['alert', 'health'] },
  { id: 'demande_aide', emoji: '🙏', name: "Demande d'aide", nameBa: 'Beere iranlọwọ', category: 'HELP', symbols: ['🙏', '🤝', '💙'], energy: 'calm', structure: ['HOOK_1S', 'MESSAGE', 'END'], tags: ['help', 'request'] },
  { id: 'savoir_agricole', emoji: '🌱', name: 'Savoir agricole', nameBa: 'Imọ ogbin', category: 'KNOWLEDGE', symbols: ['🌱', '🌾', '🚜'], energy: 'medium', structure: ['HOOK_1S', 'MESSAGE', 'PROOF', 'END'], tags: ['knowledge', 'agriculture'] },
  { id: 'recette', emoji: '🍲', name: 'Recette traditionnelle', nameBa: 'Ounje ibile', category: 'KNOWLEDGE', symbols: ['🍲', '🔥', '👩‍🍳'], energy: 'medium', structure: ['HOOK_1S', 'MESSAGE', 'PROOF', 'END'], tags: ['knowledge', 'cooking'] },
  { id: 'chant_mariage', emoji: '🎵', name: 'Chant mariage', nameBa: 'Orin igbeyawo', category: 'SONG', symbols: ['🎵', '💒', '🥁'], energy: 'high', structure: ['HOOK_1S', 'MESSAGE', 'END'], tags: ['song', 'marriage'] },
  { id: 'berceuse', emoji: '🌙', name: 'Berceuse', nameBa: 'Orin oorun', category: 'SONG', symbols: ['🌙', '👶', '💤'], energy: 'calm', structure: ['HOOK_1S', 'MESSAGE', 'END'], tags: ['song', 'lullaby'] },
  { id: 'proverbe', emoji: '🧓', name: 'Sagesse anciens', nameBa: 'Ọgbọn àgbà', category: 'WISDOM', symbols: ['🧓', '💭', '📖'], energy: 'calm', structure: ['HOOK_1S', 'MESSAGE', 'END'], tags: ['wisdom', 'proverb'] },
];

const FILTERS = [
  { id: 'none', name: 'Original', nameBa: 'Atilẹba', icon: '📷', css: 'none' },
  { id: 'beauty', name: 'Beauté', nameBa: 'Ẹwa', icon: '✨', css: 'brightness(1.05) contrast(0.95) saturate(1.1) blur(0.3px)' },
  { id: 'warm', name: 'Chaud', nameBa: 'Gbigbona', icon: '🔥', css: 'sepia(0.3) saturate(1.4) brightness(1.05)' },
  { id: 'cool', name: 'Froid', nameBa: 'Tutu', icon: '❄️', css: 'hue-rotate(10deg) saturate(0.9) brightness(1.05)' },
  { id: 'vivid', name: 'Vif', nameBa: 'Kikan', icon: '🌈', css: 'saturate(1.8) contrast(1.2) brightness(1.05)' },
  { id: 'vintage', name: 'Vintage', nameBa: 'Atijo', icon: '📻', css: 'sepia(0.5) contrast(1.1) brightness(0.95)' },
  { id: 'bw', name: 'N&B', nameBa: 'Dudu', icon: '🎬', css: 'grayscale(1) contrast(1.2) brightness(1.05)' },
  { id: 'dramatic', name: 'Drama', nameBa: 'Eru', icon: '🎭', css: 'contrast(1.4) brightness(0.9) saturate(0.8)' },
];

const MUSIC_TRACKS = [
  { id: 'm1', emoji: '🎵', title: 'Afro Vibes', titleBa: 'Afro Vibes', duration: 120, energy: 'high' as const },
  { id: 'm2', emoji: '🥁', title: 'Drum Groove', titleBa: 'Ilu Groove', duration: 90, energy: 'high' as const },
  { id: 'm3', emoji: '🎹', title: 'Chill Beats', titleBa: 'Chill Beats', duration: 180, energy: 'calm' as const },
  { id: 'm4', emoji: '🎸', title: 'Upbeat Dance', titleBa: 'Dance Alakafo', duration: 60, energy: 'high' as const },
  { id: 'm5', emoji: '🎺', title: 'Traditional', titleBa: 'Ibile', duration: 150, energy: 'medium' as const },
];

const STICKER_EMOJIS = [
  '✨', '🔥', '💯', '👏', '🎉', '❤️', '🙏', '💪', 
  '👍', '⭐', '🌟', '💫', '🎊', '🎈', '🌈', '☀️',
  '🌙', '⚡', '💥', '✅', '📍', '🎯', '🚀', '💎'
];

const TRANSITIONS = [
  { id: 'none', name: 'Aucune', icon: '➡️' },
  { id: 'fade', name: 'Fondu', icon: '🌫️' },
  { id: 'slide', name: 'Glissé', icon: '📲' },
  { id: 'zoom', name: 'Zoom', icon: '🔍' },
  { id: 'blur', name: 'Flou', icon: '💨' },
  { id: 'wipe', name: 'Balayage', icon: '🧹' },
];

interface TimelineEditorProps {
  segments: TimelineSegment[];
  onSegmentsChange: (segments: TimelineSegment[]) => void;
  onClose: () => void;
  onConfirm: (segments: TimelineSegment[]) => void;
  language?: 'fr' | 'ba';
}

type EditTool = 'blocks' | 'template' | 'background' | 'filter' | 'music' | 'stickers' | 'speed' | 'transition' | null;

export const TimelineEditor: React.FC<TimelineEditorProps> = ({
  segments: initialSegments,
  onSegmentsChange,
  onClose,
  onConfirm,
  language = 'fr'
}) => {
  const [blocks, setBlocks] = useState<VideoBlock[]>([]);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [activeTool, setActiveTool] = useState<EditTool>(null);
  
  // Settings
  const [selectedTemplate, setSelectedTemplate] = useState<CulturalTemplate | null>(null);
  const [selectedBackground, setSelectedBackground] = useState<AIBackground>(AI_BACKGROUNDS[0]);
  const [selectedFilter, setSelectedFilter] = useState('none');
  const [selectedMusic, setSelectedMusic] = useState<typeof MUSIC_TRACKS[0] | null>(null);
  const [selectedTransition, setSelectedTransition] = useState('fade');
  const [stickers, setStickers] = useState<TextOverlay[]>([]);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [volume, setVolume] = useState(100);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playbackTimerRef = useRef<number | null>(null);

  // Initialize blocks from segments
  useEffect(() => {
    if (initialSegments.length > 0 && blocks.length === 0) {
      const newBlocks: VideoBlock[] = [];
      initialSegments.forEach((seg, idx) => {
        let blockType: VideoBlock['type'] = 'MESSAGE';
        if (idx === 0) blockType = 'HOOK_1S';
        else if (idx === initialSegments.length - 1) blockType = 'END';
        else if (idx === Math.floor(initialSegments.length / 2)) blockType = 'PROOF';
        
        newBlocks.push({
          id: seg.id,
          type: blockType,
          segment: seg,
          energy: 'medium',
          focus: 'full'
        });
      });
      setBlocks(newBlocks);
      setSelectedBlockId(newBlocks[0]?.id || null);
    }
  }, [initialSegments, blocks.length]);

  const totalDuration = blocks.reduce((sum, b) => sum + (b.segment.endTime - b.segment.startTime), 0);
  const selectedBlock = blocks.find(b => b.id === selectedBlockId);

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

  // Update video when selectedBlock changes
  useEffect(() => {
    if (videoRef.current && selectedBlock) {
      const videoUrl = URL.createObjectURL(selectedBlock.segment.blob);
      videoRef.current.src = videoUrl;
      if (isPlaying) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
      }
      return () => URL.revokeObjectURL(videoUrl);
    }
  }, [selectedBlock, isPlaying]);

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
    if (videoRef.current) {
      if (!isPlaying) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
      }
    }
  };

  const handleSplitBlock = (blockId: string) => {
    const block = blocks.find(b => b.id === blockId);
    if (!block) return;
    
    const seg = block.segment;
    const midPoint = (seg.startTime + seg.endTime) / 2;
    
    const seg1: TimelineSegment = {
      ...seg,
      id: `${seg.id}_1`,
      endTime: midPoint,
      duration: midPoint - seg.startTime
    };
    const seg2: TimelineSegment = {
      ...seg,
      id: `${seg.id}_2`,
      startTime: midPoint,
      duration: seg.endTime - midPoint
    };
    
    const newBlocks = [...blocks];
    const index = newBlocks.findIndex(b => b.id === blockId);
    newBlocks.splice(index, 1, 
      { ...block, id: seg1.id, segment: seg1 },
      { ...block, id: seg2.id, segment: seg2, type: 'MESSAGE' }
    );
    setBlocks(newBlocks);
  };

  const handleDeleteBlock = (blockId: string) => {
    setBlocks(prev => prev.filter(b => b.id !== blockId));
    if (selectedBlockId === blockId) {
      setSelectedBlockId(blocks[0]?.id || null);
    }
  };

  const handleDuplicateBlock = (blockId: string) => {
    const block = blocks.find(b => b.id === blockId);
    if (!block) return;
    
    const newBlock: VideoBlock = {
      ...block,
      id: `${block.id}_copy_${Date.now()}`,
      segment: { ...block.segment, id: `${block.segment.id}_copy` }
    };
    
    const index = blocks.findIndex(b => b.id === blockId);
    const newBlocks = [...blocks];
    newBlocks.splice(index + 1, 0, newBlock);
    setBlocks(newBlocks);
  };

  const handleAddSticker = (emoji: string) => {
    const newSticker: TextOverlay = {
      id: `sticker_${Date.now()}`,
      emoji,
      position: { x: 50, y: 50 },
      scale: 1,
      rotation: 0,
      startTime: currentTime,
      endTime: currentTime + 3
    };
    setStickers([...stickers, newSticker]);
    setActiveTool(null);
  };

  const handleApplyTemplate = (template: CulturalTemplate) => {
    setSelectedTemplate(template);
    // Auto-select matching background
    const matchingBg = AI_BACKGROUNDS.find(bg => 
      bg.tags.some(t => template.tags.includes(t))
    );
    if (matchingBg) setSelectedBackground(matchingBg);
    setActiveTool(null);
  };

  const handleAutoGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
    }, 2000);
  };

  const handleConfirm = () => {
    const updatedSegments = blocks.map(b => b.segment);
    onSegmentsChange(updatedSegments);
    onConfirm(updatedSegments);
  };

  const getFilterStyle = () => {
    const filter = FILTERS.find(f => f.id === selectedFilter);
    const adjustments = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
    return filter?.css === 'none' ? adjustments : `${filter?.css} ${adjustments}`;
  };

  const blockTypeLabels = {
    HOOK_1S: { fr: '🎣 Accroche', ba: '🎣 Ifamọra' },
    MESSAGE: { fr: '💬 Message', ba: '💬 Ifiranṣẹ' },
    PROOF: { fr: '✅ Preuve', ba: '✅ Ẹri' },
    END: { fr: '🎯 Fin', ba: '🎯 Ipari' }
  };

  const energyLabels = {
    calm: { icon: '😌', fr: 'Calme', ba: 'Tutu' },
    medium: { icon: '😊', fr: 'Moyen', ba: 'Alabọde' },
    dynamic: { icon: '🔥', fr: 'Dynamique', ba: 'Agbara' }
  };

  const getLabel = (key: { fr: string; ba: string }) => language === 'ba' ? key.ba : key.fr;

  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col h-[100dvh]">
      
      {/* TOP BAR - Kuaishou Style */}
      <div className="absolute top-0 left-0 right-0 z-30 pt-safe px-4 py-3 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent">
        <button 
          onClick={onClose} 
          className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center"
        >
          <X size={20} className="text-white" />
        </button>
        
        {/* Template indicator */}
        {selectedTemplate && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-black/40 backdrop-blur-md px-4 py-2 rounded-full flex items-center gap-2"
          >
            <span className="text-xl">{selectedTemplate.emoji}</span>
            <span className="text-white text-sm font-medium">
              {language === 'ba' ? selectedTemplate.nameBa : selectedTemplate.name}
            </span>
          </motion.div>
        )}

        {/* AI Generate Button */}
        <button 
          onClick={handleAutoGenerate}
          disabled={isGenerating}
          className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center"
        >
          {isGenerating ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            >
              <RefreshCw size={18} className="text-white" />
            </motion.div>
          ) : (
            <Wand2 size={18} className="text-white" />
          )}
        </button>
      </div>

      {/* MAIN VIDEO PREVIEW */}
      <div className="flex-1 relative overflow-hidden">
        {/* Background layer with reactive gradient */}
        <div 
          className={`absolute inset-0 bg-gradient-to-br ${selectedBackground.gradient} transition-all duration-500`}
          style={isPlaying ? {
            animation: `pulse ${2 / selectedBackground.reactivity.voice_pulse}s ease-in-out infinite`
          } : {}}
        />
        
        {/* Video layer */}
        {selectedBlock ? (
          <motion.video
            key={selectedBlock.id}
            ref={videoRef}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="w-full h-full object-cover"
            style={{ filter: getFilterStyle() }}
            onClick={togglePlay}
            playsInline
            loop
            muted={volume === 0}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-6xl">🎬</span>
          </div>
        )}

        {/* Stickers overlay */}
        {stickers.map(sticker => (
          <motion.div
            key={sticker.id}
            initial={{ scale: 0 }}
            animate={{ scale: sticker.scale }}
            style={{
              position: 'absolute',
              left: `${sticker.position.x}%`,
              top: `${sticker.position.y}%`,
              transform: `translate(-50%, -50%) rotate(${sticker.rotation}deg)`
            }}
            className="text-5xl select-none cursor-move"
            drag
            dragMomentum={false}
            onDragEnd={(_, info) => {
              const newX = sticker.position.x + (info.offset.x / window.innerWidth) * 100;
              const newY = sticker.position.y + (info.offset.y / window.innerHeight) * 100;
              setStickers(stickers.map(s => 
                s.id === sticker.id ? { ...s, position: { x: newX, y: newY } } : s
              ));
            }}
          >
            {sticker.emoji}
          </motion.div>
        ))}

        {/* Play/Pause overlay */}
        <AnimatePresence>
          {!isPlaying && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center"
              >
                <Play size={36} className="text-white ml-1" />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Block type badge */}
        {selectedBlock && (
          <div className="absolute top-20 left-4">
            <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full">
              <span className="text-white text-sm font-medium">
                {getLabel(blockTypeLabels[selectedBlock.type])}
              </span>
            </div>
          </div>
        )}

        {/* RIGHT SIDEBAR TOOLS */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-4 z-30">
          {[
            { tool: 'template' as const, icon: LayoutTemplate, label: 'Template' },
            { tool: 'filter' as const, icon: Sparkles, label: 'Filtres' },
            { tool: 'background' as const, icon: ImageIcon, label: 'Fond' },
            { tool: 'music' as const, icon: Music, label: 'Musique' },
            { tool: 'stickers' as const, icon: Smile, label: 'Stickers' },
            { tool: 'speed' as const, icon: Zap, label: 'Vitesse' },
            { tool: 'transition' as const, icon: Layers, label: 'Transition' },
          ].map(({ tool, icon: Icon, label }) => (
            <motion.button
              key={tool}
              whileTap={{ scale: 0.9 }}
              onClick={() => setActiveTool(activeTool === tool ? null : tool)}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
                activeTool === tool ? 'bg-white/20' : ''
              }`}
            >
              <div className={`p-2 rounded-full ${activeTool === tool ? 'bg-pink-500' : 'bg-black/40'}`}>
                <Icon size={20} className="text-white" />
              </div>
              <span className="text-white text-[10px] font-medium">{label}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* TOOL PANELS */}
      <AnimatePresence>
        {activeTool && (
          <motion.div
            initial={{ y: 200, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 200, opacity: 0 }}
            transition={{ type: 'spring', damping: 25 }}
            className="absolute bottom-32 left-0 right-0 z-40 mx-4"
          >
            <div className="bg-black/80 backdrop-blur-xl rounded-2xl p-4 max-h-64 overflow-y-auto">
              {/* Templates Panel */}
              {activeTool === 'template' && (
                <div className="space-y-3">
                  <h3 className="text-white font-bold text-sm">
                    {language === 'ba' ? 'Àwọn Template' : 'Templates culturels'}
                  </h3>
                  <div className="grid grid-cols-4 gap-2">
                    {CULTURAL_TEMPLATES.map(template => (
                      <motion.button
                        key={template.id}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleApplyTemplate(template)}
                        className={`p-3 rounded-xl flex flex-col items-center gap-1 transition-all ${
                          selectedTemplate?.id === template.id 
                            ? 'bg-pink-500/30 ring-2 ring-pink-500' 
                            : 'bg-white/10'
                        }`}
                      >
                        <span className="text-2xl">{template.emoji}</span>
                        <span className="text-white text-[10px] text-center leading-tight">
                          {language === 'ba' ? template.nameBa : template.name}
                        </span>
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}

              {/* Filters Panel */}
              {activeTool === 'filter' && (
                <div className="space-y-3">
                  <h3 className="text-white font-bold text-sm">Filtres</h3>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {FILTERS.map(filter => (
                      <motion.button
                        key={filter.id}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setSelectedFilter(filter.id)}
                        className={`flex-shrink-0 w-16 h-20 rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${
                          selectedFilter === filter.id 
                            ? 'bg-pink-500/30 ring-2 ring-pink-500' 
                            : 'bg-white/10'
                        }`}
                      >
                        <span className="text-2xl">{filter.icon}</span>
                        <span className="text-white text-[10px]">
                          {language === 'ba' ? filter.nameBa : filter.name}
                        </span>
                      </motion.button>
                    ))}
                  </div>
                  {/* Adjustments */}
                  <div className="space-y-2 pt-2 border-t border-white/10">
                    {[
                      { label: 'Luminosité', value: brightness, setter: setBrightness },
                      { label: 'Contraste', value: contrast, setter: setContrast },
                      { label: 'Saturation', value: saturation, setter: setSaturation },
                    ].map(({ label, value, setter }) => (
                      <div key={label} className="flex items-center gap-3">
                        <span className="text-white/60 text-xs w-20">{label}</span>
                        <input
                          type="range"
                          min={50}
                          max={150}
                          value={value}
                          onChange={e => setter(Number(e.target.value))}
                          className="flex-1 h-1 bg-white/20 rounded-full appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-pink-500 [&::-webkit-slider-thumb]:appearance-none"
                        />
                        <span className="text-white text-xs w-8">{value}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Background Panel */}
              {activeTool === 'background' && (
                <div className="space-y-3">
                  <h3 className="text-white font-bold text-sm">
                    {language === 'ba' ? 'Ipilẹ IA' : 'Fonds IA'}
                  </h3>
                  <div className="grid grid-cols-4 gap-2">
                    {AI_BACKGROUNDS.map(bg => (
                      <motion.button
                        key={bg.id}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setSelectedBackground(bg)}
                        className={`p-3 rounded-xl flex flex-col items-center gap-1 transition-all ${
                          selectedBackground.id === bg.id 
                            ? 'bg-pink-500/30 ring-2 ring-pink-500' 
                            : 'bg-white/10'
                        }`}
                      >
                        <span className="text-2xl">{bg.emoji}</span>
                        <span className="text-white text-[10px]">
                          {language === 'ba' ? bg.nameBa : bg.name}
                        </span>
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}

              {/* Music Panel */}
              {activeTool === 'music' && (
                <div className="space-y-3">
                  <h3 className="text-white font-bold text-sm">
                    {language === 'ba' ? 'Orin' : 'Musique'}
                  </h3>
                  <div className="space-y-2">
                    {MUSIC_TRACKS.map(track => (
                      <motion.button
                        key={track.id}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSelectedMusic(selectedMusic?.id === track.id ? null : track)}
                        className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all ${
                          selectedMusic?.id === track.id 
                            ? 'bg-pink-500/30 ring-2 ring-pink-500' 
                            : 'bg-white/10'
                        }`}
                      >
                        <span className="text-2xl">{track.emoji}</span>
                        <div className="flex-1 text-left">
                          <div className="text-white text-sm font-medium">
                            {language === 'ba' ? track.titleBa : track.title}
                          </div>
                          <div className="text-white/40 text-xs">{track.duration}s</div>
                        </div>
                        <div className={`px-2 py-1 rounded-full text-[10px] ${
                          track.energy === 'high' ? 'bg-red-500/30 text-red-300' :
                          track.energy === 'calm' ? 'bg-blue-500/30 text-blue-300' :
                          'bg-yellow-500/30 text-yellow-300'
                        }`}>
                          {track.energy}
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}

              {/* Stickers Panel */}
              {activeTool === 'stickers' && (
                <div className="space-y-3">
                  <h3 className="text-white font-bold text-sm">Stickers</h3>
                  <div className="grid grid-cols-8 gap-2">
                    {STICKER_EMOJIS.map(emoji => (
                      <motion.button
                        key={emoji}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleAddSticker(emoji)}
                        className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-2xl hover:bg-white/20 transition-all"
                      >
                        {emoji}
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}

              {/* Speed Panel */}
              {activeTool === 'speed' && (
                <div className="space-y-3">
                  <h3 className="text-white font-bold text-sm">
                    {language === 'ba' ? 'Iyara' : 'Vitesse'}
                  </h3>
                  <div className="flex gap-2 justify-center">
                    {[0.5, 0.75, 1, 1.5, 2].map(speed => (
                      <motion.button
                        key={speed}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setPlaybackSpeed(speed)}
                        className={`px-4 py-2 rounded-xl font-bold transition-all ${
                          playbackSpeed === speed 
                            ? 'bg-pink-500 text-white' 
                            : 'bg-white/10 text-white/60'
                        }`}
                      >
                        {speed}x
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}

              {/* Transition Panel */}
              {activeTool === 'transition' && (
                <div className="space-y-3">
                  <h3 className="text-white font-bold text-sm">Transitions</h3>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {TRANSITIONS.map(trans => (
                      <motion.button
                        key={trans.id}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setSelectedTransition(trans.id)}
                        className={`flex-shrink-0 w-16 h-16 rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${
                          selectedTransition === trans.id 
                            ? 'bg-pink-500/30 ring-2 ring-pink-500' 
                            : 'bg-white/10'
                        }`}
                      >
                        <span className="text-xl">{trans.icon}</span>
                        <span className="text-white text-[10px]">{trans.name}</span>
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TIMELINE - Block based */}
      <div className="h-28 bg-gradient-to-t from-black via-black/90 to-transparent px-4 py-2 z-30">
        {/* Playback controls */}
        <div className="flex items-center justify-center gap-4 mb-2">
          <button onClick={() => setCurrentTime(0)} className="text-white/60">
            <SkipBack size={20} />
          </button>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={togglePlay}
            className="w-12 h-12 rounded-full bg-white flex items-center justify-center"
          >
            {isPlaying ? (
              <Pause size={24} className="text-black" />
            ) : (
              <Play size={24} className="text-black ml-1" />
            )}
          </motion.button>
          <button onClick={() => setCurrentTime(totalDuration)} className="text-white/60">
            <SkipForward size={20} />
          </button>
          <span className="text-white/60 text-xs font-mono">
            {currentTime.toFixed(1)}s / {totalDuration.toFixed(1)}s
          </span>
        </div>

        {/* Block timeline */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {blocks.map((block, idx) => (
            <motion.button
              key={block.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedBlockId(block.id)}
              className={`flex-shrink-0 w-20 h-14 rounded-lg relative overflow-hidden transition-all ${
                selectedBlockId === block.id 
                  ? 'ring-2 ring-pink-500' 
                  : 'ring-1 ring-white/20'
              }`}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${
                block.energy === 'calm' ? 'from-blue-600/50 to-cyan-600/50' :
                block.energy === 'dynamic' ? 'from-red-600/50 to-orange-600/50' :
                'from-purple-600/50 to-pink-600/50'
              }`} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg">
                  {blockTypeLabels[block.type].fr.split(' ')[0]}
                </span>
                <span className="text-white text-[8px]">
                  {(block.segment.endTime - block.segment.startTime).toFixed(1)}s
                </span>
              </div>
              {/* Block actions */}
              {selectedBlockId === block.id && (
                <div className="absolute -top-1 -right-1 flex gap-0.5">
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleSplitBlock(block.id); }}
                    className="w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center"
                  >
                    <Scissors size={10} className="text-black" />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDuplicateBlock(block.id); }}
                    className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center"
                  >
                    <Copy size={10} className="text-white" />
                  </button>
                  {blocks.length > 1 && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDeleteBlock(block.id); }}
                      className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center"
                    >
                      <Trash2 size={10} className="text-white" />
                    </button>
                  )}
                </div>
              )}
            </motion.button>
          ))}
          {/* Add block button */}
          <button className="flex-shrink-0 w-14 h-14 rounded-lg bg-white/10 border-2 border-dashed border-white/30 flex items-center justify-center">
            <Plus size={20} className="text-white/60" />
          </button>
        </div>
      </div>

      {/* BOTTOM ACTION BAR */}
      <div className="h-20 bg-black flex items-center justify-between px-4 pb-safe z-30">
        <button 
          onClick={onClose}
          className="px-4 py-2 text-white/60 text-sm"
        >
          {language === 'ba' ? 'Fagile' : 'Annuler'}
        </button>
        
        <motion.button 
          whileTap={{ scale: 0.95 }}
          onClick={handleConfirm}
          className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white px-8 py-3 rounded-full text-sm font-bold flex items-center gap-2 shadow-lg"
        >
          {language === 'ba' ? 'Tẹsiwaju' : 'Suivant'}
          <ChevronRight size={18} />
        </motion.button>
      </div>
    </div>
  );
};

export default TimelineEditor;
