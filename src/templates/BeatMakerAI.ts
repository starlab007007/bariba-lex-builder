/**
 * BeatMakerAI Template - AI-Powered Afrobeat Generator
 * Creates professional beats from humming, tapping, or scratch
 * 
 * @module BeatMakerAI
 */

import { aiServicesHub, AudioFile, MusicStyle } from '@/lib/AIServicesHub';
import { AudioSyncEngine } from '@/lib/AudioSyncEngine';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/** Musical keys */
export type MusicalKey = 
  | 'C' | 'C#' | 'D' | 'D#' | 'E' | 'F' 
  | 'F#' | 'G' | 'G#' | 'A' | 'A#' | 'B';

/** Musical mode */
export type MusicalMode = 'major' | 'minor' | 'dorian' | 'mixolydian' | 'pentatonic';

/** Beat style */
export type BeatStyle = 'afrobeat' | 'amapiano' | 'coupe-decale' | 'highlife' | 'afro-house';

/** Input type for beat creation */
export type BeatInputType = 'hum' | 'tap' | 'upload' | 'scratch';

/** Tap event from rhythm input */
export interface TapEvent {
  timestamp: number;
  velocity: number; // 0-1
  type: 'kick' | 'snare' | 'hat' | 'perc';
}

/** MIDI note */
export interface MIDINote {
  pitch: number; // 0-127
  velocity: number; // 0-127
  startTime: number; // in beats
  duration: number; // in beats
  channel: number;
}

/** MIDI track */
export interface MIDITrack {
  name: string;
  notes: MIDINote[];
  tempo: number;
  key: MusicalKey;
  mode: MusicalMode;
}

/** Beat section */
export interface BeatSection {
  name: 'intro' | 'verse' | 'chorus' | 'bridge' | 'outro';
  startBar: number;
  lengthBars: number;
  energy: number; // 0-1
}

/** Individual track in composition */
export interface BeatTrack {
  id: string;
  name: string;
  type: 'drums' | 'bass' | 'melody' | 'chords' | 'fx' | 'vocals';
  midi?: MIDITrack;
  audio?: AudioBuffer;
  volume: number; // 0-1
  pan: number; // -1 to 1
  muted: boolean;
  solo: boolean;
  effects: TrackEffect[];
}

/** Track effect */
export interface TrackEffect {
  type: 'reverb' | 'delay' | 'compressor' | 'eq' | 'distortion' | 'filter';
  params: Record<string, number>;
  wet: number; // 0-1
}

/** Complete beat composition */
export interface BeatComposition {
  id: string;
  name: string;
  style: BeatStyle;
  tempo: number;
  key: MusicalKey;
  mode: MusicalMode;
  timeSignature: [number, number]; // e.g., [4, 4]
  sections: BeatSection[];
  tracks: {
    drums: BeatTrack;
    bass: BeatTrack;
    melody: BeatTrack;
    chords: BeatTrack;
    fx: BeatTrack;
  };
  masterVolume: number;
  duration: number; // in seconds
  createdAt: Date;
}

/** Stem export files */
export interface StemFiles {
  drums: Blob;
  bass: Blob;
  melody: Blob;
  chords: Blob;
  fx: Blob;
  master: Blob;
}

/** User inputs for beat creation */
export interface BeatMakerInputs {
  inputType: BeatInputType;
  audioInput?: File;
  tapPattern?: TapEvent[];
  style: BeatStyle;
  tempo?: number;
  key?: MusicalKey;
  mode?: MusicalMode;
  duration?: number; // in seconds
}

/** Template interface */
export interface Template {
  id: string;
  name: string;
  category: string;
  description: string;
  descriptionBa?: string;
  requiredAssets: {
    particles: string[];
    lightLeaks: string[];
    textures: string[];
    audio: string[];
    fonts: string[];
  };
  renderSettings: {
    resolution: string;
    fps: number;
    duration: number;
  };
  aiFeatures: string[];
  tags?: string[];
}

/** Render progress callback */
export type RenderProgressCallback = (progress: number, stage: string) => void;

// ============================================================================
// BEAT MAKER AI TEMPLATE
// ============================================================================

/**
 * BeatMakerAI Template Definition
 */
