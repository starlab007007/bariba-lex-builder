import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CLASSE_LESSONS, CLASSE_EVALUATIONS } from '@/data/classeContent';
import { Loader2, BookOpen, ChevronRight, CheckCircle2, AlertCircle } from 'lucide-react';
import AnswerKeyEditor from '@/components/teacher/AnswerKeyEditor';
import type { AnswerKey } from '@/lib/answerKeys';

type Level = 'N1' | 'N2';
type ModuleKey = 'lesson' | 'evaluation' | 'calcul' | 'gestion' | 'grammaire' | 'textprod';

interface QuestionEntry {
  module: ModuleKey;
  lesson_id: string;
  lesson_label: string;
  section_key: string;
  question_idx: number;
  question_text: string;
}

function getN1Questions(): QuestionEntry[] {
  const out: QuestionEntry[] = [];
  // Leçons N1
  CLASSE_LESSONS.forEach(l => {
    (Object.entries(l.sections) as [string, string[]][]).forEach(([sec, qs]) => {
      qs.forEach((q, i) => {
        out.push({
          module: 'lesson',
          lesson_id: String(l.id),
          lesson_label: `L${l.id} · ${l.title}`,
          section_key: sec,
          question_idx: i,
          question_text: q,
        });
      });
    });
  });
  // Évaluations N1
  CLASSE_EVALUATIONS.forEach(ev => {
    (Object.entries(ev.sections) as [string, string[]][]).forEach(([sec, qs], si) => {
      qs.forEach((q, i) => {
        out.push({
          module: 'evaluation',
          lesson_id: String(ev.id),
          lesson_label: `Éval ${ev.id} · ${ev.title}`,
          section_key: String(si),
          question_idx: i,
          question_text: q,
        });
      });
    });
  });
  return out;
}

// Pour N2, la structure pédagogique exacte est dans les composants. On expose les leçons connues.
const N2_LESSONS_PLACEHOLDER: QuestionEntry[] = [
  { module: 'gestion', lesson_id: '1', lesson_label: 'N2 — Gestion (introduction)', section_key: '', question_idx: 0, question_text: 'Qu\'est-ce que la gestion ?' },
  { module: 'grammaire', lesson_id: '1', lesson_label: 'N2 — Grammaire (intro)', section_key: '', question_idx: 0, question_text: 'Décris une règle de grammaire.' },
  { module: 'textprod', lesson_id: '1', lesson_label: 'N2 — Production de texte', section_key: '', question_idx: 0, question_text: 'Rédige un court texte.' },
];

