/**
 * TAM-TAM Template: Lyric Video
 * Professional lyric video format
 * REAL ASSETS ONLY - No procedural fallbacks
 */

import { Template } from '../types';

export const lyricVideoTemplate: Template = {
  id: 'lyric-video',
  name: 'Lyric Video',
  nameBa: 'Fídíò Orin',
  category: 'music',
  description: 'Vidéo paroles professionnelle',
  descriptionBa: 'Fídíò pẹ̀lú ọ̀rọ̀ orin',
  thumbnail: '/assets/templates/lyric-video-thumb.jpg',
  duration: 180,
  isPremium: true,
  isNew: true,
  
  effects: [
    // Lyrics center - TEXT EFFECT
    {
      id: 'lyrics-center',
      type: 'text',
      assetId: 'text:lyrics-center',
      trigger: 'always',
      config: {
        x: 0.5,
        y: 0.5,
        text: '',
        font: 'Montserrat',
        color: '#FFFFFF',
        align: 'center',
        fontSize: 48
      }
    },
    // Word highlight flare - REAL ASSET
    {
      id: 'word-highlight',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-190.png',
      trigger: 'beat',
      config: {
        x: 0.5,
        y: 0.5,
        scale: 0.8,
        opacity: 0.5,
        blendMode: 'screen',
        beatThreshold: 0.3
      }
    },
    // Ambient particles flare - REAL ASSET
    {
      id: 'ambient-flare',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-200.png',
      trigger: 'always',
      config: {
        x: 0.2,
        y: 0.3,
        scale: 0.6,
        opacity: 0.3,
        blendMode: 'screen'
      }
    },
    // Secondary ambient - REAL ASSET
    {
      id: 'ambient-flare-2',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-210.png',
      trigger: 'always',
      config: {
        x: 0.8,
        y: 0.7,
        scale: 0.6,
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
    tags: ['lyrics', 'video', 'music', 'professional']
  }
};
