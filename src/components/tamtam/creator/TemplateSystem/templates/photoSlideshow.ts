/**
 * TAM-TAM Template: Photo Slideshow
 * Animated photo montage with transitions
 */

import { Template } from '../types';

export const photoSlideshowTemplate: Template = {
  id: 'photo-slideshow',
  name: 'Photo Slideshow',
  nameBa: 'Àwòrán Yíká',
  category: 'storytelling',
  description: 'Montage photo animé avec transitions',
  descriptionBa: 'Àkópọ̀ àwòrán pẹ̀lú ìyípadà',
  thumbnail: '/assets/templates/photo-slideshow-thumb.jpg',
  duration: 45,
  isPremium: false,
  isNew: true,
  
  effects: [
    {
      id: 'slide-transition',
      type: 'transition',
      assetId: 'procedural:slide-fade',
      trigger: 'time',
      config: {
        interval: 5,
        duration: 0.5
      }
    },
    {
      id: 'photo-border',
      type: 'texture',
      assetId: 'procedural:clean-border',
      trigger: 'always',
      config: {
        opacity: 0.8,
        blendMode: 'source-over'
      }
    },
    {
      id: 'memory-sparkle',
      type: 'particles',
      assetId: 'procedural:sparkles',
      trigger: 'beat',
      config: {
        opacity: 0.3,
        blendMode: 'screen',
        beatThreshold: 0.7
      }
    },
    {
      id: 'date-stamp',
      type: 'text',
      assetId: 'text:date',
      trigger: 'always',
      config: {
        x: 0.9,
        y: 0.95,
        text: '2024',
        font: 'Courier',
        color: '#FFFFFF',
        align: 'right',
        opacity: 0.6
      }
    }
  ],
  
  audio: {
    volume: 0.7,
    beatDetection: true
  },
  
  metadata: {
    author: 'TAM-TAM Team',
    version: '1.0.0',
    tags: ['photos', 'slideshow', 'memories', 'montage']
  }
};
