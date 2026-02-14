import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Volume2, Check, X, Flame, BookOpen, Star, Trophy, Award, Share2, ChevronDown, Zap, Target, Sparkles, GraduationCap, ChevronRight, LogIn, Lock, MessageSquarePlus, AlertTriangle, PenTool } from 'lucide-react';
import { ContributionModal } from '@/components/fitila/ContributionModal';
import { EditorToolbar } from '@/components/fitila/EditorToolbar';
import { useNavigate } from 'react-router-dom';
import { useFitilaLanguage } from '@/contexts/FitilaLanguageContext';
import { useSideMenu } from '@/pages/fitila/FitilaApp';
import { triggerFeedback } from '@/utils/tamtamFeedback';
import { useLearningProgress } from '@/hooks/useLearningProgress';
import { THEMES, EXERCISES, buildOptions, getCorrectAnswer, getQuestion, shuffleArray, type Exercise } from '@/data/learningExercises';
import { LEVELS, BADGES } from '@/data/learningConfig';
import { FOUNDATION_LESSONS, type FoundationLesson, type FoundationQuiz } from '@/data/learningFoundations';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { useTamTamProfile } from '@/hooks/useTamTamProfile';
import { useEditorRole } from '@/hooks/useEditorRole';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

type ViewType = 'language-selection' | 'dashboard' | 'lesson' | 'lesson-complete' | 'foundation-lesson' | 'foundation-quiz';

