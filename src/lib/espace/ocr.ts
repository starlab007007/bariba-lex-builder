/**
 * Pipeline OCR Bàátɔ̀nú (côté navigateur) :
 *   1. Chargement  : image ou PDF (pdf.js) -> pages raster ; texte natif du PDF réutilisé s'il existe
 *   2. Prétraitement : niveaux de gris, étirement de contraste, redressement (deskew), redimensionnement
 *   3. Inférence   : edge function `espace-ocr` (modèle vision, prompt à alphabet Bàátɔ̀nú)
 *   4. Correction  : dictionnaire Bariba (rétablit ɛ ɔ ŋ, tons, nasales)
 */
import { correctWithLexicon, loadLexicon } from './baribaText';
import { runOcrRemote } from './api';

export const MAX_PAGES = 12;
export const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MAX_SIDE = 2000;

export type OcrPage = { page: number; preview: string; dataUrl: string; nativeText?: string };
export type OcrResult = {
  engine: string;
  text: string;
  confidence: number;
  pages: { page: number; text: string; confidence: number; notes: string[] }[];
  corrections: number;
};

function canvasOf(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

async function loadImage(file: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'async';
    await new Promise<void>((res, rej) => {
      img.onload = () => res();
      img.onerror = () => rej(new Error('Image illisible'));
      img.src = url;
    });
    return img;
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
}

/** Estime l'angle d'inclinaison (−6°…+6°) par profil de projection des pixels sombres. */
export function estimateSkew(gray: Uint8ClampedArray, w: number, h: number): number {
  const step = Math.max(1, Math.floor(Math.max(w, h) / 500));
  let best = 0;
  let bestScore = -1;
  for (let deg = -6; deg <= 6; deg += 0.5) {
    const t = Math.tan((deg * Math.PI) / 180);
    const rows = new Float32Array(Math.ceil(h / step) + Math.ceil(Math.abs(t) * w / step) + 2);
    const offset = Math.ceil(Math.abs(t) * w / step);
    for (let y = 0; y < h; y += step) {
      for (let x = 0; x < w; x += step) {
        if (gray[y * w + x] < 110) rows[Math.round((y - x * t) / step) + offset]++;
      }
    }
    let sum = 0;
    let sq = 0;
    for (const v of rows) {
      sum += v;
      sq += v * v;
    }
    const mean = sum / rows.length;
    const score = sq / rows.length - mean * mean;
    if (score > bestScore) {
      bestScore = score;
      best = deg;
    }
  }
  return best;
}

/** Étape 2 du pipeline. Retourne un JPEG (data URL) prêt pour l'inférence. */
export function preprocess(source: CanvasImageSource, width: number, height: number): string {
  const scale = Math.min(1, MAX_SIDE / Math.max(width, height));
  const c = canvasOf(width * scale, height * scale);
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(source, 0, 0, c.width, c.height);

  const img = ctx.getImageData(0, 0, c.width, c.height);
  const px = img.data;
  const gray = new Uint8ClampedArray(c.width * c.height);
  const hist = new Uint32Array(256);
  for (let i = 0, j = 0; i < px.length; i += 4, j++) {
    const g = (px[i] * 299 + px[i + 1] * 587 + px[i + 2] * 114) / 1000;
    gray[j] = g;
    hist[g | 0]++;
  }
  // Étirement de contraste entre les percentiles 1 % et 99 %.
  const total = gray.length;
  let acc = 0;
  let lo = 0;
  let hi = 255;
  for (let v = 0; v < 256; v++) {
    acc += hist[v];
    if (acc >= total * 0.01) {
      lo = v;
      break;
    }
  }
  acc = 0;
  for (let v = 255; v >= 0; v--) {
    acc += hist[v];
    if (acc >= total * 0.01) {
      hi = v;
      break;
    }
  }
  const span = Math.max(24, hi - lo);
  for (let j = 0; j < gray.length; j++) gray[j] = Math.max(0, Math.min(255, ((gray[j] - lo) * 255) / span));

  const angle = estimateSkew(gray, c.width, c.height);
  for (let i = 0, j = 0; j < gray.length; i += 4, j++) px[i] = px[i + 1] = px[i + 2] = gray[j];
  ctx.putImageData(img, 0, 0);

  if (Math.abs(angle) >= 0.5) {
    const r = canvasOf(c.width, c.height);
    const rctx = r.getContext('2d')!;
    rctx.fillStyle = '#fff';
    rctx.fillRect(0, 0, r.width, r.height);
    rctx.translate(r.width / 2, r.height / 2);
    rctx.rotate((-angle * Math.PI) / 180);
    rctx.drawImage(c, -c.width / 2, -c.height / 2);
    return r.toDataURL('image/jpeg', 0.9);
  }
  return c.toDataURL('image/jpeg', 0.9);
}

async function pdfjs() {
  const lib = await import('pdfjs-dist');
  const worker = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
  lib.GlobalWorkerOptions.workerSrc = worker;
  return lib;
}

/** Étape 1 : fichier -> pages prétraitées. */
export async function filePages(file: File, onProgress?: (done: number, total: number) => void): Promise<OcrPage[]> {
  if (file.size > MAX_FILE_BYTES) throw new Error('Fichier trop volumineux (25 Mo maximum)');
  const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
  if (!isPdf) {
    if (!/^image\/(png|jpe?g|webp)$/i.test(file.type)) throw new Error('Formats acceptés : PDF, PNG, JPEG, WebP');
    const img = await loadImage(file);
    const dataUrl = preprocess(img, img.naturalWidth, img.naturalHeight);
    onProgress?.(1, 1);
    return [{ page: 1, preview: dataUrl, dataUrl }];
  }
  const lib = await pdfjs();
  const pdf = await lib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  if (pdf.numPages > MAX_PAGES) throw new Error(`PDF trop long : ${MAX_PAGES} pages maximum par numérisation (${pdf.numPages} détectées)`);
  const pages: OcrPage[] = [];
  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n);
    const content = await page.getTextContent();
    const nativeText = content.items.map((it) => ('str' in it ? it.str + ('hasEOL' in it && it.hasEOL ? '\n' : ' ') : '')).join('').replace(/[ \t]+\n/g, '\n').trim();
    const base = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: Math.min(3, MAX_SIDE / Math.max(base.width, base.height)) });
    const canvas = canvasOf(viewport.width, viewport.height);
    await page.render({ canvasContext: canvas.getContext('2d')!, viewport, canvas }).promise;
    const dataUrl = preprocess(canvas, canvas.width, canvas.height);
    pages.push({ page: n, preview: dataUrl, dataUrl, nativeText: nativeText.length > 40 ? nativeText : undefined });
    onProgress?.(n, pdf.numPages);
  }
  return pages;
}

