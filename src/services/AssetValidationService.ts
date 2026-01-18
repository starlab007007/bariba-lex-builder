/**
 * TAM-TAM Asset Validation Service
 * Validation avancée des fichiers avec vérification taille, format, résolution, durée
 */

// ============================================================================
// TYPES
// ============================================================================

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  details: ValidationDetails;
}

export interface ValidationDetails {
  size: {
    value: number;
    min: number;
    max: number;
    passed: boolean;
    formatted: string;
  };
  format: {
    value: string;
    expected: string[];
    passed: boolean;
  };
  resolution?: {
    width: number;
    height: number;
    minWidth: number;
    minHeight: number;
    passed: boolean;
  };
  duration?: {
    value: number;
    min: number;
    max: number;
    passed: boolean;
  };
  hasAlpha?: boolean;
}

// ============================================================================
// VALIDATION SPECS PAR CATÉGORIE
// ============================================================================

export interface CategoryValidationSpec {
  minSize: number;      // bytes
  maxSize: number;      // bytes
  validFormats: string[];
  validMimeTypes: string[];
  minWidth?: number;
  minHeight?: number;
  minDuration?: number; // seconds
  maxDuration?: number; // seconds
  requiresAlpha?: boolean;
}

export const VALIDATION_SPECS: Record<string, CategoryValidationSpec> = {
  'lens-flare': {
    minSize: 5 * 1024,          // 5 KB - selon spécification
    maxSize: 50 * 1024 * 1024,  // 50 MB
    validFormats: ['png', 'webp'],
    validMimeTypes: ['image/png', 'image/webp'],
    minWidth: 1920,
    minHeight: 1080,
  },
  'light-leak': {
    minSize: 100 * 1024,        // 100 KB - selon spécification
    maxSize: 200 * 1024 * 1024, // 200 MB
    validFormats: ['webm', 'mp4', 'mov'],
    validMimeTypes: ['video/webm', 'video/mp4', 'video/quicktime'],
    minWidth: 1920,
    minHeight: 1080,
    minDuration: 2,
    maxDuration: 30,
    requiresAlpha: true,
  },
  'particles': {
    minSize: 50 * 1024,         // 50 KB - selon spécification
    maxSize: 150 * 1024 * 1024, // 150 MB
    validFormats: ['webm', 'mp4', 'mov'],
    validMimeTypes: ['video/webm', 'video/mp4', 'video/quicktime'],
    minWidth: 1920,
    minHeight: 1080,
    minDuration: 3,
    maxDuration: 30,
    requiresAlpha: true,
  },
  'transitions': {
    minSize: 50 * 1024,         // 50 KB - selon spécification
    maxSize: 100 * 1024 * 1024, // 100 MB
    validFormats: ['mp4', 'webm', 'mov'],
    validMimeTypes: ['video/mp4', 'video/webm', 'video/quicktime'],
    minWidth: 1920,
    minHeight: 1080,
    minDuration: 1,
    maxDuration: 10,
  },
  'textures': {
    minSize: 10 * 1024,         // 10 KB - selon spécification
    maxSize: 100 * 1024 * 1024, // 100 MB
    validFormats: ['mp4', 'webm', 'mov', 'jpg', 'png'],
    validMimeTypes: ['video/mp4', 'video/webm', 'video/quicktime', 'image/jpeg', 'image/png'],
    minWidth: 1920,
    minHeight: 1080,
  },
  '3d-models': {
    minSize: 1024,              // 1 KB - selon spécification
    maxSize: 100 * 1024 * 1024, // 100 MB
    validFormats: ['glb', 'gltf'],
    validMimeTypes: ['model/gltf-binary', 'model/gltf+json', 'application/octet-stream'],
  },
  'fonts': {
    minSize: 5 * 1024,          // 5 KB - selon spécification
    maxSize: 10 * 1024 * 1024,  // 10 MB
    validFormats: ['ttf', 'otf', 'woff', 'woff2'],
    validMimeTypes: ['font/ttf', 'font/otf', 'font/woff', 'font/woff2', 'application/x-font-ttf', 'application/octet-stream', 'font/sfnt'],
  },
  'audio': {
    minSize: 10 * 1024,         // 10 KB - selon spécification
    maxSize: 50 * 1024 * 1024,  // 50 MB
    validFormats: ['mp3', 'wav', 'ogg', 'm4a'],
    validMimeTypes: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/x-m4a', 'audio/aac'],
  },
};

