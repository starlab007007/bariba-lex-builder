// Rejoue la migration 20260928090000_apprendre_module_content.sql et
// l'import du contenu dans un vrai PostgreSQL (PGlite) avec un schéma
// minimal imitant Supabase, puis vérifie droits, idempotence et intégrité.
//
//   npm install && npm test
//
// Chaque ligne commence par OK ou FAIL ; code de sortie 1 en cas d'échec.

import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { isDeepStrictEqual } from 'node:util';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const MIGRATION = join(ROOT, 'supabase/migrations/20260928090000_apprendre_module_content.sql');

let failed = 0;
const ok = (m) => console.log('OK  ', m);
const bad = (m) => { console.log('FAIL', m); failed++; };
const check = (cond, m) => (cond ? ok(m) : bad(m));

const U = {
  admin: '00000000-0000-0000-0000-00000000000a',
  learner: '00000000-0000-0000-0000-00000000000d',
};

const db = new PGlite();

// Schéma minimal Supabase : rôles API, auth.uid(), app_role, has_role.
await db.exec(`
  CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN;
  CREATE SCHEMA auth;
  CREATE TABLE auth.users (id uuid PRIMARY KEY, email text);
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
    $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  CREATE TYPE public.app_role AS ENUM ('admin', 'user', 'editor', 'teacher');
  CREATE TABLE public.user_roles (id serial PRIMARY KEY, user_id uuid REFERENCES auth.users(id), role app_role NOT NULL);
  CREATE FUNCTION public.has_role(_user_id uuid, _role app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS
    $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;
  GRANT USAGE ON SCHEMA public, auth TO anon, authenticated;
  GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated;
  -- Supabase accorde par défaut les tables publiques aux rôles API ; la RLS décide.
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon, authenticated;
`);
await db.query(`INSERT INTO auth.users VALUES ($1, 'admin@x'), ($2, 'learner@x')`, [U.admin, U.learner]);
await db.query(`INSERT INTO public.user_roles (user_id, role) VALUES ($1, 'admin')`, [U.admin]);

async function as(user, sql, params = []) {
  await db.exec('BEGIN');
  try {
    await db.exec(`SET LOCAL ROLE ${user ? 'authenticated' : 'anon'}`);
    await db.query(`SELECT set_config('request.jwt.claim.sub', $1, true)`, [user ? U[user] : '']);
    const res = await db.query(sql, params);
    await db.exec('COMMIT');
    return { rows: res.rows, affected: res.affectedRows };
  } catch (e) {
    await db.exec('ROLLBACK');
    return { error: e.message };
  }
}

// 1. Migration, deux fois (idempotence).
const migration = readFileSync(MIGRATION, 'utf8');
for (const pass of [1, 2]) {
  try { await db.exec(migration); ok(`migration appliquée (passage ${pass})`); }
  catch (e) { bad(`migration passage ${pass} : ${e.message}`); process.exit(1); }
}

