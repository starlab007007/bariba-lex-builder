// Génère la liste exhaustive de tous les éléments pédagogiques (N1+N2)
// avec une clé déterministe `content_key` utilisée pour lier 1 audio = 1 élément.

import { CLASSE_LESSONS, CLASSE_EVALUATIONS, CALCUL_LESSONS } from '@/data/classeContent';
import { CLASSE_N2_LESSONS, CLASSE_N2_EVALUATIONS, CALCUL_N2_LESSONS, CALCUL_N2_EXERCISES } from '@/data/classeContentN2';
import { BARIBA_ALPHABET, CALCUL_EXERCISES, LESSON_ANSWERS } from '@/data/classeContent';
import { LESSON_N2_ANSWERS } from '@/data/classeContentN2';
import { GESTION_N2_DOCUMENTS } from '@/data/classeContentN2Gestion';
import { GRAMMAR_N2_SECTIONS } from '@/data/classeContentN2Grammar';
import { TEXT_PRODUCTION_TYPES } from '@/data/classeContentN2TextProd';

export type ContentType =
  | 'text' | 'question' | 'phonetic' | 'word'
  | 'exercise' | 'instruction' | 'title' | 'answer';

export type ModuleKey = 'lang' | 'calcul' | 'eval' | 'gestion' | 'grammaire' | 'textprod';

export interface ContentItem {
  content_key: string;
  content_type: ContentType;
  content_text: string;
  level: 'N1' | 'N2';
  module: ModuleKey;
  lesson_id: number;
  section_key?: string;
  item_index?: number;
  hierarchy_label: string;
}

const trim = (s: string) => (s || '').trim();

function pushLessonItems(
  items: ContentItem[],
  lesson: { id: number; title: string; text: string; sections: any; phonetics?: any },
  level: 'N1' | 'N2',
  module: ModuleKey,
  moduleLabel: string,
) {
  const base = `classe/${level}/${module}/${lesson.id}`;
  const baseLabel = `${level} · ${moduleLabel} · L${lesson.id}`;

  // Title
  if (lesson.title) {
    items.push({
      content_key: `${base}/title`,
      content_type: 'title',
      content_text: trim(lesson.title),
      level, module, lesson_id: lesson.id,
      section_key: 'title',
      hierarchy_label: `${baseLabel} · Titre`,
    });
  }

  // Main text
  if (lesson.text) {
    items.push({
      content_key: `${base}/text`,
      content_type: 'text',
      content_text: trim(lesson.text),
      level, module, lesson_id: lesson.id,
      section_key: 'text',
      hierarchy_label: `${baseLabel} · Texte principal`,
    });
  }

  // Sections (observe / ecoute / reagis / retiens)
  const sectionLabels: Record<string, string> = {
    observe: 'Observe',
    ecoute: 'Écoute',
    reagis: 'Réagis',
    retiens: 'Retiens',
  };
  for (const [secKey, label] of Object.entries(sectionLabels)) {
    const arr: string[] = lesson.sections?.[secKey] ?? [];
    arr.forEach((q, idx) => {
      if (!trim(q)) return;
      items.push({
        content_key: `${base}/${secKey}/${idx}`,
        content_type: 'question',
        content_text: trim(q),
        level, module, lesson_id: lesson.id,
        section_key: secKey,
        item_index: idx,
        hierarchy_label: `${baseLabel} · ${label} Q${idx + 1}`,
      });
    });
  }

  // Phonetics (reading + writing)
  if (lesson.phonetics) {
    const reads: string[] = lesson.phonetics.reading ?? [];
    reads.forEach((line, idx) => {
      if (!trim(line)) return;
      items.push({
        content_key: `${base}/phonetics/reading/${idx}`,
        content_type: 'phonetic',
        content_text: trim(line),
        level, module, lesson_id: lesson.id,
        section_key: 'phonetics_reading',
        item_index: idx,
        hierarchy_label: `${baseLabel} · Phonétique Lecture L${idx + 1}`,
      });
    });
    const writes: string[] = lesson.phonetics.writing ?? [];
    writes.forEach((line, idx) => {
      if (!trim(line)) return;
      items.push({
        content_key: `${base}/phonetics/writing/${idx}`,
        content_type: 'phonetic',
        content_text: trim(line),
        level, module, lesson_id: lesson.id,
        section_key: 'phonetics_writing',
        item_index: idx,
        hierarchy_label: `${baseLabel} · Phonétique Écriture L${idx + 1}`,
      });
    });
  }
}

