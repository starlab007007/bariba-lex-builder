import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Share2, CheckCircle, Smartphone, AppWindow, Keyboard, RefreshCcw, type LucideIcon } from 'lucide-react';
import FitilaPageHeader from '@/components/fitila/FitilaPageHeader';
import { Chip, ChipWrap, FeatureGrid, FitilaPage, MetricStrip, type Feature } from '@/components/fitila/FitilaUi';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPage() {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

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

        <FeatureGrid items={grid} />
      </div>
    </FitilaPage>
  );
}
