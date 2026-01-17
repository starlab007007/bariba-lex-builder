/**
 * TAM-TAM Template Asset Analyzer
 * Comprehensive visual report of all 35 templates and their asset usage
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  FileText,
  Music,
  Image,
  Video,
  Box,
  Type,
  Sparkles,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronRight,
  Download,
  RefreshCw,
  Eye,
  Layers,
  Zap,
  Volume2,
  Film,
  Palette
} from 'lucide-react';
import { allTemplates, templatesByCategory } from '@/components/tamtam/creator/TemplateSystem/templates';
import { Template, Effect } from '@/components/tamtam/creator/TemplateSystem/types';

// ============================================================================
// ASSET INVENTORY - Current state of assets
// ============================================================================

interface AssetInventory {
  category: string;
  icon: React.ReactNode;
  color: string;
  files: {
    total: number;
    valid: number;
    issues: string[];
  };
  formats: string[];
  usedByTemplates: number;
}

const ASSET_INVENTORY: AssetInventory[] = [
  {
    category: 'lens-flare',
    icon: <Sparkles className="h-4 w-4" />,
    color: 'text-yellow-500',
    files: {
      total: 455,
      valid: 455,
      issues: []
    },
    formats: ['.png'],
    usedByTemplates: 35
  },
  {
    category: 'audio',
    icon: <Volume2 className="h-4 w-4" />,
    color: 'text-green-500',
    files: {
      total: 26,
      valid: 13,
      issues: ['Duplicates: audio-0XXX.mp3 and audio-XXX.mp3']
    },
    formats: ['.mp3'],
    usedByTemplates: 15
  },
  {
    category: 'light-leak',
    icon: <Zap className="h-4 w-4" />,
    color: 'text-orange-500',
    files: {
      total: 17,
      valid: 17,
      issues: ['Some may be LFS pointers']
    },
    formats: ['.webm', '.mp4'],
    usedByTemplates: 0
  },
  {
    category: 'particles',
    icon: <Sparkles className="h-4 w-4" />,
    color: 'text-purple-500',
    files: {
      total: 37,
      valid: 0,
      issues: ['All files named leak-XXX.webm instead of particle-XXX.webm', 'Wrong naming convention']
    },
    formats: ['.webm'],
    usedByTemplates: 0
  },
  {
    category: 'textures',
    icon: <Palette className="h-4 w-4" />,
    color: 'text-blue-500',
    files: {
      total: 215,
      valid: 0,
      issues: ['All files may be LFS pointers', 'Need verification']
    },
    formats: ['.mp4'],
    usedByTemplates: 0
  },
  {
    category: 'transitions',
    icon: <Film className="h-4 w-4" />,
    color: 'text-pink-500',
    files: {
      total: 32,
      valid: 12,
      issues: ['20 files are leak-XXX.webm (wrong category)', 'Mixed naming conventions']
    },
    formats: ['.mp4', '.webm'],
    usedByTemplates: 0
  },
  {
    category: '3d-models',
    icon: <Box className="h-4 w-4" />,
    color: 'text-cyan-500',
    files: {
      total: 22,
      valid: 0,
      issues: ['All files are leak-XXX.webm (wrong category)', 'No actual GLB/GLTF models']
    },
    formats: ['.glb', '.gltf'],
    usedByTemplates: 0
  },
  {
    category: 'fonts',
    icon: <Type className="h-4 w-4" />,
    color: 'text-gray-500',
    files: {
      total: 0,
      valid: 0,
      issues: ['Empty folder', 'Fonts loaded from Google Fonts instead']
    },
    formats: ['.ttf', '.otf', '.woff2'],
    usedByTemplates: 0
  }
];

// ============================================================================
// EFFECT TYPE ANALYSIS
// ============================================================================

interface EffectTypeStats {
  type: string;
  icon: React.ReactNode;
  count: number;
  templates: string[];
  assetCategory: string;
  status: 'working' | 'partial' | 'broken';
}

// ============================================================================
// COMPONENT
// ============================================================================

export const TemplateAssetAnalyzer: React.FC = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  
  // Analyze all templates
  const templateAnalysis = useMemo(() => {
    return allTemplates.map(template => {
      const effects = template.effects || [];
      const effectTypes = new Map<string, number>();
      const assetReferences: { type: string; assetId: string; status: 'ok' | 'warning' | 'error' }[] = [];
      
      effects.forEach((effect: Effect) => {
        effectTypes.set(effect.type, (effectTypes.get(effect.type) || 0) + 1);
        
        // Check asset availability
        let status: 'ok' | 'warning' | 'error' = 'ok';
        if (effect.assetId) {
          if (effect.assetId.startsWith('lens-flare:')) {
            status = 'ok'; // lens-flare assets are available
          } else if (effect.assetId.startsWith('audio:')) {
            status = 'ok'; // audio assets are available
          } else if (effect.assetId.startsWith('text:')) {
            status = 'ok'; // text is generated
          } else if (effect.assetId.startsWith('light-leak:')) {
            status = 'warning'; // may be LFS pointers
          } else if (effect.assetId.startsWith('particles:')) {
            status = 'error'; // wrong naming
          } else if (effect.assetId.startsWith('3d-model:')) {
            status = 'error'; // no actual 3D models
          } else if (effect.assetId.startsWith('texture:')) {
            status = 'warning'; // may be LFS pointers
          } else if (effect.assetId.startsWith('transition:')) {
            status = 'warning'; // mixed quality
          }
        }
        
        assetReferences.push({
          type: effect.type,
          assetId: effect.assetId || 'generated',
          status
        });
      });
      
      const hasAudio = !!template.audio?.backgroundMusic;
      const audioStatus = hasAudio ? 'ok' : 'none';
      
      return {
        id: template.id,
        name: template.name,
        nameBa: template.nameBa,
        category: template.category,
        effectCount: effects.length,
        effectTypes: Object.fromEntries(effectTypes),
        assetReferences,
        hasAudio,
        audioStatus,
        audioFile: template.audio?.backgroundMusic || null,
        overallHealth: assetReferences.some(r => r.status === 'error') ? 'error' :
                       assetReferences.some(r => r.status === 'warning') ? 'warning' : 'ok'
      };
    });
  }, []);
  
  // Calculate effect type statistics
  const effectTypeStats = useMemo((): EffectTypeStats[] => {
    const stats: Map<string, { count: number; templates: Set<string> }> = new Map();
    
    allTemplates.forEach(template => {
      (template.effects || []).forEach((effect: Effect) => {
        if (!stats.has(effect.type)) {
          stats.set(effect.type, { count: 0, templates: new Set() });
        }
        const s = stats.get(effect.type)!;
        s.count++;
        s.templates.add(template.id);
      });
    });
    
    const effectIcons: Record<string, React.ReactNode> = {
      'lens-flare': <Sparkles className="h-4 w-4" />,
      'text': <Type className="h-4 w-4" />,
      'light-leak': <Zap className="h-4 w-4" />,
      'particles': <Sparkles className="h-4 w-4" />,
      'texture': <Palette className="h-4 w-4" />,
      '3d-object': <Box className="h-4 w-4" />,
      'transition': <Film className="h-4 w-4" />,
      'color-grade': <Palette className="h-4 w-4" />,
      'sticker': <Image className="h-4 w-4" />
    };
    
    const assetCategories: Record<string, string> = {
      'lens-flare': 'lens-flare',
      'text': 'fonts',
      'light-leak': 'light-leak',
      'particles': 'particles',
      'texture': 'textures',
      '3d-object': '3d-models',
      'transition': 'transitions',
      'color-grade': 'none',
      'sticker': 'none'
    };
    
    const statusMap: Record<string, 'working' | 'partial' | 'broken'> = {
      'lens-flare': 'working',
      'text': 'working',
      'light-leak': 'partial',
      'particles': 'broken',
      'texture': 'partial',
      '3d-object': 'broken',
      'transition': 'partial',
      'color-grade': 'working',
      'sticker': 'working'
    };
    
    return Array.from(stats.entries()).map(([type, data]) => ({
      type,
      icon: effectIcons[type] || <Layers className="h-4 w-4" />,
      count: data.count,
      templates: Array.from(data.templates),
      assetCategory: assetCategories[type] || 'unknown',
      status: statusMap[type] || 'partial'
    })).sort((a, b) => b.count - a.count);
  }, []);
  
  // Category health calculation
  const categoryHealth = useMemo(() => {
    const health: Record<string, { total: number; ok: number; warning: number; error: number }> = {};
    
    templateAnalysis.forEach(t => {
      if (!health[t.category]) {
        health[t.category] = { total: 0, ok: 0, warning: 0, error: 0 };
      }
      health[t.category].total++;
      health[t.category][t.overallHealth]++;
    });
    
    return health;
  }, [templateAnalysis]);
  
  const toggleCategory = (category: string) => {
    const newSet = new Set(expandedCategories);
    if (newSet.has(category)) {
      newSet.delete(category);
    } else {
      newSet.add(category);
    }
    setExpandedCategories(newSet);
  };
  
  const exportReport = () => {
    const report = {
      generatedAt: new Date().toISOString(),
      summary: {
        totalTemplates: 35,
        categories: Object.keys(templatesByCategory).length,
        assetCategories: ASSET_INVENTORY.length,
        healthyAssets: ASSET_INVENTORY.filter(a => a.files.issues.length === 0).length,
        problematicAssets: ASSET_INVENTORY.filter(a => a.files.issues.length > 0).length
      },
      assetInventory: ASSET_INVENTORY,
      effectTypeStats,
      templateAnalysis,
      categoryHealth,
      recommendations: [
        'Rename files in particles/ from leak-XXX.webm to particle-XXX.webm',
        'Move 22 leak-XXX.webm files from 3d-models/ to light-leak/',
        'Move 20 leak-XXX.webm files from transitions/ to light-leak/',
        'Remove duplicate audio files (keep only audio-00XX.mp3 format)',
        'Verify all texture video files for LFS pointer status',
        'Download actual GLB/GLTF 3D models for 3d-models/',
        'Add light-leak effects to 5+ templates for visual richness',
        'Add particles effects to Future category templates'
      ]
    };
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tamtam-asset-report-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  const getStatusIcon = (status: 'ok' | 'warning' | 'error' | 'working' | 'partial' | 'broken') => {
    switch (status) {
      case 'ok':
      case 'working':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
      case 'partial':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'error':
      case 'broken':
        return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };
  
  const getStatusBadge = (status: 'ok' | 'warning' | 'error') => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      ok: 'default',
      warning: 'secondary',
      error: 'destructive'
    };
    return <Badge variant={variants[status]}>{status.toUpperCase()}</Badge>;
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Template & Asset Analyzer</h2>
          <p className="text-muted-foreground">
            Analyse complète des 35 templates et de leurs assets
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportReport}>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Layers className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">35</p>
                <p className="text-xs text-muted-foreground">Templates</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">2</p>
                <p className="text-xs text-muted-foreground">Assets OK</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">3</p>
                <p className="text-xs text-muted-foreground">À vérifier</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <XCircle className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-2xl font-bold">3</p>
                <p className="text-xs text-muted-foreground">Problématiques</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="assets" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="assets">Inventaire Assets</TabsTrigger>
          <TabsTrigger value="effects">Types d'Effets</TabsTrigger>
          <TabsTrigger value="templates">Par Template</TabsTrigger>
          <TabsTrigger value="recommendations">Recommandations</TabsTrigger>
        </TabsList>
        
        {/* Assets Inventory Tab */}
        <TabsContent value="assets" className="space-y-4">
          <div className="grid gap-4">
            {ASSET_INVENTORY.map((asset) => (
              <Card key={asset.category}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={asset.color}>{asset.icon}</span>
                      <CardTitle className="text-lg capitalize">{asset.category}</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={asset.files.valid === asset.files.total ? 'default' : 'destructive'}>
                        {asset.files.valid}/{asset.files.total} valides
                      </Badge>
                      <Badge variant="outline">
                        {asset.usedByTemplates} templates
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Formats attendus:</span>
                      <span>{asset.formats.join(', ')}</span>
                    </div>
                    <Progress 
                      value={asset.files.total > 0 ? (asset.files.valid / asset.files.total) * 100 : 0} 
                      className="h-2"
                    />
                    {asset.files.issues.length > 0 && (
                      <div className="mt-2 p-2 bg-destructive/10 rounded-lg">
                        <p className="text-sm font-medium text-destructive">Problèmes détectés:</p>
                        <ul className="list-disc list-inside text-sm text-muted-foreground">
                          {asset.files.issues.map((issue, i) => (
                            <li key={i}>{issue}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        
        {/* Effect Types Tab */}
        <TabsContent value="effects" className="space-y-4">
          <div className="grid gap-4">
            {effectTypeStats.map((stat) => (
              <Card key={stat.type}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {stat.icon}
                      <CardTitle className="text-lg capitalize">{stat.type}</CardTitle>
                      {getStatusIcon(stat.status)}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge>{stat.count} utilisations</Badge>
                      <Badge variant="outline">{stat.templates.length} templates</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1">
                    {stat.templates.slice(0, 10).map(t => (
                      <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
                    ))}
                    {stat.templates.length > 10 && (
                      <Badge variant="outline" className="text-xs">
                        +{stat.templates.length - 10} more
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Assets from: <span className="font-medium">{stat.assetCategory}</span>
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        
        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          <ScrollArea className="h-[600px]">
            <div className="space-y-2">
              {Object.entries(templatesByCategory).map(([category, templates]) => (
                <Collapsible
                  key={category}
                  open={expandedCategories.has(category)}
                  onOpenChange={() => toggleCategory(category)}
                >
                  <CollapsibleTrigger asChild>
                    <Card className="cursor-pointer hover:bg-accent/50">
                      <CardHeader className="py-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {expandedCategories.has(category) ? 
                              <ChevronDown className="h-4 w-4" /> : 
                              <ChevronRight className="h-4 w-4" />
                            }
                            <CardTitle className="text-base capitalize">{category}</CardTitle>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{templates.length} templates</Badge>
                            {categoryHealth[category] && (
                              <>
                                <Badge className="bg-green-500">{categoryHealth[category].ok} OK</Badge>
                                {categoryHealth[category].warning > 0 && (
                                  <Badge variant="secondary">{categoryHealth[category].warning} ⚠️</Badge>
                                )}
                                {categoryHealth[category].error > 0 && (
                                  <Badge variant="destructive">{categoryHealth[category].error} ❌</Badge>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <div className="pl-6 space-y-2 mt-2">
                      {templates.map(template => {
                        const analysis = templateAnalysis.find(t => t.id === template.id);
                        return (
                          <Card key={template.id} className="bg-card/50">
                            <CardContent className="py-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium">{template.name}</p>
                                  <p className="text-xs text-muted-foreground">{template.nameBa}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  {analysis && (
                                    <>
                                      <Badge variant="outline">
                                        {analysis.effectCount} effets
                                      </Badge>
                                      {analysis.hasAudio && (
                                        <Badge className="bg-green-500">
                                          <Volume2 className="h-3 w-3 mr-1" />
                                          Audio
                                        </Badge>
                                      )}
                                      {getStatusBadge(analysis.overallHealth as 'ok' | 'warning' | 'error')}
                                    </>
                                  )}
                                </div>
                              </div>
                              
                              {analysis && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {Object.entries(analysis.effectTypes).map(([type, count]) => (
                                    <Badge key={type} variant="secondary" className="text-xs">
                                      {type}: {count}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>
        
        {/* Recommendations Tab */}
        <TabsContent value="recommendations" className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Actions Prioritaires</AlertTitle>
            <AlertDescription>
              Les corrections suivantes sont nécessaires pour une expérience optimale.
            </AlertDescription>
          </Alert>
          
          <div className="grid gap-4">
            <Card className="border-red-500/50">
              <CardHeader>
                <CardTitle className="text-red-500 flex items-center gap-2">
                  <XCircle className="h-5 w-5" />
                  Critique - Fichiers Mal Placés
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="p-3 bg-red-500/10 rounded-lg">
                  <p className="font-medium">3d-models/ → 22 fichiers leak-XXX.webm</p>
                  <p className="text-sm text-muted-foreground">
                    Action: Déplacer vers light-leak/ et renommer
                  </p>
                </div>
                <div className="p-3 bg-red-500/10 rounded-lg">
                  <p className="font-medium">particles/ → 37 fichiers leak-XXX.webm</p>
                  <p className="text-sm text-muted-foreground">
                    Action: Renommer en particle-XXX.webm
                  </p>
                </div>
                <div className="p-3 bg-red-500/10 rounded-lg">
                  <p className="font-medium">transitions/ → 20 fichiers leak-XXX.webm</p>
                  <p className="text-sm text-muted-foreground">
                    Action: Déplacer vers light-leak/
                  </p>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-yellow-500/50">
              <CardHeader>
                <CardTitle className="text-yellow-500 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Attention - Vérifications Nécessaires
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="p-3 bg-yellow-500/10 rounded-lg">
                  <p className="font-medium">textures/ → 215 fichiers video-XXX.mp4</p>
                  <p className="text-sm text-muted-foreground">
                    Action: Vérifier si ce sont des pointeurs LFS
                  </p>
                </div>
                <div className="p-3 bg-yellow-500/10 rounded-lg">
                  <p className="font-medium">audio/ → Doublons détectés</p>
                  <p className="text-sm text-muted-foreground">
                    Action: Supprimer les doublons (audio-XXX vs audio-0XXX)
                  </p>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-blue-500/50">
              <CardHeader>
                <CardTitle className="text-blue-500 flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Amélioration - Enrichir les Templates
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="p-3 bg-blue-500/10 rounded-lg">
                  <p className="font-medium">0 templates utilisent light-leak</p>
                  <p className="text-sm text-muted-foreground">
                    Suggestion: Ajouter à Afrobeat Pulse, Griot Digital, Concert Live
                  </p>
                </div>
                <div className="p-3 bg-blue-500/10 rounded-lg">
                  <p className="font-medium">0 templates utilisent particles</p>
                  <p className="text-sm text-muted-foreground">
                    Suggestion: Ajouter à Hologram Effect, Matrix Rain, Cyberpunk Vibes
                  </p>
                </div>
                <div className="p-3 bg-blue-500/10 rounded-lg">
                  <p className="font-medium">0 templates utilisent transitions</p>
                  <p className="text-sm text-muted-foreground">
                    Suggestion: Ajouter à Photo Slideshow, Histoire en Images
                  </p>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-green-500/50">
              <CardHeader>
                <CardTitle className="text-green-500 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  OK - Assets Fonctionnels
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="p-3 bg-green-500/10 rounded-lg">
                  <p className="font-medium">lens-flare/ → 455 fichiers PNG</p>
                  <p className="text-sm text-muted-foreground">
                    ✅ 100% fonctionnel, utilisé par 35/35 templates
                  </p>
                </div>
                <div className="p-3 bg-green-500/10 rounded-lg">
                  <p className="font-medium">audio/ → 13 fichiers MP3 uniques</p>
                  <p className="text-sm text-muted-foreground">
                    ✅ Fonctionnel, utilisé par 15/35 templates
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TemplateAssetAnalyzer;
