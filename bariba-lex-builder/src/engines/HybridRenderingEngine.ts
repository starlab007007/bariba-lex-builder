/**
 * HybridRenderingEngine.ts
 * Moteur de rendu hybride: preview instantané (low-res) + export HD en background
 * Version: 1.0.0
 */

import {
  VideoSegment,
  KuaishouTemplateConfig,
  PreviewVideo,
  FinalVideo,
  ExportOptions,
  ProcessingStatus
} from '../types/KuaishouTypes';
import KuaishouTemplateEngine from './KuaishouTemplateEngine';

export class HybridRenderingEngine {
  private templateEngine: KuaishouTemplateEngine;
  private processingStatus: ProcessingStatus = {
    stage: 'initializing',
    progress: 0,
    message: 'Initialisation...'
  };

  constructor() {
    this.templateEngine = new KuaishouTemplateEngine();
  }

  // ==========================================
  // PREVIEW INSTANTANÉ (Proxy/Low-res)
  // ==========================================

  async generateInstantPreview(
    segments: VideoSegment[],
    template: KuaishouTemplateConfig
  ): Promise<PreviewVideo> {
    console.log('⚡ Generating instant preview...');

    const startTime = Date.now();

    this.updateStatus('processing', 10, 'Création du preview...');

    try {
      // Configuration proxy (720p, 15 FPS)
      const proxyConfig = {
        width: 720,
        height: 1280,
        frameRate: 15,
        bitrate: 1500000 // 1.5 Mbps
      };

      // Charger template
      await this.templateEngine.loadTemplate(template.id);

      this.updateStatus('processing', 30, 'Chargement des segments...');

      // Ajouter segments utilisateur
      for (const segment of segments) {
        this.templateEngine.addUserSegment(segment);
      }

      this.updateStatus('processing', 50, 'Rendu des frames...');

      // Générer frames preview
      const frames = await this.renderPreviewFrames(
        template,
        proxyConfig.frameRate
      );

      this.updateStatus('rendering', 70, 'Encodage...');

      // Encoder vidéo preview
      const videoBlob = await this.quickEncode(frames, proxyConfig);

      this.updateStatus('complete', 100, 'Preview prêt!');

      const endTime = Date.now();
      const processingTime = (endTime - startTime) / 1000;

      console.log(`✅ Preview generated in ${processingTime.toFixed(2)}s`);

      return {
        url: URL.createObjectURL(videoBlob),
        duration: template.video.duration,
        quality: 'preview',
        size: videoBlob.size,
        readyTime: endTime,
        format: 'webm'
      };
    } catch (error) {
      console.error('❌ Preview generation failed:', error);
      this.updateStatus('error', 0, 'Erreur lors de la génération du preview');
      throw error;
    }
  }

  private async renderPreviewFrames(
    template: KuaishouTemplateConfig,
    frameRate: number
  ): Promise<ImageData[]> {
    const frames: ImageData[] = [];
    const frameInterval = 1 / frameRate;
    const duration = template.video.duration;

    for (let t = 0; t < duration; t += frameInterval) {
      await this.templateEngine.renderFrame(t);

      // Capturer frame
      const canvas = this.templateEngine.getCanvas();
      const ctx = this.templateEngine.getContext();
      const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);

      frames.push(frame);
    }

