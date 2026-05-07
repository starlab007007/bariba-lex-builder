import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mic, Volume2, VolumeX, Sparkles, Eye, Check, Clock, Camera, Play, Pause, Loader2 } from "lucide-react";
import {
  ADVANCED_TEMPLATES,
  TEMPLATE_COLLECTIONS,
  getTemplatesByCollection,
  AdvancedTemplate,
  NEUTRAL_TEMPLATE,
  KuaishouTemplateManifest,
} from "./AdvancedTemplateData";
import TemplatePreviewPlayer from "./TemplatePreviewPlayer";
import VideoTemplatePreview from "./VideoTemplatePreview";
import { useFrenchTTS } from "@/hooks/useFrenchTTS";
import { useBaribaTTS } from "@/hooks/useBaribaTTS";
import { useFrenchSTT } from "@/hooks/useFrenchSTT";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";

// ✅ K-Engine runtime
import { kEngine, TemplateManifest, SlotDefinition } from "./TemplateEngine";

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
 * ✅ KUAISHOU-STYLE: Convert KuaishouTemplateManifest → TemplateManifest
 * This bridges the rich KSE data to the K-Engine runtime format.
 */
function convertKSEToManifest(kse: KuaishouTemplateManifest): TemplateManifest {
  return {
    id: kse.id,
    name: kse.title_fr,
    description: kse.title_ba || kse.title_fr,
    version: kse.version,
    duration: kse.durationSec,
    ratio: kse.ratio,
    category: kse.family || 'default',
    usage: 0,
    slots: kse.slots.map(s => ({
      id: s.id,
      description: s.id.replace(/_/g, ' '),
      type: s.type[0] as 'video' | 'photo' | 'audio',
      required: s.required,
      min: s.min,
      max: s.max,
      constraints: {
        min_duration: s.minDurationSec,
      }
    })),
    pipeline: kse.pipeline.map(p => ({
      op: p.op as any,
      target: undefined,
      quality: 'medium' as const,
      output: p.output || p.op,
      params: p.params
    })),
    timeline: kse.timeline.map((layer, i) => ({
      layer_id: layer.layer,
      type: layer.fromSlot ? 'user_media_layer' as const : 'video_layer' as const,
      z_index: i,
      start: layer.t[0],
      end: layer.t[1],
      asset: layer.asset,
      slot_ref: layer.fromSlot,
      transform: { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 },
      effects: [],
      animation: null
    })),
    overrides: kse.overrides,
    music: { enabled: true, beatSync: kse.pipeline.some(p => p.op === 'beat_detect') }
  };
}

/**
 * ✅ KUAISHOU-STYLE: Resolve manifest with priority for real KSE engine variants
 * Priority order:
 * 1. KSE engine variants (Kuaishou manifests) - BEST
 * 2. Existing manifest property
 * 3. Fallback minimal manifest
 */
