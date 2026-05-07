import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, RefreshCw, ArrowRightLeft, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UnifiedVoiceRecorder } from '@/components/voice/UnifiedVoiceRecorder';
import { UnifiedAudioService } from '@/services/UnifiedAudioService';
import { useBaribaTTS } from '@/hooks/useBaribaTTS';
import { useFrenchTTS } from '@/hooks/useFrenchTTS';
import { useToast } from '@/hooks/use-toast';
import { triggerFeedback } from '@/utils/tamtamFeedback';
import { cn } from '@/lib/utils';

type DetectedLanguage = 'bariba' | 'french' | 'unknown';
type TranslationState = 'idle' | 'recording' | 'processing' | 'speaking' | 'complete' | 'error';

interface TranslationResult {
  sourceText: string;
  translatedText: string;
  sourceLanguage: DetectedLanguage;
  targetLanguage: DetectedLanguage;
}

interface ErrorInfo {
  message: string;
  action: string;
}

export function VoiceOnlyTranslator() {
  const [state, setState] = useState<TranslationState>('idle');
  const [detectedLanguage, setDetectedLanguage] = useState<DetectedLanguage>('unknown');
  const [lastResult, setLastResult] = useState<TranslationResult | null>(null);
  const [preferredSourceLang, setPreferredSourceLang] = useState<'bariba' | 'french'>('bariba');
  const [errorInfo, setErrorInfo] = useState<ErrorInfo | null>(null);
  
  const { toast } = useToast();
  
  // Seulement les hooks TTS nécessaires
  const { speak: speakBariba, isLoading: isLoadingBariba, isSpeaking: isSpeakingBariba } = useBaribaTTS();
  const { speak: speakFrench, isSpeaking: isSpeakingFrench } = useFrenchTTS();

  // Handler principal quand l'enregistrement est complet
  const handleRecordingComplete = useCallback(async (audioBase64: string) => {
    setState('processing');
    setErrorInfo(null);
    
    try {
      const sourceLang = preferredSourceLang === 'bariba' ? 'ba' : 'fr';
      const targetLang = preferredSourceLang === 'bariba' ? 'fr' : 'ba';
      
      // 1. Transcription avec retry automatique
      const transcriptionResult = await UnifiedAudioService.transcribe(audioBase64, sourceLang);
      
      if (!transcriptionResult.text) {
        // Erreur de transcription
        setState('error');
        setErrorInfo({
          message: transcriptionResult.error || 'Impossible de transcrire l\'audio',
          action: 'Essayez de parler plus fort et plus clairement',
        });
        return;
      }

      const sourceText = transcriptionResult.text;
      setDetectedLanguage(preferredSourceLang);
      
      // Feedback de détection de langue
      triggerFeedback('language_detected', { sound: true, haptic: true });

      // 2. Traduction avec retry automatique
      const translationResult = await UnifiedAudioService.translate(
        sourceText,
        sourceLang,
        targetLang
      );
      
      if (translationResult.confidence === 0 && translationResult.error) {
        setState('error');
        setErrorInfo({
          message: translationResult.error,
          action: 'La traduction a échoué après plusieurs tentatives',
        });
        return;
      }

      const translatedText = translationResult.translation;

      // Stocker le résultat
      const result: TranslationResult = {
        sourceText,
        translatedText,
        sourceLanguage: preferredSourceLang,
        targetLanguage: preferredSourceLang === 'bariba' ? 'french' : 'bariba',
      };
      setLastResult(result);

      // 3. Synthèse vocale
      setState('speaking');
      
      if (targetLang === 'ba') {
        await speakBariba(translatedText);
      } else {
        speakFrench(translatedText);
      }
      
      // Succès
      triggerFeedback('success', { sound: false, haptic: true });
      setState('complete');
      
    } catch (error: any) {
      console.error('[VoiceOnlyTranslator] Error:', error);
      setState('error');
      setErrorInfo({
        message: 'Une erreur inattendue s\'est produite',
        action: error.message || 'Veuillez réessayer',
      });
    }
  }, [preferredSourceLang, speakBariba, speakFrench]);

  const swapLanguages = useCallback(() => {
    setPreferredSourceLang(prev => prev === 'bariba' ? 'french' : 'bariba');
    triggerFeedback('click', { sound: true, haptic: true });
  }, []);

  const resetTranslation = useCallback(() => {
    setLastResult(null);
    setDetectedLanguage('unknown');
    setErrorInfo(null);
    setState('idle');
  }, []);

  const replayTranslation = useCallback(() => {
    if (!lastResult) return;
    
    setState('speaking');
    if (lastResult.targetLanguage === 'bariba') {
      speakBariba(lastResult.translatedText).then(() => setState('complete'));
    } else {
      speakFrench(lastResult.translatedText);
      setState('complete');
    }
  }, [lastResult, speakBariba, speakFrench]);

  const handleRetry = useCallback(() => {
    setErrorInfo(null);
    setState('idle');
  }, []);

  const isSpeakingAny = isSpeakingBariba || isSpeakingFrench;
  const isProcessing = state === 'processing' || isLoadingBariba;

  // Color scheme based on language
  const getLanguageColors = (lang: DetectedLanguage) => {
    switch (lang) {
      case 'bariba': return { bg: 'from-orange-500 to-amber-600', text: 'text-orange-500', ring: 'ring-orange-400' };
      case 'french': return { bg: 'from-blue-500 to-indigo-600', text: 'text-blue-500', ring: 'ring-blue-400' };
      default: return { bg: 'from-gray-500 to-gray-600', text: 'text-gray-500', ring: 'ring-gray-400' };
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-4 space-y-8">
      
      {/* Language Direction Indicator */}
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

      {/* Main Content Area */}
      <AnimatePresence mode="wait">
        {state === 'error' && errorInfo ? (
          // Error state
          <motion.div
            key="error"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex flex-col items-center gap-4 p-6 bg-destructive/10 rounded-2xl border border-destructive/20"
          >
            <AlertCircle className="h-16 w-16 text-destructive" />
            <div className="text-center">
              <p className="font-medium text-destructive">{errorInfo.message}</p>
              <p className="text-sm text-muted-foreground mt-1">{errorInfo.action}</p>
            </div>
            <Button onClick={handleRetry} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Réessayer
            </Button>
          </motion.div>
        ) : state === 'processing' ? (
          // Processing state
          <motion.div
            key="processing"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex flex-col items-center gap-4"
          >
            <div className="w-32 h-32 rounded-full bg-muted flex items-center justify-center">
              <Loader2 className="h-16 w-16 animate-spin text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">Traitement en cours...</p>
          </motion.div>
        ) : state === 'speaking' ? (
          // Speaking state
          <motion.div
            key="speaking"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex flex-col items-center gap-4"
          >
            <motion.div 
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 0.8 }}
              className={cn(
                "w-32 h-32 rounded-full flex items-center justify-center bg-gradient-to-br",
                getLanguageColors(lastResult?.targetLanguage || 'unknown').bg
              )}
            >
              <Volume2 className="h-16 w-16 text-white" />
            </motion.div>
            <p className="text-muted-foreground">Lecture en cours...</p>
          </motion.div>
        ) : state === 'complete' && lastResult ? (
          // Complete state with results
          <motion.div
            key="complete"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="w-full max-w-md space-y-4"
          >
            {/* Language Detection Badge */}
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex justify-center"
            >
              <div className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium",
                detectedLanguage === 'bariba' 
                  ? 'bg-gradient-to-r from-orange-100 to-amber-100 text-orange-700 border border-orange-200' 
                  : 'bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 border border-blue-200'
              )}>
                <CheckCircle2 className="h-4 w-4" />
                <span>{detectedLanguage === 'bariba' ? '🇧🇯 Bariba détecté' : '🇫🇷 Français détecté'}</span>
              </div>
            </motion.div>

            {/* Source Text */}
            <div className={cn(
              "p-4 rounded-2xl border-2",
              lastResult.sourceLanguage === 'bariba' 
                ? 'border-orange-400/30 bg-orange-50 dark:bg-orange-950/20' 
                : 'border-blue-400/30 bg-blue-50 dark:bg-blue-950/20'
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

            {/* Translated Text */}
            <div className={cn(
              "p-4 rounded-2xl border-2",
              lastResult.targetLanguage === 'bariba' 
                ? 'border-orange-400/50 bg-orange-100 dark:bg-orange-950/40' 
                : 'border-blue-400/50 bg-blue-100 dark:bg-blue-950/40'
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

            {/* Action Buttons */}
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
                className={cn(
                  "w-14 h-14 rounded-full flex items-center justify-center text-white bg-gradient-to-br",
                  getLanguageColors(lastResult.targetLanguage).bg
                )}
              >
                <Volume2 className="h-6 w-6" />
              </motion.button>
            </div>
          </motion.div>
        ) : (
          // Idle state - show recorder
          <motion.div
            key="idle"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <UnifiedVoiceRecorder
              language={preferredSourceLang}
              onComplete={handleRecordingComplete}
              onCancel={() => setState('idle')}
              showPreview={false}
              maxDuration={30}
              size="lg"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default VoiceOnlyTranslator;
