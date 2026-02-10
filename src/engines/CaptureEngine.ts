/**
 * CaptureEngine.ts
 * Moteur de capture vidéo avec effets temps réel (beauty, stabilisation, etc.)
 * Version: 1.0.0
 */

import {
  VideoSegment,
  TemplateSegment,
  EffectType
} from '../types/KuaishouTypes';
import { TikTokLookPipeline, type PipelineSettings, type QualityPreset, DEFAULT_SETTINGS } from '../lib/TikTokLookPipeline';
import { FaceDetectionService } from '../lib/FaceDetectionService';
import { WebCodecsEncoder } from '../lib/WebCodecsEncoder';

export class CaptureEngine {
  private camera: MediaStream | null = null;
  private recorder: MediaRecorder | null = null;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private videoElement: HTMLVideoElement;
  private recordedChunks: Blob[] = [];
  private isRecording: boolean = false;
  private realtimeEffects: Set<string> = new Set();
  private animationFrame: number = 0;
  private flashEnabled: boolean = false;

  // TikTok Look Pipeline (WebGL GPU-accelerated beauty/color)
  private glPipeline: TikTokLookPipeline | null = null;
  private glCanvas: HTMLCanvasElement | null = null;
  private faceService: FaceDetectionService | null = null;
  private encoder: WebCodecsEncoder | null = null;
  private pipelineActive: boolean = false;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 1080;
    this.canvas.height = 1920;
    this.ctx = this.canvas.getContext('2d', {
      alpha: false,
      desynchronized: true
    })!;

