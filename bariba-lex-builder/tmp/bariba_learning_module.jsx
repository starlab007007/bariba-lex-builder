import React, { useState, useEffect } from 'react';
import { Trophy, Star, Award, Target, Zap, TrendingUp, Users, Share2, Volume2, Check, X, Sparkles, Flame, BookOpen, MessageCircle, Heart, Gift, Crown } from 'lucide-react';

// Données simplifiées (à connecter avec votre base de données complète)
const LEARNING_DATA = {
  themes: [
    {
      id: 'salutations',
      name: 'Salutations & Politesse',
      icon: '👋',
      color: 'bg-blue-500',
      lessons: 40,
      xp: 100
    },
    {
      id: 'famille',
      name: 'Famille & Relations',
      icon: '👨‍👩‍👧‍👦',
      color: 'bg-pink-500',
      lessons: 357,
      xp: 150
    },
    {
      id: 'nourriture',
      name: 'Nourriture & Boissons',
      icon: '🍲',
      color: 'bg-orange-500',
      lessons: 344,
      xp: 120
    },
    {
      id: 'sante',
      name: 'Santé & Corps',
      icon: '🏥',
      color: 'bg-green-500',
      lessons: 144,
      xp: 130
    },
    {
      id: 'commerce',
      name: 'Commerce & Argent',
      icon: '💰',
      color: 'bg-yellow-500',
      lessons: 85,
      xp: 110
    },
    {
      id: 'transport',
      name: 'Transport & Direction',
      icon: '🚗',
      color: 'bg-purple-500',
      lessons: 142,
      xp: 100
    },
    {
      id: 'temps',
      name: 'Temps & Dates',
      icon: '⏰',
      color: 'bg-indigo-500',
      lessons: 130,
      xp: 90
    },
    {
      id: 'travail',
      name: 'Travail & Métiers',
      icon: '💼',
      color: 'bg-cyan-500',
      lessons: 118,
      xp: 125
    },
    {
      id: 'emotions',
      name: 'Émotions & Sentiments',
      icon: '😊',
      color: 'bg-red-500',
      lessons: 27,
      xp: 80
    },
    {
      id: 'proverbes',
      name: 'Proverbes & Sagesse',
      icon: '📜',
      color: 'bg-amber-600',
      lessons: 69,
      xp: 200
    }
  ],
  exercises: {
    salutations: [
      {
        type: 'translation',
        french: 'Bonjour',
        bariba: 'Aagu wune ka weru',
        options: ['Aagu wune ka weru', 'Yeegu', 'A kɔ kɑ sɔmburu', 'A kpunɑ n dɔɔ']
      },
      {
        type: 'translation',
        french: 'Comment vas-tu ?',
        bariba: 'Yeegu ?',
        options: ['Yeegu ?', 'Aagu', 'Yɛnu ɡɑ yɑri kɑ ɑlɑɑfiɑ ?', 'Yɑm wɔ̃kurɑ ?']
      },
      {
        type: 'translation',
        french: 'Merci',
        bariba: 'A kɔ kɑ sɔmburu',
        options: ['A kɔ kɑ sɔmburu', 'Aagu', 'Yeegu', 'A kpunɑ n dɔɔ']
      }
    ]
  }
};

const BADGES = [
  { id: 'first_lesson', name: 'Premier pas', icon: '🎯', description: 'Complète ta première leçon', threshold: 1 },
  { id: 'week_streak', name: 'Régularité', icon: '🔥', description: '7 jours d\'affilée', threshold: 7 },
  { id: 'fast_learner', name: 'Rapide', icon: '⚡', description: '10 leçons en un jour', threshold: 10 },
  { id: 'master_100', name: 'Centurion', icon: '💯', description: '100 mots appris', threshold: 100 },
  { id: 'perfect_score', name: 'Parfait', icon: '✨', description: '10 exercices parfaits', threshold: 10 },
  { id: 'social_butterfly', name: 'Social', icon: '🦋', description: 'Partage 5 fois', threshold: 5 },
  { id: 'cultural_expert', name: 'Expert culturel', icon: '📚', description: 'Maîtrise tous les proverbes', threshold: 69 },
  { id: 'polyglot', name: 'Polyglotte', icon: '🌍', description: 'Complète tous les thèmes', threshold: 10 }
];

