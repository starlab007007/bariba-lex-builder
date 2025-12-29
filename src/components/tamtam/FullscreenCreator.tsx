import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Camera,
  Check,
  Filter,
  Loader2,
  Mic,
  Music,
  Pause,
  Play,
  Palette,
  Send,
  Sparkles,
  Trash2,
  Type,
  Video,
  X,
  RotateCcw,
} from 'lucide-react';

import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';
import { useUnifiedAudio } from '@/hooks/useUnifiedAudio';
import { triggerFeedback } from '@/utils/tamtamFeedback';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

import { AnimatedBackground, BackgroundTheme } from './AnimatedBackground';
import { DynamicAITemplates, CreatorIntent, CreatorSegment } from './DynamicAITemplates';
import { MUSIC_LIBRARY, MusicTrack, getSuggestedMusic } from '@/data/musicLibrary';
import { VideoFiltersPanel, VideoFilter, getFilterStyle } from './VideoFilters';
import { Textarea } from '@/components/ui/textarea';

// ============= MediaRecorder compatibility =============
const canUseMediaRecorder = () => typeof window !== 'undefined' && typeof MediaRecorder !== 'undefined';
const safeIsTypeSupported = (mime: string) => {
  try {
    return !!(MediaRecorder as any)?.isTypeSupported?.(mime);
  } catch {
    return false;
  }
};

const getSupportedMimeType = (mediaType: 'audio' | 'video'): string => {
  if (!canUseMediaRecorder()) return '';
  if (mediaType === 'audio') {
    if (safeIsTypeSupported('audio/mp4')) return 'audio/mp4';
    if (safeIsTypeSupported('audio/webm;codecs=opus')) return 'audio/webm;codecs=opus';
    if (safeIsTypeSupported('audio/webm')) return 'audio/webm';
    if (safeIsTypeSupported('audio/ogg')) return 'audio/ogg';
    return '';
  }
  if (safeIsTypeSupported('video/mp4')) return 'video/mp4';
  if (safeIsTypeSupported('video/webm;codecs=vp9,opus')) return 'video/webm;codecs=vp9,opus';
  if (safeIsTypeSupported('video/webm;codecs=vp9')) return 'video/webm;codecs=vp9';
  if (safeIsTypeSupported('video/webm')) return 'video/webm';
  return '';
};

const getFileExtension = (mimeType: string): string => {
  const map: Record<string, string> = {
    'audio/mp4': 'm4a',
    'audio/webm': 'webm',
    'audio/webm;codecs=opus': 'webm',
    'audio/ogg': 'ogg',
    'audio/wav': 'wav',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/webm;codecs=vp9': 'webm',
    'video/webm;codecs=vp9,opus': 'webm',
    'image/jpeg': 'jpg',
  };
  return map[mimeType] || 'webm';
};

const blobToBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

const createSilentWavBlob = (durationMs = 700, sampleRate = 44100) => {
  const numSamples = Math.max(1, Math.floor(sampleRate * (durationMs / 1000)));
  const dataSize = numSamples * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  return new Blob([buffer], { type: 'audio/wav' });
};

// ============= Types =============
type Phase = 'template' | 'capture' | 'preview';
type CreatorMode = 'live' | 'publication' | 'create';

interface CreationTemplate {
  id: string;
  template_key: string;
  label_fr: string;
  label_ba?: string;
  icon: string;
  category: string;
  steps: Array<{
    step: number;
    type: 'audio' | 'video';
    duration: number;
    instruction_fr: string;
    instruction_ba?: string;
  }>;
  music_url?: string;
}

interface FullscreenCreatorProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (data: {
    audio_url: string;
    media_type: 'audio' | 'video' | 'photo' | 'text';
    media_url?: string;
    transcript_fr?: string;
    transcript_ba?: string;
    template_id: string;
    topic: string;
    duration_seconds: number;
    text_content?: string;
  }) => Promise<void>;
}

type CapturedKind = 'audio' | 'video' | 'photo' | 'text';

type CapturedMeta = {
  kind: CapturedKind;
  mimeType?: string;
  url?: string; // object URL (preview)
};

// Duration options (Kuaishou/TikTok-like)
const DURATION_OPTIONS = [
  { label: '15s', type: 'video' as const, value: 15 },
  { label: '30s', type: 'video' as const, value: 30 },
  { label: '60s', type: 'video' as const, value: 60 },
  { label: 'PHOTO', type: 'photo' as const, value: 0 },
  { label: 'AUDIO', type: 'audio' as const, value: 0 },
  { label: 'TEXTE', type: 'text' as const, value: 0 },
];

const BACKGROUNDS: BackgroundTheme[] = ['aurora', 'sunset', 'ocean', 'neon', 'forest', 'mono', 'rose', 'gold'];

async function uploadToPublicUrl(blob: Blob, mimeType: string, folder = 'tamtam_creator') {
  const ext = getFileExtension(mimeType);
  const name = `${folder}/${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`;

  const { data, error } = await supabase.storage.from('tamtam-audio').upload(name, blob, {
    contentType: mimeType,
    upsert: true,
  });
  if (error) throw error;

  const { data: pub } = supabase.storage.from('tamtam-audio').getPublicUrl(data.path);
  return pub.publicUrl;
}

