/**
 * TAM-TAM Template Registry - 38 Revolutionary Templates (incl. 3 Premium)
 * Central registry for all video creation templates
 * ✅ Phase 1: Premium templates integrated with standard interface
 */

import { Template, TemplateCategory } from '../types';

// Import all 35 standard templates
import { griotDigitalTemplate } from './griotDigital';
import { beatSyncUltraTemplate } from './beatSyncUltra';
import { styleCinemaLocalTemplate } from './styleCinemaLocal';
import { oneTakeProTemplate } from './oneTakePro';
import { quickStoryTemplate } from './quickStory';
import { magicTransformTemplate } from './magicTransform';
import { smartCaptionsTemplate } from './smartCaptions';
import { multiFormatTemplate } from './multiFormat';
import { autoBrollBoosterTemplate } from './autoBrollBooster';
import { voiceCloneHookTemplate } from './voiceCloneHook';

// Import premium template configs (with type casting for compatibility)
import { GriotDigitalTemplate } from '@/templates/GriotDigital';
import { BeatMakerAITemplate } from '@/templates/BeatMakerAI';
import { VillageChronicleTemplate } from '@/templates/VillageChronicle';

// ============================================================================
// PREMIUM TEMPLATE ADAPTERS
// ============================================================================

const griotDigitalPremiumTemplate: Template = {
  id: 'griot-digital-premium',
  name: 'Griot Digital 3D',
  nameBa: 'Kɔ̀gbɛ́ Táárù 3D',
  category: 'storytelling',
  description: 'Conte 3D interactif avec village virtuel et lip-sync IA',
  thumbnail: '', // Fallback: dynamic gradient with emoji will be used
  demoVideo: '',
  duration: 60,
  isPremium: true,
  isNew: true,
  effects: [],
  audio: { volume: 0.8 },
  metadata: {
    author: 'TAM-TAM',
    version: '2.0',
    tags: ['3D', 'storytelling', 'AI', 'interactive', 'premium']
  },
  tags: ['3D', 'conte', 'griot', 'IA'],
  usageCount: 0,
  emoji: '🎭',
};

const beatMakerAIPremiumTemplate: Template = {
  id: 'beat-maker-ai',
  name: 'Beat Maker AI',
  nameBa: 'Wùúsú Túúrú AI',
  category: 'music',
  description: 'Studio DAW complet pour créer des beats Afrobeat, Amapiano, Coupé-Décalé',
  thumbnail: '', // Fallback: dynamic gradient with emoji will be used
  demoVideo: '',
  duration: 90,
  isPremium: true,
  isNew: true,
  effects: [],
  audio: { volume: 1.0 },
  metadata: {
    author: 'TAM-TAM',
    version: '1.0',
    tags: ['music', 'DAW', 'AI', 'beats', 'afrobeat']
  },
  tags: ['musique', 'beats', 'afrobeat', 'IA'],
  usageCount: 0,
  emoji: '🎵',
};

/*
 * Use the full Village Chronicle template configuration from src/templates/VillageChronicle
 * instead of a minimal stub, ensuring end-to-end functionality (script generation, rendering, etc.)
 */
