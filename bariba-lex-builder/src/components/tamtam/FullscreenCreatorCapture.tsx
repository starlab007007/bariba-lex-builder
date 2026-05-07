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
} from "lucide-react";

/**
 * FullscreenCreatorCapture.tsx
 * Kuaishou-like “Capture plein écran” (avant montage)
 *
 * ✅ Entrée & Navigation (top tabs): Video | Story | AI | LIVE
 * ✅ Bottom modes: Burst | Photo | Video | Text + Durées (Length)
 * ✅ Barre latérale droite (capture): Switch | Flash | Timer | Speed | Length | Recording
 * ✅ Assistance créative: Inspiring | Shot tips | Cover tips | Challenge | Recommended filter
 * ✅ Beauté/AR: Beautify | Magic | Stickers | Graffiti | Effects | Filter swipe (UX ready)
 * ✅ Audio/Music: Music + Trending + Collect + History + Pure Music badge
 *
 * IMPORTANT: capture réelle (MediaRecorder/getUserMedia) intégrée en mode “Video/Photo/Audio”
 * - Pour production: brancher au backend upload/publish
 */

type TopTab = "Video" | "Story" | "AI" | "LIVE";
type CaptureMode = "Burst" | "Photo" | "Video" | "Text";
type SpeedPreset = 0.5 | 1 | 1.5 | 2;
type LengthPreset = 15 | 30 | 60;

type RecommendedFilter = "none" | "beauty" | "warm" | "cool" | "vivid" | "vintage" | "bw" | "dramatic";

type CaptureOutput =
  | { kind: "photo"; blob: Blob; width?: number; height?: number; filter?: RecommendedFilter; meta?: any }
  | { kind: "video"; blob: Blob; durationSec: number; filter?: RecommendedFilter; meta?: any }
  | { kind: "audio"; blob: Blob; durationSec: number; filter?: RecommendedFilter; meta?: any }
  | { kind: "text"; text: string; filter?: RecommendedFilter; meta?: any };

