import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Keyboard, MessageSquare, CheckCircle2, ExternalLink, Smartphone, Camera, Mic, ShieldCheck, ShieldX, AlertTriangle, RefreshCw } from 'lucide-react';

type PermissionState = 'unknown' | 'granted' | 'denied' | 'requesting';

const KEYBOARD_STEPS = [
  { icon: Settings, title: 'Ouvrir les paramètres', desc: 'Paramètres Android → Gestion générale → Langue et saisie', color: 'from-blue-500 to-cyan-500' },
  { icon: Keyboard, title: 'Activer le clavier', desc: 'Clavier virtuel → Gérer les claviers → Activer "Clavier Bariba Fitila"', color: 'from-amber-500 to-orange-500' },
  { icon: MessageSquare, title: 'Changer de clavier', desc: 'Dans n\'importe quelle app, appuyez longuement sur la barre d\'espace ou l\'icône 🌐', color: 'from-emerald-500 to-teal-500' },
  { icon: CheckCircle2, title: 'Tapez en Bariba !', desc: 'Sélectionnez "Clavier Bariba Fitila" — touches ɔ ɛ ŋ ã ĩ ũ disponibles', color: 'from-purple-500 to-pink-500' },
];

export default function BaribaKeyboardActivationGuide() {
  const [cameraPermission, setCameraPermission] = useState<PermissionState>('unknown');
  const [micPermission, setMicPermission] = useState<PermissionState>('unknown');

  // Check current permission state on mount
  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    try {
      if (navigator.permissions) {
        const [cam, mic] = await Promise.all([
          navigator.permissions.query({ name: 'camera' as PermissionName }).catch(() => null),
          navigator.permissions.query({ name: 'microphone' as PermissionName }).catch(() => null),
        ]);
        if (cam) setCameraPermission(cam.state === 'granted' ? 'granted' : cam.state === 'denied' ? 'denied' : 'unknown');
        if (mic) setMicPermission(mic.state === 'granted' ? 'granted' : mic.state === 'denied' ? 'denied' : 'unknown');
      }
    } catch {
      // permissions API not available
    }
  };

  const requestCamera = async () => {
    setCameraPermission('requesting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(t => t.stop());
      setCameraPermission('granted');
    } catch {
      setCameraPermission('denied');
    }
  };

  const requestMic = async () => {
    setMicPermission('requesting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());
      setMicPermission('granted');
    } catch {
      setMicPermission('denied');
    }
  };

  const openAppSettings = () => {
    try {
      window.location.href = 'intent:#Intent;action=android.settings.APPLICATION_DETAILS_SETTINGS;data=package:app.lovable.a8b67aa7de064bed97db29852f4f01ed;end';
    } catch {
      // fallback silent
    }
  };

  const openKeyboardSettings = () => {
    try {
      window.location.href = 'intent:#Intent;action=android.settings.INPUT_METHOD_SETTINGS;end';
    } catch {
      try {
        window.location.href = 'intent://settings/input_method#Intent;scheme=android-app;end';
      } catch { /* silent */ }
    }
  };

  const PermissionBadge = ({ state, label }: { state: PermissionState; label: string }) => {
    const config = {
      unknown: { icon: AlertTriangle, text: 'Non demandée', bg: 'bg-muted', textColor: 'text-muted-foreground' },
      requesting: { icon: RefreshCw, text: 'En cours...', bg: 'bg-blue-500/15', textColor: 'text-blue-600 dark:text-blue-400' },
      granted: { icon: ShieldCheck, text: 'Autorisée', bg: 'bg-emerald-500/15', textColor: 'text-emerald-600 dark:text-emerald-400' },
      denied: { icon: ShieldX, text: 'Refusée', bg: 'bg-destructive/15', textColor: 'text-destructive' },
    }[state];
    const Icon = config.icon;
    return (
      <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${config.bg} ${config.textColor} text-[10px] font-semibold`}>
        <Icon className={`w-3 h-3 ${state === 'requesting' ? 'animate-spin' : ''}`} />
        {label}: {config.text}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* ── Section 1: Keyboard Activation ── */}
      <div className="text-center mb-2">
        <h3 className="text-lg font-bold flex items-center justify-center gap-2">
          <Keyboard className="w-5 h-5 text-amber-500" />
          Activer le Clavier Natif
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          Utilisez le clavier Bariba dans toutes vos applications
        </p>
      </div>

      {KEYBOARD_STEPS.map((step, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.12 }}
          className="flex items-start gap-3"
        >
          <div className={`shrink-0 w-8 h-8 rounded-full bg-gradient-to-br ${step.color} flex items-center justify-center shadow-lg`}>
            <span className="text-white text-xs font-bold">{i + 1}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm">{step.title}</h4>
            <p className="text-xs text-muted-foreground mt-0.5">{step.desc}</p>
          </div>
        </motion.div>
      ))}

      <button
        onClick={openKeyboardSettings}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-sm hover:from-amber-600 hover:to-orange-600 active:scale-[0.98] transition-all shadow-lg shadow-amber-500/25"
      >
        <Smartphone className="w-5 h-5" />
        Ouvrir Paramètres → Langue et saisie
      </button>

      {/* ── Section 2: Permissions ── */}
      <div className="pt-3 border-t border-border/50">
        <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          Permissions de l'application
        </h4>

        {/* Status badges */}
        <div className="flex flex-wrap gap-2 mb-3">
          <PermissionBadge state={cameraPermission} label="Caméra" />
          <PermissionBadge state={micPermission} label="Micro" />
        </div>

        {/* Permission request buttons */}
        <div className="space-y-2">
          <button
            onClick={requestCamera}
            disabled={cameraPermission === 'granted' || cameraPermission === 'requesting'}
            className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
              cameraPermission === 'granted'
                ? 'border-emerald-500/30 bg-emerald-500/5'
                : cameraPermission === 'denied'
                ? 'border-destructive/30 bg-destructive/5'
                : 'border-border/50 bg-muted/30 hover:bg-muted/50'
            }`}
          >
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
              cameraPermission === 'granted' ? 'bg-emerald-500/20' : 'bg-blue-500/20'
            }`}>
              <Camera className={`w-4.5 h-4.5 ${cameraPermission === 'granted' ? 'text-emerald-500' : 'text-blue-500'}`} />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium">Caméra</p>
              <p className="text-[10px] text-muted-foreground">Photo-traduction, scan de documents</p>
            </div>
            {cameraPermission === 'granted' && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
            {cameraPermission === 'denied' && <ShieldX className="w-5 h-5 text-destructive" />}
          </button>

          <button
            onClick={requestMic}
            disabled={micPermission === 'granted' || micPermission === 'requesting'}
            className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
              micPermission === 'granted'
                ? 'border-emerald-500/30 bg-emerald-500/5'
                : micPermission === 'denied'
                ? 'border-destructive/30 bg-destructive/5'
                : 'border-border/50 bg-muted/30 hover:bg-muted/50'
            }`}
          >
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
              micPermission === 'granted' ? 'bg-emerald-500/20' : 'bg-purple-500/20'
            }`}>
              <Mic className={`w-4.5 h-4.5 ${micPermission === 'granted' ? 'text-emerald-500' : 'text-purple-500'}`} />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium">Microphone</p>
              <p className="text-[10px] text-muted-foreground">Traduction vocale, dictée, appels</p>
            </div>
            {micPermission === 'granted' && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
            {micPermission === 'denied' && <ShieldX className="w-5 h-5 text-destructive" />}
          </button>
        </div>

        {/* Denied state helper */}
        <AnimatePresence>
          {(cameraPermission === 'denied' || micPermission === 'denied') && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-3 p-3 rounded-xl bg-destructive/10 border border-destructive/20">
                <p className="text-[11px] text-destructive font-medium mb-2">
                  ⚠️ Permission refusée — activez-la manuellement :
                </p>
                <ol className="text-[10px] text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Ouvrez les Paramètres de l'application</li>
                  <li>Allez dans Autorisations</li>
                  <li>Activez Caméra et/ou Microphone</li>
                </ol>
                <button
                  onClick={openAppSettings}
                  className="mt-2 w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-destructive/15 text-destructive text-xs font-medium hover:bg-destructive/25 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Ouvrir les paramètres de l'app
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Info note */}
      <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
        <p className="text-[11px] text-blue-700 dark:text-blue-300">
          <strong>Note :</strong> Le clavier natif fonctionne dans WhatsApp, SMS, Facebook et toutes les apps.
          Les permissions caméra/micro sont nécessaires pour la photo-traduction et la dictée vocale.
        </p>
      </div>
    </div>
  );
}