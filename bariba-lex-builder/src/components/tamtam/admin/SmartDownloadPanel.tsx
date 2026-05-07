/**
 * TAM-TAM Smart Asset Download Panel
 * Downloads assets directly from Envato and places them in correct folders with proper naming
 * Now integrated with useAssetImport for real uploads to Supabase Storage
 */

import React, { useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Download, 
  Upload, 
  Check, 
  X, 
  ExternalLink, 
  FolderOpen,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Zap,
  FileVideo,
  FileImage,
  FileAudio,
  Box,
  Type,
  Sparkles,
  Layers,
  ArrowRight,
  Settings,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  useAssetCorrection, 
  AssetCorrection,
  ENVATO_EQUIVALENTS 
} from '@/services/AssetCorrectionService';
import { useAssetImport, canConvertMovToWebM } from '@/hooks/useAssetImport';

// ============================================================================
// TYPES
// ============================================================================

interface SmartDownloadPanelProps {
  isEnvatoConnected?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const SmartDownloadPanel: React.FC<SmartDownloadPanelProps> = ({ isEnvatoConnected = false }) => {
  const {
    progress: correctionProgress,
    corrections,
    summary,
    runCorrection,
    getSearchUrl,
    markCompleted,
    getAllSearchUrls,
  } = useAssetCorrection();

  // Use the real import hook for actual uploads
  const {
    importedAssets,
    progress: importProgress,
    processFiles,
    confirmImport,
    confirmAllImports,
    removeAsset,
    clearAll,
    autoConvertMov,
    setAutoConvertMov,
    canConvertMov,
    importStats,
  } = useAssetImport();

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Category config
  const CATEGORY_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
    '3d-models': { icon: <Box className="h-4 w-4" />, color: 'text-cyan-500', label: '3D Models' },
    'particles': { icon: <Sparkles className="h-4 w-4" />, color: 'text-purple-500', label: 'Particles' },
    'transitions': { icon: <FileVideo className="h-4 w-4" />, color: 'text-pink-500', label: 'Transitions' },
    'light-leak': { icon: <Zap className="h-4 w-4" />, color: 'text-orange-500', label: 'Light Leaks' },
    'textures': { icon: <Layers className="h-4 w-4" />, color: 'text-blue-500', label: 'Textures' },
    'fonts': { icon: <Type className="h-4 w-4" />, color: 'text-gray-500', label: 'Fonts' },
    'audio': { icon: <FileAudio className="h-4 w-4" />, color: 'text-green-500', label: 'Audio' },
    'lens-flare': { icon: <FileImage className="h-4 w-4" />, color: 'text-yellow-500', label: 'Lens Flares' },
  };

