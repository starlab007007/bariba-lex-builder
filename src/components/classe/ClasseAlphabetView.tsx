import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useFitilaLanguage } from '@/contexts/FitilaLanguageContext';
import { BARIBA_ALPHABET } from '@/data/classeContent';

export default function ClasseAlphabetView() {
  const { currentLang } = useFitilaLanguage();
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
  const [mode, setMode] = useState<'vowels' | 'consonants' | 'syllables'>('vowels');

  const allLetters = mode === 'vowels' ? BARIBA_ALPHABET.vowels : BARIBA_ALPHABET.consonants;
  const selected = [...BARIBA_ALPHABET.vowels, ...BARIBA_ALPHABET.consonants].find(l => l.letter === selectedLetter);

  return (
    <div className="space-y-4">
      {/* Mode tabs */}
      <div className="flex gap-2">
        {[
          { id: 'vowels' as const, label: currentLang === 'ba' ? 'Yori piibunu' : 'Voyelles', count: BARIBA_ALPHABET.vowels.length },
          { id: 'consonants' as const, label: currentLang === 'ba' ? 'Yori bakanu' : 'Consonnes', count: BARIBA_ALPHABET.consonants.length },
          { id: 'syllables' as const, label: currentLang === 'ba' ? 'Gømbi' : 'Syllabes' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setMode(tab.id)}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
              mode === tab.id ? 'bg-emerald-500 text-white' : 'bg-white/10 text-white/50'
            }`}
          >
            {tab.label} {tab.count ? `(${tab.count})` : ''}
          </button>
        ))}
      </div>

      {mode !== 'syllables' ? (
        <>
          {/* Letter grid */}
          <div className="grid grid-cols-4 gap-3">
            {allLetters.map((l, i) => (
              <motion.button
                key={l.letter}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.03 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setSelectedLetter(l.letter)}
                className={`aspect-square rounded-2xl flex flex-col items-center justify-center transition-all ${
                  selectedLetter === l.letter
                    ? 'bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/30'
                    : 'bg-white/10 border border-white/10'
                }`}
              >
                <span className="text-3xl font-black text-white">{l.letter}</span>
                <span className="text-white/40 text-xs mt-1">{l.upper}</span>
              </motion.button>
            ))}
          </div>

          {/* Selected detail */}
          {selected && (
            <motion.div
              key={selected.letter}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30"
            >
              <div className="flex items-center gap-4">
                <span className="text-6xl font-black text-white">{selected.letter}</span>
                <span className="text-4xl font-black text-white/40">{selected.upper}</span>
                <div className="flex-1">
                  <p className="text-white/60 text-xs uppercase">{currentLang === 'ba' ? 'Wunana' : 'Exemple'}</p>
                  <p className="text-emerald-300 text-xl font-bold">{selected.example}</p>
                </div>
                <button className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                  <span className="text-2xl">🔊</span>
                </button>
              </div>
            </motion.div>
          )}

          {/* Tones info */}
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <p className="text-white/60 text-xs uppercase font-bold mb-2">{currentLang === 'ba' ? 'Wirin gari' : 'Les tons'}</p>
            <div className="space-y-1 text-sm">
              <p className="text-white/80">• {BARIBA_ALPHABET.tones.bas}</p>
              <p className="text-white/80">• {BARIBA_ALPHABET.tones.moyen}</p>
              <p className="text-white/80">• {BARIBA_ALPHABET.tones.eleve}</p>
            </div>
          </div>
        </>
      ) : (
        /* Syllable builder */
        <SyllableBuilder />
      )}
    </div>
  );
}

function SyllableBuilder() {
  const { currentLang } = useFitilaLanguage();
  const [consonant, setConsonant] = useState('k');
  const vowels = BARIBA_ALPHABET.vowels;
  const consonants = BARIBA_ALPHABET.consonants;

  return (
    <div className="space-y-4">
      <p className="text-white/60 text-sm">{currentLang === 'ba' ? 'Gømbi saribu: yori bakan daki kpa yori piibunu nø' : 'Construction de syllabes : choisis une consonne puis combine avec les voyelles'}</p>

      {/* Consonant selector */}
      <div className="flex flex-wrap gap-2">
        {consonants.map(c => (
          <button
            key={c.letter}
            onClick={() => setConsonant(c.letter)}
            className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold transition-all ${
              consonant === c.letter ? 'bg-blue-500 text-white' : 'bg-white/10 text-white/60'
            }`}
          >
            {c.letter}
          </button>
        ))}
      </div>

      {/* Generated syllables */}
      <div className="p-4 rounded-xl bg-white/5 border border-white/10">
        <p className="text-white/40 text-xs uppercase font-bold mb-3">{currentLang === 'ba' ? 'Gømbi' : 'Syllabes'} — {consonant} + voyelle</p>
        <div className="grid grid-cols-4 gap-2">
          {vowels.map(v => (
            <div key={v.letter} className="p-3 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 text-center">
              <span className="text-white text-xl font-bold">{consonant}{v.letter}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
