import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Volume2, Check, X, Flame, BookOpen, Star, Trophy, Award, Share2, ChevronDown, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useFitilaLanguage } from '@/contexts/FitilaLanguageContext';
import { useSideMenu } from '@/pages/fitila/FitilaApp';
import { triggerFeedback } from '@/utils/tamtamFeedback';
import { useLearningProgress } from '@/hooks/useLearningProgress';
import { THEMES, EXERCISES, buildOptions, getCorrectAnswer, getQuestion, shuffleArray, type Exercise } from '@/data/learningExercises';
import { LEVELS, BADGES } from '@/data/learningConfig';

// ═══════════════════════════════════════════════════════════════════
// 📚 FITILA LEARN - Plateforme bidirectionnelle Bariba ↔ Français
// ═══════════════════════════════════════════════════════════════════

type ViewType = 'language-selection' | 'dashboard' | 'lesson' | 'lesson-complete';

export default function FitilaLearn() {
  const navigate = useNavigate();
  const { currentLang } = useFitilaLanguage();
  const { open: openMenu } = useSideMenu();
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
    if (currentView === 'lesson' || currentView === 'lesson-complete') {
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

  const currentTheme = THEMES.find(t => t.id === currentThemeId);

  return (
    <div className="h-[100dvh] flex flex-col bg-[#08080c]">
      {/* Level up overlay */}
      <AnimatePresence>
        {showLevelUp && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center" onClick={() => setShowLevelUp(false)}>
            <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }} className="bg-[#1a1a2e] rounded-3xl p-10 text-center border border-white/10">
              <div className="text-7xl mb-4">{currentLevel.icon}</div>
              <h2 className="text-2xl font-bold text-[#FF5722] mb-2">{getText('levelUp')}</h2>
              <p className="text-white text-lg">{getText('youAreNow')} {getLevelName(currentLevel)}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header - not on language selection */}
      {currentView !== 'language-selection' && (
        <div className="flex-shrink-0 px-4 pt-4 pb-3">
          <div className="flex items-center justify-between">
            <motion.button whileTap={{ scale: 0.9 }} onClick={handleBack} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
              <ArrowLeft className="w-5 h-5 text-white" />
            </motion.button>
            <h1 className="text-white font-bold text-lg">
              {config?.flag} {userLanguage === 'french' ? 'Apprendre le Bariba' : 'Fãsei debu'}
            </h1>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-[#FF5722]/20 border border-[#FF5722]/30">
                <Flame className="w-3.5 h-3.5 text-[#FF5722]" />
                <span className="text-[#FF5722] text-xs font-bold">{profile.streak}</span>
              </div>
              {/* Lang switch */}
              <div className="relative">
                <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowLangSwitch(!showLangSwitch)} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-sm">
                  {config?.flag || '🌐'}
                </motion.button>
                {showLangSwitch && (
                  <div className="absolute right-0 top-10 bg-[#1a1a2e] rounded-xl border border-white/10 p-1 z-20 min-w-[140px]">
                    <button onClick={() => { handleSelectLanguage('french'); setShowLangSwitch(false); }} className="w-full text-left px-3 py-2 rounded-lg text-white/80 hover:bg-white/10 text-sm">🇫🇷 Français</button>
                    <button onClick={() => { handleSelectLanguage('bariba'); setShowLangSwitch(false); }} className="w-full text-left px-3 py-2 rounded-lg text-white/80 hover:bg-white/10 text-sm">🌍 Bariba</button>
                  </div>
                )}
              </div>
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
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Bienvenue / Sĩa kãnu</h1>
                <p className="text-white/60 text-sm">Choisissez votre langue maternelle</p>
                <p className="text-white/40 text-xs">A win yenu debu</p>
              </div>
              <div className="w-full max-w-sm space-y-4">
                {/* French option */}
                <motion.button whileTap={{ scale: 0.97 }} onClick={() => handleSelectLanguage('french')} className="w-full bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-6 text-left text-white">
                  <div className="text-5xl mb-3">🇫🇷</div>
                  <h2 className="text-xl font-bold mb-1">Je parle Français</h2>
                  <p className="text-white/80 text-sm mb-3">Je veux apprendre le Bariba</p>
                  <div className="bg-white/15 rounded-xl p-3 text-xs space-y-1">
                    <p className="font-semibold mb-1">Vous apprendrez :</p>
                    <p>✓ Système tonal (3 tons)</p>
                    <p>✓ Ordre SOV (différent du français)</p>
                    <p>✓ Classes nominales</p>
                    <p>✓ Culture bariba</p>
                  </div>
                </motion.button>
                {/* Bariba option */}
                <motion.button whileTap={{ scale: 0.97 }} onClick={() => handleSelectLanguage('bariba')} className="w-full bg-gradient-to-br from-green-600 to-green-800 rounded-2xl p-6 text-left text-white">
                  <div className="text-5xl mb-3">🌍</div>
                  <h2 className="text-xl font-bold mb-1">Ń nɛɛ Bariba</h2>
                  <p className="text-white/80 text-sm mb-3">Ń wure Fãsei debu</p>
                  <div className="bg-white/15 rounded-xl p-3 text-xs space-y-1">
                    <p className="font-semibold mb-1">A deburenu :</p>
                    <p>✓ Yenu fãsei (26 yenu)</p>
                    <p>✓ SVO kpindu (kã Bariba)</p>
                    <p>✓ Koru deburu (conjugaisons)</p>
                    <p>✓ Fãsei waakurenu</p>
                  </div>
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* ═══ DASHBOARD ═══ */}
          {currentView === 'dashboard' && config && (
            <motion.div key="dashboard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="px-4 pb-6 space-y-4">
              {/* Profile card */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#FF5722] to-orange-600 flex items-center justify-center text-3xl">{currentLevel.icon}</div>
                  <div className="flex-1">
                    <p className="text-white font-bold">{getLevelName(currentLevel)} - {getText('level')} {currentLevel.level}</p>
                    <div className="flex items-center gap-2 text-white/60 text-xs">
                      <span>{profile.xp} {getText('xp')}</span>
                      {nextLevel && <span>→ {nextLevel.minXP} {getText('xp')}</span>}
                    </div>
                  </div>
                  <div className="text-center bg-white/5 rounded-xl px-3 py-2">
                    <div className="flex items-center gap-1 text-xs">
                      <span>{config.flag}</span>
                      <span className="text-white/60">→</span>
                      <span>{userLanguage === 'french' ? '🌍' : '🇫🇷'}</span>
                    </div>
                  </div>
                </div>
                {/* XP bar */}
                <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                  <motion.div className="bg-gradient-to-r from-[#FF5722] to-orange-400 h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${progressToNext}%` }} transition={{ duration: 0.5 }} />
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { icon: <BookOpen className="w-4 h-4" />, value: profile.completedLessons, label: getText('completedLessons'), color: 'text-blue-400' },
                  { icon: <Star className="w-4 h-4" />, value: profile.masteredWords, label: getText('masteredWords'), color: 'text-green-400' },
                  { icon: <Trophy className="w-4 h-4" />, value: profile.perfectScores, label: getText('perfectScores'), color: 'text-purple-400' },
                  { icon: <Award className="w-4 h-4" />, value: profile.badges.length, label: getText('earnedBadges'), color: 'text-amber-400' },
                ].map((s, i) => (
                  <div key={i} className="p-3 rounded-xl bg-white/5 text-center">
                    <div className={`${s.color} flex justify-center mb-1`}>{s.icon}</div>
                    <div className="text-white font-bold text-lg">{s.value}</div>
                    <div className="text-white/40 text-[10px]">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Badges */}
              {profile.badges.length > 0 && (
                <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                  <h3 className="text-white/80 text-xs font-semibold mb-2">{getText('myBadges')}</h3>
                  <div className="flex gap-2 flex-wrap">
                    {BADGES.filter(b => profile.badges.includes(b.id)).map(b => (
                      <div key={b.id} className="w-10 h-10 rounded-xl bg-[#FF5722]/20 flex items-center justify-center text-xl" title={b.name[langKey]}>
                        {b.icon}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Share */}
              <motion.button whileTap={{ scale: 0.97 }} onClick={() => { shareProgress(); triggerFeedback('click'); }} className="w-full py-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center gap-2 text-white/80 text-sm">
                <Share2 className="w-4 h-4" />
                {getText('share')}
              </motion.button>

              {/* Themes */}
              <h3 className="text-white font-bold text-sm pt-2">{getText('themes')}</h3>
              <div className="grid grid-cols-2 gap-3">
                {THEMES.map((theme, idx) => (
                  <motion.button key={theme.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: idx * 0.03 }} whileTap={{ scale: 0.95 }} onClick={() => startLesson(theme.id)} className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-lg" style={{ backgroundColor: theme.color + '33' }}>
                      {theme.icon}
                    </div>
                    <span className="text-white text-xs font-semibold text-center">{theme.name[langKey]}</span>
                    <div className="flex items-center gap-1 text-[10px]">
                      <span className="text-white/40">{theme.lessonsCount} {getText('lessonsAvailable')}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-[#FF5722]">
                      <Zap className="w-3 h-3" />
                      <span>+{theme.xpPerLesson} {getText('xp')}</span>
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* ═══ LESSON ═══ */}
          {currentView === 'lesson' && config && exercises.length > 0 && (
            <motion.div key="lesson" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="px-4 pb-6 space-y-4">
              {/* Progress */}
              <div>
                <div className="flex justify-between mb-1.5 text-xs font-semibold">
                  <span className="text-white/60">{exerciseIndex + 1} / {exercises.length}</span>
                  <span className="text-green-400">{getText('score')}: {score}</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                  <div className="bg-gradient-to-r from-green-400 to-blue-500 h-full rounded-full transition-all duration-300" style={{ width: `${((exerciseIndex + 1) / exercises.length) * 100}%` }} />
                </div>
              </div>

              {/* Direction indicator */}
              <div className="flex items-center justify-center gap-2 text-sm">
                <span className="bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full text-xs font-semibold">
                  {direction === 'fr_to_bariba' ? '🇫🇷 Français' : '🌍 Bariba'}
                </span>
                <span className="text-white/40">→</span>
                <span className="bg-green-500/20 text-green-300 px-3 py-1 rounded-full text-xs font-semibold">
                  {direction === 'fr_to_bariba' ? '🌍 Bariba' : '🇫🇷 Français'}
                </span>
              </div>

              {/* Question */}
              <div className="p-5 rounded-2xl bg-white/5 border border-white/10 text-center">
                <p className="text-white/60 text-xs mb-2">{getText('translateTo')}</p>
                <div className="flex items-center justify-center gap-3">
                  <p className="text-white font-bold text-xl">{getQuestion(exercises[exerciseIndex], direction)}</p>
                  {/* Audio only for French words */}
                  {direction === 'fr_to_bariba' && (
                    <motion.button whileTap={{ scale: 0.85 }} onClick={() => speakFrench(exercises[exerciseIndex].french)} className="w-9 h-9 rounded-full bg-[#FF5722]/20 flex items-center justify-center flex-shrink-0">
                      <Volume2 className="w-4 h-4 text-[#FF5722]" />
                    </motion.button>
                  )}
                </div>
                {exercises[exerciseIndex].context && (
                  <p className="text-white/30 text-[10px] mt-2 italic">{exercises[exerciseIndex].context}</p>
                )}
              </div>

              {/* Options */}
              <div className="space-y-2.5">
                {currentOptions.map((option, idx) => {
                  const correct = getCorrectAnswer(exercises[exerciseIndex], direction);
                  let bg = 'bg-white/5 border-white/10';
                  if (selectedAnswer !== null) {
                    if (option === correct) bg = 'bg-green-500/20 border-green-500/50';
                    else if (option === selectedAnswer && !isCorrect) bg = 'bg-red-500/20 border-red-500/50';
                  }
                  return (
                    <motion.button key={idx} whileTap={selectedAnswer === null ? { scale: 0.97 } : {}} onClick={() => handleAnswer(option)} disabled={selectedAnswer !== null} className={`w-full p-4 rounded-2xl border ${bg} transition-all text-left flex items-center justify-between`}>
                      <span className="text-white text-sm font-medium">{option}</span>
                      {selectedAnswer === option && isCorrect && <Check className="w-5 h-5 text-green-400" />}
                      {selectedAnswer === option && isCorrect === false && <X className="w-5 h-5 text-red-400" />}
                      {/* Audio for French answers in bariba->french mode */}
                      {direction === 'bariba_to_french' && selectedAnswer === null && (
                        <motion.button whileTap={{ scale: 0.85 }} onClick={(e) => { e.stopPropagation(); speakFrench(option); }} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                          <Volume2 className="w-3.5 h-3.5 text-white/40" />
                        </motion.button>
                      )}
                    </motion.button>
                  );
                })}
              </div>

              {/* Feedback */}
              <AnimatePresence>
                {selectedAnswer !== null && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={`p-4 rounded-2xl ${isCorrect ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
                    <div className="flex items-center gap-2">
                      {isCorrect ? <Check className="w-5 h-5 text-green-400" /> : <X className="w-5 h-5 text-red-400" />}
                      <span className={`font-bold text-sm ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                        {isCorrect ? getText('correctAnswer') : getText('wrongAnswer')}
                      </span>
                    </div>
                    {!isCorrect && (
                      <p className="text-white/60 text-xs mt-1">
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
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.1 }} className="text-7xl mb-4">
                🎉
              </motion.div>
              <h2 className="text-2xl font-bold text-[#FF5722] mb-2">{getText('congratulations')}</h2>
              {currentTheme && (
                <p className="text-white/60 text-sm mb-6">{currentTheme.name[langKey]}</p>
              )}

              <div className="grid grid-cols-3 gap-3 w-full max-w-xs mb-6">
                <div className="p-3 rounded-2xl bg-white/5 text-center">
                  <div className="text-white font-bold text-xl">{score}/{exercises.length}</div>
                  <div className="text-white/40 text-[10px]">{getText('score')}</div>
                </div>
                <div className="p-3 rounded-2xl bg-white/5 text-center">
                  <div className="text-[#FF5722] font-bold text-xl">+{currentTheme?.xpPerLesson || 50}</div>
                  <div className="text-white/40 text-[10px]">{getText('xpEarned')}</div>
                </div>
                <div className="p-3 rounded-2xl bg-white/5 text-center">
                  <div className="text-white font-bold text-xl">{Math.round((score / exercises.length) * 100)}%</div>
                  <div className="text-white/40 text-[10px]">{getText('precision')}</div>
                </div>
              </div>

              {/* New badges */}
              {newBadges.length > 0 && (
                <div className="mb-6 p-4 rounded-2xl bg-[#FF5722]/10 border border-[#FF5722]/30 w-full max-w-xs">
                  <p className="text-[#FF5722] text-xs font-semibold mb-2">🏆 {getText('earnedBadges')}</p>
                  <div className="flex gap-2">
                    {newBadges.map(b => (
                      <div key={b.id} className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2">
                        <span className="text-xl">{b.icon}</span>
                        <span className="text-white text-xs font-semibold">{b.name[langKey]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="w-full max-w-xs space-y-3">
                <motion.button whileTap={{ scale: 0.97 }} onClick={() => { setCurrentView('dashboard'); clearNewBadges(); }} className="w-full py-3.5 rounded-2xl bg-[#FF5722] text-white font-bold text-sm">
                  {getText('backToDashboard')}
                </motion.button>
                <motion.button whileTap={{ scale: 0.97 }} onClick={() => { if (currentThemeId) startLesson(currentThemeId); clearNewBadges(); }} className="w-full py-3.5 rounded-2xl bg-white/10 text-white font-bold text-sm">
                  {getText('retry')}
                </motion.button>
                <motion.button whileTap={{ scale: 0.97 }} onClick={() => { shareProgress(); triggerFeedback('click'); }} className="w-full py-3.5 rounded-2xl bg-white/5 text-white/60 text-sm flex items-center justify-center gap-2">
                  <Share2 className="w-4 h-4" />
                  {getText('shareSuccess')}
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
