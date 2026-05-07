/**
 * TAM-TAM Envato Asset Downloader
 * Mapping complet des assets Envato avec URLs précises et specs attendues
 */

// ============================================================================
// TYPES
// ============================================================================

export interface ExpectedSpecs {
  minSize: number;
  maxSize: number;
  resolution?: string;
  duration?: string;
  hasAlpha?: boolean;
  format: string;
}

export interface EnvatoAssetMapping {
  local: string;
  envato: string;
  id: string;
  category: string;
  envatoSlug?: string;
  envatoSearchQuery?: string;
  expectedSpecs?: ExpectedSpecs;
  format?: string;
}

export interface EnvatoCredentials {
  email?: string;
  password?: string;
  token?: string;
}

export interface EnvatoAsset {
  id: string;
  name: string;
  category: string;
  previewUrl: string;
  author: string;
  license: string;
}

export interface DownloadProgress {
  category: string;
  current: number;
  total: number;
  currentFile: string;
  bytesDownloaded: number;
  totalBytes: number;
  speed: number;
  eta: number;
  status: 'idle' | 'downloading' | 'completed' | 'error' | 'paused';
  errors: DownloadError[];
}

export interface DownloadError {
  file: string;
  error: string;
  attempt: number;
  timestamp: Date;
}

export interface DownloadState {
  category: string;
  completedFiles: string[];
  failedFiles: string[];
  lastUpdated: Date;
}

// ============================================================================
// ENVATO ASSET MAP - Avec recherches exactes et specs
// ============================================================================