export const BeatMakerAITemplate: Template = {
  id: 'beat-maker-ai',
  name: 'Beat Maker AI - Créateur Beats Afrobeat',
  category: 'music',
  description: 'AI compose beats professionnels en 30 secondes. Fredonnez, tapez ou uploadez pour créer.',
  descriptionBa: 'AI dó wéré beat kpɛ̀dé 30 sɛ́kɔ́ndì mɛ̀',
  
  requiredAssets: {
    particles: [
      'particle-004.webm', // Sound waves
      'particle-013.webm', // Neon particles
      'particle-021.webm', // Pulse rings
    ],
    lightLeaks: [
      'leak-005.webm', // Cyan flash
      'leak-011.webm', // Purple glow
      'leak-016.webm', // Orange burst
    ],
    textures: [
      'texture-022.png', // Waveform background
      'texture-078.png', // Spectrum overlay
      'texture-145.png', // Grid pattern
    ],
    audio: [
      'audio-001.mp3', // Afrobeat kit
      'audio-004.mp3', // Amapiano kit
      'audio-010.mp3', // Coupé-décalé kit
      'audio-016.mp3', // FX samples
    ],
    fonts: [
      'font-001.ttf', // Display
      'font-008.ttf', // Mono (BPM display)
      'font-002.ttf', // UI labels
    ]
  },
  
  renderSettings: {
    resolution: '1080p',
    fps: 60,
    duration: 120 // 2 minutes
  },
  
  aiFeatures: [
    'Hum-to-Beat',
    'AI Producer',
    'Stem Separation',
    'Auto-Mix/Master',
    'Tap-to-Rhythm',
    'Style Transfer',
    'Chord Progression AI',
    'Melody Generation'
  ],
  
  tags: ['music', 'beats', 'afrobeat', 'amapiano', 'producer', 'ai', 'studio']
};

// ============================================================================
// BEAT MAKER ENGINE
// ============================================================================

/**
 * BeatMakerEngine - Core engine for AI beat generation
 */
export class BeatMakerEngine {
  private audioContext: AudioContext | null = null;
  private audioEngine: AudioSyncEngine;
  private masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  
  // Current composition
  private composition: BeatComposition | null = null;
  
  // Playback state
  private isPlaying: boolean = false;
  private playbackPosition: number = 0;
  private scheduledNodes: AudioBufferSourceNode[] = [];
  
  // Visualization
  private visualizationCanvas: HTMLCanvasElement | null = null;
  private animationFrameId: number | null = null;

  constructor() {
    this.audioEngine = new AudioSyncEngine();
  }

  /**
   * Initialize audio context
   */
  public async initialize(): Promise<void> {
    this.audioContext = new AudioContext();
    this.masterGain = this.audioContext.createGain();
    this.analyser = this.audioContext.createAnalyser();
    
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.8;
    
    this.masterGain.connect(this.analyser);
    this.analyser.connect(this.audioContext.destination);
  }

