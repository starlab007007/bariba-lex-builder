/**
 * Griot Digital Template
 * Traditional African storytelling meets modern technology
 * Features: light leaks (WebM VP9 alpha), lens flares (PNG alpha), audio beat sync
 */

import { Template } from '../types';

export const griotDigitalTemplate: Template = {
  id: 'griot-digital',
  name: 'Griot Digital',
  nameBa: 'Kɔ̀gbɛ́ Táárù',
  category: 'storytelling',
  description: 'Traditional African storytelling meets modern technology. Perfect for oral histories with magical light effects.',
  descriptionBa: 'Kɔ̀gbɛ́ tíí bɔ̀ɔ̀rɛ̀ n̄ tárá yɛ̀ɛ̀rù. Dùùrɛ̀ǹ bɔ̀ɔ̀rɛ̀ kpáá.',
  thumbnail: '/assets/templates/griot-digital-thumb.jpg',
  demoVideo: '/assets/templates/griot-digital-demo.mp4',
  duration: 30,
  isNew: true,
  isPremium: false,
  
  effects: [
    // === LIGHT LEAKS (WebM VP9 with alpha) ===
    {
      id: 'leak-ambient',
      type: 'light-leak',
      assetId: 'light-leak:leak-001.webm',
      trigger: 'always',
      config: {
        opacity: 0.4,
        blendMode: 'screen',
        scale: 1.2,
        x: 0,
        y: 0,
        loop: true
      }
    },
    {
      id: 'leak-beat-pulse',
      type: 'light-leak',
      assetId: 'light-leak:leak-002.webm',
      trigger: 'beat',
      config: {
        opacity: 0.6,
        blendMode: 'lighter',
        scale: 1.0,
        x: 0.5,
        y: 0.5,
        beatThreshold: 0.7,
        loop: true
      }
    },
    {
      id: 'leak-midstory',
      type: 'light-leak',
      assetId: 'light-leak:leak-003.webm',
      trigger: 'time',
      config: {
        opacity: 0.5,
        blendMode: 'overlay',
        scale: 1.1,
        x: 0,
        y: 0,
        timeRange: [3, 25],
        loop: true
      }
    },
    {
      id: 'leak-climax',
      type: 'light-leak',
      assetId: 'light-leak:leak-004.webm',
      trigger: 'time',
      config: {
        opacity: 0.7,
        blendMode: 'screen',
        scale: 1.3,
        x: 0,
        y: 0,
        timeRange: [20, 28],
        loop: true
      }
    },

    // === LENS FLARES (PNG with alpha) ===
    {
      id: 'flare-corner',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-001.png',
      trigger: 'always',
      config: {
        x: 0.85,
        y: 0.15,
        scale: 0.8,
        opacity: 0.7,
        blendMode: 'screen',
        rotation: 0
      }
    },
    {
      id: 'flare-beat',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-002.png',
      trigger: 'beat',
      config: {
        x: 0.3,
        y: 0.7,
        scale: 0.6,
        opacity: 0.8,
        blendMode: 'lighter',
        rotation: 45,
        beatThreshold: 0.75
      }
    },
    {
      id: 'flare-center',
      type: 'lens-flare',
      assetId: 'lens-flare:flare-003.png',
      trigger: 'time',
      config: {
        x: 0.5,
        y: 0.5,
        scale: 1.2,
        opacity: 0.5,
        blendMode: 'screen',
        rotation: 0,
        timeRange: [10, 20]
      }
    },

    // === TEXT OVERLAYS ===
    {
      id: 'title-main',
      type: 'text',
      assetId: 'text:title',
      trigger: 'time',
      config: {
        text: 'Kɔ̀gbè Táárù',
        x: 0.5,
        y: 0.12,
        font: 'bold 56px system-ui, -apple-system, sans-serif',
        color: '#FFD700',
        align: 'center',
        opacity: 1.0,
        strokeColor: '#000000',
        strokeWidth: 3,
        shadow: true,
        timeRange: [0, 5]
      }
    },
    {
      id: 'subtitle',
      type: 'text',
      assetId: 'text:subtitle',
      trigger: 'time',
      config: {
        text: 'Histoire Ancestrale',
        x: 0.5,
        y: 0.20,
        font: '32px system-ui, -apple-system, sans-serif',
        color: '#FFFFFF',
        align: 'center',
        opacity: 0.9,
        strokeColor: '#000000',
        strokeWidth: 2,
        shadow: true,
        timeRange: [0.5, 5]
      }
    },
    {
      id: 'speaker-badge',
      type: 'text',
      assetId: 'text:speaker',
      trigger: 'always',
      config: {
        text: 'Griot • Digital',
        x: 0.5,
        y: 0.92,
        font: 'bold 24px system-ui, -apple-system, sans-serif',
        color: '#FFD700',
        align: 'center',
        opacity: 0.85,
        strokeColor: '#000000',
        strokeWidth: 2,
        shadow: true
      }
    },
    {
      id: 'wisdom-quote',
      type: 'text',
      assetId: 'text:wisdom',
      trigger: 'keyword',
      config: {
        text: '🌟 Sagesse Ancestrale 🌟',
        keywords: ['sagesse', 'ancêtres', 'wisdom'],
        x: 0.5,
        y: 0.5,
        font: 'bold 36px system-ui, -apple-system, sans-serif',
        color: '#FFFFFF',
        align: 'center',
        opacity: 1.0,
        strokeColor: '#8B4513',
        strokeWidth: 3,
        shadow: true,
        duration: 3
      }
    }
  ],
  
  audio: {
    backgroundMusic: 'audio:modern/audio-0009.mp3',
    volume: 0.3,
    fadeWithSpeech: true,
    beatDetection: true
  },
  
  metadata: {
    author: 'TAM-TAM Team',
    version: '1.0.0',
    tags: ['storytelling', 'african', 'oral-tradition', 'griot', 'cultural', 'bariba']
  },
  
  tags: ['storytelling', 'african', 'griot', 'cultural'],
  usageCount: 0
};
