import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Music, Repeat2, Timer, Flame, Eye, Sparkles, Gauge, Expand, Zap, ChevronDown,
  Image as ImageIcon, Video as VideoIcon, Type as TypeIcon, Wand2, Send, MessageCircle,
  Radio, Camera, Play, Pause, RotateCcw, Check, AlertCircle, Loader2, Globe,
} from 'lucide-react';

import { DynamicAITemplates, AITemplate, AIGenType } from './DynamicAITemplates';
import VideoFiltersPanel, { VIDEO_FILTERS, VideoFilter, useVideoFilter } from './VideoFilters';

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
  }) => Promise<void>;
  language?: 'fr' | 'ba';
}

type MusicChoice = { id: string; title: string; url?: string; artist?: string };
type GradientTheme = 'purpleBlue' | 'orangePink' | 'greenCyan' | 'pinkPurple';

function nowKey() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function pickMimeType(kind: 'video' | 'audio') {
  const candidates =
    kind === 'video'
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

    const { error } = await supabase.storage.from(bucket).upload(name, blob, {
      upsert: true,
      contentType,
    });
    if (error) throw error;

    const { data } = supabase.storage.from(bucket).getPublicUrl(name);
    return data.publicUrl;
  } catch (e) {
    console.error('[Upload Error]', e);
    throw e;
  }
}

async function renderStoryTextToImage(text: string, gradient: GradientTheme): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No canvas ctx');

  const g = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  if (gradient === 'purpleBlue') {
    g.addColorStop(0, '#7c3aed');
    g.addColorStop(1, '#0ea5e9');
  } else if (gradient === 'orangePink') {
    g.addColorStop(0, '#fb7185');
    g.addColorStop(1, '#fb923c');
  } else if (gradient === 'pinkPurple') {
    g.addColorStop(0, '#ec4899');
    g.addColorStop(1, '#8b5cf6');
  } else {
    g.addColorStop(0, '#22c55e');
    g.addColorStop(1, '#06b6d4');
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.font = '700 64px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';

  const maxWidth = 920;
  const x = 80;
  let y = 280;

  const words = text.split(/\s+/);
  let line = '';
  const lines: string[] = [];
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth) {
      if (line) lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);

  for (const l of lines.slice(0, 10)) {
    ctx.fillText(l, x, y);
    y += 84;
  }

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png', 1);
  });
}

async function tryToggleTorch(stream: MediaStream | null, enabled: boolean) {
  try {
    const track = stream?.getVideoTracks?.()[0];
    await track?.applyConstraints?.({ advanced: [{ torch: enabled } as any] });
    return true;
  } catch {
    return false;
  }
}

