import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mic, Volume2, VolumeX, Sparkles, Eye, Check } from "lucide-react";
import {
  ADVANCED_TEMPLATES,
  TEMPLATE_COLLECTIONS,
  getTemplatesByCollection,
  AdvancedTemplate,
  NEUTRAL_TEMPLATE,
} from "./AdvancedTemplateData";
import TemplatePreviewPlayer from "./TemplatePreviewPlayer";
import { useFrenchTTS } from "@/hooks/useFrenchTTS";
import { useBaribaTTS } from "@/hooks/useBaribaTTS";
import { useFrenchSTT } from "@/hooks/useFrenchSTT";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

// ✅ K-Engine runtime
import { kEngine, TemplateManifest } from "./TemplateEngine";

interface AdvancedTemplateDrawerProps {
  isOpen: boolean;
  onClose: () => void;

  /**
   * Keep compatibility: parent still receives AdvancedTemplate.
   * But now, we ALSO load K-Engine template here before closing.
   */
  onSelectTemplate: (template: AdvancedTemplate) => void;

  language?: "fr" | "ba";
}

/**
 * Adapter: AdvancedTemplate -> TemplateManifest
 * - If your template already has manifest (recommended), use it.
 * - Else build a minimal manifest so K-Engine can still run preview.
 */
function resolveManifest(template: AdvancedTemplate): TemplateManifest | null {
  const anyTpl: any = template as any;

  if (anyTpl.manifest && typeof anyTpl.manifest === "object") return anyTpl.manifest as TemplateManifest;
  if (anyTpl.kManifest && typeof anyTpl.kManifest === "object") return anyTpl.kManifest as TemplateManifest;

  // Neutral template means "no template"
  if ((template as any).id === "none") return null;

  // Minimal fallback (background + user + text) for safety
  return {
    id: anyTpl.id || `tpl_${Math.random().toString(16).slice(2, 10)}`,
    name: anyTpl.label_fr || "Template",
    description: anyTpl.description_fr || "",
    version: "1.0.0",
    duration: 8,
    ratio: "9:16",
    category: anyTpl.family || "transition",
    usage: 0,
    slots: [
      {
        id: "main_character",
        description: "Vidéo principale (personne)",
        type: "video",
        required: false,
        min: 1,
        max: 1,
        constraints: { min_duration: 3.0, detect_object: "person", orientation: "portrait" },
      },
    ],
    pipeline: [],
    timeline: [
      {
        layer_id: "bg",
        type: "video_layer",
        z_index: 0,
        start: 0,
        end: 8,
        asset: "",
        transform: { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 },
        effects: [],
        animation: { type: "fade", duration: 0.6, easing: "ease-out" },
      },
      {
        layer_id: "user",
        type: "user_media_layer",
        z_index: 1,
        start: 0,
        end: 8,
        slot_ref: "main_character",
        transform: { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 },
        effects: [],
        animation: { type: "zoom", duration: 0.8, easing: "ease-out" },
      },
      {
        layer_id: "title",
        type: "text_layer",
        z_index: 3,
        start: 0.2,
        end: 8,
        text: anyTpl.label_fr || "TamTam",
        transform: { x: 0.5, y: 0.84, scale: 1, rotation: 0, opacity: 1 },
        effects: [],
        animation: { type: "fade", duration: 0.6, easing: "ease-out" },
      },
    ],
    overrides: ["cover", "text", "music", "subtitles"],
    music: { enabled: false, beatSync: false, defaultTrack: "", bpm: 120 },
    export: { codec: "libx264", preset: "ultrafast", crf: 23, fps: 30 },
  };
}

