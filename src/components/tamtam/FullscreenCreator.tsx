// src/components/tamtam/FullscreenCreator.tsx
// Kuaishou-style premium interface with UNIFIED live editing (no screen transitions)
// ✅ Updated to align with K-Engine TemplateEngine (TemplateManifest / EngineState / exportJob / pipeline fallback)
// ✅ Keeps legacy AdvancedTemplate UX working (voice instructions, overlays) with safe type-guards
// ✅ Adds K-Engine timeline preview + play/pause/seek + auto-bind captured media to slots + AI pipeline progress

import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  RotateCcw,
  Zap,
  Timer,
  Gauge,
  Sparkles,
  Flame,
  Music,
  Camera as CameraIcon,
  Send,
  AlertCircle,
  ChevronUp,
  SunMedium,
  FolderOpen,
  Sticker,
  Layers,
  Play,
  Pause,
  Scissors,
  Volume2,
  VolumeX,
  Type,
  Undo2,
  Redo2,
} from "lucide-react";
import { cn } from "@/lib/utils";

import {
  VideoFiltersInlinePanel,
  VIDEO_FILTERS,
  VideoFilter,
  scaleCssFilter,
} from "./VideoFilters";

import {
  AR_EFFECTS,
  CHALLENGES,
  CaptureEffects,
  DEFAULT_EFFECTS,
  getTemplateById, // "simple" UI template (overlay/gradient) from CreatorEffectsData
  Sticker as StickerType,
} from "./creator/CreatorEffectsData";

import { StickerLayer, StickerPicker } from "./creator/StickerLayer";
import { AREffectsLayer, ShotTipOverlay } from "./creator/AREffectsLayer";
import { GraphicsDrawer, getGraphicsStyles, getGraphicsClasses } from "./creator/GraphicsDrawer";
import { MagicDrawer } from "./creator/MagicDrawer";
import { TemplateOverlay } from "./creator/TemplateOverlay";
import AdvancedTemplateDrawer from "./creator/AdvancedTemplateDrawer";
import LiveTemplateEffect from "./creator/LiveTemplateEffect";
import TemplateCaptureOverlay from "./creator/TemplateCaptureOverlay";
import MiniTimeline, { MiniTimelineSegment } from "./creator/MiniTimeline";
import TemplateSlotPicker from "./creator/TemplateSlotPicker";
import RecognizingScreen from "./creator/RecognizingScreen";
import OverridesEditor from "./creator/OverridesEditor";
import TikTokEditingBar from "./creator/TikTokEditingBar";
import TextOverlayEditor, { TextOverlay, TextOverlayRenderer } from "./creator/TextOverlayEditor";
import OptimizedExportScreen from "./creator/OptimizedExportScreen";
import CameraResolutionIndicator from "./creator/CameraResolutionIndicator";
import { useDevicePerformance, getKEngineQualitySettings } from "@/hooks/useDevicePerformance";

// Legacy AdvancedTemplate data (still used by some UI effects/voice instructions)
import {
  AdvancedTemplate,
  durationToSeconds,
  KSEOverride,
} from "./creator/AdvancedTemplateData";

// ✅ TemplateEngine updated exports (K-Engine runtime + legacy engine service)
import templateEngine, {
  kEngine,
  type EngineState,
  type TemplateManifest,
  type ExportJob,
  type BoundAsset,
} from "./creator/TemplateEngine";

export type CreatorOutputPayload = {
  segments: MiniTimelineSegment[];
  caption: string;
  topTab: TopTab;
  mode: CaptureMode;
  canvasRatio: CanvasRatio;
  selectedFilterId?: string;
  effects?: CaptureEffects;
  challengeHashtag?: string;

  // ✅ New (optional): if a K-Engine template is active, pass export job + engine snapshot
  exportJob?: ExportJob;
  engineState?: EngineState;
};

type TopTab = "15s" | "30s" | "45s" | "60s" | "story" | "album" | "template";
type CaptureMode = "burst" | "photo" | "video" | "text";
type CanvasRatio = "9:16" | "1:1" | "16:9";
type DrawerType =
  | "none"
  | "beautify"
  | "length"
  | "magic"
  | "graphics"
  | "stickers"
  | "template"
  | "captions"
  | "music"
  | "speed";

export interface FullscreenCreatorProps {
  open?: boolean;
  onClose?: () => void;
  onPublish?: (payload: CreatorOutputPayload) => Promise<void> | void;
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function isMediaRecorderSupported() {
  return typeof window !== "undefined" && "MediaRecorder" in window;
}

function isSafariOrIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return (
    /^((?!chrome|android).)*safari/i.test(ua) ||
    /iPad|iPhone|iPod/.test(ua) ||
    ((navigator as any).platform === "MacIntel" && (navigator as any).maxTouchPoints > 1)
  );
}

function pickMimeType(): string | undefined {
  const MR = typeof window !== "undefined" ? (window as any).MediaRecorder : undefined;
  if (!MR || !MR.isTypeSupported) return undefined;

  // Safari/iOS: prefer MP4 (better support)
  if (isSafariOrIOS()) {
    const iosCandidates = [
      "video/mp4",
      "video/webm;codecs=h264,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
    ];
    for (const c of iosCandidates) {
      try {
        if (MR.isTypeSupported(c)) return c;
      } catch {}
    }
  }

  // Other browsers: prefer vp8 (more stable) over vp9
  const candidates = ["video/webm;codecs=vp8,opus", "video/webm;codecs=vp9,opus", "video/webm", "video/mp4"];
  for (const c of candidates) {
    try {
      if (MR.isTypeSupported(c)) return c;
    } catch {}
  }
  return undefined;
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = (text || "").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return ["Texte"];
  const lines: string[] = [];
  let line = words[0];
  for (let i = 1; i < words.length; i++) {
    const test = `${line} ${words[i]}`;
    if (ctx.measureText(test).width <= maxWidth) line = test;
    else {
      lines.push(line);
      line = words[i];
    }
  }
  lines.push(line);
  return lines.slice(0, 6);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

async function capturePhotoFromVideo(
  videoEl: HTMLVideoElement,
  ratio: CanvasRatio,
  effects: CaptureEffects
): Promise<Blob> {
  const w = videoEl.videoWidth || 1080;
  const h = videoEl.videoHeight || 1920;
  const target = (() => {
    if (ratio === "1:1") return { tw: 1080, th: 1080 };
    if (ratio === "16:9") return { tw: 1920, th: 1080 };
    return { tw: 1080, th: 1920 };
  })();

  const canvas = document.createElement("canvas");
  canvas.width = target.tw;
  canvas.height = target.th;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No canvas context");

  const srcAR = w / h;
  const dstAR = target.tw / target.th;
  let sx = 0,
    sy = 0,
    sw = w,
    sh = h;
  if (srcAR > dstAR) {
    sw = Math.round(h * dstAR);
    sx = Math.round((w - sw) / 2);
  } else {
    sh = Math.round(w / dstAR);
    sy = Math.round((h - sh) / 2);
  }

  // Apply filter
  const filter = VIDEO_FILTERS.find((f) => f.id === effects.filterId);
  if (filter && filter.id !== "none") {
    ctx.filter = scaleCssFilter(filter.cssFilter, effects.filterIntensity);
  }

  ctx.drawImage(videoEl, sx, sy, sw, sh, 0, 0, target.tw, target.th);

  // Apply template overlay gradient
  const template = getTemplateById(effects.templateId);
  if (template?.overlayGradient) {
    ctx.save();
    const gradient = ctx.createLinearGradient(0, 0, 0, target.th);
    gradient.addColorStop(0, "rgba(0,0,0,0.3)");
    gradient.addColorStop(0.5, "rgba(0,0,0,0)");
    gradient.addColorStop(1, "rgba(0,0,0,0.4)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, target.tw, target.th);
    ctx.restore();
  }

  // Draw stickers (emoji text)
  for (const sticker of effects.stickers) {
    ctx.save();
    const x = (sticker.position.x / 100) * target.tw;
    const y = (sticker.position.y / 100) * target.th;
    ctx.translate(x, y);
    ctx.rotate((sticker.rotation * Math.PI) / 180);
    ctx.scale(sticker.scale, sticker.scale);
    ctx.font = "60px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(sticker.content, 0, 0);
    ctx.restore();
  }

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Photo blob failed"))), "image/jpeg", 0.92);
  });
  return blob;
}

async function renderTextToImage(text: string, ratio: CanvasRatio, effects: CaptureEffects): Promise<Blob> {
  const size = (() => {
    if (ratio === "1:1") return { w: 1080, h: 1080 };
    if (ratio === "16:9") return { w: 1920, h: 1080 };
    return { w: 1080, h: 1920 };
  })();

  const canvas = document.createElement("canvas");
  canvas.width = size.w;
  canvas.height = size.h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No canvas ctx");

  const template = getTemplateById(effects.templateId);

  const g = ctx.createLinearGradient(0, 0, size.w, size.h);
  g.addColorStop(0, "#0f172a");
  g.addColorStop(1, "#111827");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size.w, size.h);

  if (template?.overlayGradient) {
    const overlay = ctx.createLinearGradient(0, 0, 0, size.h);
    overlay.addColorStop(0, "rgba(139,69,19,0.3)");
    overlay.addColorStop(0.5, "rgba(0,0,0,0)");
    overlay.addColorStop(1, "rgba(139,69,19,0.4)");
    ctx.fillStyle = overlay;
    ctx.fillRect(0, 0, size.w, size.h);
  }

  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.font = "700 72px Inter, system-ui, -apple-system, Segoe UI, Roboto";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const pad = 120;
  const maxW = size.w - pad * 2;
  const lines = wrapText(ctx, text || "Texte", maxW);
  const lineH = 92;
  const totalH = lines.length * lineH;
  let y = size.h / 2 - totalH / 2 + lineH / 2;

  const cardW = size.w - 140;
  const cardH = Math.max(260, totalH + 140);
  const cardX = (size.w - cardW) / 2;
  const cardY = (size.h - cardH) / 2;

  roundRect(ctx, cardX, cardY, cardW, cardH, 48);
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = "rgba(255,255,255,0.92)";
  for (const line of lines) {
    ctx.fillText(line, size.w / 2, y);
    y += lineH;
  }

  for (const sticker of effects.stickers) {
    ctx.save();
    const x = (sticker.position.x / 100) * size.w;
    const sy = (sticker.position.y / 100) * size.h;
    ctx.translate(x, sy);
    ctx.rotate((sticker.rotation * Math.PI) / 180);
    ctx.scale(sticker.scale, sticker.scale);
    ctx.font = "60px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(sticker.content, 0, 0);
    ctx.restore();
  }

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Text blob failed"))), "image/jpeg", 0.92);
  });
  return blob;
}

// ---------- K-ENGINE helpers ----------
function isTemplateManifest(x: any): x is TemplateManifest {
  return !!x && typeof x === "object" && Array.isArray(x.slots) && Array.isArray(x.timeline) && typeof x.ratio === "string";
}

function asTemplateMeta(tpl: any) {
  // AdvancedTemplate-like
  const emoji = tpl?.emoji ?? "✨";
  const color = tpl?.color ?? "from-amber-500 to-orange-500";
  const label = tpl?.label_fr ?? tpl?.name ?? "Template";
  const id = tpl?.id ?? "none";
  const voiceInstructions = Array.isArray(tpl?.voiceInstructions) ? tpl.voiceInstructions : [];
  const supportedDurations = Array.isArray(tpl?.supportedDurations) ? tpl.supportedDurations : [];
  const inputs = Array.isArray(tpl?.inputs) ? tpl.inputs : [];
  return { id, emoji, color, label, voiceInstructions, supportedDurations, inputs };
}

