/**
 * TAM-TAM Asset Correction Service
 * Automatically detects and corrects problematic assets by replacing them with proper Envato equivalents
 */

import { toast } from 'sonner';
import { 
  ASSET_CATEGORIES, 
  KNOWN_ISSUES, 
  getEnvatoSearchUrl,
  matchesNamingPattern,
  detectFileCategory,
  isLikelyLFSPointer
} from '@/lib/AssetConfig';

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
// ASSET CORRECTION MAPPINGS - Generated from KNOWN_ISSUES
// ============================================================================

function generateCorrectionsFromKnownIssues(): AssetCorrection[] {
  const corrections: AssetCorrection[] = [];
  // Generate corrections from known issues
  KNOWN_ISSUES.forEach(issue => {
    const config = ASSET_CATEGORIES[issue.category];
    if (!config) return;
    
    for (let i = 1; i <= issue.affectedCount; i++) {
      const currentFile = issue.currentPattern?.replace('XXX', String(i).padStart(3, '0'));
      const suggestedFix = issue.expectedPattern.replace('XXX', String(i).padStart(3, '0'));
      
      corrections.push({
        id: `${issue.id}-${i}`,
        category: issue.category,
        problemType: issue.problemType as AssetCorrection['problemType'],
        currentFile,
        suggestedFix,
        envatoSearchQuery: config.envatoSearchTerms[i % config.envatoSearchTerms.length],
        envatoCategory: config.envatoCategory,
        priority: issue.priority,
        status: 'pending'
      });
    }
  });
  
  return corrections;
}

export const ASSET_CORRECTIONS: AssetCorrection[] = generateCorrectionsFromKnownIssues();

// Re-export ENVATO_EQUIVALENTS from centralized config for backward compatibility
export const ENVATO_EQUIVALENTS: Record<string, {
  category: string;
  searchTerms: string[];
  expectedFormat: string;
  namingPattern: string;
  minCount: number;
}> = Object.fromEntries(
  Object.entries(ASSET_CATEGORIES).map(([id, config]) => [
    id,
    {
      category: config.envatoCategory,
      searchTerms: config.envatoSearchTerms,
      expectedFormat: config.expectedFormats[0],
      namingPattern: config.namingPattern,
      minCount: config.expectedCount
    }
  ])
);

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
