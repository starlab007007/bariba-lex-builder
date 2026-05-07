// ============================================================
// ADVANCED TEMPLATE DATA - 24 Templates IA TAMTAM
// ✅ Upgraded: Kuaishou-like Template Engine manifests (slots → pipeline → timeline → overrides)
// ✅ FIXED: TDZ crash (Cannot access before initialization) by hoisting duration helpers as functions
// ✅ FIXED: Tailwind invalid color token "from-sepia" replaced with valid gradient
// ✅ Modification scope: templates/data ONLY (no change needed in AdvancedTemplateDrawer.tsx)
// ============================================================

export type TemplateFamily = 'grand_public' | 'educatif_culture' | 'vocal_radio';

export type TemplateDuration = '10s' | '15s' | '30s' | '45s' | '60s' | '90s' | '120s';

export type OutputRatio = '9:16' | '1:1' | '16:9';

export type InputType = 'video' | 'photo' | 'audio' | 'text';

export interface TemplateInput {
  type: InputType;
  minCount: number;
  maxCount: number;
  minDurationSec?: number;
  maxDurationSec?: number;
  optional?: boolean;
}

export interface AIFeatures {
  beatSync?: boolean;
  styleTransfer?: boolean;
  stabilization?: boolean;
  smartCaptions?: boolean;
  audioEnhance?: boolean;
  voiceClone?: boolean;
  narrativeStructure?: boolean;
  iconInjection?: boolean;
  translation?: boolean;
  photoAnimation?: boolean;
  autoEditing?: boolean;
  brollInsertion?: boolean;
  multiFormat?: boolean;
}

export interface VoiceInstruction {
  step: number;
  text_fr: string;
  text_ba?: string;
  action: 'record_video' | 'record_audio' | 'take_photo' | 'add_text' | 'wait' | 'confirm';
  durationHint?: number;
}

// ============================================================
// HELPER FUNCTIONS (HOISTED) - required by KSE builders at module init
// ============================================================

export function durationToSeconds(duration: TemplateDuration): number {
  const map: Record<TemplateDuration, number> = {
    '10s': 10,
    '15s': 15,
    '30s': 30,
    '45s': 45,
    '60s': 60,
    '90s': 90,
    '120s': 120
  };
  return map[duration];
}

export function formatDuration(duration: TemplateDuration): string {
  const seconds = durationToSeconds(duration);
  if (seconds >= 60) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${mins}min`;
  }
  return `${seconds}s`;
}

/* =========================================================================================
   ✅ KUAISHOU TEMPLATE ENGINE (KSE) TYPES
   -----------------------------------------------------------------------------------------
   Kuaishou observed flow in your screen recordings:
   - Template card shows: "1 Picture/Video", "Time 00:08", "Start"
   - Picker enforces slots: Done(0/1), tab All/Video/Photos
   - "Recognizing XX%" stage = pipeline (segmentation/ASR/etc.)
   - Editor after apply exposes limited overrides (Cover / Change / Text / Subtitles / Enhance / Stickers / Music)
========================================================================================= */

export type KSEOverride =
  | 'change'
  | 'cover'
  | 'text'
  | 'subtitles'
  | 'enhance'
  | 'stickers'
  | 'music';

export interface KSESlot {
  id: string; // e.g. "main", "photos", "audio"
  type: Array<'video' | 'photo' | 'audio' | 'text'>;
  required: boolean;
  min: number;
  max: number;
  minDurationSec?: number;
  maxDurationSec?: number;
}

export interface KSEPipelineStep {
  op: string; // keep flexible to iterate fast (e.g. "segmentation_person", "asr_subtitles", "beat_detect", ...)
  params?: Record<string, any>;
  output?: string;
  weight?: number; // used to drive "Recognizing %" progress
}

export interface KSETimelineLayer {
  t: [number, number]; // seconds
  layer: string; // "bg", "subject", "subtitles", "waveform", "overlay", "icons"
  asset?: string; // bundled asset key (optional)
  fromSlot?: string; // slot id
  track?: string; // pipeline output ref
  mask?: string; // pipeline output ref
  style?: string; // style preset id
  blend?: 'normal' | 'screen' | 'add' | 'multiply';
  keyframes?: Array<{ at: number; props: Record<string, any> }>;
}

export interface KuaishouTemplateManifest {
  id: string; // unique per variant (template + duration)
  templateId: string; // base template id
  version: string;
  title_fr: string;
  title_ba?: string;

  // as observed: one fixed duration shown on template card (00:08 etc.)
  durationSec: number;

  // primary format for short video engines
  ratio: OutputRatio;

  // what the template card can display (Kuaishou-style)
  cardHint: {
    inputSummary: string; // e.g. "1 Picture/Video", "1 Audio", "2 Photos"
    timeLabel: string; // e.g. "00:08"
  };

  // template “contract”
  slots: KSESlot[];

  // "Recognizing %" pipeline
  pipeline: KSEPipelineStep[];

  // composition graph (simplified manifest)
  timeline: KSETimelineLayer[];

  // what user can modify after apply (Kuaishou editor behavior)
  overrides: KSEOverride[];

  // optional metadata for ranking/collections
  tags?: string[];
  family?: TemplateFamily;
  collection?: 'voix_village' | 'patrimoine_vivant' | 'fierte_beaute' | 'kuaishou_horse' | null;
  supportedOutputRatios?: OutputRatio[]; // your multi-format needs
}

export interface KuaishouTemplateEngine {
  kind: 'KSE';
  // each duration becomes a Kuaishou-like template variant (because Kuaishou templates are duration-fixed)
  variants: Record<TemplateDuration, KuaishouTemplateManifest>;
  defaultDuration: TemplateDuration;
  defaultRatio: OutputRatio;
  overrides: KSEOverride[];
}

// ============================================================
// ADVANCED TEMPLATE (UI + Voice Guide + Engine)
// ============================================================

export interface AdvancedTemplate {
  id: string;
  emoji: string;
  label_fr: string;
  label_ba?: string;
  description_fr: string;
  description_ba?: string;
  family: TemplateFamily;
  collection: 'voix_village' | 'patrimoine_vivant' | 'fierte_beaute' | 'kuaishou_horse' | null;
  inputs: TemplateInput[];
  supportedDurations: TemplateDuration[];
  outputRatios: OutputRatio[];
  features: AIFeatures;
  defaultMusic?: string;
  voiceInstructions: VoiceInstruction[];
  previewAnimation?: 'pulse' | 'wave' | 'glow' | 'slide';
  color: string; // Tailwind color class

  // ✅ NEW: Kuaishou-like engine
  engine?: KuaishouTemplateEngine | null;
}

// ============================================================
// KSE HELPERS (data-only, safe)
// ============================================================

const DEFAULT_KSE_OVERRIDES: KSEOverride[] = [
  'change',
  'cover',
  'text',
  'subtitles',
  'enhance',
  'stickers',
  'music'
];

const secondsToMMSS = (sec: number): string => {
  const s = Math.max(0, Math.floor(sec));
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${mm}:${ss}`;
};

