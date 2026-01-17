/**
 * TAM-TAM Template: Mini-Doc Village
 * Documentary-style template for village stories
 */

import { Template } from '../types';

export const miniDocVillageTemplate: Template = {
  id: 'mini-doc-village',
  name: 'Mini-Doc Village',
  nameBa: 'Àkọsílẹ̀ Abúlé',
  category: 'storytelling',
  description: 'Format documentaire court pour histoires de village',
  descriptionBa: 'Ìtàn abúlé kúkúrú',
  thumbnail: '/assets/templates/mini-doc-village-thumb.jpg',
  duration: 60,
  isPremium: false,
  isNew: true,
  
  effects: [
    {
      id: 'doc-frame',
      type: 'texture',
      assetId: 'procedural:letterbox-16-9',
      trigger: 'always',
      config: {
        opacity: 1.0,
        blendMode: 'source-over'
      }
    },
    {
      id: 'location-text',
      type: 'text',
      assetId: 'text:location',
      trigger: 'time',
      config: {
        x: 0.1,
        y: 0.9,
        text: '📍 Mon Village',
        font: 'Georgia',
        color: '#FFFFFF',
        align: 'left',
        timeRange: [0, 5]
      }
    },
    {
      id: 'sepia-grade',
      type: 'color-grade',
      assetId: 'procedural:sepia-warm',
      trigger: 'always',
      config: {
        opacity: 0.2,
        blendMode: 'overlay'
      }
    },
    {
      id: 'vignette',
      type: 'texture',
      assetId: 'procedural:vignette',
      trigger: 'always',
      config: {
        opacity: 0.4,
        blendMode: 'multiply'
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
    tags: ['documentary', 'village', 'culture', 'story']
  }
};
