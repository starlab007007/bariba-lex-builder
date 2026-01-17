/**
 * TAM-TAM Template: Conte du Soir
 * Evening storytelling for children
 */

import { Template } from '../types';

export const conteDuSoirTemplate: Template = {
  id: 'conte-du-soir',
  name: 'Conte du Soir',
  nameBa: 'Àló Alẹ́',
  category: 'storytelling',
  description: 'Contes traditionnels pour enfants',
  descriptionBa: 'Àló fún àwọn ọmọdé',
  thumbnail: '/assets/templates/conte-du-soir-thumb.jpg',
  duration: 120,
  isPremium: false,
  isNew: true,
  
  effects: [
    {
      id: 'night-sky',
      type: 'texture',
      assetId: 'procedural:starry-night',
      trigger: 'always',
      config: {
        opacity: 0.3,
        blendMode: 'screen'
      }
    },
    {
      id: 'moon-glow',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-025.png',
      trigger: 'always',
      config: {
        x: 0.85,
        y: 0.15,
        scale: 0.8,
        opacity: 0.5,
        blendMode: 'screen'
      }
    },
    {
      id: 'story-title',
      type: 'text',
      assetId: 'text:tale-title',
      trigger: 'time',
      config: {
        x: 0.5,
        y: 0.1,
        text: '🌙 Il était une fois...',
        font: 'Playfair Display',
        color: '#FFD700',
        align: 'center',
        timeRange: [0, 4]
      }
    },
    {
      id: 'warm-vignette',
      type: 'texture',
      assetId: 'procedural:vignette-warm',
      trigger: 'always',
      config: {
        opacity: 0.6,
        blendMode: 'multiply'
      }
    }
  ],
  
  audio: {
    volume: 0.7,
    beatDetection: false
  },
  
  metadata: {
    author: 'TAM-TAM Team',
    version: '1.0.0',
    tags: ['tale', 'children', 'night', 'storytelling']
  }
};
