/**
 * IntegratedTemplateOverlay.tsx
 * Overlay template intégré qui se superpose à la caméra native
 * Affiche les effets K-Engine + guidance + contrôles sans remplacer la caméra
 */

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Volume2, VolumeX, Info } from 'lucide-react';
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
}

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
}) => {
  // Convertir les effets du template en format K-Engine
  const kuaishouEffects: KuaishouNativeEffects = useMemo(() => {
    const effects = template.kuaishouEffects;
    return {
      sparkles: effects?.sparkles ? {
        enabled: true,
        count: 20,
        colors: ['#FFD700', '#FFA500', '#FF6347', '#FFFFFF'],
      } : undefined,
      warmGlow: effects?.glow ? {
        enabled: true,
        intensity: 0.3,
        color: 'rgba(255,200,100,0.25)',
      } : undefined,
      beatGlow: effects?.beatSync ? {
        enabled: true,
        syncToBeat: true,
        bpm: 128,
        color: 'rgba(255,215,0,0.3)',
      } : undefined,
      calligraphy: effects?.calligraphy ? {
        enabled: true,
        texts: ['✨', template.name],
        color: '#FFD700',
      } : undefined,
      progressBar: {
        enabled: isRecording,
        color: '#FFD700',
        glowColor: 'rgba(255,215,0,0.5)',
        height: 4,
      },
    };
  }, [template, isRecording]);

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
        </motion.div>

        {/* Bouton fermer template */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-2"
        >
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
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center flex-shrink-0">
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

      {/* Indicateur d'enregistrement */}
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
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 0.8, repeat: Infinity }}
            />
            <span className="text-white text-sm font-medium bg-black/40 px-2 py-1 rounded-lg backdrop-blur-xl">
              {Math.floor(recordingTime)}s
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bordure stylisée quand template actif */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          boxShadow: `inset 0 0 60px rgba(255, 215, 0, 0.1)`,
          borderRadius: '0',
        }}
      />
    </div>
  );
};

export default IntegratedTemplateOverlay;
