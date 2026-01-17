/**
 * TAM-TAM Template: Leçon du Jour
 * Daily lesson educational format
 */

import { Template } from '../types';

export const leconDuJourTemplate: Template = {
  id: 'lecon-du-jour',
  name: 'Leçon du Jour',
  nameBa: 'Ẹ̀kọ́ Ọjọ́',
  category: 'education',
  description: 'Format éducatif pour leçons quotidiennes',
  descriptionBa: 'Ìkẹ́kọ̀ọ́ lójoojúmọ́',
  thumbnail: '/assets/templates/lecon-du-jour-thumb.jpg',
  duration: 45,
  isPremium: false,
  isNew: true,
  
  effects: [
    {
      id: 'chalkboard-bg',
      type: 'texture',
      assetId: 'procedural:chalkboard',
      trigger: 'always',
      config: {
        opacity: 0.15,
        blendMode: 'overlay'
      }
    },
    {
      id: 'lesson-title',
      type: 'text',
      assetId: 'text:lesson',
      trigger: 'time',
      config: {
        x: 0.5,
        y: 0.1,
        text: '📚 Leçon du Jour',
        font: 'Chalk',
        color: '#FFFFFF',
        align: 'center',
        timeRange: [0, 5]
      }
    },
    {
      id: 'pointer',
      type: 'texture',
      assetId: 'procedural:pointer-hand',
      trigger: 'beat',
      config: {
        x: 0.1,
        y: 0.5,
        scale: 0.3,
        opacity: 0.8,
        beatThreshold: 0.7
      }
    },
    {
      id: 'highlight-box',
      type: 'texture',
      assetId: 'procedural:highlight-box',
      trigger: 'keyword',
      config: {
        opacity: 0.3,
        blendMode: 'screen',
        keywords: ['important', 'attention', 'retenez']
      }
    }
  ],
  
  audio: {
    volume: 0.8,
    beatDetection: true
  },
  
  metadata: {
    author: 'TAM-TAM Team',
    version: '1.0.0',
    tags: ['education', 'lesson', 'daily', 'learning']
  }
};
