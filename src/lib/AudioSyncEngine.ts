/**
 * TAM-TAM Audio Sync Engine v1.0
 * Advanced audio analysis with beat detection, visual sync, and lip-sync support
 * 
 * @description Provides real-time audio analysis for synchronizing visual effects
 * with music beats, waveform visualization, and phoneme-based lip-sync.
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Beat timestamp with metadata
 */
export interface BeatTimestamp {
  /** Time in seconds */
  time: number;
  /** Beat strength (0-1) */
  strength: number;
  /** Is this a downbeat (first beat of measure) */
  isDownbeat: boolean;
  /** Confidence score (0-1) */
  confidence: number;
  /** Beat type */
  type: 'kick' | 'snare' | 'hihat' | 'other';
}

/**
 * Tempo analysis result
 */
export interface TempoAnalysis {
  /** Beats per minute */
  bpm: number;
  /** Confidence in BPM detection (0-1) */
  confidence: number;
  /** Time signature (e.g., 4 for 4/4) */
  timeSignature: number;
  /** First beat offset in seconds */
  firstBeatOffset: number;
}

/**
 * Frequency band data
 */
export interface FrequencyBands {
  /** Sub bass (20-60 Hz) */
  subBass: number;
  /** Bass (60-250 Hz) */
  bass: number;
  /** Low mid (250-500 Hz) */
  lowMid: number;
  /** Mid (500-2000 Hz) */
  mid: number;
  /** High mid (2000-4000 Hz) */
  highMid: number;
  /** High (4000-20000 Hz) */
  high: number;
}

/**
 * Visual sync event
 */
export interface VisualSyncEvent {
  /** Event type */
  type: 'beat' | 'kick' | 'snare' | 'downbeat' | 'drop' | 'buildup';
  /** Timestamp in seconds */
  time: number;
  /** Intensity (0-1) */
  intensity: number;
  /** Suggested visual action */
  action: VisualAction;
}

/**
 * Visual action to trigger
 */
export interface VisualAction {
  /** Action type */
  type: 'particle-burst' | 'light-flash' | 'camera-shake' | 'transition' | 'zoom' | 'color-shift';
  /** Duration in seconds */
  duration: number;
  /** Intensity (0-1) */
  intensity: number;
  /** Additional parameters */
  params?: Record<string, number | string | boolean>;
}

/**
 * Waveform visualization options
 */
export interface WaveformOptions {
  /** Canvas width */
  width: number;
  /** Canvas height */
  height: number;
  /** Line color or gradient colors */
  colors: string[];
  /** Line width */
  lineWidth: number;
  /** Background color */
  backgroundColor?: string;
  /** Enable mirroring */
  mirror?: boolean;
  /** Smoothing factor (0-1) */
  smoothing?: number;
  /** Show current position marker */
  showPosition?: boolean;
  /** Position marker color */
  positionColor?: string;
  /** Bar mode (instead of line) */
  barMode?: boolean;
  /** Bar gap in pixels */
  barGap?: number;
}

/**
 * Phoneme for lip-sync
 */
export interface Phoneme {
  /** Phoneme symbol (IPA) */
  symbol: string;
  /** Start time in seconds */
  startTime: number;
  /** End time in seconds */
  endTime: number;
  /** Mouth shape target (0-1 for each shape) */
  mouthShape: MouthShape;
  /** Confidence score */
  confidence: number;
}

/**
 * Mouth shape weights for avatar blendshapes
 */
export interface MouthShape {
  /** Jaw open amount */
  jawOpen: number;
  /** Lips pursed */
  lipsPucker: number;
  /** Lips wide/smile */
  lipsWide: number;
  /** Lips closed */
  lipsClosed: number;
  /** Tongue visible */
  tongueOut: number;
  /** Teeth visible */
  teethVisible: number;
}

/**
 * Audio analysis configuration
 */
export interface AudioSyncConfig {
  /** FFT size for frequency analysis (power of 2) */
  fftSize?: number;
  /** Smoothing time constant (0-1) */
  smoothingTimeConstant?: number;
  /** Beat detection sensitivity (0-1) */
  beatSensitivity?: number;
  /** Minimum BPM to detect */
  minBPM?: number;
  /** Maximum BPM to detect */
  maxBPM?: number;
  /** Enable onset detection */
  onsetDetection?: boolean;
}

/**
 * Real-time analysis data
 */
export interface RealtimeAnalysis {
  /** Current beat detected */
  isBeat: boolean;
  /** Current beat strength */
  beatStrength: number;
  /** Frequency bands */
  frequencyBands: FrequencyBands;
  /** Raw frequency data */
  frequencyData: Uint8Array<ArrayBuffer>;
  /** Time domain data */
  timeDomainData: Uint8Array<ArrayBuffer>;
  /** Current RMS volume (0-1) */
  volume: number;
  /** Current spectral centroid (brightness) */
  spectralCentroid: number;
}

// ============================================================================
// DEFAULT CONFIGURATIONS
// ============================================================================

const DEFAULT_CONFIG: Required<AudioSyncConfig> = {
  fftSize: 2048,
  smoothingTimeConstant: 0.8,
  beatSensitivity: 0.7,
  minBPM: 60,
  maxBPM: 180,
  onsetDetection: true,
};

const DEFAULT_WAVEFORM_OPTIONS: WaveformOptions = {
  width: 800,
  height: 100,
  colors: ['#00ff88', '#00ffff', '#ff00ff'],
  lineWidth: 2,
  backgroundColor: 'transparent',
  mirror: false,
  smoothing: 0.5,
  showPosition: true,
  positionColor: '#ff0000',
  barMode: false,
  barGap: 2,
};

