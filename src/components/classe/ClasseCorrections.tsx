import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, CheckCircle2, MessageSquare, Star } from 'lucide-react';
import AuthGuardBanner from './AuthGuardBanner';

interface GradedAnswer {
  id: string;
  level: string;
  module: string;
  lesson_id: string;
  section_key: string;
  question_idx: number;
  answer_text: string | null;
  teacher_grade: number | null;
  teacher_comment: string | null;
  graded_at: string | null;
}

const moduleLabels: Record<string, string> = {
  calcul: '🔢 Calcul',
  gestion: '💼 Gestion',
  lesson: '📖 Leçon',
  evaluation: '📝 Évaluation',
  grammaire: '📐 Grammaire',
  textprod: '✍️ Production',
};

export default function ClasseCorrections() {
  const { user } = useAuth();
  const [items, setItems] = useState<GradedAnswer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('classe_student_answers')
        .select('id, level, module, lesson_id, section_key, question_idx, answer_text, teacher_grade, teacher_comment, graded_at')
        .eq('user_id', user.id)
        .not('graded_at', 'is', null)
        .order('graded_at', { ascending: false })
        .limit(200);
      if (!cancelled) {
        setItems((data ?? []) as GradedAnswer[]);
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

  return (
    <div className="space-y-4">
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

      {items.map((it) => (
        <div key={it.id} className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-gray-700">{moduleLabels[it.module] ?? it.module}</span>
              <span className="text-gray-400">·</span>
              <span className="text-gray-500">{it.level} — Leçon {it.lesson_id} {it.section_key && `· ${it.section_key}`}</span>
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
          {it.answer_text && (
            <div className="p-2 rounded-lg bg-gray-50 text-sm text-gray-700">
              <span className="text-[10px] font-bold text-gray-400 block mb-1">VOTRE RÉPONSE</span>
              {it.answer_text}
            </div>
          )}
          {it.teacher_comment && (
            <div className="flex gap-2 p-2 rounded-lg bg-blue-50 border border-blue-100">
              <MessageSquare className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
              <div>
                <span className="text-[10px] font-bold text-blue-600 block">COMMENTAIRE ENSEIGNANT</span>
                <p className="text-sm text-blue-900">{it.teacher_comment}</p>
              </div>
            </div>
          )}
          {it.graded_at && (
            <p className="text-[10px] text-gray-400 text-right">Corrigé le {new Date(it.graded_at).toLocaleDateString('fr-FR')}</p>
          )}
        </div>
      ))}
    </div>
  );
}
