import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import {
  X, Music, Repeat2, Timer, Flame, Eye, Sparkles, Gauge, Expand, Zap, ChevronDown,
  Image as ImageIcon, Type as TypeIcon, Wand2, Send, MessageCircle,
  Radio, Camera, Play, Pause, RotateCcw, Check, AlertCircle, Loader2, Globe,
  Volume2, VolumeX, HelpCircle, Mic,
} from 'lucide-react';

import { DynamicAITemplates, AITemplate, AIGenType } from './DynamicAITemplates';
import VideoFiltersPanel, { VIDEO_FILTERS, VideoFilter, useVideoFilter, scaleCssFilter } from './VideoFilters';

type TopTab = 'video' | 'story' | 'template' | 'live';
type CaptureMode = 'burst' | 'photo' | 'video' | 'text';

interface FullscreenCreatorProps {
  isOpen?: boolean;
  onClose?: () => void;
  onComplete?: (data: {
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
  }) => Promise<void>;
  language?: 'fr' | 'ba';
  enableVoiceGuidance?: boolean;
}

type MusicChoice = { id: string; title: string; url?: string; artist?: string; duration?: number };
type GradientTheme = 'purpleBlue' | 'orangePink' | 'greenCyan' | 'pinkPurple';

const VOICE_MESSAGES = {
  fr: { welcome: "Bienvenue. Appuyez sur le bouton pour enregistrer.", recording: "Enregistrement.", stopped: "Termine.", published: "Publication.", error: "Erreur." },
  ba: { welcome: "E ku abo. Te bọtini lati gba.", recording: "Igbasile.", stopped: "Pari.", published: "Firansẹ.", error: "Asise." },
};

function nowKey() { return new Date().toISOString().replace(/[:.]/g, '-'); }

function pickMimeType(kind: 'video' | 'audio') {
  const candidates = kind === 'video' ? ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'] : ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
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
  } catch (e) { console.error('[Upload Error]', e); throw e; }
}

