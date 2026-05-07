/**
 * TAM-TAM Template: Mini-Doc Village
 * Documentary-style template for village stories - Real assets only
 */

import { Template } from '../types';

export const miniDocVillageTemplate: Template = {
  id: 'mini-doc-village',
  name: 'Mini-Doc Village',
  nameBa: 'Doc Kúàrà',
  category: 'storytelling',
  description: 'Format documentaire court pour histoires de village',
  descriptionBa: 'Doc kúàrà táárù kíákíá',
  thumbnail: '/assets/templates/mini-doc-village-thumb.jpg',
  duration: 60,
  isPremium: false,
  isNew: true,
  
  effects: [
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
      id: 'warm-flare',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-275.png',
      trigger: 'always',
      config: {
        x: 0.8,
        y: 0.2,
        scale: 0.6,
        opacity: 0.2,
        blendMode: 'screen'
      }
    },
    {
      id: 'corner-flare',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-300.png',
      trigger: 'always',
      config: {
        x: 0.1,
        y: 0.9,
        scale: 0.4,
        opacity: 0.4,
        blendMode: 'screen'
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
    tags: ['documentary', 'village', 'culture', 'story']
  }
};