function pickSlotForCapture(manifest: TemplateManifest, capturedType: "video" | "photo" | "audio") {
  const need = capturedType === "photo" ? "photo" : capturedType; // slot types are "video"|"photo"|"audio"
  const required = manifest.slots.filter((s) => s.required);
  const candidates = required.length ? required : manifest.slots;

  const exact = candidates.find((s) => s.type === need);
  if (exact) return exact.id;

  // fallback: accept video into photo slot or vice versa if no exact match
  if (capturedType === "video") {
    const alt = candidates.find((s) => s.type === "video") || candidates.find((s) => s.type === "photo");
    return alt?.id;
  }
  if (capturedType === "photo") {
    const alt = candidates.find((s) => s.type === "photo") || candidates.find((s) => s.type === "video");
    return alt?.id;
  }
  return candidates[0]?.id;
}

export default function FullscreenCreator({
  open = false,
  onClose,
  onPublish,
}: FullscreenCreatorProps) {
  const navigate = useNavigate();
  
  // ============= UNIFIED STATE =============
  const [hasCapture, setHasCapture] = useState(false);
  const [showPublish, setShowPublish] = useState(false);

  const [topTab, setTopTab] = useState<TopTab>("30s");
  const [mode, setMode] = useState<CaptureMode>("video");
  const [canvasRatio, setCanvasRatio] = useState<CanvasRatio>("9:16");
  const [drawer, setDrawer] = useState<DrawerType>("none");

  // Camera
  const [facing, setFacing] = useState<"user" | "environment">("environment");
  const [flashSim, setFlashSim] = useState(false);
  const [timerSec, setTimerSec] = useState<0 | 3 | 10>(0);
  const [speed, setSpeed] = useState<0.5 | 1 | 2>(1);
  const [lengthSec, setLengthSec] = useState<15 | 30 | 60 | 180 | 600>(30);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingElapsed, setRecordingElapsed] = useState(0);

  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // ============= EFFECTS STATE =============
  const [effects, setEffects] = useState<CaptureEffects>({ ...DEFAULT_EFFECTS });
  const updateEffects = useCallback((updates: Partial<CaptureEffects>) => {
    setEffects((prev) => ({ ...prev, ...updates }));
  }, []);

  const selectedTemplate = useMemo(() => getTemplateById(effects.templateId), [effects.templateId]);

  // Filter (live camera)
  const filter = useMemo<VideoFilter | undefined>(
    () => VIDEO_FILTERS.find((f) => f.id === effects.filterId) ?? VIDEO_FILTERS[0],
    [effects.filterId]
  );

  const cssFilter = useMemo(() => {
    const base = filter?.cssFilter ?? "none";
    let result = scaleCssFilter(base, effects.filterIntensity);

    effects.arEffects.forEach((arId) => {
      const ar = AR_EFFECTS.find((e) => e.id === arId);
      if (ar?.type === "face" && ar.cssFilter) {
        result = result === "none" ? ar.cssFilter : `${result} ${ar.cssFilter}`;
      }
    });

    return result;
  }, [filter?.cssFilter, effects.filterIntensity, effects.arEffects]);

  // Music
  const [musicTrack, setMusicTrack] = useState<string | null>(null);

  // Sticker picker
  const [showStickerPicker, setShowStickerPicker] = useState(false);

  // Graphics styles
  const graphicsStyles = useMemo(
    () => getGraphicsStyles(effects.frameId, effects.borderId, effects.overlayId, effects.backgroundId),
    [effects.frameId, effects.borderId, effects.overlayId, effects.backgroundId]
  );

  const graphicsClasses = useMemo(
    () => getGraphicsClasses(effects.frameId, effects.borderId, effects.overlayId, effects.backgroundId),
    [effects.frameId, effects.borderId, effects.overlayId, effects.backgroundId]
  );

  // Stream/recorder refs
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const liveCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewVideoRef = useRef<HTMLVideoElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const gestureRef = useRef<{ x0: number; y0: number; active: boolean } | null>(null);
  const albumInputRef = useRef<HTMLInputElement | null>(null);

  // Burst
  const burstIntervalRef = useRef<number | null>(null);
  const [burstPhotos, setBurstPhotos] = useState<Blob[]>([]);
  const [burstCount, setBurstCount] = useState(0);

  // ============= CAPTURED MEDIA STATE =============
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [capturedType, setCapturedType] = useState<"video" | "photo" | "audio">("video");
  const [previewUrl, setPreviewUrl] = useState<string>("");

  // ============= TIMELINE/EDITING STATE =============
  const [segments, setSegments] = useState<MiniTimelineSegment[]>([]);
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);

  // Video element play state (non K-Engine path)
  const [isPlaying, setIsPlaying] = useState(false);

  // Undo/Redo
  const [undoStack, setUndoStack] = useState<MiniTimelineSegment[][]>([]);
  const [redoStack, setRedoStack] = useState<MiniTimelineSegment[][]>([]);

  // ============= TEMPLATE (Legacy + K-Engine) =============
  const [activeTemplateAny, setActiveTemplateAny] = useState<AdvancedTemplate | TemplateManifest | null>(null);

  const activeMeta = useMemo(() => asTemplateMeta(activeTemplateAny), [activeTemplateAny]);

  // K-Engine state mirror
  const [kState, setKState] = useState<EngineState>(() => kEngine.getState());
  const kTickerRef = useRef<number | null>(null);

  const isKEngineActive = useMemo(() => {
    // active when a TemplateManifest is selected and loaded
    return !!kState.loaded && !!kState.template;
  }, [kState.loaded, kState.template]);

  // Processing overlay state (reuse same UI)
  const [isProcessingTemplate, setIsProcessingTemplate] = useState(false);
  const [processingProgress, setProcessingProgress] = useState<{
    percent: number;
    message_fr: string;
    message_ba?: string;
  } | null>(null);

  // ============= KUAISHOU FLOW STATE =============
  type KuaishouPhase = 'idle' | 'slot_picker' | 'recognizing' | 'overrides' | 'publish';
  const [kuaishouPhase, setKuaishouPhase] = useState<KuaishouPhase>('idle');
  const [boundAssets, setBoundAssets] = useState<Record<string, BoundAsset>>({});
  const [activeKSEManifest, setActiveKSEManifest] = useState<TemplateManifest | null>(null);

  // ============= TEXT OVERLAYS & EXPORT =============
  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);
  const [showTextEditor, setShowTextEditor] = useState(false);
  const [editingTextOverlay, setEditingTextOverlay] = useState<TextOverlay | undefined>(undefined);
  const [showExportScreen, setShowExportScreen] = useState(false);

  // ✅ Device Performance Detection
  const { performanceInfo, isDetecting: isDetectingPerformance } = useDevicePerformance();
  const kEngineQuality = useMemo(
    () => performanceInfo ? getKEngineQualitySettings(performanceInfo.tier) : getKEngineQualitySettings('medium'),
    [performanceInfo]
  );

  // Publish
  const [caption, setCaption] = useState("");

  // Total duration
  const totalDuration = useMemo(
    () => segments.reduce((sum, seg) => sum + (seg.endTime - seg.startTime), 0),
    [segments]
  );

  // Clean toast
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 1500);
    return () => window.clearTimeout(t);
  }, [toast]);

  // Auto-apply simple template settings
  useEffect(() => {
    if (selectedTemplate && selectedTemplate.id !== "free") {
      setLengthSec(selectedTemplate.suggestedDuration as 15 | 30 | 60 | 180 | 600);
      setMode(selectedTemplate.suggestedMode as CaptureMode);
      setCanvasRatio(selectedTemplate.suggestedRatio);
      if (selectedTemplate.autoFilter) updateEffects({ filterId: selectedTemplate.autoFilter });
    }
  }, [selectedTemplate, updateEffects]);

  // Track recording elapsed
  useEffect(() => {
    if (!isRecording) {
      setRecordingElapsed(0);
      return;
    }
    const startedAt = Date.now();
    const t = window.setInterval(() => {
      setRecordingElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 200);
    return () => window.clearInterval(t);
  }, [isRecording]);

  // -------- K-Engine subscribe lifecycle --------
  useEffect(() => {
    const unsub = kEngine.subscribe((evt, st) => {
      setKState(st);
      if (evt.type === "TIME_UPDATE") {
        setCurrentTime(st.currentTime);
      }
    });
    return () => unsub();
  }, []);

  // -------- K-Engine ticker when playing --------
  useEffect(() => {
    if (!isKEngineActive) return;
    if (!kState.isPlaying) {
      if (kTickerRef.current) cancelAnimationFrame(kTickerRef.current);
      kTickerRef.current = null;
      return;
    }

    let last = performance.now();

    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      const tplDur = kState.template?.duration ?? 0;
      const next = clamp((kEngine.getState().currentTime ?? 0) + dt, 0, tplDur);
      kEngine.setTime(next);
      // loop if needed
      if (tplDur > 0 && next >= tplDur) {
        kEngine.setTime(0);
      }
      kTickerRef.current = requestAnimationFrame(tick);
    };

    kTickerRef.current = requestAnimationFrame(tick);
    return () => {
      if (kTickerRef.current) cancelAnimationFrame(kTickerRef.current);
      kTickerRef.current = null;
    };
  }, [isKEngineActive, kState.isPlaying, kState.template?.duration]);

  // -------- Camera bootstrap --------
  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const startStream = useCallback(async () => {
    setError(null);
    stopStream();
    try {
      const constraints: MediaStreamConstraints = {
        video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: mode === "video",
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        const video = videoRef.current;

        await new Promise<void>((resolve) => {
          const onLoaded = () => {
            video.removeEventListener("loadedmetadata", onLoaded);
            video.play().then(resolve).catch(() => resolve());
          };
          video.addEventListener("loadedmetadata", onLoaded);
          video.srcObject = stream;
        });
      }
    } catch (e: any) {
      setError(e?.message || "Impossible d'accéder à la caméra.");
    }
  }, [facing, mode, stopStream]);

  // Camera startup only when open and not in edit mode and not text
  useEffect(() => {
    if (!open) return;
    if (mode === "text") {
      stopStream();
      return;
    }
    if (!hasCapture) startStream();
    return () => {
      if (!hasCapture) stopStream();
    };
  }, [open, hasCapture, facing, mode, startStream, stopStream]);

  // Global cleanup on unmount
  useEffect(() => {
    return () => {
      // Stop recording
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        try {
          recorderRef.current.stop();
        } catch {}
      }
      recorderRef.current = null;

      // Stop stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }

      // Stop burst
      if (burstIntervalRef.current) {
        window.clearInterval(burstIntervalRef.current);
        burstIntervalRef.current = null;
      }

      // Clear K-Engine
      try {
        kEngine.clearTemplate();
      } catch {}
    };
  }, []);

  // Additional cleanup when open becomes false
  useEffect(() => {
    if (!open) {
      stopStream();
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        try {
          recorderRef.current.stop();
        } catch {}
      }
      setIsRecording(false);
      // also stop K-Engine playback
      if (kEngine.getState().loaded) kEngine.pause();
    }
  }, [open, stopStream]);

  // Cleanup URLs
  useEffect(() => {
    if (!capturedBlob) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const url = URL.createObjectURL(capturedBlob);
    setPreviewUrl(url);
    return () => {
      try {
        URL.revokeObjectURL(url);
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capturedBlob]);

  // Preview error state (video decoder path)
  const [previewError, setPreviewError] = useState(false);
  const [previewReady, setPreviewReady] = useState(false);

  // Robust video preview initialization (ONLY when NOT in K-Engine mode)
  useEffect(() => {
    if (isKEngineActive) return;

    const video = previewVideoRef.current;
    if (!video || !hasCapture || !previewUrl || capturedType !== "video") {
      setPreviewError(false);
      setPreviewReady(false);
      return;
    }

    let mounted = true;
    let retryCount = 0;
    const maxRetries = 3;
    setPreviewError(false);
    setPreviewReady(false);

    const initVideo = async () => {
      try {
        video.pause();
        video.muted = true;
        video.playsInline = true;
        video.preload = "auto";
        video.autoplay = false;

        video.src = previewUrl;

        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => resolve(), 8000);

          const onCanPlay = () => {
            clearTimeout(timeout);
            cleanup();
            resolve();
          };
          const onLoadedData = () => {
            clearTimeout(timeout);
            cleanup();
            resolve();
          };
          const onError = (e: Event) => {
            clearTimeout(timeout);
            cleanup();
            const videoEl = e.target as HTMLVideoElement;
            reject(new Error(videoEl?.error?.message || "Video load failed"));
          };

          const cleanup = () => {
            video.removeEventListener("canplaythrough", onCanPlay);
            video.removeEventListener("loadeddata", onLoadedData);
            video.removeEventListener("error", onError);
          };

          video.addEventListener("canplaythrough", onCanPlay);
          video.addEventListener("loadeddata", onLoadedData);
          video.addEventListener("error", onError);
          video.load();
        });

        if (!mounted) return;

        if (video.videoWidth === 0 || video.videoHeight === 0) {
          throw new Error("Video has no dimensions");
        }

        const duration = video.duration;

        // Fix Infinity duration
        if (!isFinite(duration) || duration <= 0) {
          if (video.seekable.length > 0) {
            const seekableEnd = video.seekable.end(0);
            if (Number.isFinite(seekableEnd) && seekableEnd > 0.2) {
              try {
                video.currentTime = Math.max(0.1, seekableEnd - 0.1);
                await new Promise((r) => setTimeout(r, 50));
              } catch {}
            }
          }
          try {
            video.muted = true;
            const p = video.play();
            if (p) await p;
            await new Promise((r) => setTimeout(r, 80));
            video.pause();
          } catch {}
          try {
            video.currentTime = 0.001;
          } catch {}
        } else {
          try {
            video.currentTime = 0.001;
          } catch {}
        }

        video.pause();
        if (mounted) setPreviewReady(true);
      } catch (err) {
        if (mounted && retryCount < maxRetries) {
          retryCount++;
          await new Promise((r) => setTimeout(r, 500));
          return initVideo();
        } else if (mounted) {
          setPreviewError(true);
        }
      }
    };

    const timer = setTimeout(initVideo, 100);

    const handlePlay = () => mounted && setIsPlaying(true);
    const handlePause = () => mounted && setIsPlaying(false);
    const handleEnded = () => mounted && setIsPlaying(false);
    const handleTimeUpdate = () => mounted && setCurrentTime(video.currentTime);

    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("ended", handleEnded);
    video.addEventListener("timeupdate", handleTimeUpdate);

    return () => {
      mounted = false;
      clearTimeout(timer);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("ended", handleEnded);
      video.removeEventListener("timeupdate", handleTimeUpdate);
    };
  }, [hasCapture, previewUrl, capturedType, isKEngineActive]);

  // Canvas draw loop:
  // - if K-Engine active: render engine frame
  // - if legacy template active: LiveTemplateEffect handles ALL rendering (skip this loop)
  // - else: draw decoded video frame with cssFilter (for black-screen compositor bug)
  const legacyTemplateActive = !!activeTemplateAny && !isTemplateManifest(activeTemplateAny) && activeMeta.id !== "none";
  
  // ✅ BLOCK A: K-Engine LIVE preview on camera (before capture)
  // ✅ HYBRID HIGH-QUALITY MODE: Video native visible + canvas overlay for effects only
  // ✅ ADAPTIVE QUALITY: Uses device performance tier for optimal rendering
  useEffect(() => {
    if (hasCapture) return; // Only for live mode
    if (!isKEngineActive || !kState.template) return;
    if (legacyTemplateActive) return;

    const canvas = liveCanvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    // ✅ Auto-bind live video to K-Engine slot
    const tpl = kState.template;
    const primarySlot = tpl.slots.find((s) => s.type === "video" && s.required) 
      || tpl.slots.find((s) => s.type === "video") 
      || tpl.slots[0];
    
    if (primarySlot) {
      console.log('[FullscreenCreator] Binding live stream to K-Engine slot:', primarySlot.id);
      kEngine.bindLiveStream(primarySlot.id, video);
    }

    let raf: number | null = null;
    let time = 0;
    let lastTime = performance.now();
    let frameCount = 0;

    // ✅ ADAPTIVE FPS: Skip frames based on device performance
    const targetFps = kEngineQuality.targetFps;
    const frameInterval = 1000 / targetFps;

    const draw = (now: number) => {
      try {
        const dt = (now - lastTime);
        
        // ✅ FPS limiting for low-end devices
        if (dt < frameInterval) {
          raf = requestAnimationFrame(draw);
          return;
        }
        
        lastTime = now;
        frameCount++;

        // ✅ ADAPTIVE RESOLUTION: Scale based on device tier
        const videoW = video.videoWidth || 1080;
        const videoH = video.videoHeight || 1920;
        const qualityScale = kEngineQuality.canvasScale;
        const maxDim = Math.round(1080 * qualityScale);
        const scale = Math.min(1, maxDim / Math.max(videoW, videoH));
        const cw = Math.round(videoW * scale);
        const ch = Math.round(videoH * scale);
        
        if (canvas.width !== cw || canvas.height !== ch) {
          canvas.width = cw;
          canvas.height = ch;
          console.log(`[K-Engine] Canvas sized to ${cw}x${ch} (${performanceInfo?.tier || 'medium'} tier, ${targetFps}fps)`);
        }

        time += dt / 1000;
        const tplDur = kState.template?.duration || 15;
        if (time > tplDur) time = 0;

        // ✅ HYBRID MODE: Render ONLY effects overlay (video is visible natively underneath)
        kEngine.renderEffectsOverlay(canvas, time);
      } catch (err) {
        // Silent fail to keep loop alive
      }
      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    
    return () => {
      if (raf) cancelAnimationFrame(raf);
      if (primarySlot) {
        kEngine.unbindLiveStream(primarySlot.id);
      }
    };
  }, [hasCapture, isKEngineActive, kState.template, legacyTemplateActive, kEngineQuality, performanceInfo?.tier]);

  // ✅ Helper: Rendu hybride vidéo NATIVE HD + effets K-Engine overlay
  const renderVideoWithKEngineOverlay = useCallback((
    canvas: HTMLCanvasElement,
    video: HTMLVideoElement,
    template: TemplateManifest
  ) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // ✅ NATIVE HD RESOLUTION: Use video's native dimensions (not CSS/DPR scaled)
    const nativeW = video.videoWidth || 1080;
    const nativeH = video.videoHeight || 1920;
    
    // Cap at 1080p for performance, but preserve aspect ratio
    const maxDim = 1080;
    const scale = Math.min(1, maxDim / Math.max(nativeW, nativeH));
    const w = Math.round(nativeW * scale);
    const h = Math.round(nativeH * scale);

    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      console.log(`[K-Engine Preview] Canvas sized to native resolution: ${w}x${h}`);
    }

    ctx.clearRect(0, 0, w, h);

    // 1. Dessiner la vidéo à sa résolution native (pas de scaling CSS)
    ctx.drawImage(video, 0, 0, nativeW, nativeH, 0, 0, w, h);

    // 2. Appliquer effets K-Engine (color grading, vignette, badge)
    const categoryColors: Record<string, string> = {
      'transition': 'rgba(168,85,247,0.12)',
      'storytelling': 'rgba(245,158,11,0.1)',
      'cultural': 'rgba(139,92,246,0.15)',
      'default': 'rgba(100,100,100,0.08)'
    };
    const overlayColor = categoryColors[template.category] || categoryColors.default;
    ctx.fillStyle = overlayColor;
    ctx.fillRect(0, 0, w, h);

    // Vignette
    const vignette = ctx.createRadialGradient(w/2, h/2, h*0.25, w/2, h/2, h*0.85);
    vignette.addColorStop(0, 'transparent');
    vignette.addColorStop(1, 'rgba(0,0,0,0.4)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);

    // Badge template
    const badgeY = h - 60;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    roundRect(ctx, 12, badgeY, 180, 44, 8);
    ctx.fill();
    ctx.fillStyle = 'white';
    ctx.font = 'bold 14px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText(`🎬 ${template.name}`, 24, badgeY + 26);
  }, []);

  // Preview canvas draw loop (after capture)
  useEffect(() => {
    if (!hasCapture || previewError) return;
    
    // When legacy template is active, LiveTemplateEffect handles canvas rendering
    // Skip this draw loop to avoid conflicts
    if (legacyTemplateActive) return;

    const canvas = previewCanvasRef.current;
    if (!canvas) return;

    let raf: number | null = null;

    const draw = () => {
      try {
        if (isKEngineActive && kState.template) {
          // ✅ CORRECTION: Si pas d'assets bindés mais on a un capturedBlob,
          // dessiner la vidéo preview + overlay K-Engine
          const hasUserAssets = Object.keys(kState.userAssets).length > 0;
          
          if (hasUserAssets) {
            kEngine.renderFrameToCanvas(canvas, kEngine.getState().currentTime || 0);
          } else if (previewVideoRef.current && previewVideoRef.current.readyState >= 2) {
            // Fallback: dessiner la vidéo + appliquer effets K-Engine en overlay
            renderVideoWithKEngineOverlay(canvas, previewVideoRef.current, kState.template);
          } else {
            // Dernier fallback: essayer de rendre quand même
            kEngine.renderFrameToCanvas(canvas, kEngine.getState().currentTime || 0);
          }
        } else if (capturedType === "video") {
          const video = previewVideoRef.current;
          if (video && video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
            const rect = canvas.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            const cw = Math.max(1, Math.floor(rect.width * dpr));
            const ch = Math.max(1, Math.floor(rect.height * dpr));
            if (canvas.width !== cw || canvas.height !== ch) {
              canvas.width = cw;
              canvas.height = ch;
            }

            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.setTransform(1, 0, 0, 1, 0, 0);
              ctx.clearRect(0, 0, cw, ch);

              // Apply CSS filter from effects
              ctx.filter = cssFilter && cssFilter !== "none" ? cssFilter : "none";

              const vw = video.videoWidth;
              const vh = video.videoHeight;
              const scale = Math.min(cw / vw, ch / vh);
              const dw = vw * scale;
              const dh = vh * scale;
              const dx = (cw - dw) / 2;
              const dy = (ch - dh) / 2;

              ctx.drawImage(video, 0, 0, vw, vh, dx, dy, dw, dh);
              ctx.filter = "none";
            }
          }
        }
      } catch (err) {
        // ✅ Log K-Engine errors for debugging (especially roundRect issues on mobile)
        if (import.meta.env.DEV) console.warn('[K-Engine Draw]', err);
      }
      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => {
      if (raf) cancelAnimationFrame(raf);
    };
  }, [hasCapture, capturedType, previewError, cssFilter, isKEngineActive, kState.template, kState.userAssets, legacyTemplateActive, renderVideoWithKEngineOverlay]);

  // ============= HANDLERS =============
  const togglePlayPause = useCallback(() => {
    if (isKEngineActive) {
      const st = kEngine.getState();
      if (st.isPlaying) kEngine.pause();
      else kEngine.play();
      return;
    }

    const video = previewVideoRef.current;
    if (!video || capturedType !== "video") return;

    if (!video.paused) {
      video.pause();
    } else {
      video.muted = false;
      video
        .play()
        .catch(() => {
          video.muted = true;
          video.play().catch(() => {});
        });
    }
  }, [capturedType, isKEngineActive]);

  // ✅ Track if capture needs K-Engine post-processing (for native quality capture)
  const [captureNeedsKEngine, setCaptureNeedsKEngine] = useState(false);

  // Recording - ✅ NATIVE HD QUALITY: Always capture from native stream, effects applied at export
  const startRecording = async () => {
    setError(null);
    if (!streamRef.current) await startStream();
    if (!streamRef.current) return;
    if (!isMediaRecorderSupported()) {
      setError("Enregistrement vidéo non supporté sur cet appareil.");
      return;
    }
    const mimeType = pickMimeType();
    if (!mimeType) {
      setError("Format vidéo non supporté sur cet appareil.");
      return;
    }

    try {
      chunksRef.current = [];

      // ✅ NATIVE QUALITY: Always capture the native HD stream
      // K-Engine effects will be applied during export (not baked-in at capture)
      let recordStream = streamRef.current;
      
      // Track if we need K-Engine post-processing
      const needsKEnginePostProcess = isKEngineActive && kState.template;
      setCaptureNeedsKEngine(!!needsKEnginePostProcess);
      
      if (needsKEnginePostProcess) {
        console.log('[FullscreenCreator] Recording NATIVE HD stream (effects applied at export)');
      }
      
      // Legacy templates: still bake effects (backward compatibility)
      const legacyActive = !!activeTemplateAny && !isTemplateManifest(activeTemplateAny) && activeMeta.id !== "none";
      if (legacyActive && liveCanvasRef.current) {
        try {
          const canvasStream = liveCanvasRef.current.captureStream(30);
          const audioTracks = streamRef.current.getAudioTracks();
          audioTracks.forEach((track) => canvasStream.addTrack(track));
          recordStream = canvasStream;
          console.log('[FullscreenCreator] Recording from legacy template canvas (baked-in effects)');
        } catch {}
      }

      const rec = new MediaRecorder(recordStream, { mimeType });
      recorderRef.current = rec;

      rec.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data);
      };

      rec.start(200);
      setIsRecording(true);
      setToast("● REC");
    } catch (e: any) {
      setError(e?.message || "Impossible de démarrer l'enregistrement.");
    }
  };

  const stopRecordingToBlob = async (): Promise<Blob> => {
    const rec = recorderRef.current;
    if (!rec) throw new Error("Recorder not initialized");
    if (rec.state === "inactive") throw new Error("Recorder already stopped");

    try {
      if (typeof (rec as any).requestData === "function") {
        (rec as any).requestData();
        await new Promise((r) => setTimeout(r, 100));
      }
    } catch {}

    const blob: Blob = await new Promise((resolve, reject) => {
      rec.onstop = () => {
        try {
          const type = rec.mimeType || "video/webm";
          const b = new Blob(chunksRef.current, { type });
          if (!b.size) reject(new Error("Empty recording"));
          else resolve(b);
        } catch (e) {
          reject(e);
        }
      };
      try {
        rec.stop();
      } catch (e) {
        reject(e);
      }
    });

    recorderRef.current = null;
    chunksRef.current = [];
    setIsRecording(false);
    return blob;
  };

  // ============= CAPTURE ACTIONS =============
  const runTimerIfNeeded = async () => {
    if (timerSec === 0) return;
    setToast(`${timerSec}s…`);
    await new Promise((r) => setTimeout(r, timerSec * 1000));
    setToast(null);
  };

  // Create/replace K-Engine binding after capture (best-effort auto bind)
  const bindCaptureToKEngine = useCallback(
    async (blob: Blob, type: "video" | "photo" | "audio") => {
      const tpl = kEngine.getState().template;
      if (!tpl) return;

      const slotId = pickSlotForCapture(tpl, type);
      if (!slotId) return;

      const asset: BoundAsset = {
        slotId,
        kind: "recording",
        blob,
        mime: blob.type || (type === "photo" ? "image/jpeg" : type === "audio" ? "audio/*" : "video/*"),
      };

      try {
        // Bind + run pipeline
        setIsProcessingTemplate(true);
        setProcessingProgress({ percent: 10, message_fr: "Analyse du média…" });

        await kEngine.bindUserMedia(slotId, asset);

        setProcessingProgress({ percent: 30, message_fr: "Préparation IA…" });

        await kEngine.runAIPipeline((p, step) => {
          setProcessingProgress({
            percent: clamp(30 + Math.round((p / 100) * 60), 0, 95),
            message_fr: step ? `IA: ${step}` : "IA en cours…",
          });
        });

        setProcessingProgress({ percent: 100, message_fr: "Prêt ✓" });
        setTimeout(() => {
          setIsProcessingTemplate(false);
          setProcessingProgress(null);
        }, 450);

        // Reset time for preview
        kEngine.setTime(0);
      } catch (e: any) {
        setIsProcessingTemplate(false);
        setProcessingProgress(null);
        setError(e?.message || "Échec pipeline IA");
      }
    },
    []
  );

  const finishCapture = useCallback(
    async (blob: Blob, type: "video" | "photo" | "audio", duration: number) => {
      stopStream();

      setCapturedBlob(blob);
      setCapturedType(type);

      // Create initial segment WITH blob for upload
      const seg: MiniTimelineSegment = {
        id: `${Date.now()}`,
        type: type === "video" ? "video" : "photo",
        duration,
        startTime: 0,
        endTime: duration,
        isMuted: false,
        volume: 100,
        blob,
      };

      setSegments([seg]);
      setActiveSegmentId(seg.id);
      setHasCapture(true);
      setDrawer("none");

      // ✅ CORRECTION: Si K-Engine actif, binder IMMÉDIATEMENT et forcer phase idle
      // pour afficher le preview avec effets (pas slot_picker)
      if (isKEngineActive && kState.template) {
        await bindCaptureToKEngine(blob, type);
        // Forcer phase idle pour afficher le preview avec effets
        setKuaishouPhase('idle');
      }
    },
    [bindCaptureToKEngine, isKEngineActive, kState.template, stopStream]
  );

  const onPressCapture = async () => {
    setError(null);

    if (mode === "text") {
      try {
        await runTimerIfNeeded();
        stopStream();
        const b = await renderTextToImage(caption || "Texte", canvasRatio, effects);
        await finishCapture(b, "photo", 5);
        return;
      } catch (e: any) {
        setError(e?.message || "Erreur texte");
        return;
      }
    }

    if (mode === "photo") {
      try {
        await runTimerIfNeeded();
        if (!videoRef.current) throw new Error("Preview not ready");
        
        // ✅ BLOCK B: If K-Engine active with live preview, capture from liveCanvasRef
        if (isKEngineActive && liveCanvasRef.current) {
          const canvas = liveCanvasRef.current;
          const b: Blob = await new Promise((resolve, reject) => {
            canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Canvas capture failed"))), "image/jpeg", 0.92);
          });
          await finishCapture(b, "photo", 5);
          return;
        }
        
        // ✅ If legacy template active, capture from liveCanvasRef
        const legacyActive = !!activeTemplateAny && !isTemplateManifest(activeTemplateAny) && activeMeta.id !== "none";
        if (legacyActive && liveCanvasRef.current) {
          const canvas = liveCanvasRef.current;
          const b: Blob = await new Promise((resolve, reject) => {
            canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Canvas capture failed"))), "image/jpeg", 0.92);
          });
          await finishCapture(b, "photo", 5);
          return;
        }
        
        const b = await capturePhotoFromVideo(videoRef.current, canvasRatio, effects);
        await finishCapture(b, "photo", 5);
        return;
      } catch (e: any) {
        setError(e?.message || "Erreur photo");
        return;
      }
    }

    if (mode === "burst") {
      if (burstIntervalRef.current) {
        window.clearInterval(burstIntervalRef.current);
        burstIntervalRef.current = null;
        setIsRecording(false);
        if (burstPhotos.length > 0) {
          await finishCapture(burstPhotos[burstPhotos.length - 1], "photo", 5);
        }
        setBurstPhotos([]);
        setBurstCount(0);
        return;
      } else {
        await runTimerIfNeeded();
        if (!videoRef.current) throw new Error("Preview not ready");
        setIsRecording(true);
        setBurstPhotos([]);
        setBurstCount(0);
        setToast("● BURST");

        const captureOne = async () => {
          if (!videoRef.current) return;
          try {
            const b = await capturePhotoFromVideo(videoRef.current, canvasRatio, effects);
            setBurstPhotos((prev) => [...prev, b]);
            setBurstCount((prev) => prev + 1);
          } catch {}
        };

        captureOne();
        burstIntervalRef.current = window.setInterval(captureOne, 300);
        return;
      }
    }

    if (mode === "video") {
      try {
        if (!isRecording) {
          await runTimerIfNeeded();
          await startRecording();
        } else {
          const b = await stopRecordingToBlob();
          stopStream();
          await finishCapture(b, "video", lengthSec);
        }
      } catch (e: any) {
        setError(e?.message || "Erreur vidéo");
        setIsRecording(false);
      }
    }
  };

  const retake = () => {
    // Reset K-Engine if active
    if (isKEngineActive) {
      try {
        kEngine.pause();
        kEngine.setTime(0);
        // keep template loaded, but clear bound assets for a clean retake
        // simplest: reload same template instance
        const tpl = kEngine.getState().template;
        if (tpl) kEngine.loadTemplate(tpl);
      } catch {}
    }

    setCapturedBlob(null);
    setCapturedType("video");
    setPreviewUrl("");
    setSegments([]);
    setActiveSegmentId(null);
    setCurrentTime(0);
    setUndoStack([]);
    setRedoStack([]);
    setHasCapture(false);
    setDrawer("none");
    startStream();
  };

  // ============= EDITING ACTIONS =============
  const saveForUndo = () => {
    setUndoStack((prev) => [...prev.slice(-19), segments]);
    setRedoStack([]);
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setRedoStack((r) => [...r, segments]);
    setSegments(prev);
    setUndoStack((u) => u.slice(0, -1));
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack((u) => [...u, segments]);
    setSegments(next);
    setRedoStack((r) => r.slice(0, -1));
  };

  const handleSplit = (segmentId: string, time: number) => {
    saveForUndo();
    const seg = segments.find((s) => s.id === segmentId);
    if (!seg || time <= seg.startTime || time >= seg.endTime) return;

    const seg1: MiniTimelineSegment = { ...seg, endTime: time, duration: time - seg.startTime };
    const seg2: MiniTimelineSegment = {
      ...seg,
      id: `${Date.now()}`,
      startTime: time,
      duration: seg.endTime - time,
    };

    setSegments((prev) => {
      const idx = prev.findIndex((s) => s.id === segmentId);
      const newSegs = [...prev];
      newSegs.splice(idx, 1, seg1, seg2);
      return newSegs;
    });
    setToast("Coupé ✂️");
  };

  const handleTrim = (segmentId: string, start: number, end: number) => {
    saveForUndo();
    setSegments((prev) =>
      prev.map((s) => (s.id === segmentId ? { ...s, startTime: start, endTime: end, duration: end - start } : s))
    );
  };

  const handleVolumeChange = (segmentId: string, volume: number) => {
    saveForUndo();
    setSegments((prev) => prev.map((s) => (s.id === segmentId ? { ...s, volume } : s)));
  };

  const handleToggleMute = (segmentId: string) => {
    saveForUndo();
    setSegments((prev) => prev.map((s) => (s.id === segmentId ? { ...s, isMuted: !s.isMuted } : s)));
  };

  const handleDelete = (segmentId: string) => {
    if (segments.length <= 1) return;
    saveForUndo();
    setSegments((prev) => prev.filter((s) => s.id !== segmentId));
    setActiveSegmentId(segments[0]?.id || null);
  };

  const handleDuplicate = (segmentId: string) => {
    saveForUndo();
    const seg = segments.find((s) => s.id === segmentId);
    if (!seg) return;
    const newSeg: MiniTimelineSegment = { ...seg, id: `${Date.now()}` };
    setSegments((prev) => [...prev, newSeg]);
    setToast("Dupliqué 📋");
  };

  const handleSeek = (time: number) => {
    setCurrentTime(time);
    if (isKEngineActive) {
      kEngine.setTime(time);
      return;
    }
    if (previewVideoRef.current && capturedType === "video") {
      previewVideoRef.current.currentTime = time;
    }
  };

  // ============= GESTURES =============
  const onSurfaceDown = (e: React.PointerEvent) => {
    gestureRef.current = { x0: e.clientX, y0: e.clientY, active: true };
  };

  const onSurfaceMove = (e: React.PointerEvent) => {
    if (!gestureRef.current?.active) return;
    const dx = e.clientX - gestureRef.current.x0;
    const dy = e.clientY - gestureRef.current.y0;
    if (!hasCapture && Math.abs(dy) < 60 && Math.abs(dx) > 90) {
      gestureRef.current.active = false;
      const idx = VIDEO_FILTERS.findIndex((f) => f.id === effects.filterId);
      const dir = dx < 0 ? 1 : -1;
      const next = clamp(idx + dir, 0, VIDEO_FILTERS.length - 1);
      updateEffects({ filterId: VIDEO_FILTERS[next].id });
      setToast(VIDEO_FILTERS[next].name);
    }
  };

  const onSurfaceUp = () => {
    if (gestureRef.current) gestureRef.current.active = false;
  };

  // ============= STICKER MANAGEMENT =============
  const addSticker = (sticker: Omit<StickerType, "id">) => {
    const newSticker: StickerType = {
      ...sticker,
      id: `sticker-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
    updateEffects({ stickers: [...effects.stickers, newSticker] });
  };

  const toggleAREffect = (id: string) => {
    const current = effects.arEffects;
    const newEffects = current.includes(id) ? current.filter((e) => e !== id) : [...current, id];
    updateEffects({ arEffects: newEffects });
  };

  // Album handler
  const handleAlbumSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith("video/");
    stopStream();
    await finishCapture(file as Blob, isVideo ? "video" : "photo", isVideo ? lengthSec : 5);

    if (albumInputRef.current) albumInputRef.current.value = "";
  };

  const activeSegment = segments.find((s) => s.id === activeSegmentId);

  // ============= PUBLISH =============
  const publish = async () => {
    try {
      setError(null);
      if (!segments.length) throw new Error("Aucun contenu à publier.");

      const challenge = effects.challengeId ? CHALLENGES.find((c) => c.id === effects.challengeId) : null;
      const finalCaption = challenge ? `${caption} ${challenge.hashtag}`.trim() : caption;

      let finalSegments = [...segments];

      // ✅ BLOCK B: If K-Engine active, render the final output with template effects at NATIVE resolution
      if (isKEngineActive && segments[0]?.blob) {
        setIsProcessingTemplate(true);
        setProcessingProgress({ percent: 5, message_fr: "Préparation export HD..." });

        try {
          // ✅ NATIVE RESOLUTION: Extract resolution from captured video blob
          let nativeResolution = { width: 1080, height: 1920 };
          
          if (capturedType === "video" && segments[0].blob) {
            try {
              const tempVideo = document.createElement("video");
              tempVideo.muted = true;
              tempVideo.playsInline = true;
              tempVideo.src = URL.createObjectURL(segments[0].blob);
              
              await new Promise<void>((resolve) => {
                tempVideo.onloadedmetadata = () => resolve();
                setTimeout(resolve, 3000); // Timeout fallback
              });
              
              if (tempVideo.videoWidth > 0 && tempVideo.videoHeight > 0) {
                nativeResolution = {
                  width: tempVideo.videoWidth,
                  height: tempVideo.videoHeight
                };
                console.log(`[FullscreenCreator] Native resolution detected: ${nativeResolution.width}x${nativeResolution.height}`);
              }
              
              URL.revokeObjectURL(tempVideo.src);
            } catch (e) {
              console.warn("[FullscreenCreator] Failed to probe video resolution, using default:", e);
            }
          }

          const exportResult = await kEngine.exportJob(
            {
              inputBlob: segments[0].blob,
              inputType: capturedType === "photo" ? "photo" : "video",
              outputType: capturedType === "photo" ? "image" : "video",
              preferMp4: false,
              renderCanvas: previewCanvasRef.current || undefined,
              // ✅ NATIVE HD: Pass resolution and preserve quality flag
              nativeResolution,
              preserveQuality: true,
              exportQuality: "high", // Force high quality for native resolution
              meta: { caption: finalCaption, template: activeMeta.label },
            },
            (progress) => {
              setProcessingProgress({
                percent: clamp(progress.percent || 0, 0, 95),
                message_fr: progress.message || "Export HD en cours...",
              });
            }
          );

          if (exportResult.outputBlob && exportResult.outputBlob.size > 0 && exportResult.used !== "fallback") {
            // Replace segment blob with rendered output
            finalSegments = segments.map((seg, i) =>
              i === 0 ? { ...seg, blob: exportResult.outputBlob } : seg
            );
            setToast(`✨ Template HD appliqué (${exportResult.used})`);
          }
        } catch (e: any) {
          console.warn("[FullscreenCreator] K-Engine export failed, using original:", e);
          // Continue with original blob
        } finally {
          setIsProcessingTemplate(false);
          setProcessingProgress(null);
        }
      }

      // If legacy template active, capture from canvas
      const legacyActive = !!activeTemplateAny && !isTemplateManifest(activeTemplateAny) && activeMeta.id !== "none";
      if (legacyActive && capturedType === "photo" && previewCanvasRef.current) {
        try {
          const renderedBlob: Blob = await new Promise((resolve, reject) => {
            previewCanvasRef.current?.toBlob(
              (b) => (b ? resolve(b) : reject(new Error("Canvas capture failed"))),
              "image/jpeg",
              0.92
            );
          });
          if (renderedBlob.size > 0) {
            finalSegments = segments.map((seg, i) =>
              i === 0 ? { ...seg, blob: renderedBlob } : seg
            );
          }
        } catch {}
      }

      // Generate export job metadata for K-Engine templates
      const exportJob = isKEngineActive ? kEngine.exportJob() : undefined;
      const engineSnapshot = isKEngineActive ? kEngine.getState() : undefined;

      if (onPublish) {
        await onPublish({
          segments: finalSegments,
          caption: finalCaption,
          topTab,
          mode,
          canvasRatio,
          selectedFilterId: effects.filterId,
          effects,
          challengeHashtag: challenge?.hashtag,
          exportJob,
          engineState: engineSnapshot,
        });
      }

      setToast("Publié ✓");
      onClose?.();
    } catch (e: any) {
      setError(e?.message || "Erreur publication");
    }
  };

  // ============= KUAISHOU AI PIPELINE RUNNER =============
  const runKuaishouAIPipeline = useCallback(async () => {
    if (!activeKSEManifest) return;
    
    const steps = activeKSEManifest.pipeline || [];
    const totalWeight = steps.reduce((sum, s) => sum + ((s as any).weight || 0.1), 0);
    let progress = 0;

    for (const step of steps) {
      const stepAny = step as any;
      setProcessingProgress({ 
        percent: Math.round(progress), 
        message_fr: stepAny.label || step.op,
        message_ba: undefined
      });
      
      // Simulate AI processing (in production: real API calls)
      await new Promise(r => setTimeout(r, 300 + Math.random() * 500));
      
      progress += ((stepAny.weight || 0.1) / totalWeight) * 100;
    }

    setProcessingProgress({ percent: 100, message_fr: 'Terminé ✓' });
  }, [activeKSEManifest]);

  // ============= KUAISHOU OVERRIDE HANDLER =============
  const handleKuaishouOverride = useCallback((action: KSEOverride, data?: any) => {
    console.log('Override action:', action, data);
    // Handle override actions (music, text, subtitles, cover, change, stickers)
    switch (action) {
      case 'music':
        setDrawer('music');
        break;
      case 'text':
      case 'subtitles':
        setDrawer('captions');
        break;
      default:
        setToast(`${action} sélectionné`);
    }
  }, []);

  // ============= TEMPLATE selection handler (supports both AdvancedTemplate and TemplateManifest) =============
  const onSelectAnyTemplate = useCallback(
    async (tpl: any) => {
      setActiveTemplateAny(tpl);

      // Also update the simple overlay templateId so TemplateOverlay stays coherent
      if (tpl?.id) updateEffects({ templateId: tpl.id });

      // ✅ GOLDEN PATH: one_take_pro - load directly from manifest JSON
      const templateId = tpl?.id || tpl?.template_key;
      if (templateId === 'one_take_pro') {
        console.log('[FullscreenCreator] 🎯 GOLDEN PATH: one_take_pro detected');
        try {
          const resp = await fetch('/templates/manifests/one_take_pro.json');
          if (!resp.ok) throw new Error('Failed to fetch one_take_pro.json');
          const manifestJson = await resp.json();
          
          console.log('[FullscreenCreator] 📄 Manifest loaded:', manifestJson);
          
          // Load into K-Engine
          kEngine.loadTemplate(manifestJson as TemplateManifest);
          kEngine.setTime(0);
          kEngine.pause();
          
          // ✅ CRITICAL FIX: Set activeTemplateAny to the MANIFEST so isTemplateManifest() returns true
          // This prevents LiveTemplateEffect from conflicting with K-Engine rendering
          setActiveTemplateAny(manifestJson as TemplateManifest);
          setActiveKSEManifest(manifestJson as TemplateManifest);
          setCanvasRatio((manifestJson.ratio as CanvasRatio) || "9:16");
          setMode("video");
          
          // ✅ Bind live stream immediately if camera active
          if (!hasCapture && streamRef.current && videoRef.current) {
            const primarySlot = manifestJson.slots?.find((s: any) => s.type === "video" && s.required)
              || manifestJson.slots?.find((s: any) => s.type === "video")
              || manifestJson.slots?.[0];
            
            if (primarySlot) {
              console.log('[FullscreenCreator] 🔗 Binding live stream to slot:', primarySlot.id);
              kEngine.bindLiveStream(primarySlot.id, videoRef.current);
              setKuaishouPhase('idle');
              setDrawer("none");
              setToast(`📹 One-Take Pro - Effets live activés`);
              return;
            }
          }
          
          setDrawer("none");
          setToast(`📹 One-Take Pro activé`);
          return;
        } catch (e: any) {
          console.error('[FullscreenCreator] Failed to load one_take_pro:', e);
          setError('Erreur chargement template One-Take Pro');
        }
        return;
      }

      // ✅ Load AI visual data from database for enhanced display
      const templateKey = tpl?.id || tpl?.template_key;
      if (templateKey) {
        try {
          const { data: aiData } = await supabase
            .from('ai_generated_templates')
            .select('ai_preview_image_url, storyboard_frames, visual_generation_status, ai_enhanced_description')
            .eq('template_key', templateKey)
            .single();
          
          if (aiData?.visual_generation_status === 'completed') {
            console.log('[FullscreenCreator] AI visuals loaded for:', templateKey);
            setToast(`✨ Visuels IA chargés`);
          } else if (aiData?.visual_generation_status === 'generating') {
            setToast(`🎬 Génération des visuels en cours...`);
          }
        } catch (e) {
          // Not critical - continue with template selection
          console.log('[FullscreenCreator] No AI data for template:', templateKey);
        }
      }

      // If TemplateManifest => load into K-Engine
      if (isTemplateManifest(tpl)) {
        try {
          kEngine.loadTemplate(tpl);
          kEngine.setTime(0);
          kEngine.pause();
        } catch (e: any) {
          setError(e?.message || "Impossible de charger le template K-Engine");
        }

        // Store manifest for Kuaishou flow
        setActiveKSEManifest(tpl);

        // best-effort: align ratio + duration
        setCanvasRatio((tpl.ratio as CanvasRatio) || "9:16");
        const dur = typeof tpl.duration === "number" ? tpl.duration : 30;
        if (dur <= 15) setLengthSec(15);
        else if (dur <= 30) setLengthSec(30);
        else if (dur <= 60) setLengthSec(60);
        else setLengthSec(180);

        // pick a reasonable mode based on slots
        const hasVideo = tpl.slots.some((s) => s.type === "video");
        const hasPhoto = tpl.slots.some((s) => s.type === "photo");
        if (hasVideo) setMode("video");
        else if (hasPhoto) setMode("photo");

        // ✅ CORRECTION: Si on est en mode live (caméra active), binder le stream
        // et NE PAS aller en slot_picker
        if (tpl.slots.length > 0) {
          if (!hasCapture && streamRef.current && videoRef.current) {
            const primarySlot = tpl.slots.find((s) => s.type === "video" && s.required)
              || tpl.slots.find((s) => s.type === "video")
              || tpl.slots[0];
            
            if (primarySlot) {
              kEngine.bindLiveStream(primarySlot.id, videoRef.current);
              setDrawer("none");
              setToast(`✨ ${tpl.name} - Effets live activés`);
              return; // NE PAS aller en slot_picker
            }
          }
          
          // Sinon (mode album ou pas de stream), aller en slot_picker
          setKuaishouPhase('slot_picker');
          setDrawer("none");
          setToast(`✨ ${tpl.name} - Sélectionnez vos médias`);
          return;
        }

        setDrawer("none");
        setToast(`✨ ${tpl.name}`);
        return;
      }

      // Else legacy AdvancedTemplate behavior - check for KSE engine
      const advTpl = tpl as AdvancedTemplate;
      if (advTpl.engine?.kind === 'KSE' && advTpl.engine.variants) {
        const defaultDur = advTpl.engine.defaultDuration;
        const kseManifest = advTpl.engine.variants[defaultDur];
        
        if (kseManifest) {
          // Convert KSE manifest to TemplateManifest format
          const manifest: TemplateManifest = {
            id: kseManifest.id,
            name: kseManifest.title_fr,
            description: kseManifest.title_ba || '',
            version: kseManifest.version,
            duration: kseManifest.durationSec,
            ratio: kseManifest.ratio,
            category: kseManifest.family || 'default',
            usage: 0,
            slots: kseManifest.slots.map(s => ({
              id: s.id,
              description: s.id,
              type: s.type[0] as 'video' | 'photo' | 'audio',
              required: s.required,
              min: s.min,
              max: s.max,
              constraints: {
                min_duration: s.minDurationSec,
              }
            })),
            pipeline: kseManifest.pipeline.map(p => ({
              op: (p.op || 'enhance') as any,
              target: undefined,
              quality: 'medium' as const,
              output: p.output || p.op,
              params: p.params
            })),
            timeline: kseManifest.timeline.map((layer, i) => ({
              layer_id: layer.layer,
              type: layer.fromSlot ? 'user_media_layer' : 'video_layer',
              z_index: i,
              start: layer.t[0],
              end: layer.t[1],
              asset: layer.asset,
              slot_ref: layer.fromSlot,
              transform: { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 },
              effects: [],
              animation: null
            })),
            overrides: kseManifest.overrides,
            music: { enabled: true, beatSync: kseManifest.pipeline.some(p => p.op === 'beat_detect') }
          };

          try {
            kEngine.loadTemplate(manifest);
            kEngine.setTime(0);
            kEngine.pause();
          } catch (e: any) {
            console.warn('K-Engine load failed:', e);
          }

          setActiveKSEManifest(manifest);

          // Align settings
          const dur = kseManifest.durationSec;
          if (dur <= 15) setLengthSec(15);
          else if (dur <= 30) setLengthSec(30);
          else if (dur <= 60) setLengthSec(60);
          else setLengthSec(180);

          setCanvasRatio((kseManifest.ratio as CanvasRatio) || "9:16");

          // ✅ KUAISHOU FLOW: Go to slot picker if has slots
          if (kseManifest.slots.length > 0) {
            setKuaishouPhase('slot_picker');
            setDrawer("none");
            setToast(`✨ ${advTpl.label_fr} - Sélectionnez vos médias`);
            return;
          }
        }
      }

      // Legacy flow without KSE
      const meta = asTemplateMeta(tpl);
      const firstDuration = meta.supportedDurations?.[0];
      if (firstDuration) {
        const durationSec = durationToSeconds(firstDuration);
        if (durationSec <= 15) setLengthSec(15);
        else if (durationSec <= 30) setLengthSec(30);
        else if (durationSec <= 60) setLengthSec(60);
        else setLengthSec(180);
      }

      const inputs = meta.inputs || [];
      const hasVideo = inputs.some((i: any) => i.type === "video");
      const hasPhotoOnly = inputs.length > 0 && inputs.every((i: any) => i.type === "photo" || i.type === "audio");
      const hasAudioOnly = inputs.length > 0 && inputs.every((i: any) => i.type === "audio");

      if (hasAudioOnly) setMode("video");
      else if (hasPhotoOnly && !hasVideo) setMode("photo");
      else setMode("video");

      // stop any K-Engine template if switching to legacy
      try {
        if (kEngine.getState().loaded) kEngine.clearTemplate();
      } catch {}

      setDrawer("none");
      setToast(`${meta.emoji} ${meta.label} activé`);

      // voice instruction (legacy)
      if (meta.voiceInstructions.length > 0) {
        setTimeout(() => {
          try {
            templateEngine.speakInstruction(meta.voiceInstructions[0], "fr");
          } catch {}
        }, 500);
      }
    },
    [updateEffects]
  );

  // ============= RENDER =============
  if (!open) return null;

  const uiIsPlaying = isKEngineActive ? kState.isPlaying : isPlaying;

  return (
    <div className="fixed inset-0 z-[100] bg-black text-white select-none">
      {/* Hidden album input */}
      <input
        ref={albumInputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={handleAlbumSelect}
      />

      {/* ============ KUAISHOU FLOW SCREENS ============ */}
      
      {/* Slot Picker Screen */}
      {kuaishouPhase === 'slot_picker' && activeTemplateAny && activeKSEManifest && (
        <TemplateSlotPicker
          template={activeTemplateAny as AdvancedTemplate}
          manifest={activeKSEManifest}
          isOpen={true}
          onComplete={async (assets) => {
            setBoundAssets(assets);
            setKuaishouPhase('recognizing');
            
            // Bind assets to K-Engine
            for (const [slotId, asset] of Object.entries(assets)) {
              try {
                await kEngine.bindUserMedia(slotId, asset);
              } catch (e) {
                console.warn('Failed to bind asset:', slotId, e);
              }
            }
            
            // Run AI pipeline
            await runKuaishouAIPipeline();
          }}
          onCancel={() => {
            setKuaishouPhase('idle');
            setActiveTemplateAny(null);
            setActiveKSEManifest(null);
          }}
          onCapture={() => {
            setKuaishouPhase('idle');
            // Switch to camera capture mode
          }}
        />
      )}

      {/* Recognizing Screen */}
      {kuaishouPhase === 'recognizing' && activeTemplateAny && (
        <RecognizingScreen
          isVisible={true}
          progress={processingProgress?.percent || 0}
          currentStep={processingProgress?.message_fr || ''}
          template={activeTemplateAny as AdvancedTemplate}
          previewUrl={boundAssets[Object.keys(boundAssets)[0]]?.url}
          onComplete={() => setKuaishouPhase('overrides')}
        />
      )}

      {/* Overrides Editor Screen */}
      {kuaishouPhase === 'overrides' && activeTemplateAny && activeKSEManifest && (
        <OverridesEditor
          template={activeTemplateAny as AdvancedTemplate}
          manifest={activeKSEManifest}
          boundAssets={boundAssets}
          isOpen={true}
          onOverride={handleKuaishouOverride}
          onPublish={() => {
            setKuaishouPhase('idle');
            setShowPublish(true);
          }}
          onBack={() => setKuaishouPhase('slot_picker')}
        />
      )}

      {/* ============ PUBLISH OVERLAY ============ */}
      <AnimatePresence>
        {showPublish && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[200] bg-black/95 backdrop-blur-xl"
          >
            <div className="absolute top-0 left-0 right-0 p-4 z-20 flex items-center justify-between safe-area-top">
              <button
                onClick={() => setShowPublish(false)}
                className="h-11 px-4 rounded-full bg-white/10 backdrop-blur-xl flex items-center gap-2"
              >
                <X className="h-4 w-4" /> Retour
              </button>
            </div>

            <div className="absolute inset-0 flex items-center justify-center p-6 pt-20">
              <div className="w-full max-w-lg">
                <div className="rounded-3xl bg-white/5 border border-white/10 p-4 backdrop-blur-xl">
                  <div className="text-white font-semibold text-lg flex items-center gap-2">
                    Publier
                    {effects.templateId !== "free" && (
                      <span className="text-sm px-2 py-0.5 rounded-full bg-white/10">
                        {activeMeta.emoji} {activeMeta.label}
                      </span>
                    )}
                  </div>

                  <div className="mt-4 rounded-2xl bg-black/40 border border-white/10 p-2 aspect-[9/16] max-h-[200px] overflow-hidden relative">
                    {hasCapture ? (
                      <canvas className="w-full h-full object-contain rounded-xl" ref={previewCanvasRef as any} />
                    ) : null}

                    {effects.templateId !== "free" && (
                      <div className="absolute top-2 right-2 px-2 py-1 rounded-full bg-black/60 backdrop-blur-sm text-xs">
                        {activeMeta.emoji}
                      </div>
                    )}
                  </div>

                  {effects.challengeId && (
                    <div className="mt-3 px-3 py-2 rounded-xl bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30 flex items-center gap-2">
                      <Flame className="h-4 w-4 text-orange-400" />
                      <span className="text-sm text-orange-300">
                        {CHALLENGES.find((c) => c.id === effects.challengeId)?.hashtag}
                      </span>
                    </div>
                  )}

                  <textarea
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Ajoute une description…"
                    className="mt-4 w-full min-h-[100px] rounded-2xl bg-white/5 border border-white/10 p-4 text-white placeholder:text-white/40 outline-none resize-none"
                  />

                  <button
                    onClick={publish}
                    className="mt-4 w-full h-14 rounded-full bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold flex items-center justify-center gap-2"
                  >
                    <Send className="h-5 w-5" />
                    Publier
                  </button>

                  {isKEngineActive && (
                    <div className="mt-3 text-xs text-white/60 bg-white/5 border border-white/10 rounded-xl p-3">
                      <div className="font-semibold text-white/80 mb-1">Export K-Engine</div>
                      <div>FFmpeg command générée via exportJob().</div>
                      <div className="mt-1">Durée: {kState.template?.duration ?? 0}s • Ratio: {kState.template?.ratio}</div>
                    </div>
                  )}

                  {error && (
                    <div className="mt-3 text-sm text-red-300 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" /> {error}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============ UNIFIED CREATOR INTERFACE ============ */}
      <div
        ref={containerRef}
        className="absolute inset-0"
        onPointerDown={onSurfaceDown}
        onPointerMove={onSurfaceMove}
        onPointerUp={onSurfaceUp}
      >
        {/* MEDIA ZONE */}
        <div className={cn("absolute inset-0", graphicsClasses)} style={graphicsStyles}>
          {!hasCapture ? (
            <>
              {/* ✅ HIGH-QUALITY HYBRID MODE: Native video ALWAYS visible for maximum quality */}
              <video
                ref={videoRef}
                className="absolute inset-0 w-full h-full object-cover bg-black"
                style={{
                  filter: isKEngineActive ? "none" : cssFilter,
                  transform: facing === "user" ? "scaleX(-1)" : "none",
                  // ✅ HYBRID: Keep video visible when K-Engine active (effects rendered as overlay)
                  opacity: legacyTemplateActive ? 0 : 1,
                }}
                playsInline
                muted
                autoPlay
              />

              {/* ✅ K-Engine TRANSPARENT overlay canvas (effects only, video shows through) */}
              {isKEngineActive && (
                <canvas
                  ref={liveCanvasRef}
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  style={{ 
                    transform: facing === "user" ? "scaleX(-1)" : "none",
                    // ✅ Transparent overlay - video native quality visible underneath
                    mixBlendMode: 'normal',
                  }}
                  aria-hidden="true"
                />
              )}

              {/* Legacy realtime effects path */}
              {legacyTemplateActive && !isKEngineActive && (
                <canvas
                  ref={liveCanvasRef}
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  style={{ transform: facing === "user" ? "scaleX(-1)" : "none" }}
                  aria-hidden="true"
                />
              )}
            </>
          ) : capturedType === "video" ? (
            <>
              {/* Visible preview surface (canvas) */}
              <canvas ref={previewCanvasRef} className="absolute inset-0 w-full h-full bg-black" aria-hidden="true" />

              {/* Hidden decoder video - ALWAYS present for K-Engine fallback rendering */}
              <video
                ref={previewVideoRef}
                className="absolute inset-0 w-full h-full opacity-0 pointer-events-none"
                playsInline
                muted
                preload="auto"
                src={previewUrl || undefined}
                loop
                autoPlay
              />

              {/* Loading indicator */}
              {hasCapture && previewUrl && !previewError && !previewReady && !isKEngineActive && (
                <div className="absolute inset-0 flex items-center justify-center bg-black pointer-events-none">
                  <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}

              {/* Error state */}
              {previewError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 p-6">
                  <AlertCircle className="h-12 w-12 text-red-400 mb-4" />
                  <p className="text-white text-center mb-4">Vidéo illisible sur cet appareil</p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setPreviewError(false);
                        const url = previewUrl;
                        setPreviewUrl("");
                        setTimeout(() => setPreviewUrl(url), 100);
                      }}
                      className="px-4 py-2 rounded-full bg-white/10 text-white border border-white/20"
                    >
                      Réessayer
                    </button>
                    <button onClick={retake} className="px-4 py-2 rounded-full bg-orange-500 text-white">
                      Reprendre
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <img src={previewUrl} className="absolute inset-0 w-full h-full object-contain bg-black" alt="captured" />
          )}
        </div>

        {/* Simple template overlay */}
        <TemplateOverlay templateId={effects.templateId} />

        {/* Legacy realtime effects overlay - visible during capture AND preview */}
        {/* ✅ CRITICAL FIX: Do NOT mount when K-Engine is active to prevent rendering conflicts */}
        {!isKEngineActive && !isTemplateManifest(activeTemplateAny) && activeMeta.id !== "none" && (
          <LiveTemplateEffect
            template={activeTemplateAny as any}
            videoRef={hasCapture ? previewVideoRef : videoRef}
            canvasRef={hasCapture ? previewCanvasRef : liveCanvasRef}
            isRecording={isRecording}
            recordingDuration={hasCapture ? currentTime : recordingElapsed}
            currentStep={0}
          />
        )}

        {/* Active Template Indicator Badge - ✅ Visible during capture AND recording */}
        <AnimatePresence>
          {!!activeTemplateAny && activeMeta.id !== "none" && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-20 left-4 z-40"
            >
              <button
                onClick={() => !isRecording && navigate('/tamtam/creator')}
                disabled={isRecording}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-xl border transition-all",
                  `bg-gradient-to-r ${activeMeta.color} border-white/30`,
                  isRecording && "opacity-80"
                )}
              >
                <span className="text-xl">{activeMeta.emoji}</span>
                <span className="text-white text-sm font-medium max-w-[120px] truncate">{activeMeta.label}</span>
                {!isRecording && !hasCapture && <span className="text-white/60 text-xs">✏️</span>}
                {isKEngineActive && (
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" title="K-Engine actif" />
                )}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ✅ K-ENGINE DEBUG OVERLAY (development only) */}
        {import.meta.env.DEV && isKEngineActive && (
          <div className="absolute top-32 left-4 z-50 bg-black/80 text-xs text-white p-3 rounded-lg font-mono space-y-1 max-w-[200px]">
            <div className="text-green-400 font-bold">🔧 K-Engine Debug</div>
            <div>Template: {kState.template?.id || 'none'}</div>
            <div>Name: {kState.template?.name || '-'}</div>
            <div>Slots: {kState.template?.slots?.length || 0}</div>
            <div>Timeline: {kState.template?.timeline?.length || 0} layers</div>
            <div>Bound Assets: {Object.keys(kState.userAssets).length}</div>
            <div className="text-yellow-300">
              {Object.entries(kState.userAssets).map(([slotId, asset]) => (
                <div key={slotId}>
                  • {slotId}: {asset?.kind || 'none'}
                  {asset?.kind === 'live' && ' 📹'}
                </div>
              ))}
            </div>
            <div>Playing: {kState.isPlaying ? '▶️' : '⏸️'}</div>
            <div>Time: {(kState.currentTime || 0).toFixed(2)}s</div>
            <div>hasCapture: {hasCapture ? '✅' : '❌'}</div>
            <div>Phase: {kuaishouPhase}</div>
          </div>
        )}

        {/* AR Effects Layer */}
        <AREffectsLayer activeEffects={effects.arEffects} />

        {/* Shot Tip Overlay */}
        <ShotTipOverlay tipId={effects.shotTipId} />

        {/* Stickers Layer */}
        <StickerLayer
          stickers={effects.stickers}
          onStickersChange={(stickers) => updateEffects({ stickers })}
          isEditing={true}
          containerRef={containerRef}
        />

        {/* Text Overlays Layer */}
        {textOverlays.map((overlay) => (
          <TextOverlayRenderer
            key={overlay.id}
            overlay={overlay}
            containerWidth={containerRef.current?.clientWidth || 0}
            containerHeight={containerRef.current?.clientHeight || 0}
            currentTime={currentTime}
          />
        ))}

        {/* Flash simulation */}
        <AnimatePresence>
          {flashSim && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.08 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-white pointer-events-none"
            />
          )}
        </AnimatePresence>

        {/* ===== TOP BAR ===== */}
        <div className="absolute top-0 left-0 right-0 z-30 safe-area-top">
          <div className="flex items-center justify-between px-4 pt-3 pb-2">
            {hasCapture ? (
              <button
                onClick={retake}
                className="h-11 px-4 rounded-full bg-black/40 backdrop-blur-xl flex items-center gap-2"
              >
                <RotateCcw className="h-4 w-4" /> Reprendre
              </button>
            ) : (
              <button
                onClick={() => onClose?.()}
                className="h-11 w-11 rounded-full bg-black/40 backdrop-blur-xl flex items-center justify-center"
              >
                <X className="h-5 w-5" />
              </button>
            )}

            {musicTrack ? (
              <div className="flex items-center gap-2 bg-black/40 backdrop-blur-xl rounded-full px-4 py-2">
                <Music className="h-4 w-4" />
                <span className="text-sm max-w-[120px] truncate">{musicTrack}</span>
                <button onClick={() => setMusicTrack(null)}>
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setToast("Music picker")}
                className="flex items-center gap-2 bg-black/40 backdrop-blur-xl rounded-full px-4 py-2"
              >
                <Music className="h-4 w-4" />
                <span className="text-sm">Musique</span>
              </button>
            )}

            {hasCapture ? (
              <button
                onClick={() => onClose?.()}
                className="h-11 w-11 rounded-full bg-black/40 backdrop-blur-xl flex items-center justify-center"
              >
                <X className="h-5 w-5" />
              </button>
            ) : (
              <button
                onClick={() => setFacing((f) => (f === "environment" ? "user" : "environment"))}
                className="h-11 w-11 rounded-full bg-black/40 backdrop-blur-xl flex items-center justify-center"
              >
                <RotateCcw className="h-5 w-5" />
              </button>
            )}
          </div>
          
          {/* ✅ Camera Resolution & Performance Indicator */}
          {!hasCapture && videoRef.current && (
            <div className="absolute top-14 right-4 z-40">
              <CameraResolutionIndicator
                videoRef={videoRef}
                performanceTier={performanceInfo?.tier}
                showQualityPreserved={isKEngineActive}
              />
            </div>
          )}
        </div>

        {/* ===== RIGHT RAIL ===== */}
        <div className="absolute right-3 top-24 bottom-48 z-30 flex flex-col items-center justify-start gap-2 overflow-y-auto py-2">
          {!hasCapture && (
            <>
              <RailButton
                icon={<RotateCcw className="h-5 w-5" />}
                label="Switch"
                onClick={() => setFacing((f) => (f === "environment" ? "user" : "environment"))}
              />
              <RailButton
                icon={<Timer className="h-5 w-5" />}
                label={timerSec ? `${timerSec}s` : "Timer"}
                active={timerSec > 0}
                onClick={() => {
                  const next = timerSec === 0 ? 3 : timerSec === 3 ? 10 : 0;
                  setTimerSec(next);
                  setToast(next ? `Timer ${next}s` : "Timer off");
                }}
              />
              <RailButton
                icon={<Zap className="h-5 w-5" />}
                label="Flash"
                active={flashSim}
                onClick={() => setFlashSim((v) => !v)}
              />
            </>
          )}

          <RailButton
            icon={<SunMedium className="h-5 w-5" />}
            label="Beautify"
            onClick={() => setDrawer(drawer === "beautify" ? "none" : "beautify")}
            active={drawer === "beautify" || effects.filterId !== "none"}
          />
          <RailButton
            icon={<Layers className="h-5 w-5" />}
            label="Graphics"
            onClick={() => setDrawer(drawer === "graphics" ? "none" : "graphics")}
            active={drawer === "graphics" || !!effects.frameId || !!effects.borderId}
          />
          <RailButton
            icon={<Sticker className="h-5 w-5" />}
            label="Stickers"
            onClick={() => setShowStickerPicker(true)}
            active={effects.stickers.length > 0}
          />
          <RailButton
            icon={<Gauge className="h-5 w-5" />}
            label={`${speed}x`}
            onClick={() => {
              const next = speed === 1 ? 2 : speed === 2 ? 0.5 : 1;
              setSpeed(next as 0.5 | 1 | 2);
              setToast(`Speed ${next}x`);
            }}
          />
          <RailButton
            icon={<ChevronUp className="h-5 w-5" />}
            label="Magic"
            onClick={() => setDrawer(drawer === "magic" ? "none" : "magic")}
            active={drawer === "magic" || effects.arEffects.length > 0}
          />
          <RailButton
            icon={<Layers className="h-5 w-5" />}
            label="Template"
            onClick={() => navigate('/tamtam/creator')}
            active={effects.templateId !== "free"}
          />

          {hasCapture && (
            <>
              <div className="w-8 h-px bg-white/20 my-1" />
              <RailButton
                icon={<Type className="h-5 w-5" />}
                label="Texte"
                onClick={() => setShowTextEditor(true)}
                active={textOverlays.length > 0}
              />
              <RailButton
                icon={<Scissors className="h-5 w-5" />}
                label="Couper"
                onClick={() => activeSegmentId && handleSplit(activeSegmentId, currentTime)}
              />
              <RailButton
                icon={activeSegment?.isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                label="Son"
                active={activeSegment?.isMuted}
                onClick={() => activeSegmentId && handleToggleMute(activeSegmentId)}
              />
            </>
          )}
        </div>

        {/* ===== VIDEO RECORDING TIMER WITH NEEDLE ===== */}
        <AnimatePresence>
          {isRecording && mode === "video" && !hasCapture && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute top-24 left-1/2 -translate-x-1/2 z-30"
            >
              <RecordingTimer maxSeconds={lengthSec} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ===== ADVANCED TEMPLATE CAPTURE OVERLAY (legacy only) ===== */}
        {!isTemplateManifest(activeTemplateAny) && activeMeta.id !== "none" && !hasCapture && (
          <TemplateCaptureOverlay
            template={activeTemplateAny as any}
            isRecording={isRecording}
            currentInputIndex={0}
            capturedInputs={0}
          />
        )}

        {/* ===== TEMPLATE PROCESSING OVERLAY (K-Engine pipeline) ===== */}
        <AnimatePresence>
          {isProcessingTemplate && processingProgress && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center"
            >
              <div
                className={`w-24 h-24 rounded-full bg-gradient-to-r ${
                  activeMeta.color || "from-amber-500 to-orange-500"
                } flex items-center justify-center mb-6`}
              >
                <span className="text-4xl">{activeMeta.emoji || "✨"}</span>
              </div>
              <h3 className="text-white text-xl font-bold mb-2">{processingProgress.message_fr}</h3>
              {processingProgress.message_ba && <p className="text-white/60 text-sm mb-6">{processingProgress.message_ba}</p>}
              <div className="w-64 h-2 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${processingProgress.percent}%` }}
                  className={`h-full bg-gradient-to-r ${activeMeta.color || "from-amber-500 to-orange-500"}`}
                />
              </div>
              <p className="text-white/40 text-xs mt-2">{processingProgress.percent}%</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ===== TEXT MODE INPUT ===== */}
        {mode === "text" && !hasCapture && (!activeTemplateAny || isTemplateManifest(activeTemplateAny)) && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-gradient-to-br from-orange-900/80 via-red-900/80 to-purple-900/80">
            <div className="w-full max-w-md px-6">
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Tapez votre texte ici..."
                autoFocus
                className="w-full min-h-[200px] bg-white/10 backdrop-blur-xl rounded-3xl p-6 text-white text-2xl font-semibold text-center placeholder:text-white/40 border border-white/20 outline-none resize-none"
                style={{ caretColor: "white" }}
              />
              <p className="text-center text-white/60 text-sm mt-4">Appuyez sur le bouton pour capturer</p>
            </div>
          </div>
        )}

        {/* ===== MODE PILL SELECTOR (only before capture) ===== */}
        {!hasCapture && (
          <div className="absolute left-1/2 -translate-x-1/2 bottom-[168px] z-20">
            <div className="inline-flex bg-black/50 backdrop-blur-xl rounded-full p-1 border border-white/10">
              {(["burst", "photo", "video", "text"] as CaptureMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-medium transition-all",
                    mode === m ? "bg-white text-black" : "text-white/70 hover:text-white"
                  )}
                >
                  {m === "burst" ? "Burst" : m === "photo" ? "Photo" : m === "video" ? "Vidéo" : "Texte"}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ===== MINI TIMELINE (only after capture) ===== */}
        {hasCapture && segments.length > 0 && (
          <div className="absolute left-4 right-4 bottom-[140px] z-20">
            <MiniTimeline
              segments={segments}
              activeSegmentId={activeSegmentId}
              currentTime={currentTime}
              totalDuration={totalDuration}
              onSelectSegment={setActiveSegmentId}
              onSplit={handleSplit}
              onTrim={handleTrim}
              onVolumeChange={handleVolumeChange}
              onToggleMute={handleToggleMute}
              onDelete={handleDelete}
              onDuplicate={handleDuplicate}
              onSeek={handleSeek}
            />
          </div>
        )}

        {/* ===== BOTTOM ACTIONS BAR ===== */}
        <div className="absolute left-0 right-0 bottom-20 z-20 px-6">
          <div className="flex items-center justify-between max-w-sm mx-auto">
            {!hasCapture ? (
              <>
                <button onClick={() => setDrawer(drawer === "magic" ? "none" : "magic")} className="flex flex-col items-center gap-1">
                  <div
                    className={cn(
                      "w-12 h-12 rounded-full backdrop-blur-xl flex items-center justify-center border transition-all",
                      effects.arEffects.length > 0 || effects.challengeId ? "bg-white/20 border-white" : "bg-black/40 border-white/10"
                    )}
                  >
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] text-white/80">Magic</span>
                </button>

                <div className="relative">
                  <button
                    onClick={onPressCapture}
                    className={cn(
                      "w-[72px] h-[72px] rounded-full flex items-center justify-center border-4 transition-all",
                      isRecording ? "bg-red-500 border-red-300/50 scale-110" : "bg-gradient-to-br from-orange-500 to-red-500 border-white/30 hover:scale-105"
                    )}
                  >
                    {isRecording ? (
                      mode === "burst" ? (
                        <span className="text-white font-bold text-lg">{burstCount}</span>
                      ) : (
                        <div className="w-6 h-6 rounded bg-white" />
                      )
                    ) : (
                      <CameraIcon className="h-7 w-7 text-white" />
                    )}
                  </button>
                  {mode === "burst" && isRecording && (
                    <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center text-xs font-bold">
                      {burstCount}
                    </div>
                  )}
                </div>

                <button onClick={() => albumInputRef.current?.click()} className="flex flex-col items-center gap-1">
                  <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-xl flex items-center justify-center border border-white/10">
                    <FolderOpen className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] text-white/80">Album</span>
                </button>
              </>
            ) : (
              <>
                <button onClick={retake} className="flex flex-col items-center gap-1">
                  <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-xl flex items-center justify-center border border-white/10">
                    <RotateCcw className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] text-white/80">Reprendre</span>
                </button>

                {(capturedType === "video" || isKEngineActive) && (
                  <button
                    onClick={togglePlayPause}
                    className="w-[72px] h-[72px] rounded-full bg-white/20 backdrop-blur-xl flex items-center justify-center border-4 border-white/30"
                  >
                    {uiIsPlaying ? <Pause className="h-8 w-8 text-white" /> : <Play className="h-8 w-8 text-white ml-1" />}
                  </button>
                )}

                <button onClick={publish} className="flex flex-col items-center gap-1">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center border border-white/20">
                    <Send className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] text-white/80">Publier</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* ===== BOTTOM TABS (only before capture) ===== */}
        {!hasCapture && (
          <div className="absolute left-0 right-0 bottom-0 z-20 safe-area-bottom">
            <div className="flex items-center justify-around py-3 bg-black/60 backdrop-blur-xl border-t border-white/10">
              {([
                { id: "15s", label: "15s" },
                { id: "30s", label: "30s" },
                { id: "45s", label: "45s" },
                { id: "60s", label: "60s" },
                { id: "story", label: "Story" },
                { id: "album", label: "Album" },
              ] as { id: TopTab; label: string }[]).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setTopTab(tab.id);
                    if (tab.id === "15s") {
                      setLengthSec(15);
                      setMode("video");
                    } else if (tab.id === "30s") {
                      setLengthSec(30);
                      setMode("video");
                    } else if (tab.id === "45s") {
                      setLengthSec(45 as any);
                      setMode("video");
                    } else if (tab.id === "60s") {
                      setLengthSec(60);
                      setMode("video");
                    } else if (tab.id === "story") {
                      setLengthSec(15);
                      setMode("video");
                    } else if (tab.id === "album") {
                      albumInputRef.current?.click();
                    }
                  }}
                  className={cn("flex flex-col items-center gap-0.5 transition-all px-2", topTab === tab.id ? "text-white" : "text-white/50")}
                >
                  <span className="text-xs font-medium">{tab.label}</span>
                  {topTab === tab.id && <div className="w-4 h-0.5 bg-white rounded-full" />}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ===== SAFE AREA BOTTOM (after capture) ===== */}
        {hasCapture && <div className="absolute left-0 right-0 bottom-0 h-16 z-10 bg-gradient-to-t from-black/80 to-transparent safe-area-bottom" />}

        {/* ===== DRAWERS ===== */}
        <AnimatePresence>
          {drawer === "beautify" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-[120] bg-black/50 backdrop-blur-sm"
              onClick={() => setDrawer("none")}
            >
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                className="absolute left-0 right-0 bottom-0 rounded-t-[28px] bg-[#0b0b0e] border-t border-white/10 p-4 max-h-[60vh] overflow-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-4" />
                <div className="font-semibold mb-4 flex items-center gap-2">
                  <SunMedium className="h-5 w-5" /> Beautify & Filtres
                </div>
                <VideoFiltersInlinePanel
                  selectedId={effects.filterId}
                  onSelect={(id) => updateEffects({ filterId: id })}
                  showIntensity
                  intensity={effects.filterIntensity}
                  onIntensityChange={(v) => updateEffects({ filterIntensity: v })}
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Graphics Drawer */}
        <GraphicsDrawer
          isOpen={drawer === "graphics"}
          onClose={() => setDrawer("none")}
          selectedFrame={effects.frameId}
          selectedBorder={effects.borderId}
          selectedOverlay={effects.overlayId}
          selectedBackground={effects.backgroundId}
          selectedTextStyle={undefined}
          onSelectFrame={(id) => updateEffects({ frameId: id })}
          onSelectBorder={(id) => updateEffects({ borderId: id })}
          onSelectOverlay={(id) => updateEffects({ overlayId: id })}
          onSelectBackground={(id) => updateEffects({ backgroundId: id })}
          onSelectTextStyle={() => {}}
        />

        {/* Magic Drawer */}
        <MagicDrawer
          isOpen={drawer === "magic"}
          onClose={() => setDrawer("none")}
          selectedShotTip={effects.shotTipId}
          onSelectShotTip={(id) => updateEffects({ shotTipId: id })}
          selectedChallenge={effects.challengeId}
          onSelectChallenge={(id) => updateEffects({ challengeId: id })}
          activeAREffects={effects.arEffects}
          onToggleAREffect={toggleAREffect}
          onSelectIdea={(idea) => {
            setToast(`💡 ${idea.label}`);
            setDrawer("none");
          }}
        />

        {/* Advanced Template Drawer - disabled, now redirects to /tamtam/creator */}
        {/* 
        <AdvancedTemplateDrawer
          isOpen={drawer === "template"}
          onClose={() => setDrawer("none")}
          onSelectTemplate={(tpl: any) => onSelectAnyTemplate(tpl)}
        />
        */}

        {/* Sticker Picker */}
        <AnimatePresence>
          {showStickerPicker && (
            <StickerPicker isOpen={showStickerPicker} onClose={() => setShowStickerPicker(false)} onAddSticker={addSticker} />
          )}
        </AnimatePresence>

        {/* Errors */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute left-4 right-4 bottom-36 z-[200] px-4 py-3 rounded-2xl bg-red-500/20 border border-red-400/30 backdrop-blur text-sm flex items-center gap-2"
            >
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Text Overlay Editor Modal */}
        <TextOverlayEditor
          open={showTextEditor}
          onClose={() => {
            setShowTextEditor(false);
            setEditingTextOverlay(undefined);
          }}
          onSave={(overlay) => {
            setTextOverlays((prev) => {
              const exists = prev.find((o) => o.id === overlay.id);
              if (exists) {
                return prev.map((o) => (o.id === overlay.id ? overlay : o));
              }
              return [...prev, overlay];
            });
          }}
          initialOverlay={editingTextOverlay}
          videoDuration={totalDuration || lengthSec}
        />

        {/* Optimized Export Screen */}
        <OptimizedExportScreen
          open={showExportScreen}
          onComplete={(blob) => {
            setShowExportScreen(false);
            setCapturedBlob(blob);
            setShowPublish(true);
          }}
          onCancel={() => setShowExportScreen(false)}
          sourceBlob={capturedBlob || undefined}
          templateName={activeMeta.label}
          quality="medium"
          fastExport={true}
        />

        {/* Toast */}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute top-20 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-black/70 border border-white/10 text-white text-sm backdrop-blur-xl z-[200]"
            >
              {toast}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ===== UI ATOMS =====

