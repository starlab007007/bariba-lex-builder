/**
 * AssetCleanupPanel - Panneau de nettoyage et réorganisation des assets
 * Interface pour exécuter le service de nettoyage
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Trash2,
  FolderSync,
  FileWarning,
  AlertTriangle,
  CheckCircle,
  Loader2,
  ArrowRight,
  Download,
  FileJson,
  Settings2,
  Play,
  Eye,
} from 'lucide-react';
import { useAssetCleanup, CleanupResult, EXPECTED_FORMATS, MIN_FILE_SIZES } from '@/services/AssetCleanupService';
import { toast } from 'sonner';

// ============================================================================
// COMPONENT
// ============================================================================

export const AssetCleanupPanel: React.FC = () => {
  const { progress, result, analyze, fix, exportReport } = useAssetCleanup();
  const [selectedActions, setSelectedActions] = useState({
    fixMisplaced: true,
    downloadLFS: true,
    convertFormats: false,
  });
  const [showPreview, setShowPreview] = useState(false);

  const handleAnalyze = async () => {
    toast.info('Analyse en cours...');
    try {
      const analysisResult = await analyze();
      toast.success(`Analyse terminée: ${analysisResult.totalIssues} problèmes détectés`);
    } catch (error) {
      toast.error('Erreur lors de l\'analyse');
    }
  };

  const handleFix = async () => {
    toast.info('Correction en cours...');
    try {
      const fixResult = await fix();
      toast.success(`${fixResult.fixedIssues} problèmes corrigés`);
    } catch (error) {
      toast.error('Erreur lors de la correction');
    }
  };

  const handleExport = () => {
    const report = exportReport();
    const blob = new Blob([report], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cleanup-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Rapport exporté');
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FolderSync className="h-5 w-5" />
                Nettoyage et Réorganisation
              </CardTitle>
              <CardDescription>
                Détecte et corrige les fichiers mal placés, LFS pointers, et formats incorrects
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleAnalyze}
                disabled={progress.isRunning}
              >
                {progress.isRunning && progress.phase === 'scanning' ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Eye className="h-4 w-4 mr-2" />
                )}
                Analyser
              </Button>
              <Button
                onClick={handleFix}
                disabled={progress.isRunning || !result || result.totalIssues === 0}
                className="bg-orange-500 hover:bg-orange-600"
              >
                {progress.isRunning && progress.phase === 'fixing' ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                Corriger
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* Progress */}
        {progress.isRunning && (
          <CardContent className="border-t">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{progress.message}</span>
                <span>{progress.progress.toFixed(0)}%</span>
              </div>
              <Progress value={progress.progress} className="h-2" />
              {progress.currentCategory && (
                <p className="text-xs text-muted-foreground">
                  Catégorie: {progress.currentCategory}
                </p>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Configuration des formats attendus */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Settings2 className="h-4 w-4" />
            Formats Attendus par Catégorie
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {Object.entries(EXPECTED_FORMATS).map(([category, formats]) => (
              <div key={category} className="p-3 rounded-lg border bg-muted/30">
                <p className="font-medium text-sm capitalize mb-1">
                  {category.replace('-', ' ')}
                </p>
                <div className="flex flex-wrap gap-1">
                  {formats.map((format) => (
                    <Badge key={format} variant="secondary" className="text-xs">
                      {format}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Min: {(MIN_FILE_SIZES[category] / 1000).toFixed(0)} KB
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Options de correction */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Options de Correction</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="fixMisplaced"
                checked={selectedActions.fixMisplaced}
                onCheckedChange={(checked) => 
                  setSelectedActions(prev => ({ ...prev, fixMisplaced: checked === true }))
                }
              />
              <Label htmlFor="fixMisplaced" className="flex items-center gap-2">
                <FolderSync className="h-4 w-4 text-blue-500" />
                Réorganiser les fichiers mal placés
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="downloadLFS"
                checked={selectedActions.downloadLFS}
                onCheckedChange={(checked) => 
                  setSelectedActions(prev => ({ ...prev, downloadLFS: checked === true }))
                }
              />
              <Label htmlFor="downloadLFS" className="flex items-center gap-2">
                <Download className="h-4 w-4 text-orange-500" />
                Marquer les LFS pointers pour téléchargement
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="convertFormats"
                checked={selectedActions.convertFormats}
                onCheckedChange={(checked) => 
                  setSelectedActions(prev => ({ ...prev, convertFormats: checked === true }))
                }
              />
              <Label htmlFor="convertFormats" className="flex items-center gap-2">
                <FileWarning className="h-4 w-4 text-yellow-500" />
                Convertir les formats non supportés (expérimental)
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Résultats */}
      {result && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">
                Résultats de l'Analyse
              </CardTitle>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <FileJson className="h-4 w-4 mr-2" />
                Exporter JSON
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
                <p className="text-2xl font-bold text-blue-500">{result.misplacedFiles.length}</p>
                <p className="text-xs text-muted-foreground">Fichiers mal placés</p>
              </div>
              <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/30">
                <p className="text-2xl font-bold text-orange-500">{result.lfsPointers.length}</p>
                <p className="text-xs text-muted-foreground">LFS Pointers</p>
              </div>
              <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                <p className="text-2xl font-bold text-yellow-500">{result.wrongFormats.length}</p>
                <p className="text-xs text-muted-foreground">Formats incorrects</p>
              </div>
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                <p className="text-2xl font-bold text-red-500">{result.emptyCategories.length}</p>
                <p className="text-xs text-muted-foreground">Catégories vides</p>
              </div>
            </div>

            {/* Details */}
            <ScrollArea className="h-[300px]">
              <div className="space-y-4">
                {/* Misplaced Files */}
                {result.misplacedFiles.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                      <FolderSync className="h-4 w-4 text-blue-500" />
                      Fichiers à Déplacer
                    </h4>
                    {result.misplacedFiles.map((file, idx) => (
                      <div 
                        key={idx} 
                        className="flex items-center gap-2 p-2 rounded bg-muted/50 text-sm mb-1"
                      >
                        <code className="text-xs flex-1 truncate">{file.file}</code>
                        <Badge variant="outline" className="text-red-500 shrink-0">
                          {file.currentCategory}
                        </Badge>
                        <ArrowRight className="h-3 w-3 shrink-0" />
                        <Badge className="bg-green-500 shrink-0">
                          {file.suggestedCategory}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}

                {/* LFS Pointers */}
                {result.lfsPointers.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                      Git LFS Pointers (non-binaires)
                    </h4>
                    {result.lfsPointers.slice(0, 10).map((lfs, idx) => (
                      <div 
                        key={idx} 
                        className="flex items-center justify-between p-2 rounded bg-muted/50 text-sm mb-1"
                      >
                        <code className="text-xs">{lfs.category}/{lfs.file}</code>
                        <Badge variant="outline">{lfs.size} B</Badge>
                      </div>
                    ))}
                    {result.lfsPointers.length > 10 && (
                      <p className="text-xs text-muted-foreground">
                        ... et {result.lfsPointers.length - 10} autres
                      </p>
                    )}
                  </div>
                )}

                {/* Empty Categories */}
                {result.emptyCategories.length > 0 && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Catégories Vides</AlertTitle>
                    <AlertDescription>
                      Les catégories suivantes ne contiennent aucun fichier valide:{' '}
                      <strong>{result.emptyCategories.join(', ')}</strong>
                    </AlertDescription>
                  </Alert>
                )}

                {/* All Clear */}
                {result.totalIssues === 0 && (
                  <Alert className="bg-green-500/10 border-green-500/50">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <AlertTitle className="text-green-600">Aucun problème détecté</AlertTitle>
                    <AlertDescription className="text-green-600">
                      Tous les fichiers sont correctement organisés et au bon format.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AssetCleanupPanel;
