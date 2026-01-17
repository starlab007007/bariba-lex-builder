/**
 * TAM-TAM Template: Beat Sync Ultra
 * High-energy beat-synchronized effects for music videos
 * REAL ASSETS ONLY - No procedural fallbacks
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
    // Beat-triggered lens flare - REAL ASSET
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
    // Secondary beat flare - REAL ASSET
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
    // Light leak replacement with lens-flare - REAL ASSET
    {
      id: 'light-leak-pulse',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-025.png',
      trigger: 'beat',
      config: {
        x: 0.3,
        y: 0.4,
        scale: 1.2,
        opacity: 0.4,
        blendMode: 'screen',
        beatThreshold: 0.6
      }
    },
    // Particles replacement with lens-flare burst - REAL ASSET
    {
      id: 'beat-particles',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-040.png',
      trigger: 'beat',
      config: {
        x: 0.5,
        y: 0.5,
        scale: 2,
        opacity: 0.8,
        blendMode: 'screen',
        beatThreshold: 0.8
      }
    },
    // Vignette replacement with corner flare - REAL ASSET
    {
      id: 'vignette-flare',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-055.png',
      trigger: 'always',
      config: {
        x: 0.5,
        y: 0.5,
        scale: 1.8,
        opacity: 0.3,
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
    version: '2.0.0',
    tags: ['music', 'beat-sync', 'energy', 'clip', 'dance']
  }
};
