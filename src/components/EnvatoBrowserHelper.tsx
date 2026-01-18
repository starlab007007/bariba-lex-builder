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
  Wand2
} from 'lucide-react';
import { ENVATO_ASSET_MAP, EnvatoAssetMapping, getEnvatoUrl } from '@/lib/EnvatoDownloader';
import { useToast } from '@/hooks/use-toast';
import { useAssetImport, ImportedAsset } from '@/hooks/useAssetImport';
import { ASSET_CATEGORIES } from '@/lib/AssetConfig';

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

const FORMAT_CONVERSIONS: Record<string, string> = {
  'mov': 'webm',
  'avi': 'webm',
  'mp4': 'webm',
  'tiff': 'png',
  'tif': 'png',
  'bmp': 'png',
  'psd': 'png',
  'wav': 'mp3',
  'aiff': 'mp3',
  'flac': 'mp3',
};

// ============================================================================
// SMART MATCHING UTILITIES
// ============================================================================

/**
 * Normalise un nom de fichier pour le matching
 */
function normalizeFilename(filename: string): string {
  return filename
    .toLowerCase()
    .replace(/[-_\s]+/g, ' ')
    .replace(/\d+/g, '')
    .replace(/\.(mov|mp4|webm|png|jpg|jpeg|mp3|wav|glb|ttf|otf)$/i, '')
    .trim();
}

/**
 * Calcule un score de similarité entre deux chaînes
 */
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

/**
 * Trouve le meilleur match pour un fichier téléchargé
 */
function findBestMatch(
  filename: string, 
  pendingAssets: AssetStatus[]
): { asset: AssetStatus; confidence: number } | null {
  let bestMatch: AssetStatus | null = null;
  let bestScore = 0;

  for (const asset of pendingAssets) {
    const score = similarityScore(filename, asset.mapping.envato);
    if (score > bestScore && score > 0.3) {
      bestScore = score;
      bestMatch = asset;
    }
  }

  return bestMatch ? { asset: bestMatch, confidence: bestScore } : null;
}

/**
 * Détermine la catégorie d'un fichier selon son extension
 */
