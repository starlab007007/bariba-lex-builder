import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Mic,
  Video,
  Camera,
  Check,
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

// ============= Cross-browser MIME type detection =============
const getSupportedMimeType = (mediaType: 'audio' | 'video'): string => {
  if (mediaType === 'audio') {
    if (MediaRecorder.isTypeSupported('audio/mp4')) return 'audio/mp4';
    if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) return 'audio/webm;codecs=opus';
    if (MediaRecorder.isTypeSupported('audio/webm')) return 'audio/webm';
    if (MediaRecorder.isTypeSupported('audio/ogg')) return 'audio/ogg';
    return '';
  } else {
    if (MediaRecorder.isTypeSupported('video/mp4')) return 'video/mp4';
    if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')) return 'video/webm;codecs=vp9,opus';
    if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) return 'video/webm;codecs=vp9';
    if (MediaRecorder.isTypeSupported('video/webm')) return 'video/webm';
    return '';
  }
};

const getFileExtension = (mimeType: string): string => {
  const map: Record<string, string> = {
    'audio/mp4': 'm4a',
    'audio/webm': 'webm',
    'audio/webm;codecs=opus': 'webm',
    'audio/ogg': 'ogg',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/webm;codecs=vp9': 'webm',
    'video/webm;codecs=vp9,opus': 'webm',
    'image/jpeg': 'jpg',
  };
  return map[mimeType] || 'webm';
};

// Duration options
const DURATION_OPTIONS = [
  { label: '5 s', value: 5, type: 'video' as const },
  { label: '10 s', value: 10, type: 'video' as const },
  { label: '15 s', value: 15, type: 'video' as const },
  { label: '45 s', value: 45, type: 'video' as const },
  { label: '60 s', value: 60, type: 'video' as const },
  { label: 'PHOTO', value: 0, type: 'photo' as const },
  { label: 'TEXTE', value: 0, type: 'text' as const },
];

// Creator modes
type CreatorMode = 'live' | 'publication' | 'create';

// Phase
type Phase = 'template' | 'capture' | 'preview';

// Intention (édition par intention)
type Intent =
  | 'informer'
  | 'expliquer'
  | 'vendre'
  | 'sensibiliser'
  | 'raconter';

const INTENTS: Array<{
  id: Intent;
  label: string;
  icon: string;
  hint: string;
}> = [
  { id: 'informer', label: 'Informer', icon: '📰', hint: 'Donne 1 fait + 1 action claire.' },
  { id: 'expliquer', label: 'Expliquer', icon: '🎓', hint: '1 idée → 1 exemple → 1 conclusion.' },
  { id: 'vendre', label: 'Vendre', icon: '🛒', hint: 'Problème → Solution → Prix/Contact.' },
  { id: 'sensibiliser', label: 'Sensibiliser', icon: '🚨', hint: 'Risque → Conseils → Appel à agir.' },
  { id: 'raconter', label: 'Raconter', icon: '📖', hint: 'Contexte → tournant → leçon.' },
];

// Template interface from DB
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

const safeClearInterval = (ref: React.MutableRefObject<number | null>) => {
  if (ref.current) {
    window.clearInterval(ref.current);
    ref.current = null;
  }
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
  view.setUint32(16, 16, true); // PCM
  view.setUint16(20, 1, true); // audio format
  view.setUint16(22, 1, true); // channels
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);
  // PCM samples are already 0 (silence)
  return new Blob([buffer], { type: 'audio/wav' });
};

