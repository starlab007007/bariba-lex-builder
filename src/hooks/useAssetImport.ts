/**
 * TAM-TAM Asset Import Hook
 * Gère l'upload, le renommage automatique et le placement des fichiers Envato
 */

import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { ASSET_CATEGORIES, detectFileCategory, getTargetPath, AUDIO_SUBFOLDERS } from '@/lib/AssetConfig';

// ============================================================================
// TYPES
// ============================================================================

export interface ImportedAsset {
  id: string;
  originalName: string;
  targetName: string;
  targetPath: string;
  category: string;
  file: File;
  blob?: Blob;
  status: 'pending' | 'processing' | 'ready' | 'confirmed' | 'error';
  error?: string;
  size: number;
  previewUrl?: string;
  needsConversion: boolean;
  conversionProgress?: number;
}

export interface ImportProgress {
  total: number;
  processed: number;
  confirmed: number;
  errors: number;
  isProcessing: boolean;
}

export interface ImportResult {
  success: boolean;
  asset: ImportedAsset;
  message: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const FORMAT_CONVERSIONS: Record<string, string> = {
  'mov': 'webm',
  'avi': 'webm',
  'mp4': 'webm',
  'tiff': 'png',
  'tif': 'png',
  'bmp': 'png',
  'wav': 'mp3',
  'aiff': 'mp3',
  'flac': 'mp3',
};

const VALID_EXTENSIONS: Record<string, string[]> = {
  'lens-flare': ['png', 'jpg', 'jpeg', 'webp'],
  'light-leak': ['webm', 'mp4', 'mov'],
  'particles': ['webm', 'mp4', 'mov'],
  'transitions': ['mp4', 'webm', 'mov'],
  'textures': ['mp4', 'webm', 'jpg', 'png'],
  '3d-models': ['glb', 'gltf'],
  'fonts': ['ttf', 'otf', 'woff', 'woff2'],
  'audio': ['mp3', 'wav', 'm4a', 'ogg'],
};

// ============================================================================
// HOOK
// ============================================================================

export function useAssetImport() {
  const [importedAssets, setImportedAssets] = useState<ImportedAsset[]>([]);
  const [progress, setProgress] = useState<ImportProgress>({
    total: 0,
    processed: 0,
    confirmed: 0,
    errors: 0,
    isProcessing: false,
  });
  const [selectedCategory, setSelectedCategory] = useState<string>('auto');
  
  const assetCounterRef = useRef<Record<string, number>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Initialise les compteurs d'assets par catégorie
   */
  const initializeCounters = useCallback(() => {
    // Charge les compteurs existants depuis localStorage ou les initialise
    const stored = localStorage.getItem('tamtam_asset_counters');
    if (stored) {
      assetCounterRef.current = JSON.parse(stored);
    } else {
      Object.keys(ASSET_CATEGORIES).forEach(cat => {
        assetCounterRef.current[cat] = 0;
      });
    }
  }, []);

  /**
   * Sauvegarde les compteurs
   */
  const saveCounters = useCallback(() => {
    localStorage.setItem('tamtam_asset_counters', JSON.stringify(assetCounterRef.current));
  }, []);

  /**
   * Obtient le prochain index pour une catégorie
   */
  const getNextIndex = useCallback((category: string): number => {
    if (!assetCounterRef.current[category]) {
      assetCounterRef.current[category] = 0;
    }
    assetCounterRef.current[category]++;
    return assetCounterRef.current[category];
  }, []);

  /**
   * Détecte la catégorie d'un fichier
   */
  const detectCategory = useCallback((file: File, userCategory?: string): string | null => {
    if (userCategory && userCategory !== 'auto') {
      return userCategory;
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const name = file.name.toLowerCase();
    
    // Détection par contenu du nom
    if (name.includes('flare') || name.includes('lens')) return 'lens-flare';
    if (name.includes('leak') || name.includes('light')) return 'light-leak';
    if (name.includes('particle') || name.includes('dust') || name.includes('bokeh')) return 'particles';
    if (name.includes('transition') || name.includes('wipe') || name.includes('glitch')) return 'transitions';
    if (name.includes('texture') || name.includes('grain') || name.includes('noise')) return 'textures';
    if (name.includes('model') || name.includes('3d')) return '3d-models';
    
    // Détection par extension
    if (['glb', 'gltf'].includes(ext)) return '3d-models';
    if (['ttf', 'otf', 'woff', 'woff2'].includes(ext)) return 'fonts';
    if (['mp3', 'wav', 'm4a', 'ogg'].includes(ext)) return 'audio';
    if (['png', 'jpg', 'jpeg', 'webp'].includes(ext)) return 'lens-flare';
    if (['webm', 'mp4', 'mov'].includes(ext)) return 'light-leak'; // Par défaut pour vidéos
    
    return null;
  }, []);

  /**
   * Génère le nom cible pour un fichier
   */
  const generateTargetName = useCallback((category: string, originalName: string): { name: string; path: string; index: number } => {
    const config = ASSET_CATEGORIES[category];
    if (!config) {
      return { name: originalName, path: `/assets/envato/misc/${originalName}`, index: 0 };
    }

    const index = getNextIndex(category);
    
    // Gestion spéciale pour les fonts
    if (category === 'fonts') {
      const cleanName = originalName.replace(/\.[^/.]+$/, '');
      const ext = originalName.split('.').pop()?.toLowerCase() || 'ttf';
      const name = `${cleanName}.${ext}`;
      return { 
        name, 
        path: `${config.basePath}${name}`,
        index
      };
    }

    // Gestion spéciale pour audio avec sous-dossiers
    if (category === 'audio') {
      const subfolder = index <= 10 ? 'modern/' : index <= 18 ? 'traditional/' : 'percussion/';
      const localIndex = index <= 10 ? index : index <= 18 ? index - 10 : index - 18;
      const name = `audio-${String(localIndex).padStart(3, '0')}.mp3`;
      return {
        name,
        path: `${config.basePath}${subfolder}${name}`,
        index
      };
    }

    // Pattern standard
    const name = config.namingPattern.replace('XXX', String(index).padStart(3, '0'));
    return {
      name,
      path: `${config.basePath}${name}`,
      index
    };
  }, [getNextIndex]);

  /**
   * Valide un fichier pour une catégorie
   */
  const validateFile = useCallback((file: File, category: string): { valid: boolean; error?: string } => {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const validExts = VALID_EXTENSIONS[category];
    
    if (!validExts) {
      return { valid: false, error: `Catégorie inconnue: ${category}` };
    }

    // Vérifier l'extension (incluant les formats convertibles)
    const convertedExt = FORMAT_CONVERSIONS[ext];
    if (!validExts.includes(ext) && !validExts.includes(convertedExt || '')) {
      return { 
        valid: false, 
        error: `Format non supporté. Attendu: ${validExts.join(', ')}` 
      };
    }

    // Vérifier la taille minimale
    const config = ASSET_CATEGORIES[category];
    if (config && file.size < 100) {
      return { valid: false, error: 'Fichier trop petit (possible fichier vide)' };
    }

    return { valid: true };
  }, []);

  /**
   * Traite un fichier déposé
   */
  const processFile = useCallback(async (file: File, categoryOverride?: string): Promise<ImportedAsset | null> => {
    initializeCounters();
    
    const category = categoryOverride || detectCategory(file, selectedCategory);
    
    if (!category) {
      toast.error(`Impossible de détecter la catégorie pour: ${file.name}`);
      return null;
    }

    // Validation
    const validation = validateFile(file, category);
    if (!validation.valid) {
      const errorAsset: ImportedAsset = {
        id: `import-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        originalName: file.name,
        targetName: file.name,
        targetPath: '',
        category,
        file,
        status: 'error',
        error: validation.error,
        size: file.size,
        needsConversion: false,
      };
      return errorAsset;
    }

    // Génération du nom cible
    const { name: targetName, path: targetPath } = generateTargetName(category, file.name);

    // Vérifier si conversion nécessaire
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const needsConversion = !!FORMAT_CONVERSIONS[ext];

    // Créer preview URL
    let previewUrl: string | undefined;
    if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
      previewUrl = URL.createObjectURL(file);
    }

    const asset: ImportedAsset = {
      id: `import-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      originalName: file.name,
      targetName,
      targetPath,
      category,
      file,
      status: 'ready',
      size: file.size,
      previewUrl,
      needsConversion,
    };

    return asset;
  }, [selectedCategory, detectCategory, validateFile, generateTargetName, initializeCounters]);

  /**
   * Traite plusieurs fichiers
   */
  const processFiles = useCallback(async (files: File[], categoryOverride?: string): Promise<void> => {
    setProgress(prev => ({
      ...prev,
      total: prev.total + files.length,
      isProcessing: true,
    }));

    const results: ImportedAsset[] = [];

    for (const file of files) {
      const asset = await processFile(file, categoryOverride);
      if (asset) {
        results.push(asset);
        setProgress(prev => ({
          ...prev,
          processed: prev.processed + 1,
          errors: asset.status === 'error' ? prev.errors + 1 : prev.errors,
        }));
      }
    }

    setImportedAssets(prev => [...prev, ...results]);
    setProgress(prev => ({ ...prev, isProcessing: false }));
    saveCounters();

    const successCount = results.filter(r => r.status === 'ready').length;
    const errorCount = results.filter(r => r.status === 'error').length;

    if (successCount > 0) {
      toast.success(`${successCount} fichier(s) prêt(s) à être confirmé(s)`);
    }
    if (errorCount > 0) {
      toast.error(`${errorCount} fichier(s) rejeté(s)`);
    }
  }, [processFile, saveCounters]);

  /**
   * Confirme l'import d'un asset (le rend disponible pour utilisation)
   */
  const confirmImport = useCallback((assetId: string): ImportResult => {
    const asset = importedAssets.find(a => a.id === assetId);
    
    if (!asset) {
      return { success: false, asset: null as any, message: 'Asset non trouvé' };
    }

    if (asset.status !== 'ready') {
      return { success: false, asset, message: 'Asset non prêt pour confirmation' };
    }

    // Simuler la sauvegarde (dans un vrai projet, cela irait vers un backend/storage)
    // Pour l'instant, on marque comme confirmé et on stocke en localStorage
    const confirmedAssets = JSON.parse(localStorage.getItem('tamtam_confirmed_assets') || '[]');
    confirmedAssets.push({
      id: asset.id,
      targetPath: asset.targetPath,
      targetName: asset.targetName,
      category: asset.category,
      size: asset.size,
      confirmedAt: new Date().toISOString(),
    });
    localStorage.setItem('tamtam_confirmed_assets', JSON.stringify(confirmedAssets));

    // Mettre à jour le statut
    setImportedAssets(prev => prev.map(a => 
      a.id === assetId ? { ...a, status: 'confirmed' as const } : a
    ));

    setProgress(prev => ({
      ...prev,
      confirmed: prev.confirmed + 1,
    }));

    // Déclencher un événement personnalisé pour notifier les autres composants
    window.dispatchEvent(new CustomEvent('asset-imported', {
      detail: { asset, targetPath: asset.targetPath, category: asset.category }
    }));

    return { 
      success: true, 
      asset: { ...asset, status: 'confirmed' }, 
      message: `✅ ${asset.targetName} importé dans ${asset.category}` 
    };
  }, [importedAssets]);

  /**
   * Confirme tous les assets prêts
   */
  const confirmAllImports = useCallback((): number => {
    const readyAssets = importedAssets.filter(a => a.status === 'ready');
    let confirmed = 0;

    readyAssets.forEach(asset => {
      const result = confirmImport(asset.id);
      if (result.success) confirmed++;
    });

    if (confirmed > 0) {
      toast.success(`${confirmed} asset(s) confirmé(s) et prêt(s) à l'emploi!`);
    }

    return confirmed;
  }, [importedAssets, confirmImport]);

  /**
   * Supprime un asset de la liste
   */
  const removeAsset = useCallback((assetId: string) => {
    setImportedAssets(prev => {
      const asset = prev.find(a => a.id === assetId);
      if (asset?.previewUrl) {
        URL.revokeObjectURL(asset.previewUrl);
      }
      return prev.filter(a => a.id !== assetId);
    });
  }, []);

  /**
   * Efface tous les assets
   */
  const clearAll = useCallback(() => {
    importedAssets.forEach(asset => {
      if (asset.previewUrl) {
        URL.revokeObjectURL(asset.previewUrl);
      }
    });
    setImportedAssets([]);
    setProgress({
      total: 0,
      processed: 0,
      confirmed: 0,
      errors: 0,
      isProcessing: false,
    });
  }, [importedAssets]);

  /**
   * Modifie la catégorie d'un asset
   */
  const changeCategory = useCallback((assetId: string, newCategory: string) => {
    setImportedAssets(prev => prev.map(asset => {
      if (asset.id !== assetId) return asset;
      
      const { name: targetName, path: targetPath } = generateTargetName(newCategory, asset.originalName);
      
      return {
        ...asset,
        category: newCategory,
        targetName,
        targetPath,
      };
    }));
  }, [generateTargetName]);

  /**
   * Ouvre le sélecteur de fichiers
   */
  const openFileSelector = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  /**
   * Gestionnaire pour input file
   */
  const handleFileInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      processFiles(files);
    }
    // Reset l'input pour permettre de re-sélectionner le même fichier
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [processFiles]);

  /**
   * Obtient les stats par catégorie
   */
  const getCategoryStats = useCallback(() => {
    const stats: Record<string, { total: number; ready: number; confirmed: number; errors: number }> = {};
    
    Object.keys(ASSET_CATEGORIES).forEach(cat => {
      const catAssets = importedAssets.filter(a => a.category === cat);
      stats[cat] = {
        total: catAssets.length,
        ready: catAssets.filter(a => a.status === 'ready').length,
        confirmed: catAssets.filter(a => a.status === 'confirmed').length,
        errors: catAssets.filter(a => a.status === 'error').length,
      };
    });
    
    return stats;
  }, [importedAssets]);

  return {
    // State
    importedAssets,
    progress,
    selectedCategory,
    fileInputRef,
    
    // Actions
    setSelectedCategory,
    processFiles,
    processFile,
    confirmImport,
    confirmAllImports,
    removeAsset,
    clearAll,
    changeCategory,
    openFileSelector,
    handleFileInputChange,
    
    // Utils
    getCategoryStats,
    detectCategory,
    validateFile,
  };
}

export default useAssetImport;
