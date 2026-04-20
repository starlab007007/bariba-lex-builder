import { useMemo, useState } from 'react';
import { useAdminAudioQueue, useUpdateAudioStatus, useGetSignedUrl, type ClasseAudioRow, type AudioStatus } from '@/hooks/useClasseAudio';
import { MODULE_CATALOG, getAllContentItems } from '@/lib/classeContentKeys';
import QualityBadge from '@/components/teacher/voice/QualityBadge';
import { Loader2, CheckCircle2, XCircle, Volume2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ClasseAudioReview() {
  const [status, setStatus] = useState<AudioStatus | undefined>('submitted');
  const [level, setLevel] = useState<string | undefined>();
  const [module, setModule] = useState<string | undefined>();
  const { data = [], isLoading, refetch } = useAdminAudioQueue({ status, level, module });
  const update = useUpdateAudioStatus();
  const getSignedUrl = useGetSignedUrl();
  const [urls, setUrls] = useState<Record<string, string>>({});

  async function ensureUrl(row: ClasseAudioRow) {
    if (urls[row.id]) return urls[row.id];
    const u = await getSignedUrl(row.storage_path, 3600);
    setUrls(p => ({ ...p, [row.id]: u }));
    return u;
  }

  async function approve(row: ClasseAudioRow) {
    try { await update.mutateAsync({ id: row.id, status: 'approved' }); toast.success('Audio approuvé'); refetch(); }
    catch (e: any) { toast.error(e?.message ?? 'Erreur'); }
  }
  async function reject(row: ClasseAudioRow) {
    const note = prompt('Motif du rejet (visible par l\'enseignant) :');
    if (note == null) return;
    try { await update.mutateAsync({ id: row.id, status: 'rejected', admin_notes: note }); toast.success('Audio rejeté'); refetch(); }
    catch (e: any) { toast.error(e?.message ?? 'Erreur'); }
  }

  // Coverage
  const coverage = useMemo(() => {
    const all = getAllContentItems();
    const totals = new Map<string, number>(); // key: level|module
    for (const it of all) {
      const k = `${it.level}|${it.module}`;
      totals.set(k, (totals.get(k) ?? 0) + 1);
    }
    return totals;
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 p-3 rounded-lg border border-border bg-card">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold">Statut</label>
          <select value={status ?? ''} onChange={e => setStatus((e.target.value || undefined) as AudioStatus | undefined)} className="px-2 py-1 rounded border border-border bg-background text-sm">
            <option value="">Tous</option>
            <option value="submitted">Soumis</option>
            <option value="approved">Approuvés</option>
            <option value="rejected">Rejetés</option>
            <option value="draft">Brouillons</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold">Niveau</label>
          <select value={level ?? ''} onChange={e => setLevel(e.target.value || undefined)} className="px-2 py-1 rounded border border-border bg-background text-sm">
            <option value="">Tous</option><option value="N1">N1</option><option value="N2">N2</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold">Module</label>
          <select value={module ?? ''} onChange={e => setModule(e.target.value || undefined)} className="px-2 py-1 rounded border border-border bg-background text-sm">
            <option value="">Tous</option>
            <option value="lang">Langue</option><option value="calcul">Calcul</option><option value="eval">Évaluations</option>
          </select>
        </div>
      </div>

      {/* Coverage table */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
        {MODULE_CATALOG.map(m => {
          const k = `${m.level}|${m.module}`;
          return (
            <div key={k} className="p-3 rounded-lg border border-border bg-card text-sm">
              <div className="font-bold">{m.emoji} {m.level} · {m.label}</div>
              <div className="text-muted-foreground text-xs">{coverage.get(k) ?? 0} éléments à enregistrer</div>
            </div>
          );
        })}
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Chargement…</div>
      ) : data.length === 0 ? (
        <div className="text-center text-muted-foreground py-10">Aucun audio dans cette file.</div>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-card">
          {data.map(row => (
            <li key={row.id} className="p-3 flex flex-wrap items-start gap-3">
              <div className="flex-1 min-w-[240px]">
                <div className="text-xs font-mono text-muted-foreground">{row.content_key}</div>
                <div className="text-sm font-bold">{row.hierarchy_label}</div>
                <div className="text-sm whitespace-pre-wrap mt-1 text-foreground/80">{row.content_text}</div>
              </div>
              <div className="flex flex-col gap-2 items-end">
                <div className="flex flex-wrap items-center gap-2">
                  {row.duration_seconds != null && <span className="text-xs text-muted-foreground">{row.duration_seconds.toFixed(1)}s</span>}
                  <QualityBadge score={row.quality_score} />
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-muted">{row.status}</span>
                </div>
                {urls[row.id] ? (
                  <audio src={urls[row.id]} controls className="h-8" />
                ) : (
                  <button onClick={() => ensureUrl(row)} className="text-xs px-2 py-1 rounded border border-border hover:bg-muted inline-flex items-center gap-1">
                    <Volume2 className="w-3 h-3" /> Charger l'audio
                  </button>
                )}
                <div className="flex gap-2">
                  <button onClick={() => approve(row)} disabled={update.isPending} className="text-xs px-2 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700 inline-flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Approuver
                  </button>
                  <button onClick={() => reject(row)} disabled={update.isPending} className="text-xs px-2 py-1 rounded bg-rose-600 text-white hover:bg-rose-700 inline-flex items-center gap-1">
                    <XCircle className="w-3 h-3" /> Rejeter
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}