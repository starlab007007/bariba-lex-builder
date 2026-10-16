import fs from "node:fs";
const url = "https://dvswhjawiooprghzeyol.supabase.co";
// Public publishable key, identical to the browser client. Never use a service key.
const key = "sb_publishable_Rs6ysvbwQ0oGpHuYulZ5Hw_loUqyGKw";
async function read(table, select, filter = "") {
  const rows = [];
  for (let offset = 0; offset < 50000; offset += 1000) {
    const query = new URLSearchParams({ select, order: "id", offset: String(offset), limit: "1000" });
    const endpoint = `${url}/rest/v1/${table}?${query}${filter}`;
    const response = await fetch(endpoint, { headers: { apikey: key }, signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(`${table}: HTTP ${response.status}`);
    const page = await response.json();
    if (!Array.isArray(page)) throw new Error(`${table}: invalid public resource`);
    rows.push(...page);
    if (page.length < 1000) return rows;
  }
  throw new Error(`${table}: resource pagination limit exceeded`);
}
// Only public linguistic fields are downloaded: no authors, accounts or recordings.
const [dictionary, learning] = await Promise.all([
  read("dictionary_entries", "id,word,definition,part_of_speech,example_bariba,example_francais,is_verified"),
  read("apprendre_module_content", "id,content,content_version,content_hash,item_count"),
]);
if (!dictionary.length || !learning.length) throw new Error("Public linguistic resources are incomplete; previous snapshot retained.");
fs.mkdirSync("src/data/locales", { recursive: true });
const target = "src/data/locales/references.json";
// The corpus is authenticated-only. Keep its private build snapshot; never weaken RLS.
const corpus = fs.existsSync(target) ? JSON.parse(fs.readFileSync(target, "utf8")).corpus ?? [] : [];
fs.writeFileSync(target + ".next", JSON.stringify({ version: 1, project: "dvswhjawiooprghzeyol", dictionary, corpus, learning }) + "\n");
fs.renameSync(target + ".next", target);
console.log(JSON.stringify({ dictionary: dictionary.length, corpus: corpus.length, learning: learning.map(({ id, item_count, content_version }) => ({ id, items: item_count, version: content_version })) }));
