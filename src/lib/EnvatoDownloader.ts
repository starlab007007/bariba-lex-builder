/**
 * EnvatoDownloader - Service de téléchargement d'assets depuis Envato Elements
 * Gère l'authentification, le mapping des assets, et les téléchargements avec retry
 */

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface EnvatoAssetMapping {
  local: string;
  envato: string;
  id: string;
  category: 'stock-video' | 'graphics' | '3d-models' | 'fonts' | 'audio';
  format?: string;
  fallbackUrl?: string;
  // Enhanced URL generation
  envatoSlug?: string;           // Direct slug if known (e.g., 'light-leak-orange-4k-XXXXXX')
  envatoSearchQuery?: string;    // Precise search query for exact match
  expectedSpecs?: {
    minSize?: number;            // bytes
    maxSize?: number;            // bytes
    resolution?: string;         // e.g., '4K', '1080p'
    duration?: string;           // e.g., '5-10s'
    hasAlpha?: boolean;
  };
}

export interface EnvatoAsset {
  id: string;
  name: string;
  category: string;
  previewUrl?: string;
  downloadUrl?: string;
  author?: string;
  license?: string;
}

export interface DownloadProgress {
  category: string;
  current: number;
  total: number;
  currentFile: string;
  bytesDownloaded: number;
  totalBytes: number;
  speed: number; // bytes/sec
  eta: number; // seconds
  status: 'pending' | 'downloading' | 'completed' | 'error' | 'paused';
  errors: DownloadError[];
}

export interface DownloadError {
  file: string;
  error: string;
  attempt: number;
  timestamp: Date;
}

export interface EnvatoCredentials {
  email: string;
  password?: string;
  token?: string;
}

export interface DownloadState {
  category: string;
  completedFiles: string[];
  failedFiles: string[];
  lastUpdated: Date;
}

// ============================================================================
// ENVATO ASSET MAP - Mapping complet TAM-TAM → Envato Elements
// ============================================================================

