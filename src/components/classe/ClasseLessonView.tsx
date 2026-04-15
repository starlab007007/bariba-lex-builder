import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Check, X } from 'lucide-react';
import { useFitilaLanguage } from '@/contexts/FitilaLanguageContext';
import { CLASSE_LESSONS, markLessonComplete } from '@/data/classeContent';

interface Props {
  lessonId: number;
  onNext: () => void;
  onPrev: () => void;
}

type Tab = 'text' | 'observe' | 'ecoute' | 'reagis' | 'retiens' | 'phonetics';

export default function ClasseLessonView({ lessonId, onNext, onPrev }: Props) {
  const { currentLang } = useFitilaLanguage();
  const lesson = CLASSE_LESSONS.find(l => l.id === lessonId);
  const [activeTab, setActiveTab] = useState<Tab>('text');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<Record<string, 'correct' | 'wrong'>>({});

  if (!lesson) return <p className="text-gray-400">Leçon introuvable</p>;

  const tabs: { id: Tab; label: string; emoji: string; show: boolean }[] = [
    { id: 'text', label: currentLang === 'ba' ? 'Gari' : 'Texte', emoji: '📖', show: true },
    { id: 'observe', label: 'Mɛɛrio', emoji: '👁️', show: lesson.sections.observe.length > 0 },
    { id: 'ecoute', label: 'Faagi', emoji: '🎧', show: lesson.sections.ecoute.length > 0 },
    { id: 'reagis', label: 'Geruo', emoji: '💬', show: lesson.sections.reagis.length > 0 },
    { id: 'retiens', label: 'Weenɛ', emoji: '🧠', show: lesson.sections.retiens.length > 0 },
    { id: 'phonetics', label: 'Sɔ̃ɔsiru', emoji: '✍️', show: !!lesson.phonetics },
  ];

  const handleComplete = () => {
    markLessonComplete(lessonId);
    onNext();
  };

  const checkWord = (key: string, expected: string) => {
    const val = (answers[key] || '').trim().toLowerCase();
    setFeedback(prev => ({ ...prev, [key]: val === expected.toLowerCase() ? 'correct' : 'wrong' }));
  };

  const renderQuestions = (questions: string[], prefix: string, title: string, emoji: string) => (
    <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm space-y-3">
      <p className="text-gray-500 text-xs uppercase font-bold">{emoji} {title}</p>
      {questions.map((q, i) => (
        <div key={i}>
          <p className="text-gray-800 text-sm font-medium mb-1">{q}</p>
          <textarea
            className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-gray-700 text-sm placeholder:text-gray-300 focus:border-amber-400 focus:ring-1 focus:ring-amber-200 outline-none resize-none"
            rows={2}
            placeholder={currentLang === 'ba' ? 'A yora...' : 'Ta réponse...'}
            value={answers[`${prefix}_${i}`] || ''}
            onChange={e => setAnswers(prev => ({ ...prev, [`${prefix}_${i}`]: e.target.value }))}
          />
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Lesson header */}
      <div className="p-4 rounded-3xl bg-gradient-to-br from-amber-100 to-orange-100 border border-amber-200 shadow-md">
        <div className="flex items-center gap-2 mb-2">
          <span className="px-2.5 py-0.5 rounded-full bg-amber-200 text-amber-800 text-xs font-bold">
            {currentLang === 'ba' ? 'Gari' : 'Leçon'} {lesson.id}
          </span>
          <span className="text-amber-600/60 text-xs">{lesson.themeLabel}</span>
        </div>
        <h2 className="text-gray-800 font-black text-xl">{lesson.title}</h2>
        {lesson.phonetics && (
          <p className="text-amber-700/70 text-sm mt-1">
            {lesson.phonetics.label}
          </p>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        {tabs.filter(t => t.show).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-amber-500 text-white shadow-md shadow-amber-200'
                : 'bg-white text-gray-500 border border-gray-200'
            }`}
          >
            <span>{tab.emoji}</span> {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        {activeTab === 'text' && (
          <div className="space-y-4">
            {/* Illustration */}
            {lesson.imageUrl && (
              <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm bg-white">
                <img src={lesson.imageUrl} alt={lesson.title} className="w-full h-auto object-contain max-h-72" />
              </div>
            )}
            {/* Narrative text */}
            <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm">
              <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line">{lesson.text}</p>
            </div>
          </div>
        )}

        {activeTab === 'observe' && renderQuestions(
          lesson.sections.observe, 'obs',
          currentLang === 'ba' ? 'A mɛɛrio' : 'Observe',
          '👁️'
        )}

        {activeTab === 'ecoute' && renderQuestions(
          lesson.sections.ecoute, 'eco',
          currentLang === 'ba' ? 'A faagi yeni swaa dakio' : 'Écoute et réponds',
          '🎧'
        )}

        {activeTab === 'reagis' && renderQuestions(
          lesson.sections.reagis, 'rea',
          currentLang === 'ba' ? 'A wunɛn yam waaru geruo' : 'Réagis',
          '💬'
        )}

        {activeTab === 'retiens' && renderQuestions(
          lesson.sections.retiens, 'ret',
          currentLang === 'ba' ? 'Yè n weenɛ a n yã' : 'Retiens',
          '🧠'
        )}

        {activeTab === 'phonetics' && lesson.phonetics && (
          <div className="space-y-4">
            {/* Reading exercises */}
            <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm">
              <p className="text-gray-500 text-xs uppercase font-bold mb-3">📖 {lesson.phonetics.label}</p>
              <div className="space-y-1.5">
                {lesson.phonetics.reading.map((line, i) => (
                  <p key={i} className="text-gray-800 text-lg font-mono tracking-wider">{line}</p>
                ))}
              </div>
            </div>

            {/* Writing exercises */}
            {lesson.phonetics.writing.length > 0 && (
              <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm">
                <p className="text-gray-500 text-xs uppercase font-bold mb-3">✍️ {currentLang === 'ba' ? 'A yora mɛɛrio' : 'Exercices d\'écriture'}</p>
                <div className="space-y-2">
                  {lesson.phonetics.writing.map((w, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-amber-600 text-lg font-bold min-w-[80px] font-mono">{w}</span>
                      <input
                        type="text"
                        className="flex-1 bg-gray-50 border border-gray-200 rounded-xl p-2 text-gray-700 text-sm placeholder:text-gray-300 focus:border-amber-400 outline-none"
                        placeholder={currentLang === 'ba' ? 'Yore...' : 'Écris...'}
                        value={answers[`wr_${i}`] || ''}
                        onChange={e => setAnswers(prev => ({ ...prev, [`wr_${i}`]: e.target.value }))}
                        onBlur={() => checkWord(`wr_${i}`, w)}
                      />
                      {feedback[`wr_${i}`] === 'correct' && <Check className="w-5 h-5 text-emerald-500" />}
                      {feedback[`wr_${i}`] === 'wrong' && <X className="w-5 h-5 text-red-400" />}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* Navigation */}
      <div className="flex gap-3 pt-4 border-t border-gray-200">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onPrev}
          disabled={lessonId <= 1}
          className="flex items-center gap-1 px-4 py-3 rounded-xl bg-white border border-gray-200 text-gray-600 text-sm font-medium disabled:opacity-30 shadow-sm"
        >
          <ChevronLeft className="w-4 h-4" /> {currentLang === 'ba' ? 'Yeni' : 'Précédent'}
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleComplete}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-bold shadow-lg shadow-amber-200"
        >
          <Check className="w-4 h-4" /> {currentLang === 'ba' ? 'Kobu kpa a sãa' : 'Terminer & Suivant'}
          <ChevronRight className="w-4 h-4" />
        </motion.button>
      </div>
    </div>
  );
}
