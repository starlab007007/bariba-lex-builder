// supabase/functions/_shared/bariba-linguistic-rules.ts

export type RuleSeverity = "low" | "medium" | "high";

export type RuleIssue = {
  code: string;
  severity: RuleSeverity;
  issue: string;
  suggestion: string;
};

export type RuleAnalysis = {
  score: number; // 0..1
  issues: RuleIssue[];
  notes: string[];
};

export const INVALID_UI_PATTERNS = [
  "share via link",
  "loading",
  "submit",
  "clear",
  "button",
  "click",
  "select",
  "undefined",
  "null",
  "<html",
  "<!doctype",
];

export const BARIBA_VALIDATED_IDIOMS = [
  "A kpuna n do?",
  "Bɛɛ ka yoka",
  "Anna wunɛn wasi?",
  "Alaafia",
  "siara",
  "a kua",
  "ami",
  "Na nun siara",
  "Bɛɛ ka faaba",
  "bii mɛro",
  "nim nɔru",
  "Na mini",
  "A sina",
  "A seewo",
  "Gura nɛ",
  "Gura ya koo nɛ",
  "Durɔ goo u kasuu, u ga bɛri",
];

export const BARIBA_PROMPT_BLOCKS = {
  grammar: `
RÈGLES GRAMMATICALES BARIBA (BAATONUM) :

1. ORDRE SOV (Sujet-Objet-Verbe) : "Na koko di" = Je riz mange
2. PRONOMS sujet : Na(je), A(tu), U(il humain), Ga/Mu(il chose), Sa(nous), I(vous), Ba(ils)
   Possessif : Nɛn(mon), Wunɛn(ton), Win(son), Sun(notre), Bɛɛn(votre), Ben(leur)
   CRITIQUE : U = humain, Ga/Mu = non-humain
3. CLASSES NOMINALES : -bu/-mbu(humain pl.→Ba), a-/y-(animé→Ga), m-(inanimé→Mu), -nu/-su(collectif)
4. VERBES invariables + particules TAM : ∅(passé), ràa(passé révolu), koo(futur), ra(habituel), -mɔ(progressif)
5. NÉGATION : ǹ/kun/ku entre sujet et verbe
6. POSTPOSITIONS : sɔɔ(dans), yèn sɔ̃(à cause de), ka(vers)
7. ADJECTIFS APRÈS le nom : "Kɛkɛ baka" = camion grand
8. ÊTRE = wãa (être quelque part), wã (être bon) | AVOIR = mɔ
9. TONS : 3 niveaux (Haut ´, Moyen ∅, Bas \`)
10. CONNECTEURS : Yen biru(puis), yèn sɔ̃(parce que), Ama(mais), Kɑ(et), yɛ/yè(si/quand), Goo(un certain...)
11. QUESTIONS : anna(comment), mba(quoi), domma(quand), amɔna(pourquoi)
12. VERBES CLÉS : wa = voir/trouver/obtenir ; mɛɛri = regarder/étudier/apprendre
`.trim(),

  idioms: `
IDIOMES / FORMULES VALIDÉES (priorité haute) :
"Bonjour (matin)" = "A kpuna n do?"
"Bonsoir" = "Bɛɛ ka yoka"
"Comment vas-tu?" = "Anna wunɛn wasi?"
"Je vais bien / Merci" = "Alaafia"

"Merci" = "siara" | "a kua" | "ami"
"Merci (je te remercie)" = "Na nun siara"
"Merci pour votre secours" = "Bɛɛ ka faaba"

"Père" = "baa" | "Mon père" = "Nɛn baa"
"Mère" = "bii mɛro"
"Enfant" = "bii"

"J'ai soif" = "nim nɔru"
"Viens ici" = "Na mini"
"Assieds-toi" = "A sina"
"Lève-toi" = "A seewo"

"Il pleut" = "Gura nɛ"
"Il va pleuvoir" = "Gura ya koo nɛ"

"Qui cherche trouve" = "Durɔ goo u kasuu, u ga bɛri"
`.trim(),

  referencePairs: `
PAIRES DE TRADUCTION DE RÉFÉRENCE :
"Je mange du riz" ↔ "Na koko di" | "Il a tué une biche" ↔ "Taaso u nɛmu go"
"Je cherche du travail" ↔ "Na sɔmburu kasuu" | "Où es-tu?" ↔ "Mɑnɑ ɑ wɑ̃ɑ?"
"Quand es-tu venu?" ↔ "Domma a na?" | "As-tu vu ces gens?" ↔ "A tɔn be wa?"
"Je n'ai pas le courage" ↔ "Na ǹ kãkɔ" | "J'ai besoin d'argent" ↔ "Na gobin bukaata mɔ"
"Il travaille bien" ↔ "U sɔmburu mɔ sãa sãa" | "Il y a du monde" ↔ "Tɔmbu ba dabi"
"Eau" ↔ "Nim" | "Feu" ↔ "Dɔ̃ɔ" | "Terre" ↔ "Tem" | "Village" ↔ "Wuu"
"Maison" ↔ "Yɛnu" | "Homme" ↔ "Durɔ" | "Femme" ↔ "Kurɔ" | "Enfant" ↔ "Bii"
"Aller" ↔ "Da" | "Venir" ↔ "Na" | "Manger" ↔ "Di" | "Voir / Trouver / Obtenir" ↔ "Wa"
"Regarder / Étudier / Apprendre" ↔ "Mɛɛri"
"Dire" ↔ "Nɛɛ" | "Faire" ↔ "Ko" | "Boire" ↔ "Nɔ" | "Dormir" ↔ "Kpuna"
"Lundi" ↔ "Litinin" | "Mardi" ↔ "Talata" | "Mercredi" ↔ "Alaaruba / Adaaruba"
"Je te remercie" ↔ "Na nun siara" | "Merci" ↔ "siara / a kua / ami"
`.trim(),

  commonMistakes: `
ATTENTION AUX ERREURS COURANTES (INTERDITES) :
- Ne pas traduire "voir" par "mɛɛri" par défaut → utiliser "wa" (voir/trouver/obtenir)
- "mɛɛri" = regarder / étudier / apprendre
- "yaa" = viande / animal (PAS "mère")
- "mère" = "bii mɛro"
- "kɛra" n'est pas "aller bien" (kɛra = râcler)
- "Comment vas-tu ?" = "Anna wunɛn wasi?" (pas "A kɛra?")
- "Je vais bien / Merci" = "Alaafia" (pas "Na kɛra sãa sãa")
- "J'ai soif" = "nim nɔru" (pas "nim nɔnkuru")
- "Bonjour (matin)" = "A kpuna n do?" (pas "Kua dɔ̃ɔ")
- "Bonsoir" = "Bɛɛ ka yoka" (pas "Kua wɛrɛ")
- Proverbe "Qui cherche trouve" : "Durɔ goo u kasuu, u ga bɛri"
`.trim(),
};

