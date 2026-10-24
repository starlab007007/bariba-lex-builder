/**
 * Traduction FR <-> Baatɔnum hors connexion, dans le navigateur, par ByT5
 * (ONNX Runtime Web, WASM). Même modèle et même décodage que l'app Android
 * (`OfflineByt5.kt`), donc même statut : BÊTA ("tested": false dans le
 * manifeste) — chaque appelant doit l'indiquer à côté du résultat.
 *
 * Le paquet (`dunya-translate-byt5-v1.zip`, "ZIP non compressé" : entrées en
 * mode STORED, donc aucune décompression nécessaire ici) est téléchargé une
 * fois pendant que l'app est en ligne ([ensureByt5PackCached]) et mis en
 * cache par le navigateur (`CacheStorage`, voir vite.config.ts) — exactement
 * le même principe que le téléchargement explicite du paquet sur Android,
 * mais silencieux et best-effort ici. Sans ce paquet en cache, impossible de
 * traduire hors connexion : [translateOfflineByt5] renvoie alors `null`,
 * jamais une erreur, pour laisser l'appelant retomber sur son propre message.
 *
 * ONNX Runtime Web est chargé en dynamic import (code-split) : les visiteurs
 * qui ne vont jamais hors connexion ne téléchargent ni le runtime (~11 Mo)
 * ni le modèle.
 */

const PACK_URL = 'https://fitila.bj/dunya-packs/v1/dunya-translate-byt5-v1.zip';
const PACK_CACHE = 'dunya-packs';
const EOS_ID = 1n;

export type Byt5Direction = 'fr-ba' | 'ba-fr';

interface Byt5PackFiles {
  manifest: unknown;
  config: Record<string, unknown>;
  memory: Map<string, string>;
  encoderBytes: Uint8Array;
  decoderBytes: Uint8Array;
}

interface Byt5Session {
  session: Byt5PackFiles;
  prefixFrBa: string;
  prefixBaFr: string;
  encoder: import('onnxruntime-web').InferenceSession;
  decoder: import('onnxruntime-web').InferenceSession;
}

let ortModule: typeof import('onnxruntime-web') | null = null;
let sessionPromise: Promise<Byt5Session | null> | null = null;
let cachingPromise: Promise<void> | null = null;

async function loadOrt() {
  if (!ortModule) {
    const ort = await import('onnxruntime-web/wasm');
    ort.env.wasm.wasmPaths = '/ort/';
    // Pas de SharedArrayBuffer requis (aucun en-tête COOP/COEP garanti côté
    // hébergement) : un seul thread, un peu plus lent mais partout fiable.
    ort.env.wasm.numThreads = 1;
    ortModule = ort;
  }
  return ortModule;
}

/** NFC + espaces normalisés — même règle que `OfflineByt5.normalize` (Kotlin). */
function normalize(value: string): string {
  return value.normalize('NFC').trim().replace(/\s+/g, ' ');
}

// --- Lecture minimale d'un ZIP "stored" (non compressé) ---------------------

