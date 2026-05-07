/**
 * Cloud sync layer for the Classe module.
 *
 * Strategy: localStorage stays the primary store for instant UX and offline support.
 * When the user is authenticated, every write is mirrored to Supabase via debounced
 * upserts. On login, a one-time migration pushes all existing local data to the cloud.
 *
 * Public API consumed by ClasseCalculView, ClasseGestionN2, ClasseEvaluation, etc.
 */
import { supabase } from '@/integrations/supabase/client';

type Level = 'N1' | 'N2';
type Module = 'lesson' | 'calcul' | 'evaluation' | 'gestion' | 'grammaire' | 'textprod';

let currentUserId: string | null = null;

// Initialize listener — call once on app boot from AuthContext side-effect (already in place)
supabase.auth.getSession().then(({ data }) => {
  currentUserId = data.session?.user?.id ?? null;
  if (currentUserId) void migrateLocalToCloud();
});
supabase.auth.onAuthStateChange((event, session) => {
  currentUserId = session?.user?.id ?? null;
  if (event === 'SIGNED_IN' && currentUserId) void migrateLocalToCloud();
});

export function isAuthenticated(): boolean {
  return !!currentUserId;
}

// ─────────────────────────────────────────────────────────────────
// Debounced upsert for ANSWERS
// ─────────────────────────────────────────────────────────────────
const answerTimers = new Map<string, ReturnType<typeof setTimeout>>();

