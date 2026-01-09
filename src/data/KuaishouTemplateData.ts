/**
 * KuaishouTemplateData.ts
 * Données de templates pour le système Kuaishou
 * 3 templates de base: Dance Challenge, Photo Story, Tutorial Quick
 * Version: 1.0.0
 */

import { KuaishouTemplateConfig } from '../types/KuaishouTypes';

// ==========================================
// TEMPLATE 1: DANCE CHALLENGE
// ==========================================

export const danceChallenge01: KuaishouTemplateConfig = {
  id: 'dance_challenge_01',
  name: 'Dance Challenge Pro',
  description: 'Template parfait pour les challenges de danse. Mix tes moves avec des clips pros!',
  category: 'dance',
  contentType: 'video',
  difficulty: 'beginner',

  video: {
    duration: 15,
    format: '9:16',
    targetSize: '50-200MB',
    resolution: {
      width: 1080,
      height: 1920
    },
    frameRate: 30,
    bitrate: 8000000
  },

  segments: [
    {
      id: 'intro',
      type: 'template_video',
      start: 0,
      duration: 3,
      videoUrl: '/templates/assets/dance_01/intro.mp4',
      editable: false,
      effects: ['beat_sync', 'rgb_split']
    },
    {
      id: 'user_dance',
      type: 'user_capture',
      start: 3,
      duration: 8,
      minDuration: 5,
      maxDuration: 10,
      editable: true,
      guidance: {
        text: 'Filme-toi en train de danser sur le beat!',
        countdown: true,
        beatIndicator: true,
        onScreenGuide: '/templates/guides/dance_silhouette.png',
        visualCues: [
          {
            type: 'silhouette',
            position: { x: 0.5, y: 0.5 },
            size: { width: 400, height: 800 },
            animation: 'pulse_on_beat',
            timing: { start: 0, end: 8 },
            color: 'rgba(255, 255, 255, 0.3)'
          }
        ]
      },
      effects: ['stabilization', 'beauty', 'hdr_like']
    },
    {
      id: 'transition',
      type: 'template_video',
      start: 11,
      duration: 1,
      videoUrl: '/templates/assets/dance_01/transition.mp4',
      editable: false,
      effects: ['zoom_blur', 'beat_sync']
    },
    {
      id: 'outro',
      type: 'template_video',
      start: 12,
      duration: 3,
      videoUrl: '/templates/assets/dance_01/outro.mp4',
      editable: false,
      effects: []
    }
  ],

  music: {
    trackUrl: '/templates/music/trending/dance_track_128bpm.mp3',
    title: 'Dance Track',
    artist: 'Unknown',
    bpm: 128,
    beatMarkers: [],
    autoSync: true,
    cutOnBeat: true,
    volume: 0.8,
    fadeIn: 0.5,
    fadeOut: 1.0
  },

  autoEffects: {
    beauty: {
      enabled: true,
      intensity: 0.6,
      skinSmooth: true,
      eyeEnhance: true,
      faceSlim: 0.2,
      eyesBigger: 0.1,
      noseRefine: 0.05,
      teethWhiten: 0.3
    },
    stabilization: {
      enabled: true,
      strength: 0.8,
      method: 'optical_flow',
      cropFactor: 1.05
    },
    colorGrading: {
      enabled: true,
      lut: 'cinematic_warm',
      intensity: 0.7,
      temperature: 5,
      tint: 0,
      saturation: 1.2,
      contrast: 1.1,
      brightness: 0.05
    },
    sharpness: {
      enabled: true,
      amount: 1.2,
      radius: 1,
      threshold: 0
    },
    hdrLike: {
      enabled: true,
      highlights: -0.3,
      shadows: 0.4,
      midtones: 0,
      strength: 0.6
    },
    filmGrain: {
      enabled: false,
      intensity: 0,
      size: 1,
      type: 'fine'
    }
  },

  smartCuts: {
    enabled: true,
    algorithm: 'beat_motion_hybrid',
    minSegmentDuration: 1,
    maxSegmentDuration: 5,
    rules: [
      {
        type: 'beat_sync',
        priority: 'high',
        cutOnBeat: true,
        minSegmentDuration: 2
      },
      {
        type: 'motion_intensity',
        priority: 'medium',
        threshold: 0.7,
        action: 'cut_on_peak'
      },
      {
        type: 'face_detection',
        priority: 'high',
        avoidCuttingFaces: true
      }
    ]
  },

  transitions: [
    {
      between: ['intro', 'user_dance'],
      type: 'crossfade',
      duration: 0.5,
      beatSync: true,
      easing: 'easeInOut'
    },
    {
      between: ['user_dance', 'transition'],
      type: 'smart_cut',
      duration: 0.3,
      beatSync: true,
      algorithm: 'motion_match'
    },
    {
      between: ['transition', 'outro'],
      type: 'zoom_blur',
      duration: 0.8,
      beatSync: true
    }
  ],

  overlays: {
    stickers: [
      {
        id: 'fire_emoji',
        assetUrl: '/templates/stickers/fire.png',
        tracking: 'none',
        position: { x: 0.85, y: 0.2 },
        size: { width: 80, height: 80 },
        animation: 'bounce_on_beat',
        startTime: 3,
        endTime: 11,
        opacity: 1,
        rotation: 0
      }
    ],
    text: [
      {
        id: 'karaoke_caption',
        content: 'AUTO_DETECT',
        style: 'karaoke',
        position: { x: 0.5, y: 0.85 },
        animation: 'word_highlight',
        timing: 'auto_sync',
        font: {
          family: 'Arial Black',
          size: 48,
          weight: 'bold',
          italic: false
        },
        color: '#FFFFFF',
        outline: {
          color: '#000000',
          width: 4
        },
        shadow: {
          color: 'rgba(0,0,0,0.5)',
          blur: 10,
          offsetX: 2,
          offsetY: 2
        }
      }
    ],
    cta: {
      type: 'button',
      text: 'Essaye ce template! 🔥',
      position: { x: 0.5, y: 0.95 },
      startTime: 12,
      endTime: 15,
      action: 'open_template',
      style: {
        backgroundColor: '#FF3366',
        textColor: '#FFFFFF',
        borderRadius: 30,
        padding: 15,
        animation: 'pulse'
      }
    }
  },

  hooks: {
    enabled: true,
    autoDetect: true,
    suggestions: [
      {
        type: 'opening_hook',
        text: 'Regarde ce qui se passe! 👀',
        duration: 2,
        style: 'attention_grabber',
        voiceOver: false
      },
      {
        type: 'mid_hook',
        text: 'Attends la fin...',
        timestamp: 7,
        style: 'suspense',
        voiceOver: false
      }
    ]
  },

  hashtags: {
    autoGenerate: true,
    trending: ['#DanceChallenge', '#Viral2026', '#TAMTAMDance'],
    aiSuggested: 'AUTO_DETECT',
    maxHashtags: 5
  },

  metadata: {
    createdAt: '2026-01-09T00:00:00Z',
    updatedAt: '2026-01-09T00:00:00Z',
    author: 'TAM-TAM Team',
    version: '1.0.0',
    popularity: 95,
    usageCount: 15420,
    rating: 4.8,
    tags: ['dance', 'viral', 'challenge', 'trending'],
    thumbnail: '/templates/thumbnails/dance_challenge_01.jpg',
    previewVideo: '/templates/previews/dance_challenge_01.mp4'
  }
};

