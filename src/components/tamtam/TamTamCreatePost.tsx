import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { 
  X, Mic, Check, Loader2, Volume2, Play, Pause,
  ChevronLeft, RotateCcw, Send, Globe, Users as UsersIcon
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════
// 🎵 TAM-TAM CREATE POST - iOS GLASSY + VINYLE
// ═══════════════════════════════════════════════════════════════════════════

interface TamTamCreatePostProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (postData: any) => Promise<void>;
  onOpenPoll?: () => void;
  initialCategory?: 'patrimoine' | 'village_voice';
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
  discGradient: string;
  visibility: 'public' | 'community' | 'vault';
  urgency?: 'normal' | 'urgent' | 'critical';
}

// 55 TEMPLATES
const patrimoineTemplates: Template[] = [
  { id: 'conte_animaux', category: 'patrimoine', subcategory: 'conte', emoji: '🦁', visualEmojis: ['🦁', '🐘', '🐢', '🌙', '✨'], titleFr: 'Conte des animaux', titleBa: 'Sìírà nɛ̀ɛ̀má', audioPromptFr: 'Racontez un conte avec des animaux', audioPromptBa: 'Sìírà nɛ̀ɛ̀má kà sɔ̀ɔ̀', exampleFr: 'Il était une fois...', gradient: 'from-amber-500 to-orange-600', discGradient: 'from-amber-400 via-orange-500 to-red-500', visibility: 'public' },
  { id: 'conte_origine', category: 'patrimoine', subcategory: 'conte', emoji: '🌍', visualEmojis: ['🌍', '👤', '🌅', '🏔️', '💫'], titleFr: 'Origine du monde', titleBa: 'Dùnìyá bɛ̀rɛ̀', audioPromptFr: 'Racontez comment le monde a été créé', audioPromptBa: 'Dùnìyá bɛ̀rɛ̀ sìírà', exampleFr: 'Au commencement...', gradient: 'from-indigo-500 to-purple-600', discGradient: 'from-blue-400 via-indigo-500 to-purple-600', visibility: 'public' },
  { id: 'conte_heros', category: 'patrimoine', subcategory: 'conte', emoji: '⚔️', visualEmojis: ['👑', '⚔️', '🐎', '🏰', '🎖️'], titleFr: 'Héros légendaire', titleBa: 'Gànnú fàráfìn', audioPromptFr: "Racontez l'histoire d'un héros", audioPromptBa: 'Gànnú fàráfìn sìírà', exampleFr: 'Il y avait un grand guerrier...', gradient: 'from-red-500 to-rose-600', discGradient: 'from-red-400 via-rose-500 to-pink-500', visibility: 'public' },
  { id: 'conte_enfant', category: 'patrimoine', subcategory: 'conte', emoji: '👶', visualEmojis: ['👶', '🌟', '🧚', '🌈', '😴'], titleFr: 'Conte pour enfants', titleBa: 'Dénmísɛ́n sìírà', audioPromptFr: 'Racontez une histoire pour les enfants', audioPromptBa: 'Dénmísɛ́n sìírà', exampleFr: 'Pour que les enfants dorment...', gradient: 'from-pink-400 to-purple-500', discGradient: 'from-pink-300 via-purple-400 to-indigo-400', visibility: 'public' },
  { id: 'conte_ruse', category: 'patrimoine', subcategory: 'conte', emoji: '🦊', visualEmojis: ['🦊', '🤔', '💡', '😂', '🎭'], titleFr: 'Conte de ruse', titleBa: 'Hàkílì sìírà', audioPromptFr: 'Racontez une histoire où le plus malin gagne', audioPromptBa: 'Hàkílì sìírà', exampleFr: 'Le lièvre était plus malin...', gradient: 'from-orange-400 to-amber-500', discGradient: 'from-yellow-400 via-orange-500 to-amber-500', visibility: 'public' },
  { id: 'conte_moral', category: 'patrimoine', subcategory: 'conte', emoji: '⚖️', visualEmojis: ['⚖️', '❤️', '🙏', '✨', '🕊️'], titleFr: 'Conte moral', titleBa: 'Kɔ̀nɔ̀ sìírà', audioPromptFr: 'Racontez une histoire avec une leçon', audioPromptBa: 'Kɔ̀nɔ̀ sìírà kálan', exampleFr: 'Cette histoire nous apprend...', gradient: 'from-teal-500 to-cyan-600', discGradient: 'from-emerald-400 via-teal-500 to-cyan-500', visibility: 'public' },
  { id: 'musique_mariage', category: 'patrimoine', subcategory: 'musique', emoji: '💒', visualEmojis: ['💒', '👰', '🤵', '💍', '🎶'], titleFr: 'Chant de mariage', titleBa: 'Fúrú dùùrú', audioPromptFr: 'Chantez un chant de mariage', audioPromptBa: 'Fúrú dùùrú', exampleFr: 'Chanson pour les mariés...', gradient: 'from-pink-500 to-rose-600', discGradient: 'from-pink-400 via-rose-500 to-red-400', visibility: 'public' },
  { id: 'musique_naissance', category: 'patrimoine', subcategory: 'musique', emoji: '👶', visualEmojis: ['👶', '🍼', '🎵', '👩‍👧', '🌟'], titleFr: 'Berceuse', titleBa: 'Dén sùnɔ̀gɔ̀ dùùrú', audioPromptFr: 'Chantez une berceuse', audioPromptBa: 'Dén sùnɔ̀gɔ̀ dùùrú', exampleFr: 'Dors mon enfant...', gradient: 'from-blue-400 to-indigo-500', discGradient: 'from-blue-300 via-indigo-400 to-purple-400', visibility: 'public' },
  { id: 'musique_travail', category: 'patrimoine', subcategory: 'musique', emoji: '🌾', visualEmojis: ['🌾', '👨‍🌾', '☀️', '💪', '🎵'], titleFr: 'Chant de travail', titleBa: 'Báárá dùùrú', audioPromptFr: 'Chantez un chant de travail', audioPromptBa: 'Báárá dùùrú', exampleFr: 'On chante pour la force...', gradient: 'from-yellow-500 to-orange-600', discGradient: 'from-yellow-400 via-amber-500 to-orange-500', visibility: 'public' },
  { id: 'musique_funerailles', category: 'patrimoine', subcategory: 'musique', emoji: '🕯️', visualEmojis: ['🕯️', '🙏', '👼', '🌺', '💔'], titleFr: 'Chant funéraire', titleBa: 'Sú dùùrú', audioPromptFr: 'Chantez un chant funéraire', audioPromptBa: 'Sú dùùrú', exampleFr: 'Pour accompagner...', gradient: 'from-gray-500 to-slate-600', discGradient: 'from-gray-400 via-slate-500 to-gray-600', visibility: 'community' },
  { id: 'musique_fete', category: 'patrimoine', subcategory: 'musique', emoji: '🥁', visualEmojis: ['🥁', '💃', '🕺', '🎉', '🔥'], titleFr: 'Chant de fête', titleBa: 'Sèlí dùùrú', audioPromptFr: 'Chantez un chant de fête', audioPromptBa: 'Sèlí dùùrú', exampleFr: 'Quand on danse...', gradient: 'from-fuchsia-500 to-purple-600', discGradient: 'from-fuchsia-400 via-purple-500 to-violet-500', visibility: 'public' },
  { id: 'musique_initiation', category: 'patrimoine', subcategory: 'musique', emoji: '👑', visualEmojis: ['👑', '🔥', '💪', '🌙', '✨'], titleFr: "Chant d'initiation", titleBa: 'Bólò dùùrú', audioPromptFr: "Chantez un chant d'initiation", audioPromptBa: 'Bólò dùùrú', exampleFr: 'Pour devenir un homme...', gradient: 'from-amber-600 to-red-600', discGradient: 'from-amber-500 via-orange-600 to-red-600', visibility: 'vault' },
  { id: 'proverbe_sagesse', category: 'patrimoine', subcategory: 'proverbe', emoji: '🧓', visualEmojis: ['🧓', '💭', '💡', '🙏', '✨'], titleFr: 'Sagesse des anciens', titleBa: 'Kɔ̀rɔ̀ hàkílì', audioPromptFr: 'Dites un proverbe de sagesse', audioPromptBa: 'Kɔ̀rɔ̀ sɔ̀ɔ̀rɔ̀', exampleFr: 'Nos ancêtres disaient...', gradient: 'from-amber-500 to-yellow-600', discGradient: 'from-amber-400 via-yellow-500 to-orange-500', visibility: 'public' },
  { id: 'proverbe_travail', category: 'patrimoine', subcategory: 'proverbe', emoji: '👨‍🌾', visualEmojis: ['👨‍🌾', '🌱', '💪', '🌾', '🙏'], titleFr: 'Proverbe du travail', titleBa: 'Báárá sɔ̀ɔ̀rɔ̀', audioPromptFr: 'Dites un proverbe sur le travail', audioPromptBa: 'Báárá sɔ̀ɔ̀rɔ̀', exampleFr: 'Celui qui ne travaille pas...', gradient: 'from-green-500 to-emerald-600', discGradient: 'from-green-400 via-emerald-500 to-teal-500', visibility: 'public' },
  { id: 'proverbe_famille', category: 'patrimoine', subcategory: 'proverbe', emoji: '👨‍👩‍👧‍👦', visualEmojis: ['👨‍👩‍👧‍👦', '🏠', '❤️', '🤝', '🌳'], titleFr: 'Proverbe de famille', titleBa: 'Dénbáyá sɔ̀ɔ̀rɔ̀', audioPromptFr: 'Dites un proverbe sur la famille', audioPromptBa: 'Dénbáyá sɔ̀ɔ̀rɔ̀', exampleFr: 'Une famille unie...', gradient: 'from-blue-500 to-indigo-600', discGradient: 'from-blue-400 via-indigo-500 to-purple-500', visibility: 'public' },
  { id: 'proverbe_patience', category: 'patrimoine', subcategory: 'proverbe', emoji: '⏳', visualEmojis: ['⏳', '🐢', '🎯', '✨', '🏆'], titleFr: 'Proverbe de patience', titleBa: 'Múɲu sɔ̀ɔ̀rɔ̀', audioPromptFr: 'Dites un proverbe sur la patience', audioPromptBa: 'Múɲu sɔ̀ɔ̀rɔ̀', exampleFr: 'La patience est...', gradient: 'from-cyan-500 to-blue-600', discGradient: 'from-cyan-400 via-blue-500 to-indigo-500', visibility: 'public' },
  { id: 'proverbe_nature', category: 'patrimoine', subcategory: 'proverbe', emoji: '🌳', visualEmojis: ['🌳', '🌊', '🦅', '☀️', '🌍'], titleFr: 'Proverbe de la nature', titleBa: 'Dùnìyá sɔ̀ɔ̀rɔ̀', audioPromptFr: 'Dites un proverbe sur la nature', audioPromptBa: 'Dùnìyá sɔ̀ɔ̀rɔ̀', exampleFr: "L'arbre qui...", gradient: 'from-green-500 to-teal-600', discGradient: 'from-green-400 via-emerald-500 to-teal-500', visibility: 'public' },
  { id: 'proverbe_humilite', category: 'patrimoine', subcategory: 'proverbe', emoji: '🙏', visualEmojis: ['🙏', '👇', '❤️', '🕊️', '✨'], titleFr: "Proverbe d'humilité", titleBa: 'Màyá sɔ̀ɔ̀rɔ̀', audioPromptFr: "Dites un proverbe sur l'humilité", audioPromptBa: 'Màyá sɔ̀ɔ̀rɔ̀', exampleFr: "L'humble sera...", gradient: 'from-violet-500 to-purple-600', discGradient: 'from-violet-400 via-purple-500 to-fuchsia-500', visibility: 'public' },
  { id: 'savoir_plantes', category: 'patrimoine', subcategory: 'savoir', emoji: '🌿', visualEmojis: ['🌿', '💊', '🩹', '👨‍⚕️', '✨'], titleFr: 'Plantes médicinales', titleBa: 'Fúrá yírí', audioPromptFr: 'Partagez une connaissance sur une plante', audioPromptBa: 'Fúrá yírí dɔ̀nnìyá', exampleFr: 'Cette plante soigne...', gradient: 'from-green-500 to-lime-600', discGradient: 'from-green-400 via-emerald-500 to-lime-500', visibility: 'community' },
  { id: 'savoir_cuisine', category: 'patrimoine', subcategory: 'savoir', emoji: '🍲', visualEmojis: ['🍲', '🔥', '👨‍🍳', '🧅', '😋'], titleFr: 'Recette traditionnelle', titleBa: 'Dúmúní dàn', audioPromptFr: 'Partagez une recette traditionnelle', audioPromptBa: 'Dúmúní dàn kàlàn', exampleFr: 'Pour préparer ce plat...', gradient: 'from-orange-500 to-red-600', discGradient: 'from-orange-400 via-red-500 to-rose-500', visibility: 'public' },
  { id: 'savoir_artisanat', category: 'patrimoine', subcategory: 'savoir', emoji: '🧶', visualEmojis: ['🧶', '🪡', '👐', '🎨', '✨'], titleFr: 'Artisanat', titleBa: 'Bólò báárá', audioPromptFr: 'Expliquez une technique artisanale', audioPromptBa: 'Bólò báárá dɔ̀nnìyá', exampleFr: 'Pour tisser...', gradient: 'from-amber-500 to-orange-600', discGradient: 'from-amber-400 via-orange-500 to-red-500', visibility: 'public' },
  { id: 'savoir_agriculture', category: 'patrimoine', subcategory: 'savoir', emoji: '🌱', visualEmojis: ['🌱', '🌧️', '☀️', '🌾', '👨‍🌾'], titleFr: 'Savoir agricole', titleBa: 'Sɛ̀nɛ̀ dɔ̀nnìyá', audioPromptFr: 'Partagez une technique agricole', audioPromptBa: 'Sɛ̀nɛ̀ dɔ̀nnìyá', exampleFr: 'Pour bien cultiver...', gradient: 'from-lime-500 to-green-600', discGradient: 'from-lime-400 via-green-500 to-emerald-500', visibility: 'public' },
  { id: 'savoir_elevage', category: 'patrimoine', subcategory: 'savoir', emoji: '🐄', visualEmojis: ['🐄', '🥛', '🏕️', '👨‍🌾', '🌾'], titleFr: 'Savoir élevage', titleBa: 'Bàgán dɔ̀nnìyá', audioPromptFr: "Partagez une connaissance sur l'élevage", audioPromptBa: 'Bàgán dɔ̀nnìyá', exampleFr: 'Pour bien élever...', gradient: 'from-amber-500 to-lime-600', discGradient: 'from-amber-400 via-yellow-500 to-lime-500', visibility: 'public' },
  { id: 'savoir_meteo', category: 'patrimoine', subcategory: 'savoir', emoji: '🌦️', visualEmojis: ['🌦️', '🌙', '🐦', '🌳', '👀'], titleFr: 'Lire le temps', titleBa: 'Sán kàlàn', audioPromptFr: 'Expliquez comment prévoir le temps', audioPromptBa: 'Sán kàlàn dɔ̀nnìyá', exampleFr: 'Quand on voit ceci...', gradient: 'from-blue-400 to-cyan-600', discGradient: 'from-blue-400 via-cyan-500 to-teal-500', visibility: 'public' },
  { id: 'histoire_village', category: 'patrimoine', subcategory: 'histoire', emoji: '🏘️', visualEmojis: ['🏘️', '👴', '📜', '🌳', '⏳'], titleFr: 'Histoire du village', titleBa: 'Sò kpààrà', audioPromptFr: "Racontez l'histoire de votre village", audioPromptBa: 'Án sò kpààrà', exampleFr: 'Notre village a été fondé...', gradient: 'from-amber-600 to-orange-700', discGradient: 'from-amber-500 via-orange-600 to-red-600', visibility: 'public' },
  { id: 'histoire_famille', category: 'patrimoine', subcategory: 'histoire', emoji: '👪', visualEmojis: ['👪', '👴', '👶', '🌳', '❤️'], titleFr: 'Histoire de famille', titleBa: 'Dénbáyá kpààrà', audioPromptFr: "Racontez l'histoire de votre famille", audioPromptBa: 'Dénbáyá kpààrà', exampleFr: 'Notre famille vient de...', gradient: 'from-blue-500 to-purple-600', discGradient: 'from-blue-400 via-indigo-500 to-purple-500', visibility: 'community' },
  { id: 'histoire_roi', category: 'patrimoine', subcategory: 'histoire', emoji: '👑', visualEmojis: ['👑', '🏰', '⚔️', '🎺', '📜'], titleFr: 'Histoire des rois', titleBa: 'Màsá kpààrà', audioPromptFr: "Racontez l'histoire d'un roi", audioPromptBa: 'Màsá kpààrà', exampleFr: 'Le grand roi qui...', gradient: 'from-yellow-500 to-amber-600', discGradient: 'from-yellow-400 via-amber-500 to-orange-500', visibility: 'public' },
  { id: 'histoire_guerre', category: 'patrimoine', subcategory: 'histoire', emoji: '⚔️', visualEmojis: ['⚔️', '🛡️', '🐎', '🏹', '🎖️'], titleFr: 'Histoire de bataille', titleBa: 'Kɛ̀lɛ̀ kpààrà', audioPromptFr: 'Racontez une bataille', audioPromptBa: 'Kɛ̀lɛ̀ kpààrà', exampleFr: 'Quand nos ancêtres...', gradient: 'from-red-600 to-orange-700', discGradient: 'from-red-500 via-rose-600 to-orange-500', visibility: 'public' },
  { id: 'histoire_lieu', category: 'patrimoine', subcategory: 'histoire', emoji: '📍', visualEmojis: ['📍', '🏛️', '🌳', '💎', '✨'], titleFr: 'Lieu sacré', titleBa: 'Yɔ̀rɔ̀ sènùmàn', audioPromptFr: "Parlez d'un lieu sacré", audioPromptBa: 'Yɔ̀rɔ̀ sènùmàn kpààrà', exampleFr: 'Cet endroit est sacré...', gradient: 'from-purple-500 to-fuchsia-600', discGradient: 'from-purple-400 via-violet-500 to-fuchsia-500', visibility: 'community' },
  { id: 'histoire_tradition', category: 'patrimoine', subcategory: 'histoire', emoji: '🔥', visualEmojis: ['🔥', '🌙', '👥', '🙏', '✨'], titleFr: 'Tradition ancienne', titleBa: 'Làdá kɔ̀rɔ̀', audioPromptFr: 'Expliquez une tradition ancienne', audioPromptBa: 'Làdá kɔ̀rɔ̀ kpààrà', exampleFr: 'Depuis toujours...', gradient: 'from-orange-500 to-red-600', discGradient: 'from-orange-400 via-red-500 to-rose-500', visibility: 'public' },
];