interface FullscreenCreatorCaptureProps {
  onClose: () => void;
  /**
   * Appelée quand l’utilisateur valide la capture.
   * Tu connectes ensuite au montage (TimelineEditorKuaishou).
   */
  onCaptured: (output: CaptureOutput) => void;
  /**
   * Optionnel: si tu veux forcer le type initial (Video, Story, AI, LIVE)
   */
  initialTab?: TopTab;
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

function fmtTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

async function ensurePermission() {
  // Trigger permissions in a controlled way if needed.
  return true;
}

export const FullscreenCreatorCapture: React.FC<FullscreenCreatorCaptureProps> = ({
  onClose,
  onCaptured,
  initialTab = "Video",
}) => {
  /** =========================
   * State: Tabs & Modes
   * ========================= */
  const [topTab, setTopTab] = useState<TopTab>(initialTab);
  const [mode, setMode] = useState<CaptureMode>("Video");

  /** =========================
   * State: Right Bar Controls
   * ========================= */
  const [frontCamera, setFrontCamera] = useState(true); // Switch
  const [flashOn, setFlashOn] = useState(false); // Flash (UX; web flash is limited)
  const [timerSec, setTimerSec] = useState<0 | 3 | 5 | 10>(0); // Timer
  const [speed, setSpeed] = useState<SpeedPreset>(1); // Speed
  const [length, setLength] = useState<LengthPreset>(30); // Length
  const [isRecording, setIsRecording] = useState(false); // Recording state

  /** =========================
   * State: Creative Assist
   * ========================= */
  const [showAssist, setShowAssist] = useState(true);
  const [challenge, setChallenge] = useState<string | null>(null);
  const [recommendedFilterOn, setRecommendedFilterOn] = useState(true);

  /** =========================
   * State: Beautify / AR / Effects (UX ready)
   * ========================= */
  const [beautifyOn, setBeautifyOn] = useState(true);
  const [magicOn, setMagicOn] = useState(true);
  const [effectsOn, setEffectsOn] = useState(false);
  const [stickersOn, setStickersOn] = useState(false);
  const [graffitiOn, setGraffitiOn] = useState(false);

  /** =========================
   * State: Filter swipe + selection
   * ========================= */
  const [filterId, setFilterId] = useState<RecommendedFilter>("none");

  const filterCss = useMemo(() => {
    const base = FILTERS.find((f) => f.id === filterId)?.css ?? "none";
    // “Beautify” adds subtle softening
    if (beautifyOn && base === "none") return "brightness(1.03) saturate(1.05) blur(0.25px)";
    if (beautifyOn) return `${base} blur(0.15px)`;
    return base;
  }, [filterId, beautifyOn]);

  /** =========================
   * State: Audio/Music (UX ready)
   * ========================= */
  const [musicOpen, setMusicOpen] = useState(false);
  const [selectedMusic, setSelectedMusic] = useState<{ id: string; title: string; emoji: string } | null>(null);
  const [pureMusic, setPureMusic] = useState(false);

  /** =========================
   * State: Text Mode (no camera)
   * ========================= */
  const [textDraft, setTextDraft] = useState("");

  /** =========================
   * Fullscreen / Layout
   * ========================= */
  const [isFullscreen, setIsFullscreen] = useState(true);

  /** =========================
   * Camera / Recorder
   * ========================= */
  const videoEl = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const recordStartRef = useRef<number>(0);
  const timerIntervalRef = useRef<number | null>(null);

  const [cameraError, setCameraError] = useState<string | null>(null);
  const [loadingCamera, setLoadingCamera] = useState(false);

  /** =========================
   * Filter swipe gesture
   * ========================= */
  const swipeRef = useRef<{ x0: number; active: boolean } | null>(null);
  const setNextFilter = useCallback((dir: -1 | 1) => {
    const idx = FILTERS.findIndex((f) => f.id === filterId);
    const next = clamp(idx + dir, 0, FILTERS.length - 1);
    setFilterId(FILTERS[next].id);
  }, [filterId]);

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
   * Simple heuristic: based on mode/topTab
   * ========================= */
  useEffect(() => {
    if (!recommendedFilterOn) return;
    // Simple proactiveness: pick a default filter depending on context
    if (topTab === "Story") setFilterId("warm");
    else if (topTab === "AI") setFilterId("vivid");
    else if (topTab === "LIVE") setFilterId("none");
    else {
      // Video tab
      if (mode === "Photo") setFilterId("beauty");
      else if (mode === "Text") setFilterId("none");
      else setFilterId("vivid");
    }
  }, [recommendedFilterOn, topTab, mode]);

  /** =========================
   * Camera init/stop
   * ========================= */
  const stopCamera = useCallback(() => {
    if (timerIntervalRef.current) {
      window.clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    try {
      if (videoEl.current) {
        videoEl.current.srcObject = null;
      }
    } catch {}
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    setLoadingCamera(true);
    try {
      await ensurePermission();
      stopCamera();

      // Constraints
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: frontCamera ? "user" : "environment",
          width: { ideal: 1080 },
          height: { ideal: 1920 },
        },
        audio: mode === "Video" || pureMusic ? true : false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoEl.current) {
        videoEl.current.srcObject = stream;
        videoEl.current.play().catch(() => {});
      }
    } catch (e: any) {
      setCameraError(e?.message || "Impossible d’accéder à la caméra/micro.");
    } finally {
      setLoadingCamera(false);
    }
  }, [frontCamera, mode, pureMusic, stopCamera]);

  // Auto start camera for modes that need it
  useEffect(() => {
    const needsCamera = topTab !== "AI" && mode !== "Text";
    if (!needsCamera) {
      stopCamera();
      return;
    }
    startCamera();
    return () => stopCamera();
  }, [topTab, mode, startCamera, stopCamera]);

