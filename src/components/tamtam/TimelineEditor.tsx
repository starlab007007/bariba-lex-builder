import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  Play,
  Pause,
  RotateCcw,
  Check,
  Volume2,
  VolumeX,
  Scissors,
  Zap,
  Music,
  Sparkles,
  Type,
  Wand2,
  Settings,
  Filter,
  Maximize2,
  Minimize2,
  SkipBack,
  SkipForward,
  Sliders,
  Plus,
  RefreshCw,
  Eye,
  Target,
  Layers,
  Activity,
  Wind,
  Heart,
  AlertTriangle,
  Copy,
  Trash2,
  Timer,
  Smile,
  TrendingUp,
  Users,
  BookOpen,
  Cpu,
  Download,
  Share2,
  MessageCircle,
  ThumbsUp,
  Camera,
  Video,
  Image as ImageIcon,
  Mic,
  Gauge,
  Flashlight,
  Repeat2,
  RectangleHorizontal,
  Square,
  Smartphone,
  Subtitles,
  Pencil,
  Sticker,
} from "lucide-react";

/** =========================================================
 *  TYPES
 *  ========================================================= */

export interface TimelineSegment {
  id: string;
  blob: Blob;
  type: "audio" | "video" | "photo";
  duration: number; // seconds
  startTime: number; // optional source time (can be 0)
  endTime: number; // seconds
  thumbnail?: string;
  isMuted?: boolean;
  filter?: string;
  volume?: number; // 0..100
}

type BlockType = "HOOK_1S" | "MESSAGE" | "PROOF" | "END";
type Energy = "calm" | "medium" | "dynamic";
type Focus = "face" | "product" | "hands" | "full";

interface VideoBlock {
  id: string;
  type: BlockType;
  segment: TimelineSegment;
  energy: Energy;
  focus?: Focus;
}

interface AIBackground {
  id: string;
  name: string;
  nameBa: string;
  emoji: string;
  tags: string[];
  reactivity: {
    voice_pulse: number;
    emotion_tint: number;
    gesture_echo: number;
    breath_flow: number;
  };
  gradient: string; // tailwind gradient classes
  pattern?: string;
}

interface CulturalTemplate {
  id: string;
  emoji: string;
  name: string;
  nameBa: string;
  category:
    | "STORY"
    | "HISTORY"
    | "COMMUNITY"
    | "MARKET"
    | "CELEBRATION"
    | "HEALTH"
    | "ALERT"
    | "HELP"
    | "KNOWLEDGE"
    | "SONG"
    | "WISDOM";
  symbols: string[];
  energy: "calm" | "medium" | "high";
  structure: BlockType[];
  tags: string[];
}

interface TextOverlay {
  id: string;
  emoji: string;
  position: { x: number; y: number }; // %
  scale: number;
  rotation: number;
  startTime: number;
  endTime: number;
}

/** =========================================================
 *  UX MAPPING (Figma/PRD-ready)
 *  ========================================================= */

type UXRow = {
  ui: string;
  role: string;
  style: string;
  logic: string;
};

const UX_MAPPING = {
  entryNavigation: [
    { ui: "+ (Bottom tab)", role: "Point d’entrée création", style: "Bouton circulaire central", logic: "Accès instantané à créer" },
    { ui: "Graphics", role: "Création graphique", style: "Fond plat, icônes", logic: "Création sans caméra" },
    { ui: "Video", role: "Capture vidéo", style: "Plein écran caméra", logic: "Usage principal" },
    { ui: "Story", role: "Contenu éphémère", style: "UI légère", logic: "Publication rapide" },
    { ui: "Template", role: "Création guidée", style: "Cartes visuelles", logic: "Démocratisation création" },
    { ui: "Live", role: "Diffusion", style: "UI broadcast", logic: "Monétisation & engagement" },
  ] satisfies UXRow[],
  captureRightBar: [
    { ui: "Switch", role: "Caméra A/R", style: "Icône rotation", logic: "Rapidité" },
    { ui: "Flash", role: "Lumière", style: "Icône éclair", logic: "Qualité image" },
    { ui: "Timer", role: "Décompte", style: "Cercle animé", logic: "Solo creators" },
    { ui: "Speed", role: "Vitesse", style: "Icône chrono", logic: "Effet rythme" },
    { ui: "Length", role: "Durée", style: "Badge temps", logic: "Cadre créatif" },
    { ui: "Recording", role: "État", style: "Icône rouge", logic: "Feedback clair" },
  ] satisfies UXRow[],
  creativeAssist: [
    { ui: "Inspiring", role: "Idées créatives", style: "Icône œil", logic: "Lutte page blanche" },
    { ui: "Shot tips", role: "Guidage tournage", style: "Texte overlay", logic: "Éducation créateur" },
    { ui: "Cover tips", role: "Miniature", style: "Tooltip", logic: "Optimisation CTR" },
    { ui: "Challenge", role: "Tendance", style: "Badge feu", logic: "Viralisation" },
    { ui: "Recommended filter", role: "Filtre auto", style: "Highlight", logic: "IA proactive" },
  ] satisfies UXRow[],
  beautyArFx: [
    { ui: "Beautify", role: "Retouche visage", style: "Sliders", logic: "Vision ML" },
    { ui: "Magic", role: "IA / AR", style: "Icône étincelle", logic: "Pipeline IA" },
    { ui: "Stickers", role: "Décor AR", style: "Assets animés", logic: "Tracking" },
    { ui: "Graffiti", role: "Dessin", style: "Layer libre", logic: "Canvas overlay" },
    { ui: "Effects", role: "Effets vidéo", style: "Preview temps réel", logic: "Shader / GPU" },
    { ui: "Filter swipe", role: "Changement rapide", style: "Gesture", logic: "UX fluide" },
  ] satisfies UXRow[],
  audioMusic: [
    { ui: "Music", role: "Sélection son", style: "Bottom sheet", logic: "Création audio-first" },
    { ui: "Trending", role: "Sons populaires", style: "Liste", logic: "Viral engine" },
    { ui: "Collect", role: "Favoris", style: "Étoile", logic: "Rétention" },
    { ui: "History", role: "Historique", style: "Liste simple", logic: "Continuité" },
    { ui: "Pure Music", role: "Vidéo audio", style: "Badge", logic: "Usage non visuel" },
  ] satisfies UXRow[],
  postCaptureVertical: [
    { ui: "Enhance", role: "Amélioration auto", style: "One-click", logic: "IA assist" },
    { ui: "Template", role: "Appliquer modèle", style: "Carte", logic: "Rapidité" },
    { ui: "Canvas", role: "Format & fond", style: "Panneau", logic: "Multi-écran" },
    { ui: "Stickers", role: "Décor", style: "Overlay", logic: "Enrichissement" },
    { ui: "Subtitles", role: "Sous-titres", style: "Timeline", logic: "Accessibilité" },
    { ui: "Graffiti", role: "Dessin", style: "Layer", logic: "Expression" },
    { ui: "Effects", role: "Effets", style: "Timeline", logic: "Impact" },
    { ui: "Challenge", role: "Tendance", style: "Badge", logic: "Distribution" },
  ] satisfies UXRow[],
  canvasStrategic: [
    { ui: "Ratio change", role: "Multi-format", style: "Toggle", logic: "Cross-platform" },
    { ui: "Background", role: "Fond graphique", style: "Picker", logic: "Storytelling" },
    { ui: "Reframe", role: "Recentrage", style: "Drag/Auto", logic: "Lisibilité" },
    { ui: "Multi-screen", role: "Diffusion large", style: "Layout", logic: "+ reach" },
    { ui: "Vertical / Square", role: "Adaptation", style: "Preset", logic: "Universalité" },
  ] satisfies UXRow[],
};

/** =========================================================
 *  TEMPLATES / THEMES / MAGIC (Kuaishou-like)
 *  ========================================================= */

type TrendingTemplate = {
  id: string;
  category: "Transformation" | "Transition" | "Dance" | "Romance" | "Family" | "Beauty" | "Text" | "Viral";
  name: string;
  desc: string;
  icon: string;
  recommended: {
    energy?: Energy;
    filterId?: string;
    backgroundId?: string;
    musicId?: string;
    speed?: number;
  };
};

type ThemePack = {
  id: string;
  name: string;
  includes: string[];
  recommended: {
    filterId?: string;
    backgroundId?: string;
    musicId?: string;
  };
};

type MagicFeature = {
  id: string;
  name: string;
  desc: string;
  icon: React.ReactNode;
};

type CreationType =
  | "Short video"
  | "Story"
  | "Template video"
  | "Graphics"
  | "Text video"
  | "Pure music"
  | "Challenge video"
  | "Live"
  | "Live cover"
  | "Pure AR";

const TRENDING_TEMPLATES: TrendingTemplate[] = [
  {
    id: "tt_transform",
    category: "Transformation",
    name: "Transformation magique",
    desc: "Avant / après, cosplay",
    icon: "🪄",
    recommended: { energy: "dynamic", filterId: "vivid", backgroundId: "living_gradient", musicId: "m4", speed: 1.05 },
  },
  {
    id: "tt_transition",
    category: "Transition",
    name: "Transition rythmée",
    desc: "Coupes synchronisées",
    icon: "✂️",
    recommended: { energy: "dynamic", filterId: "warm", backgroundId: "celebration", musicId: "m2", speed: 1.1 },
  },
  {
    id: "tt_dance",
    category: "Dance",
    name: "Dance remix",
    desc: "Mouvement + beat",
    icon: "💃",
    recommended: { energy: "dynamic", filterId: "vivid", backgroundId: "street_life", musicId: "m1", speed: 1.0 },
  },
  {
    id: "tt_romance",
    category: "Romance",
    name: "Love moment",
    desc: "Slow motion + texte",
    icon: "💞",
    recommended: { energy: "calm", filterId: "beauty", backgroundId: "living_gradient", musicId: "m3", speed: 0.9 },
  },
  {
    id: "tt_family",
    category: "Family",
    name: "Family reunion",
    desc: "Montage émotion",
    icon: "👨‍👩‍👧‍👦",
    recommended: { energy: "medium", filterId: "vintage", backgroundId: "real_room", musicId: "m5", speed: 1.0 },
  },
  {
    id: "tt_beauty",
    category: "Beauty",
    name: "Face glow",
    desc: "Beautify + filtre",
    icon: "✨",
    recommended: { energy: "medium", filterId: "beauty", backgroundId: "living_gradient", musicId: "m3", speed: 1.0 },
  },
  {
    id: "tt_text",
    category: "Text",
    name: "Animated text",
    desc: "Typo dynamique",
    icon: "📝",
    recommended: { energy: "medium", filterId: "none", backgroundId: "knowledge", musicId: "m3", speed: 1.0 },
  },
  {
    id: "tt_viral",
    category: "Viral",
    name: "Trend copy",
    desc: "Copie style viral",
    icon: "🔥",
    recommended: { energy: "dynamic", filterId: "vivid", backgroundId: "market_scene", musicId: "m1", speed: 1.05 },
  },
];

const THEME_PACKS: ThemePack[] = [
  { id: "th_romance", name: "Romance", includes: ["Filtre doux", "Musique lente"], recommended: { filterId: "beauty", backgroundId: "living_gradient", musicId: "m3" } },
  { id: "th_nostalgia", name: "Nostalgie", includes: ["Grain", "Couleur chaude"], recommended: { filterId: "vintage", backgroundId: "real_room", musicId: "m5" } },
  { id: "th_tragedy", name: "Tragédie", includes: ["Slow", "Texte dramatique"], recommended: { filterId: "dramatic", backgroundId: "sacred_place", musicId: "m3" } },
  { id: "th_wedding", name: "Mariage", includes: ["Transitions blanches", "Musique"], recommended: { filterId: "beauty", backgroundId: "celebration", musicId: "m5" } },
  { id: "th_newyear", name: "Nouvel An / Fête", includes: ["Pack graphique", "Confetti"], recommended: { filterId: "vivid", backgroundId: "celebration", musicId: "m1" } },
  { id: "th_fashion", name: "Beauté / Mode", includes: ["Beautify", "Lumière"], recommended: { filterId: "beauty", backgroundId: "living_gradient", musicId: "m3" } },
  { id: "th_emotional", name: "Story émotionnelle", includes: ["Texte + timing"], recommended: { filterId: "warm", backgroundId: "nature_myth", musicId: "m5" } },
  { id: "th_vlog", name: "Vlog quotidien", includes: ["Coupe simple"], recommended: { filterId: "none", backgroundId: "street_life", musicId: "m1" } },
  { id: "th_fun", name: "Fun / Comique", includes: ["AR", "Emojis"], recommended: { filterId: "vivid", backgroundId: "street_life", musicId: "m4" } },
  { id: "th_cinema", name: "Cinématique", includes: ["LUT", "Transitions"], recommended: { filterId: "dramatic", backgroundId: "living_gradient", musicId: "m3" } },
];

