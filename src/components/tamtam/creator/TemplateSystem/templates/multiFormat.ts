/**
 * TAM-TAM Template: Multi-Format Export
 * Optimized for multiple social media aspect ratios
 * REAL ASSETS ONLY - No procedural fallbacks
 */

import { Template } from '../types';

export const multiFormatTemplate: Template = {
  id: 'multi-format',
  name: 'Multi-Format',
  nameBa: 'Kpindu kpuro',
  category: 'business',
  description: 'Optimisé pour tous les réseaux sociaux (9:16, 16:9, 1:1)',
  descriptionBa: 'Nɔɔra kpuro tɔmbu yɛrenu yira',
  thumbnail: '/assets/templates/multi-format-thumb.jpg',
  duration: 30,
  isPremium: true,
  isNew: false,
  
  effects: [
    // Center-focused lens flare - REAL ASSET
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
    // Branded text overlay - TEXT EFFECT
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
    // Universal accent flare - REAL ASSET
    {
      id: 'universal-accent',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-260.png',
      trigger: 'beat',
      config: {
        x: 0.3,
        y: 0.3,
        scale: 0.8,
        opacity: 0.35,
        blendMode: 'screen',
        beatThreshold: 0.6
      }
    },
    // Corner accent flare - REAL ASSET
    {
      id: 'corner-accent',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-270.png',
      trigger: 'always',
      config: {
        x: 0.85,
        y: 0.15,
        scale: 0.5,
        opacity: 0.3,
        blendMode: 'screen'
      }
    }
  ],
  
  audio: {
    volume: 0.8,
    beatDetection: true
  },
  
  metadata: {
    author: 'TAM-TAM Team',
    version: '2.0.0',
    tags: ['multi-format', 'business', 'social', 'brand', 'universal']
  }
};
