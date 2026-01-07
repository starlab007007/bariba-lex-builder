// src/components/tamtam/AdvancedTemplateData.ts
// ✅ Upgrade: Templates now include a Kuaishou-like "Template Engine" manifest (engine)

export type TemplateRatio = "9:16" | "1:1" | "16:9";

export type KSEOverride =
  | "change"
  | "cover"
  | "text"
  | "subtitles"
  | "enhance"
  | "stickers"
  | "music";

export type KSEPipelineOp =
  | "smart_crop"
  | "segmentation_person"
  | "asr_subtitles"
  | "beat_detect"
  | "audio_enhance"
  | "stabilization"
  | "denoise_sharpen";

export interface KSESlot {
  id: string;
  type: Array<"video" | "photo" | "audio" | "text">;
  required: boolean;
  min: number;
  max: number;
  // optional constraints
  minDurationSec?: number;
  maxDurationSec?: number;
  preferredDurationSec?: number;
}

export interface KSEPipelineStep {
  op: KSEPipelineOp;
  // free params based on op
  params?: Record<string, any>;
  output?: string; // e.g. "alphaMask", "subtitleTrack", "beatMap"
}

export interface KSETimelineLayer {
  t: [number, number]; // seconds
  layer: string; // "bg", "subject", "subtitles", "overlay", "stickers"
  asset?: string; // path to bundled asset
  fromSlot?: string; // slot id
  mask?: string; // pipeline output ref e.g. "alphaMask"
  track?: string; // pipeline output ref e.g. "subtitleTrack"
  style?: string; // subtitle style id
  blend?: "normal" | "screen" | "add" | "multiply";
  transform?: {
    x?: number;
    y?: number;
    scale?: number;
    rotate?: number;
  };
  keyframes?: Array<{
    at: number; // seconds
    props: Record<string, any>;
  }>;
}

export interface KuaishouTemplateManifest {
  id: string;
  version: string;
  duration: number; // seconds, e.g. 8
  ratio: TemplateRatio; // typically 9:16
  category?: string;
  tags?: string[];
  slots: KSESlot[];
  pipeline: KSEPipelineStep[];
  timeline: KSETimelineLayer[];
  overrides: KSEOverride[];
  // optional: i18n / UX guide text like in Kuaishou
  i18n?: {
    title_fr?: string;
    title_ba?: string;
    helper_fr?: string; // "Appuie longuement..."
    helper_ba?: string;
  };
  // optional: analytics knobs used by recos
  analytics?: {
    difficulty?: 1 | 2 | 3 | 4 | 5;
    expectedCompletionRate?: number; // 0..1
  };
}

/**
 * Existing app-level AdvancedTemplate shape used by UI.
 * We ADD `engine` without breaking current UI.
 */
export interface AdvancedTemplate {
  id: string;
  emoji: string;
  label_fr: string;
  description_fr: string;
  color: string; // gradient class
  previewAnimation?: "pulse" | "glow" | "none";

  // Existing features toggles used by UI icons
  features: {
    beatSync?: boolean;
    smartCaptions?: boolean;
    translation?: boolean;
    audioEnhance?: boolean;
    stabilization?: boolean;
  };

  // ✅ NEW: Kuaishou-like manifest
  engine: KuaishouTemplateManifest | null;

  // Optional: input hints (helps build manifest automatically)
  input?: {
    slots?: number; // e.g. 1,2,3
    allowPhoto?: boolean;
    allowVideo?: boolean;
    durationSec?: number;
  };

  // Optional: collection/category
  collectionId?: string;
}

/**
 * Kuaishou-like defaults: Kuaishou editor after template apply typically allows:
 * change/cover/text/subtitles/enhance/stickers/music
 */
export const DEFAULT_KSE_OVERRIDES: KSEOverride[] = [
  "change",
  "cover",
  "text",
  "subtitles",
  "enhance",
  "stickers",
  "music",
];

/**
 * Build a Kuaishou-like manifest from our current template fields.
 * This keeps "templates only" change: you won't touch UI files.
 */
