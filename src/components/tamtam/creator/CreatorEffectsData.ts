// src/components/tamtam/creator/CreatorEffectsData.ts
// Complete data definitions for Templates, Graphics, Magic, AR, Stickers

// ============= TYPES =============

export interface CulturalTemplate {
  id: string;
  emoji: string;
  label: string;
  label_ba?: string;
  category: 'conte' | 'sagesse' | 'marche' | 'conseil' | 'creation' | 'libre';
  suggestedDuration: number;
  suggestedMode: 'video' | 'photo' | 'text';
  suggestedRatio: '9:16' | '1:1' | '16:9';
  overlayGradient?: string;
  borderStyle?: string;
  watermarkEmoji?: string;
  voicePrompt?: string;
  autoFilter?: string;
}

export interface GraphicsItem {
  id: string;
  emoji: string;
  label: string;
  category: 'frames' | 'borders' | 'overlays' | 'backgrounds' | 'text_styles';
  cssClass?: string;
  cssStyle?: React.CSSProperties;
  svgOverlay?: string;
}

export interface AREffect {
  id: string;
  emoji: string;
  label: string;
  type: 'face' | 'overlay' | 'sticker' | 'environment';
  cssFilter?: string;
  animation?: string;
  overlayUrl?: string;
}

export interface Challenge {
  id: string;
  emoji: string;
  label: string;
  hashtag: string;
  participants: number;
  badge?: string;
}

export interface ShotTip {
  id: string;
  emoji: string;
  label: string;
  overlayType: 'grid' | 'spiral' | 'center' | 'diagonal';
}

export interface InspiringIdea {
  id: string;
  emoji: string;
  label: string;
  description: string;
  prompts: string[];
}

export interface Sticker {
  id: string;
  type: 'emoji' | 'badge' | 'text' | 'reaction';
  content: string;
  position: { x: number; y: number };
  scale: number;
  rotation: number;
  animation?: 'bounce' | 'pulse' | 'shake' | 'float' | 'none';
}

export interface CaptureEffects {
  filterId: string;
  filterIntensity: number;
  templateId: string;
  frameId?: string;
  borderId?: string;
  overlayId?: string;
  backgroundId?: string;
  arEffects: string[];
  shotTipId?: string;
  challengeId?: string;
  stickers: Sticker[];
  textOverlays: Array<{ text: string; position: { x: number; y: number }; style: string }>;
  musicTrackId?: string;
}

// ============= 19 CULTURAL TEMPLATES =============

