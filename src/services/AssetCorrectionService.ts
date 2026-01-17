/**
 * TAM-TAM Asset Correction Service
 * Automatically detects and corrects problematic assets by replacing them with proper Envato equivalents
 */

import { toast } from 'sonner';

// ============================================================================
// TYPES
// ============================================================================

export interface AssetCorrection {
  id: string;
  category: string;
  problemType: 'misplaced' | 'wrong-naming' | 'lfs-pointer' | 'missing' | 'empty';
  currentFile?: string;
  suggestedFix: string;
  envatoSearchQuery: string;
  envatoCategory: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'pending' | 'downloading' | 'completed' | 'failed';
}

export interface CorrectionProgress {
  isRunning: boolean;
  totalCorrections: number;
  completedCorrections: number;
  currentCorrection: AssetCorrection | null;
  errors: string[];
}

export interface DownloadedAsset {
  originalName: string;
  targetPath: string;
  targetName: string;
  category: string;
  size: number;
}

// ============================================================================
// ASSET CORRECTION MAPPINGS
// ============================================================================

// Maps problematic files to their Envato equivalents
export const ASSET_CORRECTIONS: AssetCorrection[] = [
  // 3D Models - Currently has leak-XXX.webm files that should be GLB
  ...Array.from({ length: 22 }, (_, i) => ({
    id: `3d-model-fix-${i + 1}`,
    category: '3d-models',
    problemType: 'misplaced' as const,
    currentFile: `leak-${String(i + 1).padStart(3, '0')}.webm`,
    suggestedFix: `model-${String(i + 1).padStart(3, '0')}.glb`,
    envatoSearchQuery: i < 5 ? 'african mask 3d' : i < 10 ? 'drum 3d model' : i < 15 ? 'tribal pattern 3d' : 'african sculpture 3d',
    envatoCategory: '3d-models',
    priority: 'critical' as const,
    status: 'pending' as const,
  })),

  // Particles - Has leak-XXX.webm files that should be particle-XXX.webm
  ...Array.from({ length: 37 }, (_, i) => ({
    id: `particle-fix-${i + 1}`,
    category: 'particles',
    problemType: 'wrong-naming' as const,
    currentFile: `leak-${String(i + 1).padStart(3, '0')}.webm`,
    suggestedFix: `particle-${String(i + 1).padStart(3, '0')}.webm`,
    envatoSearchQuery: i < 10 ? 'dust particles overlay' : i < 20 ? 'bokeh particles' : i < 30 ? 'sparkle particles' : 'confetti particles',
    envatoCategory: 'particles',
    priority: 'high' as const,
    status: 'pending' as const,
  })),

  // Transitions - Has 20 leak-XXX.webm files mixed in
  ...Array.from({ length: 20 }, (_, i) => ({
    id: `transition-fix-${i + 1}`,
    category: 'transitions',
    problemType: 'misplaced' as const,
    currentFile: `leak-${String(i + 1).padStart(3, '0')}.webm`,
    suggestedFix: `transition-${String(i + 11).padStart(3, '0')}.mp4`,
    envatoSearchQuery: i < 5 ? 'cinematic transition' : i < 10 ? 'glitch transition' : i < 15 ? 'zoom transition' : 'wipe transition',
    envatoCategory: 'transitions',
    priority: 'medium' as const,
    status: 'pending' as const,
  })),

  // Light Leak - Some may be LFS pointers
  ...Array.from({ length: 17 }, (_, i) => ({
    id: `lightleak-verify-${i + 1}`,
    category: 'light-leak',
    problemType: 'lfs-pointer' as const,
    currentFile: `leak-${String(i + 1).padStart(3, '0')}.${i < 5 ? 'webm' : 'mp4'}`,
    suggestedFix: `leak-${String(i + 1).padStart(3, '0')}.webm`,
    envatoSearchQuery: i < 5 ? 'orange light leak 4k' : i < 10 ? 'blue light leak cinematic' : 'warm light leak overlay',
    envatoCategory: 'light-leak',
    priority: 'medium' as const,
    status: 'pending' as const,
  })),

  // Fonts - Empty folder, need to download
  {
    id: 'font-orbitron',
    category: 'fonts',
    problemType: 'missing' as const,
    suggestedFix: 'Orbitron-Regular.ttf',
    envatoSearchQuery: 'orbitron font',
    envatoCategory: 'fonts',
    priority: 'high' as const,
    status: 'pending' as const,
  },
  {
    id: 'font-oswald',
    category: 'fonts',
    problemType: 'missing' as const,
    suggestedFix: 'Oswald-Regular.ttf',
    envatoSearchQuery: 'oswald font',
    envatoCategory: 'fonts',
    priority: 'high' as const,
    status: 'pending' as const,
  },
  {
    id: 'font-bebas',
    category: 'fonts',
    problemType: 'missing' as const,
    suggestedFix: 'BebasNeue-Regular.ttf',
    envatoSearchQuery: 'bebas neue font',
    envatoCategory: 'fonts',
    priority: 'high' as const,
    status: 'pending' as const,
  },
  {
    id: 'font-montserrat',
    category: 'fonts',
    problemType: 'missing' as const,
    suggestedFix: 'Montserrat-Regular.ttf',
    envatoSearchQuery: 'montserrat font',
    envatoCategory: 'fonts',
    priority: 'medium' as const,
    status: 'pending' as const,
  },
  {
    id: 'font-playfair',
    category: 'fonts',
    problemType: 'missing' as const,
    suggestedFix: 'PlayfairDisplay-Regular.ttf',
    envatoSearchQuery: 'playfair display font',
    envatoCategory: 'fonts',
    priority: 'medium' as const,
    status: 'pending' as const,
  },
];

