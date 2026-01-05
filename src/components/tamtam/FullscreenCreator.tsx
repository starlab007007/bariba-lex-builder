import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, PanInfo } from "framer-motion";
import {
  X,
  RotateCcw,
  Zap,
  Timer,
  Gauge,
  Sparkles,
  Image as ImageIcon,
  Video as VideoIcon,
  Type as TypeIcon,
  Check,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Sliders,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import VideoFiltersPanel, { VIDEO_FILTERS } from "./VideoFilters";
import TimelineEditorV2, { type EditResultV2, type TimelineSegmentV2 } from "./TimelineEditor";

export type CreatorOutputPayload = {
  audio_url: string;
  media_type: "audio" | "video" | "photo" | "text";
  media_url?: string;
  template_id: string;
  topic: string;
  duration_seconds: number;
  text_content?: string;
  tags?: string[];
  challenge?: string;
  music_title?: string;
  is_story?: boolean;
  filter_applied?: string;
  v2?: { aspect: "9:16" | "1:1" | "16:9"; overlaysCount: number; transitionsCount: number };
};

type Step = "capture" | "editor";
type CaptureMode = "Video" | "Photo" | "Text";
type SidePanel = "none" | "left_canvas" | "right_effects";
type Drawer = "collapsed" | "expanded";

function safeRevoke(url?: string) {
  if (!url) return;
  try { URL.revokeObjectURL(url); } catch {}
}

function makeObjectURL(blob: Blob) {
  return URL.createObjectURL(blob);
}

export default function FullscreenCreator(props: {
  isOpen?: boolean;
  onClose?: () => void;
  onComplete?: (data: CreatorOutputPayload) => Promise<void>;
  language?: "fr" | "ba";
}) {
  const { isOpen = false, onClose, onComplete, language = "fr" } = props;

  const [step, setStep] = useState<Step>("capture");
  const [publishing, setPublishing] = useState(false);

  // capture UI state
  const [mode, setMode] = useState<CaptureMode>("Video");
  const [sidePanel, setSidePanel] = useState<SidePanel>("none");
  const [drawer, setDrawer] = useState<Drawer>("collapsed");

  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [flashUI, setFlashUI] = useState(false);
  const [timerSec, setTimerSec] = useState<0 | 3 | 10>(0);
  const [speed, setSpeed] = useState<"0.5x" | "1x" | "2x">("1x");
  const [videoFilterId, setVideoFilterId] = useState<string>("none");

  const [textValue, setTextValue] = useState("");

  // media
  const streamRef = useRef<MediaStream | null>(null);
  const videoElRef = useRef<HTMLVideoElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const recStartRef = useRef<number>(0);
  const [isRecording, setIsRecording] = useState(false);

  // result to editor
  const [segments, setSegments] = useState<TimelineSegmentV2[]>([]);
  const [captureMeta, setCaptureMeta] = useState<any>(null);

  const urlsRef = useRef<string[]>([]);
  const rememberUrl = (u: string) => {
    urlsRef.current.push(u);
    return u;
  };
  const cleanupUrls = () => {
    urlsRef.current.forEach((u) => safeRevoke(u));
    urlsRef.current = [];
  };

  const resetAll = useCallback(() => {
    setStep("capture");
    setMode("Video");
    setSidePanel("none");
    setDrawer("collapsed");
    setFlashUI(false);
    setTimerSec(0);
    setSpeed("1x");
    setVideoFilterId("none");
    setTextValue("");
    setSegments([]);
    setCaptureMeta(null);
    setPublishing(false);

    // stop recording
    try {
      if (recorderRef.current && recorderRef.current.state !== "inactive") recorderRef.current.stop();
    } catch {}
    recorderRef.current = null;
    chunksRef.current = [];
    setIsRecording(false);

    // stop stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    cleanupUrls();
  }, []);

  const handleClose = useCallback(() => {
    resetAll();
    onClose?.();
  }, [resetAll, onClose]);

  // Ensure camera is only opened when FullscreenCreator itself is opened
  useEffect(() => {
    if (!isOpen) return;
    // start camera automatically INSIDE creator only
    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
        streamRef.current = stream;
        if (videoElRef.current) {
          videoElRef.current.srcObject = stream;
          await videoElRef.current.play().catch(() => {});
        }
      } catch (e) {
        console.error(e);
        alert("Caméra indisponible. Autorise l'accès caméra.");
      }
    };
    start();

    return () => {
      // stop on close/unmount
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [isOpen, facingMode]);

  const filterCss = useMemo(() => VIDEO_FILTERS.find((f) => f.id === videoFilterId)?.cssFilter || "none", [videoFilterId]);

  // edge swipe: left/right opens panels; up opens drawer
  const onGestureEnd = (_e: any, info: PanInfo) => {
    const dx = info.offset.x;
    const dy = info.offset.y;

    if (dx > 80) setSidePanel("left_canvas");
    else if (dx < -80) setSidePanel("right_effects");

    if (dy < -80) setDrawer("expanded");
    else if (dy > 80) setDrawer("collapsed");
  };

  const switchCamera = async () => {
    setFacingMode((v) => (v === "environment" ? "user" : "environment"));
  };

  const waitTimerIfNeeded = async () => {
    if (!timerSec) return;
    await new Promise<void>((res) => setTimeout(res, timerSec * 1000));
  };

  const capturePhoto = async () => {
    if (!videoElRef.current) return;

    await waitTimerIfNeeded();

    const v = videoElRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth || 1280;
    canvas.height = v.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.filter = filterCss;
    ctx.drawImage(v, 0, 0, canvas.width, canvas.height);

    const blob: Blob = await new Promise((resolve) => canvas.toBlob((b) => resolve(b || new Blob()), "image/jpeg", 0.92));
    const url = rememberUrl(makeObjectURL(blob));

    setCaptureMeta({ topTab: "Video", mode: "Photo", filter: videoFilterId });
    setSegments([
      { id: `seg_${Date.now()}`, type: "photo", blob, url, duration: 5, meta: { filter: videoFilterId } },
    ]);
    setStep("editor");
  };

  const startRecording = async () => {
    if (!streamRef.current) return;

    await waitTimerIfNeeded();

    const stream = streamRef.current;

    const preferMime = [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
    ].find((m) => MediaRecorder.isTypeSupported(m)) || "video/webm";

    const rec = new MediaRecorder(stream, { mimeType: preferMime });
    recorderRef.current = rec;
    chunksRef.current = [];
    recStartRef.current = Date.now();

    rec.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };
    rec.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: rec.mimeType || "video/webm" });
      const url = rememberUrl(makeObjectURL(blob));
      const dur = Math.max(1, Math.round((Date.now() - recStartRef.current) / 1000));

      setCaptureMeta({ topTab: "Video", mode: "Video", filter: videoFilterId, speed, timerSec });
      setSegments([
        { id: `seg_${Date.now()}`, type: "video", blob, url, duration: dur, meta: { filter: videoFilterId, speed } },
      ]);
      setStep("editor");
      setIsRecording(false);
    };

    setIsRecording(true);
    rec.start(200);
  };

  const stopRecording = () => {
    const rec = recorderRef.current;
    if (!rec) return;
    try {
      if (rec.state !== "inactive") rec.stop();
    } catch {}
  };

  const commitTextToEditor = async () => {
    const txt = textValue.trim();
    if (!txt) return;

    const blob = new Blob([txt], { type: "text/plain" });
    const url = rememberUrl(makeObjectURL(blob));

    setCaptureMeta({ topTab: "Video", mode: "Text", filter: videoFilterId });
    setSegments([{ id: `seg_${Date.now()}`, type: "text", blob, url, duration: 8, meta: { text: txt, filter: videoFilterId } }]);
    setStep("editor");
  };

  const publishFromEdit = async (edit: EditResultV2) => {
    if (!onComplete) {
      console.log("[FullscreenCreator] publish:", edit);
      handleClose();
      return;
    }
    setPublishing(true);
    try {
      const main = edit.segments[0];
      const payload: CreatorOutputPayload = {
        audio_url: "",
        media_type: main.type === "text" ? "text" : main.type === "photo" ? "photo" : main.type === "audio" ? "audio" : "video",
        media_url: main.url,
        template_id: edit.templateId || "kuaishou_v2",
        topic: edit.topic || "creation",
        duration_seconds: Math.max(1, Math.round(edit.totalDuration)),
        text_content: edit.textContent,
        tags: edit.tags,
        challenge: edit.challenge,
        music_title: edit.musicTitle,
        is_story: edit.isStory,
        filter_applied: edit.videoFilterId,
        v2: { aspect: edit.canvas.aspect, overlaysCount: edit.overlays.length, transitionsCount: edit.transitions.length },
      };

      await onComplete(payload);
      handleClose(); // close + reset
    } catch (e) {
      console.error(e);
      alert("Échec publication.");
    } finally {
      setPublishing(false);
    }
  };

  if (!isOpen) return null;

  // CAPTURE VIEW
  if (step === "capture") {
    return (
      <div className="fixed inset-0 z-[90] bg-black">
        {/* Gesture layer */}
        <motion.div
          className="absolute inset-0"
          drag
          dragElastic={0.08}
          dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
          onDragEnd={onGestureEnd}
        />

        {/* Video preview (clean) */}
        <div className="absolute inset-0">
          <video
            ref={videoElRef}
            className="h-full w-full object-cover"
            style={{ filter: filterCss }}
            playsInline
            muted
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/50" />
        </div>

        {/* Top bar (minimal) */}
        <div className="absolute top-0 left-0 right-0 z-20 px-4 py-3 flex items-center justify-between">
          <button
            type="button"
            onClick={handleClose}
            className="h-10 w-10 rounded-2xl bg-white/10 border border-white/10 text-white flex items-center justify-center"
            title="Fermer"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="text-white/70 text-xs">
            Swipe ← Canvas · Swipe → Effects · Swipe ↑ Tools
          </div>

          <button
            type="button"
            onClick={() => setSidePanel("right_effects")}
            className="h-10 px-3 rounded-2xl bg-white/10 border border-white/10 text-white text-xs flex items-center gap-2"
          >
            <Filter className="h-4 w-4" /> Effects
          </button>
        </div>

        {/* Mode selector (bottom, clean) */}
        <div className="absolute bottom-24 left-0 right-0 z-20 flex items-center justify-center gap-2">
          {(["Video", "Photo", "Text"] as CaptureMode[]).map((m) => {
            const active = mode === m;
            const Icon = m === "Video" ? VideoIcon : m === "Photo" ? ImageIcon : TypeIcon;
            return (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={cn(
                  "h-11 px-4 rounded-2xl border text-white flex items-center gap-2",
                  active ? "bg-white/15 border-white/25" : "bg-white/10 border-white/10 hover:bg-white/12"
                )}
              >
                <Icon className="h-4 w-4" />
                {m}
              </button>
            );
          })}
        </div>

        {/* Shutter area (center action) */}
        <div className="absolute bottom-6 left-0 right-0 z-20 flex items-center justify-center">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setSidePanel("left_canvas")}
              className="h-12 w-12 rounded-2xl bg-white/10 border border-white/10 text-white flex items-center justify-center"
              title="Canvas"
            >
              <ChevronRight className="h-5 w-5" />
            </button>

            {mode === "Video" ? (
              <button
                type="button"
                onClick={isRecording ? stopRecording : startRecording}
                className={cn(
                  "h-16 w-16 rounded-full border-2 flex items-center justify-center",
                  isRecording ? "bg-red-500 border-red-200" : "bg-white/10 border-white/40"
                )}
                title={isRecording ? "Stop" : "Record"}
              >
                <div className={cn("h-10 w-10 rounded-full", isRecording ? "bg-white" : "bg-white")} />
              </button>
            ) : mode === "Photo" ? (
              <button
                type="button"
                onClick={capturePhoto}
                className="h-16 w-16 rounded-full bg-white/10 border-2 border-white/40 flex items-center justify-center"
                title="Photo"
              >
                <div className="h-10 w-10 rounded-full bg-white" />
              </button>
            ) : (
              <button
                type="button"
                onClick={commitTextToEditor}
                className="h-16 px-6 rounded-full bg-orange-500/90 hover:bg-orange-500 text-white font-semibold border border-orange-500/30 flex items-center gap-2"
                title="Continuer"
              >
                <Sparkles className="h-5 w-5" /> Continuer
              </button>
            )}

            <button
              type="button"
              onClick={switchCamera}
              className="h-12 w-12 rounded-2xl bg-white/10 border border-white/10 text-white flex items-center justify-center"
              title="Switch camera"
            >
              <RotateCcw className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Text input overlay (only in Text mode, clean) */}
        {mode === "Text" ? (
          <div className="absolute bottom-32 left-0 right-0 z-20 px-4 flex justify-center">
            <div className="w-full max-w-[720px] rounded-3xl bg-black/40 border border-white/10 backdrop-blur p-3">
              <textarea
                value={textValue}
                onChange={(e) => setTextValue(e.target.value)}
                placeholder="Écris ton message…"
                className="w-full min-h-[90px] resize-none bg-transparent text-white outline-none"
              />
            </div>
          </div>
        ) : null}

        {/* Bottom tools drawer (minimal -> expanded) */}
        <div className="absolute bottom-0 left-0 right-0 z-30 px-4 pb-4">
          <div className={cn("mx-auto max-w-[980px] rounded-3xl border border-white/10 backdrop-blur bg-black/45", drawer === "expanded" ? "p-4" : "p-3")}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTimerSec((v) => (v === 0 ? 3 : v === 3 ? 10 : 0))}
                  className="h-11 px-3 rounded-2xl bg-white/10 border border-white/10 text-white text-sm flex items-center gap-2"
                  title="Timer"
                >
                  <Timer className="h-4 w-4" /> {timerSec ? `${timerSec}s` : "Off"}
                </button>

                <button
                  type="button"
                  onClick={() => setSpeed((v) => (v === "1x" ? "0.5x" : v === "0.5x" ? "2x" : "1x"))}
                  className="h-11 px-3 rounded-2xl bg-white/10 border border-white/10 text-white text-sm flex items-center gap-2"
                  title="Speed"
                >
                  <Gauge className="h-4 w-4" /> {speed}
                </button>

                <button
                  type="button"
                  onClick={() => setFlashUI((v) => !v)}
                  className={cn(
                    "h-11 px-3 rounded-2xl border text-white text-sm flex items-center gap-2",
                    flashUI ? "bg-white/15 border-white/25" : "bg-white/10 border-white/10"
                  )}
                  title="Flash (UI)"
                >
                  <Zap className="h-4 w-4" /> Flash
                </button>
              </div>

              <button
                type="button"
                onClick={() => setDrawer((d) => (d === "collapsed" ? "expanded" : "collapsed"))}
                className="h-11 px-3 rounded-2xl bg-white/10 border border-white/10 text-white text-sm flex items-center gap-2"
              >
                <Sliders className="h-4 w-4" /> {drawer === "collapsed" ? "More" : "Less"}
              </button>
            </div>

            {drawer === "expanded" ? (
              <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
                {/* Panels shortcuts */}
                <button
                  type="button"
                  onClick={() => setSidePanel("left_canvas")}
                  className="h-11 px-3 rounded-2xl bg-white/10 border border-white/10 text-white text-sm"
                >
                  Canvas ⇠
                </button>
                <button
                  type="button"
                  onClick={() => setSidePanel("right_effects")}
                  className="h-11 px-3 rounded-2xl bg-white/10 border border-white/10 text-white text-sm"
                >
                  Effects ⇢
                </button>

                {/* Creative assistance (placeholders to keep mapping) */}
                <button type="button" className="h-11 px-3 rounded-2xl bg-white/10 border border-white/10 text-white text-sm">
                  Inspiring 👁️
                </button>
                <button type="button" className="h-11 px-3 rounded-2xl bg-white/10 border border-white/10 text-white text-sm">
                  Shot tips 🎬
                </button>
                <button type="button" className="h-11 px-3 rounded-2xl bg-white/10 border border-white/10 text-white text-sm">
                  Challenge 🔥
                </button>
                <button type="button" className="h-11 px-3 rounded-2xl bg-white/10 border border-white/10 text-white text-sm">
                  Recommended ⭐
                </button>
                <button type="button" className="h-11 px-3 rounded-2xl bg-white/10 border border-white/10 text-white text-sm">
                  Magic ✨
                </button>
              </div>
            ) : null}
          </div>
        </div>

        {/* Left Canvas panel */}
        <AnimatePresence>
          {sidePanel === "left_canvas" ? (
            <motion.div
              initial={{ x: -420, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -420, opacity: 0 }}
              className="absolute top-0 bottom-0 left-0 w-[360px] z-40 bg-[#0b0b0e] border-r border-white/10"
            >
              <div className="p-4 flex items-center justify-between border-b border-white/10">
                <div className="text-white font-semibold flex items-center gap-2">
                  <Sliders className="h-4 w-4" /> Canvas
                </div>
                <button
                  type="button"
                  onClick={() => setSidePanel("none")}
                  className="h-10 w-10 rounded-2xl bg-white/10 border border-white/10 text-white flex items-center justify-center"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="p-4 text-white">
                <div className="text-xs text-white/70">Ratio (pré-édition)</div>
                <div className="text-xs text-white/60 mt-2">
                  Ici on garde la capture clean. Le ratio final se choisit dans l’éditeur (Timeline).
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* Right Effects panel */}
        <AnimatePresence>
          {sidePanel === "right_effects" ? (
            <motion.div
              initial={{ x: 420, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 420, opacity: 0 }}
              className="absolute top-0 bottom-0 right-0 w-[360px] z-40 bg-[#0b0b0e] border-l border-white/10"
            >
              <div className="p-4 flex items-center justify-between border-b border-white/10">
                <div className="text-white font-semibold flex items-center gap-2">
                  <Filter className="h-4 w-4" /> Effects / Filters
                </div>
                <button
                  type="button"
                  onClick={() => setSidePanel("none")}
                  className="h-10 w-10 rounded-2xl bg-white/10 border border-white/10 text-white flex items-center justify-center"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="p-4 text-white">
                <div className="text-xs text-white/70 mb-2">Filtre (appliqué sur preview)</div>
                <VideoFiltersPanel
                  isOpen
                  onClose={() => {}}
                  selectedFilterId={videoFilterId}
                  onSelectFilter={(f) => setVideoFilterId(f.id)}
                  language={language}
                />
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    );
  }

  // EDITOR VIEW
  return (
    <div className="fixed inset-0 z-[90] bg-black">
      <div className="absolute top-0 left-0 right-0 z-20 px-4 py-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setStep("capture")}
          className="h-10 px-3 rounded-2xl bg-white/10 border border-white/10 text-white text-sm flex items-center gap-2"
        >
          <ChevronLeft className="h-4 w-4" /> Retour
        </button>
        <div className="text-white/70 text-xs">Édition V2 · Swipe ←/→ panels</div>
        <button
          type="button"
          onClick={handleClose}
          className="h-10 w-10 rounded-2xl bg-white/10 border border-white/10 text-white flex items-center justify-center"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <TimelineEditorV2
        language={language}
        initialSegments={segments}
        captureMeta={captureMeta}
        publishing={publishing}
        onClose={handleClose}
        onBackToCapture={() => setStep("capture")}
        onPublish={publishFromEdit}
      />
    </div>
  );
}
