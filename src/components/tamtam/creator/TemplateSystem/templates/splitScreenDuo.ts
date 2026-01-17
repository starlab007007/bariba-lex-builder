/**
 * TAM-TAM Template: Split Screen Duo
 * Dual screen for reactions and collaborations
 * REAL ASSETS ONLY - No procedural fallbacks
 */

import { Template } from '../types';

export const splitScreenDuoTemplate: Template = {
  id: 'split-screen-duo',
  name: 'Split Screen Duo',
  nameBa: 'Ìpín Méjì',
  category: 'music',
  description: 'Écran divisé pour duos et réactions',
  descriptionBa: 'Ìpín fún àwọn méjì',
  thumbnail: '/assets/templates/split-screen-duo-thumb.jpg',
  duration: 30,
  isPremium: false,
  isNew: true,
  
  effects: [
    // Split divider flare - REAL ASSET
    {
      id: 'split-divider-flare',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-420.png',
      trigger: 'always',
      config: {
        x: 0.5,
        y: 0.5,
        scale: 0.3,
        opacity: 0.7,
        blendMode: 'screen'
      }
    },
    // Top label - TEXT EFFECT
    {
      id: 'top-label',
      type: 'text',
      assetId: 'text:creator1',
      trigger: 'always',
      config: {
        x: 0.1,
        y: 0.22,
        text: '@créateur1',
        font: 'Poppins',
        color: '#FFFFFF',
        align: 'left'
      }
    },
    // Bottom label - TEXT EFFECT
    {
      id: 'bottom-label',
      type: 'text',
      assetId: 'text:creator2',
      trigger: 'always',
      config: {
        x: 0.1,
        y: 0.72,
        text: '@créateur2',
        font: 'Poppins',
        color: '#FFFFFF',
        align: 'left'
      }
    },
    // Sync indicator flare - REAL ASSET
    {
      id: 'sync-indicator',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-430.png',
      trigger: 'beat',
      config: {
        x: 0.5,
        y: 0.5,
        scale: 1.2,
        opacity: 0.4,
        blendMode: 'screen',
        beatThreshold: 0.5
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
    tags: ['split', 'duo', 'collaboration', 'reaction']
  }
};
