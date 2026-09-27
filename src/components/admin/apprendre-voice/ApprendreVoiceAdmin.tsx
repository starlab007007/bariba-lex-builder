import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import type { SupabaseClient } from '@supabase/supabase-js';
import { toast } from 'sonner';
import {
  Activity, BookOpenCheck, CheckCircle2, ClipboardList, Flag, Loader2, Mic, Play, Power,
  RefreshCw, Settings2, ShieldCheck, Upload, Users, XCircle,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

// Tables ajoutées par la migration 20260927100100 : client non typé, isolé ici.
const db = supabase as unknown as SupabaseClient;
const BUCKET = 'apprendre-audio';

const KIND_LABELS: Record<string, string> = {
  lecon: 'Leçons', proverbe: 'Proverbes', scene: 'Scènes de vie', mot: 'Mots', exemple: 'Phrases d’exemple', forme: 'Formes',
};
const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon', submitted: 'À valider', approved: 'Approuvée', rejected: 'Rejetée', needs_fix: 'À corriger', withdrawn: 'Retirée',
};
const REASONS: Record<string, string> = {
  bruit: 'Bruit de fond', coupure: 'Son coupé', mauvais_mot: 'Mauvais mot', ton_douteux: 'Ton douteux',
  texte_errone: 'Texte erroné', volume: 'Volume', autre: 'Autre',
};

interface Stats {
  items: number;
  covered: number;
  by_kind: Record<string, { total: number; covered: number }>;
  by_status: Record<string, number>;
  reject_reasons: Record<string, number>;
  avg_review_hours: number | null;
  open_issues: number;
  speakers: { speaker_id: string; display_name: string | null; voice: string | null; variant: string | null; takes: number; approved: number; rejected: number }[];
}

interface Take {
  id: string;
  audio_key: string;
  speaker_id: string;
  voice: string;
  variant: string;
  storage_path: string;
  duration_ms: number | null;
  quality_score: number | null;
  snr_db: number | null;
  status: string;
  approvals: number;
  is_active: boolean;
  submitted_at: string | null;
}

interface Item {
  audio_key: string;
  text_ba: string;
  text_fr: string | null;
  kind: string;
  source_page: number | null;
  pack: string;
  priority: number;
}

interface SettingsRow {
  auto_activate: boolean;
  approvals_required: number;
  default_variant: string;
  allow_tts_fallback: boolean;
  min_quality_score: number;
  compare_very_close: number;
  compare_close: number;
  compare_mfcc_good: number;
  compare_mfcc_bad: number;
  compare_calibrated: boolean;
  consent_version: string;
  consent_text: string;
}

function errorText(e: unknown): string {
  if (e && typeof e === 'object' && 'message' in e) return String((e as { message: unknown }).message);
  return 'Erreur inconnue';
}

async function itemsFor(keys: string[]): Promise<Record<string, Item>> {
  const out: Record<string, Item> = {};
  for (let i = 0; i < keys.length; i += 200) {
    const { data, error } = await db
      .from('apprendre_audio_items')
      .select('audio_key, text_ba, text_fr, kind, source_page, pack, priority')
      .in('audio_key', keys.slice(i, i + 200));
    if (error) throw error;
    for (const row of (data ?? []) as Item[]) out[row.audio_key] = row;
  }
  return out;
}

function AudioPlayer({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  async function load() {
    setLoading(true);
    const { data, error } = await db.storage.from(BUCKET).createSignedUrl(path, 3600);
    setLoading(false);
    if (error || !data) { toast.error('Fichier audio introuvable'); return; }
    setUrl(data.signedUrl);
  }
  if (url) return <audio src={url} controls autoPlay className="h-8 w-56" />;
  return (
    <Button variant="outline" size="sm" onClick={load} disabled={loading}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />} Écouter
    </Button>
  );
}

