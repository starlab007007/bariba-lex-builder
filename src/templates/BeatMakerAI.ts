/**
 * BeatMakerAI Template - AI-Powered Afrobeat Generator
 * Creates professional beats from humming, tapping, or scratch
 * 
 * @module BeatMakerAI
 */

import { Template, TemplateCategory } from '@/components/tamtam/creator/TemplateSystem/types';

// ============================================================================
// TEMPLATE DEFINITION (Standard Interface)
// ============================================================================

export const BeatMakerAITemplate: Template = {
  id: 'beat-maker-ai',
  name: 'Beat Maker AI',
  nameBa: 'Dùndún Kɔ́ɖɔ̀ AI',
  category: 'music' as TemplateCategory,
  description: 'Créez des beats Afrobeat professionnels avec IA - Hum, Tap, ou Upload',
  descriptionBa: 'Ɖà dùndún Afrobeat kpɔ́n AI mɛ̀',
  thumbnail: '/assets/templates/beat-maker-ai.jpg',
  demoVideo: '/assets/templates/beat-maker-ai-demo.mp4',
  isPremium: true,
  isNew: true,
  duration: 240,
  tags: ['AI', 'Music', 'DAW', 'Afrobeat', 'Amapiano', 'Coupé-Décalé'],
  effects: [
    {
      type: 'particles',
      assetId: 'particles:particle-005.webm',
      trigger: 'beat',
      config: { opacity: 0.5, blendMode: 'screen' }
    },
    {
      type: 'light-leak',
      assetId: 'light-leak:leak-008.webm',
      trigger: 'beat',
      config: { opacity: 0.4, blendMode: 'screen' }
    }
  ],
  metadata: {
    author: 'TAM-TAM AI',
    version: '1.0.0',
    tags: ['premium', 'ai-powered', 'music-production']
  }
};

// Extended configuration
export const BeatMakerAIConfig = {
  requiredAssets: {
    models: [],
    particles: ['particle-005.webm', 'particle-012.webm', 'particle-020.webm'],
    lightLeaks: ['leak-008.webm', 'leak-015.webm', 'leak-025.webm'],
    lensFlares: ['flare-010.png', 'flare-025.png'],
    textures: ['texture-020.png', 'texture-045.png'],
    transitions: ['transition-008.mp4', 'transition-018.mp4'],
    audio: ['audio-020.mp3', 'audio-025.mp3', 'audio-030.mp3'],
    fonts: ['font-002.ttf', 'font-004.ttf']
  },
  renderSettings: {
    resolution: '1080p' as const,
    fps: 30,
    duration: 240,
    aspectRatio: '9:16' as const
  },
  aiFeatures: [
    'Hum-to-Beat',
    'Tap-to-Rhythm',
    'AI Producer',
    'Stem Export',
    'Style Transfer'
  ]
};

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type MusicalKey = 'C' | 'C#' | 'D' | 'D#' | 'E' | 'F' | 'F#' | 'G' | 'G#' | 'A' | 'A#' | 'B';
export type MusicalMode = 'major' | 'minor' | 'dorian' | 'mixolydian' | 'pentatonic';
export type BeatStyle = 'afrobeat' | 'amapiano' | 'coupe-decale' | 'highlife' | 'afro-house';
export type BeatInputType = 'hum' | 'tap' | 'upload' | 'scratch';

export interface TapEvent {
  timestamp: number;
  velocity: number;
  type: 'kick' | 'snare' | 'hat' | 'perc';
}

export interface MIDINote {
  pitch: number;
  velocity: number;
  startTime: number;
  duration: number;
  channel: number;
}

export interface MIDITrack {
  name: string;
  notes: MIDINote[];
  tempo: number;
  key: MusicalKey;
  mode: MusicalMode;
}

export interface BeatSection {
  name: 'intro' | 'verse' | 'chorus' | 'bridge' | 'outro';
  startBar: number;
  lengthBars: number;
  energy: number;
}

