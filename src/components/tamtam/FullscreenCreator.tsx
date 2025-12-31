import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import {
  X, Music, Repeat2, Timer, Flame, Eye, Sparkles, Gauge, Expand, Zap, ChevronDown,
  Image as ImageIcon, Type as TypeIcon, Wand2, Send, MessageCircle,
  Radio, Camera, Play, Pause, RotateCcw, Check, AlertCircle, Loader2, Globe,
  Mic, MicOff, Volume2, VolumeX, Edit3, Scissors, Layers, Heart, Share2,
  Download, Trash2, Plus, Minus, SkipBack, SkipForward, Settings,
  HelpCircle, Users, Gift, Star, Hash, ChevronLeft, ChevronRight,
} from 'lucide-react';

import { DynamicAITemplates, AITemplate, AIGenType } from './DynamicAITemplates';
import VideoFiltersPanel, { VIDEO_FILTERS, VideoFilter, useVideoFilter, scaleCssFilter } from './VideoFilters';

// ==================== TYPES ====================
type TopTab = 'video' | 'story' | 'template' | 'live';
type CaptureMode = 'burst' | 'photo' | 'video' | 'text';
type PreviewEditMode = 'none' | 'trim' | 'filter' | 'text' | 'music' | 'sticker' | 'speed' | 'effects';

interface FullscreenCreatorProps {
  isOpen?: boolean;
  onClose?: () => void;
  onComplete?: (data: CreatorOutput) => Promise<void>;
  language?: 'fr' | 'ba';
  enableVoiceGuidance?: boolean;
}

interface CreatorOutput {
  audio_url: string;
  media_type: 'audio' | 'video' | 'photo' | 'text';
  media_url?: string;
  transcript_fr?: string;
  transcript_ba?: string;
  template_id: string;
  topic: string;
  duration_seconds: number;
  text_content?: string;
  tags?: string[];
  challenge?: string;
  music_title?: string;
  is_story?: boolean;
  filter_applied?: string;
  effects_applied?: string[];
}

type MusicChoice = { id: string; title: string; url?: string; artist?: string; duration?: number };
type GradientTheme = 'purpleBlue' | 'orangePink' | 'greenCyan' | 'pinkPurple' | 'redYellow' | 'tealPurple';
type StickerType = { id: string; emoji: string; label: string };
type EffectType = { id: string; name: string; name_ba: string; icon: string };

// ==================== CONSTANTES ====================
const GRADIENTS: Record<GradientTheme, [string, string]> = {
  purpleBlue: ['#7c3aed', '#0ea5e9'],
  orangePink: ['#fb7185', '#fb923c'],
  pinkPurple: ['#ec4899', '#8b5cf6'],
  greenCyan: ['#22c55e', '#06b6d4'],
  redYellow: ['#ef4444', '#eab308'],
  tealPurple: ['#14b8a6', '#a855f7'],
};

const STICKERS: StickerType[] = [
  { id: 's1', emoji: '🔥', label: 'Fire' },
  { id: 's2', emoji: '❤️', label: 'Heart' },
  { id: 's3', emoji: '😂', label: 'Laugh' },
  { id: 's4', emoji: '🎉', label: 'Party' },
  { id: 's5', emoji: '✨', label: 'Sparkle' },
  { id: 's6', emoji: '💯', label: '100' },
  { id: 's7', emoji: '👏', label: 'Clap' },
  { id: 's8', emoji: '🙌', label: 'Raised' },
  { id: 's9', emoji: '💪', label: 'Strong' },
  { id: 's10', emoji: '🌟', label: 'Star' },
  { id: 's11', emoji: '🎵', label: 'Music' },
  { id: 's12', emoji: '📸', label: 'Camera' },
];

const EFFECTS: EffectType[] = [
  { id: 'e1', name: 'Ralenti', name_ba: 'Fà á', icon: '🐢' },
  { id: 'e2', name: 'Accéléré', name_ba: 'Yára', icon: '🐇' },
  { id: 'e3', name: 'Boomerang', name_ba: 'Padà', icon: '🔄' },
  { id: 'e4', name: 'Reverse', name_ba: 'Yípadà', icon: '⏪' },
  { id: 'e5', name: 'Zoom In', name_ba: 'Tóbi', icon: '🔍' },
  { id: 'e6', name: 'Glitch', name_ba: 'Fọ́', icon: '📺' },
];

