import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, BookOpen, Brain, ChevronRight, MapPin, Mic, Pause, Play, Plus,
  RefreshCw, Send, Sparkles, Swords, Trash2, Volume2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const C = {
  bg:'#F8F5EA', ink:'#241F2E', muted:'#777161', gold:'#C9972C', gold2:'#9C6B1D',
  border:'#E4DFCC', card:'#FFFFFF', night:'#0D1018', night2:'#151A24', ember:'#E0A03C', earth:'#C96A3F'
};

function Shell({children, dark=false}:{children:React.ReactNode;dark?:boolean}) {
  return <div className="h-full overflow-y-auto" style={{background:dark?C.night:C.bg,color:dark?'#F7F1E3':C.ink}}>
    <div className="mx-auto w-full max-w-[900px] px-4 pb-28 pt-20">{children}</div>
  </div>;
}

function BackTitle({title,subtitle,dark=false}:{title:string;subtitle?:string;dark?:boolean}) {
  const nav=useNavigate();
  return <div className="mb-5 flex items-center gap-3">
    <button onClick={()=>nav(-1)} className="flex h-11 w-11 items-center justify-center rounded-full border" style={{borderColor:dark?'#2E3848':C.border,background:dark?C.night2:'#fff'}}>
      <ArrowLeft className="h-5 w-5"/>
    </button>
    <div className="min-w-0">
      <h1 className="truncate text-2xl font-semibold" style={{fontFamily:'Fraunces, ui-serif, serif'}}>{title}</h1>
      {subtitle&&<p className="text-sm" style={{color:dark?'#AAB2C0':C.muted}}>{subtitle}</p>}
    </div>
  </div>;
}

function useUser() {
  const [user,setUser]=useState<any>(undefined);
  useEffect(()=>{let alive=true; supabase.auth.getUser().then(({data})=>alive&&setUser(data.user??null)); const {data:s}=supabase.auth.onAuthStateChange((_e,session)=>setUser(session?.user??null)); return()=>{alive=false;s.subscription.unsubscribe();};},[]);
  return user;
}

type Lieu={id:string;name:string;commune?:string|null;village_quartier?:string|null;latitude?:number|null;longitude?:number|null};
type Fragment={id:string;user_id:string;lieu_id:string;text:string;transcript_text?:string|null;audio_url?:string|null;period_label?:string|null;scope_level?:string|null;created_at?:string|null;latitude?:number|null;longitude?:number|null};

function LoginRequired() {
  const nav=useNavigate();
  return <div className="rounded-3xl border bg-white p-6 text-center" style={{borderColor:C.border}}>
    <div className="text-4xl">🔐</div><h2 className="mt-3 text-xl font-black">Connexion requise</h2>
    <p className="mt-2 text-sm" style={{color:C.muted}}>Handunia protège les portées et les contributions par identité.</p>
    <button onClick={()=>nav('/auth')} className="mt-4 rounded-full px-6 py-3 font-bold" style={{background:C.gold,color:'#2B2110'}}>Se connecter</button>
  </div>;
}