// ==========================================
// TEMPLATE 2: PHOTO STORY
// ==========================================

export const photoStory01: KuaishouTemplateConfig = {
  id: 'photo_story_01',
  name: 'Photo Story Pro',
  description: 'Transforme tes photos en story captivante avec Ken Burns et effets cinématiques',
  category: 'story',
  contentType: 'photo',
  difficulty: 'beginner',

  video: {
    duration: 15,
    format: '9:16',
    targetSize: '20-50MB',
    resolution: {
      width: 1080,
      height: 1920
    },
    frameRate: 30,
    bitrate: 5000000
  },

  segments: [
    {
      id: 'photo_1',
      type: 'photo_slot',
      start: 0,
      duration: 3,
      editable: true,
      effects: ['ken_burns', 'color_grading', 'film_grain'],
      kenBurns: {
        startScale: 1.0,
        endScale: 1.15,
        startPosition: { x: 0.5, y: 0.4 },
        endPosition: { x: 0.5, y: 0.5 },
        easing: 'easeInOutQuad'
      },
      colorGrading: {
        enabled: true,
        lut: 'vintage_film',
        intensity: 0.8,
        temperature: 10,
        saturation: 1.1,
        contrast: 1.15,
        brightness: 0.05
      }
    },
    {
      id: 'photo_2',
      type: 'photo_slot',
      start: 3,
      duration: 3,
      editable: true,
      effects: ['ken_burns', 'light_leak', 'vignette'],
      kenBurns: {
        startScale: 1.0,
        endScale: 1.2,
        startPosition: { x: 0.3, y: 0.5 },
        endPosition: { x: 0.7, y: 0.5 },
        easing: 'easeInOut'
      },
      lightLeak: {
        asset: '/templates/effects/light_leaks/light_leak_05.png',
        position: 'top_right',
        animation: 'fade_pulse',
        opacity: 0.4,
        blendMode: 'screen'
      }
    },
    {
      id: 'photo_3',
      type: 'photo_slot',
      start: 6,
      duration: 3,
      editable: true,
      effects: ['ken_burns', 'color_grading'],
      kenBurns: {
        startScale: 1.15,
        endScale: 1.0,
        startPosition: { x: 0.5, y: 0.6 },
        endPosition: { x: 0.5, y: 0.4 }
      }
    },
    {
      id: 'photo_4',
      type: 'photo_slot',
      start: 9,
      duration: 3,
      editable: true,
      effects: ['ken_burns', 'vignette'],
      kenBurns: {
        startScale: 1.0,
        endScale: 1.1,
        startPosition: { x: 0.4, y: 0.5 },
        endPosition: { x: 0.6, y: 0.5 }
      }
    },
    {
      id: 'photo_5',
      type: 'photo_slot',
      start: 12,
      duration: 3,
      editable: true,
      effects: ['ken_burns', 'color_grading', 'film_grain'],
      kenBurns: {
        startScale: 1.05,
        endScale: 1.2,
        startPosition: { x: 0.5, y: 0.5 },
        endPosition: { x: 0.5, y: 0.45 }
      }
    }
  ],

  music: {
    trackUrl: '/templates/music/ambient/chill_01.mp3',
    title: 'Chill Ambient',
    bpm: 90,
    beatMarkers: [],
    autoSync: true,
    cutOnBeat: true,
    volume: 0.6
  },

  autoEffects: {
    beauty: {
      enabled: false,
      intensity: 0,
      skinSmooth: false,
      eyeEnhance: false,
      faceSlim: 0
    },
    stabilization: {
      enabled: false,
      strength: 0,
      method: 'optical_flow',
      cropFactor: 1
    },
    colorGrading: {
      enabled: true,
      lut: 'vintage_film',
      intensity: 0.8,
      temperature: 10,
      saturation: 1.1,
      contrast: 1.15,
      brightness: 0.05
    },
    sharpness: {
      enabled: true,
      amount: 1.1,
      radius: 1,
      threshold: 0
    },
    hdrLike: {
      enabled: false,
      highlights: 0,
      shadows: 0,
      midtones: 0,
      strength: 0
    },
    filmGrain: {
      enabled: true,
      intensity: 0.15,
      size: 1.5,
      type: 'fine'
    }
  },

  smartCuts: {
    enabled: false,
    algorithm: 'beat_only',
    minSegmentDuration: 2,
    maxSegmentDuration: 5,
    rules: []
  },

  transitions: [
    {
      between: ['photo_1', 'photo_2'],
      type: 'crossfade',
      duration: 0.8,
      beatSync: true
    },
    {
      between: ['photo_2', 'photo_3'],
      type: 'crossfade',
      duration: 0.8,
      beatSync: true
    },
    {
      between: ['photo_3', 'photo_4'],
      type: 'zoom_blur',
      duration: 1.0,
      beatSync: true
    },
    {
      between: ['photo_4', 'photo_5'],
      type: 'crossfade',
      duration: 0.8,
      beatSync: true
    }
  ],

  overlays: {
    stickers: [],
    text: [
      {
        id: 'title_text',
        content: 'Mes Souvenirs ✨',
        style: 'title',
        position: { x: 0.5, y: 0.1 },
        animation: 'fade_in',
        timing: 'manual',
        font: {
          family: 'Georgia',
          size: 64,
          weight: 'bold',
          italic: true
        },
        color: '#FFFFFF',
        outline: {
          color: '#000000',
          width: 3
        },
        shadow: {
          color: 'rgba(0,0,0,0.8)',
          blur: 15,
          offsetX: 0,
          offsetY: 4
        }
      }
    ]
  },

  hooks: {
    enabled: false,
    autoDetect: false,
    suggestions: []
  },

  hashtags: {
    autoGenerate: true,
    trending: ['#Memories', '#PhotoStory', '#Life'],
    aiSuggested: 'AUTO_DETECT',
    maxHashtags: 3
  },

  metadata: {
    createdAt: '2026-01-09T00:00:00Z',
    updatedAt: '2026-01-09T00:00:00Z',
    author: 'TAM-TAM Team',
    version: '1.0.0',
    popularity: 88,
    usageCount: 8756,
    rating: 4.7,
    tags: ['photo', 'memories', 'story', 'cinematic'],
    thumbnail: '/templates/thumbnails/photo_story_01.jpg',
    previewVideo: '/templates/previews/photo_story_01.mp4'
  }
};

