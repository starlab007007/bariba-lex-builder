// ═══════════════════════════════════════════════════════════════════════════════
// MODULE CLASSE - NIVEAU 1 BARIBA (BAATONUM)
// Contenu 100% extrait du Manuel de l'apprenant, Guide d'enseignement,
// et Module de formation. RIEN N'EST INVENTÉ.
// ═══════════════════════════════════════════════════════════════════════════════

export interface ClasseLesson {
  id: number;
  title: string;
  theme: string;
  themeLabel: string;
  letters: string;
  text: string;
  observe: string[];
  ecoute: string[];
  reagis: string[];
  retiens: string;
  entraineToi: {
    syllables: string[];
    words: string[];
    phrases: string[];
  };
}

export interface ClasseEvaluation {
  id: number;
  title: string;
  afterLesson: number;
  sections: {
    label: string;
    questions: string[];
  }[];
  dictation?: string[];
}

export interface CalculLesson {
  id: string;
  title: string;
  titleBa: string;
  content: string;
  exercises: { question: string; answer: string }[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// THEMES
// ═══════════════════════════════════════════════════════════════════════════════

export const CLASSE_THEMES = [
  { id: 'tii_dobonu', label: 'Tii dobonu', labelFr: 'Le travail', icon: '🔨' },
  { id: 'baa_ka_maeron', label: 'Baa ka mæron nøøsinaa', labelFr: 'Famille et enfants', icon: '👨‍👩‍👧‍👦' },
  { id: 'goo_yeru', label: 'Gøø yeru', labelFr: 'Construction', icon: '🏠' },
  { id: 'gonnaru', label: 'Gønnaru', labelFr: 'Le mariage', icon: '💍' },
  { id: 'taetae_toobu', label: 'Tætæ toobu', labelFr: 'L\'impôt', icon: '📋' },
  { id: 'saem', label: 'Sæm', labelFr: 'La santé', icon: '🏥' },
  { id: 'woo_pii', label: 'Wøø pii', labelFr: 'L\'eau', icon: '💧' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// LEÇONS - Extraites du Manuel de l'apprenant Niveau 1
// ═══════════════════════════════════════════════════════════════════════════════

export const CLASSE_LESSONS: ClasseLesson[] = [
  {
    id: 1,
    title: 'Bææræ sariru',
    theme: 'tii_dobonu',
    themeLabel: 'Tii dobonu',
    letters: 'u, a, k',
    text: 'Bææræ sariru — Tii dobonu',
    observe: [
      'Kari yerà ya wáa koma ni kpuro søø?',
      'Bwisi yirà a døba faagi ye søø?',
    ],
    ecoute: [],
    reagis: [],
    retiens: 'Bææræ sariru',
    entraineToi: {
      syllables: ['su', 'tam', 'kam'],
      words: ['kuku', 'kua', 'kuuka'],
      phrases: ['u kua kuku', 'u kuuka kua'],
    },
  },
  {
    id: 2,
    title: 'Bararun swaa',
    theme: 'tii_dobonu',
    themeLabel: 'Tii dobonu',
    letters: 'n',
    text: 'Bararun swaa — Nim',
    observe: [],
    ecoute: [],
    reagis: ['Amøna n weenæ su ko su ka bara nin bweseru weeri?'],
    retiens: 'Bararun swaa',
    entraineToi: {
      syllables: ['nim', 'bu', 'ram', 'nø'],
      words: ['nim', 'nana', 'kaanu'],
      phrases: ['nana u ka kaanu na'],
    },
  },
  {
    id: 3,
    title: 'Bæsæn wøø beran bararu',
    theme: 'tii_dobonu',
    themeLabel: 'Tii dobonu',
    letters: 'i',
    text: 'Bæsæn wøø beran bararu — Nim',
    observe: [],
    ecoute: [],
    reagis: ['Su ka nim baranu suuri, amøna n weenæ su ko?'],
    retiens: 'Bæsæn wøø beran bararu',
    entraineToi: {
      syllables: ['de', 'ri', 'nim', 'kam'],
      words: ['deri', 'nia', 'kuuka'],
      phrases: ['na nia'],
    },
  },
  {
    id: 4,
    title: 'Marùbu dangaru käbu',
    theme: 'baa_ka_maeron',
    themeLabel: 'Bii mæroru',
    letters: 'e',
    text: 'Marùbu dangaru käbu — Bii mæroru',
    observe: [],
    ecoute: [],
    reagis: ['Mba n weenæ su deri yænu ga n ka bwäri yæmbu mø?'],
    retiens: 'Marùbu dangaru käbu',
    entraineToi: {
      syllables: ['ma', 'ru', 'bu', 'ki', 'ri'],
      words: ['marubu', 'deri', 'kiri'],
      phrases: ['a akeke na'],
    },
  },
  {
    id: 5,
    title: 'Søødo ka win samaa',
    theme: 'baa_ka_maeron',
    themeLabel: 'Bii mæroru',
    letters: 'æ',
    text: 'Søødo ka win samaa — Bii mæroru',
    observe: [],
    ecoute: [],
    reagis: ['Mban sóna n weenæ su bii dabirun marubu kawa?'],
    retiens: 'Søødo ka win samaa',
    entraineToi: {
      syllables: ['mæ', 'ro', 'bwáa', 'do'],
      words: ['mæro', 'bwáa', 'dobun'],
      phrases: ['bibu ka mæron bwáa dobun só'],
    },
  },
  {
    id: 6,
    title: 'Bwäri yæmbu komarun diya',
    theme: 'baa_ka_maeron',
    themeLabel: 'Baa ka mæron nøøsinaa',
    letters: 'nøøsinaa',
    text: 'Bwäri yæmbu, komarun diya — Baa ka mæron nøøsinaa',
    observe: [],
    ecoute: [],
    reagis: [],
    retiens: 'Bwäri yæmbu komarun diya',
    entraineToi: {
      syllables: ['nøø', 'si', 'naa'],
      words: ['nøøsinaa', 'bwäri'],
      phrases: ['baa ka mæron nøøsinaa'],
    },
  },
  {
    id: 7,
    title: 'Daagiin daa biru kunda',
    theme: 'baa_ka_maeron',
    themeLabel: 'Baa ka mæron nøøsinaa',
    letters: 'r',
    text: 'Daagiin daa biru kunda — Baa ka mæron nøøsinaa',
    observe: [],
    ecoute: [],
    reagis: ['Amøna n weenæ baa ka mæro ba n sáa yænu søø?'],
    retiens: 'Daagiin daa biru kunda',
    entraineToi: {
      syllables: ['mæ', 'ron', 'ge', 'ru'],
      words: ['mæron', 'gerunæ', 'nari'],
      phrases: ['nari ka suuru'],
    },
  },
  {
    id: 8,
    title: 'Bwisi døbabu',
    theme: 'goo_yeru',
    themeLabel: 'Wáa yeru',
    letters: 'o',
    text: 'Bwisi døbabu — Wáa yeru',
    observe: [],
    ecoute: [],
    reagis: ['Amøna sa ko ko bæsæn wáa yerø sa n ka bwáa do?'],
    retiens: 'Bwisi døbabu',
    entraineToi: {
      syllables: ['se', 'ko', 'ku'],
      words: ['seko', 'koku', 'sokoru'],
      phrases: ['seko u sokoru kua'],
    },
  },
  {
    id: 9,
    title: 'Wuu burø',
    theme: 'goo_yeru',
    themeLabel: 'Wáa yeru',
    letters: 'ø',
    text: 'Wuu burø — Wáa yeru',
    observe: [],
    ecoute: [],
    reagis: ['Amøna n weenæ su bæsæn køkørøsu nænusina?'],
    retiens: 'Wuu burø',
    entraineToi: {
      syllables: ['kø', 'kø', 'rø', 'su'],
      words: ['køkørøsu', 'køre', 'sunø'],
      phrases: ['surøku u sørøkøru kasuu'],
    },
  },
  {
    id: 10,
    title: 'Gobi kùn sàmbinu',
    theme: 'goo_yeru',
    themeLabel: 'Gøø yeru',
    letters: 'wærun yíreru',
    text: 'Gobi kùn sàmbinu — Gøø yeru',
    observe: [],
    ecoute: [],
    reagis: ['Amøna n weenæ su käru koosina wöru søø?'],
    retiens: 'Gobi kùn sàmbinu',
    entraineToi: {
      syllables: [],
      words: [],
      phrases: [],
    },
  },
  {
    id: 11,
    title: 'Gønnaru',
    theme: 'gonnaru',
    themeLabel: 'Gønnaru',
    letters: '? ! h',
    text: 'Gønnaru — Yóø ka Dama ba wöru yinna Sikiø.',
    observe: [],
    ecoute: [],
    reagis: ['Gønnaru ta ra be mæro bisiru dam sosiwa?'],
    retiens: 'Gønnaru',
    entraineToi: {
      syllables: ['ɛ', 'hɛ'],
      words: ['sinani', 'karo', 'sero'],
      phrases: ['sinani u nɛɛ karo !', 'kaa nira a kɔsuka ?'],
    },
  },
  {
    id: 12,
    title: 'Tætæ toobun gari',
    theme: 'taetae_toobu',
    themeLabel: 'Tætæ toobu',
    letters: 'b',
    text: 'Tætæ toobun gari — Tætæ toobu',
    observe: [],
    ecoute: [],
    reagis: ['Mba n weenæ su deri tætæ toobun saa?'],
    retiens: 'Tætæ toobun gari',
    entraineToi: {
      syllables: ['too', 'bu'],
      words: ['toobu', 'tætæ', 'wæræru'],
      phrases: ['baababa ba bè bækia'],
    },
  },
  {
    id: 13,
    title: 'Sekuru',
    theme: 'taetae_toobu',
    themeLabel: 'Tætæ toobu',
    letters: 'm',
    text: 'Sekuru — Tætæ toobu',
    observe: [],
    ecoute: [],
    reagis: ['Ka dabiru, tóø terà ba ra tætæ to Benæ temø?'],
    retiens: 'Sekuru',
    entraineToi: {
      syllables: ['ya', 'ru', 'su', 'ma'],
      words: ['yarusuma', 'buuwa', 'tɛtɛ'],
      phrases: ['yarusuma buuwa ba ra tɛtɛ to bɛnɛ tɛmɔ'],
    },
  },
  {
    id: 14,
    title: 'Góø gà n køsa yasibu bù køsi',
    theme: 'saem',
    themeLabel: 'Sæm',
    letters: 'w',
    text: 'Góø gà n køsa yasibu bù køsi — Sæm',
    observe: [],
    ecoute: [],
    reagis: ['Mba n weenæ kurø møro ù ko bù ku ka ben yænugibu døra?'],
    retiens: 'Góø gà n køsa yasibu bù køsi',
    entraineToi: {
      syllables: ['wa', 'sa'],
      words: ['wasawasa', 'woru', 'wooru'],
      phrases: ['woru u wooru nøømø'],
    },
  },
  {
    id: 15,
    title: 'Wáaradon wáa yeru',
    theme: 'saem',
    themeLabel: 'Sæm',
    letters: 't',
    text: 'Wáaradon wáa yeru — Sæm',
    observe: [],
    ecoute: [],
    reagis: ['Amøna n weenæ tønun wáa yeru ta n sáa?'],
    retiens: 'Wáaradon wáa yeru',
    entraineToi: {
      syllables: ['tø', 'nu', 'wáa'],
      words: ['tønun', 'taasu', 'kætæ'],
      phrases: ['taasu u kætæ tubi tasoø'],
    },
  },
  {
    id: 16,
    title: 'Dom serubu',
    theme: 'woo_pii',
    themeLabel: 'Wøø pii',
    letters: 'd',
    text: 'Dom serubu — Wøø pii',
    observe: [],
    ecoute: [],
    reagis: ['Mba n da ka bara te næ?'],
    retiens: 'Dom serubu',
    entraineToi: {
      syllables: ['di', 'si', 'nu'],
      words: ['disinu', 'barara', 'duari'],
      phrases: ['a ku duari a diru kura', 'disinu barara'],
    },
  },
  {
    id: 17,
    title: 'Gari yi yu nøø basa',
    theme: 'woo_pii',
    themeLabel: 'Wøø pii',
    letters: 'p',
    text: 'Gari yi yu nøø basa — Wøø pii',
    observe: [],
    ecoute: [],
    reagis: ['Nim mænà n weenæ sa n da nø su ka nim baranu suuri?'],
    retiens: 'Gari yi yu nøø basa',
    entraineToi: {
      syllables: ['pøm', 'pi'],
      words: ['pømpi', 'pæræku', 'sokura'],
      phrases: ['sa n da pømpi nim nø', 'pæræku ga sokura'],
    },
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// EVALUATIONS (Yaayasiabu) - du Manuel
// ═══════════════════════════════════════════════════════════════════════════════

export const CLASSE_EVALUATIONS: ClasseEvaluation[] = [
  {
    id: 1,
    title: 'Yaayasiabu gbiikibu',
    afterLesson: 3,
    sections: [
      {
        label: 'I',
        questions: [
          'Daa kósi yirà yi bææn wuu biru wesiamø?',
        ],
      },
      {
        label: 'II',
        questions: [
          'Amøna ba ra ka sida yankusinæ?',
          'Amøna n weenæ ba n da ka sida barø nænusinæ?',
        ],
      },
    ],
    dictation: [
      'nia ka Naki', 'u kua kuku', 'u kuuka kua',
      'u kiina nuka', 'a naanaanu kua, a kukua',
      'akiika, naana u niki na ka naa',
    ],
  },
  {
    id: 2,
    title: 'Yaayasiabu yiruse',
    afterLesson: 9,
    sections: [
      {
        label: 'I',
        questions: [
          'Berà n weɛnɛ bù wuu sɔmɛ?',
          'Yarufaani yerà ya wáa wuun sɔmbu sɔɔ?',
        ],
      },
    ],
    dictation: [
      'nari u sáa sina sesu',
      'u keu kua u kurasia kørøkuø',
      'sisiru, sunø u raa kura u sóø saarø',
      'nari u na ka kækæ',
      'koto u nari senna',
    ],
  },
  {
    id: 3,
    title: 'Yaayasiabu itase',
    afterLesson: 17,
    sections: [
      {
        label: 'I',
        questions: ['Mba n da n gøø yeru?', 'Amøna n weenæ su gøø yeru koosina?'],
      },
      {
        label: 'II',
        questions: ['Berà ka berà ba ra gønnæ deemaan swaa søø?', 'Mban sóna n weenæ su gønnaru dam wä?'],
      },
      {
        label: 'III',
        questions: ['Swaa yerà søøra ba ra tætæ to?', 'Amøna n weenæ sa n sáa tætæn saa?'],
      },
      {
        label: 'IV',
        questions: [
          'Amøna ba ra ka wøø pii tubusinæ?',
          'Wøø pii yà n tønu mwa, amøna n weenæ su ko?',
          'Amøna ba ra ka wøø pii yanku',
        ],
      },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// ALPHABET BARIBA - du Guide d'enseignement
// ═══════════════════════════════════════════════════════════════════════════════

export const BARIBA_ALPHABET = {
  vowels: [
    { letter: 'a', upper: 'A', example: 'aka' },
    { letter: 'æ', upper: 'Æ', example: 'mæro' },
    { letter: 'e', upper: 'E', example: 'deri' },
    { letter: 'ɛ', upper: 'Ɛ', example: 'ɛhɛɛ' },
    { letter: 'i', upper: 'I', example: 'nia' },
    { letter: 'o', upper: 'O', example: 'seko' },
    { letter: 'ø', upper: 'Ø', example: 'køkørøsu' },
    { letter: 'u', upper: 'U', example: 'kuku' },
  ],
  consonants: [
    { letter: 'b', upper: 'B', example: 'baababa' },
    { letter: 'd', upper: 'D', example: 'disinu' },
    { letter: 'g', upper: 'G', example: 'gønnaru' },
    { letter: 'h', upper: 'H', example: 'ɛhɛɛ' },
    { letter: 'k', upper: 'K', example: 'kuku' },
    { letter: 'm', upper: 'M', example: 'marubu' },
    { letter: 'n', upper: 'N', example: 'nim' },
    { letter: 'p', upper: 'P', example: 'pømpi' },
    { letter: 'r', upper: 'R', example: 'nari' },
    { letter: 's', upper: 'S', example: 'seko' },
    { letter: 't', upper: 'T', example: 'tætæ' },
    { letter: 'w', upper: 'W', example: 'wasawasa' },
    { letter: 'y', upper: 'Y', example: 'yarusuma' },
  ],
  tones: {
    description: 'Baatønum a trois tons : bas, moyen et élevé',
    bas: 'Ton bas (sans marque)',
    moyen: 'Ton moyen (sans marque)',
    eleve: 'Ton élevé (accent aigu : á)',
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// CALCUL & GESTION - du Module de formation
// ═══════════════════════════════════════════════════════════════════════════════

export const CALCUL_LESSONS: CalculLesson[] = [
  {
    id: 'numeration',
    title: 'Numération',
    titleBa: 'Dootinun yora',
    content: 'Le tableau de numération : Millier, Centaine, Dizaine, Unité. Apprendre à lire et écrire les nombres de 1 à 1000.',
    exercises: [
      { question: '25 + 13 = ?', answer: '38' },
      { question: '100 - 45 = ?', answer: '55' },
      { question: 'Écris en chiffres : cent vingt-trois', answer: '123' },
      { question: 'Écris en chiffres : cinq cent', answer: '500' },
    ],
  },
  {
    id: 'addition',
    title: 'Addition',
    titleBa: 'Doorun kobu',
    content: 'Addition avec ou sans retenue des nombres entiers.',
    exercises: [
      { question: '34 + 21 = ?', answer: '55' },
      { question: '156 + 234 = ?', answer: '390' },
      { question: '89 + 47 = ?', answer: '136' },
      { question: '405 + 595 = ?', answer: '1000' },
    ],
  },
  {
    id: 'soustraction',
    title: 'Soustraction',
    titleBa: 'Doorun wiabu',
    content: 'Soustraction avec ou sans retenue des nombres entiers.',
    exercises: [
      { question: '87 - 32 = ?', answer: '55' },
      { question: '500 - 125 = ?', answer: '375' },
      { question: '243 - 98 = ?', answer: '145' },
      { question: '1000 - 750 = ?', answer: '250' },
    ],
  },
  {
    id: 'multiplication',
    title: 'Multiplication',
    titleBa: 'Doorun bwesibu',
    content: 'Multiplication avec ou sans retenue des nombres entiers.',
    exercises: [
      { question: '12 × 5 = ?', answer: '60' },
      { question: '25 × 4 = ?', answer: '100' },
      { question: '15 × 8 = ?', answer: '120' },
      { question: '50 × 20 = ?', answer: '1000' },
    ],
  },
  {
    id: 'division',
    title: 'Division',
    titleBa: 'Doorun siabu',
    content: 'Division des nombres entiers avec et sans reste.',
    exercises: [
      { question: '100 ÷ 5 = ?', answer: '20' },
      { question: '84 ÷ 4 = ?', answer: '21' },
      { question: '75 ÷ 3 = ?', answer: '25' },
      { question: '150 ÷ 6 = ?', answer: '25' },
    ],
  },
  {
    id: 'mesures',
    title: 'Mesures',
    titleBa: 'Yèesu kpäasia',
    content: 'Mesures de longueur (km, hm, dam, m, dm, cm, mm), mesures de masse (kg, hg, dag, g, dg, cg, mg), mesures de capacité (hL, daL, L, dL, cL, mL).',
    exercises: [
      { question: '1 km = ? m', answer: '1000' },
      { question: '1 kg = ? g', answer: '1000' },
      { question: '1 L = ? mL', answer: '1000' },
      { question: '500 cm = ? m', answer: '5' },
    ],
  },
  {
    id: 'monnaie',
    title: 'Monnaie',
    titleBa: 'Wáa yeru',
    content: 'La monnaie, prix d\'achat, frais, prix de revient, prix de vente, bénéfice, perte.',
    exercises: [
      { question: 'Prix d\'achat: 500 F, Frais: 100 F. Prix de revient = ?', answer: '600' },
      { question: 'Prix de vente: 800 F, Prix de revient: 600 F. Bénéfice = ?', answer: '200' },
      { question: 'Prix d\'achat: 1000 F, Prix de vente: 850 F. Perte = ?', answer: '150' },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// MODE FACILITATEUR - du Guide d'enseignement
// ═══════════════════════════════════════════════════════════════════════════════

export const FACILITATOR_GUIDE = {
  amorce: {
    title: 'Amorce (Yorin kobu)',
    titleBa: 'Yorin kobu',
    steps: [
      'Faire l\'appel des apprenants',
      'Rappeler la leçon précédente par des questions',
      'Introduire le thème du jour par une situation problème',
      'Faire observer l\'image du manuel',
      'Poser les questions de la rubrique "Observe"',
    ],
  },
  developpement: {
    title: 'Développement (Yorin garibu)',
    titleBa: 'Yorin garibu ka yin tububu',
    steps: [
      'Lire le texte à haute voix (lecture du maître)',
      'Faire lire les apprenants à tour de rôle',
      'Poser les questions "Écoute et réponds"',
      'Engager la discussion avec "Réagis"',
      'Présenter la phrase clé "Retiens"',
      'Extraction de la lettre du jour',
      'Identification du mot clé, de la syllabe clé',
      'Construction de syllabes avec la lettre du jour',
      'Construction de mots et de phrases',
      'Écriture de la lettre du jour au tableau',
      'Écriture dans les cahiers',
    ],
  },
  evaluation: {
    title: 'Évaluation (Yaayasiabu)',
    titleBa: 'Yaayasiabu',
    steps: [
      'Exercices de renforcement "Entraîne-toi"',
      'Questions orales sur le contenu de la leçon',
      'Dictée de syllabes, mots et phrases',
      'Exercices de maison',
    ],
  },
  conseils: [
    'Respecter le rythme des apprenants adultes',
    'Utiliser des exemples concrets de la vie quotidienne',
    'Encourager la participation de tous',
    'Varier les activités pour maintenir l\'intérêt',
    'Ne pas humilier un apprenant qui fait une erreur',
    'Faire participer les apprenants aux discussions',
    'Utiliser le tableau pour les démonstrations',
    'Prévoir des exercices de maison simples',
  ],
  planification: {
    totalSessions: 288,
    sessionsPerWeek: 12,
    totalWeeks: 24,
    sessionTypes: [
      'Leçons de lecture-écriture',
      'Leçons de calcul/gestion',
      'Révisions périodiques',
      'Évaluations',
    ],
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// PROGRESSION (helpers localStorage)
// ═══════════════════════════════════════════════════════════════════════════════

const STORAGE_KEY = 'fitila-classe-progress';

export interface ClasseProgress {
  completedLessons: number[];
  evaluationScores: Record<number, number>;
  lastLesson: number;
  completedCalcul: string[];
}

export function getClasseProgress(): ClasseProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { completedLessons: [], evaluationScores: {}, lastLesson: 0, completedCalcul: [] };
}

export function saveClasseProgress(progress: ClasseProgress) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

export function markLessonComplete(lessonId: number) {
  const p = getClasseProgress();
  if (!p.completedLessons.includes(lessonId)) {
    p.completedLessons.push(lessonId);
    p.lastLesson = lessonId;
    saveClasseProgress(p);
  }
}

export function saveEvaluationScore(evalId: number, score: number) {
  const p = getClasseProgress();
  p.evaluationScores[evalId] = score;
  saveClasseProgress(p);
}
