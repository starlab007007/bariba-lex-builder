/**
 * TAM-TAM Template: Doc Express Patrimoine
 * Quick heritage documentation
 */

import { Template } from '../types';

export const docExpressPatrimoineTemplate: Template = {
  id: 'doc-express-patrimoine',
  name: 'Doc Express Patrimoine',
  nameBa: 'Àkọsílẹ̀ Ohun-Ìní',
  category: 'education',
  description: 'Documentation rapide du patrimoine culturel',
  descriptionBa: 'Àkọsílẹ̀ àṣà ìbílẹ̀',
  thumbnail: '/assets/templates/doc-express-patrimoine-thumb.jpg',
  duration: 30,
  isPremium: false,
  isNew: true,
  
  effects: [
    {
      id: 'heritage-badge',
      type: 'texture',
      assetId: 'procedural:heritage-badge',
      trigger: 'time',
      config: {
        x: 0.9,
        y: 0.1,
        scale: 0.15,
        opacity: 0.9,
        timeRange: [0, 30]
      }
    },
    {
      id: 'info-bar',
      type: 'text',
      assetId: 'text:heritage-info',
      trigger: 'always',
      config: {
        x: 0.5,
        y: 0.95,
        text: '🏛️ Patrimoine Culturel',
        font: 'Roboto',
        color: '#FFFFFF',
        align: 'center',
        background: 'rgba(0,0,0,0.6)'
      }
    },
    {
      id: 'golden-overlay',
      type: 'color-grade',
      assetId: 'procedural:golden-hour',
      trigger: 'always',
      config: {
        opacity: 0.15,
        blendMode: 'overlay'
      }
    }
  ],
  
  audio: {
    volume: 0.8,
    beatDetection: false
  },
  
  metadata: {
    author: 'TAM-TAM Team',
    version: '1.0.0',
    tags: ['heritage', 'culture', 'documentation', 'quick']
  }
};
