import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  LayoutGrid,
  Film,
  Wand2,
  Type,
  Check,
  AlertCircle,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { VIDEO_FILTERS, getFilterById, scaleCssFilter, normalizeFilterId } from "./VideoFilters";
import { VideoFiltersInlinePanel } from "./VideoFilters";

export type CanvasRatio = "9:16" | "1:1" | "16:9";

export interface TimelineSegment {
  id: string;
  type: "video" | "photo";
  blob: Blob;
  duration: number;
  startTime: number;
  endTime: number;
  filterId?: string;
  overlayText?: string;
  ratio: CanvasRatio;
  muted?: boolean;
}

export interface EditorExport {
  blob: Blob;
  type: "video" | "photo";
  ratio: CanvasRatio;
  appliedFilterId: string;
  meta: any;
  previewUrl?: string;
}

export default function TimelineEditor({
  segments,
  onClose,
  onConfirm,
}: {
  segments: TimelineSegment[];
  onClose: () => void;
  onConfirm: (exported: EditorExport) => void;
}) {
  const seg = segments?.[0];

  const [sidePanel, setSidePanel] = useState<"none" | "canvasLeft" | "effectsRight">("none");
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [ratio, setRatio] = useState<CanvasRatio>(seg?.ratio ?? "9:16");
  const [filterId, setFilterId] = useState<string>(normalizeFilterId(seg?.filterId ?? "none"));
  const [overlayText, setOverlayText] = useState<string>(seg?.overlayText ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const appliedFilter = useMemo(() => getFilterById(filterId), [filterId]);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const previewUrlRef = useRef<string>("");
  const [previewUrl, setPreviewUrl] = useState<string>("");

  useEffect(() => {
    // build preview URL for original segment (not baked)
    if (!seg) return;
    const url = URL.createObjectURL(seg.blob);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
    return () => {
      try { URL.revokeObjectURL(url); } catch {}
    };
  }, [seg?.id]);

  if (!seg) {
    return (
      <div className="fixed inset-0 z-[110] bg-black text-white flex items-center justify-center">
        <div className="text-sm text-white/70">Aucun segment à éditer.</div>
        <button onClick={onClose} className="absolute top-4 right-4 h-10 w-10 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center">
          <X className="h-5 w-5" />
        </button>
      </div>
    );
  }

  const targetSize = useMemo(() => {
    if (ratio === "1:1") return { w: 1080, h: 1080 };
    if (ratio === "16:9") return { w: 1920, h: 1080 };
    return { w: 1080, h: 1920 };
  }, [ratio]);

  const applyTemplate = (name: string) => {
    // Templates = presets (V1). They ARE applied and baked into export.
    if (name === "Cinematic") {
      setFilterId("dramatic");
      setOverlayText("Cinematic • Story");
      return;
    }
    if (name === "Vlog") {
      setFilterId("film");
      setOverlayText("Vlog du jour");
      return;
    }
    if (name === "Beauty") {
      setFilterId("soft_glow");
      setOverlayText("Glow ✨");
      return;
    }
    if (name === "Vintage") {
      setFilterId("vintage");
      setOverlayText("Souvenir");
      return;
    }
  };

  const exportMedia = async (): Promise<EditorExport> => {
    setError(null);
    setIsExporting(true);

    try {
      if (seg.type === "photo") {
        // Bake photo: draw image -> apply filter via ctx.filter + overlay text
        const img = new Image();
        img.src = previewUrl;
        await new Promise((res, rej) => { img.onload = () => res(true); img.onerror = () => rej(new Error("Image load failed")); });

        const canvas = canvasRef.current || document.createElement("canvas");
        canvas.width = targetSize.w;
        canvas.height = targetSize.h;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas ctx missing");

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // cover crop
        const srcAR = img.width / img.height;
        const dstAR = canvas.width / canvas.height;
        let sx = 0, sy = 0, sw = img.width, sh = img.height;
        if (srcAR > dstAR) { sw = Math.round(img.height * dstAR); sx = Math.round((img.width - sw) / 2); }
        else { sh = Math.round(img.width / dstAR); sy = Math.round((img.height - sh) / 2); }

        ctx.filter = scaleCssFilter(appliedFilter.cssFilter, appliedFilter.intensity);
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
        ctx.filter = "none";

        drawOverlay(ctx, canvas.width, canvas.height, overlayText);

        const outBlob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Export photo failed"))), "image/jpeg", 0.92);
        });

        const outUrl = URL.createObjectURL(outBlob);
        if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = outUrl;

        return {
          blob: outBlob,
          type: "photo",
          ratio,
          appliedFilterId: appliedFilter.id,
          meta: { ratio, filterId: appliedFilter.id, overlayText },
          previewUrl: outUrl,
        };
      }

      // VIDEO export (baked) using canvas captureStream + MediaRecorder
      const video = document.createElement("video");
      video.src = previewUrl;
      video.crossOrigin = "anonymous";
      video.muted = true;
      video.playsInline = true;

      await new Promise((res, rej) => {
        video.onloadedmetadata = () => res(true);
        video.onerror = () => rej(new Error("Video load failed"));
      });

      const canvas = canvasRef.current || document.createElement("canvas");
      canvas.width = targetSize.w;
      canvas.height = targetSize.h;

      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas ctx missing");

      const fps = 30;
      const stream = (canvas as any).captureStream?.(fps) as MediaStream | undefined;
      if (!stream) throw new Error("captureStream non supporté");

      const mimeType = (() => {
        const candidates = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
        // @ts-ignore
        const MR = window.MediaRecorder;
        if (!MR?.isTypeSupported) return undefined;
        for (const c of candidates) if (MR.isTypeSupported(c)) return c;
        return undefined;
      })();

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };

      const durationSec = Math.min(video.duration || 30, 60); // guard
      const endAt = durationSec;

      // Start render loop
      let stopped = false;
      const render = () => {
        if (stopped) return;
        // cover crop (no deformation)
        const vw = video.videoWidth || 1080;
        const vh = video.videoHeight || 1920;
        const srcAR = vw / vh;
        const dstAR = canvas.width / canvas.height;

        let sx = 0, sy = 0, sw = vw, sh = vh;
        if (srcAR > dstAR) { sw = Math.round(vh * dstAR); sx = Math.round((vw - sw) / 2); }
        else { sh = Math.round(vw / dstAR); sy = Math.round((vh - sh) / 2); }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.filter = scaleCssFilter(appliedFilter.cssFilter, appliedFilter.intensity);
        ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
        ctx.filter = "none";

        drawOverlay(ctx, canvas.width, canvas.height, overlayText);

        requestAnimationFrame(render);
      };

      recorder.start(200);
      await video.play();
      render();

      // Play until endAt then stop
      await new Promise<void>((res) => {
        const tick = () => {
          if (video.currentTime >= endAt || video.ended) {
            res();
            return;
          }
          requestAnimationFrame(tick);
        };
        tick();
      });

      stopped = true;
      try { video.pause(); } catch {}
      await new Promise<void>((res, rej) => {
        recorder.onstop = () => res();
        try { recorder.stop(); } catch (e) { rej(e); }
      });

      const outBlob = new Blob(chunks, { type: recorder.mimeType || "video/webm" });
      if (!outBlob.size) throw new Error("Export vidéo vide");

      const outUrl = URL.createObjectURL(outBlob);
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = outUrl;

      return {
        blob: outBlob,
        type: "video",
        ratio,
        appliedFilterId: appliedFilter.id,
        meta: { ratio, filterId: appliedFilter.id, overlayText, baked: true },
        previewUrl: outUrl,
      };
    } catch (e: any) {
      setError(e?.message || "Export échoué");
      throw e;
    } finally {
      setIsExporting(false);
    }
  };

  const confirm = async () => {
    try {
      const exp = await exportMedia();
      onConfirm(exp);
    } catch {
      // error already set
    }
  };

  /** Edge swipe */
  const gestureRef = useRef<{ x0: number; y0: number; active: boolean; edge: "left" | "right" | "center" } | null>(null);

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
      setSidePanel("none");
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
      setSidePanel((p) => (p === "effectsRight" ? "none" : "effectsRight"));
      setDrawerOpen(false);
      return;
    }
  };
  const onSurfaceUp = () => { if (gestureRef.current) gestureRef.current.active = false; };

  return (
    <div className="fixed inset-0 z-[110] bg-black text-white" onPointerDown={onSurfaceDown} onPointerMove={onSurfaceMove} onPointerUp={onSurfaceUp}>
      {/* top bar */}
      <div className="absolute top-0 left-0 right-0 p-3 z-30 flex items-center justify-between">
        <button onClick={onClose} className="h-10 w-10 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center">
          <X className="h-5 w-5" />
        </button>

        <div className="text-xs px-3 py-2 rounded-2xl bg-black/35 border border-white/10 backdrop-blur">
          Editor · Edge swipe: Canvas (←) / Effects (→) · Swipe ↑ Tools
        </div>

        <button
          onClick={confirm}
          disabled={isExporting}
          className={cn("h-10 px-4 rounded-2xl font-semibold flex items-center gap-2",
            isExporting ? "bg-orange-500/50" : "bg-orange-500/90 hover:bg-orange-500")}
        >
          {isExporting ? "Export…" : <><Check className="h-5 w-5" /> OK</>}
        </button>
      </div>

      {/* preview stage */}
      <div className="absolute inset-0 pt-16 pb-20">
        <div className="absolute inset-0 flex items-center justify-center">
          {seg.type === "video" ? (
            <video
              ref={videoRef}
              src={previewUrl}
              className="w-full h-full object-contain"
              style={{ filter: scaleCssFilter(appliedFilter.cssFilter, appliedFilter.intensity) }}
              controls
              playsInline
            />
          ) : (
            <img
              src={previewUrl}
              className="w-full h-full object-contain"
              style={{ filter: scaleCssFilter(appliedFilter.cssFilter, appliedFilter.intensity) }}
              alt="preview"
            />
          )}

          {/* overlay text preview */}
          {overlayText ? (
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 max-w-[90%] text-center px-4 py-2 rounded-2xl bg-black/45 border border-white/10 backdrop-blur">
              <div className="text-sm font-semibold">{overlayText}</div>
            </div>
          ) : null}
        </div>

        {/* hidden canvas for export */}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* bottom tools */}
      <div className="absolute left-0 right-0 bottom-0 p-4 z-30">
        <div className="mx-auto max-w-[920px] rounded-3xl bg-black/45 border border-white/10 backdrop-blur p-3 flex items-center justify-between gap-3">
          <button onClick={() => setSidePanel((p) => (p === "canvasLeft" ? "none" : "canvasLeft"))} className="h-11 px-4 rounded-2xl bg-white/10 border border-white/10 flex items-center gap-2">
            <LayoutGrid className="h-4 w-4" /> Canvas
          </button>

          <button onClick={() => setSidePanel((p) => (p === "effectsRight" ? "none" : "effectsRight"))} className="h-11 px-4 rounded-2xl bg-white/10 border border-white/10 flex items-center gap-2">
            <Film className="h-4 w-4" /> Effects
          </button>

          <button onClick={() => setDrawerOpen(true)} className="h-11 px-4 rounded-2xl bg-white/10 border border-white/10 flex items-center gap-2">
            <ChevronDown className="h-4 w-4 rotate-180" /> Tools
          </button>
        </div>
      </div>

      {/* LEFT panel: canvas */}
      <AnimatePresence>
        {sidePanel === "canvasLeft" ? (
          <motion.div
            initial={{ x: -360, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -360, opacity: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 260 }}
            className="absolute left-0 top-0 bottom-0 w-[320px] z-[140] bg-[#0b0b0e]/95 border-r border-white/10 backdrop-blur"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3 flex items-center justify-between border-b border-white/10">
              <div className="font-semibold flex items-center gap-2">
                <LayoutGrid className="h-4 w-4" /> Canvas
              </div>
              <button onClick={() => setSidePanel("none")} className="h-9 w-9 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center">
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

              <div className="mt-4">
                <div className="text-xs text-white/60">Overlay texte</div>
                <textarea
                  value={overlayText}
                  onChange={(e) => setOverlayText(e.target.value)}
                  placeholder="Ajoute un texte…"
                  className="mt-2 w-full min-h-[120px] rounded-2xl bg-white/5 border border-white/10 p-3 text-white placeholder:text-white/40 outline-none"
                />
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* RIGHT panel: effects/filters */}
      <AnimatePresence>
        {sidePanel === "effectsRight" ? (
          <motion.div
            initial={{ x: 360, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 360, opacity: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 260 }}
            className="absolute right-0 top-0 bottom-0 w-[360px] z-[140] bg-[#0b0b0e]/95 border-l border-white/10 backdrop-blur"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3 flex items-center justify-between border-b border-white/10">
              <div className="font-semibold flex items-center gap-2">
                <Film className="h-4 w-4" /> Filters / Effects
              </div>
              <button onClick={() => setSidePanel("none")} className="h-9 w-9 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-3">
              <VideoFiltersInlinePanel selectedId={filterId} onSelect={setFilterId} language="fr" />
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Drawer: templates */}
      <AnimatePresence>
        {drawerOpen ? (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="absolute inset-0 z-[160] bg-black/60 backdrop-blur flex items-end"
            onClick={() => setDrawerOpen(false)}
          >
            <div className="w-full rounded-t-[28px] bg-[#0b0b0e] border-t border-white/10 p-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <div className="text-white font-semibold flex items-center gap-2">
                  <Wand2 className="h-4 w-4" /> Templates (appliqués)
                </div>
                <button onClick={() => setDrawerOpen(false)} className="h-10 w-10 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                <QuickBtn label="Cinematic" onClick={() => applyTemplate("Cinematic")} />
                <QuickBtn label="Vlog" onClick={() => applyTemplate("Vlog")} />
                <QuickBtn label="Beauty" onClick={() => applyTemplate("Beauty")} />
                <QuickBtn label="Vintage" onClick={() => applyTemplate("Vintage")} />
              </div>

              <div className="mt-3 text-xs text-white/60">
                Ces templates modifient filtre + overlay et sont **baked** dans l’export.
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* error */}
      <AnimatePresence>
        {error ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute left-1/2 -translate-x-1/2 bottom-28 z-[200] px-3 py-2 rounded-2xl bg-red-500/20 border border-red-400/30 backdrop-blur text-xs flex items-center gap-2"
          >
            <AlertCircle className="h-4 w-4" />
            {error}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/** overlay drawing for baked export */
function drawOverlay(ctx: CanvasRenderingContext2D, w: number, h: number, text: string) {
  if (!text) return;
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  const padX = 48, padY = 26;
  const boxW = Math.min(w - 120, 1200);
  const boxH = 140;
  const x = (w - boxW) / 2;
  const y = h - boxH - 120;

  roundRect(ctx, x, y, boxW, boxH, 48);
  ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.font = "700 56px Inter, system-ui, -apple-system, Segoe UI, Roboto";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const maxW = boxW - padX * 2;
  const lines = wrapText(ctx, text, maxW).slice(0, 2);
  const lineH = 62;
  const startY = y + boxH / 2 - ((lines.length - 1) * lineH) / 2;

  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], w / 2, startY + i * lineH);
  }

  ctx.restore();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = (text || "").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const lines: string[] = [];
  let line = words[0];
  for (let i = 1; i < words.length; i++) {
    const test = `${line} ${words[i]}`;
    if (ctx.measureText(test).width <= maxWidth) line = test;
    else { lines.push(line); line = words[i]; }
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

function QuickBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="h-11 rounded-2xl bg-white/10 border border-white/10 text-white text-xs flex items-center justify-center hover:bg-white/15">
      {label}
    </button>
  );
}
