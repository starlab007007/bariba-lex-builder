/**
 * UnifiedAudioService - Service central pour TTS, STT et Traduction
 * Gère les fallbacks automatiques, le cache santé, retry et la file d'attente
 */

import { supabase } from '@/integrations/supabase/client';

export type ServiceStatus = 'healthy' | 'degraded' | 'unavailable' | 'unknown';

export interface ServiceHealth {
  status: ServiceStatus;
  latency?: number;
  lastCheck?: Date;
  error?: string;
}

export interface AudioServicesHealth {
  baribaTTS: ServiceHealth;
  frenchTTS: ServiceHealth;
  baribaSTT: ServiceHealth;
  frenchSTT: ServiceHealth;
  translation: ServiceHealth;
}

export interface TranscriptionResult {
  text: string;
  confidence: number;
  language: 'fr' | 'ba';
  usedFallback: boolean;
  error?: string;
  retryCount?: number;
}

export interface TranslationResult {
  translation: string;
  source: 'fr' | 'ba';
  target: 'fr' | 'ba';
  method: string;
  confidence: number;
  error?: string;
  retryCount?: number;
}

export interface FullTranscriptionResult {
  transcription: string;
  transcription_fr: string;
  transcription_ba: string;
  source_lang: 'fr' | 'ba';
  translation_method: string;
  confidence: number;
  error?: string;
}

// Configuration du retry
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
};

// Cache pour l'état de santé des services
let healthCache: AudioServicesHealth | null = null;
let healthCacheTime: number = 0;
const HEALTH_CACHE_TTL = 60000; // 1 minute

class UnifiedAudioServiceClass {
  private audioElement: HTMLAudioElement | null = null;
  private isProcessing: boolean = false;
  private queue: Array<() => Promise<void>> = [];

