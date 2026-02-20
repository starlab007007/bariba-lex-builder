/**
 * TAM-TAM Template: One-Take Pro (Kuaishou Horse Collection)
 * Premium single-shot video with dynamic transitions and effects
 * REAL ASSETS ONLY - No procedural fallbacks
 */

import { Template } from '../types';

export const oneTakeProTemplate: Template = {
  id: 'one-take-pro',
  name: 'One-Take Pro',
  nameBa: 'Dókè Dòkó Pro',
  category: 'business',
  description: 'Vidéo en plan-séquence premium avec effets dynamiques',
  descriptionBa: 'Vidéo dókè dòkó pɛ wéérù nɔɔra',
  thumbnail: '/assets/templates/one-take-pro-thumb.jpg',
  duration: 60,
  isPremium: true,
  isNew: false,
  
  effects: [
    // Opening flash - REAL ASSET
    {
      id: 'opening-flash',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-001.png',
      trigger: 'time',
      config: {
        x: 0.5,
        y: 0.3,
        scale: 2.0,
        opacity: 1.0,
        blendMode: 'screen',
        timeRange: [0, 0.5]
      }
    },
    // Dynamic accent flare - REAL ASSET
    {
      id: 'dynamic-accent',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-280.png',
      trigger: 'always',
      config: {
        x: 0.2,
        y: 0.4,
        scale: 0.8,
        opacity: 0.3,
        blendMode: 'screen'
      }
    },
    // Title text - TEXT EFFECT
    {
      id: 'title-text',
      type: 'text',
      assetId: 'text:title',
      trigger: 'time',
      config: {
        x: 0.5,
        y: 0.85,
        text: 'ONE-TAKE PRO',
        font: 'Montserrat',
        color: '#FFFFFF',
        strokeColor: '#000000',
        strokeWidth: 2,
        align: 'center',
        shadow: true,
        timeRange: [0.5, 4]
      }
    },
    // Midpoint emphasis flare - REAL ASSET
    {
      id: 'mid-flare',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-045.png',
      trigger: 'time',
      config: {
        x: 0.3,
        y: 0.4,
        scale: 1.5,
        opacity: 0.7,
        blendMode: 'screen',
        timeRange: [25, 35]
      }
    },
    // Closing transition flare - REAL ASSET
    {
      id: 'closing-flare',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-290.png',
      trigger: 'time',
      config: {
        x: 0.5,
        y: 0.5,
        scale: 2.5,
        opacity: 0.9,
        blendMode: 'screen',
        timeRange: [55, 60]
      }
    },
    // Subtle corner flare - REAL ASSET
    {
      id: 'pro-corner',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-300.png',
      trigger: 'always',
      config: {
        x: 0.9,
        y: 0.9,
        scale: 0.5,
        opacity: 0.25,
        blendMode: 'screen'
      }
    }
  ],
  
  audio: {
    volume: 0.9,
    fadeWithSpeech: true,
    beatDetection: true
  },
  
  metadata: {
    author: 'TAM-TAM Team',
    version: '2.0.0',
    tags: ['pro', 'business', 'kuaishou', 'premium', 'one-take']
  }
};
