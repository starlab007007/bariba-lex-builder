// LiveTemplateEffect.tsx
// Real-time template effects overlay on camera stream

import React, { useEffect, useRef, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AdvancedTemplate } from "./AdvancedTemplateData";
import { cn } from "@/lib/utils";

interface LiveTemplateEffectProps {
  template: AdvancedTemplate | null;
  isRecording: boolean;
  recordingDuration: number;
  currentStep: number;
  className?: string;
}

const LiveTemplateEffect: React.FC<LiveTemplateEffectProps> = ({
  template,
  isRecording,
  recordingDuration,
  currentStep,
  className,
}) => {
  const [pulseIntensity, setPulseIntensity] = useState(0);
  const animationRef = useRef<number | null>(null);

  // Generate CSS filter based on template
  const templateFilter = useMemo(() => {
    if (!template) return 'none';
    
    // Apply different filters based on template family
    switch (template.family) {
      case 'grand_public':
        if (template.features.styleTransfer) {
          return 'contrast(1.1) saturate(1.2)';
        }
        if (template.features.beatSync) {
          return `saturate(${1 + pulseIntensity * 0.3}) brightness(${1 + pulseIntensity * 0.1})`;
        }
        return 'none';
        
      case 'educatif_culture':
        if (template.id === 'conte_du_soir') {
          return 'sepia(0.3) saturate(0.8) brightness(0.9)';
        }
        if (template.id === 'parole_ancien') {
          return 'sepia(0.2) contrast(1.05)';
        }
        return 'saturate(1.1)';
        
      case 'vocal_radio':
        return 'contrast(1.05) brightness(1.02)';
        
      default:
        return 'none';
    }
  }, [template, pulseIntensity]);

  // Overlay gradient based on template color
  const overlayGradient = useMemo(() => {
    if (!template) return null;
    
    // Parse color class to create actual gradient
    const colorMap: Record<string, string> = {
      'from-purple-500 to-pink-500': 'linear-gradient(135deg, rgba(168,85,247,0.2) 0%, rgba(236,72,153,0.2) 100%)',
      'from-amber-500 to-orange-500': 'linear-gradient(135deg, rgba(245,158,11,0.15) 0%, rgba(249,115,22,0.15) 100%)',
      'from-blue-500 to-cyan-500': 'linear-gradient(135deg, rgba(59,130,246,0.15) 0%, rgba(6,182,212,0.15) 100%)',
      'from-violet-500 to-purple-500': 'linear-gradient(135deg, rgba(139,92,246,0.2) 0%, rgba(168,85,247,0.2) 100%)',
      'from-green-500 to-emerald-500': 'linear-gradient(135deg, rgba(34,197,94,0.15) 0%, rgba(16,185,129,0.15) 100%)',
      'from-amber-600 to-yellow-500': 'linear-gradient(135deg, rgba(217,119,6,0.2) 0%, rgba(234,179,8,0.2) 100%)',
      'from-purple-600 to-indigo-600': 'linear-gradient(135deg, rgba(147,51,234,0.25) 0%, rgba(79,70,229,0.25) 100%)',
      'from-amber-700 to-orange-600': 'linear-gradient(135deg, rgba(180,83,9,0.2) 0%, rgba(234,88,12,0.2) 100%)',
      'from-red-500 to-orange-500': 'linear-gradient(135deg, rgba(239,68,68,0.2) 0%, rgba(249,115,22,0.2) 100%)',
      'from-yellow-500 to-amber-500': 'linear-gradient(135deg, rgba(234,179,8,0.2) 0%, rgba(245,158,11,0.2) 100%)',
      'from-sky-500 to-blue-600': 'linear-gradient(135deg, rgba(14,165,233,0.15) 0%, rgba(37,99,235,0.15) 100%)',
      'from-rose-500 to-pink-600': 'linear-gradient(135deg, rgba(244,63,94,0.2) 0%, rgba(219,39,119,0.2) 100%)',
    };
    
    return colorMap[template.color] || 'linear-gradient(135deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.2) 100%)';
  }, [template]);

  // Beat sync animation for music templates
  useEffect(() => {
    if (!template?.features.beatSync || !isRecording) {
      setPulseIntensity(0);
      return;
    }

    // Simulate beat sync with varying intensity
    const BPM = 120;
    const interval = (60 / BPM) * 1000;

    const pulse = () => {
      setPulseIntensity(1);
      setTimeout(() => setPulseIntensity(0), interval * 0.3);
    };

    const beatInterval = setInterval(pulse, interval);
    return () => clearInterval(beatInterval);
  }, [template, isRecording]);

  if (!template) return null;

  return (
    <div className={cn("absolute inset-0 pointer-events-none", className)}>
      {/* Template Overlay Gradient */}
      <AnimatePresence>
        {overlayGradient && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0"
            style={{ background: overlayGradient }}
          />
        )}
      </AnimatePresence>

      {/* Top Vignette */}
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/30 to-transparent" />

      {/* Bottom Vignette (stronger) */}
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-black/50 to-transparent" />

      {/* Template Watermark Badge */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md"
      >
        <span className="text-lg">{template.emoji}</span>
        <span className="text-white text-xs font-medium">{template.label_fr}</span>
      </motion.div>

      {/* Feature Badges - Active Features */}
      <div className="absolute top-4 right-4 flex flex-col gap-1">
        {template.features.beatSync && (
          <motion.div
            animate={{ scale: isRecording ? [1, 1.1, 1] : 1 }}
            transition={{ duration: 0.5, repeat: Infinity }}
            className="px-2 py-1 rounded-full bg-purple-500/60 backdrop-blur-md text-white text-xs flex items-center gap-1"
          >
            🎵 Beat-Sync
          </motion.div>
        )}
        {template.features.smartCaptions && (
          <div className="px-2 py-1 rounded-full bg-green-500/60 backdrop-blur-md text-white text-xs flex items-center gap-1">
            💬 Sous-titres IA
          </div>
        )}
        {template.features.translation && (
          <div className="px-2 py-1 rounded-full bg-blue-500/60 backdrop-blur-md text-white text-xs flex items-center gap-1">
            🌍 Traduction
          </div>
        )}
        {template.features.audioEnhance && (
          <div className="px-2 py-1 rounded-full bg-orange-500/60 backdrop-blur-md text-white text-xs flex items-center gap-1">
            🔊 Audio+
          </div>
        )}
      </div>

      {/* Recording Timer */}
      {isRecording && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute top-16 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/80 backdrop-blur-md"
        >
          <motion.div
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="w-2 h-2 rounded-full bg-white"
          />
          <span className="text-white font-mono text-sm">
            {formatTime(recordingDuration)}
          </span>
        </motion.div>
      )}

      {/* Step Indicator */}
      {template.voiceInstructions.length > 0 && currentStep > 0 && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="absolute bottom-32 left-4 right-4"
        >
          <div className="flex gap-1 mb-2">
            {template.voiceInstructions.map((_, i) => (
              <div
                key={i}
                className={cn(
                  "flex-1 h-1 rounded-full transition-all",
                  i + 1 <= currentStep ? "bg-white" : "bg-white/30"
                )}
              />
            ))}
          </div>
          <p className="text-white/90 text-sm text-center">
            Étape {currentStep}/{template.voiceInstructions.length}
          </p>
        </motion.div>
      )}

      {/* Corner Frame for certain templates */}
      {(template.id === 'style_transfer_local' || template.id === 'carte_postale_beaute') && (
        <>
          <div className="absolute top-8 left-4 w-12 h-12 border-l-2 border-t-2 border-white/40 rounded-tl-lg" />
          <div className="absolute top-8 right-4 w-12 h-12 border-r-2 border-t-2 border-white/40 rounded-tr-lg" />
          <div className="absolute bottom-24 left-4 w-12 h-12 border-l-2 border-b-2 border-white/40 rounded-bl-lg" />
          <div className="absolute bottom-24 right-4 w-12 h-12 border-r-2 border-b-2 border-white/40 rounded-br-lg" />
        </>
      )}

      {/* Conte du Soir special effect */}
      {template.id === 'conte_du_soir' && (
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(15)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ 
                x: Math.random() * 100 + '%', 
                y: '110%',
                opacity: 0 
              }}
              animate={{ 
                y: '-10%',
                opacity: [0, 0.8, 0] 
              }}
              transition={{
                duration: 4 + Math.random() * 3,
                repeat: Infinity,
                delay: Math.random() * 5,
              }}
              className="absolute w-1 h-1 bg-amber-300 rounded-full"
              style={{ filter: 'blur(1px)' }}
            />
          ))}
        </div>
      )}

      {/* Radio Village waveform effect */}
      {template.id === 'radio_village' && isRecording && (
        <div className="absolute bottom-32 left-4 right-4 flex items-end justify-center gap-0.5 h-16">
          {[...Array(40)].map((_, i) => (
            <motion.div
              key={i}
              animate={{
                height: [
                  Math.random() * 20 + 5,
                  Math.random() * 40 + 10,
                  Math.random() * 20 + 5,
                ],
              }}
              transition={{
                duration: 0.3,
                repeat: Infinity,
                repeatType: 'mirror',
                delay: i * 0.02,
              }}
              className="w-1.5 bg-gradient-to-t from-orange-500 to-red-500 rounded-full"
            />
          ))}
        </div>
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
