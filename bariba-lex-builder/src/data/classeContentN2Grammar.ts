// Grammaire N2 — Extracted from Module de Formation N2
// 7 sections with interactive quizzes

export interface GrammarSection {
  id: string;
  title: string;
  titleFr: string;
  emoji: string;
  gradient: string;
  content: GrammarBlock[];
  quiz: GrammarQuiz[];
}

export interface GrammarBlock {
  type: 'text' | 'table' | 'list' | 'example' | 'rule' | 'diagram';
  title?: string;
  titleFr?: string;
  content?: string;
  contentFr?: string;
  items?: string[];
  itemsFr?: string[];
  rows?: string[][];
  headers?: string[];
  color?: string;
}

export interface GrammarQuiz {
  question: string;
  questionFr: string;
  options: string[];
  correct: number;
  explanation?: string;
  explanationFr?: string;
}

export const GRAMMAR_N2_SECTIONS: GrammarSection[] = [
  // ===== 1. RAPPEL ALPHABET =====
  {
    id: 'alphabet',
    title: 'Sɔ̃ɔsirun saawaraba',
    titleFr: 'Rappel de l\'alphabet',
    emoji: '🔤',
    gradient: 'from-amber-400 to-orange-400',
    content: [
      {
        type: 'rule',
        title: 'Yori piibunu (Voyelles)',
        titleFr: 'Voyelles du Baatonum',
        content: 'Baatɔnum sɔɔ yori piibunu wãawa wɔkuru : a, e, ɛ, i, o, ɔ, u, ã, ɛ̃, ĩ, ɔ̃, ũ. Piibunu nɔba nɔɔbu ba nɔ̃ɔ sɛmbuwa (voyelles nasales) : ã, ɛ̃, ĩ, ɔ̃, ũ.',
        contentFr: 'Le Baatonum possède 12 voyelles : a, e, ɛ, i, o, ɔ, u, ã, ɛ̃, ĩ, ɔ̃, ũ. 5 sont nasales : ã, ɛ̃, ĩ, ɔ̃, ũ.',
      },
      {
        type: 'table',
        title: 'Yori piibunu ka bakanu',
        headers: ['Type', 'Lettres', 'Exemples'],
        rows: [
          ['Voyelles orales', 'a, e, ɛ, i, o, ɔ, u', 'baa (père), keu (classe), bɛrɛ (grand)'],
          ['Voyelles nasales', 'ã, ɛ̃, ĩ, ɔ̃, ũ', 'dãa (animal), sɛ̃ɛ (marché), sĩi (s\'asseoir)'],
          ['Consonnes simples', 'b, d, g, k, m, n, p, r, s, t, w, y', 'bii (enfant), diru (maison)'],
          ['Consonnes doubles', 'gb, kp, nw, ny', 'gberu (poids), kpãa (champ)'],
          ['Consonnes spéciales', 'ǹ (n syllabique)', 'ǹ kùn (ne...pas)'],
        ],
      },
      {
        type: 'list',
        title: 'Yori piibunun sɛmbu bwese bweseka',
        titleFr: 'Distinctions entre voyelles',
        items: [
          'e/ɛ : kere (partir) ≠ kɛrɛ (appeler)',
          'o/ɔ : doo (venir) ≠ dɔɔ (aller)',
          'a/ã : baa (père) ≠ bãa (bouche)',
          'i/ĩ : bi (noir) ≠ bĩ (savoir)',
          'u/ũ : bu (tuer) ≠ bũ (souffler)',
        ],
      },
    ],
    quiz: [
      { question: 'Yori piibunu nyewa nu wãa Baatɔnum sɔɔ?', questionFr: 'Combien de voyelles a le Baatonum?', options: ['7', '10', '12', '15'], correct: 2, explanation: 'Baatɔnum sɔɔ yori piibunu wãawa wɔkuru yiru (12).', explanationFr: 'Le Baatonum a 12 voyelles (7 orales + 5 nasales).' },
      { question: 'Yori piibunu nɔ̃ɔ sɛmbu nìwa nde?', questionFr: 'Laquelle est une voyelle nasale?', options: ['a', 'ɛ', 'ã', 'u'], correct: 2, explanation: 'ã ya sãa yori piibun nɔ̃ɔ sɛmbuwa.', explanationFr: 'ã est une voyelle nasale.' },
      { question: '"dãa" garin kɔ̀kɔrɔ nìwa?', questionFr: 'Que signifie "dãa"?', options: ['maison', 'père', 'animal', 'champ'], correct: 2, explanation: 'dãa = animal/bête', explanationFr: 'dãa = animal' },
      { question: 'Yori bakanu yiru nì nu sãa yoru goo?', questionFr: 'Quelles sont des consonnes doubles?', options: ['b, d', 'gb, kp', 'm, n', 's, t'], correct: 1, explanation: 'gb ka kp ba sãa yori bakanu yiru nì nu sãa yoru goo.', explanationFr: 'gb et kp sont des consonnes doubles (digraphes).' },
    ],
  },

  // ===== 2. TONS =====
  {
    id: 'tons',
    title: 'Sɔ̃ɔsirun tundu (Tons)',
    titleFr: 'Les tons',
    emoji: '🎵',
    gradient: 'from-blue-400 to-indigo-400',
    content: [
      {
        type: 'rule',
        title: 'Tundu bwese bweseka',
        titleFr: 'Types de tons en Baatonum',
        content: 'Baatɔnum sɔɔ tundu ita wãawa : tundun dàmu (ton bas, marqué ` ), tundun demu (ton haut, sans marque), ka tundun yisebu (ton descendant). Tundu ya ra gari kɔ̀kɔrɔ bɔrua.',
        contentFr: 'Le Baatonum a 3 tons : bas (marqué `), haut (non marqué), et descendant. Les tons changent le sens des mots.',
      },
      {
        type: 'table',
        title: 'Tundu seedabu',
        headers: ['Mot', 'Ton', 'Sens'],
        rows: [
          ['dà', 'Bas', 'acheter'],
          ['da', 'Haut', 'mettre'],
          ['bà', 'Bas', 'venir'],
          ['ba', 'Haut', 'ils/elles'],
          ['kò', 'Bas', 'cultiver'],
          ['ko', 'Haut', 'faire'],
          ['sà', 'Bas', 'verser'],
          ['sa', 'Haut', 'nous (excl.)'],
        ],
      },
      {
        type: 'example',
        title: 'Nɔ̃ɔ sɛmbu (Nasalisation)',
        content: 'Yori piibun nɔ̃ɔ sɛmbura ya ra yori piiburu nɔ̃ɔ sɔɔ geetimɔ : ã, ɛ̃, ĩ, ɔ̃, ũ. Piibunu nini ba ra seeda yèn ǹ nì nu nɔ̃ɔ sɛmbu mɔ bɔrua.',
        contentFr: 'La nasalisation produit 5 voyelles nasales distinctes. Ces voyelles se distinguent clairement des voyelles orales correspondantes.',
      },
      {
        type: 'list',
        title: 'Nɔ̃ɔ sɛmbun seedabu',
        items: [
          'ba (ils) ≠ bã (bouche) — oral vs nasal',
          'si (s\'asseoir) ≠ sĩ (se coucher)',
          'du (entrer) ≠ dũ (aiguiser)',
          'ko (faire) ≠ kɔ̃ (refuser)',
          'kere (partir) ≠ kɛ̃rɛ (pleurer)',
        ],
      },
    ],
    quiz: [
      { question: 'Tundu nyewa nu wãa Baatɔnum sɔɔ?', questionFr: 'Combien de tons a le Baatonum?', options: ['2', '3', '4', '5'], correct: 1, explanation: 'Tundu ita: dàmu, demu, ka yisebu.', explanationFr: '3 tons : bas, haut, descendant.' },
      { question: '"dà" (ton bas) kɔ̀kɔrɔ nìwa?', questionFr: 'Que signifie "dà" (ton bas)?', options: ['mettre', 'acheter', 'venir', 'faire'], correct: 1, explanation: 'dà (ton bas) = acheter', explanationFr: 'dà (ton bas) = acheter' },
      { question: 'Tundu dàmu gɔ̀kɔ̀ru nìwa?', questionFr: 'Quel est le signe du ton bas?', options: ['´ (accent aigu)', '` (accent grave)', '~ (tilde)', 'Aucun'], correct: 1, explanation: 'Tundu dàmun gɔ̀kɔ̀ru ` (accent grave)', explanationFr: 'Le ton bas se marque avec ` (accent grave).' },
    ],
  },

  // ===== 3. CLASSES NOMINALES =====
  {
    id: 'classes_nominales',
    title: 'Tɔɔ bwese bweseka (Classes nominales)',
    titleFr: 'Les classes nominales',
    emoji: '📊',
    gradient: 'from-emerald-400 to-teal-400',
    content: [
      {
        type: 'rule',
        title: 'Tɔɔ bwese bweseka kɔ̀kɔrɔ',
        titleFr: 'Principe des classes nominales',
        content: 'Baatɔnum sɔɔ tɔɔ (noms) ba ra bɔru bɔru wãa. Bɔru baatera ya ra seeda baatera mɔ. Seeda nini ba kasu gari mɔ̀ru sɔɔ bwese bweseka : déterminant, pronom sujet, possessif, relatif.',
        contentFr: 'En Baatonum, les noms sont organisés en classes. Chaque classe a ses propres déterminants, pronoms sujets, possessifs et relatifs.',
      },
      {
        type: 'table',
        title: 'Bɔru baateren tɛtɛ',
        titleFr: 'Tableau des classes nominales',
        headers: ['Classe', 'Singulier (det.)', 'Pluriel (det.)', 'Pronom sg.', 'Pronom pl.', 'Exemples'],
        rows: [
          ['KI/YI', '-ru / -re', '-nu', 'u', 'i', 'tɔnru (personne) → tɔnnu'],
          ['KU/SI', '-ru / -re', '-nu', 'u', 'ba', 'biru (arbre) → binu'],
          ['BU', '-bu', '-', 'mu', '-', 'nimbu (eau)'],
          ['GA/SI', '-ru / -re', '-nu', 'ta', 'nu', 'diru (maison) → dinu'],
          ['KA/YA', '-ru', '-nu', 'ya', 'ya', 'gɔru (parole) → gɔnu'],
          ['MA/MA', '-mu / -ma', '-mu', 'ma', 'ma', 'yɛnmu (sang)'],
        ],
      },
      {
        type: 'example',
        title: 'Seedabu ka garibu',
        content: 'Tɔnru u doo → Tɔnnu ba doo (La personne vient → Les personnes viennent)\nDiru ta sãa → Dinu nu sãa (La maison est bonne → Les maisons sont bonnes)\nBiru mu wãa → Binu nu wãa (L\'arbre existe → Les arbres existent)',
        contentFr: 'Person comes → People come\nThe house is good → The houses are good\nThe tree exists → The trees exist',
      },
    ],
    quiz: [
      { question: '"tɔnru" garin seeda yè sãa bɔkuru nìwa?', questionFr: 'Quel est le pluriel de "tɔnru"?', options: ['tɔnbu', 'tɔnnu', 'tɔnmu', 'tɔn'], correct: 1, explanation: 'tɔnru → tɔnnu (classe KI/YI)', explanationFr: 'tɔnru → tɔnnu (classe KI/YI)' },
      { question: '"diru" sãa bɔru bàn sɔɔwa?', questionFr: 'À quelle classe appartient "diru"?', options: ['KI/YI', 'BU', 'GA/SI', 'KA/YA'], correct: 2, explanation: 'diru (maison) → dinu, classe GA/SI', explanationFr: 'diru (maison) → dinu, classe GA/SI' },
      { question: 'Yè su gere "nimbu", te sãa bɔru bàn sɔɔwa?', questionFr: 'À quelle classe appartient "nimbu"?', options: ['KI/YI', 'BU', 'GA/SI', 'MA/MA'], correct: 1, explanation: 'nimbu (eau) sãa BU bɔru sɔɔwa.', explanationFr: 'nimbu (eau) appartient à la classe BU.' },
    ],
  },

  // ===== 4. NOMS =====
  {
    id: 'noms',
    title: 'Tɔɔ (Noms)',
    titleFr: 'Les noms',
    emoji: '📝',
    gradient: 'from-purple-400 to-pink-400',
    content: [
      {
        type: 'rule',
        title: 'Tɔɔ bwese bweseka',
        titleFr: 'Types de noms',
        content: 'Tɔɔ (noms) ba bɔru yiru sɔɔwa Baatɔnum sɔɔ : tɔɔ ǹ sãa wii (noms communs) ka tɔɔ nì nu sãa wii (noms propres). Tɔɔ ǹ sãa wii ba sãa goo goowa, kpaa tɔɔ nì nu sãa wii ba sãa tɔn goo goo ka dɔgɔ goo goo wiiru.',
        contentFr: 'Les noms en Baatonum se divisent en : noms communs et noms propres. Les noms communs désignent des catégories, les propres des individus ou lieux spécifiques.',
      },
      {
        type: 'table',
        title: 'Tɔɔ seedabu',
        headers: ['Type', 'Singulier', 'Pluriel', 'Sens'],
        rows: [
          ['Nom commun', 'biru', 'binu', 'arbre/arbres'],
          ['Nom commun', 'kuru', 'kunu', 'pierre/pierres'],
          ['Nom commun', 'diiru', 'diinu', 'maison/maisons'],
          ['Nom propre', 'Kpaaru', '—', 'nom propre masc.'],
          ['Nom propre', 'Saaru', '—', 'nom propre fem.'],
          ['Nom propre', 'Naanaanu', '—', 'nom de lieu'],
        ],
      },
      {
        type: 'list',
        title: 'Tɔɔ goo goo ka bɔkuru',
        titleFr: 'Formation du pluriel',
        items: [
          '-ru → -nu : tɔnru → tɔnnu (personne → personnes)',
          '-re → -nu : kure → kunu (pierre → pierres)',
          '-bu → reste -bu : nimbu (eau, invariable)',
          '-mu → -mu : yɛnmu (sang, invariable)',
          'Certains changent de classe : daa → danu (bête → bêtes)',
        ],
      },
    ],
    quiz: [
      { question: '"Naanaanu" sãa tɔɔ bɔru bàn sɔɔwa?', questionFr: '"Naanaanu" est quel type de nom?', options: ['Nom commun', 'Nom propre', 'Pronom', 'Adjectif'], correct: 1, explanation: 'Naanaanu sãa tɔɔn wiiwa (nom propre de lieu).', explanationFr: 'Naanaanu est un nom propre de lieu.' },
      { question: '"biru" garin bɔkuru nìwa?', questionFr: 'Quel est le pluriel de "biru"?', options: ['bibu', 'binu', 'birenu', 'biru'], correct: 1, explanation: 'biru → binu (-ru → -nu)', explanationFr: 'biru → binu (-ru → -nu)' },
    ],
  },

  // ===== 5. SUJET, VERBE, PRONOMS =====
  {
    id: 'verbes_pronoms',
    title: 'Koo sɔɔru, Sɔm garu, Seeda tɔɔru',
    titleFr: 'Sujet, Verbe, Pronoms',
    emoji: '💬',
    gradient: 'from-rose-400 to-red-400',
    content: [
      {
        type: 'rule',
        title: 'Gari mɔ̀run bweseru',
        titleFr: 'Structure de la phrase',
        content: 'Baatɔnum sɔɔ gari mɔ̀run bweseru: Koo sɔɔru (Sujet) + Sɔm garu (Verbe) + Koo mɔbu (Complément). Baatɔnum gari mɔ̀run bweseru SOV (Sujet-Objet-Verbe): "Bii wi u dĩaru dɔmɔ" (L\'enfant mange le repas).',
        contentFr: 'Structure : Sujet + Verbe + Complément. L\'ordre est SOV (Sujet-Objet-Verbe) : "L\'enfant le repas mange".',
      },
      {
        type: 'table',
        title: 'Seeda tɔɔru (Pronoms personnels)',
        headers: ['Personne', 'Sujet', 'Objet', 'Sens'],
        rows: [
          ['1ère sg.', 'n / m', 'nɛ', 'je / me'],
          ['2ème sg.', 'a', 'wunɛ', 'tu / te'],
          ['3ème sg.', 'u / ta / mu', 'nùn', 'il-elle / le-la'],
          ['1ère pl. incl.', 'su', 'bɛsɛ', 'nous (incl.)'],
          ['1ère pl. excl.', 'sa', 'bɛsɛ', 'nous (excl.)'],
          ['2ème pl.', 'yi', 'yinɛ', 'vous'],
          ['3ème pl.', 'ba', 'bà', 'ils-elles / les'],
        ],
      },
      {
        type: 'example',
        title: 'Sɔm garun bwese bweseka',
        titleFr: 'Conjugaison — Formes verbales',
        content: 'Inaccompli : u ra dɔmɔ (il mange habituellement)\nAccompli : u dɔma (il a mangé)\nNégatif : u ǹ dɔmɔ (il ne mange pas)\nFutur : u koo dɔmɔ (il mangera)\nImpératif : dɔmɔ! (mange!)\nProgressif : u wãa dɔmɔ (il est en train de manger)',
        contentFr: 'Habitual: he eats / Past: he ate / Negative: he does not eat / Future: he will eat / Imperative: eat! / Progressive: he is eating',
      },
    ],
    quiz: [
      { question: 'Baatɔnum gari mɔ̀run bweseru nìwa?', questionFr: 'Quel est l\'ordre des mots en Baatonum?', options: ['SVO', 'SOV', 'VSO', 'OVS'], correct: 1, explanation: 'Baatɔnum ya sãa SOV (Sujet-Objet-Verbe).', explanationFr: 'Le Baatonum suit l\'ordre SOV.' },
      { question: '"u dɔma" kɔ̀kɔrɔ nìwa?', questionFr: 'Que signifie "u dɔma"?', options: ['il mange', 'il a mangé', 'il mangera', 'il ne mange pas'], correct: 1, explanation: 'u dɔma = il a mangé (accompli)', explanationFr: 'u dɔma = il a mangé (accompli)' },
      { question: '"su" seeda tɔɔru kɔ̀kɔrɔ nìwa?', questionFr: 'Que signifie le pronom "su"?', options: ['je', 'tu', 'nous (incl.)', 'ils'], correct: 2, explanation: 'su = nous (inclusif)', explanationFr: 'su = nous (inclusif)' },
    ],
  },

  // ===== 6. DÉCOMPOSITION DES MOTS =====
  {
    id: 'decomposition',
    title: 'Garin tɛburubu (Décomposition)',
    titleFr: 'Décomposition des mots',
    emoji: '🔬',
    gradient: 'from-cyan-400 to-blue-400',
    content: [
      {
        type: 'rule',
        title: 'Tɔɔ tɛburubu',
        titleFr: 'Analyse morphologique',
        content: 'Baatɔnum sɔɔ gari ya ra sãa bwese yiru sɔɔ: yobu (radical) ka seeda (suffixe). Yobura ya sãa garin kɔ̀kɔrɔ dɔkɔwa, seedara ya sãa bɔru ka bweseru sio.',
        contentFr: 'En Baatonum, les mots se décomposent en : radical (sens principal) et suffixe (classe/genre). Le radical porte le sens, le suffixe indique la classe.',
      },
      {
        type: 'table',
        title: 'Tɛburubu seedabu',
        headers: ['Mot', 'Radical', 'Suffixe', 'Classe', 'Sens'],
        rows: [
          ['tɔnru', 'tɔn', '-ru', 'KI', 'personne'],
          ['tɔnnu', 'tɔn', '-nu', 'YI (pl.)', 'personnes'],
          ['diru', 'di', '-ru', 'GA', 'maison'],
          ['dinu', 'di', '-nu', 'SI (pl.)', 'maisons'],
          ['nimbu', 'nim', '-bu', 'BU', 'eau'],
          ['kpãaru', 'kpãa', '-ru', 'GA', 'champ'],
          ['sɔmbu', 'sɔm', '-bu', 'BU', 'travail'],
          ['yɛnmu', 'yɛn', '-mu', 'MA', 'sang'],
        ],
      },
      {
        type: 'list',
        title: 'Seeda bwese bweseka (Suffixes)',
        titleFr: 'Suffixes de classes',
        items: [
          '-ru / -re : singulier (classes KI, GA, KA)',
          '-nu : pluriel (classes YI, SI, YA)',
          '-bu : classe BU (liquides, abstraits)',
          '-mu / -ma : classe MA (masses)',
          '-wa : agent (sɔ̃siwa = enseignant)',
          '-ru → verbe nominalisé (dɔmu + -ru = dɔmuru = nourriture)',
        ],
      },
    ],
    quiz: [
      { question: '"tɔnru" garin yobu (radical) nìwa?', questionFr: 'Quel est le radical de "tɔnru"?', options: ['tɔ', 'tɔn', 'tɔnr', 'tɔnru'], correct: 1, explanation: 'tɔnru = tɔn (radical) + -ru (suffixe)', explanationFr: 'tɔnru = tɔn (radical) + -ru (suffixe)' },
      { question: '"-bu" seeda ya ra sãa bɔru bàn sɔɔwa?', questionFr: 'Le suffixe "-bu" indique quelle classe?', options: ['KI', 'GA', 'BU', 'MA'], correct: 2, explanation: '-bu = classe BU (liquides, abstraits)', explanationFr: '-bu = classe BU' },
    ],
  },

  // ===== 7. TEMPS, MODES ET FORMES =====
  {
    id: 'temps_modes',
    title: 'Saabu, Bweseru, Dɔɔbu',
    titleFr: 'Temps, modes et formes',
    emoji: '⏱️',
    gradient: 'from-violet-400 to-purple-400',
    content: [
      {
        type: 'rule',
        title: 'Sɔm garun saabun tɛtɛ',
        titleFr: 'Système temporel',
        content: 'Baatɔnum sɔɔ sɔm garu (verbe) ya ra bɔrumɔ saabu bwese bweseka sɔɔ ka seeda gɔ̀kɔ̀ru bwese bweseka ka. Saabu bakaru: yè ta koo kobu (inaccompli), yè ta kua bu (accompli), yè ta wãa koobu (progressif), yè ta koo koobu (futur).',
        contentFr: 'Le verbe Baatonum exprime le temps par des marqueurs spécifiques. Temps principaux : inaccompli (habitude), accompli (passé), progressif (en cours), futur.',
      },
      {
        type: 'table',
        title: 'Saabu ka bweseru tɛtɛ',
        titleFr: 'Tableau complet des conjugaisons',
        headers: ['Forme', 'Structure', 'Exemple (dɔmɔ = manger)', 'Sens'],
        rows: [
          ['Inaccompli', 'S + ra + V', 'u ra dɔmɔ', 'il mange (habitude)'],
          ['Accompli', 'S + V (modifié)', 'u dɔma', 'il a mangé'],
          ['Progressif', 'S + wãa + V', 'u wãa dɔmɔ', 'il est en train de manger'],
          ['Futur', 'S + koo + V', 'u koo dɔmɔ', 'il mangera'],
          ['Négatif inac.', 'S + ǹ + V', 'u ǹ dɔmɔ', 'il ne mange pas'],
          ['Négatif acc.', 'S + ǹ + V (modifié)', 'u ǹ dɔma', 'il n\'a pas mangé'],
          ['Impératif', 'V + (suffixe)', 'dɔmɔ!', 'mange!'],
          ['Conditionnel', 'yè S + V', 'yè u dɔma', 's\'il mange'],
        ],
      },
      {
        type: 'example',
        title: 'Dɔɔbu bwese bweseka — Formes affirmative/négative',
        content: 'Affirmatif : N dɔma (J\'ai mangé)\nNégatif : N ǹ dɔma (Je n\'ai pas mangé)\nAffirmatif : Ba ra dɔmɔ (Ils mangent)\nNégatif : Ba ǹ dɔmɔ (Ils ne mangent pas)\nConditionnel : Yè u dɔma, u koo kpãa (S\'il mange, il sera rassasié)',
        contentFr: 'Affirmative vs Negative forms and conditional structure.',
      },
      {
        type: 'list',
        title: 'Sɔm garun bwese bweseka (Types de verbes)',
        items: [
          'Verbes d\'action : dɔmɔ (manger), nɔ̃ɔ (boire), koo (aller)',
          'Verbes d\'état : sãa (être), wãa (exister), mɔ (avoir)',
          'Verbes de mouvement : doo (venir), kere (partir), du (entrer)',
          'Verbes transitifs : dɔmɔ X (manger X), yã X (voir X)',
          'Verbes intransitifs : sĩi (s\'asseoir), gɔna (dormir)',
        ],
      },
    ],
    quiz: [
      { question: '"u ra dɔmɔ" sãa saabun bàn sɔɔwa?', questionFr: '"u ra dɔmɔ" est à quel temps?', options: ['Accompli', 'Inaccompli', 'Futur', 'Progressif'], correct: 1, explanation: '"ra" sãa saabu ǹ koo kobu (inaccompli) gɔ̀kɔ̀ruwa.', explanationFr: '"ra" est le marqueur de l\'inaccompli.' },
      { question: 'Amɔna ba ra koo sɔɔ sɔmbu gere Baatɔnum sɔɔ?', questionFr: 'Comment exprime-t-on le futur en Baatonum?', options: ['S + ra + V', 'S + koo + V', 'S + wãa + V', 'S + ǹ + V'], correct: 1, explanation: 'Koo sɔɔ sɔmbu: S + koo + V', explanationFr: 'Futur : S + koo + V' },
      { question: '"u ǹ dɔma" kɔ̀kɔrɔ nìwa?', questionFr: 'Que signifie "u ǹ dɔma"?', options: ['il mange', 'il a mangé', 'il n\'a pas mangé', 'il mangera'], correct: 2, explanation: 'u ǹ dɔma = il n\'a pas mangé (négatif accompli)', explanationFr: 'u ǹ dɔma = il n\'a pas mangé (négatif accompli)' },
    ],
  },
];
