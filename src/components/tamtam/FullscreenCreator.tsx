// src/components/tamtam/FullscreenCreator.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  ChevronDown,
  RotateCcw,
  Zap,
  Timer,
  Gauge,
  Expand,
  Sparkles,
  Eye,
  Flame,
  Wand2,
  Music,
  Camera as CameraIcon,
  Type as TypeIcon,
  Image as ImageIcon,
  Video as VideoIcon,
  Send,
  Loader2,
  AlertCircle,
  LayoutGrid,
  Film,
  Volume2,
  VolumeX,
  MoreHorizontal,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

import TimelineEditor, { TimelineSegment } from "./TimelineEditor";
import {
  VideoFiltersInlinePanel,
  VIDEO_FILTERS,
  VideoFilter,
  scaleCssFilter,
} from "./VideoFilters";

export type CreatorOutputPayload = {
  segments: TimelineSegment[];
  caption: string;
  topTab: TopTab;
  mode: CaptureMode;
  canvasRatio: CanvasRatio;
  selectedFilterId?: string;
};

type TopTab = "video" | "story" | "ai" | "live";
type CaptureMode = "burst" | "photo" | "video" | "text";
type CreatorStep = "capture" | "preview" | "editor" | "publish";

type CanvasRatio = "9:16" | "1:1" | "16:9";

type SidePanel = "none" | "canvasLeft" | "filtersRight";
type DrawerPanel =
  | "none"
  | "inspiring"
  | "shotTips"
  | "coverTips"
  | "challenge"
  | "recommendedFilter"
  | "magic";

export interface FullscreenCreatorProps {
  open?: boolean;
  onClose?: () => void;

  // called when user presses final "Publish"
  onPublish?: (payload: {
    segments: TimelineSegment[];
    caption: string;
    topTab: TopTab;
    mode: CaptureMode;
    canvasRatio: CanvasRatio;
    selectedFilterId?: string;
  }) => Promise<void> | void;
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
    "video/mp4", // may fail in many browsers; ok to try
  ];
  // @ts-ignore
  const MR = typeof window !== "undefined" ? window.MediaRecorder : undefined;
  if (!MR || !MR.isTypeSupported) return undefined;
  for (const c of candidates) {
    try {
      if (MR.isTypeSupported(c)) return c;
    } catch {}
  }
  return undefined;
}

async function capturePhotoFromVideo(videoEl: HTMLVideoElement, ratio: CanvasRatio): Promise<Blob> {
  const w = videoEl.videoWidth || 1080;
  const h = videoEl.videoHeight || 1920;

  // We keep aspect ratio (no deformation). We may crop (cover-like) to match ratio.
  const target = (() => {
    if (ratio === "1:1") return { tw: 1080, th: 1080 };
    if (ratio === "16:9") return { tw: 1920, th: 1080 };
    return { tw: 1080, th: 1920 }; // 9:16
  })();

  const canvas = document.createElement("canvas");
  canvas.width = target.tw;
  canvas.height = target.th;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No canvas context");

  // cover crop
  const srcAR = w / h;
  const dstAR = target.tw / target.th;

  let sx = 0, sy = 0, sw = w, sh = h;
  if (srcAR > dstAR) {
    // source wider => crop left/right
    sw = Math.round(h * dstAR);
    sx = Math.round((w - sw) / 2);
  } else {
    // source taller => crop top/bottom
    sh = Math.round(w / dstAR);
    sy = Math.round((h - sh) / 2);
  }

  ctx.drawImage(videoEl, sx, sy, sw, sh, 0, 0, target.tw, target.th);

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Photo blob failed"))),
      "image/jpeg",
      0.92
    );
  });

  return blob;
}

