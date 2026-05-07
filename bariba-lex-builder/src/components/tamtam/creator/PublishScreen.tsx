// src/components/tamtam/creator/PublishScreen.tsx
// Fullscreen publish screen with K-Engine exportJob integration

import React, { useMemo, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Send,
  MapPin,
  Users,
  Lock,
  Globe,
  Hash,
  Palette,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Loader2,
  AlertCircle,
  Image as ImageIcon,
  Type,
  Video,
  Sparkles,
  Check,
  Headphones,
  Square,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Caption } from "./CaptionsDrawer";
import { SelectedMusic } from "./MusicDrawer";
import { CaptureEffects } from "./CreatorEffectsData";
import { trimAudioBlob } from "@/utils/audioTrimmer";

// ✅ K-Engine
import { kEngine } from "./TemplateEngine";

interface PublishScreenProps {
  isOpen: boolean;
  mediaType: "video" | "photo" | "text";
  previewUrl: string; // preview URL (blob/object url)
  textContent?: string;

  caption: string;
  effects: CaptureEffects;
  selectedMusic?: SelectedMusic | null;
  captions?: Caption[];
  cssFilter?: string;

  onCaptionChange: (caption: string) => void;

  /**
   * Legacy publish hook (upload to backend, DB insert, etc.)
   * We will call it AFTER we have the final exported blob from K-Engine.
   * If you want, you can replace entirely with onPublishExported(blob,...).
   */
  onPublish: (payload?: { exportedBlob?: Blob; exportedType?: "video" | "image"; meta?: any }) => Promise<void>;

  onBack: () => void;
  isPublishing?: boolean;
  error?: string | null;
}

type Visibility = "public" | "friends" | "private";

const TEXT_BACKGROUNDS = [
  { id: "gradient-1", style: "bg-gradient-to-br from-orange-500 via-red-500 to-purple-600" },
  { id: "gradient-2", style: "bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500" },
  { id: "gradient-3", style: "bg-gradient-to-br from-green-400 via-teal-500 to-blue-500" },
  { id: "gradient-4", style: "bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500" },
  { id: "gradient-5", style: "bg-gradient-to-br from-pink-400 via-purple-500 to-indigo-600" },
  { id: "solid-dark", style: "bg-slate-900" },
  { id: "solid-warm", style: "bg-amber-900" },
];

const SUGGESTED_HASHTAGS = [
  "#TamTam",
  "#Bénin",
  "#Bariba",
  "#VillageLife",
  "#AfriqueOuest",
  "#Culture",
  "#Tradition",
  "#Communauté",
];

async function urlToBlob(url: string): Promise<Blob> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Impossible de charger le média de prévisualisation.");
  return await res.blob();
}

