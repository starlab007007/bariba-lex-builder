import React, { useEffect, useState } from 'react';
import { Download, Smartphone } from 'lucide-react';

type ReleaseInfo = { version: string; build: number; published_at: string; apk: string; bytes?: number };
export default function InstallPage() {
  const [info, setInfo] = useState<ReleaseInfo | null>(null);
  useEffect(() => {
    fetch('/downloads/version.json', { cache: 'no-store' })
      .then(r => { if (!r.ok) throw Error('No public APK'); return r.json(); })
      .then((v: ReleaseInfo) => { if (v.version && v.apk?.startsWith('/downloads/')) setInfo(v); })
      .catch(() => setInfo(null));
  }, []);
  const date = info ? new Intl.DateTimeFormat('fr-BJ', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Porto-Novo' }).format(new Date(info.published_at)) : null;
  return <main className="min-h-[80vh] flex items-center justify-center px-4 py-12 bg-[#F9F7F0]">
    <div className="w-full max-w-md rounded-3xl bg-white p-7 shadow-sm text-center space-y-5 border border-[#E7E0D2]">
      <Smartphone className="mx-auto h-12 w-12 text-[#A46A22]" />
      <h1 className="text-2xl font-bold text-[#241F2E]">Installer FITILA</h1>
      {info ? <>
        <p className="text-sm text-[#514C45]">Android · Version {info.version} (build {info.build})</p>
        <p className="text-sm text-[#514C45]">Publié le {date} · heure du Bénin</p>
        <a href={info.apk} download className="flex w-full justify-center gap-2 rounded-full bg-[#C99530] px-5 py-4 font-bold text-[#241F2E]">
          <Download className="h-5 w-5" /> Télécharger l’APK
        </a>
      </> : <p className="text-sm text-[#514C45]">La version Android n’est pas encore disponible au téléchargement.</p>}
    </div>
  </main>;
}
