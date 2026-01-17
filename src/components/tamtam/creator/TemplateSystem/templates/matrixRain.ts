/**
 * TAM-TAM Template: Matrix Rain
 * Iconic falling code effect - Real assets only
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
      id: 'matrix-flare-1',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-175.png',
      trigger: 'always',
      config: {
        x: 0.5,
        y: 0.2,
        scale: 0.7,
        opacity: 0.5,
        blendMode: 'screen'
      }
    },
    {
      id: 'matrix-flare-2',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-225.png',
      trigger: 'beat',
      config: {
        x: 0.3,
        y: 0.5,
        scale: 0.4,
        opacity: 0.4,
        blendMode: 'screen',
        beatThreshold: 0.7
      }
    },
    {
      id: 'matrix-flare-3',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-275.png',
      trigger: 'beat',
      config: {
        x: 0.7,
        y: 0.4,
        scale: 0.5,
        opacity: 0.3,
        blendMode: 'screen',
        beatThreshold: 0.6
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
    version: '2.0.0',
    tags: ['matrix', 'code', 'rain', 'hacker']
  }
};
