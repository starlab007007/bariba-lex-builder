/**
 * VideoEncoder - MP4 encoding with FFmpeg.wasm and audio muxing
 * Provides robust video export with fallback to WebM
 */

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

export interface EncoderProgress {
  stage: 'init' | 'frames' | 'audio' | 'encoding' | 'complete';
  progress: number;
  message: string;
}

export interface EncoderOptions {
  width?: number;
  height?: number;
  fps?: number;
  videoBitrate?: string;
  audioBitrate?: string;
  format?: 'mp4' | 'webm';
}

const DEFAULT_OPTIONS: EncoderOptions = {
  width: 1080,
  height: 1920,
  fps: 30,
  videoBitrate: '8M',
  audioBitrate: '192k',
  format: 'mp4'
};

let ffmpegInstance: FFmpeg | null = null;
let isLoading = false;

function audioExtFromMime(mime: string | undefined): string {
  const m = (mime || '').toLowerCase();
  if (m.includes('mpeg') || m.includes('mp3')) return 'mp3';
  if (m.includes('wav')) return 'wav';
  if (m.includes('webm')) return 'webm';
  if (m.includes('ogg')) return 'ogg';
  if (m.includes('mp4') || m.includes('m4a') || m.includes('aac')) return 'm4a';
  return 'bin';
}

function audioInputName(audioBlob: Blob): string {
  return `audio.${audioExtFromMime(audioBlob.type)}`;
}

async function getFFmpeg(): Promise<FFmpeg> {
  if (ffmpegInstance) return ffmpegInstance;
  
  if (isLoading) {
    // Wait for existing load
    while (isLoading) {
      await new Promise(r => setTimeout(r, 100));
    }
    if (ffmpegInstance) return ffmpegInstance;
  }
  
  isLoading = true;
  
  try {
    const ffmpeg = new FFmpeg();
    
    // Load FFmpeg with CDN URLs
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
    
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });
    
    ffmpegInstance = ffmpeg;
    console.log('[VideoEncoder] FFmpeg loaded successfully');
    return ffmpeg;
  } catch (error) {
    console.error('[VideoEncoder] FFmpeg load failed:', error);
    throw error;
  } finally {
    isLoading = false;
  }
}

/**
 * Encode frames and audio into MP4 video
 */
export async function encodeVideo(
  frames: Blob[],
  audioBlob: Blob | null,
  options: EncoderOptions = {},
  onProgress?: (progress: EncoderProgress) => void
): Promise<Blob> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  onProgress?.({ stage: 'init', progress: 0, message: 'Initializing encoder...' });
  
  try {
    const ffmpeg = await getFFmpeg();
    
    onProgress?.({ stage: 'frames', progress: 0.1, message: 'Writing frames...' });
    
    // Write frames as PNG files
    for (let i = 0; i < frames.length; i++) {
      const frameData = await frames[i].arrayBuffer();
      const paddedIndex = String(i).padStart(5, '0');
      await ffmpeg.writeFile(`frame_${paddedIndex}.png`, new Uint8Array(frameData));
      
      if (i % 10 === 0) {
        const progress = 0.1 + (i / frames.length) * 0.3;
        onProgress?.({ stage: 'frames', progress, message: `Writing frame ${i + 1}/${frames.length}` });
      }
    }
    
    // Write audio if provided
    const audioFile = audioBlob ? audioInputName(audioBlob) : null;
    if (audioBlob && audioFile) {
      onProgress?.({ stage: 'audio', progress: 0.4, message: 'Adding audio...' });
      const audioData = await audioBlob.arrayBuffer();
      await ffmpeg.writeFile(audioFile, new Uint8Array(audioData));
    }
    
    onProgress?.({ stage: 'encoding', progress: 0.5, message: 'Encoding video...' });
    
    // Build FFmpeg command
    const outputFile = opts.format === 'mp4' ? 'output.mp4' : 'output.webm';
    
    const args = [
      '-framerate', String(opts.fps),
      '-i', 'frame_%05d.png',
    ];
    
    if (audioBlob && audioFile) {
      args.push('-i', audioFile);
    }
    
    if (opts.format === 'mp4') {
      args.push(
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-crf', '23',
        '-pix_fmt', 'yuv420p',
        '-b:v', opts.videoBitrate!
      );
      if (audioBlob) {
        args.push('-c:a', 'aac', '-b:a', opts.audioBitrate!);
      }
    } else {
      args.push(
        '-c:v', 'libvpx-vp9',
        '-b:v', opts.videoBitrate!
      );
      if (audioBlob) {
        args.push('-c:a', 'libopus', '-b:a', opts.audioBitrate!);
      }
    }
    
    args.push('-y', outputFile);
    
    // Set up progress tracking
    ffmpeg.on('progress', ({ progress }) => {
      const p = 0.5 + progress * 0.45;
      onProgress?.({ stage: 'encoding', progress: p, message: `Encoding: ${Math.round(progress * 100)}%` });
    });
    
    await ffmpeg.exec(args);
    
    onProgress?.({ stage: 'complete', progress: 0.95, message: 'Reading output...' });
    
    // Read output file
    const data = await ffmpeg.readFile(outputFile);
    const mimeType = opts.format === 'mp4' ? 'video/mp4' : 'video/webm';
    
    // Handle FileData type - convert to ArrayBuffer for Blob compatibility
    let arrayBuffer: ArrayBuffer;
    if (typeof data === 'string') {
      arrayBuffer = new TextEncoder().encode(data).buffer as ArrayBuffer;
    } else {
      // Copy to a fresh ArrayBuffer to avoid SharedArrayBuffer issues
      arrayBuffer = new ArrayBuffer(data.byteLength);
      new Uint8Array(arrayBuffer).set(data);
    }
    const blob = new Blob([arrayBuffer], { type: mimeType });
    
    // Cleanup
    for (let i = 0; i < frames.length; i++) {
      const paddedIndex = String(i).padStart(5, '0');
      try {
        await ffmpeg.deleteFile(`frame_${paddedIndex}.png`);
      } catch { /* ignore */ }
    }
    try {
      if (audioBlob && audioFile) await ffmpeg.deleteFile(audioFile);
      await ffmpeg.deleteFile(outputFile);
    } catch { /* ignore */ }
    
    onProgress?.({ stage: 'complete', progress: 1, message: 'Complete!' });
    
    console.log(`[VideoEncoder] Generated ${opts.format} video: ${(blob.size / 1024 / 1024).toFixed(2)} MB`);
    return blob;
    
  } catch (error) {
    console.error('[VideoEncoder] Encoding failed:', error);
    throw error;
  }
}

