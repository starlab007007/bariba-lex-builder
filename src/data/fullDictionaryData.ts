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
  // Nouveaux champs pour la recherche bidirectionnelle
  french_keywords: string[]; // mots-clés français extraits pour la recherche inverse
  variants: string[]; // variantes du mot bariba
}

export interface BiDirectionalIndex {
  bariba_to_french: Map<string, DictionaryEntry[]>;
  french_to_bariba: Map<string, DictionaryEntry[]>;
}

// Dictionnaire exhaustif extrait du PDF complet
export const comprehensiveDictionaryEntries: DictionaryEntry[] = [
  // Entrées précédentes + nouvelles entrées extraites
  {
    word: "a",
    phonetic: "[a]",
    part_of_speech: "pron",
    definition: "Pronom personnel sujet de la 2ème personne du singulier",
    example_bariba: ["Domma a na?", "A n a Bi wa u gberu ku ra aberu sebe", "A do!", "A dio"],
    example_francais: ["Quand es-tu venu?", "Je ne porte pas de chemise quand je suis au champ", "Va!", "Mange!"],
    notes: "Pluriel: i. Formes focalisées: Ba, aberufoc. Utilisé aussi pour l'impératif",
    source_flags: ["pron", "suj", "2ème", "pers", "sing"],
    incertitude: 0.0,
    french_keywords: ["tu", "pronom", "personne", "sujet", "deuxième"],
    variants: ["a"]
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
    incertitude: 0.0,
    french_keywords: ["ah", "surprise", "exclamation", "déjà"],
    variants: ["aa"]
  },
  {
    word: "a",
    phonetic: "[a]",
    part_of_speech: "interj",
    definition: "Interjection pour attirer l'attention",
    example_bariba: ["a sun, a t n be wa?", "a Woru, mba a kasuu mini?", "a Bi, a seewo a gbee te da"],
    example_francais: ["Hé chef, as-tu vu ces gens?", "Hé Worou, que cherches-tu ici?", "Hé Bio, lève-toi pour aller au champ!"],
    notes: "Variante: hé, hein",
    source_flags: ["interj"],
    incertitude: 0.0,
    french_keywords: ["hé", "hein", "attention", "chef", "chercher"],
    variants: ["a"]
  },
  {
    word: "aagu",
    phonetic: "[aagu]",
    part_of_speech: "interj",
    definition: "Formule de salutation adressée à une personne plus jeune",
    example_bariba: ["Aagu wun ka weru", "Yeegu, kpasi ka wureba"],
    example_francais: ["Salut ! Bonne arrivée !", "Salut ! Les Kpasi et les Wure"],
    notes: "Variante: yeegu, kpasi ka wureba. Pluriel: yeegu",
    source_flags: ["interj"],
    incertitude: 0.0,
    french_keywords: ["salut", "salutation", "jeune", "arrivée", "bonjour"],
    variants: ["aagu", "yeegu"]
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
    incertitude: 0.0,
    french_keywords: ["oh", "surprise", "crainte", "courage", "peur"],
    variants: ["aaku", "àku"]
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
    incertitude: 0.0,
    french_keywords: ["non", "négation", "refus", "faire"],
    variants: ["aawo"]
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
    incertitude: 0.0,
    french_keywords: ["voilà", "comprendre", "maintenant", "clair", "acquiescement"],
    variants: ["aba", "abà"]
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
    incertitude: 0.0,
    french_keywords: ["insecte", "punaise", "puant", "petit", "sauce"],
    variants: ["abarakunkunku"]
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
    incertitude: 0.0,
    french_keywords: ["vautour", "charognard", "oiseau", "manger", "plaisir"],
    variants: ["abereku", "yabereku"]
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
    incertitude: 0.0,
    french_keywords: ["soupe", "bouillir", "tête", "phacochère", "cuisine"],
    variants: ["àgbaara", "agbaara"]
  },
  // Nouvelles entrées extraites du PDF
  {
    word: "adama",
    phonetic: "[àdàma]",
    part_of_speech: "conj",
    definition: "Conjonction de coordination exprimant l'opposition",
    example_bariba: ["N turo na kp, adama b s yiru sa ko kp", "Kaa teeru s, ba d duke, adama na nun s m ten tè s d yi w a"],
    example_francais: ["Seul je ne peux le faire, mais à deux nous y arriverons", "Ils ont mis du poison dans une des calebasses, mais je ne te dirai pas dans laquelle"],
    notes: "",
    source_flags: ["conj", "coord"],
    incertitude: 0.0,
    french_keywords: ["mais", "opposition", "cependant", "coordination"],
    variants: ["adama"]
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
    incertitude: 0.0,
    french_keywords: ["coupe-coupe", "machette", "outil", "champ", "prendre"],
    variants: ["adaru"]
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
    incertitude: 0.0,
    french_keywords: ["bananier", "plantain", "banane", "champ", "nombreux", "plante"],
    variants: ["agbagba"]
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
    incertitude: 0.0,
    french_keywords: ["boubou", "vêtement", "traditionnel", "porter", "fête", "grand"],
    variants: ["agbada"]
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
    incertitude: 0.1,
    french_keywords: ["case", "rectangulaire", "maison", "habitation", "rond"],
    variants: ["agbanga"]
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
    incertitude: 0.0,
    french_keywords: ["oiseau", "petit", "couleurs", "ternes", "chanter", "mange-mil"],
    variants: ["agbansasa"]
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
    incertitude: 0.0,
    french_keywords: ["herbe", "cochon", "femelle", "plante", "champ", "beaucoup"],
    variants: ["agbanseku"]
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
    incertitude: 0.0,
    french_keywords: ["herbe", "cochon", "mâle", "plante", "brousse", "trouver"],
    variants: ["agbanseku dwaabuu"]
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
    incertitude: 0.0,
    french_keywords: ["clôture", "mur", "maison", "chef", "autour", "clôturer"],
    variants: ["àgbara", "agbara"]
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
    incertitude: 0.0,
    french_keywords: ["menuisier", "artisan", "bois", "réparer", "table", "métier"],
    variants: ["agbegi"]
  },
  // Nouvelles entrées significatives du PDF étendu
  {
    word: "agbogi",
    phonetic: null,
    part_of_speech: "n",
    definition: "Tabouret",
    example_bariba: ["Agbogi yen s mbura w ra"],
    example_francais: ["La finition de ce tabouret est bien soignée"],
    notes: "Focalisé: agbogiwa. Pluriel: agbogiba",
    source_flags: [],
    incertitude: 0.0,
    french_keywords: ["tabouret", "siège", "finition", "soigné", "meuble"],
    variants: ["agbogi"]
  },
  {
    word: "adaamisi",
    phonetic: "[àdàam sì]",
    part_of_speech: "n",
    definition: "Jeudi",
    example_bariba: ["Ben wuun yabura adaamisi", "Adaamisi s na b s n wuun yaburu"],
    example_francais: ["Le jour du marché de leur village est jeudi", "C'est jeudi le jour du marché de notre village"],
    notes: "Focalisé: adaamisiwa. Pluriel: adaamisiba",
    source_flags: ["n:y"],
    incertitude: 0.0,
    french_keywords: ["jeudi", "jour", "marché", "village", "semaine"],
    variants: ["adaamisi", "alaamisi"]
  },
  {
    word: "agama naki",
    phonetic: "[agama naki]",
    part_of_speech: "n",
    definition: "Caméléon",
    example_bariba: ["Agama naki ga sina sanum y"],
    example_francais: ["Le caméléon sait marcher comme un roi"],
    notes: "Focalisé: agama nakiwa. Pluriel: agama nakinu",
    source_flags: [],
    incertitude: 0.0,
    french_keywords: ["caméléon", "animal", "reptile", "marcher", "roi", "savoir"],
    variants: ["agama naki"]
  },
  {
    word: "ag d",
    phonetic: "[àg d]",
    part_of_speech: "n",
    definition: "Banane",
    example_bariba: ["Ag d ye ya do", "Ag d ya yen nim m gura ya sere na"],
    example_francais: ["Cette banane est bonne", "Le bananier est gorgé d'eau même sans la pluie"],
    notes: "Focalisé: ag d wa. Pluriel: ag d ba",
    source_flags: ["n:y"],
    incertitude: 0.0,
    french_keywords: ["banane", "fruit", "bon", "bananier", "eau", "pluie"],
    variants: ["ag d"]
  },
  {
    word: "agirigirin",
    phonetic: "[agirigirinu]",
    part_of_speech: "n",
    definition: "Oreillons",
    example_bariba: ["Agirigirina bii wi uplbar"],
    example_francais: ["Cet enfant souffre des oreillons"],
    notes: "Focalisé: agirigirina",
    source_flags: ["n:n"],
    incertitude: 0.0,
    french_keywords: ["oreillons", "maladie", "enfant", "souffrir", "santé"],
    variants: ["agirigirin"]
  },
  {
    word: "agogo",
    phonetic: "[agogô]",
    part_of_speech: "n",
    definition: "Montre, pendule, igname précoce",
    example_bariba: ["N n agogo ya sankira", "Wuburu sanama, sa ra agogo gbe"],
    example_francais: ["Ma montre est en panne", "Pendant la saison des pluies que nous récoltons les ignames précoces"],
    notes: "Focalisé: agogowa. Pluriel: agogonu. Double sens: 1) montre 2) igname précoce",
    source_flags: ["n:y"],
    incertitude: 0.0,
    french_keywords: ["montre", "pendule", "temps", "igname", "précoce", "récolter", "panne"],
    variants: ["agogo"]
  },
  {
    word: "akankari",
    phonetic: "[akankari]",
    part_of_speech: "n",
    definition: "Scorpion noir",
    example_bariba: ["Akankari yà n nun toba, sobia ba rà ka gabirin"],
    example_francais: ["Si le scorpion noir te pique, on lutte avec le pilon"],
    notes: "Variante: kàkonkakon. Focalisé: akankariwa. Pluriel: akankariba",
    source_flags: [],
    incertitude: 0.0,
    french_keywords: ["scorpion", "noir", "piquer", "lutte", "pilon", "animal"],
    variants: ["akankari", "kàkonkakon"]
  },
  {
    word: "akanu",
    phonetic: "[akanu]",
    part_of_speech: "n",
    definition: "Gourmandise, gloutonnerie",
    example_bariba: ["U ku ra g anu di piiko, u akanu m"],
    example_francais: ["Il ne mange pas un peu, il mange avec gloutonnerie"],
    notes: "Variante: yàkanu. Focalisé: akana",
    source_flags: [],
    incertitude: 0.0,
    french_keywords: ["gourmandise", "gloutonnerie", "manger", "beaucoup", "avidité"],
    variants: ["akanu", "yàkanu"]
  },
  {
    word: "amak",
    phonetic: "[amak]",
    part_of_speech: "n",
    definition: "Hamac",
    example_bariba: ["B s n saa amak suabu bu kpeem"],
    example_francais: ["En notre temps, le transport en hamac existe de moins en moins"],
    notes: "Focalisé: amak wa. Pluriel: amak ba",
    source_flags: ["n:y"],
    incertitude: 0.0,
    french_keywords: ["hamac", "transport", "temps", "moins", "dormir"],
    variants: ["amak"]
  },
  {
    word: "akiika",
    phonetic: "[àkàkà]",
    part_of_speech: "interj",
    definition: "En effet, c'est ça !",
    example_bariba: ["Bikio kùn toro. Akiika"],
    example_francais: ["Celui qui demande n'a pas tort. En effet c'est ça"],
    notes: "",
    source_flags: ["interj"],
    incertitude: 0.0,
    french_keywords: ["effet", "exactement", "correct", "tort", "demander"],
    variants: ["akiika"]
  },
  {
    word: "alaafia",
    phonetic: "[àla af à]",
    part_of_speech: "n",
    definition: "Bien-être, bonne santé, ça va bien",
    example_bariba: ["U ben alaafia m ribu da", "A kpuna n do ? Alaafia"],
    example_francais: ["Il est allé voir leur état de santé", "As-tu bien dormi ? Comment ça va? Très bien"],
    notes: "Focalisé: alaafiawa. Double sens: 1) bien-être 2) réponse de salutation",
    source_flags: ["n:y"],
    incertitude: 0.0,
    french_keywords: ["bien-être", "santé", "aller", "bien", "dormir", "salutation"],
    variants: ["alaafia"]
  },
  {
    word: "alaamisi",
    phonetic: "[alaamisi]",
    part_of_speech: "n",
    definition: "Jeudi",
    example_bariba: ["Gin teerun alaamisiwa u na"],
    example_francais: ["Jeudi dernier"],
    notes: "Synonyme: adaamisi. Focalisé: alaamisiwa",
    source_flags: [],
    incertitude: 0.0,
    french_keywords: ["jeudi", "dernier", "jour", "semaine"],
    variants: ["alaamisi", "adaamisi"]
  },
  {
    word: "àmi",
    phonetic: "[àm]",
    part_of_speech: "interj",
    definition: "Amen, merci, acceptation d'un souhait",
    example_bariba: ["I turi baani : àmi"],
    example_francais: ["Bon voyage ! Amen"],
    notes: "",
    source_flags: ["interj"],
    incertitude: 0.0,
    french_keywords: ["amen", "merci", "acceptation", "souhait", "voyage"],
    variants: ["àmi"]
  },
  {
    word: "alaaruba",
    phonetic: "[alaaruba]",
    part_of_speech: "n",
    definition: "Mercredi",
    example_bariba: ["Alaaruba s na b s n wuun yaburu"],
    example_francais: ["C'est mercredi le jour du marché de notre village"],
    notes: "Synonyme: adaaruba. Focalisé: alaarubawa",
    source_flags: ["n:y"],
    incertitude: 0.0,
    french_keywords: ["mercredi", "jour", "marché", "village", "semaine"],
    variants: ["alaaruba", "adaaruba"]
  },
  {
    word: "alebu",
    phonetic: "[àlèbu/àdeebu]",
    part_of_speech: "n",
    definition: "Infirmité",
    example_bariba: ["Win alebu ye wasarawa"],
    example_francais: ["Son infirmité est une grande souffrance"],
    notes: "Synonyme: adebu, yadebu. Focalisé: alebuwa. Pluriel: alebuba",
    source_flags: ["n:y"],
    incertitude: 0.0,
    french_keywords: ["infirmité", "souffrance", "grande", "handicap", "maladie"],
    variants: ["alebu", "adeebu", "adebu", "yadebu"]
  },
  {
    word: "alufa",
    phonetic: null,
    part_of_speech: "n",
    definition: "Musulman, marabout, prêtre musulman",
    example_bariba: ["Sun n alufawa u gura t birim"],
    example_francais: ["C'est l'imam qui dirige la prière les jours de fête"],
    notes: "",
    source_flags: ["n:w"],
    incertitude: 0.0,
    french_keywords: ["musulman", "marabout", "prêtre", "imam", "prière", "fête"],
    variants: ["alufa"]
  }
];

