import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Mic,
  Video,
  Camera,
  ChevronRight,
  ArrowLeft,
  Loader2,
  RotateCcw,
  Sparkles,
  Music,
  Palette,
  Send,
  Filter,
  Lightbulb,
  Type,
  Trash2,
  Play,
  Pause,
  Sliders,
  ShieldCheck,
  Zap,
} from 'lucide-react';

import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';
import { useUnifiedAudio } from '@/hooks/useUnifiedAudio';
import { triggerFeedback } from '@/utils/tamtamFeedback';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

import { AnimatedBackground, BackgroundTheme } from './AnimatedBackground';
import { DynamicAITemplates } from './DynamicAITemplates';
import { MUSIC_LIBRARY, MusicTrack, getSuggestedMusic } from '@/data/musicLibrary';
import { VideoFiltersPanel, useVideoFilter, VideoFilter } from './VideoFilters';
import { Textarea } from '@/components/ui/textarea';

// ----------------- Helpers -----------------
const safeClearInterval = (ref: React.MutableRefObject<number | null>) => {
  if (ref.current != null) {
    window.clearInterval(ref.current);
    ref.current = null;
  }
};

const isProbablyIOS = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  // iPadOS can report as Mac
  (navigator.userAgent.includes('Mac') && 'ontouchend' in document);

const isProbablySafari = () => {
  const ua = navigator.userAgent.toLowerCase();
  // Safari present, but not chrome/edge/opera
  return ua.includes('safari') && !ua.includes('chrome') && !ua.includes('crios') && !ua.includes('edg') && !ua.includes('opr');
};

const canUseMediaRecorder = () => {
  return typeof window !== 'undefined' && 'MediaRecorder' in window && !!navigator.mediaDevices?.getUserMedia;
};

const getSupportedMimeType = (mediaType: 'audio' | 'video'): string => {
  // Let browser choose if unsure (best for Safari)
  if (!('MediaRecorder' in window)) return '';
  if (mediaType === 'audio') {
    if (MediaRecorder.isTypeSupported('audio/mp4')) return 'audio/mp4';
    if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) return 'audio/webm;codecs=opus';
    if (MediaRecorder.isTypeSupported('audio/webm')) return 'audio/webm';
    return '';
  } else {
    if (MediaRecorder.isTypeSupported('video/mp4')) return 'video/mp4';
    if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')) return 'video/webm;codecs=vp9,opus';
    if (MediaRecorder.isTypeSupported('video/webm')) return 'video/webm';
    return '';
  }
};

const getFileExtension = (mimeType: string): string => {
  const map: Record<string, string> = {
    'audio/mp4': 'm4a',
    'audio/webm': 'webm',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'image/jpeg': 'jpg',
    'image/png': 'png',
  };
  return map[mimeType] || 'bin';
};

const blobToBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onloadend = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(blob);
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

const DURATION_OPTIONS = [
  { label: '5 s', value: 5, type: 'video' as const },
  { label: '10 s', value: 10, type: 'video' as const },
  { label: '15 s', value: 15, type: 'video' as const },
  { label: '45 s', value: 45, type: 'video' as const },
  { label: '60 s', value: 60, type: 'video' as const },
  { label: 'PHOTO', value: 0, type: 'photo' as const },
  { label: 'TEXTE', value: 0, type: 'text' as const },
];

type CreatorMode = 'live' | 'publication' | 'create';
type Phase = 'template' | 'capture' | 'preview';

type Intent = 'informer' | 'expliquer' | 'vendre' | 'sensibiliser' | 'raconter';

const INTENTS: Array<{ id: Intent; label: string; icon: string; hint: string }> = [
  { id: 'informer', label: 'Informer', icon: '📰', hint: '1 fait + 1 action claire.' },
  { id: 'expliquer', label: 'Expliquer', icon: '🎓', hint: '1 idée → 1 exemple → 1 conclusion.' },
  { id: 'vendre', label: 'Vendre', icon: '🛒', hint: 'Problème → Solution → Contact.' },
  { id: 'sensibiliser', label: 'Sensibiliser', icon: '🚨', hint: 'Risque → Conseils → Appel à agir.' },
  { id: 'raconter', label: 'Raconter', icon: '📖', hint: 'Contexte → tournant → leçon.' },
];

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

type CapturedMedia = { blob: Blob; type: 'audio' | 'video' | 'photo'; mimeType?: string };