// Messages vocaux pour accessibilité
const VOICE_MESSAGES = {
  fr: {
    welcome: "Bienvenue. Appuyez sur le bouton rond pour enregistrer.",
    recording: "Enregistrement en cours.",
    stopped: "Enregistrement terminé. Prévisualisez ou publiez.",
    filterApplied: "Filtre appliqué",
    musicAdded: "Musique ajoutée",
    switchCamera: "Caméra changée",
    timerSet: "Minuterie réglée",
    published: "Publication en cours",
    error: "Une erreur est survenue",
  },
  ba: {
    welcome: "Ẹ kú àbọ̀. Tẹ bọ́tìnì yíká láti gbà.",
    recording: "Ń ṣe ìgbàsílẹ̀.",
    stopped: "Ìgbàsílẹ̀ parí. Wo tàbí fi ránṣẹ́.",
    filterApplied: "A ti lo àṣà",
    musicAdded: "A ti fi orin kun",
    switchCamera: "A ti yí kámẹ́rà padà",
    timerSet: "A ti ṣètò àkókò",
    published: "Ń fi ránṣẹ́",
    error: "Àṣìṣe ṣẹlẹ̀",
  },
};

// ==================== HELPERS ====================
function nowKey() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function pickMimeType(kind: 'video' | 'audio') {
  const candidates = kind === 'video'
    ? ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4']
    : ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
  return candidates.find((t) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported?.(t)) || '';
}

async function uploadToSupabaseStorage(blob: Blob, ext: string, folder: string): Promise<string> {
  try {
    const { supabase } = await import('@/integrations/supabase/client');
    const bucket = 'tamtam-media';
    const name = `${folder}/${nowKey()}-${crypto.randomUUID()}.${ext}`;
    const contentType = blob.type || (ext === 'webm' ? 'video/webm' : ext === 'png' ? 'image/png' : 'application/octet-stream');
    const { error } = await supabase.storage.from(bucket).upload(name, blob, { upsert: true, contentType });
    if (error) throw error;
    const { data } = supabase.storage.from(bucket).getPublicUrl(name);
    return data.publicUrl;
  } catch (e) {
    console.error('[Upload Error]', e);
    throw e;
  }
}

async function renderStoryTextToImage(text: string, gradient: GradientTheme, stickers: string[] = []): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No canvas ctx');
  
  const [color1, color2] = GRADIENTS[gradient];
  const g = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  g.addColorStop(0, color1);
  g.addColorStop(1, color2);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.font = '700 64px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  
  const maxWidth = 920;
  const words = text.split(/\s+/);
  let line = '';
  const lines: string[] = [];
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth) { if (line) lines.push(line); line = w; }
    else { line = test; }
  }
  if (line) lines.push(line);
  
  const startY = (canvas.height - lines.length * 84) / 2;
  lines.slice(0, 10).forEach((l, i) => {
    ctx.fillText(l, canvas.width / 2, startY + i * 84);
  });
  
  ctx.font = '96px system-ui';
  stickers.forEach((emoji, i) => {
    const x = 100 + (i % 4) * 250;
    const y = canvas.height - 300 + Math.floor(i / 4) * 120;
    ctx.fillText(emoji, x, y);
  });
  
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png', 1);
  });
}

async function tryToggleTorch(stream: MediaStream | null, enabled: boolean) {
  try {
    const track = stream?.getVideoTracks?.()[0];
    await track?.applyConstraints?.({ advanced: [{ torch: enabled } as any] });
    return true;
  } catch { return false; }
}

// Text-to-Speech pour guidance vocale
function speak(text: string, lang: 'fr' | 'ba' = 'fr') {
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === 'ba' ? 'yo-NG' : 'fr-FR';
    utterance.rate = 0.9;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }
}

// ==================== COMPOSANTS ====================

// BottomSheet réutilisable avec drag-to-close
interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  titleBa?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  maxHeight?: string;
  language?: 'fr' | 'ba';
  onVoiceGuide?: () => void;
}

