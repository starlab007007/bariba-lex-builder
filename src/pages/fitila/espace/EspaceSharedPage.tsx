import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Clock, Download, Eye, Loader2, Lock, Pencil, Save } from 'lucide-react';
import { SIG, SERIF } from '@/components/fitila/signatureTheme';
import * as api from '@/lib/espace/api';
import { loadLexicon, type BaribaLexicon } from '@/lib/espace/baribaText';
import { exportDocx, exportPdf, exportTxt } from '@/lib/espace/exporters';
import BaribaRichEditor, { type BaribaEditorHandle } from './BaribaRichEditor';

/** Document ouvert par lien temporaire (lecture seule ou modification). Accessible sans compte. */
export default function EspaceSharedPage() {
  const { token = '' } = useParams();
  const nav = useNavigate();
  const editor = useRef<BaribaEditorHandle>(null);
  const [doc, setDoc] = useState<api.SharedDoc | null | undefined>(undefined);
  const [lexicon, setLexicon] = useState<BaribaLexicon | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadLexicon().then(setLexicon);
    api.getShared(token).then(setDoc).catch(() => setDoc(null));
  }, [token]);

  const save = async () => {
    setSaving(true);
    try {
      await api.saveShared(token, editor.current?.getHtml() ?? '');
      setDirty(false);
      toast.success('Modifications enregistrées');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (doc === undefined) return <div className="grid h-full place-items-center" style={{ background: SIG.appBackground }}><Loader2 className="h-6 w-6 animate-spin" style={{ color: SIG.goldDeep }} /></div>;
  if (doc === null)
    return (
      <div className="grid h-full place-items-center p-6 text-center" style={{ background: SIG.appBackground, color: SIG.ink }}>
        <div className="max-w-[360px]"><Lock className="mx-auto h-8 w-8" style={{ color: SIG.goldDeep }} /><h1 className="mt-3 text-[18px] font-extrabold">Lien invalide ou expiré</h1><p className="mt-1.5 text-[13px]" style={{ color: SIG.muted }}>Demandez à la personne qui a partagé ce document de générer un nouveau lien.</p>
          <button type="button" onClick={() => nav('/')} className="mt-5 h-10 rounded-full px-6 text-[13px] font-extrabold" style={{ background: SIG.gold, color: '#2B2110' }}>Aller à FITILA</button></div>
      </div>
    );
  const canEdit = doc.role === 'editor';
  return (
    <div className="flex h-full flex-col" style={{ background: SIG.appBackground, color: SIG.ink }}>
      <header className="fitila-glass z-20 flex flex-wrap items-center gap-2 border-b px-3 pb-2 pl-[74px] pt-3 md:pl-4" style={{ borderColor: SIG.hairline }}>
        <div className="min-w-0 flex-1 basis-48"><h1 className="truncate text-[18px] font-semibold" style={{ fontFamily: SERIF }}>{doc.title}</h1>
          <p className="flex items-center gap-1.5 truncate text-[11.5px]" style={{ color: SIG.muted }}>{canEdit ? <Pencil className="h-3 w-3" /> : <Eye className="h-3 w-3" />} Partagé par {doc.owner_name} · {canEdit ? 'modification autorisée' : 'lecture seule'}{doc.expires_at && <><Clock className="ml-1 h-3 w-3" /> jusqu’au {new Date(doc.expires_at).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</>}</p></div>
        {(['pdf', 'docx', 'txt'] as const).map((k) => (
          <button key={k} type="button" onClick={() => { const h = editor.current?.getHtml() ?? doc.content_html; (k === 'pdf' ? exportPdf : k === 'docx' ? exportDocx : exportTxt)(doc.title, h); }} className="hidden h-9 items-center gap-1.5 rounded-full border bg-white px-3 text-[12px] font-extrabold uppercase sm:flex" style={{ borderColor: SIG.hairline }}><Download className="h-3.5 w-3.5" /> {k}</button>
        ))}
        {canEdit && (
          <button type="button" onClick={save} disabled={!dirty || saving} className="flex h-9 items-center gap-1.5 rounded-full px-4 text-[12.5px] font-extrabold disabled:opacity-40" style={{ background: SIG.gold, color: '#2B2110' }}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Enregistrer</button>
        )}
      </header>
      <main className="mx-auto flex min-h-0 w-full max-w-[860px] flex-1 flex-col p-0 sm:p-4">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white sm:rounded-[22px] sm:border" style={{ borderColor: SIG.hairline }}>
          <BaribaRichEditor ref={editor} initialHtml={doc.content_html} lexicon={lexicon} readOnly={!canEdit} onChange={() => setDirty(true)} />
        </div>
      </main>
    </div>
  );
}
