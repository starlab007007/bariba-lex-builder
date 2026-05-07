/**
 * Auto-illustration sémantique des scènes du Conte Vivant
 * Analyse le texte d'un segment et trouve le meilleur match dans anime_scene_library
 */

import { supabase } from '@/integrations/supabase/client';

// --- Dictionnaires de mots-clés (repris de l'edge function generate-anime-story) ---

const EMOTION_KEYWORDS: Record<string, string[]> = {
  joy: ['joie', 'heureux', 'heureuse', 'content', 'rire', 'sourire', 'fête', 'bonheur', 'célébr', 'danser', 'chant', 'happy', 'joy', 'laugh'],
  sadness: ['triste', 'pleur', 'larme', 'chagrin', 'malheur', 'deuil', 'perte', 'seul', 'abandonn', 'sad', 'cry', 'tear'],
  wonder: ['merveille', 'étonn', 'surpri', 'magiq', 'mystèr', 'découvr', 'incroy', 'fantast', 'wonder', 'amaze', 'magic'],
  fear: ['peur', 'effroi', 'terreur', 'danger', 'menace', 'sombre', 'noir', 'monstre', 'fear', 'dark', 'scary', 'fright'],
  excitement: ['excit', 'aventur', 'courag', 'héro', 'combat', 'victoir', 'brave', 'défier', 'fight', 'battle', 'hero', 'brave'],
  peace: ['paix', 'calme', 'sérén', 'tranquill', 'repos', 'harmoni', 'doux', 'peace', 'calm', 'quiet', 'gentle'],
  tension: ['tension', 'conflit', 'rival', 'colère', 'fureur', 'affront', 'dispute', 'anger', 'conflict', 'rage'],
};

const SCENE_KEYWORDS: Record<string, string[]> = {
  village: ['village', 'maison', 'case', 'place', 'marché', 'communauté', 'peuple', 'habitan'],
  forest: ['forêt', 'arbre', 'bois', 'jungle', 'feuill', 'sentier', 'broussaille', 'forest', 'tree'],
  river: ['rivière', 'fleuve', 'eau', 'lac', 'cascade', 'pêch', 'rive', 'river', 'water', 'lake'],
  mountain: ['montagne', 'colline', 'sommet', 'rocher', 'grotte', 'caverne', 'mountain', 'hill', 'cave'],
  market: ['marché', 'commerce', 'vendre', 'acheter', 'échange', 'boutique', 'marchand'],
  home: ['maison', 'intérieur', 'chambre', 'cuisine', 'famille', 'foyer', 'home', 'house', 'room'],
  night: ['nuit', 'étoile', 'lune', 'obscur', 'nocturne', 'minuit', 'night', 'moon', 'star'],
  journey: ['voyage', 'chemin', 'route', 'marche', 'traversée', 'quête', 'expédition', 'journey', 'path', 'quest'],
  gathering: ['rassemblement', 'cérémonie', 'conseil', 'fête', 'réunion', 'assembly', 'ceremony', 'festival'],
  spirit: ['esprit', 'fantôme', 'ancêtre', 'divinit', 'sacré', 'rituel', 'spirit', 'ghost', 'ancestor', 'divine'],
};

const CHARACTER_KEYWORDS: Record<string, string[]> = {
  child_boy: ['garçon', 'fils', 'jeune homme', 'enfant', 'petit', 'boy', 'son', 'child'],
  child_girl: ['fille', 'jeune fille', 'princesse', 'petite', 'girl', 'daughter', 'princess'],
  elder: ['vieux', 'sage', 'ancien', 'grand-père', 'grand-mère', 'vieillard', 'elder', 'wise', 'old'],
  animal: ['animal', 'lion', 'éléphant', 'oiseau', 'serpent', 'tortue', 'lièvre', 'singe', 'animal', 'bird'],
  spirit: ['esprit', 'fantôme', 'divinité', 'génie', 'spirit', 'ghost', 'deity'],
  group: ['groupe', 'ensemble', 'tous', 'villageois', 'foule', 'gens', 'peuple', 'group', 'crowd', 'people'],
};

const ACTION_KEYWORDS: Record<string, string[]> = {
  standing: ['debout', 'immobile', 'observe', 'regard', 'stand', 'watch', 'look'],
  walking: ['marche', 'avance', 'chemin', 'promen', 'walk', 'move', 'step'],
  talking: ['parle', 'discute', 'raconte', 'dit', 'expliqu', 'talk', 'speak', 'tell', 'say'],
  dancing: ['danse', 'bouge', 'rythm', 'dance', 'move', 'rhythm'],
  working: ['travail', 'cultiv', 'constru', 'fabriqu', 'work', 'build', 'make'],
  sleeping: ['dort', 'sommeil', 'repos', 'rêve', 'sleep', 'rest', 'dream'],
  running: ['court', 'fuit', 'rush', 'poursui', 'run', 'chase', 'flee'],
  discovering: ['découvr', 'trouv', 'explore', 'cherch', 'discover', 'find', 'explore', 'search'],
};

// --- Fonctions utilitaires ---

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ');
}

