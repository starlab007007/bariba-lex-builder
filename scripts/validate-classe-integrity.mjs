import fs from 'node:fs';
import path from 'node:path';
import { createServer } from 'vite';

const root = process.cwd();
const fail = (message) => { throw new Error(message); };

const vite = await createServer({
  root,
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
});

try {
  const keysModule = await vite.ssrLoadModule('/src/lib/classeContentKeys.ts');
  const items = keysModule.getAllContentItems();
  if (!Array.isArray(items)) fail('getAllContentItems() did not return an array');
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

  const dataModules = await Promise.all([
    '/src/data/classeContent.ts',
    '/src/data/classeContentN2.ts',
    '/src/data/classeContentN2Grammar.ts',
    '/src/data/classeContentN2TextProd.ts',
    '/src/data/classeContentN2Gestion.ts',
  ].map((modulePath) => vite.ssrLoadModule(modulePath)));

  const imageRefs = new Set();
  const visited = new WeakSet();
  const walk = (value, key = '') => {
    if (Array.isArray(value)) {
      if (key === 'images') {
        for (const img of value) if (typeof img === 'string' && img.startsWith('/classe/')) imageRefs.add(img);
      }
      for (const item of value) walk(item);
      return;
    }
    if (!value || typeof value !== 'object') return;
    if (visited.has(value)) return;
    visited.add(value);
    for (const [childKey, child] of Object.entries(value)) {
      if ((childKey === 'imageUrl' || childKey === 'image_url') && typeof child === 'string' && child.startsWith('/classe/')) {
        imageRefs.add(child);
      }
      walk(child, childKey);
    }
  };
  for (const module of dataModules) {
    for (const value of Object.values(module)) walk(value);
  }

  if (imageRefs.size < 44) fail(`Classe image registry unexpectedly shrank: ${imageRefs.size} < 44`);
  for (const ref of imageRefs) {
    const local = path.join(root, 'public', ref.replace(/^\/classe\//, 'classe/'));
    if (!fs.existsSync(local)) fail(`Missing referenced image: ${ref}`);
    if (fs.statSync(local).size <= 0) fail(`Empty referenced image: ${ref}`);
  }
  for (const required of ['/classe/img-p064.png', '/classe/img-p064-1.png']) {
    if (!imageRefs.has(required)) fail(`Missing page 64 pedagogical figure: ${required}`);
  }

  const contentModule = dataModules[0];
  const page64 = contentModule.CLASSE_LESSONS?.find((l) => l?.id === 23 && l?.page === 64);
  if (!page64) fail('N1 lesson 23/page 64 missing from canonical web data');
  const page64Images = Array.isArray(page64.images) ? page64.images : [];
  if (!page64Images.includes('/classe/img-p064.png') || !page64Images.includes('/classe/img-p064-1.png')) {
    fail('N1 lesson 23 must retain both page 64 pedagogical figures');
  }

  const webInput = fs.readFileSync(path.join(root, 'src/components/classe/BaribaSmartInput.tsx'), 'utf8');
  const webTextarea = fs.readFileSync(path.join(root, 'src/components/classe/BaribaSmartTextarea.tsx'), 'utf8');
  const answerKeys = fs.readFileSync(path.join(root, 'src/lib/answerKeys.ts'), 'utf8');
  if (!webInput.includes("'ə'") || !webTextarea.includes("'ə'")) fail('Web Bàátɔ̀nú keyboard lost schwa ə');
  if (!webInput.includes('keyboardUppercase') || !webTextarea.includes('keyboardUppercase')) fail('Web Bàátɔ̀nú keyboard lost uppercase mode');
  if (!webInput.includes('toUpperCase()') || !webTextarea.includes('toUpperCase()')) fail('Web Bàátɔ̀nú uppercase composition is missing');
  if (!webInput.includes('\\p{L}') || !webTextarea.includes('\\p{L}')) fail('Web input is no longer Unicode-letter aware');
  if (!answerKeys.includes('ƴə\\s')) fail('Web answer matching no longer preserves schwa ə');

  console.log(JSON.stringify({
    ok: true,
    canonicalContentItems: items.length,
    uniqueContentKeys: seen.size,
    referencedImages: imageRefs.size,
    page64Figures: page64Images,
  }, null, 2));
} finally {
  await vite.close();
}