    return frames;
  }

  private async quickEncode(
    frames: ImageData[],
    config: { width: number; height: number; frameRate: number; bitrate: number }
  ): Promise<Blob> {
    // Encoder avec MediaRecorder (rapide mais qualité moyenne)
    const canvas = document.createElement('canvas');
    canvas.width = config.width;
    canvas.height = config.height;
    const ctx = canvas.getContext('2d')!;

    const stream = canvas.captureStream(config.frameRate);
    const recorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp8',
      videoBitsPerSecond: config.bitrate
    });

    const chunks: Blob[] = [];

    recorder.ondataavailable = e => {
      if (e.data.size > 0) {
        chunks.push(e.data);
      }
    };

    recorder.start();

    // Dessiner chaque frame
    for (const frame of frames) {
      ctx.putImageData(frame, 0, 0);
      await new Promise(resolve => setTimeout(resolve, 1000 / config.frameRate));
    }

    recorder.stop();

    // Attendre fin d'encodage
    await new Promise<void>(resolve => {
      recorder.onstop = () => resolve();
    });

    return new Blob(chunks, { type: 'video/webm' });
  }

  // ==========================================
  // EXPORT HAUTE QUALITÉ (Background)
  // ==========================================

  async generateFinalExport(
    segments: VideoSegment[],
    template: KuaishouTemplateConfig,
    options?: ExportOptions
  ): Promise<FinalVideo> {
    console.log('🎬 Generating final HD export...');

    const startTime = Date.now();

    this.updateStatus('processing', 10, 'Préparation export HD...');

    try {
      const exportConfig: ExportOptions = options || {
        quality: 'hd',
        format: 'mp4',
        codec: 'h264',
        preset: 'medium',
        crf: 23,
        bitrate: 8000000,
        audio: {
          codec: 'aac',
          bitrate: 128000,
          sampleRate: 44100,
          channels: 2
        }
      };

      // Configuration export (1080p, 30 FPS)
      const hdConfig = {
        width: 1080,
        height: 1920,
        frameRate: 30,
        bitrate: exportConfig.bitrate || 8000000,
        codec: exportConfig.codec
      };

      // Charger template si pas déjà fait
      if (!this.templateEngine.getCurrentTemplate()) {
        await this.templateEngine.loadTemplate(template.id);
      }

      this.updateStatus('processing', 30, 'Application des effets...');

      // Appliquer tous les effets
      await this.applyAllEffects(segments, template);

      this.updateStatus('rendering', 50, 'Rendu haute qualité...');

      // Générer frames HD
      const frames = await this.renderHDFrames(template, hdConfig.frameRate);

      this.updateStatus('encoding', 70, 'Encodage final...');

      // Encoder avec haute qualité
      const videoBlob = await this.hdEncode(frames, hdConfig, exportConfig);

      this.updateStatus('complete', 100, 'Export HD terminé!');

      const endTime = Date.now();
      const processingTime = (endTime - startTime) / 1000;

      console.log(`✅ Final export completed in ${processingTime.toFixed(2)}s`);

      return {
        url: URL.createObjectURL(videoBlob),
        duration: template.video.duration,
        quality: 'hd',
        size: videoBlob.size,
        codec: exportConfig.codec,
        readyTime: endTime,
        thumbnailUrl: await this.generateThumbnail(frames[0])
      };
    } catch (error) {
      console.error('❌ Final export failed:', error);
      this.updateStatus('error', 0, "Erreur lors de l'export HD");
      throw error;
    }
  }

  private async applyAllEffects(
    segments: VideoSegment[],
    template: KuaishouTemplateConfig
  ): Promise<VideoSegment[]> {
    // Tous les effets sont appliqués pendant le rendu
    // Cette fonction est un placeholder pour processing additionnel si nécessaire
    return segments;
  }

  private async renderHDFrames(
    template: KuaishouTemplateConfig,
    frameRate: number
  ): Promise<ImageData[]> {
    const frames: ImageData[] = [];
    const frameInterval = 1 / frameRate;
    const duration = template.video.duration;

    for (let t = 0; t < duration; t += frameInterval) {
      await this.templateEngine.renderFrame(t);

      // Capturer frame HD
      const canvas = this.templateEngine.getCanvas();
      const ctx = this.templateEngine.getContext();
      const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);

      frames.push(frame);

      // Update progress
      const progress = 50 + (t / duration) * 20;
      this.updateStatus('rendering', progress, `Rendu: ${Math.round(t)}s / ${duration}s`);
    }

    return frames;
  }

  private async hdEncode(
    frames: ImageData[],
    config: { width: number; height: number; frameRate: number; bitrate: number; codec: string },
    options: ExportOptions
  ): Promise<Blob> {
    // Pour vrai encodage HD, il faudrait utiliser FFmpeg.wasm
    // Pour demo, utiliser MediaRecorder avec meilleure qualité

    const canvas = document.createElement('canvas');
    canvas.width = config.width;
    canvas.height = config.height;
    const ctx = canvas.getContext('2d')!;

    const stream = canvas.captureStream(config.frameRate);

    // Check supported MIME types and fallback
    let mimeType = 'video/webm;codecs=vp9';
    if (options.format === 'mp4') {
      if (MediaRecorder.isTypeSupported('video/mp4;codecs=avc1')) {
        mimeType = 'video/mp4;codecs=avc1';
      } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
        mimeType = 'video/webm;codecs=vp9';
      } else {
        mimeType = 'video/webm';
      }
    }

    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: config.bitrate
    });

    const chunks: Blob[] = [];

    recorder.ondataavailable = e => {
      if (e.data.size > 0) {
        chunks.push(e.data);
      }
    };

    recorder.start();

    // Dessiner chaque frame
    for (let i = 0; i < frames.length; i++) {
      ctx.putImageData(frames[i], 0, 0);
      await new Promise(resolve => setTimeout(resolve, 1000 / config.frameRate));

      // Update progress
      if (i % 30 === 0) {
        const progress = 70 + (i / frames.length) * 30;
        this.updateStatus('encoding', progress, `Encodage: ${i}/${frames.length} frames`);
      }
    }

    recorder.stop();

    // Attendre fin d'encodage
    await new Promise<void>(resolve => {
      recorder.onstop = () => resolve();
    });

    return new Blob(chunks, { type: mimeType });
  }

  private async generateThumbnail(frame: ImageData): Promise<string> {
    const canvas = document.createElement('canvas');
    canvas.width = frame.width;
    canvas.height = frame.height;
    const ctx = canvas.getContext('2d')!;

    ctx.putImageData(frame, 0, 0);

    return canvas.toDataURL('image/jpeg', 0.9);
  }

  // ==========================================
  // FFMPEG WASM (Optionnel - pour production)
  // ==========================================

  // Cette fonction nécessiterait @ffmpeg/ffmpeg
  // Commentée car non utilisée actuellement
  /*
  private async encodeWithFFmpeg(
    frames: ImageData[],
    config: any,
    options: ExportOptions
  ): Promise<Blob> {
    const { createFFmpeg } = await import('@ffmpeg/ffmpeg');
    const ffmpeg = createFFmpeg({ log: true });
    
    await ffmpeg.load();
    
    // Écrire frames comme images
    for (let i = 0; i < frames.length; i++) {
      const canvas = document.createElement('canvas');
      canvas.width = frames[i].width;
      canvas.height = frames[i].height;
      const ctx = canvas.getContext('2d')!;
      ctx.putImageData(frames[i], 0, 0);
      
      const blob = await new Promise<Blob>(resolve => canvas.toBlob(resolve!, 'image/png'));
      const buffer = await blob.arrayBuffer();
      ffmpeg.FS('writeFile', `frame${i.toString().padStart(5, '0')}.png`, new Uint8Array(buffer));
    }
    
    // Encoder avec FFmpeg
    await ffmpeg.run(
      '-framerate', config.frameRate.toString(),
      '-i', 'frame%05d.png',
      '-c:v', options.codec,
      '-preset', options.preset,
      '-crf', options.crf.toString(),
      '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart',
      'output.mp4'
    );
    
    const data = ffmpeg.FS('readFile', 'output.mp4');
    return new Blob([data.buffer], { type: 'video/mp4' });
  }
  */

  // ==========================================
  // STATUS & PROGRESS
  // ==========================================

  private updateStatus(
    stage: ProcessingStatus['stage'],
    progress: number,
    message: string
  ): void {
    this.processingStatus = {
      stage,
      progress,
      message,
      estimatedTime: this.estimateRemainingTime(progress)
    };

    // Émettre event pour UI
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('rendering-progress', { detail: this.processingStatus })
      );
    }
  }

  private estimateRemainingTime(progress: number): number {
    // Estimation simple basée sur temps écoulé
    if (progress === 0) return 0;

    const elapsed = Date.now();
    const estimated = (elapsed * (100 - progress)) / progress;

    return Math.round(estimated / 1000); // en secondes
  }

  getProcessingStatus(): ProcessingStatus {
    return this.processingStatus;
  }

  // ==========================================
  // COMPRESSION ADAPTIVE
  // ==========================================

  async compressVideo(
    videoBlob: Blob,
    targetSize: number
  ): Promise<Blob> {
    console.log(`🗜️ Compressing video to ${targetSize / 1024 / 1024}MB...`);

    const originalSize = videoBlob.size;

    if (originalSize <= targetSize) {
      console.log('✅ Video already within target size');
      return videoBlob;
    }

    // Calculer compression ratio nécessaire
    const compressionRatio = targetSize / originalSize;

    // Ajuster qualité
    const newCrf = Math.round(23 + (1 - compressionRatio) * 20);

    console.log(`Compression ratio: ${compressionRatio.toFixed(2)}, CRF: ${newCrf}`);

    // Réencoder avec nouvelle qualité
    // (Nécessiterait FFmpeg pour vrai compression)

    return videoBlob;
  }

  // ==========================================
  // CLEANUP
  // ==========================================

  destroy(): void {
    this.templateEngine.destroy();
  }
}

export default HybridRenderingEngine;
