import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';
const M = new URL('../../../../supabase/migrations/', import.meta.url).pathname;
const db = new PGlite();
const ok = (m) => console.log('OK  ', m); const bad = (m) => { console.log('FAIL', m); process.exitCode = 1; };
await db.exec(fs.readFileSync(new URL('./supabase_stub.sql', import.meta.url), 'utf8'));
for (const f of ['20260927100000_apprendre_voice_roles.sql', '20260927100100_apprendre_voice_studio.sql']) {
  try { await db.exec('BEGIN;' + fs.readFileSync(M + f, 'utf8') + ';COMMIT;'); ok('migration ' + f); }
  catch (e) { bad('migration ' + f + ' : ' + e.message); await db.exec('ROLLBACK'); process.exit(1); }
}
// Supabase accorde les tables publiques aux rôles API ; on reproduit ce comportement.
await db.exec(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated; GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;`);
const U = { admin: '00000000-0000-0000-0000-00000000000a', spk: '00000000-0000-0000-0000-00000000000b', rev: '00000000-0000-0000-0000-00000000000c', learner: '00000000-0000-0000-0000-00000000000d' };
for (const [k, v] of Object.entries(U)) await db.query('INSERT INTO auth.users VALUES ($1,$2)', [v, k + '@x']);
await db.exec(`INSERT INTO user_roles (user_id, role) VALUES ('${U.admin}','admin'),('${U.spk}','voice_speaker'),('${U.rev}','voice_reviewer')`);
async function as(user, sql, params = []) {
  await db.exec('BEGIN');
  try {
    await db.exec(`SET LOCAL ROLE ${user ? 'authenticated' : 'anon'}`);
    await db.query(`SELECT set_config('request.jwt.claim.sub', $1, true)`, [user ? U[user] : '']);
    const r = await db.query(sql, params); await db.exec('COMMIT'); return r;
  } catch (e) { await db.exec('ROLLBACK'); throw e; }
}
async function expectErr(label, user, sql, params, frag) {
  try { await as(user, sql, params); bad(label + ' (aucune erreur)'); } catch (e) { (e.message.includes(frag) ? ok : bad)(label + ' → ' + e.message); }
}
const items = JSON.stringify([{ key: 'ap:mot:BA-04737', kind: 'mot', ba: 'nim', fr: 'eau', hash: 'h1', page: '183', ref: 'BA-04737', pack: 'theme:nourriture', priority: '2' },
                              { key: 'ap:mot:BA-05280', kind: 'mot', ba: 'kpee', fr: 'sauce', hash: 'h2', page: '203', ref: 'BA-05280', pack: 'theme:nourriture', priority: '2' }]);
await expectErr('apprenant ne peut pas importer le catalogue', 'learner', 'SELECT apprendre_import_catalog($1::jsonb, $2, true)', [items, 'v1'], 'administration');
let r = await as('admin', 'SELECT apprendre_import_catalog($1::jsonb, $2, true) AS r', [items, 'v1']); ok('import catalogue ' + JSON.stringify(r.rows[0].r));
await expectErr('locuteur sans consentement ne peut pas enregistrer', 'spk', `INSERT INTO apprendre_audio_takes (audio_key,text_hash,speaker_id,voice,storage_path,quality_score) VALUES ('ap:mot:BA-04737','h1',$1,'femme','x/1.wav',80)`, [U.spk], 'row-level security');
await as('spk', `SELECT apprendre_sign_consent('Gnon', true, false, 'femme', 'nikki')`); ok('consentement signé');
r = await as('spk', `INSERT INTO apprendre_audio_takes (audio_key,text_hash,speaker_id,voice,storage_path,quality_score,duration_ms) VALUES ('ap:mot:BA-04737','h1',$1,'femme',$2,82,900) RETURNING id, version`, [U.spk, U.spk + '/ap_mot_BA-04737/1.wav']);
const take = r.rows[0].id; ok('prise brouillon créée, version ' + r.rows[0].version);
await expectErr('apprenant ne peut pas créer de prise', 'learner', `INSERT INTO apprendre_audio_takes (audio_key,text_hash,speaker_id,voice,storage_path) VALUES ('ap:mot:BA-04737','h1',$1,'femme','y.wav')`, [U.learner], 'row-level security');
r = await as('rev', `SELECT count(*)::int n FROM apprendre_audio_takes`); (r.rows[0].n === 0 ? ok : bad)('validateur ne voit pas les brouillons (' + r.rows[0].n + ')');
await as('spk', `SELECT apprendre_submit_take($1)`, [take]); ok('prise soumise');
await expectErr('locuteur ne valide pas sa propre prise', 'spk', `SELECT apprendre_review_take($1,'approve',5,5,5,5,NULL,true,NULL)`, [take], 'Validateur voix requis');
await as('admin', `INSERT INTO user_roles (user_id, role) VALUES ($1,'voice_reviewer')`, [U.spk]);
await expectErr('même avec le rôle validateur, pas sa propre prise', 'spk', `SELECT apprendre_review_take($1,'approve',5,5,5,5,NULL,true,NULL)`, [take], 'propre prise');
await expectErr('rejet sans motif refusé', 'rev', `SELECT apprendre_review_take($1,'reject',2,2,2,2,NULL,false,NULL)`, [take], 'motif');
r = await as('rev', `SELECT apprendre_review_take($1,'approve',5,4,5,5,NULL,true,'Bonne prise') AS s`, [take]); (r.rows[0].s === 'approved' ? ok : bad)('validation par un tiers → ' + r.rows[0].s);
r = await as('learner', `SELECT count(*)::int n FROM apprendre_audio_published`); (r.rows[0].n === 0 ? ok : bad)('approuvée mais pas encore audible (' + r.rows[0].n + ')');
await expectErr('validateur ne peut pas activer', 'rev', `SELECT apprendre_activate_take($1, true)`, [take], 'administration');
await as('admin', `SELECT apprendre_activate_take($1, true)`, [take]); ok('activation par l\'admin');
r = await as(null, `SELECT audio_key, voice, speaker_name FROM apprendre_audio_published`); (r.rows.length === 1 ? ok : bad)('visiteur anonyme voit l\'audio actif ' + JSON.stringify(r.rows));
r = await as(null, `SELECT count(*)::int n FROM apprendre_audio_takes`); (r.rows[0].n === 0 ? ok : bad)('anonyme ne lit pas la table des prises (' + r.rows[0].n + ')');
await db.exec(`INSERT INTO storage.objects (bucket_id, name) VALUES ('apprendre-audio', '${U.spk}/ap_mot_BA-04737/1.wav'), ('apprendre-audio', '${U.spk}/ap_mot_BA-05280/9.wav')`);
r = await as(null, `SELECT name FROM storage.objects`); (r.rows.length === 1 ? ok : bad)('anonyme lit seulement le fichier actif (' + r.rows.length + ')');
r = await as('admin', `SELECT apprendre_audio_stats() s`); ok('statistiques ' + JSON.stringify({ items: r.rows[0].s.items, covered: r.rows[0].s.covered, by_status: r.rows[0].s.by_status }));
const items2 = JSON.stringify([{ key: 'ap:mot:BA-04737', kind: 'mot', ba: 'nìm', fr: 'eau', hash: 'h1b', page: '183', ref: 'BA-04737', pack: 'theme:nourriture', priority: '2' }]);
await as('admin', 'SELECT apprendre_import_catalog($1::jsonb, $2, true)', [items2, 'v2']);
r = await as('learner', `SELECT count(*)::int n FROM apprendre_audio_published`); (r.rows[0].n === 0 ? ok : bad)('texte corrigé → audio retiré automatiquement (' + r.rows[0].n + ')');
r = await as('admin', `SELECT is_active, (SELECT in_content FROM apprendre_audio_items WHERE audio_key='ap:mot:BA-05280') retired FROM apprendre_audio_takes WHERE id=$1`, [take]);
(r.rows[0].is_active === false && r.rows[0].retired === false ? ok : bad)('prise désactivée + texte absent de v2 marqué hors contenu');
await expectErr('réactiver une prise obsolète refusé', 'admin', `SELECT apprendre_activate_take($1, true)`, [take], 'obsolète');
r = await as('admin', `SELECT action FROM apprendre_audio_audit ORDER BY id`); ok('journal : ' + r.rows.map(x => x.action).join(', '));
await expectErr('apprenant ne lit pas le journal', 'learner', `SELECT 1/(count(*)-count(*)) FROM apprendre_audio_audit`, [], 'division');
await as('admin', `UPDATE apprendre_audio_settings SET auto_activate = true, approvals_required = 2`);
r = await as('spk', `INSERT INTO apprendre_audio_takes (audio_key,text_hash,speaker_id,voice,storage_path,quality_score) VALUES ('ap:mot:BA-04737','h1b',$1,'femme','${U.spk}/k/2.wav',75) RETURNING id, version`, [U.spk]);
const t2 = r.rows[0].id; ok('nouvelle prise, version ' + r.rows[0].version);
await as('spk', `SELECT apprendre_submit_take($1)`, [t2]);
r = await as('rev', `SELECT apprendre_review_take($1,'approve',5,5,5,5,NULL,true,NULL) s`, [t2]); (r.rows[0].s === 'submitted' ? ok : bad)('1 avis sur 2 requis → reste soumise (' + r.rows[0].s + ')');
r = await as('admin', `SELECT apprendre_review_take($1,'approve',5,5,5,5,NULL,true,NULL) s`, [t2]); (r.rows[0].s === 'approved' ? ok : bad)('2e avis → approuvée (' + r.rows[0].s + ')');
r = await as('learner', `SELECT count(*)::int n FROM apprendre_audio_published`); (r.rows[0].n === 1 ? ok : bad)('activation automatique après 2 avis (' + r.rows[0].n + ')');
await as('spk', `SELECT apprendre_withdraw_consent()`);
r = await as('learner', `SELECT count(*)::int n FROM apprendre_audio_published`); (r.rows[0].n === 0 ? ok : bad)('retrait du consentement → voix retirées (' + r.rows[0].n + ')');
await expectErr('sans consentement, plus d\'enregistrement', 'spk', `INSERT INTO apprendre_audio_takes (audio_key,text_hash,speaker_id,voice,storage_path) VALUES ('ap:mot:BA-04737','h1b',$1,'femme','${U.spk}/k/3.wav')`, [U.spk], 'row-level security');
