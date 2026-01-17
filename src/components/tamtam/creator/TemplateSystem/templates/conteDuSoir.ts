/**
 * TAM-TAM Template: Conte du Soir
 * Evening storytelling for children
 * REAL ASSETS ONLY - No procedural fallbacks
 */

import { Template } from '../types';

export const conteDuSoirTemplate: Template = {
  id: 'conte-du-soir',
  name: 'Conte du Soir',
  nameBa: 'Àló Alẹ́',
  category: 'storytelling',
  description: 'Contes traditionnels pour enfants',
  descriptionBa: 'Àló fún àwọn ọmọdé',
  thumbnail: '/assets/templates/conte-du-soir-thumb.jpg',
  duration: 120,
  isPremium: false,
  isNew: true,
  
  effects: [
    // Starry sky flare - REAL ASSET
    {
      id: 'starry-flare',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-120.png',
      trigger: 'always',
      config: {
        x: 0.3,
        y: 0.2,
        scale: 0.5,
        opacity: 0.4,
        blendMode: 'screen'
      }
    },
    // Moon glow - REAL ASSET
    {
      id: 'moon-glow',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-025.png',
      trigger: 'always',
      config: {
        x: 0.85,
        y: 0.15,
        scale: 0.8,
        opacity: 0.5,
        blendMode: 'screen'
      }
    },
    // Story title - TEXT EFFECT
    {
      id: 'story-title',
      type: 'text',
      assetId: 'text:tale-title',
      trigger: 'time',
      config: {
        x: 0.5,
        y: 0.1,
        text: '🌙 Il était une fois...',
        font: 'Playfair Display',
        color: '#FFD700',
        align: 'center',
        timeRange: [0, 4]
      }
    },
    // Warm ambient flare - REAL ASSET
    {
      id: 'warm-ambient',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-050.png',
      trigger: 'always',
      config: {
        x: 0.5,
        y: 0.8,
        scale: 1.0,
        opacity: 0.3,
        blendMode: 'screen'
      }
    }
  ],
  
  audio: {
    volume: 0.7,
    beatDetection: false
  },
  
  metadata: {
    author: 'TAM-TAM Team',
    version: '2.0.0',
    tags: ['tale', 'children', 'night', 'storytelling']
  }
};
