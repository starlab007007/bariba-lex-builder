import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
const walk = (dir) =>
  fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((file) =>
      file.isDirectory()
        ? walk(path.join(dir, file.name))
        : /\.tsx?$/.test(file.name)
          ? [path.join(dir, file.name)]
          : [],
    );
const flagged = /[ẹọṣẸỌṢ]/u,
  findings = [];
for (const file of walk("src")) {
  const source = fs.readFileSync(file, "utf8"),
    ast = ts.createSourceFile(
      file,
      source,
      ts.ScriptTarget.Latest,
      true,
      file.endsWith("tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    ),
    edits = [];
  const replace = (fr, ba) => {
    if (!flagged.test(ba.text)) return;
    findings.push({
      file,
      fr: fr.text,
      excluded: ba.text,
      reason: "Graphie hors du référentiel Baatɔnum : validation requise.",
    });
    edits.push({
      start: ba.getStart(ast),
      end: ba.end,
      text: JSON.stringify(fr.text),
    });
  };
  const visit = (node) => {
    if (ts.isObjectLiteralExpression(node)) {
      let fr, ba;
      for (const property of node.properties)
        if (
          ts.isPropertyAssignment(property) &&
          ts.isStringLiteralLike(property.initializer)
        ) {
          const name = property.name.getText(ast).replace(/['"]/g, "");
          if (name === "fr") fr = property.initializer;
          if (name === "ba") ba = property.initializer;
        }
      if (fr && ba) replace(fr, ba);
    }
    if (
      ts.isConditionalExpression(node) &&
      /currentLang\s*===?\s*['"]ba['"]/.test(node.condition.getText(ast)) &&
      ts.isStringLiteralLike(node.whenTrue) &&
      ts.isStringLiteralLike(node.whenFalse)
    )
      replace(node.whenFalse, node.whenTrue);
    ts.forEachChild(node, visit);
  };
  visit(ast);
  let result = source;
  for (const edit of edits.sort((a, b) => b.start - a.start))
    result = result.slice(0, edit.start) + edit.text + result.slice(edit.end);
  if (edits.length) fs.writeFileSync(file, result);
}
fs.mkdirSync("docs/audits", { recursive: true });
const report = "docs/audits/rejected-platform-locales.json";
if (findings.length)
  fs.writeFileSync(report, JSON.stringify(findings, null, 2) + "\n");
console.log(
  JSON.stringify({
    excluded: findings.length,
    files: new Set(findings.map((row) => row.file)).size,
  }),
);
