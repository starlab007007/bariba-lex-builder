// Decode any browser-recorded audio Blob (webm/opus, mp4/aac, ogg…) and re-encode as
// WAV PCM 16-bit 16 kHz mono — universal format for ASR (Whisper / Wav2Vec2 / Praat).
//
// Pipeline:
//   1. Decode Blob → AudioBuffer via OfflineAudioContext (uses native codecs)
//   2. Resample to 16 000 Hz mono via OfflineAudioContext rendering
//   3. Light DSP: highpass 80 Hz + soft noise gate (-50 dB) + peak normalize to -3 dBFS
//   4. Encode to WAV PCM 16-bit (RIFF header + Int16 little-endian samples)

export interface WavConversionResult {
  blob: Blob;
  durationSec: number;
  peakDb: number;        // peak in dBFS after normalisation
  rmsDb: number;         // average RMS in dBFS
  sampleRate: number;    // 16000
}

const TARGET_SR = 16000;
const TARGET_PEAK_DBFS = -3; // headroom for ASR
const NOISE_GATE_DB = -50;
const HIGHPASS_HZ = 80;

export async function blobToWav16kMono(input: Blob): Promise<WavConversionResult> {
  // 1. Decode using a temp AudioContext (the input may be at any rate)
  const arrayBuf = await input.arrayBuffer();
  const tmpCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  let decoded: AudioBuffer;
  try {
    decoded = await tmpCtx.decodeAudioData(arrayBuf.slice(0));
  } finally {
    try { await tmpCtx.close(); } catch (_) { /* ignore */ }
  }

  // 2. Re-render through an OfflineAudioContext set to 16 kHz mono with DSP graph
  const length = Math.ceil(decoded.duration * TARGET_SR);
  const offline = new OfflineAudioContext(1, length, TARGET_SR);

  const src = offline.createBufferSource();
  src.buffer = decoded;

  // Highpass to kill low-frequency rumble (HVAC, plosive thumps)
  const hp = offline.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = HIGHPASS_HZ;
  hp.Q.value = 0.707;

  // Light compressor to even out loudness
  const comp = offline.createDynamicsCompressor();
  comp.threshold.value = -24;
  comp.knee.value = 18;
  comp.ratio.value = 3;
  comp.attack.value = 0.005;
  comp.release.value = 0.12;

  src.connect(hp);
  hp.connect(comp);
  comp.connect(offline.destination);
  src.start(0);

  const rendered = await offline.startRendering();
  const samples = rendered.getChannelData(0);

  // 3. Soft noise gate + measure peak/rms
  const gateLin = Math.pow(10, NOISE_GATE_DB / 20);
  let peak = 0;
  let sumSq = 0;
  let nonZero = 0;
  for (let i = 0; i < samples.length; i++) {
    let v = samples[i];
    if (Math.abs(v) < gateLin) v = 0;
    samples[i] = v;
    const a = Math.abs(v);
    if (a > peak) peak = a;
    if (a > 0) { sumSq += v * v; nonZero++; }
  }

  // 4. Peak normalise to TARGET_PEAK_DBFS
  if (peak > 0) {
    const targetLin = Math.pow(10, TARGET_PEAK_DBFS / 20);
    const gain = targetLin / peak;
    for (let i = 0; i < samples.length; i++) samples[i] = samples[i] * gain;
    peak = targetLin;
  }

  const rms = nonZero > 0 ? Math.sqrt(sumSq / nonZero) : 0;
  const peakDb = peak > 0 ? 20 * Math.log10(peak) : -Infinity;
  const rmsDb = rms > 0 ? 20 * Math.log10(rms) : -Infinity;

  // 5. Encode WAV PCM 16-bit mono
  const wavBuffer = encodeWav(samples, TARGET_SR);
  const blob = new Blob([wavBuffer], { type: 'audio/wav' });

  return {
    blob,
    durationSec: rendered.duration,
    peakDb,
    rmsDb,
    sampleRate: TARGET_SR,
  };
}

function encodeWav(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const numSamples = samples.length;
  const bytesPerSample = 2;
  const blockAlign = bytesPerSample;            // mono
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');
  // fmt chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);            // PCM chunk size
  view.setUint16(20, 1, true);             // format = PCM
  view.setUint16(22, 1, true);             // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);            // bits per sample
  // data chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Int16 little-endian PCM
  let offset = 44;
  for (let i = 0; i < numSamples; i++, offset += 2) {
    let s = Math.max(-1, Math.min(1, samples[i]));
    s = s < 0 ? s * 0x8000 : s * 0x7FFF;
    view.setInt16(offset, s | 0, true);
  }

  return buffer;
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
}
