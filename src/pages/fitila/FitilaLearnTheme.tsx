import React, { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Play, Search } from 'lucide-react';
import { useApprendreContent } from '@/lib/apprendre/contentLoader';
import { ApprendreStore } from '@/lib/apprendre/store';
import { ApTaskFactory } from '@/lib/apprendre/tasks';
import { baseForm } from '@/lib/apprendre/content';
import ApSessionScreen from '@/components/apprendre/ApSessionScreen';
import { AP_COLORS } from '@/components/apprendre/apColors';
import { BaribaAudioButton } from '@/components/fitila/BaribaAudioText';

export default function FitilaLearnTheme(){
  const nav=useNavigate(); const {id}=useParams(); const {data,isLoading,error}=useApprendreContent();
  const [store]=useState(()=>ApprendreStore.open()); const [query,setQuery]=useState(''); const [session,setSession]=useState(false);
  const theme=data?.content.themeById(id||'');
  const cards=theme&&data?.content?data.content.cardsOf(theme):[];
  const visible=useMemo(()=>{const q=baseForm(query); if(!q)return cards; return cards.filter(c=>baseForm(c.ba).includes(q)||c.fr.toLowerCase().includes(query.toLowerCase()));},[cards,query]);
  const learned=theme?store.progress.learnedIn(theme):0;
  if(session&&theme&&data?.content){
    const tasks=new ApTaskFactory(data.content).themeSession(theme,store.progress,{now:Date.now()});
    return <ApSessionScreen title={theme.name_fr} tasks={tasks} store={store} sessionKey={theme.id} onClose={()=>setSession(false)}/>;
  }
  if(isLoading)return <div className="flex h-full items-center justify-center" style={{background:AP_COLORS.ivory}}>Chargement…</div>;
  if(error||!theme||!data?.content)return <div className="flex h-full items-center justify-center" style={{background:AP_COLORS.ivory}}>Thème indisponible.</div>;
  const ratio=cards.length?learned/cards.length:0;
  return <div className="h-full overflow-y-auto" style={{background:AP_COLORS.ivory,color:AP_COLORS.ink}}>
    <div className="mx-auto max-w-[900px] px-5 pb-28 pt-20">
      <div className="mb-5 flex items-center gap-3">
        <button onClick={()=>nav('/learn')} className="flex h-11 w-11 items-center justify-center rounded-full border" style={{borderColor:AP_COLORS.line,background:AP_COLORS.surface}}><ArrowLeft className="h-5 w-5"/></button>
        <div><h1 className="text-2xl font-black">{theme.name_fr}</h1><p className="text-sm" style={{color:AP_COLORS.muted}}>{cards.length} mots vérifiés</p></div>
      </div>
      <div className="rounded-3xl border p-5" style={{borderColor:AP_COLORS.line,background:AP_COLORS.surface}}>
        <div className="flex items-center gap-4"><div className="flex h-20 w-20 items-center justify-center rounded-full border-[8px] text-xl font-black" style={{borderColor:AP_COLORS.gold}}>{learned}</div><div><h2 className="text-xl font-black">{learned===0?'Commence par 6 mots':learned+' mots actifs'}</h2><p className="mt-1 text-sm" style={{color:AP_COLORS.muted}}>Chaque séance mêle nouveaux mots et révisions.</p></div></div>
        <div className="mt-4 h-2 overflow-hidden rounded-full" style={{background:AP_COLORS.goldTint}}><div className="h-full rounded-full" style={{width:`${Math.round(ratio*100)}%`,background:AP_COLORS.gold}}/></div>
      </div>
      <button disabled={!cards.length} onClick={()=>setSession(true)} className="mt-3 flex h-14 w-full items-center justify-center gap-2 rounded-full text-base font-black disabled:opacity-50" style={{background:AP_COLORS.gold,color:AP_COLORS.goldInk}}><Play className="h-5 w-5"/>{learned===0?'Commencer la séance':'Continuer la séance'}</button>
      <div className="relative mt-5"><Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2" style={{color:AP_COLORS.muted}}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Chercher un mot (bàátɔ̀nú ou français)" className="w-full rounded-2xl border py-4 pl-12 pr-4 outline-none" style={{borderColor:AP_COLORS.line,background:AP_COLORS.surface}}/></div>
      <div className="mt-3 space-y-2">{visible.slice(0,120).map(card=>{const state=store.progress.srs[card.id];const dot=!state?AP_COLORS.line:state.active?AP_COLORS.sage:AP_COLORS.gold;return <div key={card.id} className="flex items-center rounded-2xl border px-4 py-3" style={{borderColor:AP_COLORS.line,background:AP_COLORS.surface}}><div className="min-w-0 flex-1"><div className="text-lg font-bold">{card.ba}</div><div className="text-sm" style={{color:AP_COLORS.quiet}}>{card.fr}</div></div><BaribaAudioButton text={card.ba} compact hideUnavailable /><span className="mx-2 h-2.5 w-2.5 rounded-full" style={{background:dot}}/></div>})}</div>
    </div>
  </div>;
}