  /**
   * Generate beat from inputs
   */
  public async generateBeat(
    inputs: BeatMakerInputs,
    onProgress?: RenderProgressCallback
  ): Promise<BeatComposition> {
    if (!this.audioContext) {
      await this.initialize();
    }

    onProgress?.(0.05, 'Analyzing input...');

    let baseMelody: MIDITrack | null = null;
    let detectedTempo = inputs.tempo || 120;
    let detectedKey = inputs.key || 'C';

    // Process input based on type
    switch (inputs.inputType) {
      case 'hum':
        if (inputs.audioInput) {
          onProgress?.(0.15, 'Transcribing humming...');
          baseMelody = await this.humToMIDI(inputs.audioInput);
          detectedTempo = baseMelody.tempo;
          detectedKey = baseMelody.key;
        }
        break;
        
      case 'tap':
        if (inputs.tapPattern && inputs.tapPattern.length > 0) {
          onProgress?.(0.15, 'Analyzing tap pattern...');
          const rhythm = this.analyzeTapRhythm(inputs.tapPattern);
          detectedTempo = rhythm.tempo;
        }
        break;
        
      case 'upload':
        if (inputs.audioInput) {
          onProgress?.(0.15, 'Analyzing uploaded audio...');
          const analysis = await this.analyzeAudio(inputs.audioInput);
          detectedTempo = analysis.tempo;
          detectedKey = analysis.key;
        }
        break;
        
      case 'scratch':
        onProgress?.(0.15, 'Starting from scratch...');
        // Use defaults
        break;
    }

    onProgress?.(0.30, 'Generating drum pattern...');
    
    // Generate each track
    const drums = await this.generateDrums(inputs.style, detectedTempo);
    
    onProgress?.(0.45, 'Creating bassline...');
    const bass = await this.generateBass(inputs.style, detectedTempo, detectedKey, inputs.mode || 'minor');
    
    onProgress?.(0.60, 'Composing melody...');
    const melody = baseMelody 
      ? await this.enhanceMelody(baseMelody, inputs.style)
      : await this.generateMelody(inputs.style, detectedTempo, detectedKey, inputs.mode || 'minor');
    
    onProgress?.(0.75, 'Adding chords...');
    const chords = await this.generateChords(inputs.style, detectedTempo, detectedKey, inputs.mode || 'minor');
    
    onProgress?.(0.85, 'Creating FX layer...');
    const fx = await this.generateFX(inputs.style, detectedTempo);
    
    onProgress?.(0.95, 'Mixing and mastering...');
    
    // Create composition
    const duration = inputs.duration || 120;
    const barsPerSection = Math.floor((duration / 60) * (detectedTempo / 4) / 4);
    
    this.composition = {
      id: crypto.randomUUID(),
      name: `${inputs.style.charAt(0).toUpperCase() + inputs.style.slice(1)} Beat`,
      style: inputs.style,
      tempo: detectedTempo,
      key: detectedKey,
      mode: inputs.mode || 'minor',
      timeSignature: [4, 4],
      sections: [
        { name: 'intro', startBar: 0, lengthBars: Math.min(8, barsPerSection), energy: 0.5 },
        { name: 'verse', startBar: 8, lengthBars: Math.min(16, barsPerSection * 2), energy: 0.7 },
        { name: 'chorus', startBar: 24, lengthBars: Math.min(16, barsPerSection * 2), energy: 1.0 },
        { name: 'outro', startBar: 40, lengthBars: Math.min(8, barsPerSection), energy: 0.4 }
      ],
      tracks: { drums, bass, melody, chords, fx },
      masterVolume: 0.8,
      duration,
      createdAt: new Date()
    };

    onProgress?.(1.0, 'Complete!');
    
    return this.composition;
  }

  /**
   * Convert humming to MIDI
   */
  private async humToMIDI(audioFile: File): Promise<MIDITrack> {
    const arrayBuffer = await audioFile.arrayBuffer();
    const audioBuffer = await this.audioContext!.decodeAudioData(arrayBuffer);
    
    // Analyze audio for pitch detection
    const pitches = this.detectPitches(audioBuffer);
    const tempo = this.detectTempo(audioBuffer);
    const key = this.detectKey(pitches);
    
    // Convert pitches to MIDI notes
    const notes: MIDINote[] = [];
    let currentPitch = -1;
    let noteStart = 0;
    
    for (let i = 0; i < pitches.length; i++) {
      const pitch = pitches[i];
      const time = i * (audioBuffer.duration / pitches.length);
      
      if (pitch > 0 && pitch !== currentPitch) {
        if (currentPitch > 0) {
          notes.push({
            pitch: this.frequencyToMIDI(currentPitch),
            velocity: 100,
            startTime: noteStart * (tempo / 60),
            duration: (time - noteStart) * (tempo / 60),
            channel: 0
          });
        }
        currentPitch = pitch;
        noteStart = time;
      } else if (pitch <= 0 && currentPitch > 0) {
        notes.push({
          pitch: this.frequencyToMIDI(currentPitch),
          velocity: 100,
          startTime: noteStart * (tempo / 60),
          duration: (time - noteStart) * (tempo / 60),
          channel: 0
        });
        currentPitch = -1;
      }
    }
    
    return {
      name: 'Hummed Melody',
      notes,
      tempo,
      key,
      mode: 'minor'
    };
  }

  /**
   * Analyze tap rhythm pattern
   */
  private analyzeTapRhythm(taps: TapEvent[]): { tempo: number; pattern: number[] } {
    if (taps.length < 2) {
      return { tempo: 120, pattern: [1, 0, 0, 0] };
    }

    // Calculate intervals
    const intervals: number[] = [];
    for (let i = 1; i < taps.length; i++) {
      intervals.push(taps[i].timestamp - taps[i - 1].timestamp);
    }

    // Calculate average interval
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    
    // Convert to BPM (assuming quarter notes)
    const tempo = Math.round(60000 / avgInterval);
    
    // Quantize to pattern
    const beatDuration = avgInterval;
    const pattern: number[] = [];
    
    for (const tap of taps) {
      const beatPosition = Math.round((tap.timestamp / beatDuration) % 16);
      while (pattern.length <= beatPosition) {
        pattern.push(0);
      }
      pattern[beatPosition] = Math.round(tap.velocity * 127);
    }
    
    return { tempo: Math.max(60, Math.min(200, tempo)), pattern };
  }

