import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
const root = process.cwd(),
  norm = (s) => s.normalize("NFC").replace(/\s+/gu, " ").trim();
const key = (s) =>
  norm(s)
    .toLocaleLowerCase("fr")
    .replace(/[.!…]+$/u, "")
    .trim();
const id = (s) => {
  let h = 0xcbf29ce484222325n;
  for (const c of key(s)) {
    h ^= BigInt(c.codePointAt(0));
    h = BigInt.asUintN(64, h * 0x100000001b3n);
  }
  return h.toString(16).padStart(16, "0");
};
const resources = new Map(),
  strings = new Map(),
  rejected = [];
function addPair(fr, ba, source, sourceId, rank) {
  if (
    typeof fr !== "string" ||
    typeof ba !== "string" ||
    !norm(fr) ||
    !norm(ba)
  )
    return;
  fr = norm(fr);
  ba = norm(ba);
  if (/[ẹọṣẸỌṢ]/u.test(ba)) {
    rejected.push({ fr, ba, source, sourceId, reason: "language-review" });
    return;
  }
  if (
    key(fr) === key(ba) &&
    !/^(?:FITILA|DUNYA|IA|MMS|Meta|Omnilingual|Mistral|Gemini|Google|WhatsApp|PDF|JSON|CSV|SMS|OCR|N[12]|SOS|Voice Lab)/iu.test(
      fr,
    )
  )
    return;
  const rows = resources.get(key(fr)) ?? [];
  rows.push({ ba, source, sourceId, rank });
  resources.set(key(fr), rows);
}
const legacy = JSON.parse(fs.readFileSync("public/i18n-platform.json", "utf8"));
for (const [name, row] of Object.entries(legacy))
  if (row && typeof row === "object")
    addPair(
      row.fr,
      row.ba,
      "interface",
      name,
      name.startsWith("common_")
        ? 120
        : name.startsWith("sidebar_")
          ? 110
          : 100,
    );
const memory = JSON.parse(
  fs.readFileSync("public/data/translation-memory.json", "utf8"),
);
for (const [n, pair] of memory.pairs.entries())
  addPair(pair[0], pair[1], "memoire", String(n), 60);
for (const [n, row] of JSON.parse(
  fs.readFileSync("public/dictionnaire_ameliore.json", "utf8"),
).entries())
  addPair(row.definition, row.word, "dictionnaire", String(n), 30);
