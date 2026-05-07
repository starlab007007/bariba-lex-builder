/**
 * TAM-TAM Template: Cyberpunk Vibes
 * Neon-drenched cyberpunk aesthetic - Full asset integration
 */

import { Template } from '../types';

export const cyberpunkVibesTemplate: Template = {
  id: 'cyberpunk-vibes',
  name: 'Cyberpunk Vibes',
  nameBa: 'Cyberpunk',
  category: 'future',
  description: 'Esthétique cyberpunk néon avec effets holographiques',
  descriptionBa: 'Wéérù cyberpunk pɛ neon',
  thumbnail: '/assets/templates/cyberpunk-vibes-thumb.jpg',
  duration: 30,
  isPremium: true,
  isNew: true,
  
  effects: [
    // === LENS FLARES - Neon lights ===
    {
      id: 'neon-pink-flare',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-420.png',
      trigger: 'beat',
      config: { x: 0.2, y: 0.3, scale: 0.8, opacity: 0.5, blendMode: 'screen', beatThreshold: 0.5 }
    },
    {
      id: 'neon-blue-flare',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-430.png',
      trigger: 'beat',
      config: { x: 0.8, y: 0.4, scale: 0.7, opacity: 0.5, blendMode: 'screen', beatThreshold: 0.6 }
    },
    {
      id: 'center-glow',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-440.png',
      trigger: 'always',
      config: { x: 0.5, y: 0.5, scale: 1.2, opacity: 0.3, blendMode: 'screen' }
    },

    // === LIGHT LEAKS - Neon ambiance ===
    {
      id: 'cyber-neon-leak-1',
      type: 'light-leak',
      assetId: 'light-leak:leak-012.mp4',
      trigger: 'always',
      config: { x: 0.3, y: 0.5, scale: 1.5, opacity: 0.3, blendMode: 'screen' }
    },
    {
      id: 'cyber-neon-leak-2',
      type: 'light-leak',
      assetId: 'light-leak:leak-032.webm',
      trigger: 'beat',
      config: { x: 0.7, y: 0.5, scale: 1.4, opacity: 0.4, blendMode: 'screen', beatThreshold: 0.7 }
    },

    // === PARTICLES - Cyber haze/rain ===
    {
      id: 'cyber-haze',
      type: 'particles',
      assetId: 'particles:particle-015.webm',
      trigger: 'always',
      config: { x: 0.5, y: 0.5, scale: 1.6, opacity: 0.2, blendMode: 'screen' }
    },
    {
      id: 'cyber-spark',
      type: 'particles',
      assetId: 'particles:particle-030.webm',
      trigger: 'beat',
      config: { x: 0.5, y: 0.3, scale: 1.8, opacity: 0.4, blendMode: 'screen', beatThreshold: 0.8 }
    },

    // === TEXTURES - Holographic overlay ===
    {
      id: 'cyber-holo-texture',
      type: 'texture',
      assetId: 'textures:texture-080.mp4',
      trigger: 'always',
      config: { x: 0.5, y: 0.5, scale: 1.0, opacity: 0.2, blendMode: 'overlay' }
    },
    {
      id: 'cyber-scan-texture',
      type: 'texture',
      assetId: 'textures:texture-120.mp4',
      trigger: 'beat',
      config: { x: 0.5, y: 0.5, scale: 1.1, opacity: 0.25, blendMode: 'screen', beatThreshold: 0.6 }
    },

    // === TEXT ===
    {
      id: 'cyber-text',
      type: 'text',
      assetId: 'text:cyber',
      trigger: 'always',
      config: { x: 0.5, y: 0.9, text: 'CYBER//PUNK', font: 'Orbitron', color: '#FF00FF', align: 'center', glow: true }
    }
  ],
  
  audio: {
    volume: 0.9,
    beatDetection: true
  },
  
  metadata: {
    author: 'TAM-TAM Team',
    version: '3.0.0',
    tags: ['cyberpunk', 'neon', 'dark', 'future', 'holographic', 'particles']
  }
};
