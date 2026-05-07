// AI Music Generation Service using Lovable AI
import { supabase } from '@/integrations/supabase/client';

export interface GeneratedMusicTrack {
  id: string;
  name: string;
  description: string;
  audioUrl: string;
  duration: number;
  style: string;
  mood: string;
  isGenerated: true;
  generatedAt: number;
}

export interface MusicGenerationParams {
  style?: 'traditional' | 'modern' | 'ambient' | 'energetic' | 'calm';
  mood?: string;
  duration?: number;
  prompt?: string;
  culturalContext?: 'bariba' | 'african' | 'universal';
}

export interface MusicGenerationProgress {
  stage: 'analyzing' | 'composing' | 'generating' | 'finalizing' | 'complete' | 'error';
  progress: number;
  message: string;
}

class AIMusicGenerationServiceClass {
  private generatedTracks: Map<string, GeneratedMusicTrack> = new Map();
  private isGenerating = false;

  // Generate music description with AI
  async generateMusicPrompt(params: MusicGenerationParams): Promise<string> {
    const { style = 'traditional', mood = 'serein', duration = 30, culturalContext = 'bariba' } = params;
    
    try {
      const { data, error } = await supabase.functions.invoke('smart-assistant', {
        body: {
          message: `Décris une piste musicale de ${duration} secondes avec les caractéristiques suivantes:
- Style: ${style}
- Ambiance: ${mood}
- Contexte culturel: ${culturalContext === 'bariba' ? 'traditionnel Bariba du Nord-Bénin' : culturalContext === 'african' ? 'africain contemporain' : 'universel'}

Génère une description détaillée en une phrase pour cette musique, mentionnant:
1. Les instruments principaux (traditionnels africains comme tam-tam, kora, balafon, flûte peul)
2. Le tempo et le rythme
3. L'émotion que la musique évoque

Réponds uniquement avec la description, sans introduction.`,
          context: 'general',
          language: 'fr'
        }
      });

      if (error) throw error;
      return data?.response || this.getDefaultPrompt(params);
    } catch (err) {
      console.error('[AIMusicGen] Error generating prompt:', err);
      return this.getDefaultPrompt(params);
    }
  }

  private getDefaultPrompt(params: MusicGenerationParams): string {
    const prompts: Record<string, string> = {
      traditional: 'Rythme traditionnel Bariba avec tam-tam et flûte peul, tempo modéré, évoquant la sagesse ancestrale',
      modern: 'Fusion afro-moderne avec beats électroniques et kora, tempo dynamique, ambiance festive',
      ambient: 'Paysage sonore naturel avec chants d\'oiseaux et rivière, rythmé par un balafon doux',
      energetic: 'Percussions puissantes et djembé, tempo rapide, énergie célébratoire',
      calm: 'Mélodie douce à la kora avec harmonies vocales, tempo lent, atmosphère méditative'
    };
    return prompts[params.style || 'traditional'];
  }

  // Simulate music generation (placeholder for actual ElevenLabs integration)
  async generateMusic(
    params: MusicGenerationParams,
    onProgress?: (progress: MusicGenerationProgress) => void
  ): Promise<GeneratedMusicTrack | null> {
    if (this.isGenerating) {
      console.warn('[AIMusicGen] Generation already in progress');
      return null;
    }

    this.isGenerating = true;

    try {
      // Stage 1: Analyzing request
      onProgress?.({
        stage: 'analyzing',
        progress: 10,
        message: 'Analyse de votre demande...'
      });
      await this.delay(800);

      // Generate the prompt
      const musicPrompt = params.prompt || await this.generateMusicPrompt(params);

      // Stage 2: Composing
      onProgress?.({
        stage: 'composing',
        progress: 30,
        message: 'Composition en cours...'
      });
      await this.delay(1200);

      // Stage 3: Generating
      onProgress?.({
        stage: 'generating',
        progress: 60,
        message: 'Génération de la piste audio...'
      });

      // Try to call ElevenLabs music generation if available
      let audioUrl: string | null = null;
      
      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-music`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({
              prompt: musicPrompt,
              duration: params.duration || 30
            })
          }
        );

        if (response.ok) {
          const blob = await response.blob();
          audioUrl = URL.createObjectURL(blob);
        }
      } catch (err) {
        console.warn('[AIMusicGen] ElevenLabs not available, using placeholder');
      }

      // Stage 4: Finalizing
      onProgress?.({
        stage: 'finalizing',
        progress: 90,
        message: 'Finalisation...'
      });
      await this.delay(500);

      const track: GeneratedMusicTrack = {
        id: `gen-${Date.now()}`,
        name: this.generateTrackName(params),
        description: musicPrompt,
        audioUrl: audioUrl || '',
        duration: params.duration || 30,
        style: params.style || 'traditional',
        mood: params.mood || 'serein',
        isGenerated: true,
        generatedAt: Date.now()
      };

      this.generatedTracks.set(track.id, track);

      // Complete
      onProgress?.({
        stage: 'complete',
        progress: 100,
        message: 'Musique générée!'
      });

      return track;
    } catch (error) {
      console.error('[AIMusicGen] Generation failed:', error);
      onProgress?.({
        stage: 'error',
        progress: 0,
        message: 'Erreur lors de la génération'
      });
      return null;
    } finally {
      this.isGenerating = false;
    }
  }

  private generateTrackName(params: MusicGenerationParams): string {
    const styleNames: Record<string, string> = {
      traditional: 'Rythme Ancestral',
      modern: 'Fusion Contemporaine',
      ambient: 'Ambiance Nature',
      energetic: 'Énergie Festive',
      calm: 'Sérénité'
    };
    const timestamp = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    return `${styleNames[params.style || 'traditional']} - ${timestamp}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Get generated tracks
  getGeneratedTracks(): GeneratedMusicTrack[] {
    return Array.from(this.generatedTracks.values());
  }

  // Clear generated tracks
  clearGeneratedTracks(): void {
    // Revoke object URLs
    this.generatedTracks.forEach(track => {
      if (track.audioUrl.startsWith('blob:')) {
        URL.revokeObjectURL(track.audioUrl);
      }
    });
    this.generatedTracks.clear();
  }

  // Get status
  isCurrentlyGenerating(): boolean {
    return this.isGenerating;
  }
}

export const AIMusicGenerationService = new AIMusicGenerationServiceClass();
export default AIMusicGenerationService;
