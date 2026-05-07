/**
 * TAM-TAM Template: Débat Express v3.0
 * Quick debate/discussion format - Full Envato assets
 * REAL ASSETS ONLY - No procedural fallbacks
 */

import { Template } from '../types';

export const debatExpressTemplate: Template = {
  id: 'debat-express',
  name: 'Débat Express',
  nameBa: 'Nɛɛ Gbaa Kíákíá',
  category: 'business',
  description: 'Format débat rapide avec indicateurs visuels',
  descriptionBa: 'Nɛɛ gbaa kíákíá pɛ wéérù',
  thumbnail: '/assets/templates/debat-express-thumb.jpg',
  duration: 45,
  isPremium: false,
  isNew: true,
  
  effects: [
    // === LENS FLARES ===
    {
      id: 'split-screen-flare',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-420.png',
      trigger: 'always',
      config: { x: 0.5, y: 0.5, scale: 0.4, opacity: 0.6, blendMode: 'screen' }
    },
    {
      id: 'timer-bar-flare',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-100.png',
      trigger: 'always',
      config: { x: 0.5, y: 0.05, scale: 2.0, opacity: 0.5, blendMode: 'screen' }
    },
    {
      id: 'energy-pulse',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-090.png',
      trigger: 'beat',
      config: { x: 0.5, y: 0.5, scale: 1.5, opacity: 0.3, blendMode: 'screen', beatThreshold: 0.6 }
    },

    // === LIGHT LEAKS - Dramatic debate lighting ===
    {
      id: 'debate-leak-left',
      type: 'light-leak',
      assetId: 'light-leak:leak-025.webm',
      trigger: 'beat',
      config: { x: 0.2, y: 0.5, scale: 1.2, opacity: 0.3, blendMode: 'screen', beatThreshold: 0.7 }
    },
    {
      id: 'debate-leak-right',
      type: 'light-leak',
      assetId: 'light-leak:leak-030.webm',
      trigger: 'beat',
      config: { x: 0.8, y: 0.5, scale: 1.2, opacity: 0.3, blendMode: 'screen', beatThreshold: 0.7 }
    },

    // === TRANSITIONS - For point scoring ===
    {
      id: 'point-transition',
      type: 'transition',
      assetId: 'transitions:transition-005.mp4',
      trigger: 'beat',
      config: { x: 0.5, y: 0.5, scale: 1.0, opacity: 0.6, blendMode: 'screen', beatThreshold: 0.85, duration: 0.3 }
    },

    // === TEXT ===
    {
      id: 'vs-badge',
      type: 'text',
      assetId: 'text:versus',
      trigger: 'time',
      config: { x: 0.5, y: 0.5, text: 'VS', font: 'Impact', color: '#FFD700', scale: 1.5, timeRange: [0, 3] }
    }
  ],
  
  audio: {
    volume: 0.9,
    beatDetection: true
  },
  
  metadata: {
    author: 'TAM-TAM Team',
    version: '3.0.0',
    tags: ['debate', 'discussion', 'versus', 'quick']
  }
};
