/**
 * TAM-TAM Template: Auto B-Roll Booster
 * Enhances videos with automatic B-roll style cuts and transitions
 */

import { Template } from '../types';

export const autoBrollBoosterTemplate: Template = {
  id: 'auto-broll-booster',
  name: 'Auto B-Roll Booster',
  nameBa: 'Àfikún Fídíò Aládàánídá',
  category: 'business',
  description: 'Améliore les vidéos avec des coupes et transitions style B-roll',
  descriptionBa: 'Mú fídíò dára sí pẹ̀lú àwọn ìyípadà',
  thumbnail: '/assets/templates/auto-broll-thumb.jpg',
  duration: 45,
  isPremium: true,
  isNew: true,
  
  effects: [
    // Transition flash between cuts
    {
      id: 'cut-flash',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-035.png',
      trigger: 'beat',
      config: {
        x: 0.5,
        y: 0.5,
        scale: 2.0,
        opacity: 0.8,
        blendMode: 'screen',
        beatThreshold: 0.75
      }
    },
    // Smooth light leak transitions
    {
      id: 'smooth-transition-leak',
      type: 'light-leak',
      assetId: 'procedural:light-leak-smooth',
      trigger: 'beat',
      config: {
        opacity: 0.5,
        blendMode: 'screen',
        beatThreshold: 0.7
      }
    },
    // Professional lower third
    {
      id: 'lower-third-bg',
      type: 'texture',
      assetId: 'procedural:lower-third',
      trigger: 'time',
      config: {
        y: 0.85,
        opacity: 0.8,
        blendMode: 'source-over',
        timeRange: [2, 8]
      }
    },
    // Lower third text
    {
      id: 'lower-third-text',
      type: 'text',
      assetId: 'text:lower-third',
      trigger: 'time',
      config: {
        x: 0.05,
        y: 0.88,
        text: 'Votre Titre Ici',
        font: 'Montserrat',
        color: '#FFFFFF',
        align: 'left',
        shadow: true,
        timeRange: [2, 8]
      }
    },
    // Film grain for professional look
    {
      id: 'pro-grain',
      type: 'texture',
      assetId: 'procedural:grain',
      trigger: 'always',
      config: {
        opacity: 0.08,
        blendMode: 'overlay'
      }
    },
    // Subtle vignette
    {
      id: 'pro-vignette',
      type: 'texture',
      assetId: 'procedural:vignette',
      trigger: 'always',
      config: {
        opacity: 0.4,
        blendMode: 'multiply'
      }
    }
  ],
  
  audio: {
    volume: 0.85,
    fadeWithSpeech: true,
    beatDetection: true
  },
  
  metadata: {
    author: 'TAM-TAM Team',
    version: '1.0.0',
    tags: ['broll', 'professional', 'transitions', 'business', 'editing']
  }
};
