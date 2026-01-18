/**
 * TAM-TAM Asset Import Hook
 * Gère l'upload, le renommage automatique et le placement des fichiers Envato
 * Upload réel vers Supabase Storage + tracking dans asset_imports table
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { ASSET_CATEGORIES, detectFileCategory, getTargetPath, AUDIO_SUBFOLDERS } from '@/lib/AssetConfig';

const STORAGE_BUCKET = 'envato-assets';

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
  status: 'pending' | 'processing' | 'ready' | 'uploading' | 'confirmed' | 'converting' | 'error';
  error?: string;
  size: number;
  previewUrl?: string;
  publicUrl?: string;
  needsConversion: boolean;
  conversionProgress?: number;
  mimeType?: string;
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

export interface ImportHistoryEntry {
  id: string;
  user_id: string | null;
  original_name: string;
  target_name: string;
  category: string;
  storage_path: string;
  public_url: string | null;
  file_size: number;
  mime_type: string | null;
  status: string;
  error_message: string | null;
  needs_conversion: boolean;
  original_format: string | null;
  converted_format: string | null;
  conversion_progress: number;
  created_at: string;
  uploaded_at: string | null;
  converted_at: string | null;
}

export interface ImportStats {
  total: number;
  uploaded: number;
  failed: number;
  converting: number;
  byCategory: Record<string, { total: number; uploaded: number; failed: number }>;
  recentErrors: Array<{ id: string; error: string; file: string; date: string }>;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const FORMAT_CONVERSIONS: Record<string, string> = {
  'mov': 'webm',
  'avi': 'webm',
  'tiff': 'png',
  'tif': 'png',
  'bmp': 'png',
  'aiff': 'mp3',
  'flac': 'mp3',
};

// MOV files are now accepted directly - conversion is optional
const VALID_EXTENSIONS: Record<string, string[]> = {
  'lens-flare': ['png', 'webp', 'jpg', 'jpeg'],
  'light-leak': ['webm', 'mp4', 'mov'],
  'particles': ['webm', 'mp4', 'mov'],
  'transitions': ['mp4', 'webm', 'mov'],
  'textures': ['mp4', 'webm', 'mov', 'jpg', 'png', 'webp'],
  '3d-models': ['glb', 'gltf'],
  'fonts': ['ttf', 'otf', 'woff', 'woff2'],
  'audio': ['mp3', 'wav', 'ogg', 'm4a'],
};

// ============================================================================
// CONVERSION UTILITIES
// ============================================================================

/**
 * Check if browser supports MOV to WebM conversion
 */
export function canConvertMovToWebM(): boolean {
  if (typeof MediaRecorder === 'undefined') return false;
  try {
    return MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ||
           MediaRecorder.isTypeSupported('video/webm;codecs=vp8');
  } catch {
    return false;
  }
}

/**
 * Convert MOV to WebM (client-side)
 * Returns the converted blob or null if conversion fails
 */