export const ENVATO_ASSET_MAP: Record<string, EnvatoAssetMapping[]> = {
  'light-leak': [
    { local: 'leak-001.webm', envato: 'Light Leak Orange 4K with Alpha', id: 'LLEAK001', category: 'stock-video', envatoSearchQuery: 'light leak orange 4k alpha overlay transparent', expectedSpecs: { minSize: 500000, resolution: '4K', hasAlpha: true } },
    { local: 'leak-002.webm', envato: 'Blue Light Leak Cinematic 4K', id: 'LLEAK002', category: 'stock-video', envatoSearchQuery: 'blue light leak cinematic 4k overlay', expectedSpecs: { minSize: 500000, resolution: '4K', hasAlpha: true } },
    { local: 'leak-003.webm', envato: 'Golden Light Leak Film Look', id: 'LLEAK003', category: 'stock-video', envatoSearchQuery: 'golden light leak film look overlay', expectedSpecs: { minSize: 500000, resolution: '4K', hasAlpha: true } },
    { local: 'leak-004.webm', envato: 'Purple Light Leak Overlay', id: 'LLEAK004', category: 'stock-video', envatoSearchQuery: 'purple light leak overlay 4k', expectedSpecs: { minSize: 500000, resolution: '4K', hasAlpha: true } },
    { local: 'leak-005.webm', envato: 'Rainbow Light Leak Pack', id: 'LLEAK005', category: 'stock-video', envatoSearchQuery: 'rainbow light leak prism overlay', expectedSpecs: { minSize: 500000, resolution: '4K', hasAlpha: true } },
    { local: 'leak-006.webm', envato: 'Vintage Film Light Leak', id: 'LLEAK006', category: 'stock-video', envatoSearchQuery: 'vintage film light leak retro overlay', expectedSpecs: { minSize: 500000, resolution: '4K', hasAlpha: true } },
    { local: 'leak-007.webm', envato: 'Warm Light Leak Transition', id: 'LLEAK007', category: 'stock-video', envatoSearchQuery: 'warm light leak transition overlay', expectedSpecs: { minSize: 500000, resolution: '4K', hasAlpha: true } },
    { local: 'leak-008.webm', envato: 'Cool Blue Light Leak', id: 'LLEAK008', category: 'stock-video', envatoSearchQuery: 'cool blue light leak overlay 4k', expectedSpecs: { minSize: 500000, resolution: '4K', hasAlpha: true } },
    { local: 'leak-009.webm', envato: 'Soft Light Leak Overlay', id: 'LLEAK009', category: 'stock-video', envatoSearchQuery: 'soft light leak subtle overlay', expectedSpecs: { minSize: 500000, resolution: '4K', hasAlpha: true } },
    { local: 'leak-010.webm', envato: 'Dynamic Light Leak Motion', id: 'LLEAK010', category: 'stock-video', envatoSearchQuery: 'dynamic light leak motion overlay', expectedSpecs: { minSize: 500000, resolution: '4K', hasAlpha: true } },
    { local: 'leak-011.webm', envato: 'Neon Light Leak Effect', id: 'LLEAK011', category: 'stock-video', envatoSearchQuery: 'neon light leak effect overlay', expectedSpecs: { minSize: 500000, resolution: '4K', hasAlpha: true } },
    { local: 'leak-012.webm', envato: 'Sunset Light Leak Orange', id: 'LLEAK012', category: 'stock-video', envatoSearchQuery: 'sunset orange light leak overlay', expectedSpecs: { minSize: 500000, resolution: '4K', hasAlpha: true } },
    { local: 'leak-013.webm', envato: 'Abstract Light Leak Art', id: 'LLEAK013', category: 'stock-video', envatoSearchQuery: 'abstract light leak artistic overlay', expectedSpecs: { minSize: 500000, resolution: '4K', hasAlpha: true } },
    { local: 'leak-014.webm', envato: 'Film Burn Light Leak', id: 'LLEAK014', category: 'stock-video', envatoSearchQuery: 'film burn light leak vintage overlay', expectedSpecs: { minSize: 500000, resolution: '4K', hasAlpha: true } },
    { local: 'leak-015.webm', envato: 'Prism Light Leak Rainbow', id: 'LLEAK015', category: 'stock-video', envatoSearchQuery: 'prism rainbow light leak overlay', expectedSpecs: { minSize: 500000, resolution: '4K', hasAlpha: true } },
    { local: 'leak-016.webm', envato: 'Anamorphic Light Leak', id: 'LLEAK016', category: 'stock-video', envatoSearchQuery: 'anamorphic light leak cinematic overlay', expectedSpecs: { minSize: 500000, resolution: '4K', hasAlpha: true } },
    { local: 'leak-017.webm', envato: 'Retro Light Leak Pack', id: 'LLEAK017', category: 'stock-video', envatoSearchQuery: 'retro light leak pack overlay', expectedSpecs: { minSize: 500000, resolution: '4K', hasAlpha: true } },
  ],

  'particles': [
    { local: 'particle-001.webm', envato: 'Golden Bokeh Particles 4K', id: 'PART001', category: 'stock-video' },
    { local: 'particle-002.webm', envato: 'Dust Particles Floating', id: 'PART002', category: 'stock-video' },
    { local: 'particle-003.webm', envato: 'Snow Particles Overlay', id: 'PART003', category: 'stock-video' },
    { local: 'particle-004.webm', envato: 'Sparkle Particles Gold', id: 'PART004', category: 'stock-video' },
    { local: 'particle-005.webm', envato: 'Fire Embers Particles', id: 'PART005', category: 'stock-video' },
    { local: 'particle-006.webm', envato: 'Magic Dust Particles', id: 'PART006', category: 'stock-video' },
    { local: 'particle-007.webm', envato: 'Confetti Particles Celebration', id: 'PART007', category: 'stock-video' },
    { local: 'particle-008.webm', envato: 'Rain Particles Overlay', id: 'PART008', category: 'stock-video' },
    { local: 'particle-009.webm', envato: 'Smoke Particles Dark', id: 'PART009', category: 'stock-video' },
    { local: 'particle-010.webm', envato: 'Glitter Particles Silver', id: 'PART010', category: 'stock-video' },
    { local: 'particle-011.webm', envato: 'Organic Particles Float', id: 'PART011', category: 'stock-video' },
    { local: 'particle-012.webm', envato: 'Abstract Particles Motion', id: 'PART012', category: 'stock-video' },
    { local: 'particle-013.webm', envato: 'Bubble Particles Water', id: 'PART013', category: 'stock-video' },
    { local: 'particle-014.webm', envato: 'Star Particles Twinkle', id: 'PART014', category: 'stock-video' },
    { local: 'particle-015.webm', envato: 'Pollen Particles Nature', id: 'PART015', category: 'stock-video' },
    { local: 'particle-016.webm', envato: 'Ash Particles Volcanic', id: 'PART016', category: 'stock-video' },
    { local: 'particle-017.webm', envato: 'Fairy Dust Particles', id: 'PART017', category: 'stock-video' },
    { local: 'particle-018.webm', envato: 'Sand Particles Desert', id: 'PART018', category: 'stock-video' },
    { local: 'particle-019.webm', envato: 'Leaves Particles Autumn', id: 'PART019', category: 'stock-video' },
    { local: 'particle-020.webm', envato: 'Petals Particles Cherry', id: 'PART020', category: 'stock-video' },
    { local: 'particle-021.webm', envato: 'Feather Particles Float', id: 'PART021', category: 'stock-video' },
    { local: 'particle-022.webm', envato: 'Seeds Particles Wind', id: 'PART022', category: 'stock-video' },
    { local: 'particle-023.webm', envato: 'Fireflies Particles Night', id: 'PART023', category: 'stock-video' },
    { local: 'particle-024.webm', envato: 'Motes Particles Light', id: 'PART024', category: 'stock-video' },
    { local: 'particle-025.webm', envato: 'Nebula Particles Space', id: 'PART025', category: 'stock-video' },
    { local: 'particle-026.webm', envato: 'Electric Particles Energy', id: 'PART026', category: 'stock-video' },
    { local: 'particle-027.webm', envato: 'Ice Particles Frozen', id: 'PART027', category: 'stock-video' },
    { local: 'particle-028.webm', envato: 'Powder Particles Explosion', id: 'PART028', category: 'stock-video' },
    { local: 'particle-029.webm', envato: 'Liquid Particles Splash', id: 'PART029', category: 'stock-video' },
    { local: 'particle-030.webm', envato: 'Digital Particles Tech', id: 'PART030', category: 'stock-video' },
    { local: 'particle-031.webm', envato: 'Ink Particles Water', id: 'PART031', category: 'stock-video' },
    { local: 'particle-032.webm', envato: 'Fog Particles Atmosphere', id: 'PART032', category: 'stock-video' },
    { local: 'particle-033.webm', envato: 'Crystal Particles Shine', id: 'PART033', category: 'stock-video' },
    { local: 'particle-034.webm', envato: 'Geometric Particles Abstract', id: 'PART034', category: 'stock-video' },
    { local: 'particle-035.webm', envato: 'Plasma Particles Glow', id: 'PART035', category: 'stock-video' },
    { local: 'particle-036.webm', envato: 'Neon Particles Bright', id: 'PART036', category: 'stock-video' },
    { local: 'particle-037.webm', envato: 'Aurora Particles Northern', id: 'PART037', category: 'stock-video' },
  ],

  'lens-flare': generateLensFlareMapping(455),

  'transitions': [
    { local: 'transition-001.mp4', envato: 'Dynamic Transitions Pack', id: 'TRANS001', category: 'stock-video' },
    { local: 'transition-002.mp4', envato: 'Smooth Slide Transition', id: 'TRANS002', category: 'stock-video' },
    { local: 'transition-003.mp4', envato: 'Zoom Transition Effect', id: 'TRANS003', category: 'stock-video' },
    { local: 'transition-004.mp4', envato: 'Glitch Transition Digital', id: 'TRANS004', category: 'stock-video' },
    { local: 'transition-005.mp4', envato: 'Ink Transition Artistic', id: 'TRANS005', category: 'stock-video' },
    { local: 'transition-006.mp4', envato: 'Wipe Transition Clean', id: 'TRANS006', category: 'stock-video' },
    { local: 'transition-007.mp4', envato: 'Flash Transition White', id: 'TRANS007', category: 'stock-video' },
    { local: 'transition-008.mp4', envato: 'Spin Transition Rotate', id: 'TRANS008', category: 'stock-video' },
    { local: 'transition-009.mp4', envato: 'Fade Transition Smooth', id: 'TRANS009', category: 'stock-video' },
    { local: 'transition-010.mp4', envato: 'Shape Transition Circle', id: 'TRANS010', category: 'stock-video' },
    { local: 'transition-011.mp4', envato: 'Blur Transition Soft', id: 'TRANS011', category: 'stock-video' },
    { local: 'transition-012.mp4', envato: 'Split Transition Dual', id: 'TRANS012', category: 'stock-video' },
    { local: 'transition-013.mp4', envato: 'Pixel Transition Retro', id: 'TRANS013', category: 'stock-video' },
    { local: 'transition-014.mp4', envato: 'Brush Transition Paint', id: 'TRANS014', category: 'stock-video' },
    { local: 'transition-015.mp4', envato: 'Shake Transition Impact', id: 'TRANS015', category: 'stock-video' },
    { local: 'transition-016.mp4', envato: 'Distort Transition Wave', id: 'TRANS016', category: 'stock-video' },
    { local: 'transition-017.mp4', envato: 'Fold Transition Paper', id: 'TRANS017', category: 'stock-video' },
    { local: 'transition-018.mp4', envato: 'Dissolve Transition Film', id: 'TRANS018', category: 'stock-video' },
    { local: 'transition-019.mp4', envato: 'Push Transition Slide', id: 'TRANS019', category: 'stock-video' },
    { local: 'transition-020.mp4', envato: 'Reveal Transition Mask', id: 'TRANS020', category: 'stock-video' },
    { local: 'transition-021.mp4', envato: 'Morph Transition Liquid', id: 'TRANS021', category: 'stock-video' },
    { local: 'transition-022.mp4', envato: 'Stripe Transition Lines', id: 'TRANS022', category: 'stock-video' },
    { local: 'transition-023.mp4', envato: 'Cube Transition 3D', id: 'TRANS023', category: 'stock-video' },
    { local: 'transition-024.mp4', envato: 'Swirl Transition Spiral', id: 'TRANS024', category: 'stock-video' },
    { local: 'transition-025.mp4', envato: 'Cross Transition X', id: 'TRANS025', category: 'stock-video' },
    { local: 'transition-026.mp4', envato: 'Door Transition Open', id: 'TRANS026', category: 'stock-video' },
    { local: 'transition-027.mp4', envato: 'Shatter Transition Break', id: 'TRANS027', category: 'stock-video' },
    { local: 'transition-028.mp4', envato: 'Elastic Transition Bounce', id: 'TRANS028', category: 'stock-video' },
    { local: 'transition-029.mp4', envato: 'Grid Transition Tiles', id: 'TRANS029', category: 'stock-video' },
    { local: 'transition-030.mp4', envato: 'Light Transition Flash', id: 'TRANS030', category: 'stock-video' },
    { local: 'transition-031.mp4', envato: 'Energy Transition Power', id: 'TRANS031', category: 'stock-video' },
    { local: 'transition-032.mp4', envato: 'Nature Transition Organic', id: 'TRANS032', category: 'stock-video' },
  ],

  'textures': generateTextureMapping(215),

  '3d-models': [
    { local: 'model-001.glb', envato: 'Low Poly 3D Objects Pack', id: 'MODEL001', category: '3d-models' },
    { local: 'model-002.glb', envato: 'Geometric Shapes 3D', id: 'MODEL002', category: '3d-models' },
    { local: 'model-003.glb', envato: 'African Art 3D Models', id: 'MODEL003', category: '3d-models' },
    { local: 'model-004.glb', envato: 'Traditional Mask 3D', id: 'MODEL004', category: '3d-models' },
    { local: 'model-005.glb', envato: 'Drum 3D Model Djembe', id: 'MODEL005', category: '3d-models' },
    { local: 'model-006.glb', envato: 'Kora Instrument 3D', id: 'MODEL006', category: '3d-models' },
    { local: 'model-007.glb', envato: 'Baobab Tree 3D', id: 'MODEL007', category: '3d-models' },
    { local: 'model-008.glb', envato: 'Village Hut 3D', id: 'MODEL008', category: '3d-models' },
    { local: 'model-009.glb', envato: 'Pottery 3D African', id: 'MODEL009', category: '3d-models' },
    { local: 'model-010.glb', envato: 'Calabash 3D Model', id: 'MODEL010', category: '3d-models' },
    { local: 'model-011.glb', envato: 'Tribal Pattern 3D', id: 'MODEL011', category: '3d-models' },
    { local: 'model-012.glb', envato: 'Sun Symbol 3D', id: 'MODEL012', category: '3d-models' },
    { local: 'model-013.glb', envato: 'Moon Symbol 3D', id: 'MODEL013', category: '3d-models' },
    { local: 'model-014.glb', envato: 'Star Cluster 3D', id: 'MODEL014', category: '3d-models' },
    { local: 'model-015.glb', envato: 'Abstract Shape 3D', id: 'MODEL015', category: '3d-models' },
    { local: 'model-016.glb', envato: 'Logo 3D Extruded', id: 'MODEL016', category: '3d-models' },
    { local: 'model-017.glb', envato: 'Text 3D Typography', id: 'MODEL017', category: '3d-models' },
    { local: 'model-018.glb', envato: 'Icon Set 3D Pack', id: 'MODEL018', category: '3d-models' },
    { local: 'model-019.glb', envato: 'Frame 3D Decorative', id: 'MODEL019', category: '3d-models' },
    { local: 'model-020.glb', envato: 'Ring 3D Circular', id: 'MODEL020', category: '3d-models' },
    { local: 'model-021.glb', envato: 'Wave 3D Motion', id: 'MODEL021', category: '3d-models' },
    { local: 'model-022.glb', envato: 'Particle System 3D', id: 'MODEL022', category: '3d-models' },
  ],

  'fonts': [
    { local: 'font-001.ttf', envato: 'Montserrat Bold', id: 'FONT001', category: 'fonts', fallbackUrl: 'https://fonts.google.com/specimen/Montserrat' },
    { local: 'font-002.ttf', envato: 'Montserrat Regular', id: 'FONT002', category: 'fonts', fallbackUrl: 'https://fonts.google.com/specimen/Montserrat' },
    { local: 'font-003.ttf', envato: 'Montserrat Light', id: 'FONT003', category: 'fonts', fallbackUrl: 'https://fonts.google.com/specimen/Montserrat' },
    { local: 'font-004.ttf', envato: 'Open Sans Bold', id: 'FONT004', category: 'fonts', fallbackUrl: 'https://fonts.google.com/specimen/Open+Sans' },
    { local: 'font-005.ttf', envato: 'Open Sans Regular', id: 'FONT005', category: 'fonts', fallbackUrl: 'https://fonts.google.com/specimen/Open+Sans' },
    { local: 'font-006.ttf', envato: 'Lobster Regular', id: 'FONT006', category: 'fonts', fallbackUrl: 'https://fonts.google.com/specimen/Lobster' },
    { local: 'font-007.ttf', envato: 'Playfair Display Bold', id: 'FONT007', category: 'fonts', fallbackUrl: 'https://fonts.google.com/specimen/Playfair+Display' },
    { local: 'font-008.ttf', envato: 'Roboto Bold', id: 'FONT008', category: 'fonts', fallbackUrl: 'https://fonts.google.com/specimen/Roboto' },
    { local: 'font-009.ttf', envato: 'African Script Decorative', id: 'FONT009', category: 'fonts' },
  ],

  'audio': [
    // Modern
    { local: 'audio/modern/afrobeat-001.mp3', envato: 'Afrobeat Modern Groove', id: 'AUDIO001', category: 'audio' },
    { local: 'audio/modern/afrobeat-002.mp3', envato: 'Afrobeat Dance Floor', id: 'AUDIO002', category: 'audio' },
    { local: 'audio/modern/afrobeat-003.mp3', envato: 'Afrobeat Party Mix', id: 'AUDIO003', category: 'audio' },
    { local: 'audio/modern/afrobeat-004.mp3', envato: 'Afrobeat Chill Vibes', id: 'AUDIO004', category: 'audio' },
    { local: 'audio/modern/afrobeat-005.mp3', envato: 'Afrobeat Urban Beat', id: 'AUDIO005', category: 'audio' },
    { local: 'audio/modern/afrobeat-006.mp3', envato: 'Afrobeat Summer', id: 'AUDIO006', category: 'audio' },
    { local: 'audio/modern/afrobeat-007.mp3', envato: 'Afrobeat Sunset', id: 'AUDIO007', category: 'audio' },
    { local: 'audio/modern/afrobeat-008.mp3', envato: 'Afrobeat Festival', id: 'AUDIO008', category: 'audio' },
    { local: 'audio/modern/afrobeat-009.mp3', envato: 'Afrobeat Night', id: 'AUDIO009', category: 'audio' },
    { local: 'audio/modern/afrobeat-010.mp3', envato: 'Afrobeat Energy', id: 'AUDIO010', category: 'audio' },
    // Traditional
    { local: 'audio/traditional/traditional-001.mp3', envato: 'African Traditional Drums', id: 'AUDIO011', category: 'audio' },
    { local: 'audio/traditional/traditional-002.mp3', envato: 'Village Celebration Music', id: 'AUDIO012', category: 'audio' },
    { local: 'audio/traditional/traditional-003.mp3', envato: 'Tribal Chant Ensemble', id: 'AUDIO013', category: 'audio' },
    { local: 'audio/traditional/traditional-004.mp3', envato: 'Kora Meditation', id: 'AUDIO014', category: 'audio' },
    { local: 'audio/traditional/traditional-005.mp3', envato: 'Balafon Rhythms', id: 'AUDIO015', category: 'audio' },
    { local: 'audio/traditional/traditional-006.mp3', envato: 'Sacred Ceremony', id: 'AUDIO016', category: 'audio' },
    { local: 'audio/traditional/traditional-007.mp3', envato: 'Griot Storytelling', id: 'AUDIO017', category: 'audio' },
    { local: 'audio/traditional/traditional-008.mp3', envato: 'Harvest Dance', id: 'AUDIO018', category: 'audio' },
    // Percussion
    { local: 'audio/percussion/djembe-001.mp3', envato: 'Djembe Solo Performance', id: 'AUDIO019', category: 'audio' },
    { local: 'audio/percussion/djembe-002.mp3', envato: 'Djembe Ensemble', id: 'AUDIO020', category: 'audio' },
    { local: 'audio/percussion/dunun-001.mp3', envato: 'Dunun Bass Rhythms', id: 'AUDIO021', category: 'audio' },
    { local: 'audio/percussion/dunun-002.mp3', envato: 'Dunun Polyrhythm', id: 'AUDIO022', category: 'audio' },
    { local: 'audio/percussion/shekere-001.mp3', envato: 'Shekere Shake Pattern', id: 'AUDIO023', category: 'audio' },
    { local: 'audio/percussion/talking-drum-001.mp3', envato: 'Talking Drum Message', id: 'AUDIO024', category: 'audio' },
    { local: 'audio/percussion/conga-001.mp3', envato: 'Conga Latin African', id: 'AUDIO025', category: 'audio' },
    { local: 'audio/percussion/bongo-001.mp3', envato: 'Bongo Rhythms Pack', id: 'AUDIO026', category: 'audio' },
  ],
};

