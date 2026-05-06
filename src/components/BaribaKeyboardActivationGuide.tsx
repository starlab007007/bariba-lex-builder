import React from 'react';
import { motion } from 'framer-motion';
import { Settings, Keyboard, MessageSquare, CheckCircle2, ExternalLink } from 'lucide-react';

const steps = [
  {
    icon: Settings,
    title: 'Ouvrir les paramètres',
    desc: 'Allez dans Paramètres Android → Gestion générale → Langue et saisie',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    icon: Keyboard,
    title: 'Activer le clavier',
    desc: 'Clavier virtuel → Gérer les claviers → Activer "Clavier Bariba Fitila"',
    color: 'from-amber-500 to-orange-500',
  },
  {
    icon: MessageSquare,
    title: 'Changer de clavier',
    desc: 'Dans n\'importe quelle app, appuyez longuement sur la barre d\'espace ou l\'icône clavier en bas',
    color: 'from-emerald-500 to-teal-500',
  },
  {
    icon: CheckCircle2,
    title: 'Tapez en Bariba !',
    desc: 'Sélectionnez "Clavier Bariba Fitila" et utilisez les touches ɔ ɛ ŋ ã ĩ ũ',
    color: 'from-purple-500 to-pink-500',
  },
];

export default function BaribaKeyboardActivationGuide() {
  const openKeyboardSettings = () => {
    try {
      // Android deep link to input method settings
      window.open('intent://settings/input_method#Intent;scheme=android-app;end', '_system');
    } catch {
      // Fallback: just show a message
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <h3 className="text-lg font-bold flex items-center justify-center gap-2">
          <Keyboard className="w-5 h-5 text-amber-500" />
          Activer le Clavier Natif
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          Utilisez le clavier Bariba dans toutes vos applications
        </p>
      </div>

      {steps.map((step, i) => (
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
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-sm hover:from-amber-600 hover:to-orange-600 active:scale-[0.98] transition-all shadow-lg shadow-amber-500/25 mt-4"
      >
        <ExternalLink className="w-4 h-4" />
        Ouvrir les paramètres clavier
      </button>

      <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 mt-2">
        <p className="text-[11px] text-blue-700 dark:text-blue-300">
          <strong>Note :</strong> Le clavier natif fonctionne dans WhatsApp, SMS, Facebook et toutes les autres applications.
          Le clavier web intégré à Fitila reste disponible pour les fonctionnalités avancées (suggestions phonétiques, favoris).
        </p>
      </div>
    </div>
  );
}