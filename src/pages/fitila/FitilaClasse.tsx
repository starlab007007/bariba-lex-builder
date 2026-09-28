import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Lock, ChevronRight, GraduationCap } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useFitilaLanguage } from '@/contexts/FitilaLanguageContext';
import { useSideMenu } from './FitilaApp';
import { useTeacherRole } from '@/hooks/useTeacherRole';
import { CLASSE_LESSONS, CLASSE_EVALUATIONS, CALCUL_LESSONS, getClasseProgress } from '@/data/classeContent';
import { CLASSE_N2_LESSONS, CLASSE_N2_EVALUATIONS, CALCUL_N2_LESSONS, getClasseN2Progress } from '@/data/classeContentN2';
import ClasseLessonView from '@/components/classe/ClasseLessonView';
import ClasseAlphabetView from '@/components/classe/ClasseAlphabetView';
import ClasseCalculView from '@/components/classe/ClasseCalculView';
import ClasseEvaluation from '@/components/classe/ClasseEvaluation';
import ClasseFacilitateur from '@/components/classe/ClasseFacilitateur';
import ClasseGrammaireN2 from '@/components/classe/ClasseGrammaireN2';
import ClasseTextProdN2 from '@/components/classe/ClasseTextProdN2';
import ClasseGestionN2 from '@/components/classe/ClasseGestionN2';
import ClasseCorrections from '@/components/classe/ClasseCorrections';
import AuthGuardBanner from '@/components/classe/AuthGuardBanner';

type Section = 'home' | 'lessons' | 'lesson-detail' | 'alphabet' | 'calcul' | 'evaluations' | 'eval-detail' | 'facilitateur' | 'grammaire' | 'textprod' | 'gestion' | 'corrections';
type Level = 'N1' | 'N2';

