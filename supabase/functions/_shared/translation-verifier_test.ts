import { acceptRefinement, estimateConfidence, foldBa, foldFr, ensureMemory, lexicalCoverage, memoryLookup, similarity } from "./translation-verifier.ts";

await ensureMemory();

function assert(cond: boolean, msg: string) { if (!cond) throw new Error(msg); }

Deno.test("fold mirrors the Python rules (tones dropped, nasal tilde kept)", () => {
  assert(foldBa("Bààtɔ̀nú") === "baatɔ̀nu".normalize("NFD").replace(/[̀́̂̄̌]/g, "").normalize("NFC"), "tones");
  assert(foldBa("sɔ̃ɔ") !== foldBa("sɔɔ"), "nasal tilde must be kept");
  assert(foldBa("kɑ") === "ka", "alpha folds to a");
  assert(foldFr("Où êtes-vous ?") === "ou etes vous", "french accents");
});

Deno.test("memory returns attested sentences in both directions", () => {
  const hit = memoryLookup("Salut ! Bonne arrivée !", "fr-ba");
  assert(hit !== null && foldBa(hit.translation).includes("aagu"), "fr-ba exact");
  const back = memoryLookup("Aagu wunɛ ka weru.", "ba-fr");
  assert(back !== null && foldFr(back.translation).includes("bonne arrivee"), "ba-fr exact");
  assert(memoryLookup("une phrase qui n'existe nulle part dans le corpus", "fr-ba") === null, "miss");
});

Deno.test("refinement guard rejects rewrites and unknown words", () => {
  assert(!acceptRefinement("Aagu wunɛ ka weru", "Totalement autre chose ici", "ba").accepted, "too different");
  assert(!acceptRefinement("Aagu wunɛ ka weru", "Aagu wunɛ ka weruzzz", "ba").accepted, "unknown word");
  assert(acceptRefinement("Aagu wunɛ ka weru", "Aagu wunɛ ka weru.", "ba").accepted, "light punctuation edit");
  assert(similarity("abc", "abc") === 1, "similarity");
});

Deno.test("confidence is derived from the lexicon, not fixed", () => {
  const good = estimateConfidence("Aagu wunɛ ka weru", "ba", false).confidence;
  const bad = estimateConfidence("xqzv plorg tuvw", "ba", false).confidence;
  assert(good > bad + 30, `good ${good} vs bad ${bad}`);
  assert(lexicalCoverage("xqzv plorg", "ba") === 0, "coverage zero");
  assert(estimateConfidence("a ka a ka a ka a ka", "ba", false).confidence < good, "loop penalty");
});

Deno.test("sentences are split on final punctuation", async () => {
  const { splitSentences } = await import("./translation-verifier.ts");
  const parts = splitSentences("Va me fermer ma porte. L'allergie va disparaître ! Où ? Ici");
  assert(parts.length === 4, `got ${parts.length}`);
  assert(parts[0] === "Va me fermer ma porte.", parts[0]);
});
