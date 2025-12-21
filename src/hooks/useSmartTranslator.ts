import { useState, useCallback, useRef } from 'react';
import { useBaribaTTS } from '@/hooks/useBaribaTTS';
import { useFrenchTTS } from '@/hooks/useFrenchTTS';
import { useBaribaSTT } from '@/hooks/useBaribaSTT';
import { useFrenchSTTBase64 } from '@/hooks/useFrenchSTTBase64';
import { byT5TranslationService } from '@/services/ByT5TranslationService';
import { translationCache } from '@/services/TranslationCache';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { tamtamFeedback } from '@/utils/tamtamFeedback';

export type InputMode = 'audio' | 'text' | 'photo' | 'paste' | 'scan';
export type SourceLanguage = 'bariba' | 'french';

interface TranslationResult {
  sourceText: string;
  translatedText: string;
  sourceLanguage: SourceLanguage;
  targetLanguage: SourceLanguage;
  confidence?: number;
  method?: string;
}

interface UseSmartTranslatorReturn {
  // State
  sourceText: string;
  translatedText: string;
  sourceLanguage: SourceLanguage;
  targetLanguage: SourceLanguage;
  isProcessing: boolean;
  currentMode: InputMode;
  lastResult: TranslationResult | null;
  
  // Actions
  setCurrentMode: (mode: InputMode) => void;
  translateFromAudio: (audioBase64: string) => Promise<void>;
  translateFromText: (text: string) => Promise<void>;
  translateFromImage: (imageBase64: string) => Promise<void>;
  translateFromClipboard: () => Promise<void>;
  translateFromDocument: (file: File) => Promise<void>;
  
  // TTS
  speakSource: () => Promise<void>;
  speakTranslation: () => Promise<void>;
  isSpeaking: boolean;
  
  // Controls
  swapLanguages: () => void;
  reset: () => void;
  copyToClipboard: () => Promise<void>;
  setSourceText: (text: string) => void;
}

