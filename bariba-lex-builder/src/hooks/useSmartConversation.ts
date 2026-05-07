import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useBilingualAudio } from '@/hooks/useBilingualAudio';
import { byT5TranslationService } from '@/services/ByT5TranslationService';
import { translationCache } from '@/services/TranslationCache';
import { useToast } from '@/hooks/use-toast';

export type ConversationContext = 
  | 'agriculture' 
  | 'finance' 
  | 'education' 
  | 'market' 
  | 'health'
  | 'general';

export interface ConversationTurn {
  id: string;
  type: 'user' | 'ai';
  textFr: string;
  textBa: string;
  timestamp: Date;
  context?: ConversationContext;
}

interface UseSmartConversationReturn {
  messages: ConversationTurn[];
  isProcessing: boolean;
  currentContext: ConversationContext;
  
  // Core methods
  sendVoiceMessage: (audioBase64: string, sourceLang: 'ba' | 'fr') => Promise<ConversationTurn | null>;
  sendTextMessage: (text: string, sourceLang: 'ba' | 'fr') => Promise<ConversationTurn | null>;
  
  // Control
  setContext: (context: ConversationContext) => void;
  clearConversation: () => void;
  
  // Utilities
  translateText: (text: string, from: 'ba' | 'fr', to: 'ba' | 'fr') => Promise<string>;
}

