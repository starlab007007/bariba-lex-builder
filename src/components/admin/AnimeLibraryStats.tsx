/**
 * Anime Library Statistics Component
 * Displays coverage stats for each style, emotion, and scene type
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { LibraryStats } from '@/hooks/useAnimeLibrary';
import { Image, Palette, Heart, MapPin } from 'lucide-react';

interface AnimeLibraryStatsProps {
  stats: LibraryStats | null;
  loading: boolean;
}

const STYLE_COLORS: Record<string, string> = {
  african: 'bg-orange-500',
  fantasy: 'bg-purple-500',
  manga: 'bg-slate-600',
  chibi: 'bg-pink-400'
};

const EMOTION_EMOJIS: Record<string, string> = {
  joy: '😊',
  sadness: '😢',
  wonder: '✨',
  fear: '😨',
  excitement: '🎉',
  peace: '🕊️',
  tension: '⚡'
};

export function AnimeLibraryStats({ stats, loading }: AnimeLibraryStatsProps) {
  if (loading && !stats) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 animate-pulse">
        {[1, 2, 3, 4].map(i => (
          <Card key={i} className="h-32 bg-muted/50" />
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const targetPerStyle = 700; // 7 emotions × 10 scenes × 10 variations

  return (
    <div className="space-y-6">
      {/* Global Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Images</CardTitle>
            <Image className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_images}</div>
            <p className="text-xs text-muted-foreground">
              sur {stats.total_possible_combinations * 10} cibles
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Couverture</CardTitle>
            <Palette className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.coverage_percent}%</div>
            <Progress value={stats.coverage_percent} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Combinaisons</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_possible_combinations}</div>
            <p className="text-xs text-muted-foreground">
              4 styles × 7 émotions × 10 scènes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Stats by Style */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Par Style
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {Object.entries(stats.by_style).map(([style, count]) => {
              const percent = Math.round((count / targetPerStyle) * 100);
              return (
                <div key={style} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="capitalize">
                      <span className={`w-2 h-2 rounded-full mr-2 ${STYLE_COLORS[style] || 'bg-gray-500'}`} />
                      {style}
                    </Badge>
                    <span className="text-sm font-medium">{count}/{targetPerStyle}</span>
                  </div>
                  <Progress value={percent} className="h-2" />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Stats by Emotion */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5" />
            Par Émotion
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {Object.entries(stats.by_emotion).map(([emotion, count]) => (
              <Badge key={emotion} variant="outline" className="text-sm py-1.5 px-3">
                <span className="mr-1">{EMOTION_EMOJIS[emotion] || '•'}</span>
                {emotion}: <span className="font-bold ml-1">{count}</span>
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Stats by Scene Type */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Par Type de Scène
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 grid-cols-2 md:grid-cols-5">
            {Object.entries(stats.by_scene_type).map(([scene, count]) => (
              <div key={scene} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                <span className="text-sm capitalize">{scene}</span>
                <Badge variant="secondary">{count}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
