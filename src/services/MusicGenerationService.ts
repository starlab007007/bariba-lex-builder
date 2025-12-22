// Music Generation and Suggestion Service using Lovable AI
import { supabase } from '@/integrations/supabase/client';
import { MUSIC_LIBRARY, MusicTrack, getSuggestedMusic } from '@/data/musicLibrary';

export interface MusicSuggestion {
  track: MusicTrack;
  reason: string;
  confidence: number;
}

export interface GeneratedMusicDescription {
  style: string;
  instruments: string[];
  tempo: string;
  mood: string;
  culturalElements: string[];
}

class MusicGenerationServiceClass {
  private cache = new Map<string, MusicSuggestion[]>();

  // Get AI-powered music suggestions based on content
  async getSuggestionsForContent(params: {
    transcript?: string;
    topic?: string;
    mood?: string;
    duration?: number;
    language?: 'fr' | 'ba';
  }): Promise<MusicSuggestion[]> {
    const cacheKey = JSON.stringify(params);
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    try {
      // First, get basic suggestions from library
      const baseSuggestions = getSuggestedMusic({
        topic: params.topic,
        mood: params.mood,
        duration: params.duration
      });

      // If we have transcript, use AI to refine suggestions
      if (params.transcript) {
        const aiSuggestions = await this.getAISuggestions(params.transcript, baseSuggestions);
        this.cache.set(cacheKey, aiSuggestions);
        return aiSuggestions;
      }

      // Return base suggestions with default reasoning
      const suggestions: MusicSuggestion[] = baseSuggestions.map((track, idx) => ({
        track,
        reason: this.getDefaultReason(track, params),
        confidence: 0.9 - (idx * 0.1)
      }));

      this.cache.set(cacheKey, suggestions);
      return suggestions;
    } catch (error) {
      console.error('[MusicGenerationService] Error getting suggestions:', error);
      // Return basic suggestions on error
      return getSuggestedMusic(params).map(track => ({
        track,
        reason: 'Recommandé pour ce type de contenu',
        confidence: 0.7
      }));
    }
  }

  private async getAISuggestions(
    transcript: string, 
    candidates: MusicTrack[]
  ): Promise<MusicSuggestion[]> {
    try {
      const { data, error } = await supabase.functions.invoke('smart-assistant', {
        body: {
          message: `Analyse ce texte et recommande la musique de fond la plus appropriée parmi ces options:
          
Texte: "${transcript.substring(0, 200)}..."

Options de musique:
${candidates.map((t, i) => `${i + 1}. ${t.name} - ${t.description} (${t.mood}, ${t.category})`).join('\n')}

Réponds avec le numéro de la meilleure option et une courte raison (1 phrase).`,
          context: 'general',
          language: 'fr'
        }
      });

      if (error) throw error;

      // Parse AI response to extract recommendation
      const response = data?.response || '';
      const matchedIndex = this.parseAIRecommendation(response, candidates.length);

      // Reorder candidates based on AI recommendation
      if (matchedIndex !== null && matchedIndex < candidates.length) {
        const recommended = candidates[matchedIndex];
        const others = candidates.filter((_, i) => i !== matchedIndex);
        
        return [
          { track: recommended, reason: response.split('.')[0] || 'Recommandé par IA', confidence: 0.95 },
          ...others.map((track, i) => ({
            track,
            reason: this.getDefaultReason(track, {}),
            confidence: 0.8 - (i * 0.1)
          }))
        ];
      }

      return candidates.map((track, i) => ({
        track,
        reason: this.getDefaultReason(track, {}),
        confidence: 0.85 - (i * 0.1)
      }));
    } catch (err) {
      console.error('[MusicGenerationService] AI suggestion error:', err);
      return candidates.map((track, i) => ({
        track,
        reason: this.getDefaultReason(track, {}),
        confidence: 0.7 - (i * 0.1)
      }));
    }
  }

  private parseAIRecommendation(response: string, maxIndex: number): number | null {
    // Try to find a number reference in the response
    const numberMatch = response.match(/\b([1-9])\b/);
    if (numberMatch) {
      const num = parseInt(numberMatch[1]) - 1; // Convert to 0-indexed
      if (num >= 0 && num < maxIndex) {
        return num;
      }
    }
    return null;
  }

  private getDefaultReason(track: MusicTrack, params: Record<string, any>): string {
    const reasons: Record<string, string[]> = {
      traditional: [
        'Rythme traditionnel authentique',
        'Sons ancestraux du Bénin',
        'Patrimoine musical Bariba'
      ],
      educational: [
        'Idéal pour l\'apprentissage',
        'Favorise la concentration',
        'Parfait pour mémoriser'
      ],
      ambient: [
        'Crée une atmosphère immersive',
        'Fond sonore naturel',
        'Ambiance authentique'
      ],
      celebration: [
        'Énergie festive et joyeuse',
        'Rythme entraînant',
        'Parfait pour célébrer'
      ],
      nature: [
        'Sons apaisants de la nature',
        'Relaxation et bien-être',
        'Connexion avec la nature'
      ]
    };

    const categoryReasons = reasons[track.category] || reasons.ambient;
    return categoryReasons[Math.floor(Math.random() * categoryReasons.length)];
  }

  // Generate AI description for music style based on content
  async generateMusicDescription(content: string): Promise<GeneratedMusicDescription> {
    try {
      const { data, error } = await supabase.functions.invoke('smart-assistant', {
        body: {
          message: `Pour ce contenu: "${content.substring(0, 150)}..."
          
Décris brièvement le style de musique de fond idéal en 1 mot pour chaque élément:
- Style général
- Tempo (lent/modéré/rapide)
- Ambiance
- 2 instruments traditionnels africains adaptés`,
          context: 'general',
          language: 'fr'
        }
      });

      if (error) throw error;

      // Parse response (simplified parsing)
      const response = data?.response || '';
      
      return {
        style: this.extractElement(response, 'style') || 'traditionnel',
        instruments: ['tam-tam', 'kora'],
        tempo: this.extractElement(response, 'tempo') || 'modéré',
        mood: this.extractElement(response, 'ambiance') || 'serein',
        culturalElements: ['Bariba', 'Nord-Bénin']
      };
    } catch (err) {
      console.error('[MusicGenerationService] Description generation error:', err);
      return {
        style: 'traditionnel africain',
        instruments: ['tam-tam', 'flûte'],
        tempo: 'modéré',
        mood: 'serein',
        culturalElements: ['Bariba']
      };
    }
  }

  private extractElement(text: string, element: string): string | null {
    const patterns: Record<string, RegExp> = {
      style: /style[:\s]+([a-zéèêàâùûîïô]+)/i,
      tempo: /(lent|modéré|rapide)/i,
      ambiance: /ambiance[:\s]+([a-zéèêàâùûîïô]+)/i
    };

    const match = text.match(patterns[element]);
    return match ? match[1].toLowerCase() : null;
  }

  // Get random track from category
  getRandomTrack(category?: MusicTrack['category']): MusicTrack {
    const candidates = category 
      ? MUSIC_LIBRARY.filter(t => t.category === category)
      : MUSIC_LIBRARY;
    
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  // Clear cache
  clearCache(): void {
    this.cache.clear();
  }
}

export const MusicGenerationService = new MusicGenerationServiceClass();
export default MusicGenerationService;
