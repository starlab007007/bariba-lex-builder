import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  RotateCcw,
  Camera as CameraIcon,
  Image as ImageIcon,
  Video as VideoIcon,
  Type as TypeIcon,
  LayoutGrid,
  Film,
  Send,
  AlertCircle,
  ChevronDown,
  Sparkles,
  Eye,
  Flame,
  Wand2,
  Check,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";

import TimelineEditor, { TimelineSegment, EditorExport } from "./TimelineEditor";
import { VIDEO_FILTERS, getFilterById, scaleCssFilter, normalizeFilterId } from "./VideoFilters";
import { VideoFiltersInlinePanel } from "./VideoFilters";

type CreatorStep = "capture" | "preview" | "editor" | "publish";
type CaptureMode = "photo" | "video" | "text";
type CanvasRatio = "9:16" | "1:1" | "16:9";

type SidePanel = "none" | "canvasLeft" | "filtersRight";
type DrawerPanel = "none" | "inspiring" | "shotTips" | "coverTips" | "challenge" | "recommendedFilter" | "magic";

export interface FullscreenCreatorProps {
  isOpen?: boolean; // IMPORTANT: default false
  onClose: () => void;

  // Parent publishes. Creator just returns final blob + meta.
  onComplete: (payload: {
    mediaBlob: Blob;
    mediaType: "video" | "photo";
    caption: string;
    ratio: CanvasRatio;
    appliedFilterId: string;
    editsMeta: any;
  }) => Promise<void> | void;

  language?: "fr" | "ba";
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function pickMimeType(): string | undefined {
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
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

async function blobToObjectURL(blob: Blob) {
  return URL.createObjectURL(blob);
}

async function capturePhotoFromVideo(videoEl: HTMLVideoElement, ratio: CanvasRatio): Promise<Blob> {
  const vw = videoEl.videoWidth || 1080;
  const vh = videoEl.videoHeight || 1920;

  const target = (() => {
    if (ratio === "1:1") return { w: 1080, h: 1080 };
    if (ratio === "16:9") return { w: 1920, h: 1080 };
    return { w: 1080, h: 1920 };
  })();

  const canvas = document.createElement("canvas");
  canvas.width = target.w;
  canvas.height = target.h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context unavailable");

  // cover crop (no deformation)
  const srcAR = vw / vh;
  const dstAR = target.w / target.h;
  let sx = 0, sy = 0, sw = vw, sh = vh;

  if (srcAR > dstAR) {
    sw = Math.round(vh * dstAR);
    sx = Math.round((vw - sw) / 2);
  } else {
    sh = Math.round(vw / dstAR);
    sy = Math.round((vh - sh) / 2);
  }

  ctx.drawImage(videoEl, sx, sy, sw, sh, 0, 0, target.w, target.h);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Photo blob failed"))), "image/jpeg", 0.92);
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
  if (!ctx) throw new Error("Canvas ctx missing");

  // bg gradient
  const g = ctx.createLinearGradient(0, 0, size.w, size.h);
  g.addColorStop(0, "#0b1220");
  g.addColorStop(1, "#0a0a0f");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size.w, size.h);

  // card
  const cardW = size.w - 160;
  const cardH = 420;
  const cardX = (size.w - cardW) / 2;
  const cardY = (size.h - cardH) / 2;

  ctx.fillStyle = "rgba(255,255,255,0.06)";
  roundRect(ctx, cardX, cardY, cardW, cardH, 48);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.14)";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.font = "700 74px Inter, system-ui, -apple-system, Segoe UI, Roboto";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const lines = wrapText(ctx, text || "Texte", cardW - 120);
  const lineH = 92;
  const totalH = lines.length * lineH;
  let y = cardY + cardH / 2 - totalH / 2 + lineH / 2;

