// src/components/tamtam/FullscreenCreator.tsx
// Kuaishou-style premium interface with FULL integration of all modules

import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  RotateCcw,
  Zap,
  Timer,
  Gauge,
  Sparkles,
  Flame,
  Wand2,
  Music,
  Camera as CameraIcon,
  Send,
  AlertCircle,
  Film,
  ChevronUp,
  BookOpen,
  Radio,
  Layers,
  SunMedium,
  FolderOpen,
  Sticker,
  Type,
  Image as ImageIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

import TimelineEditor, { TimelineSegment } from "./TimelineEditor";
import {
  VideoFiltersInlinePanel,
  VIDEO_FILTERS,
  VideoFilter,
  scaleCssFilter,
} from "./VideoFilters";

// Import all creator modules
import {
  CULTURAL_TEMPLATES,
  GRAPHICS_ITEMS,
  AR_EFFECTS,
  CHALLENGES,
  SHOT_TIPS,
  CaptureEffects,
  DEFAULT_EFFECTS,
  getTemplateById,
  Sticker as StickerType,
} from "./creator/CreatorEffectsData";
import { StickerLayer, StickerPicker } from "./creator/StickerLayer";
import { AREffectsLayer, ShotTipOverlay } from "./creator/AREffectsLayer";
import { GraphicsDrawer, getGraphicsStyles, getGraphicsClasses } from "./creator/GraphicsDrawer";
import { MagicDrawer } from "./creator/MagicDrawer";
import { TemplateOverlay, TemplateCarousel } from "./creator/TemplateOverlay";

export type CreatorOutputPayload = {
  segments: TimelineSegment[];
  caption: string;
  topTab: TopTab;
  mode: CaptureMode;
  canvasRatio: CanvasRatio;
  selectedFilterId?: string;
  effects?: CaptureEffects;
  challengeHashtag?: string;
};

type TopTab = "15s" | "30s" | "45s" | "60s" | "story" | "album" | "template";
type CaptureMode = "burst" | "photo" | "video" | "text";
type CreatorStep = "capture" | "preview" | "editor" | "publish";
type CanvasRatio = "9:16" | "1:1" | "16:9";
type DrawerType = "none" | "beautify" | "length" | "magic" | "graphics" | "stickers" | "template";

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

function pickMimeType(): string | undefined {
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
    "video/mp4",
  ];
  const MR = typeof window !== "undefined" ? (window as any).MediaRecorder : undefined;
  if (!MR || !MR.isTypeSupported) return undefined;
  for (const c of candidates) {
    try {
      if (MR.isTypeSupported(c)) return c;
    } catch {}
  }
  return undefined;
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
  let sx = 0, sy = 0, sw = w, sh = h;
  if (srcAR > dstAR) {
    sw = Math.round(h * dstAR);
    sx = Math.round((w - sw) / 2);
  } else {
    sh = Math.round(w / dstAR);
    sy = Math.round((h - sh) / 2);
  }

  // Apply filter
  const filter = VIDEO_FILTERS.find(f => f.id === effects.filterId);
  if (filter && filter.id !== 'none') {
    ctx.filter = scaleCssFilter(filter.cssFilter, effects.filterIntensity);
  }

  ctx.drawImage(videoEl, sx, sy, sw, sh, 0, 0, target.tw, target.th);

  // Apply template overlay gradient
  const template = getTemplateById(effects.templateId);
  if (template?.overlayGradient) {
    ctx.save();
    const gradient = ctx.createLinearGradient(0, 0, 0, target.th);
    gradient.addColorStop(0, 'rgba(0,0,0,0.3)');
    gradient.addColorStop(0.5, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, 'rgba(0,0,0,0.4)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, target.tw, target.th);
    ctx.restore();
  }

  // Draw stickers
  for (const sticker of effects.stickers) {
    ctx.save();
    const x = (sticker.position.x / 100) * target.tw;
    const y = (sticker.position.y / 100) * target.th;
    ctx.translate(x, y);
    ctx.rotate((sticker.rotation * Math.PI) / 180);
    ctx.scale(sticker.scale, sticker.scale);
    ctx.font = '60px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
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

  // Background with template gradient
  const template = getTemplateById(effects.templateId);
  const g = ctx.createLinearGradient(0, 0, size.w, size.h);
  g.addColorStop(0, "#0f172a");
  g.addColorStop(1, "#111827");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size.w, size.h);

  // Template overlay
  if (template?.overlayGradient) {
    const overlay = ctx.createLinearGradient(0, 0, 0, size.h);
    overlay.addColorStop(0, 'rgba(139,69,19,0.3)');
    overlay.addColorStop(0.5, 'rgba(0,0,0,0)');
    overlay.addColorStop(1, 'rgba(139,69,19,0.4)');
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

  // Draw stickers
  for (const sticker of effects.stickers) {
    ctx.save();
    const x = (sticker.position.x / 100) * size.w;
    const sy = (sticker.position.y / 100) * size.h;
    ctx.translate(x, sy);
    ctx.rotate((sticker.rotation * Math.PI) / 180);
    ctx.scale(sticker.scale, sticker.scale);
    ctx.font = '60px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(sticker.content, 0, 0);
    ctx.restore();
  }

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Text blob failed"))), "image/jpeg", 0.92);
  });
  return blob;
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