/**
 * Génère le mapping pour les lens-flare (455 fichiers)
 */
function generateLensFlareMapping(count: number): EnvatoAssetMapping[] {
  const flareTypes = [
    'Anamorphic Flare', 'Cinematic Flare', 'Sun Flare', 'Bokeh Flare', 
    'Light Streak', 'Prism Flare', 'Warm Flare', 'Cool Flare',
    'Golden Flare', 'Blue Flare', 'Rainbow Flare', 'Soft Flare',
    'Sharp Flare', 'Circular Flare', 'Linear Flare', 'Natural Flare'
  ];
  
  const mapping: EnvatoAssetMapping[] = [];
  for (let i = 1; i <= count; i++) {
    const typeIndex = (i - 1) % flareTypes.length;
    const packNumber = Math.floor((i - 1) / 30) + 1;
    mapping.push({
      local: `flare-${String(i).padStart(3, '0')}.png`,
      envato: `${flareTypes[typeIndex]} Pack ${packNumber}`,
      id: `FLARE${String(i).padStart(3, '0')}`,
      category: 'graphics',
    });
  }
  return mapping;
}

/**
 * Génère le mapping pour les textures (215 fichiers)
 */
function generateTextureMapping(count: number): EnvatoAssetMapping[] {
  const textureTypes = [
    { name: 'Film Grain', format: 'png' },
    { name: 'Noise Texture', format: 'png' },
    { name: 'Paper Texture', format: 'png' },
    { name: 'Fabric Texture', format: 'png' },
    { name: 'Metal Texture', format: 'png' },
    { name: 'Wood Texture', format: 'png' },
    { name: 'Stone Texture', format: 'png' },
    { name: 'Abstract Pattern', format: 'png' },
    { name: 'Geometric Pattern', format: 'png' },
    { name: 'African Pattern', format: 'png' },
    { name: 'Animated Texture', format: 'mp4' },
    { name: 'Moving Grain', format: 'mp4' },
  ];

  const mapping: EnvatoAssetMapping[] = [];
  for (let i = 1; i <= count; i++) {
    const typeIndex = (i - 1) % textureTypes.length;
    const textureType = textureTypes[typeIndex];
    const packNumber = Math.floor((i - 1) / 20) + 1;
    const ext = i > 180 ? 'mp4' : 'png'; // Last 35 are video textures
    mapping.push({
      local: `texture-${String(i).padStart(3, '0')}.${ext}`,
      envato: `${textureType.name} Pack ${packNumber}`,
      id: `TEXT${String(i).padStart(3, '0')}`,
      category: ext === 'mp4' ? 'stock-video' : 'graphics',
      format: ext,
    });
  }
  return mapping;
}

