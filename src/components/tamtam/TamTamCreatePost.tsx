import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { 
  X, Mic, Check, Loader2, Volume2, Play, Pause, Square,
  BookOpen, Leaf, Users, Globe, Heart, HelpCircle, 
  Megaphone, HandHeart, Bell,
  Baby, PartyPopper, Flower2, Wheat, Cloud,
  CloudRain, TreePine, Bird, Flame,
  Home, Crown, Sword, Scale, GraduationCap, Stethoscope,
  AlertTriangle, Car, Construction,
  Bug, MapPin, Clock, Users2, Palette, Drama,
  CircleDollarSign, ShieldAlert, Coins, RotateCcw, Send
} from 'lucide-react';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';
import { SmartVoiceRecorder } from '@/components/voice/SmartVoiceRecorder';
import { useUnifiedAudio } from '@/hooks/useUnifiedAudio';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { triggerFeedback } from '@/utils/tamtamFeedback';
import { useVoiceMenu } from '@/hooks/useVoiceMenu';

// ═══════════════════════════════════════════════════════════════════════════
// 🎵 TAM-TAM CREATE POST V4 - EXPÉRIENCE VINYLE IMMERSIVE
// ═══════════════════════════════════════════════════════════════════════════
//
// INNOVATIONS :
// 1. Disque vinyle rotatif pendant l'enregistrement
// 2. Progress ring montrant la durée d'enregistrement
// 3. Onde sonore animée selon l'amplitude
// 4. Preview avec disque + lecture intégrée
// 5. Animations fluides entre les étapes
//
// ═══════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface TamTamCreatePostProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (postData: any) => Promise<void>;
  onOpenPoll?: () => void;
}

interface Template {
  id: string;
  category: 'patrimoine' | 'village_voice';
  subcategory: string;
  emoji: string;
  visualEmojis: string[];
  titleFr: string;
  titleBa: string;
  audioPromptFr: string;
  audioPromptBa: string;
  exampleFr: string;
  gradient: string;
  grooveColor: string;
  glowColor: string;
  tags: string[];
  visibility: 'public' | 'community' | 'vault';
  urgency?: 'normal' | 'urgent' | 'critical';
}

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATES PATRIMOINE - 30 Templates avec couleurs vinyle
// ═══════════════════════════════════════════════════════════════════════════