function readStoredZip(buffer: ArrayBuffer): Map<string, Uint8Array> {
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  const EOCD_SIG = 0x06054b50;
  const CD_SIG = 0x02014b50;
  let eocdOffset = -1;
  const scanFloor = Math.max(0, bytes.length - 22 - 65535);
  for (let i = bytes.length - 22; i >= scanFloor; i--) {
    if (view.getUint32(i, true) === EOCD_SIG) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset < 0) throw new Error('ZIP invalide : fin de répertoire central introuvable.');
  const entryCount = view.getUint16(eocdOffset + 10, true);
  let offset = view.getUint32(eocdOffset + 16, true);
  const entries = new Map<string, Uint8Array>();
  for (let i = 0; i < entryCount; i++) {
    if (view.getUint32(offset, true) !== CD_SIG) {
      throw new Error('ZIP invalide : entrée de répertoire central inattendue.');
    }
    const method = view.getUint16(offset + 10, true);
    const compSize = view.getUint32(offset + 20, true);
    const nameLen = view.getUint16(offset + 28, true);
    const extraLen = view.getUint16(offset + 30, true);
    const commentLen = view.getUint16(offset + 32, true);
    const localHeaderOffset = view.getUint32(offset + 42, true);
    const name = new TextDecoder('utf-8').decode(bytes.subarray(offset + 46, offset + 46 + nameLen));
    if (method !== 0) throw new Error(`ZIP compressé non supporté pour « ${name} » (paquet attendu non compressé).`);
    const lhNameLen = view.getUint16(localHeaderOffset + 26, true);
    const lhExtraLen = view.getUint16(localHeaderOffset + 28, true);
    const dataStart = localHeaderOffset + 30 + lhNameLen + lhExtraLen;
    entries.set(name, bytes.subarray(dataStart, dataStart + compSize));
    offset += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

// --- Téléchargement / cache du paquet ---------------------------------------

async function openPackCache(): Promise<Cache | null> {
  try {
    if (typeof caches === 'undefined') return null;
    return await caches.open(PACK_CACHE);
  } catch {
    return null;
  }
}

/**
 * Télécharge le paquet ByT5 en arrière-plan s'il n'est pas déjà en cache et
 * que la connexion est disponible — jamais pendant qu'on est hors ligne.
 * Best-effort, silencieux : à appeler après une traduction en ligne réussie
 * (voir `ByT5TranslationService`), jamais bloquant pour l'utilisateur.
 */
export function ensureByt5PackCached(): Promise<void> {
  if (!cachingPromise) {
    cachingPromise = (async () => {
      try {
        if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
        const cache = await openPackCache();
        if (!cache) return;
        const existing = await cache.match(PACK_URL);
        if (existing) return;
        const response = await fetch(PACK_URL, { mode: 'cors' });
        if (!response.ok) return;
        await cache.put(PACK_URL, response.clone());
      } catch {
        // Hors connexion, CORS refusé, ou hébergement temporairement
        // indisponible : on retentera à la prochaine traduction en ligne.
      }
    })();
  }
  return cachingPromise;
}

async function loadPackBytes(): Promise<ArrayBuffer | null> {
  const cache = await openPackCache();
  if (cache) {
    const cached = await cache.match(PACK_URL);
    if (cached) return cached.arrayBuffer();
  }
  // Pas encore en cache : seule une connexion active peut le récupérer —
  // jamais pendant une traduction hors ligne (l'appelant ne tente ce chemin
  // que si `navigator.onLine` a déjà été vérifié par ailleurs, mais on reste
  // défensif ici aussi).
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return null;
  try {
    const response = await fetch(PACK_URL, { mode: 'cors' });
    if (!response.ok) return null;
    if (cache) await cache.put(PACK_URL, response.clone());
    return response.arrayBuffer();
  } catch {
    return null;
  }
}

async function loadSession(): Promise<Byt5Session | null> {
  if (!sessionPromise) {
    sessionPromise = (async () => {
      try {
        const packBytes = await loadPackBytes();
        if (!packBytes) return null;
        const files = readStoredZip(packBytes);
        const manifestBytes = files.get('manifest.json');
        const encoderBytes = files.get('byt5/encoder.onnx');
        const decoderBytes = files.get('byt5/decoder.onnx');
        if (!manifestBytes || !encoderBytes || !decoderBytes) {
          throw new Error('Paquet ByT5 incomplet (fichiers manquants).');
        }
        const manifest = JSON.parse(new TextDecoder('utf-8').decode(manifestBytes));
        if (manifest?.id !== 'dunya-translate-byt5' || manifest?.format !== 'dunya-pack/1' || !('tested' in manifest)) {
          throw new Error('Manifeste du paquet ByT5 invalide.');
        }
        let prefixFrBa = 'fr-ba: ';
        let prefixBaFr = 'ba-fr: ';
        const configBytes = files.get('config.json');
        if (configBytes) {
          const config = JSON.parse(new TextDecoder('utf-8').decode(configBytes));
          if (config?.format !== 'fitila-byt5-mobile/1' || config?.tokenizer !== 'byt5-bytes-plus-3') {
            throw new Error('Configuration du paquet ByT5 invalide.');
          }
          prefixFrBa = config.prefix_fr_ba ?? prefixFrBa;
          prefixBaFr = config.prefix_ba_fr ?? prefixBaFr;
        }
        const memory = new Map<string, string>();
        const memoryBytes = files.get('approved_memory.json');
        if (memoryBytes) {
          const root = JSON.parse(new TextDecoder('utf-8').decode(memoryBytes));
          if (root?.format === 'fitila-approved-memory/1' && Array.isArray(root.entries)) {
            for (const entry of root.entries) {
              memory.set(`${entry.direction}\u0000${normalize(entry.source)}`, normalize(entry.target));
            }
          }
        }
        const ort = await loadOrt();
        const [encoder, decoder] = await Promise.all([
          ort.InferenceSession.create(encoderBytes, { executionProviders: ['wasm'] }),
          ort.InferenceSession.create(decoderBytes, { executionProviders: ['wasm'] }),
        ]);
        if (!['input_ids', 'attention_mask'].every((n) => encoder.inputNames.includes(n))) {
          throw new Error('Encodeur ByT5 : entrées inattendues.');
        }
        if (!['decoder_input_ids', 'encoder_hidden_states', 'encoder_attention_mask'].every((n) => decoder.inputNames.includes(n))) {
          throw new Error('Décodeur ByT5 : entrées inattendues.');
        }
        return { session: { manifest, config: {}, memory, encoderBytes, decoderBytes }, prefixFrBa, prefixBaFr, encoder, decoder };
      } catch (error) {
        console.warn('[offlineByt5] Chargement du paquet impossible :', error);
        return null;
      }
    })();
    // Un échec (paquet absent, corrompu, ou hors ligne) doit pouvoir être
    // retenté à la prochaine traduction, pas rester figé pour la session.
    sessionPromise.then((value) => {
      if (!value) sessionPromise = null;
    });
  }
  return sessionPromise;
}

// --- Décodage (beam search), identique à OfflineByt5.kt ---------------------

interface Beam {
  ids: bigint[];
  logScore: number;
  finished: boolean;
}

function logSumExp(values: ArrayLike<number>, start: number, length: number): number {
  let max = -Infinity;
  for (let i = 0; i < length; i++) max = Math.max(max, values[start + i]);
  let sum = 0;
  for (let i = 0; i < length; i++) sum += Math.exp(values[start + i] - max);
  return max + Math.log(sum);
}

async function runInference(
  s: Byt5Session,
  sourceWithPrefix: string,
  maxOutput: number,
  beamWidth: number,
): Promise<string> {
  const ort = await loadOrt();
  const sourceBytes = new TextEncoder().encode(sourceWithPrefix).subarray(0, 511);
  const inputIds = new BigInt64Array(sourceBytes.length + 1);
  for (let i = 0; i < sourceBytes.length; i++) inputIds[i] = BigInt(sourceBytes[i]) + 3n;
  inputIds[sourceBytes.length] = EOS_ID;
  const attentionMask = new BigInt64Array(inputIds.length).fill(1n);

  const encoderOut = await s.encoder.run({
    input_ids: new ort.Tensor('int64', inputIds, [1, inputIds.length]),
    attention_mask: new ort.Tensor('int64', attentionMask, [1, attentionMask.length]),
  });
  const encoderHidden = encoderOut[s.encoder.outputNames[0]];

  let beams: Beam[] = [{ ids: [0n], logScore: 0, finished: false }];
  for (let step = 0; step < maxOutput; step++) {
    const candidates: Beam[] = [];
    for (const beam of beams) {
      if (beam.finished) {
        candidates.push(beam);
        continue;
      }
      const decoderIds = new ort.Tensor('int64', BigInt64Array.from(beam.ids), [1, beam.ids.length]);
      const decoderOut = await s.decoder.run({
        decoder_input_ids: decoderIds,
        encoder_hidden_states: encoderHidden,
        encoder_attention_mask: new ort.Tensor('int64', attentionMask, [1, attentionMask.length]),
      });
      const logits = decoderOut[s.decoder.outputNames[0]];
      const dims = logits.dims; // [1, seqLen, vocabSize]
      const vocabSize = dims[dims.length - 1];
      const seqLen = dims[dims.length - 2];
      const lastRowStart = (seqLen - 1) * vocabSize;
      const data = logits.data as Float32Array;
      const normalizer = logSumExp(data, lastRowStart, vocabSize);
      const top: number[] = [];
      // Top-`beamWidth` indices by raw logit (même critère que le Kotlin).
      const order = Array.from({ length: vocabSize }, (_, i) => i).sort((a, b) => data[lastRowStart + b] - data[lastRowStart + a]);
      for (let i = 0; i < beamWidth && i < order.length; i++) top.push(order[i]);
      for (const token of top) {
        candidates.push({
          ids: [...beam.ids, BigInt(token)],
          logScore: beam.logScore + (data[lastRowStart + token] - normalizer),
          finished: token === 1,
        });
      }
    }
    beams = candidates
      .sort((a, b) => b.logScore / Math.pow(Math.max(a.ids.length - 1, 1), 0.6) - a.logScore / Math.pow(Math.max(b.ids.length - 1, 1), 0.6))
      .slice(0, beamWidth);
    if (beams.every((b) => b.finished)) break;
  }
  return decodeIds(beams[0].ids);
}

function decodeIds(ids: bigint[]): string {
  const out: number[] = [];
  for (const id of ids) {
    if (id >= 3n && id <= 258n) out.push(Number(id - 3n));
  }
  return new TextDecoder('utf-8').decode(new Uint8Array(out)).trim();
}

/** Rejette une sortie vide, identique à l'entrée, ou en boucle — même règle que `OfflineByt5.checked`. */
function checked(source: string, raw: string): string | null {
  const out = normalize(raw);
  if (!out || out.toLowerCase() === source.toLowerCase()) return null;
  const words = out.split(' ');
  for (let size = 1; size <= 3; size++) {
    if (words.length < size * 4) continue;
    for (let start = 0; start <= words.length - size * 4; start++) {
      const unit = words.slice(start, start + size).join('\u0001');
      let loop = true;
      for (let k = 1; k <= 3; k++) {
        if (words.slice(start + k * size, start + (k + 1) * size).join('\u0001') !== unit) {
          loop = false;
          break;
        }
      }
      if (loop) return null;
    }
  }
  return out;
}

/**
 * Traduit hors connexion via le ByT5 embarqué, ou renvoie `null` si le
 * paquet n'est pas en cache, corrompu, ou si l'inférence échoue — jamais une
 * exception : l'appelant garde alors son propre message "hors connexion".
 */
export async function translateOfflineByt5(text: string, direction: Byt5Direction): Promise<string | null> {
  const source = normalize(text);
  if (!source) return null;
  try {
    const session = await loadSession();
    if (!session) return null;
    const memoryHit = session.session.memory.get(`${direction}\u0000${source}`);
    if (memoryHit) return memoryHit;
    const prefix = direction === 'fr-ba' ? session.prefixFrBa : session.prefixBaFr;
    const beamWidth = direction === 'fr-ba' ? 2 : 1;
    const raw = await runInference(session, prefix + source, 192, beamWidth);
    return checked(source, raw);
  } catch (error) {
    console.warn('[offlineByt5] Traduction hors ligne impossible :', error);
    return null;
  }
}
