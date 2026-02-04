/**
 * Anime Library Generation Controls
 * Buttons to trigger batch generation for each style
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { LibraryStats } from '@/hooks/useAnimeLibrary';
import { Loader2, Play, CheckCircle, AlertCircle, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AnimeLibraryControlsProps {
  stats: LibraryStats | null;
  onRefreshStats: () => Promise<void>;
}

const STYLES = [
  { id: 'african', label: 'African', color: 'bg-orange-500', emoji: '🌍', priority: 1 },
  { id: 'fantasy', label: 'Fantasy', color: 'bg-purple-500', emoji: '✨', priority: 2 },
  { id: 'manga', label: 'Manga', color: 'bg-slate-600', emoji: '📖', priority: 3 },
  { id: 'chibi', label: 'Chibi', color: 'bg-pink-400', emoji: '🎀', priority: 4 },
];

const EMOTIONS = ['joy', 'sadness', 'wonder', 'fear', 'excitement', 'peace', 'tension'];
const SCENES = ['village', 'forest', 'river', 'mountain', 'market', 'home', 'night', 'journey', 'gathering', 'spirit'];
const CHARACTERS = ['child_boy', 'child_girl', 'elder'];
const ACTIONS = ['standing', 'walking', 'talking'];

const TARGET_PER_STYLE = 700;

interface GenerationState {
  isGenerating: boolean;
  style: string | null;
  generated: number;
  remaining: number;
  errors: string[];
  currentCombo: string;
}

export function AnimeLibraryControls({ stats, onRefreshStats }: AnimeLibraryControlsProps) {
  const [genState, setGenState] = useState<GenerationState>({
    isGenerating: false,
    style: null,
    generated: 0,
    remaining: 0,
    errors: [],
    currentCombo: ''
  });

  const generateBatch = async (style: string, startFrom: number = 0) => {
    try {
      // Generate ONE image per call to avoid Edge Function timeout
      const { data, error } = await supabase.functions.invoke('generate-anime-library', {
        body: { 
          action: 'generate_full_library',
          style,
          batch_size: 1,
          start_from: startFrom
        }
      });

      if (error) throw new Error(error.message);
      return data;
    } catch (err) {
      throw err;
    }
  };

  const handleGenerateStyle = async (style: string) => {
    setGenState({
      isGenerating: true,
      style,
      generated: 0,
      remaining: TARGET_PER_STYLE,
      errors: [],
      currentCombo: ''
    });

    let startFrom = 0;
    let totalGenerated = 0;
    const allErrors: string[] = [];

    try {
      toast.info(`🎨 Début de la génération pour le style ${style}...`);

      while (true) {
        const result = await generateBatch(style, startFrom);
        
        if (!result.success) {
          throw new Error(result.error || 'Generation failed');
        }

        totalGenerated += result.generated;
        
        if (result.errors) {
          allErrors.push(...result.errors.map((e: any) => e.combination || e.error));
        }

        setGenState(prev => ({
          ...prev,
          generated: prev.generated + result.generated,
          remaining: result.remaining,
          errors: allErrors
        }));

        // Check if we're done
        if (result.remaining === 0) {
          toast.success(`✅ Style ${style}: ${totalGenerated} images générées!`);
          break;
        }

        // Update start position for next batch
        startFrom = result.next_start_from;

        // Refresh stats after each batch
        await onRefreshStats();

        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (err) {
      console.error('Generation error:', err);
      toast.error(`Erreur: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setGenState({
        isGenerating: false,
        style: null,
        generated: totalGenerated,
        remaining: 0,
        errors: allErrors,
        currentCombo: ''
      });
      await onRefreshStats();
    }
  };

  // Generate 3 images for each missing emotion × scene combination
  const handleGenerateMissing = async (style: string) => {
    const missingEmotions = EMOTIONS.filter(e => (stats?.by_emotion[e] || 0) < 3);
    const missingScenes = SCENES.filter(s => (stats?.by_scene_type[s] || 0) < 3);
    
    // Build list of all combinations to generate (3 images each)
    const combos: Array<{emotion: string; scene: string; charIdx: number}> = [];
    
    for (const emotion of missingEmotions) {
      for (const scene of missingScenes) {
        for (let i = 0; i < 3; i++) {
          combos.push({ emotion, scene, charIdx: i });
        }
      }
    }
    
    if (combos.length === 0) {
      toast.info('Toutes les combinaisons ont déjà au moins 3 images');
      return;
    }

    setGenState({
      isGenerating: true,
      style,
      generated: 0,
      remaining: combos.length,
      errors: [],
      currentCombo: ''
    });

    let totalGenerated = 0;
    const allErrors: string[] = [];

    toast.info(`🎨 Génération de ${combos.length} images pour ${style}...`);

    for (let i = 0; i < combos.length; i++) {
      const combo = combos[i];
      const character = CHARACTERS[combo.charIdx % CHARACTERS.length];
      const action = ACTIONS[combo.charIdx % ACTIONS.length];
      
      try {
        setGenState(prev => ({
          ...prev,
          currentCombo: `${combo.emotion} × ${combo.scene} (${i + 1}/${combos.length})`
        }));

        const { data, error } = await supabase.functions.invoke('generate-anime-library', {
          body: { 
            action: 'generate_batch',
            style,
            emotion: combo.emotion,
            scene_type: combo.scene,
            character_type: character,
            image_action: action,
            count: 1
          }
        });

        if (error) throw new Error(error.message);
        if (data?.generated) {
          totalGenerated += data.generated;
        }

        setGenState(prev => ({
          ...prev,
          generated: prev.generated + 1,
          remaining: prev.remaining - 1
        }));

        // Refresh stats every 5 images
        if (i % 5 === 0) {
          await onRefreshStats();
        }

        // Small delay between calls
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (err) {
        console.error('Generation error:', err);
        allErrors.push(`${combo.emotion}/${combo.scene}: ${err instanceof Error ? err.message : 'Unknown'}`);
      }
    }

    toast.success(`✅ ${totalGenerated} images générées pour ${style}!`);
    
    setGenState({
      isGenerating: false,
      style: null,
      generated: totalGenerated,
      remaining: 0,
      errors: allErrors,
      currentCombo: ''
    });
    
    await onRefreshStats();
  };

  const getStyleProgress = (styleId: string) => {
    if (!stats) return 0;
    const count = stats.by_style[styleId] || 0;
    return Math.round((count / TARGET_PER_STYLE) * 100);
  };

  return (
    <div className="space-y-4">
      {/* Generation Progress */}
      {genState.isGenerating && (
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              Génération en cours: {genState.style}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span>Générées: {genState.generated}</span>
              <span>Restantes: {genState.remaining}</span>
            </div>
            {genState.currentCombo && (
              <div className="text-xs text-muted-foreground truncate">
                📍 {genState.currentCombo}
              </div>
            )}
            <Progress 
              value={(genState.generated / (genState.generated + genState.remaining)) * 100} 
              className="h-3"
            />
            {genState.errors.length > 0 && (
              <div className="flex items-center gap-2 text-destructive text-sm">
                <AlertCircle className="h-4 w-4" />
                {genState.errors.length} erreur(s)
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Style Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {STYLES.map(style => {
          const current = stats?.by_style[style.id] || 0;
          const progress = getStyleProgress(style.id);
          const isComplete = progress >= 100;
          const isCurrentlyGenerating = genState.isGenerating && genState.style === style.id;

          return (
            <Card key={style.id} className={isComplete ? 'border-green-500/50' : ''}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <span>{style.emoji}</span>
                    {style.label}
                  </CardTitle>
                  <Badge variant={isComplete ? 'default' : 'secondary'}>
                    P{style.priority}
                  </Badge>
                </div>
                <CardDescription>
                  {current} / {TARGET_PER_STYLE} images
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${style.color}`} />
                  <Progress value={progress} className="flex-1 h-2" />
                  <span className="text-sm font-medium">{progress}%</span>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleGenerateMissing(style.id)}
                    disabled={genState.isGenerating}
                    className="flex-1"
                    variant="secondary"
                    size="sm"
                  >
                    {isCurrentlyGenerating ? (
                      <>
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        En cours...
                      </>
                    ) : (
                      <>
                        <Zap className="h-3 w-3 mr-1" />
                        Manquants
                      </>
                    )}
                  </Button>
                  
                  <Button
                    onClick={() => handleGenerateStyle(style.id)}
                    disabled={genState.isGenerating || isComplete}
                    className="flex-1"
                    variant={isComplete ? 'outline' : 'default'}
                    size="sm"
                  >
                    {isComplete ? (
                      <>
                        <CheckCircle className="h-3 w-3 mr-1 text-emerald-600" />
                        OK
                      </>
                    ) : (
                      <>
                        <Play className="h-3 w-3 mr-1" />
                        Tout
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