const villageVoiceTemplates: Template[] = [
  { id: 'annonce_reunion', category: 'village_voice', subcategory: 'annonce', emoji: '👥', visualEmojis: ['👥', '🗓️', '🏠', '⏰', '📢'], titleFr: 'Réunion', titleBa: 'Ɲɔ̀gɔ̀n-yé', audioPromptFr: 'Annoncez une réunion', audioPromptBa: 'Ɲɔ̀gɔ̀n-yé kùú', exampleFr: 'Réunion demain...', gradient: 'from-blue-500 to-violet-600', discGradient: 'from-blue-400 via-indigo-500 to-violet-500', visibility: 'community' },
  { id: 'annonce_marche', category: 'village_voice', subcategory: 'annonce', emoji: '🏪', visualEmojis: ['🏪', '🍅', '💰', '📅', '🛒'], titleFr: 'Jour de marché', titleBa: 'Sùgú dɔ̀n', audioPromptFr: 'Annoncez le jour de marché', audioPromptBa: 'Sùgú kùú', exampleFr: 'Le marché sera...', gradient: 'from-emerald-500 to-green-600', discGradient: 'from-emerald-400 via-green-500 to-lime-500', visibility: 'public' },
  { id: 'annonce_travaux', category: 'village_voice', subcategory: 'annonce', emoji: '🔨', visualEmojis: ['🔨', '🏗️', '👷', '🤝', '💪'], titleFr: 'Travaux collectifs', titleBa: 'Cí-báárá', audioPromptFr: 'Appelez pour des travaux', audioPromptBa: 'Cí-báárá kùú', exampleFr: 'Tous ensemble...', gradient: 'from-amber-500 to-orange-600', discGradient: 'from-amber-400 via-orange-500 to-red-500', visibility: 'community' },
  { id: 'annonce_visite', category: 'village_voice', subcategory: 'annonce', emoji: '🚗', visualEmojis: ['🚗', '👔', '🏛️', '📅', '🎉'], titleFr: 'Visite importante', titleBa: 'Náfà-tìgì nàná', audioPromptFr: 'Annoncez une visite', audioPromptBa: 'Náfà-tìgì nàná kùú', exampleFr: 'Le préfet va venir...', gradient: 'from-slate-500 to-gray-600', discGradient: 'from-slate-400 via-gray-500 to-zinc-500', visibility: 'public' },
  { id: 'annonce_generale', category: 'village_voice', subcategory: 'annonce', emoji: '📢', visualEmojis: ['📢', '👂', '❗', '🏘️', '📣'], titleFr: 'Annonce générale', titleBa: 'Kùú bɛ̀ɛ̀', audioPromptFr: 'Faites une annonce', audioPromptBa: 'Kùú bɛ̀ɛ̀ yé', exampleFr: 'Écoutez tous...', gradient: 'from-cyan-500 to-blue-600', discGradient: 'from-cyan-400 via-blue-500 to-indigo-500', visibility: 'community' },
  { id: 'joie_naissance', category: 'village_voice', subcategory: 'celebration', emoji: '👶', visualEmojis: ['👶', '🍼', '🎉', '❤️', '🙏'], titleFr: 'Naissance', titleBa: 'Dén wólò', audioPromptFr: 'Annoncez une naissance', audioPromptBa: 'Dén wólò kùú', exampleFr: 'Un enfant est né !', gradient: 'from-pink-400 to-rose-500', discGradient: 'from-pink-300 via-rose-400 to-red-400', visibility: 'public' },
  { id: 'joie_mariage', category: 'village_voice', subcategory: 'celebration', emoji: '💒', visualEmojis: ['💒', '👰', '🤵', '💍', '🎊'], titleFr: 'Mariage', titleBa: 'Fúrú', audioPromptFr: 'Annoncez un mariage', audioPromptBa: 'Fúrú kùú', exampleFr: 'X et Y vont se marier...', gradient: 'from-red-400 to-pink-500', discGradient: 'from-red-400 via-pink-500 to-rose-400', visibility: 'public' },
  { id: 'joie_reussite', category: 'village_voice', subcategory: 'celebration', emoji: '🎓', visualEmojis: ['🎓', '📚', '🏆', '👏', '🌟'], titleFr: 'Réussite scolaire', titleBa: 'Kàlàn sègin', audioPromptFr: 'Célébrez une réussite', audioPromptBa: 'Kàlàn sègin kùú', exampleFr: 'Félicitations à X...', gradient: 'from-indigo-500 to-blue-600', discGradient: 'from-indigo-400 via-blue-500 to-cyan-500', visibility: 'public' },
  { id: 'joie_guerison', category: 'village_voice', subcategory: 'celebration', emoji: '💪', visualEmojis: ['💪', '🏥', '🙏', '❤️', '🎉'], titleFr: 'Guérison', titleBa: 'Kɛ́nɛ̀yá sɔ̀rɔ̀', audioPromptFr: 'Annoncez une guérison', audioPromptBa: 'Kɛ́nɛ̀yá sɔ̀rɔ̀ kùú', exampleFr: 'X est guéri !', gradient: 'from-green-400 to-emerald-500', discGradient: 'from-green-400 via-emerald-500 to-teal-400', visibility: 'public' },
  { id: 'joie_generale', category: 'village_voice', subcategory: 'celebration', emoji: '🎉', visualEmojis: ['🎉', '🎊', '🥳', '🙌', '✨'], titleFr: 'Bonne nouvelle', titleBa: 'Kíbárú ɲùmàn', audioPromptFr: 'Partagez une bonne nouvelle', audioPromptBa: 'Kíbárú ɲùmàn', exampleFr: "J'ai une bonne nouvelle...", gradient: 'from-yellow-400 to-orange-500', discGradient: 'from-yellow-400 via-amber-500 to-orange-500', visibility: 'public' },
  { id: 'aide_sante', category: 'village_voice', subcategory: 'help', emoji: '🏥', visualEmojis: ['🏥', '🤒', '💊', '🚑', '🙏'], titleFr: 'Aide santé', titleBa: 'Kɛ́nɛ̀yá dɛ̀mɛ̀', audioPromptFr: "Demandez de l'aide pour la santé", audioPromptBa: 'Kɛ́nɛ̀yá dɛ̀mɛ̀ ɲìní', exampleFr: "Quelqu'un est malade...", gradient: 'from-red-500 to-rose-600', discGradient: 'from-red-400 via-rose-500 to-pink-500', visibility: 'community', urgency: 'urgent' },
  { id: 'aide_argent', category: 'village_voice', subcategory: 'help', emoji: '💰', visualEmojis: ['💰', '🤲', '🙏', '❤️', '🤝'], titleFr: 'Aide financière', titleBa: 'Wári dɛ̀mɛ̀', audioPromptFr: 'Demandez une aide financière', audioPromptBa: 'Wári dɛ̀mɛ̀ ɲìní', exampleFr: "J'ai besoin d'aide...", gradient: 'from-amber-500 to-yellow-600', discGradient: 'from-amber-400 via-yellow-500 to-lime-500', visibility: 'community' },
  { id: 'aide_travail', category: 'village_voice', subcategory: 'help', emoji: '🌾', visualEmojis: ['🌾', '👨‍🌾', '💪', '🤝', '☀️'], titleFr: 'Aide aux champs', titleBa: 'Fòrò dɛ̀mɛ̀', audioPromptFr: "Demandez de l'aide aux champs", audioPromptBa: 'Fòrò dɛ̀mɛ̀ ɲìní', exampleFr: "J'ai besoin de bras...", gradient: 'from-green-500 to-emerald-600', discGradient: 'from-green-400 via-emerald-500 to-teal-500', visibility: 'community' },
  { id: 'aide_deuil', category: 'village_voice', subcategory: 'help', emoji: '🕯️', visualEmojis: ['🕯️', '💔', '🙏', '🤲', '❤️'], titleFr: 'Aide pour deuil', titleBa: 'Sú dɛ̀mɛ̀', audioPromptFr: 'Demandez du soutien après un décès', audioPromptBa: 'Sú dɛ̀mɛ̀ ɲìní', exampleFr: 'Nous avons perdu...', gradient: 'from-gray-500 to-slate-600', discGradient: 'from-gray-400 via-slate-500 to-zinc-500', visibility: 'community' },
  { id: 'aide_generale', category: 'village_voice', subcategory: 'help', emoji: '🙏', visualEmojis: ['🙏', '🤲', '❤️', '🤝', '💪'], titleFr: "Demande d'aide", titleBa: 'Dɛ̀mɛ̀ ɲìní', audioPromptFr: "Demandez de l'aide", audioPromptBa: 'Dɛ̀mɛ̀ ɲìní', exampleFr: "J'ai besoin de votre aide...", gradient: 'from-rose-500 to-red-600', discGradient: 'from-rose-400 via-red-500 to-orange-500', visibility: 'community' },
  { id: 'question_sante', category: 'village_voice', subcategory: 'question', emoji: '💊', visualEmojis: ['💊', '🤔', '🌿', '👨‍⚕️', '❓'], titleFr: 'Question santé', titleBa: 'Kɛ́nɛ̀yá ɲìnìnkàlí', audioPromptFr: 'Posez une question santé', audioPromptBa: 'Kɛ́nɛ̀yá ɲìnìnkàlí', exampleFr: 'Qui connaît un remède...?', gradient: 'from-teal-500 to-cyan-600', discGradient: 'from-teal-400 via-cyan-500 to-blue-500', visibility: 'community' },
  { id: 'question_agriculture', category: 'village_voice', subcategory: 'question', emoji: '🌱', visualEmojis: ['🌱', '🤔', '👨‍🌾', '☀️', '❓'], titleFr: 'Question agriculture', titleBa: 'Sɛ̀nɛ̀ ɲìnìnkàlí', audioPromptFr: "Posez une question sur l'agriculture", audioPromptBa: 'Sɛ̀nɛ̀ ɲìnìnkàlí', exampleFr: 'Comment faire pour...?', gradient: 'from-green-500 to-lime-600', discGradient: 'from-green-400 via-lime-500 to-yellow-500', visibility: 'community' },
  { id: 'question_perdu', category: 'village_voice', subcategory: 'question', emoji: '🔍', visualEmojis: ['🔍', '❓', '👀', '🐄', '📍'], titleFr: 'Objet/Animal perdu', titleBa: 'Fɛ̀n tùnú', audioPromptFr: "Demandez si quelqu'un a vu...", audioPromptBa: 'Fɛ̀n tùnú ɲìnìnkàlí', exampleFr: 'Qui a vu mon...?', gradient: 'from-purple-500 to-violet-600', discGradient: 'from-purple-400 via-violet-500 to-fuchsia-500', visibility: 'community' },
  { id: 'question_conseil', category: 'village_voice', subcategory: 'question', emoji: '🤔', visualEmojis: ['🤔', '💭', '👥', '💡', '❓'], titleFr: 'Demander conseil', titleBa: 'Làdílí ɲìní', audioPromptFr: 'Demandez un conseil', audioPromptBa: 'Làdílí ɲìnìnkàlí', exampleFr: 'Que me conseillez-vous...?', gradient: 'from-indigo-500 to-blue-600', discGradient: 'from-indigo-400 via-blue-500 to-cyan-500', visibility: 'community' },
  { id: 'question_cherche', category: 'village_voice', subcategory: 'question', emoji: '👤', visualEmojis: ['👤', '🔍', '📞', '🏘️', '❓'], titleFr: "Cherche quelqu'un", titleBa: 'Mɔ̀gɔ̀ ɲìní', audioPromptFr: "Cherchez quelqu'un", audioPromptBa: 'Mɔ̀gɔ̀ ɲìnìnkàlí', exampleFr: 'Qui connaît un bon...?', gradient: 'from-orange-500 to-amber-600', discGradient: 'from-orange-400 via-amber-500 to-yellow-500', visibility: 'community' },
  { id: 'alerte_meteo', category: 'village_voice', subcategory: 'alert', emoji: '⛈️', visualEmojis: ['⛈️', '🌊', '💨', '⚠️', '🏠'], titleFr: 'Alerte météo', titleBa: 'Sán gbàrà', audioPromptFr: 'Alertez sur un danger météo', audioPromptBa: 'Sán gbàrà kùú', exampleFr: 'Attention, forte pluie...', gradient: 'from-slate-500 to-blue-600', discGradient: 'from-slate-400 via-blue-500 to-cyan-500', visibility: 'public', urgency: 'urgent' },
  { id: 'alerte_sante', category: 'village_voice', subcategory: 'alert', emoji: '🦠', visualEmojis: ['🦠', '😷', '⚠️', '🏥', '📢'], titleFr: 'Alerte sanitaire', titleBa: 'Bànà gbàrà', audioPromptFr: 'Alertez sur une maladie', audioPromptBa: 'Bànà gbàrà kùú', exampleFr: 'Attention, maladie...', gradient: 'from-red-600 to-rose-700', discGradient: 'from-red-500 via-rose-600 to-pink-600', visibility: 'public', urgency: 'critical' },
  { id: 'alerte_route', category: 'village_voice', subcategory: 'alert', emoji: '🚧', visualEmojis: ['🚧', '🚗', '⚠️', '🛣️', '❌'], titleFr: 'Route coupée', titleBa: 'Sírá tìgɛ́', audioPromptFr: 'Signalez une route coupée', audioPromptBa: 'Sírá tìgɛ́ gbàrà', exampleFr: 'La route est coupée...', gradient: 'from-orange-500 to-amber-600', discGradient: 'from-orange-400 via-amber-500 to-yellow-500', visibility: 'public', urgency: 'urgent' },
  { id: 'alerte_animaux', category: 'village_voice', subcategory: 'alert', emoji: '🐍', visualEmojis: ['🐍', '🦂', '⚠️', '👀', '🏃'], titleFr: 'Animal dangereux', titleBa: 'Sògò júgú', audioPromptFr: 'Signalez un animal dangereux', audioPromptBa: 'Sògò júgú gbàrà', exampleFr: 'Attention, serpent...', gradient: 'from-lime-500 to-green-600', discGradient: 'from-lime-400 via-green-500 to-emerald-500', visibility: 'community', urgency: 'urgent' },
  { id: 'alerte_vol', category: 'village_voice', subcategory: 'alert', emoji: '🚨', visualEmojis: ['🚨', '👤', '🏃', '⚠️', '📢'], titleFr: 'Vol / Insécurité', titleBa: 'Sònyàlí gbàrà', audioPromptFr: 'Signalez un vol', audioPromptBa: 'Sònyàlí gbàrà kùú', exampleFr: 'Attention, vol signalé...', gradient: 'from-red-600 to-pink-700', discGradient: 'from-red-500 via-rose-600 to-pink-600', visibility: 'community', urgency: 'critical' },
];

