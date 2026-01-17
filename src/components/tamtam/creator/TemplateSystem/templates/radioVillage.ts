/**
 * TAM-TAM Template: Radio Village Pro
 * Professional radio broadcast style
 * REAL ASSETS ONLY - No procedural fallbacks
 */

import { Template } from '../types';

export const radioVillageTemplate: Template = {
  id: 'radio-village',
  name: 'Radio Village Pro',
  nameBa: 'Rédíò Abúlé',
  category: 'business',
  description: 'Format radio professionnel avec visuel',
  descriptionBa: 'Ètò rédíò ọjọgbọ́n',
  thumbnail: '/assets/templates/radio-village-thumb.jpg',
  duration: 60,
  isPremium: true,
  isNew: true,
  
  effects: [
    // Radio waves flare - REAL ASSET
    {
      id: 'radio-waves',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-370.png',
      trigger: 'beat',
      config: {
        x: 0.5,
        y: 0.5,
        scale: 1.5,
        opacity: 0.4,
        blendMode: 'screen',
        beatThreshold: 0.4
      }
    },
    // On-air badge - TEXT EFFECT
    {
      id: 'on-air-badge',
      type: 'text',
      assetId: 'text:on-air',
      trigger: 'always',
      config: {
        x: 0.9,
        y: 0.1,
        text: '🔴 ON AIR',
        font: 'Oswald',
        color: '#FF0000',
        align: 'center',
        animation: 'pulse'
      }
    },
    // Waveform visualizer flare - REAL ASSET
    {
      id: 'waveform-visualizer',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-380.png',
      trigger: 'always',
      config: {
        x: 0.5,
        y: 0.8,
        scale: 1.2,
        opacity: 0.5,
        blendMode: 'screen'
      }
    },
    // Radio corner accent - REAL ASSET
    {
      id: 'radio-corner',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-390.png',
      trigger: 'always',
      config: {
        x: 0.1,
        y: 0.9,
        scale: 0.5,
        opacity: 0.35,
        blendMode: 'screen'
      }
    }
  ],
  
  audio: {
    volume: 1.0,
    beatDetection: true
  },
  
  metadata: {
    author: 'TAM-TAM Team',
    version: '2.0.0',
    tags: ['radio', 'broadcast', 'professional', 'audio']
  }
};
