/**
 * TAM-TAM Template: Photo Slideshow
 * Animated photo montage with transitions
 * REAL ASSETS ONLY - No procedural fallbacks
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
    // Slide transition flare - REAL ASSET
    {
      id: 'slide-transition-flare',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-310.png',
      trigger: 'time',
      config: {
        x: 0.5,
        y: 0.5,
        scale: 2.0,
        opacity: 0.8,
        blendMode: 'screen',
        timeRange: [5, 5.5]
      }
    },
    // Photo border flare - REAL ASSET
    {
      id: 'photo-border-flare',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-320.png',
      trigger: 'always',
      config: {
        x: 0.1,
        y: 0.1,
        scale: 0.4,
        opacity: 0.5,
        blendMode: 'screen'
      }
    },
    // Memory sparkle flare - REAL ASSET
    {
      id: 'memory-sparkle',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-330.png',
      trigger: 'beat',
      config: {
        x: 0.7,
        y: 0.3,
        scale: 0.6,
        opacity: 0.4,
        blendMode: 'screen',
        beatThreshold: 0.7
      }
    },
    // Date stamp - TEXT EFFECT
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
    version: '2.0.0',
    tags: ['photos', 'slideshow', 'memories', 'montage']
  }
};
