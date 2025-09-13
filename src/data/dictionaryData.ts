export interface DictionaryEntry {
  word: string;
  phonetic: string | null;
  part_of_speech: string;
  definition: string;
  example_bariba: string[];
  example_francais: string[];
  notes: string;
  source_flags: string[];
  incertitude: number;
}

// Extracted and structured dictionary entries from the PDF
export const dictionaryEntries: DictionaryEntry[] = [
  {
    word: "a",
    phonetic: "[a]",
    part_of_speech: "pron",
    definition: "Pronom personnel sujet de la 2ème personne du singulier",
    example_bariba: ["Domma a na?", "A n a Bi wa u gberu ku ra aberu sebe"],
    example_francais: ["Quand es-tu venu?", "Je ne porte pas de chemise quand je suis au champ"],
    notes: "Pluriel: i. Formes focalisées: Ba, aberufoc",
    source_flags: ["pron", "suj", "2ème", "pers", "sing"],
    incertitude: 0.0
  },
  {
    word: "aa",
    phonetic: null,
    part_of_speech: "interj",
    definition: "Interjection d'exclamation exprimant la surprise",
    example_bariba: ["Aa, a na k"],
    example_francais: ["Ah ! Tu es déjà venu !"],
    notes: "",
    source_flags: ["interj"],
    incertitude: 0.0
  },
  {
    word: "a",
    phonetic: "[a]",
    part_of_speech: "interj",
    definition: "Interjection pour attirer l'attention",
    example_bariba: ["a sun, a t n be wa?", "a Woru, mba a kasuu mini?"],
    example_francais: ["Hé chef, as-tu vu ces gens?", "Hé Worou, que cherches-tu ici?"],
    notes: "Variante: hé, hein",
    source_flags: ["interj"],
    incertitude: 0.0
  },
  {
    word: "aagu",
    phonetic: "[aagu]",
    part_of_speech: "interj",
    definition: "Formule de salutation adressée à une personne plus jeune",
    example_bariba: ["Aagu wun ka weru"],
    example_francais: ["Salut ! Bonne arrivée !"],
    notes: "Variante: yeegu, kpasi ka wureba. Pluriel: yeegu",
    source_flags: ["interj"],
    incertitude: 0.0
  },
  {
    word: "aaku",
    phonetic: "[ààk]",
    part_of_speech: "interj",
    definition: "Interjection de surprise, parfois mêlée de crainte",
    example_bariba: ["Àku, na k k"],
    example_francais: ["Oh ! je n'en ai pas le courage"],
    notes: "",
    source_flags: ["interj"],
    incertitude: 0.0
  },
  {
    word: "aawo",
    phonetic: "[àa wò]",
    part_of_speech: "interj",
    definition: "Interjection de négation",
    example_bariba: ["Aawo na mö"],
    example_francais: ["Non, je ne fais pas ; je ne ferai pas"],
    notes: "",
    source_flags: ["interj"],
    incertitude: 0.0
  },
  {
    word: "aba",
    phonetic: "[aba / abà]",
    part_of_speech: "interj",
    definition: "Interjection d'acquiescement, de compréhension",
    example_bariba: ["Aba, na tuba t"],
    example_francais: ["Voilà, je comprends maintenant"],
    notes: "Variante: abà",
    source_flags: ["interj", "n:g"],
    incertitude: 0.0
  },
  {
    word: "abarakunkunku",
    phonetic: "[àbàràk nkùnk]",
    part_of_speech: "n",
    definition: "Petit insecte puant, sorte de punaise",
    example_bariba: ["Sa g a di sa ka kpun, abarakunkunku ga b s n kpee w ri"],
    example_francais: ["Hier nous n'avons pas mangé avant de nous coucher, un insecte puant est tombé dans notre sauce"],
    notes: "Focalisé: abarakunkunkuwa. Pluriel: barakunkunkunu",
    source_flags: ["foc", "n:g"],
    incertitude: 0.0
  },
  {
    word: "abereku",
    phonetic: "[àbereku/yàbereku]",
    part_of_speech: "n",
    definition: "Vautour, charognard",
    example_bariba: ["Ba kù rà abereku tem bin n s"],
    example_francais: ["On ne mange pas le vautour pour le plaisir"],
    notes: "Variante: yabereku. Focalisé: aberekuwa. Pluriel: aberekunu",
    source_flags: ["foc", "n:t"],
    incertitude: 0.0
  },
  {
    word: "àgbaara",
    phonetic: "[àgbààrà]",
    part_of_speech: "n",
    definition: "Soupe",
    example_bariba: ["Ba sak gen wiru yikua, ma ba ka ten nim agbaara kua"],
    example_francais: ["Ils ont bouilli la tête du phacochère, et ils en ont fait de la soupe"],
    notes: "",
    source_flags: ["n:y"],
    incertitude: 0.0
  },
  {
    word: "adama",
    phonetic: "[àdàma]",
    part_of_speech: "conj",
    definition: "Conjonction de coordination exprimant l'opposition",
    example_bariba: ["N turo na kp, adama b s yiru sa ko kp"],
    example_francais: ["Seul je ne peux le faire, mais à deux nous y arriverons"],
    notes: "",
    source_flags: ["conj", "coord"],
    incertitude: 0.0
  },
  {
    word: "adaru",
    phonetic: null,
    part_of_speech: "n",
    definition: "Coupe-coupe, machette",
    example_bariba: ["Yè Woru u gberu d, u win adaru sua u n ni"],
    example_francais: ["Lorsque Woru allait au champ, il a pris son coupe-coupe"],
    notes: "Synonyme: Kèndi. Focalisé: adara. Pluriel: adanu",
    source_flags: ["n:t"],
    incertitude: 0.0
  },
  {
    word: "agbagba",
    phonetic: "[agbagba]",
    part_of_speech: "n",
    definition: "Bananier plantain",
    example_bariba: ["B s n gber agbagbabara ba yiba"],
    example_francais: ["Dans notre champ, les bananiers plantains sont nombreux"],
    notes: "Musa paradisiaca (Musacées). Focalisé: agbagbawa. Pluriel: agbagbaba",
    source_flags: ["n:y"],
    incertitude: 0.0
  },
  {
    word: "agbada",
    phonetic: "[agbada]",
    part_of_speech: "n",
    definition: "Grand boubou, vêtement traditionnel",
    example_bariba: ["Woru u ra win agbada sebe t bakaru s nu"],
    example_francais: ["Woru porte son grand boubou les jours de fête"],
    notes: "Focalisé: agbadawa. Pluriel: agbadaba",
    source_flags: ["n:y"],
    incertitude: 0.0
  },
  {
    word: "agbanga",
    phonetic: "[agbanga]",
    part_of_speech: "n",
    definition: "Case rectangulaire par opposition à la case ronde",
    example_bariba: [],
    example_francais: [],
    notes: "Focalisé: agbanga. Pluriel: agbangaba",
    source_flags: [],
    incertitude: 0.1
  },
  {
    word: "agbansasa",
    phonetic: null,
    part_of_speech: "n",
    definition: "Petit oiseau aux couleurs ternes",
    example_bariba: ["Agbansasa ya ku ra sw nde gb diiku"],
    example_francais: ["Le petit oiseau ne chante pas comme le mange-mil"],
    notes: "Focalisé: agbansawa. Pluriel: agbansasi",
    source_flags: ["n:y"],
    incertitude: 0.0
  },
  {
    word: "agbanseku",
    phonetic: "[agbanseku]",
    part_of_speech: "n",
    definition: "Herbe cochon femelle",
    example_bariba: ["B s n gber agbansekunu nu dabi"],
    example_francais: ["Dans notre champ, il y a beaucoup d'herbes cochons"],
    notes: "Boerhavia diffusa (Nyctaginacées). Focalisé: agbansekuwa. Pluriel: agbanseku",
    source_flags: ["n:g"],
    incertitude: 0.0
  },
  {
    word: "agbanseku dwaabuu",
    phonetic: "[àgbà sèku dwaabuu]",
    part_of_speech: "n",
    definition: "Herbe cochon mâle",
    example_bariba: ["Yakas wa ba rà ka agbansekunu dwaabunu yinn"],
    example_francais: ["On trouve les herbes cochons mâles dans la brousse"],
    notes: "Boerhavia erecta (Nyctaginacées). Focalisé: agbanseku dwaabuuwa",
    source_flags: ["n:g"],
    incertitude: 0.0
  },
  {
    word: "àgbara",
    phonetic: null,
    part_of_speech: "n",
    definition: "Clôture, mur",
    example_bariba: ["Ba àgbara bana ba ka sina kpaaru sikerena", "Sabi u win y nu àgbara tobi"],
    example_francais: ["Ils ont fait une clôture autour de la maison du chef", "Chabi a clôturé sa maison"],
    notes: "Focalisé: àgbarawa. Pluriel: agbaraba",
    source_flags: [],
    incertitude: 0.0
  },
  {
    word: "agbegi",
    phonetic: "[àgbégi]",
    part_of_speech: "n",
    definition: "Menuisier, artisan du bois",
    example_bariba: ["Agbegi u koo b s n taabulu s m"],
    example_francais: ["Le menuisier va réparer notre table"],
    notes: "Focalisé: agbegiwa. Pluriel: agbegiba",
    source_flags: [],
    incertitude: 0.0
  }
];