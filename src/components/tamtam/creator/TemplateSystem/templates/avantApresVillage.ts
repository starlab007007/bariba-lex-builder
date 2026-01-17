/**
 * TAM-TAM Template: Avant/Après Village
 * Before/After comparison for village development
 * REAL ASSETS ONLY - No procedural fallbacks
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
    // Split line flare - REAL ASSET
    {
      id: 'split-line-flare',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-100.png',
      trigger: 'always',
      config: {
        x: 0.5,
        y: 0.5,
        scale: 0.3,
        opacity: 0.8,
        blendMode: 'screen'
      }
    },
    // Before label - TEXT EFFECT
    {
      id: 'before-label',
      type: 'text',
      assetId: 'text:before',
      trigger: 'always',
      config: {
        x: 0.25,
        y: 0.1,
        text: 'AVANT',
        font: 'Oswald',
        color: '#FF6B6B',
        align: 'center'
      }
    },
    // After label - TEXT EFFECT
    {
      id: 'after-label',
      type: 'text',
      assetId: 'text:after',
      trigger: 'always',
      config: {
        x: 0.75,
        y: 0.1,
        text: 'APRÈS',
        font: 'Oswald',
        color: '#4ECDC4',
        align: 'center'
      }
    },
    // Transition flare - REAL ASSET
    {
      id: 'transition-flare',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-110.png',
      trigger: 'time',
      config: {
        x: 0.5,
        y: 0.5,
        scale: 2.0,
        opacity: 0.9,
        blendMode: 'screen',
        timeRange: [10, 15]
      }
    }
  ],
  
  audio: {
    volume: 0.8,
    beatDetection: false
  },
  
  metadata: {
    author: 'TAM-TAM Team',
    version: '2.0.0',
    tags: ['before-after', 'comparison', 'development']
  }
};