// Phoneme to mouth shape mapping
const PHONEME_MOUTH_SHAPES: Record<string, MouthShape> = {
  // Vowels
  'a': { jawOpen: 0.8, lipsPucker: 0, lipsWide: 0.3, lipsClosed: 0, tongueOut: 0, teethVisible: 0.3 },
  'e': { jawOpen: 0.5, lipsPucker: 0, lipsWide: 0.5, lipsClosed: 0, tongueOut: 0, teethVisible: 0.4 },
  'i': { jawOpen: 0.3, lipsPucker: 0, lipsWide: 0.7, lipsClosed: 0, tongueOut: 0, teethVisible: 0.5 },
  'o': { jawOpen: 0.6, lipsPucker: 0.6, lipsWide: 0, lipsClosed: 0, tongueOut: 0, teethVisible: 0.2 },
  'u': { jawOpen: 0.4, lipsPucker: 0.8, lipsWide: 0, lipsClosed: 0, tongueOut: 0, teethVisible: 0.1 },
  // Consonants
  'b': { jawOpen: 0.1, lipsPucker: 0.2, lipsWide: 0, lipsClosed: 0.9, tongueOut: 0, teethVisible: 0 },
  'm': { jawOpen: 0.1, lipsPucker: 0.2, lipsWide: 0, lipsClosed: 1, tongueOut: 0, teethVisible: 0 },
  'p': { jawOpen: 0.1, lipsPucker: 0.2, lipsWide: 0, lipsClosed: 0.9, tongueOut: 0, teethVisible: 0 },
  'f': { jawOpen: 0.2, lipsPucker: 0, lipsWide: 0, lipsClosed: 0.5, tongueOut: 0, teethVisible: 0.6 },
  'v': { jawOpen: 0.2, lipsPucker: 0, lipsWide: 0, lipsClosed: 0.5, tongueOut: 0, teethVisible: 0.6 },
  's': { jawOpen: 0.2, lipsPucker: 0, lipsWide: 0.3, lipsClosed: 0.3, tongueOut: 0, teethVisible: 0.7 },
  'z': { jawOpen: 0.2, lipsPucker: 0, lipsWide: 0.3, lipsClosed: 0.3, tongueOut: 0, teethVisible: 0.7 },
  't': { jawOpen: 0.3, lipsPucker: 0, lipsWide: 0.2, lipsClosed: 0, tongueOut: 0.2, teethVisible: 0.5 },
  'd': { jawOpen: 0.3, lipsPucker: 0, lipsWide: 0.2, lipsClosed: 0, tongueOut: 0.2, teethVisible: 0.5 },
  'l': { jawOpen: 0.4, lipsPucker: 0, lipsWide: 0.2, lipsClosed: 0, tongueOut: 0.4, teethVisible: 0.4 },
  'n': { jawOpen: 0.3, lipsPucker: 0, lipsWide: 0.2, lipsClosed: 0, tongueOut: 0.3, teethVisible: 0.3 },
  'r': { jawOpen: 0.4, lipsPucker: 0.3, lipsWide: 0, lipsClosed: 0, tongueOut: 0.3, teethVisible: 0.3 },
  'w': { jawOpen: 0.3, lipsPucker: 0.7, lipsWide: 0, lipsClosed: 0.2, tongueOut: 0, teethVisible: 0 },
  'y': { jawOpen: 0.3, lipsPucker: 0, lipsWide: 0.5, lipsClosed: 0, tongueOut: 0, teethVisible: 0.4 },
  'k': { jawOpen: 0.4, lipsPucker: 0, lipsWide: 0.1, lipsClosed: 0, tongueOut: 0, teethVisible: 0.2 },
  'g': { jawOpen: 0.4, lipsPucker: 0, lipsWide: 0.1, lipsClosed: 0, tongueOut: 0, teethVisible: 0.2 },
  // Default/silence
  '_': { jawOpen: 0, lipsPucker: 0, lipsWide: 0, lipsClosed: 0.2, tongueOut: 0, teethVisible: 0 },
};

// ============================================================================
// AUDIO SYNC ENGINE CLASS
// ============================================================================

/**
 * TAM-TAM Audio Sync Engine
 * 
 * @example
 * ```typescript
 * const engine = new AudioSyncEngine();
 * 
 * // Load and analyze audio
 * const buffer = await engine.loadAudio('/path/to/audio.mp3');
 * const beats = engine.analyzeBeats(buffer);
 * const tempo = engine.detectTempo();
 * 
 * // Generate visual sync events
 * const events = engine.generateVisualSyncEvents(beats);
 * 
 * // Real-time analysis in animation loop
 * engine.connectSource(audioElement);
 * function animate() {
 *   const analysis = engine.getRealtimeAnalysis();
 *   if (analysis.isBeat) {
 *     // Trigger visual effect
 *   }
 * }
 * ```
 */
export class AudioSyncEngine {
  /** Web Audio context */
  private audioContext: AudioContext | null = null;
  
  /** Analyser node for frequency analysis */
  private analyser: AnalyserNode | null = null;
  
  /** Source node for connected audio */
  private sourceNode: MediaElementAudioSourceNode | AudioBufferSourceNode | null = null;
  
  /** Gain node for volume control */
  private gainNode: GainNode | null = null;
  
  /** Configuration */
  private config: Required<AudioSyncConfig>;
  
  /** Current audio buffer */
  private currentBuffer: AudioBuffer | null = null;
  
