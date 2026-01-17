/**
 * TAM-TAM Template: AI Portrait Pro
 * AI-enhanced portrait effects
 */

import { Template } from '../types';

export const aiPortraitProTemplate: Template = {
  id: 'ai-portrait-pro',
  name: 'AI Portrait Pro',
  nameBa: 'Àwòrán AI',
  category: 'future',
  description: 'Amélioration portrait avec intelligence artificielle',
  descriptionBa: 'Ìmúdára àwòrán pẹ̀lú AI',
  thumbnail: '/assets/templates/ai-portrait-pro-thumb.jpg',
  duration: 15,
  isPremium: true,
  isNew: true,
  
  effects: [
    {
      id: 'ai-scan',
      type: 'particles',
      assetId: 'procedural:scan-lines',
      trigger: 'time',
      config: {
        opacity: 0.5,
        blendMode: 'screen',
        timeRange: [0, 3]
      }
    },
    {
      id: 'beauty-glow',
      type: 'light-leak',
      assetId: 'procedural:light-leak-soft',
      trigger: 'always',
      config: {
        opacity: 0.2,
        blendMode: 'screen'
      }
    },
    {
      id: 'ai-badge',
      type: 'text',
      assetId: 'text:ai-enhanced',
      trigger: 'always',
      config: {
        x: 0.9,
        y: 0.1,
        text: '🤖 AI',
        font: 'Orbitron',
        color: '#00FFFF',
        align: 'center'
      }
    },
    {
      id: 'tech-frame',
      type: 'texture',
      assetId: 'procedural:tech-corners',
      trigger: 'always',
      config: {
        opacity: 0.7,
        blendMode: 'screen'
      }
    }
  ],
  
  audio: {
    volume: 0.8,
    beatDetection: true
  },
  
  metadata: {
    author: 'TAM-TAM Team',
    version: '1.0.0',
    tags: ['ai', 'portrait', 'enhancement', 'beauty']
  }
};
