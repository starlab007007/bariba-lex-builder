/**
 * FontLoaderService - Service de chargement automatique des polices
 * Télécharge et cache les fonts depuis Google Fonts
 */

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface FontConfig {
  name: string;
  weights: number[];
  fallback: string;
  googleFontsId?: string;
  localPath?: string;
}

export interface FontLoadResult {
  name: string;
  loaded: boolean;
  error?: string;
  loadTime?: number;
}

export interface FontLoaderProgress {
  isLoading: boolean;
  loaded: number;
  total: number;
  currentFont: string | null;
  errors: string[];
}

// ============================================================================
// CONFIGURATION
// ============================================================================

export const REQUIRED_FONTS: Record<string, FontConfig> = {
  'Orbitron': {
    name: 'Orbitron',
    weights: [400, 500, 600, 700, 800, 900],
    fallback: 'monospace',
    googleFontsId: 'Orbitron',
  },
  'Oswald': {
    name: 'Oswald',
    weights: [200, 300, 400, 500, 600, 700],
    fallback: 'sans-serif',
    googleFontsId: 'Oswald',
  },
  'Bebas Neue': {
    name: 'Bebas Neue',
    weights: [400],
    fallback: 'sans-serif',
    googleFontsId: 'Bebas+Neue',
  },
  'Montserrat': {
    name: 'Montserrat',
    weights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
    fallback: 'sans-serif',
    googleFontsId: 'Montserrat',
  },
  'Playfair Display': {
    name: 'Playfair Display',
    weights: [400, 500, 600, 700, 800, 900],
    fallback: 'serif',
    googleFontsId: 'Playfair+Display',
  },
  'Poppins': {
    name: 'Poppins',
    weights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
    fallback: 'sans-serif',
    googleFontsId: 'Poppins',
  },
  'Roboto': {
    name: 'Roboto',
    weights: [100, 300, 400, 500, 700, 900],
    fallback: 'sans-serif',
    googleFontsId: 'Roboto',
  },
  'Open Sans': {
    name: 'Open Sans',
    weights: [300, 400, 500, 600, 700, 800],
    fallback: 'sans-serif',
    googleFontsId: 'Open+Sans',
  },
  'Lobster': {
    name: 'Lobster',
    weights: [400],
    fallback: 'cursive',
    googleFontsId: 'Lobster',
  },
};

const GOOGLE_FONTS_BASE_URL = 'https://fonts.googleapis.com/css2';
const CACHE_NAME = 'tamtam-fonts-v1';

// ============================================================================
// FONT LOADER SERVICE
// ============================================================================

class FontLoaderService {
  private loadedFonts: Set<string> = new Set();
  private progress: FontLoaderProgress;
  private listeners: Set<(progress: FontLoaderProgress) => void> = new Set();

  constructor() {
    this.progress = {
      isLoading: false,
      loaded: 0,
      total: Object.keys(REQUIRED_FONTS).length,
      currentFont: null,
      errors: [],
    };

    // Vérifier les fonts déjà chargées au démarrage
    this.checkLoadedFonts();
  }

