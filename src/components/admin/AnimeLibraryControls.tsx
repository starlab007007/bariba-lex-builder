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
import { Loader2, Play, CheckCircle, AlertCircle } from 'lucide-react';
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

const TARGET_PER_STYLE = 700;

interface GenerationState {
  isGenerating: boolean;
  style: string | null;
  generated: number;
  remaining: number;
  errors: string[];
}

export function AnimeLibraryControls({ stats, onRefreshStats }: AnimeLibraryControlsProps) {
  const [genState, setGenState] = useState<GenerationState>({
    isGenerating: false,
    style: null,
    generated: 0,
    remaining: 0,
    errors: []
  });

  const generateBatch = async (style: string, startFrom: number = 0) => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-anime-library', {
        body: { 
          action: 'generate_full_library',
          style,
          batch_size: 5,
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
      errors: []
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
        errors: allErrors
      });
      await onRefreshStats();
    }
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
            <Progress 
              value={(genState.generated / (genState.generated + genState.remaining)) * 100} 
              className="h-3"
            />
            {genState.errors.length > 0 && (
              <div className="flex items-center gap-2 text-amber-600 text-sm">
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
                
                <Button
                  onClick={() => handleGenerateStyle(style.id)}
                  disabled={genState.isGenerating || isComplete}
                  className="w-full"
                  variant={isComplete ? 'outline' : 'default'}
                >
                  {isCurrentlyGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Génération...
                    </>
                  ) : isComplete ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                      Complet
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Générer
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