export interface TrackEffect {
  type: 'reverb' | 'delay' | 'compressor' | 'eq' | 'distortion' | 'filter';
  params: Record<string, number>;
  wet: number;
}

export interface BeatTrack {
  id: string;
  name: string;
  type: 'drums' | 'bass' | 'melody' | 'chords' | 'fx' | 'vocals';
  midi?: MIDITrack;
  audio?: AudioBuffer;
  volume: number;
  pan: number;
  muted: boolean;
  solo: boolean;
  effects: TrackEffect[];
}

export interface BeatComposition {
  id: string;
  name: string;
  style: BeatStyle;
  tempo: number;
  key: MusicalKey;
  mode: MusicalMode;
  timeSignature: [number, number];
  sections: BeatSection[];
  tracks: {
    drums: BeatTrack;
    bass: BeatTrack;
    melody: BeatTrack;
    chords: BeatTrack;
    fx: BeatTrack;
  };
  masterVolume: number;
  duration: number;
}

export interface BeatMakerInputs {
  inputType: BeatInputType;
  audioInput?: File;
  tapEvents?: TapEvent[];
  style: BeatStyle;
  tempo?: number;
  key?: MusicalKey;
  mode?: MusicalMode;
  duration: number;
}

// ============================================================================
// BEAT MAKER ENGINE
// ============================================================================

export class BeatMakerEngine {
  private audioContext: AudioContext | null = null;
  private composition: BeatComposition | null = null;
  private isPlaying = false;
  private currentTime = 0;

  constructor() {
    this.initAudio();
  }

  private async initAudio(): Promise<void> {
    try {
      this.audioContext = new AudioContext();
    } catch (error) {
      console.warn('[BeatMaker] Audio context init failed:', error);
    }
  }

  async processHumInput(audioFile: File): Promise<MIDITrack> {
    console.log('[BeatMaker] Processing hum input...');
    
    // Simplified hum-to-MIDI conversion
    // In production, this would use AI pitch detection
    const duration = await this.getAudioDuration(audioFile);
    const tempo = 120;
    const beatsCount = Math.floor((duration / 60) * tempo);
    
    const notes: MIDINote[] = [];
    for (let i = 0; i < beatsCount; i++) {
      notes.push({
        pitch: 60 + Math.floor(Math.random() * 12), // C4 to B4
        velocity: 80 + Math.floor(Math.random() * 40),
        startTime: i,
        duration: 0.5 + Math.random() * 0.5,
        channel: 0
      });
    }

    return {
      name: 'Hummed Melody',
      notes,
      tempo,
      key: 'C',
      mode: 'major'
    };
  }

  async processTapInput(tapEvents: TapEvent[]): Promise<MIDITrack> {
    console.log(`[BeatMaker] Processing ${tapEvents.length} tap events...`);
    
    if (tapEvents.length < 2) {
      return { name: 'Tapped Rhythm', notes: [], tempo: 120, key: 'C', mode: 'major' };
    }

    // Calculate tempo from tap intervals
    const intervals: number[] = [];
    for (let i = 1; i < tapEvents.length; i++) {
      intervals.push(tapEvents[i].timestamp - tapEvents[i - 1].timestamp);
    }
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const tempo = Math.round(60000 / avgInterval);

    // Convert taps to MIDI notes
    const notes: MIDINote[] = tapEvents.map((tap, i) => ({
      pitch: tap.type === 'kick' ? 36 : tap.type === 'snare' ? 38 : tap.type === 'hat' ? 42 : 45,
      velocity: Math.round(tap.velocity * 127),
      startTime: i,
      duration: 0.25,
      channel: 9 // Drum channel
    }));

    return {
      name: 'Tapped Rhythm',
      notes,
      tempo: Math.max(60, Math.min(180, tempo)),
      key: 'C',
      mode: 'major'
    };
  }