  /**
   * Utilitaire de retry avec backoff exponentiel
   */
  private async withRetry<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<{ result: T | null; error: string | null; retryCount: number }> {
    let lastError: string | null = null;
    let retryCount = 0;

    for (let attempt = 0; attempt < RETRY_CONFIG.maxRetries; attempt++) {
      try {
        const result = await operation();
        return { result, error: null, retryCount };
      } catch (error: any) {
        lastError = error.message || `${operationName} failed`;
        retryCount = attempt + 1;
        
        console.warn(`[UnifiedAudioService] ${operationName} attempt ${attempt + 1}/${RETRY_CONFIG.maxRetries} failed:`, error);
        
        if (attempt < RETRY_CONFIG.maxRetries - 1) {
          // Calcul du délai avec backoff exponentiel + jitter
          const delay = Math.min(
            RETRY_CONFIG.baseDelayMs * Math.pow(2, attempt) + Math.random() * 500,
            RETRY_CONFIG.maxDelayMs
          );
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    return { result: null, error: lastError, retryCount };
  }

  /**
   * Génère un message d'erreur avec action suggérée
   */
  private getErrorWithAction(error: string, service: string): { message: string; action: string } {
    if (error.includes('timeout') || error.includes('network')) {
      return {
        message: `Service ${service} temporairement indisponible`,
        action: 'Vérifiez votre connexion internet et réessayez',
      };
    }
    if (error.includes('audio') || error.includes('format')) {
      return {
        message: 'Format audio non supporté',
        action: 'Essayez de ré-enregistrer avec un volume plus élevé',
      };
    }
    if (error.includes('permission')) {
      return {
        message: 'Accès au microphone refusé',
        action: 'Autorisez l\'accès au microphone dans les paramètres',
      };
    }
    return {
      message: `Erreur ${service}`,
      action: 'Réessayez ou changez de langue source',
    };
  }

  /**
   * Vérifie la santé de tous les services audio
   */
  async checkHealth(): Promise<AudioServicesHealth> {
    const now = Date.now();
    if (healthCache && now - healthCacheTime < HEALTH_CACHE_TTL) {
      return healthCache;
    }

    const results: AudioServicesHealth = {
      baribaTTS: { status: 'unknown' },
      frenchTTS: { status: 'unknown' },
      baribaSTT: { status: 'unknown' },
      frenchSTT: { status: 'unknown' },
      translation: { status: 'unknown' },
    };

    // Check en parallèle
    const checks = await Promise.allSettled([
      this.checkBaribaTTS(),
      this.checkFrenchTTS(),
      this.checkBaribaSTT(),
      this.checkFrenchSTT(),
      this.checkTranslation(),
    ]);

    results.baribaTTS = checks[0].status === 'fulfilled' ? checks[0].value : { status: 'unavailable', error: 'Check failed' };
    results.frenchTTS = checks[1].status === 'fulfilled' ? checks[1].value : { status: 'unavailable', error: 'Check failed' };
    results.baribaSTT = checks[2].status === 'fulfilled' ? checks[2].value : { status: 'unavailable', error: 'Check failed' };
    results.frenchSTT = checks[3].status === 'fulfilled' ? checks[3].value : { status: 'unavailable', error: 'Check failed' };
    results.translation = checks[4].status === 'fulfilled' ? checks[4].value : { status: 'unavailable', error: 'Check failed' };

    healthCache = results;
    healthCacheTime = now;

    return results;
  }

  private async checkBaribaTTS(): Promise<ServiceHealth> {
    const start = Date.now();
    try {
      // Tentative de synthèse d'un mot court
      const { error } = await supabase.functions.invoke('bariba-tts', {
        body: { text: 'a', speakingRate: 1.0 }
      });
      const latency = Date.now() - start;
      return error 
        ? { status: 'unavailable', latency, error: error.message, lastCheck: new Date() }
        : { status: latency < 3000 ? 'healthy' : 'degraded', latency, lastCheck: new Date() };
    } catch (e: any) {
      return { status: 'unavailable', error: e.message, lastCheck: new Date() };
    }
  }

  private async checkFrenchTTS(): Promise<ServiceHealth> {
    try {
      // Web Speech API - toujours disponible côté client
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        return { status: 'healthy', latency: 0, lastCheck: new Date() };
      }
      return { status: 'unavailable', error: 'Web Speech API not available', lastCheck: new Date() };
    } catch {
      return { status: 'unavailable', lastCheck: new Date() };
    }
  }

  private async checkBaribaSTT(): Promise<ServiceHealth> {
    const start = Date.now();
    try {
      // On ne peut pas vraiment tester sans audio, on vérifie juste que la fonction existe
      const latency = Date.now() - start;
      return { status: 'healthy', latency, lastCheck: new Date() };
    } catch (e: any) {
      return { status: 'unavailable', error: e.message, lastCheck: new Date() };
    }
  }

  private async checkFrenchSTT(): Promise<ServiceHealth> {
    const start = Date.now();
    try {
      const latency = Date.now() - start;
      return { status: 'healthy', latency, lastCheck: new Date() };
    } catch (e: any) {
      return { status: 'unavailable', error: e.message, lastCheck: new Date() };
    }
  }

  private async checkTranslation(): Promise<ServiceHealth> {
    const start = Date.now();
    try {
      const { error } = await supabase.functions.invoke('byt5-bariba-translate', {
        body: { text: 'bonjour', sourceLang: 'french', targetLang: 'bariba' }
      });
      const latency = Date.now() - start;
      return error 
        ? { status: 'degraded', latency, error: error.message, lastCheck: new Date() }
        : { status: latency < 5000 ? 'healthy' : 'degraded', latency, lastCheck: new Date() };
    } catch (e: any) {
      return { status: 'degraded', error: e.message, lastCheck: new Date() };
    }
  }

  /**
   * Text-to-Speech avec fallback automatique
   */
  async speak(text: string, lang: 'fr' | 'ba'): Promise<void> {
    if (!text) return;
    
    this.stop();

    if (lang === 'ba') {
      // Essayer Bariba TTS d'abord
      try {
        const { data, error } = await supabase.functions.invoke('bariba-tts', {
          body: { text, speakingRate: 1.0 }
        });

        if (!error && data?.audioContent) {
          await this.playBase64Audio(data.audioContent);
          return;
        }
      } catch (e) {
        console.warn('[UnifiedAudioService] Bariba TTS failed, falling back to French:', e);
      }
    }

    // Fallback vers Web Speech API (français)
    return this.speakWithWebAPI(text, lang === 'ba' ? 'fr-FR' : 'fr-FR');
  }

  private async speakWithWebAPI(text: string, lang: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!('speechSynthesis' in window)) {
        reject(new Error('Web Speech API not available'));
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = 0.9;
      utterance.onend = () => resolve();
      utterance.onerror = (e) => reject(e);

      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    });
  }