function pushEvaluationItems(items: ContentItem[], ev: any, level: 'N1' | 'N2') {
  const base = `classe/${level}/eval/${ev.id}`;
  const baseLabel = `${level} · Évaluation · E${ev.id}`;
  if (ev.title) {
    items.push({
      content_key: `${base}/title`,
      content_type: 'title',
      content_text: trim(ev.title),
      level, module: 'eval', lesson_id: ev.id,
      section_key: 'title',
      hierarchy_label: `${baseLabel} · Titre`,
    });
  }
  const qs: string[] = ev.allQuestions ?? [];
  qs.forEach((q, idx) => {
    if (!trim(q)) return;
    items.push({
      content_key: `${base}/q/${idx}`,
      content_type: 'question',
      content_text: trim(q),
      level, module: 'eval', lesson_id: ev.id,
      section_key: 'question',
      item_index: idx,
      hierarchy_label: `${baseLabel} · Q${idx + 1}`,
    });
  });
}

function pushCalculItems(
  items: ContentItem[],
  lesson: any,
  level: 'N1' | 'N2',
  exercises?: any[],
) {
  const base = `classe/${level}/calcul/${lesson.id}`;
  const baseLabel = `${level} · Calcul · L${lesson.id}`;
  if (lesson.title) {
    items.push({
      content_key: `${base}/title`,
      content_type: 'title',
      content_text: trim(lesson.title),
      level, module: 'calcul', lesson_id: lesson.id,
      section_key: 'title',
      hierarchy_label: `${baseLabel} · Titre`,
    });
  }
  if (lesson.text) {
    items.push({
      content_key: `${base}/text`,
      content_type: 'text',
      content_text: trim(lesson.text),
      level, module: 'calcul', lesson_id: lesson.id,
      section_key: 'text',
      hierarchy_label: `${baseLabel} · Énoncé`,
    });
  }
  if (Array.isArray(lesson.paragraphs)) {
    lesson.paragraphs.forEach((p: string, i: number) => {
      if (!trim(p)) return;
      items.push({
        content_key: `${base}/paragraph/${i}`,
        content_type: 'instruction',
        content_text: trim(p),
        level, module: 'calcul', lesson_id: lesson.id,
        section_key: 'paragraph',
        item_index: i,
        hierarchy_label: `${baseLabel} · Paragraphe ${i + 1}`,
      });
    });
  }
  if (lesson.sections) {
    for (const [secKey, arr] of Object.entries(lesson.sections as Record<string, string[]>)) {
      arr.forEach((q, idx) => {
        if (!trim(q)) return;
        items.push({
          content_key: `${base}/${secKey}/${idx}`,
          content_type: 'question',
          content_text: trim(q),
          level, module: 'calcul', lesson_id: lesson.id,
          section_key: secKey,
          item_index: idx,
          hierarchy_label: `${baseLabel} · ${secKey} ${idx + 1}`,
        });
      });
    }
  }
  if (exercises) {
    exercises.forEach((ex: any, idx: number) => {
      const txt = trim(ex.question || ex.statement || ex.label || '');
      if (!txt) return;
      items.push({
        content_key: `${base}/exercise/${idx}`,
        content_type: 'exercise',
        content_text: txt,
        level, module: 'calcul', lesson_id: lesson.id,
        section_key: 'exercise',
        item_index: idx,
        hierarchy_label: `${baseLabel} · Exercice ${idx + 1}`,
      });
    });
  }
}

let _cache: ContentItem[] | null = null;