// VINYLE COMPONENT
interface VinylPlayerProps {
  template: Template;
  isPlaying: boolean;
  isRecording?: boolean;
  progress: number;
  size?: number;
  showControls?: boolean;
  onPlayPause?: () => void;
}

const VinylPlayer: React.FC<VinylPlayerProps> = ({ template, isPlaying, isRecording = false, progress, size = 200, showControls = false, onPlayPause }) => {
  const rotation = useMotionValue(0);
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  
  useEffect(() => {
    const shouldRotate = isPlaying || isRecording;
    if (shouldRotate) {
      const animate = (time: number) => {
        if (lastTimeRef.current) rotation.set(rotation.get() + ((time - lastTimeRef.current) / 1000) * 18);
        lastTimeRef.current = time;
        animationRef.current = requestAnimationFrame(animate);
      };
      animationRef.current = requestAnimationFrame(animate);
    } else {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      lastTimeRef.current = 0;
    }
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, [isPlaying, isRecording, rotation]);

  const rotateTransform = useTransform(rotation, (r) => `rotate(${r}deg)`);
  const circumference = 2 * Math.PI * (size / 2 - 4);
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size + 50, height: size + 20 }}>
      <div className="absolute rounded-full bg-black/20 blur-xl" style={{ width: size - 20, height: size - 20, top: '55%', left: '45%', transform: 'translate(-50%, -50%)' }} />
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="absolute inset-0 -rotate-90" width={size} height={size}>
          <circle cx={size / 2} cy={size / 2} r={size / 2 - 4} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
          <motion.circle cx={size / 2} cy={size / 2} r={size / 2 - 4} fill="none" stroke={isRecording ? "#ef4444" : "rgba(255,255,255,0.7)"} strokeWidth="4" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} style={{ transition: 'stroke-dashoffset 0.2s ease' }} />
        </svg>
        <motion.div className="absolute inset-2 rounded-full overflow-hidden shadow-2xl" style={{ transform: rotateTransform }}>
          <div className={`absolute inset-0 bg-gradient-to-br ${template.discGradient}`} />
          {[...Array(15)].map((_, i) => <div key={i} className="absolute rounded-full" style={{ inset: `${8 + i * 4}%`, border: `1px solid rgba(0,0,0,${0.1 + i * 0.01})` }} />)}
          <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-transparent" style={{ clipPath: 'polygon(0 0, 50% 0, 30% 100%, 0 100%)' }} />
          <div className="absolute inset-[28%] rounded-full bg-gradient-to-br from-amber-800 via-amber-900 to-amber-950 flex items-center justify-center shadow-inner border-2 border-amber-700/50">
            <span className="text-4xl drop-shadow-lg">{template.emoji}</span>
          </div>
          <div className="absolute inset-[46%] rounded-full bg-black shadow-inner" />
        </motion.div>
        {showControls && !isRecording && (
          <motion.button className="absolute inset-0 flex items-center justify-center z-10" onClick={onPlayPause} whileTap={{ scale: 0.95 }}>
            <div className="w-14 h-14 rounded-full bg-white/95 backdrop-blur-sm flex items-center justify-center shadow-xl">
              {isPlaying ? <Pause className="w-7 h-7 text-gray-800" /> : <Play className="w-7 h-7 text-gray-800 ml-1" />}
            </div>
          </motion.button>
        )}
      </div>
      <div className="absolute" style={{ right: -8, top: '12%' }}>
        <motion.div className="origin-top" animate={{ rotate: (isPlaying || isRecording) ? 28 : 5 }} transition={{ duration: 0.5, ease: "easeInOut" }}>
          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-gray-200 to-gray-400 shadow-lg border-2 border-gray-300" />
          <div className="w-2 h-16 bg-gradient-to-b from-gray-300 to-gray-500 rounded-full ml-1.5 shadow-md" />
          <div className="w-4 h-5 bg-gradient-to-b from-gray-400 to-gray-600 rounded-sm ml-0.5 shadow-md" />
        </motion.div>
      </div>
      {isRecording && <motion.div className="absolute top-0 left-0 w-4 h-4 bg-red-500 rounded-full shadow-lg" animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }} transition={{ repeat: Infinity, duration: 1 }} />}
    </div>
  );
};

