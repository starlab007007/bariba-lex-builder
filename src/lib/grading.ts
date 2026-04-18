// ═══════════════════════════════════════════════════════════════════════════
// Système de notation pondéré : question → section → leçon → chapitre → global
// Toutes les notes sont normalisées sur 20.
// ═══════════════════════════════════════════════════════════════════════════

export interface QuestionGrade {
  level: string;
  module: string;
  lesson_id: string;
  section_key: string;
  question_idx: number;
  teacher_grade: number | null;
  weight?: number; // poids dans la section, défaut 1
}

export interface WeightRow {
  level: string;
  module: string;
  lesson_id: string;
  section_key: string;
  question_idx: number;
  weight: number;
  section_weight: number;
  lesson_weight: number;
}

export type Appreciation =
  | 'Excellent'
  | 'Très bien'
  | 'Bien'
  | 'Assez bien'
  | 'Passable'
  | 'Insuffisant'
  | 'À revoir';

export const APPRECIATION_COLORS: Record<Appreciation, string> = {
  'Excellent': 'text-emerald-600 bg-emerald-50 border-emerald-200',
  'Très bien': 'text-green-600 bg-green-50 border-green-200',
  'Bien': 'text-blue-600 bg-blue-50 border-blue-200',
  'Assez bien': 'text-amber-600 bg-amber-50 border-amber-200',
  'Passable': 'text-orange-600 bg-orange-50 border-orange-200',
  'Insuffisant': 'text-rose-600 bg-rose-50 border-rose-200',
  'À revoir': 'text-red-600 bg-red-50 border-red-200',
};

export function getAppreciation(grade: number | null): Appreciation {
  if (grade === null || grade === undefined || isNaN(grade)) return 'À revoir';
  if (grade >= 18) return 'Excellent';
  if (grade >= 16) return 'Très bien';
  if (grade >= 14) return 'Bien';
  if (grade >= 12) return 'Assez bien';
  if (grade >= 10) return 'Passable';
  if (grade >= 8) return 'Insuffisant';
  return 'À revoir';
}

/** Moyenne pondérée d'un ensemble {grade, weight} → /20 */
export function weightedAverage(items: { grade: number | null; weight: number }[]): number | null {
  const valid = items.filter((i) => i.grade !== null && !isNaN(i.grade as number));
  if (valid.length === 0) return null;
  const totalW = valid.reduce((s, i) => s + (i.weight || 1), 0);
  if (totalW === 0) return null;
  const sum = valid.reduce((s, i) => s + (i.grade as number) * (i.weight || 1), 0);
  return Math.round((sum / totalW) * 100) / 100;
}

/** Moyenne d'une section : pondérée par les poids des questions */
export function computeSectionAverage(questions: QuestionGrade[]): number | null {
  return weightedAverage(
    questions.map((q) => ({ grade: q.teacher_grade, weight: q.weight ?? 1 }))
  );
}

/** Construire le poids agrégé à partir des rows de la table classe_grade_weights */
export function getQuestionWeight(
  weights: WeightRow[],
  level: string,
  module: string,
  lesson_id: string,
  section_key: string,
  question_idx: number
): number {
  const w = weights.find(
    (r) =>
      r.level === level &&
      r.module === module &&
      r.lesson_id === lesson_id &&
      r.section_key === section_key &&
      r.question_idx === question_idx
  );
  return w?.weight ?? 1;
}

/** Hiérarchie complète : retourne la moyenne par leçon, section, chapitre, global */
export interface LessonReport {
  level: string;
  module: string;
  lesson_id: string;
  sections: SectionReport[];
  average: number | null;
  weight: number; // poids de la leçon dans son chapitre
}

export interface SectionReport {
  section_key: string;
  questions: QuestionGrade[];
  average: number | null;
  weight: number; // poids de la section dans la leçon
}

export interface ChapterReport {
  level: string;
  chapter_key: string;
  title_fr: string;
  lessons: LessonReport[];
  average: number | null;
}

export interface ModuleReport {
  module: string;
  level: string;
  chapters: ChapterReport[];
  average: number | null;
}

export interface GlobalReport {
  modules: ModuleReport[];
  global_average: number | null;
  total_graded: number;
  total_questions: number;
}

