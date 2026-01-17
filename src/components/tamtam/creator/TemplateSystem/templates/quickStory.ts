/**
 * TAM-TAM Template: Quick Story
 * Fast-paced storytelling for short social content
 * REAL ASSETS ONLY - No procedural fallbacks
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
    // Quick intro flash - REAL ASSET
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
    // Beat-reactive sparkles flare - REAL ASSET
    {
      id: 'sparkle-beats',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-340.png',
      trigger: 'beat',
      config: {
        x: 0.3,
        y: 0.5,
        scale: 0.8,
        opacity: 0.6,
        blendMode: 'screen',
        beatThreshold: 0.5
      }
    },
    // Secondary sparkle - REAL ASSET
    {
      id: 'sparkle-beats-2',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-350.png',
      trigger: 'beat',
      config: {
        x: 0.7,
        y: 0.6,
        scale: 0.7,
        opacity: 0.5,
        blendMode: 'screen',
        beatThreshold: 0.5
      }
    },
    // CTA text - TEXT EFFECT
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
    // Corner accent - REAL ASSET
    {
      id: 'corner-accent',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-360.png',
      trigger: 'always',
      config: {
        x: 0.9,
        y: 0.1,
        scale: 0.4,
        opacity: 0.3,
        blendMode: 'screen'
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
    tags: ['quick', 'short', 'social', 'story', 'tiktok']
  }
};