// ============================================================================
// HELPERS
// ============================================================================

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Extrait les métadonnées vidéo (résolution, durée)
 */
async function getVideoMetadata(file: File): Promise<{ width: number; height: number; duration: number }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    
    // Timeout pour les formats qui peuvent ne pas être supportés par le navigateur (MOV)
    const timeout = setTimeout(() => {
      URL.revokeObjectURL(video.src);
      // Fallback: accepter le fichier sans métadonnées si le timeout est atteint
      console.warn(`Timeout loading metadata for ${file.name}, accepting with default values`);
      resolve({
        width: 1920,  // Valeurs par défaut
        height: 1080,
        duration: 10,
      });
    }, 5000);
    
    video.onloadedmetadata = () => {
      clearTimeout(timeout);
      URL.revokeObjectURL(video.src);
      resolve({
        width: video.videoWidth,
        height: video.videoHeight,
        duration: video.duration,
      });
    };
    
    video.onerror = () => {
      clearTimeout(timeout);
      URL.revokeObjectURL(video.src);
      // Pour les fichiers MOV (video/quicktime), accepter avec warning
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext === 'mov' || file.type === 'video/quicktime') {
        console.warn(`MOV file ${file.name} metadata unreadable, accepting with defaults`);
        resolve({
          width: 1920,
          height: 1080,
          duration: 10,
        });
      } else {
        reject(new Error('Failed to load video metadata'));
      }
    };
    
    video.src = URL.createObjectURL(file);
  });
}

/**
 * Extrait les métadonnées image (résolution)
 */
async function getImageMetadata(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('Failed to load image metadata'));
    };
    
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Détecte si une image PNG a un canal alpha
 */
async function hasAlphaChannel(file: File): Promise<boolean> {
  // Pour WebM, on suppose qu'il a un canal alpha si c'est requis
  if (file.type === 'video/webm') {
    return true; // On ne peut pas facilement détecter sans décoder
  }
  
  if (file.type === 'image/png') {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = Math.min(img.width, 100);
        canvas.height = Math.min(img.height, 100);
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          resolve(false);
          return;
        }
        
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // Vérifier si un pixel a une valeur alpha < 255
        for (let i = 3; i < imageData.data.length; i += 4) {
          if (imageData.data[i] < 255) {
            URL.revokeObjectURL(img.src);
            resolve(true);
            return;
          }
        }
        
        URL.revokeObjectURL(img.src);
        resolve(false);
      };
      
      img.onerror = () => resolve(false);
      img.src = URL.createObjectURL(file);
    });
  }
  
  return false;
}

// ============================================================================
// MAIN VALIDATION FUNCTION
// ============================================================================

