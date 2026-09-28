// Enregistrement micro navigateur + rééchantillonnage vers 16 kHz mono
// Float64 dans [-1, 1] — le format `ApPcm` attendu par
// `src/lib/apprendre/voiceAnalysis.ts` (non modifié, seulement consommé ici).
//
// Portage web d'`ApWavRecorder` (fitila_flutter/lib/apprendre/apprendre_voice_ui.dart,
// branche feat/apprendre-v2.4-build19-20260927, spec §10.2) : Flutter
// enregistre directement en WAV PCM 16 kHz mono (`RecordConfig(encoder:
// AudioEncoder.wav, sampleRate: 16000, numChannels: 1)`). Le navigateur ne
// permet pas de choisir la fréquence de capture de `getUserMedia`/
// `MediaRecorder` : le micro capture à la fréquence native du système
// (typiquement 44100 ou 48000 Hz, jamais 16000), et `MediaRecorder`
// n'encode qu'en formats compressés (webm/opus, ogg…), jamais en WAV brut.
//
// Piège critique (voir voiceAnalysis.ts) : `apEncodeWav` écrit TOUJOURS un
// en-tête WAV à 16000 Hz quel que soit le contenu réel des échantillons
// passés. Si on lui donnait des échantillons à leur fréquence native tels
// quels, le fichier résultant mentirait sur sa propre fréquence, et
// `apDecodeWav` qui le relirait ferait confiance à ce faux en-tête et
// sauterait le rééchantillonnage, corrompant silencieusement toute la
// chaîne DSP en aval. Cette tâche évite le piège par construction : le flux
// en direct ci-dessous ne passe JAMAIS par `apEncodeWav`/`apDecodeWav` — il
// construit directement un `ApPcm` déjà à 16 kHz mono (voir
// `audioBufferTo16kPcm`), donc l'hypothèse « les échantillons d'un ApPcm
// sont à 16 kHz » que fait tout `voiceAnalysis.ts` (WIN=400=25 ms, HOP=160=
// 10 ms, etc. à 16 kHz) est garantie vraie sans jamais toucher au format WAV.

import type { ApPcm } from './voiceAnalysis';

/** Fréquence cible de tout `ApPcm` produit par ce module. */
export const TARGET_SR = 16000;

/** Mélange un `AudioBuffer` (N canaux) en un seul canal mono Float32. */
export function downmixToMono(buffer: AudioBuffer): Float32Array {
  const { numberOfChannels, length } = buffer;
  const out = new Float32Array(length);
  for (let c = 0; c < numberOfChannels; c++) {
    const data = buffer.getChannelData(c);
    for (let i = 0; i < length; i++) out[i] += data[i] / numberOfChannels;
  }
  return out;
}

/**
 * Rééchantillonnage linéaire pur (aucune API navigateur — testable en
 * Node), reproduisant l'algorithme déjà utilisé par `apDecodeWav`
 * (voiceAnalysis.ts) pour un fichier WAV dont la fréquence diffère de
 * 16 kHz. Sert de repli si `OfflineAudioContext` est indisponible ou
 * échoue dans `audioBufferTo16kPcm` — le chemin principal (navigateur)
 * laisse `OfflineAudioContext` faire un rééchantillonnage de meilleure
 * qualité.
 */
export function linearResampleTo16kMono(mono: ArrayLike<number>, fromRate: number): Float64Array {
  if (fromRate === TARGET_SR) return Float64Array.from(mono);
  const frames = mono.length;
  if (frames === 0 || fromRate <= 0) return new Float64Array(0);
  const outLength = Math.max(0, Math.floor((frames * TARGET_SR) / fromRate));
  const out = new Float64Array(outLength);
  for (let i = 0; i < outLength; i++) {
    const pos = (i * fromRate) / TARGET_SR;
    const i0 = Math.floor(pos);
    const i1 = Math.min(i0 + 1, frames - 1);
    const frac = pos - i0;
    out[i] = mono[i0] * (1 - frac) + mono[i1] * frac;
  }
  return out;
}

/**
 * Convertit un `AudioBuffer` (fréquence/canaux quelconques — micro natif ou
 * fichier de référence décodé) en `ApPcm` 16 kHz mono. Chemin principal :
 * `OfflineAudioContext({ sampleRate: 16000 })` alimenté par le buffer via
 * une `AudioBufferSourceNode`, puis `startRendering()` (rééchantillonnage
 * de qualité navigateur). Repli : interpolation linéaire pure ci-dessus.
 */
