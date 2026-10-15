import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import BaribaAudioText from '@/components/fitila/BaribaAudioText';
import type { ApCard } from '@/lib/apprendre/content';
export default function ApWordPronunciationCard({card,color}:{card:ApCard;color:string}) {
  const [open,setOpen]=useState(false);
  const forms=[['Pluriel',card.pl],['Forme focalisée',card.foc],['Inaccompli',card.conj?.inacc],['Accompli',card.conj?.acc],['Négation',card.conj?.neg],['Impératif',card.conj?.imp]].filter((row):row is [string,string]=>typeof row[1]==='string'&&!!row[1].trim());
  const details=forms.length>0||!!card.ex_ba;
  return <article aria-label={card.ba} className="rounded-2xl border border-[#E4DFCC] bg-white px-3 py-3">
    <div className="flex min-w-0 items-start gap-2"><div className="min-w-0 flex-1"><BaribaAudioText text={card.ba} compact textClassName="text-lg font-bold" /><p className="ml-12 text-sm text-[#6F6955]">{card.fr}</p></div><span className="mt-4 h-2.5 w-2.5 shrink-0 rounded-full" style={{background:color}}/>{details&&<button type="button" aria-label={`Exemples et formes : ${card.ba}`} aria-expanded={open} onClick={()=>setOpen(!open)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#E4DFCC]"><ChevronDown className={`h-4 w-4 ${open?'rotate-180':''}`}/></button>}</div>
    {open&&<div className="mt-3 space-y-3 border-t border-[#E4DFCC] pt-3">
      {forms.map(([label,text])=><div key={label}><p className="mb-1 text-[11px] font-bold text-[#716B5F]">{label}</p><BaribaAudioText text={text} compact/></div>)}
      {card.ex_ba&&<div><p className="mb-1 text-[11px] font-bold text-[#716B5F]">Exemple</p><BaribaAudioText text={card.ex_ba} compact/>{card.ex_fr&&<p className="mt-1 text-sm text-[#716B5F]">{card.ex_fr}</p>}</div>}
      <p className="text-[10px] text-[#716B5F]">Dictionnaire, p. {card.p}{card.st==='a_valider'?' · forme à confirmer':''}</p>
    </div>}
  </article>;
}
