/**
 * Anime Library Manager
 * Admin interface for managing pre-generated anime illustrations, videos, and music
 */

import { useEffect } from 'react';
import { useAnimeLibrary } from '@/hooks/useAnimeLibrary';
import { AnimeLibraryStats } from './AnimeLibraryStats';
import { AnimeLibraryControls } from './AnimeLibraryControls';
import { AnimeLibraryGrid } from './AnimeLibraryGrid';
import { AssetUploadForm } from './AssetUploadForm';
import { MusicUploadForm } from './MusicUploadForm';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw, BookImage, Image, Music2, Upload } from 'lucide-react';

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
              Gérez les illustrations, vidéos et musiques pour les contes
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

      {/* Tabs */}
      <Tabs defaultValue="gallery" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="gallery" className="flex items-center gap-2">
            <BookImage className="h-4 w-4" />
            Galerie
          </TabsTrigger>
          <TabsTrigger value="upload-asset" className="flex items-center gap-2">
            <Image className="h-4 w-4" />
            Upload Photo/Vidéo
          </TabsTrigger>
          <TabsTrigger value="upload-music" className="flex items-center gap-2">
            <Music2 className="h-4 w-4" />
            Upload Musique
          </TabsTrigger>
        </TabsList>

        {/* Gallery Tab */}
        <TabsContent value="gallery" className="space-y-6 mt-6">
          <AnimeLibraryStats stats={stats} loading={loading} />

          <div>
            <h3 className="text-lg font-semibold mb-4">Génération par Style</h3>
            <AnimeLibraryControls stats={stats} onRefreshStats={fetchStats} />
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Images Générées</h3>
            <AnimeLibraryGrid />
          </div>
        </TabsContent>

        {/* Upload Photo/Video Tab */}
        <TabsContent value="upload-asset" className="mt-6">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Upload className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Upload Photo / Vidéo</h3>
                <p className="text-muted-foreground text-sm">
                  Ajoutez manuellement des photos ou vidéos classifiées pour les contes
                </p>
              </div>
            </div>
            <AssetUploadForm />
          </div>
        </TabsContent>

        {/* Upload Music Tab */}
        <TabsContent value="upload-music" className="mt-6">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Music2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Upload Musique</h3>
                <p className="text-muted-foreground text-sm">
                  Ajoutez des pistes musicales classifiées pour la bibliothèque de contes
                </p>
              </div>
            </div>
            <MusicUploadForm />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
