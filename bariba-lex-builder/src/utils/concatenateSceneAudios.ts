/**
 * Concatenate per-scene TTS audio (base64) into a single WAV blob
 * Uses OfflineAudioContext for precise positioning
 */

interface SceneWithAudio {
  audioBase64?: string;
  durationSeconds: number;
}

export async function concatenateSceneAudios(
  scenes: SceneWithAudio[]
): Promise<{ blob: Blob; url: string } | null> {
  const scenesWithAudio = scenes.filter(s => s.audioBase64);
  if (scenesWithAudio.length === 0) return null;

  const audioCtx = new AudioContext();

  try {
    // Decode all scene audios
    const buffers: { buffer: AudioBuffer; offset: number }[] = [];
    let offset = 0;

    for (const scene of scenes) {
      if (scene.audioBase64) {
        try {
          const binary = atob(scene.audioBase64);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
          }
          const audioBuffer = await audioCtx.decodeAudioData(bytes.buffer.slice(0));
          buffers.push({ buffer: audioBuffer, offset });
        } catch (e) {
          console.warn(`[concatenateSceneAudios] Failed to decode scene audio, skipping`, e);
        }
      }
      offset += scene.durationSeconds;
    }

    if (buffers.length === 0) return null;

    const sampleRate = buffers[0].buffer.sampleRate;
    const totalDuration = offset;
    const totalSamples = Math.ceil(totalDuration * sampleRate);

    const offlineCtx = new OfflineAudioContext(1, totalSamples, sampleRate);

    for (const { buffer, offset } of buffers) {
      const source = offlineCtx.createBufferSource();
      source.buffer = buffer;
      source.connect(offlineCtx.destination);
      source.start(offset);
    }

    const rendered = await offlineCtx.startRendering();
    const blob = audioBufferToWavBlob(rendered);
    const url = URL.createObjectURL(blob);

    console.log(`[concatenateSceneAudios] Created ${totalDuration.toFixed(1)}s audio from ${buffers.length} scenes`);
    return { blob, url };
  } finally {
    await audioCtx.close().catch(() => {});
  }
}

function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const length = buffer.length;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = length * blockAlign;
  const headerSize = 44;
  const totalSize = headerSize + dataSize;

  const wav = new ArrayBuffer(totalSize);
  const view = new DataView(wav);

  // WAV header
  writeStr(view, 0, 'RIFF');
  view.setUint32(4, totalSize - 8, true);
  writeStr(view, 8, 'WAVE');
  writeStr(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeStr(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, buffer.getChannelData(ch)[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      offset += 2;
    }
  }

  return new Blob([wav], { type: 'audio/wav' });
}

function writeStr(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}
