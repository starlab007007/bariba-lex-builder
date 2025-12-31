import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Music,
  Repeat2,
  Timer,
  Flame,
  Eye,
  Sparkles,
  Gauge,
  Expand,
  Zap,
  ChevronDown,
  Image as ImageIcon,
  Video as VideoIcon,
  Type as TypeIcon,
  Wand2,
  Send,
  MessageCircle,
  Radio,
  Camera,
  Play,
  Pause,
  RotateCcw,
  Check,
  AlertCircle,
  Loader2,
  Globe,
} from "lucide-react";

/* =====================================================================================
   ✅ MERGED: VideoFilters (types + filters + hook + panel)
===================================================================================== */

export type VideoFilter = {
  id: string;
  label: string;
  intensity: number; // 0..1
  kind?: "css";
  css?: (intensity: number) => string; // returns CSS filter string
};

export const VIDEO_FILTERS: VideoFilter[] = [
  { id: "none", label: "Normal", intensity: 0, kind: "css", css: () => "none" },
  {
    id: "vivid",
    label: "Vivid",
    intensity: 0.6,
    kind: "css",
    css: (i) => `saturate(${1 + i * 0.9}) contrast(${1 + i * 0.35})`,
  },
  {
    id: "warm",
    label: "Warm",
    intensity: 0.6,
    kind: "css",
    css: (i) => `sepia(${0.18 + i * 0.35}) saturate(${1 + i * 0.5})`,
  },
  {
    id: "cool",
    label: "Cool",
    intensity: 0.6,
    kind: "css",
    css: (i) => `saturate(${1 + i * 0.35}) hue-rotate(${-(10 + i * 20)}deg)`,
  },
  {
    id: "bw",
    label: "B&W",
    intensity: 1,
    kind: "css",
    css: (i) => `grayscale(${0.35 + i * 0.65}) contrast(${1 + i * 0.2})`,
  },
  {
    id: "retro",
    label: "Retro",
    intensity: 0.7,
    kind: "css",
    css: (i) => `sepia(${0.25 + i * 0.4}) contrast(${1 + i * 0.25}) saturate(${1 + i * 0.2})`,
  },
];

