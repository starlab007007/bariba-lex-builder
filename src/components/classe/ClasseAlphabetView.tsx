import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useFitilaLanguage } from '@/contexts/FitilaLanguageContext';
import { BARIBA_ALPHABET } from '@/data/classeContent';
import ListenButton from '@/components/classe/ListenButton';

/** Construit la clé d'audio pour un item du grid en fonction du mode. */
function getAlphabetContentKey(mode: 'vowels' | 'consonants' | 'nasals', idx: number): string {
  if (mode === 'vowels') return `classe/N1/alphabet/0/vowels/${idx}`;
  if (mode === 'consonants') return `classe/N1/alphabet/0/consonants/${idx}`;
  // mode === 'nasals' : on combine nasalVowels puis toneMarkers
  const nbNasal = BARIBA_ALPHABET.nasalVowels.length;
  if (idx < nbNasal) return `classe/N1/alphabet/0/nasalVowels/${idx}`;
  return `classe/N1/alphabet/0/toneMarkers/${idx - nbNasal}`;
}

export default function ClasseAlphabetView() {
  const { currentLang } = useFitilaLanguage();
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
  const [mode, setMode] = useState<'vowels' | 'consonants' | 'nasals' | 'syllables'>('vowels');

  const getLetters = () => {
    switch (mode) {
      case 'vowels': return BARIBA_ALPHABET.vowels;
      case 'consonants': return BARIBA_ALPHABET.consonants;
      case 'nasals': return [...BARIBA_ALPHABET.nasalVowels, ...BARIBA_ALPHABET.toneMarkers];
      default: return [];
    }
  };

  return (
    <div className="space-y-4">
      {/* Mode tabs */}
      <div className="flex gap-2">
        {[
          { id: 'vowels' as const, label: currentLang === 'ba' ? 'Yori piibunu' : 'Voyelles', count: BARIBA_ALPHABET.vowels.length },
          { id: 'consonants' as const, label: currentLang === 'ba' ? 'Yori bakanu' : 'Consonnes', count: BARIBA_ALPHABET.consonants.length },
          { id: 'nasals' as const, label: currentLang === 'ba' ? 'Wãrun yĩreru' : 'Nasales', count: BARIBA_ALPHABET.nasalVowels.length },
          { id: 'syllables' as const, label: currentLang === 'ba' ? 'Gɔmbi' : 'Syllabes' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => { setMode(tab.id); setSelectedLetter(null); }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
              mode === tab.id
                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200'
                : 'bg-white text-gray-500 border border-gray-200'
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
            {getLetters().map((letter, i) => (
              <motion.button
                key={letter}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.03 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setSelectedLetter(letter)}
                className={`aspect-square rounded-2xl flex flex-col items-center justify-center transition-all shadow-sm ${
                  selectedLetter === letter
                    ? 'bg-gradient-to-br from-emerald-400 to-teal-400 shadow-lg shadow-emerald-200'
                    : 'bg-white border border-gray-100'
                }`}
              >
                <span className={`text-3xl font-black ${selectedLetter === letter ? 'text-white' : 'text-gray-800'}`}>{letter}</span>
                <span className={`text-xs mt-1 ${selectedLetter === letter ? 'text-white/70' : 'text-gray-400'}`}>{letter.toUpperCase()}</span>
              </motion.button>
            ))}
          </div>

          {/* Selected detail */}
          {selectedLetter && (
            <motion.div
              key={selectedLetter}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-5 rounded-3xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 shadow-md"
            >
              <div className="flex items-center gap-4">
                <span className="text-6xl font-black text-gray-800">{selectedLetter}</span>
                <span className="text-4xl font-black text-gray-300">{selectedLetter.toUpperCase()}</span>
                <div className="flex-1">
                  <p className="text-gray-500 text-xs uppercase">{currentLang === 'ba' ? 'Yori' : 'Lettre'}</p>
                  <p className="text-emerald-600 text-xl font-bold">{selectedLetter}</p>
                </div>
                <button className="w-12 h-12 rounded-full bg-white shadow-md flex items-center justify-center">
                  <span className="text-2xl">🔊</span>
                </button>
              </div>
            </motion.div>
          )}

          {/* Info */}
          <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm">
            <p className="text-gray-500 text-xs uppercase font-bold mb-2">
              {mode === 'vowels' ? '📕' : mode === 'consonants' ? '📗' : '📘'} {currentLang === 'ba' ? 'Gari' : 'Info'}
            </p>
            {mode === 'vowels' && <p className="text-gray-600 text-sm">{currentLang === 'ba' ? 'Baatɔnum yori piibunu 7 bu mɔ: a, ɛ, e, i, o, ɔ, u' : 'L\'alphabet Bariba comporte 7 voyelles de base: a, ɛ, e, i, o, ɔ, u'}</p>}
            {mode === 'consonants' && <p className="text-gray-600 text-sm">{currentLang === 'ba' ? 'Yori bakanu 16 bu mɔ. Kp ka gb ba mɔ yori bakanu yiruse' : '16 consonnes dont les digraphes kp et gb'}</p>}
            {mode === 'nasals' && <p className="text-gray-600 text-sm">{currentLang === 'ba' ? 'Wãrun yĩreru ba mɔ: ã, ɛ̃, ĩ, ɔ̃. Ton bas: ɔ̀, ǹ' : 'Voyelles nasales: ã, ɛ̃, ĩ, ɔ̃. Marques tonales: ɔ̀ (ton bas), ǹ (n syllabique)'}</p>}
          </div>
        </>
      ) : (
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
      <p className="text-gray-600 text-sm">{currentLang === 'ba' ? 'Gɔmbi saribu: yori bakan daki kpa yori piibunu nɔ' : 'Choisis une consonne pour voir les syllabes'}</p>

      {/* Consonant selector */}
      <div className="flex flex-wrap gap-2">
        {consonants.map(c => (
          <button
            key={c}
            onClick={() => setConsonant(c)}
            className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold transition-all shadow-sm ${
              consonant === c ? 'bg-blue-500 text-white shadow-blue-200' : 'bg-white text-gray-600 border border-gray-200'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Generated syllables */}
      <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm">
        <p className="text-gray-400 text-xs uppercase font-bold mb-3">{currentLang === 'ba' ? 'Gɔmbi' : 'Syllabes'} — {consonant} + voyelle</p>
        <div className="grid grid-cols-4 gap-2">
          {vowels.map(v => (
            <div key={v} className="p-3 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 text-center">
              <span className="text-gray-800 text-xl font-bold">{consonant}{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
