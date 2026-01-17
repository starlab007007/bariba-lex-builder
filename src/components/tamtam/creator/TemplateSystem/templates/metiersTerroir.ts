/**
 * TAM-TAM Template: Métiers du Terroir
 * Showcase traditional crafts and trades
 */

import { Template } from '../types';

export const metiersTerroirTemplate: Template = {
  id: 'metiers-terroir',
  name: 'Métiers du Terroir',
  nameBa: 'Iṣẹ́ Ìbílẹ̀',
  category: 'education',
  description: 'Présentation des métiers traditionnels',
  descriptionBa: 'Ìfihàn iṣẹ́ ìbílẹ̀',
  thumbnail: '/assets/templates/metiers-terroir-thumb.jpg',
  duration: 45,
  isPremium: false,
  isNew: true,
  
  effects: [
    {
      id: 'craft-frame',
      type: 'texture',
      assetId: 'procedural:wood-border',
      trigger: 'always',
      config: {
        opacity: 0.8,
        blendMode: 'source-over'
      }
    },
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
      id: 'warm-overlay',
      type: 'color-grade',
      assetId: 'procedural:warm-earth',
      trigger: 'always',
      config: {
        opacity: 0.15,
        blendMode: 'overlay'
      }
    },
    {
      id: 'dust-particles',
      type: 'particles',
      assetId: 'procedural:dust-motes',
      trigger: 'always',
      config: {
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
    version: '1.0.0',
    tags: ['craft', 'tradition', 'artisan', 'education']
  }
};
