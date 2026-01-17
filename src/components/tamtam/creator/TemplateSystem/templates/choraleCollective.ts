/**
 * TAM-TAM Template: Chorale Collective
 * Group singing/choir format
 * REAL ASSETS ONLY - No procedural fallbacks
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
    // Music notes flare - REAL ASSET
    {
      id: 'music-notes-flare',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-130.png',
      trigger: 'beat',
      config: {
        x: 0.3,
        y: 0.3,
        scale: 0.8,
        opacity: 0.5,
        blendMode: 'screen',
        beatThreshold: 0.4
      }
    },
    // Choir frame flare - REAL ASSET
    {
      id: 'choir-frame-flare',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-050.png',
      trigger: 'always',
      config: {
        x: 0.5,
        y: 0.2,
        scale: 1.0,
        opacity: 0.4,
        blendMode: 'screen'
      }
    },
    // Harmony glow flare - REAL ASSET
    {
      id: 'harmony-glow',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-060.png',
      trigger: 'beat',
      config: {
        x: 0.7,
        y: 0.4,
        scale: 1.2,
        opacity: 0.3,
        blendMode: 'screen',
        beatThreshold: 0.6
      }
    },
    // Lyrics display - TEXT EFFECT
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
    version: '2.0.0',
    tags: ['choir', 'singing', 'collective', 'music']
  }
};
