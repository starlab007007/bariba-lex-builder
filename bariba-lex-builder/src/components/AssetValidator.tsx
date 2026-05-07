import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Wand2, 
  RefreshCw,
  FileVideo,
  FileImage,
  FileAudio,
  File,
  Box,
  Type,
  Sparkles,
  Download,
  Shield,
  Zap,
  Info,
  Settings,
  Play,
  Loader2,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  Check,
  X
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';

// ============================================================================
// TYPES
// ============================================================================

type ValidationStatus = 'pending' | 'validating' | 'passed' | 'warning' | 'failed';
type AssetType = 'video' | 'image' | 'audio' | '3d-model' | 'font';

interface ValidationCheck {
  name: string;
  passed: boolean;
  message: string;
  severity: 'error' | 'warning' | 'info';
  autoFixable: boolean;
  fixAction?: string;
}

interface AssetValidation {
  id: string;
  filename: string;
  category: string;
  type: AssetType;
  status: ValidationStatus;
  checks: ValidationCheck[];
  metadata: {
    size: number;
    resolution?: { width: number; height: number };
    duration?: number;
    codec?: string;
    hasAlpha?: boolean;
    bitrate?: number;
    polygons?: number;
    format: string;
  };
  optimizations: {
    compress?: boolean;
    convert?: boolean;
    resize?: boolean;
    extractAlpha?: boolean;
  };
  score: number;
}

interface OptimizationOptions {
  compressOversized: boolean;
  convertFormats: boolean;
  standardizeResolutions: boolean;
  extractAlphaChannels: boolean;
}

