import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  RefreshCw, Sparkles, CheckCircle, Clock, AlertCircle, 
  Download, Eye, Play, Pause, RotateCcw, Database, Zap, Image, ImagePlus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useTemplateLibrary, AIGeneratedTemplate } from '@/hooks/useTemplateLibrary';
import { useTemplateVisuals } from '@/hooks/useTemplateVisuals';
import { TemplatePreviewModal } from '@/components/tamtam/creator/TemplatePreviewModal';
export function TemplateGenerationAdmin() {
  const {
    templates,
    stats,
    isLoading,
    isSyncing,
    isGenerating,
    generationProgress,
    syncTemplates,
    generateSingle,
    generateBatch,
    generateAllPending,
    downloadTemplate,
    refetch,
  } = useTemplateLibrary();

  const {
    generateSingleVisuals,
    generateAllPending: generateAllVisuals,
    getVisualStats,
    generationProgress: visualProgress,
    isGenerating: isGeneratingVisuals
  } = useTemplateVisuals();

  const [previewTemplate, setPreviewTemplate] = useState<AIGeneratedTemplate | null>(null);
  const [visualStats, setVisualStats] = useState<any>(null);

  useEffect(() => {
    getVisualStats().then(setVisualStats);
  }, [templates]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'generating': return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'pending': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'failed': return <AlertCircle className="w-4 h-4 text-red-500" />;
      default: return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      completed: 'default',
      generating: 'secondary',
      pending: 'outline',
      failed: 'destructive',
    };
    return (
      <Badge variant={variants[status] || 'outline'}>
        {getStatusIcon(status)}
        <span className="ml-1 capitalize">{status}</span>
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{stats?.total || 0}</p>
              </div>
              <Database className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-500/20 bg-green-500/5">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Générés</p>
                <p className="text-2xl font-bold text-green-500">{stats?.completed || 0}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-yellow-500/20 bg-yellow-500/5">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">En attente</p>
                <p className="text-2xl font-bold text-yellow-500">{stats?.pending || 0}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-500/20 bg-blue-500/5">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">En cours</p>
                <p className="text-2xl font-bold text-blue-500">{stats?.generating || 0}</p>
              </div>
              <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-500/20 bg-red-500/5">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Échoués</p>
                <p className="text-2xl font-bold text-red-500">{stats?.failed || 0}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Bar (if generating) */}
      {generationProgress && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">
                Génération en cours: {generationProgress.currentTemplate}
              </span>
              <span className="text-sm text-muted-foreground">
                {generationProgress.current}/{generationProgress.total}
              </span>
            </div>
            <Progress 
              value={(generationProgress.current / generationProgress.total) * 100} 
              className="h-3"
            />
          </CardContent>
        </Card>
      )}

      {/* Visual Progress Bar */}
      {visualProgress && (
        <Card className="border-purple-500/20 bg-purple-500/5">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">
                🎨 Génération visuels: {visualProgress.currentTemplate}
              </span>
              <span className="text-sm text-muted-foreground">
                {visualProgress.current}/{visualProgress.total}
              </span>
            </div>
            <Progress 
              value={(visualProgress.current / visualProgress.total) * 100} 
              className="h-3"
            />
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Actions
          </CardTitle>
          <CardDescription>
            Gérer la synchronisation et la génération des templates IA
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={() => syncTemplates()}
              disabled={isSyncing}
            >
              <Database className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-pulse' : ''}`} />
              {isSyncing ? 'Synchronisation...' : 'Sync depuis le code'}
            </Button>

            <Button
              variant="outline"
              onClick={() => generateBatch(5)}
              disabled={isGenerating || !stats || stats.pending === 0}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Générer 5 templates
            </Button>

            <Button
              onClick={generateAllPending}
              disabled={isGenerating || !stats || stats.pending === 0}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Générer tous ({stats?.pending || 0})
            </Button>

            <Button
              variant="ghost"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
          </div>

          {/* Visual Generation Section */}
          <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mr-4">
              <ImagePlus className="w-4 h-4" />
              <span>Visuels IA:</span>
              {visualStats && (
                <span className="font-medium text-foreground">
                  {visualStats.completed}/{visualStats.total} générés
                </span>
              )}
            </div>
            
            <Button
              variant="outline"
              onClick={generateAllVisuals}
              disabled={isGeneratingVisuals}
            >
              <Image className={`w-4 h-4 mr-2 ${isGeneratingVisuals ? 'animate-pulse' : ''}`} />
              {isGeneratingVisuals ? 'Génération...' : 'Générer tous les visuels'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Templates Table */}
      <Card>
        <CardHeader>
          <CardTitle>Templates ({templates.length})</CardTitle>
          <CardDescription>
            Liste de tous les templates avec leur statut de génération IA et visuels
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Preview</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Famille</TableHead>
                  <TableHead>Status IA</TableHead>
                  <TableHead>Visuels</TableHead>
                  <TableHead className="text-center">Usage</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map(template => (
                  <TableRow key={template.id}>
                    <TableCell>
                      {(template as any).preview_image_url ? (
                        <img 
                          src={(template as any).preview_image_url} 
                          alt={template.label_fr}
                          className="w-12 h-16 rounded-lg object-cover"
                        />
                      ) : (
                        <div
                          className="w-12 h-16 rounded-lg flex items-center justify-center text-xl"
                          style={{ background: `${template.color}20` }}
                        >
                          {template.emoji}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{template.label_fr}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-xs">
                          {template.template_key}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{template.family}</Badge>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(template.generation_status)}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={(template as any).visual_generation_status === 'completed' ? 'default' : 'outline'}
                        className="gap-1"
                      >
                        {(template as any).visual_generation_status === 'completed' && <CheckCircle className="w-3 h-3" />}
                        {(template as any).visual_generation_status === 'pending' && <Clock className="w-3 h-3" />}
                        {(template as any).visual_generation_status === 'generating' && <RefreshCw className="w-3 h-3 animate-spin" />}
                        {(template as any).visual_generation_status === 'failed' && <AlertCircle className="w-3 h-3" />}
                        {(template as any).preview_image_url ? '✓' : '—'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {template.usage_count}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setPreviewTemplate(template)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => generateSingle(template.template_key)}
                          disabled={isGenerating || template.generation_status === 'generating'}
                          title="Régénérer contenu IA"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => generateSingleVisuals.mutate(template.id)}
                          disabled={isGeneratingVisuals || (template as any).visual_generation_status === 'generating'}
                          title="Générer visuels"
                        >
                          <ImagePlus className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => downloadTemplate(template)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}

                {templates.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                      {isLoading ? (
                        <div className="flex items-center justify-center gap-2">
                          <RefreshCw className="w-5 h-5 animate-spin" />
                          Chargement...
                        </div>
                      ) : (
                        <div>
                          <p>Aucun template trouvé</p>
                          <Button
                            variant="link"
                            onClick={() => syncTemplates()}
                            className="mt-2"
                          >
                            Synchroniser depuis le code
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Preview Modal */}
      <TemplatePreviewModal
        template={previewTemplate}
        isOpen={!!previewTemplate}
        onClose={() => setPreviewTemplate(null)}
        onSelect={() => setPreviewTemplate(null)}
        onDownload={() => {
          if (previewTemplate) downloadTemplate(previewTemplate);
        }}
      />
    </div>
  );
}
