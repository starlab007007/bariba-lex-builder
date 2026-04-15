import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Eye, Headphones, MessageCircle, Brain, PenTool, Check, X } from 'lucide-react';
import { useFitilaLanguage } from '@/contexts/FitilaLanguageContext';
import { CLASSE_LESSONS, markLessonComplete } from '@/data/classeContent';

interface Props {
  lessonId: number;
  onNext: () => void;
  onPrev: () => void;
}

type Tab = 'observe' | 'ecoute' | 'reagis' | 'retiens' | 'entraine';

export default function ClasseLessonView({ lessonId, onNext, onPrev }: Props) {
  const { currentLang } = useFitilaLanguage();
  const lesson = CLASSE_LESSONS.find(l => l.id === lessonId);
  const [activeTab, setActiveTab] = useState<Tab>('observe');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<Record<string, 'correct' | 'wrong' | null>>({});

  if (!lesson) return <p className="text-white/60">Leçon introuvable</p>;

  const tabs: { id: Tab; icon: React.ReactNode; label: string; emoji: string }[] = [
    { id: 'observe', icon: <Eye className="w-4 h-4" />, label: currentLang === 'ba' ? 'Meeri' : 'Observe', emoji: '👁️' },
    { id: 'ecoute', icon: <Headphones className="w-4 h-4" />, label: currentLang === 'ba' ? 'Deri' : 'Écoute', emoji: '🎧' },
    { id: 'reagis', icon: <MessageCircle className="w-4 h-4" />, label: currentLang === 'ba' ? 'Gari' : 'Réagis', emoji: '💬' },
    { id: 'retiens', icon: <Brain className="w-4 h-4" />, label: currentLang === 'ba' ? 'Weenæ' : 'Retiens', emoji: '🧠' },
    { id: 'entraine', icon: <PenTool className="w-4 h-4" />, label: currentLang === 'ba' ? 'Yäru' : 'Entraîne-toi', emoji: '✍️' },
  ];

  const handleComplete = () => {
    markLessonComplete(lessonId);
    onNext();
  };

  const checkWord = (key: string, expected: string) => {
    const val = (answers[key] || '').trim().toLowerCase();
    setFeedback(prev => ({ ...prev, [key]: val === expected.toLowerCase() ? 'correct' : 'wrong' }));
  };

  return (
    <div className="space-y-4">
      {/* Lesson header */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30">
        <div className="flex items-center gap-2 mb-2">
          <span className="px-2 py-0.5 rounded-full bg-amber-500/30 text-amber-300 text-xs font-bold">
            {currentLang === 'ba' ? 'Gari' : 'Leçon'} {lesson.id}
          </span>
          <span className="text-white/40 text-xs">{lesson.themeLabel}</span>
        </div>
        <h2 className="text-white font-black text-xl">{lesson.title}</h2>
        <p className="text-amber-300/80 text-sm mt-1">
          {currentLang === 'ba' ? 'Sóøsiru' : 'Lettres'}: <span className="font-bold">{lesson.letters}</span>
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === tab.id ? 'bg-amber-500 text-white' : 'bg-white/10 text-white/50'
            }`}
          >
            <span>{tab.emoji}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        {activeTab === 'observe' && (
          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <p className="text-white/60 text-xs mb-2 uppercase font-bold">👁️ {currentLang === 'ba' ? 'Meeri kpa a gari' : 'Observe et réponds'}</p>
              {lesson.observe.length > 0 ? (
                lesson.observe.map((q, i) => (
                  <div key={i} className="mt-3">
                    <p className="text-white text-sm font-medium mb-2">{i + 1}. {q}</p>
                    <textarea
                      className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white text-sm placeholder:text-white/30 focus:border-amber-500/50 outline-none resize-none"
                      rows={2}
                      placeholder={currentLang === 'ba' ? 'A yora...' : 'Ta réponse...'}
                      value={answers[`obs_${i}`] || ''}
                      onChange={e => setAnswers(prev => ({ ...prev, [`obs_${i}`]: e.target.value }))}
                    />
                  </div>
                ))
              ) : (
                <p className="text-white/40 text-sm italic">{currentLang === 'ba' ? 'Meeri fotoba ye' : 'Observe l\'illustration de la leçon'}</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'ecoute' && (
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
            <p className="text-white/60 text-xs uppercase font-bold">🎧 {currentLang === 'ba' ? 'Deri kpa a yora' : 'Écoute et réponds'}</p>
            {lesson.ecoute.length > 0 ? (
              lesson.ecoute.map((q, i) => (
                <div key={i} className="mt-2">
                  <p className="text-white text-sm">{q}</p>
                  <input
                    type="text"
                    className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white text-sm placeholder:text-white/30 focus:border-amber-500/50 outline-none"
                    placeholder={currentLang === 'ba' ? 'A yora...' : 'Ta réponse...'}
                  />
                </div>
              ))
            ) : (
              <div className="text-center py-6">
                <span className="text-4xl">🔊</span>
                <p className="text-white/40 text-sm mt-2">{currentLang === 'ba' ? 'Deri sóøsio u gari ye' : 'Écoute le texte de la leçon'}</p>
                <p className="text-white/30 text-xs mt-1">{lesson.text}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'reagis' && (
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
            <p className="text-white/60 text-xs uppercase font-bold">💬 {currentLang === 'ba' ? 'Gari yè a n weenæ' : 'Réagis'}</p>
            {lesson.reagis.length > 0 ? (
              lesson.reagis.map((q, i) => (
                <div key={i} className="mt-2">
                  <p className="text-white text-sm font-medium">{q}</p>
                  <textarea
                    className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white text-sm placeholder:text-white/30 focus:border-amber-500/50 outline-none resize-none"
                    rows={3}
                    placeholder={currentLang === 'ba' ? 'A yam waaru...' : 'Ton avis...'}
                    value={answers[`rea_${i}`] || ''}
                    onChange={e => setAnswers(prev => ({ ...prev, [`rea_${i}`]: e.target.value }))}
                  />
                </div>
              ))
            ) : (
              <p className="text-white/40 text-sm italic">{currentLang === 'ba' ? 'Gari yè a n weenæ' : 'Discute du thème avec ton groupe'}</p>
            )}
          </div>
        )}

        {activeTab === 'retiens' && (
          <div className="p-6 rounded-2xl bg-gradient-to-br from-purple-500/20 to-indigo-500/20 border border-purple-500/30 text-center">
            <span className="text-4xl">🧠</span>
            <p className="text-white/60 text-xs uppercase font-bold mt-3">{currentLang === 'ba' ? 'Weenæ' : 'Retiens'}</p>
            <p className="text-white font-black text-2xl mt-3">{lesson.retiens}</p>
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-white/60 text-sm">
              <span>🔊</span> {currentLang === 'ba' ? 'Deri' : 'Écouter'}
            </div>
          </div>
        )}

        {activeTab === 'entraine' && (
          <div className="space-y-4">
            {/* Syllables */}
            {lesson.entraineToi.syllables.length > 0 && (
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <p className="text-white/60 text-xs uppercase font-bold mb-3">{currentLang === 'ba' ? 'Gømbi' : 'Syllabes'}</p>
                <div className="flex flex-wrap gap-2">
                  {lesson.entraineToi.syllables.map((s, i) => (
                    <span key={i} className="px-4 py-2 rounded-xl bg-amber-500/20 text-amber-300 text-lg font-bold">{s}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Words */}
            {lesson.entraineToi.words.length > 0 && (
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <p className="text-white/60 text-xs uppercase font-bold mb-3">{currentLang === 'ba' ? 'Gari yari' : 'Mots'}</p>
                <div className="space-y-2">
                  {lesson.entraineToi.words.map((w, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-white text-lg font-bold min-w-[80px]">{w}</span>
                      <input
                        type="text"
                        className="flex-1 bg-white/5 border border-white/10 rounded-lg p-2 text-white text-sm placeholder:text-white/30 focus:border-amber-500/50 outline-none"
                        placeholder={currentLang === 'ba' ? 'Yore...' : 'Écris ce mot...'}
                        value={answers[`word_${i}`] || ''}
                        onChange={e => setAnswers(prev => ({ ...prev, [`word_${i}`]: e.target.value }))}
                        onBlur={() => checkWord(`word_${i}`, w)}
                      />
                      {feedback[`word_${i}`] === 'correct' && <Check className="w-5 h-5 text-emerald-400" />}
                      {feedback[`word_${i}`] === 'wrong' && <X className="w-5 h-5 text-red-400" />}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Phrases */}
            {lesson.entraineToi.phrases.length > 0 && (
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <p className="text-white/60 text-xs uppercase font-bold mb-3">{currentLang === 'ba' ? 'Gari koru' : 'Phrases'}</p>
                {lesson.entraineToi.phrases.map((p, i) => (
                  <div key={i} className="mt-2 p-3 rounded-lg bg-white/5">
                    <p className="text-amber-300 text-sm font-medium">{p}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* Navigation */}
      <div className="flex gap-3 pt-4 border-t border-white/10">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onPrev}
          disabled={lessonId <= 1}
          className="flex items-center gap-1 px-4 py-3 rounded-xl bg-white/10 text-white text-sm font-medium disabled:opacity-30"
        >
          <ChevronLeft className="w-4 h-4" /> {currentLang === 'ba' ? 'Yeni' : 'Précédent'}
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleComplete}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-bold"
        >
          <Check className="w-4 h-4" /> {currentLang === 'ba' ? 'Kobu kpa a sáa' : 'Terminer & Suivant'}
          <ChevronRight className="w-4 h-4" />
        </motion.button>
      </div>
    </div>
  );
}
