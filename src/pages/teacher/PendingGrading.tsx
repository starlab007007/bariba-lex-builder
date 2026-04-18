import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import AnswerReview from '@/components/teacher/AnswerReview';
import { Loader2 } from 'lucide-react';

export default function PendingGrading() {
  const [items, setItems] = useState<Array<Parameters<typeof AnswerReview>[0]['answer'] & { updated_at: string }>>([]);
  const [profiles, setProfiles] = useState<Map<string, string>>(new Map());
  const [moduleFilter, setModuleFilter] = useState<string>('all');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    (async () => {
      setLoading(true);
      let q = supabase
        .from('classe_student_answers')
        .select('id, user_id, level, module, lesson_id, section_key, question_idx, answer_text, field_data, score, max_score, teacher_grade, teacher_comment, updated_at')
        .is('graded_at', null)
        .order('updated_at', { ascending: false })
        .limit(100);
      if (moduleFilter !== 'all') q = q.eq('module', moduleFilter as never);
      if (levelFilter !== 'all') q = q.eq('level', levelFilter);
      const { data } = await q;
      const list = (data ?? []) as never as typeof items;
      setItems(list);

      const ids = [...new Set(list.map(i => i.user_id))];
      if (ids.length) {
        const { data: profs } = await supabase.from('tamtam_profiles').select('user_id, display_name, username, phone_number').in('user_id', ids);
        const m = new Map<string, string>();
        (profs ?? []).forEach((p: { user_id: string; display_name?: string; username?: string; phone_number?: string }) => {
          const dn = p.display_name?.trim();
          const un = p.username?.trim();
          let label: string;
          if (dn && dn !== 'Nouvel utilisateur') label = dn;
          else if (un && !un.startsWith('user_')) label = `@${un}`;
          else if (p.phone_number) label = `📱 ${p.phone_number.replace(/\D/g, '').slice(-8)}`;
          else label = `Apprenant ${p.user_id.slice(0, 4).toUpperCase()}`;
          m.set(p.user_id, label);
        });
        setProfiles(m);
      }
      setLoading(false);
    })();
  }, [moduleFilter, levelFilter, tick]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <select value={moduleFilter} onChange={e => setModuleFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-border bg-background text-sm">
          <option value="all">Tous modules</option>
          <option value="calcul">Calcul</option>
          <option value="gestion">Gestion</option>
          <option value="lesson">Leçon</option>
          <option value="evaluation">Évaluation</option>
          <option value="grammaire">Grammaire</option>
          <option value="textprod">Production</option>
        </select>
        <select value={levelFilter} onChange={e => setLevelFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-border bg-background text-sm">
          <option value="all">N1 + N2</option>
          <option value="N1">N1 uniquement</option>
          <option value="N2">N2 uniquement</option>
        </select>
        <span className="ml-auto text-sm text-muted-foreground self-center">{items.length} à corriger</span>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : items.length === 0 ? (
        <p className="p-8 text-center text-muted-foreground rounded-2xl bg-muted/30">🎉 Tout est à jour, aucune copie en attente !</p>
      ) : items.map(a => (
        <div key={a.id}>
          <p className="text-xs text-muted-foreground mb-1 px-1">
            👤 <Link to={`/fitila/teacher/student/${a.user_id}`} className="font-semibold text-blue-600 hover:underline">{profiles.get(a.user_id) ?? a.user_id.slice(0, 8)}</Link>
            <span className="ml-2">— {new Date(a.updated_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</span>
          </p>
          <AnswerReview answer={a} studentName={profiles.get(a.user_id)} onGraded={() => setTick(t => t + 1)} />
        </div>
      ))}
    </div>
  );
}