function detectCategory(text: string, keywords: Record<string, string[]>): string | null {
  const norm = normalize(text);
  let bestMatch: string | null = null;
  let bestScore = 0;

  for (const [category, words] of Object.entries(keywords)) {
    let score = 0;
    for (const word of words) {
      const normWord = normalize(word);
      if (norm.includes(normWord)) {
        score += normWord.length >= 5 ? 2 : 1;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = category;
    }
  }

  return bestScore >= 1 ? bestMatch : null;
}

function textSimilarity(text: string, description: string): number {
  if (!description) return 0;
  const normText = normalize(text);
  const normDesc = normalize(description);
  
  const textWords = normText.split(/\s+/).filter(w => w.length > 3);
  const descWords = normDesc.split(/\s+/).filter(w => w.length > 3);
  
  if (textWords.length === 0 || descWords.length === 0) return 0;

  let matches = 0;
  for (const tw of textWords) {
    for (const dw of descWords) {
      // Exact match or stem match (first 4 chars)
      if (tw === dw || (tw.length >= 4 && dw.length >= 4 && tw.slice(0, 4) === dw.slice(0, 4))) {
        matches++;
        break;
      }
    }
  }

  const ratio = matches / Math.min(textWords.length, descWords.length);
  // Scale 0-4
  return Math.min(4, Math.round(ratio * 8));
}

export interface AutoIllustrateResult {
  media_url: string;
  mediaType: 'photo' | 'video';
  score: number;
  asset_id: string;
}

/**
 * Trouve le meilleur asset de la bibliothèque anime pour un texte donné
 */
export async function findBestMatch(
  text: string,
  style: string = 'african'
): Promise<AutoIllustrateResult | null> {
  if (!text || text.trim().length < 10) return null;

  // 1. Detect metadata from text
  const detectedEmotion = detectCategory(text, EMOTION_KEYWORDS);
  const detectedScene = detectCategory(text, SCENE_KEYWORDS);
  const detectedCharacter = detectCategory(text, CHARACTER_KEYWORDS);
  const detectedAction = detectCategory(text, ACTION_KEYWORDS);

  // 2. Query library candidates
  let query = supabase
    .from('anime_scene_library')
    .select('id, style, emotion, scene_type, character_type, action, description_fr, description_en, image_url, video_url, asset_type, usage_count')
    .order('usage_count', { ascending: true })
    .limit(50);

  // Filter by style if available, otherwise get all
  if (style) {
    query = query.eq('style', style);
  }

  const { data: candidates, error } = await query;
  if (error || !candidates || candidates.length === 0) {
    console.warn('[autoIllustrate] No candidates found:', error?.message);
    return null;
  }

  // 3. Score each candidate
  let bestScore = 0;
  let bestCandidate: typeof candidates[0] | null = null;
  let bestVideoCandidate: typeof candidates[0] | null = null;
  let bestVideoScore = 0;

  for (const candidate of candidates) {
    let score = 3; // base score

    // Emotion match (+3)
    if (detectedEmotion && candidate.emotion === detectedEmotion) score += 3;

    // Scene type match (+3)
    if (detectedScene && candidate.scene_type === detectedScene) score += 3;

    // Character type match (+2)
    if (detectedCharacter && candidate.character_type === detectedCharacter) score += 2;

    // Action match (+2)
    if (detectedAction && candidate.action === detectedAction) score += 2;

    // Text similarity with descriptions (0-4)
    const simFr = textSimilarity(text, candidate.description_fr || '');
    const simEn = textSimilarity(text, candidate.description_en || '');
    score += Math.max(simFr, simEn);

    // Video bonus (+3)
    if (candidate.asset_type === 'video' && candidate.video_url) {
      score += 3;
      if (score > bestVideoScore) {
        bestVideoScore = score;
        bestVideoCandidate = candidate;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestCandidate = candidate;
    }
  }

  // Lowered threshold from 5 to 3, with fallback to best video
  if (!bestCandidate || bestScore < 3) {
    // Fallback: use best video candidate if any
    if (bestVideoCandidate) {
      bestCandidate = bestVideoCandidate;
      bestScore = bestVideoScore;
    } else {
      return null;
    }
  }

  console.log(`[autoIllustrate] Best match score=${bestScore}, emotion=${detectedEmotion}, scene=${detectedScene}, asset=${bestCandidate.id}`);

  const isVideo = bestCandidate.asset_type === 'video' && bestCandidate.video_url;

  return {
    media_url: isVideo ? bestCandidate.video_url! : bestCandidate.image_url,
    mediaType: isVideo ? 'video' : 'photo',
    score: bestScore,
    asset_id: bestCandidate.id,
  };
}

/**
 * Auto-illustre plusieurs segments en batch
 */
export async function autoIllustrateSegments(
  segments: { id: string; text_content: string; media_url?: string }[],
  style: string = 'african',
  onProgress?: (current: number, total: number) => void
): Promise<Record<string, AutoIllustrateResult>> {
  const results: Record<string, AutoIllustrateResult> = {};
  const toProcess = segments.filter(s => s.text_content?.trim() && !s.media_url);

  for (let i = 0; i < toProcess.length; i++) {
    onProgress?.(i + 1, toProcess.length);
    const match = await findBestMatch(toProcess[i].text_content, style);
    if (match) {
      results[toProcess[i].id] = match;
    }
  }

  return results;
}
