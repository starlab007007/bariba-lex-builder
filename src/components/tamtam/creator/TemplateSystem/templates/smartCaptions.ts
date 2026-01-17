/**
 * TAM-TAM Template: Smart Captions
 * Auto-generated captions with stylish text animations
 * REAL ASSETS ONLY - No procedural fallbacks
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
    // Caption background flare - REAL ASSET
    {
      id: 'caption-bg-flare',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-400.png',
      trigger: 'always',
      config: {
        x: 0.5,
        y: 0.85,
        scale: 2.0,
        opacity: 0.15,
        blendMode: 'screen'
      }
    },
    // Dynamic caption text - TEXT EFFECT
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
    // Subtle highlight on keywords - REAL ASSET
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
    // Soft focus flare - REAL ASSET
    {
      id: 'text-focus-flare',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-410.png',
      trigger: 'always',
      config: {
        x: 0.5,
        y: 0.5,
        scale: 1.5,
        opacity: 0.15,
        blendMode: 'screen'
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
    version: '2.0.0',
    tags: ['captions', 'subtitles', 'accessibility', 'text', 'education']
  }
};
