// src/components/tamtam/FullscreenCreator.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  Camera,
  Repeat2,
  Flashlight,
  FlashlightOff,
  Timer,
  Gauge,
  Maximize2,
  Minimize2,
  Sparkles,
  Wand2,
  Image as ImageIcon,
  Video as VideoIcon,
  Type as TypeIcon,
  Radio,
  Flame,
  Eye,
  Lightbulb,
  Hash,
  Check,
  AlertTriangle,
  Loader2,
  Scissors,
  Send,
  Undo2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import TimelineEditorKuaishou, { TimelineSegment } from "./TimelineEditor";

type TopTab = "Video" | "Story" | "AI" | "LIVE";
type CaptureMode = "Burst" | "Photo" | "Video" | "Text";
type SpeedPreset = 0.5 | 1 | 1.5 | 2;
type LengthPreset = 15 | 30 | 60;

type RecommendedFilter =
  | "none"
  | "beauty"
  | "warm"
  | "cool"
  | "vivid"
  | "vintage"
  | "bw"
  | "dramatic";

export type CreatorOutputPayload = {
  media_type: "video" | "photo" | "audio" | "text";
  media_blob?: Blob;
  media_url?: string; // si tu uploades et obtiens une URL
  text_content?: string;

  is_story?: boolean;
  top_tab?: TopTab;

  // “IA / AR / UX”
  template_id?: string;
  theme_id?: string;
  filter_applied?: string;
  challenge?: string;
  music_title?: string;

  // durations
  duration_seconds?: number;

  // meta
  meta?: Record<string, any>;
};

interface FullscreenCreatorProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: (payload: CreatorOutputPayload) => Promise<void> | void;
  language?: "fr" | "ba";
}

const FILTERS: { id: RecommendedFilter; label: string; css: string }[] = [
  { id: "none", label: "Original", css: "none" },
  { id: "beauty", label: "Beauté", css: "brightness(1.05) contrast(0.95) saturate(1.1) blur(0.3px)" },
  { id: "warm", label: "Chaud", css: "sepia(0.3) saturate(1.4) brightness(1.05)" },
  { id: "cool", label: "Froid", css: "hue-rotate(10deg) saturate(0.9) brightness(1.05)" },
  { id: "vivid", label: "Vif", css: "saturate(1.8) contrast(1.2) brightness(1.05)" },
  { id: "vintage", label: "Vintage", css: "sepia(0.5) contrast(1.1) brightness(0.95)" },
  { id: "bw", label: "N&B", css: "grayscale(1) contrast(1.2) brightness(1.05)" },
  { id: "dramatic", label: "Dramatique", css: "contrast(1.4) brightness(0.9) saturate(0.8)" },
];

const SPEEDS: SpeedPreset[] = [0.5, 1, 1.5, 2];
const LENGTHS: LengthPreset[] = [15, 30, 60];

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

