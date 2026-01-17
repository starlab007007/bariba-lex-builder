/**
 * TAM-TAM Template: Afrobeat Pulse
 * African music visualizer - Real assets only
 */

import { Template } from '../types';

export const afrobeatPulseTemplate: Template = {
  id: 'afrobeat-pulse',
  name: 'Afrobeat Pulse',
  nameBa: 'Dùndún Afro',
  category: 'music',
  description: 'Visualiseur pour musique africaine',
  descriptionBa: 'Àfihàn orin Áfíríkà',
  thumbnail: '/assets/templates/afrobeat-pulse-thumb.jpg',
  duration: 30,
  isPremium: false,
  isNew: true,
  
  effects: [
    {
      id: 'african-flare-main',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-150.png',
      trigger: 'always',
      config: {
        x: 0.5,
        y: 0.3,
        scale: 1.2,
        opacity: 0.6,
        blendMode: 'screen'
      }
    },
    {
      id: 'drum-pulse-flare',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-200.png',
      trigger: 'beat',
      config: {
        x: 0.5,
        y: 0.5,
        scale: 2,
        opacity: 0.5,
        blendMode: 'screen',
        beatThreshold: 0.4
      }
    },
    {
      id: 'warm-glow-flare',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-250.png',
      trigger: 'beat',
      config: {
        x: 0.7,
        y: 0.2,
        scale: 0.8,
        opacity: 0.3,
        blendMode: 'screen',
        beatThreshold: 0.6
      }
    },
    {
      id: 'symbol-flare',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-300.png',
      trigger: 'beat',
      config: {
        x: 0.5,
        y: 0.3,
        scale: 0.5,
        opacity: 0.6,
        blendMode: 'screen',
        beatThreshold: 0.8
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
    tags: ['afrobeat', 'music', 'african', 'pulse']
  }
};
