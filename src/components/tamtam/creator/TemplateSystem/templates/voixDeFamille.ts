/**
 * TAM-TAM Template: Voix de Famille
 * Family voice messages and memories
 */

import { Template } from '../types';

export const voixDeFamilleTemplate: Template = {
  id: 'voix-de-famille',
  name: 'Voix de Famille',
  nameBa: 'Ohùn Ẹbí',
  category: 'storytelling',
  description: 'Messages vocaux et souvenirs familiaux',
  descriptionBa: 'Ìrántí àti ohùn ẹbí',
  thumbnail: '/assets/templates/voix-de-famille-thumb.jpg',
  duration: 60,
  isPremium: false,
  isNew: true,
  
  effects: [
    {
      id: 'family-frame',
      type: 'texture',
      assetId: 'procedural:wooden-frame',
      trigger: 'always',
      config: {
        opacity: 0.8,
        blendMode: 'source-over'
      }
    },
    {
      id: 'heart-particles',
      type: 'particles',
      assetId: 'procedural:floating-hearts',
      trigger: 'beat',
      config: {
        opacity: 0.4,
        blendMode: 'screen',
        beatThreshold: 0.7
      }
    },
    {
      id: 'warm-memory',
      type: 'color-grade',
      assetId: 'procedural:warm-memory',
      trigger: 'always',
      config: {
        opacity: 0.2,
        blendMode: 'overlay'
      }
    },
    {
      id: 'family-badge',
      type: 'text',
      assetId: 'text:family',
      trigger: 'time',
      config: {
        x: 0.5,
        y: 0.1,
        text: '👨‍👩‍👧‍👦 Notre Famille',
        font: 'Playfair Display',
        color: '#8B4513',
        align: 'center',
        timeRange: [0, 5]
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
    tags: ['family', 'voice', 'memories', 'love']
  }
};