const MAGIC_FEATURES: MagicFeature[] = [
  { id: "face_recognition", name: "Face recognition", desc: "Détection visage", icon: <Smile className="h-4 w-4" /> },
  { id: "emoji_face", name: "Emoji face", desc: "Emojis collés", icon: <Sticker className="h-4 w-4" /> },
  { id: "ar_props", name: "AR props", desc: "Cornes, oreilles...", icon: <Sparkles className="h-4 w-4" /> },
  { id: "emotion_detect", name: "Emotion detect", desc: "Expression visage", icon: <Heart className="h-4 w-4" /> },
  { id: "auto_recommend", name: "Auto recommend", desc: "Suggestions IA", icon: <Cpu className="h-4 w-4" /> },
  { id: "filter_memory", name: "Filter memory", desc: "Dernier filtre", icon: <Filter className="h-4 w-4" /> },
  { id: "object_tracking", name: "Object tracking", desc: "Suivi dynamique", icon: <Target className="h-4 w-4" /> },
];

const CREATION_TYPES: CreationType[] = [
  "Short video",
  "Story",
  "Template video",
  "Graphics",
  "Text video",
  "Pure music",
  "Challenge video",
  "Live",
  "Live cover",
  "Pure AR",
];

/** =========================================================
 *  DATA (backgrounds, templates, filters, music, stickers)
 *  ========================================================= */

const AI_BACKGROUNDS: AIBackground[] = [
  { id: "real_room", name: "Maison", nameBa: "Ile", emoji: "🏠", tags: ["home", "intimate"], reactivity: { voice_pulse: 0.3, emotion_tint: 0.5, gesture_echo: 0.2, breath_flow: 0.4 }, gradient: "from-amber-900/40 to-orange-800/40", pattern: "dots" },
  { id: "street_life", name: "Rue/Village", nameBa: "Ita/Abule", emoji: "🏘️", tags: ["outdoor", "community"], reactivity: { voice_pulse: 0.4, emotion_tint: 0.6, gesture_echo: 0.3, breath_flow: 0.5 }, gradient: "from-green-900/40 to-teal-800/40", pattern: "grid" },
  { id: "market_scene", name: "Marché", nameBa: "Ọja", emoji: "🏪", tags: ["commerce", "vibrant"], reactivity: { voice_pulse: 0.6, emotion_tint: 0.7, gesture_echo: 0.5, breath_flow: 0.7 }, gradient: "from-yellow-900/40 to-orange-700/40", pattern: "waves" },
  { id: "worksite", name: "Travaux", nameBa: "Iṣẹ", emoji: "🔨", tags: ["work", "collective"], reactivity: { voice_pulse: 0.5, emotion_tint: 0.6, gesture_echo: 0.4, breath_flow: 0.6 }, gradient: "from-gray-900/40 to-slate-800/40", pattern: "lines" },
  { id: "sacred_place", name: "Lieu Sacré", nameBa: "Ibi Mimọ", emoji: "🕌", tags: ["sacred", "calm"], reactivity: { voice_pulse: 0.2, emotion_tint: 0.8, gesture_echo: 0.1, breath_flow: 0.3 }, gradient: "from-purple-900/40 to-indigo-800/40", pattern: "stars" },
  { id: "nature_myth", name: "Nature/Conte", nameBa: "Igbo/Itan", emoji: "🌳", tags: ["nature", "story"], reactivity: { voice_pulse: 0.3, emotion_tint: 0.6, gesture_echo: 0.2, breath_flow: 0.4 }, gradient: "from-emerald-900/40 to-green-800/40", pattern: "organic" },
  { id: "celebration", name: "Fête", nameBa: "Ayẹyẹ", emoji: "🎉", tags: ["party", "joy"], reactivity: { voice_pulse: 0.8, emotion_tint: 0.9, gesture_echo: 0.7, breath_flow: 0.8 }, gradient: "from-pink-900/40 to-rose-700/40", pattern: "confetti" },
  { id: "health_clean", name: "Santé", nameBa: "Ilera", emoji: "🏥", tags: ["health", "clean"], reactivity: { voice_pulse: 0.2, emotion_tint: 0.5, gesture_echo: 0.1, breath_flow: 0.3 }, gradient: "from-blue-900/40 to-cyan-800/40", pattern: "clean" },
  { id: "alert_signal", name: "Alerte", nameBa: "Ikilọ", emoji: "🚨", tags: ["alert", "urgent"], reactivity: { voice_pulse: 0.7, emotion_tint: 0.9, gesture_echo: 0.4, breath_flow: 0.6 }, gradient: "from-red-900/40 to-orange-800/40", pattern: "pulse" },
  { id: "neutral_help", name: "Aide", nameBa: "Iranlọwọ", emoji: "🤝", tags: ["help", "support"], reactivity: { voice_pulse: 0.4, emotion_tint: 0.6, gesture_echo: 0.3, breath_flow: 0.5 }, gradient: "from-violet-900/40 to-purple-800/40", pattern: "support" },
  { id: "knowledge", name: "Savoir", nameBa: "Imọ", emoji: "📚", tags: ["teaching", "demo"], reactivity: { voice_pulse: 0.4, emotion_tint: 0.5, gesture_echo: 0.3, breath_flow: 0.4 }, gradient: "from-indigo-900/40 to-blue-800/40", pattern: "book" },
  { id: "living_gradient", name: "Premium", nameBa: "Ọla", emoji: "✨", tags: ["modern", "premium"], reactivity: { voice_pulse: 0.9, emotion_tint: 1.0, gesture_echo: 0.8, breath_flow: 0.9 }, gradient: "from-purple-600/40 via-pink-600/40 to-orange-500/40", pattern: "shimmer" },
];

const CULTURAL_TEMPLATES: CulturalTemplate[] = [
  { id: "conte_animaux", emoji: "🦁", name: "Conte des animaux", nameBa: "Itan ẹranko", category: "STORY", symbols: ["🦁", "🌙", "⭐"], energy: "calm", structure: ["HOOK_1S", "MESSAGE", "END"], tags: ["story", "animals"] },
  { id: "origine_monde", emoji: "🌍", name: "Origine du monde", nameBa: "Ipilẹṣẹ aye", category: "STORY", symbols: ["🌍", "✨", "👑"], energy: "calm", structure: ["HOOK_1S", "MESSAGE", "END"], tags: ["story", "origin"] },
  { id: "hero_legend", emoji: "⚔️", name: "Héros légendaire", nameBa: "Akọni itan", category: "HISTORY", symbols: ["⚔️", "👑", "🔥"], energy: "high", structure: ["HOOK_1S", "MESSAGE", "PROOF", "END"], tags: ["history", "hero"] },
  { id: "reunion", emoji: "👥", name: "Réunion", nameBa: "Ipade", category: "COMMUNITY", symbols: ["👥", "🗣️", "📢"], energy: "medium", structure: ["HOOK_1S", "MESSAGE", "END"], tags: ["community", "meeting"] },
  { id: "travaux", emoji: "🔨", name: "Travaux collectifs", nameBa: "Iṣẹ papọ", category: "COMMUNITY", symbols: ["🔨", "💪", "🤝"], energy: "high", structure: ["HOOK_1S", "MESSAGE", "PROOF", "END"], tags: ["community", "work"] },
  { id: "marche", emoji: "🏪", name: "Jour de marché", nameBa: "Ọjọ ọja", category: "MARKET", symbols: ["🏪", "💰", "🌾"], energy: "high", structure: ["HOOK_1S", "MESSAGE", "PROOF", "END"], tags: ["market", "commerce"] },
  { id: "aide_financiere", emoji: "💰", name: "Aide financière", nameBa: "Iranlọwọ owo", category: "MARKET", symbols: ["💰", "🤝", "📱"], energy: "medium", structure: ["HOOK_1S", "MESSAGE", "END"], tags: ["market", "help"] },
  { id: "naissance", emoji: "👶", name: "Naissance", nameBa: "Ibibi", category: "CELEBRATION", symbols: ["👶", "🎉", "🌟"], energy: "high", structure: ["HOOK_1S", "MESSAGE", "END"], tags: ["celebration", "birth"] },
  { id: "mariage", emoji: "💒", name: "Mariage", nameBa: "Igbeyawo", category: "CELEBRATION", symbols: ["💒", "💍", "🎉"], energy: "high", structure: ["HOOK_1S", "MESSAGE", "PROOF", "END"], tags: ["celebration", "marriage"] },
  { id: "reussite", emoji: "🎓", name: "Réussite scolaire", nameBa: "Aṣeyọri eko", category: "CELEBRATION", symbols: ["🎓", "📚", "⭐"], energy: "high", structure: ["HOOK_1S", "MESSAGE", "END"], tags: ["celebration", "success"] },
  { id: "guerison", emoji: "💪", name: "Guérison", nameBa: "Ilera", category: "HEALTH", symbols: ["💪", "🏥", "💚"], energy: "calm", structure: ["HOOK_1S", "MESSAGE", "END"], tags: ["health", "healing"] },
  { id: "plantes", emoji: "🌿", name: "Plantes médicinales", nameBa: "Eweko ibile", category: "HEALTH", symbols: ["🌿", "💊", "🍃"], energy: "calm", structure: ["HOOK_1S", "MESSAGE", "PROOF", "END"], tags: ["health", "plants"] },
  { id: "alerte_meteo", emoji: "⛈️", name: "Alerte météo", nameBa: "Ikilọ oju-ọjọ", category: "ALERT", symbols: ["⛈️", "🚨", "⚠️"], energy: "high", structure: ["HOOK_1S", "MESSAGE", "END"], tags: ["alert", "weather"] },
  { id: "alerte_sante", emoji: "🦠", name: "Alerte sanitaire", nameBa: "Ikilọ ilera", category: "ALERT", symbols: ["🦠", "🚨", "🏥"], energy: "high", structure: ["HOOK_1S", "MESSAGE", "END"], tags: ["alert", "health"] },
  { id: "animal_danger", emoji: "🐍", name: "Animal dangereux", nameBa: "Ẹranko lewu", category: "ALERT", symbols: ["🐍", "⚠️", "🚨"], energy: "high", structure: ["HOOK_1S", "MESSAGE", "END"], tags: ["alert", "danger"] },
  { id: "demande_aide", emoji: "🙏", name: "Demande d'aide", nameBa: "Beere iranlọwọ", category: "HELP", symbols: ["🙏", "🤝", "💙"], energy: "calm", structure: ["HOOK_1S", "MESSAGE", "END"], tags: ["help", "request"] },
  { id: "cherche_personne", emoji: "👤", name: "Cherche quelqu'un", nameBa: "Nwa eniyan", category: "HELP", symbols: ["👤", "🔍", "📱"], energy: "medium", structure: ["HOOK_1S", "MESSAGE", "END"], tags: ["help", "search"] },
  { id: "savoir_agricole", emoji: "🌱", name: "Savoir agricole", nameBa: "Imọ ogbin", category: "KNOWLEDGE", symbols: ["🌱", "🌾", "🚜"], energy: "medium", structure: ["HOOK_1S", "MESSAGE", "PROOF", "END"], tags: ["knowledge", "agriculture"] },
  { id: "recette", emoji: "🍲", name: "Recette traditionnelle", nameBa: "Ounje ibile", category: "KNOWLEDGE", symbols: ["🍲", "🔥", "👩‍🍳"], energy: "medium", structure: ["HOOK_1S", "MESSAGE", "PROOF", "END"], tags: ["knowledge", "cooking"] },
  { id: "chant_mariage", emoji: "🎵", name: "Chant mariage", nameBa: "Orin igbeyawo", category: "SONG", symbols: ["🎵", "💒", "🥁"], energy: "high", structure: ["HOOK_1S", "MESSAGE", "END"], tags: ["song", "marriage"] },
  { id: "berceuse", emoji: "🌙", name: "Berceuse", nameBa: "Orin oorun", category: "SONG", symbols: ["🌙", "👶", "💤"], energy: "calm", structure: ["HOOK_1S", "MESSAGE", "END"], tags: ["song", "lullaby"] },
  { id: "proverbe", emoji: "🧓", name: "Sagesse anciens", nameBa: "Ọgbọn àgbà", category: "WISDOM", symbols: ["🧓", "💭", "📖"], energy: "calm", structure: ["HOOK_1S", "MESSAGE", "END"], tags: ["wisdom", "proverb"] },
  { id: "proverbe_travail", emoji: "👨‍🌾", name: "Proverbe travail", nameBa: "Owe iṣẹ", category: "WISDOM", symbols: ["👨‍🌾", "💪", "🌾"], energy: "medium", structure: ["HOOK_1S", "MESSAGE", "END"], tags: ["wisdom", "work"] },
];

