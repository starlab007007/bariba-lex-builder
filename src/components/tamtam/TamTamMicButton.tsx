import { motion } from 'framer-motion';
import { Mic, Square, Loader2 } from 'lucide-react';
import { useState, useCallback, useEffect, useRef } from 'react';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { useUnifiedAudio } from '@/hooks/useUnifiedAudio';
import { useWebSpeechSTT } from '@/hooks/useWebSpeechSTT';
import { useToast } from '@/hooks/use-toast';

interface TamTamMicButtonProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isRecording?: boolean;
  onPress?: () => void;
  // New props for full voice pipeline
  onRecordingComplete?: (result: {
    audioBase64: string;
    transcription?: string;
    translation?: string;
    sourceLang: 'ba' | 'fr';
  }) => void;
  autoTranscribe?: boolean;
  autoTranslate?: boolean;
  autoSpeak?: boolean; // NEW: auto-speak translation
  sourceLang?: 'ba' | 'fr';
  disabled?: boolean;
}

const sizeClasses = {
  sm: 'w-12 h-12',
  md: 'w-16 h-16',
  lg: 'w-20 h-20',
  xl: 'w-32 h-32',
};

const iconSizes = {
  sm: 'w-5 h-5',
  md: 'w-7 h-7',
  lg: 'w-9 h-9',
  xl: 'w-14 h-14',
};

