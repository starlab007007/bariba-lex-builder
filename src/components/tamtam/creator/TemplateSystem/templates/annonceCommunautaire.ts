/**
 * TAM-TAM Template: Annonce Communautaire v3.0
 * Community announcement format - Full Envato assets integration
 * REAL ASSETS ONLY - No procedural fallbacks
 */

import { Template } from '../types';

export const annonceCommunautaireTemplate: Template = {
  id: 'annonce-communautaire',
  name: 'Annonce Communautaire',
  nameBa: 'Ìkéde Àwùjọ',
  category: 'business',
  description: 'Annonces et informations communautaires',
  descriptionBa: 'Ìròyìn fún àwùjọ',
  thumbnail: '/assets/templates/annonce-communautaire-thumb.jpg',
  duration: 30,
  isPremium: false,
  isNew: true,
  
  effects: [
    // === LENS FLARES ===
    {
      id: 'announcement-flare',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-045.png',
      trigger: 'always',
      config: { x: 0.5, y: 0.1, scale: 1.5, opacity: 0.6, blendMode: 'screen' }
    },
    {
      id: 'urgent-pulse',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-090.png',
      trigger: 'beat',
      config: { x: 0.5, y: 0.5, scale: 1.8, opacity: 0.3, blendMode: 'screen', beatThreshold: 0.5 }
    },

    // === LIGHT LEAKS ===
    {
      id: 'announce-leak-1',
      type: 'light-leak',
      assetId: 'light-leak:leak-005.mp4',
      trigger: 'beat',
      config: { x: 0.5, y: 0.5, scale: 1.4, opacity: 0.35, blendMode: 'screen', beatThreshold: 0.6 }
    },

    // === PARTICLES ===
    {
      id: 'announce-particles',
      type: 'particles',
      assetId: 'particles:particle-015.webm',
      trigger: 'always',
      config: { x: 0.5, y: 0.5, scale: 1.2, opacity: 0.25, blendMode: 'screen' }
    },

    // === TEXT ===
    {
      id: 'megaphone-icon',
      type: 'text',
      assetId: 'text:megaphone',
      trigger: 'time',
      config: { x: 0.5, y: 0.15, text: '📢', font: 'System', scale: 2, timeRange: [0, 3], animation: 'bounce' }
    },
    {
      id: 'info-text',
      type: 'text',
      assetId: 'text:info',
      trigger: 'always',
      config: { x: 0.5, y: 0.9, text: 'Information Importante', font: 'Roboto', color: '#FFFFFF', align: 'center' }
    }
  ],
  
  audio: {
    volume: 1.0,
    beatDetection: true
  },
  
  metadata: {
    author: 'TAM-TAM Team',
    version: '3.0.0',
    tags: ['announcement', 'community', 'news', 'info']
  }
};