export function syncAnswer(params: {
  level: Level;
  module: Module;
  lessonId: string;
  sectionKey?: string;
  questionIdx?: number;
  answerText?: string | null;
  fieldData?: unknown;
  score?: number | null;
  maxScore?: number | null;
  answerAudioPath?: string | null;
  answerAudioDuration?: number | null;
}) {
  if (!currentUserId) return;
  const key = `${params.level}|${params.module}|${params.lessonId}|${params.sectionKey ?? ''}|${params.questionIdx ?? 0}`;
  const existing = answerTimers.get(key);
  if (existing) clearTimeout(existing);

  const t = setTimeout(async () => {
    try {
      await supabase.from('classe_student_answers').upsert(
        {
          user_id: currentUserId!,
          level: params.level,
          module: params.module,
          lesson_id: params.lessonId,
          section_key: params.sectionKey ?? '',
          question_idx: params.questionIdx ?? 0,
          answer_text: params.answerText ?? null,
          field_data: params.fieldData as never,
          score: params.score ?? null,
          max_score: params.maxScore ?? null,
          ...(params.answerAudioPath !== undefined ? { answer_audio_path: params.answerAudioPath } : {}),
          ...(params.answerAudioDuration !== undefined ? { answer_audio_duration: params.answerAudioDuration } : {}),
          submitted_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,level,module,lesson_id,section_key,question_idx' },
      );
    } catch (e) {
      console.warn('[classeSync] answer upsert failed', e);
    } finally {
      answerTimers.delete(key);
    }
  }, 800);

  answerTimers.set(key, t);
}

// ─────────────────────────────────────────────────────────────────
// Debounced upsert for PROGRESS
// ─────────────────────────────────────────────────────────────────
const progressTimers = new Map<Level, ReturnType<typeof setTimeout>>();

export function syncProgress(level: Level, snapshot: {
  completedLessons?: number[];
  lessonStars?: Record<string, number>;
  tabsCompleted?: Record<string, boolean>;
  lastLesson?: number;
  themeBadges?: string[];
  extra?: Record<string, unknown>;
}) {
  if (!currentUserId) return;
  const existing = progressTimers.get(level);
  if (existing) clearTimeout(existing);

  const t = setTimeout(async () => {
    try {
      await supabase.from('classe_student_progress').upsert(
        {
          user_id: currentUserId!,
          level,
          completed_lessons: snapshot.completedLessons ?? [],
          lesson_stars: (snapshot.lessonStars ?? {}) as never,
          tabs_completed: (snapshot.tabsCompleted ?? {}) as never,
          last_lesson_id: snapshot.lastLesson ?? null,
          theme_badges: snapshot.themeBadges ?? [],
          extra_data: (snapshot.extra ?? {}) as never,
        },
        { onConflict: 'user_id,level' },
      );
    } catch (e) {
      console.warn('[classeSync] progress upsert failed', e);
    } finally {
      progressTimers.delete(level);
    }
  }, 1200);

  progressTimers.set(level, t);
}

// ─────────────────────────────────────────────────────────────────
// Evaluation results
// ─────────────────────────────────────────────────────────────────
export async function syncEvaluation(level: Level, evaluationId: string, score: number, maxScore = 20, details?: unknown) {
  if (!currentUserId) return;
  try {
    // fetch existing best
    const { data: existing } = await supabase
      .from('classe_evaluation_results')
      .select('best_score, attempts')
      .eq('user_id', currentUserId)
      .eq('level', level)
      .eq('evaluation_id', evaluationId)
      .maybeSingle();

    const bestScore = Math.max(existing?.best_score ?? 0, score);
    const attempts = (existing?.attempts ?? 0) + 1;

    await supabase.from('classe_evaluation_results').upsert(
      {
        user_id: currentUserId!,
        level,
        evaluation_id: evaluationId,
        score,
        best_score: bestScore,
        max_score: maxScore,
        attempts,
        details: details as never,
        completed_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,level,evaluation_id' },
    );
  } catch (e) {
    console.warn('[classeSync] evaluation upsert failed', e);
  }
}

// ─────────────────────────────────────────────────────────────────
// One-time migration of localStorage → cloud (on first login)
// ─────────────────────────────────────────────────────────────────
const MIGRATION_FLAG = 'classe_cloud_migrated_v1';

async function migrateLocalToCloud() {
  if (!currentUserId) return;
  if (localStorage.getItem(`${MIGRATION_FLAG}_${currentUserId}`)) return;

  try {
    const n1Raw = localStorage.getItem('classe_progress');
    const n2Raw = localStorage.getItem('classe_n2_progress');
    const gestionRaw = localStorage.getItem('classe_n2_gestion');

    if (n1Raw) {
      const p = JSON.parse(n1Raw);
      syncProgress('N1', {
        completedLessons: p.completedLessons,
        lessonStars: p.lessonStars,
        tabsCompleted: p.tabsCompleted,
        lastLesson: p.lastLesson,
        themeBadges: p.themeBadges,
      });
      // push answers
      Object.entries(p.calculAnswers || {}).forEach(([k, v]) => {
        const [lessonId, sectionKey, qIdx] = k.split('|');
        syncAnswer({ level: 'N1', module: 'calcul', lessonId, sectionKey, questionIdx: Number(qIdx), answerText: String(v) });
      });
      Object.entries(p.evaluationBest || {}).forEach(([id, score]) => {
        void syncEvaluation('N1', String(id), Number(score));
      });
    }

    if (n2Raw) {
      const p = JSON.parse(n2Raw);
      syncProgress('N2', {
        completedLessons: p.completedLessons,
        lessonStars: p.lessonStars,
        tabsCompleted: p.tabsCompleted,
        lastLesson: p.lastLesson,
        themeBadges: p.themeBadges,
      });
      Object.entries(p.calculAnswers || {}).forEach(([k, v]) => {
        const [lessonId, sectionKey, qIdx] = k.split('|');
        syncAnswer({ level: 'N2', module: 'calcul', lessonId, sectionKey, questionIdx: Number(qIdx), answerText: String(v) });
      });
      Object.entries(p.evaluationBest || {}).forEach(([id, score]) => {
        void syncEvaluation('N2', String(id), Number(score));
      });
    }

    if (gestionRaw) {
      const g = JSON.parse(gestionRaw);
      Object.entries(g.formData || {}).forEach(([docId, fields]) => {
        syncAnswer({ level: 'N2', module: 'gestion', lessonId: docId, sectionKey: 'form', fieldData: fields });
      });
      Object.entries(g.tableData || {}).forEach(([docId, rows]) => {
        syncAnswer({ level: 'N2', module: 'gestion', lessonId: docId, sectionKey: 'table', fieldData: rows });
      });
      Object.entries(g.qaAnswers || {}).forEach(([k, v]) => {
        const [docId, qIdx] = k.split('_');
        syncAnswer({ level: 'N2', module: 'gestion', lessonId: docId, sectionKey: 'qa', questionIdx: Number(qIdx), answerText: String(v) });
      });
    }

    localStorage.setItem(`${MIGRATION_FLAG}_${currentUserId}`, '1');
  } catch (e) {
    console.warn('[classeSync] migration failed', e);
  }
}
