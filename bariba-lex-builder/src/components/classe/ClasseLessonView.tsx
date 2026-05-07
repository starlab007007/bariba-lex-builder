import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Check, X, Star, Eye } from 'lucide-react';
import BaribaSmartTextarea from './BaribaSmartTextarea';
import UniversalAnswerCard from './UniversalAnswerCard';
import { useFitilaLanguage } from '@/contexts/FitilaLanguageContext';
import { CLASSE_LESSONS, LESSON_ANSWERS, markLessonComplete, markTabComplete, getLessonStars, getClasseProgress } from '@/data/classeContent';
import ListenButton from './ListenButton';

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
  const [showCorrection, setShowCorrection] = useState<Record<string, boolean>>({});
  const [sectionScores, setSectionScores] = useState<Record<string, { correct: number; total: number }>>({});

  if (!lesson) return <p className="text-gray-400">Leçon introuvable</p>;

  const stars = getLessonStars(lessonId);
  const progress = getClasseProgress();
  const expectedAnswers = LESSON_ANSWERS[lessonId];

  const tabs: { id: Tab; label: string; emoji: string; show: boolean }[] = [
    { id: 'text', label: currentLang === 'ba' ? 'Gari' : 'Texte', emoji: '📖', show: true },
    { id: 'observe', label: 'Mɛɛrio', emoji: '👁️', show: lesson.sections.observe.length > 0 },
    { id: 'ecoute', label: 'Faagi', emoji: '🎧', show: lesson.sections.ecoute.length > 0 },
    { id: 'reagis', label: 'Geruo', emoji: '💬', show: lesson.sections.reagis.length > 0 },
    { id: 'retiens', label: 'Weenɛ', emoji: '🧠', show: lesson.sections.retiens.length > 0 },
    { id: 'phonetics', label: 'Sɔ̃ɔsiru', emoji: '✍️', show: !!lesson.phonetics },
  ];

  const visibleTabs = tabs.filter(t => t.show);

  const goToNextTab = () => {
    const idx = visibleTabs.findIndex(t => t.id === activeTab);
    if (idx >= 0 && idx < visibleTabs.length - 1) {
      setActiveTab(visibleTabs[idx + 1].id);
      // Scroll to top of tab content for clarity
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return true;
    }
    return false;
  };

  const handleComplete = () => {
    markLessonComplete(lessonId);
    markTabComplete(lessonId, activeTab);
    onNext();
  };

  const checkWord = (key: string, expected: string) => {
    const val = (answers[key] || '').trim().toLowerCase();
    setFeedback(prev => ({ ...prev, [key]: val === expected.toLowerCase() ? 'correct' : 'wrong' }));
  };

  const verifySection = (prefix: string, questions: string[]) => {
    const answersForSection = questions.map((_, i) => answers[`${prefix}_${i}`] || '');
    const expectedForSection = expectedAnswers?.[prefix as keyof typeof expectedAnswers] as string[] | undefined;
    
    let correct = 0;
    const total = questions.length;
    
    if (expectedForSection) {
      answersForSection.forEach((ans, i) => {
        const exp = expectedForSection[i] || '';
        const key = `${prefix}_${i}`;
        const ansNorm = ans.trim().toLowerCase();
        if (ansNorm.length > 3) {
          // Check if the answer contains key words from expected
          const expWords = exp.toLowerCase().split(/\s+/).filter(w => w.length > 3);
          const matchCount = expWords.filter(w => ansNorm.includes(w)).length;
          if (matchCount >= Math.max(1, Math.floor(expWords.length * 0.3))) {
            correct++;
            setFeedback(prev => ({ ...prev, [key]: 'correct' }));
          } else {
            setFeedback(prev => ({ ...prev, [key]: 'wrong' }));
          }
        } else {
          setFeedback(prev => ({ ...prev, [key]: 'wrong' }));
        }
        setShowCorrection(prev => ({ ...prev, [key]: true }));
      });
    } else {
      // No expected answers — count filled answers as "correct"
      answersForSection.forEach((ans, i) => {
        const key = `${prefix}_${i}`;
        if (ans.trim().length > 3) {
          correct++;
          setFeedback(prev => ({ ...prev, [key]: 'correct' }));
        }
      });
    }

    setSectionScores(prev => ({ ...prev, [prefix]: { correct, total } }));
    
    if (correct >= Math.ceil(total * 0.5)) {
      markTabComplete(lessonId, prefix === 'obs' ? 'observe' : prefix === 'eco' ? 'ecoute' : prefix === 'rea' ? 'reagis' : 'retiens');
    }
  };

  const getTabKey = (tab: Tab): string => {
    if (tab === 'observe') return 'obs';
    if (tab === 'ecoute') return 'eco';
    if (tab === 'reagis') return 'rea';
    if (tab === 'retiens') return 'ret';
    return tab;
  };

  const renderQuestions = (questions: string[], prefix: string, title: string, emoji: string) => {
    const score = sectionScores[prefix];
    const sectionKeyMap: Record<string, string> = { obs: 'observe', eco: 'ecoute', rea: 'reagis', ret: 'retiens' };
    const tabName = sectionKeyMap[prefix] || prefix;
    const tabDone = progress.tabsCompleted[`lesson_${lessonId}_${tabName}`];
    const submittedCount = questions.filter((_, i) => (answers[`${prefix}_${i}`] || '').trim().length > 0).length;

    return (
      <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-gray-500 text-xs uppercase font-bold">{emoji} {title}</p>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-gray-400">
              {submittedCount}/{questions.length} {currentLang === 'ba' ? 'kobu' : 'soumis'}
            </span>
            {tabDone && <span className="text-emerald-500 text-xs font-bold flex items-center gap-1"><Check className="w-3 h-3" /> ✓</span>}
          </div>
        </div>

        {questions.map((q, i) => {
          const key = `${prefix}_${i}`;
          return (
            <UniversalAnswerCard
              key={key}
              level="N1"
              module="lesson"
              lessonId={String(lessonId)}
              sectionKey={tabName}
              questionIdx={i}
              question={q}
              questionLabel={`Q${i + 1}`}
              initialAnswer={answers[key] || ''}
              accent="from-amber-500 to-orange-500"
              onLocalChange={(val) => {
                setAnswers(prev => ({ ...prev, [key]: val }));
              }}
              onSubmitted={(val) => {
                setAnswers(prev => ({ ...prev, [key]: val }));
                // Marque la section comme complétée si ≥50% des questions soumises
                const submitted = questions.filter((_, idx) => {
                  if (idx === i) return true;
                  return (answers[`${prefix}_${idx}`] || '').trim().length > 0;
                }).length;
                if (submitted >= Math.ceil(questions.length * 0.5)) {
                  markTabComplete(lessonId, tabName as any);
                }
                setSectionScores(prev => ({ ...prev, [prefix]: { correct: submitted, total: questions.length } }));
              }}
            />
          );
        })}

        {/* Score display */}
        {score && (
          <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-center gap-2 py-2">
            <div className={`px-4 py-1.5 rounded-full text-sm font-bold ${
              score.correct >= Math.ceil(score.total * 0.7) ? 'bg-emerald-100 text-emerald-700' :
              score.correct >= Math.ceil(score.total * 0.4) ? 'bg-amber-100 text-amber-700' :
              'bg-red-100 text-red-700'
            }`}>
              {score.correct}/{score.total} {currentLang === 'ba' ? 'kobu' : 'soumis'}
            </div>
            {score.correct >= Math.ceil(score.total * 0.7) && <span className="text-lg">⭐</span>}
          </motion.div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Lesson header */}
      <div className="p-4 rounded-3xl bg-gradient-to-br from-amber-100 to-orange-100 border border-amber-200 shadow-md">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-200 text-amber-800 text-xs font-bold">
              {currentLang === 'ba' ? 'Gari' : 'Leçon'} {lesson.id}
            </span>
            <span className="text-amber-600/60 text-xs">{lesson.themeLabel}</span>
          </div>
          {/* Stars */}
          <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map(s => (
              <Star key={s} className={`w-4 h-4 ${s <= stars ? 'text-amber-500 fill-amber-500' : 'text-gray-300'}`} />
            ))}
          </div>
        </div>
        <h2 className="text-gray-800 font-black text-xl">{lesson.title}</h2>
        {lesson.phonetics && (
          <p className="text-amber-700/70 text-sm mt-1">{lesson.phonetics.label}</p>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        {tabs.filter(t => t.show).map(tab => {
          const tabKey = `lesson_${lessonId}_${tab.id}`;
          const isDone = progress.tabsCompleted[tabKey];
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all relative ${
                activeTab === tab.id
                  ? 'bg-amber-500 text-white shadow-md shadow-amber-200'
                  : isDone
                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                  : 'bg-white text-gray-500 border border-gray-200'
              }`}
            >
              <span>{tab.emoji}</span> {tab.label}
              {isDone && activeTab !== tab.id && <Check className="w-3 h-3 ml-0.5" />}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        {activeTab === 'text' && (
          <div className="space-y-4">
            {lesson.imageUrl && (
              <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm bg-white">
                <img src={lesson.imageUrl} alt={lesson.title} className="w-full h-auto object-contain max-h-72" />
              </div>
            )}
            <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm">
              <div className="flex justify-end mb-2">
                <ListenButton contentKey={`classe/N1/lang/${lessonId}/text`} size="md" />
              </div>
              <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line">{lesson.text}</p>
            </div>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                markTabComplete(lessonId, 'text');
                if (!goToNextTab()) {
                  // No more tabs — finish lesson
                  handleComplete();
                }
              }}
              className="w-full py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-bold shadow-md"
            >
              <Check className="w-4 h-4 inline mr-1" /> {currentLang === 'ba' ? 'Na faagi' : 'J\'ai lu'}
            </motion.button>
          </div>
        )}

        {activeTab === 'observe' && renderQuestions(
          lesson.sections.observe, 'obs',
          currentLang === 'ba' ? 'A mɛɛrio' : 'Observe', '👁️'
        )}

        {activeTab === 'ecoute' && renderQuestions(
          lesson.sections.ecoute, 'eco',
          currentLang === 'ba' ? 'A faagi yeni swaa dakio' : 'Écoute et réponds', '🎧'
        )}

        {activeTab === 'reagis' && renderQuestions(
          lesson.sections.reagis, 'rea',
          currentLang === 'ba' ? 'A wunɛn yam waaru geruo' : 'Réagis', '💬'
        )}

        {activeTab === 'retiens' && renderQuestions(
          lesson.sections.retiens, 'ret',
          currentLang === 'ba' ? 'Yè n weenɛ a n yã' : 'Retiens', '🧠'
        )}

        {activeTab === 'phonetics' && lesson.phonetics && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm">
              <p className="text-gray-500 text-xs uppercase font-bold mb-3">📖 {lesson.phonetics.label}</p>
              <div className="space-y-1.5">
                {lesson.phonetics.reading.map((line, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <p className="flex-1 text-gray-800 text-lg font-mono tracking-wider">{line}</p>
                    <ListenButton contentKey={`classe/N1/lang/${lessonId}/phonetics/reading/${i}`} size="sm" />
                  </div>
                ))}
              </div>
            </div>

            {lesson.phonetics.writing.length > 0 && (
              <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm">
                <p className="text-gray-500 text-xs uppercase font-bold mb-3">✍️ {currentLang === 'ba' ? 'A yora mɛɛrio' : 'Exercices d\'écriture'}</p>
                <div className="space-y-2">
                  {lesson.phonetics.writing.map((w, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-amber-600 text-lg font-bold min-w-[80px] font-mono">{w}</span>
                      <ListenButton contentKey={`classe/N1/lang/${lessonId}/phonetics/writing/${i}`} size="sm" />
                      <div className="flex-1">
                        <BaribaSmartTextarea
                          className="bg-gray-50 border-gray-200 focus:border-amber-400"
                          rows={1}
                          placeholder={currentLang === 'ba' ? 'Yore...' : 'Écris...'}
                          value={answers[`wr_${i}`] || ''}
                          onChange={(val) => setAnswers(prev => ({ ...prev, [`wr_${i}`]: val }))}
                        />
                      </div>
                      {feedback[`wr_${i}`] === 'correct' && <Check className="w-5 h-5 text-emerald-500" />}
                      {feedback[`wr_${i}`] === 'wrong' && <X className="w-5 h-5 text-red-400" />}
                    </div>
                  ))}
                </div>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    let correct = 0;
                    lesson.phonetics!.writing.forEach((w, i) => {
                      checkWord(`wr_${i}`, w);
                      if ((answers[`wr_${i}`] || '').trim().toLowerCase() === w.toLowerCase()) correct++;
                    });
                    if (correct >= Math.ceil(lesson.phonetics!.writing.length * 0.5)) {
                      markTabComplete(lessonId, 'phonetics');
                    }
                  }}
                  className="w-full mt-3 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-bold shadow-md"
                >
                  📤 {currentLang === 'ba' ? 'Sɔ̃ɔ' : 'Soumettre'}
                </motion.button>
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
          onClick={() => {
            markTabComplete(lessonId, activeTab);
            // Try to advance to next tab; only finish lesson when on the last tab
            if (!goToNextTab()) {
              handleComplete();
            }
          }}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-bold shadow-lg shadow-amber-200"
        >
          <Check className="w-4 h-4" />
          {visibleTabs.findIndex(t => t.id === activeTab) < visibleTabs.length - 1
            ? (currentLang === 'ba' ? 'Sãa' : 'Suivant')
            : (currentLang === 'ba' ? 'Kobu kpa a sãa' : 'Terminer la leçon')}
          <ChevronRight className="w-4 h-4" />
        </motion.button>
      </div>
    </div>
  );
}