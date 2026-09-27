import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Menu, Volume2, Check, X, Flame, BookOpen, Star, Trophy, Award, Share2, ChevronDown, Zap, Target, Sparkles, GraduationCap, ChevronRight, LogIn, Lock, MessageSquarePlus, AlertTriangle, PenTool } from 'lucide-react';
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
import { useQuery } from '@tanstack/react-query';
import BaribaAudioText, { useApprendrePublishedAudio } from '@/components/fitila/BaribaAudioText';

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

  const { data: publishedAudioManifest } = useApprendrePublishedAudio();
  const { data: hubCatalog } = useQuery({
    queryKey: ['apprendre-web-hub-catalog'],
    queryFn: async () => {
      const [scenesRes, proverbsRes] = await Promise.all([
        supabase.from('apprendre_audio_items').select('*', { count: 'exact', head: true }).eq('in_content', true).eq('kind', 'scene'),
        supabase.from('apprendre_audio_items').select('audio_key, text_ba, text_fr').eq('in_content', true).eq('kind', 'proverbe').order('audio_key').limit(8),
      ]);
      if (scenesRes.error) throw scenesRes.error;
      if (proverbsRes.error) throw proverbsRes.error;
      return {
        sceneCount: scenesRes.count || 0,
        proverbs: (proverbsRes.data || []) as { audio_key: string; text_ba: string; text_fr: string | null }[],
      };
    },
    staleTime: 30 * 60 * 1000,
  });

  const publishedVoiceCount = publishedAudioManifest?.size || 0;

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
      openMenu();
    } else {
      openMenu();
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
    <div className="h-[100dvh] flex flex-col bg-[#F7F5EC] text-[#241F2E]">
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

      {/* Header — parité Flutter Apprendre v2.4 */}
      {currentView !== 'language-selection' && (
        <div className="flex-shrink-0 px-4 pt-3 pb-2 bg-[#F7F5EC]/95 backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-center justify-between">
            <motion.button whileTap={{ scale: 0.92 }} onClick={handleBack} className="w-11 h-11 rounded-full bg-white border border-[#E4DFCC] flex items-center justify-center">
              {currentView === 'dashboard' ? <Menu className="w-5 h-5 text-[#241F2E]" /> : <ArrowLeft className="w-5 h-5 text-[#241F2E]" />}
            </motion.button>
            <div className="flex-1 min-w-0 px-3">
              <h1 className="text-[#241F2E] font-extrabold text-base leading-tight">Apprendre</h1>
              <p className="text-[#6F6955] text-xs truncate">Mɛɛribu · bàátɔ̀nú ⇄ français</p>
            </div>
            <div className="relative">
              <motion.button whileTap={{ scale: 0.92 }} onClick={() => setShowLangSwitch(!showLangSwitch)} className="w-11 h-11 rounded-full bg-white border border-[#E4DFCC] flex items-center justify-center text-sm">
                {config?.flag || '🌐'}
              </motion.button>
              {showLangSwitch && (
                <div className="absolute right-0 top-12 bg-white rounded-xl shadow-sm border border-[#E4DFCC] p-1 z-20 min-w-[140px]">
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
              <div className="bg-white rounded-[28px] border border-[#E4DFCC] shadow-sm p-8 max-w-lg w-full">
                {/* Back button */}
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate(-1)}
                  className="flex items-center gap-2 text-[#6F6955] hover:text-gray-700 mb-6 text-sm font-medium"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Retour</span>
                </motion.button>
                <div className="space-y-4">
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => handleSelectLanguage('french')} className="w-full bg-gradient-to-br from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 rounded-3xl p-8 text-center text-white transition-all shadow-lg hover:shadow-sm flex flex-col items-center gap-3">
                    <div className="text-6xl">🇫🇷</div>
                    <h2 className="text-2xl font-bold">Français</h2>
                  </motion.button>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => handleSelectLanguage('bariba')} className="w-full bg-gradient-to-br from-green-500 to-green-700 hover:from-green-600 hover:to-green-800 rounded-3xl p-8 text-center text-white transition-all shadow-lg hover:shadow-sm flex flex-col items-center gap-3">
                    <div className="text-6xl">🌍</div>
                    <h2 className="text-2xl font-bold">Baatonum</h2>
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ═══ DASHBOARD ═══ */}
          {currentView === 'dashboard' && config && (
            <motion.div key="dashboard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mx-auto max-w-3xl px-4 pb-8 space-y-5">
              {/* Flutter v2.4 greeting */}
              <div className="flex items-start justify-between pt-1">
                <div>
                  <BaribaAudioText
                    text={new Date().getHours() < 12 ? 'A kpuna n do ?' : 'Mɛɛribu'}
                    textClassName="text-[26px] leading-tight font-extrabold text-[#241F2E]"
                  />
                  <p className="mt-1 text-sm text-[#6F6955]">
                    {new Date().getHours() < 12 ? '« As-tu bien dormi ? » — le salut du matin' : 'Apprendre le bàátɔ̀nú et le français'}
                  </p>
                </div>
                <div className="inline-flex items-center gap-1 rounded-xl bg-[#F4DED2] px-3 py-1.5 text-xs font-bold text-[#8A3A24]">
                  <Flame className="h-4 w-4" /> {profile.streak} j
                </div>
              </div>

              {/* Guide du jour — même hiérarchie que Flutter */}
              <div className="overflow-hidden rounded-[26px] bg-[#241F2E] p-5 sm:p-6 text-white shadow-lg">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 shrink-0 rounded-full border-2 border-[#C99530] bg-[#3A3448] flex items-center justify-center text-3xl">📚</div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#F3E3B9]">Ton guide aujourd’hui</p>
                    <h3 className="mt-1 text-xl font-extrabold">
                      {FOUNDATION_LESSONS[0]?.title?.[langKey] || (userLanguage === 'french' ? 'Commencer les fondations' : 'Mɛɛri')}
                    </h3>
                    <p className="mt-1 text-sm text-[#D9D3C1]">Une étape courte, puis pratique et répétition.</p>
                  </div>
                </div>
                <button
                  onClick={() => FOUNDATION_LESSONS[0] && startFoundation(FOUNDATION_LESSONS[0])}
                  className="mt-5 w-full rounded-full bg-[#C99530] px-5 py-3.5 text-sm font-extrabold text-[#2B2110] active:scale-[0.99]"
                >
                  Commencer
                </button>
              </div>

              {/* Séance du jour */}
              <div className="rounded-[22px] border border-[#E4DFCC] bg-white p-5">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-2xl bg-[#F3E3B9] flex items-center justify-center">
                    <Zap className="h-5 w-5 text-[#9C6B1D]" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-extrabold text-[#241F2E]">Séance du jour</h3>
                    <p className="text-xs text-[#6F6955]">10 exercices · écouter, reconnaître, répondre</p>
                  </div>
                  <button
                    onClick={() => THEMES[0] && startLesson(THEMES[0].id)}
                    className="rounded-full bg-[#241F2E] px-4 py-2 text-xs font-bold text-white"
                  >
                    Démarrer
                  </button>
                </div>
              </div>

              {/* Révision */}
              <div>
                <div className="mb-2 flex items-end justify-between">
                  <h3 className="text-[17px] font-extrabold text-[#241F2E]">Révision</h3>
                  <span className="text-xs font-bold text-[#9C6B1D]">{profile.masteredWords} mots maîtrisés</span>
                </div>
                <div className="rounded-[20px] border border-[#E4DFCC] bg-white p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-[#F3E3B9] flex items-center justify-center">🧠</div>
                  <p className="flex-1 text-sm text-[#5E5846]">
                    {profile.completedLessons === 0 ? 'Tes premiers mots apparaîtront ici après ta première séance.' : 'Continue à revoir régulièrement les mots déjà rencontrés.'}
                  </p>
                  <ChevronRight className="h-5 w-5 text-[#9C6B1D]" />
                </div>
              </div>

              {/* Profile details live in /profile; hidden here to keep Flutter Apprendre hub parity */}
              <div className="hidden bg-white rounded-[24px] border border-[#E4DFCC] p-5">
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
                      <h2 className="text-xl font-bold text-[#241F2E]">
                        {user && tamtamProfile?.display_name
                          ? tamtamProfile.display_name
                          : (userLanguage === 'french' ? 'Apprenant' : 'Debutɔm')}
                      </h2>
                      <p className={`text-sm font-semibold ${currentLevel.color}`}>
                        {getLevelName(currentLevel)} - {getText('level')} {currentLevel.level}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Flame className="w-4 h-4 text-orange-500" />
                        <span className="text-sm text-[#6F6955] font-medium">{profile.streak} {getText('dayStreak')}</span>
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
                    <span className="text-[#6F6955]">{profile.xp} {getText('xp')}</span>
                    {nextLevel && (
                      <span className="text-[#6F6955]">
                        {nextLevel.minXP} {getText('xp')} {userLanguage === 'french' ? 'pour' : 'yira'} {getLevelName(nextLevel)}
                      </span>
                    )}
                  </div>
                  <div className="w-full bg-[#F1EDDF] rounded-full h-2.5 overflow-hidden">
                    <motion.div
                      className="bg-[#C99530] h-full rounded-full"
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
                  style={{ display: 'none' }}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-[#FFFBF0] border border-[#E4DFCC] rounded-[20px] p-4 flex items-center gap-3"
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
                    onClick={() => navigate('/auth')}
                    className="bg-[#C99530] text-[#2B2110] px-4 py-2 rounded-full text-xs font-bold shadow-md flex-shrink-0"
                  >
                    {userLanguage === 'french' ? 'Connexion' : 'Doo'}
                  </motion.button>
                </motion.div>
              )}

              {/* Badges */}
              {profile.badges.length > 0 && (
                <div className="hidden bg-white rounded-[24px] border border-[#E4DFCC] shadow-sm p-5 sm:p-6">
                  <h3 className="text-lg font-bold text-[#241F2E] mb-4 flex items-center gap-2">
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
              <div className="bg-white rounded-3xl shadow-sm p-6">
                <button onClick={() => setShowFoundations(!showFoundations)} className="w-full flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-[#241F2E] flex items-center gap-2">
                    <GraduationCap className="w-5 h-5 text-indigo-500" />
                    {getText('foundations')}
                  </h3>
                  <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${showFoundations ? 'rotate-180' : ''}`} />
                </button>
                {showFoundations && (
                  <>
                    <p className="text-[#6F6955] text-xs mb-4">{getText('foundationsSub')}</p>
                    <div className="flex gap-3 overflow-x-auto pb-1 snap-x">
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
                            className={`min-w-[180px] max-w-[210px] snap-start border-2 rounded-2xl p-4 text-left transition-all group relative overflow-hidden ${
                              isComingSoon
                                ? 'border-gray-200 opacity-60 cursor-not-allowed'
                                : 'border-[#E4DFCC] hover:border-indigo-200 hover:shadow-lg'
                            }`}
                          >
                            {isComingSoon && (
                              <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] z-10 flex flex-col items-center justify-center rounded-2xl">
                                <Lock className="w-5 h-5 text-gray-400 mb-1" />
                                <span className="text-[#6F6955] text-xs font-bold">
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
                            {langKey === 'br'
                              ? <BaribaAudioText text={fl.title.br} compact hideUnavailable textClassName="font-bold text-[#241F2E] text-xs leading-tight" />
                              : <h4 className="font-bold text-[#241F2E] text-xs leading-tight">{fl.title.fr}</h4>}
                            <p className="text-[10px] text-gray-400 mt-1">{fl.sections.length} {getText('sections')} • {fl.quiz.length} {getText('quiz')}</p>
                          </motion.button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              {/* Learning Themes */}
              <div className="bg-white rounded-3xl shadow-sm p-6">
                <h3 className="text-xl font-bold text-[#241F2E] mb-5 flex items-center gap-2">
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
                      className="border-2 border-[#E4DFCC] rounded-2xl p-4 hover:border-purple-200 hover:shadow-lg transition-all"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`${themeIconBgs[theme.id] || 'bg-gray-100'} w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-sm`}>
                          {theme.icon}
                        </div>
                        <div className="flex-1">
                          {langKey === 'br'
                            ? <BaribaAudioText text={theme.name.br} compact hideUnavailable textClassName="font-bold text-[#241F2E] text-sm" />
                            : <h4 className="font-bold text-[#241F2E] text-sm">{theme.name.fr}</h4>}
                          <p className="text-xs text-[#6F6955]">{theme.lessonsCount} {getText('lessonsAvailable')}</p>
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
                        className="w-full bg-[#C99530] text-[#2B2110] py-3 rounded-full font-extrabold text-sm transition-all"
                      >
                        {getText('start')} →
                      </motion.button>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Scènes de vie — parité Flutter */}
              <div>
                <div className="mb-2 flex items-end justify-between">
                  <h3 className="text-[17px] font-extrabold text-[#241F2E]">Scènes de vie</h3>
                  <span className="text-xs font-bold text-[#9C6B1D]">{hubCatalog?.sceneCount || 0} répliques</span>
                </div>
                <button
                  onClick={() => navigate('/learn/scenes')}
                  className="w-full rounded-[22px] border border-[#E4DFCC] bg-white p-4 text-left transition hover:border-[#D5CEB3]"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-2xl bg-[#F3E3B9] flex items-center justify-center text-2xl">💬</div>
                    <div className="min-w-0 flex-1">
                      <p className="font-extrabold text-[#241F2E]">Parler dans la vie réelle</p>
                      <p className="text-xs text-[#6F6955]">Salutations, famille, marché, santé, voyage, travail…</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-[#9C6B1D]" />
                  </div>
                </button>
              </div>

              {/* Sagesse — parité Flutter */}
              {hubCatalog?.proverbs?.length ? (
                <div>
                  <h3 className="mb-2 text-[17px] font-extrabold text-[#241F2E]">Sagesse</h3>
                  {(() => {
                    const proverb = hubCatalog.proverbs[new Date().getDate() % hubCatalog.proverbs.length];
                    return (
                      <div className="rounded-[22px] border border-[#E4DFCC] bg-white p-5">
                        <BaribaAudioText
                          text={proverb.text_ba}
                          textClassName="text-lg font-extrabold leading-snug text-[#241F2E]"
                        />
                        {proverb.text_fr && <p className="ml-11 mt-2 text-sm leading-relaxed text-[#6F6955]">{proverb.text_fr}</p>}
                      </div>
                    );
                  })()}
                </div>
              ) : null}

              {/* Voix de référence — même logique que Flutter */}
              <div className="rounded-[22px] border border-[#E4DFCC] bg-white p-4">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-2xl bg-[#F3E3B9] flex items-center justify-center">
                    <Volume2 className="h-5 w-5 text-[#9C6B1D]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-extrabold text-[#241F2E]">{publishedVoiceCount} textes avec voix de référence</p>
                    <p className="text-xs text-[#6F6955]">
                      Les voix sont enregistrées, validées et publiées depuis l’administration.
                    </p>
                  </div>
                  {user && <ChevronRight className="h-5 w-5 text-[#9C6B1D]" />}
                </div>
              </div>
            </motion.div>
          )}

          {/* ═══ FOUNDATION LESSON ═══ */}
          {currentView === 'foundation-lesson' && currentFoundation && config && (
            <motion.div key="foundation" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="mx-auto max-w-3xl px-4 pb-6 space-y-4">
              {/* Title */}
              <div className="bg-white rounded-2xl shadow-md p-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-3xl" style={{ backgroundColor: currentFoundation.color + '18' }}>
                    {currentFoundation.icon}
                  </div>
                  <div className="flex-1">
                    {langKey === 'br'
                      ? <BaribaAudioText text={currentFoundation.title.br} compact hideUnavailable textClassName="text-lg font-bold text-[#241F2E]" />
                      : <h2 className="text-lg font-bold text-[#241F2E]">{currentFoundation.title.fr}</h2>}
                    <p className="text-xs text-[#6F6955]">{currentFoundation.sections.length} {getText('sections')}</p>
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
                    <h3 className="font-bold text-[#241F2E] text-base flex items-center gap-2">
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
                        langKey === 'br'
                          ? <BaribaAudioText text={section.title.br} compact hideUnavailable textClassName="font-bold text-[#241F2E] text-base" />
                          : section.title.fr
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
                    langKey === 'br'
                      ? <BaribaAudioText text={section.content.br} hideUnavailable textClassName="text-gray-600 text-sm leading-relaxed" />
                      : <p className="text-gray-600 text-sm leading-relaxed">{section.content.fr}</p>
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
                                <td key={cIdx} className="px-2 py-1.5 text-gray-600 border-b border-[#E4DFCC]">
                                  <BaribaAudioText text={cell} compact hideUnavailable textClassName="text-gray-600" />
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
                      <p className="text-xs font-semibold text-[#6F6955] uppercase tracking-wider">
                        {userLanguage === 'french' ? 'Exemples' : 'Yirɑnu'}
                      </p>
                      {section.examples.map((ex, eIdx) => (
                        <div key={eIdx} className="bg-gray-50 rounded-xl p-3 border border-[#E4DFCC]">
                          <div className="flex items-start gap-2">
                            <div className="flex-1">
                              <BaribaAudioText text={ex.bariba} compact textClassName="font-semibold text-[#241F2E] text-sm" />
                              <p className="text-[#6F6955] text-xs mt-1">{ex.french}</p>
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
                      {langKey === 'br'
                        ? <BaribaAudioText text={section.tip.br} compact hideUnavailable textClassName="text-amber-800 text-xs" />
                        : <p className="text-amber-800 text-xs">{section.tip.fr}</p>}
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
                className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white py-4 rounded-2xl font-bold text-sm shadow-lg hover:shadow-sm transition-all flex items-center justify-center gap-2"
              >
                <GraduationCap className="w-5 h-5" />
                {getText('quiz')} ({currentFoundation.quiz.length} {userLanguage === 'french' ? 'questions' : 'kasuurenu'})
              </motion.button>
            </motion.div>
          )}

          {/* ═══ FOUNDATION QUIZ ═══ */}
          {currentView === 'foundation-quiz' && currentFoundation && config && (
            <motion.div key="fquiz" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="mx-auto max-w-3xl px-4 pb-6 space-y-4">
              {/* Progress */}
              <div className="bg-white rounded-2xl shadow-md p-4">
                <div className="flex justify-between mb-2 text-xs font-semibold">
                  <span className="text-[#6F6955]">{getText('quiz')} {foundationQuizIndex + 1} / {currentFoundation.quiz.length}</span>
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
                    <div className="bg-white rounded-3xl shadow-sm p-6 text-center">
                      {langKey === 'br'
                        ? <BaribaAudioText text={q.question.br} textClassName="text-[#241F2E] font-bold text-xl" />
                        : <p className="text-[#241F2E] font-bold text-xl">{q.question.fr}</p>}
                    </div>

                    <div className="space-y-3">
                      {q.options.map((opt, idx) => {
                        let styles = 'bg-white border-gray-200 hover:border-indigo-300 hover:shadow-md';
                        if (foundationQuizAnswer !== null) {
                          if (idx === q.correctIndex) styles = 'bg-green-50 border-green-400 shadow-md';
                          else if (idx === foundationQuizAnswer) styles = 'bg-red-50 border-red-400 shadow-md';
                          else styles = 'bg-white border-[#E4DFCC] opacity-50';
                        }
                        return (
                          <motion.button
                            key={idx}
                            whileTap={foundationQuizAnswer === null ? { scale: 0.98 } : {}}
                            onClick={() => handleFoundationAnswer(idx)}
                            disabled={foundationQuizAnswer !== null}
                            className={`w-full p-4 rounded-2xl border-2 ${styles} transition-all text-left flex items-center justify-between shadow-sm`}
                          >
                            <BaribaAudioText text={opt} compact hideUnavailable textClassName="text-[#241F2E] text-sm font-medium" />
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
                            {langKey === 'br'
                              ? <BaribaAudioText text={q.explanation.br} compact hideUnavailable textClassName="text-gray-600 text-xs" />
                              : <p className="text-gray-600 text-xs">{q.explanation.fr}</p>}
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
            <motion.div key="lesson" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="mx-auto max-w-3xl px-4 pb-6 space-y-4">
              <div className="bg-white rounded-2xl shadow-md p-4">
                <div className="flex justify-between mb-2 text-xs font-semibold">
                  <span className="text-[#6F6955]">{userLanguage === 'french' ? 'Question' : 'Kasuu'} {exerciseIndex + 1} / {exercises.length}</span>
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

              <div className="bg-white rounded-3xl shadow-sm p-6 text-center">
                <p className="text-gray-400 text-xs mb-3">{getText('translateTo')}</p>
                <div className="flex items-center justify-center gap-3 mb-2">
                  {direction === 'bariba_to_french' ? (
                    <BaribaAudioText
                      text={exercises[exerciseIndex].bariba}
                      textClassName="text-[#241F2E] font-bold text-2xl"
                    />
                  ) : (
                    <>
                      <p className="text-[#241F2E] font-bold text-2xl">{exercises[exerciseIndex].french}</p>
                      <motion.button whileTap={{ scale: 0.85 }} onClick={() => speakFrench(exercises[exerciseIndex].french)} className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0 shadow-sm">
                        <Volume2 className="w-4 h-4 text-blue-500" />
                      </motion.button>
                    </>
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
                    else styles = 'bg-white border-[#E4DFCC] opacity-50';
                  }
                  return (
                    <motion.button
                      key={idx}
                      whileTap={selectedAnswer === null ? { scale: 0.98 } : {}}
                      onClick={() => handleAnswer(option)}
                      disabled={selectedAnswer !== null}
                      className={`w-full p-4 rounded-2xl border-2 ${styles} transition-all text-left flex items-center justify-between shadow-sm`}
                    >
                      {direction === 'fr_to_bariba'
                        ? <BaribaAudioText text={option} compact textClassName="text-[#241F2E] text-sm font-medium" />
                        : <span className="text-[#241F2E] text-sm font-medium">{option}</span>}
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
                      direction === 'fr_to_bariba'
                        ? <BaribaAudioText text={getCorrectAnswer(exercises[exerciseIndex], direction)} compact textClassName="text-gray-600 text-xs mt-1" />
                        : <p className="text-gray-600 text-xs mt-1">{getCorrectAnswer(exercises[exerciseIndex], direction)}</p>
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
                  <p className="text-[#6F6955] text-sm mb-6">{currentTheme.name[langKey]}</p>
                )}
                {currentFoundation && !currentTheme && (
                  <p className="text-[#6F6955] text-sm mb-6">{currentFoundation.title[langKey]}</p>
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
                  <motion.button whileTap={{ scale: 0.97 }} onClick={() => { setCurrentView('dashboard'); setCurrentFoundation(null); clearNewBadges(); }} className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold text-sm shadow-lg hover:shadow-sm transition-all">
                    {getText('backToDashboard')}
                  </motion.button>
                  <motion.button whileTap={{ scale: 0.97 }} onClick={() => { shareProgress(); triggerFeedback('click'); }} className="w-full py-3.5 rounded-xl border-2 border-[#E4DFCC] text-[#6F6955] text-sm flex items-center justify-center gap-2 hover:border-gray-200 transition-all">
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
