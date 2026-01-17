/**
 * TAM-TAM Template: Cyberpunk Vibes
 * Neon-drenched cyberpunk aesthetic
 */

import { Template } from '../types';

export const cyberpunkVibesTemplate: Template = {
  id: 'cyberpunk-vibes',
  name: 'Cyberpunk Vibes',
  nameBa: 'Cyberpunk',
  category: 'future',
  description: 'Esthétique cyberpunk néon et sombre',
  descriptionBa: 'Àwòrán cyberpunk',
  thumbnail: '/assets/templates/cyberpunk-vibes-thumb.jpg',
  duration: 30,
  isPremium: true,
  isNew: true,
  
  effects: [
    {
      id: 'neon-pink',
      type: 'light-leak',
      assetId: 'procedural:light-leak-pink',
      trigger: 'beat',
      config: {
        opacity: 0.4,
        blendMode: 'screen',
        beatThreshold: 0.5
      }
    },
    {
      id: 'neon-blue',
      type: 'light-leak',
      assetId: 'procedural:light-leak-cyan',
      trigger: 'beat',
      config: {
        opacity: 0.4,
        blendMode: 'screen',
        beatThreshold: 0.6
      }
    },
    {
      id: 'rain-overlay',
      type: 'particles',
      assetId: 'procedural:rain-streaks',
      trigger: 'always',
      config: {
        opacity: 0.3,
        blendMode: 'screen'
      }
    },
    {
      id: 'scanlines',
      type: 'texture',
      assetId: 'procedural:crt-scanlines',
      trigger: 'always',
      config: {
        opacity: 0.2,
        blendMode: 'overlay'
      }
    },
    {
      id: 'cyber-text',
      type: 'text',
      assetId: 'text:cyber',
      trigger: 'always',
      config: {
        x: 0.5,
        y: 0.9,
        text: 'CYBER//PUNK',
        font: 'Orbitron',
        color: '#FF00FF',
        align: 'center',
        glow: true
      }
    }
  ],
  
  audio: {
    volume: 0.9,
    beatDetection: true
  },
  
  metadata: {
    author: 'TAM-TAM Team',
    version: '1.0.0',
    tags: ['cyberpunk', 'neon', 'dark', 'future']
  }
};
