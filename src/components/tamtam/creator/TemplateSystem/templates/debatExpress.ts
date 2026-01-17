/**
 * TAM-TAM Template: Débat Express
 * Quick debate/discussion format
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
    {
      id: 'split-screen',
      type: 'texture',
      assetId: 'procedural:split-diagonal',
      trigger: 'always',
      config: {
        opacity: 0.8,
        blendMode: 'source-over'
      }
    },
    {
      id: 'timer-bar',
      type: 'texture',
      assetId: 'procedural:countdown-bar',
      trigger: 'always',
      config: {
        x: 0.5,
        y: 0.05,
        opacity: 0.9
      }
    },
    {
      id: 'energy-pulse',
      type: 'light-leak',
      assetId: 'procedural:light-leak-blue',
      trigger: 'beat',
      config: {
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
    version: '1.0.0',
    tags: ['debate', 'discussion', 'versus', 'quick']
  }
};
