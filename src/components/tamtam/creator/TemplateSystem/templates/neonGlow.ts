/**
 * TAM-TAM Template: Neon Glow
 * Vibrant neon aesthetic for modern content - Real assets only
 */

import { Template } from '../types';

export const neonGlowTemplate: Template = {
  id: 'neon-glow',
  name: 'Neon Glow',
  nameBa: 'Ìmọ́lẹ̀ Neon',
  category: 'future',
  description: 'Esthétique néon vibrante et moderne',
  descriptionBa: 'Àwòrán ìmọ́lẹ̀ neon',
  thumbnail: '/assets/templates/neon-glow-thumb.jpg',
  duration: 30,
  isPremium: true,
  isNew: true,
  
  effects: [
    {
      id: 'neon-border-flare',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-450.png',
      trigger: 'always',
      config: {
        x: 0.5,
        y: 0.1,
        scale: 0.9,
        opacity: 0.9,
        blendMode: 'screen'
      }
    },
    {
      id: 'glow-pulse-flare',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-425.png',
      trigger: 'beat',
      config: {
        x: 0.5,
        y: 0.5,
        scale: 1.5,
        opacity: 0.5,
        blendMode: 'screen',
        beatThreshold: 0.5
      }
    },
    {
      id: 'corner-flare',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-410.png',
      trigger: 'always',
      config: {
        x: 0.9,
        y: 0.9,
        scale: 0.4,
        opacity: 0.15,
        blendMode: 'screen'
      }
    },
    {
      id: 'neon-text',
      type: 'text',
      assetId: 'text:neon',
      trigger: 'always',
      config: {
        x: 0.5,
        y: 0.9,
        text: '✨ GLOW ✨',
        font: 'Orbitron',
        color: '#FF00FF',
        align: 'center',
        glow: true
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
    tags: ['neon', 'glow', 'modern', 'vibrant']
  }
};
