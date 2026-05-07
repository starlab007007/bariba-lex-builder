/**
 * TAM-TAM Template: Style Cinéma Local
 * Cinematic African storytelling with film grain and warm tones
 * REAL ASSETS ONLY - No procedural fallbacks
 */

import { Template } from '../types';

export const styleCinemaLocalTemplate: Template = {
  id: 'style-cinema-local',
  name: 'Style Cinéma Local',
  nameBa: 'Fíìmù Yɛnu',
  category: 'storytelling',
  description: 'Style cinématographique africain avec grain de film et tons chauds',
  descriptionBa: 'Fíìmù kpɑɑru pɛ wéérù gbìgbóná',
  thumbnail: '/assets/templates/style-cinema-local-thumb.jpg',
  duration: 45,
  isPremium: false,
  isNew: true,
  
  effects: [
    // Film grain flare overlay - REAL ASSET
    {
      id: 'film-grain-flare',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-440.png',
      trigger: 'always',
      config: {
        x: 0.5,
        y: 0.5,
        scale: 2.0,
        opacity: 0.1,
        blendMode: 'overlay'
      }
    },
    // Warm color grade flare - REAL ASSET
    {
      id: 'warm-grade-flare',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-050.png',
      trigger: 'always',
      config: {
        x: 0.3,
        y: 0.3,
        scale: 1.5,
        opacity: 0.2,
        blendMode: 'screen'
      }
    },
    // Vignette corner flare - REAL ASSET
    {
      id: 'cinema-vignette-flare',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-450.png',
      trigger: 'always',
      config: {
        x: 0.1,
        y: 0.9,
        scale: 0.6,
        opacity: 0.4,
        blendMode: 'multiply'
      }
    },
    // Subtle emotion flare on keyword - REAL ASSET
    {
      id: 'emotion-flare',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-030.png',
      trigger: 'keyword',
      config: {
        x: 0.8,
        y: 0.2,
        scale: 1.2,
        opacity: 0.5,
        blendMode: 'screen',
        keywords: ['amour', 'love', 'espoir', 'hope', 'lumière', 'light']
      }
    }
  ],
  
  audio: {
    volume: 0.8,
    fadeWithSpeech: true,
    beatDetection: false
  },
  
  metadata: {
    author: 'TAM-TAM Team',
    version: '2.0.0',
    tags: ['cinema', 'film', 'storytelling', 'african', 'warm']
  }
};
