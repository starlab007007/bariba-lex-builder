import type { ApprendreContentJson } from './content';
export type SpokenPart = { text: string; bariba: boolean };
export type PronunciationLexicon = { ba: Set<string>; fr: Set<string>; phrases: Map<string, string[]> };
const key = (text: string) => text.normalize('NFC').toLocaleLowerCase().trim();
const tokens = (text: string) => text.match(/-?[\p{L}\p{M}]+/gu) ?? [];
const distinctive = /[ɔɛƆƐŋɲʋǹ\u0303]/u;
const nativeColumns = new Set(['baatonu','baatonum','mot','mot forme','base','pronom','particule','terminaison','pluriel',"forme d'insistance",'exemple']);
const columnKey = (value: string) => value.normalize('NFD').replace(/\p{M}/gu, '').replace(/ɔ/g,'o').replace(/ɛ/g,'e').replace(/’/g,"'").toLowerCase();
export function isNativeColumn(label: string) { return nativeColumns.has(columnKey(label)); }
export function buildPronunciationLexicon(core: ApprendreContentJson, scenes?: unknown): PronunciationLexicon {
  const ba = new Set<string>(), fr = new Set<string>();
  const add = (value: string) => { if (!value.trim()) return; ba.add(key(value)); for (const word of tokens(value)) ba.add(key(word)); };
  const walk = (value: unknown, parent = '') => {
    if (Array.isArray(value)) { for (const item of value) walk(item, parent); return; }
    if (!value || typeof value !== 'object') return;
    const object = value as Record<string, unknown>;
    for (const [name, item] of Object.entries(object)) {
      if (typeof item === 'string') {
        if (['ba','text_ba','title_ba','ex_ba','pl','foc'].includes(name) || parent === 'conj') add(item);
        if (['fr','text_fr','ex_fr'].includes(name)) for (const word of tokens(item)) fr.add(key(word));
      } else walk(item, name);
    }
    if (object.type === 'order' && Array.isArray(object.ba)) for (const word of object.ba) if (typeof word === 'string') add(word);
    if (object.type === 'table' && Array.isArray(object.rows)) {
      const columns = Array.isArray(object.columns) ? object.columns : [];
      for (const row of object.rows) if (Array.isArray(row)) row.forEach((cell, index) => {
        if (typeof cell !== 'string' || !isNativeColumn(String(columns[index] ?? ''))) return;
        for (const suffix of cell.matchAll(/-[\p{L}\p{M}]+/gu)) add(suffix[0]);
        const prefix = cell.split(/\s+[—–]\s+/u)[0].split('(')[0];
        for (const part of prefix.split(/\s*(?:→|\/|,)\s*/u)) if (part.trim() && !/\b(?:ou|selon)\b/u.test(part)) add(part.replace(/^\+\s*/,''));
      });
    }
  };
  walk(core); if (scenes) walk(scenes);
  const phrases = new Map<string, string[]>();
  for (const phrase of ba) { const first = key(tokens(phrase)[0] ?? ''); if (!first) continue; const list = phrases.get(first) ?? []; list.push(phrase); phrases.set(first, list); }
  for (const list of phrases.values()) list.sort((a,b) => b.length - a.length);
  return { ba, fr, phrases };
}
function fragments(text: string, ranges: {start:number;end:number}[]): SpokenPart[] {
  const parts: SpokenPart[] = []; let offset = 0;
  for (const range of ranges.sort((a,b)=>a.start-b.start)) {
    if (range.start < offset || range.end <= range.start) continue;
    if (range.start > offset) parts.push({text:text.slice(offset,range.start),bariba:false});
    parts.push({text:text.slice(range.start,range.end),bariba:true}); offset=range.end;
  }
  if (offset < text.length) parts.push({text:text.slice(offset),bariba:false});
  return parts;
}
/** French prose is kept intact; only attested/explicitly quoted Bariba spans get audio. */
export function mixedPronunciationParts(text: string, lexicon?: PronunciationLexicon | null): SpokenPart[] {
  const ranges: {start:number;end:number}[] = [];
  for (const match of text.matchAll(/[«“`]([^»”`]+)[»”`]/gu)) {
    const value=match[1], normalized=key(value);
    if (lexicon?.ba.has(normalized)) { const start=match.index!+1+value.length-value.trimStart().length; ranges.push({start,end:start+value.trim().length}); }
  }
  const lower=text.normalize('NFC').toLocaleLowerCase();
  // Do not use normalized offsets if imported text is not NFC: preserving source is mandatory.
  const sameOffsets = text.normalize('NFC') === text;
  for (const match of text.matchAll(/-?[\p{L}\p{M}]+/gu)) {
    const start=match.index!, word=match[0]; if(ranges.some(range=>start>=range.start&&start<range.end))continue;
    const normalized=key(word);
    const phrase=sameOffsets ? lexicon?.phrases.get(normalized)?.find(candidate=>candidate.includes(' ')&&lower.startsWith(candidate,start)&&!/[\p{L}\p{M}]/u.test(text[start+candidate.length]??'')) : undefined;
    if(phrase){ranges.push({start,end:start+phrase.length});continue;}
    if(distinctive.test(word)||(lexicon?.ba.has(normalized)&&(normalized.length>=3||normalized.startsWith('-'))&&!lexicon.fr.has(normalized)))ranges.push({start,end:start+word.length});
  }
  return fragments(text,ranges);
}
export function tablePronunciationParts(text: string, label: string, lexicon?: PronunciationLexicon | null): SpokenPart[] {
  if(!isNativeColumn(label))return mixedPronunciationParts(text,lexicon);
  const ranges:{start:number;end:number}[]=[];
  const translated=text.search(/\s+[—–]\s+/u), end=translated>=0?translated:text.length;
  const prefix=text.slice(0,end), parenthesis=prefix.indexOf('('), limit=parenthesis>=0?parenthesis:prefix.length;
  const lead=prefix.slice(0,limit);
  for(const suffix of lead.matchAll(/-[\p{L}\p{M}]+/gu))ranges.push({start:suffix.index!,end:suffix.index!+suffix[0].length});
  for(const match of lead.matchAll(/[^→/,]+/gu)){
    const raw=match[0], trim=raw.trim().replace(/^\+\s*/,''), offset=raw.indexOf(trim);
    if(trim&&!/\b(?:ou|selon)\b/u.test(trim)&&/[\p{L}]/u.test(trim))ranges.push({start:match.index!+offset,end:match.index!+offset+trim.length});
  }
  // Parenthetical variants remain separate from their French explanation.
  if(parenthesis>=0){ const tail=prefix.slice(parenthesis); let offset=parenthesis; for(const part of mixedPronunciationParts(tail,lexicon)){if(part.bariba)ranges.push({start:offset,end:offset+part.text.length});offset+=part.text.length;} }
  return fragments(text,ranges);
}
export function optionsAreNative(options: string[], lexicon: PronunciationLexicon): boolean {
  return options.some(option=>lexicon.ba.has(key(option))) && options.every(option=>!option.includes(',')&&!lexicon.fr.has(key(option)));
}
