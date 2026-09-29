import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRightLeft, BookOpen, Check, Copy, CornerDownRight, Languages, Loader2, Replace, Sparkles, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SIG } from '@/components/fitila/signatureTheme';
import { translateRemote } from '@/lib/espace/api';
import { glossHead, tokenize, type BaribaLexicon, type Translation, type TranslationDirection } from '@/lib/espace/baribaText';

export type DirMode = 'auto' | TranslationDirection;
const label = (d: TranslationDirection) => (d === 'ba-fr' ? 'BA → FR' : 'FR → BA');

/** Traduction hors ligne immédiate, puis améliorée par le moteur en ligne (avec anti-course). */
export function useLiveTranslation(lexicon: BaribaLexicon | null, text: string, mode: DirMode, enabled: boolean, remote = true) {
  const [state, setState] = useState<{ offline: Translation | null; online: string | null; loading: boolean; direction: TranslationDirection }>({ offline: null, online: null, loading: false, direction: 'fr-ba' });
  const req = useRef(0);
  useEffect(() => {
    const clean = text.trim();
    if (!enabled || !lexicon || clean.length < 2) {
      setState((s) => (s.offline || s.online || s.loading ? { ...s, offline: null, online: null, loading: false } : s));
      return;
    }
    const direction = mode === 'auto' ? lexicon.detectDirection(clean) : mode;
    setState({ offline: lexicon.translate(clean, direction), online: null, loading: remote, direction });
    if (!remote) return;
    const id = ++req.current;
    const t = setTimeout(async () => {
      const out = await translateRemote(clean.slice(0, 600), direction);
      if (id === req.current) setState((s) => ({ ...s, online: out, loading: false }));
    }, 750);
    return () => clearTimeout(t);
  }, [lexicon, text, mode, enabled, remote]);
  return state;
}

/** Bandeau « Traduction en direct » du paragraphe en cours de saisie. */
export function LiveStrip({ lexicon, paragraph, mode, onMode, onReplace, onInsertBelow }: { lexicon: BaribaLexicon | null; paragraph: string; mode: DirMode; onMode: (m: DirMode) => void; onReplace: (t: string) => void; onInsertBelow: (t: string) => void }) {
  const tr = useLiveTranslation(lexicon, paragraph, mode, true);
  const shown = tr.online ?? tr.offline?.text ?? null;
  const cycle = () => onMode(mode === 'auto' ? 'ba-fr' : mode === 'ba-fr' ? 'fr-ba' : 'auto');
  return (
    <div className="flex items-start gap-2.5 border-t px-3 py-2" style={{ borderColor: SIG.hairline, background: '#FBF8EE' }} aria-live="polite">
      <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={cycle} title="Changer le sens de traduction" className="mt-0.5 flex shrink-0 items-center gap-1 rounded-full border bg-white px-2.5 py-1 text-[11.5px] font-extrabold" style={{ borderColor: SIG.hairline, color: SIG.goldDeep }}>
        <ArrowRightLeft className="h-3 w-3" /> {mode === 'auto' ? `Auto · ${label(tr.direction)}` : label(mode)}
      </button>
      <div className="min-w-0 flex-1">
        {shown ? (
          <p className="text-[13.5px] font-semibold leading-snug" style={{ color: SIG.ink }}>{shown}</p>
        ) : (
          <p className="text-[12.5px]" style={{ color: SIG.muted }}>{paragraph.trim().length < 2 ? 'La traduction du paragraphe apparaît ici pendant que vous écrivez.' : tr.loading ? 'Traduction en cours…' : 'Pas de traduction trouvée dans le dictionnaire.'}</p>
        )}
        <p className="mt-0.5 flex items-center gap-1 text-[10.5px]" style={{ color: SIG.muted }}>
          {tr.loading ? <><Loader2 className="h-3 w-3 animate-spin" /> moteur IA…</> : tr.online ? <><Sparkles className="h-3 w-3" style={{ color: SIG.gold }} /> traduction IA</> : tr.offline ? <>dictionnaire · {tr.offline.kind === 'phrase' ? 'phrase connue' : tr.offline.kind === 'word' ? 'mot' : 'mot à mot'}</> : null}
        </p>
      </div>
      {shown && (
        <div className="flex shrink-0 gap-1">
          <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => onInsertBelow(shown)} title="Insérer sous le paragraphe" className="grid h-8 w-8 place-items-center rounded-full border bg-white" style={{ borderColor: SIG.hairline }}><CornerDownRight className="h-3.5 w-3.5" /></button>
          <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => onReplace(shown)} title="Remplacer le paragraphe" className="grid h-8 w-8 place-items-center rounded-full" style={{ background: SIG.gold, color: '#2B2110' }}><Replace className="h-3.5 w-3.5" /></button>
        </div>
      )}
    </div>
  );
}

export type Pick = { text: string; rect: { left: number; top: number; bottom: number; width: number } };

