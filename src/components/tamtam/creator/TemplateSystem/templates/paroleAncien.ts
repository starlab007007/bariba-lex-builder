/**
 * TAM-TAM Template: Parole d'Ancien
 * Wisdom from elders format
 */

import { Template } from '../types';

export const paroleAncienTemplate: Template = {
  id: 'parole-ancien',
  name: "Parole d'Ancien",
  nameBa: 'Ọ̀rọ̀ Àgbà',
  category: 'storytelling',
  description: 'Sagesse et conseils des anciens',
  descriptionBa: 'Ọgbọ́n àti ìmọ̀ràn àwọn àgbà',
  thumbnail: '/assets/templates/parole-ancien-thumb.jpg',
  duration: 60,
  isPremium: false,
  isNew: true,
  
  effects: [
    {
      id: 'parchment-bg',
      type: 'texture',
      assetId: 'procedural:parchment',
      trigger: 'always',
      config: {
        opacity: 0.25,
        blendMode: 'overlay'
      }
    },
    {
      id: 'adinkra-wisdom',
      type: '3d-object',
      assetId: '3d-models:adinkra-nyansapo.glb',
      trigger: 'keyword',
      config: {
        x: 0.85,
        y: 0.15,
        scale: 0.6,
        opacity: 0.7,
        keywords: ['sagesse', 'wisdom', 'ọgbọ́n']
      }
    },
    {
      id: 'elder-frame',
      type: 'texture',
      assetId: 'procedural:ornate-frame',
      trigger: 'always',
      config: {
        opacity: 0.4,
        blendMode: 'source-over'
      }
    },
    {
      id: 'sepia-tone',
      type: 'color-grade',
      assetId: 'procedural:sepia',
      trigger: 'always',
      config: {
        opacity: 0.2,
        blendMode: 'overlay'
      }
    }
  ],
  
  audio: {
    volume: 1.0,
    beatDetection: false
  },
  
  metadata: {
    author: 'TAM-TAM Team',
    version: '1.0.0',
    tags: ['elder', 'wisdom', 'tradition', 'advice']
  }
};
