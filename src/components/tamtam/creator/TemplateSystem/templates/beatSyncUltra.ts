/**
 * TAM-TAM Template: Beat Sync Ultra
 * High-energy beat-synchronized effects for music videos
 * REAL ASSETS - Using all Envato asset categories
 */

import { Template } from '../types';

export const beatSyncUltraTemplate: Template = {
  id: 'beat-sync-ultra',
  name: 'Beat Sync Ultra',
  nameBa: 'Dùnú Sínsín',
  category: 'music',
  description: 'Effets synchronisés au rythme pour clips musicaux énergiques',
  descriptionBa: 'Dùnú kɔ́ɔ́ dèè kíkó sí orin',
  thumbnail: '/assets/templates/beat-sync-ultra-thumb.jpg',
  duration: 30,
  isPremium: true,
  isNew: true,
  
  effects: [
    // === LENS FLARES (Real PNG assets) ===
    {
      id: 'beat-flare-main',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-001.png',
      trigger: 'beat',
      config: { x: 0.5, y: 0.3, scale: 1.5, opacity: 0.9, blendMode: 'screen', beatThreshold: 0.7 }
    },
    {
      id: 'beat-flare-secondary',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-015.png',
      trigger: 'beat',
      config: { x: 0.7, y: 0.6, scale: 0.8, opacity: 0.6, blendMode: 'screen', beatThreshold: 0.5 }
    },

    // === LIGHT LEAKS (Real WebM/MP4 assets) ===
    {
      id: 'beat-light-leak-1',
      type: 'light-leak',
      assetId: 'light-leak:leak-008.mp4',
      trigger: 'beat',
      config: { x: 0.5, y: 0.5, scale: 1.6, opacity: 0.45, blendMode: 'screen', beatThreshold: 0.6 }
    },
    {
      id: 'beat-light-leak-2',
      type: 'light-leak',
      assetId: 'light-leak:leak-025.webm',
      trigger: 'beat',
      config: { x: 0.3, y: 0.4, scale: 1.3, opacity: 0.35, blendMode: 'screen', beatThreshold: 0.8 }
    },

    // === PARTICLES (Real WebM assets - mapped from leak-XXX.webm) ===
    {
      id: 'beat-particles-burst',
      type: 'particles',
      assetId: 'particles:particle-010.webm',
      trigger: 'beat',
      config: { x: 0.5, y: 0.5, scale: 2.0, opacity: 0.6, blendMode: 'screen', beatThreshold: 0.8 }
    },
    {
      id: 'beat-particles-ambient',
      type: 'particles',
      assetId: 'particles:particle-020.webm',
      trigger: 'always',
      config: { x: 0.5, y: 0.5, scale: 1.4, opacity: 0.25, blendMode: 'screen' }
    },

    // === TEXTURES (Real MP4 video overlays - mapped from video-XXX.mp4) ===
    {
      id: 'beat-texture-overlay',
      type: 'texture',
      assetId: 'textures:texture-050.mp4',
      trigger: 'always',
      config: { x: 0.5, y: 0.5, scale: 1.0, opacity: 0.15, blendMode: 'overlay' }
    },

    // === TRANSITIONS (Real MP4/WebM for scene changes) ===
    {
      id: 'beat-transition-flash',
      type: 'transition',
      assetId: 'transitions:transition-001.mp4',
      trigger: 'beat',
      config: { x: 0.5, y: 0.5, scale: 1.0, opacity: 0.7, blendMode: 'screen', beatThreshold: 0.9, duration: 0.5 }
    }
  ],
  
  audio: {
    beatDetection: true,
    volume: 1.0
  },
  
  metadata: {
    author: 'TAM-TAM Team',
    version: '3.0.0',
    tags: ['music', 'beat-sync', 'energy', 'clip', 'dance', 'particles', 'textures']
  }
};
