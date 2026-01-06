// ============================================================
// TEMPLATE CAPTURE OVERLAY
// Overlay temps réel pendant la capture avec instructions vocales
// ============================================================

import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, VolumeX, Check, Camera, Mic, Type, Image } from "lucide-react";
import { 
  AdvancedTemplate, 
  VoiceInstruction,
  formatDuration 
} from "./AdvancedTemplateData";
import templateEngine from "./TemplateEngine";

interface TemplateCaptureOverlayProps {
  template: AdvancedTemplate;
  isRecording: boolean;
  currentInputIndex: number;
  capturedInputs: number;
  onInstructionComplete?: (step: number) => void;
}

const TemplateCaptureOverlay: React.FC<TemplateCaptureOverlayProps> = ({
  template,
  isRecording,
  currentInputIndex,
  capturedInputs,
  onInstructionComplete
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [showInstruction, setShowInstruction] = useState(true);

  const instructions = template.voiceInstructions;
  const currentInstruction = instructions[currentStep];
  const totalSteps = instructions.length;

  // Auto-advance steps based on captured inputs
  useEffect(() => {
    if (capturedInputs > 0 && currentStep < totalSteps - 1) {
      // Check if we should advance to next step
      const prevInstruction = instructions[currentStep];
      if (prevInstruction?.action !== 'wait' && prevInstruction?.action !== 'confirm') {
        setCurrentStep(Math.min(capturedInputs, totalSteps - 1));
      }
    }
  }, [capturedInputs, currentStep, totalSteps, instructions]);

  // Speak instruction when step changes
  useEffect(() => {
    if (voiceEnabled && currentInstruction && !isRecording) {
      speakCurrentInstruction();
    }
    
    return () => {
      templateEngine.stopSpeaking();
    };
  }, [currentStep, voiceEnabled]);

  const speakCurrentInstruction = useCallback(async () => {
    if (!currentInstruction) return;
    
    setIsSpeaking(true);
    await templateEngine.speakInstruction(currentInstruction, 'fr');
    setIsSpeaking(false);
  }, [currentInstruction]);

  const getActionIcon = (action: VoiceInstruction['action']) => {
    switch (action) {
      case 'record_video':
        return <Camera className="h-6 w-6" />;
      case 'record_audio':
        return <Mic className="h-6 w-6" />;
      case 'take_photo':
        return <Image className="h-6 w-6" />;
      case 'add_text':
        return <Type className="h-6 w-6" />;
      case 'wait':
      case 'confirm':
        return <Check className="h-6 w-6" />;
      default:
        return <Camera className="h-6 w-6" />;
    }
  };

  const getActionLabel = (action: VoiceInstruction['action']) => {
    switch (action) {
      case 'record_video':
        return 'Filmer';
      case 'record_audio':
        return 'Enregistrer';
      case 'take_photo':
        return 'Photo';
      case 'add_text':
        return 'Texte';
      case 'wait':
        return 'Patientez...';
      case 'confirm':
        return 'Confirmer';
      default:
        return 'Action';
    }
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-30">
      {/* Template Header Badge */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-auto"
      >
        <div className={`flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r ${template.color} shadow-lg`}>
          <span className="text-xl">{template.emoji}</span>
          <span className="text-white font-semibold text-sm">{template.label_fr}</span>
        </div>
      </motion.div>

      {/* Voice Toggle Button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        onClick={() => {
          setVoiceEnabled(!voiceEnabled);
          if (!voiceEnabled) {
            speakCurrentInstruction();
          } else {
            templateEngine.stopSpeaking();
          }
        }}
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/50 backdrop-blur-xl flex items-center justify-center pointer-events-auto border border-white/20"
      >
        {voiceEnabled ? (
          <Volume2 className={`h-5 w-5 ${isSpeaking ? 'text-amber-400 animate-pulse' : 'text-white'}`} />
        ) : (
          <VolumeX className="h-5 w-5 text-white/50" />
        )}
      </motion.button>

      {/* Step Progress Dots */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 flex gap-2">
        {instructions.map((_, idx) => (
          <motion.div
            key={idx}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: idx * 0.1 }}
            className={`w-2 h-2 rounded-full transition-all ${
              idx < currentStep 
                ? 'bg-green-400' 
                : idx === currentStep 
                  ? 'bg-white w-6' 
                  : 'bg-white/30'
            }`}
          />
        ))}
      </div>

      {/* Current Instruction Card */}
      <AnimatePresence mode="wait">
        {showInstruction && currentInstruction && !isRecording && (
          <motion.div
            key={currentStep}
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            transition={{ type: "spring", damping: 25 }}
            className="absolute bottom-40 left-4 right-4 pointer-events-auto"
          >
            <div className="bg-black/70 backdrop-blur-xl rounded-3xl p-5 border border-white/10">
              {/* Step number and action */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full bg-gradient-to-r ${template.color} flex items-center justify-center text-white font-bold text-sm`}>
                    {currentStep + 1}
                  </div>
                  <span className="text-white/60 text-sm">Étape {currentStep + 1}/{totalSteps}</span>
                </div>
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10`}>
                  {getActionIcon(currentInstruction.action)}
                  <span className="text-white text-sm font-medium">{getActionLabel(currentInstruction.action)}</span>
                </div>
              </div>

              {/* Instruction text */}
              <p className="text-white text-lg font-medium mb-3">
                {currentInstruction.text_fr}
              </p>

              {/* Duration hint */}
              {currentInstruction.durationHint && (
                <div className="flex items-center gap-2 text-amber-400 text-sm">
                  <span>⏱️</span>
                  <span>Durée suggérée: {currentInstruction.durationHint}s</span>
                </div>
              )}

              {/* Replay voice button */}
              <button
                onClick={speakCurrentInstruction}
                disabled={isSpeaking}
                className="mt-3 flex items-center gap-2 text-white/60 hover:text-white text-sm transition-colors"
              >
                <Volume2 className={`h-4 w-4 ${isSpeaking ? 'animate-pulse text-amber-400' : ''}`} />
                <span>{isSpeaking ? 'Lecture en cours...' : 'Réécouter'}</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recording indicator - hide instruction card */}
      <AnimatePresence>
        {isRecording && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="absolute bottom-40 left-1/2 -translate-x-1/2"
          >
            <div className="flex items-center gap-3 px-6 py-3 rounded-full bg-red-500/80 backdrop-blur-xl">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 1 }}
                className="w-3 h-3 rounded-full bg-white"
              />
              <span className="text-white font-semibold">Enregistrement...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Features being applied indicators */}
      <div className="absolute bottom-28 left-4 flex flex-wrap gap-2 pointer-events-none">
        {template.features.beatSync && (
          <FeatureBadge emoji="🎵" label="Beat-Sync" />
        )}
        {template.features.smartCaptions && (
          <FeatureBadge emoji="💬" label="Sous-titres" />
        )}
        {template.features.audioEnhance && (
          <FeatureBadge emoji="🔊" label="Audio +" />
        )}
        {template.features.stabilization && (
          <FeatureBadge emoji="📹" label="Stable" />
        )}
        {template.features.styleTransfer && (
          <FeatureBadge emoji="🎨" label="Style" />
        )}
        {template.features.translation && (
          <FeatureBadge emoji="🌍" label="Traduction" />
        )}
      </div>

      {/* Supported durations */}
      <div className="absolute bottom-28 right-4 flex gap-1 pointer-events-none">
        {template.supportedDurations.slice(0, 3).map((dur) => (
          <span key={dur} className="text-[10px] text-white/40 bg-white/5 px-2 py-1 rounded">
            {formatDuration(dur)}
          </span>
        ))}
      </div>
    </div>
  );
};

// Feature badge component
const FeatureBadge: React.FC<{ emoji: string; label: string }> = ({ emoji, label }) => (
  <motion.div
    initial={{ scale: 0 }}
    animate={{ scale: 1 }}
    className="flex items-center gap-1 px-2 py-1 rounded-full bg-black/50 backdrop-blur-sm text-white/70 text-xs"
  >
    <span>{emoji}</span>
    <span>{label}</span>
  </motion.div>
);

export default TemplateCaptureOverlay;
