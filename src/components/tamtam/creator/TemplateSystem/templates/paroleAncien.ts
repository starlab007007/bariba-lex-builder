/**
 * TAM-TAM Template: Parole d'Ancien
 * Wisdom from elders format - Real assets only
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
      id: 'wisdom-flare',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-325.png',
      trigger: 'keyword',
      config: {
        x: 0.85,
        y: 0.15,
        scale: 0.6,
        opacity: 0.7,
        blendMode: 'screen',
        keywords: ['sagesse', 'wisdom', 'ọgbọ́n']
      }
    },
    {
      id: 'warm-glow',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-350.png',
      trigger: 'always',
      config: {
        x: 0.5,
        y: 0.5,
        scale: 1.0,
        opacity: 0.2,
        blendMode: 'screen'
      }
    }
  ],
  
  audio: {
    volume: 1.0,
    beatDetection: false
  },
  
  metadata: {
    author: 'TAM-TAM Team',
    version: '2.0.0',
    tags: ['elder', 'wisdom', 'tradition', 'advice']
  }
};
