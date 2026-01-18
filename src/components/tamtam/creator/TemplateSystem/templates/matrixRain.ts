/**
 * TAM-TAM Template: Matrix Rain
 * Iconic falling code effect - Full asset integration with textures
 */

import { Template } from '../types';

export const matrixRainTemplate: Template = {
  id: 'matrix-rain',
  name: 'Matrix Rain',
  nameBa: 'Ojú Omi Matrix',
  category: 'future',
  description: 'Effet pluie de code style Matrix avec textures dynamiques',
  descriptionBa: 'Àwòrán kóòdù Matrix pẹ̀lú àwọ̀n aṣọ',
  thumbnail: '/assets/templates/matrix-rain-thumb.jpg',
  duration: 20,
  isPremium: true,
  isNew: true,
  
  effects: [
    // === LENS FLARES - Digital glow ===
    {
      id: 'matrix-flare-1',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-175.png',
      trigger: 'always',
      config: { x: 0.5, y: 0.2, scale: 0.7, opacity: 0.5, blendMode: 'screen' }
    },
    {
      id: 'matrix-flare-2',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-225.png',
      trigger: 'beat',
      config: { x: 0.3, y: 0.5, scale: 0.4, opacity: 0.4, blendMode: 'screen', beatThreshold: 0.7 }
    },

    // === TEXTURES - Code rain simulation ===
    {
      id: 'matrix-code-texture',
      type: 'texture',
      assetId: 'textures:texture-001.mp4',
      trigger: 'always',
      config: { x: 0.5, y: 0.5, scale: 1.0, opacity: 0.4, blendMode: 'screen' }
    },
    {
      id: 'matrix-scan-texture',
      type: 'texture',
      assetId: 'textures:texture-030.mp4',
      trigger: 'always',
      config: { x: 0.5, y: 0.5, scale: 1.2, opacity: 0.2, blendMode: 'overlay' }
    },

    // === PARTICLES - Digital rain drops ===
    {
      id: 'matrix-particles-rain',
      type: 'particles',
      assetId: 'particles:particle-003.webm',
      trigger: 'always',
      config: { x: 0.5, y: 0.5, scale: 1.5, opacity: 0.35, blendMode: 'screen' }
    },
    {
      id: 'matrix-particles-burst',
      type: 'particles',
      assetId: 'particles:particle-012.webm',
      trigger: 'beat',
      config: { x: 0.5, y: 0.5, scale: 1.8, opacity: 0.5, blendMode: 'screen', beatThreshold: 0.75 }
    },

    // === LIGHT LEAKS - Green tint ===
    {
      id: 'matrix-green-leak',
      type: 'light-leak',
      assetId: 'light-leak:leak-020.webm',
      trigger: 'always',
      config: { x: 0.5, y: 0.5, scale: 1.4, opacity: 0.25, blendMode: 'screen' }
    },

    // === TRANSITIONS - Digital flash ===
    {
      id: 'matrix-flash',
      type: 'transition',
      assetId: 'transitions:transition-003.mp4',
      trigger: 'beat',
      config: { x: 0.5, y: 0.5, scale: 1.0, opacity: 0.5, blendMode: 'screen', beatThreshold: 0.85, duration: 0.4 }
    },

    // === TEXT ===
    {
      id: 'matrix-text-intro',
      type: 'text',
      assetId: 'text:matrix',
      trigger: 'time',
      config: { x: 0.5, y: 0.5, text: 'WAKE UP...', font: 'Courier', color: '#00FF00', align: 'center', timeRange: [0, 3] }
    },
    {
      id: 'matrix-text-follow',
      type: 'text',
      assetId: 'text:matrix2',
      trigger: 'time',
      config: { x: 0.5, y: 0.5, text: 'THE MATRIX HAS YOU', font: 'Courier', color: '#00FF00', align: 'center', timeRange: [3, 6] }
    }
  ],
  
  audio: {
    volume: 0.8,
    beatDetection: true
  },
  
  metadata: {
    author: 'TAM-TAM Team',
    version: '3.0.0',
    tags: ['matrix', 'code', 'rain', 'hacker', 'digital', 'green']
  }
};