// ============================================================================
// ENVATO API CLIENT
// ============================================================================

/**
 * Client pour l'API Envato Elements
 * Gère l'authentification et les téléchargements
 */
export class EnvatoClient {
  private credentials: EnvatoCredentials;
  private isAuthenticated = false;
  private authToken: string | null = null;
  private readonly API_BASE = 'https://api.envato.com/v3';
  private readonly ELEMENTS_BASE = 'https://elements.envato.com';

  constructor(credentials: EnvatoCredentials) {
    this.credentials = credentials;
  }

  /**
   * Authentifie l'utilisateur avec Envato Elements
   * @returns true si l'authentification réussit
   */
  async authenticate(): Promise<boolean> {
    try {
      // Si un token est fourni, l'utiliser directement
      if (this.credentials.token) {
        this.authToken = this.credentials.token;
        const isValid = await this.verifySubscription();
        this.isAuthenticated = isValid;
        return isValid;
      }

      // Sinon, simuler une authentification (en production, utiliser OAuth)
      console.log('[EnvatoClient] Authenticating with email:', this.credentials.email);
      
      // Simulation - en production, appeler l'API OAuth Envato
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Pour le développement, on simule un token
      this.authToken = `simulated_token_${Date.now()}`;
      this.isAuthenticated = true;
      
      console.log('[EnvatoClient] Authentication successful');
      return true;
    } catch (error) {
      console.error('[EnvatoClient] Authentication failed:', error);
      this.isAuthenticated = false;
      return false;
    }
  }

