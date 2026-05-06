import React from 'react';
import { motion } from 'framer-motion';
import { Smartphone, Copy, MessageSquare, CheckCircle2 } from 'lucide-react';

const steps = [
  {
    icon: Smartphone,
    title: 'Ouvrez le clavier Fitila',
    desc: 'Tapez votre texte en Bariba avec les caractères spéciaux et les suggestions intelligentes.',
    color: 'from-amber-500 to-orange-500',
  },
  {
    icon: Copy,
    title: 'Copiez le texte',
    desc: 'Appuyez sur le bouton "Copier" pour envoyer le texte dans votre presse-papier.',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    icon: MessageSquare,
    title: 'Collez dans WhatsApp',
    desc: 'Ouvrez WhatsApp ou toute autre application et collez votre texte Bariba.',
    color: 'from-emerald-500 to-teal-500',
  },
];

export default function KeyboardActivationGuide() {
  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-lg font-bold">Comment utiliser le clavier ?</h3>
        <p className="text-sm text-muted-foreground mt-1">
          3 étapes simples pour écrire en Bariba partout
        </p>
      </div>

      {steps.map((step, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.15 }}
          className="flex items-start gap-3"
        >
          <div className={`shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br ${step.color} flex items-center justify-center shadow-lg`}>
            <step.icon className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-muted-foreground">Étape {i + 1}</span>
            </div>
            <h4 className="font-semibold text-sm">{step.title}</h4>
            <p className="text-xs text-muted-foreground mt-0.5">{step.desc}</p>
          </div>
        </motion.div>
      ))}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20"
      >
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
            Fonctionne avec WhatsApp, SMS, Facebook, et toutes les applications !
          </span>
        </div>
      </motion.div>
    </div>
  );
}