export default function AnswerKeysManager() {
  const [level, setLevel] = useState<Level>('N1');
  const [moduleFilter, setModuleFilter] = useState<ModuleKey | 'all'>('all');
  const [search, setSearch] = useState('');
  const [keys, setKeys] = useState<AnswerKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<QuestionEntry | null>(null);
  const [tick, setTick] = useState(0);

  const allQuestions = useMemo(() => level === 'N1' ? getN1Questions() : N2_LESSONS_PLACEHOLDER, [level]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('classe_answer_keys')
        .select('*')
        .eq('level', level);
      setKeys((data ?? []) as AnswerKey[]);
      setLoading(false);
    })();
  }, [level, tick]);

  const keyMap = useMemo(() => {
    const m = new Map<string, AnswerKey>();
    keys.forEach(k => m.set(`${k.module}|${k.lesson_id}|${k.section_key}|${k.question_idx}`, k));
    return m;
  }, [keys]);

  const visible = allQuestions.filter(q =>
    (moduleFilter === 'all' || q.module === moduleFilter) &&
    (!search || q.question_text.toLowerCase().includes(search.toLowerCase()) || q.lesson_label.toLowerCase().includes(search.toLowerCase()))
  );

  const grouped = useMemo(() => {
    const g = new Map<string, QuestionEntry[]>();
    visible.forEach(q => {
      const k = `${q.module}|${q.lesson_id}|${q.lesson_label}`;
      if (!g.has(k)) g.set(k, []);
      g.get(k)!.push(q);
    });
    return g;
  }, [visible]);

  const totalCovered = keys.filter(k => allQuestions.some(q => q.module === k.module && q.lesson_id === k.lesson_id && q.section_key === k.section_key && q.question_idx === k.question_idx)).length;

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-2xl bg-card border border-border">
        <div className="flex items-center gap-2 mb-3">
          <BookOpen className="w-5 h-5 text-amber-500" />
          <h1 className="font-black text-lg">📝 Corrigés officiels</h1>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Crée et gère les bonnes réponses qui s'afficheront automatiquement aux apprenants après leur soumission.
          <span className="font-bold ml-1 text-emerald-600">{totalCovered}</span>/{allQuestions.length} questions couvertes
        </p>
        <div className="flex flex-wrap gap-2">
          <div className="flex gap-1">
            {(['N1', 'N2'] as Level[]).map(lv => (
              <button
                key={lv}
                onClick={() => setLevel(lv)}
                className={`px-4 py-2 rounded-lg text-sm font-bold ${level === lv ? 'bg-amber-500 text-white' : 'bg-muted text-muted-foreground'}`}
              >
                {lv === 'N1' ? '🔥 Niveau 1' : '🚀 Niveau 2'}
              </button>
            ))}
          </div>
          <select value={moduleFilter} onChange={e => setModuleFilter(e.target.value as ModuleKey | 'all')} className="px-3 py-2 rounded-lg border border-border bg-background text-sm">
            <option value="all">Tous modules</option>
            <option value="lesson">Leçons</option>
            <option value="evaluation">Évaluations</option>
            <option value="calcul">Calcul</option>
            <option value="gestion">Gestion (N2)</option>
            <option value="grammaire">Grammaire (N2)</option>
            <option value="textprod">Production (N2)</option>
          </select>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="🔍 Rechercher question / leçon..."
            className="flex-1 min-w-[200px] px-3 py-2 rounded-lg border border-border bg-background text-sm"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : grouped.size === 0 ? (
        <p className="p-8 text-center text-muted-foreground rounded-2xl bg-muted/30">Aucune question ne correspond à ce filtre.</p>
      ) : (
        [...grouped.entries()].map(([groupKey, questions]) => (
          <div key={groupKey} className="rounded-2xl bg-card border border-border overflow-hidden">
            <div className="px-4 py-2 bg-muted/40 font-bold text-sm flex items-center gap-2">
              <ChevronRight className="w-4 h-4" />
              {questions[0].lesson_label}
              <span className="ml-auto text-xs font-normal text-muted-foreground">{questions.length} question(s)</span>
            </div>
            <div className="divide-y divide-border">
              {questions.map(q => {
                const k = keyMap.get(`${q.module}|${q.lesson_id}|${q.section_key}|${q.question_idx}`);
                const isEditingThis = editing && editing.module === q.module && editing.lesson_id === q.lesson_id && editing.section_key === q.section_key && editing.question_idx === q.question_idx;
                return (
                  <div key={`${q.section_key}_${q.question_idx}`} className="p-3 space-y-2">
                    <div className="flex items-start gap-2">
                      {k ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">{q.section_key && <span className="font-mono mr-1">[{q.section_key}]</span>}Q{q.question_idx + 1}</p>
                        <p className="text-sm">{q.question_text}</p>
                        {k && !isEditingThis && (
                          <div className="mt-1 text-xs">
                            <span className="font-bold text-emerald-600">✓ </span>
                            <span className="text-muted-foreground">{k.accepted_answers.slice(0, 2).join(' / ')}{k.accepted_answers.length > 2 ? '…' : ''}</span>
                          </div>
                        )}
                      </div>
                      {!isEditingThis && (
                        <button
                          onClick={() => setEditing(q)}
                          className="px-3 py-1 rounded-lg bg-amber-500 text-white text-xs font-bold hover:bg-amber-600"
                        >
                          {k ? 'Modifier' : 'Ajouter'}
                        </button>
                      )}
                    </div>
                    {isEditingThis && (
                      <AnswerKeyEditor
                        initial={{
                          ...(k ?? {}),
                          level,
                          module: q.module,
                          lesson_id: q.lesson_id,
                          section_key: q.section_key,
                          question_idx: q.question_idx,
                          question_text: q.question_text,
                        }}
                        onSaved={() => { setEditing(null); setTick(t => t + 1); }}
                        onCancel={() => setEditing(null)}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
