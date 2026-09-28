// Portage fidèle de fitila_flutter/lib/apprendre/apprendre_voice_analysis.dart
// (branche feat/apprendre-v2.4-build19-20260927) — analyse et comparaison de
// voix, entièrement côté client (hors-ligne, dans le navigateur).
//
// Chaîne : WAV PCM 16 bits → 16 kHz mono → coupe des silences → empreinte
// des sons (MFCC 12 coefficients, moyenne retirée) + courbe de hauteur
// (autocorrélation, en demi-tons autour de la médiane) → alignement
// temporel (DTW) sur la référence → trois scores (sons, mélodie, rythme)
// et des conseils.
//
// Référence : apprendre_v24_spec.md §9 — toutes les constantes et formules
// ci-dessous sont reproduites au bit près depuis le code Dart source, pour
// que web et Flutter donnent des scores comparables sur le même
// enregistrement. Conçu pour tourner dans un Web Worker (voir voiceWorker.ts)
// afin de ne pas bloquer le thread UI pendant la FFT/DTW.

const SR = 16000;
const WIN = 400; // 25 ms
const HOP = 160; // 10 ms
const NFFT = 512;
const N_MEL = 26;
const N_CEP = 13;
const PITCH_WIN = 640; // 40 ms
const LAG_MIN = Math.floor(SR / 400); // 400 Hz
const LAG_MAX = Math.floor(SR / 70); // 70 Hz

/** Signal mono normalisé entre -1 et 1, échantillonné à 16 kHz. */
export interface ApPcm {
  samples: Float64Array;
}
export function pcmSeconds(pcm: ApPcm): number {
  return pcm.samples.length / SR;
}

/** Lit un fichier WAV PCM 16 bits (mono ou stéréo, toute fréquence). Renvoie null si non supporté. */
export function apDecodeWav(bytes: Uint8Array): ApPcm | null {
  if (bytes.length < 44) return null;
  const data = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const tag = (offset: number) => String.fromCharCode(bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3]);
  if (tag(0) !== 'RIFF' || tag(8) !== 'WAVE') return null;

  let offset = 12;
  let channels = 1;
  let rate = SR;
  let bits = 16;
  let format = 1;
  let dataStart: number | null = null;
  let dataLength = 0;
  while (offset + 8 <= bytes.length) {
    const id = tag(offset);
    const size = data.getUint32(offset + 4, true);
    const body = offset + 8;
    if (id === 'fmt ' && body + 16 <= bytes.length) {
      format = data.getUint16(body, true);
      channels = data.getUint16(body + 2, true);
      rate = data.getUint32(body + 4, true);
      bits = data.getUint16(body + 14, true);
    } else if (id === 'data') {
      dataStart = body;
      dataLength = Math.min(size, bytes.length - body);
      break;
    }
    offset = body + size + (size % 2 === 1 ? 1 : 0);
  }
  const start = dataStart;
  if (start == null || format !== 1 || bits !== 16 || channels < 1 || rate <= 0) return null;

  const frames = Math.floor(dataLength / (2 * channels));
  const mono = new Float64Array(frames);
  for (let i = 0; i < frames; i++) {
    let sum = 0;
    for (let c = 0; c < channels; c++) {
      sum += data.getInt16(start + (i * channels + c) * 2, true) / 32768.0;
    }
    mono[i] = sum / channels;
  }
  if (rate === SR) return { samples: mono };

  // Rééchantillonnage linéaire vers 16 kHz.
  const outLength = Math.floor((frames * SR) / rate);
  const out = new Float64Array(outLength);
  for (let i = 0; i < outLength; i++) {
    const pos = (i * rate) / SR;
    const i0 = Math.floor(pos);
    const i1 = Math.min(i0 + 1, frames - 1);
    const frac = pos - i0;
    out[i] = mono[i0] * (1 - frac) + mono[i1] * frac;
  }
  return { samples: out };
}

