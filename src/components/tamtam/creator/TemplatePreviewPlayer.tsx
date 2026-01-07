// TemplatePreviewPlayer.tsx
// Real K-Engine canvas preview (RAF) + existing card UI

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, Volume2, VolumeX, Clock, Sparkles, Check } from "lucide-react";

import { AdvancedTemplate, formatDuration } from "./AdvancedTemplateData";
import { kEngine, TemplateManifest, PipelineStep } from "./TemplateEngine";

import { useFrenchTTS } from "@/hooks/useFrenchTTS";
import { useBaribaTTS } from "@/hooks/useBaribaTTS";
import { cn } from "@/lib/utils";

interface TemplatePreviewPlayerProps {
  template: AdvancedTemplate;
  isActive: boolean;
  onSelect: () => void;
  onPreviewStart?: () => void;
  onPreviewEnd?: () => void;
  language?: "fr" | "ba";
  autoPlay?: boolean;
}

/**
 * Adapter: AdvancedTemplate -> TemplateManifest
 * - If your AdvancedTemplate already contains a manifest (recommended), we use it.
 * - Otherwise, we build a minimal manifest so K-Engine can render a real timeline preview.
 */
function resolveManifestFromAdvancedTemplate(tpl: AdvancedTemplate): TemplateManifest {
  const anyTpl: any = tpl as any;

  // ✅ If your data already embeds the real K-Engine manifest, use it
  if (anyTpl.manifest && typeof anyTpl.manifest === "object") {
    return anyTpl.manifest as TemplateManifest;
  }
  if (anyTpl.kManifest && typeof anyTpl.kManifest === "object") {
    return anyTpl.kManifest as TemplateManifest;
  }

  // Fallback: build a minimal, coherent K-Engine manifest (background + user + text)
  const duration = 8;
  const pipeline: PipelineStep[] = [];

  // Map some legacy feature flags to pipeline ops
  const f: any = (tpl as any).features || {};
  if (f?.styleTransfer) pipeline.push({ op: "color_grade", quality: "medium", output: "grade", params: {} });
  if (f?.beatSync) pipeline.push({ op: "beat_detect", quality: "medium", output: "beat", params: {} });
  if (f?.smartCaptions) pipeline.push({ op: "asr_subtitles", target: "main_character", quality: "medium", output: "subtitles", params: { fps: 15 } });
  // segmentation is the big Kuaishou magic:
  if (f?.photoAnimation || f?.styleTransfer) {
    // keep light (optional). If you want it always when template needs detourage => set true in your manifest.
  }
  // For preview we keep segmentation optional; your real manifests should define it explicitly.
  // pipeline.push({ op: "segmentation_person", target: "main_character", quality: "low", output: "main_character", params: { fps: 12, threshold: 0.5 } });

  return {
    id: (tpl as any).id || `tpl_${Math.random().toString(16).slice(2, 10)}`,
    name: (tpl as any).label_fr || "Template",
    description: (tpl as any).description_fr || "",
    version: "1.0.0",
    duration,
    ratio: "9:16",
    category: (tpl as any).family || "transition",
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
    pipeline,
    timeline: [
      {
        layer_id: "bg",
        type: "video_layer",
        z_index: 0,
        start: 0,
        end: duration,
        asset: "", // if you have a bg mp4 url, put it in your real manifest
        transform: { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 },
        effects: [],
        animation: { type: "fade", duration: 0.6, easing: "ease-out" },
      },
      {
        layer_id: "user",
        type: "user_media_layer",
        z_index: 1,
        start: 0,
        end: duration,
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
        end: duration,
        text: (tpl as any).label_fr || "TamTam",
        transform: { x: 0.5, y: 0.84, scale: 1, rotation: 0, opacity: 1 },
        effects: [],
        animation: { type: "fade", duration: 0.6, easing: "ease-out" },
      },
    ],
    overrides: ["cover", "text", "music", "subtitles"],
    music: { enabled: !!f?.beatSync, beatSync: !!f?.beatSync, defaultTrack: "", bpm: 120 },
    export: { codec: "libx264", preset: "ultrafast", crf: 23, fps: 30 },
  };
}

