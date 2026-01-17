/**
 * TAM-TAM Template: Glitch Art
 * Artistic digital glitch effects - Real assets only
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
      id: 'glitch-flare-1',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-350.png',
      trigger: 'beat',
      config: {
        x: 0.5,
        y: 0.5,
        scale: 0.8,
        opacity: 0.8,
        blendMode: 'screen',
        beatThreshold: 0.6
      }
    },
    {
      id: 'glitch-flare-2',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-375.png',
      trigger: 'beat',
      config: {
        x: 0.3,
        y: 0.4,
        scale: 0.3,
        opacity: 0.5,
        blendMode: 'screen',
        beatThreshold: 0.8
      }
    },
    {
      id: 'glitch-corner',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-400.png',
      trigger: 'always',
      config: {
        x: 0.9,
        y: 0.1,
        scale: 0.6,
        opacity: 0.6,
        blendMode: 'screen'
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
    tags: ['glitch', 'art', 'digital', 'distortion']
  }
};