export async function audioBufferTo16kPcm(buffer: AudioBuffer): Promise<ApPcm> {
  if (buffer.sampleRate === TARGET_SR && buffer.numberOfChannels === 1) {
    return { samples: Float64Array.from(buffer.getChannelData(0)) };
  }
  const OfflineCtor: typeof OfflineAudioContext | undefined =
    typeof OfflineAudioContext !== 'undefined'
      ? OfflineAudioContext
      : (window as unknown as { webkitOfflineAudioContext?: typeof OfflineAudioContext }).webkitOfflineAudioContext;
  if (OfflineCtor) {
    try {
      const targetLength = Math.max(1, Math.ceil(buffer.duration * TARGET_SR));
      const offlineCtx = new OfflineCtor(1, targetLength, TARGET_SR);
      const source = offlineCtx.createBufferSource();
      source.buffer = buffer;
      source.connect(offlineCtx.destination);
      source.start(0);
      const rendered = await offlineCtx.startRendering();
      return { samples: Float64Array.from(rendered.getChannelData(0)) };
    } catch {
      // Repli ci-dessous (navigateur trop ancien ou rendu refusé).
    }
  }
  const mono = downmixToMono(buffer);
  return { samples: linearResampleTo16kMono(mono, buffer.sampleRate) };
}

/** Décode un blob audio (webm/opus, ogg, mp4/aac, wav — tout ce que
 *  `AudioContext.decodeAudioData` du navigateur sait lire) en `ApPcm`
 *  16 kHz mono. Utilisé pour la prise du micro (`ApMicRecorder.stop()`). */
export async function decodeAudioBlobTo16kPcm(blob: Blob): Promise<ApPcm> {
  const arrayBuffer = await blob.arrayBuffer();
  return decodeArrayBufferTo16kPcm(arrayBuffer);
}

/** Décode un `ArrayBuffer` audio (ex. voix de référence téléchargée depuis
 *  Supabase Storage) en `ApPcm` 16 kHz mono. */
export async function decodeArrayBufferTo16kPcm(arrayBuffer: ArrayBuffer): Promise<ApPcm> {
  const AudioCtor: typeof AudioContext | undefined =
    typeof AudioContext !== 'undefined'
      ? AudioContext
      : (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtor) throw new Error('AudioContext indisponible sur ce navigateur.');
  const ctx = new AudioCtor();
  try {
    // `decodeAudioData` détache le buffer qu'on lui passe : on en donne une
    // copie pour ne jamais invalider l'`ArrayBuffer` de l'appelant.
    const buffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
    return await audioBufferTo16kPcm(buffer);
  } finally {
    void ctx.close().catch(() => {});
  }
}

/**
 * Enregistreur micro navigateur (`getUserMedia` + `MediaRecorder`),
 * équivalent web d'`ApWavRecorder` (spec §10.2). N'importe quel type MIME
 * natif du navigateur convient (ex. `audio/webm`) : la prise est toujours
 * redécodée et rééchantillonnée à 16 kHz avant analyse.
 */
export class ApMicRecorder {
  private stream: MediaStream | null = null;
  private recorder: MediaRecorder | null = null;
  private chunks: BlobPart[] = [];
  recording = false;

  /** Démarre l'enregistrement. Lève une erreur (permission refusée,
   *  micro absent, API indisponible) — l'appelant affiche alors le message
   *  générique « Microphone indisponible. » (spec §10.3 étape 2), exactement
   *  comme le `catch (_)` du `_toggle()` Dart. */
  async start(): Promise<void> {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      throw new Error('Microphone indisponible sur ce navigateur.');
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1 } });
    const mimeType = pickSupportedMimeType();
    const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) chunks.push(event.data);
    };
    this.stream = stream;
    this.recorder = recorder;
    this.chunks = chunks;
    recorder.start();
    this.recording = true;
  }

  /** Arrête l'enregistrement et renvoie le blob capturé, ou `null` s'il est
   *  vide (équivalent du fichier `null` renvoyé par `_recorder.stop()` côté
   *  Dart — spec §10.3 étape 4 : « Enregistrement vide. Réessaie. »). */
  stop(): Promise<Blob | null> {
    const recorder = this.recorder;
    const stream = this.stream;
    if (!recorder || !this.recording) return Promise.resolve(null);
    this.recording = false;
    return new Promise((resolve) => {
      const finish = (blob: Blob | null) => {
        stream?.getTracks().forEach((track) => track.stop());
        this.stream = null;
        this.recorder = null;
        this.chunks = [];
        resolve(blob);
      };
      recorder.onstop = () => {
        const blob = this.chunks.length > 0 ? new Blob(this.chunks, { type: recorder.mimeType || 'audio/webm' }) : null;
        finish(blob && blob.size > 0 ? blob : null);
      };
      try {
        recorder.stop();
      } catch {
        finish(null);
      }
    });
  }

  /** Annule sans renvoyer de blob et libère le micro — équivalent
   *  `ApWavRecorder.cancel()`/`dispose()`, appelé au démontage du composant
   *  (comme `_CompareSheetState.dispose()` côté Dart). */
  cancel(): void {
    if (this.recorder && this.recording) {
      try {
        this.recorder.stop();
      } catch {
        // déjà arrêté — sans conséquence, on libère quand même le flux ci-dessous.
      }
    }
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    this.recorder = null;
    this.chunks = [];
    this.recording = false;
  }
}

function pickSupportedMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) return undefined;
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type));
}
