import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, ArrowLeft, Check, X, RotateCcw, Star } from 'lucide-react';
import { useFitilaLanguage } from '@/contexts/FitilaLanguageContext';
import { CALCUL_LESSONS, CALCUL_EXERCISES, BARIBA_NUMBERS, MathExercise, saveCalculScore, getClasseProgress } from '@/data/classeContent';

function MathOperationExercise({ exercise, index, onResult }: {
  exercise: MathExercise;
  index: number;
  onResult: (correct: boolean) => void;
}) {
  const [answer, setAnswer] = useState('');
  const [remainder, setRemainder] = useState('');
  const [checked, setChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  const check = () => {
    const ans = parseInt(answer);
    let correct = ans === exercise.expected;
    if (exercise.type === 'division' && exercise.remainder !== undefined) {
      correct = correct && parseInt(remainder) === exercise.remainder;
    }
    setIsCorrect(correct);
    setChecked(true);
    onResult(correct);
  };

  const symbols: Record<string, string> = {
    addition: '+', subtraction: '−', multiplication: '×', division: '÷', count: '='
  };

  if (exercise.type === 'count') {
    return (
      <div className={`p-4 rounded-2xl border shadow-sm ${checked ? (isCorrect ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200') : 'bg-white border-gray-100'}`}>
        <div className="flex items-center gap-3 mb-3">
          {/* Visual dots */}
          <div className="flex gap-1 flex-wrap">
            {Array.from({ length: exercise.expected }).map((_, i) => (
              <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-400 shadow-md flex items-center justify-center">
                <span className="text-white text-xs font-bold">{i + 1}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-600 text-sm font-medium">{exercise.label} =</span>
          <input
            type="number"
            className="w-16 bg-gray-50 border border-gray-200 rounded-xl p-2 text-center text-lg font-bold focus:border-blue-400 outline-none"
            value={answer}
            onChange={e => { setAnswer(e.target.value); setChecked(false); }}
            placeholder="?"
          />
          {!checked ? (
            <motion.button whileTap={{ scale: 0.9 }} onClick={check} disabled={!answer}
              className="px-3 py-2 rounded-lg bg-blue-500 text-white text-xs font-bold disabled:opacity-30">✓</motion.button>
          ) : (
            isCorrect ? <Check className="w-5 h-5 text-emerald-500" /> : <X className="w-5 h-5 text-red-400" />
          )}
        </div>
        {checked && !isCorrect && (
          <p className="text-red-500 text-xs mt-1">= {exercise.expected}</p>
        )}
      </div>
    );
  }

  return (
    <div className={`p-4 rounded-2xl border shadow-sm ${checked ? (isCorrect ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200') : 'bg-white border-gray-100'}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-bold text-gray-400">#{index + 1}</span>
      </div>
      {/* Operation layout */}
      <div className="font-mono text-right space-y-0.5 mb-3">
        <p className="text-gray-800 text-xl font-bold tracking-wider">{exercise.operands[0].toLocaleString()}</p>
        <p className="text-gray-800 text-xl font-bold tracking-wider">
          <span className="text-blue-500">{symbols[exercise.type]}</span> {exercise.operands[1].toLocaleString()}
        </p>
        <div className="border-t-2 border-gray-400 pt-1">
          <div className="flex items-center justify-end gap-2">
            <input
              type="number"
              className="w-28 bg-gray-50 border border-gray-200 rounded-lg p-2 text-right text-xl font-bold focus:border-blue-400 outline-none"
              value={answer}
              onChange={e => { setAnswer(e.target.value); setChecked(false); }}
              placeholder="?"
            />
            {exercise.type === 'division' && exercise.remainder !== undefined && (
              <div className="flex items-center gap-1">
                <span className="text-gray-400 text-sm">R:</span>
                <input
                  type="number"
                  className="w-14 bg-gray-50 border border-gray-200 rounded-lg p-2 text-center text-lg font-bold focus:border-blue-400 outline-none"
                  value={remainder}
                  onChange={e => { setRemainder(e.target.value); setChecked(false); }}
                  placeholder="?"
                />
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between">
        {!checked ? (
          <motion.button whileTap={{ scale: 0.95 }} onClick={check} disabled={!answer}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-sm font-bold disabled:opacity-30 shadow-md">
            ✓ Yaayasia
          </motion.button>
        ) : (
          <div className="flex items-center gap-2">
            {isCorrect ? (
              <span className="text-emerald-600 text-sm font-bold flex items-center gap-1"><Check className="w-4 h-4" /> Kɔsa!</span>
            ) : (
              <span className="text-red-500 text-sm font-bold flex items-center gap-1">
                <X className="w-4 h-4" /> = {exercise.expected}
                {exercise.remainder !== undefined ? ` R ${exercise.remainder}` : ''}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ClasseCalculView() {
  const { currentLang } = useFitilaLanguage();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [exerciseResults, setExerciseResults] = useState<Record<number, boolean>>({});
  const [showExercises, setShowExercises] = useState(false);
  const progress = getClasseProgress();

  const selected = CALCUL_LESSONS.find(l => l.id === selectedId);
  const exercises = selectedId ? CALCUL_EXERCISES[selectedId] : undefined;

  const handleExerciseResult = (index: number, correct: boolean) => {
    setExerciseResults(prev => ({ ...prev, [index]: correct }));
  };

  const totalCorrect = Object.values(exerciseResults).filter(Boolean).length;
  const totalAnswered = Object.keys(exerciseResults).length;

  const resetExercises = () => {
    setExerciseResults({});
    setShowExercises(false);
    setTimeout(() => setShowExercises(true), 100);
  };

  if (selected) {
    return (
      <div className="space-y-4">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => { setSelectedId(null); setShowExercises(false); setExerciseResults({}); }}
          className="flex items-center gap-1 text-amber-600 text-sm font-bold"
        >
          <ArrowLeft className="w-4 h-4" /> {currentLang === 'ba' ? 'Yeni' : 'Retour'}
        </motion.button>

        <div className="p-4 rounded-3xl bg-gradient-to-br from-blue-100 to-indigo-100 border border-blue-200 shadow-md">
          <div className="flex items-center justify-between">
            <h2 className="text-gray-800 font-black text-xl">{selected.title || `Dooru ${selected.id}`}</h2>
            {progress.calculScores[selected.id] && (
              <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
                {progress.calculScores[selected.id].score}/{progress.calculScores[selected.id].total}
              </span>
            )}
          </div>
        </div>

        {/* Illustration */}
        {selected.images.length > 0 && (
          <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm bg-white">
            <img src={selected.images[0]} alt={selected.title} className="w-full h-auto object-contain max-h-64" />
          </div>
        )}

        {/* Text content */}
        {selected.text && (
          <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm">
            <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line">{selected.text}</p>
          </div>
        )}

        {/* Paragraphs */}
        {selected.paragraphs.length > 0 && !selected.text && (
          <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm space-y-1">
            {selected.paragraphs.map((p, i) => (
              <p key={i} className="text-gray-700 text-sm font-mono">{p}</p>
            ))}
          </div>
        )}

        {/* Sections/questions */}
        {Object.entries(selected.sections).map(([sec, questions]) => (
          <div key={sec} className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm">
            <p className="text-blue-600 text-xs uppercase font-bold mb-2">{sec}</p>
            {(questions as string[]).map((q, i) => (
              <p key={i} className="text-gray-700 text-sm mb-1">{q}</p>
            ))}
          </div>
        ))}

        {/* Interactive exercises */}
        {exercises && (
          <div className="space-y-3">
            {!showExercises ? (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowExercises(true)}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-bold text-lg shadow-lg shadow-blue-200 flex items-center justify-center gap-2"
              >
                🧮 {currentLang === 'ba' ? 'Sɔmaa ko' : 'Faire les exercices'}
              </motion.button>
            ) : (
              <>
                <div className="flex items-center justify-between px-1">
                  <p className="text-gray-700 font-bold text-sm">🧮 {currentLang === 'ba' ? 'Sɔmaa' : 'Exercices'}</p>
                  <motion.button whileTap={{ scale: 0.9 }} onClick={resetExercises}
                    className="flex items-center gap-1 text-blue-500 text-xs font-bold">
                    <RotateCcw className="w-3 h-3" /> {currentLang === 'ba' ? 'Maa ko' : 'Recommencer'}
                  </motion.button>
                </div>

                {exercises.map((ex, i) => (
                  <MathOperationExercise
                    key={`${selectedId}_${i}_${showExercises}`}
                    exercise={ex}
                    index={i}
                    onResult={(correct) => handleExerciseResult(i, correct)}
                  />
                ))}

                {/* Score summary */}
                {totalAnswered === exercises.length && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 text-center space-y-2"
                  >
                    <span className="text-4xl">{totalCorrect === exercises.length ? '🎉' : totalCorrect >= exercises.length / 2 ? '👍' : '💪'}</span>
                    <p className="text-gray-800 font-black text-2xl">{totalCorrect}/{exercises.length}</p>
                    <p className="text-gray-500 text-sm">
                      {totalCorrect === exercises.length
                        ? (currentLang === 'ba' ? 'A kua dee dee!' : 'Parfait !')
                        : (currentLang === 'ba' ? 'A maa sɔmaa ko' : 'Continue à t\'entraîner')}
                    </p>
                    <div className="flex justify-center gap-1">
                      {exercises.map((_, i) => (
                        <div key={i} className={`w-3 h-3 rounded-full ${exerciseResults[i] ? 'bg-emerald-500' : 'bg-red-300'}`} />
                      ))}
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        saveCalculScore(selectedId!, totalCorrect, exercises.length);
                        resetExercises();
                      }}
                      className="mt-2 px-6 py-2 rounded-xl bg-blue-500 text-white text-sm font-bold shadow-md"
                    >
                      <RotateCcw className="w-4 h-4 inline mr-1" /> {currentLang === 'ba' ? 'Maa ko' : 'Recommencer'}
                    </motion.button>
                  </motion.div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {CALCUL_LESSONS.map((lesson, i) => {
        const calcScore = progress.calculScores[lesson.id];
        const hasExercises = !!CALCUL_EXERCISES[lesson.id];
        return (
          <motion.button
            key={lesson.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setSelectedId(lesson.id)}
            className="w-full flex items-center gap-3 p-4 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all"
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-md ${
              calcScore ? 'bg-gradient-to-br from-emerald-400 to-teal-400' : 'bg-gradient-to-br from-blue-400 to-indigo-400'
            }`}>
              <span className="text-2xl">{hasExercises ? '🧮' : '🔢'}</span>
            </div>
            <div className="flex-1 text-left">
              <p className="text-gray-800 font-semibold text-sm">{lesson.title || `Dooru ${lesson.id}`}</p>
              <p className="text-gray-400 text-xs">p.{lesson.page}</p>
            </div>
            {calcScore && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-600 text-xs font-bold">
                {calcScore.score}/{calcScore.total}
              </span>
            )}
            <ChevronRight className="w-4 h-4 text-gray-300" />
          </motion.button>
        );
      })}
    </div>
  );
}