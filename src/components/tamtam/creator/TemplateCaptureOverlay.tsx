// ============================================================
// TEMPLATE CAPTURE OVERLAY (K-Engine)
// Overlay temps réel pendant la capture + bind slots au K-Engine
// ============================================================

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, VolumeX, Check, Camera, Mic, Type, Image } from "lucide-react";
import { AdvancedTemplate, VoiceInstruction, formatDuration } from "./AdvancedTemplateData";
import { kEngine, templateEngine, TemplateManifest, SlotDefinition, BoundAsset } from "./TemplateEngine";

// ------------------------------------------------------------
// Props
// ------------------------------------------------------------
interface TemplateCaptureOverlayProps {
  template: AdvancedTemplate;

  // capture runtime state (from parent FullscreenCreator)
  isRecording: boolean;

  /**
   * These legacy props can stay for compatibility, but K-Engine uses slots.
   * If you still pass them, we use them only to display progress when manifest is missing.
   */
  currentInputIndex: number;
  capturedInputs: number;

  /**
   * ✅ NEW (production): when parent captures a Blob, it passes it here.
   * The overlay will bind it to the next required slot automatically.
   * If you already know slotId in parent, pass it and we bind that slot.
   */
  latestCapturedMedia?: {
    blob: Blob;
    kind: "video" | "photo" | "audio";
    slotId?: string;
  } | null;

  onInstructionComplete?: (step: number) => void;

  /**
   * Optional: let parent know which slot is currently expected,
   * so capture UI can switch to video/photo/audio mode correctly.
   */
  onSlotHintChange?: (hint: { slotId: string; type: SlotDefinition["type"] } | null) => void;
}

// ------------------------------------------------------------
// Helpers: resolve manifest and slots
// ------------------------------------------------------------
function resolveManifest(template: AdvancedTemplate): TemplateManifest | null {
  const anyTpl: any = template as any;
  if (anyTpl.manifest && typeof anyTpl.manifest === "object") return anyTpl.manifest as TemplateManifest;
  if (anyTpl.kManifest && typeof anyTpl.kManifest === "object") return anyTpl.kManifest as TemplateManifest;
  if ((template as any).id === "none") return null;
  return null;
}

function mapSlotToInstruction(slot: SlotDefinition, idx: number, total: number): VoiceInstruction {
  // We generate a VoiceInstruction when your template doesn't have voiceInstructions.
  const action =
    slot.type === "video"
      ? "record_video"
      : slot.type === "photo"
      ? "take_photo"
      : slot.type === "audio"
      ? "record_audio"
      : "confirm";

  const base = slot.description || `Ajoute ton média pour ${slot.id}`;

  return {
    id: `slot_${slot.id}`,
    action,
    text_fr: `Étape ${idx + 1}/${total} — ${base}`,
    text_ba: undefined,
    durationHint: slot.constraints?.min_duration ? Math.round(slot.constraints.min_duration) : undefined,
  } as any;
}

