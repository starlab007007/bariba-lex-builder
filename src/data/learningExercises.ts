// ═══════════════════════════════════════════════════════════════════
// Exercices bidirectionnels Bariba ↔ Français
// Extraits des fichiers idiomes.json, bariba_learning_module.jsx
// et du dictionnaire français-bariba
// ═══════════════════════════════════════════════════════════════════

export interface LearningTheme {
  id: string;
  name: { fr: string; br: string };
  icon: string;
  color: string;
  lessonsCount: number;
  xpPerLesson: number;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
}

export interface Exercise {
  french: string;
  bariba: string;
  context?: string;
  // Distracteurs pour le mode FR→BA (options en bariba)
  distractorsBa: string[];
  // Distracteurs pour le mode BA→FR (options en français)
  distractorsFr: string[];
}

export const THEMES: LearningTheme[] = [
  { id: 'salutations', name: { fr: 'Salutations & Politesse', br: 'Sɑnɑɑru kɑ bɛnɛɛru' }, icon: '👋', color: '#3B82F6', lessonsCount: 15, xpPerLesson: 100, difficulty: 'easy' },
  { id: 'famille', name: { fr: 'Famille & Relations', br: 'Dɛnu kɑ bɛɛkɑɑru' }, icon: '👨‍👩‍👧‍👦', color: '#EC4899', lessonsCount: 8, xpPerLesson: 150, difficulty: 'easy' },
  { id: 'nourriture', name: { fr: 'Nourriture & Boissons', br: 'Diru kɑ nɔɔru' }, icon: '🍲', color: '#F97316', lessonsCount: 8, xpPerLesson: 120, difficulty: 'easy' },
  { id: 'sante', name: { fr: 'Santé & Corps', br: 'Dɔɔru kɑ kuɑru' }, icon: '🏥', color: '#10B981', lessonsCount: 8, xpPerLesson: 130, difficulty: 'medium' },
  { id: 'commerce', name: { fr: 'Commerce & Argent', br: 'Sũukuuru kɑ wuri' }, icon: '💰', color: '#EAB308', lessonsCount: 6, xpPerLesson: 110, difficulty: 'medium' },
  { id: 'emotions', name: { fr: 'Émotions & Sentiments', br: 'Wɔ̃ɔ̃bɑɑru kɑ fɛɛkɑɑru' }, icon: '😊', color: '#EF4444', lessonsCount: 10, xpPerLesson: 80, difficulty: 'medium' },
  { id: 'etats', name: { fr: 'États & Besoins', br: 'Kpindu kɑ wururenu' }, icon: '💭', color: '#8B5CF6', lessonsCount: 11, xpPerLesson: 90, difficulty: 'medium' },
  { id: 'actions', name: { fr: 'Actions & Verbes', br: 'Korenu kɑ wurɑru' }, icon: '🏃', color: '#06B6D4', lessonsCount: 10, xpPerLesson: 100, difficulty: 'medium' },
  { id: 'temps', name: { fr: 'Temps & Connecteurs', br: 'Wɑɑru kɑ kpɑrɑɑru' }, icon: '⏰', color: '#6366F1', lessonsCount: 10, xpPerLesson: 90, difficulty: 'medium' },
  { id: 'proverbes', name: { fr: 'Proverbes & Sagesse', br: 'Yɔɔgbeni kɑ tuburu' }, icon: '📜', color: '#D97706', lessonsCount: 10, xpPerLesson: 200, difficulty: 'expert' },
];

