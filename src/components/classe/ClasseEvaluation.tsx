import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { RotateCcw, Check, X, Trophy } from 'lucide-react';
import BaribaSmartTextarea from './BaribaSmartTextarea';
import StudentAnswerFeedback from './StudentAnswerFeedback';
import { useFitilaLanguage } from '@/contexts/FitilaLanguageContext';
import { CLASSE_EVALUATIONS, saveEvaluationScore, getClasseProgress } from '@/data/classeContent';
import { syncEvaluation, syncAnswer } from '@/lib/classeSync';
import ListenButton from '@/components/classe/ListenButton';

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
  const progress = getClasseProgress();
  const bestScore = progress.evaluationBest?.[evalId];

  if (!evaluation) return <p className="text-gray-400">Évaluation introuvable</p>;

  const totalQuestions = evaluation.allQuestions.length;

  const handleSubmit = () => {
    const answered = Object.values(answers).filter(a => a.trim().length > 3).length;
    const pct = totalQuestions > 0 ? Math.round((answered / totalQuestions) * 100) : 0;
    setScore(pct);
    saveEvaluationScore(evalId, pct);
    void syncEvaluation('N1', String(evalId), pct);
    Object.entries(answers).forEach(([key, value]) => {
      const [si, qi] = key.split('_');
      syncAnswer({ level: 'N1', module: 'evaluation', lessonId: String(evalId), sectionKey: si, questionIdx: Number(qi), answerText: value });
    });
    setSubmitted(true);
  };

  const handleRetry = () => {
    setAnswers({});
    setSubmitted(false);
    setScore(0);
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

        {/* Score bar */}
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden max-w-xs mx-auto">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${score}%` }}
            transition={{ duration: 1, delay: 0.3 }}
            className={`h-full rounded-full ${score >= 70 ? 'bg-emerald-500' : score >= 40 ? 'bg-amber-500' : 'bg-red-400'}`}
          />
        </div>

        {/* Best score */}
        {bestScore !== undefined && (
          <div className="flex items-center justify-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            <span className="text-gray-500 text-sm">
              {currentLang === 'ba' ? 'Gee bakan buru:' : 'Meilleur score :'} <span className="font-bold text-amber-600">{bestScore}%</span>
            </span>
          </div>
        )}

        {/* Points earned */}
        <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto">
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
            <p className="text-emerald-700 font-black text-xl">
              {Object.values(answers).filter(a => a.trim().length > 3).length}
            </p>
            <p className="text-emerald-600 text-[10px]">{currentLang === 'ba' ? 'Swaa daki' : 'Répondu'}</p>
          </div>
          <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-center">
            <p className="text-gray-700 font-black text-xl">{totalQuestions}</p>
            <p className="text-gray-500 text-[10px]">{currentLang === 'ba' ? 'Bikiabu' : 'Total'}</p>
          </div>
        </div>

        {/* Corrigés enseignant par question */}
        <div className="text-left max-w-2xl mx-auto space-y-3 mt-4">
          <h3 className="text-sm font-bold text-gray-700 px-1">📚 Corrigés et notes</h3>
          {Object.entries(evaluation.sections).map(([sec, questions], si) => (
            (questions as string[]).map((q, qi) => {
              const key = `${si}_${qi}`;
              return (
                <div key={key} className="p-3 rounded-xl bg-white border border-gray-100 text-left">
                  <p className="text-xs text-gray-500 mb-1">{sec} · Q{qi + 1}</p>
                  <p className="text-sm text-gray-800 mb-1">{q}</p>
                  {answers[key] && (
                    <p className="text-xs text-blue-700 italic">Ta réponse : {answers[key]}</p>
                  )}
                  <StudentAnswerFeedback
                    level="N1"
                    module="evaluation"
                    lesson_id={String(evalId)}
                    section_key={String(si)}
                    question_idx={qi}
                    studentAnswer={answers[key]}
                  />
                </div>
              );
            })
          ))}
        </div>

        <div className="flex gap-3 justify-center">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleRetry}
            className="px-5 py-3 rounded-xl bg-white border border-gray-200 text-gray-700 font-bold shadow-sm flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" /> {currentLang === 'ba' ? 'Maa ko' : 'Refaire'}
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onBack}
            className="px-5 py-3 rounded-xl bg-amber-500 text-white font-bold shadow-lg shadow-amber-200"
          >
            {currentLang === 'ba' ? 'Yeni' : 'Retour'}
          </motion.button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-3xl bg-gradient-to-br from-purple-100 to-pink-100 border border-purple-200 shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-gray-800 font-black text-xl">{evaluation.title}</h2>
              <ListenButton contentKey={`classe/N1/eval/${evalId}/title`} size="sm" />
            </div>
            <p className="text-purple-600 text-sm mt-1">
              {totalQuestions} {currentLang === 'ba' ? 'gari bikiabu' : 'questions'}
            </p>
          </div>
          {bestScore !== undefined && (
            <div className="flex items-center gap-1">
              <Trophy className="w-4 h-4 text-amber-500" />
              <span className="text-amber-600 text-sm font-bold">{bestScore}%</span>
            </div>
          )}
        </div>
      </div>

      {/* Progress indicator */}
      <div className="flex items-center gap-2 px-1">
        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all"
            style={{ width: `${totalQuestions > 0 ? Math.round((Object.values(answers).filter(a => a.trim().length > 0).length / totalQuestions) * 100) : 0}%` }}
          />
        </div>
        <span className="text-gray-400 text-xs font-bold">
          {Object.values(answers).filter(a => a.trim().length > 0).length}/{totalQuestions}
        </span>
      </div>

      {/* Questions by section */}
      {Object.entries(evaluation.sections).map(([sec, questions], si) => (
        <div key={si} className="space-y-3">
          <p className="text-gray-500 text-xs uppercase font-bold px-1">{sec}</p>
          {(questions as string[]).map((q, qi) => {
            const key = `${si}_${qi}`;
            return (
              <div key={key} className="p-3 rounded-2xl bg-white border border-gray-100 shadow-sm">
                <div className="flex items-start gap-2 mb-2">
                  <p className="text-gray-800 text-sm font-medium flex-1">{qi + 1}. {q}</p>
                  <ListenButton contentKey={`classe/N1/eval/${evalId}/${sec}/${qi}`} size="sm" />
                </div>
                <BaribaSmartTextarea
                  className="bg-gray-50 border-gray-200 focus:border-purple-400"
                  rows={2}
                  placeholder={currentLang === 'ba' ? 'A yora...' : 'Ta réponse...'}
                  value={answers[key] || ''}
                  onChange={(val) => setAnswers(prev => ({ ...prev, [key]: val }))}
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

      {/* Images */}
      {evaluation.images.length > 0 && (
        <div className="space-y-2">
          {evaluation.images.map((img, i) => (
            <div key={i} className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm bg-white">
              <img src={img} alt={`Évaluation ${evalId}`} className="w-full h-auto object-contain max-h-48" />
            </div>
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