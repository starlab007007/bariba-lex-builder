import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, BookOpen, Mic, Volume2, ChevronRight, Star, Trophy, Flame } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useFitilaLanguage } from '@/contexts/FitilaLanguageContext';
import { useSideMenu } from '@/pages/fitila/FitilaApp';
import { triggerFeedback } from '@/utils/tamtamFeedback';

// ═══════════════════════════════════════════════════════════════════════════════
// 📚 FITILA LEARN - Apprendre les langues locales
// ═══════════════════════════════════════════════════════════════════════════════

interface LessonCategory {
  id: string;
  emoji: string;
  label: string;
  labelBa: string;
  desc: string;
  gradient: string;
  lessonsCount: number;
}

const CATEGORIES: LessonCategory[] = [
  {
    id: 'salutations',
    emoji: '👋',
    label: 'Salutations',
    labelBa: 'Ìkíni',
    desc: 'Bonjour, au revoir, merci...',
    gradient: 'from-amber-500 to-orange-400',
    lessonsCount: 8,
  },
  {
    id: 'famille',
    emoji: '👨‍👩‍👧‍👦',
    label: 'Famille',
    labelBa: 'Ìdílé',
    desc: 'Père, mère, frère, sœur...',
    gradient: 'from-pink-500 to-rose-400',
    lessonsCount: 12,
  },
  {
    id: 'nombres',
    emoji: '🔢',
    label: 'Nombres',
    labelBa: 'Nọ́mbà',
    desc: 'Compter de 1 à 100',
    gradient: 'from-blue-500 to-cyan-400',
    lessonsCount: 10,
  },
  {
    id: 'nourriture',
    emoji: '🍲',
    label: 'Nourriture',
    labelBa: 'Oúnjẹ',
    desc: 'Aliments, boissons, cuisine...',
    gradient: 'from-green-500 to-emerald-400',
    lessonsCount: 15,
  },
  {
    id: 'marche',
    emoji: '🏪',
    label: 'Au marché',
    labelBa: 'Ní Ọjà',
    desc: 'Acheter, vendre, négocier...',
    gradient: 'from-purple-500 to-violet-400',
    lessonsCount: 10,
  },
  {
    id: 'corps',
    emoji: '🫀',
    label: 'Corps humain',
    labelBa: 'Ara ènìyàn',
    desc: 'Parties du corps, santé...',
    gradient: 'from-red-500 to-pink-400',
    lessonsCount: 14,
  },
  {
    id: 'nature',
    emoji: '🌿',
    label: 'Nature',
    labelBa: 'Ẹ̀dá',
    desc: 'Animaux, plantes, saisons...',
    gradient: 'from-teal-500 to-green-400',
    lessonsCount: 12,
  },
  {
    id: 'expressions',
    emoji: '💬',
    label: 'Expressions',
    labelBa: 'Ọ̀rọ̀',
    desc: 'Phrases courantes du quotidien',
    gradient: 'from-indigo-500 to-blue-400',
    lessonsCount: 20,
  },
];

const SAMPLE_WORDS: Record<string, { word: string; phonetic: string; french: string }[]> = {
  salutations: [
    { word: 'Aagu', phonetic: '[aagu]', french: 'Salut (à un plus jeune)' },
    { word: 'Aawo', phonetic: '[àa›wò]', french: 'Non' },
    { word: 'Kú àárọ̀', phonetic: '[kú àárọ̀]', french: 'Bonjour (matin)' },
    { word: 'A dúpẹ́', phonetic: '[a dúpẹ́]', french: 'Merci' },
  ],
  famille: [
    { word: 'Baà', phonetic: '[baà]', french: 'Père' },
    { word: 'Naà', phonetic: '[naà]', french: 'Mère' },
    { word: 'Yàrú', phonetic: '[yàrú]', french: 'Frère / Sœur' },
  ],
  nombres: [
    { word: 'Dókó', phonetic: '[dókó]', french: 'Un (1)' },
    { word: 'Yiru', phonetic: '[yiru]', french: 'Deux (2)' },
    { word: 'Yiita', phonetic: '[yiita]', french: 'Trois (3)' },
  ],
};

