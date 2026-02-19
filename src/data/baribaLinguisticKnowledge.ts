// ═══════════════════════════════════════════════════════════════════
// BASE DE CONNAISSANCES LINGUISTIQUES BARIBA (BAATONUM)
// Compilée pour injection dans le prompt système de refine-bariba
// ═══════════════════════════════════════════════════════════════════

export const BARIBA_GRAMMAR_RULES = `
RÈGLES GRAMMATICALES BARIBA (BAATONUM) :

1. ORDRE DES MOTS : SOV (Sujet-Objet-Verbe)
   - "Na koko di" = Je riz mange (J'ai mangé du riz)
   - "Taaso u nɛmu go" = Le chasseur une biche a tué
   - "Na sɔmburu kasuu" = Je travail cherche
   - L'ordre SVO est parfois utilisé avec des particules

2. PRONOMS :
   Sujet : Na/N(je), A(tu), U(il humain), Ga/Mu(il chose), Sa(nous), I(vous), Ba(ils)
   Objet : Man(me), Nun(te/le), Sun(nous), Bɛɛ(vous), Bu(les)
   Possessif : Nɛn(mon), Wunɛn(ton), Win(son), Sun(notre), Bɛɛn(votre), Ben(leur)
   CRITIQUE : U = humain, Ga/Mu = non-humain. "Nim mu tɛrie" (l'eau couvre, mu=eau)

3. CLASSES NOMINALES :
   -bu/-mbu = humain pluriel (Tɔmbu, Baatɔmbu → pronom Ba)
   a-/y- = animé singulier (Abo/Yabo → pronom Ga/Ya)
   m- = inanimé/abstrait (→ pronom Mu)
   -nu/-su = pluriel/collectif (Abonu, Yɑkɑsu)

4. SYSTÈME VERBAL (pas de conjugaison, particules TAM) :
   Passé/Accompli : ∅ (rien) → "Na koko di" = J'ai mangé du riz
   Futur : koo → "Na koo koko di" = Je vais manger du riz
   Habituel : ra/ra ka → "Ba ra ka kɛrusu..." = Ils fabriquent...
   Progressif : -mɔ → "U sĩimɔ" = Il marche (en cours)
   Conditionnel : n → "Goo ù n nɛn bukaata mɔ" = Si quelqu'un...

5. NÉGATION : ǹ / kun / ku entre sujet et verbe
   - "Na ǹ kãkɔ" = Je n'ai pas le courage
   - "Gɑ̃ɑnu kun wɑ̃ɑ" = Les choses n'existaient pas
   - "U ku rɑ ten binu di" = Tu ne mangeras pas de cet arbre

6. POSTPOSITIONS (après le nom) :
   sɔɔ = dans/à → "Wuu sɔɔ" = Dans le village
   yɛn sɔ̃ = à cause de/pour cette raison
   ka = vers/jusqu'à

7. ADJECTIFS APRÈS LE NOM :
   "Yɑkɑ beku bɑɑɡere" = Toute herbe verte
   "Swɛ̃ɛ bɛkɛ tɑkɑ" = Les grands poissons
   "Kɛkɛ baka" = Un grand camion

8. ÊTRE & AVOIR :
   Être = wɑ̃ɑ → "Mɑnɑ ɑ wɑ̃ɑ?" = Où es-tu?
   Avoir = mɔ → "Na gobin bukaata mɔ" = J'ai besoin d'argent

9. TONALITÉ (3 tons : Haut ´, Moyen ∅, Bas \`) :
   Le ton change le sens. Ton bas sur pronom = subordination.

10. CONNECTEURS :
    Yen biru = Puis/Alors
    Yɛn sɔ̃ = À cause de cela
`;

