/**
 * TAM-TAM Template: Avant/Après Village v3.0
 * Before/After comparison for village development
 * REAL ASSETS ONLY - Full Envato integration
 */

import { Template } from '../types';

export const avantApresVillageTemplate: Template = {
  id: 'avant-apres-village',
  name: 'Avant/Après Village',
  nameBa: 'Tẹ́lẹ̀/Báyìí Abúlé',
  category: 'storytelling',
  description: 'Comparaison avant/après du développement',
  descriptionBa: 'Ìfiwéra ìyípadà',
  thumbnail: '/assets/templates/avant-apres-village-thumb.jpg',
  duration: 30,
  isPremium: false,
  isNew: true,
  
  effects: [
    // === LENS FLARES ===
    {
      id: 'split-line-flare',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-100.png',
      trigger: 'always',
      config: { x: 0.5, y: 0.5, scale: 0.3, opacity: 0.8, blendMode: 'screen' }
    },
    {
      id: 'transition-flare',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-110.png',
      trigger: 'time',
      config: { x: 0.5, y: 0.5, scale: 2.0, opacity: 0.9, blendMode: 'screen', timeRange: [10, 15] }
    },

    // === TRANSITIONS - For the before/after reveal ===
    {
      id: 'reveal-transition',
      type: 'transition',
      assetId: 'transitions:transition-003.mp4',
      trigger: 'time',
      config: { x: 0.5, y: 0.5, scale: 1.0, opacity: 0.8, blendMode: 'screen', timeRange: [14, 16], duration: 2 }
    },

    // === LIGHT LEAKS ===
    {
      id: 'warm-leak',
      type: 'light-leak',
      assetId: 'light-leak:leak-012.mp4',
      trigger: 'always',
      config: { x: 0.5, y: 0.5, scale: 1.3, opacity: 0.2, blendMode: 'screen' }
    },

    // === TEXTURES ===
    {
      id: 'film-texture',
      type: 'texture',
      assetId: 'textures:texture-020.mp4',
      trigger: 'always',
      config: { x: 0.5, y: 0.5, scale: 1.0, opacity: 0.1, blendMode: 'overlay' }
    },

    // === TEXT ===
    {
      id: 'before-label',
      type: 'text',
      assetId: 'text:before',
      trigger: 'always',
      config: { x: 0.25, y: 0.1, text: 'AVANT', font: 'Oswald', color: '#FF6B6B', align: 'center' }
    },
    {
      id: 'after-label',
      type: 'text',
      assetId: 'text:after',
      trigger: 'always',
      config: { x: 0.75, y: 0.1, text: 'APRÈS', font: 'Oswald', color: '#4ECDC4', align: 'center' }
    }
  ],
  
  audio: {
    volume: 0.8,
    beatDetection: false
  },
  
  metadata: {
    author: 'TAM-TAM Team',
    version: '3.0.0',
    tags: ['before-after', 'comparison', 'development']
  }
};