  subscribe(listener: (progress: FontLoaderProgress) => void): () => void {
    this.listeners.add(listener);
    listener({ ...this.progress });
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener({ ...this.progress });
    }
  }

  private async checkLoadedFonts(): Promise<void> {
    // Vérifier quelles fonts sont déjà disponibles via document.fonts
    if ('fonts' in document) {
      for (const [name, config] of Object.entries(REQUIRED_FONTS)) {
        const isLoaded = await document.fonts.check(`16px "${name}"`);
        if (isLoaded) {
          this.loadedFonts.add(name);
        }
      }
      this.progress.loaded = this.loadedFonts.size;
      this.notifyListeners();
    }
  }

  /**
   * Charger toutes les fonts requises
   */
  async loadAllFonts(): Promise<FontLoadResult[]> {
    this.progress.isLoading = true;
    this.progress.errors = [];
    this.notifyListeners();

    const results: FontLoadResult[] = [];
    const fonts = Object.entries(REQUIRED_FONTS);

    for (let i = 0; i < fonts.length; i++) {
      const [name, config] = fonts[i];
      
      this.progress.currentFont = name;
      this.notifyListeners();

      const result = await this.loadFont(name, config);
      results.push(result);

      if (result.loaded) {
        this.loadedFonts.add(name);
        this.progress.loaded = this.loadedFonts.size;
      } else if (result.error) {
        this.progress.errors.push(`${name}: ${result.error}`);
      }

      this.notifyListeners();
    }

    this.progress.isLoading = false;
    this.progress.currentFont = null;
    this.notifyListeners();

    return results;
  }

  /**
   * Charger une font spécifique
   */
  async loadFont(name: string, config?: FontConfig): Promise<FontLoadResult> {
    const fontConfig = config || REQUIRED_FONTS[name];
    
    if (!fontConfig) {
      return {
        name,
        loaded: false,
        error: 'Configuration de font non trouvée',
      };
    }

    const startTime = performance.now();

    try {
      // Vérifier si déjà chargée
      if (this.loadedFonts.has(name)) {
        return {
          name,
          loaded: true,
          loadTime: 0,
        };
      }

      // Générer l'URL Google Fonts
      const googleUrl = this.buildGoogleFontsUrl(fontConfig);
      
      // Injecter le lien CSS
      await this.injectFontStylesheet(googleUrl, name);

      // Attendre que la font soit chargée
      await this.waitForFontLoad(name, fontConfig.weights);

      const loadTime = performance.now() - startTime;

      return {
        name,
        loaded: true,
        loadTime,
      };
    } catch (error) {
      console.error(`Erreur chargement font ${name}:`, error);
      return {
        name,
        loaded: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }

  private buildGoogleFontsUrl(config: FontConfig): string {
    const weightsParam = config.weights.join(';');
    const familyParam = `${config.googleFontsId || config.name.replace(/\s+/g, '+')}:wght@${weightsParam}`;
    return `${GOOGLE_FONTS_BASE_URL}?family=${familyParam}&display=swap`;
  }

  private async injectFontStylesheet(url: string, fontName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Vérifier si déjà injectée
      const existingLink = document.querySelector(`link[data-font="${fontName}"]`);
      if (existingLink) {
        resolve();
        return;
      }

      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = url;
      link.dataset.font = fontName;
      
      link.onload = () => resolve();
      link.onerror = () => reject(new Error(`Impossible de charger ${url}`));
      
      document.head.appendChild(link);
    });
  }

  private async waitForFontLoad(fontName: string, weights: number[]): Promise<void> {
    if (!('fonts' in document)) {
      // Fallback: attendre un délai fixe
      await new Promise(resolve => setTimeout(resolve, 500));
      return;
    }

    const loadPromises = weights.map(weight => {
      return document.fonts.load(`${weight} 16px "${fontName}"`);
    });

    await Promise.all(loadPromises);
  }

  /**
   * Précharger une font en arrière-plan
   */
  preloadFont(name: string): void {
    const config = REQUIRED_FONTS[name];
    if (!config) return;

    const url = this.buildGoogleFontsUrl(config);
    
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'style';
    link.href = url;
    
    document.head.appendChild(link);
  }

  /**
   * Vérifier si une font est disponible
   */
  isFontLoaded(name: string): boolean {
    return this.loadedFonts.has(name);
  }

  /**
   * Obtenir le fallback CSS pour une font
   */
  getFontStack(name: string): string {
    const config = REQUIRED_FONTS[name];
    if (!config) return 'sans-serif';
    return `"${name}", ${config.fallback}`;
  }

  /**
   * Générer les CSS variables pour les fonts
   */
  generateFontCSSVariables(): string {
    const variables: string[] = [];
    
    for (const [name, config] of Object.entries(REQUIRED_FONTS)) {
      const varName = name.toLowerCase().replace(/\s+/g, '-');
      variables.push(`--font-${varName}: "${name}", ${config.fallback};`);
    }
    
    return `:root {\n  ${variables.join('\n  ')}\n}`;
  }

  getLoadedFonts(): string[] {
    return Array.from(this.loadedFonts);
  }

  getProgress(): FontLoaderProgress {
    return { ...this.progress };
  }
}

// Singleton instance
export const fontLoaderService = new FontLoaderService();

// React hook
export function useFontLoader() {
  const [progress, setProgress] = React.useState<FontLoaderProgress>(fontLoaderService.getProgress());
  const [loadedFonts, setLoadedFonts] = React.useState<string[]>(fontLoaderService.getLoadedFonts());

  React.useEffect(() => {
    return fontLoaderService.subscribe((newProgress) => {
      setProgress(newProgress);
      setLoadedFonts(fontLoaderService.getLoadedFonts());
    });
  }, []);

  const loadAllFonts = async () => {
    return await fontLoaderService.loadAllFonts();
  };

  const loadFont = async (name: string) => {
    return await fontLoaderService.loadFont(name);
  };

  const isFontLoaded = (name: string) => {
    return fontLoaderService.isFontLoaded(name);
  };

  const getFontStack = (name: string) => {
    return fontLoaderService.getFontStack(name);
  };

  return {
    progress,
    loadedFonts,
    loadAllFonts,
    loadFont,
    isFontLoaded,
    getFontStack,
    requiredFonts: REQUIRED_FONTS,
  };
}

import React from 'react';