// Exercices par thème - chaque exercice est bidirectionnel
export const EXERCISES: Record<string, Exercise[]> = {
  salutations: [
    { french: 'Bonne arrivée !', bariba: 'Aagu wune ka weru.', context: 'Salutation d\'accueil standard', distractorsBa: ['Yeegu ?', 'A kɔ kɑ sɔmburu.', 'Yɑm wɔ̃kurɑ ?'], distractorsFr: ['Comment vas-tu ?', 'Bon courage', 'Bonne nuit'] },
    { french: 'Salut (à un plus jeune)', bariba: 'Aagu.', context: 'Salutation informelle', distractorsBa: ['Yeegu ?', 'Aagu wune ka weru.', 'Nɑ kɑ̃i nin tɛriɑ.'], distractorsFr: ['Au revoir', 'Merci', 'Bonjour'] },
    { french: 'Comment vas-tu ?', bariba: 'Yeegu ?', context: 'Salutation courante', distractorsBa: ['Aagu.', 'A kpunɑ n dɔɔ ?', 'Yɑm wɔ̃kurɑ ?'], distractorsFr: ['Bonne arrivée !', 'As-tu bien dormi ?', 'Bonne nuit'] },
    { french: 'Bon courage', bariba: 'A kɔ kɑ sɔmburu.', context: 'Encouragement', distractorsBa: ['Yeegu ?', 'Aagu.', 'Nɑ kɑ̃i nin tɛriɑ.'], distractorsFr: ['Comment vas-tu ?', 'Bonne nuit', 'Merci beaucoup'] },
    { french: 'As-tu bien dormi ?', bariba: 'A kpunɑ n dɔɔ ?', context: 'Salutation du matin', distractorsBa: ['Yeegu ?', 'Yɑm wɔ̃kurɑ ?', 'Aagu.'], distractorsFr: ['Comment vas-tu ?', 'Bonne nuit', 'La maison va bien ?'] },
    { french: 'La maison va bien ?', bariba: 'Yɛnu ɡɑ yɑri kɑ ɑlɑɑfiɑ ?', context: 'Nouvelles de la famille', distractorsBa: ['A kpunɑ n dɔɔ ?', 'Yeegu ?', 'Yɑm wɔ̃kurɑ ?'], distractorsFr: ['As-tu bien dormi ?', 'Bonne soirée', 'Comment vas-tu ?'] },
    { french: 'Bonne soirée', bariba: 'Yɑm wɔ̃kurɑ ?', context: 'Salutation de fin d\'après-midi', distractorsBa: ['A kpunɑ n dɔɔ ?', 'Yeegu ?', 'Aagu.'], distractorsFr: ['Bonjour', 'Bonne nuit', 'À demain'] },
    { french: 'Bonne nuit', bariba: 'A kpunɑ kɑ ɑlɑɑfiɑ.', context: 'Souhait avant de dormir', distractorsBa: ['Yɑm wɔ̃kurɑ ?', 'Yɑmɔ wɑrɑ.', 'Aagu.'], distractorsFr: ['À demain', 'Bonne soirée', 'Bonjour'] },
    { french: 'À demain', bariba: 'Yɑmɔ wɑrɑ.', context: 'Prendre congé', distractorsBa: ['A kpunɑ kɑ ɑlɑɑfiɑ.', 'Yeegu ?', 'I turi baani.'], distractorsFr: ['Bonne nuit', 'Bon voyage', 'Merci'] },
    { french: 'Merci beaucoup', bariba: 'Nɑ kɑ̃i nin tɛriɑ.', context: 'Remerciement appuyé', distractorsBa: ['Kɑsɔru kun mɔ.', 'A kɔ kɑ sɔmburu.', 'Yeegu ?'], distractorsFr: ['De rien', 'Bon courage', 'Pardon'] },
    { french: 'De rien', bariba: 'Kɑsɔru kun mɔ.', context: 'Réponse au remerciement', distractorsBa: ['Nɑ kɑ̃i nin tɛriɑ.', 'Aagu.', 'Yeegu ?'], distractorsFr: ['Merci beaucoup', 'Pardon', 'Bonjour'] },
    { french: 'Pardon', bariba: 'Nɑ nɛn wɔrɑ wɑ̃i.', context: 'Demande d\'excuse', distractorsBa: ['Kɑsɔru kun mɔ.', 'Nɑ kɑ̃i nin tɛriɑ.', 'Aagu.'], distractorsFr: ['Merci', 'De rien', 'Bonjour'] },
    { french: 'Bon voyage', bariba: 'I turi baani.', context: 'Souhait pour le voyageur', distractorsBa: ['Yɑmɔ wɑrɑ.', 'A kpunɑ kɑ ɑlɑɑfiɑ.', 'Yeegu ?'], distractorsFr: ['À demain', 'Bonne nuit', 'Merci'] },
    { french: 'Hé Chef ! (Respect)', bariba: 'Ãa Sunɔ !', context: 'Interpellation respectueuse', distractorsBa: ['Aagu.', 'Yeegu ?', 'A kɔ kɑ sɔmburu.'], distractorsFr: ['Salut', 'Bonjour', 'Merci'] },
    { french: 'Tu es déjà venu !', bariba: 'Aa, ana kɔ.', context: 'Surprise à l\'arrivée', distractorsBa: ['Aagu.', 'Yeegu ?', 'Aagu wune ka weru.'], distractorsFr: ['Bonjour', 'Au revoir', 'Merci'] },
  ],

  famille: [
    { french: 'Oncle paternel', bariba: 'Bɑɑ kpe.', context: 'Terminologie familiale', distractorsBa: ['Mɛrɔ kpe.', 'Nɛn wɔ̃ɔ.', 'Nɛn kurɔ.'], distractorsFr: ['Tante maternelle', 'Mon mari', 'Ma femme'] },
    { french: 'Tante maternelle', bariba: 'Mɛrɔ kpe.', context: 'Terminologie familiale', distractorsBa: ['Bɑɑ kpe.', 'Nɛn wɔ̃ɔ.', 'Nɛn kurɔ.'], distractorsFr: ['Oncle paternel', 'Mon mari', 'Ma femme'] },
    { french: 'Mon mari', bariba: 'Nɛn wɔ̃ɔ.', context: 'Relation conjugale', distractorsBa: ['Nɛn kurɔ.', 'Bɑɑ kpe.', 'Mɛrɔ kpe.'], distractorsFr: ['Ma femme', 'Oncle paternel', 'Tante maternelle'] },
    { french: 'Ma femme', bariba: 'Nɛn kurɔ.', context: 'Relation conjugale', distractorsBa: ['Nɛn wɔ̃ɔ.', 'Bɑɑ kpe.', 'Mɛrɔ kpe.'], distractorsFr: ['Mon mari', 'Oncle paternel', 'Tante maternelle'] },
    { french: 'Père', bariba: 'Baa', context: 'Famille nucléaire', distractorsBa: ['Yaa', 'Bii', 'Suuru'], distractorsFr: ['Mère', 'Enfant', 'Frère'] },
    { french: 'Mère', bariba: 'Yaa', context: 'Famille nucléaire', distractorsBa: ['Baa', 'Bii', 'Yɛɛru'], distractorsFr: ['Père', 'Enfant', 'Sœur'] },
    { french: 'Enfant', bariba: 'Bii', context: 'Famille nucléaire', distractorsBa: ['Baa', 'Yaa', 'Suuru'], distractorsFr: ['Père', 'Mère', 'Frère'] },
    { french: 'Frère', bariba: 'Suuru', context: 'Fratrie', distractorsBa: ['Yɛɛru', 'Bii', 'Baa'], distractorsFr: ['Sœur', 'Enfant', 'Père'] },
  ],

  nourriture: [
    { french: 'Riz', bariba: 'Koko', context: 'Aliment de base', distractorsBa: ['Wusu', 'Nim', 'Nɔni'], distractorsFr: ['Igname', 'Eau', 'Viande'] },
    { french: 'Igname', bariba: 'Wusu', context: 'Aliment de base', distractorsBa: ['Koko', 'Nim', 'Wisu'], distractorsFr: ['Riz', 'Eau', 'Poisson'] },
    { french: 'Eau', bariba: 'Nim', context: 'Boisson', distractorsBa: ['Koko', 'Wusu', 'Nɔni'], distractorsFr: ['Riz', 'Igname', 'Viande'] },
    { french: 'Viande', bariba: 'Nɔni', context: 'Protéine', distractorsBa: ['Wisu', 'Koko', 'Nim'], distractorsFr: ['Poisson', 'Riz', 'Eau'] },
    { french: 'Poisson', bariba: 'Wisu', context: 'Protéine', distractorsBa: ['Nɔni', 'Koko', 'Wusu'], distractorsFr: ['Viande', 'Riz', 'Igname'] },
    { french: 'Beurre de karité', bariba: 'Yɔwaru', context: 'Produit local', distractorsBa: ['Koko', 'Nim', 'Nɔni'], distractorsFr: ['Riz', 'Eau', 'Viande'] },
    { french: 'Manger la vie (Jouir)', bariba: 'Wɑ̃ɑru di.', context: 'Profiter, être aisé', distractorsBa: ['Koko', 'Nim', 'Nɔni'], distractorsFr: ['Riz', 'Eau', 'Viande'] },
    { french: 'Faire le beurre de karité', bariba: 'Yɔwaru mö.', context: 'Verbe spécifique', distractorsBa: ['Wɑ̃ɑru di.', 'Koko', 'Nim'], distractorsFr: ['Manger', 'Boire', 'Cuisiner'] },
  ],

  sante: [
    { french: 'Tête', bariba: 'Wiir', context: 'Partie du corps', distractorsBa: ['Wiisubu', 'Nũu', 'Siiru'], distractorsFr: ['Yeux', 'Main', 'Pied'] },
    { french: 'Yeux', bariba: 'Wiisubu', context: 'Partie du corps', distractorsBa: ['Wiir', 'Nɔɔ', 'Nũu'], distractorsFr: ['Tête', 'Bouche', 'Main'] },
    { french: 'Main', bariba: 'Nũu', context: 'Partie du corps', distractorsBa: ['Siiru', 'Wiir', 'Nɔɔ'], distractorsFr: ['Pied', 'Tête', 'Bouche'] },
    { french: 'Pied', bariba: 'Siiru', context: 'Partie du corps', distractorsBa: ['Nũu', 'Wiir', 'Wiisubu'], distractorsFr: ['Main', 'Tête', 'Yeux'] },
    { french: 'Bouche', bariba: 'Nɔɔ', context: 'Partie du corps', distractorsBa: ['Wiir', 'Wiisubu', 'Nũu'], distractorsFr: ['Tête', 'Yeux', 'Main'] },
    { french: 'Je suis malade', bariba: 'Na gum mɔ.', context: 'Possession de la maladie', distractorsBa: ['U gum mɔ.', 'Dɔ̃ɔ nɛn mɔ.', 'Nim nɔru ɡɑ nɛn mɔ.'], distractorsFr: ['Il est malade', 'J\'ai sommeil', 'J\'ai soif'] },
    { french: 'Il est malade', bariba: 'U gum mɔ.', context: 'Possession de la maladie', distractorsBa: ['Na gum mɔ.', 'Dɔ̃ɔ nɛn mɔ.', 'Yɑm bɑɑ u.'], distractorsFr: ['Je suis malade', 'J\'ai sommeil', 'Il a faim'] },
    { french: 'Chanceux (Bonne tête)', bariba: 'Wiir wɛ̃rɑ.', context: 'La chance réside dans la tête', distractorsBa: ['Wiir kpi.', 'Nɔɔ dɔɔ.', 'Gɔ̃ru pii.'], distractorsFr: ['Têtu', 'Éloquent', 'Gentil'] },
  ],

  commerce: [
    { french: 'Régler un problème', bariba: 'Gɑri ɡbi.', context: 'Mettre fin à un litige', distractorsBa: ['Wɔbu suɑ.', 'Man wɔbu nɑn.', 'Wɔbɑ wɔri.'], distractorsFr: ['Partir', 'Laisse-moi partir', 'Se disculper'] },
    { french: 'Laver les mains (Se disculper)', bariba: 'Wɔbɑ wɔri.', context: 'Refuser la responsabilité', distractorsBa: ['Gɑri ɡbi.', 'Wɔbu suɑ.', 'Wɑ̃ɑru di.'], distractorsFr: ['Régler un problème', 'Partir', 'Jouir de la vie'] },
    { french: 'Tout le monde', bariba: 'Bɑɑwure.', context: 'Collectif', distractorsBa: ['Fiiko fiiko.', 'Tɔ̃yɑ mɔ.', 'Yen sɔ̃.'], distractorsFr: ['Doucement', 'C\'est la vérité', 'C\'est pourquoi'] },
    { french: 'C\'est la vérité', bariba: 'Tɔ̃yɑ mɔ.', context: 'Affirmation', distractorsBa: ['Bɑɑwure.', 'Yen sɔ̃.', 'Yɑ kpɑ.'], distractorsFr: ['Tout le monde', 'C\'est pourquoi', 'C\'est fini'] },
    { french: 'C\'est pourquoi', bariba: 'Yen sɔ̃.', context: 'Cause', distractorsBa: ['Tɔ̃yɑ mɔ.', 'Bɑɑwure.', 'Tɛ̃.'], distractorsFr: ['C\'est la vérité', 'Tout le monde', 'Maintenant'] },
    { french: 'C\'est fini', bariba: 'Yɑ kpɑ.', context: 'Fin d\'action', distractorsBa: ['Tɛ̃.', 'Yen sɔ̃.', 'Tɔ̃yɑ mɔ.'], distractorsFr: ['Maintenant', 'C\'est pourquoi', 'C\'est la vérité'] },
  ],

  emotions: [
    { french: 'Être calme (Cœur apaisé)', bariba: 'Nimu kpɛm.', context: 'Le calme est froid/frais', distractorsBa: ['Nimu tɛrɑ.', 'Gɔ̃ru sɔ̃.', 'Gɔ̃ru pii.'], distractorsFr: ['Être en colère', 'Être méchant', 'Être gentil'] },
    { french: 'Être en colère', bariba: 'Nimu tɛrɑ.', context: 'La colère est chaude', distractorsBa: ['Nimu kpɛm.', 'Gɔ̃ru sɔ̃.', 'Nimu mɔ kɑ yɛru.'], distractorsFr: ['Être calme', 'Être méchant', 'Avoir le cœur en joie'] },
    { french: 'Ne sois pas en colère', bariba: 'A sɔ̃ɔwɑ nimu.', context: 'Injonction au calme', distractorsBa: ['Nimu tɛrɑ.', 'Nimu kpɛm.', 'Gɔ̃ru pii.'], distractorsFr: ['Être en colère', 'Être calme', 'Être gentil'] },
    { french: 'Mon cœur est en joie', bariba: 'Nimu mɔ kɑ yɛru.', context: 'Joie intérieure', distractorsBa: ['Nimu kpɛm.', 'Nimu tɛrɑ.', 'Gɔ̃ru sɔ̃.'], distractorsFr: ['Être calme', 'Être en colère', 'Être méchant'] },
    { french: 'Être méchant (Cœur noir)', bariba: 'Gɔ̃ru sɔ̃.', context: 'La méchanceté est noire', distractorsBa: ['Gɔ̃ru pii.', 'Nimu tɛrɑ.', 'Nimu kpɛm.'], distractorsFr: ['Être gentil', 'Être en colère', 'Être calme'] },
    { french: 'Être gentil (Cœur blanc)', bariba: 'Gɔ̃ru pii.', context: 'L\'honnêteté est blanche', distractorsBa: ['Gɔ̃ru sɔ̃.', 'Nimu tɛrɑ.', 'Wiir wɛ̃rɑ.'], distractorsFr: ['Être méchant', 'Être en colère', 'Chanceux'] },
    { french: 'Têtu (Tête dure)', bariba: 'Wiir kpi.', context: 'L\'entêtement est une dureté', distractorsBa: ['Wiir wɛ̃rɑ.', 'Nɔɔ dɔɔ.', 'Gɔ̃ru pii.'], distractorsFr: ['Chanceux', 'Éloquent', 'Gentil'] },
    { french: 'Éloquent (Bouche sucrée)', bariba: 'Nɔɔ dɔɔ.', context: 'La parole agréable est sucrée', distractorsBa: ['Wiir kpi.', 'Wiir wɛ̃rɑ.', 'Gɔ̃ru sɔ̃.'], distractorsFr: ['Têtu', 'Chanceux', 'Méchant'] },
    { french: 'J\'ai peur', bariba: 'Wɑ̃ɑ nɑn bɑɑ.', context: 'La peur agit sur le sujet', distractorsBa: ['Na wɑ̃ɑ yɑrɑ.', 'Nimu tɛrɑ.', 'Gɔ̃ru sɔ̃.'], distractorsFr: ['J\'ai honte', 'Être en colère', 'Être méchant'] },
    { french: 'J\'ai honte', bariba: 'Na wɑ̃ɑ yɑrɑ.', context: 'Ressentir la honte', distractorsBa: ['Wɑ̃ɑ nɑn bɑɑ.', 'Nimu kpɛm.', 'Nimu tɛrɑ.'], distractorsFr: ['J\'ai peur', 'Être calme', 'Être en colère'] },
  ],

  etats: [
    { french: 'J\'ai faim', bariba: 'Yɑm bɑɑ man.', context: 'Sujet inversé (Je)', distractorsBa: ['Yɑm bɑɑ nun.', 'Yɑm bɑɑ u.', 'Nim nɔru ɡɑ nɛn mɔ.'], distractorsFr: ['Tu as faim', 'Il a faim', 'J\'ai soif'] },
    { french: 'Tu as faim', bariba: 'Yɑm bɑɑ nun.', context: 'Sujet inversé (Tu)', distractorsBa: ['Yɑm bɑɑ man.', 'Yɑm bɑɑ u.', 'Dɔ̃ɔ wunɛn mɔ.'], distractorsFr: ['J\'ai faim', 'Il a faim', 'Tu as sommeil'] },
    { french: 'Il a faim', bariba: 'Yɑm bɑɑ u.', context: 'Sujet inversé (Il)', distractorsBa: ['Yɑm bɑɑ man.', 'Yɑm bɑɑ nun.', 'U gum mɔ.'], distractorsFr: ['J\'ai faim', 'Tu as faim', 'Il est malade'] },
    { french: 'J\'ai soif', bariba: 'Nim nɔru ɡɑ nɛn mɔ.', context: 'Possession de l\'état (Je)', distractorsBa: ['Nim nɔru ɡɑ wunɛn mɔ.', 'Yɑm bɑɑ man.', 'Dɔ̃ɔ nɛn mɔ.'], distractorsFr: ['Tu as soif', 'J\'ai faim', 'J\'ai sommeil'] },
    { french: 'Tu as soif', bariba: 'Nim nɔru ɡɑ wunɛn mɔ.', context: 'Possession de l\'état (Tu)', distractorsBa: ['Nim nɔru ɡɑ nɛn mɔ.', 'Yɑm bɑɑ nun.', 'Dɔ̃ɔ wunɛn mɔ.'], distractorsFr: ['J\'ai soif', 'Tu as faim', 'Tu as sommeil'] },
    { french: 'J\'ai sommeil', bariba: 'Dɔ̃ɔ nɛn mɔ.', context: 'Possession du sommeil (Je)', distractorsBa: ['Dɔ̃ɔ wunɛn mɔ.', 'Nim nɔru ɡɑ nɛn mɔ.', 'Na gum mɔ.'], distractorsFr: ['Tu as sommeil', 'J\'ai soif', 'Je suis malade'] },
    { french: 'Tu as sommeil', bariba: 'Dɔ̃ɔ wunɛn mɔ.', context: 'Possession du sommeil (Tu)', distractorsBa: ['Dɔ̃ɔ nɛn mɔ.', 'Nim nɔru ɡɑ wunɛn mɔ.', 'Yɑm bɑɑ nun.'], distractorsFr: ['J\'ai sommeil', 'Tu as soif', 'Tu as faim'] },
    { french: 'Je suis malade', bariba: 'Na gum mɔ.', context: 'Possession de la maladie', distractorsBa: ['U gum mɔ.', 'Dɔ̃ɔ nɛn mɔ.', 'Yɑm bɑɑ man.'], distractorsFr: ['Il est malade', 'J\'ai sommeil', 'J\'ai faim'] },
    { french: 'Il est malade', bariba: 'U gum mɔ.', context: 'Maladie (Il)', distractorsBa: ['Na gum mɔ.', 'Yɑm bɑɑ u.', 'Dɔ̃ɔ nɛn mɔ.'], distractorsFr: ['Je suis malade', 'Il a faim', 'J\'ai sommeil'] },
    { french: 'J\'ai peur', bariba: 'Wɑ̃ɑ nɑn bɑɑ.', context: 'La peur agit sur le sujet', distractorsBa: ['Na wɑ̃ɑ yɑrɑ.', 'Nimu tɛrɑ.', 'Na gum mɔ.'], distractorsFr: ['J\'ai honte', 'Être en colère', 'Je suis malade'] },
    { french: 'J\'ai honte', bariba: 'Na wɑ̃ɑ yɑrɑ.', context: 'Ressentir la honte', distractorsBa: ['Wɑ̃ɑ nɑn bɑɑ.', 'Nimu kpɛm.', 'Na gum mɔ.'], distractorsFr: ['J\'ai peur', 'Être calme', 'Je suis malade'] },
  ],

  actions: [
    { french: 'Laisse-moi partir', bariba: 'Man wɔbu nɑn.', context: 'Demande de départ', distractorsBa: ['Wɔbu suɑ.', 'A do !', 'A na !'], distractorsFr: ['Partir', 'Va !', 'Viens !'] },
    { french: 'Partir (Prendre la route)', bariba: 'Wɔbu suɑ.', context: 'Démarrer un voyage', distractorsBa: ['Man wɔbu nɑn.', 'A do !', 'A seewo !'], distractorsFr: ['Laisse-moi partir', 'Va !', 'Lève-toi !'] },
    { french: 'Régler un problème', bariba: 'Gɑri ɡbi.', context: 'Mettre fin à un litige', distractorsBa: ['Wɔbɑ wɔri.', 'Wɔbu suɑ.', 'Wɑ̃ɑru di.'], distractorsFr: ['Se disculper', 'Partir', 'Jouir de la vie'] },
    { french: 'Jouir de la vie', bariba: 'Wɑ̃ɑru di.', context: 'Profiter, être aisé', distractorsBa: ['Gɑri ɡbi.', 'Wɔbu suɑ.', 'Wɔbɑ wɔri.'], distractorsFr: ['Régler un problème', 'Partir', 'Se disculper'] },
    { french: 'Se disculper', bariba: 'Wɔbɑ wɔri.', context: 'Refuser la responsabilité', distractorsBa: ['Gɑri ɡbi.', 'Wɑ̃ɑru di.', 'A do !'], distractorsFr: ['Régler un problème', 'Jouir de la vie', 'Va !'] },
    { french: 'Repositionner le bébé au dos', bariba: 'Yɔwe.', context: 'Verbe spécifique maternel', distractorsBa: ['Yɔwaru mö.', 'A na !', 'A seewo !'], distractorsFr: ['Faire le karité', 'Viens !', 'Lève-toi !'] },
    { french: 'Va !', bariba: 'A do !', context: 'Impératif court', distractorsBa: ['A na !', 'A seewo !', 'Wɔbu suɑ.'], distractorsFr: ['Viens !', 'Lève-toi !', 'Partir'] },
    { french: 'Viens !', bariba: 'A na !', context: 'Impératif court', distractorsBa: ['A do !', 'A seewo !', 'Man wɔbu nɑn.'], distractorsFr: ['Va !', 'Lève-toi !', 'Laisse-moi partir'] },
    { french: 'Lève-toi !', bariba: 'A seewo !', context: 'Impératif court', distractorsBa: ['A do !', 'A na !', 'Wɔbu suɑ.'], distractorsFr: ['Va !', 'Viens !', 'Partir'] },
    { french: 'Voilà, je comprends', bariba: 'Aba, na tuba tɛ̃.', context: 'Prise de conscience', distractorsBa: ['Tɔ̃yɑ mɔ.', 'Yɑ kpɑ.', 'Yen sɔ̃.'], distractorsFr: ['C\'est la vérité', 'C\'est fini', 'C\'est pourquoi'] },
  ],

  temps: [
    { french: 'Maintenant', bariba: 'Tɛ̃.', context: 'Temps présent', distractorsBa: ['Yɑm.', 'Dɑkɑ.', 'Yɑmɔ.'], distractorsFr: ['Aujourd\'hui', 'Hier', 'Demain'] },
    { french: 'Aujourd\'hui', bariba: 'Yɑm.', context: 'Temps présent', distractorsBa: ['Tɛ̃.', 'Dɑkɑ.', 'Yɑmɔ.'], distractorsFr: ['Maintenant', 'Hier', 'Demain'] },
    { french: 'Hier', bariba: 'Dɑkɑ.', context: 'Passé', distractorsBa: ['Yɑm.', 'Tɛ̃.', 'Yɑmɔ.'], distractorsFr: ['Aujourd\'hui', 'Maintenant', 'Demain'] },
    { french: 'Demain', bariba: 'Yɑmɔ.', context: 'Futur', distractorsBa: ['Dɑkɑ.', 'Yɑm.', 'Tɛ̃.'], distractorsFr: ['Hier', 'Aujourd\'hui', 'Maintenant'] },
    { french: 'Doucement', bariba: 'Fiiko fiiko.', context: 'Adverbe redoublé', distractorsBa: ['Tɛ̃.', 'Bɑɑwure.', 'Yen sɔ̃.'], distractorsFr: ['Maintenant', 'Tout le monde', 'C\'est pourquoi'] },
    { french: 'C\'est fini', bariba: 'Yɑ kpɑ.', context: 'Fin d\'action', distractorsBa: ['Tɛ̃.', 'Tɔ̃yɑ mɔ.', 'Yen sɔ̃.'], distractorsFr: ['Maintenant', 'C\'est la vérité', 'C\'est pourquoi'] },
    { french: 'C\'est pourquoi', bariba: 'Yen sɔ̃.', context: 'Cause', distractorsBa: ['Tɔ̃yɑ mɔ.', 'Yɑ kpɑ.', 'Tɛ̃.'], distractorsFr: ['C\'est la vérité', 'C\'est fini', 'Maintenant'] },
    { french: 'C\'est la vérité', bariba: 'Tɔ̃yɑ mɔ.', context: 'Affirmation', distractorsBa: ['Yen sɔ̃.', 'Yɑ kpɑ.', 'Bɑɑwure.'], distractorsFr: ['C\'est pourquoi', 'C\'est fini', 'Tout le monde'] },
    { french: 'Tout le monde', bariba: 'Bɑɑwure.', context: 'Collectif', distractorsBa: ['Fiiko fiiko.', 'Tɔ̃yɑ mɔ.', 'Yɑ kpɑ.'], distractorsFr: ['Doucement', 'C\'est la vérité', 'C\'est fini'] },
    { french: 'Au commencement', bariba: 'Sɑnɑm mɛ...', context: 'Formule narrative', distractorsBa: ['Tɛ̃.', 'Dɑkɑ.', 'Yɑmɔ.'], distractorsFr: ['Maintenant', 'Hier', 'Demain'] },
  ],

  proverbes: [
    { french: 'L\'union fait la force', bariba: 'Nɔɔ tiɑ.', context: 'Unité (Une seule bouche)', distractorsBa: ['Wɔmun sira tura, bu ka ge bɔke.', 'Wi u ... kĩ, u mɔɔ.', 'Tɔ̃yɑ mɔ.'], distractorsFr: ['L\'autonomie suffit', 'Celui qui veut, qu\'il prenne', 'C\'est la vérité'] },
    { french: 'L\'autonomie suffit', bariba: 'Wɔmun sira tura, bu ka ge bɔke.', context: 'Se suffire à soi-même', distractorsBa: ['Nɔɔ tiɑ.', 'Wi u ... kĩ, u mɔɔ.', 'Gusunɔ bɑkɑ.'], distractorsFr: ['L\'union fait la force', 'Qui veut prenne', 'Dieu est grand'] },
    { french: 'Celui qui veut, qu\'il prenne', bariba: 'Wi u ... kĩ, u mɔɔ.', context: 'Libre arbitre', distractorsBa: ['Nɔɔ tiɑ.', 'Wɔmun sira tura, bu ka ge bɔke.', 'Gusunɔ u n wure.'], distractorsFr: ['L\'union fait la force', 'L\'autonomie suffit', 'Si Dieu le veut'] },
    { french: 'Dieu te bénisse', bariba: 'Gusunɔ u nun yɛri.', context: 'Bénédiction', distractorsBa: ['Gusunɔ u n wure.', 'Gusunɔn durom.', 'Gusunɔ bɑkɑ.'], distractorsFr: ['Si Dieu le veut', 'Grâce à Dieu', 'Dieu est grand'] },
    { french: 'Si Dieu le veut', bariba: 'Gusunɔ u n wure.', context: 'Conditionnel futur', distractorsBa: ['Gusunɔ u nun yɛri.', 'Gusunɔn durom.', 'Gusunɔ bɑkɑ.'], distractorsFr: ['Dieu te bénisse', 'Grâce à Dieu', 'Dieu est grand'] },
    { french: 'Grâce à Dieu', bariba: 'Gusunɔn durom.', context: 'Gratitude', distractorsBa: ['Gusunɔ u nun yɛri.', 'Gusunɔ u n wure.', 'Gusunɔ bɑkɑ.'], distractorsFr: ['Dieu te bénisse', 'Si Dieu le veut', 'Dieu est grand'] },
    { french: 'Dieu est grand', bariba: 'Gusunɔ bɑkɑ.', context: 'Exclamation', distractorsBa: ['Gusunɔn durom.', 'Gusunɔ u n wure.', 'Gusunɔ u nun yɛri.'], distractorsFr: ['Grâce à Dieu', 'Si Dieu le veut', 'Dieu te bénisse'] },
    { french: 'Esprit Saint', bariba: 'Hunde Dɛɛro.', context: 'Terme biblique', distractorsBa: ['Nim wɑ̃ɑruɡim.', 'Gusunɔ bɑkɑ.', 'Sɑnɑm mɛ...'], distractorsFr: ['Eau de la vie', 'Dieu est grand', 'Au commencement'] },
    { french: 'Eau de la vie', bariba: 'Nim wɑ̃ɑruɡim.', context: 'Terme biblique', distractorsBa: ['Hunde Dɛɛro.', 'Gusunɔ bɑkɑ.', 'Sɑnɑm mɛ...'], distractorsFr: ['Esprit Saint', 'Dieu est grand', 'Au commencement'] },
    { french: 'Au commencement', bariba: 'Sɑnɑm mɛ...', context: 'Formule narrative', distractorsBa: ['Hunde Dɛɛro.', 'Nim wɑ̃ɑruɡim.', 'Nɔɔ tiɑ.'], distractorsFr: ['Esprit Saint', 'Eau de la vie', 'L\'union fait la force'] },
  ],
};

// Utilitaire pour mélanger un tableau
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Construire les options pour un exercice
export function buildOptions(exercise: Exercise, direction: 'fr_to_bariba' | 'bariba_to_french'): string[] {
  if (direction === 'fr_to_bariba') {
    // Question en français, réponses en bariba
    return shuffleArray([exercise.bariba, ...exercise.distractorsBa]);
  } else {
    // Question en bariba, réponses en français
    return shuffleArray([exercise.french, ...exercise.distractorsFr]);
  }
}

// Obtenir la bonne réponse
export function getCorrectAnswer(exercise: Exercise, direction: 'fr_to_bariba' | 'bariba_to_french'): string {
  return direction === 'fr_to_bariba' ? exercise.bariba : exercise.french;
}

// Obtenir la question
export function getQuestion(exercise: Exercise, direction: 'fr_to_bariba' | 'bariba_to_french'): string {
  return direction === 'fr_to_bariba' ? exercise.french : exercise.bariba;
}
