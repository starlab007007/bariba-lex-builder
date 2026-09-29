import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Archive, ArchiveRestore, ArrowLeft, Check, ChevronDown, Clock, Copy, Download, FileText, History, Link2, Loader2, PanelRight, RotateCcw, Share2, Star, Tags, Trash2, X } from 'lucide-react';
import { SIG, SERIF } from '@/components/fitila/signatureTheme';
import { useAuth } from '@/contexts/AuthContext';
import { loadLexicon, type BaribaLexicon } from '@/lib/espace/baribaText';
import * as api from '@/lib/espace/api';
import { exportDocx, exportPdf, exportTxt } from '@/lib/espace/exporters';
import BaribaRichEditor, { type BaribaEditorHandle } from './BaribaRichEditor';

type PanelTab = 'infos' | 'versions' | 'partage';
type Save = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

const fmtDate = (iso: string) => new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

export default function EspaceEditorPage() {
  const { id = '' } = useParams();
  const nav = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const editor = useRef<BaribaEditorHandle>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const latest = useRef({ html: '', title: '' });
  const [doc, setDoc] = useState<api.EspaceDoc | null>(null);
  const [title, setTitle] = useState('');
  const [lexicon, setLexicon] = useState<BaribaLexicon | null>(null);
  const [folders, setFolders] = useState<api.EspaceFolder[]>([]);
  const [save, setSave] = useState<Save>('idle');
  const [error, setError] = useState<string | null>(null);
  const [panel, setPanel] = useState<PanelTab | null>(null);
  const [exportOpen, setExportOpen] = useState(false);

  useEffect(() => {
    loadLexicon().then(setLexicon);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) return nav('/auth', { replace: true });
    let alive = true;
    Promise.all([api.getDocument(id), api.listFolders()])
      .then(([d, f]) => {
        if (!alive) return;
        setDoc(d);
        setTitle(d.title);
        setFolders(f);
        latest.current = { html: d.content_html, title: d.title };
      })
      .catch((e) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [id, user, authLoading, nav]);

  const isOwner = !!doc && doc.owner_id === user?.id;

  const flush = useCallback(async () => {
    clearTimeout(timer.current);
    if (!doc) return;
    setSave('saving');
    try {
      const next = await api.updateDocument(doc.id, { title: latest.current.title.trim() || 'Document sans titre', content_html: latest.current.html });
      setDoc((d) => (d ? { ...d, version: next.version, updated_at: next.updated_at, content_text: next.content_text } : d));
      setSave('saved');
    } catch (e) {
      setSave('error');
      toast.error(`Enregistrement impossible : ${(e as Error).message}`);
    }
  }, [doc]);

  const schedule = useCallback(() => {
    setSave('dirty');
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, 1400);
  }, [flush]);

  // Enregistre en quittant la page ou en fermant l'onglet.
  useEffect(() => {
    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (save === 'dirty' || save === 'saving') e.preventDefault();
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => {
      window.removeEventListener('beforeunload', beforeUnload);
    };
  }, [save]);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const patchMeta = async (patch: Partial<api.EspaceDoc>) => {
    if (!doc) return;
    setDoc({ ...doc, ...patch });
    try {
      await api.updateDocument(doc.id, patch);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const remove = async () => {
    if (!doc || !window.confirm(`Supprimer définitivement « ${doc.title} » et son historique ?`)) return;
    try {
      await api.deleteDocument(doc.id, doc.file_path);
      toast.success('Document supprimé');
      nav('/espace');
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const exportAs = (kind: 'txt' | 'pdf' | 'docx') => {
    setExportOpen(false);
    const html = editor.current?.getHtml() ?? latest.current.html;
    const t = title || 'Document';
    if (kind === 'txt') exportTxt(t, html);
    else if (kind === 'pdf') exportPdf(t, html);
    else exportDocx(t, html);
  };

  const restore = async (v: api.EspaceVersion) => {
    if (!window.confirm(`Restaurer la version ${v.version} ? La version actuelle reste dans l'historique.`)) return;
    editor.current?.setHtml(v.content_html);
    latest.current = { html: v.content_html, title: v.title };
    setTitle(v.title);
    await flush();
    toast.success(`Version ${v.version} restaurée`);
  };

  if (error)
    return (
      <div className="grid h-full place-items-center p-6 text-center" style={{ background: SIG.appBackground }}>
        <div>
          <p className="text-[15px] font-bold">Document introuvable ou inaccessible</p>
          <p className="mt-1 text-[12.5px]" style={{ color: SIG.muted }}>{error}</p>
          <button type="button" onClick={() => nav('/espace')} className="mt-4 rounded-full px-5 py-2.5 text-[13px] font-extrabold" style={{ background: SIG.gold, color: '#2B2110' }}>Retour à l’Espace</button>
        </div>
      </div>
    );
  if (!doc)
    return (
      <div className="grid h-full place-items-center" style={{ background: SIG.appBackground }}>
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: SIG.goldDeep }} />
      </div>
    );

  const statusLabel = { idle: `v${doc.version}`, dirty: 'Modifié…', saving: 'Enregistrement…', saved: `Enregistré · v${doc.version}`, error: 'Erreur d’enregistrement' }[save];

  return (
    <div className="flex h-full flex-col" style={{ background: SIG.appBackground, color: SIG.ink }}>
      <header className="fitila-glass z-20 flex flex-wrap items-center gap-2 border-b px-3 pb-2 pl-[74px] pt-3 md:pl-4" style={{ borderColor: SIG.hairline }}>
        <button type="button" onClick={async () => { await flush(); nav('/espace'); }} aria-label="Retour à l’Espace" className="grid h-9 w-9 place-items-center rounded-full border bg-white" style={{ borderColor: SIG.hairline }}>
          <ArrowLeft className="h-4 w-4" />
        </button>
        <input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            latest.current.title = e.target.value;
            schedule();
          }}
          aria-label="Titre du document"
          maxLength={200}
          className="min-w-0 flex-1 basis-40 bg-transparent text-[18px] font-semibold outline-none placeholder:opacity-40"
          style={{ fontFamily: SERIF }}
          placeholder="Titre du document"
        />
        <span className="hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-bold sm:inline-flex" style={{ background: save === 'error' ? SIG.clayTint : save === 'saved' ? SIG.sageTint : SIG.surfaceAlt, color: save === 'error' ? SIG.clay : save === 'saved' ? SIG.sage : SIG.muted }} role="status">
          {save === 'saving' ? <Loader2 className="h-3 w-3 animate-spin" /> : save === 'saved' ? <Check className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
          {statusLabel}
        </span>
        {isOwner && (
          <button type="button" onClick={() => patchMeta({ favorite: !doc.favorite })} aria-label={doc.favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'} aria-pressed={doc.favorite} className="grid h-9 w-9 place-items-center rounded-full border bg-white" style={{ borderColor: SIG.hairline }}>
            <Star className="h-4 w-4" style={{ color: SIG.gold }} fill={doc.favorite ? SIG.gold : 'none'} />
          </button>
        )}
        <div className="relative">
          <button type="button" onClick={() => setExportOpen((v) => !v)} aria-haspopup="menu" aria-expanded={exportOpen} className="flex h-9 items-center gap-1.5 rounded-full border bg-white px-3.5 text-[12.5px] font-extrabold" style={{ borderColor: SIG.hairline }}>
            <Download className="h-4 w-4" /> Exporter <ChevronDown className="h-3.5 w-3.5" />
          </button>
          {exportOpen && (
            <>
              <button type="button" aria-label="Fermer le menu" className="fixed inset-0 z-30 cursor-default" onClick={() => setExportOpen(false)} />
              <div role="menu" className="absolute right-0 top-11 z-40 w-56 overflow-hidden rounded-[16px] border bg-white p-1.5 shadow-xl" style={{ borderColor: SIG.hairline }}>
                {([['pdf', 'PDF (imprimer / enregistrer)', FileText], ['docx', 'Word (.docx)', FileText], ['txt', 'Texte brut (.txt, UTF-8)', FileText]] as const).map(([k, label, Icon]) => (
                  <button key={k} role="menuitem" type="button" onClick={() => exportAs(k)} className="flex w-full items-center gap-2.5 rounded-[12px] px-3 py-2 text-left text-[13px] font-semibold hover:bg-[#F1EDDF]">
                    <Icon className="h-4 w-4" style={{ color: SIG.goldDeep }} /> {label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        <button type="button" onClick={() => setPanel(panel ? null : 'infos')} aria-label="Panneau du document" aria-pressed={!!panel} className="grid h-9 w-9 place-items-center rounded-full border bg-white" style={{ borderColor: SIG.hairline, background: panel ? SIG.goldTint : '#fff' }}>
          <PanelRight className="h-4 w-4" />
        </button>
      </header>

      <div className="relative flex min-h-0 flex-1">
        <main className="mx-auto flex min-h-0 min-w-0 flex-1 flex-col p-0 sm:p-4">
          <div className="mx-auto flex min-h-0 w-full max-w-[860px] flex-1 flex-col overflow-hidden bg-white sm:rounded-[22px] sm:border sm:shadow-[0_18px_40px_-28px_rgba(36,31,46,.35)]" style={{ borderColor: SIG.hairline }}>
            <BaribaRichEditor
              ref={editor}
              initialHtml={doc.content_html}
              lexicon={lexicon}
              readOnly={false}
              onChange={(html) => {
                latest.current.html = html;
                schedule();
              }}
            />
          </div>
        </main>

        {panel && (
          <>
            <button type="button" aria-label="Fermer le panneau" onClick={() => setPanel(null)} className="fixed inset-0 z-30 bg-black/25 lg:hidden" />
            <aside className="fixed inset-y-0 right-0 z-40 flex w-[min(92vw,380px)] flex-col border-l bg-white shadow-2xl lg:static lg:z-0 lg:w-[340px] lg:shadow-none" style={{ borderColor: SIG.hairline }}>
              <div className="flex items-center gap-1 border-b p-2" style={{ borderColor: SIG.hairline }}>
                {([['infos', 'Infos', Tags], ['versions', 'Versions', History], ['partage', 'Partage', Share2]] as const).map(([k, label, Icon]) => (
                  <button key={k} type="button" onClick={() => setPanel(k)} aria-pressed={panel === k} className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-[12px] text-[12.5px] font-extrabold" style={{ background: panel === k ? SIG.goldTint : undefined, color: panel === k ? SIG.goldDeep : SIG.muted }}>
                    <Icon className="h-4 w-4" /> {label}
                  </button>
                ))}
                <button type="button" onClick={() => setPanel(null)} aria-label="Fermer" className="grid h-9 w-9 place-items-center rounded-full lg:hidden"><X className="h-4 w-4" /></button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-4">
                {panel === 'infos' && <InfosPanel doc={doc} folders={folders} isOwner={isOwner} onPatch={patchMeta} onFolders={setFolders} onDelete={remove} />}
                {panel === 'versions' && <VersionsPanel docId={doc.id} current={doc.version} onRestore={restore} key={doc.version} />}
                {panel === 'partage' && (isOwner ? <SharePanel docId={doc.id} /> : <p className="text-[13px]" style={{ color: SIG.muted }}>Seul le propriétaire peut gérer le partage.</p>)}
              </div>
            </aside>
          </>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="mb-4 block">
      <span className="mb-1.5 block text-[11.5px] font-extrabold uppercase tracking-wide" style={{ color: SIG.muted }}>{label}</span>
      {children}
    </label>
  );
}
const inputCls = 'h-10 w-full rounded-[12px] border bg-white px-3 text-[13.5px] outline-none focus:border-[#C99530]';

function InfosPanel({ doc, folders, isOwner, onPatch, onFolders, onDelete }: { doc: api.EspaceDoc; folders: api.EspaceFolder[]; isOwner: boolean; onPatch: (p: Partial<api.EspaceDoc>) => void; onFolders: (f: api.EspaceFolder[]) => void; onDelete: () => void }) {
  const [tag, setTag] = useState('');
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  useEffect(() => {
    if (doc.file_path) api.signedFileUrl(doc.file_path).then(setFileUrl);
  }, [doc.file_path]);
  const addTag = () => {
    const t = tag.trim().replace(/^#/, '').slice(0, 30);
    if (t && !doc.tags.includes(t) && doc.tags.length < 20) onPatch({ tags: [...doc.tags, t] });
    setTag('');
  };
  const newFolder = async () => {
    const name = window.prompt('Nom du nouveau dossier');
    if (!name?.trim()) return;
    try {
      const f = await api.createFolder(name);
      onFolders([...folders, f]);
      onPatch({ folder_id: f.id });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  return (
    <div>
      <Field label="Dossier">
        <div className="flex gap-2">
          <select disabled={!isOwner} value={doc.folder_id ?? ''} onChange={(e) => onPatch({ folder_id: e.target.value || null })} className={inputCls} style={{ borderColor: SIG.hairline }}>
            <option value="">Racine</option>
            {folders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          {isOwner && <button type="button" onClick={newFolder} className="h-10 shrink-0 rounded-[12px] border px-3 text-[12.5px] font-extrabold" style={{ borderColor: SIG.hairline }}>+ Nouveau</button>}
        </div>
      </Field>
      <Field label="Catégorie">
        <select disabled={!isOwner} value={doc.category} onChange={(e) => onPatch({ category: e.target.value })} className={inputCls} style={{ borderColor: SIG.hairline }}>
          {api.CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
      </Field>
      <Field label="Étiquettes">
        <div className="mb-2 flex flex-wrap gap-1.5">
          {doc.tags.map((t) => (
            <span key={t} className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-bold" style={{ background: SIG.goldTint, color: SIG.goldDeep }}>
              #{t}
              {isOwner && <button type="button" aria-label={`Retirer ${t}`} onClick={() => onPatch({ tags: doc.tags.filter((x) => x !== t) })}><X className="h-3 w-3" /></button>}
            </span>
          ))}
        </div>
        {isOwner && <input value={tag} onChange={(e) => setTag(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(); } }} onBlur={addTag} placeholder="Ajouter une étiquette + Entrée" className={inputCls} style={{ borderColor: SIG.hairline }} />}
      </Field>
      <dl className="mb-4 grid grid-cols-2 gap-2 text-[12px]">
        {[['Créé', fmtDate(doc.created_at)], ['Modifié', fmtDate(doc.updated_at)], ['Source', { editor: 'Éditeur', upload: 'Fichier', ocr: 'Numérisation OCR', import: 'Import' }[doc.source]], ['Version', `v${doc.version}`]].map(([k, v]) => (
          <div key={k} className="rounded-[12px] p-2.5" style={{ background: SIG.surfaceAlt }}><dt style={{ color: SIG.muted }}>{k}</dt><dd className="font-bold">{v}</dd></div>
        ))}
      </dl>
      {doc.file_path && (
        <a href={fileUrl ?? '#'} target="_blank" rel="noreferrer" className="mb-4 flex items-center gap-2 rounded-[14px] border p-3 text-[13px] font-bold" style={{ borderColor: SIG.hairline }}>
          <FileText className="h-4 w-4" style={{ color: SIG.goldDeep }} /> Fichier d’origine ({doc.file_mime?.split('/')[1] ?? 'fichier'})
        </a>
      )}
      {isOwner && (
        <div className="space-y-2">
          <button type="button" onClick={() => onPatch({ archived: !doc.archived })} className="flex h-10 w-full items-center justify-center gap-2 rounded-[12px] border text-[13px] font-extrabold" style={{ borderColor: SIG.hairline }}>
            {doc.archived ? <><ArchiveRestore className="h-4 w-4" /> Sortir des archives</> : <><Archive className="h-4 w-4" /> Archiver</>}
          </button>
          <button type="button" onClick={onDelete} className="flex h-10 w-full items-center justify-center gap-2 rounded-[12px] text-[13px] font-extrabold" style={{ background: SIG.clayTint, color: SIG.clay }}>
            <Trash2 className="h-4 w-4" /> Supprimer définitivement
          </button>
        </div>
      )}
    </div>
  );
}

function VersionsPanel({ docId, current, onRestore }: { docId: string; current: number; onRestore: (v: api.EspaceVersion) => void }) {
  const [versions, setVersions] = useState<api.EspaceVersion[] | null>(null);
  useEffect(() => {
    api.listVersions(docId).then(setVersions).catch((e) => toast.error(e.message));
  }, [docId]);
  if (!versions) return <Loader2 className="mx-auto h-5 w-5 animate-spin" style={{ color: SIG.goldDeep }} />;
  return (
    <ol className="space-y-2">
      {versions.map((v) => (
        <li key={v.id} className="rounded-[14px] border p-3" style={{ borderColor: v.version === current ? SIG.gold : SIG.hairline }}>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[13px] font-extrabold">Version {v.version}{v.version === current && <span className="ml-2 rounded-full px-2 py-0.5 text-[10.5px]" style={{ background: SIG.goldTint, color: SIG.goldDeep }}>actuelle</span>}</span>
            <span className="text-[11px]" style={{ color: SIG.muted }}>{fmtDate(v.created_at)}</span>
          </div>
          <p className="mt-1 line-clamp-2 text-[12px]" style={{ color: SIG.inkSoft }}>{v.content_text || '(vide)'}</p>
          {v.version !== current && (
            <button type="button" onClick={() => onRestore(v)} className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-extrabold" style={{ color: SIG.goldDeep }}>
              <RotateCcw className="h-3.5 w-3.5" /> Restaurer
            </button>
          )}
        </li>
      ))}
      {versions.length === 0 && <p className="text-[13px]" style={{ color: SIG.muted }}>Aucune révision enregistrée.</p>}
    </ol>
  );
}

function SharePanel({ docId }: { docId: string }) {
  const [perms, setPerms] = useState<api.EspacePermission[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'viewer' | 'editor'>('viewer');
  const [hours, setHours] = useState(72);
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => api.listPermissions(docId).then(setPerms).catch((e) => toast.error(e.message)), [docId]);
  useEffect(() => {
    load();
  }, [load]);
  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(ok);
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const copy = async (token: string) => {
    await navigator.clipboard.writeText(api.shareUrl(token));
    toast.success('Lien copié');
  };
  const roleSelect = (
    <select value={role} onChange={(e) => setRole(e.target.value as 'viewer' | 'editor')} className={inputCls} style={{ borderColor: SIG.hairline }} aria-label="Droits">
      <option value="viewer">Lecture seule</option>
      <option value="editor">Peut modifier</option>
    </select>
  );
  return (
    <div>
      <h3 className="mb-2 text-[13px] font-extrabold">Partager avec un utilisateur FITILA</h3>
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="adresse e-mail du compte" className={`${inputCls} mb-2`} style={{ borderColor: SIG.hairline }} />
      <div className="mb-2">{roleSelect}</div>
      <button type="button" disabled={busy || !email.includes('@')} onClick={() => run(() => api.shareWithEmail(docId, email, role), 'Document partagé').then(() => setEmail(''))} className="mb-5 h-10 w-full rounded-[12px] text-[13px] font-extrabold disabled:opacity-40" style={{ background: SIG.gold, color: '#2B2110' }}>
        Partager
      </button>

      <h3 className="mb-2 text-[13px] font-extrabold">Lien temporaire</h3>
      <div className="mb-2 grid grid-cols-2 gap-2">
        {roleSelect}
        <select value={hours} onChange={(e) => setHours(+e.target.value)} className={inputCls} style={{ borderColor: SIG.hairline }} aria-label="Durée de validité">
          <option value={1}>1 heure</option>
          <option value={24}>24 heures</option>
          <option value={72}>3 jours</option>
          <option value={168}>7 jours</option>
          <option value={720}>30 jours</option>
        </select>
      </div>
      <button type="button" disabled={busy} onClick={() => run(async () => copy(await api.createShareLink(docId, role, hours)), 'Lien créé et copié')} className="mb-5 flex h-10 w-full items-center justify-center gap-2 rounded-[12px] border text-[13px] font-extrabold" style={{ borderColor: SIG.hairline }}>
        <Link2 className="h-4 w-4" /> Créer un lien
      </button>

      <h3 className="mb-2 text-[13px] font-extrabold">Accès accordés</h3>
      <ul className="space-y-2">
        {perms.map((p) => {
          const expired = !!p.expires_at && new Date(p.expires_at) < new Date();
          return (
            <li key={p.id} className="flex items-center gap-2 rounded-[12px] border p-2.5 text-[12.5px]" style={{ borderColor: SIG.hairline, opacity: expired ? 0.5 : 1 }}>
              <div className="min-w-0 flex-1">
                <div className="font-bold">{p.share_token ? 'Lien' : 'Utilisateur'} · {p.role === 'editor' ? 'modification' : 'lecture'}</div>
                <div style={{ color: SIG.muted }}>{expired ? 'Expiré' : p.expires_at ? `jusqu’au ${fmtDate(p.expires_at)}` : 'sans limite'}</div>
              </div>
              {p.share_token && !expired && <button type="button" onClick={() => copy(p.share_token!)} aria-label="Copier le lien" className="grid h-8 w-8 place-items-center rounded-full hover:bg-[#F1EDDF]"><Copy className="h-4 w-4" /></button>}
              <button type="button" onClick={() => run(() => api.revokePermission(p.id), 'Accès révoqué')} aria-label="Révoquer" className="grid h-8 w-8 place-items-center rounded-full hover:bg-[#F4DED2]"><Trash2 className="h-4 w-4" style={{ color: SIG.clay }} /></button>
            </li>
          );
        })}
        {perms.length === 0 && <li className="text-[12.5px]" style={{ color: SIG.muted }}>Document privé — aucun accès partagé.</li>}
      </ul>
    </div>
  );
}