const summarizeInputsKuaishouStyle = (tpl: Omit<AdvancedTemplate, 'engine'>): string => {
  // Examples observed: "1 Picture/Video" ; we build similar
  const hasVideo = tpl.inputs.some(i => i.type === 'video');
  const hasPhoto = tpl.inputs.some(i => i.type === 'photo');
  const hasAudio = tpl.inputs.some(i => i.type === 'audio');
  const hasText  = tpl.inputs.some(i => i.type === 'text');

  // Prefer Kuaishou-like "Picture/Video" combo when both exist
  if ((hasVideo || hasPhoto) && !hasAudio && !hasText) {
    const v = tpl.inputs.find(i => i.type === 'video');
    const p = tpl.inputs.find(i => i.type === 'photo');
    const required = (v?.minCount ?? 0) > 0 || (p?.minCount ?? 0) > 0;
    const count = required ? 1 : 1;
    return `${count} Picture/Video`;
  }

  // Audio-only templates (radio)
  if (hasAudio && !hasVideo && !hasPhoto) {
    const a = tpl.inputs.find(i => i.type === 'audio');
    const count = Math.max(1, a?.minCount ?? 1);
    return `${count} Audio`;
  }

  // Mixed templates: keep compact
  const parts: string[] = [];
  tpl.inputs.forEach(i => {
    const label =
      i.type === 'video' ? 'Video' :
      i.type === 'photo' ? 'Photo' :
      i.type === 'audio' ? 'Audio' : 'Text';
    const c = Math.max(1, i.minCount || 1);
    parts.push(`${c} ${label}${c > 1 ? 's' : ''}`);
  });
  return parts.join(' + ');
};

const buildKSESlots = (tpl: Omit<AdvancedTemplate, 'engine'>): KSESlot[] => {
  // We model input groups as slots with (min,max) rather than enumerating every clip.
  return tpl.inputs.map((inp) => {
    const required = !inp.optional && inp.minCount > 0;
    const id =
      inp.type === 'video' ? 'video_main' :
      inp.type === 'photo' ? 'photos' :
      inp.type === 'audio' ? 'audio_main' :
      'text_main';

    const typeMap: Record<InputType, Array<'video'|'photo'|'audio'|'text'>> = {
      video: ['video'],
      photo: ['photo'],
      audio: ['audio'],
      text: ['text']
    };

    return {
      id,
      type: typeMap[inp.type],
      required,
      min: inp.minCount,
      max: inp.maxCount,
      minDurationSec: inp.minDurationSec,
      maxDurationSec: inp.maxDurationSec
    };
  });
};

const buildKSEPipeline = (tpl: Omit<AdvancedTemplate, 'engine'>): KSEPipelineStep[] => {
  // Weight drives "Recognizing %" stage if you want to display a progress bar later.
  // We infer Kuaishou-like processing from your features.
  const steps: KSEPipelineStep[] = [];

  // Always smart crop/reframe for vertical friendliness (observed in apps like Kuaishou)
  steps.push({
    op: 'smart_crop',
    params: { target: 'person', mode: 'reframe' },
    output: 'cropRect',
    weight: 0.10
  });

  if (tpl.features.stabilization) {
    steps.push({
      op: 'stabilization',
      params: { strength: 0.65 },
      output: 'stabilizedVideo',
      weight: 0.15
    });
  }

  if (tpl.features.audioEnhance) {
    steps.push({
      op: 'audio_enhance',
      params: { denoise: true, normalize: true },
      output: 'audioFx',
      weight: 0.15
    });
  }

  if (tpl.features.smartCaptions) {
    steps.push({
      op: 'asr_subtitles',
      params: { langs: ['fr', 'ba'], align: 'forced' },
      output: 'subtitleTrack',
      weight: 0.20
    });
  }

  if (tpl.features.translation) {
    steps.push({
      op: 'translation_subtitles',
      params: { targetLangs: ['fr', 'ba'], mode: 'subtitle+optional_dub' },
      output: 'translatedTracks',
      weight: 0.10
    });
  }

  if (tpl.features.beatSync) {
    steps.push({
      op: 'beat_detect',
      params: { sensitivity: 0.7 },
      output: 'beatMap',
      weight: 0.10
    });
  }

  if (tpl.features.styleTransfer) {
    steps.push({
      op: 'style_transfer',
      params: { preset: 'cinema_local', skinToneAware: true },
      output: 'styledVideo',
      weight: 0.10
    });
  }

  if (tpl.features.photoAnimation) {
    steps.push({
      op: 'photo_animation',
      params: { mode: 'kenburns+depth' },
      output: 'animatedPhotos',
      weight: 0.10
    });
  }

  if (tpl.features.iconInjection) {
    steps.push({
      op: 'icon_injection',
      params: { mode: 'contextual_emojis', density: 'low' },
      output: 'iconLayer',
      weight: 0.05
    });
  }

  if (tpl.features.narrativeStructure) {
    steps.push({
      op: 'narrative_structure',
      params: { pattern: 'hook_problem_solution_cta' },
      output: 'chapters',
      weight: 0.05
    });
  }

  if (tpl.features.brollInsertion) {
    steps.push({
      op: 'broll_insertion',
      params: { source: 'stock_or_user', intensity: 0.35 },
      output: 'brollPlan',
      weight: 0.05
    });
  }

  if (tpl.features.voiceClone) {
    steps.push({
      op: 'voice_clone_hook',
      params: { seconds: 5, style: 'hook' },
      output: 'voiceHook',
      weight: 0.05
    });
  }

  if (tpl.features.autoEditing) {
    steps.push({
      op: 'auto_editing',
      params: { cuts: 'auto', pacing: 'social_fast' },
      output: 'editPlan',
      weight: 0.05
    });
  }

  if (tpl.features.multiFormat) {
    steps.push({
      op: 'multi_format_export_plan',
      params: { ratios: tpl.outputRatios },
      output: 'exportPlan',
      weight: 0.02
    });
  }

  // Final enhance step
  steps.push({
    op: 'denoise_sharpen',
    params: { level: 0.35 },
    output: 'enhanced',
    weight: 0.03
  });

  return steps;
};

