import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import BaribaSmartTextarea from '@/components/classe/BaribaSmartTextarea';
import { Loader2, CheckCircle2, Trash2, Scale, Mic } from 'lucide-react';
import { z } from 'zod';
import VoiceAnswerPlayer from '@/components/classe/VoiceAnswerPlayer';
import VoiceAnswerRecorder from '@/components/classe/VoiceAnswerRecorder';
import { upsertAnswerKey, fetchAnswerKey } from '@/lib/answerKeys';
import SafeBoundary from '@/components/common/SafeBoundary';

const gradeSchema = z.object({
  grade: z.number().min(0).max(20),
  comment: z.string().max(2000).optional(),
});

export interface AnswerReviewProps {
  answer: {
    id: string;
    user_id: string;
    level: string;
    module: string;
    lesson_id: string;
    section_key: string;
    question_idx: number;
    answer_text: string | null;
    field_data: unknown;
    score: number | null;
    max_score: number | null;
    teacher_grade: number | null;
    teacher_comment: string | null;
    answer_audio_path?: string | null;
    answer_audio_duration?: number | null;
  };
  studentName?: string;
  onGraded?: () => void;
}

export default function AnswerReview(props: AnswerReviewProps) {
  return (
    <SafeBoundary label="Correction de la réponse">
      <AnswerReviewInner {...props} />
    </SafeBoundary>
  );
}

