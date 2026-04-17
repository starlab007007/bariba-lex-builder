import { useEffect, useState } from 'react';
import { fetchAnswerKey, matchAnswer, type AnswerKey } from '@/lib/answerKeys';
import { CheckCircle2, XCircle, BookOpen, Volume2 } from 'lucide-react';

interface Props {
  level: 'N1' | 'N2';
  module: string;
  lesson_id: string;
  section_key?: string;
  question_idx?: number;
  studentAnswer?: string;
  /** Affiche aussi la note/commentaire enseignant si fournis */
  teacherGrade?: number | null;
  teacherComment?: string | null;
}

export default function StudentAnswerFeedback({
  level, module, lesson_id, section_key = '', question_idx = 0,
  studentAnswer, teacherGrade, teacherComment,
}: Props) {
  const [key, setKey] = useState<AnswerKey | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const k = await fetchAnswerKey({ level, module, lesson_id, section_key, question_idx });
      if (!cancelled) {
        setKey(k);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [level, module, lesson_id, section_key, question_idx]);

  if (loading) return null;
  if (!key && teacherGrade == null && !teacherComment) return null;

  const isCorrect = key && studentAnswer ? matchAnswer(studentAnswer, key.accepted_answers) : null;

  return (
    <div className="mt-2 p-3 rounded-xl border-2 border-amber-300 bg-amber-50 space-y-2">
      <div className="flex items-center gap-2">
        <BookOpen className="w-4 h-4 text-amber-600" />
        <span className="text-xs font-bold text-amber-800 uppercase">Corrigé enseignant</span>
        {isCorrect === true && <CheckCircle2 className="w-4 h-4 text-emerald-600 ml-auto" />}
        {isCorrect === false && <XCircle className="w-4 h-4 text-red-500 ml-auto" />}
      </div>

      {key && (
        <>
          <div className="text-sm">
            <span className="font-bold text-emerald-700">✓ Réponse(s) attendue(s) : </span>
            <span className="text-gray-800">{key.accepted_answers.join(' · ')}</span>
          </div>
          {key.explanation && (
            <p className="text-xs text-gray-700 italic">💡 {key.explanation}</p>
          )}
          {key.audio_url && (
            <button
              onClick={() => { const a = new Audio(key.audio_url!); void a.play(); }}
              className="flex items-center gap-1 text-xs text-amber-700 hover:underline"
            >
              <Volume2 className="w-3 h-3" /> Écouter la prononciation
            </button>
          )}
        </>
      )}

      {(teacherGrade != null || teacherComment) && (
        <div className="pt-2 border-t border-amber-200">
          {teacherGrade != null && (
            <p className="text-sm font-bold text-purple-700">📊 Note : {teacherGrade}/20</p>
          )}
          {teacherComment && (
            <p className="text-xs text-gray-700 mt-1">💬 {teacherComment}</p>
          )}
        </div>
      )}
    </div>
  );
}
