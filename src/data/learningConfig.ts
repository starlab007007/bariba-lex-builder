// ═══════════════════════════════════════════════════════════════════
// Configuration bilingue pour le module d'apprentissage Bariba ↔ Français
// ═══════════════════════════════════════════════════════════════════

export type LearningLanguage = 'french' | 'bariba';

export interface LanguageConfig {
  code: string;
  name: string;
  flag: string;
  native: string;
  learning: string;
  direction: 'fr_to_bariba' | 'bariba_to_french';
  ui: Record<string, string>;
}

export const LANGUAGE_CONFIG: Record<LearningLanguage, LanguageConfig> = {
  french: {
    code: 'fr',
    name: 'Français',
    flag: '🇫🇷',
    native: 'Français',
    learning: 'Bariba',
    direction: 'fr_to_bariba',
    ui: {
      dashboard: 'Tableau de bord',
      lessons: 'Leçons',
      profile: 'Profil',
      settings: 'Paramètres',
      start: 'Commencer',
      continue: 'Continuer',
      complete: 'Terminer',
      score: 'Score',
      xp: 'XP',
      level: 'Niveau',
      streak: 'Série',
      badges: 'Badges',
      share: 'Partager',
      translateTo: 'Traduisez en Bariba :',
      correctAnswer: 'Bonne réponse !',
      wrongAnswer: 'Pas tout à fait...',
      explanation: 'Explication',
      nextQuestion: 'Question suivante',
      backToDashboard: 'Retour',
      retry: 'Recommencer',
      nextModule: 'Module suivant',
      completedLessons: 'Leçons',
      masteredWords: 'Mots',
      perfectScores: 'Parfaits',
      earnedBadges: 'Badges',
      dayStreak: 'jours de suite',
      congratulations: 'Félicitations !',
      excellent: 'Excellent !',
      goodJob: 'Bien joué !',
      keepGoing: 'Continue !',
      yourProgress: 'Votre progression',
      chooseTheme: 'Choisissez un thème',
      lessonsAvailable: 'leçons',
      xpPerLesson: 'XP / leçon',
      chooseLanguage: 'Choisissez votre langue maternelle',
      iSpeak: 'Je parle Français',
      iWantToLearn: 'Je veux apprendre le Bariba',
      interfaceIn: 'Interface en français',
      youWillLearn: 'Vous apprendrez :',
      tonesSystem: 'Système tonal (3 tons)',
      sovOrder: 'Ordre SOV (différent du français)',
      nominalClasses: 'Classes nominales',
      baribaCulture: 'Culture bariba',
      precision: 'Précision',
      xpEarned: 'XP gagnés',
      shareSuccess: 'Partager',
      levelUp: 'Niveau supérieur !',
      youAreNow: 'Vous êtes maintenant',
      welcome: 'Bienvenue',
      myBadges: 'Mes Badges',
      themes: 'Thèmes d\'apprentissage',
    },
  },
  bariba: {
    code: 'br',
    name: 'Bariba',
    flag: '🌍',
    native: 'Bariba',
    learning: 'Fãsei',
    direction: 'bariba_to_french',
    ui: {
      dashboard: 'Sɔmburu yɛnu',
      lessons: 'Deburenu',
      profile: 'Win yɛnu',
      settings: 'Kpindu yenu',
      start: 'Seewo',
      continue: 'Ka taa',
      complete: 'Kpe',
      score: 'Karɛ',
      xp: 'XP',
      level: 'Yɛɛru',
      streak: 'Buru yeru',
      badges: 'Tigarenu',
      share: 'Yira',
      translateTo: 'Debu Fãsei sɔɔ :',
      correctAnswer: 'Wẽ !',
      wrongAnswer: 'Kun wẽ sɛsɛ...',
      explanation: 'Deburu',
      nextQuestion: 'Kasuu yira',
      backToDashboard: 'Sɔnda',
      retry: 'Seewoma',
      nextModule: 'Deburu yira',
      completedLessons: 'Deburenu',
      masteredWords: 'Yenu',
      perfectScores: 'Sɑ̃ɑtɔ',
      earnedBadges: 'Tigarenu',
      dayStreak: 'buru yeru',
      congratulations: 'Wẽ yaa !',
      excellent: 'Wẽ tibotibo !',
      goodJob: 'Wẽ !',
      keepGoing: 'Ka taa !',
      yourProgress: 'Win taaruru',
      chooseTheme: 'A deburu debu',
      lessonsAvailable: 'deburenu',
      xpPerLesson: 'XP / deburu',
      chooseLanguage: 'A win yenu debu',
      iSpeak: 'Ń nɛɛ Bariba',
      iWantToLearn: 'Ń wure Fãsei debu',
      interfaceIn: 'Interface yɛɛ Bariba sɔɔ',
      youWillLearn: 'A deburenu :',
      tonesSystem: 'Yenu fãsei (26 yenu)',
      sovOrder: 'SVO kpindu (kã Bariba)',
      nominalClasses: 'Koru deburu (conjugaisons)',
      baribaCulture: 'Fãsei waakurenu',
      precision: 'Kpinkpindu',
      xpEarned: 'XP mɔ',
      shareSuccess: 'Yira',
      levelUp: 'Yɛɛru kuwɑɑ !',
      youAreNow: 'A tɛ̃',
      welcome: 'Sĩa kãnu',
      myBadges: 'Nɛn Tigarenu',
      themes: 'Deburu yɔɔrenu',
    },
  },
};

