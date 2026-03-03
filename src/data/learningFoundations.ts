// ═══════════════════════════════════════════════════════════════════
// CONNAISSANCES FONDAMENTALES - Bariba ↔ Français
// Grammaire, conjugaison, pronoms, nombres, tons, construction de phrases
// ═══════════════════════════════════════════════════════════════════

export interface FoundationExample {
  bariba: string;
  french: string;
  note?: string;
}

export interface FoundationTable {
  headers: string[];
  rows: string[][];
}

export interface FoundationSection {
  title: { fr: string; br: string };
  content: { fr: string; br: string };
  table?: FoundationTable;
  examples?: FoundationExample[];
  tip?: { fr: string; br: string };
}

export interface FoundationLesson {
  id: string;
  title: { fr: string; br: string };
  icon: string;
  color: string;
  sections: FoundationSection[];
  quiz: FoundationQuiz[];
}

export interface FoundationQuiz {
  question: { fr: string; br: string };
  options: string[];
  correctIndex: number;
  explanation: { fr: string; br: string };
}

export const FOUNDATION_LESSONS: FoundationLesson[] = [
  // ─────────────────────────────────────────────────────────────────
  // 1. ALPHABET & PHONOLOGIE
  // ─────────────────────────────────────────────────────────────────
  {
    id: 'alphabet',
    title: { fr: 'Alphabet & Phonologie', br: 'Yenu kɑ nɔɔseeru' },
    icon: '🔤',
    color: '#6366F1',
    sections: [
      {
        title: { fr: 'L\'alphabet Baatɔnum', br: 'Baatɔnum yenu' },
        content: {
          fr: 'Le Bariba utilise 24 unités alphabétiques, dont 2 digraphes (deux lettres = un son). L\'ordre est : a, b, gb, d, e, ɛ, f, g, h, i, k, l, m, n, o, ɔ, p, kp, r, s, t, u, w, y. Les lettres c, j, q, v, x, z n\'existent pas en Bariba.',
          br: 'Baatɔnum yenu 24 mɔ, a digraphes nɛɛrɑ mɔ (gb, kp). Yenu kpuro : a, b, gb, d, e, ɛ, f, g, h, i, k, l, m, n, o, ɔ, p, kp, r, s, t, u, w, y.'
        },
        table: {
          headers: ['Lettre', 'Son', 'Exemple Bariba', 'Traduction'],
          rows: [
            ['a', 'a ouvert', 'abo', 'gombo'],
            ['b', 'comme en français', 'baa', 'père'],
            ['gb', 'g+b ensemble', 'gberu', 'champ'],
            ['d', 'comme en français', 'diru', 'case'],
            ['e', 'é fermé', 'debu', 'apprentissage'],
            ['ɛ', 'è ouvert', 'nɛɛ', 'dire'],
            ['f', 'comme en français', 'fiiko', 'doucement'],
            ['g', 'g dur', 'gobi', 'argent'],
            ['h', 'h aspiré', 'hali', 'même'],
            ['i', 'comme en français', 'isa', 'excuse'],
            ['k', 'comme en français', 'koko', 'bouillie de céréales'],
            ['kp', 'k+p ensemble', 'kpã', 'être grand'],
            ['l', 'comme en français', 'lɑɑbɑri', 'nouvelle'],
            ['m', 'comme en français', 'mɛrɔ', 'mère'],
            ['n', 'comme en français', 'nim', 'eau'],
            ['o', 'o fermé', 'o', 'toi (objet)'],
            ['ɔ', 'o ouvert', 'nɔɔ', 'bouche'],
            ['p', 'comme en français', 'pii', 'dire (calmement)'],
            ['r', 'r roulé', 'rɑ', 'particule habituelle'],
            ['s', 'comme en français', 'sɔmburu', 'travail'],
            ['t', 'comme en français', 'tɔmbu', 'personnes'],
            ['u', 'ou français', 'u', 'il/elle'],
            ['w', 'w anglais', 'wuu', 'village'],
            ['y', 'y français', 'yaa', 'mère'],
          ]
        },
        tip: {
          fr: '💡 Les digraphes gb et kp se prononcent comme un seul son, pas comme deux sons séparés.',
          br: '💡 Digraphes gb kɑ kp, nɔɔ dɔmbɔ mɔ, kun nɛɛrɑ.'
        }
      },
      {
        title: { fr: 'Les voyelles spéciales', br: 'Yenu kpɑɑrenu' },
        content: {
          fr: 'Le Bariba a 7 voyelles : a, e, ɛ, i, o, ɔ, u. Les voyelles ɛ (è ouvert) et ɔ (o ouvert) n\'existent pas en français standard. De plus, certaines voyelles peuvent être nasalisées : ã, ɛ̃, ĩ, ɔ̃, ũ (prononcées avec l\'air passant aussi par le nez).',
          br: 'Baatɔnum yenu nɔɔseerenu 7 mɔ : a, e, ɛ, i, o, ɔ, u. Yenu ɛ kɑ ɔ, Fãsei sɔɔ kun wãa. Nasale yenu mɔ : ã, ɛ̃, ĩ, ɔ̃, ũ.'
        },
        table: {
          headers: ['Voyelle', 'Nasale', 'Exemple', 'Traduction'],
          rows: [
            ['a', 'ã', 'kpã', 'être grand'],
            ['ɛ', 'ɛ̃', 'kpɛ̃a', 'grandir'],
            ['i', 'ĩ', 'kpĩ', 'être couché'],
            ['ɔ', 'ɔ̃', 'yɔ̃ra', 'se lever'],
            ['u', 'ũ', 'sũu', 'cœur'],
          ]
        }
      }
    ],
    quiz: [
      {
        question: { fr: 'Combien de lettres compte l\'alphabet Bariba ?', br: 'Baatɔnum yenu gana mɔ ?' },
        options: ['20', '24', '26', '30'],
        correctIndex: 1,
        explanation: { fr: 'L\'alphabet Bariba a 24 unités, dont les digraphes gb et kp.', br: 'Baatɔnum yenu 24 mɔ, gb kɑ kp mɔ.' }
      },
      {
        question: { fr: 'Quel est un digraphe en Bariba ?', br: 'Digraphe yɛ̃rɑ Bariba sɔɔ ?' },
        options: ['ch', 'gb', 'ph', 'th'],
        correctIndex: 1,
        explanation: { fr: 'gb et kp sont les deux digraphes du Bariba (deux lettres, un seul son).', br: 'gb kɑ kp digraphes nɛɛrɑ Baatɔnum sɔɔ.' }
      },
      {
        question: { fr: 'Comment se prononce "ɔ" ?', br: '"ɔ" nɔɔseeru ?' },
        options: ['Comme le "o" de "mot"', 'Comme le "o" de "port"', 'Comme le "ou"', 'Comme le "eu"'],
        correctIndex: 1,
        explanation: { fr: 'ɔ est un "o ouvert", comme dans le mot français "port" ou "bol".', br: 'ɔ nɔɔ bɔɔyɑɑ mɔ, "port" kã Fãsei sɔɔ.' }
      },
    ]
  },

  // ─────────────────────────────────────────────────────────────────
  // 2. TONALITÉ
  // ─────────────────────────────────────────────────────────────────
  {
    id: 'tons',
    title: { fr: 'Tonalité & Accents', br: 'Nɔɔ seeru kɑ yikarenu' },
    icon: '🎵',
    color: '#EC4899',
    sections: [
      {
        title: { fr: 'Le Bariba est tonal', br: 'Baatɔnum nɔɔseeru' },
        content: {
          fr: 'Le Bariba possède 3 tons principaux : Haut (´), Moyen (non marqué), et Bas (`). Le ton change le sens du mot ! Un même mot peut avoir des significations complètement différentes selon le ton utilisé. C\'est l\'aspect le plus critique de la langue.',
          br: 'Baatɔnum nɔɔseeru itɑ mɔ : Yiisiru (´), Dɔɔbu (rien), kɑ Yigbinu (`). Nɔɔseeru yenu nɔɔ bɑɑrɑmɔ ! Yenu dɔmbɔ deburu bɑɑrɑmɔ nɔɔseeru sɔɔ.'
        },
        table: {
          headers: ['Ton', 'Marqueur', 'Exemple', 'Sens', 'vs.'],
          rows: [
            ['Haut', '´ (accent aigu)', 'ú', 'il/elle (emphase)', 'u (neutre)'],
            ['Moyen', '(non marqué)', 'u', 'il/elle', '-'],
            ['Bas', '` (accent grave)', 'ù', 'il/elle (subord.)', 'u (neutre)'],
            ['Modulé ˆ', 'descendant', 'â', 'ton qui descend', '-'],
          ]
        },
        examples: [
          { bariba: 'yɔ̃̀ (ton bas)', french: 'être debout', note: 'Verbe de qualité (état)' },
          { bariba: 'sɔ̃̀ (ton bas)', french: 'être assis', note: 'Verbe de qualité (état)' },
          { bariba: 'kpã (ton haut)', french: 'être grand', note: 'Adjectif verbal' },
        ],
        tip: {
          fr: '💡 En Bariba, le ton bas est noté par un accent grave (`). Quand il n\'y a pas de marque, c\'est le ton moyen. Le ton est aussi grammatical : il distingue les pronoms sujets des pronoms subordonnés.',
          br: '💡 Nɔɔ yigbinu (`) mɔ. Yiikirɑ kun wãa, nɔɔ dɔɔbu mɔ. Nɔɔseeru grammatical mɔ : u nɛɛmɔ kɑ ù nɛɛmɔ bɑɑrɑmɔ.'
        }
      },
      {
        title: { fr: 'Le ton grammatical', br: 'Nɔɔseeru grammatical' },
        content: {
          fr: 'Le ton n\'est pas seulement lexical, il est aussi grammatical. Par exemple, dans les propositions subordonnées, le pronom sujet prend un ton bas : "Goo ù n nɛn bukaata mɔ..." (Si quelqu\'un a besoin de moi...). Le "ù" avec ton bas marque la subordination.',
          br: 'Nɔɔseeru lexical kɑ grammatical mɔ. Subordonnée sɔɔ, pronom sujet nɔɔ yigbinu mɔ : "Goo ù n nɛn bukaata mɔ..." ù nɔɔ yigbinu subordination yiramɔ.'
        },
        examples: [
          { bariba: 'U nɛmu go', french: 'Il a tué une biche', note: 'U = ton moyen = phrase principale' },
          { bariba: 'Goo ù n nɛn bukaata mɔ', french: 'Si quelqu\'un a besoin de moi', note: 'ù = ton bas = subordonnée' },
          { bariba: 'Durɔ wi, u nɛɛ...', french: 'Le mari, il dit...', note: 'u = reprise pronominale' },
        ]
      }
    ],
    quiz: [
      {
        question: { fr: 'Combien de tons principaux a le Bariba ?', br: 'Baatɔnum nɔɔseeru gana mɔ ?' },
        options: ['2', '3', '4', '5'],
        correctIndex: 1,
        explanation: { fr: 'Le Bariba a 3 tons : Haut, Moyen et Bas, plus des tons modulés.', br: 'Baatɔnum nɔɔseeru itɑ mɔ : Yiisiru, Dɔɔbu, Yigbinu.' }
      },
      {
        question: { fr: 'Que marque le ton bas sur un pronom ?', br: 'Nɔɔ yigbinu pronom sɔɔ yirɑmɔ ?' },
        options: ['Une question', 'La subordination', 'Le pluriel', 'La négation'],
        correctIndex: 1,
        explanation: { fr: 'Le ton bas sur un pronom marque la subordination (proposition dépendante).', br: 'Nɔɔ yigbinu pronom sɔɔ subordination yiramɔ.' }
      },
    ]
  },

  // ─────────────────────────────────────────────────────────────────
  // 3. PRONOMS
  // ─────────────────────────────────────────────────────────────────
  {
    id: 'pronoms',
    title: { fr: 'Les Pronoms', br: 'Pronomnu' },
    icon: '👤',
    color: '#10B981',
    sections: [
      {
        title: { fr: 'Pronoms personnels', br: 'Pronomnu tɔmbu' },
        content: {
          fr: 'Les pronoms Bariba changent selon leur fonction : sujet, objet ou possessif. La 3ème personne distingue l\'humain (U) du non-humain (Ga/Mu). C\'est fondamental pour construire des phrases correctes.',
          br: 'Pronomnu Baatɔnum bɑɑrɑmɔ fonction sɔɔ : sujet, objet kɑ possessif. 3ème personne humain (U) kɑ non-humain (Ga/Mu) bɑɑrɑmɔ.'
        },
        table: {
          headers: ['Personne', 'Français', 'Sujet', 'Objet', 'Possessif'],
          rows: [
            ['1re sg.', 'Je / J\'', 'Na / N', 'Man', 'Nɛn'],
            ['2e sg.', 'Tu', 'A', 'Nun', 'Wunɛn'],
            ['3e sg. (humain)', 'Il/Elle', 'U', 'Nun', 'Win'],
            ['3e sg. (non-humain)', 'Il/Elle (chose)', 'Ga / Mu', 'Nun', 'Ga / Mu'],
            ['1re pl.', 'Nous', 'Sa', 'Sun', 'Sun'],
            ['2e pl.', 'Vous', 'I', 'Bɛɛ', 'Bɛɛn'],
            ['3e pl.', 'Ils/Elles', 'Ba', 'Bu', 'Ben'],
          ]
        },
        examples: [
          { bariba: 'Na sɔmburu de', french: 'Je travaille', note: 'Na = pronom sujet 1re personne' },
          { bariba: 'A tɔn be wa ?', french: 'As-tu vu ces gens ?', note: 'A = pronom sujet 2e personne' },
          { bariba: 'U nɛmu go', french: 'Il a tué une biche', note: 'U = pronom sujet 3e humain' },
          { bariba: 'Nim mu tɛrie', french: 'L\'eau couvre...', note: 'Mu = pronom sujet non-humain' },
          { bariba: 'Ba ra ka kɛrusu...', french: 'Ils fabriquent...', note: 'Ba = pronom sujet 3e pluriel' },
          { bariba: 'Domma a na ?', french: 'Quand es-tu venu ?', note: 'A = 2e pers. singulier confirmé' },
        ],
        tip: {
          fr: '💡 U (humain) vs Ga/Mu (non-humain) : "Nim mu boo yiba" = La jarre est remplie d\'eau (mu renvoie à l\'eau). Cette distinction est cruciale !',
          br: '💡 U (tɔmbu) vs Ga/Mu (gɑ̃ɑnu) : "Nim mu boo yiba" mu nim yiramɔ. Yen kpɑɑru mɔ !'
        }
      },
    ],
    quiz: [
      {
        question: { fr: 'Comment dit-on "Je" en tant que sujet ?', br: '"Na" Fãsei sɔɔ ?' },
        options: ['A', 'Na / N', 'U', 'Sa'],
        correctIndex: 1,
        explanation: { fr: 'Na (ou N devant une voyelle) est le pronom sujet de la 1re personne du singulier.', br: 'Na pronom sujet 1re personne singulier mɔ.' }
      },
      {
        question: { fr: 'Quel pronom utilise-t-on pour "il" quand on parle d\'un objet ?', br: 'Gɑ̃ɑ sɔɔ "il" pronom yɛ̃rɑ ?' },
        options: ['U', 'Ga / Mu', 'Ba', 'Na'],
        correctIndex: 1,
        explanation: { fr: 'Ga ou Mu s\'utilisent pour les non-humains (objets, animaux, abstraits).', br: 'Ga kɑ Mu non-humain (gɑ̃ɑnu, sɑbenu) sɔɔ mɔ.' }
      },
      {
        question: { fr: 'Quel est le possessif de "tu" ?', br: '"Tu" possessif yɛ̃rɑ ?' },
        options: ['Nɛn', 'Wunɛn', 'Win', 'Sun'],
        correctIndex: 1,
        explanation: { fr: 'Wunɛn est le possessif de la 2e personne du singulier (tu/ton/ta).', br: 'Wunɛn 2e personne singulier possessif mɔ.' }
      },
    ]
  },

  // ─────────────────────────────────────────────────────────────────
  // 4. ORDRE DES MOTS & CONSTRUCTION DE PHRASES
  // ─────────────────────────────────────────────────────────────────
  {
    id: 'ordre_mots',
    title: { fr: 'Ordre des mots (SOV)', br: 'Yenu kpindu (SOV)' },
    icon: '🧱',
    color: '#F97316',
    sections: [
      {
        title: { fr: 'Sujet-Objet-Verbe (SOV)', br: 'Sujet-Objet-Verbe (SOV)' },
        content: {
          fr: 'L\'ordre de base en Bariba est SOV : Sujet + Objet + Verbe. C\'est différent du français (SVO). Le verbe vient à la fin de la phrase ! Parfois l\'ordre SVO est aussi utilisé, surtout avec des particules.',
          br: 'Baatɔnum kpindu SOV mɔ : Sujet + Objet + Verbe. Fãsei SVO mɔ, bɑɑrɑmɔ. Verbe yenu kpeeru sɔɔ mɔ !'
        },
        table: {
          headers: ['Langue', 'Ordre', 'Sujet', 'Objet', 'Verbe'],
          rows: [
            ['Français', 'SVO', 'Le chasseur', 'a tué', 'une biche'],
            ['Bariba', 'SOV', 'Taaso u', 'nɛmu', 'go'],
          ]
        },
        examples: [
          { bariba: 'Taaso u nɛmu go', french: 'Le chasseur a tué une biche', note: 'S(Taaso u) + O(nɛmu) + V(go)' },
          { bariba: 'Na sɔmburu kasuu', french: 'Je cherche du travail', note: 'S(Na) + O(sɔmburu) + V(kasuu)' },
          { bariba: 'U sɔmburu da', french: 'Il est allé travailler', note: 'S(U) + O(sɔmburu) + V(da)' },
          { bariba: 'Na koko nonra', french: 'J\'ai bu de la bouillie', note: 'S(Na) + O(koko) + V(nonra) — koko = bouillie, on BOIT (nonra)' },
          { bariba: 'Na monri di', french: 'J\'ai mangé du riz', note: 'S(Na) + O(monri) + V(di) — monri = riz, on MANGE (di)' },
          { bariba: 'Ba nɛmu go', french: 'Ils ont tué une biche', note: 'S(Ba) + O(nɛmu) + V(go)' },
        ],
        tip: {
          fr: '💡 Pense à mettre le verbe EN DERNIER en Bariba. "Na monri di" = Je riz mange. Attention : koko = bouillie (on BOIT : nonra), monri = riz (on MANGE : di).',
          br: '💡 Verbe KPEERU sɔɔ mɔ Baatɔnum sɔɔ. "Na monri di" = Je riz mange. Koko = bouillie (nonra), monri = riz (di).'
        }
      },
      {
        title: { fr: 'Les particules (foc)', br: 'Particules (foc)' },
        content: {
          fr: 'Les particules sont essentielles en Bariba. Elles portent le temps, l\'aspect, la focalisation et la classe nominale. Le sujet peut être suivi d\'une particule de reprise pronominale (ex: u). "Yen biru" lie les phrases (Puis/Alors).',
          br: 'Particules kpɑɑru mɔ Baatɔnum sɔɔ. Temps, aspect, focalisation kɑ classe nominale mɔ. Sujet particule reprise mɔ (u). "Yen biru" = Puis/Alors.'
        },
        examples: [
          { bariba: 'Durɔ wi, u nɛɛ...', french: 'Le mari, il dit...', note: 'u = particule de reprise sujet' },
          { bariba: 'Yen biru u da', french: 'Puis il est allé', note: 'Yen biru = connecteur narratif' },
          { bariba: 'Gura ya koo nɛ', french: 'Il va pleuvoir', note: 'ya koo = futur' },
        ]
      },
      {
        title: { fr: 'Compléments et postpositions', br: 'Compléments kɑ postpositions' },
        content: {
          fr: 'Le Bariba utilise des postpositions (après le nom), contrairement aux prépositions du français. La plus courante est "sɔɔ" (dans/à). Les compléments de cause utilisent "yɛn sɔ̃" (à cause de / pour cette raison).',
          br: 'Baatɔnum postpositions mɔ (yenu kpeeru). "sɔɔ" = dans/à. "yɛn sɔ̃" = yira / cause.'
        },
        examples: [
          { bariba: 'Wuu sɔɔ', french: 'Dans le village', note: 'sɔɔ = dans (postposition)' },
          { bariba: 'Tɔmbu ba dabi gisɔ wuu sɔɔ', french: 'Il y a du monde aujourd\'hui dans le village', note: 'wuu sɔɔ = dans le village' },
          { bariba: 'U win nɔni gbabia u ka turuma wuuwɔ', french: 'Il a roulé le mortier jusqu\'au village', note: 'u ka turuma = il s\'y est rendu' },
        ]
      }
    ],
    quiz: [
      {
        question: { fr: 'Quel est l\'ordre de base des mots en Bariba ?', br: 'Baatɔnum yenu kpindu ?' },
        options: ['SVO (Sujet-Verbe-Objet)', 'SOV (Sujet-Objet-Verbe)', 'VSO (Verbe-Sujet-Objet)', 'OVS (Objet-Verbe-Sujet)'],
        correctIndex: 1,
        explanation: { fr: 'Le Bariba suit l\'ordre SOV : le verbe vient en dernier.', br: 'Baatɔnum SOV mɔ : verbe kpeeru sɔɔ mɔ.' }
      },
      {
        question: { fr: 'Comment dit-on "dans le village" ?', br: '"Wuu sɔɔ" Fãsei sɔɔ ?' },
        options: ['Sɔɔ wuu', 'Wuu sɔɔ', 'Wuu ka', 'Ka wuu'],
        correctIndex: 1,
        explanation: { fr: '"sɔɔ" est une postposition qui se place APRÈS le nom (wuu sɔɔ = village + dans).', br: '"sɔɔ" postposition mɔ, yenu KPEERU sɔɔ.' }
      },
      {
        question: { fr: '"Na monri di" signifie :', br: '"Na monri di" nɛɛmɔ :' },
        options: ['Je cuisine le riz', 'J\'ai mangé du riz', 'Le riz est bon', 'Donne-moi du riz'],
        correctIndex: 1,
        explanation: { fr: 'Na (je) + monri (riz) + di (manger) = J\'ai mangé du riz. Ordre SOV ! Attention : koko = bouillie (nonra = boire).', br: 'Na (je) + monri (riz) + di (manger) = SOV kpindu ! Koko = bouillie (nonra).' }
      },
    ]
  },

  // ─────────────────────────────────────────────────────────────────
  // 5. CLASSES NOMINALES
  // ─────────────────────────────────────────────────────────────────
  {
    id: 'classes_nominales',
    title: { fr: 'Classes nominales', br: 'Yenu kɑ̃ɑnu' },
    icon: '📦',
    color: '#8B5CF6',
    sections: [
      {
        title: { fr: 'Le système des classes', br: 'Kɑ̃ɑnu kpindu' },
        content: {
          fr: 'Le Bariba classe les noms en catégories qui affectent les pronoms, les déterminants et parfois les verbes. Les classes sont signalées par des suffixes ou des morphèmes associés. Les principales classes sont : humain pluriel (-bu/-mbu), animé singulier (a-/y-), inanimé/abstrait (m-), et collectif/pluriel (-nu/-su).',
          br: 'Baatɔnum yenu kɑ̃ɑnu mɔ, pronoms, déterminants kɑ verbes bɑɑrɑmɔ. Kɑ̃ɑnu kpɑɑrenu : humain pluriel (-bu/-mbu), animé singulier (a-/y-), inanimé/abstrait (m-), collectif/pluriel (-nu/-su).'
        },
        table: {
          headers: ['Classe', 'Marqueur', 'Pronom', 'Exemple', 'Traduction'],
          rows: [
            ['Humain pluriel', '-bu / -mbu', 'Ba', 'Baatɔmbu', 'Les Baatɔm (peuple)'],
            ['Humain pluriel', '-bu', 'Ba', 'Tɔmbu', 'Les personnes'],
            ['Animé singulier', 'a- / y-', 'Ga / Ya / U', 'Abo / Yabo', 'Gombo'],
            ['Animé singulier', 'a-', 'Ga', 'Abereku', 'Vautour'],
            ['Inanimé/Abstrait', 'm-', 'Mu', 'Nim mu tɛrie', 'L\'eau couvre...'],
            ['Pluriel/Collectif', '-nu / -su', 'Nu', 'Abonu', 'Les gombos'],
            ['Pluriel/Collectif', '-su', '-', 'Yɑkɑsu', 'Les herbes'],
          ]
        },
        examples: [
          { bariba: 'Baatɔmbu ba ra ka kɛrusu...', french: 'Les Baatɔm fabriquent...', note: '-mbu = pluriel humain → Ba' },
          { bariba: 'Nim mu boo yiba', french: 'La jarre est remplie d\'eau', note: 'mu = classe inanimé/liquide' },
          { bariba: 'Yɑkɑ beku bɑɑɡere', french: 'Toute herbe verte', note: 'Yɑkɑ = classe animé (y-)' },
        ],
        tip: {
          fr: '💡 La classe nominale détermine le pronom à utiliser. Si c\'est un humain, utilise U (singulier) ou Ba (pluriel). Pour les objets, utilise Ga ou Mu.',
          br: '💡 Kɑ̃ɑ pronom yiramɔ. Tɔmbu = U/Ba. Gɑ̃ɑnu = Ga/Mu.'
        }
      }
    ],
    quiz: [
      {
        question: { fr: 'Quel pronom utilise-t-on pour "les personnes" (Tɔmbu) ?', br: '"Tɔmbu" pronom ?' },
        options: ['U', 'Ga', 'Ba', 'Mu'],
        correctIndex: 2,
        explanation: { fr: 'Tɔmbu est un nom humain pluriel (-bu), donc on utilise Ba.', br: 'Tɔmbu humain pluriel (-bu), Ba mɔ.' }
      },
      {
        question: { fr: 'Le suffixe -mbu indique :', br: '-mbu yiramɔ :' },
        options: ['Un objet', 'Un humain singulier', 'Un humain pluriel', 'Un animal'],
        correctIndex: 2,
        explanation: { fr: '-mbu (ou -bu) marque le pluriel humain en Bariba.', br: '-mbu (kɑ -bu) humain pluriel Baatɔnum sɔɔ.' }
      },
    ]
  },

  // ─────────────────────────────────────────────────────────────────
  // 6. SYSTÈME VERBAL & CONJUGAISON
  // ─────────────────────────────────────────────────────────────────
  {
    id: 'conjugaison',
    title: { fr: 'Conjugaison & Temps', br: 'Koru kpindu kɑ wɑɑru' },
    icon: '⚙️',
    color: '#EF4444',
    sections: [
      {
        title: { fr: 'Les verbes ne changent pas !', br: 'Korenu kun bɑɑrɑmɔ !' },
        content: {
          fr: 'En Bariba, les verbes ne se conjuguent PAS par changement de terminaison (contrairement au français). Le temps et l\'aspect sont indiqués par des particules placées avant le verbe. La forme de base du verbe est invariable : ko (faire), di (manger), da (aller), go (tuer).',
          br: 'Baatɔnum sɔɔ, korenu KUN bɑɑrɑmɔ terminaison sɔɔ (Fãsei kã bɑɑrɑmɔ). Wɑɑru kɑ aspect particules mɔ verbe sɔ̃ɔ sɔɔ. Koru forme de base : ko (kuo), di (diru), da (dɔɔru), go (gou).'
        },
        table: {
          headers: ['Temps/Aspect', 'Particule', 'Position', 'Exemple Bariba', 'Traduction'],
          rows: [
            ['Accompli (Passé)', '∅ (rien)', 'S-O-V', 'Taaso u nɛmu go', 'Le chasseur a tué une biche'],
            ['Futur', 'koo', 'Après le sujet', 'Gura ya koo nɛ', 'Il va pleuvoir'],
            ['Habituel / Progressif', 'ra / ra ka', 'Après le sujet', 'Ba ra ka kɛrusu...', 'Ils fabriquent (habituellement)...'],
            ['Conditionnel', 'n (subjonctif)', 'Dans la subordonnée', 'Goo ù n nɛn bukaata mɔ', 'Si quelqu\'un a besoin de moi'],
            ['Inaccompli', '-mɔ', 'Suffixe du verbe', 'U sĩimɔ', 'Il marche (en cours)'],
          ]
        },
        examples: [
          { bariba: 'Na koko di', french: 'J\'ai mangé du riz', note: 'Accompli : pas de particule' },
          { bariba: 'Na koo koko di', french: 'Je vais manger du riz', note: 'Futur : koo avant le verbe' },
          { bariba: 'Na ra koko di', french: 'Je mange habituellement du riz', note: 'Habituel : ra' },
          { bariba: 'Na koko dimɔ', french: 'Je suis en train de manger du riz', note: 'Progressif : -mɔ sur le verbe' },
        ],
        tip: {
          fr: '💡 Retiens : Passé = rien, Futur = koo, Habituel = ra, En cours = -mɔ. Le verbe lui-même ne change jamais !',
          br: '💡 Passé = rien, Futur = koo, Habituel = ra, En cours = -mɔ. Koru kun bɑɑrɑmɔ !'
        }
      },
      {
        title: { fr: 'Être et Avoir', br: 'Wãa kɑ Mɔ' },
        content: {
          fr: '"Être" se dit "wɑ̃ɑ" (exister, être localisé). "Avoir" se dit "mɔ" (posséder). Ces deux verbes sont fondamentaux dans toute conversation.',
          br: '"Être" = "wɑ̃ɑ" (wãaru). "Avoir" = "mɔ" (possession). Korenu nɛɛrɑ kpɑɑru mɔ.'
        },
        examples: [
          { bariba: 'Tem dɑɑ wɑ̃ɑwɑ bitɑm', french: 'La terre était informe et vide', note: 'wɑ̃ɑ = être/exister' },
          { bariba: 'Mɑnɑ ɑ wɑ̃ɑ ?', french: 'Où es-tu ?', note: 'wɑ̃ɑ = être (localisation)' },
          { bariba: 'Na gobin bukaata mɔ', french: 'J\'ai besoin d\'argent', note: 'mɔ = avoir/posséder' },
          { bariba: 'Sekurɑ kun mɑɑ ben ɡoo mɔ', french: 'Ils n\'en avaient point honte', note: 'mɔ = avoir (négatif : kun...mɔ)' },
        ]
      },
      {
        title: { fr: 'La négation verbale', br: 'Kun kɑ ǹ' },
        content: {
          fr: 'La négation se forme avec les particules ǹ, kun ou ku, placées entre le sujet et le verbe. "Na ǹ kãkɔ" = Je n\'ai pas le courage. "Gɑ̃ɑnu kun wɑ̃ɑ" = Les choses n\'existaient pas.',
          br: 'Négation ǹ, kun, ku mɔ, sujet kɑ verbe sɔɔ. "Na ǹ kãkɔ" = Na ǹ courage mɔ. "Gɑ̃ɑnu kun wɑ̃ɑ" = Gɑ̃ɑnu kun wãa.'
        },
        examples: [
          { bariba: 'Na ǹ kãkɔ', french: 'Je n\'en ai pas le courage', note: 'ǹ = négation' },
          { bariba: 'Gɑ̃ɑnu kun wɑ̃ɑ mɛ sɔɔ', french: 'Les choses n\'étaient pas là', note: 'kun = négation (passé)' },
          { bariba: 'U ku rɑ ten binu di', french: 'Tu ne mangeras pas de cet arbre', note: 'ku = négation (futur/interdit)' },
        ]
      }
    ],
    quiz: [
      {
        question: { fr: 'Quelle particule marque le futur en Bariba ?', br: 'Futur particule Baatɔnum sɔɔ ?' },
        options: ['ra', 'koo', 'kun', '-mɔ'],
        correctIndex: 1,
        explanation: { fr: '"koo" est la particule du futur, placée après le sujet : "Na koo di" = Je vais manger.', br: '"koo" futur particule mɔ : "Na koo di" = Na koo diru.' }
      },
      {
        question: { fr: 'Comment forme-t-on la négation ?', br: 'Négation kpindu ?' },
        options: ['Avec "ne...pas"', 'Avec ǹ / kun / ku', 'En changeant le verbe', 'Avec "non" en début'],
        correctIndex: 1,
        explanation: { fr: 'La négation utilise ǹ, kun ou ku entre le sujet et le verbe.', br: 'Négation ǹ, kun, ku mɔ sujet kɑ verbe sɔɔ.' }
      },
      {
        question: { fr: 'Comment dit-on "J\'ai besoin d\'argent" ?', br: '"Na gobin bukaata mɔ" Fãsei sɔɔ ?' },
        options: ['Na gobi kasuu', 'Na gobin bukaata mɔ', 'Na koo gobi di', 'Gobi na mɔ'],
        correctIndex: 1,
        explanation: { fr: '"mɔ" exprime la possession/avoir. Bukaata = besoin. Na gobin bukaata mɔ = J\'ai besoin d\'argent.', br: '"mɔ" possession mɔ. Bukaata = besoin.' }
      },
    ]
  },

  // ─────────────────────────────────────────────────────────────────
  // 7. NOMBRES
  // ─────────────────────────────────────────────────────────────────
  {
    id: 'nombres',
    title: { fr: 'Les Nombres', br: 'Nɛɛrɑnu' },
    icon: '🔢',
    color: '#0EA5E9',
    sections: [
      {
        title: { fr: 'Les nombres de 1 à 10', br: 'Nɛɛrɑnu 1 yira 10' },
        content: {
          fr: 'Le système de numération Bariba est en base 5 : les nombres de 6 à 9 se construisent à partir de 5 + un chiffre. Apprendre les nombres de 1 à 10 est la base.',
          br: 'Baatɔnum nɛɛrɑnu base 5 mɔ : 6-9 nɛɛrɑnu 5 + nɛɛrɑ mɔ. 1 yira 10 debu kpɑɑru mɔ.'
        },
        table: {
          headers: ['Chiffre', 'Bariba', 'Prononciation'],
          rows: [
            ['1', 'dɔmbɔ / tia', 'dombô / tia'],
            ['2', 'nɛɛrɑ', 'nèèra'],
            ['3', 'itɑ', 'ita'],
            ['4', 'inɑ', 'ina'],
            ['5', 'nɔɔbu', 'nôôbu'],
            ['6', 'nɔɔbu n dɔmbɔ', '5+1'],
            ['7', 'nɔɔbu n nɛɛrɑ', '5+2'],
            ['8', 'nɔɔbu n itɑ', '5+3'],
            ['9', 'nɔɔbu n inɑ', '5+4'],
            ['10', 'nuu', 'nuu'],
          ]
        },
        examples: [
          { bariba: 'Bibu itɑ', french: 'Trois enfants', note: 'Nombre après le nom' },
          { bariba: 'Kɛkɛ nɛɛrɑ', french: 'Deux voitures', note: 'Nombre après le nom' },
          { bariba: 'Arari u nɛɛ itɑ go gisɔ', french: 'Le boucher a abattu trois bœufs aujourd\'hui', note: 'itɑ = 3' },
        ],
        tip: {
          fr: '💡 Le système est en base 5 : 6 = 5+1, 7 = 5+2, etc. Le nombre se place APRÈS le nom qu\'il qualifie.',
          br: '💡 Base 5 : 6 = 5+1, 7 = 5+2. Nɛɛrɑ yenu KPEERU sɔɔ mɔ.'
        }
      },
      {
        title: { fr: 'Les dizaines et au-delà', br: 'Nɛɛrɑ kpɑɑrenu' },
        content: {
          fr: '20 = nubi (deux dizaines), 100 = kεmɑ, 1000 = wunɑɑ. Les nombres composés se forment par addition : 15 = nuu n nɔɔbu (10+5), 25 = nubi n nɔɔbu (20+5).',
          br: '20 = nubi, 100 = kεmɑ, 1000 = wunɑɑ. Nombres composés addition mɔ : 15 = nuu n nɔɔbu (10+5).'
        },
        table: {
          headers: ['Nombre', 'Bariba'],
          rows: [
            ['10', 'nuu'],
            ['15', 'nuu n nɔɔbu'],
            ['20', 'nubi'],
            ['30', 'nubi n nuu'],
            ['50', 'nubi nɛɛrɑ n nuu'],
            ['100', 'kεmɑ'],
            ['1000', 'wunɑɑ'],
          ]
        },
      }
    ],
    quiz: [
      {
        question: { fr: 'Comment dit-on "5" en Bariba ?', br: '"5" Baatɔnum sɔɔ ?' },
        options: ['inɑ', 'nɔɔbu', 'nuu', 'itɑ'],
        correctIndex: 1,
        explanation: { fr: 'nɔɔbu = 5. C\'est la base du système numérique Bariba.', br: 'nɔɔbu = 5. Base nɛɛrɑnu Baatɔnum mɔ.' }
      },
      {
        question: { fr: 'Comment se forme le nombre 7 ?', br: '7 nɛɛrɑ kpindu ?' },
        options: ['tia n nɔɔbu', 'nɔɔbu n nɛɛrɑ', 'nuu n nɛɛrɑ', 'itɑ n inɑ'],
        correctIndex: 1,
        explanation: { fr: '7 = 5 + 2 = nɔɔbu n nɛɛrɑ. Le système est en base 5.', br: '7 = 5 + 2 = nɔɔbu n nɛɛrɑ. Base 5 mɔ.' }
      },
      {
        question: { fr: 'Comment dit-on "100" en Bariba ?', br: '"100" Baatɔnum sɔɔ ?' },
        options: ['nuu nuu', 'nubi nɔɔbu', 'kεmɑ', 'wunɑɑ'],
        correctIndex: 2,
        explanation: { fr: 'kεmɑ = 100 en Bariba.', br: 'kεmɑ = 100 Baatɔnum sɔɔ.' }
      },
    ]
  },

  // ─────────────────────────────────────────────────────────────────
  // 8. ADJECTIFS & ADVERBES
  // ─────────────────────────────────────────────────────────────────
  {
    id: 'adjectifs',
    title: { fr: 'Adjectifs & Adverbes', br: 'Kɑrenu kɑ kpindirenu' },
    icon: '🎨',
    color: '#14B8A6',
    sections: [
      {
        title: { fr: 'Position des adjectifs', br: 'Kɑrenu kpindu' },
        content: {
          fr: 'En Bariba, les adjectifs se placent APRÈS le nom (comme en français). Exemples : "Yɑkɑ beku bɑɑɡere" = Toute herbe verte, "Swɛ̃ɛ bɛkɛ tɑkɑ" = Les grands poissons.',
          br: 'Baatɔnum sɔɔ, kɑrenu yenu KPEERU sɔɔ mɔ (kã Fãsei). "Yɑkɑ beku bɑɑɡere" = herbe verte, "Swɛ̃ɛ bɛkɛ tɑkɑ" = grands poissons.'
        },
        examples: [
          { bariba: 'Yɑkɑ beku bɑɑɡere', french: 'Toute herbe verte', note: 'bɑɑɡere = vert, après le nom' },
          { bariba: 'Swɛ̃ɛ bɛkɛ tɑkɑ', french: 'Les grands poissons', note: 'tɑkɑ = grand, après le nom' },
          { bariba: 'Yɑm wɔ̃kuru mɑɑ wɔ̃kuru', french: 'Les ténèbres profondes', note: 'wɔ̃kuru = sombre/profond' },
          { bariba: 'Yɛɛ kpuro', french: 'Tout animal', note: 'kpuro = tout' },
          { bariba: 'Kɛkɛ baka', french: 'Un grand camion', note: 'baka = grand' },
        ]
      },
      {
        title: { fr: 'Les adverbes', br: 'Kpindirenu' },
        content: {
          fr: 'Les adverbes de manière, temps et lieu se placent dans la phrase verbale ou en début/fin de phrase. "Sãa sãa" = bien, "Gisɔ" = aujourd\'hui, "Fiiko fiiko" = doucement.',
          br: 'Kpindirenu manière, wɑɑru kɑ baama mɔ. "Sãa sãa" = wẽ, "Gisɔ" = gisɔ, "Fiiko fiiko" = fiiko.'
        },
        examples: [
          { bariba: 'U sɔmburu mɔ sãa sãa', french: 'Il travaille bien', note: 'sãa sãa = bien (adverbe de manière)' },
          { bariba: 'Tɔmbu ba dabi gisɔ wuu sɔɔ', french: 'Il y a du monde aujourd\'hui dans le village', note: 'gisɔ = aujourd\'hui' },
          { bariba: 'Fiiko fiiko', french: 'Doucement, tout doucement', note: 'Adverbe redoublé pour insistance' },
        ]
      }
    ],
    quiz: [
      {
        question: { fr: 'Où se place l\'adjectif en Bariba ?', br: 'Kɑru baama ?' },
        options: ['Avant le nom', 'Après le nom', 'Avant le verbe', 'N\'importe où'],
        correctIndex: 1,
        explanation: { fr: 'L\'adjectif se place après le nom en Bariba : "Kɛkɛ baka" = grand camion.', br: 'Kɑru yenu kpeeru sɔɔ : "Kɛkɛ baka" = grand camion.' }
      },
      {
        question: { fr: 'Comment dit-on "bien" en Bariba ?', br: '"Sãa sãa" Fãsei sɔɔ ?' },
        options: ['Fiiko', 'Sãa sãa', 'Gisɔ', 'Baka'],
        correctIndex: 1,
        explanation: { fr: '"Sãa sãa" signifie "bien". La répétition renforce le sens.', br: '"Sãa sãa" = wẽ. Répétition kpɑɑru mɔ.' }
      },
    ]
  },

  // ─────────────────────────────────────────────────────────────────
  // 9. QUESTIONS & INTERROGATION
  // ─────────────────────────────────────────────────────────────────
  {
    id: 'questions',
    title: { fr: 'Poser des questions', br: 'Kasuurenu kuo' },
    icon: '❓',
    color: '#D97706',
    sections: [
      {
        title: { fr: 'Mots interrogatifs', br: 'Kasuu yenu' },
        content: {
          fr: 'Le Bariba forme les questions soit avec des mots interrogatifs spécifiques (quand, où, qui...), soit par l\'intonation montante ou un marqueur en fin de phrase. Les mots interrogatifs se placent souvent en début de phrase.',
          br: 'Baatɔnum kasuurenu mots interrogatifs mɔ (domma, mɑnɑ, wɔ̃ɔ...) kɑ intonation kɑ marqueur mɔ.'
        },
        table: {
          headers: ['Français', 'Bariba', 'Exemple'],
          rows: [
            ['Quand ?', 'Domma ?', 'Domma a na ? (Quand es-tu venu ?)'],
            ['Où ?', 'Mɑnɑ ?', 'Mɑnɑ ɑ wɑ̃ɑ ? (Où es-tu ?)'],
            ['Qui ?', 'Wɔ̃ɔ ?', 'Wɔ̃ɔ u na ? (Qui est venu ?)'],
            ['Quoi ?', 'Yira / Are ?', 'Are yira ? (Quoi / Pourquoi ?)'],
            ['Comment ?', 'Dere ?', 'Dere mɔ ? (Comment ?)'],
            ['Est-ce que ?', '...wa ?', 'A tɔn be wa ? (As-tu vu ces gens ?)'],
          ]
        },
        examples: [
          { bariba: 'Domma a na ?', french: 'Quand es-tu venu ?', note: 'Domma = quand' },
          { bariba: 'Mɑnɑ ɑ wɑ̃ɑ ?', french: 'Où es-tu ?', note: 'Mɑnɑ = où' },
          { bariba: 'A tɔn be wa ?', french: 'As-tu vu ces gens ?', note: 'wa = marqueur interrogatif en fin' },
          { bariba: 'Wɔ̃ɔ u na ?', french: 'Qui est venu ?', note: 'Wɔ̃ɔ = qui' },
        ],
        tip: {
          fr: '💡 Le marqueur "wa" en fin de phrase transforme une affirmation en question oui/non.',
          br: '💡 "wa" kpeeru sɔɔ, affirmation kasuu bɑɑrɑmɔ.'
        }
      }
    ],
    quiz: [
      {
        question: { fr: 'Comment dit-on "Quand ?" en Bariba ?', br: '"Domma" Fãsei sɔɔ ?' },
        options: ['Mɑnɑ', 'Wɔ̃ɔ', 'Domma', 'Dere'],
        correctIndex: 2,
        explanation: { fr: 'Domma = Quand. Exemple : "Domma a na ?" = Quand es-tu venu ?', br: 'Domma = Quand. "Domma a na ?"' }
      },
      {
        question: { fr: 'Comment transformer une phrase en question oui/non ?', br: 'Kasuu oui/non kpindu ?' },
        options: ['Ajouter "est-ce que"', 'Ajouter "wa" à la fin', 'Changer l\'ordre des mots', 'Ajouter "ǹ" au début'],
        correctIndex: 1,
        explanation: { fr: 'On ajoute "wa" en fin de phrase : "A tɔn be wa ?" = As-tu vu ces gens ?', br: '"wa" kpeeru sɔɔ : "A tɔn be wa ?"' }
      },
    ]
  },

  // ─────────────────────────────────────────────────────────────────
  // 10. VOCABULAIRE ESSENTIEL
  // ─────────────────────────────────────────────────────────────────
  {
    id: 'vocabulaire',
    title: { fr: 'Vocabulaire essentiel', br: 'Yenu kpɑɑrenu' },
    icon: '📖',
    color: '#22C55E',
    sections: [
      {
        title: { fr: 'Mots de base indispensables', br: 'Yenu kpɑɑrenu tɛntɛmɑ' },
        content: {
          fr: 'Voici les mots les plus importants pour communiquer au quotidien en Bariba. Apprenez-les par cœur !',
          br: 'Yenu kpɑɑrenu baadoma sɔɔ. Debu sũu sɔɔ !'
        },
        table: {
          headers: ['Français', 'Bariba', 'Catégorie'],
          rows: [
            ['Oui', 'Ɔ̃ɔ̃ / Ee', 'Réponse'],
            ['Non', 'Aawo', 'Réponse'],
            ['Eau', 'Nim', 'Nature'],
            ['Feu', 'Dɔ̃ɔ', 'Nature'],
            ['Terre', 'Tem', 'Nature'],
            ['Soleil', 'Yɑm', 'Nature'],
            ['Lune', 'Siiru', 'Nature'],
            ['Homme', 'Durɔ', 'Personne'],
            ['Femme', 'Kurɔ', 'Personne'],
            ['Enfant', 'Bii', 'Personne'],
            ['Maison', 'Yɛnu', 'Lieu'],
            ['Village', 'Wuu', 'Lieu'],
            ['Route', 'Swaa', 'Lieu'],
            ['Champ', 'Gberu', 'Lieu'],
            ['Manger', 'Di', 'Verbe'],
            ['Boire', 'Nɔ', 'Verbe'],
            ['Aller', 'Da', 'Verbe'],
            ['Venir', 'Na', 'Verbe'],
            ['Faire', 'Ko', 'Verbe'],
            ['Voir', 'Wa / Mɛɛri', 'Verbe'],
            ['Dire', 'Nɛɛ', 'Verbe'],
            ['Dormir', 'Kpuna', 'Verbe'],
            ['Aujourd\'hui', 'Gisɔ', 'Temps'],
            ['Demain', 'Yɑmɔ', 'Temps'],
            ['Hier', 'Yinɑ', 'Temps'],
            ['Maintenant', 'Tɛ̃', 'Temps'],
            ['Bien', 'Sãa sãa', 'Qualité'],
            ['Grand', 'Baka / Kpã', 'Qualité'],
            ['Petit', 'Kpe / Swia', 'Qualité'],
            ['Bon', 'Do / Nɔɔra', 'Qualité'],
          ]
        }
      },
      {
        title: { fr: 'Verbes d\'état (Qualité)', br: 'Korenu kpindu (veq)' },
        content: {
          fr: 'Le Bariba a des "verbes de qualité" (veq) qui expriment des états permanents. Ils sont invariables et ne se conjuguent pas avec les particules de temps normales.',
          br: 'Baatɔnum "korenu kpindu" (veq) mɔ, états permanents. Kun bɑɑrɑmɔ particules wɑɑru sɔɔ.'
        },
        table: {
          headers: ['Bariba', 'Sens', 'Verbe d\'action associé'],
          rows: [
            ['yɔ̃̀', 'être debout', 'yɔ̃ra (se lever)'],
            ['sɔ̃̀', 'être assis', 'sina (s\'asseoir)'],
            ['kpã', 'être grand', 'kpɛ̃̀a (grandir)'],
            ['kpĩ', 'être couché', 'kpuna (se coucher)'],
            ['duku', 'être profond', 'dukua (approfondir)'],
            ['nɔɔra', 'être bon', '-'],
            ['wɑri', 'être mauvais', '-'],
          ]
        },
        tip: {
          fr: '💡 Un verbe de qualité décrit un état (être debout, être grand), tandis que le verbe d\'action associé décrit le changement (se lever, grandir).',
          br: '💡 Veq état mɔ (yɔ̃̀ = être debout), koru action changement mɔ (yɔ̃ra = se lever).'
        }
      }
    ],
    quiz: [
      {
        question: { fr: 'Comment dit-on "Non" en Bariba ?', br: '"Aawo" Fãsei sɔɔ ?' },
        options: ['Ee', 'Aawo', 'Ɔ̃ɔ̃', 'Kun'],
        correctIndex: 1,
        explanation: { fr: 'Aawo = Non. Ee / Ɔ̃ɔ̃ = Oui.', br: 'Aawo = Non. Ee / Ɔ̃ɔ̃ = Oui.' }
      },
      {
        question: { fr: 'Comment dit-on "manger" ?', br: '"Di" Fãsei sɔɔ ?' },
        options: ['Da', 'Di', 'Ko', 'Na'],
        correctIndex: 1,
        explanation: { fr: 'Di = manger. Da = aller. Ko = faire. Na = venir.', br: 'Di = manger. Da = aller. Ko = faire. Na = venir.' }
      },
      {
        question: { fr: '"yɔ̃̀" signifie :', br: '"yɔ̃̀" nɛɛmɔ :' },
        options: ['être assis', 'être debout', 'être couché', 'être grand'],
        correctIndex: 1,
        explanation: { fr: 'yɔ̃̀ = être debout (verbe de qualité). yɔ̃ra = se lever (verbe d\'action).', br: 'yɔ̃̀ = être debout (veq). yɔ̃ra = se lever (action).' }
      },
    ]
  },

  // ─────────────────────────────────────────────────────────────────
  // 11. EXPRESSIONS & IDIOMES
  // ─────────────────────────────────────────────────────────────────
  {
    id: 'expressions_idiomes',
    title: { fr: 'Expressions & Idiomes', br: 'Nɛɛrenu kɑ yenu kpɑɑrenu' },
    icon: '💬',
    color: '#A855F7',
    sections: [
      {
        title: { fr: 'Salutations essentielles', br: 'Salutations kpɑɑrenu' },
        content: {
          fr: 'Les salutations sont au cœur de la culture Bariba. Ne jamais omettre de saluer quelqu\'un avant de parler !',
          br: 'Salutations Baatɔnum kpɑɑru mɔ. Kun tɔmbu sɛ̃ɛ nɛɛ sɔ̃ɔ saluer !'
        },
        table: {
          headers: ['Français', 'Bariba', 'Contexte'],
          rows: [
            ['Bonjour (matin)', 'Kua dɔ̃ɔ', 'Le matin'],
            ['Bonsoir', 'Kua wɛrɛ', 'Le soir'],
            ['Comment vas-tu ?', 'A kɛra?', 'Question de santé'],
            ['Je vais bien', 'Na kɛra sãa sãa', 'Réponse positive'],
            ['Bienvenue', 'Aagu wunɛ ka weru', 'Accueil'],
            ['Merci', 'A nii koo', 'Gratitude'],
            ['Merci beaucoup', 'A nii koo sãa sãa', 'Grande gratitude'],
            ['Au revoir', 'Ka bɛsɛ', 'Départ'],
            ['Bonne nuit', 'Ka kpunu sãa', 'Avant dormir'],
            ['Comment va la famille ?', 'Yɛnu tɔmbu ba kɛra?', 'Politesse'],
          ]
        },
      },
      {
        title: { fr: 'Émotions et états', br: 'Sũu kɑ kpindu' },
        content: {
          fr: 'Les expressions d\'émotions en Bariba utilisent souvent "sũu" (cœur) ou des constructions avec "man dera" (me prend).',
          br: '"Sũu" (cœur) kɑ "man dera" (me prend) émotions yiramɔ.'
        },
        table: {
          headers: ['Français', 'Bariba', 'Littéral'],
          rows: [
            ['Je suis content', 'Nɛn sũu doma', 'Mon cœur est doux'],
            ['Je suis triste', 'Nɛn sũu sɛ̃rɑ', 'Mon cœur est dur'],
            ['Je suis en colère', 'Nɛn sũu gbirima', 'Mon cœur est chaud'],
            ['J\'ai faim', 'Gɔ̃ɔ man dera', 'La faim me prend'],
            ['J\'ai soif', 'Nim nɔnkuru man dera', 'L\'envie d\'eau me prend'],
            ['J\'ai peur', 'Dukua man dera', 'La peur me prend'],
            ['Je suis fatigué', 'Na biru', 'Je suis usé'],
            ['C\'est bien', 'Ga nɔɔra', 'C\'est bon'],
          ]
        },
        tip: {
          fr: '💡 En Bariba, les émotions sont souvent liées au "sũu" (cœur). Un cœur "doux" = content, un cœur "dur" = triste.',
          br: '💡 Sũu (cœur) émotions mɔ. Sũu doma = content, sũu sɛ̃rɑ = triste.'
        }
      },
      {
        title: { fr: 'Proverbes et sagesse', br: 'Yenu kpɑɑrenu kɑ deburu' },
        content: {
          fr: 'Les proverbes (gɛsɛru) occupent une place centrale dans la culture Bariba. Ils transmettent la sagesse des anciens.',
          br: 'Gɛsɛru Baatɔnum culture sɔɔ kpɑɑru mɔ. Tɔmbu bakɑrɑnu deburu mɔ.'
        },
        examples: [
          { bariba: 'Tɔmbu ba yɛru dɔmbɔ sɔɔ, sɛ̃ɛ kun ba dera', french: 'L\'union fait la force', note: 'Quand les gens sont ensemble, la fatigue ne les prend pas' },
          { bariba: 'Goo u gɑ̃ɑ kasuu, u ga bɛri', french: 'Qui cherche trouve', note: 'Si quelqu\'un cherche quelque chose, il le voit' },
          { bariba: 'Teru kun bɔ dɔmbɔ sɔɔ', french: 'L\'arbre ne tombe pas d\'un seul coup', note: 'La persévérance' },
          { bariba: 'Muna swaa nɔɔra mɔ', french: 'La patience est un chemin de fleurs', note: 'Vertu de la patience' },
        ]
      }
    ],
    quiz: [
      {
        question: { fr: 'Comment dit-on "Comment vas-tu ?" en Bariba ?', br: '"A kɛra?" Fãsei sɔɔ ?' },
        options: ['Kua dɔ̃ɔ', 'A kɛra?', 'Ka bɛsɛ', 'A nii koo'],
        correctIndex: 1,
        explanation: { fr: '"A kɛra?" est la salutation quotidienne pour demander des nouvelles.', br: '"A kɛra?" salutation baadoma mɔ.' }
      },
      {
        question: { fr: '"Nɛn sũu doma" signifie :', br: '"Nɛn sũu doma" nɛɛmɔ :' },
        options: ['J\'ai faim', 'Je suis content', 'Je suis triste', 'J\'ai peur'],
        correctIndex: 1,
        explanation: { fr: 'Littéralement "Mon cœur est doux" = je suis content.', br: '"Nɛn sũu doma" = cœur doux = content.' }
      },
      {
        question: { fr: 'Que signifie le proverbe "Teru kun bɔ dɔmbɔ sɔɔ" ?', br: '"Teru kun bɔ dɔmbɔ sɔɔ" nɛɛmɔ ?' },
        options: ['L\'arbre est grand', 'L\'arbre ne tombe pas d\'un seul coup', 'L\'arbre porte des fruits', 'Plante un arbre'],
        correctIndex: 1,
        explanation: { fr: 'Ce proverbe enseigne la persévérance : rien ne se fait en un jour.', br: 'Gɛsɛru persévérance debumɔ.' }
      },
    ]
  },

  // ─────────────────────────────────────────────────────────────────
  // 12. VOCABULAIRE THÉMATIQUE AVANCÉ
  // ─────────────────────────────────────────────────────────────────
  {
    id: 'vocabulaire_avance',
    title: { fr: 'Vocabulaire thématique', br: 'Yenu kɑ̃ɑnu sɔɔ' },
    icon: '📚',
    color: '#F43F5E',
    sections: [
      {
        title: { fr: 'Le corps humain', br: 'Tɔmbu gbãa' },
        content: {
          fr: 'Les parties du corps sont parmi les mots les plus utilisés en Bariba au quotidien.',
          br: 'Gbãa yenu baadoma sɔɔ kpɑɑru mɔ.'
        },
        table: {
          headers: ['Français', 'Bariba'],
          rows: [
            ['Tête', 'Wiru'],
            ['Bouche', 'Nɔɔ'],
            ['Œil', 'Nɔni'],
            ['Oreille', 'Turuku'],
            ['Main', 'Nɔmu'],
            ['Pied', 'Gɔru'],
            ['Ventre', 'Binɛ'],
            ['Dos', 'Kpiru'],
            ['Cœur', 'Sũu'],
            ['Dent', 'Yiru'],
          ]
        },
      },
      {
        title: { fr: 'Nourriture et cuisine', br: 'Diru kɑ koru' },
        content: {
          fr: 'La nourriture est centrale dans la vie sociale Bariba. Connaître ces mots facilite les échanges quotidiens.',
          br: 'Diru Baatɔnum baadoma sɔɔ kpɑɑru mɔ.'
        },
        table: {
          headers: ['Français', 'Bariba'],
          rows: [
            ['Bouillie de céréales', 'Koko'],
            ['Riz', 'Monri'],
            ['Igname', 'Dɔkuru / Teru'],
            ['Igname pilée', 'Sɔkura'],
            ['Gombo', 'Abo'],
            ['Viande', 'Nɛmu'],
            ['Poisson', 'Swɛ̃ɛ'],
            ['Sauce', 'Wɔri'],
            ['Sel', 'Yɔ̃ɔ'],
            ['Piment', 'Tukuru'],
            ['Lait', 'Nim wɑ̃ɑru'],
          ]
        },
      },
      {
        title: { fr: 'Jours et temps', br: 'Tɔ̃ɔnu kɑ wɑɑru' },
        content: {
          fr: 'Les expressions temporelles en Bariba permettent de situer les événements dans le temps.',
          br: 'Wɑɑru yenu événements baama yiramɔ.'
        },
        table: {
          headers: ['Français', 'Bariba'],
          rows: [
            ['Aujourd\'hui', 'Gisɔ'],
            ['Demain', 'Yɑmɔ'],
            ['Hier', 'Yinɑ'],
            ['Maintenant', 'Tɛ̃'],
            ['Matin', 'Dɔ̃ɔ yibu'],
            ['Soir', 'Wɛrɛ'],
            ['Nuit', 'Yɑm wɔ̃kuru'],
            ['Toujours', 'Sɑ̃ɑ kpuro'],
            ['Bientôt', 'Nɛn giru sɔɔ'],
            ['Longtemps', 'Wɑɑru kpã'],
          ]
        },
      }
    ],
    quiz: [
      {
        question: { fr: 'Comment dit-on "tête" en Bariba ?', br: '"Wiru" Fãsei sɔɔ ?' },
        options: ['Nɔɔ', 'Wiru', 'Sũu', 'Nɔni'],
        correctIndex: 1,
        explanation: { fr: 'Wiru = tête. Nɔɔ = bouche, Sũu = cœur, Nɔni = œil.', br: 'Wiru = tête.' }
      },
      {
        question: { fr: 'Quel est le mot Bariba pour "riz" ?', br: '"Riz" Baatɔnum ?' },
        options: ['Dɔkuru', 'Swɛ̃ɛ', 'Monri', 'Nɛmu'],
        correctIndex: 2,
        explanation: { fr: 'Monri = riz (on le MANGE : di). Koko = bouillie de céréales (on la BOIT : nonra). Dɔkuru = igname, Swɛ̃ɛ = poisson.', br: 'Monri = riz (di). Koko = bouillie (nonra).' }
      },
      {
        question: { fr: 'Comment dit-on "demain" ?', br: '"Yɑmɔ" Fãsei sɔɔ ?' },
        options: ['Gisɔ', 'Yinɑ', 'Yɑmɔ', 'Tɛ̃'],
        correctIndex: 2,
        explanation: { fr: 'Yɑmɔ = demain. Gisɔ = aujourd\'hui, Yinɑ = hier, Tɛ̃ = maintenant.', br: 'Yɑmɔ = demain.' }
      },
    ]
  },
];