function HanduniaFeed({embedded=false}:{embedded?:boolean}) {
  const user=useUser(); const nav=useNavigate();
  const [items,setItems]=useState<Fragment[]>([]); const [lieux,setLieux]=useState<Record<string,Lieu>>({});
  const [loading,setLoading]=useState(true); const [error,setError]=useState('');
  const load=async()=>{setLoading(true);setError(''); try{
    const [{data:f,error:fe},{data:l,error:le}]=await Promise.all([
      supabase.from('handunia_fragments').select('id,user_id,lieu_id,text,transcript_text,audio_url,period_label,scope_level,created_at,latitude,longitude').is('withdrawn_at',null).order('created_at',{ascending:false}).limit(50),
      supabase.from('handunia_lieux').select('id,name,commune,village_quartier,latitude,longitude')
    ]);
    if(fe) throw fe; if(le) throw le; setItems((f??[]) as any); setLieux(Object.fromEntries(((l??[]) as any[]).map(x=>[x.id,x])));
  }catch(e:any){setError(e?.message||'En attente de réseau');} finally{setLoading(false);}};
  useEffect(()=>{if(user) load(); else if(user===null)setLoading(false);},[user]);
  if(user===undefined) return <div className="p-8 text-center">Chargement…</div>;
  if(!user) return <LoginRequired/>;
  return <div>
    {!embedded&&<BackTitle title="Handunia Wasa" subtitle="La mémoire vivante — voix, lieux, temps"/>}
    <div className="mb-4 flex gap-2">
      <button onClick={()=>nav('/creator/handunia')} className="flex-1 rounded-2xl px-4 py-3 font-black" style={{background:C.ember,color:'#2B2110'}}><Plus className="mr-2 inline h-5 w-5"/>Publier un souvenir</button>
      <button onClick={()=>nav('/handunia/map')} className="rounded-2xl border px-4" style={{borderColor:'#2E3848',background:C.night2}} aria-label="Carte"><MapPin/></button>
      <button onClick={()=>nav('/handunia/ask')} className="rounded-2xl border px-4" style={{borderColor:'#2E3848',background:C.night2}} aria-label="Mémoire"><Sparkles/></button>
    </div>
    {loading&&<div className="py-16 text-center">Mémoire en cours…</div>}
    {error&&<button onClick={load} className="mx-auto flex items-center gap-2 rounded-full border px-4 py-2"><RefreshCw className="h-4 w-4"/>{error}</button>}
    <div className="space-y-4">
      {items.map(f=>{const lieu=lieux[f.lieu_id]; const text=(f.transcript_text||f.text||'').trim(); return <article key={f.id} className="overflow-hidden rounded-[28px] border" style={{background:C.night2,borderColor:'#2E3848'}}>
        <div className="p-5">
          <div className="mb-4 flex items-center justify-between gap-2 text-xs" style={{color:'#AAB2C0'}}>
            <span>📍 {lieu?.village_quartier||lieu?.name||'Lieu transmis'}</span>
            <span>{f.period_label||'Mémoire transmise'}</span>
          </div>
          {f.audio_url?<audio controls preload="none" className="mb-4 w-full" src={f.audio_url}/>:<div className="mb-4 flex h-16 items-center justify-center rounded-2xl border" style={{borderColor:'#2E3848'}}><Volume2 className="mr-2"/> Voix non jointe</div>}
          <p className="line-clamp-5 text-lg font-semibold leading-relaxed">{text||'Souvenir vocal'}</p>
          <div className="mt-5 grid grid-cols-3 gap-2 text-[11px] font-bold">
            <button onClick={()=>nav('/handunia/ask?lieu='+encodeURIComponent(f.lieu_id))} className="rounded-xl border px-2 py-3" style={{borderColor:'#2E3848'}}>Mémoire</button>
            <button onClick={()=>nav('/handunia/memory/'+f.id)} className="rounded-xl border px-2 py-3" style={{borderColor:'#2E3848'}}>Voir souvenir</button>
            <button onClick={()=>nav('/handunia/map?fragment='+f.id)} className="rounded-xl border px-2 py-3" style={{borderColor:'#2E3848'}}>Voix sur carte</button>
          </div>
        </div>
      </article>;})}
    </div>
  </div>;
}