// Fonction pour créer l'index bidirectionnel
export function createBiDirectionalIndex(entries: DictionaryEntry[]): BiDirectionalIndex {
  const bariba_to_french = new Map<string, DictionaryEntry[]>();
  const french_to_bariba = new Map<string, DictionaryEntry[]>();

  entries.forEach(entry => {
    // Index Bariba -> Français
    const baribaKey = entry.word.toLowerCase();
    if (!bariba_to_french.has(baribaKey)) {
      bariba_to_french.set(baribaKey, []);
    }
    bariba_to_french.get(baribaKey)!.push(entry);

    // Ajouter les variantes
    entry.variants.forEach(variant => {
      const variantKey = variant.toLowerCase();
      if (!bariba_to_french.has(variantKey)) {
        bariba_to_french.set(variantKey, []);
      }
      bariba_to_french.get(variantKey)!.push(entry);
    });

    // Index Français -> Bariba
    entry.french_keywords.forEach(keyword => {
      const frenchKey = keyword.toLowerCase();
      if (!french_to_bariba.has(frenchKey)) {
        french_to_bariba.set(frenchKey, []);
      }
      french_to_bariba.get(frenchKey)!.push(entry);
    });

    // Ajouter aussi les mots de la définition
    const definitionWords = entry.definition.toLowerCase()
      .split(/[,\s\-\.;:!?]+/)
      .filter(word => word.length > 2);
    
    definitionWords.forEach(word => {
      if (!french_to_bariba.has(word)) {
        french_to_bariba.set(word, []);
      }
      if (!french_to_bariba.get(word)!.includes(entry)) {
        french_to_bariba.get(word)!.push(entry);
      }
    });
  });

  return { bariba_to_french, french_to_bariba };
}

// Index bidirectionnel global
export const dictionaryIndex = createBiDirectionalIndex(comprehensiveDictionaryEntries);