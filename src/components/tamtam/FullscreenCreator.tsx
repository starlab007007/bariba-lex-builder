import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { 
  X, Mic, Video, Camera, Check, ChevronRight, ChevronLeft, 
  Volume2, Pause, Play, Loader2, RotateCcw, Sparkles, 
  Hash, Lightbulb, Music, Palette, ArrowLeft, Send, Sliders,
  Filter, Edit3, Trash2, SkipBack, SkipForward, Users
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

// ============= Cross-browser MIME type detection =============
const getSupportedMimeType = (mediaType: 'audio' | 'video'): string => {
  if (mediaType === 'audio') {
    // Priority: MP4 (Safari/iOS) > WebM (Chrome/Firefox) > OGG
    if (MediaRecorder.isTypeSupported('audio/mp4')) return 'audio/mp4';
    if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) return 'audio/webm;codecs=opus';
    if (MediaRecorder.isTypeSupported('audio/webm')) return 'audio/webm';
    if (MediaRecorder.isTypeSupported('audio/ogg')) return 'audio/ogg';
    return ''; // Let browser choose default
  } else {
    // Priority: MP4 (Safari/iOS) > WebM VP9 > WebM
    if (MediaRecorder.isTypeSupported('video/mp4')) return 'video/mp4';
    if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')) return 'video/webm;codecs=vp9,opus';
    if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) return 'video/webm;codecs=vp9';
    if (MediaRecorder.isTypeSupported('video/webm')) return 'video/webm';
    return ''; // Let browser choose default
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

// Phase transition animation variants
const phaseVariants = {
  initial: { opacity: 0, scale: 0.92, y: 30 },
  animate: { 
    opacity: 1, 
    scale: 1, 
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1] // iOS-like spring
    }
  },
  exit: { 
    opacity: 0, 
    scale: 1.08, 
    y: -30,
    transition: {
      duration: 0.35,
      ease: [0.22, 1, 0.36, 1]
    }
  }
};

const slideUpVariants = {
  initial: { opacity: 0, y: 100 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: {
      type: 'spring',
      damping: 25,
      stiffness: 300
    }
  },
  exit: { 
    opacity: 0, 
    y: 100,
    transition: { duration: 0.25 }
  }
};

const staggerContainerVariants = {
  animate: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1
    }
  }
};

const staggerItemVariants = {
  initial: { opacity: 0, y: 20, scale: 0.95 },
  animate: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { type: 'spring', stiffness: 300, damping: 20 }
  }
};

interface TemplateStep {
  step: number;
  instruction_fr: string;
  instruction_ba: string;
  duration: number;
  type: 'audio' | 'video' | 'photo';
}

interface CreationTemplate {
  id: string;
  template_key: string;
  icon: string;
  label_fr: string;
  label_ba: string | null;
  category: string;
  steps: TemplateStep[];
  music_url: string | null;
}

interface FullscreenCreatorProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (data: {
    audio_url: string;
    media_url?: string;
    transcript_fr?: string;
    transcript_ba?: string;
    template_id: string;
    topic: string;
    duration_seconds: number;
  }) => Promise<void>;
}