function HanduniaPublish() {
  const user=useUser(); const nav=useNavigate();
  const [lieux,setLieux]=useState<Lieu[]>([]); const [lieu,setLieu]=useState(''); const [text,setText]=useState('');
  const [period,setPeriod]=useState(''); const [scope,setScope]=useState('community'); const [busy,setBusy]=useState(false);
  const [recording,setRecording]=useState(false); const [blob,setBlob]=useState<Blob|null>(null);
  const rec=useRef<MediaRecorder|null>(null); const chunks=useRef<Blob[]>([]);
  useEffect(()=>{supabase.from('handunia_lieux').select('id,name,commune,village_quartier').order('sort_order').then(({data})=>{const a=(data??[]) as any;setLieux(a);if(a[0])setLieu(a[0].id);});},[]);
  const toggle=async()=>{if(recording){rec.current?.stop();setRecording(false);return;} const stream=await navigator.mediaDevices.getUserMedia({audio:true}); chunks.current=[]; const r=new MediaRecorder(stream); rec.current=r;r.ondataavailable=e=>{if(e.data.size)chunks.current.push(e.data)};r.onstop=()=>{setBlob(new Blob(chunks.current,{type:r.mimeType||'audio/webm'}));stream.getTracks().forEach(t=>t.stop());};r.start();setRecording(true);};
  const submit=async()=>{if(!user){nav('/auth');return;} if(!lieu||(!text.trim()&&!blob))return; setBusy(true); try{
    let audio_url:string|null=null;
    if(blob){const ext=blob.type.includes('ogg')?'ogg':'webm'; const path=`handunia/${user.id}/${Date.now()}.${ext}`; const up=await supabase.storage.from('tamtam-audio').upload(path,blob,{contentType:blob.type,upsert:false}); if(up.error)throw up.error; audio_url=supabase.storage.from('tamtam-audio').getPublicUrl(path).data.publicUrl;}
    const ins=await supabase.from('handunia_fragments').insert({user_id:user.id,lieu_id:lieu,text:text.trim()||'Souvenir vocal',transcript_text:text.trim()||null,audio_url,period_label:period.trim()||null,scope_level:scope,language_code:'ba',ai_generated:false,ai_assisted:false});
    if(ins.error)throw ins.error; nav('/social/handunia');
  }catch(e:any){alert(e?.message||'Publication impossible');}finally{setBusy(false);}};
  if(user===null)return <LoginRequired/>;
  return <Shell dark><BackTitle dark title="Publier un souvenir" subtitle="Collecter → lieu → préciser → vérifier"/>
    <div className="space-y-4">
      <button onClick={toggle} className="flex w-full items-center justify-center gap-3 rounded-[28px] border py-8 text-lg font-black" style={{borderColor:'#2E3848',background:recording?'#4A2020':C.night2,color:C.ember}}><Mic/>{recording?'Arrêter la voix':'Tisser par la voix'}</button>
      {blob&&<audio controls className="w-full" src={URL.createObjectURL(blob)}/>}
      <textarea value={text} onChange={e=>setText(e.target.value)} placeholder="Ou écrire le souvenir…" className="min-h-36 w-full rounded-3xl border bg-transparent p-4 outline-none" style={{borderColor:'#2E3848'}}/>
      <select value={lieu} onChange={e=>setLieu(e.target.value)} className="w-full rounded-2xl border p-4 text-black" style={{borderColor:'#2E3848'}}>{lieux.map(l=><option key={l.id} value={l.id}>{l.village_quartier||l.name}{l.commune?' · '+l.commune:''}</option>)}</select>
      <input value={period} onChange={e=>setPeriod(e.target.value)} placeholder="Période — ex. Avant 1960" className="w-full rounded-2xl border bg-transparent p-4 outline-none" style={{borderColor:'#2E3848'}}/>
      <select value={scope} onChange={e=>setScope(e.target.value)} className="w-full rounded-2xl border p-4 text-black"><option value="community">Communauté</option><option value="lineage">Lignée</option><option value="elders">Anciens</option><option value="all">Tous</option></select>
      <button disabled={busy} onClick={submit} className="w-full rounded-full py-4 text-lg font-black disabled:opacity-50" style={{background:C.ember,color:'#20170B'}}>{busy?'Publication…':'Publier le souvenir'}</button>
    </div>
  </Shell>;
}