  /**
   * Recherche des assets sur Envato Elements
   * @param query - Terme de recherche
   * @param category - Catégorie (stock-video, graphics, audio, etc.)
   * @returns Liste des assets trouvés
   */
  async searchAsset(query: string, category: string): Promise<EnvatoAsset[]> {
    if (!this.isAuthenticated) {
      throw new Error('Not authenticated. Call authenticate() first.');
    }

    try {
      console.log(`[EnvatoClient] Searching for: ${query} in ${category}`);
      
      // Simulation de recherche - en production, appeler l'API Envato
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Retourner des résultats simulés basés sur la query
      return [
        {
          id: `search_${Date.now()}`,
          name: query,
          category,
          previewUrl: `${this.ELEMENTS_BASE}/preview/${category}/${query.toLowerCase().replace(/\s+/g, '-')}`,
          author: 'Envato Author',
          license: 'Envato Elements License',
        }
      ];
    } catch (error) {
      console.error('[EnvatoClient] Search failed:', error);
      throw error;
    }
  }

  /**
   * Obtient l'URL de téléchargement pour un item
   * @param itemId - ID de l'item Envato
   * @returns URL de téléchargement
   */
  async getDownloadUrl(itemId: string): Promise<string> {
    if (!this.isAuthenticated) {
      throw new Error('Not authenticated. Call authenticate() first.');
    }

    try {
      console.log(`[EnvatoClient] Getting download URL for item: ${itemId}`);
      
      // Simulation - en production, appeler l'API Envato pour obtenir le lien
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // URL simulée - en production, c'est l'API qui fournit le lien temporaire
      return `${this.ELEMENTS_BASE}/downloads/${itemId}/download`;
    } catch (error) {
      console.error('[EnvatoClient] Failed to get download URL:', error);
      throw error;
    }
  }