// ------------------------------------------------------------
// Component
// ------------------------------------------------------------
const TemplateCaptureOverlay: React.FC<TemplateCaptureOverlayProps> = ({
  template,
  isRecording,
  currentInputIndex,
  capturedInputs,
  latestCapturedMedia,
  onInstructionComplete,
  onSlotHintChange,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [showInstruction, setShowInstruction] = useState(true);

  const manifest = useMemo(() => resolveManifest(template), [template]);

  // Slots (K-Engine truth)
  const slots: SlotDefinition[] = useMemo(() => {
    if (!manifest) return [];
    return Array.isArray((manifest as any).slots) ? ((manifest as any).slots as SlotDefinition[]) : [];
  }, [manifest]);

  // Prefer template.voiceInstructions if present; otherwise generate from slots
  const instructions: VoiceInstruction[] = useMemo(() => {
    const v = (template as any).voiceInstructions as VoiceInstruction[] | undefined;
    if (Array.isArray(v) && v.length > 0) return v;

    if (slots.length > 0) return slots.map((s, i) => mapSlotToInstruction(s, i, slots.length));
    return [];
  }, [template, slots]);

  const totalSteps = instructions.length;
  const currentInstruction = instructions[currentStep];

  // ------------------------------------------------------------
  // Determine "next required slot" from K-Engine state
  // ------------------------------------------------------------
  const getNextRequiredSlot = useCallback((): SlotDefinition | null => {
    if (!manifest || !slots.length) return null;

    const state = kEngine.getState();
    const bound = state?.userAssets || {};

    // slot is required if:
    // - required === true
    // - or min >= 1
    // - AND not yet bound
    const requiredSlots = slots.filter((s) => (s.required ?? true) && (s.min ?? 1) >= 1);
    for (const s of requiredSlots) {
      if (!bound[s.id]) return s;
    }
    // If all required are bound, return null (ready)
    return null;
  }, [manifest, slots]);

  // Notify parent about which slot we need now (so UI can switch mode video/photo/audio)
  useEffect(() => {
    const next = getNextRequiredSlot();
    onSlotHintChange?.(next ? { slotId: next.id, type: next.type } : null);
  }, [getNextRequiredSlot, onSlotHintChange, currentStep]);

  // ------------------------------------------------------------
  // Auto-advance steps based on K-Engine slot completion
  // ------------------------------------------------------------
  useEffect(() => {
    // If we have slots, step index follows "how many are already bound"
    if (slots.length > 0) {
      const state = kEngine.getState();
      const bound = state?.userAssets || {};
      const doneCount = slots.filter((s) => !!bound[s.id]).length;
      const nextStep = Math.min(doneCount, Math.max(0, totalSteps - 1));
      if (nextStep !== currentStep) setCurrentStep(nextStep);
      return;
    }

    // Fallback legacy behavior
    if (capturedInputs > 0 && currentStep < totalSteps - 1) {
      const prevInstruction = instructions[currentStep];
      if (prevInstruction?.action !== "wait" && prevInstruction?.action !== "confirm") {
        setCurrentStep(Math.min(capturedInputs, totalSteps - 1));
      }
    }
  }, [slots, totalSteps, currentStep, capturedInputs, instructions]);

  // ------------------------------------------------------------
  // TTS
  // ------------------------------------------------------------
  const speakCurrentInstruction = useCallback(async () => {
    if (!currentInstruction) return;
    if (!voiceEnabled) return;

    setIsSpeaking(true);
    // Use templateEngine TTS utility (keeps your existing TTS pipeline)
    await templateEngine.speakInstruction(currentInstruction, "fr");
    setIsSpeaking(false);
  }, [currentInstruction, voiceEnabled]);

  // Speak instruction when step changes (only if not recording)
  useEffect(() => {
    if (voiceEnabled && currentInstruction && !isRecording) {
      speakCurrentInstruction();
    }
    return () => {
      templateEngine.stopSpeaking();
    };
  }, [currentStep, voiceEnabled, currentInstruction, isRecording, speakCurrentInstruction]);

  // ------------------------------------------------------------
  // ✅ Bind captured media to K-Engine slots
  // ------------------------------------------------------------
  const bindToEngine = useCallback(
    async (media: NonNullable<TemplateCaptureOverlayProps["latestCapturedMedia"]>) => {
      if (!manifest) return;

      // Ensure template loaded in engine (idempotent)
      // If already loaded, this is cheap.
      kEngine.loadTemplate(manifest);

      // Resolve target slot
      let slotId = media.slotId;

      if (!slotId) {
        // If parent doesn't specify, bind to next required slot of matching type
        const next = getNextRequiredSlot();
        if (next && next.type === media.kind) {
          slotId = next.id;
        } else {
          // If next slot type doesn't match, try first unbound of matching kind
          const state = kEngine.getState();
          const bound = state?.userAssets || {};
          const candidate = slots.find((s) => s.type === media.kind && !bound[s.id]);
          if (candidate) slotId = candidate.id;
        }
      }

      if (!slotId) return;

      // ✅ Real K-Engine binding with BoundAsset
      const boundAsset: BoundAsset = {
        slotId: slotId,
        kind: "recording",
        blob: media.blob,
        mime: media.blob.type,
      };
      await kEngine.bindUserMedia(slotId, boundAsset);

      // Optional: if slot requires AI (segmentation), we can mark progress step complete
      onInstructionComplete?.(currentStep);
    },
    [manifest, getNextRequiredSlot, slots, currentStep, onInstructionComplete]
  );

  // When parent delivers a new captured media blob => bind it
  useEffect(() => {
    if (!latestCapturedMedia?.blob) return;
    bindToEngine(latestCapturedMedia);
  }, [latestCapturedMedia, bindToEngine]);

  // ------------------------------------------------------------
  // UI helpers
  // ------------------------------------------------------------
  const getActionIcon = (action: VoiceInstruction["action"]) => {
    switch (action) {
      case "record_video":
        return <Camera className="h-6 w-6" />;
      case "record_audio":
        return <Mic className="h-6 w-6" />;
      case "take_photo":
        return <Image className="h-6 w-6" />;
      case "add_text":
        return <Type className="h-6 w-6" />;
      case "wait":
      case "confirm":
        return <Check className="h-6 w-6" />;
      default:
        return <Camera className="h-6 w-6" />;
    }
  };

  const getActionLabel = (action: VoiceInstruction["action"]) => {
    switch (action) {
      case "record_video":
        return "Filmer";
      case "record_audio":
        return "Enregistrer";
      case "take_photo":
        return "Photo";
      case "add_text":
        return "Texte";
      case "wait":
        return "Patientez...";
      case "confirm":
        return "Confirmer";
      default:
        return "Action";
    }
  };

  // Progress dots: if we have slots, show slots count; else show instructions length
  const dotCount = slots.length > 0 ? slots.length : instructions.length;

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
          if (!voiceEnabled) speakCurrentInstruction();
          else templateEngine.stopSpeaking();
        }}
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/50 backdrop-blur-xl flex items-center justify-center pointer-events-auto border border-white/20"
      >
        {voiceEnabled ? (
          <Volume2 className={`h-5 w-5 ${isSpeaking ? "text-amber-400 animate-pulse" : "text-white"}`} />
        ) : (
          <VolumeX className="h-5 w-5 text-white/50" />
        )}
      </motion.button>

      {/* Step Progress Dots */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 flex gap-2">
        {Array.from({ length: dotCount }).map((_, idx) => (
          <motion.div
            key={idx}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: idx * 0.06 }}
            className={`w-2 h-2 rounded-full transition-all ${
              idx < currentStep ? "bg-green-400" : idx === currentStep ? "bg-white w-6" : "bg-white/30"
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
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-full bg-gradient-to-r ${template.color} flex items-center justify-center text-white font-bold text-sm`}
                  >
                    {currentStep + 1}
                  </div>
                  <span className="text-white/60 text-sm">
                    Étape {currentStep + 1}/{Math.max(1, totalSteps)}
                  </span>
                </div>
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10`}>
                  {getActionIcon(currentInstruction.action)}
                  <span className="text-white text-sm font-medium">{getActionLabel(currentInstruction.action)}</span>
                </div>
              </div>

              <p className="text-white text-lg font-medium mb-3">{currentInstruction.text_fr}</p>

              {currentInstruction.durationHint && (
                <div className="flex items-center gap-2 text-amber-400 text-sm">
                  <span>⏱️</span>
                  <span>Durée suggérée: {currentInstruction.durationHint}s</span>
                </div>
              )}

              <button
                onClick={speakCurrentInstruction}
                disabled={isSpeaking}
                className="mt-3 flex items-center gap-2 text-white/60 hover:text-white text-sm transition-colors"
              >
                <Volume2 className={`h-4 w-4 ${isSpeaking ? "animate-pulse text-amber-400" : ""}`} />
                <span>{isSpeaking ? "Lecture en cours..." : "Réécouter"}</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recording indicator */}
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

      {/* Features badges (legacy UI) */}
      <div className="absolute bottom-28 left-4 flex flex-wrap gap-2 pointer-events-none">
        {template.features.beatSync && <FeatureBadge emoji="🎵" label="Beat-Sync" />}
        {template.features.smartCaptions && <FeatureBadge emoji="💬" label="Sous-titres" />}
        {template.features.audioEnhance && <FeatureBadge emoji="🔊" label="Audio +" />}
        {template.features.stabilization && <FeatureBadge emoji="📹" label="Stable" />}
        {template.features.styleTransfer && <FeatureBadge emoji="🎨" label="Style" />}
        {template.features.translation && <FeatureBadge emoji="🌍" label="Traduction" />}
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
