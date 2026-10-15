import { useState } from 'react';
import { BookOpen, Check, Undo2 } from 'lucide-react';
import type { TranscriptRepair } from '@/lib/voice/transcriptionReview';
const sources: Record<string,string> = { dictionary: 'Dictionnaire', corpus: 'Corpus de phrases', apprendre: 'Apprendre', 'apprendre-content': 'Contenu Apprendre' };
export default function TranscriptionReview({ report, selected, onChoose }: { report: TranscriptRepair; selected: string; onChoose: (text: string) => boolean }) {
  const [message, setMessage] = useState('');
  const choose = (text: string) => {
    setMessage(onChoose(text) ? '' : 'Votre brouillon a été modifié. La proposition reste disponible ci-dessous ; votre texte est conservé.');
  };
  return <section aria-label="Vérification de la transcription" className="mt-2 max-h-64 min-w-0 overflow-y-auto overscroll-contain rounded-2xl border border-[#D9D2B9] bg-[#FBF8EE] p-3 text-[#241F2E]">
    <details><summary className="cursor-pointer text-xs font-semibold text-[#716B5F]">Voir la transcription brute</summary><p className="mt-2 whitespace-pre-wrap break-words text-sm" data-testid="raw-transcript">{report.raw}</p></details>
    {report.proposals.length > 0 ? <>
      <p className="mt-3 flex items-center gap-1.5 text-xs font-bold"><BookOpen className="h-3.5 w-3.5" />{report.status === 'ambiguous' ? 'Plusieurs formulations proches' : 'Formulation proche retrouvée'}</p>
      <div className="mt-2 space-y-2">{report.proposals.map((proposal, index) => {
        const chosen = selected === proposal.text;
        return <div key={index} className="min-w-0 rounded-xl border border-[#E4DFCC] bg-white p-3">
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{proposal.text}</p>
          <p className="mt-2 text-[10px] text-[#716B5F]">{[...new Set(proposal.sources.map(source => sources[source.source] || 'Ressource FITILA'))].join(' · ')} · formulation à confirmer</p>
          <button type="button" disabled={chosen} onClick={() => choose(proposal.text)} className="mt-2 inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-[#3F6E52] px-3 text-xs font-bold text-white disabled:opacity-65">{chosen && <Check className="h-3.5 w-3.5" />}{chosen ? 'Proposition retenue' : 'Utiliser cette proposition'}</button>
        </div>;
      })}</div>
      <p className="mt-2 text-[10px] leading-relaxed text-[#716B5F]">Une ressemblance ne garantit pas le sens. Relisez la phrase avant l’envoi.</p>
    </> : <p className="mt-2 text-[11px] text-[#716B5F]">{report.status === 'unavailable' ? 'Comparaison momentanément indisponible. Le texte reconnu est conservé.' : report.status === 'matched' ? report.matched_segments === report.total_segments ? 'Cette formulation est déjà présente dans les ressources FITILA.' : 'Certains passages sont déjà présents dans les ressources. Le reste est conservé.' : 'Aucune reformulation suffisamment proche à proposer. Le texte reconnu est conservé.'}</p>}
    {selected !== report.text && <button type="button" onClick={() => choose(report.text)} className="mt-2 inline-flex min-h-9 items-center gap-1 text-xs font-semibold text-[#716B5F]"><Undo2 className="h-3.5 w-3.5" />Revenir au texte reconnu</button>}
    {report.analyzed_segments < report.total_segments && <p className="mt-2 text-[10px] text-[#716B5F]">Comparaison partielle : {report.analyzed_segments}/{report.total_segments} passages. Le reste de la transcription est conservé.</p>}
    {message && <p role="status" className="mt-2 text-xs text-[#9C6B1D]">{message}</p>}
  </section>;
}