const buildKSETimeline = (tpl: Omit<AdvancedTemplate, 'engine'>, durationSec: number): KSETimelineLayer[] => {
  const hasVideo = tpl.inputs.some(i => i.type === 'video');
  const hasPhoto = tpl.inputs.some(i => i.type === 'photo');
  const hasAudio = tpl.inputs.some(i => i.type === 'audio');
  const isRadio = tpl.family === 'vocal_radio' || (hasAudio && !hasVideo && !hasPhoto);

  const layers: KSETimelineLayer[] = [];

  // Background: placeholder assets (swap with real assets later)
  layers.push({
    t: [0, durationSec],
    layer: 'bg',
    asset: isRadio ? 'scenes/radio_bg.mp4' : 'scenes/default_bg.mp4',
    blend: 'normal'
  });

  // Main media layer
  if (hasVideo) {
    layers.push({
      t: [0, durationSec],
      layer: 'subject',
      fromSlot: 'video_main',
      blend: 'normal'
    });
  } else if (hasPhoto) {
    layers.push({
      t: [0, durationSec],
      layer: 'subject',
      fromSlot: 'photos',
      blend: 'normal'
    });
  }

  // Waveform (Kuaishou-like audio templates)
  if (isRadio) {
    layers.push({
      t: [0, durationSec],
      layer: 'waveform',
      fromSlot: 'audio_main',
      style: 'waveform_kuaishou',
      blend: 'add',
      keyframes: [
        { at: 0, props: { scale: 0.98, opacity: 0.85 } },
        { at: Math.min(0.3, durationSec), props: { scale: 1.0, opacity: 1.0 } }
      ]
    });
  }

  // Subtitles layer (smart captions)
  if (tpl.features.smartCaptions) {
    layers.push({
      t: [0, durationSec],
      layer: 'subtitles',
      track: 'subtitleTrack',
      style: 'kuaishou_white_outline',
      blend: 'normal'
    });
  }

  // Icons injection layer
  if (tpl.features.iconInjection) {
    layers.push({
      t: [0, durationSec],
      layer: 'icons',
      track: 'iconLayer',
      style: 'emoji_bubbles',
      blend: 'screen'
    });
  }

  // Overlay frame (template identity)
  layers.push({
    t: [0, durationSec],
    layer: 'overlay',
    asset: isRadio ? 'overlays/radio_frame.png' : 'overlays/default_frame.png',
    blend: 'screen'
  });

  // Beat micro-animations driver
  if (tpl.features.beatSync) {
    layers.push({
      t: [0, durationSec],
      layer: 'motion_driver',
      track: 'beatMap',
      style: 'beat_pulse',
      keyframes: [
        { at: 0, props: { zoom: 1.0 } },
        { at: Math.min(0.25, durationSec), props: { zoom: 1.04 } },
        { at: Math.min(0.5, durationSec), props: { zoom: 1.0 } }
      ]
    });
  }

  return layers;
};

const pickDefaultDuration = (tpl: Omit<AdvancedTemplate, 'engine'>): TemplateDuration => {
  const pref: TemplateDuration[] = ['10s', '15s', '30s', '45s', '60s', '90s', '120s'];
  for (const d of pref) {
    if (tpl.supportedDurations.includes(d)) return d;
  }
  return tpl.supportedDurations[0] ?? '15s';
};

const pickDefaultRatio = (tpl: Omit<AdvancedTemplate, 'engine'>): OutputRatio => {
  if (tpl.outputRatios.includes('9:16')) return '9:16';
  return tpl.outputRatios[0] ?? '9:16';
};

const buildKSEVariant = (tpl: Omit<AdvancedTemplate, 'engine'>, duration: TemplateDuration): KuaishouTemplateManifest => {
  const durationSec = durationToSeconds(duration);
  const ratio = pickDefaultRatio(tpl);

  const slots = buildKSESlots(tpl);
  const pipeline = buildKSEPipeline(tpl);
  const timeline = buildKSETimeline(tpl, durationSec);

  return {
    id: `${tpl.id}__${duration}`,
    templateId: tpl.id,
    version: 'kse-1.0.0',
    title_fr: `${tpl.emoji} ${tpl.label_fr}`,
    title_ba: tpl.label_ba ? `${tpl.emoji} ${tpl.label_ba}` : undefined,
    durationSec,
    ratio,
    cardHint: {
      inputSummary: summarizeInputsKuaishouStyle(tpl),
      timeLabel: secondsToMMSS(durationSec)
    },
    slots,
    pipeline,
    timeline,
    overrides: DEFAULT_KSE_OVERRIDES,
    tags: [
      tpl.family,
      tpl.collection ?? 'none',
      ...Object.entries(tpl.features)
        .filter(([, v]) => Boolean(v))
        .map(([k]) => k)
    ],
    family: tpl.family,
    collection: tpl.collection,
    supportedOutputRatios: tpl.outputRatios
  };
};

const buildKSEngine = (tpl: Omit<AdvancedTemplate, 'engine'>): KuaishouTemplateEngine => {
  const defaultDuration = pickDefaultDuration(tpl);
  const defaultRatio = pickDefaultRatio(tpl);

  const variants = tpl.supportedDurations.reduce((acc, d) => {
    acc[d] = buildKSEVariant(tpl, d);
    return acc;
  }, {} as Record<TemplateDuration, KuaishouTemplateManifest>);

  return {
    kind: 'KSE',
    variants,
    defaultDuration,
    defaultRatio,
    overrides: DEFAULT_KSE_OVERRIDES
  };
};

// ============================================================
// OPTION NEUTRE - Sans Template
// ============================================================

export const NEUTRAL_TEMPLATE: AdvancedTemplate = {
  id: 'none',
  emoji: '📷',
  label_fr: 'Sans Template',
  label_ba: 'Kↄnↄ',
  description_fr: 'Créer librement sans effets IA',
  description_ba: 'I ka baara i yɛrɛ la',
  family: 'grand_public',
  collection: null,
  inputs: [{ type: 'video', minCount: 1, maxCount: 1 }],
  supportedDurations: ['15s', '30s', '45s', '60s', '90s', '120s'],
  outputRatios: ['9:16', '1:1', '16:9'],
  features: {},
  previewAnimation: undefined,
  color: 'from-gray-600 to-gray-800',
  voiceInstructions: [],
  engine: null
};

// ============================================================
// A) 8 Templates Grand Public (raw templates - engine injected at export time)
// ============================================================

type RawTemplate = Omit<AdvancedTemplate, 'engine'>;

