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

export type ModuleKey =
  | 'lang' | 'calcul' | 'eval'
  | 'alphabet'
  | 'gestion' | 'grammaire' | 'textprod';
// Modules supplémentaires couverts (alphabet du N1, et les 3 modules N2 spécialisés)
// On garde 'lang' / 'calcul' / 'eval' pour la compat existante,
// et on ajoute 'alphabet' (N1), 'gestion' / 'grammaire' / 'textprod' (N2).

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

// ─── ALPHABET (N1) ───────────────────────────────────────────────────────────
function pushAlphabetItems(items: ContentItem[]) {
  const base = `classe/N1/alphabet/0`;
  const baseLabel = `N1 · Alphabet`;
  // Title
  items.push({
    content_key: `${base}/title`,
    content_type: 'title',
    content_text: 'Alphabet du Baatonum',
    level: 'N1', module: 'alphabet', lesson_id: 0,
    section_key: 'title',
    hierarchy_label: `${baseLabel} · Titre`,
  });
  const groups: Array<[keyof typeof BARIBA_ALPHABET, string, string]> = [
    ['vowels', 'vowels', 'Voyelle'],
    ['consonants', 'consonants', 'Consonne'],
    ['nasalVowels', 'nasals', 'Voyelle nasale'],
    ['toneMarkers', 'tones', 'Ton'],
  ];
  for (const [key, secKey, label] of groups) {
    const arr = (BARIBA_ALPHABET as any)[key] as string[];
    arr.forEach((letter, idx) => {
      const txt = trim(letter);
      if (!txt) return;
      items.push({
        content_key: `${base}/${secKey}/${idx}`,
        content_type: 'word',
        content_text: txt,
        level: 'N1', module: 'alphabet', lesson_id: 0,
        section_key: secKey,
        item_index: idx,
        hierarchy_label: `${baseLabel} · ${label} ${idx + 1} (${txt})`,
      });
    });
  }
}

// ─── ANSWERS (N1 & N2) ───────────────────────────────────────────────────────
function pushAnswersItems(
  items: ContentItem[],
  answers: Record<number, { observe?: string[]; ecoute?: string[]; reagis?: string[]; retiens?: string[] }>,
  level: 'N1' | 'N2',
) {
  for (const [lessonIdStr, byKey] of Object.entries(answers)) {
    const lessonId = Number(lessonIdStr);
    const base = `classe/${level}/lang/${lessonId}`;
    const baseLabel = `${level} · Langue · L${lessonId}`;
    const labels: Record<string, string> = {
      observe: 'Observe',
      ecoute: 'Écoute',
      reagis: 'Réagis',
      retiens: 'Retiens',
    };
    for (const [secKey, arr] of Object.entries(byKey)) {
      (arr || []).forEach((ans, idx) => {
        const txt = trim(ans);
        if (!txt) return;
        items.push({
          content_key: `${base}/${secKey}/answer/${idx}`,
          content_type: 'answer',
          content_text: txt,
          level, module: 'lang', lesson_id: lessonId,
          section_key: `${secKey}_answer`,
          item_index: idx,
          hierarchy_label: `${baseLabel} · ${labels[secKey] ?? secKey} Réponse ${idx + 1}`,
        });
      });
    }
  }
}

// ─── GESTION N2 ──────────────────────────────────────────────────────────────
function pushGestionItems(items: ContentItem[]) {
  GESTION_N2_DOCUMENTS.forEach((doc, dIdx) => {
    const lessonId = dIdx + 1;
    const base = `classe/N2/gestion/${lessonId}`;
    const baseLabel = `N2 · Gestion · ${doc.titleFr}`;
    items.push({
      content_key: `${base}/title`,
      content_type: 'title',
      content_text: trim(doc.title) || trim(doc.titleFr),
      level: 'N2', module: 'gestion', lesson_id: lessonId,
      section_key: 'title',
      hierarchy_label: `${baseLabel} · Titre`,
    });
    if (doc.definition) {
      items.push({
        content_key: `${base}/definition`,
        content_type: 'text',
        content_text: trim(doc.definition),
        level: 'N2', module: 'gestion', lesson_id: lessonId,
        section_key: 'definition',
        hierarchy_label: `${baseLabel} · Définition`,
      });
    }
    if (doc.formula) {
      items.push({
        content_key: `${base}/formula`,
        content_type: 'instruction',
        content_text: trim(doc.formula),
        level: 'N2', module: 'gestion', lesson_id: lessonId,
        section_key: 'formula',
        hierarchy_label: `${baseLabel} · Formule`,
      });
    }
    (doc.fields || []).forEach((f, idx) => {
      const txt = trim(f.label);
      if (!txt) return;
      items.push({
        content_key: `${base}/field/${idx}`,
        content_type: 'instruction',
        content_text: txt,
        level: 'N2', module: 'gestion', lesson_id: lessonId,
        section_key: 'field',
        item_index: idx,
        hierarchy_label: `${baseLabel} · Champ ${idx + 1} (${f.labelFr})`,
      });
    });
    (doc.qaQuestions || []).forEach((q, idx) => {
      const txt = trim(q.ba);
      if (!txt) return;
      items.push({
        content_key: `${base}/qa/${idx}`,
        content_type: 'question',
        content_text: txt,
        level: 'N2', module: 'gestion', lesson_id: lessonId,
        section_key: 'qa',
        item_index: idx,
        hierarchy_label: `${baseLabel} · Question ${idx + 1}`,
      });
    });
  });
}

