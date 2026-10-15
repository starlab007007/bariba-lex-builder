import {
  PlatformCatalog,
  localeId,
  type LocaleEntry,
} from "../../src/lib/i18n/catalog.ts";
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
