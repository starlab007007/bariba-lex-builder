// Lightweight Voice Activity Detection + live RMS meter built on AnalyserNode.
// Designed for the Voice Lab capture UX: caller polls `getLevel()` from a rAF loop.

export interface VadStats {
  /** Linear RMS amplitude in [0..1] */
  rms: number;
  /** RMS in dBFS (<= 0). -Infinity when silent. */
  db: number;
  /** Normalised level [0..1] for VU-meters (mapped from -60dB → 0dB). */
  level01: number;
  /** True when voice activity is detected (above ~-45 dB). */
  isVoice: boolean;
  /** True when the input is unusually loud / clipping (above ~-3 dB). */
  isClipping: boolean;
}

const VOICE_THRESHOLD_DB = -45;
const CLIP_THRESHOLD_DB = -3;
const FLOOR_DB = -60;

export function createVadAnalyser(stream: MediaStream): {
  ctx: AudioContext;
  analyser: AnalyserNode;
  getLevel: () => VadStats;
  destroy: () => void;
} {
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const src = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 1024;
  analyser.smoothingTimeConstant = 0.4;
  src.connect(analyser);

  const buf = new Float32Array(analyser.fftSize);

  function getLevel(): VadStats {
    analyser.getFloatTimeDomainData(buf);
    let sumSq = 0;
    for (let i = 0; i < buf.length; i++) sumSq += buf[i] * buf[i];
    const rms = Math.sqrt(sumSq / buf.length);
    const db = rms > 0 ? 20 * Math.log10(rms) : -Infinity;
    const clamped = Math.max(FLOOR_DB, Math.min(0, db));
    const level01 = isFinite(clamped) ? (clamped - FLOOR_DB) / -FLOOR_DB : 0;
    return {
      rms,
      db,
      level01,
      isVoice: db > VOICE_THRESHOLD_DB,
      isClipping: db > CLIP_THRESHOLD_DB,
    };
  }

  function destroy() {
    try { src.disconnect(); } catch (_) {}
    try { analyser.disconnect(); } catch (_) {}
    try { ctx.close(); } catch (_) {}
  }

  return { ctx, analyser, getLevel, destroy };
}
