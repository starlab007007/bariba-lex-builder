// src/components/tamtam/TimelineEditor.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  Check,
  Loader2,
  Sparkles,
  Subtitles,
  LayoutGrid,
  Sticker,
  Pencil,
  Film,
  Flame,
  Music,
  Undo2,
  Redo2,
  Scissors,
  Crop,
  MoreHorizontal,
  EyeOff,
  Eye,
  Volume2,
  VolumeX,
  Move,
  Wand2,
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

type DrawerPanel = "none" | "stickers" | "subtitles" | "graffiti" | "challenge" | "music" | "magic" | "text";
type SidePanel = "none" | "canvasLeft" | "effectsRight";

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

export default function TimelineEditor({
  segments,
  onSegmentsChange,
  onClose,
  onConfirm,
  language = "fr",
}: TimelineEditorProps) {
  const [hudVisible, setHudVisible] = useState(true);

  // drawer bottom (secondary)
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerPanel, setDrawerPanel] = useState<DrawerPanel>("none");

  // side panels (premium)
  const [sidePanel, setSidePanel] = useState<SidePanel>("none");

  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [activeSegId, setActiveSegId] = useState<string>(segments[0]?.id ?? "");
  const activeSeg = useMemo(() => segments.find((s) => s.id === activeSegId) ?? segments[0], [segments, activeSegId]);

  const [previewUrl, setPreviewUrl] = useState("");
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // lightweight history
  const [undoStack, setUndoStack] = useState<TimelineSegment[][]>([]);
  const [redoStack, setRedoStack] = useState<TimelineSegment[][]>([]);

  const pushHistory = (next: TimelineSegment[]) => {
    setUndoStack((s) => [...s.slice(-10), segments.map((x) => ({ ...x }))]);
    setRedoStack([]);
    onSegmentsChange(next);
  };

  useEffect(() => {
    if (!segments.length) return;
    if (!activeSegId || !segments.some((s) => s.id === activeSegId)) setActiveSegId(segments[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segments.length]);

  useEffect(() => {
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

  /** ====== gestures ====== */
  const swipeRef = useRef<{ x0: number; y0: number; active: boolean; edge?: "left" | "right" | "center" } | null>(
    null
  );

  const onSurfacePointerDown = (e: React.PointerEvent) => {
    const w = window.innerWidth || 390;
    const x = e.clientX;
    const edge = x < 24 ? "left" : x > w - 24 ? "right" : "center"; // edge-swipe like native apps
    swipeRef.current = { x0: e.clientX, y0: e.clientY, active: true, edge };
  };

  const onSurfacePointerMove = (e: React.PointerEvent) => {
    if (!swipeRef.current?.active) return;
    const dx = e.clientX - swipeRef.current.x0;
    const dy = e.clientY - swipeRef.current.y0;

    // swipe up => bottom drawer tools
    if (dy < -70 && Math.abs(dx) < 70) {
      swipeRef.current.active = false;
      setDrawerOpen(true);
      setDrawerPanel("none");
      setHudVisible(true);
      // close side panels when opening drawer
      setSidePanel("none");
      return;
    }

    // edge swipe right (from left edge) => open Canvas left
    if (swipeRef.current.edge === "left" && dx > 80 && Math.abs(dy) < 70) {
      swipeRef.current.active = false;
      setSidePanel((p) => (p === "canvasLeft" ? "none" : "canvasLeft"));
      setDrawerOpen(false);
      setDrawerPanel("none");
      setHudVisible(true);
      return;
    }

    // edge swipe left (from right edge) => open Effects right
    if (swipeRef.current.edge === "right" && dx < -80 && Math.abs(dy) < 70) {
      swipeRef.current.active = false;
      setSidePanel((p) => (p === "effectsRight" ? "none" : "effectsRight"));
      setDrawerOpen(false);
      setDrawerPanel("none");
      setHudVisible(true);
      return;
    }
  };

  const onSurfacePointerUp = () => {
    if (swipeRef.current) swipeRef.current.active = false;
  };

  const toggleHud = () => {
    setHudVisible((v) => !v);
    setDrawerOpen(false);
    setDrawerPanel("none");
    setSidePanel("none");
  };

  /** ====== actions ====== */
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
    const v = clamp(vol, 0, 100);
    const next = segments.map((s) => (s.id === activeSeg.id ? { ...s, volume: v, isMuted: v === 0 } : s));
    pushHistory(next);
  };

  const splitActive = () => {
    if (!activeSeg) return;
    const dur = Math.max(1, activeSeg.duration);
    if (dur < 2) return setToast("Trop court");
    const aDur = Math.floor(dur / 2);
    const bDur = dur - aDur;

    const idx = segments.findIndex((s) => s.id === activeSeg.id);
    const a: TimelineSegment = { ...activeSeg, id: `${activeSeg.id}_a`, duration: aDur, startTime: 0, endTime: aDur };
    const b: TimelineSegment = { ...activeSeg, id: `${activeSeg.id}_b`, duration: bDur, startTime: 0, endTime: bDur };
    const next = [...segments.slice(0, idx), a, b, ...segments.slice(idx + 1)];
    pushHistory(next);
    setActiveSegId(a.id);
    setToast("Split ✓");
  };

  const trimActive = (seconds: number) => {
    if (!activeSeg) return;
    const dur = Math.max(0.5, activeSeg.duration);
    const newDur = Math.max(0.5, Math.min(dur, dur - seconds));
    const next = segments.map((s) => (s.id === activeSeg.id ? { ...s, duration: newDur, endTime: newDur } : s));
    pushHistory(next);
    setToast("Trim ✓");
  };

  const applyEnhance = () => setToast("Enhance ✓");

  /** Side panel actions */
  const applyCanvas = (ratio: "9:16" | "1:1" | "16:9") => setToast(`Canvas: ${ratio}`);
  const applyBackground = (bg: "none" | "blur" | "gradient") => setToast(`BG: ${bg}`);
  const applyReframe = () => setToast("Reframe ✓");

  const applyEffect = (name: string) => setToast(`Effect: ${name}`);

  /** Drawer actions */
  const applySubtitle = (name: string) => setToast(`Subtitles: ${name}`);
  const applySticker = (name: string) => setToast(`Sticker: ${name}`);
  const applyChallenge = (name: string) => setToast(`Challenge: ${name}`);
  const applyMusic = (name: string) => setToast(`Music: ${name}`);

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
                Edge-swipe: Canvas (gauche) / Effects (droite) · Swipe ↑ : Outils · Tap : hide HUD
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

      {/* Side panel LEFT (Canvas) */}
      <AnimatePresence>
        {sidePanel === "canvasLeft" ? (
          <motion.div
            initial={{ x: -360, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -360, opacity: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 260 }}
            className="absolute left-0 top-0 bottom-0 w-[320px] z-[92] bg-[#0b0b0e]/95 border-r border-white/10 backdrop-blur"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3 flex items-center justify-between border-b border-white/10">
              <div className="text-white font-semibold flex items-center gap-2">
                <LayoutGrid className="h-4 w-4" /> Canvas
              </div>
              <button
                type="button"
                onClick={() => setSidePanel("none")}
                className="h-9 w-9 rounded-2xl bg-white/10 border border-white/10 text-white flex items-center justify-center"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-3 text-white">
              <div className="text-xs text-white/60">Ratio</div>
              <div className="mt-2 grid grid-cols-3 gap-2">
                <SideBtn label="9:16" icon={<LayoutGrid className="h-4 w-4" />} onClick={() => applyCanvas("9:16")} />
                <SideBtn label="1:1" icon={<LayoutGrid className="h-4 w-4" />} onClick={() => applyCanvas("1:1")} />
                <SideBtn label="16:9" icon={<LayoutGrid className="h-4 w-4" />} onClick={() => applyCanvas("16:9")} />
              </div>

              <div className="mt-4 text-xs text-white/60">Background</div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <SideBtn label="None" icon={<Move className="h-4 w-4" />} onClick={() => applyBackground("none")} />
                <SideBtn label="Blur" icon={<Move className="h-4 w-4" />} onClick={() => applyBackground("blur")} />
                <SideBtn label="Gradient" icon={<Move className="h-4 w-4" />} onClick={() => applyBackground("gradient")} />
                <SideBtn label="Reframe" icon={<Crop className="h-4 w-4" />} onClick={() => applyReframe()} />
              </div>

              <div className="mt-4 rounded-2xl bg-white/5 border border-white/10 p-3 text-xs text-white/70">
                Astuce: **edge swipe depuis gauche** ouvre/ferme Canvas.
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Side panel RIGHT (Effects) */}
      <AnimatePresence>
        {sidePanel === "effectsRight" ? (
          <motion.div
            initial={{ x: 360, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 360, opacity: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 260 }}
            className="absolute right-0 top-0 bottom-0 w-[320px] z-[92] bg-[#0b0b0e]/95 border-l border-white/10 backdrop-blur"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3 flex items-center justify-between border-b border-white/10">
              <div className="text-white font-semibold flex items-center gap-2">
                <Film className="h-4 w-4" /> Effects
              </div>
              <button
                type="button"
                onClick={() => setSidePanel("none")}
                className="h-9 w-9 rounded-2xl bg-white/10 border border-white/10 text-white flex items-center justify-center"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-3 text-white">
              <div className="text-xs text-white/60">Presets</div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {["Cinematic", "Vlog", "Vivid", "Vintage", "BW", "Dramatic", "Warm", "Cool"].map((p) => (
                  <SideBtn key={p} label={p} icon={<Film className="h-4 w-4" />} onClick={() => applyEffect(p)} />
                ))}
              </div>

              <div className="mt-4 rounded-2xl bg-white/5 border border-white/10 p-3 text-xs text-white/70">
                Astuce: **edge swipe depuis droite** ouvre/ferme Effects.
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

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
                  <div className="text-[11px] text-white/60">Swipe bords: Canvas/Effects · Swipe ↑ : Outils</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    applyEnhance();
                  }}
                  className="h-10 px-3 rounded-2xl bg-white/10 border border-white/10 text-white text-sm flex items-center gap-2"
                  title="Enhance"
                >
                  <Sparkles className="h-4 w-4" /> Enhance
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

            {/* Right mini rail (very small) */}
            <div className="absolute right-3 top-20 z-20 flex flex-col gap-2 pointer-events-auto">
              <MiniBtn
                title="Canvas (edge swipe gauche)"
                icon={<LayoutGrid className="h-5 w-5 text-white" />}
                onClick={(e) => {
                  e.stopPropagation();
                  setSidePanel((p) => (p === "canvasLeft" ? "none" : "canvasLeft"));
                  setDrawerOpen(false);
                }}
                active={sidePanel === "canvasLeft"}
              />
              <MiniBtn
                title="Effects (edge swipe droite)"
                icon={<Film className="h-5 w-5 text-white" />}
                onClick={(e) => {
                  e.stopPropagation();
                  setSidePanel((p) => (p === "effectsRight" ? "none" : "effectsRight"));
                  setDrawerOpen(false);
                }}
                active={sidePanel === "effectsRight"}
              />
              <MiniBtn
                title="Subtitles"
                icon={<Subtitles className="h-5 w-5 text-white" />}
                onClick={(e) => {
                  e.stopPropagation();
                  setDrawerOpen(true);
                  setDrawerPanel("subtitles");
                  setSidePanel("none");
                }}
              />
              <MiniBtn
                title="Mute"
                icon={activeSeg?.isMuted ? <VolumeX className="h-5 w-5 text-white" /> : <Volume2 className="h-5 w-5 text-white" />}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleMute();
                }}
                disabled={activeSeg?.type !== "video" && activeSeg?.type !== "audio"}
              />
              <MiniBtn
                title="Outils (swipe ↑)"
                icon={<MoreHorizontal className="h-5 w-5 text-white" />}
                onClick={(e) => {
                  e.stopPropagation();
                  setDrawerOpen(true);
                  setDrawerPanel("none");
                  setSidePanel("none");
                }}
              />
              <MiniBtn
                title="Hide HUD"
                icon={<EyeOff className="h-5 w-5 text-white" />}
                onClick={(e) => {
                  e.stopPropagation();
                  setHudVisible(false);
                  setDrawerOpen(false);
                  setSidePanel("none");
                }}
              />
            </div>

            {/* Bottom timeline compact */}
            <div className="absolute left-0 right-0 bottom-0 z-20 p-3 pointer-events-auto">
              <div className="mx-auto max-w-[960px] rounded-3xl bg-black/45 border border-white/10 backdrop-blur p-3">
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
                      >
                        <div className="text-xs font-semibold">
                          {s.type === "video" ? "🎬 Vidéo" : s.type === "photo" ? "🖼️ Photo" : "🎧 Audio"}
                        </div>
                        <div className="text-[11px] text-white/60">{Math.round(s.duration)}s</div>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <IconBtn title="Undo" onClick={doUndo} disabled={!undoStack.length} icon={<Undo2 className="h-4 w-4" />} />
                    <IconBtn title="Redo" onClick={doRedo} disabled={!redoStack.length} icon={<Redo2 className="h-4 w-4" />} />
                    <TextBtn title="Split" onClick={splitActive} icon={<Scissors className="h-4 w-4" />} label="Split" />
                    <TextBtn title="Trim -1s" onClick={() => trimActive(1)} icon={<Crop className="h-4 w-4" />} label="Trim" />

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
                      setDrawerPanel("none");
                      setSidePanel("none");
                    }}
                    className="h-10 px-3 rounded-2xl bg-white/10 border border-white/10 text-white text-sm flex items-center gap-2"
                  >
                    <MoreHorizontal className="h-4 w-4" /> Outils
                  </button>
                </div>

                <div className="mt-2 text-[11px] text-white/60 flex items-center justify-between">
                  <div>
                    Edge swipe: <span className="text-white/70">Canvas</span> (gauche) / <span className="text-white/70">Effects</span> (droite) · Swipe ↑ : Outils
                  </div>
                  <div className="text-white/45">{activeSeg?.type?.toUpperCase() ?? ""}</div>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="absolute top-3 right-3 z-30 pointer-events-auto">
            <button
              type="button"
              onClick={() => setHudVisible(true)}
              className="h-11 px-4 rounded-2xl bg-white/10 border border-white/10 text-white text-sm flex items-center gap-2"
            >
              <Eye className="h-4 w-4" /> Afficher HUD
            </button>
          </div>
        )}
      </AnimatePresence>

      {/* Bottom drawer tools (Swipe ↑) */}
      <AnimatePresence>
        {drawerOpen ? (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="absolute inset-0 z-[95] bg-black/60 backdrop-blur flex items-end"
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
                  <LayoutGrid className="h-4 w-4" /> Outils
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setDrawerOpen(false);
                    setDrawerPanel("none");
                  }}
                  className="h-10 w-10 rounded-2xl bg-white/10 border border-white/10 text-white flex items-center justify-center"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-3 grid grid-cols-3 sm:grid-cols-6 gap-2">
                <DrawerTab label="Stickers" icon={<Sticker className="h-4 w-4" />} active={drawerPanel === "stickers"} onClick={() => setDrawerPanel("stickers")} />
                <DrawerTab label="Subtitles" icon={<Subtitles className="h-4 w-4" />} active={drawerPanel === "subtitles"} onClick={() => setDrawerPanel("subtitles")} />
                <DrawerTab label="Graffiti" icon={<Pencil className="h-4 w-4" />} active={drawerPanel === "graffiti"} onClick={() => setDrawerPanel("graffiti")} />
                <DrawerTab label="Challenge" icon={<Flame className="h-4 w-4" />} active={drawerPanel === "challenge"} onClick={() => setDrawerPanel("challenge")} />
                <DrawerTab label="Music" icon={<Music className="h-4 w-4" />} active={drawerPanel === "music"} onClick={() => setDrawerPanel("music")} />
                <DrawerTab label="Magic" icon={<Wand2 className="h-4 w-4" />} active={drawerPanel === "magic"} onClick={() => setDrawerPanel("magic")} />
              </div>

              <div className="mt-3">
                {drawerPanel === "none" ? (
                  <div className="rounded-2xl bg-white/5 border border-white/10 p-3 text-white">
                    <div className="text-sm font-semibold flex items-center gap-2">
                      <Eye className="h-4 w-4" /> Mode premium
                    </div>
                    <div className="text-xs text-white/70 mt-1">
                      Canvas et Effects sont en **panneaux latéraux** (edge-swipe). Ici: stickers, sous-titres, etc.
                    </div>

                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <QuickBtn label="Texte overlay" icon={<Type className="h-4 w-4" />} onClick={() => setToast("Text overlay (todo)")} />
                      <QuickBtn label="Enhance" icon={<Sparkles className="h-4 w-4" />} onClick={applyEnhance} />
                      <QuickBtn label="Magic" icon={<Wand2 className="h-4 w-4" />} onClick={() => setToast("Magic ✓")} />
                      <QuickBtn label="Close" icon={<X className="h-4 w-4" />} onClick={() => setDrawerOpen(false)} />
                    </div>
                  </div>
                ) : null}

                {drawerPanel === "stickers" ? (
                  <PanelCard title="Stickers" desc="AR assets / emojis / tags.">
                    {["😀 Emoji", "🔥 Badge", "💬 Bubble", "✨ Sparkle"].map((s) => (
                      <QuickBtn key={s} label={s} icon={<Sticker className="h-4 w-4" />} onClick={() => applySticker(s)} />
                    ))}
                  </PanelCard>
                ) : null}

                {drawerPanel === "subtitles" ? (
                  <PanelCard title="Subtitles" desc="Accessibilité + créateurs peu lettrés.">
                    {["Auto", "Bold", "Karaoke"].map((s) => (
                      <QuickBtn key={s} label={s} icon={<Subtitles className="h-4 w-4" />} onClick={() => applySubtitle(s)} />
                    ))}
                  </PanelCard>
                ) : null}

                {drawerPanel === "graffiti" ? (
                  <PanelCard title="Graffiti" desc="Canvas overlay (à brancher).">
                    {["Activer", "Effacer", "Couleur", "Taille"].map((s) => (
                      <QuickBtn key={s} label={s} icon={<Pencil className="h-4 w-4" />} onClick={() => setToast(`Graffiti: ${s}`)} />
                    ))}
                  </PanelCard>
                ) : null}

                {drawerPanel === "challenge" ? (
                  <PanelCard title="Challenge" desc="Distribution / viral.">
                    {["#DanceChallenge", "#MarketDay", "#StoryTime", "#BeforeAfter", "#Comedy"].map((c) => (
                      <QuickBtn key={c} label={c} icon={<Flame className="h-4 w-4" />} onClick={() => applyChallenge(c)} />
                    ))}
                  </PanelCard>
                ) : null}

                {drawerPanel === "music" ? (
                  <PanelCard title="Music" desc="Sélection (UI).">
                    {["Afro Vibes", "Drum Groove", "Chill Beats", "Upbeat Dance"].map((m) => (
                      <QuickBtn key={m} label={m} icon={<Music className="h-4 w-4" />} onClick={() => applyMusic(m)} />
                    ))}
                  </PanelCard>
                ) : null}

                {drawerPanel === "magic" ? (
                  <PanelCard title="Magic" desc="IA/AR (placeholder).">
                    {["Face recognition", "Emoji face", "Object tracking", "Auto recommend"].map((m) => (
                      <QuickBtn key={m} label={m} icon={<Wand2 className="h-4 w-4" />} onClick={() => setToast(`Magic: ${m}`)} />
                    ))}
                  </PanelCard>
                ) : null}
              </div>

              <div className="mt-3 text-xs text-white/60">Swipe ↑ ouvre. Tap dehors ferme. Edge swipe = Canvas/Effects.</div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/** ===== UI atoms ===== */

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

function IconBtn({ title, onClick, disabled, icon }: { title: string; onClick: () => void; disabled?: boolean; icon: React.ReactNode }) {
  return (
    <button
      type="button"
      title={title}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      disabled={disabled}
      className="h-10 w-10 rounded-2xl bg-white/10 border border-white/10 text-white flex items-center justify-center disabled:opacity-40"
    >
      {icon}
    </button>
  );
}

function TextBtn({
  title,
  onClick,
  icon,
  label,
}: {
  title: string;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="h-10 px-3 rounded-2xl bg-white/10 border border-white/10 text-white text-sm flex items-center gap-2"
    >
      {icon} {label}
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

function PanelCard({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-3 text-white">
      <div className="font-semibold flex items-center gap-2">
        <LayoutGrid className="h-4 w-4" /> {title}
      </div>
      <div className="text-xs text-white/70 mt-1">{desc}</div>
      <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">{children}</div>
    </div>
  );
}

function SideBtn({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
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
