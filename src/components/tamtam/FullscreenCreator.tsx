import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { 
  X, Mic, Video, Camera, Check, ChevronRight, ChevronLeft, 
  Volume2, Pause, Play, Loader2, RotateCcw, Sparkles, 
  Hash, Lightbulb, Music, Palette, ArrowLeft, Send, Sliders,
  Filter, Edit3, Trash2, SkipBack, SkipForward, Users, Type, Image
} from 'lucide-react';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';
import { useFrenchTTS } from '@/hooks/useFrenchTTS';
import { useBaribaTTS } from '@/hooks/useBaribaTTS';
import { useUnifiedAudio } from '@/hooks/useUnifiedAudio';
import { triggerFeedback } from '@/utils/tamtamFeedback';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AnimatedBackground, BackgroundTheme } from './AnimatedBackground';
import { DynamicAITemplates } from './DynamicAITemplates';
import { MUSIC_LIBRARY, MusicTrack, getSuggestedMusic } from '@/data/musicLibrary';
import { VideoFiltersPanel, VIDEO_FILTERS, VideoFilter, useVideoFilter } from './VideoFilters';
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
    'video/webm;codecs=vp9,opus': 'webm'
  };
  return map[mimeType] || 'webm';
};

// Duration options
const DURATION_OPTIONS = [
  { label: '5 s', value: 5, type: 'video' },
  { label: '10 s', value: 10, type: 'video' },
  { label: '15 s', value: 15, type: 'video' },
  { label: '60 s', value: 60, type: 'video' },
  { label: '10 min', value: 600, type: 'video' },
  { label: 'PHOTO', value: 0, type: 'photo' },
  { label: 'TEXTE', value: 0, type: 'text' },
];

// Creator modes
type CreatorMode = 'live' | 'publication' | 'create';

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

type Phase = 'capture' | 'preview';