const patrimoineTemplates: Template[] = [
  // CONTES (6)
  { id: 'conte_animaux', category: 'patrimoine', subcategory: 'conte', emoji: '🦁', visualEmojis: ['🦁', '🐘', '🐢', '🌙', '✨'], titleFr: 'Conte des animaux', titleBa: 'Sìírà nɛ̀ɛ̀má', audioPromptFr: 'Racontez un conte avec des animaux', audioPromptBa: 'Sìírà nɛ̀ɛ̀má kà sɔ̀ɔ̀', exampleFr: 'Il était une fois un lion...', gradient: 'from-amber-500 via-orange-500 to-red-500', grooveColor: 'rgba(251,191,36,0.4)', glowColor: 'rgba(251,146,60,0.6)', tags: ['animaux', 'sagesse'], visibility: 'public' },
  { id: 'conte_origine', category: 'patrimoine', subcategory: 'conte', emoji: '🌍', visualEmojis: ['🌍', '👤', '🌅', '🏔️', '💫'], titleFr: 'Origine du monde', titleBa: 'Dùnìyá bɛ̀rɛ̀', audioPromptFr: 'Racontez comment le monde a été créé', audioPromptBa: 'Dùnìyá bɛ̀rɛ̀ sìírà', exampleFr: 'Au commencement...', gradient: 'from-indigo-600 via-purple-600 to-pink-500', grooveColor: 'rgba(139,92,246,0.4)', glowColor: 'rgba(168,85,247,0.6)', tags: ['création', 'mythologie'], visibility: 'public' },
  { id: 'conte_heros', category: 'patrimoine', subcategory: 'conte', emoji: '⚔️', visualEmojis: ['👑', '⚔️', '🐎', '🏰', '🎖️'], titleFr: 'Héros légendaire', titleBa: 'Gànnú fàráfìn', audioPromptFr: 'Racontez l\'histoire d\'un héros', audioPromptBa: 'Gànnú fàráfìn sìírà', exampleFr: 'Il y avait un grand guerrier...', gradient: 'from-red-600 via-rose-600 to-pink-500', grooveColor: 'rgba(244,63,94,0.4)', glowColor: 'rgba(251,113,133,0.6)', tags: ['héros', 'courage'], visibility: 'public' },
  { id: 'conte_enfant', category: 'patrimoine', subcategory: 'conte', emoji: '👶', visualEmojis: ['👶', '🌟', '🧚', '🌈', '😴'], titleFr: 'Conte pour enfants', titleBa: 'Dénmísɛ́n sìírà', audioPromptFr: 'Racontez une histoire pour les enfants', audioPromptBa: 'Dénmísɛ́n sìírà', exampleFr: 'Pour que les enfants dorment...', gradient: 'from-pink-400 via-purple-400 to-indigo-400', grooveColor: 'rgba(232,121,249,0.4)', glowColor: 'rgba(192,132,252,0.6)', tags: ['enfants', 'douceur'], visibility: 'public' },
  { id: 'conte_ruse', category: 'patrimoine', subcategory: 'conte', emoji: '🦊', visualEmojis: ['🦊', '🤔', '💡', '😂', '🎭'], titleFr: 'Conte de ruse', titleBa: 'Hàkílì sìírà', audioPromptFr: 'Racontez une histoire où le plus malin gagne', audioPromptBa: 'Hàkílì sìírà', exampleFr: 'Le lièvre était plus malin...', gradient: 'from-orange-500 via-amber-500 to-yellow-400', grooveColor: 'rgba(251,146,60,0.4)', glowColor: 'rgba(245,158,11,0.6)', tags: ['ruse', 'humour'], visibility: 'public' },
  { id: 'conte_moral', category: 'patrimoine', subcategory: 'conte', emoji: '⚖️', visualEmojis: ['⚖️', '❤️', '🙏', '✨', '🕊️'], titleFr: 'Conte moral', titleBa: 'Kɔ̀nɔ̀ sìírà', audioPromptFr: 'Racontez une histoire avec une leçon', audioPromptBa: 'Kɔ̀nɔ̀ sìírà kálan', exampleFr: 'Cette histoire nous apprend...', gradient: 'from-emerald-500 via-teal-500 to-cyan-500', grooveColor: 'rgba(20,184,166,0.4)', glowColor: 'rgba(6,182,212,0.6)', tags: ['morale', 'sagesse'], visibility: 'public' },
  
  // MUSIQUE (6)
  { id: 'musique_mariage', category: 'patrimoine', subcategory: 'musique', emoji: '💒', visualEmojis: ['💒', '👰', '🤵', '💍', '🎶'], titleFr: 'Chant de mariage', titleBa: 'Fúrú dùùrú', audioPromptFr: 'Chantez un chant de mariage', audioPromptBa: 'Fúrú dùùrú', exampleFr: 'Chanson pour les mariés...', gradient: 'from-pink-500 via-rose-500 to-red-400', grooveColor: 'rgba(236,72,153,0.4)', glowColor: 'rgba(244,114,182,0.6)', tags: ['mariage', 'amour'], visibility: 'public' },
  { id: 'musique_naissance', category: 'patrimoine', subcategory: 'musique', emoji: '👶', visualEmojis: ['👶', '🍼', '🎵', '👩‍👧', '🌟'], titleFr: 'Berceuse', titleBa: 'Dén sùnɔ̀gɔ̀ dùùrú', audioPromptFr: 'Chantez une berceuse', audioPromptBa: 'Dén sùnɔ̀gɔ̀ dùùrú', exampleFr: 'Dors mon enfant...', gradient: 'from-blue-300 via-indigo-300 to-purple-300', grooveColor: 'rgba(165,180,252,0.4)', glowColor: 'rgba(196,181,253,0.6)', tags: ['bébé', 'berceuse'], visibility: 'public' },
  { id: 'musique_travail', category: 'patrimoine', subcategory: 'musique', emoji: '🌾', visualEmojis: ['🌾', '👨‍🌾', '☀️', '💪', '🎵'], titleFr: 'Chant de travail', titleBa: 'Báárá dùùrú', audioPromptFr: 'Chantez un chant de travail aux champs', audioPromptBa: 'Báárá dùùrú', exampleFr: 'On chante pour la force...', gradient: 'from-yellow-500 via-amber-500 to-orange-500', grooveColor: 'rgba(245,158,11,0.4)', glowColor: 'rgba(251,191,36,0.6)', tags: ['travail', 'champs'], visibility: 'public' },
  { id: 'musique_funerailles', category: 'patrimoine', subcategory: 'musique', emoji: '🕯️', visualEmojis: ['🕯️', '🙏', '👼', '🌺', '💔'], titleFr: 'Chant funéraire', titleBa: 'Sú dùùrú', audioPromptFr: 'Chantez un chant funéraire', audioPromptBa: 'Sú dùùrú', exampleFr: 'Pour accompagner ceux qui partent...', gradient: 'from-gray-600 via-slate-600 to-gray-700', grooveColor: 'rgba(100,116,139,0.4)', glowColor: 'rgba(148,163,184,0.6)', tags: ['deuil', 'hommage'], visibility: 'community' },
  { id: 'musique_fete', category: 'patrimoine', subcategory: 'musique', emoji: '🥁', visualEmojis: ['🥁', '💃', '🕺', '🎉', '🔥'], titleFr: 'Chant de fête', titleBa: 'Sèlí dùùrú', audioPromptFr: 'Chantez un chant de fête', audioPromptBa: 'Sèlí dùùrú', exampleFr: 'Quand on danse, on chante...', gradient: 'from-fuchsia-500 via-purple-500 to-violet-600', grooveColor: 'rgba(192,38,211,0.4)', glowColor: 'rgba(217,70,239,0.6)', tags: ['fête', 'danse'], visibility: 'public' },
  { id: 'musique_initiation', category: 'patrimoine', subcategory: 'musique', emoji: '👑', visualEmojis: ['👑', '🔥', '💪', '🌙', '✨'], titleFr: 'Chant d\'initiation', titleBa: 'Bólò dùùrú', audioPromptFr: 'Chantez un chant d\'initiation', audioPromptBa: 'Bólò dùùrú', exampleFr: 'Pour devenir un homme...', gradient: 'from-amber-600 via-orange-600 to-red-600', grooveColor: 'rgba(217,119,6,0.4)', glowColor: 'rgba(234,88,12,0.6)', tags: ['initiation', 'tradition'], visibility: 'vault' },
  
  // PROVERBES (6)
  { id: 'proverbe_sagesse', category: 'patrimoine', subcategory: 'proverbe', emoji: '🧓', visualEmojis: ['🧓', '💭', '💡', '🙏', '✨'], titleFr: 'Sagesse des anciens', titleBa: 'Kɔ̀rɔ̀ hàkílì', audioPromptFr: 'Dites un proverbe de sagesse', audioPromptBa: 'Kɔ̀rɔ̀ sɔ̀ɔ̀rɔ̀', exampleFr: 'Nos ancêtres disaient...', gradient: 'from-amber-600 via-yellow-600 to-orange-500', grooveColor: 'rgba(217,119,6,0.4)', glowColor: 'rgba(202,138,4,0.6)', tags: ['sagesse', 'ancien'], visibility: 'public' },
  { id: 'proverbe_travail', category: 'patrimoine', subcategory: 'proverbe', emoji: '👨‍🌾', visualEmojis: ['👨‍🌾', '🌱', '💪', '🌾', '🙏'], titleFr: 'Proverbe du travail', titleBa: 'Báárá sɔ̀ɔ̀rɔ̀', audioPromptFr: 'Dites un proverbe sur le travail', audioPromptBa: 'Báárá sɔ̀ɔ̀rɔ̀', exampleFr: 'Celui qui ne travaille pas...', gradient: 'from-green-600 via-emerald-600 to-teal-500', grooveColor: 'rgba(5,150,105,0.4)', glowColor: 'rgba(16,185,129,0.6)', tags: ['travail', 'effort'], visibility: 'public' },
  { id: 'proverbe_famille', category: 'patrimoine', subcategory: 'proverbe', emoji: '👨‍👩‍👧‍👦', visualEmojis: ['👨‍👩‍👧‍👦', '🏠', '❤️', '🤝', '🌳'], titleFr: 'Proverbe de famille', titleBa: 'Dénbáyá sɔ̀ɔ̀rɔ̀', audioPromptFr: 'Dites un proverbe sur la famille', audioPromptBa: 'Dénbáyá sɔ̀ɔ̀rɔ̀', exampleFr: 'Une famille unie...', gradient: 'from-blue-500 via-indigo-500 to-purple-500', grooveColor: 'rgba(99,102,241,0.4)', glowColor: 'rgba(129,140,248,0.6)', tags: ['famille', 'union'], visibility: 'public' },
  { id: 'proverbe_patience', category: 'patrimoine', subcategory: 'proverbe', emoji: '⏳', visualEmojis: ['⏳', '🐢', '🎯', '✨', '🏆'], titleFr: 'Proverbe de patience', titleBa: 'Múɲu sɔ̀ɔ̀rɔ̀', audioPromptFr: 'Dites un proverbe sur la patience', audioPromptBa: 'Múɲu sɔ̀ɔ̀rɔ̀', exampleFr: 'La patience est...', gradient: 'from-cyan-500 via-blue-500 to-indigo-500', grooveColor: 'rgba(6,182,212,0.4)', glowColor: 'rgba(14,165,233,0.6)', tags: ['patience', 'temps'], visibility: 'public' },
  { id: 'proverbe_nature', category: 'patrimoine', subcategory: 'proverbe', emoji: '🌳', visualEmojis: ['🌳', '🌊', '🦅', '☀️', '🌍'], titleFr: 'Proverbe de la nature', titleBa: 'Dùnìyá sɔ̀ɔ̀rɔ̀', audioPromptFr: 'Dites un proverbe sur la nature', audioPromptBa: 'Dùnìyá sɔ̀ɔ̀rɔ̀', exampleFr: 'L\'arbre qui...', gradient: 'from-green-500 via-emerald-500 to-teal-400', grooveColor: 'rgba(16,185,129,0.4)', glowColor: 'rgba(52,211,153,0.6)', tags: ['nature', 'leçon'], visibility: 'public' },
  { id: 'proverbe_humilite', category: 'patrimoine', subcategory: 'proverbe', emoji: '🙏', visualEmojis: ['🙏', '👇', '❤️', '🕊️', '✨'], titleFr: 'Proverbe d\'humilité', titleBa: 'Màyá sɔ̀ɔ̀rɔ̀', audioPromptFr: 'Dites un proverbe sur l\'humilité', audioPromptBa: 'Màyá sɔ̀ɔ̀rɔ̀', exampleFr: 'L\'humble sera...', gradient: 'from-violet-500 via-purple-500 to-fuchsia-500', grooveColor: 'rgba(139,92,246,0.4)', glowColor: 'rgba(168,85,247,0.6)', tags: ['humilité', 'respect'], visibility: 'public' },
  
  // SAVOIRS (6)
  { id: 'savoir_plantes', category: 'patrimoine', subcategory: 'savoir', emoji: '🌿', visualEmojis: ['🌿', '💊', '🩹', '👨‍⚕️', '✨'], titleFr: 'Plantes médicinales', titleBa: 'Fúrá yírí', audioPromptFr: 'Partagez une connaissance sur une plante', audioPromptBa: 'Fúrá yírí dɔ̀nnìyá', exampleFr: 'Cette plante soigne...', gradient: 'from-green-600 via-emerald-500 to-lime-400', grooveColor: 'rgba(16,185,129,0.4)', glowColor: 'rgba(34,197,94,0.6)', tags: ['plantes', 'médecine'], visibility: 'community' },
  { id: 'savoir_cuisine', category: 'patrimoine', subcategory: 'savoir', emoji: '🍲', visualEmojis: ['🍲', '🔥', '👨‍🍳', '🧅', '😋'], titleFr: 'Recette traditionnelle', titleBa: 'Dúmúní dàn', audioPromptFr: 'Partagez une recette traditionnelle', audioPromptBa: 'Dúmúní dàn kàlàn', exampleFr: 'Pour préparer ce plat...', gradient: 'from-orange-500 via-red-500 to-rose-500', grooveColor: 'rgba(249,115,22,0.4)', glowColor: 'rgba(239,68,68,0.6)', tags: ['cuisine', 'recette'], visibility: 'public' },
  { id: 'savoir_artisanat', category: 'patrimoine', subcategory: 'savoir', emoji: '🧶', visualEmojis: ['🧶', '🪡', '👐', '🎨', '✨'], titleFr: 'Artisanat', titleBa: 'Bólò báárá', audioPromptFr: 'Expliquez une technique artisanale', audioPromptBa: 'Bólò báárá dɔ̀nnìyá', exampleFr: 'Pour tisser...', gradient: 'from-amber-500 via-orange-500 to-red-400', grooveColor: 'rgba(245,158,11,0.4)', glowColor: 'rgba(251,146,60,0.6)', tags: ['artisanat', 'technique'], visibility: 'public' },
  { id: 'savoir_agriculture', category: 'patrimoine', subcategory: 'savoir', emoji: '🌱', visualEmojis: ['🌱', '🌧️', '☀️', '🌾', '👨‍🌾'], titleFr: 'Savoir agricole', titleBa: 'Sɛ̀nɛ̀ dɔ̀nnìyá', audioPromptFr: 'Partagez une technique agricole', audioPromptBa: 'Sɛ̀nɛ̀ dɔ̀nnìyá', exampleFr: 'Pour bien cultiver...', gradient: 'from-lime-500 via-green-500 to-emerald-500', grooveColor: 'rgba(132,204,22,0.4)', glowColor: 'rgba(34,197,94,0.6)', tags: ['agriculture', 'terre'], visibility: 'public' },
  { id: 'savoir_elevage', category: 'patrimoine', subcategory: 'savoir', emoji: '🐄', visualEmojis: ['🐄', '🥛', '🏕️', '👨‍🌾', '🌾'], titleFr: 'Savoir élevage', titleBa: 'Bàgán dɔ̀nnìyá', audioPromptFr: 'Partagez une connaissance sur l\'élevage', audioPromptBa: 'Bàgán dɔ̀nnìyá', exampleFr: 'Pour bien élever...', gradient: 'from-amber-600 via-yellow-500 to-lime-400', grooveColor: 'rgba(217,119,6,0.4)', glowColor: 'rgba(234,179,8,0.6)', tags: ['élevage', 'animaux'], visibility: 'public' },
  { id: 'savoir_meteo', category: 'patrimoine', subcategory: 'savoir', emoji: '🌦️', visualEmojis: ['🌦️', '🌙', '🐦', '🌳', '👀'], titleFr: 'Lire le temps', titleBa: 'Sán kàlàn', audioPromptFr: 'Expliquez comment prévoir le temps', audioPromptBa: 'Sán kàlàn dɔ̀nnìyá', exampleFr: 'Quand on voit ceci...', gradient: 'from-blue-400 via-cyan-400 to-teal-400', grooveColor: 'rgba(56,189,248,0.4)', glowColor: 'rgba(34,211,238,0.6)', tags: ['météo', 'nature'], visibility: 'public' },
  
  // HISTOIRE (6)
  { id: 'histoire_village', category: 'patrimoine', subcategory: 'histoire', emoji: '🏘️', visualEmojis: ['🏘️', '👴', '📜', '🌳', '⏳'], titleFr: 'Histoire du village', titleBa: 'Sò kpààrà', audioPromptFr: 'Racontez l\'histoire de votre village', audioPromptBa: 'Án sò kpààrà', exampleFr: 'Notre village a été fondé...', gradient: 'from-amber-700 via-orange-600 to-yellow-500', grooveColor: 'rgba(180,83,9,0.4)', glowColor: 'rgba(217,119,6,0.6)', tags: ['village', 'fondation'], visibility: 'public' },
  { id: 'histoire_famille', category: 'patrimoine', subcategory: 'histoire', emoji: '👪', visualEmojis: ['👪', '👴', '👶', '🌳', '❤️'], titleFr: 'Histoire de famille', titleBa: 'Dénbáyá kpààrà', audioPromptFr: 'Racontez l\'histoire de votre famille', audioPromptBa: 'Dénbáyá kpààrà', exampleFr: 'Notre famille vient de...', gradient: 'from-blue-600 via-indigo-500 to-purple-500', grooveColor: 'rgba(37,99,235,0.4)', glowColor: 'rgba(99,102,241,0.6)', tags: ['famille', 'généalogie'], visibility: 'community' },
  { id: 'histoire_roi', category: 'patrimoine', subcategory: 'histoire', emoji: '👑', visualEmojis: ['👑', '🏰', '⚔️', '🎺', '📜'], titleFr: 'Histoire des rois', titleBa: 'Màsá kpààrà', audioPromptFr: 'Racontez l\'histoire d\'un roi', audioPromptBa: 'Màsá kpààrà', exampleFr: 'Le grand roi qui...', gradient: 'from-yellow-500 via-amber-500 to-orange-600', grooveColor: 'rgba(234,179,8,0.4)', glowColor: 'rgba(245,158,11,0.6)', tags: ['roi', 'royaume'], visibility: 'public' },
  { id: 'histoire_guerre', category: 'patrimoine', subcategory: 'histoire', emoji: '⚔️', visualEmojis: ['⚔️', '🛡️', '🐎', '🏹', '🎖️'], titleFr: 'Histoire de bataille', titleBa: 'Kɛ̀lɛ̀ kpààrà', audioPromptFr: 'Racontez une bataille de votre histoire', audioPromptBa: 'Kɛ̀lɛ̀ kpààrà', exampleFr: 'Quand nos ancêtres ont combattu...', gradient: 'from-red-700 via-rose-600 to-orange-500', grooveColor: 'rgba(185,28,28,0.4)', glowColor: 'rgba(225,29,72,0.6)', tags: ['guerre', 'bataille'], visibility: 'public' },
  { id: 'histoire_lieu', category: 'patrimoine', subcategory: 'histoire', emoji: '📍', visualEmojis: ['📍', '🏛️', '🌳', '💎', '✨'], titleFr: 'Lieu sacré', titleBa: 'Yɔ̀rɔ̀ sènùmàn', audioPromptFr: 'Parlez d\'un lieu sacré', audioPromptBa: 'Yɔ̀rɔ̀ sènùmàn kpààrà', exampleFr: 'Cet endroit est sacré car...', gradient: 'from-purple-600 via-violet-500 to-fuchsia-500', grooveColor: 'rgba(147,51,234,0.4)', glowColor: 'rgba(168,85,247,0.6)', tags: ['lieu', 'sacré'], visibility: 'community' },
  { id: 'histoire_tradition', category: 'patrimoine', subcategory: 'histoire', emoji: '🔥', visualEmojis: ['🔥', '🌙', '👥', '🙏', '✨'], titleFr: 'Tradition ancienne', titleBa: 'Làdá kɔ̀rɔ̀', audioPromptFr: 'Expliquez une tradition ancienne', audioPromptBa: 'Làdá kɔ̀rɔ̀ kpààrà', exampleFr: 'Depuis toujours, nous faisons...', gradient: 'from-orange-600 via-red-500 to-rose-500', grooveColor: 'rgba(234,88,12,0.4)', glowColor: 'rgba(239,68,68,0.6)', tags: ['tradition', 'coutume'], visibility: 'public' },
];

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATES VOIX DU VILLAGE - 25 Templates
// ═══════════════════════════════════════════════════════════════════════════

