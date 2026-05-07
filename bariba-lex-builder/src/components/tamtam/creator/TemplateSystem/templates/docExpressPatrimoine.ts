/**
 * TAM-TAM Template: Doc Express Patrimoine v3.0
 * Quick heritage documentation - Full Envato assets
 * REAL ASSETS ONLY - No procedural fallbacks
 */

import { Template } from '../types';

export const docExpressPatrimoineTemplate: Template = {
  id: 'doc-express-patrimoine',
  name: 'Doc Express Patrimoine',
  nameBa: 'Doc Kpɑɑru Kíákíá',
  category: 'education',
  description: 'Documentation rapide du patrimoine culturel',
  descriptionBa: 'Kpɑɑru kɔ̃siru kíákíá',
  thumbnail: '/assets/templates/doc-express-patrimoine-thumb.jpg',
  duration: 30,
  isPremium: false,
  isNew: true,
  
  effects: [
    // === LENS FLARES ===
    {
      id: 'heritage-flare',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-030.png',
      trigger: 'time',
      config: { x: 0.9, y: 0.1, scale: 0.5, opacity: 0.9, blendMode: 'screen', timeRange: [0, 30] }
    },
    {
      id: 'golden-flare',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-055.png',
      trigger: 'always',
      config: { x: 0.5, y: 0.3, scale: 0.6, opacity: 0.15, blendMode: 'screen' }
    },

    // === LIGHT LEAKS - Warm heritage tones ===
    {
      id: 'heritage-leak',
      type: 'light-leak',
      assetId: 'light-leak:leak-012.mp4',
      trigger: 'always',
      config: { x: 0.5, y: 0.5, scale: 1.4, opacity: 0.2, blendMode: 'screen' }
    },

    // === TEXTURES - Documentary film grain ===
    {
      id: 'doc-texture',
      type: 'texture',
      assetId: 'textures:texture-040.mp4',
      trigger: 'always',
      config: { x: 0.5, y: 0.5, scale: 1.0, opacity: 0.12, blendMode: 'overlay' }
    },

    // === PARTICLES - Dust motes for authenticity ===
    {
      id: 'dust-particles',
      type: 'particles',
      assetId: 'particles:particle-008.webm',
      trigger: 'always',
      config: { x: 0.5, y: 0.5, scale: 1.3, opacity: 0.2, blendMode: 'screen' }
    },

    // === TEXT ===
    {
      id: 'info-bar',
      type: 'text',
      assetId: 'text:heritage-info',
      trigger: 'always',
      config: { x: 0.5, y: 0.95, text: '🏛️ Patrimoine Culturel', font: 'Roboto', color: '#FFFFFF', align: 'center', background: 'rgba(0,0,0,0.6)' }
    }
  ],
  
  audio: {
    volume: 0.8,
    beatDetection: false
  },
  
  metadata: {
    author: 'TAM-TAM Team',
    version: '3.0.0',
    tags: ['heritage', 'culture', 'documentation', 'quick']
  }
};
