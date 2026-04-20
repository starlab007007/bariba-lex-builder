/**
 * UniversalAnswerCard
 * ───────────────────────────────────────────────
 * Carte unifiée d'interaction élève/enseignant pour TOUS les modules N1+N2.
 *
 * Flow révolutionnaire e-learning :
 *   1. L'élève répond              → state local
 *   2. "Soumettre"                 → upsert DB (classe_student_answers) + auto-save local
 *   3. "Vérifier ma réponse"       → compare avec classe_answer_keys (matchAnswer)
 *   4. Affiche corrigé enseignant  → réponses acceptées + explication + audio
 *   5. Affiche note + commentaire  → si l'enseignant a noté (teacher_grade /20)
 *   6. "Modifier"                  → l'élève peut refaire et resoumettre
 *
 * Usage :
 *   <UniversalAnswerCard
 *     level="N1" module="lesson" lessonId="3"
 *     sectionKey="observe" questionIdx={0}
 *     question="Mban gariya ba koo kpĩ?"
 *   />
 */
import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Edit3, Send, Eye, CheckCircle2, XCircle, BookOpen, Volume2, Loader2, Mic, Pencil } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { fetchAnswerKey, matchAnswer, type AnswerKey } from '@/lib/answerKeys';
import { syncAnswer } from '@/lib/classeSync';
import BaribaSmartTextarea from './BaribaSmartTextarea';
import ListenButton from './ListenButton';
import VoiceAnswerRecorder from './VoiceAnswerRecorder';
import VoiceAnswerPlayer from './VoiceAnswerPlayer';
import { buildContentKey, moduleToContentKey } from '@/lib/classeContentKeys';

type Level = 'N1' | 'N2';
type Module = 'lesson' | 'calcul' | 'evaluation' | 'gestion' | 'grammaire' | 'textprod';

interface Props {
  level: Level;
  module: Module;
  lessonId: string;
  sectionKey?: string;
  questionIdx?: number;
  question: string;
  questionLabel?: string; // ex: "Q1", "1.", "I-"
  initialAnswer?: string;
  rows?: number;
  /** Couleur du gradient principal (Tailwind 'from-x-500 to-y-500') */
  accent?: string;
  /** Callback quand la réponse change (pour auto-save legacy localStorage) */
  onLocalChange?: (value: string) => void;
  /** Callback après soumission réussie */
  onSubmitted?: (value: string) => void;
}

interface TeacherGrade {
  teacher_grade: number | null;
  teacher_comment: string | null;
  graded_at: string | null;
}

type AnswerMode = 'text' | 'voice';