/** Étapes 3 + 4 : inférence puis correction par dictionnaire. Les pages PDF à texte natif court-circuitent l'IA. */
export async function recognize(pages: OcrPage[], mode: 'printed' | 'handwritten', onProgress?: (done: number, total: number) => void): Promise<OcrResult> {
  const results: OcrResult['pages'] = [];
  let engine = 'pdf-text';
  const need = pages.filter((p) => !p.nativeText);
  for (const p of pages) if (p.nativeText) results.push({ page: p.page, text: p.nativeText.normalize('NFC'), confidence: 0.99, notes: ['Texte natif du PDF'] });
  // Lots de 3 pages : reste sous la limite de charge de la fonction et donne une progression fluide.
  for (let i = 0; i < need.length; i += 3) {
    const batch = need.slice(i, i + 3);
    const out = await runOcrRemote(batch.map((b) => b.dataUrl), mode);
    engine = out.engine;
    out.pages.forEach((r, k) => results.push({ ...r, page: batch[k].page }));
    onProgress?.(Math.min(i + 3, need.length), need.length);
  }
  results.sort((a, b) => a.page - b.page);
  const lex = await loadLexicon();
  let corrections = 0;
  const corrected = results.map((r) => {
    if (!lex || r.notes.includes('Texte natif du PDF')) return r;
    const fixed = correctWithLexicon(r.text, lex);
    corrections += fixed.corrections;
    return { ...r, text: fixed.text };
  });
  const text = corrected.map((r) => r.text).filter(Boolean).join('\n\n');
  const confidence = corrected.length ? corrected.reduce((a, r) => a + r.confidence, 0) / corrected.length : 0;
  return { engine, text, confidence, pages: corrected, corrections };
}