function RailButton({
  icon,
  label,
  onClick,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1">
      <div
        className={cn(
          "w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-xl transition-all",
          active ? "bg-white/30 border-2 border-white" : "bg-black/40 border border-white/10"
        )}
      >
        {icon}
      </div>
      <span className="text-[10px] text-white/80">{label}</span>
    </button>
  );
}

// Recording timer with needle animation
function RecordingTimer({ maxSeconds }: { maxSeconds: number }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed((prev) => {
        if (prev >= maxSeconds) {
          clearInterval(interval);
          return maxSeconds;
        }
        return prev + 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [maxSeconds]);

  const remaining = maxSeconds - elapsed;
  const progress = maxSeconds > 0 ? elapsed / maxSeconds : 0;
  const rotation = progress * 360;

  return (
    <div className="relative w-24 h-24">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="4" />
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="url(#timerGradient)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={`${progress * 283} 283`}
        />
        <defs>
          <linearGradient id="timerGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
        </defs>
      </svg>

      <div className="absolute inset-0 flex items-center justify-center" style={{ transform: `rotate(${rotation}deg)` }}>
        <div className="absolute w-1 h-10 bg-gradient-to-b from-orange-500 to-red-500 rounded-full origin-bottom" style={{ bottom: "50%" }} />
      </div>

      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-16 h-16 rounded-full bg-black/60 backdrop-blur-xl flex items-center justify-center border border-white/20">
          <span className="text-white font-bold text-lg">{remaining}s</span>
        </div>
      </div>

      <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 animate-pulse" />
    </div>
  );
}
