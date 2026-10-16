import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
const display = text => text.normalize("NFC").replace(/(?<![\p{L}\p{N}_])(?:bariba|b[aàáâäãā]{1,2}t[ɔoóòôõöō]\p{M}*n[uúùûũüū]|baat[ɔo]n(?:u|ou)?m)(?![\p{L}\p{N}_])/giu, "Baatɔnum");
const labels = new Set(["label", "title", "description", "desc", "subtitle", "placeholder", "alt", "aria-label", "aria-description", "message", "text", "instruction", "explain", "header", "helperText"]);
const files = dir => fs.readdirSync(dir, {withFileTypes:true}).flatMap(file => file.isDirectory() ? files(path.join(dir,file.name)) : file.name.endsWith(".tsx") ? [path.join(dir,file.name)] : []);
const changes = [];
for (const file of files("src")) {
  const source = fs.readFileSync(file,"utf8"), ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX), edits = [];
  function visit(node) {
    let visible = ts.isJsxText(node);
    if (ts.isStringLiteralLike(node)) {
      const parent = node.parent;
      visible = (ts.isJsxAttribute(parent) && labels.has(parent.name.getText(ast))) ||
        (ts.isPropertyAssignment(parent) && labels.has(parent.name.getText(ast).replace(/^['"]|['"]$/g,""))) ||
        (ts.isJsxExpression(parent) && !ts.isJsxAttribute(parent.parent));
    }
    if (visible) {
      const start = node.getStart(ast), end = node.end, before = source.slice(start,end);
      // Textual product labels only; no URL, endpoint, import, key or JSX value rewrite.
      if (!/https?:\/\/|[\w.+-]+@[\w.-]+/u.test(before)) {
        const after = display(before); if (before !== after) edits.push({start,end,after});
      }
    }
    ts.forEachChild(node,visit);
  }
  visit(ast);
  if (!edits.length) continue;
  let output = source;
  for (const edit of edits.sort((a,b)=>b.start-a.start)) output = output.slice(0,edit.start)+edit.after+output.slice(edit.end);
  fs.writeFileSync(file,output); changes.push({file,labels:edits.length});
}
fs.mkdirSync("docs/audits",{recursive:true});
const report = "docs/audits/platform-language-name.json";
if (changes.length || !fs.existsSync(report)) fs.writeFileSync(report,JSON.stringify({name:"Baatɔnum",files:changes.length,labels:changes.reduce((sum,file)=>sum+file.labels,0),changes},null,2)+"\n");
console.log(JSON.stringify({changedFiles:changes.length,changedLabels:changes.reduce((sum,file)=>sum+file.labels,0)}));
