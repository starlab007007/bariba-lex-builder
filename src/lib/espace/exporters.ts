import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import { escapeHtml, htmlToText, sanitizeHtml, textToHtml } from './baribaText';

export function slugify(name: string) {
  return (name || 'document').normalize('NFC').replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80) || 'document';
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/** TXT en UTF-8 avec BOM : les éditeurs Windows reconnaissent ɛ ɔ ŋ et les tons. */
export function exportTxt(title: string, html: string) {
  const text = htmlToText(html).normalize('NFC');
  download(new Blob(['﻿', text], { type: 'text/plain;charset=utf-8' }), `${slugify(title)}.txt`);
}

/**
 * PDF via le moteur d'impression du navigateur (« Enregistrer en PDF ») : la mise en page utilise les polices
 * du système avec repli Unicode, ce qui conserve correctement ɛ ɔ ŋ et les diacritiques combinants.
 */
export function exportPdf(title: string, html: string) {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument!;
  doc.open();
  doc.write(`<!doctype html><html lang="bba"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<style>
@page { size: A4; margin: 22mm 20mm; }
body { font-family: "Charis SIL","Gentium Plus","Noto Serif","DejaVu Serif","Segoe UI",Georgia,serif; font-size: 12.5pt; line-height: 1.6; color: #241F2E; font-kerning: normal; text-rendering: geometricPrecision; }
h1 { font-size: 22pt; margin: 0 0 14pt; } h2 { font-size: 16pt; } h3 { font-size: 13.5pt; }
blockquote { border-left: 3pt solid #C99530; margin-left: 0; padding-left: 12pt; color: #3A3448; }
.meta { color: #8C8571; font-size: 9.5pt; margin-bottom: 18pt; border-bottom: 1px solid #E4DFCC; padding-bottom: 8pt; }
</style></head><body><h1>${escapeHtml(title)}</h1><div class="meta">FITILA · Espace — ${new Date().toLocaleDateString('fr-FR')}</div>${sanitizeHtml(html)}</body></html>`);
  doc.close();
  const cleanup = () => setTimeout(() => iframe.remove(), 1500);
  iframe.contentWindow!.addEventListener('afterprint', cleanup);
  setTimeout(() => {
    iframe.contentWindow!.focus();
    iframe.contentWindow!.print();
    setTimeout(cleanup, 60000);
  }, 250);
}

// ───────────────────────────── DOCX ─────────────────────────────
const W_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';

type Run = { text: string; b?: boolean; i?: boolean; u?: boolean };
type Block = { runs: Run[]; style?: 'Heading1' | 'Heading2' | 'Heading3' | 'Quote' | 'ListParagraph'; align?: string };

function collectRuns(node: Node, fmt: Omit<Run, 'text'>, out: Run[]) {
  if (node.nodeType === Node.TEXT_NODE) {
    if (node.textContent) out.push({ text: node.textContent, ...fmt });
    return;
  }
  if (!(node instanceof HTMLElement)) return;
  if (node.tagName === 'BR') {
    out.push({ text: '\n', ...fmt });
    return;
  }
  const next = { ...fmt };
  if (['B', 'STRONG'].includes(node.tagName)) next.b = true;
  if (['I', 'EM'].includes(node.tagName)) next.i = true;
  if (node.tagName === 'U') next.u = true;
  node.childNodes.forEach((c) => collectRuns(c, next, out));
}

