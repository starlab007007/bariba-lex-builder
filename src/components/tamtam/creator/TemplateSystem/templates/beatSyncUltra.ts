/**
 * TAM-TAM Template: Beat Sync Ultra
 * High-energy beat-synchronized effects for music videos
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
    // Beat-triggered lens flare
    {
      id: 'beat-flare-main',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-001.png',
      trigger: 'beat',
      config: {
        x: 0.5,
        y: 0.3,
        scale: 1.5,
        opacity: 0.9,
        blendMode: 'screen',
        beatThreshold: 0.7
      }
    },
    // Secondary beat flare
    {
      id: 'beat-flare-secondary',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-015.png',
      trigger: 'beat',
      config: {
        x: 0.7,
        y: 0.6,
        scale: 0.8,
        opacity: 0.6,
        blendMode: 'screen',
        beatThreshold: 0.5
      }
    },
    // Constant light leak overlay
    {
      id: 'light-leak-pulse',
      type: 'light-leak',
      assetId: 'procedural:light-leak-animated',
      trigger: 'beat',
      config: {
        opacity: 0.4,
        blendMode: 'screen',
        beatThreshold: 0.6
      }
    },
    // Particles on strong beats
    {
      id: 'beat-particles',
      type: 'particles',
      assetId: 'procedural:sparkle-burst',
      trigger: 'beat',
      config: {
        x: 0.5,
        y: 0.5,
        scale: 2,
        opacity: 0.8,
        beatThreshold: 0.8
      }
    },
    // Vignette for focus
    {
      id: 'vignette-constant',
      type: 'texture',
      assetId: 'procedural:vignette',
      trigger: 'always',
      config: {
        opacity: 0.5,
        blendMode: 'multiply'
      }
    }
  ],
  
  audio: {
    beatDetection: true,
    volume: 1.0
  },
  
  metadata: {
    author: 'TAM-TAM Team',
    version: '1.0.0',
    tags: ['music', 'beat-sync', 'energy', 'clip', 'dance']
  }
};