  async generateBeat(inputs: BeatMakerInputs): Promise<BeatComposition> {
    console.log(`[BeatMaker] Generating ${inputs.style} beat...`);

    const tempo = inputs.tempo || this.getDefaultTempo(inputs.style);
    const key = inputs.key || 'C';
    const mode = inputs.mode || 'minor';

    // Process input
    let melodyTrack: MIDITrack | null = null;
    if (inputs.inputType === 'hum' && inputs.audioInput) {
      melodyTrack = await this.processHumInput(inputs.audioInput);
    } else if (inputs.inputType === 'tap' && inputs.tapEvents) {
      melodyTrack = await this.processTapInput(inputs.tapEvents);
    }

    // Generate composition
    this.composition = {
      id: crypto.randomUUID(),
      name: `${inputs.style.charAt(0).toUpperCase() + inputs.style.slice(1)} Beat`,
      style: inputs.style,
      tempo,
      key,
      mode,
      timeSignature: [4, 4],
      sections: this.generateSections(inputs.duration),
      tracks: this.generateTracks(inputs.style, tempo, key, mode, melodyTrack),
      masterVolume: 0.8,
      duration: inputs.duration
    };

    return this.composition;
  }

  private getDefaultTempo(style: BeatStyle): number {
    const tempos: Record<BeatStyle, number> = {
      'afrobeat': 110,
      'amapiano': 115,
      'coupe-decale': 130,
      'highlife': 100,
      'afro-house': 125
    };
    return tempos[style];
  }

  private generateSections(duration: number): BeatSection[] {
    const barsPerMinute = 30; // At 120 BPM, 4/4
    const totalBars = Math.floor((duration / 60) * barsPerMinute);
    
    return [
      { name: 'intro', startBar: 0, lengthBars: Math.floor(totalBars * 0.1), energy: 0.4 },
      { name: 'verse', startBar: Math.floor(totalBars * 0.1), lengthBars: Math.floor(totalBars * 0.25), energy: 0.6 },
      { name: 'chorus', startBar: Math.floor(totalBars * 0.35), lengthBars: Math.floor(totalBars * 0.2), energy: 0.9 },
      { name: 'verse', startBar: Math.floor(totalBars * 0.55), lengthBars: Math.floor(totalBars * 0.2), energy: 0.7 },
      { name: 'chorus', startBar: Math.floor(totalBars * 0.75), lengthBars: Math.floor(totalBars * 0.15), energy: 1.0 },
      { name: 'outro', startBar: Math.floor(totalBars * 0.9), lengthBars: Math.floor(totalBars * 0.1), energy: 0.3 }
    ];
  }

  private generateTracks(
    style: BeatStyle,
    tempo: number,
    key: MusicalKey,
    mode: MusicalMode,
    melodyInput?: MIDITrack | null
  ): BeatComposition['tracks'] {
    const createTrack = (name: string, type: BeatTrack['type']): BeatTrack => ({
      id: crypto.randomUUID(),
      name,
      type,
      volume: 0.8,
      pan: 0,
      muted: false,
      solo: false,
      effects: []
    });

    return {
      drums: {
        ...createTrack('Drums', 'drums'),
        midi: this.generateDrumPattern(style, tempo)
      },
      bass: {
        ...createTrack('Bass', 'bass'),
        midi: this.generateBassLine(key, mode, tempo)
      },
      melody: {
        ...createTrack('Melody', 'melody'),
        midi: melodyInput || this.generateMelody(key, mode, tempo)
      },
      chords: {
        ...createTrack('Chords', 'chords'),
        midi: this.generateChords(key, mode, tempo)
      },
      fx: {
        ...createTrack('FX', 'fx'),
        effects: [{ type: 'reverb', params: { size: 0.7, decay: 2 }, wet: 0.3 }]
      }
    };
  }