// ==========================================
// TEMPLATE 3: TUTORIAL QUICK
// ==========================================

export const tutorialQuick01: KuaishouTemplateConfig = {
  id: 'tutorial_quick_01',
  name: 'Tutorial Quick',
  description: 'Format parfait pour tutoriels courts et efficaces avec auto-captions',
  category: 'tutorial',
  contentType: 'video',
  difficulty: 'intermediate',

  video: {
    duration: 30,
    format: '9:16',
    targetSize: '100-300MB',
    resolution: {
      width: 1080,
      height: 1920
    },
    frameRate: 30,
    bitrate: 8000000
  },

  segments: [
    {
      id: 'hook',
      type: 'user_capture',
      start: 0,
      duration: 3,
      minDuration: 2,
      maxDuration: 5,
      editable: true,
      guidance: {
        text: 'Commence avec un hook accrocheur! 🎣',
        countdown: true,
        beatIndicator: false,
        visualCues: []
      },
      effects: ['stabilization', 'sharpness']
    },
    {
      id: 'step_1',
      type: 'user_capture',
      start: 3,
      duration: 8,
      minDuration: 5,
      maxDuration: 10,
      editable: true,
      guidance: {
        text: 'Étape 1: Explique le contexte',
        countdown: false,
        beatIndicator: false,
        visualCues: []
      },
      effects: ['stabilization', 'sharpness']
    },
    {
      id: 'step_2',
      type: 'user_capture',
      start: 11,
      duration: 8,
      minDuration: 5,
      maxDuration: 10,
      editable: true,
      guidance: {
        text: "Étape 2: Montre l'action 🎬",
        countdown: false,
        beatIndicator: false,
        visualCues: []
      },
      effects: ['stabilization']
    },
    {
      id: 'step_3',
      type: 'user_capture',
      start: 19,
      duration: 8,
      minDuration: 5,
      maxDuration: 10,
      editable: true,
      guidance: {
        text: 'Étape 3: Résultat final ✨',
        countdown: false,
        beatIndicator: false,
        visualCues: []
      },
      effects: ['stabilization', 'hdr_like']
    },
    {
      id: 'cta',
      type: 'template_video',
      start: 27,
      duration: 3,
      videoUrl: '/templates/assets/tutorial_01/cta.mp4',
      editable: false,
      effects: []
    }
  ],

  music: {
    trackUrl: '/templates/music/background/upbeat_01.mp3',
    bpm: 110,
    beatMarkers: [],
    autoSync: false,
    cutOnBeat: false,
    volume: 0.3
  },

  autoEffects: {
    beauty: {
      enabled: true,
      intensity: 0.3,
      skinSmooth: true,
      eyeEnhance: false,
      faceSlim: 0
    },
    stabilization: {
      enabled: true,
      strength: 0.9,
      method: 'optical_flow',
      cropFactor: 1.05
    },
    colorGrading: {
      enabled: true,
      lut: 'clean_natural',
      intensity: 0.5,
      saturation: 1.05,
      contrast: 1.05,
      brightness: 0.02
    },
    sharpness: {
      enabled: true,
      amount: 1.3,
      radius: 1,
      threshold: 0
    },
    hdrLike: {
      enabled: true,
      highlights: -0.2,
      shadows: 0.3,
      midtones: 0.05,
      strength: 0.5
    },
    denoising: {
      enabled: true,
      strength: 0.5,
      preserveDetails: true
    }
  },

  smartCuts: {
    enabled: true,
    algorithm: 'motion_only',
    minSegmentDuration: 2,
    maxSegmentDuration: 8,
    rules: [
      {
        type: 'motion_intensity',
        priority: 'high',
        threshold: 0.6,
        action: 'cut_on_low_motion'
      }
    ]
  },

  transitions: [
    {
      between: ['hook', 'step_1'],
      type: 'push',
      duration: 0.4,
      beatSync: false
    },
    {
      between: ['step_1', 'step_2'],
      type: 'wipe',
      duration: 0.5,
      beatSync: false
    },
    {
      between: ['step_2', 'step_3'],
      type: 'wipe',
      duration: 0.5,
      beatSync: false
    },
    {
      between: ['step_3', 'cta'],
      type: 'crossfade',
      duration: 0.6,
      beatSync: false
    }
  ],

  overlays: {
    stickers: [],
    text: [
      {
        id: 'auto_captions',
        content: 'AUTO_DETECT',
        style: 'subtitle',
        position: { x: 0.5, y: 0.85 },
        animation: 'fade_in',
        timing: 'auto_sync',
        font: {
          family: 'Arial',
          size: 42,
          weight: 'bold'
        },
        color: '#FFFFFF',
        backgroundColor: 'rgba(0,0,0,0.8)',
        outline: {
          color: '#000000',
          width: 2
        }
      }
    ],
    cta: {
      type: 'follow',
      text: 'Suis pour plus de tutos! 🔔',
      position: { x: 0.5, y: 0.9 },
      startTime: 27,
      action: 'follow',
      style: {
        backgroundColor: '#FF6B35',
        textColor: '#FFFFFF',
        borderRadius: 25,
        padding: 12
      }
    }
  },

  hooks: {
    enabled: true,
    autoDetect: true,
    suggestions: [
      {
        type: 'opening_hook',
        text: 'Je vais te montrer comment...',
        duration: 3,
        style: 'direct_address'
      }
    ]
  },

  hashtags: {
    autoGenerate: true,
    trending: ['#Tutorial', '#HowTo', '#LearnOnTAMTAM'],
    aiSuggested: 'AUTO_DETECT',
    maxHashtags: 5
  },

  metadata: {
    createdAt: '2026-01-09T00:00:00Z',
    updatedAt: '2026-01-09T00:00:00Z',
    author: 'TAM-TAM Team',
    version: '1.0.0',
    popularity: 92,
    usageCount: 12345,
    rating: 4.9,
    tags: ['tutorial', 'howto', 'educational', 'quick'],
    thumbnail: '/templates/thumbnails/tutorial_quick_01.jpg',
    previewVideo: '/templates/previews/tutorial_quick_01.mp4'
  }
};

// ==========================================
// EXPORT ALL TEMPLATES
// ==========================================

export const kuaishouTemplates: KuaishouTemplateConfig[] = [
  danceChallenge01,
  photoStory01,
  tutorialQuick01
];

export default kuaishouTemplates;