export function useSmartConversation(
  initialContext: ConversationContext = 'general'
): UseSmartConversationReturn {
  const [messages, setMessages] = useState<ConversationTurn[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentContext, setCurrentContext] = useState<ConversationContext>(initialContext);
  
  const { speakCurrentLang, transcribeAudio } = useBilingualAudio();
  const { toast } = useToast();
  const messageIdCounter = useRef(0);

  const generateId = () => `msg_${Date.now()}_${messageIdCounter.current++}`;

  // Detect context from message content
  const detectContext = useCallback((text: string): ConversationContext => {
    const lowerText = text.toLowerCase();
    
    // Agriculture keywords
    if (/maïs|riz|manioc|récolte|semer|engrais|bétail|vache|culture|météo|pluie|irrigat/i.test(lowerText)) {
      return 'agriculture';
    }
    
    // Finance keywords
    if (/argent|vente|dépense|tontine|crédit|épargne|prix|franc|cfa|payer|acheter/i.test(lowerText)) {
      return 'finance';
    }
    
    // Education keywords
    if (/apprendre|cours|formation|question|comment|pourquoi|expliqu/i.test(lowerText)) {
      return 'education';
    }
    
    // Market keywords
    if (/vendre|acheter|produit|marché|annonce|offre|emploi|travail/i.test(lowerText)) {
      return 'market';
    }
    
    // Health keywords
    if (/santé|maladie|médecin|hôpital|douleur|fièvre|médicament/i.test(lowerText)) {
      return 'health';
    }
    
    return currentContext;
  }, [currentContext]);

  // Translate with cache
  const translateText = useCallback(async (
    text: string, 
    from: 'ba' | 'fr', 
    to: 'ba' | 'fr'
  ): Promise<string> => {
    if (from === to) return text;
    
    const fromLang = from === 'ba' ? 'bariba' : 'french';
    const toLang = to === 'ba' ? 'bariba' : 'french';
    
    // Check cache first
    const cached = translationCache.get(text, fromLang, toLang);
    if (cached) {
      console.log('[SmartConversation] Cache hit for translation');
      return cached;
    }
    
    // Translate
    const result = await byT5TranslationService.translate(text, fromLang, toLang);
    
    // Cache the result
    translationCache.set(text, fromLang, toLang, result.translation);
    
    return result.translation;
  }, []);

  // Process message and get AI response
  const processMessage = useCallback(async (
    textFr: string,
    textBa: string,
    detectedContext: ConversationContext
  ): Promise<ConversationTurn | null> => {
    try {
      // Call smart-assistant edge function
      const { data, error } = await supabase.functions.invoke('smart-assistant', {
        body: {
          message: textFr,
          context: detectedContext,
          conversationHistory: messages.slice(-6).map(m => ({
            role: m.type === 'user' ? 'user' : 'assistant',
            content: m.textFr
          }))
        }
      });

      if (error) throw error;

      let responseFr = data.response_fr || data.response || '';
      let responseBa = data.response_ba || '';

      // Translate response if needed
      if (!responseBa && responseFr) {
        responseBa = await translateText(responseFr, 'fr', 'ba');
      }

      const aiTurn: ConversationTurn = {
        id: generateId(),
        type: 'ai',
        textFr: responseFr,
        textBa: responseBa,
        timestamp: new Date(),
        context: detectedContext
      };

      return aiTurn;
    } catch (err: any) {
      console.error('[SmartConversation] Process error:', err);
      toast({
        title: 'Erreur',
        description: err.message || 'Impossible de traiter le message',
        variant: 'destructive'
      });
      return null;
    }
  }, [messages, translateText, toast]);

  // Send voice message
  const sendVoiceMessage = useCallback(async (
    audioBase64: string,
    sourceLang: 'ba' | 'fr'
  ): Promise<ConversationTurn | null> => {
    setIsProcessing(true);
    
    try {
      // Transcribe audio
      const transcription = await transcribeAudio(audioBase64, sourceLang);
      
      if (!transcription.fr && !transcription.ba) {
        toast({
          title: 'Erreur',
          description: 'Impossible de transcrire l\'audio',
          variant: 'destructive'
        });
        return null;
      }

      // Get both languages
      let textFr = transcription.fr;
      let textBa = transcription.ba;

      if (!textFr && textBa) {
        textFr = await translateText(textBa, 'ba', 'fr');
      } else if (!textBa && textFr) {
        textBa = await translateText(textFr, 'fr', 'ba');
      }

      // Detect context
      const detectedContext = detectContext(textFr);
      if (detectedContext !== currentContext) {
        setCurrentContext(detectedContext);
      }

      // Add user message
      const userTurn: ConversationTurn = {
        id: generateId(),
        type: 'user',
        textFr,
        textBa,
        timestamp: new Date(),
        context: detectedContext
      };
      
      setMessages(prev => [...prev, userTurn]);

      // Get AI response
      const aiTurn = await processMessage(textFr, textBa, detectedContext);
      
      if (aiTurn) {
        setMessages(prev => [...prev, aiTurn]);
        return aiTurn;
      }

      return null;
    } catch (err: any) {
      console.error('[SmartConversation] Voice message error:', err);
      toast({
        title: 'Erreur',
        description: err.message,
        variant: 'destructive'
      });
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [transcribeAudio, translateText, detectContext, currentContext, processMessage, toast]);

  // Send text message
  const sendTextMessage = useCallback(async (
    text: string,
    sourceLang: 'ba' | 'fr'
  ): Promise<ConversationTurn | null> => {
    setIsProcessing(true);
    
    try {
      let textFr = sourceLang === 'fr' ? text : '';
      let textBa = sourceLang === 'ba' ? text : '';

      if (!textFr) {
        textFr = await translateText(text, 'ba', 'fr');
      } else if (!textBa) {
        textBa = await translateText(text, 'fr', 'ba');
      }

      // Detect context
      const detectedContext = detectContext(textFr);
      if (detectedContext !== currentContext) {
        setCurrentContext(detectedContext);
      }

      // Add user message
      const userTurn: ConversationTurn = {
        id: generateId(),
        type: 'user',
        textFr,
        textBa,
        timestamp: new Date(),
        context: detectedContext
      };
      
      setMessages(prev => [...prev, userTurn]);

      // Get AI response
      const aiTurn = await processMessage(textFr, textBa, detectedContext);
      
      if (aiTurn) {
        setMessages(prev => [...prev, aiTurn]);
        return aiTurn;
      }

      return null;
    } catch (err: any) {
      console.error('[SmartConversation] Text message error:', err);
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [translateText, detectContext, currentContext, processMessage]);

  const clearConversation = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    isProcessing,
    currentContext,
    sendVoiceMessage,
    sendTextMessage,
    setContext: setCurrentContext,
    clearConversation,
    translateText
  };
}