const GRAND_PUBLIC_TEMPLATES_RAW: RawTemplate[] = [
  {
    id: 'beat_sync_ultra',
    emoji: '🎵',
    label_fr: 'Beat-Sync Ultra',
    label_ba: 'Dↄn kpankpa',
    description_fr: 'Montage auto sur le rythme de la musique',
    description_ba: 'Dↄn kaa yↄ kpankpa',
    family: 'grand_public',
    collection: 'fierte_beaute',
    inputs: [
      { type: 'video', minCount: 1, maxCount: 1, minDurationSec: 5, maxDurationSec: 12 },
      { type: 'photo', minCount: 0, maxCount: 6, optional: true }
    ],
    supportedDurations: ['10s', '15s', '30s'],
    outputRatios: ['9:16', '1:1'],
    features: { beatSync: true, autoEditing: true },
    previewAnimation: 'pulse',
    color: 'from-purple-500 to-pink-500',
    voiceInstructions: [
      { step: 1, text_fr: 'Filme une courte vidéo de 5 à 12 secondes', action: 'record_video', durationHint: 10 },
      { step: 2, text_fr: 'Ou ajoute jusqu\'à 6 photos', action: 'take_photo' },
      { step: 3, text_fr: 'L\'IA va synchroniser avec la musique', action: 'wait' }
    ]
  },
  {
    id: 'style_transfer_local',
    emoji: '🎬',
    label_fr: 'Style Cinéma Local',
    label_ba: 'Sinima gba',
    description_fr: 'Look cinéma adapté aux visages locaux',
    description_ba: 'Sinima yↄ gba',
    family: 'grand_public',
    collection: 'fierte_beaute',
    inputs: [{ type: 'video', minCount: 1, maxCount: 1 }],
    supportedDurations: ['15s', '30s', '45s'],
    outputRatios: ['9:16', '16:9'],
    features: { styleTransfer: true, audioEnhance: true },
    previewAnimation: 'glow',
    color: 'from-amber-500 to-orange-500',
    voiceInstructions: [
      { step: 1, text_fr: 'Filme ta vidéo normalement', action: 'record_video' },
      { step: 2, text_fr: 'L\'IA va appliquer un style cinéma', action: 'wait' }
    ]
  },
  {
    id: 'one_take_pro',
    emoji: '🐴',
    label_fr: 'One-Take Pro 🐴',
    label_ba: 'Gba kelen Horse',
    description_fr: 'Template Kuaishou Horse 15s: Sparkles, Calligraphie, Beat Sync, Cheval animé',
    description_ba: 'Template premium kaa horse animation',
    family: 'grand_public',
    collection: 'kuaishou_horse',
    inputs: [{ type: 'video', minCount: 1, maxCount: 1, minDurationSec: 5, maxDurationSec: 60 }],
    supportedDurations: ['15s'],
    outputRatios: ['9:16'],
    features: { stabilization: true, autoEditing: true, beatSync: true, iconInjection: true },
    previewAnimation: 'pulse',
    color: 'from-yellow-500 to-orange-600',
    voiceInstructions: [
      { step: 1, text_fr: 'Filme ta vidéo (5-60 sec)', action: 'record_video' },
      { step: 2, text_fr: 'L\'IA ajoute sparkles, cheval, beat sync...', action: 'wait' }
    ]
  },
  {
    id: 'quick_story',
    emoji: '⚡',
    label_fr: 'Quick Story',
    label_ba: 'Sↄ joona',
    description_fr: 'Story rapide avec emojis animés - 15 sec',
    description_ba: 'Sↄ joona kaa emojis',
    family: 'grand_public',
    collection: null,
    inputs: [{ type: 'video', minCount: 1, maxCount: 1, minDurationSec: 5, maxDurationSec: 20 }],
    supportedDurations: ['15s'],
    outputRatios: ['9:16'],
    features: { stabilization: true, iconInjection: true, beatSync: true },
    previewAnimation: 'pulse',
    color: 'from-yellow-400 to-orange-500',
    voiceInstructions: [
      { step: 1, text_fr: 'Filme une courte vidéo de 5 à 20 secondes', action: 'record_video', durationHint: 15 },
      { step: 2, text_fr: 'L\'IA ajoute des emojis animés automatiquement', action: 'wait' }
    ]
  },
  {
    id: 'magic_transform',
    emoji: '✨',
    label_fr: 'Magic Transform',
    label_ba: 'Yeli',
    description_fr: 'Transition avant/après spectaculaire',
    description_ba: 'Yeli kaa sↄ',
    family: 'grand_public',
    collection: 'fierte_beaute',
    inputs: [{ type: 'photo', minCount: 2, maxCount: 2 }],
    supportedDurations: ['10s', '15s', '30s'],
    outputRatios: ['9:16', '1:1'],
    features: { photoAnimation: true, autoEditing: true },
    previewAnimation: 'wave',
    color: 'from-violet-500 to-purple-500',
    voiceInstructions: [
      { step: 1, text_fr: 'Prends une photo AVANT', action: 'take_photo' },
      { step: 2, text_fr: 'Prends une photo APRÈS', action: 'take_photo' },
      { step: 3, text_fr: 'L\'IA crée la transition magique', action: 'wait' }
    ]
  },
  {
    id: 'smart_captions',
    emoji: '💬',
    label_fr: 'Smart Captions',
    label_ba: 'Sɛbɛ yeli',
    description_fr: 'Sous-titres auto avec emojis contextuels',
    description_ba: 'Sɛbɛ kaa dↄn',
    family: 'grand_public',
    collection: null,
    inputs: [{ type: 'video', minCount: 1, maxCount: 1 }],
    supportedDurations: ['30s', '45s', '60s'],
    outputRatios: ['9:16', '1:1', '16:9'],
    features: { smartCaptions: true, iconInjection: true, translation: true },
    previewAnimation: 'pulse',
    color: 'from-green-500 to-emerald-500',
    voiceInstructions: [
      { step: 1, text_fr: 'Parle clairement dans ta vidéo', action: 'record_video' },
      { step: 2, text_fr: 'L\'IA ajoute les sous-titres et emojis', action: 'wait' }
    ]
  },
  {
    id: 'multi_format_export',
    emoji: '📐',
    label_fr: 'Multi-Format',
    label_ba: 'Gba sara',
    description_fr: 'Export 3 formats auto (9:16, 1:1, 16:9)',
    description_ba: 'Gba sara saba',
    family: 'grand_public',
    collection: null,
    inputs: [{ type: 'video', minCount: 1, maxCount: 1 }],
    supportedDurations: ['10s', '15s', '30s', '45s', '60s'],
    outputRatios: ['9:16', '1:1', '16:9'],
    features: { multiFormat: true, autoEditing: true },
    previewAnimation: 'slide',
    color: 'from-slate-500 to-gray-500',
    voiceInstructions: [
      { step: 1, text_fr: 'Filme ta vidéo', action: 'record_video' },
      { step: 2, text_fr: 'L\'IA génère 3 versions pour WhatsApp, Facebook, TV', action: 'wait' }
    ]
  },
  {
    id: 'auto_broll_booster',
    emoji: '🎞️',
    label_fr: 'B-Roll Booster',
    label_ba: 'Gba kunu',
    description_fr: 'Ajout automatique de plans de coupe',
    description_ba: 'Gba kunu yↄ',
    family: 'grand_public',
    collection: null,
    inputs: [{ type: 'video', minCount: 1, maxCount: 1 }],
    supportedDurations: ['45s', '60s', '90s'],
    outputRatios: ['9:16', '16:9'],
    features: { brollInsertion: true, autoEditing: true },
    previewAnimation: 'wave',
    color: 'from-teal-500 to-cyan-500',
    voiceInstructions: [
      { step: 1, text_fr: 'Filme ta vidéo principale', action: 'record_video' },
      { step: 2, text_fr: 'L\'IA ajoute des plans de coupe pro', action: 'wait' }
    ]
  },
  {
    id: 'voice_clone_hook',
    emoji: '🎤',
    label_fr: 'Voice Hook',
    label_ba: 'Kan yeli',
    description_fr: 'Accroche avec ta propre voix clonée',
    description_ba: 'Kan yeli kaa sↄ',
    family: 'grand_public',
    collection: null,
    inputs: [
      { type: 'audio', minCount: 1, maxCount: 1, minDurationSec: 5, maxDurationSec: 10 },
      { type: 'video', minCount: 1, maxCount: 1 }
    ],
    supportedDurations: ['10s', '15s', '30s'],
    outputRatios: ['9:16'],
    features: { voiceClone: true, autoEditing: true },
    previewAnimation: 'pulse',
    color: 'from-rose-500 to-red-500',
    voiceInstructions: [
      { step: 1, text_fr: 'Enregistre 5 secondes de ta voix', action: 'record_audio', durationHint: 5 },
      { step: 2, text_fr: 'Filme ta vidéo', action: 'record_video' },
      { step: 3, text_fr: 'L\'IA crée une intro avec ta voix', action: 'wait' }
    ]
  }
];