/** Écrit un WAV PCM 16 bits mono 16 kHz. */
export function apEncodeWav(samples: ArrayLike<number>): Uint8Array {
  const length = samples.length * 2;
  const out = new DataView(new ArrayBuffer(44 + length));
  const text = (offset: number, value: string) => {
    for (let i = 0; i < 4; i++) out.setUint8(offset + i, value.charCodeAt(i));
  };
  text(0, 'RIFF');
  out.setUint32(4, 36 + length, true);
  text(8, 'WAVE');
  text(12, 'fmt ');
  out.setUint32(16, 16, true);
  out.setUint16(20, 1, true);
  out.setUint16(22, 1, true);
  out.setUint32(24, SR, true);
  out.setUint32(28, SR * 2, true);
  out.setUint16(32, 2, true);
  out.setUint16(34, 16, true);
  text(36, 'data');
  out.setUint32(40, length, true);
  for (let i = 0; i < samples.length; i++) {
    const v = Math.min(1, Math.max(-1, samples[i]));
    out.setInt16(44 + i * 2, Math.round(v * 32767), true);
  }
  return new Uint8Array(out.buffer);
}

function frameEnergyDb(x: Float64Array): Float64Array {
  if (x.length < WIN) return new Float64Array(0);
  const n = Math.floor((x.length - WIN) / HOP) + 1;
  const out = new Float64Array(n);
  let idx = 0;
  for (let s = 0; s + WIN <= x.length; s += HOP) {
    let e = 0;
    for (let i = 0; i < WIN; i++) e += x[s + i] * x[s + i];
    out[idx++] = (10 * Math.log(e / WIN + 1e-10)) / Math.LN10;
  }
  return out;
}

/** Coupe les silences de début et de fin (seuil relatif au bruit de fond). */
export function apTrimSilence(x: Float64Array): Float64Array {
  const e = frameEnergyDb(x);
  if (e.length === 0) return x;
  const peak = Math.max(...e);
  const sorted = [...e].sort((a, b) => a - b);
  const floor = sorted[Math.floor(sorted.length / 10)];
  const threshold = Math.max(peak - 30, floor + 10);
  let first = -1;
  let last = -1;
  for (let i = 0; i < e.length; i++) {
    if (e[i] > threshold) {
      if (first < 0) first = i;
      last = i;
    }
  }
  if (first < 0) return x;
  const a = Math.max(0, first - 2) * HOP;
  const b = Math.min(x.length, (last + 3) * HOP + WIN);
  return x.slice(a, b);
}

/** FFT radix-2 in-place (Cooley-Tukey, DIT, bit-reversal). `n` doit être une puissance de 2. */
function fft(re: Float64Array, im: Float64Array): void {
  const n = re.length;
  let j = 0;
  for (let i = 1; i < n; i++) {
    let bit = n >> 1;
    while ((j & bit) !== 0) {
      j ^= bit;
      bit >>= 1;
    }
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let size = 2; size <= n; size <<= 1) {
    const angle = (-2 * Math.PI) / size;
    const wr = Math.cos(angle);
    const wi = Math.sin(angle);
    const half = size >> 1;
    for (let start = 0; start < n; start += size) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < half; k++) {
        const a = start + k;
        const b = a + half;
        const tr = re[b] * cr - im[b] * ci;
        const ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr;
        im[b] = im[a] - ti;
        re[a] += tr;
        im[a] += ti;
        const ncr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = ncr;
      }
    }
  }
}

const hzToMel = (f: number) => (2595 * Math.log(1 + f / 700)) / Math.LN10;
const melToHz = (m: number) => 700 * (10 ** (m / 2595) - 1);

let melBankCache: Float64Array[] | null = null;
function melBank(): Float64Array[] {
  if (melBankCache) return melBankCache;
  const lo = hzToMel(60);
  const hi = hzToMel(SR / 2);
  const bins: number[] = [];
  for (let i = 0; i < N_MEL + 2; i++) {
    bins.push(Math.floor(((NFFT + 1) * melToHz(lo + ((hi - lo) * i) / (N_MEL + 1))) / SR));
  }
  const bank: Float64Array[] = [];
  for (let m = 1; m <= N_MEL; m++) {
    const row = new Float64Array(Math.floor(NFFT / 2) + 1);
    const b0 = bins[m - 1];
    const b1 = bins[m];
    const b2 = bins[m + 1];
    for (let k = b0; k < b1; k++) row[k] = (k - b0) / (b1 - b0);
    for (let k = b1; k < b2; k++) row[k] = (b2 - k) / (b2 - b1);
    bank.push(row);
  }
  melBankCache = bank;
  return bank;
}