const TemplatePreviewPlayer: React.FC<TemplatePreviewPlayerProps> = ({
  template,
  isActive,
  onSelect,
  onPreviewStart,
  onPreviewEnd,
  language = "fr",
  autoPlay = false,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDescribing, setIsDescribing] = useState(false);
  const [ttsMuted, setTtsMuted] = useState(false);

  // progress bar (0..1)
  const [progress, setProgress] = useState(0);

  // K-Engine canvas refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const startTsRef = useRef<number>(0);

  const { speak: speakFr, stop: stopFr, isSpeaking: isSpeakingFr } = useFrenchTTS();
  const { speak: speakBa, stop: stopBa, isSpeaking: isSpeakingBa } = useBaribaTTS();
  const speak = language === "ba" ? speakBa : speakFr;
  const stop = language === "ba" ? stopBa : stopFr;
  const isSpeaking = language === "ba" ? isSpeakingBa : isSpeakingFr;

  // Resolve a real K-Engine manifest for this template card
  const manifest = useMemo(() => resolveManifestFromAdvancedTemplate(template), [template]);

  // badges (legacy UI)
  const badges = useMemo(() => {
    const f: any = (template as any).features || {};
    const b: { icon: string; label: string }[] = [];
    if (f.beatSync) b.push({ icon: "🎵", label: "Beat-Sync" });
    if (f.smartCaptions) b.push({ icon: "💬", label: "Sous-titres" });
    if (f.translation) b.push({ icon: "🌍", label: "Traduction" });
    if (f.audioEnhance) b.push({ icon: "🔊", label: "Audio+" });
    if (f.narrativeStructure) b.push({ icon: "📖", label: "Narration" });
    if (f.styleTransfer) b.push({ icon: "🎨", label: "Style" });
    if (f.photoAnimation) b.push({ icon: "✨", label: "Animation" });
    return b.slice(0, 4);
  }, [template]);

  // --- K-Engine render loop ---
  const stopPreview = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    setIsPlaying(false);
    setProgress(0);
    onPreviewEnd?.();
  }, [onPreviewEnd]);

  // Use a ref to avoid circular dependency
  const renderTickRef = useRef<() => void>(() => {});
  
  const renderTick = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dur = Math.max(0.1, manifest.duration || 8);
    const elapsedMs = Date.now() - startTsRef.current;
    const t = (elapsedMs / 1000) % dur;

    // progress bar for 1 loop
    const p = Math.min((elapsedMs / 1000) / dur, 1);
    setProgress(p);

    // ✅ Real K-Engine render (timeline compositing)
    kEngine.setTime(t);
    kEngine.renderFrameToCanvas(canvas, t);

    if (p < 1) {
      rafRef.current = requestAnimationFrame(renderTickRef.current);
    } else {
      stopPreview();
    }
  }, [manifest.duration, stopPreview]);

  // Keep ref in sync
  useEffect(() => {
    renderTickRef.current = renderTick;
  }, [renderTick]);

  const startPreview = useCallback(() => {
    setIsPlaying(true);
    onPreviewStart?.();

    // ✅ load template into K-Engine (real)
    kEngine.loadTemplate(manifest);

    // setup canvas size based on ratio
    const canvas = canvasRef.current;
    if (canvas) {
      // Use a small but crisp preview (retina-friendly)
      const ratio = manifest.ratio || "9:16";
      const baseW = 320;
      const baseH = ratio === "16:9" ? 180 : ratio === "1:1" ? 320 : 568;

      const dpr = typeof window !== "undefined" ? Math.max(1, window.devicePixelRatio || 1) : 1;
      canvas.width = Math.round(baseW * dpr);
      canvas.height = Math.round(baseH * dpr);
      canvas.style.width = `${baseW}px`;
      canvas.style.height = `${baseH}px`;

      const ctx = canvas.getContext("2d");
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    startTsRef.current = Date.now();
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(renderTick);
  }, [manifest, onPreviewStart, renderTick]);

  // Speak description (TTS)
  const speakDescription = useCallback(() => {
    if (ttsMuted) return;

    if (isSpeaking) {
      stop();
      setIsDescribing(false);
    } else {
      const anyTpl: any = template as any;
      const text =
        language === "ba" && anyTpl.description_ba
          ? `${anyTpl.label_ba || anyTpl.label_fr}. ${anyTpl.description_ba}`
          : `${anyTpl.label_fr}. ${anyTpl.description_fr}`;
      speak(text);
      setIsDescribing(true);
    }
  }, [template, language, speak, stop, isSpeaking, ttsMuted]);

  // cleanup
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      stop();
    };
  }, [stop]);

  // autoPlay when active
  useEffect(() => {
    if (autoPlay && isActive && !isPlaying) {
      startPreview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlay, isActive]);

  // sync describing state
  useEffect(() => {
    if (!isSpeaking && isDescribing) setIsDescribing(false);
  }, [isSpeaking, isDescribing]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "relative rounded-xl sm:rounded-2xl overflow-hidden transition-all",
        isActive && "ring-2 ring-white shadow-[0_0_20px_rgba(255,255,255,0.15)]"
      )}
      onClick={onSelect}
      role="button"
      tabIndex={0}
    >
      {/* Background Gradient (legacy) */}
      <div className={cn("absolute inset-0 bg-gradient-to-br", (template as any).color)} />

      {/* Animated Background */}
      <motion.div
        className="absolute inset-0 bg-white/10"
        animate={{
          opacity: isPlaying
            ? [0.1, 0.3, 0.1]
            : (template as any).previewAnimation === "pulse"
            ? [0.05, 0.15, 0.05]
            : 0.05,
        }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* ✅ Real K-Engine canvas preview (shown when playing) */}
      <AnimatePresence>
        {isPlaying && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="rounded-xl overflow-hidden border border-white/20 shadow-xl">
              <canvas ref={canvasRef} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      <div className="relative z-10 p-3 sm:p-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <motion.span
            className="text-3xl sm:text-4xl"
            animate={isPlaying ? { scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] } : {}}
            transition={{ duration: 1, repeat: Infinity }}
          >
            {(template as any).emoji}
          </motion.span>

          {/* Voice + Mute */}
          <div className="flex items-center gap-2">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={(e) => {
                e.stopPropagation();
                setTtsMuted((v) => !v);
              }}
              className={cn(
                "w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center",
                ttsMuted ? "bg-white/15 text-white" : "bg-black/30 text-white"
              )}
              title={ttsMuted ? "Activer voix" : "Couper voix"}
            >
              {ttsMuted ? <VolumeX className="h-4 w-4 sm:h-5 sm:w-5" /> : <Volume2 className="h-4 w-4 sm:h-5 sm:w-5" />}
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={(e) => {
                e.stopPropagation();
                speakDescription();
              }}
              className={cn(
                "w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center",
                isDescribing ? "bg-white text-black" : "bg-black/30 text-white"
              )}
              title="Lire la description"
            >
              <Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />
            </motion.button>
          </div>
        </div>

        {/* Title & Description */}
        <h3 className="mt-2 font-bold text-white text-sm sm:text-base leading-tight">
          {(template as any).label_fr}
        </h3>
        {(template as any).label_ba && (
          <p className="text-white/60 text-[10px] sm:text-xs">{(template as any).label_ba}</p>
        )}
        <p className="mt-1 text-white/80 text-xs sm:text-sm line-clamp-2 leading-snug">
          {(template as any).description_fr}
        </p>

        {/* Feature Badges */}
        <div className="mt-2 sm:mt-3 flex gap-1 sm:gap-1.5 overflow-x-auto scrollbar-hide pb-1">
          {badges.map((badge, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full bg-black/30 text-white text-[10px] sm:text-xs whitespace-nowrap flex-shrink-0"
            >
              <span>{badge.icon}</span>
              <span className="opacity-80">{badge.label}</span>
            </span>
          ))}
        </div>

        {/* Durations */}
        <div className="mt-2 sm:mt-3 flex items-center gap-1 sm:gap-1.5 flex-wrap">
          <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-white/60" />
          {((template as any).supportedDurations || []).slice(0, 4).map((dur: any) => (
            <span
              key={dur}
              className="text-[10px] sm:text-xs text-white/70 bg-white/10 px-1.5 sm:px-2 py-0.5 rounded"
            >
              {formatDuration(dur)}
            </span>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="mt-3 sm:mt-4 flex gap-1.5 sm:gap-2">
          {/* Preview Button (Real K-Engine) */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={(e) => {
              e.stopPropagation();
              if (isPlaying) stopPreview();
              else startPreview();
            }}
            className="flex-1 h-9 sm:h-11 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center gap-1.5 text-white"
          >
            {isPlaying ? (
              <>
                <Pause className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="text-xs sm:text-sm font-medium">Arrêter</span>
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="text-xs sm:text-sm font-medium">Aperçu</span>
              </>
            )}
          </motion.button>

          {/* Select Button */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
            }}
            className="flex-1 h-9 sm:h-11 rounded-full bg-white text-black flex items-center justify-center gap-1.5 font-semibold"
          >
            <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="text-xs sm:text-sm">Utiliser</span>
          </motion.button>
        </div>

        {/* Progress Bar (when playing) */}
        <AnimatePresence>
          {isPlaying && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mt-2 sm:mt-3 h-1 rounded-full bg-black/30 overflow-hidden"
            >
              <motion.div className="h-full bg-white" style={{ width: `${progress * 100}%` }} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Voice Instructions Indicator */}
      {Array.isArray((template as any).voiceInstructions) && (template as any).voiceInstructions.length > 0 && (
        <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full bg-black/40 backdrop-blur-sm flex items-center gap-0.5 sm:gap-1">
          <Sparkles className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-amber-400" />
          <span className="text-[9px] sm:text-[10px] text-white/80">
            {(template as any).voiceInstructions.length} étapes
          </span>
        </div>
      )}
    </motion.div>
  );
};

export default TemplatePreviewPlayer;
