/**
 * Generate Anime Story Edge Function
 * 
 * v8: Character reference embedding for consistency + multi-clip stitching for long scenes
 */

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const STYLE_KEYWORDS: Record<string, string> = {
  manga: 'manga style, detailed lineart, anime eyes, dynamic pose, high contrast, black and white with screentones, japanese manga aesthetic',
  chibi: 'chibi style, cute, big head small body, kawaii, simple background, pastel colors, adorable characters, big expressive eyes',
  fantasy: 'fantasy anime style, magical, ethereal lighting, detailed scenery, epic fantasy, vibrant colors, mystical atmosphere, detailed background',
  african: 'african-inspired anime, warm earth tones, traditional african patterns, tribal motifs, anime style characters with african features, rich textures, sunset colors'
};

const EMOTION_VISUALS: Record<string, string> = {
  joy: 'bright colors, warm lighting, cheerful atmosphere, sparkles',
  sadness: 'cool blue tones, soft rain, muted colors, melancholic atmosphere',
  wonder: 'magical particles, starry effects, ethereal glow, dreamy atmosphere',
  fear: 'dark shadows, ominous lighting, dramatic contrast',
  excitement: 'dynamic angles, action lines, vibrant energy, motion blur',
  peace: 'soft pastoral colors, gentle sunlight, serene atmosphere',
  tension: 'dramatic shadows, red accents, intense expressions',
  love: 'warm pink tones, soft glow, heart motifs, gentle atmosphere'
};

const SCENE_KEYWORDS: Record<string, string[]> = {
  village: ['village', 'villageois', 'case', 'hutte', 'maison', 'communauté', 'marché'],
  forest: ['forêt', 'arbre', 'bois', 'jungle', 'brousse', 'feuillage'],
  river: ['rivière', 'fleuve', 'eau', 'lac', 'source', 'cascade'],
  mountain: ['montagne', 'colline', 'rocher', 'sommet', 'hauteur'],
  market: ['marché', 'commerce', 'vendeur', 'achat', 'étal'],
  home: ['maison', 'intérieur', 'famille', 'foyer', 'case'],
  night: ['nuit', 'lune', 'étoile', 'soir', 'obscurité', 'feu de camp'],
  journey: ['voyage', 'chemin', 'route', 'marche', 'aventure', 'partir'],
  gathering: ['fête', 'danse', 'célébration', 'rassemblement', 'cérémonie'],
  spirit: ['esprit', 'magie', 'mystique', 'ancêtre', 'fantôme', 'surnaturel']
};

const CHARACTER_KEYWORDS: Record<string, string[]> = {
  child_boy: ['garçon', 'fils', 'jeune homme', 'enfant', 'petit'],
  child_girl: ['fille', 'jeune fille', 'enfant', 'petite'],
  elder: ['ancien', 'sage', 'vieux', 'grand-père', 'grand-mère', 'aîné'],
  animal: ['lion', 'éléphant', 'oiseau', 'animal', 'serpent', 'singe', 'gazelle', 'renard', 'chouette'],
  spirit: ['esprit', 'fantôme', 'ancêtre', 'divinité', 'génie'],
  group: ['villageois', 'famille', 'groupe', 'tous', 'ensemble', 'communauté']
};

const ACTION_KEYWORDS: Record<string, string[]> = {
  standing: ['regarde', 'observe', 'debout', 'attend'],
  walking: ['marche', 'avance', 'va', 'parcourt'],
  talking: ['parle', 'dit', 'raconte', 'explique', 'demande', 'répondit', 'posa'],
  dancing: ['danse', 'bouge', 'célèbre'],
  working: ['travaille', 'cultive', 'prépare', 'construit'],
  sleeping: ['dort', 'repose', 'rêve'],
  running: ['court', 'fuit', 'poursuit', 'précipite'],
  discovering: ['découvre', 'trouve', 'voit', 'aperçoit', 'rencontre', 'vint', 'comprenait']
};

interface StoryScene {
  sceneNumber: number;
  text: string;
  emotion: string;
  visualDescription: string;
  durationSeconds: number;
}

interface StitchedClip {
  videoUrl: string;
  startTime: number;
  endTime: number;
}

