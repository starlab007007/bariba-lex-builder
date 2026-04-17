import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { z } from 'zod';

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
  };
  studentName?: string;
  onGraded?: () => void;
}

export default function AnswerReview({ answer, studentName, onGraded }: AnswerReviewProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [grade, setGrade] = useState<string>(answer.teacher_grade?.toString() ?? '');
  const [comment, setComment] = useState(answer.teacher_comment ?? '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    const numericGrade = parseFloat(grade);
    const validation = gradeSchema.safeParse({ grade: numericGrade, comment });
    if (!validation.success) {
      toast({ title: 'Note invalide', description: 'La note doit être entre 0 et 20.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('classe_student_answers')
      .update({
        teacher_grade: numericGrade,
        teacher_comment: comment || null,
        graded_by: user?.id,
        graded_at: new Date().toISOString(),
      })
      .eq('id', answer.id);
    setSaving(false);
    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Correction enregistrée', description: studentName ? `Note attribuée à ${studentName}` : undefined });
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

      {fieldDataPreview && !answer.answer_text && (
        <pre className="p-3 rounded-lg bg-muted/50 text-xs overflow-x-auto max-h-40">{fieldDataPreview}</pre>
      )}

      {answer.score !== null && answer.max_score !== null && (
        <p className="text-xs text-muted-foreground">Score auto: <span className="font-bold">{answer.score}/{answer.max_score}</span></p>
      )}

      <div className="grid grid-cols-[100px_1fr_auto] gap-2 items-start">
        <Input
          type="number"
          min={0}
          max={20}
          step={0.5}
          placeholder="Note /20"
          value={grade}
          onChange={(e) => setGrade(e.target.value)}
        />
        <Textarea
          placeholder="Commentaire de correction (facultatif, max 2000 car.)"
          value={comment}
          onChange={(e) => setComment(e.target.value.slice(0, 2000))}
          className="min-h-[60px] text-sm"
        />
        <Button onClick={handleSubmit} disabled={saving || !grade}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Valider'}
        </Button>
      </div>
    </div>
  );
}
