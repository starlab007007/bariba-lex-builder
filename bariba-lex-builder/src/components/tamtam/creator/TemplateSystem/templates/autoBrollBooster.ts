/**
 * TAM-TAM Template: Auto B-Roll Booster
 * Enhances videos with automatic B-roll style cuts and transitions
 * REAL ASSETS ONLY - No procedural fallbacks
 */

import { Template } from '../types';

export const autoBrollBoosterTemplate: Template = {
  id: 'auto-broll-booster',
  name: 'Auto B-Roll Booster',
  nameBa: 'Vidéo Gbɛsiru',
  category: 'business',
  description: 'Améliore les vidéos avec des coupes et transitions style B-roll',
  descriptionBa: 'Gbɛsiru vidéo pɛ wéérù nɔɔra',
  thumbnail: '/assets/templates/auto-broll-thumb.jpg',
  duration: 45,
  isPremium: true,
  isNew: true,
  
  effects: [
    // Transition flash between cuts - REAL ASSET
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
    // Smooth transition with lens-flare - REAL ASSET
    {
      id: 'smooth-transition-leak',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-060.png',
      trigger: 'beat',
      config: {
        x: 0.3,
        y: 0.3,
        scale: 1.5,
        opacity: 0.5,
        blendMode: 'screen',
        beatThreshold: 0.7
      }
    },
    // Lower third text - TEXT EFFECT (no asset needed)
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
    // Pro accent flare - REAL ASSET
    {
      id: 'pro-accent',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-070.png',
      trigger: 'always',
      config: {
        x: 0.8,
        y: 0.2,
        scale: 0.6,
        opacity: 0.3,
        blendMode: 'screen'
      }
    },
    // Subtle corner flare - REAL ASSET
    {
      id: 'pro-vignette',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-080.png',
      trigger: 'always',
      config: {
        x: 0.1,
        y: 0.9,
        scale: 0.5,
        opacity: 0.25,
        blendMode: 'screen'
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
    version: '2.0.0',
    tags: ['broll', 'professional', 'transitions', 'business', 'editing']
  }
};