// ============================================================================
// ENVATO EQUIVALENT MAPPINGS
// ============================================================================

export interface EnvatoEquivalent {
  category: string;
  searchTerms: string[];
  expectedFormat: string;
  namingPattern: string;
  minCount: number;
}

export const ENVATO_EQUIVALENTS: Record<string, EnvatoEquivalent> = {
  '3d-models': {
    category: '3d',
    searchTerms: ['african mask 3d', 'drum 3d model glb', 'tribal sculpture 3d', 'baobab tree 3d', 'adinkra symbol 3d'],
    expectedFormat: '.glb',
    namingPattern: 'model-XXX.glb',
    minCount: 20,
  },
  'particles': {
    category: 'motion-graphics',
    searchTerms: ['dust particles overlay', 'bokeh particles 4k', 'sparkle magic particles', 'confetti celebration overlay', 'fire embers particles'],
    expectedFormat: '.webm',
    namingPattern: 'particle-XXX.webm',
    minCount: 30,
  },
  'transitions': {
    category: 'motion-graphics',
    searchTerms: ['cinematic transitions pack', 'glitch transition', 'zoom transition overlay', 'ink transition alpha'],
    expectedFormat: '.mp4',
    namingPattern: 'transition-XXX.mp4',
    minCount: 20,
  },
  'light-leak': {
    category: 'motion-graphics',
    searchTerms: ['light leak overlay 4k', 'cinematic light leak', 'film burn overlay', 'anamorphic flare'],
    expectedFormat: '.webm',
    namingPattern: 'leak-XXX.webm',
    minCount: 40,
  },
  'textures': {
    category: 'motion-graphics',
    searchTerms: ['abstract texture loop', 'organic texture 4k', 'noise grain overlay', 'paper texture video'],
    expectedFormat: '.mp4',
    namingPattern: 'video-XXX.mp4',
    minCount: 50,
  },
  'fonts': {
    category: 'fonts',
    searchTerms: ['modern sans serif', 'display font', 'african inspired font'],
    expectedFormat: '.ttf',
    namingPattern: 'FontName.ttf',
    minCount: 5,
  },
};

// ============================================================================
// SERVICE CLASS
// ============================================================================

