import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Volume2, Loader2, RefreshCw, ArrowRightLeft, Pause, Play, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { useBaribaSTT } from '@/hooks/useBaribaSTT';
import { useFrenchSTTBase64 } from '@/hooks/useFrenchSTTBase64';
import { useFrenchSTT } from '@/hooks/useFrenchSTT';
import { useBaribaTTS } from '@/hooks/useBaribaTTS';
import { useFrenchTTS } from '@/hooks/useFrenchTTS';
import { useHybridTranslation } from '@/hooks/useHybridTranslation';
import { useVoiceDetection } from '@/hooks/useVoiceDetection';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type DetectedLanguage = 'bariba' | 'french' | 'unknown';
type TranslationState = 'idle' | 'listening' | 'processing' | 'speaking' | 'complete';

interface TranslationResult {
  sourceText: string;
  translatedText: string;
  sourceLanguage: DetectedLanguage;
  targetLanguage: DetectedLanguage;
}

export function VoiceOnlyTranslator() {
  const [state, setState] = useState<TranslationState>('idle');
  const [detectedLanguage, setDetectedLanguage] = useState<DetectedLanguage>('unknown');
  const [lastResult, setLastResult] = useState<TranslationResult | null>(null);
  const [preferredSourceLang, setPreferredSourceLang] = useState<'bariba' | 'french'>('bariba');
  const [isAutoMode, setIsAutoMode] = useState(true);
  
  const { toast } = useToast();
  
  // Hooks audio
  const { startRecording, stopRecording, isRecording, cancelRecording } = useAudioRecorder();
  const { transcribe: transcribeBariba, isTranscribing: isTranscribingBariba } = useBaribaSTT();
  const { transcribe: transcribeFrench, isTranscribing: isTranscribingFrench, serviceAvailable: frenchSTTAvailable } = useFrenchSTTBase64();
  const { startListening, stopListening, isListening, transcript: webSpeechTranscript } = useFrenchSTT();
  const { speak: speakBariba, isLoading: isLoadingBariba, isSpeaking: isSpeakingBariba } = useBaribaTTS();
  const { speak: speakFrench, isSpeaking: isSpeakingFrench } = useFrenchTTS();
  const { translateFrenchToBariba, translateBaribaToFrench } = useHybridTranslation();
  const { startDetection, stopDetection, onSpeechEnd, isSpeaking: isVADSpeaking } = useVoiceDetection();

  // Process web speech transcript when it changes
  useEffect(() => {
    if (webSpeechTranscript && state === 'listening' && preferredSourceLang === 'french') {
      handleFrenchWebSpeechComplete(webSpeechTranscript);
    }
  }, [webSpeechTranscript]);

  // VAD speech end handler
  useEffect(() => {
    if (!isAutoMode || state !== 'listening') return;

    const unsubscribe = onSpeechEnd(async (duration) => {
      if (duration > 300) {
        await handleRecordingComplete();
      }
    });

    return unsubscribe;
  }, [isAutoMode, state, preferredSourceLang]);

  const handleFrenchWebSpeechComplete = async (text: string) => {
    if (!text.trim()) return;
    
    setState('processing');
    stopListening();
    
    try {
      // Translate French to Bariba
      const result = await translateFrenchToBariba(text);
      if (result?.translation) {
        const translationResult: TranslationResult = {
          sourceText: text,
          translatedText: result.translation,
          sourceLanguage: 'french',
          targetLanguage: 'bariba'
        };
        setLastResult(translationResult);
        setDetectedLanguage('french');
        
        // Speak the translation
        setState('speaking');
        await speakBariba(result.translation);
        setState('complete');
        
        // Haptic feedback
        if (navigator.vibrate) navigator.vibrate(100);
      }
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      setState('idle');
    }
  };

  const handleRecordingComplete = async () => {
    setState('processing');
    
    try {
      const audioBase64 = await stopRecording();
      if (!audioBase64 || audioBase64.length < 1000) {
        toast({ title: "Audio trop court", variant: "destructive" });
        setState('idle');
        return;
      }

      stopDetection();
      
      let sourceText = '';
      let translatedText = '';
      let sourceLang: DetectedLanguage = preferredSourceLang;
      let targetLang: DetectedLanguage = preferredSourceLang === 'bariba' ? 'french' : 'bariba';

      if (preferredSourceLang === 'bariba') {
        // Transcribe Bariba
        const sttResult = await transcribeBariba(audioBase64);
        if (sttResult?.transcription) {
          sourceText = sttResult.transcription;
          
          // Translate to French
          const transResult = await translateBaribaToFrench(sourceText);
          translatedText = transResult?.translation || '';
        }
      } else {
        // Try French STT via Edge Function first
        const sttResult = await transcribeFrench(audioBase64);
        if (sttResult?.transcription && sttResult.method !== 'fallback') {
          sourceText = sttResult.transcription;
          
          // Translate to Bariba
          const transResult = await translateFrenchToBariba(sourceText);
          translatedText = transResult?.translation || '';
        } else {
          // Fallback message - Web Speech API should be used
          toast({ 
            title: "Utiliser le micro web", 
            description: "Appuyez et parlez directement pour le français" 
          });
          setState('idle');
          return;
        }
      }

      if (sourceText && translatedText) {
        const result: TranslationResult = {
          sourceText,
          translatedText,
          sourceLanguage: sourceLang,
          targetLanguage: targetLang
        };
        setLastResult(result);
        setDetectedLanguage(sourceLang);

        // Speak the translation
        setState('speaking');
        if (targetLang === 'bariba') {
          await speakBariba(translatedText);
        } else {
          speakFrench(translatedText);
        }
        
        // Haptic feedback
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
        
        setState('complete');
      } else {
        toast({ title: "Pas de parole détectée", variant: "destructive" });
        setState('idle');
      }
    } catch (error: any) {
      console.error('Translation error:', error);
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      setState('idle');
    }
  };

  const startTranslation = async () => {
    setState('listening');
    
    try {
      if (preferredSourceLang === 'bariba') {
        await startRecording();
        if (isAutoMode) {
          await startDetection();
        }
      } else {
        // For French, try recording + Edge Function, fallback to Web Speech API
        if (frenchSTTAvailable) {
          await startRecording();
          if (isAutoMode) {
            await startDetection();
          }
        } else {
          startListening();
        }
      }
      
      // Haptic feedback on start
      if (navigator.vibrate) navigator.vibrate(50);
      
    } catch (error: any) {
      toast({ title: "Erreur micro", description: error.message, variant: "destructive" });
      setState('idle');
    }
  };

  const stopTranslation = async () => {
    if (state === 'listening') {
      await handleRecordingComplete();
    }
  };

  const cancelTranslation = () => {
    cancelRecording();
    stopListening();
    stopDetection();
    setState('idle');
  };

  const resetTranslation = () => {
    setLastResult(null);
    setDetectedLanguage('unknown');
    setState('idle');
  };

  const swapLanguages = () => {
    setPreferredSourceLang(prev => prev === 'bariba' ? 'french' : 'bariba');
    // Haptic feedback
    if (navigator.vibrate) navigator.vibrate(30);
  };

  const replayTranslation = () => {
    if (!lastResult) return;
    
    setState('speaking');
    if (lastResult.targetLanguage === 'bariba') {
      speakBariba(lastResult.translatedText).then(() => setState('complete'));
    } else {
      speakFrench(lastResult.translatedText);
      setState('complete');
    }
  };

  const isProcessing = state === 'processing' || isTranscribingBariba || isTranscribingFrench || isLoadingBariba;
  const isSpeakingAny = isSpeakingBariba || isSpeakingFrench;
  const isActive = state === 'listening' || isRecording || isListening;

  // Color scheme based on language
  const getLanguageColors = (lang: DetectedLanguage) => {
    switch (lang) {
      case 'bariba': return { bg: 'from-orange-500 to-amber-600', text: 'text-orange-500', ring: 'ring-orange-400' };
      case 'french': return { bg: 'from-blue-500 to-indigo-600', text: 'text-blue-500', ring: 'ring-blue-400' };
      default: return { bg: 'from-gray-500 to-gray-600', text: 'text-gray-500', ring: 'ring-gray-400' };
    }
  };

  const sourceColors = getLanguageColors(preferredSourceLang);
  const targetColors = getLanguageColors(preferredSourceLang === 'bariba' ? 'french' : 'bariba');

  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-4 space-y-8">
      
      {/* Language Direction Indicator - ICONIC */}
      <div className="flex items-center gap-4">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setPreferredSourceLang('bariba')}
          className={cn(
            "w-16 h-16 rounded-full flex items-center justify-center text-3xl transition-all",
            preferredSourceLang === 'bariba' 
              ? 'bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg shadow-orange-500/30 scale-110' 
              : 'bg-muted hover:bg-muted/80'
          )}
        >
          🇧🇯
        </motion.button>
        
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={swapLanguages}
          className="w-12 h-12 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center"
        >
          <ArrowRightLeft className="h-5 w-5" />
        </motion.button>
        
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setPreferredSourceLang('french')}
          className={cn(
            "w-16 h-16 rounded-full flex items-center justify-center text-3xl transition-all",
            preferredSourceLang === 'french' 
              ? 'bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30 scale-110' 
              : 'bg-muted hover:bg-muted/80'
          )}
        >
          🇫🇷
        </motion.button>
      </div>

      {/* Main Microphone Button - GIANT CENTRAL */}
      <div className="relative">
        {/* Pulsing ring when active */}
        <AnimatePresence>
          {isActive && (
            <motion.div
              initial={{ scale: 1, opacity: 0.5 }}
              animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.2, 0.5] }}
              exit={{ scale: 1, opacity: 0 }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className={cn(
                "absolute inset-0 -m-6 rounded-full bg-gradient-to-br",
                sourceColors.bg
              )}
            />
          )}
        </AnimatePresence>
        
        {/* VAD indicator ring */}
        {isVADSpeaking && (
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 0.3 }}
            className="absolute inset-0 -m-2 rounded-full border-4 border-green-400"
          />
        )}

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={isActive ? stopTranslation : startTranslation}
          disabled={isProcessing || isSpeakingAny}
          className={cn(
            "relative w-32 h-32 rounded-full flex items-center justify-center transition-all shadow-2xl",
            isActive 
              ? `bg-gradient-to-br ${sourceColors.bg} ring-4 ${sourceColors.ring}` 
              : isProcessing 
                ? 'bg-muted animate-pulse'
                : 'bg-gradient-to-br from-primary to-primary/80 hover:shadow-primary/30'
          )}
        >
          {isProcessing ? (
            <Loader2 className="h-16 w-16 text-white animate-spin" />
          ) : isSpeakingAny ? (
            <Volume2 className="h-16 w-16 text-white animate-pulse" />
          ) : isActive ? (
            <MicOff className="h-16 w-16 text-white" />
          ) : (
            <Mic className="h-16 w-16 text-white" />
          )}
        </motion.button>
      </div>

      {/* Status Text - Minimal */}
      <div className="text-center h-8">
        <AnimatePresence mode="wait">
          <motion.p
            key={state}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-muted-foreground text-lg"
          >
            {state === 'idle' && '🎤'}
            {state === 'listening' && (isVADSpeaking ? '🗣️ ...' : '👂 ...')}
            {state === 'processing' && '⏳ ...'}
            {state === 'speaking' && '🔊 ...'}
            {state === 'complete' && '✅'}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* Translation Result - Visual Cards */}
      <AnimatePresence>
        {lastResult && state === 'complete' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="w-full max-w-md space-y-3"
          >
            {/* Source */}
            <div className={cn(
              "p-4 rounded-2xl border-2",
              lastResult.sourceLanguage === 'bariba' ? 'border-orange-400/30 bg-orange-50 dark:bg-orange-950/20' : 'border-blue-400/30 bg-blue-50 dark:bg-blue-950/20'
            )}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{lastResult.sourceLanguage === 'bariba' ? '🇧🇯' : '🇫🇷'}</span>
              </div>
              <p className={cn(
                "text-lg",
                lastResult.sourceLanguage === 'bariba' && 'bariba-text'
              )}>
                {lastResult.sourceText}
              </p>
            </div>

            {/* Target */}
            <div className={cn(
              "p-4 rounded-2xl border-2",
              lastResult.targetLanguage === 'bariba' ? 'border-orange-400/50 bg-orange-100 dark:bg-orange-950/40' : 'border-blue-400/50 bg-blue-100 dark:bg-blue-950/40'
            )}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{lastResult.targetLanguage === 'bariba' ? '🇧🇯' : '🇫🇷'}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={replayTranslation}
                  disabled={isSpeakingAny}
                  className="ml-auto"
                >
                  <Volume2 className="h-4 w-4" />
                </Button>
              </div>
              <p className={cn(
                "text-lg font-medium",
                lastResult.targetLanguage === 'bariba' && 'bariba-text'
              )}>
                {lastResult.translatedText}
              </p>
            </div>

            {/* Action Buttons - ICONIC */}
            <div className="flex justify-center gap-4 pt-4">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={resetTranslation}
                className="w-14 h-14 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center"
              >
                <RefreshCw className="h-6 w-6" />
              </motion.button>
              
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={replayTranslation}
                disabled={isSpeakingAny}
                className="w-14 h-14 rounded-full bg-primary hover:bg-primary/80 flex items-center justify-center text-white"
              >
                <Volume2 className="h-6 w-6" />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cancel Button - When active */}
      {isActive && (
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          whileTap={{ scale: 0.9 }}
          onClick={cancelTranslation}
          className="w-12 h-12 rounded-full bg-destructive/20 hover:bg-destructive/30 flex items-center justify-center text-destructive"
        >
          <X className="h-5 w-5" />
        </motion.button>
      )}
    </div>
  );
}
