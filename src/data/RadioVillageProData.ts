/**
 * RadioVillageProData.ts
 * Configuration du template Radio Village Pro pour le système Kuaishou
 */

import { KuaishouTemplateConfig } from '../types/KuaishouTypes';

// ==========================================
// TEMPLATE: RADIO VILLAGE PRO
// ==========================================

export const radioVillagePro: KuaishouTemplateConfig = {
  id: 'radio_village_pro',
  name: 'Radio Village Pro 📻',
  description: 'Template audio-first premium - Transforme ta voix en vidéo captivante',
  category: 'story',
  contentType: 'video',
  difficulty: 'beginner',

  video: {
    duration: 60,
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
        text: 'Enregistre ou uploade ton message vocal (30-60 secondes)',
        countdown: false,
        beatIndicator: false,
        visualCues: []
      },
      effects: ['stabilization', 'color_grading']
    }
  ],

  music: {
    trackUrl: '',
    title: '',
    bpm: 0,
    beatMarkers: [],
    autoSync: false,
    cutOnBeat: false,
    volume: 0,
    fadeIn: 0,
    fadeOut: 0
  },

  autoEffects: {
    beauty: { enabled: false, intensity: 0, skinSmooth: false, eyeEnhance: false, faceSlim: 0 },
    stabilization: { enabled: false, strength: 0, method: 'optical_flow', cropFactor: 1 },
    colorGrading: { enabled: true, lut: 'warm_glow', intensity: 0.5, temperature: 10, saturation: 1.1, contrast: 1.05, brightness: 0 },
    sharpness: { enabled: false, amount: 0, radius: 0, threshold: 0 },
    hdrLike: { enabled: false, highlights: 0, shadows: 0, midtones: 0, strength: 0 }
  },

  smartCuts: { enabled: false, algorithm: 'beat_motion_hybrid', minSegmentDuration: 30, maxSegmentDuration: 60, rules: [] },
  transitions: [],
  overlays: { stickers: [], text: [] },
  hooks: { enabled: false, autoDetect: false, suggestions: [] },
  hashtags: { autoGenerate: true, trending: ['#RadioVillage', '#Voix', '#Patrimoine'], aiSuggested: 'AUTO_DETECT', maxHashtags: 5 },

  metadata: {
    createdAt: '2026-01-09T00:00:00Z',
    updatedAt: '2026-01-09T00:00:00Z',
    author: 'TAM-TAM Team',
    version: '2.0.0',
    popularity: 92,
    usageCount: 8500,
    rating: 4.9,
    tags: ['radio', 'audio', 'waveform', 'village', 'voice', 'premium'],
    thumbnail: '/templates/thumbnails/radio_village_pro.jpg',
    previewVideo: '/templates/previews/radio_village_pro.mp4'
  },

  kuaishouEffects: {
    sparkles: { enabled: false, count: 0, colors: [], sizeRange: [0, 0], twinkleSpeed: 0 },
    horseSilhouette: { enabled: false, animation: 'static', color: '', startTime: 0, endTime: 0 },
    calligraphy: { enabled: false, texts: [], font: '', color: '' },
    warmGlow: { enabled: true, intensity: 0.3, color: 'rgba(255,200,100,0.2)' },
    beatGlow: { enabled: false, syncToBeat: false, bpm: 0, color: '' },
    progressBar: { enabled: true, color: '#FFD700', glowColor: 'rgba(255,215,0,0.4)', height: 4 }
  }
};

export default radioVillagePro;