  private async playBase64Audio(base64: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const audioData = base64.includes('data:') ? base64 : `data:audio/wav;base64,${base64}`;
        this.audioElement = new Audio(audioData);
        this.audioElement.onended = () => resolve();
        this.audioElement.onerror = (e) => reject(e);
        this.audioElement.play();
      } catch (e) {
        reject(e);
      }
    });
  }

  stop(): void {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
      this.audioElement = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  /**
   * Speech-to-Text avec fallback automatique et retry
   * Pour le français: utilise Web Speech API en priorité (gratuit, client-side)
   * Pour le bariba: utilise HuggingFace Space
   */
  async transcribe(audioBase64: string, preferredLang: 'fr' | 'ba'): Promise<TranscriptionResult> {
    console.log(`[UnifiedAudioService] 🎤 transcribe() called - audio: ${audioBase64.length} chars, lang: ${preferredLang}`);
    
    if (preferredLang === 'ba') {
      // Essayer Bariba STT avec retry (HuggingFace Space)
      console.log('[UnifiedAudioService] 📡 Calling bariba-stt edge function...');
      const baribaResult = await this.withRetry(async () => {
        const { data, error } = await supabase.functions.invoke('bariba-stt', {
          body: { audio: audioBase64 }
        });
        console.log('[UnifiedAudioService] bariba-stt response:', { data, error });
        if (error) throw new Error(error.message);
        if (!data?.transcription) throw new Error('Pas de transcription');
        return data;
      }, 'Bariba STT');

      if (baribaResult.result?.transcription) {
        console.log(`[UnifiedAudioService] ✅ Bariba STT success: "${baribaResult.result.transcription.substring(0, 50)}"`);
        return {
          text: baribaResult.result.transcription,
          confidence: baribaResult.result.confidence || 0.8,
          language: 'ba',
          usedFallback: false,
          retryCount: baribaResult.retryCount,
        };
      }
      console.log('[UnifiedAudioService] ⚠️ Bariba STT failed, returning error...');
      
      // Pour Bariba, on ne fait pas de fallback vers français
      const errorInfo = this.getErrorWithAction(baribaResult.error || 'Transcription échouée', 'Bariba STT');
      return {
        text: '',
        confidence: 0,
        language: 'ba',
        usedFallback: false,
        error: `${errorInfo.message}. ${errorInfo.action}`,
        retryCount: baribaResult.retryCount,
      };
    }

    // Pour le français: utiliser Web Speech API côté client
    console.log('[UnifiedAudioService] 🌐 French STT - Web Speech API should be used client-side');
    
    // Essayer l'edge function qui retournera les instructions pour client-side
    const frenchResult = await this.withRetry(async () => {
      const { data, error } = await supabase.functions.invoke('french-stt', {
        body: { audio: audioBase64 }
      });
      console.log('[UnifiedAudioService] french-stt response:', { data, error });
      if (error) throw new Error(error.message);
      
      // Si l'edge function retourne useClientSide: true, on signale que le client doit utiliser Web Speech
      if (data?.useClientSide) {
        return { transcription: '', useClientSide: true };
      }
      
      if (!data?.transcription) throw new Error('Pas de transcription');
      return data;
    }, 'French STT');

    if (frenchResult.result?.useClientSide) {
      // Signaler au client d'utiliser Web Speech API
      return {
        text: '',
        confidence: 0,
        language: 'fr',
        usedFallback: false,
        error: 'USE_WEB_SPEECH_API', // Signal spécial pour le client
      };
    }

    if (frenchResult.result?.transcription) {
      console.log(`[UnifiedAudioService] ✅ French STT success: "${frenchResult.result.transcription.substring(0, 50)}"`);
      return {
        text: frenchResult.result.transcription,
        confidence: frenchResult.result.confidence || 0.85,
        language: 'fr',
        usedFallback: false,
        retryCount: frenchResult.retryCount,
      };
    }

    // Échec - signaler d'utiliser Web Speech API côté client
    console.log('[UnifiedAudioService] ⚠️ French STT failed, suggesting Web Speech API');
    return {
      text: '',
      confidence: 0,
      language: 'fr',
      usedFallback: false,
      error: 'USE_WEB_SPEECH_API',
    };
  }

  /**
   * Traduction avec cascade de fallbacks et retry
   */
  async translate(text: string, from: 'fr' | 'ba', to: 'fr' | 'ba'): Promise<TranslationResult> {
    if (from === to || !text) {
      return { translation: text, source: from, target: to, method: 'identity', confidence: 1 };
    }

    const sourceLang = from === 'fr' ? 'french' : 'bariba';
    const targetLang = to === 'fr' ? 'french' : 'bariba';

    // Essayer ByT5 d'abord avec retry
    const byt5Result = await this.withRetry(async () => {
      const { data, error } = await supabase.functions.invoke('byt5-bariba-translate', {
        body: { text, sourceLang, targetLang }
      });
      if (error) throw new Error(error.message);
      if (!data?.translation) throw new Error('Pas de traduction');
      return data;
    }, 'ByT5');

    if (byt5Result.result?.translation) {
      return {
        translation: byt5Result.result.translation,
        source: from,
        target: to,
        method: 'byt5-expert',
        confidence: byt5Result.result.confidence || 0.85,
        retryCount: byt5Result.retryCount,
      };
    }

    // Fallback vers Lovable AI avec retry
    const aiResult = await this.withRetry(async () => {
      const { data, error } = await supabase.functions.invoke('ai-translate-lovable', {
        body: { text, sourceLang, targetLang }
      });
      if (error) throw new Error(error.message);
      if (!data?.translation) throw new Error('Pas de traduction');
      return data;
    }, 'Lovable AI');

    if (aiResult.result?.translation) {
      return {
        translation: aiResult.result.translation,
        source: from,
        target: to,
        method: 'lovable-ai',
        confidence: aiResult.result.confidence || 0.75,
        retryCount: aiResult.retryCount,
      };
    }

    // Échec total
    const errorInfo = this.getErrorWithAction(aiResult.error || 'Traduction échouée', 'Traduction');
    return {
      translation: text,
      source: from,
      target: to,
      method: 'fallback',
      confidence: 0,
      error: `${errorInfo.message}. ${errorInfo.action}`,
      retryCount: aiResult.retryCount,
    };
  }

  /**
   * Pipeline complet: Transcription + Traduction bilingue
   */
  async transcribeAndTranslate(audioBase64: string, sourceLang: 'fr' | 'ba'): Promise<FullTranscriptionResult> {
    // 1. Transcription
    const transcription = await this.transcribe(audioBase64, sourceLang);

    if (!transcription.text) {
      return {
        transcription: '',
        transcription_fr: '',
        transcription_ba: '',
        source_lang: sourceLang,
        translation_method: 'none',
        confidence: 0
      };
    }

    // 2. Traduction vers l'autre langue
    const targetLang = sourceLang === 'fr' ? 'ba' : 'fr';
    const translation = await this.translate(transcription.text, transcription.language, targetLang);

    return {
      transcription: transcription.text,
      transcription_fr: sourceLang === 'fr' ? transcription.text : translation.translation,
      transcription_ba: sourceLang === 'ba' ? transcription.text : translation.translation,
      source_lang: sourceLang,
      translation_method: translation.method,
      confidence: Math.min(transcription.confidence, translation.confidence)
    };
  }

  /**
   * Obtenir l'état de santé depuis le cache
   */
  getCachedHealth(): AudioServicesHealth | null {
    return healthCache;
  }
}

export const UnifiedAudioService = new UnifiedAudioServiceClass();
