import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Download, CheckCircle2, XCircle, Trash2, RefreshCw, Filter, Search } from 'lucide-react';
import { toast } from 'sonner';

interface Recording {
  id: string;
  user_id: string;
  phrase_id: string;
  storage_path: string;
  file_name: string;
  duration_seconds: number | null;
  mime_type: string | null;
  file_size_bytes: number | null;
  validated: boolean;
  rejected: boolean;
  admin_notes: string | null;
  created_at: string;
  bariba_corpus_phrases?: {
    text_bariba: string;
    text_french: string | null;
    category: string;
  } | null;
  audio_url?: string;
  username?: string | null;
}

const PAGE_SIZE = 25;

export default function VoiceRecordingsBrowser() {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState<'all' | 'pending' | 'validated' | 'rejected'>('all');
  const [search, setSearch] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('bariba_voice_recordings')
        .select('*, bariba_corpus_phrases(text_bariba, text_french, category)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

      if (filter === 'pending') query = query.eq('validated', false).eq('rejected', false);
      if (filter === 'validated') query = query.eq('validated', true);
      if (filter === 'rejected') query = query.eq('rejected', true);

      const { data, error, count } = await query;
      if (error) throw error;

      let rows = (data || []) as any[];
      if (categoryFilter !== 'all') {
        rows = rows.filter(r => r.bariba_corpus_phrases?.category === categoryFilter);
      }
      if (search.trim()) {
        const s = search.toLowerCase();
        rows = rows.filter(r =>
          r.bariba_corpus_phrases?.text_bariba?.toLowerCase().includes(s) ||
          r.bariba_corpus_phrases?.text_french?.toLowerCase().includes(s) ||
          r.file_name?.toLowerCase().includes(s)
        );
      }

      // Build signed URLs (private bucket)
      const withUrls = await Promise.all(rows.map(async (r: any) => {
        const { data: signed } = await supabase.storage
          .from('bariba-voice-corpus')
          .createSignedUrl(r.storage_path, 3600);
        return { ...r, audio_url: signed?.signedUrl };
      }));

      // Resolve usernames
      const userIds = Array.from(new Set(withUrls.map(r => r.user_id)));
      if (userIds.length) {
        const { data: profs } = await supabase
          .from('tamtam_profiles')
          .select('user_id, username, display_name')
          .in('user_id', userIds);
        withUrls.forEach((r: any) => {
          const p = profs?.find((x: any) => x.user_id === r.user_id);
          r.username = p?.display_name || p?.username || null;
        });
      }

      setRecordings(withUrls);
      setTotal(count || 0);

      // Extract categories from full unfiltered fetch (cheap query)
      if (categories.length === 0) {
        const { data: cats } = await supabase
          .from('bariba_corpus_phrases')
          .select('category')
          .eq('is_active', true);
        const unique = Array.from(new Set((cats || []).map((c: any) => c.category))).sort();
        setCategories(unique);
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [page, filter, categoryFilter, search, categories.length]);

  useEffect(() => { load(); }, [load]);

  const setStatus = async (id: string, patch: Partial<Recording>) => {
    const { error } = await supabase
      .from('bariba_voice_recordings')
      .update(patch as any)
      .eq('id', id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Mis à jour');
    setRecordings(prev => prev.map(r => r.id === id ? { ...r, ...patch } as Recording : r));
  };

  const deleteRecording = async (r: Recording) => {
    if (!confirm(`Supprimer définitivement cet enregistrement ?\n\n"${r.bariba_corpus_phrases?.text_bariba || r.file_name}"`)) return;
    try {
      await supabase.storage.from('bariba-voice-corpus').remove([r.storage_path]);
      const { error } = await supabase.from('bariba_voice_recordings').delete().eq('id', r.id);
      if (error) throw error;
      toast.success('Supprimé');
      setRecordings(prev => prev.filter(x => x.id !== r.id));
    } catch (e: any) {
      toast.error(e.message || 'Erreur de suppression');
    }
  };

  const downloadOne = (r: Recording) => {
    if (!r.audio_url) {
      toast.error('Lien indisponible');
      return;
    }
    const a = document.createElement('a');
    a.href = r.audio_url;
    a.download = r.file_name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const formatDuration = (sec: number | null) => {
    if (!sec) return '—';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 bg-card border rounded-lg p-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <select
            value={filter}
            onChange={(e) => { setPage(0); setFilter(e.target.value as any); }}
            className="text-sm rounded-md border bg-background px-2 py-1.5"
          >
            <option value="all">Tous les statuts</option>
            <option value="pending">⏳ En attente</option>
            <option value="validated">✓ Validés</option>
            <option value="rejected">✗ Rejetés</option>
          </select>
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => { setPage(0); setCategoryFilter(e.target.value); }}
          className="text-sm rounded-md border bg-background px-2 py-1.5"
        >
          <option value="all">Toutes catégories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher (texte ou nom de fichier)…"
            className="flex-1 text-sm rounded-md border bg-background px-2 py-1.5"
          />
        </div>

        <button
          onClick={() => load()}
          className="inline-flex items-center gap-1 text-sm rounded-md border bg-background hover:bg-accent px-3 py-1.5"
        >
          <RefreshCw className="w-4 h-4" /> Actualiser
        </button>

        <div className="text-xs text-muted-foreground ml-auto">
          {total} enregistrements au total
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : recordings.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground border rounded-lg bg-card">
          Aucun enregistrement à afficher.
        </div>
      ) : (
        <div className="space-y-2">
          {recordings.map((r) => (
            <div
              key={r.id}
              className={`border rounded-lg p-3 bg-card space-y-2 ${
                r.rejected ? 'border-destructive/40' : r.validated ? 'border-emerald-500/40' : ''
              }`}
            >
              <div className="flex flex-wrap items-start gap-3">
                <div className="flex-1 min-w-[260px]">
                  <div className="flex items-center gap-2 flex-wrap">
                    {r.bariba_corpus_phrases?.category && (
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary">
                        {r.bariba_corpus_phrases.category}
                      </span>
                    )}
                    {r.validated && <span className="text-xs text-emerald-600 font-bold">✓ Validé</span>}
                    {r.rejected && <span className="text-xs text-destructive font-bold">✗ Rejeté</span>}
                    {!r.validated && !r.rejected && <span className="text-xs text-amber-600 font-bold">⏳ En attente</span>}
                  </div>
                  <p className="font-bold text-sm mt-1 leading-snug">{r.bariba_corpus_phrases?.text_bariba || '(phrase supprimée)'}</p>
                  {r.bariba_corpus_phrases?.text_french && (
                    <p className="text-xs text-muted-foreground italic">{r.bariba_corpus_phrases.text_french}</p>
                  )}
                  <div className="text-[11px] text-muted-foreground mt-1 flex flex-wrap gap-3">
                    <span>👤 {r.username || r.user_id.slice(0, 8)}</span>
                    <span>⏱ {formatDuration(r.duration_seconds)}</span>
                    <span>💾 {formatSize(r.file_size_bytes)}</span>
                    <span>🎧 {r.mime_type || '—'}</span>
                    <span>📅 {new Date(r.created_at).toLocaleString('fr-FR')}</span>
                    <span className="font-mono opacity-70">{r.file_name}</span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  {r.audio_url ? (
                    <audio controls src={r.audio_url} className="h-9" />
                  ) : (
                    <span className="text-xs text-destructive">Audio indisponible</span>
                  )}
                  <div className="flex flex-wrap gap-1">
                    <button
                      onClick={() => downloadOne(r)}
                      title="Télécharger ce fichier"
                      className="inline-flex items-center gap-1 text-xs rounded-md border bg-background hover:bg-accent px-2 py-1"
                    >
                      <Download className="w-3.5 h-3.5" /> WAV
                    </button>
                    {!r.validated && (
                      <button
                        onClick={() => setStatus(r.id, { validated: true, rejected: false })}
                        title="Valider"
                        className="inline-flex items-center gap-1 text-xs rounded-md bg-emerald-500 hover:bg-emerald-600 text-white px-2 py-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Valider
                      </button>
                    )}
                    {!r.rejected && (
                      <button
                        onClick={() => setStatus(r.id, { rejected: true, validated: false })}
                        title="Rejeter"
                        className="inline-flex items-center gap-1 text-xs rounded-md bg-amber-500 hover:bg-amber-600 text-white px-2 py-1"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Rejeter
                      </button>
                    )}
                    <button
                      onClick={() => deleteRecording(r)}
                      title="Supprimer définitivement"
                      className="inline-flex items-center gap-1 text-xs rounded-md bg-destructive hover:opacity-90 text-destructive-foreground px-2 py-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between border-t pt-3">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="text-sm rounded-md border bg-background px-3 py-1.5 disabled:opacity-40"
          >
            ← Précédent
          </button>
          <span className="text-xs text-muted-foreground">
            Page {page + 1} / {Math.ceil(total / PAGE_SIZE)}
          </span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={(page + 1) * PAGE_SIZE >= total}
            className="text-sm rounded-md border bg-background px-3 py-1.5 disabled:opacity-40"
          >
            Suivant →
          </button>
        </div>
      )}
    </div>
  );
}