interface QualityReport {
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  score: number;
  totalAssets: number;
  passed: number;
  warnings: number;
  failed: number;
  recommendations: string[];
  categoryScores: Record<string, number>;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const VALIDATION_CRITERIA = {
  video: {
    minResolution: { width: 1920, height: 1080 },
    maxFileSize: 50 * 1024 * 1024, // 50 MB
    minDuration: 1,
    maxDuration: 30,
    supportedCodecs: ['vp9', 'vp8', 'h264', 'avc1', 'hevc'],
  },
  image: {
    minResolution: { width: 1920, height: 1080 },
    maxFileSize: 10 * 1024 * 1024, // 10 MB
    supportedFormats: ['png', 'jpg', 'jpeg', 'webp'],
  },
  audio: {
    minBitrate: 128,
    maxFileSize: 20 * 1024 * 1024, // 20 MB
    minDuration: 1,
    maxDuration: 300,
  },
  '3d-model': {
    maxPolygons: 50000,
    maxFileSize: 30 * 1024 * 1024, // 30 MB
  },
  font: {
    maxFileSize: 5 * 1024 * 1024, // 5 MB
    requiredGlyphs: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
  },
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'light-leak': <Sparkles className="h-4 w-4" />,
  'particles': <Sparkles className="h-4 w-4" />,
  'lens-flare': <FileImage className="h-4 w-4" />,
  'transitions': <FileVideo className="h-4 w-4" />,
  'textures': <FileImage className="h-4 w-4" />,
  '3d-models': <Box className="h-4 w-4" />,
  'fonts': <Type className="h-4 w-4" />,
  'audio': <FileAudio className="h-4 w-4" />,
};

// ============================================================================
// MOCK DATA FOR DEMO
// ============================================================================

const generateMockAssets = (): AssetValidation[] => {
  const assets: AssetValidation[] = [];
  
  // Light leaks
  for (let i = 1; i <= 5; i++) {
    const hasIssue = i === 2 || i === 4;
    const isCritical = i === 4;
    
    assets.push({
      id: `leak-${i}`,
      filename: `leak-${String(i).padStart(3, '0')}.webm`,
      category: 'light-leak',
      type: 'video',
      status: isCritical ? 'failed' : hasIssue ? 'warning' : 'passed',
      checks: [
        { name: 'Resolution', passed: !isCritical, message: isCritical ? '1280x720 (below 1920x1080)' : '1920x1080', severity: 'error', autoFixable: true, fixAction: 'Upscale' },
        { name: 'Alpha Channel', passed: i !== 2, message: i === 2 ? 'No alpha detected' : 'VP9 Alpha present', severity: 'warning', autoFixable: true, fixAction: 'Extract' },
        { name: 'Codec', passed: true, message: 'VP9', severity: 'info', autoFixable: false },
        { name: 'Duration', passed: true, message: '5.2s', severity: 'info', autoFixable: false },
        { name: 'File Size', passed: true, message: '12.5 MB', severity: 'info', autoFixable: true, fixAction: 'Compress' },
      ],
      metadata: {
        size: 12.5 * 1024 * 1024,
        resolution: { width: isCritical ? 1280 : 1920, height: isCritical ? 720 : 1080 },
        duration: 5.2,
        codec: 'vp9',
        hasAlpha: i !== 2,
        format: 'webm',
      },
      optimizations: {
        resize: isCritical,
        extractAlpha: i === 2,
      },
      score: isCritical ? 45 : hasIssue ? 75 : 100,
    });
  }

  // Lens flares
  for (let i = 1; i <= 8; i++) {
    const hasIssue = i === 3;
    
    assets.push({
      id: `flare-${i}`,
      filename: `flare-${String(i).padStart(3, '0')}.png`,
      category: 'lens-flare',
      type: 'image',
      status: hasIssue ? 'warning' : 'passed',
      checks: [
        { name: 'Resolution', passed: true, message: '2048x2048', severity: 'info', autoFixable: false },
        { name: 'Transparency', passed: true, message: 'Alpha channel present', severity: 'info', autoFixable: false },
        { name: 'Format', passed: true, message: 'PNG-24', severity: 'info', autoFixable: false },
        { name: 'File Size', passed: !hasIssue, message: hasIssue ? '15.2 MB (large)' : '2.3 MB', severity: 'warning', autoFixable: true, fixAction: 'Compress' },
      ],
      metadata: {
        size: hasIssue ? 15.2 * 1024 * 1024 : 2.3 * 1024 * 1024,
        resolution: { width: 2048, height: 2048 },
        hasAlpha: true,
        format: 'png',
      },
      optimizations: {
        compress: hasIssue,
      },
      score: hasIssue ? 85 : 100,
    });
  }

  // Audio
  for (let i = 1; i <= 4; i++) {
    const hasIssue = i === 2;
    
    assets.push({
      id: `audio-${i}`,
      filename: `afrobeat-${String(i).padStart(3, '0')}.mp3`,
      category: 'audio',
      type: 'audio',
      status: hasIssue ? 'warning' : 'passed',
      checks: [
        { name: 'Bitrate', passed: !hasIssue, message: hasIssue ? '96 kbps (low)' : '320 kbps', severity: 'warning', autoFixable: false },
        { name: 'Duration', passed: true, message: '45s', severity: 'info', autoFixable: false },
        { name: 'Channels', passed: true, message: 'Stereo', severity: 'info', autoFixable: false },
        { name: 'Silence Check', passed: true, message: 'No silent sections', severity: 'info', autoFixable: false },
      ],
      metadata: {
        size: 3.5 * 1024 * 1024,
        duration: 45,
        bitrate: hasIssue ? 96 : 320,
        format: 'mp3',
      },
      optimizations: {},
      score: hasIssue ? 80 : 100,
    });
  }

  // 3D Models
  for (let i = 1; i <= 3; i++) {
    const hasIssue = i === 1;
    
    assets.push({
      id: `model-${i}`,
      filename: `model-${String(i).padStart(3, '0')}.glb`,
      category: '3d-models',
      type: '3d-model',
      status: hasIssue ? 'warning' : 'passed',
      checks: [
        { name: 'Format', passed: true, message: 'GLB (Binary glTF)', severity: 'info', autoFixable: false },
        { name: 'Polygons', passed: !hasIssue, message: hasIssue ? '65,000 (high)' : '12,500', severity: 'warning', autoFixable: true, fixAction: 'Decimate' },
        { name: 'Textures', passed: true, message: '3 textures embedded', severity: 'info', autoFixable: false },
        { name: 'Animations', passed: true, message: '2 animations', severity: 'info', autoFixable: false },
      ],
      metadata: {
        size: 8.5 * 1024 * 1024,
        polygons: hasIssue ? 65000 : 12500,
        format: 'glb',
      },
      optimizations: {
        compress: hasIssue,
      },
      score: hasIssue ? 75 : 100,
    });
  }

  return assets;
};

// ============================================================================
// COMPONENT
// ============================================================================

export const AssetValidator: React.FC = () => {
  const { toast } = useToast();
  
  // État principal
  const [assets, setAssets] = useState<AssetValidation[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [validationProgress, setValidationProgress] = useState(0);
  const [optimizationProgress, setOptimizationProgress] = useState(0);
  
  // Options d'optimisation
  const [options, setOptions] = useState<OptimizationOptions>({
    compressOversized: true,
    convertFormats: true,
    standardizeResolutions: true,
    extractAlphaChannels: true,
  });
  
  // Rapport qualité
  const [report, setReport] = useState<QualityReport | null>(null);
  
  // Catégorie sélectionnée
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // Assets expandés
  const [expandedAssets, setExpandedAssets] = useState<Set<string>>(new Set());

  /**
   * Lance la validation des assets
   */
  const runValidation = useCallback(async () => {
    setIsValidating(true);
    setValidationProgress(0);
    
    // Simuler la validation progressive
    const mockAssets = generateMockAssets();
    
    for (let i = 0; i <= 100; i += 5) {
      await new Promise(resolve => setTimeout(resolve, 50));
      setValidationProgress(i);
    }
    
    setAssets(mockAssets);
    generateReport(mockAssets);
    setIsValidating(false);
    
    toast({
      title: "Validation terminée",
      description: `${mockAssets.length} assets analysés`,
    });
  }, [toast]);

  /**
   * Génère le rapport de qualité
   */
  const generateReport = (validatedAssets: AssetValidation[]) => {
    const passed = validatedAssets.filter(a => a.status === 'passed').length;
    const warnings = validatedAssets.filter(a => a.status === 'warning').length;
    const failed = validatedAssets.filter(a => a.status === 'failed').length;
    const total = validatedAssets.length;
    
    const avgScore = validatedAssets.reduce((sum, a) => sum + a.score, 0) / total;
    
    let grade: QualityReport['grade'];
    if (avgScore >= 95) grade = 'A';
    else if (avgScore >= 80) grade = 'B';
    else if (avgScore >= 65) grade = 'C';
    else if (avgScore >= 50) grade = 'D';
    else grade = 'F';

    // Scores par catégorie
    const categories = [...new Set(validatedAssets.map(a => a.category))];
    const categoryScores: Record<string, number> = {};
    
    for (const cat of categories) {
      const catAssets = validatedAssets.filter(a => a.category === cat);
      categoryScores[cat] = catAssets.reduce((sum, a) => sum + a.score, 0) / catAssets.length;
    }

    // Recommandations
    const recommendations: string[] = [];
    if (failed > 0) recommendations.push(`${failed} assets critiques nécessitent une attention immédiate`);
    if (warnings > 0) recommendations.push(`${warnings} assets ont des avertissements mineurs à corriger`);
    
    const lowResAssets = validatedAssets.filter(a => 
      a.checks.some(c => c.name === 'Resolution' && !c.passed)
    );
    if (lowResAssets.length > 0) {
      recommendations.push(`Upscaler ${lowResAssets.length} assets avec résolution insuffisante`);
    }
    
    const noAlphaAssets = validatedAssets.filter(a => 
      a.checks.some(c => c.name === 'Alpha Channel' && !c.passed)
    );
    if (noAlphaAssets.length > 0) {
      recommendations.push(`Extraire les canaux alpha de ${noAlphaAssets.length} light leaks`);
    }
    
    const largeAssets = validatedAssets.filter(a => 
      a.checks.some(c => c.name === 'File Size' && !c.passed)
    );
    if (largeAssets.length > 0) {
      recommendations.push(`Compresser ${largeAssets.length} fichiers volumineux`);
    }

    setReport({
      grade,
      score: Math.round(avgScore),
      totalAssets: total,
      passed,
      warnings,
      failed,
      recommendations,
      categoryScores,
    });
  };

  /**
   * Lance l'optimisation batch
   */
  const runOptimization = async () => {
    setIsOptimizing(true);
    setOptimizationProgress(0);
    
    const assetsToFix = assets.filter(a => 
      a.status === 'warning' || a.status === 'failed'
    );
    
    for (let i = 0; i < assetsToFix.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 300));
      setOptimizationProgress(((i + 1) / assetsToFix.length) * 100);
      
      // Simuler la correction
      setAssets(prev => prev.map(a => 
        a.id === assetsToFix[i].id
          ? { ...a, status: 'passed', score: 100, checks: a.checks.map(c => ({ ...c, passed: true })) }
          : a
      ));
    }
    
    setIsOptimizing(false);
    generateReport(assets.map(a => 
      assetsToFix.some(f => f.id === a.id) 
        ? { ...a, status: 'passed' as ValidationStatus, score: 100 }
        : a
    ));
    
    toast({
      title: "✅ Optimisation terminée",
      description: `${assetsToFix.length} assets corrigés`,
    });
  };