export const BARIBA_IDIOMS = [
  // === SALUTATIONS ===
  { fr: "Bonjour (matin)", ba: "Kua dɔ̃ɔ", cat: "salutation" },
  { fr: "Bonsoir", ba: "Kua wɛrɛ", cat: "salutation" },
  { fr: "Comment vas-tu ?", ba: "A kɛra?", cat: "salutation" },
  { fr: "Je vais bien", ba: "Na kɛra sãa sãa", cat: "salutation" },
  { fr: "Bienvenue", ba: "Aagu wunɛ ka weru", cat: "salutation" },
  { fr: "Merci", ba: "A nii koo", cat: "salutation" },
  { fr: "Merci beaucoup", ba: "A nii koo sãa sãa", cat: "salutation" },
  { fr: "Au revoir", ba: "Ka bɛsɛ", cat: "salutation" },
  { fr: "Bonne nuit", ba: "Ka kpunu sãa", cat: "salutation" },
  { fr: "Comment va la famille ?", ba: "Yɛnu tɔmbu ba kɛra?", cat: "salutation" },
  // === ÉMOTIONS & ÉTATS ===
  { fr: "Je suis content", ba: "Nɛn sũu doma", cat: "émotion" },
  { fr: "Je suis triste", ba: "Nɛn sũu sɛ̃rɑ", cat: "émotion" },
  { fr: "Je suis fatigué", ba: "Na biru", cat: "émotion" },
  { fr: "J'ai faim", ba: "Gɔ̃ɔ man dera", cat: "émotion" },
  { fr: "J'ai soif", ba: "Nim nɔnkuru man dera", cat: "émotion" },
  { fr: "J'ai peur", ba: "Dukua man dera", cat: "émotion" },
  { fr: "Je suis en colère", ba: "Nɛn sũu gbirima", cat: "émotion" },
  { fr: "Je suis surpris", ba: "Ga man yɛ̃ra", cat: "émotion" },
  { fr: "C'est bien", ba: "Ga nɔɔra", cat: "émotion" },
  { fr: "C'est mauvais", ba: "Ga wɑri", cat: "émotion" },
  // === VERBES FIGÉS & ACTIONS ===
  { fr: "Je vais au marché", ba: "Na koo aburu da", cat: "action" },
  { fr: "Viens ici", ba: "Na mini", cat: "action" },
  { fr: "Assieds-toi", ba: "A sina", cat: "action" },
  { fr: "Lève-toi", ba: "A seewo", cat: "action" },
  { fr: "Mange !", ba: "A dio!", cat: "action" },
  { fr: "Parle !", ba: "A nɛɛ!", cat: "action" },
  { fr: "Écoute !", ba: "A turu!", cat: "action" },
  { fr: "Regarde !", ba: "A mɛɛri!", cat: "action" },
  { fr: "Attends !", ba: "A maraa!", cat: "action" },
  { fr: "Va-t-en !", ba: "A do!", cat: "action" },
  { fr: "Je travaille", ba: "Na sɔmburu de", cat: "action" },
  { fr: "Il pleut", ba: "Gura nɛ", cat: "action" },
  { fr: "Il va pleuvoir", ba: "Gura ya koo nɛ", cat: "action" },
  // === FAMILLE ===
  { fr: "Mon père", ba: "Nɛn baa", cat: "famille" },
  { fr: "Ma mère", ba: "Nɛn yaa / Nɛn mɛrɔ", cat: "famille" },
  { fr: "Mon enfant", ba: "Nɛn bii", cat: "famille" },
  { fr: "Mon frère", ba: "Nɛn yaaru", cat: "famille" },
  { fr: "Ma sœur", ba: "Nɛn wɔkuru", cat: "famille" },
  { fr: "Mon mari", ba: "Nɛn durɔ", cat: "famille" },
  { fr: "Ma femme", ba: "Nɛn kurɔ", cat: "famille" },
  // === PROVERBES & SAGESSE ===
  { fr: "L'union fait la force", ba: "Tɔmbu ba yɛru dɔmbɔ sɔɔ, sɛ̃ɛ kun ba dera", cat: "proverbe" },
  { fr: "Qui cherche trouve", ba: "Goo u gɑ̃ɑ kasuu, u ga bɛri", cat: "proverbe" },
  { fr: "L'arbre ne tombe pas d'un seul coup", ba: "Teru kun bɔ dɔmbɔ sɔɔ", cat: "proverbe" },
  { fr: "La patience est un chemin de fleurs", ba: "Muna swaa nɔɔra mɔ", cat: "proverbe" },
  // === CONNECTEURS ===
  { fr: "Parce que", ba: "Yɛn sɔ̃", cat: "connecteur" },
  { fr: "Ensuite / Puis", ba: "Yen biru", cat: "connecteur" },
  { fr: "Mais", ba: "Ama", cat: "connecteur" },
  { fr: "Et", ba: "Kɑ", cat: "connecteur" },
  { fr: "Ou bien", ba: "Wala", cat: "connecteur" },
  { fr: "Si", ba: "Goo", cat: "connecteur" },
  { fr: "Quand", ba: "Domma", cat: "connecteur" },
  { fr: "Aujourd'hui", ba: "Gisɔ", cat: "connecteur" },
  { fr: "Demain", ba: "Yɑmɔ", cat: "connecteur" },
  { fr: "Hier", ba: "Yinɑ", cat: "connecteur" },
  // === NOMBRES ===
  { fr: "Un", ba: "Dɔmbɔ / Tia", cat: "nombre" },
  { fr: "Deux", ba: "Nɛɛrɑ", cat: "nombre" },
  { fr: "Trois", ba: "Itɑ", cat: "nombre" },
  { fr: "Quatre", ba: "Inɑ", cat: "nombre" },
  { fr: "Cinq", ba: "Nɔɔbu", cat: "nombre" },
  { fr: "Dix", ba: "Nuu", cat: "nombre" },
  { fr: "Vingt", ba: "Nubi", cat: "nombre" },
  { fr: "Cent", ba: "Kεmɑ", cat: "nombre" },
  // === RELIGION & SPIRITUALITÉ ===
  { fr: "Dieu", ba: "Gusunɔ", cat: "religion" },
  { fr: "Que Dieu te bénisse", ba: "Gusunɔ u nun domɑ sãa", cat: "religion" },
  { fr: "Prions", ba: "Sa sɔɔnɑ ko", cat: "religion" },
  { fr: "Paix", ba: "Alafia", cat: "religion" },
];

