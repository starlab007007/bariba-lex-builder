/**
 * TAM-TAM Template: Magic Transform
 * Magical transformation effects with particles and glows
 * REAL ASSETS ONLY - No procedural fallbacks
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
    // Magic dust flare - REAL ASSET
    {
      id: 'magic-dust',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-220.png',
      trigger: 'always',
      config: {
        x: 0.3,
        y: 0.4,
        scale: 0.7,
        opacity: 0.5,
        blendMode: 'screen'
      }
    },
    // Transformation burst - REAL ASSET
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
    // Rainbow leak flare - REAL ASSET
    {
      id: 'rainbow-flare',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-230.png',
      trigger: 'always',
      config: {
        x: 0.7,
        y: 0.3,
        scale: 1.0,
        opacity: 0.35,
        blendMode: 'screen'
      }
    },
    // Sparkle ring flare - REAL ASSET
    {
      id: 'sparkle-ring',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-240.png',
      trigger: 'keyword',
      config: {
        x: 0.5,
        y: 0.5,
        scale: 1.5,
        opacity: 0.8,
        blendMode: 'screen',
        keywords: ['magie', 'magic', 'transform', 'change', 'wow']
      }
    },
    // Edge glow flare - REAL ASSET
    {
      id: 'edge-glow',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-250.png',
      trigger: 'always',
      config: {
        x: 0.1,
        y: 0.9,
        scale: 0.8,
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
    version: '2.0.0',
    tags: ['magic', 'transform', 'particles', 'fantasy', 'glow']
  }
};
