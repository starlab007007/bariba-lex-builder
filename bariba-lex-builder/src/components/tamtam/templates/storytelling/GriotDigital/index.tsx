import React, { useEffect, useRef, useCallback } from 'react';
import { TemplateEngine } from '../../../creator/TemplateSystem';
import type { Template } from '../../../creator/TemplateSystem';

interface GriotDigitalProps {
  videoElement: HTMLVideoElement | null;
  onReady?: () => void;
  onError?: (error: Error) => void;
  autoStart?: boolean;
}

// Template configuration
const GRIOT_DIGITAL_TEMPLATE: Template = {
  id: 'griot-digital',
  name: 'Griot Digital',
  category: 'storytelling',
  description: 'Traditional African storytelling with 3D Adinkra symbols',
  thumbnail: '/assets/templates/griot-digital/thumbnail.svg',
  demoVideo: '/assets/templates/griot-digital/demo.mp4',
  duration: 60,
  effects: [
    {
      type: 'texture',
      assetId: 'textures:parchment-001.png',
      trigger: 'always',
      config: {
        opacity: 0.4,
        blendMode: 'multiply'
      }
    },
    {
      type: 'lens-flare',
      assetId: 'lens-flare:flare-001.png',
      trigger: 'beat',
      config: {
        x: 0.5,
        y: 0.3,
        scale: 1.5,
        opacity: 0.7,
        blendMode: 'screen'
      }
    }
  ],
  audio: {
    backgroundMusic: 'audio:traditional-001.mp3',
    volume: 0.3,
    fadeWithSpeech: true
  }
};

export function GriotDigital({ 
  videoElement, 
  onReady, 
  onError,
  autoStart = true 
}: GriotDigitalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<TemplateEngine | null>(null);
  const isInitializedRef = useRef(false);

  const initTemplate = useCallback(async () => {
    if (!canvasRef.current || !videoElement || isInitializedRef.current) return;

    try {
      isInitializedRef.current = true;

      // Initialize template engine
      engineRef.current = new TemplateEngine(canvasRef.current);

      // Load template directly (fallback if config.json not available)
      engineRef.current.loadTemplateObject(GRIOT_DIGITAL_TEMPLATE);

      if (autoStart) {
        // Start rendering
        await engineRef.current.startRendering(videoElement, {
          mirror: false,
          onProgress: (progress) => {
            console.log(`[GriotDigital] Rendering progress: ${(progress * 100).toFixed(1)}%`);
          }
        });
      }

      onReady?.();
    } catch (error) {
      console.error('[GriotDigital] Initialization failed:', error);
      onError?.(error instanceof Error ? error : new Error('Template init failed'));
      isInitializedRef.current = false;
    }
  }, [videoElement, autoStart, onReady, onError]);

  useEffect(() => {
    initTemplate();

    return () => {
      if (engineRef.current) {
        engineRef.current.dispose();
        engineRef.current = null;
      }
      isInitializedRef.current = false;
    };
  }, [initTemplate]);

  // Handle video element changes
  useEffect(() => {
    if (videoElement && engineRef.current && isInitializedRef.current) {
      // Restart rendering with new video element
      engineRef.current.startRendering(videoElement, { mirror: false });
    }
  }, [videoElement]);

  return (
    <div className="griot-digital-template absolute inset-0 pointer-events-none">
      <canvas
        ref={canvasRef}
        width={1080}
        height={1920}
        className="w-full h-full object-cover"
        style={{
          filter: 'sepia(0.3) contrast(1.1)',
        }}
      />
      
      {/* Cultural overlay badge */}
      <div className="absolute bottom-4 left-4 px-3 py-1.5 rounded-full bg-amber-900/60 backdrop-blur-sm border border-amber-600/30">
        <span className="text-amber-200 text-xs font-medium flex items-center gap-1.5">
          <span>📜</span>
          Griot Digital
        </span>
      </div>
    </div>
  );
}

// Export template config for registry
export const griotDigitalConfig = GRIOT_DIGITAL_TEMPLATE;
export default GriotDigital;
