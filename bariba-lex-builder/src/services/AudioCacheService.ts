/**
 * Service de cache audio pour le TTS Bariba offline
 * Utilise IndexedDB pour stocker les audios générés
 */

import { indexedDBService, CachedAudio } from './IndexedDBService';
import { supabase } from '@/integrations/supabase/client';

interface AudioCacheStats {
  totalEntries: number;
  baribaEntries: number;
  frenchEntries: number;
  estimatedSizeMB: number;
}

class AudioCacheService {
  private memoryCache: Map<string, Blob> = new Map();
  private maxMemoryCacheSize = 50; // Max audios en mémoire
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;
    await indexedDBService.init();
    this.initialized = true;
    console.log('[AudioCache] Service initialisé');
  }

  private generateId(text: string, language: string): string {
    return `${language}:${text.toLowerCase().trim()}`;
  }

  // Récupérer un audio depuis le cache
  async get(text: string, language: string): Promise<Blob | null> {
    await this.init();
    const id = this.generateId(text, language);

    // Vérifier le cache mémoire d'abord
    if (this.memoryCache.has(id)) {
      console.log('[AudioCache] Hit mémoire:', text.substring(0, 30));
      return this.memoryCache.get(id)!;
    }

    // Vérifier IndexedDB
    try {
      const cached = await indexedDBService.get<CachedAudio>('audio', id);
      if (cached) {
        // Mettre à jour le compteur d'utilisation
        await indexedDBService.put('audio', {
          ...cached,
          usageCount: cached.usageCount + 1,
          timestamp: Date.now()
        });
        
        // Ajouter au cache mémoire
        this.addToMemoryCache(id, cached.audioBlob);
        
        console.log('[AudioCache] Hit IndexedDB:', text.substring(0, 30));
        return cached.audioBlob;
      }
    } catch (error) {
      console.error('[AudioCache] Erreur lecture:', error);
    }

    return null;
  }

  // Sauvegarder un audio dans le cache
  async set(text: string, language: string, audioBlob: Blob): Promise<void> {
    await this.init();
    const id = this.generateId(text, language);

    try {
      const entry: CachedAudio = {
        id,
        text: text.toLowerCase().trim(),
        language,
        audioBlob,
        timestamp: Date.now(),
        usageCount: 1
      };

      await indexedDBService.put('audio', entry);
      this.addToMemoryCache(id, audioBlob);
      
      console.log('[AudioCache] Sauvegardé:', text.substring(0, 30));
    } catch (error) {
      console.error('[AudioCache] Erreur sauvegarde:', error);
    }
  }

  private addToMemoryCache(id: string, blob: Blob): void {
    // LRU simple: si le cache est plein, supprimer le plus ancien
    if (this.memoryCache.size >= this.maxMemoryCacheSize) {
      const firstKey = this.memoryCache.keys().next().value;
      if (firstKey) this.memoryCache.delete(firstKey);
    }
    this.memoryCache.set(id, blob);
  }

  // Précharger les audios TTS Bariba pour les phrases fréquentes
  async preloadFrequentPhrases(phrases: string[], language: string = 'bariba', onProgress?: (current: number, total: number) => void): Promise<number> {
    await this.init();
    let loaded = 0;
    const total = phrases.length;

    for (let i = 0; i < phrases.length; i++) {
      const phrase = phrases[i];
      const existing = await this.get(phrase, language);
      
      if (!existing) {
        try {
          // Générer l'audio via le service TTS
          const audioBlob = await this.generateBaribaTTS(phrase);
          if (audioBlob) {
            await this.set(phrase, language, audioBlob);
            loaded++;
          }
        } catch (error) {
          console.warn('[AudioCache] Échec préchargement:', phrase, error);
        }
      }

      onProgress?.(i + 1, total);
      
      // Petite pause pour ne pas surcharger
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log(`[AudioCache] Préchargement terminé: ${loaded}/${total} audios`);
    return loaded;
  }

  private async generateBaribaTTS(text: string): Promise<Blob | null> {
    try {
      const { data, error } = await supabase.functions.invoke('bariba-tts', {
        body: { text }
      });

      if (error) throw error;
      if (!data?.audio) return null;

      // Convertir base64 en Blob
      const base64 = data.audio.replace(/^data:audio\/\w+;base64,/, '');
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      return new Blob([bytes], { type: 'audio/wav' });
    } catch (error) {
      console.error('[AudioCache] Erreur TTS:', error);
      return null;
    }
  }

  // Obtenir les statistiques du cache
  async getStats(): Promise<AudioCacheStats> {
    await this.init();
    
    try {
      const allAudio = await indexedDBService.getAll<CachedAudio>('audio');
      const baribaEntries = allAudio.filter(a => a.language === 'bariba').length;
      const frenchEntries = allAudio.filter(a => a.language === 'french').length;
      
      // Estimer la taille (moyenne ~50KB par audio)
      const estimatedSizeMB = (allAudio.length * 50) / 1024;

      return {
        totalEntries: allAudio.length,
        baribaEntries,
        frenchEntries,
        estimatedSizeMB
      };
    } catch {
      return {
        totalEntries: 0,
        baribaEntries: 0,
        frenchEntries: 0,
        estimatedSizeMB: 0
      };
    }
  }

  // Nettoyer les anciens audios peu utilisés
  async cleanup(maxAge: number = 30 * 24 * 60 * 60 * 1000): Promise<number> {
    await this.init();
    const now = Date.now();
    let removed = 0;

    try {
      const allAudio = await indexedDBService.getAll<CachedAudio>('audio');
      
      for (const audio of allAudio) {
        // Supprimer si vieux et peu utilisé
        if (now - audio.timestamp > maxAge && audio.usageCount < 3) {
          await indexedDBService.delete('audio', audio.id);
          removed++;
        }
      }

      console.log(`[AudioCache] Nettoyage: ${removed} audios supprimés`);
    } catch (error) {
      console.error('[AudioCache] Erreur nettoyage:', error);
    }

    return removed;
  }

  async clear(): Promise<void> {
    await indexedDBService.clear('audio');
    this.memoryCache.clear();
    console.log('[AudioCache] Cache vidé');
  }
}

export const audioCacheService = new AudioCacheService();
