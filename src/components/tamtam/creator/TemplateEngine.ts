// ============================================================
// TEMPLATE ENGINE - Legacy processing + K-Engine Runtime (production)
// ============================================================

import { AdvancedTemplate, VoiceInstruction, getTemplateById } from "./AdvancedTemplateData";
import { supabase } from "@/integrations/supabase/client";

// ============================================================
// LEGACY TYPES (kept for backward compatibility)
// ============================================================

export interface TemplateInputs {
  videos: Blob[];
  photos: Blob[];
  audios: Blob[];
  text?: string;
}

export interface ProcessingProgress {
  stage: "analyzing" | "enhancing" | "generating" | "assembling" | "finalizing";
  percent: number;
  message_fr: string;
  message_ba?: string;
}

export interface ProcessedMedia {
  outputBlob: Blob;
  outputType: "video" | "image";
  thumbnailUrl?: string;
  captions?: CaptionSegment[];
  generatedNarration?: string;
  translatedText?: string;
  duration: number;
}

export interface CaptionSegment {
  startTime: number;
  endTime: number;
  text: string;
  emoji?: string;
}

type ProgressCallback = (progress: ProcessingProgress) => void;

// ============================================================
// K-ENGINE TYPES (runtime used by Create Video Templates)
// ============================================================

export type InputType = "video" | "photo" | "audio" | "text";
export type LayerType = "video_layer" | "user_media_layer" | "text_layer" | "sticker_layer" | "effect_layer" | "particle_layer" | "graphic_layer" | "ui_layer";

export type PipelineOp =
  | "smart_crop"
  | "segmentation_person"
  | "asr_subtitles"
  | "beat_detect"
  | "enhance"
  | "color_grade";

export interface SlotConstraints {
  min_duration?: number;
  detect_object?: "person" | "face" | "any";
  orientation?: "portrait" | "landscape" | "any";
}

export interface SlotDefinition {
  id: string;
  description: string;
  type: "video" | "photo" | "audio";
  required: boolean;
  min: number;
  max: number;
  constraints?: SlotConstraints;
}

export interface PipelineStep {
  op: PipelineOp;
  target?: string; // slotId | "music" | "background"
  quality: "high" | "medium" | "low";
  output: string; // cache key
  params?: { fps?: number; threshold?: number };
}

export interface Transform {
  x: number; // NORMALIZED 0..1
  y: number; // NORMALIZED 0..1
  scale: number;
  rotation: number; // deg
  opacity: number; // 0..1
}

export interface LayerAnim {
  type: "fade" | "slide" | "zoom" | "bounce";
  duration: number;
  easing: "linear" | "ease-in" | "ease-out";
}

export interface TimelineLayer {
  layer_id: string;
  type: LayerType;
  z_index: number;
  start: number;
  end: number;
  asset?: string; // background video, sticker url, default text...
  slot_ref?: string; // link to SlotDefinition.id
  transform: Transform;
  effects?: string[];
  animation?: LayerAnim | null;
  text?: string; // for text_layer
}

export interface TemplateManifest {
  id: string;
  name: string;
  description: string;
  version: string;
  duration: number;
  ratio: "9:16" | "1:1" | "16:9";
  category: string;
  usage?: number;
  slots: SlotDefinition[];
  pipeline?: PipelineStep[];
  timeline: TimelineLayer[];
  overrides?: string[];
  music?: { enabled: boolean; beatSync?: boolean; defaultTrack?: string; bpm?: number };
  export?: { codec?: string; preset?: "ultrafast" | "fast" | "medium"; crf?: number; fps?: number };
  // Kuaishou Horse effects
  effects?: Record<string, any>;
  phases?: Record<string, { start: number; end: number; label?: string }>;
}

export interface BoundAsset {
  slotId: string;
  kind: "file" | "recording" | "url" | "live";
  file?: File;
  blob?: Blob;
  url?: string; // blob url or remote url
  mime?: string;
  durationSec?: number;
  width?: number;
  height?: number;
  /**
   * For "live" kind: reference to a live video element (camera stream).
   * Used for real-time preview before capture.
   */
  liveVideoEl?: HTMLVideoElement;
}

export interface AICache {
  [key: string]: any; // main_character_mask, subtitles_track, beat_map...
}

export interface EngineState {
  loaded: boolean;
  template?: TemplateManifest;

  userAssets: Record<string, BoundAsset | undefined>;
  slotErrors: Record<string, string | undefined>;

  aiCache: AICache;
  recognizing: { running: boolean; progress: number; step?: string };

  isPlaying: boolean;
  currentTime: number;

  lastError?: string;
}

export type EngineEvent =
  | { type: "TEMPLATE_LOADED"; template: TemplateManifest }
  | { type: "SLOT_BOUND"; slotId: string }
  | { type: "SLOT_ERROR"; slotId: string; message: string }
  | { type: "AI_PROGRESS"; progress: number; step?: string }
  | { type: "AI_DONE" }
  | { type: "TIME_UPDATE"; time: number; playing: boolean };

export type Unsubscribe = () => void;

export interface ExportJob {
  ffmpegCommand: string;
  inputs: string[];
  output: string;
  meta: { duration: number; ratio: string; fps: number };
}

export type ExportRuntimeProgress = { stage?: string; percent?: number; message?: string };

export interface ExportRuntimeArgs {
  /**
   * Optionnel : média “principal” (ex: la capture du creator).
   * Si le template a un slot requis non bindé, on tentera de binder ce blob automatiquement
   * sur le premier slot compatible.
   */
  inputBlob?: Blob;
  inputType?: "video" | "photo" | "audio" | "text";
  /**
   * Si tu veux forcer la sortie en image (rare) :
   * - par défaut, un template vidéo => output video/webm (et/ou mp4 si wasm dispo)
   */
  outputType?: "video" | "image";
  /**
   * Meta libre: caption, visibility, location, music selection, captions segments, etc.
   */
  meta?: any;

  /**
   * Forcer un export mp4 si ffmpeg.wasm est dispo.
   * Sinon on renvoie webm.
   */
  preferMp4?: boolean;

  /**
   * Si tu as déjà un canvas preview (ex: TemplatePreviewPlayer), tu peux le passer
   * pour exporter EXACTEMENT le rendu.
   */
  renderCanvas?: HTMLCanvasElement;

  /**
   * ✅ LOW-DATA MODE: Skip re-rendering if capture is already stylized (baked-in).
   * When true, returns inputBlob directly without frame-by-frame re-rendering.
   * Much faster for zones with slow connections.
   */
  fastExport?: boolean;

  /**
   * ✅ LOW-DATA MODE: Reduce quality for faster export.
   * "low" = 480p, 12fps | "medium" = 720p, 15fps | "high" = 1080p, 30fps (default)
   */
  exportQuality?: "low" | "medium" | "high";
}

// ============================================================
// K-ENGINE RUNTIME (REAL ENGINE used in production Create Video Templates)
// ============================================================

const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));

/**
 * ✅ MOBILE FIX: Safe roundRect helper with fallback for browsers without ctx.roundRect
 * Prevents silent crashes on iOS Safari and older mobile browsers.
 */
function safeRoundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2);
  if (typeof (ctx as any).roundRect === 'function') {
    ctx.roundRect(x, y, w, h, radius);
  } else {
    // Fallback path for browsers without roundRect
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
}

const ratioToResolution = (ratio: TemplateManifest["ratio"], quality?: "low" | "medium" | "high") => {
  // ✅ LOW-DATA: Reduce resolution based on quality setting
  const q = quality || "high";
  if (q === "low") {
    // 480p equivalent
    if (ratio === "16:9") return { w: 854, h: 480 };
    if (ratio === "1:1") return { w: 480, h: 480 };
    return { w: 480, h: 854 }; // 9:16
  }
  if (q === "medium") {
    // 720p equivalent
    if (ratio === "16:9") return { w: 1280, h: 720 };
    if (ratio === "1:1") return { w: 720, h: 720 };
    return { w: 720, h: 1280 }; // 9:16
  }
  // high = 1080p (default)
  if (ratio === "16:9") return { w: 1920, h: 1080 };
  if (ratio === "1:1") return { w: 1080, h: 1080 };
  return { w: 1080, h: 1920 }; // 9:16
};