export const BARIBA_REFERENCE_PAIRS = [
  // Phrases courantes SOV
  { fr: "Je mange du riz", ba: "Na koko di" },
  { fr: "Il a tué une biche", ba: "Taaso u nɛmu go" },
  { fr: "Je cherche du travail", ba: "Na sɔmburu kasuu" },
  { fr: "Il est allé travailler", ba: "U sɔmburu da" },
  { fr: "Où es-tu ?", ba: "Mɑnɑ ɑ wɑ̃ɑ ?" },
  { fr: "Quand es-tu venu ?", ba: "Domma a na ?" },
  { fr: "As-tu vu ces gens ?", ba: "A tɔn be wa ?" },
  { fr: "Je n'ai pas le courage", ba: "Na ǹ kãkɔ" },
  { fr: "Les choses n'étaient pas là", ba: "Gɑ̃ɑnu kun wɑ̃ɑ mɛ sɔɔ" },
  { fr: "Il y a du monde aujourd'hui dans le village", ba: "Tɔmbu ba dabi gisɔ wuu sɔɔ" },
  { fr: "Il travaille bien", ba: "U sɔmburu mɔ sãa sãa" },
  { fr: "La terre était informe et vide", ba: "Tem dɑɑ wɑ̃ɑwɑ bitɑm" },
  { fr: "J'ai besoin d'argent", ba: "Na gobin bukaata mɔ" },
  { fr: "Ils n'en avaient point honte", ba: "Sekurɑ kun mɑɑ ben ɡoo mɔ" },
  { fr: "Toute herbe verte", ba: "Yɑkɑ beku bɑɑɡere" },
  { fr: "Les grands poissons", ba: "Swɛ̃ɛ bɛkɛ tɑkɑ" },
  { fr: "Le gombo est bon avec l'igname pilée", ba: "Abonu ka sɔkura nu rà n do" },
  { fr: "Tu ne mangeras pas de cet arbre", ba: "U ku rɑ ten binu di" },
  { fr: "C'est au carrefour qu'on dépose la barrière rituelle", ba: "Swaa kɛɛnanɔwa ba ra abɔru yi" },
  { fr: "C'est aujourd'hui le marché de notre village", ba: "Gisɔra bɛsɛn wuun aburu" },
  // Salutations et conversations quotidiennes
  { fr: "Bonjour", ba: "Kua dɔ̃ɔ" },
  { fr: "Comment vas-tu ?", ba: "A kɛra?" },
  { fr: "Je vais bien", ba: "Na kɛra sãa sãa" },
  { fr: "Merci", ba: "A nii koo" },
  { fr: "Au revoir", ba: "Ka bɛsɛ" },
  // Impératifs
  { fr: "Va !", ba: "A do!" },
  { fr: "Mange !", ba: "A dio!" },
  { fr: "Assieds-toi", ba: "A sina" },
  { fr: "Lève-toi", ba: "A seewo" },
  { fr: "Écoute !", ba: "A turu!" },
  // Famille
  { fr: "Mon père", ba: "Nɛn baa" },
  { fr: "Ma mère", ba: "Nɛn yaa" },
  { fr: "Mon enfant", ba: "Nɛn bii" },
  // Questions
  { fr: "Qui est venu ?", ba: "Wɔ̃ɔ u na ?" },
  { fr: "Que cherches-tu ici ?", ba: "Mba a kasuu mini ?" },
  // Futur et habituel
  { fr: "Il va pleuvoir", ba: "Gura ya koo nɛ" },
  { fr: "Les Baatɔm fabriquent...", ba: "Baatɔmbu ba ra ka kɛrusu..." },
  // Existentiel
  { fr: "L'eau couvre...", ba: "Nim mu tɛrie" },
  { fr: "La jarre est remplie d'eau", ba: "Nim mu boo yiba" },
  // Nature
  { fr: "Eau", ba: "Nim" },
  { fr: "Feu", ba: "Dɔ̃ɔ" },
  { fr: "Terre", ba: "Tem" },
  { fr: "Village", ba: "Wuu" },
  { fr: "Maison", ba: "Yɛnu" },
  { fr: "Champ", ba: "Gberu" },
  { fr: "Route", ba: "Swaa" },
  { fr: "Homme", ba: "Durɔ" },
  { fr: "Femme", ba: "Kurɔ" },
  { fr: "Enfant", ba: "Bii" },
  { fr: "Soleil", ba: "Yɑm" },
  { fr: "Lune", ba: "Siiru" },
];