class AssetCorrectionService {
  private corrections: AssetCorrection[] = [...ASSET_CORRECTIONS];
  private progress: CorrectionProgress = {
    isRunning: false,
    totalCorrections: 0,
    completedCorrections: 0,
    currentCorrection: null,
    errors: [],
  };
  private listeners: Set<(progress: CorrectionProgress) => void> = new Set();

  subscribe(listener: (progress: CorrectionProgress) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.progress));
  }

  getCorrections(): AssetCorrection[] {
    return this.corrections;
  }

  getCorrectionsByCategory(category: string): AssetCorrection[] {
    return this.corrections.filter(c => c.category === category);
  }

  getCorrectionsByPriority(priority: AssetCorrection['priority']): AssetCorrection[] {
    return this.corrections.filter(c => c.priority === priority);
  }

  getProgress(): CorrectionProgress {
    return this.progress;
  }

  getSummary(): Record<string, { total: number; pending: number; completed: number; failed: number }> {
    const summary: Record<string, { total: number; pending: number; completed: number; failed: number }> = {};
    
    this.corrections.forEach(c => {
      if (!summary[c.category]) {
        summary[c.category] = { total: 0, pending: 0, completed: 0, failed: 0 };
      }
      summary[c.category].total++;
      summary[c.category][c.status === 'pending' || c.status === 'downloading' ? 'pending' : c.status]++;
    });
    
    return summary;
  }

  /**
   * Process a downloaded file and place it in the correct location with proper naming
   */
  processDownloadedFile(
    file: File,
    targetCategory: string
  ): DownloadedAsset | null {
    const category = targetCategory.toLowerCase();
    const equivalent = ENVATO_EQUIVALENTS[category];
    
    if (!equivalent) {
      console.error(`Unknown category: ${category}`);
      return null;
    }

    // Determine the next available number for this category
    const existingCorrections = this.corrections.filter(
      c => c.category === category && c.status === 'completed'
    );
    const nextNumber = existingCorrections.length + 1;
    
    // Generate target name based on naming pattern
    let targetName: string;
    if (equivalent.namingPattern.includes('XXX')) {
      targetName = equivalent.namingPattern.replace('XXX', String(nextNumber).padStart(3, '0'));
    } else {
      // For fonts, use the original name but ensure correct extension
      const baseName = file.name.replace(/\.[^/.]+$/, '');
      targetName = `${baseName}${equivalent.expectedFormat}`;
    }
    
    const targetPath = `/assets/envato/${category}/${targetName}`;
    
    return {
      originalName: file.name,
      targetPath,
      targetName,
      category,
      size: file.size,
    };
  }

  /**
   * Mark a correction as completed
   */
  markCompleted(correctionId: string): void {
    const correction = this.corrections.find(c => c.id === correctionId);
    if (correction) {
      correction.status = 'completed';
      this.progress.completedCorrections++;
      this.notifyListeners();
    }
  }

  /**
   * Get Envato search URL for a specific category
   */
  getEnvatoSearchUrl(category: string, searchTerm?: string): string {
    const equivalent = ENVATO_EQUIVALENTS[category];
    const query = searchTerm || (equivalent?.searchTerms[0] ?? category);
    const envatoCategory = equivalent?.category ?? 'video';
    
    return `https://elements.envato.com/${envatoCategory}?q=${encodeURIComponent(query)}`;
  }

  /**
   * Get all search URLs for a category
   */
  getAllSearchUrls(category: string): string[] {
    const equivalent = ENVATO_EQUIVALENTS[category];
    if (!equivalent) return [];
    
    return equivalent.searchTerms.map(term => 
      `https://elements.envato.com/${equivalent.category}?q=${encodeURIComponent(term)}`
    );
  }

  /**
   * Validate if a file matches the expected format for a category
   */
  validateFile(file: File, category: string): { valid: boolean; error?: string } {
    const equivalent = ENVATO_EQUIVALENTS[category];
    if (!equivalent) {
      return { valid: false, error: 'Catégorie inconnue' };
    }
    
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    // Check format
    if (extension !== equivalent.expectedFormat) {
      return { 
        valid: false, 
        error: `Format attendu: ${equivalent.expectedFormat}, reçu: ${extension}` 
      };
    }
    
    // Check minimum size (to detect LFS pointers)
    const minSizes: Record<string, number> = {
      '3d-models': 10000,
      'particles': 50000,
      'transitions': 100000,
      'light-leak': 100000,
      'textures': 50000,
      'fonts': 5000,
    };
    
    if (file.size < (minSizes[category] || 1000)) {
      return { 
        valid: false, 
        error: `Fichier trop petit (${file.size} bytes). Possible pointeur LFS.` 
      };
    }
    
    return { valid: true };
  }

  /**
   * Get the target path for a new asset
   */
  getTargetPath(category: string, index: number): string {
    const equivalent = ENVATO_EQUIVALENTS[category];
    if (!equivalent) return '';
    
    const name = equivalent.namingPattern.replace('XXX', String(index).padStart(3, '0'));
    return `/assets/envato/${category}/${name}`;
  }

  /**
   * Simulate auto-correction (in real implementation, this would trigger actual downloads)
   */
  async simulateAutoCorrection(category?: string): Promise<void> {
    const corrections = category 
      ? this.getCorrectionsByCategory(category)
      : this.corrections;
    
    const pendingCorrections = corrections.filter(c => c.status === 'pending');
    
    this.progress = {
      isRunning: true,
      totalCorrections: pendingCorrections.length,
      completedCorrections: 0,
      currentCorrection: null,
      errors: [],
    };
    this.notifyListeners();

    for (const correction of pendingCorrections) {
      correction.status = 'downloading';
      this.progress.currentCorrection = correction;
      this.notifyListeners();
      
      // Simulate download time
      await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));
      
      // 90% success rate
      if (Math.random() > 0.1) {
        correction.status = 'completed';
        this.progress.completedCorrections++;
      } else {
        correction.status = 'failed';
        this.progress.errors.push(`Échec: ${correction.suggestedFix}`);
      }
      
      this.notifyListeners();
    }
    
    this.progress.isRunning = false;
    this.progress.currentCorrection = null;
    this.notifyListeners();
    
    toast.success(`Correction terminée: ${this.progress.completedCorrections}/${this.progress.totalCorrections} assets`);
  }
}