  /**
   * Analyze uploaded audio
   */
  private async analyzeAudio(file: File): Promise<{ tempo: number; key: MusicalKey }> {
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await this.audioContext!.decodeAudioData(arrayBuffer);
    
    const tempo = this.detectTempo(audioBuffer);
    const pitches = this.detectPitches(audioBuffer);
    const key = this.detectKey(pitches);
    
    return { tempo, key };
  }

  /**
   * Generate drum track
   */
  private async generateDrums(style: BeatStyle, tempo: number): Promise<BeatTrack> {
    const patterns = this.getDrumPatterns(style);
    const notes: MIDINote[] = [];
    
    // Generate 8 bars of drums
    for (let bar = 0; bar < 8; bar++) {
      const pattern = patterns[bar % patterns.length];
      
      for (let step = 0; step < 16; step++) {
        const beat = bar * 4 + step / 4;
        
        // Kick
        if (pattern.kick[step % pattern.kick.length]) {
          notes.push({
            pitch: 36, // C1 - Kick
            velocity: 110 + Math.random() * 17,
            startTime: beat,
            duration: 0.25,
            channel: 9
          });
        }
        
        // Snare
        if (pattern.snare[step % pattern.snare.length]) {
          notes.push({
            pitch: 38, // D1 - Snare
            velocity: 100 + Math.random() * 20,
            startTime: beat,
            duration: 0.25,
            channel: 9
          });
        }
        
        // Hi-hat
        if (pattern.hihat[step % pattern.hihat.length]) {
          notes.push({
            pitch: step % 2 === 0 ? 42 : 44, // Closed/Open hat
            velocity: 70 + Math.random() * 30,
            startTime: beat,
            duration: 0.125,
            channel: 9
          });
        }
      }
    }
    
    return {
      id: 'drums',
      name: 'Drums',
      type: 'drums',
      midi: { name: 'Drums', notes, tempo, key: 'C', mode: 'major' },
      volume: 0.85,
      pan: 0,
      muted: false,
      solo: false,
      effects: [
        { type: 'compressor', params: { threshold: -12, ratio: 4, attack: 0.003, release: 0.25 }, wet: 1 },
        { type: 'eq', params: { lowGain: 2, midGain: 0, highGain: 1 }, wet: 1 }
      ]
    };
  }

  /**
   * Get drum patterns for style
   */
  private getDrumPatterns(style: BeatStyle): { kick: number[]; snare: number[]; hihat: number[] }[] {
    const patterns: Record<BeatStyle, { kick: number[]; snare: number[]; hihat: number[] }[]> = {
      afrobeat: [
        {
          kick: [1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0],
          snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
          hihat: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
        }
      ],
      amapiano: [
        {
          kick: [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          snare: [0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
          hihat: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0]
        }
      ],
      'coupe-decale': [
        {
          kick: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
          snare: [0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1],
          hihat: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
        }
      ],
      highlife: [
        {
          kick: [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0],
          snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
          hihat: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0]
        }
      ],
      'afro-house': [
        {
          kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
          snare: [0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
          hihat: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0]
        }
      ]
    };
    
    return patterns[style] || patterns.afrobeat;
  }

  /**
   * Generate bass track
   */
  private async generateBass(
    style: BeatStyle,
    tempo: number,
    key: MusicalKey,
    mode: MusicalMode
  ): Promise<BeatTrack> {
    const scale = this.getScale(key, mode);
    const notes: MIDINote[] = [];
    const rootNote = this.keyToMIDI(key) + 24; // Bass range
    
    // Style-specific bass patterns
    const patterns = {
      afrobeat: [0, 0, 7, 0, 5, 0, 3, 0],
      amapiano: [0, -1, 0, -1, 7, -1, 5, -1], // -1 = rest
      'coupe-decale': [0, 0, 0, 5, 0, 0, 3, 0],
      highlife: [0, 3, 5, 0, 7, 5, 3, 0],
      'afro-house': [0, -1, -1, 0, -1, -1, 0, -1]
    };
    
    const pattern = patterns[style] || patterns.afrobeat;
    
    // Generate 8 bars
    for (let bar = 0; bar < 8; bar++) {
      for (let step = 0; step < 8; step++) {
        const interval = pattern[step];
        if (interval >= 0) {
          const pitch = rootNote + scale[interval % scale.length];
          notes.push({
            pitch,
            velocity: 100 + Math.random() * 20,
            startTime: bar * 4 + step * 0.5,
            duration: 0.4,
            channel: 1
          });
        }
      }
    }
    
    return {
      id: 'bass',
      name: 'Bass',
      type: 'bass',
      midi: { name: 'Bass', notes, tempo, key, mode },
      volume: 0.8,
      pan: 0,
      muted: false,
      solo: false,
      effects: [
        { type: 'compressor', params: { threshold: -8, ratio: 6, attack: 0.01, release: 0.1 }, wet: 1 },
        { type: 'eq', params: { lowGain: 3, midGain: -1, highGain: -2 }, wet: 1 }
      ]
    };
  }

