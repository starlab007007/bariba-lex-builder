// AudioMixer.ts — Mix a music track into a video blob using Web Audio API + MediaRecorder
// Uses fetch + decodeAudioData pipeline for robust cross-browser audio handling

/**
 * Get the real duration of a video blob by loading it into a temporary <video> element
 */
export function getVideoDuration(blob: Blob): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'metadata';
    const url = URL.createObjectURL(blob);
    video.src = url;

    const cleanup = () => {
      URL.revokeObjectURL(url);
      video.src = '';
    };

    video.onloadedmetadata = () => {
      const dur = video.duration;
      cleanup();
      if (dur && isFinite(dur) && dur > 0) {
        resolve(dur);
      } else {
        // Fallback: try to seek to end to get duration
        reject(new Error('Could not determine video duration'));
      }
    };

    video.onerror = () => {
      cleanup();
      reject(new Error('Failed to load video for duration'));
    };

    // Fallback timeout
    setTimeout(() => {
      cleanup();
      reject(new Error('Video duration timeout'));
    }, 5000);
  });
}

/**
 * Fetch and decode an audio source (URL or Blob) into an AudioBuffer
 */
async function decodeAudioSource(
  source: string | Blob,
  audioCtx: AudioContext
): Promise<AudioBuffer> {
  let arrayBuffer: ArrayBuffer;

  if (source instanceof Blob) {
    arrayBuffer = await source.arrayBuffer();
  } else {
    const response = await fetch(source);
    if (!response.ok) throw new Error(`Failed to fetch audio: ${response.status}`);
    arrayBuffer = await response.arrayBuffer();
  }

  return audioCtx.decodeAudioData(arrayBuffer);
}

/**
 * Extract a trimmed portion of an AudioBuffer
 */
function trimAudioBuffer(
  buffer: AudioBuffer,
  startSec: number,
  durationSec: number,
  ctx: OfflineAudioContext
): AudioBuffer {
  const sampleRate = buffer.sampleRate;
  const startSample = Math.floor(startSec * sampleRate);
  const lengthSamples = Math.floor(durationSec * sampleRate);
  const actualLength = Math.min(lengthSamples, buffer.length - startSample);

  if (actualLength <= 0) return buffer;

  const trimmed = ctx.createBuffer(buffer.numberOfChannels, actualLength, sampleRate);
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const src = buffer.getChannelData(ch);
    const dst = trimmed.getChannelData(ch);
    for (let i = 0; i < actualLength; i++) {
      dst[i] = src[startSample + i] || 0;
    }
  }
  return trimmed;
}

export interface MixMusicOptions {
  /** The video blob to mix music into */
  videoBlob: Blob;
  /** URL or Blob of the music track */
  musicSource: string | Blob;
  /** Start time in the music track (seconds) */
  musicTrimStart?: number;
  /** Duration of music to use (seconds) - defaults to video duration */
  musicTrimDuration?: number;
  /** Music volume (0-1, default 0.5) */
  musicVolume?: number;
  /** Video original audio volume (0-1, default 1.0) */
  videoVolume?: number;
}

/**
 * Mix a music track into a video blob.
 * Creates a new video blob with the music mixed in.
 * Uses canvas + MediaRecorder to re-encode.
 */
