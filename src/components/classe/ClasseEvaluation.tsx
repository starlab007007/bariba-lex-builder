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

  if (!evaluation) return <p className="text-white/60">Évaluation introuvable</p>;

  const totalQuestions = evaluation.sections.reduce((sum, s) => sum + s.questions.length, 0);

  const handleSubmit = () => {
    // Simple scoring: each answered question = 1 point
    const answered = Object.values(answers).filter(a => a.trim().length > 3).length;
    const pct = Math.round((answered / totalQuestions) * 100);
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
        <h2 className="text-white font-black text-3xl">{score}%</h2>
        <p className="text-white/60">
          {score >= 70
            ? (currentLang === 'ba' ? 'A kua dee dee!' : 'Excellent travail !')
            : (currentLang === 'ba' ? 'A sáa yäru' : 'Continue à t\'entraîner')}
        </p>
        <div className="h-3 bg-white/10 rounded-full overflow-hidden max-w-xs mx-auto">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${score}%` }}
            transition={{ duration: 1, delay: 0.3 }}
            className={`h-full rounded-full ${score >= 70 ? 'bg-emerald-500' : score >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
          />
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onBack}
          className="px-6 py-3 rounded-xl bg-amber-500 text-white font-bold"
        >
          {currentLang === 'ba' ? 'Yeni' : 'Retour'}
        </motion.button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30">
        <h2 className="text-white font-black text-xl">{evaluation.title}</h2>
        <p className="text-purple-300 text-sm mt-1">
          {totalQuestions} {currentLang === 'ba' ? 'gari bikiabu' : 'questions'}
        </p>
      </div>

      {evaluation.sections.map((section, si) => (
        <div key={si} className="space-y-3">
          <p className="text-white/60 text-xs uppercase font-bold px-1">{section.label}</p>
          {section.questions.map((q, qi) => {
            const key = `${si}_${qi}`;
            return (
              <div key={key} className="p-3 rounded-xl bg-white/5 border border-white/10">
                <p className="text-white text-sm font-medium mb-2">{qi + 1}. {q}</p>
                <textarea
                  className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white text-sm placeholder:text-white/30 focus:border-purple-500/50 outline-none resize-none"
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

      {/* Dictation */}
      {evaluation.dictation && (
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <p className="text-white/60 text-xs uppercase font-bold mb-3">📝 {currentLang === 'ba' ? 'Gari yoran yorubu' : 'Dictée'}</p>
          {evaluation.dictation.map((d, i) => (
            <div key={i} className="mt-2 p-2 rounded-lg bg-white/5">
              <p className="text-amber-300 text-sm">{d}</p>
            </div>
          ))}
        </div>
      )}

      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={handleSubmit}
        className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-black text-lg"
      >
        {currentLang === 'ba' ? 'Yaayasia' : 'Soumettre'}
      </motion.button>
    </div>
  );
}
