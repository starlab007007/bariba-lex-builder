#!/usr/bin/env node
/**
 * Build a compact dictionary asset for the native Android IME.
 * Reads ONLY from the existing embedded Bariba dictionary
 * (`src/data/raw-dictionary.json`) and generates:
 *   - entries:  { ba, fr, freq }
 *   - phrases:  { ba, fr } aligned from example_bariba/example_francais
 *   - bigrams:  { word -> top 3 next words } (from dictionary phrases ONLY)
 *
 * Output is written to all native asset mirror locations.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src/data/raw-dictionary.json');
const TARGETS = [
  'android/app/src/main/assets/bariba_dictionary.json',
  'android-native/assets/bariba_dictionary.json',
  'bariba-lex-builder/android/app/src/main/assets/bariba_dictionary.json',
  'bariba-lex-builder/android-native/assets/bariba_dictionary.json',
];

const raw = JSON.parse(fs.readFileSync(SRC, 'utf8'));

const nfc = (s) => (s || '').normalize('NFC').trim();
const splitSentences = (s) =>
  nfc(s)
    .split(/(?<=[.!?])\s+/)
    .map((x) => x.trim())
    .filter((x) => x.length > 1);
const tokenize = (s) =>
  nfc(s)
    .toLowerCase()
    .split(/[^\p{L}\u0300-\u036f]+/u)
    .filter((t) => t.length >= 2);

// --- Entries: word -> short french def ---
const entryMap = new Map();
for (const e of raw) {
  const ba = nfc(e.word);
  if (!ba || ba.length < 2) continue;
  const fr = nfc((e.definition || '').split(/[.;]/)[0]).slice(0, 60);
  if (!fr) continue;
  const cur = entryMap.get(ba);
  if (!cur) entryMap.set(ba, { ba, fr, freq: 1 });
  else cur.freq += 1;
}

// --- Phrases aligned from examples + bigram index ---
const phrases = [];
const bigramCount = new Map(); // "prev|next" -> count
const wordFreq = new Map();

for (const e of raw) {
  const ba = splitSentences(e.example_bariba);
  const fr = splitSentences(e.example_francais);
  const n = Math.min(ba.length, fr.length);
  for (let i = 0; i < n; i++) {
    if (ba[i].length < 4 || fr[i].length < 4) continue;
    if (phrases.length < 200) phrases.push({ ba: ba[i], fr: fr[i] });
    const toks = tokenize(ba[i]);
    for (let j = 0; j < toks.length; j++) {
      wordFreq.set(toks[j], (wordFreq.get(toks[j]) || 0) + 1);
      if (j + 1 < toks.length) {
        const k = `${toks[j]}|${toks[j + 1]}`;
        bigramCount.set(k, (bigramCount.get(k) || 0) + 1);
      }
    }
  }
}

// Boost entry freq using corpus token frequency
for (const e of entryMap.values()) {
  const f = wordFreq.get(e.ba.toLowerCase()) || 0;
  e.freq = Math.max(e.freq, f);
}

// Build top-3 bigram successors per word
const successors = new Map();
for (const [k, c] of bigramCount.entries()) {
  const [prev, next] = k.split('|');
  const arr = successors.get(prev) || [];
  arr.push({ next, c });
  successors.set(prev, arr);
}
const bigrams = {};
for (const [prev, arr] of successors.entries()) {
  arr.sort((a, b) => b.c - a.c);
  bigrams[prev] = arr.slice(0, 3).map((x) => x.next);
}

const entries = Array.from(entryMap.values())
  .sort((a, b) => b.freq - a.freq)
  .slice(0, 6000);

const out = {
  version: 1,
  generatedAt: new Date().toISOString(),
  entries,
  phrases: phrases.slice(0, 80),
  bigrams,
};
const json = JSON.stringify(out);

for (const rel of TARGETS) {
  const abs = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, json);
  console.log('wrote', rel, `(${(json.length / 1024).toFixed(1)} KB)`);
}
console.log(
  `entries=${entries.length} phrases=${out.phrases.length} bigrams=${Object.keys(bigrams).length}`,
);