export async function mixMusicIntoVideo(options: MixMusicOptions): Promise<Blob> {
  const {
    videoBlob,
    musicSource,
    musicTrimStart = 0,
    musicVolume = 0.5,
    videoVolume = 1.0,
  } = options;

  console.log('[AudioMixer] Starting mix...', {
    videoBlobSize: videoBlob.size,
    musicTrimStart,
    musicVolume,
    videoVolume,
  });

  // 1. Get video duration
  let videoDuration: number;
  try {
    videoDuration = await getVideoDuration(videoBlob);
  } catch {
    videoDuration = 90; // fallback 1m30s
  }

  const musicTrimDuration = options.musicTrimDuration ?? videoDuration;

  // 2. Create video element
  const video = document.createElement('video');
  video.muted = false;
  video.playsInline = true;
  const videoUrl = URL.createObjectURL(videoBlob);
  video.src = videoUrl;

  await new Promise<void>((resolve) => {
    video.onloadeddata = () => resolve();
    video.oncanplay = () => resolve();
    setTimeout(resolve, 3000);
  });

  // 3. Set up AudioContext for mixing
  const audioCtx = new AudioContext();

  // Decode music
  let musicBuffer: AudioBuffer;
  try {
    musicBuffer = await decodeAudioSource(musicSource, audioCtx);
  } catch (e) {
    console.error('[AudioMixer] Failed to decode music:', e);
    audioCtx.close();
    URL.revokeObjectURL(videoUrl);
    return videoBlob; // Return original if music can't be decoded
  }

  // 4. Create destination for mixing
  const dest = audioCtx.createMediaStreamDestination();

  // Video audio source
  let videoSourceNode: MediaElementAudioSourceNode | null = null;
  try {
    videoSourceNode = audioCtx.createMediaElementSource(video);
    const videoGain = audioCtx.createGain();
    videoGain.gain.value = videoVolume;
    videoSourceNode.connect(videoGain);
    videoGain.connect(dest);
  } catch (e) {
    console.warn('[AudioMixer] Could not create video audio source:', e);
  }

  // Music buffer source (trimmed)
  const musicNode = audioCtx.createBufferSource();
  
  // Trim music
  const sampleRate = musicBuffer.sampleRate;
  const startSample = Math.floor(musicTrimStart * sampleRate);
  const lengthSamples = Math.min(
    Math.floor(musicTrimDuration * sampleRate),
    musicBuffer.length - startSample
  );

  if (lengthSamples > 0 && startSample < musicBuffer.length) {
    const trimmedBuffer = audioCtx.createBuffer(
      musicBuffer.numberOfChannels,
      lengthSamples,
      sampleRate
    );
    for (let ch = 0; ch < musicBuffer.numberOfChannels; ch++) {
      const src = musicBuffer.getChannelData(ch);
      const dst = trimmedBuffer.getChannelData(ch);
      for (let i = 0; i < lengthSamples; i++) {
        dst[i] = src[startSample + i] || 0;
      }
    }
    musicNode.buffer = trimmedBuffer;
  } else {
    musicNode.buffer = musicBuffer;
  }

  const musicGain = audioCtx.createGain();
  musicGain.gain.value = musicVolume;
  musicNode.connect(musicGain);
  musicGain.connect(dest);

  // 5. Set up canvas for video capture
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth || 1080;
  canvas.height = video.videoHeight || 1920;
  const ctx = canvas.getContext('2d')!;

  // 6. Combine video stream + audio stream
  const canvasStream = canvas.captureStream(30);
  const audioStream = dest.stream;

  // Merge tracks
  const combinedStream = new MediaStream([
    ...canvasStream.getVideoTracks(),
    ...audioStream.getAudioTracks(),
  ]);

  // 7. Set up MediaRecorder
  const mimeType = pickRecorderMime();
  const recorder = new MediaRecorder(combinedStream, {
    mimeType,
    videoBitsPerSecond: 4_000_000,
  });

  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  // 8. Start recording, play video + music
  const recordingDone = new Promise<Blob>((resolve) => {
    recorder.onstop = () => {
      const finalBlob = new Blob(chunks, { type: mimeType || 'video/webm' });
      console.log('[AudioMixer] Mix complete, size:', finalBlob.size);
      resolve(finalBlob);
    };
  });

  recorder.start(100);
  video.currentTime = 0;
  musicNode.start(0);
  await video.play();

  // Draw frames
  const drawFrame = () => {
    if (video.ended || video.paused) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    requestAnimationFrame(drawFrame);
  };
  requestAnimationFrame(drawFrame);

  // Wait for video to end
  await new Promise<void>((resolve) => {
    video.onended = () => resolve();
    // Safety timeout
    setTimeout(resolve, (videoDuration + 2) * 1000);
  });

  recorder.stop();
  musicNode.stop();

  const resultBlob = await recordingDone;

  // Cleanup
  audioCtx.close();
  URL.revokeObjectURL(videoUrl);

  return resultBlob;
}

/**
 * Pick best supported mime type for MediaRecorder
 */
function pickRecorderMime(): string {
  const MR = (window as any).MediaRecorder;
  if (!MR?.isTypeSupported) return 'video/webm';

  const candidates = [
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=vp9,opus',
    'video/webm',
    'video/mp4',
  ];

  for (const c of candidates) {
    try {
      if (MR.isTypeSupported(c)) return c;
    } catch {}
  }
  return 'video/webm';
}
