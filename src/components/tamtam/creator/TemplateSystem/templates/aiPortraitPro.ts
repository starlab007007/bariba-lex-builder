/**
 * TAM-TAM Template: AI Portrait Pro
 * AI-enhanced portrait effects - Real assets only
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
      id: 'ai-scan-flare',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-200.png',
      trigger: 'time',
      config: {
        x: 0.5,
        y: 0.3,
        scale: 0.5,
        opacity: 0.5,
        blendMode: 'screen',
        timeRange: [0, 3]
      }
    },
    {
      id: 'beauty-glow-flare',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-225.png',
      trigger: 'always',
      config: {
        x: 0.5,
        y: 0.5,
        scale: 1.2,
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
      id: 'tech-corner-flare',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-250.png',
      trigger: 'always',
      config: {
        x: 0.1,
        y: 0.1,
        scale: 0.4,
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
    version: '2.0.0',
    tags: ['ai', 'portrait', 'enhancement', 'beauty']
  }
};
