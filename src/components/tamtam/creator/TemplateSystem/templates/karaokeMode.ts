/**
 * TAM-TAM Template: Karaoke Mode
 * Lyric video with synchronized text
 * REAL ASSETS ONLY - No procedural fallbacks
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
    // Lyrics main - TEXT EFFECT
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
    // Lyrics highlight - TEXT EFFECT
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
    // Music visualizer flare - REAL ASSET
    {
      id: 'music-visualizer',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-130.png',
      trigger: 'beat',
      config: {
        x: 0.5,
        y: 0.9,
        scale: 1.5,
        opacity: 0.6,
        blendMode: 'screen',
        beatThreshold: 0.2
      }
    },
    // Stage lights flare - REAL ASSET
    {
      id: 'stage-lights',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-140.png',
      trigger: 'beat',
      config: {
        x: 0.2,
        y: 0.3,
        scale: 1.2,
        opacity: 0.4,
        blendMode: 'screen',
        beatThreshold: 0.6
      }
    },
    // Secondary stage light - REAL ASSET
    {
      id: 'stage-lights-2',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-150.png',
      trigger: 'beat',
      config: {
        x: 0.8,
        y: 0.3,
        scale: 1.2,
        opacity: 0.4,
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
    tags: ['karaoke', 'lyrics', 'music', 'sing']
  }
};
