/**
 * TAM-TAM Template: Multi-Format Export
 * Optimized for multiple social media aspect ratios
 */

import { Template } from '../types';

export const multiFormatTemplate: Template = {
  id: 'multi-format',
  name: 'Multi-Format',
  nameBa: 'Ọ̀pọ̀ Ìrísí',
  category: 'business',
  description: 'Optimisé pour tous les réseaux sociaux (9:16, 16:9, 1:1)',
  descriptionBa: 'Dára fún gbogbo àwọn nẹ́tíwọ̀kì àwùjọ',
  thumbnail: '/assets/templates/multi-format-thumb.jpg',
  duration: 30,
  isPremium: true,
  isNew: false,
  
  effects: [
    // Safe zone guides (development only)
    {
      id: 'safe-zone',
      type: 'texture',
      assetId: 'procedural:safe-zone-guide',
      trigger: 'always',
      config: {
        opacity: 0.0, // Hidden in production
        blendMode: 'source-over'
      }
    },
    // Center-focused lens flare
    {
      id: 'center-flare',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-025.png',
      trigger: 'time',
      config: {
        x: 0.5,
        y: 0.5,
        scale: 1.3,
        opacity: 0.6,
        blendMode: 'screen',
        timeRange: [0, 2]
      }
    },
    // Branded text overlay
    {
      id: 'brand-text',
      type: 'text',
      assetId: 'text:brand',
      trigger: 'always',
      config: {
        x: 0.5,
        y: 0.95,
        text: '@votre_marque',
        font: 'Poppins',
        color: '#FFFFFF',
        strokeColor: '#000000',
        strokeWidth: 1,
        align: 'center',
        shadow: true
      }
    },
    // Universal light leak (centered)
    {
      id: 'universal-leak',
      type: 'light-leak',
      assetId: 'procedural:light-leak-centered',
      trigger: 'beat',
      config: {
        opacity: 0.25,
        blendMode: 'screen',
        beatThreshold: 0.6
      }
    },
    // Light vignette
    {
      id: 'universal-vignette',
      type: 'texture',
      assetId: 'procedural:vignette',
      trigger: 'always',
      config: {
        opacity: 0.35,
        blendMode: 'multiply'
      }
    }
  ],
  
  audio: {
    volume: 0.8,
    beatDetection: true
  },
  
  metadata: {
    author: 'TAM-TAM Team',
    version: '1.0.0',
    tags: ['multi-format', 'business', 'social', 'brand', 'universal']
  }
};