  /**
   * Generate melody track
   */
  private async generateMelody(
    style: BeatStyle,
    tempo: number,
    key: MusicalKey,
    mode: MusicalMode
  ): Promise<BeatTrack> {
    const scale = this.getScale(key, mode);
    const notes: MIDINote[] = [];
    const rootNote = this.keyToMIDI(key) + 60; // Melody range
    
    // Generate melodic phrases
    for (let bar = 0; bar < 8; bar++) {
      const phraseStart = bar * 4;
      
      // Create a 4-note motif per bar
      for (let i = 0; i < 4; i++) {
        const scaleIndex = Math.floor(Math.random() * scale.length);
        const octaveShift = Math.random() > 0.7 ? 12 : 0;
        
        notes.push({
          pitch: rootNote + scale[scaleIndex] + octaveShift,
          velocity: 80 + Math.random() * 30,
          startTime: phraseStart + i,
          duration: 0.5 + Math.random() * 0.5,
          channel: 2
        });
      }
    }
    
    return {
      id: 'melody',
      name: 'Melody',
      type: 'melody',
      midi: { name: 'Melody', notes, tempo, key, mode },
      volume: 0.7,
      pan: 0.2,
      muted: false,
      solo: false,
      effects: [
        { type: 'reverb', params: { decay: 2, wet: 0.3 }, wet: 0.3 },
        { type: 'delay', params: { time: 0.25, feedback: 0.3 }, wet: 0.2 }
      ]
    };
  }

  /**
   * Enhance existing melody
   */
  private async enhanceMelody(melody: MIDITrack, style: BeatStyle): Promise<BeatTrack> {
    // Add harmonies and variations
    const enhancedNotes = [...melody.notes];
    
    // Add thirds and fifths on some notes
    for (const note of melody.notes) {
      if (Math.random() > 0.6) {
        enhancedNotes.push({
          ...note,
          pitch: note.pitch + 4, // Third
          velocity: note.velocity * 0.7
        });
      }
    }
    
    return {
      id: 'melody',
      name: 'Melody',
      type: 'melody',
      midi: { ...melody, notes: enhancedNotes },
      volume: 0.7,
      pan: 0.2,
      muted: false,
      solo: false,
      effects: [
        { type: 'reverb', params: { decay: 2, wet: 0.3 }, wet: 0.3 }
      ]
    };
  }

  /**
   * Generate chord track
   */
  private async generateChords(
    style: BeatStyle,
    tempo: number,
    key: MusicalKey,
    mode: MusicalMode
  ): Promise<BeatTrack> {
    const rootNote = this.keyToMIDI(key) + 48;
    const notes: MIDINote[] = [];
    
    // Common chord progressions
    const progressions: Record<string, number[][]> = {
      minor: [[0, 3, 7], [5, 8, 12], [7, 10, 14], [3, 7, 10]],
      major: [[0, 4, 7], [5, 9, 12], [7, 11, 14], [0, 4, 7]],
      dorian: [[0, 3, 7], [2, 5, 9], [5, 8, 12], [7, 10, 14]],
      mixolydian: [[0, 4, 7], [10, 14, 17], [7, 11, 14], [5, 9, 12]],
      pentatonic: [[0, 3, 7], [5, 8, 12], [7, 10, 14], [0, 3, 7]]
    };
    
    const chords = progressions[mode] || progressions.minor;
    
    // Generate 8 bars with chord changes every 2 bars
    for (let bar = 0; bar < 8; bar++) {
      const chordIndex = Math.floor(bar / 2) % chords.length;
      const chord = chords[chordIndex];
      
      for (const interval of chord) {
        notes.push({
          pitch: rootNote + interval,
          velocity: 70,
          startTime: bar * 4,
          duration: 3.8,
          channel: 3
        });
      }
    }
    
    return {
      id: 'chords',
      name: 'Chords',
      type: 'chords',
      midi: { name: 'Chords', notes, tempo, key, mode },
      volume: 0.5,
      pan: -0.2,
      muted: false,
      solo: false,
      effects: [
        { type: 'reverb', params: { decay: 3, wet: 0.4 }, wet: 0.4 },
        { type: 'filter', params: { frequency: 2000, type: 0 }, wet: 1 }
      ]
    };
  }

