// ============================================================
// RECOGNIZING SCREEN - Kuaishou-style AI processing with progress
// Shows "Recognizing XX%" with visual feedback and step labels
// ============================================================

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Loader2, Sparkles, Wand2, Camera, MessageSquare, Music, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { AdvancedTemplate } from "./AdvancedTemplateData";

interface RecognizingScreenProps {
  isVisible: boolean;
  progress: number; // 0-100
  currentStep?: string; // e.g. "smart_crop", "segmentation_person", etc.
  template: AdvancedTemplate;
  previewUrl?: string; // Preview of the processed media
  onComplete?: () => void;
}

interface PipelineStep {
  op: string;
  label_fr: string;
  icon: React.ReactNode;
  weight: number;
}

const PIPELINE_LABELS: Record<string, { label: string; icon: React.ReactNode }> = {
  smart_crop: { label: "Recadrage intelligent", icon: <Camera className="h-4 w-4" /> },
  stabilization: { label: "Stabilisation", icon: <Zap className="h-4 w-4" /> },
  segmentation_person: { label: "Détourage personnage", icon: <Wand2 className="h-4 w-4" /> },
  audio_enhance: { label: "Amélioration audio", icon: <Music className="h-4 w-4" /> },
  asr_subtitles: { label: "Génération sous-titres", icon: <MessageSquare className="h-4 w-4" /> },
  translation_subtitles: { label: "Traduction", icon: <Sparkles className="h-4 w-4" /> },
  beat_detect: { label: "Détection du rythme", icon: <Music className="h-4 w-4" /> },
  style_transfer: { label: "Style cinéma", icon: <Wand2 className="h-4 w-4" /> },
  photo_animation: { label: "Animation photo", icon: <Camera className="h-4 w-4" /> },
  icon_injection: { label: "Ajout d'icônes", icon: <Sparkles className="h-4 w-4" /> },
  narrative_structure: { label: "Structure narrative", icon: <MessageSquare className="h-4 w-4" /> },
  denoise_sharpen: { label: "Amélioration qualité", icon: <Zap className="h-4 w-4" /> },
};

const RecognizingScreen: React.FC<RecognizingScreenProps> = ({
  isVisible,
  progress,
  currentStep,
  template,
  previewUrl,
  onComplete,
}) => {
  const [showComplete, setShowComplete] = useState(false);

  // Get pipeline steps from template
  const pipelineSteps = template.engine?.variants?.[template.engine.defaultDuration]?.pipeline || [];

  // Trigger complete callback when done
  useEffect(() => {
    if (progress >= 100 && !showComplete) {
      setShowComplete(true);
      const timer = setTimeout(() => {
        onComplete?.();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [progress, showComplete, onComplete]);

  if (!isVisible) return null;

  const stepInfo = currentStep ? PIPELINE_LABELS[currentStep] : null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[65] bg-black flex flex-col items-center justify-center"
    >
      {/* Background gradient based on template color */}
      <div className={cn(
        "absolute inset-0 opacity-20 bg-gradient-to-br",
        template.color
      )} />

      {/* Preview area */}
      <div className="relative z-10 w-full max-w-sm aspect-[9/16] mb-8 rounded-3xl overflow-hidden bg-white/5 border border-white/10">
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="Traitement en cours"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-7xl"
            >
              {template.emoji}
            </motion.div>
          </div>
        )}

        {/* Processing overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* Language availability badge (like Kuaishou) */}
        <div className="absolute top-4 right-4 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm text-xs text-white/80">
          Disponible: Français • Bariba
        </div>

        {/* Bottom content */}
        <div className="absolute bottom-0 left-0 right-0 p-6">
          {/* Progress percentage */}
          <div className="text-center mb-4">
            <AnimatePresence mode="wait">
              {showComplete ? (
                <motion.div
                  key="complete"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="flex items-center justify-center gap-2"
                >
                  <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center">
                    <Check className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-white text-2xl font-bold">Terminé!</span>
                </motion.div>
              ) : (
                <motion.div
                  key="progress"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Loader2 className="h-5 w-5 text-white animate-spin" />
                    <span className="text-white text-3xl font-bold">
                      Recognizing {Math.round(progress)}%
                    </span>
                  </div>
                  {stepInfo && (
                    <div className="flex items-center gap-2 text-white/70 text-sm">
                      {stepInfo.icon}
                      <span>{stepInfo.label}</span>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Progress bar */}
          <div className="w-full h-2 rounded-full bg-white/20 overflow-hidden">
            <motion.div
              className={cn(
                "h-full rounded-full",
                showComplete
                  ? "bg-green-500"
                  : "bg-gradient-to-r from-orange-500 to-red-500"
              )}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ ease: "easeOut" }}
            />
          </div>

          {/* Pipeline steps indicator */}
          <div className="flex justify-center gap-2 mt-4">
            {pipelineSteps.slice(0, 6).map((step, index) => {
              const stepProgress = (100 / pipelineSteps.length) * (index + 1);
              const isComplete = progress >= stepProgress;
              const isCurrent = currentStep === step.op;
              const stepLabel = PIPELINE_LABELS[step.op];

              return (
                <motion.div
                  key={step.op}
                  animate={isCurrent ? { scale: [1, 1.2, 1] } : {}}
                  transition={{ duration: 0.5, repeat: isCurrent ? Infinity : 0 }}
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs",
                    isComplete
                      ? "bg-green-500/30 text-green-400"
                      : isCurrent
                      ? "bg-orange-500/30 text-orange-400"
                      : "bg-white/10 text-white/40"
                  )}
                  title={stepLabel?.label || step.op}
                >
                  {isComplete ? (
                    <Check className="h-4 w-4" />
                  ) : stepLabel?.icon ? (
                    stepLabel.icon
                  ) : (
                    index + 1
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Template info */}
      <div className="text-center">
        <div className="text-white font-bold text-lg">{template.label_fr}</div>
        <div className="text-white/60 text-sm">{template.description_fr}</div>
      </div>
    </motion.div>
  );
};

export default RecognizingScreen;
