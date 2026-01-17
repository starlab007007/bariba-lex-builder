/**
 * TAM-TAM Template: Doc Express Patrimoine
 * Quick heritage documentation - Real assets only
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
      id: 'heritage-flare',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-030.png',
      trigger: 'time',
      config: {
        x: 0.9,
        y: 0.1,
        scale: 0.5,
        opacity: 0.9,
        blendMode: 'screen',
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
      id: 'golden-flare',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-055.png',
      trigger: 'always',
      config: {
        x: 0.5,
        y: 0.3,
        scale: 0.6,
        opacity: 0.15,
        blendMode: 'screen'
      }
    }
  ],
  
  audio: {
    volume: 0.8,
    beatDetection: false
  },
  
  metadata: {
    author: 'TAM-TAM Team',
    version: '2.0.0',
    tags: ['heritage', 'culture', 'documentation', 'quick']
  }
};