function pairs(value, source, where = "root") {
  if (Array.isArray(value)) {
    value.forEach((item, n) => pairs(item, source, where + "." + n));
    return;
  }
  if (
    !value ||
    typeof value !== "object" ||
    ["a_valider", "pending", "rejected"].includes(value.st ?? value.validation)
  )
    return;
  for (const [fr, ba] of [
    ["fr", "ba"],
    ["text_fr", "text_ba"],
    ["title_fr", "title_ba"],
    ["ex_fr", "ex_ba"],
  ])
    addPair(
      value[fr],
      value[ba],
      source,
      String(value.id ?? where) + ":" + fr,
      80,
    );
  for (const [name, item] of Object.entries(value))
    if (typeof item === "object") pairs(item, source, where + "." + name);
}
pairs(
  JSON.parse(fs.readFileSync("src/data/apprendre_v2.json", "utf8")),
  "apprendre",
);
pairs(JSON.parse(fs.readFileSync("src/data/scenes_v2.json", "utf8")), "scenes");
const uiProps = new Set([
  "title",
  "label",
  "description",
  "desc",
  "subtitle",
  "placeholder",
  "alt",
  "aria-label",
  "aria-description",
  "message",
  "text",
  "instruction",
  "explain",
  "emptyText",
  "helperText",
  "fr",
  "title_fr",
  "text_fr",
  "ex_fr",
]);
function record(raw, file, kind) {
  const text = norm(raw);
  if (
    text.length < 2 ||
    text.length > 4000 ||
    !/[\p{L}]/u.test(text) ||
    /^(?:https?:|data:|\/|[.#]|[a-zA-Z]+\()/u.test(text) ||
    /[_{}<>]|(?:bg-|text-|border-|flex-|grid-|className|\b[wh]-\d|items-|justify-|rounded-|\b[mp][xy]-|animate-|font-)/u.test(
      text,
    ) ||
    /^(?:fr|ba|bba|en)(?:-[A-Z]{2})?$/i.test(text)
  )
    return;
  if (
    /[ɔɛŋɲʋ]/iu.test(text) &&
    !/(?:\b(?:le|la|les|du|de|des|en|avec|pour|une|un|votre|vos|voix|texte|français|langue|mot)\b|écout|tradui)/iu.test(
      text,
    )
  )
    return;
  const k = key(text),
    row = strings.get(k) ?? {
      id: id(text),
      fr: text,
      files: new Set(),
      kinds: new Set(),
    };
  row.files.add(file);
  row.kinds.add(kind);
  strings.set(k, row);
}
function walkFiles(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((item) =>
      item.isDirectory()
        ? walkFiles(path.join(dir, item.name))
        : /\.(tsx?|json)$/.test(item.name)
          ? [path.join(dir, item.name)]
          : [],
    );
}
const sourceFiles = walkFiles("src").filter(
  (file) => !file.startsWith("src/data/locales/"),
);
for (const file of sourceFiles) {
  if (/platform-locale/.test(file)) continue;
  const raw = fs.readFileSync(file, "utf8");
  if (file.endsWith(".json")) {
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      continue;
    }
    const scan = (v, parent = "") => {
      if (Array.isArray(v)) {
        v.forEach((x) => scan(x, parent));
        return;
      }
      if (!v || typeof v !== "object") return;
      for (const [name, item] of Object.entries(v)) {
        if (
          typeof item === "string" &&
          [
            "fr",
            "title_fr",
            "text_fr",
            "ex_fr",
            "instruction",
            "explain",
            "description",
          ].includes(name)
        )
          record(item, file, "contenu");
        else if (typeof item === "object") scan(item, name);
      }
    };
    scan(data);
    continue;
  }
  const ast = ts.createSourceFile(
    file,
    raw,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const visit = (node) => {
    if (ts.isObjectLiteralExpression(node)) {
      const values = {};
      for (const p of node.properties)
        if (ts.isPropertyAssignment(p) && ts.isStringLiteralLike(p.initializer))
          values[p.name.getText(ast).replace(/['"]/g, "")] = p.initializer.text;
      addPair(
        values.fr,
        values.ba,
        "interface-source",
        file + ":" + node.pos,
        90,
      );
    }
    if (ts.isConditionalExpression(node)) {
      const condition = node.condition.getText(ast);
      if (
        /currentLang\s*===?\s*['"]ba['"]/.test(condition) &&
        ts.isStringLiteralLike(node.whenTrue) &&
        ts.isStringLiteralLike(node.whenFalse)
      )
        addPair(
          node.whenFalse.text,
          node.whenTrue.text,
          "interface-source",
          file + ":" + node.pos,
          90,
        );
    }
    if (ts.isJsxText(node)) record(node.text, file, "texte");
    if (ts.isStringLiteralLike(node)) {
      const p = node.parent;
      let allowed = false;
      if (ts.isJsxAttribute(p)) allowed = uiProps.has(p.name.getText(ast));
      if (ts.isPropertyAssignment(p))
        allowed = uiProps.has(p.name.getText(ast).replace(/['"]/g, ""));
      let up = p;
      for (let n = 0; n < 5 && up; n++, up = up.parent) {
        if (ts.isJsxExpression(up)) {
          if (
            !ts.isJsxAttribute(up.parent) ||
            uiProps.has(up.parent.name.getText(ast))
          )
            allowed = true;
          break;
        }
        if (
          ts.isCallExpression(up) &&
          /^(?:toast(?:\.(?:error|success|info|warning))?|Error)$/.test(
            up.expression.getText(ast),
          )
        )
          allowed = true;
      }
      if (
        ts.isBinaryExpression(p) &&
        p.operatorToken.kind !== ts.SyntaxKind.PlusToken
      )
        allowed = false;
      if (
        ts.isPropertyAssignment(p) &&
        !uiProps.has(p.name.getText(ast).replace(/['"]/g, ""))
      )
        allowed = false;
      up = p;
      while (
        up &&
        !ts.isJsxAttribute(up) &&
        !ts.isJsxElement(up) &&
        !ts.isSourceFile(up)
      )
        up = up.parent;
      if (up && ts.isJsxAttribute(up) && !uiProps.has(up.name.getText(ast)))
        allowed = false;
      if (allowed) record(node.text, file, "libelle");
    }
    ts.forEachChild(node, visit);
  };
  visit(ast);
}
const records = [];
let sourced = 0,
  ambiguous = 0;
for (const [k, row] of strings) {
  const candidates = (resources.get(k) ?? []).sort((a, b) => b.rank - a.rank);
  const top = candidates.filter((x) => x.rank === candidates[0]?.rank),
    unique = [...new Set(top.map((x) => x.ba))];
  const ba = unique.length === 1 ? unique[0] : null;
  if (unique.length > 1) ambiguous++;
  if (ba) sourced++;
  records.push({
    id: row.id,
    fr: row.fr,
    ba,
    status: ba ? "catalogue" : "missing",
    sources: ba
      ? top
          .filter((x) => x.ba === ba)
          .map(({ source, sourceId }) => ({ source, id: sourceId }))
          .slice(0, 5)
      : [],
    files: [...row.files].sort(),
    kinds: [...row.kinds],
  });
}
// Existing translated labels must also resolve by their French display text.
for (const [name, row] of Object.entries(legacy))
  if (
    row &&
    typeof row === "object" &&
    typeof row.fr === "string" &&
    !strings.has(key(row.fr))
  ) {
    const candidates = resources.get(key(row.fr)) ?? [];
    const match = candidates.find(
      (x) => x.source === "interface" && x.sourceId === name,
    );
    if (match)
      records.push({
        id: id(row.fr),
        fr: norm(row.fr),
        ba: match.ba,
        status: "catalogue",
        sources: [{ source: "interface", id: name }],
        files: ["public/i18n-platform.json"],
        kinds: ["cle"],
      });
  }
records.sort((a, b) => a.id.localeCompare(b.id));
const unique = [...new Map(records.map((row) => [row.id, row])).values()];
fs.mkdirSync("src/data/locales", { recursive: true });
fs.writeFileSync(
  "src/data/locales/platform.json",
  JSON.stringify({
    version: 1,
    entries: unique.map(({ files, kinds, ...row }) => row),
  }) + "\n",
);
fs.writeFileSync(
  "src/data/locales/keys.json",
  JSON.stringify(
    Object.fromEntries(
      Object.entries(legacy)
        .filter(([k, r]) => r && typeof r === "object")
        .map(([k, r]) => [
          k,
          {
            fr: r.fr,
            ba: resources
              .get(key(r.fr ?? ""))
              ?.some((x) => x.source === "interface" && x.sourceId === k)
              ? r.ba
              : "",
          },
        ]),
    ),
  ) + "\n",
);
fs.mkdirSync("docs/audits", { recursive: true });
const summary = {
  sourceFiles: sourceFiles.length,
  routes: [
    ...fs.readFileSync("src/App.tsx", "utf8").matchAll(/path="([^"]+)"/g),
  ].map((m) => m[1]),
  strings: unique.length,
  sourced: unique.filter((r) => r.ba).length,
  missing: unique.filter((r) => !r.ba).length,
  ambiguous,
  rejected: rejected.length,
  quarantined: fs.existsSync('docs/audits/rejected-platform-locales.json') ? JSON.parse(fs.readFileSync('docs/audits/rejected-platform-locales.json','utf8')).length : 0,
};
fs.writeFileSync('docs/audits/platform-localization-summary.json',JSON.stringify(summary,null,2)+'\n');
fs.writeFileSync(
  "docs/audits/platform-localization.json",
  JSON.stringify({ summary, rejected, entries: unique }, null, 2) + "\n",
);
fs.writeFileSync(
  "src/data/locales/audit.json",
  JSON.stringify({
    summary,
    rejected,
    files: Object.fromEntries(unique.map((row) => [row.id, row.files])),
  }) + "\n",
);
console.log(JSON.stringify(summary, null, 2));
