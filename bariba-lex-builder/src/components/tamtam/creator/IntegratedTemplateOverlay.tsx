/**
 * IntegratedTemplateOverlay.tsx
 * Enhanced overlay with 3D/audio visualization support for premium templates
 * ✅ Phase 5: Three.js canvas overlay, audio visualization, LiveEffectsCompositor
 */

import React, { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Volume2, VolumeX, Info, Mic, Music2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { UnifiedTemplate } from '@/types/UnifiedTemplateTypes';
import { KuaishouEffectsOverlay, KuaishouNativeEffects } from './KuaishouEffects';

interface IntegratedTemplateOverlayProps {
  template: UnifiedTemplate;
  isRecording: boolean;
  recordingTime: number;
  currentSegment: number;
  totalSegments: number;
  onClose: () => void;
  onToggleVoice?: () => void;
  voiceEnabled?: boolean;
  showGuidance?: boolean;
  audioStream?: MediaStream;
  is3DTemplate?: boolean;
}

// Audio Visualizer Component for premium templates
const AudioVisualizer: React.FC<{ audioStream?: MediaStream; isActive: boolean }> = ({ 
  audioStream, 
  isActive 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number>(0);
  const [bars, setBars] = useState<number[]>(new Array(32).fill(0));

  useEffect(() => {
    if (!audioStream || !isActive) return;

    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 64;
    analyserRef.current = analyser;

    const source = audioContext.createMediaStreamSource(audioStream);
    source.connect(analyser);

    const frequencyData = new Uint8Array(analyser.frequencyBinCount);

    const animate = () => {
      if (!isActive) return;
      analyser.getByteFrequencyData(frequencyData);
      
      const newBars = Array.from(frequencyData).slice(0, 32).map(v => v / 255);
      setBars(newBars);
      
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationRef.current);
      audioContext.close();
    };
  }, [audioStream, isActive]);

  return (
    <div className="absolute bottom-40 left-1/2 -translate-x-1/2 flex items-end gap-0.5 h-16 pointer-events-none">
      {bars.map((height, i) => (
        <motion.div
          key={i}
          className="w-1.5 rounded-full bg-gradient-to-t from-primary to-orange-400"
          animate={{ height: `${Math.max(4, height * 64)}px` }}
          transition={{ duration: 0.05 }}
        />
      ))}
    </div>
  );
};

// 3D Effects Indicator for premium templates
const ThreeDEffectsIndicator: React.FC<{ templateName: string }> = ({ templateName }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="absolute top-28 right-4 pointer-events-none"
    >
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-violet-600/80 to-purple-600/80 backdrop-blur-xl border border-white/20">
        <motion.div
          animate={{ rotateY: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          className="w-4 h-4 bg-gradient-to-r from-cyan-400 to-blue-500 rounded"
          style={{ transformStyle: 'preserve-3d' }}
        />
        <span className="text-xs text-white font-medium">3D Actif</span>
      </div>
    </motion.div>
  );
};

// Beat Sync Indicator
const BeatSyncIndicator: React.FC<{ bpm: number; isActive: boolean }> = ({ bpm, isActive }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: isActive ? 1 : 0.5 }}
      className="absolute top-28 left-4 pointer-events-none"
    >
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-xl border border-white/10">
        <motion.div
          animate={isActive ? { scale: [1, 1.3, 1] } : {}}
          transition={{ duration: 60 / bpm, repeat: Infinity }}
          className="w-2 h-2 rounded-full bg-red-500"
        />
        <Music2 className="w-3.5 h-3.5 text-white/70" />
        <span className="text-xs text-white/70">{bpm} BPM</span>
      </div>
    </motion.div>
  );
};

