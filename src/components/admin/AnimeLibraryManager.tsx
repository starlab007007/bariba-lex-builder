/**
 * Anime Library Manager
 * Admin interface for managing pre-generated anime illustrations, videos, and music
 */

import { useEffect, Component, type ReactNode } from 'react';
import { useAnimeLibrary } from '@/hooks/useAnimeLibrary';
import { AnimeLibraryStats } from './AnimeLibraryStats';
import { AnimeLibraryControls } from './AnimeLibraryControls';
import { AnimeLibraryGrid } from './AnimeLibraryGrid';
import { AssetUploadForm } from './AssetUploadForm';
import { MusicUploadForm } from './MusicUploadForm';
import { useBatchPosterGenerator } from '@/hooks/useBatchPosterGenerator';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { RefreshCw, BookImage, Image, Music2, Upload, AlertTriangle, Film, Loader2, StopCircle } from 'lucide-react';

/** Error boundary to prevent white page crashes */
class LibraryErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('AnimeLibrary crash:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center space-y-4">
          <AlertTriangle className="h-10 w-10 mx-auto text-destructive" />
          <p className="font-semibold">Une erreur est survenue</p>
          <p className="text-sm text-muted-foreground">{this.state.error?.message}</p>
          <Button variant="outline" onClick={() => this.setState({ hasError: false, error: null })}>
            Réessayer
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

export function AnimeLibraryManager() {
  const { stats, loading, error, fetchStats } = useAnimeLibrary();
  const { generate, stop, isProcessing, progress } = useBatchPosterGenerator();

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const progressPercent = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <LibraryErrorBoundary>
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

      {/* ===== POSTER GENERATOR PANEL ===== */}
      <div className="p-4 rounded-xl border border-purple-500/20 bg-purple-950/20 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Film className="h-5 w-5 text-purple-400" />
            <div>
              <h3 className="text-sm font-semibold text-purple-200">Générateur de Posters Vidéo</h3>
              <p className="text-xs text-purple-300/60">Extrait la 1ère frame de chaque vidéo pour des miniatures instantanées</p>
            </div>
          </div>
          <div className="flex gap-2">
            {isProcessing ? (
              <Button size="sm" variant="destructive" onClick={stop} className="gap-1.5">
                <StopCircle className="h-4 w-4" /> Arrêter
              </Button>
            ) : (
              <>
                <Button size="sm" variant="outline" onClick={() => generate(50)} className="gap-1.5 border-purple-500/30 text-purple-200 hover:bg-purple-500/20">
                  <Film className="h-4 w-4" /> Batch 50
                </Button>
                <Button size="sm" onClick={() => generate(100)} className="gap-1.5 bg-purple-600 hover:bg-purple-500 text-white">
                  <Film className="h-4 w-4" /> Batch 100
                </Button>
              </>
            )}
          </div>
        </div>

        {isProcessing && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-purple-300/80">
              <span>
                {progress.current && <span className="text-purple-400">{progress.current}</span>}
                {' '}{progress.done}/{progress.total} traités
                {progress.errors > 0 && <span className="text-destructive ml-1">({progress.errors} erreurs)</span>}
              </span>
              <span className="font-mono">{progressPercent}%</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>
        )}
      </div>

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
    </LibraryErrorBoundary>
  );
}