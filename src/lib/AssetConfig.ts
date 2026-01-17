/**
 * TAM-TAM Asset Configuration - Source de vérité unique
 * Toutes les définitions d'assets centralisées pour cohérence
 */

// ============================================================================
// TYPES
// ============================================================================

export interface AssetCategoryConfig {
  id: string;
  displayName: string;
  displayNameFr: string;
  icon: string; // Emoji
  color: string; // Tailwind color class
  expectedFormats: string[];
  namingPattern: string;
  minFileSize: number; // bytes - pour détecter LFS pointers
  expectedCount: number;
  basePath: string;
  envatoCategory: string;
  envatoSearchTerms: string[];
}

export interface AssetFileDefinition {
  localName: string;
  envatoName: string;
  id: string;
  category: string;
}

// ============================================================================
// CONFIGURATION CENTRALISÉE DES CATÉGORIES
// ============================================================================

export const ASSET_CATEGORIES: Record<string, AssetCategoryConfig> = {
  'lens-flare': {
    id: 'lens-flare',
    displayName: 'Lens Flares',
    displayNameFr: 'Flares de Lentille',
    icon: '✨',
    color: 'text-yellow-500',
    expectedFormats: ['.png', '.webp'],
    namingPattern: 'flare-XXX.png',
    minFileSize: 5000,
    expectedCount: 455,
    basePath: '/assets/envato/lens-flare/',
    envatoCategory: 'graphics',
    envatoSearchTerms: ['lens flare overlay', 'anamorphic flare', 'cinematic flare png']
  },
  
  'light-leak': {
    id: 'light-leak',
    displayName: 'Light Leaks',
    displayNameFr: 'Fuites de Lumière',
    icon: '🎬',
    color: 'text-orange-500',
    expectedFormats: ['.webm', '.mp4', '.mov'],
    namingPattern: 'leak-XXX.webm',
    minFileSize: 100000,
    expectedCount: 40,
    basePath: '/assets/envato/light-leak/',
    envatoCategory: 'stock-video',
    envatoSearchTerms: ['light leak overlay 4k', 'cinematic light leak', 'film burn overlay']
  },
  
  'particles': {
    id: 'particles',
    displayName: 'Particles',
    displayNameFr: 'Particules',
    icon: '💫',
    color: 'text-purple-500',
    expectedFormats: ['.webm', '.mp4'],
    namingPattern: 'particle-XXX.webm',
    minFileSize: 50000,
    expectedCount: 37,
    basePath: '/assets/envato/particles/',
    envatoCategory: 'stock-video',
    envatoSearchTerms: ['dust particles overlay', 'bokeh particles 4k', 'magic particles']
  },
  
  'transitions': {
    id: 'transitions',
    displayName: 'Transitions',
    displayNameFr: 'Transitions',
    icon: '🔀',
    color: 'text-blue-500',
    expectedFormats: ['.mp4', '.webm', '.mov'],
    namingPattern: 'transition-XXX.mp4',
    minFileSize: 50000,
    expectedCount: 32,
    basePath: '/assets/envato/transitions/',
    envatoCategory: 'stock-video',
    envatoSearchTerms: ['cinematic transition', 'glitch transition', 'zoom transition']
  },
  
  'textures': {
    id: 'textures',
    displayName: 'Textures',
    displayNameFr: 'Textures',
    icon: '🎨',
    color: 'text-green-500',
    expectedFormats: ['.mp4', '.webm', '.jpg', '.png'],
    namingPattern: 'texture-XXX.mp4',
    minFileSize: 10000,
    expectedCount: 215,
    basePath: '/assets/envato/textures/',
    envatoCategory: 'stock-video',
    envatoSearchTerms: ['abstract texture loop', 'organic texture 4k', 'noise grain overlay']
  },
  
  '3d-models': {
    id: '3d-models',
    displayName: '3D Models',
    displayNameFr: 'Modèles 3D',
    icon: '📦',
    color: 'text-cyan-500',
    expectedFormats: ['.glb', '.gltf'],
    namingPattern: 'model-XXX.glb',
    minFileSize: 1000,
    expectedCount: 22,
    basePath: '/assets/envato/3d-models/',
    envatoCategory: '3d-models',
    envatoSearchTerms: ['african mask 3d', 'drum 3d model glb', 'tribal sculpture 3d']
  },
  
  'fonts': {
    id: 'fonts',
    displayName: 'Fonts',
    displayNameFr: 'Polices',
    icon: '🔤',
    color: 'text-indigo-500',
    expectedFormats: ['.ttf', '.otf', '.woff', '.woff2'],
    namingPattern: 'FontName.ttf',
    minFileSize: 5000,
    expectedCount: 5,
    basePath: '/assets/envato/fonts/',
    envatoCategory: 'fonts',
    envatoSearchTerms: ['modern sans serif', 'display font bold', 'african inspired font']
  },
  
  'audio': {
    id: 'audio',
    displayName: 'Audio',
    displayNameFr: 'Audio',
    icon: '🎵',
    color: 'text-pink-500',
    expectedFormats: ['.mp3', '.wav', '.ogg', '.m4a'],
    namingPattern: 'audio-XXX.mp3',
    minFileSize: 10000,
    expectedCount: 26,
    basePath: '/assets/envato/audio/',
    envatoCategory: 'audio',
    envatoSearchTerms: ['afrobeat music', 'african drums', 'tribal percussion']
  }
};