const normalizeTransform = (t?: Partial<Transform>): Transform => ({
  x: t?.x ?? 0,
  y: t?.y ?? 0,
  scale: t?.scale ?? 1,
  rotation: t?.rotation ?? 0,
  opacity: t?.opacity ?? 1,
});

const nowISO = () => new Date().toISOString();

const isProbablyUrl = (s?: string) =>
  !!s && (/^https?:\/\//i.test(s) || /^blob:/i.test(s) || s.startsWith("/") || s.includes("."));

const inferMimeFromBlob = (b?: Blob) => (b?.type || "").trim();

const supportsMediaRecorderMime = (mime: string) => {
  try {
    // eslint-disable-next-line no-undef
    return typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(mime);
  } catch {
    return false;
  }
};

const pickBestRecorderMime = () => {
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ];
  for (const c of candidates) {
    if (supportsMediaRecorderMime(c)) return c;
  }
  return "";
};

const waitMs = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// ---- Attempt to load ffmpeg.wasm if installed (optional) ----
/**
 * ✅ IMPORTANT (Fix GitHub Deploy):
 * On évite que Vite/Rollup essaie de résoudre "@ffmpeg/ffmpeg" au build quand le package
 * n'est pas installé. Sinon: "Rollup failed to resolve import '@ffmpeg/ffmpeg'".
 *
 * Ici on "cache" l'import pour que le build passe, et si le module est absent,
 * on retourne null (fallback -> WebM).
 */
async function tryLoadFFmpegWasm(): Promise<
  | null
  | {
      createFFmpeg: any;
      fetchFile: any;
    }
> {
  try {
    // eslint-disable-next-line no-new-func
    const dynamicImport = new Function("m", "return import(m)") as (m: string) => Promise<any>;
    const mod = await dynamicImport("@ffmpeg/ffmpeg");
    if (mod?.createFFmpeg && mod?.fetchFile) return { createFFmpeg: mod.createFFmpeg, fetchFile: mod.fetchFile };
    return null;
  } catch {
    return null;
  }
}

export class TemplateEngine {
  // ---- state ----
  private state: EngineState = {
    loaded: false,
    template: undefined,
    userAssets: {},
    slotErrors: {},
    aiCache: {},
    recognizing: { running: false, progress: 0, step: undefined },
    isPlaying: false,
    currentTime: 0,
    lastError: undefined,
  };

  // ---- listeners ----
  private listeners = new Set<(evt: EngineEvent, state: EngineState) => void>();

  // ---- media caches for rendering ----
  private videoEls = new Map<string, HTMLVideoElement>();
  private imgEls = new Map<string, HTMLImageElement>();
  private objectUrls = new Set<string>(); // to revoke

  // ============================================================
  // PUBLIC API
  // ============================================================

  getState(): EngineState {
    return this.state;
  }