// ============================================================
// B) 10 Templates Éducatif / Culture / Mémoire (raw)
// ============================================================

const EDUCATIF_CULTURE_TEMPLATES_RAW: RawTemplate[] = [
  {
    id: 'mini_doc_village',
    emoji: '🏘️',
    label_fr: 'Mini-Doc Village',
    label_ba: 'Dugu gba',
    description_fr: 'Mini documentaire avec narration IA et sous-titres bilingues',
    description_ba: 'Dugu gba - Dↄɔkumã kɔnɔ',
    family: 'educatif_culture',
    collection: 'patrimoine_vivant',
    inputs: [
      { type: 'video', minCount: 1, maxCount: 1, minDurationSec: 10, maxDurationSec: 60 }
    ],
    supportedDurations: ['15s', '30s', '45s'],
    outputRatios: ['9:16'],
    features: { 
      narrativeStructure: true, 
      smartCaptions: true, 
      audioEnhance: true,
      styleTransfer: true,    // ✅ Documentary color grading
      stabilization: true,    // ✅ Smooth camera
      translation: true       // ✅ Bilingual subtitles
    },
    defaultMusic: 'traditional_soft',
    previewAnimation: 'glow',
    color: 'from-amber-600 to-yellow-500',
    voiceInstructions: [
      { step: 1, text_fr: 'Filme ton village pendant 15 secondes', text_ba: 'I ka dugu gba sɛgɛsɛgɛli 15s', action: 'record_video', durationHint: 15 },
      { step: 2, text_fr: 'L\'IA crée un mini-documentaire professionnel', text_ba: 'AI bɛ dↄɔkumã dɔ da', action: 'wait' }
    ]
  },
  {
    id: 'metiers_terroir',
    emoji: '👨‍🌾',
    label_fr: 'Métiers du Terroir',
    label_ba: 'Baara gba',
    description_fr: 'Un jour, un métier - valorise le travail local',
    description_ba: 'Baara don kelen',
    family: 'educatif_culture',
    collection: 'fierte_beaute',
    inputs: [{ type: 'video', minCount: 1, maxCount: 1 }],
    supportedDurations: ['30s', '60s', '120s'],
    outputRatios: ['9:16', '16:9'],
    features: { autoEditing: true, iconInjection: true, smartCaptions: true },
    previewAnimation: 'slide',
    color: 'from-green-600 to-lime-500',
    voiceInstructions: [
      { step: 1, text_fr: 'Filme quelqu\'un qui travaille', action: 'record_video' },
      { step: 2, text_fr: 'L\'IA crée un mini-reportage métier', action: 'wait' }
    ]
  },
  {
    id: 'histoire_vraie',
    emoji: '📖',
    label_fr: 'Histoire Vraie',
    label_ba: 'Kuma tiɲɛ',
    description_fr: 'Problème → Solution en storytelling',
    description_ba: 'Kuma tiɲɛ yeli',
    family: 'educatif_culture',
    collection: null,
    inputs: [
      { type: 'audio', minCount: 1, maxCount: 1, minDurationSec: 10, maxDurationSec: 30 },
      { type: 'photo', minCount: 1, maxCount: 3 }
    ],
    supportedDurations: ['45s', '60s', '90s'],
    outputRatios: ['9:16'],
    features: { narrativeStructure: true, photoAnimation: true, smartCaptions: true },
    previewAnimation: 'wave',
    color: 'from-indigo-500 to-blue-500',
    voiceInstructions: [
      { step: 1, text_fr: 'Raconte ton histoire en 10 à 30 secondes', action: 'record_audio' },
      { step: 2, text_fr: 'Ajoute 1 à 3 photos pour illustrer', action: 'take_photo' },
      { step: 3, text_fr: 'L\'IA structure: problème, action, solution', action: 'wait' }
    ]
  },
  {
    id: 'conte_du_soir',
    emoji: '🌙',
    label_fr: 'Conte du Soir',
    label_ba: 'Nsurun kuma',
    description_fr: 'Conte pour enfants avec ambiance magique',
    description_ba: 'Den kuma nsurun',
    family: 'educatif_culture',
    collection: 'patrimoine_vivant',
    inputs: [
      { type: 'photo', minCount: 1, maxCount: 1 },
      { type: 'audio', minCount: 1, maxCount: 1 }
    ],
    supportedDurations: ['60s', '90s', '120s'],
    outputRatios: ['9:16', '16:9'],
    features: { narrativeStructure: true, photoAnimation: true, audioEnhance: true },
    defaultMusic: 'fireplace_ambiance',
    previewAnimation: 'glow',
    color: 'from-purple-600 to-indigo-600',
    voiceInstructions: [
      { step: 1, text_fr: 'Prends une photo pour illustrer', action: 'take_photo' },
      { step: 2, text_fr: 'Raconte ton conte', action: 'record_audio' },
      { step: 3, text_fr: 'L\'IA crée une ambiance feu de bois', action: 'wait' }
    ]
  },
  {
    id: 'parole_ancien',
    emoji: '👴',
    label_fr: 'Parole d\'Ancien',
    label_ba: 'Kↄrↄ kuma',
    description_fr: 'Patrimoine immatériel - sauve la mémoire',
    description_ba: 'Kↄrↄ kuma yeli',
    family: 'educatif_culture',
    collection: 'patrimoine_vivant',
    inputs: [{ type: 'audio', minCount: 1, maxCount: 1 }],
    supportedDurations: ['60s', '90s', '120s'],
    outputRatios: ['9:16', '1:1'],
    features: { audioEnhance: true, smartCaptions: true, iconInjection: true, translation: true },
    previewAnimation: 'wave',
    color: 'from-amber-700 to-orange-600',
    voiceInstructions: [
      { step: 1, text_fr: 'Enregistre la parole d\'un ancien', action: 'record_audio' },
      { step: 2, text_fr: 'L\'IA nettoie l\'audio et ajoute des sous-titres', action: 'wait' }
    ]
  },
  {
    id: 'avant_apres_village',
    emoji: '🕰️',
    label_fr: 'Avant/Après Village',
    label_ba: 'Kↄrↄ ni sisan',
    description_fr: 'Archives vivantes - nostalgie virale',
    description_ba: 'Dugu kↄrↄ ni sisan',
    family: 'educatif_culture',
    collection: 'patrimoine_vivant',
    inputs: [{ type: 'photo', minCount: 2, maxCount: 2 }],
    supportedDurations: ['15s', '30s', '45s'],
    outputRatios: ['9:16', '1:1'],
    features: { photoAnimation: true, narrativeStructure: true },
    previewAnimation: 'slide',
    // FIXED: from-sepia (invalid) -> valid Tailwind gradient
    color: 'from-amber-800 to-amber-600',
    voiceInstructions: [
      { step: 1, text_fr: 'Ajoute une photo ancienne', action: 'take_photo' },
      { step: 2, text_fr: 'Ajoute la photo actuelle du même endroit', action: 'take_photo' },
      { step: 3, text_fr: 'L\'IA crée une transition temporelle', action: 'wait' }
    ]
  },
  {
    id: 'carte_postale_beaute',
    emoji: '🌄',
    label_fr: 'Carte Postale',
    label_ba: 'Dugu cɛmancɛ',
    description_fr: 'Paysage sublimé - montre la beauté',
    description_ba: 'Dugu cɛmancɛ yeli',
    family: 'educatif_culture',
    collection: 'fierte_beaute',
    inputs: [{ type: 'photo', minCount: 1, maxCount: 1 }],
    supportedDurations: ['10s', '15s', '30s'],
    outputRatios: ['9:16', '16:9'],
    features: { styleTransfer: true, photoAnimation: true },
    defaultMusic: 'traditional_soft',
    previewAnimation: 'glow',
    color: 'from-sky-500 to-blue-600',
    voiceInstructions: [
      { step: 1, text_fr: 'Prends une belle photo de paysage', action: 'take_photo' },
      { step: 2, text_fr: 'L\'IA améliore et anime', action: 'wait' }
    ]
  },
  {
    id: 'micro_cours_pratique',
    emoji: '📚',
    label_fr: 'Micro-Cours',
    label_ba: 'Kalan fitinin',
    description_fr: '1 astuce en étapes claires',
    description_ba: 'Kalan kelen yeli',
    family: 'educatif_culture',
    collection: null,
    inputs: [{ type: 'video', minCount: 1, maxCount: 1 }],
    supportedDurations: ['30s', '45s', '60s'],
    outputRatios: ['9:16'],
    features: { autoEditing: true, iconInjection: true, smartCaptions: true },
    previewAnimation: 'pulse',
    color: 'from-blue-500 to-indigo-500',
    voiceInstructions: [
      { step: 1, text_fr: 'Filme ta démonstration étape par étape', action: 'record_video' },
      { step: 2, text_fr: 'L\'IA découpe et ajoute des icônes', action: 'wait' }
    ]
  },
  {
    id: 'histoire_en_images',
    emoji: '🖼️',
    label_fr: 'Histoire en Images',
    label_ba: 'Kuma ja la',
    description_fr: 'Story photo → film narratif',
    description_ba: 'Ja kuma yeli',
    family: 'educatif_culture',
    collection: null,
    inputs: [{ type: 'photo', minCount: 4, maxCount: 6 }],
    supportedDurations: ['30s', '60s', '90s'],
    outputRatios: ['9:16'],
    features: { narrativeStructure: true, photoAnimation: true, smartCaptions: true },
    previewAnimation: 'wave',
    color: 'from-pink-500 to-rose-500',
    voiceInstructions: [
      { step: 1, text_fr: 'Ajoute 4 à 6 photos dans l\'ordre', action: 'take_photo' },
      { step: 2, text_fr: 'L\'IA crée un film narratif', action: 'wait' }
    ]
  },
  {
    id: 'doc_express_patrimoine',
    emoji: '🏛️',
    label_fr: 'Doc Patrimoine',
    label_ba: 'Yↄrↄ senuma',
    description_fr: 'Monument ou lieu sacré documenté',
    description_ba: 'Yↄrↄ senuma gba',
    family: 'educatif_culture',
    collection: 'patrimoine_vivant',
    inputs: [{ type: 'video', minCount: 1, maxCount: 1 }],
    supportedDurations: ['45s', '60s', '120s'],
    outputRatios: ['9:16', '16:9'],
    features: { narrativeStructure: true, smartCaptions: true, iconInjection: true },
    defaultMusic: 'traditional_soft',
    previewAnimation: 'glow',
    color: 'from-stone-500 to-amber-600',
    voiceInstructions: [
      { step: 1, text_fr: 'Filme le monument ou lieu sacré', action: 'record_video' },
      { step: 2, text_fr: 'L\'IA ajoute narration et faits', action: 'wait' }
    ]
  }
];

