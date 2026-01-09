/**
 * RadioVillageProData.ts
 * Configuration enrichie du template Radio Village Pro v2.0
 * Avec support bilingue FR/Bariba complet
 */

import { KuaishouTemplateConfig } from '@/types/KuaishouTypes';

// ==========================================
// TEMPLATE CONFIG KUAISHOU
// ==========================================

export const radioVillagePro: KuaishouTemplateConfig = {
  id: 'radio_village_pro',
  name: 'Radio Village Pro 🎙️',
  description: 'Template audio-first premium - Transforme ton message audio en vidéo captivante',
  category: 'story',
  contentType: 'video',
  difficulty: 'beginner',

  video: {
    duration: 45,
    format: '9:16',
    targetSize: '20-50MB',
    resolution: { width: 1080, height: 1920 },
    frameRate: 30,
    bitrate: 5000000
  },

  segments: [
    {
      id: 'audio_main',
      type: 'user_capture',
      start: 0,
      duration: 60,
      minDuration: 30,
      maxDuration: 60,
      editable: true,
      guidance: {
        text: 'Enregistre ton message vocal (30-60s)',
        countdown: true,
        beatIndicator: false,
        visualCues: []
      },
      effects: ['ken_burns', 'color_grading', 'stabilization']
    }
  ],

  music: {
    trackUrl: '',
    title: 'Audio personnalisé',
    bpm: 0,
    beatMarkers: [],
    autoSync: false,
    cutOnBeat: false,
    volume: 1.0,
    fadeIn: 0,
    fadeOut: 0
  },

  autoEffects: {
    beauty: { enabled: false, intensity: 0, skinSmooth: false, eyeEnhance: false, faceSlim: 0 },
    stabilization: { enabled: false, strength: 0, method: 'optical_flow', cropFactor: 1 },
    colorGrading: {
      enabled: true,
      lut: 'warm_glow',
      intensity: 0.6,
      temperature: 10,
      saturation: 1.1,
      contrast: 1.05,
      brightness: 0
    },
    sharpness: { enabled: false, amount: 0, radius: 0, threshold: 0 },
    hdrLike: { enabled: false, highlights: 0, shadows: 0, midtones: 0, strength: 0 }
  },

  smartCuts: { enabled: false, algorithm: 'beat_motion_hybrid', minSegmentDuration: 30, maxSegmentDuration: 60, rules: [] },
  transitions: [],
  overlays: { stickers: [], text: [] },
  hooks: { enabled: false, autoDetect: false, suggestions: [] },
  hashtags: { 
    autoGenerate: true, 
    trending: ['#RadioVillage', '#HistoireOrale', '#CultureAfricaine', '#Tradition', '#SagesseAncienne', '#TAMTAMVoice'], 
    aiSuggested: 'AUTO_DETECT', 
    maxHashtags: 5 
  },

  metadata: {
    createdAt: '2026-01-09T00:00:00Z',
    updatedAt: '2026-01-09T00:00:00Z',
    author: 'TAM-TAM Team',
    version: '2.0.0',
    popularity: 95,
    usageCount: 0,
    rating: 5.0,
    tags: ['audio', 'voix', 'oral', 'tradition', 'culture', 'communauté', 'bariba', 'histoire', 'radio'],
    thumbnail: '/templates/thumbnails/radio_village_pro.jpg',
    previewVideo: '/templates/previews/radio_village_pro.mp4'
  },

  kuaishouEffects: {
    sparkles: { enabled: true, count: 30, colors: ['#FFD700', '#FFA500', '#FF6347'], sizeRange: [2, 6], twinkleSpeed: 1 },
    horseSilhouette: { enabled: false, animation: 'static', color: '', startTime: 0, endTime: 0 },
    calligraphy: { enabled: false, texts: [], font: '', color: '' },
    warmGlow: { enabled: true, intensity: 0.4, color: 'rgba(255,200,100,0.25)' },
    beatGlow: { enabled: false, syncToBeat: false, bpm: 0, color: '' },
    progressBar: { enabled: true, color: '#FFD700', glowColor: 'rgba(255,215,0,0.5)', height: 4 }
  }
};

// ==========================================
// STYLES PRESETS BILINGUES
// ==========================================

export interface RadioVillageStyle {
  id: string;
  name: string;
  nameBariba: string;
  description: string;
  descriptionBariba: string;
  icon: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  gradient: string;
  filters: {
    temperature?: number;
    tint?: number;
    saturation?: number;
    contrast?: number;
    sepia?: number;
    vibrance?: number;
  };
}

