/**
 * TAM-TAM Template: Neon Glow
 * Vibrant neon aesthetic for modern content
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
      id: 'neon-border',
      type: 'texture',
      assetId: 'procedural:neon-frame',
      trigger: 'always',
      config: {
        opacity: 0.9,
        blendMode: 'screen'
      }
    },
    {
      id: 'glow-pulse',
      type: 'light-leak',
      assetId: 'procedural:light-leak-neon',
      trigger: 'beat',
      config: {
        opacity: 0.5,
        blendMode: 'screen',
        beatThreshold: 0.5
      }
    },
    {
      id: 'scanlines',
      type: 'texture',
      assetId: 'procedural:scanlines',
      trigger: 'always',
      config: {
        opacity: 0.15,
        blendMode: 'overlay'
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
    version: '1.0.0',
    tags: ['neon', 'glow', 'modern', 'vibrant']
  }
};
