import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Loader2, Search, ChevronRight } from 'lucide-react';

interface Row {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  n1_completed: number;
  n2_completed: number;
  last_updated: string;
  pending_count: number;
}

export default function StudentList() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  useEffect(() => {
    (async () => {
      const { data: progress } = await supabase
        .from('classe_student_progress')
        .select('user_id, level, completed_lessons, updated_at');

      const userIds = [...new Set((progress ?? []).map(p => p.user_id))];
      const [profiles, pending] = await Promise.all([
        userIds.length ? supabase.from('tamtam_profiles').select('user_id, username, display_name, avatar_url').in('user_id', userIds) : Promise.resolve({ data: [] as never[] }),
        supabase.from('classe_student_answers').select('user_id').is('graded_at', null),
      ]);

      const profileMap = new Map((profiles.data ?? []).map((p: { user_id: string }) => [p.user_id, p]));
      const pendingCount = new Map<string, number>();
      (pending.data ?? []).forEach((a: { user_id: string }) => pendingCount.set(a.user_id, (pendingCount.get(a.user_id) ?? 0) + 1));

      const merged = userIds.map(uid => {
        const userRows = (progress ?? []).filter(p => p.user_id === uid);
        const n1 = userRows.find(p => p.level === 'N1');
        const n2 = userRows.find(p => p.level === 'N2');
        const profile = profileMap.get(uid) as { username?: string; display_name?: string; avatar_url?: string } | undefined;
        return {
          user_id: uid,
          username: profile?.username ?? null,
          display_name: profile?.display_name ?? null,
          avatar_url: profile?.avatar_url ?? null,
          n1_completed: (n1?.completed_lessons as number[] | null)?.length ?? 0,
          n2_completed: (n2?.completed_lessons as number[] | null)?.length ?? 0,
          last_updated: [n1?.updated_at, n2?.updated_at].filter(Boolean).sort().reverse()[0] ?? '',
          pending_count: pendingCount.get(uid) ?? 0,
        };
      });

      merged.sort((a, b) => (b.last_updated || '').localeCompare(a.last_updated || ''));
      setRows(merged);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const needle = q.toLowerCase().trim();
    if (!needle) return rows;
    return rows.filter(r => (r.display_name ?? '').toLowerCase().includes(needle) || (r.username ?? '').toLowerCase().includes(needle));
  }, [rows, q]);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher un apprenant…" className="pl-9" />
      </div>

      <div className="rounded-2xl bg-card border border-border overflow-hidden">
        {filtered.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">Aucun apprenant trouvé.</p>
        ) : filtered.map(r => (
          <Link
            key={r.user_id}
            to={`/fitila/teacher/student/${r.user_id}`}
            className="flex items-center gap-3 p-4 border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors"
          >
            {r.avatar_url ? (
              <img src={r.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold">
                {(r.display_name ?? r.username ?? '?').charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{r.display_name ?? r.username ?? r.user_id.slice(0, 8)}</p>
              <p className="text-xs text-muted-foreground">N1: {r.n1_completed} leçons · N2: {r.n2_completed} leçons</p>
            </div>
            {r.pending_count > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-xs font-bold">{r.pending_count} à noter</span>
            )}
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </Link>
        ))}
      </div>
    </div>
  );
}