export const radioVillageStyles: Record<string, RadioVillageStyle> = {
  sagesse: {
    id: 'sagesse',
    name: 'Sagesse',
    nameBariba: 'Sɔ́ɔ́ kɔ́ɔ̀',
    description: 'Doré et chaleureux',
    descriptionBariba: 'Wúrú ń nɪ̀ fúú',
    icon: '💡',
    colors: { primary: '#FFD700', secondary: '#FF8C00', accent: '#FFA500' },
    gradient: 'from-amber-400 via-orange-500 to-amber-600',
    filters: { temperature: 15, tint: 5, saturation: 1.1, contrast: 1.05 }
  },
  histoire: {
    id: 'histoire',
    name: 'Histoire',
    nameBariba: 'Tíísɔ́ɔ́',
    description: 'Sépia et vintage',
    descriptionBariba: 'Kɔ́ɔ̀ bíkúú',
    icon: '📖',
    colors: { primary: '#8B7355', secondary: '#D2B48C', accent: '#BC8F8F' },
    gradient: 'from-amber-700 via-amber-600 to-yellow-700',
    filters: { temperature: 10, tint: -5, saturation: 0.8, contrast: 1.1, sepia: 0.4 }
  },
  actualite: {
    id: 'actualite',
    name: 'Actualité',
    nameBariba: 'Tɪ̀ɪ̀wáá yɛ̀ɛ̀',
    description: 'Moderne et clean',
    descriptionBariba: 'Yɛ̀ɛ̀ ń nɪ̀ pɛ́ɛ́',
    icon: '📢',
    colors: { primary: '#2196F3', secondary: '#00BCD4', accent: '#03A9F4' },
    gradient: 'from-blue-500 via-cyan-500 to-blue-600',
    filters: { temperature: 0, tint: 0, saturation: 1.0, contrast: 1.0 }
  },
  celebration: {
    id: 'celebration',
    name: 'Célébration',
    nameBariba: 'Sɪ́rɪ́kɪ́',
    description: 'Coloré et festif',
    descriptionBariba: 'Kɔ́ɔ̀kɔ́ɔ̀ ń nɪ̀ sɪ́rɪ́',
    icon: '🎉',
    colors: { primary: '#FF4081', secondary: '#9C27B0', accent: '#FFEB3B' },
    gradient: 'from-pink-500 via-purple-500 to-yellow-400',
    filters: { temperature: 5, tint: 10, saturation: 1.3, contrast: 1.1, vibrance: 0.2 }
  }
};

// ==========================================
// EMOJI KEYWORDS MAPPING
// ==========================================

export interface EmojiKeyword {
  emoji: string;
  keywords: string[];
  keywordsBariba?: string[];
}

export const emojiKeywords: Record<string, EmojiKeyword> = {
  sagesse: { emoji: '💡', keywords: ['sagesse', 'sage', 'conseil', 'expérience', 'aîné'], keywordsBariba: ['sɔ́ɔ́', 'kɔ́ɔ̀'] },
  tradition: { emoji: '🏛️', keywords: ['tradition', 'coutume', 'ancien', 'ancêtre', 'héritage'], keywordsBariba: ['kɔ́ɔ̀bíkúú'] },
  famille: { emoji: '❤️', keywords: ['famille', 'enfant', 'parent', 'frère', 'sœur', 'mère', 'père'], keywordsBariba: ['dèérú', 'bàá', 'nàá'] },
  travail: { emoji: '💪', keywords: ['travail', 'effort', 'courage', 'force', 'dur'], keywordsBariba: ['bàárà'] },
  village: { emoji: '🏘️', keywords: ['village', 'communauté', 'ensemble', 'quartier'], keywordsBariba: ['kɔ́ɔ̀gbɛ̀'] },
  celebration: { emoji: '🎉', keywords: ['fête', 'joie', 'célébration', 'bonheur', 'mariage'], keywordsBariba: ['sɪ́rɪ́kɪ́'] },
  paix: { emoji: '☮️', keywords: ['paix', 'harmonie', 'calme', 'tranquille', 'serein'], keywordsBariba: ['làáfíyà'] },
  dieu: { emoji: '🙏', keywords: ['dieu', 'allah', 'prière', 'bénédiction', 'merci'], keywordsBariba: ['àlláà', 'yàmbà'] },
  nature: { emoji: '🌿', keywords: ['terre', 'pluie', 'soleil', 'récolte', 'champ', 'arbre'], keywordsBariba: ['dùgú', 'sàà'] },
  education: { emoji: '📚', keywords: ['école', 'apprendre', 'étudier', 'leçon', 'savoir'], keywordsBariba: ['kàlàn'] }
};