  /**
   * Auto-fix un asset spécifique
   */
  const autoFixAsset = async (assetId: string) => {
    setAssets(prev => prev.map(a => 
      a.id === assetId ? { ...a, status: 'validating' } : a
    ));
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setAssets(prev => prev.map(a => 
      a.id === assetId 
        ? { ...a, status: 'passed', score: 100, checks: a.checks.map(c => ({ ...c, passed: true })) }
        : a
    ));
    
    toast({
      title: "Asset corrigé",
      description: "Les problèmes ont été résolus automatiquement",
    });
  };

  /**
   * Toggle l'expansion d'un asset
   */
  const toggleAssetExpand = (assetId: string) => {
    setExpandedAssets(prev => {
      const next = new Set(prev);
      if (next.has(assetId)) {
        next.delete(assetId);
      } else {
        next.add(assetId);
      }
      return next;
    });
  };

  /**
   * Rendu de l'icône de statut
   */
  const renderStatusIcon = (status: ValidationStatus) => {
    switch (status) {
      case 'pending':
        return <File className="h-4 w-4 text-muted-foreground" />;
      case 'validating':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'passed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  /**
   * Rendu du badge de statut
   */
  const renderStatusBadge = (status: ValidationStatus) => {
    switch (status) {
      case 'passed':
        return <Badge className="bg-green-500/20 text-green-500 border-green-500/30">✅ OK</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">⚠️ Warning</Badge>;
      case 'failed':
        return <Badge className="bg-red-500/20 text-red-500 border-red-500/30">❌ Failed</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  /**
   * Rendu du grade de qualité
   */
  const renderGrade = (grade: QualityReport['grade']) => {
    const colors: Record<string, string> = {
      'A': 'bg-green-500',
      'B': 'bg-blue-500',
      'C': 'bg-yellow-500',
      'D': 'bg-orange-500',
      'F': 'bg-red-500',
    };
    
    return (
      <div className={`w-16 h-16 ${colors[grade]} rounded-xl flex items-center justify-center text-white font-bold text-3xl shadow-lg`}>
        {grade}
      </div>
    );
  };

  // Filtrer les assets par catégorie
  const filteredAssets = selectedCategory === 'all' 
    ? assets 
    : assets.filter(a => a.category === selectedCategory);

  const categories = ['all', ...new Set(assets.map(a => a.category))];

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Asset Validator
          </CardTitle>
          <CardDescription>
            Vérifie la qualité et l'intégrité des assets téléchargés
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button onClick={runValidation} disabled={isValidating}>
              {isValidating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Validation... {Math.round(validationProgress)}%
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Lancer la validation
                </>
              )}
            </Button>
            
            {assets.length > 0 && (
              <>
                <Button 
                  variant="outline" 
                  onClick={runOptimization}
                  disabled={isOptimizing || assets.every(a => a.status === 'passed')}
                >
                  {isOptimizing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Optimisation... {Math.round(optimizationProgress)}%
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4 mr-2" />
                      Auto-fix All Issues
                    </>
                  )}
                </Button>
                
                <Button variant="outline" onClick={runValidation}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Re-valider
                </Button>
              </>
            )}
          </div>
          
          {isValidating && (
            <Progress value={validationProgress} className="mt-4 h-2" />
          )}
        </CardContent>
      </Card>

      {/* Rapport de qualité */}
      {report && (
        <Card className={`border-2 ${
          report.grade === 'A' ? 'border-green-500/50' :
          report.grade === 'B' ? 'border-blue-500/50' :
          report.grade === 'C' ? 'border-yellow-500/50' :
          'border-red-500/50'
        }`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Rapport Qualité
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-6">
              {/* Grade */}
              <div className="text-center">
                {renderGrade(report.grade)}
                <div className="text-sm text-muted-foreground mt-2">
                  Score: {report.score}%
                </div>
              </div>
              
              {/* Stats */}
              <div className="flex-1 grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-green-500/10 rounded-lg">
                  <div className="text-2xl font-bold text-green-500">{report.passed}</div>
                  <div className="text-sm text-muted-foreground">Validés</div>
                </div>
                <div className="text-center p-3 bg-yellow-500/10 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-500">{report.warnings}</div>
                  <div className="text-sm text-muted-foreground">Avertissements</div>
                </div>
                <div className="text-center p-3 bg-red-500/10 rounded-lg">
                  <div className="text-2xl font-bold text-red-500">{report.failed}</div>
                  <div className="text-sm text-muted-foreground">Échecs</div>
                </div>
              </div>
            </div>
            
            {/* Recommandations */}
            {report.recommendations.length > 0 && (
              <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium flex items-center gap-2 mb-2">
                  <Info className="h-4 w-4" />
                  Recommandations
                </h4>
                <ul className="space-y-1">
                  {report.recommendations.map((rec, idx) => (
                    <li key={idx} className="text-sm text-muted-foreground flex items-center gap-2">
                      <ArrowRight className="h-3 w-3" />
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Scores par catégorie */}
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
              {Object.entries(report.categoryScores).map(([cat, score]) => (
                <div key={cat} className="p-2 bg-muted/30 rounded flex items-center gap-2">
                  {CATEGORY_ICONS[cat]}
                  <span className="text-sm capitalize">{cat.replace('-', ' ')}</span>
                  <Badge variant="outline" className="ml-auto">
                    {Math.round(score)}%
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Options d'optimisation */}
      {assets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Settings className="h-5 w-5" />
              Options d'optimisation batch
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="compress" 
                  checked={options.compressOversized}
                  onCheckedChange={(checked) => setOptions(prev => ({ ...prev, compressOversized: !!checked }))}
                />
                <Label htmlFor="compress">Compresser les fichiers volumineux</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="convert" 
                  checked={options.convertFormats}
                  onCheckedChange={(checked) => setOptions(prev => ({ ...prev, convertFormats: !!checked }))}
                />
                <Label htmlFor="convert">Convertir aux formats optimaux</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="resize" 
                  checked={options.standardizeResolutions}
                  onCheckedChange={(checked) => setOptions(prev => ({ ...prev, standardizeResolutions: !!checked }))}
                />
                <Label htmlFor="resize">Standardiser les résolutions</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="alpha" 
                  checked={options.extractAlphaChannels}
                  onCheckedChange={(checked) => setOptions(prev => ({ ...prev, extractAlphaChannels: !!checked }))}
                />
                <Label htmlFor="alpha">Extraire les canaux alpha</Label>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Liste des assets */}
      {assets.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Assets ({filteredAssets.length})</CardTitle>
              <div className="flex gap-2">
                {categories.map(cat => (
                  <Button
                    key={cat}
                    variant={selectedCategory === cat ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory(cat)}
                    className="capitalize"
                  >
                    {cat === 'all' ? 'Tous' : cat.replace('-', ' ')}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead>Fichier</TableHead>
                    <TableHead>Catégorie</TableHead>
                    <TableHead>Détails</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAssets.map(asset => (
                    <React.Fragment key={asset.id}>
                      <TableRow 
                        className={`cursor-pointer hover:bg-muted/50 ${
                          asset.status === 'failed' ? 'bg-red-500/5' :
                          asset.status === 'warning' ? 'bg-yellow-500/5' : ''
                        }`}
                        onClick={() => toggleAssetExpand(asset.id)}
                      >
                        <TableCell>
                          {expandedAssets.has(asset.id) 
                            ? <ChevronDown className="h-4 w-4" />
                            : <ChevronRight className="h-4 w-4" />
                          }
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          <div className="flex items-center gap-2">
                            {renderStatusIcon(asset.status)}
                            {asset.filename}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {CATEGORY_ICONS[asset.category]}
                            <span className="ml-1">{asset.category.replace('-', ' ')}</span>
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {asset.metadata.resolution && 
                            `${asset.metadata.resolution.width}×${asset.metadata.resolution.height}`
                          }
                          {asset.metadata.duration && ` • ${asset.metadata.duration}s`}
                          {` • ${(asset.metadata.size / 1024 / 1024).toFixed(1)} MB`}
                        </TableCell>
                        <TableCell>
                          {renderStatusBadge(asset.status)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={asset.score} className="w-16 h-2" />
                            <span className="text-sm">{asset.score}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {asset.status !== 'passed' && asset.status !== 'validating' && (
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                autoFixAsset(asset.id);
                              }}
                            >
                              <Wand2 className="h-4 w-4 mr-1" />
                              Fix
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                      
                      {/* Détails expandés */}
                      {expandedAssets.has(asset.id) && (
                        <TableRow>
                          <TableCell colSpan={7} className="bg-muted/30">
                            <div className="p-4 space-y-3">
                              <h4 className="font-medium">Vérifications détaillées</h4>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {asset.checks.map((check, idx) => (
                                  <div 
                                    key={idx}
                                    className={`p-3 rounded-lg border ${
                                      check.passed 
                                        ? 'bg-green-500/5 border-green-500/20' 
                                        : check.severity === 'error'
                                          ? 'bg-red-500/5 border-red-500/20'
                                          : 'bg-yellow-500/5 border-yellow-500/20'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2">
                                      {check.passed 
                                        ? <Check className="h-4 w-4 text-green-500" />
                                        : <X className="h-4 w-4 text-red-500" />
                                      }
                                      <span className="font-medium text-sm">{check.name}</span>
                                    </div>
                                    <div className="text-sm text-muted-foreground mt-1">
                                      {check.message}
                                    </div>
                                    {!check.passed && check.autoFixable && (
                                      <Badge variant="outline" className="mt-2 text-xs">
                                        Auto-fix: {check.fixAction}
                                      </Badge>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* État vide */}
      {assets.length === 0 && !isValidating && (
        <Card>
          <CardContent className="py-12 text-center">
            <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg">Aucun asset validé</h3>
            <p className="text-muted-foreground mt-1">
              Cliquez sur "Lancer la validation" pour analyser vos assets
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AssetValidator;
