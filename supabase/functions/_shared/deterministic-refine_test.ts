import { refineDeterministic } from "./deterministic-refine.ts";
import { foldBa } from "./translation-verifier.ts";

const vectors = JSON.parse(await Deno.readTextFile(new URL("./refine-vectors.json", import.meta.url)));
const surface = new Map<string, string>();
for (const w of vectors.lexicon as string[]) surface.set(foldBa(w), w);

for (const c of vectors.cases) {
  Deno.test(`refine: ${c.name}`, () => {
    const out = refineDeterministic(c.source, c.candidate, c.toBariba, { surface, fold: foldBa });
    if (out.text !== c.expected) throw new Error(`expected "${c.expected}" got "${out.text}"`);
    const again = refineDeterministic(c.source, out.text, c.toBariba, { surface, fold: foldBa });
    if (again.text !== out.text) throw new Error(`not idempotent: "${again.text}"`);
  });
}