export function useVideoFilter() {
  const [currentFilter, setCurrentFilter] = useState<VideoFilter>(VIDEO_FILTERS[0]);

  const getFilterStyle = useCallback((f: VideoFilter, intensity: number) => {
    const css = f?.css?.(Math.max(0, Math.min(1, intensity))) ?? "none";
    return { filter: css };
  }, []);

  return { currentFilter, setCurrentFilter, getFilterStyle };
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

const VideoFiltersPanel: React.FC<{
  open: boolean;
  onClose: () => void;
  current: VideoFilter;
  onPick: (f: VideoFilter) => void;
  onIntensity: (n: number) => void;
}> = ({ open, onClose, current, onPick, onIntensity }) => {
  if (!open) return null;

  return (
    <motion.div
      className="absolute inset-0 z-50 flex items-end justify-center bg-black/50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={onClose}
    >
      <motion.div
        className="w-full max-w-xl rounded-t-3xl bg-neutral-950 border border-white/10 p-4 pb-6"
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="text-white font-semibold">Filtres</div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          {VIDEO_FILTERS.map((f) => {
            const active = f.id === current.id;
            return (
              <button
                key={f.id}
                onClick={() => onPick(f)}
                className={[
                  "rounded-2xl px-3 py-3 text-sm border",
                  active ? "border-white/50 bg-white/10 text-white" : "border-white/10 bg-white/5 text-white/80",
                ].join(" ")}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-white/70">
            <span>Intensité</span>
            <span>{Math.round(current.intensity * 100)}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={current.intensity}
            onChange={(e) => onIntensity(parseFloat(e.target.value))}
            className="w-full mt-2"
          />
        </div>

        <div className="mt-4 flex gap-2">
          <button
            onClick={() => {
              const none = VIDEO_FILTERS.find((x) => x.id === "none")!;
              onPick(none);
              onIntensity(none.intensity);
            }}
            className="flex-1 rounded-2xl py-3 text-sm bg-white/10 text-white hover:bg-white/15"
          >
            Réinitialiser
          </button>
          <button onClick={onClose} className="flex-1 rounded-2xl py-3 text-sm bg-white text-black hover:bg-white/90">
            OK
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default VideoFiltersPanel;

/* =====================================================================================
   ✅ MERGED: DynamicAITemplates (types + component)
===================================================================================== */

export type AIGenType = "hashtags" | "hook" | "title" | "caption" | "script";

export type AITemplate = {
  id: string;
  title: string;
  description?: string;
  tags?: string[];
  category?: "viral" | "education" | "business" | "story" | "community";
};

function fakeAIGenerate(type: AIGenType, topic: string, lang: "fr" | "ba"): string {
  const t = (topic || "").trim() || (lang === "ba" ? "Ìtàn" : "Histoire");
  if (type === "hashtags") {
    const base = ["#TamTam", "#Afrique", "#Culture", "#ShortVideo", "#Trend"];
    const extra = t
      .split(/\s+/)
      .slice(0, 3)
      .map((w) => `#${w.replace(/[^\p{L}\p{N}]/gu, "")}`)
      .filter((x) => x.length > 2);
    return Array.from(new Set([...base, ...extra])).slice(0, 18).join(" ");
  }
  if (type === "hook") {
    return lang === "ba"
      ? `Ẹ̀gbọ́n! Gbàgbọ́ mi—ó máa yà ẹ lẹ́nu ní ìṣẹ́jú kan: ${t}`
      : `Stop ! En 10 secondes tu vas comprendre: ${t}`;
  }
  if (type === "title") {
    return lang === "ba" ? `Ìdí tó fi ṣe pàtàkì: ${t}` : `Pourquoi c'est important: ${t}`;
  }
  if (type === "caption") {
    return lang === "ba"
      ? `🟠 ${t}\n\nṢe o ti rí i rí? Ṣàlàyé ní comments.`
      : `🟠 ${t}\n\nTu l’as déjà vécu ? Dis-le en commentaires.`;
  }
  // script
  return lang === "ba"
    ? `🎬 [Ìbẹ̀rẹ̀]\n1) Ṣàlàyé ìṣòro: ${t}\n2) Fún un ní àpẹẹrẹ tó rọrùn\n3) Dá pari pẹ̀lú ìpè sí ìṣe (like/follow)\n🎬 [Ìparí]`
    : `🎬 [Intro]\n1) Explique le problème: ${t}\n2) Donne un exemple simple\n3) Termine par un appel à l'action (like/follow)\n🎬 [Fin]`;
}

export const DynamicAITemplates: React.FC<{
  open: boolean;
  language: "fr" | "ba";
  topic: string;
  onClose: () => void;
  onGenerated: (p: { type: AIGenType; content: string; templateId?: string }) => void;
  onApplyTemplate?: (t: AITemplate) => void;
}> = ({ open, language, topic, onClose, onGenerated, onApplyTemplate }) => {
  const [busy, setBusy] = useState<AIGenType | null>(null);
  const [category, setCategory] = useState<AITemplate["category"] | "all">("all");

  const templates: AITemplate[] = useMemo(
    () => [
      {
        id: "t-viral-1",
        title: language === "ba" ? "Hook Viral" : "Hook Viral",
        description: language === "ba" ? "Bẹrẹ̀ pẹ̀lú gbolóhùn tó fà á" : "Commence avec une phrase qui accroche",
        category: "viral",
      },
      {
        id: "t-edu-1",
        title: language === "ba" ? "Àkọ́kọ́ Ìmọ̀" : "Mini-cours",
        description: language === "ba" ? "Kọ́ ẹ̀kọ́ ní ìṣẹ́jú 1" : "Explique en 60 secondes",
        category: "education",
      },
      {
        id: "t-business-1",
        title: language === "ba" ? "CTA Business" : "CTA Business",
        description: language === "ba" ? "Gbé ìpolówó rọrùn" : "Call-to-action clair",
        category: "business",
      },
      {
        id: "t-story-1",
        title: language === "ba" ? "Ìtàn Kúkúrú" : "Story courte",
        description: language === "ba" ? "Ìtàn pẹ̀lú ìmọ̀ràn" : "Histoire + leçon",
        category: "story",
      },
      {
        id: "t-community-1",
        title: language === "ba" ? "Ìròyìn Àdúgbò" : "News du village",
        description: language === "ba" ? "Gbé ìròyìn dáadáa" : "Annonce simple et claire",
        category: "community",
      },
    ],
    [language]
  );

  const filtered = useMemo(() => {
    if (category === "all") return templates;
    return templates.filter((t) => t.category === category);
  }, [templates, category]);

  const generate = useCallback(
    async (type: AIGenType, templateId?: string) => {
      if (busy) return;
      setBusy(type);
      try {
        // simulate latency
        await new Promise((r) => setTimeout(r, 250));
        const content = fakeAIGenerate(type, topic, language);
        onGenerated({ type, content, templateId });
      } finally {
        setBusy(null);
      }
    },
    [busy, language, onGenerated, topic]
  );

  if (!open) return null;

  return (
    <motion.div
      className="absolute inset-0 z-50 bg-black/60 flex items-end justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={onClose}
    >
      <motion.div
        className="w-full max-w-2xl rounded-t-3xl bg-neutral-950 border border-white/10 p-4 pb-6"
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 50, opacity: 0 }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="text-white font-semibold flex items-center gap-2">
            <Sparkles className="h-5 w-5" /> AI Templates & Magic
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {(["all", "viral", "education", "business", "story", "community"] as const).map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={[
                "px-3 py-2 rounded-2xl text-xs border",
                category === c ? "border-white/40 bg-white/10 text-white" : "border-white/10 bg-white/5 text-white/70",
              ].join(" ")}
            >
              {c === "all" ? (language === "ba" ? "Gbogbo" : "Tout") : c}
            </button>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {filtered.map((t) => (
            <button
              key={t.id}
              onClick={() => onApplyTemplate?.(t)}
              className="text-left rounded-2xl p-3 border border-white/10 bg-white/5 hover:bg-white/10"
            >
              <div className="text-white font-medium">{t.title}</div>
              {t.description ? <div className="text-white/70 text-xs mt-1">{t.description}</div> : null}
            </button>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-5 gap-2">
          {(
            [
              { type: "hook", label: "Hook" },
              { type: "title", label: language === "ba" ? "Àkọlé" : "Titre" },
              { type: "caption", label: "Caption" },
              { type: "script", label: "Script" },
              { type: "hashtags", label: "#Tags" },
            ] as Array<{ type: AIGenType; label: string }>
          ).map((b) => (
            <button
              key={b.type}
              onClick={() => generate(b.type)}
              className="rounded-2xl py-3 text-sm border border-white/10 bg-white/10 hover:bg-white/15 text-white flex items-center justify-center gap-2"
              disabled={!!busy}
            >
              {busy === b.type ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
              {b.label}
            </button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
};

/* =====================================================================================
   ✅ MERGED: FullscreenCreator (complete single-file version)
===================================================================================== */

type TopTab = "video" | "story" | "template" | "live";
type CaptureMode = "burst" | "photo" | "video" | "text";

interface FullscreenCreatorProps {
  isOpen?: boolean;
  onClose?: () => void;
  onComplete?: (data: {
    audio_url: string;
    media_type: "audio" | "video" | "photo" | "text";
    media_url?: string;
    transcript_fr?: string;
    transcript_ba?: string;
    template_id: string;
    topic: string;
    duration_seconds: number;
    text_content?: string;
    tags?: string[];
    challenge?: string;
    music_title?: string;
    is_story?: boolean;
  }) => Promise<void>;
  language?: "fr" | "ba";
}

type MusicChoice = { id: string; title: string; url?: string; artist?: string };
type GradientTheme = "purpleBlue" | "orangePink" | "greenCyan" | "pinkPurple";

function nowKey() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function safeUUID() {
  // crypto.randomUUID may not exist in older browsers
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c: any = typeof crypto !== "undefined" ? crypto : null;
  if (c?.randomUUID) return c.randomUUID();
  return `id_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function pickMimeType(kind: "video" | "audio") {
  const candidates =
    kind === "video"
      ? ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm", "video/mp4"]
      : ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"];
  return candidates.find((t) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported?.(t)) || "";
}

async function uploadToSupabaseStorage(blob: Blob, ext: string, folder: string): Promise<string> {
  // NOTE: keep the same dynamic import style as your project
  const { supabase } = await import("@/integrations/supabase/client");
  const bucket = "tamtam-media";
  const name = `${folder}/${nowKey()}-${safeUUID()}.${ext}`;
  const contentType =
    blob.type ||
    (ext === "webm" ? "video/webm" : ext === "png" ? "image/png" : "application/octet-stream");

  const { error } = await supabase.storage.from(bucket).upload(name, blob, {
    upsert: true,
    contentType,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(bucket).getPublicUrl(name);
  return data.publicUrl;
}

async function renderStoryTextToImage(text: string, gradient: GradientTheme): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No canvas ctx");

  const g = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  if (gradient === "purpleBlue") {
    g.addColorStop(0, "#7c3aed");
    g.addColorStop(1, "#0ea5e9");
  } else if (gradient === "orangePink") {
    g.addColorStop(0, "#fb7185");
    g.addColorStop(1, "#fb923c");
  } else if (gradient === "pinkPurple") {
    g.addColorStop(0, "#ec4899");
    g.addColorStop(1, "#8b5cf6");
  } else {
    g.addColorStop(0, "#22c55e");
    g.addColorStop(1, "#06b6d4");
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // overlay for readability
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.font = "800 64px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";

  const maxWidth = 920;
  const x = 80;
  let y = 320;

  const words = (text || " ").split(/\s+/);
  let line = "";
  const lines: string[] = [];
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth) {
      if (line) lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);

  for (const l of lines.slice(0, 12)) {
    ctx.fillText(l, x, y);
    y += 84;
  }

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png", 1);
  });
}

async function tryToggleTorch(stream: MediaStream | null, enabled: boolean) {
  try {
    const track = stream?.getVideoTracks?.()[0];
    await track?.applyConstraints?.({ advanced: [{ torch: enabled } as unknown as MediaTrackConstraintSet] });
    return true;
  } catch {
    return false;
  }
}

async function tryForceNoZoom(stream: MediaStream | null) {
  try {
    const track = stream?.getVideoTracks?.()[0];
    if (!track?.getCapabilities || !track?.applyConstraints) return;
    const caps = track.getCapabilities() as any;
    if (caps?.zoom) {
      const min = caps.zoom.min ?? 1;
      const target = Math.max(1, min);
      await track.applyConstraints({ advanced: [{ zoom: target }] });
    }
  } catch {
    // ignore
  }
}

function fmtMs(ms: number) {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export const FullscreenCreator: React.FC<FullscreenCreatorProps> = ({
  isOpen = true,
  onClose,
  onComplete,
  language = "fr",
}) => {
  const { currentFilter, setCurrentFilter, getFilterStyle } = useVideoFilter();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const burstTimerRef = useRef<number | null>(null);
  const recordingStartTime = useRef<number>(0);

  const [topTab, setTopTab] = useState<TopTab>("video");
  const [mode, setMode] = useState<CaptureMode>("video");

  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [countdown, setCountdown] = useState<number>(0);

  const [timerSeconds, setTimerSeconds] = useState<0 | 3 | 10>(0);
  const [speed, setSpeed] = useState<0.5 | 1 | 2>(1);
  const [fullMode, setFullMode] = useState<boolean>(true);
  const [flashOn, setFlashOn] = useState<boolean>(false);
  const [livePhotoOn, setLivePhotoOn] = useState<boolean>(false);

  const [rightExpanded, setRightExpanded] = useState<boolean>(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [magicOpen, setMagicOpen] = useState(false);

  const [topic, setTopic] = useState<string>("");
  const [challenge, setChallenge] = useState<string>("");
  const [tags, setTags] = useState<string[]>([]);

  const [music, setMusic] = useState<MusicChoice | null>(null);
  const [durationPick, setDurationPick] = useState<60 | 300>(60);

  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [previewType, setPreviewType] = useState<"video" | "photo" | "text" | "">("");
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);

  const [storyGradient, setStoryGradient] = useState<GradientTheme>("purpleBlue");
  const [textContent, setTextContent] = useState<string>("");

  const [timerPanel, setTimerPanel] = useState(false);
  const [speedPanel, setSpeedPanel] = useState(false);
  const [challengePanel, setChallengePanel] = useState(false);
  const [inspiringPanel, setInspiringPanel] = useState(false);
  const [musicPanel, setMusicPanel] = useState(false);

  const [livePanelOpen, setLivePanelOpen] = useState(false);
  const [liveSessionId, setLiveSessionId] = useState<string>("");
  const [liveMessages, setLiveMessages] = useState<
    Array<{ id: number; message: string; created_at: string; display_name?: string }>
  >([]);
  const [liveInput, setLiveInput] = useState("");
  const [liveViewers, setLiveViewers] = useState<number>(0);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cameraError, setCameraError] = useState<string>("");
  const [burstCount, setBurstCount] = useState(0);

  const MUSIC_LIST: MusicChoice[] = useMemo(
    () => [
      { id: "m1", title: "Afro Chill", artist: "TamTam Beats" },
      { id: "m2", title: "Drum Groove", artist: "TamTam Studio" },
      { id: "m3", title: "Story Piano", artist: "TamTam Music" },
      { id: "m4", title: "Viral Dance", artist: "Trending Sounds" },
      { id: "m5", title: "Lo-Fi Vibes", artist: "Chill Zone" },
    ],
    []
  );

  const CHALLENGES = useMemo(
    () => ["#DanceChallenge", "#BeforeAfter", "#LearnIn60s", "#MoodStory", "#VillageNews", "#DailyVlog", "#CookingTime", "#Fashion2025"],
    []
  );

  const INSPIRING = useMemo(
    () => [
      language === "ba" ? "Ṣe àlàyé ohun tó gbọ́nọ́ lọ́gbọ́n" : "Explique une astuce en 30 secondes",
      language === "ba" ? "Ṣíwájú/Lẹ́yìn àyípadà" : "Avant/Après transformation",
      language === "ba" ? 'Ìtàn díẹ̀: "ohun tí mo kọ́"' : `Une histoire courte: "ce que j'ai appris"`,
      language === "ba" ? "Àṣìṣe 3 tó tóbi jù" : "Top 3 erreurs à éviter",
      language === "ba" ? "Ìdánwò: sọ ọ̀rọ̀ yìí ní èdè àbínibí" : "Défi: répète ce mot en langue locale",
      language === "ba" ? "Ìmọ̀ràn ọjọ́ọjọ́" : "Conseil du jour",
      language === "ba" ? "Àṣírí tí kò gbọ́dọ̀ sọ" : "Secret bien gardé",
      language === "ba" ? "Ọjọ́ kan ní ìgbésí ayé mi" : "Un jour dans ma vie",
    ],
    [language]
  );

  // Recording duration timer
  useEffect(() => {
    let interval: number | undefined;
    if (isRecording) {
      interval = window.setInterval(() => {
        setRecordingDuration(Date.now() - recordingStartTime.current);
      }, 100);
    } else {
      setRecordingDuration(0);
    }
    return () => {
      if (interval) window.clearInterval(interval);
    };
  }, [isRecording]);

  const stopStream = useCallback(() => {
    try {
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        recorderRef.current.stop();
      }
    } catch {
      // ignore
    }
    recorderRef.current = null;

    if (streamRef.current) {
      for (const t of streamRef.current.getTracks()) t.stop();
    }
    streamRef.current = null;

    if (videoRef.current) {
      // @ts-expect-error - srcObject exists
      videoRef.current.srcObject = null;
    }
    setCameraError("");
  }, []);

  const startStream = useCallback(async () => {
    stopStream();
    setCameraError("");

    try {
      const wantAudio = topTab === "live" || mode === "video";
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode,
          width: { ideal: 1080 },
          height: { ideal: 1920 },
          aspectRatio: { ideal: 9 / 16 },
        },
        audio: wantAudio,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        // @ts-expect-error - srcObject exists
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }

      // reduce "zoomed camera" issue if device exposes zoom capability
      await tryForceNoZoom(stream);

      if (flashOn) {
        await tryToggleTorch(stream, true);
      }
    } catch (e: any) {
      setCameraError(
        language === "ba"
          ? "Kò lè wò káméèrà. Ṣèyẹ̀wò ìyọ̀nda."
          : "Impossible d'accéder à la caméra. Vérifiez les permissions."
      );
      // eslint-disable-next-line no-console
      console.error("[Camera Error]", e);
    }
  }, [facingMode, flashOn, language, mode, stopStream, topTab]);

  useEffect(() => {
    if (!isOpen) return;
    if (topTab === "template") return;

    startStream();

    return () => {
      stopStream();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [isOpen, topTab, facingMode, startStream, stopStream, previewUrl]);

  useEffect(() => {
    return () => {
      if (burstTimerRef.current) window.clearInterval(burstTimerRef.current);
    };
  }, []);

  const handleClose = useCallback(() => {
    stopStream();
    onClose?.();
  }, [onClose, stopStream]);

  const capturePhotoBlob = useCallback(async (): Promise<Blob> => {
    const v = videoRef.current;
    if (!v) throw new Error("No video element");

    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth || 1080;
    canvas.height = v.videoHeight || 1920;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No canvas ctx");

    const f = currentFilter?.id !== "none" ? currentFilter : null;
    if (f) ctx.filter = (getFilterStyle(f, f.intensity).filter as string) || "none";

    ctx.drawImage(v, 0, 0, canvas.width, canvas.height);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("photo toBlob failed"))), "image/png", 1);
    });
  }, [currentFilter, getFilterStyle]);

  const startMediaRecorder = useCallback(async (kind: "video" | "audio") => {
    if (!streamRef.current) throw new Error("No stream");

    chunksRef.current = [];

    const mimeType = pickMimeType(kind);
    const rec = new MediaRecorder(streamRef.current, mimeType ? { mimeType } : undefined);
    recorderRef.current = rec;

    rec.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };

    // smaller timeslice to reduce UI freezing in some browsers
    rec.start(200);
    recordingStartTime.current = Date.now();
    setIsRecording(true);
  }, []);

  const stopRecorderGetBlob = useCallback(async (): Promise<Blob> => {
    return await new Promise<Blob>((resolve) => {
      const rec = recorderRef.current;
      if (!rec) {
        resolve(new Blob([], { type: "video/webm" }));
        return;
      }

      const finalize = () => {
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "video/webm" });
        resolve(blob);
      };

      rec.addEventListener("stop", finalize, { once: true });
      try {
        if (rec.state !== "inactive") rec.stop();
        else finalize();
      } catch {
        finalize();
      } finally {
        recorderRef.current = null;
        setIsRecording(false);
      }
    });
  }, []);

  const doCountdownThen = useCallback(
    async (fn: () => Promise<void>) => {
      if (timerSeconds === 0) return fn();

      setCountdown(timerSeconds);
      let remaining = timerSeconds;

      const tick = () =>
        new Promise<void>((resolve) => {
          window.setTimeout(() => resolve(), 1000);
        });

      while (remaining > 0) {
        await tick();
        remaining -= 1;
        setCountdown(remaining);
      }
      return fn();
    },
    [timerSeconds]
  );

  const beginCapture = useCallback(async () => {
    if (!isOpen) return;

    if (mode === "video") {
      await doCountdownThen(async () => {
        await startMediaRecorder("video");
      });
      return;
    }

    if (mode === "photo") {
      await doCountdownThen(async () => {
        if (livePhotoOn) {
          await startMediaRecorder("video");
          await new Promise((r) => window.setTimeout(r, 2000));
          const blob = await stopRecorderGetBlob();
          const url = URL.createObjectURL(blob);
          setPreviewBlob(blob);
          setPreviewUrl(url);
          setPreviewType("video");
        } else {
          const blob = await capturePhotoBlob();
          const url = URL.createObjectURL(blob);
          setPreviewBlob(blob);
          setPreviewUrl(url);
          setPreviewType("photo");
        }
      });
      return;
    }

    if (mode === "burst") {
      await doCountdownThen(async () => {
        const photos: Blob[] = [];
        let count = 0;
        setBurstCount(0);

        if (burstTimerRef.current) window.clearInterval(burstTimerRef.current);

        burstTimerRef.current = window.setInterval(async () => {
          try {
            const b = await capturePhotoBlob();
            photos.push(b);
            count += 1;
            setBurstCount(count);

            if (count >= 8) {
              if (burstTimerRef.current) window.clearInterval(burstTimerRef.current);
              burstTimerRef.current = null;

              const last = photos[photos.length - 1];
              const url = URL.createObjectURL(last);
              setPreviewBlob(last);
              setPreviewUrl(url);
              setPreviewType("photo");
              setBurstCount(0);
            }
          } catch {
            // ignore burst frame errors
          }
        }, 250);
      });
      return;
    }

    if (mode === "text") {
      const blob = await renderStoryTextToImage(textContent || " ", storyGradient);
      const url = URL.createObjectURL(blob);
      setPreviewBlob(blob);
      setPreviewUrl(url);
      setPreviewType("photo");
      return;
    }
  }, [
    capturePhotoBlob,
    doCountdownThen,
    isOpen,
    livePhotoOn,
    mode,
    startMediaRecorder,
    stopRecorderGetBlob,
    storyGradient,
    textContent,
  ]);

  const endVideoCapture = useCallback(async () => {
    const blob = await stopRecorderGetBlob();
    const url = URL.createObjectURL(blob);
    setPreviewBlob(blob);
    setPreviewUrl(url);
    setPreviewType("video");
  }, [stopRecorderGetBlob]);

  const clearPreview = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl("");
    setPreviewType("");
    setPreviewBlob(null);
  }, [previewUrl]);

  const submit = useCallback(async () => {
    if (!previewBlob) return;

    setIsSubmitting(true);

    try {
      let mediaUrl = "";
      const mediaType: "video" | "photo" | "text" = previewType || "photo";

      if (mediaType === "video") {
        mediaUrl = await uploadToSupabaseStorage(previewBlob, "webm", "videos");
      } else {
        mediaUrl = await uploadToSupabaseStorage(previewBlob, "png", "photos");
      }

      const isStory = topTab === "story";
      const seconds =
        mode === "video" ? Math.max(1, Math.floor(recordingDuration / 1000) || durationPick) : isStory ? 15 : 5;

      const payload = {
        audio_url: mediaType === "video" ? mediaUrl : "",
        media_type: mediaType === "photo" ? ("photo" as const) : mediaType === "video" ? ("video" as const) : ("text" as const),
        media_url: mediaUrl,
        transcript_fr: "",
        transcript_ba: "",
        template_id: "kuaishou-inspired-core",
        topic: topic || (challenge ? challenge : isStory ? "story" : "post"),
        duration_seconds: seconds,
        text_content: mode === "text" ? textContent : undefined,
        tags,
        challenge,
        music_title: music?.title,
        is_story: isStory,
      };

      if (onComplete) await onComplete(payload);

      clearPreview();
      handleClose();
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.error("[Submit Error]", e);
      alert(language === "ba" ? "Àṣìṣe ní fífi sí server" : "Erreur lors de l'envoi");
    } finally {
      setIsSubmitting(false);
    }
  }, [
    challenge,
    clearPreview,
    durationPick,
    handleClose,
    language,
    mode,
    music?.title,
    onComplete,
    previewBlob,
    previewType,
    recordingDuration,
    tags,
    textContent,
    topTab,
    topic,
  ]);

  const doSwitch = useCallback(() => {
    setFacingMode((p) => (p === "environment" ? "user" : "environment"));
  }, []);

  const toggleFlash = useCallback(async () => {
    const next = !flashOn;
    setFlashOn(next);
    await tryToggleTorch(streamRef.current, next);
  }, [flashOn]);

  useEffect(() => {
    if (previewType === "video") {
      const v = document.getElementById("tamtam-preview-video") as HTMLVideoElement | null;
      if (v) v.playbackRate = speed;
    }
  }, [previewType, speed]);

  // LIVE realtime
  useEffect(() => {
    if (!liveSessionId) return;

    let channel: any = null;
    let disposed = false;

    const setupLive = async () => {
      try {
        const { supabase } = await import("@/integrations/supabase/client");
        channel = supabase
          .channel(`live:${liveSessionId}`, { config: { presence: { key: "viewer" } } })
          .on(
            "postgres_changes",
            { event: "INSERT", schema: "public", table: "live_messages", filter: `session_id=eq.${liveSessionId}` },
            (payload: any) => {
              const row = payload.new as any;
              setLiveMessages((prev) => [...prev, row]);
            }
          )
          .on("presence", { event: "sync" }, () => {
            try {
              const state = channel.presenceState?.() as any;
              const count = Object.keys(state || {}).length;
              setLiveViewers(count);
            } catch {
              setLiveViewers((v) => v);
            }
          });

        await channel.subscribe(async (status: string) => {
          if (disposed) return;
          if (status === "SUBSCRIBED") {
            await channel.track({ online_at: new Date().toISOString() });
          }
        });
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("[Live Setup Error]", e);
      }
    };

    setupLive();

    return () => {
      disposed = true;
      (async () => {
        try {
          if (!channel) return;
          const { supabase } = await import("@/integrations/supabase/client");
          supabase.removeChannel(channel);
        } catch {
          // ignore
        }
      })();
    };
  }, [liveSessionId]);

  const createLive = useCallback(async () => {
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: session } = await supabase.auth.getSession();
      const uid = session.session?.user.id;
      if (!uid) {
        alert(language === "ba" ? "Wọlé láti bẹ̀rẹ̀ LIVE" : "Connecte-toi pour lancer un LIVE");
        return;
      }

      const { data, error } = await supabase
        .from("live_sessions")
        .insert({ creator_id: uid, title: topic || "LIVE", status: "live", started_at: new Date().toISOString() })
        .select("id")
        .single();

      if (error) throw error;

      setLiveSessionId(data.id);
      setLivePanelOpen(true);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[Create Live Error]", e);
      alert(language === "ba" ? "Àṣìṣe ní ṣíṣe LIVE" : "Erreur lors de la création du LIVE");
    }
  }, [language, topic]);

  const joinLive = useCallback(async () => {
    if (!liveSessionId) return;
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: session } = await supabase.auth.getSession();
      const uid = session.session?.user.id;
      if (!uid) return;

      await supabase.from("live_participants").upsert({
        session_id: liveSessionId,
        user_id: uid,
        role: "viewer",
        last_seen_at: new Date().toISOString(),
      });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[Join Live Error]", e);
    }
  }, [liveSessionId]);

  useEffect(() => {
    if (topTab === "live" && liveSessionId) {
      joinLive();
    }
  }, [joinLive, liveSessionId, topTab]);

  const sendLive = useCallback(async () => {
    const msg = liveInput.trim();
    if (!msg || !liveSessionId) return;
    setLiveInput("");

    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: session } = await supabase.auth.getSession();
      const uid = session.session?.user.id;

      await supabase.from("live_messages").insert({
        session_id: liveSessionId,
        user_id: uid,
        display_name: session.session?.user.email?.split("@")[0] ?? "viewer",
        message: msg,
        lang: language,
      });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[Send Live Message Error]", e);
    }
  }, [language, liveInput, liveSessionId]);

  const onGenerated = useCallback(
    (p: { type: AIGenType; content: string; templateId?: string }) => {
      if (p.type === "hashtags") {
        const hs = p.content
          .split(/\s+/)
          .filter((x) => x.startsWith("#"))
          .slice(0, 18);
        setTags((prev) => Array.from(new Set([...prev, ...hs])));
      } else if (p.type === "hook" || p.type === "title") {
        setTopic(p.content.split("\n")[0]?.slice(0, 80) || topic);
      } else if (p.type === "caption" || p.type === "script") {
        setTextContent(p.content);
      }
    },
    [topic]
  );

  const onApplyTemplate = useCallback(
    (t: AITemplate) => {
      setMagicOpen(false);
      if (!topic) setTopic(t.title);
    },
    [topic]
  );

  if (isOpen === false) return null;

  const isStory = topTab === "story";
  const recordDurationText = fmtMs(recordingDuration);

  const RightButton = ({
    icon,
    label,
    onClick,
    active,
    hidden,
  }: {
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
    active?: boolean;
    hidden?: boolean;
  }) => {
    if (hidden) return null;
    return (
      <motion.button
        onClick={onClick}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.98 }}
        aria-label={label}
        className={[
          "w-12 h-12 rounded-2xl flex items-center justify-center border",
          active ? "bg-white/20 border-white/30 text-white" : "bg-black/20 border-white/10 text-white/90",
          "backdrop-blur-md",
        ].join(" ")}
      >
        {icon}
      </motion.button>
    );
  };

  const TopTabButton = ({ id, label }: { id: TopTab; label: string }) => {
    const active = topTab === id;
    return (
      <button
        onClick={() => setTopTab(id)}
        className={[
          "px-4 py-2 rounded-2xl text-sm border",
          active ? "bg-white text-black border-white" : "bg-white/10 text-white border-white/10 hover:bg-white/15",
        ].join(" ")}
      >
        {label}
      </button>
    );
  };

  const ModeChip = ({ id, label, icon }: { id: CaptureMode; label: string; icon: React.ReactNode }) => {
    const active = mode === id;
    const disabled = topTab === "live" ? id !== "video" : false;
    return (
      <button
        onClick={() => !disabled && setMode(id)}
        disabled={disabled}
        className={[
          "px-3 py-2 rounded-2xl text-xs border flex items-center gap-2",
          active ? "bg-white text-black border-white" : "bg-white/10 text-white border-white/10 hover:bg-white/15",
          disabled ? "opacity-40 cursor-not-allowed" : "",
        ].join(" ")}
      >
        {icon}
        {label}
      </button>
    );
  };

  const closeOverlays = () => {
    setTimerPanel(false);
    setSpeedPanel(false);
    setChallengePanel(false);
    setInspiringPanel(false);
    setMusicPanel(false);
  };

  const cameraFilterStyle = useMemo(() => {
    const f = currentFilter?.id !== "none" ? currentFilter : VIDEO_FILTERS[0];
    return getFilterStyle(f, f.intensity);
  }, [currentFilter, getFilterStyle]);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[999] bg-black"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-20 p-4 flex items-center justify-between">
          <button onClick={handleClose} className="p-2 rounded-full bg-black/30 text-white border border-white/10">
            <X className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-2">
            <TopTabButton id="video" label="Video" />
            <TopTabButton id="story" label="Story" />
            <TopTabButton id="template" label="AI" />
            <TopTabButton id="live" label="LIVE" />
          </div>

          <button
            onClick={() => setFullMode((v) => !v)}
            className="p-2 rounded-full bg-black/30 text-white border border-white/10"
            aria-label="Plein écran"
          >
            <Expand className="h-5 w-5" />
          </button>
        </div>

        {/* Camera / Preview */}
        <div className="absolute inset-0">
          {previewUrl ? (
            <div className="absolute inset-0">
              {previewType === "video" ? (
                <video
                  id="tamtam-preview-video"
                  src={previewUrl}
                  className="h-full w-full object-cover"
                  controls={false}
                  playsInline
                  loop
                  autoPlay
                  muted
                />
              ) : (
                <img src={previewUrl} className="h-full w-full object-cover" alt="preview" />
              )}
              <div className="absolute top-24 left-4 right-4 z-20 flex items-center justify-between">
                <div className="rounded-2xl bg-black/40 border border-white/10 px-3 py-2 text-white text-xs">
                  {previewType === "video" ? "Preview vidéo" : isStory ? "Story" : "Photo"}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={clearPreview}
                    className="rounded-2xl bg-black/40 border border-white/10 px-3 py-2 text-white text-sm"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={submit}
                    disabled={isSubmitting}
                    className="rounded-2xl bg-white px-4 py-2 text-black text-sm flex items-center gap-2 disabled:opacity-60"
                  >
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Publier
                  </button>
                </div>
              </div>
            </div>
          ) : topTab !== "template" ? (
            <div className="absolute inset-0">
              <video
                ref={videoRef}
                className="h-full w-full object-cover"
                playsInline
                muted
                style={cameraFilterStyle as any}
              />
              {/* camera overlay */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/45 pointer-events-none" />
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-black">
              <div className="text-center text-white/80 px-6">
                <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2">
                  <Sparkles className="h-5 w-5" />
                  <span>Ouvre Magic pour générer (Hook / Caption / Hashtags)</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Countdown */}
        <AnimatePresence>
          {countdown > 0 ? (
            <motion.div
              className="absolute inset-0 z-40 flex items-center justify-center bg-black/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="text-white text-7xl font-black"
                key={countdown}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
              >
                {countdown}
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* Right Toolbar */}
        <div className="absolute right-3 top-28 z-30 flex flex-col gap-2">
          <RightButton
            icon={<Camera className="h-5 w-5" />}
            label="Changer caméra"
            onClick={doSwitch}
            hidden={topTab === "template"}
          />
          <RightButton
            icon={<Timer className="h-5 w-5" />}
            label="Timer"
            onClick={() => {
              setTimerPanel((v) => !v);
              setSpeedPanel(false);
              setChallengePanel(false);
              setInspiringPanel(false);
              setMusicPanel(false);
            }}
            active={timerSeconds !== 0}
            hidden={topTab === "template"}
          />
          <RightButton
            icon={<Gauge className="h-5 w-5" />}
            label="Vitesse"
            onClick={() => {
              setSpeedPanel((v) => !v);
              setTimerPanel(false);
              setChallengePanel(false);
              setInspiringPanel(false);
              setMusicPanel(false);
            }}
            active={speed !== 1}
            hidden={topTab === "template"}
          />
          <RightButton
            icon={<Zap className="h-5 w-5" />}
            label="Flash"
            onClick={toggleFlash}
            active={flashOn}
            hidden={topTab === "template"}
          />
          <RightButton
            icon={<Sparkles className="h-5 w-5" />}
            label="Magic"
            onClick={() => {
              closeOverlays();
              setMagicOpen(true);
            }}
            active={magicOpen}
          />
          <RightButton
            icon={<Eye className="h-5 w-5" />}
            label="Filtres"
            onClick={() => {
              closeOverlays();
              setFiltersOpen(true);
            }}
            active={filtersOpen}
            hidden={topTab === "template"}
          />
          <RightButton
            icon={<Flame className="h-5 w-5" />}
            label="Challenge"
            onClick={() => {
              setChallengePanel((v) => !v);
              setTimerPanel(false);
              setSpeedPanel(false);
              setInspiringPanel(false);
              setMusicPanel(false);
            }}
          />
          <RightButton
            icon={<Globe className="h-5 w-5" />}
            label="Inspiration"
            onClick={() => {
              setInspiringPanel((v) => !v);
              setTimerPanel(false);
              setSpeedPanel(false);
              setChallengePanel(false);
              setMusicPanel(false);
            }}
          />
          <RightButton
            icon={<Music className="h-5 w-5" />}
            label="Musique"
            onClick={() => {
              setMusicPanel((v) => !v);
              setTimerPanel(false);
              setSpeedPanel(false);
              setChallengePanel(false);
              setInspiringPanel(false);
            }}
            active={!!music}
          />
          <RightButton
            icon={<ChevronDown className="h-5 w-5" />}
            label="Réduire"
            onClick={() => setRightExpanded((v) => !v)}
            active={rightExpanded}
          />
        </div>

        {/* Small Panels (right side) */}
        <AnimatePresence>
          {timerPanel ? (
            <motion.div
              className="absolute right-20 top-36 z-40 w-48 rounded-2xl border border-white/10 bg-black/50 backdrop-blur-md p-3 text-white"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
            >
              <div className="text-xs text-white/70 mb-2">Timer</div>
              {[0, 3, 10].map((t) => (
                <button
                  key={t}
                  onClick={() => setTimerSeconds(t as 0 | 3 | 10)}
                  className={[
                    "w-full text-left px-3 py-2 rounded-xl border mb-2",
                    timerSeconds === t ? "bg-white text-black border-white" : "bg-white/10 border-white/10",
                  ].join(" ")}
                >
                  {t === 0 ? "Off" : `${t}s`}
                </button>
              ))}
            </motion.div>
          ) : null}
        </AnimatePresence>

        <AnimatePresence>
          {speedPanel ? (
            <motion.div
              className="absolute right-20 top-50 z-40 w-48 rounded-2xl border border-white/10 bg-black/50 backdrop-blur-md p-3 text-white"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
            >
              <div className="text-xs text-white/70 mb-2">Vitesse</div>
              {[0.5, 1, 2].map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeed(s as 0.5 | 1 | 2)}
                  className={[
                    "w-full text-left px-3 py-2 rounded-xl border mb-2",
                    speed === s ? "bg-white text-black border-white" : "bg-white/10 border-white/10",
                  ].join(" ")}
                >
                  {s}x
                </button>
              ))}
            </motion.div>
          ) : null}
        </AnimatePresence>

        <AnimatePresence>
          {challengePanel ? (
            <motion.div
              className="absolute right-20 bottom-40 z-40 w-56 rounded-2xl border border-white/10 bg-black/50 backdrop-blur-md p-3 text-white"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
            >
              <div className="text-xs text-white/70 mb-2">Challenges</div>
              <div className="flex flex-wrap gap-2">
                {CHALLENGES.map((c) => (
                  <button
                    key={c}
                    onClick={() => setChallenge(c)}
                    className={[
                      "px-3 py-2 rounded-2xl text-xs border",
                      challenge === c ? "bg-white text-black border-white" : "bg-white/10 border-white/10 text-white",
                    ].join(" ")}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <AnimatePresence>
          {inspiringPanel ? (
            <motion.div
              className="absolute left-4 bottom-32 z-40 w-[min(520px,calc(100vw-32px))] rounded-2xl border border-white/10 bg-black/55 backdrop-blur-md p-3 text-white"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
            >
              <div className="text-xs text-white/70 mb-2">Idées rapides</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {INSPIRING.map((i) => (
                  <button
                    key={i}
                    onClick={() => setTopic(i)}
                    className="text-left px-3 py-3 rounded-2xl bg-white/10 border border-white/10 hover:bg-white/15"
                  >
                    <div className="text-sm text-white">{i}</div>
                  </button>
                ))}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <AnimatePresence>
          {musicPanel ? (
            <motion.div
              className="absolute left-4 top-28 z-40 w-[min(420px,calc(100vw-32px))] rounded-2xl border border-white/10 bg-black/55 backdrop-blur-md p-3 text-white"
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
            >
              <div className="flex items-center justify-between">
                <div className="text-xs text-white/70">Musique</div>
                <button
                  onClick={() => setMusic(null)}
                  className="text-xs px-3 py-1 rounded-full bg-white/10 border border-white/10 hover:bg-white/15"
                >
                  Retirer
                </button>
              </div>

              <div className="mt-2 grid grid-cols-1 gap-2">
                {MUSIC_LIST.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setMusic(m)}
                    className={[
                      "text-left px-3 py-3 rounded-2xl border",
                      music?.id === m.id ? "bg-white text-black border-white" : "bg-white/10 border-white/10 text-white",
                    ].join(" ")}
                  >
                    <div className="text-sm font-medium">{m.title}</div>
                    <div className="text-xs opacity-75">{m.artist}</div>
                  </button>
                ))}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* Bottom Controls */}
        <div className="absolute left-0 right-0 bottom-0 z-30 p-4 pb-6">
          {/* errors */}
          {cameraError ? (
            <div className="mb-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-red-100 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{cameraError}</span>
            </div>
          ) : null}

          {/* meta row */}
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ModeChip id="burst" label="Rafale" icon={<Repeat2 className="h-4 w-4" />} />
              <ModeChip id="photo" label="Photo" icon={<ImageIcon className="h-4 w-4" />} />
              <ModeChip id="video" label="Vidéo" icon={<VideoIcon className="h-4 w-4" />} />
              <ModeChip id="text" label="Texte" icon={<TypeIcon className="h-4 w-4" />} />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setLivePhotoOn((v) => !v)}
                className={[
                  "px-3 py-2 rounded-2xl text-xs border",
                  livePhotoOn ? "bg-white text-black border-white" : "bg-white/10 text-white border-white/10 hover:bg-white/15",
                ].join(" ")}
                disabled={mode !== "photo"}
              >
                LivePhoto
              </button>

              <button
                onClick={() => setDurationPick((p) => (p === 60 ? 300 : 60))}
                className="px-3 py-2 rounded-2xl text-xs border border-white/10 bg-white/10 text-white hover:bg-white/15"
                disabled={mode !== "video"}
              >
                {durationPick === 60 ? "60s" : "5m"}
              </button>
            </div>
          </div>

          {/* text/story editor */}
          {mode === "text" || topTab === "story" ? (
            <div className="mb-3 rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="text-white/80 text-xs">Texte</div>
                <div className="flex items-center gap-2">
                  {(["purpleBlue", "orangePink", "greenCyan", "pinkPurple"] as GradientTheme[]).map((g) => (
                    <button
                      key={g}
                      onClick={() => setStoryGradient(g)}
                      className={[
                        "px-3 py-1 rounded-full text-xs border",
                        storyGradient === g ? "bg-white text-black border-white" : "bg-white/10 text-white border-white/10",
                      ].join(" ")}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder={language === "ba" ? "Kọ ọrọ rẹ..." : "Écris ton texte..."}
                className="w-full h-24 rounded-2xl bg-black/30 border border-white/10 text-white p-3 outline-none"
              />
            </div>
          ) : null}

          {/* topic + tags */}
          <div className="mb-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="sm:col-span-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
              <div className="text-xs text-white/60 mb-1">{language === "ba" ? "Kókó / Title" : "Sujet / Title"}</div>
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder={language === "ba" ? "Kókó..." : "Sujet..."}
                className="w-full bg-transparent text-white outline-none"
              />
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
              <div className="text-xs text-white/60 mb-1">Tags</div>
              <input
                value={tags.join(" ").slice(0, 120)}
                onChange={(e) => {
                  const raw = e.target.value;
                  const next = raw
                    .split(/\s+/)
                    .filter(Boolean)
                    .map((x) => (x.startsWith("#") ? x : `#${x}`))
                    .slice(0, 18);
                  setTags(Array.from(new Set(next)));
                }}
                placeholder="#tag1 #tag2"
                className="w-full bg-transparent text-white outline-none"
              />
            </div>
          </div>

          {/* record row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-white/80 text-sm">
              {music ? (
                <div className="px-3 py-2 rounded-2xl bg-white/10 border border-white/10 flex items-center gap-2">
                  <Music className="h-4 w-4" />
                  <span className="truncate max-w-[220px]">{music.title}</span>
                </div>
              ) : (
                <div className="px-3 py-2 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-2">
                  <Music className="h-4 w-4 opacity-70" />
                  <span className="opacity-70">{language === "ba" ? "Ko si orin" : "Aucune musique"}</span>
                </div>
              )}

              {isRecording ? (
                <div className="px-3 py-2 rounded-2xl bg-red-500/20 border border-red-500/30 text-red-100 flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                  <span>{recordDurationText}</span>
                </div>
              ) : null}

              {mode === "burst" && burstCount > 0 ? (
                <div className="px-3 py-2 rounded-2xl bg-white/10 border border-white/10">
                  {burstCount}/8
                </div>
              ) : null}
            </div>

            <div className="flex items-center gap-3">
              {/* LIVE */}
              {topTab === "live" ? (
                <button
                  onClick={createLive}
                  className="rounded-2xl px-4 py-3 bg-white text-black flex items-center gap-2"
                >
                  <Radio className="h-4 w-4" />
                  LIVE
                </button>
              ) : null}

              {/* capture */}
              <button
                onClick={async () => {
                  if (isRecording) {
                    await endVideoCapture();
                  } else {
                    await beginCapture();
                  }
                }}
                className={[
                  "w-16 h-16 rounded-full border-2 flex items-center justify-center",
                  isRecording ? "border-red-400 bg-red-500/30" : "border-white bg-white/10",
                ].join(" ")}
                aria-label={isRecording ? "Stop" : "Record"}
              >
                {isRecording ? <Pause className="h-7 w-7 text-white" /> : <Play className="h-7 w-7 text-white" />}
              </button>

              <button
                onClick={() => {
                  setTopic("");
                  setChallenge("");
                  setTags([]);
                  setTextContent("");
                  setMusic(null);
                }}
                className="rounded-2xl px-4 py-3 bg-white/10 border border-white/10 text-white flex items-center gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* Magic / Filters overlays */}
        <AnimatePresence>
          <DynamicAITemplates
            open={magicOpen}
            language={language}
            topic={topic}
            onClose={() => setMagicOpen(false)}
            onGenerated={onGenerated}
            onApplyTemplate={onApplyTemplate}
          />
        </AnimatePresence>

        <AnimatePresence>
          <VideoFiltersPanel
            open={filtersOpen}
            onClose={() => setFiltersOpen(false)}
            current={currentFilter}
            onPick={(f) => setCurrentFilter(f)}
            onIntensity={(n) => setCurrentFilter((p) => ({ ...p, intensity: clamp01(n) }))}
          />
        </AnimatePresence>

        {/* LIVE Panel */}
        <AnimatePresence>
          {livePanelOpen ? (
            <motion.div
              className="absolute inset-0 z-50 bg-black/60 flex items-end justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onMouseDown={() => setLivePanelOpen(false)}
            >
              <motion.div
                className="w-full max-w-2xl rounded-t-3xl bg-neutral-950 border border-white/10 p-4 pb-6"
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 50, opacity: 0 }}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between">
                  <div className="text-white font-semibold flex items-center gap-2">
                    <Radio className="h-5 w-5" /> LIVE
                    <span className="text-xs text-white/60">({liveViewers} viewers)</span>
                  </div>
                  <button onClick={() => setLivePanelOpen(false)} className="p-2 rounded-full hover:bg-white/10 text-white">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="mt-3 h-64 overflow-auto rounded-2xl border border-white/10 bg-white/5 p-3">
                  {liveMessages.length === 0 ? (
                    <div className="text-white/60 text-sm">Aucun message…</div>
                  ) : (
                    <div className="space-y-2">
                      {liveMessages.slice(-80).map((m) => (
                        <div key={m.id} className="rounded-2xl bg-black/30 border border-white/10 p-2">
                          <div className="text-xs text-white/60">{m.display_name ?? "viewer"}</div>
                          <div className="text-sm text-white">{m.message}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-3 flex gap-2">
                  <input
                    value={liveInput}
                    onChange={(e) => setLiveInput(e.target.value)}
                    placeholder={language === "ba" ? "Kọ msg..." : "Écris un message..."}
                    className="flex-1 rounded-2xl bg-black/30 border border-white/10 text-white px-3 py-3 outline-none"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") sendLive();
                    }}
                  />
                  <button
                    onClick={sendLive}
                    className="rounded-2xl bg-white text-black px-4 py-3 flex items-center gap-2"
                  >
                    <Send className="h-4 w-4" />
                    Send
                  </button>
                </div>

                <div className="mt-3 text-xs text-white/60">
                  Session: <span className="text-white/80">{liveSessionId || "—"}</span>
                </div>
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
};
