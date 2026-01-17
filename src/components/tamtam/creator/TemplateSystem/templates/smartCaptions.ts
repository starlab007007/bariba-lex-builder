/**
 * TAM-TAM Template: Smart Captions
 * Auto-generated captions with stylish text animations
 */

import { Template } from '../types';

export const smartCaptionsTemplate: Template = {
  id: 'smart-captions',
  name: 'Smart Captions',
  nameBa: 'Àkọlé Ọgbọ́n',
  category: 'education',
  description: 'Sous-titres automatiques avec animations de texte stylées',
  descriptionBa: 'Àkọlé aládàánídá pẹ̀lú ìgbésẹ̀ ọ̀rọ̀ dáradára',
  thumbnail: '/assets/templates/smart-captions-thumb.jpg',
  duration: 30,
  isPremium: false,
  isNew: true,
  
  effects: [
    // Caption background bar
    {
      id: 'caption-bg',
      type: 'texture',
      assetId: 'procedural:caption-bar',
      trigger: 'always',
      config: {
        y: 0.85,
        opacity: 0.7,
        blendMode: 'source-over'
      }
    },
    // Dynamic caption text (placeholder - real text from ASR)
    {
      id: 'caption-text',
      type: 'text',
      assetId: 'text:caption',
      trigger: 'always',
      config: {
        x: 0.5,
        y: 0.88,
        text: '[Sous-titres automatiques]',
        font: 'Inter',
        color: '#FFFFFF',
        strokeColor: '#000000',
        strokeWidth: 1,
        align: 'center'
      }
    },
    // Subtle highlight on keywords
    {
      id: 'keyword-highlight',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-005.png',
      trigger: 'keyword',
      config: {
        x: 0.5,
        y: 0.88,
        scale: 0.5,
        opacity: 0.4,
        blendMode: 'screen',
        keywords: ['important', 'attention', 'noter', 'clé', 'key']
      }
    },
    // Soft vignette for focus on text
    {
      id: 'text-focus-vignette',
      type: 'texture',
      assetId: 'procedural:vignette',
      trigger: 'always',
      config: {
        opacity: 0.25,
        blendMode: 'multiply'
      }
    }
  ],
  
  audio: {
    volume: 1.0,
    fadeWithSpeech: false,
    beatDetection: false
  },
  
  metadata: {
    author: 'TAM-TAM Team',
    version: '1.0.0',
    tags: ['captions', 'subtitles', 'accessibility', 'text', 'education']
  }
};
