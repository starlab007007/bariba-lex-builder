import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Share2, ArrowLeft, CheckCircle, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

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

  return (
    <div className="min-h-[100dvh] bg-black flex flex-col">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 safe-area-inset-top">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-white/70 hover:text-white">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold text-white">Installer FITILA</h1>
      </header>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-20">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-24 h-24 rounded-3xl overflow-hidden shadow-2xl mb-6"
        >
          <img src="/fitila-icon-512.png" alt="FITILA" className="w-full h-full object-cover" />
        </motion.div>

        <h2 className="text-2xl font-bold text-white mb-2">FITILA</h2>
        <p className="text-white/60 text-center text-sm mb-8 max-w-xs">
          Installe FITILA sur ton téléphone pour y accéder rapidement, même hors connexion.
        </p>

        {isInstalled ? (
          <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="flex flex-col items-center gap-3">
            <CheckCircle className="w-16 h-16 text-green-400" />
            <p className="text-green-400 font-medium text-lg">Déjà installé !</p>
            <p className="text-white/50 text-sm text-center">
              FITILA est sur ton écran d'accueil.
            </p>
          </motion.div>
        ) : isIOS ? (
          <div className="bg-white/5 rounded-2xl p-5 max-w-xs space-y-4">
            <div className="flex items-center gap-3">
              <Share2 className="w-6 h-6 text-amber-400 shrink-0" />
              <p className="text-white text-sm">
                <strong>1.</strong> Appuie sur le bouton <strong>Partager</strong> <Share2 className="w-4 h-4 inline" /> en bas du navigateur
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Download className="w-6 h-6 text-amber-400 shrink-0" />
              <p className="text-white text-sm">
                <strong>2.</strong> Sélectionne <strong>"Sur l'écran d'accueil"</strong>
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Smartphone className="w-6 h-6 text-amber-400 shrink-0" />
              <p className="text-white text-sm">
                <strong>3.</strong> Appuie <strong>"Ajouter"</strong> et c'est fait !
              </p>
            </div>
          </div>
        ) : deferredPrompt ? (
          <Button
            onClick={handleInstall}
            size="lg"
            className="bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-full px-8 py-6 text-base min-h-[52px] active:scale-95 transition-transform"
          >
            <Download className="w-5 h-5 mr-2" />
            Installer l'application
          </Button>
        ) : (
          <div className="text-center space-y-3">
            <p className="text-white/50 text-sm">
              Ouvre cette page dans <strong className="text-white">Chrome</strong> ou <strong className="text-white">Edge</strong> sur ton téléphone pour installer l'app.
            </p>
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-white/40 text-xs">
                Menu ⋮ → "Installer l'application" ou "Ajouter à l'écran d'accueil"
              </p>
            </div>
          </div>
        )}

        {/* Features */}
        <div className="mt-10 grid grid-cols-2 gap-3 max-w-xs w-full">
          {[
            { icon: '⚡', label: 'Rapide' },
            { icon: '📴', label: 'Hors-ligne' },
            { icon: '🔔', label: 'Notifications' },
            { icon: '📱', label: 'Plein écran' },
          ].map((f) => (
            <div key={f.label} className="bg-white/5 rounded-xl p-3 flex items-center gap-2">
              <span className="text-lg">{f.icon}</span>
              <span className="text-white/70 text-xs font-medium">{f.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
