/**
 * TAM-TAM Asset Real Mapping v4.2
 * Mappage des assets réellement présents avec support cross-dossier
 * Récupère automatiquement les Light Leaks depuis le dossier 3d-models
 */

// ============================================================================
// CROSS-FOLDER MAPPING (Light Leaks dans 3d-models)
// Les fichiers leak-XXX.webm dans 3d-models sont en fait des Light Leaks
// ============================================================================

/**
 * Mapping cross-dossier: fichiers dans le mauvais dossier
 * Format: 'target-category:expected-name' -> 'actual-category:actual-name'
 */
export const CROSS_FOLDER_MAPPING: Record<string, string> = {
  // Light Leaks 018-039 sont dans le dossier 3d-models
  ...Object.fromEntries(
    Array.from({ length: 22 }, (_, i) => {
      const targetNum = String(i + 18).padStart(3, '0'); // leak-018 to leak-039
      const sourceNum = String(i + 1).padStart(3, '0'); // leak-001 to leak-022 in 3d-models
      return [`light-leak:leak-${targetNum}.webm`, `3d-models:leak-${sourceNum}.webm`];
    })
  ),
};

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
  // LIGHT-LEAK - Formats mixtes (MP4 et WebM) + cross-folder mapping
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

  // Cross-folder: Light Leaks 018-039 depuis le dossier 3d-models
  ...CROSS_FOLDER_MAPPING,
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
  crossFolderFiles?: string[]; // Fichiers récupérés d'autres dossiers
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
    available: 39, // 17 originaux + 22 récupérés de 3d-models
    expected: 40,
    files: [
      // Fichiers originaux dans light-leak
      'leak-001.webm', 'leak-002.webm', 'leak-002.mp4', 'leak-003.webm',
      'leak-004.webm', 'leak-004.mp4', 'leak-005.mp4', 'leak-006.mp4',
      'leak-007.mp4', 'leak-008.mp4', 'leak-009.mp4', 'leak-010.mp4',
      'leak-011.mp4', 'leak-012.mp4', 'leak-013.mp4', 'leak-014.mp4',
      'leak-015.mp4', 'leak-016.mp4', 'leak-017.mp4',
    ],
    crossFolderFiles: [
      // Fichiers récupérés depuis 3d-models
      'leak-018.webm', 'leak-019.webm', 'leak-020.webm', 'leak-021.webm',
      'leak-022.webm', 'leak-023.webm', 'leak-024.webm', 'leak-025.webm',
      'leak-026.webm', 'leak-027.webm', 'leak-028.webm', 'leak-029.webm',
      'leak-030.webm', 'leak-031.webm', 'leak-032.webm', 'leak-033.webm',
      'leak-034.webm', 'leak-035.webm', 'leak-036.webm', 'leak-037.webm',
      'leak-038.webm', 'leak-039.webm',
    ],
    status: 'partial', // 39/40 = 97.5%
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
    files: [], // Fichiers leak-XXX.webm redirigés vers light-leak
    status: 'empty',
    // Note: Les 22 fichiers leak-XXX.webm sont maintenant utilisés comme Light Leaks
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
 * Résout un ID d'asset vers le chemin réel (incluant cross-folder)
 */
export function resolveAssetPath(assetId: string): string {
  // Priorité 1: Vérifier le mapping cross-folder
  if (CROSS_FOLDER_MAPPING[assetId]) {
    return CROSS_FOLDER_MAPPING[assetId];
  }
  
  // Priorité 2: Vérifier le mapping standard
  if (ASSET_REAL_MAPPING[assetId]) {
    return ASSET_REAL_MAPPING[assetId];
  }
  
  return assetId;
}

/**
 * Construit le chemin complet vers un asset résolu
 * Gère automatiquement les changements de catégorie
 */
export function buildResolvedAssetUrl(assetId: string, basePath = '/assets/envato'): string {
  const resolvedId = resolveAssetPath(assetId);
  const [categoryPath, filename] = resolvedId.split(':');
  
  // Gérer les sous-dossiers (ex: audio/modern)
  const pathParts = categoryPath.split('/');
  
  return `${basePath}/${pathParts.join('/')}/${filename}`;
}

/**
 * Vérifie si un asset est disponible (y compris cross-folder)
 */
export function isAssetAvailable(assetId: string): boolean {
  const [category, filename] = assetId.split(':');
  const inventory = ASSET_INVENTORY[category];
  if (!inventory) return false;
  
  // Vérifier dans les fichiers directs
  const directMatch = inventory.files.some(f => 
    f === filename || f.endsWith(`/${filename}`)
  );
  if (directMatch) return true;
  
  // Vérifier dans les fichiers cross-folder
  if (inventory.crossFolderFiles) {
    const crossMatch = inventory.crossFolderFiles.some(f => f === filename);
    if (crossMatch) return true;
  }
  
  // Vérifier si le mapping existe
  const resolvedId = resolveAssetPath(assetId);
  if (resolvedId !== assetId) {
    const [resolvedCategory, resolvedFilename] = resolvedId.split(':');
    const resolvedInventory = ASSET_INVENTORY[resolvedCategory];
    if (resolvedInventory) {
      return resolvedInventory.files.some(f => 
        f === resolvedFilename || f.endsWith(`/${resolvedFilename}`)
      );
    }
  }
  
  return false;
}

/**
 * Obtient les statistiques globales des assets
 */
export function getAssetStats(): {
  totalAvailable: number;
  totalExpected: number;
  completionRate: number;
  byCategory: Record<string, { available: number; expected: number; rate: number; crossFolder?: number }>;
} {
  let totalAvailable = 0;
  let totalExpected = 0;
  const byCategory: Record<string, { available: number; expected: number; rate: number; crossFolder?: number }> = {};

  for (const [key, inventory] of Object.entries(ASSET_INVENTORY)) {
    const crossFolderCount = inventory.crossFolderFiles?.length || 0;
    const effectiveAvailable = inventory.available;
    
    totalAvailable += effectiveAvailable;
    totalExpected += inventory.expected;
    
    byCategory[key] = {
      available: effectiveAvailable,
      expected: inventory.expected,
      rate: inventory.expected > 0 ? Math.round((effectiveAvailable / inventory.expected) * 100) : 0,
      crossFolder: crossFolderCount > 0 ? crossFolderCount : undefined,
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
 * Inclut les fichiers cross-folder
 */
export function getAvailableAssetsForCategory(category: string): string[] {
  const inventory = ASSET_INVENTORY[category];
  if (!inventory || inventory.status === 'empty') return [];

  const assets: string[] = [];

  // Fichiers directs
  for (const file of inventory.files) {
    if (file.includes('/')) {
      // Audio avec sous-dossier
      const [subfolder, filename] = file.split('/');
      assets.push(`${category}/${subfolder}:${filename}`);
    } else {
      assets.push(`${category}:${file}`);
    }
  }

  // Fichiers cross-folder
  if (inventory.crossFolderFiles) {
    for (const file of inventory.crossFolderFiles) {
      assets.push(`${category}:${file}`);
    }
  }

  return assets;
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

/**
 * Obtient les Light Leaks recommandés pour les templates premium
 */
export function getRecommendedLightLeaks(): string[] {
  return [
    'light-leak:leak-005.mp4',
    'light-leak:leak-008.mp4',
    'light-leak:leak-012.mp4',
    'light-leak:leak-020.webm', // Cross-folder
    'light-leak:leak-025.webm', // Cross-folder
    'light-leak:leak-030.webm', // Cross-folder
  ];
}
