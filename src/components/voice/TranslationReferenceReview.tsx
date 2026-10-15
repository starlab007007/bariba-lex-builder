import { useEffect, useRef, useState } from 'react';
import { BookOpen, Check, ChevronDown, Loader2, Search, Undo2 } from 'lucide-react';
import { FITILA_API_PUBLIC_KEY, FITILA_API_URL, supabase } from '@/integrations/supabase/client';
import type { TranslationReferenceReview as Review } from '../../../supabase/functions/_shared/translation-reference-core';
const labels: Record<string,string> = { dictionary: 'Dictionnaire', corpus: 'Corpus de phrases', apprendre: 'Apprendre', 'apprendre-content': 'Contenu Apprendre' };
type Props = { text: string; language: 'fr' | 'bba'; scope: 'source' | 'translation'; originalInput?: string; disabled?: boolean; onApply: (previous: string, next: string) => boolean };
export default function TranslationReferenceReview({ text, language, scope, originalInput, disabled, onApply }: Props) {
  const [review, setReview] = useState<Review | null>(null), [selected, setSelected] = useState('');
  const [busy, setBusy] = useState(false), [notice, setNotice] = useState(''), [open, setOpen] = useState(true);
  const controller = useRef<AbortController | null>(null), generation = useRef(0), currentText = useRef(text);
  currentText.current = text;
  useEffect(() => { generation.current++; controller.current?.abort(); setReview(null); setNotice(''); setBusy(false); }, [language, scope, originalInput]);
  useEffect(() => () => { generation.current++; controller.current?.abort(); }, []);
  const find = async () => {
    controller.current?.abort(); const abort = new AbortController(); controller.current = abort;
    const request = ++generation.current, input = text;
    setBusy(true); setNotice('');
    try {
      const { data } = await supabase.auth.getSession();
      const response = await fetch(`${FITILA_API_URL}/functions/v1/refine-bariba`, {
        method: 'POST', signal: AbortSignal.any([abort.signal, AbortSignal.timeout(12_000)]),
        headers: { 'Content-Type': 'application/json', apikey: FITILA_API_PUBLIC_KEY, ...(data.session?.access_token ? { Authorization: `Bearer ${data.session.access_token}` } : {}) },
        body: JSON.stringify({ type: 'reference-review', text: input, language, scope, originalInput }),
      });
      if (!response.ok) throw new Error('lookup');
      const result = (await response.json()).review as Review;
      if (request !== generation.current) return;
      if (currentText.current !== input) { setNotice('Votre texte a changé. Relancez la comparaison pour ce brouillon.'); return; }
      if (!result || result.raw !== input || result.scope !== scope || !Array.isArray(result.proposals) || !Array.isArray(result.lexical_proposals)) throw new Error('invalid');
      setReview(result); setSelected(input); setOpen(true);
    } catch { if (request === generation.current && !abort.signal.aborted) setNotice('Comparaison momentanément indisponible. Votre texte est conservé.'); }
    finally { if (request === generation.current) setBusy(false); }
  };
  const apply = (next: string) => {
    if (!onApply(selected, next)) { setNotice('Votre brouillon a été modifié. Votre texte est conservé ; relancez la comparaison.'); return; }
    setSelected(next); setNotice('');
  };
  const choices = [...(review?.proposals ?? []).map(proposal => ({ text: proposal.text, label: 'Formulation proche', sources: proposal.sources, from: '', to: '' })), ...(review?.lexical_proposals ?? []).map(proposal => ({ ...proposal, label: 'Mot proche' }))];
  const unique = choices.filter((choice, n) => choices.findIndex(other => other.text === choice.text) === n);
  return <section aria-label={scope === 'source' ? 'Références du texte source' : 'Références de la traduction'} className="mt-2 min-w-0 rounded-2xl border border-[#DCD8C8] bg-[#FBF9F0] text-[#241F2E]">
    <div className="flex flex-wrap items-center justify-between gap-2 p-2.5">
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="flex min-h-9 items-center gap-2 text-left text-xs font-bold"><BookOpen className="h-4 w-4 shrink-0 text-[#3F6E52]" />{scope === 'source' ? 'Enrichir avec les références FITILA' : 'Affiner avec les références FITILA'}<ChevronDown className={`h-3 w-3 ${open ? 'rotate-180' : ''}`} /></button>
      <button type="button" disabled={busy || disabled || !text.trim() || text.length > 4000} onClick={find} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-[#D9D2B9] bg-white px-3 text-xs font-semibold disabled:opacity-50">{busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}{busy ? 'Recherche…' : 'Comparer aux ressources'}</button>
    </div>
    {open && <div className="max-h-72 space-y-2 overflow-y-auto overscroll-contain px-3 pb-3">
      {!review && <p className="text-[11px] leading-relaxed text-[#716B5F]">Dictionnaire, expressions, corpus et Apprendre. Choisissez une proposition après lecture ; votre texte reste conservé.</p>}
      {text.length > 4000 && <p className="text-xs text-[#716B5F]">Comparez un passage de 4 000 caractères maximum.</p>}
      {review && <>
        <details className="text-xs"><summary className="cursor-pointer font-semibold text-[#716B5F]">{scope === 'source' ? 'Voir le texte initial' : 'Voir la traduction initiale'}</summary><p data-testid="reference-review-original" className="mt-2 whitespace-pre-wrap break-words">{review.raw}</p></details>
        {unique.map((choice, index) => <div key={index} className="min-w-0 rounded-xl border border-[#E4DFCC] bg-white p-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-[#3F6E52]">{choice.label}{choice.from && <> · {choice.from} → {choice.to}</>}</p>
          <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed">{choice.text}</p>
          <p className="mt-2 text-[10px] text-[#716B5F]">{[...new Set(choice.sources.map(source => labels[source.source] || 'Ressource FITILA'))].join(' · ')}{scope === 'translation' && ' · rapprochement bilingue'}</p>
          {(review.paired_references ?? []).filter(pair => choice.sources.some(source => source.source === pair.source && source.source_id === pair.source_id)).slice(0, 3).map((pair, n) => <p key={n} className="mt-1 break-words text-[11px] text-[#716B5F]">Source associée : {pair.text}</p>)}
          <details className="mt-1 text-[10px] text-[#716B5F]"><summary className="cursor-pointer">Voir les références</summary>{choice.sources.slice(0, 5).map((source, n) => <p key={n} className="mt-1 break-words">{source.text} · {labels[source.source]} · {source.source_id} · {source.validation === 'verified' ? 'marquée vérifiée' : 'à confirmer'}</p>)}</details>
          <button type="button" disabled={disabled || busy || selected === choice.text} onClick={() => apply(choice.text)} className="mt-2 inline-flex min-h-10 items-center gap-1 rounded-xl bg-[#3F6E52] px-3 text-xs font-bold text-white disabled:opacity-60">{selected === choice.text && <Check className="h-3.5 w-3.5" />}{selected === choice.text ? 'Proposition appliquée' : 'Appliquer la proposition'}</button>
        </div>)}
        {!unique.length && <p className="text-xs leading-relaxed text-[#716B5F]">{review.status === 'unavailable' ? 'Comparaison indisponible. Le texte initial reste conservé.' : review.matched_segments === review.total_segments && review.total_segments > 0 ? 'Cette formulation figure déjà dans les ressources FITILA.' : scope === 'translation' ? 'Aucune formulation bilingue suffisamment proche à proposer. La traduction reste conservée.' : 'Aucune formulation suffisamment proche à proposer. Le texte reste conservé.'}</p>}
        <p className="text-[10px] leading-relaxed text-[#716B5F]">{review.recognized_terms} mot(s) retrouvé(s) à l’identique sur {review.analyzed_terms} analysé(s).{review.analyzed_terms < review.total_terms && ' Analyse lexicale partielle.'} Les références du catalogue restent à confirmer. Relisez le sens avant de choisir.</p>
        {review.analyzed_segments < review.total_segments && <p className="text-[10px] text-[#716B5F]">Comparaison de {review.analyzed_segments}/{review.total_segments} passages ; les autres passages sont conservés.</p>}
        {selected !== review.raw && <button type="button" disabled={disabled || busy} onClick={() => apply(review.raw)} className="inline-flex min-h-9 items-center gap-1 text-xs font-semibold text-[#716B5F]"><Undo2 className="h-3.5 w-3.5" />{scope === 'source' ? 'Rétablir le texte initial' : 'Rétablir la traduction initiale'}</button>}
      </>}
    </div>}
    {(notice || busy) && <p role="status" className="px-3 pb-3 text-xs text-[#716B5F]">{notice || 'Recherche de mots et de formulations proches…'}</p>}
  </section>;
}
