import { motion } from 'framer-motion';
import { Mic, Square, Loader2, RefreshCw } from 'lucide-react';
import { useState, useCallback, useEffect, useRef } from 'react';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { useUnifiedAudio } from '@/hooks/useUnifiedAudio';
import { useWebSpeechSTT } from '@/hooks/useWebSpeechSTT';
import { useAudioLevel } from '@/hooks/useAudioLevel';
import { useToast } from '@/hooks/use-toast';

interface TamTamMicButtonProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isRecording?: boolean;
  onPress?: () => void;
  onRecordingComplete?: (result: {
    audioBase64: string;
    transcription?: string;
    translation?: string;
    sourceLang: 'ba' | 'fr';
  }) => void;
  autoTranscribe?: boolean;
  autoTranslate?: boolean;
  autoSpeak?: boolean;
  sourceLang?: 'ba' | 'fr';
  disabled?: boolean;
  showAudioLevel?: boolean;
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

// Audio level indicator component
function AudioLevelIndicator({ level, isSpeaking }: { level: number; isSpeaking: boolean }) {
  const bars = 5;
  const barHeights = [20, 35, 50, 35, 20];
  
  return (
    <div className="flex items-end justify-center gap-1 h-8">
      {Array.from({ length: bars }).map((_, i) => {
        const baseHeight = barHeights[i];
        const activeHeight = Math.min(100, baseHeight + (level * 0.6));
        const isBarActive = level > (i * 15);
        
        return (
          <motion.div
            key={i}
            animate={{ 
              height: isBarActive ? `${activeHeight}%` : `${baseHeight * 0.3}%`,
              opacity: isBarActive ? 1 : 0.3
            }}
            transition={{ duration: 0.1 }}
            className={`w-1.5 rounded-full ${
              isSpeaking 
                ? 'bg-green-500' 
                : level > 5 
                  ? 'bg-amber-500' 
                  : 'bg-gray-300'
            }`}
            style={{ minHeight: 4 }}
          />
        );
      })}
    </div>
  );
}

