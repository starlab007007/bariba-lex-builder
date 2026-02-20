/**
 * TAM-TAM Template: Conte du Soir v3.0
 * Evening storytelling for children - Full Envato assets
 * REAL ASSETS ONLY - No procedural fallbacks
 */

import { Template } from '../types';

export const conteDuSoirTemplate: Template = {
  id: 'conte-du-soir',
  name: 'Conte du Soir',
  nameBa: 'Táárù Yàkiru',
  category: 'storytelling',
  description: 'Contes traditionnels pour enfants',
  descriptionBa: 'Táárù fún bìínu',
  thumbnail: '/assets/templates/conte-du-soir-thumb.jpg',
  duration: 120,
  isPremium: false,
  isNew: true,
  
  effects: [
    // === LENS FLARES - Magical night atmosphere ===
    {
      id: 'starry-flare',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-120.png',
      trigger: 'always',
      config: { x: 0.3, y: 0.2, scale: 0.5, opacity: 0.4, blendMode: 'screen' }
    },
    {
      id: 'moon-glow',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-025.png',
      trigger: 'always',
      config: { x: 0.85, y: 0.15, scale: 0.8, opacity: 0.5, blendMode: 'screen' }
    },
    {
      id: 'warm-ambient',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-050.png',
      trigger: 'always',
      config: { x: 0.5, y: 0.8, scale: 1.0, opacity: 0.3, blendMode: 'screen' }
    },

    // === LIGHT LEAKS - Firelight ambiance ===
    {
      id: 'firelight-leak',
      type: 'light-leak',
      assetId: 'light-leak:leak-008.mp4',
      trigger: 'always',
      config: { x: 0.5, y: 0.7, scale: 1.3, opacity: 0.2, blendMode: 'screen' }
    },

    // === PARTICLES - Magical fireflies ===
    {
      id: 'firefly-particles',
      type: 'particles',
      assetId: 'particles:particle-005.webm',
      trigger: 'always',
      config: { x: 0.5, y: 0.5, scale: 1.5, opacity: 0.3, blendMode: 'screen' }
    },

    // === TEXTURES - Night sky texture ===
    {
      id: 'night-texture',
      type: 'texture',
      assetId: 'textures:texture-030.mp4',
      trigger: 'always',
      config: { x: 0.5, y: 0.3, scale: 1.0, opacity: 0.1, blendMode: 'screen' }
    },

    // === TEXT ===
    {
      id: 'story-title',
      type: 'text',
      assetId: 'text:tale-title',
      trigger: 'time',
      config: { x: 0.5, y: 0.1, text: '🌙 Il était une fois...', font: 'Playfair Display', color: '#FFD700', align: 'center', timeRange: [0, 4] }
    }
  ],
  
  audio: {
    volume: 0.7,
    beatDetection: false
  },
  
  metadata: {
    author: 'TAM-TAM Team',
    version: '3.0.0',
    tags: ['tale', 'children', 'night', 'storytelling']
  }
};
