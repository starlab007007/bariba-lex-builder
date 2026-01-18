/**
 * TAM-TAM Template: Radio Village Pro v3.0
 * Professional radio broadcast style - Full Envato assets
 */

import { Template } from '../types';

export const radioVillageTemplate: Template = {
  id: 'radio-village',
  name: 'Radio Village Pro',
  nameBa: 'Rédíò Abúlé',
  category: 'business',
  description: 'Format radio professionnel avec visuel',
  descriptionBa: 'Ètò rédíò ọjọgbọ́n',
  thumbnail: '/assets/templates/radio-village-thumb.jpg',
  duration: 60,
  isPremium: true,
  isNew: true,
  
  effects: [
    { id: 'radio-waves', type: 'lens-flare', assetId: 'lens-flare:flare-370.png', trigger: 'beat', config: { x: 0.5, y: 0.5, scale: 1.5, opacity: 0.4, blendMode: 'screen', beatThreshold: 0.4 } },
    { id: 'waveform-visualizer', type: 'lens-flare', assetId: 'lens-flare:flare-380.png', trigger: 'always', config: { x: 0.5, y: 0.8, scale: 1.2, opacity: 0.5, blendMode: 'screen' } },
    { id: 'radio-leak', type: 'light-leak', assetId: 'light-leak:leak-025.webm', trigger: 'beat', config: { x: 0.5, y: 0.5, scale: 1.4, opacity: 0.3, blendMode: 'screen', beatThreshold: 0.5 } },
    { id: 'audio-particles', type: 'particles', assetId: 'particles:particle-012.webm', trigger: 'beat', config: { x: 0.5, y: 0.5, scale: 1.6, opacity: 0.35, blendMode: 'screen', beatThreshold: 0.6 } },
    { id: 'on-air-badge', type: 'text', assetId: 'text:on-air', trigger: 'always', config: { x: 0.9, y: 0.1, text: '🔴 ON AIR', font: 'Oswald', color: '#FF0000', align: 'center', animation: 'pulse' } }
  ],
  audio: { volume: 1.0, beatDetection: true },
  metadata: { author: 'TAM-TAM Team', version: '3.0.0', tags: ['radio', 'broadcast', 'professional'] }
};
