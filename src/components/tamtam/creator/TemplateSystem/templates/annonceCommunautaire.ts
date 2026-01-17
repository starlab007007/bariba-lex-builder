/**
 * TAM-TAM Template: Annonce Communautaire
 * Community announcement format
 */

import { Template } from '../types';

export const annonceCommunautaireTemplate: Template = {
  id: 'annonce-communautaire',
  name: 'Annonce Communautaire',
  nameBa: 'Ìkéde Àwùjọ',
  category: 'business',
  description: 'Annonces et informations communautaires',
  descriptionBa: 'Ìròyìn fún àwùjọ',
  thumbnail: '/assets/templates/annonce-communautaire-thumb.jpg',
  duration: 30,
  isPremium: false,
  isNew: true,
  
  effects: [
    {
      id: 'megaphone-icon',
      type: 'text',
      assetId: 'text:megaphone',
      trigger: 'time',
      config: {
        x: 0.5,
        y: 0.15,
        text: '📢',
        font: 'System',
        scale: 2,
        timeRange: [0, 3],
        animation: 'bounce'
      }
    },
    {
      id: 'announcement-banner',
      type: 'texture',
      assetId: 'procedural:banner-stripe',
      trigger: 'always',
      config: {
        y: 0.1,
        opacity: 0.9,
        blendMode: 'source-over'
      }
    },
    {
      id: 'urgent-pulse',
      type: 'light-leak',
      assetId: 'procedural:light-leak-red',
      trigger: 'beat',
      config: {
        opacity: 0.2,
        blendMode: 'screen',
        beatThreshold: 0.5
      }
    },
    {
      id: 'info-text',
      type: 'text',
      assetId: 'text:info',
      trigger: 'always',
      config: {
        x: 0.5,
        y: 0.9,
        text: 'Information Importante',
        font: 'Roboto',
        color: '#FFFFFF',
        align: 'center'
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
    tags: ['announcement', 'community', 'news', 'info']
  }
};