export const useSmartTranslator = (): UseSmartTranslatorReturn => {
  const [sourceText, setSourceText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [sourceLanguage, setSourceLanguage] = useState<SourceLanguage>('french');
  const [targetLanguage, setTargetLanguage] = useState<SourceLanguage>('bariba');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentMode, setCurrentMode] = useState<InputMode>('audio');
  const [lastResult, setLastResult] = useState<TranslationResult | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const { toast } = useToast();
  
  // TTS hooks
  const baribaTTS = useBaribaTTS();
  const frenchTTS = useFrenchTTS();
  
  // STT hooks
  const baribaSTT = useBaribaSTT();
  const frenchSTT = useFrenchSTTBase64();

  // Core translation function
  const performTranslation = useCallback(async (
    text: string,
    from: SourceLanguage,
    to: SourceLanguage
  ): Promise<string> => {
    if (!text.trim()) return '';
    
    // Check cache first
    const cached = translationCache.get(text, from, to);
    if (cached) {
      console.log('[SmartTranslator] Cache hit');
      return cached;
    }
    
    // Translate using ByT5 with Lovable AI fallback
    const result = await byT5TranslationService.translate(text, from, to);
    
    // Cache the result
    translationCache.set(text, from, to, result.translation);
    
    return result.translation;
  }, []);

  // Translate from audio recording
  const translateFromAudio = useCallback(async (audioBase64: string) => {
    setIsProcessing(true);
    tamtamFeedback.play('send');
    
    try {
      let transcription = '';
      
      // Transcribe based on source language
      if (sourceLanguage === 'bariba') {
        const result = await baribaSTT.transcribe(audioBase64);
        transcription = result?.transcription || '';
      } else {
        const result = await frenchSTT.transcribe(audioBase64);
        transcription = result?.transcription || '';
      }
      
      if (!transcription) {
        throw new Error('Transcription échouée');
      }
      
      setSourceText(transcription);
      
      // Translate
      const translation = await performTranslation(transcription, sourceLanguage, targetLanguage);
      setTranslatedText(translation);
      
      setLastResult({
        sourceText: transcription,
        translatedText: translation,
        sourceLanguage,
        targetLanguage
      });
      
      // Auto-speak the translation
      if (translation) {
        if (targetLanguage === 'bariba') {
          await baribaTTS.speak(translation);
        } else {
          frenchTTS.speak(translation);
        }
      }
      
      tamtamFeedback.play('success');
      
    } catch (error: any) {
      console.error('[SmartTranslator] Audio translation error:', error);
      toast({
        title: "Erreur",
        description: error.message || "Erreur de traduction audio",
        variant: "destructive"
      });
      tamtamFeedback.play('error');
    } finally {
      setIsProcessing(false);
    }
  }, [sourceLanguage, targetLanguage, baribaSTT, frenchSTT, baribaTTS, frenchTTS, performTranslation, toast]);

  // Translate from text input
  const translateFromText = useCallback(async (text: string) => {
    if (!text.trim()) return;
    
    setIsProcessing(true);
    setSourceText(text);
    tamtamFeedback.play('send');
    
    try {
      const translation = await performTranslation(text, sourceLanguage, targetLanguage);
      setTranslatedText(translation);
      
      setLastResult({
        sourceText: text,
        translatedText: translation,
        sourceLanguage,
        targetLanguage
      });
      
      tamtamFeedback.play('success');
      
    } catch (error: any) {
      console.error('[SmartTranslator] Text translation error:', error);
      toast({
        title: "Erreur",
        description: error.message || "Erreur de traduction",
        variant: "destructive"
      });
      tamtamFeedback.play('error');
    } finally {
      setIsProcessing(false);
    }
  }, [sourceLanguage, targetLanguage, performTranslation, toast]);

  // Translate from image (OCR)
  const translateFromImage = useCallback(async (imageBase64: string) => {
    setIsProcessing(true);
    tamtamFeedback.play('send');
    
    try {
      // Use Lovable AI Vision for OCR
      const { data, error } = await supabase.functions.invoke('ocr-translate', {
        body: { 
          image: imageBase64,
          targetLanguage: targetLanguage
        }
      });
      
      if (error) throw error;
      
      const extractedText = data.extractedText || '';
      const translation = data.translation || '';
      
      setSourceText(extractedText);
      setTranslatedText(translation);
      
      setLastResult({
        sourceText: extractedText,
        translatedText: translation,
        sourceLanguage,
        targetLanguage
      });
      
      // Auto-speak the translation
      if (translation) {
        if (targetLanguage === 'bariba') {
          await baribaTTS.speak(translation);
        } else {
          frenchTTS.speak(translation);
        }
      }
      
      tamtamFeedback.play('success');
      
    } catch (error: any) {
      console.error('[SmartTranslator] Image translation error:', error);
      toast({
        title: "Erreur OCR",
        description: error.message || "Impossible de lire l'image",
        variant: "destructive"
      });
      tamtamFeedback.play('error');
    } finally {
      setIsProcessing(false);
    }
  }, [sourceLanguage, targetLanguage, baribaTTS, frenchTTS, toast]);

  // Translate from clipboard
  const translateFromClipboard = useCallback(async () => {
    setIsProcessing(true);
    tamtamFeedback.play('click');
    
    try {
      const clipboardText = await navigator.clipboard.readText();
      
      if (!clipboardText.trim()) {
        toast({
          title: "Presse-papier vide",
          description: "Copiez du texte d'abord",
          variant: "destructive"
        });
        return;
      }
      
      await translateFromText(clipboardText);
      
    } catch (error: any) {
      console.error('[SmartTranslator] Clipboard error:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'accéder au presse-papier",
        variant: "destructive"
      });
      tamtamFeedback.play('error');
    } finally {
      setIsProcessing(false);
    }
  }, [translateFromText, toast]);

  // Translate from document (PDF, etc.)
  const translateFromDocument = useCallback(async (file: File) => {
    setIsProcessing(true);
    tamtamFeedback.play('send');
    
    try {
      // Convert file to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Remove data URL prefix if present
          const base64Data = result.includes(',') ? result.split(',')[1] : result;
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      
      // Check if it's an image
      if (file.type.startsWith('image/')) {
        await translateFromImage(base64);
        return;
      }
      
      // For other documents, use OCR edge function
      const { data, error } = await supabase.functions.invoke('ocr-translate', {
        body: { 
          document: base64,
          fileName: file.name,
          targetLanguage: targetLanguage
        }
      });
      
      if (error) throw error;
      
      const extractedText = data.extractedText || '';
      const translation = data.translation || '';
      
      setSourceText(extractedText);
      setTranslatedText(translation);
      
      setLastResult({
        sourceText: extractedText,
        translatedText: translation,
        sourceLanguage,
        targetLanguage
      });
      
      tamtamFeedback.play('success');
      
    } catch (error: any) {
      console.error('[SmartTranslator] Document translation error:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de lire le document",
        variant: "destructive"
      });
      tamtamFeedback.play('error');
    } finally {
      setIsProcessing(false);
    }
  }, [sourceLanguage, targetLanguage, translateFromImage, toast]);

  // Speak source text
  const speakSource = useCallback(async () => {
    if (!sourceText || isSpeaking) return;
    
    setIsSpeaking(true);
    tamtamFeedback.play('click');
    
    try {
      if (sourceLanguage === 'bariba') {
        await baribaTTS.speak(sourceText);
      } else {
        frenchTTS.speak(sourceText);
      }
    } finally {
      setIsSpeaking(false);
    }
  }, [sourceText, sourceLanguage, baribaTTS, frenchTTS, isSpeaking]);

  // Speak translation
  const speakTranslation = useCallback(async () => {
    if (!translatedText || isSpeaking) return;
    
    setIsSpeaking(true);
    tamtamFeedback.play('click');
    
    try {
      if (targetLanguage === 'bariba') {
        await baribaTTS.speak(translatedText);
      } else {
        frenchTTS.speak(translatedText);
      }
    } finally {
      setIsSpeaking(false);
    }
  }, [translatedText, targetLanguage, baribaTTS, frenchTTS, isSpeaking]);

  // Swap languages
  const swapLanguages = useCallback(() => {
    tamtamFeedback.play('click');
    
    setSourceLanguage(prev => prev === 'french' ? 'bariba' : 'french');
    setTargetLanguage(prev => prev === 'french' ? 'bariba' : 'french');
    
    // Also swap the texts
    const tempSource = sourceText;
    setSourceText(translatedText);
    setTranslatedText(tempSource);
  }, [sourceText, translatedText]);

  // Reset all state
  const reset = useCallback(() => {
    tamtamFeedback.play('click');
    setSourceText('');
    setTranslatedText('');
    setLastResult(null);
  }, []);

  // Copy translation to clipboard
  const copyToClipboard = useCallback(async () => {
    if (!translatedText) return;
    
    try {
      await navigator.clipboard.writeText(translatedText);
      tamtamFeedback.play('success');
      toast({
        title: "Copié!",
        description: "Traduction copiée dans le presse-papier"
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de copier",
        variant: "destructive"
      });
    }
  }, [translatedText, toast]);

  return {
    sourceText,
    translatedText,
    sourceLanguage,
    targetLanguage,
    isProcessing,
    currentMode,
    lastResult,
    setCurrentMode,
    translateFromAudio,
    translateFromText,
    translateFromImage,
    translateFromClipboard,
    translateFromDocument,
    speakSource,
    speakTranslation,
    isSpeaking,
    swapLanguages,
    reset,
    copyToClipboard,
    setSourceText
  };
};
