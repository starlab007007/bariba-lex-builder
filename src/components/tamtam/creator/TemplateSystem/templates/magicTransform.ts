/**
 * TAM-TAM Template: Magic Transform v3.0
 * Magical transformation effects - Full Envato assets
 */

import { Template } from '../types';

export const magicTransformTemplate: Template = {
  id: 'magic-transform',
  name: 'Magic Transform',
  nameBa: 'Ìyípadà Àjé',
  category: 'future',
  description: 'Effets de transformation magique avec particules et lueurs',
  descriptionBa: 'Àwọn ìṣe ìyípadà pẹ̀lú ìmọ́lẹ̀ àjé',
  thumbnail: '/assets/templates/magic-transform-thumb.jpg',
  duration: 20,
  isPremium: true,
  isNew: true,
  
  effects: [
    { id: 'magic-dust', type: 'lens-flare', assetId: 'lens-flare:flare-220.png', trigger: 'always', config: { x: 0.3, y: 0.4, scale: 0.7, opacity: 0.5, blendMode: 'screen' } },
    { id: 'transform-burst', type: 'lens-flare', assetId: 'lens-flare:flare-020.png', trigger: 'beat', config: { x: 0.5, y: 0.5, scale: 2.5, opacity: 1.0, blendMode: 'screen', beatThreshold: 0.8 } },
    { id: 'rainbow-flare', type: 'lens-flare', assetId: 'lens-flare:flare-230.png', trigger: 'always', config: { x: 0.7, y: 0.3, scale: 1.0, opacity: 0.35, blendMode: 'screen' } },
    { id: 'magic-leak', type: 'light-leak', assetId: 'light-leak:leak-020.webm', trigger: 'beat', config: { x: 0.5, y: 0.5, scale: 1.8, opacity: 0.5, blendMode: 'screen', beatThreshold: 0.7 } },
    { id: 'sparkle-particles', type: 'particles', assetId: 'particles:particle-020.webm', trigger: 'beat', config: { x: 0.5, y: 0.5, scale: 2.0, opacity: 0.6, blendMode: 'screen', beatThreshold: 0.6 } },
    { id: 'magic-transition', type: 'transition', assetId: 'transitions:transition-001.mp4', trigger: 'beat', config: { x: 0.5, y: 0.5, scale: 1.0, opacity: 0.8, blendMode: 'screen', beatThreshold: 0.9, duration: 0.5 } }
  ],
  audio: { volume: 0.9, beatDetection: true },
  metadata: { author: 'TAM-TAM Team', version: '3.0.0', tags: ['magic', 'transform', 'particles', 'fantasy'] }
};