function htmlToBlocks(html: string): Block[] {
  const root = new DOMParser().parseFromString(`<body>${sanitizeHtml(html)}</body>`, 'text/html').body;
  const blocks: Block[] = [];
  const push = (el: Element, style?: Block['style'], prefix = '') => {
    const runs: Run[] = [];
    if (prefix) runs.push({ text: prefix });
    el.childNodes.forEach((c) => collectRuns(c, {}, runs));
    blocks.push({ runs, style, align: (el as HTMLElement).style?.textAlign || undefined });
  };
  const visit = (parent: Element) => {
    let loose: Run[] = [];
    const flush = () => {
      if (loose.some((r) => r.text.trim())) blocks.push({ runs: loose });
      loose = [];
    };
    parent.childNodes.forEach((n) => {
      if (n instanceof HTMLElement && /^(P|H1|H2|H3|BLOCKQUOTE|UL|OL|DIV|HR)$/.test(n.tagName)) {
        flush();
        if (n.tagName === 'H1') push(n, 'Heading1');
        else if (n.tagName === 'H2') push(n, 'Heading2');
        else if (n.tagName === 'H3') push(n, 'Heading3');
        else if (n.tagName === 'BLOCKQUOTE') push(n, 'Quote');
        else if (n.tagName === 'UL' || n.tagName === 'OL') {
          let idx = 1;
          n.querySelectorAll(':scope > li').forEach((li) => push(li, 'ListParagraph', n.tagName === 'OL' ? `${idx++}. ` : '• '));
        } else if (n.tagName === 'DIV' && n.querySelector('p,h1,h2,h3,ul,ol,blockquote,div')) visit(n);
        else if (n.tagName === 'HR') blocks.push({ runs: [{ text: '' }] });
        else push(n);
      } else collectRuns(n, {}, loose);
    });
    flush();
  };
  visit(root);
  return blocks.length ? blocks : [{ runs: [{ text: htmlToText(html) }] }];
}

const xml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function runXml(r: Run) {
  const props = `${r.b ? '<w:b/>' : ''}${r.i ? '<w:i/>' : ''}${r.u ? '<w:u w:val="single"/>' : ''}`;
  const parts = r.text.normalize('NFC').split('\n');
  const body = parts.map((p, k) => `${k ? '<w:br/>' : ''}<w:t xml:space="preserve">${xml(p)}</w:t>`).join('');
  return `<w:r>${props ? `<w:rPr>${props}</w:rPr>` : ''}${body}</w:r>`;
}

