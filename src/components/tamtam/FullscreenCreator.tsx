import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Music,
  Repeat2,
  Timer,
  Flame,
  Eye,
  Sparkles,
  Gauge,
  Zap,
  Wand2,
  Send,
  MessageCircle,
  Radio,
  Camera,
  Type as TypeIcon,
  RotateCcw,
  Check,
  AlertCircle,
  Loader2,
} from 'lucide-react';

import { DynamicAITemplates, AITemplate, AIGenType } from './DynamicAITemplates';
import VideoFiltersPanel, { useVideoFilter } from './VideoFilters';

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

  return (
    candidates.find(
      (t) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported?.(t)
    ) || ''
  );
}

async function uploadToSupabaseStorage(blob: Blob, ext: string, folder: string): Promise<string> {
  const { supabase } = await import('@/integrations/supabase/client');
  const bucket = 'tamtam-media';
  const name = `${folder}/${nowKey()}-${crypto.randomUUID()}.${ext}`;
  const contentType =
    blob.type ||
    (ext === 'webm' ? 'video/webm' : ext === 'png' ? 'image/png' : 'application/octet-stream');

  const { error } = await supabase.storage.from(bucket).upload(name, blob, {
    upsert: true,
    contentType,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(bucket).getPublicUrl(name);
  return data.publicUrl;
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

  const words = (text || ' ').split(/\s+/);
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

const Sheet: React.FC<{
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}> = ({ open, title, onClose, children }) => {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[120] bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed left-0 right-0 bottom-0 z-[130] rounded-t-3xl bg-[#0b0b0f] border border-white/10 p-4"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="text-white font-semibold">{title}</div>
              <button
                onClick={onClose}
                className="p-2 rounded-full bg-white/10 hover:bg-white/15 transition"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

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
  const lastRecordedMsRef = useRef<number>(0);

  const [topTab, setTopTab] = useState<TopTab>('video');
  const [mode, setMode] = useState<CaptureMode>('video');

  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [countdown, setCountdown] = useState<number>(0);

  const [timerSeconds, setTimerSeconds] = useState<0 | 3 | 10>(0);
  const [speed, setSpeed] = useState<0.5 | 1 | 2>(1);
  const [flashOn, setFlashOn] = useState<boolean>(false);
  const [livePhotoOn, setLivePhotoOn] = useState<boolean>(false);

  const [rightExpanded] = useState<boolean>(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [magicOpen, setMagicOpen] = useState(false);

  const [topic, setTopic] = useState<string>('');
  const [challenge, setChallenge] = useState<string>('');
  const [tags, setTags] = useState<string[]>([]);

  const [music, setMusic] = useState<MusicChoice | null>(null);
  const [durationPick] = useState<60 | 300>(60);

  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [previewType, setPreviewType] = useState<'video' | 'photo' | 'text' | ''>('');
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);

  const [storyGradient] = useState<GradientTheme>('purpleBlue');
  const [textContent, setTextContent] = useState<string>('');

  const [timerPanelOpen, setTimerPanelOpen] = useState(false);
  const [speedPanelOpen, setSpeedPanelOpen] = useState(false);
  const [challengePanelOpen, setChallengePanelOpen] = useState(false);
  const [inspiringPanelOpen, setInspiringPanelOpen] = useState(false);
  const [musicPanelOpen, setMusicPanelOpen] = useState(false);

  const [livePanelOpen, setLivePanelOpen] = useState(false);
  const [liveSessionId, setLiveSessionId] = useState<string>('');
  const [liveMessages, setLiveMessages] = useState<
    Array<{ id: number; message: string; created_at: string; display_name?: string }>
  >([]);
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
      language === 'ba' ? 'Ìtàn díẹ̀: "ohun tí mo kọ́"' : 'Une histoire courte: "ce que j’ai appris"',
      language === 'ba' ? 'Àṣìṣe 3 tó tóbi jù' : 'Top 3 erreurs à éviter',
      language === 'ba' ? 'Ìdánwò: sọ ọ̀rọ̀ yìí ní èdè àbínibí' : 'Défi: répète ce mot en langue locale',
      language === 'ba' ? 'Ìmọ̀ràn ọjọ́ọjọ́' : 'Conseil du jour',
      language === 'ba' ? 'Àṣírí tí kò gbọ́dọ̀ sọ' : 'Secret bien gardé',
      language === 'ba' ? 'Ọjọ́ kan ní ìgbésí ayé mi' : 'Un jour dans ma vie',
    ],
    [language]
  );

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
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        recorderRef.current.stop();
      }
    } catch {}
    recorderRef.current = null;
    setIsRecording(false);

    if (burstTimerRef.current) {
      window.clearInterval(burstTimerRef.current);
      burstTimerRef.current = null;
    }

    if (streamRef.current) {
      for (const t of streamRef.current.getTracks()) t.stop();
    }
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCountdown(0);
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
          aspectRatio: { ideal: 9 / 16 },
          frameRate: { ideal: 30, max: 60 },
        },
        audio: topTab === 'live' || mode === 'video',
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      // Reduce “default zoom” when device exposes zoom capability
      try {
        const track = stream.getVideoTracks?.()[0];
        const caps: any = track?.getCapabilities?.();
        if (caps?.zoom) {
          const minZoom = typeof caps.zoom.min === 'number' ? caps.zoom.min : 1;
          await track.applyConstraints({ advanced: [{ zoom: minZoom }] as any });
        }
      } catch {}

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }

      if (flashOn) {
        await tryToggleTorch(stream, true);
      }
    } catch (e) {
      setCameraError(
        language === 'ba'
          ? 'Kò lè wo kámẹ́rà. Ṣàyẹ̀wò ìyọ̀nda.'
          : "Impossible d'accéder à la caméra. Vérifiez les permissions."
      );
      console.error('[Camera Error]', e);
    }
  }, [facingMode, flashOn, language, mode, stopStream, topTab]);

  useEffect(() => {
    if (!isOpen) return;

    // Templates: pas besoin de caméra
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

  useEffect(() => {
    // Auto-open templates when tab is "template"
    if (topTab === 'template') setMagicOpen(true);
    else setMagicOpen(false);
  }, [topTab]);

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
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('photo toBlob failed'))),
        'image/png',
        1
      );
    });
  }, [currentFilter, getFilterStyle]);

  const startMediaRecorder = useCallback(async (kind: 'video' | 'audio') => {
    if (!streamRef.current) throw new Error('No stream');
    chunksRef.current = [];

    const mimeType = pickMimeType(kind);
    const rec = new MediaRecorder(streamRef.current, mimeType ? { mimeType } : undefined);
    recorderRef.current = rec;

    rec.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };

    rec.onerror = (e) => {
      console.error('[Recorder Error]', e);
      try {
        rec.stop();
      } catch {}
    };

    recordingStartTime.current = Date.now();
    lastRecordedMsRef.current = 0;
    setIsRecording(true);

    rec.start(300);
  }, []);

  const stopRecorderGetBlob = useCallback(async (): Promise<Blob> => {
    return await new Promise<Blob>((resolve) => {
      const rec = recorderRef.current;
      if (!rec) {
        resolve(new Blob([], { type: 'video/webm' }));
        return;
      }

      const finalize = () => {
        lastRecordedMsRef.current = Math.max(0, Date.now() - recordingStartTime.current);
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'video/webm' });
        resolve(blob);
      };

      rec.addEventListener('stop', finalize, { once: true });

      try {
        if (rec.state !== 'inactive') rec.stop();
        else finalize();
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
      const mediaType: 'video' | 'photo' | 'text' = (previewType as any) || 'photo';

      if (mediaType === 'video') {
        mediaUrl = await uploadToSupabaseStorage(previewBlob, 'webm', 'videos');
      } else {
        mediaUrl = await uploadToSupabaseStorage(previewBlob, 'png', 'photos');
      }

      const isStory = topTab === 'story';
      const recordedSeconds = Math.max(1, Math.floor((lastRecordedMsRef.current || 0) / 1000));
      const seconds =
        mediaType === 'video'
          ? recordedSeconds || durationPick
          : isStory
          ? 15
          : mode === 'text'
          ? 10
          : 5;

      const payload = {
        audio_url: mediaType === 'video' ? mediaUrl : '',
        media_type:
          mediaType === 'photo'
            ? ('photo' as const)
            : mediaType === 'video'
            ? ('video' as const)
            : ('text' as const),
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

      if (onComplete) await onComplete(payload);

      clearPreview();
      handleClose();
    } catch (e) {
      console.error('[Submit Error]', e);
      alert(language === 'ba' ? 'Àṣìṣe ní fífi sí server' : "Erreur lors de l'envoi");
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

  // LIVE: realtime channel
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
              // ✅ FIX: spread correct
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
        // ✅ FIX: no require() in web build
        import('@/integrations/supabase/client')
          .then(({ supabase }) => supabase.removeChannel(channel))
          .catch(() => {});
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
    if (topTab === 'live' && liveSessionId) joinLive();
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

  const onApplyTemplate = useCallback(
    (t: AITemplate) => {
      setMagicOpen(false);
      if (!topic) setTopic(t.title);
      if (topTab === 'template') setTopTab('video');
    },
    [topic, topTab]
  );

  if (isOpen === false) return null;

  const isStory = topTab === 'story';
  const recordDurationText = `${Math.floor(recordingDuration / 60000)}:${Math.floor(
    (recordingDuration % 60000) / 1000
  )
    .toString()
    .padStart(2, '0')}`;

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
      <button
        onClick={onClick}
        className={`flex flex-col items-center justify-center gap-1 py-2 px-3 rounded-lg transition ${
          active ? 'bg-white/20 text-white' : 'bg-white/10 text-white/70 hover:bg-white/15'
        }`}
      >
        <div className="w-6 h-6">{icon}</div>
        <div className="text-[10px] font-medium whitespace-nowrap">{label}</div>
      </button>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black">
      {/* Video Preview */}
      <div className="absolute inset-0">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          style={getFilterStyle(currentFilter, currentFilter?.intensity || 100)}
          autoPlay
          playsInline
          muted
        />

        {cameraError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <div className="text-center px-6">
              <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
              <p className="text-white text-sm">{cameraError}</p>
            </div>
          </div>
        )}

        {countdown > 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <motion.div
              key={countdown}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1.2, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="text-white text-9xl font-bold"
            >
              {countdown}
            </motion.div>
          </div>
        )}

        {burstCount > 0 && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="bg-black/70 px-6 py-3 rounded-full">
              <p className="text-white text-xl font-bold">{burstCount} / 8</p>
            </div>
          </div>
        )}
      </div>

      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/60 to-transparent">
        <div className="flex items-center justify-between">
          <button onClick={handleClose} className="p-2 rounded-full bg-black/40 hover:bg-black/60 transition">
            <X className="w-6 h-6 text-white" />
          </button>

          <div className="flex gap-2">
            <button
              onClick={() => setTopTab('video')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                topTab === 'video' ? 'bg-white text-black' : 'bg-white/20 text-white'
              }`}
            >
              {language === 'ba' ? 'Fídíò' : 'Vidéo'}
            </button>
            <button
              onClick={() => setTopTab('story')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                topTab === 'story' ? 'bg-white text-black' : 'bg-white/20 text-white'
              }`}
            >
              Story
            </button>
            <button
              onClick={() => setTopTab('template')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                topTab === 'template' ? 'bg-white text-black' : 'bg-white/20 text-white'
              }`}
            >
              Template
            </button>
            <button
              onClick={() => setTopTab('live')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                topTab === 'live' ? 'bg-red-500 text-white' : 'bg-white/20 text-white'
              }`}
            >
              <Radio className="w-4 h-4 inline mr-1" />
              LIVE
            </button>
          </div>

          <button onClick={doSwitch} className="p-2 rounded-full bg-black/40 hover:bg-black/60 transition">
            <RotateCcw className="w-6 h-6 text-white" />
          </button>
        </div>

        {isRecording && (
          <div className="mt-3 flex items-center justify-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            <span className="text-white text-lg font-mono">{recordDurationText}</span>
          </div>
        )}
      </div>

      {/* Right Sidebar */}
      <AnimatePresence>
        {rightExpanded && topTab !== 'template' && (
          <motion.div
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 100, opacity: 0 }}
            className="absolute top-20 right-4 flex flex-col gap-2"
          >
            <RightButton icon={<Wand2 />} label="Magic AI" onClick={() => setMagicOpen(true)} />
            <RightButton icon={<Sparkles />} label={language === 'ba' ? 'Àwọ̀' : 'Filtres'} onClick={() => setFiltersOpen(true)} />
            <RightButton icon={<Timer />} label="Timer" onClick={() => setTimerPanelOpen(true)} active={timerSeconds > 0} />
            <RightButton icon={<Gauge />} label="Speed" onClick={() => setSpeedPanelOpen(true)} active={speed !== 1} />
            <RightButton icon={<Music />} label={language === 'ba' ? 'Orin' : 'Musique'} onClick={() => setMusicPanelOpen(true)} active={!!music} />
            <RightButton icon={<Flame />} label="Challenge" onClick={() => setChallengePanelOpen(true)} hidden={isStory} />
            <RightButton icon={<Sparkles />} label={language === 'ba' ? 'Ìmọ̀ràn' : 'Idées'} onClick={() => setInspiringPanelOpen(true)} />
            <RightButton icon={<Zap />} label="Flash" onClick={toggleFlash} active={flashOn} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Controls */}
      {topTab !== 'template' && !previewUrl && (
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            <div className="flex gap-2">
              {!isStory && (
                <>
                  <button
                    onClick={() => setMode('burst')}
                    className={`p-3 rounded-full transition ${
                      mode === 'burst' ? 'bg-white text-black' : 'bg-white/20 text-white'
                    }`}
                  >
                    <Repeat2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setMode('photo')}
                    className={`p-3 rounded-full transition ${
                      mode === 'photo' ? 'bg-white text-black' : 'bg-white/20 text-white'
                    }`}
                  >
                    <Camera className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>

            <button
              onClick={isRecording ? endVideoCapture : beginCapture}
              disabled={!!cameraError}
              className={`w-20 h-20 rounded-full border-4 transition ${
                isRecording
                  ? 'bg-red-500 border-red-300'
                  : 'bg-white border-white/50 hover:border-white disabled:opacity-50'
              }`}
            >
              {isRecording && <div className="w-8 h-8 bg-white rounded mx-auto" />}
            </button>

            <div className="flex gap-2">
              {isStory && (
                <button
                  onClick={() => setMode('text')}
                  className={`p-3 rounded-full transition ${
                    mode === 'text' ? 'bg-white text-black' : 'bg-white/20 text-white'
                  }`}
                >
                  <TypeIcon className="w-5 h-5" />
                </button>
              )}
              {topTab === 'live' && (
                <button onClick={createLive} className="p-3 rounded-full bg-red-500 text-white">
                  <Radio className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Preview Mode */}
      {previewUrl && (
        <div className="absolute inset-0 bg-black z-20">
          {previewType === 'video' && (
            <video id="tamtam-preview-video" src={previewUrl} controls className="w-full h-full object-contain" />
          )}
          {previewType === 'photo' && <img src={previewUrl} alt="Preview" className="w-full h-full object-contain" />}

          <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
            <div className="flex gap-3 justify-center">
              <button
                onClick={clearPreview}
                className="flex items-center gap-2 px-6 py-3 rounded-full bg-white/20 text-white hover:bg-white/30 transition"
              >
                <RotateCcw className="w-5 h-5" />
                {language === 'ba' ? 'Tún ṣe' : 'Refaire'}
              </button>
              <button
                onClick={submit}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-8 py-3 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 transition disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                {language === 'ba' ? 'Fi ránṣẹ́' : 'Publier'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Panels */}
      <VideoFiltersPanel isOpen={filtersOpen} onClose={() => setFiltersOpen(false)} language={language} />

      <Sheet open={timerPanelOpen} title="Timer" onClose={() => setTimerPanelOpen(false)}>
        <div className="flex gap-2">
          {[0, 3, 10].map((t) => (
            <button
              key={t}
              onClick={() => {
                setTimerSeconds(t as 0 | 3 | 10);
                setTimerPanelOpen(false);
              }}
              className={`px-4 py-2 rounded-full border transition ${
                timerSeconds === t ? 'bg-white text-black border-white' : 'bg-white/10 text-white border-white/10 hover:bg-white/15'
              }`}
            >
              {t === 0 ? 'Off' : `${t}s`}
            </button>
          ))}
        </div>
      </Sheet>

      <Sheet open={speedPanelOpen} title="Speed" onClose={() => setSpeedPanelOpen(false)}>
        <div className="flex gap-2">
          {[0.5, 1, 2].map((s) => (
            <button
              key={s}
              onClick={() => {
                setSpeed(s as 0.5 | 1 | 2);
                setSpeedPanelOpen(false);
              }}
              className={`px-4 py-2 rounded-full border transition ${
                speed === s ? 'bg-white text-black border-white' : 'bg-white/10 text-white border-white/10 hover:bg-white/15'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      </Sheet>

      <Sheet open={musicPanelOpen} title="Musique" onClose={() => setMusicPanelOpen(false)}>
        <div className="space-y-2">
          <button
            onClick={() => {
              setMusic(null);
              setMusicPanelOpen(false);
            }}
            className="w-full text-left px-4 py-3 rounded-xl bg-white/10 text-white hover:bg-white/15 transition"
          >
            (Aucune musique)
          </button>
          {MUSIC_LIST.map((m) => (
            <button
              key={m.id}
              onClick={() => {
                setMusic(m);
                setMusicPanelOpen(false);
              }}
              className={`w-full text-left px-4 py-3 rounded-xl border transition ${
                music?.id === m.id ? 'bg-white text-black border-white' : 'bg-white/10 text-white border-white/10 hover:bg-white/15'
              }`}
            >
              <div className="font-semibold">{m.title}</div>
              <div className="text-xs opacity-80">{m.artist}</div>
            </button>
          ))}
        </div>
      </Sheet>

      <Sheet open={challengePanelOpen} title="Challenge" onClose={() => setChallengePanelOpen(false)}>
        <div className="flex flex-wrap gap-2">
          {CHALLENGES.map((c) => (
            <button
              key={c}
              onClick={() => {
                setChallenge(c);
                if (!topic) setTopic(c);
                setChallengePanelOpen(false);
              }}
              className={`px-4 py-2 rounded-full border transition ${
                challenge === c ? 'bg-white text-black border-white' : 'bg-white/10 text-white border-white/10 hover:bg-white/15'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </Sheet>

      <Sheet open={inspiringPanelOpen} title="Idées" onClose={() => setInspiringPanelOpen(false)}>
        <div className="space-y-2">
          {INSPIRING.map((idea, idx) => (
            <button
              key={idx}
              onClick={() => {
                setTopic(idea.slice(0, 80));
                setInspiringPanelOpen(false);
              }}
              className="w-full text-left px-4 py-3 rounded-xl bg-white/10 text-white hover:bg-white/15 transition"
            >
              {idea}
            </button>
          ))}
        </div>
      </Sheet>

      <Sheet open={livePanelOpen} title="LIVE Chat" onClose={() => setLivePanelOpen(false)}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-white/80 text-sm">
            <MessageCircle className="w-4 h-4" />
            <span>{liveMessages.length} messages</span>
          </div>
          <div className="flex items-center gap-2 text-white/80 text-sm">
            <Eye className="w-4 h-4" />
            <span>{liveViewers}</span>
          </div>
        </div>

        <div className="max-h-[45vh] overflow-auto rounded-xl border border-white/10 bg-black/30 p-3 space-y-2">
          {liveMessages.slice(-40).map((m) => (
            <div key={m.id} className="text-white text-sm">
              <span className="text-white/60 mr-2">{m.display_name || 'viewer'}:</span>
              <span>{m.message}</span>
            </div>
          ))}
          {liveMessages.length === 0 && (
            <div className="text-white/60 text-sm">Aucun message pour le moment…</div>
          )}
        </div>

        <div className="mt-3 flex gap-2">
          <input
            value={liveInput}
            onChange={(e) => setLiveInput(e.target.value)}
            placeholder={language === 'ba' ? 'Kọ ọrọ…' : 'Écris un message…'}
            className="flex-1 px-4 py-3 rounded-xl bg-white/10 text-white placeholder:text-white/40 outline-none border border-white/10"
            onKeyDown={(e) => {
              if (e.key === 'Enter') sendLive();
            }}
          />
          <button
            onClick={sendLive}
            className="px-4 py-3 rounded-xl bg-white text-black hover:bg-white/90 transition"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </Sheet>

      {/* Templates / Magic */}
      <DynamicAITemplates
        isOpen={magicOpen}
        onClose={() => {
          setMagicOpen(false);
          if (topTab === 'template') setTopTab('video');
        }}
        topic={topic}
        language={language}
        onApplyTemplate={onApplyTemplate}
        onGenerated={onGenerated}
      />
    </div>
  );
};

export default FullscreenCreator;