// 2. Import tel que le fait le workflow (SQL généré), deux fois.
const sqlFor = (block) => execFileSync('python3', [join(HERE, 'build_import_sql.py'), block], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
for (const pass of [1, 2]) {
  for (const block of ['core', 'scenes']) {
    try { await db.exec(sqlFor(block)); ok(`import ${block} (passage ${pass})`); }
    catch (e) { bad(`import ${block} passage ${pass} : ${e.message}`); }
  }
}

// 3. Intégrité du contenu.
const source = {
  core: JSON.parse(readFileSync(join(ROOT, 'src/data/apprendre_v2.json'), 'utf8')),
  scenes: JSON.parse(readFileSync(join(ROOT, 'src/data/scenes_v2.json'), 'utf8')),
};
const rows = (await db.query(`SELECT id, content, content_version, content_hash, item_count FROM public.apprendre_module_content ORDER BY id`)).rows;
const byId = Object.fromEntries(rows.map((r) => [r.id, r]));
check(rows.length === 2, 'exactement deux lignes (core, scenes)');
check(byId.core?.item_count === 1847, `core : 1847 mots (${byId.core?.item_count})`);
check(byId.scenes?.item_count === 44, `scenes : 44 scènes (${byId.scenes?.item_count})`);
check(isDeepStrictEqual(byId.core?.content, source.core), 'core : contenu identique au JSON source');
check(isDeepStrictEqual(byId.scenes?.content, source.scenes), 'scenes : contenu identique au JSON source');
check(rows.every((r) => r.content_version === 'v2.4-build19-20260927'), 'version v2.4-build19-20260927');
const recomputed = (await db.query(`SELECT id, encode(sha256(convert_to(content::text,'UTF8')),'hex') AS h FROM public.apprendre_module_content`)).rows;
check(recomputed.every((r) => /^[0-9a-f]{64}$/.test(r.h) && r.h === byId[r.id].content_hash), 'hash sha256 calculé par la base et cohérent');
const audit = (await db.query(`SELECT count(*)::int AS n FROM public.apprendre_content_audit`)).rows[0].n;
check(audit === 4, `journal : une entrée par import (${audit}/4)`);

// 4. Lecture publique (ce que fait le web).
const anonRead = await as(null, `SELECT id, content_version FROM public.apprendre_module_content WHERE id IN ('core','scenes')`);
check(anonRead.rows?.length === 2, 'anonyme : lit le contenu (chargeur web)');
const anonView = await as(null, `SELECT id, item_count FROM public.apprendre_module_content_status`);
check(anonView.rows?.length === 2, 'anonyme : lit la vue de statut');
const anonAudit = await as(null, `SELECT * FROM public.apprendre_content_audit`);
check(!!anonAudit.error || anonAudit.rows.length === 0, 'anonyme : ne lit pas le journal');

// 5. Écritures refusées hors admin.
const anonWrite = await as(null, `UPDATE public.apprendre_module_content SET content_version = 'pirate'`);
check(!!anonWrite.error || anonWrite.affected === 0, 'anonyme : ne modifie rien');
const learnerWrite = await as('learner', `UPDATE public.apprendre_module_content SET content_version = 'pirate'`);
check(!!learnerWrite.error || learnerWrite.affected === 0, 'apprenant : ne modifie rien');
const learnerInsert = await as('learner', `DELETE FROM public.apprendre_module_content`);
check(!!learnerInsert.error || learnerInsert.affected === 0, 'apprenant : ne supprime rien');
const anonRpc = await as(null, `SELECT public.apprendre_import_content('core', '{"cards":[1]}'::jsonb, 'x')`);
check(!!anonRpc.error, `anonyme : fonction d'import refusée (${anonRpc.error?.slice(0, 40)})`);
const learnerRpc = await as('learner', `SELECT public.apprendre_import_content('core', '{"cards":[1]}'::jsonb, 'x')`);
check(/administrateurs/.test(learnerRpc.error ?? ''), 'apprenant : fonction d\'import refusée (non admin)');
const stillThere = (await db.query(`SELECT content_version FROM public.apprendre_module_content WHERE id='core'`)).rows[0];
check(stillThere.content_version === 'v2.4-build19-20260927', 'contenu intact après les tentatives refusées');

// 6. Import par l'admin via la fonction (panneau ApContentImportPanel).
const scenesJson = readFileSync(join(ROOT, 'src/data/scenes_v2.json'), 'utf8');
const adminRpc = await as('admin', `SELECT public.apprendre_import_content('scenes', $1::jsonb, 'v2.4-build19-20260927') AS r`, [scenesJson]);
check(adminRpc.rows?.[0]?.r?.item_count === 44, `admin : import via la fonction (${adminRpc.error ?? adminRpc.rows?.[0]?.r?.item_count + ' scènes'})`);
check(adminRpc.rows?.[0]?.r?.hash === byId.scenes.content_hash, 'admin : même hash que l\'import SQL (contenu identique)');
const lastAudit = (await db.query(`SELECT actor FROM public.apprendre_content_audit ORDER BY id DESC LIMIT 1`)).rows[0];
check(lastAudit.actor === U.admin, 'journal : auteur = admin connecté');
const adminAudit = await as('admin', `SELECT count(*)::int AS n FROM public.apprendre_content_audit`);
check(adminAudit.rows?.[0]?.n === 5, 'admin : lit le journal');
const learnerAudit = await as('learner', `SELECT count(*)::int AS n FROM public.apprendre_content_audit`);
check(learnerAudit.rows?.[0]?.n === 0, 'apprenant : ne lit pas le journal');

console.log(failed ? `\n${failed} échec(s)` : '\nTOUT EST OK');
process.exit(failed ? 1 : 0);
