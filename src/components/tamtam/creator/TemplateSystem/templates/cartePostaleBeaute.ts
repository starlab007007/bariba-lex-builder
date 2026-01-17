/**
 * TAM-TAM Template: Carte Postale Beauté
 * Beautiful postcard-style landscape showcase - Real assets only
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
      id: 'sun-flare',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-425.png',
      trigger: 'always',
      config: {
        x: 0.9,
        y: 0.1,
        scale: 0.8,
        opacity: 0.8,
        blendMode: 'screen'
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
      id: 'warm-corner',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-450.png',
      trigger: 'always',
      config: {
        x: 0.1,
        y: 0.9,
        scale: 0.3,
        opacity: 0.25,
        blendMode: 'screen'
      }
    }
  ],
  
  audio: {
    volume: 0.5,
    beatDetection: false
  },
  
  metadata: {
    author: 'TAM-TAM Team',
    version: '2.0.0',
    tags: ['postcard', 'landscape', 'beauty', 'travel']
  }
};
