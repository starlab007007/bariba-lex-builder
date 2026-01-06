// ============================================================
// ADVANCED TEMPLATE DATA - 24 Templates IA TAMTAM
// Organisés en 3 familles + 3 collections Super-Pack
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

export interface AdvancedTemplate {
  id: string;
  emoji: string;
  label_fr: string;
  label_ba?: string;
  description_fr: string;
  description_ba?: string;
  family: TemplateFamily;
  collection: 'voix_village' | 'patrimoine_vivant' | 'fierte_beaute' | null;
  inputs: TemplateInput[];
  supportedDurations: TemplateDuration[];
  outputRatios: OutputRatio[];
  features: AIFeatures;
  defaultMusic?: string;
  voiceInstructions: VoiceInstruction[];
  previewAnimation?: 'pulse' | 'wave' | 'glow' | 'slide';
  color: string; // Tailwind color class
}

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
  voiceInstructions: []
};

// ============================================================
// A) 8 Templates Grand Public
// ============================================================

const GRAND_PUBLIC_TEMPLATES: AdvancedTemplate[] = [
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
    emoji: '📹',
    label_fr: 'One-Take Pro',
    label_ba: 'Gba kelen',
    description_fr: 'Stabilisation et recadrage intelligent',
    description_ba: 'Gba kelen kaa sↄ',
    family: 'grand_public',
    collection: null,
    inputs: [{ type: 'video', minCount: 1, maxCount: 1 }],
    supportedDurations: ['15s', '30s', '60s'],
    outputRatios: ['9:16', '1:1', '16:9'],
    features: { stabilization: true, autoEditing: true },
    previewAnimation: 'slide',
    color: 'from-blue-500 to-cyan-500',
    voiceInstructions: [
      { step: 1, text_fr: 'Filme en marchant, même si ça tremble', action: 'record_video' },
      { step: 2, text_fr: 'L\'IA va stabiliser et recadrer', action: 'wait' }
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
    inputs: [
      { type: 'photo', minCount: 2, maxCount: 2 }
    ],
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
// B) 10 Templates Éducatif / Culture / Mémoire
// ============================================================

const EDUCATIF_CULTURE_TEMPLATES: AdvancedTemplate[] = [
  {
    id: 'mini_doc_village',
    emoji: '🏘️',
    label_fr: 'Mini-Doc Village',
    label_ba: 'Dugu gba',
    description_fr: 'Transforme en mini documentaire',
    description_ba: 'Dugu gba yeli',
    family: 'educatif_culture',
    collection: 'patrimoine_vivant',
    inputs: [
      { type: 'video', minCount: 1, maxCount: 1 },
      { type: 'audio', minCount: 0, maxCount: 1, optional: true }
    ],
    supportedDurations: ['30s', '45s', '60s', '90s'],
    outputRatios: ['9:16', '16:9'],
    features: { narrativeStructure: true, smartCaptions: true, iconInjection: true, audioEnhance: true },
    defaultMusic: 'traditional_soft',
    previewAnimation: 'glow',
    color: 'from-amber-600 to-yellow-500',
    voiceInstructions: [
      { step: 1, text_fr: 'Filme ton village ou ton sujet', action: 'record_video' },
      { step: 2, text_fr: 'Ajoute un commentaire vocal si tu veux', action: 'record_audio' },
      { step: 3, text_fr: 'L\'IA crée intro, narration et outro', action: 'wait' }
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
    color: 'from-sepia to-amber-600',
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
// C) 6 Templates Vocal / Radio / Communautaire
// ============================================================

const VOCAL_RADIO_TEMPLATES: AdvancedTemplate[] = [
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
    inputs: [
      { type: 'audio', minCount: 2, maxCount: 2 }
    ],
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
    inputs: [
      { type: 'audio', minCount: 1, maxCount: 5 }
    ],
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
// EXPORT: Tous les templates combinés
// ============================================================

export const ADVANCED_TEMPLATES: AdvancedTemplate[] = [
  ...GRAND_PUBLIC_TEMPLATES,
  ...EDUCATIF_CULTURE_TEMPLATES,
  ...VOCAL_RADIO_TEMPLATES
];

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
// HELPER FUNCTIONS
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

export const durationToSeconds = (duration: TemplateDuration): number => {
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
};

export const formatDuration = (duration: TemplateDuration): string => {
  const seconds = durationToSeconds(duration);
  if (seconds >= 60) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${mins}min`;
  }
  return `${seconds}s`;
};
