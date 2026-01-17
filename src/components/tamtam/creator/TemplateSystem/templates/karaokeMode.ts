/**
 * TAM-TAM Template: Karaoke Mode
 * Lyric video with synchronized text
 */

import { Template } from '../types';

export const karaokeModeTemplate: Template = {
  id: 'karaoke-mode',
  name: 'Karaoke Mode',
  nameBa: 'Orin Karaoke',
  category: 'music',
  description: 'Paroles synchronisées style karaoké',
  descriptionBa: 'Orin pẹ̀lú àkọlé',
  thumbnail: '/assets/templates/karaoke-mode-thumb.jpg',
  duration: 60,
  isPremium: true,
  isNew: true,
  
  effects: [
    {
      id: 'lyrics-main',
      type: 'text',
      assetId: 'text:lyrics-main',
      trigger: 'always',
      config: {
        x: 0.5,
        y: 0.7,
        text: '',
        font: 'Poppins',
        color: '#FFFFFF',
        align: 'center',
        fontSize: 32
      }
    },
    {
      id: 'lyrics-highlight',
      type: 'text',
      assetId: 'text:lyrics-highlight',
      trigger: 'beat',
      config: {
        x: 0.5,
        y: 0.7,
        text: '',
        font: 'Poppins',
        color: '#FFD700',
        align: 'center',
        fontSize: 32,
        beatThreshold: 0.3
      }
    },
    {
      id: 'music-visualizer',
      type: 'particles',
      assetId: 'procedural:eq-bars',
      trigger: 'beat',
      config: {
        x: 0.5,
        y: 0.9,
        opacity: 0.6,
        blendMode: 'screen',
        beatThreshold: 0.2
      }
    },
    {
      id: 'stage-lights',
      type: 'light-leak',
      assetId: 'procedural:light-leak-multicolor',
      trigger: 'beat',
      config: {
        opacity: 0.3,
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
    tags: ['karaoke', 'lyrics', 'music', 'sing']
  }
};
