/**
 * useTikTokLook.ts
 * React hook that manages the TikTok-like beauty/color pipeline lifecycle.
 *
 * HOW TO USE:
 * 1. Call the hook in your camera component
 * 2. Pass the video element ref to initPipeline()
 * 3. The hook returns a processed canvas ref and control functions
 * 4. Settings are persisted to localStorage per device
 *
 * TUNING:
 * - Adjust default settings via DEFAULT_SETTINGS in TikTokLookPipeline.ts
 * - Quality presets: 'low' (480p, skip denoise/sharpen), 'standard' (720p), 'high' (1080p)
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  TikTokLookPipeline,
  DEFAULT_SETTINGS,
  type PipelineSettings,
  type PerformanceStats,
  type QualityPreset,
} from '@/lib/TikTokLookPipeline';
import { FaceDetectionService } from '@/lib/FaceDetectionService';
import { SoftwareStabilizer } from '@/lib/SoftwareStabilizer';

const STORAGE_KEY = 'tiktok-look-settings';

const QUALITY_RESOLUTION: Record<QualityPreset, { w: number; h: number }> = {
  low: { w: 480, h: 854 },
  standard: { w: 720, h: 1280 },
  high: { w: 1080, h: 1920 },
};

function loadSettings(): PipelineSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    }
  } catch {}
  return { ...DEFAULT_SETTINGS };
}

function saveSettings(settings: PipelineSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {}
}

export interface TikTokLookAPI {
  /** The processed output canvas (use as video source) */
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  /** Initialize the pipeline with a video source */
  initPipeline: (video: HTMLVideoElement) => Promise<boolean>;
  /** Whether the pipeline is active */
  isActive: boolean;
  /** Current settings */
  settings: PipelineSettings;
  /** Update one or more settings */
  updateSettings: (partial: Partial<PipelineSettings>) => void;
  /** Performance stats (fps, frame time) */
  stats: PerformanceStats;
  /** Toggle A/B preview (hold to see raw) */
  setShowRaw: (raw: boolean) => void;
  /** Whether currently showing raw */
  showingRaw: boolean;
  /** Destroy pipeline */
  destroy: () => void;
  /** Whether pipeline initialized successfully */
  initialized: boolean;
}

export function useTikTokLook(): TikTokLookAPI {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pipelineRef = useRef<TikTokLookPipeline | null>(null);
  const faceServiceRef = useRef<FaceDetectionService | null>(null);
  const stabilizerRef = useRef<SoftwareStabilizer | null>(null);
  const animFrameRef = useRef<number>(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [isActive, setIsActive] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [settings, setSettings] = useState<PipelineSettings>(loadSettings);
  const [stats, setStats] = useState<PerformanceStats>({ fps: 0, frameTimeMs: 0, gpuLoad: 'low' });
  const [showingRaw, setShowingRaw] = useState(false);

  const initPipeline = useCallback(async (video: HTMLVideoElement): Promise<boolean> => {
    // Clean up existing
    if (pipelineRef.current) {
      pipelineRef.current.destroy();
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }

    videoRef.current = video;

    // Create canvas
    const res = QUALITY_RESOLUTION[settings.qualityPreset];
    let canvas = canvasRef.current;
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvasRef.current = canvas;
    }
    canvas.width = res.w;
    canvas.height = res.h;

    // Init pipeline
    const pipeline = new TikTokLookPipeline(canvas, settings);
    const success = await pipeline.initialize();

    if (!success) {
      console.warn('⚠️ Pipeline init failed, camera will show without effects');
      setInitialized(false);
      return false;
    }

    pipelineRef.current = pipeline;

    // Init face detection
    const faceService = new FaceDetectionService(
      Math.round(res.w / 2), // Run detection at half resolution for performance
      Math.round(res.h / 2),
      settings.qualityPreset === 'low' ? 3 : 2
    );
    await faceService.initialize();
    faceServiceRef.current = faceService;

    // Init stabilizer
    const stabilizer = new SoftwareStabilizer();
    stabilizer.setEnabled(settings.stabilizationEnabled);
    stabilizerRef.current = stabilizer;

    // Start render loop
    setIsActive(true);
    setInitialized(true);

    const renderLoop = () => {
      if (!pipelineRef.current || !videoRef.current) return;

      const vid = videoRef.current;
      if (vid.readyState >= 2) {
        // Run face detection (at reduced rate)
        const faceResult = faceServiceRef.current?.detect(vid);

        // Process frame through shader pipeline
        const mask = faceServiceRef.current?.getMaskCanvas() || null;
        pipelineRef.current.processFrame(vid, mask);
      }

      // Update stats periodically
      const pStats = pipelineRef.current.getPerformanceStats();
      if (pStats.fps !== stats.fps || Math.abs(pStats.frameTimeMs - stats.frameTimeMs) > 1) {
        setStats(pStats);
      }

      animFrameRef.current = requestAnimationFrame(renderLoop);
    };

    animFrameRef.current = requestAnimationFrame(renderLoop);

    console.log(`✅ TikTok Look pipeline active (${settings.qualityPreset}, ${res.w}x${res.h})`);
    return true;
  }, [settings.qualityPreset, settings.stabilizationEnabled]);

  const updateSettingsFn = useCallback((partial: Partial<PipelineSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...partial };
      saveSettings(next);
      pipelineRef.current?.updateSettings(next);
      if (partial.stabilizationEnabled !== undefined) {
        stabilizerRef.current?.setEnabled(partial.stabilizationEnabled);
      }
      return next;
    });
  }, []);

  const setShowRaw = useCallback((raw: boolean) => {
    setShowingRaw(raw);
    pipelineRef.current?.setShowRaw(raw);
  }, []);

  const destroy = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
    pipelineRef.current?.destroy();
    faceServiceRef.current?.destroy();
    stabilizerRef.current?.destroy();
    pipelineRef.current = null;
    faceServiceRef.current = null;
    stabilizerRef.current = null;
    videoRef.current = null;
    setIsActive(false);
    setInitialized(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => destroy();
  }, [destroy]);

  return {
    canvasRef,
    initPipeline,
    isActive,
    settings,
    updateSettings: updateSettingsFn,
    stats,
    setShowRaw,
    showingRaw,
    destroy,
    initialized,
  };
}

export default useTikTokLook;