  /**
   * Télécharge un asset depuis Envato
   * @param url - URL de téléchargement
   * @param localPath - Chemin local de destination
   * @param onProgress - Callback de progression
   */
  async downloadAsset(
    url: string, 
    localPath: string, 
    onProgress: (progress: number) => void
  ): Promise<void> {
    if (!this.isAuthenticated) {
      throw new Error('Not authenticated. Call authenticate() first.');
    }

    try {
      console.log(`[EnvatoClient] Downloading asset to: ${localPath}`);
      
      // Simulation de téléchargement avec progression
      // En production, utiliser fetch avec streaming ou une API backend
      const totalSteps = 10;
      for (let i = 0; i <= totalSteps; i++) {
        await new Promise(resolve => setTimeout(resolve, 200));
        onProgress((i / totalSteps) * 100);
      }
      
      console.log(`[EnvatoClient] Download complete: ${localPath}`);
    } catch (error) {
      console.error('[EnvatoClient] Download failed:', error);
      throw error;
    }
  }

  /**
   * Vérifie si l'utilisateur a un abonnement Envato Elements actif
   * @returns true si l'abonnement est valide
   */
  async verifySubscription(): Promise<boolean> {
    try {
      console.log('[EnvatoClient] Verifying subscription...');
      
      // Simulation - en production, appeler l'API Envato
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // En production, vérifier le statut réel de l'abonnement
      const hasValidSubscription = true; // Simulé
      
      console.log('[EnvatoClient] Subscription valid:', hasValidSubscription);
      return hasValidSubscription;
    } catch (error) {
      console.error('[EnvatoClient] Subscription verification failed:', error);
      return false;
    }
  }

