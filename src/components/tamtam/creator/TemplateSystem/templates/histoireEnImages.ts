/**
 * TAM-TAM Template: Histoire en Images
 * Photo slideshow storytelling
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
    {
      id: 'photo-frame',
      type: 'texture',
      assetId: 'procedural:polaroid-frame',
      trigger: 'always',
      config: {
        opacity: 0.9,
        blendMode: 'source-over'
      }
    },
    {
      id: 'ken-burns',
      type: 'transition',
      assetId: 'procedural:ken-burns',
      trigger: 'always',
      config: {
        duration: 5,
        zoomRange: [1.0, 1.2]
      }
    },
    {
      id: 'soft-vignette',
      type: 'texture',
      assetId: 'procedural:soft-vignette',
      trigger: 'always',
      config: {
        opacity: 0.4,
        blendMode: 'multiply'
      }
    },
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
    version: '1.0.0',
    tags: ['slideshow', 'photos', 'narration', 'story']
  }
};