export function buildKuaishouEngineManifest(tpl: Omit<AdvancedTemplate, "engine">): KuaishouTemplateManifest {
  const duration = tpl.input?.durationSec ?? 8;
  const allowVideo = tpl.input?.allowVideo ?? true;
  const allowPhoto = tpl.input?.allowPhoto ?? true;

  const slotTypes: Array<"video" | "photo"> = [
    ...(allowVideo ? (["video"] as const) : []),
    ...(allowPhoto ? (["photo"] as const) : []),
  ];

  // Slots (Kuaishou example seen in video: "1 Picture/Video", Time 00:08)
  const slotsCount = tpl.input?.slots ?? 1;
  const slots: KSESlot[] = Array.from({ length: slotsCount }).map((_, i) => ({
    id: i === 0 ? "main" : `clip_${i + 1}`,
    type: slotTypes.length ? slotTypes : (["video"] as any),
    required: i === 0,
    min: 1,
    max: 1,
    preferredDurationSec: duration,
  }));

  // Pipeline derived from features (Kuaishou behaviors: recognizing%, cutout, captions, beat sync, enhance)
  const pipeline: KSEPipelineStep[] = [];

  // Always add smart_crop (Kuaishou template runtime typically reframes for 9:16)
  pipeline.push({
    op: "smart_crop",
    params: { target: "person", ratio: "9:16", mode: "reframe" },
    output: "cropRect",
  });

  if (tpl.features.stabilization) {
    pipeline.push({ op: "stabilization", params: { strength: 0.65 }, output: "stabilized" });
  }

  // "Recognizing %" + cutout look => segmentation_person (optional by template)
  // If you want it for a specific template, set a tag or a feature switch (we map using smartCaptions/beatSync etc.)
  // Here: enable segmentation if template label/desc suggests it or you set a custom flag in tags (see below).
  const wantsCutout =
    /détourage|cutout|fond|background|prairie|studio|green|écran/i.test(
      `${tpl.label_fr} ${tpl.description_fr}`
    );

  if (wantsCutout) {
    pipeline.push({ op: "segmentation_person", params: { quality: "high" }, output: "alphaMask" });
  }

  if (tpl.features.smartCaptions) {
    pipeline.push({
      op: "asr_subtitles",
      params: { langs: ["fr", "ba"], align: "forced", style: "white_outline" },
      output: "subtitleTrack",
    });
  }

  if (tpl.features.beatSync) {
    pipeline.push({ op: "beat_detect", params: { sensitivity: 0.7 }, output: "beatMap" });
  }

  if (tpl.features.audioEnhance) {
    pipeline.push({ op: "audio_enhance", params: { denoise: true, normalize: true }, output: "audioFx" });
  }

  pipeline.push({ op: "denoise_sharpen", params: { level: 0.35 }, output: "enhanced" });

  // Timeline/Layers (Kuaishou: background + subject + subtitles + overlay)
  const timeline: KSETimelineLayer[] = [];

  // Background (can be asset-driven per template if you have one; otherwise gradient)
  timeline.push({
    t: [0, duration],
    layer: "bg",
    asset: "scenes/default_bg.mp4", // replace per template if you have assets
    blend: "normal",
  });

  // Subject layer uses slot "main"
  timeline.push({
    t: [0, duration],
    layer: "subject",
    fromSlot: "main",
    mask: wantsCutout ? "alphaMask" : undefined,
    blend: "normal",
  });

  // Beat-driven micro-animations (zoom/pulse)
  if (tpl.features.beatSync) {
    timeline.push({
      t: [0, duration],
      layer: "motion_driver",
      keyframes: [
        { at: 0, props: { zoom: 1.0 } },
        { at: Math.min(0.25, duration), props: { zoom: 1.04 } },
        { at: Math.min(0.5, duration), props: { zoom: 1.0 } },
      ],
    });
  }

  // Subtitles layer if enabled
  if (tpl.features.smartCaptions) {
    timeline.push({
      t: [0, duration],
      layer: "subtitles",
      track: "subtitleTrack",
      style: "kuaishou_white_outline", // create style mapping in your renderer
      blend: "normal",
    });
  }

  // A simple overlay slot for template identity (optional)
  timeline.push({
    t: [0, duration],
    layer: "overlay",
    asset: "overlays/default_frame.png",
    blend: "screen",
  });

  return {
    id: tpl.id,
    version: "kse-1.0.0",
    duration,
    ratio: "9:16",
    category: tpl.collectionId ?? "default",
    tags: [
      tpl.features.beatSync ? "beat" : "",
      tpl.features.smartCaptions ? "captions" : "",
      wantsCutout ? "cutout" : "",
      tpl.features.audioEnhance ? "audio" : "",
      tpl.features.stabilization ? "stab" : "",
    ].filter(Boolean),
    slots,
    pipeline,
    timeline,
    overrides: DEFAULT_KSE_OVERRIDES,
    i18n: {
      title_fr: `${tpl.emoji} ${tpl.label_fr}`,
      helper_fr: "Sélectionne 1 média, attends le traitement, puis ajuste Cover / Texte / Sous-titres.",
      title_ba: `${tpl.emoji} ${tpl.label_fr}`,
      helper_ba: "Sè ɲɔ̀ 1 média, bɔ̀ ɲɛ̀ IA, ɖɔ̀ Cover / Text / Subtitles.",
    },
    analytics: {
      difficulty: 1,
      expectedCompletionRate: 0.72,
    },
  };
}

