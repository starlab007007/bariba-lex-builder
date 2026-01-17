/**
 * TAM-TAM Template: Chorale Collective
 * Group singing/choir format
 */

import { Template } from '../types';

export const choraleCollectiveTemplate: Template = {
  id: 'chorale-collective',
  name: 'Chorale Collective',
  nameBa: 'Ẹgbẹ́ Orin',
  category: 'music',
  description: 'Chants collectifs et chorales',
  descriptionBa: 'Orin àpapọ̀',
  thumbnail: '/assets/templates/chorale-collective-thumb.jpg',
  duration: 90,
  isPremium: false,
  isNew: true,
  
  effects: [
    {
      id: 'music-notes',
      type: 'particles',
      assetId: 'procedural:floating-notes',
      trigger: 'beat',
      config: {
        opacity: 0.6,
        blendMode: 'screen',
        beatThreshold: 0.4
      }
    },
    {
      id: 'choir-frame',
      type: 'texture',
      assetId: 'procedural:ornate-gold-frame',
      trigger: 'always',
      config: {
        opacity: 0.5,
        blendMode: 'source-over'
      }
    },
    {
      id: 'harmony-glow',
      type: 'light-leak',
      assetId: 'procedural:light-leak-warm',
      trigger: 'beat',
      config: {
        opacity: 0.25,
        blendMode: 'screen',
        beatThreshold: 0.6
      }
    },
    {
      id: 'lyrics-display',
      type: 'text',
      assetId: 'text:lyrics',
      trigger: 'always',
      config: {
        x: 0.5,
        y: 0.9,
        text: '♪ ♫',
        font: 'Dancing Script',
        color: '#FFD700',
        align: 'center'
      }
    }
  ],
  
  audio: {
    volume: 1.0,
    beatDetection: true
  },
  
  metadata: {
    author: 'TAM-TAM Team',
    version: '1.0.0',
    tags: ['choir', 'singing', 'collective', 'music']
  }
};
