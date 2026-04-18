import { useState } from 'react';
import { Button } from '@/components/ui/button';
import BaribaSmartTextarea from '@/components/classe/BaribaSmartTextarea';
import BaribaSmartInput from '@/components/classe/BaribaSmartInput';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Trash2, Save, X } from 'lucide-react';
import { upsertAnswerKey, deleteAnswerKey, type AnswerKey } from '@/lib/answerKeys';

interface Props {
  initial?: Partial<AnswerKey> & { level: 'N1' | 'N2'; module: string; lesson_id: string; section_key?: string; question_idx?: number };
  onSaved?: (key: AnswerKey) => void;
  onCancel?: () => void;
}

export default function AnswerKeyEditor({ initial, onSaved, onCancel }: Props) {
  const { toast } = useToast();
  const [questionText, setQuestionText] = useState(initial?.question_text ?? '');
  const [answers, setAnswers] = useState<string[]>(initial?.accepted_answers?.length ? initial.accepted_answers : ['']);
  const [explanation, setExplanation] = useState(initial?.explanation ?? '');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSave = async () => {
    const cleanAnswers = answers.map(a => a.trim()).filter(Boolean);
    if (!cleanAnswers.length) {
      toast({ title: 'Au moins une réponse acceptée requise', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const saved = await upsertAnswerKey({
        id: initial?.id,
        level: initial!.level,
        module: initial!.module,
        lesson_id: initial!.lesson_id,
        section_key: initial?.section_key ?? '',
        question_idx: initial?.question_idx ?? 0,
        question_text: questionText || null,
        accepted_answers: cleanAnswers,
        explanation: explanation || null,
        audio_url: initial?.audio_url ?? null,
      });
      toast({ title: '✅ Corrigé enregistré' });
      onSaved?.(saved);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erreur';
      toast({ title: 'Erreur', description: msg, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!initial?.id) return;
    if (!confirm('Supprimer ce corrigé ?')) return;
    setDeleting(true);
    try {
      await deleteAnswerKey(initial.id);
      toast({ title: '🗑️ Corrigé supprimé' });
      onSaved?.({ ...(initial as AnswerKey) });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erreur';
      toast({ title: 'Erreur', description: msg, variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="p-4 rounded-2xl border-2 border-amber-300 bg-amber-50/50 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-sm">📝 Corrigé officiel</h3>
        {onCancel && (
          <button onClick={onCancel} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
        )}
      </div>

      {questionText !== undefined && (
        <div>
          <label className="text-xs font-bold text-muted-foreground">Question (optionnel — pour rappel)</label>
          <div className="mt-1">
            <BaribaSmartTextarea
              value={questionText}
              onChange={setQuestionText}
              rows={2}
              placeholder="Énoncé de la question..."
              className="bg-background border-input focus:border-amber-400"
            />
          </div>
        </div>
      )}

      <div>
        <label className="text-xs font-bold text-muted-foreground">Réponses acceptées (variantes Baatonum / FR)</label>
        <div className="space-y-2 mt-1">
          {answers.map((a, i) => (
            <div key={i} className="flex gap-2 items-start">
              <div className="flex-1">
                <BaribaSmartInput
                  value={a}
                  onChange={(v) => setAnswers(prev => prev.map((x, j) => j === i ? v : x))}
                  placeholder={`Réponse ${i + 1}`}
                  className="bg-background border-input focus:border-amber-400"
                />
              </div>
              {answers.length > 1 && (
                <button onClick={() => setAnswers(prev => prev.filter((_, j) => j !== i))} className="px-2 py-2 text-red-500 hover:bg-red-50 rounded">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
          <button
            onClick={() => setAnswers(prev => [...prev, ''])}
            className="text-xs flex items-center gap-1 px-2 py-1 rounded bg-white border border-amber-300 text-amber-700 hover:bg-amber-100"
          >
            <Plus className="w-3 h-3" /> Ajouter une variante
          </button>
        </div>
      </div>

      <div>
        <label className="text-xs font-bold text-muted-foreground">Explication / commentaire pédagogique</label>
        <div className="mt-1">
          <BaribaSmartTextarea
            value={explanation}
            onChange={(v) => setExplanation(v.slice(0, 2000))}
            rows={3}
            placeholder="Explication affichée à l'apprenant (max 2000 car.)"
            className="bg-background border-input focus:border-amber-400"
          />
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <Button onClick={handleSave} disabled={saving} className="flex-1 bg-amber-500 hover:bg-amber-600">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-1" /> Enregistrer</>}
        </Button>
        {initial?.id && (
          <Button onClick={handleDelete} disabled={deleting} variant="outline" className="text-red-600 border-red-300 hover:bg-red-50">
            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          </Button>
        )}
      </div>
    </div>
  );
}
