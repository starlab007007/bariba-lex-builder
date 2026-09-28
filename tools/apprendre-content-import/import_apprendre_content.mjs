#!/usr/bin/env node
// Importe src/data/apprendre_v2.json ('core') et src/data/scenes_v2.json
// ('scenes') dans la table Supabase `apprendre_module_content`
// (migration supabase/migrations/20260928090000_apprendre_module_content.sql).
//
// Écrit via la clé service_role (contourne la RLS : pas besoin d'être
// connecté comme admin). Hash, comptage et journal d'audit sont calculés
// par les triggers de la base : ce script n'envoie que le contenu.
//
// En temps normal ce script n'est pas nécessaire : le workflow
// .github/workflows/apprendre-content-supabase.yml fait l'import à chaque
// push sur main qui modifie ces fichiers. Il sert pour un autre projet
// Supabase, ou si tu préfères le faire à la main.
//
// Usage (depuis ce dossier) :
//   npm install
//   SUPABASE_URL=https://xxxx.supabase.co \
//   SUPABASE_SERVICE_ROLE_KEY=eyJ... \
//   npm run import
//
// Clé service_role : Supabase Dashboard → Project Settings → API.
// À garder secrète : jamais dans un fichier committé ni côté client.

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const VERSION = process.env.APPRENDRE_CONTENT_VERSION ?? 'v2.4-build19-20260927';

const BLOCKS = [
  { id: 'core', file: 'src/data/apprendre_v2.json', key: 'cards' },
  { id: 'scenes', file: 'src/data/scenes_v2.json', key: 'scenes' },
];

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Définis SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY (Dashboard Supabase → Project Settings → API).");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function importBlock({ id, file, key }) {
  const content = JSON.parse(readFileSync(join(ROOT, file), 'utf-8'));
  const expected = Array.isArray(content[key]) ? content[key].length : 0;
  if (expected === 0) throw new Error(`${file} : "${key}" absent ou vide`);

  const { error } = await supabase
    .from('apprendre_module_content')
    .upsert({ id, content, content_version: VERSION });
  if (error) throw new Error(`${id} : ${error.message}`);

  const { data, error: readError } = await supabase
    .from('apprendre_module_content_status')
    .select('id, content_version, content_hash, item_count')
    .eq('id', id)
    .single();
  if (readError) throw new Error(`${id} (relecture) : ${readError.message}`);
  if (data.item_count !== expected) {
    throw new Error(`${id} : ${data.item_count} éléments en base, ${expected} attendus`);
  }
  console.log(`OK  ${id} — ${data.item_count} éléments, ${data.content_version}, hash ${data.content_hash.slice(0, 12)}…`);
}

try {
  console.log(`Import vers ${SUPABASE_URL} (version ${VERSION})`);
  for (const block of BLOCKS) await importBlock(block);
  console.log('Terminé : core = 1847 mots, scenes = 44 scènes attendus.');
} catch (e) {
  console.error('ÉCHEC', e.message);
  process.exit(1);
}
