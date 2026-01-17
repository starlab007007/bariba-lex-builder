/**
 * TAM-TAM Template: Split Screen Duo
 * Dual screen for reactions and collaborations
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
    {
      id: 'split-divider',
      type: 'texture',
      assetId: 'procedural:split-horizontal',
      trigger: 'always',
      config: {
        opacity: 1.0,
        blendMode: 'source-over'
      }
    },
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
    {
      id: 'sync-indicator',
      type: 'particles',
      assetId: 'procedural:sync-waves',
      trigger: 'beat',
      config: {
        x: 0.5,
        y: 0.5,
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
    version: '1.0.0',
    tags: ['split', 'duo', 'collaboration', 'reaction']
  }
};