function detectFileCategory(filename: string): string | null {
  const ext = filename.split('.').pop()?.toLowerCase();
  
  if (['webm', 'mov', 'mp4', 'avi'].includes(ext || '')) {
    // Pourrait être light-leak, particles ou transitions
    if (filename.toLowerCase().includes('leak')) return 'light-leak';
    if (filename.toLowerCase().includes('particle')) return 'particles';
    if (filename.toLowerCase().includes('transition')) return 'transitions';
    return 'light-leak'; // Par défaut pour vidéos
  }
  
  if (['png', 'jpg', 'jpeg'].includes(ext || '')) {
    if (filename.toLowerCase().includes('flare') || filename.toLowerCase().includes('lens')) {
      return 'lens-flare';
    }
    return 'textures';
  }
  
  if (['mp3', 'wav', 'aiff', 'flac'].includes(ext || '')) return 'audio';
  if (['glb', 'gltf', 'obj', 'fbx'].includes(ext || '')) return '3d-models';
  if (['ttf', 'otf', 'woff', 'woff2'].includes(ext || '')) return 'fonts';
  
  return null;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const EnvatoBrowserHelper: React.FC = () => {
  const { toast } = useToast();
  const dropZoneRef = useRef<HTMLDivElement>(null);
  
  // Hook d'import d'assets
  const {
    importedAssets,
    progress: importProgress,
    selectedCategory: importCategory,
    fileInputRef,
    setSelectedCategory: setImportCategory,
    processFiles,
    confirmImport,
    confirmAllImports,
    removeAsset,
    clearAll,
    openFileSelector,
    handleFileInputChange,
  } = useAssetImport();
  
  // État des assets
  const [assets, setAssets] = useState<AssetStatus[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('light-leak');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['light-leak']));
  
  // État des téléchargements détectés
  const [detectedDownloads, setDetectedDownloads] = useState<DetectedDownload[]>([]);
  
  // État du drag & drop
  const [isDragging, setIsDragging] = useState(false);

  // Initialiser les assets au montage
  useEffect(() => {
    initializeAssets();
  }, []);

  /**
   * Initialise la liste des assets depuis le mapping
   */
  const initializeAssets = () => {
    const allAssets: AssetStatus[] = [];
    
    for (const [category, mappings] of Object.entries(ENVATO_ASSET_MAP)) {
      // Limiter à un échantillon représentatif pour l'UI
      const sampleMappings = mappings.slice(0, category === 'lens-flare' ? 20 : 
                                             category === 'textures' ? 30 : mappings.length);
      
      for (const mapping of sampleMappings) {
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
    
    return {
      total: categoryAssets.length,
      completed,
      pending,
    };
  }, [assets]);

  /**
   * Ouvre un asset dans Envato Elements
   */
  const openInEnvato = (asset: AssetStatus) => {
    const url = getEnvatoUrl(asset.mapping.category, asset.mapping.envato);
    window.open(url, '_blank');
    
    // Marquer comme en cours de téléchargement
    setAssets(prev => prev.map(a => 
      a.mapping.id === asset.mapping.id ? { ...a, status: 'downloading' } : a
    ));
    
    toast({
      title: "Page Envato ouverte",
      description: `Téléchargez "${asset.mapping.envato}" puis glissez-le ici.`,
    });
  };

  /**
   * Gère le drag enter
   */
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  /**
   * Gère le drag leave
   */
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === e.target) {
      setIsDragging(false);
    }
  }, []);

  /**
   * Gère le drag over
   */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  /**
   * Gère le drop de fichiers - utilise le nouveau hook d'import
   */
  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    // Utiliser le hook d'import pour traiter les fichiers
    await processFiles(files, selectedCategory);
  }, [processFiles, selectedCategory]);

  /**
   * Traite un fichier déposé
   */
  const processDroppedFile = async (file: File) => {
    const pendingAssets = assets.filter(a => a.status === 'pending' || a.status === 'downloading');
    const match = findBestMatch(file.name, pendingAssets);
    
    if (match && match.confidence > 0.5) {
      // Match trouvé avec bonne confiance
      await importFile(file, match.asset);
    } else {
      // Demander confirmation
      const detectedCategory = detectFileCategory(file.name);
      
      setDetectedDownloads(prev => [...prev, {
        filename: file.name,
        size: file.size,
        timestamp: new Date(),
        suggestedMatch: match ? {
          category: match.asset.category,
          mapping: match.asset.mapping,
          confidence: match.confidence,
        } : undefined,
      }]);

      toast({
        title: "Fichier détecté",
        description: `"${file.name}" - Sélectionnez le slot de destination`,
        variant: "default",
      });
    }
  };

  /**
   * Importe un fichier vers un asset slot (version simplifiée)
   */
  const importFile = async (file: File, asset: AssetStatus) => {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const targetExt = asset.mapping.local.split('.').pop()?.toLowerCase() || '';
    
    // Vérifier si conversion nécessaire
    if (ext !== targetExt && FORMAT_CONVERSIONS[ext] === targetExt) {
      // Simuler une conversion avec progression locale
      setAssets(prev => prev.map(a => 
        a.mapping.id === asset.mapping.id ? { ...a, status: 'converting', progress: 0 } : a
      ));
      
      // Simuler la progression de conversion
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 200));
        setAssets(prev => prev.map(a => 
          a.mapping.id === asset.mapping.id ? { ...a, progress: i } : a
        ));
      }
    }

    // Marquer comme uploadé
    setAssets(prev => prev.map(a => 
      a.mapping.id === asset.mapping.id ? { 
        ...a, 
        status: 'uploaded', 
        progress: 100,
        detectedFile: file.name 
      } : a
    ));

    toast({
      title: "✅ Asset importé",
      description: `"${file.name}" → ${asset.mapping.local}`,
    });
  };

  /**
   * Assigne manuellement un fichier à un slot
   */
  const assignFileToSlot = async (download: DetectedDownload, asset: AssetStatus) => {
    // Simuler un fichier pour l'import
    const mockFileData = { name: download.filename, size: download.size } as File;
    await importFile(mockFileData, asset);
    
    // Retirer de la liste des téléchargements détectés
    setDetectedDownloads(prev => prev.filter(d => d.filename !== download.filename));
  };

  /**
   * Toggle l'expansion d'une catégorie
   */
  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
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

  // Calculer les stats globales
  const totalAssets = assets.length;
  const uploadedAssets = assets.filter(a => a.status === 'uploaded').length;
  const pendingAssets = assets.filter(a => a.status === 'pending').length;
  const categories = Object.keys(ENVATO_ASSET_MAP);

  return (
    <div className="space-y-6">
      {/* En-tête avec stats */}
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
            <li>📍 Glissez-déposez le fichier dans la zone ci-dessous</li>
            <li>📍 Confirmez l'import - le fichier sera renommé automatiquement</li>
            <li>✅ Terminé ! L'asset est prêt à utiliser</li>
          </ol>
        </AlertDescription>
      </Alert>

      {/* Zone de drop principale */}
      <Card 
        ref={dropZoneRef}
        className={`transition-all ${isDragging ? 'border-primary border-2 bg-primary/5' : 'border-dashed'}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <CardContent className="py-12">
          <div className="text-center space-y-4">
            <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center transition-all ${
              isDragging ? 'bg-primary text-primary-foreground scale-110' : 'bg-muted'
            }`}>
              <Upload className="h-8 w-8" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">
                {isDragging ? 'Déposez les fichiers ici !' : 'Glissez-déposez vos fichiers Envato'}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Les fichiers seront automatiquement renommés et placés au bon endroit
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <Badge variant="outline">WebM</Badge>
              <Badge variant="outline">MOV → WebM</Badge>
              <Badge variant="outline">PNG</Badge>
              <Badge variant="outline">MP3</Badge>
              <Badge variant="outline">GLB</Badge>
            </div>
            {/* Bouton d'upload manuel */}
            <div className="pt-2">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".webm,.mp4,.mov,.png,.jpg,.jpeg,.mp3,.wav,.glb,.gltf,.ttf,.otf"
                onChange={handleFileInputChange}
                className="hidden"
              />
              <Button variant="outline" onClick={openFileSelector}>
                <FolderOpen className="h-4 w-4 mr-2" />
                Ou parcourir les fichiers
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

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
                      {asset.status === 'confirmed' && (
                        <Badge className="bg-blue-500/20 text-blue-400">✓ Importé</Badge>
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

      {/* Téléchargements détectés en attente d'assignation */}
      {detectedDownloads.length > 0 && (
        <Card className="border-orange-500/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Wand2 className="h-5 w-5 text-orange-500" />
              Fichiers à assigner ({detectedDownloads.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {detectedDownloads.map((download, idx) => (
              <div key={idx} className="p-3 bg-muted rounded-lg flex items-center justify-between">
                <div>
                  <div className="font-medium">{download.filename}</div>
                  <div className="text-sm text-muted-foreground">
                    {(download.size / 1024 / 1024).toFixed(1)} MB
                    {download.suggestedMatch && (
                      <span className="ml-2 text-orange-500">
                        → Suggestion: {download.suggestedMatch.mapping.local} 
                        ({Math.round(download.suggestedMatch.confidence * 100)}%)
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  {download.suggestedMatch && (
                    <Button 
                      size="sm" 
                      onClick={() => {
                        const asset = assets.find(a => a.mapping.id === download.suggestedMatch?.mapping.id);
                        if (asset) assignFileToSlot(download, asset);
                      }}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Confirmer
                    </Button>
                  )}
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setDetectedDownloads(prev => prev.filter(d => d.filename !== download.filename))}
                  >
                    Ignorer
                  </Button>
                </div>
              </div>
            ))}
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
                    {assets.filter(a => a.category === category).map((asset, idx) => (
                      <div 
                        key={asset.mapping.id}
                        className={`p-3 rounded-lg border transition-all ${
                          asset.status === 'uploaded' 
                            ? 'bg-green-500/5 border-green-500/30' 
                            : asset.status === 'downloading'
                              ? 'bg-blue-500/5 border-blue-500/30'
                              : 'bg-muted/30 border-border'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <Checkbox checked={asset.status === 'uploaded'} disabled />
                            {renderStatusIcon(asset.status)}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-sm truncate">
                                  {asset.mapping.local}
                                </span>
                                {renderStatusBadge(asset.status)}
                              </div>
                              <div className="text-sm text-muted-foreground truncate">
                                {asset.mapping.envato}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {asset.status === 'converting' && (
                              <Progress value={asset.progress} className="w-20 h-2" />
                            )}
                            {(asset.status === 'pending' || asset.status === 'downloading') && (
                              <Button
                                size="sm"
                                variant={asset.status === 'downloading' ? 'outline' : 'default'}
                                onClick={() => openInEnvato(asset)}
                              >
                                <ExternalLink className="h-4 w-4 mr-1" />
                                Open in Envato
                              </Button>
                            )}
                            {asset.status === 'uploaded' && (
                              <Badge className="bg-green-500/20 text-green-500">
                                <Check className="h-3 w-3 mr-1" />
                                Importé
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        {/* Instructions étape par étape pour les assets en attente */}
                        {asset.status === 'downloading' && (
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
                              <div className="flex items-center gap-2">
                                <span className="font-medium">📍 Étape 3:</span> 
                                Glissez-déposez le fichier ici ↑
                              </div>
                            </div>
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
                // Ouvrir tous les assets en attente de la catégorie sélectionnée
                const pendingInCategory = assets.filter(
                  a => a.category === selectedCategory && a.status === 'pending'
                ).slice(0, 5);
                
                pendingInCategory.forEach(asset => openInEnvato(asset));
                
                toast({
                  title: `${pendingInCategory.length} pages ouvertes`,
                  description: "Téléchargez les assets puis glissez-les ici",
                });
              }}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Ouvrir les 5 prochains
            </Button>
            
            <Button 
              variant="outline"
              onClick={initializeAssets}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Réinitialiser
            </Button>
            
            <Button 
              variant="outline"
              onClick={() => {
                // Simuler l'import de tous les assets pour démo
                setAssets(prev => prev.map(a => ({ ...a, status: 'uploaded' })));
                toast({
                  title: "✅ Simulation",
                  description: "Tous les assets marqués comme importés (démo)",
                });
              }}
            >
              <Wand2 className="h-4 w-4 mr-2" />
              Simuler import complet
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EnvatoBrowserHelper;
