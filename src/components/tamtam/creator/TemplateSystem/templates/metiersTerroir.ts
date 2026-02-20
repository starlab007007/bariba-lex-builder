/**
 * TAM-TAM Template: Métiers du Terroir
 * Showcase traditional crafts and trades - Real assets only
 */

import { Template } from '../types';

export const metiersTerroirTemplate: Template = {
  id: 'metiers-terroir',
  name: 'Métiers du Terroir',
  nameBa: 'Sɔmburu Kpɑɑru',
  category: 'education',
  description: 'Présentation des métiers traditionnels',
  descriptionBa: 'Sɔmburu bɔ̀ɔ̀rɛ̀nu fíhàn',
  thumbnail: '/assets/templates/metiers-terroir-thumb.jpg',
  duration: 45,
  isPremium: false,
  isNew: true,
  
  effects: [
    {
      id: 'title-banner',
      type: 'text',
      assetId: 'text:craft-title',
      trigger: 'time',
      config: {
        x: 0.5,
        y: 0.15,
        text: '🛠️ Artisan',
        font: 'Playfair Display',
        color: '#8B4513',
        align: 'center',
        timeRange: [0, 5]
      }
    },
    {
      id: 'warm-flare',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-080.png',
      trigger: 'always',
      config: {
        x: 0.8,
        y: 0.2,
        scale: 0.5,
        opacity: 0.15,
        blendMode: 'screen'
      }
    },
    {
      id: 'dust-flare',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-105.png',
      trigger: 'always',
      config: {
        x: 0.3,
        y: 0.6,
        scale: 0.4,
        opacity: 0.3,
        blendMode: 'screen'
      }
    }
  ],
  
  audio: {
    volume: 0.6,
    beatDetection: false
  },
  
  metadata: {
    author: 'TAM-TAM Team',
    version: '2.0.0',
    tags: ['craft', 'tradition', 'artisan', 'education']
  }
};