async function renderStoryTextToImage(text: string, gradient: GradientTheme): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = 1080; canvas.height = 1920;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No canvas ctx');
  const g = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  if (gradient === 'purpleBlue') { g.addColorStop(0, '#7c3aed'); g.addColorStop(1, '#0ea5e9'); }
  else if (gradient === 'orangePink') { g.addColorStop(0, '#fb7185'); g.addColorStop(1, '#fb923c'); }
  else if (gradient === 'pinkPurple') { g.addColorStop(0, '#ec4899'); g.addColorStop(1, '#8b5cf6'); }
  else { g.addColorStop(0, '#22c55e'); g.addColorStop(1, '#06b6d4'); }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.font = '700 64px system-ui, -apple-system, sans-serif';
  const maxWidth = 920; const x = 80; let y = 280;
  const words = text.split(/\s+/); let line = ''; const lines: string[] = [];
  for (const w of words) { const test = line ? `${line} ${w}` : w; if (ctx.measureText(test).width > maxWidth) { if (line) lines.push(line); line = w; } else { line = test; } }
  if (line) lines.push(line);
  for (const l of lines.slice(0, 10)) { ctx.fillText(l, x, y); y += 84; }
  return await new Promise<Blob>((resolve, reject) => { canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png', 1); });
}

async function tryToggleTorch(stream: MediaStream | null, enabled: boolean) {
  try { const track = stream?.getVideoTracks?.()[0]; await track?.applyConstraints?.({ advanced: [{ torch: enabled } as MediaTrackConstraintSet] }); return true; } catch { return false; }
}

function speak(text: string, lang: 'fr' | 'ba' = 'fr') {
  if ('speechSynthesis' in window) { const u = new SpeechSynthesisUtterance(text); u.lang = lang === 'ba' ? 'yo-NG' : 'fr-FR'; u.rate = 0.9; window.speechSynthesis.cancel(); window.speechSynthesis.speak(u); }
}

interface BottomSheetProps { isOpen: boolean; onClose: () => void; title: string; titleBa?: string; icon?: React.ReactNode; children: React.ReactNode; maxHeight?: string; language?: 'fr' | 'ba'; }

const BottomSheet: React.FC<BottomSheetProps> = ({ isOpen, onClose, title, titleBa, icon, children, maxHeight = '70vh', language = 'fr' }) => {
  const handleDragEnd = useCallback((_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => { if (info.velocity.y > 500 || info.offset.y > 150) onClose(); }, [onClose]);
  const displayTitle = language === 'ba' && titleBa ? titleBa : title;
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div className="fixed inset-0 z-[95] bg-black/70" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div className="absolute bottom-0 left-0 right-0 rounded-t-3xl bg-black/95 backdrop-blur-xl border-t border-white/10 overflow-hidden flex flex-col" style={{ maxHeight }}
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            drag="y" dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.5 }} onDragEnd={handleDragEnd} onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing"><div className="w-10 h-1 bg-white/30 rounded-full" /></div>
            <div className="px-4 pb-3 flex items-center justify-between flex-shrink-0">
              <div className="text-white font-semibold text-lg flex items-center gap-2">{icon}{displayTitle}</div>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"><X className="w-5 h-5 text-white" /></button>
            </div>
            <div className="px-4 pb-4 overflow-y-auto flex-1 scroll-smooth snap-y snap-mandatory overscroll-contain">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

interface RightButtonProps { icon: React.ReactNode; label: string; labelBa?: string; onClick: () => void; active?: boolean; hidden?: boolean; language?: 'fr' | 'ba'; voiceEnabled?: boolean; }

const RightButton: React.FC<RightButtonProps> = ({ icon, label, labelBa, onClick, active, hidden, language = 'fr', voiceEnabled }) => {
  if (hidden) return null;
  const displayLabel = language === 'ba' && labelBa ? labelBa : label;
  const handleClick = () => { if (voiceEnabled) speak(displayLabel, language); onClick(); };
  return (
    <motion.button onClick={handleClick} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
      className={`flex flex-col items-center gap-1 py-2 px-2 rounded-2xl transition ${active ? 'bg-white/20 text-white' : 'bg-transparent text-white/85 hover:bg-white/10'}`} aria-pressed={active} aria-label={displayLabel}>
      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${active ? 'bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg' : 'bg-black/25 border border-white/10'}`}>{icon}</div>
      <span className="text-[11px] font-medium">{displayLabel}</span>
    </motion.button>
  );
};

export const FullscreenCreator: React.FC<FullscreenCreatorProps> = ({ isOpen = true, onClose, onComplete, language = 'fr', enableVoiceGuidance = false }) => {
  const { currentFilter, setCurrentFilter } = useVideoFilter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const burstTimerRef = useRef<number | null>(null);
  const recordingStartTime = useRef<number>(0);

  const [topTab, setTopTab] = useState<TopTab>('video');
  const [mode, setMode] = useState<CaptureMode>('video');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [countdown, setCountdown] = useState<number>(0);
  const [cameraError, setCameraError] = useState<string>('');
  const [timerSeconds, setTimerSeconds] = useState<0 | 3 | 10>(0);
  const [speed, setSpeed] = useState<number>(1);
  const [fullMode, setFullMode] = useState<boolean>(true);
  const [flashOn, setFlashOn] = useState<boolean>(false);
  const [livePhotoOn, setLivePhotoOn] = useState<boolean>(false);
  const [rightExpanded, setRightExpanded] = useState<boolean>(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [magicOpen, setMagicOpen] = useState(false);
  const [timerPanel, setTimerPanel] = useState(false);
  const [speedPanel, setSpeedPanel] = useState(false);
  const [challengePanel, setChallengePanel] = useState(false);
  const [inspiringPanel, setInspiringPanel] = useState(false);
  const [musicPanel, setMusicPanel] = useState(false);
  const [helpPanel, setHelpPanel] = useState(false);
  const [topic, setTopic] = useState<string>('');
  const [challenge, setChallenge] = useState<string>('');
  const [tags, setTags] = useState<string[]>([]);
  const [music, setMusic] = useState<MusicChoice | null>(null);
  const [durationPick, setDurationPick] = useState<60 | 300>(60);
  const [storyGradient, setStoryGradient] = useState<GradientTheme>('purpleBlue');
  const [textContent, setTextContent] = useState<string>('');
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [previewType, setPreviewType] = useState<'video' | 'photo' | 'text' | ''>('');
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [livePanelOpen, setLivePanelOpen] = useState(false);
  const [liveSessionId, setLiveSessionId] = useState<string>('');
  const [liveMessages, setLiveMessages] = useState<Array<{ id: number; message: string; display_name?: string }>>([]);
  const [liveInput, setLiveInput] = useState('');
  const [liveViewers, setLiveViewers] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [burstCount, setBurstCount] = useState(0);
  const [voiceEnabled, setVoiceEnabled] = useState(enableVoiceGuidance);

  const MUSIC_LIST: MusicChoice[] = useMemo(() => [
    { id: 'm1', title: 'Afro Chill', artist: 'TamTam Beats', duration: 120 },
    { id: 'm2', title: 'Drum Groove', artist: 'TamTam Studio', duration: 90 },
    { id: 'm3', title: 'Story Piano', artist: 'TamTam Music', duration: 60 },
    { id: 'm4', title: 'Viral Dance', artist: 'Trending Sounds', duration: 45 },
    { id: 'm5', title: 'Lo-Fi Vibes', artist: 'Chill Zone', duration: 180 },
  ], []);

  const CHALLENGES = useMemo(() => ['#DanceChallenge', '#BeforeAfter', '#LearnIn60s', '#MoodStory', '#VillageNews', '#DailyVlog', '#CookingTime', '#Fashion2025'], []);

  const INSPIRING = useMemo(() => [
    language === 'ba' ? 'Salaye ohun to gbọni' : 'Explique une astuce',
    language === 'ba' ? 'Siwaju/Lẹyin ayipada' : 'Avant/Apres',
    language === 'ba' ? 'Itan die' : 'Histoire courte',
    language === 'ba' ? 'Asise 3 to tobi' : 'Top 3 erreurs',
    language === 'ba' ? 'Imọran ọjọọjọ' : 'Conseil du jour',
  ], [language]);

  const announceVoice = useCallback((key: keyof typeof VOICE_MESSAGES['fr']) => {
    if (voiceEnabled) { const msg = language === 'ba' ? VOICE_MESSAGES.ba[key] : VOICE_MESSAGES.fr[key]; speak(msg, language); }
  }, [voiceEnabled, language]);

  useEffect(() => { if (isOpen && voiceEnabled) { setTimeout(() => announceVoice('welcome'), 500); } }, [isOpen, voiceEnabled, announceVoice]);

  useEffect(() => {
    let interval: number | undefined;
    if (isRecording) { interval = window.setInterval(() => setRecordingDuration(Date.now() - recordingStartTime.current), 100); }
    else { setRecordingDuration(0); }
    return () => { if (interval) window.clearInterval(interval); };
  }, [isRecording]);

  const stopStream = useCallback(() => {
    try { recorderRef.current?.stop(); } catch { /* ignore */ }
    recorderRef.current = null;
    if (streamRef.current) { for (const t of streamRef.current.getTracks()) t.stop(); }
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraError('');
  }, []);

  const startStream = useCallback(async () => {
    stopStream(); setCameraError('');
    try {
      const constraints: MediaStreamConstraints = { video: { facingMode, width: { ideal: 1080 }, height: { ideal: 1920 } }, audio: topTab === 'live' || mode === 'video' };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play().catch(() => { /* ignore */ }); }
      if (flashOn) await tryToggleTorch(stream, true);
    } catch { setCameraError(language === 'ba' ? 'Ko le wo kamera.' : "Impossible d'acceder a la camera."); }
  }, [facingMode, flashOn, language, mode, stopStream, topTab]);

  useEffect(() => {
    if (!isOpen) return;
    if (topTab === 'template') return;
    startStream();
    return () => { stopStream(); if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, [isOpen, topTab, facingMode, startStream, stopStream, previewUrl]);

  useEffect(() => { return () => { if (burstTimerRef.current) window.clearInterval(burstTimerRef.current); }; }, []);

  const handleClose = useCallback(() => { stopStream(); onClose?.(); }, [onClose, stopStream]);

  const capturePhotoBlob = useCallback(async (): Promise<Blob> => {
    const v = videoRef.current;
    if (!v) throw new Error('No video');
    const canvas = document.createElement('canvas');
    canvas.width = v.videoWidth || 1080; canvas.height = v.videoHeight || 1920;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No ctx');
    if (currentFilter && currentFilter.id !== 'none') { ctx.filter = scaleCssFilter(currentFilter.cssFilter, currentFilter.intensity); }
    ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) => { canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png', 1); });
  }, [currentFilter]);

  const startMediaRecorder = useCallback(async () => {
    if (!streamRef.current) throw new Error('No stream');
    chunksRef.current = [];
    const mimeType = pickMimeType('video');
    const rec = new MediaRecorder(streamRef.current, mimeType ? { mimeType } : undefined);
    recorderRef.current = rec;
    rec.ondataavailable = (e) => { if (e.data?.size > 0) chunksRef.current.push(e.data); };
    rec.start(300);
    recordingStartTime.current = Date.now();
    setIsRecording(true);
    announceVoice('recording');
  }, [announceVoice]);

  const stopRecorderGetBlob = useCallback(async (): Promise<Blob> => {
    return await new Promise<Blob>((resolve) => {
      const rec = recorderRef.current;
      if (!rec) { resolve(new Blob([], { type: 'video/webm' })); return; }
      const finalize = () => { resolve(new Blob(chunksRef.current, { type: rec.mimeType || 'video/webm' })); };
      rec.addEventListener('stop', finalize, { once: true });
      try { rec.stop(); } catch { finalize(); }
      finally { recorderRef.current = null; setIsRecording(false); }
    });
  }, []);

  const doCountdownThen = useCallback(async (fn: () => Promise<void>) => {
    if (timerSeconds === 0) return fn();
    setCountdown(timerSeconds);
    let remaining = timerSeconds;
    while (remaining > 0) { await new Promise(r => setTimeout(r, 1000)); remaining--; setCountdown(remaining); }
    return fn();
  }, [timerSeconds]);

  const beginCapture = useCallback(async () => {
    if (!isOpen) return;
    if (mode === 'video') { await doCountdownThen(async () => { await startMediaRecorder(); }); return; }
    if (mode === 'photo') {
      await doCountdownThen(async () => {
        if (livePhotoOn) { await startMediaRecorder(); await new Promise(r => setTimeout(r, 2000)); const blob = await stopRecorderGetBlob(); setPreviewBlob(blob); setPreviewUrl(URL.createObjectURL(blob)); setPreviewType('video'); }
        else { const blob = await capturePhotoBlob(); setPreviewBlob(blob); setPreviewUrl(URL.createObjectURL(blob)); setPreviewType('photo'); }
        announceVoice('stopped');
      });
      return;
    }
    if (mode === 'burst') {
      await doCountdownThen(async () => {
        const photos: Blob[] = []; let count = 0; setBurstCount(0);
        burstTimerRef.current = window.setInterval(async () => {
          try { const b = await capturePhotoBlob(); photos.push(b); count++; setBurstCount(count);
            if (count >= 8) { if (burstTimerRef.current) window.clearInterval(burstTimerRef.current); const last = photos[photos.length - 1]; setPreviewBlob(last); setPreviewUrl(URL.createObjectURL(last)); setPreviewType('photo'); setBurstCount(0); announceVoice('stopped'); }
          } catch { /* ignore */ }
        }, 250);
      });
      return;
    }
    if (mode === 'text') { const blob = await renderStoryTextToImage(textContent || ' ', storyGradient); setPreviewBlob(blob); setPreviewUrl(URL.createObjectURL(blob)); setPreviewType('photo'); announceVoice('stopped'); }
  }, [capturePhotoBlob, doCountdownThen, isOpen, livePhotoOn, mode, startMediaRecorder, stopRecorderGetBlob, storyGradient, textContent, announceVoice]);

  const endVideoCapture = useCallback(async () => { const blob = await stopRecorderGetBlob(); setPreviewBlob(blob); setPreviewUrl(URL.createObjectURL(blob)); setPreviewType('video'); announceVoice('stopped'); }, [stopRecorderGetBlob, announceVoice]);

  const clearPreview = useCallback(() => { if (previewUrl) URL.revokeObjectURL(previewUrl); setPreviewUrl(''); setPreviewType(''); setPreviewBlob(null); }, [previewUrl]);

  const submit = useCallback(async () => {
    if (!previewBlob) return;
    setIsSubmitting(true); announceVoice('published');
    try {
      let mediaUrl = ''; const mediaType = previewType === 'video' ? 'video' : 'photo';
      mediaUrl = await uploadToSupabaseStorage(previewBlob, mediaType === 'video' ? 'webm' : 'png', mediaType === 'video' ? 'videos' : 'photos');
      const isStory = topTab === 'story'; const seconds = mode === 'video' ? Math.floor(recordingDuration / 1000) || durationPick : isStory ? 15 : 5;
      const payload = { audio_url: mediaType === 'video' ? mediaUrl : '', media_type: mediaType as 'video' | 'photo', media_url: mediaUrl, transcript_fr: '', transcript_ba: '', template_id: 'kuaishou-core', topic: topic || challenge || (isStory ? 'story' : 'post'), duration_seconds: seconds, text_content: mode === 'text' ? textContent : undefined, tags, challenge, music_title: music?.title, is_story: isStory, filter_applied: currentFilter?.id };
      if (onComplete) await onComplete(payload);
      clearPreview(); handleClose();
    } catch { announceVoice('error'); alert(language === 'ba' ? 'Asise' : 'Erreur'); }
    finally { setIsSubmitting(false); }
  }, [challenge, clearPreview, currentFilter, durationPick, handleClose, language, mode, music?.title, onComplete, previewBlob, previewType, recordingDuration, tags, textContent, topTab, topic, announceVoice]);

  const doSwitch = useCallback(() => { setFacingMode(p => p === 'environment' ? 'user' : 'environment'); }, []);
  const toggleFlash = useCallback(async () => { setFlashOn(!flashOn); await tryToggleTorch(streamRef.current, !flashOn); }, [flashOn]);

  const onGenerated = useCallback((p: { type: AIGenType; content: string }) => {
    if (p.type === 'hashtags') { setTags(prev => [...new Set([...prev, ...p.content.split(/\s+/).filter(x => x.startsWith('#')).slice(0, 18)])]); }
    else if (p.type === 'hook' || p.type === 'title') { setTopic(p.content.split('\n')[0]?.slice(0, 80) || topic); }
    else if (p.type === 'caption' || p.type === 'script') { setTextContent(p.content); }
  }, [topic]);

  const onApplyTemplate = useCallback((t: AITemplate) => { setMagicOpen(false); if (!topic) setTopic(t.title); }, [topic]);

  const createLive = useCallback(async () => {
    // LIVE feature coming soon - tables not yet available
    console.log('LIVE feature coming soon');
    alert(language === 'ba' ? 'LIVE n bɔ laipe!' : 'Fonctionnalité LIVE bientôt disponible!');
  }, [language]);

  const sendLive = useCallback(async () => {
    // LIVE messages feature coming soon
    if (!liveInput.trim()) return;
    console.log('LIVE message:', liveInput);
    setLiveInput('');
  }, [liveInput]);

  if (!isOpen) return null;

  const isStory = topTab === 'story';
  const recordDurationText = `${Math.floor(recordingDuration / 60000)}:${Math.floor((recordingDuration % 60000) / 1000).toString().padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 z-[70] bg-black text-white overflow-hidden">
      {topTab !== 'template' && (
        <div className="absolute inset-0">
          <video ref={videoRef} playsInline muted className="w-full h-full" style={{ objectFit: fullMode ? 'cover' : 'contain', filter: currentFilter?.id !== 'none' ? scaleCssFilter(currentFilter!.cssFilter, currentFilter!.intensity) : 'none' }} />
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/50 pointer-events-none" />
        </div>
      )}
      {topTab === 'template' && (<div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-black to-pink-900" />)}
      {cameraError && topTab !== 'template' && (<div className="absolute top-20 left-4 right-4 p-4 rounded-2xl bg-red-500/20 border border-red-500/30 backdrop-blur-xl z-20"><div className="flex items-center gap-3"><AlertCircle className="w-5 h-5 text-red-400" /><p className="text-sm">{cameraError}</p></div></div>)}

      <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-10">
        <button onClick={handleClose} className="w-10 h-10 rounded-full bg-black/40 border border-white/10 backdrop-blur-xl flex items-center justify-center"><X className="w-5 h-5" /></button>
        <button onClick={() => setMusicPanel(true)} className="px-4 py-2 rounded-full bg-black/40 border border-white/10 backdrop-blur-xl flex items-center gap-2"><Music className="w-4 h-4" /><span className="text-sm truncate max-w-[100px]">{music?.title ?? (language === 'ba' ? 'Orin' : 'Musique')}</span></button>
        <div className="flex items-center gap-2">
          <button onClick={() => setVoiceEnabled(!voiceEnabled)} className={`w-10 h-10 rounded-full backdrop-blur-xl flex items-center justify-center border ${voiceEnabled ? 'bg-purple-500/40 border-purple-500/50' : 'bg-black/40 border-white/10'}`}>{voiceEnabled ? <Volume2 className="w-5 h-5 text-purple-300" /> : <VolumeX className="w-5 h-5 text-white/60" />}</button>
          <button onClick={() => setHelpPanel(true)} className="w-10 h-10 rounded-full bg-black/40 border border-white/10 backdrop-blur-xl flex items-center justify-center"><HelpCircle className="w-5 h-5 text-white/60" /></button>
        </div>
      </div>

      {isRecording && (<motion.div className="absolute top-20 left-4 px-4 py-2 rounded-full bg-red-500/90 backdrop-blur-xl flex items-center gap-3 z-10" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><motion.div className="w-3 h-3 rounded-full bg-white" animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1, repeat: Infinity }} /><span className="font-mono text-sm">{recordDurationText}</span></motion.div>)}
      {burstCount > 0 && (<div className="absolute top-20 left-1/2 -translate-x-1/2 px-6 py-2 rounded-full bg-purple-500/90 backdrop-blur-xl z-10"><span className="font-bold text-lg">{burstCount}/8</span></div>)}
      <AnimatePresence>{countdown > 0 && (<motion.div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><motion.div className="text-9xl font-extrabold drop-shadow-2xl" initial={{ scale: 0 }} animate={{ scale: [0, 1.2, 1] }}>{countdown}</motion.div></motion.div>)}</AnimatePresence>

      <div className="absolute right-3 top-24 z-10 flex flex-col gap-2 items-center max-h-[60vh] overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
        <RightButton icon={<Repeat2 className="w-5 h-5" />} label="Switch" labelBa="Yipada" onClick={doSwitch} language={language} voiceEnabled={voiceEnabled} />
        <RightButton icon={<Timer className="w-5 h-5" />} label="Timer" labelBa="Akoko" onClick={() => setTimerPanel(true)} active={timerSeconds !== 0} language={language} voiceEnabled={voiceEnabled} />
        <RightButton icon={<Flame className="w-5 h-5" />} label="Challenge" labelBa="Idije" onClick={() => setChallengePanel(true)} active={!!challenge} language={language} voiceEnabled={voiceEnabled} />
        <RightButton icon={<Eye className="w-5 h-5" />} label="Idees" labelBa="Imọran" onClick={() => setInspiringPanel(true)} language={language} voiceEnabled={voiceEnabled} />
        <RightButton icon={<Sparkles className="w-5 h-5" />} label="Filtres" labelBa="Asa" onClick={() => setFiltersOpen(true)} active={currentFilter?.id !== 'none'} language={language} voiceEnabled={voiceEnabled} />
        <RightButton icon={<Gauge className="w-5 h-5" />} label="Vitesse" labelBa="Iyara" onClick={() => setSpeedPanel(true)} active={speed !== 1} hidden={!rightExpanded} language={language} voiceEnabled={voiceEnabled} />
        <RightButton icon={<Expand className="w-5 h-5" />} label="Full" onClick={() => setFullMode(p => !p)} active={fullMode} hidden={!rightExpanded} language={language} voiceEnabled={voiceEnabled} />
        <RightButton icon={<Zap className="w-5 h-5" />} label="Flash" onClick={toggleFlash} active={flashOn} hidden={!rightExpanded} language={language} voiceEnabled={voiceEnabled} />
        <button onClick={() => setRightExpanded(p => !p)} className="w-10 h-10 rounded-full bg-black/40 border border-white/10 flex items-center justify-center mt-2"><ChevronDown className={`w-5 h-5 transition-transform ${rightExpanded ? '' : '-rotate-90'}`} /></button>
      </div>

      <AnimatePresence>
        {!!previewUrl && (
          <motion.div className="absolute inset-0 z-[60] bg-black/95 flex flex-col" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="flex items-center justify-between p-4">
              <button onClick={clearPreview} className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 flex items-center gap-2"><RotateCcw className="w-4 h-4" /><span>{language === 'ba' ? 'Tun se' : 'Reprendre'}</span></button>
              <div className="text-white/70 text-sm font-medium">{isStory ? (language === 'ba' ? 'Itan' : 'Story') : language === 'ba' ? 'Agbejade' : 'Apercu'}</div>
              <button onClick={submit} disabled={isSubmitting} className="px-4 py-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium disabled:opacity-50 flex items-center gap-2 shadow-lg">{isSubmitting ? (<><Loader2 className="w-4 h-4 animate-spin" /><span>{language === 'ba' ? 'N se...' : 'Envoi...'}</span></>) : (<><Check className="w-4 h-4" /><span>{language === 'ba' ? 'Firansẹ' : 'Publier'}</span></>)}</button>
            </div>
            <div className="flex-1 flex items-center justify-center px-4 pb-6">{previewType === 'video' ? (<video src={previewUrl} controls autoPlay loop className="max-h-[80vh] w-full rounded-2xl bg-black shadow-2xl" />) : (<img src={previewUrl} className="max-h-[80vh] w-full object-contain rounded-2xl bg-black shadow-2xl" alt="preview" />)}</div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute bottom-0 left-0 right-0 z-10 pb-6">
        <div className="mx-auto max-w-md px-4">
          <div className="rounded-2xl bg-black/40 border border-white/10 backdrop-blur-xl p-2 flex overflow-x-auto snap-x snap-mandatory" style={{ scrollbarWidth: 'none' }}>
            {(['video', 'story', 'template', 'live'] as TopTab[]).map((t) => (<button key={t} onClick={() => { setTopTab(t); if (t === 'live') setMode('video'); if (t === 'template') stopStream(); }} className={`flex-1 py-2 rounded-xl text-sm font-semibold snap-start whitespace-nowrap ${topTab === t ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg' : 'text-white/70'}`}>{t === 'video' ? (language === 'ba' ? 'Fidio' : 'Video') : t === 'story' ? (language === 'ba' ? 'Itan' : 'Story') : t === 'template' ? 'AI' : 'LIVE'}</button>))}
          </div>
        </div>

        {topTab === 'template' && (
          <div className="mx-auto max-w-md px-4 mt-4 space-y-3">
            <button onClick={() => setMagicOpen(true)} className="w-full rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3"><div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center"><Wand2 className="w-6 h-6" /></div><div className="text-left"><div className="font-semibold">{language === 'ba' ? 'AI Awọn Apẹẹrẹ' : 'AI Templates & Magic'}</div><div className="text-xs text-white/60">{language === 'ba' ? 'Awọn apẹẹrẹ, hashtags' : 'Templates, hashtags, scripts'}</div></div></div>
              <ChevronDown className="w-5 h-5 text-white/70 -rotate-90" />
            </button>
            <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
              <div className="text-white/70 text-sm mb-3 flex items-center gap-2"><Globe className="w-4 h-4" />{language === 'ba' ? 'Awọn koko' : 'Sujets tendance'}</div>
              <div className="flex flex-wrap gap-2">{INSPIRING.slice(0, 4).map((s, i) => (<button key={i} onClick={() => { setTopic(s); setTopTab('video'); }} className="px-3 py-2 rounded-full bg-white/10 text-white/80 text-xs">{s.length > 25 ? `${s.slice(0, 25)}...` : s}</button>))}</div>
            </div>
          </div>
        )}

        {topTab === 'live' && (
          <div className="mx-auto max-w-md px-4 mt-3">
            <div className="rounded-2xl bg-black/40 border border-red-500/30 p-4">
              <div className="flex items-center justify-between mb-3"><div className="flex items-center gap-2"><motion.div className="w-3 h-3 rounded-full bg-red-500" animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 1.5, repeat: Infinity }} /><Radio className="w-5 h-5 text-red-400" /><span className="font-semibold">LIVE</span></div><div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/10"><Eye className="w-4 h-4" /><span className="text-xs">{liveViewers}</span></div></div>
              <div className="flex gap-2"><button onClick={createLive} disabled={!!liveSessionId} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-pink-500 font-semibold disabled:opacity-50">{language === 'ba' ? 'Bẹrẹ' : 'Demarrer'}</button><button onClick={() => setLivePanelOpen(true)} disabled={!liveSessionId} className="flex-1 py-2.5 rounded-xl bg-white/10 font-semibold disabled:opacity-50">Chat</button></div>
            </div>
          </div>
        )}

        {topTab !== 'template' && (
          <>
            {(mode === 'video' || topTab === 'live') && (<div className="flex justify-center gap-3 mb-3 mt-4">{[300, 60].map((dur) => (<button key={dur} onClick={() => setDurationPick(dur as 60 | 300)} className={`px-4 py-2 rounded-full text-sm font-medium ${durationPick === dur ? 'bg-white text-black' : 'bg-black/30 border border-white/10 text-white/80'}`}>{dur === 300 ? '5 min' : '1 min'}</button>))}</div>)}
            <div className="flex justify-center gap-6 mb-3 text-sm font-semibold">{(['burst', 'photo', 'video', 'text'] as CaptureMode[]).map((m) => (<button key={m} onClick={() => setMode(m)} className={`px-3 py-1.5 rounded-full ${mode === m ? 'bg-white text-black' : 'text-white/75'}`}>{m === 'burst' ? (language === 'ba' ? 'Pupọ' : 'Rafale') : m === 'photo' ? (language === 'ba' ? 'Aworan' : 'Photo') : m === 'video' ? (language === 'ba' ? 'Fidio' : 'Video') : (language === 'ba' ? 'Ọrọ' : 'Texte')}</button>))}</div>
            <div className="mx-auto max-w-md px-10 flex items-end justify-between">
              <button onClick={() => setMagicOpen(true)} className="flex flex-col items-center gap-1.5"><div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/30 to-pink-500/30 border border-purple-500/30 flex items-center justify-center"><Wand2 className="w-6 h-6" /></div><span className="text-xs">Magic</span></button>
              <div className="flex flex-col items-center gap-2">
                <button onClick={isRecording ? endVideoCapture : beginCapture} disabled={countdown > 0} className={`w-20 h-20 rounded-full border-4 flex items-center justify-center shadow-2xl ${isRecording ? 'border-red-500 bg-red-500/40' : 'border-white/90 bg-gradient-to-tr from-purple-500/80 to-pink-500/80'}`}>{mode === 'photo' || mode === 'burst' ? <Camera className="w-8 h-8" /> : mode === 'text' ? <TypeIcon className="w-8 h-8" /> : isRecording ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8" />}</button>
                {mode === 'photo' && (<button onClick={() => setLivePhotoOn(p => !p)} className={`text-xs px-3 py-1 rounded-full border ${livePhotoOn ? 'bg-white text-black' : 'bg-black/30 text-white/80'}`}>Livephoto {livePhotoOn ? 'ON' : 'OFF'}</button>)}
              </div>
              <label className="flex flex-col items-center gap-1.5 cursor-pointer"><div className="w-14 h-14 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-center"><ImageIcon className="w-6 h-6" /></div><span className="text-xs">{language === 'ba' ? 'Album' : 'Albums'}</span><input type="file" accept="video/*,image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (!file) return; setPreviewBlob(file); setPreviewUrl(URL.createObjectURL(file)); setPreviewType(file.type.startsWith('video') ? 'video' : 'photo'); }} /></label>
            </div>
            {mode === 'text' && (
              <div className="mx-auto max-w-md px-4 mt-4">
                <div className={`rounded-2xl border border-white/20 p-4 bg-gradient-to-br ${storyGradient === 'purpleBlue' ? 'from-purple-500/40 to-sky-500/40' : storyGradient === 'orangePink' ? 'from-rose-500/40 to-orange-500/40' : 'from-green-500/40 to-cyan-500/40'}`}>
                  <textarea value={textContent} onChange={(e) => setTextContent(e.target.value)} placeholder={language === 'ba' ? 'Kọ nibi...' : 'Ecris ici...'} className="w-full min-h-[80px] rounded-xl bg-black/30 border border-white/20 p-3 text-white outline-none" />
                  <div className="mt-3 grid grid-cols-4 gap-2">{(['purpleBlue', 'orangePink', 'greenCyan', 'pinkPurple'] as GradientTheme[]).map((gr) => (<button key={gr} onClick={() => setStoryGradient(gr)} className={`aspect-square rounded-lg ${storyGradient === gr ? 'ring-2 ring-white' : ''}`} style={{ background: gr === 'purpleBlue' ? 'linear-gradient(135deg, #7c3aed, #0ea5e9)' : gr === 'orangePink' ? 'linear-gradient(135deg, #fb7185, #fb923c)' : gr === 'greenCyan' ? 'linear-gradient(135deg, #22c55e, #06b6d4)' : 'linear-gradient(135deg, #ec4899, #8b5cf6)' }} />))}</div>
                </div>
              </div>
            )}
            <div className="mx-auto max-w-md px-4 mt-3">
              <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder={language === 'ba' ? 'Koko...' : 'Sujet / idee...'} className="w-full px-4 py-3 rounded-2xl bg-black/40 border border-white/10 text-white placeholder:text-white/40 outline-none" />
              {(challenge || tags.length > 0) && (<div className="mt-2 flex flex-wrap gap-2">{challenge && <span className="text-xs px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/30 text-white">{challenge}</span>}{tags.slice(0, 5).map((t, i) => <span key={i} className="text-xs px-3 py-1 rounded-full bg-white/10 text-white/80">{t}</span>)}</div>)}
            </div>
          </>
        )}
      </div>

      <VideoFiltersPanel isOpen={filtersOpen} onClose={() => setFiltersOpen(false)} onSelectFilter={setCurrentFilter} currentFilter={currentFilter} language={language} />
      <DynamicAITemplates isOpen={magicOpen} onClose={() => setMagicOpen(false)} topic={topic || challenge || ' '} language={language} onApplyTemplate={onApplyTemplate} onGenerated={onGenerated} />

      <BottomSheet isOpen={timerPanel} onClose={() => setTimerPanel(false)} title="Minuterie" titleBa="Akoko" icon={<Timer className="w-5 h-5 text-purple-400" />} language={language}>
        <div className="grid grid-cols-3 gap-3">{([0, 3, 10] as const).map((t) => (<button key={t} onClick={() => { setTimerSeconds(t); setTimerPanel(false); }} className={`py-4 rounded-2xl border font-semibold ${timerSeconds === t ? 'bg-white text-black border-white' : 'bg-white/10 border-white/10 text-white'}`}>{t === 0 ? (language === 'ba' ? 'Ko si' : 'Off') : `${t}s`}</button>))}</div>
      </BottomSheet>

      <BottomSheet isOpen={speedPanel} onClose={() => setSpeedPanel(false)} title="Vitesse" titleBa="Iyara" icon={<Gauge className="w-5 h-5 text-purple-400" />} language={language}>
        <div className="grid grid-cols-3 gap-3">{[0.5, 1, 2].map((s) => (<button key={s} onClick={() => { setSpeed(s); setSpeedPanel(false); }} className={`py-4 rounded-2xl border font-semibold ${speed === s ? 'bg-white text-black border-white' : 'bg-white/10 border-white/10 text-white'}`}>{s}x</button>))}</div>
      </BottomSheet>

      <BottomSheet isOpen={challengePanel} onClose={() => setChallengePanel(false)} title="Challenges" titleBa="Awọn idije" icon={<Flame className="w-5 h-5 text-orange-400" />} language={language}>
        <div className="flex flex-wrap gap-2 mb-3">{CHALLENGES.map((c) => (<button key={c} onClick={() => { setChallenge(c); setChallengePanel(false); }} className={`px-4 py-2 rounded-full border font-medium ${challenge === c ? 'bg-white text-black border-white' : 'bg-white/10 border-white/10 text-white'}`}>{c}</button>))}</div>
        <button onClick={() => { setChallenge(''); setChallengePanel(false); }} className="w-full py-3 rounded-2xl bg-white/10 border border-white/10 text-white font-medium">{language === 'ba' ? 'Pare' : 'Effacer'}</button>
      </BottomSheet>

      <BottomSheet isOpen={inspiringPanel} onClose={() => setInspiringPanel(false)} title="Idees" titleBa="Awọn imọran" icon={<Eye className="w-5 h-5 text-purple-400" />} language={language}>
        <div className="space-y-2">{INSPIRING.map((s, i) => (<button key={i} onClick={() => { setTopic(s); setInspiringPanel(false); setMagicOpen(true); }} className="w-full text-left px-4 py-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-white"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500/30 to-pink-500/30 flex items-center justify-center text-sm font-bold">{i + 1}</div><span className="text-sm">{s}</span></div></button>))}</div>
      </BottomSheet>

      <BottomSheet isOpen={musicPanel} onClose={() => setMusicPanel(false)} title="Musique" titleBa="Orin" icon={<Music className="w-5 h-5 text-pink-400" />} language={language} maxHeight="60vh">
        <div className="space-y-2">
          {MUSIC_LIST.map((m) => (<button key={m.id} onClick={() => { setMusic(m); setMusicPanel(false); }} className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border ${music?.id === m.id ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-500/30' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}><div className="flex items-center gap-3"><Music className="w-5 h-5 text-white/70" /><div className="text-left"><div className="text-white font-medium">{m.title}</div><div className="text-xs text-white/60">{m.artist}</div></div></div>{music?.id === m.id && <Check className="w-5 h-5 text-white" />}</button>))}
          <button onClick={() => { setMusic(null); setMusicPanel(false); }} className="w-full py-3 rounded-2xl bg-white/10 border border-white/10 text-white font-medium mt-2">{language === 'ba' ? 'Ko si orin' : 'Aucune musique'}</button>
        </div>
      </BottomSheet>

      <BottomSheet isOpen={helpPanel} onClose={() => setHelpPanel(false)} title="Aide" titleBa="Iranlọwọ" icon={<HelpCircle className="w-5 h-5 text-blue-400" />} language={language}>
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20">
            <h4 className="font-semibold mb-2">{language === 'ba' ? 'Bi o se le lo' : 'Comment utiliser'}</h4>
            <ul className="text-sm text-white/80 space-y-2">
              <li>- {language === 'ba' ? 'Te bọtini yika lati gba fidio/aworan' : 'Appuyez sur le bouton rond pour capturer'}</li>
              <li>- {language === 'ba' ? 'Lo awọn asa lati se ẹwa fidio rẹ' : 'Utilisez les filtres pour embellir'}</li>
              <li>- {language === 'ba' ? 'Fi orin kun si ise rẹ' : 'Ajoutez de la musique a votre creation'}</li>
              <li>- {language === 'ba' ? 'Lo AI lati sẹda akọle' : "Utilisez l'IA pour generer des idees"}</li>
            </ul>
          </div>
          <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20">
            <h4 className="font-semibold mb-2 flex items-center gap-2"><Volume2 className="w-4 h-4 text-blue-400" />{language === 'ba' ? 'Iranlọwọ Ohun' : 'Aide Vocale'}</h4>
            <p className="text-sm text-white/80">{language === 'ba' ? 'Mu bọtini ohun sise lati gbọ itọni. O dara fun awọn ti ko le ka.' : 'Activez le bouton audio pour entendre les instructions. Ideal pour ceux qui ne peuvent pas lire.'}</p>
          </div>
          <div className="p-4 rounded-2xl bg-green-500/10 border border-green-500/20">
            <h4 className="font-semibold mb-2 flex items-center gap-2"><Mic className="w-4 h-4 text-green-400" />{language === 'ba' ? 'Ase Ohun' : 'Commandes Vocales'}</h4>
            <p className="text-sm text-white/80 mb-2">{language === 'ba' ? 'Sọ awọn ọrọ wọnyi:' : 'Dites ces mots:'}</p>
            <div className="flex flex-wrap gap-2">{['Enregistrer', 'Stop', 'Publier', 'Filtre', 'Musique'].map((cmd) => (<span key={cmd} className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-300">{cmd}</span>))}</div>
          </div>
        </div>
      </BottomSheet>

      <BottomSheet isOpen={livePanelOpen} onClose={() => setLivePanelOpen(false)} title="Chat LIVE" titleBa="Ifọrọwanilẹnuwọ" icon={<MessageCircle className="w-5 h-5 text-red-400" />} language={language} maxHeight="75vh">
        <div className="flex items-center gap-2 mb-3"><Eye className="w-3 h-3 text-white/70" /><span className="text-xs text-white">{liveViewers} {language === 'ba' ? 'oluwò' : 'viewers'}</span></div>
        <div className="rounded-2xl bg-black/30 border border-white/10 p-3 h-[35vh] overflow-y-auto mb-3 space-y-2">
          {liveMessages.length === 0 ? (<div className="text-white/50 text-sm text-center py-8">{language === 'ba' ? 'Ko si ifọrọwanilẹnuwọ' : 'Aucun message'}</div>) : (liveMessages.map((m) => (<div key={m.id} className="text-sm bg-white/5 rounded-lg p-2 border border-white/5"><span className="text-purple-400 font-medium text-xs mr-2">{m.display_name ?? 'viewer'}:</span><span className="text-white">{m.message}</span></div>)))}
        </div>
        <div className="flex gap-2"><input value={liveInput} onChange={(e) => setLiveInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && sendLive()} placeholder={language === 'ba' ? 'Kọ...' : 'Ecris...'} className="flex-1 px-4 py-3 rounded-2xl bg-black/40 border border-white/10 text-white outline-none" /><button onClick={sendLive} disabled={!liveInput.trim()} className="w-12 h-12 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center disabled:opacity-50"><Send className="w-5 h-5 text-white" /></button></div>
      </BottomSheet>
    </div>
  );
};

export default FullscreenCreator;