  /**
   * Generate FX track
   */
  private async generateFX(style: BeatStyle, tempo: number): Promise<BeatTrack> {
    const notes: MIDINote[] = [];
    
    // Add risers and impacts at section transitions
    const transitionBars = [7, 23, 39];
    
    for (const bar of transitionBars) {
      // Riser
      notes.push({
        pitch: 60,
        velocity: 100,
        startTime: bar * 4 - 4,
        duration: 4,
        channel: 4
      });
      
      // Impact
      notes.push({
        pitch: 36,
        velocity: 127,
        startTime: bar * 4,
        duration: 1,
        channel: 4
      });
    }
    
    return {
      id: 'fx',
      name: 'FX',
      type: 'fx',
      midi: { name: 'FX', notes, tempo, key: 'C', mode: 'major' },
      volume: 0.6,
      pan: 0,
      muted: false,
      solo: false,
      effects: [
        { type: 'reverb', params: { decay: 4, wet: 0.6 }, wet: 0.6 }
      ]
    };
  }

  /**
   * Render composition to audio
   */
  public async renderToAudio(composition: BeatComposition): Promise<AudioBuffer> {
    if (!this.audioContext) {
      await this.initialize();
    }

    const sampleRate = this.audioContext!.sampleRate;
    const duration = composition.duration;
    const channels = 2;
    const frameCount = Math.ceil(sampleRate * duration);
    
    const buffer = this.audioContext!.createBuffer(channels, frameCount, sampleRate);
    
    // Render each track
    const tracks = Object.values(composition.tracks);
    
    for (const track of tracks) {
      if (track.muted) continue;
      
      const trackBuffer = await this.renderTrack(track, composition.tempo, duration);
      
      // Mix into main buffer
      for (let channel = 0; channel < channels; channel++) {
        const mainData = buffer.getChannelData(channel);
        const trackData = trackBuffer.getChannelData(Math.min(channel, trackBuffer.numberOfChannels - 1));
        
        const pan = track.pan;
        const panGain = channel === 0 
          ? Math.cos((pan + 1) * Math.PI / 4)
          : Math.sin((pan + 1) * Math.PI / 4);
        
        for (let i = 0; i < mainData.length && i < trackData.length; i++) {
          mainData[i] += trackData[i] * track.volume * panGain;
        }
      }
    }
    
    // Apply master volume
    for (let channel = 0; channel < channels; channel++) {
      const data = buffer.getChannelData(channel);
      for (let i = 0; i < data.length; i++) {
        data[i] *= composition.masterVolume;
        // Soft clipping
        data[i] = Math.tanh(data[i]);
      }
    }
    
    return buffer;
  }

  /**
   * Render single track
   */
  private async renderTrack(
    track: BeatTrack,
    tempo: number,
    duration: number
  ): Promise<AudioBuffer> {
    const sampleRate = this.audioContext!.sampleRate;
    const frameCount = Math.ceil(sampleRate * duration);
    const buffer = this.audioContext!.createBuffer(1, frameCount, sampleRate);
    const data = buffer.getChannelData(0);
    
    if (!track.midi) return buffer;
    
    const secondsPerBeat = 60 / tempo;
    
    for (const note of track.midi.notes) {
      const startSample = Math.floor(note.startTime * secondsPerBeat * sampleRate);
      const endSample = Math.floor((note.startTime + note.duration) * secondsPerBeat * sampleRate);
      
      if (startSample >= frameCount) continue;
      
      const frequency = 440 * Math.pow(2, (note.pitch - 69) / 12);
      const velocity = note.velocity / 127;
      
      // Simple synthesis based on track type
      for (let i = startSample; i < Math.min(endSample, frameCount); i++) {
        const t = (i - startSample) / sampleRate;
        const envelope = Math.exp(-t * 3);
        
        let sample = 0;
        
        if (track.type === 'drums') {
          // Noise + sine for drums
          sample = (Math.random() - 0.5) * 0.3 + Math.sin(2 * Math.PI * frequency * t) * 0.7;
          sample *= Math.exp(-t * 20);
        } else if (track.type === 'bass') {
          // Saw wave for bass
          sample = ((t * frequency * 2) % 2 - 1) * 0.5;
          sample *= envelope;
        } else {
          // Triangle for melody/chords
          const phase = (t * frequency) % 1;
          sample = Math.abs(4 * phase - 2) - 1;
          sample *= envelope * 0.3;
        }
        
        data[i] += sample * velocity;
      }
    }
    
    return buffer;
  }

