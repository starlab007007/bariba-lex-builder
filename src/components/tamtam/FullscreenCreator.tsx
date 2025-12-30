import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  X,
  Music2,
  RefreshCw,
  Timer,
  Sparkles,
  Zap,
  Image as ImageIcon,
  Video as VideoIcon,
  Type,
  Flashlight,
  FlashlightOff,
  Check,
  Loader2,
  Upload,
  Maximize2,
  Minimize2,
} from 'lucide-react';

import { supabase } from '@/integrations/supabase/client';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';
import { triggerFeedback } from '@/utils/tamtamFeedback';
import { useToast } from '@/hooks/use-toast';

import DynamicAITemplates from './DynamicAITemplates';
import VideoFiltersPanel, { VideoFilter, VIDEO_FILTERS } from './VideoFilters';

type CaptureMode = 'video' | 'photo' | 'text' | 'live' | 'audio';
type Stage = 'capture' | 'preview' | 'publishing';

type FitMode = 'full' | 'fill';

type MusicTrack = {
  id: string;
  title: string;
  artist?: string;
  cover?: string;
  previewUrl?: string;
};

type PublishResult = { postId: string };

interface FullscreenCreatorProps {
  isOpen: boolean;
  onClose: () => void;
  onPublished?: (postId: string) => void;
}

/**
 * ✅ IMPORTANT
 * Mets tes vrais noms ici si ton backend diffère.
 */
const POSTS_TABLE = 'tamtam_posts';
const STORAGE_BUCKET = 'tamtam-media';

function extractHashtags(text: string): string[] {
  const tags = new Set<string>();
  const matches = text.match(/#[\p{L}\p{N}_]+/gu) ?? [];
  for (const m of matches) tags.add(m.trim());
  return Array.from(tags);
}

function safeFilenameExt(mime: string, fallbackExt: string): string {
  const map: Record<string, string> = {
    'video/webm': 'webm',
    'video/mp4': 'mp4',
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'audio/webm': 'webm',
    'audio/mpeg': 'mp3',
    'audio/mp4': 'm4a',
  };
  return map[mime] ?? fallbackExt;
}

async function ensureZoom1(stream: MediaStream): Promise<void> {
  const track = stream.getVideoTracks()[0];
  if (!track) return;

  // Certains navigateurs ne typent pas zoom. On fait safe + try/catch.
  try {
    const caps = (track.getCapabilities?.() ?? {}) as unknown as { zoom?: unknown };
    if (!caps.zoom) return;

    const adv = [{ zoom: 1 } as unknown as MediaTrackConstraintSet];
    await track.applyConstraints({ advanced: adv } as MediaTrackConstraints);
  } catch {
    // ignore
  }
}

async function uploadToStorage(params: {
  blob: Blob;
  userId: string;
  type: 'video' | 'photo' | 'audio';
  onProgress?: (p: number) => void;
}): Promise<{ path: string; publicUrl: string }> {
  const { blob, userId, type, onProgress } = params;

  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');

  const mime = blob.type || (type === 'photo' ? 'image/jpeg' : type === 'audio' ? 'audio/webm' : 'video/webm');
  const ext = safeFilenameExt(mime, type === 'photo' ? 'jpg' : type === 'audio' ? 'webm' : 'webm');

  const fileName = `${crypto.randomUUID()}.${ext}`;
  const path = `${userId}/${yyyy}-${mm}-${dd}/${type}/${fileName}`;

  onProgress?.(10);

  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, blob, {
    contentType: mime,
    upsert: false,
    cacheControl: '3600',
  });

  if (error) throw error;

  onProgress?.(70);

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  const publicUrl = data.publicUrl;

  onProgress?.(85);

  return { path, publicUrl };
}

async function createPost(params: {
  userId: string;
  type: 'video' | 'photo' | 'audio' | 'text' | 'live';
  caption: string;
  hashtags: string[];
  music: MusicTrack | null;
  filter: VideoFilter | null;
  mediaPath?: string | null;
  mediaUrl?: string | null;
  durationSec?: number | null;
  onProgress?: (p: number) => void;
}): Promise<PublishResult> {
  const {
    userId,
    type,
    caption,
    hashtags,
    music,
    filter,
    mediaPath,
    mediaUrl,
    durationSec,
    onProgress,
  } = params;

  onProgress?.(90);

  const payload = {
    user_id: userId,
    audio_url: mediaUrl ?? '', // Required field
    transcript_fr: caption,
    transcript_ba: null,
    media_type: type,
    media_url: mediaUrl ?? null,
    hashtags,
    duration_seconds: durationSec ?? null,
    is_public: true,
  };

  const { data, error } = await supabase
    .from(POSTS_TABLE)
    .insert(payload)
    .select('id')
    .single();

  if (error) throw error;

  onProgress?.(100);

  return { postId: String((data as { id: string }).id) };
}