async function getBlobDurationSec(blob: Blob): Promise<number> {
  const url = URL.createObjectURL(blob);
  try {
    const v = document.createElement("video");
    v.preload = "metadata";
    v.src = url;
    await new Promise<void>((res, rej) => {
      v.onloadedmetadata = () => res();
      v.onerror = () => rej(new Error("metadata error"));
    });
    const d = Number.isFinite(v.duration) ? v.duration : 0;
    return Math.max(0, d || 0);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function randomId(prefix = "id") {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export default function FullscreenCreator({
  isOpen,
  onClose,
  onComplete,
  language = "fr",
}: FullscreenCreatorProps) {
  /** =========================
   * UX: stages
   * ========================= */
  const [stage, setStage] = useState<"capture" | "preview">("capture");
  const [editorOpen, setEditorOpen] = useState(false);

  /** =========================
   * Tabs & modes
   * ========================= */
  const [topTab, setTopTab] = useState<TopTab>("Video");
  const [mode, setMode] = useState<CaptureMode>("Video");

  /** =========================
   * Camera controls (right bar)
   * ========================= */
  const [frontCamera, setFrontCamera] = useState(true); // Switch
  const [flashOn, setFlashOn] = useState(false); // Flash (web: simulation)
  const [timerSec, setTimerSec] = useState<0 | 3 | 5 | 10>(0); // Timer
  const [speed, setSpeed] = useState<SpeedPreset>(1); // Speed
  const [length, setLength] = useState<LengthPreset>(30); // Length
  const [isRecording, setIsRecording] = useState(false);

  /** =========================
   * Panels: Assistance créative
   * ========================= */
  const [showAssist, setShowAssist] = useState(true);
  const [challenge, setChallenge] = useState<string | null>(null);
  const [recommendedFilterOn, setRecommendedFilterOn] = useState(true);

  /** =========================
   * Beauté / Magic / Effects / Stickers / Graffiti
   * ========================= */
  const [beautifyOn, setBeautifyOn] = useState(true);
  const [magicOn, setMagicOn] = useState(true);
  const [effectsOn, setEffectsOn] = useState(false);
  const [stickersOn, setStickersOn] = useState(false);
  const [graffitiOn, setGraffitiOn] = useState(false);

  /** =========================
   * Canvas (stratégique)
   * ========================= */
  const [canvasRatio, setCanvasRatio] = useState<"9:16" | "1:1" | "16:9">("9:16");
  const [canvasBackground, setCanvasBackground] = useState<"none" | "blur" | "gradient">("none");

  /** =========================
   * Audio/Music
   * ========================= */
  const [musicOpen, setMusicOpen] = useState(false);
  const [selectedMusic, setSelectedMusic] = useState<{ id: string; title: string; emoji: string } | null>(null);
  const [pureMusic, setPureMusic] = useState(false);

  /** =========================
   * Text (no camera)
   * ========================= */
  const [textDraft, setTextDraft] = useState("");

  /** =========================
   * Preview / segments
   * ========================= */
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [previewType, setPreviewType] = useState<"video" | "photo" | "audio" | "text">("video");
  const [previewDuration, setPreviewDuration] = useState<number>(0);
  const [segments, setSegments] = useState<TimelineSegment[]>([]);

  /** =========================
   * Fullscreen display (anti-zoom)
   * contain = pas de crop; cover = fill (recadrage)
   * ========================= */
  const [fullMode, setFullMode] = useState(false); // ✅ par défaut: contain = pas “zoom”

  /** =========================
   * Camera / Recorder refs
   * ========================= */
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const recordStartRef = useRef<number>(0);
  const timerIntervalRef = useRef<number | null>(null);

  const [loadingCamera, setLoadingCamera] = useState(false);
  const [cameraError, setCameraError] = useState<string>("");

  /** =========================
   * Filters (swipe)
   * ========================= */
  const [filterId, setFilterId] = useState<RecommendedFilter>("none");
  const swipeRef = useRef<{ x0: number; active: boolean } | null>(null);

  const filterCss = useMemo(() => {
    const base = FILTERS.find((f) => f.id === filterId)?.css ?? "none";
    if (beautifyOn && base === "none") return "brightness(1.03) saturate(1.05) blur(0.25px)";
    if (beautifyOn) return `${base} blur(0.15px)`;
    return base;
  }, [filterId, beautifyOn]);

  const setNextFilter = useCallback(
    (dir: -1 | 1) => {
      const idx = FILTERS.findIndex((f) => f.id === filterId);
      const next = clamp(idx + dir, 0, FILTERS.length - 1);
      setFilterId(FILTERS[next].id);
    },
    [filterId]
  );

  const onPreviewPointerDown = useCallback((e: React.PointerEvent) => {
    swipeRef.current = { x0: e.clientX, active: true };
  }, []);

  const onPreviewPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!swipeRef.current?.active) return;
      const dx = e.clientX - swipeRef.current.x0;
      if (Math.abs(dx) > 50) {
        swipeRef.current.active = false;
        setNextFilter(dx > 0 ? 1 : -1);
      }
    },
    [setNextFilter]
  );

  const onPreviewPointerUp = useCallback(() => {
    if (swipeRef.current) swipeRef.current.active = false;
  }, []);

  /** =========================
   * Recommended filter (IA proactive)
   * ========================= */
  useEffect(() => {
    if (!recommendedFilterOn) return;
    if (topTab === "Story") setFilterId("warm");
    else if (topTab === "AI") setFilterId("vivid");
    else if (topTab === "LIVE") setFilterId("none");
    else {
      if (mode === "Photo") setFilterId("beauty");
      else if (mode === "Text") setFilterId("none");
      else setFilterId("vivid");
    }
  }, [recommendedFilterOn, topTab, mode]);

  /** =========================
   * Assist text (Inspiring / Shot tips / Cover tips)
   * ========================= */
  const assist = useMemo(() => {
    const inspiring =
      topTab === "Story"
        ? "Idée: 1 phrase simple + 1 action claire."
        : topTab === "AI"
        ? "Idée: choisis un template, l’IA propose filtre + musique + hook."
        : topTab === "LIVE"
        ? "Idée: annonce courte + promesse + appel à s’abonner."
        : "Idée: Hook 1s + preuve + appel à l’action.";

    const shotTips =
      challenge?.includes("Market")
        ? "Shot tips: 3 plans (produit → prix → bénéfice)."
        : challenge?.includes("Dance")
        ? "Shot tips: cadre plein corps + lumière face."
        : "Shot tips: 1 action par plan, gestes clairs.";

    const coverTips = topTab === "Story" ? "Cover tips: 3 mots max, contraste fort." : "Cover tips: visage/objet centré + titre ultra court.";

    return { inspiring, shotTips, coverTips };
  }, [topTab, challenge]);

  /** =========================
   * Music sheet data (demo)
   * ========================= */
  const MUSIC = useMemo(
    () => [
      { id: "m1", emoji: "🎵", title: "Afro Vibes", group: "Trending" },
      { id: "m2", emoji: "🥁", title: "Drum Groove", group: "Trending" },
      { id: "m3", emoji: "🎹", title: "Chill Beats", group: "History" },
      { id: "m4", emoji: "🎸", title: "Upbeat Dance", group: "Trending" },
      { id: "m5", emoji: "🎺", title: "Traditional", group: "Collect" },
    ],
    []
  );

  /** =========================
   * Camera start/stop
   * ========================= */
  const stopCamera = useCallback(() => {
    try {
      if (videoRef.current) videoRef.current.srcObject = null;
    } catch {}
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError("");
    setLoadingCamera(true);
    try {
      stopCamera();

      const constraints: MediaStreamConstraints = {
        audio: mode === "Video" || pureMusic ? true : false,
        video: topTab === "AI" || mode === "Text"
          ? false
          : {
              facingMode: { ideal: frontCamera ? "user" : "environment" },
              width: { ideal: 1280 },
              height: { ideal: 720 },
              aspectRatio: { ideal: canvasRatio === "9:16" ? 9 / 16 : canvasRatio === "1:1" ? 1 : 16 / 9 },
            },
      };

      if (!constraints.video) return;

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
    } catch (e: any) {
      console.error(e);
      setCameraError(language === "ba" ? "Kamɛra kɔ̀ rɛ" : "Impossible d’accéder à la caméra/micro.");
    } finally {
      setLoadingCamera(false);
    }
  }, [stopCamera, topTab, mode, pureMusic, frontCamera, canvasRatio, language]);

  /** =========================
   * Countdown (Timer)
   * ========================= */
  const [countdown, setCountdown] = useState<number>(0);

  const runCountdownThen = useCallback(
    async (fn: () => Promise<void> | void) => {
      if (!timerSec) {
        await fn();
        return;
      }
      setCountdown(timerSec);
      return new Promise<void>((resolve) => {
        const start = Date.now();
        timerIntervalRef.current = window.setInterval(async () => {
          const elapsed = Math.floor((Date.now() - start) / 1000);
          const left = timerSec - elapsed;
          setCountdown(Math.max(0, left));
          if (left <= 0) {
            if (timerIntervalRef.current) {
              window.clearInterval(timerIntervalRef.current);
              timerIntervalRef.current = null;
            }
            setCountdown(0);
            await fn();
            resolve();
          }
        }, 200);
      });
    },
    [timerSec]
  );

  /** =========================
   * Capture helpers
   * ========================= */
  const cleanupPreviewUrl = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl("");
  }, [previewUrl]);

  const toPreview = useCallback(
    async (blob: Blob, type: "video" | "photo" | "audio", durationSec?: number) => {
      cleanupPreviewUrl();
      const url = URL.createObjectURL(blob);
      setPreviewBlob(blob);
      setPreviewUrl(url);
      setPreviewType(type);
      const dur = typeof durationSec === "number" ? durationSec : type === "video" ? await getBlobDurationSec(blob) : type === "audio" ? (durationSec ?? 0) : 0;
      setPreviewDuration(dur);

      // segments for TimelineEditor
      const seg: TimelineSegment = {
        id: randomId("seg"),
        blob,
        type: type === "photo" ? "photo" : type === "audio" ? "audio" : "video",
        duration: type === "photo" ? 5 : Math.max(0.1, dur || (type === "audio" ? 10 : 5)),
        startTime: 0,
        endTime: type === "photo" ? 5 : Math.max(0.1, dur || (type === "audio" ? 10 : 5)),
        isMuted: false,
        volume: 100,
        filter: filterId,
      };
      setSegments([seg]);

      setStage("preview");
    },
    [cleanupPreviewUrl, filterId]
  );

  const resetToCapture = useCallback(() => {
    setStage("capture");
    setEditorOpen(false);
    setIsRecording(false);
    setCountdown(0);
    setTextDraft("");
    setPreviewBlob(null);
    setPreviewDuration(0);
    setPreviewType("video");
    setSegments([]);
    cleanupPreviewUrl();
  }, [cleanupPreviewUrl]);

  /** =========================
   * Take Photo
   * ========================= */
  const takePhoto = useCallback(async () => {
    if (!streamRef.current || !videoRef.current) return;

    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1080;
    canvas.height = video.videoHeight || 1920;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.filter = filterCss === "none" ? "none" : filterCss;
    if (flashOn) ctx.filter = `${ctx.filter} brightness(1.15)`;

    // Mirror selfie preview only; save non-mirrored by flipping canvas for user cam
    if (frontCamera) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const blob: Blob = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b || new Blob()), "image/jpeg", 0.92)
    );

    await toPreview(blob, "photo", 0);
  }, [filterCss, flashOn, frontCamera, toPreview]);

  /** =========================
   * Record Video/Audio
   * ========================= */
  const stopRecording = useCallback(() => {
    const r = recorderRef.current;
    if (!r) return;
    try {
      if (r.state !== "inactive") r.stop();
    } catch {}
  }, []);

  const startRecording = useCallback(async () => {
    if (!streamRef.current) return;
    if (isRecording) return;

    chunksRef.current = [];
    recordStartRef.current = Date.now();

    const isAudioOnly = pureMusic;
    const preferred = isAudioOnly
      ? (MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm")
      : (MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
          ? "video/webm;codecs=vp9,opus"
          : MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")
          ? "video/webm;codecs=vp8,opus"
          : "video/webm");

    const recorder = new MediaRecorder(streamRef.current, { mimeType: preferred });
    recorderRef.current = recorder;

    recorder.ondataavailable = (ev) => {
      if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data);
    };

    recorder.onstop = async () => {
      setIsRecording(false);
      const durationSec = Math.max(0.1, (Date.now() - recordStartRef.current) / 1000);
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || (isAudioOnly ? "audio/webm" : "video/webm") });
      await toPreview(blob, isAudioOnly ? "audio" : "video", durationSec);
    };

    setIsRecording(true);
    recorder.start(200);

    // auto stop based on Length
    window.setTimeout(() => {
      try {
        if (recorderRef.current && recorderRef.current.state === "recording") recorderRef.current.stop();
      } catch {}
    }, length * 1000);
  }, [isRecording, length, pureMusic, toPreview]);

  /** =========================
   * Capture CTA
   * ========================= */
  const handleCapture = useCallback(async () => {
    if (topTab === "AI") {
      // AI: on passe en preview “text” + meta template/theme (placeholder)
      cleanupPreviewUrl();
      setPreviewBlob(null);
      setPreviewType("text");
      setPreviewUrl("");
      setPreviewDuration(0);
      setSegments([]);
      setStage("preview");
      return;
    }

    if (mode === "Text") {
      cleanupPreviewUrl();
      setPreviewBlob(null);
      setPreviewType("text");
      setPreviewUrl("");
      setPreviewDuration(0);
      setSegments([]);
      setStage("preview");
      return;
    }

    if (mode === "Photo" || mode === "Burst") {
      await runCountdownThen(async () => {
        if (mode === "Burst") {
          for (let i = 0; i < 3; i++) {
            // eslint-disable-next-line no-await-in-loop
            await takePhoto();
            // eslint-disable-next-line no-await-in-loop
            await new Promise((r) => setTimeout(r, 180));
          }
        } else {
          await takePhoto();
        }
      });
      return;
    }

    await runCountdownThen(async () => {
      if (isRecording) stopRecording();
      else await startRecording();
    });
  }, [cleanupPreviewUrl, isRecording, mode, runCountdownThen, startRecording, stopRecording, takePhoto, topTab]);

  /** =========================
   * Publish (preview → onComplete)
   * ========================= */
  const publish = useCallback(async () => {
    const payload: CreatorOutputPayload = {
      media_type: previewType,
      media_blob: previewBlob ?? undefined,
      text_content: previewType === "text" ? (textDraft.trim() || "Texte (vide)") : undefined,
      is_story: topTab === "Story",
      top_tab: topTab,
      filter_applied: filterId,
      challenge: challenge ?? undefined,
      music_title: selectedMusic?.title ?? undefined,
      duration_seconds: previewDuration || (previewType === "photo" ? 0 : undefined),
      meta: {
        mode,
        speed,
        length,
        timerSec,
        flashOn,
        frontCamera,
        beautifyOn,
        magicOn,
        effectsOn,
        stickersOn,
        graffitiOn,
        canvasRatio,
        canvasBackground,
        recommendedFilterOn,
      },
    };

    try {
      if (onComplete) await onComplete(payload);
      onClose();
      resetToCapture();
    } catch (e) {
      console.error(e);
      // tu peux afficher un toast si tu as un système de notification
      alert(language === "ba" ? "Bà yà nɔ̀ŋ" : "Échec publication. Réessaie.");
    }
  }, [
    beautifyOn,
    canvasBackground,
    canvasRatio,
    challenge,
    effectsOn,
    filterId,
    flashOn,
    frontCamera,
    graffitiOn,
    language,
    length,
    magicOn,
    mode,
    onClose,
    onComplete,
    previewBlob,
    previewDuration,
    previewType,
    recommendedFilterOn,
    resetToCapture,
    selectedMusic?.title,
    speed,
    stickersOn,
    textDraft,
    timerSec,
    topTab,
  ]);

  /** =========================
   * Effects: open / close
   * ========================= */
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }
    // Reset open
    setStage("capture");
    setEditorOpen(false);
    setTopTab("Video");
    setMode("Video");
    setFrontCamera(true);
    setFlashOn(false);
    setTimerSec(0);
    setSpeed(1);
    setLength(30);
    setIsRecording(false);
    setShowAssist(true);
    setChallenge(null);
    setRecommendedFilterOn(true);
    setBeautifyOn(true);
    setMagicOn(true);
    setEffectsOn(false);
    setStickersOn(false);
    setGraffitiOn(false);
    setCanvasRatio("9:16");
    setCanvasBackground("none");
    setSelectedMusic(null);
    setPureMusic(false);
    setTextDraft("");
    setPreviewBlob(null);
    setPreviewDuration(0);
    setPreviewType("video");
    setSegments([]);
    cleanupPreviewUrl();
  }, [cleanupPreviewUrl, isOpen, stopCamera]);

  useEffect(() => {
    if (!isOpen) return;
    const needsCamera = topTab !== "AI" && mode !== "Text" && stage === "capture";
    if (!needsCamera) {
      stopCamera();
      return;
    }
    startCamera();
    return () => stopCamera();
  }, [isOpen, mode, startCamera, stage, stopCamera, topTab]);

  /** =========================
   * UI helpers
   * ========================= */
  const RightBtn: React.FC<{
    icon: React.ReactNode;
    label: string;
    active?: boolean;
    badge?: string;
    onClick: () => void;
    disabled?: boolean;
  }> = ({ icon, label, active, badge, onClick, disabled }) => (
    <button
      onClick={onClick}
      type="button"
      disabled={disabled}
      className={cn(
        "relative w-12 h-12 rounded-2xl flex items-center justify-center",
        "bg-black/35 border border-white/10 backdrop-blur",
        "hover:bg-black/45",
        active ? "ring-2 ring-white/30" : "",
        disabled ? "opacity-40 cursor-not-allowed" : ""
      )}
      title={label}
    >
      {icon}
      {badge ? (
        <span className="absolute -top-1 -right-1 text-[10px] px-1.5 py-0.5 rounded-full bg-orange-500/90 text-white">
          {badge}
        </span>
      ) : null}
    </button>
  );

  const ModeBtn: React.FC<{
    m: CaptureMode;
    icon: React.ReactNode;
    label: string;
    active: boolean;
    onClick: () => void;
  }> = ({ icon, label, active, onClick }) => (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-12 px-3 rounded-2xl border text-xs flex flex-col items-center justify-center gap-1",
        active ? "bg-white/15 border-white/25 text-white" : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  const TopTabBtn: React.FC<{ tab: TopTab; active: boolean; onClick: () => void }> = ({ tab, active, onClick }) => (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-9 px-3 rounded-2xl border text-xs",
        active ? "bg-white/15 border-white/25 text-white" : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
      )}
    >
      {tab}
    </button>
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[90] bg-black">
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-10 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              onClose();
              resetToCapture();
            }}
            className="h-10 w-10 rounded-2xl bg-white/10 border border-white/10 text-white flex items-center justify-center"
            title="Fermer"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="text-white">
            <div className="text-sm font-semibold flex items-center gap-2">
              <span>Création</span>
              {pureMusic ? (
                <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 border border-white/10">Pure Music</span>
              ) : null}
              {challenge ? (
                <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/80 text-white flex items-center gap-1">
                  <Flame className="h-3.5 w-3.5" /> {challenge}
                </span>
              ) : null}
            </div>
            <div className="text-xs text-white/60">
              {stage === "capture"
                ? "Capture plein écran (avant montage) · swipe ⇆ pour changer de filtre"
                : "Preview · Éditer (Timeline) · Publier"}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <TopTabBtn tab="Video" active={topTab === "Video"} onClick={() => setTopTab("Video")} />
            <TopTabBtn tab="Story" active={topTab === "Story"} onClick={() => setTopTab("Story")} />
            <TopTabBtn tab="AI" active={topTab === "AI"} onClick={() => setTopTab("AI")} />
            <TopTabBtn tab="LIVE" active={topTab === "LIVE"} onClick={() => setTopTab("LIVE")} />
          </div>

          <button
            type="button"
            onClick={() => setFullMode((f) => !f)}
            className="h-10 w-10 rounded-2xl bg-white/10 border border-white/10 text-white flex items-center justify-center"
            title={fullMode ? "Contain (pas de crop)" : "Cover (fill)"}
          >
            {fullMode ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Main area */}
      <div className="absolute inset-0 pt-16 pb-28 flex items-center justify-center">
        <div
          className={cn(
            "relative h-full w-full max-w-[520px]",
            "rounded-[28px] overflow-hidden border border-white/10",
            "bg-gradient-to-b from-black/60 to-black/80"
          )}
          onPointerDown={onPreviewPointerDown}
          onPointerMove={onPreviewPointerMove}
          onPointerUp={onPreviewPointerUp}
        >
          {/* Content */}
          <div className="absolute inset-0">
            {stage === "capture" ? (
              <>
                {(topTab === "AI" || mode === "Text") ? (
                  <div className="h-full w-full flex items-center justify-center p-6">
                    <div className="w-full rounded-3xl bg-white/5 border border-white/10 p-4">
                      <div className="text-white font-semibold flex items-center gap-2">
                        <Wand2 className="h-4 w-4" /> Magic (IA / AR)
                      </div>
                      <div className="text-xs text-white/70 mt-1">
                        Templates & thèmes prédéfinis (Kuaishou-like) — prêt pour brancher tes composants IA.
                      </div>

                      {mode === "Text" ? (
                        <div className="mt-3">
                          <div className="text-xs text-white/70 mb-2 flex items-center gap-2">
                            <TypeIcon className="h-4 w-4" /> Texte (sans caméra)
                          </div>
                          <textarea
                            value={textDraft}
                            onChange={(e) => setTextDraft(e.target.value)}
                            className="w-full h-40 rounded-2xl bg-black/40 border border-white/10 text-white p-3 text-sm outline-none"
                            placeholder="Écris un message simple (on peut remplacer par dictée + pictos)."
                          />
                        </div>
                      ) : (
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setMusicOpen(true)}
                            className="h-10 rounded-2xl bg-white/10 border border-white/10 text-white text-sm flex items-center justify-center gap-2"
                          >
                            <Radio className="h-4 w-4" /> Music
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowAssist((s) => !s)}
                            className="h-10 rounded-2xl bg-white/10 border border-white/10 text-white text-sm flex items-center justify-center gap-2"
                          >
                            <Eye className="h-4 w-4" /> Inspiring
                          </button>
                        </div>
                      )}

                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-2xl bg-white/5 border border-white/10 p-3 text-white/80">
                          <div className="font-semibold text-white">Templates</div>
                          <div className="mt-1 opacity-80">Transformation · Transition · Dance · Romance · Family · Text</div>
                        </div>
                        <div className="rounded-2xl bg-white/5 border border-white/10 p-3 text-white/80">
                          <div className="font-semibold text-white">Thèmes</div>
                          <div className="mt-1 opacity-80">Nostalgie · Mariage · Vlog · Fun · Cinématique</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Camera preview */}
                    <video
                      ref={videoRef}
                      playsInline
                      muted
                      className="h-full w-full"
                      style={{
                        objectFit: fullMode ? "cover" : "contain", // ✅ contain = pas crop / pas “zoom”
                        backgroundColor: "black",
                        transform: frontCamera ? "scaleX(-1)" : undefined,
                        filter: filterCss,
                      }}
                    />

                    {loadingCamera ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <div className="text-white flex items-center gap-2">
                          <Loader2 className="h-5 w-5 animate-spin" /> Ouverture caméra…
                        </div>
                      </div>
                    ) : null}

                    {cameraError ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/60 p-6">
                        <div className="w-full rounded-3xl bg-white/5 border border-white/10 p-4 text-white">
                          <div className="font-semibold flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5" /> Caméra indisponible
                          </div>
                          <div className="text-xs text-white/70 mt-2">{cameraError}</div>
                          <button
                            type="button"
                            onClick={startCamera}
                            className="mt-3 h-10 px-3 rounded-2xl bg-white/10 border border-white/10 text-white text-sm"
                          >
                            Réessayer
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </>
                )}
              </>
            ) : (
              <>
                {/* PREVIEW */}
                {previewType === "video" ? (
                  <video
                    src={previewUrl}
                    className="h-full w-full"
                    style={{ objectFit: "contain", backgroundColor: "black" }}
                    controls
                    playsInline
                  />
                ) : previewType === "photo" ? (
                  <img src={previewUrl} className="h-full w-full object-contain bg-black" alt="preview" />
                ) : previewType === "audio" ? (
                  <div className="h-full w-full flex items-center justify-center bg-black p-6">
                    <div className="w-full rounded-3xl bg-white/5 border border-white/10 p-4 text-white">
                      <div className="font-semibold flex items-center gap-2">
                        <Radio className="h-4 w-4" /> Audio (Pure Music)
                      </div>
                      <div className="text-xs text-white/70 mt-1">{selectedMusic ? `Musique: ${selectedMusic.title}` : "Aucune musique sélectionnée"}</div>
                      <audio src={previewUrl} controls className="w-full mt-3" />
                    </div>
                  </div>
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-black p-6">
                    <div className="w-full rounded-3xl bg-white/5 border border-white/10 p-4 text-white">
                      <div className="font-semibold flex items-center gap-2">
                        <TypeIcon className="h-4 w-4" /> Texte
                      </div>
                      <div className="text-xs text-white/70 mt-2">{textDraft.trim() || "Texte (vide)"}</div>
                      <div className="mt-3 text-xs text-white/60">
                        Tips: pour non-lettrés, ajoute dictée vocale + stickers/pictos.
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Assist overlays (capture only) */}
          <AnimatePresence>
            {stage === "capture" && showAssist && topTab !== "AI" ? (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                className="absolute bottom-4 left-4 right-4 space-y-2"
              >
                <div className="rounded-2xl bg-black/40 border border-white/10 p-3 text-white text-sm">
                  <div className="text-xs text-white/70 flex items-center gap-2">
                    <Eye className="h-3.5 w-3.5" /> Inspiring
                  </div>
                  <div className="mt-1">{assist.inspiring}</div>
                </div>
                <div className="rounded-2xl bg-black/40 border border-white/10 p-3 text-white text-sm">
                  <div className="text-xs text-white/70 flex items-center gap-2">
                    <Lightbulb className="h-3.5 w-3.5" /> Shot tips
                  </div>
                  <div className="mt-1">{assist.shotTips}</div>
                </div>
                <div className="rounded-2xl bg-black/40 border border-white/10 p-3 text-white text-sm">
                  <div className="text-xs text-white/70 flex items-center gap-2">
                    <Hash className="h-3.5 w-3.5" /> Cover tips
                  </div>
                  <div className="mt-1">{assist.coverTips}</div>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {/* Countdown */}
          <AnimatePresence>
            {countdown > 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="absolute inset-0 flex items-center justify-center bg-black/40"
              >
                <div className="text-white text-7xl font-extrabold drop-shadow">{countdown}</div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {/* Filter badge / Music badge */}
          <div className="absolute top-3 left-3 flex flex-wrap gap-2">
            <span className="px-3 py-1 rounded-full bg-white/10 border border-white/10 text-white text-xs">
              Filtre: {FILTERS.find((f) => f.id === filterId)?.label ?? "—"} (swipe ⇆)
            </span>
            {selectedMusic ? (
              <span className="px-3 py-1 rounded-full bg-white/10 border border-white/10 text-white text-xs">
                {selectedMusic.emoji} {selectedMusic.title}
              </span>
            ) : null}
            <span className="px-3 py-1 rounded-full bg-white/10 border border-white/10 text-white text-xs">
              Canvas: {canvasRatio} · {canvasBackground}
            </span>
          </div>

          {/* Right sidebar */}
          <div className="absolute top-3 right-3 flex flex-col gap-2">
            {/* Capture controls */}
            <RightBtn
              icon={<Repeat2 className="h-5 w-5 text-white" />}
              label="Switch"
              onClick={() => setFrontCamera((v) => !v)}
              disabled={stage !== "capture" || topTab === "AI" || mode === "Text"}
            />

            <RightBtn
              icon={flashOn ? <Flashlight className="h-5 w-5 text-white" /> : <FlashlightOff className="h-5 w-5 text-white/80" />}
              label="Flash"
              active={flashOn}
              onClick={() => setFlashOn((v) => !v)}
              disabled={stage !== "capture" || topTab === "AI" || mode === "Text"}
            />

            <RightBtn
              icon={<Timer className="h-5 w-5 text-white" />}
              label="Timer"
              badge={timerSec ? `${timerSec}s` : undefined}
              active={!!timerSec}
              onClick={() => setTimerSec((s) => (s === 0 ? 3 : s === 3 ? 5 : s === 5 ? 10 : 0))}
              disabled={stage !== "capture"}
            />

            <RightBtn
              icon={<Gauge className="h-5 w-5 text-white" />}
              label="Speed"
              badge={`${speed}x`}
              onClick={() => setSpeed((sp) => (sp === 0.5 ? 1 : sp === 1 ? 1.5 : sp === 1.5 ? 2 : 0.5))}
              disabled={stage !== "capture"}
            />

            <RightBtn
              icon={<Camera className="h-5 w-5 text-white" />}
              label="Length"
              badge={`${length}s`}
              onClick={() => setLength((l) => (l === 15 ? 30 : l === 30 ? 60 : 15))}
              disabled={stage !== "capture"}
            />

            <RightBtn
              icon={<div className={cn("h-3.5 w-3.5 rounded-full", isRecording ? "bg-red-500" : "bg-white/40")} />}
              label="Recording"
              active={isRecording}
              onClick={() => {
                if (stage === "capture" && mode === "Video") handleCapture();
              }}
              disabled={stage !== "capture" || mode !== "Video"}
            />

            <div className="h-px bg-white/10 my-1" />

            {/* Assistance créative */}
            <RightBtn icon={<Eye className="h-5 w-5 text-white" />} label="Inspiring" active={showAssist} onClick={() => setShowAssist((v) => !v)} />
            <RightBtn
              icon={<Flame className="h-5 w-5 text-white" />}
              label="Challenge"
              badge={challenge ? "ON" : undefined}
              active={!!challenge}
              onClick={() => setChallenge((c) => (c ? null : "#DanceChallenge"))}
            />
            <RightBtn
              icon={<Sparkles className="h-5 w-5 text-white" />}
              label="Recommended filter"
              active={recommendedFilterOn}
              onClick={() => setRecommendedFilterOn((v) => !v)}
            />

            <div className="h-px bg-white/10 my-1" />

            {/* Beauté, AR & Effets */}
            <RightBtn icon={<Sparkles className="h-5 w-5 text-white" />} label="Beautify" active={beautifyOn} onClick={() => setBeautifyOn((v) => !v)} />
            <RightBtn icon={<Wand2 className="h-5 w-5 text-white" />} label="Magic" active={magicOn} onClick={() => setMagicOn((v) => !v)} />
            <RightBtn icon={<span className="text-white text-lg">😄</span>} label="Stickers" active={stickersOn} onClick={() => setStickersOn((v) => !v)} />
            <RightBtn icon={<span className="text-white text-lg">✍️</span>} label="Graffiti" active={graffitiOn} onClick={() => setGraffitiOn((v) => !v)} />
            <RightBtn icon={<span className="text-white text-lg">✨</span>} label="Effects" active={effectsOn} onClick={() => setEffectsOn((v) => !v)} />

            <div className="h-px bg-white/10 my-1" />

            {/* Canvas quick controls (stratégique) */}
            <RightBtn
              icon={<span className="text-white text-xs font-bold">{canvasRatio}</span>}
              label="Canvas Ratio"
              onClick={() => setCanvasRatio((r) => (r === "9:16" ? "1:1" : r === "1:1" ? "16:9" : "9:16"))}
            />
            <RightBtn
              icon={<span className="text-white text-lg">🖼️</span>}
              label="Background"
              badge={canvasBackground !== "none" ? "ON" : undefined}
              active={canvasBackground !== "none"}
              onClick={() => setCanvasBackground((b) => (b === "none" ? "blur" : b === "blur" ? "gradient" : "none"))}
            />
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="absolute bottom-0 left-0 right-0 z-10 px-4 pb-4">
        <div className="mx-auto max-w-[740px]">
          <div className="rounded-3xl bg-black/45 border border-white/10 backdrop-blur p-3">
            {stage === "capture" ? (
              <div className="flex items-center justify-between gap-3">
                {/* Modes */}
                <div className="flex items-center gap-2">
                  <ModeBtn
                    m="Burst"
                    icon={<div className="text-white/90">📸</div>}
                    label="Burst"
                    active={mode === "Burst"}
                    onClick={() => setMode("Burst")}
                  />
                  <ModeBtn
                    m="Photo"
                    icon={<ImageIcon className="h-4 w-4 text-white" />}
                    label="Photo"
                    active={mode === "Photo"}
                    onClick={() => setMode("Photo")}
                  />
                  <ModeBtn
                    m="Video"
                    icon={<VideoIcon className="h-4 w-4 text-white" />}
                    label="Vidéo"
                    active={mode === "Video"}
                    onClick={() => setMode("Video")}
                  />
                  <ModeBtn
                    m="Text"
                    icon={<TypeIcon className="h-4 w-4 text-white" />}
                    label="Texte"
                    active={mode === "Text"}
                    onClick={() => setMode("Text")}
                  />
                </div>

                {/* Music / Pure music */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setMusicOpen(true)}
                    className="h-12 px-3 rounded-2xl bg-white/10 border border-white/10 text-white text-sm flex items-center gap-2"
                  >
                    <Radio className="h-4 w-4" />
                    Music
                  </button>

                  <button
                    type="button"
                    onClick={() => setPureMusic((v) => !v)}
                    className={cn(
                      "h-12 px-3 rounded-2xl border text-white text-sm flex items-center gap-2",
                      pureMusic ? "bg-white/15 border-white/25" : "bg-white/10 border-white/10"
                    )}
                    title="Pure Music (audio-first)"
                  >
                    <Radio className="h-4 w-4" />
                    Pure
                  </button>
                </div>

                {/* Capture CTA */}
                <button
                  type="button"
                  onClick={handleCapture}
                  className={cn(
                    "h-12 px-4 rounded-2xl text-white font-semibold flex items-center gap-2",
                    isRecording ? "bg-red-500/80 hover:bg-red-500" : "bg-orange-500/90 hover:bg-orange-500"
                  )}
                >
                  {mode === "Video" ? (
                    <>
                      <div className={cn("h-3 w-3 rounded-full", isRecording ? "bg-white" : "bg-white/90")} />
                      {isRecording ? "Stop" : "Rec"}
                    </>
                  ) : mode === "Text" ? (
                    <>
                      <Check className="h-4 w-4" /> Valider
                    </>
                  ) : (
                    <>
                      <Camera className="h-4 w-4" /> Capturer
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={resetToCapture}
                  className="h-12 px-4 rounded-2xl bg-white/10 border border-white/10 text-white text-sm flex items-center gap-2"
                >
                  <Undo2 className="h-4 w-4" />
                  Refaire
                </button>

                <button
                  type="button"
                  onClick={() => setEditorOpen(true)}
                  className="h-12 px-4 rounded-2xl bg-white/10 border border-white/10 text-white text-sm flex items-center gap-2"
                  disabled={previewType === "text" && !textDraft.trim()}
                >
                  <Scissors className="h-4 w-4" />
                  Éditer (Timeline)
                </button>

                <button
                  type="button"
                  onClick={publish}
                  className="h-12 px-4 rounded-2xl bg-orange-500/90 hover:bg-orange-500 text-white text-sm font-semibold flex items-center gap-2"
                >
                  <Send className="h-4 w-4" />
                  Publier
                </button>
              </div>
            )}

            <div className="mt-2 text-xs text-white/60 flex items-center justify-between">
              <div>
                Speed: <span className="text-white/80">{speed}x</span> · Length: <span className="text-white/80">{length}s</span> · Timer:{" "}
                <span className="text-white/80">{timerSec ? `${timerSec}s` : "Off"}</span>
              </div>
              <div className="text-white/50">
                Flash (web): simulation · objectFit: {fullMode ? "cover" : "contain"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TimelineEditor overlay */}
      <AnimatePresence>
        {editorOpen && segments.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[95] bg-black"
          >
            <TimelineEditorKuaishou
              segments={segments}
              onSegmentsChange={setSegments}
              onClose={() => setEditorOpen(false)}
              onConfirm={async (finalSegs) => {
                setSegments(finalSegs);
                const first = finalSegs[0];
                if (first?.blob) {
                  if (first.type === "video") {
                    await toPreview(first.blob, "video");
                  } else if (first.type === "photo") {
                    await toPreview(first.blob, "photo");
                  } else if (first.type === "audio") {
                    await toPreview(first.blob, "audio", first.duration);
                  }
                }
                setEditorOpen(false);
              }}
              language={language}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Music bottom sheet */}
      <AnimatePresence>
        {musicOpen ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute inset-0 z-[98] bg-black/70 backdrop-blur flex items-end"
            onClick={() => setMusicOpen(false)}
          >
            <div
              className="w-full rounded-t-[28px] bg-[#0b0b0e] border-t border-white/10 p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <div className="text-white font-semibold flex items-center gap-2">
                  <Radio className="h-4 w-4" /> Music
                </div>
                <button
                  type="button"
                  onClick={() => setMusicOpen(false)}
                  className="h-10 w-10 rounded-2xl bg-white/10 border border-white/10 text-white flex items-center justify-center"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-2xl bg-white/5 border border-white/10 p-3">
                  <div className="text-xs text-white/70 mb-2">Trending</div>
                  <div className="space-y-2">
                    {MUSIC.filter((m) => m.group === "Trending").map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSelectedMusic({ id: m.id, title: m.title, emoji: m.emoji })}
                        className={cn(
                          "w-full text-left rounded-2xl p-3 border",
                          selectedMusic?.id === m.id ? "bg-white/15 border-white/25" : "bg-white/5 border-white/10 hover:bg-white/10"
                        )}
                      >
                        <div className="text-white text-sm font-semibold">
                          {m.emoji} {m.title}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl bg-white/5 border border-white/10 p-3">
                  <div className="text-xs text-white/70 mb-2">Collect / History</div>
                  <div className="space-y-2">
                    {MUSIC.filter((m) => m.group !== "Trending").map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSelectedMusic({ id: m.id, title: m.title, emoji: m.emoji })}
                        className={cn(
                          "w-full text-left rounded-2xl p-3 border",
                          selectedMusic?.id === m.id ? "bg-white/15 border-white/25" : "bg-white/5 border-white/10 hover:bg-white/10"
                        )}
                      >
                        <div className="text-white text-sm font-semibold">
                          {m.emoji} {m.title}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setSelectedMusic(null)}
                  className="h-11 px-4 rounded-2xl bg-white/10 border border-white/10 text-white text-sm"
                >
                  Retirer
                </button>
                <button
                  type="button"
                  onClick={() => setMusicOpen(false)}
                  className="h-11 px-4 rounded-2xl bg-orange-500/90 hover:bg-orange-500 text-white text-sm font-semibold"
                >
                  OK
                </button>
              </div>

              <div className="mt-2 text-xs text-white/60">
                UX: Music · Trending · Collect · History · Pure Music.
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