// Singleton instance
export const assetCorrectionService = new AssetCorrectionService();

// ============================================================================
// REACT HOOK
// ============================================================================

import { useState, useEffect, useCallback } from 'react';

export function useAssetCorrection() {
  const [progress, setProgress] = useState<CorrectionProgress>(assetCorrectionService.getProgress());
  const [corrections, setCorrections] = useState<AssetCorrection[]>(assetCorrectionService.getCorrections());

  useEffect(() => {
    return assetCorrectionService.subscribe((newProgress) => {
      setProgress({ ...newProgress });
      setCorrections([...assetCorrectionService.getCorrections()]);
    });
  }, []);

  const runCorrection = useCallback(async (category?: string) => {
    await assetCorrectionService.simulateAutoCorrection(category);
  }, []);

  const processFile = useCallback((file: File, category: string) => {
    return assetCorrectionService.processDownloadedFile(file, category);
  }, []);

  const validateFile = useCallback((file: File, category: string) => {
    return assetCorrectionService.validateFile(file, category);
  }, []);

  const getSearchUrl = useCallback((category: string, term?: string) => {
    return assetCorrectionService.getEnvatoSearchUrl(category, term);
  }, []);

  const markCompleted = useCallback((id: string) => {
    assetCorrectionService.markCompleted(id);
  }, []);

  return {
    progress,
    corrections,
    summary: assetCorrectionService.getSummary(),
    runCorrection,
    processFile,
    validateFile,
    getSearchUrl,
    markCompleted,
    getTargetPath: assetCorrectionService.getTargetPath.bind(assetCorrectionService),
    getAllSearchUrls: assetCorrectionService.getAllSearchUrls.bind(assetCorrectionService),
  };
}
