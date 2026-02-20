/**
 * TAM-TAM Template: Dance Challenge v3.0
 * TikTok-style dance challenge format - Full Envato assets
 * REAL ASSETS ONLY - No procedural fallbacks
 */

import { Template } from '../types';

export const danceChallengeTemplate: Template = {
  id: 'dance-challenge',
  name: 'Dance Challenge',
  nameBa: 'Yiru Gɔnɔ',
  category: 'music',
  description: 'Format défi danse style TikTok',
  descriptionBa: 'Yiru gɔnɔ kpuro',
  thumbnail: '/assets/templates/dance-challenge-thumb.jpg',
  duration: 15,
  isPremium: false,
  isNew: true,
  
  effects: [
    // === LENS FLARES ===
    {
      id: 'beat-flash-flare',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-050.png',
      trigger: 'beat',
      config: { x: 0.5, y: 0.5, scale: 1.5, opacity: 0.5, blendMode: 'screen', beatThreshold: 0.5 }
    },
    {
      id: 'confetti-flare',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-075.png',
      trigger: 'beat',
      config: { x: 0.3, y: 0.3, scale: 0.8, opacity: 0.6, blendMode: 'screen', beatThreshold: 0.8 }
    },
    {
      id: 'energy-flare',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-100.png',
      trigger: 'beat',
      config: { x: 0.7, y: 0.7, scale: 0.7, opacity: 0.7, blendMode: 'screen', beatThreshold: 0.6 }
    },

    // === LIGHT LEAKS - Club vibes ===
    {
      id: 'dance-leak-1',
      type: 'light-leak',
      assetId: 'light-leak:leak-035.webm',
      trigger: 'beat',
      config: { x: 0.5, y: 0.5, scale: 1.6, opacity: 0.45, blendMode: 'screen', beatThreshold: 0.4 }
    },
    {
      id: 'dance-leak-2',
      type: 'light-leak',
      assetId: 'light-leak:leak-005.mp4',
      trigger: 'beat',
      config: { x: 0.7, y: 0.3, scale: 1.2, opacity: 0.35, blendMode: 'screen', beatThreshold: 0.7 }
    },

    // === PARTICLES - Dance energy ===
    {
      id: 'dance-particles',
      type: 'particles',
      assetId: 'particles:particle-030.webm',
      trigger: 'beat',
      config: { x: 0.5, y: 0.5, scale: 2.0, opacity: 0.5, blendMode: 'screen', beatThreshold: 0.6 }
    },

    // === TEXTURES - Club atmosphere ===
    {
      id: 'club-texture',
      type: 'texture',
      assetId: 'textures:texture-100.mp4',
      trigger: 'always',
      config: { x: 0.5, y: 0.5, scale: 1.0, opacity: 0.15, blendMode: 'screen' }
    },

    // === TEXT ===
    {
      id: 'challenge-hashtag',
      type: 'text',
      assetId: 'text:hashtag',
      trigger: 'always',
      config: { x: 0.5, y: 0.1, text: '#DanceChallenge', font: 'Poppins', color: '#FF1493', align: 'center' }
    }
  ],
  
  audio: {
    volume: 1.0,
    beatDetection: true
  },
  
  metadata: {
    author: 'TAM-TAM Team',
    version: '3.0.0',
    tags: ['dance', 'challenge', 'tiktok', 'viral']
  }
};
