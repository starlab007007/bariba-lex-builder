/**
 * TAM-TAM Template: DJ Mix Visual
 * Professional DJ/music producer aesthetic - Real assets only
 */

import { Template } from '../types';

export const djMixVisualTemplate: Template = {
  id: 'dj-mix-visual',
  name: 'DJ Mix Visual',
  nameBa: 'Wéérù DJ',
  category: 'music',
  description: 'Visuel professionnel pour DJ et producteurs',
  descriptionBa: 'Wéérù sɔmburu fún DJ',
  thumbnail: '/assets/templates/dj-mix-visual-thumb.jpg',
  duration: 45,
  isPremium: true,
  isNew: true,
  
  effects: [
    {
      id: 'eq-flare',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-320.png',
      trigger: 'beat',
      config: { x: 0.5, y: 0.85, scale: 1.5, opacity: 0.8, blendMode: 'screen', beatThreshold: 0.2 }
    },
    {
      id: 'waveform-flare',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-340.png',
      trigger: 'always',
      config: { x: 0.5, y: 0.5, scale: 1.0, opacity: 0.4, blendMode: 'screen' }
    },
    // Light Leak effects - strobe/club effect
    {
      id: 'strobe-leak-1',
      type: 'light-leak',
      assetId: 'light-leak:leak-030.webm',
      trigger: 'beat',
      config: { x: 0.5, y: 0.5, scale: 2.0, opacity: 0.5, blendMode: 'screen', beatThreshold: 0.4 }
    },
    {
      id: 'strobe-leak-2',
      type: 'light-leak',
      assetId: 'light-leak:leak-005.mp4',
      trigger: 'beat',
      config: { x: 0.7, y: 0.3, scale: 1.5, opacity: 0.4, blendMode: 'screen', beatThreshold: 0.8 }
    },
    {
      id: 'dj-badge',
      type: 'text',
      assetId: 'text:dj',
      trigger: 'always',
      config: { x: 0.5, y: 0.1, text: '🎧 NOW PLAYING', font: 'Bebas Neue', color: '#FFFFFF', align: 'center' }
    }
  ],
  
  audio: {
    volume: 1.0,
    beatDetection: true
  },
  
  metadata: {
    author: 'TAM-TAM Team',
    version: '2.0.0',
    tags: ['dj', 'music', 'producer', 'mix']
  }
};
