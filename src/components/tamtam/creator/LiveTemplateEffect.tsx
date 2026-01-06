// LiveTemplateEffect.tsx
// Real-time template effects overlay on camera stream with advanced visual processing

import React, { useEffect, useRef, useMemo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AdvancedTemplate } from "./AdvancedTemplateData";
import { cn } from "@/lib/utils";

interface LiveTemplateEffectProps {
  template: AdvancedTemplate | null;
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef?: React.RefObject<HTMLCanvasElement>;
  isRecording: boolean;
  recordingDuration: number;
  currentStep: number;
  onProcessedFrame?: (canvas: HTMLCanvasElement) => void;
  className?: string;
}

const LiveTemplateEffect: React.FC<LiveTemplateEffectProps> = ({
  template,
  videoRef,
  canvasRef: externalCanvasRef,
  isRecording,
  recordingDuration,
  currentStep,
  onProcessedFrame,
  className,
}) => {
  const internalCanvasRef = useRef<HTMLCanvasElement>(null);
  const canvasRef = externalCanvasRef || internalCanvasRef;
  const animationRef = useRef<number | null>(null);
  const [pulseIntensity, setPulseIntensity] = useState(0);
  const [currentFilterIntensity, setCurrentFilterIntensity] = useState(0);

  // Get CSS filter string based on template
  const getTemplateFilter = useCallback((template: AdvancedTemplate, intensity: number = 1): string => {
    switch (template.family) {
      case 'grand_public':
        if (template.features.styleTransfer) {
          return `contrast(${1 + 0.1 * intensity}) saturate(${1 + 0.2 * intensity})`;
        }
        if (template.features.beatSync) {
          return `saturate(${1 + pulseIntensity * 0.3}) brightness(${1 + pulseIntensity * 0.1})`;
        }
        if (template.id === 'slow_mo_drama') {
          return 'contrast(1.15) saturate(0.9) brightness(0.95)';
        }
        return 'none';
        
      case 'educatif_culture':
        if (template.id === 'conte_du_soir') {
          return 'sepia(0.35) saturate(0.75) brightness(0.85) contrast(1.05)';
        }
        if (template.id === 'parole_ancien') {
          return 'sepia(0.25) contrast(1.1) brightness(0.95)';
        }
        if (template.id === 'carte_postale_beaute') {
          return 'saturate(1.3) contrast(1.05) brightness(1.05)';
        }
        return 'saturate(1.1)';
        
      case 'vocal_radio':
        if (template.id === 'radio_village') {
          return 'grayscale(0.3) contrast(1.1)';
        }
        return 'contrast(1.05) brightness(1.02)';
        
      default:
        return 'none';
    }
  }, [pulseIntensity]);

  // Generate overlay gradient based on template color
  const overlayGradient = useMemo(() => {
    if (!template) return null;
    
    const colorMap: Record<string, { start: string; end: string; opacity: number }> = {
      'from-purple-500 to-pink-500': { start: 'rgba(168,85,247,0.15)', end: 'rgba(236,72,153,0.15)', opacity: 0.15 },
      'from-amber-500 to-orange-500': { start: 'rgba(245,158,11,0.12)', end: 'rgba(249,115,22,0.12)', opacity: 0.12 },
      'from-blue-500 to-cyan-500': { start: 'rgba(59,130,246,0.12)', end: 'rgba(6,182,212,0.12)', opacity: 0.12 },
      'from-violet-500 to-purple-500': { start: 'rgba(139,92,246,0.18)', end: 'rgba(168,85,247,0.18)', opacity: 0.18 },
      'from-green-500 to-emerald-500': { start: 'rgba(34,197,94,0.12)', end: 'rgba(16,185,129,0.12)', opacity: 0.12 },
      'from-amber-600 to-yellow-500': { start: 'rgba(217,119,6,0.15)', end: 'rgba(234,179,8,0.15)', opacity: 0.15 },
      'from-purple-600 to-indigo-600': { start: 'rgba(147,51,234,0.2)', end: 'rgba(79,70,229,0.2)', opacity: 0.2 },
      'from-amber-700 to-orange-600': { start: 'rgba(180,83,9,0.15)', end: 'rgba(234,88,12,0.15)', opacity: 0.15 },
      'from-red-500 to-orange-500': { start: 'rgba(239,68,68,0.15)', end: 'rgba(249,115,22,0.15)', opacity: 0.15 },
      'from-yellow-500 to-amber-500': { start: 'rgba(234,179,8,0.15)', end: 'rgba(245,158,11,0.15)', opacity: 0.15 },
      'from-sky-500 to-blue-600': { start: 'rgba(14,165,233,0.12)', end: 'rgba(37,99,235,0.12)', opacity: 0.12 },
      'from-rose-500 to-pink-600': { start: 'rgba(244,63,94,0.15)', end: 'rgba(219,39,119,0.15)', opacity: 0.15 },
    };
    
    return colorMap[template.color] || { start: 'rgba(0,0,0,0.08)', end: 'rgba(0,0,0,0.12)', opacity: 0.1 };
  }, [template]);

  // Process video frame and apply effects to canvas
  const processFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (!video || !canvas || !template) {
      animationRef.current = requestAnimationFrame(processFrame);
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      animationRef.current = requestAnimationFrame(processFrame);
      return;
    }

    // Match canvas size to video
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth || 1920;
      canvas.height = video.videoHeight || 1080;
    }

    // Apply CSS filter to context
    const filterString = getTemplateFilter(template, currentFilterIntensity);
    ctx.filter = filterString;

    // Draw video frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Reset filter for overlays
    ctx.filter = 'none';

    // Apply color overlay gradient
    if (overlayGradient) {
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, overlayGradient.start);
      gradient.addColorStop(1, overlayGradient.end);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Apply vignette effect
    const vignetteGradient = ctx.createRadialGradient(
      canvas.width / 2, canvas.height / 2, canvas.height * 0.3,
      canvas.width / 2, canvas.height / 2, canvas.height * 0.8
    );
    vignetteGradient.addColorStop(0, 'transparent');
    vignetteGradient.addColorStop(1, 'rgba(0,0,0,0.4)');
    ctx.fillStyle = vignetteGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw watermark
    ctx.font = 'bold 24px system-ui';
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.textAlign = 'left';
    ctx.fillText(`${template.emoji} ${template.label_fr}`, 20, canvas.height - 20);

    // Callback for external processing
    if (onProcessedFrame) {
      onProcessedFrame(canvas);
    }

    animationRef.current = requestAnimationFrame(processFrame);
  }, [template, videoRef, canvasRef, overlayGradient, getTemplateFilter, currentFilterIntensity, onProcessedFrame]);

  // Start/stop frame processing
  useEffect(() => {
    if (isRecording && template) {
      animationRef.current = requestAnimationFrame(processFrame);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [isRecording, template, processFrame]);

  // Beat sync animation for music templates
  useEffect(() => {
    if (!template?.features.beatSync || !isRecording) {
      setPulseIntensity(0);
      return;
    }

    const BPM = 120;
    const interval = (60 / BPM) * 1000;

    const pulse = () => {
      setPulseIntensity(1);
      setTimeout(() => setPulseIntensity(0), interval * 0.3);
    };

    const beatInterval = setInterval(pulse, interval);
    return () => clearInterval(beatInterval);
  }, [template, isRecording]);

  // Animate filter intensity on mount
  useEffect(() => {
    if (template) {
      setCurrentFilterIntensity(0);
      const timer = setTimeout(() => setCurrentFilterIntensity(1), 100);
      return () => clearTimeout(timer);
    }
  }, [template]);

  if (!template) return null;

  return (
    <div className={cn("absolute inset-0 pointer-events-none overflow-hidden", className)}>
      {/* Hidden Canvas for Processing (if no external canvas) */}
      {!externalCanvasRef && (
        <canvas
          ref={internalCanvasRef}
          className="hidden"
        />
      )}

      {/* Template Overlay Gradient */}
      <AnimatePresence>
        {overlayGradient && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0"
            style={{ 
              background: `linear-gradient(135deg, ${overlayGradient.start} 0%, ${overlayGradient.end} 100%)` 
            }}
          />
        )}
      </AnimatePresence>

      {/* Top Vignette */}
      <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-black/40 to-transparent" />

      {/* Bottom Vignette */}
      <div className="absolute bottom-0 left-0 right-0 h-56 bg-gradient-to-t from-black/60 to-transparent" />

      {/* Template Watermark Badge */}
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.8 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.2, type: "spring" }}
        className="absolute top-5 left-5 flex items-center gap-3 px-4 py-2 rounded-full bg-black/50 backdrop-blur-md border border-white/10"
      >
        <span className="text-2xl">{template.emoji}</span>
        <span className="text-white text-sm font-semibold">{template.label_fr}</span>
      </motion.div>

      {/* Feature Badges - Active Features */}
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3 }}
        className="absolute top-5 right-5 flex flex-col gap-2"
      >
        {template.features.beatSync && (
          <motion.div
            animate={isRecording ? { 
              scale: [1, 1.1, 1],
              boxShadow: ['0 0 0 rgba(168,85,247,0)', '0 0 20px rgba(168,85,247,0.5)', '0 0 0 rgba(168,85,247,0)']
            } : {}}
            transition={{ duration: 0.5, repeat: Infinity }}
            className="px-3 py-1.5 rounded-full bg-purple-500/70 backdrop-blur-md text-white text-xs font-medium flex items-center gap-2"
          >
            🎵 Beat-Sync
          </motion.div>
        )}
        {template.features.smartCaptions && (
          <div className="px-3 py-1.5 rounded-full bg-green-500/70 backdrop-blur-md text-white text-xs font-medium flex items-center gap-2">
            💬 Sous-titres IA
          </div>
        )}
        {template.features.translation && (
          <div className="px-3 py-1.5 rounded-full bg-blue-500/70 backdrop-blur-md text-white text-xs font-medium flex items-center gap-2">
            🌍 FR ↔ Bariba
          </div>
        )}
        {template.features.audioEnhance && (
          <div className="px-3 py-1.5 rounded-full bg-orange-500/70 backdrop-blur-md text-white text-xs font-medium flex items-center gap-2">
            🔊 Audio HD
          </div>
        )}
        {template.features.stabilization && (
          <div className="px-3 py-1.5 rounded-full bg-cyan-500/70 backdrop-blur-md text-white text-xs font-medium flex items-center gap-2">
            📹 Stabilisé
          </div>
        )}
      </motion.div>

      {/* Recording Timer */}
      <AnimatePresence>
        {isRecording && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute top-20 left-1/2 -translate-x-1/2 flex items-center gap-3 px-5 py-2.5 rounded-full bg-red-500/90 backdrop-blur-md shadow-lg"
          >
            <motion.div
              animate={{ opacity: [1, 0.3, 1], scale: [1, 0.8, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="w-3 h-3 rounded-full bg-white"
            />
            <span className="text-white font-mono text-lg font-bold">
              {formatTime(recordingDuration)}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Step Progress Indicator */}
      {template.voiceInstructions.length > 0 && currentStep > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-36 left-5 right-5"
        >
          {/* Progress Dots */}
          <div className="flex gap-2 mb-3 justify-center">
            {template.voiceInstructions.map((_, i) => (
              <motion.div
                key={i}
                initial={false}
                animate={{
                  width: i + 1 === currentStep ? 32 : 12,
                  backgroundColor: i + 1 <= currentStep ? '#ffffff' : 'rgba(255,255,255,0.3)'
                }}
                className="h-3 rounded-full transition-all"
              />
            ))}
          </div>
          {/* Step Text */}
          <p className="text-white/90 text-base text-center font-medium">
            Étape {currentStep} sur {template.voiceInstructions.length}
          </p>
        </motion.div>
      )}

      {/* Corner Frame Decoration for specific templates */}
      {(template.id === 'style_transfer_local' || template.id === 'carte_postale_beaute' || template.id === 'mini_doc_village') && (
        <>
          <motion.div 
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="absolute top-12 left-5 w-16 h-16 border-l-3 border-t-3 border-white/50 rounded-tl-2xl" 
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="absolute top-12 right-5 w-16 h-16 border-r-3 border-t-3 border-white/50 rounded-tr-2xl" 
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6 }}
            className="absolute bottom-32 left-5 w-16 h-16 border-l-3 border-b-3 border-white/50 rounded-bl-2xl" 
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.7 }}
            className="absolute bottom-32 right-5 w-16 h-16 border-r-3 border-b-3 border-white/50 rounded-br-2xl" 
          />
        </>
      )}

      {/* Conte du Soir - Firefly Effect */}
      {template.id === 'conte_du_soir' && (
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ 
                x: `${Math.random() * 100}%`, 
                y: '110%',
                opacity: 0,
                scale: Math.random() * 0.5 + 0.5
              }}
              animate={{ 
                y: '-10%',
                opacity: [0, 0.9, 0.9, 0],
                x: [`${Math.random() * 100}%`, `${Math.random() * 100}%`]
              }}
              transition={{
                duration: 5 + Math.random() * 4,
                repeat: Infinity,
                delay: Math.random() * 6,
                ease: "easeInOut"
              }}
              className="absolute w-2 h-2 bg-amber-300 rounded-full"
              style={{ 
                filter: 'blur(1px)',
                boxShadow: '0 0 8px 2px rgba(251, 191, 36, 0.6)'
              }}
            />
          ))}
        </div>
      )}

      {/* Radio Village - Audio Waveform Visualization */}
      {template.id === 'radio_village' && isRecording && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute bottom-36 left-5 right-5 flex items-end justify-center gap-1 h-20"
        >
          {[...Array(50)].map((_, i) => (
            <motion.div
              key={i}
              animate={{
                height: [
                  Math.random() * 15 + 8,
                  Math.random() * 50 + 15,
                  Math.random() * 15 + 8,
                ],
              }}
              transition={{
                duration: 0.25,
                repeat: Infinity,
                repeatType: 'mirror',
                delay: i * 0.015,
              }}
              className="w-1.5 bg-gradient-to-t from-orange-600 to-amber-400 rounded-full"
            />
          ))}
        </motion.div>
      )}

      {/* Beat Sync Pulse Overlay */}
      {template.features.beatSync && pulseIntensity > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: pulseIntensity * 0.15 }}
          className="absolute inset-0 bg-white pointer-events-none"
        />
      )}

      {/* Slow Mo Drama - Cinematic Bars */}
      {template.id === 'slow_mo_drama' && (
        <>
          <div className="absolute top-0 left-0 right-0 h-16 bg-black" />
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-black" />
        </>
      )}
    </div>
  );
};

// Helper function
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default LiveTemplateEffect;
