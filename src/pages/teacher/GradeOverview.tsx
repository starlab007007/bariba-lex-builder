import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { buildGlobalReport, MODULE_LABELS, getAppreciation } from '@/lib/grading';

interface StudentRow {
  user_id: string;
  display_name: string;
  username?: string;
}

interface AnswerRow {
  user_id: string;
  level: string;
  module: string;
  lesson_id: string;
  section_key: string;
  question_idx: number;
  teacher_grade: number | null;
}

interface WeightRow {
  level: string; module: string; lesson_id: string; section_key: string;
  question_idx: number; weight: number; section_weight: number; lesson_weight: number;
}

export default function GradeOverview() {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [answers, setAnswers] = useState<AnswerRow[]>([]);
  const [weights, setWeights] = useState<WeightRow[]>([]);
  const [chapters, setChapters] = useState<Array<{ level: string; chapter_key: string; title_fr: string; lesson_ids: string[] }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [profRes, ansRes, wRes, chRes] = await Promise.all([
        supabase.from('tamtam_profiles').select('user_id, display_name, username').limit(500),
        supabase.from('classe_student_answers').select('user_id, level, module, lesson_id, section_key, question_idx, teacher_grade').not('teacher_grade', 'is', null).limit(5000),
        supabase.from('classe_grade_weights').select('*'),
        supabase.from('classe_chapters').select('level, chapter_key, title_fr, lesson_ids'),
      ]);
      setStudents((profRes.data ?? []) as StudentRow[]);
      setAnswers((ansRes.data ?? []) as AnswerRow[]);
      setWeights((wRes.data ?? []) as WeightRow[]);
      setChapters((chRes.data ?? []) as never);
      setLoading(false);
    })();
  }, []);

  const studentReports = useMemo(() => {
    const studentIds = Array.from(new Set(answers.map((a) => a.user_id)));
    return studentIds.map((uid) => {
      const userAnswers = answers.filter((a) => a.user_id === uid);
      const profile = students.find((s) => s.user_id === uid);
      const report = buildGlobalReport(userAnswers, weights, chapters);
      return { uid, name: profile?.display_name ?? profile?.username ?? uid.slice(0, 8), report };
    }).sort((a, b) => (b.report.global_average ?? 0) - (a.report.global_average ?? 0));
  }, [answers, weights, chapters, students]);

  const exportCSV = () => {
    const header = 'Apprenant,Moyenne /20,Appréciation,Q corrigées,Q totales\n';
    const rows = studentReports.map((s) =>
      `"${s.name}",${s.report.global_average?.toFixed(2) ?? ''},${getAppreciation(s.report.global_average)},${s.report.total_graded},${s.report.total_questions}`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `releve-classe-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const cellColor = (g: number | null) => {
    if (g === null) return 'bg-muted/30 text-muted-foreground';
    if (g >= 16) return 'bg-emerald-100 text-emerald-700';
    if (g >= 10) return 'bg-amber-100 text-amber-700';
    return 'bg-rose-100 text-rose-700';
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  // collect all (level, module) pairs
  const moduleColumns = Array.from(new Set(answers.map((a) => `${a.level}::${a.module}`))).sort();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black">📊 Relevé global de la classe</h1>
          <p className="text-xs text-muted-foreground">{studentReports.length} apprenant(s) — moyennes pondérées</p>
        </div>
        <Button onClick={exportCSV} variant="outline" size="sm"><Download className="w-4 h-4 mr-1" />Exporter CSV</Button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full text-xs">
          <thead className="bg-muted">
            <tr>
              <th className="p-2 text-left sticky left-0 bg-muted">Apprenant</th>
              <th className="p-2 text-center">Moyenne</th>
              {moduleColumns.map((mc) => {
                const [lvl, mod] = mc.split('::');
                return <th key={mc} className="p-2 text-center whitespace-nowrap">{lvl} {MODULE_LABELS[mod] ?? mod}</th>;
              })}
              <th className="p-2 text-center">Appréciation</th>
            </tr>
          </thead>
          <tbody>
            {studentReports.map((s) => (
              <tr key={s.uid} className="border-t border-border hover:bg-muted/20">
                <td className="p-2 font-semibold sticky left-0 bg-card">{s.name}</td>
                <td className={`p-2 text-center font-bold ${cellColor(s.report.global_average)}`}>
                  {s.report.global_average?.toFixed(2) ?? '—'}
                </td>
                {moduleColumns.map((mc) => {
                  const [lvl, mod] = mc.split('::');
                  const modReport = s.report.modules.find((m) => m.level === lvl && m.module === mod);
                  return (
                    <td key={mc} className={`p-2 text-center ${cellColor(modReport?.average ?? null)}`}>
                      {modReport?.average?.toFixed(1) ?? '—'}
                    </td>
                  );
                })}
                <td className="p-2 text-center font-semibold">{getAppreciation(s.report.global_average)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
