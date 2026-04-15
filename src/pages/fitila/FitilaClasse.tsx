import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, BookOpen, Type, Calculator, ClipboardCheck, Users, Lock, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useFitilaLanguage } from '@/contexts/FitilaLanguageContext';
import { useSideMenu } from './FitilaApp';
import { CLASSE_LESSONS, CLASSE_EVALUATIONS, CALCUL_LESSONS, getClasseProgress } from '@/data/classeContent';
import ClasseLessonView from '@/components/classe/ClasseLessonView';
import ClasseAlphabetView from '@/components/classe/ClasseAlphabetView';
import ClasseCalculView from '@/components/classe/ClasseCalculView';
import ClasseEvaluation from '@/components/classe/ClasseEvaluation';
import ClasseFacilitateur from '@/components/classe/ClasseFacilitateur';

type Section = 'home' | 'lessons' | 'lesson-detail' | 'alphabet' | 'calcul' | 'evaluations' | 'eval-detail' | 'facilitateur';

export default function FitilaClasse() {
  const navigate = useNavigate();
  const { currentLang } = useFitilaLanguage();
  const { open: openMenu } = useSideMenu();
  const [section, setSection] = useState<Section>('home');
  const [selectedLessonId, setSelectedLessonId] = useState<number>(1);
  const [selectedEvalId, setSelectedEvalId] = useState<number>(1);

  const progress = getClasseProgress();
  const completedCount = progress.completedLessons.length;
  const totalLessons = CLASSE_LESSONS.length;
  const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  const langEvals = CLASSE_EVALUATIONS.filter(e => e.page < 85);
  const calcEvals = CLASSE_EVALUATIONS.filter(e => e.page >= 85);

  const sectionCards = [
    { id: 'lessons' as Section, emoji: '📖', label: currentLang === 'ba' ? 'Garibu' : 'Leçons', desc: `${totalLessons} ${currentLang === 'ba' ? 'garibu' : 'leçons'}`, gradient: 'from-amber-400 to-orange-400', count: completedCount },
    { id: 'alphabet' as Section, emoji: '🔤', label: currentLang === 'ba' ? 'Sɔ̃ɔsiru' : 'Alphabet', desc: currentLang === 'ba' ? 'Yori piibunu ka bakanu' : 'Voyelles & Consonnes', gradient: 'from-emerald-400 to-teal-400' },
    { id: 'calcul' as Section, emoji: '🔢', label: currentLang === 'ba' ? 'Dooru' : 'Calcul', desc: `${CALCUL_LESSONS.length} ${currentLang === 'ba' ? 'garibu' : 'leçons'}`, gradient: 'from-blue-400 to-indigo-400' },
    { id: 'evaluations' as Section, emoji: '📝', label: currentLang === 'ba' ? 'Yaayasiabu' : 'Évaluations', desc: `${CLASSE_EVALUATIONS.length} ${currentLang === 'ba' ? 'yaayasiabu' : 'évaluations'}`, gradient: 'from-purple-400 to-pink-400' },
    { id: 'facilitateur' as Section, emoji: '👨‍🏫', label: currentLang === 'ba' ? 'Sɔ̃ɔsirun sɔɔru' : 'Facilitateur', desc: currentLang === 'ba' ? 'Keu sɔ̃ɔsion garibu' : 'Guide pédagogique', gradient: 'from-rose-400 to-red-400' },
  ];

  const goBack = () => {
    if (section === 'lesson-detail') setSection('lessons');
    else if (section === 'eval-detail') setSection('evaluations');
    else if (section !== 'home') setSection('home');
    else navigate('/fitila');
  };

  // Group lessons by theme
  const themes = [...new Set(CLASSE_LESSONS.map(l => l.theme))];
  const groupedLessons = themes.map(t => ({
    theme: t,
    label: CLASSE_LESSONS.find(l => l.theme === t)?.themeLabel || t,
    lessons: CLASSE_LESSONS.filter(l => l.theme === t),
  }));

  const renderLessonList = () => (
    <div className="space-y-6">
      {groupedLessons.map(group => (
        <div key={group.theme}>
          <div className="flex items-center gap-2 mb-3 px-1">
            <span className="text-lg">📖</span>
            <h3 className="text-gray-800 font-bold text-sm">{group.label}</h3>
          </div>
          <div className="space-y-2">
            {group.lessons.map(lesson => {
              const done = progress.completedLessons.includes(lesson.id);
              return (
                <motion.button
                  key={lesson.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => { setSelectedLessonId(lesson.id); setSection('lesson-detail'); }}
                  className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all shadow-sm ${done ? 'bg-emerald-50 border-2 border-emerald-200' : 'bg-white border border-gray-100'}`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold ${done ? 'bg-emerald-500 text-white' : 'bg-amber-100 text-amber-700'}`}>
                    {done ? '✓' : lesson.id}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-gray-800 text-sm font-semibold">{lesson.title}</p>
                    {lesson.phonetics && (
                      <p className="text-gray-400 text-xs">{lesson.phonetics.label}</p>
                    )}
                  </div>
                  {lesson.imageUrl && <span className="text-gray-300 text-xs">🖼️</span>}
                  <ChevronRight className="w-4 h-4 text-gray-300" />
                </motion.button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );

  const renderEvaluationList = () => (
    <div className="space-y-6">
      {/* Langue evaluations */}
      <div>
        <h3 className="text-gray-700 font-bold text-sm mb-3 px-1">📖 {currentLang === 'ba' ? 'Garibu' : 'Langue'}</h3>
        <div className="space-y-2">
          {langEvals.map(ev => {
            const score = progress.evaluationScores[ev.id];
            return (
              <motion.button key={ev.id} whileTap={{ scale: 0.98 }}
                onClick={() => { setSelectedEvalId(ev.id); setSection('eval-detail'); }}
                className="w-full flex items-center gap-3 p-4 rounded-2xl bg-white border border-gray-100 shadow-sm"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
                  <span className="text-2xl">📝</span>
                </div>
                <div className="flex-1 text-left">
                  <p className="text-gray-800 font-semibold text-sm">{ev.title}</p>
                  <p className="text-gray-400 text-xs">{ev.allQuestions.length} {currentLang === 'ba' ? 'gari bikiabu' : 'questions'}</p>
                </div>
                {score !== undefined && (
                  <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-600 text-sm font-bold">{score}%</span>
                )}
                <ChevronRight className="w-4 h-4 text-gray-300" />
              </motion.button>
            );
          })}
        </div>
      </div>
      {/* Calcul evaluations */}
      {calcEvals.length > 0 && (
        <div>
          <h3 className="text-gray-700 font-bold text-sm mb-3 px-1">🔢 {currentLang === 'ba' ? 'Dooru' : 'Calcul'}</h3>
          <div className="space-y-2">
            {calcEvals.map(ev => {
              const score = progress.evaluationScores[ev.id];
              return (
                <motion.button key={ev.id} whileTap={{ scale: 0.98 }}
                  onClick={() => { setSelectedEvalId(ev.id); setSection('eval-detail'); }}
                  className="w-full flex items-center gap-3 p-4 rounded-2xl bg-white border border-gray-100 shadow-sm"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-400 flex items-center justify-center">
                    <span className="text-2xl">🧮</span>
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-gray-800 font-semibold text-sm">{ev.title}</p>
                    <p className="text-gray-400 text-xs">{ev.allQuestions.length} {currentLang === 'ba' ? 'gari bikiabu' : 'questions'}</p>
                  </div>
                  {score !== undefined && (
                    <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-600 text-sm font-bold">{score}%</span>
                  )}
                  <ChevronRight className="w-4 h-4 text-gray-300" />
                </motion.button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  const renderHome = () => (
    <div className="space-y-6">
      {/* Niveau selector */}
      <div className="flex gap-3">
        <div className="flex-1 p-4 rounded-3xl bg-gradient-to-br from-amber-100 to-orange-100 border-2 border-amber-300 shadow-md">
          <p className="text-amber-700 font-black text-lg">🔥 {currentLang === 'ba' ? 'Dii gbiikiru' : 'Niveau 1'}</p>
          <p className="text-amber-600/70 text-xs mt-1">{progressPercent}% {currentLang === 'ba' ? 'kobu' : 'complété'}</p>
          <div className="mt-2 h-2.5 bg-amber-200/50 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>
        <div className="flex-1 p-4 rounded-3xl bg-gray-50 border border-gray-200 opacity-60 relative">
          <Lock className="absolute top-3 right-3 w-4 h-4 text-gray-400" />
          <p className="text-gray-400 font-bold text-lg">🔒 {currentLang === 'ba' ? 'Dii yiruse' : 'Niveau 2'}</p>
          <p className="text-gray-300 text-xs mt-1">{currentLang === 'ba' ? 'Ta ǹ wã' : 'Bientôt'}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-3">
        <div className="flex-1 p-3 rounded-2xl bg-white shadow-sm border border-gray-100 text-center">
          <p className="text-2xl font-black text-gray-800">{completedCount}</p>
          <p className="text-gray-400 text-[10px]">{currentLang === 'ba' ? 'Gari kobu' : 'Leçons'}</p>
        </div>
        <div className="flex-1 p-3 rounded-2xl bg-white shadow-sm border border-gray-100 text-center">
          <p className="text-2xl font-black text-gray-800">{Object.keys(progress.evaluationScores).length}</p>
          <p className="text-gray-400 text-[10px]">{currentLang === 'ba' ? 'Yaayasiabu' : 'Évaluations'}</p>
        </div>
        <div className="flex-1 p-3 rounded-2xl bg-white shadow-sm border border-gray-100 text-center">
          <p className="text-2xl font-black text-amber-500">{progressPercent}%</p>
          <p className="text-gray-400 text-[10px]">{currentLang === 'ba' ? 'Swaa sɔɔ' : 'Progression'}</p>
        </div>
      </div>

      {/* Section cards */}
      <div className="grid grid-cols-2 gap-3">
        {sectionCards.map((sec, i) => (
          <motion.button
            key={sec.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setSection(sec.id)}
            className="flex flex-col items-center gap-2 p-5 rounded-3xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all"
          >
            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${sec.gradient} flex items-center justify-center shadow-lg`}>
              <span className="text-3xl">{sec.emoji}</span>
            </div>
            <span className="text-gray-800 text-sm font-bold text-center">{sec.label}</span>
            <span className="text-gray-400 text-[10px] text-center">{sec.desc}</span>
            {sec.count !== undefined && (
              <span className="text-emerald-500 text-[10px] font-bold">{sec.count}/{totalLessons} ✓</span>
            )}
          </motion.button>
        ))}
      </div>
    </div>
  );

  const sectionTitles: Record<Section, string> = {
    home: currentLang === 'ba' ? 'Keu' : 'Classe',
    lessons: currentLang === 'ba' ? 'Garibu' : 'Leçons',
    'lesson-detail': CLASSE_LESSONS.find(l => l.id === selectedLessonId)?.title || '',
    alphabet: currentLang === 'ba' ? 'Sɔ̃ɔsiru' : 'Alphabet',
    calcul: currentLang === 'ba' ? 'Dooru' : 'Calcul',
    evaluations: currentLang === 'ba' ? 'Yaayasiabu' : 'Évaluations',
    'eval-detail': CLASSE_EVALUATIONS.find(e => e.id === selectedEvalId)?.title || '',
    facilitateur: currentLang === 'ba' ? 'Sɔ̃ɔsirun sɔɔru' : 'Facilitateur',
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 bg-white/80 backdrop-blur-sm border-b border-gray-200/50">
        <motion.button whileTap={{ scale: 0.9 }} onClick={goBack} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </motion.button>
        <div className="flex-1">
          <h1 className="text-gray-800 font-black text-lg flex items-center gap-2">
            🏫 {sectionTitles[section]}
          </h1>
          {section === 'home' && (
            <p className="text-gray-400 text-xs">{currentLang === 'ba' ? 'Dii gbiikiru — Baatɔnum' : 'Niveau 1 — Bariba'}</p>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <AnimatePresence mode="wait">
          <motion.div key={section} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
            {section === 'home' && renderHome()}
            {section === 'lessons' && renderLessonList()}
            {section === 'lesson-detail' && (
              <ClasseLessonView
                lessonId={selectedLessonId}
                onNext={() => {
                  const idx = CLASSE_LESSONS.findIndex(l => l.id === selectedLessonId);
                  if (idx < CLASSE_LESSONS.length - 1) setSelectedLessonId(CLASSE_LESSONS[idx + 1].id);
                  else setSection('lessons');
                }}
                onPrev={() => {
                  const idx = CLASSE_LESSONS.findIndex(l => l.id === selectedLessonId);
                  if (idx > 0) setSelectedLessonId(CLASSE_LESSONS[idx - 1].id);
                }}
              />
            )}
            {section === 'alphabet' && <ClasseAlphabetView />}
            {section === 'calcul' && <ClasseCalculView />}
            {section === 'evaluations' && renderEvaluationList()}
            {section === 'eval-detail' && (
              <ClasseEvaluation evalId={selectedEvalId} onBack={() => setSection('evaluations')} />
            )}
            {section === 'facilitateur' && <ClasseFacilitateur />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
