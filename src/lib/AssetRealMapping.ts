/**
 * TAM-TAM Asset Real Mapping - Mappage des assets réellement présents
 * Ce fichier résout les problèmes de nommage en mappant les noms attendus vers les noms réels
 */

// ============================================================================
// INVENTAIRE RÉEL DES ASSETS
// ============================================================================

/**
 * Mapping des assets: nom attendu -> nom réel dans le filesystem
 * Utilisé par l'AssetManager pour charger les bons fichiers
 */
export const ASSET_REAL_MAPPING: Record<string, string> = {
  // =========================================================================
  // PARTICLES - Fichiers nommés leak-XXX.webm au lieu de particle-XXX.webm
  // =========================================================================
  ...Object.fromEntries(
    Array.from({ length: 37 }, (_, i) => {
      const num = String(i + 1).padStart(3, '0');
      return [`particles:particle-${num}.webm`, `particles:leak-${num}.webm`];
    })
  ),

  // =========================================================================
  // TRANSITIONS - Fichiers mal nommés (mélange de formats)
  // =========================================================================
  'transitions:transition-001.mp4': 'transitions:Transition-001.mp4',
  'transitions:transition-002.mp4': 'transitions:Transition-02.mp4',
  'transitions:transition-003.mp4': 'transitions:Transition-03.mp4',
  'transitions:transition-004.mp4': 'transitions:Transition-04.mp4',
  'transitions:transition-005.mp4': 'transitions:Transition-05.mp4',
  'transitions:transition-006.mp4': 'transitions:Transition-06.mp4',
  'transitions:transition-007.mp4': 'transitions:Transition-07.mp4',
  'transitions:transition-008.mp4': 'transitions:Transition-08.mp4',
  'transitions:transition-009.mp4': 'transitions:Transition-09.mp4',
  'transitions:transition-010.mp4': 'transitions:Transition-10.mp4',
  'transitions:transition-011.webm': 'transitions:Transition 1_in.webm',
  'transitions:transition-012.webm': 'transitions:Transition 2_in.webm',
  // Leak files utilisables comme transitions supplémentaires
  ...Object.fromEntries(
    Array.from({ length: 20 }, (_, i) => {
      const num = String(i + 13).padStart(3, '0');
      const leakNum = String(i + 1).padStart(3, '0');
      return [`transitions:transition-${num}.webm`, `transitions:leak-${leakNum}.webm`];
    })
  ),

  // =========================================================================
  // TEXTURES - Fichiers nommés video-XXX.mp4 au lieu de texture-XXX.mp4
  // =========================================================================
  ...Object.fromEntries(
    Array.from({ length: 215 }, (_, i) => {
      const num = String(i + 1).padStart(3, '0');
      return [`textures:texture-${num}.mp4`, `textures:video-${num}.mp4`];
    })
  ),

  // =========================================================================
  // AUDIO - Normalisation des noms avec doublons
  // Modern folder
  'audio/modern:afrobeat-001.mp3': 'audio/modern:audio-009.mp3',
  'audio/modern:afrobeat-002.mp3': 'audio/modern:audio-010.mp3',
  'audio/modern:afrobeat-003.mp3': 'audio/modern:audio-011.mp3',
  'audio/modern:afrobeat-004.mp3': 'audio/modern:audio-012.mp3',
  'audio/modern:afrobeat-005.mp3': 'audio/modern:audio-013.mp3',
  'audio/modern:afrobeat-006.mp3': 'audio/modern:audio-0009.mp3',
  'audio/modern:afrobeat-007.mp3': 'audio/modern:audio-0010.mp3',
  'audio/modern:afrobeat-008.mp3': 'audio/modern:audio-0011.mp3',
  'audio/modern:afrobeat-009.mp3': 'audio/modern:audio-0012.mp3',
  'audio/modern:afrobeat-010.mp3': 'audio/modern:audio-0013.mp3',
  
  // Traditional folder
  'audio/traditional:traditional-001.mp3': 'audio/traditional:audio-001.mp3',
  'audio/traditional:traditional-002.mp3': 'audio/traditional:audio-002.mp3',
  'audio/traditional:traditional-003.mp3': 'audio/traditional:audio-003.mp3',
  'audio/traditional:traditional-004.mp3': 'audio/traditional:audio-004.mp3',
  'audio/traditional:traditional-005.mp3': 'audio/traditional:audio-0001.mp3',
  'audio/traditional:traditional-006.mp3': 'audio/traditional:audio-0002.mp3',
  'audio/traditional:traditional-007.mp3': 'audio/traditional:audio-0003.mp3',
  'audio/traditional:traditional-008.mp3': 'audio/traditional:audio-0004.mp3',
  
  // Percussion folder
  'audio/percussion:percussion-001.mp3': 'audio/percussion:audio-005.mp3',
  'audio/percussion:percussion-002.mp3': 'audio/percussion:audio-006.mp3',
  'audio/percussion:percussion-003.mp3': 'audio/percussion:audio-007.mp3',
  'audio/percussion:percussion-004.mp3': 'audio/percussion:audio-008.mp3',
  'audio/percussion:percussion-005.mp3': 'audio/percussion:audio-0005.mp3',
  'audio/percussion:percussion-006.mp3': 'audio/percussion:audio-0006.mp3',
  'audio/percussion:percussion-007.mp3': 'audio/percussion:audio-0007.mp3',
  'audio/percussion:percussion-008.mp3': 'audio/percussion:audio-0008.mp3',

  // =========================================================================
  // LIGHT-LEAK - Formats mixtes (MP4 et WebM)
  // =========================================================================
  'light-leak:leak-001.webm': 'light-leak:leak-001.webm',
  'light-leak:leak-002.webm': 'light-leak:leak-002.webm',
  'light-leak:leak-003.webm': 'light-leak:leak-003.webm',
  'light-leak:leak-004.webm': 'light-leak:leak-004.webm',
  // Fallback MP4 pour les navigateurs sans support WebM
  'light-leak:leak-002.mp4': 'light-leak:leak-002.mp4',
  'light-leak:leak-004.mp4': 'light-leak:leak-004.mp4',
  'light-leak:leak-005.mp4': 'light-leak:leak-005.mp4',
  'light-leak:leak-006.mp4': 'light-leak:leak-006.mp4',
  'light-leak:leak-007.mp4': 'light-leak:leak-007.mp4',
  'light-leak:leak-008.mp4': 'light-leak:leak-008.mp4',
  'light-leak:leak-009.mp4': 'light-leak:leak-009.mp4',
  'light-leak:leak-010.mp4': 'light-leak:leak-010.mp4',
  'light-leak:leak-011.mp4': 'light-leak:leak-011.mp4',
  'light-leak:leak-012.mp4': 'light-leak:leak-012.mp4',
  'light-leak:leak-013.mp4': 'light-leak:leak-013.mp4',
  'light-leak:leak-014.mp4': 'light-leak:leak-014.mp4',
  'light-leak:leak-015.mp4': 'light-leak:leak-015.mp4',
  'light-leak:leak-016.mp4': 'light-leak:leak-016.mp4',
  'light-leak:leak-017.mp4': 'light-leak:leak-017.mp4',
};

