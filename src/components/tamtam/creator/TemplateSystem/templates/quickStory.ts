/**
 * TAM-TAM Template: Quick Story v3.0
 * Fast-paced storytelling - Full Envato assets
 */

import { Template } from '../types';

export const quickStoryTemplate: Template = {
  id: 'quick-story',
  name: 'Quick Story',
  nameBa: 'Táárù Kíákíá',
  category: 'storytelling',
  description: 'Narration rapide pour contenus courts et impactants',
  descriptionBa: 'Táárù kíákíá tíí gbóná',
  thumbnail: '/assets/templates/quick-story-thumb.jpg',
  duration: 15,
  isPremium: false,
  isNew: true,
  
  effects: [
    { id: 'intro-flash', type: 'lens-flare', assetId: 'lens-flare:flare-010.png', trigger: 'time', config: { x: 0.5, y: 0.4, scale: 1.8, opacity: 0.9, blendMode: 'screen', timeRange: [0, 0.3] } },
    { id: 'sparkle-beats', type: 'lens-flare', assetId: 'lens-flare:flare-340.png', trigger: 'beat', config: { x: 0.3, y: 0.5, scale: 0.8, opacity: 0.6, blendMode: 'screen', beatThreshold: 0.5 } },
    { id: 'quick-leak', type: 'light-leak', assetId: 'light-leak:leak-008.mp4', trigger: 'beat', config: { x: 0.5, y: 0.5, scale: 1.5, opacity: 0.4, blendMode: 'screen', beatThreshold: 0.6 } },
    { id: 'quick-particles', type: 'particles', assetId: 'particles:particle-015.webm', trigger: 'always', config: { x: 0.5, y: 0.5, scale: 1.3, opacity: 0.25, blendMode: 'screen' } },
    { id: 'cta-text', type: 'text', assetId: 'text:cta', trigger: 'time', config: { x: 0.5, y: 0.9, text: '👆 Suivez pour plus!', font: 'Nunito', color: '#FFFFFF', align: 'center', timeRange: [12, 15] } }
  ],
  audio: { volume: 1.0, beatDetection: true },
  metadata: { author: 'TAM-TAM Team', version: '3.0.0', tags: ['quick', 'short', 'social', 'story'] }
};