const BottomSheet: React.FC<BottomSheetProps> = ({ 
  isOpen, onClose, title, titleBa, icon, children, maxHeight = '70vh', language = 'fr', onVoiceGuide 
}) => {
  const handleDragEnd = useCallback((_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.velocity.y > 500 || info.offset.y > 150) onClose();
  }, [onClose]);

  const displayTitle = language === 'ba' && titleBa ? titleBa : title;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          className="fixed inset-0 z-[95] bg-black/70" 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }} 
          onClick={onClose}
        >
          <motion.div
            className="absolute bottom-0 left-0 right-0 rounded-t-3xl bg-black/95 backdrop-blur-xl border-t border-white/10 overflow-hidden flex flex-col"
            style={{ maxHeight }}
            initial={{ y: '100%' }} 
            animate={{ y: 0 }} 
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            drag="y" 
            dragConstraints={{ top: 0, bottom: 0 }} 
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={handleDragEnd}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing">
              <div className="w-10 h-1 bg-white/30 rounded-full" />
            </div>
            <div className="px-4 pb-3 flex items-center justify-between flex-shrink-0">
              <div className="text-white font-semibold text-lg flex items-center gap-2">{icon}{displayTitle}</div>
              <div className="flex items-center gap-2">
                {onVoiceGuide && (
                  <button onClick={onVoiceGuide} className="w-8 h-8 rounded-full bg-purple-500/20 hover:bg-purple-500/30 flex items-center justify-center">
                    <Volume2 className="w-4 h-4 text-purple-400" />
                  </button>
                )}
                <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center">
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>
            <div className="px-4 pb-4 overflow-y-auto flex-1 scroll-smooth snap-y snap-mandatory overscroll-contain">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Bouton latéral avec support vocal
interface RightButtonProps {
  icon: React.ReactNode;
  label: string;
  labelBa?: string;
  onClick: () => void;
  active?: boolean;
  hidden?: boolean;
  language?: 'fr' | 'ba';
  voiceEnabled?: boolean;
}