let hammingCache: Float64Array | null = null;
function hamming(): Float64Array {
  if (hammingCache) return hammingCache;
  const w = new Float64Array(WIN);
  for (let i = 0; i < WIN; i++) w[i] = 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (WIN - 1));
  hammingCache = w;
  return w;
}

/** Empreinte des sons : 12 coefficients MFCC par tranche de 10 ms, moyenne retirée. */
export function apMfcc(x: Float64Array): number[][] {
  const feats: number[][] = [];
  const re = new Float64Array(NFFT);
  const im = new Float64Array(NFFT);
  const powerLen = Math.floor(NFFT / 2) + 1;
  const power = new Float64Array(powerLen);
  const logMel = new Float64Array(N_MEL);
  const win = hamming();
  const bank = melBank();
  for (let s = 0; s + WIN <= x.length; s += HOP) {
    for (let i = 0; i < NFFT; i++) {
      re[i] = i < WIN ? x[s + i] * win[i] : 0;
      im[i] = 0;
    }
    fft(re, im);
    for (let k = 0; k < powerLen; k++) power[k] = (re[k] * re[k] + im[k] * im[k]) / NFFT;
    for (let m = 0; m < N_MEL; m++) {
      const row = bank[m];
      let sum = 0;
      for (let k = 0; k < powerLen; k++) sum += row[k] * power[k];
      logMel[m] = Math.log(Math.max(sum, 1e-10));
    }
    const cep: number[] = [];
    for (let n = 1; n < N_CEP; n++) {
      let c = 0;
      for (let m = 0; m < N_MEL; m++) c += logMel[m] * Math.cos((Math.PI * n * (m + 0.5)) / N_MEL);
      cep.push(c * Math.sqrt(2 / N_MEL));
    }
    feats.push(cep);
  }
  if (feats.length > 0) {
    const d = feats[0].length;
    for (let i = 0; i < d; i++) {
      let mean = 0;
      for (const f of feats) mean += f[i];
      mean /= feats.length;
      for (const f of feats) f[i] -= mean;
    }
  }
  return feats;
}

/** Hauteur (Hz) par tranche de 10 ms ; 0 quand la tranche n'est pas voisée. */
export function apPitch(x: Float64Array): Float64Array {
  const e = frameEnergyDb(x);
  if (e.length === 0) return new Float64Array(0);
  const peak = Math.max(...e);
  const raw = new Float64Array(e.length);
  const half = PITCH_WIN - LAG_MAX;
  const seg = new Float64Array(PITCH_WIN);
  for (let f = 0; f < e.length; f++) {
    const s = f * HOP;
    if (s + PITCH_WIN > x.length || e[f] < peak - 20) continue;
    let mean = 0;
    for (let i = 0; i < PITCH_WIN; i++) mean += x[s + i];
    mean /= PITCH_WIN;
    for (let i = 0; i < PITCH_WIN; i++) seg[i] = x[s + i] - mean;
    let e0 = 0;
    for (let i = 0; i < half; i++) e0 += seg[i] * seg[i];
    let best = 0;
    let bestLag = 0;
    for (let lag = LAG_MIN; lag <= LAG_MAX; lag++) {
      let num = 0;
      let eL = 0;
      for (let i = 0; i < half; i++) {
        num += seg[i] * seg[i + lag];
        eL += seg[i + lag] * seg[i + lag];
      }
      const r = num / Math.sqrt(e0 * eL + 1e-12);
      if (r > best) {
        best = r;
        bestLag = lag;
      }
    }
    if (best >= 0.6 && bestLag > 0) raw[f] = SR / bestLag;
  }
  // Médiane glissante sur 5 tranches voisées.
  const smooth = new Float64Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    if (raw[i] === 0) continue;
    const window: number[] = [];
    for (let k = Math.max(0, i - 2); k < Math.min(raw.length, i + 3); k++) {
      if (raw[k] > 0) window.push(raw[k]);
    }
    window.sort((a, b) => a - b);
    smooth[i] = window[Math.floor(window.length / 2)];
  }
  return smooth;
}

