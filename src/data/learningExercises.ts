// ═══════════════════════════════════════════════════════════════════
// Exercices bidirectionnels Bariba ↔ Français - Version enrichie
// Sources: idiomes-2.json (69), phrase_fr_bariba.json (13K),
// Traducteur_fr_bariba_complet-4.json (36K),
// bariba_fr_cleaned_dataset.json (78K), dico-6.pdf (dictionnaire complet)
// Total: 300+ exercices sur 14 thèmes
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
  { id: 'salutations', name: { fr: 'Salutations & Politesse', br: 'Sɑnɑɑru kɑ bɛnɛɛru' }, icon: '👋', color: '#3B82F6', lessonsCount: 25, xpPerLesson: 100, difficulty: 'easy' },
  { id: 'famille', name: { fr: 'Famille & Relations', br: 'Dɛnu kɑ bɛɛkɑɑru' }, icon: '👨‍👩‍👧‍👦', color: '#EC4899', lessonsCount: 20, xpPerLesson: 150, difficulty: 'easy' },
  { id: 'nourriture', name: { fr: 'Nourriture & Boissons', br: 'Diru kɑ nɔɔru' }, icon: '🍲', color: '#F97316', lessonsCount: 20, xpPerLesson: 120, difficulty: 'easy' },
  { id: 'sante', name: { fr: 'Santé & Corps', br: 'Dɔɔru kɑ kuɑru' }, icon: '🏥', color: '#10B981', lessonsCount: 20, xpPerLesson: 130, difficulty: 'medium' },
  { id: 'commerce', name: { fr: 'Commerce & Argent', br: 'Sũukuuru kɑ wuri' }, icon: '💰', color: '#EAB308', lessonsCount: 15, xpPerLesson: 110, difficulty: 'medium' },
  { id: 'transport', name: { fr: 'Transport & Direction', br: 'Kɛkɛnu kɑ swɑɑ' }, icon: '🚗', color: '#14B8A6', lessonsCount: 15, xpPerLesson: 120, difficulty: 'medium' },
  { id: 'travail', name: { fr: 'Travail & Métiers', br: 'Sɔmburu kɑ sɔmɔnu' }, icon: '💼', color: '#64748B', lessonsCount: 15, xpPerLesson: 130, difficulty: 'medium' },
  { id: 'emotions', name: { fr: 'Émotions & Sentiments', br: 'Wɔ̃ɔ̃bɑɑru kɑ fɛɛkɑɑru' }, icon: '😊', color: '#EF4444', lessonsCount: 15, xpPerLesson: 80, difficulty: 'medium' },
  { id: 'etats', name: { fr: 'États & Besoins', br: 'Kpindu kɑ wururenu' }, icon: '💭', color: '#8B5CF6', lessonsCount: 15, xpPerLesson: 90, difficulty: 'medium' },
  { id: 'actions', name: { fr: 'Actions & Verbes', br: 'Korenu kɑ wurɑru' }, icon: '🏃', color: '#06B6D4', lessonsCount: 15, xpPerLesson: 100, difficulty: 'medium' },
  { id: 'nature', name: { fr: 'Nature & Animaux', br: 'Temiru kɑ sɑbenu' }, icon: '🌿', color: '#22C55E', lessonsCount: 15, xpPerLesson: 110, difficulty: 'medium' },
  { id: 'temps', name: { fr: 'Temps & Connecteurs', br: 'Wɑɑru kɑ kpɑrɑɑru' }, icon: '⏰', color: '#6366F1', lessonsCount: 15, xpPerLesson: 90, difficulty: 'medium' },
  { id: 'religion', name: { fr: 'Religion & Sagesse', br: 'Gusunɔ kɑ tuburu' }, icon: '🙏', color: '#A855F7', lessonsCount: 15, xpPerLesson: 150, difficulty: 'hard' },
  { id: 'proverbes', name: { fr: 'Proverbes & Culture', br: 'Yɔɔgbeni kɑ wɑɑkuru' }, icon: '📜', color: '#D97706', lessonsCount: 15, xpPerLesson: 200, difficulty: 'expert' },
];

