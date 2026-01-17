/**
 * TAM-TAM Template: Quick Story
 * Fast-paced storytelling for short social content
 */

import { Template } from '../types';

export const quickStoryTemplate: Template = {
  id: 'quick-story',
  name: 'Quick Story',
  nameBa: 'Ìtàn Kíákíá',
  category: 'storytelling',
  description: 'Narration rapide pour contenus courts et impactants',
  descriptionBa: 'Ìtàn kékeré tó lágbára',
  thumbnail: '/assets/templates/quick-story-thumb.jpg',
  duration: 15,
  isPremium: false,
  isNew: true,
  
  effects: [
    // Quick intro flash
    {
      id: 'intro-flash',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-010.png',
      trigger: 'time',
      config: {
        x: 0.5,
        y: 0.4,
        scale: 1.8,
        opacity: 0.9,
        blendMode: 'screen',
        timeRange: [0, 0.3]
      }
    },
    // Beat-reactive sparkles
    {
      id: 'sparkle-beats',
      type: 'particles',
      assetId: 'procedural:sparkles',
      trigger: 'beat',
      config: {
        opacity: 0.6,
        blendMode: 'screen',
        beatThreshold: 0.5
      }
    },
    // Text call-to-action
    {
      id: 'cta-text',
      type: 'text',
      assetId: 'text:cta',
      trigger: 'time',
      config: {
        x: 0.5,
        y: 0.9,
        text: '👆 Suivez pour plus!',
        font: 'Nunito',
        color: '#FFFFFF',
        strokeColor: '#FF4444',
        strokeWidth: 3,
        align: 'center',
        shadow: true,
        timeRange: [12, 15]
      }
    },
    // Light vignette
    {
      id: 'light-vignette',
      type: 'texture',
      assetId: 'procedural:vignette',
      trigger: 'always',
      config: {
        opacity: 0.3,
        blendMode: 'multiply'
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
    tags: ['quick', 'short', 'social', 'story', 'tiktok']
  }
};