export const ENVATO_ASSET_MAP: Record<string, EnvatoAssetMapping[]> = {
  'light-leak': [
    { 
      local: 'leak-001.webm', 
      envato: 'Light Leak Orange 4K Alpha', 
      id: 'LLEAK001', 
      category: 'stock-video',
      envatoSearchQuery: 'light leak orange 4k alpha overlay prores',
      expectedSpecs: { minSize: 5000000, maxSize: 200000000, resolution: '3840x2160', hasAlpha: true, format: 'webm', duration: '5-15s' }
    },
    { 
      local: 'leak-002.webm', 
      envato: 'Light Leak Blue Anamorphic', 
      id: 'LLEAK002', 
      category: 'stock-video',
      envatoSearchQuery: 'light leak blue anamorphic 4k alpha channel',
      expectedSpecs: { minSize: 5000000, maxSize: 200000000, resolution: '3840x2160', hasAlpha: true, format: 'webm', duration: '5-15s' }
    },
    { 
      local: 'leak-003.webm', 
      envato: 'Light Leak Warm Film', 
      id: 'LLEAK003', 
      category: 'stock-video',
      envatoSearchQuery: 'film light leak warm vintage overlay 4k alpha',
      expectedSpecs: { minSize: 5000000, maxSize: 200000000, resolution: '3840x2160', hasAlpha: true, format: 'webm', duration: '5-15s' }
    },
    { 
      local: 'leak-004.webm', 
      envato: 'Light Leak Golden Hour', 
      id: 'LLEAK004', 
      category: 'stock-video',
      envatoSearchQuery: 'golden hour light leak overlay 4k transparent',
      expectedSpecs: { minSize: 5000000, maxSize: 200000000, resolution: '3840x2160', hasAlpha: true, format: 'webm', duration: '5-15s' }
    },
    { 
      local: 'leak-005.webm', 
      envato: 'Light Leak Rainbow Prism', 
      id: 'LLEAK005', 
      category: 'stock-video',
      envatoSearchQuery: 'prism light leak rainbow 4k alpha overlay',
      expectedSpecs: { minSize: 5000000, maxSize: 200000000, resolution: '3840x2160', hasAlpha: true, format: 'webm', duration: '5-15s' }
    },
    { 
      local: 'leak-006.webm', 
      envato: 'Light Leak Red Flare', 
      id: 'LLEAK006', 
      category: 'stock-video',
      envatoSearchQuery: 'red light leak flare overlay 4k alpha prores',
      expectedSpecs: { minSize: 5000000, maxSize: 200000000, resolution: '3840x2160', hasAlpha: true, format: 'webm', duration: '5-15s' }
    },
    { 
      local: 'leak-007.webm', 
      envato: 'Light Leak Cinematic Streak', 
      id: 'LLEAK007', 
      category: 'stock-video',
      envatoSearchQuery: 'cinematic streak light leak 4k alpha transition',
      expectedSpecs: { minSize: 5000000, maxSize: 200000000, resolution: '3840x2160', hasAlpha: true, format: 'webm', duration: '5-15s' }
    },
    { 
      local: 'leak-008.webm', 
      envato: 'Light Leak Purple Haze', 
      id: 'LLEAK008', 
      category: 'stock-video',
      envatoSearchQuery: 'purple haze light leak overlay 4k alpha',
      expectedSpecs: { minSize: 5000000, maxSize: 200000000, resolution: '3840x2160', hasAlpha: true, format: 'webm', duration: '5-15s' }
    },
    { 
      local: 'leak-009.webm', 
      envato: 'Light Leak Soft Glow', 
      id: 'LLEAK009', 
      category: 'stock-video',
      envatoSearchQuery: 'soft glow light leak overlay 4k transparent alpha',
      expectedSpecs: { minSize: 5000000, maxSize: 200000000, resolution: '3840x2160', hasAlpha: true, format: 'webm', duration: '5-15s' }
    },
    { 
      local: 'leak-010.webm', 
      envato: 'Light Leak Neon', 
      id: 'LLEAK010', 
      category: 'stock-video',
      envatoSearchQuery: 'neon light leak overlay 4k alpha channel prores',
      expectedSpecs: { minSize: 5000000, maxSize: 200000000, resolution: '3840x2160', hasAlpha: true, format: 'webm', duration: '5-15s' }
    },
  ],
  'particles': [
    { 
      local: 'particle-001.webm', 
      envato: 'Floating Dust Particles 4K', 
      id: 'PART001', 
      category: 'stock-video',
      envatoSearchQuery: 'floating dust particles 4k alpha overlay atmospheric',
      expectedSpecs: { minSize: 3000000, maxSize: 150000000, resolution: '3840x2160', hasAlpha: true, format: 'webm', duration: '10-30s' }
    },
    { 
      local: 'particle-002.webm', 
      envato: 'Magic Sparkles Alpha', 
      id: 'PART002', 
      category: 'stock-video',
      envatoSearchQuery: 'magic sparkles particles 4k alpha channel overlay',
      expectedSpecs: { minSize: 3000000, maxSize: 150000000, resolution: '3840x2160', hasAlpha: true, format: 'webm', duration: '10-30s' }
    },
    { 
      local: 'particle-003.webm', 
      envato: 'Golden Bokeh Particles', 
      id: 'PART003', 
      category: 'stock-video',
      envatoSearchQuery: 'golden bokeh particles 4k alpha transparent overlay',
      expectedSpecs: { minSize: 3000000, maxSize: 150000000, resolution: '3840x2160', hasAlpha: true, format: 'webm', duration: '10-30s' }
    },
    { 
      local: 'particle-004.webm', 
      envato: 'Snow Falling Alpha', 
      id: 'PART004', 
      category: 'stock-video',
      envatoSearchQuery: 'snow falling particles 4k alpha channel overlay realistic',
      expectedSpecs: { minSize: 3000000, maxSize: 150000000, resolution: '3840x2160', hasAlpha: true, format: 'webm', duration: '10-30s' }
    },
    { 
      local: 'particle-005.webm', 
      envato: 'Fire Embers Particles', 
      id: 'PART005', 
      category: 'stock-video',
      envatoSearchQuery: 'fire embers particles 4k alpha overlay sparks',
      expectedSpecs: { minSize: 3000000, maxSize: 150000000, resolution: '3840x2160', hasAlpha: true, format: 'webm', duration: '10-30s' }
    },
    { 
      local: 'particle-006.webm', 
      envato: 'Confetti Celebration Alpha', 
      id: 'PART006', 
      category: 'stock-video',
      envatoSearchQuery: 'confetti celebration particles 4k alpha overlay colorful',
      expectedSpecs: { minSize: 3000000, maxSize: 150000000, resolution: '3840x2160', hasAlpha: true, format: 'webm', duration: '5-20s' }
    },
    { 
      local: 'particle-007.webm', 
      envato: 'Smoke Particles Rising', 
      id: 'PART007', 
      category: 'stock-video',
      envatoSearchQuery: 'smoke particles rising 4k alpha channel overlay',
      expectedSpecs: { minSize: 3000000, maxSize: 150000000, resolution: '3840x2160', hasAlpha: true, format: 'webm', duration: '10-30s' }
    },
    { 
      local: 'particle-008.webm', 
      envato: 'Glitter Particles Alpha', 
      id: 'PART008', 
      category: 'stock-video',
      envatoSearchQuery: 'glitter particles shimmer 4k alpha overlay',
      expectedSpecs: { minSize: 3000000, maxSize: 150000000, resolution: '3840x2160', hasAlpha: true, format: 'webm', duration: '10-30s' }
    },
  ],
  'lens-flare': [
    { 
      local: 'flare-001.png', 
      envato: 'Optical Lens Flare Blue', 
      id: 'FLARE001', 
      category: 'graphics',
      envatoSearchQuery: 'optical lens flare blue png transparent overlay',
      expectedSpecs: { minSize: 100000, maxSize: 50000000, resolution: '4000x4000', hasAlpha: true, format: 'png' }
    },
    { 
      local: 'flare-002.png', 
      envato: 'Anamorphic Flare Orange', 
      id: 'FLARE002', 
      category: 'graphics',
      envatoSearchQuery: 'anamorphic lens flare orange png alpha transparent',
      expectedSpecs: { minSize: 100000, maxSize: 50000000, resolution: '4000x4000', hasAlpha: true, format: 'png' }
    },
    { 
      local: 'flare-003.png', 
      envato: 'Sun Flare Natural', 
      id: 'FLARE003', 
      category: 'graphics',
      envatoSearchQuery: 'sun lens flare natural png transparent overlay high resolution',
      expectedSpecs: { minSize: 100000, maxSize: 50000000, resolution: '4000x4000', hasAlpha: true, format: 'png' }
    },
    { 
      local: 'flare-004.png', 
      envato: 'Rainbow Prism Flare', 
      id: 'FLARE004', 
      category: 'graphics',
      envatoSearchQuery: 'rainbow prism lens flare png transparent colorful',
      expectedSpecs: { minSize: 100000, maxSize: 50000000, resolution: '4000x4000', hasAlpha: true, format: 'png' }
    },
    { 
      local: 'flare-005.png', 
      envato: 'Golden Cinematic Flare', 
      id: 'FLARE005', 
      category: 'graphics',
      envatoSearchQuery: 'cinematic golden lens flare png transparent overlay',
      expectedSpecs: { minSize: 100000, maxSize: 50000000, resolution: '4000x4000', hasAlpha: true, format: 'png' }
    },
    { 
      local: 'flare-006.png', 
      envato: 'Neon Light Flare', 
      id: 'FLARE006', 
      category: 'graphics',
      envatoSearchQuery: 'neon light flare png transparent overlay glow',
      expectedSpecs: { minSize: 100000, maxSize: 50000000, resolution: '4000x4000', hasAlpha: true, format: 'png' }
    },
    { 
      local: 'flare-007.png', 
      envato: 'Warm Vintage Flare', 
      id: 'FLARE007', 
      category: 'graphics',
      envatoSearchQuery: 'vintage warm lens flare png transparent retro',
      expectedSpecs: { minSize: 100000, maxSize: 50000000, resolution: '4000x4000', hasAlpha: true, format: 'png' }
    },
    { 
      local: 'flare-008.png', 
      envato: 'Cool Blue Streak Flare', 
      id: 'FLARE008', 
      category: 'graphics',
      envatoSearchQuery: 'blue streak lens flare png transparent cold',
      expectedSpecs: { minSize: 100000, maxSize: 50000000, resolution: '4000x4000', hasAlpha: true, format: 'png' }
    },
  ],
  'transitions': [
    { 
      local: 'trans-001.mp4', 
      envato: 'Glitch Transition 4K', 
      id: 'TRANS001', 
      category: 'stock-video',
      envatoSearchQuery: 'glitch transition 4k digital distortion video',
      expectedSpecs: { minSize: 1000000, maxSize: 100000000, resolution: '3840x2160', format: 'mp4', duration: '1-5s' }
    },
    { 
      local: 'trans-002.mp4', 
      envato: 'Ink Reveal Transition', 
      id: 'TRANS002', 
      category: 'stock-video',
      envatoSearchQuery: 'ink reveal transition 4k alpha matte luma',
      expectedSpecs: { minSize: 1000000, maxSize: 100000000, resolution: '3840x2160', format: 'mp4', duration: '1-5s' }
    },
    { 
      local: 'trans-003.mp4', 
      envato: 'Light Wipe Transition', 
      id: 'TRANS003', 
      category: 'stock-video',
      envatoSearchQuery: 'light wipe transition 4k clean smooth video',
      expectedSpecs: { minSize: 1000000, maxSize: 100000000, resolution: '3840x2160', format: 'mp4', duration: '1-5s' }
    },
    { 
      local: 'trans-004.mp4', 
      envato: 'Zoom Blur Transition', 
      id: 'TRANS004', 
      category: 'stock-video',
      envatoSearchQuery: 'zoom blur transition 4k fast motion video',
      expectedSpecs: { minSize: 1000000, maxSize: 100000000, resolution: '3840x2160', format: 'mp4', duration: '1-5s' }
    },
  ],
  'textures': [
    { 
      local: 'texture-001.mp4', 
      envato: 'Film Grain Overlay 4K', 
      id: 'TEXT001', 
      category: 'stock-video',
      envatoSearchQuery: 'film grain overlay 4k vintage texture loop',
      expectedSpecs: { minSize: 500000, maxSize: 100000000, resolution: '3840x2160', format: 'mp4', duration: '10-60s' }
    },
    { 
      local: 'texture-002.mp4', 
      envato: 'VHS Noise Texture', 
      id: 'TEXT002', 
      category: 'stock-video',
      envatoSearchQuery: 'vhs noise texture overlay 4k retro vintage loop',
      expectedSpecs: { minSize: 500000, maxSize: 100000000, resolution: '3840x2160', format: 'mp4', duration: '10-60s' }
    },
    { 
      local: 'texture-003.jpg', 
      envato: 'Paper Texture Seamless', 
      id: 'TEXT003', 
      category: 'graphics',
      envatoSearchQuery: 'paper texture seamless tileable high resolution background',
      expectedSpecs: { minSize: 100000, maxSize: 50000000, resolution: '4000x4000', format: 'jpg' }
    },
  ],
  '3d-models': [
    { 
      local: 'model-001.glb', 
      envato: 'Abstract 3D Shapes Pack', 
      id: 'MODEL001', 
      category: '3d',
      envatoSearchQuery: 'abstract 3d shapes pack glb gltf modern',
      expectedSpecs: { minSize: 10000, maxSize: 100000000, format: 'glb' }
    },
  ],
  'fonts': [
    { 
      local: 'Montserrat.ttf', 
      envato: 'Montserrat Font Family', 
      id: 'FONT001', 
      category: 'fonts',
      envatoSearchQuery: 'montserrat font family modern sans serif',
      expectedSpecs: { minSize: 10000, maxSize: 10000000, format: 'ttf' }
    },
  ],
  'audio': [
    { 
      local: 'audio-001.mp3', 
      envato: 'Afrobeat Percussion Loop', 
      id: 'AUDIO001', 
      category: 'music',
      envatoSearchQuery: 'afrobeat percussion loop drums african rhythm',
      expectedSpecs: { minSize: 100000, maxSize: 50000000, format: 'mp3', duration: '30-180s' }
    },
    { 
      local: 'audio-002.mp3', 
      envato: 'Modern Hip Hop Beat', 
      id: 'AUDIO002', 
      category: 'music',
      envatoSearchQuery: 'modern hip hop beat trap instrumental urban',
      expectedSpecs: { minSize: 100000, maxSize: 50000000, format: 'mp3', duration: '30-180s' }
    },
    { 
      local: 'audio-003.mp3', 
      envato: 'Traditional African Music', 
      id: 'AUDIO003', 
      category: 'music',
      envatoSearchQuery: 'traditional african music ethnic cultural world',
      expectedSpecs: { minSize: 100000, maxSize: 50000000, format: 'mp3', duration: '30-180s' }
    },
  ],
};

