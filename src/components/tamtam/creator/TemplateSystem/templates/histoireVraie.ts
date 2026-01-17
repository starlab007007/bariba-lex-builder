/**
 * TAM-TAM Template: Histoire Vraie
 * True story documentary style
 */

import { Template } from '../types';

export const histoireVraieTemplate: Template = {
  id: 'histoire-vraie',
  name: 'Histoire Vraie',
  nameBa: 'Ìtàn Òtítọ́',
  category: 'storytelling',
  description: 'Format témoignage pour histoires vraies',
  descriptionBa: 'Ìtàn tó ṣẹlẹ̀ gan',
  thumbnail: '/assets/templates/histoire-vraie-thumb.jpg',
  duration: 90,
  isPremium: true,
  isNew: false,
  
  effects: [
    {
      id: 'testimony-frame',
      type: 'texture',
      assetId: 'procedural:soft-vignette',
      trigger: 'always',
      config: {
        opacity: 0.5,
        blendMode: 'multiply'
      }
    },
    {
      id: 'quote-marks',
      type: 'text',
      assetId: 'text:quotes',
      trigger: 'always',
      config: {
        x: 0.1,
        y: 0.2,
        text: '"',
        font: 'Georgia',
        color: '#FFFFFF',
        opacity: 0.3,
        align: 'left'
      }
    },
    {
      id: 'film-grain',
      type: 'texture',
      assetId: 'procedural:film-grain',
      trigger: 'always',
      config: {
        opacity: 0.1,
        blendMode: 'overlay'
      }
    }
  ],
  
  audio: {
    volume: 1.0,
    beatDetection: false
  },
  
  metadata: {
    author: 'TAM-TAM Team',
    version: '1.0.0',
    tags: ['testimony', 'true-story', 'documentary']
  }
};
