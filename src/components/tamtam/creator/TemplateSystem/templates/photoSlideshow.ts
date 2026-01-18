/**
 * TAM-TAM Template: Photo Slideshow v3.0
 * Animated photo montage - Full Envato assets
 */

import { Template } from '../types';

export const photoSlideshowTemplate: Template = {
  id: 'photo-slideshow',
  name: 'Photo Slideshow',
  nameBa: 'Àwòrán Yíká',
  category: 'storytelling',
  description: 'Montage photo animé avec transitions',
  descriptionBa: 'Àkópọ̀ àwòrán pẹ̀lú ìyípadà',
  thumbnail: '/assets/templates/photo-slideshow-thumb.jpg',
  duration: 45,
  isPremium: false,
  isNew: true,
  
  effects: [
    { id: 'slide-transition-flare', type: 'lens-flare', assetId: 'lens-flare:flare-310.png', trigger: 'time', config: { x: 0.5, y: 0.5, scale: 2.0, opacity: 0.8, blendMode: 'screen', timeRange: [5, 5.5] } },
    { id: 'photo-border-flare', type: 'lens-flare', assetId: 'lens-flare:flare-320.png', trigger: 'always', config: { x: 0.1, y: 0.1, scale: 0.4, opacity: 0.5, blendMode: 'screen' } },
    { id: 'photo-transition', type: 'transition', assetId: 'transitions:transition-004.mp4', trigger: 'time', config: { x: 0.5, y: 0.5, scale: 1.0, opacity: 0.7, blendMode: 'screen', timeRange: [10, 11], duration: 1 } },
    { id: 'memory-leak', type: 'light-leak', assetId: 'light-leak:leak-012.mp4', trigger: 'always', config: { x: 0.5, y: 0.5, scale: 1.3, opacity: 0.2, blendMode: 'screen' } },
    { id: 'photo-particles', type: 'particles', assetId: 'particles:particle-008.webm', trigger: 'always', config: { x: 0.5, y: 0.5, scale: 1.2, opacity: 0.2, blendMode: 'screen' } },
    { id: 'date-stamp', type: 'text', assetId: 'text:date', trigger: 'always', config: { x: 0.9, y: 0.95, text: '2024', font: 'Courier', color: '#FFFFFF', align: 'right', opacity: 0.6 } }
  ],
  audio: { volume: 0.7, beatDetection: true },
  metadata: { author: 'TAM-TAM Team', version: '3.0.0', tags: ['photos', 'slideshow', 'memories'] }
};
