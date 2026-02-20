/**
 * TAM-TAM Template: Leçon du Jour
 * Daily lesson educational format
 * REAL ASSETS ONLY - No procedural fallbacks
 */

import { Template } from '../types';

export const leconDuJourTemplate: Template = {
  id: 'lecon-du-jour',
  name: 'Leçon du Jour',
  nameBa: 'Debu Gisɔ',
  category: 'education',
  description: 'Format éducatif pour leçons quotidiennes',
  descriptionBa: 'Debu sɔ̃ɔ kpuro',
  thumbnail: '/assets/templates/lecon-du-jour-thumb.jpg',
  duration: 45,
  isPremium: false,
  isNew: true,
  
  effects: [
    // Chalkboard accent flare - REAL ASSET
    {
      id: 'chalkboard-flare',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-160.png',
      trigger: 'always',
      config: {
        x: 0.9,
        y: 0.1,
        scale: 0.5,
        opacity: 0.3,
        blendMode: 'screen'
      }
    },
    // Lesson title - TEXT EFFECT
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
    // Pointer flare - REAL ASSET
    {
      id: 'pointer-flare',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-170.png',
      trigger: 'beat',
      config: {
        x: 0.1,
        y: 0.5,
        scale: 0.4,
        opacity: 0.6,
        blendMode: 'screen',
        beatThreshold: 0.7
      }
    },
    // Highlight flare - REAL ASSET
    {
      id: 'highlight-flare',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-180.png',
      trigger: 'keyword',
      config: {
        x: 0.5,
        y: 0.5,
        scale: 1.5,
        opacity: 0.4,
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
    version: '2.0.0',
    tags: ['education', 'lesson', 'daily', 'learning']
  }
};
