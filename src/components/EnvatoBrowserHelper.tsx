import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  ExternalLink, 
  Upload, 
  Check, 
  Clock, 
  Download,
  FileVideo,
  FileImage,
  FileAudio,
  File,
  ChevronDown,
  RefreshCw,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  FolderOpen,
  Loader2,
  Trash2,
  FileCheck,
  Info,
  Wand2,
  FolderInput
} from 'lucide-react';
import { ENVATO_ASSET_MAP, EnvatoAssetMapping, getEnvatoUrl } from '@/lib/EnvatoDownloader';
import { useToast } from '@/hooks/use-toast';
import { useAssetImport, ImportStats } from '@/hooks/useAssetImport';
import { ASSET_CATEGORIES } from '@/lib/AssetConfig';
import { formatFileSize, VALIDATION_SPECS } from '@/services/AssetValidationService';
import { AssetDropZone } from '@/components/AssetDropZone';
import { supabase } from '@/integrations/supabase/client';

// ============================================================================
// TYPES
// ============================================================================

interface AssetStatus {
  mapping: EnvatoAssetMapping;
  category: string;
  status: 'pending' | 'downloading' | 'converting' | 'uploaded' | 'error';
  progress?: number;
  detectedFile?: string;
  error?: string;
  publicUrl?: string;
}

interface DetectedDownload {
  filename: string;
  size: number;
  timestamp: Date;
  suggestedMatch?: {
    category: string;
    mapping: EnvatoAssetMapping;
    confidence: number;
  };
}

interface CategoryProgress {
  total: number;
  completed: number;
  pending: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'light-leak': <FileVideo className="h-4 w-4" />,
  'particles': <Sparkles className="h-4 w-4" />,
  'lens-flare': <FileImage className="h-4 w-4" />,
  'transitions': <FileVideo className="h-4 w-4" />,
  'textures': <FileImage className="h-4 w-4" />,
  '3d-models': <File className="h-4 w-4" />,
  'fonts': <File className="h-4 w-4" />,
  'audio': <FileAudio className="h-4 w-4" />,
};

const CATEGORY_NAMES: Record<string, string> = {
  'light-leak': 'Light Leaks',
  'particles': 'Particles',
  'lens-flare': 'Lens Flares',
  'transitions': 'Transitions',
  'textures': 'Textures',
  '3d-models': '3D Models',
  'fonts': 'Fonts',
  'audio': 'Audio',
};

// ============================================================================
// SMART MATCHING UTILITIES
// ============================================================================

function normalizeFilename(filename: string): string {
  return filename
    .toLowerCase()
    .replace(/[-_\s]+/g, ' ')
    .replace(/\d+/g, '')
    .replace(/\.(mov|mp4|webm|png|jpg|jpeg|mp3|wav|glb|ttf|otf)$/i, '')
    .trim();
}

