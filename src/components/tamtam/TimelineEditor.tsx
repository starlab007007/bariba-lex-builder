// src/components/tamtam/TimelineEditor.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  Check,
  Loader2,
  Scissors,
  Sparkles,
  Subtitles,
  Wand2,
  LayoutGrid,
  Sticker,
  Pencil,
  Film,
  Flame,
  Music,
  Crop,
  Move,
  Undo2,
  Redo2,
  MoreHorizontal,
  EyeOff,
  Eye,
  Volume2,
  VolumeX,
  Type,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type TimelineSegment = {
  id: string;
  blob: Blob;
  type: "video" | "photo" | "audio";
  duration: number; // seconds
  startTime: number;
  endTime: number;
  isMuted?: boolean;
  volume?: number; // 0..100
  filter?: string;
};

interface TimelineEditorProps {
  segments: TimelineSegment[];
  onSegmentsChange: (segments: TimelineSegment[]) => void;

  onClose: () => void;
  onConfirm: (segments: TimelineSegment[]) => Promise<void> | void;

  language?: "fr" | "ba";
}

/**
 * Kuaishou-like Timeline Editor
 * - Fullscreen preview
 * - Minimal HUD by default
 * - Right rail essentials only
 * - Drawers for extended panels (Canvas/Effects/Stickers/Subtitles/Graffiti/Challenge)
 * - Tap to hide HUD, swipe up to open tools
 */
