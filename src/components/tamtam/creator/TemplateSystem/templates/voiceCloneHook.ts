/**
 * TAM-TAM Template: Voice Clone Hook
 * AI-powered voice cloning for engaging hooks
 * REAL ASSETS ONLY - No procedural fallbacks
 */

import { Template } from '../types';

export const voiceCloneHookTemplate: Template = {
  id: 'voice-clone-hook',
  name: 'Voice Clone Hook',
  nameBa: 'Ohùn Kíkó',
  category: 'business',
  description: 'Accroche vocale avec clonage IA pour marketing',
  descriptionBa: 'Ohùn kíkó pẹ̀lú AI',
  thumbnail: '/assets/templates/voice-clone-hook-thumb.jpg',
  duration: 15,
  isPremium: true,
  isNew: true,
  
  effects: [
    // Voice waveform flare - REAL ASSET
    {
      id: 'voice-waveform',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-380.png',
      trigger: 'always',
      config: {
        x: 0.5,
        y: 0.7,
        scale: 1.2,
        opacity: 0.6,
        blendMode: 'screen'
      }
    },
    // Hook text - TEXT EFFECT
    {
      id: 'hook-text',
      type: 'text',
      assetId: 'text:hook',
      trigger: 'time',
      config: {
        x: 0.5,
        y: 0.3,
        text: '🎤 Écoutez...',
        font: 'Poppins',
        color: '#FFD700',
        align: 'center',
        timeRange: [0, 3]
      }
    },
    // Glow overlay flare - REAL ASSET
    {
      id: 'glow-overlay',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-050.png',
      trigger: 'beat',
      config: {
        x: 0.3,
        y: 0.4,
        scale: 1.0,
        opacity: 0.4,
        blendMode: 'screen',
        beatThreshold: 0.6
      }
    },
    // Secondary glow - REAL ASSET
    {
      id: 'glow-overlay-2',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-060.png',
      trigger: 'beat',
      config: {
        x: 0.7,
        y: 0.5,
        scale: 0.8,
        opacity: 0.35,
        blendMode: 'screen',
        beatThreshold: 0.6
      }
    }
  ],
  
  audio: {
    volume: 1.0,
    beatDetection: true
  },
  
  metadata: {
    author: 'TAM-TAM Team',
    version: '2.0.0',
    tags: ['voice', 'hook', 'marketing', 'ai', 'clone']
  }
};