// Render text mode to an image blob so K-Engine/export can handle it
async function renderTextToImageBlob(text: string, bgClass: string): Promise<Blob> {
  // Simple canvas renderer (client-side)
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas non disponible");

  // Background: approximate gradient mapping (we keep it simple, production can map exact colors)
  // If you want exact tailwind colors, we can map each id -> hex stops.
  const bgId = bgClass.includes("gradient-1")
    ? "gradient-1"
    : bgClass.includes("gradient-2")
    ? "gradient-2"
    : bgClass.includes("gradient-3")
    ? "gradient-3"
    : bgClass.includes("gradient-4")
    ? "gradient-4"
    : bgClass.includes("gradient-5")
    ? "gradient-5"
    : bgClass.includes("bg-slate-900")
    ? "solid-dark"
    : "solid-warm";

  if (bgId.startsWith("gradient")) {
    const g = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    // minimal palette
    if (bgId === "gradient-1") {
      g.addColorStop(0, "#f97316");
      g.addColorStop(0.5, "#ef4444");
      g.addColorStop(1, "#7c3aed");
    } else if (bgId === "gradient-2") {
      g.addColorStop(0, "#3b82f6");
      g.addColorStop(0.5, "#a855f7");
      g.addColorStop(1, "#ec4899");
    } else if (bgId === "gradient-3") {
      g.addColorStop(0, "#34d399");
      g.addColorStop(0.5, "#14b8a6");
      g.addColorStop(1, "#3b82f6");
    } else if (bgId === "gradient-4") {
      g.addColorStop(0, "#facc15");
      g.addColorStop(0.5, "#f97316");
      g.addColorStop(1, "#ef4444");
    } else {
      g.addColorStop(0, "#f472b6");
      g.addColorStop(0.5, "#a855f7");
      g.addColorStop(1, "#4f46e5");
    }
    ctx.fillStyle = g;
  } else {
    ctx.fillStyle = bgId === "solid-dark" ? "#0f172a" : "#78350f";
  }
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Text card
  const pad = 140;
  const cardW = canvas.width - pad * 2;
  const cardH = Math.floor(canvas.height * 0.45);
  const cardX = pad;
  const cardY = Math.floor((canvas.height - cardH) / 2);

  // glass card
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  roundRect(ctx, cardX, cardY, cardW, cardH, 56);
  ctx.fill();

  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 3;
  roundRect(ctx, cardX, cardY, cardW, cardH, 56);
  ctx.stroke();

  // text
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "600 56px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  const maxWidth = cardW * 0.85;

  const lines = wrapText(ctx, text || "Votre texte", maxWidth);
  const lineH = 78;
  const startY = cardY + cardH / 2 - ((lines.length - 1) * lineH) / 2;

  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], canvas.width / 2, startY + i * lineH);
  }

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => {
      if (!b) reject(new Error("Impossible de générer l’image du texte."));
      else resolve(b);
    }, "image/png");
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";

  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width <= maxWidth) line = test;
    else {
      if (line) lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);

  // clamp to avoid overflow
  return lines.slice(0, 8);
}