/**
 * ✅ Neutral template (Sans Template)
 * engine = null (no enforced timeline)
 */
export const NEUTRAL_TEMPLATE: AdvancedTemplate = {
  id: "none",
  emoji: "⭕",
  label_fr: "Sans Template",
  description_fr: "Montage libre (aucune structure imposée).",
  color: "from-gray-600 to-gray-900",
  previewAnimation: "none",
  features: {
    beatSync: false,
    smartCaptions: false,
    translation: false,
    audioEnhance: false,
    stabilization: false,
  },
  engine: null,
  input: { slots: 0, allowPhoto: true, allowVideo: true, durationSec: 0 },
};

/**
 * ✅ Your templates list
 * IMPORTANT: keep your existing templates as-is, we just add `engine`.
 * If you already have ADVANCED_TEMPLATES defined, you can map() them to inject engine.
 */

// Example templates (replace with your real list)
const RAW_TEMPLATES: Array<Omit<AdvancedTemplate, "engine">> = [
  {
    id: "tpl_market_announce_8s",
    emoji: "🏪",
    label_fr: "Annonce du Marché",
    description_fr: "Une annonce rapide, claire, avec sous-titres automatiques.",
    color: "from-amber-500 to-orange-600",
    previewAnimation: "glow",
    collectionId: "daily",
    input: { slots: 1, allowPhoto: true, allowVideo: true, durationSec: 8 },
    features: { smartCaptions: true, beatSync: true, audioEnhance: true, stabilization: true, translation: true },
  },
  {
    id: "tpl_cutout_story_8s",
    emoji: "🌿",
    label_fr: "Détourage + Fond Scène",
    description_fr: "Détourage automatique (Recognizing) et insertion dans un décor.",
    color: "from-emerald-500 to-green-700",
    previewAnimation: "pulse",
    collectionId: "story",
    input: { slots: 1, allowPhoto: true, allowVideo: true, durationSec: 8 },
    features: { smartCaptions: true, beatSync: false, audioEnhance: false, stabilization: false, translation: false },
  },
  {
    id: "tpl_voice_news_15s",
    emoji: "📢",
    label_fr: "Annonce vocale (radio)",
    description_fr: "Tu parles, on génère sous-titres + rythme + cover prête à poster.",
    color: "from-indigo-500 to-purple-600",
    previewAnimation: "glow",
    collectionId: "community",
    input: { slots: 1, allowPhoto: true, allowVideo: true, durationSec: 15 },
    features: { smartCaptions: true, beatSync: true, audioEnhance: true, stabilization: false, translation: true },
  },
];

export const ADVANCED_TEMPLATES: AdvancedTemplate[] = RAW_TEMPLATES.map((t) => ({
  ...t,
  engine: buildKuaishouEngineManifest(t),
}));

/**
 * Collections API (keep your existing structure if you have it)
 */
export const TEMPLATE_COLLECTIONS = [
  { id: "daily", emoji: "📅", name_fr: "Quotidien", color: "from-amber-500 to-orange-600" },
  { id: "story", emoji: "🎬", name_fr: "Story", color: "from-emerald-500 to-green-700" },
  { id: "community", emoji: "👥", name_fr: "Communauté", color: "from-indigo-500 to-purple-600" },
];

export function getTemplatesByCollection(collectionId: string): AdvancedTemplate[] {
  return ADVANCED_TEMPLATES.filter((t) => t.collectionId === collectionId);
}