function HanduniaMemory() {
  const {id}=useParams(); const user=useUser(); const nav=useNavigate();
  const [item,setItem]=useState<any>(null); const [lieu,setLieu]=useState<any>(null); const [loading,setLoading]=useState(true);
  const [corroborations,setCorroborations]=useState(0); const [editing,setEditing]=useState(false); const [editText,setEditText]=useState('');
  const [nuance,setNuance]=useState(''); const [busy,setBusy]=useState(false);

  const load=async()=>{
    if(!id)return;
    setLoading(true);
    const {data}=await supabase.from('handunia_fragments').select('*').eq('id',id).maybeSingle();
    setItem(data); setEditText((data?.transcript_text||data?.text||'').trim());
    if(data?.lieu_id){const l=await supabase.from('handunia_lieux').select('*').eq('id',data.lieu_id).maybeSingle();setLieu(l.data);}
    const co=await supabase.from('handunia_corroborations').select('fragment_id',{count:'exact',head:true}).eq('fragment_id',id);
    setCorroborations(co.count??0); setLoading(false);
  };
  useEffect(()=>{load();},[id]);

  const corroborate=async()=>{
    if(!user){nav('/auth');return;} if(!id)return; setBusy(true);
    const {error}=await supabase.from('handunia_corroborations').insert({fragment_id:id,user_id:user.id});
    setBusy(false); if(error&&!String(error.message).toLowerCase().includes('duplicate')){alert(error.message);return;} load();
  };
  const saveEdit=async()=>{
    if(!item||!user||item.user_id!==user.id||!editText.trim())return; setBusy(true);
    const {error}=await supabase.from('handunia_fragments').update({text:editText.trim(),transcript_text:editText.trim()}).eq('id',item.id).eq('user_id',user.id);
    setBusy(false); if(error){alert(error.message);return;} setEditing(false); load();
  };
  const withdraw=async()=>{
    if(!item||!user||item.user_id!==user.id)return; if(!confirm('Retirer ce souvenir du fil ?'))return;
    const {error}=await supabase.from('handunia_fragments').update({withdrawn_at:new Date().toISOString()}).eq('id',item.id).eq('user_id',user.id);
    if(error){alert(error.message);return;} nav('/social/handunia');
  };
  const addNuance=async()=>{
    if(!item||!nuance.trim())return; if(!user){nav('/auth');return;} setBusy(true);
    const {error}=await supabase.from('handunia_fragments').insert({user_id:user.id,lieu_id:item.lieu_id,text:nuance.trim(),transcript_text:nuance.trim(),scope_level:item.scope_level||'community',period_label:item.period_label,source_fragment_id:item.id,language_code:item.language_code||'ba',ai_generated:false,ai_assisted:false});
    setBusy(false); if(error){alert(error.message);return;} setNuance(''); alert('Nuance ajoutée à la mémoire.');
  };

  return <Shell dark><BackTitle dark title="Souvenir" subtitle={lieu?.name||'Handunia Wasa'}/>{loading?<div>Chargement…</div>:!item?<div>Souvenir indisponible.</div>:<div className="space-y-5">
    {item.audio_url&&<audio controls className="w-full" src={item.audio_url}/>}
    <div className="rounded-3xl border p-5" style={{borderColor:'#2E3848',background:C.night2}}>
      {editing?<textarea value={editText} onChange={e=>setEditText(e.target.value)} className="min-h-32 w-full rounded-2xl border bg-transparent p-3 outline-none" style={{borderColor:'#2E3848'}}/>:<p className="text-xl leading-relaxed">“{item.transcript_text||item.text}”</p>}
    </div>
    <div className="grid grid-cols-2 gap-3 text-sm"><div className="rounded-2xl border p-4" style={{borderColor:'#2E3848'}}>📍 {lieu?.name||item.lieu_id}</div><div className="rounded-2xl border p-4" style={{borderColor:'#2E3848'}}>🕰 {item.period_label||'Période non précisée'}</div></div>
    <div className="grid grid-cols-2 gap-3">
      <button disabled={busy} onClick={corroborate} className="rounded-2xl border p-4 font-bold" style={{borderColor:'#2E3848'}}>✓ Corroborer · {corroborations}</button>
      <button onClick={()=>nav('/handunia/ask?lieu='+encodeURIComponent(item.lieu_id))} className="rounded-2xl border p-4 font-bold" style={{borderColor:'#2E3848'}}>✨ Demander à la mémoire</button>
    </div>
    <div className="rounded-3xl border p-5" style={{borderColor:'#2E3848',background:C.night2}}>
      <h3 className="font-black">Ajouter une nuance</h3><textarea value={nuance} onChange={e=>setNuance(e.target.value)} placeholder="Une autre version ou précision…" className="mt-3 min-h-24 w-full rounded-2xl border bg-transparent p-3 outline-none" style={{borderColor:'#2E3848'}}/><button disabled={busy||!nuance.trim()} onClick={addNuance} className="mt-3 rounded-full px-5 py-2 font-black disabled:opacity-50" style={{background:C.ember,color:'#20170B'}}>Publier la nuance</button>
    </div>
    {user&&item.user_id===user.id&&<div className="flex gap-2">{editing?<><button onClick={saveEdit} className="flex-1 rounded-full py-3 font-black" style={{background:C.ember,color:'#20170B'}}>Enregistrer</button><button onClick={()=>setEditing(false)} className="rounded-full border px-5" style={{borderColor:'#2E3848'}}>Annuler</button></>:<button onClick={()=>setEditing(true)} className="flex-1 rounded-full border py-3 font-bold" style={{borderColor:'#2E3848'}}>Modifier mon souvenir</button>}<button onClick={withdraw} className="rounded-full border border-red-500/40 px-5 text-red-300"><Trash2/></button></div>}
  </div>}</Shell>;
}

