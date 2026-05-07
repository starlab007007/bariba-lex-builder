/**
 * TAM-TAM Template: Histoire Vraie v3.0
 * True story documentary style - Full Envato assets
 */

import { Template } from '../types';

export const histoireVraieTemplate: Template = {
  id: 'histoire-vraie',
  name: 'Histoire Vraie',
  nameBa: 'Táárù Gbàngbàn',
  category: 'storytelling',
  description: 'Format témoignage pour histoires vraies',
  descriptionBa: 'Táárù tíí kɔ gbàngbàn',
  thumbnail: '/assets/templates/histoire-vraie-thumb.jpg',
  duration: 90,
  isPremium: true,
  isNew: false,
  
  effects: [
    { id: 'testimony-frame', type: 'lens-flare', assetId: 'lens-flare:flare-055.png', trigger: 'always', config: { x: 0.5, y: 0.5, scale: 1.8, opacity: 0.3, blendMode: 'multiply' } },
    { id: 'film-grain-accent', type: 'lens-flare', assetId: 'lens-flare:flare-440.png', trigger: 'always', config: { x: 0.8, y: 0.2, scale: 0.5, opacity: 0.15, blendMode: 'overlay' } },
    { id: 'testimony-leak', type: 'light-leak', assetId: 'light-leak:leak-010.mp4', trigger: 'always', config: { x: 0.5, y: 0.5, scale: 1.3, opacity: 0.2, blendMode: 'screen' } },
    { id: 'grain-texture', type: 'texture', assetId: 'textures:texture-080.mp4', trigger: 'always', config: { x: 0.5, y: 0.5, scale: 1.0, opacity: 0.1, blendMode: 'overlay' } },
    { id: 'quote-marks', type: 'text', assetId: 'text:quotes', trigger: 'always', config: { x: 0.1, y: 0.2, text: '"', font: 'Georgia', color: '#FFFFFF', opacity: 0.3, align: 'left' } }
  ],
  audio: { volume: 1.0, beatDetection: false },
  metadata: { author: 'TAM-TAM Team', version: '3.0.0', tags: ['testimony', 'true-story', 'documentary'] }
};