// ==========================================
// PROCESSING STEPS (BILINGUE)
// ==========================================

export interface ProcessingStep {
  progress: number;
  messageFr: string;
  messageBa: string;
}

export const processingSteps: ProcessingStep[] = [
  { progress: 10, messageFr: 'Analyse de l\'audio...', messageBa: 'Sɔ́ɔ́ kɛ̀ tíí...' },
  { progress: 25, messageFr: 'Génération des sous-titres...', messageBa: 'Sɛ́bɛ́ kɛ̀ wáá...' },
  { progress: 40, messageFr: 'Création de la visualisation...', messageBa: 'Pɪ̀ɪ̀sɪ́ kɛ̀ tɔ́...' },
  { progress: 55, messageFr: 'Traduction en bariba...', messageBa: 'Báàtɔ́nùm kɛ̀ wáá...' },
  { progress: 70, messageFr: 'Application des effets...', messageBa: 'Kɛ̀ tɔ́ɔ́ kúú...' },
  { progress: 85, messageFr: 'Rendu final...', messageBa: 'Kɛ̀ bánbán...' },
  { progress: 100, messageFr: 'Terminé!', messageBa: 'Á bán!' }
];

// ==========================================
// UI LABELS BILINGUES
// ==========================================

export const radioVillageLabels = {
  fr: {
    title: 'Radio Village Pro',
    subtitle: 'Transforme ton message audio en vidéo captivante',
    recordMessage: 'Enregistre ton message',
    uploadAudio: 'Uploader un fichier audio',
    duration: 'Durée',
    addPhotos: 'Ajoute des photos',
    optional: 'Optionnel',
    portrait: 'Portrait',
    village: 'Village',
    context: 'Contexte',
    chooseStyle: 'Choisis le style visuel',
    generateVideo: 'Générer la vidéo',
    creatingVideo: 'Création de ta vidéo...',
    videoReady: 'Vidéo prête!',
    continue: 'Continuer',
    skip: 'Passer',
    back: 'Retour',
    reRecord: 'Réenregistrer',
    stop: 'Arrêter',
    minimumReached: 'Durée minimum atteinte',
    audioRecorded: 'Audio enregistré!'
  },
  bariba: {
    title: 'Radio Kɔ́ɔ̀gbɛ̀',
    subtitle: 'Kɛ̀ nà sɔ́ɔ́ tíí kúú wáá ń nɪ̀ kɛ̀ video kúú ń pɪ̀ɪ̀sɪ́',
    recordMessage: 'Kɛ̀ tíí sɔ́ɔ́',
    uploadAudio: 'Sɔ́ɔ́ file kɛ̀ wáá',
    duration: 'Dùùrée',
    addPhotos: 'Wárɪ́ kɛ̀ wáá',
    optional: 'Kɛ̀ tɔ́ nɪ̀ sɔ́ɔ́',
    portrait: 'Wárɪ́',
    village: 'Kɔ́ɔ̀gbɛ̀',
    context: 'Kɛ̀ tɔ́ɔ́',
    chooseStyle: 'Tɔ́ɔ́ kɛ̀ pɪ̀ɪ̀sɪ́ sɔ́ɔ́',
    generateVideo: 'Video kɛ̀ wáá',
    creatingVideo: 'Video kɛ̀ tɔ́...',
    videoReady: 'Video á bán!',
    continue: 'Kɛ̀ tɔ́',
    skip: 'Kɛ̀ wíírú',
    back: 'Kɛ̀ wíírú',
    reRecord: 'Sɔ́ɔ́ kɛ̀ tíí yɛ̀ɛ̀',
    stop: 'Tíí dɛ́',
    minimumReached: 'Minimum dùùrée bán',
    audioRecorded: 'Sɔ́ɔ́ á bán!'
  }
};

// ==========================================
// HASHTAGS SUGGÉRÉS
// ==========================================

export const radioVillageHashtags = [
  '#RadioVillage',
  '#HistoireOrale',
  '#CultureAfricaine',
  '#Tradition',
  '#SagesseAncienne',
  '#TAMTAMVoice',
  '#Bariba',
  '#PatrimoineOral',
  '#VoixDuVillage',
  '#AnciensDuVillage'
];

export default radioVillagePro;
