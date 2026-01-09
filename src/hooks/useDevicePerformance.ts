// src/hooks/useDevicePerformance.ts
// Auto-detect device performance tier for K-Engine quality optimization

import { useState, useEffect, useCallback } from 'react';

export type PerformanceTier = 'low' | 'medium' | 'high';

export interface DevicePerformanceInfo {
  tier: PerformanceTier;
  cpuCores: number;
  deviceMemory: number | null;
  gpuInfo: string | null;
  benchmarkScore: number;
  maxCanvasSize: number;
  recommendedFps: number;
  recommendedResolution: { width: number; height: number };
}

// Run a quick canvas benchmark to measure rendering speed
async function runCanvasBenchmark(): Promise<number> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      resolve(0);
      return;
    }

    const iterations = 50;
    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
      // Complex operations to stress test
      const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
      gradient.addColorStop(0, `hsl(${i * 7}, 70%, 50%)`);
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 512, 512);

      // Draw some shapes
      ctx.beginPath();
      ctx.arc(256, 256, 100 + Math.sin(i) * 50, 0, Math.PI * 2);
      ctx.stroke();

      // Alpha compositing
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = '#FFD700';
      ctx.fillRect(100, 100, 312, 312);
      ctx.globalAlpha = 1;
    }

    const elapsed = performance.now() - start;
    const fps = (iterations / elapsed) * 1000;
    
    canvas.remove();
    resolve(fps);
  });
}

// Get GPU info from WebGL
function getGPUInfo(): string | null {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl') as WebGLRenderingContext | null;
    if (!gl) return null;

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (!debugInfo) return null;

    const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
    canvas.remove();
    return renderer as string;
  } catch {
    return null;
  }
}

// Determine max canvas size based on device
function getMaxCanvasSize(): number {
  const canvas = document.createElement('canvas');
  const maxSize = Math.min(
    8192, // WebGL max
    window.screen.width * window.devicePixelRatio * 2,
    window.screen.height * window.devicePixelRatio * 2
  );
  canvas.remove();
  return maxSize;
}

// Calculate performance tier based on all metrics
function calculateTier(
  cpuCores: number,
  deviceMemory: number | null,
  benchmarkScore: number,
  gpuInfo: string | null
): PerformanceTier {
  let score = 0;

  // CPU cores scoring
  if (cpuCores >= 8) score += 3;
  else if (cpuCores >= 4) score += 2;
  else score += 1;

  // Memory scoring
  if (deviceMemory !== null) {
    if (deviceMemory >= 8) score += 3;
    else if (deviceMemory >= 4) score += 2;
    else score += 1;
  } else {
    score += 2; // Assume medium if unknown
  }

  // Benchmark scoring (FPS for 50 canvas operations)
  if (benchmarkScore >= 300) score += 3;
  else if (benchmarkScore >= 150) score += 2;
  else score += 1;

  // GPU boost for known high-end GPUs
  if (gpuInfo) {
    const gpuLower = gpuInfo.toLowerCase();
    if (gpuLower.includes('apple m') || gpuLower.includes('nvidia') || gpuLower.includes('radeon')) {
      score += 1;
    }
    if (gpuLower.includes('mali-4') || gpuLower.includes('adreno 3')) {
      score -= 1; // Older mobile GPUs
    }
  }

  // Determine tier
  if (score >= 9) return 'high';
  if (score >= 6) return 'medium';
  return 'low';
}

// Get recommended settings for each tier
function getRecommendedSettings(tier: PerformanceTier): {
  fps: number;
  resolution: { width: number; height: number };
} {
  switch (tier) {
    case 'high':
      return { fps: 30, resolution: { width: 1080, height: 1920 } };
    case 'medium':
      return { fps: 24, resolution: { width: 720, height: 1280 } };
    case 'low':
      return { fps: 15, resolution: { width: 480, height: 854 } };
  }
}

export function useDevicePerformance() {
  const [performanceInfo, setPerformanceInfo] = useState<DevicePerformanceInfo | null>(null);
  const [isDetecting, setIsDetecting] = useState(true);

  const detectPerformance = useCallback(async () => {
    setIsDetecting(true);

    try {
      // Gather metrics
      const cpuCores = navigator.hardwareConcurrency || 2;
      const deviceMemory = (navigator as any).deviceMemory || null;
      const gpuInfo = getGPUInfo();
      const maxCanvasSize = getMaxCanvasSize();
      const benchmarkScore = await runCanvasBenchmark();

      // Calculate tier
      const tier = calculateTier(cpuCores, deviceMemory, benchmarkScore, gpuInfo);
      const recommended = getRecommendedSettings(tier);

      const info: DevicePerformanceInfo = {
        tier,
        cpuCores,
        deviceMemory,
        gpuInfo,
        benchmarkScore: Math.round(benchmarkScore),
        maxCanvasSize,
        recommendedFps: recommended.fps,
        recommendedResolution: recommended.resolution,
      };

      setPerformanceInfo(info);
      
      // Cache in sessionStorage
      try {
        sessionStorage.setItem('tamtam_device_performance', JSON.stringify(info));
      } catch {}

      console.log('[DevicePerformance] Detected:', info);
    } catch (error) {
      console.error('[DevicePerformance] Detection failed:', error);
      // Fallback to medium
      setPerformanceInfo({
        tier: 'medium',
        cpuCores: navigator.hardwareConcurrency || 2,
        deviceMemory: null,
        gpuInfo: null,
        benchmarkScore: 0,
        maxCanvasSize: 2048,
        recommendedFps: 24,
        recommendedResolution: { width: 720, height: 1280 },
      });
    } finally {
      setIsDetecting(false);
    }
  }, []);

  useEffect(() => {
    // Check cache first
    try {
      const cached = sessionStorage.getItem('tamtam_device_performance');
      if (cached) {
        const parsed = JSON.parse(cached) as DevicePerformanceInfo;
        setPerformanceInfo(parsed);
        setIsDetecting(false);
        return;
      }
    } catch {}

    detectPerformance();
  }, [detectPerformance]);

  return {
    performanceInfo,
    isDetecting,
    redetect: detectPerformance,
  };
}

// K-Engine quality settings based on performance tier
export function getKEngineQualitySettings(tier: PerformanceTier) {
  switch (tier) {
    case 'high':
      return {
        canvasScale: 1.0,        // Full resolution
        effectsEnabled: true,
        sparklesCount: 16,
        filmGrainEnabled: true,
        shadowBlur: 12,
        targetFps: 30,
      };
    case 'medium':
      return {
        canvasScale: 0.75,       // 75% resolution
        effectsEnabled: true,
        sparklesCount: 8,
        filmGrainEnabled: false,
        shadowBlur: 6,
        targetFps: 24,
      };
    case 'low':
      return {
        canvasScale: 0.5,        // 50% resolution
        effectsEnabled: true,
        sparklesCount: 4,
        filmGrainEnabled: false,
        shadowBlur: 0,
        targetFps: 15,
      };
  }
}