// ============================================================================
// INVENTAIRE COMPLET DES ASSETS DISPONIBLES
// ============================================================================

export interface AssetInventory {
  category: string;
  available: number;
  expected: number;
  files: string[];
  status: 'complete' | 'partial' | 'empty';
}

export const ASSET_INVENTORY: Record<string, AssetInventory> = {
  'lens-flare': {
    category: 'lens-flare',
    available: 455,
    expected: 455,
    files: Array.from({ length: 455 }, (_, i) => `flare-${String(i + 1).padStart(3, '0')}.png`),
    status: 'complete',
  },
  'audio': {
    category: 'audio',
    available: 22,
    expected: 26,
    files: [
      // Modern
      'modern/audio-009.mp3', 'modern/audio-010.mp3', 'modern/audio-011.mp3',
      'modern/audio-012.mp3', 'modern/audio-013.mp3',
      'modern/audio-0009.mp3', 'modern/audio-0010.mp3', 'modern/audio-0011.mp3',
      'modern/audio-0012.mp3', 'modern/audio-0013.mp3',
      // Traditional
      'traditional/audio-001.mp3', 'traditional/audio-002.mp3',
      'traditional/audio-003.mp3', 'traditional/audio-004.mp3',
      'traditional/audio-0001.mp3', 'traditional/audio-0002.mp3',
      'traditional/audio-0003.mp3', 'traditional/audio-0004.mp3',
      // Percussion
      'percussion/audio-005.mp3', 'percussion/audio-006.mp3',
      'percussion/audio-007.mp3', 'percussion/audio-008.mp3',
    ],
    status: 'partial',
  },
  'light-leak': {
    category: 'light-leak',
    available: 17,
    expected: 40,
    files: [
      'leak-001.webm', 'leak-002.webm', 'leak-002.mp4', 'leak-003.webm',
      'leak-004.webm', 'leak-004.mp4', 'leak-005.mp4', 'leak-006.mp4',
      'leak-007.mp4', 'leak-008.mp4', 'leak-009.mp4', 'leak-010.mp4',
      'leak-011.mp4', 'leak-012.mp4', 'leak-013.mp4', 'leak-014.mp4',
      'leak-015.mp4', 'leak-016.mp4', 'leak-017.mp4',
    ],
    status: 'partial',
  },
  'particles': {
    category: 'particles',
    available: 37,
    expected: 37,
    files: Array.from({ length: 37 }, (_, i) => `leak-${String(i + 1).padStart(3, '0')}.webm`),
    status: 'complete', // Fichiers présents mais mal nommés
  },
  'transitions': {
    category: 'transitions',
    available: 32,
    expected: 32,
    files: [
      'Transition-001.mp4', 'Transition-02.mp4', 'Transition-03.mp4',
      'Transition-04.mp4', 'Transition-05.mp4', 'Transition-06.mp4',
      'Transition-07.mp4', 'Transition-08.mp4', 'Transition-09.mp4',
      'Transition-10.mp4', 'Transition 1_in.webm', 'Transition 2_in.webm',
      ...Array.from({ length: 20 }, (_, i) => `leak-${String(i + 1).padStart(3, '0')}.webm`),
    ],
    status: 'complete',
  },
  'textures': {
    category: 'textures',
    available: 215,
    expected: 215,
    files: Array.from({ length: 215 }, (_, i) => `video-${String(i + 1).padStart(3, '0')}.mp4`),
    status: 'complete',
  },
  '3d-models': {
    category: '3d-models',
    available: 0,
    expected: 22,
    files: [], // Fichiers leak-XXX.webm incorrects, pas de vrais modèles 3D
    status: 'empty',
  },
  'fonts': {
    category: 'fonts',
    available: 0,
    expected: 5,
    files: [],
    status: 'empty', // Utilise Google Fonts à la place
  },
};

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Résout un ID d'asset vers le chemin réel
 */