interface GeneratedScene extends StoryScene {
  imageBase64: string;
  imageUrl?: string;
  videoUrl?: string;
  videoDuration?: number;
  stitchedClips?: StitchedClip[];
  fromLibrary?: boolean;
  character_reference_id?: string;
  consistency_score?: number;
}

interface CharacterReference {
  id: string;
  character_name: string;
  reference_image_url: string;
  style_keywords: string[];
  color_palette: string[];
}

interface LibraryImage {
  id: string;
  style: string;
  emotion: string;
  scene_type: string;
  character_type: string;
  action: string;
  image_url: string;
  video_url?: string;
  video_duration?: number;
  asset_type?: string;
  character_reference_id?: string;
  consistency_score?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { story, style = 'fantasy', duration = 30, pre_segmented = false, scenes: preEditedScenes } = body;

    if (!story || story.trim().length < 10) {
      return new Response(
        JSON.stringify({ success: false, error: 'Story text is required (minimum 10 characters)' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    console.log('[generate-anime-story] Request:', {
      storyLength: story?.length || 0,
      style,
      duration,
      pre_segmented,
      preEditedScenesCount: preEditedScenes?.length || 0,
      hasApiKey: !!LOVABLE_API_KEY,
    });

    // PHASE 1: Get scenes
    let safeScenes: StoryScene[];

    if (pre_segmented && Array.isArray(preEditedScenes) && preEditedScenes.length > 0) {
      console.log(`[generate-anime-story] Using ${preEditedScenes.length} pre-segmented scenes`);
      safeScenes = preEditedScenes.map((s: any, i: number) => ({
        sceneNumber: s.sceneNumber || i + 1,
        text: s.text || '',
        emotion: s.emotion || 'wonder',
        visualDescription: s.visualDescription || s.text || '',
        durationSeconds: s.durationSeconds || Math.floor(duration / preEditedScenes.length),
      }));
    } else {
      const scenes = LOVABLE_API_KEY
        ? await segmentStory(story, duration, LOVABLE_API_KEY)
        : createDefaultScenes(story, duration, Math.min(6, Math.max(3, Math.ceil(duration / 10))));

      safeScenes = scenes.length
        ? scenes
        : createDefaultScenes(story, duration, Math.min(6, Math.max(3, Math.ceil(duration / 10))));
    }

    console.log(`[generate-anime-story] Processing ${safeScenes.length} scenes`);

    // PHASE 2: Match with library + character reference + fallback generation
    const imagePromises = safeScenes.map((scene, i) => 
      getSceneImage(scene, style, i, safeScenes.length, supabase, LOVABLE_API_KEY)
    );

    const generatedScenes: GeneratedScene[] = await Promise.all(imagePromises);

    const libraryMatches = generatedScenes.filter(s => s.fromLibrary).length;
    const aiGenerated = generatedScenes.filter(s => !s.fromLibrary).length;
    const withCharRef = generatedScenes.filter(s => s.character_reference_id).length;
    
    console.log(`[generate-anime-story] Complete: ${libraryMatches} library, ${aiGenerated} AI, ${withCharRef} with char ref`);

    return new Response(
      JSON.stringify({
        success: true,
        scenes: generatedScenes,
        totalDuration: duration,
        style,
        stats: { libraryMatches, aiGenerated, withCharRef }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[generate-anime-story] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Generation failed' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

/**
 * Look up a character reference from the database
 */
async function getCharacterReference(
  supabase: ReturnType<typeof createClient>,
  characterType: string
): Promise<CharacterReference | null> {
  const { data } = await supabase
    .from('character_references')
    .select('*')
    .eq('character_name', characterType)
    .maybeSingle();
  return data as CharacterReference | null;
}

/**
 * Get image for a scene - tries library first, then AI generation
 * Now with character reference embedding for consistency
 */
async function getSceneImage(
  scene: StoryScene,
  style: string,
  sceneIndex: number,
  totalScenes: number,
  supabase: ReturnType<typeof createClient>,
  apiKey?: string
): Promise<GeneratedScene> {
  const sceneType = detectSceneType(scene.text, scene.visualDescription);
  const characterType = detectCharacterType(scene.text, scene.visualDescription);
  const action = detectAction(scene.text, scene.visualDescription);

  // Fetch character reference for consistency
  const charRef = await getCharacterReference(supabase, characterType);
  if (charRef) {
    console.log(`[getSceneImage] Character ref found: ${charRef.character_name} (${charRef.id})`);
  }

  console.log(`[getSceneImage] Scene ${sceneIndex + 1}: type=${sceneType}, char=${characterType}, action=${action}, emotion=${scene.emotion}`);

  // Try library match with character reference bonus + text similarity
  const libraryMatch = await findLibraryMatch(supabase, style, scene.emotion, sceneType, characterType, action, charRef?.id, scene.text);

  if (libraryMatch) {
    console.log(`[getSceneImage] Library match for scene ${sceneIndex + 1}: ${libraryMatch.id} (score includes char ref bonus)`);
    
    supabase
      .from('anime_scene_library')
      .update({ usage_count: (libraryMatch as any).usage_count + 1 })
      .eq('id', libraryMatch.id)
      .then(() => {});

    const result: GeneratedScene = {
      ...scene,
      imageBase64: '',
      imageUrl: libraryMatch.image_url,
      fromLibrary: true,
      character_reference_id: libraryMatch.character_reference_id || charRef?.id,
      consistency_score: libraryMatch.consistency_score || 0.75,
    };

    // If library match has video, include it
    if (libraryMatch.asset_type === 'video' && libraryMatch.video_url) {
      result.videoUrl = libraryMatch.video_url;
      result.videoDuration = libraryMatch.video_duration || 5;
    }

    // DÉFI 3: For long scenes (>8s), find complementary clips for stitching
    if (scene.durationSeconds > 8) {
      const stitched = await findStitchedClips(supabase, style, scene.emotion, sceneType, characterType, scene.durationSeconds, libraryMatch.id);
      if (stitched.length > 0) {
        result.stitchedClips = stitched;
        console.log(`[getSceneImage] Stitched ${stitched.length} clips for long scene ${sceneIndex + 1}`);
      }
    }

    return result;
  }

  if (!apiKey) {
    console.warn(`[getSceneImage] No library match and no API key for scene ${sceneIndex + 1}`);
    return { ...scene, imageBase64: '', fromLibrary: false };
  }

  try {
    const imageBase64 = await generateSceneImage(scene, style, sceneIndex, totalScenes, apiKey, charRef);
    return {
      ...scene,
      imageBase64,
      fromLibrary: false,
      character_reference_id: charRef?.id,
      consistency_score: charRef ? 0.8 : 0.5,
    };
  } catch (error) {
    console.error(`[getSceneImage] Failed to generate image for scene ${sceneIndex + 1}:`, error);
    return { ...scene, imageBase64: '', fromLibrary: false };
  }
}

/**
 * Find complementary video clips for scenes longer than 8s
 */
async function findStitchedClips(
  supabase: ReturnType<typeof createClient>,
  style: string,
  emotion: string,
  sceneType: string,
  characterType: string,
  targetDuration: number,
  excludeId: string
): Promise<StitchedClip[]> {
  const { data, error } = await supabase
    .from('anime_scene_library')
    .select('video_url, video_duration')
    .eq('style', style)
    .eq('asset_type', 'video')
    .not('video_url', 'is', null)
    .neq('id', excludeId)
    .or(`emotion.eq.${emotion},scene_type.eq.${sceneType}`)
    .order('usage_count', { ascending: true })
    .limit(4);

  if (error || !data || data.length === 0) return [];

  const clips: StitchedClip[] = [];
  let currentTime = 8; // Start after first clip

  for (const item of data) {
    if (!item.video_url) continue;
    const clipDur = item.video_duration || 5;
    if (currentTime >= targetDuration) break;
    clips.push({
      videoUrl: item.video_url,
      startTime: currentTime,
      endTime: Math.min(currentTime + clipDur, targetDuration),
    });
    currentTime += clipDur;
  }

  return clips;
}

/**
 * Find a matching image from the library
 * Enhanced: semantic text similarity against description_fr/description_en metadata
 * DÉFI 1: +2 bonus for matching character_reference_id
 */
async function findLibraryMatch(
  supabase: ReturnType<typeof createClient>,
  style: string,
  emotion: string,
  sceneType: string,
  characterType: string,
  action: string,
  characterRefId?: string,
  sceneText?: string
): Promise<LibraryImage | null> {
  // Fetch more candidates for better text matching
  const { data, error } = await supabase
    .from('anime_scene_library')
    .select('id, style, emotion, scene_type, character_type, action, image_url, video_url, video_duration, asset_type, character_reference_id, consistency_score, description_fr, description_en, usage_count')
    .eq('style', style)
    .order('usage_count', { ascending: true })
    .limit(50);

  if (error || !data || data.length === 0) return null;

  // Build normalized keywords from scene text for semantic matching
  const textWords = sceneText
    ? normalizeText(sceneText).split(/\s+/).filter(w => w.length > 2)
    : [];

  const scored = data.map((img: any) => {
    let score = 3; // Base for style match
    if (img.emotion === emotion) score += 2;
    if (img.scene_type === sceneType) score += 2;
    if (img.character_type === characterType) score += 1;
    if (img.action === action) score += 1;
    // Character reference consistency bonus
    if (characterRefId && img.character_reference_id === characterRefId) score += 2;
    if (img.consistency_score && img.consistency_score > 0.8) score += 1;

    // TEXT SIMILARITY: compare scene text against asset descriptions
    if (textWords.length > 0) {
      const descWords = normalizeText(
        `${img.description_fr || ''} ${img.description_en || ''}`
      ).split(/\s+/).filter((w: string) => w.length > 2);

      if (descWords.length > 0) {
        const descSet = new Set(descWords);
        let matches = 0;
        for (const w of textWords) {
          if (descSet.has(w)) matches++;
          // Partial match (stem-like): check if any desc word starts with this word or vice versa
          else {
            for (const dw of descSet) {
              if ((dw.length >= 4 && w.startsWith(dw.slice(0, 4))) ||
                  (w.length >= 4 && dw.startsWith(w.slice(0, 4)))) {
                matches += 0.5;
                break;
              }
            }
          }
        }
        // Normalize: up to +4 bonus for high text overlap
        const textScore = Math.min(4, (matches / Math.max(1, textWords.length)) * 6);
        score += textScore;
      }
    }

    return { ...img, matchScore: score };
  });

  scored.sort((a, b) => b.matchScore - a.matchScore);

  const best = scored[0];
  // Lower threshold to 4 since text similarity provides better discrimination
  if (best && best.matchScore >= 4) return best as LibraryImage;
  return null;
}

/** Normalize text for matching: lowercase, remove accents, strip punctuation */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function detectSceneType(text: string, visualDesc: string): string {
  const combined = `${text} ${visualDesc}`.toLowerCase();
  for (const [type, keywords] of Object.entries(SCENE_KEYWORDS)) {
    if (keywords.some(kw => combined.includes(kw))) return type;
  }
  return 'village';
}

function detectCharacterType(text: string, visualDesc: string): string {
  const combined = `${text} ${visualDesc}`.toLowerCase();
  for (const [type, keywords] of Object.entries(CHARACTER_KEYWORDS)) {
    if (keywords.some(kw => combined.includes(kw))) return type;
  }
  return 'child_boy';
}

function detectAction(text: string, visualDesc: string): string {
  const combined = `${text} ${visualDesc}`.toLowerCase();
  for (const [action, keywords] of Object.entries(ACTION_KEYWORDS)) {
    if (keywords.some(kw => combined.includes(kw))) return action;
  }
  return 'standing';
}

async function segmentStory(story: string, totalDuration: number, apiKey: string): Promise<StoryScene[]> {
  const targetScenes = Math.min(6, Math.max(3, Math.ceil(totalDuration / 10)));
  
  const prompt = `Tu es un expert en storyboard pour contes animés. Analyse ce conte et découpe-le en ${targetScenes} scènes visuelles distinctes.

CONTE:
"${story}"

Pour chaque scène, fournis:
1. Le texte exact à narrer (extrait du conte)
2. L'émotion dominante (joy, sadness, wonder, fear, excitement, peace, tension)
3. Une description visuelle détaillée pour illustrer la scène en style anime (personnages, décor, action, ambiance)
4. La durée suggérée en secondes (entre 5 et 15 secondes)

La somme des durées doit être proche de ${totalDuration} secondes.

IMPORTANT: Les descriptions visuelles doivent être en anglais pour la génération d'images.

Réponds UNIQUEMENT avec un JSON valide dans ce format exact:
{
  "scenes": [
    {
      "sceneNumber": 1,
      "text": "Le texte français à narrer...",
      "emotion": "wonder",
      "visualDescription": "A young African boy with curious eyes standing at the edge of a mystical forest at sunset...",
      "durationSeconds": 8
    }
  ]
}`;

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      console.error('[segmentStory] API error:', await response.text());
      return createDefaultScenes(story, totalDuration, targetScenes);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return createDefaultScenes(story, totalDuration, targetScenes);

    try {
      const parsed = JSON.parse(content);
      const scenes = Array.isArray(parsed?.scenes) ? parsed.scenes : [];
      return scenes.length ? scenes : createDefaultScenes(story, totalDuration, targetScenes);
    } catch {
      return createDefaultScenes(story, totalDuration, targetScenes);
    }
  } catch {
    return createDefaultScenes(story, totalDuration, targetScenes);
  }
}

/**
 * Generate scene image with character reference embedding for consistency
 */
async function generateSceneImage(
  scene: StoryScene, 
  style: string, 
  sceneIndex: number, 
  totalScenes: number,
  apiKey: string,
  charRef?: CharacterReference | null
): Promise<string> {
  const styleKeywords = STYLE_KEYWORDS[style] || STYLE_KEYWORDS.fantasy;
  const emotionVisuals = EMOTION_VISUALS[scene.emotion] || EMOTION_VISUALS.wonder;
  
  // Build character consistency instructions if reference exists
  let characterConsistency = '';
  if (charRef) {
    const keywords = charRef.style_keywords?.join(', ') || '';
    const palette = charRef.color_palette?.join(', ') || '';
    characterConsistency = `
CHARACTER CONSISTENCY REQUIREMENTS:
- Character: ${charRef.character_name}
- Visual traits: ${keywords}
- Color palette: ${palette}
- MUST maintain exact character appearance across all scenes
- Same facial features, hair style, clothing, proportions`;
  }

  const prompt = `Create an anime illustration in ${style} style.

SCENE: ${scene.visualDescription}
${characterConsistency}

STYLE REQUIREMENTS:
- ${styleKeywords}
- ${emotionVisuals}
- 9:16 vertical portrait format (mobile optimized)
- High quality anime art
- Expressive characters with detailed eyes
- Atmospheric background matching the mood
- Professional anime production quality

CONSISTENCY NOTE: This is scene ${sceneIndex + 1} of ${totalScenes} in a story. Maintain visual consistency across all scenes.

Create a single, complete illustration capturing this exact moment.`;

  // Build messages — include reference image for multimodal consistency
  const messages: any[] = [];
  if (charRef?.reference_image_url) {
    messages.push({
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: charRef.reference_image_url } }
      ]
    });
  } else {
    messages.push({ role: 'user', content: prompt });
  }

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-3-pro-image-preview',
      messages,
      modalities: ['image', 'text']
    })
  });

  if (!response.ok) {
    throw new Error('Image generation failed');
  }

  const data = await response.json();
  const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  
  if (!imageUrl) throw new Error('No image generated');

  if (imageUrl.startsWith('data:image')) {
    return imageUrl.split(',')[1];
  }
  return imageUrl;
}

function createDefaultScenes(story: string, duration: number, count: number): StoryScene[] {
  const words = story.split(/\s+/);
  const wordsPerScene = Math.ceil(words.length / count);
  const durationPerScene = Math.floor(duration / count);
  
  const scenes: StoryScene[] = [];
  for (let i = 0; i < count; i++) {
    const start = i * wordsPerScene;
    const end = Math.min((i + 1) * wordsPerScene, words.length);
    const text = words.slice(start, end).join(' ');
    scenes.push({
      sceneNumber: i + 1,
      text,
      emotion: i === 0 ? 'wonder' : i === count - 1 ? 'peace' : 'excitement',
      visualDescription: `Scene ${i + 1} of the story: ${text.slice(0, 100)}...`,
      durationSeconds: durationPerScene
    });
  }
  return scenes;
}
