/**
 * Anime Library Manager
 * Admin interface for managing pre-generated anime illustrations
 */

import { useEffect } from 'react';
import { useAnimeLibrary } from '@/hooks/useAnimeLibrary';
import { AnimeLibraryStats } from './AnimeLibraryStats';
import { AnimeLibraryControls } from './AnimeLibraryControls';
import { AnimeLibraryGrid } from './AnimeLibraryGrid';
import { Button } from '@/components/ui/button';
import { RefreshCw, BookImage } from 'lucide-react';

export function AnimeLibraryManager() {
  const { stats, loading, error, fetchStats } = useAnimeLibrary();

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <BookImage className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Bibliothèque Anime</h2>
            <p className="text-muted-foreground">
              Gérez les illustrations pré-générées pour les contes
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => fetchStats()}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </Button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive">
          {error}
        </div>
      )}

      {/* Statistics */}
      <AnimeLibraryStats stats={stats} loading={loading} />

      {/* Generation Controls */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Génération par Style</h3>
        <AnimeLibraryControls stats={stats} onRefreshStats={fetchStats} />
      </div>

      {/* Image Gallery */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Images Générées</h3>
        <AnimeLibraryGrid />
      </div>
    </div>
  );
}