export function buildDocx(title: string, html: string): Uint8Array {
  const paragraphs = htmlToBlocks(html).map((b) => {
    const pPr = `${b.style ? `<w:pStyle w:val="${b.style}"/>` : ''}${b.align ? `<w:jc w:val="${b.align === 'justify' ? 'both' : b.align}"/>` : ''}`;
    return `<w:p>${pPr ? `<w:pPr>${pPr}</w:pPr>` : ''}${b.runs.map(runXml).join('')}</w:p>`;
  });
  const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="${W_NS}"><w:body><w:p><w:pPr><w:pStyle w:val="Title"/></w:pPr>${runXml({ text: title })}</w:p>${paragraphs.join('')}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1247" w:right="1134" w:bottom="1247" w:left="1134" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>`;
  // Police avec ɛ ɔ ŋ et diacritiques : Charis SIL si installée, sinon Cambria/Times (repli Unicode de Word).
  const fonts = '<w:rFonts w:ascii="Charis SIL" w:hAnsi="Charis SIL" w:cs="Charis SIL" w:eastAsia="Cambria"/>';
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="${W_NS}"><w:docDefaults><w:rPrDefault><w:rPr>${fonts}<w:sz w:val="24"/><w:szCs w:val="24"/><w:lang w:val="fr-FR" w:eastAsia="fr-FR" w:bidi="ar-SA"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="140" w:line="320" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>
<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="240"/></w:pPr><w:rPr><w:b/><w:color w:val="9C6B1D"/><w:sz w:val="44"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="280" w:after="120"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:sz w:val="36"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="220" w:after="100"/><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:b/><w:sz w:val="30"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:outlineLvl w:val="2"/></w:pPr><w:rPr><w:b/><w:sz w:val="26"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Quote"><w:name w:val="Quote"/><w:basedOn w:val="Normal"/><w:pPr><w:ind w:left="567"/></w:pPr><w:rPr><w:i/><w:color w:val="3A3448"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="ListParagraph"><w:name w:val="List Paragraph"/><w:basedOn w:val="Normal"/><w:pPr><w:ind w:left="567" w:hanging="283"/></w:pPr></w:style></w:styles>`;
  const files = {
    '[Content_Types].xml': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`),
    '_rels/.rels': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`),
    'word/_rels/document.xml.rels': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`),
    'word/document.xml': strToU8(document),
    'word/styles.xml': strToU8(styles),
  };
  return zipSync(files, { level: 6 });
}

export function exportDocx(title: string, html: string) {
  const bytes = buildDocx(title, html);
  download(new Blob([bytes as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }), `${slugify(title)}.docx`);
}

// ───────────────────────────── Import ─────────────────────────────
export function parseDocx(buffer: ArrayBuffer): { title: string; html: string } {
  const zip = unzipSync(new Uint8Array(buffer), { filter: (f) => f.name === 'word/document.xml' });
  const raw = zip['word/document.xml'];
  if (!raw) throw new Error('Fichier DOCX invalide (word/document.xml absent)');
  const doc = new DOMParser().parseFromString(strFromU8(raw), 'application/xml');
  if (doc.querySelector('parsererror')) throw new Error('Fichier DOCX illisible');
  const w = (el: Element | Document, tag: string) => Array.from(el.getElementsByTagNameNS(W_NS, tag));
  const html: string[] = [];
  let title = '';
  for (const p of w(doc, 'p')) {
    const style = w(p, 'pStyle')[0]?.getAttributeNS(W_NS, 'val') ?? '';
    let inner = '';
    for (const r of w(p, 'r')) {
      let t = '';
      r.childNodes.forEach((c) => {
        const el = c as Element;
        if (el.localName === 't') t += escapeHtml(el.textContent ?? '');
        else if (el.localName === 'br') t += '<br>';
        else if (el.localName === 'tab') t += '&emsp;';
      });
      if (!t) continue;
      const rPr = w(r, 'rPr')[0];
      const on = (tag: string) => {
        const el = rPr && w(rPr, tag)[0];
        return !!el && el.getAttributeNS(W_NS, 'val') !== 'false' && el.getAttributeNS(W_NS, 'val') !== '0';
      };
      if (on('b')) t = `<b>${t}</b>`;
      if (on('i')) t = `<i>${t}</i>`;
      if (w(r, 'u')[0] && rPr && w(rPr, 'u')[0]?.getAttributeNS(W_NS, 'val') !== 'none') t = `<u>${t}</u>`;
      inner += t;
    }
    const plain = (p.textContent ?? '').trim();
    if (!plain) continue;
    if (/^Title$/i.test(style) && !title) {
      title = plain; // le titre Word devient le titre du document
      continue;
    }
    const bullet = /^(?:•|-|\*)\s/.test(plain);
    const numbered = /^\d+[.)]\s/.test(plain);
    if (/^ListParagraph$/i.test(style) || bullet || numbered) {
      const kind = numbered ? 'ol' : 'ul';
      const item = inner.replace(/^(?:<[biu]>)*(?:•|-|\*|\d+[.)])\s+/, (m) => m.replace(/(?:•|-|\*|\d+[.)])\s+$/, ''));
      const last = html[html.length - 1];
      if (last && last.startsWith(`<${kind}>`)) html[html.length - 1] = last.replace(`</${kind}>`, `<li>${item}</li></${kind}>`);
      else html.push(`<${kind}><li>${item}</li></${kind}>`);
      continue;
    }
    const level = /^Heading\s?([1-3])$/i.exec(style)?.[1] ?? '';
    html.push(level ? `<h${level}>${inner}</h${level}>` : `<p>${inner}</p>`);
  }
  return { title, html: sanitizeHtml(html.join('')) };
}

export async function importDocumentFile(file: File): Promise<{ title: string; html: string }> {
  const name = file.name.replace(/\.[^.]+$/, '');
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext === 'txt' || ext === 'md' || file.type === 'text/plain') {
    const text = (await file.text()).replace(/^\uFEFF/, '').normalize('NFC');
    return { title: name, html: textToHtml(text) };
  }
  if (ext === 'docx') {
    const parsed = parseDocx(await file.arrayBuffer());
    return { title: parsed.title || name, html: parsed.html };
  }
  throw new Error('Format non pris en charge pour l’import direct (TXT, DOCX). Utilisez « Scanner » pour les PDF et images.');
}