  for (const line of lines.slice(0, 5)) {
    ctx.fillText(line, size.w / 2, y);
    y += lineH;
  }

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Text blob failed"))), "image/jpeg", 0.92);
  });

  return blob;
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
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
  return lines;
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
  isOpen = false, // ✅ IMPORTANT: camera doesn't open unless explicitly true
  onClose,
  onComplete,
  language = "fr",
}: FullscreenCreatorProps) {
  const [step, setStep] = useState<CreatorStep>("capture");
  const [mode, setMode] = useState<CaptureMode>("video");
  const [ratio, setRatio] = useState<CanvasRatio>("9:16");

  const [caption, setCaption] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // side panels
  const [sidePanel, setSidePanel] = useState<SidePanel>("none");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerPanel, setDrawerPanel] = useState<DrawerPanel>("none");
  const [hudVisible, setHudVisible] = useState(true);

  // camera
  const [facing, setFacing] = useState<"user" | "environment">("environment");
  const [isRecording, setIsRecording] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  // capture outputs
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [capturedType, setCapturedType] = useState<"video" | "photo">("video");
  const [previewUrl, setPreviewUrl] = useState<string>("");

  // editor
  const [segments, setSegments] = useState<TimelineSegment[]>([]);
  const [filterId, setFilterId] = useState<string>("none");
  const appliedFilter = useMemo(() => getFilterById(filterId), [filterId]);
  const cssFilter = useMemo(() => scaleCssFilter(appliedFilter.cssFilter, appliedFilter.intensity), [appliedFilter]);

  // export result from editor
  const [exported, setExported] = useState<EditorExport | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 900);
    return () => window.clearTimeout(t);
  }, [toast]);

  // If closed, hard-stop camera and reset
  useEffect(() => {
    if (!isOpen) {
      stopAll();
      setStep("capture");
      setCapturedBlob(null);
      setCapturedType("video");
      setPreviewUrl("");
      setSegments([]);
      setExported(null);
      setError(null);
      setToast(null);
      setSidePanel("none");
      setDrawerOpen(false);
      setDrawerPanel("none");
      setHudVisible(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Mount preview URL
  useEffect(() => {
    let url = "";
    (async () => {
      if (!capturedBlob) return;
      url = await blobToObjectURL(capturedBlob);
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
    })();
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [capturedBlob]);

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  const stopAll = () => {
    try {
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        recorderRef.current.stop();
      }
    } catch {}
    recorderRef.current = null;
    chunksRef.current = [];
    setIsRecording(false);
    stopStream();
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
      setError(e?.message || "Impossible d’accéder à la caméra.");
    }
  };

  // camera starts ONLY when isOpen + step=capture
  useEffect(() => {
    if (!isOpen) return;
    if (step !== "capture") return;
    startStream();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, step, facing, mode]);

  const startRecording = async () => {
    setError(null);
    if (!streamRef.current) await startStream();
    if (!streamRef.current) return;

    if (!("MediaRecorder" in window)) {
      setError("Enregistrement vidéo non supporté sur ce navigateur.");
      return;
    }

    const mimeType = pickMimeType();
    chunksRef.current = [];
    try {
      const rec = new MediaRecorder(streamRef.current, mimeType ? { mimeType } : undefined);
      recorderRef.current = rec;

      rec.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data);
      };

      rec.start(200);
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
        const type = rec.mimeType || "video/webm";
        const b = new Blob(chunksRef.current, { type });
        if (!b.size) reject(new Error("Empty recording"));
        else resolve(b);
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

  const captureNow = async () => {
    setError(null);

    if (mode === "text") {
      try {
        stopAll();
        const b = await renderTextToImage(caption || (language === "fr" ? "Texte" : "Asọyé"), ratio);
        setCapturedType("photo");
        setCapturedBlob(b);
        setStep("preview");
        setSidePanel("none");
        setDrawerOpen(false);
        setDrawerPanel("none");
      } catch (e: any) {
        setError(e?.message || "Erreur texte");
      }
      return;
    }

    if (mode === "photo") {
      try {
        if (!videoRef.current) throw new Error("Caméra non prête");
        const b = await capturePhotoFromVideo(videoRef.current, ratio);
        stopAll();
        setCapturedType("photo");
        setCapturedBlob(b);
        setStep("preview");
      } catch (e: any) {
        setError(e?.message || "Erreur photo");
      }
      return;
    }

    // video toggle record
    if (mode === "video") {
      try {
        if (!isRecording) {
          await startRecording();
        } else {
          const b = await stopRecordingToBlob();
          stopAll();
          setCapturedType("video");
          setCapturedBlob(b);
          setStep("preview");
        }
      } catch (e: any) {
        setError(e?.message || "Erreur vidéo");
        setIsRecording(false);
      }
    }
  };

  const retake = () => {
    setCapturedBlob(null);
    setCapturedType("video");
    setPreviewUrl("");
    setSegments([]);
    setExported(null);
    setStep("capture");
    setSidePanel("none");
    setDrawerOpen(false);
    setDrawerPanel("none");
    setHudVisible(true);
  };

  const goToEditor = () => {
    if (!capturedBlob) {
      setError("Aucun média capturé.");
      return;
    }

    const seg: TimelineSegment = {
      id: `${Date.now()}`,
      type: capturedType === "video" ? "video" : "photo",
      blob: capturedBlob,
      duration: capturedType === "video" ? 30 : 5,
      startTime: 0,
      endTime: capturedType === "video" ? 30 : 5,
      filterId: normalizeFilterId(filterId),
      overlayText: caption || "",
      ratio,
      muted: false,
    };

    setSegments([seg]);
    setStep("editor");
  };

  const onEditorConfirm = (exp: EditorExport) => {
    setExported(exp);
    setStep("publish");
  };

  const publish = async () => {
    setError(null);
    if (!exported?.blob) {
      setError("Export introuvable. Reviens à l’éditeur.");
      return;
    }

    setIsPublishing(true);

    try {
      await onComplete({
        mediaBlob: exported.blob,
        mediaType: exported.type,
        caption,
        ratio: exported.ratio,
        appliedFilterId: exported.appliedFilterId,
        editsMeta: exported.meta,
      });

      // ✅ Always close on success
      onClose();
    } catch (e: any) {
      // On affiche l’erreur mais l’utilisateur reste sur publish
      setError(e?.message || "Publication échouée");
    } finally {
      setIsPublishing(false);
    }
  };

  // Render nothing if not open
  if (!isOpen) return null;

  /** ===== Gestures (edge swipe) ===== */
  const gestureRef = useRef<{ x0: number; y0: number; active: boolean; edge: "left" | "right" | "center" } | null>(
    null
  );

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

    if (dy < -70 && Math.abs(dx) < 70) {
      gestureRef.current.active = false;
      setDrawerOpen(true);
      setDrawerPanel("none");
      setSidePanel("none");
      setHudVisible(true);
      return;
    }

    if (gestureRef.current.edge === "left" && dx > 80 && Math.abs(dy) < 70) {
      gestureRef.current.active = false;
      setSidePanel((p) => (p === "canvasLeft" ? "none" : "canvasLeft"));
      setDrawerOpen(false);
      return;
    }

    if (gestureRef.current.edge === "right" && dx < -80 && Math.abs(dy) < 70) {
      gestureRef.current.active = false;
      setSidePanel((p) => (p === "filtersRight" ? "none" : "filtersRight"));
      setDrawerOpen(false);
      return;
    }

    // swipe center left/right to change filters quickly (capture only)
    if (gestureRef.current.edge === "center" && step === "capture" && Math.abs(dy) < 60 && Math.abs(dx) > 90) {
      gestureRef.current.active = false;
      const idx = VIDEO_FILTERS.findIndex((f) => f.id === normalizeFilterId(filterId));
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
          {/* camera */}
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
          </div>

          {/* LEFT Canvas panel */}
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
                    <SideBtn label="9:16" active={ratio === "9:16"} onClick={() => setRatio("9:16")} />
                    <SideBtn label="1:1" active={ratio === "1:1"} onClick={() => setRatio("1:1")} />
                    <SideBtn label="16:9" active={ratio === "16:9"} onClick={() => setRatio("16:9")} />
                  </div>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {/* RIGHT Filters panel */}
          <AnimatePresence>
            {sidePanel === "filtersRight" ? (
              <motion.div
                initial={{ x: 360, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 360, opacity: 0 }}
                transition={{ type: "spring", damping: 26, stiffness: 260 }}
                className="absolute right-0 top-0 bottom-0 w-[360px] z-[120] bg-[#0b0b0e]/95 border-l border-white/10 backdrop-blur"
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
                  <VideoFiltersInlinePanel selectedId={filterId} onSelect={setFilterId} language={language} />
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {/* HUD */}
          <AnimatePresence>
            {hudVisible ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0">
                {/* top */}
                <div className="absolute top-0 left-0 right-0 p-3 z-30 flex items-center justify-between pointer-events-auto">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onClose();
                    }}
                    className="h-10 w-10 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center"
                  >
                    <X className="h-5 w-5" />
                  </button>

                  <div className="text-xs px-3 py-2 rounded-2xl bg-black/35 border border-white/10 backdrop-blur">
                    Edge swipe: Canvas (←) / Filters (→) · Swipe ↑ Tools
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

                {/* bottom controls */}
                <div className="absolute left-0 right-0 bottom-0 z-30 p-4 pointer-events-auto">
                  <div className="mx-auto max-w-[920px]">
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
                        Outils
                      </button>
                    </div>

                    <div className="rounded-3xl bg-black/45 border border-white/10 backdrop-blur p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <ModeBtn label="Photo" icon={<ImageIcon className="h-4 w-4" />} active={mode === "photo"} onClick={() => setMode("photo")} />
                          <ModeBtn label="Vidéo" icon={<VideoIcon className="h-4 w-4" />} active={mode === "video"} onClick={() => setMode("video")} />
                          <ModeBtn label="Texte" icon={<TypeIcon className="h-4 w-4" />} active={mode === "text"} onClick={() => setMode("text")} />
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            captureNow();
                          }}
                          className={cn(
                            "h-14 w-14 rounded-full flex items-center justify-center border",
                            isRecording ? "bg-red-500/90 border-red-300/40" : "bg-white/15 border-white/25 hover:bg-white/20"
                          )}
                          title={mode === "video" ? (isRecording ? "Stop" : "Record") : "Capture"}
                        >
                          {isRecording ? <div className="h-5 w-5 rounded bg-white" /> : <CameraIcon className="h-6 w-6" />}
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setFacing((f) => (f === "environment" ? "user" : "environment"));
                          }}
                          className="h-12 px-4 rounded-2xl bg-white/10 border border-white/10"
                        >
                          Switch
                        </button>
                      </div>

                      <div className="mt-2 text-[11px] text-white/65 flex items-center justify-between">
                        <div>Canvas {ratio} · Filtre {appliedFilter.name}</div>
                        <div className="text-white/50">Swipe ←/→ change filtre</div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {/* drawer tools */}
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
                    {drawerPanel === "recommendedFilter" ? (
                      <div className="rounded-2xl bg-white/5 border border-white/10 p-3">
                        <div className="font-semibold">Recommended filter</div>
                        <div className="text-xs text-white/70 mt-1">IA proactive (simulation) — applique un preset</div>
                        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <QuickBtn
                            label="Vlog"
                            onClick={() => {
                              const f = VIDEO_FILTERS.find((x) => x.id === "film") ?? VIDEO_FILTERS[0];
                              setFilterId(f.id);
                              setToast("Preset: Vlog");
                            }}
                          />
                          <QuickBtn
                            label="Cinematic"
                            onClick={() => {
                              const f = VIDEO_FILTERS.find((x) => x.id === "dramatic") ?? VIDEO_FILTERS[0];
                              setFilterId(f.id);
                              setToast("Preset: Cinematic");
                            }}
                          />
                          <QuickBtn
                            label="Beauty glow"
                            onClick={() => {
                              const f = VIDEO_FILTERS.find((x) => x.id === "soft_glow") ?? VIDEO_FILTERS[0];
                              setFilterId(f.id);
                              setToast("Preset: Beauty glow");
                            }}
                          />
                          <QuickBtn label="Original" onClick={() => setFilterId("none")} />
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-2xl bg-white/5 border border-white/10 p-3 text-xs text-white/70">
                        Choisis un panneau (Inspiring / Shot tips / Cover / Challenge / Recommended / Magic).
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {/* error/toast */}
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
            <button onClick={retake} className="h-10 px-3 rounded-2xl bg-white/10 border border-white/10 flex items-center gap-2">
              <RotateCcw className="h-4 w-4" /> Reprendre
            </button>

            <button onClick={onClose} className="h-10 w-10 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center">
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
              <div className="text-xs text-white/70">Preview · Canvas {ratio} · Filtre {appliedFilter.name}</div>

              <button
                onClick={goToEditor}
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
          onClose={() => setStep("preview")}
          onConfirm={onEditorConfirm}
        />
      ) : null}

      {/* PUBLISH */}
      {step === "publish" ? (
        <div className="absolute inset-0 bg-black">
          <div className="absolute top-0 left-0 right-0 p-3 z-20 flex items-center justify-between">
            <button onClick={() => setStep("editor")} className="h-10 px-3 rounded-2xl bg-white/10 border border-white/10 flex items-center gap-2">
              <Film className="h-4 w-4" /> Retour édition
            </button>

            <button onClick={onClose} className="h-10 w-10 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="absolute inset-0 flex items-center justify-center p-6">
            <div className="w-full max-w-[760px] rounded-3xl bg-white/5 border border-white/10 p-4 backdrop-blur">
              <div className="text-white font-semibold">Publier</div>
              <div className="text-xs text-white/60 mt-1">
                Export prêt ✓ · Filtre {exported?.appliedFilterId}
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-2xl bg-black/40 border border-white/10 p-2">
                  {exported?.previewUrl ? (
                    exported.type === "video" ? (
                      <video src={exported.previewUrl} className="w-full aspect-[9/16] object-contain rounded-xl bg-black" controls playsInline />
                    ) : (
                      <img src={exported.previewUrl} className="w-full aspect-[9/16] object-contain rounded-xl bg-black" alt="export" />
                    )
                  ) : (
                    <div className="w-full aspect-[9/16] rounded-xl bg-black/60 flex items-center justify-center text-xs text-white/60">
                      Preview export…
                    </div>
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

                  <button
                    onClick={publish}
                    disabled={isPublishing}
                    className={cn(
                      "mt-4 h-12 w-full rounded-2xl text-white font-semibold flex items-center justify-center gap-2",
                      isPublishing ? "bg-orange-500/50" : "bg-orange-500/90 hover:bg-orange-500"
                    )}
                  >
                    {isPublishing ? "Publication…" : <><Send className="h-5 w-5" /> Publier</>}
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
        </div>
      ) : null}
    </div>
  );
}

/** small UI atoms */
function ModeBtn({ label, icon, active, onClick }: { label: string; icon: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
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

function DrawerTab({ label, icon, active, onClick }: { label: string; icon: React.ReactNode; active: boolean; onClick: () => void }) {
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

function QuickBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="h-11 rounded-2xl bg-white/10 border border-white/10 text-white text-xs flex items-center justify-center hover:bg-white/15">
      {label}
    </button>
  );
}

function SideBtn({ label, active, onClick }: { label: string; active?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn("h-11 rounded-2xl border text-xs flex items-center justify-center",
        active ? "bg-white/15 border-white/25" : "bg-white/10 border-white/10 hover:bg-white/15")}
    >
      {label}
    </button>
  );
}