const FILTERS = [
  { id: "none", name: "Original", nameBa: "Atilẹba", icon: "📷", css: "none" },
  { id: "beauty", name: "Beauté", nameBa: "Ẹwa", icon: "✨", css: "brightness(1.05) contrast(0.95) saturate(1.1) blur(0.3px)" },
  { id: "warm", name: "Chaud", nameBa: "Gbigbona", icon: "🔥", css: "sepia(0.3) saturate(1.4) brightness(1.05)" },
  { id: "cool", name: "Froid", nameBa: "Tutu", icon: "❄️", css: "hue-rotate(10deg) saturate(0.9) brightness(1.05)" },
  { id: "vivid", name: "Vif", nameBa: "Kikan", icon: "🌈", css: "saturate(1.8) contrast(1.2) brightness(1.05)" },
  { id: "vintage", name: "Vintage", nameBa: "Atijo", icon: "📻", css: "sepia(0.5) contrast(1.1) brightness(0.95)" },
  { id: "bw", name: "N&B", nameBa: "Dudu ati Funfun", icon: "🎬", css: "grayscale(1) contrast(1.2) brightness(1.05)" },
  { id: "dramatic", name: "Dramatique", nameBa: "Eru", icon: "🎭", css: "contrast(1.4) brightness(0.9) saturate(0.8)" },
] as const;

const MUSIC_TRACKS = [
  { id: "m1", emoji: "🎵", title: "Afro Vibes", titleBa: "Afro Vibes", duration: 120, energy: "high" as const },
  { id: "m2", emoji: "🥁", title: "Drum Groove", titleBa: "Ilu Groove", duration: 90, energy: "high" as const },
  { id: "m3", emoji: "🎹", title: "Chill Beats", titleBa: "Chill Beats", duration: 180, energy: "calm" as const },
  { id: "m4", emoji: "🎸", title: "Upbeat Dance", titleBa: "Dance Alakafo", duration: 60, energy: "high" as const },
  { id: "m5", emoji: "🎺", title: "Traditional", titleBa: "Ibile", duration: 150, energy: "medium" as const },
];

const STICKER_EMOJIS = ["✨", "🔥", "💯", "👏", "🎉", "❤️", "🙏", "💪", "👍", "⭐", "🌟", "💫", "🎊", "🎈", "🌈", "☀️", "🌙", "⚡", "💥", "✅", "📍", "🎯", "🚀", "💎"];

/** =========================================================
 *  COMPONENT
 *  ========================================================= */

interface TimelineEditorProps {
  segments: TimelineSegment[];
  onSegmentsChange: (segments: TimelineSegment[]) => void;
  onClose: () => void;
  onConfirm: (segments: TimelineSegment[]) => void;
  language?: "fr" | "ba";
}

type EditMode = "AUTO" | "EDITOR";
type Panel =
  | "blocks"
  | "template"
  | "theme"
  | "background"
  | "filter"
  | "music"
  | "stickers"
  | "beautify"
  | "effects"
  | "subtitles"
  | "graffiti"
  | "canvas"
  | "assist"
  | "uxmap"
  | null;

type EntryTab = "Graphics" | "Video" | "Story" | "Template" | "Live";

type AspectPreset = "9:16" | "1:1" | "16:9";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
function fmtTime(s: number) {
  const mm = Math.floor(s / 60);
  const ss = Math.floor(s % 60);
  return `${mm}:${String(ss).padStart(2, "0")}`;
}

function aspectToStyle(preset: AspectPreset) {
  if (preset === "9:16") return { aspectRatio: "9 / 16" as const };
  if (preset === "1:1") return { aspectRatio: "1 / 1" as const };
  return { aspectRatio: "16 / 9" as const };
}

function iconForSegmentType(type: TimelineSegment["type"]) {
  if (type === "video") return <Video className="h-4 w-4" />;
  if (type === "photo") return <ImageIcon className="h-4 w-4" />;
  return <Mic className="h-4 w-4" />;
}

const blockTypeLabels: Record<BlockType, { fr: string; ba: string; emoji: string }> = {
  HOOK_1S: { fr: "Accroche (1s)", ba: "Ifamọra", emoji: "🎣" },
  MESSAGE: { fr: "Message", ba: "Ifiranṣẹ", emoji: "💬" },
  PROOF: { fr: "Preuve/Démo", ba: "Ẹri", emoji: "✅" },
  END: { fr: "Fin/Appel", ba: "Ipari", emoji: "🎯" },
};

const energyLabels: Record<Energy, { fr: string; ba: string; emoji: string }> = {
  calm: { fr: "Calme", ba: "Tutu", emoji: "😌" },
  medium: { fr: "Moyen", ba: "Aarin", emoji: "🙂" },
  dynamic: { fr: "Dynamique", ba: "Yara", emoji: "⚡" },
};

const focusLabels: Record<Focus, { fr: string; ba: string; emoji: string }> = {
  face: { fr: "Visage", ba: "Oju", emoji: "🙂" },
  product: { fr: "Produit", ba: "Ọja", emoji: "🛍️" },
  hands: { fr: "Mains", ba: "Ọwọ", emoji: "✋" },
  full: { fr: "Plan large", ba: "Gbogbo", emoji: "🧍" },
};