/**
 * Génère le prompt système complet pour l'edge function refine-bariba
 */
export function buildRefineSystemPrompt(type: 'translation' | 'transcription', direction?: 'fr-ba' | 'ba-fr'): string {
  const idiomsText = BARIBA_IDIOMS
    .map(i => `"${i.fr}" = "${i.ba}" (${i.cat})`)
    .join('\n');

  const pairsText = BARIBA_REFERENCE_PAIRS
    .map(p => `"${p.fr}" ↔ "${p.ba}"`)
    .join('\n');

  const taskInstructions = type === 'translation'
    ? `TÂCHE - RAFFINAGE DE TRADUCTION (${direction || 'fr-ba'}) :
Tu reçois une traduction brute produite par un modèle IA. Améliore-la :
1. Vérifie et corrige l'ordre des mots (SOV pour le Bariba)
2. Vérifie les pronoms : U pour humain, Ga/Mu pour non-humain
3. Vérifie les classes nominales (-bu/-mbu pour pluriel humain, etc.)
4. Remplace les calques du français par des formulations idiomatiques Bariba
5. Assure l'utilisation correcte des postpositions (sɔɔ, yɛn sɔ̃)
6. Vérifie les particules TAM (koo=futur, ra=habituel, -mɔ=progressif)
7. Normalise les diacritiques (ɔ, ɛ, ɑ, ã, ɛ̃, etc.)
${direction === 'ba-fr' ? '8. Pour Bariba→Français : assure un français naturel et fluide, pas de traduction mot-à-mot' : '8. Pour Français→Bariba : utilise les formulations naturelles du Bariba, pas des calques du français'}`
    : `TÂCHE - RAFFINAGE DE TRANSCRIPTION BARIBA :
Tu reçois une transcription brute d'un modèle ASR pour le Bariba. Améliore-la :
1. Corrige la segmentation des mots (mots collés ou mal coupés)
2. Normalise les diacritiques : ɔ, ɛ, ɑ, ã, ɛ̃, ĩ, ɔ̃, ũ
3. Normalise les voyelles longues : aa, ee, oo, ɔɔ, ɛɛ
4. Vérifie les tons marqués (accents graves et aigus)
5. Corrige les mots mal reconnus en utilisant le vocabulaire de référence
6. Assure que les mots correspondent à des entrées connues du dictionnaire Bariba`;

  return `Tu es un expert linguiste en langue Bariba (Baatonum), langue Niger-Congo parlée au Bénin.

${BARIBA_GRAMMAR_RULES}

EXPRESSIONS IDIOMATIQUES DE RÉFÉRENCE :
${idiomsText}

PAIRES DE TRADUCTION DE RÉFÉRENCE :
${pairsText}

${taskInstructions}

RÈGLES STRICTES :
- Retourne UNIQUEMENT le texte corrigé, sans explication ni commentaire
- Si le texte est déjà correct, retourne-le tel quel
- Ne traduis PAS le texte, améliore seulement la qualité
- Conserve le sens original, ne change que la forme
- Préfère les formulations idiomatiques aux traductions littérales`;
}