const villageVoiceTemplates: Template[] = [
  // ANNONCES (5)
  { id: 'annonce_reunion', category: 'village_voice', subcategory: 'annonce', emoji: '👥', visualEmojis: ['👥', '🗓️', '🏠', '⏰', '📢'], titleFr: 'Réunion', titleBa: 'Ɲɔ̀gɔ̀n-yé', audioPromptFr: 'Annoncez une réunion', audioPromptBa: 'Ɲɔ̀gɔ̀n-yé kùú', exampleFr: 'Réunion demain sous l\'arbre...', gradient: 'from-blue-500 via-indigo-500 to-violet-500', grooveColor: 'rgba(59,130,246,0.4)', glowColor: 'rgba(99,102,241,0.6)', tags: ['réunion', 'assemblée'], visibility: 'community' },
  { id: 'annonce_marche', category: 'village_voice', subcategory: 'annonce', emoji: '🏪', visualEmojis: ['🏪', '🍅', '💰', '📅', '🛒'], titleFr: 'Jour de marché', titleBa: 'Sùgú dɔ̀n', audioPromptFr: 'Annoncez le jour de marché', audioPromptBa: 'Sùgú kùú', exampleFr: 'Le marché sera...', gradient: 'from-emerald-500 via-green-500 to-lime-400', grooveColor: 'rgba(16,185,129,0.4)', glowColor: 'rgba(34,197,94,0.6)', tags: ['marché', 'commerce'], visibility: 'public' },
  { id: 'annonce_travaux', category: 'village_voice', subcategory: 'annonce', emoji: '🔨', visualEmojis: ['🔨', '🏗️', '👷', '🤝', '💪'], titleFr: 'Travaux collectifs', titleBa: 'Cí-báárá', audioPromptFr: 'Appelez pour des travaux collectifs', audioPromptBa: 'Cí-báárá kùú', exampleFr: 'Tous ensemble pour...', gradient: 'from-amber-500 via-orange-500 to-red-400', grooveColor: 'rgba(245,158,11,0.4)', glowColor: 'rgba(251,146,60,0.6)', tags: ['travaux', 'collectif'], visibility: 'community' },
  { id: 'annonce_visite', category: 'village_voice', subcategory: 'annonce', emoji: '🚗', visualEmojis: ['🚗', '👔', '🏛️', '📅', '🎉'], titleFr: 'Visite importante', titleBa: 'Náfà-tìgì nàná', audioPromptFr: 'Annoncez une visite importante', audioPromptBa: 'Náfà-tìgì nàná kùú', exampleFr: 'Le préfet va venir...', gradient: 'from-slate-600 via-gray-500 to-zinc-400', grooveColor: 'rgba(71,85,105,0.4)', glowColor: 'rgba(100,116,139,0.6)', tags: ['visite', 'officiel'], visibility: 'public' },
  { id: 'annonce_generale', category: 'village_voice', subcategory: 'annonce', emoji: '📢', visualEmojis: ['📢', '👂', '❗', '🏘️', '📣'], titleFr: 'Annonce générale', titleBa: 'Kùú bɛ̀ɛ̀', audioPromptFr: 'Faites une annonce au village', audioPromptBa: 'Kùú bɛ̀ɛ̀ yé', exampleFr: 'Écoutez tous...', gradient: 'from-blue-600 via-cyan-500 to-teal-400', grooveColor: 'rgba(37,99,235,0.4)', glowColor: 'rgba(6,182,212,0.6)', tags: ['annonce', 'tous'], visibility: 'community' },
  
  // CÉLÉBRATIONS (5)
  { id: 'joie_naissance', category: 'village_voice', subcategory: 'celebration', emoji: '👶', visualEmojis: ['👶', '🍼', '🎉', '❤️', '🙏'], titleFr: 'Naissance', titleBa: 'Dén wólò', audioPromptFr: 'Annoncez une naissance', audioPromptBa: 'Dén wólò kùú', exampleFr: 'Un enfant est né !', gradient: 'from-pink-400 via-rose-400 to-red-300', grooveColor: 'rgba(244,114,182,0.4)', glowColor: 'rgba(251,113,133,0.6)', tags: ['naissance', 'bébé'], visibility: 'public' },
  { id: 'joie_mariage', category: 'village_voice', subcategory: 'celebration', emoji: '💒', visualEmojis: ['💒', '👰', '🤵', '💍', '🎊'], titleFr: 'Mariage', titleBa: 'Fúrú', audioPromptFr: 'Annoncez un mariage', audioPromptBa: 'Fúrú kùú', exampleFr: 'X et Y vont se marier...', gradient: 'from-red-400 via-pink-400 to-rose-300', grooveColor: 'rgba(248,113,113,0.4)', glowColor: 'rgba(244,114,182,0.6)', tags: ['mariage', 'amour'], visibility: 'public' },
  { id: 'joie_reussite', category: 'village_voice', subcategory: 'celebration', emoji: '🎓', visualEmojis: ['🎓', '📚', '🏆', '👏', '🌟'], titleFr: 'Réussite scolaire', titleBa: 'Kàlàn sègin', audioPromptFr: 'Célébrez une réussite', audioPromptBa: 'Kàlàn sègin kùú', exampleFr: 'Félicitations à X...', gradient: 'from-indigo-500 via-blue-500 to-cyan-400', grooveColor: 'rgba(99,102,241,0.4)', glowColor: 'rgba(59,130,246,0.6)', tags: ['études', 'diplôme'], visibility: 'public' },
  { id: 'joie_guerison', category: 'village_voice', subcategory: 'celebration', emoji: '💪', visualEmojis: ['💪', '🏥', '🙏', '❤️', '🎉'], titleFr: 'Guérison', titleBa: 'Kɛ́nɛ̀yá sɔ̀rɔ̀', audioPromptFr: 'Annoncez une guérison', audioPromptBa: 'Kɛ́nɛ̀yá sɔ̀rɔ̀ kùú', exampleFr: 'X est guéri !', gradient: 'from-green-400 via-emerald-400 to-teal-300', grooveColor: 'rgba(74,222,128,0.4)', glowColor: 'rgba(52,211,153,0.6)', tags: ['guérison', 'santé'], visibility: 'public' },
  { id: 'joie_generale', category: 'village_voice', subcategory: 'celebration', emoji: '🎉', visualEmojis: ['🎉', '🎊', '🥳', '🙌', '✨'], titleFr: 'Bonne nouvelle', titleBa: 'Kíbárú ɲùmàn', audioPromptFr: 'Partagez une bonne nouvelle', audioPromptBa: 'Kíbárú ɲùmàn', exampleFr: 'J\'ai une bonne nouvelle...', gradient: 'from-yellow-400 via-amber-400 to-orange-400', grooveColor: 'rgba(250,204,21,0.4)', glowColor: 'rgba(251,191,36,0.6)', tags: ['joie', 'nouvelle'], visibility: 'public' },
  
  // AIDE (5)
  { id: 'aide_sante', category: 'village_voice', subcategory: 'help', emoji: '🏥', visualEmojis: ['🏥', '🤒', '💊', '🚑', '🙏'], titleFr: 'Aide santé', titleBa: 'Kɛ́nɛ̀yá dɛ̀mɛ̀', audioPromptFr: 'Demandez de l\'aide pour la santé', audioPromptBa: 'Kɛ́nɛ̀yá dɛ̀mɛ̀ ɲìní', exampleFr: 'Quelqu\'un est malade...', gradient: 'from-red-500 via-rose-500 to-pink-400', grooveColor: 'rgba(239,68,68,0.4)', glowColor: 'rgba(244,63,94,0.6)', tags: ['santé', 'urgence'], visibility: 'community', urgency: 'urgent' },
  { id: 'aide_argent', category: 'village_voice', subcategory: 'help', emoji: '💰', visualEmojis: ['💰', '🤲', '🙏', '❤️', '🤝'], titleFr: 'Aide financière', titleBa: 'Wári dɛ̀mɛ̀', audioPromptFr: 'Demandez une aide financière', audioPromptBa: 'Wári dɛ̀mɛ̀ ɲìní', exampleFr: 'J\'ai besoin d\'aide pour...', gradient: 'from-amber-500 via-yellow-500 to-lime-400', grooveColor: 'rgba(245,158,11,0.4)', glowColor: 'rgba(234,179,8,0.6)', tags: ['argent', 'solidarité'], visibility: 'community' },
  { id: 'aide_travail', category: 'village_voice', subcategory: 'help', emoji: '🌾', visualEmojis: ['🌾', '👨‍🌾', '💪', '🤝', '☀️'], titleFr: 'Aide aux champs', titleBa: 'Fòrò dɛ̀mɛ̀', audioPromptFr: 'Demandez de l\'aide aux champs', audioPromptBa: 'Fòrò dɛ̀mɛ̀ ɲìní', exampleFr: 'J\'ai besoin de bras pour...', gradient: 'from-green-500 via-emerald-500 to-teal-400', grooveColor: 'rgba(34,197,94,0.4)', glowColor: 'rgba(16,185,129,0.6)', tags: ['champs', 'entraide'], visibility: 'community' },
  { id: 'aide_deuil', category: 'village_voice', subcategory: 'help', emoji: '🕯️', visualEmojis: ['🕯️', '💔', '🙏', '🤲', '❤️'], titleFr: 'Aide pour deuil', titleBa: 'Sú dɛ̀mɛ̀', audioPromptFr: 'Demandez du soutien après un décès', audioPromptBa: 'Sú dɛ̀mɛ̀ ɲìní', exampleFr: 'Nous avons perdu...', gradient: 'from-gray-600 via-slate-500 to-zinc-400', grooveColor: 'rgba(71,85,105,0.4)', glowColor: 'rgba(100,116,139,0.6)', tags: ['deuil', 'soutien'], visibility: 'community' },
  { id: 'aide_generale', category: 'village_voice', subcategory: 'help', emoji: '🙏', visualEmojis: ['🙏', '🤲', '❤️', '🤝', '💪'], titleFr: 'Demande d\'aide', titleBa: 'Dɛ̀mɛ̀ ɲìní', audioPromptFr: 'Demandez de l\'aide', audioPromptBa: 'Dɛ̀mɛ̀ ɲìní', exampleFr: 'J\'ai besoin de votre aide...', gradient: 'from-rose-500 via-red-500 to-orange-400', grooveColor: 'rgba(244,63,94,0.4)', glowColor: 'rgba(239,68,68,0.6)', tags: ['aide', 'solidarité'], visibility: 'community' },
  
  // QUESTIONS (5)
  { id: 'question_sante', category: 'village_voice', subcategory: 'question', emoji: '💊', visualEmojis: ['💊', '🤔', '🌿', '👨‍⚕️', '❓'], titleFr: 'Question santé', titleBa: 'Kɛ́nɛ̀yá ɲìnìnkàlí', audioPromptFr: 'Posez une question santé', audioPromptBa: 'Kɛ́nɛ̀yá ɲìnìnkàlí', exampleFr: 'Qui connaît un remède...?', gradient: 'from-teal-500 via-cyan-500 to-blue-400', grooveColor: 'rgba(20,184,166,0.4)', glowColor: 'rgba(6,182,212,0.6)', tags: ['santé', 'remède'], visibility: 'community' },
  { id: 'question_agriculture', category: 'village_voice', subcategory: 'question', emoji: '🌱', visualEmojis: ['🌱', '🤔', '👨‍🌾', '☀️', '❓'], titleFr: 'Question agriculture', titleBa: 'Sɛ̀nɛ̀ ɲìnìnkàlí', audioPromptFr: 'Posez une question sur l\'agriculture', audioPromptBa: 'Sɛ̀nɛ̀ ɲìnìnkàlí', exampleFr: 'Comment faire pour...?', gradient: 'from-green-500 via-lime-500 to-yellow-400', grooveColor: 'rgba(34,197,94,0.4)', glowColor: 'rgba(132,204,22,0.6)', tags: ['agriculture', 'conseil'], visibility: 'community' },
  { id: 'question_perdu', category: 'village_voice', subcategory: 'question', emoji: '🔍', visualEmojis: ['🔍', '❓', '👀', '🐄', '📍'], titleFr: 'Objet/Animal perdu', titleBa: 'Fɛ̀n tùnú', audioPromptFr: 'Demandez si quelqu\'un a vu...', audioPromptBa: 'Fɛ̀n tùnú ɲìnìnkàlí', exampleFr: 'Qui a vu mon/ma...?', gradient: 'from-purple-500 via-violet-500 to-fuchsia-400', grooveColor: 'rgba(168,85,247,0.4)', glowColor: 'rgba(192,132,252,0.6)', tags: ['perdu', 'recherche'], visibility: 'community' },
  { id: 'question_conseil', category: 'village_voice', subcategory: 'question', emoji: '🤔', visualEmojis: ['🤔', '💭', '👥', '💡', '❓'], titleFr: 'Demander conseil', titleBa: 'Làdílí ɲìní', audioPromptFr: 'Demandez un conseil', audioPromptBa: 'Làdílí ɲìnìnkàlí', exampleFr: 'Que me conseillez-vous...?', gradient: 'from-indigo-500 via-blue-500 to-cyan-400', grooveColor: 'rgba(99,102,241,0.4)', glowColor: 'rgba(59,130,246,0.6)', tags: ['conseil', 'avis'], visibility: 'community' },
  { id: 'question_cherche', category: 'village_voice', subcategory: 'question', emoji: '👤', visualEmojis: ['👤', '🔍', '📞', '🏘️', '❓'], titleFr: 'Cherche quelqu\'un', titleBa: 'Mɔ̀gɔ̀ ɲìní', audioPromptFr: 'Cherchez quelqu\'un', audioPromptBa: 'Mɔ̀gɔ̀ ɲìnìnkàlí', exampleFr: 'Qui connaît un bon...?', gradient: 'from-orange-500 via-amber-500 to-yellow-400', grooveColor: 'rgba(249,115,22,0.4)', glowColor: 'rgba(245,158,11,0.6)', tags: ['recherche', 'contact'], visibility: 'community' },
  
  // ALERTES (5)
  { id: 'alerte_meteo', category: 'village_voice', subcategory: 'alert', emoji: '⛈️', visualEmojis: ['⛈️', '🌊', '💨', '⚠️', '🏠'], titleFr: 'Alerte météo', titleBa: 'Sán gbàrà', audioPromptFr: 'Alertez sur un danger météo', audioPromptBa: 'Sán gbàrà kùú', exampleFr: 'Attention, forte pluie...', gradient: 'from-slate-600 via-blue-600 to-cyan-500', grooveColor: 'rgba(71,85,105,0.4)', glowColor: 'rgba(37,99,235,0.6)', tags: ['météo', 'danger'], visibility: 'public', urgency: 'urgent' },
  { id: 'alerte_sante', category: 'village_voice', subcategory: 'alert', emoji: '🦠', visualEmojis: ['🦠', '😷', '⚠️', '🏥', '📢'], titleFr: 'Alerte sanitaire', titleBa: 'Bànà gbàrà', audioPromptFr: 'Alertez sur une maladie', audioPromptBa: 'Bànà gbàrà kùú', exampleFr: 'Attention, maladie...', gradient: 'from-red-600 via-rose-600 to-pink-500', grooveColor: 'rgba(220,38,38,0.4)', glowColor: 'rgba(225,29,72,0.6)', tags: ['maladie', 'épidémie'], visibility: 'public', urgency: 'critical' },
  { id: 'alerte_route', category: 'village_voice', subcategory: 'alert', emoji: '🚧', visualEmojis: ['🚧', '🚗', '⚠️', '🛣️', '❌'], titleFr: 'Route coupée', titleBa: 'Sírá tìgɛ́', audioPromptFr: 'Signalez une route coupée', audioPromptBa: 'Sírá tìgɛ́ gbàrà', exampleFr: 'La route de X est coupée...', gradient: 'from-orange-600 via-amber-600 to-yellow-500', grooveColor: 'rgba(234,88,12,0.4)', glowColor: 'rgba(245,158,11,0.6)', tags: ['route', 'danger'], visibility: 'public', urgency: 'urgent' },
  { id: 'alerte_animaux', category: 'village_voice', subcategory: 'alert', emoji: '🐍', visualEmojis: ['🐍', '🦂', '⚠️', '👀', '🏃'], titleFr: 'Animal dangereux', titleBa: 'Sògò júgú', audioPromptFr: 'Signalez un animal dangereux', audioPromptBa: 'Sògò júgú gbàrà', exampleFr: 'Attention, serpent vu à...', gradient: 'from-lime-600 via-green-600 to-emerald-500', grooveColor: 'rgba(101,163,13,0.4)', glowColor: 'rgba(22,163,74,0.6)', tags: ['animal', 'serpent'], visibility: 'community', urgency: 'urgent' },
  { id: 'alerte_vol', category: 'village_voice', subcategory: 'alert', emoji: '🚨', visualEmojis: ['🚨', '👤', '🏃', '⚠️', '📢'], titleFr: 'Vol / Insécurité', titleBa: 'Sònyàlí gbàrà', audioPromptFr: 'Signalez un vol ou insécurité', audioPromptBa: 'Sònyàlí gbàrà kùú', exampleFr: 'Attention, vol signalé...', gradient: 'from-red-700 via-rose-700 to-pink-600', grooveColor: 'rgba(185,28,28,0.4)', glowColor: 'rgba(190,18,60,0.6)', tags: ['vol', 'sécurité'], visibility: 'community', urgency: 'critical' },
];

