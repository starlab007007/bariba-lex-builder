/**
 * TAM-TAM Template: Histoire en Images v3.0
 * Photo slideshow storytelling - Full Envato assets
 * REAL ASSETS ONLY - No procedural fallbacks
 */

import { Template } from '../types';

export const histoireEnImagesTemplate: Template = {
  id: 'histoire-en-images',
  name: 'Histoire en Images',
  nameBa: 'Gɛsɛru photo sɔɔ',
  category: 'storytelling',
  description: 'Diaporama photo avec narration vocale',
  descriptionBa: 'Photo kɑ nɔɔ gɛsɛru',
  thumbnail: '/assets/templates/histoire-en-images-thumb.jpg',
  duration: 60,
  isPremium: false,
  isNew: true,
  
  effects: [
    // === LENS FLARES ===
    {
      id: 'photo-frame-flare',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-320.png',
      trigger: 'always',
      config: { x: 0.1, y: 0.1, scale: 0.4, opacity: 0.6, blendMode: 'screen' }
    },
    {
      id: 'ken-burns-flare',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-310.png',
      trigger: 'time',
      config: { x: 0.5, y: 0.5, scale: 1.5, opacity: 0.4, blendMode: 'screen', timeRange: [0, 5] }
    },
    {
      id: 'soft-vignette-flare',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-055.png',
      trigger: 'always',
      config: { x: 0.5, y: 0.5, scale: 1.8, opacity: 0.25, blendMode: 'multiply' }
    },

    // === TRANSITIONS - Photo slide transitions ===
    {
      id: 'slide-transition',
      type: 'transition',
      assetId: 'transitions:transition-002.mp4',
      trigger: 'time',
      config: { x: 0.5, y: 0.5, scale: 1.0, opacity: 0.7, blendMode: 'screen', timeRange: [5, 6], duration: 1 }
    },

    // === LIGHT LEAKS - Nostalgic warmth ===
    {
      id: 'memory-leak',
      type: 'light-leak',
      assetId: 'light-leak:leak-015.mp4',
      trigger: 'always',
      config: { x: 0.7, y: 0.3, scale: 1.2, opacity: 0.25, blendMode: 'screen' }
    },

    // === TEXTURES - Vintage photo feel ===
    {
      id: 'vintage-texture',
      type: 'texture',
      assetId: 'textures:texture-060.mp4',
      trigger: 'always',
      config: { x: 0.5, y: 0.5, scale: 1.0, opacity: 0.1, blendMode: 'overlay' }
    },

    // === PARTICLES - Light dust ===
    {
      id: 'dust-particles',
      type: 'particles',
      assetId: 'particles:particle-010.webm',
      trigger: 'always',
      config: { x: 0.5, y: 0.5, scale: 1.4, opacity: 0.15, blendMode: 'screen' }
    },

    // === TEXT ===
    {
      id: 'caption-area',
      type: 'text',
      assetId: 'text:caption',
      trigger: 'always',
      config: { x: 0.5, y: 0.9, text: '', font: 'Lato', color: '#FFFFFF', align: 'center', shadow: true }
    }
  ],
  
  audio: {
    volume: 0.7,
    beatDetection: false
  },
  
  metadata: {
    author: 'TAM-TAM Team',
    version: '3.0.0',
    tags: ['slideshow', 'photos', 'narration', 'story']
  }
};
