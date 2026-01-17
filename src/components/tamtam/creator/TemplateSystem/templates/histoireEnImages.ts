/**
 * TAM-TAM Template: Histoire en Images
 * Photo slideshow storytelling
 * REAL ASSETS ONLY - No procedural fallbacks
 */

import { Template } from '../types';

export const histoireEnImagesTemplate: Template = {
  id: 'histoire-en-images',
  name: 'Histoire en Images',
  nameBa: 'Ìtàn Nínú Àwòrán',
  category: 'storytelling',
  description: 'Diaporama photo avec narration vocale',
  descriptionBa: 'Àwọn àwòrán pẹ̀lú ìtàn',
  thumbnail: '/assets/templates/histoire-en-images-thumb.jpg',
  duration: 60,
  isPremium: false,
  isNew: true,
  
  effects: [
    // Photo frame flare - REAL ASSET
    {
      id: 'photo-frame-flare',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-320.png',
      trigger: 'always',
      config: {
        x: 0.1,
        y: 0.1,
        scale: 0.4,
        opacity: 0.6,
        blendMode: 'screen'
      }
    },
    // Ken Burns motion flare - REAL ASSET
    {
      id: 'ken-burns-flare',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-310.png',
      trigger: 'time',
      config: {
        x: 0.5,
        y: 0.5,
        scale: 1.5,
        opacity: 0.4,
        blendMode: 'screen',
        timeRange: [0, 5]
      }
    },
    // Soft vignette flare - REAL ASSET
    {
      id: 'soft-vignette-flare',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-055.png',
      trigger: 'always',
      config: {
        x: 0.5,
        y: 0.5,
        scale: 1.8,
        opacity: 0.25,
        blendMode: 'multiply'
      }
    },
    // Caption area - TEXT EFFECT
    {
      id: 'caption-area',
      type: 'text',
      assetId: 'text:caption',
      trigger: 'always',
      config: {
        x: 0.5,
        y: 0.9,
        text: '',
        font: 'Lato',
        color: '#FFFFFF',
        align: 'center',
        shadow: true
      }
    }
  ],
  
  audio: {
    volume: 0.7,
    beatDetection: false
  },
  
  metadata: {
    author: 'TAM-TAM Team',
    version: '2.0.0',
    tags: ['slideshow', 'photos', 'narration', 'story']
  }
};
