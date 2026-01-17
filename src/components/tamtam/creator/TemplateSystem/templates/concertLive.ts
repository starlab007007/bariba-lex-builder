/**
 * TAM-TAM Template: Concert Live
 * Live concert experience effect
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
      id: 'stage-lights',
      type: 'light-leak',
      assetId: 'procedural:light-leak-stage',
      trigger: 'beat',
      config: {
        opacity: 0.6,
        blendMode: 'screen',
        beatThreshold: 0.4
      }
    },
    {
      id: 'crowd-overlay',
      type: 'texture',
      assetId: 'procedural:crowd-silhouette',
      trigger: 'always',
      config: {
        y: 0.9,
        opacity: 0.4,
        blendMode: 'source-over'
      }
    },
    {
      id: 'phone-lights',
      type: 'particles',
      assetId: 'procedural:phone-flashlights',
      trigger: 'always',
      config: {
        opacity: 0.5,
        blendMode: 'screen'
      }
    },
    {
      id: 'smoke-effect',
      type: 'particles',
      assetId: 'procedural:stage-smoke',
      trigger: 'always',
      config: {
        opacity: 0.3,
        blendMode: 'screen'
      }
    },
    {
      id: 'live-badge',
      type: 'text',
      assetId: 'text:live',
      trigger: 'always',
      config: {
        x: 0.1,
        y: 0.1,
        text: '🔴 LIVE',
        font: 'Oswald',
        color: '#FF0000',
        align: 'left',
        animation: 'pulse'
      }
    }
  ],
  
  audio: {
    volume: 1.0,
    beatDetection: true
  },
  
  metadata: {
    author: 'TAM-TAM Team',
    version: '1.0.0',
    tags: ['concert', 'live', 'stage', 'performance']
  }
};