interface ChapterDef {
  level: string;
  chapter_key: string;
  title_fr: string;
  lesson_ids: string[];
}

export function buildGlobalReport(
  answers: QuestionGrade[],
  weights: WeightRow[],
  chapters: ChapterDef[]
): GlobalReport {
  // 1. Group by level + module
  const byModule = new Map<string, QuestionGrade[]>();
  for (const a of answers) {
    const key = `${a.level}::${a.module}`;
    if (!byModule.has(key)) byModule.set(key, []);
    byModule.get(key)!.push({
      ...a,
      weight: getQuestionWeight(weights, a.level, a.module, a.lesson_id, a.section_key, a.question_idx),
    });
  }

  const modules: ModuleReport[] = [];
  let totalGraded = 0;
  let totalQuestions = 0;

  for (const [key, modAnswers] of byModule) {
    const [level, module] = key.split('::');
    totalQuestions += modAnswers.length;
    totalGraded += modAnswers.filter((a) => a.teacher_grade !== null).length;

    // Group by lesson
    const byLesson = new Map<string, QuestionGrade[]>();
    for (const a of modAnswers) {
      if (!byLesson.has(a.lesson_id)) byLesson.set(a.lesson_id, []);
      byLesson.get(a.lesson_id)!.push(a);
    }

    const lessonReports: LessonReport[] = [];
    for (const [lesson_id, lessonAnswers] of byLesson) {
      // Group by section
      const bySection = new Map<string, QuestionGrade[]>();
      for (const a of lessonAnswers) {
        if (!bySection.has(a.section_key)) bySection.set(a.section_key, []);
        bySection.get(a.section_key)!.push(a);
      }

      const sectionReports: SectionReport[] = [];
      for (const [section_key, secAnswers] of bySection) {
        const weight =
          weights.find(
            (w) =>
              w.level === level &&
              w.module === module &&
              w.lesson_id === lesson_id &&
              w.section_key === section_key
          )?.section_weight ?? 1;
        sectionReports.push({
          section_key,
          questions: secAnswers,
          average: computeSectionAverage(secAnswers),
          weight,
        });
      }

      const lessonWeight =
        weights.find(
          (w) =>
            w.level === level && w.module === module && w.lesson_id === lesson_id
        )?.lesson_weight ?? 1;

      lessonReports.push({
        level,
        module,
        lesson_id,
        sections: sectionReports,
        average: weightedAverage(
          sectionReports.map((s) => ({ grade: s.average, weight: s.weight }))
        ),
        weight: lessonWeight,
      });
    }

    // Group lessons by chapter
    const chapterReports: ChapterReport[] = [];
    const usedLessons = new Set<string>();
    for (const ch of chapters.filter((c) => c.level === level)) {
      const chLessons = lessonReports.filter((l) => ch.lesson_ids.includes(l.lesson_id));
      chLessons.forEach((l) => usedLessons.add(l.lesson_id));
      if (chLessons.length === 0) continue;
      chapterReports.push({
        level,
        chapter_key: ch.chapter_key,
        title_fr: ch.title_fr,
        lessons: chLessons,
        average: weightedAverage(chLessons.map((l) => ({ grade: l.average, weight: l.weight }))),
      });
    }
    // Lessons not in any chapter → "Autres"
    const orphans = lessonReports.filter((l) => !usedLessons.has(l.lesson_id));
    if (orphans.length > 0) {
      chapterReports.push({
        level,
        chapter_key: '_orphans',
        title_fr: 'Autres leçons',
        lessons: orphans,
        average: weightedAverage(orphans.map((l) => ({ grade: l.average, weight: l.weight }))),
      });
    }

    modules.push({
      level,
      module,
      chapters: chapterReports,
      average: weightedAverage(chapterReports.map((c) => ({ grade: c.average, weight: 1 }))),
    });
  }

  return {
    modules,
    global_average: weightedAverage(modules.map((m) => ({ grade: m.average, weight: 1 }))),
    total_graded: totalGraded,
    total_questions: totalQuestions,
  };
}

export const MODULE_LABELS: Record<string, string> = {
  calcul: '🔢 Calcul',
  gestion: '💼 Gestion',
  lesson: '📖 Leçon',
  evaluation: '📝 Évaluation',
  grammaire: '📐 Grammaire',
  textprod: '✍️ Production écrite',
};
