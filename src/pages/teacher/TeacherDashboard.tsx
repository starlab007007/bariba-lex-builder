import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Users, ClipboardCheck, TrendingUp, Trophy, Loader2 } from 'lucide-react';

interface Stats {
  totalStudents: number;
  pendingGrading: number;
  completedLessons: number;
  avgGrade: number | null;
}

export default function TeacherDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recent, setRecent] = useState<Array<{ user_id: string; updated_at: string; module: string; level: string; lesson_id: string }>>([]);

  useEffect(() => {
    (async () => {
      const [studentsRes, pendingRes, progressRes, gradedRes, recentRes] = await Promise.all([
        supabase.from('classe_student_progress').select('user_id', { count: 'exact', head: true }),
        supabase.from('classe_student_answers').select('id', { count: 'exact', head: true }).is('graded_at', null),
        supabase.from('classe_student_progress').select('completed_lessons'),
        supabase.from('classe_student_answers').select('teacher_grade').not('teacher_grade', 'is', null),
        supabase.from('classe_student_answers').select('user_id, updated_at, module, level, lesson_id').order('updated_at', { ascending: false }).limit(10),
      ]);

      const totalLessons = (progressRes.data ?? []).reduce((s, p) => s + ((p.completed_lessons as number[] | null)?.length ?? 0), 0);
      const grades = (gradedRes.data ?? []).map(g => g.teacher_grade as number);
      const avg = grades.length ? grades.reduce((s, g) => s + g, 0) / grades.length : null;

      setStats({
        totalStudents: studentsRes.count ?? 0,
        pendingGrading: pendingRes.count ?? 0,
        completedLessons: totalLessons,
        avgGrade: avg,
      });
      setRecent((recentRes.data ?? []) as never);
    })();
  }, []);

  if (!stats) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  const cards = [
    { label: 'Apprenants', value: stats.totalStudents, icon: Users, color: 'from-blue-500 to-indigo-500' },
    { label: 'À corriger', value: stats.pendingGrading, icon: ClipboardCheck, color: 'from-amber-500 to-orange-500', link: '/fitila/teacher/grading' },
    { label: 'Leçons terminées', value: stats.completedLessons, icon: TrendingUp, color: 'from-emerald-500 to-teal-500' },
    { label: 'Moyenne classe', value: stats.avgGrade !== null ? `${stats.avgGrade.toFixed(1)}/20` : '—', icon: Trophy, color: 'from-purple-500 to-pink-500' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cards.map(c => {
          const inner = (
            <>
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${c.color} flex items-center justify-center mb-2`}>
                <c.icon className="w-5 h-5 text-white" />
              </div>
              <p className="text-2xl md:text-3xl font-black">{c.value}</p>
              <p className="text-xs text-muted-foreground">{c.label}</p>
            </>
          );
          return c.link ? (
            <Link key={c.label} to={c.link} className="p-4 rounded-2xl bg-card border border-border shadow-sm hover:shadow-md transition-shadow">{inner}</Link>
          ) : (
            <div key={c.label} className="p-4 rounded-2xl bg-card border border-border shadow-sm">{inner}</div>
          );
        })}
      </div>

      <div className="p-5 rounded-2xl bg-card border border-border">
        <h2 className="font-bold mb-3">Activité récente</h2>
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune activité pour le moment.</p>
        ) : (
          <ul className="space-y-2">
            {recent.map((r, i) => (
              <li key={i} className="flex items-center justify-between text-sm py-2 border-b border-border/50 last:border-0">
                <span>
                  <Link to={`/fitila/teacher/student/${r.user_id}`} className="font-mono text-xs text-blue-600 hover:underline">
                    {r.user_id.slice(0, 8)}…
                  </Link>
                  <span className="ml-2 text-muted-foreground">{r.module} · {r.level} · L{r.lesson_id}</span>
                </span>
                <span className="text-xs text-muted-foreground">{new Date(r.updated_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