export function getAllContentItems(): ContentItem[] {
  if (_cache) return _cache;
  const items: ContentItem[] = [];

  // N1 langue
  CLASSE_LESSONS.forEach(l => pushLessonItems(items, l as any, 'N1', 'lang', 'Langue'));
  // N1 évaluations
  CLASSE_EVALUATIONS.forEach(ev => pushEvaluationItems(items, ev, 'N1'));
  // N1 calcul
  CALCUL_LESSONS.forEach(l => pushCalculItems(items, l as any, 'N1'));

  // N2 langue
  CLASSE_N2_LESSONS.forEach(l => pushLessonItems(items, l as any, 'N2', 'lang', 'Langue'));
  // N2 évaluations
  CLASSE_N2_EVALUATIONS.forEach(ev => pushEvaluationItems(items, ev, 'N2'));
  // N2 calcul + exercises
  CALCUL_N2_LESSONS.forEach(l => pushCalculItems(items, l as any, 'N2', (CALCUL_N2_EXERCISES as any)?.[l.id]));

  _cache = items;
  return items;
}

/** All items for a given (level, module, lessonId) — ordered as in the manual. */
export function getLessonItems(level: 'N1' | 'N2', module: ModuleKey, lessonId: number): ContentItem[] {
  return getAllContentItems().filter(
    i => i.level === level && i.module === module && i.lesson_id === lessonId
  );
}

/** Distinct lessons for a (level, module). */
export function getLessonsForModule(level: 'N1' | 'N2', module: ModuleKey): { lesson_id: number; title: string; itemsCount: number }[] {
  const items = getAllContentItems().filter(i => i.level === level && i.module === module);
  const map = new Map<number, { title: string; count: number }>();
  for (const it of items) {
    const cur = map.get(it.lesson_id) ?? { title: '', count: 0 };
    if (!cur.title && it.section_key === 'title') cur.title = it.content_text;
    cur.count += 1;
    map.set(it.lesson_id, cur);
  }
  return Array.from(map.entries())
    .map(([lesson_id, v]) => ({ lesson_id, title: v.title || `L${lesson_id}`, itemsCount: v.count }))
    .sort((a, b) => a.lesson_id - b.lesson_id);
}

/** Module catalog used by the home selector. */
export const MODULE_CATALOG: Array<{ level: 'N1' | 'N2'; module: ModuleKey; label: string; emoji: string }> = [
  { level: 'N1', module: 'lang',   label: 'Langue',       emoji: '📖' },
  { level: 'N1', module: 'calcul', label: 'Calcul',       emoji: '🔢' },
  { level: 'N1', module: 'eval',   label: 'Évaluations',  emoji: '📝' },
  { level: 'N2', module: 'lang',   label: 'Langue',       emoji: '📖' },
  { level: 'N2', module: 'calcul', label: 'Calcul',       emoji: '🔢' },
  { level: 'N2', module: 'eval',   label: 'Évaluations',  emoji: '📝' },
];

export function moduleLabel(module: ModuleKey): string {
  return MODULE_CATALOG.find(m => m.module === module)?.label ?? module;
}

/** Stable short hash (djb2) for storage filename — not cryptographic. */
export function hashContentKey(key: string): string {
  let h = 5381;
  for (let i = 0; i < key.length; i++) h = ((h << 5) + h) ^ key.charCodeAt(i);
  return (h >>> 0).toString(36);
}

/** Quality score: 0–100, based on peak/RMS/duration heuristics. */
export function computeQualityScore(opts: {
  peakDb: number;
  rmsDb: number;
  durationSec: number;
  contentType: ContentType;
}): number {
  let score = 100;
  // Clipping penalty (peak should sit around -3 dBFS thanks to normalisation)
  if (opts.peakDb > -1) score -= 25;
  // Too quiet
  if (opts.rmsDb < -38) score -= 20;
  else if (opts.rmsDb < -32) score -= 8;
  // Duration sanity
  const ranges: Record<ContentType, [number, number]> = {
    text:        [4, 90],
    question:    [1.2, 15],
    phonetic:    [0.4, 8],
    word:        [0.3, 4],
    exercise:    [1, 12],
    instruction: [1, 20],
    title:       [0.4, 6],
    answer:      [0.5, 10],
  };
  const [minD, maxD] = ranges[opts.contentType] ?? [0.5, 60];
  if (opts.durationSec < minD) score -= 25;
  else if (opts.durationSec > maxD) score -= 15;
  if (opts.durationSec < 0.25) score -= 30;
  return Math.max(0, Math.min(100, Math.round(score)));
}