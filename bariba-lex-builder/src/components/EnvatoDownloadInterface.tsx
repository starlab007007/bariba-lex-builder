import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Download, 
  Play, 
  Pause, 
  X, 
  SkipForward, 
  Check, 
  AlertCircle, 
  Clock, 
  HardDrive,
  Sparkles,
  Video,
  Image,
  Music,
  Type,
  Box,
  Layers,
  RefreshCw,
  FolderOpen,
  ChevronDown,
  Wifi,
  WifiOff,
  Loader2
} from 'lucide-react';
import { 
  EnvatoClient, 
  DownloadManager, 
  DownloadProgress, 
  ENVATO_ASSET_MAP,
  downloadManager
} from '@/lib/EnvatoDownloader';

// ============================================================================
// TYPES
// ============================================================================

interface CategoryInfo {
  id: string;
  name: string;
  icon: React.ReactNode;
  total: number;
  missing: number;
  size: string;
  sizeBytes: number;
  selected: boolean;
}

interface DownloadLogEntry {
  id: string;
  timestamp: Date;
  type: 'success' | 'error' | 'skip' | 'info' | 'retry';
  message: string;
  details?: string;
}

interface ActiveDownload {
  file: string;
  category: string;
  progress: number;
  speed: string;
  eta: string;
  status: 'downloading' | 'complete' | 'failed' | 'paused';
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CATEGORY_CONFIG: Record<string, { icon: React.ReactNode; size: string; sizeBytes: number }> = {
  'light-leak': { icon: <Sparkles className="h-5 w-5" />, size: '~150 MB', sizeBytes: 150 * 1024 * 1024 },
  'particles': { icon: <Sparkles className="h-5 w-5" />, size: '~100 MB', sizeBytes: 100 * 1024 * 1024 },
  'transitions': { icon: <Video className="h-5 w-5" />, size: '~80 MB', sizeBytes: 80 * 1024 * 1024 },
  'textures': { icon: <Layers className="h-5 w-5" />, size: '~500 MB', sizeBytes: 500 * 1024 * 1024 },
  '3d-models': { icon: <Box className="h-5 w-5" />, size: '~50 MB', sizeBytes: 50 * 1024 * 1024 },
  'lens-flare': { icon: <Image className="h-5 w-5" />, size: '~200 MB', sizeBytes: 200 * 1024 * 1024 },
  'fonts': { icon: <Type className="h-5 w-5" />, size: '~5 MB', sizeBytes: 5 * 1024 * 1024 },
  'audio': { icon: <Music className="h-5 w-5" />, size: '~75 MB', sizeBytes: 75 * 1024 * 1024 },
};

// ============================================================================
// COMPONENT
// ============================================================================

export const EnvatoDownloadInterface: React.FC = () => {
  // État de connexion
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  // État des catégories
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [isScanning, setIsScanning] = useState(false);

  // État du téléchargement
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [globalProgress, setGlobalProgress] = useState(0);
  const [activeDownloads, setActiveDownloads] = useState<ActiveDownload[]>([]);
  const [downloadLogs, setDownloadLogs] = useState<DownloadLogEntry[]>([]);
  const [isLogOpen, setIsLogOpen] = useState(false);

  // Options
  const [parallelDownloads, setParallelDownloads] = useState([5]);
  const [autoRetry, setAutoRetry] = useState(true);

  // Post-téléchargement
  const [isComplete, setIsComplete] = useState(false);
  const [totalDownloaded, setTotalDownloaded] = useState(0);
  const [totalErrors, setTotalErrors] = useState(0);

  // Calculer les totaux
  const totalAssets = categories.reduce((sum, cat) => sum + cat.total, 0);
  const missingAssets = categories.reduce((sum, cat) => sum + cat.missing, 0);
  const selectedCategories = categories.filter(c => c.selected);
  const selectedMissing = selectedCategories.reduce((sum, cat) => sum + cat.missing, 0);
  const selectedSize = selectedCategories.reduce((sum, cat) => sum + cat.sizeBytes, 0);
  const estimatedTime = Math.ceil(selectedSize / (2 * 1024 * 1024)); // ~2 MB/s

  // Scanner les assets au montage
  useEffect(() => {
    scanAssets();
  }, []);

  /**
   * Scanne les assets pour détecter les manquants
   */
  const scanAssets = async () => {
    setIsScanning(true);
    
    const categoryList: CategoryInfo[] = [];
    
    for (const [categoryId, mappings] of Object.entries(ENVATO_ASSET_MAP)) {
      const config = CATEGORY_CONFIG[categoryId] || { 
        icon: <HardDrive className="h-5 w-5" />, 
        size: '~50 MB',
        sizeBytes: 50 * 1024 * 1024 
      };
      
      // Simuler la détection des fichiers manquants
      let missing = 0;
      const sampleSize = Math.min(5, mappings.length);
      
      for (let i = 0; i < sampleSize; i++) {
        const mapping = mappings[i];
        const path = categoryId === 'audio'
          ? `/assets/envato/${mapping.local}`
          : `/assets/envato/${categoryId}/${mapping.local}`;
        
        try {
          const response = await fetch(path, { method: 'HEAD' });
          if (!response.ok) {
            missing++;
          } else {
            const contentLength = response.headers.get('content-length');
            if (contentLength && parseInt(contentLength) < 200) {
              missing++;
            }
          }
        } catch {
          missing++;
        }
      }
      
      // Extrapoler le nombre de manquants
      const missingRatio = missing / sampleSize;
      const estimatedMissing = Math.round(mappings.length * missingRatio);
      
      categoryList.push({
        id: categoryId,
        name: categoryId.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        icon: config.icon,
        total: mappings.length,
        missing: estimatedMissing,
        size: config.size,
        sizeBytes: config.sizeBytes,
        selected: estimatedMissing > 0,
      });
    }
    
    setCategories(categoryList);
    setIsScanning(false);
  };

  /**
   * Toggle la sélection d'une catégorie
   */
  const toggleCategory = (categoryId: string) => {
    setCategories(prev => prev.map(cat => 
      cat.id === categoryId ? { ...cat, selected: !cat.selected } : cat
    ));
  };

  /**
   * Sélectionne toutes les catégories
   */
  const selectAll = () => {
    setCategories(prev => prev.map(cat => ({ ...cat, selected: true })));
  };

  /**
   * Désélectionne toutes les catégories
   */
  const deselectAll = () => {
    setCategories(prev => prev.map(cat => ({ ...cat, selected: false })));
  };

  /**
   * Ajoute une entrée au log
   */
  const addLog = useCallback((type: DownloadLogEntry['type'], message: string, details?: string) => {
    setDownloadLogs(prev => [{
      id: `log_${Date.now()}_${Math.random()}`,
      timestamp: new Date(),
      type,
      message,
      details,
    }, ...prev].slice(0, 500)); // Garder max 500 entrées
  }, []);

  /**
   * Démarre le téléchargement
   */
  const startDownload = async (mode: 'selected' | 'all' | 'missing') => {
    setIsDownloading(true);
    setIsPaused(false);
    setIsComplete(false);
    setGlobalProgress(0);
    setTotalDownloaded(0);
    setTotalErrors(0);
    setActiveDownloads([]);
    
    addLog('info', `Starting download in ${mode} mode...`);
    
    const categoriesToDownload = mode === 'all' 
      ? categories 
      : mode === 'missing'
        ? categories.filter(c => c.missing > 0)
        : selectedCategories;
    
    const totalToDownload = categoriesToDownload.reduce((sum, c) => sum + c.missing, 0);
    let downloaded = 0;
    let errors = 0;

    for (const category of categoriesToDownload) {
      if (category.missing === 0) continue;
      
      addLog('info', `Processing ${category.name}...`, `${category.missing} files to download`);
      
      // Simuler le téléchargement
      for (let i = 0; i < category.missing; i++) {
        if (isPaused) {
          await new Promise<void>(resolve => {
            const checkPause = setInterval(() => {
              if (!isPaused) {
                clearInterval(checkPause);
                resolve();
              }
            }, 100);
          });
        }
        
        const fileName = `${category.id}-${String(i + 1).padStart(3, '0')}`;
        const fileSize = Math.round(category.sizeBytes / category.missing / 1024);
        
        setActiveDownloads([{
          file: fileName,
          category: category.name,
          progress: 0,
          speed: '2.5 MB/s',
          eta: '3s',
          status: 'downloading',
        }]);
        
        // Simuler la progression
        for (let p = 0; p <= 100; p += 20) {
          await new Promise(resolve => setTimeout(resolve, 50));
          setActiveDownloads(prev => prev.map(d => 
            d.file === fileName ? { ...d, progress: p } : d
          ));
        }
        
        // Simuler succès/échec (95% succès)
        const success = Math.random() > 0.05;
        
        if (success) {
          addLog('success', `${fileName} downloaded`, `${fileSize} KB`);
          downloaded++;
        } else {
          if (autoRetry) {
            addLog('retry', `${fileName} failed, retrying...`, 'network error');
            // Retry simulé
            await new Promise(resolve => setTimeout(resolve, 200));
            addLog('success', `${fileName} downloaded (retry)`, `${fileSize} KB`);
            downloaded++;
          } else {
            addLog('error', `${fileName} failed`, 'network error');
            errors++;
          }
        }
        
        setGlobalProgress(Math.round((downloaded + errors) / totalToDownload * 100));
        setTotalDownloaded(downloaded);
        setTotalErrors(errors);
      }
    }
    
    setActiveDownloads([]);
    setIsDownloading(false);
    setIsComplete(true);
    addLog('info', `Download complete! ${downloaded} files downloaded, ${errors} errors`);
  };

  /**
   * Pause/Resume le téléchargement
   */
  const togglePause = () => {
    setIsPaused(prev => !prev);
    addLog('info', isPaused ? 'Download resumed' : 'Download paused');
  };

  /**
   * Annule le téléchargement
   */
  const cancelDownload = () => {
    if (window.confirm('Are you sure you want to cancel the download?')) {
      setIsDownloading(false);
      setIsPaused(false);
      setActiveDownloads([]);
      addLog('info', 'Download cancelled by user');
    }
  };

  /**
   * Formate la taille en bytes vers une chaîne lisible
   */
  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  /**
   * Formate le temps en secondes vers une chaîne lisible
   */
  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  /**
   * Icône de statut pour les logs
   */
  const getLogIcon = (type: DownloadLogEntry['type']) => {
    switch (type) {
      case 'success': return <Check className="h-4 w-4 text-green-500" />;
      case 'error': return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'skip': return <SkipForward className="h-4 w-4 text-yellow-500" />;
      case 'retry': return <RefreshCw className="h-4 w-4 text-orange-500" />;
      default: return <Clock className="h-4 w-4 text-blue-500" />;
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="space-y-6">
      {/* Vue d'ensemble */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Asset Download Manager
              </CardTitle>
              <CardDescription>
                Download missing assets from Envato Elements
              </CardDescription>
            </div>
            <Badge variant={isConnected ? 'default' : 'secondary'} className="gap-1">
              {isConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              {isConnected ? 'Connected' : 'Not Connected'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-primary">{missingAssets}</div>
              <div className="text-sm text-muted-foreground">
                Missing of {totalAssets} total
              </div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold">{formatSize(selectedSize)}</div>
              <div className="text-sm text-muted-foreground">
                Estimated size
              </div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold">~{formatTime(estimatedTime)}</div>
              <div className="text-sm text-muted-foreground">
                Estimated time
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sélection des catégories */}
      {!isDownloading && !isComplete && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Select Categories</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={selectAll}>
                  Select All
                </Button>
                <Button variant="outline" size="sm" onClick={deselectAll}>
                  Deselect All
                </Button>
                <Button variant="outline" size="sm" onClick={scanAssets} disabled={isScanning}>
                  {isScanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Re-scan
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {categories.map(category => (
                <Card 
                  key={category.id} 
                  className={`cursor-pointer transition-all ${
                    category.selected ? 'ring-2 ring-primary' : ''
                  } ${category.missing === 0 ? 'opacity-50' : ''}`}
                  onClick={() => toggleCategory(category.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Checkbox 
                          checked={category.selected}
                          disabled={category.missing === 0}
                        />
                        {category.icon}
                      </div>
                      <Badge 
                        variant={category.missing === 0 ? 'secondary' : category.missing === category.total ? 'destructive' : 'default'}
                      >
                        {category.missing} / {category.total}
                      </Badge>
                    </div>
                    <div className="font-medium">{category.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {category.size}
                    </div>
                    <Progress 
                      value={((category.total - category.missing) / category.total) * 100} 
                      className="mt-2 h-1"
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Options de téléchargement */}
      {!isDownloading && !isComplete && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Download Options</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Parallel Downloads</Label>
                <div className="text-sm text-muted-foreground">
                  {parallelDownloads[0]} simultaneous downloads
                </div>
              </div>
              <Slider
                value={parallelDownloads}
                onValueChange={setParallelDownloads}
                min={1}
                max={10}
                step={1}
                className="w-32"
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto-retry on failure</Label>
                <div className="text-sm text-muted-foreground">
                  Automatically retry failed downloads
                </div>
              </div>
              <Switch checked={autoRetry} onCheckedChange={setAutoRetry} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Contrôles de téléchargement */}
      {!isDownloading && !isComplete && (
        <div className="flex flex-wrap gap-3">
          <Button 
            size="lg" 
            className="flex-1 min-w-[200px]"
            disabled={selectedMissing === 0}
            onClick={() => startDownload('selected')}
          >
            <Download className="mr-2 h-5 w-5" />
            Download Selected ({selectedMissing} files)
          </Button>
          <Button 
            variant="outline" 
            size="lg"
            onClick={() => startDownload('all')}
          >
            Download All
          </Button>
          <Button 
            variant="secondary" 
            size="lg"
            disabled={missingAssets === 0}
            onClick={() => startDownload('missing')}
          >
            Download Missing Only
          </Button>
        </div>
      )}

      {/* Progression en temps réel */}
      {isDownloading && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                {isPaused ? <Pause className="h-5 w-5" /> : <Loader2 className="h-5 w-5 animate-spin" />}
                {isPaused ? 'Paused' : 'Downloading...'}
              </CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={togglePause}>
                  {isPaused ? <Play className="h-4 w-4 mr-1" /> : <Pause className="h-4 w-4 mr-1" />}
                  {isPaused ? 'Resume' : 'Pause'}
                </Button>
                <Button variant="outline" size="sm" onClick={cancelDownload}>
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Progression globale */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Overall Progress</span>
                <span>{globalProgress}%</span>
              </div>
              <Progress value={globalProgress} className="h-3" />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{totalDownloaded} downloaded, {totalErrors} errors</span>
                <span>~{formatTime(Math.ceil((100 - globalProgress) * estimatedTime / 100))} remaining</span>
              </div>
            </div>

            {/* Téléchargements actifs */}
            {activeDownloads.map(download => (
              <div key={download.file} className="p-3 bg-muted rounded-lg space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span className="font-medium">{download.file}</span>
                    <Badge variant="outline">{download.category}</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {download.speed} • {download.eta}
                  </div>
                </div>
                <Progress value={download.progress} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Post-téléchargement */}
      {isComplete && (
        <Card className="border-green-500">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-green-600">
              <Check className="h-5 w-5" />
              Download Complete!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{totalDownloaded}</div>
                <div className="text-sm text-muted-foreground">Files Downloaded</div>
              </div>
              <div className="text-center p-4 bg-red-50 dark:bg-red-950 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{totalErrors}</div>
                <div className="text-sm text-muted-foreground">Errors</div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button onClick={() => window.location.reload()} className="flex-1">
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh App
              </Button>
              <Button variant="outline" onClick={() => setIsComplete(false)}>
                <FolderOpen className="mr-2 h-4 w-4" />
                View Assets
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Log détaillé */}
      <Collapsible open={isLogOpen} onOpenChange={setIsLogOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="w-full justify-between">
            <span className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Download Log ({downloadLogs.length} entries)
            </span>
            <ChevronDown className={`h-4 w-4 transition-transform ${isLogOpen ? 'rotate-180' : ''}`} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Card className="mt-2">
            <CardContent className="p-0">
              <ScrollArea className="h-64">
                <div className="p-4 space-y-2">
                  {downloadLogs.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      No download activity yet
                    </div>
                  ) : (
                    downloadLogs.map(log => (
                      <div 
                        key={log.id} 
                        className="flex items-start gap-2 text-sm p-2 rounded hover:bg-muted"
                      >
                        {getLogIcon(log.type)}
                        <span className="text-muted-foreground">
                          {log.timestamp.toLocaleTimeString()}
                        </span>
                        <span className="flex-1">{log.message}</span>
                        {log.details && (
                          <span className="text-muted-foreground">({log.details})</span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

export default EnvatoDownloadInterface;
