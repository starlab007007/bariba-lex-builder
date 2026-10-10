import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const readJson = (p) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
const fail = (message) => { throw new Error(message); };

const voicePath = 'fitila_flutter/assets/data/classeVoiceContent.json';
const voice = readJson(voicePath);
const items = Array.isArray(voice.items) ? voice.items : [];
if (items.length < 2296) fail(`Classe registry unexpectedly shrank: ${items.length} < 2296`);

const allowedLevels = new Set(['N1', 'N2']);
const allowedModules = new Set(['lang', 'calcul', 'eval', 'alphabet', 'grammaire', 'gestion', 'textprod']);
const allowedTypes = new Set(['text', 'question', 'phonetic', 'word', 'exercise', 'instruction', 'title', 'answer']);
const seen = new Set();

for (const [index, item] of items.entries()) {
  const key = String(item.content_key ?? '');
  const text = String(item.content_text ?? '');
  const level = String(item.level ?? '');
  const module = String(item.module ?? '');
  const type = String(item.content_type ?? '');

  if (!key) fail(`Empty content_key at item ${index}`);
  if (seen.has(key)) fail(`Duplicate content_key: ${key}`);
  seen.add(key);
  if (!text.trim()) fail(`Empty content_text: ${key}`);
  if (!allowedLevels.has(level)) fail(`Invalid level ${level}: ${key}`);
  if (!allowedModules.has(module)) fail(`Invalid module ${module}: ${key}`);
  if (!allowedTypes.has(type)) fail(`Invalid content_type ${type}: ${key}`);
  if (!key.startsWith(`classe/${level}/${module}/`)) {
    fail(`Key scope mismatch: ${key} != ${level}/${module}`);
  }
  if (text.includes('\uFFFD') || /(?:Ã.|Â.|â€|ðŸ)/.test(text)) {
    fail(`Likely UTF-8 corruption in ${key}`);
  }
}

const imageDataFiles = [
  'fitila_flutter/assets/data/classe_web_parity.json',
  'fitila_flutter/assets/data/classe_content.json',
  'fitila_flutter/assets/data/classeContentN2.json',
  'fitila_flutter/assets/data/classeContentN2Grammar.json',
  'fitila_flutter/assets/data/classeContentN2TextProd.json',
  'fitila_flutter/assets/data/classeContentN2Gestion.json',
];

const imageRefs = new Set();
const walk = (value) => {
  if (Array.isArray(value)) {
    for (const item of value) walk(item);
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if ((key === 'imageUrl' || key === 'image_url') && typeof child === 'string' && child.startsWith('/classe/')) {
      imageRefs.add(child);
    }
    if (key === 'images' && Array.isArray(child)) {
      for (const img of child) if (typeof img === 'string' && img.startsWith('/classe/')) imageRefs.add(img);
    }
    walk(child);
  }
};
for (const file of imageDataFiles) walk(readJson(file));

if (imageRefs.size < 44) fail(`Classe image registry unexpectedly shrank: ${imageRefs.size} < 44`);
for (const ref of imageRefs) {
  const local = path.join(root, 'public', ref.replace(/^\/classe\//, 'classe/'));
  if (!fs.existsSync(local)) fail(`Missing referenced image: ${ref}`);
  if (fs.statSync(local).size <= 0) fail(`Empty referenced image: ${ref}`);
}
for (const required of ['/classe/img-p064.png', '/classe/img-p064-1.png']) {
  if (!imageRefs.has(required)) fail(`Missing page 64 pedagogical figure: ${required}`);
}

const parity = readJson('fitila_flutter/assets/data/classe_web_parity.json');
const page64 = (parity.lessons ?? []).find((l) => l?.level === 'N1' && l?.id === 23);
if (!page64) fail('N1 lesson 23/page 64 missing from parity data');
const page64Images = Array.isArray(page64.images) ? page64.images : [];
if (!page64Images.includes('/classe/img-p064.png') || !page64Images.includes('/classe/img-p064-1.png')) {
  fail('N1 lesson 23 must retain both page 64 pedagogical figures');
}

const webInput = fs.readFileSync(path.join(root, 'src/components/classe/BaribaSmartInput.tsx'), 'utf8');
const webTextarea = fs.readFileSync(path.join(root, 'src/components/classe/BaribaSmartTextarea.tsx'), 'utf8');
const answerKeys = fs.readFileSync(path.join(root, 'src/lib/answerKeys.ts'), 'utf8');
if (!webInput.includes("'ə'") || !webTextarea.includes("'ə'")) fail('Web Bàátɔ̀nú keyboard lost schwa ə');
if (!webInput.includes('\\p{L}') || !webTextarea.includes('\\p{L}')) fail('Web input is no longer Unicode-letter aware');
if (!answerKeys.includes('ƴə\\s')) fail('Web answer matching no longer preserves schwa ə');

console.log(JSON.stringify({
  ok: true,
  canonicalContentItems: items.length,
  uniqueContentKeys: seen.size,
  referencedImages: imageRefs.size,
  page64Figures: page64Images,
}, null, 2));