function AnswerReviewInner({ answer, studentName, onGraded }: AnswerReviewProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [grade, setGrade] = useState<string>(answer.teacher_grade?.toString() ?? '');
  const [comment, setComment] = useState(answer.teacher_comment ?? '');
  const [weight, setWeight] = useState<number>(1);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [teacherAudioPath, setTeacherAudioPath] = useState<string | null>(null);
  const [teacherAudioDuration, setTeacherAudioDuration] = useState<number | null>(null);
  const [personalAudioPath, setPersonalAudioPath] = useState<string | null>(null);
  const [personalAudioDuration, setPersonalAudioDuration] = useState<number | null>(null);

  // Charge le corrigé vocal personnalisé existant pour cette réponse
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('classe_student_answers')
        .select('teacher_audio_path, teacher_audio_duration')
        .eq('id', answer.id)
        .maybeSingle();
      if (data?.teacher_audio_path) {
        setPersonalAudioPath(data.teacher_audio_path);
        setPersonalAudioDuration(data.teacher_audio_duration ?? null);
      }
    })();
  }, [answer.id]);

  const handlePersonalAudioUploaded = async (path: string, duration: number) => {
    setPersonalAudioPath(path);
    setPersonalAudioDuration(duration);
    const { error } = await supabase
      .from('classe_student_answers')
      .update({ teacher_audio_path: path, teacher_audio_duration: duration })
      .eq('id', answer.id);
    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: '🎙️ Corrigé vocal personnalisé envoyé à l\'élève' });
    }
  };

  // Load existing weight for this question
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('classe_grade_weights')
        .select('weight')
        .eq('level', answer.level).eq('module', answer.module)
        .eq('lesson_id', answer.lesson_id).eq('section_key', answer.section_key)
        .eq('question_idx', answer.question_idx)
        .maybeSingle();
      if (data) setWeight(Number(data.weight));
    })();
  }, [answer.level, answer.module, answer.lesson_id, answer.section_key, answer.question_idx]);

  // Charge le corrigé vocal existant éventuel
  useEffect(() => {
    (async () => {
      const key = await fetchAnswerKey({
        level: answer.level,
        module: answer.module,
        lesson_id: answer.lesson_id,
        section_key: answer.section_key,
        question_idx: answer.question_idx,
      });
      if (key?.teacher_audio_path) {
        setTeacherAudioPath(key.teacher_audio_path);
        setTeacherAudioDuration(key.teacher_audio_duration ?? null);
      }
    })();
  }, [answer.level, answer.module, answer.lesson_id, answer.section_key, answer.question_idx]);

  const handleTeacherAudioUploaded = async (path: string, duration: number) => {
    setTeacherAudioPath(path);
    setTeacherAudioDuration(duration);
    try {
      // Upsert answer key with the new audio path (preserve existing accepted_answers if present)
      const existing = await fetchAnswerKey({
        level: answer.level, module: answer.module,
        lesson_id: answer.lesson_id, section_key: answer.section_key,
        question_idx: answer.question_idx,
      });
      await upsertAnswerKey({
        id: existing?.id,
        level: answer.level as 'N1' | 'N2',
        module: answer.module,
        lesson_id: answer.lesson_id,
        section_key: answer.section_key,
        question_idx: answer.question_idx,
        question_text: existing?.question_text ?? null,
        accepted_answers: existing?.accepted_answers ?? [],
        explanation: existing?.explanation ?? null,
        audio_url: existing?.audio_url ?? null,
        teacher_audio_path: path,
        teacher_audio_duration: duration,
      });
      toast({ title: '🎙️ Corrigé vocal publié' });
    } catch (e: any) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!confirm('Supprimer définitivement cette réponse ?')) return;
    setDeleting(true);
    const { error } = await supabase.from('classe_student_answers').delete().eq('id', answer.id);
    setDeleting(false);
    if (error) { toast({ title: 'Erreur', description: error.message, variant: 'destructive' }); return; }
    toast({ title: '🗑️ Réponse supprimée' });
    onGraded?.();
  };

  const handleSubmit = async () => {
    const numericGrade = parseFloat(grade);
    const validation = gradeSchema.safeParse({ grade: numericGrade, comment });
    if (!validation.success) {
      toast({ title: 'Note invalide', description: 'La note doit être entre 0 et 20.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const [updateRes, weightRes] = await Promise.all([
      supabase.from('classe_student_answers').update({
        teacher_grade: numericGrade,
        teacher_comment: comment || null,
        graded_by: user?.id,
        graded_at: new Date().toISOString(),
      }).eq('id', answer.id),
      supabase.from('classe_grade_weights').upsert({
        level: answer.level, module: answer.module, lesson_id: answer.lesson_id,
        section_key: answer.section_key, question_idx: answer.question_idx,
        weight, updated_by: user?.id,
      }, { onConflict: 'level,module,lesson_id,section_key,question_idx' }),
    ]);
    setSaving(false);
    if (updateRes.error) { toast({ title: 'Erreur', description: updateRes.error.message, variant: 'destructive' }); return; }
    if (weightRes.error) console.warn('Weight save failed', weightRes.error);
    toast({ title: '✅ Correction enregistrée', description: studentName ? `Note attribuée à ${studentName} (poids ×${weight})` : undefined });
    onGraded?.();
  };

  const fieldDataPreview = answer.field_data
    ? typeof answer.field_data === 'string' ? answer.field_data : JSON.stringify(answer.field_data, null, 2)
    : null;

  return (
    <div className="p-4 rounded-2xl border border-border bg-card space-y-3">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded bg-muted font-semibold uppercase">{answer.module}</span>
          <span className="text-muted-foreground">{answer.level} · Leçon {answer.lesson_id} {answer.section_key && `· ${answer.section_key}`} · Q{answer.question_idx + 1}</span>
        </div>
        {answer.teacher_grade !== null && (
          <span className="flex items-center gap-1 text-emerald-600 font-bold">
            <CheckCircle2 className="w-3 h-3" /> Corrigé
          </span>
        )}
      </div>

      {answer.answer_text && (
        <div className="p-3 rounded-lg bg-muted/50 text-sm">
          <span className="text-[10px] font-bold text-muted-foreground block mb-1">RÉPONSE DE L'APPRENANT</span>
          <p className="whitespace-pre-wrap break-words">{answer.answer_text}</p>
        </div>
      )}

      {answer.answer_audio_path && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center gap-2">
          <Mic className="w-4 h-4 text-emerald-700" />
          <span className="text-[10px] font-bold text-emerald-800">RÉPONSE VOCALE DE L'APPRENANT</span>
          <VoiceAnswerPlayer
            path={answer.answer_audio_path}
            duration={answer.answer_audio_duration ?? undefined}
            variant="student"
          />
        </div>
      )}

      {fieldDataPreview && !answer.answer_text && (
        <pre className="p-3 rounded-lg bg-muted/50 text-xs overflow-x-auto max-h-40">{fieldDataPreview}</pre>
      )}

      {answer.score !== null && answer.max_score !== null && (
        <p className="text-xs text-muted-foreground">Score auto: <span className="font-bold">{answer.score}/{answer.max_score}</span></p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-[100px_100px_1fr_auto] gap-2 items-start">
        <Input type="number" min={0} max={20} step={0.5} placeholder="Note /20"
          value={grade} onChange={(e) => setGrade(e.target.value)} />
        <div className="flex items-center gap-1">
          <Scale className="w-3 h-3 text-muted-foreground" />
          <Input type="number" min={0.5} max={5} step={0.5} placeholder="Poids"
            value={weight} onChange={(e) => setWeight(parseFloat(e.target.value) || 1)}
            title="Poids de la question dans la section" />
        </div>
        <BaribaSmartTextarea
          placeholder="Appréciation (Baatonum / Français — clavier + écriture manuscrite + prédiction)"
          value={comment}
          onChange={(v) => setComment(v.slice(0, 2000))}
          rows={2}
          className="bg-background border-input focus:border-primary"
        />
        <Button onClick={handleSubmit} disabled={saving || !grade}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Valider'}
        </Button>
      </div>

      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>Note pondérée : <strong>{grade ? (parseFloat(grade) * weight).toFixed(2) : '—'}</strong> / {(20 * weight).toFixed(0)} pts</span>
        <button onClick={handleDelete} disabled={deleting}
          className="flex items-center gap-1 px-2 py-1 rounded text-red-500 hover:bg-red-50">
          {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />} Supprimer
        </button>
      </div>

      {/* Corrigé vocal enseignant */}
      <div className="pt-3 border-t border-border space-y-2">
        {/* Personnalisé pour cet élève */}
        <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 space-y-2">
          <div className="flex items-center gap-2">
            <Mic className="w-3.5 h-3.5 text-purple-700" />
            <span className="text-[11px] font-black uppercase text-purple-800">
              Corrigé vocal personnalisé pour cet élève
            </span>
          </div>
          <p className="text-[10px] text-purple-700/80">
            Enregistre une réponse vocale spécifique à <strong>{studentName ?? 'cet apprenant'}</strong>. Elle apparaîtra
            dans son module "Mes corrections" et dans la zone "Corrigé enseignant" de la question.
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <VoiceAnswerRecorder
              storageSubpath={`teacher-personal/${answer.id}`}
              fullPath={`teacher-personal/${answer.id}/${Date.now()}.webm`}
              onUploaded={handlePersonalAudioUploaded}
              variant="teacher"
              compact
            />
            {personalAudioPath && (
              <VoiceAnswerPlayer
                path={personalAudioPath}
                duration={personalAudioDuration ?? undefined}
                variant="teacher"
                label="Mon corrigé personnalisé"
              />
            )}
          </div>
        </div>

        {/* Général pour la question (réutilisable) */}
        <div className="p-3 rounded-xl bg-muted/40 border border-border space-y-2">
          <div className="flex items-center gap-2">
            <Mic className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-[11px] font-black uppercase text-muted-foreground">
              Corrigé vocal général (publié pour tous les élèves)
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <VoiceAnswerRecorder
              storageSubpath={`${answer.level}/${answer.module}/${answer.lesson_id}/${answer.section_key || 'q'}/${answer.question_idx}`}
              fullPath={`teacher/${answer.level}/${answer.module}/${answer.lesson_id}/${answer.section_key || 'q'}/${answer.question_idx}/${Date.now()}.webm`}
              onUploaded={handleTeacherAudioUploaded}
              variant="teacher"
              compact
            />
            {teacherAudioPath && (
              <VoiceAnswerPlayer
                path={teacherAudioPath}
                duration={teacherAudioDuration ?? undefined}
                variant="teacher"
                label="Corrigé général"
              />
            )}
          </div>
          <p className="text-[10px] text-muted-foreground">
            Sera réutilisé comme corrigé officiel de cette question pour tous les apprenants.
          </p>
        </div>
      </div>
    </div>
  );
}
