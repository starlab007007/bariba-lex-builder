/**
 * Hook for managing image animation with the GriotAnimationEngine
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { 
  GriotAnimationEngine, 
  MotionPlan, 
  EmotionSegment, 
  AnimationStyle,
  ANIMATION_STYLES,
  createDefaultMotionPlan,
  createDefaultEmotionSegments
} from '@/engines/GriotAnimationEngine';
import { supabase } from '@/integrations/supabase/client';

export interface AnimationState {
  isAnalyzing: boolean;
  isRendering: boolean;
  isPlaying: boolean;
  progress: number;
  message: string;
  error: string | null;
}

export interface AnalysisResult {
  motionPlan: MotionPlan;
  emotionSegments: EmotionSegment[];
  mood: string;
  colorPalette: string[];
}

export function useImageAnimation(canvasRef: React.RefObject<HTMLCanvasElement>) {
  const engineRef = useRef<GriotAnimationEngine | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  
  const [state, setState] = useState<AnimationState>({
    isAnalyzing: false,
    isRendering: false,
    isPlaying: false,
    progress: 0,
    message: '',
    error: null
  });

  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

  // Initialize engine when canvas is ready
  useEffect(() => {
    if (canvasRef.current && !engineRef.current) {
      engineRef.current = new GriotAnimationEngine(canvasRef.current);
    }

    return () => {
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, [canvasRef]);

  /**
   * Convert image file to base64
   */
  const imageToBase64 = useCallback(async (file: File | Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data:image/...;base64, prefix
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }, []);

  /**
   * Load image from file
   */
  const loadImage = useCallback(async (file: File | Blob): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }, []);

  /**
   * Analyze image and story with AI
   */
  const analyzeContent = useCallback(async (
    imageFile: File | Blob,
    story: string,
    style: string,
    duration: number
  ): Promise<AnalysisResult> => {
    setState(prev => ({ ...prev, isAnalyzing: true, message: 'Analyse de l\'image...', error: null }));

    try {
      // Load and store image
      imageRef.current = await loadImage(imageFile);
      
      // Convert to base64
      const imageBase64 = await imageToBase64(imageFile);
      
      // Call edge function
      const { data, error } = await supabase.functions.invoke('generate-image-animation', {
        body: { imageBase64, story, style, duration }
      });

      if (error) {
        console.error('[useImageAnimation] Analysis error:', error);
        throw new Error(error.message || 'Analyse échouée');
      }

      if (!data.success) {
        console.warn('[useImageAnimation] Using fallback analysis');
      }

      // Process results
      const motionPlan: MotionPlan = data.imageAnalysis?.motionSuggestion ? {
        direction: data.imageAnalysis.motionSuggestion.direction,
        intensity: data.imageAnalysis.motionSuggestion.intensity,
        startPoint: data.imageAnalysis.motionSuggestion.startPoint,
        endPoint: data.imageAnalysis.motionSuggestion.endPoint,
        focusPoints: data.imageAnalysis.focusPoints || [{ x: 0.5, y: 0.5, weight: 1 }]
      } : createDefaultMotionPlan();

      const emotionSegments: EmotionSegment[] = data.emotionAnalysis?.segments || 
        createDefaultEmotionSegments(duration);

      const result: AnalysisResult = {
        motionPlan,
        emotionSegments,
        mood: data.imageAnalysis?.mood || data.emotionAnalysis?.overallMood || 'storytelling',
        colorPalette: data.imageAnalysis?.colorPalette || ['#8B4513', '#FFD700', '#228B22', '#87CEEB']
      };

      setAnalysisResult(result);
      setState(prev => ({ ...prev, isAnalyzing: false, message: 'Analyse terminée!' }));
      
      return result;
    } catch (error) {
      console.error('[useImageAnimation] Analysis failed:', error);
      
      // Use default fallback
      const fallbackResult: AnalysisResult = {
        motionPlan: createDefaultMotionPlan(),
        emotionSegments: createDefaultEmotionSegments(duration),
        mood: 'storytelling',
        colorPalette: ['#8B4513', '#FFD700', '#228B22', '#87CEEB']
      };
      
      setAnalysisResult(fallbackResult);
      setState(prev => ({ 
        ...prev, 
        isAnalyzing: false, 
        message: 'Analyse par défaut utilisée',
        error: error instanceof Error ? error.message : 'Erreur d\'analyse'
      }));
      
      return fallbackResult;
    }
  }, [imageToBase64, loadImage]);

  /**
   * Start preview animation
   */
  const startPreview = useCallback(async (
    styleName: string,
    duration: number
  ) => {
    if (!engineRef.current || !imageRef.current || !analysisResult) {
      console.warn('[useImageAnimation] Cannot start preview: missing dependencies');
      return;
    }

    const style = ANIMATION_STYLES[styleName] || ANIMATION_STYLES.traditional;
    
    setState(prev => ({ ...prev, isPlaying: true, message: 'Chargement des effets...' }));

    // Preload flares
    await engineRef.current.preloadFlares(style);

    // Start animation
    engineRef.current.startPreview(
      imageRef.current,
      duration,
      analysisResult.motionPlan,
      style,
      analysisResult.emotionSegments,
      (progress) => {
        setState(prev => ({ ...prev, progress }));
      }
    );

    setState(prev => ({ ...prev, message: '' }));
  }, [analysisResult]);

  /**
   * Stop preview animation
   */
  const stopPreview = useCallback(() => {
    engineRef.current?.stopPreview();
    setState(prev => ({ ...prev, isPlaying: false }));
  }, []);

  /**
   * Render final video frames
   */
  const renderVideo = useCallback(async (
    styleName: string,
    duration: number,
    fps: number = 24
  ): Promise<Blob[]> => {
    if (!engineRef.current || !imageRef.current || !analysisResult) {
      throw new Error('Missing dependencies for rendering');
    }

    const style = ANIMATION_STYLES[styleName] || ANIMATION_STYLES.traditional;

    setState(prev => ({ 
      ...prev, 
      isRendering: true, 
      isPlaying: false,
      progress: 0, 
      message: 'Préparation du rendu...' 
    }));

    // Stop any running preview
    engineRef.current.stopPreview();

    // Preload flares
    await engineRef.current.preloadFlares(style);

    // Use captureStream-based export instead of removed renderFrames
    const blob = await engineRef.current.exportVideoBlob(
      duration,
      style,
      fps,
      (progress) => {
        setState(prev => ({ ...prev, progress, message: `Export ${Math.round(progress * 100)}%` }));
      }
    );

    const frames = [blob]; // Wrap in array for compatibility

    setState(prev => ({ ...prev, isRendering: false, message: 'Rendu terminé!' }));

    return frames;
  }, [analysisResult]);

  /**
   * Reset state
   */
  const reset = useCallback(() => {
    engineRef.current?.stopPreview();
    imageRef.current = null;
    setAnalysisResult(null);
    setState({
      isAnalyzing: false,
      isRendering: false,
      isPlaying: false,
      progress: 0,
      message: '',
      error: null
    });
  }, []);

  return {
    state,
    analysisResult,
    analyzeContent,
    startPreview,
    stopPreview,
    renderVideo,
    reset,
    loadImage: async (file: File | Blob) => {
      imageRef.current = await loadImage(file);
      return imageRef.current;
    }
  };
}
