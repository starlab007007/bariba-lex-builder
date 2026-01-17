/**
 * TAM-TAM Template: Matrix Rain
 * Iconic falling code effect
 */

import { Template } from '../types';

export const matrixRainTemplate: Template = {
  id: 'matrix-rain',
  name: 'Matrix Rain',
  nameBa: 'Ojú Omi Matrix',
  category: 'future',
  description: 'Effet pluie de code style Matrix',
  descriptionBa: 'Àwòrán kóòdù Matrix',
  thumbnail: '/assets/templates/matrix-rain-thumb.jpg',
  duration: 20,
  isPremium: true,
  isNew: true,
  
  effects: [
    {
      id: 'code-rain',
      type: 'particles',
      assetId: 'procedural:matrix-rain',
      trigger: 'always',
      config: {
        opacity: 0.7,
        blendMode: 'screen'
      }
    },
    {
      id: 'green-tint',
      type: 'color-grade',
      assetId: 'procedural:matrix-green',
      trigger: 'always',
      config: {
        opacity: 0.3,
        blendMode: 'overlay'
      }
    },
    {
      id: 'digital-glitch',
      type: 'particles',
      assetId: 'procedural:digital-noise',
      trigger: 'beat',
      config: {
        opacity: 0.4,
        blendMode: 'screen',
        beatThreshold: 0.7
      }
    },
    {
      id: 'matrix-text',
      type: 'text',
      assetId: 'text:matrix',
      trigger: 'time',
      config: {
        x: 0.5,
        y: 0.5,
        text: 'WAKE UP...',
        font: 'Courier',
        color: '#00FF00',
        align: 'center',
        timeRange: [0, 3]
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
    tags: ['matrix', 'code', 'rain', 'hacker']
  }
};
