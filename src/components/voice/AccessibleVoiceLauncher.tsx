import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, X, Volume2, Loader2, ArrowRightLeft } from 'lucide-react';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { useBaribaSTT } from '@/hooks/useBaribaSTT';
import { useFrenchSTTBase64 } from '@/hooks/useFrenchSTTBase64';
import { useFrenchSTT } from '@/hooks/useFrenchSTT';
import { useBaribaTTS } from '@/hooks/useBaribaTTS';
import { useFrenchTTS } from '@/hooks/useFrenchTTS';
import { useHybridTranslation } from '@/hooks/useHybridTranslation';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface AccessibleVoiceLauncherProps {
  position?: 'bottom-right' | 'bottom-left' | 'bottom-center';
  className?: string;
}

type TranslationMode = 'bariba-to-french' | 'french-to-bariba';
type LauncherState = 'idle' | 'open' | 'listening' | 'processing' | 'speaking';

export function AccessibleVoiceLauncher({ 
  position = 'bottom-right',
  className 
}: AccessibleVoiceLauncherProps) {
  const [state, setState] = useState<LauncherState>('idle');
  const [mode, setMode] = useState<TranslationMode>('bariba-to-french');
  const [lastTranslation, setLastTranslation] = useState<{ source: string; target: string } | null>(null);
  
  const { toast } = useToast();
  
  // Audio hooks
  const { startRecording, stopRecording, isRecording, cancelRecording } = useAudioRecorder();
  const { transcribe: transcribeBariba, isTranscribing: isTranscribingBariba } = useBaribaSTT();
  const { transcribe: transcribeFrench, isTranscribing: isTranscribingFrench } = useFrenchSTTBase64();
  const { startListening, stopListening, isListening, transcript: webSpeechTranscript } = useFrenchSTT();
  const { speak: speakBariba, isLoading: isLoadingBariba, isSpeaking: isSpeakingBariba } = useBaribaTTS();
  const { speak: speakFrench, isSpeaking: isSpeakingFrench } = useFrenchTTS();
  const { translateFrenchToBariba, translateBaribaToFrench } = useHybridTranslation();

  // Fixed position on left side - never overlaps with RaconteMoi on right
  const positionClasses = {
    'bottom-right': 'bottom-32 right-4',
    'bottom-left': 'bottom-32 left-4',
    'bottom-center': 'bottom-32 left-1/2 -translate-x-1/2'
  };

  const handleOpen = () => {
    setState('open');
    // Haptic feedback
    if (navigator.vibrate) navigator.vibrate(50);
  };

  const handleClose = () => {
    setState('idle');
    setLastTranslation(null);
    cancelRecording();
    stopListening();
  };

  const handleStartListening = async () => {
    setState('listening');
    
    try {
      if (mode === 'bariba-to-french') {
        await startRecording();
      } else {
        // For French, use Web Speech API directly (more reliable)
        startListening();
      }
      
      // Haptic feedback
      if (navigator.vibrate) navigator.vibrate([30, 20, 30]);
    } catch (error: any) {
      toast({ title: "Erreur micro", description: error.message, variant: "destructive" });
      setState('open');
    }
  };

  const handleStopListening = async () => {
    setState('processing');
    
    try {
      if (mode === 'bariba-to-french') {
        const audioBase64 = await stopRecording();
        if (!audioBase64 || audioBase64.length < 1000) {
          toast({ title: "Audio trop court", variant: "destructive" });
          setState('open');
          return;
        }
        
        // Transcribe Bariba
        const sttResult = await transcribeBariba(audioBase64);
        if (sttResult?.transcription) {
          // Translate to French
          const transResult = await translateBaribaToFrench(sttResult.transcription);
          if (transResult?.translation) {
            setLastTranslation({ 
              source: sttResult.transcription, 
              target: transResult.translation 
            });
            
            // Speak French translation
            setState('speaking');
            speakFrench(transResult.translation);
            
            // Haptic success
            if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
          }
        } else {
          toast({ title: "Pas de parole", variant: "destructive" });
        }
      } else {
        stopListening();
        
        // Wait a bit for transcript
        await new Promise(resolve => setTimeout(resolve, 500));
        
        if (webSpeechTranscript) {
          // Translate French to Bariba
          const transResult = await translateFrenchToBariba(webSpeechTranscript);
          if (transResult?.translation) {
            setLastTranslation({ 
              source: webSpeechTranscript, 
              target: transResult.translation 
            });
            
            // Speak Bariba translation
            setState('speaking');
            await speakBariba(transResult.translation);
            
            // Haptic success
            if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
          }
        }
      }
      
      setState('open');
    } catch (error: any) {
      console.error('Translation error:', error);
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      setState('open');
    }
  };

  const toggleMode = () => {
    setMode(prev => prev === 'bariba-to-french' ? 'french-to-bariba' : 'bariba-to-french');
    setLastTranslation(null);
    // Haptic feedback
    if (navigator.vibrate) navigator.vibrate(30);
  };

  const replayTranslation = () => {
    if (!lastTranslation) return;
    
    setState('speaking');
    if (mode === 'bariba-to-french') {
      speakFrench(lastTranslation.target);
    } else {
      speakBariba(lastTranslation.target).then(() => setState('open'));
    }
    
    // Auto-reset state after speaking
    setTimeout(() => setState('open'), 3000);
  };

  const isProcessing = isTranscribingBariba || isTranscribingFrench || isLoadingBariba;
  const isSpeaking = isSpeakingBariba || isSpeakingFrench;
  const isActive = isRecording || isListening;

  // Collapsed state - just the floating button
  if (state === 'idle') {
    return (
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={handleOpen}
        className={cn(
          "fixed z-50 w-14 h-14 rounded-full",
          "bg-gradient-to-br from-cyan-500 to-teal-600 shadow-lg shadow-cyan-500/30",
          "flex items-center justify-center",
          "hover:shadow-xl hover:shadow-cyan-500/40 transition-shadow",
          "bottom-32 left-4"
        )}
      >
        <Mic className="h-7 w-7 text-white" />
      </motion.button>
    );
  }

  // Expanded state
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.8, opacity: 0 }}
      className="fixed z-50 w-72 rounded-3xl p-4 bg-background/95 backdrop-blur-xl border shadow-2xl bottom-32 left-4"
    >
      {/* Header - Close + Mode */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={toggleMode}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 transition"
        >
          <span className="text-lg">{mode === 'bariba-to-french' ? '🇧🇯' : '🇫🇷'}</span>
          <ArrowRightLeft className="h-3 w-3" />
          <span className="text-lg">{mode === 'bariba-to-french' ? '🇫🇷' : '🇧🇯'}</span>
        </button>
        
        <button
          onClick={handleClose}
          className="w-8 h-8 rounded-full bg-muted hover:bg-destructive/20 flex items-center justify-center transition"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Main Button */}
      <div className="flex justify-center mb-4">
        <div className="relative">
          {/* Active ring */}
          {isActive && (
            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.2, 0.5] }}
              transition={{ repeat: Infinity, duration: 1 }}
              className={cn(
                "absolute inset-0 -m-3 rounded-full",
                mode === 'bariba-to-french' ? 'bg-orange-500/30' : 'bg-blue-500/30'
              )}
            />
          )}
          
          <motion.button
            whileTap={{ scale: 0.95 }}
            onMouseDown={handleStartListening}
            onMouseUp={handleStopListening}
            onTouchStart={handleStartListening}
            onTouchEnd={handleStopListening}
            disabled={isProcessing || isSpeaking}
            className={cn(
              "relative w-20 h-20 rounded-full flex items-center justify-center transition-all",
              isActive 
                ? mode === 'bariba-to-french'
                  ? 'bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg shadow-orange-500/30'
                  : 'bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30'
                : isProcessing
                  ? 'bg-muted animate-pulse'
                  : isSpeaking
                    ? 'bg-green-500/20'
                    : 'bg-gradient-to-br from-primary to-primary/80 shadow-lg'
            )}
          >
            {isProcessing ? (
              <Loader2 className="h-10 w-10 text-foreground animate-spin" />
            ) : isSpeaking ? (
              <Volume2 className="h-10 w-10 text-green-600 animate-pulse" />
            ) : (
              <Mic className="h-10 w-10 text-white" />
            )}
          </motion.button>
        </div>
      </div>

      {/* Status */}
      <p className="text-center text-sm text-muted-foreground mb-3">
        {isActive && '🎤 ...'}
        {isProcessing && '⏳ ...'}
        {isSpeaking && '🔊 ...'}
        {!isActive && !isProcessing && !isSpeaking && '👆'}
      </p>

      {/* Last Translation */}
      <AnimatePresence>
        {lastTranslation && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2 overflow-hidden"
          >
            <div className={cn(
              "p-2 rounded-xl text-sm",
              mode === 'bariba-to-french' ? 'bg-orange-100 dark:bg-orange-950/30' : 'bg-blue-100 dark:bg-blue-950/30'
            )}>
              <span className="text-xs opacity-70">{mode === 'bariba-to-french' ? '🇧🇯' : '🇫🇷'}</span>
              <p className={mode === 'bariba-to-french' ? 'bariba-text' : ''}>
                {lastTranslation.source}
              </p>
            </div>
            
            <div className={cn(
              "p-2 rounded-xl text-sm flex items-start gap-2",
              mode === 'bariba-to-french' ? 'bg-blue-100 dark:bg-blue-950/30' : 'bg-orange-100 dark:bg-orange-950/30'
            )}>
              <div className="flex-1">
                <span className="text-xs opacity-70">{mode === 'bariba-to-french' ? '🇫🇷' : '🇧🇯'}</span>
                <p className={mode === 'french-to-bariba' ? 'bariba-text' : ''}>
                  {lastTranslation.target}
                </p>
              </div>
              <button
                onClick={replayTranslation}
                disabled={isSpeaking}
                className="p-1.5 rounded-full bg-primary/10 hover:bg-primary/20"
              >
                <Volume2 className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