  subscribe(fn: (evt: EngineEvent, state: EngineState) => void): Unsubscribe {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  loadTemplate(tpl: TemplateManifest): void {
    const normalized = this.normalizeTemplate(tpl);
    this.clearMediaCaches();

    this.state = {
      loaded: true,
      template: normalized,
      userAssets: {},
      slotErrors: {},
      aiCache: {},
      recognizing: { running: false, progress: 0, step: undefined },
      isPlaying: false,
      currentTime: 0,
      lastError: undefined,
    };

    this.emit({ type: "TEMPLATE_LOADED", template: normalized });
  }

  clearTemplate(): void {
    this.clearMediaCaches();
    this.state = {
      loaded: false,
      template: undefined,
      userAssets: {},
      slotErrors: {},
      aiCache: {},
      recognizing: { running: false, progress: 0, step: undefined },
      isPlaying: false,
      currentTime: 0,
      lastError: undefined,
    };
  }

  async bindUserMedia(slotId: string, asset: BoundAsset): Promise<void> {
    const tpl = this.state.template;
    if (!tpl) return;

    const slot = tpl.slots.find((s) => s.id === slotId);
    if (!slot) return;

    // Validate type (best effort)
    const mime = asset.mime || asset.file?.type || asset.blob?.type || "";
    const isVideo = mime.startsWith("video/");
    const isImage = mime.startsWith("image/");
    const isAudio = mime.startsWith("audio/");

    if (slot.type === "video" && !isVideo) {
      return this.setSlotError(slotId, "Ce slot attend une vidéo (video/*).");
    }
    if (slot.type === "photo" && !isImage) {
      return this.setSlotError(slotId, "Ce slot attend une image/photo (image/*).");
    }
    if (slot.type === "audio" && !isAudio) {
      return this.setSlotError(slotId, "Ce slot attend un audio (audio/*).");
    }

    // Ensure URL for render
    const resolved = await this.ensureAssetUrl(asset);

    // Probe metadata (duration / dimensions)
    const probed = await this.probeAsset(resolved, slot.type);

    // Constraint: min_duration
    const minDur = slot.constraints?.min_duration;
    if ((slot.type === "video" || slot.type === "audio") && typeof minDur === "number") {
      if (typeof probed.durationSec === "number" && probed.durationSec < minDur) {
        return this.setSlotError(slotId, `Durée insuffisante (min ${minDur}s).`);
      }
    }

    // Save
    this.state = {
      ...this.state,
      slotErrors: { ...this.state.slotErrors, [slotId]: undefined },
      userAssets: { ...this.state.userAssets, [slotId]: probed },
    };

    this.emit({ type: "SLOT_BOUND", slotId });
  }

  /**
   * ✅ Bind live camera video element to a slot for real-time preview.
   * This bypasses normal validation since we're using a live stream.
   */
  bindLiveStream(slotId: string, videoEl: HTMLVideoElement): void {
    const tpl = this.state.template;
    if (!tpl) return;

    const slot = tpl.slots.find((s) => s.id === slotId);
    if (!slot) {
      // Auto-pick first video slot if slotId not found
      const fallbackSlot = tpl.slots.find((s) => s.type === "video") || tpl.slots[0];
      if (!fallbackSlot) return;
      slotId = fallbackSlot.id;
    }

    const liveAsset: BoundAsset = {
      slotId,
      kind: "live",
      liveVideoEl: videoEl,
      mime: "video/live",
      width: videoEl.videoWidth || 1080,
      height: videoEl.videoHeight || 1920,
    };

    this.state = {
      ...this.state,
      slotErrors: { ...this.state.slotErrors, [slotId]: undefined },
      userAssets: { ...this.state.userAssets, [slotId]: liveAsset },
    };

    this.emit({ type: "SLOT_BOUND", slotId });
  }

  /**
   * Unbind live stream from a slot (used when switching from live to captured).
   */
  unbindLiveStream(slotId: string): void {
    if (!this.state.userAssets[slotId]?.liveVideoEl) return;
    
    this.state = {
      ...this.state,
      userAssets: { ...this.state.userAssets, [slotId]: undefined },
    };
  }

  async runAIPipeline(onProgress?: (p: number, step?: string) => void): Promise<void> {
    const tpl = this.state.template;
    if (!tpl) return;

    // Required slots check
    const missing = tpl.slots.filter((s) => s.required && !this.state.userAssets[s.id]);
    if (missing.length > 0) {
      this.state = { ...this.state, lastError: `Médias manquants: ${missing.map((m) => m.id).join(", ")}` };
      return;
    }

    const pipeline = tpl.pipeline || [];
    if (pipeline.length === 0) {
      this.state = { ...this.state, recognizing: { running: false, progress: 100, step: "done" } };
      this.emit({ type: "AI_DONE" });
      return;
    }

    this.state = { ...this.state, recognizing: { running: true, progress: 0, step: "starting" }, lastError: undefined };
    this.emit({ type: "AI_PROGRESS", progress: 0, step: "starting" });

    const aiCache: AICache = { ...this.state.aiCache };
    const steps = pipeline.length;

    for (let i = 0; i < pipeline.length; i++) {
      const step = pipeline[i];
      const base = Math.round((i / steps) * 100);
      const stepLabel = `${step.op}${step.target ? `:${step.target}` : ""}`;

      this.setAIProgress(base, stepLabel, onProgress);

      try {
        if (step.op === "segmentation_person") {
          const slotId = step.target || "main_character";
          aiCache[`${slotId}_mask`] = await this.tryRemoteAI({
            op: "segmentation_person",
            slotId,
            params: step.params,
          }).catch(() => this.fakeMask(slotId));
        }

        if (step.op === "asr_subtitles") {
          const slotId = step.target || "main_character";
          aiCache[`${step.output || "subtitles"}_track`] = await this.tryRemoteAI({
            op: "asr_subtitles",
            slotId,
            params: step.params,
          }).catch(() => this.fakeSubtitles());
        }

        if (step.op === "beat_detect") {
          aiCache[`${step.output || "beat"}_map`] = await this.tryRemoteAI({
            op: "beat_detect",
            slotId: step.target || "music",
            params: step.params,
          }).catch(() => this.fakeBeatMap(tpl.music?.bpm || 120));
        }

        if (step.op === "smart_crop") {
          const slotId = step.target || "main_character";
          aiCache[`${slotId}_crop`] = { status: "ready", mode: "smart", padding: 0.06 };
        }

        if (step.op === "enhance") {
          const slotId = step.target || "main_character";
          aiCache[`${slotId}_enhance`] = { status: "ready", strength: 0.4 };
        }

        if (step.op === "color_grade") {
          aiCache[`${step.output || "graded"}_grade`] = { status: "ready", preset: "warm" };
        }
      } catch (e) {
        console.error("[KEngine] pipeline step failed:", step, e);
      }

      const after = Math.round(((i + 1) / steps) * 100);
      this.setAIProgress(after, stepLabel, onProgress);
    }

    this.state = { ...this.state, aiCache, recognizing: { running: false, progress: 100, step: "done" } };
    this.emit({ type: "AI_DONE" });
  }

  setTime(t: number): void {
    const tpl = this.state.template;
    if (!tpl) return;
    const time = clamp(t, 0, tpl.duration || 0);
    this.state = { ...this.state, currentTime: time };
    this.emit({ type: "TIME_UPDATE", time, playing: this.state.isPlaying });
  }

  play(): void {
    this.state = { ...this.state, isPlaying: true };
    this.emit({ type: "TIME_UPDATE", time: this.state.currentTime, playing: true });
  }

  pause(): void {
    this.state = { ...this.state, isPlaying: false };
    this.emit({ type: "TIME_UPDATE", time: this.state.currentTime, playing: false });
  }

  renderFrameToCanvas(canvas: HTMLCanvasElement, time: number): void {
    const tpl = this.state.template;
    if (!tpl) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);

    const layers = (tpl.timeline || [])
      .filter((l) => time >= l.start && time <= l.end)
      .slice()
      .sort((a, b) => a.z_index - b.z_index);

    for (const layer of layers) {
      ctx.save();

      const local = layer.animation ? clamp((time - layer.start) / (layer.animation.duration || 0.5), 0, 1) : 1;

      const t = layer.transform;
      let alpha = clamp(t.opacity ?? 1, 0, 1);

      if (layer.animation?.type === "fade") alpha *= local;
      ctx.globalAlpha = alpha;

      const px = (t.x || 0) * w;
      const py = (t.y || 0) * h;
      ctx.translate(px, py);
      if (layer.animation?.type === "slide") ctx.translate((1 - local) * 40, 0);
      if (layer.animation?.type === "bounce") ctx.translate(0, Math.sin(local * Math.PI) * -12);

      const s = t.scale || 1;
      const zoom = layer.animation?.type === "zoom" ? 0.85 + 0.15 * local : 1;
      ctx.scale(s * zoom, s * zoom);

      const rot = ((t.rotation || 0) * Math.PI) / 180;
      ctx.rotate(rot);

      if (layer.type === "video_layer") {
        const src = layer.asset;
        const vid = src ? this.getOrCreateVideo(src) : null;

        if (vid && vid.readyState >= 2) {
          try {
            const dur = vid.duration;
            if (Number.isFinite(dur) && dur > 0) {
              const tVid = time % dur;
              if (Math.abs(vid.currentTime - tVid) > 0.25) vid.currentTime = tVid;
            }
          } catch {}
          ctx.drawImage(vid, 0, 0, w, h);
        } else {
          // Fallback: colorful gradient background
          const g = ctx.createLinearGradient(0, 0, 0, h);
          g.addColorStop(0, "#667eea");
          g.addColorStop(1, "#764ba2");
          ctx.fillStyle = g;
          ctx.fillRect(-px, -py, w, h);
        }
      }

      if (layer.type === "user_media_layer") {
        const slotId = layer.slot_ref || "";
        const asset = slotId ? this.state.userAssets[slotId] : undefined;

        // ✅ LIVE ASSET: render directly from video element (camera stream)
        if (asset?.kind === "live" && asset.liveVideoEl) {
          const liveVid = asset.liveVideoEl;
          if (liveVid.readyState >= 2 && liveVid.videoWidth > 0 && liveVid.videoHeight > 0) {
            // Draw live video with cover crop
            const vw = liveVid.videoWidth;
            const vh = liveVid.videoHeight;
            const scale = Math.max(w / vw, h / vh);
            const dw = vw * scale;
            const dh = vh * scale;
            const dx = (w - dw) / 2 - px;
            const dy = (h - dh) / 2 - py;
            ctx.drawImage(liveVid, 0, 0, vw, vh, dx, dy, dw, dh);
          } else {
            // Fallback gradient while camera loading
            const g = ctx.createLinearGradient(0, 0, w, h);
            g.addColorStop(0, "#4ecdc4");
            g.addColorStop(1, "#556270");
            ctx.fillStyle = g;
            ctx.fillRect(-px, -py, w, h);
          }
        } else if (!asset?.url) {
          // Fallback when no asset bound - show placeholder
          ctx.fillStyle = "#4ecdc4";
          ctx.fillRect(w * 0.2 - px, h * 0.28 - py, w * 0.6, h * 0.42);
          ctx.fillStyle = "#fff";
          ctx.font = "bold 14px Arial";
          ctx.textAlign = "center";
          ctx.fillText(slotId || "slot", w * 0.5 - px, h * 0.5 - py);
        } else {
          const mime = asset.mime || "";
          const isVid = mime.startsWith("video/");
          const isImg = mime.startsWith("image/");

          if (isVid) {
            const vid = this.getOrCreateVideo(asset.url);
            if (vid && vid.readyState >= 2) {
              try {
                const dur = vid.duration;
                if (Number.isFinite(dur) && dur > 0) {
                  const tVid = time % dur;
                  if (Math.abs(vid.currentTime - tVid) > 0.25) vid.currentTime = tVid;
                }
              } catch {}
              ctx.drawImage(vid, 0, 0, w, h);
            }
          } else if (isImg) {
            const img = this.getOrCreateImage(asset.url);
            if (img && img.complete) {
              ctx.drawImage(img, 0, 0, w, h);
            }
          }

          const wantMask =
            (layer.effects || []).includes("segmentation") ||
            (tpl.pipeline || []).some((p) => p.op === "segmentation_person" && (p.target || "") === slotId);

          if (wantMask) {
            const mask = this.state.aiCache[`${slotId}_mask`];
            if (mask?.maskUrl && typeof mask.maskUrl === "string") {
              const mImg = this.getOrCreateImage(mask.maskUrl);
              if (mImg?.complete) {
                ctx.globalCompositeOperation = "destination-in";
                ctx.drawImage(mImg, 0, 0, w, h);
                ctx.globalCompositeOperation = "source-over";
              }
            } else if (mask?.type === "fake") {
              ctx.globalCompositeOperation = "destination-in";
              ctx.fillStyle = "rgba(255,255,255,0.95)";
              ctx.beginPath();
              ctx.ellipse(w * 0.5 - px, h * 0.5 - py, 120, 160, 0, 0, Math.PI * 2);
              ctx.fill();
              ctx.globalCompositeOperation = "source-over";
            }
          }
        }
      }

      if (layer.type === "text_layer") {
        const text = layer.text || layer.asset || "TamTam";
        const fade = clamp((time - layer.start) / 0.45, 0, 1);
        ctx.globalAlpha *= fade;

        ctx.fillStyle = "#fff";
        ctx.strokeStyle = "rgba(0,0,0,0.9)";
        ctx.lineWidth = 4;
        ctx.font = "bold 28px Arial";
        ctx.textAlign = "center";

        const y = h * 0.86 + Math.sin(time * 2) * 6;
        ctx.strokeText(text, w * 0.5 - px, y - py);
        ctx.fillText(text, w * 0.5 - px, y - py);
      }

      if (layer.type === "sticker_layer") {
        const src = layer.asset;
        if (src && isProbablyUrl(src)) {
          const img = this.getOrCreateImage(src);
          if (img?.complete) {
            ctx.drawImage(img, 0, 0, w, h);
          }
        }
      }

      ctx.restore();
    }

    // ============================================================
    // ✅ KUAISHOU HORSE ENHANCED K-ENGINE VISUAL EFFECTS
    // ============================================================
    ctx.save();

    // ✅ KUAISHOU HORSE: Access effects directly from normalized template
    const effects = tpl.effects || {};
    const duration = tpl.duration || 15;
    const bpm = tpl.music?.bpm || 128;
    const beatPhase = Math.sin(time * Math.PI * (bpm / 30)) * 0.5 + 0.5; // BPM sync

    // ---- 1. WARM GLOW OVERLAY (Kuaishou festive) ----
    if (effects.warm_glow?.enabled !== false) {
      const warmGlow = ctx.createRadialGradient(w * 0.5, h * 0.3, 0, w * 0.5, h * 0.5, h * 0.8);
      const glowIntensity = 0.15 + beatPhase * 0.1;
      warmGlow.addColorStop(0, `rgba(255,200,100,${glowIntensity})`);
      warmGlow.addColorStop(0.5, `rgba(255,150,50,${glowIntensity * 0.5})`);
      warmGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = warmGlow;
      ctx.fillRect(0, 0, w, h);
    }

    // ---- 2. CINEMATIC VIGNETTE (enhanced breathing) ----
    if (effects.vignette_cinematic?.enabled !== false) {
      const breatheFactor = 0.85 + Math.sin(time * 0.5) * 0.05;
      const vignetteRadius = h * breatheFactor;
      const vignette = ctx.createRadialGradient(w / 2, h / 2, h * 0.2, w / 2, h / 2, vignetteRadius);
      vignette.addColorStop(0, 'transparent');
      vignette.addColorStop(0.6, 'rgba(0,0,0,0.2)');
      vignette.addColorStop(1, 'rgba(0,0,0,0.6)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, w, h);
    }

    // ---- 3. BEAT GLOW (pulses with music) ----
    if (effects.beat_glow?.enabled !== false) {
      const beatGlow = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.8);
      const glowAlpha = 0.08 + beatPhase * 0.15;
      beatGlow.addColorStop(0, `rgba(255,215,0,${glowAlpha})`);
      beatGlow.addColorStop(0.4, `rgba(255,165,0,${glowAlpha * 0.5})`);
      beatGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = beatGlow;
      ctx.fillRect(0, 0, w, h);
    }

    // ---- 4. SPARKLES (16 animated particles) ----
    if (effects.sparkles?.enabled !== false) {
      const sparkleCount = effects.sparkles?.count || 16;
      const sparkleColors = effects.sparkles?.colors || ['#FFD700', '#FFA500', '#FF6347', '#FFFFFF'];
      
      for (let i = 0; i < sparkleCount; i++) {
        const seed = i * 137.5;
        const x = (Math.sin(seed) * 0.5 + 0.5) * w;
        const baseY = (Math.cos(seed * 0.7) * 0.5 + 0.5) * h;
        const y = baseY + Math.sin(time * 2 + seed) * 20;
        const size = 3 + Math.sin(time * 5 + seed * 0.3) * 3;
        const alpha = 0.4 + Math.sin(time * 4 + seed * 0.5) * 0.4;
        
        const color = sparkleColors[i % sparkleColors.length];
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 12;
        
        // 4-pointed star sparkle
        ctx.beginPath();
        ctx.moveTo(x, y - size);
        ctx.lineTo(x + size * 0.3, y);
        ctx.lineTo(x, y + size);
        ctx.lineTo(x - size * 0.3, y);
        ctx.closePath();
        ctx.fill();
        
        ctx.beginPath();
        ctx.moveTo(x - size, y);
        ctx.lineTo(x, y + size * 0.3);
        ctx.lineTo(x + size, y);
        ctx.lineTo(x, y - size * 0.3);
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
      }
    }

    // ---- 5. HORSE SILHOUETTE ANIMATION (gallops across screen) ----
    if (effects.horse_silhouette?.enabled && time >= 5 && time <= 10) {
      const horseProgress = (time - 5) / 5; // 0 to 1 over 5 seconds
      const horseX = -w * 0.3 + horseProgress * w * 1.6;
      const horseY = h * 0.55 + Math.sin(time * 8) * 10; // Gallop bounce
      const horseSize = w * 0.25;
      
      ctx.save();
      ctx.translate(horseX, horseY);
      ctx.scale(horseSize / 200, horseSize / 150);
      
      // Golden glow
      ctx.shadowColor = '#FFD700';
      ctx.shadowBlur = 20;
      ctx.fillStyle = '#FFD700';
      ctx.globalAlpha = 0.7 + beatPhase * 0.3;
      
      // Simplified horse silhouette path
      ctx.beginPath();
      ctx.moveTo(45, 95);
      ctx.quadraticCurveTo(35, 85, 30, 70);
      ctx.quadraticCurveTo(28, 55, 35, 45);
      ctx.quadraticCurveTo(40, 38, 50, 35);
      ctx.lineTo(55, 30);
      ctx.quadraticCurveTo(58, 25, 65, 22);
      ctx.quadraticCurveTo(72, 20, 78, 22);
      ctx.lineTo(85, 28);
      ctx.quadraticCurveTo(100, 30, 105, 50);
      ctx.quadraticCurveTo(130, 55, 155, 58);
      ctx.quadraticCurveTo(175, 75, 165, 105);
      ctx.lineTo(45, 95);
      ctx.closePath();
      ctx.fill();
      
      ctx.restore();
    }

    // ---- 6. FILM GRAIN (subtle organic texture) ----
    const grainIntensity = 0.012;
    const imageData = ctx.getImageData(0, 0, w, h);
    const data = imageData.data;
    const frameNoise = Math.sin(time * 30) * 0.5 + 0.5;
    for (let i = 0; i < data.length; i += 16) { // Sample every 4th pixel for performance
      const noise = (Math.random() - 0.5) * grainIntensity * 255 * (0.8 + frameNoise * 0.4);
      data[i] = clamp(data[i] + noise, 0, 255);
      data[i + 1] = clamp(data[i + 1] + noise, 0, 255);
      data[i + 2] = clamp(data[i + 2] + noise, 0, 255);
    }
    ctx.putImageData(imageData, 0, 0);

    // ---- 7. PROGRESS BAR (golden animated) ----
    if (effects.progress_bar?.enabled !== false) {
      const progressWidth = w - 40;
      const progressY = h - 16;
      const progressHeight = 4;
      const progressPercent = time / duration;
      
      // Background track
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.beginPath();
      safeRoundRectPath(ctx, 20, progressY, progressWidth, progressHeight, 2);
      ctx.fill();
      
      // Golden fill with glow
      const progressGradient = ctx.createLinearGradient(20, 0, 20 + progressWidth, 0);
      progressGradient.addColorStop(0, '#FFD700');
      progressGradient.addColorStop(0.5, '#FFA500');
      progressGradient.addColorStop(1, '#FF6347');
      ctx.fillStyle = progressGradient;
      ctx.shadowColor = 'rgba(255,215,0,0.6)';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      safeRoundRectPath(ctx, 20, progressY, progressWidth * progressPercent, progressHeight, 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Badge template supprimé pour vidéo finale propre

    ctx.restore();
  }

  // ============================================================
  // EXPORT (FFmpeg command + Web pipeline + fallback)
  // ============================================================

  /**
   * Overload 1: exportJob() -> returns FFmpeg command job (server-side)
   */
  exportJob(): ExportJob;

  /**
   * Overload 2: exportJob(args, onProgress) -> performs actual export in browser (webm or mp4 if wasm)
   */
  exportJob(
    args: ExportRuntimeArgs,
    onProgress?: (p: ExportRuntimeProgress) => void
  ): Promise<{
    outputBlob: Blob;
    outputType: "video" | "image";
    ffmpegJob: ExportJob;
    used: "web" | "ffmpeg_wasm" | "fallback";
    meta: any;
  }>;

  exportJob(arg1?: ExportRuntimeArgs, arg2?: (p: ExportRuntimeProgress) => void): any {
    // If no args -> build command
    if (!arg1) return this.buildFFmpegExportJob();

    // Else -> runtime export
    return this.exportRuntime(arg1, arg2);
  }

  /**
   * Returns FFmpeg command (string) describing what should be done server-side.
   * This is not executed in browser.
   */
  private buildFFmpegExportJob(): ExportJob {
    const tpl = this.state.template;
    if (!tpl) {
      return { ffmpegCommand: "", inputs: [], output: "output.mp4", meta: { duration: 0, ratio: "9:16", fps: 30 } };
    }

    const { w, h } = ratioToResolution(tpl.ratio);
    const fps = tpl.export?.fps || 30;

    const layers = (tpl.timeline || []).slice().sort((a, b) => a.z_index - b.z_index);
    const bg = layers.find((l) => l.type === "video_layer");
    const userLayers = layers.filter((l) => l.type === "user_media_layer");
    const textLayers = layers.filter((l) => l.type === "text_layer");

    const inputs: string[] = [];
    inputs.push(bg?.asset || "background.mp4");

    const userInputIndex: { layer: TimelineLayer; idx: number; path: string }[] = [];
    userLayers.forEach((ul, i) => {
      const slotId = ul.slot_ref || `slot_${i}`;
      const bound = this.state.userAssets[slotId];
      const fileName = bound?.file?.name || `user_${slotId}.mp4`;

      const hasMask = !!this.state.aiCache[`${slotId}_mask`];
      const path = hasMask ? `user_${slotId}_cutout.png` : fileName;

      inputs.push(path);
      userInputIndex.push({ layer: ul, idx: i + 1, path });
    });

    const musicEnabled = !!tpl.music?.enabled;
    const musicIndex = inputs.length;
    if (musicEnabled) inputs.push(tpl.music?.defaultTrack || "music.mp3");

    let filter = "";
    let last = "[0:v]";

    const pxX = (nx: number) => Math.round((nx || 0) * w);
    const pxY = (ny: number) => Math.round((ny || 0) * h);

    const safeText = (s: string) =>
      (s || "TamTam").replace(/:/g, "\\:").replace(/'/g, "\\'").replace(/"/g, '\\"');

    userInputIndex.forEach((u, i) => {
      const L = u.layer;
      const t = L.transform || normalizeTransform();
      const x = pxX(t.x);
      const y = pxY(t.y);
      const start = L.start ?? 0;
      const end = L.end ?? tpl.duration;

      const out = `[v${i + 1}]`;
      filter += `${last}[${u.idx}:v]overlay=x=${x}:y=${y}:enable='between(t,${start},${end})'${out};`;
      last = out;
    });

    textLayers.forEach((tl, i) => {
      const t = tl.transform || normalizeTransform();
      const x = pxX(t.x) || Math.round(w * 0.5);
      const y = pxY(t.y) || Math.round(h * 0.85);
      const start = tl.start ?? 0;
      const end = tl.end ?? tpl.duration;

      const text = safeText(tl.text || tl.asset || "TamTam");
      const out = `[t${i + 1}]`;
      filter += `${last}drawtext=text='${text}':x=${x}:y=${y}:fontsize=48:fontcolor=white:borderw=3:bordercolor=black:enable='between(t,${start},${end})'${out};`;
      last = out;
    });

    const filterComplex = filter ? `-filter_complex "${filter.slice(0, -1)}"` : "";
    const mapVideo = filter ? `-map "${last}"` : `-map 0:v`;
    const mapAudio = musicEnabled ? ` -map ${musicIndex}:a` : "";

    const codec = tpl.export?.codec || "libx264";
    const preset = tpl.export?.preset || "ultrafast";
    const crf = tpl.export?.crf ?? 23;

    const cmd =
      `ffmpeg ${inputs.map((p) => `-i ${p}`).join(" ")} ` +
      `${filterComplex} ${mapVideo}${mapAudio} ` +
      `-r ${fps} -c:v ${codec} -preset ${preset} -crf ${crf} output.mp4`;

    return { ffmpegCommand: cmd, inputs, output: "output.mp4", meta: { duration: tpl.duration, ratio: tpl.ratio, fps } };
  }

  /**
   * Runtime export in browser:
   * - renders frames into canvas using renderFrameToCanvas()
   * - records via MediaRecorder to WebM
   * - optionally transcodes to mp4 via ffmpeg.wasm if available and preferMp4=true
   * - fallback: returns inputBlob if anything fails
   */
  private async exportRuntime(
    args: ExportRuntimeArgs,
    onProgress?: (p: ExportRuntimeProgress) => void
  ): Promise<{ outputBlob: Blob; outputType: "video" | "image"; ffmpegJob: ExportJob; used: "web" | "ffmpeg_wasm" | "fallback"; meta: any }> {
    const tpl = this.state.template;
    const ffmpegJob = this.buildFFmpegExportJob();

    // If no template loaded -> fallback
    if (!tpl) {
      const fallbackBlob = args.inputBlob || new Blob();
      return {
        outputBlob: fallbackBlob,
        outputType: args.outputType || "video",
        ffmpegJob,
        used: "fallback",
        meta: { ...(args.meta || {}), reason: "no_template_loaded" },
      };
    }

    // ✅ FAST EXPORT MODE: Skip re-rendering if capture is already stylized (baked-in)
    // This is MUCH faster for low-data zones - just return the input directly
    if (args.fastExport && args.inputBlob) {
      onProgress?.({ stage: "fast", percent: 100, message: "Export rapide ✅" });
      console.log("[KEngine] Fast export mode - returning baked-in capture directly");
      return {
        outputBlob: args.inputBlob,
        outputType: args.outputType || "video",
        ffmpegJob,
        used: "web",
        meta: { ...(args.meta || {}), fastExport: true },
      };
    }

    // Attempt auto-bind primary input into a missing required slot (best effort)
    if (args.inputBlob && args.inputType && this.hasMissingRequiredSlots()) {
      try {
        onProgress?.({ stage: "bind", percent: 3, message: "Association du média au template..." });
        await this.autoBindPrimaryInput(args.inputBlob, args.inputType);
      } catch (e) {
        // binding failure should not hard fail; we continue (fallback will catch)
        console.warn("[KEngine] autoBindPrimaryInput failed:", e);
      }
    }

    // Ensure required slots are satisfied
    const missing = tpl.slots.filter((s) => s.required && !this.state.userAssets[s.id]);
    if (missing.length > 0) {
      const fallbackBlob = args.inputBlob || new Blob();
      return {
        outputBlob: fallbackBlob,
        outputType: args.outputType || "video",
        ffmpegJob,
        used: "fallback",
        meta: { ...(args.meta || {}), reason: "missing_required_slots", missing: missing.map((m) => m.id) },
      };
    }

    // ✅ LOW-DATA: Use quality-based resolution and FPS
    const quality = args.exportQuality || "medium"; // Default to medium for better perf
    const { w, h } = ratioToResolution(tpl.ratio, quality);
    const baseFps = quality === "low" ? 12 : quality === "medium" ? 15 : 30;
    const fps = Math.min(baseFps, tpl.export?.fps || 30);
    const duration = Math.max(0.5, tpl.duration || 6);

    // If caller provided an existing canvas (preview), use it; else create a new one.
    const canvas = args.renderCanvas || document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;

    // If outputType is image, render one frame and return png
    if (args.outputType === "image") {
      onProgress?.({ stage: "render", percent: 35, message: "Rendu image..." });
      this.renderFrameToCanvas(canvas, 0);
      const png = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("canvas_toBlob_failed"))), "image/png");
      });
      onProgress?.({ stage: "done", percent: 100, message: "Export image terminé" });
      return {
        outputBlob: png,
        outputType: "image",
        ffmpegJob,
        used: "web",
        meta: { ...(args.meta || {}), ratio: tpl.ratio, fps, duration },
      };
    }

    // Otherwise, export video
    try {
      onProgress?.({ stage: "prepare", percent: 5, message: "Préparation de l’export vidéo..." });

      // Build stream: video from canvas + optional audio mix
      const canvasStream = canvas.captureStream(fps);

      const mixedAudioTrack = await this.tryBuildMixedAudioTrack(tpl).catch(() => null);

      const composedStream = new MediaStream();
      const vTrack = canvasStream.getVideoTracks()[0];
      if (vTrack) composedStream.addTrack(vTrack);
      if (mixedAudioTrack) composedStream.addTrack(mixedAudioTrack);

      const mimeType = pickBestRecorderMime();
      // eslint-disable-next-line no-undef
      const recorder = new MediaRecorder(composedStream, mimeType ? { mimeType } : undefined);

      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      const recordPromise = new Promise<Blob>((resolve, reject) => {
        recorder.onerror = () => reject(new Error("media_recorder_error"));
        recorder.onstop = () => {
          const out = new Blob(chunks, { type: mimeType || "video/webm" });
          resolve(out);
        };
      });

      recorder.start(250);

      // Render loop
      const totalFrames = Math.ceil(duration * fps);
      const frameMs = 1000 / fps;

      const start = performance.now();
      for (let frame = 0; frame <= totalFrames; frame++) {
        const t = Math.min(duration, frame / fps);
        this.renderFrameToCanvas(canvas, t);

        const p = 5 + Math.round((frame / totalFrames) * 75);
        onProgress?.({ stage: "render", percent: p, message: `Rendu vidéo... (${p}%)` });

        // keep timing reasonable
        const target = start + frame * frameMs;
        const now = performance.now();
        const sleep = Math.max(0, target - now);
        if (sleep > 2) await waitMs(Math.min(16, sleep));
        else await new Promise<void>((r) => requestAnimationFrame(() => r()));
      }

      onProgress?.({ stage: "finalize", percent: 85, message: "Finalisation du fichier..." });
      recorder.stop();

      const webmBlob = await recordPromise;

      // Optional: transcode to mp4 via ffmpeg.wasm
      if (args.preferMp4) {
        const ff = await tryLoadFFmpegWasm();
        if (ff) {
          onProgress?.({ stage: "ffmpeg", percent: 88, message: "Transcodage MP4 (ffmpeg.wasm)..." });
          const mp4Blob = await this.transcodeWebmToMp4WithWasm(webmBlob, ff, onProgress).catch(() => null);
          if (mp4Blob) {
            onProgress?.({ stage: "done", percent: 100, message: "Export MP4 terminé ✅" });
            return {
              outputBlob: mp4Blob,
              outputType: "video",
              ffmpegJob,
              used: "ffmpeg_wasm",
              meta: { ...(args.meta || {}), ratio: tpl.ratio, fps, duration, format: "mp4" },
            };
          }
        }
      }

      onProgress?.({ stage: "done", percent: 100, message: "Export Web terminé ✅" });
      return {
        outputBlob: webmBlob,
        outputType: "video",
        ffmpegJob,
        used: "web",
        meta: { ...(args.meta || {}), ratio: tpl.ratio, fps, duration, format: "webm" },
      };
    } catch (e) {
      console.error("[KEngine] exportRuntime failed:", e);
      const fallbackBlob = args.inputBlob || new Blob();
      return {
        outputBlob: fallbackBlob,
        outputType: args.outputType || "video",
        ffmpegJob,
        used: "fallback",
        meta: { ...(args.meta || {}), reason: "runtime_export_failed" },
      };
    }
  }

  private hasMissingRequiredSlots(): boolean {
    const tpl = this.state.template;
    if (!tpl) return false;
    return tpl.slots.some((s) => s.required && !this.state.userAssets[s.id]);
  }

  /**
   * Auto-bind input to the first slot compatible (video/photo/audio) that is missing.
   */
  private async autoBindPrimaryInput(inputBlob: Blob, inputType: "video" | "photo" | "audio" | "text") {
    const tpl = this.state.template;
    if (!tpl) return;

    const typeToSlotType: SlotDefinition["type"] | null =
      inputType === "video" ? "video" : inputType === "photo" ? "photo" : inputType === "audio" ? "audio" : null;

    if (!typeToSlotType) return;

    const candidate =
      tpl.slots.find((s) => s.required && s.type === typeToSlotType && !this.state.userAssets[s.id]) ||
      tpl.slots.find((s) => s.type === typeToSlotType && !this.state.userAssets[s.id]);

    if (!candidate) return;

    const mime =
      inferMimeFromBlob(inputBlob) ||
      (typeToSlotType === "photo" ? "image/png" : typeToSlotType === "audio" ? "audio/webm" : "video/webm");

    await this.bindUserMedia(candidate.id, {
      slotId: candidate.id,
      kind: "recording",
      blob: inputBlob,
      mime,
    });
  }

  /**
   * Mix audio sources:
   * - template music defaultTrack (if enabled)
   * - bound audio slots (first audio slot found)
   *
   * Returns a single mixed audio MediaStreamTrack or null.
   */
  private async tryBuildMixedAudioTrack(tpl: TemplateManifest): Promise<MediaStreamTrack | null> {
    // eslint-disable-next-line no-undef
    if (typeof AudioContext === "undefined") return null;

    const audioCtx = new AudioContext();
    const dest = audioCtx.createMediaStreamDestination();

    const nodesToStop: Array<() => void> = [];

    const connectMediaElement = async (el: HTMLMediaElement, gain = 1) => {
      // need to start playing to capture audio in some browsers
      el.crossOrigin = "anonymous";
      el.muted = false;

      const srcNode = audioCtx.createMediaElementSource(el);
      const g = audioCtx.createGain();
      g.gain.value = gain;

      srcNode.connect(g);
      g.connect(dest);

      nodesToStop.push(() => {
        try {
          srcNode.disconnect();
          g.disconnect();
        } catch {}
        try {
          el.pause();
          el.removeAttribute("src");
          el.load();
        } catch {}
      });

      try {
        await el.play();
      } catch {
        // ignore autoplay errors; some browsers require gesture
      }
    };

    // 1) Template music
    if (tpl.music?.enabled && tpl.music.defaultTrack) {
      const a = document.createElement("audio");
      a.src = tpl.music.defaultTrack;
      a.loop = true;
      a.preload = "auto";
      await connectMediaElement(a, 0.9).catch(() => {});
    }

    // 2) Bound audio slot (first)
    const audioSlot = tpl.slots.find((s) => s.type === "audio");
    if (audioSlot) {
      const bound = this.state.userAssets[audioSlot.id];
      if (bound?.url) {
        const a = document.createElement("audio");
        a.src = bound.url;
        a.loop = true;
        a.preload = "auto";
        await connectMediaElement(a, 1.0).catch(() => {});
      }
    }

    // If nothing connected, cleanup
    const track = dest.stream.getAudioTracks()[0] || null;
    if (!track) {
      try {
        audioCtx.close();
      } catch {}
      return null;
    }

    // Stop/cleanup after recording ends: we attach handler to track
    track.addEventListener("ended", () => {
      nodesToStop.forEach((fn) => fn());
      try {
        audioCtx.close();
      } catch {}
    });

    return track;
  }

  private async transcodeWebmToMp4WithWasm(
    webm: Blob,
    ff: { createFFmpeg: any; fetchFile: any },
    onProgress?: (p: ExportRuntimeProgress) => void
  ): Promise<Blob> {
    const { createFFmpeg, fetchFile } = ff;
    const ffmpeg = createFFmpeg({
      log: false,
      progress: (p: any) => {
        const ratio = typeof p?.ratio === "number" ? p.ratio : 0;
        const percent = 88 + Math.round(ratio * 10);
        onProgress?.({ stage: "ffmpeg", percent: clamp(percent, 88, 98), message: "Transcodage MP4..." });
      },
    });

    if (!ffmpeg.isLoaded()) {
      onProgress?.({ stage: "ffmpeg", percent: 88, message: "Chargement ffmpeg.wasm..." });
      await ffmpeg.load();
    }

    const inName = "in.webm";
    const outName = "out.mp4";

    ffmpeg.FS("writeFile", inName, await fetchFile(webm));

    // Simple mp4 settings (fast)
    await ffmpeg.run(
      "-i",
      inName,
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "23",
      "-movflags",
      "faststart",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      outName
    );

    const data = ffmpeg.FS("readFile", outName);
    const mp4Blob = new Blob([data.buffer], { type: "video/mp4" });

    // cleanup
    try {
      ffmpeg.FS("unlink", inName);
      ffmpeg.FS("unlink", outName);
    } catch {}

    return mp4Blob;
  }

  // ============================================================
  // INTERNAL HELPERS
  // ============================================================

  private emit(evt: EngineEvent) {
    for (const fn of this.listeners) {
      try {
        fn(evt, this.state);
      } catch (e) {
        console.error("[KEngine] listener error", e);
      }
    }
  }

  private setSlotError(slotId: string, message: string) {
    this.state = { ...this.state, slotErrors: { ...this.state.slotErrors, [slotId]: message }, lastError: message };
    this.emit({ type: "SLOT_ERROR", slotId, message });
  }

  private setAIProgress(p: number, step?: string, onProgress?: (p: number, step?: string) => void) {
    const progress = clamp(p, 0, 100);
    this.state = { ...this.state, recognizing: { running: true, progress, step } };
    this.emit({ type: "AI_PROGRESS", progress, step });
    onProgress?.(progress, step);
  }

  private normalizeTemplate(tpl: TemplateManifest): TemplateManifest {
    // ✅ Convert camelCase JSON keys to snake_case for compatibility
    const rawTpl = tpl as any;
    
    // Normalize slots (camelCase → snake_case)
    const normalizedSlots: SlotDefinition[] = (Array.isArray(rawTpl.slots) ? rawTpl.slots : []).map((s: any) => ({
      id: s.id || 'slot_0',
      description: s.description || s.id || '',
      type: s.type || 'video',
      required: s.required ?? true,
      min: s.min ?? 1,
      max: s.max ?? 1,
      constraints: s.constraints ? {
        min_duration: s.constraints.min_duration ?? s.constraints.minDurationSec,
        detect_object: s.constraints.detect_object ?? s.constraints.detectObject,
        orientation: s.constraints.orientation,
      } : undefined,
    }));

    // Normalize timeline layers (camelCase → snake_case)
    const normalizedTimeline: TimelineLayer[] = (Array.isArray(rawTpl.timeline) ? rawTpl.timeline : []).map((l: any, idx: number) => ({
      layer_id: l.layer_id || l.id || `layer_${idx}`,
      type: l.type || 'video_layer',
      z_index: l.z_index ?? l.zIndex ?? idx,
      start: typeof l.start === 'number' ? l.start : 0,
      end: typeof l.end === 'number' ? l.end : (rawTpl.duration || 8),
      asset: l.asset || '',
      slot_ref: l.slot_ref || l.slotRef || '',
      transform: normalizeTransform(l.transform),
      effects: Array.isArray(l.effects) ? l.effects : [],
      animation: l.animation || null,
      text: l.text,
    }));

    const safe: TemplateManifest = {
      id: rawTpl.id || `tpl_${Math.random().toString(16).slice(2, 10)}`,
      name: rawTpl.name || "Template",
      description: rawTpl.description || "",
      version: rawTpl.version || "1.0.0",
      duration: typeof rawTpl.duration === "number" ? rawTpl.duration : 8,
      ratio: rawTpl.ratio || "9:16",
      category: rawTpl.category || "transition",
      usage: rawTpl.usage ?? 0,
      slots: normalizedSlots,
      pipeline: Array.isArray(rawTpl.pipeline) ? rawTpl.pipeline : [],
      timeline: normalizedTimeline,
      overrides: Array.isArray(rawTpl.overrides) ? rawTpl.overrides : ["cover", "text", "music"],
      music: rawTpl.music || { enabled: false, beatSync: false, defaultTrack: "", bpm: 120 },
      export: rawTpl.export || { codec: "libx264", preset: "ultrafast", crf: 23, fps: 30 },
      // ✅ KUAISHOU HORSE: Preserve effects and phases from manifest
      effects: rawTpl.effects || {},
      phases: rawTpl.phases || {},
    };

    console.log('[K-Engine] Template normalized:', safe.id, 'slots:', safe.slots.length, 'timeline:', safe.timeline.length, 'effects:', Object.keys(safe.effects || {}));

    return safe;
  }

  private async ensureAssetUrl(asset: BoundAsset): Promise<BoundAsset> {
    if (asset.url) return asset;

    if (asset.file) {
      const url = URL.createObjectURL(asset.file);
      this.objectUrls.add(url);
      return { ...asset, url, mime: asset.mime || asset.file.type };
    }

    if (asset.blob) {
      const url = URL.createObjectURL(asset.blob);
      this.objectUrls.add(url);
      return { ...asset, url, mime: asset.mime || asset.blob.type };
    }

    return asset;
  }

  private async probeAsset(asset: BoundAsset, kind: SlotDefinition["type"]): Promise<BoundAsset> {
    const url = asset.url;
    if (!url) return asset;

    try {
      if (kind === "video") {
        const v = document.createElement("video");
        v.preload = "metadata";
        v.src = url;

        const meta = await new Promise<{ duration: number; w: number; h: number }>((resolve, reject) => {
          v.onloadedmetadata = () => resolve({ duration: v.duration, w: v.videoWidth, h: v.videoHeight });
          v.onerror = () => reject(new Error("video_metadata_error"));
        });

        return { ...asset, durationSec: meta.duration, width: meta.w, height: meta.h, mime: asset.mime || "video/*" };
      }

      if (kind === "audio") {
        const a = document.createElement("audio");
        a.preload = "metadata";
        a.src = url;

        const meta = await new Promise<{ duration: number }>((resolve, reject) => {
          a.onloadedmetadata = () => resolve({ duration: a.duration });
          a.onerror = () => reject(new Error("audio_metadata_error"));
        });

        return { ...asset, durationSec: meta.duration, mime: asset.mime || "audio/*" };
      }

      if (kind === "photo") {
        const img = new Image();
        img.src = url;

        const meta = await new Promise<{ w: number; h: number }>((resolve, reject) => {
          img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
          img.onerror = () => reject(new Error("image_metadata_error"));
        });

        return { ...asset, width: meta.w, height: meta.h, mime: asset.mime || "image/*" };
      }
    } catch {
      // ignore probe failures
    }

    return asset;
  }

  private getOrCreateVideo(src: string): HTMLVideoElement | null {
    const key = src;
    if (this.videoEls.has(key)) return this.videoEls.get(key)!;

    try {
      const v = document.createElement("video");
      v.src = src;
      v.muted = true; // for preview; audio is handled separately at export stage
      v.playsInline = true;
      v.loop = true;
      v.crossOrigin = "anonymous";
      v.preload = "auto";
      v.play().catch(() => {});
      this.videoEls.set(key, v);
      return v;
    } catch {
      return null;
    }
  }

  private getOrCreateImage(src: string): HTMLImageElement | null {
    const key = src;
    if (this.imgEls.has(key)) return this.imgEls.get(key)!;

    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = src;
      this.imgEls.set(key, img);
      return img;
    } catch {
      return null;
    }
  }

  private clearMediaCaches() {
    for (const v of this.videoEls.values()) {
      try {
        v.pause();
        v.removeAttribute("src");
        v.load();
      } catch {}
    }
    this.videoEls.clear();
    this.imgEls.clear();

    for (const u of this.objectUrls) {
      try {
        URL.revokeObjectURL(u);
      } catch {}
    }
    this.objectUrls.clear();
  }

  // --------- Remote AI hooks (optional, safe fallback) ---------

  private async tryRemoteAI(payload: any): Promise<any> {
    const { data, error } = await supabase.functions.invoke("kengine-ai", {
      body: { ...payload, at: nowISO() },
    });
    if (error) throw error;
    return data;
  }

  // --------- Fallbacks (AI mocked until backend/native is ready) ---------

  private fakeMask(slotId: string) {
    return { status: "ready", type: "fake", slotId };
  }

  private fakeSubtitles() {
    return {
      status: "ready",
      segments: [
        { start: 0.2, end: 1.2, text: "Salut 👋" },
        { start: 1.2, end: 2.2, text: "Bienvenue sur TamTam" },
      ],
    };
  }

  private fakeBeatMap(bpm: number) {
    return { status: "ready", bpm, beats: [0.5, 1.0, 1.5, 2.0, 2.5] };
  }
}