// ─── GRAMMAIRE N2 (Alphabet, Tons, Classes, Noms, Verbes/Pronoms, Décompo, Temps) ──
function pushGrammarItems(items: ContentItem[]) {
  GRAMMAR_N2_SECTIONS.forEach((sec, sIdx) => {
    const lessonId = sIdx + 1;
    const base = `classe/N2/grammaire/${lessonId}`;
    const baseLabel = `N2 · Grammaire · ${sec.titleFr}`;
    items.push({
      content_key: `${base}/title`,
      content_type: 'title',
      content_text: trim(sec.title) || trim(sec.titleFr),
      level: 'N2', module: 'grammaire', lesson_id: lessonId,
      section_key: 'title',
      hierarchy_label: `${baseLabel} · Titre`,
    });
    (sec.content || []).forEach((block, bIdx) => {
      // Title of the block
      if (block.title) {
        items.push({
          content_key: `${base}/block/${bIdx}/title`,
          content_type: 'title',
          content_text: trim(block.title),
          level: 'N2', module: 'grammaire', lesson_id: lessonId,
          section_key: 'block_title',
          item_index: bIdx,
          hierarchy_label: `${baseLabel} · Bloc ${bIdx + 1} · Titre`,
        });
      }
      if (block.content) {
        items.push({
          content_key: `${base}/block/${bIdx}/content`,
          content_type: 'text',
          content_text: trim(block.content),
          level: 'N2', module: 'grammaire', lesson_id: lessonId,
          section_key: 'block_content',
          item_index: bIdx,
          hierarchy_label: `${baseLabel} · Bloc ${bIdx + 1} · Contenu`,
        });
      }
      (block.items || []).forEach((it, iIdx) => {
        const txt = trim(it);
        if (!txt) return;
        items.push({
          content_key: `${base}/block/${bIdx}/item/${iIdx}`,
          content_type: 'instruction',
          content_text: txt,
          level: 'N2', module: 'grammaire', lesson_id: lessonId,
          section_key: 'block_item',
          item_index: iIdx,
          hierarchy_label: `${baseLabel} · Bloc ${bIdx + 1} · Item ${iIdx + 1}`,
        });
      });
      (block.rows || []).forEach((row, rIdx) => {
        const txt = trim(row.join(' · '));
        if (!txt) return;
        items.push({
          content_key: `${base}/block/${bIdx}/row/${rIdx}`,
          content_type: 'instruction',
          content_text: txt,
          level: 'N2', module: 'grammaire', lesson_id: lessonId,
          section_key: 'block_row',
          item_index: rIdx,
          hierarchy_label: `${baseLabel} · Bloc ${bIdx + 1} · Ligne ${rIdx + 1}`,
        });
      });
    });
    (sec.quiz || []).forEach((q, qIdx) => {
      const txt = trim(q.question);
      if (!txt) return;
      items.push({
        content_key: `${base}/quiz/${qIdx}/q`,
        content_type: 'question',
        content_text: txt,
        level: 'N2', module: 'grammaire', lesson_id: lessonId,
        section_key: 'quiz_question',
        item_index: qIdx,
        hierarchy_label: `${baseLabel} · Quiz ${qIdx + 1} · Question`,
      });
      const correct = trim(q.options?.[q.correct] || '');
      if (correct) {
        items.push({
          content_key: `${base}/quiz/${qIdx}/answer`,
          content_type: 'answer',
          content_text: correct,
          level: 'N2', module: 'grammaire', lesson_id: lessonId,
          section_key: 'quiz_answer',
          item_index: qIdx,
          hierarchy_label: `${baseLabel} · Quiz ${qIdx + 1} · Réponse`,
        });
      }
      if (q.explanation) {
        items.push({
          content_key: `${base}/quiz/${qIdx}/explanation`,
          content_type: 'text',
          content_text: trim(q.explanation),
          level: 'N2', module: 'grammaire', lesson_id: lessonId,
          section_key: 'quiz_explanation',
          item_index: qIdx,
          hierarchy_label: `${baseLabel} · Quiz ${qIdx + 1} · Explication`,
        });
      }
    });
  });
}