export const FullscreenCreator: React.FC<FullscreenCreatorProps> = ({ isOpen, onClose, onComplete }) => {
  const { currentLang } = useTamTamLanguage();
  const { transcribeWithTranslation } = useUnifiedAudio();
  const { toast } = useToast();

  // Core states
  const [phase, setPhase] = useState<Phase>('template');
  const [creatorMode, setCreatorMode] = useState<CreatorMode>('publication');

  const [captureType, setCaptureType] = useState<'video' | 'audio' | 'photo' | 'text'>('video');
  const [selectedDuration, setSelectedDuration] = useState<number>(15);

  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [remaining, setRemaining] = useState<number>(0);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // UX: background, filters, music, AI
  const [backgroundTheme, setBackgroundTheme] = useState<BackgroundTheme>('aurora');
  const [currentFilter, setCurrentFilter] = useState<VideoFilter | null>(null);

  const [selectedMusic, setSelectedMusic] = useState<MusicTrack | null>(null);
  const [musicVolume, setMusicVolume] = useState(0.7); // 0..1
  const [includeMusicInRecording, setIncludeMusicInRecording] = useState(true);

  const [showFilters, setShowFilters] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [showBackgrounds, setShowBackgrounds] = useState(false);
  const [showMusic, setShowMusic] = useState(false);

  // Live captions / translation
  const [liveCaptions, setLiveCaptions] = useState(true);
  const [previewTranscriptFr, setPreviewTranscriptFr] = useState('');
  const [previewTranscriptBa, setPreviewTranscriptBa] = useState('');

  // Text (caption / text post)
  const [textContent, setTextContent] = useState('');

  // Templates (create mode)
  const [templates, setTemplates] = useState<CreationTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<CreationTemplate | null>(null);
  const [activeStepIndex, setActiveStepIndex] = useState(0);

  // Preview media meta
  const [captured, setCaptured] = useState<CapturedMeta | null>(null);

  // ========= Refs (avoid freezes: do NOT keep big blobs in React state) =========
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewVideoRef = useRef<HTMLVideoElement | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const capturedBlobRef = useRef<Blob | null>(null);

  const stopTimerRef = useRef<number | null>(null);
  const objUrlRef = useRef<string | null>(null);

  // music mix refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const musicElRef = useRef<HTMLAudioElement | null>(null);
  const musicSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const micSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const destRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const musicGainRef = useRef<GainNode | null>(null);

  // live caption recorder
  const captionRecorderRef = useRef<MediaRecorder | null>(null);
  const captionBusyRef = useRef(false);

  const topic = useMemo(() => {
    if (creatorMode === 'create' && selectedTemplate?.label_fr) return selectedTemplate.label_fr;
    if (captureType === 'text') return 'Texte';
    if (captureType === 'photo') return 'Photo';
    if (creatorMode === 'live') return 'Live';
    return 'Publication';
  }, [captureType, creatorMode, selectedTemplate]);

  const templateId = useMemo(() => selectedTemplate?.id || 'free', [selectedTemplate]);

  // ========= Helpers =========
  const clearStopTimer = () => {
    if (stopTimerRef.current) {
      window.clearInterval(stopTimerRef.current);
      stopTimerRef.current = null;
    }
  };

  const stopMixedAudio = () => {
    try {
      musicElRef.current?.pause();
      musicElRef.current = null;
    } catch {}
    try {
      musicSourceRef.current?.disconnect();
      micSourceRef.current?.disconnect();
      musicGainRef.current?.disconnect();
    } catch {}
    musicSourceRef.current = null;
    micSourceRef.current = null;
    musicGainRef.current = null;

    try {
      destRef.current = null;
      audioCtxRef.current?.close();
    } catch {}
    audioCtxRef.current = null;
    destRef.current = null;
  };

  const stopStream = useCallback(() => {
    const s = streamRef.current;
    if (s) {
      s.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch {}
      });
    }
    streamRef.current = null;

    if (videoPreviewRef.current) {
      try {
        (videoPreviewRef.current as any).srcObject = null;
      } catch {}
    }
  }, []);

  const safeStopRecorder = useCallback(() => {
    try {
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        recorderRef.current.stop();
      }
    } catch {
      // ignore
    }
  }, []);

  const cleanupObjectUrl = () => {
    if (objUrlRef.current) {
      URL.revokeObjectURL(objUrlRef.current);
      objUrlRef.current = null;
    }
  };

  const ensureStreamFor = useCallback(
    async (kind: 'video' | 'photo' | 'audio') => {
      // reuse if correct
      const existing = streamRef.current;
      if (existing) {
        const hasVideo = existing.getVideoTracks().length > 0;
        const hasAudio = existing.getAudioTracks().length > 0;

        if (kind === 'audio' && hasAudio && !hasVideo) return existing;
        if ((kind === 'video' || kind === 'photo') && hasVideo) return existing;
      }

      stopStream();

      const constraints: MediaStreamConstraints =
        kind === 'audio'
          ? { audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false }
          : {
              audio: kind === 'video',
              video: {
                facingMode: isFrontCamera ? 'user' : 'environment',
                width: { ideal: 720 },
                height: { ideal: 1280 },
              },
            };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (kind !== 'audio' && videoPreviewRef.current) {
        (videoPreviewRef.current as any).srcObject = stream;
        try {
          await videoPreviewRef.current.play();
        } catch {
          // autoplay block: ignore, user gesture will start
        }
      }

      return stream;
    },
    [isFrontCamera, stopStream]
  );

  const buildMixedRecordStream = useCallback(
    async (base: MediaStream, kind: 'audio' | 'video') => {
      if (!includeMusicInRecording || !selectedMusic) return base;

      // Safari: AudioContext must be created from user gesture
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioCtxRef.current = audioCtx;

      if (audioCtx.state === 'suspended') {
        try {
          await audioCtx.resume();
        } catch {}
      }

      const dest = audioCtx.createMediaStreamDestination();
      destRef.current = dest;

      // mic
      const micTrackStream = new MediaStream(base.getAudioTracks());
      const micSource = audioCtx.createMediaStreamSource(micTrackStream);
      micSourceRef.current = micSource;

      // mic gain
      const micGain = audioCtx.createGain();
      micGain.gain.value = 1;
      micSource.connect(micGain).connect(dest);

      // music element
      const musicEl = new Audio(selectedMusic.url);
      musicEl.crossOrigin = 'anonymous';
      musicEl.loop = true;
      musicEl.volume = 1; // we control via gain
      musicElRef.current = musicEl;

      const musicSource = audioCtx.createMediaElementSource(musicEl);
      musicSourceRef.current = musicSource;

      const musicGain = audioCtx.createGain();
      musicGain.gain.value = Math.max(0, Math.min(1, musicVolume));
      musicGainRef.current = musicGain;

      // route music => dest
      musicSource.connect(musicGain).connect(dest);

      // also monitor in speakers (optional; can cause echo if not headphones)
      try {
        musicGain.connect(audioCtx.destination);
      } catch {}

      try {
        await musicEl.play();
      } catch {
        // if blocked, continue without audible monitor; still may be recorded
      }

      // final stream
      const outTracks: MediaStreamTrack[] = [];
      if (kind === 'video') outTracks.push(...base.getVideoTracks());
      outTracks.push(...dest.stream.getAudioTracks());

      return new MediaStream(outTracks);
    },
    [includeMusicInRecording, selectedMusic, musicVolume]
  );

  const startCaptionRecorder = useCallback(
    async (sourceStream: MediaStream) => {
      if (!liveCaptions) return;
      if (!transcribeWithTranslation) return;

      try {
        // audio-only for captions
        const audioOnly = new MediaStream(sourceStream.getAudioTracks());
        if (!audioOnly.getAudioTracks().length) return;

        const mime = getSupportedMimeType('audio') || 'audio/webm';
        const rec = new MediaRecorder(audioOnly, mime ? { mimeType: mime } : undefined);
        captionRecorderRef.current = rec;

        rec.ondataavailable = async (ev) => {
          if (!ev.data || ev.data.size < 5000) return;
          if (captionBusyRef.current) return;

          captionBusyRef.current = true;
          try {
            const b64 = await blobToBase64(ev.data);
            const res = await transcribeWithTranslation(b64, currentLang === 'ba' ? 'ba' : 'fr');

            // expected: { transcript_fr, transcript_ba }
            const fr = (res as any)?.transcript_fr || (res as any)?.fr || '';
            const ba = (res as any)?.transcript_ba || (res as any)?.ba || '';

            if (fr) setPreviewTranscriptFr((prev) => (prev ? `${prev}\n${fr}` : fr));
            if (ba) setPreviewTranscriptBa((prev) => (prev ? `${prev}\n${ba}` : ba));
          } catch {
            // ignore live chunk errors
          } finally {
            captionBusyRef.current = false;
          }
        };

        rec.start(2500); // chunk every 2.5s
      } catch {
        // ignore
      }
    },
    [currentLang, liveCaptions, transcribeWithTranslation]
  );

  const stopCaptionRecorder = () => {
    try {
      const r = captionRecorderRef.current;
      if (r && r.state !== 'inactive') r.stop();
    } catch {}
    captionRecorderRef.current = null;
    captionBusyRef.current = false;
  };

  // ========= Template loading =========
  useEffect(() => {
    if (!isOpen) return;

    const load = async () => {
      try {
        const { data, error } = await supabase.from('tamtam_creation_templates').select('*').order('category', { ascending: true });
        if (error) throw error;

        const parsed = (data || []).map((t: any) => ({
          ...t,
          steps: Array.isArray(t.steps) ? t.steps : typeof t.steps === 'string' ? JSON.parse(t.steps) : [],
        })) as CreationTemplate[];

        setTemplates(parsed);
      } catch (err: any) {
        console.error('[FullscreenCreator] load templates error', err);
      }
    };

    load();
  }, [isOpen]);

  // ========= Suggested music =========
  useEffect(() => {
    if (!isOpen) return;
    if (selectedMusic) return;

    // basic suggestion from intent-like hint (reuse existing library helper)
    const suggested = getSuggestedMusic?.('default')?.[0];
    if (suggested) setSelectedMusic(suggested);
  }, [isOpen, selectedMusic]);

  // ========= Reset on open/close =========
  const hardReset = useCallback(() => {
    setPhase('template');
    setCreatorMode('publication');
    setCaptureType('video');
    setSelectedDuration(15);
    setIsFrontCamera(true);
    setIsRecording(false);
    setRemaining(0);
    setIsSubmitting(false);

    setBackgroundTheme('aurora');
    setCurrentFilter(null);

    setShowFilters(false);
    setShowAI(false);
    setShowBackgrounds(false);
    setShowMusic(false);

    setPreviewTranscriptFr('');
    setPreviewTranscriptBa('');
    setTextContent('');

    setSelectedTemplate(null);
    setActiveStepIndex(0);

    setCaptured(null);
    capturedBlobRef.current = null;

    clearStopTimer();
    safeStopRecorder();
    stopCaptionRecorder();
    stopMixedAudio();
    stopStream();

    cleanupObjectUrl();
    chunksRef.current = [];
  }, [safeStopRecorder, stopStream]);

  useEffect(() => {
    if (!isOpen) return;

    // When opened
    setPhase(creatorMode === 'create' ? 'template' : 'capture');

    return () => {
      // when closed
      hardReset();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // ========= Actions =========
  const handleClose = () => {
    hardReset();
    onClose();
  };

  const handleDurationSelect = (opt: typeof DURATION_OPTIONS[number]) => {
    if (isRecording) return;

    if (opt.type === 'photo') {
      setCaptureType('photo');
      setSelectedDuration(0);
      return;
    }
    if (opt.type === 'text') {
      setCaptureType('text');
      setSelectedDuration(0);
      return;
    }
    if (opt.type === 'audio') {
      setCaptureType('audio');
      setSelectedDuration(0);
      return;
    }

    setCaptureType('video');
    setSelectedDuration(opt.value);
  };

  const takePhoto = async () => {
    try {
      const stream = await ensureStreamFor('photo');
      if (!videoPreviewRef.current || !canvasRef.current) return;

      const video = videoPreviewRef.current;
      const canvas = canvasRef.current;

      canvas.width = video.videoWidth || 720;
      canvas.height = video.videoHeight || 1280;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      if (isFrontCamera) {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }

      ctx.filter = (getFilterStyle(currentFilter, currentFilter?.intensity ?? 100).filter as string) || 'none';
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(
        (blob) => {
          if (!blob) return;

          capturedBlobRef.current = blob;
          cleanupObjectUrl();
          const url = URL.createObjectURL(blob);
          objUrlRef.current = url;

          setCaptured({ kind: 'photo', mimeType: 'image/jpeg', url });
          setPhase('preview');
          triggerFeedback('success');

          // free camera
          stopStream();
        },
        'image/jpeg',
        0.9
      );
    } catch (err: any) {
      console.error('[FullscreenCreator] takePhoto error:', err);
      toast({ title: 'Erreur photo', description: err?.message || 'Impossible de prendre la photo.', variant: 'destructive' });
    }
  };

  const startRecording = async () => {
    if (isRecording) return;

    if (!canUseMediaRecorder()) {
      toast({ title: 'Navigateur non supporté', description: "Votre navigateur ne supporte pas l'enregistrement.", variant: 'destructive' });
      return;
    }

    try {
      setPreviewTranscriptFr('');
      setPreviewTranscriptBa('');

      const isAudio = captureType === 'audio';
      const kind: 'audio' | 'video' = isAudio ? 'audio' : 'video';

      const baseStream = await ensureStreamFor(isAudio ? 'audio' : 'video');

      // build mixed stream if needed
      const recordStream = await buildMixedRecordStream(baseStream, kind);

      const mimeType = getSupportedMimeType(kind);
      const rec = new MediaRecorder(recordStream, mimeType ? { mimeType } : undefined);

      recorderRef.current = rec;
      chunksRef.current = [];

      rec.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      rec.onstop = () => {
        const actual = rec.mimeType || mimeType || (isAudio ? 'audio/webm' : 'video/webm');
        const blob = new Blob(chunksRef.current, { type: actual });

        capturedBlobRef.current = blob;

        cleanupObjectUrl();
        const url = URL.createObjectURL(blob);
        objUrlRef.current = url;

        setCaptured({ kind: isAudio ? 'audio' : 'video', mimeType: actual, url });
        setPhase('preview');
        setIsRecording(false);
        clearStopTimer();

        // stop extras
        stopCaptionRecorder();
        stopMixedAudio();
        stopStream();

        triggerFeedback('success');
      };

      // start recording
      setIsRecording(true);
      chunksRef.current = [];
      rec.start(1000);

      // live captions
      await startCaptionRecorder(recordStream);

      // timed (publication/create), unlimited (live)
      if (creatorMode !== 'live' && !isAudio && selectedDuration > 0) {
        setRemaining(selectedDuration);
        const startAt = Date.now();
        stopTimerRef.current = window.setInterval(() => {
          const elapsed = Math.floor((Date.now() - startAt) / 1000);
          const left = Math.max(0, selectedDuration - elapsed);
          setRemaining(left);
          if (left <= 0) safeStopRecorder();
        }, 250);
      } else {
        setRemaining(0);
      }
    } catch (err: any) {
      console.error('[FullscreenCreator] startRecording error:', err);
      setIsRecording(false);
      clearStopTimer();
      stopCaptionRecorder();
      stopMixedAudio();
      stopStream();

      toast({ title: 'Erreur enregistrement', description: err?.message || "Impossible de démarrer l'enregistrement.", variant: 'destructive' });
    }
  };

  const stopRecording = () => {
    safeStopRecorder();
  };

  const handleTextSubmit = () => {
    if (!textContent.trim()) return;
    setCaptured({ kind: 'text' });
    setPhase('preview');
    triggerFeedback('success');
  };

  const toggleCamera = async () => {
    if (isRecording) return;
    setIsFrontCamera((v) => !v);
    try {
      // refresh stream if in video/photo capture
      if (captureType !== 'audio' && captureType !== 'text') {
        stopStream();
        await ensureStreamFor('video');
      }
    } catch {}
  };

  const handleSelectTemplate = (t: CreationTemplate) => {
    setSelectedTemplate(t);
    setActiveStepIndex(0);

    const step = t.steps?.[0];
    if (step) {
      setCaptureType(step.type);
      setSelectedDuration(step.duration);
    } else {
      setCaptureType('video');
      setSelectedDuration(15);
    }

    setPhase('capture');
  };

  const handleSkipTemplate = () => {
    setSelectedTemplate(null);
    setPhase('capture');
  };

  const ensureAudioUrlForNonAudioPosts = async (): Promise<string> => {
    // If user captured audio/video, we already have it.
    if (captured?.kind === 'audio' && capturedBlobRef.current) {
      return uploadToPublicUrl(capturedBlobRef.current, captured.mimeType || 'audio/webm', 'tamtam_audio');
    }

    // If video captured, you may still want audio_url to exist (schema). Create silent wav.
    const silent = createSilentWavBlob();
    return uploadToPublicUrl(silent, 'audio/wav', 'tamtam_audio');
  };

  const handleSubmit = async () => {
    if (!captured) return;

    setIsSubmitting(true);
    try {
      let media_url: string | undefined;
      let audio_url: string;

      let transcript_fr = previewTranscriptFr || '';
      let transcript_ba = previewTranscriptBa || '';

      // Upload + transcription
      if (captured.kind === 'video' || captured.kind === 'audio' || captured.kind === 'photo') {
        const blob = capturedBlobRef.current;
        if (!blob) throw new Error('Média introuvable (blob vide).');

        const mime = captured.mimeType || (captured.kind === 'photo' ? 'image/jpeg' : captured.kind === 'audio' ? 'audio/webm' : 'video/webm');

        // upload media
        media_url = await uploadToPublicUrl(blob, mime, 'tamtam_media');

        // transcription for audio/video only (photo => none)
        if ((captured.kind === 'audio' || captured.kind === 'video') && transcribeWithTranslation) {
          try {
            const b64 = await blobToBase64(blob);
            const res = await transcribeWithTranslation(b64, currentLang === 'ba' ? 'ba' : 'fr');
            transcript_fr = (res as any)?.transcript_fr || transcript_fr;
            transcript_ba = (res as any)?.transcript_ba || transcript_ba;
          } catch {
            // ignore transcription failure
          }
        }
      }

      // audio_url guaranteed
      if (captured.kind === 'audio' && capturedBlobRef.current) {
        audio_url = await uploadToPublicUrl(capturedBlobRef.current, captured.mimeType || 'audio/webm', 'tamtam_audio');
      } else {
        audio_url = await ensureAudioUrlForNonAudioPosts();
      }

      const duration_seconds =
        creatorMode === 'live'
          ? 0
          : captureType === 'video'
          ? selectedDuration
          : captureType === 'audio'
          ? 0
          : 0;

      await onComplete({
        audio_url,
        media_type: captured.kind === 'text' ? 'text' : (captured.kind as any),
        media_url: captured.kind === 'photo' || captured.kind === 'video' ? media_url : undefined,
        transcript_fr: transcript_fr || undefined,
        transcript_ba: transcript_ba || undefined,
        template_id: templateId,
        topic,
        duration_seconds,
        text_content: captured.kind === 'text' ? textContent : textContent?.trim() || undefined,
      });

      triggerFeedback('success');
      handleClose();
    } catch (err: any) {
      console.error('[FullscreenCreator] submit error:', err);
      toast({ title: 'Erreur', description: err?.message || 'Impossible de publier.', variant: 'destructive' });
      triggerFeedback('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const previewUrl = captured?.url || '';

  const isCaptureCameraVisible = phase === 'capture' && (captureType === 'video' || captureType === 'photo');

  // ========= Render =========
  if (!isOpen) return null;

  const step = selectedTemplate?.steps?.[activeStepIndex];

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 bg-black"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Background */}
        <AnimatedBackground theme={backgroundTheme} />

        {/* Main content */}
        <div className="absolute inset-0">
          {/* Camera preview (capture) */}
          {isCaptureCameraVisible && (
            <video
              ref={videoPreviewRef}
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
              style={{
                ...(getFilterStyle(currentFilter, currentFilter?.intensity ?? 100) as any),
                transform: isFrontCamera ? 'scaleX(-1)' : undefined,
              }}
            />
          )}

          {/* Preview (preview phase) */}
          {phase === 'preview' && captured?.kind === 'video' && (
            <video
              ref={previewVideoRef}
              src={previewUrl}
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
              style={getFilterStyle(currentFilter, currentFilter?.intensity ?? 100)}
            />
          )}

          {phase === 'preview' && captured?.kind === 'audio' && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-52 h-52 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
                <div className="w-36 h-36 rounded-full bg-white/15 flex items-center justify-center">
                  <Mic className="w-16 h-16 text-white" />
                </div>
              </div>
              <audio ref={previewAudioRef} src={previewUrl} />
            </div>
          )}

          {phase === 'preview' && captured?.kind === 'photo' && (
            <img
              src={previewUrl}
              alt="Captured"
              className="absolute inset-0 w-full h-full object-cover"
              style={getFilterStyle(currentFilter, currentFilter?.intensity ?? 100)}
            />
          )}

          {phase === 'preview' && captured?.kind === 'text' && (
            <div className="absolute inset-0 flex items-center justify-center px-6">
              <div className="w-full max-w-xl rounded-3xl bg-white/90 backdrop-blur-sm p-6">
                <p className="text-gray-900 text-xl whitespace-pre-wrap leading-relaxed">{textContent}</p>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="absolute top-0 left-0 right-0 z-20 safe-area-top">
            <div className="flex items-center justify-between p-4">
              <button onClick={handleClose} className="w-10 h-10 rounded-full bg-black/35 backdrop-blur-sm flex items-center justify-center">
                <X className="w-6 h-6 text-white" />
              </button>

              <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-black/35 backdrop-blur-sm">
                <span className="text-white text-xs font-semibold">
                  {creatorMode === 'live' ? 'LIVE' : creatorMode === 'create' ? 'CRÉER' : 'PUBLICATION'} — {topic}
                </span>
                {isRecording && creatorMode === 'live' && (
                  <span className="ml-1 inline-flex items-center gap-1 text-[10px] text-white/90">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    ON
                  </span>
                )}
              </div>

              <button
                onClick={() => setShowAI(true)}
                className="w-10 h-10 rounded-full bg-black/35 backdrop-blur-sm flex items-center justify-center"
                title="IA"
              >
                <Sparkles className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>

          {/* Instruction (create mode) */}
          {creatorMode === 'create' && phase === 'capture' && step && (
            <div className="absolute top-20 left-0 right-0 z-20 px-4">
              <div className="mx-auto max-w-xl rounded-2xl bg-black/45 backdrop-blur-sm p-3">
                <p className="text-white text-sm leading-relaxed">
                  {currentLang === 'ba' ? step.instruction_ba || step.instruction_fr : step.instruction_fr}
                </p>
              </div>
            </div>
          )}

          {/* Live captions overlay */}
          {(previewTranscriptFr || previewTranscriptBa) && (
            <div className="absolute bottom-36 left-0 right-0 z-20 px-4">
              <div className="mx-auto max-w-xl rounded-2xl bg-black/45 backdrop-blur-sm p-3">
                <p className="text-white text-sm leading-relaxed whitespace-pre-wrap">
                  {(currentLang === 'ba' ? previewTranscriptBa : previewTranscriptFr) || previewTranscriptFr || previewTranscriptBa}
                </p>
              </div>
            </div>
          )}

          {/* Capture tools */}
          {phase === 'capture' && (
            <>
              {/* Top right tools */}
              <div className="absolute top-20 right-4 z-20 flex flex-col gap-3">
                {captureType !== 'text' && (
                  <button
                    onClick={() => setShowFilters(true)}
                    className="w-11 h-11 rounded-full bg-black/35 backdrop-blur-sm flex items-center justify-center"
                    title="Filtres"
                  >
                    <Filter className="w-5 h-5 text-white" />
                  </button>
                )}

                <button
                  onClick={() => setShowBackgrounds(true)}
                  className="w-11 h-11 rounded-full bg-black/35 backdrop-blur-sm flex items-center justify-center"
                  title="Fonds"
                >
                  <Palette className="w-5 h-5 text-white" />
                </button>

                <button
                  onClick={() => setShowMusic(true)}
                  className="w-11 h-11 rounded-full bg-black/35 backdrop-blur-sm flex items-center justify-center"
                  title="Musique"
                >
                  <Music className="w-5 h-5 text-white" />
                </button>

                {(captureType === 'video' || captureType === 'photo') && (
                  <button
                    onClick={toggleCamera}
                    className="w-11 h-11 rounded-full bg-black/35 backdrop-blur-sm flex items-center justify-center"
                    title="Caméra"
                  >
                    <RotateCcw className="w-5 h-5 text-white" />
                  </button>
                )}
              </div>

              {/* Text editor */}
              {captureType === 'text' && (
                <div className="absolute inset-x-0 top-24 z-20 px-4">
                  <div className="mx-auto max-w-xl rounded-3xl bg-white/90 backdrop-blur-sm p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 text-gray-900 font-semibold">
                        <Type className="w-4 h-4" />
                        Texte
                      </div>
                      <label className="text-xs text-gray-600 flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={liveCaptions}
                          onChange={(e) => setLiveCaptions(e.target.checked)}
                        />
                        Sous-titres live
                      </label>
                    </div>
                    <Textarea
                      value={textContent}
                      onChange={(e) => setTextContent(e.target.value)}
                      placeholder={currentLang === 'ba' ? 'Kọ nkan...' : 'Écris ton message...'}
                      className="min-h-[120px]"
                    />
                  </div>
                </div>
              )}

              {/* Duration selector */}
              <div className="absolute bottom-36 left-0 right-0 z-20">
                <div className="flex items-center justify-center gap-3 px-4 overflow-x-auto scrollbar-hide">
                  {DURATION_OPTIONS.map((opt) => (
                    <button
                      key={opt.label}
                      onClick={() => handleDurationSelect(opt)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        opt.type === captureType && (opt.type !== 'video' || opt.value === selectedDuration)
                          ? 'bg-white text-gray-900 shadow-lg'
                          : 'text-white/80 hover:text-white'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Capture button */}
              <div className="absolute bottom-16 left-0 right-0 z-20 flex justify-center">
                {captureType === 'text' ? (
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={handleTextSubmit}
                    disabled={!textContent.trim()}
                    className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-xl disabled:opacity-50"
                  >
                    <Send className="w-8 h-8 text-blue-500" />
                  </motion.button>
                ) : captureType === 'photo' ? (
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={takePhoto}
                    className="w-20 h-20 rounded-full bg-white border-4 border-white/50 flex items-center justify-center shadow-xl"
                  >
                    <div className="w-16 h-16 rounded-full bg-white" />
                  </motion.button>
                ) : !isRecording ? (
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={startRecording}
                    className={`w-20 h-20 rounded-full flex items-center justify-center shadow-xl ${
                      creatorMode === 'live' ? 'bg-red-600' : 'bg-red-500'
                    }`}
                  >
                    {captureType === 'audio' ? <Mic className="w-9 h-9 text-white" /> : <Video className="w-9 h-9 text-white" />}
                  </motion.button>
                ) : (
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={stopRecording}
                    className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-xl"
                  >
                    <div className="w-7 h-7 rounded-md bg-red-500" />
                  </motion.button>
                )}
              </div>

              {/* Recording timer */}
              {isRecording && creatorMode !== 'live' && captureType === 'video' && selectedDuration > 0 && (
                <div className="absolute bottom-28 left-0 right-0 z-20 flex justify-center">
                  <div className="px-3 py-1.5 rounded-full bg-black/45 backdrop-blur-sm text-white text-xs font-semibold">
                    {remaining > 0 ? `${remaining}s` : '…'}
                  </div>
                </div>
              )}

              {/* Bottom mode toggle */}
              <div className="absolute bottom-2 left-0 right-0 z-20 safe-area-bottom">
                <div className="flex justify-center gap-2 px-4 pb-4">
                  {(['live', 'publication', 'create'] as CreatorMode[]).map((m) => {
                    const active = creatorMode === m;
                    return (
                      <button
                        key={m}
                        onClick={() => {
                          if (isRecording) return;
                          setCreatorMode(m);
                          setPhase(m === 'create' ? 'template' : 'capture');
                        }}
                        className={`px-4 py-2 rounded-full text-xs font-semibold backdrop-blur-sm transition-colors ${
                          active ? 'bg-white text-gray-900' : 'bg-black/30 text-white'
                        }`}
                      >
                        {m === 'live' ? 'LIVE' : m === 'publication' ? 'PUBLICATION' : 'CRÉER'}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* Preview controls */}
          {phase === 'preview' && (
            <div className="absolute inset-x-0 bottom-0 z-20 safe-area-bottom">
              <div className="p-4">
                <div className="mx-auto max-w-xl rounded-3xl bg-black/35 backdrop-blur-sm p-4 space-y-3">
                  {/* Caption box */}
                  <Textarea
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    placeholder={currentLang === 'ba' ? 'Kọ akọle...' : 'Ajoute une légende...'}
                    className="bg-white/90"
                  />

                  {/* Quick toggles */}
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-white/80 text-xs flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={liveCaptions}
                        onChange={(e) => setLiveCaptions(e.target.checked)}
                      />
                      Sous-titres live
                    </label>

                    <label className="text-white/80 text-xs flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={includeMusicInRecording}
                        onChange={(e) => setIncludeMusicInRecording(e.target.checked)}
                      />
                      Mixer musique
                    </label>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between gap-2">
                    <button
                      onClick={() => {
                        // retake
                        setPhase(creatorMode === 'create' ? 'capture' : 'capture');
                        setCaptured(null);
                        capturedBlobRef.current = null;
                        cleanupObjectUrl();
                        setPreviewTranscriptFr('');
                        setPreviewTranscriptBa('');
                      }}
                      disabled={isSubmitting}
                      className="flex-1 h-12 rounded-2xl bg-white/10 text-white font-semibold flex items-center justify-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Refaire
                    </button>

                    <button
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                      className="flex-1 h-12 rounded-2xl bg-primary text-white font-semibold flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                      Publier
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Template selection (create mode) */}
          {phase === 'template' && (
            <div className="absolute inset-0 z-20 flex flex-col">
              <div className="p-4 flex items-center justify-between">
                <button onClick={handleClose} className="w-10 h-10 rounded-full bg-black/35 backdrop-blur-sm flex items-center justify-center">
                  <ArrowLeft className="w-6 h-6 text-white" />
                </button>

                <div className="text-white font-semibold">Choisir un template</div>

                <button
                  onClick={handleSkipTemplate}
                  className="px-3 py-2 rounded-full bg-black/35 backdrop-blur-sm text-white text-xs font-semibold"
                >
                  Ignorer
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-4 pb-6">
                <div className="grid grid-cols-2 gap-3">
                  {templates.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => handleSelectTemplate(t)}
                      className="rounded-3xl bg-white/10 border border-white/10 p-4 text-left hover:border-white/25 transition"
                    >
                      <div className="text-2xl">{t.icon || '✨'}</div>
                      <div className="mt-2 text-white font-semibold">
                        {currentLang === 'ba' ? t.label_ba || t.label_fr : t.label_fr}
                      </div>
                      <div className="mt-1 text-white/60 text-xs">{t.category}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Panels */}
          <VideoFiltersPanel
            isOpen={showFilters}
            onClose={() => setShowFilters(false)}
            currentFilter={currentFilter}
            onSelectFilter={(f) => setCurrentFilter(f)}
            videoElement={videoPreviewRef.current}
          />

          {/* Background picker */}
          <AnimatePresence>
            {showBackgrounds && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/60"
                onClick={() => setShowBackgrounds(false)}
              >
                <motion.div
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                  onClick={(e) => e.stopPropagation()}
                  className="absolute bottom-0 left-0 right-0 ios-glass-dark rounded-t-3xl max-h-[70vh] overflow-hidden p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-white font-semibold">Fonds animés</div>
                    <button
                      onClick={() => setShowBackgrounds(false)}
                      className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                  </div>

                  <div className="grid grid-cols-4 gap-3">
                    {BACKGROUNDS.map((b) => (
                      <button
                        key={b}
                        onClick={() => {
                          setBackgroundTheme(b);
                          setShowBackgrounds(false);
                        }}
                        className={`rounded-2xl p-3 bg-white/10 border text-white text-xs font-semibold ${
                          backgroundTheme === b ? 'border-primary' : 'border-white/10'
                        }`}
                      >
                        {String(b)}
                      </button>
                    ))}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Music picker (simple) */}
          <AnimatePresence>
            {showMusic && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/60"
                onClick={() => setShowMusic(false)}
              >
                <motion.div
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                  onClick={(e) => e.stopPropagation()}
                  className="absolute bottom-0 left-0 right-0 ios-glass-dark rounded-t-3xl max-h-[75vh] overflow-hidden p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-white font-semibold">Musique</div>
                    <button
                      onClick={() => setShowMusic(false)}
                      className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                  </div>

                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-white/80 text-xs w-24">Volume</span>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={musicVolume}
                      onChange={(e) => setMusicVolume(Number(e.target.value))}
                      className="flex-1 accent-primary"
                    />
                    <span className="text-white/80 text-xs w-12">{Math.round(musicVolume * 100)}%</span>
                  </div>

                  <div className="grid grid-cols-1 gap-2 max-h-[55vh] overflow-y-auto">
                    {MUSIC_LIBRARY.slice(0, 30).map((m: MusicTrack) => (
                      <button
                        key={m.id}
                        onClick={() => {
                          setSelectedMusic(m);
                          setShowMusic(false);
                        }}
                        className={`rounded-2xl p-3 bg-white/10 border text-left ${
                          selectedMusic?.id === m.id ? 'border-primary' : 'border-white/10'
                        }`}
                      >
                        <div className="text-white font-semibold text-sm">{m.title}</div>
                        <div className="text-white/60 text-xs">{m.artist || ''}</div>
                      </button>
                    ))}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* AI overlay */}
          <AnimatePresence>
            {showAI && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/70"
              >
                <motion.div
                  initial={{ y: 40, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 40, opacity: 0 }}
                  transition={{ type: 'spring', damping: 22, stiffness: 250 }}
                  className="absolute inset-x-0 bottom-0 ios-glass-dark rounded-t-3xl max-h-[85vh] overflow-y-auto"
                >
                  <div className="p-4">
                    <DynamicAITemplates
                      topic={topic}
                      templateKey={selectedTemplate?.template_key}
                      intent={'other' as CreatorIntent}
                      segment={(creatorMode === 'live' ? 'message' : 'message') as CreatorSegment}
                      onSelectContent={(type, content) => {
                        // Kuaishou-like: auto-insert into caption/text
                        if (!content) return;
                        setTextContent((prev) => (prev ? `${prev}\n\n${content}` : content));
                      }}
                      isSheet
                      onClose={() => setShowAI(false)}
                    />
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Hidden canvas for photo capture */}
          <canvas ref={canvasRef} className="hidden" />
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default FullscreenCreator;
