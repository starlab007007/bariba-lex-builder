/**
 * TAM-TAM Template: Dance Challenge
 * TikTok-style dance challenge format - Real assets only
 */

import { Template } from '../types';

export const danceChallengeTemplate: Template = {
  id: 'dance-challenge',
  name: 'Dance Challenge',
  nameBa: 'Ìpèníjà Ijó',
  category: 'music',
  description: 'Format défi danse style TikTok',
  descriptionBa: 'Ìpèníjà ijó',
  thumbnail: '/assets/templates/dance-challenge-thumb.jpg',
  duration: 15,
  isPremium: false,
  isNew: true,
  
  effects: [
    {
      id: 'beat-flash-flare',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-050.png',
      trigger: 'beat',
      config: {
        x: 0.5,
        y: 0.5,
        scale: 1.5,
        opacity: 0.5,
        blendMode: 'screen',
        beatThreshold: 0.5
      }
    },
    {
      id: 'confetti-flare',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-075.png',
      trigger: 'beat',
      config: {
        x: 0.3,
        y: 0.3,
        scale: 0.8,
        opacity: 0.6,
        blendMode: 'screen',
        beatThreshold: 0.8
      }
    },
    {
      id: 'challenge-hashtag',
      type: 'text',
      assetId: 'text:hashtag',
      trigger: 'always',
      config: {
        x: 0.5,
        y: 0.1,
        text: '#DanceChallenge',
        font: 'Poppins',
        color: '#FF1493',
        align: 'center'
      }
    },
    {
      id: 'energy-flare',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-100.png',
      trigger: 'beat',
      config: {
        x: 0.7,
        y: 0.7,
        scale: 0.7,
        opacity: 0.7,
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
    tags: ['dance', 'challenge', 'tiktok', 'viral']
  }
};