  private generateDrumPattern(style: BeatStyle, tempo: number): MIDITrack {
    const notes: MIDINote[] = [];
    const bars = 4;
    const beatsPerBar = 4;
    
    for (let bar = 0; bar < bars; bar++) {
      for (let beat = 0; beat < beatsPerBar; beat++) {
        const time = bar * beatsPerBar + beat;
        
        // Kick on 1 and 3
        if (beat === 0 || beat === 2) {
          notes.push({ pitch: 36, velocity: 100, startTime: time, duration: 0.5, channel: 9 });
        }
        
        // Snare on 2 and 4
        if (beat === 1 || beat === 3) {
          notes.push({ pitch: 38, velocity: 90, startTime: time, duration: 0.25, channel: 9 });
        }
        
        // Hi-hat on every 8th
        notes.push({ pitch: 42, velocity: 70, startTime: time, duration: 0.125, channel: 9 });
        notes.push({ pitch: 42, velocity: 60, startTime: time + 0.5, duration: 0.125, channel: 9 });
      }
    }

    return { name: 'Drums', notes, tempo, key: 'C', mode: 'major' };
  }

  private generateBassLine(key: MusicalKey, mode: MusicalMode, tempo: number): MIDITrack {
    const rootNote = this.keyToMidi(key) + 36; // Bass register
    const notes: MIDINote[] = [];
    
    for (let i = 0; i < 16; i++) {
      notes.push({
        pitch: rootNote + (i % 4 === 0 ? 0 : i % 4 === 2 ? 7 : 5),
        velocity: 90,
        startTime: i,
        duration: 0.75,
        channel: 0
      });
    }

    return { name: 'Bass', notes, tempo, key, mode };
  }

  private generateMelody(key: MusicalKey, mode: MusicalMode, tempo: number): MIDITrack {
    const rootNote = this.keyToMidi(key) + 60; // Mid register
    const scale = mode === 'minor' ? [0, 2, 3, 5, 7, 8, 10] : [0, 2, 4, 5, 7, 9, 11];
    const notes: MIDINote[] = [];
    
    for (let i = 0; i < 8; i++) {
      const scaleNote = scale[Math.floor(Math.random() * scale.length)];
      notes.push({
        pitch: rootNote + scaleNote,
        velocity: 80,
        startTime: i * 2,
        duration: 1.5,
        channel: 0
      });
    }

    return { name: 'Melody', notes, tempo, key, mode };
  }

  private generateChords(key: MusicalKey, mode: MusicalMode, tempo: number): MIDITrack {
    const rootNote = this.keyToMidi(key) + 48;
    const notes: MIDINote[] = [];
    
    // Simple chord progression
    const progression = mode === 'minor' ? [0, 3, 5, 7] : [0, 5, 7, 5];
    
    for (let i = 0; i < 4; i++) {
      const root = rootNote + progression[i];
      const third = root + (mode === 'minor' ? 3 : 4);
      const fifth = root + 7;
      
      [root, third, fifth].forEach(pitch => {
        notes.push({
          pitch,
          velocity: 70,
          startTime: i * 4,
          duration: 3.5,
          channel: 0
        });
      });
    }

    return { name: 'Chords', notes, tempo, key, mode };
  }

  private keyToMidi(key: MusicalKey): number {
    const keys: Record<MusicalKey, number> = {
      'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5,
      'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11
    };
    return keys[key];
  }

  private getAudioDuration(file: File): Promise<number> {
    return new Promise((resolve) => {
      const audio = new Audio();
      audio.src = URL.createObjectURL(file);
      audio.onloadedmetadata = () => {
        URL.revokeObjectURL(audio.src);
        resolve(audio.duration);
      };
      audio.onerror = () => resolve(60);
    });
  }

  play(): void {
    this.isPlaying = true;
  }

  stop(): void {
    this.isPlaying = false;
  }

  dispose(): void {
    this.stop();
    if (this.audioContext) {
      this.audioContext.close();
    }
  }
}

export default BeatMakerAITemplate;