export function TamTamMicButton({ 
  size = 'md', 
  isRecording: externalIsRecording, 
  onPress,
  onRecordingComplete,
  autoTranscribe = false,
  autoTranslate = false,
  autoSpeak = false,
  sourceLang = 'ba',
  disabled = false
}: TamTamMicButtonProps) {
  const { toast } = useToast();
  const [internalRecording, setInternalRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const audioRecorder = useAudioRecorder();
  const unifiedAudio = useUnifiedAudio();
  const webSpeechSTT = useWebSpeechSTT(); // For French live transcription
  
  // Use external control if provided, otherwise internal
  const isRecording = externalIsRecording !== undefined ? externalIsRecording : internalRecording;

  // Track Web Speech transcript for French
  const [frenchTranscript, setFrenchTranscript] = useState('');
  
  // Update French transcript from Web Speech API
  useEffect(() => {
    if (sourceLang === 'fr' && webSpeechSTT.transcript) {
      setFrenchTranscript(webSpeechSTT.transcript);
    }
  }, [sourceLang, webSpeechSTT.transcript]);

  const handlePress = useCallback(async () => {
    if (disabled) return;
    
    // If we have a callback for complete pipeline
    if (onRecordingComplete) {
      if (!isRecording && !audioRecorder.isRecording) {
        // Start recording
        setInternalRecording(true);
        setFrenchTranscript('');
        
        if (sourceLang === 'fr') {
          // For French: use Web Speech API for live transcription
          webSpeechSTT.resetTranscript();
          webSpeechSTT.startListening();
        }
        
        // Also record audio (for Bariba or as backup)
        await audioRecorder.startRecording();
      } else {
        // Stop recording and process
        setInternalRecording(false);
        setIsProcessing(true);
        
        try {
          // Stop audio recording
          const audioBase64 = await audioRecorder.stopRecording();
          
          // Stop Web Speech if it was running (for French)
          if (sourceLang === 'fr') {
            webSpeechSTT.stopListening();
          }
          
          let transcription: string | undefined;
          let translation: string | undefined;
          
          if (autoTranscribe) {
            if (sourceLang === 'fr') {
              // For French: use the Web Speech API transcript (already collected)
              transcription = webSpeechSTT.transcript || frenchTranscript || undefined;
              
              if (!transcription) {
                console.log('[TamTamMicButton] No French transcription from Web Speech API');
              } else {
                console.log('[TamTamMicButton] French transcription from Web Speech:', transcription);
              }
              
              // If we want translation, translate to Bariba
              if (autoTranslate && transcription) {
                const result = await unifiedAudio.translate(transcription, 'fr', 'ba');
                translation = result.translation;
              }
            } else {
              // For Bariba: use server-side HuggingFace STT
              if (!audioBase64) {
                setIsProcessing(false);
                return;
              }
              
              const result = await unifiedAudio.transcribeWithTranslation(
                audioBase64, 
                sourceLang
              );
              
              transcription = result.transcription || undefined;
              
              if (autoTranslate && result.transcription) {
                translation = result.transcription_fr;
              }
            }
            
            if (transcription) {
              toast({
                title: "✅ Transcription",
                description: transcription.substring(0, 50) + (transcription.length > 50 ? '...' : '')
              });
            }
            
            // Auto-speak translation if enabled
            if (autoSpeak && translation) {
              const targetLang = sourceLang === 'ba' ? 'fr' : 'ba';
              await unifiedAudio.speak(translation, targetLang);
            }
          }
          
          onRecordingComplete({
            audioBase64: audioBase64 || '',
            transcription,
            translation,
            sourceLang
          });
        } catch (err) {
          console.error('[TamTamMicButton] Recording error:', err);
          toast({
            title: "❌ Erreur",
            description: "Impossible de traiter l'enregistrement",
            variant: "destructive"
          });
        } finally {
          setIsProcessing(false);
        }
      }
    } else {
      // Simple toggle mode for backward compatibility
      onPress?.();
    }
  }, [
    disabled, isRecording, audioRecorder, onRecordingComplete, 
    autoTranscribe, autoTranslate, autoSpeak, sourceLang, unifiedAudio, 
    webSpeechSTT, frenchTranscript, onPress, toast
  ]);

  const showRecordingState = isRecording || audioRecorder.isRecording;
  
  return (
    <motion.button
      onClick={handlePress}
      whileTap={{ scale: 0.95 }}
      className="relative"
      disabled={disabled || isProcessing}
    >
      {/* Animated rings when recording */}
      {showRecordingState && (
        <>
          <motion.div
            animate={{ scale: [1, 1.4], opacity: [0.4, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className={`absolute inset-0 bg-tamtam-primary rounded-full`}
          />
          <motion.div
            animate={{ scale: [1, 1.6], opacity: [0.3, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
            className={`absolute inset-0 bg-tamtam-primary rounded-full`}
          />
          <motion.div
            animate={{ scale: [1, 1.8], opacity: [0.2, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.6 }}
            className={`absolute inset-0 bg-tamtam-primary rounded-full`}
          />
        </>
      )}

      {/* Main button */}
      <div
        className={`${sizeClasses[size]} rounded-full flex items-center justify-center transition-all ${
          isProcessing
            ? 'bg-amber-500 shadow-lg shadow-amber-500/40'
            : showRecordingState
              ? 'bg-red-500 shadow-lg shadow-red-500/40'
              : 'bg-tamtam-primary shadow-tamtam-soft'
        } ${disabled ? 'opacity-50' : ''}`}
      >
        {isProcessing ? (
          <Loader2 className={`${iconSizes[size]} text-white animate-spin`} />
        ) : showRecordingState ? (
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 0.5, repeat: Infinity }}
            className="flex items-center justify-center gap-1"
          >
            {size === 'xl' ? (
              <Square className={`${iconSizes[size]} text-white`} />
            ) : (
              [...Array(3)].map((_, i) => (
                <motion.div
                  key={i}
                  animate={{ height: [8, 20, 8] }}
                  transition={{ duration: 0.4, repeat: Infinity, delay: i * 0.1 }}
                  className="w-1 bg-white rounded-full"
                  style={{ height: 8 }}
                />
              ))
            )}
          </motion.div>
        ) : (
          <Mic className={`${iconSizes[size]} text-white`} />
        )}
      </div>
      
      {/* Duration indicator */}
      {showRecordingState && audioRecorder.duration > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs font-medium text-red-500"
        >
          {Math.floor(audioRecorder.duration / 60)}:{(audioRecorder.duration % 60).toString().padStart(2, '0')}
        </motion.div>
      )}
    </motion.button>
  );
}
