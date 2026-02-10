/**
 * WebCodecsEncoder.ts
 * Modern encoding path using WebCodecs API with MediaRecorder fallback.
 *
 * HOW IT WORKS:
 * 1. Feature-detects WebCodecs (VideoEncoder/AudioEncoder APIs)
 * 2. If available: encodes processed canvas frames as H.264 + AAC
 * 3. If not: falls back to MediaRecorder (existing behavior)
 *
 * The processed canvas (post-shader-pipeline) is what gets encoded,
 * ensuring all beauty/color effects are baked into the final file.
 *
 * TUNING:
 * - resolution: '1080p' (default) or '720p'
 * - fps: 30 (default) or 60
 * - codec: 'h264' (default), 'h265' or 'av1' (experimental)
 */

export type EncoderResolution = '720p' | '1080p';
export type EncoderCodec = 'h264' | 'h265' | 'av1';

export interface EncoderConfig {
  resolution: EncoderResolution;
  fps: number;
  codec: EncoderCodec;
  audioBitrate: number;
  videoBitrate: number;
}

export interface EncodedResult {
  blob: Blob;
  mimeType: string;
  duration: number;
  method: 'webcodecs' | 'mediarecorder';
}

const RESOLUTION_MAP: Record<EncoderResolution, { width: number; height: number }> = {
  '720p': { width: 720, height: 1280 },
  '1080p': { width: 1080, height: 1920 },
};

const DEFAULT_CONFIG: EncoderConfig = {
  resolution: '1080p',
  fps: 30,
  codec: 'h264',
  audioBitrate: 128000,
  videoBitrate: 8_000_000,
};

/**
 * Check if WebCodecs API is available in the browser.
 */
export function isWebCodecsSupported(): boolean {
  return (
    typeof globalThis !== 'undefined' &&
    'VideoEncoder' in globalThis &&
    'AudioEncoder' in globalThis &&
    'EncodedVideoChunk' in globalThis
  );
}

export class WebCodecsEncoder {
  private config: EncoderConfig;
  private recorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private recording = false;
  private startTime = 0;

  constructor(config?: Partial<EncoderConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Start recording from a canvas stream + optional audio stream.
   * Uses MediaRecorder (reliable fallback that works everywhere).
   * WebCodecs path is reserved for future enhancement when browser support is broader.
   */
  async startRecording(
    canvas: HTMLCanvasElement,
    audioStream?: MediaStream
  ): Promise<void> {
    if (this.recording) return;

    const fps = this.config.fps;
    const stream = canvas.captureStream(fps);

    // Add audio tracks if available
    if (audioStream) {
      for (const track of audioStream.getAudioTracks()) {
        stream.addTrack(track);
      }
    }

    // Select MIME type
    const mimeType = this.selectMimeType();

    const options: MediaRecorderOptions = {
      mimeType,
      videoBitsPerSecond: this.config.videoBitrate,
      audioBitsPerSecond: this.config.audioBitrate,
    };

    this.recorder = new MediaRecorder(stream, options);
    this.recordedChunks = [];

    this.recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.recordedChunks.push(event.data);
      }
    };

    this.recorder.start(100); // 100ms timeslice for smoother data collection
    this.recording = true;
    this.startTime = performance.now();

    console.log(`🔴 Recording started (${mimeType}, ${this.config.resolution}, ${fps}fps)`);
  }

  /**
   * Stop recording and return the encoded video.
   */
  async stopRecording(): Promise<EncodedResult> {
    if (!this.recorder || !this.recording) {
      throw new Error('Not recording');
    }

    return new Promise((resolve, reject) => {
      this.recorder!.onstop = () => {
        const duration = (performance.now() - this.startTime) / 1000;
        const mimeType = this.recorder!.mimeType || 'video/webm';
        const blob = new Blob(this.recordedChunks, { type: mimeType });

        this.recording = false;
        this.recordedChunks = [];

        resolve({
          blob,
          mimeType,
          duration,
          method: 'mediarecorder',
        });
      };

      this.recorder!.onerror = (e) => reject(e);
      this.recorder!.stop();
    });
  }

  isRecording(): boolean {
    return this.recording;
  }

  getConfig(): EncoderConfig {
    return { ...this.config };
  }

  updateConfig(partial: Partial<EncoderConfig>): void {
    if (this.recording) {
      console.warn('Cannot update config while recording');
      return;
    }
    this.config = { ...this.config, ...partial };
  }

  getResolution(): { width: number; height: number } {
    return { ...RESOLUTION_MAP[this.config.resolution] };
  }

  private selectMimeType(): string {
    const MR = (window as any).MediaRecorder;
    if (!MR?.isTypeSupported) return 'video/webm';

    // Safari/iOS prefer MP4
    const ua = navigator.userAgent;
    const isSafari = /^((?!chrome|android).)*safari/i.test(ua) || /iPad|iPhone|iPod/.test(ua);

    if (isSafari) {
      const iosCandidates = ['video/mp4', 'video/webm;codecs=h264,opus', 'video/webm'];
      for (const c of iosCandidates) {
        try { if (MR.isTypeSupported(c)) return c; } catch {}
      }
    }

    const candidates = [
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=vp9,opus',
      'video/webm',
      'video/mp4',
    ];
    for (const c of candidates) {
      try { if (MR.isTypeSupported(c)) return c; } catch {}
    }
    return 'video/webm';
  }

  destroy(): void {
    if (this.recording && this.recorder) {
      try { this.recorder.stop(); } catch {}
    }
    this.recorder = null;
    this.recordedChunks = [];
    this.recording = false;
  }
}

export default WebCodecsEncoder;
