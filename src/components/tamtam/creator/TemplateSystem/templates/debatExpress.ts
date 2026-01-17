/**
 * TAM-TAM Template: Débat Express
 * Quick debate/discussion format
 * REAL ASSETS ONLY - No procedural fallbacks
 */

import { Template } from '../types';

export const debatExpressTemplate: Template = {
  id: 'debat-express',
  name: 'Débat Express',
  nameBa: 'Àríyànjiyàn Kíákíá',
  category: 'business',
  description: 'Format débat rapide avec indicateurs visuels',
  descriptionBa: 'Ìjíròrò kíákíá',
  thumbnail: '/assets/templates/debat-express-thumb.jpg',
  duration: 45,
  isPremium: false,
  isNew: true,
  
  effects: [
    // VS badge - TEXT EFFECT
    {
      id: 'vs-badge',
      type: 'text',
      assetId: 'text:versus',
      trigger: 'time',
      config: {
        x: 0.5,
        y: 0.5,
        text: 'VS',
        font: 'Impact',
        color: '#FFD700',
        scale: 1.5,
        timeRange: [0, 3]
      }
    },
    // Split screen flare - REAL ASSET
    {
      id: 'split-screen-flare',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-420.png',
      trigger: 'always',
      config: {
        x: 0.5,
        y: 0.5,
        scale: 0.4,
        opacity: 0.6,
        blendMode: 'screen'
      }
    },
    // Timer bar flare - REAL ASSET
    {
      id: 'timer-bar-flare',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-100.png',
      trigger: 'always',
      config: {
        x: 0.5,
        y: 0.05,
        scale: 2.0,
        opacity: 0.5,
        blendMode: 'screen'
      }
    },
    // Energy pulse flare - REAL ASSET
    {
      id: 'energy-pulse',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-090.png',
      trigger: 'beat',
      config: {
        x: 0.5,
        y: 0.5,
        scale: 1.5,
        opacity: 0.3,
        blendMode: 'screen',
        beatThreshold: 0.6
      }
    }
  ],
  
  audio: {
    volume: 0.9,
    beatDetection: true
  },
  
  metadata: {
    author: 'TAM-TAM Team',
    version: '2.0.0',
    tags: ['debate', 'discussion', 'versus', 'quick']
  }
};