export const FullscreenCreator: React.FC<FullscreenCreatorProps> = ({
  isOpen = true,
  onClose,
  onComplete,
  language = 'fr',
}) => {
  const { currentFilter, setCurrentFilter, getFilterStyle } = useVideoFilter();

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

  const [timerSeconds, setTimerSeconds] = useState<0 | 3 | 10>(0);
  const [speed, setSpeed] = useState<0.5 | 1 | 2>(1);
  const [fullMode, setFullMode] = useState<boolean>(true);
  const [flashOn, setFlashOn] = useState<boolean>(false);
  const [livePhotoOn, setLivePhotoOn] = useState<boolean>(false);

  const [rightExpanded, setRightExpanded] = useState<boolean>(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [magicOpen, setMagicOpen] = useState(false);

  const [topic, setTopic] = useState<string>('');
  const [challenge, setChallenge] = useState<string>('');
  const [tags, setTags] = useState<string[]>([]);

  const [music, setMusic] = useState<MusicChoice | null>(null);
  const [durationPick, setDurationPick] = useState<60 | 300>(60);

  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [previewType, setPreviewType] = useState<'video' | 'photo' | 'text' | ''>('');
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);

  const [storyGradient, setStoryGradient] = useState<GradientTheme>('purpleBlue');
  const [textContent, setTextContent] = useState<string>('');

  const [timerPanel, setTimerPanel] = useState(false);
  const [speedPanel, setSpeedPanel] = useState(false);
  const [challengePanel, setChallengePanel] = useState(false);
  const [inspiringPanel, setInspiringPanel] = useState(false);
  const [musicPanel, setMusicPanel] = useState(false);

  const [livePanelOpen, setLivePanelOpen] = useState(false);
  const [liveSessionId, setLiveSessionId] = useState<string>('');
  const [liveMessages, setLiveMessages] = useState<Array<{ id: number; message: string; created_at: string; display_name?: string }>>([]);
  const [liveInput, setLiveInput] = useState('');
  const [liveViewers, setLiveViewers] = useState<number>(0);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cameraError, setCameraError] = useState<string>('');
  const [burstCount, setBurstCount] = useState(0);

  const MUSIC_LIST: MusicChoice[] = useMemo(
    () => [
      { id: 'm1', title: 'Afro Chill', artist: 'TamTam Beats' },
      { id: 'm2', title: 'Drum Groove', artist: 'TamTam Studio' },
      { id: 'm3', title: 'Story Piano', artist: 'TamTam Music' },
      { id: 'm4', title: 'Viral Dance', artist: 'Trending Sounds' },
      { id: 'm5', title: 'Lo-Fi Vibes', artist: 'Chill Zone' },
    ],
    []
  );

  const CHALLENGES = useMemo(
    () => [
      '#DanceChallenge',
      '#BeforeAfter',
      '#LearnIn60s',
      '#MoodStory',
      '#VillageNews',
      '#DailyVlog',
      '#CookingTime',
      '#Fashion2025',
    ],
    []
  );

  const INSPIRING = useMemo(
    () => [
      language === 'ba' ? 'Ṣàlàyé ohun tó gbọ́ní lọ́gbọ́n' : 'Explique une astuce en 30 secondes',
      language === 'ba' ? 'Ṣíwájú/Lẹ́yìn àyípadà' : 'Avant/Après transformation',
      language === 'ba' ? 'Ìtàn díẹ̀: "ohun tí mo kọ́"' : 'Une histoire courte: "ce que j\'ai appris"',
      language === 'ba' ? 'Àṣìṣe 3 tó tóbi jù' : 'Top 3 erreurs à éviter',
      language === 'ba' ? 'Ìdánwò: sọ ọ̀rọ̀ yìí ní èdè àbínibí' : 'Défi: répète ce mot en langue locale',
      language === 'ba' ? 'Ìmọ̀ràn ọjọ́ọjọ́' : 'Conseil du jour',
      language === 'ba' ? 'Àṣírí tí kò gbọ́dọ̀ sọ' : 'Secret bien gardé',
      language === 'ba' ? 'Ọjọ́ kan ní ìgbésí ayé mi' : 'Un jour dans ma vie',
    ],
    [language]
  );

  // Recording duration timer
  useEffect(() => {
    let interval: number | undefined;
    if (isRecording) {
      interval = window.setInterval(() => {
        setRecordingDuration(Date.now() - recordingStartTime.current);
      }, 100);
    } else {
      setRecordingDuration(0);
    }
    return () => {
      if (interval) window.clearInterval(interval);
    };
  }, [isRecording]);

  const stopStream = useCallback(() => {
    try {
      recorderRef.current?.stop();
    } catch {}
    recorderRef.current = null;

    if (streamRef.current) {
      for (const t of streamRef.current.getTracks()) t.stop();
    }
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraError('');
  }, []);

  const startStream = useCallback(async () => {
    stopStream();
    setCameraError('');

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode,
          width: { ideal: 1080 },
          height: { ideal: 1920 },
        },
        audio: topTab === 'live' || mode === 'video',
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }

      if (flashOn) {
        await tryToggleTorch(stream, true);
      }
    } catch (e: any) {
      setCameraError(
        language === 'ba'
          ? 'Kò lè wo kámẹ́rà. Ṣàyẹ̀wò ìyọ̀nda.'
          : 'Impossible d\'accéder à la caméra. Vérifiez les permissions.'
      );
      console.error('[Camera Error]', e);
    }
  }, [facingMode, flashOn, language, mode, stopStream, topTab]);

  useEffect(() => {
    if (!isOpen) return;
    if (topTab === 'template') return;

    startStream();

    return () => {
      stopStream();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [isOpen, topTab, facingMode, startStream, stopStream, previewUrl]);

  useEffect(() => {
    return () => {
      if (burstTimerRef.current) window.clearInterval(burstTimerRef.current);
    };
  }, []);

  const handleClose = useCallback(() => {
    stopStream();
    onClose?.();
  }, [onClose, stopStream]);

  const capturePhotoBlob = useCallback(async (): Promise<Blob> => {
    const v = videoRef.current;
    if (!v) throw new Error('No video element');

    const canvas = document.createElement('canvas');
    canvas.width = v.videoWidth || 1080;
    canvas.height = v.videoHeight || 1920;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No canvas ctx');

    const f = currentFilter?.id !== 'none' ? currentFilter : null;
    if (f) ctx.filter = (getFilterStyle(f, f.intensity).filter as string) || 'none';

    ctx.drawImage(v, 0, 0, canvas.width, canvas.height);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('photo toBlob failed'))), 'image/png', 1);
    });
  }, [currentFilter, getFilterStyle]);

  const startMediaRecorder = useCallback(
    async (kind: 'video' | 'audio') => {
      if (!streamRef.current) throw new Error('No stream');
      chunksRef.current = [];

      const mimeType = pickMimeType(kind);
      const rec = new MediaRecorder(streamRef.current, mimeType ? { mimeType } : undefined);
      recorderRef.current = rec;

      rec.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      rec.start(300);
      recordingStartTime.current = Date.now();
      setIsRecording(true);
    },
    []
  );

  const stopRecorderGetBlob = useCallback(async (): Promise<Blob> => {
    return await new Promise<Blob>((resolve) => {
      const rec = recorderRef.current;
      if (!rec) {
        resolve(new Blob([], { type: 'video/webm' }));
        return;
      }

      const finalize = () => {
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'video/webm' });
        resolve(blob);
      };

      rec.addEventListener('stop', finalize, { once: true });
      try {
        rec.stop();
      } catch {
        finalize();
      } finally {
        recorderRef.current = null;
        setIsRecording(false);
      }
    });
  }, []);

  const doCountdownThen = useCallback(
    async (fn: () => Promise<void>) => {
      if (timerSeconds === 0) return fn();

      setCountdown(timerSeconds);
      let remaining = timerSeconds;

      const tick = () =>
        new Promise<void>((resolve) => {
          window.setTimeout(() => resolve(), 1000);
        });

      while (remaining > 0) {
        await tick();
        remaining -= 1;
        setCountdown(remaining);
      }
      return fn();
    },
    [timerSeconds]
  );

  const beginCapture = useCallback(async () => {
    if (!isOpen) return;

    if (mode === 'video') {
      await doCountdownThen(async () => {
        await startMediaRecorder('video');
      });
      return;
    }

    if (mode === 'photo') {
      await doCountdownThen(async () => {
        if (livePhotoOn) {
          await startMediaRecorder('video');
          await new Promise((r) => window.setTimeout(r, 2000));
          const blob = await stopRecorderGetBlob();
          const url = URL.createObjectURL(blob);
          setPreviewBlob(blob);
          setPreviewUrl(url);
          setPreviewType('video');
        } else {
          const blob = await capturePhotoBlob();
          const url = URL.createObjectURL(blob);
          setPreviewBlob(blob);
          setPreviewUrl(url);
          setPreviewType('photo');
        }
      });
      return;
    }

    if (mode === 'burst') {
      await doCountdownThen(async () => {
        const photos: Blob[] = [];
        let count = 0;
        setBurstCount(0);

        if (burstTimerRef.current) window.clearInterval(burstTimerRef.current);

        burstTimerRef.current = window.setInterval(async () => {
          try {
            const b = await capturePhotoBlob();
            photos.push(b);
            count += 1;
            setBurstCount(count);
            if (count >= 8) {
              if (burstTimerRef.current) window.clearInterval(burstTimerRef.current);
              burstTimerRef.current = null;
              const last = photos[photos.length - 1];
              const url = URL.createObjectURL(last);
              setPreviewBlob(last);
              setPreviewUrl(url);
              setPreviewType('photo');
              setBurstCount(0);
            }
          } catch {}
        }, 250);
      });
      return;
    }

    if (mode === 'text') {
      const blob = await renderStoryTextToImage(textContent || ' ', storyGradient);
      const url = URL.createObjectURL(blob);
      setPreviewBlob(blob);
      setPreviewUrl(url);
      setPreviewType('photo');
      return;
    }
  }, [
    capturePhotoBlob,
    doCountdownThen,
    isOpen,
    livePhotoOn,
    mode,
    startMediaRecorder,
    stopRecorderGetBlob,
    storyGradient,
    textContent,
  ]);

  const endVideoCapture = useCallback(async () => {
    const blob = await stopRecorderGetBlob();
    const url = URL.createObjectURL(blob);
    setPreviewBlob(blob);
    setPreviewUrl(url);
    setPreviewType('video');
  }, [stopRecorderGetBlob]);

  const clearPreview = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl('');
    setPreviewType('');
    setPreviewBlob(null);
  }, [previewUrl]);

  const submit = useCallback(async () => {
    if (!previewBlob) return;

    setIsSubmitting(true);

    try {
      let mediaUrl = '';
      let mediaType: 'video' | 'photo' | 'text' = previewType || 'photo';

      if (mediaType === 'video') {
        mediaUrl = await uploadToSupabaseStorage(previewBlob, 'webm', 'videos');
      } else {
        mediaUrl = await uploadToSupabaseStorage(previewBlob, 'png', 'photos');
      }

      const isStory = topTab === 'story';
      const seconds = mode === 'video' ? Math.floor(recordingDuration / 1000) || durationPick : isStory ? 15 : 5;

      const payload = {
        audio_url: mediaType === 'video' ? mediaUrl : '',
        media_type: mediaType === 'photo' ? ('photo' as const) : mediaType === 'video' ? ('video' as const) : ('text' as const),
        media_url: mediaUrl,
        transcript_fr: '',
        transcript_ba: '',
        template_id: 'kuaishou-inspired-core',
        topic: topic || (challenge ? challenge : isStory ? 'story' : 'post'),
        duration_seconds: seconds,
        text_content: mode === 'text' ? textContent : undefined,
        tags,
        challenge,
        music_title: music?.title,
        is_story: isStory,
      };

      if (onComplete) {
        await onComplete(payload);
      }

      clearPreview();
      handleClose();
    } catch (e: any) {
      console.error('[Submit Error]', e);
      alert(language === 'ba' ? 'Àṣìṣe ní fífi sí server' : 'Erreur lors de l\'envoi');
    } finally {
      setIsSubmitting(false);
    }
  }, [
    challenge,
    clearPreview,
    durationPick,
    handleClose,
    language,
    mode,
    music?.title,
    onComplete,
    previewBlob,
    previewType,
    recordingDuration,
    tags,
    textContent,
    topTab,
    topic,
  ]);

  const doSwitch = useCallback(() => {
    setFacingMode((p) => (p === 'environment' ? 'user' : 'environment'));
  }, []);

  const toggleFlash = useCallback(async () => {
    const next = !flashOn;
    setFlashOn(next);
    await tryToggleTorch(streamRef.current, next);
  }, [flashOn]);

  useEffect(() => {
    if (previewType === 'video') {
      const v = document.getElementById('tamtam-preview-video') as HTMLVideoElement | null;
      if (v) v.playbackRate = speed;
    }
  }, [previewType, speed]);

  // LIVE realtime
  useEffect(() => {
    if (!liveSessionId) return;
    
    let channel: any;
    
    const setupLive = async () => {
      try {
        const { supabase } = await import('@/integrations/supabase/client');
        channel = supabase
          .channel(`live:${liveSessionId}`, { config: { presence: { key: 'viewer' } } })
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'live_messages', filter: `session_id=eq.${liveSessionId}` },
            (payload) => {
              const row = payload.new as any;
              setLiveMessages((prev) => [...prev, row]);
            }
          )
          .on('presence', { event: 'sync' }, () => {
            const state = channel.presenceState() as any;
            const count = Object.keys(state || {}).length;
            setLiveViewers(count);
          });

        await channel.subscribe(async (status: string) => {
          if (status === 'SUBSCRIBED') {
            await channel.track({ online_at: new Date().toISOString() });
          }
        });
      } catch (e) {
        console.error('[Live Setup Error]', e);
      }
    };

    setupLive();

    return () => {
      if (channel) {
        try {
          const { supabase } = require('@/integrations/supabase/client');
          supabase.removeChannel(channel);
        } catch {}
      }
    };
  }, [liveSessionId]);

  const createLive = useCallback(async () => {
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: session } = await supabase.auth.getSession();
      const uid = session.session?.user.id;
      if (!uid) {
        alert(language === 'ba' ? 'Wọlé láti bẹ̀rẹ̀ LIVE' : 'Connecte-toi pour lancer un LIVE');
        return;
      }

      const { data, error } = await supabase
        .from('live_sessions')
        .insert({ creator_id: uid, title: topic || 'LIVE', status: 'live', started_at: new Date().toISOString() })
        .select('id')
        .single();

      if (error) throw error;

      setLiveSessionId(data.id);
      setLivePanelOpen(true);
    } catch (e) {
      console.error('[Create Live Error]', e);
      alert(language === 'ba' ? 'Àṣìṣe ní ṣíṣe LIVE' : 'Erreur lors de la création du LIVE');
    }
  }, [language, topic]);

  const joinLive = useCallback(async () => {
    if (!liveSessionId) return;
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: session } = await supabase.auth.getSession();
      const uid = session.session?.user.id;
      if (!uid) return;

      await supabase
        .from('live_participants')
        .upsert({ session_id: liveSessionId, user_id: uid, role: 'viewer', last_seen_at: new Date().toISOString() });
    } catch (e) {
      console.error('[Join Live Error]', e);
    }
  }, [liveSessionId]);

  useEffect(() => {
    if (topTab === 'live' && liveSessionId) {
      joinLive();
    }
  }, [joinLive, liveSessionId, topTab]);

  const sendLive = useCallback(async () => {
    const msg = liveInput.trim();
    if (!msg || !liveSessionId) return;
    setLiveInput('');

    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: session } = await supabase.auth.getSession();
      const uid = session.session?.user.id;

      await supabase.from('live_messages').insert({
        session_id: liveSessionId,
        user_id: uid,
        display_name: session.session?.user.email?.split('@')[0] ?? 'viewer',
        message: msg,
        lang: language,
      });
    } catch (e) {
      console.error('[Send Live Message Error]', e);
    }
  }, [language, liveInput, liveSessionId]);

  const onGenerated = useCallback(
    (p: { type: AIGenType; content: string; templateId?: string }) => {
      if (p.type === 'hashtags') {
        const hs = p.content.split(/\s+/).filter((x) => x.startsWith('#')).slice(0, 18);
        setTags((prev) => Array.from(new Set([...prev, ...hs])));
      } else if (p.type === 'hook' || p.type === 'title') {
        setTopic(p.content.split('\n')[0]?.slice(0, 80) || topic);
      } else if (p.type === 'caption' || p.type === 'script') {
        setTextContent(p.content);
      }
    },
    [topic]
  );

  const onApplyTemplate = useCallback((t: AITemplate) => {
    setMagicOpen(false);
    if (!topic) setTopic(t.title);
  }, [topic]);

  if (isOpen === false) return null;

  const isStory = topTab === 'story';
  const recordDurationText = `${Math.floor(recordingDuration / 60000)}:${Math.floor((recordingDuration % 60000) / 1000).toString().padStart(2, '0')}`;

  const RightButton = ({
    icon,
    label,
    onClick,
    active,
    hidden,
  }: {
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
    active?: boolean;
    hidden?: boolean;
  }) => {
    if (hidden) return null;
    return (
      <motion.button
        onClick={onClick}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`flex flex-col items-center gap-1 py-2 px-2 rounded-2xl transition ${
          active ? 'bg-white/20 text-white' : 'bg-transparent text-white/85 hover:bg-white/10'
        }`}
      >
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
          active ? 'bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg' : 'bg-black/25 border border-white/10'
        }`}>
          {icon}
        </div>
        <span className="text-[11px] font-medium">{label}</span>
      </motion.button>
    );
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black text-white overflow-hidden">
      {/* CAMERA PREVIEW */}
      {topTab !== 'template' && (
        <div className="absolute inset-0">
          <video
            ref={videoRef}
            playsInline
            muted
            className="w-full h-full"
            style={{
              objectFit: fullMode ? 'cover' : 'contain',
              ...(currentFilter ? getFilterStyle(currentFilter, currentFilter.intensity) : {}),
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/40" />
        </div>
      )}

      {/* TEMPLATE TAB BG */}
      {topTab === 'template' && (
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-black to-pink-900">
          <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.3),transparent_50%)]" />
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_bottom_left,rgba(236,72,153,0.3),transparent_50%)]" />
        </div>
      )}

      {/* Camera Error */}
      {cameraError && topTab !== 'template' && (
        <div className="absolute top-20 left-0 right-0 mx-4 p-4 rounded-2xl bg-red-500/20 border border-red-500/30 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="text-sm text-white">{cameraError}</p>
          </div>
        </div>
      )}

      {/* TOP BAR */}
      <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-10">
        <motion.button
          onClick={handleClose}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="w-10 h-10 rounded-full bg-black/40 border border-white/10 backdrop-blur-xl flex items-center justify-center"
        >
          <X className="w-5 h-5" />
        </motion.button>

        <button
          onClick={() => setMusicPanel(true)}
          className="px-4 py-2 rounded-full bg-black/35 border border-white/10 backdrop-blur-xl flex items-center gap-2 hover:bg-black/45 transition"
        >
          <Music className="w-4 h-4" />
          <span className="text-sm font-medium truncate max-w-[120px]">
            {music?.title ?? (language === 'ba' ? 'Orin' : 'Musique')}
          </span>
        </button>

        <div className="w-10 h-10" />
      </div>

      {/* RECORDING INDICATOR */}
      {isRecording && (
        <motion.div
          className="absolute top-16 left-4 px-3 py-2 rounded-full bg-red-500/90 backdrop-blur-xl flex items-center gap-2"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <motion.div
            className="w-2 h-2 rounded-full bg-white"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
          <span className="text-white font-mono text-sm tabular-nums">{recordDurationText}</span>
        </motion.div>
      )}

      {/* BURST COUNTER */}
      {burstCount > 0 && (
        <motion.div
          className="absolute top-16 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-purple-500/90 backdrop-blur-xl"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <span className="text-white font-bold">{burstCount}/8</span>
        </motion.div>
      )}

      {/* RIGHT RAIL */}
      <div className="absolute right-3 top-20 z-10 flex flex-col gap-2 items-center">
        <RightButton icon={<Repeat2 className="w-5 h-5" />} label={language === 'ba' ? 'Yípadà' : 'Switch'} onClick={doSwitch} />
        <RightButton
          icon={<Timer className="w-5 h-5" />}
          label={language === 'ba' ? 'Àkókò' : 'Timer'}
          onClick={() => setTimerPanel(true)}
          active={timerSeconds !== 0}
        />
        <RightButton
          icon={<Flame className="w-5 h-5" />}
          label={language === 'ba' ? 'Ìdíje' : 'Challenge'}
          onClick={() => setChallengePanel(true)}
          active={!!challenge}
        />
        <RightButton
          icon={<Eye className="w-5 h-5" />}
          label={language === 'ba' ? 'Ìmọ̀ràn' : 'Idées'}
          onClick={() => setInspiringPanel(true)}
        />
        <RightButton
          icon={<Sparkles className="w-5 h-5" />}
          label={language === 'ba' ? 'Ẹwà' : 'Filtres'}
          onClick={() => setFiltersOpen(true)}
        />

        <RightButton
          icon={<Gauge className="w-5 h-5" />}
          label={language === 'ba' ? 'Iyára' : 'Vitesse'}
          onClick={() => setSpeedPanel(true)}
          active={speed !== 1}
          hidden={!rightExpanded}
        />
        <RightButton
          icon={<Expand className="w-5 h-5" />}
          label="Full"
          onClick={() => setFullMode((p) => !p)}
          active={fullMode}
          hidden={!rightExpanded}
        />
        <RightButton
          icon={<Zap className="w-5 h-5" />}
          label="Flash"
          onClick={toggleFlash}
          active={flashOn}
          hidden={!rightExpanded}
        />

        <button
          onClick={() => setRightExpanded((p) => !p)}
          className="w-10 h-10 rounded-full bg-black/40 border border-white/10 backdrop-blur-xl flex items-center justify-center mt-2"
        >
          <ChevronDown className={`w-5 h-5 transition-transform ${rightExpanded ? 'rotate-0' : '-rotate-90'}`} />
        </button>
      </div>

      {/* COUNTDOWN */}
      <AnimatePresence>
        {countdown > 0 && (
          <motion.div
            className="absolute inset-0 z-20 flex items-center justify-center bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="text-9xl font-extrabold text-white drop-shadow-2xl"
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.2, 1] }}
              transition={{ duration: 0.5 }}
            >
              {countdown}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PREVIEW MODAL */}
      <AnimatePresence>
        {!!previewUrl && (
          <motion.div
            className="absolute inset-0 z-[60] bg-black/95 flex flex-col"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="flex items-center justify-between p-4">
              <button
                onClick={clearPreview}
                className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 transition flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>{language === 'ba' ? 'Ṣe Lẹ́ẹ̀kan si' : 'Reprendre'}</span>
              </button>
              <div className="text-white/70 text-sm font-medium">
                {isStory ? (language === 'ba' ? 'Ìtàn' : 'Story') : language === 'ba' ? 'Àgbéjade' : 'Aperçu'}
              </div>
              <button
                onClick={submit}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium disabled:opacity-50 flex items-center gap-2 shadow-lg transition"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{language === 'ba' ? 'Ń fi ránṣẹ́...' : 'Envoi...'}</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>{language === 'ba' ? 'Fíránṣẹ́' : 'Publier'}</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex-1 flex items-center justify-center px-4 pb-6">
              {previewType === 'video' ? (
                <video
                  id="tamtam-preview-video"
                  src={previewUrl}
                  controls
                  autoPlay
                  loop
                  className="max-h-[80vh] w-full rounded-2xl bg-black shadow-2xl"
                />
              ) : (
                <img src={previewUrl} className="max-h-[80vh] w-full object-contain rounded-2xl bg-black shadow-2xl" alt="preview" />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BOTTOM CREATOR */}
      <div className="absolute bottom-0 left-0 right-0 z-10 pb-6">
        {/* TOP TAB BAR */}
        <div className="mx-auto max-w-md px-4">
          <div className="rounded-2xl bg-black/40 border border-white/10 backdrop-blur-xl p-2 flex items-center justify-between shadow-xl">
            {(['video', 'story', 'template', 'live'] as TopTab[]).map((t) => (
              <button
                key={t}
                onClick={() => {
                  setTopTab(t);
                  if (t === 'live') setMode('video');
                  if (t === 'template') stopStream();
                }}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold transition ${
                  topTab === t ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg' : 'text-white/70 hover:text-white'
                }`}
              >
                {t === 'video'
                  ? language === 'ba'
                    ? 'Fídíò'
                    : 'Video'
                  : t === 'story'
                  ? language === 'ba'
                    ? 'Ìtàn'
                    : 'Story'
                  : t === 'template'
                  ? 'AI'
                  : 'LIVE'}
              </button>
            ))}
          </div>
        </div>

        {/* TEMPLATE TAB CONTENT */}
        {topTab === 'template' && (
          <div className="mx-auto max-w-md px-4 mt-4 space-y-3">
            <motion.button
              onClick={() => setMagicOpen(true)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 backdrop-blur-xl p-4 flex items-center justify-between shadow-xl"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
                  <Wand2 className="w-6 h-6 text-white" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-white">
                    {language === 'ba' ? 'AI Àwọn Àpẹẹrẹ' : 'AI Templates & Magic'}
                  </div>
                  <div className="text-xs text-white/60">
                    {language === 'ba' ? 'Àwọn àpẹẹrẹ • àkọlé • hashtags' : 'Auto montage • scripts • hashtags • thèmes'}
                  </div>
                </div>
              </div>
              <ChevronDown className="w-5 h-5 text-white/70 -rotate-90" />
            </motion.button>

            <div className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl p-4">
              <div className="text-white/70 text-sm mb-3 flex items-center gap-2">
                <Globe className="w-4 h-4" />
                {language === 'ba' ? 'Àwọn kókó tó gbajúmọ̀' : 'Sujets tendance'}
              </div>
              <div className="flex flex-wrap gap-2">
                {INSPIRING.slice(0, 4).map((s, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setTopic(s);
                      setTopTab('video');
                      setMode('video');
                    }}
                    className="px-3 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 text-white/80 text-xs font-medium transition"
                  >
                    {s.length > 30 ? `${s.slice(0, 30)}...` : s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* LIVE TAB CONTENT */}
        {topTab === 'live' && (
          <div className="mx-auto max-w-md px-4 mt-3">
            <div className="rounded-2xl bg-black/40 border border-red-500/30 backdrop-blur-xl p-4 shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <motion.div
                    className="w-3 h-3 rounded-full bg-red-500"
                    animate={{ opacity: [1, 0.5, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                  <Radio className="w-5 h-5 text-red-400" />
                  <div className="font-semibold text-white">
                    {language === 'ba' ? 'ÌRÒYÌN LÁÌ' : 'LIVE'}
                  </div>
                  {liveSessionId && (
                    <div className="text-xs text-white/60">
                      {liveSessionId.slice(0, 8)}...
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/10">
                  <Eye className="w-4 h-4 text-white/70" />
                  <span className="text-xs text-white font-medium">{liveViewers}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={createLive}
                  disabled={!!liveSessionId}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white font-semibold disabled:opacity-50 transition shadow-lg"
                >
                  {language === 'ba' ? 'Bẹ̀rẹ̀ LIVE' : 'Démarrer LIVE'}
                </button>
                <button
                  onClick={() => setLivePanelOpen(true)}
                  disabled={!liveSessionId}
                  className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-white font-semibold disabled:opacity-50 transition"
                >
                  {language === 'ba' ? 'Ìfọ̀rọ̀wánilẹ̀nuwò' : 'Chat'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CAPTURE STRIP */}
        {topTab !== 'template' && (
          <>
            {/* Duration picker for video */}
            {(mode === 'video' || topTab === 'live') && (
              <div className="flex justify-center gap-3 mb-3 mt-4">
                {[300, 60].map((dur) => (
                  <button
                    key={dur}
                    className={`px-4 py-2 rounded-full font-medium text-sm transition ${
                      durationPick === dur
                        ? 'bg-white text-black shadow-lg'
                        : 'bg-black/30 border border-white/10 text-white/80 hover:bg-black/40'
                    }`}
                    onClick={() => setDurationPick(dur as 60 | 300)}
                  >
                    {dur === 300 ? '5 min' : '1 min'}
                  </button>
                ))}
              </div>
            )}

            {/* Mode Strip */}
            <div className="flex justify-center gap-8 mb-3 text-sm font-semibold">
              {(['burst', 'photo', 'video', 'text'] as CaptureMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    setMode(m);
                    if (m === 'text') setStoryGradient('purpleBlue');
                  }}
                  className={`px-3 py-1.5 rounded-full transition ${
                    mode === m ? 'bg-white text-black shadow-lg' : 'text-white/75 hover:text-white'
                  }`}
                >
                  {m === 'burst'
                    ? language === 'ba'
                      ? 'Púpọ̀'
                      : 'Rafale'
                    : m === 'photo'
                    ? language === 'ba'
                      ? 'Àwòrán'
                      : 'Photo'
                    : m === 'video'
                    ? language === 'ba'
                      ? 'Fídíò'
                      : 'Vidéo'
                    : language === 'ba'
                    ? 'Ọ̀rọ̀'
                    : 'Texte'}
                </button>
              ))}
            </div>

            {/* Bottom Controls */}
            <div className="mx-auto max-w-md px-10 flex items-end justify-between">
              {/* Magic AI */}
              <motion.button
                onClick={() => setMagicOpen(true)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex flex-col items-center gap-1.5"
              >
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/30 to-pink-500/30 border border-purple-500/30 backdrop-blur-xl flex items-center justify-center shadow-lg">
                  <Wand2 className="w-6 h-6 text-white" />
                </div>
                <div className="text-xs text-white/90 font-medium">Magic</div>
              </motion.button>

              {/* Record Button */}
              <div className="flex flex-col items-center gap-2">
                <motion.button
                  onClick={isRecording ? endVideoCapture : beginCapture}
                  disabled={countdown > 0}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`w-20 h-20 rounded-full border-4 flex items-center justify-center shadow-2xl ${
                    isRecording
                      ? 'border-red-500 bg-red-500/40 backdrop-blur-xl'
                      : 'border-white/90 bg-gradient-to-tr from-purple-500/80 to-pink-500/80 backdrop-blur-xl'
                  }`}
                >
                  {mode === 'photo' || mode === 'burst' ? (
                    <Camera className="w-8 h-8 text-white" />
                  ) : mode === 'text' ? (
                    <TypeIcon className="w-8 h-8 text-white" />
                  ) : isRecording ? (
                    <Pause className="w-8 h-8 text-white" />
                  ) : (
                    <Play className="w-8 h-8 text-white" />
                  )}
                </motion.button>

                {/* Livephoto toggle */}
                {mode === 'photo' && (
                  <button
                    onClick={() => setLivePhotoOn((p) => !p)}
                    className={`text-xs px-3 py-1 rounded-full border border-white/20 font-medium transition ${
                      livePhotoOn ? 'bg-white text-black' : 'bg-black/30 text-white/80'
                    }`}
                  >
                    Livephoto {livePhotoOn ? 'ON' : 'OFF'}
                  </button>
                )}
              </div>

              {/* Albums */}
              <label className="flex flex-col items-center gap-1.5 cursor-pointer">
                <div className="w-14 h-14 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-xl flex items-center justify-center shadow-lg hover:bg-black/50 transition">
                  <ImageIcon className="w-6 h-6 text-white" />
                </div>
                <div className="text-xs text-white/90 font-medium">{language === 'ba' ? 'Album' : 'Albums'}</div>
                <input
                  type="file"
                  accept="video/*,image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const url = URL.createObjectURL(file);
                    setPreviewBlob(file);
                    setPreviewUrl(url);
                    setPreviewType(file.type.startsWith('video') ? 'video' : 'photo');
                  }}
                />
              </label>
            </div>

            {/* Story Text Editor */}
            {mode === 'text' && (
              <div className="mx-auto max-w-md px-4 mt-4">
                <div
                  className={`rounded-2xl border border-white/20 backdrop-blur-xl p-4 shadow-xl ${
                    storyGradient === 'purpleBlue'
                      ? 'bg-gradient-to-br from-purple-500/40 to-sky-500/40'
                      : storyGradient === 'orangePink'
                      ? 'bg-gradient-to-br from-rose-500/40 to-orange-500/40'
                      : storyGradient === 'pinkPurple'
                      ? 'bg-gradient-to-br from-pink-500/40 to-purple-500/40'
                      : 'bg-gradient-to-br from-green-500/40 to-cyan-500/40'
                  }`}
                >
                  <div className="text-white/90 text-sm mb-2 font-medium">
                    {language === 'ba' ? 'Kọ ohùn inú rẹ' : 'Écris ton humeur'}
                  </div>
                  <textarea
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    placeholder={language === 'ba' ? 'Kọ níbí...' : 'Écris ici...'}
                    className="w-full min-h-[100px] rounded-xl bg-black/30 border border-white/20 p-3 text-white outline-none placeholder:text-white/40 focus:border-white/40 transition"
                  />
                  <div className="mt-3 grid grid-cols-4 gap-2">
                    {(['purpleBlue', 'orangePink', 'pinkPurple', 'greenCyan'] as GradientTheme[]).map((g) => (
                      <button
                        key={g}
                        onClick={() => setStoryGradient(g)}
                        className={`py-2 rounded-xl border text-xs font-medium transition ${
                          storyGradient === g
                            ? 'bg-white/30 border-white/50 text-white shadow-lg'
                            : 'bg-black/20 border-white/10 text-white/70 hover:bg-black/30'
                        }`}
                      >
                        {g === 'purpleBlue'
                          ? '🟣🔵'
                          : g === 'orangePink'
                          ? '🟠🩷'
                          : g === 'pinkPurple'
                          ? '🩷🟣'
                          : '🟢🩵'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Topic/Challenge Input */}
            <div className="mx-auto max-w-md px-4 mt-3">
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder={
                  language === 'ba' ? 'Kókó / èrò...' : 'Sujet / idée...'
                }
                className="w-full px-4 py-3 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-xl text-white placeholder:text-white/40 outline-none focus:border-white/30 transition"
              />
              {(challenge || tags.length > 0) && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {challenge && (
                    <span className="text-xs px-3 py-1 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 text-white font-medium">
                      {challenge}
                    </span>
                  )}
                  {tags.slice(0, 6).map((t, i) => (
                    <span key={i} className="text-xs px-3 py-1 rounded-full bg-white/10 border border-white/10 text-white/80">
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* PANELS */}
      <VideoFiltersPanel
        isOpen={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        onSelectFilter={(f: VideoFilter) => setCurrentFilter(f)}
        currentFilter={currentFilter}
        initialCategory="beauty"
        language={language}
      />

      <DynamicAITemplates
        isOpen={magicOpen}
        onClose={() => setMagicOpen(false)}
        topic={topic || challenge || ' '}
        language={language}
        onApplyTemplate={onApplyTemplate}
        onGenerated={onGenerated}
      />

      {/* TIMER PANEL */}
      <AnimatePresence>
        {timerPanel && (
          <motion.div
            className="fixed inset-0 z-[95] bg-black/70"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setTimerPanel(false)}
          >
            <motion.div
              className="absolute bottom-0 left-0 right-0 rounded-t-3xl bg-black/95 backdrop-blur-xl border-t border-white/10 p-4"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-white font-semibold text-lg mb-4">
                {language === 'ba' ? 'Àkókò Ìdádúró' : 'Minuterie'}
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[0, 3, 10].map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      setTimerSeconds(t as 0 | 3 | 10);
                      setTimerPanel(false);
                    }}
                    className={`py-4 rounded-2xl border font-semibold transition ${
                      timerSeconds === t
                        ? 'bg-white text-black border-white shadow-lg'
                        : 'bg-white/10 border-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    {t === 0 ? (language === 'ba' ? 'Kò sí' : 'Désactivé') : `${t}s`}
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SPEED PANEL */}
      <AnimatePresence>
        {speedPanel && (
          <motion.div
            className="fixed inset-0 z-[95] bg-black/70"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSpeedPanel(false)}
          >
            <motion.div
              className="absolute bottom-0 left-0 right-0 rounded-t-3xl bg-black/95 backdrop-blur-xl border-t border-white/10 p-4"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-white font-semibold text-lg mb-4">
                {language === 'ba' ? 'Iyára' : 'Vitesse'}
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[0.5, 1, 2].map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setSpeed(s as 0.5 | 1 | 2);
                      setSpeedPanel(false);
                    }}
                    className={`py-4 rounded-2xl border font-semibold transition ${
                      speed === s
                        ? 'bg-white text-black border-white shadow-lg'
                        : 'bg-white/10 border-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
              <div className="text-xs text-white/60 mt-3 text-center">
                {language === 'ba'
                  ? 'Iyára ń ṣiṣẹ́ lórí ìwòye nìkan'
                  : 'La vitesse affecte la lecture uniquement'}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CHALLENGE PANEL */}
      <AnimatePresence>
        {challengePanel && (
          <motion.div
            className="fixed inset-0 z-[95] bg-black/70"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setChallengePanel(false)}
          >
            <motion.div
              className="absolute bottom-0 left-0 right-0 rounded-t-3xl bg-black/95 backdrop-blur-xl border-t border-white/10 p-4"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
                <Flame className="w-5 h-5 text-orange-400" />
                {language === 'ba' ? 'Ìdíje' : 'Challenges'}
              </div>
              <div className="flex flex-wrap gap-2 mb-3">
                {CHALLENGES.map((c) => (
                  <button
                    key={c}
                    onClick={() => {
                      setChallenge(c);
                      setChallengePanel(false);
                    }}
                    className={`px-4 py-2 rounded-full border font-medium transition ${
                      challenge === c
                        ? 'bg-white text-black border-white'
                        : 'bg-white/10 border-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <button
                onClick={() => {
                  setChallenge('');
                  setChallengePanel(false);
                }}
                className="w-full py-3 rounded-2xl bg-white/10 border border-white/10 text-white font-medium hover:bg-white/20 transition"
              >
                {language === 'ba' ? 'Parẹ́' : 'Effacer'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* INSPIRING PANEL */}
      <AnimatePresence>
        {inspiringPanel && (
          <motion.div
            className="fixed inset-0 z-[95] bg-black/70"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setInspiringPanel(false)}
          >
            <motion.div
              className="absolute bottom-0 left-0 right-0 rounded-t-3xl bg-black/95 backdrop-blur-xl border-t border-white/10 p-4 max-h-[70vh] overflow-y-auto"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
                <Eye className="w-5 h-5 text-purple-400" />
                {language === 'ba' ? 'Àwọn Ìmọ̀ràn' : 'Idées Inspirantes'}
              </div>
              <div className="space-y-2">
                {INSPIRING.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setTopic(s);
                      setInspiringPanel(false);
                      setMagicOpen(true);
                    }}
                    className="w-full text-left px-4 py-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-white transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500/30 to-pink-500/30 border border-purple-500/30 flex items-center justify-center text-sm font-bold">
                        {i + 1}
                      </div>
                      <span className="text-sm">{s}</span>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MUSIC PANEL */}
      <AnimatePresence>
        {musicPanel && (
          <motion.div
            className="fixed inset-0 z-[95] bg-black/70"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMusicPanel(false)}
          >
            <motion.div
              className="absolute bottom-0 left-0 right-0 rounded-t-3xl bg-black/95 backdrop-blur-xl border-t border-white/10 p-4 max-h-[60vh] overflow-y-auto"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
                <Music className="w-5 h-5 text-pink-400" />
                {language === 'ba' ? 'Orin' : 'Musique'}
              </div>
              <div className="space-y-2">
                {MUSIC_LIST.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      setMusic(m);
                      setMusicPanel(false);
                    }}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border transition ${
                      music?.id === m.id
                        ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-500/30'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Music className="w-5 h-5 text-white/70" />
                      <div className="text-left">
                        <div className="text-white font-medium">{m.title}</div>
                        <div className="text-xs text-white/60">{m.artist}</div>
                      </div>
                    </div>
                    {music?.id === m.id && <Check className="w-5 h-5 text-white" />}
                  </button>
                ))}
              </div>
              <button
                onClick={() => {
                  setMusic(null);
                  setMusicPanel(false);
                }}
                className="w-full mt-3 py-3 rounded-2xl bg-white/10 border border-white/10 text-white font-medium hover:bg-white/20 transition"
              >
                {language === 'ba' ? 'Parẹ́' : 'Aucune musique'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* LIVE CHAT PANEL */}
      <AnimatePresence>
        {livePanelOpen && (
          <motion.div
            className="fixed inset-0 z-[98] bg-black/70"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLivePanelOpen(false)}
          >
            <motion.div
              className="absolute bottom-0 left-0 right-0 rounded-t-3xl bg-black/95 backdrop-blur-xl border-t border-white/10 p-4 max-h-[75vh] overflow-hidden flex flex-col"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-purple-400" />
                  <div className="font-semibold text-white">
                    {language === 'ba' ? 'Ìfọ̀rọ̀wánilẹ̀nuwò LIVE' : 'Chat LIVE'}
                  </div>
                  <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-white/10">
                    <Eye className="w-3 h-3 text-white/70" />
                    <span className="text-xs text-white">{liveViewers}</span>
                  </div>
                </div>
                <button
                  onClick={() => setLivePanelOpen(false)}
                  className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm transition"
                >
                  {language === 'ba' ? 'Padé' : 'Fermer'}
                </button>
              </div>

              <div className="flex-1 rounded-2xl bg-black/30 border border-white/10 p-3 overflow-y-auto mb-3 space-y-2">
                {liveMessages.length === 0 ? (
                  <div className="text-white/50 text-sm text-center py-8">
                    {language === 'ba' ? 'Kò sí ìfọ̀rọ̀wánilẹ̀nuwò kan' : 'Aucun message pour le moment'}
                  </div>
                ) : (
                  liveMessages.map((m) => (
                    <div key={m.id} className="text-sm bg-white/5 rounded-lg p-2 border border-white/5">
                      <span className="text-purple-400 font-medium text-xs mr-2">
                        {m.display_name ?? 'viewer'}:
                      </span>
                      <span className="text-white">{m.message}</span>
                    </div>
                  ))
                )}
              </div>

              <div className="flex gap-2">
                <input
                  value={liveInput}
                  onChange={(e) => setLiveInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendLive()}
                  placeholder={language === 'ba' ? 'Kọ ìfọ̀rọ̀wánilẹ̀nuwò...' : 'Écris un message...'}
                  className="flex-1 px-4 py-3 rounded-2xl bg-black/40 border border-white/10 text-white outline-none placeholder:text-white/40 focus:border-white/30 transition"
                />
                <button
                  onClick={sendLive}
                  disabled={!liveInput.trim()}
                  className="w-12 h-12 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 flex items-center justify-center disabled:opacity-50 transition shadow-lg"
                >
                  <Send className="w-5 h-5 text-white" />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FullscreenCreator;
