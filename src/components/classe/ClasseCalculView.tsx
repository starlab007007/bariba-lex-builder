import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, X, ChevronRight } from 'lucide-react';
import { useFitilaLanguage } from '@/contexts/FitilaLanguageContext';
import { CALCUL_LESSONS } from '@/data/classeContent';

export default function ClasseCalculView() {
  const { currentLang } = useFitilaLanguage();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Record<string, boolean>>({});

  const selected = CALCUL_LESSONS.find(l => l.id === selectedId);

  const checkAnswer = (key: string, expected: string) => {
    setResults(prev => ({ ...prev, [key]: answers[key]?.trim() === expected }));
  };

  if (selected) {
    return (
      <div className="space-y-4">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setSelectedId(null)}
          className="text-amber-400 text-sm font-bold"
        >
          ← {currentLang === 'ba' ? 'Yeni' : 'Retour'}
        </motion.button>

        <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-blue-500/30">
          <h2 className="text-white font-black text-xl">{selected.title}</h2>
          <p className="text-blue-300 text-sm mt-1">{selected.titleBa}</p>
        </div>

        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <p className="text-white/80 text-sm">{selected.content}</p>
        </div>

        <div className="space-y-3">
          <p className="text-white/60 text-xs uppercase font-bold">✍️ {currentLang === 'ba' ? 'Yäru' : 'Exercices'}</p>
          {selected.exercises.map((ex, i) => {
            const key = `${selected.id}_${i}`;
            return (
              <div key={i} className="p-3 rounded-xl bg-white/5 border border-white/10">
                <p className="text-white font-medium text-sm mb-2">{ex.question}</p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg p-2 text-white text-lg font-bold text-center placeholder:text-white/30 focus:border-blue-500/50 outline-none"
                    placeholder="?"
                    value={answers[key] || ''}
                    onChange={e => {
                      setAnswers(prev => ({ ...prev, [key]: e.target.value }));
                      setResults(prev => { const n = { ...prev }; delete n[key]; return n; });
                    }}
                    onKeyDown={e => e.key === 'Enter' && checkAnswer(key, ex.answer)}
                  />
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => checkAnswer(key, ex.answer)}
                    className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center"
                  >
                    <Check className="w-5 h-5 text-white" />
                  </motion.button>
                  {results[key] === true && <Check className="w-6 h-6 text-emerald-400" />}
                  {results[key] === false && (
                    <div className="flex items-center gap-1">
                      <X className="w-6 h-6 text-red-400" />
                      <span className="text-red-400 text-xs">{ex.answer}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {CALCUL_LESSONS.map((lesson, i) => (
        <motion.button
          key={lesson.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setSelectedId(lesson.id)}
          className="w-full flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
        >
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
            <span className="text-2xl">🔢</span>
          </div>
          <div className="flex-1 text-left">
            <p className="text-white font-bold">{lesson.title}</p>
            <p className="text-white/40 text-xs">{lesson.titleBa} — {lesson.exercises.length} {currentLang === 'ba' ? 'yäru' : 'exercices'}</p>
          </div>
          <ChevronRight className="w-4 h-4 text-white/30" />
        </motion.button>
      ))}
    </div>
  );
}