const RightButton: React.FC<RightButtonProps> = ({ 
  icon, label, labelBa, onClick, active, hidden, language = 'fr', voiceEnabled 
}) => {
  if (hidden) return null;
  const displayLabel = language === 'ba' && labelBa ? labelBa : label;
  
  const handleClick = () => {
    if (voiceEnabled) speak(displayLabel, language);
    onClick();
  };
  
  return (
    <motion.button 
      onClick={handleClick} 
      whileHover={{ scale: 1.05 }} 
      whileTap={{ scale: 0.95 }}
      className={`flex flex-col items-center gap-1 py-2 px-2 rounded-2xl transition ${active ? 'bg-white/20 text-white' : 'bg-transparent text-white/85 hover:bg-white/10'}`}
      aria-pressed={active}
      aria-label={displayLabel}
    >
      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${active ? 'bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg' : 'bg-black/25 border border-white/10'}`}>
        {icon}
      </div>
      <span className="text-[11px] font-medium">{displayLabel}</span>
    </motion.button>
  );
};

// ==================== PREVIEW COMPLET ====================
interface FullPreviewProps {
  previewUrl: string;
  previewType: 'video' | 'photo' | 'text' | '';
  onClose: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  language: 'fr' | 'ba';
  voiceEnabled: boolean;
  currentFilter: VideoFilter | null;
  onFilterChange: (filter: VideoFilter) => void;
  music: MusicChoice | null;
  onMusicChange: (music: MusicChoice | null) => void;
  topic: string;
  onTopicChange: (topic: string) => void;
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  challenge: string;
  isStory: boolean;
  stickers: string[];
  onStickersChange: (stickers: string[]) => void;
  speed: number;
  onSpeedChange: (speed: number) => void;
}

const FullPreview: React.FC<FullPreviewProps> = ({
  previewUrl, previewType, onClose, onSubmit, isSubmitting,
  language, voiceEnabled, currentFilter, onFilterChange, music, onMusicChange,
  topic, onTopicChange, tags, onTagsChange, challenge, isStory,
  stickers, onStickersChange, speed, onSpeedChange,
}) => {
  const [editMode, setEditMode] = useState<PreviewEditMode>('none');
  const [showFilters, setShowFilters] = useState(false);
  const [showMusic, setShowMusic] = useState(false);
  const [showStickers, setShowStickers] = useState(false);
  const [showEffects, setShowEffects] = useState(false);
  const [overlayText, setOverlayText] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);
  const [selectedEffects, setSelectedEffects] = useState<string[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);

  const MUSIC_LIST: MusicChoice[] = [
    { id: 'm1', title: 'Afro Chill', artist: 'TamTam Beats', duration: 120 },
    { id: 'm2', title: 'Drum Groove', artist: 'TamTam Studio', duration: 90 },
    { id: 'm3', title: 'Story Piano', artist: 'TamTam Music', duration: 60 },
    { id: 'm4', title: 'Viral Dance', artist: 'Trending Sounds', duration: 45 },
    { id: 'm5', title: 'Lo-Fi Vibes', artist: 'Chill Zone', duration: 180 },
    { id: 'm6', title: 'Afrobeats Hit', artist: 'West Africa', duration: 75 },
    { id: 'm7', title: 'Traditional Drums', artist: 'Village Sounds', duration: 60 },
  ];

  const handleSpeedChange = (newSpeed: number) => {
    onSpeedChange(newSpeed);
    if (videoRef.current) videoRef.current.playbackRate = newSpeed;
    if (voiceEnabled) speak(`Vitesse ${newSpeed}x`, language);
  };

  const addSticker = (emoji: string) => {
    if (stickers.length < 8) {
      onStickersChange([...stickers, emoji]);
      if (voiceEnabled) speak(language === 'ba' ? 'A fi àwòrán kun' : 'Autocollant ajouté', language);
    }
  };

  return (
    <motion.div 
      className="absolute inset-0 z-[60] bg-black flex flex-col" 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
    >
      {/* Top Bar */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent absolute top-0 left-0 right-0 z-10">
        <button onClick={onClose} className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 flex items-center gap-2 backdrop-blur-sm">
          <RotateCcw className="w-4 h-4" />
          <span className="text-sm">{language === 'ba' ? 'Tún ṣe' : 'Reprendre'}</span>
        </button>
        <div className="text-white/80 text-sm font-medium">
          {isStory ? (language === 'ba' ? 'Ìtàn' : 'Story') : (language === 'ba' ? 'Àgbéjade' : 'Aperçu')}
        </div>
        <button onClick={onSubmit} disabled={isSubmitting} className="px-4 py-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium disabled:opacity-50 flex items-center gap-2 shadow-lg">
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          <span className="text-sm">{isSubmitting ? (language === 'ba' ? 'Ń ṣe...' : 'Envoi...') : (language === 'ba' ? 'Fíránṣẹ́' : 'Publier')}</span>
        </button>
      </div>

      {/* Media Preview */}
      <div className="flex-1 flex items-center justify-center px-4 pt-16 pb-48 relative">
        {previewType === 'video' ? (
          <video 
            ref={videoRef}
            src={previewUrl} 
            controls 
            autoPlay 
            loop 
            playsInline
            className="max-h-full max-w-full rounded-2xl shadow-2xl"
            style={{
              filter: currentFilter && currentFilter.id !== 'none' 
                ? scaleCssFilter(currentFilter.cssFilter, currentFilter.intensity) 
                : 'none'
            }}
          />
        ) : (
          <div className="relative">
            <img 
              src={previewUrl} 
              className="max-h-[70vh] max-w-full object-contain rounded-2xl shadow-2xl" 
              alt="preview"
              style={{
                filter: currentFilter && currentFilter.id !== 'none' 
                  ? scaleCssFilter(currentFilter.cssFilter, currentFilter.intensity) 
                  : 'none'
              }}
            />
            {stickers.length > 0 && (
              <div className="absolute inset-0 pointer-events-none">
                {stickers.map((emoji, i) => (
                  <motion.span key={i} initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute text-4xl"
                    style={{ left: `${20 + (i % 4) * 20}%`, top: `${70 + Math.floor(i / 4) * 10}%` }}>
                    {emoji}
                  </motion.span>
                ))}
              </div>
            )}
            {overlayText && (
              <div className="absolute bottom-20 left-4 right-4 text-center">
                <p className="text-white text-xl font-bold drop-shadow-lg bg-black/30 rounded-lg px-4 py-2">{overlayText}</p>
              </div>
            )}
          </div>
        )}
        
        {music && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="absolute bottom-52 left-4 right-4">
            <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-black/60 backdrop-blur-sm mx-auto w-fit">
              <Music className="w-4 h-4 text-pink-400 animate-pulse" />
              <span className="text-white text-sm font-medium">{music.title}</span>
              <span className="text-white/60 text-xs">- {music.artist}</span>
            </div>
          </motion.div>
        )}
      </div>

      {/* Edit Tools Bar */}
      <div className="absolute bottom-32 left-0 right-0 px-4">
        <div className="flex justify-center gap-3 overflow-x-auto scrollbar-hide py-2" style={{ scrollbarWidth: 'none' }}>
          {previewType === 'video' && (
            <button onClick={() => setEditMode(editMode === 'trim' ? 'none' : 'trim')}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition ${editMode === 'trim' ? 'bg-purple-500/30 text-purple-300' : 'bg-white/10 text-white/70'}`}>
              <Scissors className="w-5 h-5" />
              <span className="text-[10px]">{language === 'ba' ? 'Gé' : 'Couper'}</span>
            </button>
          )}
          <button onClick={() => setShowFilters(true)}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition ${currentFilter && currentFilter.id !== 'none' ? 'bg-purple-500/30 text-purple-300' : 'bg-white/10 text-white/70'}`}>
            <Sparkles className="w-5 h-5" />
            <span className="text-[10px]">{language === 'ba' ? 'Àṣà' : 'Filtres'}</span>
          </button>
          <button onClick={() => setShowMusic(true)}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition ${music ? 'bg-pink-500/30 text-pink-300' : 'bg-white/10 text-white/70'}`}>
            <Music className="w-5 h-5" />
            <span className="text-[10px]">{language === 'ba' ? 'Orin' : 'Musique'}</span>
          </button>
          <button onClick={() => setShowTextInput(true)} className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl bg-white/10 text-white/70">
            <TypeIcon className="w-5 h-5" />
            <span className="text-[10px]">{language === 'ba' ? 'Ọ̀rọ̀' : 'Texte'}</span>
          </button>
          <button onClick={() => setShowStickers(true)}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition ${stickers.length > 0 ? 'bg-yellow-500/30 text-yellow-300' : 'bg-white/10 text-white/70'}`}>
            <Star className="w-5 h-5" />
            <span className="text-[10px]">{language === 'ba' ? 'Àwòrán' : 'Stickers'}</span>
          </button>
          {previewType === 'video' && (
            <>
              <button onClick={() => setEditMode(editMode === 'speed' ? 'none' : 'speed')}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition ${speed !== 1 ? 'bg-cyan-500/30 text-cyan-300' : 'bg-white/10 text-white/70'}`}>
                <Gauge className="w-5 h-5" />
                <span className="text-[10px]">{speed}x</span>
              </button>
              <button onClick={() => setShowEffects(true)}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition ${selectedEffects.length > 0 ? 'bg-orange-500/30 text-orange-300' : 'bg-white/10 text-white/70'}`}>
                <Layers className="w-5 h-5" />
                <span className="text-[10px]">{language === 'ba' ? 'Ipa' : 'Effets'}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Speed Control */}
      {editMode === 'speed' && previewType === 'video' && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="absolute bottom-48 left-4 right-4">
          <div className="bg-black/80 backdrop-blur-xl rounded-2xl p-4 border border-white/10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-white/80 text-sm">{language === 'ba' ? 'Iyára' : 'Vitesse'}</span>
              <span className="text-white font-bold">{speed}x</span>
            </div>
            <div className="flex justify-between gap-2">
              {[0.25, 0.5, 1, 1.5, 2, 3].map((s) => (
                <button key={s} onClick={() => handleSpeedChange(s)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${speed === s ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white' : 'bg-white/10 text-white/70'}`}>
                  {s}x
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Caption & Tags Input */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/95 to-transparent p-4 pt-8">
        <div className="space-y-3">
          <div className="relative">
            <input value={topic} onChange={(e) => onTopicChange(e.target.value)}
              placeholder={language === 'ba' ? 'Fi àkọlé kún...' : 'Ajouter une légende...'}
              className="w-full px-4 py-3 pr-12 rounded-2xl bg-white/10 border border-white/10 text-white placeholder:text-white/40 outline-none focus:border-purple-500/50" />
            <button className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
              <Wand2 className="w-4 h-4 text-purple-400" />
            </button>
          </div>
          {(challenge || tags.length > 0) && (
            <div className="flex flex-wrap gap-2">
              {challenge && (
                <span className="text-xs px-3 py-1.5 rounded-full bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30 text-orange-300 font-medium flex items-center gap-1">
                  <Flame className="w-3 h-3" />{challenge}
                </span>
              )}
              {tags.slice(0, 5).map((tag, i) => (
                <span key={i} className="text-xs px-3 py-1.5 rounded-full bg-white/10 border border-white/10 text-white/80 flex items-center gap-1">
                  <Hash className="w-3 h-3" />{tag.replace('#', '')}
                  <button onClick={() => onTagsChange(tags.filter((_, idx) => idx !== i))} className="ml-1 hover:text-red-400"><X className="w-3 h-3" /></button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Panels */}
      <VideoFiltersPanel isOpen={showFilters} onClose={() => setShowFilters(false)} onSelectFilter={onFilterChange} currentFilter={currentFilter} language={language} />
      
      <BottomSheet isOpen={showMusic} onClose={() => setShowMusic(false)} title="Musique" titleBa="Orin" icon={<Music className="w-5 h-5 text-pink-400" />} language={language} maxHeight="60vh">
        <div className="space-y-2">
          {MUSIC_LIST.map((m) => (
            <button key={m.id} onClick={() => { onMusicChange(m); setShowMusic(false); }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border transition ${music?.id === m.id ? 'bg-gradient-to-r from-pink-500/20 to-purple-500/20 border-pink-500/30' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500/30 to-purple-500/30 flex items-center justify-center"><Music className="w-5 h-5 text-pink-300" /></div>
                <div className="text-left">
                  <div className="text-white font-medium">{m.title}</div>
                  <div className="text-xs text-white/60">{m.artist} • {m.duration}s</div>
                </div>
              </div>
              {music?.id === m.id && <Check className="w-5 h-5 text-pink-400" />}
            </button>
          ))}
          <button onClick={() => { onMusicChange(null); setShowMusic(false); }} className="w-full py-3 rounded-2xl bg-white/10 border border-white/10 text-white font-medium hover:bg-white/20 mt-2">
            {language === 'ba' ? 'Mú orin kúrò' : 'Aucune musique'}
          </button>
        </div>
      </BottomSheet>

      <BottomSheet isOpen={showStickers} onClose={() => setShowStickers(false)} title="Autocollants" titleBa="Àwọn àwòrán" icon={<Star className="w-5 h-5 text-yellow-400" />} language={language} maxHeight="50vh">
        <div className="grid grid-cols-6 gap-3">
          {STICKERS.map((sticker) => (
            <button key={sticker.id} onClick={() => addSticker(sticker.emoji)}
              className="aspect-square rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-2xl transition active:scale-95">
              {sticker.emoji}
            </button>
          ))}
        </div>
        {stickers.length > 0 && (
          <div className="mt-4 pt-4 border-t border-white/10">
            <div className="text-white/60 text-xs mb-2">{language === 'ba' ? 'Àwọn tí a yan' : 'Sélectionnés'} ({stickers.length}/8)</div>
            <div className="flex gap-2 flex-wrap">
              {stickers.map((emoji, i) => (
                <button key={i} onClick={() => onStickersChange(stickers.filter((_, idx) => idx !== i))}
                  className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-xl relative group">
                  {emoji}
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100"><X className="w-3 h-3" /></span>
                </button>
              ))}
            </div>
          </div>
        )}
      </BottomSheet>

      <BottomSheet isOpen={showTextInput} onClose={() => setShowTextInput(false)} title="Ajouter du texte" titleBa="Fi ọ̀rọ̀ kun" icon={<TypeIcon className="w-5 h-5 text-blue-400" />} language={language} maxHeight="40vh">
        <div className="space-y-4">
          <textarea value={overlayText} onChange={(e) => setOverlayText(e.target.value)}
            placeholder={language === 'ba' ? 'Kọ ọ̀rọ̀ níbí...' : 'Tapez votre texte ici...'}
            className="w-full px-4 py-3 rounded-2xl bg-white/10 border border-white/10 text-white placeholder:text-white/40 outline-none resize-none h-24" />
          <button onClick={() => setShowTextInput(false)} className="w-full py-3 rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-medium">
            {language === 'ba' ? 'Fi kun' : 'Ajouter'}
          </button>
        </div>
      </BottomSheet>

      <BottomSheet isOpen={showEffects} onClose={() => setShowEffects(false)} title="Effets" titleBa="Àwọn ipa" icon={<Layers className="w-5 h-5 text-orange-400" />} language={language} maxHeight="50vh">
        <div className="grid grid-cols-4 gap-3">
          {EFFECTS.map((effect) => (
            <button key={effect.id} onClick={() => setSelectedEffects(prev => prev.includes(effect.id) ? prev.filter(e => e !== effect.id) : [...prev, effect.id])}
              className={`aspect-square rounded-xl flex flex-col items-center justify-center gap-1 transition ${selectedEffects.includes(effect.id) ? 'bg-gradient-to-br from-orange-500/30 to-red-500/30 border border-orange-500/50' : 'bg-white/10 hover:bg-white/20 border border-transparent'}`}>
              <span className="text-2xl">{effect.icon}</span>
              <span className="text-[10px] text-white/70">{language === 'ba' ? effect.name_ba : effect.name}</span>
            </button>
          ))}
        </div>
      </BottomSheet>
    </motion.div>
  );
};
d mb-2 flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-blue-400" />
              {language === 'ba' ? 'Ìrànlọ́wọ́ Ohùn' : 'Aide Vocale'}
            </h4>
            <p className="text-sm text-white/80">
              {language === 'ba' 
                ? 'Mú bọ́tìnì ohùn ṣiṣẹ́ láti gbọ́ ìtọ́ni. Ó dára fún àwọn tí kò lè kà.' 
                : 'Activez le bouton audio pour entendre les instructions. Idéal pour ceux qui ne peuvent pas lire.'}
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-green-500/10 border border-green-500/20">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <Mic className="w-4 h-4 text-green-400" />
              {language === 'ba' ? 'Àṣẹ Ohùn' : 'Commandes Vocales'}
            </h4>
            <p className="text-sm text-white/80 mb-2">
              {language === 'ba' ? 'Sọ àwọn ọ̀rọ̀ wọ̀nyí:' : 'Dites ces mots:'}
            </p>
            <div className="flex flex-wrap gap-2">
              {['Enregistrer', 'Stop', 'Publier', 'Filtre', 'Musique'].map((cmd) => (
                <span key={cmd} className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-300">{cmd}</span>
              ))}
            </div>
          </div>
        </div>
      </BottomSheet>

      {/* Live Chat Panel */}
      <BottomSheet isOpen={livePanelOpen} onClose={() => setLivePanelOpen(false)} title="Chat LIVE" titleBa="Ìfọ̀rọ̀wánilẹ̀nuwò" icon={<MessageCircle className="w-5 h-5 text-red-400" />} language={language} maxHeight="75vh">
        <div className="flex items-center gap-2 mb-3">
          <Eye className="w-3 h-3 text-white/70" />
          <span className="text-xs text-white">{liveViewers} {language === 'ba' ? 'olùwò' : 'viewers'}</span>
        </div>
        <div className="rounded-2xl bg-black/30 border border-white/10 p-3 h-[35vh] overflow-y-auto mb-3 space-y-2">
          {liveMessages.length === 0 ? (
            <div className="text-white/50 text-sm text-center py-8">{language === 'ba' ? 'Kò sí ìfọ̀rọ̀wánilẹ̀nuwò' : 'Aucun message'}</div>
          ) : (
            liveMessages.map((m) => (
              <div key={m.id} className="text-sm bg-white/5 rounded-lg p-2 border border-white/5">
                <span className="text-purple-400 font-medium text-xs mr-2">{m.display_name ?? 'viewer'}:</span>
                <span className="text-white">{m.message}</span>
              </div>
            ))
          )}
        </div>
        <div className="flex gap-2">
          <input value={liveInput} onChange={(e) => setLiveInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && sendLive()}
            placeholder={language === 'ba' ? 'Kọ...' : 'Écris...'} className="flex-1 px-4 py-3 rounded-2xl bg-black/40 border border-white/10 text-white outline-none" />
          <button onClick={sendLive} disabled={!liveInput.trim()} className="w-12 h-12 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center disabled:opacity-50">
            <Send className="w-5 h-5 text-white" />
          </button>
        </div>
      </BottomSheet>
    </div>
  );
};

export default FullscreenCreator;