export function resolveAssetPath(assetId: string): string {
  return ASSET_REAL_MAPPING[assetId] || assetId;
}

/**
 * Vérifie si un asset est disponible
 */
export function isAssetAvailable(assetId: string): boolean {
  const [category, filename] = assetId.split(':');
  const inventory = ASSET_INVENTORY[category];
  if (!inventory) return false;
  
  // Vérifier dans le mapping ou directement
  const resolvedId = resolveAssetPath(assetId);
  const [, resolvedFilename] = resolvedId.split(':');
  
  return inventory.files.some(f => 
    f === filename || 
    f === resolvedFilename || 
    f.endsWith(`/${filename}`) ||
    f.endsWith(`/${resolvedFilename}`)
  );
}

/**
 * Obtient les statistiques globales des assets
 */
export function getAssetStats(): {
  totalAvailable: number;
  totalExpected: number;
  completionRate: number;
  byCategory: Record<string, { available: number; expected: number; rate: number }>;
} {
  let totalAvailable = 0;
  let totalExpected = 0;
  const byCategory: Record<string, { available: number; expected: number; rate: number }> = {};

  for (const [key, inventory] of Object.entries(ASSET_INVENTORY)) {
    totalAvailable += inventory.available;
    totalExpected += inventory.expected;
    byCategory[key] = {
      available: inventory.available,
      expected: inventory.expected,
      rate: inventory.expected > 0 ? Math.round((inventory.available / inventory.expected) * 100) : 0,
    };
  }

  return {
    totalAvailable,
    totalExpected,
    completionRate: Math.round((totalAvailable / totalExpected) * 100),
    byCategory,
  };
}

/**
 * Obtient les assets disponibles par catégorie pour les templates
 */
export function getAvailableAssetsForCategory(category: string): string[] {
  const inventory = ASSET_INVENTORY[category];
  if (!inventory || inventory.status === 'empty') return [];

  return inventory.files.map(file => {
    if (file.includes('/')) {
      // Audio avec sous-dossier
      const [subfolder, filename] = file.split('/');
      return `${category}/${subfolder}:${filename}`;
    }
    return `${category}:${file}`;
  });
}

/**
 * Sélectionne aléatoirement des assets d'une catégorie
 */
export function pickRandomAssets(category: string, count: number): string[] {
  const available = getAvailableAssetsForCategory(category);
  if (available.length === 0) return [];

  const shuffled = [...available].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}
