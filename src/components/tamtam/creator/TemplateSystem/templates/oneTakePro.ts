/**
 * TAM-TAM Template: One-Take Pro (Kuaishou Horse Collection)
 * Premium single-shot video with dynamic transitions and effects
 */

import { Template } from '../types';

export const oneTakeProTemplate: Template = {
  id: 'one-take-pro',
  name: 'One-Take Pro',
  nameBa: 'Ìgbésẹ̀ Kan Pro',
  category: 'business',
  description: 'Vidéo en plan-séquence premium avec effets dynamiques',
  descriptionBa: 'Fídíò kan ṣoṣo pẹ̀lú àwọn ìṣe alátagbà',
  thumbnail: '/assets/templates/one-take-pro-thumb.jpg',
  duration: 60,
  isPremium: true,
  isNew: false,
  
  effects: [
    // Opening flash
    {
      id: 'opening-flash',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-001.png',
      trigger: 'time',
      config: {
        x: 0.5,
        y: 0.3,
        scale: 2.0,
        opacity: 1.0,
        blendMode: 'screen',
        timeRange: [0, 0.5]
      }
    },
    // Dynamic light leak throughout
    {
      id: 'dynamic-leak',
      type: 'light-leak',
      assetId: 'procedural:light-leak-animated',
      trigger: 'always',
      config: {
        opacity: 0.3,
        blendMode: 'screen'
      }
    },
    // Text: Title overlay
    {
      id: 'title-text',
      type: 'text',
      assetId: 'text:title',
      trigger: 'time',
      config: {
        x: 0.5,
        y: 0.85,
        text: 'ONE-TAKE PRO',
        font: 'Montserrat',
        color: '#FFFFFF',
        strokeColor: '#000000',
        strokeWidth: 2,
        align: 'center',
        shadow: true,
        timeRange: [0.5, 4]
      }
    },
    // Midpoint emphasis flare
    {
      id: 'mid-flare',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-045.png',
      trigger: 'time',
      config: {
        x: 0.3,
        y: 0.4,
        scale: 1.5,
        opacity: 0.7,
        blendMode: 'screen',
        timeRange: [25, 35]
      }
    },
    // Closing transition
    {
      id: 'closing-fade',
      type: 'transition',
      assetId: 'procedural:fade-to-black',
      trigger: 'time',
      config: {
        opacity: 1.0,
        timeRange: [55, 60]
      }
    },
    // Subtle vignette
    {
      id: 'pro-vignette',
      type: 'texture',
      assetId: 'procedural:vignette',
      trigger: 'always',
      config: {
        opacity: 0.4,
        blendMode: 'multiply'
      }
    }
  ],
  
  audio: {
    volume: 0.9,
    fadeWithSpeech: true,
    beatDetection: true
  },
  
  metadata: {
    author: 'TAM-TAM Team',
    version: '1.0.0',
    tags: ['pro', 'business', 'kuaishou', 'premium', 'one-take']
  }
};
