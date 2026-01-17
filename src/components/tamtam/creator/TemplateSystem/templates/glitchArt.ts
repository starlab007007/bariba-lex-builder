/**
 * TAM-TAM Template: Glitch Art
 * Artistic digital glitch effects
 */

import { Template } from '../types';

export const glitchArtTemplate: Template = {
  id: 'glitch-art',
  name: 'Glitch Art',
  nameBa: 'Àwòrán Glitch',
  category: 'future',
  description: 'Distorsions artistiques numériques',
  descriptionBa: 'Àwòrán dídárú',
  thumbnail: '/assets/templates/glitch-art-thumb.jpg',
  duration: 15,
  isPremium: true,
  isNew: true,
  
  effects: [
    {
      id: 'rgb-split',
      type: 'particles',
      assetId: 'procedural:rgb-shift',
      trigger: 'beat',
      config: {
        opacity: 0.8,
        blendMode: 'screen',
        beatThreshold: 0.6
      }
    },
    {
      id: 'scanline-noise',
      type: 'texture',
      assetId: 'procedural:static-noise',
      trigger: 'beat',
      config: {
        opacity: 0.3,
        blendMode: 'overlay',
        beatThreshold: 0.7
      }
    },
    {
      id: 'displacement',
      type: 'particles',
      assetId: 'procedural:pixel-sort',
      trigger: 'beat',
      config: {
        opacity: 0.5,
        blendMode: 'screen',
        beatThreshold: 0.8
      }
    },
    {
      id: 'vhs-frame',
      type: 'texture',
      assetId: 'procedural:vhs-border',
      trigger: 'always',
      config: {
        opacity: 0.6,
        blendMode: 'source-over'
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
    tags: ['glitch', 'art', 'digital', 'distortion']
  }
};
