/**
 * TAM-TAM Template: Hologram Effect
 * Sci-fi holographic visual style
 */

import { Template } from '../types';

export const hologramEffectTemplate: Template = {
  id: 'hologram-effect',
  name: 'Hologram Effect',
  nameBa: 'Hologram',
  category: 'future',
  description: 'Effet holographique science-fiction',
  descriptionBa: 'Àwòrán hologram',
  thumbnail: '/assets/templates/hologram-effect-thumb.jpg',
  duration: 20,
  isPremium: true,
  isNew: true,
  
  effects: [
    {
      id: 'hologram-lines',
      type: 'texture',
      assetId: 'procedural:hologram-scanlines',
      trigger: 'always',
      config: {
        opacity: 0.4,
        blendMode: 'screen'
      }
    },
    {
      id: 'blue-tint',
      type: 'color-grade',
      assetId: 'procedural:cyan-tint',
      trigger: 'always',
      config: {
        opacity: 0.5,
        blendMode: 'overlay'
      }
    },
    {
      id: 'glitch-effect',
      type: 'particles',
      assetId: 'procedural:glitch-blocks',
      trigger: 'beat',
      config: {
        opacity: 0.6,
        blendMode: 'screen',
        beatThreshold: 0.8
      }
    },
    {
      id: 'holo-frame',
      type: 'texture',
      assetId: 'procedural:holo-border',
      trigger: 'always',
      config: {
        opacity: 0.8,
        blendMode: 'screen'
      }
    },
    {
      id: 'projection-text',
      type: 'text',
      assetId: 'text:hologram',
      trigger: 'always',
      config: {
        x: 0.5,
        y: 0.95,
        text: '[ HOLOGRAM ]',
        font: 'Orbitron',
        color: '#00FFFF',
        align: 'center'
      }
    }
  ],
  
  audio: {
    volume: 0.8,
    beatDetection: true
  },
  
  metadata: {
    author: 'TAM-TAM Team',
    version: '1.0.0',
    tags: ['hologram', 'sci-fi', 'future', 'tech']
  }
};