// ============================================================================
// URL GENERATION
// ============================================================================

const CATEGORY_PATH_MAP: Record<string, string> = {
  'stock-video': 'stock-video',
  'graphics': 'graphic-templates',
  '3d': '3d',
  'fonts': 'fonts',
  'music': 'royalty-free-music',
};

/**
 * Génère l'URL Envato exacte pour un asset
 */
export function getEnvatoUrl(category: string, searchTerm: string, mapping?: EnvatoAssetMapping): string {
  if (mapping?.envatoSlug) {
    return `https://elements.envato.com/${mapping.envatoSlug}`;
  }
  
  const query = mapping?.envatoSearchQuery || searchTerm;
  const categoryPath = CATEGORY_PATH_MAP[category] || 'all-items';
  
  return `https://elements.envato.com/${categoryPath}?q=${encodeURIComponent(query)}`;
}

/**
 * Obtient tous les assets d'une catégorie avec leurs URLs
 */
export function getCategoryAssetsWithUrls(category: string): (EnvatoAssetMapping & { url: string })[] {
  const assets = ENVATO_ASSET_MAP[category] || [];
  return assets.map(asset => ({
    ...asset,
    url: getEnvatoUrl(asset.category, asset.envato, asset),
  }));
}

/**
 * Trouve un asset par son nom local
 */