// ============================================================
// C) 6 Templates Vocal / Radio / Communautaire (raw)
// ============================================================

const VOCAL_RADIO_TEMPLATES_RAW: RawTemplate[] = [
  {
    id: 'radio_village',
    emoji: '📻',
    label_fr: 'Radio Village',
    label_ba: 'Dugu radio',
    description_fr: 'Audio → vidéo animée avec waveform',
    description_ba: 'Kan → Gba yeli',
    family: 'vocal_radio',
    collection: 'voix_village',
    inputs: [{ type: 'audio', minCount: 1, maxCount: 1 }],
    supportedDurations: ['30s', '60s', '90s', '120s'],
    outputRatios: ['9:16', '1:1'],
    features: { audioEnhance: true, iconInjection: true, smartCaptions: true },
    previewAnimation: 'wave',
    color: 'from-red-500 to-orange-500',
    voiceInstructions: [
      { step: 1, text_fr: 'Enregistre ton message vocal', action: 'record_audio' },
      { step: 2, text_fr: 'L\'IA crée une vidéo animée avec waveform', action: 'wait' }
    ]
  },
  {
    id: 'annonce_communautaire',
    emoji: '📢',
    label_fr: 'Annonce Communauté',
    label_ba: 'Dugu kuma',
    description_fr: 'Message + pictos pour marché, cérémonie, alerte',
    description_ba: 'Dugu kuma yeli',
    family: 'vocal_radio',
    collection: 'voix_village',
    inputs: [{ type: 'audio', minCount: 1, maxCount: 1 }],
    supportedDurations: ['10s', '15s', '30s', '45s'],
    outputRatios: ['9:16', '1:1'],
    features: { audioEnhance: true, iconInjection: true },
    previewAnimation: 'pulse',
    color: 'from-yellow-500 to-amber-500',
    voiceInstructions: [
      { step: 1, text_fr: 'Dis ton annonce clairement', action: 'record_audio' },
      { step: 2, text_fr: 'L\'IA ajoute des icônes et amplifie', action: 'wait' }
    ]
  },
  {
    id: 'debat_express',
    emoji: '⚖️',
    label_fr: 'Débat Express',
    label_ba: 'Nyↄgↄnna kuma',
    description_fr: '2 opinions structurées avec synthèse',
    description_ba: 'Kuma fila yeli',
    family: 'vocal_radio',
    collection: 'voix_village',
    inputs: [{ type: 'audio', minCount: 2, maxCount: 2 }],
    supportedDurations: ['45s', '60s', '90s'],
    outputRatios: ['9:16'],
    features: { audioEnhance: true, narrativeStructure: true, smartCaptions: true },
    previewAnimation: 'slide',
    color: 'from-gray-600 to-slate-500',
    voiceInstructions: [
      { step: 1, text_fr: 'Enregistre la première opinion', action: 'record_audio' },
      { step: 2, text_fr: 'Enregistre la deuxième opinion', action: 'record_audio' },
      { step: 3, text_fr: 'L\'IA structure le débat avec synthèse', action: 'wait' }
    ]
  },
  {
    id: 'traduction_voix',
    emoji: '🌍',
    label_fr: 'Traduction Voix',
    label_ba: 'Kan yeli',
    description_fr: 'Sous-titres + doublage automatique',
    description_ba: 'Kan yeli faransi',
    family: 'vocal_radio',
    collection: 'voix_village',
    inputs: [{ type: 'audio', minCount: 1, maxCount: 1 }],
    supportedDurations: ['10s', '15s', '30s', '45s', '60s', '90s', '120s'],
    outputRatios: ['9:16', '1:1'],
    features: { translation: true, smartCaptions: true, audioEnhance: true },
    previewAnimation: 'glow',
    color: 'from-green-500 to-teal-500',
    voiceInstructions: [
      { step: 1, text_fr: 'Parle dans ta langue locale', action: 'record_audio' },
      { step: 2, text_fr: 'L\'IA traduit et double en français', action: 'wait' }
    ]
  },
  {
    id: 'chorale_collective',
    emoji: '🎶',
    label_fr: 'Chorale Collective',
    label_ba: 'Dↄnkili ɲↄgↄn',
    description_fr: 'Chant collaboratif synchronisé',
    description_ba: 'Dↄnkili ɲↄgↄn yeli',
    family: 'vocal_radio',
    collection: null,
    inputs: [{ type: 'audio', minCount: 1, maxCount: 5 }],
    supportedDurations: ['30s', '60s', '120s'],
    outputRatios: ['9:16', '1:1'],
    features: { audioEnhance: true, autoEditing: true },
    previewAnimation: 'wave',
    color: 'from-fuchsia-500 to-pink-500',
    voiceInstructions: [
      { step: 1, text_fr: 'Enregistre ta voix ou invite d\'autres', action: 'record_audio' },
      { step: 2, text_fr: 'L\'IA synchronise et mixe les voix', action: 'wait' }
    ]
  },
  {
    id: 'voix_de_famille',
    emoji: '💝',
    label_fr: 'Voix de Famille',
    label_ba: 'So kan',
    description_fr: 'Mini film avec la voix d\'un proche',
    description_ba: 'So kan yeli',
    family: 'vocal_radio',
    collection: null,
    inputs: [
      { type: 'audio', minCount: 1, maxCount: 1, minDurationSec: 5, maxDurationSec: 15 },
      { type: 'photo', minCount: 2, maxCount: 5 }
    ],
    supportedDurations: ['60s', '90s', '120s'],
    outputRatios: ['9:16'],
    features: { audioEnhance: true, photoAnimation: true, narrativeStructure: true },
    defaultMusic: 'emotional_soft',
    previewAnimation: 'glow',
    color: 'from-rose-500 to-pink-600',
    voiceInstructions: [
      { step: 1, text_fr: 'Enregistre 5-15s de la voix d\'un proche', action: 'record_audio' },
      { step: 2, text_fr: 'Ajoute 2 à 5 photos de famille', action: 'take_photo' },
      { step: 3, text_fr: 'L\'IA crée un film émouvant', action: 'wait' }
    ]
  }
];