export const CULTURAL_TEMPLATES: CulturalTemplate[] = [
  // LIBRE
  { id: 'free', emoji: '🎬', label: 'Libre', label_ba: 'Ominira', category: 'libre', suggestedDuration: 30, suggestedMode: 'video', suggestedRatio: '9:16' },

  // CONTES (5)
  { id: 'conte_animaux', emoji: '🦁', label: 'Conte des animaux', label_ba: 'Itan Eranko', category: 'conte', suggestedDuration: 60, suggestedMode: 'video', suggestedRatio: '9:16', overlayGradient: 'from-amber-900/30 via-transparent to-orange-900/40', voicePrompt: 'Raconte l\'histoire d\'un animal' },
  { id: 'conte_origines', emoji: '🌍', label: 'Origine du monde', label_ba: 'Ipilẹṣẹ Aye', category: 'conte', suggestedDuration: 60, suggestedMode: 'video', suggestedRatio: '9:16', overlayGradient: 'from-emerald-900/40 via-transparent to-teal-900/40' },
  { id: 'conte_heros', emoji: '⚔️', label: 'Héros légendaires', label_ba: 'Akọni Atijọ', category: 'conte', suggestedDuration: 60, suggestedMode: 'video', suggestedRatio: '9:16', overlayGradient: 'from-red-900/30 via-transparent to-purple-900/40' },
  { id: 'conte_magie', emoji: '✨', label: 'Contes magiques', label_ba: 'Itan Idan', category: 'conte', suggestedDuration: 60, suggestedMode: 'video', suggestedRatio: '9:16', overlayGradient: 'from-purple-900/40 via-transparent to-pink-900/30' },
  { id: 'conte_morale', emoji: '📖', label: 'Leçons de vie', label_ba: 'Ẹkọ Aye', category: 'conte', suggestedDuration: 45, suggestedMode: 'video', suggestedRatio: '9:16', overlayGradient: 'from-blue-900/30 via-transparent to-indigo-900/40' },

  // SAGESSE (4)
  { id: 'sagesse_proverbe', emoji: '🧓', label: 'Proverbe du jour', label_ba: 'Owe Oni', category: 'sagesse', suggestedDuration: 15, suggestedMode: 'text', suggestedRatio: '1:1', overlayGradient: 'from-purple-900/50 via-transparent to-indigo-900/50' },
  { id: 'sagesse_ancien', emoji: '👴', label: 'Paroles d\'anciens', label_ba: 'Oro Agba', category: 'sagesse', suggestedDuration: 30, suggestedMode: 'video', suggestedRatio: '9:16', overlayGradient: 'from-amber-800/40 via-transparent to-yellow-900/30' },
  { id: 'sagesse_conseil', emoji: '💡', label: 'Conseil du village', label_ba: 'Imọran Abule', category: 'sagesse', suggestedDuration: 30, suggestedMode: 'video', suggestedRatio: '9:16', overlayGradient: 'from-green-900/30 via-transparent to-emerald-900/40' },
  { id: 'sagesse_histoire', emoji: '📜', label: 'Histoire familiale', label_ba: 'Itan Idile', category: 'sagesse', suggestedDuration: 60, suggestedMode: 'video', suggestedRatio: '9:16', overlayGradient: 'from-orange-900/30 via-transparent to-amber-900/40' },

  // MARCHE (3)
  { id: 'marche_produit', emoji: '🛒', label: 'Vendre un produit', label_ba: 'Ta Ọja', category: 'marche', suggestedDuration: 15, suggestedMode: 'photo', suggestedRatio: '1:1', overlayGradient: 'from-green-900/40 via-transparent to-emerald-900/30', autoFilter: 'vivid' },
  { id: 'marche_prix', emoji: '💰', label: 'Prix du jour', label_ba: 'Owo Oni', category: 'marche', suggestedDuration: 15, suggestedMode: 'video', suggestedRatio: '9:16', overlayGradient: 'from-yellow-900/30 via-transparent to-green-900/40' },
  { id: 'marche_service', emoji: '🔧', label: 'Offrir un service', label_ba: 'Iṣẹ Mi', category: 'marche', suggestedDuration: 30, suggestedMode: 'video', suggestedRatio: '9:16', overlayGradient: 'from-blue-900/30 via-transparent to-cyan-900/40' },

  // CONSEILS (4)
  { id: 'conseil_agri', emoji: '🌾', label: 'Conseil agricole', label_ba: 'Imọran Oko', category: 'conseil', suggestedDuration: 30, suggestedMode: 'video', suggestedRatio: '9:16', overlayGradient: 'from-green-800/40 via-transparent to-lime-900/30', autoFilter: 'warm' },
  { id: 'conseil_sante', emoji: '💊', label: 'Conseil santé', label_ba: 'Ilera', category: 'conseil', suggestedDuration: 30, suggestedMode: 'video', suggestedRatio: '9:16', overlayGradient: 'from-red-900/20 via-transparent to-pink-900/30' },
  { id: 'conseil_education', emoji: '📚', label: 'Leçon éducative', label_ba: 'Ẹkọ', category: 'conseil', suggestedDuration: 45, suggestedMode: 'video', suggestedRatio: '9:16', overlayGradient: 'from-blue-900/30 via-transparent to-purple-900/30' },
  { id: 'conseil_finance', emoji: '💵', label: 'Conseil finance', label_ba: 'Owo', category: 'conseil', suggestedDuration: 30, suggestedMode: 'video', suggestedRatio: '9:16', overlayGradient: 'from-emerald-900/30 via-transparent to-green-900/40' },

  // CREATION (3)
  { id: 'danse', emoji: '💃', label: 'Danse', label_ba: 'Ijo', category: 'creation', suggestedDuration: 30, suggestedMode: 'video', suggestedRatio: '9:16', overlayGradient: 'from-pink-900/30 via-transparent to-purple-900/30' },
  { id: 'recette', emoji: '🍲', label: 'Recette', label_ba: 'Onje', category: 'creation', suggestedDuration: 60, suggestedMode: 'video', suggestedRatio: '9:16', overlayGradient: 'from-orange-900/30 via-transparent to-red-900/30', autoFilter: 'warm' },
  { id: 'challenge', emoji: '🔥', label: 'Challenge', label_ba: 'Idije', category: 'creation', suggestedDuration: 15, suggestedMode: 'video', suggestedRatio: '9:16', overlayGradient: 'from-red-900/40 via-transparent to-orange-900/40' },
];

