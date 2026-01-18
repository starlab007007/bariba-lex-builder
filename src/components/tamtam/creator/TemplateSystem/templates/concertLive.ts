/**
 * TAM-TAM Template: Concert Live
 * Live concert experience effect - Real assets only
 */

import { Template } from '../types';

export const concertLiveTemplate: Template = {
  id: 'concert-live',
  name: 'Concert Live',
  nameBa: 'Eré Orin Láàyè',
  category: 'music',
  description: 'Ambiance concert live avec effets scène',
  descriptionBa: 'Ìrírí eré orin',
  thumbnail: '/assets/templates/concert-live-thumb.jpg',
  duration: 60,
  isPremium: true,
  isNew: true,
  
  effects: [
    {
      id: 'stage-lights-flare',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-125.png',
      trigger: 'beat',
      config: { x: 0.5, y: 0.2, scale: 1.5, opacity: 0.6, blendMode: 'screen', beatThreshold: 0.4 }
    },
    {
      id: 'side-flare-left',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-150.png',
      trigger: 'beat',
      config: { x: 0.1, y: 0.3, scale: 0.8, opacity: 0.5, blendMode: 'screen', beatThreshold: 0.5 }
    },
    {
      id: 'side-flare-right',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-175.png',
      trigger: 'beat',
      config: { x: 0.9, y: 0.3, scale: 0.8, opacity: 0.5, blendMode: 'screen', beatThreshold: 0.5 }
    },
    // Light Leak effects - stage lighting simulation
    {
      id: 'stage-leak-1',
      type: 'light-leak',
      assetId: 'light-leak:leak-025.webm',
      trigger: 'always',
      config: { x: 0.5, y: 0.4, scale: 1.8, opacity: 0.3, blendMode: 'screen' }
    },
    {
      id: 'stage-leak-2',
      type: 'light-leak',
      assetId: 'light-leak:leak-012.mp4',
      trigger: 'beat',
      config: { x: 0.5, y: 0.6, scale: 1.5, opacity: 0.4, blendMode: 'screen', beatThreshold: 0.6 }
    },
    {
      id: 'live-badge',
      type: 'text',
      assetId: 'text:live',
      trigger: 'always',
      config: { x: 0.1, y: 0.1, text: '🔴 LIVE', font: 'Oswald', color: '#FF0000', align: 'left', animation: 'pulse' }
    }
  ],
  
  audio: {
    volume: 1.0,
    beatDetection: true
  },
  
  metadata: {
    author: 'TAM-TAM Team',
    version: '2.0.0',
    tags: ['concert', 'live', 'stage', 'performance']
  }
};
