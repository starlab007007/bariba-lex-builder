import { useState, useEffect, useCallback } from 'react';
import { LEVELS, BADGES, type LearningLanguage, type Level, type Badge, LANGUAGE_CONFIG } from '@/data/learningConfig';

// ═══════════════════════════════════════════════════════════════════
// Hook de progression - XP, niveaux, badges, streak via localStorage
// ═══════════════════════════════════════════════════════════════════

interface UserProfile {
  xp: number;
  streak: number;
  lastVisit: string;
  completedLessons: number;
  masteredWords: number;
  perfectScores: number;
  shares: number;
  badges: string[];
  completedThemes: string[];
}

const DEFAULT_PROFILE: UserProfile = {
  xp: 0,
  streak: 0,
  lastVisit: new Date().toISOString(),
  completedLessons: 0,
  masteredWords: 0,
  perfectScores: 0,
  shares: 0,
  badges: [],
  completedThemes: [],
};

const STORAGE_KEY_PROFILE = 'fitila_learn_profile';
const STORAGE_KEY_LANG = 'fitila_learn_language';

export function useLearningProgress() {
  const [userLanguage, setUserLanguage] = useState<LearningLanguage | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_LANG);
    return saved === 'french' || saved === 'bariba' ? saved : null;
  });

  const [profile, setProfile] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PROFILE);
      if (saved) return { ...DEFAULT_PROFILE, ...JSON.parse(saved) };
    } catch {}
    return DEFAULT_PROFILE;
  });

  const [newBadges, setNewBadges] = useState<Badge[]>([]);

  // Persist
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(profile));
  }, [profile]);

  // Streak calculation on mount
  useEffect(() => {
    const today = new Date().toDateString();
    const lastVisit = new Date(profile.lastVisit).toDateString();
    if (today !== lastVisit) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const isConsecutive = yesterday.toDateString() === lastVisit;
      setProfile(p => ({
        ...p,
        streak: isConsecutive ? p.streak + 1 : 1,
        lastVisit: new Date().toISOString(),
      }));
    }
  }, []);

  const selectLanguage = useCallback((lang: LearningLanguage) => {
    setUserLanguage(lang);
    localStorage.setItem(STORAGE_KEY_LANG, lang);
  }, []);

  const config = userLanguage ? LANGUAGE_CONFIG[userLanguage] : null;
  const langKey = userLanguage === 'french' ? 'fr' : 'br';

  const getCurrentLevel = useCallback((): Level => {
    return [...LEVELS].reverse().find(l => profile.xp >= l.minXP) || LEVELS[0];
  }, [profile.xp]);

  const getNextLevel = useCallback((): Level | null => {
    const current = getCurrentLevel();
    return LEVELS.find(l => l.level === current.level + 1) || null;
  }, [getCurrentLevel]);

  const addXP = useCallback((amount: number) => {
    setProfile(p => ({ ...p, xp: p.xp + amount }));
  }, []);

  const completeLesson = useCallback((themeId: string, score: number, total: number) => {
    const isPerfect = score === total;
    const xpBase = 50;
    const xpBonus = isPerfect ? 25 : 0;

    setProfile(p => ({
      ...p,
      xp: p.xp + xpBase + xpBonus,
      completedLessons: p.completedLessons + 1,
      masteredWords: p.masteredWords + score,
      perfectScores: isPerfect ? p.perfectScores + 1 : p.perfectScores,
      lastVisit: new Date().toISOString(),
    }));

    // Check badges
    checkBadges();
  }, []);

  const checkBadges = useCallback(() => {
    const earned: Badge[] = [];
    BADGES.forEach(badge => {
      if (profile.badges.includes(badge.id)) return;
      let qualify = false;
      switch (badge.id) {
        case 'first_lesson': qualify = profile.completedLessons >= 1; break;
        case 'week_streak': qualify = profile.streak >= 7; break;
        case 'fast_learner': qualify = profile.completedLessons >= 10; break;
        case 'master_100': qualify = profile.masteredWords >= 100; break;
        case 'perfect_score': qualify = profile.perfectScores >= 10; break;
        case 'social_butterfly': qualify = profile.shares >= 5; break;
      }
      if (qualify) earned.push(badge);
    });
    if (earned.length > 0) {
      setNewBadges(earned);
      setProfile(p => ({
        ...p,
        badges: [...p.badges, ...earned.map(b => b.id)],
        xp: p.xp + earned.reduce((sum, b) => sum + b.xpReward, 0),
      }));
    }
  }, [profile]);

  const clearNewBadges = useCallback(() => setNewBadges([]), []);

  const incrementShares = useCallback(() => {
    setProfile(p => ({ ...p, shares: p.shares + 1 }));
  }, []);

  const shareProgress = useCallback(() => {
    const level = getCurrentLevel();
    const levelName = level.name[langKey];
    const isFr = userLanguage === 'french';

    const message = isFr
      ? `🎉 J'ai atteint le niveau ${level.level} (${levelName}) en Bariba avec ${profile.xp} XP !\n\n📊 Mes stats :\n• ${profile.masteredWords} mots bariba maîtrisés\n• ${profile.badges.length} badges obtenus\n• ${profile.streak} jours de série 🔥\n\n#ApprendreLeBaribaAvecPassion #Bariba`
      : `🎉 Ń yɛɛru ${level.level} (${levelName}) Fãsei debu sɔɔ ɛni ${profile.xp} XP mɔ !\n\n📊 Win taarunu :\n• Yenu fãsei ${profile.masteredWords} debu\n• Tigaru ${profile.badges.length} mɔ\n• Buru ${profile.streak} yeru 🔥\n\n#DebuFãsei #Bariba`;

    if (navigator.share) {
      navigator.share({ title: isFr ? 'Ma progression en Bariba' : 'Win taaruru Fãsei sɔɔ', text: message }).catch(() => {
        navigator.clipboard.writeText(message);
      });
    } else {
      navigator.clipboard.writeText(message);
    }
    incrementShares();
  }, [getCurrentLevel, langKey, profile, userLanguage, incrementShares]);

  const getText = useCallback((key: string): string => {
    if (!config) return key;
    return config.ui[key] || key;
  }, [config]);

  const getLevelName = useCallback((level: Level): string => {
    return level.name[langKey];
  }, [langKey]);

  return {
    userLanguage,
    selectLanguage,
    config,
    langKey: langKey as 'fr' | 'br',
    profile,
    getCurrentLevel,
    getNextLevel,
    addXP,
    completeLesson,
    shareProgress,
    getText,
    getLevelName,
    newBadges,
    clearNewBadges,
    checkBadges,
  };
}
