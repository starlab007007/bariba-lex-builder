import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useApprendreContent } from '@/lib/apprendre/contentLoader';
import { ApprendreStore } from '@/lib/apprendre/store';

const GOLD='#C9972C', INK='#241F2E', MUTED='#777161', LINE='#E4DFCC', IVORY='#F8F5EA';

export default function FitilaLearnProgress(){
  const nav=useNavigate(); const {data,isLoading,error}=useApprendreContent(); const [store]=useState(()=>ApprendreStore.open());
  const progress=store.progress; const now=Date.now();
  const forecast=useMemo(()=>progress.dueForecast(now),[progress,now]);
  const max=Math.max(1,...forecast); const days=['Auj.','J+1','J+2','J+3','J+4','J+5','J+6'];
  if(isLoading)return <div className="flex h-full items-center justify-center" style={{background:IVORY}}>Chargement…</div>;
  if(error||!data?.content)return <div className="flex h-full items-center justify-center" style={{background:IVORY}}>Progression indisponible.</div>;
  const content=data.content;
  const stats=[
    ['Mots actifs',String(progress.activeWords),content.cards.size?progress.activeWords/content.cards.size:0],
    ['Fondations',`${progress.foundationsDone}/${content.foundations.length}`,content.foundations.length?progress.foundationsDone/content.foundations.length:0],
    ['Jours de suite',String(progress.streak),Math.min(1,progress.streak/7)],
    ['Points',String(progress.xp),(progress.xp%500)/500],
  ] as const;
  return <div className="h-full overflow-y-auto" style={{background:IVORY,color:INK}}>
    <div className="mx-auto max-w-[900px] px-5 pb-28 pt-20">
      <div className="mb-5 flex items-center gap-3"><button onClick={()=>nav('/learn')} className="flex h-11 w-11 items-center justify-center rounded-full border bg-white" style={{borderColor:LINE}}><ArrowLeft/></button><div><h1 className="text-2xl font-black">Ma progression</h1><p className="text-sm" style={{color:MUTED}}>Enregistrée sur cet appareil</p></div></div>
      <div className="grid grid-cols-2 gap-3">{stats.map(([label,value,ratio])=><div key={label} className="rounded-3xl border bg-white p-5" style={{borderColor:LINE}}><div className="text-2xl font-black">{value}</div><div className="mt-1 text-sm" style={{color:MUTED}}>{label}</div><div className="mt-4 h-2 overflow-hidden rounded-full bg-[#EEE8D7]"><div className="h-full rounded-full" style={{width:`${Math.round(Math.max(0,Math.min(1,ratio))*100)}%`,background:GOLD}}/></div></div>)}</div>
      <h2 className="mb-3 mt-7 text-lg font-black">Révisions à venir</h2>
      <div className="rounded-3xl border bg-white p-5" style={{borderColor:LINE}}><h3 className="text-xl font-black">{forecast[0]===0?'Rien à revoir aujourd’hui':forecast[0]+' mots à revoir aujourd’hui'}</h3><p className="mt-1 text-sm" style={{color:MUTED}}>Chaque mot revient juste avant d’être oublié.</p><div className="mt-6 flex h-36 items-end gap-2">{forecast.map((n,i)=><div key={i} className="flex flex-1 flex-col items-center justify-end"><div className="text-xs font-bold">{n}</div><div className="mt-1 w-full rounded-t-lg" style={{height:4+80*n/max,background:i===0?'#C96A3F':GOLD}}/><div className="mt-2 text-[10px]" style={{color:MUTED}}>{days[i]}</div></div>)}</div></div>
      <h2 className="mb-3 mt-7 text-lg font-black">Par thème</h2>
      <div className="space-y-3">{content.themes.map(theme=>{const learned=progress.learnedIn(theme); const total=theme.cardIds.length; return <div key={theme.id} className="rounded-2xl border bg-white p-4" style={{borderColor:LINE}}><div className="flex items-center justify-between gap-3"><span className="font-bold">{theme.nameFr}</span><span className="text-xs" style={{color:MUTED}}>{learned}/{total}</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-[#EEE8D7]"><div className="h-full rounded-full" style={{width:`${total?Math.round(learned/total*100):0}%`,background:GOLD}}/></div></div>})}</div>
    </div>
  </div>;
}
