import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useFitilaLanguage } from '@/contexts/FitilaLanguageContext';
import { CLASSE_EVALUATIONS, saveEvaluationScore } from '@/data/classeContent';

interface Props {
  evalId: number;
  onBack: () => void;
}

export default function ClasseEvaluation({ evalId, onBack }: Props) {
  const { currentLang } = useFitilaLanguage();
  const evaluation = CLASSE_EVALUATIONS.find(e => e.id === evalId);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  if (!evaluation) return <p className="text-gray-400">Évaluation introuvable</p>;

  const totalQuestions = evaluation.allQuestions.length;

  const handleSubmit = () => {
    const answered = Object.values(answers).filter(a => a.trim().length > 3).length;
    const pct = totalQuestions > 0 ? Math.round((answered / totalQuestions) * 100) : 0;
    setScore(pct);
    saveEvaluationScore(evalId, pct);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="space-y-6 text-center py-8">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}>
          <span className="text-6xl">{score >= 70 ? '🎉' : score >= 40 ? '📝' : '💪'}</span>
        </motion.div>
        <h2 className="text-gray-800 font-black text-3xl">{score}%</h2>
        <p className="text-gray-500">
          {score >= 70
            ? (currentLang === 'ba' ? 'A kua dee dee!' : 'Excellent travail !')
            : (currentLang === 'ba' ? 'A sãa yɛru' : 'Continue à t\'entraîner')}
        </p>
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden max-w-xs mx-auto">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${score}%` }}
            transition={{ duration: 1, delay: 0.3 }}
            className={`h-full rounded-full ${score >= 70 ? 'bg-emerald-500' : score >= 40 ? 'bg-amber-500' : 'bg-red-400'}`}
          />
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onBack}
          className="px-6 py-3 rounded-xl bg-amber-500 text-white font-bold shadow-lg shadow-amber-200"
        >
          {currentLang === 'ba' ? 'Yeni' : 'Retour'}
        </motion.button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-3xl bg-gradient-to-br from-purple-100 to-pink-100 border border-purple-200 shadow-md">
        <h2 className="text-gray-800 font-black text-xl">{evaluation.title}</h2>
        <p className="text-purple-600 text-sm mt-1">
          {totalQuestions} {currentLang === 'ba' ? 'gari bikiabu' : 'questions'}
        </p>
      </div>

      {/* Questions by section */}
      {Object.entries(evaluation.sections).map(([sec, questions], si) => (
        <div key={si} className="space-y-3">
          <p className="text-gray-500 text-xs uppercase font-bold px-1">{sec}</p>
          {(questions as string[]).map((q, qi) => {
            const key = `${si}_${qi}`;
            return (
              <div key={key} className="p-3 rounded-2xl bg-white border border-gray-100 shadow-sm">
                <p className="text-gray-800 text-sm font-medium mb-2">{qi + 1}. {q}</p>
                <textarea
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2 text-gray-700 text-sm placeholder:text-gray-300 focus:border-purple-400 outline-none resize-none"
                  rows={2}
                  placeholder={currentLang === 'ba' ? 'A yora...' : 'Ta réponse...'}
                  value={answers[key] || ''}
                  onChange={e => setAnswers(prev => ({ ...prev, [key]: e.target.value }))}
                />
              </div>
            );
          })}
        </div>
      ))}

      {/* Writing exercises */}
      {evaluation.writing.length > 0 && (
        <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm">
          <p className="text-gray-500 text-xs uppercase font-bold mb-3">✍️ {currentLang === 'ba' ? 'A yora' : 'Écriture'}</p>
          {evaluation.writing.map((w, i) => (
            <p key={i} className="text-amber-600 text-sm font-mono mb-1">{w}</p>
          ))}
        </div>
      )}

      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={handleSubmit}
        className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-black text-lg shadow-lg shadow-purple-200"
      >
        {currentLang === 'ba' ? 'Yaayasia' : 'Soumettre'}
      </motion.button>
    </div>
  );
}
