/**
 * TAM-TAM Template: Dance Challenge
 * TikTok-style dance challenge format
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
      id: 'beat-flash',
      type: 'light-leak',
      assetId: 'procedural:light-leak-flash',
      trigger: 'beat',
      config: {
        opacity: 0.5,
        blendMode: 'screen',
        beatThreshold: 0.5
      }
    },
    {
      id: 'confetti',
      type: 'particles',
      assetId: 'procedural:confetti-burst',
      trigger: 'beat',
      config: {
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
      id: 'energy-border',
      type: 'texture',
      assetId: 'procedural:energy-frame',
      trigger: 'beat',
      config: {
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
    version: '1.0.0',
    tags: ['dance', 'challenge', 'tiktok', 'viral']
  }
};
