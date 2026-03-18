import { useState, useEffect, useCallback, useRef } from 'react';
import { Mic, Square, Send, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { useVoiceDetection } from '@/hooks/useVoiceDetection';
import { useFrenchSTT } from '@/hooks/useFrenchSTT';
import { triggerFeedback } from '@/utils/tamtamFeedback';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface SimpleVoiceRecorderProps {
  onRecordingComplete: (audioBase64: string, duration: number, liveTranscript?: string) => void;
  onRecordingStart?: () => void;
  onCancel?: () => void;
  disabled?: boolean;
  className?: string;
  autoMode?: boolean;
  language?: 'bariba' | 'french';
}

export const SimpleVoiceRecorder = ({
  onRecordingComplete,
  onRecordingStart,
  onCancel,
  disabled = false,
  className,
  autoMode = true,
  language = 'french'
}: SimpleVoiceRecorderProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const silenceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const liveTranscriptRef = useRef<string>('');
  
  const {
    isRecording,
    duration,
    error,
    startRecording,
    stopRecording,
    cancelRecording
  } = useAudioRecorder();

  const {
    isSpeaking,
    startDetection,
    stopDetection,
    onSpeechStart,
    onSpeechEnd
  } = useVoiceDetection();
  
  // Web Speech API pour le français
  const {
    startListening: startFrenchSTT,
    stopListening: stopFrenchSTT,
    transcript: frenchTranscript,
    interimTranscript: frenchInterim,
    isListening: isFrenchSTTListening,
    isSupported: isFrenchSTTSupported
  } = useFrenchSTT();
  
  // Mettre à jour la transcription live pour le français
  useEffect(() => {
    if (language === 'french') {
      liveTranscriptRef.current = frenchTranscript + frenchInterim;
    }
  }, [language, frenchTranscript, frenchInterim]);
  
  // Démarrer le STT français lors de l'enregistrement
  useEffect(() => {
    if (language === 'french' && isFrenchSTTSupported) {
      if (isRecording && !isFrenchSTTListening) {
        startFrenchSTT();
      } else if (!isRecording && isFrenchSTTListening) {
        stopFrenchSTT();
      }
    }
  }, [language, isRecording, isFrenchSTTSupported, isFrenchSTTListening, startFrenchSTT, stopFrenchSTT]);

  // Feedback sonore au démarrage de l'enregistrement
  useEffect(() => {
    if (isRecording) {
      triggerFeedback('record', { sound: true, haptic: true, volume: 0.5 });
    }
  }, [isRecording]);

  // Auto-start when speech detected
  const handleSpeechStart = useCallback(async () => {
    if (!isRecording && isListening) {
      // Clear any pending silence timeout
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = null;
      }
      await startRecording();
      onRecordingStart?.();
    }
  }, [isRecording, isListening, startRecording, onRecordingStart]);

  // Auto-send after silence
  const handleSpeechEnd = useCallback(async (speechDuration: number) => {
    if (isRecording && isListening && speechDuration >= 500) {
      // Wait a bit more for potential continuation
      silenceTimeoutRef.current = setTimeout(async () => {
        setIsProcessing(true);
        const audioBase64 = await stopRecording();
        setIsProcessing(false);
        
        if (audioBase64) {
          triggerFeedback('send', { sound: true, haptic: true, volume: 0.4 });
          onRecordingComplete(audioBase64, duration, liveTranscriptRef.current);
          liveTranscriptRef.current = ''; // Reset
          stopDetection();
          setIsListening(false);
        }
      }, 1000); // 1 second of silence before auto-send
    }
  }, [isRecording, isListening, stopRecording, onRecordingComplete, duration, stopDetection]);

  // Register VAD callbacks
  useEffect(() => {
    onSpeechStart(handleSpeechStart);
    onSpeechEnd(handleSpeechEnd);
  }, [onSpeechStart, onSpeechEnd, handleSpeechStart, handleSpeechEnd]);

  // Start listening
  const startListening = async () => {
    try {
      liveTranscriptRef.current = ''; // Reset
      triggerFeedback('click', { sound: true, haptic: true });
      if (autoMode) {
        await startDetection();
        setIsListening(true);
      } else {
        await startRecording();
        onRecordingStart?.();
      }
    } catch (err) {
      console.error('Failed to start:', err);
      triggerFeedback('error', { sound: true, haptic: true });
    }
  };

  // Stop and send
  const handleSend = async () => {
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
    }
    
    setIsProcessing(true);
    const audioBase64 = await stopRecording();
    setIsProcessing(false);
    
    if (audioBase64) {
      triggerFeedback('send', { sound: true, haptic: true, volume: 0.4 });
      onRecordingComplete(audioBase64, duration, liveTranscriptRef.current);
      liveTranscriptRef.current = ''; // Reset
    }
    
    if (isListening) {
      stopDetection();
      setIsListening(false);
    }
  };

  // Cancel
  const handleCancel = () => {
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
    }
    
    triggerFeedback('error', { sound: true, haptic: true, volume: 0.3 });
    cancelRecording();
    if (isListening) {
      stopDetection();
      setIsListening(false);
    }
    onCancel?.();
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
      if (isListening) {
        stopDetection();
      }
    };
  }, [isListening, stopDetection]);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isActive = isRecording || isListening;

  return (
    <div className={cn("flex flex-col items-center gap-6 py-4", className)}>
      {/* Main Button - HUGE for illiterate users */}
      <div className="relative">
        {/* Pulsing ring when active */}
        <AnimatePresence>
          {isActive && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1.2, opacity: 0.3 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ repeat: Infinity, duration: 1, ease: "easeInOut" }}
              className="absolute inset-0 -m-4 rounded-full bg-destructive"
            />
          )}
        </AnimatePresence>

        <Button
          size="lg"
          variant={isActive ? "destructive" : "default"}
          className={cn(
            "w-24 h-24 rounded-full transition-all shadow-2xl",
            isActive && "ring-4 ring-destructive/50 animate-pulse",
            !isActive && "bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
          )}
          onClick={isActive ? handleSend : startListening}
          disabled={disabled || isProcessing}
        >
          {isProcessing ? (
            <Loader2 className="h-12 w-12 animate-spin" />
          ) : isRecording ? (
            <Square className="h-12 w-12 fill-current" />
          ) : isListening ? (
            <Mic className="h-12 w-12 animate-pulse" />
          ) : (
            <Mic className="h-12 w-12" />
          )}
        </Button>
      </div>

      {/* Sound Wave Animation */}
      {isRecording && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-1 h-12"
        >
          {Array.from({ length: 7 }).map((_, i) => (
            <motion.div
              key={i}
              className="w-2 bg-destructive rounded-full"
              animate={{
                height: [8, 24 + Math.random() * 16, 8],
              }}
              transition={{
                repeat: Infinity,
                duration: 0.5 + Math.random() * 0.3,
                delay: i * 0.1,
              }}
            />
          ))}
        </motion.div>
      )}

      {/* Timer - BIG numbers */}
      {isRecording && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="text-4xl font-bold text-destructive tabular-nums"
        >
          {formatDuration(duration)}
        </motion.div>
      )}

      {/* Control Buttons */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            className="flex items-center gap-8"
          >
            {/* Cancel Button - Red X */}
            <Button
              size="lg"
              variant="outline"
              className="w-16 h-16 rounded-full border-2 border-destructive text-destructive hover:bg-destructive hover:text-white"
              onClick={handleCancel}
              disabled={isProcessing}
            >
              <X className="h-8 w-8" />
            </Button>

            {/* Send Button - Green Check */}
            <Button
              size="lg"
              className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 text-white"
              onClick={handleSend}
              disabled={isProcessing || duration < 1}
            >
              <Send className="h-8 w-8" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Simple Status Indicator - Visual only, no text */}
      <div className="flex items-center gap-2">
        {isListening && !isRecording && (
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="w-3 h-3 rounded-full bg-yellow-500"
          />
        )}
        {isRecording && (
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 0.5 }}
            className="w-3 h-3 rounded-full bg-red-500"
          />
        )}
        {!isActive && !isProcessing && (
          <div className="w-3 h-3 rounded-full bg-green-500" />
        )}
        {isProcessing && (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Error Display */}
      {error && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm text-destructive bg-destructive/10 px-4 py-2 rounded-full"
        >
          ⚠️
        </motion.div>
      )}
    </div>
  );
};
