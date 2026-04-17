import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, ArrowLeft } from 'lucide-react';
import AnswerReview from '@/components/teacher/AnswerReview';

export default function StudentDetail() {
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<{ display_name?: string; username?: string; avatar_url?: string } | null>(null);
  const [progress, setProgress] = useState<Array<{ level: string; completed_lessons: number[]; lesson_stars: Record<string, number> }>>([]);
  const [evaluations, setEvaluations] = useState<Array<{ level: string; evaluation_id: string; best_score: number; attempts: number }>>([]);
  const [answers, setAnswers] = useState<Parameters<typeof AnswerReview>[0]['answer'][]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'graded'>('all');
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const [profileRes, progressRes, evalsRes, ansRes] = await Promise.all([
        supabase.from('tamtam_profiles').select('display_name, username, avatar_url').eq('user_id', id).maybeSingle(),
        supabase.from('classe_student_progress').select('level, completed_lessons, lesson_stars').eq('user_id', id),
        supabase.from('classe_evaluation_results').select('level, evaluation_id, best_score, attempts').eq('user_id', id),
        supabase.from('classe_student_answers')
          .select('id, user_id, level, module, lesson_id, section_key, question_idx, answer_text, field_data, score, max_score, teacher_grade, teacher_comment, updated_at')
          .eq('user_id', id)
          .order('updated_at', { ascending: false })
          .limit(300),
      ]);
      setProfile(profileRes.data as never);
      setProgress((progressRes.data ?? []) as never);
      setEvaluations((evalsRes.data ?? []) as never);
      setAnswers((ansRes.data ?? []) as never);
      setLoading(false);
    })();
  }, [id, tick]);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  const visible = answers.filter(a => filter === 'all' || (filter === 'pending' ? a.teacher_grade === null : a.teacher_grade !== null));
  const studentName = profile?.display_name ?? profile?.username ?? id?.slice(0, 8);

  return (
    <div className="space-y-5">
      <Link to="/fitila/teacher/students" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Tous les apprenants
      </Link>

      <div className="p-5 rounded-2xl bg-card border border-border flex items-center gap-4">
        {profile?.avatar_url ? (
          <img src={profile.avatar_url} alt="" className="w-16 h-16 rounded-full object-cover" />
        ) : (
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-2xl font-black">
            {(studentName ?? '?').charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <h1 className="text-xl font-black">{studentName}</h1>
          {profile?.username && <p className="text-xs text-muted-foreground">@{profile.username}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {(['N1', 'N2'] as const).map(lvl => {
          const p = progress.find(x => x.level === lvl);
          return (
            <div key={lvl} className="p-4 rounded-2xl bg-card border border-border">
              <h3 className="font-bold mb-2">{lvl === 'N1' ? '🔥 Niveau 1' : '🚀 Niveau 2'}</h3>
              <p className="text-2xl font-black">{(p?.completed_lessons as number[] | undefined)?.length ?? 0}<span className="text-sm font-normal text-muted-foreground"> leçons</span></p>
              <p className="text-xs text-muted-foreground mt-1">
                {evaluations.filter(e => e.level === lvl).length} évaluation(s) — moy: {
                  (() => {
                    const evals = evaluations.filter(e => e.level === lvl);
                    if (!evals.length) return '—';
                    return (evals.reduce((s, e) => s + e.best_score, 0) / evals.length).toFixed(1);
                  })()
                }
              </p>
            </div>
          );
        })}
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="font-bold">Réponses ({visible.length})</h2>
          <div className="ml-auto flex gap-1 text-xs">
            {(['all', 'pending', 'graded'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-lg font-semibold ${filter === f ? 'bg-amber-500 text-white' : 'bg-muted text-muted-foreground'}`}
              >
                {f === 'all' ? 'Toutes' : f === 'pending' ? 'À corriger' : 'Corrigées'}
              </button>
            ))}
          </div>
        </div>

        {visible.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground rounded-2xl bg-muted/30">Aucune réponse à afficher.</p>
        ) : visible.map(a => (
          <AnswerReview key={a.id} answer={a} studentName={studentName} onGraded={() => setTick(t => t + 1)} />
        ))}
      </div>
    </div>
  );
}
