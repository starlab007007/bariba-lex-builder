/**
 * TAM-TAM Template: Traduction Voix
 * Voice translation with subtitles
 * REAL ASSETS ONLY - No procedural fallbacks
 */

import { Template } from '../types';

export const traductionVoixTemplate: Template = {
  id: 'traduction-voix',
  name: 'Traduction Voix',
  nameBa: 'Ìtumọ̀ Ohùn',
  category: 'education',
  description: 'Traduction vocale avec sous-titres bilingues',
  descriptionBa: 'Ìtumọ̀ pẹ̀lú àkọlé',
  thumbnail: '/assets/templates/traduction-voix-thumb.jpg',
  duration: 30,
  isPremium: true,
  isNew: true,
  
  effects: [
    // Subtitle French - TEXT EFFECT
    {
      id: 'subtitle-french',
      type: 'text',
      assetId: 'text:subtitle-fr',
      trigger: 'always',
      config: {
        x: 0.5,
        y: 0.85,
        text: '',
        font: 'Roboto',
        color: '#FFFFFF',
        align: 'center',
        background: 'rgba(0,0,0,0.7)',
        maxWidth: 0.9
      }
    },
    // Subtitle Bariba - TEXT EFFECT
    {
      id: 'subtitle-bariba',
      type: 'text',
      assetId: 'text:subtitle-ba',
      trigger: 'always',
      config: {
        x: 0.5,
        y: 0.92,
        text: '',
        font: 'Roboto',
        color: '#FFD700',
        align: 'center',
        fontStyle: 'italic'
      }
    },
    // Language indicator - TEXT EFFECT
    {
      id: 'language-indicator',
      type: 'text',
      assetId: 'text:lang-badge',
      trigger: 'always',
      config: {
        x: 0.9,
        y: 0.1,
        text: '🇫🇷 ↔ 🇧🇯',
        font: 'System',
        align: 'center'
      }
    },
    // Translation wave flare - REAL ASSET
    {
      id: 'translation-wave',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-455.png',
      trigger: 'beat',
      config: {
        x: 0.5,
        y: 0.5,
        scale: 1.2,
        opacity: 0.3,
        blendMode: 'screen',
        beatThreshold: 0.5
      }
    }
  ],
  
  audio: {
    volume: 1.0,
    beatDetection: true
  },
  
  metadata: {
    author: 'TAM-TAM Team',
    version: '2.0.0',
    tags: ['translation', 'voice', 'bilingual', 'subtitles']
  }
};
