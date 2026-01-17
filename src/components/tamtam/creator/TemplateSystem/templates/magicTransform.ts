/**
 * TAM-TAM Template: Magic Transform
 * Magical transformation effects with particles and glows
 */

import { Template } from '../types';

export const magicTransformTemplate: Template = {
  id: 'magic-transform',
  name: 'Magic Transform',
  nameBa: 'Ìyípadà Àjé',
  category: 'future',
  description: 'Effets de transformation magique avec particules et lueurs',
  descriptionBa: 'Àwọn ìṣe ìyípadà pẹ̀lú ìmọ́lẹ̀ àjé',
  thumbnail: '/assets/templates/magic-transform-thumb.jpg',
  duration: 20,
  isPremium: true,
  isNew: true,
  
  effects: [
    // Magic dust particles always
    {
      id: 'magic-dust',
      type: 'particles',
      assetId: 'procedural:magic-dust',
      trigger: 'always',
      config: {
        opacity: 0.5,
        blendMode: 'screen'
      }
    },
    // Transformation burst on beat
    {
      id: 'transform-burst',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-020.png',
      trigger: 'beat',
      config: {
        x: 0.5,
        y: 0.5,
        scale: 2.5,
        opacity: 1.0,
        blendMode: 'screen',
        beatThreshold: 0.8
      }
    },
    // Rainbow light leak
    {
      id: 'rainbow-leak',
      type: 'light-leak',
      assetId: 'procedural:rainbow-leak',
      trigger: 'always',
      config: {
        opacity: 0.35,
        blendMode: 'screen'
      }
    },
    // Sparkle ring effect
    {
      id: 'sparkle-ring',
      type: 'particles',
      assetId: 'procedural:sparkle-ring',
      trigger: 'keyword',
      config: {
        x: 0.5,
        y: 0.5,
        scale: 1.5,
        opacity: 0.8,
        keywords: ['magie', 'magic', 'transform', 'change', 'wow']
      }
    },
    // Glow edges
    {
      id: 'edge-glow',
      type: 'texture',
      assetId: 'procedural:edge-glow',
      trigger: 'always',
      config: {
        opacity: 0.4,
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
    version: '1.0.0',
    tags: ['magic', 'transform', 'particles', 'fantasy', 'glow']
  }
};
