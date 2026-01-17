/**
 * TAM-TAM Template: Afrobeat Pulse
 * African music visualizer
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
      id: 'african-pattern',
      type: 'texture',
      assetId: 'procedural:kente-border',
      trigger: 'always',
      config: {
        opacity: 0.6,
        blendMode: 'source-over'
      }
    },
    {
      id: 'drum-pulse',
      type: 'particles',
      assetId: 'procedural:circular-pulse',
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
      id: 'warm-glow',
      type: 'light-leak',
      assetId: 'procedural:light-leak-orange',
      trigger: 'beat',
      config: {
        opacity: 0.3,
        blendMode: 'screen',
        beatThreshold: 0.6
      }
    },
    {
      id: 'adinkra-symbol',
      type: '3d-object',
      assetId: '3d-models:adinkra-sankofa.glb',
      trigger: 'beat',
      config: {
        x: 0.5,
        y: 0.3,
        scale: 0.5,
        opacity: 0.6,
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
    version: '1.0.0',
    tags: ['afrobeat', 'music', 'african', 'pulse']
  }
};
