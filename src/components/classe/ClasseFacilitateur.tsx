import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useFitilaLanguage } from '@/contexts/FitilaLanguageContext';

const GUIDE = {
  phases: [
    {
      id: 'amorce',
      emoji: '🎯',
      title: 'Amorce',
      titleBa: 'Nuku dobu',
      gradient: 'from-amber-400 to-orange-400',
      steps: [
        'Rappeler la leçon précédente',
        'Introduire le thème du jour par une question ou une situation',
        'Laisser les apprenants s\'exprimer librement',
        'Créer un lien entre le vécu et la leçon',
      ],
    },
    {
      id: 'developpement',
      emoji: '📚',
      title: 'Développement',
      titleBa: 'Gari sɔɔsiru',
      gradient: 'from-blue-400 to-indigo-400',
      steps: [
        'Présenter l\'illustration et lire le texte à voix haute',
        'Poser les questions de la Section I (Mɛɛrio) — observation',
        'Lire le texte une seconde fois, questions Section II (Faagi)',
        'Discussion ouverte Section III (Geruo) — partage d\'expérience',
        'Section IV (Weenɛ) — identifier les points clés à retenir',
        'Exercices phonétiques : lecture des syllabes, mots et phrases',
        'Exercices d\'écriture : copie guidée puis autonome',
      ],
    },
    {
      id: 'evaluation',
      emoji: '📝',
      title: 'Évaluation',
      titleBa: 'Yaayasiabu',
      gradient: 'from-purple-400 to-pink-400',
      steps: [
        'Vérifier la compréhension orale',
        'Vérifier la capacité de lecture',
        'Vérifier l\'écriture des lettres et mots appris',
        'Corriger collectivement et individuellement',
      ],
    },
  ],
  conseils: [
    'Utiliser la langue Bariba comme langue principale d\'enseignement',
    'Encourager tous les apprenants à participer activement',
    'Répéter les exercices de lecture à haute voix plusieurs fois',
    'Adapter le rythme au niveau du groupe',
    'Utiliser des exemples du quotidien pour illustrer les leçons',
    'Les séances de calcul (Dooru) doivent utiliser du matériel concret',
    'Prévoir 288 séances au total, réparties sur 48 semaines',
    'Chaque séance dure environ 2 heures',
  ],
  planning: { totalSessions: 288, totalWeeks: 48, sessionsPerWeek: 6 },
};

export default function ClasseFacilitateur() {
  const { currentLang } = useFitilaLanguage();
  const [openSection, setOpenSection] = useState<string | null>('amorce');

  return (
    <div className="space-y-4">
      {/* Pedagogical approach */}
      <div className="p-4 rounded-3xl bg-gradient-to-br from-rose-100 to-red-100 border border-rose-200 shadow-md">
        <h2 className="text-gray-800 font-black text-lg">👨‍🏫 {currentLang === 'ba' ? 'Sɔ̃ɔsirun sɔɔru' : 'Démarche pédagogique'}</h2>
        <p className="text-rose-600 text-sm mt-1">{currentLang === 'ba' ? 'Keu sɔ̃ɔsion garibu' : 'Guide pour le facilitateur'}</p>
      </div>

      {/* 3 phases */}
      {GUIDE.phases.map(sec => (
        <div key={sec.id}>
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => setOpenSection(openSection === sec.id ? null : sec.id)}
            className="w-full flex items-center gap-3 p-4 rounded-2xl bg-white border border-gray-100 shadow-sm"
          >
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${sec.gradient} flex items-center justify-center shadow-md`}>
              <span className="text-xl">{sec.emoji}</span>
            </div>
            <div className="flex-1 text-left">
              <p className="text-gray-800 font-bold text-sm">{sec.title}</p>
              <p className="text-gray-400 text-xs">{sec.titleBa}</p>
            </div>
            <span className="text-gray-300">{openSection === sec.id ? '▼' : '▶'}</span>
          </motion.button>

          {openSection === sec.id && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-2 ml-4 space-y-2">
              {sec.steps.map((step, i) => (
                <div key={i} className="flex items-start gap-2 p-2">
                  <span className="text-amber-500 font-bold text-sm">{i + 1}.</span>
                  <p className="text-gray-600 text-sm">{step}</p>
                </div>
              ))}
            </motion.div>
          )}
        </div>
      ))}

      {/* Conseils */}
      <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm">
        <p className="text-gray-500 text-xs uppercase font-bold mb-3">💡 {currentLang === 'ba' ? 'Yam waaru' : 'Conseils'}</p>
        <div className="space-y-2">
          {GUIDE.conseils.map((c, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-emerald-500">•</span>
              <p className="text-gray-600 text-sm">{c}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Planning */}
      <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm">
        <p className="text-gray-500 text-xs uppercase font-bold mb-3">📊 {currentLang === 'ba' ? 'Sɔm piibunu' : 'Planification'}</p>
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-center">
            <p className="text-2xl font-black text-gray-800">{GUIDE.planning.totalSessions}</p>
            <p className="text-gray-400 text-[10px]">{currentLang === 'ba' ? 'Kɔbi' : 'Séances'}</p>
          </div>
          <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-center">
            <p className="text-2xl font-black text-gray-800">{GUIDE.planning.totalWeeks}</p>
            <p className="text-gray-400 text-[10px]">{currentLang === 'ba' ? 'Yarusuma' : 'Semaines'}</p>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
            <p className="text-2xl font-black text-gray-800">{GUIDE.planning.sessionsPerWeek}</p>
            <p className="text-gray-400 text-[10px]">{currentLang === 'ba' ? 'Kɔbi/sem.' : 'Sé./sem.'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
