/**
 * TAM-TAM Asset Completion Summary
 * Displays final validation status for all asset categories
 * Shows cross-folder recoveries and missing assets
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle2, 
  AlertCircle, 
  Info, 
  ExternalLink,
  Sparkles,
  FileVideo,
  FileImage,
  FileAudio,
  File,
  ArrowRight,
  FolderSync,
  Download
} from 'lucide-react';
import { getAssetStats, ASSET_INVENTORY } from '@/lib/AssetRealMapping';

// ============================================================================
// TYPES
// ============================================================================

interface CategorySummary {
  name: string;
  icon: React.ReactNode;
  available: number;
  expected: number;
  rate: number;
  crossFolder?: number;
  status: 'complete' | 'partial' | 'empty';
  envatoSearchUrl?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'lens-flare': <FileImage className="h-4 w-4" />,
  'audio': <FileAudio className="h-4 w-4" />,
  'light-leak': <FileVideo className="h-4 w-4" />,
  'particles': <Sparkles className="h-4 w-4" />,
  'transitions': <FileVideo className="h-4 w-4" />,
  'textures': <FileImage className="h-4 w-4" />,
  '3d-models': <File className="h-4 w-4" />,
  'fonts': <File className="h-4 w-4" />,
};

const CATEGORY_NAMES: Record<string, string> = {
  'lens-flare': 'Lens Flares',
  'audio': 'Audio / Music',
  'light-leak': 'Light Leaks',
  'particles': 'Particles',
  'transitions': 'Transitions',
  'textures': 'Textures',
  '3d-models': '3D Models',
  'fonts': 'Fonts',
};

const ENVATO_SEARCH_URLS: Record<string, string> = {
  'light-leak': 'https://elements.envato.com/video-templates/compatible-with-after-effects/light+leak+alpha+channel',
  '3d-models': 'https://elements.envato.com/3d/african+model+glb',
  'audio': 'https://elements.envato.com/music/afrobeat',
  'fonts': 'https://fonts.google.com/?category=Display,Handwriting',
};

// ============================================================================
// COMPONENT
// ============================================================================

export const AssetCompletionSummary: React.FC = () => {
  const stats = getAssetStats();
  
  // Build category summaries
  const categories: CategorySummary[] = Object.entries(ASSET_INVENTORY).map(([key, inventory]) => {
    const catStats = stats.byCategory[key];
    return {
      name: CATEGORY_NAMES[key] || key,
      icon: CATEGORY_ICONS[key] || <File className="h-4 w-4" />,
      available: catStats?.available || 0,
      expected: catStats?.expected || 0,
      rate: catStats?.rate || 0,
      crossFolder: catStats?.crossFolder,
      status: inventory.status,
      envatoSearchUrl: ENVATO_SEARCH_URLS[key],
    };
  });

  // Sort by completion rate (lowest first to highlight missing)
  const sortedCategories = [...categories].sort((a, b) => a.rate - b.rate);

  // Calculate overall stats
  const totalComplete = categories.filter(c => c.rate >= 100).length;
  const totalPartial = categories.filter(c => c.rate > 0 && c.rate < 100).length;
  const totalEmpty = categories.filter(c => c.rate === 0).length;
  const totalCrossFolder = categories.reduce((sum, c) => sum + (c.crossFolder || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header with global stats */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            Résumé de Complétion des Assets
          </CardTitle>
          <CardDescription>
            Validation finale de la bibliothèque d'assets TAM-TAM
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-3xl font-bold">{stats.totalAvailable}</div>
              <div className="text-sm text-muted-foreground">Assets disponibles</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-3xl font-bold">{stats.totalExpected}</div>
              <div className="text-sm text-muted-foreground">Total attendu</div>
            </div>
            <div className="text-center p-4 bg-primary/10 rounded-lg">
              <div className="text-3xl font-bold text-primary">{stats.completionRate}%</div>
              <div className="text-sm text-muted-foreground">Taux global</div>
            </div>
            <div className="text-center p-4 bg-blue-500/10 rounded-lg">
              <div className="text-3xl font-bold text-blue-500">{totalCrossFolder}</div>
              <div className="text-sm text-muted-foreground">Récupérés (cross-folder)</div>
            </div>
          </div>
          
          <Progress value={stats.completionRate} className="h-3" />
          
          <div className="flex justify-center gap-6 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span>{totalComplete} catégories complètes</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-500" />
              <span>{totalPartial} partielles</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span>{totalEmpty} vides</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cross-folder recovery highlight */}
      {totalCrossFolder > 0 && (
        <Alert className="border-blue-500/50 bg-blue-500/5">
          <FolderSync className="h-4 w-4 text-blue-500" />
          <AlertTitle className="text-blue-500">Récupération Cross-Folder Active</AlertTitle>
          <AlertDescription>
            <strong>{totalCrossFolder} assets</strong> ont été récupérés depuis d'autres dossiers grâce au système de mapping intelligent.
            Les Light Leaks 018-039 sont automatiquement chargés depuis le dossier 3d-models.
          </AlertDescription>
        </Alert>
      )}

      {/* Category breakdown */}
      <div className="grid gap-3">
        {sortedCategories.map((category) => (
          <Card 
            key={category.name}
            className={`transition-all ${
              category.rate >= 100 
                ? 'border-green-500/30 bg-green-500/5' 
                : category.rate > 0 
                  ? 'border-orange-500/30 bg-orange-500/5'
                  : 'border-red-500/30 bg-red-500/5'
            }`}
          >
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    category.rate >= 100 
                      ? 'bg-green-500/20 text-green-500' 
                      : category.rate > 0 
                        ? 'bg-orange-500/20 text-orange-500'
                        : 'bg-red-500/20 text-red-500'
                  }`}>
                    {category.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{category.name}</span>
                      {category.rate >= 100 && (
                        <Badge className="bg-green-500/20 text-green-500 text-xs">✓ Complet</Badge>
                      )}
                      {category.crossFolder && category.crossFolder > 0 && (
                        <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-500 border-blue-500/30">
                          +{category.crossFolder} récupérés
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {category.available}/{category.expected} assets
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="w-32">
                    <Progress value={category.rate} className="h-2" />
                  </div>
                  <div className={`text-xl font-bold min-w-[4ch] text-right ${
                    category.rate >= 100 
                      ? 'text-green-500' 
                      : category.rate > 0 
                        ? 'text-orange-500'
                        : 'text-red-500'
                  }`}>
                    {category.rate}%
                  </div>
                  
                  {category.rate < 100 && category.envatoSearchUrl && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(category.envatoSearchUrl, '_blank')}
                      className="text-xs"
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Envato
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Missing assets details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-500" />
            Assets à télécharger
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Light Leak - Only 1 missing */}
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileVideo className="h-4 w-4" />
                <span className="font-medium">Light Leaks</span>
                <Badge variant="outline" className="text-xs">1 manquant</Badge>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.open(ENVATO_SEARCH_URLS['light-leak'], '_blank')}
              >
                <Download className="h-3 w-3 mr-1" />
                leak-040.webm
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              39/40 disponibles grâce à la récupération cross-folder. Seul <code className="bg-muted px-1 rounded">leak-040.webm</code> reste à télécharger.
            </p>
          </div>

          {/* 3D Models - All missing */}
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <File className="h-4 w-4" />
                <span className="font-medium">3D Models</span>
                <Badge variant="destructive" className="text-xs">22 manquants</Badge>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.open(ENVATO_SEARCH_URLS['3d-models'], '_blank')}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Rechercher GLB
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Les fichiers actuels (<code className="bg-muted px-1 rounded">leak-XXX.webm</code>) ont été redirigés vers Light Leaks.
              Téléchargez de vrais modèles 3D au format GLB/GLTF.
            </p>
            <div className="mt-2 flex flex-wrap gap-1">
              {Array.from({ length: 5 }, (_, i) => (
                <code key={i} className="text-xs bg-muted px-1 rounded">
                  model-{String(i + 1).padStart(3, '0')}.glb
                </code>
              ))}
              <span className="text-xs text-muted-foreground">... et 17 autres</span>
            </div>
          </div>

          {/* Audio - Partial */}
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileAudio className="h-4 w-4" />
                <span className="font-medium">Audio</span>
                <Badge variant="outline" className="text-xs">4 manquants</Badge>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.open(ENVATO_SEARCH_URLS['audio'], '_blank')}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Afrobeat Music
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              22/26 fichiers audio disponibles. Ajoutez 4 pistes supplémentaires pour compléter.
            </p>
          </div>

          {/* Fonts - Using Google Fonts */}
          <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <File className="h-4 w-4 text-blue-500" />
                <span className="font-medium">Fonts</span>
                <Badge className="bg-blue-500/20 text-blue-500 text-xs">Alternative active</Badge>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.open('https://fonts.google.com/', '_blank')}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Google Fonts
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Les polices sont chargées via Google Fonts (Oswald, Bebas Neue, Orbitron, etc.) au lieu de fichiers locaux.
              Cette approche est plus légère et compatible avec tous les navigateurs.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Final status */}
      <Alert className={stats.completionRate >= 90 ? 'border-green-500/50 bg-green-500/5' : 'border-orange-500/50'}>
        <Info className="h-4 w-4" />
        <AlertTitle>
          {stats.completionRate >= 95 
            ? '🎉 Bibliothèque quasi-complète !' 
            : stats.completionRate >= 80 
              ? '✨ Bon progrès !'
              : '🔧 En cours de complétion'
          }
        </AlertTitle>
        <AlertDescription>
          Avec <strong>{stats.completionRate}%</strong> de complétion et le système de mapping cross-folder,
          tous les templates premium (Afrobeat Pulse, Griot Digital, Concert Live, DJ Mix Visual, Hologram Effect)
          sont désormais entièrement fonctionnels avec leurs effets Light Leak enrichis.
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default AssetCompletionSummary;
