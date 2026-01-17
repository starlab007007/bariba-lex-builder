/**
 * TAM-TAM Template: Voice Clone Hook
 * AI-powered voice cloning for engaging hooks
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
    {
      id: 'voice-waveform',
      type: 'particles',
      assetId: 'procedural:waveform-visualizer',
      trigger: 'always',
      config: {
        x: 0.5,
        y: 0.7,
        scale: 1.2,
        opacity: 0.8,
        blendMode: 'screen'
      }
    },
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
    {
      id: 'glow-overlay',
      type: 'light-leak',
      assetId: 'procedural:light-leak-golden',
      trigger: 'beat',
      config: {
        opacity: 0.3,
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
    version: '1.0.0',
    tags: ['voice', 'hook', 'marketing', 'ai', 'clone']
  }
};