// ============================================================
// D) 5 NEW KUAISHOU-STYLE VISUAL TEMPLATES
// Grass Cutout, Neon Glow, Split Screen, Photo Slideshow, Karaoke
// ============================================================

const KUAISHOU_VISUAL_TEMPLATES_RAW: RawTemplate[] = [
  {
    id: 'grass_cutout',
    emoji: '🌿',
    label_fr: 'Détourage Prairie',
    label_ba: 'Bin kↄnↄ',
    description_fr: 'Détourage personne sur fond prairie animé',
    description_ba: 'I yɛrɛ bin kↄnↄ',
    family: 'grand_public',
    collection: 'fierte_beaute',
    inputs: [{ type: 'video', minCount: 1, maxCount: 1, minDurationSec: 3, maxDurationSec: 15 }],
    supportedDurations: ['10s', '15s', '30s'],
    outputRatios: ['9:16'],
    features: { 
      stabilization: true, 
      audioEnhance: true,
      smartCaptions: true
    },
    previewAnimation: 'wave',
    color: 'from-green-500 to-emerald-600',
    voiceInstructions: [
      { step: 1, text_fr: 'Filme-toi debout sur un fond uni', text_ba: 'I yɛrɛ fili', action: 'record_video', durationHint: 8 },
      { step: 2, text_fr: 'L\'IA va te détourer sur une prairie', action: 'wait' }
    ]
  },
  {
    id: 'neon_glow',
    emoji: '💜',
    label_fr: 'Néon Glow',
    label_ba: 'Finyɛ',
    description_fr: 'Effet néon lumineux avec beat sync',
    description_ba: 'Finyɛ kaa dↄn',
    family: 'grand_public',
    collection: 'fierte_beaute',
    inputs: [{ type: 'video', minCount: 1, maxCount: 1, minDurationSec: 5, maxDurationSec: 20 }],
    supportedDurations: ['10s', '15s', '30s'],
    outputRatios: ['9:16', '1:1'],
    features: { 
      beatSync: true, 
      styleTransfer: true,
      audioEnhance: true
    },
    previewAnimation: 'glow',
    color: 'from-purple-600 to-pink-500',
    voiceInstructions: [
      { step: 1, text_fr: 'Filme-toi en train de danser ou bouger', action: 'record_video', durationHint: 10 },
      { step: 2, text_fr: 'L\'IA ajoute des effets néon sur le rythme', action: 'wait' }
    ]
  },
  {
    id: 'split_screen_duo',
    emoji: '👯',
    label_fr: 'Split Screen Duo',
    label_ba: 'Fila fila',
    description_fr: 'Écran divisé pour duos et réactions',
    description_ba: 'Fila fila yeli',
    family: 'grand_public',
    collection: null,
    inputs: [
      { type: 'video', minCount: 2, maxCount: 2, minDurationSec: 5, maxDurationSec: 30 }
    ],
    supportedDurations: ['15s', '30s', '45s'],
    outputRatios: ['9:16'],
    features: { 
      stabilization: true, 
      audioEnhance: true,
      autoEditing: true
    },
    previewAnimation: 'slide',
    color: 'from-cyan-500 to-blue-500',
    voiceInstructions: [
      { step: 1, text_fr: 'Ajoute la première vidéo (à gauche)', action: 'record_video' },
      { step: 2, text_fr: 'Ajoute la seconde vidéo (à droite)', action: 'record_video' },
      { step: 3, text_fr: 'L\'IA synchronise les deux vidéos', action: 'wait' }
    ]
  },
  {
    id: 'photo_slideshow',
    emoji: '🖼️',
    label_fr: 'Diaporama Photo',
    label_ba: 'Fↄtↄ bɛɛ',
    description_fr: 'Diaporama animé avec transitions et musique',
    description_ba: 'Fↄtↄ bɛɛ yeli',
    family: 'grand_public',
    collection: null,
    inputs: [{ type: 'photo', minCount: 3, maxCount: 10 }],
    supportedDurations: ['15s', '30s', '45s', '60s'],
    outputRatios: ['9:16', '1:1'],
    features: { 
      photoAnimation: true, 
      beatSync: true,
      autoEditing: true
    },
    previewAnimation: 'pulse',
    color: 'from-orange-500 to-amber-500',
    voiceInstructions: [
      { step: 1, text_fr: 'Ajoute 3 à 10 photos', text_ba: 'Fↄtↄ saba fo tan', action: 'take_photo' },
      { step: 2, text_fr: 'L\'IA crée un diaporama animé', action: 'wait' }
    ]
  },
  {
    id: 'karaoke_mode',
    emoji: '🎤',
    label_fr: 'Mode Karaoké',
    label_ba: 'Dↄnkili yeli',
    description_fr: 'Sous-titres synchronisés mot par mot',
    description_ba: 'Kuma kelen kelen',
    family: 'vocal_radio',
    collection: 'voix_village',
    inputs: [
      { type: 'audio', minCount: 1, maxCount: 1, minDurationSec: 10, maxDurationSec: 120 }
    ],
    supportedDurations: ['30s', '45s', '60s', '90s'],
    outputRatios: ['9:16'],
    features: { 
      smartCaptions: true, 
      audioEnhance: true,
      translation: true
    },
    previewAnimation: 'wave',
    color: 'from-rose-500 to-red-500',
    voiceInstructions: [
      { step: 1, text_fr: 'Enregistre ta chanson ou poème', text_ba: 'I ka dↄnkili da', action: 'record_audio' },
      { step: 2, text_fr: 'L\'IA synchronise les paroles en karaoké', action: 'wait' }
    ]
  }
];