  /** =========================
   * Timer countdown (before recording)
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
   * Capture Photo
   * ========================= */
  const takePhoto = useCallback(async () => {
    if (!streamRef.current || !videoEl.current) return;

    const video = videoEl.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1080;
    canvas.height = video.videoHeight || 1920;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Apply "filter" on capture canvas
    ctx.filter = filterCss === "none" ? "none" : filterCss;

    // Simulate “flash” by increasing brightness (web limitation)
    if (flashOn) {
      ctx.filter = `${ctx.filter} brightness(1.2)`;
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const blob: Blob = await new Promise((resolve) => canvas.toBlob((b) => resolve(b || new Blob()), "image/jpeg", 0.92));
    onCaptured({
      kind: "photo",
      blob,
      width: canvas.width,
      height: canvas.height,
      filter: filterId,
      meta: { flashOn, timerSec, speed, length, challenge, beautifyOn, magicOn, effectsOn, stickersOn, graffitiOn, selectedMusic, pureMusic },
    });
  }, [filterCss, flashOn, onCaptured, filterId, timerSec, speed, length, challenge, beautifyOn, magicOn, effectsOn, stickersOn, graffitiOn, selectedMusic, pureMusic]);

  /** =========================
   * Record Video/Audio
   * ========================= */
  const stopRecording = useCallback(() => {
    if (!mediaRecorderRef.current) return;
    if (mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const startRecording = useCallback(async () => {
    if (!streamRef.current) return;
    if (isRecording) return;

    chunksRef.current = [];
    recordStartRef.current = Date.now();

    const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
      ? "video/webm;codecs=vp9,opus"
      : MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")
        ? "video/webm;codecs=vp8,opus"
        : "video/webm";

    const isAudioOnly = pureMusic || (mode === "Video" && topTab === "Story" && false); // keep simple
    const recorder = new MediaRecorder(streamRef.current, { mimeType: isAudioOnly ? "audio/webm" : mime });
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (ev) => {
      if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data);
    };

    recorder.onstop = () => {
      setIsRecording(false);
      const duration = Math.max(0.1, (Date.now() - recordStartRef.current) / 1000);
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || (isAudioOnly ? "audio/webm" : "video/webm") });

      onCaptured({
        kind: isAudioOnly ? "audio" : "video",
        blob,
        durationSec: duration,
        filter: filterId,
        meta: { flashOn, timerSec, speed, length, challenge, beautifyOn, magicOn, effectsOn, stickersOn, graffitiOn, selectedMusic, pureMusic },
      });
    };

    setIsRecording(true);
    recorder.start(200);

    // auto stop based on “Length”
    window.setTimeout(() => {
      try {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
          mediaRecorderRef.current.stop();
        }
      } catch {}
    }, length * 1000);
  }, [isRecording, onCaptured, filterId, flashOn, timerSec, speed, length, challenge, beautifyOn, magicOn, effectsOn, stickersOn, graffitiOn, selectedMusic, pureMusic, mode, topTab]);