export const FullscreenCreator: React.FC<FullscreenCreatorProps> = ({
  isOpen,
  onClose,
  onComplete
}) => {
  const { currentLang } = useTamTamLanguage();
  const { speak: speakFrench, isSpeaking: isSpeakingFr } = useFrenchTTS();
  const { speak: speakBariba, isSpeaking: isSpeakingBa } = useBaribaTTS();
  const { transcribeWithTranslation } = useUnifiedAudio();
  const { toast } = useToast();

  // Core states
  const [phase, setPhase] = useState<Phase>('capture');
  const [creatorMode, setCreatorMode] = useState<CreatorMode>('publication');
  const [selectedDuration, setSelectedDuration] = useState(15);
  const [captureType, setCaptureType] = useState<'video' | 'audio' | 'photo' | 'text'>('video');
  
  // Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingProgress, setRecordingProgress] = useState(0);
  const [capturedMedia, setCapturedMedia] = useState<{ blob: Blob; type: string; mimeType?: string }[]>([]);
  const [textContent, setTextContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Customization states
  const [selectedBackground, setSelectedBackground] = useState<BackgroundTheme>('savanna');
  const [selectedMusic, setSelectedMusic] = useState<MusicTrack | null>(null);
  const [showBackgrounds, setShowBackgrounds] = useState(false);
  const [showMusic, setShowMusic] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [aiContent, setAiContent] = useState<{ type: string; content: string } | null>(null);
  
  // Preview states
  const [showFilters, setShowFilters] = useState(false);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [previewProgress, setPreviewProgress] = useState(0);
  
  // Video filter hook
  const { currentFilter, setCurrentFilter, getFilterStyle } = useVideoFilter();

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const previewAudioRef = useRef<HTMLAudioElement>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Initialize camera when in capture phase
  useEffect(() => {
    if (isOpen && phase === 'capture' && (captureType === 'video' || captureType === 'photo')) {
      initCamera();
    }
    return () => {
      if (!isOpen) {
        stopStream();
        if (timerRef.current) clearInterval(timerRef.current);
      }
    };
  }, [isOpen, phase, captureType]);

  // Music suggestion
  useEffect(() => {
    if (isOpen && !selectedMusic) {
      const suggestions = getSuggestedMusic({ topic: 'culture' });
      if (suggestions.length > 0) {
        setSelectedMusic(suggestions[0]);
      }
    }
  }, [isOpen]);

  const initCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: isFrontCamera ? 'user' : 'environment' },
        audio: captureType !== 'photo'
      });
      streamRef.current = stream;
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.error('[FullscreenCreator] Camera error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        toast({
          title: "🎤 Permission requise",
          description: "Autorisez l'accès au micro et à la caméra",
          variant: "destructive"
        });
      } else if (err.name === 'NotFoundError') {
        toast({
          title: "📷 Appareil non trouvé",
          description: "Aucun micro/caméra détecté",
          variant: "destructive"
        });
      } else if (err.name === 'NotReadableError') {
        toast({
          title: "⚠️ Appareil occupé",
          description: "Le micro/caméra est utilisé par une autre app",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Erreur",
          description: err.message || "Impossible d'accéder à la caméra",
          variant: "destructive"
        });
      }
    }
  };

  const flipCamera = async () => {
    stopStream();
    setIsFrontCamera(!isFrontCamera);
    setTimeout(initCamera, 100);
  };

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const takePhoto = () => {
    if (!videoPreviewRef.current || !canvasRef.current) return;
    
    const video = videoPreviewRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      if (isFrontCamera) {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0);
      
      canvas.toBlob((blob) => {
        if (blob) {
          setCapturedMedia([{ blob, type: 'photo', mimeType: 'image/jpeg' }]);
          setPhase('preview');
          triggerFeedback('success');
        }
      }, 'image/jpeg', 0.9);
    }
  };

  const startRecording = async () => {
    try {
      const isAudio = captureType === 'audio';
      
      const constraints: MediaStreamConstraints = {
        audio: true,
        video: !isAudio ? { facingMode: isFrontCamera ? 'user' : 'environment' } : false
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
      
      console.log('[FullscreenCreator] Recording with mimeType:', mimeType || 'default');

      const mediaRecorder = new MediaRecorder(streamRef.current, options);
      const actualMimeType = mediaRecorder.mimeType || mimeType;
      
      chunksRef.current = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: actualMimeType });
        setCapturedMedia([{ blob, type: isAudio ? 'audio' : 'video', mimeType: actualMimeType }]);
        setPhase('preview');
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000);
      setIsRecording(true);
      setRecordingProgress(0);
      
      // Play background music
      if (selectedMusic?.url) {
        audioRef.current = new Audio(selectedMusic.url);
        audioRef.current.volume = 0.3;
        audioRef.current.play().catch(() => {});
      }
      
      // Progress timer
      const duration = selectedDuration * 1000;
      const interval = 100;
      let elapsed = 0;
      
      timerRef.current = setInterval(() => {
        elapsed += interval;
        setRecordingProgress((elapsed / duration) * 100);
        if (elapsed >= duration) stopRecording();
      }, interval);

      triggerFeedback('notification');
    } catch (err: any) {
      console.error('[FullscreenCreator] Recording error:', err);
      
      if (err.name === 'NotSupportedError') {
        toast({ 
          title: "Format non supporté", 
          description: "Essayez Chrome ou Safari", 
          variant: "destructive" 
        });
      } else if (err.name === 'NotAllowedError') {
        toast({ 
          title: "Permission refusée", 
          description: "Autorisez l'accès au micro", 
          variant: "destructive" 
        });
      } else {
        toast({ 
          title: "Erreur", 
          description: err.message || "Impossible d'enregistrer", 
          variant: "destructive" 
        });
      }
    }
  };

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setRecordingProgress(100);
    triggerFeedback('success');
  };

  const handleTextSubmit = () => {
    if (!textContent.trim()) {
      toast({ title: "Texte requis", description: "Écrivez quelque chose", variant: "destructive" });
      return;
    }
    setPhase('preview');
  };

  const createSilentWavBlob = (durationMs = 600, sampleRate = 44100) => {
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

  const uploadToPublicUrl = async (fileName: string, blob: Blob, contentType: string) => {
    const { error: uploadError } = await supabase.storage
      .from('tamtam-audio')
      .upload(fileName, blob, { contentType, upsert: false });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage.from('tamtam-audio').getPublicUrl(fileName);
    return urlData.publicUrl;
  };

  const handleSubmit = async () => {
    if (captureType === 'text' && !textContent.trim()) {
      toast({ title: "Erreur", description: "Aucun contenu", variant: "destructive" });
      return;
    }
    if (captureType !== 'text' && capturedMedia.length === 0) {
      toast({ title: "Erreur", description: "Aucun média capturé", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);

    try {
      let media_type: 'audio' | 'video' | 'photo' | 'text' = captureType;
      let audio_url = '';
      let media_url: string | undefined;
      let transcript_fr: string | undefined;
      let transcript_ba: string | undefined;

      // For text/photo: we still need a real audio file (the feed always plays audio_url)
      const ensureAudioUrlForNonAudioPosts = async () => {
        if (audio_url) return;
        const silent = createSilentWavBlob(700);
        audio_url = await uploadToPublicUrl(`silent_${Date.now()}.wav`, silent, 'audio/wav');
      };

      if (captureType === 'text') {
        transcript_fr = textContent;
        await ensureAudioUrlForNonAudioPosts();
      } else {
        const mainMedia = capturedMedia[0];
        const mimeType =
          mainMedia.mimeType ||
          (mainMedia.type === 'video'
            ? 'video/webm'
            : mainMedia.type === 'photo'
              ? 'image/jpeg'
              : 'audio/webm');

        const extension = mainMedia.type === 'photo' ? 'jpg' : getFileExtension(mimeType);
        const fileName = `creator_${creatorMode}_${Date.now()}.${extension}`;

        const uploadedUrl = await uploadToPublicUrl(fileName, mainMedia.blob, mimeType);

        if (mainMedia.type === 'video') {
          media_type = 'video';
          media_url = uploadedUrl;
          audio_url = uploadedUrl; // audio track is inside the video
        } else if (mainMedia.type === 'audio') {
          media_type = 'audio';
          audio_url = uploadedUrl;
        } else if (mainMedia.type === 'photo') {
          media_type = 'photo';
          media_url = uploadedUrl;
          await ensureAudioUrlForNonAudioPosts();
        }

        // Transcribe audio/video only
        if (mainMedia.type === 'audio' || mainMedia.type === 'video') {
          try {
            const base64 = await blobToBase64(mainMedia.blob);
            const result = await transcribeWithTranslation(base64, currentLang === 'ba' ? 'ba' : 'fr');
            transcript_fr = result.transcription_fr || result.transcription;
            transcript_ba = result.transcription_ba;
          } catch (e) {
            console.warn('[FullscreenCreator] Transcription failed:', e);
          }
        }
      }

      await onComplete({
        audio_url,
        media_type,
        media_url,
        transcript_fr,
        transcript_ba,
        template_id: `direct_${captureType}`,
        topic: creatorMode,
        duration_seconds: selectedDuration || (captureType === 'photo' || captureType === 'text' ? 5 : 15),
        text_content: captureType === 'text' ? textContent : undefined
      });

      toast({ title: "✅ Publié !" });
      handleClose();
    } catch (err: any) {
      console.error('[FullscreenCreator] Submit error:', err);
      toast({ title: "Erreur de publication", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const handleClose = () => {
    stopStream();
    if (timerRef.current) clearInterval(timerRef.current);
    if (audioRef.current) audioRef.current.pause();
    setCapturedMedia([]);
    setPhase('capture');
    setIsRecording(false);
    setShowBackgrounds(false);
    setShowMusic(false);
    setShowAI(false);
    setTextContent('');
    setAiContent(null);
    onClose();
  };

  const handleDurationSelect = (option: typeof DURATION_OPTIONS[0]) => {
    if (option.type === 'photo') {
      setCaptureType('photo');
      setSelectedDuration(0);
    } else if (option.type === 'text') {
      setCaptureType('text');
      setSelectedDuration(0);
    } else {
      setCaptureType('video');
      setSelectedDuration(option.value);
    }
  };

  const getPreviewUrl = (media: { blob: Blob }) => URL.createObjectURL(media.blob);

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

  if (!isOpen) return null;

  // CAPTURE PHASE
  if (phase === 'capture') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-50 bg-gradient-to-b from-gray-400 via-gray-500 to-gray-600"
      >
        <canvas ref={canvasRef} className="hidden" />
        
        {/* Background when no camera */}
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
            style={{ transform: isFrontCamera ? 'scaleX(-1)' : 'none' }}
          />
        )}

        {/* TOP HEADER */}
        <div className="absolute top-0 left-0 right-0 z-20 safe-area-top">
          <div className="flex items-center justify-between p-4">
            <button 
              onClick={handleClose} 
              className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center"
            >
              <X className="w-6 h-6 text-white" />
            </button>
            
            <button 
              onClick={() => setShowMusic(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/50 backdrop-blur-sm"
            >
              <Music className="w-4 h-4 text-white" />
              <span className="text-white text-sm font-medium">
                {selectedMusic?.name || 'Ajouter un son'}
              </span>
            </button>

            {(captureType === 'video' || captureType === 'photo') && (
              <button 
                onClick={flipCamera} 
                className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center"
              >
                <RotateCcw className="w-5 h-5 text-white" />
              </button>
            )}
            
            {captureType === 'audio' && <div className="w-10" />}
          </div>
        </div>

        {/* Recording Timer */}
        {isRecording && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/90 backdrop-blur-sm">
              <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span className="text-white text-sm font-medium">
                {Math.floor(recordingProgress / 100 * selectedDuration)}s / {selectedDuration}s
              </span>
            </div>
          </div>
        )}

        {/* Step dots indicator */}
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-20 flex gap-2">
          {[0, 1, 2].map((_, idx) => (
            <div
              key={idx}
              className={`w-2 h-2 rounded-full transition-all ${
                idx === 0 ? 'bg-white w-6' : 'bg-white/40'
              }`}
            />
          ))}
        </div>

        {/* Audio visualization */}
        {captureType === 'audio' && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <motion.div
              animate={isRecording ? { scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] } : {}}
              transition={{ repeat: Infinity, duration: 1.2 }}
              className="w-36 h-36 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center"
            >
              <div className="w-24 h-24 rounded-full bg-white/25 flex items-center justify-center">
                <Mic className={`w-12 h-12 ${isRecording ? 'text-red-400' : 'text-white'}`} />
              </div>
            </motion.div>
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
                className="min-h-[200px] text-xl bg-white/90 backdrop-blur-sm border-0 rounded-2xl p-6 resize-none"
                maxLength={500}
              />
              <p className="text-white/70 text-sm text-right mt-2">{textContent.length}/500</p>
            </div>
          </div>
        )}

        {/* RIGHT SIDE CONTROLS */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-4">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowBackgrounds(true)}
            className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex flex-col items-center justify-center"
          >
            <Palette className="w-5 h-5 text-white" />
          </motion.button>
          
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowMusic(true)}
            className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex flex-col items-center justify-center"
          >
            <Music className="w-5 h-5 text-white" />
          </motion.button>
          
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowAI(true)}
            className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex flex-col items-center justify-center"
          >
            <Sparkles className="w-5 h-5 text-white" />
            <span className="text-white text-[10px] mt-0.5">IA</span>
          </motion.button>
          
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowAI(true)}
            className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex flex-col items-center justify-center"
          >
            <Lightbulb className="w-5 h-5 text-white" />
          </motion.button>
        </div>

        {/* AI TEMPLATES ROW */}
        <div className="absolute bottom-52 left-0 right-0 z-20 px-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {[
              { icon: '✨', label: 'Script IA' },
              { icon: '#️⃣', label: 'Hashtags' },
              { icon: '💡', label: 'Hook viral' },
              { icon: '🎬', label: 'Intro' },
              { icon: '🔚', label: 'Outro' },
            ].map((item) => (
              <motion.button
                key={item.label}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowAI(true)}
                className="flex-shrink-0 flex flex-col items-center gap-1 px-4 py-2 rounded-xl bg-white/90 backdrop-blur-sm shadow-sm"
              >
                <span className="text-lg">{item.icon}</span>
                <span className="text-xs text-gray-700 font-medium whitespace-nowrap">{item.label}</span>
              </motion.button>
            ))}
            <div className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full bg-gradient-to-r from-violet-500 to-pink-500 ml-1">
              <Sparkles className="w-3 h-3 text-white" />
              <span className="text-white text-xs font-semibold">Lovable IA</span>
            </div>
          </div>
        </div>

        {/* DURATION SELECTOR */}
        <div className="absolute bottom-36 left-0 right-0 z-20">
          <div className="flex items-center justify-center gap-3 px-4 overflow-x-auto scrollbar-hide">
            {DURATION_OPTIONS.map((option) => (
              <button
                key={option.label}
                onClick={() => handleDurationSelect(option)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  (option.type === captureType && (option.type !== 'video' || option.value === selectedDuration))
                    ? 'bg-white text-gray-900 shadow-lg'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* CAPTURE BUTTON */}
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
              className="w-20 h-20 rounded-full bg-white border-4 border-white/50 flex items-center justify-center shadow-xl"
            >
              <div className="w-16 h-16 rounded-full bg-red-500" />
            </motion.button>
          ) : (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={stopRecording}
              className="w-20 h-20 rounded-full bg-white border-4 border-red-500 flex items-center justify-center shadow-xl"
            >
              <div className="w-8 h-8 rounded-sm bg-red-500" />
            </motion.button>
          )}
        </div>

        {/* Recording progress ring */}
        {isRecording && (
          <svg className="absolute bottom-14 left-1/2 -translate-x-1/2 w-24 h-24 z-10 -rotate-90">
            <circle
              cx="48"
              cy="48"
              r="42"
              stroke="rgba(255,255,255,0.3)"
              strokeWidth="4"
              fill="none"
            />
            <circle
              cx="48"
              cy="48"
              r="42"
              stroke="white"
              strokeWidth="4"
              fill="none"
              strokeDasharray={`${2 * Math.PI * 42}`}
              strokeDashoffset={`${2 * Math.PI * 42 * (1 - recordingProgress / 100)}`}
              strokeLinecap="round"
              className="transition-all"
            />
          </svg>
        )}

        {/* BOTTOM NAV - LIVE / PUBLICATION / CRÉER */}
        <div className="absolute bottom-0 left-0 right-0 z-20 safe-area-bottom">
          <div className="flex justify-center gap-8 py-4">
            {(['live', 'publication', 'create'] as CreatorMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setCreatorMode(mode)}
                className={`text-sm font-semibold uppercase tracking-wide transition-all ${
                  creatorMode === mode
                    ? 'text-white border-b-2 border-white pb-1'
                    : 'text-white/60'
                }`}
              >
                {mode === 'live' ? 'LIVE' : mode === 'publication' ? 'PUBLICATION' : 'CRÉER'}
              </button>
            ))}
          </div>
        </div>

        {/* SHEETS */}
        <AnimatePresence>
          {showBackgrounds && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-30 bg-black/50"
              onClick={() => setShowBackgrounds(false)}
            >
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                onClick={e => e.stopPropagation()}
                className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl p-4 max-h-[50vh] overflow-y-auto"
              >
                <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
                <h3 className="text-gray-800 font-semibold mb-4">Arrière-plans</h3>
                <div className="grid grid-cols-4 gap-3">
                  {(['savanna', 'night_village', 'harvest', 'festival', 'sunrise', 'ocean', 'forest'] as BackgroundTheme[]).map(theme => (
                    <button
                      key={theme}
                      onClick={() => { setSelectedBackground(theme); setShowBackgrounds(false); }}
                      className={`aspect-square rounded-xl overflow-hidden border-2 ${selectedBackground === theme ? 'border-blue-500' : 'border-transparent'}`}
                    >
                      <div className={`w-full h-full bg-gradient-to-br ${
                        theme === 'savanna' ? 'from-amber-400 to-orange-600' :
                        theme === 'night_village' ? 'from-indigo-900 to-purple-800' :
                        theme === 'harvest' ? 'from-green-500 to-emerald-600' :
                        theme === 'festival' ? 'from-pink-500 to-orange-500' :
                        theme === 'sunrise' ? 'from-yellow-300 to-rose-500' :
                        theme === 'ocean' ? 'from-blue-400 to-cyan-600' :
                        'from-green-700 to-emerald-900'
                      }`} />
                    </button>
                  ))}
                </div>
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
              className="absolute inset-0 z-30 bg-black/50"
              onClick={() => setShowMusic(false)}
            >
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                onClick={e => e.stopPropagation()}
                className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl p-4 max-h-[60vh] overflow-y-auto"
              >
                <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
                <h3 className="text-gray-800 font-semibold mb-4">Musiques</h3>
                <div className="space-y-2">
                  {MUSIC_LIBRARY.filter(t => t.category === 'traditional').slice(0, 8).map(track => (
                    <button
                      key={track.id}
                      onClick={() => { setSelectedMusic(track); setShowMusic(false); }}
                      className={`w-full p-3 rounded-xl flex items-center gap-3 transition-colors ${
                        selectedMusic?.id === track.id ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-400 to-violet-500 flex items-center justify-center">
                        <Music className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-gray-800 font-medium">{track.name}</p>
                        <p className="text-gray-500 text-sm">{track.duration}s • {track.mood}</p>
                      </div>
                      {selectedMusic?.id === track.id && <Check className="w-5 h-5 text-blue-500" />}
                    </button>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showAI && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-30 bg-black/50"
              onClick={() => setShowAI(false)}
            >
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                onClick={e => e.stopPropagation()}
                className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl p-4 max-h-[70vh] overflow-y-auto"
              >
                <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
                <h3 className="text-gray-800 font-semibold mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-violet-500" />
                  Contenu IA Lovable
                </h3>
                <DynamicAITemplates
                  topic={creatorMode}
                  templateKey={`direct_${captureType}`}
                  isSheet
                  onSelectContent={(type, content) => {
                    setAiContent({ type, content });
                    if (captureType === 'text') {
                      setTextContent(content);
                    }
                  }}
                  onClose={() => setShowAI(false)}
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }

  // PREVIEW PHASE
  const currentMedia = capturedMedia[0];
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50"
    >
      <AnimatedBackground theme={selectedBackground} intensity={0.3}>
        {/* Top Bar */}
        <div className="absolute top-0 left-0 right-0 z-20 safe-area-top">
          <div className="flex items-center justify-between p-4 mx-3 mt-3 rounded-2xl bg-white/90 backdrop-blur-sm shadow-sm">
            <button 
              onClick={() => setPhase('capture')} 
              className="p-2 rounded-full hover:bg-gray-100"
            >
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </button>
            
            <h3 className="text-gray-800 font-semibold">Prévisualisation</h3>
            
            <div className="flex items-center gap-2 bg-green-100 px-3 py-1 rounded-full">
              <Check className="w-4 h-4 text-green-600" />
              <span className="text-green-700 text-sm font-medium">Prêt</span>
            </div>
          </div>
        </div>

        {/* Preview Content */}
        <div className="absolute inset-0 flex flex-col pt-24 pb-48 px-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex-1 relative rounded-3xl overflow-hidden bg-white shadow-xl"
          >
            {captureType === 'text' ? (
              <div className="w-full h-full flex items-center justify-center p-8 bg-gradient-to-br from-blue-50 to-violet-50">
                <div className="text-center">
                  <Type className="w-16 h-16 text-blue-400 mx-auto mb-6" />
                  <p className="text-xl text-gray-800 leading-relaxed">{textContent}</p>
                </div>
              </div>
            ) : currentMedia?.type === 'video' ? (
              <video
                ref={previewVideoRef}
                src={getPreviewUrl(currentMedia)}
                className="w-full h-full object-cover"
                style={getFilterStyle(currentFilter, currentFilter.intensity)}
                loop
                playsInline
                onTimeUpdate={(e) => {
                  const video = e.currentTarget;
                  setPreviewProgress((video.currentTime / video.duration) * 100);
                }}
                onEnded={() => setIsPreviewPlaying(false)}
              />
            ) : currentMedia?.type === 'audio' ? (
              <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-violet-50">
                <motion.div
                  animate={isPreviewPlaying ? { scale: [1, 1.1, 1] } : {}}
                  transition={{ repeat: Infinity, duration: 1 }}
                  className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-400 to-violet-500 flex items-center justify-center mb-6 shadow-xl"
                >
                  <Mic className="w-16 h-16 text-white" />
                </motion.div>
                <audio
                  ref={previewAudioRef}
                  src={getPreviewUrl(currentMedia)}
                  onTimeUpdate={(e) => {
                    const audio = e.currentTarget;
                    setPreviewProgress((audio.currentTime / audio.duration) * 100);
                  }}
                  onEnded={() => setIsPreviewPlaying(false)}
                />
                <p className="text-gray-600 font-medium">Audio - {selectedDuration}s</p>
              </div>
            ) : currentMedia?.type === 'photo' ? (
              <img 
                src={getPreviewUrl(currentMedia)} 
                className="w-full h-full object-cover"
                style={getFilterStyle(currentFilter, currentFilter.intensity)}
                alt="Preview"
              />
            ) : null}
            
            {/* Play/Pause Overlay */}
            {(currentMedia?.type === 'video' || currentMedia?.type === 'audio') && (
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={isPreviewPlaying ? pausePreview : playPreview}
                className="absolute inset-0 flex items-center justify-center"
                style={{ opacity: isPreviewPlaying ? 0 : 1 }}
              >
                <div className="w-20 h-20 rounded-full bg-white/90 flex items-center justify-center shadow-xl">
                  {isPreviewPlaying ? (
                    <Pause className="w-10 h-10 text-gray-800" />
                  ) : (
                    <Play className="w-10 h-10 text-gray-800 ml-1" />
                  )}
                </div>
              </motion.button>
            )}
            
            {/* Progress Bar */}
            {(currentMedia?.type === 'video' || currentMedia?.type === 'audio') && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20">
                <div 
                  className="h-full bg-white transition-all" 
                  style={{ width: `${previewProgress}%` }} 
                />
              </div>
            )}
          </motion.div>

          {/* Edit Options */}
          <div className="flex justify-center gap-3 mt-4">
            {currentMedia?.type !== 'photo' && captureType !== 'text' && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowFilters(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/90 shadow"
              >
                <Filter className="w-5 h-5 text-violet-500" />
                <span className="text-gray-700 font-medium text-sm">Filtres</span>
              </motion.button>
            )}
            
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setCapturedMedia([]);
                setPhase('capture');
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/90 shadow"
            >
              <Edit3 className="w-5 h-5 text-blue-500" />
              <span className="text-gray-700 font-medium text-sm">Refaire</span>
            </motion.button>
            
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setCapturedMedia([]);
                setTextContent('');
                handleClose();
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/90 shadow"
            >
              <Trash2 className="w-5 h-5 text-red-500" />
              <span className="text-gray-700 font-medium text-sm">Supprimer</span>
            </motion.button>
          </div>
        </div>

        {/* Bottom Action Bar */}
        <div className="absolute bottom-0 left-0 right-0 z-20 pb-8 pt-4 safe-area-bottom">
          <div className="mx-3 p-4 rounded-2xl bg-white/95 backdrop-blur-sm shadow-xl flex flex-col gap-3">
            {/* Info */}
            <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-violet-500 flex items-center justify-center">
                {captureType === 'video' ? <Video className="w-6 h-6 text-white" /> :
                 captureType === 'audio' ? <Mic className="w-6 h-6 text-white" /> :
                 captureType === 'photo' ? <Camera className="w-6 h-6 text-white" /> :
                 <Type className="w-6 h-6 text-white" />}
              </div>
              <div className="flex-1">
                <p className="text-gray-800 font-semibold capitalize">{captureType}</p>
                <p className="text-gray-500 text-sm">
                  {captureType === 'text' ? `${textContent.length} caractères` : 
                   captureType === 'photo' ? 'Photo' : `${selectedDuration}s`}
                </p>
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
      </AnimatedBackground>
    </motion.div>
  );
};

export default FullscreenCreator;