    this.videoElement = document.createElement('video');
    this.videoElement.width = 1080;
    this.videoElement.height = 1920;
    this.videoElement.autoplay = true;
    this.videoElement.playsInline = true;
  }

  // ==========================================
  // INITIALISATION CAMÉRA
  // ==========================================

  async initializeCamera(facingMode: 'user' | 'environment' = 'user'): Promise<void> {
    console.log('📷 Initializing HD camera...');

    try {
      // Contraintes HD optimisées pour qualité maximale
      const constraints: MediaStreamConstraints = {
        video: {
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
          frameRate: { ideal: 30, min: 24 },
          facingMode,
          aspectRatio: 9 / 16
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 2
        }
      };

      this.camera = await navigator.mediaDevices.getUserMedia(constraints);

      this.videoElement.srcObject = this.camera;
      await this.videoElement.play();

      // Démarrer preview avec effets temps réel
      this.startRealtimePreview();

      console.log('✅ HD Camera initialized');
    } catch (error) {
      console.error('❌ Camera initialization failed:', error);
      throw error;
    }
  }

  // ==========================================
  // FLASH / TORCH CONTROL
  // ==========================================

  async toggleFlash(): Promise<boolean> {
    if (!this.camera) return false;

    try {
      const track = this.camera.getVideoTracks()[0];
      const capabilities = track.getCapabilities() as any;
      
      if ('torch' in capabilities) {
        this.flashEnabled = !this.flashEnabled;
        await track.applyConstraints({
          advanced: [{ torch: this.flashEnabled } as any]
        });
        console.log(`🔦 Flash ${this.flashEnabled ? 'ON' : 'OFF'}`);
        return this.flashEnabled;
      } else {
        console.warn('⚠️ Flash/torch not supported on this device');
        return false;
      }
    } catch (error) {
      console.error('❌ Flash toggle failed:', error);
      return false;
    }
  }

  isFlashEnabled(): boolean {
    return this.flashEnabled;
  }

  async setFlash(enabled: boolean): Promise<boolean> {
    if (this.flashEnabled !== enabled) {
      return this.toggleFlash();
    }
    return this.flashEnabled;
  }

  // ==========================================
  // TIKTOK LOOK PIPELINE (WebGL)
  // ==========================================

  async initializeTikTokPipeline(settings?: Partial<PipelineSettings>): Promise<boolean> {
    try {
      this.glCanvas = document.createElement('canvas');
      this.glCanvas.width = this.canvas.width;
      this.glCanvas.height = this.canvas.height;

      this.glPipeline = new TikTokLookPipeline(this.glCanvas, settings);
      const success = await this.glPipeline.initialize();

      if (!success) {
        console.warn('⚠️ WebGL pipeline unavailable, using CPU fallback');
        this.glPipeline = null;
        this.glCanvas = null;
        return false;
      }

      this.faceService = new FaceDetectionService(
        Math.round(this.canvas.width / 2),
        Math.round(this.canvas.height / 2),
        2
      );
      await this.faceService.initialize();
      this.encoder = new WebCodecsEncoder();
      this.pipelineActive = true;
      console.log('✅ TikTok Look pipeline initialized');
      return true;
    } catch (err) {
      console.error('❌ TikTok pipeline init failed:', err);
      return false;
    }
  }

  updatePipelineSettings(settings: Partial<PipelineSettings>): void {
    this.glPipeline?.updateSettings(settings);
  }

  getPipelineSettings(): PipelineSettings | null {
    return this.glPipeline?.getSettings() || null;
  }

  isPipelineActive(): boolean {
    return this.pipelineActive;
  }

  setPipelineShowRaw(raw: boolean): void {
    this.glPipeline?.setShowRaw(raw);
  }

  getGLCanvas(): HTMLCanvasElement | null {
    return this.glCanvas;
  }

  getPipelineStats() {
    return this.glPipeline?.getPerformanceStats() || { fps: 0, frameTimeMs: 0, gpuLoad: 'low' as const };
  }

  // ==========================================
  // PREVIEW TEMPS RÉEL
  // ==========================================

  private startRealtimePreview(): void {
    const renderLoop = () => {
      if (!this.camera) return;

      if (this.pipelineActive && this.glPipeline) {
        // GPU path: WebGL shader pipeline
        const mask = this.faceService?.getMaskCanvas() || null;
        this.faceService?.detect(this.videoElement);
        this.glPipeline.processFrame(this.videoElement, mask);
        this.ctx.drawImage(this.glCanvas!, 0, 0, this.canvas.width, this.canvas.height);
      } else {
        // CPU fallback
        this.ctx.drawImage(this.videoElement, 0, 0, this.canvas.width, this.canvas.height);
        this.applyRealtimeEffects();
      }

      this.animationFrame = requestAnimationFrame(renderLoop);
    };

    renderLoop();
  }

  private applyRealtimeEffects(): void {
    if (this.realtimeEffects.has('beauty')) {
      this.applyBeautyFilterCPU();
    }
    if (this.realtimeEffects.has('hdr')) {
      this.applyHDRLikeCPU();
    }
  }

  private applyBeautyFilterCPU(): void {
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      if (r > 95 && g > 40 && b > 20 && r > g && r > b) {
        data[i] = r + (128 - r) * 0.2;
        data[i + 1] = g + (128 - g) * 0.2;
        data[i + 2] = b + (128 - b) * 0.2;
      }
    }
    this.ctx.putImageData(imageData, 0, 0);
  }

  private applyHDRLikeCPU(): void {
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
      if (avg > 180) { data[i] *= 0.95; data[i + 1] *= 0.95; data[i + 2] *= 0.95; }
      else if (avg < 75) { data[i] *= 1.2; data[i + 1] *= 1.2; data[i + 2] *= 1.2; }
      data[i] = Math.min(255, data[i]);
      data[i + 1] = Math.min(255, data[i + 1]);
      data[i + 2] = Math.min(255, data[i + 2]);
    }
    this.ctx.putImageData(imageData, 0, 0);
  }

  // ==========================================
  // ENREGISTREMENT
  // ==========================================

  async startRecording(duration?: number): Promise<void> {
    if (!this.camera) {
      throw new Error('Camera not initialized');
    }

    console.log('🔴 Starting recording...');

    this.recordedChunks = [];

    // Capturer stream du canvas (avec effets)
    const stream = this.canvas.captureStream(30);

    // Ajouter audio du microphone
    if (this.camera.getAudioTracks().length > 0) {
      const audioTrack = this.camera.getAudioTracks()[0];
      stream.addTrack(audioTrack);
    }

    // Check supported MIME types
    const mimeType = this.getSupportedMimeType();

    const options: MediaRecorderOptions = {
      mimeType,
      videoBitsPerSecond: 8000000, // 8 Mbps
      audioBitsPerSecond: 128000
    };

    this.recorder = new MediaRecorder(stream, options);

    this.recorder.ondataavailable = event => {
      if (event.data.size > 0) {
        this.recordedChunks.push(event.data);
      }
    };

    this.recorder.start();
    this.isRecording = true;

    // Auto-stop après durée si spécifiée
    if (duration) {
      setTimeout(() => {
        this.stopRecording();
      }, duration * 1000);
    }
  }

  private getSupportedMimeType(): string {
    const types = [
      'video/mp4;codecs=avc1',
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm'
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    return 'video/webm';
  }

  async stopRecording(): Promise<VideoSegment> {
    if (!this.recorder || !this.isRecording) {
      throw new Error('Not recording');
    }

    console.log('⏹️ Stopping recording...');

    return new Promise((resolve, reject) => {
      this.recorder!.onstop = () => {
        const mimeType = this.recorder!.mimeType || 'video/webm';
        const blob = new Blob(this.recordedChunks, { type: mimeType });

        // Créer VideoSegment
        const segment: VideoSegment = {
          id: `segment_${Date.now()}`,
          blob,
          duration: 0, // Sera calculé après chargement
          timestamp: Date.now(),
          effects: Array.from(this.realtimeEffects) as EffectType[]
        };

        // Créer video element pour le segment
        const video = document.createElement('video');
        video.src = URL.createObjectURL(blob);

        video.onloadedmetadata = () => {
          segment.duration = video.duration;
          segment.videoElement = video;
          resolve(segment);
        };

        video.onerror = () => reject(new Error('Failed to load recorded video'));

        this.isRecording = false;
        this.recordedChunks = [];
      };

      this.recorder!.stop();
    });
  }

  // ==========================================
  // EFFETS
  // ==========================================

  enableEffect(effect: string): void {
    this.realtimeEffects.add(effect);
    console.log(`✅ Effect enabled: ${effect}`);
  }

  disableEffect(effect: string): void {
    this.realtimeEffects.delete(effect);
    console.log(`❌ Effect disabled: ${effect}`);
  }

  toggleEffect(effect: string): void {
    if (this.realtimeEffects.has(effect)) {
      this.disableEffect(effect);
    } else {
      this.enableEffect(effect);
    }
  }

  getActiveEffects(): string[] {
    return Array.from(this.realtimeEffects);
  }

  // ==========================================
  // COUNTDOWN
  // ==========================================

  async countdown(seconds: number, onTick?: (remaining: number) => void): Promise<void> {
    for (let i = seconds; i > 0; i--) {
      if (onTick) onTick(i);

      // Afficher countdown sur canvas
      this.drawCountdown(i);

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    if (onTick) onTick(0);
  }

  private drawCountdown(number: number): void {
    this.ctx.save();

    // Semi-transparent overlay
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Countdown number
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = 'bold 200px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    this.ctx.fillText(
      number.toString(),
      this.canvas.width / 2,
      this.canvas.height / 2
    );

    this.ctx.restore();
  }

  // ==========================================
  // GUIDANCE OVERLAY
  // ==========================================

  drawGuidance(segment: TemplateSegment): void {
    if (!segment.guidance) return;

    this.ctx.save();

    // Texte guidance
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(0, 0, this.canvas.width, 150);

    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = 'bold 36px Arial';
    this.ctx.textAlign = 'center';

    this.ctx.fillText(segment.guidance.text, this.canvas.width / 2, 75);

    // Visual cues
    if (segment.guidance.visualCues) {
      for (const cue of segment.guidance.visualCues) {
        this.drawVisualCue(cue);
      }
    }

    this.ctx.restore();
  }

  private drawVisualCue(cue: { type: string; position: { x: number; y: number }; color?: string }): void {
    const x = cue.position.x * this.canvas.width;
    const y = cue.position.y * this.canvas.height;

    this.ctx.save();

    switch (cue.type) {
      case 'circle':
        this.ctx.strokeStyle = cue.color || '#FF0000';
        this.ctx.lineWidth = 5;
        this.ctx.beginPath();
        this.ctx.arc(x, y, 50, 0, Math.PI * 2);
        this.ctx.stroke();
        break;

      case 'arrow':
        this.ctx.fillStyle = cue.color || '#FF0000';
        // Draw arrow
        this.ctx.beginPath();
        this.ctx.moveTo(x, y - 50);
        this.ctx.lineTo(x - 30, y + 30);
        this.ctx.lineTo(x, y + 10);
        this.ctx.lineTo(x + 30, y + 30);
        this.ctx.closePath();
        this.ctx.fill();
        break;
    }

    this.ctx.restore();
  }

  // ==========================================
  // BEAT INDICATOR
  // ==========================================

  drawBeatIndicator(bpm: number, currentTime: number): void {
    const beatInterval = 60 / bpm;
    const phase = (currentTime % beatInterval) / beatInterval;

    // Pulse effect
    const scale = 1 + Math.sin(phase * Math.PI * 2) * 0.2;

    this.ctx.save();

    this.ctx.fillStyle = `rgba(255, 50, 50, ${0.5 + phase * 0.5})`;
    this.ctx.beginPath();
    this.ctx.arc(
      this.canvas.width / 2,
      100,
      30 * scale,
      0,
      Math.PI * 2
    );
    this.ctx.fill();

    this.ctx.restore();
  }

  // ==========================================
  // GETTERS
  // ==========================================

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  getVideoElement(): HTMLVideoElement {
    return this.videoElement;
  }

  isCurrentlyRecording(): boolean {
    return this.isRecording;
  }

  getCameraStream(): MediaStream | null {
    return this.camera;
  }

  // ==========================================
  // CLEANUP
  // ==========================================

  async switchCamera(): Promise<void> {
    const currentFacingMode = this.camera
      ?.getVideoTracks()[0]
      .getSettings().facingMode;

    const newFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';

    await this.stopCamera();
    await this.initializeCamera(newFacingMode);
  }

  stopCamera(): void {
    if (this.camera) {
      this.camera.getTracks().forEach(track => track.stop());
      this.camera = null;
    }

    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
  }

  destroy(): void {
    this.stopCamera();

    if (this.recorder && this.isRecording) {
      this.recorder.stop();
    }

    // Clean up TikTok pipeline
    this.glPipeline?.destroy();
    this.faceService?.destroy();
    this.encoder?.destroy();
    this.glPipeline = null;
    this.faceService = null;
    this.encoder = null;
    this.glCanvas = null;
    this.pipelineActive = false;

    this.videoElement.srcObject = null;
  }
}

export default CaptureEngine;