// ============================================================
// EXPORT: Tous les templates combinés (engine injected here)
// ============================================================

const ALL_RAW_TEMPLATES: RawTemplate[] = [
  ...GRAND_PUBLIC_TEMPLATES_RAW,
  ...EDUCATIF_CULTURE_TEMPLATES_RAW,
  ...VOCAL_RADIO_TEMPLATES_RAW,
  ...KUAISHOU_VISUAL_TEMPLATES_RAW
];

export const ADVANCED_TEMPLATES: AdvancedTemplate[] = ALL_RAW_TEMPLATES.map(t => ({
  ...t,
  engine: buildKSEngine(t)
}));

// ============================================================
// COLLECTIONS Super-Pack
// ============================================================

export interface TemplateCollection {
  id: string;
  emoji: string;
  name_fr: string;
  name_ba?: string;
  description_fr: string;
  color: string;
  templateIds: string[];
}

export const TEMPLATE_COLLECTIONS: TemplateCollection[] = [
  {
    id: 'voix_village',
    emoji: '📻',
    name_fr: 'Voix du Village',
    name_ba: 'Dugu kan',
    description_fr: 'Radio, Annonces, Débats, Traduction',
    color: 'from-red-500 to-orange-500',
    templateIds: ['radio_village', 'annonce_communautaire', 'debat_express', 'traduction_voix']
  },
  {
    id: 'patrimoine_vivant',
    emoji: '🏛️',
    name_fr: 'Patrimoine Vivant',
    name_ba: 'Kↄrↄ yeli',
    description_fr: 'Anciens, Archives, Mémoire, Contes',
    color: 'from-amber-600 to-yellow-500',
    templateIds: ['parole_ancien', 'avant_apres_village', 'doc_express_patrimoine', 'mini_doc_village', 'conte_du_soir']
  },
  {
    id: 'fierte_beaute',
    emoji: '🌄',
    name_fr: 'Fierté & Beauté',
    name_ba: 'Cɛmancɛ',
    description_fr: 'Paysages, Métiers, Style, Magie',
    color: 'from-sky-500 to-blue-600',
    templateIds: ['carte_postale_beaute', 'metiers_terroir', 'beat_sync_ultra', 'style_transfer_local', 'magic_transform']
  }
];

// ============================================================
// HELPER FUNCTIONS (unchanged signatures)
// ============================================================

export const getTemplateById = (id: string): AdvancedTemplate | undefined => {
  if (id === 'none') return NEUTRAL_TEMPLATE;
  return ADVANCED_TEMPLATES.find(t => t.id === id);
};

export const getTemplatesByFamily = (family: TemplateFamily): AdvancedTemplate[] => {
  return ADVANCED_TEMPLATES.filter(t => t.family === family);
};

export const getTemplatesByCollection = (collectionId: string): AdvancedTemplate[] => {
  const collection = TEMPLATE_COLLECTIONS.find(c => c.id === collectionId);
  if (!collection) return [];
  return collection.templateIds
    .map(id => getTemplateById(id))
    .filter((t): t is AdvancedTemplate => t !== undefined);
};

export const getCollectionById = (id: string): TemplateCollection | undefined => {
  return TEMPLATE_COLLECTIONS.find(c => c.id === id);
};

/* =========================================================================================
   ✅ Optional exports (safe): to retrieve the Kuaishou manifest for a template + duration
   -----------------------------------------------------------------------------------------
   Useful when your editor wants to show Kuaishou-like card: "1 Picture/Video", "Time 00:08"
========================================================================================= */
export const getKSEManifest = (templateId: string, duration?: TemplateDuration): KuaishouTemplateManifest | undefined => {
  const t = getTemplateById(templateId);
  if (!t || !t.engine || t.engine.kind !== 'KSE') return undefined;
  const d = duration ?? t.engine.defaultDuration;
  return t.engine.variants[d];
};