export default function FullscreenCreator({ isOpen, onClose, onPublished }: FullscreenCreatorProps) {
  const { toast } = useToast();
  const { currentLang } = useTamTamLanguage();

  // UI state
  const [mode, setMode] = useState<CaptureMode>('video');
  const [stage, setStage] = useState<Stage>('capture');
  const [fitMode, setFitMode] = useState<FitMode>('full'); // ✅ Full par défaut → évite l’effet “zoom”
  const [flashOn, setFlashOn] = useState(false);
  const [timerSec, setTimerSec] = useState<0 | 3 | 10>(0);
  const [showFilters, setShowFilters] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);

  const [selectedMusic, setSelectedMusic] = useState<MusicTrack | null>(null);
  const musicPresets: MusicTrack[] = useMemo(
    () => [
      { id: 'hot_1', title: 'Hot Beat', artist: 'TamTam' },
      { id: 'village_1', title: 'Village Vibes', artist: 'TamTam' },
      { id: 'edu_1', title: 'Learning Loop', artist: 'TamTam' },
    ],
    []
  );

  // Camera/recording state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordMs, setRecordMs] = useState(0);
  const tickRef = useRef<number | null>(null);

  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  // captured media
  const [mediaBlob, setMediaBlob] = useState<Blob | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string>('');
  const [mediaType, setMediaType] = useState<'video' | 'photo' | 'audio' | 'text' | 'live'>('video');
  const [durationSec, setDurationSec] = useState<number | null>(null);

  const [currentFilter, setCurrentFilter] = useState<VideoFilter | null>(VIDEO_FILTERS[0]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const resetAll = useCallback(() => {
    setStage('capture');
    setCaption('');
    setHashtags([]);
    setProgress(0);
    setMediaBlob(null);
    if (mediaUrl) URL.revokeObjectURL(mediaUrl);
    setMediaUrl('');
    setMediaType('video');
    setDurationSec(null);
    setIsRecording(false);
    setRecordMs(0);
    chunksRef.current = [];
  }, [mediaUrl]);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      for (const t of streamRef.current.getTracks()) t.stop();
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startStream = useCallback(async () => {
    stopStream();

    const wantsVideo = mode !== 'audio' && mode !== 'text';
    const wantsAudio = mode !== 'photo' && mode !== 'text';

    const constraints: MediaStreamConstraints = {
      video: wantsVideo
        ? {
            facingMode,
            width: { ideal: 1080 },
            height: { ideal: 1920 },
            aspectRatio: { ideal: 9 / 16 },
          }
        : false,
      audio: wantsAudio ? { echoCancellation: true, noiseSuppression: true } : false,
    };

    const s = await navigator.mediaDevices.getUserMedia(constraints);
    streamRef.current = s;

    // ✅ tente d’annuler le zoom matériel si supporté
    if (wantsVideo) await ensureZoom1(s);

    if (videoRef.current && wantsVideo) {
      videoRef.current.srcObject = s;
      await videoRef.current.play().catch(() => undefined);
    }
  }, [facingMode, mode, stopStream]);

  useEffect(() => {
    if (!isOpen) return;
    setStage('capture');
    setMode('video');
    setFitMode('full');
    setFacingMode('user');
    setFlashOn(false);
    setTimerSec(0);
    setCurrentFilter(VIDEO_FILTERS[0]);
    setSelectedMusic(null);
    setShowFilters(false);
    setShowTemplates(false);
    setCaption('');
    setHashtags([]);
    setProgress(0);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    // stream only for capture modes that need it
    if (stage === 'capture' && (mode === 'video' || mode === 'photo' || mode === 'audio' || mode === 'live')) {
      startStream().catch((e: unknown) => {
        toast({
          title: 'Camera error',
          description: e instanceof Error ? e.message : 'Unable to access camera/mic',
          variant: 'destructive',
        });
      });
    }

    return () => {
      // keep stream while modal open, but stop when close
      if (!isOpen) stopStream();
    };
  }, [isOpen, mode, stage, startStream, stopStream, toast]);

  useEffect(() => {
    // cleanup tick
    return () => {
      if (tickRef.current != null) cancelAnimationFrame(tickRef.current);
      tickRef.current = null;
    };
  }, []);

  const startTick = useCallback(() => {
    const start = performance.now();
    const loop = () => {
      const ms = performance.now() - start;
      setRecordMs(ms);
      tickRef.current = requestAnimationFrame(loop);
    };
    loop();
  }, []);

  const stopTick = useCallback(() => {
    if (tickRef.current != null) cancelAnimationFrame(tickRef.current);
    tickRef.current = null;
  }, []);

  const toggleFlash = useCallback(async () => {
    const s = streamRef.current;
    if (!s) return;
    const track = s.getVideoTracks()[0];
    if (!track) return;

    try {
      const caps = (track.getCapabilities?.() ?? {}) as unknown as { torch?: boolean };
      if (!caps.torch) {
        toast({ title: 'Flash', description: 'Torch not supported on this device', variant: 'default' });
        return;
      }
      const next = !flashOn;
      await track.applyConstraints({ advanced: [{ torch: next } as unknown as MediaTrackConstraintSet] } as MediaTrackConstraints);
      setFlashOn(next);
      triggerFeedback('notification');
    } catch {
      toast({ title: 'Flash', description: 'Unable to toggle flash', variant: 'destructive' });
    }
  }, [flashOn, toast]);

  const switchCamera = useCallback(async () => {
    triggerFeedback('notification');
    setFacingMode((p) => (p === 'user' ? 'environment' : 'user'));
  }, []);

  useEffect(() => {
    // when facing changes, restart stream if capturing
    if (!isOpen) return;
    if (stage !== 'capture') return;
    if (mode === 'text') return;
    startStream().catch(() => undefined);
  }, [facingMode, isOpen, mode, stage, startStream]);

  const runTimerThen = useCallback(
    async (fn: () => Promise<void> | void) => {
      if (timerSec === 0) {
        await fn();
        return;
      }
      triggerFeedback('notification');

      const startedAt = Date.now();
      toast({ title: 'Timer', description: `${timerSec}s...`, variant: 'default' });

      await new Promise<void>((resolve) => {
        const iv = window.setInterval(() => {
          const elapsed = Math.floor((Date.now() - startedAt) / 1000);
          const left = timerSec - elapsed;
          if (left <= 0) {
            window.clearInterval(iv);
            resolve();
          }
        }, 250);
      });

      await fn();
    },
    [timerSec, toast]
  );

  const startRecording = useCallback(async () => {
    const s = streamRef.current;
    if (!s) return;

    chunksRef.current = [];
    setIsRecording(true);
    setRecordMs(0);
    startTick();

    const mimeCandidates = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'];
    const chosen = mimeCandidates.find((m) => MediaRecorder.isTypeSupported(m)) ?? '';

    const rec = new MediaRecorder(s, chosen ? { mimeType: chosen } : undefined);
    recorderRef.current = rec;

    rec.ondataavailable = (evt: BlobEvent) => {
      if (evt.data && evt.data.size > 0) chunksRef.current.push(evt.data);
    };

    rec.onstop = () => {
      stopTick();
      setIsRecording(false);

      const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'video/webm' });
      setMediaBlob(blob);
      const url = URL.createObjectURL(blob);
      setMediaUrl(url);
      setMediaType('video');
      setDurationSec(Math.max(1, Math.round(recordMs / 1000)));

      setStage('preview');
      triggerFeedback('notification');
    };

    rec.start(250);
  }, [recordMs, startTick, stopTick]);

  const stopRecording = useCallback(() => {
    const r = recorderRef.current;
    if (!r) return;
    try {
      r.stop();
    } catch {
      // ignore
    }
  }, []);

  const takePhoto = useCallback(async () => {
    const v = videoRef.current;
    if (!v) return;

    const canvas = document.createElement('canvas');
    const w = v.videoWidth || 1080;
    const h = v.videoHeight || 1920;
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // apply filter preview into capture
    if (currentFilter?.id && currentFilter.id !== 'none') {
      ctx.filter = currentFilter.cssFilter;
    }

    ctx.drawImage(v, 0, 0, w, h);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
    if (!blob) return;

    setMediaBlob(blob);
    const url = URL.createObjectURL(blob);
    setMediaUrl(url);
    setMediaType('photo');
    setDurationSec(null);
    setStage('preview');
    triggerFeedback('notification');
  }, [currentFilter]);

  const startAudio = useCallback(async () => {
    const s = streamRef.current;
    if (!s) return;

    chunksRef.current = [];
    setIsRecording(true);
    setRecordMs(0);
    startTick();

    const mimeCandidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mpeg', 'audio/mp4'];
    const chosen = mimeCandidates.find((m) => MediaRecorder.isTypeSupported(m)) ?? '';

    const rec = new MediaRecorder(s, chosen ? { mimeType: chosen } : undefined);
    recorderRef.current = rec;

    rec.ondataavailable = (evt: BlobEvent) => {
      if (evt.data && evt.data.size > 0) chunksRef.current.push(evt.data);
    };

    rec.onstop = () => {
      stopTick();
      setIsRecording(false);

      const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' });
      setMediaBlob(blob);
      const url = URL.createObjectURL(blob);
      setMediaUrl(url);
      setMediaType('audio');
      setDurationSec(Math.max(1, Math.round(recordMs / 1000)));

      setStage('preview');
      triggerFeedback('notification');
    };

    rec.start(250);
  }, [recordMs, startTick, stopTick]);

  const onSelectFromAlbums = useCallback(async (file: File) => {
    triggerFeedback('notification');

    const url = URL.createObjectURL(file);
    setMediaUrl(url);
    setMediaBlob(file);
    setDurationSec(null);

    if (file.type.startsWith('video/')) setMediaType('video');
    else if (file.type.startsWith('image/')) setMediaType('photo');
    else if (file.type.startsWith('audio/')) setMediaType('audio');
    else setMediaType('text');

    setStage('preview');
  }, []);

  const publish = useCallback(async () => {
    if (stage === 'publishing') return;

    const { data: sess } = await supabase.auth.getSession();
    const userId = sess.session?.user?.id;
    if (!userId) {
      toast({ title: 'Connexion requise', description: 'Connecte-toi pour publier.', variant: 'destructive' });
      return;
    }

    // text post
    if (mediaType === 'text') {
      setStage('publishing');
      setProgress(20);

      try {
        const mergedTags = Array.from(new Set([...hashtags, ...extractHashtags(caption)]));
        const res = await createPost({
          userId,
          type: 'text',
          caption,
          hashtags: mergedTags,
          music: selectedMusic,
          filter: currentFilter,
          mediaPath: null,
          mediaUrl: null,
          durationSec: null,
          onProgress: setProgress,
        });

        toast({ title: 'Publié', description: 'Ton texte est en ligne ✅' });
        onPublished?.(res.postId);
        resetAll();
        onClose();
      } catch (e: unknown) {
        toast({
          title: 'Publication échouée',
          description: e instanceof Error ? e.message : 'Erreur inconnue',
          variant: 'destructive',
        });
        setStage('preview');
      } finally {
        setProgress(0);
      }

      return;
    }

    // live placeholder (tu peux brancher ton mode LIVE réel ensuite)
    if (mediaType === 'live') {
      setStage('publishing');
      setProgress(30);
      try {
        const mergedTags = Array.from(new Set([...hashtags, ...extractHashtags(caption)]));
        const res = await createPost({
          userId,
          type: 'live',
          caption,
          hashtags: mergedTags,
          music: selectedMusic,
          filter: currentFilter,
          mediaPath: null,
          mediaUrl: null,
          durationSec: null,
          onProgress: setProgress,
        });
        toast({ title: 'LIVE prêt', description: 'Session créée ✅' });
        onPublished?.(res.postId);
        resetAll();
        onClose();
      } catch (e: unknown) {
        toast({
          title: 'LIVE échoué',
          description: e instanceof Error ? e.message : 'Erreur inconnue',
          variant: 'destructive',
        });
        setStage('preview');
      } finally {
        setProgress(0);
      }
      return;
    }

    // media posts (video/photo/audio)
    if (!mediaBlob) {
      toast({ title: 'Rien à publier', description: 'Capture d’abord un contenu.', variant: 'destructive' });
      return;
    }

    setStage('publishing');
    setProgress(1);

    try {
      const mergedTags = Array.from(new Set([...hashtags, ...extractHashtags(caption)]));
      const upload = await uploadToStorage({
        blob: mediaBlob,
        userId,
        type: mediaType === 'photo' ? 'photo' : mediaType === 'audio' ? 'audio' : 'video',
        onProgress: setProgress,
      });

      const res = await createPost({
        userId,
        type: mediaType,
        caption,
        hashtags: mergedTags,
        music: selectedMusic,
        filter: currentFilter,
        mediaPath: upload.path,
        mediaUrl: upload.publicUrl,
        durationSec,
        onProgress: setProgress,
      });

      toast({ title: 'Publié', description: 'Ton post est en ligne ✅' });
      onPublished?.(res.postId);

      resetAll();
      onClose();
    } catch (e: unknown) {
      toast({
        title: 'Publication échouée',
        description: e instanceof Error ? e.message : 'Erreur inconnue',
        variant: 'destructive',
      });
      setStage('preview');
    } finally {
      setProgress(0);
    }
  }, [
    caption,
    currentFilter,
    durationSec,
    hashtags,
    mediaBlob,
    mediaType,
    onClose,
    onPublished,
    resetAll,
    selectedMusic,
    stage,
    toast,
  ]);

  const applyTemplateOutput = useCallback(
    (payload: { type: string; content: string }) => {
      triggerFeedback('notification');

      if (payload.type === 'hashtags') {
        const tags = extractHashtags(payload.content);
        setHashtags((prev) => Array.from(new Set([...prev, ...tags])));
        return;
      }

      // All other types: add to caption
      setCaption((prev) => (prev ? `${prev}\n\n${payload.content}` : payload.content));
    },
    []
  );

  const previewStyle: React.CSSProperties = useMemo(() => {
    const css = currentFilter?.id && currentFilter.id !== 'none' ? currentFilter.cssFilter : 'none';
    return css === 'none' ? {} : { filter: css };
  }, [currentFilter]);

  const closeAll = useCallback(() => {
    // éviter de couper une publication en cours
    if (stage === 'publishing') return;
    triggerFeedback('notification');
    resetAll();
    stopStream();
    onClose();
  }, [onClose, resetAll, stage, stopStream]);

  const modeTabs = useMemo(
    () => [
      { id: 'video' as const, label: 'Video', icon: <VideoIcon className="w-4 h-4" /> },
      { id: 'photo' as const, label: 'Photo', icon: <ImageIcon className="w-4 h-4" /> },
      { id: 'text' as const, label: 'Text', icon: <Type className="w-4 h-4" /> },
      { id: 'live' as const, label: 'Live', icon: <Zap className="w-4 h-4" /> },
    ],
    []
  );

  const recordLabel = useMemo(() => {
    if (mode === 'photo') return currentLang === 'ba' ? 'Yà' : 'Prendre';
    if (mode === 'audio') return currentLang === 'ba' ? 'Gbé' : 'Enregistrer';
    if (mode === 'text') return currentLang === 'ba' ? 'Tẹ̀' : 'Écrire';
    if (mode === 'live') return currentLang === 'ba' ? 'Làìfù' : 'Go Live';
    return isRecording ? (currentLang === 'ba' ? 'Dúró' : 'Stop') : currentLang === 'ba' ? 'Gbé' : 'Rec';
  }, [currentLang, isRecording, mode]);

  const onMainAction = useCallback(async () => {
    if (stage !== 'capture') return;

    if (mode === 'text') {
      setMediaType('text');
      setStage('preview');
      return;
    }

    if (mode === 'live') {
      setMediaType('live');
      setStage('preview');
      return;
    }

    if (mode === 'photo') {
      await runTimerThen(async () => takePhoto());
      return;
    }

    if (mode === 'audio') {
      if (!isRecording) await runTimerThen(async () => startAudio());
      else stopRecording();
      return;
    }

    // video
    if (!isRecording) await runTimerThen(async () => startRecording());
    else stopRecording();
  }, [isRecording, mode, runTimerThen, stage, startAudio, startRecording, stopRecording, takePhoto]);

  const openAlbums = useCallback(() => {
    triggerFeedback('notification');
    fileInputRef.current?.click();
  }, []);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[70] bg-black"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 z-[3] flex items-center justify-between px-4 pt-4">
          <button onClick={closeAll} className="p-2 rounded-full bg-white/10 text-white">
            <X className="w-5 h-5" />
          </button>

          <button
            onClick={() => {
              triggerFeedback('notification');
              const next = selectedMusic ? null : musicPresets[0];
              setSelectedMusic(next);
            }}
            className="px-4 py-2 rounded-full bg-white/10 text-white flex items-center gap-2"
          >
            <Music2 className="w-4 h-4" />
            <span className="text-sm">{selectedMusic ? selectedMusic.title : 'Music'}</span>
          </button>

          <div className="w-10" />
        </div>

        {/* Right actions (Kuaishou-like) */}
        <div className="absolute right-3 top-24 z-[3] flex flex-col gap-3">
          <button onClick={switchCamera} className="w-12 h-12 rounded-2xl bg-white/10 text-white flex flex-col items-center justify-center">
            <RefreshCw className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Switch</span>
          </button>

          <button
            onClick={() => {
              triggerFeedback('notification');
              setTimerSec((p) => (p === 0 ? 3 : p === 3 ? 10 : 0));
            }}
            className="w-12 h-12 rounded-2xl bg-white/10 text-white flex flex-col items-center justify-center"
          >
            <Timer className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">{timerSec === 0 ? 'Timer' : `${timerSec}s`}</span>
          </button>

          <button
            onClick={() => setShowFilters(true)}
            className="w-12 h-12 rounded-2xl bg-white/10 text-white flex flex-col items-center justify-center"
          >
            <Sparkles className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Beautify</span>
          </button>

          <button
            onClick={() => {
              triggerFeedback('notification');
              setFitMode((p) => (p === 'full' ? 'fill' : 'full'));
            }}
            className="w-12 h-12 rounded-2xl bg-white/10 text-white flex flex-col items-center justify-center"
          >
            {fitMode === 'full' ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            <span className="text-[10px] mt-0.5">{fitMode === 'full' ? 'Full' : 'Fill'}</span>
          </button>

          <button
            onClick={toggleFlash}
            className="w-12 h-12 rounded-2xl bg-white/10 text-white flex flex-col items-center justify-center"
          >
            {flashOn ? <Flashlight className="w-5 h-5" /> : <FlashlightOff className="w-5 h-5" />}
            <span className="text-[10px] mt-0.5">Flash</span>
          </button>
        </div>

        {/* Preview / Capture area */}
        <div className="absolute inset-0">
          <div className="w-full h-full flex items-center justify-center">
            {stage === 'capture' && mode !== 'text' && (
              <video
                ref={videoRef}
                playsInline
                muted
                className={`w-full h-full ${fitMode === 'full' ? 'object-contain' : 'object-cover'}`}
                style={previewStyle}
              />
            )}

            {stage === 'capture' && mode === 'text' && (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500/40 to-blue-500/40">
                <div className="text-white/90 text-lg font-semibold">Write down your mood</div>
              </div>
            )}

            {stage === 'preview' && (
              <div className="w-full h-full">
                {mediaType === 'video' && (
                  <video
                    src={mediaUrl}
                    controls
                    playsInline
                    className={`w-full h-full ${fitMode === 'full' ? 'object-contain' : 'object-cover'}`}
                  />
                )}
                {mediaType === 'photo' && (
                  <img src={mediaUrl} alt="preview" className={`w-full h-full ${fitMode === 'full' ? 'object-contain' : 'object-cover'}`} />
                )}
                {mediaType === 'audio' && (
                  <div className="w-full h-full flex items-center justify-center bg-black">
                    <audio src={mediaUrl} controls className="w-[90%]" />
                  </div>
                )}
                {mediaType === 'text' && (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500/40 to-blue-500/40">
                    <div className="text-white/90 text-lg font-semibold">Text post</div>
                  </div>
                )}
                {mediaType === 'live' && (
                  <div className="w-full h-full flex items-center justify-center bg-black">
                    <div className="text-white text-lg font-semibold">LIVE Preview</div>
                  </div>
                )}
              </div>
            )}

            {stage === 'publishing' && (
              <div className="w-full h-full flex items-center justify-center bg-black">
                <div className="w-[85%] max-w-md rounded-3xl bg-white/10 border border-white/10 p-4">
                  <div className="text-white font-semibold flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Publication…
                  </div>
                  <div className="text-white/60 text-sm mt-1">Upload + DB insert</div>
                  <div className="mt-3 w-full h-2 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
                  </div>
                  <div className="text-white/60 text-xs mt-2">{progress}%</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom controls */}
        <div className="absolute bottom-0 left-0 right-0 z-[3] pb-6">
          {/* Mode tabs */}
          <div className="mx-auto max-w-md px-4">
            <div className="flex items-center justify-between bg-black/40 border border-white/10 rounded-full px-2 py-2">
              {modeTabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    triggerFeedback('notification');
                    setMode(t.id);
                    // reset capture-only state
                    if (stage === 'capture') {
                      setIsRecording(false);
                      setRecordMs(0);
                      chunksRef.current = [];
                    }
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-full text-sm ${
                    mode === t.id ? 'bg-white/15 text-white' : 'text-white/70'
                  }`}
                >
                  {t.icon}
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Action row */}
          <div className="mt-4 flex items-center justify-center gap-10">
            {/* Magic / templates */}
            <button
              onClick={() => setShowTemplates(true)}
              className="w-16 h-16 rounded-2xl bg-white/10 text-white flex flex-col items-center justify-center"
            >
              <Sparkles className="w-6 h-6" />
              <span className="text-[11px] mt-1">Magic</span>
            </button>

            {/* Main capture button */}
            <button
              onClick={onMainAction}
              className={`w-20 h-20 rounded-full border-4 ${
                isRecording ? 'border-red-400' : 'border-white/80'
              } flex items-center justify-center bg-white/10`}
            >
              <div className={`w-14 h-14 rounded-full ${isRecording ? 'bg-red-500' : 'bg-gradient-to-br from-pink-500 to-orange-400'}`} />
            </button>

            {/* Albums */}
            <button
              onClick={openAlbums}
              className="w-16 h-16 rounded-2xl bg-white/10 text-white flex flex-col items-center justify-center"
            >
              <Upload className="w-6 h-6" />
              <span className="text-[11px] mt-1">Albums</span>
            </button>
          </div>

          {/* Recording hint */}
          <div className="mt-3 text-center text-white/70 text-sm">
            {mode === 'video' || mode === 'audio' ? (
              <span>
                {recordLabel}
                {isRecording ? ` • ${Math.max(1, Math.round(recordMs / 1000))}s` : ''}
              </span>
            ) : (
              <span>{recordLabel}</span>
            )}
          </div>

          {/* Preview footer */}
          {stage === 'preview' && (
            <div className="mt-4 mx-auto max-w-md px-4">
              <div className="rounded-2xl bg-black/50 border border-white/10 p-3">
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Caption…"
                  className="w-full bg-transparent text-white placeholder:text-white/40 outline-none text-sm min-h-[80px]"
                />

                <div className="mt-2 flex flex-wrap gap-2">
                  {hashtags.map((h) => (
                    <span
                      key={h}
                      className="text-xs px-2 py-1 rounded-full bg-white/10 text-white/80"
                      onClick={() => setHashtags((prev) => prev.filter((x) => x !== h))}
                    >
                      {h}
                    </span>
                  ))}
                </div>

                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => {
                      triggerFeedback('notification');
                      setStage('capture');
                      setMediaBlob(null);
                      if (mediaUrl) URL.revokeObjectURL(mediaUrl);
                      setMediaUrl('');
                    }}
                    className="flex-1 py-2 rounded-xl bg-white/10 text-white text-sm"
                  >
                    Back
                  </button>

                  <button onClick={publish} className="flex-1 py-2 rounded-xl bg-primary text-white text-sm flex items-center justify-center gap-2">
                    <Check className="w-4 h-4" />
                    Publish
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*,image/*,audio/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            onSelectFromAlbums(f).catch(() => undefined);
            e.currentTarget.value = '';
          }}
        />

        {/* Filters panel */}
        <VideoFiltersPanel
          isOpen={showFilters}
          onClose={() => setShowFilters(false)}
          currentFilter={currentFilter}
          onSelectFilter={(f) => {
            setCurrentFilter(f);
            setShowFilters(false);
          }}
        />

        {/* Templates panel */}
        <DynamicAITemplates
          isOpen={showTemplates}
          onClose={() => setShowTemplates(false)}
          topic={caption || 'Mon sujet'}
          language={currentLang === 'ba' ? 'ba' : 'fr'}
          onGenerated={(p: { type: string; content: string }) => applyTemplateOutput(p)}
        />
      </motion.div>
    </AnimatePresence>
  );
}