function resolveManifest(template: AdvancedTemplate): TemplateManifest | null {
  const anyTpl: any = template as any;

  // Neutral template means "no template"
  if ((template as any).id === "none") return null;

  // ✅ PRIORITY 1: Use real Kuaishou manifest from engine.variants
  const engine = template.engine;
  if (engine?.kind === 'KSE' && engine.variants) {
    const defaultDuration = engine.defaultDuration;
    const kseManifest = engine.variants[defaultDuration];
    if (kseManifest) {
      return convertKSEToManifest(kseManifest);
    }
  }

  // PRIORITY 2: Existing manifest property
  if (anyTpl.manifest && typeof anyTpl.manifest === "object") return anyTpl.manifest as TemplateManifest;
  if (anyTpl.kManifest && typeof anyTpl.kManifest === "object") return anyTpl.kManifest as TemplateManifest;

  // PRIORITY 3: Minimal fallback (background + user + text)
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

  // ✅ Load AI-generated template data from database
  const { data: aiTemplates = [] } = useQuery({
    queryKey: ['ai-templates-drawer'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_generated_templates')
        .select('*')
        .eq('is_active', true)
        .order('usage_count', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: isOpen,
  });

  // ✅ FIX: Map AI template data by BOTH template_key AND id for compatibility
  const aiTemplateMap = useMemo(() => {
    const map: Record<string, any> = {};
    aiTemplates.forEach((t: any) => {
      // Map by template_key (used in DB)
      map[t.template_key] = t;
      // Also map by id if different (for local template matching)
      if (t.id && t.id !== t.template_key) {
        map[t.id] = t;
      }
    });
    return map;
  }, [aiTemplates]);

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

  // ✅ BLOCK C: Pre-load into engine when opening preview modal
  // Use existing AI assets from database FIRST, only generate if missing
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

      // ✅ Check if we have existing AI assets in database first
      const aiData = aiTemplateMap[(template as any).id];
      if (aiData) {
        // Use existing assets if available
        if (aiData.ai_preview_image_url) {
          setPreviewImageUrl(aiData.ai_preview_image_url);
        } else if (aiData.ai_preview_image_base64) {
          setPreviewImageUrl(`data:image/png;base64,${aiData.ai_preview_image_base64}`);
        }
        
        if (aiData.storyboard_frames && Array.isArray(aiData.storyboard_frames)) {
          setPreviewStoryboard({ scenes: aiData.storyboard_frames });
        } else if (aiData.ai_storyboard) {
          setPreviewStoryboard(aiData.ai_storyboard);
        }
        
        // If we have assets, no need to generate
        if (aiData.visual_generation_status === 'completed' || aiData.ai_preview_image_url || aiData.storyboard_frames) {
          setIsLoadingPreview(false);
          return;
        }
      }

      // Generate assets only if missing from database
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
    [audioEnabled, speakTemplateDescription, language, loadIntoKEngine, aiTemplateMap]
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
                {getDisplayedTemplates().map((tpl) => {
                  const aiData = aiTemplateMap[tpl.id];
                  return (
                    <XXLTemplateCard
                      key={tpl.id}
                      template={tpl}
                      aiData={aiData}
                      isFocused={focusedTemplate?.id === tpl.id}
                      isSpeaking={isSpeaking && lastSpokenTemplate.current === tpl.id}
                      isNeutral={tpl.id === "none"}
                      onQuickSelect={() => handleSelectTemplate(tpl)}
                      onOpenPreview={() => openPreview(tpl)}
                      onLongPressStart={() => handleLongPressStart(tpl)}
                      onLongPressEnd={handleLongPressEnd}
                      audioEnabled={audioEnabled}
                    />
                  );
                })}
              </div>
            </div>

            <div className="h-6 sm:h-8 bg-gradient-to-t from-black to-transparent safe-area-inset-bottom" />

            {/* Preview Modal - Simplified with Video Playback */}
            <AnimatePresence>
              {previewTemplate && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-[70] bg-black/95"
                  onClick={() => setPreviewTemplate(null)}
                >
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 20, opacity: 0 }}
                    transition={{ type: "spring", damping: 30, stiffness: 300 }}
                    className="absolute inset-x-3 sm:inset-x-6 top-8 sm:top-12 bottom-4 sm:bottom-8 flex flex-col"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Close button */}
                    <button
                      onClick={() => setPreviewTemplate(null)}
                      className="absolute top-0 right-0 z-30 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/70 backdrop-blur-md flex items-center justify-center"
                      aria-label="Fermer"
                    >
                      <X className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                    </button>

                    {/* Video Preview Area - Full screen 9:16 */}
                    <div className="flex-1 flex items-center justify-center overflow-hidden rounded-2xl sm:rounded-3xl bg-black">
                      <div className="relative w-full max-w-[280px] sm:max-w-[320px] aspect-[9/16] rounded-xl sm:rounded-2xl overflow-hidden">
                        {/* Gradient background */}
                        <div className={cn("absolute inset-0 bg-gradient-to-br", (previewTemplate as any).color)} />
                        
                        {/* Video Template Preview - Auto load on modal open */}
                        <VideoTemplatePreview
                          template={previewTemplate}
                          aiData={aiTemplateMap[previewTemplate.id]}
                          isVisible={true}
                          loop={true}
                          autoLoad={true}
                          className="absolute inset-0"
                          onVideoReady={() => console.log('[Preview] Video ready')}
                          generationStatus={aiTemplateMap[previewTemplate.id]?.visual_generation_status || null}
                        />

                        {/* Fallback static preview image */}
                        {!aiTemplateMap[previewTemplate.id] && previewImageUrl && (
                          <img
                            src={previewImageUrl}
                            alt={`${(previewTemplate as any).label_fr}`}
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                        )}

                        {/* Duration overlay */}
                        <div className="absolute top-3 left-3 z-10">
                          <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1.5">
                            <Play className="h-3 w-3 text-white" />
                            <span className="text-white text-xs font-bold">
                              {(previewTemplate as any).supportedDurations?.[0] || '15s'}
                            </span>
                          </div>
                        </div>

                        {/* Emoji badge */}
                        <div className="absolute top-3 right-3 z-10">
                          <span className="text-3xl sm:text-4xl drop-shadow-lg">
                            {(previewTemplate as any).emoji}
                          </span>
                        </div>

                        {/* Loading overlay */}
                        {isLoadingPreview && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom info + actions - Simplified */}
                    <div className="mt-4 sm:mt-6 space-y-3">
                      {/* Title */}
                      <div className="text-center">
                        <h2 className="text-white text-xl sm:text-2xl font-bold">
                          {(previewTemplate as any).label_fr}
                        </h2>
                        <p className="text-white/60 text-sm mt-1">
                          {(previewTemplate as any).description_fr}
                        </p>
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-3 px-4">
                        <button
                          onClick={() => {
                            // Speak description
                            const text = language === "ba"
                              ? (previewTemplate as any).label_ba || (previewTemplate as any).label_fr
                              : (previewTemplate as any).label_fr;
                            speak(text);
                          }}
                          className="flex-1 flex items-center justify-center gap-2 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl bg-white/10 backdrop-blur-sm active:bg-white/20 transition-all"
                        >
                          <Volume2 className="h-5 w-5 text-white" />
                          <span className="text-white text-sm font-medium">Écouter</span>
                        </button>
                        <button
                          onClick={() => handleSelectTemplate(previewTemplate)}
                          className="flex-[2] flex items-center justify-center gap-2 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl bg-white active:bg-white/90 transition-all"
                        >
                          <Check className="h-5 w-5 text-black" />
                          <span className="text-black text-sm font-bold">Utiliser</span>
                        </button>
                      </div>
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
// XXL Template Card Component - Enhanced with Kuaishou-style hints
// ============================================================

interface XXLTemplateCardProps {
  template: AdvancedTemplate;
  aiData?: any; // AI-generated data from database
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
  aiData,
  isFocused,
  isSpeaking,
  isNeutral,
  audioEnabled,
  onQuickSelect,
  onOpenPreview,
  onLongPressStart,
  onLongPressEnd,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // ✅ Get Kuaishou-style card hints from KSE engine
  const kseManifest = template.engine?.variants?.[template.engine?.defaultDuration || '15s'];
  const cardHint = kseManifest?.cardHint;

  // ✅ Extract animation frames from AI data - check multiple sources
  const animationFrames: string[] = useMemo(() => {
    if (!aiData) return [];
    // Try multiple sources for frames
    const frames = 
      (aiData.storyboard_frames as { frames?: string[] })?.frames || 
      aiData.ai_storyboard?.animation_frames || 
      aiData.ai_storyboard?.frames ||
      [];
    // Filter out any invalid URLs
    return frames.filter((f: string) => f && typeof f === 'string' && f.startsWith('http'));
  }, [aiData]);

  const hasAnimationFrames = animationFrames.length >= 2;
  
  // ✅ FIX: Use visual_generation_status instead of generation_status
  const isAICompleted = aiData?.visual_generation_status === 'completed';
  const isAIGenerating = aiData?.visual_generation_status === 'generating';
  
  const previewImageUrl = aiData?.ai_preview_image_url || aiData?.preview_image_url;
  const hasPreviewImage = !!previewImageUrl && !imageError;

  // ✅ Get template duration for video playback
  const templateDurationMs = useMemo(() => {
    // From storyboard_frames data
    const sfData = aiData?.storyboard_frames as { durationMs?: number } | null;
    if (sfData?.durationMs) return sfData.durationMs;
    
    // From KSE manifest
    const kse = template.engine?.variants?.[template.engine?.defaultDuration || '15s'];
    if (kse?.durationSec) return kse.durationSec * 1000;
    
    return 10000; // 10 seconds default
  }, [aiData, template]);

  // ✅ Video ready state
  const [isVideoReady, setIsVideoReady] = useState(false);

  // ✅ IntersectionObserver for auto-play when visible
  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.3 }
    );

    observer.observe(card);
    return () => observer.disconnect();
  }, []);

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

  // ✅ KUAISHOU: Check if template is featured/popular
  const isFeatured = aiData?.is_featured || aiData?.usage_count > 100;
  const isPending = aiData?.visual_generation_status === 'pending' || !aiData?.visual_generation_status;

  return (
    <motion.div
      ref={cardRef}
      whileTap={{ scale: 0.96 }}
      whileHover={{ scale: 1.03, y: -4 }}
      onTouchStart={onLongPressStart}
      onTouchEnd={onLongPressEnd}
      onMouseDown={onLongPressStart}
      onMouseUp={onLongPressEnd}
      onMouseLeave={() => {
        onLongPressEnd();
        setIsHovered(false);
      }}
      onMouseEnter={() => setIsHovered(true)}
      className={cn(
        "relative overflow-hidden rounded-2xl sm:rounded-3xl text-left transition-all min-h-[165px] sm:min-h-[185px]",
        "shadow-lg hover:shadow-2xl",
        isFocused && "ring-2 sm:ring-3 ring-white shadow-xl",
        isSpeaking && "ring-2 sm:ring-3 ring-green-400",
        isFeatured && "ring-1 ring-amber-400/50"
      )}
      style={{
        boxShadow: isHovered ? '0 20px 40px -12px rgba(0,0,0,0.5)' : undefined
      }}
    >
      {/* ✅ KUAISHOU: Animated gradient border for featured templates */}
      {isFeatured && (
        <motion.div
          className="absolute -inset-[1px] rounded-2xl sm:rounded-3xl z-0"
          style={{
            background: 'linear-gradient(135deg, #FFD700, #FF6B00, #FF1493, #FFD700)',
            backgroundSize: '300% 300%',
          }}
          animate={{
            backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "linear"
          }}
        />
      )}

      {/* Background container */}
      <div className="absolute inset-[1px] rounded-2xl sm:rounded-3xl overflow-hidden bg-black">
        {/* Background: Gradient fallback */}
        <div className={cn("absolute inset-0 bg-gradient-to-br", (template as any).color)} />

        {/* ✅ VIDEO TEMPLATE PREVIEW - Real WebM video from AI frames */}
        {hasAnimationFrames && !isNeutral && (
          <VideoTemplatePreview
            template={template}
            aiData={aiData}
            isVisible={isVisible || isHovered}
            loop={true}
            autoLoad={false}
            className="absolute inset-0"
            onVideoReady={() => setIsVideoReady(true)}
            generationStatus={aiData?.visual_generation_status || null}
          />
        )}
        
        {/* ✅ FALLBACK PREVIEW when no animation frames - pass status */}
        {!hasAnimationFrames && !isNeutral && (
          <VideoTemplatePreview
            template={template}
            aiData={aiData}
            isVisible={false}
            loop={false}
            autoLoad={false}
            className="absolute inset-0"
            generationStatus={aiData?.visual_generation_status || null}
          />
        )}

        {/* ✅ KUAISHOU: Dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
        
        {/* ✅ KUAISHOU: Hover glow effect */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          animate={{
            opacity: isHovered ? 0.15 : 0,
          }}
          style={{
            background: 'radial-gradient(circle at center, white 0%, transparent 70%)',
          }}
        />
      </div>

      {/* ✅ KUAISHOU: Duration badge - Always visible top left */}
      <div className="absolute top-2.5 left-2.5 z-20">
        <motion.div
          className={cn(
            "flex items-center gap-1 rounded-full px-2 py-1 backdrop-blur-md border",
            hasAnimationFrames && (isVisible || isHovered) 
              ? "bg-green-500/90 border-green-400/50" 
              : "bg-black/60 border-white/10"
          )}
          animate={hasAnimationFrames && (isVisible || isHovered) ? { 
            boxShadow: ['0 0 0 0 rgba(34, 197, 94, 0.4)', '0 0 0 6px rgba(34, 197, 94, 0)', '0 0 0 0 rgba(34, 197, 94, 0.4)']
          } : {}}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {hasAnimationFrames && (isVisible || isHovered) ? (
            <Play className="h-2.5 w-2.5 text-white" />
          ) : (
            <Clock className="h-2.5 w-2.5 text-white/80" />
          )}
          <span className="text-white text-[9px] font-bold">
            {(template as any).supportedDurations?.[0] || '15s'}
          </span>
        </motion.div>
      </div>

      {/* ✅ KUAISHOU: Status badges top right */}
      <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1">
        {/* Featured badge */}
        {isFeatured && (
          <motion.div
            className="flex items-center gap-0.5 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full px-1.5 py-0.5"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <span className="text-[8px]">🔥</span>
            <span className="text-white text-[8px] font-bold">HOT</span>
          </motion.div>
        )}
        
        {/* AI Completed badge */}
        {isAICompleted && !isPending && (
          <div className="flex items-center gap-0.5 bg-purple-500/90 backdrop-blur-sm rounded-full px-1.5 py-0.5">
            <Sparkles className="h-2 w-2 text-white" />
            <span className="text-white text-[8px] font-medium">IA</span>
          </div>
        )}
        
        {/* Generating badge */}
        {isAIGenerating && (
          <motion.div 
            className="flex items-center gap-0.5 bg-blue-500/90 backdrop-blur-sm rounded-full px-1.5 py-0.5"
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <Loader2 className="w-2 h-2 text-white animate-spin" />
          </motion.div>
        )}
        
        {/* Video ready indicator */}
        {hasAnimationFrames && isVideoReady && !isAIGenerating && (
          <motion.div
            className="w-2 h-2 rounded-full bg-green-400"
            animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}
      </div>

      {/* ✅ KUAISHOU: Content overlay */}
      <div className="absolute inset-0 z-10 flex flex-col justify-end p-3 sm:p-4">
        {/* Emoji with hover animation */}
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          animate={isFocused || isHovered ? { 
            scale: [1, 1.15, 1],
            y: [0, -5, 0]
          } : {}}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <span className="text-4xl sm:text-5xl drop-shadow-2xl opacity-90">{(template as any).emoji}</span>
        </motion.div>

        {/* Bottom content */}
        <div className="mt-auto">
          {/* Template name with glass effect */}
          <motion.h3 
            className="font-bold text-white text-sm leading-tight mb-0.5 drop-shadow-lg"
            animate={isHovered ? { x: [0, 2, 0] } : {}}
            transition={{ duration: 0.3 }}
          >
            {(template as any).label_fr}
          </motion.h3>

          <p className="text-white/60 text-[10px] line-clamp-1 mb-2.5 drop-shadow-sm">
            {(template as any).description_fr}
          </p>

          {/* ✅ KUAISHOU: Action buttons with glass effect */}
          <div className="flex gap-1.5">
            <motion.button
              onClick={(e) => {
                e.stopPropagation();
                onOpenPreview();
              }}
              whileTap={{ scale: 0.95 }}
              className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl bg-white/15 backdrop-blur-md border border-white/10 active:bg-white/25 transition-all"
            >
              <Eye className="h-3.5 w-3.5 text-white" />
              <span className="text-white text-[10px] font-medium">Aperçu</span>
            </motion.button>
            <motion.button
              onClick={(e) => {
                e.stopPropagation();
                onQuickSelect();
              }}
              whileTap={{ scale: 0.95 }}
              className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl bg-white active:bg-white/90 transition-all shadow-lg"
            >
              <Check className="h-3.5 w-3.5 text-black" />
              <span className="text-black text-[10px] font-bold">Utiliser</span>
            </motion.button>
          </div>
        </div>

        {/* ✅ KUAISHOU: Audio indicator */}
        {audioEnabled && isSpeaking && (
          <motion.div
            className="absolute top-12 right-3"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 0.5, repeat: Infinity }}
          >
            <div className="bg-green-500/80 backdrop-blur-sm rounded-full p-1.5">
              <Volume2 className="h-3 w-3 text-white" />
            </div>
          </motion.div>
        )}
      </div>

      {/* ✅ KUAISHOU: Play overlay on hover */}
      <AnimatePresence>
        {isHovered && hasAnimationFrames && !isVideoReady && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-15 flex items-center justify-center bg-black/30 backdrop-blur-[2px]"
          >
            <motion.div
              className="w-12 h-12 rounded-full bg-white/30 backdrop-blur-md flex items-center justify-center"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              <Play className="h-5 w-5 text-white ml-0.5" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default AdvancedTemplateDrawer;