const LEVELS = [
  { level: 1, name: 'Débutant', minXP: 0, icon: '🌱', color: 'text-green-500' },
  { level: 2, name: 'Apprenti', minXP: 500, icon: '🌿', color: 'text-green-600' },
  { level: 3, name: 'Pratiquant', minXP: 1500, icon: '🌳', color: 'text-blue-500' },
  { level: 4, name: 'Intermédiaire', minXP: 3000, icon: '🎋', color: 'text-blue-600' },
  { level: 5, name: 'Avancé', minXP: 5000, icon: '🏆', color: 'text-purple-500' },
  { level: 6, name: 'Expert', minXP: 8000, icon: '👑', color: 'text-yellow-500' },
  { level: 7, name: 'Maître', minXP: 12000, icon: '⭐', color: 'text-orange-500' },
  { level: 8, name: 'Sage', minXP: 20000, icon: '✨', color: 'text-pink-500' }
];

export default function BaribaLearningModule() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [userProfile, setUserProfile] = useState({
    name: 'Apprenant',
    xp: 0,
    level: 1,
    streak: 0,
    badges: [],
    completedLessons: 0,
    perfectScores: 0,
    shares: 0,
    masteredWords: 0
  });
  
  const [currentTheme, setCurrentTheme] = useState(null);
  const [currentExercise, setCurrentExercise] = useState(0);
  const [score, setScore] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isCorrect, setIsCorrect] = useState(null);

  const getCurrentLevel = () => {
    return LEVELS.slice().reverse().find(l => userProfile.xp >= l.minXP) || LEVELS[0];
  };

  const getNextLevel = () => {
    const currentLevel = getCurrentLevel();
    return LEVELS.find(l => l.level === currentLevel.level + 1);
  };

  const addXP = (amount) => {
    const newXP = userProfile.xp + amount;
    const oldLevel = getCurrentLevel();
    
    setUserProfile(prev => ({ ...prev, xp: newXP }));
    
    // Check for level up
    const newLevel = LEVELS.slice().reverse().find(l => newXP >= l.minXP);
    if (newLevel && newLevel.level > oldLevel.level) {
      setShowLevelUp(true);
      setTimeout(() => setShowLevelUp(false), 3000);
    }
  };

  const checkAndAwardBadges = () => {
    const newBadges = [];
    
    BADGES.forEach(badge => {
      if (!userProfile.badges.includes(badge.id)) {
        let qualify = false;
        
        switch(badge.id) {
          case 'first_lesson':
            qualify = userProfile.completedLessons >= 1;
            break;
          case 'week_streak':
            qualify = userProfile.streak >= 7;
            break;
          case 'fast_learner':
            qualify = userProfile.completedLessons >= 10;
            break;
          case 'master_100':
            qualify = userProfile.masteredWords >= 100;
            break;
          case 'perfect_score':
            qualify = userProfile.perfectScores >= 10;
            break;
          case 'social_butterfly':
            qualify = userProfile.shares >= 5;
            break;
        }
        
        if (qualify) {
          newBadges.push(badge.id);
        }
      }
    });
    
    if (newBadges.length > 0) {
      setUserProfile(prev => ({ ...prev, badges: [...prev.badges, ...newBadges] }));
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    }
  };

  const startLesson = (theme) => {
    setCurrentTheme(theme);
    setCurrentExercise(0);
    setScore(0);
    setCurrentView('lesson');
  };

  const handleAnswer = (answer) => {
    const exercise = LEARNING_DATA.exercises[currentTheme.id][currentExercise];
    const correct = answer === exercise.bariba;
    
    setSelectedAnswer(answer);
    setIsCorrect(correct);
    
    if (correct) {
      setScore(prev => prev + 1);
    }
    
    setTimeout(() => {
      if (currentExercise < LEARNING_DATA.exercises[currentTheme.id].length - 1) {
        setCurrentExercise(prev => prev + 1);
        setSelectedAnswer(null);
        setIsCorrect(null);
      } else {
        // Lesson complete
        const earnedXP = currentTheme.xp;
        addXP(earnedXP);
        
        setUserProfile(prev => ({
          ...prev,
          completedLessons: prev.completedLessons + 1,
          perfectScores: score === LEARNING_DATA.exercises[currentTheme.id].length ? prev.perfectScores + 1 : prev.perfectScores,
          masteredWords: prev.masteredWords + LEARNING_DATA.exercises[currentTheme.id].length
        }));
        
        checkAndAwardBadges();
        setCurrentView('lesson-complete');
      }
    }, 1500);
  };

  const shareProgress = () => {
    setUserProfile(prev => ({ ...prev, shares: prev.shares + 1 }));
    checkAndAwardBadges();
    alert(`🎉 Partagé ! "${userProfile.name} a atteint le niveau ${getCurrentLevel().level} en Bariba avec ${userProfile.xp} XP !"`);
  };

  const currentLevel = getCurrentLevel();
  const nextLevel = getNextLevel();
  const progressToNext = nextLevel ? ((userProfile.xp - currentLevel.minXP) / (nextLevel.minXP - currentLevel.minXP)) * 100 : 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6">
      {/* Confetti Animation */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
          <div className="animate-bounce text-8xl">🎉</div>
        </div>
      )}
      
      {/* Level Up Animation */}
      {showLevelUp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-3xl p-12 text-center animate-pulse shadow-2xl">
            <div className="text-7xl mb-4">{currentLevel.icon}</div>
            <h2 className="text-4xl font-bold text-purple-600 mb-2">Niveau supérieur !</h2>
            <p className="text-2xl text-gray-700">Vous êtes maintenant {currentLevel.name}</p>
          </div>
        </div>
      )}

      {/* Dashboard View */}
      {currentView === 'dashboard' && (
        <div className="max-w-7xl mx-auto">
          {/* Header with User Profile */}
          <div className="bg-white rounded-3xl shadow-xl p-8 mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-5xl">
                  {currentLevel.icon}
                </div>
                <div>
                  <h1 className="text-4xl font-bold text-gray-800 mb-1">{userProfile.name}</h1>
                  <p className={`text-xl font-semibold ${currentLevel.color}`}>
                    {currentLevel.name} - Niveau {currentLevel.level}
                  </p>
                  <div className="flex items-center gap-3 mt-2">
                    <Flame className="text-orange-500" />
                    <span className="text-lg font-semibold">{userProfile.streak} jours de suite</span>
                  </div>
                </div>
              </div>
              
              <button 
                onClick={shareProgress}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-3 rounded-full hover:shadow-lg transition-all"
              >
                <Share2 size={20} />
                Partager
              </button>
            </div>
            
            {/* XP Progress Bar */}
            <div className="mb-4">
              <div className="flex justify-between mb-2">
                <span className="text-sm font-semibold text-gray-600">
                  {userProfile.xp} XP
                </span>
                {nextLevel && (
                  <span className="text-sm font-semibold text-gray-600">
                    {nextLevel.minXP} XP pour {nextLevel.name}
                  </span>
                )}
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-green-400 to-blue-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${progressToNext}%` }}
                />
              </div>
            </div>
            
            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-4 mt-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 text-center">
                <BookOpen className="mx-auto mb-2 text-blue-600" />
                <div className="text-2xl font-bold text-blue-700">{userProfile.completedLessons}</div>
                <div className="text-sm text-blue-600">Leçons complètes</div>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 text-center">
                <Target className="mx-auto mb-2 text-green-600" />
                <div className="text-2xl font-bold text-green-700">{userProfile.masteredWords}</div>
                <div className="text-sm text-green-600">Mots maîtrisés</div>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 text-center">
                <Sparkles className="mx-auto mb-2 text-purple-600" />
                <div className="text-2xl font-bold text-purple-700">{userProfile.perfectScores}</div>
                <div className="text-sm text-purple-600">Scores parfaits</div>
              </div>
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 text-center">
                <Award className="mx-auto mb-2 text-orange-600" />
                <div className="text-2xl font-bold text-orange-700">{userProfile.badges.length}</div>
                <div className="text-sm text-orange-600">Badges obtenus</div>
              </div>
            </div>
          </div>

          {/* Badges Section */}
          {userProfile.badges.length > 0 && (
            <div className="bg-white rounded-3xl shadow-xl p-8 mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
                <Trophy className="text-yellow-500" />
                Mes Badges
              </h2>
              <div className="grid grid-cols-4 gap-4">
                {BADGES.filter(b => userProfile.badges.includes(b.id)).map(badge => (
                  <div key={badge.id} className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl p-4 text-center border-2 border-yellow-300">
                    <div className="text-4xl mb-2">{badge.icon}</div>
                    <div className="font-bold text-gray-800">{badge.name}</div>
                    <div className="text-xs text-gray-600 mt-1">{badge.description}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Learning Themes */}
          <div className="bg-white rounded-3xl shadow-xl p-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-6 flex items-center gap-3">
              <Sparkles className="text-purple-500" />
              Thèmes d'apprentissage
            </h2>
            
            <div className="grid grid-cols-2 gap-6">
              {LEARNING_DATA.themes.map(theme => (
                <div 
                  key={theme.id}
                  onClick={() => startLesson(theme)}
                  className="group cursor-pointer bg-gradient-to-br from-white to-gray-50 rounded-2xl p-6 border-2 border-gray-200 hover:border-purple-400 hover:shadow-xl transition-all transform hover:-translate-y-1"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className={`${theme.color} w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-lg`}>
                      {theme.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-800 group-hover:text-purple-600 transition-colors">
                        {theme.name}
                      </h3>
                      <p className="text-sm text-gray-600">{theme.lessons} leçons disponibles</p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-yellow-600 font-bold">
                        <Zap size={18} />
                        <span>+{theme.xp} XP</span>
                      </div>
                    </div>
                  </div>
                  
                  <button className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-xl font-semibold hover:from-purple-600 hover:to-pink-600 transition-all">
                    Commencer →
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Lesson View */}
      {currentView === 'lesson' && currentTheme && (
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-3xl shadow-xl p-8">
            {/* Progress Bar */}
            <div className="mb-8">
              <div className="flex justify-between mb-2">
                <span className="text-sm font-semibold text-gray-600">
                  Question {currentExercise + 1} / {LEARNING_DATA.exercises[currentTheme.id].length}
                </span>
                <span className="text-sm font-semibold text-green-600">
                  Score: {score} / {LEARNING_DATA.exercises[currentTheme.id].length}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-green-400 to-blue-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${((currentExercise + 1) / LEARNING_DATA.exercises[currentTheme.id].length) * 100}%` }}
                />
              </div>
            </div>

            {/* Exercise */}
            <div className="text-center mb-12">
              <div className={`inline-block ${currentTheme.color} text-white px-6 py-2 rounded-full text-sm font-semibold mb-6`}>
                {currentTheme.name}
              </div>
              
              <h2 className="text-4xl font-bold text-gray-800 mb-4">
                Traduisez en Bariba :
              </h2>
              
              <div className="bg-gradient-to-r from-blue-100 to-purple-100 rounded-2xl p-8 mb-8">
                <div className="flex items-center justify-center gap-4 mb-4">
                  <Volume2 className="text-blue-600 cursor-pointer hover:scale-110 transition-transform" size={32} />
                </div>
                <p className="text-3xl font-bold text-gray-800">
                  {LEARNING_DATA.exercises[currentTheme.id][currentExercise].french}
                </p>
              </div>

              {/* Options */}
              <div className="grid grid-cols-1 gap-4">
                {LEARNING_DATA.exercises[currentTheme.id][currentExercise].options.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => handleAnswer(option)}
                    disabled={selectedAnswer !== null}
                    className={`
                      p-6 rounded-2xl text-xl font-semibold transition-all transform hover:scale-105
                      ${selectedAnswer === null ? 'bg-gray-100 hover:bg-gray-200 text-gray-800' : ''}
                      ${selectedAnswer === option && isCorrect ? 'bg-green-500 text-white' : ''}
                      ${selectedAnswer === option && !isCorrect ? 'bg-red-500 text-white' : ''}
                      ${selectedAnswer !== null && selectedAnswer !== option && option === LEARNING_DATA.exercises[currentTheme.id][currentExercise].bariba ? 'bg-green-200 text-green-800' : ''}
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <span>{option}</span>
                      {selectedAnswer === option && isCorrect && <Check className="text-white" />}
                      {selectedAnswer === option && !isCorrect && <X className="text-white" />}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lesson Complete View */}
      {currentView === 'lesson-complete' && (
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-3xl shadow-xl p-12 text-center">
            <div className="text-8xl mb-6 animate-bounce">🎉</div>
            <h2 className="text-4xl font-bold text-purple-600 mb-4">Félicitations !</h2>
            <p className="text-xl text-gray-700 mb-8">
              Vous avez terminé la leçon "{currentTheme?.name}"
            </p>
            
            <div className="grid grid-cols-3 gap-6 mb-8">
              <div className="bg-blue-50 rounded-xl p-6">
                <div className="text-3xl font-bold text-blue-600 mb-2">
                  {score}/{LEARNING_DATA.exercises[currentTheme?.id]?.length}
                </div>
                <div className="text-sm text-blue-700">Score</div>
              </div>
              <div className="bg-green-50 rounded-xl p-6">
                <div className="text-3xl font-bold text-green-600 mb-2">
                  +{currentTheme?.xp}
                </div>
                <div className="text-sm text-green-700">XP gagnés</div>
              </div>
              <div className="bg-purple-50 rounded-xl p-6">
                <div className="text-3xl font-bold text-purple-600 mb-2">
                  {Math.round((score / LEARNING_DATA.exercises[currentTheme?.id]?.length) * 100)}%
                </div>
                <div className="text-sm text-purple-700">Précision</div>
              </div>
            </div>

            <div className="flex gap-4 justify-center">
              <button 
                onClick={() => setCurrentView('dashboard')}
                className="px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
              >
                Retour au tableau de bord
              </button>
              <button 
                onClick={shareProgress}
                className="px-8 py-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all flex items-center gap-2"
              >
                <Share2 size={20} />
                Partager ma réussite
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