export default function FullscreenCreator({
  open = true,
  onClose,
  onPublish,
}: FullscreenCreatorProps) {
  // Core state
  const [step, setStep] = useState<CreatorStep>("capture");
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

  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // ============= EFFECTS STATE (FULL INTEGRATION) =============
  const [effects, setEffects] = useState<CaptureEffects>({ ...DEFAULT_EFFECTS });

  // Quick accessors
  const updateEffects = useCallback((updates: Partial<CaptureEffects>) => {
    setEffects(prev => ({ ...prev, ...updates }));
  }, []);

  // Template selection
  const selectedTemplate = useMemo(() => getTemplateById(effects.templateId), [effects.templateId]);

  // Filter
  const filter = useMemo<VideoFilter | undefined>(
    () => VIDEO_FILTERS.find((f) => f.id === effects.filterId) ?? VIDEO_FILTERS[0],
    [effects.filterId]
  );
  const cssFilter = useMemo(() => {
    const base = filter?.cssFilter ?? "none";
    let result = scaleCssFilter(base, effects.filterIntensity);
    
    // Add AR face filters
    effects.arEffects.forEach(arId => {
      const ar = AR_EFFECTS.find(e => e.id === arId);
      if (ar?.type === 'face' && ar.cssFilter) {
        result = result === 'none' ? ar.cssFilter : `${result} ${ar.cssFilter}`;
      }
    });
    
    return result;
  }, [filter?.cssFilter, effects.filterIntensity, effects.arEffects]);

  // Music
  const [musicTrack, setMusicTrack] = useState<string | null>(null);

  // Sticker picker
  const [showStickerPicker, setShowStickerPicker] = useState(false);

  // Graphics styles for preview (MUST BE BEFORE EARLY RETURN)
  const graphicsStyles = useMemo(() => 
    getGraphicsStyles(effects.frameId, effects.borderId, effects.overlayId, effects.backgroundId),
    [effects.frameId, effects.borderId, effects.overlayId, effects.backgroundId]
  );

  const graphicsClasses = useMemo(() =>
    getGraphicsClasses(effects.frameId, effects.borderId, effects.overlayId, effects.backgroundId),
    [effects.frameId, effects.borderId, effects.overlayId, effects.backgroundId]
  );

  // Stream/recorder refs
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const gestureRef = useRef<{ x0: number; y0: number; active: boolean } | null>(null);
  const albumInputRef = useRef<HTMLInputElement | null>(null);
  
  // Burst mode state
  const burstIntervalRef = useRef<number | null>(null);
  const [burstPhotos, setBurstPhotos] = useState<Blob[]>([]);
  const [burstCount, setBurstCount] = useState(0);

  // Capture outputs
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [capturedType, setCapturedType] = useState<"video" | "photo" | "audio">("video");
  const [previewUrl, setPreviewUrl] = useState<string>("");

  // Editor
  const [segments, setSegments] = useState<TimelineSegment[]>([]);

  // Publish
  const [caption, setCaption] = useState("");

  // Clean toast
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 1500);
    return () => window.clearTimeout(t);
  }, [toast]);

  // Auto-apply template settings
  useEffect(() => {
    if (selectedTemplate && selectedTemplate.id !== 'free') {
      setLengthSec(selectedTemplate.suggestedDuration as 15 | 30 | 60 | 180 | 600);
      setMode(selectedTemplate.suggestedMode as CaptureMode);
      setCanvasRatio(selectedTemplate.suggestedRatio);
      if (selectedTemplate.autoFilter) {
        updateEffects({ filterId: selectedTemplate.autoFilter });
      }
    }
  }, [selectedTemplate, updateEffects]);

  // Camera bootstrap
  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  const startStream = async () => {
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
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
    } catch (e: any) {
      setError(e?.message || "Impossible d'accéder à la caméra.");
    }
  };

  useEffect(() => {
    if (step !== "capture") return;
    startStream();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, facing, mode]);

  // Cleanup urls
  useEffect(() => {
    if (!capturedBlob) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const url = URL.createObjectURL(capturedBlob);
    setPreviewUrl(url);
    return () => {
      try { URL.revokeObjectURL(url); } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capturedBlob]);

  // ⚠️ CRITICAL: Early return MUST be AFTER all hooks
  if (!open) return null;

  // MediaRecorder helpers
  const startRecording = async () => {
    setError(null);
    if (!streamRef.current) await startStream();
    if (!streamRef.current) return;
    if (!isMediaRecorderSupported()) {
      setError("Enregistrement vidéo non supporté.");
      return;
    }
    const mimeType = pickMimeType();
    try {
      chunksRef.current = [];
      const rec = new MediaRecorder(streamRef.current, mimeType ? { mimeType } : undefined);
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
    const blob: Blob = await new Promise((resolve, reject) => {
      rec.onstop = () => {
        try {
          const type = rec.mimeType || "video/webm";
          const b = new Blob(chunksRef.current, { type });
          if (!b.size) reject(new Error("Empty recording"));
          else resolve(b);
        } catch (e) { reject(e); }
      };
      try { rec.stop(); } catch (e) { reject(e); }
    });
    recorderRef.current = null;
    chunksRef.current = [];
    setIsRecording(false);
    return blob;
  };

  // Capture actions
  const runTimerIfNeeded = async () => {
    if (timerSec === 0) return;
    setToast(`${timerSec}s…`);
    await new Promise((r) => setTimeout(r, timerSec * 1000));
    setToast(null);
  };

  const onPressCapture = async () => {
    setError(null);

    if (mode === "text") {
      try {
        await runTimerIfNeeded();
        stopStream();
        const b = await renderTextToImage(caption || "Texte", canvasRatio, effects);
        setCapturedType("photo");
        setCapturedBlob(b);
        setStep("preview");
        setDrawer("none");
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
        const b = await capturePhotoFromVideo(videoRef.current, canvasRatio, effects);
        setCapturedType("photo");
        setCapturedBlob(b);
        setStep("preview");
        setDrawer("none");
        return;
      } catch (e: any) {
        setError(e?.message || "Erreur photo");
        return;
      }
    }
    
    if (mode === "burst") {
      // Toggle burst mode on/off
      if (burstIntervalRef.current) {
        // Stop burst
        window.clearInterval(burstIntervalRef.current);
        burstIntervalRef.current = null;
        setIsRecording(false);
        // Use the last captured photo
        if (burstPhotos.length > 0) {
          setCapturedType("photo");
          setCapturedBlob(burstPhotos[burstPhotos.length - 1]);
          setStep("preview");
          setDrawer("none");
        }
        setBurstPhotos([]);
        setBurstCount(0);
        return;
      } else {
        // Start burst
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
            setBurstPhotos(prev => [...prev, b]);
            setBurstCount(prev => prev + 1);
          } catch {}
        };
        
        // Capture immediately then every 300ms
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
          setCapturedType("video");
          setCapturedBlob(b);
          setStep("preview");
          setDrawer("none");
        }
      } catch (e: any) {
        setError(e?.message || "Erreur vidéo");
        setIsRecording(false);
      }
    }
  };

  const goToEditor = () => {
    if (!capturedBlob) {
      setError("Aucun média capturé.");
      return;
    }
    const segType = capturedType === "video" ? "video" : "photo";
    const duration = segType === "video" ? lengthSec : 5;
    const seg: TimelineSegment = {
      id: `${Date.now()}`,
      blob: capturedBlob,
      type: segType,
      duration,
      startTime: 0,
      endTime: duration,
      isMuted: false,
      volume: 100,
      filter: effects.filterId,
    };
    setSegments([seg]);
    setStep("editor");
  };

  const retake = () => {
    setCapturedBlob(null);
    setCapturedType("video");
    setPreviewUrl("");
    setSegments([]);
    setStep("capture");
    setDrawer("none");
  };

  const onEditorConfirm = async (nextSegments: TimelineSegment[]) => {
    setSegments(nextSegments);
    setStep("publish");
  };

  const publish = async () => {
    try {
      setError(null);
      if (!segments.length) throw new Error("Aucun contenu à publier.");
      
      // Get challenge hashtag if selected
      const challenge = effects.challengeId ? CHALLENGES.find(c => c.id === effects.challengeId) : null;
      const finalCaption = challenge ? `${caption} ${challenge.hashtag}`.trim() : caption;
      
      if (onPublish) {
        await onPublish({ 
          segments, 
          caption: finalCaption, 
          topTab, 
          mode, 
          canvasRatio, 
          selectedFilterId: effects.filterId,
          effects,
          challengeHashtag: challenge?.hashtag,
        });
      }
      setToast("Publié ✓");
      onClose?.();
    } catch (e: any) {
      setError(e?.message || "Erreur publication");
    }
  };

  // Gestures for filter swipe
  const onSurfaceDown = (e: React.PointerEvent) => {
    gestureRef.current = { x0: e.clientX, y0: e.clientY, active: true };
  };

  const onSurfaceMove = (e: React.PointerEvent) => {
    if (!gestureRef.current?.active) return;
    const dx = e.clientX - gestureRef.current.x0;
    const dy = e.clientY - gestureRef.current.y0;
    if (step === "capture" && Math.abs(dy) < 60 && Math.abs(dx) > 90) {
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

  // Sticker management
  const addSticker = (sticker: Omit<StickerType, 'id'>) => {
    const newSticker: StickerType = {
      ...sticker,
      id: `sticker-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
    updateEffects({ stickers: [...effects.stickers, newSticker] });
  };

  // AR toggle
  const toggleAREffect = (id: string) => {
    const current = effects.arEffects;
    const newEffects = current.includes(id)
      ? current.filter(e => e !== id)
      : [...current, id];
    updateEffects({ arEffects: newEffects });
  };

  // Length options
  const lengthOptions = [
    { value: 15, label: "15s" },
    { value: 30, label: "30s" },
    { value: 60, label: "60s" },
    { value: 180, label: "3min" },
    { value: 600, label: "10min" },
  ];

  // Album file handler
  const handleAlbumSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const isVideo = file.type.startsWith('video/');
    const blob = file as Blob;
    
    setCapturedType(isVideo ? "video" : "photo");
    setCapturedBlob(blob);
    stopStream();
    setStep("preview");
    setDrawer("none");
    
    // Reset input
    if (albumInputRef.current) albumInputRef.current.value = '';
  };


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
      {/* ============ CAPTURE STEP ============ */}
      {step === "capture" && (
        <div
          ref={containerRef}
          className="absolute inset-0"
          onPointerDown={onSurfaceDown}
          onPointerMove={onSurfaceMove}
          onPointerUp={onSurfaceUp}
        >
          {/* Camera preview with all effects applied */}
          <div 
            className={cn("absolute inset-0", graphicsClasses)}
            style={graphicsStyles}
          >
            <video
              ref={videoRef}
              className="absolute inset-0 w-full h-full object-cover bg-black"
              style={{
                filter: cssFilter,
                transform: facing === "user" ? "scaleX(-1)" : "none",
              }}
              playsInline
              muted
              autoPlay
            />
          </div>

          {/* Template overlay */}
          <TemplateOverlay templateId={effects.templateId} />

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
              <button
                onClick={() => onClose?.()}
                className="h-11 w-11 rounded-full bg-black/40 backdrop-blur-xl flex items-center justify-center"
              >
                <X className="h-5 w-5" />
              </button>

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

              <button
                onClick={() => setFacing((f) => (f === "environment" ? "user" : "environment"))}
                className="h-11 w-11 rounded-full bg-black/40 backdrop-blur-xl flex items-center justify-center"
              >
                <RotateCcw className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* ===== RIGHT RAIL ===== */}
          <div className="absolute right-3 top-24 bottom-60 z-30 flex flex-col items-center justify-center gap-3">
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
              icon={<SunMedium className="h-5 w-5" />}
              label="Beautify"
              onClick={() => setDrawer(drawer === "beautify" ? "none" : "beautify")}
              active={drawer === "beautify" || effects.filterId !== 'none'}
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
              icon={<Zap className="h-5 w-5" />}
              label="Flash"
              active={flashSim}
              onClick={() => setFlashSim((v) => !v)}
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
              onClick={() => setDrawer(drawer === "template" ? "none" : "template")}
              active={drawer === "template" || effects.templateId !== 'free'}
            />
          </div>

          {/* ===== VIDEO RECORDING TIMER WITH NEEDLE ===== */}
          <AnimatePresence>
            {isRecording && mode === "video" && (
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

          {/* ===== TEXT MODE INPUT ===== */}
          {mode === "text" && (
            <div className="absolute inset-0 flex items-center justify-center z-10 bg-gradient-to-br from-orange-900/80 via-red-900/80 to-purple-900/80">
              <div className="w-full max-w-md px-6">
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Tapez votre texte ici..."
                  autoFocus
                  className="w-full min-h-[200px] bg-white/10 backdrop-blur-xl rounded-3xl p-6 text-white text-2xl font-semibold text-center placeholder:text-white/40 border border-white/20 outline-none resize-none"
                  style={{ caretColor: 'white' }}
                />
                <p className="text-center text-white/60 text-sm mt-4">Appuyez sur le bouton pour capturer</p>
              </div>
            </div>
          )}

          {/* ===== MODE PILL SELECTOR ===== */}
          <div className="absolute left-1/2 -translate-x-1/2 bottom-[168px] z-20">
            <div className="inline-flex bg-black/50 backdrop-blur-xl rounded-full p-1 border border-white/10">
              {(["burst", "photo", "video", "text"] as CaptureMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-medium transition-all",
                    mode === m
                      ? "bg-white text-black"
                      : "text-white/70 hover:text-white"
                  )}
                >
                  {m === "burst" ? "Burst" : m === "photo" ? "Photo" : m === "video" ? "Video" : "Text"}
                </button>
              ))}
            </div>
          </div>

          {/* ===== BOTTOM ACTIONS BAR ===== */}
          <div className="absolute left-0 right-0 bottom-20 z-20 px-6">
            <div className="flex items-center justify-between max-w-sm mx-auto">
              <button
                onClick={() => setDrawer(drawer === "magic" ? "none" : "magic")}
                className="flex flex-col items-center gap-1"
              >
                <div className={cn(
                  "w-12 h-12 rounded-full backdrop-blur-xl flex items-center justify-center border transition-all",
                  effects.arEffects.length > 0 || effects.challengeId
                    ? "bg-white/20 border-white"
                    : "bg-black/40 border-white/10"
                )}>
                  <Sparkles className="h-5 w-5" />
                </div>
                <span className="text-[10px] text-white/80">Magic</span>
              </button>

              {/* Capture button with burst counter */}
              <div className="relative">
                <button
                  onClick={onPressCapture}
                  className={cn(
                    "w-[72px] h-[72px] rounded-full flex items-center justify-center border-4 transition-all",
                    isRecording
                      ? "bg-red-500 border-red-300/50 scale-110"
                      : "bg-gradient-to-br from-orange-500 to-red-500 border-white/30 hover:scale-105"
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

              <button
                onClick={() => albumInputRef.current?.click()}
                className="flex flex-col items-center gap-1"
              >
                <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-xl flex items-center justify-center border border-white/10">
                  <FolderOpen className="h-5 w-5" />
                </div>
                <span className="text-[10px] text-white/80">Album</span>
              </button>
            </div>
          </div>

          {/* ===== BOTTOM TABS ===== */}
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
                    // Handle duration tabs
                    if (tab.id === '15s') { setLengthSec(15); setMode('video'); }
                    else if (tab.id === '30s') { setLengthSec(30); setMode('video'); }
                    else if (tab.id === '45s') { setLengthSec(45 as any); setMode('video'); }
                    else if (tab.id === '60s') { setLengthSec(60); setMode('video'); }
                    else if (tab.id === 'story') { setLengthSec(15); setMode('video'); }
                    else if (tab.id === 'album') { albumInputRef.current?.click(); }
                    else if (tab.id === 'template') { setDrawer('template'); }
                  }}
                  className={cn(
                    "flex flex-col items-center gap-0.5 transition-all px-2",
                    topTab === tab.id ? "text-white" : "text-white/50"
                  )}
                >
                  <span className="text-xs font-medium">{tab.label}</span>
                  {topTab === tab.id && (
                    <div className="w-4 h-0.5 bg-white rounded-full" />
                  )}
                </button>
              ))}
            </div>
          </div>

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

            {drawer === "length" && (
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
                  className="absolute left-0 right-0 bottom-0 rounded-t-[28px] bg-[#0b0b0e] border-t border-white/10 p-4"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-4" />
                  <div className="font-semibold mb-4 flex items-center gap-2">
                    <Timer className="h-5 w-5" /> Durée & Vitesse
                  </div>
                  <div className="mb-4">
                    <div className="text-xs text-white/60 mb-2">Durée</div>
                    <div className="flex gap-2 flex-wrap">
                      {lengthOptions.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => setLengthSec(opt.value as 15 | 30 | 60 | 180 | 600)}
                          className={cn(
                            "h-10 px-4 rounded-full border text-sm",
                            lengthSec === opt.value
                              ? "bg-white text-black border-white"
                              : "bg-white/10 border-white/20 text-white/80"
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-white/60 mb-2">Vitesse</div>
                    <div className="flex gap-2">
                      {[0.5, 1, 2].map((s) => (
                        <button
                          key={s}
                          onClick={() => setSpeed(s as 0.5 | 1 | 2)}
                          className={cn(
                            "h-10 px-4 rounded-full border text-sm",
                            speed === s
                              ? "bg-white text-black border-white"
                              : "bg-white/10 border-white/20 text-white/80"
                          )}
                        >
                          {s}x
                        </button>
                      ))}
                    </div>
                  </div>
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

          {/* Template Drawer */}
          <AnimatePresence>
            {drawer === "template" && (
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
                  className="absolute left-0 right-0 bottom-0 rounded-t-[28px] bg-[#0b0b0e] border-t border-white/10 p-4 max-h-[70vh] overflow-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-4" />
                  <div className="font-semibold mb-4 flex items-center gap-2">
                    <Sparkles className="h-5 w-5" /> Templates
                  </div>
                  
                  {/* Group by category */}
                  {Object.entries(
                    CULTURAL_TEMPLATES.reduce((acc, tpl) => {
                      if (!acc[tpl.category]) acc[tpl.category] = [];
                      acc[tpl.category].push(tpl);
                      return acc;
                    }, {} as Record<string, typeof CULTURAL_TEMPLATES>)
                  ).map(([category, templates]) => (
                    <div key={category} className="mb-4">
                      <div className="text-xs text-white/50 uppercase mb-2">{category}</div>
                      <div className="space-y-2">
                        {templates.map((tpl) => (
                          <button
                            key={tpl.id}
                            onClick={() => {
                              updateEffects({ templateId: tpl.id });
                              setDrawer("none");
                              setToast(`${tpl.emoji} ${tpl.label}`);
                            }}
                            className={cn(
                              "w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left",
                              effects.templateId === tpl.id
                                ? "bg-white/20 border border-white/30"
                                : "bg-white/5 border border-white/10 hover:bg-white/10"
                            )}
                          >
                            <span className="text-2xl">{tpl.emoji}</span>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm">{tpl.label}</div>
                              <div className="text-xs text-white/50 truncate">{tpl.voicePrompt || `${tpl.suggestedDuration}s • ${tpl.suggestedMode}`}</div>
                            </div>
                            {effects.templateId === tpl.id && (
                              <div className="w-2 h-2 rounded-full bg-white" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Sticker Picker */}
          <AnimatePresence>
            {showStickerPicker && (
              <StickerPicker
                isOpen={showStickerPicker}
                onClose={() => setShowStickerPicker(false)}
                onAddSticker={addSticker}
              />
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
      )}

      {/* ============ PREVIEW STEP ============ */}
      {step === "preview" && (
        <div className="absolute inset-0 bg-black">
          <div className="absolute top-0 left-0 right-0 p-4 z-20 flex items-center justify-between safe-area-top">
            <button
              onClick={retake}
              className="h-11 px-4 rounded-full bg-white/10 backdrop-blur-xl flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" /> Reprendre
            </button>
            <button
              onClick={() => onClose?.()}
              className="h-11 w-11 rounded-full bg-white/10 backdrop-blur-xl flex items-center justify-center"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Preview with effects */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div 
              className={cn("relative w-full h-full", graphicsClasses)}
              style={graphicsStyles}
            >
              {capturedType === "video" ? (
                <video 
                  src={previewUrl} 
                  className="w-full h-full object-contain" 
                  style={{ filter: cssFilter }}
                  controls 
                  playsInline 
                />
              ) : (
                <img 
                  src={previewUrl} 
                  className="w-full h-full object-contain" 
                  alt="preview" 
                />
              )}
              
              {/* Template overlay on preview */}
              <TemplateOverlay templateId={effects.templateId} />
              
              {/* AR effects on preview */}
              <AREffectsLayer activeEffects={effects.arEffects} />
              
              {/* Stickers on preview */}
              <StickerLayer
                stickers={effects.stickers}
                onStickersChange={(stickers) => updateEffects({ stickers })}
                isEditing={true}
              />
            </div>
          </div>

          {/* Challenge badge */}
          {effects.challengeId && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-gradient-to-r from-orange-500/80 to-red-500/80 backdrop-blur-sm border border-white/20 z-30">
              <span className="text-sm font-medium">
                {CHALLENGES.find(c => c.id === effects.challengeId)?.hashtag}
              </span>
            </div>
          )}

          <div className="absolute left-0 right-0 bottom-0 p-4 z-20 safe-area-bottom">
            <button
              onClick={goToEditor}
              className="w-full max-w-sm mx-auto h-14 rounded-full bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold flex items-center justify-center gap-2"
            >
              <Film className="h-5 w-5" />
              Éditer
            </button>
          </div>
        </div>
      )}

      {/* ============ EDITOR STEP ============ */}
      {step === "editor" && (
        <TimelineEditor
          segments={segments}
          onSegmentsChange={setSegments}
          onClose={() => setStep("preview")}
          onConfirm={onEditorConfirm}
        />
      )}

      {/* ============ PUBLISH STEP ============ */}
      {step === "publish" && (
        <div className="absolute inset-0 bg-black">
          <div className="absolute top-0 left-0 right-0 p-4 z-20 flex items-center justify-between safe-area-top">
            <button
              onClick={() => setStep("editor")}
              className="h-11 px-4 rounded-full bg-white/10 backdrop-blur-xl flex items-center gap-2"
            >
              <Film className="h-4 w-4" /> Édition
            </button>
            <button
              onClick={() => onClose?.()}
              className="h-11 w-11 rounded-full bg-white/10 backdrop-blur-xl flex items-center justify-center"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="absolute inset-0 flex items-center justify-center p-6 pt-20">
            <div className="w-full max-w-lg">
              <div className="rounded-3xl bg-white/5 border border-white/10 p-4 backdrop-blur-xl">
                <div className="text-white font-semibold text-lg flex items-center gap-2">
                  Publier
                  {selectedTemplate.id !== 'free' && (
                    <span className="text-sm px-2 py-0.5 rounded-full bg-white/10">
                      {selectedTemplate.emoji} {selectedTemplate.label}
                    </span>
                  )}
                </div>

                <div className="mt-4 rounded-2xl bg-black/40 border border-white/10 p-2 aspect-[9/16] max-h-[200px] overflow-hidden relative">
                  {segments[0]?.type === "video" ? (
                    <video
                      src={URL.createObjectURL(segments[0].blob)}
                      className="w-full h-full object-contain rounded-xl"
                      style={{ filter: cssFilter }}
                      playsInline
                    />
                  ) : segments[0] ? (
                    <img
                      src={URL.createObjectURL(segments[0].blob)}
                      className="w-full h-full object-contain rounded-xl"
                      alt="thumb"
                    />
                  ) : null}
                  
                  {/* Template badge on thumbnail */}
                  {selectedTemplate.id !== 'free' && (
                    <div className="absolute top-2 right-2 px-2 py-1 rounded-full bg-black/60 backdrop-blur-sm text-xs">
                      {selectedTemplate.emoji}
                    </div>
                  )}
                </div>

                {/* Challenge badge */}
                {effects.challengeId && (
                  <div className="mt-3 px-3 py-2 rounded-xl bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30 flex items-center gap-2">
                    <Flame className="h-4 w-4 text-orange-400" />
                    <span className="text-sm text-orange-300">
                      {CHALLENGES.find(c => c.id === effects.challengeId)?.hashtag}
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

                {error && (
                  <div className="mt-3 text-sm text-red-300 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" /> {error}
                  </div>
                )}
              </div>
            </div>
          </div>

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
      )}
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
          active
            ? "bg-white/30 border-2 border-white"
            : "bg-black/40 border border-white/10"
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
      setElapsed(prev => {
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
  const progress = elapsed / maxSeconds;
  const rotation = progress * 360;
  
  return (
    <div className="relative w-24 h-24">
      {/* Outer ring */}
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="4"
        />
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
      
      {/* Needle */}
      <div 
        className="absolute inset-0 flex items-center justify-center"
        style={{ transform: `rotate(${rotation}deg)` }}
      >
        <div className="absolute w-1 h-10 bg-gradient-to-b from-orange-500 to-red-500 rounded-full origin-bottom" 
          style={{ bottom: '50%' }}
        />
      </div>
      
      {/* Center with remaining time */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-16 h-16 rounded-full bg-black/60 backdrop-blur-xl flex items-center justify-center border border-white/20">
          <span className="text-white font-bold text-lg">{remaining}s</span>
        </div>
      </div>
      
      {/* Recording indicator */}
      <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 animate-pulse" />
    </div>
  );
}
