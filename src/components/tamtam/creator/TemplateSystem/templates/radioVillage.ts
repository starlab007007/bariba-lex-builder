/**
 * TAM-TAM Template: Radio Village Pro
 * Professional radio broadcast style
 */

import { Template } from '../types';

export const radioVillageTemplate: Template = {
  id: 'radio-village',
  name: 'Radio Village Pro',
  nameBa: 'Rédíò Abúlé',
  category: 'business',
  description: 'Format radio professionnel avec visuel',
  descriptionBa: 'Ètò rédíò ọjọgbọ́n',
  thumbnail: '/assets/templates/radio-village-thumb.jpg',
  duration: 60,
  isPremium: true,
  isNew: true,
  
  effects: [
    {
      id: 'radio-waves',
      type: 'particles',
      assetId: 'procedural:radio-waves',
      trigger: 'beat',
      config: {
        x: 0.5,
        y: 0.5,
        scale: 2,
        opacity: 0.4,
        blendMode: 'screen',
        beatThreshold: 0.4
      }
    },
    {
      id: 'on-air-badge',
      type: 'text',
      assetId: 'text:on-air',
      trigger: 'always',
      config: {
        x: 0.9,
        y: 0.1,
        text: '🔴 ON AIR',
        font: 'Oswald',
        color: '#FF0000',
        align: 'center',
        animation: 'pulse'
      }
    },
    {
      id: 'waveform-visualizer',
      type: 'particles',
      assetId: 'procedural:waveform',
      trigger: 'always',
      config: {
        x: 0.5,
        y: 0.8,
        scale: 1.5,
        opacity: 0.7,
        blendMode: 'screen'
      }
    },
    {
      id: 'radio-vignette',
      type: 'texture',
      assetId: 'procedural:dark-vignette',
      trigger: 'always',
      config: {
        opacity: 0.5,
        blendMode: 'multiply'
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
    tags: ['radio', 'broadcast', 'professional', 'audio']
  }
};
