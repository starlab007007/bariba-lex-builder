/**
 * StoryAnalyzer - Service d'analyse sémantique du contenu vocal
 * 
 * Pipeline: Audio → Transcription → AI Analysis → StoryStructure
 * Utilise Web Speech API pour transcription et Edge Function pour analyse sémantique
 */

import { supabase } from '@/integrations/supabase/client';

// ============================================================================
// TYPES
// ============================================================================

export interface StorySegment {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
  emotion: 'neutral' | 'joy' | 'sadness' | 'excitement' | 'tension' | 'wisdom';
  intensity: number; // 0.0 - 1.0
  cameraMove: 'static' | 'zoom-in' | 'zoom-out' | 'pan-left' | 'pan-right' | 'orbit';
  visualEffect?: 'particles' | 'glow' | 'shake' | 'fade' | 'flare';
  assetHints?: {
    flareRange?: [number, number];
    particleIntensity?: number;
    leakIndex?: number;
  };
}

export interface KeyMoment {
  time: number;
  type: 'intro' | 'rising' | 'climax' | 'falling' | 'resolution' | 'emphasis';
  description: string;
  transitionAsset?: string;
}

export interface StoryStructure {
  title: string;
  theme: string;
  segments: StorySegment[];
  keyMoments: KeyMoment[];
  totalDuration: number;
  transcript?: string;
  language?: 'bariba' | 'french' | 'auto';
}

export interface AnalysisProgress {
  stage: 'transcribing' | 'analyzing' | 'mapping' | 'complete' | 'error';
  progress: number; // 0.0 - 1.0
  message: string;
}

// ============================================================================
// STORY ANALYZER CLASS
// ============================================================================

export class StoryAnalyzer {
  private audioContext: AudioContext | null = null;

  constructor() {
    // Lazy init AudioContext
  }

  /**
   * Analyse complète: Audio → StoryStructure
   */
  async analyze(
    audioFile: File,
    onProgress?: (progress: AnalysisProgress) => void
  ): Promise<StoryStructure> {
    try {
      // Étape 1: Obtenir la durée audio
      onProgress?.({ stage: 'transcribing', progress: 0.1, message: 'Lecture audio...' });
      const duration = await this.getAudioDuration(audioFile);

      // Étape 2: Transcription
      onProgress?.({ stage: 'transcribing', progress: 0.3, message: 'Transcription en cours...' });
      const transcript = await this.transcribeAudio(audioFile);

      // Étape 3: Analyse IA
      onProgress?.({ stage: 'analyzing', progress: 0.5, message: 'Analyse sémantique...' });
      const structure = await this.analyzeWithAI(transcript, duration);

      // Étape 4: Enrichissement avec mapping d'assets
      onProgress?.({ stage: 'mapping', progress: 0.8, message: 'Mapping des effets visuels...' });
      const enrichedStructure = this.enrichWithAssetHints(structure);

      onProgress?.({ stage: 'complete', progress: 1.0, message: 'Analyse terminée!' });
      return enrichedStructure;

    } catch (error) {
      console.error('[StoryAnalyzer] Analysis failed:', error);
      onProgress?.({ stage: 'error', progress: 0, message: 'Erreur d\'analyse' });
      
      // Fallback: structure par défaut basée sur la durée
      const duration = await this.getAudioDuration(audioFile).catch(() => 30);
      return this.createDefaultStructure(duration);
    }
  }

  /**
   * Obtenir la durée de l'audio en secondes
   */
  private async getAudioDuration(audioFile: File): Promise<number> {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      const url = URL.createObjectURL(audioFile);

      audio.onloadedmetadata = () => {
        const duration = audio.duration;
        URL.revokeObjectURL(url);
        resolve(isFinite(duration) ? duration : 30);
      };

      audio.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load audio metadata'));
      };