  // Handle drag events
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  // Handle file drop - now using useAssetImport for real uploads
  const handleDrop = useCallback(async (e: React.DragEvent, targetCategory?: string) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const category = targetCategory || selectedCategory;

    if (category === 'all') {
      toast.error('Veuillez sélectionner une catégorie cible');
      return;
    }

    // Process files through useAssetImport for real storage upload
    await processFiles(files, category);
    
    // Mark relevant corrections as completed
    const relatedCorrection = corrections.find(
      c => c.category === category && c.status === 'pending'
    );
    if (relatedCorrection) {
      markCompleted(relatedCorrection.id);
    }
  }, [selectedCategory, processFiles, corrections, markCompleted]);

  // Upload all ready assets
  const handleUploadAll = useCallback(async () => {
    setIsUploading(true);
    try {
      const count = await confirmAllImports();
      if (count > 0) {
        toast.success(`${count} fichier(s) uploadé(s) vers le storage!`);
      }
    } catch (error) {
      toast.error('Erreur lors de l\'upload');
    } finally {
      setIsUploading(false);
    }
  }, [confirmAllImports]);

  // Open Envato search
  const openEnvatoSearch = (category: string) => {
    const url = getSearchUrl(category);
    window.open(url, '_blank');
  };

  // Open all search URLs for a category
  const openAllSearchUrls = (category: string) => {
    const urls = getAllSearchUrls(category);
    urls.forEach((url, index) => {
      setTimeout(() => window.open(url, '_blank'), index * 500);
    });
    toast.info(`${urls.length} onglets Envato ouverts`);
  };

  // Run auto-correction for a category
  const handleAutoCorrect = async (category?: string) => {
    await runCorrection(category);
  };

  // Clear all imported assets
  const handleClearAll = () => {
    clearAll();
  };

  // Get filtered corrections
  const filteredCorrections = selectedCategory === 'all' 
    ? corrections 
    : corrections.filter(c => c.category === selectedCategory);

  // Get priority counts
  const priorityCounts = {
    critical: corrections.filter(c => c.priority === 'critical' && c.status === 'pending').length,
    high: corrections.filter(c => c.priority === 'high' && c.status === 'pending').length,
    medium: corrections.filter(c => c.priority === 'medium' && c.status === 'pending').length,
  };

  // Get status counts from importedAssets
  const readyCount = importedAssets.filter(a => a.status === 'ready').length;
  const confirmedCount = importedAssets.filter(a => a.status === 'confirmed').length;
  const errorCount = importedAssets.filter(a => a.status === 'error').length;

  return (
    <div className="space-y-6">
      {/* Header with stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <XCircle className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-2xl font-bold">{priorityCounts.critical}</p>
                <p className="text-xs text-muted-foreground">Critical</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{priorityCounts.high}</p>
                <p className="text-xs text-muted-foreground">High Priority</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">
                  {confirmedCount + (importStats?.uploaded || 0)}
                </p>
                <p className="text-xs text-muted-foreground">Uploadés</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Download className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{readyCount}</p>
                <p className="text-xs text-muted-foreground">En attente</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress bar when running */}
      {correctionProgress.isRunning && (
        <Alert>
          <RefreshCw className="h-4 w-4 animate-spin" />
          <AlertTitle>Correction en cours...</AlertTitle>
          <AlertDescription className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{correctionProgress.currentCorrection?.suggestedFix || 'Préparation...'}</span>
              <span>{correctionProgress.completedCorrections}/{correctionProgress.totalCorrections}</span>
            </div>
            <Progress 
              value={(correctionProgress.completedCorrections / correctionProgress.totalCorrections) * 100} 
              className="h-2"
            />
          </AlertDescription>
        </Alert>
      )}

      {/* Import progress */}
      {importProgress.isProcessing && (
        <Alert>
          <Upload className="h-4 w-4 animate-pulse" />
          <AlertTitle>Traitement des fichiers...</AlertTitle>
          <AlertDescription>
            {importProgress.processed} / {importProgress.total} fichiers traités
          </AlertDescription>
        </Alert>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Category Selection & Drop Zone */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Drop Zone Intelligent
            </CardTitle>
            <CardDescription>
              Glissez-déposez vos fichiers Envato - ils seront automatiquement uploadés vers le storage
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* MOV Conversion toggle */}
            {canConvertMov && (
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <FileVideo className="h-4 w-4 text-purple-500" />
                  <Label htmlFor="mov-convert" className="text-sm">
                    Conversion auto MOV→WebM
                  </Label>
                </div>
                <Switch
                  id="mov-convert"
                  checked={autoConvertMov}
                  onCheckedChange={setAutoConvertMov}
                />
              </div>
            )}
            
            {!canConvertMov && (
              <Alert className="bg-yellow-500/10 border-yellow-500/30">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <AlertDescription className="text-xs">
                  Votre navigateur ne supporte pas la conversion MOV→WebM. Les fichiers MOV seront uploadés directement.
                </AlertDescription>
              </Alert>
            )}

            {/* Category selector */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedCategory === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory('all')}
              >
                All
              </Button>
              {Object.entries(CATEGORY_CONFIG).map(([cat, config]) => (
                <Button
                  key={cat}
                  variant={selectedCategory === cat ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(cat)}
                  className="gap-1"
                >
                  <span className={config.color}>{config.icon}</span>
                  {config.label}
                </Button>
              ))}
            </div>

            {/* Drop zone */}
            <div
              ref={dropZoneRef}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e)}
              className={`
                border-2 border-dashed rounded-lg p-8 text-center transition-colors
                ${isDragging 
                  ? 'border-primary bg-primary/10' 
                  : 'border-muted-foreground/25 hover:border-primary/50'
                }
              `}
            >
              <Upload className={`h-12 w-12 mx-auto mb-4 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
              <p className="text-lg font-medium mb-2">
                {selectedCategory === 'all' 
                  ? 'Sélectionnez une catégorie' 
                  : `Drop ${CATEGORY_CONFIG[selectedCategory]?.label || selectedCategory} files here`
                }
              </p>
              <p className="text-sm text-muted-foreground">
                Format attendu: {ENVATO_EQUIVALENTS[selectedCategory]?.expectedFormat || 'Sélectionnez une catégorie'}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Max 500MB par fichier • MOV, MP4, WebM, PNG, etc.
              </p>
            </div>

            {/* Quick Envato links */}
            {selectedCategory !== 'all' && (
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => openEnvatoSearch(selectedCategory)}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Ouvrir Envato
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => openAllSearchUrls(selectedCategory)}
                >
                  Ouvrir tous ({getAllSearchUrls(selectedCategory).length})
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Imported Files List - Real uploads */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FolderOpen className="h-5 w-5" />
                Fichiers Importés ({importedAssets.length})
              </CardTitle>
              <div className="flex gap-2">
                {readyCount > 0 && (
                  <Button 
                    size="sm" 
                    onClick={handleUploadAll}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 mr-1" />
                    )}
                    Upload ({readyCount})
                  </Button>
                )}
                {importedAssets.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={handleClearAll}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              {importedAssets.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <Upload className="h-12 w-12 mx-auto mb-2 opacity-20" />
                  <p>Aucun fichier importé</p>
                  <p className="text-xs mt-1">Déposez des fichiers dans la zone ci-dessus</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {importedAssets.map((asset) => (
                    <div
                      key={asset.id}
                      className={`p-3 rounded-lg border ${
                        asset.status === 'confirmed' ? 'bg-green-500/10 border-green-500/50' :
                        asset.status === 'error' ? 'bg-red-500/10 border-red-500/50' :
                        asset.status === 'uploading' || asset.status === 'converting' ? 'bg-blue-500/10 border-blue-500/50' :
                        'bg-muted'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {asset.status === 'confirmed' && <CheckCircle className="h-4 w-4 text-green-500" />}
                          {asset.status === 'error' && <XCircle className="h-4 w-4 text-red-500" />}
                          {asset.status === 'ready' && <Download className="h-4 w-4 text-blue-500" />}
                          {asset.status === 'uploading' && <Upload className="h-4 w-4 text-blue-500 animate-pulse" />}
                          {asset.status === 'converting' && <FileVideo className="h-4 w-4 text-purple-500 animate-spin" />}
                          <span className="text-sm font-medium truncate max-w-[150px]" title={asset.originalName}>
                            {asset.originalName}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">{asset.category}</Badge>
                          {asset.status === 'ready' && (
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => confirmImport(asset.id)}
                            >
                              <Upload className="h-3 w-3" />
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => removeAsset(asset.id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      
                      {asset.status === 'confirmed' && asset.publicUrl && (
                        <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                          <ArrowRight className="h-3 w-3" />
                          <code className="truncate max-w-[200px]">{asset.targetName}</code>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-4 w-4 ml-1"
                            onClick={() => window.open(asset.publicUrl, '_blank')}
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                      
                      {asset.status === 'converting' && asset.conversionProgress !== undefined && (
                        <Progress value={asset.conversionProgress} className="h-1 mt-2" />
                      )}
                      
                      {asset.error && (
                        <div className="mt-2 text-xs text-red-500">
                          {asset.error}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Corrections by Category */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Corrections Automatiques par Catégorie</CardTitle>
              <CardDescription>
                Connectez-vous à Envato pour télécharger et corriger automatiquement les assets
              </CardDescription>
            </div>
            <Button 
              onClick={() => handleAutoCorrect()}
              disabled={correctionProgress.isRunning}
            >
              {correctionProgress.isRunning ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  En cours...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Auto-Corriger Tout
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="3d-models">
            <TabsList className="grid grid-cols-4 md:grid-cols-8 h-auto gap-1">
              {Object.entries(summary).map(([cat, stats]) => (
                <TabsTrigger 
                  key={cat} 
                  value={cat}
                  className="flex flex-col py-2 px-3"
                >
                  <span className={CATEGORY_CONFIG[cat]?.color}>
                    {CATEGORY_CONFIG[cat]?.icon}
                  </span>
                  <span className="text-xs mt-1">{stats.total}</span>
                </TabsTrigger>
              ))}
            </TabsList>
            
            {Object.entries(summary).map(([cat, stats]) => (
              <TabsContent key={cat} value={cat} className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold flex items-center gap-2">
                      <span className={CATEGORY_CONFIG[cat]?.color}>
                        {CATEGORY_CONFIG[cat]?.icon}
                      </span>
                      {CATEGORY_CONFIG[cat]?.label || cat}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Format attendu: {ENVATO_EQUIVALENTS[cat]?.expectedFormat} • 
                      Pattern: {ENVATO_EQUIVALENTS[cat]?.namingPattern}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{stats.pending} pending</Badge>
                    <Badge className="bg-green-500">{stats.completed} done</Badge>
                    {stats.failed > 0 && (
                      <Badge variant="destructive">{stats.failed} failed</Badge>
                    )}
                  </div>
                </div>
                
                <Progress 
                  value={stats.total > 0 ? (stats.completed / stats.total) * 100 : 0}
                  className="h-2"
                />
                
                <div className="flex gap-2">
                  <Button 
                    variant="outline"
                    onClick={() => openEnvatoSearch(cat)}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Rechercher sur Envato
                  </Button>
                  <Button
                    onClick={() => handleAutoCorrect(cat)}
                    disabled={correctionProgress.isRunning || stats.pending === 0}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Corriger {cat}
                  </Button>
                </div>
                
                {/* Search terms */}
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium mb-2">Termes de recherche Envato:</p>
                  <div className="flex flex-wrap gap-2">
                    {ENVATO_EQUIVALENTS[cat]?.searchTerms.map((term, i) => (
                      <Badge 
                        key={i} 
                        variant="secondary" 
                        className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                        onClick={() => window.open(getSearchUrl(cat, term), '_blank')}
                      >
                        {term}
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </Badge>
                    ))}
                  </div>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default SmartDownloadPanel;