// ============================================================================
// AUDIO SUBFOLDERS - Convention unifiée
// ============================================================================

export const AUDIO_SUBFOLDERS = {
  modern: {
    path: 'modern/',
    displayName: 'Modern / Afrobeat',
    pattern: 'afrobeat-XXX.mp3',
    expectedCount: 10
  },
  traditional: {
    path: 'traditional/',
    displayName: 'Traditional',
    pattern: 'traditional-XXX.mp3',
    expectedCount: 8
  },
  percussion: {
    path: 'percussion/',
    displayName: 'Percussion',
    pattern: 'percussion-XXX.mp3',
    expectedCount: 8
  }
};

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Génère la liste des fichiers attendus pour une catégorie
 */
export function generateExpectedFiles(categoryId: string): string[] {
  const config = ASSET_CATEGORIES[categoryId];
  if (!config) return [];
  
  const files: string[] = [];
  
  if (categoryId === 'audio') {
    // Audio a des sous-dossiers
    Object.entries(AUDIO_SUBFOLDERS).forEach(([key, subfolder]) => {
      for (let i = 1; i <= subfolder.expectedCount; i++) {
        const filename = subfolder.pattern.replace('XXX', String(i).padStart(3, '0'));
        files.push(`${subfolder.path}${filename}`);
      }
    });
  } else if (categoryId === 'fonts') {
    // Fonts ont des noms spécifiques
    files.push('Orbitron-Regular.ttf', 'Oswald-Regular.ttf', 'BebasNeue-Regular.ttf', 
               'Montserrat-Regular.ttf', 'PlayfairDisplay-Regular.ttf');
  } else {
    // Catégories standards avec numérotation
    for (let i = 1; i <= config.expectedCount; i++) {
      const filename = config.namingPattern.replace('XXX', String(i).padStart(3, '0'));
      files.push(filename);
    }
  }
  
  return files;
}

/**
 * Vérifie si un nom de fichier correspond au pattern attendu
 */
export function matchesNamingPattern(filename: string, categoryId: string): boolean {
  const config = ASSET_CATEGORIES[categoryId];
  if (!config) return false;
  
  const pattern = config.namingPattern;
  const regex = new RegExp('^' + pattern.replace('XXX', '\\d{3}').replace('.', '\\.') + '$', 'i');
  return regex.test(filename);
}

/**
 * Détecte la catégorie probable d'un fichier basé sur son nom
 */
export function detectFileCategory(filename: string): string | null {
  const name = filename.toLowerCase();
  
  if (name.startsWith('flare-') && name.endsWith('.png')) return 'lens-flare';
  if (name.startsWith('leak-') && (name.endsWith('.webm') || name.endsWith('.mp4'))) return 'light-leak';
  if (name.startsWith('particle-') && name.endsWith('.webm')) return 'particles';
  if (name.startsWith('transition-') && name.endsWith('.mp4')) return 'transitions';
  if (name.startsWith('texture-') || name.startsWith('video-')) return 'textures';
  if (name.startsWith('model-') && name.endsWith('.glb')) return '3d-models';
  if (name.endsWith('.ttf') || name.endsWith('.otf') || name.endsWith('.woff2')) return 'fonts';
  if (name.endsWith('.mp3') || name.endsWith('.wav')) return 'audio';
  
  return null;
}