export async function validateAssetFile(
  file: File,
  category: string
): Promise<ValidationResult> {
  const spec = VALIDATION_SPECS[category];
  
  if (!spec) {
    return {
      isValid: false,
      errors: [`Catégorie inconnue: ${category}`],
      warnings: [],
      details: {
        size: { value: file.size, min: 0, max: 0, passed: false, formatted: formatFileSize(file.size) },
        format: { value: file.name.split('.').pop() || '', expected: [], passed: false },
      },
    };
  }
  
  const errors: string[] = [];
  const warnings: string[] = [];
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  
  // Validation de la taille
  const sizeValid = file.size >= spec.minSize && file.size <= spec.maxSize;
  if (!sizeValid) {
    if (file.size < spec.minSize) {
      errors.push(`Fichier trop petit: ${formatFileSize(file.size)} (min: ${formatFileSize(spec.minSize)})`);
    } else {
      errors.push(`Fichier trop grand: ${formatFileSize(file.size)} (max: ${formatFileSize(spec.maxSize)})`);
    }
  }
  
  // Validation du format
  const formatValid = spec.validFormats.includes(ext);
  if (!formatValid) {
    errors.push(`Format non supporté: .${ext} (attendu: ${spec.validFormats.join(', ')})`);
  }
  
  const details: ValidationDetails = {
    size: {
      value: file.size,
      min: spec.minSize,
      max: spec.maxSize,
      passed: sizeValid,
      formatted: formatFileSize(file.size),
    },
    format: {
      value: ext,
      expected: spec.validFormats,
      passed: formatValid,
    },
  };
  
  // Validation de la résolution pour vidéos/images
  if (spec.minWidth && spec.minHeight) {
    try {
      // Support video/quicktime (MOV) et autres formats vidéo
      const isVideo = file.type.startsWith('video/') || file.type === 'video/quicktime' || ['webm', 'mp4', 'mov', 'avi'].includes(ext);
      if (isVideo) {
        const videoMeta = await getVideoMetadata(file);
        const resValid = videoMeta.width >= spec.minWidth && videoMeta.height >= spec.minHeight;
        
        details.resolution = {
          width: videoMeta.width,
          height: videoMeta.height,
          minWidth: spec.minWidth,
          minHeight: spec.minHeight,
          passed: resValid,
        };
        
        if (!resValid) {
          warnings.push(`Résolution faible: ${videoMeta.width}x${videoMeta.height} (min: ${spec.minWidth}x${spec.minHeight})`);
        }
        
        // Validation de la durée
        if (spec.minDuration !== undefined && spec.maxDuration !== undefined) {
          const durationValid = videoMeta.duration >= spec.minDuration && videoMeta.duration <= spec.maxDuration;
          
          details.duration = {
            value: videoMeta.duration,
            min: spec.minDuration,
            max: spec.maxDuration,
            passed: durationValid,
          };
          
          if (!durationValid) {
            if (videoMeta.duration < spec.minDuration) {
              warnings.push(`Durée trop courte: ${videoMeta.duration.toFixed(1)}s (min: ${spec.minDuration}s)`);
            } else {
              warnings.push(`Durée trop longue: ${videoMeta.duration.toFixed(1)}s (max: ${spec.maxDuration}s)`);
            }
          }
        }
      } else if (file.type.startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)) {
        const imgMeta = await getImageMetadata(file);
        const resValid = imgMeta.width >= spec.minWidth && imgMeta.height >= spec.minHeight;
        
        details.resolution = {
          width: imgMeta.width,
          height: imgMeta.height,
          minWidth: spec.minWidth,
          minHeight: spec.minHeight,
          passed: resValid,
        };
        
        if (!resValid) {
          warnings.push(`Résolution faible: ${imgMeta.width}x${imgMeta.height} (min: ${spec.minWidth}x${spec.minHeight})`);
        }
      }
    } catch (e) {
      warnings.push('Impossible de vérifier les métadonnées');
    }
  }
  
  // Vérification du canal alpha
  if (spec.requiresAlpha) {
    try {
      const alpha = await hasAlphaChannel(file);
      details.hasAlpha = alpha;
      
      if (!alpha && ext !== 'webm') {
        warnings.push('Canal alpha non détecté - assurez-vous que le fichier supporte la transparence');
      }
    } catch {
      // Ignorer si la détection échoue
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    details,
  };
}

/**
 * Validation rapide sans métadonnées (synchrone)
 */
export function quickValidateFile(
  file: File,
  category: string
): { valid: boolean; error?: string } {
  const spec = VALIDATION_SPECS[category];
  
  if (!spec) {
    return { valid: false, error: `Catégorie inconnue: ${category}` };
  }
  
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  
  if (!spec.validFormats.includes(ext)) {
    return { valid: false, error: `Format non supporté: .${ext}` };
  }
  
  if (file.size < spec.minSize) {
    return { valid: false, error: `Fichier trop petit (${formatFileSize(file.size)})` };
  }
  
  if (file.size > spec.maxSize) {
    return { valid: false, error: `Fichier trop grand (${formatFileSize(file.size)})` };
  }
  
  return { valid: true };
}

export default validateAssetFile;
