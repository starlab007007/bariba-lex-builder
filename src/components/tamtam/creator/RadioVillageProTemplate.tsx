/**
 * RadioVillageProTemplate.tsx
 * Template audio-first premium pour Radio Village
 * Workflow: Audio → Photos → Style → Processing
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic, MicOff, Square, Upload, Play, Pause,
  ChevronRight, ChevronLeft, SkipForward, RefreshCw,
  Image, User, Home, Camera, X, Check, Loader2,
  Volume2, Sparkles, BookOpen, Megaphone, PartyPopper
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

// ==========================================
// TYPES
// ==========================================

type Step = 'audio' | 'photos' | 'style' | 'processing';

interface StylePreset {
  id: string;
  name: string;
  description: string;
  emoji: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    gradient: string;
  };
  icon: React.ReactNode;
}

interface RadioVillageProTemplateProps {
  onComplete: (videoBlob: Blob, metadata: VideoMetadata) => void;
  onBack?: () => void;
}

interface VideoMetadata {
  duration: number;
  style: string;
  hasPortrait: boolean;
  hasVillage: boolean;
  hasContext: boolean;
}

// ==========================================
// STYLE PRESETS
// ==========================================

const stylePresets: StylePreset[] = [
  {
    id: 'sagesse',
    name: 'Sagesse',
    description: 'Ambiance chaleureuse pour paroles d\'anciens',
    emoji: '💡',
    colors: {
      primary: '#FFD700',
      secondary: '#FFA500',
      accent: '#FF8C00',
      gradient: 'from-amber-900/50 to-yellow-900/30'
    },
    icon: <Sparkles className="w-6 h-6" />
  },
  {
    id: 'histoire',
    name: 'Histoire',
    description: 'Style vintage sépia pour les récits',
    emoji: '📖',
    colors: {
      primary: '#D4A574',
      secondary: '#C4956A',
      accent: '#A0785A',
      gradient: 'from-amber-950/50 to-orange-900/30'
    },
    icon: <BookOpen className="w-6 h-6" />
  },
  {
    id: 'actualite',
    name: 'Actualité',
    description: 'Style moderne pour annonces',
    emoji: '📢',
    colors: {
      primary: '#00BFFF',
      secondary: '#1E90FF',
      accent: '#4169E1',
      gradient: 'from-blue-950/50 to-cyan-900/30'
    },
    icon: <Megaphone className="w-6 h-6" />
  },
  {
    id: 'celebration',
    name: 'Célébration',
    description: 'Ambiance festive multicolore',
    emoji: '🎉',
    colors: {
      primary: '#FF69B4',
      secondary: '#9B59B6',
      accent: '#FFD700',
      gradient: 'from-purple-950/50 to-pink-900/30'
    },
    icon: <PartyPopper className="w-6 h-6" />
  }
];

// ==========================================
// UTILS
// ==========================================

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const getSupportedMimeType = (): string => {
  const types = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg'];
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return 'audio/webm';
};

// ==========================================
// MAIN COMPONENT
// ==========================================

export const RadioVillageProTemplate: React.FC<RadioVillageProTemplateProps> = ({
  onComplete,
  onBack
}) => {
  // State
  const [currentStep, setCurrentStep] = useState<Step>('audio');
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const [photoPortrait, setPhotoPortrait] = useState<File | null>(null);
  const [photoVillage, setPhotoVillage] = useState<File | null>(null);
  const [photoContext, setPhotoContext] = useState<File | null>(null);
  
  const [selectedStyle, setSelectedStyle] = useState<string>('sagesse');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingMessage, setProcessingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Cleanup
  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  // ==========================================
  // AUDIO RECORDING
  // ==========================================

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        }
      });

      streamRef.current = stream;
      audioChunksRef.current = [];

      const mimeType = getSupportedMimeType();
      const mediaRecorder = new MediaRecorder(stream, { mimeType });

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);
        
        // Get duration
        const audio = new Audio(url);
        audio.onloadedmetadata = () => {
          setAudioDuration(audio.duration);
        };
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingTime(0);

      // Timer
      const startTime = Date.now();
      recordingIntervalRef.current = window.setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setRecordingTime(elapsed);
        
        // Auto-stop at 60s
        if (elapsed >= 60) {
          stopRecording();
        }
      }, 1000);

    } catch (err: any) {
      console.error('Recording error:', err);
      setError(err.message || 'Impossible d\'accéder au microphone');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }

    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }

    setIsRecording(false);
  }, [isRecording]);

  const resetRecording = useCallback(() => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
    setAudioDuration(0);
    setRecordingTime(0);
  }, [audioUrl]);

  // ==========================================
  // AUDIO UPLOAD
  // ==========================================

  const handleAudioUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate format
    const validFormats = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/m4a', 'audio/ogg', 'audio/webm'];
    if (!validFormats.some(f => file.type.includes(f.split('/')[1]))) {
      setError('Format audio non supporté. Utilisez MP3, WAV, M4A ou OGG.');
      return;
    }

    // Validate size (50MB max)
    if (file.size > 50 * 1024 * 1024) {
      setError('Fichier trop volumineux. Maximum 50MB.');
      return;
    }

    const url = URL.createObjectURL(file);
    const audio = new Audio(url);
    
    audio.onloadedmetadata = () => {
      if (audio.duration < 30) {
        setError('Audio trop court. Minimum 30 secondes.');
        URL.revokeObjectURL(url);
        return;
      }
      if (audio.duration > 60) {
        setError('Audio trop long. Maximum 60 secondes.');
        URL.revokeObjectURL(url);
        return;
      }

      setAudioBlob(file);
      setAudioUrl(url);
      setAudioDuration(audio.duration);
      setError(null);
    };

    audio.onerror = () => {
      setError('Impossible de lire ce fichier audio.');
      URL.revokeObjectURL(url);
    };
  }, []);

  // ==========================================
  // PHOTO UPLOAD
  // ==========================================

  const handlePhotoUpload = useCallback((type: 'portrait' | 'village' | 'context', file: File) => {
    // Validate format
    if (!file.type.startsWith('image/')) {
      setError('Fichier non supporté. Utilisez JPG, PNG ou WEBP.');
      return;
    }

    // Validate size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      setError('Image trop volumineuse. Maximum 10MB.');
      return;
    }

    setError(null);
    switch (type) {
      case 'portrait': setPhotoPortrait(file); break;
      case 'village': setPhotoVillage(file); break;
      case 'context': setPhotoContext(file); break;
    }
  }, []);

  // ==========================================
  // PROCESSING
  // ==========================================

  const startProcessing = useCallback(async () => {
    if (!audioBlob) return;

    setIsProcessing(true);
    setProcessingProgress(0);

    const steps = [
      { progress: 10, message: 'Analyse de l\'audio...' },
      { progress: 25, message: 'Génération des sous-titres...' },
      { progress: 40, message: 'Création de la visualisation...' },
      { progress: 55, message: 'Application du style...' },
      { progress: 70, message: 'Ajout des effets...' },
      { progress: 85, message: 'Rendu final...' },
      { progress: 100, message: 'Terminé!' }
    ];

    for (const step of steps) {
      await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 400));
      setProcessingProgress(step.progress);
      setProcessingMessage(step.message);
    }

    // Simulate video output (in real implementation, this would be actual video rendering)
    const fakeVideoBlob = new Blob([audioBlob], { type: 'video/mp4' });
    
    const metadata: VideoMetadata = {
      duration: audioDuration,
      style: selectedStyle,
      hasPortrait: !!photoPortrait,
      hasVillage: !!photoVillage,
      hasContext: !!photoContext
    };

    setTimeout(() => {
      onComplete(fakeVideoBlob, metadata);
    }, 500);
  }, [audioBlob, audioDuration, selectedStyle, photoPortrait, photoVillage, photoContext, onComplete]);

  // ==========================================
  // NAVIGATION
  // ==========================================

  const canProceedToPhotos = audioBlob && audioDuration >= 30;
  const canProceedToStyle = true; // Photos are optional
  const canProcess = selectedStyle;

  const goToNext = () => {
    switch (currentStep) {
      case 'audio': if (canProceedToPhotos) setCurrentStep('photos'); break;
      case 'photos': setCurrentStep('style'); break;
      case 'style': setCurrentStep('processing'); startProcessing(); break;
    }
  };

  const goToPrevious = () => {
    switch (currentStep) {
      case 'photos': setCurrentStep('audio'); break;
      case 'style': setCurrentStep('photos'); break;
      case 'processing': setCurrentStep('style'); break;
    }
  };

  // ==========================================
  // RENDER: STEP INDICATOR
  // ==========================================

  const renderStepIndicator = () => {
    const steps = [
      { key: 'audio', label: '🎙️', name: 'Audio' },
      { key: 'photos', label: '📷', name: 'Photos' },
      { key: 'style', label: '🎨', name: 'Style' },
      { key: 'processing', label: '✨', name: 'Export' }
    ];

    const currentIndex = steps.findIndex(s => s.key === currentStep);

    return (
      <div className="flex items-center justify-center gap-2 mb-6">
        {steps.map((step, index) => (
          <React.Fragment key={step.key}>
            <motion.div
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all",
                index === currentIndex
                  ? "bg-primary text-primary-foreground scale-110 shadow-lg"
                  : index < currentIndex
                    ? "bg-primary/30 text-primary"
                    : "bg-muted text-muted-foreground"
              )}
              animate={index === currentIndex ? { scale: [1, 1.1, 1] } : {}}
              transition={{ duration: 0.5, repeat: index === currentIndex ? Infinity : 0, repeatDelay: 1 }}
            >
              {step.label}
            </motion.div>
            {index < steps.length - 1 && (
              <div className={cn(
                "w-8 h-1 rounded-full transition-colors",
                index < currentIndex ? "bg-primary" : "bg-muted"
              )} />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  // ==========================================
  // RENDER: AUDIO STEP
  // ==========================================

  const renderAudioStep = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-foreground mb-2">🎙️ Enregistre ta voix</h2>
        <p className="text-muted-foreground">30 à 60 secondes de parole</p>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 text-destructive text-sm">
          {error}
        </div>
      )}

      {!audioBlob ? (
        <div className="space-y-6">
          {/* Recording UI */}
          <div className={cn(
            "relative rounded-2xl p-8 text-center transition-all",
            isRecording 
              ? "bg-destructive/10 border-2 border-destructive/50" 
              : "bg-card border border-border"
          )}>
            {isRecording && (
              <motion.div
                className="absolute top-4 right-4 flex items-center gap-2"
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                <span className="w-3 h-3 bg-destructive rounded-full" />
                <span className="text-destructive font-medium">REC</span>
              </motion.div>
            )}

            <div className="text-5xl font-mono font-bold text-foreground mb-6">
              {formatTime(recordingTime)} / 01:00
            </div>

            {/* Waveform visualization */}
            {isRecording && (
              <div className="flex items-center justify-center gap-1 mb-6 h-16">
                {Array.from({ length: 20 }).map((_, i) => (
                  <motion.div
                    key={i}
                    className="w-2 bg-destructive rounded-full"
                    animate={{ height: [20, 40 + Math.random() * 30, 20] }}
                    transition={{ duration: 0.3 + Math.random() * 0.3, repeat: Infinity }}
                  />
                ))}
              </div>
            )}

            <div className="flex items-center justify-center gap-4">
              {!isRecording ? (
                <Button
                  size="lg"
                  onClick={startRecording}
                  className="bg-destructive hover:bg-destructive/90 text-white px-8 py-6 text-lg gap-3"
                >
                  <Mic className="w-6 h-6" />
                  Commencer l'enregistrement
                </Button>
              ) : (
                <Button
                  size="lg"
                  onClick={stopRecording}
                  variant="outline"
                  className="border-destructive text-destructive hover:bg-destructive/10 px-8 py-6 text-lg gap-3"
                >
                  <Square className="w-6 h-6" />
                  Arrêter
                </Button>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-border" />
            <span className="text-muted-foreground text-sm">ou</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Upload button */}
          <div className="text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              onChange={handleAudioUpload}
              className="hidden"
            />
            <Button
              variant="outline"
              size="lg"
              onClick={() => fileInputRef.current?.click()}
              className="gap-3"
            >
              <Upload className="w-5 h-5" />
              Uploader un fichier audio
            </Button>
            <p className="text-muted-foreground text-xs mt-2">MP3, WAV, M4A, OGG • Max 50MB • 30-60s</p>
          </div>
        </div>
      ) : (
        /* Audio Preview */
        <div className="bg-card rounded-2xl p-6 border border-border space-y-4">
          <div className="flex items-center gap-4">
            <motion.div
              className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center"
              animate={isPlaying ? { scale: [1, 1.1, 1] } : {}}
              transition={{ duration: 0.5, repeat: isPlaying ? Infinity : 0 }}
            >
              <Volume2 className="w-8 h-8 text-primary" />
            </motion.div>
            <div className="flex-1">
              <p className="font-medium text-foreground">Audio enregistré</p>
              <p className="text-muted-foreground text-sm">Durée: {formatTime(audioDuration)}</p>
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={resetRecording}
              className="text-destructive hover:bg-destructive/10"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          <audio
            ref={audioPreviewRef}
            src={audioUrl || undefined}
            controls
            className="w-full"
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
          />

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={resetRecording}
              className="flex-1 gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Réenregistrer
            </Button>
            <Button
              onClick={goToNext}
              disabled={!canProceedToPhotos}
              className="flex-1 gap-2"
            >
              Continuer
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </motion.div>
  );

  // ==========================================
  // RENDER: PHOTOS STEP
  // ==========================================

  const renderPhotoUploader = (
    type: 'portrait' | 'village' | 'context',
    label: string,
    icon: React.ReactNode,
    file: File | null,
    setFile: (f: File | null) => void
  ) => {
    const inputId = `photo-${type}`;
    const previewUrl = file ? URL.createObjectURL(file) : null;

    return (
      <div className="relative">
        <input
          id={inputId}
          type="file"
          accept="image/*"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handlePhotoUpload(type, f);
          }}
          className="hidden"
        />
        
        {file && previewUrl ? (
          <div className="relative aspect-square rounded-xl overflow-hidden border-2 border-primary">
            <img src={previewUrl} alt={label} className="w-full h-full object-cover" />
            <Button
              size="icon"
              variant="destructive"
              className="absolute top-2 right-2 w-8 h-8"
              onClick={() => setFile(null)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <label
            htmlFor={inputId}
            className="aspect-square rounded-xl border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 transition-colors cursor-pointer flex flex-col items-center justify-center gap-2 bg-card"
          >
            {icon}
            <span className="text-sm text-muted-foreground">{label}</span>
          </label>
        )}
      </div>
    );
  };

  const renderPhotosStep = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-foreground mb-2">📷 Ajoute des photos</h2>
        <p className="text-muted-foreground">Optionnel - Personnalise ta vidéo</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {renderPhotoUploader('portrait', 'Portrait', <User className="w-8 h-8 text-muted-foreground" />, photoPortrait, setPhotoPortrait)}
        {renderPhotoUploader('village', 'Village', <Home className="w-8 h-8 text-muted-foreground" />, photoVillage, setPhotoVillage)}
        {renderPhotoUploader('context', 'Contexte', <Camera className="w-8 h-8 text-muted-foreground" />, photoContext, setPhotoContext)}
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={goToPrevious} className="gap-2">
          <ChevronLeft className="w-4 h-4" />
          Retour
        </Button>
        <Button
          variant="ghost"
          onClick={() => setCurrentStep('style')}
          className="flex-1 gap-2"
        >
          <SkipForward className="w-4 h-4" />
          Passer
        </Button>
        <Button onClick={goToNext} className="gap-2">
          Continuer
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </motion.div>
  );

  // ==========================================
  // RENDER: STYLE STEP
  // ==========================================

  const renderStyleStep = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-foreground mb-2">🎨 Choisis ton style</h2>
        <p className="text-muted-foreground">Quelle ambiance pour ta vidéo?</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {stylePresets.map((style) => (
          <motion.button
            key={style.id}
            onClick={() => setSelectedStyle(style.id)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
              "relative p-4 rounded-xl text-left transition-all border-2",
              selectedStyle === style.id
                ? "border-primary bg-primary/10 shadow-lg"
                : "border-border bg-card hover:border-primary/50"
            )}
          >
            {selectedStyle === style.id && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute top-2 right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center"
              >
                <Check className="w-4 h-4 text-primary-foreground" />
              </motion.div>
            )}

            <div className="text-3xl mb-2">{style.emoji}</div>
            <h3 className="font-bold text-foreground mb-1">{style.name}</h3>
            <p className="text-xs text-muted-foreground">{style.description}</p>
            
            {/* Color bar */}
            <div 
              className="h-2 rounded-full mt-3"
              style={{
                background: `linear-gradient(to right, ${style.colors.primary}, ${style.colors.secondary}, ${style.colors.accent})`
              }}
            />
          </motion.button>
        ))}
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={goToPrevious} className="gap-2">
          <ChevronLeft className="w-4 h-4" />
          Retour
        </Button>
        <Button
          onClick={goToNext}
          disabled={!canProcess}
          className="flex-1 gap-2 bg-gradient-to-r from-primary to-primary/80"
        >
          <Sparkles className="w-4 h-4" />
          Générer la vidéo
        </Button>
      </div>
    </motion.div>
  );

  // ==========================================
  // RENDER: PROCESSING STEP
  // ==========================================

  const renderProcessingStep = () => (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-12 space-y-6"
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        className="w-20 h-20 border-4 border-primary/30 border-t-primary rounded-full"
      />

      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground mb-2">✨ Création en cours</h2>
        <p className="text-muted-foreground">{processingMessage}</p>
      </div>

      <div className="w-full max-w-xs">
        <Progress value={processingProgress} className="h-3" />
        <p className="text-center text-sm text-muted-foreground mt-2">{processingProgress}%</p>
      </div>

      <div className="flex flex-wrap gap-2 justify-center">
        {photoPortrait && <span className="text-xs bg-muted px-2 py-1 rounded">👤 Portrait</span>}
        {photoVillage && <span className="text-xs bg-muted px-2 py-1 rounded">🏘️ Village</span>}
        {photoContext && <span className="text-xs bg-muted px-2 py-1 rounded">📷 Contexte</span>}
        <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded">
          {stylePresets.find(s => s.id === selectedStyle)?.emoji} {stylePresets.find(s => s.id === selectedStyle)?.name}
        </span>
      </div>
    </motion.div>
  );

  // ==========================================
  // MAIN RENDER
  // ==========================================

  return (
    <div className="min-h-screen bg-background p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        {onBack && (
          <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
            <ChevronLeft className="w-4 h-4" />
            Retour
          </Button>
        )}
        <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
          📻 Radio Village Pro
          <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">PRO</span>
        </h1>
        <div className="w-16" />
      </div>

      {/* Step Indicator */}
      {renderStepIndicator()}

      {/* Content */}
      <div className="max-w-lg mx-auto">
        <AnimatePresence mode="wait">
          {currentStep === 'audio' && renderAudioStep()}
          {currentStep === 'photos' && renderPhotosStep()}
          {currentStep === 'style' && renderStyleStep()}
          {currentStep === 'processing' && renderProcessingStep()}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default RadioVillageProTemplate;
