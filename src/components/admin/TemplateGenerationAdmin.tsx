import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  RefreshCw, Sparkles, CheckCircle, Clock, AlertCircle, 
  Download, Eye, Play, Pause, RotateCcw, Database, Zap, Image, ImagePlus, Video, Film,
  StopCircle, Loader2
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
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface GenerationState {
  isRunning: boolean;
  currentTemplate: { key: string; emoji: string; label: string } | null;
  currentScene: number;
  totalScenes: number;
  completedTemplates: number;
  totalTemplates: number;
  generatedScenes: { scene: number; url: string }[];
  startTime: number;
  errors: string[];
}

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
    getVisualStats,
  } = useTemplateVisuals();

  const [previewTemplate, setPreviewTemplate] = useState<AIGeneratedTemplate | null>(null);
  const [visualStats, setVisualStats] = useState<any>(null);
  const [isGeneratingMiniDoc, setIsGeneratingMiniDoc] = useState(false);
  const [miniDocProgress, setMiniDocProgress] = useState<string | null>(null);
  
  // État de génération avancé avec progression scene par scene
  const [genState, setGenState] = useState<GenerationState>({
    isRunning: false,
    currentTemplate: null,
    currentScene: 0,
    totalScenes: 5,
    completedTemplates: 0,
    totalTemplates: 0,
    generatedScenes: [],
    startTime: 0,
    errors: []
  });
  
  const stopRequestedRef = useRef(false);

  useEffect(() => {
    getVisualStats().then(setVisualStats);
  }, [templates, getVisualStats]);

  // Fonction de génération avec progression réelle
  const startBatchGeneration = useCallback(async () => {
    stopRequestedRef.current = false;
    
    // Compter les templates en attente
    const { count } = await supabase
      .from('ai_generated_templates')
      .select('*', { count: 'exact', head: true })
      .or('visual_generation_status.eq.pending,visual_generation_status.is.null');
    
    const total = count || 0;
    if (total === 0) {
      toast.info('✅ Tous les templates ont déjà des visuels !');
      return;
    }

    setGenState({
      isRunning: true,
      currentTemplate: null,
      currentScene: 0,
      totalScenes: 5,
      completedTemplates: 0,
      totalTemplates: total,
      generatedScenes: [],
      startTime: Date.now(),
      errors: []
    });

    toast.info(`🎬 Démarrage génération TikTok pour ${total} templates...`);

    let completed = 0;

    while (!stopRequestedRef.current && completed < total) {
      try {
        // Obtenir le prochain template
        const { data: nextTemplate } = await supabase
          .from('ai_generated_templates')
          .select('id, template_key, emoji, label_fr')
          .or('visual_generation_status.eq.pending,visual_generation_status.is.null')
          .order('created_at', { ascending: true })
          .limit(1)
          .single();

        if (!nextTemplate) break;

        // Mettre à jour l'état avec le template actuel
        setGenState(prev => ({
          ...prev,
          currentTemplate: {
            key: nextTemplate.template_key,
            emoji: nextTemplate.emoji,
            label: nextTemplate.label_fr
          },
          currentScene: 0,
          generatedScenes: []
        }));

        // Appeler l'edge function pour générer les visuels
        const { data: result, error } = await supabase.functions.invoke('generate-ai-templates', {
          body: { action: 'generate_visuals_batch' }
        });

        if (error) {
          console.error('Generation error:', error);
          setGenState(prev => ({
            ...prev,
            errors: [...prev.errors, `${nextTemplate.template_key}: ${error.message}`]
          }));
        } else if (result?.success) {
          completed++;
          
          // Simuler la progression des scènes (l'edge function génère les 5 d'un coup)
          for (let i = 1; i <= 5; i++) {
            if (stopRequestedRef.current) break;
            setGenState(prev => ({
              ...prev,
              currentScene: i,
              completedTemplates: completed - 1 + (i / 5)
            }));
            await new Promise(r => setTimeout(r, 300));
          }

          setGenState(prev => ({
            ...prev,
            completedTemplates: completed
          }));
        }

        // Petit délai entre les templates
        await new Promise(r => setTimeout(r, 500));

      } catch (err) {
        console.error('Batch generation error:', err);
        break;
      }
    }

    // Fin de la génération
    setGenState(prev => ({ ...prev, isRunning: false }));
    refetch();
    getVisualStats().then(setVisualStats);
    
    if (stopRequestedRef.current) {
      toast.warning(`⏹️ Génération arrêtée: ${completed}/${total} templates`);
    } else {
      toast.success(`🎉 Génération terminée: ${completed} templates avec 5 scènes TikTok chacun !`);
    }
  }, [refetch, getVisualStats]);

  const stopGeneration = useCallback(() => {
    stopRequestedRef.current = true;
    toast.info('⏹️ Arrêt en cours...');
  }, []);

  // Calcul du temps restant estimé
  const estimatedTimeRemaining = genState.isRunning && genState.completedTemplates > 0
    ? Math.round(((Date.now() - genState.startTime) / genState.completedTemplates) * (genState.totalTemplates - genState.completedTemplates) / 1000)
    : 0;

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  };

  // Generate Mini-Doc Village video
  const generateMiniDocVideo = async (duration: 15 | 30 | 45) => {
    setIsGeneratingMiniDoc(true);
    setMiniDocProgress(`Génération vidéo Mini-Doc Village ${duration}s...`);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-mini-doc-video', {
        body: { duration, villageName: 'Village Africain' }
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(`✅ Vidéo Mini-Doc Village ${duration}s générée avec ${data.scenes} scènes !`);
        setMiniDocProgress(null);
        refetch();
      } else {
        throw new Error(data?.error || 'Échec de génération');
      }
    } catch (err) {
      console.error('Mini-Doc generation error:', err);
      toast.error(`Erreur: ${String(err)}`);
      setMiniDocProgress(null);
    } finally {
      setIsGeneratingMiniDoc(false);
    }
  };

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

      {/* Progress Bar (if generating AI content) */}
      {generationProgress && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">
                Génération IA: {generationProgress.currentTemplate}
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

      {/* 🎬 NOUVELLE UI DE PROGRESSION TIKTOK AVANCÉE */}
      <AnimatePresence>
        {genState.isRunning && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
          >
            <Card className="border-2 border-purple-500/50 bg-gradient-to-br from-purple-900/20 via-pink-900/20 to-orange-900/20 overflow-hidden">
              <CardContent className="pt-6">
                {/* En-tête avec template actuel */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <motion.div 
                      className="text-5xl"
                      animate={{ 
                        scale: [1, 1.2, 1],
                        rotate: [0, 10, -10, 0]
                      }}
                      transition={{ 
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    >
                      {genState.currentTemplate?.emoji || '🎬'}
                    </motion.div>
                    <div>
                      <h3 className="text-lg font-bold text-foreground">
                        {genState.currentTemplate?.label || 'Préparation...'}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {genState.currentTemplate?.key}
                      </p>
                    </div>
                  </div>
                  
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={stopGeneration}
                    className="gap-2"
                  >
                    <StopCircle className="w-4 h-4" />
                    Arrêter
                  </Button>
                </div>

                {/* Progression des scènes */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">
                      🎬 Scène {genState.currentScene}/5 en génération...
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Template {Math.floor(genState.completedTemplates) + 1}/{genState.totalTemplates}
                    </span>
                  </div>
                  
                  {/* Barre de progression des scènes */}
                  <div className="flex gap-2 mb-3">
                    {[1, 2, 3, 4, 5].map((scene) => (
                      <motion.div
                        key={scene}
                        className={`h-3 flex-1 rounded-full ${
                          scene < genState.currentScene 
                            ? 'bg-green-500' 
                            : scene === genState.currentScene 
                              ? 'bg-purple-500' 
                              : 'bg-muted'
                        }`}
                        animate={scene === genState.currentScene ? {
                          opacity: [0.5, 1, 0.5]
                        } : {}}
                        transition={{ duration: 1, repeat: Infinity }}
                      />
                    ))}
                  </div>

                  {/* Barre de progression globale */}
                  <Progress 
                    value={(genState.completedTemplates / genState.totalTemplates) * 100} 
                    className="h-4 bg-purple-500/20"
                  />
                </div>

                {/* Statistiques en temps réel */}
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="bg-background/50 rounded-lg p-3">
                    <p className="text-2xl font-bold text-green-500">
                      {Math.floor(genState.completedTemplates)}
                    </p>
                    <p className="text-xs text-muted-foreground">Terminés</p>
                  </div>
                  <div className="bg-background/50 rounded-lg p-3">
                    <p className="text-2xl font-bold text-purple-500">
                      {Math.floor(genState.completedTemplates) * 5 + genState.currentScene}
                    </p>
                    <p className="text-xs text-muted-foreground">Scènes AI</p>
                  </div>
                  <div className="bg-background/50 rounded-lg p-3">
                    <p className="text-2xl font-bold text-orange-500">
                      ~{formatTime(estimatedTimeRemaining)}
                    </p>
                    <p className="text-xs text-muted-foreground">Temps restant</p>
                  </div>
                </div>

                {/* Erreurs éventuelles */}
                {genState.errors.length > 0 && (
                  <div className="mt-4 p-3 bg-red-500/10 rounded-lg border border-red-500/30">
                    <p className="text-sm text-red-400">
                      ⚠️ {genState.errors.length} erreur(s): {genState.errors[genState.errors.length - 1]}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Actions
          </CardTitle>
          <CardDescription>
            Gérer la synchronisation et la génération des templates IA TikTok
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
              Générer 5 contenus IA
            </Button>

            <Button
              onClick={generateAllPending}
              disabled={isGenerating || !stats || stats.pending === 0}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Générer tous contenus ({stats?.pending || 0})
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

          {/* 🎬 SECTION GÉNÉRATION VISUELS TIKTOK */}
          <div className="flex flex-col gap-4 mt-6 pt-6 border-t border-purple-500/30">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500">
                <Video className="w-5 h-5 text-white" />
              </div>
              <div>
                <h4 className="font-semibold">🎬 Génération Visuels TikTok</h4>
                <p className="text-sm text-muted-foreground">
                  Créer 5 scènes AI style TikTok/Kuaishou par template
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2 text-sm">
                <ImagePlus className="w-4 h-4 text-purple-500" />
                <span className="text-muted-foreground">Visuels:</span>
                {visualStats && (
                  <Badge variant={visualStats.completed === visualStats.total ? 'default' : 'secondary'}>
                    {visualStats.completed}/{visualStats.total}
                  </Badge>
                )}
              </div>
              
              <Button
                size="lg"
                onClick={startBatchGeneration}
                disabled={genState.isRunning || (visualStats?.pending === 0)}
                className="bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 hover:from-purple-700 hover:via-pink-700 hover:to-orange-600 text-white shadow-lg shadow-purple-500/25"
              >
                {genState.isRunning ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Génération en cours...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    🎬 Générer Visuels TikTok ({visualStats?.pending || 0})
                  </>
                )}
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => getVisualStats().then(setVisualStats)}
                disabled={genState.isRunning}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Actualiser
              </Button>
            </div>
          </div>

          {/* Mini-Doc Village Special Section */}
          <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-amber-500/20 bg-amber-500/5 -mx-6 px-6 py-4 -mb-6 rounded-b-lg">
            <div className="flex items-center gap-2 text-sm text-amber-600 font-medium mr-4">
              <Film className="w-4 h-4" />
              <span>🏘️ Mini-Doc Village (5 scènes IA réalistes):</span>
            </div>
            
            <Button
              onClick={() => generateMiniDocVideo(15)}
              disabled={isGeneratingMiniDoc}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              <Video className={`w-4 h-4 mr-2 ${isGeneratingMiniDoc ? 'animate-spin' : ''}`} />
              Générer 15s
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => generateMiniDocVideo(30)}
              disabled={isGeneratingMiniDoc}
              className="border-amber-500/30 hover:bg-amber-500/10"
            >
              <Video className={`w-4 h-4 mr-2 ${isGeneratingMiniDoc ? 'animate-spin' : ''}`} />
              Générer 30s
            </Button>
            
            {miniDocProgress && (
              <span className="text-sm text-amber-600 animate-pulse ml-2">
                {miniDocProgress}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Templates Table */}
      <Card>
        <CardHeader>
          <CardTitle>Templates ({templates.length})</CardTitle>
          <CardDescription>
            Liste de tous les templates avec leur statut de génération IA et visuels TikTok
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
                  <TableHead>Visuels TikTok</TableHead>
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
                          className="w-12 h-16 rounded-lg object-cover ring-2 ring-purple-500/30"
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
                      {getStatusBadge(template.generation_status || 'pending')}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={(template as any).visual_generation_status === 'completed' ? 'default' : 'outline'}
                        className={`gap-1 ${(template as any).visual_generation_status === 'completed' ? 'bg-purple-500' : ''}`}
                      >
                        {(template as any).visual_generation_status === 'completed' && <CheckCircle className="w-3 h-3" />}
                        {(template as any).visual_generation_status === 'pending' && <Clock className="w-3 h-3" />}
                        {(template as any).visual_generation_status === 'generating' && <RefreshCw className="w-3 h-3 animate-spin" />}
                        {(template as any).visual_generation_status === 'failed' && <AlertCircle className="w-3 h-3" />}
                        {(template as any).visual_generation_status === 'completed' ? '5 scènes ✓' : 'En attente'}
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
                          disabled={isGenerating}
                        >
                          <Sparkles className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => generateSingleVisuals.mutate(template.id)}
                          disabled={generateSingleVisuals.isPending}
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
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Preview Modal */}
      {previewTemplate && (
        <TemplatePreviewModal
          template={previewTemplate}
          isOpen={!!previewTemplate}
          onClose={() => setPreviewTemplate(null)}
          onSelect={() => {
            toast.success(`Template "${previewTemplate.label_fr}" sélectionné !`);
            setPreviewTemplate(null);
          }}
          onDownload={() => downloadTemplate(previewTemplate)}
        />
      )}
    </div>
  );
}
