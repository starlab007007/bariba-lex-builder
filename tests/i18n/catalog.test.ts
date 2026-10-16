import {
  PlatformCatalog,
  localeId,
  type LocaleEntry,
} from "../../src/lib/i18n/catalog.ts";
import { displayLanguageName } from "../../src/lib/i18n/languageName.ts";
const assert = (value: unknown, message = "assertion failed") => {
  if (!value) throw new Error(message);
};
const entry = (
  fr: string,
  ba: string | null,
  id = "0000000000000001",
): LocaleEntry => ({
  id,
  fr,
  ba,
  status: ba ? "catalogue" : "missing",
  sources: [{ source: "interface", id: "common" }],
});
Deno.test(
  "exact UI lookup preserves Unicode, whitespace and French restoration",
  () => {
    const c = new PlatformCatalog([entry("Annuler", "Gbɛ́ru")]);
    assert(c.translate("  Annuler\n", "ba") === "  Gbɛ́ru\n");
    assert(c.translate("Annuler", "fr") === "Annuler");
    assert(c.translate("Annuler.", "ba") === "Gbɛ́ru.");
    assert(c.toFrench("Gbɛ́ru") === "Annuler");
  },
);
Deno.test("unknown phrases never become word-by-word or model guesses", () => {
  const c = new PlatformCatalog([entry("Annuler", "Gbɛru")]);
  assert(
    c.translate("Annuler mon opération privée", "ba") ===
      "Annuler mon opération privée",
  );
  assert(c.translate("Ali 1200 ne vend pas", "ba") === "Ali 1200 ne vend pas");
});
Deno.test(
  "published override must match its source and overrides its catalogue entry",
  () => {
    const c = new PlatformCatalog(
      [entry("Annuler", "Gbɛru")],
      [{ id: "0000000000000001", fr: "Annuler", ba: "Gbɛ́ru" }],
    );
    assert(c.lookup("Annuler") === "Gbɛ́ru" && c.coverage.approved === 1);
    const wrong = new PlatformCatalog(
      [entry("Annuler", "Gbɛru")],
      [{ id: "0000000000000001", fr: "Supprimer", ba: "Bɔru" }],
    );
    assert(
      wrong.lookup("Annuler") === "Gbɛru" && wrong.coverage.approved === 0,
    );
  },
);
Deno.test(
  "control labels preserve their dynamic payload including names and negation",
  () => {
    const c = new PlatformCatalog([entry("Écouter", "Gerebu")]);
    assert(
      c.translate("Écouter : Ali ne donne pas 1200", "ba") ===
        "Gerebu : Ali ne donne pas 1200",
    );
  },
);
Deno.test(
  "attested templates retain every slot without translating its contents",
  () => {
    const c = new PlatformCatalog([entry("{count} mots", "{count} yora")]);
    assert(c.translate("1200 mots", "ba") === "1200 yora");
    const broken = new PlatformCatalog([entry("{count} mots", "yora")]);
    assert(broken.translate("1200 mots", "ba") === "1200 mots");
  },
);
Deno.test(
  "ambiguous reverse references are preserved rather than arbitrarily selected",
  () => {
    const c = new PlatformCatalog([
      entry("Annuler", "Gbɛru"),
      entry("Couper", "Gbɛru", "0000000000000002"),
    ]);
    assert(c.toFrench("Gbɛru") === "Gbɛru");
  },
);
Deno.test(
  "unreviewed out-of-reference graphies and markup are not silently published",
  () => {
    const c = new PlatformCatalog([
      entry("Écouter", "Gbọ́"),
      entry("Retour", "<script>", "0000000000000002"),
    ]);
    assert(
      c.lookup("Écouter") === undefined && c.lookup("Retour") === undefined,
    );
  },
);
Deno.test(
  "newly reviewed dynamic interface phrases are usable without rebuilding the application",
  () => {
    const fr = "Nouveau libellé public";
    const c = new PlatformCatalog([], [{ id: localeId(fr), fr, ba: "Yora" }]);
    assert(c.translate(fr, "ba") === "Yora" && c.coverage.approved === 1);
    const invalid = new PlatformCatalog(
      [],
      [{ id: "0000000000000000", fr, ba: "Yora" }],
    );
    assert(invalid.translate(fr, "ba") === fr);
  },
);
Deno.test("Baatɔnum is the display name in both languages and under Unicode variants", () => {
  for (const name of ["Bariba", "bariba", "BARIBA", "Bàátɔ̀nú", "BÀÁTƆ̀NÚ", "Baatonum", "Baatɔnum", "Bàátɔ̀nú".normalize("NFD")]) {
    assert(displayLanguageName(name) === "Baatɔnum", name);
    assert(new PlatformCatalog([]).translate("Langue " + name, "fr") === "Langue Baatɔnum", name);
  }
  assert(displayLanguageName("bariba-stt https://model-bariba.hf.space bariba_test contact@bariba.bj") === "Baatɔnum-stt https://model-bariba.hf.space bariba_test contact@bariba.bj");
});
Deno.test("Renamed labels still resolve historical attested references without changing their IDs", () => {
  const fr = "Mot bariba";
  const c = new PlatformCatalog([entry(fr, "Bàátɔ̀nú yɛnu")]);
  assert(c.translate("Mot Baatɔnum", "ba") === "Baatɔnum yɛnu");
  assert(c.entries[0].id === "0000000000000001" && c.entries[0].fr === fr);
});
Deno.test("Form required markers and qualifiers reuse attested labels", () => {
  const c = new PlatformCatalog([entry("Annuler", "Gbɛru"), entry("Optionnel", "Nɛn", "0000000000000002")]);
  assert(c.translate("Annuler *", "ba") === "Gbɛru *");
  assert(c.translate("Annuler (facultatif)", "ba") === "Gbɛru (Nɛn)");
  assert(c.translate("🔎 Annuler", "ba") === "🔎 Gbɛru");
});
Deno.test("Names inside explicit dynamic slots and colon payloads are never renamed", () => {
  const c = new PlatformCatalog([entry("Écouter", "Gerebu"), entry("{nom} : Annuler", "{nom} : Gbɛru", "0000000000000002")]);
  assert(c.translate("Écouter : Bariba 1200", "ba") === "Gerebu : Bariba 1200");
  assert(c.translate("Bariba : Annuler", "ba") === "Bariba : Gbɛru");
});
Deno.test("Hard-coded legacy labels defer to the sourced catalogue in both languages", () => {
  const row = { ...entry("Proposer un mot", "De yɛnu wɛɛru"), legacyVariants: ["Fi ɔ̀rɔ̀ tuntun kún"] };
  const c = new PlatformCatalog([row]);
  assert(c.translate("Fi ɔ̀rɔ̀ tuntun kún", "ba") === "De yɛnu wɛɛru");
  assert(c.translate("  Fi ɔ̀rɔ̀ tuntun kún  ", "fr") === "  Proposer un mot  ");
  const ambiguous = new PlatformCatalog([row, { ...entry("Nouveau mot", "Yɛnu wɛɛru", "0000000000000002"), legacyVariants: ["Fi ɔ̀rɔ̀ tuntun kún"] }]);
  assert(ambiguous.translate("Fi ɔ̀rɔ̀ tuntun kún", "fr") === "Fi ɔ̀rɔ̀ tuntun kún");
});
Deno.test("Language name variants do not create false ambiguity in legacy field labels", () => {
  const a = {...entry("Mot Bariba *", "Bàátɔ̀nú yɛnu *"), legacyVariants:["Ɔ̀rɔ̀ Bàátɔ̀nú *"]};
  const b = {...entry("Mot Baatɔnum *", "Bàátɔ̀nú yɛnu *", "0000000000000002"), legacyVariants:["Ɔ̀rɔ̀ Bàátɔ̀nú *"]};
  const c = new PlatformCatalog([a,b]);
  for (const source of ["Ɔ̀rɔ̀ Bàátɔ̀nú *", "Ɔ̀rɔ̀ Baatɔnum *"]) {
    assert(c.translate(source,"ba") === "Baatɔnum yɛnu *");
    assert(c.translate(source,"fr") === "Mot Baatɔnum *");
  }
});
