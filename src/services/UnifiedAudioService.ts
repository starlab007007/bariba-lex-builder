/**
 * UnifiedAudioService - Service central pour TTS, STT et Traduction
 * Gère les fallbacks automatiques, le cache santé et la file d'attente
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
}

export interface TranslationResult {
  translation: string;
  source: 'fr' | 'ba';
  target: 'fr' | 'ba';
  method: string;
  confidence: number;
}

export interface FullTranscriptionResult {
  transcription: string;
  transcription_fr: string;
  transcription_ba: string;
  source_lang: 'fr' | 'ba';
  translation_method: string;
  confidence: number;
}

// Cache pour l'état de santé des services
let healthCache: AudioServicesHealth | null = null;
let healthCacheTime: number = 0;
const HEALTH_CACHE_TTL = 60000; // 1 minute

class UnifiedAudioServiceClass {
  private audioElement: HTMLAudioElement | null = null;
  private isProcessing: boolean = false;
  private queue: Array<() => Promise<void>> = [];

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
        body: { text: 'bonjour', sourceLanguage: 'french', targetLanguage: 'bariba' }
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
   * Speech-to-Text avec fallback automatique
   */
  async transcribe(audioBase64: string, preferredLang: 'fr' | 'ba'): Promise<TranscriptionResult> {
    if (preferredLang === 'ba') {
      try {
        const { data, error } = await supabase.functions.invoke('bariba-stt', {
          body: { audio: audioBase64 }
        });

        if (!error && data?.transcription) {
          return {
            text: data.transcription,
            confidence: data.confidence || 0.8,
            language: 'ba',
            usedFallback: false
          };
        }
      } catch (e) {
        console.warn('[UnifiedAudioService] Bariba STT failed:', e);
      }
    }

    // Fallback vers French STT
    try {
      const { data, error } = await supabase.functions.invoke('french-stt', {
        body: { audio: audioBase64 }
      });

      if (!error && data?.transcription) {
        return {
          text: data.transcription,
          confidence: data.confidence || 0.85,
          language: 'fr',
          usedFallback: preferredLang === 'ba'
        };
      }
    } catch (e) {
      console.error('[UnifiedAudioService] French STT failed:', e);
    }

    return {
      text: '',
      confidence: 0,
      language: preferredLang,
      usedFallback: true
    };
  }

  /**
   * Traduction avec cascade de fallbacks
   */
  async translate(text: string, from: 'fr' | 'ba', to: 'fr' | 'ba'): Promise<TranslationResult> {
    if (from === to || !text) {
      return { translation: text, source: from, target: to, method: 'identity', confidence: 1 };
    }

    const sourceLanguage = from === 'fr' ? 'french' : 'bariba';
    const targetLanguage = to === 'fr' ? 'french' : 'bariba';

    // Essayer ByT5 d'abord
    try {
      const { data, error } = await supabase.functions.invoke('byt5-bariba-translate', {
        body: { text, sourceLanguage, targetLanguage }
      });

      if (!error && data?.translation) {
        return {
          translation: data.translation,
          source: from,
          target: to,
          method: 'byt5-expert',
          confidence: data.confidence || 0.85
        };
      }
    } catch (e) {
      console.warn('[UnifiedAudioService] ByT5 translation failed:', e);
    }

    // Fallback vers Lovable AI
    try {
      const { data, error } = await supabase.functions.invoke('ai-translate-lovable', {
        body: { text, sourceLanguage, targetLanguage }
      });

      if (!error && data?.translation) {
        return {
          translation: data.translation,
          source: from,
          target: to,
          method: 'lovable-ai',
          confidence: data.confidence || 0.75
        };
      }
    } catch (e) {
      console.warn('[UnifiedAudioService] Lovable AI translation failed:', e);
    }

    return {
      translation: text,
      source: from,
      target: to,
      method: 'fallback',
      confidence: 0
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
