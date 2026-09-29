import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Camera, Check, FilePlus2, FileUp, Loader2, ScanText, Sparkles, TriangleAlert, Wand2, X } from 'lucide-react';
import { SIG, SERIF } from '@/components/fitila/signatureTheme';
import { useAuth } from '@/contexts/AuthContext';
import * as api from '@/lib/espace/api';
import { textToHtml } from '@/lib/espace/baribaText';
import { filePages, MAX_PAGES, recognize, type OcrPage, type OcrResult } from '@/lib/espace/ocr';
import { BaribaCharPalette } from './BaribaRichEditor';

type Stage = 'idle' | 'prepare' | 'infer' | 'correct' | 'done';
const STEPS: { id: Stage; label: string; hint: string }[] = [
  { id: 'prepare', label: 'Prétraitement', hint: 'Niveaux de gris, contraste, redressement' },
  { id: 'infer', label: 'Reconnaissance IA', hint: 'Modèle réglé sur ɛ ɔ ŋ et les tons' },
  { id: 'correct', label: 'Correction', hint: 'Dictionnaire Bariba' },
  { id: 'done', label: 'Texte éditable', hint: 'Vérifiez puis enregistrez' },
];

export default function EspaceScanPage() {
  const nav = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const input = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const area = useRef<HTMLTextAreaElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<OcrPage[]>([]);
  const [current, setCurrent] = useState(0);
  const [mode, setMode] = useState<'printed' | 'handwritten'>('printed');
  const [stage, setStage] = useState<Stage>('idle');
  const [progress, setProgress] = useState('');
  const [result, setResult] = useState<OcrResult | null>(null);
  const [text, setText] = useState('');
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const jobId = useRef<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) nav('/auth', { replace: true });
  }, [user, authLoading, nav]);

  const pick = useCallback(async (f: File) => {
    setFile(f);
    setResult(null);
    setText('');
    setError(null);
    setStage('prepare');
    setTitle(f.name.replace(/\.[^.]+$/, ''));
    setProgress('Préparation des pages…');
    try {
      const p = await filePages(f, (d, t) => setProgress(`Prétraitement ${d}/${t}`));
      setPages(p);
      setCurrent(0);
      setStage('idle');
      setProgress('');
    } catch (e) {
      setError((e as Error).message);
      setStage('idle');
      setFile(null);
    }
  }, []);

  // Fichier transmis depuis le tableau de bord (glisser-déposer / Importer).
  useEffect(() => {
    const f = (location.state as { file?: File } | null)?.file;
    if (f) pick(f);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const run = async () => {
    if (!file || !user || pages.length === 0) return;
    setError(null);
    setStage('infer');
    setProgress('Envoi au moteur de reconnaissance…');
    try {
      jobId.current = await api.createOcrJob({ file_name: file.name, file_mime: file.type || 'application/octet-stream', page_count: pages.length });
    } catch (e) {
      setError((e as Error).message);
      setStage('idle');
      return;
    }
    try {
      const out = await recognize(pages, mode, (d, t) => setProgress(`Reconnaissance ${d}/${t} page(s)`));
      setStage('correct');
      await new Promise((r) => setTimeout(r, 350));
      setResult(out);
      setText(out.text);
      setStage('done');
      await api.finishOcrJob(jobId.current, { status: 'done', engine: out.engine, confidence: Number(out.confidence.toFixed(3)), extracted_text: out.text, pages: out.pages });
      if (!out.text.trim()) toast.warning('Aucun texte détecté — essayez un scan plus net.');
    } catch (e) {
      const message = (e as Error).message;
      setError(message);
      setStage('idle');
      api.finishOcrJob(jobId.current, { status: 'failed', error: message }).catch(() => undefined);
    }
  };

  const insert = (s: string) => {
    const ta = area.current;
    if (!ta) return;
    const { selectionStart: a, selectionEnd: b } = ta;
    const next = text.slice(0, a) + s + text.slice(b);
    setText(next.normalize('NFC') === next ? next : next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(a + s.length, a + s.length);
    });
  };

  const create = async () => {
    if (!user || !file) return;
    setSaving(true);
    try {
      const doc = await api.createDocument({
        title: title.trim() || 'Numérisation',
        content_html: textToHtml(text.normalize('NFC')),
        source: 'ocr',
        category: mode === 'handwritten' ? 'manuscrit' : 'general',
        metadata: { ocr: { engine: result?.engine, confidence: result?.confidence, pages: pages.length, corrections: result?.corrections, mode } },
      });
      const path = await api.uploadFile(user.id, doc.id, file, file.name).catch((e) => {
        toast.warning(`Texte enregistré, fichier d’origine non conservé : ${e.message}`);
        return null;
      });
      if (path) await api.updateDocument(doc.id, { file_path: path, file_mime: file.type || null, file_size: file.size });
      if (jobId.current) await api.finishOcrJob(jobId.current, { status: 'done', document_id: doc.id, extracted_text: text }).catch(() => undefined);
      toast.success('Document créé');
      nav(`/espace/document/${doc.id}`, { replace: true });
    } catch (e) {
      toast.error((e as Error).message);
      setSaving(false);
    }
  };

  const activeIndex = stage === 'idle' ? -1 : STEPS.findIndex((s) => s.id === stage);
  const busy = stage === 'prepare' || stage === 'infer' || stage === 'correct';
  const conf = result ? Math.round(result.confidence * 100) : 0;

  return (
    <div className="h-full overflow-y-auto pb-24" style={{ background: SIG.appBackground, color: SIG.ink }}>
      <header className="fitila-glass sticky top-0 z-20 flex items-center gap-3 border-b px-4 pb-2 pl-[74px] pt-3 md:pl-5" style={{ borderColor: SIG.hairline }}>
        <button type="button" onClick={() => nav('/espace')} aria-label="Retour à l’Espace" className="grid h-9 w-9 place-items-center rounded-full border bg-white" style={{ borderColor: SIG.hairline }}><ArrowLeft className="h-4 w-4" /></button>
        <div className="min-w-0"><h1 className="truncate text-[17px] font-extrabold leading-tight">Numériser &amp; extraire</h1><p className="truncate text-[11px]" style={{ color: SIG.muted }}>OCR Bàátɔ̀nú — PDF, images, manuscrits</p></div>
      </header>

      <div className="mx-auto w-full max-w-[1100px] px-4 pt-5 md:px-[18px]">
        {/* Pipeline */}
        <ol className="mb-5 grid grid-cols-2 gap-2 md:grid-cols-4" aria-label="Étapes du traitement">
          {STEPS.map((s, i) => {
            const state = activeIndex > i || (stage === 'done' && i <= 3) ? 'done' : activeIndex === i ? 'active' : 'todo';
            return (
              <li key={s.id} className="flex items-start gap-2.5 rounded-[16px] border bg-white p-3" style={{ borderColor: state === 'active' ? SIG.gold : SIG.hairline, opacity: state === 'todo' ? 0.65 : 1 }}>
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[12px] font-extrabold" style={{ background: state === 'done' ? SIG.sage : state === 'active' ? SIG.gold : SIG.surfaceAlt, color: state === 'todo' ? SIG.muted : '#fff' }}>
                  {state === 'done' ? <Check className="h-4 w-4" /> : state === 'active' ? <Loader2 className="h-4 w-4 animate-spin" /> : i + 1}
                </span>
                <div className="min-w-0"><div className="text-[12.5px] font-extrabold">{s.label}</div><div className="text-[11px] leading-snug" style={{ color: SIG.muted }}>{s.hint}</div></div>
              </li>
            );
          })}
        </ol>

        {error && (
          <div role="alert" className="mb-4 flex items-start gap-3 rounded-[18px] border p-4" style={{ background: SIG.clayTint, borderColor: SIG.clay }}>
            <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" style={{ color: SIG.clay }} />
            <div className="min-w-0 flex-1 text-[13px]"><p className="font-extrabold" style={{ color: SIG.clay }}>La reconnaissance a échoué</p><p className="mt-0.5 break-words">{error}</p>
              {file && pages.length > 0 && (
                <button type="button" onClick={create} className="mt-2 text-[12.5px] font-extrabold underline">Créer quand même un document et saisir le texte à la main</button>
              )}</div>
            <button type="button" onClick={() => setError(null)} aria-label="Fermer"><X className="h-4 w-4" /></button>
          </div>
        )}

        {!file || (pages.length === 0 && busy) ? (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) pick(f); }}
            className="fitila-rise grid place-items-center rounded-[28px] border-2 border-dashed bg-white/70 px-6 py-14 text-center"
            style={{ borderColor: SIG.hairlineStrong }}
          >
            {busy ? (
              <div><Loader2 className="mx-auto h-8 w-8 animate-spin" style={{ color: SIG.goldDeep }} /><p className="mt-3 text-[13.5px] font-bold">{progress}</p></div>
            ) : (
              <>
                <span className="grid h-16 w-16 place-items-center rounded-[22px]" style={{ background: SIG.goldTint }}><ScanText className="h-8 w-8" style={{ color: SIG.goldDeep }} /></span>
                <h2 className="mt-4 text-[20px] font-semibold" style={{ fontFamily: SERIF }}>Déposez un document à numériser</h2>
                <p className="mt-1.5 max-w-[420px] text-[13px]" style={{ color: SIG.muted }}>PDF (jusqu’à {MAX_PAGES} pages), PNG, JPEG ou WebP — 25 Mo maximum. Les PDF contenant déjà du texte sont lus sans IA.</p>
                <div className="mt-6 flex flex-wrap justify-center gap-2.5">
                  <button type="button" onClick={() => input.current?.click()} className="fitila-lift flex h-11 items-center gap-2 rounded-full px-6 text-[13.5px] font-extrabold" style={{ background: SIG.gold, color: '#2B2110' }}><FileUp className="h-4 w-4" /> Choisir un fichier</button>
                  <button type="button" onClick={() => camera.current?.click()} className="fitila-lift flex h-11 items-center gap-2 rounded-full border bg-white px-6 text-[13.5px] font-extrabold" style={{ borderColor: SIG.hairline }}><Camera className="h-4 w-4" style={{ color: SIG.goldDeep }} /> Photographier</button>
                </div>
                <input ref={input} type="file" hidden accept="application/pdf,image/png,image/jpeg,image/webp" onChange={(e) => { const f = e.target.files?.[0]; if (f) pick(f); e.target.value = ''; }} />
                <input ref={camera} type="file" hidden accept="image/*" capture="environment" onChange={(e) => { const f = e.target.files?.[0]; if (f) pick(f); e.target.value = ''; }} />
              </>
            )}
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Aperçu */}
            <section className="rounded-[24px] border bg-white p-4" style={{ borderColor: SIG.hairline }} aria-label="Aperçu des pages">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="truncate text-[13.5px] font-extrabold">{file.name}</h2>
                <button type="button" onClick={() => { setFile(null); setPages([]); setResult(null); setStage('idle'); }} className="text-[12px] font-bold underline" style={{ color: SIG.muted }}>Changer</button>
              </div>
              <div className="grid place-items-center overflow-hidden rounded-[16px]" style={{ background: SIG.surfaceAlt }}>
                {pages[current] && <img src={pages[current].preview} alt={`Page ${current + 1} prétraitée`} className="max-h-[62vh] w-auto object-contain" />}
              </div>
              {pages.length > 1 && (
                <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                  {pages.map((p, i) => (
                    <button key={p.page} type="button" onClick={() => setCurrent(i)} aria-label={`Page ${i + 1}`} aria-current={i === current} className="relative h-16 w-12 shrink-0 overflow-hidden rounded-[8px] border-2" style={{ borderColor: i === current ? SIG.gold : SIG.hairline }}>
                      <img src={p.preview} alt="" className="h-full w-full object-cover" />
                      {p.nativeText && <span className="absolute inset-x-0 bottom-0 bg-black/60 text-center text-[8px] font-bold text-white">texte</span>}
                    </button>
                  ))}
                </div>
              )}
              {stage !== 'done' && (
                <>
                  <fieldset className="mt-4 grid grid-cols-2 gap-2">
                    <legend className="sr-only">Type de document</legend>
                    {([['printed', 'Imprimé / scanné'], ['handwritten', 'Manuscrit']] as const).map(([k, label]) => (
                      <button key={k} type="button" onClick={() => setMode(k)} aria-pressed={mode === k} disabled={busy} className="h-10 rounded-[12px] border text-[12.5px] font-extrabold" style={{ borderColor: mode === k ? SIG.gold : SIG.hairline, background: mode === k ? SIG.goldTint : '#fff' }}>{label}</button>
                    ))}
                  </fieldset>
                  <button type="button" onClick={run} disabled={busy} className="fitila-lift mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-full text-[14px] font-extrabold disabled:opacity-60" style={{ background: SIG.gold, color: '#2B2110' }}>
                    {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> {progress || 'Traitement…'}</> : <><Wand2 className="h-4 w-4" /> Extraire le texte</>}
                  </button>
                </>
              )}
            </section>

            {/* Résultat */}
            <section className="flex flex-col rounded-[24px] border bg-white p-4" style={{ borderColor: SIG.hairline }} aria-label="Texte extrait">
              {stage === 'done' && result ? (
                <>
                  <input value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Titre du document" placeholder="Titre du document" className="mb-3 h-11 rounded-[12px] border px-3 text-[16px] font-semibold outline-none focus:border-[#C99530]" style={{ borderColor: SIG.hairline, fontFamily: SERIF }} />
                  <div className="mb-3 flex flex-wrap items-center gap-2 text-[12px]">
                    <span className="rounded-full px-2.5 py-1 font-extrabold" style={{ background: conf >= 80 ? SIG.sageTint : conf >= 55 ? SIG.goldTint : SIG.clayTint, color: conf >= 80 ? SIG.sage : conf >= 55 ? SIG.goldDeep : SIG.clay }}>Confiance {conf} %</span>
                    <span className="rounded-full px-2.5 py-1 font-bold" style={{ background: SIG.surfaceAlt }}>{result.engine}</span>
                    {result.corrections > 0 && <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-bold" style={{ background: SIG.goldTint, color: SIG.goldDeep }}><Sparkles className="h-3 w-3" /> {result.corrections} correction{result.corrections > 1 ? 's' : ''} par le dictionnaire</span>}
                  </div>
                  <BaribaCharPalette onInsert={insert} className="mb-3" />
                  <textarea ref={area} value={text} onChange={(e) => setText(e.target.value)} lang="bba" spellCheck={false} aria-label="Texte extrait, modifiable" className="espace-prose min-h-[38vh] w-full flex-1 resize-y rounded-[14px] border p-3.5 outline-none focus:border-[#C99530]" style={{ borderColor: SIG.hairline }} />
                  {result.pages.some((p) => p.notes.length > 0 && !p.notes.includes('Texte natif du PDF')) && (
                    <ul className="mt-2 list-inside list-disc text-[11.5px]" style={{ color: SIG.muted }}>{result.pages.flatMap((p) => p.notes.filter((n) => n !== 'Texte natif du PDF').map((n) => <li key={`${p.page}${n}`}>Page {p.page} : {n}</li>))}</ul>
                  )}
                  <button type="button" onClick={create} disabled={saving} className="fitila-lift mt-4 flex h-12 items-center justify-center gap-2 rounded-full text-[14px] font-extrabold disabled:opacity-60" style={{ background: SIG.gold, color: '#2B2110' }}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <FilePlus2 className="h-4 w-4" />} Enregistrer dans l’Espace
                  </button>
                  <p className="mt-2 text-center text-[11.5px]" style={{ color: SIG.muted }}>Le fichier d’origine est conservé avec le document, le texte s’ouvre dans l’éditeur.</p>
                </>
              ) : (
                <div className="grid flex-1 place-items-center py-14 text-center" style={{ color: SIG.muted }}>
                  <div><ScanText className="mx-auto h-8 w-8 opacity-50" /><p className="mt-3 max-w-[260px] text-[13px]">Le texte extrait apparaîtra ici, modifiable, avec la palette ɛ ɔ ŋ et les tons.</p></div>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