function foldOctave(st: number): number {
  let value = st;
  while (value > 7) value -= 12;
  while (value < -7) value += 12;
  return value;
}

/**
 * Courbe de hauteur en demi-tons autour de la médiane du locuteur (null pour
 * une tranche non voisée). Rend comparables voix graves et aiguës.
 */
export function apSemitones(f0: Float64Array): (number | null)[] {
  const voiced = [...f0].filter((v) => v > 0).sort((a, b) => a - b);
  if (voiced.length === 0) return new Array(f0.length).fill(null);
  const median = voiced[Math.floor(voiced.length / 2)];
  return [...f0].map((v) => (v <= 0 ? null : foldOctave((12 * Math.log(v / median)) / Math.LN2)));
}

interface DtwResult {
  distance: number;
  path: [number, number][];
}

/** Dynamic Time Warping avec bande de Sakoe-Chiba adaptative. */
function dtw(a: number[][], b: number[][]): DtwResult {
  const n = a.length;
  const m = b.length;
  const band = Math.max(Math.abs(n - m) + 10, Math.floor(0.25 * Math.max(n, m)));
  const inf = Infinity;
  const cost: Float64Array[] = Array.from({ length: n + 1 }, () => new Float64Array(m + 1).fill(inf));
  cost[0][0] = 0;
  const dims = a[0].length;
  for (let i = 1; i <= n; i++) {
    const center = Math.floor((i * m) / n);
    const jFrom = Math.max(1, center - band);
    const jTo = Math.min(m, center + band);
    for (let j = jFrom; j <= jTo; j++) {
      let d = 0;
      const ai = a[i - 1];
      const bj = b[j - 1];
      for (let k = 0; k < dims; k++) {
        const diff = ai[k] - bj[k];
        d += diff * diff;
      }
      const best = Math.min(cost[i - 1][j], cost[i][j - 1], cost[i - 1][j - 1]);
      cost[i][j] = Math.sqrt(d) + best;
    }
  }
  const path: [number, number][] = [];
  let i = n;
  let j = m;
  while (i > 0 && j > 0) {
    path.push([i - 1, j - 1]);
    const diag = cost[i - 1][j - 1];
    const up = cost[i - 1][j];
    const left = cost[i][j - 1];
    if (diag <= up && diag <= left) {
      i--; j--;
    } else if (up <= left) {
      i--;
    } else {
      j--;
    }
  }
  path.reverse();
  return { distance: cost[n][m] / Math.max(1, path.length), path };
}

/** Seuils de comparaison (réglables depuis l'administration). */
export interface ApCompareSettings {
  veryClose: number;
  close: number;
  mfccGood: number;
  mfccBad: number;
  calibrated: boolean;
}
export const DEFAULT_COMPARE_SETTINGS: ApCompareSettings = {
  veryClose: 80, close: 60, mfccGood: 5, mfccBad: 14, calibrated: false,
};

export type ApVerdict = 'veryClose' | 'close' | 'retry';
export function verdictLabel(verdict: ApVerdict): string {
  switch (verdict) {
    case 'veryClose': return 'Très proche';
    case 'close': return 'Proche';
    case 'retry': return 'À reprendre';
  }
}

/** Résultat d'une comparaison, prêt à être affiché. */
export interface ApVoiceComparison {
  total: number;
  sounds: number;
  melody: number | null;
  rhythm: number;
  durationRatio: number;
  verdict: ApVerdict;
  advice: string[];
  referenceContour: (number | null)[];
  learnerContour: (number | null)[];
  referenceEnvelope: number[];
  learnerEnvelope: number[];
  mfccDistance: number;
}