// ─── PRODUCTION DE TEXTES N2 ─────────────────────────────────────────────────
function pushTextProdItems(items: ContentItem[]) {
  TEXT_PRODUCTION_TYPES.forEach((t, tIdx) => {
    const lessonId = tIdx + 1;
    const base = `classe/N2/textprod/${lessonId}`;
    const baseLabel = `N2 · Production · ${t.titleFr}`;
    items.push({
      content_key: `${base}/title`,
      content_type: 'title',
      content_text: trim(t.title) || trim(t.titleFr),
      level: 'N2', module: 'textprod', lesson_id: lessonId,
      section_key: 'title',
      hierarchy_label: `${baseLabel} · Titre`,
    });
    if (t.definition) {
      items.push({
        content_key: `${base}/definition`,
        content_type: 'text',
        content_text: trim(t.definition),
        level: 'N2', module: 'textprod', lesson_id: lessonId,
        section_key: 'definition',
        hierarchy_label: `${baseLabel} · Définition`,
      });
    }
    (t.characteristics || []).forEach((c, idx) => {
      const txt = trim(c);
      if (!txt) return;
      items.push({
        content_key: `${base}/characteristic/${idx}`,
        content_type: 'instruction',
        content_text: txt,
        level: 'N2', module: 'textprod', lesson_id: lessonId,
        section_key: 'characteristic',
        item_index: idx,
        hierarchy_label: `${baseLabel} · Caractéristique ${idx + 1}`,
      });
    });
    (t.structure || []).forEach((f, idx) => {
      const txt = trim(f.label);
      if (!txt) return;
      items.push({
        content_key: `${base}/structure/${idx}`,
        content_type: 'instruction',
        content_text: txt,
        level: 'N2', module: 'textprod', lesson_id: lessonId,
        section_key: 'structure',
        item_index: idx,
        hierarchy_label: `${baseLabel} · Structure ${idx + 1} (${f.labelFr})`,
      });
    });
    if (t.example) {
      items.push({
        content_key: `${base}/example`,
        content_type: 'text',
        content_text: trim(t.example),
        level: 'N2', module: 'textprod', lesson_id: lessonId,
        section_key: 'example',
        hierarchy_label: `${baseLabel} · Exemple`,
      });
    }
    if (t.exercisePrompt) {
      items.push({
        content_key: `${base}/exercise`,
        content_type: 'exercise',
        content_text: trim(t.exercisePrompt),
        level: 'N2', module: 'textprod', lesson_id: lessonId,
        section_key: 'exercise',
        hierarchy_label: `${baseLabel} · Consigne d'exercice`,
      });
    }
  });
}

let _cache: ContentItem[] | null = null;

export function getAllContentItems(): ContentItem[] {
  if (_cache) return _cache;
  const items: ContentItem[] = [];

  // N1 langue
  CLASSE_LESSONS.forEach(l => pushLessonItems(items, l as any, 'N1', 'lang', 'Langue'));
  // N1 évaluations
  CLASSE_EVALUATIONS.forEach(ev => pushEvaluationItems(items, ev, 'N1'));
  // N1 calcul + exercices
  CALCUL_LESSONS.forEach(l => pushCalculItems(items, l as any, 'N1', (CALCUL_EXERCISES as any)?.[l.id]));
  // N1 alphabet (voyelles, consonnes, nasales, tons)
  pushAlphabetItems(items);
  // N1 réponses
  pushAnswersItems(items, LESSON_ANSWERS as any, 'N1');

  // N2 langue
  CLASSE_N2_LESSONS.forEach(l => pushLessonItems(items, l as any, 'N2', 'lang', 'Langue'));
  // N2 évaluations
  CLASSE_N2_EVALUATIONS.forEach(ev => pushEvaluationItems(items, ev, 'N2'));
  // N2 calcul + exercises
  CALCUL_N2_LESSONS.forEach(l => pushCalculItems(items, l as any, 'N2', (CALCUL_N2_EXERCISES as any)?.[l.id]));
  // N2 réponses
  pushAnswersItems(items, LESSON_N2_ANSWERS as any, 'N2');
  // N2 grammaire (alphabet rappel, tons, classes, noms, verbes, décompo, temps)
  pushGrammarItems(items);
  // N2 gestion (7 documents)
  pushGestionItems(items);
  // N2 production de textes (6 types)
  pushTextProdItems(items);

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
  { level: 'N1', module: 'alphabet', label: 'Alphabet', emoji: '🔤' },
  { level: 'N1', module: 'lang',   label: 'Langue',       emoji: '📖' },
  { level: 'N1', module: 'calcul', label: 'Calcul',       emoji: '🔢' },
  { level: 'N1', module: 'eval',   label: 'Évaluations',  emoji: '📝' },
  { level: 'N2', module: 'lang',   label: 'Langue',       emoji: '📖' },
  { level: 'N2', module: 'calcul', label: 'Calcul',       emoji: '🔢' },
  { level: 'N2', module: 'eval',   label: 'Évaluations',  emoji: '📝' },
  { level: 'N2', module: 'grammaire', label: 'Grammaire',           emoji: '🧩' },
  { level: 'N2', module: 'gestion',   label: 'Gestion',             emoji: '📊' },
  { level: 'N2', module: 'textprod',  label: 'Production de textes', emoji: '✍️' },
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