/**
 * Concatenate multiple audio blobs into a single audio blob (prefers MP3 output).
 * Handles mixed input formats (webm/mp3/wav/m4a...).
 */
export async function concatAudioBlobs(
  blobs: Array<Blob | null | undefined>,
  onProgress?: (progress: number, message: string) => void
): Promise<Blob | null> {
  const inputs = blobs.filter((b): b is Blob => !!b && b.size > 0);
  if (inputs.length === 0) return null;
  if (inputs.length === 1) return inputs[0];

  const ffmpeg = await getFFmpeg();
  const inNames: string[] = [];

  try {
    onProgress?.(0.05, 'Preparing audio...');

    for (let i = 0; i < inputs.length; i++) {
      const b = inputs[i];
      const ext = audioExtFromMime(b.type);
      const name = `ain_${i}.${ext}`;
      inNames.push(name);
      const data = await b.arrayBuffer();
      await ffmpeg.writeFile(name, new Uint8Array(data));
    }

    const concatInputs = inNames.map((_, i) => `[${i}:a]`).join('');
    const filter = `${concatInputs}concat=n=${inNames.length}:v=0:a=1[outa]`;

    // Try MP3 first
    const outMp3 = 'audio_concat.mp3';
    onProgress?.(0.5, 'Concatenating audio (mp3)...');

    const argsMp3 = [
      ...inNames.flatMap((n) => ['-i', n]),
      '-filter_complex', filter,
      '-map', '[outa]',
      '-c:a', 'libmp3lame',
      '-b:a', '192k',
      '-y',
      outMp3
    ];

    try {
      await ffmpeg.exec(argsMp3);
      const data = await ffmpeg.readFile(outMp3);
      let arrayBuffer: ArrayBuffer;
      if (typeof data === 'string') {
        arrayBuffer = new TextEncoder().encode(data).buffer as ArrayBuffer;
      } else {
        arrayBuffer = new ArrayBuffer(data.byteLength);
        new Uint8Array(arrayBuffer).set(data);
      }
      return new Blob([arrayBuffer], { type: 'audio/mpeg' });
    } catch (e) {
      console.warn('[VideoEncoder] MP3 concat failed, falling back to WAV:', e);

      const outWav = 'audio_concat.wav';
      const argsWav = [
        ...inNames.flatMap((n) => ['-i', n]),
        '-filter_complex', filter,
        '-map', '[outa]',
        '-c:a', 'pcm_s16le',
        '-ar', '44100',
        '-ac', '2',
        '-y',
        outWav
      ];

      await ffmpeg.exec(argsWav);
      const data = await ffmpeg.readFile(outWav);
      let arrayBuffer: ArrayBuffer;
      if (typeof data === 'string') {
        arrayBuffer = new TextEncoder().encode(data).buffer as ArrayBuffer;
      } else {
        arrayBuffer = new ArrayBuffer(data.byteLength);
        new Uint8Array(arrayBuffer).set(data);
      }
      return new Blob([arrayBuffer], { type: 'audio/wav' });
    }
  } finally {
    // Cleanup inputs + potential outputs
    for (const n of inNames) {
      try { await ffmpeg.deleteFile(n); } catch { /* ignore */ }
    }
    try { await ffmpeg.deleteFile('audio_concat.mp3'); } catch { /* ignore */ }
    try { await ffmpeg.deleteFile('audio_concat.wav'); } catch { /* ignore */ }
  }
}