  /** =========================
   * Primary Capture CTA
   * ========================= */
  const handleCapture = useCallback(async () => {
    if (topTab === "AI") {
      // AI tab opens “Magic Templates & Themes”
      // Here, we simply capture a placeholder “text” to send to editor
      onCaptured({
        kind: "text",
        text: "AI Magic Template: (placeholder) — à remplacer par ta carte DynamicAITemplates.",
        filter: filterId,
        meta: { topTab, mode, challenge, recommendedFilterOn, beautifyOn, magicOn },
      });
      return;
    }

    if (mode === "Text") {
      onCaptured({
        kind: "text",
        text: textDraft.trim() || "Texte (vide)",
        filter: filterId,
        meta: { topTab, mode, challenge, recommendedFilterOn, beautifyOn, magicOn, selectedMusic, pureMusic },
      });
      return;
    }

    if (mode === "Photo" || mode === "Burst") {
      await runCountdownThen(async () => {
        if (mode === "Burst") {
          // Burst: take 3 photos quickly
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

    // Video record
    await runCountdownThen(async () => {
      if (isRecording) stopRecording();
      else await startRecording();
    });
  }, [mode, onCaptured, filterId, textDraft, topTab, challenge, recommendedFilterOn, beautifyOn, magicOn, runCountdownThen, takePhoto, isRecording, stopRecording, startRecording]);

  /** =========================
   * UI pieces
   * ========================= */
  const RightBtn: React.FC<{
    icon: React.ReactNode;
    label: string;
    active?: boolean;
    badge?: string;
    onClick: () => void;
  }> = ({ icon, label, active, badge, onClick }) => (
    <button
      onClick={onClick}
      type="button"
      className={[
        "relative w-12 h-12 rounded-2xl flex items-center justify-center",
        "bg-black/35 border border-white/10 backdrop-blur",
        "hover:bg-black/45",
        active ? "ring-2 ring-white/30" : "",
      ].join(" ")}
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

  const ModeBtn: React.FC<{ m: CaptureMode; icon: React.ReactNode; label: string; active: boolean; onClick: () => void }> = ({
    m,
    icon,
    label,
    active,
    onClick,
  }) => (
    <button
      type="button"
      onClick={onClick}
      className={[
        "h-12 px-3 rounded-2xl border text-xs flex flex-col items-center justify-center gap-1",
        active ? "bg-white/15 border-white/25 text-white" : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10",
      ].join(" ")}
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  const TopTabBtn: React.FC<{ tab: TopTab; active: boolean; onClick: () => void }> = ({ tab, active, onClick }) => (
    <button
      type="button"
      onClick={onClick}
      className={[
        "h-9 px-3 rounded-2xl border text-xs",
        active ? "bg-white/15 border-white/25 text-white" : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10",
      ].join(" ")}
    >
      {tab}
    </button>
  );

  /** =========================
   * Assist texts
   * ========================= */
  const assist = useMemo(() => {
    const inspiring =
      topTab === "Story"
        ? "Idée: une phrase simple + une action claire."
        : topTab === "AI"
          ? "Idée: choisis un template et laisse l’IA proposer filtre + musique."
          : topTab === "LIVE"
            ? "Idée: annonce courte + appel à s’abonner."
            : "Idée: accroche 1s + preuve + appel.";

    const shotTips =
      challenge?.includes("Market") ? "Shot tips: montre produit + prix + bénéfice en 3 plans." :
        challenge?.includes("Dance") ? "Shot tips: cadre plein corps, lumière face." :
          "Shot tips: 1 action par plan, gestes clairs.";

    const coverTips =
      topTab === "Story" ? "Cover tips: 3 mots max, contraste fort." :
        "Cover tips: visage/objet centré, titre ultra court.";

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
   * Cleanup
   * ========================= */
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  /** =========================
   * Render
   * ========================= */
  return (
    <div className="fixed inset-0 z-[90] bg-black">
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 z-10 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
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
            <div className="text-xs text-white/60">Capture plein écran (avant montage) · swipe ⇆ pour changer de filtre</div>
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
            onClick={() => setIsFullscreen((f) => !f)}
            className="h-10 w-10 rounded-2xl bg-white/10 border border-white/10 text-white flex items-center justify-center"
            title="Plein écran"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Preview Area */}
      <div
        className={[
          "absolute inset-0 pt-16 pb-28",
          "flex items-center justify-center",
        ].join(" ")}
      >
        <div
          className={[
            "relative h-full w-full max-w-[520px]",
            "rounded-[28px] overflow-hidden border border-white/10",
            "bg-gradient-to-b from-black/60 to-black/80",
          ].join(" ")}
          onPointerDown={onPreviewPointerDown}
          onPointerMove={onPreviewPointerMove}
          onPointerUp={onPreviewPointerUp}
        >
          {/* Video preview */}
          <div className="absolute inset-0">
            {topTab === "AI" || mode === "Text" ? (
              <div className="h-full w-full flex items-center justify-center p-6">
                <div className="w-full rounded-3xl bg-white/5 border border-white/10 p-4">
                  <div className="text-white font-semibold flex items-center gap-2">
                    <Wand2 className="h-4 w-4" /> AI Magic
                  </div>
                  <div className="text-xs text-white/70 mt-1">
                    Ouvre ici ta carte DynamicAITemplates (scripts, hooks, hashtags…).
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
                        placeholder="Écris un message simple (pour non-lettrés: on peut remplacer par dictée vocale + pictos)."
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
                </div>
              </div>
            ) : (
              <>
                <video
                  ref={videoEl}
                  className="h-full w-full object-cover"
                  style={{ filter: filterCss, transform: frontCamera ? "scaleX(-1)" : "none" }}
                  playsInline
                  muted
                />
                {/* overlay: camera loading/error */}
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
          </div>

          {/* Assist overlays */}
          <AnimatePresence>
            {showAssist && (topTab !== "AI") ? (
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

          {/* Top-right mini badges */}
          <div className="absolute top-3 left-3 flex flex-wrap gap-2">
            <span className="px-3 py-1 rounded-full bg-white/10 border border-white/10 text-white text-xs">
              Filtre: {FILTERS.find((f) => f.id === filterId)?.label ?? "—"} (swipe ⇆)
            </span>
            {selectedMusic ? (
              <span className="px-3 py-1 rounded-full bg-white/10 border border-white/10 text-white text-xs">
                {selectedMusic.emoji} {selectedMusic.title}
              </span>
            ) : null}
          </div>

          {/* Right sidebar tools (capture) */}
          <div className="absolute top-3 right-3 flex flex-col gap-2">
            <RightBtn
              icon={<Repeat2 className="h-5 w-5 text-white" />}
              label="Switch"
              onClick={() => setFrontCamera((v) => !v)}
            />

            <RightBtn
              icon={flashOn ? <Flashlight className="h-5 w-5 text-white" /> : <FlashlightOff className="h-5 w-5 text-white/80" />}
              label="Flash"
              active={flashOn}
              onClick={() => setFlashOn((v) => !v)}
            />

            <RightBtn
              icon={<Timer className="h-5 w-5 text-white" />}
              label="Timer"
              badge={timerSec ? `${timerSec}s` : undefined}
              active={!!timerSec}
              onClick={() => setTimerSec((s) => (s === 0 ? 3 : s === 3 ? 5 : s === 5 ? 10 : 0))}
            />

            <RightBtn
              icon={<Gauge className="h-5 w-5 text-white" />}
              label="Speed"
              badge={`${speed}x`}
              onClick={() => setSpeed((sp) => (sp === 0.5 ? 1 : sp === 1 ? 1.5 : sp === 1.5 ? 2 : 0.5))}
            />

            <RightBtn
              icon={<Camera className="h-5 w-5 text-white" />}
              label="Length"
              badge={`${length}s`}
              onClick={() => setLength((l) => (l === 15 ? 30 : l === 30 ? 60 : 15))}
            />

            <RightBtn
              icon={<div className={`h-3.5 w-3.5 rounded-full ${isRecording ? "bg-red-500" : "bg-white/40"}`} />}
              label="Recording"
              active={isRecording}
              onClick={() => {
                // tap toggles record state for video
                if (mode === "Video") {
                  handleCapture();
                }
              }}
            />

            <div className="h-px bg-white/10 my-1" />

            {/* Assistance créative */}
            <RightBtn
              icon={<Eye className="h-5 w-5 text-white" />}
              label="Inspiring"
              active={showAssist}
              onClick={() => setShowAssist((v) => !v)}
            />
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

            {/* Beauté/AR/Effets */}
            <RightBtn
              icon={<Sparkles className="h-5 w-5 text-white" />}
              label="Beautify"
              active={beautifyOn}
              onClick={() => setBeautifyOn((v) => !v)}
            />
            <RightBtn
              icon={<Wand2 className="h-5 w-5 text-white" />}
              label="Magic"
              active={magicOn}
              onClick={() => setMagicOn((v) => !v)}
            />
            <RightBtn
              icon={<span className="text-white text-lg">😄</span>}
              label="Stickers"
              active={stickersOn}
              onClick={() => setStickersOn((v) => !v)}
            />
            <RightBtn
              icon={<span className="text-white text-lg">✍️</span>}
              label="Graffiti"
              active={graffitiOn}
              onClick={() => setGraffitiOn((v) => !v)}
            />
            <RightBtn
              icon={<span className="text-white text-lg">✨</span>}
              label="Effects"
              active={effectsOn}
              onClick={() => setEffectsOn((v) => !v)}
            />
          </div>
        </div>
      </div>

      {/* Bottom Modes + Capture CTA */}
      <div className="absolute bottom-0 left-0 right-0 z-10 px-4 pb-4">
        <div className="mx-auto max-w-[740px]">
          {/* Modes row */}
          <div className="rounded-3xl bg-black/45 border border-white/10 backdrop-blur p-3">
            <div className="flex items-center justify-between gap-3">
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
                  className={[
                    "h-12 px-3 rounded-2xl border text-white text-sm flex items-center gap-2",
                    pureMusic ? "bg-white/15 border-white/25" : "bg-white/10 border-white/10",
                  ].join(" ")}
                  title="Pure Music (audio-first)"
                >
                  <Radio className="h-4 w-4" />
                  Pure
                </button>
              </div>

              {/* Capture button */}
              <button
                type="button"
                onClick={handleCapture}
                className={[
                  "h-12 px-4 rounded-2xl text-white font-semibold flex items-center gap-2",
                  isRecording ? "bg-red-500/80 hover:bg-red-500" : "bg-orange-500/90 hover:bg-orange-500",
                ].join(" ")}
              >
                {mode === "Video" ? (
                  <>
                    <div className={`h-3 w-3 rounded-full ${isRecording ? "bg-white" : "bg-white/90"}`} />
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

            {/* Small helper line */}
            <div className="mt-2 text-xs text-white/60 flex items-center justify-between">
              <div>
                Speed: <span className="text-white/80">{speed}x</span> · Length: <span className="text-white/80">{length}s</span> · Timer:{" "}
                <span className="text-white/80">{timerSec ? `${timerSec}s` : "Off"}</span>
              </div>
              <div className="text-white/50">Flash (web): simulation</div>
            </div>
          </div>
        </div>
      </div>

      {/* Music bottom sheet */}
      <AnimatePresence>
        {musicOpen ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute inset-0 z-20 bg-black/70 backdrop-blur flex items-end"
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
                        className={[
                          "w-full text-left rounded-2xl p-3 border",
                          selectedMusic?.id === m.id ? "bg-white/15 border-white/25" : "bg-white/5 border-white/10 hover:bg-white/10",
                        ].join(" ")}
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
                        className={[
                          "w-full text-left rounded-2xl p-3 border",
                          selectedMusic?.id === m.id ? "bg-white/15 border-white/25" : "bg-white/5 border-white/10 hover:bg-white/10",
                        ].join(" ")}
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
                UX: Music · Trending · Collect · History. (Audio playback preview à ajouter si besoin)
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};

export default FullscreenCreatorCapture;