// ═══════════════════════════════════════════════════════════════════════════
// COMPOSANT: DISQUE VINYLE DYNAMIQUE
// ═══════════════════════════════════════════════════════════════════════════

interface VinylDiscProps {
  template: Template;
  isPlaying: boolean;
  isRecording?: boolean;
  progress: number;
  amplitude?: number;
  size?: number;
  showPlayButton?: boolean;
  onPlayPause?: () => void;
}

const VinylDisc: React.FC<VinylDiscProps> = ({
  template,
  isPlaying,
  isRecording = false,
  progress,
  amplitude = 0,
  size = 240,
  showPlayButton = false,
  onPlayPause
}) => {
  const rotation = useMotionValue(0);
  const animationRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);
  
  // Animation de rotation continue
  useEffect(() => {
    const shouldRotate = isPlaying || isRecording;
    
    if (shouldRotate) {
      const animate = (time: number) => {
        if (lastTimeRef.current) {
          const delta = time - lastTimeRef.current;
          const speed = isRecording ? 20 : 15; // Plus rapide en enregistrement
          rotation.set(rotation.get() + (delta / 1000) * speed);
        }
        lastTimeRef.current = time;
        animationRef.current = requestAnimationFrame(animate);
      };
      animationRef.current = requestAnimationFrame(animate);
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      lastTimeRef.current = 0;
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, isRecording, rotation]);

  const rotateTransform = useTransform(rotation, (r) => `rotate(${r}deg)`);
  
  // Progress ring
  const circumference = 2 * Math.PI * (size / 2 - 6);
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* Progress Ring externe */}
      <svg className="absolute inset-0 -rotate-90" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2 - 6}
          fill="none"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth="4"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2 - 6}
          fill="none"
          stroke={isRecording ? "#ef4444" : "rgba(255,255,255,0.9)"}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          animate={isRecording ? { 
            stroke: ["#ef4444", "#f97316", "#ef4444"],
          } : {}}
          transition={{ repeat: Infinity, duration: 1 }}
          style={{ transition: 'stroke-dashoffset 0.3s ease' }}
        />
      </svg>
      
      {/* Glow effet */}
      <motion.div
        className={`absolute inset-3 rounded-full bg-gradient-to-br ${template.gradient}`}
        style={{ filter: 'blur(20px)' }}
        animate={{
          scale: (isPlaying || isRecording) ? 1 + amplitude * 0.2 : 1,
          opacity: (isPlaying || isRecording) ? 0.5 + amplitude * 0.3 : 0.3,
        }}
        transition={{ duration: 0.1 }}
      />
      
      {/* Le Vinyle */}
      <motion.div
        className="absolute inset-3 rounded-full overflow-hidden shadow-2xl cursor-pointer"
        style={{ transform: rotateTransform }}
        onClick={onPlayPause}
        whileTap={{ scale: 0.98 }}
      >
        {/* Fond gradient */}
        <div className={`absolute inset-0 bg-gradient-to-br ${template.gradient}`} />
        
        {/* Rainures du vinyle */}
        <div className="absolute inset-0">
          {[...Array(10)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full border"
              style={{
                inset: `${10 + i * 6}%`,
                borderColor: template.grooveColor,
                borderWidth: i % 3 === 0 ? '2px' : '1px',
              }}
            />
          ))}
        </div>
        
        {/* Reflet */}
        <div
          className="absolute inset-0 bg-gradient-to-br from-white/25 via-transparent to-transparent"
          style={{ clipPath: 'polygon(0 0, 55% 0, 35% 100%, 0 100%)' }}
        />
        
        {/* Centre du disque */}
        <div className="absolute inset-[28%] rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center shadow-inner">
          <motion.span
            className="text-5xl"
            animate={(isPlaying || isRecording) ? { scale: [1, 1.15, 1] } : {}}
            transition={{ repeat: Infinity, duration: 1.5 }}
          >
            {template.emoji}
          </motion.span>
        </div>
        
        {/* Trou central */}
        <div className="absolute inset-[45%] rounded-full bg-black shadow-inner" />
      </motion.div>
      
      {/* Bouton Play/Pause overlay */}
      {showPlayButton && !isRecording && (
        <motion.button
          className="absolute inset-0 flex items-center justify-center"
          onClick={onPlayPause}
          whileTap={{ scale: 0.95 }}
        >
          <div className="w-16 h-16 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-xl">
            {isPlaying ? (
              <Pause className="w-8 h-8 text-gray-800" />
            ) : (
              <Play className="w-8 h-8 text-gray-800 ml-1" />
            )}
          </div>
        </motion.button>
      )}
      
      {/* Indicateur enregistrement */}
      {isRecording && (
        <motion.div
          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center shadow-lg"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 0.8 }}
        >
          <div className="w-3 h-3 bg-white rounded-full" />
        </motion.div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// COMPOSANT: ONDE SONORE ANIMÉE
// ═══════════════════════════════════════════════════════════════════════════

interface AudioWaveformProps {
  isActive: boolean;
  barCount?: number;
  color?: string;
}

const AudioWaveform: React.FC<AudioWaveformProps> = ({ 
  isActive, 
  barCount = 32,
  color = 'white'
}) => {
  return (
    <div className="flex items-center justify-center gap-[3px] h-16 px-4">
      {[...Array(barCount)].map((_, i) => (
        <motion.div
          key={i}
          className="w-1 rounded-full"
          style={{ backgroundColor: color, opacity: 0.7 }}
          animate={isActive ? {
            height: [12, Math.random() * 40 + 20, 12],
          } : { height: 12 }}
          transition={{
            repeat: Infinity,
            duration: 0.35 + Math.random() * 0.25,
            delay: i * 0.015,
          }}
        />
      ))}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

export const TamTamCreatePost: React.FC<TamTamCreatePostProps> = ({
  isOpen,
  onClose,
  onSubmit,
  onOpenPoll
}) => {
  const { t, currentLang } = useTamTamLanguage();
  const { toast } = useToast();
  const { transcribeWithTranslation } = useUnifiedAudio();
  const { speakLabel } = useVoiceMenu();
  
  // États
  const [step, setStep] = useState<'category' | 'templates' | 'record' | 'preview'>('category');
  const [mainCategory, setMainCategory] = useState<'patrimoine' | 'village_voice' | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [transcript, setTranscript] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPlayingPrompt, setIsPlayingPrompt] = useState(false);
  
  // États enregistrement
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordingProgress, setRecordingProgress] = useState(0);
  const [amplitude, setAmplitude] = useState(0);
  const maxRecordingTime = 120; // 2 minutes max
  
  // États preview
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);

  // Timer enregistrement
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime(t => {
          const newTime = t + 0.1;
          setRecordingProgress((newTime / maxRecordingTime) * 100);
          // Simuler amplitude
          setAmplitude(Math.random() * 0.6 + 0.2);
          return newTime;
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const playAudioPrompt = (text: string) => {
    setIsPlayingPrompt(true);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fr-FR';
    utterance.rate = 0.85;
    utterance.onend = () => setIsPlayingPrompt(false);
    window.speechSynthesis.speak(utterance);
  };

  const getFilteredTemplates = () => {
    if (!mainCategory) return [];
    return mainCategory === 'patrimoine' ? patrimoineTemplates : villageVoiceTemplates;
  };

  const handleTemplateSelect = (template: Template) => {
    setSelectedTemplate(template);
    triggerFeedback('notification');
    playAudioPrompt(currentLang === 'ba' ? template.audioPromptBa : template.audioPromptFr);
    setStep('record');
  };

  const handleRecordingComplete = async (base64: string, duration?: number) => {
    setIsRecording(false);
    setAudioBase64(base64);
    setAudioDuration(duration || recordingTime);
    triggerFeedback('success');
    
    const result = await transcribeWithTranslation(base64, currentLang === 'ba' ? 'ba' : 'fr');
    if (result.transcription) {
      setTranscript(result.transcription);
    }
    
    setStep('preview');
  };

  const handlePlayPreview = () => {
    if (!audioBase64) return;
    
    if (isPlayingPreview) {
      audioPreviewRef.current?.pause();
      setIsPlayingPreview(false);
    } else {
      if (!audioPreviewRef.current) {
        audioPreviewRef.current = new Audio(audioBase64);
        audioPreviewRef.current.onended = () => {
          setIsPlayingPreview(false);
          setPlaybackProgress(0);
        };
        audioPreviewRef.current.ontimeupdate = () => {
          if (audioPreviewRef.current) {
            setPlaybackProgress((audioPreviewRef.current.currentTime / audioPreviewRef.current.duration) * 100);
          }
        };
      }
      audioPreviewRef.current.play();
      setIsPlayingPreview(true);
    }
    triggerFeedback('selection');
  };

  const handleSubmit = async () => {
    if (!audioBase64 || !selectedTemplate) return;
    
    setIsSubmitting(true);
    try {
      const audioBlob = base64ToBlob(audioBase64, 'audio/webm');
      const audioFileName = `post_${Date.now()}.webm`;
      
      const { error } = await supabase.storage
        .from('tamtam-audio')
        .upload(audioFileName, audioBlob);
      
      if (error) throw error;
      
      const { data: urlData } = supabase.storage
        .from('tamtam-audio')
        .getPublicUrl(audioFileName);

      await onSubmit({
        audio_url: urlData.publicUrl,
        media_type: selectedTemplate.id,
        template_id: selectedTemplate.id,
        category: selectedTemplate.category,
        subcategory: selectedTemplate.subcategory,
        transcript_fr: transcript,
        duration_seconds: audioDuration,
        visibility: selectedTemplate.visibility,
        urgency: selectedTemplate.urgency,
      });

      triggerFeedback('success');
      playAudioPrompt('Votre message a été envoyé avec succès');
      resetState();
      onClose();
    } catch (err: any) {
      triggerFeedback('error');
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetState = () => {
    setStep('category');
    setMainCategory(null);
    setSelectedTemplate(null);
    setAudioBase64(null);
    setAudioDuration(0);
    setTranscript('');
    setRecordingTime(0);
    setRecordingProgress(0);
    setIsRecording(false);
    setIsPlayingPreview(false);
    setPlaybackProgress(0);
    if (audioPreviewRef.current) {
      audioPreviewRef.current.pause();
      audioPreviewRef.current = null;
    }
  };

  const base64ToBlob = (base64: string, mimeType: string): Blob => {
    const byteCharacters = atob(base64.split(',')[1] || base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    return new Blob([new Uint8Array(byteNumbers)], { type: mimeType });
  };

  const goBack = () => {
    triggerFeedback('notification');
    if (step === 'templates') setStep('category');
    else if (step === 'record') { setStep('templates'); setRecordingTime(0); setRecordingProgress(0); }
    else if (step === 'preview') setStep('record');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-lg bg-gradient-to-b from-slate-900 to-black rounded-t-[2.5rem] min-h-[75vh] max-h-[95vh] flex flex-col shadow-2xl overflow-hidden"
      >
        {/* HEADER */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            {step !== 'category' && (
              <motion.button whileTap={{ scale: 0.9 }} onClick={goBack} className="w-11 h-11 rounded-full bg-white/10 flex items-center justify-center text-white text-lg">←</motion.button>
            )}
            <div>
              <h3 className="text-lg font-bold text-white">
                {step === 'category' && '🎙️ Nouveau message'}
                {step === 'templates' && (mainCategory === 'patrimoine' ? '🏛️ Patrimoine' : '📢 Village')}
                {step === 'record' && '🎤 Enregistrer'}
                {step === 'preview' && '✅ Aperçu'}
              </h3>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {selectedTemplate && (
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => playAudioPrompt(selectedTemplate.audioPromptFr)}
                disabled={isPlayingPrompt}
                className={`w-11 h-11 rounded-full flex items-center justify-center text-lg ${isPlayingPrompt ? 'bg-blue-500 animate-pulse' : 'bg-white/10'}`}
              >🔊</motion.button>
            )}
            <motion.button whileTap={{ scale: 0.9 }} onClick={onClose} className="w-11 h-11 rounded-full bg-white/10 flex items-center justify-center text-white text-lg">✕</motion.button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            
            {/* STEP 1: CATÉGORIE */}
            {step === 'category' && (
              <motion.div key="category" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-4 space-y-4">
                <p className="text-center text-white/60 text-sm mb-2">Touchez pour choisir</p>
                
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => { setMainCategory('patrimoine'); setStep('templates'); triggerFeedback('notification'); }}
                  className="w-full p-5 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white shadow-xl"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-5xl">🏛️</span>
                    <div className="text-left">
                      <div className="text-2xl font-bold">Patrimoine</div>
                      <div className="text-white/80">Kpààrà</div>
                      <div className="flex gap-1 mt-1">{['📖', '🎵', '💬', '🌿', '🏛️'].map((e, i) => <span key={i} className="text-lg">{e}</span>)}</div>
                    </div>
                  </div>
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => { setMainCategory('village_voice'); setStep('templates'); triggerFeedback('notification'); }}
                  className="w-full p-5 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white shadow-xl"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-5xl">📢</span>
                    <div className="text-left">
                      <div className="text-2xl font-bold">Voix du Village</div>
                      <div className="text-white/80">Kùú dɔ̀ɔ̀rɔ̀</div>
                      <div className="flex gap-1 mt-1">{['📢', '🙏', '🎉', '❓', '🚨'].map((e, i) => <span key={i} className="text-lg">{e}</span>)}</div>
                    </div>
                  </div>
                </motion.button>
              </motion.div>
            )}

            {/* STEP 2: TEMPLATES */}
            {step === 'templates' && (
              <motion.div key="templates" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-4">
                <p className="text-center text-white/60 text-sm mb-3">Choisissez le type</p>
                <div className="grid grid-cols-3 gap-2">
                  {getFilteredTemplates().map((template, index) => (
                    <motion.button
                      key={template.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.02 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleTemplateSelect(template)}
                      className={`aspect-square rounded-xl bg-gradient-to-br ${template.gradient} p-2 flex flex-col items-center justify-center shadow-lg relative`}
                    >
                      <span className="text-3xl mb-1">{template.emoji}</span>
                      <span className="text-white font-semibold text-[10px] text-center leading-tight">{template.titleFr}</span>
                      {template.urgency === 'critical' && <div className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-ping" />}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* STEP 3: ENREGISTREMENT AVEC VINYLE */}
            {step === 'record' && selectedTemplate && (
              <motion.div key="record" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center py-6 px-4">
                
                {/* Fond gradient subtil */}
                <div className={`absolute inset-0 bg-gradient-to-b ${selectedTemplate.gradient} opacity-10`} />
                
                {/* Disque Vinyle */}
                <div className="relative z-10 mb-4">
                  <VinylDisc
                    template={selectedTemplate}
                    isPlaying={false}
                    isRecording={isRecording}
                    progress={recordingProgress}
                    amplitude={amplitude}
                    size={220}
                  />
                </div>

                {/* Titre et traduction */}
                <div className="text-center mb-4 relative z-10">
                  <h3 className="text-xl font-bold text-white">{selectedTemplate.titleFr}</h3>
                  <p className="text-white/60 text-sm">{selectedTemplate.titleBa}</p>
                </div>

                {/* Emojis visuels */}
                <div className="flex gap-2 mb-4 relative z-10">
                  {selectedTemplate.visualEmojis.map((emoji, i) => (
                    <motion.span
                      key={i}
                      className="text-2xl"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                    >
                      {emoji}
                    </motion.span>
                  ))}
                </div>

                {/* Onde sonore */}
                <div className="mb-4 relative z-10">
                  <AudioWaveform isActive={isRecording} barCount={28} color="white" />
                </div>

                {/* Timer */}
                <div className="text-center mb-4 relative z-10">
                  <span className="text-4xl font-mono text-white font-bold">
                    {formatTime(recordingTime)}
                  </span>
                  <span className="text-white/40 text-lg ml-2">/ {formatTime(maxRecordingTime)}</span>
                </div>

                {/* Prompt audio */}
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 mb-6 max-w-xs relative z-10">
                  <p className="text-white/80 text-sm text-center">
                    {currentLang === 'ba' ? selectedTemplate.audioPromptBa : selectedTemplate.audioPromptFr}
                  </p>
                </div>

                {/* Smart Voice Recorder intégré */}
                <div className="relative z-10">
                  <SmartVoiceRecorder
                    onRecordingComplete={handleRecordingComplete}
                    onRecordingStart={() => setIsRecording(true)}
                    onRecordingStop={() => setIsRecording(false)}
                    language={currentLang === 'ba' ? 'bariba' : 'french'}
                  />
                </div>

                {/* Exemple */}
                <div className="mt-4 text-center relative z-10">
                  <p className="text-white/40 text-xs">💡 Exemple :</p>
                  <p className="text-white/60 text-sm italic">"{selectedTemplate.exampleFr}"</p>
                </div>
              </motion.div>
            )}

            {/* STEP 4: PREVIEW AVEC VINYLE */}
            {step === 'preview' && selectedTemplate && (
              <motion.div key="preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center py-6 px-4">
                
                {/* Fond gradient */}
                <div className={`absolute inset-0 bg-gradient-to-b ${selectedTemplate.gradient} opacity-15`} />
                
                {/* Disque Vinyle avec lecture */}
                <div className="relative z-10 mb-4">
                  <VinylDisc
                    template={selectedTemplate}
                    isPlaying={isPlayingPreview}
                    progress={playbackProgress}
                    size={240}
                    showPlayButton={true}
                    onPlayPause={handlePlayPreview}
                  />
                </div>

                {/* Info template */}
                <div className="text-center mb-3 relative z-10">
                  <h3 className="text-xl font-bold text-white">{selectedTemplate.titleFr}</h3>
                  <p className="text-white/60 text-sm">{selectedTemplate.titleBa}</p>
                </div>

                {/* Emojis */}
                <div className="flex gap-2 mb-4 relative z-10">
                  {selectedTemplate.visualEmojis.map((emoji, i) => (
                    <span key={i} className="text-2xl">{emoji}</span>
                  ))}
                </div>

                {/* Info audio */}
                <div className={`rounded-xl bg-gradient-to-r ${selectedTemplate.gradient} p-4 mb-4 w-full max-w-xs relative z-10`}>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                      <Mic className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-bold">Audio enregistré</p>
                      <p className="text-white/70 text-sm">{formatTime(audioDuration)}</p>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-green-500 flex items-center justify-center">
                      <Check className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </div>

                {/* Transcription */}
                {transcript && (
                  <div className="bg-white/10 rounded-xl p-3 mb-4 w-full max-w-xs relative z-10">
                    <p className="text-white/50 text-xs mb-1">📝 Transcription :</p>
                    <p className="text-white/80 text-sm">{transcript}</p>
                  </div>
                )}

                {/* Badges */}
                <div className="flex gap-2 relative z-10">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    selectedTemplate.visibility === 'public' ? 'bg-green-500/20 text-green-300' : 
                    selectedTemplate.visibility === 'community' ? 'bg-blue-500/20 text-blue-300' : 'bg-purple-500/20 text-purple-300'
                  }`}>
                    {selectedTemplate.visibility === 'public' ? '🌍 Public' : selectedTemplate.visibility === 'community' ? '🏘️ Village' : '🔒 Privé'}
                  </span>
                  {selectedTemplate.urgency && (
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      selectedTemplate.urgency === 'critical' ? 'bg-red-500/20 text-red-300' : 'bg-orange-500/20 text-orange-300'
                    }`}>
                      {selectedTemplate.urgency === 'critical' ? '🔴 Critique' : '🟠 Urgent'}
                    </span>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* FOOTER */}
        {step === 'preview' && (
          <div className="p-4 border-t border-white/10 flex gap-3">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => { setStep('record'); setRecordingTime(0); setRecordingProgress(0); setAudioBase64(null); }}
              className="py-3 px-5 rounded-xl bg-white/10 text-white font-semibold flex items-center gap-2"
            >
              <RotateCcw className="w-5 h-5" />
              Refaire
            </motion.button>
            
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={`flex-1 py-3 rounded-xl font-bold text-lg flex items-center justify-center gap-2 text-white shadow-lg bg-gradient-to-r ${
                selectedTemplate?.category === 'patrimoine' ? 'from-amber-500 to-orange-500' : 'from-emerald-500 to-teal-500'
              }`}
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-5 h-5" /> Envoyer</>}
            </motion.button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default TamTamCreatePost;