// Export instance for Create Video (K-Engine runtime)
export const kEngine = new TemplateEngine();

// ============================================================
// LEGACY TEMPLATE ENGINE SERVICE (kept, unchanged public exports)
// ============================================================

class TemplateEngineService {
  private audioContext: AudioContext | null = null;

  async processTemplate(templateId: string, inputs: TemplateInputs, onProgress?: ProgressCallback): Promise<ProcessedMedia> {
    const template = getTemplateById(templateId);
    if (!template) throw new Error(`Template ${templateId} not found`);

    const features: any = (template as any).features || {};
    const currentBlob = inputs.videos[0] || inputs.photos[0] || inputs.audios[0];
    if (!currentBlob) throw new Error("No input media provided");

    onProgress?.({ stage: "analyzing", percent: 10, message_fr: "Analyse du contenu...", message_ba: "A kaa gba lajɛ..." });

    if (features.audioEnhance && inputs.audios.length > 0) {
      onProgress?.({ stage: "enhancing", percent: 25, message_fr: "Amélioration audio...", message_ba: "Kan kaa ɲɛ..." });
      for (let i = 0; i < inputs.audios.length; i++) inputs.audios[i] = await this.enhanceAudio(inputs.audios[i]);
    }

    let generatedNarration: string | undefined;
    let translatedText: string | undefined;
    let captions: CaptionSegment[] | undefined;

    if (features.narrativeStructure || features.smartCaptions || features.translation) {
      onProgress?.({ stage: "generating", percent: 45, message_fr: "Génération IA en cours...", message_ba: "IA kaa baara kɛ..." });

      if (features.narrativeStructure) generatedNarration = await this.generateNarrative(template, inputs);
      if (features.translation && inputs.audios.length > 0) translatedText = await this.translateContent(inputs.text || "");
      if (features.smartCaptions) captions = await this.generateSmartCaptions(template, inputs);
    }

    onProgress?.({ stage: "assembling", percent: 70, message_fr: "Assemblage du contenu...", message_ba: "Gba kaa sigi..." });

    const outputBlob = await this.assembleMedia(template, inputs, { captions, narration: generatedNarration });

    onProgress?.({ stage: "finalizing", percent: 95, message_fr: "Finalisation...", message_ba: "A kaa ban..." });

    const duration = await this.getMediaDuration(outputBlob);

    onProgress?.({ stage: "finalizing", percent: 100, message_fr: "Terminé!", message_ba: "A banna!" });

    return { outputBlob, outputType: inputs.videos.length > 0 ? "video" : "image", captions, generatedNarration, translatedText, duration };
  }

