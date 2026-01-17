/**
 * TAM-TAM Template: Cyberpunk Vibes
 * Neon-drenched cyberpunk aesthetic - Real assets only
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
      id: 'neon-pink-flare',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-420.png',
      trigger: 'beat',
      config: {
        x: 0.2,
        y: 0.3,
        scale: 0.8,
        opacity: 0.4,
        blendMode: 'screen',
        beatThreshold: 0.5
      }
    },
    {
      id: 'neon-blue-flare',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-430.png',
      trigger: 'beat',
      config: {
        x: 0.8,
        y: 0.4,
        scale: 0.7,
        opacity: 0.4,
        blendMode: 'screen',
        beatThreshold: 0.6
      }
    },
    {
      id: 'center-glow',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-440.png',
      trigger: 'always',
      config: {
        x: 0.5,
        y: 0.5,
        scale: 1.2,
        opacity: 0.3,
        blendMode: 'screen'
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
    version: '2.0.0',
    tags: ['cyberpunk', 'neon', 'dark', 'future']
  }
};