function HanduniaAsk() {
  const user=useUser(); const [q,setQ]=useState(''); const [answer,setAnswer]=useState<any>(null); const [busy,setBusy]=useState(false);
  const params=new URLSearchParams(useLocation().search); const lieu=params.get('lieu')||undefined;
  const ask=async()=>{if(!q.trim())return;setBusy(true);const {data,error}=await supabase.functions.invoke('handunia-memory-query',{body:{question:q.trim(),lieu_id:lieu}});setAnswer(error?{state:'unavailable',answer:error.message}:data);setBusy(false);};
  if(user===null)return <Shell dark><LoginRequired/></Shell>;
  return <Shell dark><BackTitle dark title="Demander à la mémoire" subtitle="Réponses sourcées — sans invention"/>
    <div className="flex gap-2"><input value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>e.key==='Enter'&&ask()} placeholder="Comment ? Quand ? Qui ?" className="flex-1 rounded-2xl border bg-transparent p-4 outline-none" style={{borderColor:'#2E3848'}}/><button onClick={ask} disabled={busy} className="rounded-2xl px-5" style={{background:C.ember,color:'#20170B'}}><Send/></button></div>
    {answer&&<div className="mt-5 rounded-3xl border p-5" style={{borderColor:'#2E3848',background:C.night2}}><p className="text-lg leading-relaxed">{answer.answer||answer.message||'La communauté ne l’a pas encore raconté.'}</p>{Array.isArray(answer.sources)&&answer.sources.length>0&&<div className="mt-4 space-y-2 text-sm" style={{color:'#AAB2C0'}}>{answer.sources.map((s:any)=><div key={s.id}>[{s.index}] {s.witness} · {s.year} · {s.place}</div>)}</div>}</div>}
  </Shell>;
}

function HanduniaMap() {
  const [lieux,setLieux]=useState<Lieu[]>([]); const [q,setQ]=useState('');
  useEffect(()=>{supabase.from('handunia_lieux').select('id,name,commune,village_quartier,latitude,longitude').order('sort_order').then(({data})=>setLieux((data??[]) as any));},[]);
  const visible=useMemo(()=>lieux.filter(l=>(l.name+' '+(l.commune||'')+' '+(l.village_quartier||'')).toLowerCase().includes(q.toLowerCase())),[lieux,q]);
  return <Shell dark><BackTitle dark title="Carte vivante" subtitle="Quartiers → villages → communes → villes"/>
    <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Rechercher un lieu…" className="mb-4 w-full rounded-2xl border bg-transparent p-4 outline-none" style={{borderColor:'#2E3848'}}/>
    <div className="grid gap-3 sm:grid-cols-2">{visible.map(l=><a key={l.id} href={l.latitude&&l.longitude?`https://www.openstreetmap.org/?mlat=${l.latitude}&mlon=${l.longitude}#map=14/${l.latitude}/${l.longitude}`:'#'} target="_blank" rel="noreferrer" className="rounded-2xl border p-4" style={{borderColor:'#2E3848',background:C.night2}}><div className="font-black">{l.village_quartier||l.name}</div><div className="mt-1 text-xs" style={{color:'#AAB2C0'}}>{l.commune||'Bénin'} · {l.name}</div></a>)}</div>
  </Shell>;
}