async function convertMovToWebM(
  file: File,
  onProgress?: (progress: number) => void
): Promise<Blob | null> {
  if (!canConvertMovToWebM()) {
    console.warn('Browser does not support MOV to WebM conversion');
    return null;
  }

  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    
    const objectUrl = URL.createObjectURL(file);
    video.src = objectUrl;
    
    video.onloadedmetadata = async () => {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        URL.revokeObjectURL(objectUrl);
        resolve(null);
        return;
      }
      
      const stream = canvas.captureStream(30);
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm;codecs=vp8';
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      const chunks: Blob[] = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      
      mediaRecorder.onstop = () => {
        URL.revokeObjectURL(objectUrl);
        const blob = new Blob(chunks, { type: 'video/webm' });
        resolve(blob);
      };
      
      mediaRecorder.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(null);
      };
      
      mediaRecorder.start();
      video.play();
      
      const duration = video.duration;
      const interval = setInterval(() => {
        if (!video.paused && video.currentTime > 0) {
          const progress = (video.currentTime / duration) * 100;
          onProgress?.(Math.min(progress, 99));
          
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        }
      }, 1000 / 30);
      
      video.onended = () => {
        clearInterval(interval);
        mediaRecorder.stop();
        onProgress?.(100);
      };
    };
    
    video.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(null);
    };
  });
}

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
  const [autoConvertMov, setAutoConvertMov] = useState<boolean>(false);
  const [importHistory, setImportHistory] = useState<ImportHistoryEntry[]>([]);
  const [importStats, setImportStats] = useState<ImportStats | null>(null);
  
  const assetCounterRef = useRef<Record<string, number>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Load import history from database
   */
  const loadImportHistory = useCallback(async (filters?: {
    category?: string;
    status?: string;
    limit?: number;
  }) => {
    try {
      let query = supabase
        .from('asset_imports')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (filters?.category) {
        query = query.eq('category', filters.category);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.limit) {
        query = query.limit(filters.limit);
      } else {
        query = query.limit(100);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error loading import history:', error);
        return [];
      }
      
      setImportHistory(data || []);
      return data || [];
    } catch (err) {
      console.error('Exception loading import history:', err);
      return [];
    }
  }, []);

  /**
   * Load import stats from database
   */
  const loadImportStats = useCallback(async (): Promise<ImportStats> => {
    try {
      const { data, error } = await supabase
        .from('asset_imports')
        .select('*');
      
      if (error) {
        console.error('Error loading import stats:', error);
        return {
          total: 0,
          uploaded: 0,
          failed: 0,
          converting: 0,
          byCategory: {},
          recentErrors: [],
        };
      }
      
      const imports = data || [];
      
      const byCategory: Record<string, { total: number; uploaded: number; failed: number }> = {};
      
      for (const imp of imports) {
        if (!byCategory[imp.category]) {
          byCategory[imp.category] = { total: 0, uploaded: 0, failed: 0 };
        }
        byCategory[imp.category].total++;
        if (imp.status === 'uploaded' || imp.status === 'converted') {
          byCategory[imp.category].uploaded++;
        }
        if (imp.status === 'failed') {
          byCategory[imp.category].failed++;
        }
      }
      
      const recentErrors = imports
        .filter(i => i.status === 'failed' && i.error_message)
        .slice(0, 10)
        .map(i => ({
          id: i.id,
          error: i.error_message || 'Unknown error',
          file: i.original_name,
          date: i.created_at,
        }));
      
      const stats: ImportStats = {
        total: imports.length,
        uploaded: imports.filter(i => i.status === 'uploaded' || i.status === 'converted').length,
        failed: imports.filter(i => i.status === 'failed').length,
        converting: imports.filter(i => i.status === 'converting').length,
        byCategory,
        recentErrors,
      };
      
      setImportStats(stats);
      return stats;
    } catch (err) {
      console.error('Exception loading import stats:', err);
      return {
        total: 0,
        uploaded: 0,
        failed: 0,
        converting: 0,
        byCategory: {},
        recentErrors: [],
      };
    }
  }, []);

  /**
   * Get current user ID
   */
  const getCurrentUserId = useCallback(async (): Promise<string | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || null;
  }, []);

  /**
   * Insert import record into database
   */
  const insertImportRecord = useCallback(async (
    asset: ImportedAsset,
    status: 'pending' | 'uploading' | 'uploaded' | 'converting' | 'converted' | 'failed',
    errorMessage?: string
  ): Promise<string | null> => {
    try {
      const userId = await getCurrentUserId();
      const storagePath = `${asset.category}/${asset.targetName}`;
      
      const { data, error } = await supabase
        .from('asset_imports')
        .insert({
          user_id: userId,
          original_name: asset.originalName,
          target_name: asset.targetName,
          category: asset.category,
          storage_path: storagePath,
          public_url: asset.publicUrl || null,
          file_size: asset.size,
          mime_type: asset.mimeType || asset.file.type,
          status,
          error_message: errorMessage || null,
          needs_conversion: asset.needsConversion,
          original_format: asset.originalName.split('.').pop()?.toLowerCase() || null,
          converted_format: asset.needsConversion ? 'webm' : null,
          conversion_progress: 0,
          uploaded_at: status === 'uploaded' || status === 'converted' ? new Date().toISOString() : null,
        })
        .select('id')
        .single();
      
      if (error) {
        console.error('Error inserting import record:', error);
        return null;
      }
      
      return data?.id || null;
    } catch (err) {
      console.error('Exception inserting import record:', err);
      return null;
    }
  }, [getCurrentUserId]);

  /**
   * Update import record status
   */
  const updateImportRecord = useCallback(async (
    recordId: string,
    updates: Partial<{
      status: string;
      error_message: string;
      public_url: string;
      conversion_progress: number;
      uploaded_at: string;
      converted_at: string;
    }>
  ) => {
    try {
      const { error } = await supabase
        .from('asset_imports')
        .update(updates)
        .eq('id', recordId);
      
      if (error) {
        console.error('Error updating import record:', error);
      }
    } catch (err) {
      console.error('Exception updating import record:', err);
    }
  }, []);

  /**
   * Retry a failed import
   */
  const retryImport = useCallback(async (importId: string): Promise<boolean> => {
    const record = importHistory.find(h => h.id === importId);
    if (!record || record.status !== 'failed') {
      toast.error('Impossible de réessayer cet import');
      return false;
    }
    
    toast.info(`Réessai de l'import de ${record.original_name}...`);
    
    // Reset status to pending
    await updateImportRecord(importId, { 
      status: 'pending',
      error_message: ''
    });
    
    // Refresh history
    await loadImportHistory();
    
    return true;
  }, [importHistory, updateImportRecord, loadImportHistory]);

  /**
   * Initialise les compteurs d'assets par catégorie
   */
  const initializeCounters = useCallback(async () => {
    // Charge les compteurs depuis la base de données
    try {
      const { data, error } = await supabase
        .from('asset_imports')
        .select('category')
        .in('status', ['uploaded', 'converted']);
      
      if (!error && data) {
        const counters: Record<string, number> = {};
        for (const item of data) {
          counters[item.category] = (counters[item.category] || 0) + 1;
        }
        assetCounterRef.current = counters;
      }
    } catch (err) {
      console.error('Error initializing counters from DB:', err);
    }
    
    // Fallback to localStorage
    if (Object.keys(assetCounterRef.current).length === 0) {
      const stored = localStorage.getItem('tamtam_asset_counters');
      if (stored) {
        assetCounterRef.current = JSON.parse(stored);
      } else {
        Object.keys(ASSET_CATEGORIES).forEach(cat => {
          assetCounterRef.current[cat] = 0;
        });
      }
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

    // Pattern standard - keep original extension if MOV and not converting
    const ext = originalName.split('.').pop()?.toLowerCase() || '';
    let targetExt = config.namingPattern.split('.').pop() || '';
    
    // Keep .mov if it's a valid extension for this category and not auto-converting
    if (ext === 'mov' && VALID_EXTENSIONS[category]?.includes('mov')) {
      targetExt = 'mov';
    }
    
    const namePattern = config.namingPattern.replace(/\.[^.]+$/, '');
    const name = `${namePattern.replace('XXX', String(index).padStart(3, '0'))}.${targetExt}`;
    
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
    await initializeCounters();
    
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
        mimeType: file.type,
      };
      return errorAsset;
    }

    // Génération du nom cible
    const { name: targetName, path: targetPath } = generateTargetName(category, file.name);

    // Vérifier si conversion MOV optionnelle demandée
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const needsConversion = autoConvertMov && ext === 'mov' && canConvertMovToWebM();

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
      mimeType: file.type,
    };

    return asset;
  }, [selectedCategory, detectCategory, validateFile, generateTargetName, initializeCounters, autoConvertMov]);

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
   * Upload un fichier vers Supabase Storage
   */
  const uploadToStorage = useCallback(async (
    asset: ImportedAsset,
    fileToUpload?: File | Blob
  ): Promise<{ success: boolean; publicUrl?: string; error?: string }> => {
    try {
      const file = fileToUpload || asset.file;
      
      // Construire le path de stockage (category/filename)
      let storagePath = `${asset.category}/${asset.targetName}`;
      
      // If converted, change extension
      if (fileToUpload && asset.needsConversion) {
        storagePath = storagePath.replace(/\.[^.]+$/, '.webm');
      }
      
      // Upload vers Supabase Storage
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, file, {
          cacheControl: '31536000', // 1 an de cache
          upsert: true, // Remplacer si existe
        });

      if (error) {
        console.error('Upload error:', error);
        return { success: false, error: error.message };
      }

      // Obtenir l'URL publique
      const { data: { publicUrl } } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(storagePath);

      return { success: true, publicUrl };
    } catch (err) {
      console.error('Upload exception:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Erreur inconnue' };
    }
  }, []);

  /**
   * Confirme l'import d'un asset (upload réel vers Supabase Storage)
   */
  const confirmImport = useCallback(async (assetId: string): Promise<ImportResult> => {
    const asset = importedAssets.find(a => a.id === assetId);
    
    if (!asset) {
      return { success: false, asset: null as any, message: 'Asset non trouvé' };
    }

    if (asset.status !== 'ready') {
      return { success: false, asset, message: 'Asset non prêt pour confirmation' };
    }

    // Create DB record first
    const recordId = await insertImportRecord(asset, 'uploading');

    // Marquer comme en cours de traitement
    setImportedAssets(prev => prev.map(a => 
      a.id === assetId ? { ...a, status: 'uploading' as const } : a
    ));

    let fileToUpload: File | Blob = asset.file;
    let finalTargetName = asset.targetName;

    // Handle MOV conversion if needed
    if (asset.needsConversion && autoConvertMov) {
      setImportedAssets(prev => prev.map(a => 
        a.id === assetId ? { ...a, status: 'converting' as const } : a
      ));
      
      if (recordId) {
        await updateImportRecord(recordId, { status: 'converting' });
      }
      
      toast.info(`🔄 Conversion MOV→WebM en cours pour ${asset.originalName}...`);
      
      const convertedBlob = await convertMovToWebM(asset.file, (progress) => {
        setImportedAssets(prev => prev.map(a => 
          a.id === assetId ? { ...a, conversionProgress: progress } : a
        ));
        if (recordId) {
          updateImportRecord(recordId, { conversion_progress: progress });
        }
      });
      
      if (convertedBlob) {
        fileToUpload = convertedBlob;
        finalTargetName = asset.targetName.replace(/\.[^.]+$/, '.webm');
        toast.success(`✅ Conversion réussie pour ${asset.originalName}`);
      } else {
        toast.warning(`⚠️ Conversion échouée pour ${asset.originalName}, upload du MOV original`);
      }
    }

    // Upload vers Supabase Storage
    const uploadResult = await uploadToStorage(
      { ...asset, targetName: finalTargetName },
      fileToUpload !== asset.file ? fileToUpload : undefined
    );

    if (!uploadResult.success) {
      setImportedAssets(prev => prev.map(a => 
        a.id === assetId ? { ...a, status: 'error' as const, error: uploadResult.error } : a
      ));
      
      if (recordId) {
        await updateImportRecord(recordId, { 
          status: 'failed',
          error_message: uploadResult.error || 'Upload failed'
        });
      }
      
      toast.error(`Erreur upload: ${uploadResult.error}`);
      return { success: false, asset, message: uploadResult.error || 'Erreur upload' };
    }

    // Update DB record with success
    if (recordId) {
      await updateImportRecord(recordId, {
        status: asset.needsConversion && fileToUpload !== asset.file ? 'converted' : 'uploaded',
        public_url: uploadResult.publicUrl,
        uploaded_at: new Date().toISOString(),
        converted_at: asset.needsConversion ? new Date().toISOString() : undefined,
      });
    }

    // Mettre à jour le statut
    setImportedAssets(prev => prev.map(a => 
      a.id === assetId ? { 
        ...a, 
        status: 'confirmed' as const,
        targetName: finalTargetName,
        publicUrl: uploadResult.publicUrl
      } : a
    ));

    setProgress(prev => ({
      ...prev,
      confirmed: prev.confirmed + 1,
    }));

    // Déclencher un événement personnalisé pour notifier les autres composants
    window.dispatchEvent(new CustomEvent('asset-imported', {
      detail: { 
        asset: { ...asset, targetName: finalTargetName }, 
        targetPath: asset.targetPath, 
        category: asset.category,
        publicUrl: uploadResult.publicUrl
      }
    }));

    toast.success(`✅ ${finalTargetName} uploadé et prêt!`);

    // Refresh stats
    loadImportStats();

    return { 
      success: true, 
      asset: { ...asset, status: 'confirmed', targetName: finalTargetName }, 
      message: `✅ ${finalTargetName} importé dans ${asset.category}` 
    };
  }, [importedAssets, uploadToStorage, autoConvertMov, insertImportRecord, updateImportRecord, loadImportStats]);

  /**
   * Confirme tous les assets prêts (upload séquentiel)
   */
  const confirmAllImports = useCallback(async (): Promise<number> => {
    const readyAssets = importedAssets.filter(a => a.status === 'ready');
    let confirmed = 0;

    for (const asset of readyAssets) {
      const result = await confirmImport(asset.id);
      if (result.success) confirmed++;
    }

    if (confirmed > 0) {
      toast.success(`🎉 ${confirmed} asset(s) uploadé(s) et prêt(s) à l'emploi!`);
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

  // Load stats on mount
  useEffect(() => {
    loadImportStats();
  }, [loadImportStats]);

  return {
    // State
    importedAssets,
    progress,
    selectedCategory,
    fileInputRef,
    autoConvertMov,
    importHistory,
    importStats,
    canConvertMov: canConvertMovToWebM(),
    
    // Actions
    setSelectedCategory,
    setAutoConvertMov,
    processFiles,
    processFile,
    confirmImport,
    confirmAllImports,
    removeAsset,
    clearAll,
    changeCategory,
    openFileSelector,
    handleFileInputChange,
    loadImportHistory,
    loadImportStats,
    retryImport,
    
    // Utils
    getCategoryStats,
    detectCategory,
    validateFile,
    uploadToStorage,
  };
}

export default useAssetImport;
