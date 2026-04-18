import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Download, TrendingUp, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AuthGuardBanner from './AuthGuardBanner';
import { buildGlobalReport, MODULE_LABELS, getAppreciation, APPRECIATION_COLORS } from '@/lib/grading';
import { generateGradeReportPDF } from '@/lib/pdfReport';

interface AnswerRow {
  level: string; module: string; lesson_id: string; section_key: string;
  question_idx: number; teacher_grade: number | null;
}
interface WeightRow {
  level: string; module: string; lesson_id: string; section_key: string;
  question_idx: number; weight: number; section_weight: number; lesson_weight: number;
}

export default function MyGradeReport() {
  const { user } = useAuth();
  const [answers, setAnswers] = useState<AnswerRow[]>([]);
  const [weights, setWeights] = useState<WeightRow[]>([]);
  const [chapters, setChapters] = useState<Array<{ level: string; chapter_key: string; title_fr: string; lesson_ids: string[] }>>([]);
  const [profile, setProfile] = useState<{ display_name?: string; phone_number?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    (async () => {
      const [aRes, wRes, chRes, pRes] = await Promise.all([
        supabase.from('classe_student_answers')
          .select('level, module, lesson_id, section_key, question_idx, teacher_grade')
          .eq('user_id', user.id).not('teacher_grade', 'is', null),
        supabase.from('classe_grade_weights').select('*'),
        supabase.from('classe_chapters').select('level, chapter_key, title_fr, lesson_ids'),
        supabase.from('tamtam_profiles').select('display_name, phone_number').eq('user_id', user.id).maybeSingle(),
      ]);
      setAnswers((aRes.data ?? []) as AnswerRow[]);
      setWeights((wRes.data ?? []) as WeightRow[]);
      setChapters((chRes.data ?? []) as never);
      setProfile(pRes.data as never);
      setLoading(false);
    })();
  }, [user]);

  const report = useMemo(
    () => buildGlobalReport(answers, weights, chapters),
    [answers, weights, chapters]
  );

  const downloadPDF = () => {
    const blob = generateGradeReportPDF(report, {
      studentName: profile?.display_name ?? user?.email ?? 'Apprenant',
      studentPhone: profile?.phone_number,
      generatedAt: new Date(),
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `releve-notes-${new Date().toISOString().slice(0, 10)}.pdf`; a.click();
    URL.revokeObjectURL(url);
  };

  if (!user) return <div className="space-y-4"><AuthGuardBanner /></div>;
  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-amber-500" /></div>;

  const avg = report.global_average;
  const appr = getAppreciation(avg);

  return (
    <div className="space-y-4 pb-8">
      {/* Carte moyenne globale */}
      <div className="p-5 rounded-3xl bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 text-white shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/80 text-xs font-bold uppercase tracking-wider">Moyenne générale</p>
            <p className="text-5xl font-black mt-1">{avg !== null ? avg.toFixed(2) : '—'}<span className="text-2xl text-white/70">/20</span></p>
            <p className="text-sm font-bold mt-1">{appr}</p>
          </div>
          <Award className="w-16 h-16 text-white/30" />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
          <div className="p-2 rounded-lg bg-white/20 backdrop-blur">
            <p className="text-white/80">Questions corrigées</p>
            <p className="font-black text-lg">{report.total_graded}/{report.total_questions}</p>
          </div>
          <div className="p-2 rounded-lg bg-white/20 backdrop-blur">
            <p className="text-white/80">Modules notés</p>
            <p className="font-black text-lg">{report.modules.length}</p>
          </div>
        </div>
        <Button onClick={downloadPDF} className="w-full mt-3 bg-white text-amber-700 hover:bg-white/90 font-bold">
          <Download className="w-4 h-4 mr-2" /> Télécharger mon relevé PDF
        </Button>
      </div>

      {/* Détail par module */}
      {report.modules.length === 0 ? (
        <div className="p-8 rounded-2xl bg-white border border-gray-100 text-center">
          <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-700 font-bold">Aucune note encore</p>
          <p className="text-gray-400 text-xs mt-1">Vos notes apparaîtront ici dès que l'enseignant aura corrigé vos réponses.</p>
        </div>
      ) : report.modules.map((mod) => (
        <div key={`${mod.level}-${mod.module}`} className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-gray-900">{MODULE_LABELS[mod.module] ?? mod.module}</p>
              <p className="text-xs text-gray-500">{mod.level}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-amber-600">{mod.average?.toFixed(2) ?? '—'}<span className="text-sm text-gray-400">/20</span></p>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${APPRECIATION_COLORS[getAppreciation(mod.average)]}`}>
                {getAppreciation(mod.average)}
              </span>
            </div>
          </div>

          {mod.chapters.map((ch) => (
            <div key={ch.chapter_key} className="pl-3 border-l-2 border-amber-200 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-gray-700">📚 {ch.title_fr}</span>
                <span className="text-xs font-bold text-amber-600">{ch.average?.toFixed(2) ?? '—'}/20</span>
              </div>
              {ch.lessons.map((lesson) => (
                <details key={lesson.lesson_id} className="text-xs">
                  <summary className="flex items-center justify-between cursor-pointer p-2 rounded-lg bg-gray-50 hover:bg-gray-100">
                    <span>Leçon {lesson.lesson_id} <span className="text-gray-400">({lesson.sections.length} section)</span></span>
                    <span className="font-bold">{lesson.average?.toFixed(2) ?? '—'}/20</span>
                  </summary>
                  <ul className="mt-1 pl-3 space-y-1">
                    {lesson.sections.map((sec) => (
                      <li key={sec.section_key} className="flex justify-between text-[11px] text-gray-600">
                        <span>§ {sec.section_key || 'principal'} <span className="text-gray-400">({sec.questions.length} Q)</span></span>
                        <span className="font-semibold">{sec.average?.toFixed(2) ?? '—'}/20</span>
                      </li>
                    ))}
                  </ul>
                </details>
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