// ───────────────────────── Tableau de bord ─────────────────────────
function DashboardTab() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await db.rpc('apprendre_audio_stats');
    setLoading(false);
    if (error) { toast.error(errorText(error)); return; }
    setStats(data as Stats);
  }, []);
  useEffect(() => { load(); }, [load]);

  if (loading) return <Loader2 className="h-6 w-6 animate-spin" />;
  if (!stats) return <p className="text-sm text-muted-foreground">Statistiques indisponibles.</p>;
  const pct = stats.items ? Math.round((stats.covered / stats.items) * 100) : 0;
  const order = ['lecon', 'proverbe', 'scene', 'mot', 'exemple', 'forme'];
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardDescription>Textes avec voix active</CardDescription><CardTitle className="text-3xl">{stats.covered} / {stats.items}</CardTitle></CardHeader><CardContent><Progress value={pct} /><p className="mt-1 text-xs text-muted-foreground">{pct} % du catalogue audible</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Prises à valider</CardDescription><CardTitle className="text-3xl">{stats.by_status.submitted ?? 0}</CardTitle></CardHeader><CardContent className="text-xs text-muted-foreground">Délai moyen de validation : {stats.avg_review_hours ?? '—'} h</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Prises approuvées</CardDescription><CardTitle className="text-3xl">{stats.by_status.approved ?? 0}</CardTitle></CardHeader><CardContent className="text-xs text-muted-foreground">{stats.by_status.rejected ?? 0} rejetées · {stats.by_status.needs_fix ?? 0} à corriger</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Signalements ouverts</CardDescription><CardTitle className="text-3xl">{stats.open_issues}</CardTitle></CardHeader><CardContent className="text-xs text-muted-foreground">Textes ou tons à revoir</CardContent></Card>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Couverture par type de texte</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {order.filter(k => stats.by_kind[k]).map(k => {
              const v = stats.by_kind[k];
              const p = v.total ? Math.round((v.covered / v.total) * 100) : 0;
              return (
                <div key={k}>
                  <div className="flex justify-between text-sm"><span>{KIND_LABELS[k] ?? k}</span><span className="text-muted-foreground">{v.covered} / {v.total}</span></div>
                  <Progress value={p} className="h-2" />
                </div>
              );
            })}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Motifs de rejet</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {Object.keys(stats.reject_reasons).length === 0 && <p className="text-sm text-muted-foreground">Aucun rejet pour l’instant.</p>}
            {Object.entries(stats.reject_reasons).map(([k, n]) => <Badge key={k} variant="outline">{REASONS[k] ?? k} · {n}</Badge>)}
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between"><CardTitle className="text-base">Activité des locuteurs</CardTitle><Button variant="ghost" size="sm" onClick={load}><RefreshCw className="h-4 w-4" /></Button></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Locuteur</TableHead><TableHead>Voix</TableHead><TableHead>Variante</TableHead><TableHead className="text-right">Prises</TableHead><TableHead className="text-right">Approuvées</TableHead><TableHead className="text-right">Rejetées</TableHead></TableRow></TableHeader>
            <TableBody>
              {stats.speakers.map(s => (
                <TableRow key={s.speaker_id}>
                  <TableCell>{s.display_name ?? s.speaker_id.slice(0, 8)}</TableCell>
                  <TableCell>{s.voice ?? '—'}</TableCell>
                  <TableCell>{s.variant ?? '—'}</TableCell>
                  <TableCell className="text-right">{s.takes}</TableCell>
                  <TableCell className="text-right">{s.approved}</TableCell>
                  <TableCell className="text-right">{s.rejected}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ───────────────────────── Validation ─────────────────────────
function ReviewTab() {
  const [takes, setTakes] = useState<Take[]>([]);
  const [items, setItems] = useState<Record<string, Item>>({});
  const [reason, setReason] = useState<Record<string, string>>({});
  const [comment, setComment] = useState<Record<string, string>>({});
  const [tone, setTone] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: auth } = await db.auth.getUser();
      const { data, error } = await db
        .from('apprendre_audio_takes')
        .select('id, audio_key, speaker_id, voice, variant, storage_path, duration_ms, quality_score, snr_db, status, approvals, is_active, submitted_at')
        .eq('status', 'submitted')
        .order('submitted_at', { ascending: true })
        .limit(100);
      if (error) throw error;
      const rows = ((data ?? []) as Take[]).filter(t => t.speaker_id !== auth.user?.id);
      setTakes(rows);
      setItems(await itemsFor([...new Set(rows.map(r => r.audio_key))]));
    } catch (e) {
      toast.error(errorText(e));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function decide(take: Take, decision: 'approve' | 'reject' | 'needs_fix') {
    if (decision !== 'approve' && !reason[take.id]) { toast.error('Choisis un motif.'); return; }
    setBusy(take.id);
    const { data, error } = await db.rpc('apprendre_review_take', {
      _take_id: take.id, _decision: decision,
      _score_clarity: null, _score_tone: null, _score_natural: null, _score_noise: null,
      _reason: decision === 'approve' ? null : reason[take.id], _tone_confirmed: tone[take.id] ?? false,
      _comment: comment[take.id] || null,
    });
    setBusy(null);
    if (error) { toast.error(errorText(error)); return; }
    toast.success(`Avis enregistré : ${STATUS_LABELS[String(data)] ?? data}`);
    setTakes(prev => prev.filter(t => t.id !== take.id));
  }

  if (loading) return <Loader2 className="h-6 w-6 animate-spin" />;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{takes.length} prise(s) soumise(s) par d’autres contributeurs. Vous ne voyez jamais vos propres prises ici.</p>
        <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4" /> Actualiser</Button>
      </div>
      {takes.length === 0 && <Card><CardContent className="p-6 text-sm text-muted-foreground">Aucune prise en attente.</CardContent></Card>}
      {takes.map(t => {
        const it = items[t.audio_key];
        return (
          <Card key={t.id}>
            <CardContent className="grid gap-3 p-4 md:grid-cols-[1fr_auto]">
              <div className="space-y-1">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{KIND_LABELS[it?.kind ?? ''] ?? it?.kind}</Badge>
                  <Badge variant="outline">Voix {t.voice} · {t.variant}</Badge>
                  <Badge variant="secondary">Qualité {t.quality_score ?? '—'}</Badge>
                  {t.approvals > 0 && <Badge>{t.approvals} avis favorable(s)</Badge>}
                </div>
                <p className="text-xl font-semibold">{it?.text_ba ?? t.audio_key}</p>
                <p className="text-sm text-muted-foreground">{it?.text_fr}{it?.source_page ? ` · Dictionnaire, p. ${it.source_page}` : ''}</p>
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <AudioPlayer path={t.storage_path} />
                  <select className="h-9 rounded border border-border bg-background px-2 text-sm" value={reason[t.id] ?? ''} onChange={e => setReason(p => ({ ...p, [t.id]: e.target.value }))}>
                    <option value="">Motif (rejet ou correction)</option>
                    {Object.entries(REASONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  <label className="flex items-center gap-2 text-sm"><Switch checked={tone[t.id] ?? false} onCheckedChange={v => setTone(p => ({ ...p, [t.id]: v }))} />Ton confirmé</label>
                </div>
                <Input placeholder="Commentaire pour le locuteur (facultatif)" value={comment[t.id] ?? ''} onChange={e => setComment(p => ({ ...p, [t.id]: e.target.value }))} />
              </div>
              <div className="flex flex-row gap-2 md:flex-col">
                <Button onClick={() => decide(t, 'approve')} disabled={busy === t.id}><CheckCircle2 className="h-4 w-4" /> Approuver</Button>
                <Button variant="outline" onClick={() => decide(t, 'needs_fix')} disabled={busy === t.id}>À corriger</Button>
                <Button variant="destructive" onClick={() => decide(t, 'reject')} disabled={busy === t.id}><XCircle className="h-4 w-4" /> Rejeter</Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ───────────────────────── Publication ─────────────────────────
function PublishTab() {
  const [takes, setTakes] = useState<Take[]>([]);
  const [items, setItems] = useState<Record<string, Item>>({});
  const [filter, setFilter] = useState<'pending' | 'active'>('pending');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let query = db
        .from('apprendre_audio_takes')
        .select('id, audio_key, speaker_id, voice, variant, storage_path, duration_ms, quality_score, snr_db, status, approvals, is_active, submitted_at')
        .eq('status', 'approved')
        .order('reviewed_at', { ascending: false })
        .limit(300);
      query = query.eq('is_active', filter === 'active');
      const { data, error } = await query;
      if (error) throw error;
      const rows = (data ?? []) as Take[];
      setTakes(rows);
      setItems(await itemsFor([...new Set(rows.map(r => r.audio_key))]));
    } catch (e) {
      toast.error(errorText(e));
    } finally {
      setLoading(false);
    }
  }, [filter]);
  useEffect(() => { load(); }, [load]);

  async function toggle(take: Take, active: boolean) {
    const { error } = await db.rpc('apprendre_activate_take', { _take_id: take.id, _active: active });
    if (error) { toast.error(errorText(error)); return false; }
    return true;
  }

  async function activateAll() {
    setBusy(true);
    let ok = 0;
    for (const t of takes) if (await toggle(t, true)) ok++;
    setBusy(false);
    toast.success(`${ok} voix activée(s)`);
    load();
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant={filter === 'pending' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('pending')}>Approuvées, non actives</Button>
        <Button variant={filter === 'active' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('active')}>Actives (audibles)</Button>
        {filter === 'pending' && takes.length > 0 && (
          <Button size="sm" onClick={activateAll} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Power className="h-4 w-4" />} Activer les {takes.length}</Button>
        )}
      </div>
      {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : (
        <Table>
          <TableHeader><TableRow><TableHead>Texte</TableHead><TableHead>Type</TableHead><TableHead>Voix</TableHead><TableHead>Qualité</TableHead><TableHead>Écoute</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
          <TableBody>
            {takes.map(t => (
              <TableRow key={t.id}>
                <TableCell><div className="font-medium">{items[t.audio_key]?.text_ba ?? t.audio_key}</div><div className="text-xs text-muted-foreground">{items[t.audio_key]?.text_fr}</div></TableCell>
                <TableCell>{KIND_LABELS[items[t.audio_key]?.kind ?? ''] ?? '—'}</TableCell>
                <TableCell>{t.voice} · {t.variant}</TableCell>
                <TableCell>{t.quality_score ?? '—'}</TableCell>
                <TableCell><AudioPlayer path={t.storage_path} /></TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant={t.is_active ? 'outline' : 'default'} onClick={async () => { if (await toggle(t, !t.is_active)) { toast.success(t.is_active ? 'Voix retirée' : 'Voix activée'); load(); } }}>
                    {t.is_active ? 'Désactiver' : 'Activer'}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

// ───────────────────────── Lots ─────────────────────────
interface Contributor { user_id: string; display_name: string | null; voice: string; variant: string; withdrawn_at: string | null; allow_ai_training: boolean; roles: string[] }

async function loadContributors(): Promise<Contributor[]> {
  const [{ data: roles, error: e1 }, { data: consents, error: e2 }] = await Promise.all([
    db.from('user_roles').select('user_id, role').in('role', ['voice_speaker', 'voice_reviewer']),
    db.from('apprendre_voice_consents').select('user_id, display_name, voice, variant, withdrawn_at, allow_ai_training'),
  ]);
  if (e1) throw e1;
  if (e2) throw e2;
  const byUser = new Map<string, Contributor>();
  for (const r of (roles ?? []) as { user_id: string; role: string }[]) {
    const c = byUser.get(r.user_id) ?? { user_id: r.user_id, display_name: null, voice: '—', variant: '—', withdrawn_at: null, allow_ai_training: false, roles: [] };
    c.roles.push(r.role);
    byUser.set(r.user_id, c);
  }
  for (const c of (consents ?? []) as Omit<Contributor, 'roles'>[]) {
    const cur = byUser.get(c.user_id) ?? { ...c, roles: [] };
    byUser.set(c.user_id, { ...cur, ...c, roles: cur.roles });
  }
  return [...byUser.values()];
}

function LotsTab() {
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [lots, setLots] = useState<{ id: string; title: string; speaker_id: string; voice: string; audio_keys: string[]; due_date: string | null; status: string; created_at: string }[]>([]);
  const [title, setTitle] = useState('Lot pilote');
  const [speaker, setSpeaker] = useState('');
  const [reviewer, setReviewer] = useState('');
  const [voice, setVoice] = useState('femme');
  const [kind, setKind] = useState('');
  const [pack, setPack] = useState('');
  const [maxPriority, setMaxPriority] = useState(2);
  const [limit, setLimit] = useState(200);
  const [onlyMissing, setOnlyMissing] = useState(true);
  const [due, setDue] = useState('');
  const [preview, setPreview] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setContributors(await loadContributors());
      const { data, error } = await db.from('apprendre_audio_assignments').select('id, title, speaker_id, voice, audio_keys, due_date, status, created_at').order('created_at', { ascending: false }).limit(100);
      if (error) throw error;
      setLots(data ?? []);
    } catch (e) {
      toast.error(errorText(e));
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const names = useMemo(() => Object.fromEntries(contributors.map(c => [c.user_id, c.display_name ?? c.user_id.slice(0, 8)])), [contributors]);

  async function computePreview() {
    setBusy(true);
    try {
      let query = db.from('apprendre_audio_items').select('audio_key').eq('in_content', true).lte('priority', maxPriority).order('priority').order('audio_key').limit(Math.max(limit * 3, 300));
      if (kind) query = query.eq('kind', kind);
      if (pack) query = query.like('pack', `${pack}%`);
      const { data, error } = await query;
      if (error) throw error;
      let keys = ((data ?? []) as { audio_key: string }[]).map(r => r.audio_key);
      if (onlyMissing && keys.length) {
        const covered = new Set<string>();
        for (let i = 0; i < keys.length; i += 200) {
          const { data: pub } = await db.from('apprendre_audio_published').select('audio_key, voice').in('audio_key', keys.slice(i, i + 200)).eq('voice', voice);
          for (const r of (pub ?? []) as { audio_key: string }[]) covered.add(r.audio_key);
        }
        const open = new Set(lots.filter(l => l.status === 'open' && l.voice === voice).flatMap(l => l.audio_keys));
        keys = keys.filter(k => !covered.has(k) && !open.has(k));
      }
      setPreview(keys.slice(0, limit));
    } catch (e) {
      toast.error(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  async function create() {
    if (!speaker || !preview?.length) { toast.error('Choisis un locuteur et calcule le lot.'); return; }
    const { data: auth } = await db.auth.getUser();
    const { error } = await db.from('apprendre_audio_assignments').insert({
      title, speaker_id: speaker, reviewer_id: reviewer || null, voice, audio_keys: preview,
      filter: { kind: kind || null, pack: pack || null, max_priority: maxPriority, only_missing: onlyMissing },
      due_date: due || null, created_by: auth.user?.id ?? null,
    });
    if (error) { toast.error(errorText(error)); return; }
    toast.success(`Lot créé : ${preview.length} textes`);
    setPreview(null);
    load();
  }

  async function setStatus(id: string, status: string) {
    const { error } = await db.from('apprendre_audio_assignments').update({ status }).eq('id', id);
    if (error) toast.error(errorText(error)); else load();
  }

  const speakers = contributors.filter(c => c.roles.includes('voice_speaker') && !c.withdrawn_at);
  const reviewers = contributors.filter(c => c.roles.includes('voice_reviewer'));
  return (
    <div className="grid gap-4 lg:grid-cols-[420px_1fr]">
      <Card>
        <CardHeader><CardTitle className="text-base">Nouveau lot d’enregistrement</CardTitle><CardDescription>Choisissez les textes, puis assignez-les à un locuteur.</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          <div><Label>Titre</Label><Input value={title} onChange={e => setTitle(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Locuteur</Label>
              <select className="h-9 w-full rounded border border-border bg-background px-2 text-sm" value={speaker} onChange={e => { setSpeaker(e.target.value); const c = contributors.find(x => x.user_id === e.target.value); if (c && c.voice !== '—') setVoice(c.voice); }}>
                <option value="">—</option>{speakers.map(c => <option key={c.user_id} value={c.user_id}>{names[c.user_id]} ({c.voice})</option>)}
              </select>
            </div>
            <div><Label>Validateur</Label>
              <select className="h-9 w-full rounded border border-border bg-background px-2 text-sm" value={reviewer} onChange={e => setReviewer(e.target.value)}>
                <option value="">Tous</option>{reviewers.filter(c => c.user_id !== speaker).map(c => <option key={c.user_id} value={c.user_id}>{names[c.user_id]}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Type</Label>
              <select className="h-9 w-full rounded border border-border bg-background px-2 text-sm" value={kind} onChange={e => setKind(e.target.value)}>
                <option value="">Tous</option>{Object.entries(KIND_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div><Label>Paquet (préfixe)</Label><Input placeholder="lecon:, theme:famille, scenes:" value={pack} onChange={e => setPack(e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div><Label>Priorité ≤</Label><Input type="number" min={1} max={9} value={maxPriority} onChange={e => setMaxPriority(Number(e.target.value) || 1)} /></div>
            <div><Label>Nombre</Label><Input type="number" min={10} max={2000} value={limit} onChange={e => setLimit(Number(e.target.value) || 50)} /></div>
            <div><Label>Échéance</Label><Input type="date" value={due} onChange={e => setDue(e.target.value)} /></div>
          </div>
          <label className="flex items-center gap-2 text-sm"><Switch checked={onlyMissing} onCheckedChange={setOnlyMissing} />Seulement les textes sans voix {voice}</label>
          <div className="flex gap-2">
            <Button variant="outline" onClick={computePreview} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardList className="h-4 w-4" />} Calculer</Button>
            <Button onClick={create} disabled={!preview?.length || !speaker}>Créer le lot{preview ? ` (${preview.length})` : ''}</Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Lots</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Titre</TableHead><TableHead>Locuteur</TableHead><TableHead>Voix</TableHead><TableHead className="text-right">Textes</TableHead><TableHead>Échéance</TableHead><TableHead>Statut</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>
              {lots.map(l => (
                <TableRow key={l.id}>
                  <TableCell>{l.title}</TableCell>
                  <TableCell>{names[l.speaker_id] ?? l.speaker_id.slice(0, 8)}</TableCell>
                  <TableCell>{l.voice}</TableCell>
                  <TableCell className="text-right">{l.audio_keys.length}</TableCell>
                  <TableCell>{l.due_date ?? '—'}</TableCell>
                  <TableCell><Badge variant={l.status === 'open' ? 'default' : 'secondary'}>{l.status === 'open' ? 'Ouvert' : l.status === 'done' ? 'Terminé' : 'Annulé'}</Badge></TableCell>
                  <TableCell className="text-right">{l.status === 'open' && (<><Button size="sm" variant="ghost" onClick={() => setStatus(l.id, 'done')}>Clore</Button><Button size="sm" variant="ghost" onClick={() => setStatus(l.id, 'cancelled')}>Annuler</Button></>)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ───────────────────────── Contributeurs ─────────────────────────
function ContributorsTab() {
  const [rows, setRows] = useState<Contributor[]>([]);
  useEffect(() => { loadContributors().then(setRows).catch(e => toast.error(errorText(e))); }, []);
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Contributeurs voix</CardTitle><CardDescription>Les rôles Locuteur voix et Validateur voix s’attribuent dans l’onglet Utilisateurs. Un locuteur n’enregistre qu’après avoir signé l’accord dans l’application.</CardDescription></CardHeader>
      <CardContent>
        <Table>
          <TableHeader><TableRow><TableHead>Nom</TableHead><TableHead>Rôles</TableHead><TableHead>Voix</TableHead><TableHead>Variante</TableHead><TableHead>Accord</TableHead><TableHead>Usage IA</TableHead></TableRow></TableHeader>
          <TableBody>
            {rows.map(c => (
              <TableRow key={c.user_id}>
                <TableCell>{c.display_name ?? c.user_id.slice(0, 8)}</TableCell>
                <TableCell className="space-x-1">{c.roles.map(r => <Badge key={r} variant="outline">{r === 'voice_speaker' ? 'Locuteur' : 'Validateur'}</Badge>)}</TableCell>
                <TableCell>{c.voice}</TableCell>
                <TableCell>{c.variant}</TableCell>
                <TableCell>{c.withdrawn_at ? <Badge variant="destructive">Retiré</Badge> : c.voice === '—' ? <Badge variant="secondary">Non signé</Badge> : <Badge>Signé</Badge>}</TableCell>
                <TableCell>{c.allow_ai_training ? 'Oui' : 'Non'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ───────────────────────── Signalements ─────────────────────────
function IssuesTab() {
  const [rows, setRows] = useState<{ id: string; audio_key: string; kind: string; detail: string | null; status: string; created_at: string }[]>([]);
  const [items, setItems] = useState<Record<string, Item>>({});
  const load = useCallback(async () => {
    const { data, error } = await db.from('apprendre_text_issues').select('id, audio_key, kind, detail, status, created_at').order('created_at', { ascending: false }).limit(200);
    if (error) { toast.error(errorText(error)); return; }
    const list = data ?? [];
    setRows(list);
    setItems(await itemsFor([...new Set(list.map((r: { audio_key: string }) => r.audio_key))]));
  }, []);
  useEffect(() => { load(); }, [load]);
  async function setStatus(id: string, status: string) {
    const { data: auth } = await db.auth.getUser();
    const done = status === 'fixed' || status === 'dismissed';
    const { error } = await db.from('apprendre_text_issues').update({ status, resolved_by: done ? auth.user?.id : null, resolved_at: done ? new Date().toISOString() : null }).eq('id', id);
    if (error) toast.error(errorText(error)); else load();
  }
  const kinds: Record<string, string> = { texte: 'Faute', ton: 'Ton douteux', traduction: 'Traduction', autre: 'Autre' };
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Signalements de texte</CardTitle><CardDescription>Une correction se fait dans le contenu du module ; le texte corrigé reçoit une nouvelle clé et l’ancienne voix est retirée automatiquement.</CardDescription></CardHeader>
      <CardContent>
        <Table>
          <TableHeader><TableRow><TableHead>Texte</TableHead><TableHead>Type</TableHead><TableHead>Détail</TableHead><TableHead>Statut</TableHead></TableRow></TableHeader>
          <TableBody>
            {rows.map(r => (
              <TableRow key={r.id}>
                <TableCell><div className="font-medium">{items[r.audio_key]?.text_ba ?? r.audio_key}</div><div className="text-xs text-muted-foreground">{items[r.audio_key]?.text_fr}{items[r.audio_key]?.source_page ? ` · p. ${items[r.audio_key]?.source_page}` : ''}</div></TableCell>
                <TableCell>{kinds[r.kind] ?? r.kind}</TableCell>
                <TableCell className="max-w-xs text-sm">{r.detail ?? '—'}</TableCell>
                <TableCell>
                  <select className="h-8 rounded border border-border bg-background px-2 text-sm" value={r.status} onChange={e => setStatus(r.id, e.target.value)}>
                    <option value="open">Ouvert</option><option value="in_progress">En cours</option><option value="fixed">Corrigé</option><option value="dismissed">Écarté</option>
                  </select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ───────────────────────── Paramètres et catalogue ─────────────────────────
function SettingsTab() {
  const [s, setS] = useState<SettingsRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState<string | null>(null);
  useEffect(() => {
    db.from('apprendre_audio_settings').select('*').eq('id', 1).maybeSingle().then(({ data, error }) => {
      if (error) toast.error(errorText(error)); else setS(data as SettingsRow);
    });
  }, []);

  async function save() {
    if (!s) return;
    setSaving(true);
    const { data: auth } = await db.auth.getUser();
    const { error } = await db.from('apprendre_audio_settings').update({ ...s, updated_at: new Date().toISOString(), updated_by: auth.user?.id ?? null }).eq('id', 1);
    setSaving(false);
    if (error) toast.error(errorText(error)); else toast.success('Paramètres enregistrés');
  }

  async function importCatalog(file: File) {
    try {
      const json = JSON.parse(await file.text()) as { content_version: string; items: unknown[] };
      if (!json.content_version || !Array.isArray(json.items)) throw new Error('Fichier de catalogue invalide');
      const size = 500;
      let total = 0;
      for (let i = 0; i < json.items.length; i += size) {
        setImporting(`${Math.min(i + size, json.items.length)} / ${json.items.length}`);
        const { data, error } = await db.rpc('apprendre_import_catalog', {
          _items: json.items.slice(i, i + size), _content_version: json.content_version, _final: i + size >= json.items.length,
        });
        if (error) throw error;
        total += Number((data as { items?: number })?.items ?? 0);
      }
      toast.success(`Catalogue ${json.content_version} importé : ${total} textes`);
    } catch (e) {
      toast.error(errorText(e));
    } finally {
      setImporting(null);
    }
  }

  if (!s) return <Loader2 className="h-6 w-6 animate-spin" />;
  const num = (k: keyof SettingsRow) => (e: React.ChangeEvent<HTMLInputElement>) => setS({ ...s, [k]: Number(e.target.value) });
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle className="text-base">Validation et publication</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div><Label>Avis favorables requis pour approuver</Label><Input type="number" min={1} max={3} value={s.approvals_required} onChange={num('approvals_required')} /></div>
          <label className="flex items-center gap-2 text-sm"><Switch checked={s.auto_activate} onCheckedChange={v => setS({ ...s, auto_activate: v })} />Activer automatiquement une prise approuvée</label>
          <div><Label>Qualité minimale à l’envoi (0-100)</Label><Input type="number" min={0} max={100} value={s.min_quality_score} onChange={num('min_quality_score')} /></div>
          <div><Label>Variante de référence par défaut</Label><Input value={s.default_variant} onChange={e => setS({ ...s, default_variant: e.target.value })} /></div>
          <label className="flex items-center gap-2 text-sm"><Switch checked={s.allow_tts_fallback} onCheckedChange={v => setS({ ...s, allow_tts_fallback: v })} />Autoriser la synthèse vocale de secours (signalée « non validée »)</label>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Comparaison de voix (apprenant)</CardTitle><CardDescription>Distances à recalculer sur le pilote avec tool/audio_catalog/calibrate_compare.py.</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Score « Très proche » ≥</Label><Input type="number" value={s.compare_very_close} onChange={num('compare_very_close')} /></div>
            <div><Label>Score « Proche » ≥</Label><Input type="number" value={s.compare_close} onChange={num('compare_close')} /></div>
            <div><Label>Distance des sons « identique »</Label><Input type="number" step="0.1" value={s.compare_mfcc_good} onChange={num('compare_mfcc_good')} /></div>
            <div><Label>Distance « très différente »</Label><Input type="number" step="0.1" value={s.compare_mfcc_bad} onChange={num('compare_mfcc_bad')} /></div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={s.compare_calibrated} onCheckedChange={v => setS({ ...s, compare_calibrated: v })} />
            Calibrage validé sur des voix réelles
          </label>
          {!s.compare_calibrated && (
            <p className="text-xs text-amber-700">
              Tant que ce réglage reste désactivé, l’application présente les scores comme des repères d’entraînement et non comme une validation linguistique.
            </p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Accord des locuteurs</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div><Label>Version</Label><Input value={s.consent_version} onChange={e => setS({ ...s, consent_version: e.target.value })} /></div>
          <div><Label>Texte présenté au locuteur</Label><Textarea rows={6} value={s.consent_text} onChange={e => setS({ ...s, consent_text: e.target.value })} /></div>
          <Button onClick={save} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Settings2 className="h-4 w-4" />} Enregistrer les paramètres</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Catalogue des textes</CardTitle><CardDescription>Fichier produit par fitila_flutter/tool/audio_catalog/build_audio_catalog.py à chaque nouvelle version du contenu Apprendre.</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          <Input type="file" accept="application/json" disabled={importing !== null} onChange={e => { const f = e.target.files?.[0]; if (f) importCatalog(f); e.target.value = ''; }} />
          {importing && <p className="flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Import {importing}</p>}
          <p className="text-xs text-muted-foreground"><Upload className="mr-1 inline h-3 w-3" />Les textes absents de la nouvelle version sont marqués hors contenu ; leurs voix cessent d’être proposées.</p>
        </CardContent>
      </Card>
    </div>
  );
}

// ───────────────────────── Journal ─────────────────────────
function AuditTab() {
  const [rows, setRows] = useState<{ id: number; actor_id: string | null; action: string; target: string | null; detail: Record<string, unknown>; created_at: string }[]>([]);
  useEffect(() => {
    db.from('apprendre_audio_audit').select('*').order('id', { ascending: false }).limit(200).then(({ data, error }) => {
      if (error) toast.error(errorText(error)); else setRows(data ?? []);
    });
  }, []);
  const labels: Record<string, string> = {
    catalog_import: 'Import du catalogue', consent_signed: 'Accord signé', consent_withdrawn: 'Accord retiré', take_submitted: 'Prise soumise',
    take_reviewed: 'Avis', take_activated: 'Voix activée', take_deactivated: 'Voix retirée', deactivate_text_changed: 'Texte modifié : voix retirée',
  };
  return (
    <Table>
      <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Action</TableHead><TableHead>Cible</TableHead><TableHead>Détail</TableHead></TableRow></TableHeader>
      <TableBody>
        {rows.map(r => (
          <TableRow key={r.id}>
            <TableCell className="whitespace-nowrap text-sm">{new Date(r.created_at).toLocaleString('fr-FR')}</TableCell>
            <TableCell>{labels[r.action] ?? r.action}</TableCell>
            <TableCell className="font-mono text-xs">{r.target}</TableCell>
            <TableCell className="max-w-md truncate font-mono text-xs">{JSON.stringify(r.detail)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/** Onglet d'administration « Voix Apprendre » : tout le circuit des voix de référence. */
export default function ApprendreVoiceAdmin() {
  const location = useLocation();
  const navigate = useNavigate();
  const allowedTabs = ['dashboard', 'review', 'publish', 'lots', 'contributors', 'issues', 'settings', 'audit'];
  const sectionFromLocation = () => {
    const section = new URLSearchParams(location.search).get('section') || 'dashboard';
    return allowedTabs.includes(section) ? section : 'dashboard';
  };
  const [tab, setTab] = useState(sectionFromLocation);

  useEffect(() => {
    setTab(sectionFromLocation());
  }, [location.search]);

  const changeSection = (section: string) => {
    const next = allowedTabs.includes(section) ? section : 'dashboard';
    setTab(next);
    navigate(
      next === 'dashboard'
        ? '/admin/apprendre-voice'
        : `/admin/apprendre-voice?section=${encodeURIComponent(next)}`,
      { replace: false },
    );
  };
  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold"><Mic className="h-5 w-5 text-primary" /> Gestion des audios — module Apprendre</h2>
          <p className="text-sm text-muted-foreground">1. Donner le rôle Locuteur voix → 2. Le locuteur enregistre → 3. Un validateur contrôle → 4. L’administration publie. Seules les voix actives sont audibles par les apprenants.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="default" size="sm">
            <Link to="/admin/users"><Users className="h-4 w-4" /> Gérer les rôles audio</Link>
          </Button>
          <Button variant="outline" size="sm" onClick={() => changeSection('review')}>
            <ShieldCheck className="h-4 w-4" /> Audios à valider
          </Button>
          <Button variant="outline" size="sm" onClick={() => changeSection('publish')}>
            <Power className="h-4 w-4" /> Publier / retirer une voix
          </Button>
          <Button variant="outline" size="sm" onClick={() => changeSection('contributors')}>
            <Users className="h-4 w-4" /> Locuteurs & contributeurs
          </Button>
        </div>
      </div>
      <Tabs value={tab} onValueChange={changeSection} className="space-y-4">
        <TabsList className="flex h-auto flex-wrap gap-1">
          <TabsTrigger value="dashboard"><Activity className="mr-1 h-4 w-4" />Tableau de bord</TabsTrigger>
          <TabsTrigger value="review"><ShieldCheck className="mr-1 h-4 w-4" />Validation</TabsTrigger>
          <TabsTrigger value="publish"><Power className="mr-1 h-4 w-4" />Publication</TabsTrigger>
          <TabsTrigger value="lots"><ClipboardList className="mr-1 h-4 w-4" />Lots</TabsTrigger>
          <TabsTrigger value="contributors"><Users className="mr-1 h-4 w-4" />Contributeurs</TabsTrigger>
          <TabsTrigger value="issues"><Flag className="mr-1 h-4 w-4" />Signalements</TabsTrigger>
          <TabsTrigger value="settings"><Settings2 className="mr-1 h-4 w-4" />Paramètres</TabsTrigger>
          <TabsTrigger value="audit"><BookOpenCheck className="mr-1 h-4 w-4" />Journal</TabsTrigger>
        </TabsList>
        <TabsContent value="dashboard"><DashboardTab /></TabsContent>
        <TabsContent value="review"><ReviewTab /></TabsContent>
        <TabsContent value="publish"><PublishTab /></TabsContent>
        <TabsContent value="lots"><LotsTab /></TabsContent>
        <TabsContent value="contributors"><ContributorsTab /></TabsContent>
        <TabsContent value="issues"><IssuesTab /></TabsContent>
        <TabsContent value="settings"><SettingsTab /></TabsContent>
        <TabsContent value="audit"><AuditTab /></TabsContent>
      </Tabs>
    </div>
  );
}
