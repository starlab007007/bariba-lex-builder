/**
 * AutoDownloadPanel - Panneau de téléchargement automatique des assets
 * Permet le téléchargement en masse avec suivi en temps réel
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Download,
  Play,
  Pause,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Clock,
  Zap,
  FileVideo,
  Sparkles,
  FileImage,
  FileAudio,
  File,
  Loader2,
  ArrowDownToLine,
  Settings2,
} from 'lucide-react';
import { useAssetSync, CategoryStatus } from '@/services/AssetSyncService';
import { toast } from 'sonner';

// ============================================================================
// CATEGORY ICONS
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

// ============================================================================
// COMPONENT
// ============================================================================

export const AutoDownloadPanel: React.FC = () => {
  const { state, scanAssets, downloadMissing, stopDownload } = useAssetSync();
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [isScanning, setIsScanning] = useState(false);

  // Initial scan on mount
  useEffect(() => {
    handleScan();
  }, []);

  const handleScan = async () => {
    setIsScanning(true);
    toast.info('Analyse des assets en cours...');
    
    await scanAssets();
    
    setIsScanning(false);
    toast.success('Analyse terminée');
  };

  const handleSelectAll = () => {
    const allCategories = Object.keys(state.categories);
    const allSelected = allCategories.every(cat => selectedCategories.has(cat));
    
    if (allSelected) {
      setSelectedCategories(new Set());
    } else {
      setSelectedCategories(new Set(allCategories));
    }
  };

  const handleCategoryToggle = (category: string) => {
    const newSelected = new Set(selectedCategories);
    if (newSelected.has(category)) {
      newSelected.delete(category);
    } else {
      newSelected.add(category);
    }
    setSelectedCategories(newSelected);
  };

  const handleDownload = async () => {
    const categories = selectedCategories.size > 0 
      ? Array.from(selectedCategories) 
      : undefined;
    
    toast.info('Démarrage du téléchargement...');
    await downloadMissing(categories);
    toast.success('Téléchargement terminé!');
  };

  const handleStop = () => {
    stopDownload();
    toast.info('Téléchargement arrêté');
  };

  // Calculate stats
  const totalInstalled = Object.values(state.categories).reduce((sum, cat) => sum + cat.installed, 0);
  const totalAssets = Object.values(state.categories).reduce((sum, cat) => sum + cat.total, 0);
  const totalMissing = totalAssets - totalInstalled;
  const overallProgress = totalAssets > 0 ? (totalInstalled / totalAssets) * 100 : 0;

  // Format speed
  const formatSpeed = (bytesPerSec: number): string => {
    if (bytesPerSec < 1024) return `${bytesPerSec} B/s`;
    if (bytesPerSec < 1024 * 1024) return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
    return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
  };

  // Format ETA
  const formatETA = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalInstalled}</p>
              <p className="text-xs text-muted-foreground">Installés</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
              <Download className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalMissing}</p>
              <p className="text-xs text-muted-foreground">Manquants</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Zap className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{overallProgress.toFixed(0)}%</p>
              <p className="text-xs text-muted-foreground">Progression</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center">
              <Clock className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {state.lastSync ? new Date(state.lastSync).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
              </p>
              <p className="text-xs text-muted-foreground">Dernière sync</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Download Progress (when active) */}
      {state.progress.isRunning && (
        <Card className="border-blue-500/50 bg-blue-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
              Téléchargement en cours...
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Fichier actuel:</span>
                <span className="font-mono text-xs">{state.progress.currentFile}</span>
              </div>
              <Progress value={state.progress.categoryProgress} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progression globale:</span>
                <span>{state.progress.downloaded} / {state.progress.totalToDownload}</span>
              </div>
              <Progress value={state.progress.overallProgress} className="h-3" />
            </div>

            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>⚡ {formatSpeed(state.progress.speed)}</span>
              <span>⏱️ ETA: {formatETA(state.progress.eta)}</span>
            </div>

            <Button variant="destructive" onClick={handleStop} className="w-full">
              <Pause className="h-4 w-4 mr-2" />
              Arrêter le téléchargement
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Category Selection */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="h-5 w-5" />
                Sélection des catégories
              </CardTitle>
              <CardDescription>
                Choisissez les catégories à télécharger
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleScan}
                disabled={isScanning}
              >
                {isScanning ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Actualiser
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleSelectAll}
              >
                {selectedCategories.size === Object.keys(state.categories).length ? 'Désélectionner tout' : 'Tout sélectionner'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {Object.entries(state.categories).map(([key, category]) => {
              const isSelected = selectedCategories.has(key);
              const missing = category.total - category.installed;
              const progress = category.total > 0 ? (category.installed / category.total) * 100 : 0;

              return (
                <div
                  key={key}
                  onClick={() => handleCategoryToggle(key)}
                  className={`
                    relative flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all
                    ${isSelected 
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/20' 
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'
                    }
                  `}
                >
                  <Checkbox checked={isSelected} className="pointer-events-none" />
                  
                  <div className="flex items-center gap-2">
                    {CATEGORY_ICONS[key] || <File className="h-4 w-4" />}
                    <span className="font-medium">{category.name}</span>
                  </div>

                  <Badge 
                    variant={missing === 0 ? 'default' : 'secondary'}
                    className={missing === 0 ? 'bg-green-500' : ''}
                  >
                    {category.installed}/{category.total}
                  </Badge>

                  {missing > 0 && (
                    <Badge variant="outline" className="text-orange-500 border-orange-500/50">
                      {missing} manquants
                    </Badge>
                  )}

                  {/* Mini progress bar */}
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted rounded-b-lg overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <Button
          onClick={handleDownload}
          disabled={state.progress.isRunning || totalMissing === 0}
          className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600"
          size="lg"
        >
          {state.progress.isRunning ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Téléchargement...
            </>
          ) : (
            <>
              <ArrowDownToLine className="h-5 w-5 mr-2" />
              Télécharger {selectedCategories.size > 0 
                ? `les catégories sélectionnées` 
                : `tous les assets manquants (${totalMissing})`
              }
            </>
          )}
        </Button>
      </div>

      {/* Recent Downloads / Errors */}
      {state.progress.errors.length > 0 && (
        <Card className="border-red-500/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-500">
              <AlertCircle className="h-5 w-5" />
              Erreurs de téléchargement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-40">
              <div className="space-y-2">
                {state.progress.errors.map((error, index) => (
                  <Alert key={index} variant="destructive">
                    <AlertDescription className="text-sm">
                      <span className="font-mono">{error.file}</span>: {error.error}
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Success Message */}
      {totalMissing === 0 && (
        <Alert className="bg-green-500/10 border-green-500/50">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <AlertDescription className="text-green-600">
            Tous les assets sont installés ! Votre bibliothèque est complète.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default AutoDownloadPanel;
