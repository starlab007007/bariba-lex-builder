/**
 * TAM-TAM Template: Hologram Effect
 * Sci-fi holographic visual style - Real assets only
 */

import { Template } from '../types';

export const hologramEffectTemplate: Template = {
  id: 'hologram-effect',
  name: 'Hologram Effect',
  nameBa: 'Hologram',
  category: 'future',
  description: 'Effet holographique science-fiction',
  descriptionBa: 'Wéérù hologram',
  thumbnail: '/assets/templates/hologram-effect-thumb.jpg',
  duration: 20,
  isPremium: true,
  isNew: true,
  
  effects: [
    {
      id: 'hologram-flare-1',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-100.png',
      trigger: 'always',
      config: { x: 0.5, y: 0.3, scale: 1.0, opacity: 0.4, blendMode: 'screen' }
    },
    {
      id: 'hologram-flare-2',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-150.png',
      trigger: 'beat',
      config: { x: 0.3, y: 0.6, scale: 0.8, opacity: 0.6, blendMode: 'screen', beatThreshold: 0.8 }
    },
    {
      id: 'holo-corner-flare',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-200.png',
      trigger: 'always',
      config: { x: 0.9, y: 0.1, scale: 0.5, opacity: 0.8, blendMode: 'screen' }
    },
    // Light Leak effect - scan line hologram
    {
      id: 'holo-scan-leak',
      type: 'light-leak',
      assetId: 'light-leak:leak-035.webm',
      trigger: 'always',
      config: { x: 0.5, y: 0.5, scale: 1.3, opacity: 0.25, blendMode: 'screen' }
    },
    {
      id: 'projection-text',
      type: 'text',
      assetId: 'text:hologram',
      trigger: 'always',
      config: { x: 0.5, y: 0.95, text: '[ HOLOGRAM ]', font: 'Orbitron', color: '#00FFFF', align: 'center' }
    }
  ],
  
  audio: {
    volume: 0.8,
    beatDetection: true
  },
  
  metadata: {
    author: 'TAM-TAM Team',
    version: '2.0.0',
    tags: ['hologram', 'sci-fi', 'future', 'tech']
  }
};