export function TamTamMicButton({ 
  size = 'md', 
  isRecording: externalIsRecording, 
  onPress,
  onRecordingComplete,
  autoTranscribe = false,
  autoTranslate = false,
  autoSpeak = false,
  sourceLang = 'ba',
  disabled = false,
  showAudioLevel = true
}: TamTamMicButtonProps) {
  const { toast } = useToast();
  const [internalRecording, setInternalRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusText, setStatusText] = useState<string>('');
  const [showRetry, setShowRetry] = useState(false);
  
  const audioRecorder = useAudioRecorder();
  const unifiedAudio = useUnifiedAudio();
  const webSpeechSTT = useWebSpeechSTT();
  const audioLevel = useAudioLevel(15);
  
  const isRecording = externalIsRecording !== undefined ? externalIsRecording : internalRecording;

  // Track collected transcript for French via ref to avoid stale closure
  const collectedTranscriptRef = useRef('');
  const recordingStartTimeRef = useRef<number>(0);
  
  // Update collected transcript when Web Speech API provides results
  useEffect(() => {
    if (sourceLang === 'fr' && webSpeechSTT.transcript) {
      collectedTranscriptRef.current = webSpeechSTT.transcript;
      console.log('[TamTamMicButton] 🇫🇷 Collected French transcript:', webSpeechSTT.transcript);
    }
  }, [sourceLang, webSpeechSTT.transcript]);

  // Show interim results or audio level feedback
  useEffect(() => {
    if (isRecording) {
      if (webSpeechSTT.interimTranscript) {
        setStatusText(`"${webSpeechSTT.interimTranscript.substring(0, 30)}..."`);
      } else if (audioLevel.isSpeaking) {
        setStatusText('🎤 Bonne intensité!');
      } else if (audioLevel.level > 0 && audioLevel.level < 15) {
        setStatusText('🔇 Parlez plus fort...');
      }
    }
  }, [isRecording, webSpeechSTT.interimTranscript, audioLevel.isSpeaking, audioLevel.level]);

  const handlePress = useCallback(async () => {
    if (disabled) return;
    
    if (onRecordingComplete) {
      if (!isRecording && !audioRecorder.isRecording) {
        // === START RECORDING ===
        console.log('[TamTamMicButton] 🎙️ Starting recording, sourceLang:', sourceLang);
        setInternalRecording(true);
        setShowRetry(false);
        collectedTranscriptRef.current = '';
        recordingStartTimeRef.current = Date.now();
        setStatusText(sourceLang === 'fr' ? '🎤 Parlez en français...' : '🎤 Parlez en bariba...');
        
        if (sourceLang === 'fr') {
          // === FRENCH: Web Speech API ONLY (no audio recording needed for STT) ===
          // But we still record audio for potential upload
          console.log('[TamTamMicButton] 🇫🇷 French mode - Starting Web Speech API + audio recording');
          
          // Start audio recording first to get the stream
          const stream = await audioRecorder.startRecording();
          
          // Share the stream with audio level monitoring (avoid multiple stream conflicts)
          if (showAudioLevel && stream) {
            audioLevel.startMonitoring(stream);
          }
          
          // Start Web Speech API (uses browser's native microphone access, separate from our stream)
          webSpeechSTT.resetTranscript();
          webSpeechSTT.startListening();
          
        } else {
          // === BARIBA: Audio recording ONLY (Web Speech doesn't support Bariba) ===
          console.log('[TamTamMicButton] 🔊 Bariba mode - Audio recording only');
          
          const stream = await audioRecorder.startRecording();
          
          // Share the stream with audio level monitoring
          if (showAudioLevel && stream) {
            audioLevel.startMonitoring(stream);
          }
        }
        
        toast({
          title: sourceLang === 'fr' ? "🎤 Parlez en français..." : "🎤 Parlez en bariba...",
          description: "Appuyez à nouveau pour arrêter (min 2s)"
        });
        
      } else {
        // === STOP RECORDING ===
        console.log('[TamTamMicButton] ⏹️ Stopping recording...');
        setInternalRecording(false);
        setStatusText('⏳ Traitement...');
        setIsProcessing(true);
        
        // Stop audio level monitoring
        audioLevel.stopMonitoring();
        
        const recordingDuration = Math.floor((Date.now() - recordingStartTimeRef.current) / 1000);
        console.log('[TamTamMicButton] Recording duration:', recordingDuration, 'seconds');
        
        // Check minimum duration (increased to 2 seconds for better detection)
        if (recordingDuration < 2) {
          toast({
            title: "⚠️ Enregistrement trop court",
            description: "Parlez au moins 2 secondes pour une meilleure détection",
            variant: "destructive"
          });
          setIsProcessing(false);
          setStatusText('');
          audioRecorder.cancelRecording();
          if (sourceLang === 'fr') {
            webSpeechSTT.stopListening();
          }
          return;
        }
        
        try {
          // Stop audio recording
          const audioBase64 = await audioRecorder.stopRecording();
          console.log('[TamTamMicButton] ✅ Audio base64 length:', audioBase64?.length || 0);
          
          // Stop Web Speech if running (for French)
          if (sourceLang === 'fr') {
            webSpeechSTT.stopListening();
            // INCREASED delay to let Web Speech finish processing (800ms instead of 300ms)
            await new Promise(r => setTimeout(r, 800));
          }
          
          let transcription: string | undefined;
          let translation: string | undefined;
          
          if (autoTranscribe) {
            setStatusText('📝 Transcription...');
            
            if (sourceLang === 'fr') {
              // === FRENCH STT ===
              // Get transcript from Web Speech API (use ref to avoid stale value)
              transcription = webSpeechSTT.transcript || collectedTranscriptRef.current || undefined;
              
              console.log('[TamTamMicButton] 🇫🇷 French transcription result:', {
                fromState: webSpeechSTT.transcript,
                fromRef: collectedTranscriptRef.current,
                final: transcription
              });
              
              if (!transcription) {
                console.warn('[TamTamMicButton] ⚠️ No French transcription from Web Speech API');
                setShowRetry(true);
                toast({
                  title: "⚠️ Aucune parole détectée",
                  description: "Parlez plus fort et plus longtemps (3-5 secondes). Bouton réessayer disponible.",
                  variant: "destructive"
                });
              } else {
                console.log('[TamTamMicButton] ✅ French transcription:', transcription);
                toast({
                  title: "✅ Transcription réussie",
                  description: transcription.substring(0, 50) + (transcription.length > 50 ? '...' : '')
                });
              }
              
              // Translate to Bariba if requested
              if (autoTranslate && transcription) {
                setStatusText('🔄 Traduction vers Bariba...');
                const result = await unifiedAudio.translate(transcription, 'fr', 'ba');
                translation = result.translation;
                console.log('[TamTamMicButton] Translation fr→ba:', translation);
              }
              
            } else {
              // === BARIBA STT ===
              if (!audioBase64 || audioBase64.length < 100) {
                console.error('[TamTamMicButton] ❌ No/insufficient audio data for Bariba STT');
                setShowRetry(true);
                toast({
                  title: "❌ Erreur audio",
                  description: "Aucune donnée audio enregistrée. Réessayez.",
                  variant: "destructive"
                });
                setIsProcessing(false);
                setStatusText('');
                return;
              }
              
              console.log('[TamTamMicButton] 🔄 Sending to Bariba STT, audio length:', audioBase64.length);
              setStatusText('🔄 Transcription Bariba...');
              
              const result = await unifiedAudio.transcribeWithTranslation(audioBase64, sourceLang);
              console.log('[TamTamMicButton] 🔊 Bariba STT result:', result);
              
              transcription = result.transcription || undefined;
              
              if (!transcription) {
                setShowRetry(true);
                toast({
                  title: "⚠️ Transcription échouée",
                  description: "Le service Bariba n'a pas pu transcrire. Parlez plus clairement et réessayez.",
                  variant: "destructive"
                });
              } else {
                toast({
                  title: "✅ Transcription Bariba",
                  description: transcription.substring(0, 50) + (transcription.length > 50 ? '...' : '')
                });
              }
              
              if (autoTranslate && result.transcription) {
                translation = result.transcription_fr;
                console.log('[TamTamMicButton] Translation ba→fr:', translation);
              }
            }
            
            // Auto-speak translation if enabled
            if (autoSpeak && translation) {
              setStatusText('🔊 Lecture...');
              const targetLang = sourceLang === 'ba' ? 'fr' : 'ba';
              await unifiedAudio.speak(translation, targetLang);
            }
          }
          
          // Callback with results
          onRecordingComplete({
            audioBase64: audioBase64 || '',
            transcription,
            translation,
            sourceLang
          });
          
        } catch (err) {
          console.error('[TamTamMicButton] ❌ Recording error:', err);
          setShowRetry(true);
          toast({
            title: "❌ Erreur",
            description: err instanceof Error ? err.message : "Impossible de traiter l'enregistrement",
            variant: "destructive"
          });
        } finally {
          setIsProcessing(false);
          setStatusText('');
        }
      }
    } else {
      // Simple toggle mode for backward compatibility
      onPress?.();
    }
  }, [
    disabled, isRecording, audioRecorder, onRecordingComplete, 
    autoTranscribe, autoTranslate, autoSpeak, sourceLang, unifiedAudio, 
    webSpeechSTT, onPress, toast, showAudioLevel, audioLevel
  ]);

  const showRecordingState = isRecording || audioRecorder.isRecording;
  
  return (
    <div className="flex flex-col items-center gap-2">
      {/* Audio Level Indicator - above button when recording */}
      {showAudioLevel && showRecordingState && !isProcessing && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className="mb-1"
        >
          <AudioLevelIndicator level={audioLevel.level} isSpeaking={audioLevel.isSpeaking} />
        </motion.div>
      )}
      
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
              className={`absolute inset-0 ${audioLevel.isSpeaking ? 'bg-green-500' : 'bg-tamtam-primary'} rounded-full`}
            />
            <motion.div
              animate={{ scale: [1, 1.6], opacity: [0.3, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
              className={`absolute inset-0 ${audioLevel.isSpeaking ? 'bg-green-500' : 'bg-tamtam-primary'} rounded-full`}
            />
            <motion.div
              animate={{ scale: [1, 1.8], opacity: [0.2, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.6 }}
              className={`absolute inset-0 ${audioLevel.isSpeaking ? 'bg-green-500' : 'bg-tamtam-primary'} rounded-full`}
            />
          </>
        )}

        {/* Main button */}
        <div
          className={`${sizeClasses[size]} rounded-full flex items-center justify-center transition-all ${
            isProcessing
              ? 'bg-amber-500 shadow-lg shadow-amber-500/40'
              : showRecordingState
                ? audioLevel.isSpeaking 
                  ? 'bg-green-500 shadow-lg shadow-green-500/40'
                  : 'bg-red-500 shadow-lg shadow-red-500/40'
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
                    animate={{ height: [8, 8 + (audioLevel.level * 0.2), 8] }}
                    transition={{ duration: 0.3, repeat: Infinity, delay: i * 0.1 }}
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
      
      {/* Status text */}
      {statusText && (
        <motion.p
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className={`text-xs text-center max-w-[150px] truncate ${
            audioLevel.isSpeaking ? 'text-green-600 font-medium' : 'text-muted-foreground'
          }`}
        >
          {statusText}
        </motion.p>
      )}
      
      {/* Retry button when transcription fails */}
      {showRetry && !isProcessing && !showRecordingState && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={() => {
            setShowRetry(false);
            handlePress();
          }}
          className="flex items-center gap-1 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-full text-xs font-medium"
        >
          <RefreshCw className="w-3 h-3" />
          Réessayer
        </motion.button>
      )}
    </div>
  );
}