async function renderTextToImage(text: string, ratio: CanvasRatio): Promise<Blob> {
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

  // background (simple premium gradient)
  const g = ctx.createLinearGradient(0, 0, size.w, size.h);
  g.addColorStop(0, "#0f172a");
  g.addColorStop(1, "#111827");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size.w, size.h);

  // text block
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

  // subtle card
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
  return lines.slice(0, 6); // keep it clean
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
  // ⚠️ CRITICAL: Early return MUST be BEFORE any hooks to avoid React hook violations
  // When open is false, we render nothing, but hooks must always run in the same order
  // So we use a wrapper pattern instead

  const [step, setStep] = useState<CreatorStep>("capture");

  const [topTab, setTopTab] = useState<TopTab>("video");
  const [mode, setMode] = useState<CaptureMode>("video");

  const [canvasRatio, setCanvasRatio] = useState<CanvasRatio>("9:16");

  // side panels
  const [sidePanel, setSidePanel] = useState<SidePanel>("none");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerPanel, setDrawerPanel] = useState<DrawerPanel>("none");

  // camera
  const [facing, setFacing] = useState<"user" | "environment">("environment");
  const [flashSim, setFlashSim] = useState(false); // web cannot control real flash (simulate)
  const [timerSec, setTimerSec] = useState<0 | 3 | 10>(0);
  const [speed, setSpeed] = useState<0.5 | 1 | 2>(1);
  const [lengthSec, setLengthSec] = useState<15 | 30 | 60>(30);
  const [isRecording, setIsRecording] = useState(false);

  const [hudVisible, setHudVisible] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // filters
  const [filterId, setFilterId] = useState<string>("original");
  const filter = useMemo<VideoFilter | undefined>(
    () => VIDEO_FILTERS.find((f) => f.id === filterId) ?? VIDEO_FILTERS[0],
    [filterId]
  );
  const cssFilter = useMemo(() => {
    const base = filter?.cssFilter ?? "none";
    return scaleCssFilter(base);
  }, [filter?.cssFilter]);

  // stream/recorder refs
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  // capture outputs
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [capturedType, setCapturedType] = useState<"video" | "photo" | "audio">("video");
  const [previewUrl, setPreviewUrl] = useState<string>("");

  // editor
  const [segments, setSegments] = useState<TimelineSegment[]>([]);

  // publish
  const [caption, setCaption] = useState("");

  // clean toast
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 900);
    return () => window.clearTimeout(t);
  }, [toast]);

  // gestureRef moved here (before early return)
  const gestureRef = useRef<{ x0: number; y0: number; active: boolean; edge: "left" | "right" | "center" } | null>(
    null
  );

  // modeLabel moved here (before early return)
  const modeLabel = useMemo(() => {
    if (mode === "burst") return "Burst";
    if (mode === "photo") return "Photo";
    if (mode === "video") return "Vidéo";
    return "Texte";
  }, [mode]);

  /** ====== Camera bootstrap ====== */
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
        video: {
          facingMode: facing,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: mode === "video", // only need mic for video
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
    } catch (e: any) {
      setError(e?.message || "Impossible d’accéder à la caméra.");
    }
  };

  useEffect(() => {
    if (step !== "capture") return;
    startStream();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, facing, mode]);

  // cleanup urls
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

  // ⚠️ CRITICAL: Early return MUST be AFTER all hooks to avoid React hook violations
  if (!open) return null;

  /** ====== MediaRecorder helpers (BUGFIX: deterministic stop -> blob) ====== */
  const startRecording = async () => {
    setError(null);
    if (!streamRef.current) await startStream();
    if (!streamRef.current) return;

    if (!isMediaRecorderSupported()) {
      setError("Enregistrement vidéo non supporté sur ce navigateur.");
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

      rec.start(200); // small chunks
      setIsRecording(true);
      setToast("REC ●");
    } catch (e: any) {
      setError(e?.message || "Impossible de démarrer l’enregistrement.");
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

  /** ====== Capture actions ====== */
  const runTimerIfNeeded = async () => {
    if (timerSec === 0) return;
    setToast(`${timerSec}s…`);
    await new Promise((r) => setTimeout(r, timerSec * 1000));
    setToast(null);
  };

  const onPressCapture = async () => {
    setError(null);

    // TEXT mode -> generate image blob and go preview
    if (mode === "text") {
      try {
        await runTimerIfNeeded();
        stopStream(); // we don't need camera for text
        const b = await renderTextToImage(caption || "Texte", canvasRatio);
        setCapturedType("photo");
        setCapturedBlob(b);
        setStep("preview");
        setSidePanel("none");
        setDrawerOpen(false);
        setDrawerPanel("none");
        return;
      } catch (e: any) {
        setError(e?.message || "Erreur texte");
        return;
      }
    }

    // PHOTO mode
    if (mode === "photo") {
      try {
        await runTimerIfNeeded();
        if (!videoRef.current) throw new Error("Preview video not ready");
        const b = await capturePhotoFromVideo(videoRef.current, canvasRatio);
        setCapturedType("photo");
        setCapturedBlob(b);
        setStep("preview");
        setSidePanel("none");
        setDrawerOpen(false);
        setDrawerPanel("none");
        return;
      } catch (e: any) {
        setError(e?.message || "Erreur photo");
        return;
      }
    }

    // VIDEO mode
    if (mode === "video") {
      try {
        if (!isRecording) {
          await runTimerIfNeeded();
          await startRecording();
        } else {
          const b = await stopRecordingToBlob();
          stopStream(); // release camera while preview/editor
          setCapturedType("video");
          setCapturedBlob(b);
          setStep("preview"); // ✅ always goes preview first (clean)
          setSidePanel("none");
          setDrawerOpen(false);
          setDrawerPanel("none");
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

    const segType =
      capturedType === "video" ? "video" : "photo";

    const duration =
      segType === "video" ? lengthSec : 5;

    const seg: TimelineSegment = {
      id: `${Date.now()}`,
      blob: capturedBlob,
      type: segType,
      duration,
      startTime: 0,
      endTime: duration,
      isMuted: false,
      volume: 100,
      filter: filterId,
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
    setHudVisible(true);
    setSidePanel("none");
    setDrawerOpen(false);
    setDrawerPanel("none");
  };

  const onEditorConfirm = async (nextSegments: TimelineSegment[]) => {
    // After editing, go to publish step
    setSegments(nextSegments);
    setStep("publish");
  };

  const publish = async () => {
    try {
      setError(null);
      if (!segments.length) throw new Error("Aucun contenu à publier.");
      if (onPublish) {
        await onPublish({
          segments,
          caption,
          topTab,
          mode,
          canvasRatio,
          selectedFilterId: filterId,
        });
      }
      setToast("Publié ✓");
      // close creator
      onClose?.();
    } catch (e: any) {
      setError(e?.message || "Erreur publication");
    }
  };

  /** ====== Gestures: edge swipe + swipe up drawer + filter swipe ====== */
  // gestureRef is declared earlier (before early return) to avoid hook violations

  const onSurfaceDown = (e: React.PointerEvent) => {
    const w = window.innerWidth || 390;
    const x = e.clientX;
    const edge = x < 24 ? "left" : x > w - 24 ? "right" : "center";
    gestureRef.current = { x0: e.clientX, y0: e.clientY, active: true, edge };
  };

  const onSurfaceMove = (e: React.PointerEvent) => {
    if (!gestureRef.current?.active) return;
    const dx = e.clientX - gestureRef.current.x0;
    const dy = e.clientY - gestureRef.current.y0;

    // swipe up => drawer tools
    if (dy < -70 && Math.abs(dx) < 70) {
      gestureRef.current.active = false;
      setDrawerOpen(true);
      setDrawerPanel("none");
      setSidePanel("none");
      setHudVisible(true);
      return;
    }

    // edge swipe right from left => Canvas
    if (gestureRef.current.edge === "left" && dx > 80 && Math.abs(dy) < 70) {
      gestureRef.current.active = false;
      setSidePanel((p) => (p === "canvasLeft" ? "none" : "canvasLeft"));
      setDrawerOpen(false);
      setDrawerPanel("none");
      setHudVisible(true);
      return;
    }

    // edge swipe left from right => Filters/Effects
    if (gestureRef.current.edge === "right" && dx < -80 && Math.abs(dy) < 70) {
      gestureRef.current.active = false;
      setSidePanel((p) => (p === "filtersRight" ? "none" : "filtersRight"));
      setDrawerOpen(false);
      setDrawerPanel("none");
      setHudVisible(true);
      return;
    }

    // swipe left/right in center => quick filter step (only in capture)
    if (gestureRef.current.edge === "center" && step === "capture" && Math.abs(dy) < 60 && Math.abs(dx) > 90) {
      gestureRef.current.active = false;
      const idx = VIDEO_FILTERS.findIndex((f) => f.id === filterId);
      const dir = dx < 0 ? 1 : -1;
      const next = clamp(idx + dir, 0, VIDEO_FILTERS.length - 1);
      setFilterId(VIDEO_FILTERS[next].id);
      setToast(`Filtre: ${VIDEO_FILTERS[next].name}`);
      return;
    }
  };

  const onSurfaceUp = () => {
    if (gestureRef.current) gestureRef.current.active = false;
  };

  const toggleHud = () => {
    setHudVisible((v) => !v);
    setSidePanel("none");
    setDrawerOpen(false);
    setDrawerPanel("none");
  };

  /** ====== Derived labels ====== */
  // modeLabel is declared earlier (before early return) to avoid hook violations

  return (
    <div className="fixed inset-0 z-[100] bg-black text-white">
      {/* CAPTURE */}
      {step === "capture" ? (
        <div
          className="absolute inset-0"
          onPointerDown={onSurfaceDown}
          onPointerMove={onSurfaceMove}
          onPointerUp={onSurfaceUp}
          onClick={() => toggleHud()}
        >
          {/* Camera preview */}
          <div className="absolute inset-0">
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
            {/* Flash simulation */}
            <AnimatePresence>
              {flashSim ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.08 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-white pointer-events-none"
                />
              ) : null}
            </AnimatePresence>
          </div>

          {/* Side panel LEFT: Canvas */}
          <AnimatePresence>
            {sidePanel === "canvasLeft" ? (
              <motion.div
                initial={{ x: -360, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -360, opacity: 0 }}
                transition={{ type: "spring", damping: 26, stiffness: 260 }}
                className="absolute left-0 top-0 bottom-0 w-[320px] z-[120] bg-[#0b0b0e]/95 border-r border-white/10 backdrop-blur"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-3 flex items-center justify-between border-b border-white/10">
                  <div className="font-semibold flex items-center gap-2">
                    <LayoutGrid className="h-4 w-4" /> Canvas
                  </div>
                  <button
                    onClick={() => setSidePanel("none")}
                    className="h-9 w-9 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="p-3">
                  <div className="text-xs text-white/60">Ratio</div>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    <SideBtn label="9:16" active={canvasRatio === "9:16"} onClick={() => setCanvasRatio("9:16")} />
                    <SideBtn label="1:1" active={canvasRatio === "1:1"} onClick={() => setCanvasRatio("1:1")} />
                    <SideBtn label="16:9" active={canvasRatio === "16:9"} onClick={() => setCanvasRatio("16:9")} />
                  </div>

                  <div className="mt-4 rounded-2xl bg-white/5 border border-white/10 p-3 text-xs text-white/70">
                    Edge swipe depuis gauche ouvre/ferme Canvas.
                  </div>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {/* Side panel RIGHT: Filters/Effects */}
          <AnimatePresence>
            {sidePanel === "filtersRight" ? (
              <motion.div
                initial={{ x: 360, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 360, opacity: 0 }}
                transition={{ type: "spring", damping: 26, stiffness: 260 }}
                className="absolute right-0 top-0 bottom-0 w-[340px] z-[120] bg-[#0b0b0e]/95 border-l border-white/10 backdrop-blur"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-3 flex items-center justify-between border-b border-white/10">
                  <div className="font-semibold flex items-center gap-2">
                    <Film className="h-4 w-4" /> Filters / Effects
                  </div>
                  <button
                    onClick={() => setSidePanel("none")}
                    className="h-9 w-9 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="p-3">
                  <VideoFiltersInlinePanel
                    selectedId={filterId}
                    onSelect={(id) => setFilterId(id)}
                  />

                  <div className="mt-4 rounded-2xl bg-white/5 border border-white/10 p-3">
                    <div className="text-xs text-white/60 mb-2">Effects rapides</div>
                    <div className="grid grid-cols-2 gap-2">
                      {["Cinematic", "Vlog", "Vintage", "Dramatic"].map((p) => (
                        <QuickBtn key={p} label={p} onClick={() => setToast(`Effect: ${p}`)} />
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl bg-white/5 border border-white/10 p-3 text-xs text-white/70">
                    Edge swipe depuis droite ouvre/ferme Filters.
                  </div>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {/* HUD */}
          <AnimatePresence>
            {hudVisible ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0">
                {/* Top bar */}
                <div className="absolute top-0 left-0 right-0 p-3 z-30 flex items-center justify-between pointer-events-auto">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onClose?.();
                    }}
                    className="h-10 w-10 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center"
                    title="Fermer"
                  >
                    <X className="h-5 w-5" />
                  </button>

                  <div className="flex items-center gap-2 bg-black/35 border border-white/10 rounded-2xl px-3 py-2 backdrop-blur">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setTopTab("video");
                      }}
                      className={cn("text-xs px-2 py-1 rounded-xl", topTab === "video" ? "bg-white/15" : "text-white/70")}
                    >
                      Video
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setTopTab("story");
                      }}
                      className={cn("text-xs px-2 py-1 rounded-xl", topTab === "story" ? "bg-white/15" : "text-white/70")}
                    >
                      Story
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setTopTab("ai");
                      }}
                      className={cn("text-xs px-2 py-1 rounded-xl", topTab === "ai" ? "bg-white/15" : "text-white/70")}
                    >
                      AI
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setTopTab("live");
                      }}
                      className={cn("text-xs px-2 py-1 rounded-xl", topTab === "live" ? "bg-white/15" : "text-white/70")}
                    >
                      LIVE
                    </button>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleHud();
                    }}
                    className="h-10 w-10 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center"
                    title="Masquer HUD"
                  >
                    <MoreHorizontal className="h-5 w-5" />
                  </button>
                </div>

                {/* Right rail (essentials) */}
                <div className="absolute right-3 top-20 z-30 flex flex-col gap-2 pointer-events-auto">
                  <MiniBtn
                    title="Canvas (edge swipe gauche)"
                    icon={<LayoutGrid className="h-5 w-5" />}
                    active={sidePanel === "canvasLeft"}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSidePanel((p) => (p === "canvasLeft" ? "none" : "canvasLeft"));
                      setDrawerOpen(false);
                      setDrawerPanel("none");
                    }}
                  />
                  <MiniBtn
                    title="Filters (edge swipe droite)"
                    icon={<Film className="h-5 w-5" />}
                    active={sidePanel === "filtersRight"}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSidePanel((p) => (p === "filtersRight" ? "none" : "filtersRight"));
                      setDrawerOpen(false);
                      setDrawerPanel("none");
                    }}
                  />
                  <MiniBtn
                    title="Switch camera"
                    icon={<RotateCcw className="h-5 w-5" />}
                    onClick={(e) => {
                      e.stopPropagation();
                      setFacing((f) => (f === "environment" ? "user" : "environment"));
                    }}
                  />
                  <MiniBtn
                    title="Flash (web simulation)"
                    icon={<Zap className="h-5 w-5" />}
                    active={flashSim}
                    onClick={(e) => {
                      e.stopPropagation();
                      setFlashSim((v) => !v);
                    }}
                  />
                  <MiniBtn
                    title="Timer"
                    icon={<Timer className="h-5 w-5" />}
                    onClick={(e) => {
                      e.stopPropagation();
                      setTimerSec((t) => (t === 0 ? 3 : t === 3 ? 10 : 0));
                      setToast(timerSec === 0 ? "Timer 3s" : timerSec === 3 ? "Timer 10s" : "Timer Off");
                    }}
                  />
                  <MiniBtn
                    title="Speed"
                    icon={<Gauge className="h-5 w-5" />}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSpeed((s) => (s === 1 ? 2 : s === 2 ? 0.5 : 1));
                      setToast(speed === 1 ? "Speed 2x" : speed === 2 ? "Speed 0.5x" : "Speed 1x");
                    }}
                  />
                  <MiniBtn
                    title="Fullscreen"
                    icon={<Expand className="h-5 w-5" />}
                    onClick={(e) => {
                      e.stopPropagation();
                      setToast("Fullscreen ✓");
                    }}
                  />
                </div>

                {/* Bottom controls */}
                <div className="absolute left-0 right-0 bottom-0 z-30 p-4 pointer-events-auto">
                  <div className="mx-auto max-w-[920px]">
                    {/* Drawer handle / hint */}
                    <div className="flex items-center justify-center mb-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDrawerOpen(true);
                          setDrawerPanel("none");
                          setSidePanel("none");
                        }}
                        className="h-7 px-3 rounded-full bg-black/35 border border-white/10 backdrop-blur flex items-center gap-2 text-xs text-white/80"
                      >
                        <ChevronDown className="h-4 w-4 rotate-180" />
                        Outils (swipe ↑)
                      </button>
                    </div>

                    <div className="rounded-3xl bg-black/45 border border-white/10 backdrop-blur p-3">
                      <div className="flex items-center justify-between gap-3">
                        {/* Modes */}
                        <div className="flex items-center gap-2">
                          <ModeBtn
                            label="Burst"
                            icon={<Zap className="h-4 w-4" />}
                            active={mode === "burst"}
                            onClick={() => setMode("burst")}
                          />
                          <ModeBtn
                            label="Photo"
                            icon={<ImageIcon className="h-4 w-4" />}
                            active={mode === "photo"}
                            onClick={() => setMode("photo")}
                          />
                          <ModeBtn
                            label="Vidéo"
                            icon={<VideoIcon className="h-4 w-4" />}
                            active={mode === "video"}
                            onClick={() => setMode("video")}
                          />
                          <ModeBtn
                            label="Texte"
                            icon={<TypeIcon className="h-4 w-4" />}
                            active={mode === "text"}
                            onClick={() => setMode("text")}
                          />
                        </div>

                        {/* Capture button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onPressCapture();
                          }}
                          className={cn(
                            "h-14 w-14 rounded-full flex items-center justify-center border",
                            isRecording ? "bg-red-500/90 border-red-300/40" : "bg-white/15 border-white/25 hover:bg-white/20"
                          )}
                          title={mode === "video" ? (isRecording ? "Stop" : "Record") : "Capture"}
                        >
                          {isRecording ? <div className="h-5 w-5 rounded bg-white" /> : <CameraIcon className="h-6 w-6" />}
                        </button>

                        {/* Music / quick info */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setToast("Music picker (todo)");
                          }}
                          className="h-12 px-4 rounded-2xl bg-white/10 border border-white/10 flex items-center gap-2"
                        >
                          <Music className="h-4 w-4" />
                          Music
                        </button>
                      </div>

                      <div className="mt-2 text-[11px] text-white/65 flex items-center justify-between">
                        <div>
                          {modeLabel} · Speed {speed}x · Length {lengthSec}s · Timer {timerSec ? `${timerSec}s` : "Off"} · Canvas {canvasRatio}
                        </div>
                        <div className="text-white/50">Filtre: {filter?.name ?? "Original"} (swipe ←/→)</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Small overlay hint for edge swipe */}
                <div className="absolute left-3 bottom-28 text-[11px] text-white/55 bg-black/35 border border-white/10 rounded-2xl px-3 py-2 backdrop-blur">
                  Edge swipe: Canvas (gauche) / Filters (droite)
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {/* Drawer tools bottom */}
          <AnimatePresence>
            {drawerOpen ? (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 30 }}
                className="absolute inset-0 z-[130] bg-black/60 backdrop-blur flex items-end"
                onClick={() => {
                  setDrawerOpen(false);
                  setDrawerPanel("none");
                }}
              >
                <div
                  className="w-full rounded-t-[28px] bg-[#0b0b0e] border-t border-white/10 p-4"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-white font-semibold flex items-center gap-2">
                      <Sparkles className="h-4 w-4" /> Assistance créative
                    </div>
                    <button
                      onClick={() => {
                        setDrawerOpen(false);
                        setDrawerPanel("none");
                      }}
                      className="h-10 w-10 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-3 grid grid-cols-3 sm:grid-cols-6 gap-2">
                    <DrawerTab label="Inspiring" icon={<Eye className="h-4 w-4" />} active={drawerPanel === "inspiring"} onClick={() => setDrawerPanel("inspiring")} />
                    <DrawerTab label="Shot tips" icon={<Sparkles className="h-4 w-4" />} active={drawerPanel === "shotTips"} onClick={() => setDrawerPanel("shotTips")} />
                    <DrawerTab label="Cover tips" icon={<ImageIcon className="h-4 w-4" />} active={drawerPanel === "coverTips"} onClick={() => setDrawerPanel("coverTips")} />
                    <DrawerTab label="Challenge" icon={<Flame className="h-4 w-4" />} active={drawerPanel === "challenge"} onClick={() => setDrawerPanel("challenge")} />
                    <DrawerTab label="Recommended" icon={<Check className="h-4 w-4" />} active={drawerPanel === "recommendedFilter"} onClick={() => setDrawerPanel("recommendedFilter")} />
                    <DrawerTab label="Magic" icon={<Wand2 className="h-4 w-4" />} active={drawerPanel === "magic"} onClick={() => setDrawerPanel("magic")} />
                  </div>

                  <div className="mt-3">
                    {drawerPanel === "none" ? (
                      <PanelCard title="Mode Kuaishou (clean)" desc="Tout est accessible sans encombrer l’écran.">
                        <QuickBtn label="Inspiring" onClick={() => setDrawerPanel("inspiring")} />
                        <QuickBtn label="Shot tips" onClick={() => setDrawerPanel("shotTips")} />
                        <QuickBtn label="Challenge" onClick={() => setDrawerPanel("challenge")} />
                        <QuickBtn label="Recommended filter" onClick={() => setDrawerPanel("recommendedFilter")} />
                      </PanelCard>
                    ) : null}

                    {drawerPanel === "inspiring" ? (
                      <PanelCard title="Inspiring" desc="Lutte contre la page blanche.">
                        <SmallLine text="Idée: annonce courte + promesse + appel à s’abonner." />
                        <SmallLine text="Hook: question directe + preuve rapide." />
                        <SmallLine text="Structure: 1 problème → 1 solution → 1 action." />
                        <SmallLine text="Astuce: phrase ultra courte, gestes clairs." />
                      </PanelCard>
                    ) : null}

                    {drawerPanel === "shotTips" ? (
                      <PanelCard title="Shot tips" desc="Guidage tournage.">
                        <SmallLine text="1 action par plan, gestes nets." />
                        <SmallLine text="Plan serré sur visage/objet, fond simple." />
                        <SmallLine text="Lumière face à toi, éviter contre-jour." />
                        <SmallLine text="Parle fort et lentement, phrases courtes." />
                      </PanelCard>
                    ) : null}

                    {drawerPanel === "coverTips" ? (
                      <PanelCard title="Cover tips" desc="Optimisation CTR.">
                        <SmallLine text="Visage/objet centré + titre très court." />
                        <SmallLine text="Texte gros (3–5 mots), contraste fort." />
                        <SmallLine text="Éviter trop d’éléments, 1 message." />
                        <SmallLine text="Expression émotionnelle (surprise/joie)." />
                      </PanelCard>
                    ) : null}

                    {drawerPanel === "challenge" ? (
                      <PanelCard title="Challenge" desc="Viralisation.">
                        <QuickBtn label="#DanceChallenge" onClick={() => setToast("Challenge: #DanceChallenge")} />
                        <QuickBtn label="#MarketDay" onClick={() => setToast("Challenge: #MarketDay")} />
                        <QuickBtn label="#BeforeAfter" onClick={() => setToast("Challenge: #BeforeAfter")} />
                        <QuickBtn label="#StoryTime" onClick={() => setToast("Challenge: #StoryTime")} />
                      </PanelCard>
                    ) : null}

                    {drawerPanel === "recommendedFilter" ? (
                      <PanelCard title="Recommended filter" desc="IA proactive (simulation).">
                        <SmallLine text="Suggestion: Vlog (lumière douce)" />
                        <SmallLine text="Suggestion: Cinematic (contraste + LUT)" />
                        <SmallLine text="Suggestion: Beauty (peau + glow)" />
                        <QuickBtn
                          label="Appliquer: Vlog"
                          onClick={() => {
                            const vlog = VIDEO_FILTERS.find((f) => f.name.toLowerCase().includes("vlog")) ?? VIDEO_FILTERS[1];
                            setFilterId(vlog.id);
                            setToast("Filtre recommandé appliqué");
                          }}
                        />
                      </PanelCard>
                    ) : null}

                    {drawerPanel === "magic" ? (
                      <PanelCard title="Magic" desc="IA / AR (placeholder).">
                        <SmallLine text="Face recognition (détection visage)" />
                        <SmallLine text="Emoji face (stickers sur visage)" />
                        <SmallLine text="Object tracking (suivi dynamique)" />
                        <SmallLine text="Auto recommend (suggestions)" />
                        <QuickBtn label="Magic: ON" onClick={() => setToast("Magic ON")} />
                      </PanelCard>
                    ) : null}
                  </div>

                  <div className="mt-3 text-xs text-white/60">
                    Swipe ↑ ouvre. Tap dehors ferme. Edge swipe = Canvas/Filters. Swipe ←/→ = changer filtre.
                  </div>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {/* Errors */}
          <AnimatePresence>
            {error ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute left-1/2 -translate-x-1/2 bottom-28 z-[200] px-3 py-2 rounded-2xl bg-red-500/20 border border-red-400/30 backdrop-blur text-xs flex items-center gap-2"
                onClick={(e) => e.stopPropagation()}
              >
                <AlertCircle className="h-4 w-4" />
                {error}
              </motion.div>
            ) : null}
          </AnimatePresence>

          {/* Toast */}
          <AnimatePresence>
            {toast ? (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="absolute top-16 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-black/55 border border-white/10 text-white text-xs backdrop-blur z-[200]"
                onClick={(e) => e.stopPropagation()}
              >
                {toast}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      ) : null}

      {/* PREVIEW */}
      {step === "preview" ? (
        <div className="absolute inset-0 bg-black">
          <div className="absolute top-0 left-0 right-0 p-3 z-20 flex items-center justify-between">
            <button
              onClick={() => retake()}
              className="h-10 px-3 rounded-2xl bg-white/10 border border-white/10 flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" /> Reprendre
            </button>

            <button
              onClick={() => onClose?.()}
              className="h-10 w-10 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="absolute inset-0 flex items-center justify-center">
            {capturedType === "video" ? (
              <video src={previewUrl} className="w-full h-full object-contain" controls playsInline />
            ) : (
              <img src={previewUrl} className="w-full h-full object-contain" alt="preview" />
            )}
          </div>

          <div className="absolute left-0 right-0 bottom-0 p-4 z-20">
            <div className="mx-auto max-w-[920px] rounded-3xl bg-black/45 border border-white/10 backdrop-blur p-3 flex items-center justify-between">
              <div className="text-xs text-white/70">
                Preview · Canvas {canvasRatio} · Filtre {filter?.name ?? "Original"}
              </div>

              <button
                onClick={() => goToEditor()}
                className="h-12 px-5 rounded-2xl bg-orange-500/90 hover:bg-orange-500 text-white font-semibold flex items-center gap-2"
              >
                <Film className="h-5 w-5" />
                Éditer
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* EDITOR */}
      {step === "editor" ? (
        <TimelineEditor
          segments={segments}
          onSegmentsChange={setSegments}
          onClose={() => {
            // go back to preview for safety
            setStep("preview");
          }}
          onConfirm={onEditorConfirm}
        />
      ) : null}

      {/* PUBLISH */}
      {step === "publish" ? (
        <div className="absolute inset-0 bg-black">
          <div className="absolute top-0 left-0 right-0 p-3 z-20 flex items-center justify-between">
            <button
              onClick={() => setStep("editor")}
              className="h-10 px-3 rounded-2xl bg-white/10 border border-white/10 flex items-center gap-2"
            >
              <Film className="h-4 w-4" /> Retour édition
            </button>

            <button
              onClick={() => onClose?.()}
              className="h-10 w-10 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="absolute inset-0 flex items-center justify-center p-6">
            <div className="w-full max-w-[720px] rounded-3xl bg-white/5 border border-white/10 p-4 backdrop-blur">
              <div className="text-white font-semibold">Publier</div>
              <div className="text-xs text-white/60 mt-1">
                Canvas {canvasRatio} · Filtre {filter?.name ?? "Original"}
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-2xl bg-black/40 border border-white/10 p-2">
                  {segments[0]?.type === "video" ? (
                    <video
                      src={URL.createObjectURL(segments[0].blob)}
                      className="w-full aspect-[9/16] object-contain rounded-xl bg-black"
                      controls
                      playsInline
                    />
                  ) : (
                    <img
                      src={URL.createObjectURL(segments[0].blob)}
                      className="w-full aspect-[9/16] object-contain rounded-xl bg-black"
                      alt="thumb"
                    />
                  )}
                </div>

                <div>
                  <label className="text-xs text-white/70">Caption / texte</label>
                  <textarea
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Écris une description courte…"
                    className="mt-2 w-full min-h-[160px] rounded-2xl bg-white/5 border border-white/10 p-3 text-white placeholder:text-white/40 outline-none"
                  />
                  <div className="mt-2 text-[11px] text-white/50">
                    Astuce: 1 phrase + 3 hashtags + appel à l’action.
                  </div>

                  <button
                    onClick={() => publish()}
                    className="mt-4 h-12 w-full rounded-2xl bg-orange-500/90 hover:bg-orange-500 text-white font-semibold flex items-center justify-center gap-2"
                  >
                    <Send className="h-5 w-5" />
                    Publier
                  </button>

                  {error ? (
                    <div className="mt-3 text-xs text-red-300 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" /> {error}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          {/* Toast */}
          <AnimatePresence>
            {toast ? (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="absolute top-16 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-black/55 border border-white/10 text-white text-xs backdrop-blur z-[200]"
              >
                {toast}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      ) : null}
    </div>
  );
}

/** UI atoms */
function MiniBtn({
  title,
  icon,
  onClick,
  active,
  disabled,
}: {
  title: string;
  icon: React.ReactNode;
  onClick: (e: any) => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "w-12 h-12 rounded-2xl flex items-center justify-center",
        "bg-black/35 border border-white/10 backdrop-blur hover:bg-black/45",
        active ? "ring-2 ring-white/25" : "",
        disabled ? "opacity-40 cursor-not-allowed" : ""
      )}
    >
      {icon}
    </button>
  );
}

function ModeBtn({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        "h-11 px-3 rounded-2xl border text-xs flex items-center gap-2",
        active ? "bg-white/15 border-white/25" : "bg-white/10 border-white/10 text-white/80 hover:bg-white/15"
      )}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function DrawerTab({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "h-11 rounded-2xl border text-white text-xs flex items-center justify-center gap-2",
        active ? "bg-white/15 border-white/25" : "bg-white/10 border-white/10 hover:bg-white/15"
      )}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function PanelCard({
  title,
  desc,
  children,
}: {
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-3">
      <div className="font-semibold">{title}</div>
      <div className="text-xs text-white/70 mt-1">{desc}</div>
      <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">{children}</div>
    </div>
  );
}

function QuickBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="h-11 rounded-2xl bg-white/10 border border-white/10 text-white text-xs flex items-center justify-center hover:bg-white/15"
    >
      {label}
    </button>
  );
}

function SideBtn({ label, active, onClick }: { label: string; active?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "h-11 rounded-2xl border text-xs flex items-center justify-center",
        active ? "bg-white/15 border-white/25" : "bg-white/10 border-white/10 hover:bg-white/15"
      )}
    >
      {label}
    </button>
  );
}

function SmallLine({ text }: { text: string }) {
  return (
    <div className="col-span-2 sm:col-span-4 rounded-2xl bg-black/30 border border-white/10 p-3 text-xs text-white/80">
      {text}
    </div>
  );
}