  /** Detected beats cache */
  private beatsCache: BeatTimestamp[] = [];
  
  /** Tempo analysis cache */
  private tempoCache: TempoAnalysis | null = null;
  
  /** Waveform data cache */
  private waveformCache: Float32Array | null = null;
  
  /** Beat detection state */
  private lastBeatTime: number = 0;
  private beatCooldown: number = 0.1; // 100ms cooldown
  private energyHistory: number[] = [];
  private energyHistorySize: number = 43; // ~1 second at 60fps
  
  /** Frequency data buffer */
  private frequencyData: Uint8Array<ArrayBuffer> | null = null;
  private timeDomainData: Uint8Array<ArrayBuffer> | null = null;
  
  /** Listeners */
  private beatListeners: Set<(beat: BeatTimestamp) => void> = new Set();
  private visualSyncListeners: Set<(event: VisualSyncEvent) => void> = new Set();

  /**
   * Create a new AudioSyncEngine
   * @param config - Configuration options
   */
  constructor(config?: Partial<AudioSyncConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    console.log('✅ AudioSyncEngine initialized');
  }

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  /**
   * Initialize the audio context (must be called after user interaction)
   */
  async initialize(): Promise<void> {
    if (this.audioContext) return;
    
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Create analyser
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = this.config.fftSize;
    this.analyser.smoothingTimeConstant = this.config.smoothingTimeConstant;
    
    // Create gain node
    this.gainNode = this.audioContext.createGain();
    this.gainNode.connect(this.audioContext.destination);
    
    // Connect analyser
    this.analyser.connect(this.gainNode);
    
    // Initialize data arrays
    this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
    this.timeDomainData = new Uint8Array(this.analyser.fftSize);
    
    console.log('🎵 Audio context initialized');
  }

