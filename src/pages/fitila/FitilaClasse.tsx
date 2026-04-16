import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Lock, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useFitilaLanguage } from '@/contexts/FitilaLanguageContext';
import { useSideMenu } from './FitilaApp';
import { CLASSE_LESSONS, CLASSE_EVALUATIONS, CALCUL_LESSONS, getClasseProgress } from '@/data/classeContent';
import { CLASSE_N2_LESSONS, CLASSE_N2_EVALUATIONS, CALCUL_N2_LESSONS, getClasseN2Progress } from '@/data/classeContentN2';
import ClasseLessonView from '@/components/classe/ClasseLessonView';
import ClasseAlphabetView from '@/components/classe/ClasseAlphabetView';
import ClasseCalculView from '@/components/classe/ClasseCalculView';
import ClasseEvaluation from '@/components/classe/ClasseEvaluation';
import ClasseFacilitateur from '@/components/classe/ClasseFacilitateur';

type Section = 'home' | 'lessons' | 'lesson-detail' | 'alphabet' | 'calcul' | 'evaluations' | 'eval-detail' | 'facilitateur';
type Level = 'N1' | 'N2';

export default function FitilaClasse() {
  const navigate = useNavigate();
  const { currentLang } = useFitilaLanguage();
  const { open: openMenu } = useSideMenu();
  const [section, setSection] = useState<Section>('home');
  const [selectedLessonId, setSelectedLessonId] = useState<number>(1);
  const [selectedEvalId, setSelectedEvalId] = useState<number>(1);
  const [activeLevel, setActiveLevel] = useState<Level>('N1');

  // Pick data based on level
  const lessons = activeLevel === 'N1' ? CLASSE_LESSONS : CLASSE_N2_LESSONS;
  const evaluations = activeLevel === 'N1' ? CLASSE_EVALUATIONS : CLASSE_N2_EVALUATIONS;
  const calculLessons = activeLevel === 'N1' ? CALCUL_LESSONS : CALCUL_N2_LESSONS;
  const progress = activeLevel === 'N1' ? getClasseProgress() : getClasseN2Progress();

  const completedCount = progress.completedLessons.length;
  const totalLessons = lessons.length;
  const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  const langEvals = evaluations.filter(e => e.page < 85);
  const calcEvals = evaluations.filter(e => e.page >= 85);

  const sectionCards = [
    { id: 'lessons' as Section, emoji: '📖', label: currentLang === 'ba' ? 'Garibu' : 'Leçons', desc: `${totalLessons} ${currentLang === 'ba' ? 'garibu' : 'leçons'}`, gradient: 'from-amber-400 to-orange-400', count: completedCount },
    { id: 'alphabet' as Section, emoji: '🔤', label: currentLang === 'ba' ? 'Sɔ̃ɔsiru' : 'Alphabet', desc: currentLang === 'ba' ? 'Yori piibunu ka bakanu' : 'Voyelles & Consonnes', gradient: 'from-emerald-400 to-teal-400' },
    { id: 'calcul' as Section, emoji: '🔢', label: currentLang === 'ba' ? 'Dooru' : 'Calcul', desc: `${calculLessons.length} ${currentLang === 'ba' ? 'garibu' : 'leçons'}`, gradient: 'from-blue-400 to-indigo-400' },
    { id: 'evaluations' as Section, emoji: '📝', label: currentLang === 'ba' ? 'Yaayasiabu' : 'Évaluations', desc: `${evaluations.length} ${currentLang === 'ba' ? 'yaayasiabu' : 'évaluations'}`, gradient: 'from-purple-400 to-pink-400' },
    { id: 'facilitateur' as Section, emoji: '👨‍🏫', label: currentLang === 'ba' ? 'Sɔ̃ɔsirun sɔɔru' : 'Facilitateur', desc: currentLang === 'ba' ? 'Keu sɔ̃ɔsion garibu' : 'Guide pédagogique', gradient: 'from-rose-400 to-red-400' },
  ];

  const goBack = () => {
    if (section === 'lesson-detail') setSection('lessons');
    else if (section === 'eval-detail') setSection('evaluations');
    else if (section !== 'home') setSection('home');
    else navigate('/fitila');
  };

  const themes = [...new Set(lessons.map(l => l.theme))];
  const groupedLessons = themes.map(t => ({
    theme: t,
    label: lessons.find(l => l.theme === t)?.themeLabel || t,
    lessons: lessons.filter(l => l.theme === t),
  }));

  const handleLevelSwitch = (level: Level) => {
    setActiveLevel(level);
    setSection('home');
    setSelectedLessonId(1);
    setSelectedEvalId(1);
  };

  const renderLevelSelector = () => (
    <div className="flex gap-3">
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => handleLevelSwitch('N1')}
        className={`flex-1 p-4 rounded-3xl border-2 shadow-md transition-all ${
          activeLevel === 'N1'
            ? 'bg-gradient-to-br from-amber-100 to-orange-100 border-amber-300'
            : 'bg-white border-gray-200'
        }`}
      >
        <p className={`font-black text-lg ${activeLevel === 'N1' ? 'text-amber-700' : 'text-gray-400'}`}>
          🔥 {currentLang === 'ba' ? 'Dii gbiikiru' : 'Niveau 1'}
        </p>
        {activeLevel === 'N1' && (
          <>
            <p className="text-amber-600/70 text-xs mt-1">{progressPercent}% {currentLang === 'ba' ? 'kobu' : 'complété'}</p>
            <div className="mt-2 h-2.5 bg-amber-200/50 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all" style={{ width: `${progressPercent}%` }} />
            </div>
          </>
        )}
      </motion.button>
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => handleLevelSwitch('N2')}
        className={`flex-1 p-4 rounded-3xl border-2 shadow-md transition-all ${
          activeLevel === 'N2'
            ? 'bg-gradient-to-br from-indigo-100 to-purple-100 border-indigo-300'
            : 'bg-white border-gray-200'
        }`}
      >
        <p className={`font-black text-lg ${activeLevel === 'N2' ? 'text-indigo-700' : 'text-gray-400'}`}>
          🚀 {currentLang === 'ba' ? 'Dii yiruse' : 'Niveau 2'}
        </p>
        {activeLevel === 'N2' && (
          <>
            <p className="text-indigo-600/70 text-xs mt-1">{progressPercent}% {currentLang === 'ba' ? 'kobu' : 'complété'}</p>
            <div className="mt-2 h-2.5 bg-indigo-200/50 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all" style={{ width: `${progressPercent}%` }} />
            </div>
          </>
        )}
      </motion.button>
    </div>
  );

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
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold ${done ? 'bg-emerald-500 text-white' : activeLevel === 'N2' ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'}`}>
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
      {renderLevelSelector()}

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
          <p className={`text-2xl font-black ${activeLevel === 'N2' ? 'text-indigo-500' : 'text-amber-500'}`}>{progressPercent}%</p>
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
    'lesson-detail': lessons.find(l => l.id === selectedLessonId)?.title || '',
    alphabet: currentLang === 'ba' ? 'Sɔ̃ɔsiru' : 'Alphabet',
    calcul: currentLang === 'ba' ? 'Dooru' : 'Calcul',
    evaluations: currentLang === 'ba' ? 'Yaayasiabu' : 'Évaluations',
    'eval-detail': evaluations.find(e => e.id === selectedEvalId)?.title || '',
    facilitateur: currentLang === 'ba' ? 'Sɔ̃ɔsirun sɔɔru' : 'Facilitateur',
  };

  const levelBadge = activeLevel === 'N2' ? '🚀 N2' : '🔥 N1';

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
            <p className="text-gray-400 text-xs">{levelBadge} — Baatɔnum</p>
          )}
        </div>
        {section !== 'home' && (
          <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
            activeLevel === 'N2' ? 'bg-indigo-100 text-indigo-600' : 'bg-amber-100 text-amber-600'
          }`}>{levelBadge}</span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <AnimatePresence mode="wait">
          <motion.div key={`${activeLevel}-${section}`} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
            {section === 'home' && renderHome()}
            {section === 'lessons' && renderLessonList()}
            {section === 'lesson-detail' && (
              <ClasseLessonView
                lessonId={selectedLessonId}
                onNext={() => {
                  const idx = lessons.findIndex(l => l.id === selectedLessonId);
                  if (idx < lessons.length - 1) setSelectedLessonId(lessons[idx + 1].id);
                  else setSection('lessons');
                }}
                onPrev={() => {
                  const idx = lessons.findIndex(l => l.id === selectedLessonId);
                  if (idx > 0) setSelectedLessonId(lessons[idx - 1].id);
                }}
              />
            )}
            {section === 'alphabet' && <ClasseAlphabetView />}
            {section === 'calcul' && <ClasseCalculView />}
            {section === 'evaluations' && renderEvaluationList()}
            {section === 'eval-detail' && (
              <ClasseEvaluation evalId={selectedEvalId} onBack={() => setSection('evaluations')} />
            )}
            {section === 'facilitateur' && <ClasseFacilitateur activeLevel={activeLevel} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
