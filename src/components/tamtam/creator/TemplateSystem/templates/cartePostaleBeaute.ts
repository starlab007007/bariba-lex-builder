/**
 * TAM-TAM Template: Carte Postale Beauté
 * Beautiful postcard-style landscape showcase
 */

import { Template } from '../types';

export const cartePostaleBeauteTemplate: Template = {
  id: 'carte-postale-beaute',
  name: 'Carte Postale Beauté',
  nameBa: 'Káàdì Ẹwà',
  category: 'storytelling',
  description: 'Paysages magnifiques style carte postale',
  descriptionBa: 'Àwòrán ẹwà ilẹ̀',
  thumbnail: '/assets/templates/carte-postale-beaute-thumb.jpg',
  duration: 20,
  isPremium: false,
  isNew: true,
  
  effects: [
    {
      id: 'postcard-frame',
      type: 'texture',
      assetId: 'procedural:postcard-border',
      trigger: 'always',
      config: {
        opacity: 0.9,
        blendMode: 'source-over'
      }
    },
    {
      id: 'stamp',
      type: 'texture',
      assetId: 'procedural:vintage-stamp',
      trigger: 'always',
      config: {
        x: 0.9,
        y: 0.1,
        scale: 0.15,
        opacity: 0.8,
        blendMode: 'source-over'
      }
    },
    {
      id: 'location-text',
      type: 'text',
      assetId: 'text:greetings',
      trigger: 'always',
      config: {
        x: 0.5,
        y: 0.85,
        text: 'Salutations du Bénin 🌴',
        font: 'Dancing Script',
        color: '#8B4513',
        align: 'center'
      }
    },
    {
      id: 'warm-filter',
      type: 'color-grade',
      assetId: 'procedural:vintage-warm',
      trigger: 'always',
      config: {
        opacity: 0.25,
        blendMode: 'overlay'
      }
    }
  ],
  
  audio: {
    volume: 0.5,
    beatDetection: false
  },
  
  metadata: {
    author: 'TAM-TAM Team',
    version: '1.0.0',
    tags: ['postcard', 'landscape', 'beauty', 'travel']
  }
};