export default function FitilaClasse() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentLang } = useFitilaLanguage();
  const { open: openMenu } = useSideMenu();
  const { isTeacher } = useTeacherRole();
  const [section, setSection] = useState<Section>('home');
  const [selectedLessonId, setSelectedLessonId] = useState<number>(1);
  const [selectedEvalId, setSelectedEvalId] = useState<number>(1);
  const [activeLevel, setActiveLevel] = useState<Level>(() => location.pathname.includes('/n2') ? 'N2' : 'N1');

  React.useEffect(()=>{
    if(location.pathname.includes('/n2')) setActiveLevel('N2');
    else if(location.pathname.includes('/n1')) setActiveLevel('N1');
  },[location.pathname]);

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

  const n2LangLessons = CLASSE_N2_LESSONS;
  const n2CalcLessons = CALCUL_N2_LESSONS;

  const sectionCards = activeLevel === 'N2' ? [
    { id: 'lessons' as Section, emoji: '📖', label: currentLang === 'ba' ? 'Garibu ka yora' : 'Part 1 — Langue', desc: `${n2LangLessons.length} ${currentLang === 'ba' ? 'garibu' : 'leçons'}`, gradient: 'from-amber-400 to-orange-400', count: completedCount },
    { id: 'calcul' as Section, emoji: '🔢', label: currentLang === 'ba' ? 'Dooru ka yarumani' : 'Part 2 — Calcul', desc: `${n2CalcLessons.length} ${currentLang === 'ba' ? 'garibu' : 'leçons'}`, gradient: 'from-blue-400 to-indigo-400' },
    { id: 'evaluations' as Section, emoji: '📝', label: currentLang === 'ba' ? 'Yaayasiabu' : 'Évaluations', desc: `${evaluations.length} ${currentLang === 'ba' ? 'yaayasiabu' : 'évaluations'}`, gradient: 'from-purple-400 to-pink-400' },
    { id: 'grammaire' as Section, emoji: '📐', label: currentLang === 'ba' ? 'Sɔ̃ɔsirun swɛɛru' : 'Grammaire', desc: currentLang === 'ba' ? 'Bɔru, tundu, sɔm garu' : 'Classes, tons, verbes', gradient: 'from-emerald-400 to-teal-400' },
    { id: 'textprod' as Section, emoji: '✍️', label: currentLang === 'ba' ? 'Sɔm yorubu' : 'Production de textes', desc: currentLang === 'ba' ? 'Tireru bweseru 6' : '6 types de textes', gradient: 'from-cyan-400 to-blue-400' },
    { id: 'gestion' as Section, emoji: '💼', label: currentLang === 'ba' ? 'Gobi dwebu' : 'Gestion', desc: currentLang === 'ba' ? 'Tireru ka tɛtɛ 7' : '7 documents', gradient: 'from-teal-400 to-cyan-400' },
    { id: 'facilitateur' as Section, emoji: '👨‍🏫', label: currentLang === 'ba' ? 'Sɔ̃ɔsirun sɔɔru' : 'Facilitateur', desc: currentLang === 'ba' ? 'Keu sɔ̃ɔsion garibu' : 'Guide pédagogique', gradient: 'from-rose-400 to-red-400' },
  ] : [
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
    navigate('/classe/'+level.toLowerCase());
    setSection('home');
    setSelectedLessonId(1);
    setSelectedEvalId(1);
  };

  const renderLevelSelector = () => (
    <div className="flex gap-3">
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => handleLevelSwitch('N1')}
        className={`flex-1 p-4 rounded-[18px] border transition-all text-left ${
          activeLevel === 'N1'
            ? 'bg-[#FFF9E8] border-[#C99530]'
            : 'bg-white border-[#E4DFCC]'
        }`}
      >
        <p className={`font-extrabold text-[16px] ${activeLevel === 'N1' ? 'text-[#9C6B1D]' : 'text-[#8C8571]'}`}>
          🔥 {currentLang === 'ba' ? 'Dii gbiikiru' : 'Niveau 1'}
        </p>
        {activeLevel === 'N1' && (
          <>
            <p className="text-[#8C8571] text-[11px] mt-1">{progressPercent}% {currentLang === 'ba' ? 'kobu' : 'complété'}</p>
            <div className="mt-2 h-2 bg-[#F1EDDF] rounded-full overflow-hidden">
              <div className="h-full bg-[#C99530] rounded-full transition-all" style={{ width: `${progressPercent}%` }} />
            </div>
          </>
        )}
      </motion.button>
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => handleLevelSwitch('N2')}
        className={`flex-1 p-4 rounded-[18px] border transition-all text-left ${
          activeLevel === 'N2'
            ? 'bg-[#FFF9E8] border-[#C99530]'
            : 'bg-white border-[#E4DFCC]'
        }`}
      >
        <p className={`font-extrabold text-[16px] ${activeLevel === 'N2' ? 'text-[#9C6B1D]' : 'text-[#8C8571]'}`}>
          🚀 {currentLang === 'ba' ? 'Dii yiruse' : 'Niveau 2'}
        </p>
        {activeLevel === 'N2' && (
          <>
            <p className="text-[#8C8571] text-[11px] mt-1">{progressPercent}% {currentLang === 'ba' ? 'kobu' : 'complété'}</p>
            <div className="mt-2 h-2 bg-[#F1EDDF] rounded-full overflow-hidden">
              <div className="h-full bg-[#C99530] rounded-full transition-all" style={{ width: `${progressPercent}%` }} />
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
            <h3 className="text-[#241F2E] font-bold text-sm">{group.label}</h3>
          </div>
          <div className="space-y-2">
            {group.lessons.map(lesson => {
              const done = progress.completedLessons.includes(lesson.id);
              return (
                <motion.button
                  key={lesson.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => { setSelectedLessonId(lesson.id); setSection('lesson-detail'); }}
                  className={`w-full flex items-center gap-3 p-3 rounded-[18px] transition-all ${done ? 'bg-[#DCEAE0]/50 border border-[#3F6E52]/40' : 'bg-white border border-[#E4DFCC]'}`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold ${done ? 'bg-[#3F6E52] text-white' : 'bg-[#F3E3B9] text-[#9C6B1D]'}`}>
                    {done ? '✓' : lesson.id}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-[#241F2E] text-sm font-semibold">{lesson.title}</p>
                    {lesson.phonetics && (
                      <p className="text-[#8C8571] text-xs">{lesson.phonetics.label}</p>
                    )}
                  </div>
                  {lesson.imageUrl && <span className="text-[#B9B5A8] text-xs">🖼️</span>}
                  <ChevronRight className="w-4 h-4 text-[#B9B5A8]" />
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
        <h3 className="text-[#241F2E] font-bold text-sm mb-3 px-1">📖 {currentLang === 'ba' ? 'Garibu' : 'Langue'}</h3>
        <div className="space-y-2">
          {langEvals.map(ev => {
            const score = progress.evaluationScores[ev.id];
            return (
              <motion.button key={ev.id} whileTap={{ scale: 0.98 }}
                onClick={() => { setSelectedEvalId(ev.id); setSection('eval-detail'); }}
                className="w-full flex items-center gap-3 p-4 rounded-[18px] bg-white border border-[#E4DFCC]"
              >
                <div className="w-12 h-12 rounded-[14px] bg-[#F3E3B9] flex items-center justify-center">
                  <span className="text-2xl">📝</span>
                </div>
                <div className="flex-1 text-left">
                  <p className="text-[#241F2E] font-semibold text-sm">{ev.title}</p>
                  <p className="text-[#8C8571] text-xs">{ev.allQuestions.length} {currentLang === 'ba' ? 'gari bikiabu' : 'questions'}</p>
                </div>
                {score !== undefined && (
                  <span className="px-3 py-1 rounded-full bg-[#DCEAE0] text-[#3F6E52] text-sm font-extrabold">{score}%</span>
                )}
                <ChevronRight className="w-4 h-4 text-[#B9B5A8]" />
              </motion.button>
            );
          })}
        </div>
      </div>
      {calcEvals.length > 0 && (
        <div>
          <h3 className="text-[#241F2E] font-bold text-sm mb-3 px-1">🔢 {currentLang === 'ba' ? 'Dooru' : 'Calcul'}</h3>
          <div className="space-y-2">
            {calcEvals.map(ev => {
              const score = progress.evaluationScores[ev.id];
              return (
                <motion.button key={ev.id} whileTap={{ scale: 0.98 }}
                  onClick={() => { setSelectedEvalId(ev.id); setSection('eval-detail'); }}
                  className="w-full flex items-center gap-3 p-4 rounded-[18px] bg-white border border-[#E4DFCC]"
                >
                  <div className="w-12 h-12 rounded-[14px] bg-[#F3E3B9] flex items-center justify-center">
                    <span className="text-2xl">🧮</span>
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-[#241F2E] font-semibold text-sm">{ev.title}</p>
                    <p className="text-[#8C8571] text-xs">{ev.allQuestions.length} {currentLang === 'ba' ? 'gari bikiabu' : 'questions'}</p>
                  </div>
                  {score !== undefined && (
                    <span className="px-3 py-1 rounded-full bg-[#DCEAE0] text-[#3F6E52] text-sm font-extrabold">{score}%</span>
                  )}
                  <ChevronRight className="w-4 h-4 text-[#B9B5A8]" />
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
      <AuthGuardBanner />

      {isTeacher && (
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/teacher')}
          className="w-full flex items-center gap-3 p-3 rounded-[18px] bg-[#241F2E] text-white text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm">{currentLang === 'ba' ? 'Sɔ̃ɔsibun tabulo' : 'Tableau enseignant'}</p>
            <p className="text-white/80 text-xs">{currentLang === 'ba' ? 'Apprenants, copies, statistiques' : 'Apprenants, copies, statistiques'}</p>
          </div>
          <ChevronRight className="w-5 h-5" />
        </motion.button>
      )}

      {renderLevelSelector()}

      {/* Stats */}
      <div className="flex gap-3">
        <div className="flex-1 h-[80px] flex flex-col items-center justify-center rounded-[18px] bg-white border border-[#E4DFCC] text-center">
          <p className="text-[16px] font-extrabold text-[#241F2E]">{completedCount}</p>
          <p className="text-[#8C8571] text-[11px] mt-1">{currentLang === 'ba' ? 'Gari kobu' : 'Leçons'}</p>
        </div>
        <div className="flex-1 h-[80px] flex flex-col items-center justify-center rounded-[18px] bg-white border border-[#E4DFCC] text-center">
          <p className="text-[16px] font-extrabold text-[#241F2E]">{Object.keys(progress.evaluationScores).length}</p>
          <p className="text-[#8C8571] text-[11px] mt-1">{currentLang === 'ba' ? 'Yaayasiabu' : 'Évaluations'}</p>
        </div>
        <div className="flex-1 h-[80px] flex flex-col items-center justify-center rounded-[18px] bg-white border border-[#E4DFCC] text-center">
          <p className={`text-[16px] font-extrabold text-[#9C6B1D]`}>{progressPercent}%</p>
          <p className="text-[#8C8571] text-[11px] mt-1">{currentLang === 'ba' ? 'Swaa sɔɔ' : 'Progression'}</p>
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
            className="flex flex-col items-start gap-1 p-3 h-[156px] rounded-[18px] bg-white border border-[#E4DFCC] text-left transition-all"
          >
            <div className={`w-[44px] h-[44px] mb-auto rounded-full bg-[#F3E3B9] flex items-center justify-center`}>
              <span className="text-[22px]">{sec.emoji}</span>
            </div>
            <span className="text-[#241F2E] text-[13px] font-extrabold">{sec.label}</span>
            <span className="text-[#8C8571] text-[10.5px] leading-snug">{sec.desc}</span>
            {sec.count !== undefined && (
              <span className="text-[#3F6E52] text-[10.5px] font-extrabold">{sec.count}/{totalLessons} ✓</span>
            )}
          </motion.button>
        ))}

        {/* Mes corrections — visible only when authenticated */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: sectionCards.length * 0.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setSection('corrections')}
          className="flex flex-col items-start gap-1 p-3 h-[156px] rounded-[18px] bg-white border border-[#E4DFCC] text-left transition-all"
        >
          <div className="w-[44px] h-[44px] mb-auto rounded-full bg-[#DCEAE0] flex items-center justify-center">
            <span className="text-[22px]">✅</span>
          </div>
          <span className="text-[#241F2E] text-[13px] font-extrabold">
            {currentLang === 'ba' ? 'Nɛn gɔrasun' : 'Mes corrections'}
          </span>
          <span className="text-[#8C8571] text-[10.5px] leading-snug">
            {currentLang === 'ba' ? 'Sɔ̃ɔsiri yorubu' : 'Notes & commentaires'}
          </span>
        </motion.button>
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
    grammaire: currentLang === 'ba' ? 'Sɔ̃ɔsirun swɛɛru' : 'Grammaire',
    textprod: currentLang === 'ba' ? 'Sɔm yorubu' : 'Production de textes',
    gestion: currentLang === 'ba' ? 'Gobi dwebu' : 'Gestion',
    corrections: currentLang === 'ba' ? 'Nɛn gɔrasun' : 'Mes corrections',
  };

  const levelBadge = activeLevel === 'N2' ? '🚀 N2' : '🔥 N1';

  return (
    <div className="h-full flex flex-col bg-[#F7F5EC] text-[#241F2E]">
      {/* Header */}
      <div className="flex items-center gap-3 pl-[74px] pr-[18px] pt-[14px] pb-2 min-h-[62px]">
        {section !== 'home' && (
          <button type="button" onClick={goBack} aria-label="Retour" className="absolute right-[18px] top-[14px] z-[86] flex h-[38px] items-center gap-1 rounded-full border border-[#E4DFCC] bg-white px-3 text-[12px] font-extrabold text-[#241F2E]">
            <ArrowLeft className="w-4 h-4" /> Retour
          </button>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-[#241F2E] font-extrabold text-[17px] leading-tight truncate">
            {sectionTitles[section]}
          </h1>
          <p className="text-[#8C8571] text-[11px] leading-tight">{levelBadge.replace(/[^\w ]/gu, '').trim()} — Bàátɔ̀nú</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-[18px] pb-4 pt-3">
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
            {section === 'calcul' && <ClasseCalculView level={activeLevel} />}
            {section === 'evaluations' && renderEvaluationList()}
            {section === 'eval-detail' && (
              <ClasseEvaluation evalId={selectedEvalId} level={activeLevel} onBack={() => setSection("evaluations")} />
            )}
            {section === 'facilitateur' && <ClasseFacilitateur activeLevel={activeLevel} />}
            {section === 'grammaire' && <ClasseGrammaireN2 />}
            {section === 'textprod' && <ClasseTextProdN2 />}
            {section === 'gestion' && <ClasseGestionN2 />}
            {section === 'corrections' && <ClasseCorrections />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
