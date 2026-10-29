import { useEffect, useState } from 'react';
import { Download, Smartphone, WifiOff, Zap, CheckCircle2, RefreshCw } from 'lucide-react';
import FitilaPageHeader from '@/components/fitila/FitilaPageHeader';
import { FitilaPage } from '@/components/fitila/FitilaUi';

type Release={version:string;url:string;updated:string;legacy?:string};
const MANIFEST='/dunya-packs/android/releases.json';
const valid=(v:unknown):v is string=>typeof v==='string'&&/^\/dunya-packs\/android\/[a-zA-Z0-9_./-]+\.apk$/i.test(v)&&!v.includes('..');
export default function InstallPage(){
 // Keep the public installation address canonical, even if an external
 // application attaches attribution parameters to an incoming link.
 useEffect(()=>{
  if(window.location.pathname==='/install' && window.location.search)
    window.history.replaceState(window.history.state,'','/install');
 },[]);
 const [release,setRelease]=useState<Release|null>(null);
 const [state,setState]=useState<'loading'|'ready'|'unavailable'>('loading');
 const [error,setError]=useState('');
 const [checking,setChecking]=useState(false);
 useEffect(()=>{
  const controller=new AbortController();
  const load=async()=>{
   try{
    const response=await fetch(MANIFEST+'?v='+Date.now(),{cache:'no-store',signal:controller.signal});
    if(!response.ok)throw new Error('Catalogue APK inaccessible');
    const data=await response.json();
    const releases=(Array.isArray(data?.releases)?data.releases:[])
     .filter((r:any)=>r?.signing==='production'&&valid(r.arm64))
     .sort((a:any,b:any)=>String(b.published_at||'').localeCompare(String(a.published_at||'')));
    // Do not advertise stale releases whose APK is missing from the web server.
    let selected:any=null;
    for(const entry of releases){
      try {
        const probe=await fetch(entry.arm64,{method:'HEAD',cache:'no-store',signal:controller.signal});
        const type=(probe.headers.get('content-type')||'').toLowerCase();
        if(probe.ok && !type.includes('text/html') && !type.includes('application/json')){
          selected=entry;break;
        }
      }catch(e){if(controller.signal.aborted)throw e}
    }
    if(!selected){setState('unavailable');return}
    let legacy: string|undefined;
    if(valid(selected.armv7)){
      try{
        const probe=await fetch(selected.armv7,{method:'HEAD',cache:'no-store',signal:controller.signal});
        if(probe.ok && !(probe.headers.get('content-type')||'').includes('text/html'))legacy=selected.armv7;
      }catch{/* optional device compatibility file */}
    }
    setRelease({version:String(selected.version||''),url:selected.arm64,updated:String(selected.published_at||''),legacy});
    setState('ready');
   }catch(e){if(!controller.signal.aborted){setError('Impossible de vérifier la version Android.');setState('unavailable')}}
  };
  void load();return ()=>controller.abort();
 },[]);
 const download=async(url:string)=>{
  if(checking)return;setChecking(true);setError('');
  try{
   // Check the exact APK URL first, to avoid directing visitors to a 404.
   const response=await fetch(url,{method:'HEAD',cache:'no-store'});
   if(!response.ok)throw new Error('Fichier APK indisponible');
   const mime=response.headers.get('content-type')||'';
   if(mime.includes('text/html'))throw new Error('Le lien ne renvoie pas un APK');
   window.location.assign(url);
  }catch{setError('Le téléchargement est momentanément indisponible. Réessayez plus tard.')}
  finally{setChecking(false)}
 };
 return <FitilaPage>
  <FitilaPageHeader title="Télécharger FITILA" subtitle="Votre application Android" />
  <main className="mx-auto max-w-xl space-y-5 px-4 pb-12 pt-6">
   <section className="rounded-[30px] border border-[#E8DDC5] bg-white px-5 py-7 text-center shadow-sm">
    <img src="/fitila-launcher-logo.svg" alt="FITILA, lanterne orange" className="mx-auto h-24 w-24 rounded-[22px] object-contain" />
    <h1 className="mt-4 text-3xl font-black tracking-tight text-[#241F2E]">FITILA sur Android</h1>
    <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-[#776F5B]">Apprenez le bariba, traduisez et retrouvez vos activités directement sur votre téléphone.</p>
    <div className="mt-5 grid grid-cols-3 gap-2">
      {([{icon:Zap,label:'Rapide'},{icon:WifiOff,label:'Hors connexion'},{icon:Smartphone,label:'Pratique'}] as const).map(({icon:Icon,label})=><div key={label} className="flex flex-col items-center gap-2 rounded-2xl bg-[#F8F5EC] px-2 py-3"><Icon className="h-5 w-5 text-[#B58220]"/><span className="text-xs font-bold text-[#504333]">{label}</span></div>)}
    </div>
    <div className="mt-6 space-y-3">
      {state==='loading'?<p role="status" className="text-sm text-[#766D5A]"><RefreshCw className="mr-2 inline h-4 w-4 animate-spin"/>Vérification de l'application…</p>:
       state==='ready'&&release?<><button type="button" onClick={()=>void download(release.url)} disabled={checking} className="flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl bg-[#C99530] px-4 text-base font-extrabold text-[#241F2E] shadow-md transition hover:bg-[#DBAB4E] disabled:opacity-60">
         <Download className="h-5 w-5"/>{checking?'Vérification du fichier…':'Télécharger FITILA pour Android'}
        </button>
        {release.legacy&&<button type="button" disabled={checking} onClick={()=>void download(release.legacy!)} className="w-full rounded-xl border border-[#E4DFCC] px-3 py-3 text-sm font-semibold text-[#65512E]">Version pour anciens téléphones Android</button>}
        <p className="flex items-center justify-center gap-1.5 text-xs text-[#756F61]"><CheckCircle2 className="h-4 w-4"/>APK officiel FITILA · version {release.version}</p></>:
       <p role="status" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Le fichier Android officiel n'est pas disponible pour le moment.</p>}
      {error&&<p role="alert" className="text-sm font-medium text-red-700">{error}</p>}
    </div>
   </section>
   <p className="text-center text-xs leading-relaxed text-[#817968]">Après téléchargement, ouvrez le fichier APK et suivez les instructions Android. Certaines fonctionnalités hors connexion nécessitent des packs supplémentaires.</p>
  </main>
 </FitilaPage>;
}
