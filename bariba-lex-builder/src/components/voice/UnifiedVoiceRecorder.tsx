import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, X, Send, Play, Pause, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface UnifiedVoiceRecorderProps {
  language: 'bariba' | 'french';
  onComplete: (audioBase64: string) => void;
  onCancel?: () => void;
  showPreview?: boolean;
  maxDuration?: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  autoStop?: boolean;
  disabled?: boolean;
}

interface RecorderState {
  status: 'idle' | 'recording' | 'preview' | 'sending' | 'error';
  duration: number;
  audioLevel: number;
  error: string | null;
  errorAction?: string;
}

const AUDIO_LEVEL_BARS = 12;

export function UnifiedVoiceRecorder({
  language,
  onComplete,
  onCancel,
  showPreview = false,
  maxDuration = 30,
  className,
  size = 'lg',
  autoStop = false,
  disabled = false,
}: UnifiedVoiceRecorderProps) {
  const [state, setState] = useState<RecorderState>({
    status: 'idle',
    duration: 0,
    audioLevel: 0,
    error: null,
  });
  
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Ref pour éviter la race condition sur l'état recording
  const isRecordingRef = useRef<boolean>(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioBase64Ref = useRef<string | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  // Auto-stop at max duration
  useEffect(() => {
    if (state.duration >= maxDuration && state.status === 'recording') {
      handleStopRecording();
    }
  }, [state.duration, maxDuration]);

  const cleanup = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
  }, [audioUrl]);

  const updateAudioLevel = useCallback(() => {
    if (!analyserRef.current || state.status !== 'recording') return;
    
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    // Calculate average level
    const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
    const normalizedLevel = Math.min(average / 128, 1);
    
    setState(prev => ({ ...prev, audioLevel: normalizedLevel }));
    
    animationRef.current = requestAnimationFrame(updateAudioLevel);
  }, [state.status]);

  const handleStartRecording = useCallback(async () => {
    console.log('[UnifiedVoiceRecorder] 🎤 Starting recording...');
    
    // Mettre à jour la ref AVANT le state pour éviter la race condition
    isRecordingRef.current = true;
    
    try {
      setState(prev => ({ ...prev, error: null, status: 'recording' }));
      
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });

      console.log('[UnifiedVoiceRecorder] ✅ Microphone access granted');
      
      streamRef.current = stream;
      chunksRef.current = [];

      // Setup audio analyser for level monitoring
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
          ? 'audio/webm;codecs=opus' 
          : 'audio/webm'
      });

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
          console.log(`[UnifiedVoiceRecorder] 📦 Data chunk: ${e.data.size} bytes (total chunks: ${chunksRef.current.length})`);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(100);
      console.log('[UnifiedVoiceRecorder] 🔴 MediaRecorder started');

      // Start duration timer
      const startTime = Date.now();
      timerRef.current = window.setInterval(() => {
        setState(prev => ({
          ...prev,
          duration: Math.floor((Date.now() - startTime) / 1000)
        }));
      }, 100);

      // Start audio level monitoring
      updateAudioLevel();

    } catch (error: any) {
      console.error('[UnifiedVoiceRecorder] ❌ Start error:', error);
      isRecordingRef.current = false;
      setState(prev => ({
        ...prev,
        status: 'error',
        error: 'Impossible d\'accéder au microphone',
        errorAction: 'Vérifiez les permissions du navigateur',
      }));
    }
  }, [updateAudioLevel]);

  const handleStopRecording = useCallback(async () => {
    console.log('[UnifiedVoiceRecorder] ⏹️ Stopping recording...', { isRecording: isRecordingRef.current });
    
    // Utiliser la ref au lieu de state pour éviter la race condition
    if (!isRecordingRef.current) {
      console.log('[UnifiedVoiceRecorder] ⚠️ Not recording, ignoring stop');
      return;
    }
    
    isRecordingRef.current = false;
    
    if (timerRef.current) clearInterval(timerRef.current);
    if (animationRef.current) cancelAnimationFrame(animationRef.current);

    return new Promise<void>((resolve) => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.onstop = async () => {
          console.log(`[UnifiedVoiceRecorder] 📝 Recording stopped. Chunks: ${chunksRef.current.length}`);
          
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
          }
          if (audioContextRef.current) {
            audioContextRef.current.close();
          }

          if (chunksRef.current.length > 0) {
            const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
            console.log(`[UnifiedVoiceRecorder] 📦 Created blob: ${blob.size} bytes`);
            
            // Convert to base64
            const base64 = await blobToBase64(blob);
            console.log(`[UnifiedVoiceRecorder] 🔄 Converted to base64: ${base64.length} chars`);
            audioBase64Ref.current = base64;
            
            if (showPreview) {
              const url = URL.createObjectURL(blob);
              setAudioUrl(url);
              setState(prev => ({ ...prev, status: 'preview', audioLevel: 0 }));
            } else {
              // Direct send
              console.log(`[UnifiedVoiceRecorder] 📤 Calling onComplete with ${base64.length} chars`);
              onComplete(base64);
              setState({ status: 'idle', duration: 0, audioLevel: 0, error: null });
            }
          } else {
            console.warn('[UnifiedVoiceRecorder] ⚠️ No audio chunks recorded');
            setState(prev => ({
              ...prev,
              status: 'error',
              error: 'Enregistrement trop court',
              errorAction: 'Maintenez le bouton plus longtemps',
            }));
          }
          resolve();
        };

        mediaRecorderRef.current.stop();
      } else {
        console.log('[UnifiedVoiceRecorder] ⚠️ MediaRecorder not active');
        resolve();
      }
    });
  }, [showPreview, onComplete]);

  const handleCancel = useCallback(() => {
    cleanup();
    chunksRef.current = [];
    audioBase64Ref.current = null;
    setAudioUrl(null);
    setState({ status: 'idle', duration: 0, audioLevel: 0, error: null });
    onCancel?.();
  }, [cleanup, onCancel]);

  const handleSend = useCallback(() => {
    if (audioBase64Ref.current) {
      setState(prev => ({ ...prev, status: 'sending' }));
      onComplete(audioBase64Ref.current);
      
      // Reset after sending
      setTimeout(() => {
        audioBase64Ref.current = null;
        setAudioUrl(null);
        setState({ status: 'idle', duration: 0, audioLevel: 0, error: null });
      }, 500);
    }
  }, [onComplete]);

  const handlePlayPreview = useCallback(() => {
    if (!audioUrl) return;
    
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current = new Audio(audioUrl);
      audioRef.current.onended = () => setIsPlaying(false);
      audioRef.current.play();
      setIsPlaying(true);
    }
  }, [audioUrl, isPlaying]);

  const handleRetry = useCallback(() => {
    setState({ status: 'idle', duration: 0, audioLevel: 0, error: null });
  }, []);

  // Size variants
  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32',
  };

  const iconSizes = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
  };

  const langColors = language === 'bariba' 
    ? 'from-orange-500 to-amber-600' 
    : 'from-blue-500 to-indigo-600';

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      {/* Waveform / Level Indicator */}
      <AnimatePresence>
        {state.status === 'recording' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-end justify-center gap-1 h-16"
          >
            {Array.from({ length: AUDIO_LEVEL_BARS }).map((_, i) => {
              const barHeight = Math.max(
                4,
                Math.sin((i / AUDIO_LEVEL_BARS) * Math.PI) * state.audioLevel * 60
              );
              return (
                <motion.div
                  key={i}
                  animate={{ height: barHeight }}
                  transition={{ duration: 0.05 }}
                  className={cn(
                    "w-2 rounded-full bg-gradient-to-t",
                    langColors
                  )}
                />
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Button */}
      <div className="relative">
        {/* Pulsing ring when recording */}
        <AnimatePresence>
          {state.status === 'recording' && (
            <motion.div
              initial={{ scale: 1, opacity: 0.5 }}
              animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.2, 0.5] }}
              exit={{ scale: 1, opacity: 0 }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className={cn(
                "absolute inset-0 -m-4 rounded-full bg-gradient-to-br",
                langColors
              )}
            />
          )}
        </AnimatePresence>

        {/* Error state */}
        {state.status === 'error' ? (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center gap-3"
          >
            <div className={cn(
              "rounded-full flex items-center justify-center bg-destructive/10 border-2 border-destructive",
              sizeClasses[size]
            )}>
              <AlertCircle className={cn(iconSizes[size], "text-destructive")} />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-destructive">{state.error}</p>
              {state.errorAction && (
                <p className="text-xs text-muted-foreground mt-1">{state.errorAction}</p>
              )}
            </div>
            <Button size="sm" variant="outline" onClick={handleRetry}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Réessayer
            </Button>
          </motion.div>
        ) : state.status === 'preview' ? (
          // Preview controls
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center gap-3"
          >
            <Button
              size="icon"
              variant="outline"
              onClick={handleCancel}
              className="h-12 w-12 rounded-full"
            >
              <X className="h-5 w-5" />
            </Button>
            
            <Button
              size="icon"
              variant="outline"
              onClick={handlePlayPreview}
              className="h-14 w-14 rounded-full"
            >
              {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
            </Button>
            
            <Button
              size="icon"
              onClick={handleSend}
              className={cn(
                "h-14 w-14 rounded-full bg-gradient-to-br text-white",
                langColors
              )}
            >
              <Send className="h-6 w-6" />
            </Button>
          </motion.div>
        ) : state.status === 'sending' ? (
          <div className={cn(
            "rounded-full flex items-center justify-center bg-muted animate-pulse",
            sizeClasses[size]
          )}>
            <Loader2 className={cn(iconSizes[size], "animate-spin text-muted-foreground")} />
          </div>
        ) : (
          // Main record button
          <motion.button
            whileTap={{ scale: 0.95 }}
            onMouseDown={handleStartRecording}
            onMouseUp={handleStopRecording}
            onMouseLeave={() => state.status === 'recording' && handleStopRecording()}
            onTouchStart={handleStartRecording}
            onTouchEnd={handleStopRecording}
            disabled={disabled}
            className={cn(
              "rounded-full flex items-center justify-center transition-all shadow-xl",
              sizeClasses[size],
              state.status === 'recording'
                ? `bg-gradient-to-br ${langColors} ring-4 ring-offset-2 ring-offset-background`
                : disabled
                  ? 'bg-muted cursor-not-allowed'
                  : 'bg-gradient-to-br from-primary to-primary/80 hover:shadow-primary/30',
              language === 'bariba' && state.status === 'recording' && 'ring-orange-400',
              language === 'french' && state.status === 'recording' && 'ring-blue-400'
            )}
          >
            {state.status === 'recording' ? (
              <MicOff className={cn(iconSizes[size], "text-white")} />
            ) : (
              <Mic className={cn(iconSizes[size], "text-white")} />
            )}
          </motion.button>
        )}
      </div>

      {/* Duration / Status */}
      <AnimatePresence mode="wait">
        <motion.div
          key={state.status}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          className="text-center min-h-[40px]"
        >
          {state.status === 'idle' && (
            <p className="text-sm text-muted-foreground">
              Maintenez pour parler {language === 'bariba' ? '🇧🇯' : '🇫🇷'}
            </p>
          )}
          {state.status === 'recording' && (
            <div className="space-y-1">
              <p className="text-lg font-mono font-medium">
                {formatDuration(state.duration)}
              </p>
              <p className="text-xs text-muted-foreground">
                Relâchez pour envoyer • Max {maxDuration}s
              </p>
            </div>
          )}
          {state.status === 'preview' && (
            <p className="text-sm text-muted-foreground">
              {formatDuration(state.duration)} • Prévisualisation
            </p>
          )}
          {state.status === 'sending' && (
            <p className="text-sm text-muted-foreground animate-pulse">
              Envoi en cours...
            </p>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// Helper function
async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      const base64Data = base64.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export default UnifiedVoiceRecorder;
