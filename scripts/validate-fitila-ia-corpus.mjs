import fs from 'node:fs';

const localPath = 'src/data/foncier_bariba_corpus.json';
const backendPath = 'supabase/functions/_shared/foncier_bariba_corpus.json';

const local = fs.readFileSync(localPath);
const backend = fs.readFileSync(backendPath);

if (!local.equals(backend)) {
  console.error('FITILA IA corpus drift: local and backend corpus differ.');
  process.exit(1);
}

const parsed = JSON.parse(local.toString('utf8'));
if (!Array.isArray(parsed) || parsed.length !== 207) {
  console.error(`FITILA IA corpus invalid: expected 207 articles, got ${Array.isArray(parsed) ? parsed.length : 'non-array'}.`);
  process.exit(1);
}

console.log(`FITILA IA corpus OK: ${parsed.length} articles, local/backend identical.`);