export default function PublishScreen({
  isOpen,
  mediaType,
  previewUrl,
  textContent,
  caption,
  effects,
  selectedMusic,
  captions,
  cssFilter,
  onCaptionChange,
  onPublish,
  onBack,
  isPublishing = false,
  error,
}: PublishScreenProps) {
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [location, setLocation] = useState("");
  const [showLocationInput, setShowLocationInput] = useState(false);
  const [textBgIndex, setTextBgIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showHashtags, setShowHashtags] = useState(false);
  const [allowDuo, setAllowDuo] = useState(false); // ✅ Kuaishou-style Duo toggle

  // ✅ K-Engine export state (real)
  const [exporting, setExporting] = useState(false);
  const [exportPercent, setExportPercent] = useState(0);
  const [exportMessage, setExportMessage] = useState<string>("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const previewAudioCtxRef = useRef<AudioContext | null>(null);
  const previewSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const [isPreviewingMix, setIsPreviewingMix] = useState(false);

  const selectedBg = TEXT_BACKGROUNDS[textBgIndex];

  const canExportThroughEngine = useMemo(() => {
    // If a template is loaded and engine has a manifest, we can export job.
    // If you're in "no template" mode, engine may not be loaded => fallback to legacy onPublish.
    const st = kEngine.getState?.();
    return !!st?.loaded;
  }, [isOpen]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      stopMixPreview();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  // Stop mix preview audio
  const stopMixPreview = useCallback(() => {
    try { previewSourceRef.current?.stop(); } catch {}
    previewSourceRef.current = null;
    previewAudioCtxRef.current?.close().catch(() => {});
    previewAudioCtxRef.current = null;
    setIsPreviewingMix(false);
  }, []);

  // Toggle mix preview: plays video + music simultaneously
  const toggleMixPreview = useCallback(async () => {
    if (isPreviewingMix) {
      stopMixPreview();
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }
      setIsPlaying(false);
      return;
    }

    if (!selectedMusic || !videoRef.current) return;
    const musicUrl = selectedMusic.track?.url || selectedMusic.customUrl;
    if (!musicUrl) return;

    try {
      const ctx = new AudioContext({ sampleRate: 44100 });
      if (ctx.state === 'suspended') await ctx.resume();
      previewAudioCtxRef.current = ctx;

      const res = await fetch(musicUrl);
      const ab = await res.arrayBuffer();
      const buf = await ctx.decodeAudioData(ab.slice(0));

      const source = ctx.createBufferSource();
      source.buffer = buf;
      const gain = ctx.createGain();
      gain.gain.value = (selectedMusic.volume || 70) / 100;
      source.connect(gain).connect(ctx.destination);

      const offset = selectedMusic.startOffset || 0;

      // Durée de prévisualisation: on s'aligne sur la durée réelle de la création
      // (video), sans jamais retomber à 30s par défaut.
      const creationDur = Number(videoRef.current.duration);
      const fallbackCreationDur = 90;
      const safeCreationDur = isFinite(creationDur) && creationDur > 0 ? creationDur : fallbackCreationDur;

      const selectedDur = Number(selectedMusic.trimmedDuration);
      const safeSelectedDur = isFinite(selectedDur) && selectedDur > 0 ? selectedDur : safeCreationDur;

      const playDur = Math.min(safeCreationDur, safeSelectedDur);

      source.start(0, offset, playDur);
      previewSourceRef.current = source;

      source.onended = () => stopMixPreview();

      // Sync video playback
      videoRef.current.currentTime = 0;
      videoRef.current.play();
      setIsPlaying(true);
      setIsPreviewingMix(true);
    } catch (e) {
      console.warn('[PublishScreen] Mix preview failed:', e);
      stopMixPreview();
    }
  }, [isPreviewingMix, selectedMusic, stopMixPreview]);

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const addHashtag = (tag: string) => {
    if (!caption.includes(tag)) {
      onCaptionChange(caption ? `${caption} ${tag}` : tag);
    }
  };

  // ✅ Publish = export (K-Engine) -> then backend publish
  const handlePublish = async () => {
    if (exporting || isPublishing) return;

    try {
      setExporting(true);
      setExportPercent(0);
      setExportMessage(canExportThroughEngine ? "Préparation de l’export..." : "Publication...");

      // If no engine template loaded, fallback to legacy onPublish
      if (!canExportThroughEngine) {
        await onPublish();
        return;
      }

      // 1) Build export inputs for K-Engine
      let primaryBlob: Blob;
      let outputType: "video" | "image" = mediaType === "video" ? "video" : "image";

      if (mediaType === "text") {
        primaryBlob = await renderTextToImageBlob(textContent || "Votre texte", selectedBg.style);
        outputType = "image";
      } else {
        primaryBlob = await urlToBlob(previewUrl);
        outputType = mediaType === "video" ? "video" : "image";
      }

      // 2) Build metadata
      const meta = {
        caption,
        visibility,
        location: location || undefined,
        allowDuo, // ✅ Kuaishou-style Duo permission
        selectedMusic: selectedMusic
          ? {
              id: selectedMusic.track?.id,
              name: selectedMusic.track?.name || selectedMusic.customName,
              url: selectedMusic.track?.url,
              startAt: selectedMusic.startOffset,
              duration: selectedMusic.trimmedDuration,
            }
          : null,
        captions: captions || null,
        effects: effects || null,
        cssFilter: cssFilter || null,
        mediaType,
        textBackground: mediaType === "text" ? selectedBg.id : null,
      };

      // 3) Pre-trim audio if music has a startOffset
      let trimmedAudioBlob: Blob | undefined;
      if (selectedMusic?.startOffset && selectedMusic.startOffset > 0) {
        const musicUrl = selectedMusic.track?.url || selectedMusic.customUrl;
        if (musicUrl) {
          try {
            setExportMessage("Découpage audio...");
            trimmedAudioBlob = await trimAudioBlob(
              musicUrl,
              selectedMusic.startOffset,
              selectedMusic.trimmedDuration || 90
            );
            // Update meta with trimmed audio blob URL
            const trimmedUrl = URL.createObjectURL(trimmedAudioBlob);
            meta.selectedMusic = {
              ...meta.selectedMusic,
              url: trimmedUrl,
              startAt: 0, // Already trimmed
            };
            console.log('[PublishScreen] Audio trimmed:', (trimmedAudioBlob.size / 1024).toFixed(0), 'KB');
          } catch (e) {
            console.warn('[PublishScreen] Audio trim failed, using original:', e);
          }
        }
      }

      // 4) Export job via K-Engine
      //    ✅ FAST EXPORT: Since capture is already baked-in (stylized via liveCanvas),
      //    we skip re-rendering which is MUCH faster for low-data zones.
      const result = await kEngine.exportJob(
        {
          inputBlob: primaryBlob,
          inputType: mediaType,
          meta,
          trimmedAudioBlob,
          fastExport: true, // ✅ Skip re-rendering - capture is already stylized
          exportQuality: "medium", // ✅ 720p @ 15fps - good balance for mobile
        },
        (p: { stage?: string; percent?: number; message?: string }) => {
          setExportPercent(Math.max(0, Math.min(100, p.percent ?? 0)));
          setExportMessage(p.message || (p.stage ? `Export: ${p.stage}` : "Export en cours..."));
        }
      );

      // result can be Blob or { outputBlob, ... }
      const exportedBlob: Blob =
        result instanceof Blob ? result : (result?.outputBlob as Blob);

      if (!exportedBlob) {
        throw new Error("Export K-Engine échoué : aucun fichier généré.");
      }

      setExportPercent(100);
      setExportMessage("Export terminé ✅");

      // 4) Call your existing publish (upload DB/storage etc.)
      await onPublish({ exportedBlob, exportedType: outputType, meta });
    } catch (e: any) {
      console.error("[PublishScreen] publish/export error:", e);
      // we keep the existing `error` prop display. If you want local error too, add state.
      alert(e?.message || "Erreur pendant l’export/publication.");
    } finally {
      setExporting(false);
      setExportPercent(0);
      setExportMessage("");
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-black"
    >
      {/* ===== FULLSCREEN MEDIA PREVIEW ===== */}
      <div className="absolute inset-0">
        {mediaType === "text" ? (
          <div className={cn("absolute inset-0", selectedBg.style)}>
            <div className="absolute inset-0 flex items-center justify-center p-8">
              <div className="max-w-lg">
                <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20">
                  <p className="text-white text-2xl md:text-3xl font-semibold text-center leading-relaxed">
                    {textContent || "Votre texte"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : mediaType === "video" ? (
          <video
            ref={videoRef}
            src={previewUrl}
            className="absolute inset-0 w-full h-full object-contain"
            style={{ filter: cssFilter }}
            playsInline
            loop
            onClick={togglePlay}
          />
        ) : (
          <img
            src={previewUrl}
            alt="Preview"
            className="absolute inset-0 w-full h-full object-contain"
            style={{ filter: cssFilter }}
          />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 pointer-events-none" />
      </div>

      {/* ===== HEADER ===== */}
      <div className="absolute top-0 left-0 right-0 z-10 safe-area-top">
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <button
            onClick={onBack}
            className="h-11 px-4 rounded-full bg-black/40 backdrop-blur-xl flex items-center gap-2 text-white"
          >
            <X className="h-4 w-4" />
            <span className="text-sm">Retour</span>
          </button>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-xl">
            {mediaType === "text" ? (
              <Type className="h-4 w-4 text-orange-400" />
            ) : mediaType === "video" ? (
              <Video className="h-4 w-4 text-orange-400" />
            ) : (
              <ImageIcon className="h-4 w-4 text-orange-400" />
            )}
            <span className="text-white text-sm capitalize">{mediaType}</span>
          </div>
        </div>
      </div>

      {/* ===== VIDEO CONTROLS (only for video) ===== */}
      {mediaType === "video" && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
          <button
            onClick={togglePlay}
            className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-xl flex items-center justify-center"
          >
            {isPlaying ? (
              <Pause className="h-8 w-8 text-white" />
            ) : (
              <Play className="h-8 w-8 text-white ml-1" />
            )}
          </button>
        </div>
      )}

      {mediaType === "video" && (
        <button
          onClick={toggleMute}
          className="absolute top-20 right-4 z-10 w-10 h-10 rounded-full bg-black/40 backdrop-blur-xl flex items-center justify-center"
        >
          {isMuted ? (
            <VolumeX className="h-5 w-5 text-white" />
          ) : (
            <Volume2 className="h-5 w-5 text-white" />
          )}
        </button>
      )}

      {/* ===== TEXT BACKGROUND SELECTOR (only for text mode) ===== */}
      {mediaType === "text" && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-2">
          <div className="flex flex-col gap-2 p-2 rounded-xl bg-black/40 backdrop-blur-xl">
            <Palette className="h-4 w-4 text-white/60 mx-auto mb-1" />
            {TEXT_BACKGROUNDS.map((bg, idx) => (
              <button
                key={bg.id}
                onClick={() => setTextBgIndex(idx)}
                className={cn(
                  "w-8 h-8 rounded-full border-2 transition-all",
                  bg.style,
                  textBgIndex === idx ? "border-white scale-110" : "border-transparent"
                )}
              />
            ))}
          </div>
        </div>
      )}

      {/* ===== BOTTOM PANEL ===== */}
      <div className="absolute bottom-0 left-0 right-0 z-10 safe-area-bottom">
        <div className="bg-black/60 backdrop-blur-xl rounded-t-3xl border-t border-white/10 p-4 space-y-4">
          {/* Music indicator */}
          {selectedMusic && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-orange-500/20 border border-orange-500/30">
              <span className="text-xl">🎵</span>
              <span className="text-orange-300 text-sm flex-1 truncate">
                {selectedMusic.track?.name || selectedMusic.customName}
              </span>
            </div>
          )}

          {/* Caption input */}
          <div className="relative">
            <textarea
              value={caption}
              onChange={(e) => onCaptionChange(e.target.value)}
              placeholder="Ajoute une description..."
              className="w-full min-h-[80px] rounded-2xl bg-white/5 border border-white/10 p-4 text-white placeholder:text-white/40 outline-none resize-none"
            />
            <button
              onClick={() => setShowHashtags(!showHashtags)}
              className={cn(
                "absolute bottom-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all",
                showHashtags ? "bg-orange-500 text-white" : "bg-white/10 text-white/60"
              )}
            >
              <Hash className="h-4 w-4" />
            </button>
          </div>

          {/* Hashtag suggestions */}
          <AnimatePresence>
            {showHashtags && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="flex flex-wrap gap-2">
                  {SUGGESTED_HASHTAGS.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => addHashtag(tag)}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-sm transition-all",
                        caption.includes(tag)
                          ? "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                          : "bg-white/5 text-white/60 hover:text-white/80"
                      )}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ✅ Export Progress (K-Engine) */}
          <AnimatePresence>
            {exporting && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="rounded-2xl bg-white/5 border border-white/10 p-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-white/80 text-sm">
                    <Sparkles className="h-4 w-4 text-orange-400" />
                    <span>{exportMessage || "Export K-Engine..."}</span>
                  </div>
                  <div className="text-white/70 text-sm tabular-nums">{exportPercent}%</div>
                </div>
                <div className="mt-2 h-2 rounded-full bg-black/40 overflow-hidden">
                  <div className="h-full bg-orange-500" style={{ width: `${exportPercent}%` }} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ✅ Autoriser Duo Toggle (Kuaishou-style) */}
          <div className="flex items-center justify-between py-3 px-4 rounded-2xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Users className="h-5 w-5 text-white" />
              </div>
              <div>
                <span className="text-white font-medium">Autoriser Duo</span>
                <p className="text-white/50 text-xs">D'autres peuvent créer avec ta vidéo</p>
              </div>
            </div>
            <button
              onClick={() => setAllowDuo(!allowDuo)}
              className={cn(
                "w-12 h-7 rounded-full transition-all relative",
                allowDuo ? "bg-green-500" : "bg-white/20"
              )}
            >
              <div
                className={cn(
                  "absolute top-1 w-5 h-5 rounded-full bg-white shadow-lg transition-all",
                  allowDuo ? "left-6" : "left-1"
                )}
              />
            </button>
          </div>

          {/* Options row */}
          <div className="flex items-center gap-2">
            {/* Location */}
            {showLocationInput ? (
              <div className="flex-1 flex gap-2">
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Nom du lieu..."
                  className="flex-1 bg-white/5 rounded-xl px-3 py-2 text-white text-sm outline-none border border-white/10"
                  autoFocus
                />
                <button
                  onClick={() => setShowLocationInput(false)}
                  className="px-3 py-2 rounded-xl bg-orange-500 text-white text-sm"
                >
                  OK
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowLocationInput(true)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm transition-all",
                  location ? "bg-orange-500/20 text-orange-400" : "bg-white/5 text-white/60"
                )}
              >
                <MapPin className="h-4 w-4" />
                {location || "Lieu"}
              </button>
            )}

            {/* Tag friends */}
            <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 text-white/60 text-sm">
              <Users className="h-4 w-4" />
              Tag
            </button>

            {/* Visibility */}
            <div className="flex items-center rounded-xl bg-white/5 overflow-hidden">
              {[
                { id: "public", icon: Globe, label: "Public" },
                { id: "friends", icon: Users, label: "Amis" },
                { id: "private", icon: Lock, label: "Privé" },
              ].map((v) => (
                <button
                  key={v.id}
                  onClick={() => setVisibility(v.id as Visibility)}
                  className={cn(
                    "px-3 py-2 flex items-center gap-1.5 text-sm transition-all",
                    visibility === v.id ? "bg-orange-500 text-white" : "text-white/60"
                  )}
                >
                  <v.icon className="h-4 w-4" />
                </button>
              ))}
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 text-sm">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          {/* Mix preview button (only when music is selected and mediaType is video) */}
          {selectedMusic && mediaType === "video" && (
            <button
              onClick={toggleMixPreview}
              disabled={isPublishing || exporting}
              className={cn(
                "w-full h-12 rounded-2xl flex items-center justify-center gap-2 text-sm font-medium transition-all",
                isPreviewingMix
                  ? "bg-orange-500/20 border border-orange-500/50 text-orange-300"
                  : "bg-white/5 border border-white/10 text-white/80 hover:bg-white/10"
              )}
            >
              {isPreviewingMix ? (
                <><Square className="h-4 w-4" /> ⏸ Arrêter le rendu</>
              ) : (
                <><Headphones className="h-4 w-4" /> 🎵 Écouter le rendu final</>
              )}
            </button>
          )}

          {/* Publish button */}
          <button
            onClick={handlePublish}
            disabled={isPublishing || exporting}
            className="w-full h-14 rounded-2xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50 transition-all hover:shadow-lg hover:shadow-orange-500/25"
          >
            {isPublishing || exporting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                {exporting ? "Export K-Engine..." : "Publication..."}
              </>
            ) : (
              <>
                <Send className="h-5 w-5" />
                Publier
              </>
            )}
          </button>

          {/* small hint when engine is active */}
          <div className="text-[11px] text-white/40 flex items-center justify-center gap-1">
            {canExportThroughEngine ? (
              <>
                <Check className="h-3 w-3" />
                Export via K-Engine
              </>
            ) : (
              <span>Export standard</span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