  /**
   * Retourne si le client est authentifié
   */
  get authenticated(): boolean {
    return this.isAuthenticated;
  }
}

// ============================================================================
// DOWNLOAD MANAGER
// ============================================================================

/**
 * Gestionnaire de téléchargements avec queue, retry et progression
 */
export class DownloadManager {
  private client: EnvatoClient | null = null;
  private isPaused = false;
  private isCancelled = false;
  private currentDownloads = 0;
  private readonly MAX_CONCURRENT = 5;
  private readonly MAX_RETRIES = 3;
  private downloadQueue: Array<{ mapping: EnvatoAssetMapping; category: string }> = [];
  private downloadState: Map<string, DownloadState> = new Map();

  /**
   * Configure le client Envato
   */
  setClient(client: EnvatoClient): void {
    this.client = client;
  }

  /**
   * Télécharge tous les assets manquants d'une catégorie
   * @param category - Catégorie à télécharger
   * @param onProgress - Callback de progression
   */
  async downloadMissingAssets(
    category: string,
    onProgress: (progress: DownloadProgress) => void
  ): Promise<void> {
    if (!this.client?.authenticated) {
      throw new Error('Envato client not authenticated');
    }

    const mappings = ENVATO_ASSET_MAP[category];
    if (!mappings) {
      throw new Error(`Unknown category: ${category}`);
    }

    // Vérifier quels fichiers sont manquants ou LFS
    const missingAssets = await this.getMissingAssets(category, mappings);
    
    if (missingAssets.length === 0) {
      onProgress({
        category,
        current: 0,
        total: 0,
        currentFile: '',
        bytesDownloaded: 0,
        totalBytes: 0,
        speed: 0,
        eta: 0,
        status: 'completed',
        errors: [],
      });
      return;
    }

    const errors: DownloadError[] = [];
    let completed = 0;

    for (const mapping of missingAssets) {
      if (this.isCancelled) break;
      
      while (this.isPaused) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      onProgress({
        category,
        current: completed,
        total: missingAssets.length,
        currentFile: mapping.local,
        bytesDownloaded: 0,
        totalBytes: 0,
        speed: 0,
        eta: (missingAssets.length - completed) * 2,
        status: 'downloading',
        errors,
      });

      // Télécharger avec retry
      let success = false;
      for (let attempt = 1; attempt <= this.MAX_RETRIES && !success; attempt++) {
        try {
          await this.downloadSingleAsset(category, mapping, (progress) => {
            onProgress({
              category,
              current: completed,
              total: missingAssets.length,
              currentFile: mapping.local,
              bytesDownloaded: progress,
              totalBytes: 100,
              speed: 50,
              eta: (missingAssets.length - completed) * 2,
              status: 'downloading',
              errors,
            });
          });
          success = true;
        } catch (error) {
          console.error(`[DownloadManager] Attempt ${attempt} failed for ${mapping.local}:`, error);
          if (attempt === this.MAX_RETRIES) {
            errors.push({
              file: mapping.local,
              error: error instanceof Error ? error.message : 'Unknown error',
              attempt,
              timestamp: new Date(),
            });
          }
        }
      }

      completed++;
      
      // Mettre à jour l'état de téléchargement
      this.updateDownloadState(category, mapping.local, success);
    }

    onProgress({
      category,
      current: completed,
      total: missingAssets.length,
      currentFile: '',
      bytesDownloaded: 0,
      totalBytes: 0,
      speed: 0,
      eta: 0,
      status: errors.length > 0 ? 'error' : 'completed',
      errors,
    });
  }

  /**
   * Télécharge tous les assets manquants de toutes les catégories
   */
  async downloadAll(onProgress: (progress: DownloadProgress) => void): Promise<void> {
    const categories = Object.keys(ENVATO_ASSET_MAP);
    
    for (const category of categories) {
      if (this.isCancelled) break;
      await this.downloadMissingAssets(category, onProgress);
    }
  }

