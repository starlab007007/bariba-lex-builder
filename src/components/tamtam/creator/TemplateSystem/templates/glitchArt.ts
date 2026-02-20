/**
 * TAM-TAM Template: Glitch Art
 * Artistic digital glitch effects - Real assets with particles & textures
 */

import { Template } from '../types';

export const glitchArtTemplate: Template = {
  id: 'glitch-art',
  name: 'Glitch Art',
  nameBa: 'Wéérù Glitch',
  category: 'future',
  description: 'Distorsions artistiques numériques avec grains et particules',
  descriptionBa: 'Wéérù gbɛsiru dùùrɛ̀',
  thumbnail: '/assets/templates/glitch-art-thumb.jpg',
  duration: 15,
  isPremium: true,
  isNew: true,
  
  effects: [
    // === LENS FLARES ===
    {
      id: 'glitch-flare-1',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-350.png',
      trigger: 'beat',
      config: { x: 0.5, y: 0.5, scale: 0.8, opacity: 0.8, blendMode: 'screen', beatThreshold: 0.6 }
    },
    {
      id: 'glitch-flare-2',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-375.png',
      trigger: 'beat',
      config: { x: 0.3, y: 0.4, scale: 0.3, opacity: 0.5, blendMode: 'screen', beatThreshold: 0.8 }
    },

    // === TEXTURES - Grain/Scratches overlay ===
    {
      id: 'glitch-grain-texture',
      type: 'texture',
      assetId: 'textures:texture-100.mp4',
      trigger: 'always',
      config: { x: 0.5, y: 0.5, scale: 1.0, opacity: 0.3, blendMode: 'overlay' }
    },
    {
      id: 'glitch-scratch-texture',
      type: 'texture',
      assetId: 'textures:texture-150.mp4',
      trigger: 'beat',
      config: { x: 0.5, y: 0.5, scale: 1.2, opacity: 0.4, blendMode: 'screen', beatThreshold: 0.7 }
    },

    // === PARTICLES - Digital dust ===
    {
      id: 'glitch-digital-dust',
      type: 'particles',
      assetId: 'particles:particle-005.webm',
      trigger: 'always',
      config: { x: 0.5, y: 0.5, scale: 1.5, opacity: 0.2, blendMode: 'screen' }
    },
    {
      id: 'glitch-particle-burst',
      type: 'particles',
      assetId: 'particles:particle-025.webm',
      trigger: 'beat',
      config: { x: 0.5, y: 0.5, scale: 2.0, opacity: 0.5, blendMode: 'screen', beatThreshold: 0.75 }
    },

    // === LIGHT LEAKS - RGB split simulation ===
    {
      id: 'glitch-rgb-leak',
      type: 'light-leak',
      assetId: 'light-leak:leak-030.webm',
      trigger: 'beat',
      config: { x: 0.5, y: 0.5, scale: 1.4, opacity: 0.35, blendMode: 'screen', beatThreshold: 0.65 }
    },

    // === TRANSITIONS - Glitch flash ===
    {
      id: 'glitch-flash-transition',
      type: 'transition',
      assetId: 'transitions:transition-005.mp4',
      trigger: 'beat',
      config: { x: 0.5, y: 0.5, scale: 1.0, opacity: 0.6, blendMode: 'screen', beatThreshold: 0.9, duration: 0.3 }
    }
  ],
  
  audio: {
    volume: 0.9,
    beatDetection: true
  },
  
  metadata: {
    author: 'TAM-TAM Team',
    version: '3.0.0',
    tags: ['glitch', 'art', 'digital', 'distortion', 'grain', 'particles']
  }
};