export const FullscreenCreator: React.FC<FullscreenCreatorProps> = ({
  isOpen,
  onClose,
  onComplete,
}) => {
  const { currentLang } = useTamTamLanguage();
  const { transcribeWithTranslation } = useUnifiedAudio();
  const { toast } = useToast();

  // Phases
  const [phase, setPhase] = useState<Phase>('template');

  // Modes / capture
  const [creatorMode, setCreatorMode] = useState<CreatorMode>('publication');
  const [captureType, setCaptureType] = useState<'video' | 'audio' | 'photo' | 'text'>('video');
  const [selectedDuration, setSelectedDuration] = useState(15);

  // Intention
  const [intent, setIntent] = useState<Intent>('informer');

  // Templates
  const [templates, setTemplates] = useState<CreationTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<CreationTemplate | null>(null);
  const [loadingTemplates, setLoadingTemplates] = useState(true);

  // Recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordingProgress, setRecordingProgress] = useState(0);
  const [capturedMedia, setCapturedMedia] = useState<CapturedMedia[]>([]);
  const [textContent, setTextContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Customization
  const [selectedBackground, setSelectedBackground] = useState<BackgroundTheme>('savanna');
  const [selectedMusic, setSelectedMusic] = useState<MusicTrack | null>(null);
  const [showBackgrounds, setShowBackgrounds] = useState(false);
  const [showMusic, setShowMusic] = useState(false);
  const [showAI, setShowAI] = useState(false);

  // Preview / IA
  const [showFilters, setShowFilters] = useState(false);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [previewTranscriptFr, setPreviewTranscriptFr] = useState<string>('');
  const [previewTranscriptBa, setPreviewTranscriptBa] = useState<string>('');
  const [isGeneratingCaptions, setIsGeneratingCaptions] = useState(false);
  const [coachHintsOpen, setCoachHintsOpen] = useState(true);

  // Camera
  const [isFrontCamera, setIsFrontCamera] = useState(true);

  // Video filter hook
  const { currentFilter, setCurrentFilter, getFilterStyle } = useVideoFilter();

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const previewAudioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bgAudioRef = useRef<HTMLAudioElement | null>(null);

  const previewUrl = useMemo(() => {
    if (!capturedMedia[0]) return '';
    return URL.createObjectURL(capturedMedia[0].blob);
  }, [capturedMedia]);

  // Cleanup preview object URL
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // Load templates when open
  useEffect(() => {
    if (!isOpen) return;
    loadTemplates();
  }, [isOpen]);

  // Suggested music (based on intent)
  useEffect(() => {
    if (!isOpen) return;
    const topic = intent === 'vendre' ? 'business' : intent === 'raconter' ? 'culture' : 'education';
    const suggestions = getSuggestedMusic({ topic });
    if (!selectedMusic && suggestions.length > 0) setSelectedMusic(suggestions[0]);
  }, [isOpen, intent, selectedMusic]);

  // Init camera on capture if needed
  useEffect(() => {
    if (!isOpen) return;

    if (phase === 'capture' && (captureType === 'video' || captureType === 'photo')) {
      initCamera();
    }

    return () => {
      if (!isOpen) {
        stopStream();
        safeClearInterval(timerRef);
        stopBgMusic();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, phase, captureType]);

  const loadTemplates = async () => {
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
    } catch (err) {
      console.error('[FullscreenCreator] Load templates error:', err);
      toast({
        title: 'Erreur templates',
        description: "Impossible de charger les templates de création.",
        variant: 'destructive',
      });
    } finally {
      setLoadingTemplates(false);
    }
  };

  const stopBgMusic = () => {
    if (bgAudioRef.current) {
      try {
        bgAudioRef.current.pause();
      } catch {}
      bgAudioRef.current = null;
    }
  };

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const initCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: isFrontCamera ? 'user' : 'environment' },
        audio: captureType !== 'photo',
      });
      streamRef.current = stream;
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.error('[FullscreenCreator] Camera error:', err);
      toast({
        title: 'Permission requise',
        description: "Autorisez l'accès au micro et à la caméra.",
        variant: 'destructive',
      });
    }
  };

  const flipCamera = async () => {
    stopStream();
    setIsFrontCamera((v) => !v);
    window.setTimeout(() => initCamera(), 120);
  };

  const handleClose = () => {
    stopStream();
    safeClearInterval(timerRef);
    stopBgMusic();

    setCapturedMedia([]);
    setPhase('template');
    setSelectedTemplate(null);
    setIsRecording(false);
    setRecordingProgress(0);
    setShowBackgrounds(false);
    setShowMusic(false);
    setShowAI(false);
    setShowFilters(false);
    setTextContent('');
    setPreviewTranscriptFr('');
    setPreviewTranscriptBa('');
    setIsPreviewPlaying(false);
    setCoachHintsOpen(true);

    onClose();
  };

  const handleSelectTemplate = (template: CreationTemplate) => {
    setSelectedTemplate(template);

    // Simple: 1er step uniquement (sinon, UX et concat nécessaires)
    const firstStep = template.steps?.[0];
    if (firstStep) {
      setCaptureType(firstStep.type);
      setSelectedDuration(firstStep.duration || 15);
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

  const handleDurationSelect = (option: typeof DURATION_OPTIONS[number]) => {
    if (option.type === 'photo') {
      setCaptureType('photo');
      setSelectedDuration(0);
      return;
    }
    if (option.type === 'text') {
      setCaptureType('text');
      setSelectedDuration(0);
      return;
    }
    setCaptureType('video');
    setSelectedDuration(option.value);
  };

  const takePhoto = () => {
    if (!videoPreviewRef.current || !canvasRef.current) return;

    const video = videoPreviewRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 720;
    canvas.height = video.videoHeight || 1280;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (isFrontCamera) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    // Appliquer filtre CSS sur canvas via ctx.filter (approx)
    // NB: ce n'est pas identique à CSS mais très proche pour les filtres simples.
    ctx.filter = (currentFilter?.cssFilter && currentFilter.cssFilter !== 'none') ? currentFilter.cssFilter : 'none';
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        setCapturedMedia([{ blob, type: 'photo', mimeType: 'image/jpeg' }]);
        setPhase('preview');
        triggerFeedback('success');
      },
      'image/jpeg',
      0.9
    );
  };

  const startRecording = async () => {
    try {
      const isAudio = captureType === 'audio';

      const constraints: MediaStreamConstraints = {
        audio: true,
        video: !isAudio ? { facingMode: isFrontCamera ? 'user' : 'environment' } : false,
      };

      if (!streamRef.current) {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;
        if (videoPreviewRef.current && !isAudio) {
          videoPreviewRef.current.srcObject = stream;
        }
      }

      const mimeType = getSupportedMimeType(isAudio ? 'audio' : 'video');
      const options: MediaRecorderOptions = {};
      if (mimeType) options.mimeType = mimeType;

      const recorder = new MediaRecorder(streamRef.current, options);
      const actualMimeType = recorder.mimeType || mimeType || (isAudio ? 'audio/webm' : 'video/webm');

      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: actualMimeType });
        setCapturedMedia([{ blob, type: isAudio ? 'audio' : 'video', mimeType: actualMimeType }]);
        setPhase('preview');
      };

      mediaRecorderRef.current = recorder;
      recorder.start(800);
      setIsRecording(true);
      setRecordingProgress(0);

      // Background music while recording (faible volume)
      stopBgMusic();
      if (selectedMusic?.url) {
        const a = new Audio(selectedMusic.url);
        a.volume = 0.25;
        bgAudioRef.current = a;
        a.play().catch(() => {});
      }

      // Progress timer
      const durationMs = Math.max(1, selectedDuration) * 1000;
      const interval = 100;
      let elapsed = 0;

      safeClearInterval(timerRef);
      timerRef.current = window.setInterval(() => {
        elapsed += interval;
        const pct = Math.min(100, (elapsed / durationMs) * 100);
        setRecordingProgress(pct);
        if (elapsed >= durationMs) stopRecording();
      }, interval);

      triggerFeedback('notification');
    } catch (err: any) {
      console.error('[FullscreenCreator] Recording error:', err);
      toast({
        title: 'Erreur enregistrement',
        description: err?.message || "Impossible d'enregistrer.",
        variant: 'destructive',
      });
    }
  };

  const stopRecording = () => {
    safeClearInterval(timerRef);
    stopBgMusic();

    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setRecordingProgress(100);
    triggerFeedback('success');
  };

  const handleTextSubmit = () => {
    if (!textContent.trim()) {
      toast({ title: 'Texte requis', description: 'Écrivez quelque chose.', variant: 'destructive' });
      return;
    }
    setPhase('preview');
  };

  const ensureAudioUrlForNonAudioPosts = async () => {
    // Votre feed exige un audio_url jouable → on met un WAV silencieux
    const silent = createSilentWavBlob(700);
    return uploadToPublicUrl(`silent_${Date.now()}.wav`, silent, 'audio/wav');
  };

  const uploadToPublicUrl = async (fileName: string, blob: Blob, contentType: string) => {
    const { error: uploadError } = await supabase.storage
      .from('tamtam-audio')
      .upload(fileName, blob, { contentType, upsert: false });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage.from('tamtam-audio').getPublicUrl(fileName);
    return urlData.publicUrl;
  };

  const generateCaptionsPreview = async () => {
    const media = capturedMedia[0];
    if (!media || (media.type !== 'audio' && media.type !== 'video')) return;

    setIsGeneratingCaptions(true);
    triggerFeedback('notification');

    try {
      const base64 = await blobToBase64(media.blob);
      const result = await transcribeWithTranslation(base64, currentLang === 'ba' ? 'ba' : 'fr');

      const fr = result.transcription_fr || result.transcription || '';
      const ba = result.transcription_ba || '';

      setPreviewTranscriptFr(fr);
      setPreviewTranscriptBa(ba);
      triggerFeedback('success');
    } catch (e) {
      console.warn('[FullscreenCreator] Preview transcription failed:', e);
      toast({
        title: 'Sous-titres indisponibles',
        description: "Impossible de générer les sous-titres pour l’instant.",
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingCaptions(false);
    }
  };

  const playPreview = () => {
    const media = capturedMedia[0];
    if (!media) return;

    if (media.type === 'video' && previewVideoRef.current) {
      previewVideoRef.current.play().catch(() => {});
      setIsPreviewPlaying(true);
    } else if (media.type === 'audio' && previewAudioRef.current) {
      previewAudioRef.current.play().catch(() => {});
      setIsPreviewPlaying(true);
    }
  };

  const pausePreview = () => {
    if (previewVideoRef.current) previewVideoRef.current.pause();
    if (previewAudioRef.current) previewAudioRef.current.pause();
    setIsPreviewPlaying(false);
  };

  const resetCapture = () => {
    pausePreview();
    setCapturedMedia([]);
    setPreviewTranscriptFr('');
    setPreviewTranscriptBa('');
    setPhase('capture');
    triggerFeedback('notification');
  };

  const removeCurrentMedia = () => {
    pausePreview();
    setCapturedMedia([]);
    setPreviewTranscriptFr('');
    setPreviewTranscriptBa('');
    toast({ title: '🗑️ Média supprimé' });
  };

  const handleSubmit = async () => {
    if (captureType === 'text' && !textContent.trim()) {
      toast({ title: 'Erreur', description: 'Aucun contenu.', variant: 'destructive' });
      return;
    }
    if (captureType !== 'text' && capturedMedia.length === 0) {
      toast({ title: 'Erreur', description: 'Aucun média capturé.', variant: 'destructive' });
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
        const mimeType =
          main.mimeType ||
          (main.type === 'video'
            ? 'video/webm'
            : main.type === 'photo'
              ? 'image/jpeg'
              : 'audio/webm');

        const ext = getFileExtension(mimeType);
        const fileName = `creator_${creatorMode}_${intent}_${Date.now()}.${ext}`;
        const uploadedUrl = await uploadToPublicUrl(fileName, main.blob, mimeType);

        if (main.type === 'video') {
          media_type = 'video';
          media_url = uploadedUrl;
          // audio_url doit rester un vrai audio jouable
          audio_url = await ensureAudioUrlForNonAudioPosts();
        } else if (main.type === 'audio') {
          media_type = 'audio';
          audio_url = uploadedUrl;
        } else if (main.type === 'photo') {
          media_type = 'photo';
          media_url = uploadedUrl;
          audio_url = await ensureAudioUrlForNonAudioPosts();
        }

        // Transcription (audio/video)
        if (main.type === 'audio' || main.type === 'video') {
          try {
            const base64 = await blobToBase64(main.blob);
            const result = await transcribeWithTranslation(base64, currentLang === 'ba' ? 'ba' : 'fr');
            transcript_fr = result.transcription_fr || result.transcription || '';
            transcript_ba = result.transcription_ba || '';
          } catch (e) {
            console.warn('[FullscreenCreator] Transcription failed:', e);
          }
        } else {
          // photo: si on a déjà un texte (captions preview), on l’envoie
          transcript_fr = previewTranscriptFr || undefined;
          transcript_ba = previewTranscriptBa || undefined;
        }
      }

      const topic =
        selectedTemplate?.label_fr ||
        INTENTS.find((i) => i.id === intent)?.label ||
        creatorMode;

      await onComplete({
        audio_url,
        media_type,
        media_url,
        transcript_fr,
        transcript_ba,
        template_id: selectedTemplate?.id || `direct_${captureType}_${intent}`,
        topic,
        duration_seconds:
          selectedDuration || (captureType === 'photo' || captureType === 'text' ? 5 : 15),
        text_content: captureType === 'text' ? textContent : undefined,
      });

      toast({ title: '✅ Publié !' });
      handleClose();
    } catch (err: any) {
      console.error('[FullscreenCreator] Submit error:', err);
      toast({
        title: 'Erreur de publication',
        description: err?.message || 'Impossible de publier.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ===== Guard
  if (!isOpen) return null;

  // ===== TEMPLATE PHASE
  if (phase === 'template') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-50 bg-gradient-to-b from-amber-700/90 via-amber-800/95 to-amber-900"
      >
        <div className="absolute top-0 left-0 right-0 z-20 safe-area-top">
          <div className="flex items-center justify-between p-4">
            <button
              onClick={handleClose}
              className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center"
            >
              <X className="w-6 h-6 text-white" />
            </button>
            <h2 className="text-white text-lg font-semibold">Créer</h2>
            <div className="w-10" />
          </div>
        </div>

        <div className="absolute top-20 left-0 right-0 z-10 px-4">
          <p className="text-white/80 text-center text-sm">
            Choisis un template (ou crée librement)
          </p>
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
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/50 text-white text-xs">
                    {(t.steps?.length || 1)} étape
                  </span>
                </motion.button>
              ))}
            </div>
          )}
        </div>

        <div className="absolute bottom-0 left-0 right-0 z-20 safe-area-bottom">
          <div className="flex justify-center py-6">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleSkipTemplate}
              className="px-6 py-3 rounded-full bg-white/20 backdrop-blur-sm text-white font-medium flex items-center gap-2"
            >
              <span>Créer librement</span>
              <ChevronRight className="w-5 h-5" />
            </motion.button>
          </div>
        </div>
      </motion.div>
    );
  }

  // ===== CAPTURE PHASE
  if (phase === 'capture') {
    const intentMeta = INTENTS.find((i) => i.id === intent);

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-50 bg-gradient-to-b from-gray-400 via-gray-500 to-gray-600"
      >
        <canvas ref={canvasRef} className="hidden" />

        {/* Background */}
        {captureType === 'audio' || captureType === 'text' ? (
          <AnimatedBackground theme={selectedBackground} intensity={0.4}>
            <div className="absolute inset-0" />
          </AnimatedBackground>
        ) : (
          <video
            ref={videoPreviewRef}
            autoPlay
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
            style={{
              transform: isFrontCamera ? 'scaleX(-1)' : 'none',
              ...getFilterStyle(currentFilter, currentFilter?.intensity ?? 100),
            }}
          />
        )}

        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-20 safe-area-top">
          <div className="flex items-center justify-between p-4">
            <button
              onClick={() => setPhase('template')}
              className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center"
            >
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
              <button
                onClick={flipCamera}
                className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center"
              >
                <RotateCcw className="w-5 h-5 text-white" />
              </button>
            ) : (
              <div className="w-10" />
            )}
          </div>
        </div>

        {/* Coach hint (pré-record) */}
        <AnimatePresence>
          {coachHintsOpen && !isRecording && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="absolute top-20 left-0 right-0 z-20 px-4"
            >
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-3 mx-auto max-w-md shadow-lg">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center">
                    <Lightbulb className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-900 font-semibold text-sm">
                      Coach IA (rapide)
                    </p>
                    <p className="text-gray-700 text-sm mt-1">
                      {intentMeta?.hint}
                    </p>
                    <p className="text-gray-500 text-xs mt-1">
                      Conseil: 15–45s, voix claire, 1 idée principale.
                    </p>
                  </div>
                  <button
                    onClick={() => setCoachHintsOpen(false)}
                    className="p-1 rounded-lg hover:bg-black/5"
                  >
                    <X className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Template step (si template) */}
        {selectedTemplate?.steps?.[0] && (
          <div className="absolute top-36 left-0 right-0 z-20 px-4">
            <div className="bg-white/90 backdrop-blur-sm rounded-xl p-3 mx-auto max-w-sm">
              <p className="text-gray-800 text-sm font-medium text-center">
                {selectedTemplate.steps[0].instruction_fr}
              </p>
              <p className="text-gray-500 text-xs text-center mt-1">
                {selectedTemplate.steps[0].type === 'video' ? '🎥 Vidéo' : '🎙 Audio'} • {selectedTemplate.steps[0].duration}s
              </p>
            </div>
          </div>
        )}

        {/* Recording timer */}
        {isRecording && (
          <div className="absolute top-24 left-1/2 -translate-x-1/2 z-20">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/90 backdrop-blur-sm">
              <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span className="text-white text-sm font-medium">
                {Math.floor((recordingProgress / 100) * selectedDuration)}s / {selectedDuration}s
              </span>
            </div>
          </div>
        )}

        {/* Intention chips (création par intention) */}
        {!selectedTemplate && (
          <div className="absolute bottom-56 left-0 right-0 z-20 px-4">
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {INTENTS.map((it) => {
                const active = it.id === intent;
                return (
                  <motion.button
                    key={it.id}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIntent(it.id)}
                    className={`flex-shrink-0 px-4 py-2 rounded-xl backdrop-blur-sm shadow-sm border transition-colors ${
                      active
                        ? 'bg-white text-gray-900 border-white'
                        : 'bg-white/85 text-gray-700 border-white/40'
                    }`}
                  >
                    <span className="mr-2">{it.icon}</span>
                    <span className="text-xs font-semibold whitespace-nowrap">{it.label}</span>
                  </motion.button>
                );
              })}
            </div>
          </div>
        )}

        {/* Text input mode */}
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

        {/* Side controls */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-4">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowBackgrounds(true)}
            className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center"
            title="Fond"
          >
            <Palette className="w-5 h-5 text-white" />
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowMusic(true)}
            className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center"
            title="Musique"
          >
            <Music className="w-5 h-5 text-white" />
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowFilters(true)}
            className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center"
            title="Filtres"
          >
            <Filter className="w-5 h-5 text-white" />
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowAI(true)}
            className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex flex-col items-center justify-center"
            title="IA"
          >
            <Sparkles className="w-5 h-5 text-white" />
            <span className="text-white text-[10px] mt-0.5">IA</span>
          </motion.button>
        </div>

        {/* Duration selector */}
        <div className="absolute bottom-36 left-0 right-0 z-20">
          <div className="flex items-center justify-center gap-3 px-4 overflow-x-auto scrollbar-hide">
            {DURATION_OPTIONS.map((opt) => (
              <button
                key={opt.label}
                onClick={() => handleDurationSelect(opt)}
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
              className="w-20 h-20 rounded-full bg-red-500 flex items-center justify-center shadow-xl"
            >
              {captureType === 'audio' ? (
                <Mic className="w-9 h-9 text-white" />
              ) : (
                <Video className="w-9 h-9 text-white" />
              )}
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

        {/* Modals */}
        <AnimatePresence>
          {showFilters && (
            <VideoFiltersPanel
              isOpen={showFilters}
              onClose={() => setShowFilters(false)}
              onSelectFilter={(f: VideoFilter) => setCurrentFilter(f)}
              currentFilter={currentFilter}
              videoElement={videoPreviewRef.current}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showAI && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-40 bg-black/55"
              onClick={() => setShowAI(false)}
            >
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
                      <p className="text-xs text-gray-500">Scripts, hooks, hashtags, idées…</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowAI(false)}
                    className="w-9 h-9 rounded-full bg-black/5 flex items-center justify-center"
                  >
                    <X className="w-5 h-5 text-gray-700" />
                  </button>
                </div>

                <DynamicAITemplates
                  topic={selectedTemplate?.label_fr || INTENTS.find((i) => i.id === intent)?.label || 'tamtam'}
                  templateKey={selectedTemplate?.template_key || `direct_${intent}`}
                  isSheet={true}
                  onClose={() => setShowAI(false)}
                  onSelectContent={() => {
                    toast({ title: '✅ Contenu IA prêt', description: 'Vous le verrez en preview (sous-titres/texte).' });
                  }}
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showMusic && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-40 bg-black/55"
              onClick={() => setShowMusic(false)}
            >
              <motion.div
                initial={{ y: '12%', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: '12%', opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="absolute left-0 right-0 bottom-0 bg-white rounded-t-3xl p-4 pb-6"
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-gray-900">Choisir une musique</p>
                  <button
                    onClick={() => setShowMusic(false)}
                    className="w-9 h-9 rounded-full bg-black/5 flex items-center justify-center"
                  >
                    <X className="w-5 h-5 text-gray-700" />
                  </button>
                </div>

                <div className="mt-3 max-h-[50vh] overflow-y-auto">
                  <div className="grid grid-cols-1 gap-2">
                    {MUSIC_LIBRARY.map((track) => {
                      const active = selectedMusic?.id === track.id;
                      return (
                        <button
                          key={track.id}
                          onClick={() => {
                            setSelectedMusic(track);
                            triggerFeedback('success');
                          }}
                          className={`w-full p-3 rounded-2xl border flex items-center justify-between ${
                            active ? 'border-violet-500 bg-violet-50' : 'border-gray-200 bg-white'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-pink-500 flex items-center justify-center">
                              <Music className="w-5 h-5 text-white" />
                            </div>
                            <div className="text-left">
                              <p className="font-semibold text-gray-900">{track.name}</p>
                              <p className="text-xs text-gray-500">{track.mood || 'Ambiance'}</p>
                            </div>
                          </div>
                          {active && (
                            <div className="w-7 h-7 rounded-full bg-violet-500 flex items-center justify-center">
                              <Check className="w-4 h-4 text-white" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showBackgrounds && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-40 bg-black/55"
              onClick={() => setShowBackgrounds(false)}
            >
              <motion.div
                initial={{ y: '12%', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: '12%', opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="absolute left-0 right-0 bottom-0 bg-white rounded-t-3xl p-4 pb-6"
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-gray-900">Choisir un fond</p>
                  <button
                    onClick={() => setShowBackgrounds(false)}
                    className="w-9 h-9 rounded-full bg-black/5 flex items-center justify-center"
                  >
                    <X className="w-5 h-5 text-gray-700" />
                  </button>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  {(['savanna', 'ocean', 'forest', 'city', 'sunset', 'night'] as BackgroundTheme[]).map((t) => {
                    const active = selectedBackground === t;
                    return (
                      <button
                        key={t}
                        onClick={() => {
                          setSelectedBackground(t);
                          triggerFeedback('success');
                        }}
                        className={`p-3 rounded-2xl border text-left ${
                          active ? 'border-amber-500 bg-amber-50' : 'border-gray-200 bg-white'
                        }`}
                      >
                        <p className="font-semibold text-gray-900 capitalize">{t}</p>
                        <p className="text-xs text-gray-500">Ambiance</p>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }

  // ===== PREVIEW PHASE
  const media = capturedMedia[0];
  const canGenerateCaptions = media && (media.type === 'audio' || media.type === 'video');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 bg-black"
    >
      {/* Background */}
      <AnimatedBackground theme={selectedBackground} intensity={0.25}>
        {/* Media */}
        <div className="absolute inset-0">
          {captureType === 'video' && media?.type === 'video' ? (
            <video
              ref={previewVideoRef}
              src={previewUrl}
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
              style={getFilterStyle(currentFilter, currentFilter?.intensity ?? 100)}
              onEnded={() => setIsPreviewPlaying(false)}
              onPause={() => setIsPreviewPlaying(false)}
            />
          ) : captureType === 'audio' && media?.type === 'audio' ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-52 h-52 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
                <div className="w-36 h-36 rounded-full bg-white/15 flex items-center justify-center">
                  <Mic className="w-16 h-16 text-white" />
                </div>
              </div>
              <audio
                ref={previewAudioRef}
                src={previewUrl}
                onEnded={() => setIsPreviewPlaying(false)}
                onPause={() => setIsPreviewPlaying(false)}
              />
            </div>
          ) : captureType === 'photo' && media?.type === 'photo' ? (
            <img
              src={previewUrl}
              alt="Captured"
              className="absolute inset-0 w-full h-full object-cover"
              style={getFilterStyle(currentFilter, currentFilter?.intensity ?? 100)}
            />
          ) : captureType === 'text' ? (
            <div className="absolute inset-0 flex items-center justify-center px-6">
              <div className="w-full max-w-xl rounded-3xl bg-white/90 backdrop-blur-sm p-6">
                <p className="text-gray-900 text-xl whitespace-pre-wrap leading-relaxed">
                  {textContent}
                </p>
              </div>
            </div>
          ) : null}
        </div>

        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-20 safe-area-top">
          <div className="flex items-center justify-between p-4">
            <button
              onClick={handleClose}
              className="w-10 h-10 rounded-full bg-black/35 backdrop-blur-sm flex items-center justify-center"
            >
              <X className="w-6 h-6 text-white" />
            </button>

            <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-black/35 backdrop-blur-sm">
              <span className="text-white text-xs font-semibold">
                {selectedTemplate?.label_fr || INTENTS.find((i) => i.id === intent)?.label || 'Création'}
              </span>
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

        {/* Subtitle / captions overlay (light) */}
        {(previewTranscriptFr || previewTranscriptBa) && (
          <div className="absolute bottom-36 left-0 right-0 z-20 px-4">
            <div className="mx-auto max-w-xl rounded-2xl bg-black/45 backdrop-blur-sm p-3">
              <p className="text-white text-sm leading-relaxed">
                {(currentLang === 'ba' ? previewTranscriptBa : previewTranscriptFr) || previewTranscriptFr || previewTranscriptBa}
              </p>
            </div>
          </div>
        )}

        {/* Preview controls */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-4">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowFilters(true)}
            className="w-12 h-12 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center"
            title="Filtres"
          >
            <Filter className="w-5 h-5 text-white" />
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={resetCapture}
            className="w-12 h-12 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center"
            title="Reprendre"
          >
            <Sliders className="w-5 h-5 text-white" />
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={removeCurrentMedia}
            className="w-12 h-12 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center"
            title="Supprimer"
          >
            <Trash2 className="w-5 h-5 text-white" />
          </motion.button>
        </div>

        {/* Play/Pause */}
        {(captureType === 'video' || captureType === 'audio') && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 z-20">
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={() => (isPreviewPlaying ? pausePreview() : playPreview())}
              className="w-12 h-12 rounded-full bg-black/35 backdrop-blur-sm flex items-center justify-center"
            >
              {isPreviewPlaying ? (
                <Pause className="w-5 h-5 text-white" />
              ) : (
                <Play className="w-5 h-5 text-white" />
              )}
            </motion.button>
          </div>
        )}

        {/* Caption generation */}
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
                    <span>Génération sous-titres…</span>
                  </>
                ) : (
                  <>
                    <Type className="w-4 h-4" />
                    <span>Sous-titres intelligents</span>
                  </>
                )}
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowAI(true)}
                className="px-4 py-3 rounded-2xl bg-gradient-to-r from-violet-500 to-pink-500 text-white font-semibold flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>IA</span>
              </motion.button>
            </div>
          </div>
        )}

        {/* Bottom Action Bar */}
        <div className="absolute bottom-0 left-0 right-0 z-20 pb-8 pt-4 safe-area-bottom">
          <div className="mx-3 p-4 rounded-2xl bg-white/95 backdrop-blur-sm shadow-xl flex flex-col gap-3">
            {/* Info */}
            <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-violet-500 flex items-center justify-center">
                {captureType === 'video' ? (
                  <Video className="w-6 h-6 text-white" />
                ) : captureType === 'audio' ? (
                  <Mic className="w-6 h-6 text-white" />
                ) : captureType === 'photo' ? (
                  <Camera className="w-6 h-6 text-white" />
                ) : (
                  <Type className="w-6 h-6 text-white" />
                )}
              </div>

              <div className="flex-1">
                <p className="text-gray-800 font-semibold capitalize">
                  {captureType} • {INTENTS.find((i) => i.id === intent)?.label}
                </p>
                <p className="text-gray-500 text-sm">
                  {captureType === 'text'
                    ? `${textContent.length} caractères`
                    : captureType === 'photo'
                      ? 'Photo'
                      : `${selectedDuration}s`}
                </p>
              </div>

              <div className="px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold">
                {creatorMode === 'live' ? 'LIVE' : creatorMode === 'publication' ? 'PUB' : 'CRÉER'}
              </div>
            </div>

            {/* Publish button */}
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

        {/* Overlays */}
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
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-40 bg-black/55"
              onClick={() => setShowAI(false)}
            >
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
                      <p className="text-xs text-gray-500">Script, hook, hashtags, idées…</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowAI(false)}
                    className="w-9 h-9 rounded-full bg-black/5 flex items-center justify-center"
                  >
                    <X className="w-5 h-5 text-gray-700" />
                  </button>
                </div>

                <DynamicAITemplates
                  topic={selectedTemplate?.label_fr || INTENTS.find((i) => i.id === intent)?.label || 'tamtam'}
                  templateKey={selectedTemplate?.template_key || `direct_${intent}`}
                  isSheet={true}
                  onClose={() => setShowAI(false)}
                  onSelectContent={(_, content) => {
                    // On met ça dans le transcript preview (utile pour texte/photo)
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