// ============= GRAPHICS ITEMS =============

export const GRAPHICS_ITEMS: GraphicsItem[] = [
  // FRAMES
  { id: 'polaroid', emoji: '📷', label: 'Polaroid', category: 'frames', cssStyle: { padding: '16px', paddingBottom: '48px', background: 'white', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' } },
  { id: 'vintage_frame', emoji: '🖼️', label: 'Cadre Vintage', category: 'frames', cssStyle: { border: '8px double #8B4513', boxShadow: 'inset 0 0 20px rgba(139,69,19,0.3)' } },
  { id: 'neon_frame', emoji: '💜', label: 'Néon', category: 'frames', cssStyle: { border: '3px solid #ff00ff', boxShadow: '0 0 20px #ff00ff, inset 0 0 20px rgba(255,0,255,0.2)' } },
  { id: 'film_strip', emoji: '🎞️', label: 'Pellicule', category: 'frames', cssClass: 'film-strip-pattern' },
  { id: 'circle_frame', emoji: '⭕', label: 'Cercle', category: 'frames', cssStyle: { borderRadius: '50%', overflow: 'hidden' } },
  { id: 'golden_frame', emoji: '🥇', label: 'Doré', category: 'frames', cssStyle: { border: '6px solid gold', boxShadow: '0 0 15px rgba(255,215,0,0.5)' } },

  // BORDERS
  { id: 'rainbow_border', emoji: '🌈', label: 'Arc-en-ciel', category: 'borders', cssClass: 'rainbow-border' },
  { id: 'tribal_border', emoji: '🪶', label: 'Tribal', category: 'borders', cssClass: 'tribal-pattern' },
  { id: 'dots_border', emoji: '⚫', label: 'Points', category: 'borders', cssStyle: { border: '4px dotted white' } },
  { id: 'dashed_border', emoji: '➖', label: 'Tirets', category: 'borders', cssStyle: { border: '3px dashed white' } },
  { id: 'glow_border', emoji: '✨', label: 'Lueur', category: 'borders', cssStyle: { boxShadow: '0 0 30px rgba(255,255,255,0.6), inset 0 0 30px rgba(255,255,255,0.1)' } },

  // OVERLAYS
  { id: 'dust_overlay', emoji: '🌫️', label: 'Poussière', category: 'overlays', cssClass: 'dust-grain-overlay' },
  { id: 'light_leak', emoji: '🌅', label: 'Light Leak', category: 'overlays', cssClass: 'light-leak-overlay' },
  { id: 'vignette', emoji: '⬛', label: 'Vignette', category: 'overlays', cssClass: 'vignette-overlay' },
  { id: 'bokeh', emoji: '💫', label: 'Bokeh', category: 'overlays', cssClass: 'bokeh-overlay' },
  { id: 'stars_overlay', emoji: '⭐', label: 'Étoiles', category: 'overlays', cssClass: 'stars-overlay' },

  // BACKGROUNDS
  { id: 'blur_bg', emoji: '🌫️', label: 'Flou', category: 'backgrounds', cssStyle: { backdropFilter: 'blur(20px)' } },
  { id: 'gradient_sunset', emoji: '🌇', label: 'Coucher', category: 'backgrounds', cssClass: 'bg-gradient-to-br from-orange-500 via-pink-500 to-purple-600' },
  { id: 'gradient_ocean', emoji: '🌊', label: 'Océan', category: 'backgrounds', cssClass: 'bg-gradient-to-br from-cyan-500 via-blue-500 to-indigo-600' },
  { id: 'pattern_kente', emoji: '🧵', label: 'Kente', category: 'backgrounds', cssClass: 'kente-pattern' },
  { id: 'pattern_adinkra', emoji: '🔷', label: 'Adinkra', category: 'backgrounds', cssClass: 'adinkra-pattern' },

  // TEXT STYLES
  { id: 'title_bold', emoji: '🅰️', label: 'Titre Gras', category: 'text_styles', cssStyle: { fontWeight: 900, fontSize: '48px', textShadow: '2px 2px 4px rgba(0,0,0,0.5)' } },
  { id: 'handwritten', emoji: '✍️', label: 'Manuscrit', category: 'text_styles', cssStyle: { fontFamily: 'cursive', fontSize: '36px' } },
  { id: 'neon_text', emoji: '💜', label: 'Néon', category: 'text_styles', cssStyle: { color: '#ff00ff', textShadow: '0 0 10px #ff00ff, 0 0 20px #ff00ff, 0 0 30px #ff00ff' } },
  { id: 'outline_text', emoji: '⭕', label: 'Contour', category: 'text_styles', cssStyle: { WebkitTextStroke: '2px white', color: 'transparent' } },
  { id: 'shadow_text', emoji: '🌑', label: 'Ombre', category: 'text_styles', cssStyle: { textShadow: '4px 4px 8px rgba(0,0,0,0.8)' } },
];

// ============= AR EFFECTS =============

export const AR_EFFECTS: AREffect[] = [
  // Face filters
  { id: 'beauty_face', emoji: '✨', label: 'Beauté', type: 'face', cssFilter: 'brightness(1.1) contrast(0.95) blur(0.3px)' },
  { id: 'smooth_skin', emoji: '💎', label: 'Peau lisse', type: 'face', cssFilter: 'blur(0.5px) brightness(1.05)' },
  { id: 'glow_face', emoji: '🌟', label: 'Éclat', type: 'face', cssFilter: 'brightness(1.15) contrast(0.9)' },
  
  // Overlays with animations
  { id: 'sparkles', emoji: '✨', label: 'Étincelles', type: 'overlay', animation: 'sparkles' },
  { id: 'hearts', emoji: '💕', label: 'Cœurs', type: 'overlay', animation: 'floating-hearts' },
  { id: 'rain', emoji: '🌧️', label: 'Pluie', type: 'overlay', animation: 'rain' },
  { id: 'confetti', emoji: '🎊', label: 'Confettis', type: 'overlay', animation: 'confetti' },
  { id: 'snow', emoji: '❄️', label: 'Neige', type: 'overlay', animation: 'snow' },
  { id: 'bubbles', emoji: '🫧', label: 'Bulles', type: 'overlay', animation: 'bubbles' },
  { id: 'fireflies', emoji: '🔆', label: 'Lucioles', type: 'overlay', animation: 'fireflies' },
  
  // Fun stickers
  { id: 'sunglasses', emoji: '🕶️', label: 'Lunettes', type: 'sticker' },
  { id: 'crown', emoji: '👑', label: 'Couronne', type: 'sticker' },
  { id: 'halo', emoji: '😇', label: 'Auréole', type: 'sticker' },
  { id: 'horns', emoji: '😈', label: 'Cornes', type: 'sticker' },
  
  // Environment
  { id: 'neon_bg', emoji: '💜', label: 'Néon BG', type: 'environment', cssFilter: 'saturate(1.5) hue-rotate(30deg)' },
  { id: 'vintage_env', emoji: '📻', label: 'Vintage', type: 'environment', cssFilter: 'sepia(0.4) contrast(1.1)' },
];

// ============= CHALLENGES =============

export const CHALLENGES: Challenge[] = [
  { id: 'dance_challenge', emoji: '💃', label: 'Dance Challenge', hashtag: '#DanceChallenge', participants: 12340, badge: '🕺' },
  { id: 'before_after', emoji: '↔️', label: 'Avant/Après', hashtag: '#AvantAprès', participants: 5670, badge: '🔄' },
  { id: 'market_day', emoji: '🛒', label: 'Jour de Marché', hashtag: '#JourDeMarché', participants: 8900, badge: '🏪' },
  { id: 'story_time', emoji: '📖', label: 'Raconte Moi', hashtag: '#RaconteMoi', participants: 4560, badge: '📚' },
  { id: 'talent_show', emoji: '🎤', label: 'Mon Talent', hashtag: '#MonTalent', participants: 7890, badge: '⭐' },
  { id: 'cooking', emoji: '🍳', label: 'Ma Recette', hashtag: '#MaRecette', participants: 3450, badge: '👨‍🍳' },
  { id: 'village_life', emoji: '🏘️', label: 'Vie de Village', hashtag: '#VieDeVillage', participants: 6780, badge: '🌾' },
  { id: 'sunset', emoji: '🌅', label: 'Coucher de Soleil', hashtag: '#Sunset', participants: 9120, badge: '🌇' },
  { id: 'morning_routine', emoji: '☀️', label: 'Routine Matin', hashtag: '#MorningRoutine', participants: 4230, badge: '🌅' },
  { id: 'pet_love', emoji: '🐾', label: 'Mon Animal', hashtag: '#PetLove', participants: 5670, badge: '🐕' },
];

// ============= SHOT TIPS =============

export const SHOT_TIPS: ShotTip[] = [
  { id: 'rule_of_thirds', emoji: '📐', label: 'Règle des tiers', overlayType: 'grid' },
  { id: 'center_focus', emoji: '🎯', label: 'Centré', overlayType: 'center' },
  { id: 'golden_spiral', emoji: '🌀', label: 'Spirale dorée', overlayType: 'spiral' },
  { id: 'diagonal_lines', emoji: '↗️', label: 'Diagonales', overlayType: 'diagonal' },
];

// ============= INSPIRING IDEAS =============

export const INSPIRING_IDEAS: InspiringIdea[] = [
  { id: 'trending', emoji: '🔥', label: 'Tendances', description: 'Ce qui marche en ce moment', prompts: ['Danse virale du moment', 'Recette populaire', 'Challenge trending'] },
  { id: 'seasonal', emoji: '🌦️', label: 'Saisonnier', description: 'Contenu de saison', prompts: ['Fête traditionnelle', 'Récolte du moment', 'Météo locale'] },
  { id: 'local_events', emoji: '📅', label: 'Événements', description: 'Fêtes et célébrations', prompts: ['Mariage au village', 'Cérémonie traditionnelle', 'Marché du jour'] },
  { id: 'daily_tips', emoji: '💡', label: 'Astuces', description: 'Conseils pratiques', prompts: ['Astuce maison', 'Conseil jardinage', 'Recette rapide'] },
  { id: 'stories', emoji: '📖', label: 'Histoires', description: 'Contes et récits', prompts: ['Légende locale', 'Proverbe illustré', 'Histoire de famille'] },
  { id: 'education', emoji: '📚', label: 'Éducatif', description: 'Partager des savoirs', prompts: ['Leçon de langue', 'Histoire locale', 'Artisanat traditionnel'] },
];

// ============= STICKER CATEGORIES =============

export const STICKER_CATEGORIES = {
  emojis: ['😀', '🔥', '💯', '👏', '🎉', '❤️', '🙏', '💪', '👍', '⭐', '🌟', '💫', '🎊', '🎈', '🌈', '☀️', '🎵', '🎶', '💃', '🕺'],
  badges: ['📍', '🗓️', '💰', '#️⃣', '🏷️', '📌', '🎯', '🏆', '🥇', '✅'],
  reactions: ['😍', '🤩', '😮', '😂', '😢', '😡', '🥰', '🤔', '👀', '💀'],
  cultural: ['🥁', '🎺', '🪘', '🌴', '🏺', '🪶', '🧵', '🪔', '🍲', '🌾', '🏠', '🛖'],
};

// ============= DEFAULT EFFECTS STATE =============

export const DEFAULT_EFFECTS: CaptureEffects = {
  filterId: 'none',
  filterIntensity: 100,
  templateId: 'free',
  frameId: undefined,
  borderId: undefined,
  overlayId: undefined,
  backgroundId: undefined,
  arEffects: [],
  shotTipId: undefined,
  challengeId: undefined,
  stickers: [],
  textOverlays: [],
  musicTrackId: undefined,
};

// ============= HELPER FUNCTIONS =============

export function getTemplateById(id: string): CulturalTemplate {
  return CULTURAL_TEMPLATES.find(t => t.id === id) ?? CULTURAL_TEMPLATES[0];
}

export function getGraphicsById(id: string): GraphicsItem | undefined {
  return GRAPHICS_ITEMS.find(g => g.id === id);
}

export function getAREffectById(id: string): AREffect | undefined {
  return AR_EFFECTS.find(e => e.id === id);
}

export function getChallengeById(id: string): Challenge | undefined {
  return CHALLENGES.find(c => c.id === id);
}

export function formatParticipants(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
}
