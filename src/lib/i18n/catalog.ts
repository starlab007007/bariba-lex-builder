import { displayLanguageName } from "./languageName.ts";
export type UiLocale = "fr" | "ba";
export type LocaleEntry = {
  id: string;
  fr: string;
  ba: string | null;
  status: string;
  sources: { source: string; id: string }[];
  legacyVariants?: string[];
};
export type LocaleOverride = {
  id: string;
  fr: string;
  ba: string;
  revision?: number;
};
export const localeKey = (value: string) =>
  value
    .normalize("NFC")
    .replace(/\s+/gu, " ")
    .trim()
    .toLocaleLowerCase("fr")
    .replace(/[.!…]+$/u, "")
    .trim();
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export function localeId(text: string): string {
  let hash = 0xcbf29ce484222325n;
  for (const letter of localeKey(text)) {
    hash ^= BigInt(letter.codePointAt(0)!);
    hash = BigInt.asUintN(64, hash * 0x100000001b3n);
  }
  return hash.toString(16).padStart(16, "0");
}
export class PlatformCatalog {
  readonly entries: LocaleEntry[];
  private direct = new Map<string, string>();
  private reverse = new Map<string, Set<string>>();
  private templates: { pattern: RegExp; names: string[]; target: string }[] =
    [];
  private registered = new Set<string>();
  private named = new Map<string, Set<string>>();
  private legacy = new Map<string, Set<string>>();
  constructor(entries: LocaleEntry[], overrides: LocaleOverride[] = []) {
    const updates = new Map(overrides.map((row) => [row.id, row]));
    this.entries = entries.map((row) => {
      const update = updates.get(row.id);
      return update && localeKey(update.fr) === localeKey(row.fr)
        ? { ...row, ba: update.ba, status: "approved" }
        : row;
    });
    const known = new Set(entries.map((row) => row.id));
    for (const row of overrides)
      if (!known.has(row.id) && localeId(row.fr) === row.id) {
        known.add(row.id);
        this.entries.push({
          ...row,
          status: "approved",
          sources: [{ source: "validation", id: row.id }],
        });
      }
    for (const row of this.entries) {
      this.registered.add(localeKey(row.fr));
      for (const variant of row.legacyVariants ?? []) {
        if (localeKey(variant) === localeKey(row.fr)) continue;
        const sources = this.legacy.get(localeKey(variant)) ?? new Set<string>();
        sources.add(row.fr); this.legacy.set(localeKey(variant), sources);
      }
      if (
        !row.ba?.trim() ||
        /[<>]/u.test(row.ba) ||
        (row.status !== "approved" && /[ẹọṣẸỌṢ]/u.test(row.ba))
      )
        continue;
      const source = row.fr.trim(),
        target = row.ba.trim();
      this.direct.set(localeKey(source), target);
      const nameKey = localeKey(displayLanguageName(source));
      const namedTargets = this.named.get(nameKey) ?? new Set<string>();
      namedTargets.add(displayLanguageName(target));
      this.named.set(nameKey, namedTargets);
      const back = this.reverse.get(localeKey(target)) ?? new Set<string>();
      back.add(source);
      this.reverse.set(localeKey(target), back);
      const names = [...source.matchAll(/\{(\w+)\}/g)].map((match) => match[1]);
      if (
        names.length &&
        source.replace(/\{\w+\}/g, "").trim().length >= 4 &&
        names.every((name) => target.includes("{" + name + "}")) &&
        [...target.matchAll(/\{(\w+)\}/g)].every((match) =>
          names.includes(match[1]),
        )
      ) {
        const pieces = source.split(/\{\w+\}/g);
        this.templates.push({
          pattern: new RegExp(
            "^" + pieces.map(escape).join("(.+?)") + "$",
            "iu",
          ),
          names,
          target,
        });
      }
    }
  }
  hasSource(text: string) {
    return this.registered.has(localeKey(text));
  }
  lookup(text: string): string | undefined {
    const direct = this.direct.get(localeKey(text));
    if (direct) return displayLanguageName(direct);
    const named = this.named.get(localeKey(displayLanguageName(text)));
    if (named?.size === 1) return [...named][0];
    const decorated = /^((?:[\p{Extended_Pictographic}\p{Emoji_Presentation}\uFE0F\u200D]\s*)+)(.+)$/u.exec(text.trim());
    if (decorated) {
      const label = this.direct.get(localeKey(decorated[2]));
      if (label) return decorated[1] + displayLanguageName(label);
    }
    const required = /^(.+?)(\s*\*+)$/u.exec(text.trim());
    if (required) {
      const label = this.direct.get(localeKey(required[1]));
      if (label) return displayLanguageName(label) + required[2];
    }
    const qualified = /^([^()]+?)\s*\((optionnel|facultatif|obligatoire|requis)\)$/iu.exec(text.trim());
    if (qualified) {
      const label = this.direct.get(localeKey(qualified[1]));
      const qualifier = this.direct.get(localeKey(/optionnel|facultatif/iu.test(qualified[2]) ? "Optionnel" : "Requis"));
      if (label && qualifier) return displayLanguageName(label) + " (" + displayLanguageName(qualifier) + ")";
    }
    const trimmed = text.trim();
    for (const row of this.templates) {
      const match = row.pattern.exec(trimmed);
      if (!match) continue;
      const values = new Map(
        row.names.map((name, index) => [name, match[index + 1]]),
      );
      return displayLanguageName(row.target).replace(
        /\{(\w+)\}/g,
        (token, name: string) => values.get(name) ?? token,
      );
    }
    // Translate an attested control label, retaining its dynamic payload verbatim.
    const colon = /^(.*?)(\s*[:：]\s*)(.+)$/u.exec(trimmed);
    if (colon) {
      const label = this.direct.get(localeKey(colon[1]));
      if (label) return displayLanguageName(label) + colon[2] + colon[3];
    }
    return undefined;
  }
  translate(text: string, locale: UiLocale): string {
    const legacy = this.legacy.get(localeKey(text));
    if (legacy?.size === 1 && !this.reverse.has(localeKey(text))) text = (/^\s*/u.exec(text)?.[0] ?? "") + [...legacy][0] + (/\s*$/u.exec(text)?.[0] ?? "");
    if (locale === "fr" || !text.trim()) return displayLanguageName(text);
    const target = this.lookup(text);
    if (!target) return displayLanguageName(text);
    const prefix = /^\s*/u.exec(text)?.[0] ?? "",
      suffix = /\s*$/u.exec(text)?.[0] ?? "";
    const punctuation = /[.!?…]+$/u.exec(text.trim())?.[0] ?? "";
    return (
      prefix +
      target +
      (punctuation && !/[.!?…]$/u.test(target) ? punctuation : "") +
      suffix
    );
  }
  toFrench(text: string): string {
    const values = this.reverse.get(localeKey(text));
    return values?.size === 1 ? [...values][0] : text;
  }
  get coverage() {
    return {
      total: this.entries.length,
      available: this.entries.filter((row) => !!this.lookup(row.fr)).length,
      approved: this.entries.filter(
        (row) => row.status === "approved" && !!this.lookup(row.fr),
      ).length,
    };
  }
}