export const TimelineEditorKuaishou: React.FC<TimelineEditorProps> = ({
  segments: initialSegments,
  onSegmentsChange,
  onClose,
  onConfirm,
  language = "fr",
}) => {
  const t = useCallback(
    (fr: string, ba: string) => (language === "ba" ? ba : fr),
    [language]
  );

  /** ============ STATE ============ */
  const [mode, setMode] = useState<EditMode>("AUTO");
  const [entryTab, setEntryTab] = useState<EntryTab>("Video");

  const [blocks, setBlocks] = useState<VideoBlock[]>([]);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [timelineTime, setTimelineTime] = useState(0); // 0..totalDuration
  const rafRef = useRef<number | null>(null);

  const [activePanel, setActivePanel] = useState<Panel>(null);
  const [showRightBar, setShowRightBar] = useState(true);
  const [isFullPreview, setIsFullPreview] = useState(false);

  // “Capture bar” (simulée en editor pour mapping complet)
  const [flashOn, setFlashOn] = useState(false);
  const [timerSec, setTimerSec] = useState(0);
  const [captureSpeed, setCaptureSpeed] = useState(1);
  const [lengthPreset, setLengthPreset] = useState<15 | 30 | 60>(30);
  const [isRecording, setIsRecording] = useState(false);

  // Assist
  const [challenge, setChallenge] = useState<string | null>(null);
  const [showShotTips, setShowShotTips] = useState(true);
  const [showCoverTips, setShowCoverTips] = useState(true);
  const [recommendedFilterOn, setRecommendedFilterOn] = useState(true);

  // AI/Template/Theme
  const [selectedCulturalTemplate, setSelectedCulturalTemplate] = useState<CulturalTemplate | null>(null);
  const [selectedTrendingTemplate, setSelectedTrendingTemplate] = useState<TrendingTemplate | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<ThemePack | null>(null);

  // Visual
  const [selectedBackground, setSelectedBackground] = useState<AIBackground>(AI_BACKGROUNDS[0]);
  const [selectedFilter, setSelectedFilter] = useState<(typeof FILTERS)[number]["id"]>("none");
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);

  // Audio
  const [selectedMusic, setSelectedMusic] = useState<(typeof MUSIC_TRACKS)[number] | null>(null);
  const [volume, setVolume] = useState(100);
  const [muted, setMuted] = useState(false);

  // Stickers (emoji overlays)
  const [stickers, setStickers] = useState<TextOverlay[]>([]);
  const [selectedStickerId, setSelectedStickerId] = useState<string | null>(null);

  // Magic
  const [magicEnabled, setMagicEnabled] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(MAGIC_FEATURES.map((m) => [m.id, m.id === "auto_recommend"]))
  );

  // Subtitles (placeholder UX)
  const [subtitlesOn, setSubtitlesOn] = useState(false);
  const [subtitleStyle, setSubtitleStyle] = useState<"classic" | "karaoke" | "bold">("karaoke");

  // Effects (placeholder UX)
  const [effectIntensity, setEffectIntensity] = useState(35);

  // Canvas
  const [aspect, setAspect] = useState<AspectPreset>("9:16");
  const [multiScreen, setMultiScreen] = useState(false);
  const [reframe, setReframe] = useState<"auto" | "center">("auto");

  // Generation
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiVariant, setAiVariant] = useState<"A" | "B" | "C">("A");

  /** ============ REFS ============ */
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  /** ============ INIT BLOCKS ============ */
  useEffect(() => {
    if (!initialSegments?.length) return;
    setBlocks((prev) => {
      if (prev.length) return prev;
      const newBlocks: VideoBlock[] = initialSegments.map((seg, idx) => {
        let blockType: BlockType = "MESSAGE";
        if (idx === 0) blockType = "HOOK_1S";
        else if (idx === initialSegments.length - 1) blockType = "END";
        else if (idx === Math.floor(initialSegments.length / 2)) blockType = "PROOF";
        return { id: seg.id, type: blockType, segment: seg, energy: "medium", focus: "full" };
      });
      setSelectedBlockId(newBlocks[0]?.id ?? null);
      return newBlocks;
    });
  }, [initialSegments]);

  /** ============ TIMELINE MODEL ============ */
  const timelineModel = useMemo(() => {
    const items = blocks.map((b) => ({
      blockId: b.id,
      segId: b.segment.id,
      duration: Math.max(0.01, b.segment.duration || (b.segment.endTime - b.segment.startTime) || 0.01),
    }));
    let cursor = 0;
    const ranges = items.map((it) => {
      const start = cursor;
      const end = cursor + it.duration;
      cursor = end;
      return { ...it, start, end };
    });
    return { total: cursor, ranges };
  }, [blocks]);

  const totalDuration = timelineModel.total;

  const activeRange = useMemo(() => {
    const t = clamp(timelineTime, 0, Math.max(0, totalDuration));
    return timelineModel.ranges.find((r) => t >= r.start && t < r.end) || timelineModel.ranges[timelineModel.ranges.length - 1] || null;
  }, [timelineTime, totalDuration, timelineModel.ranges]);

  const selectedBlock = useMemo(() => blocks.find((b) => b.id === selectedBlockId) || null, [blocks, selectedBlockId]);

  // Keep selected block aligned with timeline position (auto)
  useEffect(() => {
    if (!activeRange) return;
    if (selectedBlockId !== activeRange.blockId) setSelectedBlockId(activeRange.blockId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRange?.blockId]);

  /** ============ PREVIEW URL (video/audio/photo) ============ */
  const buildPreviewUrl = useCallback((seg: TimelineSegment | null) => {
    if (!seg) return null;
    const url = URL.createObjectURL(seg.blob);
    return url;
  }, []);

  const setPreviewSource = useCallback(
    (seg: TimelineSegment | null) => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
      if (!seg) return;

      const url = buildPreviewUrl(seg);
      if (!url) return;
      previewUrlRef.current = url;

      if (seg.type === "video" && videoRef.current) {
        videoRef.current.src = url;
      }
      if (seg.type === "audio" && audioRef.current) {
        audioRef.current.src = url;
      }
    },
    [buildPreviewUrl]
  );

  // Update preview when selected block changes
  useEffect(() => {
    setPreviewSource(selectedBlock?.segment ?? null);
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
    };
  }, [selectedBlock, setPreviewSource]);

  /** ============ FILTER / BACKGROUND STYLES ============ */
  const filterCss = useMemo(() => {
    const base = FILTERS.find((f) => f.id === selectedFilter)?.css ?? "none";
    const adj = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
    if (base === "none") return adj;
    return `${base} ${adj}`;
  }, [selectedFilter, brightness, contrast, saturation]);

  const backgroundAnimStyle = useMemo(() => {
    if (!isPlaying) return {};
    const pulse = selectedBackground.reactivity.voice_pulse || 0.4;
    const breath = selectedBackground.reactivity.breath_flow || 0.5;
    return {
      animation: `ttPulse ${2 / pulse}s ease-in-out infinite, ttBreathe ${4 / breath}s ease-in-out infinite`,
    } as React.CSSProperties;
  }, [isPlaying, selectedBackground]);

  /** ============ PLAYBACK (RAF sync) ============ */
  const stopRaf = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  }, []);

  const syncMediaToTimeline = useCallback(
    (tpos: number) => {
      if (!activeRange) return;

      const within = clamp(tpos - activeRange.start, 0, Math.max(0, activeRange.duration - 0.001));

      // For video/audio: seek within the selected segment (assume segment is already a trimmed blob)
      if (selectedBlock?.segment.type === "video" && videoRef.current) {
        const v = videoRef.current;
        if (Number.isFinite(within) && Math.abs(v.currentTime - within) > 0.12) v.currentTime = within;
      } else if (selectedBlock?.segment.type === "audio" && audioRef.current) {
        const a = audioRef.current;
        if (Number.isFinite(within) && Math.abs(a.currentTime - within) > 0.12) a.currentTime = within;
      }
    },
    [activeRange, selectedBlock]
  );

  const tick = useCallback(() => {
    setTimelineTime((prev) => {
      const next = prev + 1 / 60; // ~60fps logical timeline step
      if (next >= totalDuration) return 0;
      return next;
    });
    rafRef.current = requestAnimationFrame(tick);
  }, [totalDuration]);

  useEffect(() => {
    if (!isPlaying) {
      stopRaf();
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => stopRaf();
  }, [isPlaying, tick, stopRaf]);

  // When timelineTime changes, keep media synced
  useEffect(() => {
    if (!isPlaying) return;
    syncMediaToTimeline(timelineTime);
  }, [timelineTime, isPlaying, syncMediaToTimeline]);

  // Play/pause actual media
  useEffect(() => {
    const seg = selectedBlock?.segment;
    if (!seg) return;

    if (seg.type === "video" && videoRef.current) {
      videoRef.current.muted = muted || seg.isMuted || false;
      videoRef.current.playbackRate = captureSpeed;
      videoRef.current.volume = clamp(volume / 100, 0, 1);
      if (isPlaying) videoRef.current.play().catch(() => {});
      else videoRef.current.pause();
    }

    if (seg.type === "audio" && audioRef.current) {
      audioRef.current.muted = muted || seg.isMuted || false;
      audioRef.current.playbackRate = captureSpeed;
      audioRef.current.volume = clamp(volume / 100, 0, 1);
      if (isPlaying) audioRef.current.play().catch(() => {});
      else audioRef.current.pause();
    }
  }, [isPlaying, muted, volume, captureSpeed, selectedBlock]);

  const togglePlay = useCallback(() => setIsPlaying((p) => !p), []);

  const seekTimeline = useCallback(
    (newTime: number) => {
      const tpos = clamp(newTime, 0, Math.max(0, totalDuration));
      setTimelineTime(tpos);
      syncMediaToTimeline(tpos);
    },
    [totalDuration, syncMediaToTimeline]
  );

  /** ============ ACTIONS (blocks) ============ */
  const handleRegenerateBlock = useCallback((blockId: string) => {
    setIsGenerating(true);
    window.setTimeout(() => {
      setBlocks((prev) =>
        prev.map((b) => {
          if (b.id !== blockId) return b;
          const energies: Energy[] = ["calm", "medium", "dynamic"];
          const newEnergy = energies[Math.floor(Math.random() * energies.length)];
          return { ...b, energy: newEnergy };
        })
      );
      setIsGenerating(false);
    }, 900);
  }, []);

  const handleChangeBlockEnergy = useCallback((blockId: string, energy: Energy) => {
    setBlocks((prev) => prev.map((b) => (b.id === blockId ? { ...b, energy } : b)));
  }, []);

  const handleChangeBlockFocus = useCallback((blockId: string, focus: Focus) => {
    setBlocks((prev) => prev.map((b) => (b.id === blockId ? { ...b, focus } : b)));
  }, []);

  const handleSplitBlock = useCallback(
    (blockId: string) => {
      const idx = blocks.findIndex((b) => b.id === blockId);
      if (idx < 0) return;
      const block = blocks[idx];
      const dur = Math.max(0.2, block.segment.duration || (block.segment.endTime - block.segment.startTime));
      const mid = dur / 2;

      const seg1: TimelineSegment = { ...block.segment, id: `${block.segment.id}_1`, duration: mid, startTime: 0, endTime: mid };
      const seg2: TimelineSegment = { ...block.segment, id: `${block.segment.id}_2`, duration: dur - mid, startTime: 0, endTime: dur - mid };

      const b1: VideoBlock = { ...block, id: `${block.id}_1`, segment: seg1 };
      const b2: VideoBlock = { ...block, id: `${block.id}_2`, segment: seg2, type: "MESSAGE" };

      const next = [...blocks];
      next.splice(idx, 1, b1, b2);
      setBlocks(next);
      setSelectedBlockId(b1.id);
    },
    [blocks]
  );

  const handleDeleteBlock = useCallback(
    (blockId: string) => {
      setBlocks((prev) => prev.filter((b) => b.id !== blockId));
      setSelectedBlockId((prevSel) => {
        if (prevSel !== blockId) return prevSel;
        const remaining = blocks.filter((b) => b.id !== blockId);
        return remaining[0]?.id ?? null;
      });
    },
    [blocks]
  );

  const handleDuplicateBlock = useCallback(
    (blockId: string) => {
      const idx = blocks.findIndex((b) => b.id === blockId);
      if (idx < 0) return;
      const block = blocks[idx];
      const copy: VideoBlock = {
        ...block,
        id: `${block.id}_copy_${Date.now()}`,
        segment: { ...block.segment, id: `${block.segment.id}_copy_${Date.now()}` },
      };
      const next = [...blocks];
      next.splice(idx + 1, 0, copy);
      setBlocks(next);
    },
    [blocks]
  );

  /** ============ ASSIST / AUTO RECOMMEND ============ */
  const applyRecommendations = useCallback(
    (rec?: { filterId?: string; backgroundId?: string; musicId?: string; speed?: number; energy?: Energy }) => {
      if (!rec) return;

      if (rec.speed) setCaptureSpeed(clamp(rec.speed, 0.5, 2));
      if (rec.filterId) setSelectedFilter(rec.filterId as any);

      if (rec.backgroundId) {
        const bg = AI_BACKGROUNDS.find((b) => b.id === rec.backgroundId);
        if (bg) setSelectedBackground(bg);
      }
      if (rec.musicId) {
        const m = MUSIC_TRACKS.find((x) => x.id === rec.musicId);
        if (m) setSelectedMusic(m);
      }
      if (rec.energy && selectedBlock) {
        handleChangeBlockEnergy(selectedBlock.id, rec.energy);
      }
    },
    [handleChangeBlockEnergy, selectedBlock]
  );

  // Apply when template/theme changes (if recommendedFilterOn)
  useEffect(() => {
    if (!recommendedFilterOn) return;

    if (selectedTrendingTemplate) applyRecommendations(selectedTrendingTemplate.recommended);
    if (selectedTheme) applyRecommendations(selectedTheme.recommended);
  }, [selectedTrendingTemplate, selectedTheme, recommendedFilterOn, applyRecommendations]);

  const handleAutoGenerate = useCallback(() => {
    setIsGenerating(true);
    window.setTimeout(() => {
      setIsGenerating(false);
      // simulate A/B/C (keeps existing media, changes styling)
      const next = (aiVariant === "A" ? "B" : aiVariant === "B" ? "C" : "A") as "A" | "B" | "C";
      setAiVariant(next);

      if (next === "A") {
        setBrightness(102);
        setContrast(100);
        setSaturation(105);
      } else if (next === "B") {
        setBrightness(98);
        setContrast(112);
        setSaturation(118);
      } else {
        setBrightness(105);
        setContrast(96);
        setSaturation(110);
      }
    }, 1100);
  }, [aiVariant]);

  /** ============ STICKERS ============ */
  const addSticker = useCallback(() => {
    const emoji = STICKER_EMOJIS[Math.floor(Math.random() * STICKER_EMOJIS.length)];
    const s: TextOverlay = {
      id: `stk_${Date.now()}`,
      emoji,
      position: { x: 50, y: 35 },
      scale: 1,
      rotation: 0,
      startTime: timelineTime,
      endTime: timelineTime + 3,
    };
    setStickers((prev) => [...prev, s]);
    setSelectedStickerId(s.id);
  }, [timelineTime]);

  const removeSticker = useCallback(() => {
    if (!selectedStickerId) return;
    setStickers((prev) => prev.filter((s) => s.id !== selectedStickerId));
    setSelectedStickerId(null);
  }, [selectedStickerId]);

  /** ============ ENHANCE (one-click) ============ */
  const enhanceOneClick = useCallback(() => {
    // simple “IA assist” preset, tuned by variant
    if (aiVariant === "A") {
      setBrightness(104);
      setContrast(104);
      setSaturation(112);
    } else if (aiVariant === "B") {
      setBrightness(100);
      setContrast(114);
      setSaturation(120);
    } else {
      setBrightness(106);
      setContrast(102);
      setSaturation(114);
    }
  }, [aiVariant]);

  /** ============ CONFIRM ============ */
  const handleConfirm = useCallback(() => {
    const updatedSegments = blocks.map((b) => ({
      ...b.segment,
      filter: selectedFilter,
      volume,
      isMuted: muted,
    }));
    onSegmentsChange(updatedSegments);
    onConfirm(updatedSegments);
  }, [blocks, muted, onConfirm, onSegmentsChange, selectedFilter, volume]);

  /** ============ FILTER SWIPE (UX gesture) ============ */
  const swipeRef = useRef<{ x0: number; y0: number; active: boolean } | null>(null);

  const setNextFilter = useCallback((dir: -1 | 1) => {
    const idx = FILTERS.findIndex((f) => f.id === selectedFilter);
    const next = clamp(idx + dir, 0, FILTERS.length - 1);
    setSelectedFilter(FILTERS[next].id);
  }, [selectedFilter]);

  const onPreviewPointerDown = useCallback((e: React.PointerEvent) => {
    swipeRef.current = { x0: e.clientX, y0: e.clientY, active: true };
  }, []);
  const onPreviewPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!swipeRef.current?.active) return;
      const dx = e.clientX - swipeRef.current.x0;
      if (Math.abs(dx) > 45) {
        swipeRef.current.active = false;
        setNextFilter(dx > 0 ? 1 : -1);
      }
    },
    [setNextFilter]
  );
  const onPreviewPointerUp = useCallback(() => {
    if (swipeRef.current) swipeRef.current.active = false;
  }, []);

  /** ============ SHOT/COVER TIPS (text overlay) ============ */
  const tips = useMemo(() => {
    const base = selectedCulturalTemplate
      ? `Structure: ${selectedCulturalTemplate.structure.map((k) => blockTypeLabels[k][language]).join(" → ")}`
      : selectedTrendingTemplate
        ? `Template: ${selectedTrendingTemplate.name} · ${selectedTrendingTemplate.desc}`
        : selectedTheme
          ? `Thème: ${selectedTheme.name} · ${selectedTheme.includes.join(", ")}`
          : `Astuce: commence par une accroche ultra courte + un geste clair.`;

    const shot = selectedCulturalTemplate?.category === "MARKET"
      ? "🎬 Shot tips: montre produit + prix + bénéfice en 3 plans."
      : selectedCulturalTemplate?.category === "ALERT"
        ? "🎬 Shot tips: plan large (preuve) + texte simple + appel à partager."
        : "🎬 Shot tips: 1 action par plan, pas trop de texte.";

    const cover = selectedCulturalTemplate?.category === "WISDOM"
      ? "🖼️ Cover tips: 3 mots max, contraste fort, emoji unique."
      : "🖼️ Cover tips: visage/objet centré, titre très court.";

    return { base, shot, cover };
  }, [selectedCulturalTemplate, selectedTrendingTemplate, selectedTheme, language]);

  /** ============ RENDER HELPERS ============ */
  const RightActionButton: React.FC<{
    icon: React.ReactNode;
    label: string;
    active?: boolean;
    onClick: () => void;
    badge?: string;
  }> = ({ icon, label, active, onClick, badge }) => (
    <button
      onClick={onClick}
      className={[
        "relative w-12 h-12 rounded-2xl flex items-center justify-center",
        "backdrop-blur bg-white/10 border border-white/10 hover:bg-white/15",
        active ? "ring-2 ring-white/40" : "",
      ].join(" ")}
      title={label}
      type="button"
    >
      {icon}
      {badge ? (
        <span className="absolute -top-1 -right-1 text-[10px] px-1.5 py-0.5 rounded-full bg-orange-500/90 text-white">
          {badge}
        </span>
      ) : null}
    </button>
  );

  const PanelShell: React.FC<{ title: string; icon?: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => (
    <div className="rounded-3xl bg-black/30 border border-white/10 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center">
            {icon ?? <Layers className="h-4 w-4" />}
          </div>
          <div className="text-white font-semibold">{title}</div>
        </div>
        <button
          className="h-9 w-9 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center text-white/80 hover:text-white"
          onClick={() => setActivePanel(null)}
          type="button"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {children}
    </div>
  );

  /** =========================================================
   *  UI
   *  ========================================================= */
  return (
    <div className="fixed inset-0 z-[80] bg-black/80 backdrop-blur">
      <style>{`
        @keyframes ttPulse { 0%,100%{ transform: scale(1); opacity:.95 } 50%{ transform: scale(1.02); opacity:1 } }
        @keyframes ttBreathe { 0%,100%{ filter: brightness(1) } 50%{ filter: brightness(1.07) } }
      `}</style>

      <div className="absolute inset-0 flex flex-col">
        {/* TOP BAR */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <button
              className="h-10 w-10 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center text-white"
              onClick={onClose}
              type="button"
              title={t("Fermer", "Pa")}
            >
              <X className="h-5 w-5" />
            </button>

            <div className="text-white">
              <div className="text-sm font-semibold">
                {t("Studio Créatif (Kuaishou-like)", "Ile-iṣẹ Ẹda")}
                <span className="ml-2 text-xs text-white/70">AI {aiVariant}</span>
              </div>
              <div className="text-xs text-white/60">
                {t("Guidé + IA proactive (templates, thèmes, canvas)", "Itọsọna + AI (awọn awoṣe, akori, canvas)")}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="h-10 px-3 rounded-2xl bg-white/10 border border-white/10 text-white text-sm flex items-center gap-2"
              onClick={() => setMode((m) => (m === "AUTO" ? "EDITOR" : "AUTO"))}
              type="button"
              title={t("Changer de mode", "Yi ipo")}
            >
              <Repeat2 className="h-4 w-4" />
              {mode === "AUTO" ? t("Auto", "Aifọwọyi") : t("Éditeur", "Olootu")}
            </button>

            <button
              className="h-10 w-10 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center text-white"
              onClick={() => setActivePanel("uxmap")}
              type="button"
              title="UX Mapping"
            >
              <BookOpen className="h-4 w-4" />
            </button>

            <button
              className="h-10 w-10 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center text-white"
              onClick={() => setActivePanel("assist")}
              type="button"
              title={t("Assistance créative", "Iranlọwọ ẹda")}
            >
              <Eye className="h-4 w-4" />
            </button>

            <button
              className="h-10 w-10 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center text-white"
              onClick={() => setActivePanel("canvas")}
              type="button"
              title="Canvas"
            >
              <RectangleHorizontal className="h-4 w-4" />
            </button>

            <button
              className="h-10 px-3 rounded-2xl bg-orange-500/90 hover:bg-orange-500 text-white text-sm flex items-center gap-2"
              onClick={handleConfirm}
              type="button"
            >
              <Check className="h-4 w-4" />
              {t("Publier", "Tẹjade")}
            </button>
          </div>
        </div>

        {/* MAIN */}
        <div className="flex-1 min-h-0 flex gap-4 px-4 pb-4">
          {/* LEFT: Timeline + Panels */}
          <div className="w-[420px] max-w-[420px] min-w-[360px] flex flex-col gap-3 min-h-0">
            {/* Entry navigation (bottom tab model, shown as header for mapping coherence) */}
            <div className="rounded-3xl bg-black/30 border border-white/10 p-3">
              <div className="flex items-center justify-between">
                <div className="text-white font-semibold text-sm">{t("Entrée & Navigation (Création)", "Wiwọle & Lilọ kiri")}</div>
                <div className="text-xs text-white/60">{t("Mapping complet inclus", "Mapping wa")}</div>
              </div>
              <div className="mt-3 grid grid-cols-5 gap-2">
                {(["Graphics", "Video", "Story", "Template", "Live"] as EntryTab[]).map((tab) => {
                  const active = entryTab === tab;
                  const icon =
                    tab === "Graphics" ? <ImageIcon className="h-4 w-4" /> :
                      tab === "Video" ? <Camera className="h-4 w-4" /> :
                        tab === "Story" ? <Activity className="h-4 w-4" /> :
                          tab === "Template" ? <Wand2 className="h-4 w-4" /> :
                            <Video className="h-4 w-4" />;
                  return (
                    <button
                      key={tab}
                      onClick={() => setEntryTab(tab)}
                      className={[
                        "h-10 rounded-2xl flex items-center justify-center gap-2 text-xs",
                        "border border-white/10",
                        active ? "bg-white/15 text-white" : "bg-white/5 text-white/70 hover:bg-white/10",
                      ].join(" ")}
                      type="button"
                    >
                      {icon}
                      <span>{tab}</span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-3 flex items-center justify-center">
                <div className="h-12 w-12 rounded-full bg-white/10 border border-white/10 flex items-center justify-center">
                  <Plus className="h-5 w-5 text-white" />
                </div>
              </div>
            </div>

            {/* Timeline list */}
            <div className="rounded-3xl bg-black/30 border border-white/10 p-3 min-h-0 flex flex-col">
              <div className="flex items-center justify-between">
                <div className="text-white font-semibold text-sm">{t("Timeline (Blocs)", "Aago (Awọn bulọọki)")}</div>
                <div className="text-xs text-white/60">{t("Glisser/cliquer pour sélectionner", "Tẹ lati yan")}</div>
              </div>

              <div className="mt-3 overflow-auto pr-1">
                <div className="space-y-2">
                  {blocks.map((b) => {
                    const isSel = b.id === selectedBlockId;
                    const label = blockTypeLabels[b.type][language];
                    const energy = energyLabels[b.energy][language];
                    const focus = b.focus ? focusLabels[b.focus][language] : t("Auto", "Aifọwọyi");
                    return (
                      <button
                        key={b.id}
                        className={[
                          "w-full text-left rounded-2xl p-3 border",
                          isSel ? "bg-white/15 border-white/25" : "bg-white/5 border-white/10 hover:bg-white/10",
                        ].join(" ")}
                        onClick={() => setSelectedBlockId(b.id)}
                        type="button"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="text-white text-sm font-semibold flex items-center gap-2">
                              <span>{blockTypeLabels[b.type].emoji}</span>
                              <span>{label}</span>
                              <span className="text-xs text-white/60 flex items-center gap-1">
                                {iconForSegmentType(b.segment.type)}
                                <span>{t(b.segment.type, b.segment.type)}</span>
                              </span>
                            </div>
                            <div className="mt-1 text-xs text-white/70">
                              {t("Durée", "Akoko")}: {fmtTime(b.segment.duration)} · {t("Énergie", "Agbara")}: {energy} · {t("Focus", "Ifojusi")}: {focus}
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              className="h-8 w-8 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center text-white/80 hover:text-white"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleRegenerateBlock(b.id);
                              }}
                              type="button"
                              title={t("Régénérer (IA)", "Tun ṣe (AI)")}
                            >
                              <RefreshCw className="h-4 w-4" />
                            </button>
                            <button
                              className="h-8 w-8 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center text-white/80 hover:text-white"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleDuplicateBlock(b.id);
                              }}
                              type="button"
                              title={t("Dupliquer", "Daakọ")}
                            >
                              <Copy className="h-4 w-4" />
                            </button>
                            <button
                              className="h-8 w-8 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center text-white/80 hover:text-white"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleDeleteBlock(b.id);
                              }}
                              type="button"
                              title={t("Supprimer", "Pa rẹ")}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        {isSel && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            <button
                              className="h-9 px-3 rounded-2xl bg-white/10 border border-white/10 text-white text-xs flex items-center gap-2"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleSplitBlock(b.id);
                              }}
                              type="button"
                            >
                              <Scissors className="h-4 w-4" />
                              {t("Split", "Pin")}
                            </button>

                            {/* Energy */}
                            {(["calm", "medium", "dynamic"] as Energy[]).map((en) => (
                              <button
                                key={en}
                                className={[
                                  "h-9 px-3 rounded-2xl border text-xs flex items-center gap-2",
                                  b.energy === en ? "bg-white/15 border-white/25 text-white" : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10",
                                ].join(" ")}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleChangeBlockEnergy(b.id, en);
                                }}
                                type="button"
                              >
                                <span>{energyLabels[en].emoji}</span>
                                <span>{energyLabels[en][language]}</span>
                              </button>
                            ))}

                            {/* Focus */}
                            {(["face", "product", "hands", "full"] as Focus[]).map((fc) => (
                              <button
                                key={fc}
                                className={[
                                  "h-9 px-3 rounded-2xl border text-xs flex items-center gap-2",
                                  b.focus === fc ? "bg-white/15 border-white/25 text-white" : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10",
                                ].join(" ")}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleChangeBlockFocus(b.id, fc);
                                }}
                                type="button"
                              >
                                <span>{focusLabels[fc].emoji}</span>
                                <span>{focusLabels[fc][language]}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Timeline scrub */}
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-white/70">
                  <div>{fmtTime(timelineTime)}</div>
                  <div>{fmtTime(totalDuration)}</div>
                </div>
                <input
                  className="w-full mt-2"
                  type="range"
                  min={0}
                  max={Math.max(0, totalDuration)}
                  step={0.01}
                  value={timelineTime}
                  onChange={(e) => seekTimeline(Number(e.target.value))}
                />
                <div className="mt-2 flex items-center gap-2">
                  <button
                    className="h-10 w-10 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center text-white"
                    onClick={() => seekTimeline(Math.max(0, timelineTime - 2))}
                    type="button"
                    title={t("Reculer", "Pada")}
                  >
                    <SkipBack className="h-4 w-4" />
                  </button>

                  <button
                    className="h-10 w-10 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center text-white"
                    onClick={togglePlay}
                    type="button"
                  >
                    {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                  </button>

                  <button
                    className="h-10 w-10 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center text-white"
                    onClick={() => seekTimeline(Math.min(totalDuration, timelineTime + 2))}
                    type="button"
                    title={t("Avancer", "Lọ siwaju")}
                  >
                    <SkipForward className="h-4 w-4" />
                  </button>

                  <button
                    className="h-10 px-3 rounded-2xl bg-white/10 border border-white/10 text-white text-sm flex items-center gap-2"
                    onClick={handleAutoGenerate}
                    type="button"
                  >
                    <Wand2 className="h-4 w-4" />
                    {isGenerating ? t("Génération…", "N ṣe…") : t("Auto (A/B/C)", "Auto (A/B/C)")}
                  </button>

                  <div className="ml-auto flex items-center gap-2">
                    <button
                      className="h-10 w-10 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center text-white"
                      onClick={() => setMuted((m) => !m)}
                      type="button"
                      title={t("Mute", "Dákẹ")}
                    >
                      {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                    </button>

                    <button
                      className="h-10 w-10 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center text-white"
                      onClick={() => setIsFullPreview((f) => !f)}
                      type="button"
                      title={t("Plein écran", "Ekran kikun")}
                    >
                      {isFullPreview ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick controls (capture mapping) */}
            <div className="rounded-3xl bg-black/30 border border-white/10 p-3">
              <div className="flex items-center justify-between">
                <div className="text-white font-semibold text-sm">{t("Capture (mapping barre droite)", "Gbigba (map)")}</div>
                <div className="text-xs text-white/60">{t("Simulé en mode éditeur", "Afiṣe")}</div>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                <button
                  className={`h-10 rounded-2xl border flex items-center justify-center gap-2 text-xs ${flashOn ? "bg-white/15 border-white/25 text-white" : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"}`}
                  onClick={() => setFlashOn((v) => !v)}
                  type="button"
                >
                  <Flashlight className="h-4 w-4" />
                  Flash
                </button>

                <button
                  className={`h-10 rounded-2xl border flex items-center justify-center gap-2 text-xs ${timerSec ? "bg-white/15 border-white/25 text-white" : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"}`}
                  onClick={() => setTimerSec((s) => (s === 0 ? 3 : s === 3 ? 5 : 0))}
                  type="button"
                >
                  <Timer className="h-4 w-4" />
                  {t("Timer", "Aago")} {timerSec ? `${timerSec}s` : "Off"}
                </button>

                <button
                  className={`h-10 rounded-2xl border flex items-center justify-center gap-2 text-xs ${isRecording ? "bg-red-500/30 border-red-500/40 text-white" : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"}`}
                  onClick={() => setIsRecording((r) => !r)}
                  type="button"
                >
                  <div className={`h-2.5 w-2.5 rounded-full ${isRecording ? "bg-red-400" : "bg-white/40"}`} />
                  Recording
                </button>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-2xl bg-white/5 border border-white/10 p-3">
                  <div className="text-xs text-white/70 flex items-center gap-2">
                    <Gauge className="h-4 w-4" /> Speed
                  </div>
                  <input
                    className="w-full mt-2"
                    type="range"
                    min={0.5}
                    max={2}
                    step={0.05}
                    value={captureSpeed}
                    onChange={(e) => setCaptureSpeed(Number(e.target.value))}
                  />
                  <div className="text-xs text-white/60 mt-1">{captureSpeed.toFixed(2)}x</div>
                </div>

                <div className="rounded-2xl bg-white/5 border border-white/10 p-3">
                  <div className="text-xs text-white/70 flex items-center gap-2">
                    <Timer className="h-4 w-4" /> Length
                  </div>
                  <div className="mt-2 flex gap-2">
                    {[15, 30, 60].map((s) => (
                      <button
                        key={s}
                        className={`h-9 flex-1 rounded-2xl border text-xs ${lengthPreset === s ? "bg-white/15 border-white/25 text-white" : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"}`}
                        onClick={() => setLengthPreset(s as any)}
                        type="button"
                      >
                        {s}s
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CENTER: Preview */}
          <div className="flex-1 min-w-0 relative">
            <div
              className={[
                "relative mx-auto h-full max-h-[calc(100vh-140px)]",
                isFullPreview ? "w-full" : "w-[520px]",
                "rounded-[28px] overflow-hidden border border-white/10",
                "bg-gradient-to-b",
                selectedBackground.gradient,
              ].join(" ")}
              style={{ ...(aspectToStyle(aspect)), ...backgroundAnimStyle }}
              onPointerDown={onPreviewPointerDown}
              onPointerMove={onPreviewPointerMove}
              onPointerUp={onPreviewPointerUp}
            >
              {/* Pattern overlay */}
              <div className="absolute inset-0 opacity-25 pointer-events-none">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,.20)_1px,transparent_0)] [background-size:18px_18px]" />
              </div>

              {/* Assist overlays */}
              <AnimatePresence>
                {activePanel !== "uxmap" && (
                  <>
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2"
                    >
                      <div className="flex flex-wrap gap-2">
                        {challenge ? (
                          <span className="px-3 py-1 rounded-full bg-orange-500/80 text-white text-xs flex items-center gap-2">
                            <FlameIcon />
                            {challenge}
                          </span>
                        ) : null}

                        {selectedMusic ? (
                          <span className="px-3 py-1 rounded-full bg-white/10 border border-white/10 text-white text-xs flex items-center gap-2">
                            <Music className="h-3.5 w-3.5" />
                            {selectedMusic.emoji} {selectedMusic.title}
                          </span>
                        ) : null}

                        {selectedBlock?.segment.type === "audio" ? (
                          <span className="px-3 py-1 rounded-full bg-white/10 border border-white/10 text-white text-xs flex items-center gap-2">
                            <Activity className="h-3.5 w-3.5" />
                            {t("Pure Music", "Orin nikan")}
                          </span>
                        ) : null}

                        <span className="px-3 py-1 rounded-full bg-white/10 border border-white/10 text-white text-xs flex items-center gap-2">
                          <Filter className="h-3.5 w-3.5" />
                          {FILTERS.find((f) => f.id === selectedFilter)?.name ?? "Filter"}
                          <span className="text-white/60">{t("(swipe ⇆)", "(swipe ⇆)")}</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          className="h-10 w-10 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center text-white"
                          onClick={() => setShowRightBar((s) => !s)}
                          type="button"
                          title={t("Barre outils", "Igi irinṣẹ")}
                        >
                          <Settings className="h-4 w-4" />
                        </button>
                      </div>
                    </motion.div>

                    {(showShotTips || showCoverTips) && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute bottom-4 left-4 right-4 space-y-2"
                      >
                        <div className="rounded-2xl bg-black/35 border border-white/10 p-3 text-white text-sm">
                          <div className="text-xs text-white/70">{t("Inspiring", "Imọran")}</div>
                          <div className="mt-1">{tips.base}</div>
                        </div>

                        {showShotTips ? (
                          <div className="rounded-2xl bg-black/35 border border-white/10 p-3 text-white text-sm">
                            <div className="text-xs text-white/70">{t("Shot tips", "Itọsọna shot")}</div>
                            <div className="mt-1">{tips.shot}</div>
                          </div>
                        ) : null}

                        {showCoverTips ? (
                          <div className="rounded-2xl bg-black/35 border border-white/10 p-3 text-white text-sm">
                            <div className="text-xs text-white/70">{t("Cover tips", "Itọsọna cover")}</div>
                            <div className="mt-1">{tips.cover}</div>
                          </div>
                        ) : null}
                      </motion.div>
                    )}
                  </>
                )}
              </AnimatePresence>

              {/* Multi-screen layout (simple 2-up for demo) */}
              <div className={`absolute inset-0 ${multiScreen ? "grid grid-cols-2 gap-1 p-1" : "p-0"}`}>
                {[0, 1].map((idx) => (
                  <div key={idx} className={`relative ${multiScreen ? "rounded-2xl overflow-hidden" : "rounded-none"} bg-black/20`}>
                    {/* Media layer */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      {selectedBlock?.segment.type === "video" ? (
                        <video
                          ref={idx === 0 ? videoRef : undefined}
                          className="h-full w-full object-cover"
                          style={{ filter: filterCss }}
                          playsInline
                          muted
                        />
                      ) : selectedBlock?.segment.type === "audio" ? (
                        <div className="h-full w-full flex items-center justify-center" style={{ filter: filterCss }}>
                          <div className="h-48 w-48 rounded-full border border-white/20 bg-white/10 flex items-center justify-center">
                            <div className="h-40 w-40 rounded-full bg-white/10 border border-white/15 flex items-center justify-center animate-spin [animation-duration:3.5s]">
                              <div className="h-3 w-3 rounded-full bg-white/70" />
                            </div>
                          </div>
                          <audio ref={idx === 0 ? audioRef : undefined} />
                        </div>
                      ) : (
                        <div className="h-full w-full flex items-center justify-center" style={{ filter: filterCss }}>
                          <div className="text-white/80 text-sm flex items-center gap-2">
                            <ImageIcon className="h-4 w-4" />
                            {t("Photo", "Fọto")}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Stickers layer */}
                    <div className="absolute inset-0 pointer-events-none">
                      {stickers
                        .filter((s) => timelineTime >= s.startTime && timelineTime <= s.endTime)
                        .map((s) => (
                          <div
                            key={s.id}
                            className="absolute text-4xl drop-shadow"
                            style={{
                              left: `${s.position.x}%`,
                              top: `${s.position.y}%`,
                              transform: `translate(-50%, -50%) scale(${s.scale}) rotate(${s.rotation}deg)`,
                            }}
                          >
                            {s.emoji}
                          </div>
                        ))}
                    </div>

                    {/* Subtitles layer (placeholder) */}
                    {subtitlesOn ? (
                      <div className="absolute bottom-16 left-4 right-4 flex justify-center pointer-events-none">
                        <div
                          className={[
                            "px-4 py-2 rounded-2xl border",
                            subtitleStyle === "karaoke"
                              ? "bg-black/40 border-white/10 text-white font-semibold"
                              : subtitleStyle === "bold"
                                ? "bg-black/55 border-white/10 text-white font-extrabold"
                                : "bg-black/35 border-white/10 text-white",
                          ].join(" ")}
                        >
                          {subtitleStyle === "karaoke" ? "🎤 Sous-titres (karaoke)" : "Sous-titres"}
                        </div>
                      </div>
                    ) : null}

                    {/* Reframe indicator */}
                    <div className="absolute bottom-3 right-3 text-[11px] px-2 py-1 rounded-full bg-white/10 border border-white/10 text-white/70">
                      {t("Reframe", "Reframe")}: {reframe}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT TOOLBAR (post-capture vertical) */}
            <AnimatePresence>
              {showRightBar && (
                <motion.div
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 16 }}
                  className="absolute top-0 right-0 h-full flex items-center"
                >
                  <div className="mr-2 rounded-[26px] bg-black/35 border border-white/10 p-2 flex flex-col gap-2">
                    <RightActionButton icon={<Zap className="h-5 w-5 text-white" />} label="Enhance" onClick={enhanceOneClick} badge={t("IA", "AI")} />
                    <RightActionButton icon={<Wand2 className="h-5 w-5 text-white" />} label="Template" onClick={() => setActivePanel("template")} active={activePanel === "template"} />
                    <RightActionButton icon={<Layers className="h-5 w-5 text-white" />} label="Theme" onClick={() => setActivePanel("theme")} active={activePanel === "theme"} />
                    <RightActionButton icon={<RectangleHorizontal className="h-5 w-5 text-white" />} label="Canvas" onClick={() => setActivePanel("canvas")} active={activePanel === "canvas"} />
                    <RightActionButton icon={<Sticker className="h-5 w-5 text-white" />} label="Stickers" onClick={() => setActivePanel("stickers")} active={activePanel === "stickers"} badge={`${stickers.length}`} />
                    <RightActionButton icon={<Subtitles className="h-5 w-5 text-white" />} label="Subtitles" onClick={() => setActivePanel("subtitles")} active={activePanel === "subtitles"} />
                    <RightActionButton icon={<Pencil className="h-5 w-5 text-white" />} label="Graffiti" onClick={() => setActivePanel("graffiti")} active={activePanel === "graffiti"} />
                    <RightActionButton icon={<Sparkles className="h-5 w-5 text-white" />} label="Effects" onClick={() => setActivePanel("effects")} active={activePanel === "effects"} />
                    <RightActionButton icon={<FlameIcon />} label="Challenge" onClick={() => setActivePanel("assist")} active={activePanel === "assist"} />
                    <div className="h-px bg-white/10 my-1" />
                    <RightActionButton icon={<Music className="h-5 w-5 text-white" />} label="Music" onClick={() => setActivePanel("music")} active={activePanel === "music"} />
                    <RightActionButton icon={<Filter className="h-5 w-5 text-white" />} label="Filter" onClick={() => setActivePanel("filter")} active={activePanel === "filter"} />
                    <RightActionButton icon={<Sparkles className="h-5 w-5 text-white" />} label="Magic" onClick={() => setActivePanel("beautify")} active={activePanel === "beautify"} badge={Object.values(magicEnabled).filter(Boolean).length.toString()} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* RIGHT: Sliding Panels */}
          <div className="w-[420px] max-w-[420px] min-w-[360px] flex flex-col gap-3 min-h-0">
            <div className="rounded-3xl bg-black/30 border border-white/10 p-4">
              <div className="flex items-center justify-between">
                <div className="text-white font-semibold text-sm">{t("Contrôles rapides", "Iṣakoso")}</div>
                <button
                  className="h-9 w-9 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center text-white"
                  onClick={() => setActivePanel("background")}
                  type="button"
                  title={t("Background", "Abẹlẹ")}
                >
                  <Layers className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-2xl bg-white/5 border border-white/10 p-3">
                  <div className="text-xs text-white/70 flex items-center gap-2">
                    <Sliders className="h-4 w-4" /> {t("Volume", "Didun")}
                  </div>
                  <input className="w-full mt-2" type="range" min={0} max={100} value={volume} onChange={(e) => setVolume(Number(e.target.value))} />
                  <div className="text-xs text-white/60 mt-1">{volume}%</div>
                </div>

                <div className="rounded-2xl bg-white/5 border border-white/10 p-3">
                  <div className="text-xs text-white/70 flex items-center gap-2">
                    <Gauge className="h-4 w-4" /> {t("Speed", "Iyara")}
                  </div>
                  <input className="w-full mt-2" type="range" min={0.5} max={2} step={0.05} value={captureSpeed} onChange={(e) => setCaptureSpeed(Number(e.target.value))} />
                  <div className="text-xs text-white/60 mt-1">{captureSpeed.toFixed(2)}x</div>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                <button
                  className="h-10 rounded-2xl bg-white/10 border border-white/10 text-white text-xs flex items-center justify-center gap-2"
                  onClick={addSticker}
                  type="button"
                >
                  <Sticker className="h-4 w-4" />
                  {t("Sticker", "Sitika")}
                </button>
                <button
                  className={`h-10 rounded-2xl border text-white text-xs flex items-center justify-center gap-2 ${subtitlesOn ? "bg-white/15 border-white/25" : "bg-white/10 border-white/10"}`}
                  onClick={() => setSubtitlesOn((v) => !v)}
                  type="button"
                >
                  <Subtitles className="h-4 w-4" />
                  {t("Sous-titres", "Akọsilẹ")}
                </button>
                <button
                  className="h-10 rounded-2xl bg-white/10 border border-white/10 text-white text-xs flex items-center justify-center gap-2"
                  onClick={() => {
                    seekTimeline(0);
                    setIsPlaying(false);
                  }}
                  type="button"
                >
                  <RotateCcw className="h-4 w-4" />
                  {t("Reset", "Tun")}
                </button>
              </div>
            </div>

            {/* Panels */}
            <div className="flex-1 min-h-0 overflow-auto pr-1 space-y-3">
              {activePanel === "template" ? (
                <PanelShell title={t("Templates (剪同款 / Make)", "Awoṣe")} icon={<Wand2 className="h-4 w-4" />}>
                  <div className="text-xs text-white/70 mb-3">
                    {t("Catégories stables, noms variables : on fixe la structure + recommandations.", "Ẹka duro, orukọ le yipada: a fi eto + iṣeduro.")}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {TRENDING_TEMPLATES.map((tpl) => {
                      const active = selectedTrendingTemplate?.id === tpl.id;
                      return (
                        <button
                          key={tpl.id}
                          className={`rounded-2xl p-3 border text-left ${active ? "bg-white/15 border-white/25" : "bg-white/5 border-white/10 hover:bg-white/10"}`}
                          onClick={() => setSelectedTrendingTemplate(tpl)}
                          type="button"
                        >
                          <div className="text-white font-semibold text-sm flex items-center gap-2">
                            <span className="text-lg">{tpl.icon}</span>
                            <span>{tpl.name}</span>
                          </div>
                          <div className="text-xs text-white/70 mt-1">{tpl.category} · {tpl.desc}</div>
                          <div className="text-[11px] text-white/60 mt-2">
                            {t("Recommandé", "Iṣeduro")}: {tpl.recommended.filterId ?? "—"} · {tpl.recommended.backgroundId ?? "—"} · {tpl.recommended.musicId ?? "—"}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <button
                      className="h-10 px-3 rounded-2xl bg-white/10 border border-white/10 text-white text-sm flex items-center gap-2"
                      onClick={() => {
                        if (!selectedTrendingTemplate) return;
                        applyRecommendations(selectedTrendingTemplate.recommended);
                      }}
                      type="button"
                    >
                      <Zap className="h-4 w-4" />
                      {t("Appliquer", "Lo")}
                    </button>
                    <button
                      className={`h-10 px-3 rounded-2xl border text-white text-sm flex items-center gap-2 ${recommendedFilterOn ? "bg-white/15 border-white/25" : "bg-white/10 border-white/10"}`}
                      onClick={() => setRecommendedFilterOn((v) => !v)}
                      type="button"
                    >
                      <Sparkles className="h-4 w-4" />
                      {t("Recommended filter", "Filọ ti AI")}
                    </button>
                  </div>
                </PanelShell>
              ) : null}

              {activePanel === "theme" ? (
                <PanelShell title={t("Thèmes (Theme)", "Akori")} icon={<Layers className="h-4 w-4" />}>
                  <div className="grid grid-cols-1 gap-2">
                    {THEME_PACKS.map((th) => {
                      const active = selectedTheme?.id === th.id;
                      return (
                        <button
                          key={th.id}
                          className={`rounded-2xl p-3 border text-left ${active ? "bg-white/15 border-white/25" : "bg-white/5 border-white/10 hover:bg-white/10"}`}
                          onClick={() => setSelectedTheme(th)}
                          type="button"
                        >
                          <div className="text-white font-semibold text-sm">{th.name}</div>
                          <div className="text-xs text-white/70 mt-1">{th.includes.join(" · ")}</div>
                          <div className="text-[11px] text-white/60 mt-2">
                            {t("Pack", "Paki")}: {th.recommended.filterId ?? "—"} · {th.recommended.backgroundId ?? "—"} · {th.recommended.musicId ?? "—"}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </PanelShell>
              ) : null}

              {activePanel === "background" ? (
                <PanelShell title={t("Background (IA)", "Abẹlẹ (AI)")} icon={<Layers className="h-4 w-4" />}>
                  <div className="grid grid-cols-2 gap-2">
                    {AI_BACKGROUNDS.map((bg) => {
                      const active = selectedBackground.id === bg.id;
                      return (
                        <button
                          key={bg.id}
                          className={`rounded-2xl p-3 border text-left ${active ? "bg-white/15 border-white/25" : "bg-white/5 border-white/10 hover:bg-white/10"}`}
                          onClick={() => setSelectedBackground(bg)}
                          type="button"
                        >
                          <div className="text-white font-semibold text-sm flex items-center gap-2">
                            <span className="text-lg">{bg.emoji}</span>
                            <span>{language === "ba" ? bg.nameBa : bg.name}</span>
                          </div>
                          <div className="text-xs text-white/70 mt-1">{bg.tags.join(", ")}</div>
                        </button>
                      );
                    })}
                  </div>
                </PanelShell>
              ) : null}

              {activePanel === "filter" ? (
                <PanelShell title={t("Filter + Ajustements", "Filọ + Atunṣe")} icon={<Filter className="h-4 w-4" />}>
                  <div className="grid grid-cols-2 gap-2">
                    {FILTERS.map((f) => {
                      const active = selectedFilter === f.id;
                      return (
                        <button
                          key={f.id}
                          className={`rounded-2xl p-3 border text-left ${active ? "bg-white/15 border-white/25" : "bg-white/5 border-white/10 hover:bg-white/10"}`}
                          onClick={() => setSelectedFilter(f.id)}
                          type="button"
                        >
                          <div className="text-white font-semibold text-sm flex items-center gap-2">
                            <span>{f.icon}</span>
                            <span>{language === "ba" ? f.nameBa : f.name}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-3">
                    <SliderRow label={t("Brightness", "Imọlẹ")} value={brightness} onChange={setBrightness} />
                    <SliderRow label={t("Contrast", "Iyatọ")} value={contrast} onChange={setContrast} />
                    <SliderRow label={t("Saturation", "Ìfarahan")} value={saturation} onChange={setSaturation} />
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <button
                      className="h-10 px-3 rounded-2xl bg-white/10 border border-white/10 text-white text-sm flex items-center gap-2"
                      onClick={() => setNextFilter(-1)}
                      type="button"
                    >
                      <SkipBack className="h-4 w-4" />
                      {t("Prev", "Tẹlẹ")}
                    </button>
                    <button
                      className="h-10 px-3 rounded-2xl bg-white/10 border border-white/10 text-white text-sm flex items-center gap-2"
                      onClick={() => setNextFilter(1)}
                      type="button"
                    >
                      {t("Next", "Tọ")}
                      <SkipForward className="h-4 w-4" />
                    </button>
                    <div className="ml-auto text-xs text-white/60">{t("Swipe sur preview ⇆", "Swipe lori preview ⇆")}</div>
                  </div>
                </PanelShell>
              ) : null}

              {activePanel === "music" ? (
                <PanelShell title={t("Audio & Musique", "Orin")} icon={<Music className="h-4 w-4" />}>
                  <div className="text-xs text-white/70 mb-3">
                    {t("Music · Trending · Collect · History + badge Pure Music.", "Music · Trending · Collect · History + Pure Music.")}
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    {MUSIC_TRACKS.map((m) => {
                      const active = selectedMusic?.id === m.id;
                      return (
                        <button
                          key={m.id}
                          className={`rounded-2xl p-3 border text-left ${active ? "bg-white/15 border-white/25" : "bg-white/5 border-white/10 hover:bg-white/10"}`}
                          onClick={() => setSelectedMusic(m)}
                          type="button"
                        >
                          <div className="text-white font-semibold text-sm flex items-center gap-2">
                            <span className="text-lg">{m.emoji}</span>
                            <span>{language === "ba" ? m.titleBa : m.title}</span>
                          </div>
                          <div className="text-xs text-white/70 mt-1">{t("Durée", "Akoko")}: {m.duration}s · {t("Énergie", "Agbara")}: {m.energy}</div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <button
                      className="h-10 px-3 rounded-2xl bg-white/10 border border-white/10 text-white text-sm flex items-center gap-2"
                      onClick={() => setSelectedMusic(null)}
                      type="button"
                    >
                      <Trash2 className="h-4 w-4" />
                      {t("Retirer", "Yọ")}
                    </button>
                    <button
                      className="h-10 px-3 rounded-2xl bg-white/10 border border-white/10 text-white text-sm flex items-center gap-2"
                      onClick={() => setActivePanel(null)}
                      type="button"
                    >
                      <Check className="h-4 w-4" />
                      OK
                    </button>
                  </div>
                </PanelShell>
              ) : null}

              {activePanel === "stickers" ? (
                <PanelShell title={t("Stickers (Overlay)", "Sitika")} icon={<Sticker className="h-4 w-4" />}>
                  <div className="flex items-center gap-2 mb-3">
                    <button className="h-10 px-3 rounded-2xl bg-white/10 border border-white/10 text-white text-sm flex items-center gap-2" onClick={addSticker} type="button">
                      <Plus className="h-4 w-4" />
                      {t("Ajouter", "Fikun")}
                    </button>
                    <button className="h-10 px-3 rounded-2xl bg-white/10 border border-white/10 text-white text-sm flex items-center gap-2" onClick={removeSticker} type="button" disabled={!selectedStickerId}>
                      <Trash2 className="h-4 w-4" />
                      {t("Supprimer", "Pa rẹ")}
                    </button>
                    <div className="ml-auto text-xs text-white/60">{t("Visible selon le temps", "Han gẹgẹ bi aago")}</div>
                  </div>

                  <div className="grid grid-cols-6 gap-2">
                    {STICKER_EMOJIS.map((e) => (
                      <button
                        key={e}
                        className="h-10 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-xl"
                        onClick={() => {
                          const s: TextOverlay = { id: `stk_${Date.now()}`, emoji: e, position: { x: 50, y: 35 }, scale: 1, rotation: 0, startTime: timelineTime, endTime: timelineTime + 3 };
                          setStickers((prev) => [...prev, s]);
                          setSelectedStickerId(s.id);
                        }}
                        type="button"
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </PanelShell>
              ) : null}

              {activePanel === "subtitles" ? (
                <PanelShell title={t("Subtitles (Accessibilité)", "Akọsilẹ")} icon={<Subtitles className="h-4 w-4" />}>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-white">{t("Activer", "Tan")}</div>
                    <button
                      className={`h-10 px-3 rounded-2xl border text-white text-sm ${subtitlesOn ? "bg-white/15 border-white/25" : "bg-white/10 border-white/10"}`}
                      onClick={() => setSubtitlesOn((v) => !v)}
                      type="button"
                    >
                      {subtitlesOn ? t("ON", "BẸẸNI") : t("OFF", "RARA")}
                    </button>
                  </div>

                  <div className="mt-3 text-xs text-white/70">{t("Style", "Ara")}</div>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {(["classic", "karaoke", "bold"] as const).map((s) => (
                      <button
                        key={s}
                        className={`h-10 rounded-2xl border text-white text-xs ${subtitleStyle === s ? "bg-white/15 border-white/25" : "bg-white/5 border-white/10 hover:bg-white/10"}`}
                        onClick={() => setSubtitleStyle(s)}
                        type="button"
                      >
                        {s}
                      </button>
                    ))}
                  </div>

                  <div className="mt-3 rounded-2xl bg-white/5 border border-white/10 p-3 text-xs text-white/70">
                    {t("Note: ici c’est UX-ready. Le STT/ASR pourra alimenter ces sous-titres.", "Akiyesi: eyi ni UX. ASR/STT le kun.")}
                  </div>
                </PanelShell>
              ) : null}

              {activePanel === "effects" ? (
                <PanelShell title={t("Effects (Impact)", "EFFECT")} icon={<Sparkles className="h-4 w-4" />}>
                  <div className="text-xs text-white/70">{t("Preview temps réel (placeholder). Intensité:", "Preview (afiṣe). Iwọn:")}</div>
                  <input className="w-full mt-2" type="range" min={0} max={100} value={effectIntensity} onChange={(e) => setEffectIntensity(Number(e.target.value))} />
                  <div className="text-xs text-white/60 mt-1">{effectIntensity}%</div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button className="h-10 rounded-2xl bg-white/10 border border-white/10 text-white text-xs" type="button">
                      {t("Glow", "Imọlẹ")}
                    </button>
                    <button className="h-10 rounded-2xl bg-white/10 border border-white/10 text-white text-xs" type="button">
                      {t("Shake", "Gbigbọn")}
                    </button>
                    <button className="h-10 rounded-2xl bg-white/10 border border-white/10 text-white text-xs" type="button">
                      {t("Zoom", "Sunmọ")}
                    </button>
                    <button className="h-10 rounded-2xl bg-white/10 border border-white/10 text-white text-xs" type="button">
                      {t("Cinematic", "Sinima")}
                    </button>
                  </div>
                </PanelShell>
              ) : null}

              {activePanel === "beautify" ? (
                <PanelShell title={t("Beautify · Magic (IA/AR)", "Beautify · Magic")} icon={<Sparkles className="h-4 w-4" />}>
                  <div className="text-xs text-white/70 mb-3">
                    {t("Active les briques Magic (face, AR props, auto recommend…).", "Mu Magic ṣiṣẹ (oju, AR, auto recommend…).")}
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    {MAGIC_FEATURES.map((m) => {
                      const active = !!magicEnabled[m.id];
                      return (
                        <button
                          key={m.id}
                          className={`rounded-2xl p-3 border text-left flex items-center justify-between ${active ? "bg-white/15 border-white/25" : "bg-white/5 border-white/10 hover:bg-white/10"}`}
                          onClick={() => setMagicEnabled((prev) => ({ ...prev, [m.id]: !prev[m.id] }))}
                          type="button"
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center text-white">
                              {m.icon}
                            </div>
                            <div>
                              <div className="text-white font-semibold text-sm">{m.name}</div>
                              <div className="text-xs text-white/70">{m.desc}</div>
                            </div>
                          </div>
                          <div className={`text-xs px-2 py-1 rounded-full ${active ? "bg-green-500/20 text-green-200 border border-green-500/30" : "bg-white/10 text-white/70 border border-white/10"}`}>
                            {active ? "ON" : "OFF"}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-3 rounded-2xl bg-white/5 border border-white/10 p-3 text-xs text-white/70">
                    {t("Astuce: active Auto recommend + Recommended filter pour une UX ‘IA proactive’.", "Imọran: tan Auto recommend + Recommended filter.")}
                  </div>
                </PanelShell>
              ) : null}

              {activePanel === "canvas" ? (
                <PanelShell title={t("Canvas (Multi-format)", "Canvas")} icon={<RectangleHorizontal className="h-4 w-4" />}>
                  <div className="text-xs text-white/70 mb-3">
                    {t("Ratio change · Background · Reframe · Multi-screen", "Ratio · Abẹlẹ · Reframe · Multi-screen")}
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      className={`h-10 rounded-2xl border text-white text-xs flex items-center justify-center gap-2 ${aspect === "9:16" ? "bg-white/15 border-white/25" : "bg-white/5 border-white/10 hover:bg-white/10"}`}
                      onClick={() => setAspect("9:16")}
                      type="button"
                    >
                      <Smartphone className="h-4 w-4" /> 9:16
                    </button>
                    <button
                      className={`h-10 rounded-2xl border text-white text-xs flex items-center justify-center gap-2 ${aspect === "1:1" ? "bg-white/15 border-white/25" : "bg-white/5 border-white/10 hover:bg-white/10"}`}
                      onClick={() => setAspect("1:1")}
                      type="button"
                    >
                      <Square className="h-4 w-4" /> 1:1
                    </button>
                    <button
                      className={`h-10 rounded-2xl border text-white text-xs flex items-center justify-center gap-2 ${aspect === "16:9" ? "bg-white/15 border-white/25" : "bg-white/5 border-white/10 hover:bg-white/10"}`}
                      onClick={() => setAspect("16:9")}
                      type="button"
                    >
                      <RectangleHorizontal className="h-4 w-4" /> 16:9
                    </button>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      className={`h-10 rounded-2xl border text-white text-xs ${multiScreen ? "bg-white/15 border-white/25" : "bg-white/5 border-white/10 hover:bg-white/10"}`}
                      onClick={() => setMultiScreen((v) => !v)}
                      type="button"
                    >
                      {t("Multi-screen", "Ọ̀pọ̀-iboju")} {multiScreen ? "ON" : "OFF"}
                    </button>
                    <button
                      className="h-10 rounded-2xl bg-white/10 border border-white/10 text-white text-xs"
                      onClick={() => setReframe((r) => (r === "auto" ? "center" : "auto"))}
                      type="button"
                    >
                      {t("Reframe", "Reframe")}: {reframe}
                    </button>
                  </div>

                  <div className="mt-3 rounded-2xl bg-white/5 border border-white/10 p-3 text-xs text-white/70">
                    {t("Note: Reframe/Tracking seront alimentés par Object tracking + Face recognition.", "Akiyesi: Reframe/Tracking nipasẹ Object tracking + Face recognition.")}
                  </div>
                </PanelShell>
              ) : null}

              {activePanel === "assist" ? (
                <PanelShell title={t("Assistance créative", "Iranlọwọ ẹda")} icon={<Eye className="h-4 w-4" />}>
                  <div className="grid grid-cols-1 gap-2">
                    <div className="rounded-2xl bg-white/5 border border-white/10 p-3">
                      <div className="text-xs text-white/70 mb-2">{t("Challenge (tendance)", "Ipenija")}</div>
                      <div className="flex flex-wrap gap-2">
                        {["#DanceChallenge", "#MarketDay", "#Alerte", "#Héros", "#Mariage", "#Fun", "#Santé"].map((c) => (
                          <button
                            key={c}
                            className={`h-9 px-3 rounded-2xl border text-xs ${challenge === c ? "bg-orange-500/30 border-orange-500/40 text-white" : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"}`}
                            onClick={() => setChallenge((prev) => (prev === c ? null : c))}
                            type="button"
                          >
                            {c}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-white/5 border border-white/10 p-3">
                      <div className="text-xs text-white/70 mb-2">{t("Tips overlays", "Awọn itọnisọna")}</div>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          className={`h-10 rounded-2xl border text-xs ${showShotTips ? "bg-white/15 border-white/25 text-white" : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"}`}
                          onClick={() => setShowShotTips((v) => !v)}
                          type="button"
                        >
                          {t("Shot tips", "Shot tips")} {showShotTips ? "ON" : "OFF"}
                        </button>
                        <button
                          className={`h-10 rounded-2xl border text-xs ${showCoverTips ? "bg-white/15 border-white/25 text-white" : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"}`}
                          onClick={() => setShowCoverTips((v) => !v)}
                          type="button"
                        >
                          {t("Cover tips", "Cover tips")} {showCoverTips ? "ON" : "OFF"}
                        </button>
                      </div>
                    </div>

                    <div className="rounded-2xl bg-white/5 border border-white/10 p-3">
                      <div className="text-xs text-white/70 mb-2">{t("Créations supportées", "Awọn iru ẹda")}</div>
                      <div className="flex flex-wrap gap-2">
                        {CREATION_TYPES.map((ct) => (
                          <span key={ct} className="text-[11px] px-2 py-1 rounded-full bg-white/10 border border-white/10 text-white/70">
                            {ct}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </PanelShell>
              ) : null}

              {activePanel === "uxmap" ? (
                <PanelShell title="UX Mapping (Figma/PRD)" icon={<BookOpen className="h-4 w-4" />}>
                  <div className="text-xs text-white/70 mb-3">
                    {t("Table ‘Nom UI → Rôle → Style → Logique produit’ intégrée au code.", "Tabili ‘UI → Iṣẹ → Ara → Imọ’ wa nibi.")}
                  </div>

                  <UXTable title={t("Entrée & Navigation", "Wiwọle")} rows={UX_MAPPING.entryNavigation} />
                  <UXTable title={t("Capture – barre droite", "Gbigba – ọtun")} rows={UX_MAPPING.captureRightBar} />
                  <UXTable title={t("Assistance créative", "Iranlọwọ")} rows={UX_MAPPING.creativeAssist} />
                  <UXTable title={t("Beauté, AR & Effets", "Ẹwa, AR & Effects")} rows={UX_MAPPING.beautyArFx} />
                  <UXTable title={t("Audio & Musique", "Orin")} rows={UX_MAPPING.audioMusic} />
                  <UXTable title={t("Post-capture – barre verticale", "Lẹ́yìn gbigba – inaro")} rows={UX_MAPPING.postCaptureVertical} />
                  <UXTable title="Canvas (stratégique)" rows={UX_MAPPING.canvasStrategic} />
                </PanelShell>
              ) : null}
            </div>
          </div>
        </div>

        {/* BOTTOM “Kuaishou-ish” action row */}
        <div className="px-4 pb-4">
          <div className="rounded-3xl bg-black/35 border border-white/10 p-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-white/70 text-xs">
              <span className="inline-flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                {t("Kuaishou = studio créatif assisté par IA (copy/imitate friendly)", "Kuaishou = studio AI (daakọ rọrun)")}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button className="h-10 px-3 rounded-2xl bg-white/10 border border-white/10 text-white text-sm flex items-center gap-2" type="button">
                <Share2 className="h-4 w-4" />
                {t("Partager", "Pin")}
              </button>
              <button className="h-10 px-3 rounded-2xl bg-white/10 border border-white/10 text-white text-sm flex items-center gap-2" type="button">
                <Download className="h-4 w-4" />
                {t("Exporter", "Gba")}
              </button>
              <button className="h-10 px-3 rounded-2xl bg-orange-500/90 hover:bg-orange-500 text-white text-sm flex items-center gap-2" onClick={handleConfirm} type="button">
                <Check className="h-4 w-4" />
                {t("Publier", "Tẹjade")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/** =========================================================
 *  SMALL UI PARTS
 *  ========================================================= */

const FlameIcon = () => <TrendingUp className="h-4 w-4" />;

const SliderRow: React.FC<{ label: string; value: number; onChange: (v: number) => void }> = ({ label, value, onChange }) => (
  <div className="rounded-2xl bg-white/5 border border-white/10 p-3">
    <div className="text-xs text-white/70">{label}</div>
    <input className="w-full mt-2" type="range" min={50} max={150} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    <div className="text-xs text-white/60 mt-1">{value}%</div>
  </div>
);

const UXTable: React.FC<{ title: string; rows: { ui: string; role: string; style: string; logic: string }[] }> = ({ title, rows }) => (
  <div className="mb-4">
    <div className="text-white font-semibold text-sm mb-2">{title}</div>
    <div className="rounded-2xl overflow-hidden border border-white/10">
      <div className="grid grid-cols-4 bg-white/10 text-white/80 text-[11px]">
        <div className="p-2">Nom UI</div>
        <div className="p-2">Rôle</div>
        <div className="p-2">Style</div>
        <div className="p-2">Logique produit</div>
      </div>
      {rows.map((r, i) => (
        <div key={i} className="grid grid-cols-4 text-[11px] text-white/70 border-t border-white/10 bg-black/10">
          <div className="p-2">{r.ui}</div>
          <div className="p-2">{r.role}</div>
          <div className="p-2">{r.style}</div>
          <div className="p-2">{r.logic}</div>
        </div>
      ))}
    </div>
  </div>
);

export default TimelineEditorKuaishou;