function similarityScore(a: string, b: string): number {
  const wordsA = normalizeFilename(a).split(' ').filter(w => w.length > 2);
  const wordsB = normalizeFilename(b).split(' ').filter(w => w.length > 2);
  
  let matches = 0;
  for (const wordA of wordsA) {
    for (const wordB of wordsB) {
      if (wordA.includes(wordB) || wordB.includes(wordA)) {
        matches++;
        break;
      }
    }
  }
  
  return wordsA.length > 0 ? matches / wordsA.length : 0;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const EnvatoBrowserHelper: React.FC = () => {
  const { toast } = useToast();
  
  // Hook d'import d'assets
  const {
    importedAssets,
    progress: importProgress,
    selectedCategory: importCategory,
    fileInputRef,
    importStats,
    setSelectedCategory: setImportCategory,
    processFiles,
    processFile,
    confirmImport,
    confirmAllImports,
    removeAsset,
    clearAll,
    openFileSelector,
    handleFileInputChange,
    loadImportStats,
    uploadToStorage,
  } = useAssetImport();
  
  // État des assets depuis ENVATO_ASSET_MAP
  const [assets, setAssets] = useState<AssetStatus[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('light-leak');
  const [targetedAsset, setTargetedAsset] = useState<string | null>(null);
  
  // Refs pour inputs file par asset
  const assetFileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  
  // Charger les stats depuis la DB
  const [dbStats, setDbStats] = useState<Record<string, { uploaded: number; total: number }>>({});

  // Initialiser les assets et charger les stats depuis DB
  useEffect(() => {
    initializeAssets();
    loadDbStats();
  }, []);

  // Écouter les événements d'import pour mettre à jour en temps réel
  useEffect(() => {
    const handleAssetImported = (event: CustomEvent) => {
      const { asset, category } = event.detail;
      
      // Mettre à jour l'asset correspondant comme uploadé
      setAssets(prev => prev.map(a => {
        // Match par nom local approximatif
        if (a.category === category && a.status !== 'uploaded') {
          const targetName = asset.targetName?.toLowerCase() || '';
          const localName = a.mapping.local?.toLowerCase() || '';
          if (targetName.includes(localName.replace(/\.[^.]+$/, '').replace(/-\d+/, '')) ||
              localName.includes(targetName.replace(/\.[^.]+$/, '').replace(/-\d+/, ''))) {
            return { ...a, status: 'uploaded' as const, publicUrl: asset.publicUrl };
          }
        }
        return a;
      }));
      
      // Recharger les stats
      loadDbStats();
    };

    window.addEventListener('asset-imported', handleAssetImported as EventListener);
    return () => {
      window.removeEventListener('asset-imported', handleAssetImported as EventListener);
    };
  }, []);

  /**
   * Charge les stats depuis la base de données
   */
  const loadDbStats = async () => {
    try {
      const { data, error } = await supabase
        .from('asset_imports')
        .select('category, status')
        .in('status', ['uploaded', 'converted']);
      
      if (!error && data) {
        const stats: Record<string, { uploaded: number; total: number }> = {};
        
        // Initialiser avec les totaux de ENVATO_ASSET_MAP
        for (const [cat, mappings] of Object.entries(ENVATO_ASSET_MAP)) {
          stats[cat] = { 
            uploaded: 0, 
            total: mappings.length 
          };
        }
        
        // Compter les uploads par catégorie
        for (const item of data) {
          if (stats[item.category]) {
            stats[item.category].uploaded++;
          }
        }
        
        setDbStats(stats);
      }
    } catch (err) {
      console.error('Error loading DB stats:', err);
    }
  };

  /**
   * Initialise la liste des assets depuis le mapping
   */
  const initializeAssets = () => {
    const allAssets: AssetStatus[] = [];
    
    for (const [category, mappings] of Object.entries(ENVATO_ASSET_MAP)) {
      for (const mapping of mappings) {
        allAssets.push({
          mapping,
          category,
          status: 'pending',
        });
      }
    }
    
    setAssets(allAssets);
  };

  /**
   * Calcule la progression par catégorie
   */
  const getCategoryProgress = useCallback((category: string): CategoryProgress => {
    const categoryAssets = assets.filter(a => a.category === category);
    const completed = categoryAssets.filter(a => a.status === 'uploaded').length;
    const pending = categoryAssets.filter(a => a.status === 'pending').length;
    
    // Use DB stats if available
    const dbCatStats = dbStats[category];
    
    return {
      total: dbCatStats?.total || categoryAssets.length,
      completed: dbCatStats?.uploaded || completed,
      pending: (dbCatStats?.total || categoryAssets.length) - (dbCatStats?.uploaded || completed),
    };
  }, [assets, dbStats]);

  /**
   * Ouvre un asset dans Envato Elements
   */
  const openInEnvato = (asset: AssetStatus) => {
    const url = getEnvatoUrl(asset.mapping.category, asset.mapping.envato, asset.mapping);
    window.open(url, '_blank');
    
    // Marquer comme en cours de téléchargement et ciblé
    setAssets(prev => prev.map(a => 
      a.mapping.id === asset.mapping.id ? { ...a, status: 'downloading' } : a
    ));
    setTargetedAsset(asset.mapping.id);
    
    const specs = asset.mapping.expectedSpecs;
    const specsInfo = specs ? ` (${specs.resolution || '4K'}, ${specs.hasAlpha ? 'avec alpha' : ''})` : '';
    
    toast({
      title: "🔗 Page Envato ouverte",
      description: `Téléchargez "${asset.mapping.envato}"${specsInfo} puis cliquez sur 📥 Upload`,
    });
  };

  /**
   * Handle direct file upload for a specific asset
   */
  const handleAssetFileUpload = async (asset: AssetStatus, file: File) => {
    setTargetedAsset(asset.mapping.id);
    
    // Marquer comme en cours
    setAssets(prev => prev.map(a => 
      a.mapping.id === asset.mapping.id ? { ...a, status: 'converting', progress: 50 } : a
    ));

    // Process the file
    const processedAsset = await processFile(file, asset.category);
    
    if (processedAsset && processedAsset.status === 'ready') {
      // Upload directly
      const result = await uploadToStorage(processedAsset);
      
      if (result.success) {
        setAssets(prev => prev.map(a => 
          a.mapping.id === asset.mapping.id ? { 
            ...a, 
            status: 'uploaded', 
            progress: 100,
            publicUrl: result.publicUrl,
            detectedFile: file.name
          } : a
        ));
        
        // Insert DB record
        const { error } = await supabase
          .from('asset_imports')
          .insert({
            original_name: file.name,
            target_name: processedAsset.targetName,
            category: asset.category,
            storage_path: `${asset.category}/${processedAsset.targetName}`,
            public_url: result.publicUrl,
            file_size: file.size,
            mime_type: file.type,
            status: 'uploaded',
            uploaded_at: new Date().toISOString(),
          });
        
        if (!error) {
          loadDbStats();
        }
        
        toast({
          title: "✅ Asset uploadé!",
          description: `${file.name} → ${asset.mapping.local}`,
        });
      } else {
        setAssets(prev => prev.map(a => 
          a.mapping.id === asset.mapping.id ? { ...a, status: 'error', error: result.error } : a
        ));
        toast({
          title: "❌ Erreur upload",
          description: result.error,
          variant: "destructive",
        });
      }
    } else {
      setAssets(prev => prev.map(a => 
        a.mapping.id === asset.mapping.id ? { ...a, status: 'error', error: processedAsset?.error || 'Validation échouée' } : a
      ));
    }
    
    setTargetedAsset(null);
  };

  /**
   * Trigger file input for a specific asset
   */
  const triggerAssetUpload = (assetId: string) => {
    const input = assetFileInputRefs.current[assetId];
    if (input) {
      input.click();
    }
  };

  /**
   * Rendu de l'icône de statut
   */
  const renderStatusIcon = (status: AssetStatus['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-muted-foreground" />;
      case 'downloading':
        return <Download className="h-4 w-4 text-blue-500 animate-pulse" />;
      case 'converting':
        return <Loader2 className="h-4 w-4 text-orange-500 animate-spin" />;
      case 'uploaded':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
  };

  /**
   * Rendu du badge de statut
   */
  const renderStatusBadge = (status: AssetStatus['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-xs">⏳ Pending</Badge>;
      case 'downloading':
        return <Badge className="bg-blue-500/20 text-blue-400 text-xs">📥 Downloading</Badge>;
      case 'converting':
        return <Badge className="bg-orange-500/20 text-orange-400 text-xs">🔄 Converting</Badge>;
      case 'uploaded':
        return <Badge className="bg-green-500/20 text-green-400 text-xs">✅ Uploaded</Badge>;
      case 'error':
        return <Badge variant="destructive" className="text-xs">❌ Error</Badge>;
    }
  };

  // Calculer les stats globales depuis DB
  const totalAssets = Object.values(dbStats).reduce((sum, s) => sum + s.total, 0) || assets.length;
  const uploadedAssets = Object.values(dbStats).reduce((sum, s) => sum + s.uploaded, 0) || assets.filter(a => a.status === 'uploaded').length;
  const pendingAssets = totalAssets - uploadedAssets;
  const categories = Object.keys(ENVATO_ASSET_MAP);

  return (
    <div className="space-y-6">
      {/* En-tête avec stats temps réel depuis DB */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Envato Browser Helper
          </CardTitle>
          <CardDescription>
            Guide interactif pour télécharger et importer les assets depuis Envato Elements
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold">{totalAssets}</div>
              <div className="text-sm text-muted-foreground">Total</div>
            </div>
            <div className="text-center p-3 bg-green-500/10 rounded-lg">
              <div className="text-2xl font-bold text-green-500">{uploadedAssets}</div>
              <div className="text-sm text-muted-foreground">Importés</div>
            </div>
            <div className="text-center p-3 bg-orange-500/10 rounded-lg">
              <div className="text-2xl font-bold text-orange-500">{pendingAssets}</div>
              <div className="text-sm text-muted-foreground">En attente</div>
            </div>
          </div>
          <Progress value={(uploadedAssets / totalAssets) * 100} className="h-2" />
        </CardContent>
      </Card>

      {/* Instructions */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Comment ça marche ?</AlertTitle>
        <AlertDescription className="mt-2">
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>📍 Cliquez sur <strong>"Open in Envato"</strong> pour un asset</li>
            <li>📍 Téléchargez l'asset depuis Envato (vous êtes connecté)</li>
            <li>📍 Cliquez sur <strong>📥 Upload</strong> à côté de l'asset ou glissez dans la zone ci-dessous</li>
            <li>📍 Confirmez l'import - le fichier sera renommé automatiquement</li>
            <li>✅ Terminé ! L'asset est prêt à utiliser</li>
          </ol>
        </AlertDescription>
      </Alert>

      {/* Zone de drop globale */}
      <AssetDropZone
        onFilesProcessed={processFiles}
        onAutoConfirm={confirmAllImports}
        selectedCategory={selectedCategory}
        fileInputRef={fileInputRef}
        onOpenFileSelector={openFileSelector}
        onFileInputChange={handleFileInputChange}
      />

      {/* Fichiers importés en attente de confirmation */}
      {importedAssets.length > 0 && (
        <Card className="border-green-500/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-green-500" />
                Fichiers à confirmer ({importedAssets.filter(a => a.status === 'ready').length})
              </CardTitle>
              <div className="flex gap-2">
                {importedAssets.filter(a => a.status === 'ready').length > 0 && (
                  <Button size="sm" onClick={confirmAllImports} className="bg-green-600 hover:bg-green-700">
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Confirmer tout ({importedAssets.filter(a => a.status === 'ready').length})
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={clearAll}>
                  <Trash2 className="h-4 w-4 mr-1" />
                  Effacer
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[300px]">
              <div className="space-y-2">
                {importedAssets.map((asset) => (
                  <div 
                    key={asset.id} 
                    className={`p-3 rounded-lg border flex items-center justify-between ${
                      asset.status === 'ready' ? 'bg-green-500/10 border-green-500/50' :
                      asset.status === 'confirmed' ? 'bg-blue-500/10 border-blue-500/50' :
                      asset.status === 'error' ? 'bg-red-500/10 border-red-500/50' :
                      'bg-muted'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {asset.status === 'ready' && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                      {asset.status === 'confirmed' && <Check className="h-5 w-5 text-blue-500" />}
                      {asset.status === 'error' && <AlertCircle className="h-5 w-5 text-red-500" />}
                      {asset.previewUrl && asset.file.type.startsWith('image/') && (
                        <img src={asset.previewUrl} alt="" className="w-10 h-10 rounded object-cover" />
                      )}
                      <div>
                        <div className="font-medium text-sm">{asset.originalName}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <ArrowRight className="h-3 w-3" />
                          <code className="bg-muted px-1 rounded">{asset.targetPath}</code>
                        </div>
                        {asset.error && (
                          <div className="text-xs text-red-500 mt-1">{asset.error}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {ASSET_CATEGORIES[asset.category]?.icon} {asset.category}
                      </Badge>
                      {asset.status === 'ready' && (
                        <Button 
                          size="sm" 
                          onClick={() => confirmImport(asset.id)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Confirmer
                        </Button>
                      )}
                      {asset.status === 'processing' && (
                        <Badge className="bg-orange-500/20 text-orange-400">
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          Upload...
                        </Badge>
                      )}
                      {asset.status === 'confirmed' && (
                        <Badge className="bg-blue-500/20 text-blue-400">✓ Uploadé</Badge>
                      )}
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-8 w-8"
                        onClick={() => removeAsset(asset.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Tabs par catégorie */}
      <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
        <TabsList className="flex flex-wrap h-auto gap-1">
          {categories.map(category => {
            const progress = getCategoryProgress(category);
            const isComplete = progress.completed === progress.total;
            
            return (
              <TabsTrigger 
                key={category} 
                value={category}
                className="flex items-center gap-1.5"
              >
                {CATEGORY_ICONS[category]}
                <span className="hidden md:inline">{CATEGORY_NAMES[category]}</span>
                <Badge 
                  variant={isComplete ? 'default' : 'secondary'} 
                  className="ml-1 text-xs px-1.5"
                >
                  {progress.completed}/{progress.total}
                </Badge>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {categories.map(category => (
          <TabsContent key={category} value={category} className="mt-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    {CATEGORY_ICONS[category]}
                    {CATEGORY_NAMES[category]}
                  </CardTitle>
                  <Badge variant="outline">
                    {getCategoryProgress(category).completed} / {getCategoryProgress(category).total} importés
                  </Badge>
                </div>
                <Progress 
                  value={(getCategoryProgress(category).completed / getCategoryProgress(category).total) * 100} 
                  className="h-2 mt-2"
                />
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {assets.filter(a => a.category === category).map((asset) => (
                      <div 
                        key={asset.mapping.id}
                        className={`p-3 rounded-lg border transition-all ${
                          asset.status === 'uploaded' 
                            ? 'bg-green-500/5 border-green-500/30' 
                            : asset.status === 'downloading' || targetedAsset === asset.mapping.id
                              ? 'bg-blue-500/10 border-blue-500/50 ring-2 ring-blue-500/30'
                              : asset.status === 'converting'
                                ? 'bg-orange-500/5 border-orange-500/30'
                                : 'bg-muted/30 border-border'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <Checkbox checked={asset.status === 'uploaded'} disabled />
                            {renderStatusIcon(asset.status)}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono text-sm truncate">
                                  {asset.mapping.local}
                                </span>
                                {renderStatusBadge(asset.status)}
                                {asset.mapping.expectedSpecs && (
                                  <Badge variant="outline" className="text-xs bg-muted/50">
                                    {asset.mapping.expectedSpecs.resolution || '4K'}
                                    {asset.mapping.expectedSpecs.hasAlpha && ' α'}
                                  </Badge>
                                )}
                                {targetedAsset === asset.mapping.id && (
                                  <Badge className="bg-blue-500 text-white text-xs animate-pulse">
                                    🎯 Ciblé
                                  </Badge>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground truncate flex items-center gap-2">
                                <span>{asset.mapping.envato}</span>
                                {asset.mapping.envatoSearchQuery && (
                                  <span className="text-xs opacity-60">→ recherche exacte</span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {asset.status === 'converting' && (
                              <Progress value={asset.progress} className="w-20 h-2" />
                            )}
                            
                            {/* Hidden file input for this specific asset */}
                            <input
                              type="file"
                              ref={el => assetFileInputRefs.current[asset.mapping.id] = el}
                              className="hidden"
                              accept="video/*,image/*,audio/*,.glb,.gltf,.ttf,.otf,.woff,.woff2"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  handleAssetFileUpload(asset, file);
                                }
                                e.target.value = '';
                              }}
                            />
                            
                            {(asset.status === 'pending' || asset.status === 'downloading') && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => triggerAssetUpload(asset.mapping.id)}
                                  className="bg-green-500/10 hover:bg-green-500/20 border-green-500/30"
                                >
                                  <Upload className="h-4 w-4 mr-1" />
                                  Upload
                                </Button>
                                <Button
                                  size="sm"
                                  variant={asset.status === 'downloading' ? 'outline' : 'default'}
                                  onClick={() => openInEnvato(asset)}
                                >
                                  <ExternalLink className="h-4 w-4 mr-1" />
                                  Open in Envato
                                </Button>
                              </>
                            )}
                            {asset.status === 'uploaded' && (
                              <Badge className="bg-green-500/20 text-green-500">
                                <Check className="h-3 w-3 mr-1" />
                                Importé
                              </Badge>
                            )}
                            {asset.status === 'error' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => triggerAssetUpload(asset.mapping.id)}
                                className="bg-red-500/10 hover:bg-red-500/20"
                              >
                                <RefreshCw className="h-4 w-4 mr-1" />
                                Réessayer
                              </Button>
                            )}
                          </div>
                        </div>
                        
                        {/* Instructions étape par étape pour les assets ciblés */}
                        {(asset.status === 'downloading' || targetedAsset === asset.mapping.id) && asset.status !== 'uploaded' && (
                          <div className="mt-3 pl-8 border-l-2 border-blue-500/30 ml-4">
                            <div className="text-sm space-y-1">
                              <div className="flex items-center gap-2 text-blue-500">
                                <span className="font-medium">📍 Étape 1:</span> 
                                Page Envato ouverte ✓
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">📍 Étape 2:</span> 
                                Téléchargez l'asset depuis Envato
                              </div>
                              <div className="flex items-center gap-2 font-medium text-green-600">
                                <span>📍 Étape 3:</span> 
                                Cliquez sur "Upload" ci-dessus ou glissez le fichier ↑
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Error message display */}
                        {asset.status === 'error' && asset.error && (
                          <div className="mt-2 text-sm text-red-500 bg-red-500/10 p-2 rounded">
                            ❌ {asset.error}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Actions batch */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Actions rapides</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button 
              variant="outline"
              onClick={() => {
                const pendingInCategory = assets.filter(
                  a => a.category === selectedCategory && a.status === 'pending'
                ).slice(0, 5);
                
                pendingInCategory.forEach(asset => openInEnvato(asset));
                
                toast({
                  title: `${pendingInCategory.length} pages ouvertes`,
                  description: "Téléchargez les assets puis utilisez Upload pour chacun",
                });
              }}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Ouvrir les 5 prochains
            </Button>
            
            <Button 
              variant="outline"
              onClick={() => {
                initializeAssets();
                loadDbStats();
              }}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Rafraîchir stats
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EnvatoBrowserHelper;