/**
 * Génère le chemin cible pour un fichier dans une catégorie
 */
export function getTargetPath(categoryId: string, index: number): string {
  const config = ASSET_CATEGORIES[categoryId];
  if (!config) return '';
  
  const filename = config.namingPattern.replace('XXX', String(index).padStart(3, '0'));
  return `${config.basePath}${filename}`;
}

/**
 * Vérifie si une taille de fichier indique un LFS pointer
 */
export function isLikelyLFSPointer(size: number, categoryId: string): boolean {
  const config = ASSET_CATEGORIES[categoryId];
  if (!config) return size < 500; // Défaut: < 500 bytes = LFS
  
  return size < config.minFileSize && size > 100 && size < 500;
}

/**
 * Obtient l'URL de recherche Envato pour une catégorie
 */
export function getEnvatoSearchUrl(categoryId: string, searchIndex: number = 0): string {
  const config = ASSET_CATEGORIES[categoryId];
  if (!config) return 'https://elements.envato.com/';
  
  const term = config.envatoSearchTerms[searchIndex % config.envatoSearchTerms.length];
  return `https://elements.envato.com/${config.envatoCategory}?q=${encodeURIComponent(term)}`;
}

/**
 * Calcule les statistiques globales
 */
export function getGlobalStats(): { totalExpected: number; categories: number } {
  const categories = Object.keys(ASSET_CATEGORIES).length;
  const totalExpected = Object.values(ASSET_CATEGORIES).reduce((sum, cat) => sum + cat.expectedCount, 0);
  return { totalExpected, categories };
}

// ============================================================================
// PROBLÈMES CONNUS À CORRIGER
// ============================================================================

export interface KnownAssetIssue {
  id: string;
  category: string;
  problemType: 'misplaced' | 'wrong-naming' | 'lfs-pointer' | 'missing' | 'duplicate';
  description: string;
  currentPattern?: string;
  expectedPattern: string;
  affectedCount: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  autoFixable: boolean;
}

export const KNOWN_ISSUES: KnownAssetIssue[] = [
  {
    id: '3d-models-misplaced',
    category: '3d-models',
    problemType: 'misplaced',
    description: 'Fichiers leak-XXX.webm présents au lieu de model-XXX.glb',
    currentPattern: 'leak-XXX.webm',
    expectedPattern: 'model-XXX.glb',
    affectedCount: 22,
    priority: 'critical',
    autoFixable: false // Nécessite téléchargement de vrais modèles 3D
  },
  {
    id: 'particles-wrong-naming',
    category: 'particles',
    problemType: 'wrong-naming',
    description: 'Fichiers nommés leak-XXX.webm au lieu de particle-XXX.webm',
    currentPattern: 'leak-XXX.webm',
    expectedPattern: 'particle-XXX.webm',
    affectedCount: 37,
    priority: 'high',
    autoFixable: true // Simple renommage
  },
  {
    id: 'transitions-misplaced',
    category: 'transitions',
    problemType: 'misplaced',
    description: 'Fichiers leak-XXX.webm mélangés avec les vraies transitions',
    currentPattern: 'leak-XXX.webm',
    expectedPattern: 'transition-XXX.mp4',
    affectedCount: 20,
    priority: 'medium',
    autoFixable: true // Déplacer vers light-leak
  },
  {
    id: 'audio-duplicates',
    category: 'audio',
    problemType: 'duplicate',
    description: 'Doublons entre audio-XXX.mp3 et audio-0XXX.mp3',
    currentPattern: 'audio-0XXX.mp3',
    expectedPattern: 'afrobeat-XXX.mp3 / traditional-XXX.mp3',
    affectedCount: 13,
    priority: 'medium',
    autoFixable: true
  },
  {
    id: 'fonts-missing',
    category: 'fonts',
    problemType: 'missing',
    description: 'Dossier fonts vide - polices chargées via Google Fonts',
    expectedPattern: 'FontName.ttf',
    affectedCount: 5,
    priority: 'low',
    autoFixable: false // Optionnel car Google Fonts fonctionne
  }
];

export default ASSET_CATEGORIES;
