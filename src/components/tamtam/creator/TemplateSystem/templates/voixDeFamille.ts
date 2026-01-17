/**
 * TAM-TAM Template: Voix de Famille
 * Family voice messages and memories - Real assets only
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
      id: 'heart-flare',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-375.png',
      trigger: 'beat',
      config: {
        x: 0.5,
        y: 0.5,
        scale: 0.6,
        opacity: 0.4,
        blendMode: 'screen',
        beatThreshold: 0.7
      }
    },
    {
      id: 'warm-memory-flare',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-400.png',
      trigger: 'always',
      config: {
        x: 0.8,
        y: 0.2,
        scale: 0.5,
        opacity: 0.2,
        blendMode: 'screen'
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
    version: '2.0.0',
    tags: ['family', 'voice', 'memories', 'love']
  }
};
