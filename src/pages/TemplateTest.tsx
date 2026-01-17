/**
 * Template System Test Page
 * Test templates without camera - debugging and development tool
 * Access: /template-test
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Pause, RotateCcw, Sparkles, Zap, Layers,
  Activity, Clock, Eye, EyeOff, Settings, ChevronDown,
  ChevronRight, Volume2, VolumeX, Maximize, RefreshCw,
  CheckCircle2, XCircle, Loader2, AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

import { TemplateEngine } from '@/components/tamtam/creator/TemplateSystem/TemplateEngine';
import { assetManager } from '@/components/tamtam/creator/TemplateSystem/AssetManager';
import { allTemplates } from '@/components/tamtam/creator/TemplateSystem/templates';
import type { Template, RenderState, EngineState } from '@/components/tamtam/creator/TemplateSystem/types';

// ============================================================================
// TYPES
// ============================================================================

interface AssetStatus {
  id: string;
  status: 'pending' | 'loading' | 'loaded' | 'error';
  error?: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function TemplateTest() {
  // Canvas and engine refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<TemplateEngine | null>(null);
  const animationRef = useRef<number | null>(null);
  
  // State
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [isEngineReady, setIsEngineReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [fps, setFps] = useState(0);
  const [renderState, setRenderState] = useState<RenderState | null>(null);
  const [engineState, setEngineState] = useState<EngineState | null>(null);
  const [assetStatuses, setAssetStatuses] = useState<AssetStatus[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEffectsList, setShowEffectsList] = useState(true);
  const [showAssetsList, setShowAssetsList] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [volume, setVolume] = useState(30);
  
  // FPS calculation
  const fpsRef = useRef({ frames: 0, lastTime: performance.now() });

  // ============================================================================
  // ENGINE INITIALIZATION
  // ============================================================================

  useEffect(() => {
    if (!canvasRef.current) return;

    // Initialize engine with canvas only (AssetManager is used internally)
    const engine = new TemplateEngine(canvasRef.current);
    engineRef.current = engine;
    setIsEngineReady(true);

    // Subscribe to state changes
    const unsubState = engine.subscribe((state) => {
      setEngineState(state);
    });

    const unsubRender = engine.onRenderState((state) => {
      setRenderState(state);
      setCurrentTime(state.currentTime);
    });

    console.log('[TemplateTest] Engine initialized');

    return () => {
      unsubState();
      unsubRender();
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      engine.dispose();
      console.log('[TemplateTest] Engine disposed');
    };
  }, []);

  // ============================================================================
  // TEMPLATE LOADING
  // ============================================================================

  const loadTemplate = useCallback(async (template: Template) => {
    if (!engineRef.current) {
      setError('Engine not initialized');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSelectedTemplate(template);
    setIsPlaying(false);
    setCurrentTime(0);

    // Track asset loading
    const assetIds = new Set<string>();
    template.effects.forEach(effect => {
      if (effect.assetId && !effect.assetId.startsWith('text:')) {
        assetIds.add(effect.assetId);
      }
    });
    if (template.audio?.backgroundMusic) {
      assetIds.add(template.audio.backgroundMusic);
    }

    setAssetStatuses(
      Array.from(assetIds).map(id => ({ id, status: 'pending' }))
    );

    try {
      console.log('[TemplateTest] Loading template:', template.name);
      
      // Update asset statuses as they load
      for (const assetId of assetIds) {
        setAssetStatuses(prev => 
          prev.map(a => a.id === assetId ? { ...a, status: 'loading' } : a)
        );
        
        try {
          await assetManager.load(assetId);
          setAssetStatuses(prev => 
            prev.map(a => a.id === assetId ? { ...a, status: 'loaded' } : a)
          );
        } catch (err: any) {
          setAssetStatuses(prev => 
            prev.map(a => a.id === assetId ? { ...a, status: 'error', error: err.message } : a)
          );
          console.warn(`[TemplateTest] Asset failed: ${assetId}`, err);
        }
      }

      await engineRef.current.loadTemplate(template);
      console.log('[TemplateTest] Template loaded successfully');
      
    } catch (err: any) {
      console.error('[TemplateTest] Failed to load template:', err);
      setError(err.message || 'Failed to load template');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ============================================================================
  // PLAYBACK CONTROLS
  // ============================================================================

  const togglePlayPause = useCallback(() => {
    if (!engineRef.current || !selectedTemplate) return;

    if (isPlaying) {
      engineRef.current.stop();
      setIsPlaying(false);
    } else {
      engineRef.current.start();
      setIsPlaying(true);
      
      // Start FPS tracking
      const trackFps = () => {
        fpsRef.current.frames++;
        const now = performance.now();
        const delta = now - fpsRef.current.lastTime;
        
        if (delta >= 1000) {
          setFps(Math.round((fpsRef.current.frames * 1000) / delta));
          fpsRef.current.frames = 0;
          fpsRef.current.lastTime = now;
        }
        
        if (isPlaying) {
          animationRef.current = requestAnimationFrame(trackFps);
        }
      };
      animationRef.current = requestAnimationFrame(trackFps);
    }
  }, [isPlaying, selectedTemplate]);

  const reset = useCallback(() => {
    if (!engineRef.current) return;
    engineRef.current.stop();
    setIsPlaying(false);
    setCurrentTime(0);
    // Reset engine time if method exists
  }, []);

  const seek = useCallback((time: number) => {
    setCurrentTime(time);
    // Seek engine if method exists
  }, []);

  // ============================================================================
  // UI HELPERS
  // ============================================================================

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const getEffectIcon = (type: string) => {
    switch (type) {
      case 'light-leak': return '🌈';
      case 'lens-flare': return '✨';
      case 'text': return '📝';
      case 'particles': return '💫';
      case '3d-object': return '🎲';
      case 'transition': return '🔄';
      case 'texture': return '🎨';
      default: return '❓';
    }
  };

  const getTriggerBadge = (trigger: string) => {
    switch (trigger) {
      case 'always': return <Badge variant="secondary" className="text-xs">Always</Badge>;
      case 'beat': return <Badge className="bg-purple-600 text-xs">Beat</Badge>;
      case 'time': return <Badge className="bg-blue-600 text-xs">Time</Badge>;
      case 'keyword': return <Badge className="bg-orange-600 text-xs">Keyword</Badge>;
      default: return <Badge variant="outline" className="text-xs">{trigger}</Badge>;
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Template System Test</h1>
              <p className="text-xs text-muted-foreground">Debug & Preview Environment</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant={isEngineReady ? "default" : "destructive"}>
              {isEngineReady ? '✓ Engine Ready' : '✗ Engine Error'}
            </Badge>
            <Badge variant="outline" className="font-mono">
              {fps} FPS
            </Badge>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Panel - Template Selector */}
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Templates ({allTemplates.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[300px]">
                  <div className="p-3 space-y-2">
                    {allTemplates.map(template => (
                      <motion.button
                        key={template.id}
                        onClick={() => loadTemplate(template)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={cn(
                          "w-full p-3 rounded-lg text-left transition-all",
                          "border border-border hover:border-primary/50",
                          selectedTemplate?.id === template.id
                            ? "bg-primary/10 border-primary"
                            : "bg-muted/30 hover:bg-muted/50"
                        )}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-medium text-sm">{template.name}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {template.category} • {template.effects.length} effects
                            </div>
                          </div>
                          {template.isNew && (
                            <Badge className="bg-green-600 text-[10px]">NEW</Badge>
                          )}
                        </div>
                      </motion.button>
                    ))}
                    
                    {allTemplates.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No templates available</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Effects List */}
            <Collapsible open={showEffectsList} onOpenChange={setShowEffectsList}>
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="pb-3 cursor-pointer hover:bg-muted/30 transition-colors">
                    <CardTitle className="text-sm flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Layers className="w-4 h-4" />
                        Effects ({selectedTemplate?.effects.length || 0})
                      </span>
                      {showEffectsList ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </CardTitle>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <ScrollArea className="h-[200px]">
                      <div className="space-y-2">
                        {selectedTemplate?.effects.map((effect, i) => (
                          <div 
                            key={effect.id || i}
                            className="p-2 rounded-md bg-muted/30 border border-border text-xs"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="flex items-center gap-1.5">
                                <span>{getEffectIcon(effect.type)}</span>
                                <span className="font-medium">{effect.type}</span>
                              </span>
                              {getTriggerBadge(effect.trigger)}
                            </div>
                            <div className="text-muted-foreground truncate">
                              {effect.assetId}
                            </div>
                          </div>
                        ))}
                        
                        {!selectedTemplate && (
                          <p className="text-muted-foreground text-center py-4">
                            Select a template to see effects
                          </p>
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* Assets List */}
            <Collapsible open={showAssetsList} onOpenChange={setShowAssetsList}>
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="pb-3 cursor-pointer hover:bg-muted/30 transition-colors">
                    <CardTitle className="text-sm flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Activity className="w-4 h-4" />
                        Assets ({assetStatuses.length})
                      </span>
                      {showAssetsList ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </CardTitle>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <ScrollArea className="h-[150px]">
                      <div className="space-y-1.5">
                        {assetStatuses.map(asset => (
                          <div 
                            key={asset.id}
                            className="flex items-center gap-2 p-1.5 rounded text-xs"
                          >
                            {asset.status === 'pending' && <Clock className="w-3 h-3 text-muted-foreground" />}
                            {asset.status === 'loading' && <Loader2 className="w-3 h-3 text-blue-500 animate-spin" />}
                            {asset.status === 'loaded' && <CheckCircle2 className="w-3 h-3 text-green-500" />}
                            {asset.status === 'error' && <XCircle className="w-3 h-3 text-red-500" />}
                            <span className="truncate flex-1 text-muted-foreground">{asset.id}</span>
                          </div>
                        ))}
                        
                        {assetStatuses.length === 0 && (
                          <p className="text-muted-foreground text-center py-4 text-xs">
                            No assets to load
                          </p>
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          </div>

          {/* Center Panel - Canvas Preview */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                {/* Canvas Container */}
                <div className="relative bg-black aspect-[9/16] max-h-[70vh] mx-auto">
                  <canvas
                    ref={canvasRef}
                    width={1080}
                    height={1920}
                    className="w-full h-full object-contain"
                  />
                  
                  {/* Loading Overlay */}
                  <AnimatePresence>
                    {isLoading && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center"
                      >
                        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                        <p className="text-white text-sm">Loading template...</p>
                        <p className="text-white/60 text-xs mt-1">
                          {assetStatuses.filter(a => a.status === 'loaded').length}/{assetStatuses.length} assets
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Error Overlay */}
                  <AnimatePresence>
                    {error && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center p-4"
                      >
                        <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
                        <p className="text-red-400 text-sm text-center">{error}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* No Template Overlay */}
                  {!selectedTemplate && !isLoading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-white/60">
                      <Sparkles className="w-16 h-16 mb-4 opacity-30" />
                      <p className="text-sm">Select a template to preview</p>
                    </div>
                  )}

                  {/* Stats Overlay */}
                  <div className="absolute top-3 left-3 right-3 flex justify-between">
                    <Badge variant="secondary" className="bg-black/60 text-white text-xs">
                      {formatTime(currentTime)} / {formatTime(selectedTemplate?.duration || 0)}
                    </Badge>
                    <Badge variant="secondary" className="bg-black/60 text-white text-xs font-mono">
                      {fps} FPS
                    </Badge>
                  </div>

                  {/* Template Info */}
                  {selectedTemplate && (
                    <div className="absolute bottom-3 left-3 right-3">
                      <div className="bg-black/60 backdrop-blur-sm rounded-lg p-2">
                        <div className="flex items-center justify-between">
                          <span className="text-white text-sm font-medium">
                            {selectedTemplate.name}
                          </span>
                          <Badge variant="outline" className="text-white border-white/30 text-xs">
                            {selectedTemplate.category}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Controls */}
                <div className="p-4 bg-muted/30 border-t border-border">
                  {/* Progress Bar */}
                  <div className="mb-4">
                    <Slider
                      value={[currentTime]}
                      min={0}
                      max={selectedTemplate?.duration || 30}
                      step={0.1}
                      onValueChange={([v]) => seek(v)}
                      disabled={!selectedTemplate}
                      className="cursor-pointer"
                    />
                  </div>

                  {/* Control Buttons */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant={isPlaying ? "default" : "secondary"}
                        onClick={togglePlayPause}
                        disabled={!selectedTemplate || isLoading}
                      >
                        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={reset}
                        disabled={!selectedTemplate}
                      >
                        <RotateCcw className="w-4 h-4" />
                      </Button>

                      <div className="w-px h-6 bg-border mx-2" />

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setIsMuted(!isMuted)}
                      >
                        {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                      </Button>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Render: {renderState?.loadedAssets || 0}/{renderState?.totalAssets || 0}</span>
                      <span>•</span>
                      <span>{isPlaying ? '▶ Playing' : '⏸ Paused'}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Debug Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Debug Info
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                  <div className="p-2 rounded bg-muted/30">
                    <div className="text-muted-foreground mb-1">Engine</div>
                    <div className="font-mono">{isEngineReady ? 'Ready' : 'Not Ready'}</div>
                  </div>
                  <div className="p-2 rounded bg-muted/30">
                    <div className="text-muted-foreground mb-1">Template</div>
                    <div className="font-mono truncate">{selectedTemplate?.id || 'None'}</div>
                  </div>
                  <div className="p-2 rounded bg-muted/30">
                    <div className="text-muted-foreground mb-1">Effects</div>
                    <div className="font-mono">{selectedTemplate?.effects.length || 0}</div>
                  </div>
                  <div className="p-2 rounded bg-muted/30">
                    <div className="text-muted-foreground mb-1">Assets</div>
                    <div className="font-mono">
                      {assetStatuses.filter(a => a.status === 'loaded').length}/{assetStatuses.length}
                    </div>
                  </div>
                </div>

                {/* Engine State JSON */}
                <details className="mt-4">
                  <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                    Engine State (JSON)
                  </summary>
                  <pre className="mt-2 p-2 rounded bg-muted/30 text-xs overflow-auto max-h-[200px] font-mono">
                    {JSON.stringify({ engineState, renderState }, null, 2)}
                  </pre>
                </details>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