      audio.src = url;
    });
  }

  /**
   * Transcription via Web Speech API
   * Fallback: texte vide si non supporté
   */
  private async transcribeAudio(audioFile: File): Promise<string> {
    // Vérifier le support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.warn('[StoryAnalyzer] Web Speech API not supported, skipping transcription');
      return '';
    }

    // Note: Web Speech API nécessite un stream live, pas un fichier
    // Pour les fichiers audio, on utilise une approche alternative
    // ou on skip la transcription et on laisse l'IA deviner
    
    // Pour l'instant, retourner une chaîne vide et laisser l'IA créer
    // une structure basée sur la durée uniquement
    // Dans une version future, on pourrait utiliser Whisper API
    console.log('[StoryAnalyzer] File-based transcription not implemented, using duration-based analysis');
    return '';
  }

  /**
   * Analyse sémantique via Edge Function
   */
  private async analyzeWithAI(transcript: string, duration: number): Promise<StoryStructure> {
    try {
      const { data, error } = await supabase.functions.invoke('analyze-story', {
        body: { transcript, duration }
      });

      if (error) {
        console.error('[StoryAnalyzer] Edge function error:', error);
        return this.createDefaultStructure(duration, transcript);
      }

      // Valider la structure retournée
      if (!data || !data.segments || !Array.isArray(data.segments)) {
        console.warn('[StoryAnalyzer] Invalid AI response, using default');
        return this.createDefaultStructure(duration, transcript);
      }

      return {
        title: data.title || 'Conte du Griot',
        theme: data.theme || 'Sagesse ancestrale',
        segments: data.segments.map((seg: any, i: number) => ({
          id: seg.id || `seg-${i + 1}`,
          startTime: seg.startTime ?? (i * (duration / data.segments.length)),
          endTime: seg.endTime ?? ((i + 1) * (duration / data.segments.length)),
          text: seg.text || '',
          emotion: this.validateEmotion(seg.emotion),
          intensity: Math.min(1, Math.max(0, seg.intensity ?? 0.5)),
          cameraMove: this.validateCameraMove(seg.cameraMove),
          visualEffect: seg.visualEffect
        })),
        keyMoments: data.keyMoments || [],
        totalDuration: duration,
        transcript
      };

    } catch (error) {
      console.error('[StoryAnalyzer] AI analysis failed:', error);
      return this.createDefaultStructure(duration, transcript);
    }
  }

  /**
   * Enrichir la structure avec des hints d'assets
   */
  private enrichWithAssetHints(structure: StoryStructure): StoryStructure {
    const enrichedSegments = structure.segments.map(segment => ({
      ...segment,
      assetHints: this.getAssetHintsForEmotion(segment.emotion, segment.intensity)
    }));

    // Ajouter des assets de transition pour les moments clés
    const enrichedMoments = structure.keyMoments.map(moment => ({
      ...moment,
      transitionAsset: this.getTransitionForMoment(moment.type)
    }));

    return {
      ...structure,
      segments: enrichedSegments,
      keyMoments: enrichedMoments
    };
  }

  /**
   * Mapping émotion → hints d'assets
   */
  private getAssetHintsForEmotion(
    emotion: StorySegment['emotion'],
    intensity: number
  ): StorySegment['assetHints'] {
    // Basé sur l'inventaire: 455 lens flares disponibles
    const emotionRanges: Record<StorySegment['emotion'], [number, number]> = {
      joy: [50, 100],       // Doré, lumineux
      wisdom: [1, 49],      // Subtil, ambré
      tension: [150, 200],  // Rouge, intense
      sadness: [250, 300],  // Bleu, froid
      excitement: [100, 150], // Multicolore, dynamique
      neutral: [300, 350]   // Blanc, doux
    };

    // Light leak index basé sur l'intensité (22 disponibles)
    const leakIndex = Math.floor(intensity * 21) + 1;

    return {
      flareRange: emotionRanges[emotion] || [300, 350],
      particleIntensity: intensity,
      leakIndex
    };
  }

  /**
   * Mapping moment clé → asset de transition
   */
  private getTransitionForMoment(type: KeyMoment['type']): string {
    const transitionMap: Record<KeyMoment['type'], string> = {
      intro: 'transitions:transition-001.mp4',
      rising: 'transitions:transition-005.mp4',
      climax: 'transitions:transition-010.mp4',
      falling: 'transitions:transition-008.mp4',
      resolution: 'transitions:transition-003.mp4',
      emphasis: 'transitions:transition-006.mp4'
    };
    return transitionMap[type] || 'transitions:transition-001.mp4';
  }

  /**
   * Valider et normaliser l'émotion
   */
  private validateEmotion(emotion: string): StorySegment['emotion'] {
    const validEmotions: StorySegment['emotion'][] = [
      'neutral', 'joy', 'sadness', 'excitement', 'tension', 'wisdom'
    ];
    return validEmotions.includes(emotion as any) ? emotion as StorySegment['emotion'] : 'neutral';
  }

  /**
   * Valider et normaliser le mouvement de caméra
   */
  private validateCameraMove(move: string): StorySegment['cameraMove'] {
    const validMoves: StorySegment['cameraMove'][] = [
      'static', 'zoom-in', 'zoom-out', 'pan-left', 'pan-right', 'orbit'
    ];
    return validMoves.includes(move as any) ? move as StorySegment['cameraMove'] : 'static';
  }

  /**
   * Structure par défaut basée sur la durée
   */
  createDefaultStructure(duration: number, transcript?: string): StoryStructure {
    const segmentDuration = 5; // 5 secondes par segment
    const segmentCount = Math.max(1, Math.ceil(duration / segmentDuration));
    const segments: StorySegment[] = [];

    // Progression narrative naturelle
    const emotionProgression: StorySegment['emotion'][] = [
      'neutral', 'joy', 'wisdom', 'excitement', 'tension', 'wisdom', 'joy'
    ];
    const cameraProgression: StorySegment['cameraMove'][] = [
      'static', 'zoom-in', 'orbit', 'pan-left', 'zoom-out', 'orbit', 'static'
    ];

    for (let i = 0; i < segmentCount; i++) {
      const progress = i / segmentCount;
      const emotionIndex = Math.floor(progress * emotionProgression.length);
      const cameraIndex = Math.floor(progress * cameraProgression.length);
      
      segments.push({
        id: `seg-${i + 1}`,
        startTime: i * segmentDuration,
        endTime: Math.min((i + 1) * segmentDuration, duration),
        text: transcript ? `Segment ${i + 1}` : 'Conte africain traditionnel',
        emotion: emotionProgression[emotionIndex % emotionProgression.length],
        intensity: 0.4 + (progress * 0.4), // Intensité croissante
        cameraMove: cameraProgression[cameraIndex % cameraProgression.length],
        visualEffect: i === Math.floor(segmentCount / 2) ? 'glow' : undefined,
        assetHints: this.getAssetHintsForEmotion(
          emotionProgression[emotionIndex % emotionProgression.length],
          0.4 + (progress * 0.4)
        )
      });
    }

    // Moments clés standards
    const keyMoments: KeyMoment[] = [
      { 
        time: duration * 0.1, 
        type: 'intro', 
        description: 'Introduction',
        transitionAsset: 'transitions:transition-001.mp4'
      },
      { 
        time: duration * 0.3, 
        type: 'rising', 
        description: 'Montée dramatique',
        transitionAsset: 'transitions:transition-005.mp4'
      },
      { 
        time: duration * 0.6, 
        type: 'climax', 
        description: 'Point culminant',
        transitionAsset: 'transitions:transition-010.mp4'
      },
      { 
        time: duration * 0.85, 
        type: 'resolution', 
        description: 'Résolution',
        transitionAsset: 'transitions:transition-003.mp4'
      }
    ];

    return {
      title: 'Conte du Griot',
      theme: 'Sagesse ancestrale',
      segments,
      keyMoments,
      totalDuration: duration,
      transcript: transcript || ''
    };
  }

  /**
   * Nettoyer les ressources
   */
  dispose(): void {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

// Export singleton
export const storyAnalyzer = new StoryAnalyzer();
