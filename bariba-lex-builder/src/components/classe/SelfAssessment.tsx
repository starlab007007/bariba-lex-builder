import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Heart } from 'lucide-react';

interface SelfAssessmentProps {
  level: string;
  module: string;
  lessonId: string;
}

export default function SelfAssessment({ level, module, lessonId }: SelfAssessmentProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [confidence, setConfidence] = useState<number>(10);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('classe_self_assessments')
        .select('confidence_grade, notes')
        .eq('user_id', user.id).eq('level', level).eq('module', module).eq('lesson_id', lessonId)
        .maybeSingle();
      if (data) {
        setConfidence(Number(data.confidence_grade));
        setNotes(data.notes ?? '');
      }
      setLoading(false);
    })();
  }, [user, level, module, lessonId]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from('classe_self_assessments').upsert({
      user_id: user.id, level, module, lesson_id: lessonId,
      confidence_grade: confidence, notes: notes || null,
    }, { onConflict: 'user_id,level,module,lesson_id' });
    setSaving(false);
    if (error) toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    else toast({ title: '✅ Auto-évaluation enregistrée' });
  };

  if (!user) return null;
  if (loading) return <Loader2 className="w-4 h-4 animate-spin" />;

  return (
    <div className="p-3 rounded-xl bg-pink-50 border border-pink-200 space-y-2">
      <div className="flex items-center gap-2">
        <Heart className="w-4 h-4 text-pink-600 fill-pink-200" />
        <span className="text-xs font-bold text-pink-900">Mon auto-évaluation /20</span>
        <span className="ml-auto text-lg font-black text-pink-700">{confidence}/20</span>
      </div>
      <input type="range" min={0} max={20} step={1} value={confidence} onChange={(e) => setConfidence(parseInt(e.target.value))} className="w-full accent-pink-500" />
      <textarea value={notes} onChange={(e) => setNotes(e.target.value.slice(0, 500))} placeholder="Mes remarques (optionnel)…"
        className="w-full text-xs p-2 rounded-lg border border-pink-200 bg-white" rows={2} />
      <button onClick={save} disabled={saving}
        className="w-full py-1.5 rounded-lg bg-pink-500 text-white text-xs font-bold hover:bg-pink-600">
        {saving ? <Loader2 className="w-3 h-3 animate-spin inline" /> : 'Enregistrer'}
      </button>
    </div>
  );
}
