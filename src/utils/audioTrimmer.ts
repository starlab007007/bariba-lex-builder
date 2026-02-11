/**
 * Audio trimming utility for creating trimmed audio blobs
 * Uses OfflineAudioContext for precise audio segment extraction
 */

export async function trimAudioBlob(
  audioUrl: string,
  startOffset: number,
  duration: number
): Promise<Blob> {
  const audioCtx = new AudioContext();
  
  try {
    const response = await fetch(audioUrl);
    if (!response.ok) throw new Error(`Audio fetch failed: ${response.status}`);
    const arrayBuffer = await response.arrayBuffer();
    const fullBuffer = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
    
    const sampleRate = fullBuffer.sampleRate;
    const channels = fullBuffer.numberOfChannels;
    const trimmedLength = Math.ceil(duration * sampleRate);
    
    const offlineCtx = new OfflineAudioContext(channels, trimmedLength, sampleRate);
    const source = offlineCtx.createBufferSource();
    source.buffer = fullBuffer;
    source.connect(offlineCtx.destination);
    source.start(0, startOffset, duration);
    
    const trimmedBuffer = await offlineCtx.startRendering();
    
    // Encode to WAV
    return audioBufferToWavBlob(trimmedBuffer);
  } finally {
    await audioCtx.close().catch(() => {});
  }
}

function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const length = buffer.length;
  const bytesPerSample = 2; // 16-bit
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = length * blockAlign;
  const headerSize = 44;
  const totalSize = headerSize + dataSize;
  
  const wav = new ArrayBuffer(totalSize);
  const view = new DataView(wav);
  
  // WAV header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, totalSize - 8, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // chunk size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); // bits per sample
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);
  
  // Interleave channels
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

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}
