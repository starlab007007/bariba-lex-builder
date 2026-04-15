import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, BookOpen, Type, Calculator, ClipboardCheck, Users, BarChart3, Lock, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useFitilaLanguage } from '@/contexts/FitilaLanguageContext';
import { useSideMenu } from './FitilaApp';
import { CLASSE_LESSONS, CLASSE_THEMES, CLASSE_EVALUATIONS, getClasseProgress } from '@/data/classeContent';
import ClasseLessonView from '@/components/classe/ClasseLessonView';
import ClasseAlphabetView from '@/components/classe/ClasseAlphabetView';
import ClasseCalculView from '@/components/classe/ClasseCalculView';
import ClasseEvaluation from '@/components/classe/ClasseEvaluation';
import ClasseFacilitateur from '@/components/classe/ClasseFacilitateur';

type Section = 'home' | 'lessons' | 'lesson-detail' | 'alphabet' | 'calcul' | 'evaluations' | 'eval-detail' | 'facilitateur';

export default function FitilaClasse() {
  const navigate = useNavigate();
  const { t, currentLang } = useFitilaLanguage();
  const { open: openMenu } = useSideMenu();
  const [section, setSection] = useState<Section>('home');
  const [selectedLessonId, setSelectedLessonId] = useState<number>(1);
  const [selectedEvalId, setSelectedEvalId] = useState<number>(1);

  const progress = getClasseProgress();
  const completedCount = progress.completedLessons.length;
  const totalLessons = CLASSE_LESSONS.length;
  const progressPercent = Math.round((completedCount / totalLessons) * 100);

  const sections = [
    { id: 'lessons' as Section, icon: BookOpen, emoji: '📖', label: currentLang === 'ba' ? 'Garibu' : 'Leçons', desc: `${totalLessons} ${currentLang === 'ba' ? 'garibu' : 'leçons'}`, gradient: 'from-amber-500 to-orange-500', count: completedCount },
    { id: 'alphabet' as Section, icon: Type, emoji: '🔤', label: currentLang === 'ba' ? 'Baranu ka gømbi' : 'Lecture & Écriture', desc: currentLang === 'ba' ? 'Yori piibunu ka bakanu' : 'Alphabet Bariba', gradient: 'from-emerald-500 to-teal-500' },
    { id: 'calcul' as Section, icon: Calculator, emoji: '🔢', label: currentLang === 'ba' ? 'Dooru' : 'Calcul & Gestion', desc: currentLang === 'ba' ? 'Dootinu ka yèesu' : 'Numération, opérations', gradient: 'from-blue-500 to-indigo-500' },
    { id: 'evaluations' as Section, icon: ClipboardCheck, emoji: '📝', label: currentLang === 'ba' ? 'Yaayasiabu' : 'Évaluations', desc: `${CLASSE_EVALUATIONS.length} ${currentLang === 'ba' ? 'yaayasiabu' : 'évaluations'}`, gradient: 'from-purple-500 to-pink-500' },
    { id: 'facilitateur' as Section, icon: Users, emoji: '👨‍🏫', label: currentLang === 'ba' ? 'Sóøsirun søøru' : 'Mode Facilitateur', desc: currentLang === 'ba' ? 'Keu sóøsion garibu' : 'Guide pédagogique', gradient: 'from-rose-500 to-red-500' },
  ];

  const goBack = () => {
    if (section === 'lesson-detail') setSection('lessons');
    else if (section === 'eval-detail') setSection('evaluations');
    else if (section !== 'home') setSection('home');
    else navigate('/fitila');
  };

  // ═══ LESSON LIST ═══
  const renderLessonList = () => {
    const grouped = CLASSE_THEMES.map(theme => ({
      ...theme,
      lessons: CLASSE_LESSONS.filter(l => l.theme === theme.id),
    })).filter(g => g.lessons.length > 0);

    return (
      <div className="space-y-6">
        {grouped.map(group => (
          <div key={group.id}>
            <div className="flex items-center gap-2 mb-3 px-1">
              <span className="text-xl">{group.icon}</span>
              <h3 className="text-white font-bold text-sm">{group.label}</h3>
              <span className="text-white/40 text-xs">— {group.labelFr}</span>
            </div>
            <div className="space-y-2">
              {group.lessons.map(lesson => {
                const done = progress.completedLessons.includes(lesson.id);
                return (
                  <motion.button
                    key={lesson.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => { setSelectedLessonId(lesson.id); setSection('lesson-detail'); }}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${done ? 'bg-emerald-500/20 border border-emerald-500/30' : 'bg-white/5 border border-white/10'}`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold ${done ? 'bg-emerald-500 text-white' : 'bg-white/10 text-white/60'}`}>
                      {done ? '✓' : lesson.id}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-white text-sm font-medium">{lesson.title}</p>
                      <p className="text-white/40 text-xs">{currentLang === 'ba' ? 'Sóøsiru' : 'Lettres'}: {lesson.letters}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-white/30" />
                  </motion.button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // ═══ EVALUATION LIST ═══
  const renderEvaluationList = () => (
    <div className="space-y-3">
      {CLASSE_EVALUATIONS.map(ev => {
        const score = progress.evaluationScores[ev.id];
        return (
          <motion.button
            key={ev.id}
            whileTap={{ scale: 0.98 }}
            onClick={() => { setSelectedEvalId(ev.id); setSection('eval-detail'); }}
            className="w-full flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <span className="text-2xl">📝</span>
            </div>
            <div className="flex-1 text-left">
              <p className="text-white font-medium">{ev.title}</p>
              <p className="text-white/40 text-xs">
                {currentLang === 'ba' ? 'Gari' : 'Après leçon'} {ev.afterLesson}
              </p>
            </div>
            {score !== undefined && (
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-sm font-bold">
                {score}%
              </span>
            )}
            <ChevronRight className="w-4 h-4 text-white/30" />
          </motion.button>
        );
      })}
    </div>
  );

  // ═══ HOME ═══
  const renderHome = () => (
    <div className="space-y-6">
      {/* Niveau selector */}
      <div className="flex gap-3">
        <div className="flex-1 p-4 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border-2 border-amber-500/50">
          <p className="text-amber-400 font-black text-lg">🔥 {currentLang === 'ba' ? 'Dii gbiikiru' : 'Niveau 1'}</p>
          <p className="text-white/60 text-xs mt-1">{progressPercent}% {currentLang === 'ba' ? 'kobu' : 'complété'}</p>
          <div className="mt-2 h-2 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>
        <div className="flex-1 p-4 rounded-2xl bg-white/5 border border-white/10 opacity-50 relative">
          <Lock className="absolute top-3 right-3 w-4 h-4 text-white/30" />
          <p className="text-white/40 font-bold text-lg">🔒 {currentLang === 'ba' ? 'Dii yiruse' : 'Niveau 2'}</p>
          <p className="text-white/30 text-xs mt-1">{currentLang === 'ba' ? 'Ta n wá' : 'Bientôt'}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-3">
        <div className="flex-1 p-3 rounded-xl bg-white/5 text-center">
          <p className="text-2xl font-black text-white">{completedCount}</p>
          <p className="text-white/40 text-[10px]">{currentLang === 'ba' ? 'Gari kobu' : 'Leçons terminées'}</p>
        </div>
        <div className="flex-1 p-3 rounded-xl bg-white/5 text-center">
          <p className="text-2xl font-black text-white">{Object.keys(progress.evaluationScores).length}</p>
          <p className="text-white/40 text-[10px]">{currentLang === 'ba' ? 'Yaayasiabu' : 'Évaluations'}</p>
        </div>
        <div className="flex-1 p-3 rounded-xl bg-white/5 text-center">
          <p className="text-2xl font-black text-amber-400">{progressPercent}%</p>
          <p className="text-white/40 text-[10px]">{currentLang === 'ba' ? 'Swaa søø' : 'Progression'}</p>
        </div>
      </div>

      {/* Section cards */}
      <div className="grid grid-cols-2 gap-3">
        {sections.map((sec, i) => (
          <motion.button
            key={sec.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setSection(sec.id)}
            className="flex flex-col items-center gap-2 p-5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
          >
            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${sec.gradient} flex items-center justify-center shadow-lg`}>
              <span className="text-3xl">{sec.emoji}</span>
            </div>
            <span className="text-white text-sm font-bold text-center">{sec.label}</span>
            <span className="text-white/40 text-[10px] text-center">{sec.desc}</span>
            {sec.count !== undefined && (
              <span className="text-emerald-400 text-[10px] font-bold">{sec.count}/{totalLessons} ✓</span>
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
    alphabet: currentLang === 'ba' ? 'Baranu ka gømbi' : 'Alphabet',
    calcul: currentLang === 'ba' ? 'Dooru' : 'Calcul',
    evaluations: currentLang === 'ba' ? 'Yaayasiabu' : 'Évaluations',
    'eval-detail': CLASSE_EVALUATIONS.find(e => e.id === selectedEvalId)?.title || '',
    facilitateur: currentLang === 'ba' ? 'Sóøsirun søøru' : 'Facilitateur',
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-amber-950/30 via-black to-black">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-white/10">
        <motion.button whileTap={{ scale: 0.9 }} onClick={goBack} className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
          <ArrowLeft className="w-5 h-5 text-white" />
        </motion.button>
        <div className="flex-1">
          <h1 className="text-white font-black text-lg flex items-center gap-2">
            🏫 {sectionTitles[section]}
          </h1>
          {section === 'home' && (
            <p className="text-white/40 text-xs">{currentLang === 'ba' ? 'Dii gbiikiru — Baatønum' : 'Niveau 1 — Bariba'}</p>
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
                  const next = CLASSE_LESSONS.find(l => l.id === selectedLessonId + 1);
                  if (next) setSelectedLessonId(next.id);
                  else setSection('lessons');
                }}
                onPrev={() => {
                  const prev = CLASSE_LESSONS.find(l => l.id === selectedLessonId - 1);
                  if (prev) setSelectedLessonId(prev.id);
                }}
              />
            )}
            {section === 'alphabet' && <ClasseAlphabetView />}
            {section === 'calcul' && <ClasseCalculView />}
            {section === 'evaluations' && renderEvaluationList()}
            {section === 'eval-detail' && (
              <ClasseEvaluation
                evalId={selectedEvalId}
                onBack={() => setSection('evaluations')}
              />
            )}
            {section === 'facilitateur' && <ClasseFacilitateur />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
