/**
 * AIProcessingEngine.ts
 * Moteur IA pour smart cuts, analyse BPM, détection motion, et auto-captions
 * Version: 1.0.0
 */

import {
  VideoSegment,
  MusicTrack,
  BPMAnalysis,
  MotionData,
  Cut,
  Caption,
  WordTiming,
  KuaishouTemplateConfig
} from '../types/KuaishouTypes';

export class AIProcessingEngine {
  private audioContext: AudioContext;

  constructor() {
    this.audioContext = new AudioContext();
  }

  // ==========================================
  // ANALYSE BPM
  // ==========================================

  async analyzeBPM(audioBuffer: AudioBuffer): Promise<BPMAnalysis> {
    console.log('🎵 Analyzing BPM...');

    // Analyse des données audio
    const channelData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;

    // Détection des beats par analyse d'énergie
    const beats = this.detectBeats(channelData, sampleRate);

    // Calculer BPM
    const bpm = this.calculateBPM(beats, audioBuffer.duration);

    // Générer beat markers
    const beatMarkers = this.generateBeatMarkers(bpm, audioBuffer.duration);

    return {
      bpm,
      beatMarkers,
      confidence: 0.95,
      timeSignature: '4/4',
      tempo: bpm < 90 ? 'slow' : bpm < 120 ? 'medium' : 'fast'
    };
  }

  private detectBeats(channelData: Float32Array, sampleRate: number): number[] {
    const beats: number[] = [];
    const windowSize = Math.floor(sampleRate * 0.05); // 50ms window
    const hopSize = Math.floor(windowSize / 2);

    // Calculer l'énergie pour chaque fenêtre
    const energies: number[] = [];
    for (let i = 0; i < channelData.length - windowSize; i += hopSize) {
      let energy = 0;
      for (let j = 0; j < windowSize; j++) {
        energy += channelData[i + j] ** 2;
      }
      energies.push(energy / windowSize);
    }

    // Trouver les pics d'énergie
    const threshold = this.calculateMedian(energies) * 1.5;

    for (let i = 1; i < energies.length - 1; i++) {
      if (
        energies[i] > threshold &&
        energies[i] > energies[i - 1] &&
        energies[i] > energies[i + 1]
      ) {
        const timestamp = (i * hopSize) / sampleRate;
        beats.push(timestamp);
      }
    }

    return beats;
  }

  private calculateBPM(beats: number[], duration: number): number {
    if (beats.length < 2) return 120; // Default BPM

    // Calculer intervalles entre beats
    const intervals: number[] = [];
    for (let i = 1; i < beats.length; i++) {
      intervals.push(beats[i] - beats[i - 1]);
    }

    // BPM moyen
    const avgInterval = this.calculateMean(intervals);
    const bpm = Math.round(60 / avgInterval);

    // Clamp BPM dans une plage réaliste
    return Math.max(60, Math.min(180, bpm));
  }

  private generateBeatMarkers(bpm: number, duration: number): number[] {
    const beatInterval = 60 / bpm;
    const markers: number[] = [];

    for (let t = 0; t < duration; t += beatInterval) {
      markers.push(t);
    }

    return markers;
  }

  // ==========================================
  // SMART CUTS
  // ==========================================

  async generateSmartCuts(
    videoSegments: VideoSegment[],
    music: MusicTrack,
    template: KuaishouTemplateConfig
  ): Promise<Cut[]> {
    console.log('✂️ Generating smart cuts...');

    const cuts: Cut[] = [];

    if (!template.smartCuts?.enabled) {
      return cuts;
    }

    // Analyser BPM si pas déjà fait
    if (!music.beatMarkers || music.beatMarkers.length === 0) {
      const bpmAnalysis = await this.analyzeBPM(music.audioBuffer);
      music.beatMarkers = bpmAnalysis.beatMarkers;
      music.bpm = bpmAnalysis.bpm;
    }

    // Analyser motion de chaque segment
    const motionDataList = await Promise.all(
      videoSegments.map(segment => this.analyzeMotion(segment))
    );

    // Générer cuts selon l'algorithme
    switch (template.smartCuts.algorithm) {
      case 'beat_motion_hybrid':
        cuts.push(...this.generateBeatMotionCuts(videoSegments, motionDataList, music));
        break;
      case 'beat_only':
        cuts.push(...this.generateBeatOnlyCuts(videoSegments, music));
        break;
      case 'motion_only':
        cuts.push(...this.generateMotionOnlyCuts(videoSegments, motionDataList));
        break;
    }

    // Éviter de couper les visages si règle activée
    const faceCutRule = template.smartCuts.rules.find(
      r => r.type === 'face_detection' && r.avoidCuttingFaces
    );

    if (faceCutRule) {
      return this.avoidFaceCuts(cuts, videoSegments);
    }

    return cuts;
  }

