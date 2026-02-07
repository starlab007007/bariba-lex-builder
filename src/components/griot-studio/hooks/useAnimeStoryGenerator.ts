/**
 * Hook for generating anime stories with AI
 * Handles scene segmentation, image generation, and audio narration
 * 
 * v7: Added generateFromScenes for pre-edited scenes (MovieFlow pipeline)
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { AnimeStyleName } from '../AnimeStyleSelector';
import type { EditableScene } from '../SceneEditor';

export interface StoryScene {
  sceneNumber: number;
  text: string;
  emotion: string;
  visualDescription: string;
  durationSeconds: number;
  imageBase64?: string;
  imageUrl?: string;
  videoUrl?: string;
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

// Words per second for duration calculation
const WORDS_PER_SECOND = 2.5;

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
   * Generate from manually selected library assets (no Edge Function needed)
   * Distributes selected images evenly across the audio duration
   */
  const generateFromSelectedAssets = useCallback(async (
    assets: Array<{ id: string; image_url: string; scene_type: string; character_type: string | null; emotion: string; description_fr: string | null; description_en: string; asset_type?: string; video_url?: string | null; video_duration?: number | null }>,
    totalDuration: number
  ): Promise<GenerationResult | null> => {
    if (!assets.length) return null;
    const startTime = Date.now();

    setState({
      isGenerating: true,
      currentPhase: 'generating_images',
      progress: 20,
      message: '📸 Montage des illustrations sélectionnées...',
      currentScene: 0,
      totalScenes: assets.length,
      error: null
    });

    try {
      const defaultSceneDuration = Math.max(3, totalDuration / assets.length);

      const scenes: StoryScene[] = assets.map((asset, i) => {
        const isVideo = asset.asset_type === 'video' && asset.video_url;
        // Video assets use their own duration if available, otherwise equal split
        const dur = isVideo && asset.video_duration
          ? Math.min(asset.video_duration, defaultSceneDuration)
          : Math.round(defaultSceneDuration);

        return {
          sceneNumber: i + 1,
          text: asset.description_fr || asset.description_en,
          emotion: asset.emotion,
          visualDescription: asset.description_en,
          durationSeconds: dur,
          imageUrl: asset.image_url,
          videoUrl: isVideo ? asset.video_url! : undefined,
        };
      });

      setState(prev => ({
        ...prev,
        progress: 80,
        currentScene: scenes.length,
        message: `📸 ${scenes.length} illustrations prêtes!`
      }));

      const generationResult: GenerationResult = {
        scenes,
        totalDuration
      };

      const totalTime = Date.now() - startTime;
      console.log(`[useAnimeStoryGenerator] generateFromSelectedAssets complete in ${totalTime}ms`);

      setState({
        isGenerating: false,
        currentPhase: 'complete',
        progress: 100,
        message: `✅ Prêt en ${(totalTime / 1000).toFixed(1)}s!`,
        currentScene: scenes.length,
        totalScenes: scenes.length,
        error: null
      });

      setResult(generationResult);
      return generationResult;

    } catch (error) {
      console.error('[useAnimeStoryGenerator] generateFromSelectedAssets error:', error);
      setState({
        isGenerating: false,
        currentPhase: 'error',
        progress: 0,
        message: '',
        currentScene: 0,
        totalScenes: 0,
        error: error instanceof Error ? error.message : 'Erreur de montage'
      });
      return null;
    }
  }, []);

  /**
   * Generate from pre-edited scenes (MovieFlow pipeline)
   * Skips AI segmentation — scenes come from SceneEditor
   */
  const generateFromScenes = useCallback(async (
    editedScenes: EditableScene[],
    style: AnimeStyleName,
    totalDuration: number
  ): Promise<GenerationResult | null> => {
    const startTime = Date.now();
    
    setState({
      isGenerating: true,
      currentPhase: 'generating_images',
      progress: 10,
      message: '🎨 Matching des illustrations...',
      currentScene: 0,
      totalScenes: editedScenes.length,
      error: null
    });

    try {
      // Calculate duration per scene based on word count
      const totalWords = editedScenes.reduce((sum, s) => sum + s.text.split(/\s+/).length, 0);
      const scenesWithDuration = editedScenes.map((scene, i) => {
        const wordCount = scene.text.split(/\s+/).length;
        const ratio = totalWords > 0 ? wordCount / totalWords : 1 / editedScenes.length;
        return {
          sceneNumber: i + 1,
          text: scene.text,
          emotion: scene.emotion,
          visualDescription: scene.text, // Use text as visual description for matching
          durationSeconds: Math.max(3, Math.round(totalDuration * ratio)),
        };
      });

      setState(prev => ({
        ...prev,
        progress: 20,
        message: '📚 Recherche dans la bibliothèque...'
      }));

      // Call edge function with pre_segmented mode
      const { data: sceneData, error: sceneError } = await supabase.functions.invoke('generate-anime-story', {
        body: { 
          story: editedScenes.map(s => s.text).join('. '),
          style, 
          duration: totalDuration,
          pre_segmented: true,
          scenes: scenesWithDuration
        }
      });

      if (sceneError) {
        throw new Error(sceneError.message || 'Échec du matching des illustrations');
      }

      if (!sceneData?.success || !sceneData?.scenes?.length) {
        throw new Error(sceneData?.error || 'Aucune illustration trouvée');
      }

      const scenes: StoryScene[] = sceneData.scenes;
      const libraryCount = sceneData.stats?.libraryMatches || 0;

      setState(prev => ({
        ...prev,
        progress: 70,
        currentScene: scenes.length,
        message: `📚 ${libraryCount}/${scenes.length} depuis la bibliothèque!`
      }));

      // Convert base64 images to object URLs
      const scenesWithUrls = scenes.map((scene: StoryScene & { fromLibrary?: boolean }) => {
        if (scene.imageUrl && scene.imageUrl.startsWith('http')) return scene;
        if (scene.imageBase64) {
          const blob = base64ToBlob(scene.imageBase64, 'image/png');
          return { ...scene, imageUrl: URL.createObjectURL(blob) };
        }
        return { ...scene, imageUrl: makeScenePlaceholderDataUrl(scene) };
      });

      // No TTS generation — user's recorded narration is used directly
      const generationResult: GenerationResult = {
        scenes: scenesWithUrls,
        totalDuration
      };

      const totalTime = Date.now() - startTime;
      console.log(`[useAnimeStoryGenerator] generateFromScenes complete in ${totalTime}ms`);

      setState({
        isGenerating: false,
        currentPhase: 'complete',
        progress: 100,
        message: `✅ Prêt en ${(totalTime / 1000).toFixed(1)}s!`,
        currentScene: scenes.length,
        totalScenes: scenes.length,
        error: null
      });

      setResult(generationResult);
      return generationResult;

    } catch (error) {
      console.error('[useAnimeStoryGenerator] generateFromScenes error:', error);
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
   * Generate animated story from text (original method)
   */
  const generateStory = useCallback(async (
    story: string,
    style: AnimeStyleName,
    duration: number
  ): Promise<GenerationResult | null> => {
    const startTime = Date.now();
    
    setState({
      isGenerating: true,
      currentPhase: 'segmenting',
      progress: 5,
      message: '📖 Lecture de ton conte...',
      currentScene: 0,
      totalScenes: 0,
      error: null
    });

    try {
      await new Promise(r => setTimeout(r, 300));
      setState(prev => ({ ...prev, progress: 15, message: '🎭 Découpage en scènes...' }));
      await new Promise(r => setTimeout(r, 200));

      setState(prev => ({
        ...prev,
        currentPhase: 'generating_images',
        progress: 25,
        message: '🖼️ Sélection des illustrations...'
      }));

      const { data: sceneData, error: sceneError } = await supabase.functions.invoke('generate-anime-story', {
        body: { story, style, duration }
      });

      if (sceneError) throw new Error(sceneError.message || 'Échec de la génération des scènes');
      if (!sceneData?.success) throw new Error(sceneData?.error || 'Échec de la génération des scènes');
      if (!sceneData?.scenes || !Array.isArray(sceneData.scenes)) throw new Error('Réponse invalide: scènes manquantes');
      if (sceneData.scenes.length === 0) throw new Error('Aucune scène générée');

      const scenes: StoryScene[] = sceneData.scenes;
      const totalScenes = scenes.length;
      const libraryCount = sceneData.stats?.libraryMatches || 0;
      
      const libraryMsg = libraryCount > 0 
        ? `📚 ${libraryCount}/${totalScenes} depuis la bibliothèque!`
        : `✨ ${totalScenes} illustrations créées!`;
      
      setState(prev => ({
        ...prev, progress: 70, totalScenes, currentScene: totalScenes, message: libraryMsg
      }));

      const scenesWithUrls = scenes.map((scene: StoryScene & { fromLibrary?: boolean }) => {
        if (scene.imageUrl && scene.imageUrl.startsWith('http')) return scene;
        if (scene.imageBase64) {
          const blob = base64ToBlob(scene.imageBase64, 'image/png');
          return { ...scene, imageUrl: URL.createObjectURL(blob) };
        }
        return { ...scene, imageUrl: makeScenePlaceholderDataUrl(scene) };
      });

      // Audio narration
      setState(prev => ({
        ...prev, currentPhase: 'generating_audio', progress: 75,
        message: 'Génération de la narration vocale...'
      }));

      let audioBase64: string | undefined;
      let audioUrl: string | undefined;

      try {
        const fullText = scenes.map((s: StoryScene) => s.text).join(' ... ');
        const { data: ttsData, error: ttsError } = await supabase.functions.invoke('french-tts', {
          body: { text: fullText, returnAudio: true }
        });
        if (!ttsError && ttsData?.audioContent) {
          audioBase64 = ttsData.audioContent;
          const audioBlob = base64ToBlob(audioBase64, 'audio/mpeg');
          audioUrl = URL.createObjectURL(audioBlob);
        }
      } catch (audioError) {
        console.warn('[useAnimeStoryGenerator] Audio generation failed:', audioError);
      }

      const generationResult: GenerationResult = { scenes: scenesWithUrls, audioBase64, audioUrl, totalDuration: duration };
      const totalTime = Date.now() - startTime;
      console.log(`[useAnimeStoryGenerator] Complete in ${totalTime}ms`);

      setState({
        isGenerating: false, currentPhase: 'complete', progress: 100,
        message: `✅ Prêt en ${(totalTime / 1000).toFixed(1)}s!`,
        currentScene: totalScenes, totalScenes, error: null
      });

      setResult(generationResult);
      return generationResult;

    } catch (error) {
      console.error('[useAnimeStoryGenerator] Generation error:', error);
      setState({
        isGenerating: false, currentPhase: 'error', progress: 0, message: '',
        currentScene: 0, totalScenes: 0,
        error: error instanceof Error ? error.message : 'Erreur de génération'
      });
      return null;
    }
  }, []);

  /**
   * Reset state
   */
  const reset = useCallback(() => {
    if (result?.scenes) {
      result.scenes.forEach(scene => {
        if (scene.imageUrl && scene.imageUrl.startsWith('blob:')) {
          URL.revokeObjectURL(scene.imageUrl);
        }
      });
    }
    if (result?.audioUrl && result.audioUrl.startsWith('blob:')) {
      URL.revokeObjectURL(result.audioUrl);
    }

    setResult(null);
    setState({
      isGenerating: false, currentPhase: 'idle', progress: 0, message: '',
      currentScene: 0, totalScenes: 0, error: null
    });
  }, [result]);

  return {
    state,
    result,
    generateStory,
    generateFromScenes,
    generateFromSelectedAssets,
    reset
  };
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  return new Blob([new Uint8Array(byteNumbers)], { type: mimeType });
}

function makeScenePlaceholderDataUrl(scene: Pick<StoryScene, 'sceneNumber' | 'emotion'>): string {
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
  <text x="270" y="300" text-anchor="middle" font-family="system-ui" font-size="42" fill="#fbbf24" font-weight="800">${escapeXml(label)}</text>
  <text x="270" y="360" text-anchor="middle" font-family="system-ui" font-size="18" fill="#fde68a" opacity="0.85">${escapeXml(emotion)}</text>
  <text x="270" y="860" text-anchor="middle" font-family="system-ui" font-size="16" fill="#e5e7eb" opacity="0.6">Illustration en cours…</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function escapeXml(input: string): string {
  return input.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}