/**
 * Capture frames from canvas during animation
 */
export async function captureCanvasFrames(
  canvas: HTMLCanvasElement,
  durationSeconds: number,
  fps: number = 30,
  renderFrame: (time: number) => void,
  onProgress?: (progress: number) => void
): Promise<Blob[]> {
  const frames: Blob[] = [];
  const totalFrames = Math.ceil(durationSeconds * fps);
  const frameInterval = 1 / fps;
  
  for (let i = 0; i < totalFrames; i++) {
    const currentTime = i * frameInterval;
    
    // Render the frame
    renderFrame(currentTime);
    
    // Capture as PNG blob
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => b ? resolve(b) : reject(new Error('Failed to capture frame')),
        'image/png'
      );
    });
    
    frames.push(blob);
    
    if (i % 5 === 0) {
      onProgress?.(i / totalFrames);
    }
  }
  
  console.log(`[VideoEncoder] Captured ${frames.length} frames`);
  return frames;
}

/**
 * Fallback: Use MediaRecorder for browsers without FFmpeg support
 */
export async function encodeWithMediaRecorder(
  canvas: HTMLCanvasElement,
  audioBlob: Blob | null,
  durationSeconds: number,
  fps: number = 30,
  renderFrame: (time: number) => void,
  onProgress?: (progress: EncoderProgress) => void
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    onProgress?.({ stage: 'init', progress: 0, message: 'Starting recording...' });
    
    const stream = canvas.captureStream(fps);
    
    // Add audio track if available
    if (audioBlob) {
      const audioContext = new AudioContext();
      const audioElement = new Audio(URL.createObjectURL(audioBlob));
      // Keep it silent for the user but still route audio into the MediaStream
      audioElement.muted = false;
      audioElement.volume = 0;
      // (playsInline exists on HTMLVideoElement; keep TS-safe here)
      
      const source = audioContext.createMediaElementSource(audioElement);
      const destination = audioContext.createMediaStreamDestination();
      source.connect(destination);
      
      destination.stream.getAudioTracks().forEach(track => {
        stream.addTrack(track);
      });
      
      audioElement.play().catch(() => {});
    }
    
    const chunks: Blob[] = [];
    const mimeType = MediaRecorder.isTypeSupported('video/mp4;codecs=avc1')
      ? 'video/mp4;codecs=avc1'
      : 'video/webm;codecs=vp9';
    
    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 8000000
    });
    
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType.split(';')[0] });
      onProgress?.({ stage: 'complete', progress: 1, message: 'Complete!' });
      resolve(blob);
    };
    
    recorder.onerror = (e) => reject(e);
    
    recorder.start(100);
    
    const totalFrames = Math.ceil(durationSeconds * fps);
    let currentFrame = 0;
    
    const animate = () => {
      if (currentFrame >= totalFrames) {
        recorder.stop();
        return;
      }
      
      const currentTime = currentFrame / fps;
      renderFrame(currentTime);
      currentFrame++;
      
      const progress = currentFrame / totalFrames;
      onProgress?.({ stage: 'encoding', progress: progress * 0.9, message: `Frame ${currentFrame}/${totalFrames}` });
      
      requestAnimationFrame(animate);
    };
    
    animate();
  });
}

export default {
  encodeVideo,
  captureCanvasFrames,
  encodeWithMediaRecorder,
  getFFmpeg
};
