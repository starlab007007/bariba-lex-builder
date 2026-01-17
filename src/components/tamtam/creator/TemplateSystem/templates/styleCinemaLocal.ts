/**
 * TAM-TAM Template: Style Cinéma Local
 * Cinematic African storytelling with film grain and warm tones
 */

import { Template } from '../types';

export const styleCinemaLocalTemplate: Template = {
  id: 'style-cinema-local',
  name: 'Style Cinéma Local',
  nameBa: 'Fíìmù Ilé',
  category: 'storytelling',
  description: 'Style cinématographique africain avec grain de film et tons chauds',
  descriptionBa: 'Fíìmù àṣà Áfíríkà pẹ̀lú ìmọ́lẹ̀ gbígbóná',
  thumbnail: '/assets/templates/style-cinema-local-thumb.jpg',
  duration: 45,
  isPremium: false,
  isNew: true,
  
  effects: [
    // Film grain overlay
    {
      id: 'film-grain',
      type: 'texture',
      assetId: 'procedural:grain',
      trigger: 'always',
      config: {
        opacity: 0.15,
        blendMode: 'overlay'
      }
    },
    // Warm color grade (sepia-ish)
    {
      id: 'warm-grade',
      type: 'texture',
      assetId: 'procedural:sepia',
      trigger: 'always',
      config: {
        opacity: 0.25,
        blendMode: 'overlay'
      }
    },
    // Vignette for cinematic look
    {
      id: 'cinema-vignette',
      type: 'texture',
      assetId: 'procedural:vignette',
      trigger: 'always',
      config: {
        opacity: 0.6,
        blendMode: 'multiply'
      }
    },
    // Subtle lens flare on keyword
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
    },
    // Letterbox bars for cinematic aspect
    {
      id: 'letterbox-top',
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
    volume: 0.8,
    fadeWithSpeech: true,
    beatDetection: false
  },
  
  metadata: {
    author: 'TAM-TAM Team',
    version: '1.0.0',
    tags: ['cinema', 'film', 'storytelling', 'african', 'warm']
  }
};