  private generateBeatMotionCuts(
    segments: VideoSegment[],
    motionDataList: MotionData[],
    music: MusicTrack
  ): Cut[] {
    const cuts: Cut[] = [];

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const motionData = motionDataList[i];

      // Trouver pics de motion
      const motionPeaks = motionData.peaks.filter(p => p.type === 'major');

      for (const peak of motionPeaks) {
        // Trouver beat le plus proche
        const closestBeat = this.findClosestBeat(peak.timestamp, music.beatMarkers!);

        cuts.push({
          segmentId: segment.id,
          timestamp: closestBeat,
          type: 'beat_motion_sync',
          transitionType: 'smart_cut',
          confidence: 0.9
        });
      }
    }

    return cuts;
  }

  private generateBeatOnlyCuts(segments: VideoSegment[], music: MusicTrack): Cut[] {
    const cuts: Cut[] = [];

    for (const segment of segments) {
      // Cut sur chaque 4ème beat (mesure)
      const segmentBeats = music.beatMarkers!.filter(
        beat => beat >= 0 && beat < segment.duration
      );

      for (let i = 0; i < segmentBeats.length; i += 4) {
        cuts.push({
          segmentId: segment.id,
          timestamp: segmentBeats[i],
          type: 'beat_sync',
          transitionType: 'smart_cut',
          confidence: 1.0
        });
      }
    }

    return cuts;
  }

  private generateMotionOnlyCuts(
    segments: VideoSegment[],
    motionDataList: MotionData[]
  ): Cut[] {
    const cuts: Cut[] = [];

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const motionData = motionDataList[i];

      // Cut sur pics de motion significatifs
      for (const peak of motionData.peaks) {
        if (peak.intensity > 0.7) {
          cuts.push({
            segmentId: segment.id,
            timestamp: peak.timestamp,
            type: 'motion_peak',
            transitionType: 'smart_cut',
            confidence: peak.intensity
          });
        }
      }
    }

    return cuts;
  }

  private findClosestBeat(timestamp: number, beatMarkers: number[]): number {
    let closest = beatMarkers[0];
    let minDiff = Math.abs(timestamp - closest);

    for (const beat of beatMarkers) {
      const diff = Math.abs(timestamp - beat);
      if (diff < minDiff) {
        minDiff = diff;
        closest = beat;
      }
    }

    return closest;
  }

  // ==========================================
  // ANALYSE MOTION
  // ==========================================

  async analyzeMotion(segment: VideoSegment): Promise<MotionData> {
    console.log(`📊 Analyzing motion for segment: ${segment.id}`);

    if (!segment.videoElement) {
      return {
        segmentId: segment.id,
        intensity: [],
        direction: [],
        peaks: []
      };
    }

    // Extraire frames
    const frames = await this.extractFrames(segment, 10); // 10 FPS pour analyse

    const intensities: MotionData['intensity'] = [];
    const directions: MotionData['direction'] = [];

    // Analyser motion entre frames consécutives
    for (let i = 1; i < frames.length; i++) {
      const motion = this.calculateOpticalFlow(frames[i - 1], frames[i]);

      intensities.push({
        timestamp: i / 10,
        magnitude: motion.magnitude,
        normalized: motion.magnitude / 100
      });

      directions.push({
        timestamp: i / 10,
        angle: motion.angle,
        velocity: motion.magnitude
      });
    }

    // Détecter pics
    const peaks = this.detectMotionPeaks(intensities);

    return {
      segmentId: segment.id,
      intensity: intensities,
      direction: directions,
      peaks
    };
  }

  private async extractFrames(segment: VideoSegment, fps: number): Promise<ImageData[]> {
    const video = segment.videoElement!;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const frames: ImageData[] = [];
    const frameInterval = 1 / fps;

    video.currentTime = 0;

    for (let t = 0; t < segment.duration; t += frameInterval) {
      await new Promise<void>(resolve => {
        video.currentTime = t;
        video.onseeked = () => {
          ctx.drawImage(video, 0, 0);
          frames.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
          resolve();
        };
      });
    }

    return frames;
  }

  private calculateOpticalFlow(frame1: ImageData, frame2: ImageData): {
    magnitude: number;
    angle: number;
  } {
    // Optical flow simplifié (block matching)
    const blockSize = 16;
    let totalMagnitude = 0;
    let totalAngle = 0;
    let blockCount = 0;

    for (let y = 0; y < frame1.height - blockSize; y += blockSize) {
      for (let x = 0; x < frame1.width - blockSize; x += blockSize) {
        const motion = this.findBlockMotion(frame1, frame2, x, y, blockSize);
        totalMagnitude += Math.sqrt(motion.dx ** 2 + motion.dy ** 2);
        totalAngle += Math.atan2(motion.dy, motion.dx);
        blockCount++;
      }
    }

    return {
      magnitude: totalMagnitude / blockCount,
      angle: totalAngle / blockCount
    };
  }

  private findBlockMotion(
    frame1: ImageData,
    frame2: ImageData,
    x: number,
    y: number,
    blockSize: number
  ): { dx: number; dy: number } {
    // Recherche simple du meilleur match
    let bestDx = 0;
    let bestDy = 0;
    let bestSad = Infinity;

    const searchRange = 8;

    for (let dy = -searchRange; dy <= searchRange; dy++) {
      for (let dx = -searchRange; dx <= searchRange; dx++) {
        const sad = this.calculateSAD(frame1, frame2, x, y, x + dx, y + dy, blockSize);
        if (sad < bestSad) {
          bestSad = sad;
          bestDx = dx;
          bestDy = dy;
        }
      }
    }

    return { dx: bestDx, dy: bestDy };
  }

  private calculateSAD(
    frame1: ImageData,
    frame2: ImageData,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    blockSize: number
  ): number {
    let sad = 0;
    const width = frame1.width;

    for (let by = 0; by < blockSize; by++) {
      for (let bx = 0; bx < blockSize; bx++) {
        const i1 = ((y1 + by) * width + (x1 + bx)) * 4;
        const i2 = ((y2 + by) * width + (x2 + bx)) * 4;

        // Comparer luminance seulement
        const lum1 = frame1.data[i1] * 0.299 + frame1.data[i1 + 1] * 0.587 + frame1.data[i1 + 2] * 0.114;
        const lum2 = frame2.data[i2] * 0.299 + frame2.data[i2 + 1] * 0.587 + frame2.data[i2 + 2] * 0.114;

        sad += Math.abs(lum1 - lum2);
      }
    }

    return sad / (blockSize * blockSize);
  }

  private detectMotionPeaks(intensities: MotionData['intensity']): MotionData['peaks'] {
    const peaks: MotionData['peaks'] = [];
    const threshold = this.calculateMean(intensities.map(i => i.magnitude)) * 1.5;

    for (let i = 1; i < intensities.length - 1; i++) {
      const curr = intensities[i];
      const prev = intensities[i - 1];
      const next = intensities[i + 1];

      if (
        curr.magnitude > threshold &&
        curr.magnitude > prev.magnitude &&
        curr.magnitude > next.magnitude
      ) {
        peaks.push({
          timestamp: curr.timestamp,
          intensity: curr.normalized,
          type: curr.magnitude > threshold * 1.5 ? 'major' : 'minor'
        });
      }
    }

    return peaks;
  }

  // ==========================================
  // FACE DETECTION
  // ==========================================

  private async avoidFaceCuts(cuts: Cut[], segments: VideoSegment[]): Promise<Cut[]> {
    const filteredCuts: Cut[] = [];

    for (const cut of cuts) {
      const segment = segments.find(s => s.id === cut.segmentId);

      if (!segment) {
        filteredCuts.push(cut);
        continue;
      }

      // Vérifier si cut tombe sur un visage
      const hasFace = await this.hasFaceAtTimestamp(segment, cut.timestamp);

      if (hasFace) {
        // Déplacer cut de 0.3s
        cut.timestamp += 0.3;
        cut.reason = 'avoided_face_cut';
      }

      filteredCuts.push(cut);
    }

    return filteredCuts;
  }

  private async hasFaceAtTimestamp(segment: VideoSegment, timestamp: number): Promise<boolean> {
    // Placeholder - nécessiterait TensorFlow.js ou similar
    // Pour l'instant, retourne false
    return false;
  }

  // ==========================================
  // AUTO CAPTIONS (Karaoke)
  // ==========================================

  async generateKaraokeCaptions(audioBuffer: AudioBuffer): Promise<Caption[]> {
    console.log('📝 Generating karaoke captions...');

    // Placeholder - nécessiterait Web Speech API ou Whisper
    // Pour demo, générer captions simulées
    const duration = audioBuffer.duration;
    const captions: Caption[] = [];

    const sampleTexts = [
      'Bienvenue sur TAM-TAM',
      'Crée ton contenu viral',
      'Utilise les templates',
      'Partage avec le monde'
    ];

    const wordsPerCaption = duration / sampleTexts.length;

    for (let i = 0; i < sampleTexts.length; i++) {
      const words = sampleTexts[i].split(' ');
      const wordTimings: WordTiming[] = [];
      const captionStart = i * wordsPerCaption;
      const wordDuration = wordsPerCaption / words.length;

      for (let j = 0; j < words.length; j++) {
        wordTimings.push({
          text: words[j],
          startTime: captionStart + j * wordDuration,
          endTime: captionStart + (j + 1) * wordDuration,
          confidence: 0.95
        });
      }

      captions.push({
        text: sampleTexts[i],
        startTime: captionStart,
        endTime: captionStart + wordsPerCaption,
        style: 'karaoke',
        animation: 'word_highlight',
        position: { x: 0.5, y: 0.85 },
        words: wordTimings
      });
    }

    return captions;
  }

  // ==========================================
  // AUTO HASHTAGS
  // ==========================================

  async generateHashtags(
    videoSegments: VideoSegment[],
    template: KuaishouTemplateConfig
  ): Promise<string[]> {
    console.log('🏷️ Generating hashtags...');

    const hashtags = new Set<string>();

    // Hashtags du template
    if (template.hashtags.trending) {
      template.hashtags.trending.forEach(tag => hashtags.add(tag));
    }

    // Hashtags basés sur catégorie
    const categoryTags: Record<string, string[]> = {
      dance: ['#Dance', '#DanceChallenge', '#Moves'],
      tutorial: ['#Tutorial', '#HowTo', '#Learn'],
      story: ['#Story', '#MyStory', '#Life'],
      challenge: ['#Challenge', '#Viral', '#TryThis'],
      vlog: ['#Vlog', '#DailyLife', '#BehindTheScenes']
    };

    const categoryHashtags = categoryTags[template.category] || [];
    categoryHashtags.forEach(tag => hashtags.add(tag));

    // Limiter au maximum configuré
    const maxHashtags = template.hashtags.maxHashtags || 5;

    return Array.from(hashtags).slice(0, maxHashtags);
  }

  // ==========================================
  // UTILS
  // ==========================================

  private calculateMean(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  private calculateMedian(values: number[]): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);

    if (sorted.length % 2 === 0) {
      return (sorted[mid - 1] + sorted[mid]) / 2;
    } else {
      return sorted[mid];
    }
  }

  destroy(): void {
    if (this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
  }
}

export default AIProcessingEngine;