function envelope(x: Float64Array): number[] {
  const e = frameEnergyDb(x);
  if (e.length === 0) return [];
  const peak = Math.max(...e);
  return [...e].map((v) => Math.min(1, Math.max(0, (v - (peak - 50)) / 50)));
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function melodyAdvice(reference: (number | null)[], learner: (number | null)[]): string {
  const slope = (contour: (number | null)[]): number | null => {
    const values = contour.filter((v): v is number => v != null);
    if (values.length < 6) return null;
    const third = Math.floor(values.length / 3);
    return mean(values.slice(values.length - third)) - mean(values.slice(0, third));
  };
  const a = slope(reference);
  const b = slope(learner);
  if (a != null && b != null) {
    if (a > 1 && b < a - 1.5) return 'Mélodie : la voix doit monter, comme la courbe dorée.';
    if (a < -1 && b > a + 1.5) return 'Mélodie : la voix doit descendre, comme la courbe dorée.';
    if (Math.abs(a) <= 1 && Math.abs(b) > 2) return 'Mélodie : garde la voix plus égale, sans monter ni descendre.';
  }
  return 'Mélodie : suis la courbe dorée, syllabe par syllabe.';
}

/** Compare la voix de l'apprenant à la voix de référence (spec §9.13, formule exacte). */
export function apCompareVoices(reference: ApPcm, learner: ApPcm, settings: ApCompareSettings): ApVoiceComparison | null {
  const ref = apTrimSilence(reference.samples);
  const own = apTrimSilence(learner.samples);
  const fr = apMfcc(ref);
  const fl = apMfcc(own);
  if (fr.length < 5 || fl.length < 5) return null;

  const dtwResult = dtw(fr, fl);
  const sr = apSemitones(apPitch(ref));
  const sl = apSemitones(apPitch(own));

  const diffs: number[] = [];
  const refSum = new Float64Array(fr.length);
  const refCount = new Int32Array(fr.length);
  for (const [i, j] of dtwResult.path) {
    if (i >= sr.length || j >= sl.length) continue;
    const a = sr[i];
    const b = sl[j];
    if (b != null) {
      refSum[i] += b;
      refCount[i]++;
    }
    if (a != null && b != null) diffs.push(Math.abs(a - b));
  }
  const learnerOnRef: (number | null)[] = [];
  for (let i = 0; i < fr.length; i++) learnerOnRef.push(refCount[i] === 0 ? null : refSum[i] / refCount[i]);
  const referenceContour: (number | null)[] = [];
  for (let i = 0; i < fr.length; i++) referenceContour.push(i < sr.length ? sr[i] : null);

  const span = Math.max(0.1, settings.mfccBad - settings.mfccGood);
  const sounds = clamp(100 * (1 - (dtwResult.distance - settings.mfccGood) / span), 0, 100);
  const melody = diffs.length >= 5 ? clamp(100 * (1 - mean(diffs) / 3), 0, 100) : null;
  const ratio = own.length / ref.length;
  let rhythm: number;
  if (ratio >= 0.7 && ratio <= 1.45) {
    rhythm = 100;
  } else {
    const gap = ratio < 0.7 ? 0.7 - ratio : ratio - 1.45;
    rhythm = clamp(100 - 150 * gap, 0, 100);
  }
  const total = 0.55 * sounds + 0.35 * (melody ?? sounds) + 0.1 * rhythm;

  const verdict: ApVerdict = total >= settings.veryClose ? 'veryClose' : total >= settings.close ? 'close' : 'retry';

  const advice: string[] = [];
  const learnerEnergy = frameEnergyDb(own);
  const learnerPeak = learnerEnergy.length === 0 ? -100 : Math.max(...learnerEnergy);
  if (learnerPeak < -35) advice.push('Parle plus fort ou rapproche le téléphone de ta bouche.');
  if (melody != null && melody < settings.close) advice.push(melodyAdvice(referenceContour, learnerOnRef));
  if (sounds < settings.close) advice.push('Certains sons diffèrent : réécoute lentement la référence, puis répète.');
  if (ratio < 0.7) advice.push('Un peu trop rapide : prends le temps de chaque syllabe.');
  else if (ratio > 1.45) advice.push('Un peu trop lent : enchaîne les syllabes.');
  if (advice.length === 0) {
    advice.push(verdict === 'veryClose' ? 'Très bien : ta voix suit la référence.' : 'Presque : réécoute la référence et recommence une fois.');
  }

  return {
    total: Math.round(total),
    sounds: Math.round(sounds),
    melody: melody == null ? null : Math.round(melody),
    rhythm: Math.round(rhythm),
    durationRatio: ratio,
    verdict,
    advice,
    referenceContour,
    learnerContour: learnerOnRef,
    referenceEnvelope: envelope(ref),
    learnerEnvelope: envelope(own),
    mfccDistance: dtwResult.distance,
  };
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

/** Contrôle qualité d'une prise de locuteur (avant envoi). */
export interface ApTakeQuality {
  durationMs: number;
  peakDb: number;
  rmsDb: number;
  snrDb: number;
  silenceRatio: number;
  score: number;
  problems: string[];
}
export function takeAcceptable(q: ApTakeQuality): boolean {
  return q.problems.length === 0;
}

/** Mesure la qualité d'une prise : saturation, niveau, bruit, silences, durée. */
export function apMeasureTake(pcm: ApPcm, expectedSyllables: number): ApTakeQuality {
  const x = pcm.samples;
  let peak = 0;
  let sumSq = 0;
  let clipped = 0;
  for (let i = 0; i < x.length; i++) {
    const a = Math.abs(x[i]);
    if (a > peak) peak = a;
    if (a > 0.985) clipped++;
    sumSq += x[i] * x[i];
  }
  const peakDb = (20 * Math.log(peak + 1e-9)) / Math.LN10;
  const rmsDb = (10 * Math.log(sumSq / Math.max(1, x.length) + 1e-10)) / Math.LN10;
  const e = frameEnergyDb(x);
  let snr = 0;
  let silenceRatio = 1;
  if (e.length > 0) {
    const sorted = [...e].sort((a, b) => a - b);
    const floor = sorted[Math.floor(sorted.length / 10)];
    const top = sorted[Math.floor((sorted.length * 9) / 10)];
    snr = top - floor;
    const threshold = Math.max(sorted[sorted.length - 1] - 30, floor + 10);
    silenceRatio = e.filter((v) => v <= threshold).length / e.length;
  }
  const speech = apTrimSilence(x);
  const durationMs = Math.round((x.length * 1000) / SR);
  const speechSeconds = speech.length / SR;
  const problems: string[] = [];
  let score = 100;
  if (clipped > x.length * 0.001) {
    problems.push('Son saturé : éloigne un peu le téléphone.');
    score -= 35;
  }
  if (peakDb < -24) {
    problems.push('Niveau trop faible : parle plus près du micro.');
    score -= 30;
  }
  if (snr < 20) {
    problems.push('Trop de bruit de fond : cherche un endroit plus calme.');
    score -= 30;
  } else if (snr < 28) {
    score -= 10;
  }
  const minSeconds = Math.max(0.25, expectedSyllables * 0.12);
  const maxSeconds = 1.2 + expectedSyllables * 0.6;
  if (speechSeconds < minSeconds) {
    problems.push('Prise trop courte : le texte semble coupé.');
    score -= 30;
  } else if (speechSeconds > maxSeconds) {
    problems.push('Prise trop longue : dis seulement le texte affiché.');
    score -= 20;
  }
  if (silenceRatio > 0.75) {
    problems.push('Trop de silence autour de la voix : enregistre plus près du début.');
    score -= 10;
  }
  return {
    durationMs, peakDb, rmsDb, snrDb: snr, silenceRatio,
    score: Math.round(clamp(score, 0, 100)), problems,
  };
}

/** Nombre approximatif de syllabes (groupes de voyelles) d'un texte bariba. */
export function apSyllableCount(text: string): number {
  const matches = text.match(/[aeiouɛɔàáâèéêìíîòóôùúûãẽĩõũ]+/gi);
  return Math.max(1, matches ? matches.length : 0);
}