type Phase = 'select' | 'capture' | 'preview';

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

  // States
  const [templates, setTemplates] = useState<CreationTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<CreationTemplate | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingProgress, setRecordingProgress] = useState(0);
  const [capturedMedia, setCapturedMedia] = useState<{ step: number; blob: Blob; type: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [phase, setPhase] = useState<Phase>('select');
  
  // iOS 26.3 Features
  const [selectedBackground, setSelectedBackground] = useState<BackgroundTheme>('savanna');
  const [selectedMusic, setSelectedMusic] = useState<MusicTrack | null>(null);
  const [showBackgrounds, setShowBackgrounds] = useState(false);
  const [showMusic, setShowMusic] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [aiContent, setAiContent] = useState<any>(null);
  
  // Preview phase states
  const [showFilters, setShowFilters] = useState(false);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [previewProgress, setPreviewProgress] = useState(0);
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0);
  
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

  // Fetch templates
  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
    }
    return () => {
      stopStream();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen]);

  // Start camera when entering capture phase
  useEffect(() => {
    if (phase === 'capture' && selectedTemplate) {
      initCamera();
    }
    return () => {
      if (phase !== 'capture') {
        stopStream();
      }
    };
  }, [phase, selectedTemplate]);

  // Speak instruction
  useEffect(() => {
    if (selectedTemplate && phase === 'capture' && !isRecording) {
      speakInstruction();
    }
  }, [currentStep, selectedTemplate, phase]);

  // Music suggestions based on template
  useEffect(() => {
    if (selectedTemplate) {
      const suggestions = getSuggestedMusic({ topic: selectedTemplate.category });
      if (suggestions.length > 0 && !selectedMusic) {
        setSelectedMusic(suggestions[0]);
      }
    }
  }, [selectedTemplate]);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('tamtam_creation_templates')
        .select('*')
        .eq('is_active', true)
        .order('usage_count', { ascending: false });

      if (error) throw error;
      
      const parsed = (data || []).map(t => ({
        ...t,
        steps: typeof t.steps === 'string' ? JSON.parse(t.steps) : t.steps
      }));
      
      setTemplates(parsed);
    } catch (err) {
      console.error('[FullscreenCreator] Error:', err);
    }
  };

  const speakInstruction = async () => {
    if (!selectedTemplate) return;
    const step = selectedTemplate.steps[currentStep];
    if (!step) return;

    const instruction = currentLang === 'ba' ? step.instruction_ba : step.instruction_fr;
    if (currentLang === 'ba') {
      await speakBariba(instruction);
    } else {
      await speakFrench(instruction);
    }
  };

  const initCamera = async () => {
    if (!selectedTemplate) return;
    const step = selectedTemplate.steps[currentStep];
    if (step.type === 'audio') return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: isFrontCamera ? 'user' : 'environment' },
        audio: true
      });
      streamRef.current = stream;
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.error('[FullscreenCreator] Camera error:', err);
      
      // Explicit error handling for user feedback
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        toast({
          title: "🎤 Permission requise",
          description: "Autorisez l'accès au micro et à la caméra dans les paramètres",
          variant: "destructive"
        });
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        toast({
          title: "📷 Appareil non trouvé",
          description: "Aucun micro ou caméra détecté sur cet appareil",
          variant: "destructive"
        });
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        toast({
          title: "⚠️ Appareil occupé",
          description: "Le micro/caméra est utilisé par une autre application",
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

  const selectTemplate = (template: CreationTemplate) => {
    setSelectedTemplate(template);
    setCurrentStep(0);
    setCapturedMedia([]);
    setPhase('capture');
    triggerFeedback('notification');
  };

  const startRecording = async () => {
    if (!selectedTemplate) return;
    const step = selectedTemplate.steps[currentStep];

    try {
      const constraints: MediaStreamConstraints = {
        audio: true,
        video: step.type !== 'audio' ? { facingMode: isFrontCamera ? 'user' : 'environment' } : false
      };

      if (!streamRef.current) {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;
        if (videoPreviewRef.current && step.type !== 'audio') {
          videoPreviewRef.current.srcObject = stream;
        }
      }

      // Cross-browser MIME type detection
      const isAudio = step.type === 'audio';
      const mimeType = getSupportedMimeType(isAudio ? 'audio' : 'video');
      
      const options: MediaRecorderOptions = {};
      if (mimeType) {
        options.mimeType = mimeType;
      }
      
      console.log('[FullscreenCreator] Using mimeType:', mimeType || 'browser default');

      const mediaRecorder = new MediaRecorder(streamRef.current, options);
      const actualMimeType = mediaRecorder.mimeType || mimeType;
      
      chunksRef.current = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: actualMimeType });
        setCapturedMedia(prev => [...prev, { 
          step: currentStep, 
          blob, 
          type: step.type,
          mimeType: actualMimeType 
        } as any]);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
      setRecordingProgress(0);
      
      // Play background music
      if (selectedMusic?.url) {
        audioRef.current = new Audio(selectedMusic.url);
        audioRef.current.volume = 0.3;
        audioRef.current.play().catch(() => {});
      }
      
      // Progress timer
      const duration = step.duration * 1000;
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
          description: "Ce navigateur ne supporte pas l'enregistrement. Essayez Chrome ou Safari.", 
          variant: "destructive" 
        });
      } else if (err.name === 'NotAllowedError') {
        toast({ 
          title: "Permission refusée", 
          description: "Autorisez l'accès au micro dans les paramètres", 
          variant: "destructive" 
        });
      } else {
        toast({ title: "Erreur", description: err.message || "Impossible d'enregistrer", variant: "destructive" });
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

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const nextStep = () => {
    if (!selectedTemplate) return;
    if (currentStep < selectedTemplate.steps.length - 1) {
      setCurrentStep(prev => prev + 1);
      setRecordingProgress(0);
    } else {
      setPhase('preview');
    }
  };

  const previousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
      setCapturedMedia(prev => prev.filter(m => m.step !== currentStep));
      setRecordingProgress(0);
    }
  };

  const handleSubmit = async () => {
    if (!selectedTemplate || capturedMedia.length === 0) return;
    setIsSubmitting(true);
    
    try {
      const mainMedia = capturedMedia[0] as any;
      const mainBlob = mainMedia.blob;
      const isVideo = capturedMedia.some(m => m.type === 'video');
      const mimeType = mainMedia.mimeType || (isVideo ? 'video/webm' : 'audio/webm');
      const extension = getFileExtension(mimeType);
      const fileName = `creator_${selectedTemplate.template_key}_${Date.now()}.${extension}`;
      
      console.log('[FullscreenCreator] Uploading:', { fileName, mimeType, size: mainBlob.size });
      
      const { error: uploadError } = await supabase.storage
        .from('tamtam-audio')
        .upload(fileName, mainBlob, {
          contentType: mimeType,
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('tamtam-audio')
        .getPublicUrl(fileName);

      let transcript_fr, transcript_ba;
      
      // Transcribe audio/video
      if (mainBlob) {
        try {
          const base64 = await blobToBase64(mainBlob);
          const result = await transcribeWithTranslation(base64, currentLang === 'ba' ? 'ba' : 'fr');
          transcript_fr = result.transcription_fr || result.transcription;
          transcript_ba = result.transcription_ba;
        } catch (e) {
          console.warn('[FullscreenCreator] Transcription failed:', e);
        }
      }

      const totalDuration = selectedTemplate.steps.reduce((sum, s) => sum + s.duration, 0);

      await onComplete({
        audio_url: urlData.publicUrl,
        media_url: isVideo ? urlData.publicUrl : undefined,
        transcript_fr,
        transcript_ba,
        template_id: selectedTemplate.template_key,
        topic: selectedTemplate.category,
        duration_seconds: totalDuration
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
    setSelectedTemplate(null);
    setCurrentStep(0);
    setCapturedMedia([]);
    setPhase('select');
    setIsRecording(false);
    setShowBackgrounds(false);
    setShowMusic(false);
    setShowAI(false);
    onClose();
  };

  if (!isOpen) return null;

  const isSpeaking = isSpeakingFr || isSpeakingBa;
  const currentStepData = selectedTemplate?.steps[currentStep];
  const hasRecordedCurrentStep = capturedMedia.some(m => m.step === currentStep);

  // TEMPLATE SELECTION PHASE - LIGHT GLASS
  if (phase === 'select') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50"
        style={{ background: 'linear-gradient(180deg, #F7F9FC 0%, #EEF3FF 50%, #F4F0FF 100%)' }}
      >
        {/* Header - Light Glass */}
        <div className="absolute top-0 left-0 right-0 z-10 px-4 py-3 flex items-center justify-between safe-area-top">
          <motion.button 
            whileTap={{ scale: 0.9 }}
            onClick={handleClose} 
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ 
              background: 'rgba(255, 255, 255, 0.8)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(0, 0, 0, 0.05)',
              boxShadow: '0 2px 12px rgba(30, 60, 120, 0.1)'
            }}
          >
            <X className="w-5 h-5 text-gray-700" />
          </motion.button>
          <h2 className="text-gray-800 font-semibold text-lg tracking-tight">
            {currentLang === 'ba' ? 'Yan àwòrán' : 'Créer'}
          </h2>
          <div className="w-10" />
        </div>

        {/* Template Grid - Light Glass Enhanced */}
        <div className="pt-20 pb-8 px-4 h-full overflow-y-auto">
          <p className="text-gray-500 text-center mb-6 text-sm font-medium">
            {currentLang === 'ba' ? 'Yan iru àwòrán' : 'Choisis ton format de création'}
          </p>
          
          <div className="grid grid-cols-2 gap-3">
            {templates.map((template, idx) => (
              <motion.button
                key={template.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: idx * 0.05, type: 'spring', stiffness: 300 }}
                whileTap={{ scale: 0.95 }}
                whileHover={{ scale: 1.02 }}
                onClick={() => selectTemplate(template)}
                className="template-card-light p-4 flex flex-col items-center gap-3"
              >
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(77, 163, 255, 0.1) 0%, rgba(139, 124, 255, 0.1) 100%)' }}>
                  <span className="text-3xl">{template.icon}</span>
                </div>
                <span className="text-gray-800 font-medium text-sm text-center leading-tight">
                  {currentLang === 'ba' ? template.label_ba : template.label_fr}
                </span>
                <span className="light-glass-pill px-3 py-1 text-xs">
                  {template.steps.length} {currentLang === 'ba' ? 'ìgbésẹ̀' : 'étapes'}
                </span>
              </motion.button>
            ))}
          </div>
        </div>
      </motion.div>
    );
  }

  // CAPTURE PHASE - TikTok Light Mode Style
  if (phase === 'capture' && selectedTemplate && currentStepData) {
    const recordingModes = ['10 min', '60 s', '15 s', 'PHOTO', 'TEXTE'];
    const currentMode = currentStepData.type === 'photo' ? 'PHOTO' : 
                        currentStepData.type === 'audio' ? '60 s' : '15 s';
    
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="tiktok-light-creator"
      >
        {/* Light Gradient Background */}
        <div 
          className="absolute inset-0 z-0"
          style={{
            background: 'linear-gradient(180deg, #C9CDD4 0%, #9AA1AC 50%, #6B7280 100%)'
          }}
        />

        {/* Video preview - full screen */}
        {currentStepData.type !== 'audio' && (
          <video
            ref={videoPreviewRef}
            autoPlay
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover z-[1]"
            style={{ transform: isFrontCamera ? 'scaleX(-1)' : 'none' }}
          />
        )}

        {/* Audio mode visualization */}
        {currentStepData.type === 'audio' && (
          <div className="absolute inset-0 flex items-center justify-center z-[1]">
            <motion.div
              animate={isRecording ? { scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] } : {}}
              transition={{ repeat: Infinity, duration: 1.2 }}
              className="w-36 h-36 rounded-full bg-white/15 flex items-center justify-center backdrop-blur-sm"
            >
              <div className="w-24 h-24 rounded-full bg-white/25 flex items-center justify-center">
                <Mic className={`w-12 h-12 ${isRecording ? 'text-red-400' : 'text-white'}`} />
              </div>
            </motion.div>
          </div>
        )}

        {/* TOP HEADER - Transparent TikTok Style */}
        <div className="absolute top-0 left-0 right-0 z-20 safe-area-top">
          <div className="tiktok-light-top-bar">
            {/* Close Button */}
            <button onClick={handleClose} className="tiktok-light-icon-btn">
              <X className="w-6 h-6" />
            </button>
            
            {/* Sound Button */}
            <button 
              onClick={() => setShowMusic(true)}
              className="tiktok-light-sound-button"
            >
              <Music className="w-4 h-4" />
              <span>{selectedMusic?.name || 'Ajouter un son'}</span>
            </button>

            {/* Flip Camera */}
            <button onClick={flipCamera} className="tiktok-light-icon-btn">
              <RotateCcw className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Recording Timer - Top Center */}
        {isRecording && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20">
            <div className="tiktok-light-timer">
              <div className="tiktok-light-timer-dot" />
              <span className="text-sm font-medium">
                {Math.floor(recordingProgress / 100 * (currentStepData?.duration || 0))}s / {currentStepData?.duration}s
              </span>
            </div>
          </div>
        )}

        {/* RIGHT SIDE CONTROLS - TikTok Style */}
        <div className="tiktok-light-side-controls">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowBackgrounds(true)}
            className="tiktok-light-side-button"
          >
            <Palette className="w-5 h-5" />
          </motion.button>
          
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowMusic(true)}
            className="tiktok-light-side-button"
          >
            <Music className="w-5 h-5" />
          </motion.button>
          
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowAI(true)}
            className="tiktok-light-side-button"
          >
            <Sparkles className="w-5 h-5" />
            <span>IA</span>
          </motion.button>
          
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowAI(true)}
            className="tiktok-light-side-button"
          >
            <Lightbulb className="w-5 h-5" />
          </motion.button>
        </div>

        {/* Instruction Text - Subtle at bottom */}
        {!isRecording && (
          <p className="tiktok-light-instruction">
            {currentLang === 'ba' ? currentStepData.instruction_ba : currentStepData.instruction_fr}
          </p>
        )}

        {/* AI TEMPLATES ROW - White Cards */}
        <div className="absolute bottom-52 left-0 right-0 z-20">
          <div className="tiktok-ai-templates">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowAI(true)}
              className="tiktok-ai-template-card"
            >
              <span className="icon">✨</span>
              <span className="label">Script IA</span>
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowAI(true)}
              className="tiktok-ai-template-card"
            >
              <span className="icon">#️⃣</span>
              <span className="label">Hashtags</span>
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowAI(true)}
              className="tiktok-ai-template-card"
            >
              <span className="icon">💡</span>
              <span className="label">Hook viral</span>
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowAI(true)}
              className="tiktok-ai-template-card"
            >
              <span className="icon">🎬</span>
              <span className="label">Intro</span>
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowAI(true)}
              className="tiktok-ai-template-card"
            >
              <span className="icon">🔚</span>
              <span className="label">Outro</span>
            </motion.button>
            <div className="tiktok-ai-badge ml-1">
              <Sparkles className="w-3 h-3" />
              <span>Lovable IA</span>
            </div>
          </div>
        </div>

        {/* MODE SELECTOR - Bottom */}
        <div className="absolute bottom-36 left-0 right-0 z-20">
          <div className="tiktok-light-mode-selector">
            {recordingModes.map((mode) => (
              <button
                key={mode}
                className={`tiktok-light-mode-item ${mode === currentMode ? 'active' : ''}`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        {/* CAPTURE BUTTON - Center Bottom */}
        <div className="absolute bottom-16 left-0 right-0 z-20 flex justify-center">
          {!isRecording && !hasRecordedCurrentStep && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={startRecording}
              disabled={isSpeaking}
              className="tiktok-light-capture-button"
            >
              <div className="tiktok-light-capture-button-inner" />
            </motion.button>
          )}

          {isRecording && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={stopRecording}
              className="tiktok-light-capture-button recording"
            >
              <div className="tiktok-light-capture-button-inner" />
            </motion.button>
          )}

          {hasRecordedCurrentStep && !isRecording && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-lg"
            >
              <Check className="w-10 h-10 text-green-500" />
            </motion.div>
          )}
        </div>

        {/* Step navigation arrows */}
        <div className="absolute bottom-20 left-4 z-20">
          <button
            onClick={previousStep}
            disabled={currentStep === 0}
            className="p-2 text-white disabled:opacity-30"
          >
            <ChevronLeft className="w-7 h-7" />
          </button>
        </div>
        <div className="absolute bottom-20 right-4 z-20">
          <button
            onClick={nextStep}
            disabled={!hasRecordedCurrentStep}
            className="p-2 text-white disabled:opacity-30"
          >
            {currentStep === selectedTemplate.steps.length - 1 ? (
              <Send className="w-6 h-6" />
            ) : (
              <ChevronRight className="w-7 h-7" />
            )}
          </button>
        </div>

        {/* BOTTOM NAV */}
        <div className="absolute bottom-0 left-0 right-0 z-20 safe-area-bottom">
          <div className="tiktok-light-bottom-nav">
            <button className="tiktok-light-nav-item">LIVE</button>
            <button className="tiktok-light-nav-item active">PUBLICATION</button>
            <button className="tiktok-light-nav-item">CRÉER</button>
          </div>
        </div>

        {/* STEP DOTS */}
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-20 flex gap-2">
          {selectedTemplate.steps.map((_, idx) => (
            <div
              key={idx}
              className={`w-2 h-2 rounded-full transition-all ${
                idx === currentStep 
                  ? 'bg-white w-6' 
                  : idx < currentStep 
                    ? 'bg-white/80' 
                    : 'bg-white/40'
              }`}
            />
          ))}
        </div>

        {/* BACKGROUND SELECTOR SHEET */}
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

        {/* MUSIC SELECTOR SHEET */}
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
                  {MUSIC_LIBRARY.filter(t => t.category === 'traditional').slice(0, 6).map(track => (
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
                      {selectedMusic?.id === track.id && (
                        <Check className="w-5 h-5 text-blue-500" />
                      )}
                    </button>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* AI CONTENT SHEET */}
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
                  topic={selectedTemplate?.category || ''}
                  templateKey={selectedTemplate?.template_key}
                  isSheet
                  onSelectContent={(type, content) => {
                    setAiContent({ type, content });
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

  // Helper functions for preview
  const getPreviewUrl = (media: { blob: Blob }) => URL.createObjectURL(media.blob);
  
  const playPreview = () => {
    const media = capturedMedia[currentPreviewIndex];
    if (!media) return;
    
    if (media.type === 'video' && previewVideoRef.current) {
      previewVideoRef.current.play();
      setIsPreviewPlaying(true);
    } else if (media.type === 'audio' && previewAudioRef.current) {
      previewAudioRef.current.play();
      setIsPreviewPlaying(true);
    }
  };
  
  const pausePreview = () => {
    if (previewVideoRef.current) previewVideoRef.current.pause();
    if (previewAudioRef.current) previewAudioRef.current.pause();
    setIsPreviewPlaying(false);
  };
  
  const nextPreviewSegment = () => {
    if (currentPreviewIndex < capturedMedia.length - 1) {
      pausePreview();
      setCurrentPreviewIndex(prev => prev + 1);
      setPreviewProgress(0);
    }
  };
  
  const prevPreviewSegment = () => {
    if (currentPreviewIndex > 0) {
      pausePreview();
      setCurrentPreviewIndex(prev => prev - 1);
      setPreviewProgress(0);
    }
  };
  
  const deleteSegment = (index: number) => {
    setCapturedMedia(prev => prev.filter((_, i) => i !== index));
    if (currentPreviewIndex >= capturedMedia.length - 1) {
      setCurrentPreviewIndex(Math.max(0, capturedMedia.length - 2));
    }
    triggerFeedback('notification');
  };

  // PREVIEW PHASE - Enhanced with Video Preview & Filters
  if (phase === 'preview') {
    const currentMedia = capturedMedia[currentPreviewIndex];
    const hasVideo = capturedMedia.some(m => m.type === 'video');
    const hasAudio = capturedMedia.some(m => m.type === 'audio');
    
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fullscreen-creator"
      >
        <AnimatedBackground theme={selectedBackground} intensity={0.3}>
          {/* Top Bar */}
          <div className="absolute top-0 left-0 right-0 z-20 safe-area-top">
            <div className="capture-top-bar mx-3 mt-3 px-4 py-3 flex items-center justify-between">
              <button 
                onClick={handleClose} 
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-gray-700" />
              </button>
              
              <h3 className="text-gray-800 font-semibold">
                {currentLang === 'ba' ? 'Àyẹ̀wò' : 'Prévisualisation'}
              </h3>
              
              <div className="flex items-center gap-2 bg-green-100 px-3 py-1 rounded-full">
                <Check className="w-4 h-4 text-green-600" />
                <span className="text-green-700 text-sm font-medium">{capturedMedia.length}</span>
              </div>
            </div>
          </div>

          {/* Main Preview Area */}
          <div className="absolute inset-0 flex flex-col pt-20 pb-48 px-4">
            {/* Video/Audio Preview */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex-1 relative rounded-3xl overflow-hidden capture-frame"
            >
              {currentMedia?.type === 'video' ? (
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
                  <p className="text-gray-600 font-medium">
                    {currentLang === 'ba' ? 'Ohùn' : 'Audio'} - Étape {currentMedia.step + 1}
                  </p>
                </div>
              ) : currentMedia?.type === 'photo' ? (
                <img 
                  src={getPreviewUrl(currentMedia)} 
                  className="w-full h-full object-cover"
                  style={getFilterStyle(currentFilter, currentFilter.intensity)}
                  alt="Preview"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-100">
                  <p className="text-gray-500">Aucun média</p>
                </div>
              )}
              
              {/* Play/Pause Overlay */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={isPreviewPlaying ? pausePreview : playPreview}
                className="absolute inset-0 flex items-center justify-center bg-black/10 transition-opacity"
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
              
              {/* Progress Bar */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20">
                <div 
                  className="h-full bg-white transition-all" 
                  style={{ width: `${previewProgress}%` }} 
                />
              </div>
              
              {/* Filter indicator */}
              {currentFilter.id !== 'none' && (
                <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full flex items-center gap-2 shadow">
                  <span className="text-lg">{currentFilter.icon}</span>
                  <span className="text-gray-700 text-sm font-medium">{currentFilter.name}</span>
                </div>
              )}
            </motion.div>

            {/* Segment Navigation */}
            {capturedMedia.length > 1 && (
              <div className="flex items-center justify-center gap-3 mt-4">
                <button
                  onClick={prevPreviewSegment}
                  disabled={currentPreviewIndex === 0}
                  className="p-2 rounded-full bg-white/80 disabled:opacity-30 shadow"
                >
                  <SkipBack className="w-5 h-5 text-gray-700" />
                </button>
                
                <div className="flex gap-2">
                  {capturedMedia.map((media, idx) => (
                    <motion.button
                      key={idx}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => {
                        pausePreview();
                        setCurrentPreviewIndex(idx);
                        setPreviewProgress(0);
                      }}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                        idx === currentPreviewIndex 
                          ? 'bg-blue-500 text-white shadow-lg' 
                          : 'bg-white/80 text-gray-600'
                      }`}
                    >
                      {media.type === 'video' ? <Video className="w-4 h-4" /> :
                       media.type === 'photo' ? <Camera className="w-4 h-4" /> :
                       <Mic className="w-4 h-4" />}
                    </motion.button>
                  ))}
                </div>
                
                <button
                  onClick={nextPreviewSegment}
                  disabled={currentPreviewIndex === capturedMedia.length - 1}
                  className="p-2 rounded-full bg-white/80 disabled:opacity-30 shadow"
                >
                  <SkipForward className="w-5 h-5 text-gray-700" />
                </button>
              </div>
            )}

            {/* Edit Options Bar */}
            <div className="flex justify-center gap-3 mt-4">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowFilters(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/90 shadow"
              >
                <Filter className="w-5 h-5 text-violet-500" />
                <span className="text-gray-700 font-medium text-sm">Filtres</span>
              </motion.button>
              
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setPhase('capture')}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/90 shadow"
              >
                <Edit3 className="w-5 h-5 text-blue-500" />
                <span className="text-gray-700 font-medium text-sm">Modifier</span>
              </motion.button>
              
              {capturedMedia.length > 1 && (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => deleteSegment(currentPreviewIndex)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/90 shadow"
                >
                  <Trash2 className="w-5 h-5 text-red-500" />
                  <span className="text-gray-700 font-medium text-sm">Supprimer</span>
                </motion.button>
              )}
            </div>
          </div>

          {/* Bottom Action Bar */}
          <div className="absolute bottom-0 left-0 right-0 z-20 pb-8 pt-4 safe-area-bottom">
            <div className="capture-bottom-bar mx-3 p-4 flex flex-col gap-3">
              {/* Template info */}
              <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-violet-500 flex items-center justify-center">
                  <span className="text-2xl">{selectedTemplate?.icon}</span>
                </div>
                <div className="flex-1">
                  <p className="text-gray-800 font-semibold">{selectedTemplate?.label_fr}</p>
                  <p className="text-gray-500 text-sm">
                    {capturedMedia.length} segment{capturedMedia.length > 1 ? 's' : ''} • {
                      selectedTemplate?.steps.reduce((sum, s) => sum + s.duration, 0)
                    }s
                  </p>
                </div>
              </div>
              
              {/* Publish button */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                whileHover={{ scale: 1.01 }}
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full py-4 text-white rounded-2xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                style={{
                  background: 'linear-gradient(135deg, #4DA3FF 0%, #8B7CFF 100%)',
                  boxShadow: '0 8px 24px rgba(77, 163, 255, 0.3)'
                }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Publication...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    <span>Publier maintenant</span>
                  </>
                )}
              </motion.button>
            </div>
          </div>

          {/* Filters Panel */}
          <AnimatePresence>
            {showFilters && (
              <VideoFiltersPanel
                isOpen={showFilters}
                onClose={() => setShowFilters(false)}
                onSelectFilter={setCurrentFilter}
                currentFilter={currentFilter}
              />
            )}
          </AnimatePresence>
        </AnimatedBackground>
      </motion.div>
    );
  }

  return null;
};

export default FullscreenCreator;
