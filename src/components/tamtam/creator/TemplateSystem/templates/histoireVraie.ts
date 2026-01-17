/**
 * TAM-TAM Template: Histoire Vraie
 * True story documentary style
 * REAL ASSETS ONLY - No procedural fallbacks
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
    // Testimony frame flare - REAL ASSET
    {
      id: 'testimony-frame',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-055.png',
      trigger: 'always',
      config: {
        x: 0.5,
        y: 0.5,
        scale: 1.8,
        opacity: 0.3,
        blendMode: 'multiply'
      }
    },
    // Quote marks - TEXT EFFECT
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
    // Film grain accent flare - REAL ASSET
    {
      id: 'film-grain-accent',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-440.png',
      trigger: 'always',
      config: {
        x: 0.8,
        y: 0.2,
        scale: 0.5,
        opacity: 0.15,
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
    version: '2.0.0',
    tags: ['testimony', 'true-story', 'documentary']
  }
};
