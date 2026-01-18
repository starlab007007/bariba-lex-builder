/**
 * TAM-TAM Asset Drop Zone with Real-Time Validation
 * Zone de dépôt améliorée avec feedback visuel en temps réel
 */

import React, { useState, useCallback, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Upload,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  FileVideo,
  FileImage,
  FileAudio,
  File,
  FolderOpen,
  Zap,
} from 'lucide-react';
import { validateAssetFile, formatFileSize, VALIDATION_SPECS, ValidationResult } from '@/services/AssetValidationService';
import { detectFileCategory } from '@/lib/AssetConfig';

// ============================================================================
// TYPES
// ============================================================================

interface DroppedFile {
  id: string;
  file: File;
  category: string | null;
  validationStatus: 'pending' | 'validating' | 'valid' | 'invalid' | 'warning';
  validationResult?: ValidationResult;
}

interface AssetDropZoneProps {
  onFilesProcessed: (files: File[], category?: string) => Promise<void>;
  onAutoConfirm?: () => Promise<void>;
  selectedCategory?: string;
  fileInputRef?: React.RefObject<HTMLInputElement>;
  onOpenFileSelector?: () => void;
  onFileInputChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

// ============================================================================
// HELPERS
// ============================================================================

const getFileIcon = (file: File) => {
  if (file.type.startsWith('video/')) return <FileVideo className="h-5 w-5" />;
  if (file.type.startsWith('image/')) return <FileImage className="h-5 w-5" />;
  if (file.type.startsWith('audio/')) return <FileAudio className="h-5 w-5" />;
  return <File className="h-5 w-5" />;
};

const getExpectedSpecs = (category: string) => {
  const spec = VALIDATION_SPECS[category];
  if (!spec) return null;
  
  const specs: string[] = [];
  specs.push(`${formatFileSize(spec.minSize)} - ${formatFileSize(spec.maxSize)}`);
  specs.push(spec.validFormats.join(', '));
  if (spec.minWidth && spec.minHeight) specs.push(`${spec.minWidth}x${spec.minHeight}+`);
  if (spec.minDuration && spec.maxDuration) specs.push(`${spec.minDuration}-${spec.maxDuration}s`);
  if (spec.requiresAlpha) specs.push('α requis');
  
  return specs;
};

// ============================================================================
// COMPONENT
// ============================================================================

export const AssetDropZone: React.FC<AssetDropZoneProps> = ({
  onFilesProcessed,
  onAutoConfirm,
  selectedCategory = 'auto',
  fileInputRef,
  onOpenFileSelector,
  onFileInputChange,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [droppedFiles, setDroppedFiles] = useState<DroppedFile[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [autoConfirmEnabled, setAutoConfirmEnabled] = useState(true);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  /**
   * Valide un fichier de manière asynchrone avec feedback temps réel
   */
  const validateFile = async (file: File): Promise<DroppedFile> => {
    const id = `drop-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const category = detectFileCategory(file.name) || selectedCategory;
    
    const droppedFile: DroppedFile = {
      id,
      file,
      category: category === 'auto' ? null : category,
      validationStatus: 'validating',
    };
    
    if (!category || category === 'auto') {
      return {
        ...droppedFile,
        validationStatus: 'warning',
        validationResult: {
          isValid: true,
          errors: [],
          warnings: ['Catégorie non détectée automatiquement'],
          details: {
            size: { value: file.size, min: 0, max: Infinity, passed: true, formatted: formatFileSize(file.size) },
            format: { value: file.name.split('.').pop() || '', expected: [], passed: true },
          },
        },
      };
    }
    
    try {
      const result = await validateAssetFile(file, category);
      return {
        ...droppedFile,
        category,
        validationStatus: result.isValid ? (result.warnings.length > 0 ? 'warning' : 'valid') : 'invalid',
        validationResult: result,
      };
    } catch (error) {
      return {
        ...droppedFile,
        validationStatus: 'invalid',
        validationResult: {
          isValid: false,
          errors: ['Erreur lors de la validation'],
          warnings: [],
          details: {
            size: { value: file.size, min: 0, max: 0, passed: false, formatted: formatFileSize(file.size) },
            format: { value: '', expected: [], passed: false },
          },
        },
      };
    }
  };

  /**
   * Traite les fichiers déposés avec validation temps réel
   */
  const handleFileDrop = useCallback(async (files: File[]) => {
    setIsValidating(true);
    
    // Ajouter tous les fichiers en état "validating"
    const initialFiles: DroppedFile[] = files.map(file => ({
      id: `drop-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      category: null,
      validationStatus: 'validating' as const,
    }));
    
    setDroppedFiles(initialFiles);
    
    // Valider chaque fichier et mettre à jour l'UI
    const validatedFiles: DroppedFile[] = [];
    
    for (const file of files) {
      const validated = await validateFile(file);
      validatedFiles.push(validated);
      
      // Mise à jour progressive de l'UI
      setDroppedFiles(prev => {
        const updated = [...prev];
        const index = updated.findIndex(f => f.file === file);
        if (index !== -1) {
          updated[index] = validated;
        } else {
          updated.push(validated);
        }
        return updated.filter((f, i, arr) => arr.findIndex(x => x.file === f.file) === i);
      });
    }
    
    setIsValidating(false);
    
    // Filtrer les fichiers valides
    const validFiles = validatedFiles.filter(f => f.validationStatus === 'valid' || f.validationStatus === 'warning');
    
    if (validFiles.length > 0) {
      // Envoyer les fichiers valides au hook d'import
      await onFilesProcessed(
        validFiles.map(f => f.file),
        selectedCategory !== 'auto' ? selectedCategory : undefined
      );
      
      // Auto-confirm si activé
      if (autoConfirmEnabled && onAutoConfirm) {
        setTimeout(async () => {
          await onAutoConfirm();
          setDroppedFiles([]);
        }, 500);
      }
    }
    
    // Garder seulement les fichiers invalides affichés
    setTimeout(() => {
      setDroppedFiles(prev => prev.filter(f => f.validationStatus === 'invalid'));
    }, autoConfirmEnabled ? 1000 : 3000);
  }, [onFilesProcessed, onAutoConfirm, selectedCategory, autoConfirmEnabled]);

  // Drag handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === e.target) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileDrop(files);
    }
  }, [handleFileDrop]);

  // Stats des fichiers déposés
  const validCount = droppedFiles.filter(f => f.validationStatus === 'valid').length;
  const warningCount = droppedFiles.filter(f => f.validationStatus === 'warning').length;
  const invalidCount = droppedFiles.filter(f => f.validationStatus === 'invalid').length;
  const validatingCount = droppedFiles.filter(f => f.validationStatus === 'validating').length;

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <Card 
        ref={dropZoneRef}
        className={`transition-all duration-300 cursor-pointer ${
          isDragging 
            ? 'border-primary border-2 bg-primary/5 scale-[1.02]' 
            : 'border-dashed hover:border-primary/50'
        }`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={onOpenFileSelector}
      >
        <CardContent className="py-10">
          <div className="text-center space-y-4">
            {/* Icône centrale animée */}
            <div className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 ${
              isDragging ? 'bg-primary text-primary-foreground scale-110 animate-pulse' : 
              isValidating ? 'bg-orange-500/20' :
              'bg-muted'
            }`}>
              {isValidating ? (
                <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
              ) : (
                <Upload className={`h-10 w-10 ${isDragging ? '' : 'text-muted-foreground'}`} />
              )}
            </div>
            
            {/* Titre et description */}
            <div>
              <h3 className="font-semibold text-lg">
                {isDragging ? '📥 Déposez maintenant !' : 
                 isValidating ? '🔍 Validation en cours...' :
                 'Glissez-déposez vos fichiers Envato'}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {autoConfirmEnabled 
                  ? '⚡ Import automatique activé - Les fichiers valides seront uploadés immédiatement'
                  : 'Les fichiers seront validés puis vous pourrez les confirmer'
                }
              </p>
            </div>
            
            {/* Formats acceptés */}
            <div className="flex flex-wrap justify-center gap-2">
              <Badge variant="outline" className="bg-muted/50">WebM (α)</Badge>
              <Badge variant="outline" className="bg-muted/50">MOV → WebM</Badge>
              <Badge variant="outline" className="bg-muted/50">PNG (α)</Badge>
              <Badge variant="outline" className="bg-muted/50">MP3</Badge>
              <Badge variant="outline" className="bg-muted/50">GLB</Badge>
            </div>
            
            {/* Specs attendues si catégorie sélectionnée */}
            {selectedCategory && selectedCategory !== 'auto' && (
              <div className="pt-2">
                <Badge variant="secondary" className="text-xs">
                  📋 {selectedCategory}: {getExpectedSpecs(selectedCategory)?.join(' | ')}
                </Badge>
              </div>
            )}
            
            {/* Bouton browse */}
            <div className="pt-2">
              <Button variant="outline" onClick={(e) => { e.stopPropagation(); onOpenFileSelector?.(); }}>
                <FolderOpen className="h-4 w-4 mr-2" />
                Parcourir
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Auto-confirm toggle */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center space-x-2">
          <Switch
            id="auto-confirm"
            checked={autoConfirmEnabled}
            onCheckedChange={setAutoConfirmEnabled}
          />
          <Label htmlFor="auto-confirm" className="flex items-center gap-2 cursor-pointer">
            <Zap className={`h-4 w-4 ${autoConfirmEnabled ? 'text-yellow-500' : 'text-muted-foreground'}`} />
            <span className="text-sm">Import automatique</span>
          </Label>
        </div>
        
        {droppedFiles.length > 0 && (
          <div className="flex gap-2 text-xs">
            {validatingCount > 0 && <Badge variant="outline">⏳ {validatingCount}</Badge>}
            {validCount > 0 && <Badge className="bg-green-500/20 text-green-500">✓ {validCount}</Badge>}
            {warningCount > 0 && <Badge className="bg-yellow-500/20 text-yellow-500">⚠ {warningCount}</Badge>}
            {invalidCount > 0 && <Badge className="bg-red-500/20 text-red-500">✗ {invalidCount}</Badge>}
          </div>
        )}
      </div>

      {/* Liste des fichiers avec validation en temps réel */}
      {droppedFiles.length > 0 && (
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {droppedFiles.map((dropped) => (
            <Card 
              key={dropped.id}
              className={`transition-all duration-300 ${
                dropped.validationStatus === 'valid' ? 'bg-green-500/5 border-green-500/30' :
                dropped.validationStatus === 'warning' ? 'bg-yellow-500/5 border-yellow-500/30' :
                dropped.validationStatus === 'invalid' ? 'bg-red-500/5 border-red-500/30' :
                'bg-muted/30'
              }`}
            >
              <CardContent className="py-3 px-4">
                <div className="flex items-center justify-between gap-4">
                  {/* Fichier info */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* Status icon */}
                    {dropped.validationStatus === 'validating' && (
                      <Loader2 className="h-5 w-5 text-orange-500 animate-spin flex-shrink-0" />
                    )}
                    {dropped.validationStatus === 'valid' && (
                      <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                    )}
                    {dropped.validationStatus === 'warning' && (
                      <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0" />
                    )}
                    {dropped.validationStatus === 'invalid' && (
                      <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                    )}
                    
                    {/* File icon */}
                    {getFileIcon(dropped.file)}
                    
                    {/* File details */}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{dropped.file.name}</div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {/* Size badge */}
                        {dropped.validationResult && (
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${dropped.validationResult.details.size.passed ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'}`}
                          >
                            {dropped.validationResult.details.size.formatted}
                          </Badge>
                        )}
                        
                        {/* Format badge */}
                        {dropped.validationResult && (
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${dropped.validationResult.details.format.passed ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'}`}
                          >
                            .{dropped.validationResult.details.format.value}
                          </Badge>
                        )}
                        
                        {/* Resolution badge */}
                        {dropped.validationResult?.details.resolution && (
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${dropped.validationResult.details.resolution.passed ? 'bg-green-500/10 text-green-600' : 'bg-yellow-500/10 text-yellow-600'}`}
                          >
                            {dropped.validationResult.details.resolution.width}x{dropped.validationResult.details.resolution.height}
                          </Badge>
                        )}
                        
                        {/* Duration badge */}
                        {dropped.validationResult?.details.duration && (
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${dropped.validationResult.details.duration.passed ? 'bg-green-500/10 text-green-600' : 'bg-yellow-500/10 text-yellow-600'}`}
                          >
                            {dropped.validationResult.details.duration.value.toFixed(1)}s
                          </Badge>
                        )}
                        
                        {/* Alpha badge */}
                        {dropped.validationResult?.details.hasAlpha !== undefined && (
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${dropped.validationResult.details.hasAlpha ? 'bg-purple-500/10 text-purple-600' : 'bg-muted'}`}
                          >
                            {dropped.validationResult.details.hasAlpha ? 'α ✓' : 'α ?'}
                          </Badge>
                        )}
                        
                        {/* Category badge */}
                        {dropped.category && (
                          <Badge variant="secondary" className="text-xs">
                            {dropped.category}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Status text */}
                  <div className="text-xs text-right">
                    {dropped.validationStatus === 'validating' && (
                      <span className="text-orange-500">Validation...</span>
                    )}
                    {dropped.validationStatus === 'valid' && (
                      <span className="text-green-500">✓ Prêt</span>
                    )}
                    {dropped.validationStatus === 'warning' && (
                      <span className="text-yellow-500">{dropped.validationResult?.warnings[0]}</span>
                    )}
                    {dropped.validationStatus === 'invalid' && (
                      <span className="text-red-500">{dropped.validationResult?.errors[0]}</span>
                    )}
                  </div>
                </div>
                
                {/* Validation progress for validating files */}
                {dropped.validationStatus === 'validating' && (
                  <Progress value={50} className="h-1 mt-2" />
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Hidden file input */}
      {fileInputRef && (
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".webm,.mp4,.mov,.png,.jpg,.jpeg,.mp3,.wav,.glb,.gltf,.ttf,.otf"
          onChange={onFileInputChange}
          className="hidden"
        />
      )}
    </div>
  );
};

export default AssetDropZone;
