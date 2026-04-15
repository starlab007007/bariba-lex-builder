import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useFitilaLanguage } from '@/contexts/FitilaLanguageContext';
import { FACILITATOR_GUIDE } from '@/data/classeContent';

export default function ClasseFacilitateur() {
  const { currentLang } = useFitilaLanguage();
  const [openSection, setOpenSection] = useState<string | null>('amorce');

  const sections = [
    { id: 'amorce', data: FACILITATOR_GUIDE.amorce, emoji: '🎯', color: 'from-amber-500 to-orange-500' },
    { id: 'developpement', data: FACILITATOR_GUIDE.developpement, emoji: '📚', color: 'from-blue-500 to-indigo-500' },
    { id: 'evaluation', data: FACILITATOR_GUIDE.evaluation, emoji: '📝', color: 'from-purple-500 to-pink-500' },
  ];

  return (
    <div className="space-y-4">
      {/* Pedagogical approach */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-rose-500/20 to-red-500/20 border border-rose-500/30">
        <h2 className="text-white font-black text-lg">👨‍🏫 {currentLang === 'ba' ? 'Sóøsirun søøru' : 'Démarche pédagogique'}</h2>
        <p className="text-rose-300 text-sm mt-1">{currentLang === 'ba' ? 'Keu sóøsion garibu' : 'Guide pour le facilitateur'}</p>
      </div>

      {/* 3 phases */}
      {sections.map(sec => (
        <div key={sec.id}>
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => setOpenSection(openSection === sec.id ? null : sec.id)}
            className="w-full flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10"
          >
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${sec.color} flex items-center justify-center`}>
              <span className="text-xl">{sec.emoji}</span>
            </div>
            <div className="flex-1 text-left">
              <p className="text-white font-bold text-sm">{sec.data.title}</p>
              <p className="text-white/40 text-xs">{sec.data.titleBa}</p>
            </div>
            <span className="text-white/30">{openSection === sec.id ? '▼' : '▶'}</span>
          </motion.button>

          {openSection === sec.id && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-2 ml-4 space-y-2"
            >
              {sec.data.steps.map((step, i) => (
                <div key={i} className="flex items-start gap-2 p-2">
                  <span className="text-amber-400 font-bold text-sm">{i + 1}.</span>
                  <p className="text-white/80 text-sm">{step}</p>
                </div>
              ))}
            </motion.div>
          )}
        </div>
      ))}

      {/* Conseils */}
      <div className="p-4 rounded-xl bg-white/5 border border-white/10">
        <p className="text-white/60 text-xs uppercase font-bold mb-3">💡 {currentLang === 'ba' ? 'Yam waaru' : 'Conseils'}</p>
        <div className="space-y-2">
          {FACILITATOR_GUIDE.conseils.map((c, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-emerald-400">•</span>
              <p className="text-white/70 text-sm">{c}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Planning */}
      <div className="p-4 rounded-xl bg-white/5 border border-white/10">
        <p className="text-white/60 text-xs uppercase font-bold mb-3">📊 {currentLang === 'ba' ? 'Søm piibunu' : 'Planification'}</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-white/5 text-center">
            <p className="text-2xl font-black text-white">{FACILITATOR_GUIDE.planification.totalSessions}</p>
            <p className="text-white/40 text-[10px]">{currentLang === 'ba' ? 'Købi' : 'Séances'}</p>
          </div>
          <div className="p-3 rounded-lg bg-white/5 text-center">
            <p className="text-2xl font-black text-white">{FACILITATOR_GUIDE.planification.totalWeeks}</p>
            <p className="text-white/40 text-[10px]">{currentLang === 'ba' ? 'Yarusuma' : 'Semaines'}</p>
          </div>
          <div className="p-3 rounded-lg bg-white/5 text-center">
            <p className="text-2xl font-black text-white">{FACILITATOR_GUIDE.planification.sessionsPerWeek}</p>
            <p className="text-white/40 text-[10px]">{currentLang === 'ba' ? 'Købi/yarusuma' : 'Séances/semaine'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
