/**
 * AssetHealthDashboard - Dashboard visuel de santé des assets
 * Affiche l'état de chaque catégorie avec indicateurs et actions
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Download,
  Trash2,
  FileVideo,
  FileImage,
  FileAudio,
  File,
  Sparkles,
  Box,
  Type,
  Loader2,
  ArrowRight,
  FileJson,
  Shield,
} from 'lucide-react';
import { useAssetCleanup, CleanupResult, EXPECTED_FORMATS } from '@/services/AssetCleanupService';
import { useAssetSync } from '@/services/AssetSyncService';
import { toast } from 'sonner';

// ============================================================================
// CATEGORY CONFIG
// ============================================================================

const CATEGORY_CONFIG: Record<string, {
  icon: React.ReactNode;
  displayName: string;
  color: string;
}> = {
  'lens-flare': { icon: <FileImage className="h-5 w-5" />, displayName: 'Lens Flares', color: 'text-yellow-500' },
  'light-leak': { icon: <FileVideo className="h-5 w-5" />, displayName: 'Light Leaks', color: 'text-orange-500' },
  'particles': { icon: <Sparkles className="h-5 w-5" />, displayName: 'Particles', color: 'text-purple-500' },
  'transitions': { icon: <FileVideo className="h-5 w-5" />, displayName: 'Transitions', color: 'text-blue-500' },
  'textures': { icon: <FileImage className="h-5 w-5" />, displayName: 'Textures', color: 'text-green-500' },
  '3d-models': { icon: <Box className="h-5 w-5" />, displayName: '3D Models', color: 'text-pink-500' },
  'fonts': { icon: <Type className="h-5 w-5" />, displayName: 'Fonts', color: 'text-indigo-500' },
  'audio': { icon: <FileAudio className="h-5 w-5" />, displayName: 'Audio', color: 'text-cyan-500' },
};

// ============================================================================
// COMPONENT
// ============================================================================

export const AssetHealthDashboard: React.FC = () => {
  const { progress: cleanupProgress, result: cleanupResult, analyze, fix, exportReport } = useAssetCleanup();
  const { state: syncState, scanAssets } = useAssetSync();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isFixing, setIsFixing] = useState(false);

  // Initial scan
  useEffect(() => {
    handleAnalyze();
  }, []);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    toast.info('Analyse de santé des assets en cours...');
    
    try {
      await Promise.all([analyze(), scanAssets()]);
      toast.success('Analyse terminée');
    } catch (error) {
      toast.error('Erreur lors de l\'analyse');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFix = async () => {
    setIsFixing(true);
    toast.info('Correction des problèmes en cours...');
    
    try {
      await fix();
      toast.success('Corrections appliquées');
    } catch (error) {
      toast.error('Erreur lors de la correction');
    } finally {
      setIsFixing(false);
    }
  };

  const handleExport = () => {
    const report = exportReport();
    const blob = new Blob([report], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `asset-health-report-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Rapport exporté');
  };

  // Calculate overall health score
  const calculateHealthScore = (): { score: number; grade: string; color: string } => {
    if (!cleanupResult) return { score: 0, grade: '?', color: 'text-muted-foreground' };
    
    const totalAssets = Object.values(syncState.categories).reduce((sum, cat) => sum + cat.total, 0);
    const installedAssets = Object.values(syncState.categories).reduce((sum, cat) => sum + cat.installed, 0);
    const issueCount = cleanupResult.totalIssues;
    
    if (totalAssets === 0) return { score: 0, grade: '?', color: 'text-muted-foreground' };
    
    const installRatio = installedAssets / totalAssets;
    const issueRatio = issueCount / totalAssets;
    
    const score = Math.max(0, Math.min(100, (installRatio * 100) - (issueRatio * 20)));
    
    if (score >= 90) return { score, grade: 'A', color: 'text-green-500' };
    if (score >= 80) return { score, grade: 'B', color: 'text-lime-500' };
    if (score >= 70) return { score, grade: 'C', color: 'text-yellow-500' };
    if (score >= 50) return { score, grade: 'D', color: 'text-orange-500' };
    return { score, grade: 'F', color: 'text-red-500' };
  };

  const health = calculateHealthScore();

  const getCategoryHealth = (category: string): 'healthy' | 'warning' | 'error' => {
    const catInfo = syncState.categories[category];
    if (!catInfo) return 'error';
    
    const progress = catInfo.total > 0 ? catInfo.installed / catInfo.total : 0;
    const hasLFS = cleanupResult?.lfsPointers.some(lfs => lfs.category === category);
    const hasMisplaced = cleanupResult?.misplacedFiles.some(f => f.currentCategory === category);
    
    if (progress >= 0.9 && !hasLFS && !hasMisplaced) return 'healthy';
    if (progress >= 0.5 || catInfo.total === 0) return 'warning';
    return 'error';
  };

  return (
    <div className="space-y-6">
      {/* Header with Score */}
      <div className="grid gap-4 md:grid-cols-4">
        {/* Health Score */}
        <Card className="md:col-span-1">
          <CardContent className="p-6 flex flex-col items-center justify-center">
            <div className={`text-6xl font-bold ${health.color}`}>
              {health.grade}
            </div>
            <p className="text-sm text-muted-foreground mt-2">Score de Santé</p>
            <Progress value={health.score} className="mt-3 h-2 w-full" />
            <p className="text-xs text-muted-foreground mt-1">{health.score.toFixed(0)}%</p>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {Object.values(syncState.categories).reduce((sum, cat) => sum + cat.installed, 0)}
              </p>
              <p className="text-xs text-muted-foreground">Assets OK</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-orange-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{cleanupResult?.lfsPointers.length || 0}</p>
              <p className="text-xs text-muted-foreground">LFS Pointers</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
              <XCircle className="h-6 w-6 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{cleanupResult?.totalIssues || 0}</p>
              <p className="text-xs text-muted-foreground">Problèmes</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Health Grid */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                État des Catégories
              </CardTitle>
              <CardDescription>
                Santé de chaque type d'asset
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleAnalyze}
                disabled={isAnalyzing}
              >
                {isAnalyzing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Analyser
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
              >
                <FileJson className="h-4 w-4 mr-2" />
                Exporter
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
              const catInfo = syncState.categories[key];
              const health = getCategoryHealth(key);
              const progress = catInfo && catInfo.total > 0 ? (catInfo.installed / catInfo.total) * 100 : 0;
              const lfsCount = cleanupResult?.lfsPointers.filter(lfs => lfs.category === key).length || 0;
              const misplacedCount = cleanupResult?.misplacedFiles.filter(f => f.currentCategory === key).length || 0;

              return (
                <div
                  key={key}
                  className={`
                    relative p-4 rounded-lg border transition-all
                    ${health === 'healthy' ? 'border-green-500/50 bg-green-500/5' :
                      health === 'warning' ? 'border-orange-500/50 bg-orange-500/5' :
                      'border-red-500/50 bg-red-500/5'}
                  `}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className={`flex items-center gap-2 ${config.color}`}>
                      {config.icon}
                      <span className="font-medium text-sm">{config.displayName}</span>
                    </div>
                    {health === 'healthy' ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : health === 'warning' ? (
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Installés</span>
                      <span>{catInfo?.installed || 0} / {catInfo?.total || 0}</span>
                    </div>
                    <Progress value={progress} className="h-1.5" />
                  </div>

                  {/* Issues badges */}
                  {(lfsCount > 0 || misplacedCount > 0) && (
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {lfsCount > 0 && (
                        <Badge variant="outline" className="text-[10px] text-orange-500 border-orange-500/50">
                          {lfsCount} LFS
                        </Badge>
                      )}
                      {misplacedCount > 0 && (
                        <Badge variant="outline" className="text-[10px] text-red-500 border-red-500/50">
                          {misplacedCount} mal placés
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Problems List */}
      {cleanupResult && cleanupResult.totalIssues > 0 && (
        <Card className="border-orange-500/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-orange-500">
                  <AlertTriangle className="h-5 w-5" />
                  Problèmes Détectés ({cleanupResult.totalIssues})
                </CardTitle>
                <CardDescription>
                  Cliquez sur "Corriger" pour résoudre automatiquement
                </CardDescription>
              </div>
              <Button
                onClick={handleFix}
                disabled={isFixing}
                className="bg-orange-500 hover:bg-orange-600"
              >
                {isFixing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Correction...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Corriger ({cleanupResult.totalIssues})
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <div className="space-y-4">
                {/* LFS Pointers */}
                {cleanupResult.lfsPointers.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm flex items-center gap-2 mb-2">
                      <FileVideo className="h-4 w-4 text-orange-500" />
                      Git LFS Pointers ({cleanupResult.lfsPointers.length})
                    </h4>
                    <div className="space-y-1">
                      {cleanupResult.lfsPointers.slice(0, 5).map((lfs, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 rounded bg-muted/50 text-sm">
                          <code className="text-xs">{lfs.category}/{lfs.file}</code>
                          <Badge variant="outline" className="text-orange-500">
                            {lfs.size} bytes
                          </Badge>
                        </div>
                      ))}
                      {cleanupResult.lfsPointers.length > 5 && (
                        <p className="text-xs text-muted-foreground pl-2">
                          ... et {cleanupResult.lfsPointers.length - 5} autres
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <Separator />

                {/* Misplaced Files */}
                {cleanupResult.misplacedFiles.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm flex items-center gap-2 mb-2">
                      <File className="h-4 w-4 text-red-500" />
                      Fichiers Mal Placés ({cleanupResult.misplacedFiles.length})
                    </h4>
                    <div className="space-y-1">
                      {cleanupResult.misplacedFiles.map((file, idx) => (
                        <div key={idx} className="flex items-center gap-2 p-2 rounded bg-muted/50 text-sm">
                          <code className="text-xs flex-1">{file.file}</code>
                          <Badge variant="outline" className="text-red-500">
                            {file.currentCategory}
                          </Badge>
                          <ArrowRight className="h-3 w-3" />
                          <Badge className="bg-green-500">
                            {file.suggestedCategory}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Wrong Formats */}
                {cleanupResult.wrongFormats.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="font-medium text-sm flex items-center gap-2 mb-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                        Formats Incorrects ({cleanupResult.wrongFormats.length})
                      </h4>
                      <div className="space-y-1">
                        {cleanupResult.wrongFormats.slice(0, 3).map((file, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2 rounded bg-muted/50 text-sm">
                            <code className="text-xs">{file.file}</code>
                            <div className="flex items-center gap-1">
                              <Badge variant="outline" className="text-yellow-500">
                                {file.actualFormat}
                              </Badge>
                              <ArrowRight className="h-3 w-3" />
                              <Badge className="bg-green-500">
                                {file.expectedFormats[0]}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Empty Categories */}
                {cleanupResult.emptyCategories.length > 0 && (
                  <>
                    <Separator />
                    <Alert>
                      <XCircle className="h-4 w-4 text-red-500" />
                      <AlertTitle>Catégories Vides</AlertTitle>
                      <AlertDescription>
                        {cleanupResult.emptyCategories.join(', ')}
                      </AlertDescription>
                    </Alert>
                  </>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* All Clear Message */}
      {cleanupResult && cleanupResult.totalIssues === 0 && (
        <Alert className="bg-green-500/10 border-green-500/50">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <AlertTitle className="text-green-600">Tout est en ordre !</AlertTitle>
          <AlertDescription className="text-green-600">
            Aucun problème détecté dans la bibliothèque d'assets.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default AssetHealthDashboard;