  // AUDIO PROCESSING
  private async enhanceAudio(audioBlob: Blob): Promise<Blob> {
    try {
      if (!this.audioContext) this.audioContext = new AudioContext();

      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

      const offlineCtx = new OfflineAudioContext(audioBuffer.numberOfChannels, audioBuffer.length, audioBuffer.sampleRate);

      const source = offlineCtx.createBufferSource();
      source.buffer = audioBuffer;

      const highpass = offlineCtx.createBiquadFilter();
      highpass.type = "highpass";
      highpass.frequency.value = 80;

      const compressor = offlineCtx.createDynamicsCompressor();
      compressor.threshold.value = -24;
      compressor.knee.value = 30;
      compressor.ratio.value = 12;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.25;

      const gainNode = offlineCtx.createGain();
      gainNode.gain.value = 1.3;

      source.connect(highpass);
      highpass.connect(compressor);
      compressor.connect(gainNode);
      gainNode.connect(offlineCtx.destination);

      source.start();
      const renderedBuffer = await offlineCtx.startRendering();
      return this.audioBufferToBlob(renderedBuffer);
    } catch (error) {
      console.error("Audio enhancement failed:", error);
      return audioBlob;
    }
  }

  private audioBufferToBlob(buffer: AudioBuffer): Blob {
    const length = buffer.length * buffer.numberOfChannels * 2;
    const arrayBuffer = new ArrayBuffer(44 + length);
    const view = new DataView(arrayBuffer);

    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) view.setUint8(offset + i, string.charCodeAt(i));
    };

    writeString(0, "RIFF");
    view.setUint32(4, 36 + length, true);
    writeString(8, "WAVE");
    writeString(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, buffer.numberOfChannels, true);
    view.setUint32(24, buffer.sampleRate, true);
    view.setUint32(28, buffer.sampleRate * buffer.numberOfChannels * 2, true);
    view.setUint16(32, buffer.numberOfChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(36, "data");
    view.setUint32(40, length, true);

    const channels: Float32Array[] = [];
    for (let i = 0; i < buffer.numberOfChannels; i++) channels.push(buffer.getChannelData(i));

    let offset = 44;
    for (let i = 0; i < buffer.length; i++) {
      for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
        const sample = Math.max(-1, Math.min(1, channels[ch][i]));
        view.setInt16(offset, sample * 0x7fff, true);
        offset += 2;
      }
    }

    return new Blob([arrayBuffer], { type: "audio/wav" });
  }

  // AI CONTENT GENERATION (legacy)
  private async generateNarrative(template: AdvancedTemplate, inputs: TemplateInputs): Promise<string> {
    try {
      const { data, error } = await supabase.functions.invoke("process-template", {
        body: {
          action: "generate_narrative",
          templateId: (template as any).id,
          templateLabel: (template as any).label_fr,
          templateFamily: (template as any).family,
          inputText: inputs.text || "",
          hasVideo: inputs.videos.length > 0,
          hasPhotos: inputs.photos.length,
          hasAudio: inputs.audios.length > 0,
        },
      });

      if (error) throw error;
      return data?.narrative || "";
    } catch (error) {
      console.error("Narrative generation failed:", error);
      return "";
    }
  }

  private async translateContent(text: string): Promise<string> {
    if (!text) return "";
    try {
      const { data, error } = await supabase.functions.invoke("byt5-bariba-translate", { body: { text, direction: "fr_to_ba" } });
      if (error) throw error;
      return data?.translation || text;
    } catch (error) {
      console.error("Translation failed:", error);
      return text;
    }
  }

  private async generateSmartCaptions(template: AdvancedTemplate, inputs: TemplateInputs): Promise<CaptionSegment[]> {
    try {
      const { data, error } = await supabase.functions.invoke("process-template", {
        body: { action: "generate_captions", templateId: (template as any).id, inputText: inputs.text || "", features: (template as any).features },
      });
      if (error) throw error;
      return data?.captions || [];
    } catch (error) {
      console.error("Caption generation failed:", error);
      return [];
    }
  }

  // MEDIA ASSEMBLY (legacy)
  private async assembleMedia(template: AdvancedTemplate, inputs: TemplateInputs, generated: { captions?: CaptionSegment[]; narration?: string }): Promise<Blob> {
    if (inputs.videos.length > 0) return inputs.videos[0];
    if (inputs.photos.length > 0) return await this.createSlideshow(inputs.photos, template);
    if (inputs.audios.length > 0) return await this.createWaveformVideo(inputs.audios[0], template);
    throw new Error("No valid input to assemble");
  }

  private async createSlideshow(photos: Blob[], template: AdvancedTemplate): Promise<Blob> {
    return photos[0];
  }

  private async createWaveformVideo(audio: Blob, template: AdvancedTemplate): Promise<Blob> {
    return audio;
  }

  private async getMediaDuration(blob: Blob): Promise<number> {
    return new Promise((resolve) => {
      if (blob.type.startsWith("video/")) {
        const video = document.createElement("video");
        video.preload = "metadata";
        video.onloadedmetadata = () => {
          resolve(video.duration);
          URL.revokeObjectURL(video.src);
        };
        video.onerror = () => resolve(0);
        video.src = URL.createObjectURL(blob);
      } else if (blob.type.startsWith("audio/")) {
        const audio = document.createElement("audio");
        audio.preload = "metadata";
        audio.onloadedmetadata = () => {
          resolve(audio.duration);
          URL.revokeObjectURL(audio.src);
        };
        audio.onerror = () => resolve(0);
        audio.src = URL.createObjectURL(blob);
      } else {
        resolve(0);
      }
    });
  }

  // VOICE INSTRUCTIONS TTS (legacy)
  async speakInstruction(instruction: VoiceInstruction, language: "fr" | "ba" = "fr"): Promise<void> {
    const text = language === "ba" && instruction.text_ba ? instruction.text_ba : instruction.text_fr;

    if ("speechSynthesis" in window) {
      return new Promise((resolve) => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "fr-FR";
        utterance.rate = 0.9;
        utterance.onend = () => resolve();
        utterance.onerror = () => resolve();
        speechSynthesis.speak(utterance);
      });
    }
  }

  stopSpeaking(): void {
    if ("speechSynthesis" in window) speechSynthesis.cancel();
  }
}

export const templateEngine = new TemplateEngineService();
export default templateEngine;