/** Fenêtre flottante sur une sélection : traduction, homonymes / équivalents à choisir, remplacer, copier. */
export function SelectionPopover({ lexicon, pick, onReplace, onAppend, onClose }: { lexicon: BaribaLexicon; pick: Pick; onReplace: (t: string) => void; onAppend: (t: string) => void; onClose: () => void }) {
  const nav = useNavigate();
  const [mode, setMode] = useState<DirMode>('auto');
  const [copied, setCopied] = useState(false);
  const tr = useLiveTranslation(lexicon, pick.text, mode, true);
  const words = useMemo(() => tokenize(pick.text), [pick.text]);
  const single = words.length === 1 ? words[0].word : null;
  const alts = useMemo(() => {
    if (!single) return [] as { ba: string; fr: string }[];
    return tr.direction === 'ba-fr' ? lexicon.lookup(single).map((e) => ({ ba: e.ba, fr: glossHead(e.fr) })).filter((a) => a.fr) : lexicon.lookupFrench(single).map((e) => ({ ba: e.ba, fr: glossHead(e.fr) }));
  }, [single, tr.direction, lexicon]);
  const shown = tr.online ?? tr.offline?.text ?? null;
  const W = 320;
  const vw = typeof window === 'undefined' ? 1280 : window.innerWidth;
  const left = Math.min(Math.max(12, pick.rect.left + pick.rect.width / 2 - W / 2), vw - W - 12);
  const below = pick.rect.top < 230;
  const style: React.CSSProperties = { position: 'fixed', left, width: W, zIndex: 60, ...(below ? { top: pick.rect.bottom + 10 } : { bottom: window.innerHeight - pick.rect.top + 10 }) };
  const keep = (e: React.MouseEvent) => e.preventDefault();

  return (
    <div role="dialog" aria-label="Traduction de la sélection" style={style} onMouseDown={keep} className="fitila-rise rounded-[18px] border bg-white p-3 shadow-[0_24px_50px_-20px_rgba(36,31,46,.5)]">
      <div className="mb-2 flex items-center gap-2">
        <Languages className="h-4 w-4" style={{ color: SIG.goldDeep }} />
        <button type="button" onClick={() => setMode(mode === 'auto' ? 'ba-fr' : mode === 'ba-fr' ? 'fr-ba' : 'auto')} className="rounded-full border px-2.5 py-0.5 text-[11.5px] font-extrabold" style={{ borderColor: SIG.hairline, color: SIG.goldDeep }}>
          {mode === 'auto' ? `Auto · ${label(tr.direction)}` : label(mode)}
        </button>
        <span className="min-w-0 flex-1 truncate text-right text-[12px] font-bold" style={{ color: SIG.muted }}>« {pick.text.length > 28 ? `${pick.text.slice(0, 28)}…` : pick.text} »</span>
        <button type="button" onClick={onClose} aria-label="Fermer" className="grid h-6 w-6 place-items-center rounded-full hover:bg-[#F1EDDF]"><X className="h-3.5 w-3.5" /></button>
      </div>
      <div className="rounded-[12px] p-2.5" style={{ background: SIG.goldTint }}>
        {shown ? <p className="text-[15px] font-bold leading-snug" style={{ color: SIG.ink }}>{shown}</p> : <p className="text-[12.5px]" style={{ color: SIG.inkSoft }}>{tr.loading ? 'Recherche…' : 'Aucune traduction dans le dictionnaire.'}</p>}
        <p className="mt-1 flex items-center gap-1 text-[10.5px]" style={{ color: SIG.goldDeep }}>
          {tr.loading ? <><Loader2 className="h-3 w-3 animate-spin" /> moteur IA…</> : tr.online ? <><Sparkles className="h-3 w-3" /> traduction IA</> : tr.offline ? 'dictionnaire' : null}
        </p>
      </div>
      {alts.length > 1 && (
        <div className="mt-2">
          <p className="mb-1 text-[10.5px] font-extrabold uppercase tracking-wide" style={{ color: SIG.muted }}>{tr.direction === 'fr-ba' ? 'Choisir le mot Bariba' : 'Autres sens'}</p>
          <div className="flex flex-wrap gap-1.5">
            {alts.map((a) => (
              <button key={`${a.ba}${a.fr}`} type="button" onClick={() => onReplace(tr.direction === 'fr-ba' ? a.ba : a.fr)} className="rounded-full border bg-white px-2.5 py-1 text-[12.5px] font-bold transition-transform active:scale-95" style={{ borderColor: SIG.hairline }} title={tr.direction === 'fr-ba' ? a.fr : a.ba}>
                {tr.direction === 'fr-ba' ? a.ba : a.fr}<span className="ml-1 text-[10.5px] font-medium" style={{ color: SIG.muted }}>{tr.direction === 'fr-ba' ? a.fr.slice(0, 14) : a.ba}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="mt-3 flex items-center gap-1.5">
        <button type="button" disabled={!shown} onClick={() => shown && onReplace(shown)} className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full text-[12.5px] font-extrabold disabled:opacity-40" style={{ background: SIG.gold, color: '#2B2110' }}><Replace className="h-3.5 w-3.5" /> Remplacer</button>
        <button type="button" disabled={!shown} onClick={() => shown && onAppend(shown)} className="flex h-9 items-center gap-1.5 rounded-full border bg-white px-3 text-[12.5px] font-extrabold disabled:opacity-40" style={{ borderColor: SIG.hairline }}><CornerDownRight className="h-3.5 w-3.5" /> Ajouter</button>
        <button type="button" disabled={!shown} aria-label="Copier" onClick={async () => { if (shown) { await navigator.clipboard.writeText(shown); setCopied(true); setTimeout(() => setCopied(false), 1400); } }} className="grid h-9 w-9 place-items-center rounded-full border bg-white disabled:opacity-40" style={{ borderColor: SIG.hairline }}>{copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}</button>
        {single && <button type="button" aria-label="Ouvrir dans le dictionnaire" title="Dictionnaire" onClick={() => nav(`/dictionary?q=${encodeURIComponent(single)}`)} className="grid h-9 w-9 place-items-center rounded-full border bg-white" style={{ borderColor: SIG.hairline }}><BookOpen className="h-3.5 w-3.5" /></button>}
      </div>
    </div>
  );
}
