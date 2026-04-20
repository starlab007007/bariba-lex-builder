import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, CheckCircle2, MessageSquare, Star, FileText, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import AuthGuardBanner from './AuthGuardBanner';
import AnswerDiff from './AnswerDiff';
import { MODULE_LABELS } from '@/lib/grading';
import VoiceAnswerPlayer from './VoiceAnswerPlayer';

interface GradedAnswer {
  id: string;
  level: string;
  module: string;
  lesson_id: string;
  section_key: string;
  question_idx: number;
  answer_text: string | null;
  answer_audio_path: string | null;
  answer_audio_duration: number | null;
  teacher_grade: number | null;
  teacher_comment: string | null;
  teacher_audio_path: string | null;
  teacher_audio_duration: number | null;
  graded_at: string | null;
  graded_by: string | null;
}

interface TeacherInfo {
  user_id: string;
  display_name?: string;
  avatar_url?: string;
}

interface AnswerKey {
  level: string;
  module: string;
  lesson_id: string;
  section_key: string;
  question_idx: number;
  accepted_answers: string[];
  explanation?: string;
  question_text?: string;
}

export default function ClasseCorrections() {
  const { user } = useAuth();
  const [items, setItems] = useState<GradedAnswer[]>([]);
  const [keys, setKeys] = useState<AnswerKey[]>([]);
  const [teachers, setTeachers] = useState<Record<string, TeacherInfo>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      const { data: ans } = await supabase
        .from('classe_student_answers')
        .select('id, level, module, lesson_id, section_key, question_idx, answer_text, answer_audio_path, answer_audio_duration, teacher_grade, teacher_comment, teacher_audio_path, teacher_audio_duration, graded_at, graded_by')
        .eq('user_id', user.id)
        .not('graded_at', 'is', null)
        .order('graded_at', { ascending: false })
        .limit(200);

      const list = (ans ?? []) as GradedAnswer[];
      const teacherIds = Array.from(new Set(list.map((i) => i.graded_by).filter(Boolean))) as string[];

      const [keysRes, teachersRes] = await Promise.all([
        list.length > 0
          ? supabase.from('classe_answer_keys').select('level, module, lesson_id, section_key, question_idx, accepted_answers, explanation, question_text')
              .in('lesson_id', Array.from(new Set(list.map((i) => i.lesson_id))))
          : Promise.resolve({ data: [] as AnswerKey[] }),
        teacherIds.length > 0
          ? supabase.from('tamtam_profiles').select('user_id, display_name, avatar_url').in('user_id', teacherIds)
          : Promise.resolve({ data: [] }),
      ]);

      if (!cancelled) {
        setItems(list);
        setKeys((keysRes.data ?? []) as AnswerKey[]);
        const tMap: Record<string, TeacherInfo> = {};
        ((teachersRes.data ?? []) as TeacherInfo[]).forEach((t) => { tMap[t.user_id] = t; });
        setTeachers(tMap);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  if (!user) {
    return (
      <div className="space-y-4">
        <AuthGuardBanner />
        <div className="p-6 rounded-2xl bg-white border border-gray-100 text-center text-gray-500 text-sm">
          Connectez-vous pour voir vos corrections d'enseignant.
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-amber-500" /></div>;
  }

  if (items.length === 0) {
    return (
      <div className="p-8 rounded-2xl bg-white border border-gray-100 text-center">
        <CheckCircle2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-700 font-bold">Aucune correction disponible</p>
        <p className="text-gray-400 text-xs mt-1">Vos corrections apparaîtront ici dès que l'enseignant les aura validées.</p>
      </div>
    );
  }

  const avg = items.reduce((s, i) => s + (i.teacher_grade ?? 0), 0) / items.length;

  const findKey = (it: GradedAnswer): AnswerKey | undefined =>
    keys.find((k) => k.level === it.level && k.module === it.module && k.lesson_id === it.lesson_id
      && k.section_key === it.section_key && k.question_idx === it.question_idx);

  return (
    <div className="space-y-4">
      {/* Top: average + link to full report */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center">
              <Star className="w-6 h-6 text-white fill-white" />
            </div>
            <div>
              <p className="text-emerald-900 font-black text-2xl">{avg.toFixed(1)}/20</p>
              <p className="text-emerald-700 text-xs">Moyenne sur {items.length} corrections</p>
            </div>
          </div>
        </div>
        <Link to="/fitila/classe/notes" className="p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 flex items-center gap-3 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-amber-900 font-black">Mon relevé complet</p>
            <p className="text-amber-700 text-xs">Notes pondérées + PDF téléchargeable</p>
          </div>
        </Link>
      </div>

      {items.map((it) => {
        const teacher = it.graded_by ? teachers[it.graded_by] : null;
        const key = findKey(it);
        return (
          <div key={it.id} className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-semibold text-gray-700">{MODULE_LABELS[it.module] ?? it.module}</span>
                <span className="text-gray-400">·</span>
                <span className="text-gray-500">{it.level} — Leçon {it.lesson_id} {it.section_key && `· ${it.section_key}`} · Q{it.question_idx + 1}</span>
              </div>
              {it.teacher_grade !== null && (
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  it.teacher_grade >= 16 ? 'bg-emerald-100 text-emerald-700' :
                  it.teacher_grade >= 10 ? 'bg-amber-100 text-amber-700' :
                  'bg-rose-100 text-rose-700'
                }`}>
                  {it.teacher_grade}/20
                </span>
              )}
            </div>

            {key?.question_text && (
              <p className="text-xs italic text-gray-600">❓ {key.question_text}</p>
            )}

            {/* Comparison diff */}
            {it.answer_text && key?.accepted_answers && key.accepted_answers.length > 0 ? (
              <AnswerDiff studentAnswer={it.answer_text} acceptedAnswers={key.accepted_answers} />
            ) : it.answer_text && (
              <div className="p-2 rounded-lg bg-gray-50 text-sm text-gray-700">
                <span className="text-[10px] font-bold text-gray-400 block mb-1">VOTRE RÉPONSE</span>
                {it.answer_text}
              </div>
            )}

            {it.answer_audio_path && (
              <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold text-emerald-700">🎙️ MA RÉPONSE VOCALE</span>
                <VoiceAnswerPlayer
                  path={it.answer_audio_path}
                  duration={it.answer_audio_duration ?? undefined}
                  variant="student"
                />
              </div>
            )}

            {it.teacher_audio_path && (
              <div className="p-2 rounded-lg bg-purple-50 border border-purple-100 flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold text-purple-700">🎧 CORRIGÉ VOCAL DE L'ENSEIGNANT</span>
                <VoiceAnswerPlayer
                  path={it.teacher_audio_path}
                  duration={it.teacher_audio_duration ?? undefined}
                  variant="teacher"
                  label="Écouter le corrigé"
                />
              </div>
            )}

            {key?.explanation && (
              <div className="p-2 rounded-lg bg-blue-50 border border-blue-100 text-xs text-blue-900">
                💡 {key.explanation}
              </div>
            )}

            {it.teacher_comment && (
              <div className="flex gap-2 p-2 rounded-lg bg-purple-50 border border-purple-100">
                <MessageSquare className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="text-[10px] font-bold text-purple-600 block">APPRÉCIATION ENSEIGNANT</span>
                  <p className="text-sm text-purple-900">{it.teacher_comment}</p>
                </div>
              </div>
            )}

            {/* Teacher card */}
            {teacher && (
              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  {teacher.avatar_url ? (
                    <img src={teacher.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-xs font-black">
                      {(teacher.display_name ?? '?').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="text-[11px]">
                    <p className="font-semibold text-gray-700">{teacher.display_name ?? 'Enseignant'}</p>
                    <p className="text-gray-400 flex items-center gap-1"><User className="w-2.5 h-2.5" /> Correcteur</p>
                  </div>
                </div>
                {it.graded_at && (
                  <p className="text-[10px] text-gray-400">{new Date(it.graded_at).toLocaleDateString('fr-FR')}</p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