  /**
   * Resume audio context if suspended
   */
  async resume(): Promise<void> {
    if (this.audioContext?.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  // ==========================================================================
  // AUDIO LOADING
  // ==========================================================================

  /**
   * Load audio from path or URL
   * 
   * @param path - Path to audio file
   * @returns Decoded audio buffer
   */
  async loadAudio(path: string): Promise<AudioBuffer> {
    await this.initialize();
    
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`Failed to load audio: ${path}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await this.audioContext!.decodeAudioData(arrayBuffer);
    
    this.currentBuffer = audioBuffer;
    this.beatsCache = [];
    this.tempoCache = null;
    this.waveformCache = null;
    
    console.log(`✅ Audio loaded: ${path} (${audioBuffer.duration.toFixed(2)}s)`);
    return audioBuffer;
  }

  /**
   * Load audio from Blob
   */
  async loadAudioBlob(blob: Blob): Promise<AudioBuffer> {
    await this.initialize();
    
    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await this.audioContext!.decodeAudioData(arrayBuffer);
    
    this.currentBuffer = audioBuffer;
    this.beatsCache = [];
    this.tempoCache = null;
    this.waveformCache = null;
    
    return audioBuffer;
  }

  /**
   * Connect an HTML audio/video element for real-time analysis
   */
  connectSource(element: HTMLAudioElement | HTMLVideoElement): void {
    if (!this.audioContext || !this.analyser) {
      console.warn('Audio context not initialized');
      return;
    }
    
    // Disconnect previous source
    if (this.sourceNode) {
      this.sourceNode.disconnect();
    }
    
    try {
      this.sourceNode = this.audioContext.createMediaElementSource(element);
      this.sourceNode.connect(this.analyser);
      console.log('🔊 Audio source connected');
    } catch (error) {
      // Element might already be connected
      console.warn('Could not connect audio source:', error);
    }
  }

  // ==========================================================================
  // BEAT DETECTION
  // ==========================================================================

  /**
   * Analyze audio buffer for beats
   * 
   * @param audio - Audio buffer to analyze
   * @returns Array of beat timestamps
   */
  analyzeBeats(audio?: AudioBuffer): BeatTimestamp[] {
    const buffer = audio || this.currentBuffer;
    if (!buffer) {
      throw new Error('No audio buffer available');
    }
    
    // Use cached result if available
    if (this.beatsCache.length > 0 && !audio) {
      return this.beatsCache;
    }
    
    const beats: BeatTimestamp[] = [];
    const sampleRate = buffer.sampleRate;
    const channelData = buffer.getChannelData(0);
    
    // Parameters
    const hopSize = Math.floor(sampleRate * 0.01); // 10ms hop
    const windowSize = Math.floor(sampleRate * 0.02); // 20ms window
    const threshold = this.config.beatSensitivity;
    
    // Calculate spectral flux (onset detection)
    const spectralFlux: number[] = [];
    let previousSpectrum: Float32Array | null = null;
    
    for (let i = 0; i < channelData.length - windowSize; i += hopSize) {
      // Extract window
      const window = channelData.slice(i, i + windowSize);
      
      // Calculate spectrum (simplified - using energy in frequency bands)
      const spectrum = this.calculateSpectrum(window);
      
      if (previousSpectrum) {
        // Calculate flux (positive differences only)
        let flux = 0;
        for (let j = 0; j < spectrum.length; j++) {
          const diff = spectrum[j] - previousSpectrum[j];
          if (diff > 0) flux += diff;
        }
        spectralFlux.push(flux);
      }
      
      previousSpectrum = spectrum;
    }
    
    // Peak detection with adaptive threshold
    const peakThreshold = this.calculateAdaptiveThreshold(spectralFlux, threshold);
    
    for (let i = 1; i < spectralFlux.length - 1; i++) {
      if (spectralFlux[i] > peakThreshold[i] &&
          spectralFlux[i] > spectralFlux[i - 1] &&
          spectralFlux[i] > spectralFlux[i + 1]) {
        
        const time = (i * hopSize) / sampleRate;
        const strength = Math.min(1, spectralFlux[i] / (peakThreshold[i] * 2));
        
        // Determine beat type based on frequency content
        const beatType = this.classifyBeat(channelData, i * hopSize, windowSize, sampleRate);
        
        beats.push({
          time,
          strength,
          isDownbeat: false, // Will be set later
          confidence: strength,
          type: beatType,
        });
      }
    }
    
    // Identify downbeats
    this.identifyDownbeats(beats);
    
    this.beatsCache = beats;
    console.log(`🎵 Detected ${beats.length} beats`);
    
    return beats;
  }

  /**
   * Calculate spectrum for a window
   */
  private calculateSpectrum(window: Float32Array): Float32Array {
    const spectrum = new Float32Array(16); // 16 frequency bands
    const bandSize = Math.floor(window.length / 16);
    
    for (let band = 0; band < 16; band++) {
      let energy = 0;
      for (let i = band * bandSize; i < (band + 1) * bandSize; i++) {
        energy += window[i] * window[i];
      }
      spectrum[band] = Math.sqrt(energy / bandSize);
    }
    
    return spectrum;
  }

  /**
   * Calculate adaptive threshold for peak detection
   */
  private calculateAdaptiveThreshold(flux: number[], sensitivity: number): number[] {
    const windowSize = 20; // Look-around window
    const threshold: number[] = [];
    const multiplier = 1.5 / sensitivity;
    
    for (let i = 0; i < flux.length; i++) {
      const start = Math.max(0, i - windowSize);
      const end = Math.min(flux.length, i + windowSize);
      
      let sum = 0;
      for (let j = start; j < end; j++) {
        sum += flux[j];
      }
      const mean = sum / (end - start);
      
      threshold.push(mean * multiplier);
    }
    
    return threshold;
  }

  /**
   * Classify beat type based on frequency content
   */
  private classifyBeat(
    data: Float32Array,
    position: number,
    windowSize: number,
    sampleRate: number
  ): 'kick' | 'snare' | 'hihat' | 'other' {
    // Simple classification based on energy distribution
    const lowEnd = Math.floor(windowSize * 0.1);
    const midStart = Math.floor(windowSize * 0.1);
    const midEnd = Math.floor(windowSize * 0.4);
    const highStart = Math.floor(windowSize * 0.4);
    
    let lowEnergy = 0;
    let midEnergy = 0;
    let highEnergy = 0;
    
    for (let i = 0; i < lowEnd && position + i < data.length; i++) {
      lowEnergy += Math.abs(data[position + i]);
    }
    
    for (let i = midStart; i < midEnd && position + i < data.length; i++) {
      midEnergy += Math.abs(data[position + i]);
    }
    
    for (let i = highStart; i < windowSize && position + i < data.length; i++) {
      highEnergy += Math.abs(data[position + i]);
    }
    
    // Normalize
    lowEnergy /= lowEnd;
    midEnergy /= (midEnd - midStart);
    highEnergy /= (windowSize - highStart);
    
    // Classify
    if (lowEnergy > midEnergy * 1.5 && lowEnergy > highEnergy * 2) {
      return 'kick';
    } else if (midEnergy > lowEnergy && midEnergy > highEnergy * 1.2) {
      return 'snare';
    } else if (highEnergy > midEnergy * 1.5) {
      return 'hihat';
    }
    
    return 'other';
  }

  /**
   * Identify downbeats in beat array
   */
  private identifyDownbeats(beats: BeatTimestamp[]): void {
    if (beats.length < 4) return;
    
    // Calculate average beat interval
    let totalInterval = 0;
    for (let i = 1; i < beats.length; i++) {
      totalInterval += beats[i].time - beats[i - 1].time;
    }
    const avgInterval = totalInterval / (beats.length - 1);
    
    // Assume 4/4 time signature
    const measureLength = avgInterval * 4;
    
    // Mark downbeats (every 4th beat, or strong kicks at regular intervals)
    let lastDownbeat = 0;
    
    for (let i = 0; i < beats.length; i++) {
      if (i === 0 || beats[i].time - lastDownbeat >= measureLength * 0.9) {
        beats[i].isDownbeat = true;
        lastDownbeat = beats[i].time;
      }
    }
  }

  // ==========================================================================
  // TEMPO DETECTION
  // ==========================================================================

  /**
   * Detect tempo (BPM) from audio
   * 
   * @returns BPM value
   */
  detectTempo(): number {
    if (this.tempoCache) {
      return this.tempoCache.bpm;
    }
    
    const beats = this.beatsCache.length > 0 ? this.beatsCache : this.analyzeBeats();
    
    if (beats.length < 4) {
      return 120; // Default BPM
    }
    
    // Calculate intervals between beats
    const intervals: number[] = [];
    for (let i = 1; i < beats.length; i++) {
      intervals.push(beats[i].time - beats[i - 1].time);
    }
    
    // Find most common interval (histogram approach)
    const histogram: Map<number, number> = new Map();
    const binSize = 0.01; // 10ms bins
    
    for (const interval of intervals) {
      const bin = Math.round(interval / binSize);
      histogram.set(bin, (histogram.get(bin) || 0) + 1);
    }
    
    // Find peak
    let maxCount = 0;
    let peakBin = 0;
    
    for (const [bin, count] of histogram) {
      if (count > maxCount) {
        maxCount = count;
        peakBin = bin;
      }
    }
    
    const avgInterval = peakBin * binSize;
    const bpm = Math.round(60 / avgInterval);
    
    // Clamp to reasonable range
    let adjustedBpm = bpm;
    while (adjustedBpm < this.config.minBPM) adjustedBpm *= 2;
    while (adjustedBpm > this.config.maxBPM) adjustedBpm /= 2;
    
    this.tempoCache = {
      bpm: adjustedBpm,
      confidence: maxCount / intervals.length,
      timeSignature: 4,
      firstBeatOffset: beats[0]?.time || 0,
    };
    
    console.log(`🎵 Detected tempo: ${adjustedBpm} BPM`);
    return adjustedBpm;
  }

  /**
   * Get full tempo analysis
   */
  getTempoAnalysis(): TempoAnalysis {
    if (!this.tempoCache) {
      this.detectTempo();
    }
    return this.tempoCache!;
  }

  // ==========================================================================
  // WAVEFORM EXTRACTION
  // ==========================================================================

  /**
   * Extract waveform data for visualization
   * 
   * @param samples - Number of samples to return (default: 1000)
   * @returns Normalized waveform data (-1 to 1)
   */
  extractWaveform(samples: number = 1000): Float32Array {
    if (!this.currentBuffer) {
      throw new Error('No audio buffer available');
    }
    
    if (this.waveformCache && this.waveformCache.length === samples) {
      return this.waveformCache;
    }
    
    const channelData = this.currentBuffer.getChannelData(0);
    const waveform = new Float32Array(samples);
    const blockSize = Math.floor(channelData.length / samples);
    
    for (let i = 0; i < samples; i++) {
      let sum = 0;
      let max = 0;
      
      for (let j = 0; j < blockSize; j++) {
        const idx = i * blockSize + j;
        if (idx < channelData.length) {
          const val = Math.abs(channelData[idx]);
          sum += val;
          if (val > max) max = val;
        }
      }
      
      // Use RMS for smoother visualization
      waveform[i] = max; // Or use sum / blockSize for average
    }
    
    // Normalize
    const maxVal = Math.max(...waveform);
    if (maxVal > 0) {
      for (let i = 0; i < samples; i++) {
        waveform[i] /= maxVal;
      }
    }
    
    this.waveformCache = waveform;
    return waveform;
  }

  // ==========================================================================
  // FREQUENCY ANALYSIS
  // ==========================================================================

  /**
   * Get frequency data at a specific timestamp
   * 
   * @param timestamp - Time in seconds (for offline analysis)
   * @returns Frequency data array
   */
  getFrequencyData(timestamp?: number): Uint8Array<ArrayBuffer> {
    if (!this.analyser || !this.frequencyData) {
      return new Uint8Array(0);
    }
    
    // For real-time, just return current data
    this.analyser.getByteFrequencyData(this.frequencyData);
    return this.frequencyData;
  }

  /**
   * Get frequency bands (bass, mid, high, etc.)
   */
  getFrequencyBands(): FrequencyBands {
    const data = this.getFrequencyData();
    if (data.length === 0) {
      return {
        subBass: 0, bass: 0, lowMid: 0, mid: 0, highMid: 0, high: 0
      };
    }
    
    const binCount = data.length;
    const sampleRate = this.audioContext?.sampleRate || 44100;
    const binFrequency = sampleRate / (this.config.fftSize);
    
    // Calculate band indices
    const freqToBin = (freq: number) => Math.floor(freq / binFrequency);
    
    const bands: FrequencyBands = {
      subBass: this.getAverageEnergy(data, freqToBin(20), freqToBin(60)),
      bass: this.getAverageEnergy(data, freqToBin(60), freqToBin(250)),
      lowMid: this.getAverageEnergy(data, freqToBin(250), freqToBin(500)),
      mid: this.getAverageEnergy(data, freqToBin(500), freqToBin(2000)),
      highMid: this.getAverageEnergy(data, freqToBin(2000), freqToBin(4000)),
      high: this.getAverageEnergy(data, freqToBin(4000), Math.min(freqToBin(20000), binCount - 1)),
    };
    
    return bands;
  }

  /**
   * Get average energy in a frequency range
   */
  private getAverageEnergy(data: Uint8Array, startBin: number, endBin: number): number {
    if (startBin >= endBin || startBin < 0 || endBin >= data.length) {
      return 0;
    }
    
    let sum = 0;
    for (let i = startBin; i <= endBin; i++) {
      sum += data[i];
    }
    
    return (sum / (endBin - startBin + 1)) / 255;
  }

  // ==========================================================================
  // REAL-TIME ANALYSIS
  // ==========================================================================

  /**
   * Get real-time audio analysis data
   * Call this in your animation loop
   */
  getRealtimeAnalysis(): RealtimeAnalysis {
    if (!this.analyser || !this.frequencyData || !this.timeDomainData) {
      return {
        isBeat: false,
        beatStrength: 0,
        frequencyBands: { subBass: 0, bass: 0, lowMid: 0, mid: 0, highMid: 0, high: 0 },
        frequencyData: new Uint8Array(0),
        timeDomainData: new Uint8Array(0),
        volume: 0,
        spectralCentroid: 0,
      };
    }
    
    // Update data
    this.analyser.getByteFrequencyData(this.frequencyData);
    this.analyser.getByteTimeDomainData(this.timeDomainData);
    
    const bands = this.getFrequencyBands();
    const volume = this.calculateVolume();
    const spectralCentroid = this.calculateSpectralCentroid();
    
    // Beat detection
    const energy = bands.bass + bands.subBass * 0.5;
    this.energyHistory.push(energy);
    if (this.energyHistory.length > this.energyHistorySize) {
      this.energyHistory.shift();
    }
    
    const avgEnergy = this.energyHistory.reduce((a, b) => a + b, 0) / this.energyHistory.length;
    const now = performance.now() / 1000;
    
    const isBeat = energy > avgEnergy * (1.5 / this.config.beatSensitivity) &&
                   now - this.lastBeatTime > this.beatCooldown;
    
    if (isBeat) {
      this.lastBeatTime = now;
      
      // Notify listeners
      const beat: BeatTimestamp = {
        time: now,
        strength: energy / avgEnergy,
        isDownbeat: false,
        confidence: Math.min(1, energy / avgEnergy / 2),
        type: bands.bass > bands.mid ? 'kick' : 'snare',
      };
      this.notifyBeatListeners(beat);
    }
    
    return {
      isBeat,
      beatStrength: isBeat ? energy / avgEnergy : 0,
      frequencyBands: bands,
      frequencyData: this.frequencyData,
      timeDomainData: this.timeDomainData,
      volume,
      spectralCentroid,
    };
  }

  /**
   * Calculate current volume (RMS)
   */
  private calculateVolume(): number {
    if (!this.timeDomainData) return 0;
    
    let sum = 0;
    for (let i = 0; i < this.timeDomainData.length; i++) {
      const val = (this.timeDomainData[i] - 128) / 128;
      sum += val * val;
    }
    
    return Math.sqrt(sum / this.timeDomainData.length);
  }

  /**
   * Calculate spectral centroid (brightness)
   */
  private calculateSpectralCentroid(): number {
    if (!this.frequencyData) return 0;
    
    let weightedSum = 0;
    let sum = 0;
    
    for (let i = 0; i < this.frequencyData.length; i++) {
      weightedSum += i * this.frequencyData[i];
      sum += this.frequencyData[i];
    }
    
    return sum > 0 ? weightedSum / sum / this.frequencyData.length : 0;
  }

  // ==========================================================================
  // VISUAL SYNC EVENTS
  // ==========================================================================

  /**
   * Generate visual sync events from beat data
   */
  generateVisualSyncEvents(beats?: BeatTimestamp[]): VisualSyncEvent[] {
    const beatList = beats || this.beatsCache;
    const events: VisualSyncEvent[] = [];
    
    for (const beat of beatList) {
      let action: VisualAction;
      
      switch (beat.type) {
        case 'kick':
          action = {
            type: beat.isDownbeat ? 'camera-shake' : 'light-flash',
            duration: 0.1,
            intensity: beat.strength,
            params: { flashColor: '#ffffff' },
          };
          break;
        case 'snare':
          action = {
            type: 'particle-burst',
            duration: 0.2,
            intensity: beat.strength,
          };
          break;
        case 'hihat':
          action = {
            type: 'color-shift',
            duration: 0.05,
            intensity: beat.strength * 0.5,
          };
          break;
        default:
          action = {
            type: 'light-flash',
            duration: 0.1,
            intensity: beat.strength * 0.3,
          };
      }
      
      events.push({
        type: beat.isDownbeat ? 'downbeat' : 'beat',
        time: beat.time,
        intensity: beat.strength,
        action,
      });
    }
    
    return events;
  }

  /**
   * Get recommended visual action for current beat
   */
  getVisualActionForBeat(beat: RealtimeAnalysis): VisualAction | null {
    if (!beat.isBeat) return null;
    
    const bands = beat.frequencyBands;
    
    // Determine action based on frequency content
    if (bands.bass > 0.7) {
      return {
        type: 'camera-shake',
        duration: 0.15,
        intensity: bands.bass,
        params: { shakeAmount: bands.bass * 10 },
      };
    } else if (bands.subBass > 0.6) {
      return {
        type: 'light-flash',
        duration: 0.1,
        intensity: bands.subBass,
        params: { flashColor: '#ff6600' },
      };
    } else if (bands.mid > 0.5) {
      return {
        type: 'particle-burst',
        duration: 0.2,
        intensity: bands.mid,
      };
    } else if (bands.high > 0.4) {
      return {
        type: 'color-shift',
        duration: 0.05,
        intensity: bands.high * 0.5,
      };
    }
    
    return {
      type: 'zoom',
      duration: 0.1,
      intensity: beat.beatStrength * 0.3,
    };
  }

  // ==========================================================================
  // WAVEFORM VISUALIZATION
  // ==========================================================================

  /**
   * Render waveform to canvas
   * 
   * @param canvas - Target canvas element
   * @param options - Visualization options
   * @param currentTime - Current playback position (for marker)
   */
  renderWaveform(
    canvas: HTMLCanvasElement,
    options?: Partial<WaveformOptions>,
    currentTime?: number
  ): void {
    const opts = { ...DEFAULT_WAVEFORM_OPTIONS, ...options };
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas size
    canvas.width = opts.width;
    canvas.height = opts.height;
    
    // Clear
    if (opts.backgroundColor && opts.backgroundColor !== 'transparent') {
      ctx.fillStyle = opts.backgroundColor;
      ctx.fillRect(0, 0, opts.width, opts.height);
    } else {
      ctx.clearRect(0, 0, opts.width, opts.height);
    }
    
    // Get waveform data
    const waveform = this.extractWaveform(opts.width);
    
    // Create gradient
    const gradient = ctx.createLinearGradient(0, 0, opts.width, 0);
    opts.colors.forEach((color, i) => {
      gradient.addColorStop(i / (opts.colors.length - 1), color);
    });
    
    ctx.strokeStyle = gradient;
    ctx.fillStyle = gradient;
    ctx.lineWidth = opts.lineWidth;
    
    const centerY = opts.height / 2;
    const scale = centerY * 0.9;
    
    if (opts.barMode) {
      // Bar mode
      const barWidth = Math.max(1, (opts.width / waveform.length) - (opts.barGap || 2));
      
      for (let i = 0; i < waveform.length; i++) {
        const x = (i / waveform.length) * opts.width;
        const height = waveform[i] * scale;
        
        ctx.fillRect(x, centerY - height, barWidth, height * 2);
      }
    } else {
      // Line mode
      ctx.beginPath();
      ctx.moveTo(0, centerY);
      
      for (let i = 0; i < waveform.length; i++) {
        const x = (i / waveform.length) * opts.width;
        const y = centerY - waveform[i] * scale;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          // Smooth interpolation
          if (opts.smoothing && opts.smoothing > 0) {
            const prevX = ((i - 1) / waveform.length) * opts.width;
            const prevY = centerY - waveform[i - 1] * scale;
            const cpX = (prevX + x) / 2;
            ctx.quadraticCurveTo(prevX, prevY, cpX, (prevY + y) / 2);
          } else {
            ctx.lineTo(x, y);
          }
        }
      }
      
      ctx.stroke();
      
      // Mirror
      if (opts.mirror) {
        ctx.beginPath();
        for (let i = 0; i < waveform.length; i++) {
          const x = (i / waveform.length) * opts.width;
          const y = centerY + waveform[i] * scale;
          
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      }
    }
    
    // Position marker
    if (opts.showPosition && currentTime !== undefined && this.currentBuffer) {
      const position = (currentTime / this.currentBuffer.duration) * opts.width;
      ctx.strokeStyle = opts.positionColor || '#ff0000';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(position, 0);
      ctx.lineTo(position, opts.height);
      ctx.stroke();
    }
  }

  /**
   * Render real-time frequency visualization
   */
  renderFrequencyBars(
    canvas: HTMLCanvasElement,
    options?: Partial<WaveformOptions>
  ): void {
    const opts = { ...DEFAULT_WAVEFORM_OPTIONS, ...options };
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    canvas.width = opts.width;
    canvas.height = opts.height;
    
    // Clear
    ctx.clearRect(0, 0, opts.width, opts.height);
    
    const data = this.getFrequencyData();
    if (data.length === 0) return;
    
    // Create gradient
    const gradient = ctx.createLinearGradient(0, opts.height, 0, 0);
    opts.colors.forEach((color, i) => {
      gradient.addColorStop(i / (opts.colors.length - 1), color);
    });
    
    ctx.fillStyle = gradient;
    
    const barWidth = opts.width / data.length;
    const gap = opts.barGap || 1;
    
    for (let i = 0; i < data.length; i++) {
      const x = i * barWidth;
      const height = (data[i] / 255) * opts.height;
      
      ctx.fillRect(x, opts.height - height, barWidth - gap, height);
    }
  }

  // ==========================================================================
  // LIP-SYNC
  // ==========================================================================

  /**
   * Extract phonemes from audio for lip-sync
   * Note: This is a simplified version - for production, use a speech recognition API
   * 
   * @param audio - Audio buffer to analyze
   * @returns Array of phonemes with timing
   */
  extractPhonemes(audio?: AudioBuffer): Phoneme[] {
    const buffer = audio || this.currentBuffer;
    if (!buffer) return [];
    
    const phonemes: Phoneme[] = [];
    const sampleRate = buffer.sampleRate;
    const channelData = buffer.getChannelData(0);
    
    // Simplified: detect voiced segments and assign generic mouth shapes
    const frameSize = Math.floor(sampleRate * 0.02); // 20ms frames
    const hopSize = Math.floor(sampleRate * 0.01); // 10ms hop
    
    let isVoiced = false;
    let segmentStart = 0;
    
    for (let i = 0; i < channelData.length - frameSize; i += hopSize) {
      // Calculate energy
      let energy = 0;
      for (let j = 0; j < frameSize; j++) {
        energy += channelData[i + j] * channelData[i + j];
      }
      energy = Math.sqrt(energy / frameSize);
      
      const time = i / sampleRate;
      
      if (energy > 0.01 && !isVoiced) {
        // Start of voiced segment
        isVoiced = true;
        segmentStart = time;
      } else if (energy <= 0.01 && isVoiced) {
        // End of voiced segment
        isVoiced = false;
        
        // Create phoneme for this segment
        const duration = time - segmentStart;
        
        // Simple vowel assignment based on spectral content
        const phonemeType = this.classifyPhoneme(channelData, Math.floor(segmentStart * sampleRate), frameSize);
        
        phonemes.push({
          symbol: phonemeType,
          startTime: segmentStart,
          endTime: time,
          mouthShape: PHONEME_MOUTH_SHAPES[phonemeType] || PHONEME_MOUTH_SHAPES['_'],
          confidence: 0.7,
        });
      }
    }
    
    return phonemes;
  }

  /**
   * Classify phoneme based on spectral content
   */
  private classifyPhoneme(data: Float32Array, position: number, frameSize: number): string {
    // Simplified classification based on energy distribution
    let lowEnergy = 0;
    let highEnergy = 0;
    
    const midPoint = Math.floor(frameSize / 2);
    
    for (let i = 0; i < midPoint; i++) {
      if (position + i < data.length) {
        lowEnergy += Math.abs(data[position + i]);
      }
    }
    
    for (let i = midPoint; i < frameSize; i++) {
      if (position + i < data.length) {
        highEnergy += Math.abs(data[position + i]);
      }
    }
    
    lowEnergy /= midPoint;
    highEnergy /= (frameSize - midPoint);
    
    // Map to phoneme
    if (lowEnergy > highEnergy * 1.5) {
      return 'o'; // Low frequencies = rounder vowels
    } else if (highEnergy > lowEnergy * 1.5) {
      return 'i'; // High frequencies = brighter vowels
    } else if (lowEnergy > 0.02) {
      return 'a'; // Open vowel
    } else {
      return 'e'; // Neutral vowel
    }
  }

  /**
   * Get interpolated mouth shape at a specific time
   * 
   * @param phonemes - Array of phonemes
   * @param time - Current time in seconds
   * @returns Interpolated mouth shape
   */
  getMouthShapeAtTime(phonemes: Phoneme[], time: number): MouthShape {
    // Find current and next phoneme
    let current: Phoneme | null = null;
    let next: Phoneme | null = null;
    
    for (let i = 0; i < phonemes.length; i++) {
      if (phonemes[i].startTime <= time && phonemes[i].endTime > time) {
        current = phonemes[i];
        next = phonemes[i + 1] || null;
        break;
      }
    }
    
    if (!current) {
      return PHONEME_MOUTH_SHAPES['_'];
    }
    
    // Calculate interpolation factor
    const duration = current.endTime - current.startTime;
    const progress = (time - current.startTime) / duration;
    
    // Ease in/out for natural movement
    const eased = progress < 0.5
      ? 2 * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 2) / 2;
    
    // If nearing end and there's a next phoneme, start transitioning
    if (next && progress > 0.7) {
      const transitionProgress = (progress - 0.7) / 0.3;
      return this.interpolateMouthShapes(
        current.mouthShape,
        next.mouthShape,
        transitionProgress
      );
    }
    
    return current.mouthShape;
  }

  /**
   * Interpolate between two mouth shapes
   */
  private interpolateMouthShapes(a: MouthShape, b: MouthShape, t: number): MouthShape {
    return {
      jawOpen: a.jawOpen + (b.jawOpen - a.jawOpen) * t,
      lipsPucker: a.lipsPucker + (b.lipsPucker - a.lipsPucker) * t,
      lipsWide: a.lipsWide + (b.lipsWide - a.lipsWide) * t,
      lipsClosed: a.lipsClosed + (b.lipsClosed - a.lipsClosed) * t,
      tongueOut: a.tongueOut + (b.tongueOut - a.tongueOut) * t,
      teethVisible: a.teethVisible + (b.teethVisible - a.teethVisible) * t,
    };
  }

  // ==========================================================================
  // EVENT LISTENERS
  // ==========================================================================

  /**
   * Subscribe to beat events
   */
  onBeat(callback: (beat: BeatTimestamp) => void): () => void {
    this.beatListeners.add(callback);
    return () => this.beatListeners.delete(callback);
  }

  /**
   * Subscribe to visual sync events
   */
  onVisualSync(callback: (event: VisualSyncEvent) => void): () => void {
    this.visualSyncListeners.add(callback);
    return () => this.visualSyncListeners.delete(callback);
  }

  /**
   * Notify beat listeners
   */
  private notifyBeatListeners(beat: BeatTimestamp): void {
    this.beatListeners.forEach(callback => callback(beat));
    
    // Also trigger visual sync
    const action = this.getVisualActionForBeat({
      isBeat: true,
      beatStrength: beat.strength,
      frequencyBands: this.getFrequencyBands(),
      frequencyData: this.frequencyData || new Uint8Array(0),
      timeDomainData: this.timeDomainData || new Uint8Array(0),
      volume: this.calculateVolume(),
      spectralCentroid: this.calculateSpectralCentroid(),
    });
    
    if (action) {
      const event: VisualSyncEvent = {
        type: beat.type === 'kick' ? 'kick' : beat.type === 'snare' ? 'snare' : 'beat',
        time: beat.time,
        intensity: beat.strength,
        action,
      };
      this.visualSyncListeners.forEach(callback => callback(event));
    }
  }

  // ==========================================================================
  // CLEANUP
  // ==========================================================================

  /**
   * Set volume
   */
  setVolume(volume: number): void {
    if (this.gainNode) {
      this.gainNode.gain.value = Math.max(0, Math.min(1, volume));
    }
  }

  /**
   * Get current audio context state
   */
  getContextState(): AudioContextState | 'uninitialized' {
    return this.audioContext?.state || 'uninitialized';
  }

  /**
   * Dispose of all resources
   */
  dispose(): void {
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    this.analyser = null;
    this.gainNode = null;
    this.currentBuffer = null;
    this.beatsCache = [];
    this.tempoCache = null;
    this.waveformCache = null;
    this.frequencyData = null;
    this.timeDomainData = null;
    this.energyHistory = [];
    this.beatListeners.clear();
    this.visualSyncListeners.clear();
    
    console.log('🧹 AudioSyncEngine disposed');
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

/**
 * Default AudioSyncEngine instance
 */
export const audioSyncEngine = new AudioSyncEngine();

/**
 * Create a new AudioSyncEngine instance
 */
export function createAudioSyncEngine(config?: Partial<AudioSyncConfig>): AudioSyncEngine {
  return new AudioSyncEngine(config);
}

export default AudioSyncEngine;