export default function TimelineEditor({
  segments,
  onSegmentsChange,
  onClose,
  onConfirm,
  language = "fr",
}: TimelineEditorProps) {
  const [hudVisible, setHudVisible] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // side panels inside drawer
  const [panel, setPanel] = useState<
    "none" | "enhance" | "canvas" | "subtitles" | "effects" | "stickers" | "graffiti" | "challenge" | "music"
  >("none");

  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // timeline UI
  const [activeSegId, setActiveSegId] = useState<string>(segments[0]?.id ?? "");
  const activeSeg = useMemo(() => segments.find((s) => s.id === activeSegId) ?? segments[0], [segments, activeSegId]);

  // preview
  const [previewUrl, setPreviewUrl] = useState("");
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // lightweight “history”
  const [undoStack, setUndoStack] = useState<TimelineSegment[][]>([]);
  const [redoStack, setRedoStack] = useState<TimelineSegment[][]>([]);

  const pushHistory = (next: TimelineSegment[]) => {
    setUndoStack((s) => [...s.slice(-10), segments.map((x) => ({ ...x }))]); // keep last 10
    setRedoStack([]);
    onSegmentsChange(next);
  };

  useEffect(() => {
    // maintain active segment
    if (!segments.length) return;
    if (!activeSegId || !segments.some((s) => s.id === activeSegId)) {
      setActiveSegId(segments[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segments.length]);

  useEffect(() => {
    // create preview url for active segment
    if (!activeSeg?.blob) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const url = URL.createObjectURL(activeSeg.blob);
    setPreviewUrl(url);
    return () => {
      try {
        URL.revokeObjectURL(url);
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSeg?.id]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 900);
    return () => window.clearTimeout(t);
  }, [toast]);

  /** gestures */
  const swipeRef = useRef<{ x0: number; y0: number; active: boolean } | null>(null);

  const onSurfacePointerDown = (e: React.PointerEvent) => {
    swipeRef.current = { x0: e.clientX, y0: e.clientY, active: true };
  };

  const onSurfacePointerMove = (e: React.PointerEvent) => {
    if (!swipeRef.current?.active) return;
    const dx = e.clientX - swipeRef.current.x0;
    const dy = e.clientY - swipeRef.current.y0;

    // swipe up to open drawer
    if (dy < -70 && Math.abs(dx) < 60) {
      swipeRef.current.active = false;
      setDrawerOpen(true);
      setHudVisible(true);
      setPanel("none");
      return;
    }
  };

  const onSurfacePointerUp = () => {
    if (swipeRef.current) swipeRef.current.active = false;
  };

  const toggleHud = () => {
    setHudVisible((v) => !v);
    setDrawerOpen(false);
    setPanel("none");
  };

  /** minimal actions */
  const toggleMute = () => {
    if (!activeSeg) return;
    const next = segments.map((s) =>
      s.id === activeSeg.id ? { ...s, isMuted: !s.isMuted, volume: s.isMuted ? 100 : 0 } : s
    );
    pushHistory(next);
    setToast(activeSeg.isMuted ? "Son ON" : "Son OFF");
  };

  const setVolume = (vol: number) => {
    if (!activeSeg) return;
    const v = Math.max(0, Math.min(100, vol));
    const next = segments.map((s) => (s.id === activeSeg.id ? { ...s, volume: v, isMuted: v === 0 } : s));
    pushHistory(next);
  };

  const trimActive = (seconds: number) => {
    if (!activeSeg) return;
    const dur = Math.max(0.5, activeSeg.duration);
    const newDur = Math.max(0.5, Math.min(dur, dur - seconds));
    const next = segments.map((s) =>
      s.id === activeSeg.id ? { ...s, duration: newDur, endTime: s.startTime + newDur } : s
    );
    pushHistory(next);
    setToast("Trim OK");
  };

  const splitActive = () => {
    if (!activeSeg) return;
    const dur = Math.max(1, activeSeg.duration);
    if (dur < 2) return setToast("Trop court");
    const aDur = Math.floor(dur / 2);
    const bDur = dur - aDur;

    const idx = segments.findIndex((s) => s.id === activeSeg.id);
    const a: TimelineSegment = {
      ...activeSeg,
      id: `${activeSeg.id}_a`,
      duration: aDur,
      startTime: 0,
      endTime: aDur,
    };
    const b: TimelineSegment = {
      ...activeSeg,
      id: `${activeSeg.id}_b`,
      duration: bDur,
      startTime: 0,
      endTime: bDur,
    };

    const next = [...segments.slice(0, idx), a, b, ...segments.slice(idx + 1)];
    pushHistory(next);
    setActiveSegId(a.id);
    setToast("Split OK");
  };

  const doUndo = () => {
    setUndoStack((stk) => {
      if (!stk.length) return stk;
      const prev = stk[stk.length - 1];
      setRedoStack((r) => [...r, segments.map((x) => ({ ...x }))]);
      onSegmentsChange(prev.map((x) => ({ ...x })));
      setToast("Undo");
      return stk.slice(0, -1);
    });
  };

  const doRedo = () => {
    setRedoStack((stk) => {
      if (!stk.length) return stk;
      const next = stk[stk.length - 1];
      setUndoStack((u) => [...u, segments.map((x) => ({ ...x }))]);
      onSegmentsChange(next.map((x) => ({ ...x })));
      setToast("Redo");
      return stk.slice(0, -1);
    });
  };

  const applyEnhance = () => {
    // Placeholder: in real pipeline apply actual filter/enhancement.
    setToast("Enhance ✓");
  };

  const applyEffectPreset = (name: string) => {
    setToast(`Effect: ${name}`);
  };

  const applyCanvasRatio = (ratio: "9:16" | "1:1" | "16:9") => {
    // Stored in meta elsewhere; here we just toast.
    setToast(`Canvas: ${ratio}`);
  };

  const applySubtitlePreset = (name: string) => {
    setToast(`Subtitles: ${name}`);
  };

  const applySticker = (name: string) => {
    setToast(`Sticker: ${name}`);
  };

  const applyChallenge = (name: string) => {
    setToast(`Challenge: ${name}`);
  };

  const confirm = async () => {
    try {
      setBusy(true);
      await onConfirm(segments);
    } finally {
      setBusy(false);
    }
  };

  const canPlayVideo = activeSeg?.type === "video";
  const canShowImage = activeSeg?.type === "photo";
  const canShowAudio = activeSeg?.type === "audio";

  return (
    <div className="absolute inset-0 bg-black">
      {/* Surface */}
      <div
        className="absolute inset-0"
        onClick={() => toggleHud()}
        onPointerDown={onSurfacePointerDown}
        onPointerMove={onSurfacePointerMove}
        onPointerUp={onSurfacePointerUp}
      >
        {/* PREVIEW */}
        {canPlayVideo ? (
          <video
            ref={videoRef}
            src={previewUrl}
            className="absolute inset-0 w-full h-full object-contain bg-black"
            controls
            playsInline
            onClick={(e) => e.stopPropagation()}
          />
        ) : canShowImage ? (
          <img
            src={previewUrl}
            className="absolute inset-0 w-full h-full object-contain bg-black"
            alt="preview"
            onClick={(e) => e.stopPropagation()}
          />
        ) : canShowAudio ? (
          <div className="absolute inset-0 flex items-center justify-center p-6" onClick={(e) => e.stopPropagation()}>
            <div className="w-full max-w-[520px] rounded-3xl bg-white/5 border border-white/10 p-4 text-white">
              <div className="font-semibold flex items-center gap-2">
                <Music className="h-4 w-4" /> Audio
              </div>
              <audio src={previewUrl} className="w-full mt-3" controls />
              <div className="mt-2 text-xs text-white/60">
                Swipe ↑ pour outils · Tap écran pour cacher/afficher HUD
              </div>
            </div>
          </div>
        ) : null}

        {/* Toast */}
        <AnimatePresence>
          {toast ? (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="absolute top-16 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-black/55 border border-white/10 text-white text-xs backdrop-blur"
              onClick={(e) => e.stopPropagation()}
            >
              {toast}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      {/* HUD Clean */}
      <AnimatePresence>
        {hudVisible ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0">
            {/* Top bar */}
            <div className="absolute top-0 left-0 right-0 z-20 p-3 flex items-center justify-between pointer-events-auto">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                  }}
                  className="h-10 w-10 rounded-2xl bg-white/10 border border-white/10 text-white flex items-center justify-center"
                  title="Retour"
                >
                  <X className="h-5 w-5" />
                </button>

                <div className="text-white">
                  <div className="font-semibold text-sm">Édition</div>
                  <div className="text-[11px] text-white/60">Post-capture · Timeline</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDrawerOpen(true);
                    setPanel("none");
                  }}
                  className="h-10 w-10 rounded-2xl bg-white/10 border border-white/10 text-white flex items-center justify-center"
                  title="Outils (swipe ↑)"
                >
                  <MoreHorizontal className="h-5 w-5" />
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    confirm();
                  }}
                  disabled={busy}
                  className={cn(
                    "h-10 px-4 rounded-2xl text-white text-sm font-semibold flex items-center gap-2",
                    busy ? "bg-white/10 border border-white/10" : "bg-orange-500/90 hover:bg-orange-500"
                  )}
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  OK
                </button>
              </div>
            </div>

            {/* Right rail (essentials only) */}
            <div className="absolute right-3 top-20 z-20 flex flex-col gap-2 pointer-events-auto">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  applyEnhance();
                }}
                className="w-12 h-12 rounded-2xl bg-black/35 border border-white/10 backdrop-blur flex items-center justify-center hover:bg-black/45"
                title="Enhance"
              >
                <Sparkles className="h-5 w-5 text-white" />
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setDrawerOpen(true);
                  setPanel("subtitles");
                }}
                className="w-12 h-12 rounded-2xl bg-black/35 border border-white/10 backdrop-blur flex items-center justify-center hover:bg-black/45"
                title="Subtitles"
              >
                <Subtitles className="h-5 w-5 text-white" />
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setDrawerOpen(true);
                  setPanel("effects");
                }}
                className="w-12 h-12 rounded-2xl bg-black/35 border border-white/10 backdrop-blur flex items-center justify-center hover:bg-black/45"
                title="Effects"
              >
                <Film className="h-5 w-5 text-white" />
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setDrawerOpen(true);
                  setPanel("canvas");
                }}
                className="w-12 h-12 rounded-2xl bg-black/35 border border-white/10 backdrop-blur flex items-center justify-center hover:bg-black/45"
                title="Canvas"
              >
                <LayoutGrid className="h-5 w-5 text-white" />
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleMute();
                }}
                className="w-12 h-12 rounded-2xl bg-black/35 border border-white/10 backdrop-blur flex items-center justify-center hover:bg-black/45"
                title="Mute"
                disabled={activeSeg?.type !== "video" && activeSeg?.type !== "audio"}
              >
                {activeSeg?.isMuted ? <VolumeX className="h-5 w-5 text-white" /> : <Volume2 className="h-5 w-5 text-white" />}
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setHudVisible(false);
                }}
                className="w-12 h-12 rounded-2xl bg-black/35 border border-white/10 backdrop-blur flex items-center justify-center hover:bg-black/45"
                title="Hide HUD"
              >
                <EyeOff className="h-5 w-5 text-white" />
              </button>
            </div>

            {/* Bottom timeline compact */}
            <div className="absolute left-0 right-0 bottom-0 z-20 p-3 pointer-events-auto">
              <div className="mx-auto max-w-[920px] rounded-3xl bg-black/45 border border-white/10 backdrop-blur p-3">
                {/* Timeline strip */}
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                  {segments.map((s) => {
                    const active = s.id === activeSeg?.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveSegId(s.id);
                        }}
                        className={cn(
                          "min-w-[120px] h-12 px-3 rounded-2xl border text-left",
                          active ? "bg-white/15 border-white/25 text-white" : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                        )}
                        title={s.type}
                      >
                        <div className="text-xs font-semibold">
                          {s.type === "video" ? "🎬 Vidéo" : s.type === "photo" ? "🖼️ Photo" : "🎧 Audio"}
                        </div>
                        <div className="text-[11px] text-white/60">{Math.round(s.duration)}s</div>
                      </button>
                    );
                  })}
                </div>

                {/* mini controls row */}
                <div className="mt-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        doUndo();
                      }}
                      disabled={!undoStack.length}
                      className="h-10 w-10 rounded-2xl bg-white/10 border border-white/10 text-white flex items-center justify-center disabled:opacity-40"
                      title="Undo"
                    >
                      <Undo2 className="h-4 w-4" />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        doRedo();
                      }}
                      disabled={!redoStack.length}
                      className="h-10 w-10 rounded-2xl bg-white/10 border border-white/10 text-white flex items-center justify-center disabled:opacity-40"
                      title="Redo"
                    >
                      <Redo2 className="h-4 w-4" />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        splitActive();
                      }}
                      className="h-10 px-3 rounded-2xl bg-white/10 border border-white/10 text-white text-sm flex items-center gap-2"
                      title="Split"
                    >
                      <Scissors className="h-4 w-4" /> Split
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        trimActive(1);
                      }}
                      className="h-10 px-3 rounded-2xl bg-white/10 border border-white/10 text-white text-sm flex items-center gap-2"
                      title="Trim -1s"
                    >
                      <Crop className="h-4 w-4" /> Trim
                    </button>

                    {(activeSeg?.type === "video" || activeSeg?.type === "audio") && (
                      <div className="hidden sm:flex items-center gap-2 ml-2">
                        <span className="text-[11px] text-white/60">Volume</span>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={activeSeg?.volume ?? 100}
                          onChange={(e) => {
                            e.stopPropagation();
                            setVolume(Number(e.target.value));
                          }}
                          className="w-28"
                        />
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDrawerOpen(true);
                      setPanel("none");
                    }}
                    className="h-10 px-3 rounded-2xl bg-white/10 border border-white/10 text-white text-sm flex items-center gap-2"
                    title="Plus d’outils"
                  >
                    <MoreHorizontal className="h-4 w-4" /> Outils
                  </button>
                </div>

                <div className="mt-2 text-[11px] text-white/60 flex items-center justify-between">
                  <div>Tap écran: hide HUD · Swipe ↑: outils</div>
                  <div className="text-white/45">{activeSeg?.type?.toUpperCase() ?? ""}</div>
                </div>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Drawer (secondary panels) */}
      <AnimatePresence>
        {drawerOpen ? (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="absolute inset-0 z-[95] bg-black/60 backdrop-blur flex items-end"
            onClick={() => {
              setDrawerOpen(false);
              setPanel("none");
            }}
          >
            <div
              className="w-full rounded-t-[28px] bg-[#0b0b0e] border-t border-white/10 p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <div className="text-white font-semibold flex items-center gap-2">
                  <LayoutGrid className="h-4 w-4" /> Outils post-capture
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setDrawerOpen(false);
                    setPanel("none");
                  }}
                  className="h-10 w-10 rounded-2xl bg-white/10 border border-white/10 text-white flex items-center justify-center"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Panel selector */}
              <div className="mt-3 grid grid-cols-3 sm:grid-cols-6 gap-2">
                <PanelBtn label="Canvas" icon={<LayoutGrid className="h-4 w-4" />} active={panel === "canvas"} onClick={() => setPanel("canvas")} />
                <PanelBtn label="Effects" icon={<Film className="h-4 w-4" />} active={panel === "effects"} onClick={() => setPanel("effects")} />
                <PanelBtn label="Stickers" icon={<Sticker className="h-4 w-4" />} active={panel === "stickers"} onClick={() => setPanel("stickers")} />
                <PanelBtn label="Subtitles" icon={<Subtitles className="h-4 w-4" />} active={panel === "subtitles"} onClick={() => setPanel("subtitles")} />
                <PanelBtn label="Graffiti" icon={<Pencil className="h-4 w-4" />} active={panel === "graffiti"} onClick={() => setPanel("graffiti")} />
                <PanelBtn label="Challenge" icon={<Flame className="h-4 w-4" />} active={panel === "challenge"} onClick={() => setPanel("challenge")} />
              </div>

              {/* Panel content */}
              <div className="mt-3">
                {panel === "none" ? (
                  <div className="rounded-2xl bg-white/5 border border-white/10 p-3 text-white">
                    <div className="text-sm font-semibold flex items-center gap-2">
                      <Eye className="h-4 w-4" /> Mode clean
                    </div>
                    <div className="text-xs text-white/70 mt-1">
                      Ici on met tous les outils secondaires pour garder l’écran principal clair.
                    </div>

                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <QuickBtn label="Enhance" icon={<Sparkles className="h-4 w-4" />} onClick={applyEnhance} />
                      <QuickBtn label="Magic" icon={<Wand2 className="h-4 w-4" />} onClick={() => setToast("Magic ✓")} />
                      <QuickBtn label="Music" icon={<Music className="h-4 w-4" />} onClick={() => setPanel("music")} />
                      <QuickBtn label="Texte" icon={<Type className="h-4 w-4" />} onClick={() => setToast("Text overlay (todo)")} />
                    </div>
                  </div>
                ) : null}

                {panel === "canvas" ? (
                  <div className="rounded-2xl bg-white/5 border border-white/10 p-3 text-white">
                    <div className="font-semibold flex items-center gap-2">
                      <LayoutGrid className="h-4 w-4" /> Canvas
                    </div>
                    <div className="text-xs text-white/70 mt-1">Ratio + background + reframe.</div>

                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <QuickBtn label="9:16" icon={<LayoutGrid className="h-4 w-4" />} onClick={() => applyCanvasRatio("9:16")} />
                      <QuickBtn label="1:1" icon={<LayoutGrid className="h-4 w-4" />} onClick={() => applyCanvasRatio("1:1")} />
                      <QuickBtn label="16:9" icon={<LayoutGrid className="h-4 w-4" />} onClick={() => applyCanvasRatio("16:9")} />
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <QuickBtn label="Background: none" icon={<Move className="h-4 w-4" />} onClick={() => setToast("BG: none")} />
                      <QuickBtn label="Background: blur" icon={<Move className="h-4 w-4" />} onClick={() => setToast("BG: blur")} />
                    </div>
                  </div>
                ) : null}

                {panel === "effects" ? (
                  <div className="rounded-2xl bg-white/5 border border-white/10 p-3 text-white">
                    <div className="font-semibold flex items-center gap-2">
                      <Film className="h-4 w-4" /> Effects
                    </div>
                    <div className="text-xs text-white/70 mt-1">Presets (preview temps réel à brancher).</div>

                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {["Cinematic", "Vlog", "Vivid", "Vintage", "BW", "Dramatic"].map((e) => (
                        <QuickBtn key={e} label={e} icon={<Film className="h-4 w-4" />} onClick={() => applyEffectPreset(e)} />
                      ))}
                    </div>
                  </div>
                ) : null}

                {panel === "subtitles" ? (
                  <div className="rounded-2xl bg-white/5 border border-white/10 p-3 text-white">
                    <div className="font-semibold flex items-center gap-2">
                      <Subtitles className="h-4 w-4" /> Subtitles
                    </div>
                    <div className="text-xs text-white/70 mt-1">Accessibilité + créateurs peu lettrés.</div>

                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {["Auto", "Kuaishou bold", "Karaoke"].map((s) => (
                        <QuickBtn key={s} label={s} icon={<Subtitles className="h-4 w-4" />} onClick={() => applySubtitlePreset(s)} />
                      ))}
                    </div>
                  </div>
                ) : null}

                {panel === "stickers" ? (
                  <div className="rounded-2xl bg-white/5 border border-white/10 p-3 text-white">
                    <div className="font-semibold flex items-center gap-2">
                      <Sticker className="h-4 w-4" /> Stickers
                    </div>
                    <div className="text-xs text-white/70 mt-1">AR assets / emojis / tags.</div>

                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {["😀 Emoji", "🔥 Badge", "💬 Bubble", "✨ Sparkle"].map((s) => (
                        <QuickBtn key={s} label={s} icon={<Sticker className="h-4 w-4" />} onClick={() => applySticker(s)} />
                      ))}
                    </div>
                  </div>
                ) : null}

                {panel === "graffiti" ? (
                  <div className="rounded-2xl bg-white/5 border border-white/10 p-3 text-white">
                    <div className="font-semibold flex items-center gap-2">
                      <Pencil className="h-4 w-4" /> Graffiti
                    </div>
                    <div className="text-xs text-white/70 mt-1">Canvas overlay (à brancher).</div>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <QuickBtn label="Activer" icon={<Pencil className="h-4 w-4" />} onClick={() => setToast("Graffiti ON")} />
                      <QuickBtn label="Effacer" icon={<Pencil className="h-4 w-4" />} onClick={() => setToast("Clear")} />
                    </div>
                  </div>
                ) : null}

                {panel === "challenge" ? (
                  <div className="rounded-2xl bg-white/5 border border-white/10 p-3 text-white">
                    <div className="font-semibold flex items-center gap-2">
                      <Flame className="h-4 w-4" /> Challenge
                    </div>
                    <div className="text-xs text-white/70 mt-1">Distribution / viral.</div>

                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {["#DanceChallenge", "#MarketDay", "#StoryTime", "#BeforeAfter", "#Comedy"].map((c) => (
                        <QuickBtn key={c} label={c} icon={<Flame className="h-4 w-4" />} onClick={() => applyChallenge(c)} />
                      ))}
                    </div>
                  </div>
                ) : null}

                {panel === "music" ? (
                  <div className="rounded-2xl bg-white/5 border border-white/10 p-3 text-white">
                    <div className="font-semibold flex items-center gap-2">
                      <Music className="h-4 w-4" /> Music
                    </div>
                    <div className="text-xs text-white/70 mt-1">Sélection (UI) — pipeline audio à brancher.</div>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {["Afro Vibes", "Drum Groove", "Chill Beats", "Upbeat Dance"].map((m) => (
                        <QuickBtn key={m} label={m} icon={<Music className="h-4 w-4" />} onClick={() => setToast(`Music: ${m}`)} />
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="mt-3 text-xs text-white/60">Swipe ↑ ouvre. Tap dehors ferme. Tap écran cache HUD.</div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/** UI helpers */
function PanelBtn({
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
      type="button"
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

function QuickBtn({ label, icon, onClick }: { label: string; icon: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-11 rounded-2xl bg-white/10 border border-white/10 text-white text-xs flex items-center justify-center gap-2 hover:bg-white/15"
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