export default function FitilaLearn() {
  const navigate = useNavigate();
  const { currentLang } = useFitilaLanguage();
  const { open: openMenu } = useSideMenu();
  const { user } = useAuth();
  const { profile: tamtamProfile } = useTamTamProfile();
  const { isEditor } = useEditorRole();
  const { toast } = useToast();
  const progress = useLearningProgress();
  const { userLanguage, selectLanguage, config, langKey, profile, getCurrentLevel, getNextLevel, getText, getLevelName, shareProgress, completeLesson, newBadges, clearNewBadges } = progress;

  const [currentView, setCurrentView] = useState<ViewType>(userLanguage ? 'dashboard' : 'language-selection');
  const [showLangSwitch, setShowLangSwitch] = useState(false);

  // Lesson state
  const [currentThemeId, setCurrentThemeId] = useState<string | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [currentOptions, setCurrentOptions] = useState<string[]>([]);
  const [showLevelUp, setShowLevelUp] = useState(false);

  // Foundation state
  const [currentFoundation, setCurrentFoundation] = useState<FoundationLesson | null>(null);
  const [foundationQuizIndex, setFoundationQuizIndex] = useState(0);
  const [foundationQuizScore, setFoundationQuizScore] = useState(0);
  const [foundationQuizAnswer, setFoundationQuizAnswer] = useState<number | null>(null);
  const [showFoundations, setShowFoundations] = useState(true);
  const [contributionCtx, setContributionCtx] = useState<{ lessonId: string; lessonTitle: string; sectionIndex?: number; quizIndex?: number; type: 'correction' | 'suggestion' } | null>(null);

  // Editor inline editing state
  const [editingSection, setEditingSection] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<{ contentFr: string; contentBr: string; titleFr: string; titleBr: string }>({ contentFr: '', contentBr: '', titleFr: '', titleBr: '' });

  const currentLevel = getCurrentLevel();
  const nextLevel = getNextLevel();
  const progressToNext = nextLevel
    ? ((profile.xp - currentLevel.minXP) / (nextLevel.minXP - currentLevel.minXP)) * 100
    : 100;

  const direction = config?.direction || 'fr_to_bariba';

  const handleSelectLanguage = (lang: 'french' | 'bariba') => {
    selectLanguage(lang);
    setCurrentView('dashboard');
    triggerFeedback('click');
  };

  const handleBack = () => {
    if (currentView === 'foundation-quiz') {
      setCurrentView('foundation-lesson');
    } else if (currentView === 'foundation-lesson' || currentView === 'lesson' || currentView === 'lesson-complete') {
      setCurrentView('dashboard');
    } else if (currentView === 'dashboard') {
      navigate('/fitila/social');
    } else {
      navigate('/fitila/social');
    }
    triggerFeedback('click');
  };

  const startLesson = (themeId: string) => {
    const themeExercises = EXERCISES[themeId];
    if (!themeExercises || themeExercises.length === 0) return;
    const shuffled = shuffleArray(themeExercises).slice(0, 10);
    setCurrentThemeId(themeId);
    setExercises(shuffled);
    setExerciseIndex(0);
    setScore(0);
    setSelectedAnswer(null);
    setIsCorrect(null);
    setCurrentOptions(buildOptions(shuffled[0], direction));
    setCurrentView('lesson');
    triggerFeedback('click');
  };

  const startFoundation = (lesson: FoundationLesson) => {
    setCurrentFoundation(lesson);
    setCurrentView('foundation-lesson');
    triggerFeedback('click');
  };

  const startFoundationQuiz = () => {
    setFoundationQuizIndex(0);
    setFoundationQuizScore(0);
    setFoundationQuizAnswer(null);
    setCurrentView('foundation-quiz');
    triggerFeedback('click');
  };

  const handleFoundationAnswer = (idx: number) => {
    if (foundationQuizAnswer !== null || !currentFoundation) return;
    setFoundationQuizAnswer(idx);
    const correct = idx === currentFoundation.quiz[foundationQuizIndex].correctIndex;
    if (correct) setFoundationQuizScore(s => s + 1);
    triggerFeedback(correct ? 'success' : 'error');
  };

  const nextFoundationQuestion = () => {
    if (!currentFoundation) return;
    if (foundationQuizIndex < currentFoundation.quiz.length - 1) {
      setFoundationQuizIndex(i => i + 1);
      setFoundationQuizAnswer(null);
    } else {
      completeLesson(currentFoundation.id, foundationQuizScore, currentFoundation.quiz.length);
      setCurrentView('lesson-complete');
      setCurrentThemeId(currentFoundation.id);
    }
  };

  const handleAnswer = (answer: string) => {
    if (selectedAnswer !== null) return;
    const exercise = exercises[exerciseIndex];
    const correct = answer === getCorrectAnswer(exercise, direction);
    setSelectedAnswer(answer);
    setIsCorrect(correct);
    if (correct) setScore(s => s + 1);
    triggerFeedback(correct ? 'success' : 'error');

    setTimeout(() => {
      if (exerciseIndex < exercises.length - 1) {
        const nextIdx = exerciseIndex + 1;
        setExerciseIndex(nextIdx);
        setSelectedAnswer(null);
        setIsCorrect(null);
        setCurrentOptions(buildOptions(exercises[nextIdx], direction));
      } else {
        const finalScore = correct ? score + 1 : score;
        completeLesson(currentThemeId!, finalScore, exercises.length);
        setCurrentView('lesson-complete');
      }
    }, 1200);
  };

  const speakFrench = (text: string) => {
    if ('speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'fr-FR';
      u.rate = 0.85;
      speechSynthesis.speak(u);
      triggerFeedback('click');
    }
  };

  // ═══ EDITOR FUNCTIONS ═══
  const startEditSection = (sIdx: number) => {
    if (!currentFoundation) return;
    const section = currentFoundation.sections[sIdx];
    setEditingSection(sIdx);
    setEditValues({
      contentFr: section.content.fr,
      contentBr: section.content.br,
      titleFr: section.title.fr,
      titleBr: section.title.br,
    });
  };

  const saveEditSection = async () => {
    if (!currentFoundation || editingSection === null || !user) return;
    const section = currentFoundation.sections[editingSection];
    
    try {
      await supabase.from('learning_content_edits').insert({
        editor_id: user.id,
        lesson_id: currentFoundation.id,
        section_index: editingSection,
        edit_type: 'edit',
        field_name: 'section_content',
        old_value: JSON.stringify({ title: section.title, content: section.content }),
        new_value: JSON.stringify({ title: { fr: editValues.titleFr, br: editValues.titleBr }, content: { fr: editValues.contentFr, br: editValues.contentBr } }),
      });

      // Apply locally
      section.title.fr = editValues.titleFr;
      section.title.br = editValues.titleBr;
      section.content.fr = editValues.contentFr;
      section.content.br = editValues.contentBr;

      setEditingSection(null);
      toast({ title: '✅', description: userLanguage === 'french' ? 'Section modifiée' : 'Gbɛsiru mɑɑru' });
    } catch (e: any) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    }
  };

  const deleteSection = async (sIdx: number) => {
    if (!currentFoundation || !user) return;
    const section = currentFoundation.sections[sIdx];

    try {
      await supabase.from('learning_content_edits').insert({
        editor_id: user.id,
        lesson_id: currentFoundation.id,
        section_index: sIdx,
        edit_type: 'delete',
        field_name: 'section',
        old_value: JSON.stringify({ title: section.title, content: section.content }),
      });

      currentFoundation.sections.splice(sIdx, 1);
      setCurrentFoundation({ ...currentFoundation });
      toast({ title: '🗑️', description: userLanguage === 'french' ? 'Section supprimée' : 'Bɔru mɑɑru' });
    } catch (e: any) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    }
  };

  const validateSection = async (sIdx: number) => {
    if (!currentFoundation || !user) return;

    try {
      await supabase.from('learning_content_edits').insert({
        editor_id: user.id,
        lesson_id: currentFoundation.id,
        section_index: sIdx,
        edit_type: 'validate',
        field_name: 'section',
        new_value: 'validated',
      });

      toast({ title: '✅', description: userLanguage === 'french' ? 'Section validée' : 'Sɛnbu mɑɑru' });
    } catch (e: any) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    }
  };

  const currentTheme = THEMES.find(t => t.id === currentThemeId);

  const themeButtonGradients: Record<string, string> = {
    salutations: 'from-violet-400 to-purple-500',
    famille: 'from-pink-400 to-rose-500',
    nourriture: 'from-orange-400 to-amber-500',
    sante: 'from-emerald-400 to-green-500',
    commerce: 'from-yellow-400 to-amber-500',
    emotions: 'from-red-400 to-rose-500',
    etats: 'from-violet-400 to-indigo-500',
    actions: 'from-cyan-400 to-teal-500',
    temps: 'from-indigo-400 to-blue-500',
    proverbes: 'from-amber-500 to-orange-600',
  };

  const themeIconBgs: Record<string, string> = {
    salutations: 'bg-blue-100',
    famille: 'bg-pink-100',
    nourriture: 'bg-orange-100',
    sante: 'bg-green-100',
    commerce: 'bg-yellow-100',
    emotions: 'bg-red-100',
    etats: 'bg-violet-100',
    actions: 'bg-cyan-100',
    temps: 'bg-indigo-100',
    proverbes: 'bg-amber-100',
  };

  return (
    <div className="h-[100dvh] flex flex-col bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      {/* Level up overlay */}
      <AnimatePresence>
        {showLevelUp && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setShowLevelUp(false)}>
            <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }} className="bg-white rounded-3xl p-12 text-center shadow-2xl">
              <div className="text-7xl mb-4">{currentLevel.icon}</div>
              <h2 className="text-3xl font-bold text-purple-600 mb-2">{getText('levelUp')}</h2>
              <p className="text-gray-700 text-lg">{getText('youAreNow')} {getLevelName(currentLevel)}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      {currentView !== 'language-selection' && (
        <div className="flex-shrink-0 px-4 pt-4 pb-3">
          <div className="flex items-center justify-between">
            <motion.button whileTap={{ scale: 0.9 }} onClick={handleBack} className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </motion.button>
            <h1 className="text-gray-800 font-bold text-lg">
              {config?.flag} {userLanguage === 'french' ? 'Apprendre le Bariba' : 'Fãsei debu'}
            </h1>
            <div className="relative">
              <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowLangSwitch(!showLangSwitch)} className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center text-sm">
                {config?.flag || '🌐'}
              </motion.button>
              {showLangSwitch && (
                <div className="absolute right-0 top-12 bg-white rounded-xl shadow-xl border border-gray-100 p-1 z-20 min-w-[140px]">
                  <button onClick={() => { handleSelectLanguage('french'); setShowLangSwitch(false); }} className="w-full text-left px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-50 text-sm">🇫🇷 Français</button>
                  <button onClick={() => { handleSelectLanguage('bariba'); setShowLangSwitch(false); }} className="w-full text-left px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-50 text-sm">🌍 Bariba</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {/* ═══ LANGUAGE SELECTION ═══ */}
          {currentView === 'language-selection' && (
            <motion.div key="lang-select" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center min-h-full px-6 py-8">
              <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-lg w-full">
                <div className="text-center mb-8">
                  <h1 className="text-3xl font-bold text-gray-800 mb-2">Bienvenue / Sĩa kãnu</h1>
                  <p className="text-gray-500">Choisissez votre langue maternelle</p>
                  <p className="text-gray-400 text-sm">A win yenu debu</p>
                </div>
                <div className="space-y-4">
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => handleSelectLanguage('french')} className="w-full bg-gradient-to-br from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 rounded-3xl p-8 text-left text-white transition-all shadow-lg hover:shadow-xl">
                    <div className="text-6xl mb-4">🇫🇷</div>
                    <h2 className="text-2xl font-bold mb-1">Je parle Français</h2>
                    <p className="text-white/80 text-sm mb-4">Je veux apprendre le Bariba</p>
                    <div className="bg-white/15 rounded-xl p-3 text-xs space-y-1">
                      <p className="font-semibold mb-1">Vous apprendrez :</p>
                      <p>✓ Système tonal (3 tons)</p>
                      <p>✓ Ordre SOV (différent du français)</p>
                      <p>✓ Classes nominales</p>
                      <p>✓ Culture bariba</p>
                    </div>
                  </motion.button>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => handleSelectLanguage('bariba')} className="w-full bg-gradient-to-br from-green-500 to-green-700 hover:from-green-600 hover:to-green-800 rounded-3xl p-8 text-left text-white transition-all shadow-lg hover:shadow-xl">
                    <div className="text-6xl mb-4">🌍</div>
                    <h2 className="text-2xl font-bold mb-1">Ń nɛɛ Bariba</h2>
                    <p className="text-white/80 text-sm mb-4">Ń wure Fãsei debu</p>
                    <div className="bg-white/15 rounded-xl p-3 text-xs space-y-1">
                      <p className="font-semibold mb-1">A deburenu :</p>
                      <p>✓ Yenu fãsei (26 yenu)</p>
                      <p>✓ SVO kpindu (kã Bariba)</p>
                      <p>✓ Koru deburu (conjugaisons)</p>
                      <p>✓ Fãsei waakurenu</p>
                    </div>
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ═══ DASHBOARD ═══ */}
          {currentView === 'dashboard' && config && (
            <motion.div key="dashboard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="px-4 pb-6 space-y-5">
              {/* Profile card */}
              <div className="bg-white rounded-3xl shadow-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    {user && tamtamProfile?.avatar_url ? (
                      <Avatar className="w-16 h-16 border-3 border-white shadow-lg">
                        <AvatarImage src={tamtamProfile.avatar_url} className="object-cover" />
                        <AvatarFallback className="bg-gradient-to-br from-green-100 to-green-200 text-2xl">
                          {tamtamProfile.display_name?.[0]?.toUpperCase() || currentLevel.icon}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center text-4xl shadow-md">
                        {currentLevel.icon}
                      </div>
                    )}
                    <div>
                      <h2 className="text-xl font-bold text-gray-800">
                        {user && tamtamProfile?.display_name
                          ? tamtamProfile.display_name
                          : (userLanguage === 'french' ? 'Apprenant' : 'Debutɔm')}
                      </h2>
                      <p className={`text-sm font-semibold ${currentLevel.color}`}>
                        {getLevelName(currentLevel)} - {getText('level')} {currentLevel.level}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Flame className="w-4 h-4 text-orange-500" />
                        <span className="text-sm text-gray-500 font-medium">{profile.streak} {getText('dayStreak')}</span>
                      </div>
                    </div>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => { shareProgress(); triggerFeedback('click'); }}
                    className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-2.5 rounded-full text-sm font-semibold shadow-md hover:shadow-lg transition-all"
                  >
                    <Share2 className="w-4 h-4" />
                    {getText('share')}
                  </motion.button>
                </div>

                {/* XP bar */}
                <div className="mb-4">
                  <div className="flex justify-between mb-1.5 text-xs font-semibold">
                    <span className="text-gray-500">{profile.xp} {getText('xp')}</span>
                    {nextLevel && (
                      <span className="text-gray-500">
                        {nextLevel.minXP} {getText('xp')} {userLanguage === 'french' ? 'pour' : 'yira'} {getLevelName(nextLevel)}
                      </span>
                    )}
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3.5 overflow-hidden">
                    <motion.div
                      className="bg-gradient-to-r from-green-400 via-blue-400 to-purple-500 h-full rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${progressToNext}%` }}
                      transition={{ duration: 0.6 }}
                    />
                  </div>
                </div>

                {/* Stats cards */}
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { icon: <BookOpen className="w-5 h-5 text-blue-600 mx-auto mb-1" />, value: profile.completedLessons, label: getText('completedLessons'), bg: 'bg-gradient-to-br from-blue-50 to-blue-100', textColor: 'text-blue-700', labelColor: 'text-blue-600' },
                    { icon: <Target className="w-5 h-5 text-green-600 mx-auto mb-1" />, value: profile.masteredWords, label: getText('masteredWords'), bg: 'bg-gradient-to-br from-green-50 to-green-100', textColor: 'text-green-700', labelColor: 'text-green-600' },
                    { icon: <Sparkles className="w-5 h-5 text-purple-600 mx-auto mb-1" />, value: profile.perfectScores, label: getText('perfectScores'), bg: 'bg-gradient-to-br from-purple-50 to-purple-100', textColor: 'text-purple-700', labelColor: 'text-purple-600' },
                    { icon: <Award className="w-5 h-5 text-orange-600 mx-auto mb-1" />, value: profile.badges.length, label: getText('earnedBadges'), bg: 'bg-gradient-to-br from-orange-50 to-orange-100', textColor: 'text-orange-700', labelColor: 'text-orange-600' },
                  ].map((s, i) => (
                    <div key={i} className={`${s.bg} rounded-xl p-3 text-center`}>
                      {s.icon}
                      <div className={`${s.textColor} font-bold text-xl`}>{s.value}</div>
                      <div className={`${s.labelColor} text-[10px] font-medium`}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Login recommendation banner */}
              {!user && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl p-4 flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <LogIn className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-amber-800 font-semibold text-sm">
                      {userLanguage === 'french'
                        ? 'Connectez-vous pour sauvegarder votre progression'
                        : 'A doo kɑ win taaruru mɑɑ'}
                    </p>
                    <p className="text-amber-600 text-xs mt-0.5">
                      {userLanguage === 'french'
                        ? 'Votre évolution sera conservée entre vos sessions'
                        : 'Win deburu kɑ tɑɑ sɔɔ wɑ̃ɑ'}
                    </p>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate('/fitila/auth')}
                    className="bg-amber-500 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md flex-shrink-0"
                  >
                    {userLanguage === 'french' ? 'Connexion' : 'Doo'}
                  </motion.button>
                </motion.div>
              )}

              {/* Badges */}
              {profile.badges.length > 0 && (
                <div className="bg-white rounded-3xl shadow-xl p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-yellow-500" />
                    {getText('myBadges')}
                  </h3>
                  <div className="grid grid-cols-4 gap-3">
                    {BADGES.filter(b => profile.badges.includes(b.id)).map(b => (
                      <div key={b.id} className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl p-3 text-center border-2 border-yellow-200">
                        <div className="text-3xl mb-1">{b.icon}</div>
                        <div className="font-bold text-gray-700 text-xs">{b.name[langKey]}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ═══ FOUNDATIONS SECTION ═══ */}
              <div className="bg-white rounded-3xl shadow-xl p-6">
                <button onClick={() => setShowFoundations(!showFoundations)} className="w-full flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <GraduationCap className="w-5 h-5 text-indigo-500" />
                    {getText('foundations')}
                  </h3>
                  <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${showFoundations ? 'rotate-180' : ''}`} />
                </button>
                {showFoundations && (
                  <>
                    <p className="text-gray-500 text-xs mb-4">{getText('foundationsSub')}</p>
                    <div className="grid grid-cols-2 gap-3">
                      {FOUNDATION_LESSONS.map((fl, idx) => {
                        const isComingSoon = fl.id === 'nombres';
                        return (
                          <motion.button
                            key={fl.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.04 }}
                            onClick={() => !isComingSoon && startFoundation(fl)}
                            disabled={isComingSoon}
                            className={`border-2 rounded-2xl p-4 text-left transition-all group relative overflow-hidden ${
                              isComingSoon
                                ? 'border-gray-200 opacity-60 cursor-not-allowed'
                                : 'border-gray-100 hover:border-indigo-200 hover:shadow-lg'
                            }`}
                          >
                            {isComingSoon && (
                              <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] z-10 flex flex-col items-center justify-center rounded-2xl">
                                <Lock className="w-5 h-5 text-gray-400 mb-1" />
                                <span className="text-gray-500 text-xs font-bold">
                                  {userLanguage === 'french' ? 'À venir' : 'Kɑ nɑɑ'}
                                </span>
                              </div>
                            )}
                            <div className="flex items-center gap-3 mb-2">
                              <div className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl shadow-sm" style={{ backgroundColor: fl.color + '18' }}>
                                {fl.icon}
                              </div>
                              <ChevronRight className="w-4 h-4 text-gray-300 ml-auto group-hover:text-indigo-400 transition-colors" />
                            </div>
                            <h4 className="font-bold text-gray-800 text-xs leading-tight">{fl.title[langKey]}</h4>
                            <p className="text-[10px] text-gray-400 mt-1">{fl.sections.length} {getText('sections')} • {fl.quiz.length} {getText('quiz')}</p>
                          </motion.button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              {/* Learning Themes */}
              <div className="bg-white rounded-3xl shadow-xl p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-5 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-500" />
                  {getText('themes')}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {THEMES.map((theme, idx) => (
                    <motion.div
                      key={theme.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className="border-2 border-gray-100 rounded-2xl p-4 hover:border-purple-200 hover:shadow-lg transition-all"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`${themeIconBgs[theme.id] || 'bg-gray-100'} w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-sm`}>
                          {theme.icon}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-gray-800 text-sm">{theme.name[langKey]}</h4>
                          <p className="text-xs text-gray-500">{theme.lessonsCount} {getText('lessonsAvailable')}</p>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-1 text-yellow-600 font-bold text-sm">
                            <Zap className="w-4 h-4" />
                            +{theme.xpPerLesson} XP
                          </div>
                        </div>
                      </div>
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={() => startLesson(theme.id)}
                        className={`w-full bg-gradient-to-r ${themeButtonGradients[theme.id] || 'from-purple-400 to-pink-500'} text-white py-3 rounded-xl font-semibold text-sm shadow-md hover:shadow-lg transition-all`}
                      >
                        {getText('start')} →
                      </motion.button>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* ═══ FOUNDATION LESSON ═══ */}
          {currentView === 'foundation-lesson' && currentFoundation && config && (
            <motion.div key="foundation" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="px-4 pb-6 space-y-4">
              {/* Title */}
              <div className="bg-white rounded-2xl shadow-md p-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-3xl" style={{ backgroundColor: currentFoundation.color + '18' }}>
                    {currentFoundation.icon}
                  </div>
                  <div className="flex-1">
                    <h2 className="text-lg font-bold text-gray-800">{currentFoundation.title[langKey]}</h2>
                    <p className="text-xs text-gray-500">{currentFoundation.sections.length} {getText('sections')}</p>
                  </div>
                  {isEditor && (
                    <div className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full text-[10px] font-bold">
                      <PenTool className="w-3 h-3" />
                      {userLanguage === 'french' ? 'Mode éditeur' : 'Gbɛsiru'}
                    </div>
                  )}
                </div>
              </div>

              {/* Sections */}
              {currentFoundation.sections.map((section, sIdx) => (
                <motion.div
                  key={sIdx}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: sIdx * 0.08 }}
                  className="bg-white rounded-2xl shadow-md p-5 space-y-3"
                >
                  {/* Section header with editor toolbar */}
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-gray-800 text-base flex items-center gap-2">
                      <span className="w-7 h-7 rounded-full text-white text-xs font-bold flex items-center justify-center" style={{ backgroundColor: currentFoundation.color }}>
                        {sIdx + 1}
                      </span>
                      {editingSection === sIdx ? (
                        <input
                          value={editValues[langKey === 'fr' ? 'titleFr' : 'titleBr']}
                          onChange={(e) => setEditValues(v => ({ ...v, [langKey === 'fr' ? 'titleFr' : 'titleBr']: e.target.value }))}
                          className="border-b-2 border-blue-400 bg-transparent outline-none text-base font-bold flex-1"
                        />
                      ) : (
                        section.title[langKey]
                      )}
                    </h3>
                    {isEditor && (
                      <EditorToolbar
                        onEdit={() => startEditSection(sIdx)}
                        onDelete={() => deleteSection(sIdx)}
                        onValidate={() => validateSection(sIdx)}
                        isEditing={editingSection === sIdx}
                        onSave={saveEditSection}
                        onCancel={() => setEditingSection(null)}
                        lang={userLanguage || 'french'}
                        compact
                      />
                    )}
                  </div>

                  {/* Content - editable or static */}
                  {editingSection === sIdx ? (
                    <textarea
                      value={editValues[langKey === 'fr' ? 'contentFr' : 'contentBr']}
                      onChange={(e) => setEditValues(v => ({ ...v, [langKey === 'fr' ? 'contentFr' : 'contentBr']: e.target.value }))}
                      className="w-full text-gray-600 text-sm leading-relaxed border-2 border-blue-200 rounded-xl p-3 bg-blue-50/30 min-h-[100px] outline-none focus:border-blue-400"
                      rows={5}
                    />
                  ) : (
                    <p className="text-gray-600 text-sm leading-relaxed">{section.content[langKey]}</p>
                  )}

                  {/* Table */}
                  {section.table && (
                    <div className="overflow-x-auto -mx-2">
                      <table className="w-full text-xs border-collapse min-w-[320px]">
                        <thead>
                          <tr>
                            {section.table.headers.map((h, i) => (
                              <th key={i} className="text-left px-2 py-2 font-bold text-gray-700 border-b-2" style={{ borderColor: currentFoundation.color + '40' }}>
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {section.table.rows.map((row, rIdx) => (
                            <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-gray-50/50' : ''}>
                              {row.map((cell, cIdx) => (
                                <td key={cIdx} className="px-2 py-1.5 text-gray-600 border-b border-gray-100">
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Examples */}
                  {section.examples && section.examples.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        {userLanguage === 'french' ? 'Exemples' : 'Yirɑnu'}
                      </p>
                      {section.examples.map((ex, eIdx) => (
                        <div key={eIdx} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                          <div className="flex items-start gap-2">
                            <div className="flex-1">
                              <p className="font-semibold text-gray-800 text-sm">{ex.bariba}</p>
                              <p className="text-gray-500 text-xs">{ex.french}</p>
                            </div>
                            {ex.french && (
                              <motion.button whileTap={{ scale: 0.85 }} onClick={() => speakFrench(ex.french)} className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                                <Volume2 className="w-3.5 h-3.5 text-blue-500" />
                              </motion.button>
                            )}
                          </div>
                          {ex.note && <p className="text-[10px] text-indigo-500 mt-1 italic">💡 {ex.note}</p>}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Tip */}
                  {section.tip && (
                    <div className="bg-amber-50 rounded-xl p-3 border border-amber-200">
                      <p className="text-amber-800 text-xs">{section.tip[langKey]}</p>
                    </div>
                  )}

                  {/* Contribute / Correct buttons (for non-editors) */}
                  {user && !isEditor && (
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => setContributionCtx({ lessonId: currentFoundation.id, lessonTitle: currentFoundation.title[langKey], sectionIndex: sIdx, type: 'correction' })}
                        className="flex items-center gap-1 text-[10px] text-amber-600 bg-amber-50 px-2.5 py-1.5 rounded-lg hover:bg-amber-100 transition-colors"
                      >
                        <AlertTriangle className="w-3 h-3" />
                        {userLanguage === 'french' ? 'Corriger' : 'Gbɛgbɛru'}
                      </button>
                      <button
                        onClick={() => setContributionCtx({ lessonId: currentFoundation.id, lessonTitle: currentFoundation.title[langKey], sectionIndex: sIdx, type: 'suggestion' })}
                        className="flex items-center gap-1 text-[10px] text-blue-600 bg-blue-50 px-2.5 py-1.5 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        <MessageSquarePlus className="w-3 h-3" />
                        {userLanguage === 'french' ? 'Suggérer' : 'Sɔmburu'}
                      </button>
                    </div>
                  )}
                </motion.div>
              ))}

              {/* Start Quiz button */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={startFoundationQuiz}
                className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white py-4 rounded-2xl font-bold text-sm shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
              >
                <GraduationCap className="w-5 h-5" />
                {getText('quiz')} ({currentFoundation.quiz.length} {userLanguage === 'french' ? 'questions' : 'kasuurenu'})
              </motion.button>
            </motion.div>
          )}

          {/* ═══ FOUNDATION QUIZ ═══ */}
          {currentView === 'foundation-quiz' && currentFoundation && config && (
            <motion.div key="fquiz" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="px-4 pb-6 space-y-4">
              {/* Progress */}
              <div className="bg-white rounded-2xl shadow-md p-4">
                <div className="flex justify-between mb-2 text-xs font-semibold">
                  <span className="text-gray-500">{getText('quiz')} {foundationQuizIndex + 1} / {currentFoundation.quiz.length}</span>
                  <span className="text-green-600">{getText('score')}: {foundationQuizScore} / {currentFoundation.quiz.length}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                  <div className="bg-gradient-to-r from-indigo-400 to-purple-500 h-full rounded-full transition-all duration-300" style={{ width: `${((foundationQuizIndex + 1) / currentFoundation.quiz.length) * 100}%` }} />
                </div>
              </div>

              {/* Question */}
              {(() => {
                const q = currentFoundation.quiz[foundationQuizIndex];
                return (
                  <>
                    <div className="bg-white rounded-3xl shadow-xl p-6 text-center">
                      <p className="text-gray-800 font-bold text-xl">{q.question[langKey]}</p>
                    </div>

                    <div className="space-y-3">
                      {q.options.map((opt, idx) => {
                        let styles = 'bg-white border-gray-200 hover:border-indigo-300 hover:shadow-md';
                        if (foundationQuizAnswer !== null) {
                          if (idx === q.correctIndex) styles = 'bg-green-50 border-green-400 shadow-md';
                          else if (idx === foundationQuizAnswer) styles = 'bg-red-50 border-red-400 shadow-md';
                          else styles = 'bg-white border-gray-100 opacity-50';
                        }
                        return (
                          <motion.button
                            key={idx}
                            whileTap={foundationQuizAnswer === null ? { scale: 0.98 } : {}}
                            onClick={() => handleFoundationAnswer(idx)}
                            disabled={foundationQuizAnswer !== null}
                            className={`w-full p-4 rounded-2xl border-2 ${styles} transition-all text-left flex items-center justify-between shadow-sm`}
                          >
                            <span className="text-gray-800 text-sm font-medium">{opt}</span>
                            {foundationQuizAnswer !== null && idx === q.correctIndex && <Check className="w-5 h-5 text-green-500" />}
                            {foundationQuizAnswer === idx && idx !== q.correctIndex && <X className="w-5 h-5 text-red-500" />}
                          </motion.button>
                        );
                      })}
                    </div>

                    {/* Feedback & explanation */}
                    <AnimatePresence>
                      {foundationQuizAnswer !== null && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                          <div className={`p-4 rounded-2xl ${foundationQuizAnswer === q.correctIndex ? 'bg-green-50 border-2 border-green-300' : 'bg-red-50 border-2 border-red-300'}`}>
                            <div className="flex items-center gap-2 mb-1">
                              {foundationQuizAnswer === q.correctIndex ? <Check className="w-5 h-5 text-green-600" /> : <X className="w-5 h-5 text-red-600" />}
                              <span className={`font-bold text-sm ${foundationQuizAnswer === q.correctIndex ? 'text-green-700' : 'text-red-700'}`}>
                                {foundationQuizAnswer === q.correctIndex ? getText('correctAnswer') : getText('wrongAnswer')}
                              </span>
                            </div>
                            <p className="text-gray-600 text-xs">{q.explanation[langKey]}</p>
                          </div>
                          <div className="flex gap-2">
                            <motion.button
                              whileTap={{ scale: 0.97 }}
                              onClick={nextFoundationQuestion}
                              className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-500 text-white py-3.5 rounded-xl font-bold text-sm shadow-md"
                            >
                              {foundationQuizIndex < currentFoundation.quiz.length - 1 ? getText('nextQuestion') : getText('complete')}
                            </motion.button>
                            {user && (
                              <button
                                onClick={() => setContributionCtx({ lessonId: currentFoundation.id, lessonTitle: currentFoundation.title[langKey], quizIndex: foundationQuizIndex, type: 'correction' })}
                                className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center border border-amber-200"
                                title={userLanguage === 'french' ? 'Signaler une erreur' : 'Gbɛgbɛru yira'}
                              >
                                <AlertTriangle className="w-4 h-4 text-amber-500" />
                              </button>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </>
                );
              })()}
            </motion.div>
          )}

          {/* ═══ LESSON (QCM) ═══ */}
          {currentView === 'lesson' && config && exercises.length > 0 && (
            <motion.div key="lesson" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="px-4 pb-6 space-y-4">
              <div className="bg-white rounded-2xl shadow-md p-4">
                <div className="flex justify-between mb-2 text-xs font-semibold">
                  <span className="text-gray-500">{userLanguage === 'french' ? 'Question' : 'Kasuu'} {exerciseIndex + 1} / {exercises.length}</span>
                  <span className="text-green-600">{getText('score')}: {score} / {exercises.length}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                  <div className="bg-gradient-to-r from-green-400 to-blue-500 h-full rounded-full transition-all duration-300" style={{ width: `${((exerciseIndex + 1) / exercises.length) * 100}%` }} />
                </div>
              </div>

              <div className="flex items-center justify-center gap-3 text-sm">
                <span className="bg-blue-100 text-blue-700 px-4 py-1.5 rounded-full text-xs font-semibold">
                  {direction === 'fr_to_bariba' ? '🇫🇷 Français' : '🌍 Bariba'}
                </span>
                <span className="text-gray-400 text-lg">→</span>
                <span className="bg-green-100 text-green-700 px-4 py-1.5 rounded-full text-xs font-semibold">
                  {direction === 'fr_to_bariba' ? '🌍 Bariba' : '🇫🇷 Français'}
                </span>
              </div>

              <div className="bg-white rounded-3xl shadow-xl p-6 text-center">
                <p className="text-gray-400 text-xs mb-3">{getText('translateTo')}</p>
                <div className="flex items-center justify-center gap-3 mb-2">
                  <p className="text-gray-800 font-bold text-2xl">{getQuestion(exercises[exerciseIndex], direction)}</p>
                  {direction === 'fr_to_bariba' && (
                    <motion.button whileTap={{ scale: 0.85 }} onClick={() => speakFrench(exercises[exerciseIndex].french)} className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0 shadow-sm">
                      <Volume2 className="w-4 h-4 text-blue-500" />
                    </motion.button>
                  )}
                </div>
                {exercises[exerciseIndex].context && (
                  <p className="text-gray-400 text-xs italic">{exercises[exerciseIndex].context}</p>
                )}
              </div>

              <div className="space-y-3">
                {currentOptions.map((option, idx) => {
                  const correct = getCorrectAnswer(exercises[exerciseIndex], direction);
                  let styles = 'bg-white border-gray-200 hover:border-purple-300 hover:shadow-md';
                  if (selectedAnswer !== null) {
                    if (option === correct) styles = 'bg-green-50 border-green-400 shadow-md';
                    else if (option === selectedAnswer && !isCorrect) styles = 'bg-red-50 border-red-400 shadow-md';
                    else styles = 'bg-white border-gray-100 opacity-50';
                  }
                  return (
                    <motion.button
                      key={idx}
                      whileTap={selectedAnswer === null ? { scale: 0.98 } : {}}
                      onClick={() => handleAnswer(option)}
                      disabled={selectedAnswer !== null}
                      className={`w-full p-4 rounded-2xl border-2 ${styles} transition-all text-left flex items-center justify-between shadow-sm`}
                    >
                      <span className="text-gray-800 text-sm font-medium">{option}</span>
                      <div className="flex items-center gap-2">
                        {selectedAnswer === option && isCorrect && <Check className="w-5 h-5 text-green-500" />}
                        {selectedAnswer === option && isCorrect === false && <X className="w-5 h-5 text-red-500" />}
                        {direction === 'bariba_to_french' && selectedAnswer === null && (
                          <motion.button whileTap={{ scale: 0.85 }} onClick={(e) => { e.stopPropagation(); speakFrench(option); }} className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center">
                            <Volume2 className="w-3.5 h-3.5 text-gray-400" />
                          </motion.button>
                        )}
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              <AnimatePresence>
                {selectedAnswer !== null && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={`p-4 rounded-2xl ${isCorrect ? 'bg-green-50 border-2 border-green-300' : 'bg-red-50 border-2 border-red-300'}`}>
                    <div className="flex items-center gap-2">
                      {isCorrect ? <Check className="w-5 h-5 text-green-600" /> : <X className="w-5 h-5 text-red-600" />}
                      <span className={`font-bold text-sm ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                        {isCorrect ? getText('correctAnswer') : getText('wrongAnswer')}
                      </span>
                    </div>
                    {!isCorrect && (
                      <p className="text-gray-600 text-xs mt-1">
                        {getCorrectAnswer(exercises[exerciseIndex], direction)}
                      </p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* ═══ LESSON COMPLETE ═══ */}
          {currentView === 'lesson-complete' && config && (
            <motion.div key="complete" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center min-h-full px-6 py-8">
              <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-sm text-center">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.1 }} className="text-7xl mb-4">
                  🎉
                </motion.div>
                <h2 className="text-2xl font-bold text-purple-600 mb-2">{getText('congratulations')}</h2>
                {currentTheme && (
                  <p className="text-gray-500 text-sm mb-6">{currentTheme.name[langKey]}</p>
                )}
                {currentFoundation && !currentTheme && (
                  <p className="text-gray-500 text-sm mb-6">{currentFoundation.title[langKey]}</p>
                )}

                <div className="grid grid-cols-3 gap-3 mb-6">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-3">
                    <div className="text-blue-700 font-bold text-xl">{currentFoundation && !currentTheme ? `${foundationQuizScore}/${currentFoundation.quiz.length}` : `${score}/${exercises.length}`}</div>
                    <div className="text-blue-500 text-[10px] font-medium">{getText('score')}</div>
                  </div>
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-3">
                    <div className="text-orange-700 font-bold text-xl">+50</div>
                    <div className="text-orange-500 text-[10px] font-medium">{getText('xpEarned')}</div>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-3">
                    <div className="text-green-700 font-bold text-xl">
                      {currentFoundation && !currentTheme
                        ? `${Math.round((foundationQuizScore / currentFoundation.quiz.length) * 100)}%`
                        : `${Math.round((score / exercises.length) * 100)}%`
                      }
                    </div>
                    <div className="text-green-500 text-[10px] font-medium">{getText('precision')}</div>
                  </div>
                </div>

                {newBadges.length > 0 && (
                  <div className="mb-6 p-4 rounded-2xl bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-200">
                    <p className="text-yellow-700 text-xs font-semibold mb-2">🏆 {getText('earnedBadges')}</p>
                    <div className="flex gap-2 justify-center">
                      {newBadges.map(b => (
                        <div key={b.id} className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 shadow-sm">
                          <span className="text-xl">{b.icon}</span>
                          <span className="text-gray-700 text-xs font-semibold">{b.name[langKey]}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <motion.button whileTap={{ scale: 0.97 }} onClick={() => { setCurrentView('dashboard'); setCurrentFoundation(null); clearNewBadges(); }} className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold text-sm shadow-lg hover:shadow-xl transition-all">
                    {getText('backToDashboard')}
                  </motion.button>
                  <motion.button whileTap={{ scale: 0.97 }} onClick={() => { shareProgress(); triggerFeedback('click'); }} className="w-full py-3.5 rounded-xl border-2 border-gray-100 text-gray-500 text-sm flex items-center justify-center gap-2 hover:border-gray-200 transition-all">
                    <Share2 className="w-4 h-4" />
                    {getText('shareSuccess')}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Contribution Modal */}
      <ContributionModal
        isOpen={!!contributionCtx}
        onClose={() => setContributionCtx(null)}
        context={contributionCtx || { lessonId: '', lessonTitle: '', type: 'suggestion' }}
        lang={userLanguage || 'french'}
      />
    </div>
  );
}
