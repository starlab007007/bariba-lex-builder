import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, Check, X, RotateCcw } from 'lucide-react';
import { useFitilaLanguage } from '@/contexts/FitilaLanguageContext';
import { GRAMMAR_N2_SECTIONS, GrammarSection, GrammarQuiz } from '@/data/classeContentN2Grammar';

function QuizCard({ quiz, index, lang, onResult }: { quiz: GrammarQuiz; index: number; lang: string; onResult: (c: boolean) => void }) {
  const [selected, setSelected] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);

  const check = (i: number) => {
    if (showResult) return;
    setSelected(i);
    setShowResult(true);
    onResult(i === quiz.correct);
  };

  return (
    <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm">
      <p className="text-gray-700 font-semibold text-sm mb-3">
        {index + 1}. {lang === 'ba' ? quiz.question : quiz.questionFr}
      </p>
      <div className="space-y-2">
        {quiz.options.map((opt, i) => (
          <motion.button
            key={i}
            whileTap={{ scale: 0.98 }}
            onClick={() => check(i)}
            className={`w-full text-left p-3 rounded-xl border text-sm transition-all ${
              showResult
                ? i === quiz.correct
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                  : i === selected
                    ? 'bg-red-50 border-red-300 text-red-700'
                    : 'bg-gray-50 border-gray-100 text-gray-400'
                : 'bg-gray-50 border-gray-200 hover:border-indigo-300 text-gray-700'
            }`}
          >
            <span className="font-bold mr-2">{String.fromCharCode(65 + i)}.</span>
            {opt}
            {showResult && i === quiz.correct && <Check className="w-4 h-4 inline ml-2 text-emerald-500" />}
            {showResult && i === selected && i !== quiz.correct && <X className="w-4 h-4 inline ml-2 text-red-500" />}
          </motion.button>
        ))}
      </div>
      {showResult && (
        <motion.p initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="mt-3 text-xs text-indigo-600 bg-indigo-50 p-2 rounded-lg">
          💡 {lang === 'ba' ? (quiz.explanation || '') : (quiz.explanationFr || '')}
        </motion.p>
      )}
    </div>
  );
}

export default function ClasseGrammaireN2() {
  const { currentLang } = useFitilaLanguage();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'content' | 'quiz'>('content');
  const [scores, setScores] = useState<Record<string, { correct: number; total: number }>>({});

  const toggle = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
    setActiveTab('content');
  };

  const handleQuizResult = (sectionId: string, correct: boolean) => {
    setScores(prev => {
      const cur = prev[sectionId] || { correct: 0, total: 0 };
      return { ...prev, [sectionId]: { correct: cur.correct + (correct ? 1 : 0), total: cur.total + 1 } };
    });
  };

  return (
    <div className="space-y-3">
      {/* Header stats */}
      <div className="flex gap-2 mb-4">
        <div className="flex-1 p-3 rounded-2xl bg-white shadow-sm border border-gray-100 text-center">
          <p className="text-2xl font-black text-indigo-600">{GRAMMAR_N2_SECTIONS.length}</p>
          <p className="text-gray-400 text-[10px]">{currentLang === 'ba' ? 'Garibu' : 'Sections'}</p>
        </div>
        <div className="flex-1 p-3 rounded-2xl bg-white shadow-sm border border-gray-100 text-center">
          <p className="text-2xl font-black text-emerald-600">{GRAMMAR_N2_SECTIONS.reduce((s, sec) => s + sec.quiz.length, 0)}</p>
          <p className="text-gray-400 text-[10px]">Quiz</p>
        </div>
        <div className="flex-1 p-3 rounded-2xl bg-white shadow-sm border border-gray-100 text-center">
          <p className="text-2xl font-black text-amber-600">{Object.keys(scores).length}</p>
          <p className="text-gray-400 text-[10px]">{currentLang === 'ba' ? 'Kobu' : 'Complétés'}</p>
        </div>
      </div>

      {/* Sections */}
      {GRAMMAR_N2_SECTIONS.map((section) => {
        const isExpanded = expandedId === section.id;
        const score = scores[section.id];

        return (
          <motion.div key={section.id} layout className="rounded-3xl overflow-hidden border border-gray-100 shadow-sm bg-white">
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => toggle(section.id)}
              className="w-full flex items-center gap-3 p-4"
            >
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${section.gradient} flex items-center justify-center shadow-md`}>
                <span className="text-2xl">{section.emoji}</span>
              </div>
              <div className="flex-1 text-left">
                <p className="text-gray-800 font-bold text-sm">{currentLang === 'ba' ? section.title : section.titleFr}</p>
                <p className="text-gray-400 text-xs">{section.quiz.length} quiz • {section.content.length} {currentLang === 'ba' ? 'garibu' : 'blocs'}</p>
              </div>
              {score && (
                <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${score.correct === score.total ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                  {score.correct}/{score.total}
                </span>
              )}
              {isExpanded ? <ChevronDown className="w-5 h-5 text-gray-300" /> : <ChevronRight className="w-5 h-5 text-gray-300" />}
            </motion.button>

            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  {/* Tab bar */}
                  <div className="flex gap-2 px-4 pb-3">
                    <button
                      onClick={() => setActiveTab('content')}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'content' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-50 text-gray-400'}`}
                    >
                      📖 {currentLang === 'ba' ? 'Gari' : 'Contenu'}
                    </button>
                    <button
                      onClick={() => setActiveTab('quiz')}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'quiz' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-50 text-gray-400'}`}
                    >
                      🧠 Quiz ({section.quiz.length})
                    </button>
                  </div>

                  <div className="px-4 pb-4 space-y-3">
                    {activeTab === 'content' && section.content.map((block, bi) => (
                      <div key={bi} className="rounded-2xl bg-gray-50 p-3">
                        {block.title && (
                          <h4 className="text-gray-700 font-bold text-xs mb-2 flex items-center gap-1">
                            {block.type === 'rule' && '📐'} {block.type === 'table' && '📊'} {block.type === 'list' && '📋'} {block.type === 'example' && '💡'}
                            {' '}{currentLang === 'ba' ? block.title : (block.titleFr || block.title)}
                          </h4>
                        )}

                        {(block.type === 'text' || block.type === 'rule' || block.type === 'example') && (
                          <p className="text-gray-600 text-xs leading-relaxed whitespace-pre-line">
                            {currentLang === 'ba' ? block.content : (block.contentFr || block.content)}
                          </p>
                        )}

                        {block.type === 'list' && (
                          <ul className="space-y-1">
                            {(currentLang === 'ba' ? block.items : (block.itemsFr || block.items))?.map((item, ii) => (
                              <li key={ii} className="text-gray-600 text-xs flex items-start gap-2">
                                <span className="text-indigo-400 mt-0.5">●</span>
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        )}

                        {block.type === 'table' && block.headers && block.rows && (
                          <div className="overflow-x-auto -mx-1">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="bg-indigo-50">
                                  {block.headers.map((h, hi) => (
                                    <th key={hi} className="p-2 text-left text-indigo-700 font-bold border-b border-indigo-100">{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {block.rows.map((row, ri) => (
                                  <tr key={ri} className={ri % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                    {row.map((cell, ci) => (
                                      <td key={ci} className="p-2 text-gray-600 border-b border-gray-100">{cell}</td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    ))}

                    {activeTab === 'quiz' && (
                      <div className="space-y-3">
                        {section.quiz.map((q, qi) => (
                          <QuizCard
                            key={qi}
                            quiz={q}
                            index={qi}
                            lang={currentLang}
                            onResult={(c) => handleQuizResult(section.id, c)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}
