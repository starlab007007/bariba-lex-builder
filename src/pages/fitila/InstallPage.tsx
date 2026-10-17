import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Share2, CheckCircle, Smartphone, AppWindow, Keyboard, RefreshCcw, type LucideIcon } from 'lucide-react';
import FitilaPageHeader from '@/components/fitila/FitilaPageHeader';
import { Chip, ChipWrap, FeatureGrid, FitilaPage, MetricStrip, type Feature } from '@/components/fitila/FitilaUi';

type AndroidRelease = { version: string; url: string; size: number; updated: string; armv7?: string };
const RELEASE_API = 'https://api.github.com/repos/starlab007007/bariba-lex-builder/releases?per_page=30';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPage() {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [apk, setApk] = useState<AndroidRelease | null>(null);
  const [apkHistory, setApkHistory] = useState<AndroidRelease[]>([]);
  const [apkStatus, setApkStatus] = useState<'loading' | 'ready' | 'unavailable'>('loading');

  useEffect(() => {
    const controller = new AbortController();
    fetch(RELEASE_API, { headers: { Accept: 'application/vnd.github+json' }, signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error('No public production release');
        return response.json();
      })
      .then(releases => {
        if (!Array.isArray(releases)) throw new Error('Invalid release list');
        const verified = releases
          .filter(release => !release.draft && !release.prerelease &&
            /^fitila-android-v\\d/.test(String(release.tag_name || '')))
          .map(release => {
            const assets = Array.isArray(release.assets) ? release.assets : [];
            const valid = (a: any) => typeof a.browser_download_url === 'string' &&
              a.browser_download_url.startsWith('https://github.com/starlab007007/bariba-lex-builder/releases/download/');
            const arm64 = assets.find((a: any) => valid(a) && /^FITILA-Android-.*-arm64\\.apk$/i.test(String(a.name)));
            if (!arm64) return null;
            const armv7 = assets.find((a: any) => valid(a) && /^FITILA-Android-.*-armv7\\.apk$/i.test(String(a.name)));
            return { version: String(release.tag_name), url: arm64.browser_download_url,
              size: arm64.size || 0, updated: release.published_at || '',
              armv7: armv7?.browser_download_url } as AndroidRelease;
          })
          .filter((release): release is AndroidRelease => release !== null);
        verified.sort((a, b) => (b.updated || '').localeCompare(a.updated || ''));
        setApk(verified[0] || null);
        setApkHistory(verified.slice(1));
        setApkStatus(verified.length ? 'ready' : 'unavailable');
      })
      .catch(error => { if (error?.name !== 'AbortError') setApkStatus('unavailable'); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    // Detect iOS
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setIsIOS(ios);

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setIsInstalled(true);
    setDeferredPrompt(null);
  };

  const [tab, setTab] = useState('Vue');
  const grid: Feature[] = [
    { icon: AppWindow, title: 'PWA', desc: 'Installer depuis navigateur, écran d’accueil et mode hors ligne.' },
    { icon: Smartphone, title: 'APK Android', desc: 'Préparer build, permissions, stockage, micro et clavier.' },
    { icon: Keyboard, title: 'Clavier natif', desc: 'Activation système, guide pas à pas et test de saisie.', onClick: () => navigate('/keyboard') },
    { icon: RefreshCcw, title: 'Mises à jour', desc: 'Version, migration cache, assets et compatibilité backend.' },
  ];
  const tabs: [string, LucideIcon][] = [['Vue', Download], ['PWA', AppWindow], ['APK', Smartphone], ['Clavier', Keyboard]];

  return (
    <FitilaPage>
      <FitilaPageHeader title="Installer FITILA" subtitle="Installation PWA, APK et clavier" />
      <div className="mt-[18px] space-y-[12px]">
        <MetricStrip metrics={[{ label: 'Etat', value: isInstalled ? 'Installé' : 'Pret' }, { label: 'Sync', value: 'Locale' }, { label: 'Acces', value: 'Mobile' }]} />
        <ChipWrap>
          {tabs.map(([name, icon]) => <Chip key={name} label={name} icon={icon} selected={tab === name} onClick={() => setTab(name)} />)}
        </ChipWrap>

        <div className="px-[18px]">
          <div className="rounded-[18px] border border-[#E4DFCC] bg-white p-4">
            {isInstalled ? (
              <div className="flex items-center gap-3">
                <CheckCircle className="h-8 w-8 shrink-0 text-[#3F6E52]" />
                <div>
                  <p className="text-[14px] font-extrabold text-[#3F6E52]">Déjà installé !</p>
                  <p className="text-[12px] text-[#8C8571]">FITILA est sur ton écran d'accueil.</p>
                </div>
              </div>
            ) : isIOS ? (
              <ol className="space-y-3 text-[13px]">
                <li className="flex items-center gap-3"><Share2 className="h-5 w-5 shrink-0 text-[#9C6B1D]" /><span><strong>1.</strong> Appuie sur <strong>Partager</strong> en bas du navigateur</span></li>
                <li className="flex items-center gap-3"><Download className="h-5 w-5 shrink-0 text-[#9C6B1D]" /><span><strong>2.</strong> Sélectionne <strong>« Sur l'écran d'accueil »</strong></span></li>
                <li className="flex items-center gap-3"><Smartphone className="h-5 w-5 shrink-0 text-[#9C6B1D]" /><span><strong>3.</strong> Appuie sur <strong>« Ajouter »</strong></span></li>
              </ol>
            ) : deferredPrompt ? (
              <button
                type="button"
                onClick={handleInstall}
                className="flex h-[52px] w-full items-center justify-center gap-2 rounded-full bg-[#C99530] text-[15px] font-extrabold text-[#2B2110] active:scale-[0.99]"
              >
                <Download className="h-5 w-5" /> Installer l'application
              </button>
            ) : (
              <p className="text-[13px] leading-snug text-[#3A3448]">
                Ouvre cette page dans <strong>Chrome</strong> ou <strong>Edge</strong> sur ton téléphone. Menu ⋮ → « Installer l'application » ou « Ajouter à l'écran d'accueil ».
              </p>
            )}
          </div>
        </div>

        {!isIOS && (
          <div className="px-[18px]">
            <section className="rounded-[18px] border border-[#E4DFCC] bg-white p-4 space-y-3" aria-label="Télécharger FITILA Android">
              <h2 className="text-[16px] font-extrabold text-[#2B2110]">Application Android native (APK)</h2>
              <p className="text-[13px] text-[#3A3448]">
                Téléchargez FITILA pour Android. Le traducteur ByT5 et les modèles DUNYA restent des téléchargements optionnels séparés.
              </p>
              {apkStatus === 'ready' && apk ? (
                <>
                  <a href={apk.url} className="flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-[#C99530] px-3 font-extrabold text-[#2B2110]">
                    <Download className="h-5 w-5" /> Télécharger FITILA APK (ARM64)
                  </a>
                  {apk.armv7 && <a href={apk.armv7} className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#765017] underline">
                    <Download className="h-4 w-4" /> APK pour anciens téléphones (ARMv7)
                  </a>}
                  <p className="text-[12px] text-[#766D5A]">
                    Version : {apk.version} · {Math.round(apk.size / 1024 / 1024)} Mo · publication officielle GitHub
                  </p>
                </>
              ) : (
                <p role="status" className="text-[13px] text-[#675D49]">
                  {apkStatus === 'loading' ? 'Vérification de la dernière version Android…'
                    : "L’APK Android officiel signé n’est pas encore publié. La version Web reste installable."}
                </p>
              )}
              {apkHistory.length > 0 && (
                <details className="rounded-xl border border-[#E4DFCC] p-3">
                  <summary className="cursor-pointer text-[13px] font-bold text-[#3A3448]">
                    Historique des versions ({apkHistory.length})
                  </summary>
                  <ul className="mt-3 space-y-3">
                    {apkHistory.map(release => (
                      <li key={release.version} className="flex flex-wrap items-center justify-between gap-2 text-[12px]">
                        <span>{release.version} · {release.updated ? new Date(release.updated).toLocaleDateString('fr-FR') : 'Date indisponible'}</span>
                        <span className="flex gap-3">
                          <a className="font-bold underline" href={release.url}>ARM64</a>
                          {release.armv7 && <a className="font-bold underline" href={release.armv7}>ARMv7</a>}
                        </span>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
              <p className="text-[12px] text-[#675D49]">
                Sur Android, ouvrez le fichier APK téléchargé puis autorisez l'installation depuis votre navigateur si Android le demande.
                Une signature différente de celle de votre version installée empêchera sa mise à jour directe.
              </p>
            </section>
          </div>
        )}

        <FeatureGrid items={grid} />
      </div>
    </FitilaPage>
  );
}