const villageChronicleTemplate: Template = {
  ...VillageChronicleTemplate,
  thumbnail: '', // Fallback gradient with emoji
  emoji: '📺',
};
import { miniDocVillageTemplate } from './miniDocVillage';
import { metiersTerroirTemplate } from './metiersTerroir';
import { histoireVraieTemplate } from './histoireVraie';
import { conteDuSoirTemplate } from './conteDuSoir';
import { paroleAncienTemplate } from './paroleAncien';
import { avantApresVillageTemplate } from './avantApresVillage';
import { cartePostaleBeauteTemplate } from './cartePostaleBeaute';
import { leconDuJourTemplate } from './leconDuJour';
import { histoireEnImagesTemplate } from './histoireEnImages';
import { docExpressPatrimoineTemplate } from './docExpressPatrimoine';
import { radioVillageTemplate } from './radioVillage';
import { annonceCommunautaireTemplate } from './annonceCommunautaire';
import { debatExpressTemplate } from './debatExpress';
import { traductionVoixTemplate } from './traductionVoix';
import { choraleCollectiveTemplate } from './choraleCollective';
import { voixDeFamilleTemplate } from './voixDeFamille';
import { neonGlowTemplate } from './neonGlow';
import { splitScreenDuoTemplate } from './splitScreenDuo';
import { photoSlideshowTemplate } from './photoSlideshow';
import { karaokeModeTemplate } from './karaokeMode';
import { aiPortraitProTemplate } from './aiPortraitPro';
import { hologramEffectTemplate } from './hologramEffect';
import { glitchArtTemplate } from './glitchArt';
import { cyberpunkVibesTemplate } from './cyberpunkVibes';
import { matrixRainTemplate } from './matrixRain';
import { afrobeatPulseTemplate } from './afrobeatPulse';
import { djMixVisualTemplate } from './djMixVisual';
import { danceChallengeTemplate } from './danceChallenge';
import { lyricVideoTemplate } from './lyricVideo';
import { concertLiveTemplate } from './concertLive';

// ============================================================================
// ALL 35 TEMPLATES
// ============================================================================

export const allTemplates: Template[] = [
  // Premium templates first
  griotDigitalPremiumTemplate,
  beatMakerAIPremiumTemplate,
  villageChronicleTemplate,
  // Standard templates
  griotDigitalTemplate,
  beatSyncUltraTemplate,
  styleCinemaLocalTemplate,
  oneTakeProTemplate,
  quickStoryTemplate,
  magicTransformTemplate,
  smartCaptionsTemplate,
  multiFormatTemplate,
  autoBrollBoosterTemplate,
  voiceCloneHookTemplate,
  miniDocVillageTemplate,
  metiersTerroirTemplate,
  histoireVraieTemplate,
  conteDuSoirTemplate,
  paroleAncienTemplate,
  avantApresVillageTemplate,
  cartePostaleBeauteTemplate,
  leconDuJourTemplate,
  histoireEnImagesTemplate,
  docExpressPatrimoineTemplate,
  radioVillageTemplate,
  annonceCommunautaireTemplate,
  debatExpressTemplate,
  traductionVoixTemplate,
  choraleCollectiveTemplate,
  voixDeFamilleTemplate,
  neonGlowTemplate,
  splitScreenDuoTemplate,
  photoSlideshowTemplate,
  karaokeModeTemplate,
  aiPortraitProTemplate,
  hologramEffectTemplate,
  glitchArtTemplate,
  cyberpunkVibesTemplate,
  matrixRainTemplate,
  afrobeatPulseTemplate,
  djMixVisualTemplate,
  danceChallengeTemplate,
  lyricVideoTemplate,
  concertLiveTemplate,
];

// ============================================================================
// TEMPLATES BY CATEGORY
// ============================================================================

export const templatesByCategory: Record<TemplateCategory, Template[]> = {
  storytelling: [
    griotDigitalTemplate,
    miniDocVillageTemplate,
    histoireVraieTemplate,
    conteDuSoirTemplate,
    paroleAncienTemplate,
    avantApresVillageTemplate,
    cartePostaleBeauteTemplate,
    histoireEnImagesTemplate,
    voixDeFamilleTemplate,
    photoSlideshowTemplate,
  ],
  music: [
    beatSyncUltraTemplate,
    choraleCollectiveTemplate,
    splitScreenDuoTemplate,
    karaokeModeTemplate,
    afrobeatPulseTemplate,
    djMixVisualTemplate,
    danceChallengeTemplate,
    lyricVideoTemplate,
    concertLiveTemplate,
  ],
  business: [
    oneTakeProTemplate,
    multiFormatTemplate,
    voiceCloneHookTemplate,
    radioVillageTemplate,
    annonceCommunautaireTemplate,
    debatExpressTemplate,
  ],
  education: [
    metiersTerroirTemplate,
    leconDuJourTemplate,
    docExpressPatrimoineTemplate,
    traductionVoixTemplate,
    smartCaptionsTemplate,
  ],
  future: [
    neonGlowTemplate,
    aiPortraitProTemplate,
    hologramEffectTemplate,
    glitchArtTemplate,
    cyberpunkVibesTemplate,
    matrixRainTemplate,
    magicTransformTemplate,
    styleCinemaLocalTemplate,
    quickStoryTemplate,
    autoBrollBoosterTemplate,
  ],
};