export default function UniversalAnswerCard({
  level,
  module,
  lessonId,
  sectionKey = '',
  questionIdx = 0,
  question,
  questionLabel,
  initialAnswer = '',
  rows = 2,
  accent = 'from-amber-500 to-orange-500',
  onLocalChange,
  onSubmitted,
}: Props) {
  const [text, setText] = useState(initialAnswer);
  const [editing, setEditing] = useState(!initialAnswer);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(!!initialAnswer);
  const [showFeedback, setShowFeedback] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [answerKey, setAnswerKey] = useState<AnswerKey | null>(null);
  const [teacherGrade, setTeacherGrade] = useState<TeacherGrade | null>(null);
  const [matchResult, setMatchResult] = useState<boolean | null>(null);
  const [answerMode, setAnswerMode] = useState<AnswerMode>('text');
  const [voicePath, setVoicePath] = useState<string | null>(null);
  const [voiceDuration, setVoiceDuration] = useState<number | null>(null);
  const [personalTeacherAudioPath, setPersonalTeacherAudioPath] = useState<string | null>(null);
  const [personalTeacherAudioDuration, setPersonalTeacherAudioDuration] = useState<number | null>(null);

  const contentKey = buildContentKey(level, module, lessonId, sectionKey || undefined, questionIdx);
  const storageSubpath = `${level}/${moduleToContentKey(module)}/${lessonId}/${sectionKey || 'q'}/${questionIdx}`;

  // ─────────────────────────────────────────────
  // Charge l'éventuelle note enseignant existante
  // ─────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { data } = await supabase
        .from('classe_student_answers')
        .select('answer_text, teacher_grade, teacher_comment, graded_at, answer_audio_path, answer_audio_duration, teacher_audio_path, teacher_audio_duration')
        .eq('user_id', user.id)
        .eq('level', level)
        .eq('module', module)
        .eq('lesson_id', lessonId)
        .eq('section_key', sectionKey)
        .eq('question_idx', questionIdx)
        .maybeSingle();
      if (cancelled || !data) return;
      if (data.answer_text && !text) {
        setText(data.answer_text);
        setSubmitted(true);
        setEditing(false);
      }
      if (data.answer_audio_path) {
        setVoicePath(data.answer_audio_path);
        setVoiceDuration(data.answer_audio_duration ?? null);
        setSubmitted(true);
        setEditing(false);
      }
      if (data.teacher_audio_path) {
        setPersonalTeacherAudioPath(data.teacher_audio_path);
        setPersonalTeacherAudioDuration(data.teacher_audio_duration ?? null);
      }
      if (data.teacher_grade != null || data.teacher_comment) {
        setTeacherGrade({
          teacher_grade: data.teacher_grade,
          teacher_comment: data.teacher_comment,
          graded_at: data.graded_at,
        });
      }
    })();
    return () => { cancelled = true; };
  }, [level, module, lessonId, sectionKey, questionIdx]);

  // ─────────────────────────────────────────────
  // Soumission de la réponse
  // ─────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (!text.trim() && !voicePath) return;
    setSubmitting(true);
    try {
      syncAnswer({
        level, module, lessonId,
        sectionKey, questionIdx,
        answerText: text.trim() || null,
      });
      onLocalChange?.(text.trim());
      onSubmitted?.(text.trim());
      setSubmitted(true);
      setEditing(false);
    } finally {
      setSubmitting(false);
    }
  }, [text, voicePath, level, module, lessonId, sectionKey, questionIdx, onLocalChange, onSubmitted]);

  const handleVoiceUploaded = useCallback(async (path: string, duration: number) => {
    setVoicePath(path);
    setVoiceDuration(duration);
    syncAnswer({
      level, module, lessonId,
      sectionKey, questionIdx,
      answerText: text.trim() || null,
      answerAudioPath: path,
      answerAudioDuration: duration,
    });
    setSubmitted(true);
    setEditing(false);
  }, [text, level, module, lessonId, sectionKey, questionIdx]);

  // ─────────────────────────────────────────────
  // Vérification : on charge le corrigé enseignant
  // ─────────────────────────────────────────────
  const handleVerify = useCallback(async () => {
    setVerifying(true);
    try {
      const key = await fetchAnswerKey({ level, module, lesson_id: lessonId, section_key: sectionKey, question_idx: questionIdx });
      setAnswerKey(key);
      if (key && text.trim()) {
        setMatchResult(matchAnswer(text.trim(), key.accepted_answers));
      }
      setShowFeedback(true);
    } finally {
      setVerifying(false);
    }
  }, [level, module, lessonId, sectionKey, questionIdx, text]);

  // ─────────────────────────────────────────────
  // UI
  // ─────────────────────────────────────────────
  const hasFeedback = answerKey || teacherGrade;
  const isCorrect = matchResult === true;
  const isWrong = matchResult === false;

  return (
    <div className={`rounded-2xl border shadow-sm overflow-hidden transition-colors ${
      isCorrect ? 'bg-emerald-50 border-emerald-200' :
      isWrong ? 'bg-amber-50 border-amber-200' :
      submitted ? 'bg-white border-emerald-100' :
      'bg-white border-gray-100'
    }`}>
      {/* Question */}
      <div className="p-3 pb-2">
        <div className="flex items-start gap-2 mb-2">
          {questionLabel && (
            <span className="text-[10px] font-black text-gray-400 mt-0.5 px-1.5 py-0.5 rounded bg-gray-100">{questionLabel}</span>
          )}
          <p className="flex-1 text-gray-800 text-sm font-medium">{question}</p>
          <ListenButton contentKey={contentKey} size="sm" />
        </div>

        {/* Editing mode */}
        {editing ? (
          <>
            {/* Toggle text/voice */}
            <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-gray-100 mb-2 text-[11px]">
              <button
                type="button"
                onClick={() => setAnswerMode('text')}
                className={`flex items-center gap-1 px-2 py-1 rounded-md font-bold transition ${answerMode === 'text' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}
              >
                <Pencil className="w-3 h-3" /> Texte
              </button>
              <button
                type="button"
                onClick={() => setAnswerMode('voice')}
                className={`flex items-center gap-1 px-2 py-1 rounded-md font-bold transition ${answerMode === 'voice' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}
              >
                <Mic className="w-3 h-3" /> Vocal
              </button>
            </div>

            {answerMode === 'text' ? (
              <>
                <BaribaSmartTextarea
                  value={text}
                  onChange={(v) => { setText(v); onLocalChange?.(v); }}
                  rows={rows}
                  className="bg-gray-50 border-gray-200 focus:border-amber-400"
                  placeholder="A wunɛn wisi yoruo... / Ta réponse..."
                />
                <div className="flex items-center gap-2 mt-2">
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handleSubmit}
                    disabled={(!text.trim() && !voicePath) || submitting}
                    className={`flex-1 py-2 rounded-xl bg-gradient-to-r ${accent} text-white text-xs font-bold disabled:opacity-30 shadow-md flex items-center justify-center gap-1.5`}
                  >
                    {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    A geruo · Soumettre
                  </motion.button>
                  {submitted && (
                    <button
                      onClick={() => setEditing(false)}
                      className="px-3 py-2 rounded-xl bg-gray-100 text-gray-600 text-xs font-bold"
                    >
                      Annuler
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <p className="text-[11px] text-gray-600">Réponds à voix haute en Baatonum ou en français.</p>
                <VoiceAnswerRecorder
                  storageSubpath={storageSubpath}
                  onUploaded={handleVoiceUploaded}
                  variant="student"
                />
                {voicePath && (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-emerald-700 font-bold">✓ Vocal enregistré</span>
                    <VoiceAnswerPlayer path={voicePath} duration={voiceDuration ?? undefined} />
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          /* Submitted view */
          <div className="space-y-2">
            {text && (
              <div className="flex items-start gap-2 p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-100">
                <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <p className="flex-1 text-gray-700 text-sm whitespace-pre-wrap">{text}</p>
              </div>
            )}
            {voicePath && (
              <div className="flex items-center gap-2 p-2 rounded-xl bg-emerald-50/60 border border-emerald-100">
                <Mic className="w-4 h-4 text-emerald-600" />
                <VoiceAnswerPlayer path={voicePath} duration={voiceDuration ?? undefined} />
              </div>
            )}

            <div className="flex items-center gap-2">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleVerify}
                disabled={verifying}
                className="flex-1 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                {verifying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
                {showFeedback ? 'Recharger le corrigé' : 'Vérifier · Voir le corrigé'}
              </motion.button>
              <button
                onClick={() => setEditing(true)}
                className="p-2 rounded-xl bg-gray-100 text-gray-600 text-xs font-bold flex items-center gap-1"
                title="Modifier"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Feedback enseignant */}
      <AnimatePresence>
        {showFeedback && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mx-3 mb-3 p-3 rounded-xl border-2 border-amber-300 bg-amber-50/70 space-y-2">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-amber-600" />
                <span className="text-[10px] font-black text-amber-800 uppercase tracking-wide">
                  Corrigé enseignant
                </span>
                {isCorrect && (
                  <span className="ml-auto flex items-center gap-1 text-emerald-700 text-xs font-bold">
                    <CheckCircle2 className="w-4 h-4" /> Correct
                  </span>
                )}
                {isWrong && (
                  <span className="ml-auto flex items-center gap-1 text-amber-700 text-xs font-bold">
                    <XCircle className="w-4 h-4" /> À revoir
                  </span>
                )}
              </div>

              {answerKey ? (
                <>
                  <div className="text-xs">
                    <span className="font-bold text-emerald-700">✓ Réponse(s) attendue(s) : </span>
                    <span className="text-gray-800">{answerKey.accepted_answers.join(' · ')}</span>
                  </div>
                  {answerKey.explanation && (
                    <div className="p-2 rounded-lg bg-white/70 border border-amber-200">
                      <p className="text-xs text-gray-700 italic">💡 {answerKey.explanation}</p>
                    </div>
                  )}
                  {answerKey.audio_url && (
                    <button
                      onClick={() => { const a = new Audio(answerKey.audio_url!); void a.play(); }}
                      className="flex items-center gap-1 text-xs text-amber-700 hover:underline font-bold"
                    >
                      <Volume2 className="w-3 h-3" /> Écouter la prononciation
                    </button>
                  )}
                  {answerKey.teacher_audio_path && (
                    <div>
                      <VoiceAnswerPlayer
                        path={answerKey.teacher_audio_path}
                        duration={answerKey.teacher_audio_duration ?? undefined}
                        variant="teacher"
                        label="🎧 Corrigé vocal du prof"
                      />
                    </div>
                  )}
                </>
              ) : !teacherGrade && (
                <p className="text-xs text-gray-500 italic">
                  ⏳ Aucun corrigé officiel pour l'instant. Ta réponse a bien été enregistrée — l'enseignant pourra la noter.
                </p>
              )}

              {teacherGrade && (teacherGrade.teacher_grade != null || teacherGrade.teacher_comment) && (
                <div className="pt-2 border-t border-amber-200 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-purple-700 uppercase">Note enseignant</span>
                    {teacherGrade.graded_at && (
                      <span className="text-[10px] text-gray-500">
                        {new Date(teacherGrade.graded_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  {teacherGrade.teacher_grade != null && (
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black text-purple-700">{teacherGrade.teacher_grade}</span>
                      <span className="text-sm text-purple-600 font-bold">/20</span>
                    </div>
                  )}
                  {teacherGrade.teacher_comment && (
                    <div className="p-2 rounded-lg bg-purple-50 border border-purple-200">
                      <p className="text-xs text-purple-900">💬 {teacherGrade.teacher_comment}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