export interface Level {
  level: number;
  name: { fr: string; br: string };
  minXP: number;
  icon: string;
  color: string;
}

export const LEVELS: Level[] = [
  { level: 1, name: { fr: 'Débutant', br: 'Tɛntɛmɑ' }, minXP: 0, icon: '🌱', color: 'text-green-500' },
  { level: 2, name: { fr: 'Apprenti', br: 'Kɑɑkumɑ' }, minXP: 500, icon: '🌿', color: 'text-green-600' },
  { level: 3, name: { fr: 'Pratiquant', br: 'Sõmbumɑ' }, minXP: 1500, icon: '🌳', color: 'text-blue-500' },
  { level: 4, name: { fr: 'Intermédiaire', br: 'Dɔɔbumɑ' }, minXP: 3000, icon: '🎋', color: 'text-blue-600' },
  { level: 5, name: { fr: 'Avancé', br: 'Tubumɑ' }, minXP: 5000, icon: '🏆', color: 'text-purple-500' },
  { level: 6, name: { fr: 'Expert', br: 'Kãatɔ' }, minXP: 8000, icon: '👑', color: 'text-yellow-500' },
  { level: 7, name: { fr: 'Maître', br: 'Sunɔ' }, minXP: 12000, icon: '⭐', color: 'text-orange-500' },
  { level: 8, name: { fr: 'Sage', br: 'Dɔɔnugberun' }, minXP: 20000, icon: '✨', color: 'text-pink-500' },
];

export interface Badge {
  id: string;
  name: { fr: string; br: string };
  description: { fr: string; br: string };
  icon: string;
  xpReward: number;
}

export const BADGES: Badge[] = [
  {
    id: 'first_lesson',
    name: { fr: 'Premier Pas', br: 'Gbunɑɑri tɛntɛmɑ' },
    description: { fr: 'Complète ta première leçon', br: 'Deburu dɔmbɔ kpe' },
    icon: '🎯',
    xpReward: 50,
  },
  {
    id: 'week_streak',
    name: { fr: 'Régularité', br: 'Baabɑɑ gbungbunduu' },
    description: { fr: '7 jours d\'affilée', br: 'Buru kɛɛru yeru' },
    icon: '🔥',
    xpReward: 100,
  },
  {
    id: 'fast_learner',
    name: { fr: 'Rapide', br: 'Tubuɑ yɑɑyɑɑ' },
    description: { fr: '10 leçons en un jour', br: 'Deburenu nuu buru dɔmbɔ sɔɔ' },
    icon: '⚡',
    xpReward: 150,
  },
  {
    id: 'master_100',
    name: { fr: 'Centurion', br: 'Kεmɑ kpɑɑ' },
    description: { fr: '100 mots appris', br: 'Yenu kεmɑ debu' },
    icon: '💯',
    xpReward: 200,
  },
  {
    id: 'perfect_score',
    name: { fr: 'Parfait', br: 'Sɑ̃ɑtɔ' },
    description: { fr: '10 exercices parfaits', br: 'Sɔɔru nuu sɑ̃ɑtɔ' },
    icon: '✨',
    xpReward: 150,
  },
  {
    id: 'social_butterfly',
    name: { fr: 'Social', br: 'Bɛɛkɑɑbumɑ' },
    description: { fr: 'Partage 5 fois', br: 'Yira kɔɔbu nuu' },
    icon: '🦋',
    xpReward: 100,
  },
  {
    id: 'cultural_expert',
    name: { fr: 'Expert Culturel', br: 'Kããtɔ yɔɔru' },
    description: { fr: 'Maîtrise tous les proverbes', br: 'Yɔɔgbeni kpunku debu' },
    icon: '📚',
    xpReward: 500,
  },
  {
    id: 'polyglot',
    name: { fr: 'Polyglotte', br: 'Wãatubumɑ soruru' },
    description: { fr: 'Complète tous les thèmes', br: 'Yɔɔrenu kpunku kpe' },
    icon: '🌍',
    xpReward: 1000,
  },
];