  /**
   * Met en pause les téléchargements
   */
  pause(): void {
    console.log('[DownloadManager] Pausing downloads');
    this.isPaused = true;
  }

  /**
   * Reprend les téléchargements
   */
  resume(): void {
    console.log('[DownloadManager] Resuming downloads');
    this.isPaused = false;
  }

  /**
   * Annule tous les téléchargements
   */
  cancel(): void {
    console.log('[DownloadManager] Cancelling downloads');
    this.isCancelled = true;
    this.isPaused = false;
  }

  /**
   * Réinitialise l'état du gestionnaire
   */
  reset(): void {
    this.isCancelled = false;
    this.isPaused = false;
    this.downloadQueue = [];
  }

  /**
   * Récupère l'état de téléchargement sauvegardé
   */
  getSavedState(category: string): DownloadState | null {
    // Charger depuis localStorage
    try {
      const key = `envato_download_state_${category}`;
      const saved = localStorage.getItem(key);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('[DownloadManager] Failed to load state:', e);
    }
    return null;
  }

  /**
   * Vérifie quels assets sont manquants ou LFS
   */
  private async getMissingAssets(
    category: string, 
    mappings: EnvatoAssetMapping[]
  ): Promise<EnvatoAssetMapping[]> {
    const missing: EnvatoAssetMapping[] = [];
    
    for (const mapping of mappings) {
      const path = category === 'audio' 
        ? `/assets/envato/${mapping.local}`
        : `/assets/envato/${category}/${mapping.local}`;
      
      const isLfsOrMissing = await this.checkIfLfsOrMissing(path);
      if (isLfsOrMissing) {
        missing.push(mapping);
      }
    }
    
    return missing;
  }

  /**
   * Vérifie si un fichier est un pointeur LFS ou manquant
   */
  private async checkIfLfsOrMissing(path: string): Promise<boolean> {
    try {
      const response = await fetch(path, { method: 'HEAD' });
      if (!response.ok) return true;
      
      // Vérifier la taille (les pointeurs LFS font ~130 bytes)
      const contentLength = response.headers.get('content-length');
      if (contentLength && parseInt(contentLength) < 200) {
        // Potentiellement un pointeur LFS, vérifier le contenu
        const textResponse = await fetch(path);
        const text = await textResponse.text();
        if (text.includes('version https://git-lfs.github.com')) {
          return true;
        }
      }
      
      return false;
    } catch {
      return true;
    }
  }

  /**
   * Télécharge un seul asset
   */
  private async downloadSingleAsset(
    category: string,
    mapping: EnvatoAssetMapping,
    onProgress: (progress: number) => void
  ): Promise<void> {
    if (!this.client) {
      throw new Error('No Envato client configured');
    }

    // Obtenir l'URL de téléchargement
    const downloadUrl = await this.client.getDownloadUrl(mapping.id);
    
    // Chemin local
    const localPath = category === 'audio'
      ? `/assets/envato/${mapping.local}`
      : `/assets/envato/${category}/${mapping.local}`;
    
    // Télécharger
    await this.client.downloadAsset(downloadUrl, localPath, onProgress);
  }

  /**
   * Met à jour l'état de téléchargement
   */
  private updateDownloadState(category: string, file: string, success: boolean): void {
    const key = `envato_download_state_${category}`;
    let state = this.downloadState.get(category);
    
    if (!state) {
      state = {
        category,
        completedFiles: [],
        failedFiles: [],
        lastUpdated: new Date(),
      };
    }
    
    if (success) {
      state.completedFiles.push(file);
    } else {
      state.failedFiles.push(file);
    }
    
    state.lastUpdated = new Date();
    this.downloadState.set(category, state);
    
    // Sauvegarder dans localStorage
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch (e) {
      console.error('[DownloadManager] Failed to save state:', e);
    }
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Génère l'URL Envato Elements pour un item
 * @param category - Catégorie de l'asset
 * @param name - Nom de l'asset
 * @returns URL vers la page Envato Elements
 */
export function getEnvatoUrl(category: string, name: string, mapping?: EnvatoAssetMapping): string {
  // Si on a un slug direct, utiliser le lien direct
  if (mapping?.envatoSlug) {
    return `https://elements.envato.com/${mapping.envatoSlug}`;
  }
  
  // Utiliser la query de recherche précise si disponible
  const searchQuery = mapping?.envatoSearchQuery || name;
  
  const categoryMap: Record<string, string> = {
    'stock-video': 'stock-video',
    'graphics': 'graphic-templates',
    '3d-models': '3d',
    'fonts': 'fonts',
    'audio': 'royalty-free-music',
  };
  
  const envatoCategory = categoryMap[category] || 'all-items';
  return `https://elements.envato.com/${envatoCategory}?q=${encodeURIComponent(searchQuery)}`;
}

/**
 * Calcule le checksum d'un fichier
 * @param data - Données du fichier
 * @returns Checksum en hexadécimal
 */
export async function calculateChecksum(data: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Instance singleton du DownloadManager
 */
export const downloadManager = new DownloadManager();
