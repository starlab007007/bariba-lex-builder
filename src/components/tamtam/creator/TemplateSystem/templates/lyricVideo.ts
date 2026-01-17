/**
 * TAM-TAM Template: Lyric Video
 * Professional lyric video format
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
    {
      id: 'word-highlight',
      type: 'particles',
      assetId: 'procedural:word-glow',
      trigger: 'beat',
      config: {
        opacity: 0.7,
        blendMode: 'screen',
        beatThreshold: 0.3
      }
    },
    {
      id: 'ambient-particles',
      type: 'particles',
      assetId: 'procedural:floating-dust',
      trigger: 'always',
      config: {
        opacity: 0.3,
        blendMode: 'screen'
      }
    },
    {
      id: 'cinematic-bars',
      type: 'texture',
      assetId: 'procedural:letterbox',
      trigger: 'always',
      config: {
        opacity: 1.0,
        blendMode: 'source-over'
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
    tags: ['lyrics', 'video', 'music', 'professional']
  }
};