type Challenge={id:string;title?:string;challenge_type?:string;prompt_bariba?:string;prompt_francais?:string;created_by?:string;status?:string;created_at?:string};
function SagesseBattle({embedded=false}:{embedded?:boolean}) {
  const user=useUser(); const nav=useNavigate(); const location=useLocation();
  const [tab,setTab]=useState<'community'|'mine'|'create'>(()=>location.pathname.startsWith('/creator/sagesse-battle')?'create':'community'); const [items,setItems]=useState<Challenge[]>([]);
  const [title,setTitle]=useState(''); const [prompt,setPrompt]=useState(''); const [fr,setFr]=useState(''); const [type,setType]=useState('complete_proverb'); const [busy,setBusy]=useState(false);
  const [response,setResponse]=useState(''); const [responses,setResponses]=useState<any[]>([]);
  const detailId=location.pathname.startsWith('/sagesse-battle/') ? decodeURIComponent(location.pathname.slice('/sagesse-battle/'.length)) : '';
  const selected=detailId?items.find(x=>String(x.id)===detailId):undefined;

  const load=async()=>{
    const sys=await supabase.from('battle_challenges').select('id,prompt_ba,prompt_fr,proverb_ba,proverb_fr,created_at').eq('is_active',true);
    const usr=await supabase.from('battle_user_challenges').select('*').order('created_at',{ascending:false});
    const a:any[]=[];
    (sys.data??[]).forEach((x:any)=>a.push({id:x.id,title:'Défi FITILA',challenge_type:'system',prompt_bariba:x.prompt_ba||x.proverb_ba,prompt_francais:x.prompt_fr||x.proverb_fr}));
    (usr.data??[]).forEach((x:any)=>a.push(x));
    setItems(a);
  };
  useEffect(()=>{load();},[]);
  useEffect(()=>{ if(location.pathname.startsWith('/creator/sagesse-battle')) setTab('create'); },[location.pathname]);
  useEffect(()=>{if(!detailId){setResponses([]);return;} supabase.from('battle_responses').select('*').eq('challenge_id',detailId).order('created_at',{ascending:false}).then(({data})=>setResponses((data??[]) as any));},[detailId]);

  const create=async()=>{
    if(!user){nav('/auth');return;} if(!title.trim()||!prompt.trim())return;
    setBusy(true);
    const {error}=await supabase.from('battle_user_challenges').insert({created_by:user.id,title:title.trim(),challenge_type:type,prompt_bariba:prompt.trim(),prompt_francais:fr.trim(),status:'published',moderation_status:'approved',visibility:'public',published_at:new Date().toISOString()});
    setBusy(false); if(error){alert(error.message);return;}
    setTitle('');setPrompt('');setFr('');setTab('community');load();
  };

  const answer=async()=>{
    if(!selected||!response.trim())return;
    if(!user){nav('/auth');return;}
    setBusy(true);
    const {error}=await supabase.from('battle_responses').insert({
      user_id:user.id,
      challenge_id:String(selected.id),
      prompt_bariba:selected.prompt_bariba||'',
      prompt_francais:selected.prompt_francais||'',
      answer_text:response.trim(),
      response_text:response.trim(),
      response_lang:'bariba',
      score:0,
      xp_awarded:0,
      scoring_method:'local'
    });
    setBusy(false);
    if(error){alert(error.message);return;}
    setResponse('');
    const r=await supabase.from('battle_responses').select('*').eq('challenge_id',String(selected.id)).order('created_at',{ascending:false});
    setResponses((r.data??[]) as any);
  };

  const removeChallenge=async()=>{
    if(!selected||!user||selected.created_by!==user.id)return;
    if(!confirm('Supprimer ce défi ?'))return;
    const {error}=await supabase.from('battle_user_challenges').delete().eq('id',selected.id);
    if(error){alert(error.message);return;}
    nav('/social/sagesse-battle'); load();
  };

  if(detailId){
    return <div>
      {!embedded&&<BackTitle title="Sagesse Battle" subtitle="Répondre au défi"/>}
      {!selected?<div className="rounded-3xl border bg-white p-6" style={{borderColor:C.border}}>Chargement du défi…</div>:<>
        <div className="rounded-3xl border bg-white p-6" style={{borderColor:C.border}}>
          <div className="text-xs font-black uppercase" style={{color:C.gold2}}>{selected.challenge_type==='interpret_proverb'?'Interpréter':'Compléter'}</div>
          <h2 className="mt-2 text-2xl font-black">{selected.title||'Défi FITILA'}</h2>
          <p className="mt-4 text-xl">{selected.prompt_bariba}</p>
          {selected.prompt_francais&&<p className="mt-2 text-sm" style={{color:C.muted}}>{selected.prompt_francais}</p>}
          {user&&selected.created_by===user.id&&<button onClick={removeChallenge} className="mt-4 flex items-center gap-2 rounded-full border border-red-200 px-4 py-2 text-sm font-bold text-red-600"><Trash2 className="h-4 w-4"/>Supprimer mon défi</button>}
        </div>
        <div className="mt-4 rounded-3xl border bg-white p-5" style={{borderColor:C.border}}>
          <textarea value={response} onChange={e=>setResponse(e.target.value)} placeholder="Ta réponse en Bàátɔ̀nú…" className="min-h-28 w-full rounded-2xl border p-3 outline-none"/>
          <button disabled={busy||!response.trim()} onClick={answer} className="mt-3 w-full rounded-full py-3 font-black disabled:opacity-50" style={{background:C.gold}}>{busy?'Envoi…':'Publier ma réponse'}</button>
        </div>
        <div className="mt-5 space-y-3"><h3 className="text-lg font-black">{responses.length} réponse{responses.length>1?'s':''}</h3>{responses.map(r=><div key={r.id} className="rounded-2xl border bg-white p-4" style={{borderColor:C.border}}><p>{r.response_text||r.answer_text}</p><div className="mt-2 text-xs" style={{color:C.muted}}>Score {r.ai_score??r.local_score??r.score??0} · {r.votes_count??0} vote(s)</div></div>)}</div>
      </>}
    </div>;
  }

  const shown=tab==='mine'&&user?items.filter(x=>x.created_by===user.id):items;
  return <div>
    {!embedded&&<BackTitle title="Sagesse Battle" subtitle="Défis système et défis de la communauté"/>}
    <div className="mb-4 grid grid-cols-3 gap-2">{[['community','Communauté'],['mine','Mes défis'],['create','Créer']].map(([k,l])=><button key={k} onClick={()=>setTab(k as any)} className="rounded-full border px-3 py-2 text-sm font-bold" style={{borderColor:C.border,background:tab===k?C.gold:'#fff'}}>{l}</button>)}</div>
    {tab==='create'?<div className="space-y-3 rounded-3xl border bg-white p-5" style={{borderColor:C.border}}><input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Titre du défi" className="w-full rounded-2xl border p-3"/><select value={type} onChange={e=>setType(e.target.value)} className="w-full rounded-2xl border p-3"><option value="complete_proverb">Compléter</option><option value="interpret_proverb">Interpréter</option></select><textarea value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder="Défi en Bàátɔ̀nú" className="min-h-28 w-full rounded-2xl border p-3"/><textarea value={fr} onChange={e=>setFr(e.target.value)} placeholder="Repère en français" className="min-h-20 w-full rounded-2xl border p-3"/><button disabled={busy} onClick={create} className="w-full rounded-full py-3 font-black" style={{background:C.gold}}>{busy?'Publication…':'Publier le défi'}</button></div>:<div className="space-y-3">{shown.map(c=><div key={c.id} className="rounded-3xl border bg-white p-5" style={{borderColor:C.border}}><div className="mb-2 text-xs font-black uppercase" style={{color:C.gold2}}>{c.challenge_type==='interpret_proverb'?'Interpréter':'Compléter'}</div><h3 className="text-xl font-black">{c.title||'Défi FITILA'}</h3><p className="mt-3 text-lg">{c.prompt_bariba}</p>{c.prompt_francais&&<p className="mt-1 text-sm" style={{color:C.muted}}>{c.prompt_francais}</p>}<button onClick={()=>nav('/sagesse-battle/'+c.id)} className="mt-4 rounded-full border px-4 py-2 text-sm font-bold" style={{borderColor:C.border}}>Répondre <ChevronRight className="inline h-4 w-4"/></button></div>)}</div>}
  </div>;
}

export function FitilaSocialCanonical() {
  const loc=useLocation(); const nav=useNavigate(); const isSagesse=loc.pathname.includes('sagesse-battle');
  return <Shell dark={!isSagesse}><div className="mb-4 grid grid-cols-2 gap-2"><button onClick={()=>nav('/social/handunia')} className="rounded-full px-4 py-3 font-black" style={{background:!isSagesse?'#4A3B78':C.night2,color:'#fff'}}>🌌 Handunia Wasa</button><button onClick={()=>nav('/social/sagesse-battle')} className="rounded-full px-4 py-3 font-black" style={{background:isSagesse?C.gold:C.night2,color:isSagesse?'#2B2110':'#fff'}}>⚔️ Sagesse Battle</button></div>{isSagesse?<SagesseBattle embedded/>:<HanduniaFeed embedded/>}</Shell>;
}

export function FitilaCreatorCanonical() {
  const nav=useNavigate();
  const actions=[
    {to:'/creator/handunia',icon:BookOpen,title:'Handunia Wasa',desc:'Publier un souvenir dans la mémoire vivante.'},
    {to:'/creator/sagesse-battle',icon:Brain,title:'Sagesse Battle',desc:'Répondre au défi du jour et rejoindre la chaîne.'},
  ];
  return <div className="relative h-full overflow-y-auto" style={{background:'#F7F5EC',color:C.ink}}>
    <header className="flex items-center gap-3 pl-[74px] pr-5 pt-[14px]">
      <div className="min-w-0"><h1 className="text-[26px] font-semibold leading-none" style={{fontFamily:'Fraunces, ui-serif, serif'}}>Créer</h1><p className="mt-1 text-[11px] font-bold" style={{color:'#8C8571'}}>Deux actions, rien de plus.</p></div>
    </header>
    <div className="mt-[34px] space-y-[13px] px-5">
      {actions.map(({to,icon:Icon,title,desc})=><button key={to} onClick={()=>nav(to)} className="flex w-full items-center gap-4 rounded-[24px] border bg-white p-[18px] text-left shadow-[0_3px_0_0_rgba(228,223,204,.7)] active:scale-[0.99]" style={{borderColor:C.border}}>
        <span className="flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-[16px]" style={{background:'#F3E3B9',color:'#9C6B1D'}}><Icon className="h-6 w-6"/></span>
        <span className="min-w-0 flex-1"><span className="block text-[16px] font-extrabold">{title}</span><span className="mt-0.5 block text-[11.5px] font-bold leading-snug" style={{color:'#8C8571'}}>{desc}</span></span>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{background:'#F1EDDF',color:'#9C6B1D'}}><ArrowRight className="h-[18px] w-[18px]"/></span>
      </button>)}
    </div>
    <p className="absolute inset-x-0 bottom-[10px] text-center text-[11px] font-bold" style={{color:'#8C8571'}}>Le bouton + ouvre toujours ces deux choix.</p>
  </div>;
}

export function HanduniaCanonicalPage() {
  const p=useLocation().pathname;
  if(p.startsWith('/creator/handunia')) return <HanduniaPublish/>;
  if(p.startsWith('/handunia/memory/')) return <HanduniaMemory/>;
  if(p.startsWith('/handunia/map')) return <HanduniaMap/>;
  if(p.startsWith('/handunia/ask')) return <HanduniaAsk/>;
  return <Shell dark><HanduniaFeed/></Shell>;
}

export function SagesseCanonicalPage() {
  return <Shell><SagesseBattle/></Shell>;
}