export default function FitilaLearn() {
  const navigate = useNavigate();
  const { currentLang } = useFitilaLanguage();
  const { open: openMenu } = useSideMenu();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [streak] = useState(3);

  const handleBack = () => {
    if (selectedCategory) {
      setSelectedCategory(null);
    } else {
      navigate('/fitila/social');
    }
    triggerFeedback('click');
  };

  const selectedCat = CATEGORIES.find(c => c.id === selectedCategory);
  const words = selectedCategory ? (SAMPLE_WORDS[selectedCategory] || []) : [];

  const speakFrench = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'fr-FR';
      utterance.rate = 0.85;
      speechSynthesis.speak(utterance);
      triggerFeedback('click');
    }
  };

  return (
    <div className="h-[100dvh] flex flex-col bg-[#08080c]">
      {/* Header */}
      <div className="flex-shrink-0 px-4 pt-4 pb-3">
        <div className="flex items-center justify-between">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleBack}
            className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </motion.button>
          <h1 className="text-white font-bold text-lg">
            {currentLang === 'ba' ? '📚 Kíkọ́' : '📚 Apprendre'}
          </h1>
          <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#FF5722]/20 border border-[#FF5722]/30">
            <Flame className="w-4 h-4 text-[#FF5722]" />
            <span className="text-[#FF5722] text-sm font-bold">{streak}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-6">
        <AnimatePresence mode="wait">
          {!selectedCategory ? (
            <motion.div
              key="categories"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {/* Stats bar */}
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-yellow-400" />
                  <span className="text-white text-sm font-semibold">0 XP</span>
                </div>
                <div className="h-4 w-px bg-white/20" />
                <div className="flex items-center gap-1.5">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span className="text-white/60 text-sm">Niveau 1</span>
                </div>
                <div className="h-4 w-px bg-white/20" />
                <div className="flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-blue-400" />
                  <span className="text-white/60 text-sm">0 leçons</span>
                </div>
              </div>

              {/* Category grid */}
              <div className="grid grid-cols-2 gap-3">
                {CATEGORIES.map((cat, index) => (
                  <motion.button
                    key={cat.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.04 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setSelectedCategory(cat.id);
                      triggerFeedback('click');
                    }}
                    className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-all border border-white/5 hover:border-white/15 text-left"
                  >
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${cat.gradient} flex items-center justify-center shadow-lg`}>
                      <span className="text-3xl">{cat.emoji}</span>
                    </div>
                    <span className="text-white text-sm font-semibold text-center">
                      {currentLang === 'ba' ? cat.labelBa : cat.label}
                    </span>
                    <span className="text-white/40 text-[10px] text-center">{cat.lessonsCount} leçons</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="lesson"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              {/* Category header */}
              {selectedCat && (
                <div className={`p-4 rounded-2xl bg-gradient-to-br ${selectedCat.gradient} bg-opacity-20`}>
                  <div className="flex items-center gap-3">
                    <span className="text-4xl">{selectedCat.emoji}</span>
                    <div>
                      <h2 className="text-white font-bold text-xl">
                        {currentLang === 'ba' ? selectedCat.labelBa : selectedCat.label}
                      </h2>
                      <p className="text-white/70 text-sm">{selectedCat.desc}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Word cards */}
              <div className="space-y-3">
                {words.length > 0 ? (
                  words.map((w, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="p-4 rounded-2xl bg-white/5 border border-white/10"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-white font-bold text-lg">{w.word}</p>
                          <p className="text-white/40 text-xs font-mono">{w.phonetic}</p>
                          <p className="text-[#FF5722] text-sm mt-1">{w.french}</p>
                        </div>
                        <motion.button
                          whileTap={{ scale: 0.85 }}
                          onClick={() => speakFrench(w.french)}
                          className="w-11 h-11 rounded-full bg-[#FF5722]/20 flex items-center justify-center"
                        >
                          <Volume2 className="w-5 h-5 text-[#FF5722]" />
                        </motion.button>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <span className="text-5xl">🚧</span>
                    <p className="text-white/60 text-sm mt-3">
                      {currentLang === 'ba' ? 'Ẹ̀kọ́ ń bọ̀ láìpẹ́...' : 'Leçons bientôt disponibles...'}
                    </p>
                  </div>
                )}
              </div>

              {/* Practice button */}
              {words.length > 0 && (
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  className="w-full py-4 rounded-2xl bg-[#FF5722] text-white font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-[#FF5722]/20"
                >
                  <Mic className="w-5 h-5" />
                  {currentLang === 'ba' ? 'Dá sí ohùn' : 'Pratiquer la prononciation'}
                </motion.button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
