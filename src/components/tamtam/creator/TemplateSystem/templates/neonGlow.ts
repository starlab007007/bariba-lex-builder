/**
 * TAM-TAM Template: Neon Glow
 * Vibrant neon aesthetic for modern content - Full asset integration
 */

import { Template } from '../types';

export const neonGlowTemplate: Template = {
  id: 'neon-glow',
  name: 'Neon Glow',
  nameBa: 'Ìmọ́lẹ̀ Neon',
  category: 'future',
  description: 'Esthétique néon vibrante avec effets lumineux dynamiques',
  descriptionBa: 'Àwòrán ìmọ́lẹ̀ neon pẹ̀lú ìtànná',
  thumbnail: '/assets/templates/neon-glow-thumb.jpg',
  duration: 30,
  isPremium: true,
  isNew: true,
  
  effects: [
    // === LENS FLARES - Neon highlights ===
    {
      id: 'neon-border-flare',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-450.png',
      trigger: 'always',
      config: { x: 0.5, y: 0.1, scale: 0.9, opacity: 0.9, blendMode: 'screen' }
    },
    {
      id: 'glow-pulse-flare',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-425.png',
      trigger: 'beat',
      config: { x: 0.5, y: 0.5, scale: 1.5, opacity: 0.5, blendMode: 'screen', beatThreshold: 0.5 }
    },
    {
      id: 'corner-flare',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-410.png',
      trigger: 'always',
      config: { x: 0.9, y: 0.9, scale: 0.4, opacity: 0.15, blendMode: 'screen' }
    },

    // === LIGHT LEAKS - Neon ambiance ===
    {
      id: 'neon-leak-pink',
      type: 'light-leak',
      assetId: 'light-leak:leak-015.mp4',
      trigger: 'always',
      config: { x: 0.3, y: 0.5, scale: 1.4, opacity: 0.35, blendMode: 'screen' }
    },
    {
      id: 'neon-leak-pulse',
      type: 'light-leak',
      assetId: 'light-leak:leak-028.webm',
      trigger: 'beat',
      config: { x: 0.5, y: 0.5, scale: 1.6, opacity: 0.4, blendMode: 'screen', beatThreshold: 0.6 }
    },

    // === PARTICLES - Sparkle effects ===
    {
      id: 'neon-sparkle',
      type: 'particles',
      assetId: 'particles:particle-008.webm',
      trigger: 'always',
      config: { x: 0.5, y: 0.5, scale: 1.5, opacity: 0.25, blendMode: 'screen' }
    },
    {
      id: 'neon-burst',
      type: 'particles',
      assetId: 'particles:particle-022.webm',
      trigger: 'beat',
      config: { x: 0.5, y: 0.5, scale: 2.0, opacity: 0.45, blendMode: 'screen', beatThreshold: 0.75 }
    },

    // === TEXTURES - Gradient overlay ===
    {
      id: 'neon-gradient-texture',
      type: 'texture',
      assetId: 'textures:texture-070.mp4',
      trigger: 'always',
      config: { x: 0.5, y: 0.5, scale: 1.0, opacity: 0.15, blendMode: 'overlay' }
    },
    {
      id: 'neon-bokeh-texture',
      type: 'texture',
      assetId: 'textures:texture-090.mp4',
      trigger: 'beat',
      config: { x: 0.5, y: 0.5, scale: 1.2, opacity: 0.2, blendMode: 'screen', beatThreshold: 0.55 }
    },

    // === TRANSITIONS - Glow flash ===
    {
      id: 'neon-flash-transition',
      type: 'transition',
      assetId: 'transitions:transition-007.mp4',
      trigger: 'beat',
      config: { x: 0.5, y: 0.5, scale: 1.0, opacity: 0.6, blendMode: 'screen', beatThreshold: 0.9, duration: 0.3 }
    },

    // === TEXT ===
    {
      id: 'neon-text',
      type: 'text',
      assetId: 'text:neon',
      trigger: 'always',
      config: { x: 0.5, y: 0.9, text: '✨ GLOW ✨', font: 'Orbitron', color: '#FF00FF', align: 'center', glow: true }
    }
  ],
  
  audio: {
    volume: 0.9,
    beatDetection: true
  },
  
  metadata: {
    author: 'TAM-TAM Team',
    version: '3.0.0',
    tags: ['neon', 'glow', 'modern', 'vibrant', 'particles', 'textures']
  }
};