// ============================================================================
// TEMPLATE HELPERS
// ============================================================================

export const getTemplateById = (id: string): Template | undefined => {
  return allTemplates.find(t => t.id === id);
};

export const getTemplatesByCategory = (category: TemplateCategory | 'all'): Template[] => {
  if (category === 'all') return allTemplates;
  return templatesByCategory[category] || [];
};

export const searchTemplates = (query: string): Template[] => {
  const q = query.toLowerCase().trim();
  if (!q) return allTemplates;
  
  return allTemplates.filter(t => 
    t.name.toLowerCase().includes(q) ||
    t.description.toLowerCase().includes(q) ||
    t.nameBa?.toLowerCase().includes(q) ||
    t.metadata?.tags?.some(tag => tag.toLowerCase().includes(q)) ||
    t.tags?.some(tag => tag.toLowerCase().includes(q))
  );
};

export const getFeaturedTemplates = (): Template[] => {
  return allTemplates.filter(t => t.isNew || t.isPremium);
};

export const getPopularTemplates = (limit = 5): Template[] => {
  return [...allTemplates]
    .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
    .slice(0, limit);
};

// Re-export all templates
export { griotDigitalTemplate } from './griotDigital';
export { beatSyncUltraTemplate } from './beatSyncUltra';
export { styleCinemaLocalTemplate } from './styleCinemaLocal';
export { oneTakeProTemplate } from './oneTakePro';
export { quickStoryTemplate } from './quickStory';
export { magicTransformTemplate } from './magicTransform';
export { smartCaptionsTemplate } from './smartCaptions';
export { multiFormatTemplate } from './multiFormat';
export { autoBrollBoosterTemplate } from './autoBrollBooster';
export { voiceCloneHookTemplate } from './voiceCloneHook';
export { miniDocVillageTemplate } from './miniDocVillage';
export { metiersTerroirTemplate } from './metiersTerroir';
export { histoireVraieTemplate } from './histoireVraie';
export { conteDuSoirTemplate } from './conteDuSoir';
export { paroleAncienTemplate } from './paroleAncien';
export { avantApresVillageTemplate } from './avantApresVillage';
export { cartePostaleBeauteTemplate } from './cartePostaleBeaute';
export { leconDuJourTemplate } from './leconDuJour';
export { histoireEnImagesTemplate } from './histoireEnImages';
export { docExpressPatrimoineTemplate } from './docExpressPatrimoine';
export { radioVillageTemplate } from './radioVillage';
export { annonceCommunautaireTemplate } from './annonceCommunautaire';
export { debatExpressTemplate } from './debatExpress';
export { traductionVoixTemplate } from './traductionVoix';
export { choraleCollectiveTemplate } from './choraleCollective';
export { voixDeFamilleTemplate } from './voixDeFamille';
export { neonGlowTemplate } from './neonGlow';
export { splitScreenDuoTemplate } from './splitScreenDuo';
export { photoSlideshowTemplate } from './photoSlideshow';
export { karaokeModeTemplate } from './karaokeMode';
export { aiPortraitProTemplate } from './aiPortraitPro';
export { hologramEffectTemplate } from './hologramEffect';
export { glitchArtTemplate } from './glitchArt';
export { cyberpunkVibesTemplate } from './cyberpunkVibes';
export { matrixRainTemplate } from './matrixRain';
export { afrobeatPulseTemplate } from './afrobeatPulse';
export { djMixVisualTemplate } from './djMixVisual';
export { danceChallengeTemplate } from './danceChallenge';
export { lyricVideoTemplate } from './lyricVideo';
export { concertLiveTemplate } from './concertLive';