// ═══════════════════════════════════════════════════════════════════
// Exercices par thème - chaque exercice est bidirectionnel
// ═══════════════════════════════════════════════════════════════════
export const EXERCISES: Record<string, Exercise[]> = {
  // ─────────────────────────────────────────────────────────────────
  // SALUTATIONS & POLITESSE (25 exercices)
  // Sources: idiomes-2.json IDM_SAL_001-015, phrase_fr_bariba.json, dico-6.pdf
  // ─────────────────────────────────────────────────────────────────
  salutations: [
    { french: 'Bonne arrivée !', bariba: 'Aagu wune ka weru.', context: 'Salutation d\'accueil standard', distractorsBa: ['Yeegu ?', 'A kɔ kɑ sɔmburu.', 'Yɑm wɔ̃kurɑ ?'], distractorsFr: ['Comment vas-tu ?', 'Bon courage', 'Bonne nuit'] },
    { french: 'Salut (à un plus jeune)', bariba: 'Aagu.', context: 'Salutation informelle ou hiérarchique', distractorsBa: ['Yeegu ?', 'Aagu wune ka weru.', 'Nɑ kɑ̃i nin tɛriɑ.'], distractorsFr: ['Au revoir', 'Merci', 'Bonjour'] },
    { french: 'Comment vas-tu ?', bariba: 'Yeegu ?', context: 'Salutation très courante', distractorsBa: ['Aagu.', 'A kpunɑ n dɔɔ ?', 'Yɑm wɔ̃kurɑ ?'], distractorsFr: ['Bonne arrivée !', 'As-tu bien dormi ?', 'Bonne nuit'] },
    { french: 'Bon courage', bariba: 'A kɔ kɑ sɔmburu.', context: 'Encouragement pour quelqu\'un qui travaille', distractorsBa: ['Yeegu ?', 'Aagu.', 'Nɑ kɑ̃i nin tɛriɑ.'], distractorsFr: ['Comment vas-tu ?', 'Bonne nuit', 'Merci beaucoup'] },
    { french: 'As-tu bien dormi ?', bariba: 'A kpunɑ n dɔɔ ?', context: 'Salutation obligatoire le matin', distractorsBa: ['Yeegu ?', 'Yɑm wɔ̃kurɑ ?', 'Aagu.'], distractorsFr: ['Comment vas-tu ?', 'Bonne nuit', 'La maison va bien ?'] },
    { french: 'La maison s\'est-elle bien réveillée ?', bariba: 'Yɛnu ɡɑ yɑri kɑ ɑlɑɑfiɑ ?', context: 'Demander des nouvelles de la famille', distractorsBa: ['A kpunɑ n dɔɔ ?', 'Yeegu ?', 'Yɑm wɔ̃kurɑ ?'], distractorsFr: ['As-tu bien dormi ?', 'Bonne soirée', 'Comment vas-tu ?'] },
    { french: 'Comment est la soirée ?', bariba: 'Yɑm wɔ̃kurɑ ?', context: 'Salutation de fin d\'après-midi', distractorsBa: ['A kpunɑ n dɔɔ ?', 'Yeegu ?', 'Aagu.'], distractorsFr: ['Bonjour', 'Bonne nuit', 'À demain'] },
    { french: 'Bonne nuit', bariba: 'A kpunɑ kɑ ɑlɑɑfiɑ.', context: 'Souhait avant de dormir', distractorsBa: ['Yɑm wɔ̃kurɑ ?', 'Yɑmɔ wɑrɑ.', 'Aagu.'], distractorsFr: ['À demain', 'Bonne soirée', 'Bonjour'] },
    { french: 'À demain', bariba: 'Yɑmɔ wɑrɑ.', context: 'Prendre congé pour la journée', distractorsBa: ['A kpunɑ kɑ ɑlɑɑfiɑ.', 'Yeegu ?', 'I turi baani.'], distractorsFr: ['Bonne nuit', 'Bon voyage', 'Merci'] },
    { french: 'Merci beaucoup', bariba: 'Nɑ kɑ̃i nin tɛriɑ.', context: 'Remerciement appuyé', distractorsBa: ['Kɑsɔru kun mɔ.', 'A kɔ kɑ sɔmburu.', 'Yeegu ?'], distractorsFr: ['De rien', 'Bon courage', 'Pardon'] },
    { french: 'De rien (Pas de faute)', bariba: 'Kɑsɔru kun mɔ.', context: 'Réponse au remerciement', distractorsBa: ['Nɑ kɑ̃i nin tɛriɑ.', 'Aagu.', 'Yeegu ?'], distractorsFr: ['Merci beaucoup', 'Pardon', 'Bonjour'] },
    { french: 'Pardon (Excuse-moi)', bariba: 'Nɑ nɛn wɔrɑ wɑ̃i.', context: 'Demande d\'excuse', distractorsBa: ['Kɑsɔru kun mɔ.', 'Nɑ kɑ̃i nin tɛriɑ.', 'Aagu.'], distractorsFr: ['Merci', 'De rien', 'Bonjour'] },
    { french: 'Bon voyage', bariba: 'I turi baani.', context: 'Souhait pour le voyageur', distractorsBa: ['Yɑmɔ wɑrɑ.', 'A kpunɑ kɑ ɑlɑɑfiɑ.', 'Yeegu ?'], distractorsFr: ['À demain', 'Bonne nuit', 'Merci'] },
    { french: 'Hé Chef ! (Respect)', bariba: 'Ãa Sunɔ !', context: 'Interpellation respectueuse', distractorsBa: ['Aagu.', 'Yeegu ?', 'A kɔ kɑ sɔmburu.'], distractorsFr: ['Salut', 'Bonjour', 'Merci'] },
    { french: 'Tu es déjà venu !', bariba: 'Aa, ana kɔ.', context: 'Surprise à l\'arrivée', distractorsBa: ['Aagu.', 'Yeegu ?', 'Aagu wune ka weru.'], distractorsFr: ['Bonjour', 'Au revoir', 'Merci'] },
    // Nouvelles entrées extraites des fichiers
    { french: 'Chef, excuse-moi', bariba: 'Sunɔ, a man ìsa kuo.', context: 'Demande formelle d\'excuse au chef', distractorsBa: ['Nɑ nɛn wɔrɑ wɑ̃i.', 'Aagu.', 'A kɔ kɑ sɔmburu.'], distractorsFr: ['Pardon', 'Bonjour chef', 'Merci chef'] },
    { french: 'Merci pour la conversation', bariba: 'Bɛsɛ ka faagi.', context: 'Salutation après une discussion', distractorsBa: ['Bɛsɛ ka sãkubu.', 'Nɑ kɑ̃i nin tɛriɑ.', 'Aagu.'], distractorsFr: ['Merci pour la compagnie', 'Merci beaucoup', 'Au revoir'] },
    { french: 'Merci pour la compagnie', bariba: 'Bɛsɛ ka sãkubu.', context: 'Remerciement pour le temps passé ensemble', distractorsBa: ['Bɛsɛ ka faagi.', 'A kɔ kɑ sɔmburu.', 'Kɑsɔru kun mɔ.'], distractorsFr: ['Merci pour la conversation', 'Bon courage', 'De rien'] },
    { french: 'Il m\'a dit bonjour avant de sortir', bariba: 'U man bɔɔsia u sere yara.', context: 'Salutation avant de partir', distractorsBa: ['Aagu wune ka weru.', 'Yɑmɔ wɑrɑ.', 'I turi baani.'], distractorsFr: ['Il est arrivé', 'Il est parti sans rien dire', 'Il m\'a remercié'] },
    { french: 'Salut pour la veillée', bariba: 'Bɛɛ ka sãkiru.', context: 'Salutation de soirée partagée', distractorsBa: ['Bɛsɛ ka faagi.', 'Yɑm wɔ̃kurɑ ?', 'A kpunɑ kɑ ɑlɑɑfiɑ.'], distractorsFr: ['Bonne soirée', 'Bonne nuit', 'Bonne conversation'] },
    { french: 'Merci pour ton cadeau', bariba: 'Na wunɛn kɛ̃ɛte siara.', context: 'Remerciement pour un présent', distractorsBa: ['Nɑ kɑ̃i nin tɛriɑ.', 'Kɑsɔru kun mɔ.', 'A kɔ kɑ sɔmburu.'], distractorsFr: ['Merci beaucoup', 'De rien', 'Bon courage'] },
    { french: 'Il est venu te demander pardon', bariba: 'U na ù nun suuru kana.', context: 'Demande de pardon', distractorsBa: ['Nɑ nɛn wɔrɑ wɑ̃i.', 'Sunɔ, a man ìsa kuo.', 'Aagu.'], distractorsFr: ['Il a demandé la permission', 'Il est venu saluer', 'Il a dit merci'] },
    { french: 'Dans le monde, il faut faire preuve de patience', bariba: 'Yandunia sere suuru.', context: 'Conseil de patience', distractorsBa: ['Fiiko fiiko.', 'Tɔ̃yɑ mɔ.', 'Yen sɔ̃.'], distractorsFr: ['Tout arrive à point', 'La vie est belle', 'C\'est la vérité'] },
    { french: 'Non', bariba: 'Aawo.', context: 'Négation simple', distractorsBa: ['Aa, ana kɔ.', 'Aagu.', 'Yeegu ?'], distractorsFr: ['Oui', 'Peut-être', 'Salut'] },
    { french: 'Bienvenue (salut du retour)', bariba: 'Bɛɛ ka weru.', context: 'Salutation pour ceux qui reviennent', distractorsBa: ['Aagu wune ka weru.', 'I turi baani.', 'Yɑmɔ wɑrɑ.'], distractorsFr: ['Bonne arrivée', 'Bon voyage', 'À demain'] },
  ],

  // ─────────────────────────────────────────────────────────────────
  // FAMILLE & RELATIONS (20 exercices)
  // Sources: idiomes-2.json IDM_SOC_066-069, dictionnaire, phrases
  // ─────────────────────────────────────────────────────────────────
  famille: [
    { french: 'Père', bariba: 'Baa', context: 'Famille nucléaire', distractorsBa: ['Yaa', 'Bii', 'Suuru'], distractorsFr: ['Mère', 'Enfant', 'Frère'] },
    { french: 'Mère', bariba: 'Yaa', context: 'Famille nucléaire', distractorsBa: ['Baa', 'Bii', 'Yɛɛru'], distractorsFr: ['Père', 'Enfant', 'Sœur'] },
    { french: 'Enfant', bariba: 'Bii', context: 'Famille nucléaire', distractorsBa: ['Baa', 'Yaa', 'Suuru'], distractorsFr: ['Père', 'Mère', 'Frère'] },
    { french: 'Frère', bariba: 'Suuru', context: 'Fratrie', distractorsBa: ['Yɛɛru', 'Bii', 'Baa'], distractorsFr: ['Sœur', 'Enfant', 'Père'] },
    { french: 'Oncle paternel', bariba: 'Bɑɑ kpe.', context: 'Petit père', distractorsBa: ['Mɛrɔ kpe.', 'Nɛn wɔ̃ɔ.', 'Nɛn kurɔ.'], distractorsFr: ['Tante maternelle', 'Mon mari', 'Ma femme'] },
    { french: 'Tante maternelle', bariba: 'Mɛrɔ kpe.', context: 'Petite mère', distractorsBa: ['Bɑɑ kpe.', 'Nɛn wɔ̃ɔ.', 'Nɛn kurɔ.'], distractorsFr: ['Oncle paternel', 'Mon mari', 'Ma femme'] },
    { french: 'Mon mari', bariba: 'Nɛn wɔ̃ɔ.', context: 'Relation conjugale', distractorsBa: ['Nɛn kurɔ.', 'Bɑɑ kpe.', 'Mɛrɔ kpe.'], distractorsFr: ['Ma femme', 'Oncle paternel', 'Tante maternelle'] },
    { french: 'Ma femme', bariba: 'Nɛn kurɔ.', context: 'Relation conjugale', distractorsBa: ['Nɛn wɔ̃ɔ.', 'Bɑɑ kpe.', 'Mɛrɔ kpe.'], distractorsFr: ['Mon mari', 'Oncle paternel', 'Tante maternelle'] },
    // Nouvelles entrées
    { french: 'Bonjour papa', bariba: 'Kpuna n do baa.', context: 'Salutation du matin au père', distractorsBa: ['Kpuna n do yaa.', 'Aagu baa.', 'Yeegu baa ?'], distractorsFr: ['Bonjour maman', 'Salut papa', 'Comment vas-tu papa ?'] },
    { french: 'Grand frère', bariba: 'Mɔɔ', context: 'Aîné masculin', distractorsBa: ['Suuru', 'Bii', 'Baa'], distractorsFr: ['Petit frère', 'Enfant', 'Père'] },
    { french: 'C\'est le papa de Boni qui a envoyé un enfant', bariba: 'Bɔnin baawa u bii gɔrima.', context: 'Relation père-enfant', distractorsBa: ['Biin baa u na.', 'Yaa u bii gɔrima.', 'Suuru u na.'], distractorsFr: ['C\'est la mère qui a envoyé l\'enfant', 'L\'enfant est parti seul', 'Le frère est arrivé'] },
    { french: 'La dame a fait des jumeaux', bariba: 'Sika kurɔ wi u mara.', context: 'Naissance de jumeaux', distractorsBa: ['Kurɔ wi u bii mɔ.', 'Yaa u bii sua.', 'Bii wi u na.'], distractorsFr: ['La dame a un enfant', 'La mère est partie', 'L\'enfant est né'] },
    { french: 'Cet enfant nous respecte', bariba: 'Bii wi, u sun bɛ̀ɛrɛ doke.', context: 'Respect envers les aînés', distractorsBa: ['Bii wi u sɔmburu de.', 'U sun siara.', 'Bii wi u doona.'], distractorsFr: ['Cet enfant travaille bien', 'Il nous remercie', 'Cet enfant est parti'] },
    { french: 'Il y a du monde dans la maison de Bio', bariba: 'Biɔn yɛnuɔ tɔmbu ba yibaawa.', context: 'Maison pleine de monde', distractorsBa: ['Biɔn yɛnu ya kpã.', 'Biɔ u doona.', 'Yɛnu ya dɔ̃ɔ.'], distractorsFr: ['La maison de Bio est vide', 'Bio est parti', 'La maison brûle'] },
    { french: 'J\'ai de la sympathie pour mes enfants', bariba: 'Na nɛn bibun ayo mö.', context: 'Amour parental', distractorsBa: ['Na bii mɔ.', 'Nɛn bibu ba doona.', 'Na nɛn kurɔ kã.'], distractorsFr: ['J\'ai des enfants', 'Mes enfants sont partis', 'J\'aime ma femme'] },
    { french: 'Les femmes portent des perles aux hanches', bariba: 'Tɔn kurɔbu ba rà bɛ̃ɛ dewa.', context: 'Tradition vestimentaire féminine', distractorsBa: ['Kurɔbu ba sɔmburu de.', 'Tɔmbu ba na.', 'Bibu ba yaamɔ.'], distractorsFr: ['Les femmes travaillent', 'Les gens arrivent', 'Les enfants jouent'] },
    { french: 'Maison, foyer', bariba: 'Yɛnu', context: 'Domicile familial', distractorsBa: ['Diru', 'Gberu', 'Wuu'], distractorsFr: ['Case', 'Champ', 'Village'] },
    { french: 'Village', bariba: 'Wuu', context: 'Communauté locale', distractorsBa: ['Yɛnu', 'Diru', 'Gberu'], distractorsFr: ['Maison', 'Case', 'Champ'] },
    { french: 'La mère allaite son enfant', bariba: 'Bii mɛro u win bii bɔm kɛ̃mɔ.', context: 'Allaitement maternel', distractorsBa: ['Yaa u bii wa.', 'Kurɔ u dĩa kua.', 'Bii u dɔɔ.'], distractorsFr: ['La mère regarde l\'enfant', 'La femme cuisine', 'L\'enfant dort'] },
    { french: 'L\'enfant survivant (après décès)', bariba: 'Abiiku', context: 'Enfant qui survit après frères décédés', distractorsBa: ['Bii', 'Suuru', 'Mɔɔ'], distractorsFr: ['Enfant', 'Frère', 'Grand frère'] },
  ],

  // ─────────────────────────────────────────────────────────────────
  // NOURRITURE & BOISSONS (20 exercices)
  // Sources: dictionnaire, phrase_fr_bariba.json, Traducteur
  // ─────────────────────────────────────────────────────────────────
  nourriture: [
    { french: 'Riz', bariba: 'Koko', context: 'Aliment de base', distractorsBa: ['Wusu', 'Nim', 'Nɔni'], distractorsFr: ['Igname', 'Eau', 'Viande'] },
    { french: 'Igname', bariba: 'Wusu', context: 'Aliment de base', distractorsBa: ['Koko', 'Nim', 'Wisu'], distractorsFr: ['Riz', 'Eau', 'Poisson'] },
    { french: 'Eau', bariba: 'Nim', context: 'Boisson essentielle', distractorsBa: ['Koko', 'Wusu', 'Nɔni'], distractorsFr: ['Riz', 'Igname', 'Viande'] },
    { french: 'Viande', bariba: 'Nɔni', context: 'Protéine animale', distractorsBa: ['Wisu', 'Koko', 'Nim'], distractorsFr: ['Poisson', 'Riz', 'Eau'] },
    { french: 'Poisson', bariba: 'Wisu', context: 'Protéine de rivière', distractorsBa: ['Nɔni', 'Koko', 'Wusu'], distractorsFr: ['Viande', 'Riz', 'Igname'] },
    { french: 'Beurre de karité', bariba: 'Yɔwaru', context: 'Produit local traditionnel', distractorsBa: ['Bɔm', 'Nim', 'Koko'], distractorsFr: ['Lait', 'Eau', 'Riz'] },
    { french: 'Gombo', bariba: 'Abo', context: 'Légume pour les sauces', distractorsBa: ['Wusu', 'Koko', 'Nɔni'], distractorsFr: ['Igname', 'Riz', 'Viande'] },
    { french: 'Le gombo est bon avec l\'igname pilée', bariba: 'Abonu ka sɔkura nu rà n do.', context: 'Plat traditionnel', distractorsBa: ['Na koko di.', 'Nim mu do.', 'Nɔni ya do.'], distractorsFr: ['Le riz est bon', 'L\'eau est fraîche', 'La viande est bonne'] },
    { french: 'Lait', bariba: 'Bɔm', context: 'Produit laitier', distractorsBa: ['Nim', 'Koko', 'Nɔni'], distractorsFr: ['Eau', 'Riz', 'Viande'] },
    { french: 'S\'il y a du lait, je vais boire la bouillie', bariba: 'Bom mùn wãa, kon soru nɔ.', context: 'Bouillie au lait', distractorsBa: ['Na nim nɔ.', 'Na koko di.', 'Na nɔni di.'], distractorsFr: ['Je bois de l\'eau', 'Je mange du riz', 'Je mange de la viande'] },
    { french: 'Le vin de palme est agréable à boire', bariba: 'Bam ya nɔrubu do.', context: 'Boisson traditionnelle', distractorsBa: ['Nim mu do.', 'Bom mu do.', 'Soru ya do.'], distractorsFr: ['L\'eau est bonne', 'Le lait est bon', 'La bouillie est bonne'] },
    { french: 'Banane', bariba: 'Agɛdɛ', context: 'Fruit tropical', distractorsBa: ['Abo', 'Koko', 'Wusu'], distractorsFr: ['Gombo', 'Riz', 'Igname'] },
    { french: 'Cette banane est bonne', bariba: 'Agɛdɛ ye ya do.', context: 'Goût d\'un fruit', distractorsBa: ['Koko ye ya do.', 'Nim mu do.', 'Abo ye ya do.'], distractorsFr: ['Ce riz est bon', 'Cette eau est bonne', 'Ce gombo est bon'] },
    { french: 'Ouvre ta bouche', bariba: 'A nɔɔ baayo.', context: 'Instruction pour manger/médecine', distractorsBa: ['A nim nɔ.', 'A dĩa di.', 'A seewo.'], distractorsFr: ['Bois de l\'eau', 'Mange', 'Lève-toi'] },
    { french: 'J\'ai mangé de la chair', bariba: 'Na yaa baasi tema.', context: 'Manger de la viande', distractorsBa: ['Na koko di.', 'Na nim nɔ.', 'Na wusu di.'], distractorsFr: ['J\'ai mangé du riz', 'J\'ai bu de l\'eau', 'J\'ai mangé de l\'igname'] },
    { french: 'Fris le gari avec l\'huile de palme', bariba: 'A gaari sɔnwɔ ka bãa gum.', context: 'Instruction de cuisine', distractorsBa: ['A koko kua.', 'A nim gãki.', 'A nɔni sawa.'], distractorsFr: ['Prépare le riz', 'Recueille de l\'eau', 'Cuisine la viande'] },
    { french: 'Marché', bariba: 'Aburu', context: 'Lieu d\'échange commercial', distractorsBa: ['Yɛnu', 'Wuu', 'Gberu'], distractorsFr: ['Maison', 'Village', 'Champ'] },
    { french: 'On vend des gombos au marché', bariba: 'Ba abonu dɔramɔ aburɔ.', context: 'Commerce de légumes', distractorsBa: ['Ba koko dɔramɔ.', 'Ba nɔni dɔramɔ.', 'Ba nim dɔramɔ.'], distractorsFr: ['On vend du riz', 'On vend de la viande', 'On vend de l\'eau'] },
    { french: 'La nourrice a préparé de la bouillie', bariba: 'Bii mɛro u soru bɛre.', context: 'Alimentation du nourrisson', distractorsBa: ['Yaa u dĩa kua.', 'Kurɔ u nim wa.', 'Baa u koko di.'], distractorsFr: ['La mère a cuisiné', 'La femme a puisé de l\'eau', 'Le père a mangé du riz'] },
    { french: 'Nourriture, repas', bariba: 'Dĩa', context: 'Terme général pour la nourriture', distractorsBa: ['Nim', 'Koko', 'Nɔni'], distractorsFr: ['Eau', 'Riz', 'Viande'] },
  ],

  // ─────────────────────────────────────────────────────────────────
  // SANTÉ & CORPS (20 exercices)
  // Sources: idiomes-2.json IDM_EMO_022-024, dictionnaire, phrases
  // ─────────────────────────────────────────────────────────────────
  sante: [
    { french: 'Tête', bariba: 'Wiir', context: 'Partie du corps', distractorsBa: ['Wiisubu', 'Nũu', 'Siiru'], distractorsFr: ['Yeux', 'Main', 'Pied'] },
    { french: 'Yeux', bariba: 'Wiisubu', context: 'Organe de la vue', distractorsBa: ['Wiir', 'Nɔɔ', 'Nũu'], distractorsFr: ['Tête', 'Bouche', 'Main'] },
    { french: 'Main', bariba: 'Nũu', context: 'Partie du corps', distractorsBa: ['Siiru', 'Wiir', 'Nɔɔ'], distractorsFr: ['Pied', 'Tête', 'Bouche'] },
    { french: 'Pied', bariba: 'Siiru', context: 'Partie du corps', distractorsBa: ['Nũu', 'Wiir', 'Wiisubu'], distractorsFr: ['Main', 'Tête', 'Yeux'] },
    { french: 'Bouche', bariba: 'Nɔɔ', context: 'Partie du corps', distractorsBa: ['Wiir', 'Wiisubu', 'Nũu'], distractorsFr: ['Tête', 'Yeux', 'Main'] },
    { french: 'Aisselle', bariba: 'Búu bɔkuɔ', context: 'Partie du corps', distractorsBa: ['Nũu', 'Siiru', 'Wiir'], distractorsFr: ['Main', 'Pied', 'Tête'] },
    { french: 'Cache-le sous ton aisselle', bariba: 'A yè bɛrio wunɛn búu bɔkuɔ.', context: 'Instruction corporelle', distractorsBa: ['A yè doke nũu sɔɔ.', 'A wiir suura.', 'A siiru doke.'], distractorsFr: ['Mets-le dans ta main', 'Baisse la tête', 'Mets tes chaussures'] },
    { french: 'Chanceux (Bonne tête)', bariba: 'Wiir wɛ̃rɑ.', context: 'La chance réside dans la tête', distractorsBa: ['Wiir kpi.', 'Nɔɔ dɔɔ.', 'Gɔ̃ru pii.'], distractorsFr: ['Têtu', 'Éloquent', 'Gentil'] },
    { french: 'Têtu (Tête dure)', bariba: 'Wiir kpi.', context: 'L\'entêtement est une dureté de la tête', distractorsBa: ['Wiir wɛ̃rɑ.', 'Nɔɔ dɔɔ.', 'Gɔ̃ru sɔ̃.'], distractorsFr: ['Chanceux', 'Éloquent', 'Méchant'] },
    { french: 'Bouche sucrée (Éloquent)', bariba: 'Nɔɔ dɔɔ.', context: 'La parole agréable est sucrée', distractorsBa: ['Wiir kpi.', 'Wiir wɛ̃rɑ.', 'Gɔ̃ru pii.'], distractorsFr: ['Têtu', 'Chanceux', 'Gentil'] },
    { french: 'Je suis malade', bariba: 'Na gum mɔ.', context: 'Possession de la maladie (Je)', distractorsBa: ['U gum mɔ.', 'Dɔ̃ɔ nɛn mɔ.', 'Nim nɔru ɡɑ nɛn mɔ.'], distractorsFr: ['Il est malade', 'J\'ai sommeil', 'J\'ai soif'] },
    { french: 'Il est malade', bariba: 'U gum mɔ.', context: 'Possession de la maladie (Il)', distractorsBa: ['Na gum mɔ.', 'Dɔ̃ɔ nɛn mɔ.', 'Yɑm bɑɑ u.'], distractorsFr: ['Je suis malade', 'J\'ai sommeil', 'Il a faim'] },
    { french: 'Cet enfant souffre des oreillons', bariba: 'Agirigirina bii wi u barɔ.', context: 'Maladie infantile', distractorsBa: ['Bii wi u gum mɔ.', 'Bii wi u dɔɔ.', 'Bii wi u wasira.'], distractorsFr: ['Cet enfant est malade', 'Cet enfant dort', 'Cet enfant est fatigué'] },
    { french: 'Boni souffre de la dysenterie', bariba: 'Bɔni u bandu bandu barɔ.', context: 'Maladie intestinale', distractorsBa: ['Bɔni u gum mɔ.', 'Bɔni u wasira.', 'Bɔni u dɔɔ.'], distractorsFr: ['Boni est malade', 'Boni est fatigué', 'Boni dort'] },
    { french: 'Tu t\'es blessé ?', bariba: 'A tii mɛɛra kua ?', context: 'Salutation quand quelqu\'un se blesse', distractorsBa: ['A gum mɔ ?', 'A wasira ?', 'A dɔɔ ?'], distractorsFr: ['Tu es malade ?', 'Tu es fatigué ?', 'Tu dors ?'] },
    { french: 'Santé, bien-être', bariba: 'Alaafia', context: 'État de bonne santé', distractorsBa: ['Gum', 'Wasiru', 'Dɔ̃ɔ'], distractorsFr: ['Maladie', 'Fatigue', 'Sommeil'] },
    { french: 'Il est allé voir leur état de santé', bariba: 'U ben alaafia mɛɛribu da.', context: 'Visite de courtoisie', distractorsBa: ['U doona.', 'U na.', 'U dɔɔ.'], distractorsFr: ['Il est parti', 'Il est arrivé', 'Il a dormi'] },
    { french: 'Voilà, je comprends maintenant', bariba: 'Aba, na tuba tɛ̃.', context: 'Prise de conscience', distractorsBa: ['Tɔ̃yɑ mɔ.', 'Yɑ kpɑ.', 'Yen sɔ̃.'], distractorsFr: ['C\'est la vérité', 'C\'est fini', 'C\'est pourquoi'] },
    { french: 'Épaule', bariba: 'Bwãaru', context: 'Partie du corps supérieur', distractorsBa: ['Nũu', 'Wiir', 'Siiru'], distractorsFr: ['Main', 'Tête', 'Pied'] },
    { french: 'Si tu es fatigué, tu dois te coucher', bariba: 'À n sɔmburu kua à n wasira, sere a kpuna.', context: 'Repos après le travail', distractorsBa: ['A seewo.', 'A dĩa di.', 'A nim nɔ.'], distractorsFr: ['Lève-toi', 'Mange', 'Bois de l\'eau'] },
  ],

  // ─────────────────────────────────────────────────────────────────
  // COMMERCE & ARGENT (15 exercices)
  // Sources: Traducteur, phrase_fr_bariba.json, dictionnaire
  // ─────────────────────────────────────────────────────────────────
  commerce: [
    { french: 'Argent', bariba: 'Gobi', context: 'Monnaie', distractorsBa: ['Kia', 'Aburu', 'Yɔwaru'], distractorsFr: ['Marchandise', 'Marché', 'Karité'] },
    { french: 'Marchandise', bariba: 'Kia', context: 'Produit à vendre', distractorsBa: ['Gobi', 'Aburu', 'Dĩa'], distractorsFr: ['Argent', 'Marché', 'Nourriture'] },
    { french: 'Marché', bariba: 'Aburu', context: 'Lieu d\'échange commercial', distractorsBa: ['Yɛnu', 'Wuu', 'Gberu'], distractorsFr: ['Maison', 'Village', 'Champ'] },
    { french: 'C\'est aujourd\'hui le marché de notre village', bariba: 'Gisɔra bɛsɛn wuun aburu.', context: 'Jour de marché', distractorsBa: ['Yɑm gberɔ dɔɔ.', 'Wuu ge ga kpã.', 'Sa doona.'], distractorsFr: ['Aujourd\'hui on va au champ', 'Le village est grand', 'Nous partons'] },
    { french: 'Je vais au marché acheter des oignons', bariba: 'Na yaburu dɔɔ n arumasanu dwe.', context: 'Course au marché', distractorsBa: ['Na gberu dɔɔ.', 'Na yɛnu dɔɔ.', 'Na wuu dɔɔ.'], distractorsFr: ['Je vais au champ', 'Je rentre à la maison', 'Je vais au village'] },
    { french: 'L\'argent volé n\'est pas béni', bariba: 'Gbɛnan gobi kùn arubaruka mɔ.', context: 'Proverbe sur le vol', distractorsBa: ['Gobi ya do.', 'Gobi ya yiba.', 'Na gobi mɔ.'], distractorsFr: ['L\'argent est bon', 'Il y a beaucoup d\'argent', 'J\'ai de l\'argent'] },
    { french: 'Ils ont frauduleusement ouvert mon porte-monnaie', bariba: 'Ba nɛn gobi bɔɔru man nɔɔbaayari.', context: 'Vol', distractorsBa: ['Ba gobi wa.', 'Ba man gobi kã.', 'Na gobi mɔ.'], distractorsFr: ['Ils ont trouvé de l\'argent', 'On m\'a donné de l\'argent', 'J\'ai de l\'argent'] },
    { french: 'Sa marchandise est sans valeur', bariba: 'Win kia te ta ǹ gobi mɔ, ta babara.', context: 'Marchandise de mauvaise qualité', distractorsBa: ['Win kia ya do.', 'Win kia ya yiba.', 'U kia dɔramɔ.'], distractorsFr: ['Sa marchandise est bonne', 'Il a beaucoup de marchandise', 'Il vend sa marchandise'] },
    { french: 'Il a pris un taxi pour aller au marché', bariba: 'U kɛkɛ tenku dua uka yaburu da.', context: 'Transport vers le marché', distractorsBa: ['U gberu da.', 'U yɛnu da.', 'U wuu da.'], distractorsFr: ['Il est allé au champ', 'Il est rentré chez lui', 'Il est allé au village'] },
    { french: 'Régler un problème', bariba: 'Gɑri ɡbi.', context: 'Mettre fin à un litige', distractorsBa: ['Wɔbu suɑ.', 'Man wɔbu nɑn.', 'Wɔbɑ wɔri.'], distractorsFr: ['Partir', 'Laisse-moi partir', 'Se disculper'] },
    { french: 'Se disculper (Laver les mains)', bariba: 'Wɔbɑ wɔri.', context: 'Refuser la responsabilité', distractorsBa: ['Gɑri ɡbi.', 'Wɔbu suɑ.', 'Wɑ̃ɑru di.'], distractorsFr: ['Régler un problème', 'Partir', 'Jouir de la vie'] },
    { french: 'Tout le monde', bariba: 'Bɑɑwure.', context: 'Collectif, chacun', distractorsBa: ['Fiiko fiiko.', 'Tɔ̃yɑ mɔ.', 'Yen sɔ̃.'], distractorsFr: ['Doucement', 'C\'est la vérité', 'C\'est pourquoi'] },
    { french: 'C\'est la vérité', bariba: 'Tɔ̃yɑ mɔ.', context: 'Affirmation de vérité', distractorsBa: ['Bɑɑwure.', 'Yen sɔ̃.', 'Yɑ kpɑ.'], distractorsFr: ['Tout le monde', 'C\'est pourquoi', 'C\'est fini'] },
    { french: 'C\'est pourquoi', bariba: 'Yen sɔ̃.', context: 'Connecteur de cause', distractorsBa: ['Tɔ̃yɑ mɔ.', 'Bɑɑwure.', 'Tɛ̃.'], distractorsFr: ['C\'est la vérité', 'Tout le monde', 'Maintenant'] },
    { french: 'C\'est fini', bariba: 'Yɑ kpɑ.', context: 'Fin d\'une transaction ou action', distractorsBa: ['Tɛ̃.', 'Yen sɔ̃.', 'Tɔ̃yɑ mɔ.'], distractorsFr: ['Maintenant', 'C\'est pourquoi', 'C\'est la vérité'] },
  ],

  // ─────────────────────────────────────────────────────────────────
  // TRANSPORT & DIRECTION (15 exercices) - NOUVEAU THÈME
  // Sources: Traducteur (catégorie Transport), dictionnaire
  // ─────────────────────────────────────────────────────────────────
  transport: [
    { french: 'Route, chemin', bariba: 'Swaa', context: 'Voie de circulation', distractorsBa: ['Wuu', 'Gberu', 'Yɛnu'], distractorsFr: ['Village', 'Champ', 'Maison'] },
    { french: 'Voiture, camion', bariba: 'Kɛkɛ', context: 'Véhicule motorisé', distractorsBa: ['Sii', 'Duma', 'Swaa'], distractorsFr: ['Vélo', 'Cheval', 'Route'] },
    { french: 'Vélo', bariba: 'Sii', context: 'Moyen de transport léger', distractorsBa: ['Kɛkɛ', 'Duma', 'Swaa'], distractorsFr: ['Voiture', 'Cheval', 'Route'] },
    { french: 'Cheval', bariba: 'Duma', context: 'Animal de monte', distractorsBa: ['Sii', 'Kɛkɛ', 'Yãanu'], distractorsFr: ['Vélo', 'Voiture', 'Mouton'] },
    { french: 'La voiture est partie, dommage', bariba: 'Kɛkɛ ye ya doona, gaasa.', context: 'Véhicule manqué', distractorsBa: ['Kɛkɛ ye ya na.', 'Sii ye ya doona.', 'Duma u na.'], distractorsFr: ['La voiture est arrivée', 'Le vélo est parti', 'Le cheval arrive'] },
    { french: 'Son vélo neuf est brillant', bariba: 'Win sii dum kpaa ye ya ballimɔ.', context: 'Vélo tout neuf', distractorsBa: ['Win kɛkɛ ya do.', 'Win duma u kpã.', 'Swaa ya do.'], distractorsFr: ['Sa voiture est belle', 'Son cheval est grand', 'La route est belle'] },
    { french: 'Bio, lève-toi pour aller au champ', bariba: 'Ãa Biɔ, a seewo a gbee te da.', context: 'Instruction de départ', distractorsBa: ['Biɔ, a na.', 'Biɔ, a dĩa di.', 'Biɔ, a dɔɔ.'], distractorsFr: ['Bio, viens', 'Bio, mange', 'Bio, dors'] },
    { french: 'Champ', bariba: 'Gberu', context: 'Lieu de culture', distractorsBa: ['Yɛnu', 'Wuu', 'Aburu'], distractorsFr: ['Maison', 'Village', 'Marché'] },
    { french: 'Un grand camion', bariba: 'Kɛkɛ baka', context: 'Véhicule imposant', distractorsBa: ['Kɛkɛ swia', 'Sii baka', 'Duma baka'], distractorsFr: ['Un petit camion', 'Un grand vélo', 'Un grand cheval'] },
    { french: 'Forêt', bariba: 'Kpaaru', context: 'Zone boisée', distractorsBa: ['Gberu', 'Wuu', 'Daa'], distractorsFr: ['Champ', 'Village', 'Marigot'] },
    { french: 'Marigot', bariba: 'Daa', context: 'Cours d\'eau', distractorsBa: ['Nim', 'Kpaaru', 'Gberu'], distractorsFr: ['Eau', 'Forêt', 'Champ'] },
    { french: 'Le caméléon sait marcher comme un roi', bariba: 'Agama ga sina sanum yɛ̃.', context: 'Animal noble et lent', distractorsBa: ['Wɔmu u sĩimɔ.', 'Duma u taamɔ.', 'Kɛkɛ ya dɔɔ.'], distractorsFr: ['Le singe marche', 'Le cheval court', 'La voiture roule'] },
    { french: 'Le soulard titube sur la route', bariba: 'Tam nɔro u ra bãari swaa sɔɔ.', context: 'Démarche d\'ivrogne', distractorsBa: ['U sĩimɔ swaa sɔɔ.', 'U dɔɔ swaa sɔɔ.', 'U yaamɔ swaa sɔɔ.'], distractorsFr: ['Il marche sur la route', 'Il dort sur la route', 'Il danse sur la route'] },
    { french: 'Partout où il passe, on le connaît', bariba: 'Baama kpuro mì u da, ba ra n wii yɛ̃ wa.', context: 'Personne connue', distractorsBa: ['U doona.', 'U na.', 'U dɔɔ.'], distractorsFr: ['Il est parti', 'Il est arrivé', 'Il dort'] },
    { french: 'Carrefour', bariba: 'Swaa kɛɛnanɔ', context: 'Croisement de routes', distractorsBa: ['Swaa', 'Gberu', 'Wuu'], distractorsFr: ['Route', 'Champ', 'Village'] },
  ],

  // ─────────────────────────────────────────────────────────────────
  // TRAVAIL & MÉTIERS (15 exercices) - NOUVEAU THÈME
  // Sources: Traducteur, dictionnaire, phrases
  // ─────────────────────────────────────────────────────────────────
  travail: [
    { french: 'Travail', bariba: 'Sɔmburu', context: 'Activité professionnelle', distractorsBa: ['Gberu', 'Yɛnu', 'Diru'], distractorsFr: ['Champ', 'Maison', 'Case'] },
    { french: 'Le menuisier va réparer notre table', bariba: 'Agbegi u koo bɛsɛn taabulu sɔmɛ.', context: 'Métier du bois', distractorsBa: ['Arari u koo sɔmɛ.', 'Dokotoro u koo sɔmɛ.', 'Sunɔ u koo sɔmɛ.'], distractorsFr: ['Le boucher va réparer', 'Le médecin va réparer', 'Le chef va réparer'] },
    { french: 'Le boucher a abattu trois bœufs aujourd\'hui', bariba: 'Arari u nɛɛ ita go gisɔ.', context: 'Métier de la boucherie', distractorsBa: ['Agbegi u sɔmburu kua.', 'Sunɔ u na.', 'Dokotoro u tɔmbu wa.'], distractorsFr: ['Le menuisier a travaillé', 'Le chef est venu', 'Le médecin a vu les gens'] },
    { french: 'Quel avantage auras-tu dans ce travail', bariba: 'Are yira kaa wa sɔmbu te sɔɔ.', context: 'Bénéfice du travail', distractorsBa: ['A sɔmburu de.', 'Sɔmburu ya kpã.', 'A wasira.'], distractorsFr: ['Tu travailles', 'Le travail est grand', 'Tu es fatigué'] },
    { french: 'Nous avons beaucoup travaillé', bariba: 'Sa wasira.', context: 'Fatigue après le travail', distractorsBa: ['Sa dɔɔ.', 'Sa dĩa di.', 'Sa doona.'], distractorsFr: ['Nous avons dormi', 'Nous avons mangé', 'Nous sommes partis'] },
    { french: 'Chasseur', bariba: 'Taaso', context: 'Métier de la chasse', distractorsBa: ['Arari', 'Agbegi', 'Dokotoro'], distractorsFr: ['Boucher', 'Menuisier', 'Médecin'] },
    { french: 'Chef', bariba: 'Sunɔ', context: 'Autorité locale', distractorsBa: ['Taaso', 'Arari', 'Agbegi'], distractorsFr: ['Chasseur', 'Boucher', 'Menuisier'] },
    { french: 'Pêcheur', bariba: 'Susure kowo', context: 'Métier de la pêche', distractorsBa: ['Taaso', 'Arari', 'Sunɔ'], distractorsFr: ['Chasseur', 'Boucher', 'Chef'] },
    { french: 'Ceux-là font la pêche', bariba: 'Beɔnɔ susurewa ba ra ko.', context: 'Activité de pêche', distractorsBa: ['Ba taasoru de.', 'Ba sɔmburu de.', 'Ba gberu da.'], distractorsFr: ['Ils font la chasse', 'Ils travaillent', 'Ils vont au champ'] },
    { french: 'J\'ai commencé à construire ma case', bariba: 'Na nɛn diru banima.', context: 'Construction', distractorsBa: ['Na sɔmburu de.', 'Na gberu da.', 'Na dĩa kua.'], distractorsFr: ['J\'ai travaillé', 'Je suis allé au champ', 'J\'ai cuisiné'] },
    { french: 'Champ de culture', bariba: 'Gberu', context: 'Lieu de travail agricole', distractorsBa: ['Yɛnu', 'Wuu', 'Aburu'], distractorsFr: ['Maison', 'Village', 'Marché'] },
    { french: 'Je suis au champ tous les jours', bariba: 'Baadomma na rà n wãawa gberɔ.', context: 'Routine agricole quotidienne', distractorsBa: ['Na yɛnu dɔɔ.', 'Na aburu dɔɔ.', 'Na wuu dɔɔ.'], distractorsFr: ['Je vais à la maison', 'Je vais au marché', 'Je vais au village'] },
    { french: 'S\'il pleut, nous sèmerons demain', bariba: 'Gura yàn na, sa ko sia gberenu duure.', context: 'Travail agricole saisonnier', distractorsBa: ['Sa doona.', 'Sa dĩa di.', 'Sa dɔɔ.'], distractorsFr: ['Nous partons', 'Nous mangeons', 'Nous dormons'] },
    { french: 'Tenir la houe est une question d\'habitude', bariba: 'Naa tebon nɛnubu bu sãawa.', context: 'Sagesse agricole', distractorsBa: ['Sɔmburu ya sɛ̃.', 'Gberu ya kpã.', 'Tebo ya do.'], distractorsFr: ['Le travail est dur', 'Le champ est grand', 'La houe est bonne'] },
    { french: 'Les soldats font une marche militaire', bariba: 'Soogeba ba gasiisiru yaamɔ.', context: 'Activité militaire', distractorsBa: ['Ba sɔmburu de.', 'Ba doona.', 'Ba dɔɔ.'], distractorsFr: ['Ils travaillent', 'Ils partent', 'Ils dorment'] },
  ],

  // ─────────────────────────────────────────────────────────────────
  // ÉMOTIONS & SENTIMENTS (15 exercices)
  // Sources: idiomes-2.json IDM_EMO_016-024, phrases
  // ─────────────────────────────────────────────────────────────────
  emotions: [
    { french: 'Être calme (Cœur apaisé)', bariba: 'Nimu kpɛm.', context: 'Le calme est froid/frais (idiome thermique)', distractorsBa: ['Nimu tɛrɑ.', 'Gɔ̃ru sɔ̃.', 'Gɔ̃ru pii.'], distractorsFr: ['Être en colère', 'Être méchant', 'Être gentil'] },
    { french: 'Être en colère (Cœur chaud)', bariba: 'Nimu tɛrɑ.', context: 'La colère est chaude (idiome thermique)', distractorsBa: ['Nimu kpɛm.', 'Gɔ̃ru sɔ̃.', 'Nimu mɔ kɑ yɛru.'], distractorsFr: ['Être calme', 'Être méchant', 'Être joyeux'] },
    { french: 'Ne sois pas en colère (Refroidis ton cœur)', bariba: 'A sɔ̃ɔwɑ nimu.', context: 'Injonction au calme', distractorsBa: ['Nimu tɛrɑ.', 'Nimu kpɛm.', 'Gɔ̃ru pii.'], distractorsFr: ['Être en colère', 'Être calme', 'Être gentil'] },
    { french: 'Mon cœur est en joie', bariba: 'Nimu mɔ kɑ yɛru.', context: 'Joie liée à la fraîcheur intérieure', distractorsBa: ['Nimu kpɛm.', 'Nimu tɛrɑ.', 'Gɔ̃ru sɔ̃.'], distractorsFr: ['Être calme', 'Être en colère', 'Être méchant'] },
    { french: 'Être méchant (Cœur noir)', bariba: 'Gɔ̃ru sɔ̃.', context: 'La méchanceté est noire', distractorsBa: ['Gɔ̃ru pii.', 'Nimu tɛrɑ.', 'Nimu kpɛm.'], distractorsFr: ['Être gentil', 'Être en colère', 'Être calme'] },
    { french: 'Être gentil (Cœur blanc)', bariba: 'Gɔ̃ru pii.', context: 'L\'honnêteté est blanche', distractorsBa: ['Gɔ̃ru sɔ̃.', 'Nimu tɛrɑ.', 'Wiir wɛ̃rɑ.'], distractorsFr: ['Être méchant', 'Être en colère', 'Chanceux'] },
    { french: 'J\'ai peur (La peur me tient)', bariba: 'Wɑ̃ɑ nɑn bɑɑ.', context: 'La peur agit sur le sujet', distractorsBa: ['Na wɑ̃ɑ yɑrɑ.', 'Nimu tɛrɑ.', 'Gɔ̃ru sɔ̃.'], distractorsFr: ['J\'ai honte', 'Je suis en colère', 'Je suis méchant'] },
    { french: 'J\'ai honte', bariba: 'Na wɑ̃ɑ yɑrɑ.', context: 'Ressentir la honte', distractorsBa: ['Wɑ̃ɑ nɑn bɑɑ.', 'Nimu kpɛm.', 'Nimu tɛrɑ.'], distractorsFr: ['J\'ai peur', 'Je suis calme', 'Je suis en colère'] },
    { french: 'Son impolitesse a dépassé les bornes', bariba: 'Win sankiraru ta banna.', context: 'Comportement inacceptable', distractorsBa: ['U gɔbu.', 'U nimu tɛrɑ.', 'U wɑ̃ɑ yɑrɑ.'], distractorsFr: ['Il est méchant', 'Il est en colère', 'Il a honte'] },
    { french: 'Je suis content de ton cadeau', bariba: 'Na wunɛn kɛ̃ɛte siara.', context: 'Gratitude et joie', distractorsBa: ['Nimu mɔ kɑ yɛru.', 'Nimu kpɛm.', 'Gɔ̃ru pii.'], distractorsFr: ['Mon cœur est en joie', 'Je suis calme', 'Je suis gentil'] },
    { french: 'Le menteur n\'a pas de valeur', bariba: 'Wee kowo u ku ra ǹ bɛɛrɛ mɔ.', context: 'Jugement moral sur le mensonge', distractorsBa: ['Tɔ̃yɑ mɔ.', 'Gɔ̃ru pii.', 'Gɔ̃ru sɔ̃.'], distractorsFr: ['C\'est la vérité', 'Il est gentil', 'Il est méchant'] },
    { french: 'Le problème que tu poses est difficile', bariba: 'Wunɛn gari yì a ka na mi, yu sɛ̃.', context: 'Difficulté d\'un problème', distractorsBa: ['Gari ya do.', 'Gari ya kpã.', 'Gari ya kpɑ.'], distractorsFr: ['Le problème est bon', 'Le problème est grand', 'Le problème est fini'] },
    { french: 'L\'enfant a raison', bariba: 'Bii wi u gem mɔ.', context: 'Avoir raison dans un conflit', distractorsBa: ['Bii wi u gum mɔ.', 'Bii wi u doona.', 'Bii wi u dɔɔ.'], distractorsFr: ['L\'enfant est malade', 'L\'enfant est parti', 'L\'enfant dort'] },
    { french: 'Les cris du chevreau font pitié', bariba: 'Boo buu gen wuri yu wɔnwɔndu kua.', context: 'Compassion animale', distractorsBa: ['Boo ya dɔɔ.', 'Boo ya di.', 'Boo ya doona.'], distractorsFr: ['Le chevreau dort', 'Le chevreau mange', 'Le chevreau est parti'] },
    { french: 'Toi-même tu exagères', bariba: 'Wunɛn tii a banda.', context: 'Reproche pour excès', distractorsBa: ['A gɔbu.', 'A wasira.', 'A dɔɔ.'], distractorsFr: ['Tu es méchant', 'Tu es fatigué', 'Tu dors'] },
  ],

  // ─────────────────────────────────────────────────────────────────
  // ÉTATS & BESOINS (15 exercices)
  // Sources: idiomes-2.json IDM_ETAT_025-035
  // ─────────────────────────────────────────────────────────────────
  etats: [
    { french: 'J\'ai faim (La faim me fait)', bariba: 'Yɑm bɑɑ man.', context: 'Sujet inversé (Je)', distractorsBa: ['Yɑm bɑɑ nun.', 'Yɑm bɑɑ u.', 'Nim nɔru ɡɑ nɛn mɔ.'], distractorsFr: ['Tu as faim', 'Il a faim', 'J\'ai soif'] },
    { french: 'Tu as faim', bariba: 'Yɑm bɑɑ nun.', context: 'Sujet inversé (Tu)', distractorsBa: ['Yɑm bɑɑ man.', 'Yɑm bɑɑ u.', 'Dɔ̃ɔ wunɛn mɔ.'], distractorsFr: ['J\'ai faim', 'Il a faim', 'Tu as sommeil'] },
    { french: 'Il a faim', bariba: 'Yɑm bɑɑ u.', context: 'Sujet inversé (Il)', distractorsBa: ['Yɑm bɑɑ man.', 'Yɑm bɑɑ nun.', 'U gum mɔ.'], distractorsFr: ['J\'ai faim', 'Tu as faim', 'Il est malade'] },
    { french: 'J\'ai soif (Soif d\'eau me possède)', bariba: 'Nim nɔru ɡɑ nɛn mɔ.', context: 'Possession de l\'état (Je)', distractorsBa: ['Nim nɔru ɡɑ wunɛn mɔ.', 'Yɑm bɑɑ man.', 'Dɔ̃ɔ nɛn mɔ.'], distractorsFr: ['Tu as soif', 'J\'ai faim', 'J\'ai sommeil'] },
    { french: 'Tu as soif', bariba: 'Nim nɔru ɡɑ wunɛn mɔ.', context: 'Possession de l\'état (Tu)', distractorsBa: ['Nim nɔru ɡɑ nɛn mɔ.', 'Yɑm bɑɑ nun.', 'Dɔ̃ɔ wunɛn mɔ.'], distractorsFr: ['J\'ai soif', 'Tu as faim', 'Tu as sommeil'] },
    { french: 'J\'ai sommeil', bariba: 'Dɔ̃ɔ nɛn mɔ.', context: 'Possession du sommeil (Je)', distractorsBa: ['Dɔ̃ɔ wunɛn mɔ.', 'Nim nɔru ɡɑ nɛn mɔ.', 'Na gum mɔ.'], distractorsFr: ['Tu as sommeil', 'J\'ai soif', 'Je suis malade'] },
    { french: 'Tu as sommeil', bariba: 'Dɔ̃ɔ wunɛn mɔ.', context: 'Possession du sommeil (Tu)', distractorsBa: ['Dɔ̃ɔ nɛn mɔ.', 'Nim nɔru ɡɑ wunɛn mɔ.', 'Yɑm bɑɑ nun.'], distractorsFr: ['J\'ai sommeil', 'Tu as soif', 'Tu as faim'] },
    { french: 'J\'ai peur (La peur me tient)', bariba: 'Wɑ̃ɑ nɑn bɑɑ.', context: 'La peur agit sur le sujet', distractorsBa: ['Na wɑ̃ɑ yɑrɑ.', 'Nimu tɛrɑ.', 'Na gum mɔ.'], distractorsFr: ['J\'ai honte', 'Je suis en colère', 'Je suis malade'] },
    { french: 'J\'ai honte', bariba: 'Na wɑ̃ɑ yɑrɑ.', context: 'Ressentir la honte', distractorsBa: ['Wɑ̃ɑ nɑn bɑɑ.', 'Nimu kpɛm.', 'Na gum mɔ.'], distractorsFr: ['J\'ai peur', 'Je suis calme', 'Je suis malade'] },
    { french: 'Je suis malade', bariba: 'Na gum mɔ.', context: 'Possession de la maladie', distractorsBa: ['U gum mɔ.', 'Dɔ̃ɔ nɛn mɔ.', 'Yɑm bɑɑ man.'], distractorsFr: ['Il est malade', 'J\'ai sommeil', 'J\'ai faim'] },
    { french: 'Il est malade', bariba: 'U gum mɔ.', context: 'Maladie (Il)', distractorsBa: ['Na gum mɔ.', 'Yɑm bɑɑ u.', 'Dɔ̃ɔ nɛn mɔ.'], distractorsFr: ['Je suis malade', 'Il a faim', 'J\'ai sommeil'] },
    { french: 'J\'ai soif (au ramadan)', bariba: 'Nim nɔru ga man mö.', context: 'Soif pendant le jeûne', distractorsBa: ['Yɑm bɑɑ man.', 'Dɔ̃ɔ nɛn mɔ.', 'Na gum mɔ.'], distractorsFr: ['J\'ai faim', 'J\'ai sommeil', 'Je suis malade'] },
    { french: 'Il ne reste plus rien', bariba: 'Goo kun maa tie.', context: 'Absence totale', distractorsBa: ['Ya kpã.', 'Ya do.', 'Ya yiba.'], distractorsFr: ['C\'est beaucoup', 'C\'est bon', 'Il y en a beaucoup'] },
    { french: 'Ils ont souffert dans ce pays', bariba: 'Ba asaara wa tem mi.', context: 'Souffrance collective', distractorsBa: ['Ba doona.', 'Ba dɔɔ.', 'Ba di.'], distractorsFr: ['Ils sont partis', 'Ils dorment', 'Ils mangent'] },
    { french: 'Notre rencontre sera difficile', bariba: 'Bɛsɛn yinnɔ ga koo sɛ̃ sia.', context: 'Difficulté anticipée', distractorsBa: ['Sa ko yinna.', 'Sa doona.', 'Sa dɔɔ.'], distractorsFr: ['Nous allons nous voir', 'Nous partons', 'Nous dormons'] },
  ],

  // ─────────────────────────────────────────────────────────────────
  // ACTIONS & VERBES (15 exercices)
  // Sources: idiomes-2.json IDM_ACT_036-045, dictionnaire, phrases
  // ─────────────────────────────────────────────────────────────────
  actions: [
    { french: 'Laisse-moi partir (Donne-moi la route)', bariba: 'Man wɔbu nɑn.', context: 'Demande de départ', distractorsBa: ['Wɔbu suɑ.', 'A do !', 'A na !'], distractorsFr: ['Partir', 'Va !', 'Viens !'] },
    { french: 'Partir (Prendre la route)', bariba: 'Wɔbu suɑ.', context: 'Démarrer un voyage', distractorsBa: ['Man wɔbu nɑn.', 'A do !', 'A seewo !'], distractorsFr: ['Laisse-moi partir', 'Va !', 'Lève-toi !'] },
    { french: 'Jouir de la vie (Manger la vie)', bariba: 'Wɑ̃ɑru di.', context: 'Profiter, être aisé', distractorsBa: ['Gɑri ɡbi.', 'Wɔbu suɑ.', 'Wɔbɑ wɔri.'], distractorsFr: ['Régler un problème', 'Partir', 'Se disculper'] },
    { french: 'Faire le beurre de karité', bariba: 'Yɔwaru mö.', context: 'Verbe spécifique de fabrication', distractorsBa: ['Wɑ̃ɑru di.', 'Gɑri ɡbi.', 'Wɔbu suɑ.'], distractorsFr: ['Jouir de la vie', 'Régler un problème', 'Partir'] },
    { french: 'Repositionner le bébé au dos', bariba: 'Yɔwe.', context: 'Verbe spécifique maternel', distractorsBa: ['Yɔwaru mö.', 'A na !', 'A seewo !'], distractorsFr: ['Faire le karité', 'Viens !', 'Lève-toi !'] },
    { french: 'Va !', bariba: 'A do !', context: 'Impératif court de mouvement', distractorsBa: ['A na !', 'A seewo !', 'Wɔbu suɑ.'], distractorsFr: ['Viens !', 'Lève-toi !', 'Pars !'] },
    { french: 'Viens !', bariba: 'A na !', context: 'Impératif court d\'appel', distractorsBa: ['A do !', 'A seewo !', 'Man wɔbu nɑn.'], distractorsFr: ['Va !', 'Lève-toi !', 'Laisse-moi partir'] },
    { french: 'Lève-toi !', bariba: 'A seewo !', context: 'Impératif court', distractorsBa: ['A do !', 'A na !', 'Wɔbu suɑ.'], distractorsFr: ['Va !', 'Viens !', 'Pars !'] },
    { french: 'Mange !', bariba: 'A dio.', context: 'Impératif pour manger', distractorsBa: ['A do !', 'A na !', 'A seewo !'], distractorsFr: ['Va !', 'Viens !', 'Lève-toi !'] },
    { french: 'Donne-moi de l\'eau', bariba: 'A nim tama.', context: 'Demande polie', distractorsBa: ['A dĩa tama.', 'A gobi tama.', 'A koko tama.'], distractorsFr: ['Donne-moi à manger', 'Donne-moi de l\'argent', 'Donne-moi du riz'] },
    { french: 'Ne blesse pas mon enfant', bariba: 'A ku nɛn bii gubu.', context: 'Protection de l\'enfant', distractorsBa: ['A bii suura.', 'A bii wa.', 'A bii so.'], distractorsFr: ['Regarde l\'enfant', 'Cherche l\'enfant', 'Frappe l\'enfant'] },
    { french: 'Ne permets pas que le torrent emporte l\'enfant', bariba: 'A ku de nim toraa yù ka bii doona.', context: 'Mise en garde', distractorsBa: ['A bii wa.', 'Bii u doona.', 'A bii suura.'], distractorsFr: ['Regarde l\'enfant', 'L\'enfant est parti', 'Protège l\'enfant'] },
    { french: 'C\'est Dieu qui nous a créés', bariba: 'Gusunɔwa u sun taka kua.', context: 'Création divine', distractorsBa: ['Gusunɔ bɑkɑ.', 'Gusunɔn durom.', 'Gusunɔ u n wure.'], distractorsFr: ['Dieu est grand', 'Grâce à Dieu', 'Si Dieu le veut'] },
    { french: 'Suppliez-le même s\'il refuse', bariba: 'I n kanasimɔ, baa ù n yinamɔ.', context: 'Persévérance dans la demande', distractorsBa: ['A suuru kana.', 'A do.', 'A na.'], distractorsFr: ['Demande pardon', 'Va', 'Viens'] },
    { french: 'Pince-le avec tes doigts et apporte-le', bariba: 'A yè nikisu baarima a ka na.', context: 'Action manuelle', distractorsBa: ['A yè wa.', 'A yè doke.', 'A yè suura.'], distractorsFr: ['Regarde-le', 'Pose-le', 'Cherche-le'] },
  ],

  // ─────────────────────────────────────────────────────────────────
  // NATURE & ANIMAUX (15 exercices) - NOUVEAU THÈME
  // Sources: dictionnaire, Traducteur, phrases
  // ─────────────────────────────────────────────────────────────────
  nature: [
    { french: 'Arbre', bariba: 'Dãru', context: 'Végétal ligneux', distractorsBa: ['Gberu', 'Wuu', 'Nim'], distractorsFr: ['Champ', 'Village', 'Eau'] },
    { french: 'Pluie', bariba: 'Gura', context: 'Précipitation atmosphérique', distractorsBa: ['Sɔ̃ɔ', 'Nim', 'Wɔllu'], distractorsFr: ['Soleil', 'Eau', 'Ciel'] },
    { french: 'Soleil', bariba: 'Sɔ̃ɔ', context: 'Astre du jour', distractorsBa: ['Gura', 'Wɔllu', 'Nim'], distractorsFr: ['Pluie', 'Ciel', 'Eau'] },
    { french: 'Le soleil brille', bariba: 'Sɔ̃ɔ u ballimɔ.', context: 'Temps ensoleillé', distractorsBa: ['Gura ya na.', 'Nim mu wɔruma.', 'Wɔllu ta do.'], distractorsFr: ['Il pleut', 'L\'eau coule', 'Le ciel est beau'] },
    { french: 'S\'il pleut, nous irons au champ', bariba: 'Gura yàn na, sa ko gberu da.', context: 'Travail agricole dépendant de la pluie', distractorsBa: ['Sa doona.', 'Sa dɔɔ.', 'Sa dĩa di.'], distractorsFr: ['Nous partons', 'Nous dormons', 'Nous mangeons'] },
    { french: 'Ciel', bariba: 'Wɔllu', context: 'Voûte céleste', distractorsBa: ['Sɔ̃ɔ', 'Gura', 'Tem'], distractorsFr: ['Soleil', 'Pluie', 'Terre'] },
    { french: 'Terre, pays', bariba: 'Tem', context: 'Sol, territoire', distractorsBa: ['Wɔllu', 'Nim', 'Gberu'], distractorsFr: ['Ciel', 'Eau', 'Champ'] },
    { french: 'Mouton', bariba: 'Yãanu', context: 'Animal domestique', distractorsBa: ['Boo', 'Naa', 'Kɛtɛ'], distractorsFr: ['Chèvre', 'Vache', 'Bœuf'] },
    { french: 'Chèvre, chevreau', bariba: 'Boo', context: 'Petit ruminant', distractorsBa: ['Yãanu', 'Naa', 'Bɔ̃ɔ'], distractorsFr: ['Mouton', 'Vache', 'Chien'] },
    { french: 'Chien', bariba: 'Bɔ̃ɔ', context: 'Animal domestique', distractorsBa: ['Boo', 'Yãanu', 'Naa'], distractorsFr: ['Chèvre', 'Mouton', 'Vache'] },
    { french: 'Un chien vagabond a tué nos poulets', bariba: 'Bɔ̃ɔ yiira ga na ga bɛsɛn gue go.', context: 'Incident avec un animal', distractorsBa: ['Boo ya na.', 'Yãanu ya doona.', 'Naa ya di.'], distractorsFr: ['La chèvre est arrivée', 'Le mouton est parti', 'La vache a mangé'] },
    { french: 'Poulet', bariba: 'Gue', context: 'Volaille domestique', distractorsBa: ['Bɔ̃ɔ', 'Boo', 'Wisu'], distractorsFr: ['Chien', 'Chèvre', 'Poisson'] },
    { french: 'Singe', bariba: 'Wɔmu', context: 'Primate', distractorsBa: ['Bɔ̃ɔ', 'Boo', 'Gue'], distractorsFr: ['Chien', 'Chèvre', 'Poulet'] },
    { french: 'Vautour, charognard', bariba: 'Abereku', context: 'Oiseau charognard', distractorsBa: ['Gue', 'Wɔmu', 'Bɔ̃ɔ'], distractorsFr: ['Poulet', 'Singe', 'Chien'] },
    { french: 'La saison sèche est arrivée', bariba: 'Sɔ̃ɔ u sãra.', context: 'Changement saisonnier', distractorsBa: ['Gura ya na.', 'Nim mu wɔruma.', 'Sɔ̃ɔ u ballimɔ.'], distractorsFr: ['Il pleut', 'L\'eau coule', 'Le soleil brille'] },
  ],

  // ─────────────────────────────────────────────────────────────────
  // TEMPS & CONNECTEURS (15 exercices)
  // Sources: idiomes-2.json IDM_DIV_056-065, dictionnaire
  // ─────────────────────────────────────────────────────────────────
  temps: [
    { french: 'Maintenant', bariba: 'Tɛ̃.', context: 'Temps présent immédiat', distractorsBa: ['Yɑm.', 'Dɑkɑ.', 'Yɑmɔ.'], distractorsFr: ['Aujourd\'hui', 'Hier', 'Demain'] },
    { french: 'Aujourd\'hui', bariba: 'Yɑm.', context: 'Journée en cours', distractorsBa: ['Tɛ̃.', 'Dɑkɑ.', 'Yɑmɔ.'], distractorsFr: ['Maintenant', 'Hier', 'Demain'] },
    { french: 'Hier', bariba: 'Dɑkɑ.', context: 'Jour passé', distractorsBa: ['Yɑm.', 'Tɛ̃.', 'Yɑmɔ.'], distractorsFr: ['Aujourd\'hui', 'Maintenant', 'Demain'] },
    { french: 'Demain', bariba: 'Yɑmɔ.', context: 'Jour suivant', distractorsBa: ['Dɑkɑ.', 'Yɑm.', 'Tɛ̃.'], distractorsFr: ['Hier', 'Aujourd\'hui', 'Maintenant'] },
    { french: 'Doucement, petit à petit', bariba: 'Fiiko fiiko.', context: 'Adverbe redoublé pour la progressivité', distractorsBa: ['Tɛ̃.', 'Bɑɑwure.', 'Yen sɔ̃.'], distractorsFr: ['Maintenant', 'Tout le monde', 'C\'est pourquoi'] },
    { french: 'Jour (soleil)', bariba: 'Sɔ̃ɔ', context: 'Unité de temps = un jour', distractorsBa: ['Yɑm', 'Dɑkɑ', 'Yɑmɔ'], distractorsFr: ['Aujourd\'hui', 'Hier', 'Demain'] },
    { french: 'Il a passé deux jours dans cette localité', bariba: 'Sɔ̃ɔ yiruwa u kua wuu mi.', context: 'Durée d\'un séjour', distractorsBa: ['U doona.', 'U na.', 'U dɔɔ.'], distractorsFr: ['Il est parti', 'Il est arrivé', 'Il a dormi'] },
    { french: 'Matin (début du jour)', bariba: 'Bururu', context: 'Début de journée', distractorsBa: ['Yoka', 'Sɔ̃ɔ', 'Gisɔ'], distractorsFr: ['Soir', 'Jour', 'Cette année'] },
    { french: 'Soir', bariba: 'Yoka', context: 'Fin de journée', distractorsBa: ['Bururu', 'Sɔ̃ɔ', 'Yɑm'], distractorsFr: ['Matin', 'Jour', 'Aujourd\'hui'] },
    { french: 'Il va rentrer le mercredi', bariba: 'Adaaruba sɔ̃ nu u koo wuma.', context: 'Jour de la semaine', distractorsBa: ['U doona yɑm.', 'U na dɑkɑ.', 'U koo da yɑmɔ.'], distractorsFr: ['Il est parti aujourd\'hui', 'Il est arrivé hier', 'Il ira demain'] },
    { french: 'Le samedi soir, nous ne travaillons pas', bariba: 'Asibiti yoka sa ku ra sɔmburu ko.', context: 'Repos du week-end', distractorsBa: ['Sa sɔmburu de yɑm.', 'Sa doona.', 'Sa dɔɔ.'], distractorsFr: ['Nous travaillons aujourd\'hui', 'Nous partons', 'Nous dormons'] },
    { french: 'Au commencement', bariba: 'Sɑnɑm mɛ...', context: 'Formule narrative d\'ouverture', distractorsBa: ['Tɛ̃.', 'Dɑkɑ.', 'Yɑmɔ.'], distractorsFr: ['Maintenant', 'Hier', 'Demain'] },
    { french: 'Depuis que', bariba: 'Yè uka gu', context: 'Connecteur temporel', distractorsBa: ['Yen sɔ̃.', 'Tɛ̃.', 'Yɑm.'], distractorsFr: ['C\'est pourquoi', 'Maintenant', 'Aujourd\'hui'] },
    { french: 'Hier à la même heure, notre étranger était arrivé', bariba: 'Gĩa amadiire, bɛsɛn sɔɔ u turuma.', context: 'Référence temporelle passée', distractorsBa: ['Yɑm sɔɔ u na.', 'Yɑmɔ u koo na.', 'Tɛ̃ u na.'], distractorsFr: ['Aujourd\'hui il est arrivé', 'Demain il viendra', 'Maintenant il arrive'] },
    { french: 'Avant-hier', bariba: 'Gin teeru', context: 'Deux jours avant', distractorsBa: ['Dɑkɑ', 'Yɑm', 'Yɑmɔ'], distractorsFr: ['Hier', 'Aujourd\'hui', 'Demain'] },
  ],

  // ─────────────────────────────────────────────────────────────────
  // RELIGION & SAGESSE (15 exercices) - NOUVEAU THÈME
  // Sources: idiomes-2.json IDM_REL_046-052, Traducteur
  // ─────────────────────────────────────────────────────────────────
  religion: [
    { french: 'Dieu te bénisse', bariba: 'Gusunɔ u nun yɛri.', context: 'Bénédiction', distractorsBa: ['Gusunɔ u n wure.', 'Gusunɔn durom.', 'Gusunɔ bɑkɑ.'], distractorsFr: ['Si Dieu le veut', 'Grâce à Dieu', 'Dieu est grand'] },
    { french: 'Si Dieu le veut (Inchallah)', bariba: 'Gusunɔ u n wure.', context: 'Conditionnel futur', distractorsBa: ['Gusunɔ u nun yɛri.', 'Gusunɔn durom.', 'Gusunɔ bɑkɑ.'], distractorsFr: ['Dieu te bénisse', 'Grâce à Dieu', 'Dieu est grand'] },
    { french: 'Grâce à Dieu', bariba: 'Gusunɔn durom.', context: 'Gratitude divine', distractorsBa: ['Gusunɔ u nun yɛri.', 'Gusunɔ u n wure.', 'Gusunɔ bɑkɑ.'], distractorsFr: ['Dieu te bénisse', 'Si Dieu le veut', 'Dieu est grand'] },
    { french: 'Dieu est grand', bariba: 'Gusunɔ bɑkɑ.', context: 'Exclamation de foi', distractorsBa: ['Gusunɔn durom.', 'Gusunɔ u n wure.', 'Gusunɔ u nun yɛri.'], distractorsFr: ['Grâce à Dieu', 'Si Dieu le veut', 'Dieu te bénisse'] },
    { french: 'Esprit Saint', bariba: 'Hunde Dɛɛro.', context: 'Terme religieux biblique', distractorsBa: ['Nim wɑ̃ɑruɡim.', 'Gusunɔ bɑkɑ.', 'Sɑnɑm mɛ...'], distractorsFr: ['Eau de la vie', 'Dieu est grand', 'Au commencement'] },
    { french: 'Eau de la vie', bariba: 'Nim wɑ̃ɑruɡim.', context: 'Terme biblique sacré', distractorsBa: ['Hunde Dɛɛro.', 'Gusunɔ bɑkɑ.', 'Sɑnɑm mɛ...'], distractorsFr: ['Esprit Saint', 'Dieu est grand', 'Au commencement'] },
    { french: 'Dieu pardonne le pécheur', bariba: 'Gusunɔ ura toro suuru kue.', context: 'Miséricorde divine', distractorsBa: ['Gusunɔ bɑkɑ.', 'Gusunɔn durom.', 'Gusunɔ u n wure.'], distractorsFr: ['Dieu est grand', 'Grâce à Dieu', 'Si Dieu le veut'] },
    { french: 'Dieu, pardonne-nous nos péchés', bariba: 'Kpeebeeri a sun bɛsɛn gɔba suuru kuo.', context: 'Prière de repentance', distractorsBa: ['Gusunɔ u nun yɛri.', 'Gusunɔn durom.', 'Gusunɔ bɑkɑ.'], distractorsFr: ['Dieu te bénisse', 'Grâce à Dieu', 'Dieu est grand'] },
    { french: 'Sache rendre grâce pour ta vie', bariba: 'A n da ka wunɛn wãaru saabu ko.', context: 'Conseil de gratitude', distractorsBa: ['A do.', 'A na.', 'A dĩa di.'], distractorsFr: ['Va', 'Viens', 'Mange'] },
    { french: 'Merci de nous guider sur le chemin de Dieu', bariba: 'Bɛɛ ka kparabu.', context: 'Remerciement religieux', distractorsBa: ['Bɛsɛ ka faagi.', 'Nɑ kɑ̃i nin tɛriɑ.', 'Aagu.'], distractorsFr: ['Merci pour la conversation', 'Merci beaucoup', 'Salut'] },
    { french: 'Ailleurs, les gens pratiquent bien la religion', bariba: 'Gam tɔmba arufaaru nɛni.', context: 'Pratique religieuse', distractorsBa: ['Tɔmbu ba sɔmburu de.', 'Ba doona.', 'Ba dĩa di.'], distractorsFr: ['Les gens travaillent', 'Ils sont partis', 'Ils mangent'] },
    { french: 'C\'est le ciel qui brille', bariba: 'Gusunɔ wɔllu ta ballimɔ.', context: 'Phénomène céleste', distractorsBa: ['Sɔ̃ɔ u ballimɔ.', 'Gura ya na.', 'Nim mu wɔruma.'], distractorsFr: ['Le soleil brille', 'Il pleut', 'L\'eau coule'] },
    { french: 'Père, fais-nous savoir que tu es Dieu', bariba: 'Baaba, ade sa n yɛ̃ mɛ̀ wunaa Gusunɔ.', context: 'Prière de révélation', distractorsBa: ['Gusunɔ bɑkɑ.', 'Gusunɔn durom.', 'Gusunɔ u n wure.'], distractorsFr: ['Dieu est grand', 'Grâce à Dieu', 'Si Dieu le veut'] },
    { french: 'Le coupable n\'a pas raison', bariba: 'Bikio kùn toro.', context: 'Jugement moral', distractorsBa: ['U gem mɔ.', 'Tɔ̃yɑ mɔ.', 'Gɔ̃ru pii.'], distractorsFr: ['Il a raison', 'C\'est la vérité', 'Il est gentil'] },
    { french: 'Le vendredi prochain nous irons', bariba: 'Sa ko yam mi da arusuma baka yè ya we.', context: 'Jour sacré de la semaine', distractorsBa: ['Sa doona yɑm.', 'Sa na dɑkɑ.', 'Sa dɔɔ.'], distractorsFr: ['Nous partons aujourd\'hui', 'Nous arrivons hier', 'Nous dormons'] },
  ],

  // ─────────────────────────────────────────────────────────────────
  // PROVERBES & CULTURE (15 exercices)
  // Sources: idiomes-2.json IDM_PROV_053-055, dictionnaire, phrases
  // ─────────────────────────────────────────────────────────────────
  proverbes: [
    { french: 'L\'union fait la force (Une seule bouche)', bariba: 'Nɔɔ tiɑ.', context: 'Proverbe sur l\'unité', distractorsBa: ['Wɔmun sira tura, bu ka ge bɔke.', 'Wi u ... kĩ, u mɔɔ.', 'Tɔ̃yɑ mɔ.'], distractorsFr: ['L\'autonomie suffit', 'Qui veut prenne', 'C\'est la vérité'] },
    { french: 'La queue du singe suffit pour l\'attacher', bariba: 'Wɔmun sira tura, bu ka ge bɔke.', context: 'Se suffire à soi-même', distractorsBa: ['Nɔɔ tiɑ.', 'Wi u ... kĩ, u mɔɔ.', 'Gusunɔ bɑkɑ.'], distractorsFr: ['L\'union fait la force', 'Qui veut prenne', 'Dieu est grand'] },
    { french: 'Celui qui veut, qu\'il prenne', bariba: 'Wi u ... kĩ, u mɔɔ.', context: 'Libre arbitre', distractorsBa: ['Nɔɔ tiɑ.', 'Wɔmun sira tura, bu ka ge bɔke.', 'Gusunɔ u n wure.'], distractorsFr: ['L\'union fait la force', 'L\'autonomie suffit', 'Si Dieu le veut'] },
    { french: 'Si nous nous entendons, nous pourrons porter un éléphant', bariba: 'Nɔɔ gàn nɛra, sa ko suunu sɔbe.', context: 'Proverbe sur la solidarité', distractorsBa: ['Nɔɔ tiɑ.', 'Bɑɑwure.', 'Tɔ̃yɑ mɔ.'], distractorsFr: ['L\'union fait la force', 'Tout le monde', 'C\'est la vérité'] },
    { french: 'Le panier a beau être joli, il ne peut contenir de l\'eau', bariba: 'Baa bireru tàn buram nɛ, ta ǹ kpɛ̃ tu nim nɛnɛ.', context: 'Apparences trompeuses', distractorsBa: ['Nim mu do.', 'Gari ya sɛ̃.', 'Tɔ̃yɑ mɔ.'], distractorsFr: ['L\'eau est bonne', 'C\'est difficile', 'C\'est la vérité'] },
    { french: 'On n\'apprend pas au bord de la route', bariba: 'Ba ku ra baaru yɛ̃ɛsu sɔ̃.', context: 'L\'apprentissage demande un cadre', distractorsBa: ['Swaa ya do.', 'Gberu ya kpã.', 'Yɛnu ya do.'], distractorsFr: ['La route est bonne', 'Le champ est grand', 'La maison est belle'] },
    { french: 'L\'imbécile ne sait pas qu\'il peut revenir bredouille de la chasse', bariba: 'Asiro u kù ra n yĩiyɔ dama yerɔ u koo sɔnda.', context: 'Sagesse sur la prévoyance', distractorsBa: ['Taaso u na.', 'U sɔmburu de.', 'U doona.'], distractorsFr: ['Le chasseur est arrivé', 'Il travaille', 'Il est parti'] },
    { french: 'Débiter des cynismes dévalorise l\'homme', bariba: 'Baa goru ta rà tɔnu biru wesiewa.', context: 'Proverbe sur la parole', distractorsBa: ['Nɔɔ dɔɔ.', 'Gɔ̃ru pii.', 'Tɔ̃yɑ mɔ.'], distractorsFr: ['Bouche sucrée', 'Cœur blanc', 'C\'est la vérité'] },
    { french: 'Tel est le moineau aujourd\'hui, ainsi qu\'il était quand le charognard naissait', bariba: 'Mɛ̀ bii swia ya nɛ, mɛna ya nɛ ba ka yabereku marà.', context: 'Proverbe sur la constance', distractorsBa: ['Gue ya do.', 'Abereku u na.', 'Bii u mara.'], distractorsFr: ['Le poulet est bon', 'Le vautour est arrivé', 'L\'enfant est né'] },
    { french: 'A chacun la part qui lui revient', bariba: 'Baabakan baa, baawere ka win baa.', context: 'Justice distributive', distractorsBa: ['Bɑɑwure.', 'Tɔ̃yɑ mɔ.', 'Yen sɔ̃.'], distractorsFr: ['Tout le monde', 'C\'est la vérité', 'C\'est pourquoi'] },
    { french: 'Le don pour lequel on ne remercie pas n\'a pas de valeur', bariba: 'Kɛ̃ɛ tè ta ǹ takaru mɔ, warara.', context: 'Importance de la gratitude', distractorsBa: ['Nɑ kɑ̃i nin tɛriɑ.', 'Kɑsɔru kun mɔ.', 'Siara.'], distractorsFr: ['Merci beaucoup', 'De rien', 'Content'] },
    { french: 'Que chaque singe mange le fruit de son arbre', bariba: 'Wɔmu baagere gu gen sɔ̃ɔn beeru di.', context: 'Autonomie et indépendance', distractorsBa: ['Wɔmu u dĩa di.', 'Dãru ya kpã.', 'Bii u dĩa di.'], distractorsFr: ['Le singe mange', 'L\'arbre est grand', 'L\'enfant mange'] },
    { french: 'Celui qui fait les partages ne se prive pas', bariba: 'Bɔnu kowo u ku ra win baa bie.', context: 'Proverbe sur la générosité intéressée', distractorsBa: ['U gobi mɔ.', 'U sɔmburu de.', 'U dĩa di.'], distractorsFr: ['Il a de l\'argent', 'Il travaille', 'Il mange'] },
    { french: 'Ce qui ne fait pas de fissure ne se casse pas', bariba: 'Yè ya ku ra beu ko, ya ku ra kɔre.', context: 'Proverbe sur la résistance', distractorsBa: ['Ya kpã.', 'Ya do.', 'Ya sɛ̃.'], distractorsFr: ['C\'est grand', 'C\'est bon', 'C\'est difficile'] },
    { french: 'L\'aveugle attentif sait tâtonner', bariba: 'Wɔ̃ ko daakarigii u babibu yɛ̃.', context: 'Proverbe sur l\'adaptation', distractorsBa: ['U gum mɔ.', 'U sɔmburu de.', 'U swaa yɛ̃.'], distractorsFr: ['Il est malade', 'Il travaille', 'Il connaît le chemin'] },
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
    return shuffleArray([exercise.bariba, ...exercise.distractorsBa]);
  } else {
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

// Compter le total des exercices
export function getTotalExerciseCount(): number {
  return Object.values(EXERCISES).reduce((total, exercises) => total + exercises.length, 0);
}