export const FullscreenCreator: React.FC<FullscreenCreatorProps> = ({ isOpen, onClose, onComplete }) => {
  const { currentLang } = useTamTamLanguage();
  const { transcribeWithTranslation } = useUnifiedAudio();
  const { toast } = useToast();

  const [phase, setPhase] = useState<Phase>('template');
  const [creatorMode, setCreatorMode] = useState<CreatorMode>('publication');
  const [captureType, setCaptureType] = useState<'video' | 'audio' | 'photo' | 'text'>('video');
  const [selectedDuration, setSelectedDuration] = useState(15);
  const [intent, setIntent] = useState<Intent>('informer');

  const [templates, setTemplates] = useState<CreationTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<CreationTemplate | null>(null);
  const [loadingTemplates, setLoadingTemplates] = useState(true);

  const [capturedMedia, setCapturedMedia] = useState<CapturedMedia[]>([]);
  const [textContent, setTextContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedBackground, setSelectedBackground] = useState<BackgroundTheme>('savanna');
  const [selectedMusic, setSelectedMusic] = useState<MusicTrack | null>(null);

  const [showAI, setShowAI] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);

  const [previewTranscriptFr, setPreviewTranscriptFr] = useState('');
  const [previewTranscriptBa, setPreviewTranscriptBa] = useState('');
  const [isGeneratingCaptions, setIsGeneratingCaptions] = useState(false);
  const [coachHintsOpen, setCoachHintsOpen] = useState(true);

  const [isFrontCamera, setIsFrontCamera] = useState(true);

  // ✅ Mode capture: "compat" évite MediaRecorder (anti-freeze)
  const defaultCompat = isProbablyIOS() || isProbablySafari() || !canUseMediaRecorder();
  const [captureEngine, setCaptureEngine] = useState<'compat' | 'advanced'>(defaultCompat ? 'compat' : 'advanced');

  const { currentFilter, setCurrentFilter, getFilterStyle } = useVideoFilter();

  // Refs: file inputs (Compat)
  const fileVideoRef = useRef<HTMLInputElement>(null);
  const fileAudioRef = useRef<HTMLInputElement>(null);
  const filePhotoRef = useRef<HTMLInputElement>(null);

  // Refs: preview URLs
  const previewUrlRef = useRef<string | null>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const previewAudioRef = useRef<HTMLAudioElement>(null);

  // (Optional) Advanced engine resources
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  const stopStream = () => {
    if (!streamRef.current) return;
    try {
      streamRef.current.getTracks().forEach((t) => t.stop());
    } catch {}
    streamRef.current = null;
  };

  const stopRecorder = () => {
    safeClearInterval(timerRef);
    try {
      if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
    } catch {}
    mediaRecorderRef.current = null;
  };

  // revoke object url when media changes
  useEffect(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    if (capturedMedia[0]) {
      previewUrlRef.current = URL.createObjectURL(capturedMedia[0].blob);
    }
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
    };
  }, [capturedMedia]);

  // Load templates when open
  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      setLoadingTemplates(true);
      try {
        const { data, error } = await supabase
          .from('tamtam_creation_templates')
          .select('*')
          .eq('is_active', true)
          .order('category', { ascending: true });
        if (error) throw error;

        const parsed = (data || []).map((t: any) => ({
          id: t.id,
          template_key: t.template_key,
          label_fr: t.label_fr,
          label_ba: t.label_ba,
          icon: t.icon,
          category: t.category,
          steps: Array.isArray(t.steps) ? t.steps : [],
          music_url: t.music_url,
        })) as CreationTemplate[];

        setTemplates(parsed);
      } catch (e) {
        console.error('[FullscreenCreator] loadTemplates error:', e);
        toast({ title: 'Erreur templates', description: 'Impossible de charger les templates.', variant: 'destructive' });
      } finally {
        setLoadingTemplates(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // suggested music
  useEffect(() => {
    if (!isOpen) return;
    const topic = intent === 'vendre' ? 'business' : intent === 'raconter' ? 'culture' : 'education';
    const suggestions = getSuggestedMusic({ topic });
    if (!selectedMusic && suggestions.length > 0) setSelectedMusic(suggestions[0]);
  }, [isOpen, intent, selectedMusic]);

  // Cleanup when close/unmount
  useEffect(() => {
    if (!isOpen) return;
    return () => {
      stopRecorder();
      stopStream();
      safeClearInterval(timerRef);
    };
  }, [isOpen]);

  const handleClose = () => {
    stopRecorder();
    stopStream();
    setCapturedMedia([]);
    setPhase('template');
    setSelectedTemplate(null);
    setPreviewTranscriptFr('');
    setPreviewTranscriptBa('');
    setTextContent('');
    setIsPreviewPlaying(false);
    setCoachHintsOpen(true);
    onClose();
  };

  const handleSelectTemplate = (template: CreationTemplate) => {
    setSelectedTemplate(template);
    const first = template.steps?.[0];
    if (first) {
      setCaptureType(first.type);
      setSelectedDuration(first.duration || 15);
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

  const flipCamera = () => {
    setIsFrontCamera((v) => !v);
    triggerFeedback('notification');
  };

  // ----------------- COMPAT CAPTURE (anti-freeze) -----------------
  const openCompatCapture = (type: 'video' | 'audio' | 'photo') => {
    if (type === 'video') fileVideoRef.current?.click();
    if (type === 'audio') fileAudioRef.current?.click();
    if (type === 'photo') filePhotoRef.current?.click();
  };

  const onFilePicked = (type: 'video' | 'audio' | 'photo') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;

    const mime = f.type || (type === 'photo' ? 'image/jpeg' : type === 'audio' ? 'audio/mp4' : 'video/mp4');
    setCapturedMedia([{ blob: f, type, mimeType: mime }]);
    setPhase('preview');
    triggerFeedback('success');
  };

  // ----------------- ADVANCED CAPTURE (MediaRecorder) -----------------
  const startAdvancedRecording = async () => {
    if (!canUseMediaRecorder()) {
      toast({ title: 'Non supporté', description: 'MediaRecorder indisponible. Utilise le mode Compatibilité.', variant: 'destructive' });
      setCaptureEngine('compat');
      return;
    }
    try {
      stopRecorder();
      stopStream();
      chunksRef.current = [];

      const isAudio = captureType === 'audio';
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: isAudio ? false : { facingMode: isFrontCamera ? 'user' : 'environment' },
      });

      streamRef.current = stream;

      const mime = getSupportedMimeType(isAudio ? 'audio' : 'video');
      const opts: MediaRecorderOptions = mime ? { mimeType: mime } : {};
      const rec = new MediaRecorder(stream, opts);

      rec.onerror = (ev) => {
        console.error('[MediaRecorder] onerror', ev);
        toast({ title: 'Erreur enregistrement', description: 'MediaRecorder a échoué. Passe en Compatibilité.', variant: 'destructive' });
        setCaptureEngine('compat');
        stopRecorder();
        stopStream();
      };

      rec.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data);
      };

      rec.onstop = () => {
        const finalMime = rec.mimeType || mime || (isAudio ? 'audio/webm' : 'video/webm');
        const blob = new Blob(chunksRef.current, { type: finalMime });
        setCapturedMedia([{ blob, type: isAudio ? 'audio' : 'video', mimeType: finalMime }]);
        stopStream();
        setPhase('preview');
      };

      mediaRecorderRef.current = rec;
      rec.start(500);

      // timer auto-stop (moins fréquent pour éviter charges)
      const durationMs = Math.max(1, selectedDuration) * 1000;
      safeClearInterval(timerRef);
      timerRef.current = window.setInterval(() => {
        // stop after duration
        try {
          if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
        } catch {}
        safeClearInterval(timerRef);
      }, durationMs);

      triggerFeedback('notification');
    } catch (e: any) {
      console.error('[FullscreenCreator] startAdvancedRecording error:', e);
      toast({
        title: 'Capture impossible',
        description: e?.message || 'Erreur getUserMedia/MediaRecorder. Passe en Compatibilité.',
        variant: 'destructive',
      });
      setCaptureEngine('compat');
      stopRecorder();
      stopStream();
    }
  };

  const stopAdvancedRecording = () => {
    try {
      if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
    } catch {}
    safeClearInterval(timerRef);
  };

  // ----------------- Captions preview -----------------
  const generateCaptionsPreview = async () => {
    const media = capturedMedia[0];
    if (!media || (media.type !== 'audio' && media.type !== 'video')) return;

    setIsGeneratingCaptions(true);
    triggerFeedback('notification');

    try {
      const base64 = await blobToBase64(media.blob);
      const result = await transcribeWithTranslation(base64, currentLang === 'ba' ? 'ba' : 'fr');
      setPreviewTranscriptFr(result.transcription_fr || result.transcription || '');
      setPreviewTranscriptBa(result.transcription_ba || '');
      triggerFeedback('success');
    } catch (e) {
      console.warn('[FullscreenCreator] captions error:', e);
      toast({ title: 'Sous-titres indisponibles', description: 'Impossible de générer les sous-titres.', variant: 'destructive' });
    } finally {
      setIsGeneratingCaptions(false);
    }
  };

  const playPreview = () => {
    const media = capturedMedia[0];
    if (!media) return;
    if (media.type === 'video') previewVideoRef.current?.play().catch(() => {});
    if (media.type === 'audio') previewAudioRef.current?.play().catch(() => {});
    setIsPreviewPlaying(true);
  };

  const pausePreview = () => {
    previewVideoRef.current?.pause();
    previewAudioRef.current?.pause();
    setIsPreviewPlaying(false);
  };

  const resetCapture = () => {
    pausePreview();
    setCapturedMedia([]);
    setPreviewTranscriptFr('');
    setPreviewTranscriptBa('');
    setPhase('capture');
  };

  const ensureAudioUrlForNonAudioPosts = async () => {
    const silent = createSilentWavBlob(700);
    return uploadToPublicUrl(`silent_${Date.now()}.wav`, silent, 'audio/wav');
  };

  const uploadToPublicUrl = async (fileName: string, blob: Blob, contentType: string) => {
    const { error: uploadError } = await supabase.storage.from('tamtam-audio').upload(fileName, blob, {
      contentType,
      upsert: false,
    });
    if (uploadError) throw uploadError;
    const { data: urlData } = supabase.storage.from('tamtam-audio').getPublicUrl(fileName);
    return urlData.publicUrl;
  };

  const handleSubmit = async () => {
    if (captureType === 'text' && !textContent.trim()) {
      toast({ title: 'Erreur', description: 'Texte vide.', variant: 'destructive' });
      return;
    }
    if (captureType !== 'text' && !capturedMedia[0]) {
      toast({ title: 'Erreur', description: 'Aucun média.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      let media_type: 'audio' | 'video' | 'photo' | 'text' = captureType;
      let audio_url = '';
      let media_url: string | undefined;
      let transcript_fr: string | undefined;
      let transcript_ba: string | undefined;

      if (captureType === 'text') {
        transcript_fr = textContent;
        audio_url = await ensureAudioUrlForNonAudioPosts();
      } else {
        const main = capturedMedia[0];
        const mimeType = main.mimeType || (main.type === 'photo' ? 'image/jpeg' : main.type === 'audio' ? 'audio/mp4' : 'video/mp4');
        const ext = getFileExtension(mimeType);
        const fileName = `creator_${creatorMode}_${intent}_${Date.now()}.${ext}`;
        const uploadedUrl = await uploadToPublicUrl(fileName, main.blob, mimeType);

        if (main.type === 'audio') {
          media_type = 'audio';
          audio_url = uploadedUrl;
        } else if (main.type === 'video') {
          media_type = 'video';
          media_url = uploadedUrl;
          audio_url = await ensureAudioUrlForNonAudioPosts();
        } else {
          media_type = 'photo';
          media_url = uploadedUrl;
          audio_url = await ensureAudioUrlForNonAudioPosts();
        }

        if (main.type === 'audio' || main.type === 'video') {
          try {
            const base64 = await blobToBase64(main.blob);
            const result = await transcribeWithTranslation(base64, currentLang === 'ba' ? 'ba' : 'fr');
            transcript_fr = result.transcription_fr || result.transcription || '';
            transcript_ba = result.transcription_ba || '';
          } catch {}
        } else {
          transcript_fr = previewTranscriptFr || undefined;
          transcript_ba = previewTranscriptBa || undefined;
        }
      }

      const topic = selectedTemplate?.label_fr || INTENTS.find((i) => i.id === intent)?.label || creatorMode;

      await onComplete({
        audio_url,
        media_type,
        media_url,
        transcript_fr,
        transcript_ba,
        template_id: selectedTemplate?.id || `direct_${captureType}_${intent}`,
        topic,
        duration_seconds: selectedDuration || (captureType === 'photo' || captureType === 'text' ? 5 : 15),
        text_content: captureType === 'text' ? textContent : undefined,
      });

      toast({ title: '✅ Publié !' });
      handleClose();
    } catch (e: any) {
      console.error('[FullscreenCreator] submit error:', e);
      toast({ title: 'Erreur publication', description: e?.message || 'Impossible de publier.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  // ----------------- TEMPLATE PHASE -----------------
  if (phase === 'template') {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 bg-gradient-to-b from-amber-700/90 via-amber-800/95 to-amber-900">
        <div className="absolute top-0 left-0 right-0 z-20 safe-area-top">
          <div className="flex items-center justify-between p-4">
            <button onClick={handleClose} className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
              <X className="w-6 h-6 text-white" />
            </button>
            <h2 className="text-white text-lg font-semibold">Créer</h2>
            <div className="w-10" />
          </div>
        </div>

        <div className="absolute top-20 left-0 right-0 z-10 px-4">
          <p className="text-white/80 text-center text-sm">Choisis un template (ou crée librement)</p>
        </div>

        <div className="absolute inset-0 pt-28 pb-24 px-4 overflow-y-auto">
          {loadingTemplates ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {templates.map((t) => (
                <motion.button
                  key={t.id}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleSelectTemplate(t)}
                  className="aspect-[4/3] rounded-2xl bg-amber-600/50 backdrop-blur-sm border border-amber-500/30 flex flex-col items-center justify-center gap-2 p-4 hover:bg-amber-600/70 transition-colors"
                >
                  <span className="text-4xl">{t.icon}</span>
                  <span className="text-white font-medium text-sm text-center">{t.label_fr}</span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/50 text-white text-xs">{(t.steps?.length || 1)} étape</span>
                </motion.button>
              ))}
            </div>
          )}
        </div>

        <div className="absolute bottom-0 left-0 right-0 z-20 safe-area-bottom">
          <div className="flex justify-center py-6">
            <motion.button whileTap={{ scale: 0.95 }} onClick={handleSkipTemplate} className="px-6 py-3 rounded-full bg-white/20 backdrop-blur-sm text-white font-medium flex items-center gap-2">
              <span>Créer librement</span>
              <ChevronRight className="w-5 h-5" />
            </motion.button>
          </div>
        </div>
      </motion.div>
    );
  }

  // ----------------- CAPTURE PHASE -----------------
  if (phase === 'capture') {
    const intentMeta = INTENTS.find((i) => i.id === intent);

    const startCapture = () => {
      if (captureType === 'text') return;

      if (captureEngine === 'compat') {
        if (captureType === 'video') return openCompatCapture('video');
        if (captureType === 'audio') return openCompatCapture('audio');
        if (captureType === 'photo') return openCompatCapture('photo');
      } else {
        // advanced
        if (captureType === 'photo') return openCompatCapture('photo'); // photo: toujours compat (stable)
        return startAdvancedRecording();
      }
    };

    const stopCapture = () => {
      if (captureEngine === 'advanced') stopAdvancedRecording();
    };

    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 bg-gradient-to-b from-gray-400 via-gray-500 to-gray-600">
        {/* hidden file inputs for compat capture */}
        <input ref={fileVideoRef} type="file" accept="video/*" capture={isFrontCamera ? 'user' : 'environment'} className="hidden" onChange={onFilePicked('video')} />
        <input ref={fileAudioRef} type="file" accept="audio/*" capture="microphone" className="hidden" onChange={onFilePicked('audio')} />
        <input ref={filePhotoRef} type="file" accept="image/*" capture={isFrontCamera ? 'user' : 'environment'} className="hidden" onChange={onFilePicked('photo')} />

        {/* Background (no live camera to avoid freeze) */}
        <AnimatedBackground theme={selectedBackground} intensity={0.35}>
          <div className="absolute inset-0" />
        </AnimatedBackground>

        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-20 safe-area-top">
          <div className="flex items-center justify-between p-4">
            <button onClick={() => setPhase('template')} className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
              <ArrowLeft className="w-6 h-6 text-white" />
            </button>

            {selectedTemplate ? (
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/90 backdrop-blur-sm">
                <span className="text-xl">{selectedTemplate.icon}</span>
                <span className="text-gray-800 text-sm font-medium">{selectedTemplate.label_fr}</span>
              </div>
            ) : (
              <div className="px-3 py-2 rounded-full bg-black/40 backdrop-blur-sm text-white text-xs flex items-center gap-2">
                <span className="text-base">{intentMeta?.icon}</span>
                <span className="font-semibold">{intentMeta?.label}</span>
              </div>
            )}

            {(captureType === 'video' || captureType === 'photo') ? (
              <button onClick={flipCamera} className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
                <RotateCcw className="w-5 h-5 text-white" />
              </button>
            ) : (
              <div className="w-10" />
            )}
          </div>
        </div>

        {/* Coach */}
        <AnimatePresence>
          {coachHintsOpen && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="absolute top-20 left-0 right-0 z-20 px-4">
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-3 mx-auto max-w-md shadow-lg">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center">
                    <Lightbulb className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-900 font-semibold text-sm">Coach IA</p>
                    <p className="text-gray-700 text-sm mt-1">{intentMeta?.hint}</p>
                    <p className="text-gray-500 text-xs mt-1">
                      Mode capture: {captureEngine === 'compat' ? 'Compatibilité (stable)' : 'Avancé (MediaRecorder)'}
                    </p>
                  </div>
                  <button onClick={() => setCoachHintsOpen(false)} className="p-1 rounded-lg hover:bg-black/5">
                    <X className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Engine toggle (important for debug) */}
        <div className="absolute top-36 left-0 right-0 z-20 px-4">
          <div className="mx-auto max-w-md rounded-2xl bg-black/30 backdrop-blur-sm p-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-white text-sm">
              {captureEngine === 'compat' ? <ShieldCheck className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
              <span className="font-semibold">{captureEngine === 'compat' ? 'Compatibilité (recommandé)' : 'Avancé'}</span>
            </div>
            <button
              onClick={() => {
                const next = captureEngine === 'compat' ? 'advanced' : 'compat';
                if (next === 'advanced' && !canUseMediaRecorder()) {
                  toast({ title: 'Avancé indisponible', description: 'MediaRecorder non supporté ici.', variant: 'destructive' });
                  return;
                }
                setCaptureEngine(next);
              }}
              className="px-3 py-1.5 rounded-xl bg-white/15 text-white text-xs font-semibold"
            >
              Basculer
            </button>
          </div>
        </div>

        {/* Text mode */}
        {captureType === 'text' && (
          <div className="absolute inset-0 flex items-center justify-center px-6 z-10">
            <div className="w-full max-w-md">
              <Textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="Écrivez votre message..."
                className="min-h-[220px] text-xl bg-white/90 backdrop-blur-sm border-0 rounded-2xl p-6 resize-none"
                maxLength={650}
              />
              <p className="text-white/70 text-sm text-right mt-2">{textContent.length}/650</p>
            </div>
          </div>
        )}

        {/* Duration selector */}
        <div className="absolute bottom-36 left-0 right-0 z-20">
          <div className="flex items-center justify-center gap-3 px-4 overflow-x-auto scrollbar-hide">
            {DURATION_OPTIONS.map((opt) => (
              <button
                key={opt.label}
                onClick={() => {
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
                  setCaptureType('video');
                  setSelectedDuration(opt.value);
                }}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  (opt.type === captureType && (opt.type !== 'video' || opt.value === selectedDuration))
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
              onClick={() => {
                if (!textContent.trim()) {
                  toast({ title: 'Texte requis', description: 'Écrivez quelque chose.', variant: 'destructive' });
                  return;
                }
                setPhase('preview');
              }}
              className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-xl"
            >
              <Send className="w-8 h-8 text-blue-500" />
            </motion.button>
          ) : (
            <motion.button whileTap={{ scale: 0.9 }} onClick={startCapture} className="w-20 h-20 rounded-full bg-red-500 flex items-center justify-center shadow-xl">
              {captureType === 'audio' ? <Mic className="w-9 h-9 text-white" /> : captureType === 'photo' ? <Camera className="w-9 h-9 text-white" /> : <Video className="w-9 h-9 text-white" />}
            </motion.button>
          )}

          {captureEngine === 'advanced' && (captureType === 'video' || captureType === 'audio') && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={stopCapture}
              className="ml-3 w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-xl"
              title="Stop (Avancé)"
            >
              <div className="w-7 h-7 rounded-md bg-red-500" />
            </motion.button>
          )}
        </div>

        {/* Side quick buttons */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-4">
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowFilters(true)} className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center" title="Filtres">
            <Filter className="w-5 h-5 text-white" />
          </motion.button>
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowAI(true)} className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex flex-col items-center justify-center" title="IA">
            <Sparkles className="w-5 h-5 text-white" />
            <span className="text-white text-[10px] mt-0.5">IA</span>
          </motion.button>
        </div>

        {/* Bottom mode toggle */}
        <div className="absolute bottom-2 left-0 right-0 z-20 safe-area-bottom">
          <div className="flex justify-center gap-2 px-4 pb-4">
            {(['live', 'publication', 'create'] as CreatorMode[]).map((m) => {
              const active = creatorMode === m;
              return (
                <button
                  key={m}
                  onClick={() => setCreatorMode(m)}
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

        <AnimatePresence>
          {showFilters && (
            <VideoFiltersPanel
              isOpen={showFilters}
              onClose={() => setShowFilters(false)}
              onSelectFilter={(f: VideoFilter) => setCurrentFilter(f)}
              currentFilter={currentFilter}
              videoElement={null}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showAI && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-40 bg-black/55" onClick={() => setShowAI(false)}>
              <motion.div
                initial={{ y: '12%', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: '12%', opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="absolute left-0 right-0 bottom-0 bg-white rounded-t-3xl p-4 pb-6"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-r from-violet-500 to-pink-500 flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">IA de création</p>
                      <p className="text-xs text-gray-500">Script, hook, hashtags…</p>
                    </div>
                  </div>
                  <button onClick={() => setShowAI(false)} className="w-9 h-9 rounded-full bg-black/5 flex items-center justify-center">
                    <X className="w-5 h-5 text-gray-700" />
                  </button>
                </div>

                <DynamicAITemplates
                  topic={selectedTemplate?.label_fr || INTENTS.find((i) => i.id === intent)?.label || 'tamtam'}
                  templateKey={selectedTemplate?.template_key || `direct_${intent}`}
                  isSheet={true}
                  onClose={() => setShowAI(false)}
                  onSelectContent={(_, content) => {
                    if (!previewTranscriptFr) setPreviewTranscriptFr(content);
                    toast({ title: '✅ Contenu IA appliqué' });
                  }}
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }

  // ----------------- PREVIEW PHASE -----------------
  const media = capturedMedia[0];
  const realPreviewUrl = previewUrlRef.current || '';
  const canGenerateCaptions = media && (media.type === 'audio' || media.type === 'video');

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 bg-black">
      <AnimatedBackground theme={selectedBackground} intensity={0.25}>
        <div className="absolute inset-0">
          {captureType === 'video' && media?.type === 'video' ? (
            <video
              ref={previewVideoRef}
              src={realPreviewUrl}
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
              style={getFilterStyle(currentFilter, currentFilter?.intensity ?? 100)}
              onEnded={() => setIsPreviewPlaying(false)}
              onPause={() => setIsPreviewPlaying(false)}
              controls={false}
            />
          ) : captureType === 'audio' && media?.type === 'audio' ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-52 h-52 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
                <div className="w-36 h-36 rounded-full bg-white/15 flex items-center justify-center">
                  <Mic className="w-16 h-16 text-white" />
                </div>
              </div>
              <audio ref={previewAudioRef} src={realPreviewUrl} onEnded={() => setIsPreviewPlaying(false)} onPause={() => setIsPreviewPlaying(false)} />
            </div>
          ) : captureType === 'photo' && media?.type === 'photo' ? (
            <img src={realPreviewUrl} alt="Captured" className="absolute inset-0 w-full h-full object-cover" style={getFilterStyle(currentFilter, currentFilter?.intensity ?? 100)} />
          ) : captureType === 'text' ? (
            <div className="absolute inset-0 flex items-center justify-center px-6">
              <div className="w-full max-w-xl rounded-3xl bg-white/90 backdrop-blur-sm p-6">
                <p className="text-gray-900 text-xl whitespace-pre-wrap leading-relaxed">{textContent}</p>
              </div>
            </div>
          ) : null}
        </div>

        <div className="absolute top-0 left-0 right-0 z-20 safe-area-top">
          <div className="flex items-center justify-between p-4">
            <button onClick={handleClose} className="w-10 h-10 rounded-full bg-black/35 backdrop-blur-sm flex items-center justify-center">
              <X className="w-6 h-6 text-white" />
            </button>
            <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-black/35 backdrop-blur-sm">
              <span className="text-white text-xs font-semibold">{selectedTemplate?.label_fr || INTENTS.find((i) => i.id === intent)?.label || 'Création'}</span>
            </div>
            <button onClick={() => setShowAI(true)} className="w-10 h-10 rounded-full bg-black/35 backdrop-blur-sm flex items-center justify-center" title="IA">
              <Sparkles className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {(previewTranscriptFr || previewTranscriptBa) && (
          <div className="absolute bottom-36 left-0 right-0 z-20 px-4">
            <div className="mx-auto max-w-xl rounded-2xl bg-black/45 backdrop-blur-sm p-3">
              <p className="text-white text-sm leading-relaxed">
                {(currentLang === 'ba' ? previewTranscriptBa : previewTranscriptFr) || previewTranscriptFr || previewTranscriptBa}
              </p>
            </div>
          </div>
        )}

        {(captureType === 'video' || captureType === 'audio') && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 z-20">
            <motion.button whileTap={{ scale: 0.92 }} onClick={() => (isPreviewPlaying ? pausePreview() : playPreview())} className="w-12 h-12 rounded-full bg-black/35 backdrop-blur-sm flex items-center justify-center">
              {isPreviewPlaying ? <Pause className="w-5 h-5 text-white" /> : <Play className="w-5 h-5 text-white" />}
            </motion.button>
          </div>
        )}

        <div className="absolute right-4 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-4">
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowFilters(true)} className="w-12 h-12 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center" title="Filtres">
            <Filter className="w-5 h-5 text-white" />
          </motion.button>
          <motion.button whileTap={{ scale: 0.9 }} onClick={resetCapture} className="w-12 h-12 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center" title="Reprendre">
            <Sliders className="w-5 h-5 text-white" />
          </motion.button>
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => { setCapturedMedia([]); toast({ title: '🗑️ Média supprimé' }); }} className="w-12 h-12 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center" title="Supprimer">
            <Trash2 className="w-5 h-5 text-white" />
          </motion.button>
        </div>

        {canGenerateCaptions && (
          <div className="absolute bottom-24 left-0 right-0 z-20 px-4">
            <div className="mx-auto max-w-xl flex gap-2">
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={generateCaptionsPreview}
                disabled={isGeneratingCaptions}
                className="flex-1 py-3 rounded-2xl bg-white/90 backdrop-blur-sm text-gray-900 font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {isGeneratingCaptions ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Génération…</span>
                  </>
                ) : (
                  <>
                    <Type className="w-4 h-4" />
                    <span>Sous-titres</span>
                  </>
                )}
              </motion.button>
              <motion.button whileTap={{ scale: 0.98 }} onClick={() => setShowAI(true)} className="px-4 py-3 rounded-2xl bg-gradient-to-r from-violet-500 to-pink-500 text-white font-semibold flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4" />
                <span>IA</span>
              </motion.button>
            </div>
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 z-20 pb-8 pt-4 safe-area-bottom">
          <div className="mx-3 p-4 rounded-2xl bg-white/95 backdrop-blur-sm shadow-xl flex flex-col gap-3">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-blue-500 via-violet-500 to-pink-500 text-white font-semibold text-lg flex items-center justify-center gap-3 shadow-lg disabled:opacity-70"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Publication...</span>
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  <span>Publier</span>
                </>
              )}
            </motion.button>
          </div>
        </div>

        <AnimatePresence>
          {showFilters && (
            <VideoFiltersPanel
              isOpen={showFilters}
              onClose={() => setShowFilters(false)}
              onSelectFilter={(f: VideoFilter) => setCurrentFilter(f)}
              currentFilter={currentFilter}
              videoElement={previewVideoRef.current}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showAI && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-40 bg-black/55" onClick={() => setShowAI(false)}>
              <motion.div
                initial={{ y: '12%', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: '12%', opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="absolute left-0 right-0 bottom-0 bg-white rounded-t-3xl p-4 pb-6"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-r from-violet-500 to-pink-500 flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">IA de création</p>
                      <p className="text-xs text-gray-500">Script, hook, hashtags…</p>
                    </div>
                  </div>
                  <button onClick={() => setShowAI(false)} className="w-9 h-9 rounded-full bg-black/5 flex items-center justify-center">
                    <X className="w-5 h-5 text-gray-700" />
                  </button>
                </div>

                <DynamicAITemplates
                  topic={selectedTemplate?.label_fr || INTENTS.find((i) => i.id === intent)?.label || 'tamtam'}
                  templateKey={selectedTemplate?.template_key || `direct_${intent}`}
                  isSheet={true}
                  onClose={() => setShowAI(false)}
                  onSelectContent={(_, content) => {
                    if (!previewTranscriptFr) setPreviewTranscriptFr(content);
                    toast({ title: '✅ Contenu IA appliqué' });
                  }}
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </AnimatedBackground>
    </motion.div>
  );
};

export default FullscreenCreator;
