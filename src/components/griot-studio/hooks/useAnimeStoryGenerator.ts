/**
 * Hook for generating anime stories with AI
 * Handles scene segmentation, image generation, and audio narration
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { AnimeStyleName } from '../AnimeStyleSelector';

export interface StoryScene {
  sceneNumber: number;
  text: string;
  emotion: string;
  visualDescription: string;
  durationSeconds: number;
  imageBase64?: string;
  imageUrl?: string;
}

export interface GenerationState {
  isGenerating: boolean;
  currentPhase: 'idle' | 'segmenting' | 'generating_images' | 'generating_audio' | 'complete' | 'error';
  progress: number;
  message: string;
  currentScene: number;
  totalScenes: number;
  error: string | null;
}

export interface GenerationResult {
  scenes: StoryScene[];
  audioBase64?: string;
  audioUrl?: string;
  totalDuration: number;
}

export function useAnimeStoryGenerator() {
  const [state, setState] = useState<GenerationState>({
    isGenerating: false,
    currentPhase: 'idle',
    progress: 0,
    message: '',
    currentScene: 0,
    totalScenes: 0,
    error: null
  });

  const [result, setResult] = useState<GenerationResult | null>(null);

  /**
   * Generate animated story from text
   */
  const generateStory = useCallback(async (
    story: string,
    style: AnimeStyleName,
    duration: number
  ): Promise<GenerationResult | null> => {
    setState({
      isGenerating: true,
      currentPhase: 'segmenting',
      progress: 0,
      message: 'Analyse de ton conte...',
      currentScene: 0,
      totalScenes: 0,
      error: null
    });

    try {
      // PHASE 1: Generate scenes with anime images
      setState(prev => ({
        ...prev,
        currentPhase: 'generating_images',
        progress: 10,
        message: 'L\'IA découpe ton conte en scènes...'
      }));

      const { data: sceneData, error: sceneError } = await supabase.functions.invoke('generate-anime-story', {
        body: { story, style, duration }
      });

      if (sceneError) {
        throw new Error(sceneError.message || 'Échec de la génération des scènes');
      }

      if (!sceneData?.success) {
        throw new Error(sceneData?.error || 'Échec de la génération des scènes');
      }

      if (!sceneData?.scenes || !Array.isArray(sceneData.scenes)) {
        throw new Error(sceneData?.error || 'Réponse invalide: scènes manquantes');
      }

      if (sceneData.scenes.length === 0) {
        throw new Error(sceneData?.error || 'Aucune scène générée');
      }

      const scenes: StoryScene[] = sceneData.scenes;
      const totalScenes = scenes.length;

      // Update progress as images were generated on server
      setState(prev => ({
        ...prev,
        progress: 70,
        totalScenes,
        message: `${totalScenes} illustrations créées!`
      }));

      // Convert base64 images to object URLs for preview
      // + ensure we always have an imageUrl (placeholder) to avoid blank previews.
      const scenesWithUrls = scenes.map((scene: StoryScene) => {
        if (scene.imageBase64) {
          const blob = base64ToBlob(scene.imageBase64, 'image/png');
          return {
            ...scene,
            imageUrl: URL.createObjectURL(blob)
          };
        }

        return {
          ...scene,
          imageUrl: scene.imageUrl || makeScenePlaceholderDataUrl(scene)
        };
      });

      // PHASE 2: Generate audio narration
      setState(prev => ({
        ...prev,
        currentPhase: 'generating_audio',
        progress: 75,
        message: 'Génération de la narration vocale...'
      }));

      let audioBase64: string | undefined;
      let audioUrl: string | undefined;

      try {
        const fullText = scenes.map((s: StoryScene) => s.text).join(' ... ');
        
        const { data: ttsData, error: ttsError } = await supabase.functions.invoke('french-tts', {
          body: { 
            text: fullText,
            returnAudio: true
          }
        });

        if (!ttsError && ttsData?.audioContent) {
          audioBase64 = ttsData.audioContent;
          const audioBlob = base64ToBlob(audioBase64, 'audio/mpeg');
          audioUrl = URL.createObjectURL(audioBlob);
        }
      } catch (audioError) {
        console.warn('[useAnimeStoryGenerator] Audio generation failed, continuing without:', audioError);
      }

      // COMPLETE
      const generationResult: GenerationResult = {
        scenes: scenesWithUrls,
        audioBase64,
        audioUrl,
        totalDuration: duration
      };

      setState({
        isGenerating: false,
        currentPhase: 'complete',
        progress: 100,
        message: 'Ton conte animé est prêt!',
        currentScene: totalScenes,
        totalScenes,
        error: null
      });

      setResult(generationResult);
      return generationResult;

    } catch (error) {
      console.error('[useAnimeStoryGenerator] Generation error:', error);
      
      setState({
        isGenerating: false,
        currentPhase: 'error',
        progress: 0,
        message: '',
        currentScene: 0,
        totalScenes: 0,
        error: error instanceof Error ? error.message : 'Erreur de génération'
      });

      return null;
    }
  }, []);

  /**
   * Reset state
   */
  const reset = useCallback(() => {
    // Clean up object URLs
    if (result?.scenes) {
      result.scenes.forEach(scene => {
        if (scene.imageUrl) {
          URL.revokeObjectURL(scene.imageUrl);
        }
      });
    }
    if (result?.audioUrl) {
      URL.revokeObjectURL(result.audioUrl);
    }

    setResult(null);
    setState({
      isGenerating: false,
      currentPhase: 'idle',
      progress: 0,
      message: '',
      currentScene: 0,
      totalScenes: 0,
      error: null
    });
  }, [result]);

  return {
    state,
    result,
    generateStory,
    reset
  };
}

/**
 * Convert base64 string to Blob
 */
function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

function makeScenePlaceholderDataUrl(scene: Pick<StoryScene, 'sceneNumber' | 'emotion'>): string {
  // Small inline SVG placeholder (data URL) – works with <img> and canvas Image()
  // Keep it simple and light (no external assets).
  const label = `SCÈNE ${scene.sceneNumber}`;
  const emotion = (scene.emotion || '').toUpperCase();
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="540" height="960" viewBox="0 0 540 960">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#111827"/>
      <stop offset="1" stop-color="#0b0b0b"/>
    </linearGradient>
  </defs>
  <rect width="540" height="960" fill="url(#g)"/>
  <circle cx="270" cy="290" r="110" fill="#000" opacity="0.35"/>
  <text x="270" y="300" text-anchor="middle" font-family="system-ui, -apple-system, Segoe UI, Roboto" font-size="42" fill="#fbbf24" font-weight="800">${escapeXml(label)}</text>
  <text x="270" y="360" text-anchor="middle" font-family="system-ui, -apple-system, Segoe UI, Roboto" font-size="18" fill="#fde68a" opacity="0.85">${escapeXml(emotion)}</text>
  <text x="270" y="860" text-anchor="middle" font-family="system-ui, -apple-system, Segoe UI, Roboto" font-size="16" fill="#e5e7eb" opacity="0.6">Illustration en cours…</text>
</svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function escapeXml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