export function normalizeBaribaText(input: string): string {
  return (input || "").normalize("NFC").replace(/\s+/g, " ").trim();
}

export function normalizeText(input: string): string {
  return normalizeBaribaText(input);
}

export function stripWrappingQuotes(input: string): string {
  return (input || "").replace(/^["'“”`]+|["'“”`]+$/g, "");
}

export function cleanModelText(input: string): string {
  let out = normalizeBaribaText(input);

  // Enlever markdown fences
  out = out.replace(/^```[\w-]*\s*/i, "").replace(/\s*```$/i, "");

  // Enlever préfixes fréquents de LLM
  out = out.replace(/^traduction\s*:\s*/i, "");
  out = out.replace(/^texte corrigé\s*:\s*/i, "");
  out = out.replace(/^réponse\s*:\s*/i, "");
  out = out.replace(/^resultat\s*:\s*/i, "");
  out = out.replace(/^résultat\s*:\s*/i, "");

  out = stripWrappingQuotes(out);
  return normalizeBaribaText(out);
}

export function isInvalidUiLikeText(input: string): boolean {
  const s = normalizeBaribaText(input).toLowerCase();
  return INVALID_UI_PATTERNS.some((p) => s.includes(p));
}

export function hasBaribaDiacritics(text: string): boolean {
  return /[ɔɛɑãɛ̃ĩɔ̃ũ̀́]/u.test(text || "");
}

export function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

export function uniqStrings(arr: string[]): string[] {
  return [...new Set(arr.map((s) => normalizeBaribaText(s)).filter(Boolean))];
}

export function safeJsonExtract(text: string): unknown | null {
  if (!text) return null;

  const cleaned = String(text)
    .replace(/```json/gi, "```")
    .replace(/```/g, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    // continue
  }

  const objectMatch = cleaned.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    try {
      return JSON.parse(objectMatch[0]);
    } catch {
      // continue
    }
  }

  const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    try {
      return JSON.parse(arrayMatch[0]);
    } catch {
      // continue
    }
  }

  return null;
}

/**
 * Corrections lexicales / idiomatiques sûres
 * (peu risquées, validées par ton audit dictionnaire)
 */
export function applyLocalBaribaCorrections(input: string): string {
  let out = cleanModelText(input);

  // Salutations & formules
  out = out.replace(/\bKua dɔ̃ɔ\b/giu, "A kpuna n do?");
  out = out.replace(/\bKua wɛrɛ\b/giu, "Bɛɛ ka yoka");
  out = out.replace(/\bA kɛra\s*\?/giu, "Anna wunɛn wasi?");
  out = out.replace(/\bNa kɛra sãa sãa\b/giu, "Alaafia");

  // Merci
  out = out.replace(/\bA nii koo\b/giu, "siara");

  // Lexique corrigé
  out = out.replace(/\bNɛn yaa\b/giu, "bii mɛro");
  out = out.replace(/\bNim nɔnkuru\b/giu, "nim nɔru");
  out = out.replace(/\bnim nɔnkuru\b/giu, "nim nɔru");

  // Proverbe
  out = out.replace(/Goo u g[ɑaã̃]+ kasuu,\s*u ga bɛri/giu, "Durɔ goo u kasuu, u ga bɛri");

  // Cas LLM “Voir / Trouver / Obtenir = Mɛɛri”
  out = out.replace(
    /Voir\s*\/?\s*Trouver\s*\/?\s*Obtenir\s*["'“”]?\s*=\s*["'“”]?\s*Mɛɛri/giu,
    "Voir / Trouver / Obtenir = Wa",
  );

  return normalizeBaribaText(out);
}

/**
 * Alias pratique (nom utilisé dans certains patches)
 */
export function applyHardCorrections(input: string): string {
  return applyLocalBaribaCorrections(input);
}

/**
 * Analyse déterministe locale d’une paire FR ↔ Bariba
 * (utilisable dans bulk-validate-phrases et analyze-phrase-quality)
 */
export function analyzeBaribaPairRules(frenchRaw: string, baribaRaw: string): RuleAnalysis {
  const french = normalizeBaribaText(frenchRaw).toLowerCase();
  const bariba = normalizeBaribaText(baribaRaw);

  const issues: RuleIssue[] = [];
  const notes: string[] = [];
  let score = 0.9;

  if (!bariba) {
    return {
      score: 0,
      issues: [
        {
          code: "EMPTY_BARIBA",
          severity: "high",
          issue: "Traduction bariba vide.",
          suggestion: "Ajouter une traduction bariba complète.",
        },
      ],
      notes: [],
    };
  }

  // Bruit OCR / dictionnaire brut
  if (/dictionnaire bariba - français|<PARSED TEXT FOR PAGE|\bacc\.|\binacc\.|\bimp\./iu.test(bariba)) {
    issues.push({
      code: "OCR_OR_DICTIONARY_NOISE",
      severity: "high",
      issue: "La phrase semble contenir du bruit OCR ou une entrée dictionnaire brute.",
      suggestion: "Conserver uniquement la phrase cible, sans définitions ni marques grammaticales.",
    });
    score -= 0.35;
  }

  if (bariba.length < 2) {
    issues.push({
      code: "TOO_SHORT",
      severity: "high",
      issue: "Traduction trop courte pour être fiable.",
      suggestion: "Fournir une expression ou phrase complète.",
    });
    score -= 0.25;
  }

  if (/[{}[\]]/.test(bariba)) {
    issues.push({
      code: "PLACEHOLDER_OR_JSON",
      severity: "medium",
      issue: "La traduction contient des marqueurs techniques/JSON.",
      suggestion: "Conserver uniquement le texte Bariba.",
    });
    score -= 0.12;
  }

  // Règles critiques connues
  if (french.includes("bonjour") && /\bKua dɔ̃ɔ\b/iu.test(bariba)) {
    issues.push({
      code: "BAD_GREETING_MORNING",
      severity: "high",
      issue: `Salutation "Bonjour (matin)" incorrecte.`,
      suggestion: `Utiliser "A kpuna n do?"`,
    });
    score -= 0.35;
  }

  if (french.includes("bonsoir") && /\bKua wɛrɛ\b/iu.test(bariba)) {
    issues.push({
      code: "BAD_GREETING_EVENING",
      severity: "high",
      issue: `Salutation "Bonsoir" incorrecte.`,
      suggestion: `Utiliser "Bɛɛ ka yoka"`,
    });
    score -= 0.35;
  }

  if ((french.includes("comment") && french.includes("vas")) && /\bA kɛra\??\b/iu.test(bariba)) {
    issues.push({
      code: "BAD_HOW_ARE_YOU",
      severity: "high",
      issue: `"A kɛra?" est incorrect pour "Comment vas-tu ?"`,
      suggestion: `Utiliser "Anna wunɛn wasi?"`,
    });
    score -= 0.35;
  }

  if ((french.includes("je vais bien") || french.includes("ça va")) && /\bNa kɛra sãa sãa\b/iu.test(bariba)) {
    issues.push({
      code: "BAD_IM_FINE",
      severity: "high",
      issue: `"Na kɛra sãa sãa" est incorrect pour la réponse de salutation.`,
      suggestion: `Utiliser "Alaafia"`,
    });
    score -= 0.35;
  }

  if (french.includes("merci") && /\bA nii koo\b/iu.test(bariba)) {
    issues.push({
      code: "BAD_THANKS",
      severity: "high",
      issue: `Forme "merci" non validée.`,
      suggestion: `Préférer "siara", "a kua", "ami" ou "Na nun siara" selon le contexte.`,
    });
    score -= 0.3;
  }

  if (french.includes("mère") && /\bNɛn yaa\b/iu.test(bariba)) {
    issues.push({
      code: "MOTHER_CONFUSION",
      severity: "high",
      issue: `"yaa" n’est pas "mère" (renvoie à viande/animal).`,
      suggestion: `Utiliser "bii mɛro"`,
    });
    score -= 0.4;
  }

  if ((french.includes("soif") || french.includes("j’ai soif") || french.includes("j'ai soif")) && /\bn[ɔo]nkuru\b/iu.test(bariba)) {
    issues.push({
      code: "BAD_THIRST_TERM",
      severity: "high",
      issue: `Forme non validée pour "soif".`,
      suggestion: `Utiliser "nim nɔru"`,
    });
    score -= 0.35;
  }

  // wa vs mɛɛri
  const mentionsVoir = [
    "voir",
    "trouver",
    "obtenir",
    "as-tu vu",
    "avez-vous vu",
    "je vois",
    "il voit",
    "j'ai vu",
    "j’ai vu",
  ].some((w) => french.includes(w));

  if (mentionsVoir && /\bmɛɛri\b/iu.test(bariba) && !/\bwa\b/iu.test(bariba)) {
    issues.push({
      code: "WA_VS_MEERI",
      severity: "high",
      issue: `"mɛɛri" utilisé pour "voir/trouver/obtenir" (faux ami).`,
      suggestion: `Utiliser "wa" pour voir/trouver/obtenir ; garder "mɛɛri" pour regarder/étudier/apprendre.`,
    });
    score -= 0.35;
  }

  const mentionsRegarderEtudier = ["regarder", "étudier", "apprendre"].some((w) => french.includes(w));
  if (mentionsRegarderEtudier && /\bwa\b/iu.test(bariba) && !/\bmɛɛri\b/iu.test(bariba)) {
    issues.push({
      code: "MEERI_EXPECTED",
      severity: "medium",
      issue: `Le sens "regarder/étudier/apprendre" semble plutôt demander "mɛɛri".`,
      suggestion: `Vérifier si "mɛɛri" est plus approprié.`,
    });
    score -= 0.15;
  }

  if (french.includes("qui cherche trouve") && /Goo u g[ɑaã̃]+ kasuu,\s*u ga bɛri/iu.test(bariba)) {
    issues.push({
      code: "BAD_PROVERB",
      severity: "high",
      issue: "Proverbe mal formé.",
      suggestion: `Utiliser "Durɔ goo u kasuu, u ga bɛri"`,
    });
    score -= 0.35;
  }

  if (!hasBaribaDiacritics(bariba)) {
    notes.push("Pas de diacritiques détectés — vérifier la graphie (ɔ, ɛ, etc.).");
    score -= 0.05;
  }

  if (bariba.length > 260) {
    issues.push({
      code: "TOO_LONG_POSSIBLE_DUMP",
      severity: "medium",
      issue: "Traduction très longue — possible collage d’entrée dictionnaire.",
      suggestion: "Conserver uniquement la phrase cible.",
    });
    score -= 0.12;
  }

  if (/\b(A kpuna n do\?|Bɛɛ ka yoka|Anna wunɛn wasi\?|Alaafia|bii mɛro|nim nɔru)\b/iu.test(bariba)) {
    notes.push("Forme idiomatique validée détectée.");
    score += 0.05;
  }

  return { score: clamp01(score), issues, notes };
}

/**
 * Détection des changements pour refine-bariba / stt / tts
 */
export function detectRefinementChanges(params: {
  original: string;
  refined: string;
  originalInput?: string;
}): string[] {
  const original = normalizeBaribaText(params.original);
  const refined = normalizeBaribaText(params.refined);
  const originalInput = normalizeBaribaText(params.originalInput || "");

  const changes: string[] = [];

  if (!refined || refined === original) return changes;

  if (refined.length !== original.length) changes.push("Longueur modifiée");
  if (refined.toLowerCase() !== original.toLowerCase()) changes.push("Corrections linguistiques");

  const hadDiac = hasBaribaDiacritics(original);
  const hasDiac = hasBaribaDiacritics(refined);
  if (hasDiac && !hadDiac) changes.push("Diacritiques ajoutés");

  if (/\b(A kpuna n do\?|Bɛɛ ka yoka|Anna wunɛn wasi\?|Alaafia)\b/u.test(refined)) {
    changes.push("Formule idiomatique corrigée");
  }

  if (/\bbii mɛro\b/iu.test(refined) && !/\bbii mɛro\b/iu.test(original)) {
    changes.push('Lexique corrigé ("mère")');
  }

  if (/\bnim nɔru\b/iu.test(refined) && !/\bnim nɔru\b/iu.test(original)) {
    changes.push('Lexique corrigé ("soif")');
  }

  if (/\bwa\b/iu.test(refined) && /voir|trouver|obtenir/i.test(originalInput)) {
    changes.push("Verbe clé corrigé (wa)");
  }

  return uniqStrings(changes);
}

export function computeRefinementConfidence(params: {
  original: string;
  refined: string;
  changes: string[];
  aiUsed: boolean;
  hadError?: boolean;
}): number {
  const { original, refined, changes, aiUsed, hadError } = params;

  if (hadError) return 45;
  if (!refined) return 30;

  let score = 78;

  if (aiUsed) score += 6;
  if (changes.length === 0) score += 10;
  if (hasBaribaDiacritics(refined)) score += 3;

  if (/\b(A kpuna n do\?|Bɛɛ ka yoka|Anna wunɛn wasi\?|Alaafia|bii mɛro|nim nɔru)\b/iu.test(refined)) {
    score += 3;
  }

  if (normalizeBaribaText(refined) === normalizeBaribaText(original)) score += 2;

  return Math.max(35, Math.min(97, score));
}

/**
 * Construit un prompt système réutilisable pour refine-bariba
 */
export function buildRefineSystemPrompt(type: "translate" | "translation" | "transcription", direction?: "fr-ba" | "ba-fr"): string {
  let taskBlock = "";
  let strictRules = "";

  if (type === "translate") {
    const dirLabel = direction === "ba-fr" ? "Bariba → Français" : "Français → Bariba";
    taskBlock = `TÂCHE — TRADUCTION DIRECTE (${dirLabel}) :
Tu dois traduire ce texte en utilisant EXCLUSIVEMENT :
1. Les règles grammaticales ci-dessus
2. Les expressions idiomatiques validées
3. Les paires de traduction de référence

Si un mot n'a pas d'équivalent connu, translittère-le et marque-le entre crochets [mot].
Retourne UNIQUEMENT la traduction, sans explication ni commentaire.`;

    strictRules = `RÈGLES STRICTES :
- Retourne UNIQUEMENT la traduction
- Aucune explication, aucun commentaire, aucun JSON
- Utilise l'ordre SOV pour le Bariba
- Utilise wa pour voir/trouver/obtenir ; mɛɛri pour regarder/étudier/apprendre
- Utilise bii mɛro pour "mère"
- Utilise nim nɔru pour "j'ai soif"`;
  } else if (type === "transcription") {
    taskBlock = `TÂCHE — RAFFINAGE DE TRANSCRIPTION BARIBA :
Tu reçois une transcription brute d'un modèle ASR. Améliore-la :
1. Corrige la segmentation des mots
2. Normalise les diacritiques (ɔ, ɛ, ɑ, ã, ɛ̃, ĩ, ɔ̃, ũ)
3. Corrige les mots mal reconnus avec le vocabulaire de référence
4. Préserve les expressions idiomatiques validées`;

    strictRules = `RÈGLES STRICTES :
- Retourne UNIQUEMENT le texte corrigé
- Ne traduis PAS
- Ne change pas le sens
- Conserve la phrase la plus naturelle possible en Bariba`;
  } else {
    taskBlock = `TÂCHE — RAFFINAGE DE TRADUCTION (${direction || "fr-ba"}) :
Tu reçois une traduction brute. Améliore-la :
1. Corrige la grammaire
2. Corrige les faux amis (wa vs mɛɛri, bii mɛro vs yaa)
3. Corrige les salutations/formules de politesse
4. Normalise les diacritiques
${direction === "ba-fr" ? "5. Rends le français naturel et fluide" : "5. Rends le Bariba naturel et idiomatique"}`;

    strictRules = `RÈGLES STRICTES :
- Retourne UNIQUEMENT le texte corrigé
- Ne traduis PAS de nouveau, raffine seulement
- Aucune explication
- Respecte les formes idiomatiques validées`;
  }

  return `Tu es un expert linguiste en langue Bariba (Baatonum), langue Niger-Congo parlée au Bénin.

${BARIBA_PROMPT_BLOCKS.grammar}

${BARIBA_PROMPT_BLOCKS.idioms}

${BARIBA_PROMPT_BLOCKS.referencePairs}

${BARIBA_PROMPT_BLOCKS.commonMistakes}

${taskBlock}

${strictRules}`.trim();
}