const AdvancedTemplateDrawer: React.FC<AdvancedTemplateDrawerProps> = ({
  isOpen,
  onClose,
  onSelectTemplate,
  language = "fr",
}) => {
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [focusedTemplate, setFocusedTemplate] = useState<AdvancedTemplate | null>(null);

  const [previewTemplate, setPreviewTemplate] = useState<AdvancedTemplate | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [previewStoryboard, setPreviewStoryboard] = useState<any | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  const [aiSuggestions, setAiSuggestions] = useState<Array<{ id: string; emoji: string; reason_fr: string }>>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [voiceDescriptions, setVoiceDescriptions] = useState<Record<string, string>>({});

  const { speak: speakFr, stop: stopFr, isSpeaking: isSpeakingFr } = useFrenchTTS();
  const { speak: speakBa, stop: stopBa, isSpeaking: isSpeakingBa } = useBaribaTTS();

  const speak = language === "ba" ? speakBa : speakFr;
  const stopSpeaking = language === "ba" ? stopBa : stopFr;
  const isSpeaking = language === "ba" ? isSpeakingBa : isSpeakingFr;

  const { startListening, stopListening, isListening, transcript } = useFrenchSTT();

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSpokenTemplate = useRef<string | null>(null);

  // Haptic feedback
  const triggerHaptic = useCallback((pattern: number[]) => {
    if (navigator.vibrate) navigator.vibrate(pattern);
  }, []);

  // Sound feedback
  const playSound = useCallback((frequency: number, duration: number) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.value = frequency;
      oscillator.type = "sine";
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + duration / 1000);
    } catch (e) {
      console.log("[AdvancedTemplateDrawer] Audio not available");
    }
  }, []);

  // Speak template description on focus
  const speakTemplateDescription = useCallback(
    async (template: AdvancedTemplate) => {
      if (!audioEnabled || lastSpokenTemplate.current === template.id) return;

      lastSpokenTemplate.current = template.id;
      triggerHaptic([30]);
      playSound(600, 100);

      if (voiceDescriptions[template.id]) {
        speak(voiceDescriptions[template.id]);
        return;
      }

      const simpleDesc = `${(template as any).emoji} ${(template as any).label_fr}. ${(template as any).description_fr}`;
      speak(simpleDesc);

      try {
        const { data } = await supabase.functions.invoke("generate-template-assets", {
          body: {
            action: "generate_voice_description",
            templateId: (template as any).id,
            templateLabel: (template as any).label_fr,
            templateDescription: (template as any).description_fr,
            templateEmoji: (template as any).emoji,
            userContext: { language },
          },
        });

        if (data?.success && data.voiceDescription) {
          setVoiceDescriptions((prev) => ({ ...prev, [(template as any).id]: data.voiceDescription }));
        }
      } catch (e) {
        console.log("[AdvancedTemplateDrawer] Failed to fetch voice description");
      }
    },
    [audioEnabled, speak, triggerHaptic, playSound, voiceDescriptions, language]
  );

  // Handle template focus (long press to hear description)
  const handleTemplateFocus = useCallback(
    (template: AdvancedTemplate) => {
      setFocusedTemplate(template);
      if (audioEnabled) speakTemplateDescription(template);
    },
    [audioEnabled, speakTemplateDescription]
  );

  const handleLongPressStart = useCallback(
    (template: AdvancedTemplate) => {
      longPressTimer.current = setTimeout(() => {
        handleTemplateFocus(template);
      }, 500);
    },
    [handleTemplateFocus]
  );

  const handleLongPressEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  // ✅ NEW: load into K-Engine before selecting
  const loadIntoKEngine = useCallback((template: AdvancedTemplate) => {
    const manifest = resolveManifest(template);

    // Neutral template => clear engine
    if (!manifest) {
      kEngine.clearTemplate();
      return;
    }

    // REAL: K-Engine loads manifest (data-driven)
    kEngine.loadTemplate(manifest);
  }, []);

  // Handle template selection (production)
  const handleSelectTemplate = useCallback(
    (template: AdvancedTemplate) => {
      stopSpeaking();
      triggerHaptic([50, 50, 50]);
      playSound(800, 150);

      // ✅ Real integration point
      loadIntoKEngine(template);

      // Keep existing behavior
      onSelectTemplate(template);
      onClose();
    },
    [stopSpeaking, triggerHaptic, playSound, onSelectTemplate, onClose, loadIntoKEngine]
  );

  // Fetch AI suggestions
  const fetchAISuggestions = useCallback(
    async (userIntent?: string) => {
      setIsLoadingSuggestions(true);
      try {
        const { data } = await supabase.functions.invoke("generate-template-assets", {
          body: {
            action: "suggest_template",
            userContext: {
              hour: new Date().getHours(),
              dayOfWeek: new Date().getDay(),
              userIntent: userIntent || "",
              language,
            },
          },
        });

        if (data?.success && data.suggestions) setAiSuggestions(data.suggestions);
      } catch (e) {
        console.error("[AdvancedTemplateDrawer] Failed to fetch suggestions:", e);
      } finally {
        setIsLoadingSuggestions(false);
      }
    },
    [language]
  );

  useEffect(() => {
    if (transcript && !isListening) fetchAISuggestions(transcript);
  }, [transcript, isListening, fetchAISuggestions]);

  useEffect(() => {
    if (isOpen && aiSuggestions.length === 0) fetchAISuggestions();
  }, [isOpen, fetchAISuggestions, aiSuggestions.length]);

  useEffect(() => {
    if (isOpen && audioEnabled) {
      const welcome =
        language === "ba"
          ? "Choisis un template pour ta vidéo"
          : "Choisis un template pour ta vidéo. Appuie longuement pour écouter la description.";
      speak(welcome);
    }

    return () => {
      stopSpeaking();
      lastSpokenTemplate.current = null;
    };
  }, [isOpen, audioEnabled, language, speak, stopSpeaking]);

  const toggleVoiceMode = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
      triggerHaptic([100]);
      speak(language === "ba" ? "Sↄ n bɛ fɛ kɛ?" : "Dis-moi ce que tu veux créer");
    }
  }, [isListening, startListening, stopListening, triggerHaptic, speak, language]);

  const getDisplayedTemplates = (): AdvancedTemplate[] => {
    if (selectedCollection) return getTemplatesByCollection(selectedCollection);
    return [NEUTRAL_TEMPLATE, ...ADVANCED_TEMPLATES];
  };

  const findTemplateById = (id: string): AdvancedTemplate | undefined => {
    return ADVANCED_TEMPLATES.find((t) => t.id === id);
  };

  // ✅ NEW: pre-load into engine when opening preview modal (so TemplatePreviewPlayer renders instantly)
  const openPreview = useCallback(
    async (template: AdvancedTemplate) => {
      setPreviewTemplate(template);
      setFocusedTemplate(template);
      setIsLoadingPreview(true);
      setPreviewImageUrl(null);
      setPreviewStoryboard(null);

      // Load template into K-Engine early (preview warm-up)
      loadIntoKEngine(template);

      if (audioEnabled) speakTemplateDescription(template);

      try {
        const [imgRes, storyRes] = await Promise.all([
          supabase.functions
            .invoke("generate-template-assets", {
              body: {
                action: "generate_preview_image",
                templateId: (template as any).id,
                templateLabel: (template as any).label_fr,
                templateDescription: (template as any).description_fr,
                templateEmoji: (template as any).emoji,
                templateColor: (template as any).color,
              },
            })
            .catch(() => ({ data: null } as any)),
          supabase.functions
            .invoke("generate-template-assets", {
              body: {
                action: "generate_sample_storyboard",
                templateId: (template as any).id,
                templateLabel: (template as any).label_fr,
                templateDescription: (template as any).description_fr,
                templateEmoji: (template as any).emoji,
                userContext: { language },
              },
            })
            .catch(() => ({ data: null } as any)),
        ]);

        const imageUrl = imgRes?.data?.previewImageUrl as string | undefined;
        if (imageUrl) setPreviewImageUrl(imageUrl);

        const storyboard = storyRes?.data;
        if (storyboard?.scenes?.length) setPreviewStoryboard(storyboard);
      } finally {
        setIsLoadingPreview(false);
      }
    },
    [audioEnabled, speakTemplateDescription, language, loadIntoKEngine]
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md"
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="absolute inset-0 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-3 sm:px-4 py-3 border-b border-white/10 safe-area-inset-top">
              <div className="flex items-center gap-2">
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="text-xl sm:text-2xl"
                >
                  ✨
                </motion.div>
                <h2 className="text-base sm:text-lg font-bold text-white">Templates IA</h2>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setAudioEnabled(!audioEnabled);
                    if (!audioEnabled) speak("Audio activé");
                    else stopSpeaking();
                  }}
                  className={cn(
                    "w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center rounded-full transition-all",
                    audioEnabled ? "bg-green-500/30 text-green-400" : "bg-white/10 text-white/50"
                  )}
                >
                  {audioEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
                </button>

                <button
                  onClick={onClose}
                  className="w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center rounded-full bg-white/10 text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Voice Search */}
            <div className="px-3 sm:px-4 py-3">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={toggleVoiceMode}
                className={cn(
                  "w-full flex items-center justify-center gap-2 sm:gap-3 py-4 sm:py-5 rounded-xl sm:rounded-2xl transition-all",
                  isListening
                    ? "bg-gradient-to-r from-red-500 to-orange-500 animate-pulse"
                    : "bg-gradient-to-r from-amber-500 to-orange-500"
                )}
              >
                <motion.div animate={isListening ? { scale: [1, 1.2, 1] } : {}} transition={{ duration: 0.5, repeat: Infinity }}>
                  <Mic className="h-7 w-7 sm:h-8 sm:w-8 text-white" />
                </motion.div>
                <span className="text-white text-sm sm:text-base font-bold">
                  {isListening ? "J'écoute..." : "🎤 Dis-moi ce que tu veux créer"}
                </span>
              </motion.button>

              {transcript && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-2 p-2.5 rounded-lg bg-white/10 text-white/80 text-center text-sm"
                >
                  "{transcript}"
                </motion.div>
              )}
            </div>

            {/* AI Suggestions */}
            {aiSuggestions.length > 0 && (
              <div className="px-3 sm:px-4 mb-3">
                <h3 className="text-white/60 text-xs sm:text-sm mb-2 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  Suggestions IA pour toi
                </h3>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-3 px-3 sm:-mx-4 sm:px-4">
                  {aiSuggestions.map((suggestion) => {
                    const tpl = findTemplateById(suggestion.id);
                    if (!tpl) return null;

                    return (
                      <motion.button
                        key={suggestion.id}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => openPreview(tpl)}
                        onTouchStart={() => handleLongPressStart(tpl)}
                        onTouchEnd={handleLongPressEnd}
                        onMouseDown={() => handleLongPressStart(tpl)}
                        onMouseUp={handleLongPressEnd}
                        onMouseLeave={handleLongPressEnd}
                        className={cn(
                          "flex-shrink-0 flex flex-col items-start p-3 rounded-xl min-w-[130px] sm:min-w-[150px] transition-all",
                          `bg-gradient-to-br ${tpl.color}`,
                          focusedTemplate?.id === tpl.id && "ring-2 ring-white"
                        )}
                      >
                        <span className="text-3xl sm:text-4xl mb-1.5">{tpl.emoji}</span>
                        <span className="text-white font-bold text-xs sm:text-sm text-left leading-tight">{tpl.label_fr}</span>
                        <span className="text-white/70 text-[10px] sm:text-xs mt-0.5 text-left line-clamp-2 leading-tight">
                          {suggestion.reason_fr}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Collection Tabs */}
            <div className="flex gap-2 px-3 sm:px-4 pb-2 overflow-x-auto scrollbar-hide -mx-3 sm:-mx-0">
              <button
                onClick={() => setSelectedCollection(null)}
                className={cn(
                  "flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-bold whitespace-nowrap transition-all",
                  !selectedCollection ? "bg-white text-black" : "bg-white/10 text-white/70"
                )}
              >
                <span className="text-lg sm:text-xl">📋</span>
                <span>Tous</span>
              </button>

              {TEMPLATE_COLLECTIONS.map((collection) => (
                <button
                  key={collection.id}
                  onClick={() => {
                    setSelectedCollection(collection.id);
                    if (audioEnabled) speak(`${collection.emoji} ${collection.name_fr}`);
                    triggerHaptic([30]);
                  }}
                  className={cn(
                    "flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-bold whitespace-nowrap transition-all",
                    selectedCollection === collection.id ? `bg-gradient-to-r ${collection.color} text-white` : "bg-white/10 text-white/70"
                  )}
                >
                  <span className="text-lg sm:text-xl">{collection.emoji}</span>
                  <span className="hidden sm:inline">{collection.name_fr}</span>
                </button>
              ))}
            </div>

            {/* Templates Grid */}
            <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-3">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3">
                {getDisplayedTemplates().map((tpl) => (
                  <XXLTemplateCard
                    key={tpl.id}
                    template={tpl}
                    isFocused={focusedTemplate?.id === tpl.id}
                    isSpeaking={isSpeaking && lastSpokenTemplate.current === tpl.id}
                    isNeutral={tpl.id === "none"}
                    onQuickSelect={() => handleSelectTemplate(tpl)}
                    onOpenPreview={() => openPreview(tpl)}
                    onLongPressStart={() => handleLongPressStart(tpl)}
                    onLongPressEnd={handleLongPressEnd}
                    audioEnabled={audioEnabled}
                  />
                ))}
              </div>
            </div>

            <div className="h-6 sm:h-8 bg-gradient-to-t from-black to-transparent safe-area-inset-bottom" />

            {/* Preview Modal */}
            <AnimatePresence>
              {previewTemplate && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-[70] bg-black/90 backdrop-blur-md"
                  onClick={() => setPreviewTemplate(null)}
                >
                  <motion.div
                    initial={{ y: 30, scale: 0.98, opacity: 0 }}
                    animate={{ y: 0, scale: 1, opacity: 1 }}
                    exit={{ y: 30, scale: 0.98, opacity: 0 }}
                    transition={{ type: "spring", damping: 25, stiffness: 260 }}
                    className="absolute inset-x-2 sm:inset-x-4 top-12 sm:top-14 bottom-6 sm:bottom-8 rounded-2xl sm:rounded-3xl overflow-hidden bg-black/60 border border-white/10"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="relative h-32 sm:h-40 overflow-hidden">
                      {previewImageUrl ? (
                        <img
                          src={previewImageUrl}
                          alt={`Aperçu visuel du template ${(previewTemplate as any).label_fr}`}
                          className="absolute inset-0 w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className={cn("absolute inset-0 bg-gradient-to-br", (previewTemplate as any).color)} />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                      {isLoadingPreview && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 border-3 sm:border-4 border-white/40 border-t-white rounded-full animate-spin" />
                        </div>
                      )}

                      <button
                        onClick={() => setPreviewTemplate(null)}
                        className="absolute top-2 right-2 sm:top-3 sm:right-3 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center"
                        aria-label="Fermer la prévisualisation"
                      >
                        <X className="h-5 w-5 text-white" />
                      </button>
                    </div>

                    <div className="p-3 sm:p-4 overflow-y-auto h-[calc(100%-8rem)] sm:h-[calc(100%-10rem)]">
                      <TemplatePreviewPlayer
                        template={previewTemplate}
                        isActive={true}
                        onSelect={() => handleSelectTemplate(previewTemplate)}
                        language={language}
                        autoPlay
                      />

                      {previewStoryboard?.scenes?.length > 0 && (
                        <div className="mt-3 sm:mt-4 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-3 sm:p-4">
                          <div className="flex items-center justify-between mb-2 sm:mb-3">
                            <div className="text-white/70 text-xs sm:text-sm font-medium">📖 Guide (audio)</div>
                            <button
                              onClick={() => {
                                const first = previewStoryboard.scenes?.[0];
                                const text =
                                  language === "ba"
                                    ? first?.instruction_vocale_ba || first?.instruction_vocale_fr
                                    : first?.instruction_vocale_fr;
                                if (text) speak(text);
                              }}
                              className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-white text-black text-xs sm:text-sm font-semibold"
                            >
                              🔊 Écouter
                            </button>
                          </div>

                          <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1 scrollbar-hide">
                            {previewStoryboard.scenes.map((s: any, idx: number) => (
                              <div
                                key={idx}
                                className="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-black/30 border border-white/10 flex items-center justify-center"
                                title={s?.visual_hint}
                              >
                                <span className="text-lg sm:text-xl">{s?.emoji || "🎬"}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ============================================================
// XXL Template Card Component (unchanged UI)
// ============================================================

interface XXLTemplateCardProps {
  template: AdvancedTemplate;
  isFocused: boolean;
  isSpeaking: boolean;
  isNeutral?: boolean;
  audioEnabled: boolean;
  onQuickSelect: () => void;
  onOpenPreview: () => void;
  onLongPressStart: () => void;
  onLongPressEnd: () => void;
}

const XXLTemplateCard: React.FC<XXLTemplateCardProps> = ({
  template,
  isFocused,
  isSpeaking,
  isNeutral,
  audioEnabled,
  onQuickSelect,
  onOpenPreview,
  onLongPressStart,
  onLongPressEnd,
}) => {
  const getFeatureIcons = () => {
    const features = [];
    if ((template as any).features?.beatSync) features.push("🎵");
    if ((template as any).features?.smartCaptions) features.push("💬");
    if ((template as any).features?.translation) features.push("🌍");
    if ((template as any).features?.audioEnhance) features.push("🔊");
    if ((template as any).features?.stabilization) features.push("📹");
    return features.slice(0, 3);
  };

  if (isNeutral) {
    return (
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={onQuickSelect}
        className="relative overflow-hidden rounded-2xl sm:rounded-3xl p-3 sm:p-4 text-left transition-all min-h-[140px] sm:min-h-[160px] border-2 border-dashed border-white/30 bg-gradient-to-br from-gray-700/50 to-gray-900/50"
      >
        <div className="relative z-10 flex flex-col h-full items-center justify-center">
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-4xl sm:text-5xl mb-2 opacity-60"
          >
            {(template as any).emoji}
          </motion.div>
          <h3 className="font-bold text-white text-sm sm:text-base text-center mb-0.5">
            {(template as any).label_fr}
          </h3>
          <p className="text-white/50 text-[10px] sm:text-xs text-center line-clamp-2">
            {(template as any).description_fr}
          </p>
          <div className="mt-2 sm:mt-3 px-3 py-1.5 rounded-full bg-white/10 flex items-center gap-1.5">
            <Check className="h-3 w-3 text-white/70" />
            <span className="text-white/70 text-[10px] sm:text-xs">Sélectionner</span>
          </div>
        </div>
      </motion.button>
    );
  }

  return (
    <motion.div
      whileTap={{ scale: 0.97 }}
      onTouchStart={onLongPressStart}
      onTouchEnd={onLongPressEnd}
      onMouseDown={onLongPressStart}
      onMouseUp={onLongPressEnd}
      onMouseLeave={onLongPressEnd}
      className={cn(
        "relative overflow-hidden rounded-2xl sm:rounded-3xl p-3 sm:p-4 text-left transition-all min-h-[155px] sm:min-h-[175px]",
        isFocused && "ring-2 sm:ring-3 ring-white shadow-xl",
        isSpeaking && "ring-2 sm:ring-3 ring-green-400"
      )}
    >
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-90", (template as any).color)} />

      <motion.div
        className="absolute inset-0 bg-white/10"
        animate={{
          opacity:
            (template as any).previewAnimation === "pulse"
              ? [0.1, 0.3, 0.1]
              : (template as any).previewAnimation === "glow"
              ? [0.05, 0.2, 0.05]
              : 0.05,
        }}
        transition={{ duration: 2, repeat: Infinity }}
      />

      <div className="relative z-10 flex flex-col h-full">
        <div className="flex items-start justify-between mb-1.5">
          <motion.div
            animate={isFocused ? { scale: [1, 1.1, 1] } : {}}
            transition={{ duration: 0.5 }}
            className="text-3xl sm:text-4xl"
          >
            {(template as any).emoji}
          </motion.div>

          {audioEnabled && (
            <div className="flex items-center gap-1">
              {isSpeaking ? (
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                  className="bg-green-500/30 rounded-full p-1"
                >
                  <Volume2 className="h-3.5 w-3.5 text-white" />
                </motion.div>
              ) : (
                <Volume2 className="h-3 w-3 text-white/30" />
              )}
            </div>
          )}
        </div>

        <h3 className="font-bold text-white text-xs sm:text-sm leading-tight mb-0.5">{(template as any).label_fr}</h3>

        <p className="text-white/70 text-[10px] sm:text-xs line-clamp-2 mb-2 flex-grow leading-snug">
          {(template as any).description_fr}
        </p>

        <div className="flex items-center gap-1 mb-2">
          {getFeatureIcons().map((icon, i) => (
            <span key={i} className="text-xs sm:text-sm bg-black/20 rounded-full px-1.5 py-0.5">
              {icon}
            </span>
          ))}
        </div>

        <div className="flex gap-1.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenPreview();
            }}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-white/10 backdrop-blur-sm active:bg-white/20 transition-all"
          >
            <Eye className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-white/80" />
            <span className="text-white/80 text-[10px] sm:text-xs font-medium">Aperçu</span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onQuickSelect();
            }}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-white/90 active:bg-white transition-all"
          >
            <Check className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-black" />
            <span className="text-black text-[10px] sm:text-xs font-bold">Utiliser</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default AdvancedTemplateDrawer;
