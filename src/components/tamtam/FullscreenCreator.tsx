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
  Expand,
  Zap,
  ChevronDown,
  Image as ImageIcon,
  Video as VideoIcon,
  Type as TypeIcon,
  Wand2,
  Send,
  MessageCircle,
  Radio,
} from 'lucide-react';

import { supabase } from '@/integrations/supabase/client';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';
import { triggerFeedback } from '@/utils/tamtamFeedback';

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
}

type MusicChoice = { id: string; title: string; url?: string };

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

async function uploadToSupabaseStorage(blob: Blob, ext: string, folder: string) {
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
}

// Basic text->image for Story text
async function renderStoryTextToImage(text: string, gradient: string): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No canvas ctx');

  // gradient
  const g = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  if (gradient === 'purpleBlue') {
    g.addColorStop(0, '#7c3aed');
    g.addColorStop(1, '#0ea5e9');
  } else if (gradient === 'orangePink') {
    g.addColorStop(0, '#fb7185');
    g.addColorStop(1, '#fb923c');
  } else {
    g.addColorStop(0, '#22c55e');
    g.addColorStop(1, '#06b6d4');
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // text
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
    // @ts-expect-error torch is non-standard but supported on some devices
    await track?.applyConstraints?.({ advanced: [{ torch: enabled }] });
    return true;
  } catch {
    return false;
  }
}