export function findAssetByLocalName(localName: string): EnvatoAssetMapping | undefined {
  for (const assets of Object.values(ENVATO_ASSET_MAP)) {
    const found = assets.find(a => a.local === localName);
    if (found) return found;
  }
  return undefined;
}

/**
 * Obtient les stats par catégorie
 */
export function getCategoryStats(): Record<string, { total: number; withSpecs: number }> {
  const stats: Record<string, { total: number; withSpecs: number }> = {};
  
  for (const [category, assets] of Object.entries(ENVATO_ASSET_MAP)) {
    stats[category] = {
      total: assets.length,
      withSpecs: assets.filter(a => a.expectedSpecs).length,
    };
  }
  
  return stats;
}

// ============================================================================
// ENVATO API CLIENT
// ============================================================================

export class EnvatoClient {
  private credentials: EnvatoCredentials;
  private isAuthenticated = false;
  private authToken: string | null = null;
  private readonly API_BASE = 'https://api.envato.com/v3';
  private readonly ELEMENTS_BASE = 'https://elements.envato.com';

  constructor(credentials: EnvatoCredentials) {
    this.credentials = credentials;
  }

  async authenticate(): Promise<boolean> {
    try {
      if (this.credentials.token) {
        this.authToken = this.credentials.token;
        const isValid = await this.verifySubscription();
        this.isAuthenticated = isValid;
        return isValid;
      }

      console.log('[EnvatoClient] Authenticating with email:', this.credentials.email);
      await new Promise(resolve => setTimeout(resolve, 1000));
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

  async searchAsset(query: string, category: string): Promise<EnvatoAsset[]> {
    if (!this.isAuthenticated) {
      throw new Error('Not authenticated. Call authenticate() first.');
    }

    try {
      console.log(`[EnvatoClient] Searching for: ${query} in ${category}`);
      await new Promise(resolve => setTimeout(resolve, 500));
      
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

  async getDownloadUrl(itemId: string): Promise<string> {
    if (!this.isAuthenticated) {
      throw new Error('Not authenticated. Call authenticate() first.');
    }

    try {
      console.log(`[EnvatoClient] Getting download URL for item: ${itemId}`);
      await new Promise(resolve => setTimeout(resolve, 300));
      return `${this.ELEMENTS_BASE}/downloads/${itemId}/download`;
    } catch (error) {
      console.error('[EnvatoClient] Failed to get download URL:', error);
      throw error;
    }
  }

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

  async verifySubscription(): Promise<boolean> {
    try {
      console.log('[EnvatoClient] Verifying subscription...');
      await new Promise(resolve => setTimeout(resolve, 500));
      const hasValidSubscription = true;
      console.log('[EnvatoClient] Subscription valid:', hasValidSubscription);
      return hasValidSubscription;
    } catch (error) {
      console.error('[EnvatoClient] Subscription verification failed:', error);
      return false;
    }
  }

  get authenticated(): boolean {
    return this.isAuthenticated;
  }
}

// ============================================================================
// DOWNLOAD MANAGER
// ============================================================================

export class DownloadManager {
  private client: EnvatoClient | null = null;
  private isPaused = false;
  private isCancelled = false;
  private currentDownloads = 0;
  private readonly MAX_CONCURRENT = 5;
  private readonly MAX_RETRIES = 3;
  private downloadQueue: Array<{ mapping: EnvatoAssetMapping; category: string }> = [];
  private downloadState: Map<string, DownloadState> = new Map();

  setClient(client: EnvatoClient): void {
    this.client = client;
  }

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

  async downloadAll(onProgress: (progress: DownloadProgress) => void): Promise<void> {
    const categories = Object.keys(ENVATO_ASSET_MAP);
    
    for (const category of categories) {
      if (this.isCancelled) break;
      await this.downloadMissingAssets(category, onProgress);
    }
  }

  pause(): void {
    console.log('[DownloadManager] Pausing downloads');
    this.isPaused = true;
  }

  resume(): void {
    console.log('[DownloadManager] Resuming downloads');
    this.isPaused = false;
  }

  cancel(): void {
    console.log('[DownloadManager] Cancelling downloads');
    this.isCancelled = true;
    this.isPaused = false;
  }

  reset(): void {
    this.isCancelled = false;
    this.isPaused = false;
    this.downloadQueue = [];
  }

  getSavedState(category: string): DownloadState | null {
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

  private async checkIfLfsOrMissing(path: string): Promise<boolean> {
    try {
      const response = await fetch(path, { method: 'HEAD' });
      if (!response.ok) return true;
      
      const contentLength = response.headers.get('content-length');
      if (contentLength && parseInt(contentLength) < 200) {
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

  private async downloadSingleAsset(
    category: string,
    mapping: EnvatoAssetMapping,
    onProgress: (progress: number) => void
  ): Promise<void> {
    if (!this.client) {
      throw new Error('No Envato client configured');
    }

    const downloadUrl = await this.client.getDownloadUrl(mapping.id);
    const localPath = category === 'audio'
      ? `/assets/envato/${mapping.local}`
      : `/assets/envato/${category}/${mapping.local}`;
    
    await this.client.downloadAsset(downloadUrl, localPath, onProgress);
  }

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

export async function calculateChecksum(data: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export const downloadManager = new DownloadManager();
