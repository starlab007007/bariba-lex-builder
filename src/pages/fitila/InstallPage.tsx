import { useEffect, useState } from 'react';
import { Download, Smartphone, WifiOff, MessageCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import FitilaPageHeader from '@/components/fitila/FitilaPageHeader';
import { FitilaPage } from '@/components/fitila/FitilaUi';
import { useFitilaLanguage } from '@/contexts/FitilaLanguageContext';
import { availableApk, latestAndroidRelease, saveAndroidApk, type AndroidRelease } from '@/lib/androidRelease';

// Baatɔnum labels reuse the published FITILA catalogue (Télécharger, Conversation,
// Assistant IA, Hors ligne, Apprendre, Traduire, Vérifier, Réessayer).
const copy = {
 fr: {
  title: 'Télécharger FITILA', subtitle: 'Votre application Android', heading: 'FITILA sur Android',
  intro: 'Apprenez le bariba, traduisez et échangez avec DUNYA IA sur votre téléphone.',
  ai: 'Une IA qui parle bariba', chat: 'Discutez avec DUNYA IA en bariba, par texte ou par la voix.',
  offline: 'L’IA, même sans Internet', offlineText: 'Téléchargez d’abord les packs nécessaires avec Internet. Puis utilisez les fonctions locales et discutez avec l’IA hors ligne, selon les packs installés et les capacités du téléphone.',
  features: ['Apprendre', 'Traduire', 'Discuter avec l’IA'], loading: 'Vérification de l’application…',
  checking: 'Vérification du fichier…', download: 'Télécharger FITILA pour Android', legacy: 'Anciens téléphones Android',
  official: 'APK officiel FITILA', version: 'Version', unavailable: 'Le fichier Android officiel est momentanément indisponible.',
  retry: 'Réessayer', error: 'Téléchargement indisponible. Réessayez.', instructions: 'Ouvrez le fichier APK téléchargé et suivez les instructions Android.',
 },
 ba: {
  title: 'Sinasiabu · FITILA', subtitle: 'Android', heading: 'FITILA · Android',
  intro: 'Mɛɛribu · Tùnkɔ̀rù · Faagi · DUNYA IA · Bàátɔ̀nú.',
  ai: 'Bàátɔ̀nú nɔɔ dɛɛmɛ', chat: 'Faagi · DUNYA IA · Bàátɔ̀nú.',
  offline: 'Dɛɛmɛ IA · Nɛɛti kɛra', offlineText: 'DUNYA IA · Sinasiabu → Nɛɛti kɛra → Faagi.',
  features: ['Mɛɛribu', 'Tùnkɔ̀rù', 'Faagi · IA'], loading: 'Gɑ nɑɑmɔ…', checking: 'Dɔ̃ɔbu…',
  download: 'Sinasiabu · FITILA Android', legacy: 'Android · ARMv7', official: 'FITILA · Android', version: 'FITILA',
  unavailable: 'Kɑsɔru · Sinasiabu', retry: 'Ko wiru', error: 'Kɑsɔru · Ko wiru', instructions: 'APK → Sia → Android.',
 },
};
export default function InstallPage() {
 const { currentLang } = useFitilaLanguage();
 const c = copy[currentLang];
 const [release, setRelease] = useState<AndroidRelease | null>(null);
 const [state, setState] = useState<'loading' | 'ready' | 'unavailable'>('loading');
 const [checking, setChecking] = useState(false);
 const [error, setError] = useState(false);
 const [attempt, setAttempt] = useState(0);
 useEffect(() => {
  let active = true;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  setState('loading');
  latestAndroidRelease(controller.signal).then(value => {if (active) {setRelease(value); setState('ready');}})
   .catch(() => {if (active) setState('unavailable');})
   .finally(() => clearTimeout(timeout));
  return () => {active = false; clearTimeout(timeout); controller.abort();};
 }, [attempt]);
 const download = async (legacy = false) => {
  if (checking) return;
  setChecking(true); setError(false);
  try {
   // Resolve again at click time: every future production version is picked up automatically.
   const latest = await latestAndroidRelease(AbortSignal.timeout(20000));
   const url = legacy ? latest.armv7 : latest.arm64;
   if (!url || !(await availableApk(url, AbortSignal.timeout(10000)))) throw new Error('unavailable');
   setRelease(latest);
   saveAndroidApk(url);
  } catch {setError(true);}
  finally {setChecking(false);}
 };
 return <FitilaPage><div data-i18n-preserve lang={currentLang === 'ba' ? 'bba' : 'fr'}>
  <FitilaPageHeader title={c.title} subtitle={c.subtitle}/>
  <main className="mx-auto max-w-xl space-y-4 px-4 pb-12 pt-6">
   <section className="rounded-[30px] border border-[#E8DDC5] bg-white px-5 py-7 text-center shadow-sm">
    <img src="/fitila-launcher-logo.svg" alt="FITILA" className="mx-auto h-24 w-24 object-contain"/>
    <h1 className="mt-4 text-3xl font-black tracking-tight text-[#241F2E]">{c.heading}</h1>
    <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-[#776F5B]">{c.intro}</p>
    <div className="mt-5 grid grid-cols-3 gap-2">{c.features.map((label, i) => {
     const Icon = [Smartphone, WifiOff, MessageCircle][i];
     return <div key={label} className="flex flex-col items-center gap-2 rounded-2xl bg-[#F8F5EC] px-2 py-3"><Icon className="h-5 w-5 text-[#B58220]"/><span className="text-xs font-bold text-[#504333]">{label}</span></div>;
    })}</div>
    <div className="mt-6 space-y-3">
     {state === 'loading' ? <p role="status"><RefreshCw className="mr-2 inline h-4 w-4 animate-spin"/>{c.loading}</p> :
      state === 'ready' && release ? <>
       <button type="button" onClick={() => void download()} disabled={checking} className="flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl bg-[#C99530] px-4 font-extrabold text-[#241F2E] shadow-md disabled:opacity-60"><Download className="h-5 w-5"/>{checking ? c.checking : c.download}</button>
       {release.armv7 && <button type="button" disabled={checking} onClick={() => void download(true)} className="w-full rounded-xl border border-[#E4DFCC] px-3 py-3 text-sm font-semibold text-[#65512E]">{c.legacy}</button>}
       <p className="text-xs text-[#756F61]"><CheckCircle2 className="mr-1 inline h-4 w-4"/>{c.official} · {c.version} {release.version}{release.build_number ? ` · ${release.build_number}` : ''}</p>
      </> : <><p role="status">{c.unavailable}</p><button type="button" onClick={() => setAttempt(value => value + 1)}>{c.retry}</button></>}
     {error && <p role="alert" className="text-sm text-red-700">{c.error}</p>}
    </div>
   </section>
   <section className="space-y-4 rounded-3xl bg-[#F8F5EC] p-5 text-[#504333]">
    <div><h2 className="flex items-center gap-2 font-bold"><MessageCircle className="h-5 w-5"/>{c.ai}</h2><p className="mt-1 text-sm leading-relaxed">{c.chat}</p></div>
    <div><h2 className="flex items-center gap-2 font-bold"><WifiOff className="h-5 w-5"/>{c.offline}</h2><p className="mt-1 text-sm leading-relaxed">{c.offlineText}</p></div>
   </section>
   <p className="text-center text-xs leading-relaxed text-[#817968]">{c.instructions}</p>
  </main>
 </div></FitilaPage>;
}