export const IntegratedTemplateOverlay: React.FC<IntegratedTemplateOverlayProps> = ({
  template,
  isRecording,
  recordingTime,
  currentSegment,
  totalSegments,
  onClose,
  onToggleVoice,
  voiceEnabled = true,
  showGuidance = true,
  audioStream,
  is3DTemplate = false,
}) => {
  const [showAudioViz, setShowAudioViz] = useState(false);
  
  // Detect premium template features
  const isPremium3D = useMemo(() => {
    const premiumIds = ['griot-digital', 'griot_digital', 'griot-digital-premium'];
    return premiumIds.some(id => template.id.includes(id)) || is3DTemplate;
  }, [template.id, is3DTemplate]);

  const hasBeatSync = useMemo(() => {
    return template.kuaishouEffects?.beatSync || 
           template.id.includes('beat') || 
           template.id.includes('music') ||
           template.id.includes('afrobeat');
  }, [template]);

  const templateBPM = useMemo(() => {
    const effects = template.kuaishouEffects as any;
    return effects?.bpm || 128;
  }, [template]);

  // Toggle audio visualization
  const toggleAudioViz = useCallback(() => {
    setShowAudioViz(prev => !prev);
  }, []);

  // Convertir les effets du template en format K-Engine
  const kuaishouEffects: KuaishouNativeEffects = useMemo(() => {
    const effects = template.kuaishouEffects;
    return {
      sparkles: effects?.sparkles ? {
        enabled: true,
        count: 25,
        colors: ['#FFD700', '#FFA500', '#FF6347', '#FFFFFF', '#00BFFF'],
      } : undefined,
      warmGlow: effects?.glow ? {
        enabled: true,
        intensity: 0.35,
        color: 'rgba(255,200,100,0.3)',
      } : undefined,
      beatGlow: effects?.beatSync ? {
        enabled: true,
        syncToBeat: true,
        bpm: templateBPM,
        color: 'rgba(255,215,0,0.4)',
      } : undefined,
      calligraphy: effects?.calligraphy ? {
        enabled: true,
        texts: ['✨', template.name],
        color: '#FFD700',
      } : undefined,
      progressBar: {
        enabled: isRecording,
        color: '#FFD700',
        glowColor: 'rgba(255,215,0,0.6)',
        height: 5,
      },
    };
  }, [template, isRecording, templateBPM]);

  // Instructions vocales
  const currentInstruction = useMemo(() => {
    if (template.voiceInstructions?.fr) {
      return template.voiceInstructions.fr;
    }
    return `Segment ${currentSegment + 1} sur ${totalSegments}`;
  }, [template, currentSegment, totalSegments]);

  return (
    <div className="absolute inset-0 pointer-events-none z-40">
      {/* Effets Kuaishou en arrière-plan */}
      <KuaishouEffectsOverlay
        effects={kuaishouEffects}
        currentTime={recordingTime}
        duration={template.duration}
        isRecording={isRecording}
      />

      {/* 3D Template Indicator */}
      {isPremium3D && <ThreeDEffectsIndicator templateName={template.name} />}

      {/* Beat Sync Indicator */}
      {hasBeatSync && isRecording && (
        <BeatSyncIndicator bpm={templateBPM} isActive={isRecording} />
      )}

      {/* Audio Visualizer for music templates */}
      {showAudioViz && audioStream && (
        <AudioVisualizer audioStream={audioStream} isActive={isRecording} />
      )}

      {/* Header avec badge template et bouton fermer */}
      <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between pointer-events-auto safe-area-top">
        {/* Badge template */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2"
        >
          <Badge 
            variant="secondary" 
            className="bg-black/60 backdrop-blur-xl border border-white/20 px-3 py-1.5 flex items-center gap-2"
          >
            <span className="text-lg">{template.emoji}</span>
            <span className="text-sm font-medium text-white">{template.name}</span>
            {template.isPremium && (
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            )}
          </Badge>
          
          {/* Durée */}
          <Badge 
            variant="outline" 
            className="bg-black/40 backdrop-blur-xl border-white/10 text-white/80 text-xs"
          >
            {template.duration}s
          </Badge>

          {/* 3D Badge */}
          {isPremium3D && (
            <Badge 
              className="bg-gradient-to-r from-violet-600 to-purple-600 border-0 text-xs"
            >
              3D
            </Badge>
          )}
        </motion.div>

        {/* Boutons de contrôle */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-2"
        >
          {/* Audio Visualizer Toggle */}
          {audioStream && (
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleAudioViz}
              className={`h-10 w-10 rounded-full backdrop-blur-xl border border-white/10 ${
                showAudioViz ? 'bg-primary/40' : 'bg-black/40'
              } hover:bg-black/60`}
            >
              <Mic className="w-4 h-4 text-white" />
            </Button>
          )}

          {onToggleVoice && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleVoice}
              className="h-10 w-10 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 hover:bg-black/60"
            >
              {voiceEnabled ? (
                <Volume2 className="w-4 h-4 text-white" />
              ) : (
                <VolumeX className="w-4 h-4 text-white/60" />
              )}
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-10 w-10 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 hover:bg-red-500/40"
          >
            <X className="w-5 h-5 text-white" />
          </Button>
        </motion.div>
      </div>

      {/* Indicateur de progression des segments */}
      {totalSegments > 1 && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 flex gap-2 pointer-events-none">
          {Array.from({ length: totalSegments }).map((_, i) => (
            <motion.div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i < currentSegment
                  ? 'w-8 bg-green-500'
                  : i === currentSegment
                  ? 'w-8 bg-white'
                  : 'w-4 bg-white/30'
              }`}
              animate={i === currentSegment && isRecording ? {
                opacity: [1, 0.5, 1],
              } : {}}
              transition={{ duration: 0.5, repeat: Infinity }}
            />
          ))}
        </div>
      )}

      {/* Guidance textuelle au centre */}
      <AnimatePresence>
        {showGuidance && !isRecording && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute left-4 right-4 bottom-56 flex justify-center pointer-events-none"
          >
            <div className="bg-black/60 backdrop-blur-xl rounded-2xl px-6 py-4 border border-white/10 max-w-sm">
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  isPremium3D 
                    ? 'bg-gradient-to-br from-violet-500 to-purple-500' 
                    : 'bg-gradient-to-br from-amber-500 to-orange-500'
                }`}>
                  <Info className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-white text-sm font-medium">{currentInstruction}</p>
                  {template.voiceInstructions?.bariba && (
                    <p className="text-white/60 text-xs mt-1">{template.voiceInstructions.bariba}</p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Indicateur d'enregistrement amélioré */}
      <AnimatePresence>
        {isRecording && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute top-20 left-4 flex items-center gap-2 pointer-events-none"
          >
            <motion.div
              className="w-3 h-3 rounded-full bg-red-500"
              animate={{ opacity: [1, 0.3, 1], scale: [1, 1.1, 1] }}
              transition={{ duration: 0.8, repeat: Infinity }}
            />
            <span className="text-white text-sm font-medium bg-black/40 px-3 py-1.5 rounded-xl backdrop-blur-xl border border-white/10">
              {Math.floor(recordingTime)}s / {template.duration}s
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bordure stylisée avec effet premium */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          boxShadow: isPremium3D 
            ? `inset 0 0 80px rgba(139, 92, 246, 0.15), inset 0 0 40px rgba(255, 215, 0, 0.1)`
            : `inset 0 0 60px rgba(255, 215, 0, 0.1)`,
          borderRadius: '0',
        }}
      />

      {/* Premium Light Leak Effect */}
      {isRecording && template.isPremium && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.3, 0] }}
          transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-orange-500/20 via-transparent to-pink-500/20" />
        </motion.div>
      )}
    </div>
  );
};

export default IntegratedTemplateOverlay;