  /**
   * Export stems
   */
  public async exportStems(composition: BeatComposition): Promise<StemFiles> {
    const stems: Partial<StemFiles> = {};
    
    for (const [key, track] of Object.entries(composition.tracks)) {
      const buffer = await this.renderTrack(track, composition.tempo, composition.duration);
      const blob = await this.audioBufferToBlob(buffer);
      (stems as Record<string, Blob>)[key] = blob;
    }
    
    // Render master
    const masterBuffer = await this.renderToAudio(composition);
    stems.master = await this.audioBufferToBlob(masterBuffer);
    
    return stems as StemFiles;
  }

  /**
   * Convert AudioBuffer to Blob
   */
  private async audioBufferToBlob(buffer: AudioBuffer): Promise<Blob> {
    // Create WAV file
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;
    
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = buffer.length * blockAlign;
    const headerSize = 44;
    const totalSize = headerSize + dataSize;
    
    const arrayBuffer = new ArrayBuffer(totalSize);
    const view = new DataView(arrayBuffer);
    
    // RIFF header
    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, totalSize - 8, true);
    this.writeString(view, 8, 'WAVE');
    
    // fmt chunk
    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    
    // data chunk
    this.writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);
    
    // Write audio data
    const offset = 44;
    for (let i = 0; i < buffer.length; i++) {
      for (let channel = 0; channel < numChannels; channel++) {
        const sample = buffer.getChannelData(channel)[i];
        const intSample = Math.max(-1, Math.min(1, sample)) * 0x7FFF;
        view.setInt16(offset + (i * blockAlign) + (channel * bytesPerSample), intSample, true);
      }
    }
    
    return new Blob([arrayBuffer], { type: 'audio/wav' });
  }

  /**
   * Write string to DataView
   */
  private writeString(view: DataView, offset: number, str: string): void {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  /**
   * Setup visualization
   */
  public setupVisualization(canvas: HTMLCanvasElement): void {
    this.visualizationCanvas = canvas;
    this.startVisualization();
  }

  /**
   * Start visualization loop
   */
  private startVisualization(): void {
    if (!this.visualizationCanvas || !this.analyser) return;
    
    const canvas = this.visualizationCanvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const draw = () => {
      this.animationFrameId = requestAnimationFrame(draw);
      
      if (!this.analyser) return;
      this.analyser.getByteFrequencyData(dataArray);
      
      // Clear canvas
      ctx.fillStyle = 'rgb(10, 10, 15)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw frequency bars
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;
      
      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height * 0.8;
        
        // Gradient color
        const hue = (i / bufferLength) * 60 + 200; // Purple to cyan
        ctx.fillStyle = `hsl(${hue}, 70%, 50%)`;
        
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        
        x += barWidth + 1;
      }
      
      // Draw waveform overlay
      this.analyser.getByteTimeDomainData(dataArray);
      
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 2;
      
      const sliceWidth = canvas.width / bufferLength;
      x = 0;
      
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        
        x += sliceWidth;
      }
      
      ctx.stroke();
    };
    
    draw();
  }

  /**
   * Play composition
   */
  public async play(): Promise<void> {
    if (!this.composition || !this.audioContext) return;
    
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    
    const buffer = await this.renderToAudio(this.composition);
    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.masterGain!);
    source.start(0, this.playbackPosition);
    
    this.scheduledNodes.push(source);
    this.isPlaying = true;
  }

  /**
   * Stop playback
   */
  public stop(): void {
    for (const node of this.scheduledNodes) {
      try {
        node.stop();
      } catch (e) {
        // Node already stopped
      }
    }
    this.scheduledNodes = [];
    this.isPlaying = false;
    this.playbackPosition = 0;
  }

  /**
   * Pause playback
   */
  public pause(): void {
    this.stop();
    // Save position (simplified - would need proper tracking)
  }

  /**
   * Get current composition
   */
  public getComposition(): BeatComposition | null {
    return this.composition;
  }

  /**
   * Update track volume
   */
  public setTrackVolume(trackId: string, volume: number): void {
    if (!this.composition) return;
    const track = (this.composition.tracks as Record<string, BeatTrack>)[trackId];
    if (track) {
      track.volume = Math.max(0, Math.min(1, volume));
    }
  }

  /**
   * Toggle track mute
   */
  public toggleMute(trackId: string): void {
    if (!this.composition) return;
    const track = (this.composition.tracks as Record<string, BeatTrack>)[trackId];
    if (track) {
      track.muted = !track.muted;
    }
  }

  /**
   * Toggle track solo
   */
  public toggleSolo(trackId: string): void {
    if (!this.composition) return;
    const track = (this.composition.tracks as Record<string, BeatTrack>)[trackId];
    if (track) {
      track.solo = !track.solo;
      // Mute other tracks if solo
      if (track.solo) {
        for (const [id, t] of Object.entries(this.composition.tracks as Record<string, BeatTrack>)) {
          if (id !== trackId) {
            t.muted = true;
          }
        }
      }
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private detectPitches(buffer: AudioBuffer): number[] {
    const data = buffer.getChannelData(0);
    const sampleRate = buffer.sampleRate;
    const pitches: number[] = [];
    const windowSize = 2048;
    
    for (let i = 0; i < data.length - windowSize; i += windowSize / 2) {
      const window = data.slice(i, i + windowSize);
      const pitch = this.autocorrelate(window, sampleRate);
      pitches.push(pitch);
    }
    
    return pitches;
  }

  private autocorrelate(buffer: Float32Array, sampleRate: number): number {
    let maxCorrelation = 0;
    let bestPeriod = 0;
    
    for (let period = 20; period < buffer.length / 2; period++) {
      let correlation = 0;
      for (let i = 0; i < buffer.length - period; i++) {
        correlation += buffer[i] * buffer[i + period];
      }
      if (correlation > maxCorrelation) {
        maxCorrelation = correlation;
        bestPeriod = period;
      }
    }
    
    if (bestPeriod === 0) return 0;
    return sampleRate / bestPeriod;
  }

  private detectTempo(buffer: AudioBuffer): number {
    // Simplified tempo detection using onset detection
    const data = buffer.getChannelData(0);
    const sampleRate = buffer.sampleRate;
    const windowSize = 1024;
    const onsets: number[] = [];
    let prevEnergy = 0;
    
    for (let i = 0; i < data.length - windowSize; i += windowSize) {
      let energy = 0;
      for (let j = 0; j < windowSize; j++) {
        energy += data[i + j] * data[i + j];
      }
      
      if (energy > prevEnergy * 1.5 && energy > 0.01) {
        onsets.push(i / sampleRate);
      }
      prevEnergy = energy;
    }
    
    if (onsets.length < 2) return 120;
    
    // Calculate average interval
    let totalInterval = 0;
    for (let i = 1; i < onsets.length; i++) {
      totalInterval += onsets[i] - onsets[i - 1];
    }
    const avgInterval = totalInterval / (onsets.length - 1);
    
    return Math.round(60 / avgInterval);
  }

  private detectKey(pitches: number[]): MusicalKey {
    // Simplified key detection
    const notes = pitches
      .filter(p => p > 0)
      .map(p => Math.round(12 * Math.log2(p / 440) + 69) % 12);
    
    const counts = new Array(12).fill(0);
    for (const note of notes) {
      counts[note]++;
    }
    
    const maxIndex = counts.indexOf(Math.max(...counts));
    const keys: MusicalKey[] = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    return keys[maxIndex];
  }

  private frequencyToMIDI(freq: number): number {
    return Math.round(12 * Math.log2(freq / 440) + 69);
  }

  private keyToMIDI(key: MusicalKey): number {
    const keys: Record<MusicalKey, number> = {
      'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5,
      'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11
    };
    return keys[key];
  }

  private getScale(key: MusicalKey, mode: MusicalMode): number[] {
    const scales: Record<MusicalMode, number[]> = {
      major: [0, 2, 4, 5, 7, 9, 11],
      minor: [0, 2, 3, 5, 7, 8, 10],
      dorian: [0, 2, 3, 5, 7, 9, 10],
      mixolydian: [0, 2, 4, 5, 7, 9, 10],
      pentatonic: [0, 2, 4, 7, 9]
    };
    return scales[mode] || scales.minor;
  }

  /**
   * Dispose resources
   */
  public dispose(): void {
    this.stop();
    
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    
    this.audioContext?.close();
    this.audioContext = null;
    this.composition = null;
  }
}

// Export singleton
export const beatMakerEngine = new BeatMakerEngine();