export const FullscreenCreator: React.FC<FullscreenCreatorProps> = ({
  isOpen = true,
  onClose,
  onComplete,
}) => {
  const { currentLang } = useTamTamLanguage();
  const { currentFilter, setCurrentFilter, getFilterStyle } = useVideoFilter();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const burstTimerRef = useRef<number | null>(null);

  const [topTab, setTopTab] = useState<TopTab>('video');
  const [mode, setMode] = useState<CaptureMode>('video');

  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [isRecording, setIsRecording] = useState(false);
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
  const [durationPick, setDurationPick] = useState<60 | 300>(60); // 1min / 5min like screenshot

  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [previewType, setPreviewType] = useState<'video' | 'photo' | 'text' | ''>('');
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);

  // Story text
  const [storyGradient, setStoryGradient] = useState<'purpleBlue' | 'orangePink' | 'greenCyan'>('purpleBlue');
  const [textContent, setTextContent] = useState<string>('');

  // Panels (timer/speed/challenge/inspiring)
  const [timerPanel, setTimerPanel] = useState(false);
  const [speedPanel, setSpeedPanel] = useState(false);
  const [challengePanel, setChallengePanel] = useState(false);
  const [inspiringPanel, setInspiringPanel] = useState(false);
  const [musicPanel, setMusicPanel] = useState(false);

  // LIVE state
  const [livePanelOpen, setLivePanelOpen] = useState(false);
  const [liveSessionId, setLiveSessionId] = useState<string>('');
  const [liveMessages, setLiveMessages] = useState<Array<{ id: number; message: string; created_at: string; display_name?: string }>>([]);
  const [liveInput, setLiveInput] = useState('');
  const [liveViewers, setLiveViewers] = useState<number>(0);

  const MUSIC_LIST: MusicChoice[] = useMemo(
    () => [
      { id: 'm1', title: 'Afro Chill (demo)' },
      { id: 'm2', title: 'Drum Groove (demo)' },
      { id: 'm3', title: 'Story Piano (demo)' },
    ],
    []
  );

  const CHALLENGES = useMemo(
    () => ['#DanceChallenge', '#VillageNews', '#LearnIn60s', '#BeforeAfter', '#MoodStory'],
    []
  );

  const INSPIRING = useMemo(
    () => [
      'Explique une astuce en 30 secondes',
      'Avant/Après transformation',
      'Une histoire courte: “ce que j’ai appris”',
      'Top 3 erreurs à éviter',
      'Défi: répète ce mot en langue locale',
    ],
    []
  );

  const stopStream = useCallback(() => {
    try {
      recorderRef.current?.stop();
    } catch {
      // ignore
    }
    recorderRef.current = null;

    if (streamRef.current) {
      for (const t of streamRef.current.getTracks()) t.stop();
    }
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startStream = useCallback(async () => {
    stopStream();
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

    // flash torch attempt
    if (flashOn) {
      await tryToggleTorch(stream, true);
    }
  }, [facingMode, flashOn, mode, stopStream, topTab]);

  useEffect(() => {
    if (!isOpen) return;
    // start only when capture tabs are used (avoid requesting camera in Template tab)
    if (topTab === 'template') return;

    startStream().catch(() => {
      // if denied, UI still loads
    });

    return () => {
      stopStream();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, topTab, facingMode]);

  useEffect(() => {
    // cleanup burst interval
    return () => {
      if (burstTimerRef.current) window.clearInterval(burstTimerRef.current);
    };
  }, []);

  const handleClose = useCallback(() => {
    triggerFeedback('notification');
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

    // apply filter
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

      rec.onstop = () => {
        // stop tracks not here (we keep preview alive)
      };

      rec.start(300); // small slices to avoid freeze
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

      triggerFeedback('notification');
      setCountdown(timerSeconds);
      let remaining = timerSeconds;

      const tick = () =>
        new Promise<void>((resolve) => {
          window.setTimeout(() => resolve(), 1000);
        });

      while (remaining > 0) {
        // eslint-disable-next-line no-await-in-loop
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
          // record 2s
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
        triggerFeedback('notification');

        if (burstTimerRef.current) window.clearInterval(burstTimerRef.current);

        burstTimerRef.current = window.setInterval(async () => {
          try {
            const b = await capturePhotoBlob();
            photos.push(b);
            count += 1;
            if (count >= 8) {
              if (burstTimerRef.current) window.clearInterval(burstTimerRef.current);
              burstTimerRef.current = null;
              // take last one as preview
              const last = photos[photos.length - 1];
              const url = URL.createObjectURL(last);
              setPreviewBlob(last);
              setPreviewUrl(url);
              setPreviewType('photo');
            }
          } catch {
            // ignore
          }
        }, 250);
      });
      return;
    }

    if (mode === 'text') {
      // Story-style text: render to image for preview
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

    triggerFeedback('notification');

    // Upload
    let mediaUrl = '';
    let mediaType: 'video' | 'photo' | 'text' = previewType || 'photo';

    if (mediaType === 'video') {
      mediaUrl = await uploadToSupabaseStorage(previewBlob, 'webm', 'videos');
    } else {
      mediaUrl = await uploadToSupabaseStorage(previewBlob, 'png', 'photos');
    }

    const isStory = topTab === 'story';
    const seconds = mode === 'video' ? durationPick : isStory ? 15 : 5;

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
    } else {
      console.warn('[FullscreenCreator] onComplete missing, upload done:', payload);
    }

    clearPreview();
  }, [challenge, clearPreview, durationPick, mode, music?.title, onComplete, previewBlob, previewType, tags, textContent, topTab, topic]);

  // Switch camera
  const doSwitch = useCallback(async () => {
    triggerFeedback('notification');
    setFacingMode((p) => (p === 'environment' ? 'user' : 'environment'));
  }, []);

  // Flash
  const toggleFlash = useCallback(async () => {
    const next = !flashOn;
    setFlashOn(next);
    const ok = await tryToggleTorch(streamRef.current, next);
    if (!ok) {
      // some browsers no torch
    }
  }, [flashOn]);

  // Speed (metadata only + preview playrate)
  useEffect(() => {
    if (previewType === 'video') {
      const v = document.getElementById('tamtam-preview-video') as HTMLVideoElement | null;
      if (v) v.playbackRate = speed;
    }
  }, [previewType, speed]);

  // LIVE realtime subscription
  useEffect(() => {
    if (!liveSessionId) return;

    const channel = supabase
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

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ online_at: new Date().toISOString() });
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [liveSessionId]);

  const createLive = useCallback(async () => {
    triggerFeedback('notification');
    const { data: session } = await supabase.auth.getSession();
    const uid = session.session?.user.id;
    if (!uid) {
      alert('Connecte-toi pour lancer un LIVE.');
      return;
    }

    const { data, error } = await supabase
      .from('live_sessions')
      .insert({ creator_id: uid, title: topic || 'LIVE', status: 'live', started_at: new Date().toISOString() })
      .select('id')
      .single();

    if (error) {
      console.error(error);
      alert('Erreur live_sessions');
      return;
    }

    setLiveSessionId(data.id);
    setLivePanelOpen(true);
  }, [topic]);

  const joinLive = useCallback(async () => {
    if (!liveSessionId) return;
    const { data: session } = await supabase.auth.getSession();
    const uid = session.session?.user.id;
    if (!uid) {
      alert('Connecte-toi pour participer au LIVE.');
      return;
    }

    await supabase
      .from('live_participants')
      .upsert({ session_id: liveSessionId, user_id: uid, role: 'viewer', last_seen_at: new Date().toISOString() });
  }, [liveSessionId]);

  useEffect(() => {
    if (topTab === 'live' && liveSessionId) {
      joinLive().catch(() => {});
    }
  }, [joinLive, liveSessionId, topTab]);

  const sendLive = useCallback(async () => {
    const msg = liveInput.trim();
    if (!msg || !liveSessionId) return;
    setLiveInput('');

    const { data: session } = await supabase.auth.getSession();
    const uid = session.session?.user.id;

    await supabase.from('live_messages').insert({
      session_id: liveSessionId,
      user_id: uid,
      display_name: session.session?.user.email?.split('@')[0] ?? 'viewer',
      message: msg,
      lang: currentLang,
    });
  }, [currentLang, liveInput, liveSessionId]);

  // AI callbacks
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
    triggerFeedback('notification');
    setMagicOpen(false);
    // For now, just set topic hint
    if (!topic) setTopic(t.title);
  }, [topic]);

  if (isOpen === false) return null;

  const isStory = topTab === 'story';

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
        className={`flex flex-col items-center gap-1 py-2 px-2 rounded-2xl ${
          active ? 'bg-white/20 text-white' : 'bg-transparent text-white/85'
        } hover:bg-white/10 transition`}
      >
        <div className="w-10 h-10 rounded-2xl bg-black/25 border border-white/10 flex items-center justify-center">
          {icon}
        </div>
        <span className="text-[11px]">{label}</span>
      </button>
    );
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black text-white">
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
          {/* subtle overlay */}
          <div className="absolute inset-0 bg-black/10" />
        </div>
      )}

      {/* TEMPLATE TAB BG */}
      {topTab === 'template' && (
        <div className="absolute inset-0 bg-gradient-to-b from-black via-black to-black">
          <div className="absolute inset-0 opacity-25 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),transparent_45%)]" />
        </div>
      )}

      {/* TOP BAR */}
      <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-10">
        <button onClick={handleClose} className="w-10 h-10 rounded-full bg-black/40 border border-white/10 flex items-center justify-center">
          <X className="w-5 h-5" />
        </button>

        <button
          onClick={() => setMusicPanel(true)}
          className="px-4 py-2 rounded-full bg-black/35 border border-white/10 flex items-center gap-2"
        >
          <Music className="w-4 h-4" />
          <span className="text-sm">{music?.title ?? 'Music'}</span>
        </button>

        <div className="w-10 h-10" />
      </div>

      {/* RIGHT RAIL */}
      <div className="absolute right-3 top-20 z-10 flex flex-col gap-3 items-center">
        <RightButton icon={<Repeat2 className="w-5 h-5" />} label="Switch" onClick={doSwitch} />
        <RightButton icon={<Timer className="w-5 h-5" />} label="Timer" onClick={() => setTimerPanel(true)} active={timerSeconds !== 0} />
        <RightButton icon={<Flame className="w-5 h-5" />} label="challenge" onClick={() => setChallengePanel(true)} active={!!challenge} />
        <RightButton icon={<Eye className="w-5 h-5" />} label="Inspiring" onClick={() => setInspiringPanel(true)} />
        <RightButton icon={<Sparkles className="w-5 h-5" />} label="Beautify" onClick={() => setFiltersOpen(true)} />

        <RightButton
          icon={<Gauge className="w-5 h-5" />}
          label="Speed"
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
          className="w-10 h-10 rounded-full bg-black/40 border border-white/10 flex items-center justify-center"
          title="More"
        >
          <ChevronDown className={`w-5 h-5 transition ${rightExpanded ? 'rotate-0' : '-rotate-90'}`} />
        </button>
      </div>

      {/* COUNTDOWN */}
      <AnimatePresence>
        {countdown > 0 && (
          <motion.div
            className="absolute inset-0 z-20 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="text-7xl font-extrabold drop-shadow-xl">{countdown}</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PREVIEW MODAL */}
      <AnimatePresence>
        {!!previewUrl && (
          <motion.div
            className="absolute inset-0 z-[60] bg-black/80 flex flex-col"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="flex items-center justify-between p-4">
              <button onClick={clearPreview} className="px-4 py-2 rounded-full bg-white/10">
                Retake
              </button>
              <div className="text-white/70 text-sm">{isStory ? 'Story' : 'Post'} preview</div>
              <button onClick={submit} className="px-4 py-2 rounded-full bg-primary text-white">
                Next
              </button>
            </div>

            <div className="flex-1 flex items-center justify-center px-4 pb-6">
              {previewType === 'video' ? (
                <video
                  id="tamtam-preview-video"
                  src={previewUrl}
                  controls
                  autoPlay
                  className="max-h-[78vh] w-full rounded-2xl bg-black"
                />
              ) : (
                <img src={previewUrl} className="max-h-[78vh] w-full object-contain rounded-2xl bg-black" />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BOTTOM CREATOR */}
      <div className="absolute bottom-0 left-0 right-0 z-10 pb-6">
        {/* TOP TAB BAR (Video/Story/Template/Live) */}
        <div className="mx-auto max-w-md px-4">
          <div className="rounded-2xl bg-black/35 border border-white/10 p-2 flex items-center justify-between">
            {(['video', 'story', 'template', 'live'] as TopTab[]).map((t) => (
              <button
                key={t}
                onClick={() => {
                  triggerFeedback('notification');
                  setTopTab(t);
                  if (t === 'live') setMode('video');
                  if (t === 'template') stopStream();
                }}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold ${
                  topTab === t ? 'bg-white/15 text-white' : 'text-white/70'
                }`}
              >
                {t === 'video' ? 'Video' : t === 'story' ? 'Story' : t === 'template' ? 'Template' : 'Live'}
              </button>
            ))}
          </div>
        </div>

        {/* TEMPLATE TAB CONTENT */}
        {topTab === 'template' && (
          <div className="mx-auto max-w-md px-4 mt-4">
            <button
              onClick={() => setMagicOpen(true)}
              className="w-full rounded-2xl bg-white/10 border border-white/10 p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center">
                  <Wand2 className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <div className="font-semibold">AI Edit / Templates</div>
                  <div className="text-xs text-white/60">Auto montage • scripts • hashtags • thèmes</div>
                </div>
              </div>
              <div className="text-white/70 text-sm">Open</div>
            </button>

            <div className="mt-3 rounded-2xl bg-white/5 border border-white/10 p-3">
              <div className="text-white/70 text-sm mb-2">Quick topics</div>
              <div className="flex flex-wrap gap-2">
                {INSPIRING.slice(0, 5).map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setTopic(s);
                      setTopTab('video');
                      setMode('video');
                      triggerFeedback('notification');
                    }}
                    className="px-3 py-2 rounded-full bg-white/10 text-white/80 text-xs"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* LIVE TAB CONTENT */}
        {topTab === 'live' && (
          <div className="mx-auto max-w-md px-4 mt-3">
            <div className="rounded-2xl bg-black/35 border border-white/10 p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-red-400" />
                  <div className="font-semibold">LIVE</div>
                  <div className="text-xs text-white/60">{liveSessionId ? `Session: ${liveSessionId.slice(0, 6)}…` : 'Not started'}</div>
                </div>
                <div className="text-xs text-white/70">{liveViewers} viewers</div>
              </div>

              <div className="mt-3 flex gap-2">
                <button
                  onClick={createLive}
                  className="flex-1 py-2 rounded-xl bg-primary text-white font-semibold"
                >
                  Start LIVE
                </button>
                <button
                  onClick={() => setLivePanelOpen(true)}
                  className="flex-1 py-2 rounded-xl bg-white/10 text-white font-semibold"
                  disabled={!liveSessionId}
                >
                  Open Chat
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CAPTURE STRIP (Burst/Photo/Video/Text) — shown only if not template */}
        {topTab !== 'template' && (
          <>
            {/* duration (video) like screenshot */}
            {(mode === 'video' || topTab === 'live') && (
              <div className="flex justify-center gap-4 mb-2 text-sm">
                <button
                  className={`px-4 py-2 rounded-full ${durationPick === 300 ? 'bg-white text-black' : 'bg-black/30 border border-white/10'}`}
                  onClick={() => setDurationPick(300)}
                >
                  5 min
                </button>
                <button
                  className={`px-4 py-2 rounded-full ${durationPick === 60 ? 'bg-white text-black' : 'bg-black/30 border border-white/10'}`}
                  onClick={() => setDurationPick(60)}
                >
                  1 min
                </button>
              </div>
            )}

            <div className="flex justify-center gap-10 mb-3 text-sm font-semibold">
              {(['burst', 'photo', 'video', 'text'] as CaptureMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    triggerFeedback('notification');
                    setMode(m);
                    if (m === 'text') setStoryGradient('purpleBlue');
                  }}
                  className={`px-3 py-1 rounded-full ${mode === m ? 'bg-white text-black' : 'text-white/75'}`}
                >
                  {m === 'burst' ? 'Burst' : m === 'photo' ? 'Photo' : m === 'video' ? 'Video' : 'Text'}
                </button>
              ))}
            </div>

            {/* bottom buttons */}
            <div className="mx-auto max-w-md px-10 flex items-end justify-between">
              {/* Magic */}
              <button onClick={() => setMagicOpen(true)} className="flex flex-col items-center gap-1">
                <div className="w-14 h-14 rounded-2xl bg-black/35 border border-white/10 flex items-center justify-center">
                  <Wand2 className="w-6 h-6" />
                </div>
                <div className="text-xs text-white/80">Magic</div>
              </button>

              {/* Record */}
              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={isRecording ? endVideoCapture : beginCapture}
                  className={`w-20 h-20 rounded-full border-4 ${
                    isRecording ? 'border-red-400 bg-red-500/30' : 'border-white/80 bg-gradient-to-tr from-pink-500/80 to-orange-400/80'
                  } flex items-center justify-center`}
                  title={isRecording ? 'Stop' : 'Record'}
                >
                  {mode === 'photo' || mode === 'burst' ? (
                    <ImageIcon className="w-7 h-7" />
                  ) : mode === 'text' ? (
                    <TypeIcon className="w-7 h-7" />
                  ) : (
                    <VideoIcon className="w-7 h-7" />
                  )}
                </button>

                {/* livephoto toggle visible in photo */}
                {mode === 'photo' && (
                  <button
                    onClick={() => setLivePhotoOn((p) => !p)}
                    className={`text-xs px-3 py-1 rounded-full border border-white/10 ${livePhotoOn ? 'bg-white text-black' : 'bg-black/30 text-white/80'}`}
                  >
                    Livephoto {livePhotoOn ? 'ON' : 'OFF'}
                  </button>
                )}
              </div>

              {/* Albums */}
              <label className="flex flex-col items-center gap-1 cursor-pointer">
                <div className="w-14 h-14 rounded-2xl bg-black/35 border border-white/10 flex items-center justify-center">
                  <ImageIcon className="w-6 h-6" />
                </div>
                <div className="text-xs text-white/80">Albums</div>
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

            {/* story text editor overlay */}
            {mode === 'text' && (
              <div className="mx-auto max-w-md px-4 mt-4">
                <div
                  className={`rounded-2xl border border-white/10 p-4 ${
                    storyGradient === 'purpleBlue'
                      ? 'bg-gradient-to-br from-purple-500/40 to-sky-500/40'
                      : storyGradient === 'orangePink'
                      ? 'bg-gradient-to-br from-rose-500/40 to-orange-500/40'
                      : 'bg-gradient-to-br from-green-500/40 to-cyan-500/40'
                  }`}
                >
                  <div className="text-white/80 text-sm mb-2">write down your mood</div>
                  <textarea
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    placeholder="Type here..."
                    className="w-full min-h-[100px] rounded-xl bg-black/30 border border-white/10 p-3 text-white outline-none placeholder:text-white/40"
                  />
                  <div className="mt-3 flex gap-2">
                    {(['purpleBlue', 'orangePink', 'greenCyan'] as const).map((g) => (
                      <button
                        key={g}
                        onClick={() => setStoryGradient(g)}
                        className={`flex-1 py-2 rounded-xl border border-white/10 ${
                          storyGradient === g ? 'bg-white/20' : 'bg-black/20'
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* topic/challenge quick line */}
            <div className="mx-auto max-w-md px-4 mt-3">
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder={currentLang === 'ba' ? 'Kókó / Àfojúsùn...' : 'Topic / idea...'}
                className="w-full px-4 py-3 rounded-2xl bg-black/35 border border-white/10 text-white placeholder:text-white/40 outline-none"
              />
              <div className="mt-2 flex flex-wrap gap-2">
                {challenge && (
                  <span className="text-xs px-3 py-1 rounded-full bg-white/15 border border-white/10">
                    {challenge}
                  </span>
                )}
                {tags.slice(0, 6).map((t) => (
                  <span key={t} className="text-xs px-3 py-1 rounded-full bg-white/10 border border-white/10">
                    {t}
                  </span>
                ))}
              </div>
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
      />

      <DynamicAITemplates
        isOpen={magicOpen}
        onClose={() => setMagicOpen(false)}
        topic={topic || challenge || ' '}
        language={currentLang === 'ba' ? 'ba' : 'fr'}
        onApplyTemplate={onApplyTemplate}
        onGenerated={onGenerated}
      />

      {/* TIMER PANEL */}
      <AnimatePresence>
        {timerPanel && (
          <motion.div className="fixed inset-0 z-[95] bg-black/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setTimerPanel(false)}>
            <motion.div
              className="absolute bottom-0 left-0 right-0 rounded-t-3xl ios-glass-dark p-4"
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-white font-semibold text-lg mb-3">Timer</div>
              <div className="flex gap-2">
                {[0, 3, 10].map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      setTimerSeconds(t as 0 | 3 | 10);
                      setTimerPanel(false);
                    }}
                    className={`flex-1 py-3 rounded-2xl border border-white/10 ${timerSeconds === t ? 'bg-white text-black' : 'bg-white/10 text-white'}`}
                  >
                    {t === 0 ? 'Off' : `${t}s`}
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
          <motion.div className="fixed inset-0 z-[95] bg-black/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setSpeedPanel(false)}>
            <motion.div
              className="absolute bottom-0 left-0 right-0 rounded-t-3xl ios-glass-dark p-4"
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-white font-semibold text-lg mb-3">Speed</div>
              <div className="flex gap-2">
                {[0.5, 1, 2].map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setSpeed(s as 0.5 | 1 | 2);
                      setSpeedPanel(false);
                    }}
                    className={`flex-1 py-3 rounded-2xl border border-white/10 ${speed === s ? 'bg-white text-black' : 'bg-white/10 text-white'}`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
              <div className="text-xs text-white/60 mt-2">
                (Web) La vitesse agit sur l’aperçu. Pour “vrai timelapse”, fais-le au montage serveur.
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CHALLENGE PANEL */}
      <AnimatePresence>
        {challengePanel && (
          <motion.div className="fixed inset-0 z-[95] bg-black/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setChallengePanel(false)}>
            <motion.div
              className="absolute bottom-0 left-0 right-0 rounded-t-3xl ios-glass-dark p-4"
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-white font-semibold text-lg mb-3">challenge</div>
              <div className="flex flex-wrap gap-2">
                {CHALLENGES.map((c) => (
                  <button
                    key={c}
                    onClick={() => {
                      setChallenge(c);
                      setChallengePanel(false);
                    }}
                    className="px-4 py-2 rounded-full bg-white/10 border border-white/10"
                  >
                    {c}
                  </button>
                ))}
                <button
                  onClick={() => {
                    setChallenge('');
                    setChallengePanel(false);
                  }}
                  className="px-4 py-2 rounded-full bg-white/15 border border-white/10"
                >
                  Clear
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* INSPIRING PANEL */}
      <AnimatePresence>
        {inspiringPanel && (
          <motion.div className="fixed inset-0 z-[95] bg-black/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setInspiringPanel(false)}>
            <motion.div
              className="absolute bottom-0 left-0 right-0 rounded-t-3xl ios-glass-dark p-4"
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-white font-semibold text-lg mb-3">Inspiring</div>
              <div className="space-y-2">
                {INSPIRING.map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setTopic(s);
                      setInspiringPanel(false);
                      setMagicOpen(true); // open AI to generate hook/script quickly
                    }}
                    className="w-full text-left px-4 py-3 rounded-2xl bg-white/10 border border-white/10"
                  >
                    {s}
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
          <motion.div className="fixed inset-0 z-[95] bg-black/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setMusicPanel(false)}>
            <motion.div
              className="absolute bottom-0 left-0 right-0 rounded-t-3xl ios-glass-dark p-4"
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-white font-semibold text-lg mb-3">Music</div>
              <div className="space-y-2">
                {MUSIC_LIST.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      setMusic(m);
                      setMusicPanel(false);
                    }}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-white/10 border border-white/10"
                  >
                    <div className="flex items-center gap-2">
                      <Music className="w-4 h-4" />
                      <span>{m.title}</span>
                    </div>
                    <span className="text-white/60 text-xs">Select</span>
                  </button>
                ))}
                <button
                  onClick={() => {
                    setMusic(null);
                    setMusicPanel(false);
                  }}
                  className="w-full px-4 py-3 rounded-2xl bg-white/15 border border-white/10"
                >
                  Clear
                </button>
              </div>
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
              className="absolute bottom-0 left-0 right-0 rounded-t-3xl ios-glass-dark p-4 max-h-[75vh] overflow-hidden"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-5 h-5" />
                  <div className="font-semibold">LIVE Chat</div>
                  <div className="text-xs text-white/60">{liveViewers} viewers</div>
                </div>
                <button onClick={() => setLivePanelOpen(false)} className="px-3 py-2 rounded-xl bg-white/10">
                  Close
                </button>
              </div>

              <div className="rounded-2xl bg-black/30 border border-white/10 p-3 h-[42vh] overflow-y-auto space-y-2">
                {liveMessages.map((m) => (
                  <div key={m.id} className="text-sm">
                    <span className="text-white/70 text-xs mr-2">{m.display_name ?? 'viewer'}:</span>
                    <span className="text-white">{m.message}</span>
                  </div>
                ))}
                {!liveMessages.length && <div className="text-white/50 text-sm">No messages yet.</div>}
              </div>

              <div className="mt-3 flex gap-2">
                <input
                  value={liveInput}
                  onChange={(e) => setLiveInput(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-3 rounded-2xl bg-black/35 border border-white/10 outline-none"
                />
                <button
                  onClick={sendLive}
                  className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center"
                >
                  <Send className="w-5 h-5" />
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
