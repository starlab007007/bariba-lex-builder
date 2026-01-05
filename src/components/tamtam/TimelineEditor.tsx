import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, PanInfo } from "framer-motion";
import {
  X,
  Check,
  Loader2,
  Play,
  Pause,
  Sticker,
  Filter,
  Layers,
  Sliders,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Plus,
  Smartphone,
  Square,
  RectangleHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import VideoFiltersPanel, { VIDEO_FILTERS } from "./VideoFilters";

export type TimelineSegmentV2 = {
  id: string;
  type: "video" | "photo" | "audio" | "text";
  blob: Blob;
  url: string;
  duration: number;
  meta?: any;
};

type AspectPreset = "9:16" | "1:1" | "16:9";
type SidePanel = "none" | "left_canvas" | "right_effects";
type BottomTool = "filters" | "stickers" | "transitions";

type TransitionType = "cut" | "fade" | "swipe" | "zoom";

export type OverlayV2 = {
  id: string;
  kind: "emoji" | "text";
  value: string;
  x: number; // 0..100
  y: number; // 0..100
  scale: number;
  rotation: number;
  start: number;
  end: number;
  tracking: "none" | "follow_center" | "follow_face_placeholder";
};

export type EditResultV2 = {
  segments: TimelineSegmentV2[];
  totalDuration: number;
  overlays: OverlayV2[];
  transitions: { atIndex: number; type: TransitionType; durationMs: number }[];
  canvas: { aspect: AspectPreset; background: "none" | "blur" | "gradient" };
  videoFilterId: string;
  templateId?: string;
  topic?: string;
  tags?: string[];
  challenge?: string;
  musicTitle?: string;
  isStory?: boolean;
  textContent?: string;
  audioUrl?: string;
};

function fmtTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

const STICKERS = ["✨", "🔥", "💯", "👏", "🎉", "❤️", "🙏", "💪", "👍", "⭐", "🌟", "⚡", "✅", "📍", "🎯", "🚀"];

export default function TimelineEditorV2(props: {
  language?: "fr" | "ba";
  initialSegments: TimelineSegmentV2[];
  captureMeta?: any;
  publishing?: boolean;
  onClose: () => void;
  onBackToCapture: () => void;
  onPublish: (edit: EditResultV2) => Promise<void> | void;
}) {
  const { language = "fr", initialSegments, captureMeta, publishing = false, onClose, onBackToCapture, onPublish } = props;

  const [segments] = useState<TimelineSegmentV2[]>(initialSegments);
  const [activeIndex] = useState(0);
  const active = segments[activeIndex];

  const [sidePanel, setSidePanel] = useState<SidePanel>("none");
  const [bottomTool, setBottomTool] = useState<BottomTool>("filters");

  const [aspect, setAspect] = useState<AspectPreset>("9:16");
  const [background, setBackground] = useState<"none" | "blur" | "gradient">("none");
  const [videoFilterId, setVideoFilterId] = useState<string>(captureMeta?.filter || "none");

  const [isPlaying, setIsPlaying] = useState(false);
  const [t, setT] = useState(0);

  const [overlays, setOverlays] = useState<OverlayV2[]>([]);
  const [transitions, setTransitions] = useState<{ atIndex: number; type: TransitionType; durationMs: number }[]>([
    { atIndex: 0, type: "cut", durationMs: 0 },
  ]);

  const totalDuration = useMemo(() => segments.reduce((acc, s) => acc + (s.duration || 0), 0), [segments]);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const tickRef = useRef<number | null>(null);

  const aspectStyle = useMemo(() => {
    if (aspect === "9:16") return { aspectRatio: "9 / 16" as const };
    if (aspect === "1:1") return { aspectRatio: "1 / 1" as const };
    return { aspectRatio: "16 / 9" as const };
  }, [aspect]);

  const bgClass = useMemo(() => {
    if (background === "blur") return "backdrop-blur bg-white/5";
    if (background === "gradient") return "bg-gradient-to-br from-orange-500/20 via-purple-500/15 to-cyan-500/15";
    return "bg-black";
  }, [background]);

  useEffect(() => {
    if (!isPlaying) {
      if (tickRef.current) window.clearInterval(tickRef.current);
      tickRef.current = null;
      return;
    }
    if (tickRef.current) window.clearInterval(tickRef.current);
    tickRef.current = window.setInterval(() => setT((v) => v + 0.1), 100);
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
      tickRef.current = null;
    };
  }, [isPlaying]);

  useEffect(() => {
    if (t > Math.max(0.1, totalDuration)) setT(0);
  }, [t, totalDuration]);

  useEffect(() => {
    if (!active) return;
    if (active.type === "video" && videoRef.current) {
      try {
        videoRef.current.currentTime = clamp(t, 0, Math.max(0, totalDuration - 0.1));
      } catch {}
    }
  }, [t, active, totalDuration]);

  // edge swipe: ← open canvas / → open effects
  const onEdgePanEnd = (_e: any, info: PanInfo) => {
    const dx = info.offset.x;
    if (dx > 80) setSidePanel("left_canvas");
    else if (dx < -80) setSidePanel("right_effects");
  };

  const canShowOverlay = (o: OverlayV2) => t >= o.start && t <= o.end;

  const addSticker = (emoji: string) => {
    setOverlays((p) => [
      ...p,
      {
        id: `ov_${Date.now()}_${Math.random().toString(16).slice(2)}`,
        kind: "emoji",
        value: emoji,
        x: 50,
        y: 55,
        scale: 1,
        rotation: 0,
        start: Math.max(0, t),
        end: Math.min(totalDuration, t + 3),
        tracking: "none",
      },
    ]);
  };

  const removeOverlay = (id: string) => setOverlays((p) => p.filter((o) => o.id !== id));

  const onPublishClick = async () => {
    const textSeg = segments.find((s) => s.type === "text");
    let textContent: string | undefined;
    if (textSeg) {
      try {
        textContent = textSeg.meta?.text ?? new TextDecoder().decode(await textSeg.blob.arrayBuffer());
      } catch {
        textContent = textSeg.meta?.text;
      }
    }

    const out: EditResultV2 = {
      segments,
      totalDuration,
      overlays,
      transitions,
      canvas: { aspect, background },
      videoFilterId,
      templateId: "kuaishou_v2",
      topic: captureMeta?.challenge || "creation",
      tags: ["tamtam", "v2", videoFilterId],
      challenge: captureMeta?.challenge,
      musicTitle: captureMeta?.selectedMusic?.title,
      isStory: captureMeta?.topTab === "Story",
      textContent,
      audioUrl: "",
    };

    await onPublish(out);
  };

  if (!active) return null;

  const filterCss = VIDEO_FILTERS.find((f) => f.id === videoFilterId)?.cssFilter || "none";

  return (
    <div className="absolute inset-0">
      {/* Swipe layer */}
      <motion.div
        className="absolute inset-0"
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.08}
        onDragEnd={onEdgePanEnd}
      />

      {/* Main canvas area */}
      <div className="absolute inset-0 pt-16 pb-24 flex items-center justify-center">
        <div className={cn("relative w-full max-w-[560px] rounded-[30px] overflow-hidden border border-white/10", bgClass)} style={aspectStyle}>
          <div className="absolute inset-0">
            {active.type === "video" ? (
              <video
                ref={videoRef}
                className="h-full w-full object-cover"
                style={{ filter: filterCss }}
                src={active.url}
                playsInline
                muted
              />
            ) : active.type === "photo" ? (
              <img className="h-full w-full object-cover" style={{ filter: filterCss }} src={active.url} alt="preview" />
            ) : active.type === "text" ? (
              <div className="h-full w-full flex items-center justify-center p-6">
                <div className="w-full rounded-3xl bg-white/5 border border-white/10 p-5 text-white">
                  <div className="text-sm font-semibold mb-2">Texte</div>
                  <div className="text-white/80 whitespace-pre-wrap">{active.meta?.text || "Texte"}</div>
                </div>
              </div>
            ) : (
              <div className="h-full w-full flex items-center justify-center text-white/60">Audio</div>
            )}
          </div>

          {/* Overlays */}
          <div className="absolute inset-0 pointer-events-none">
            {overlays.filter(canShowOverlay).map((o) => (
              <div
                key={o.id}
                className="absolute"
                style={{
                  left: `${o.x}%`,
                  top: `${o.y}%`,
                  transform: `translate(-50%, -50%) rotate(${o.rotation}deg) scale(${o.scale})`,
                }}
              >
                <div className="text-4xl drop-shadow">{o.value}</div>
              </div>
            ))}
          </div>

          {/* HUD top */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
            <div className="text-white text-xs px-3 py-1 rounded-full bg-black/40 border border-white/10">
              {fmtTime(t)} / {fmtTime(totalDuration)}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsPlaying((v) => !v)}
                className="h-10 w-10 rounded-2xl bg-white/10 border border-white/10 text-white flex items-center justify-center"
                title="Play/Pause"
              >
                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              </button>

              <button
                type="button"
                onClick={() => setSidePanel("right_effects")}
                className="h-10 px-3 rounded-2xl bg-white/10 border border-white/10 text-white text-xs"
              >
                Effects ⇢
              </button>
            </div>
          </div>

          {/* Quick overlays strip */}
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2">
            <div className="flex gap-2 overflow-x-auto">
              {overlays.slice(-6).map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => removeOverlay(o.id)}
                  className="pointer-events-auto px-3 py-2 rounded-2xl bg-black/40 border border-white/10 text-white text-xs"
                  title="Supprimer overlay"
                >
                  {o.value} <Trash2 className="inline h-3 w-3 ml-1" />
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => addSticker("✨")}
              className="pointer-events-auto h-10 px-3 rounded-2xl bg-orange-500/90 hover:bg-orange-500 text-white text-xs font-semibold flex items-center gap-2"
            >
              <Plus className="h-4 w-4" /> Sticker
            </button>
          </div>
        </div>
      </div>

      {/* Bottom drawer */}
      <div className="absolute bottom-0 left-0 right-0 z-10 px-4 pb-4">
        <div className="mx-auto max-w-[980px] rounded-3xl bg-black/45 border border-white/10 backdrop-blur p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onBackToCapture}
                className="h-11 px-3 rounded-2xl bg-white/10 border border-white/10 text-white text-sm flex items-center gap-2"
              >
                <ChevronLeft className="h-4 w-4" /> Capture
              </button>

              <button
                type="button"
                onClick={() => setSidePanel("left_canvas")}
                className="h-11 px-3 rounded-2xl bg-white/10 border border-white/10 text-white text-sm flex items-center gap-2"
              >
                <ChevronRight className="h-4 w-4" /> Canvas ⇠
              </button>

              <button
                type="button"
                onClick={() => setBottomTool("filters")}
                className={cn(
                  "h-11 px-3 rounded-2xl border text-white text-sm flex items-center gap-2",
                  bottomTool === "filters" ? "bg-white/15 border-white/25" : "bg-white/10 border-white/10"
                )}
              >
                <Filter className="h-4 w-4" /> Filtres
              </button>

              <button
                type="button"
                onClick={() => setBottomTool("stickers")}
                className={cn(
                  "h-11 px-3 rounded-2xl border text-white text-sm flex items-center gap-2",
                  bottomTool === "stickers" ? "bg-white/15 border-white/25" : "bg-white/10 border-white/10"
                )}
              >
                <Sticker className="h-4 w-4" /> Stickers
              </button>

              <button
                type="button"
                onClick={() => setBottomTool("transitions")}
                className={cn(
                  "h-11 px-3 rounded-2xl border text-white text-sm flex items-center gap-2",
                  bottomTool === "transitions" ? "bg-white/15 border-white/25" : "bg-white/10 border-white/10"
                )}
              >
                <Layers className="h-4 w-4" /> Transitions
              </button>
            </div>

            <button
              type="button"
              disabled={publishing}
              onClick={onPublishClick}
              className={cn(
                "h-11 px-4 rounded-2xl text-white font-semibold flex items-center gap-2 border",
                publishing ? "bg-white/10 border-white/10" : "bg-orange-500/90 hover:bg-orange-500 border-orange-500/30"
              )}
            >
              {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Publier
            </button>
          </div>

          <div className="mt-3">
            {bottomTool === "filters" ? (
              <div className="rounded-2xl bg-white/5 border border-white/10 p-3">
                <div className="text-white text-xs mb-2">Filtres</div>
                <VideoFiltersPanel
                  isOpen
                  onClose={() => {}}
                  selectedFilterId={videoFilterId}
                  onSelectFilter={(f) => setVideoFilterId(f.id)}
                  language={language}
                />
              </div>
            ) : null}

            {bottomTool === "stickers" ? (
              <div className="rounded-2xl bg-white/5 border border-white/10 p-3">
                <div className="text-white text-xs mb-2">Stickers</div>
                <div className="flex gap-2 flex-wrap">
                  {STICKERS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => addSticker(s)}
                      className="h-11 px-3 rounded-2xl bg-white/10 border border-white/10 text-white text-lg"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {bottomTool === "transitions" ? (
              <div className="rounded-2xl bg-white/5 border border-white/10 p-3">
                <div className="text-white text-xs mb-2">Transitions</div>
                <div className="flex gap-2 flex-wrap">
                  {(["cut", "fade", "swipe", "zoom"] as TransitionType[]).map((tt) => (
                    <button
                      key={tt}
                      type="button"
                      onClick={() => setTransitions([{ atIndex: 0, type: tt, durationMs: tt === "cut" ? 0 : 250 }])}
                      className="h-11 px-3 rounded-2xl bg-white/10 border border-white/10 text-white text-sm"
                    >
                      {tt}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Left Canvas panel */}
      <AnimatePresence>
        {sidePanel === "left_canvas" ? (
          <motion.div
            initial={{ x: -420, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -420, opacity: 0 }}
            className="absolute top-0 bottom-0 left-0 w-[360px] z-20 bg-[#0b0b0e] border-r border-white/10"
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

            <div className="p-4 space-y-3 text-white">
              <div className="text-xs text-white/70">Ratio</div>
              <div className="flex gap-2">
                <button
                  onClick={() => setAspect("9:16")}
                  className={cn("h-10 px-3 rounded-2xl border", aspect === "9:16" ? "bg-white/15 border-white/25" : "bg-white/10 border-white/10")}
                >
                  <Smartphone className="h-4 w-4 inline mr-1" /> 9:16
                </button>
                <button
                  onClick={() => setAspect("1:1")}
                  className={cn("h-10 px-3 rounded-2xl border", aspect === "1:1" ? "bg-white/15 border-white/25" : "bg-white/10 border-white/10")}
                >
                  <Square className="h-4 w-4 inline mr-1" /> 1:1
                </button>
                <button
                  onClick={() => setAspect("16:9")}
                  className={cn("h-10 px-3 rounded-2xl border", aspect === "16:9" ? "bg-white/15 border-white/25" : "bg-white/10 border-white/10")}
                >
                  <RectangleHorizontal className="h-4 w-4 inline mr-1" /> 16:9
                </button>
              </div>

              <div className="text-xs text-white/70 mt-2">Background</div>
              <div className="flex gap-2">
                {(["none", "blur", "gradient"] as const).map((b) => (
                  <button
                    key={b}
                    onClick={() => setBackground(b)}
                    className={cn("h-10 px-3 rounded-2xl border", background === b ? "bg-white/15 border-white/25" : "bg-white/10 border-white/10")}
                  >
                    {b}
                  </button>
                ))}
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
            className="absolute top-0 bottom-0 right-0 w-[360px] z-20 bg-[#0b0b0e] border-l border-white/10"
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
              <div className="text-xs text-white/70 mb-2">Filtre</div>
              <div className="grid grid-cols-2 gap-2">
                {VIDEO_FILTERS.slice(0, 12).map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setVideoFilterId(f.id)}
                    className={cn(
                      "h-11 px-3 rounded-2xl border text-left",
                      videoFilterId === f.id ? "bg-white/15 border-white/25" : "bg-white/10 border-white/10"
                    )}
                  >
                    {f.icon} {language === "ba" && f.name_ba ? f.name_ba : f.name}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-30 px-4 py-3 flex items-center justify-between">
        <button
          type="button"
          onClick={onClose}
          className="h-10 w-10 rounded-2xl bg-white/10 border border-white/10 text-white flex items-center justify-center"
          title="Fermer"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="text-white/70 text-xs">
          Swipe ← Canvas · Swipe → Effects
        </div>
      </div>
    </div>
  );
}
