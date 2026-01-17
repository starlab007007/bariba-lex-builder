/**
 * TAM-TAM Template: Avant/Après Village
 * Before/After comparison for village development
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
    {
      id: 'split-line',
      type: 'texture',
      assetId: 'procedural:split-vertical',
      trigger: 'always',
      config: {
        x: 0.5,
        opacity: 1.0,
        blendMode: 'source-over'
      }
    },
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
    {
      id: 'transition-wipe',
      type: 'transition',
      assetId: 'procedural:wipe-horizontal',
      trigger: 'time',
      config: {
        timeRange: [10, 15],
        direction: 'left-to-right'
      }
    }
  ],
  
  audio: {
    volume: 0.8,
    beatDetection: false
  },
  
  metadata: {
    author: 'TAM-TAM Team',
    version: '1.0.0',
    tags: ['before-after', 'comparison', 'development']
  }
};
