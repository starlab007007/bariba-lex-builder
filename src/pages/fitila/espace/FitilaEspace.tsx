import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Archive, ArchiveRestore, FilePlus2, FileText, Folder, FolderPlus, Grid2X2, LayoutList, Loader2, Lock, MoreVertical, Pencil, ScanText, Search, ShieldCheck, Star, Trash2, Upload, X } from 'lucide-react';
import { SIG, SERIF } from '@/components/fitila/signatureTheme';
import { useAuth } from '@/contexts/AuthContext';
import * as api from '@/lib/espace/api';
import { importDocumentFile } from '@/lib/espace/exporters';
import { foldText } from '@/lib/espace/baribaText';

const fmt = (iso: string) => {
  const d = new Date(iso);
  const days = (Date.now() - d.getTime()) / 86_400_000;
  return days < 1 ? d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : days < 7 ? d.toLocaleDateString('fr-FR', { weekday: 'long' }) : d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' });
};

function useDebounced<T>(value: T, ms: number) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export default function FitilaEspace() {
  const nav = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const fileInput = useRef<HTMLInputElement>(null);
  const [docs, setDocs] = useState<api.EspaceDoc[] | null>(null);
  const [folders, setFolders] = useState<api.EspaceFolder[]>([]);
  const [jobs, setJobs] = useState<api.EspaceOcrJob[]>([]);
  const [stats, setStats] = useState({ docs: 0, archived: 0, folders: 0, scans: 0 });
  const [query, setQuery] = useState('');
  const [folderId, setFolderId] = useState<string | null>(null);
  const [tag, setTag] = useState('');
  const [category, setCategory] = useState('');
  const [archived, setArchived] = useState(false);
  const [view, setView] = useState<'grid' | 'list'>(() => (localStorage.getItem('espace:view') as 'grid' | 'list') || 'grid');
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const [menu, setMenu] = useState<string | null>(null);
  const q = useDebounced(query, 280);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const [d, f, j, s] = await Promise.all([api.listDocuments({ archived, folderId, tag: tag || undefined, category: category || undefined, q }), api.listFolders(), api.listOcrJobs(5), api.espaceStats()]);
      setDocs(d);
      setFolders(f);
      setJobs(j);
      setStats(s);
    } catch (e) {
      setDocs([]);
      toast.error(`Chargement impossible : ${(e as Error).message}`);
    }
  }, [user, archived, folderId, tag, category, q]);

  useEffect(() => {
    load();
  }, [load]);

  const allTags = useMemo(() => {
    const m = new Map<string, number>();
    docs?.forEach((d) => d.tags.forEach((t) => m.set(t, (m.get(t) ?? 0) + 1)));
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 14);
  }, [docs]);

  const newDoc = async () => {
    setBusy(true);
    try {
      const d = await api.createDocument({ title: 'Document sans titre', folder_id: folderId });
      nav(`/espace/document/${d.id}`);
    } catch (e) {
      toast.error((e as Error).message);
      setBusy(false);
    }
  };

  const importFiles = async (files: FileList | File[]) => {
    const list = Array.from(files);
    if (!list.length) return;
    const scannable = list.find((f) => /^image\//.test(f.type) || /\.pdf$/i.test(f.name));
    if (scannable && list.length === 1) return nav('/espace/scanner', { state: { file: scannable } });
    setBusy(true);
    let created = 0;
    for (const f of list) {
      try {
        const { title, html } = await importDocumentFile(f);
        const d = await api.createDocument({ title, content_html: html, folder_id: folderId, source: 'import' });
        const path = await api.uploadFile(user!.id, d.id, f, f.name).catch(() => null);
        if (path) await api.updateDocument(d.id, { file_path: path, file_mime: f.type || null, file_size: f.size });
        created++;
      } catch (e) {
        toast.error(`${f.name} : ${(e as Error).message}`);
      }
    }
    setBusy(false);
    if (created) {
      toast.success(`${created} document${created > 1 ? 's' : ''} importé${created > 1 ? 's' : ''}`);
      load();
    }
  };

  const setFolderName = async (mode: 'create' | 'rename', f?: api.EspaceFolder) => {
    const name = window.prompt(mode === 'create' ? 'Nom du nouveau dossier' : 'Nouveau nom du dossier', f?.name ?? '');
    if (!name?.trim()) return;
    try {
      if (mode === 'create') await api.createFolder(name);
      else await api.renameFolder(f!.id, name);
      load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  const removeFolder = async (f: api.EspaceFolder) => {
    if (!window.confirm(`Supprimer le dossier « ${f.name} » ? Les documents sont conservés (à la racine).`)) return;
    try {
      await api.deleteFolder(f.id);
      if (folderId === f.id) setFolderId(null);
      load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  const patch = async (d: api.EspaceDoc, p: Partial<api.EspaceDoc>) => {
    setMenu(null);
    setDocs((cur) => cur?.map((x) => (x.id === d.id ? { ...x, ...p } : x)) ?? cur);
    try {
      await api.updateDocument(d.id, p);
      if ('archived' in p) load();
    } catch (e) {
      toast.error((e as Error).message);
      load();
    }
  };
  const remove = async (d: api.EspaceDoc) => {
    setMenu(null);
    if (!window.confirm(`Supprimer définitivement « ${d.title} » ?`)) return;
    try {
      const full = await api.getDocument(d.id);
      await api.deleteDocument(d.id, full.file_path);
      toast.success('Document supprimé');
      load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const shell = 'h-full overflow-y-auto pb-24';
  const searching = !!q;

  if (!authLoading && !user)
    return (
      <div className={shell} style={{ background: SIG.appBackground, color: SIG.ink }}>
        <Hero />
        <div className="mx-auto mt-6 max-w-[520px] px-4">
          <div className="fitila-rise rounded-[24px] border bg-white p-7 text-center" style={{ borderColor: SIG.hairline }}>
            <Lock className="mx-auto h-8 w-8" style={{ color: SIG.goldDeep }} />
            <h2 className="mt-3 text-[18px] font-extrabold">Votre coffre-fort est privé</h2>
            <p className="mt-1.5 text-[13px]" style={{ color: SIG.muted }}>Connectez-vous pour créer, numériser et archiver vos documents en Bàátɔ̀nú.</p>
            <button type="button" onClick={() => nav('/auth')} className="mt-5 h-11 rounded-full px-7 text-[14px] font-extrabold" style={{ background: SIG.gold, color: '#2B2110' }}>Se connecter</button>
          </div>
        </div>
      </div>
    );

  return (
    <div
      className={shell}
      style={{ background: SIG.appBackground, color: SIG.ink }}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={(e) => { if (e.currentTarget === e.target) setDrag(false); }}
      onDrop={(e) => { e.preventDefault(); setDrag(false); importFiles(e.dataTransfer.files); }}
    >
      <Hero>
        <div className="mt-5 flex flex-wrap gap-2.5">
          <button type="button" onClick={newDoc} disabled={busy} className="fitila-lift flex h-11 items-center gap-2 rounded-full px-5 text-[13.5px] font-extrabold disabled:opacity-60" style={{ background: SIG.gold, color: '#2B2110' }}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FilePlus2 className="h-4 w-4" />} Nouveau document
          </button>
          <button type="button" onClick={() => nav('/espace/scanner')} className="fitila-lift flex h-11 items-center gap-2 rounded-full border bg-white px-5 text-[13.5px] font-extrabold" style={{ borderColor: SIG.hairline }}>
            <ScanText className="h-4 w-4" style={{ color: SIG.goldDeep }} /> Scanner (OCR)
          </button>
          <button type="button" onClick={() => fileInput.current?.click()} className="fitila-lift flex h-11 items-center gap-2 rounded-full border bg-white px-5 text-[13.5px] font-extrabold" style={{ borderColor: SIG.hairline }}>
            <Upload className="h-4 w-4" style={{ color: SIG.goldDeep }} /> Importer
          </button>
          <input ref={fileInput} type="file" multiple hidden accept=".txt,.md,.docx,.pdf,image/png,image/jpeg,image/webp" onChange={(e) => { importFiles(e.target.files ?? []); e.target.value = ''; }} />
        </div>
      </Hero>

      <div className="mx-auto w-full max-w-[1100px] px-4 md:px-[18px]">
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {[['Documents', stats.docs, FileText], ['Dossiers', stats.folders, Folder], ['Numérisations', stats.scans, ScanText], ['Archivés', stats.archived, Archive]].map(([label, value, Icon], i) => {
            const I = Icon as typeof FileText;
            return (
              <div key={label as string} className="fitila-rise fitila-lift flex items-center gap-3 rounded-[18px] border bg-white p-3.5" style={{ borderColor: SIG.hairline, ['--i' as string]: i }}>
                <span className="grid h-10 w-10 place-items-center rounded-[13px]" style={{ background: SIG.goldTint }}><I className="h-[18px] w-[18px]" style={{ color: SIG.goldDeep }} /></span>
                <div><div className="text-[20px] font-extrabold leading-none">{value as number}</div><div className="mt-1 text-[11.5px]" style={{ color: SIG.muted }}>{label as string}</div></div>
              </div>
            );
          })}
        </div>

        <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
          <label className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: SIG.muted }} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher — « baatonu » trouve « Bàátɔ̀nú »" aria-label="Rechercher dans l’Espace" className="h-11 w-full rounded-full border bg-white pl-10 pr-10 text-[14px] outline-none focus:border-[#C99530]" style={{ borderColor: SIG.hairline }} />
            {query && <button type="button" aria-label="Effacer la recherche" onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="h-4 w-4" style={{ color: SIG.muted }} /></button>}
          </label>
          <div className="flex gap-2">
            <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Catégorie" className="h-11 flex-1 rounded-full border bg-white px-4 text-[13px] font-semibold sm:flex-none" style={{ borderColor: SIG.hairline }}>
              <option value="">Toutes catégories</option>
              {api.CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
            <button type="button" onClick={() => setArchived((v) => !v)} aria-pressed={archived} className="flex h-11 items-center gap-1.5 rounded-full border px-4 text-[13px] font-extrabold" style={{ borderColor: archived ? SIG.gold : SIG.hairline, background: archived ? SIG.goldTint : '#fff' }}>
              <Archive className="h-4 w-4" /> <span className="hidden sm:inline">Archives</span>
            </button>
            <div className="hidden overflow-hidden rounded-full border bg-white sm:flex" style={{ borderColor: SIG.hairline }}>
              {([['grid', Grid2X2, 'Grille'], ['list', LayoutList, 'Liste']] as const).map(([k, Icon, label]) => (
                <button key={k} type="button" aria-label={label} aria-pressed={view === k} onClick={() => { setView(k); localStorage.setItem('espace:view', k); }} className="grid h-11 w-11 place-items-center" style={{ background: view === k ? SIG.goldTint : undefined }}><Icon className="h-4 w-4" /></button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 flex gap-4 md:gap-6">
          <nav aria-label="Dossiers" className="hidden w-[210px] shrink-0 md:block">
            <FolderList {...{ folders, folderId, setFolderId, setFolderName, removeFolder }} />
          </nav>
          <div className="min-w-0 flex-1">
            <nav aria-label="Dossiers" className="-mx-1 mb-3 flex gap-2 overflow-x-auto px-1 pb-1 md:hidden [scrollbar-width:none]">
              <button type="button" onClick={() => setFolderId(null)} aria-pressed={!folderId} className="shrink-0 rounded-full border px-3.5 py-1.5 text-[12.5px] font-extrabold" style={{ borderColor: !folderId ? SIG.gold : SIG.hairline, background: !folderId ? SIG.goldTint : '#fff' }}>Tous</button>
              {folders.map((f) => <button key={f.id} type="button" onClick={() => setFolderId(f.id)} aria-pressed={folderId === f.id} className="shrink-0 rounded-full border px-3.5 py-1.5 text-[12.5px] font-extrabold" style={{ borderColor: folderId === f.id ? SIG.gold : SIG.hairline, background: folderId === f.id ? SIG.goldTint : '#fff' }}>{f.name}</button>)}
              <button type="button" onClick={() => setFolderName('create')} className="shrink-0 rounded-full border border-dashed px-3.5 py-1.5 text-[12.5px] font-extrabold" style={{ borderColor: SIG.hairlineStrong }}>+ Dossier</button>
            </nav>

            {allTags.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-1.5">
                {allTags.map(([t, n]) => (
                  <button key={t} type="button" onClick={() => setTag(tag === t ? '' : t)} aria-pressed={tag === t} className="rounded-full px-2.5 py-1 text-[12px] font-bold" style={{ background: tag === t ? SIG.gold : SIG.surfaceAlt, color: tag === t ? '#2B2110' : SIG.inkSoft }}>#{t} <span className="opacity-60">{n}</span></button>
                ))}
              </div>
            )}

            {docs === null ? (
              <div className={view === 'grid' ? 'grid gap-3 sm:grid-cols-2 xl:grid-cols-3' : 'space-y-2'}>{[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="fitila-skeleton h-[128px] rounded-[20px]" />)}</div>
            ) : docs.length === 0 ? (
              <Empty searching={searching} archived={archived} onNew={newDoc} onScan={() => nav('/espace/scanner')} />
            ) : (
              <ul className={view === 'grid' ? 'grid gap-3 sm:grid-cols-2 xl:grid-cols-3' : 'space-y-2'}>
                {docs.map((d, i) => (
                  <li key={d.id} className="fitila-rise relative" style={{ ['--i' as string]: Math.min(i, 12) }}>
                    <div className={`fitila-lift group relative flex overflow-hidden rounded-[20px] border bg-white ${view === 'grid' ? 'h-full flex-col p-4' : 'items-center gap-3 p-3.5'}`} style={{ borderColor: SIG.hairline }}>
                      <button type="button" onClick={() => nav(`/espace/document/${d.id}`)} className="absolute inset-0 z-0 rounded-[20px]" aria-label={`Ouvrir ${d.title}`} />
                      <div className={`pointer-events-none z-[1] flex min-w-0 flex-1 ${view === 'grid' ? 'flex-col' : 'items-center gap-3'}`}>
                        <div className="mb-2 flex items-center gap-2">
                          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px]" style={{ background: d.source === 'ocr' ? SIG.sageTint : SIG.goldTint }}>
                            {d.source === 'ocr' ? <ScanText className="h-4 w-4" style={{ color: SIG.sage }} /> : <FileText className="h-4 w-4" style={{ color: SIG.goldDeep }} />}
                          </span>
                          {view === 'grid' && <span className="text-[11px]" style={{ color: SIG.muted }}>{api.CATEGORIES.find((c) => c.id === d.category)?.label}</span>}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate text-[15.5px] font-semibold" style={{ fontFamily: SERIF }}>{d.title}</h3>
                          <p className="mt-1 line-clamp-2 text-[12.5px] leading-snug" style={{ color: SIG.muted }}>{d.content_text?.slice(0, 160) || 'Document vide'}</p>
                          {d.tags.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{d.tags.slice(0, 3).map((t) => <span key={t} className="rounded-full px-2 py-0.5 text-[10.5px] font-bold" style={{ background: SIG.surfaceAlt, color: SIG.goldDeep }}>#{t}</span>)}</div>}
                        </div>
                        <div className={`flex items-center gap-1.5 text-[11px] ${view === 'grid' ? 'mt-3' : 'shrink-0'}`} style={{ color: SIG.muted }}>
                          {d.favorite && <Star className="h-3.5 w-3.5" style={{ color: SIG.gold }} fill={SIG.gold} />}
                          {fmt(d.updated_at)} · v{d.version}
                        </div>
                      </div>
                      <button type="button" aria-label="Actions" aria-haspopup="menu" onClick={() => setMenu(menu === d.id ? null : d.id)} className="absolute right-2.5 top-2.5 z-[2] grid h-8 w-8 place-items-center rounded-full opacity-100 hover:bg-[#F1EDDF] md:opacity-0 md:group-hover:opacity-100 md:focus:opacity-100"><MoreVertical className="h-4 w-4" /></button>
                      {menu === d.id && (
                        <>
                          <button type="button" aria-label="Fermer" className="fixed inset-0 z-30 cursor-default" onClick={() => setMenu(null)} />
                          <div role="menu" className="absolute right-2 top-11 z-40 w-52 rounded-[16px] border bg-white p-1.5 shadow-xl" style={{ borderColor: SIG.hairline }}>
                            <MenuItem icon={Pencil} label="Ouvrir" onClick={() => nav(`/espace/document/${d.id}`)} />
                            <MenuItem icon={Star} label={d.favorite ? 'Retirer des favoris' : 'Favori'} onClick={() => patch(d, { favorite: !d.favorite })} />
                            <MenuItem icon={d.archived ? ArchiveRestore : Archive} label={d.archived ? 'Désarchiver' : 'Archiver'} onClick={() => patch(d, { archived: !d.archived })} />
                            <MenuItem icon={Trash2} label="Supprimer" danger onClick={() => remove(d)} />
                          </div>
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {jobs.length > 0 && (
              <section className="mt-8" aria-label="Numérisations récentes">
                <h2 className="mb-2 text-[13px] font-extrabold">Numérisations récentes</h2>
                <ul className="space-y-2">
                  {jobs.map((j) => (
                    <li key={j.id} className="flex items-center gap-3 rounded-[16px] border bg-white p-3" style={{ borderColor: SIG.hairline }}>
                      <ScanText className="h-4 w-4 shrink-0" style={{ color: SIG.goldDeep }} />
                      <div className="min-w-0 flex-1"><div className="truncate text-[13px] font-bold">{j.file_name ?? 'Numérisation'}</div><div className="text-[11.5px]" style={{ color: SIG.muted }}>{j.page_count} page{j.page_count > 1 ? 's' : ''} · {fmt(j.created_at)}{j.error ? ` · ${j.error.slice(0, 60)}` : ''}</div></div>
                      <span className="rounded-full px-2.5 py-1 text-[11px] font-extrabold" style={{ background: j.status === 'done' ? SIG.sageTint : j.status === 'failed' ? SIG.clayTint : SIG.surfaceAlt, color: j.status === 'done' ? SIG.sage : j.status === 'failed' ? SIG.clay : SIG.muted }}>
                        {j.status === 'done' ? `${Math.round((j.confidence ?? 0) * 100)} %` : j.status === 'failed' ? 'Échec' : 'En cours'}
                      </span>
                      {j.document_id && <button type="button" onClick={() => nav(`/espace/document/${j.document_id}`)} className="text-[12px] font-extrabold underline" style={{ color: SIG.goldDeep }}>Ouvrir</button>}
                    </li>
                  ))}
                </ul>
              </section>
            )}
            <p className="mt-8 flex items-center gap-2 text-[11.5px]" style={{ color: SIG.muted }}><ShieldCheck className="h-4 w-4" /> Espace privé : vos documents ne sont visibles que de vous et des personnes avec qui vous les partagez. Recherche insensible aux diacritiques ({foldText('Bàátɔ̀nú')}).</p>
          </div>
        </div>
      </div>

      {drag && (
        <div className="pointer-events-none fixed inset-0 z-50 grid place-items-center bg-[#F7F5EC]/85 backdrop-blur-sm">
          <div className="rounded-[28px] border-2 border-dashed px-10 py-12 text-center" style={{ borderColor: SIG.gold, background: '#fff' }}>
            <Upload className="mx-auto h-9 w-9" style={{ color: SIG.goldDeep }} />
            <p className="mt-3 text-[16px] font-extrabold">Déposez vos fichiers</p>
            <p className="text-[12.5px]" style={{ color: SIG.muted }}>TXT, DOCX importés · PDF et images numérisés</p>
          </div>
        </div>
      )}
    </div>
  );
}

function Hero({ children }: { children?: React.ReactNode }) {
  return (
    <section className="mx-auto w-full max-w-[1100px] px-4 pb-5 pl-[74px] pt-[18px] md:px-[18px]">
      <div className="fitila-rise relative overflow-hidden rounded-[28px] p-6 md:p-8" style={{ background: 'linear-gradient(135deg,#FFFFFF 0%,#F3E3B9 140%)', border: `1px solid ${SIG.hairline}` }}>
        <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full opacity-40 blur-2xl" style={{ background: SIG.gold }} />
        <p className="text-[11px] font-extrabold uppercase tracking-[.14em]" style={{ color: SIG.goldDeep }}>Coffre-fort numérique</p>
        <h1 className="mt-1.5 text-[30px] font-semibold leading-tight md:text-[38px]" style={{ fontFamily: SERIF }}>Espace</h1>
        <p className="mt-1.5 max-w-[560px] text-[13.5px] leading-relaxed" style={{ color: SIG.inkSoft }}>Écrivez, numérisez et archivez vos documents en Bàátɔ̀nú — éditeur relié au dictionnaire, OCR des tons et caractères ɛ ɔ ŋ, historique des versions et partage sécurisé.</p>
        {children}
      </div>
    </section>
  );
}

function FolderList({ folders, folderId, setFolderId, setFolderName, removeFolder }: { folders: api.EspaceFolder[]; folderId: string | null; setFolderId: (id: string | null) => void; setFolderName: (m: 'create' | 'rename', f?: api.EspaceFolder) => void; removeFolder: (f: api.EspaceFolder) => void }) {
  const row = (active: boolean) => ({ background: active ? SIG.surfaceAlt : undefined, boxShadow: active ? `inset 3px 0 0 ${SIG.gold}` : undefined });
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between px-1.5"><h2 className="text-[11px] font-extrabold uppercase tracking-wide" style={{ color: SIG.muted }}>Dossiers</h2>
        <button type="button" onClick={() => setFolderName('create')} aria-label="Nouveau dossier" className="grid h-7 w-7 place-items-center rounded-full hover:bg-[#F1EDDF]"><FolderPlus className="h-4 w-4" style={{ color: SIG.goldDeep }} /></button></div>
      <button type="button" onClick={() => setFolderId(null)} aria-current={!folderId} className="flex w-full items-center gap-2.5 rounded-[14px] px-3 py-2 text-left text-[13.5px] font-bold hover:bg-[#F1EDDF]/70" style={row(!folderId)}><Folder className="h-4 w-4" style={{ color: SIG.goldDeep }} /> Tous les documents</button>
      {folders.map((f) => (
        <div key={f.id} className="group flex items-center rounded-[14px] hover:bg-[#F1EDDF]/70" style={row(folderId === f.id)}>
          <button type="button" onClick={() => setFolderId(f.id)} aria-current={folderId === f.id} className="flex min-w-0 flex-1 items-center gap-2.5 px-3 py-2 text-left text-[13.5px] font-semibold"><Folder className="h-4 w-4 shrink-0" style={{ color: SIG.goldDeep }} /><span className="truncate">{f.name}</span></button>
          <button type="button" onClick={() => setFolderName('rename', f)} aria-label={`Renommer ${f.name}`} className="hidden h-7 w-7 place-items-center group-hover:grid"><Pencil className="h-3.5 w-3.5" /></button>
          <button type="button" onClick={() => removeFolder(f)} aria-label={`Supprimer ${f.name}`} className="mr-1 hidden h-7 w-7 place-items-center group-hover:grid"><Trash2 className="h-3.5 w-3.5" style={{ color: SIG.clay }} /></button>
        </div>
      ))}
    </div>
  );
}

function MenuItem({ icon: Icon, label, onClick, danger }: { icon: typeof Pencil; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button role="menuitem" type="button" onClick={onClick} className="flex w-full items-center gap-2.5 rounded-[12px] px-3 py-2 text-left text-[13px] font-semibold hover:bg-[#F1EDDF]" style={{ color: danger ? SIG.clay : SIG.ink }}>
      <Icon className="h-4 w-4" /> {label}
    </button>
  );
}

function Empty({ searching, archived, onNew, onScan }: { searching: boolean; archived: boolean; onNew: () => void; onScan: () => void }) {
  return (
    <div className="fitila-rise rounded-[24px] border border-dashed bg-white/70 p-10 text-center" style={{ borderColor: SIG.hairlineStrong }}>
      <FileText className="mx-auto h-9 w-9" style={{ color: SIG.goldDeep }} />
      <h3 className="mt-3 text-[16px] font-extrabold">{searching ? 'Aucun résultat' : archived ? 'Aucun document archivé' : 'Votre Espace est vide'}</h3>
      <p className="mx-auto mt-1 max-w-[360px] text-[13px]" style={{ color: SIG.muted }}>{searching ? 'Essayez sans accents ni tons : « baatonu » retrouve « Bàátɔ̀nú ».' : archived ? 'Les documents archivés apparaissent ici.' : 'Créez votre premier document ou numérisez un manuscrit pour en extraire le texte.'}</p>
      {!searching && !archived && (
        <div className="mt-5 flex justify-center gap-2.5">
          <button type="button" onClick={onNew} className="h-10 rounded-full px-5 text-[13px] font-extrabold" style={{ background: SIG.gold, color: '#2B2110' }}>Nouveau document</button>
          <button type="button" onClick={onScan} className="h-10 rounded-full border bg-white px-5 text-[13px] font-extrabold" style={{ borderColor: SIG.hairline }}>Scanner</button>
        </div>
      )}
    </div>
  );
}