// AUDIO WAVEFORM
const AudioWaveform: React.FC<{ isActive: boolean; barCount?: number }> = ({ isActive, barCount = 28 }) => (
  <div className="flex items-center justify-center gap-0.5 h-10 px-4">
    {[...Array(barCount)].map((_, i) => (
      <motion.div key={i} className="w-1 bg-white/60 rounded-full" animate={isActive ? { height: [6, Math.random() * 28 + 12, 6] } : { height: 6 }} transition={{ repeat: Infinity, duration: 0.3 + Math.random() * 0.2, delay: i * 0.015 }} />
    ))}
  </div>
);

// MAIN COMPONENT
export const TamTamCreatePost: React.FC<TamTamCreatePostProps> = ({ isOpen, onClose, onSubmit, initialCategory }) => {
  const [step, setStep] = useState<'category' | 'templates' | 'record' | 'preview'>('category');
  const [mainCategory, setMainCategory] = useState<'patrimoine' | 'village_voice' | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const maxRecordingTime = 120;

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isRecording) interval = setInterval(() => setRecordingTime(t => Math.min(t + 0.1, maxRecordingTime)), 100);
    return () => clearInterval(interval);
  }, [isRecording]);

  useEffect(() => {
    if (isOpen && initialCategory) {
      setMainCategory(initialCategory);
      setStep('templates');
    }
    if (!isOpen) resetState();
  }, [isOpen, initialCategory]);

  const playAudioPrompt = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'fr-FR';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  const getFilteredTemplates = () => mainCategory === 'patrimoine' ? patrimoineTemplates : villageVoiceTemplates;
  const handleTemplateSelect = (template: Template) => { setSelectedTemplate(template); playAudioPrompt(template.audioPromptFr); setStep('record'); };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => { setAudioBase64(reader.result as string); setAudioDuration(recordingTime); setStep('preview'); };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach(track => track.stop());
      };
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
    } catch (err) { console.error('Erreur micro:', err); }
  };

  const stopRecording = () => { if (mediaRecorderRef.current && isRecording) { mediaRecorderRef.current.stop(); setIsRecording(false); } };

  const handlePlayPreview = () => {
    if (!audioBase64) return;
    if (isPlayingPreview && audioPreviewRef.current) { audioPreviewRef.current.pause(); setIsPlayingPreview(false); }
    else {
      if (!audioPreviewRef.current) {
        audioPreviewRef.current = new Audio(audioBase64);
        audioPreviewRef.current.onended = () => { setIsPlayingPreview(false); setPlaybackProgress(0); };
        audioPreviewRef.current.ontimeupdate = () => { if (audioPreviewRef.current?.duration) setPlaybackProgress((audioPreviewRef.current.currentTime / audioPreviewRef.current.duration) * 100); };
      }
      audioPreviewRef.current.play();
      setIsPlayingPreview(true);
    }
  };

  const handleSubmit = async () => {
    if (!audioBase64 || !selectedTemplate) return;
    setIsSubmitting(true);
    try {
      await onSubmit({ audio_base64: audioBase64, template_id: selectedTemplate.id, category: selectedTemplate.category, subcategory: selectedTemplate.subcategory, duration_seconds: audioDuration, visibility: selectedTemplate.visibility, urgency: selectedTemplate.urgency });
      playAudioPrompt('Votre message a été envoyé');
      onClose();
    } catch (err: any) { console.error(err); } finally { setIsSubmitting(false); }
  };

  const resetState = () => { setStep('category'); setMainCategory(null); setSelectedTemplate(null); setAudioBase64(null); setAudioDuration(0); setRecordingTime(0); setIsRecording(false); setIsPlayingPreview(false); setPlaybackProgress(0); if (audioPreviewRef.current) { audioPreviewRef.current.pause(); audioPreviewRef.current = null; } };
  const goBack = () => { if (step === 'templates') { if (initialCategory) onClose(); else setStep('category'); } else if (step === 'record') { setStep('templates'); setRecordingTime(0); } else if (step === 'preview') { setStep('record'); setPlaybackProgress(0); } };
  const formatTime = (s: number) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;

  if (!isOpen) return null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-xl" />
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 28, stiffness: 300 }} onClick={e => e.stopPropagation()} className="relative w-full max-w-lg bg-white/10 backdrop-blur-2xl border border-white/20 rounded-t-[2rem] min-h-[70vh] max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* HEADER */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            {step !== 'category' && <motion.button whileTap={{ scale: 0.9 }} onClick={goBack} className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center"><ChevronLeft className="w-5 h-5 text-white" /></motion.button>}
            <h3 className="text-lg font-semibold text-white">{step === 'category' ? '🎙️ Nouveau message' : step === 'templates' ? 'Choisissez le type' : step === 'record' ? '🎤 Enregistrer' : '✅ Aperçu'}</h3>
          </div>
          <div className="flex items-center gap-2">
            {selectedTemplate && step !== 'category' && step !== 'templates' && <motion.button whileTap={{ scale: 0.9 }} onClick={() => playAudioPrompt(selectedTemplate.audioPromptFr)} className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center"><Volume2 className="w-5 h-5 text-white" /></motion.button>}
            <motion.button whileTap={{ scale: 0.9 }} onClick={onClose} className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center"><X className="w-5 h-5 text-white" /></motion.button>
          </div>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            {step === 'category' && (
              <motion.div key="category" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="p-5 space-y-4">
                <p className="text-center text-white/60 text-sm">Touchez pour choisir</p>
                <motion.button whileTap={{ scale: 0.98 }} onClick={() => { setMainCategory('patrimoine'); setStep('templates'); }} className="w-full p-5 rounded-2xl bg-gradient-to-r from-amber-500/90 to-red-500/90 backdrop-blur-sm shadow-xl border border-white/20">
                  <div className="flex items-center gap-4"><div className="w-16 h-16 rounded-xl bg-white/20 flex items-center justify-center"><span className="text-4xl">🏛️</span></div><div className="text-left flex-1"><div className="text-xl font-bold text-white">Patrimoine</div><div className="text-white/70 text-sm">Kpààrà</div><div className="flex gap-1 mt-1.5">{['📖', '🎵', '💬', '🌿', '🏛️'].map((e, i) => <span key={i} className="text-base">{e}</span>)}</div></div></div>
                </motion.button>
                <motion.button whileTap={{ scale: 0.98 }} onClick={() => { setMainCategory('village_voice'); setStep('templates'); }} className="w-full p-5 rounded-2xl bg-gradient-to-r from-emerald-500/90 to-cyan-500/90 backdrop-blur-sm shadow-xl border border-white/20">
                  <div className="flex items-center gap-4"><div className="w-16 h-16 rounded-xl bg-white/20 flex items-center justify-center"><span className="text-4xl">📢</span></div><div className="text-left flex-1"><div className="text-xl font-bold text-white">Voix du Village</div><div className="text-white/70 text-sm">Kùú dɔ̀ɔ̀rɔ̀</div><div className="flex gap-1 mt-1.5">{['📢', '🙏', '🎉', '❓', '🚨'].map((e, i) => <span key={i} className="text-base">{e}</span>)}</div></div></div>
                </motion.button>
              </motion.div>
            )}
            {step === 'templates' && (
              <motion.div key="templates" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="p-4">
                <div className="grid grid-cols-3 gap-2.5">
                  {getFilteredTemplates().map((template, index) => (
                    <motion.button key={template.id} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: index * 0.02 }} whileTap={{ scale: 0.95 }} onClick={() => handleTemplateSelect(template)} className={`aspect-square rounded-xl bg-gradient-to-br ${template.gradient} p-2 flex flex-col items-center justify-center shadow-lg border border-white/20 relative overflow-hidden`}>
                      <span className="text-2xl mb-1 drop-shadow-md">{template.emoji}</span><span className="text-white font-medium text-[10px] text-center leading-tight drop-shadow-sm">{template.titleFr}</span>
                      {template.urgency === 'critical' && <div className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-ping" />}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
            {step === 'record' && selectedTemplate && (
              <motion.div key="record" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="flex flex-col items-center py-6 px-5">
                <VinylPlayer template={selectedTemplate} isPlaying={false} isRecording={isRecording} progress={(recordingTime / maxRecordingTime) * 100} size={180} />
                <div className="text-center mt-4 mb-2"><h3 className="text-xl font-bold text-white">{selectedTemplate.titleFr}</h3><p className="text-white/60 text-sm">{selectedTemplate.titleBa}</p></div>
                <div className="flex gap-2 mb-3">{selectedTemplate.visualEmojis.map((emoji, i) => <motion.span key={i} className="text-xl" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>{emoji}</motion.span>)}</div>
                <AudioWaveform isActive={isRecording} barCount={28} />
                <div className="text-center my-3"><span className="text-3xl font-mono text-white font-bold">{formatTime(recordingTime)}</span><span className="text-white/40 text-base ml-2">/ {formatTime(maxRecordingTime)}</span></div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2.5 mb-6 max-w-xs border border-white/10"><p className="text-white/80 text-sm text-center">{selectedTemplate.audioPromptFr}</p></div>
                <motion.button whileTap={{ scale: 0.95 }} onClick={isRecording ? stopRecording : startRecording} className={`w-20 h-20 rounded-full flex items-center justify-center shadow-2xl ${isRecording ? 'bg-red-500' : 'bg-white'}`}>{isRecording ? <div className="w-8 h-8 bg-white rounded-sm" /> : <Mic className="w-10 h-10 text-gray-800" />}</motion.button>
                <p className="text-white/50 text-xs mt-3">{isRecording ? 'Touchez pour arrêter' : 'Touchez pour enregistrer'}</p>
              </motion.div>
            )}
            {step === 'preview' && selectedTemplate && (
              <motion.div key="preview" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="flex flex-col items-center py-6 px-5">
                <VinylPlayer template={selectedTemplate} isPlaying={isPlayingPreview} progress={playbackProgress} size={200} showControls={true} onPlayPause={handlePlayPreview} />
                <div className="text-center mt-4 mb-2"><h3 className="text-xl font-bold text-white">{selectedTemplate.titleFr}</h3><p className="text-white/60 text-sm">{selectedTemplate.titleBa}</p></div>
                <div className="flex gap-2 mb-4">{selectedTemplate.visualEmojis.map((emoji, i) => <span key={i} className="text-xl">{emoji}</span>)}</div>
                <div className={`w-full max-w-xs rounded-xl bg-gradient-to-r ${selectedTemplate.gradient} p-3.5 border border-white/20`}>
                  <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center"><Mic className="w-5 h-5 text-white" /></div><div className="flex-1"><p className="text-white font-semibold text-sm">Audio enregistré</p><p className="text-white/70 text-xs">{formatTime(audioDuration)}</p></div><div className="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center"><Check className="w-5 h-5 text-white" /></div></div>
                </div>
                <div className="mt-4"><span className={`px-4 py-1.5 rounded-full text-sm font-medium border flex items-center gap-2 ${selectedTemplate.visibility === 'public' ? 'bg-green-500/20 text-green-300 border-green-500/30' : 'bg-blue-500/20 text-blue-300 border-blue-500/30'}`}>{selectedTemplate.visibility === 'public' ? <Globe className="w-4 h-4" /> : <UsersIcon className="w-4 h-4" />}{selectedTemplate.visibility === 'public' ? 'Public' : 'Village'}</span></div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* FOOTER */}
        {step === 'preview' && (
          <div className="p-4 border-t border-white/10 flex gap-3">
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => { setStep('record'); setRecordingTime(0); setAudioBase64(null); setPlaybackProgress(0); }} className="py-3 px-5 rounded-xl bg-white/10 backdrop-blur-sm text-white font-medium flex items-center gap-2 border border-white/20"><RotateCcw className="w-4 h-4" />Refaire</motion.button>
            <motion.button whileTap={{ scale: 0.95 }} onClick={handleSubmit} disabled={isSubmitting} className={`flex-1 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 text-white shadow-lg border border-white/20 ${selectedTemplate?.category === 'patrimoine' ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-gradient-to-r from-emerald-500 to-teal-500'}`}>{isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-4 h-4" /> Envoyer</>}</motion.button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default TamTamCreatePost;
