/**
 * TAM-TAM Template: Chorale Collective v3.0
 * Group singing/choir format - Full Envato assets
 * REAL ASSETS ONLY - No procedural fallbacks
 */

import { Template } from '../types';

export const choraleCollectiveTemplate: Template = {
  id: 'chorale-collective',
  name: 'Chorale Collective',
  nameBa: 'Wùúsú Yɛrenu',
  category: 'music',
  description: 'Chants collectifs et chorales',
  descriptionBa: 'Wùúsú tɔmbu kpuro',
  thumbnail: '/assets/templates/chorale-collective-thumb.jpg',
  duration: 90,
  isPremium: false,
  isNew: true,
  
  effects: [
    // === LENS FLARES ===
    {
      id: 'music-notes-flare',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-130.png',
      trigger: 'beat',
      config: { x: 0.3, y: 0.3, scale: 0.8, opacity: 0.5, blendMode: 'screen', beatThreshold: 0.4 }
    },
    {
      id: 'choir-frame-flare',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-050.png',
      trigger: 'always',
      config: { x: 0.5, y: 0.2, scale: 1.0, opacity: 0.4, blendMode: 'screen' }
    },
    {
      id: 'harmony-glow',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-060.png',
      trigger: 'beat',
      config: { x: 0.7, y: 0.4, scale: 1.2, opacity: 0.3, blendMode: 'screen', beatThreshold: 0.6 }
    },

    // === LIGHT LEAKS - Warm choir lighting ===
    {
      id: 'choir-leak-1',
      type: 'light-leak',
      assetId: 'light-leak:leak-020.webm',
      trigger: 'beat',
      config: { x: 0.5, y: 0.5, scale: 1.5, opacity: 0.35, blendMode: 'screen', beatThreshold: 0.5 }
    },
    {
      id: 'choir-leak-2',
      type: 'light-leak',
      assetId: 'light-leak:leak-010.mp4',
      trigger: 'always',
      config: { x: 0.3, y: 0.7, scale: 1.2, opacity: 0.25, blendMode: 'screen' }
    },

    // === PARTICLES - Musical atmosphere ===
    {
      id: 'music-particles',
      type: 'particles',
      assetId: 'particles:particle-025.webm',
      trigger: 'beat',
      config: { x: 0.5, y: 0.5, scale: 1.8, opacity: 0.4, blendMode: 'screen', beatThreshold: 0.6 }
    },

    // === TEXT ===
    {
      id: 'lyrics-display',
      type: 'text',
      assetId: 'text:lyrics',
      trigger: 'always',
      config: { x: 0.5, y: 0.9, text: '♪ ♫', font: 'Dancing Script', color: '#FFD700', align: 'center' }
    }
  ],
  
  audio: {
    volume: 1.0,
    beatDetection: true
  },
  
  metadata: {
    author: 'TAM-TAM Team',
    version: '3.0.0',
    tags: ['choir', 'singing', 'collective', 'music']
  }
};
