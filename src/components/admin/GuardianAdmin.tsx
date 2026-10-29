import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ShieldCheck, RefreshCw, ExternalLink, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Check = { service:string;status:string;checked_at:string;latency_ms:number|null;http_status:number|null;detail:string|null };
type Action = { action:string;service:string;created_at:string;detail:string|null };
const labels: Record<string,string> = {
 web:'FITILA Web', supabase_gateway:'Supabase — passerelle',
 auth_gateway:'Authentification', dunya_voice:'DUNYA — endpoint vocal',
 bariba_tts:'Synthèse bariba', bariba_stt:'Transcription bariba',
};
export default function GuardianAdmin() {
 const {isAdmin}=useAuth();
 const [checks,setChecks]=useState<Check[]>([]);
 const [actions,setActions]=useState<Action[]>([]);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState<string|null>(null);
 const invoke=useCallback(async(action:string,service?:string)=>{
  const {data,error}=await supabase.functions.invoke('fitila-guardian-admin',{body:{action,service}});
  if(error){
   const msg=error.message||'Erreur réseau';
   throw new Error(/Failed to send a request|Failed to fetch|fetch failed/i.test(msg)
     ? 'Connexion à GUARDIAN impossible. Actualisez la page puis réessayez ; si le problème persiste, vérifiez la session administrateur et les journaux Supabase.'
     : msg);
  }
  if(data?.error)throw new Error(data.error);
  return data;
 },[]);
 const refresh=useCallback(async()=>{try{const data=await invoke('status');setChecks(data.checks||[]);setActions(data.actions||[]);setError(null);}catch(e){setError(e instanceof Error?e.message:'Lecture impossible');}},[invoke]);
 useEffect(()=>{if(isAdmin)void refresh();},[isAdmin,refresh]);
 const run=async(action:string,service?:string)=>{setBusy(true);setError(null);try{await invoke(action,service);await refresh();}catch(e){setError(e instanceof Error?e.message:'Action impossible')}finally{setBusy(false)}};
 if(!isAdmin)return <p className="rounded-xl border p-5">Accès réservé aux administrateurs.</p>;
 const latest=Object.values(checks.reduce<Record<string,Check>>((acc,c)=>{if(!acc[c.service])acc[c.service]=c;return acc;},{}));
 return <section className="space-y-5">
  <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border bg-white p-5">
    <div><h2 className="flex items-center gap-2 text-xl font-extrabold"><ShieldCheck/> FITILA GUARDIAN</h2><p className="text-sm text-muted-foreground">Sondes réelles, résultats horodatés et journal d'intervention. Une réponse HTTP ne certifie pas l'inférence IA.</p></div>
    <div className="flex gap-2"><Button disabled={busy} variant="outline" onClick={()=>void refresh()}><RefreshCw className="mr-2 h-4 w-4"/>Actualiser</Button><Button disabled={busy} onClick={()=>void run('probe')}>Lancer les contrôles</Button></div>
  </div>
  {error&&<div role="alert" className="flex gap-2 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-800"><AlertCircle className="h-4 w-4"/>{error}</div>}
  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
   {Object.entries(labels).map(([id,label])=>{
    const c=latest.find(v=>v.service===id);
    return <article key={id} className="space-y-3 rounded-2xl border bg-white p-4">
      <div className="flex justify-between gap-2"><h3 className="font-bold">{label}</h3><span className={'rounded-full px-2 py-1 text-xs font-bold '+(c?.status==='healthy'?'bg-green-100 text-green-800':c?.status==='unavailable'?'bg-red-100 text-red-800':'bg-amber-100 text-amber-900')}>{c?.status==='healthy'?'Accessible':c?.status==='unavailable'?'Indisponible':c?'Vérification partielle':'Non mesuré'}</span></div>
      <p className="text-xs text-muted-foreground">{c?.detail||'Aucune sonde encore enregistrée'}</p>
      <p className="text-xs">Dernier contrôle : {c?new Date(c.checked_at).toLocaleString('fr-FR'):'—'}</p>
      <p className="text-xs">HTTP : {c?.http_status??'—'} · Latence : {c?.latency_ms??'—'} ms</p>
      <div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" disabled={busy} onClick={()=>void run('probe',id)}>Vérifier</Button><Button size="sm" variant="ghost" disabled={busy} onClick={()=>void run('acknowledge',id)}>Prendre en charge</Button></div>
    </article>;
   })}
  </div>
  <div className="rounded-2xl border bg-white p-5"><h3 className="font-bold">Journal d'audit</h3><div className="mt-3 space-y-2">{actions.length?actions.map((a,i)=><div key={i} className="border-b py-2 text-sm"><span className="font-semibold">{a.action==='probe'?'Contrôle':'Prise en charge'}</span> · {a.service} · {new Date(a.created_at).toLocaleString('fr-FR')}<p className="text-xs text-muted-foreground">{a.detail}</p></div>):<p className="text-sm text-muted-foreground">Aucune intervention enregistrée.</p>}</div></div>
  <p className="text-xs text-muted-foreground">Sécurité : contrôles et journal exécutés côté serveur après vérification du rôle admin. Aucun redémarrage, redéploiement ni suppression n'est déclenché automatiquement.</p>
  <a className="inline-flex items-center gap-2 text-sm underline" href="https://github.com/starlab007007/bariba-lex-builder/actions/workflows/fitila-guardian-watchdog.yml" target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4"/>Consulter la surveillance GitHub externe</a>
 </section>;
}
