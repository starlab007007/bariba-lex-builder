/**
 * Anime Library Grid Component
 * Displays generated images/videos with filters.
 * Optimized: lazy video via IntersectionObserver, skeleton placeholders, max 2 simultaneous playbacks.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Skeleton } from '@/components/ui/skeleton';
import { LibraryImage } from '@/hooks/useAnimeLibrary';
import { Loader2, Filter, Grid3X3, RefreshCw, Film } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

const STYLES = ['all', 'african', 'fantasy', 'manga', 'chibi'];
const EMOTIONS = ['all', 'joy', 'sadness', 'wonder', 'fear', 'excitement', 'peace', 'tension'];
const SCENES = ['all', 'village', 'forest', 'river', 'mountain', 'market', 'home', 'night', 'journey', 'gathering', 'spirit'];
const ASSET_TYPES = ['all', 'image', 'video'];

// Track playing videos globally to limit simultaneous playback
const playingVideos = new Set<HTMLVideoElement>();
const MAX_PLAYING = 2;

function pauseOldest() {
  if (playingVideos.size <= MAX_PLAYING) return;
  const oldest = playingVideos.values().next().value;
  if (oldest) {
    oldest.pause();
    playingVideos.delete(oldest);
  }
}

/** Lazy-loaded video with IntersectionObserver */
function LazyVideo({ src, poster, className }: { src: string; poster?: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [visible, setVisible] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        setVisible(entry.isIntersecting);
        // Pause + free memory when off-screen
        if (!entry.isIntersecting && videoRef.current) {
          videoRef.current.pause();
          playingVideos.delete(videoRef.current);
        }
      },
      { threshold: 0.1, rootMargin: '200px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const handleMouseEnter = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    playingVideos.add(v);
    pauseOldest();
    v.play().catch(() => {});
  }, []);

  const handleMouseLeave = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.pause();
    v.currentTime = 0;
    playingVideos.delete(v);
  }, []);

  return (
    <div ref={ref} className={cn('relative w-full h-full', className)}>
      {/* Skeleton until loaded */}
      {!loaded && (
        <div className="absolute inset-0 z-10">
          <Skeleton className="w-full h-full bg-muted" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Film className="w-6 h-6 text-muted-foreground/40" />
          </div>
        </div>
      )}
      {visible ? (
        <video
          ref={videoRef}
          src={src}
          poster={poster || undefined}
          className={cn(
            'object-cover w-full h-full transition-opacity duration-300',
            loaded ? 'opacity-100' : 'opacity-0'
          )}
          muted
          loop
          playsInline
          preload="metadata"
          onLoadedData={() => setLoaded(true)}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        />
      ) : poster ? (
        <img
          src={poster}
          alt=""
          className={cn('object-cover w-full h-full transition-opacity duration-300', loaded ? 'opacity-100' : 'opacity-0')}
          onLoad={() => setLoaded(true)}
        />
      ) : null}
    </div>
  );
}

/** Lazy-loaded image with skeleton + fade-in */
function LazyImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className="relative w-full h-full">
      {!loaded && <Skeleton className="absolute inset-0 bg-muted z-10" />}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        className={cn(
          'object-cover w-full h-full transition-all duration-300 will-change-transform group-hover:scale-105',
          loaded ? 'opacity-100' : 'opacity-0',
          className
        )}
      />
    </div>
  );
}

export function AnimeLibraryGrid() {
  const [images, setImages] = useState<LibraryImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [filters, setFilters] = useState({
    style: 'all',
    emotion: 'all',
    scene_type: 'all',
    asset_type: 'all'
  });

  const loadImages = async (resetOffset = false) => {
    setLoading(true);
    const newOffset = resetOffset ? 0 : offset;
    
    try {
      const params: Record<string, any> = {
        action: 'list_library',
        limit: 20,
        offset: newOffset
      };
      
      if (filters.style !== 'all') params.style = filters.style;
      if (filters.emotion !== 'all') params.emotion = filters.emotion;
      if (filters.scene_type !== 'all') params.scene_type = filters.scene_type;
      if (filters.asset_type !== 'all') params.asset_type = filters.asset_type;

      const { data, error } = await supabase.functions.invoke('generate-anime-library', {
        body: params
      });

      if (error) {
        console.warn('Edge function error (non-fatal):', error);
        return;
      }

      const imgList = Array.isArray(data?.images) ? data.images : [];

      if (resetOffset) {
        setImages(imgList);
        setOffset(0);
      } else {
        setImages(prev => [...prev, ...imgList]);
      }
      setTotal(typeof data?.total === 'number' ? data.total : 0);
    } catch (err) {
      console.error('Failed to load images:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadImages(true);
  }, [filters]);

  const handleFilterChange = (key: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleLoadMore = () => {
    setOffset(prev => prev + 20);
    loadImages(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <CardTitle className="flex items-center gap-2">
            <Grid3X3 className="h-5 w-5" />
            Galerie ({total} images)
          </CardTitle>
          
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="h-4 w-4 text-muted-foreground" />
            
            <Select value={filters.style} onValueChange={v => handleFilterChange('style', v)}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Style" />
              </SelectTrigger>
              <SelectContent>
                {STYLES.map(s => (
                  <SelectItem key={s} value={s} className="capitalize">
                    {s === 'all' ? 'Tous les styles' : s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.emotion} onValueChange={v => handleFilterChange('emotion', v)}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Émotion" />
              </SelectTrigger>
              <SelectContent>
                {EMOTIONS.map(e => (
                  <SelectItem key={e} value={e} className="capitalize">
                    {e === 'all' ? 'Toutes émotions' : e}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.scene_type} onValueChange={v => handleFilterChange('scene_type', v)}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Scène" />
              </SelectTrigger>
              <SelectContent>
                {SCENES.map(s => (
                  <SelectItem key={s} value={s} className="capitalize">
                    {s === 'all' ? 'Toutes scènes' : s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.asset_type} onValueChange={v => handleFilterChange('asset_type', v)}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                {ASSET_TYPES.map(t => (
                  <SelectItem key={t} value={t} className="capitalize">
                    {t === 'all' ? 'Photos & Vidéos' : t === 'image' ? '📸 Photos' : '🎬 Vidéos'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="ghost" size="icon" onClick={() => loadImages(true)}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {loading && images.length === 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <AspectRatio key={i} ratio={9/16} className="bg-muted rounded-lg overflow-hidden">
                <Skeleton className="w-full h-full" />
              </AspectRatio>
            ))}
          </div>
        ) : images.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            Aucune image trouvée avec ces filtres
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {images.map(image => {
                const isVideo = image.asset_type === 'video' || 
                  !!image.video_url?.match(/\.(mp4|webm|mov)$/i) ||
                  (!image.video_url && !!image.image_url?.match(/\.(mp4|webm|mov)$/i));
                const videoSrc = image.video_url || (isVideo ? image.image_url : null);
                const thumbSrc = image.image_url && !image.image_url.match(/\.(mp4|webm|mov)$/i) 
                  ? image.image_url : null;

                return (
                  <div key={image.id} className="group relative">
                    <AspectRatio ratio={9/16} className="bg-muted rounded-lg overflow-hidden">
                      {isVideo && videoSrc ? (
                        <LazyVideo src={videoSrc} poster={thumbSrc || undefined} />
                      ) : (
                        <LazyImage src={thumbSrc || image.image_url} alt={image.description_en} />
                      )}
                      {/* Video badge */}
                      {isVideo && (
                        <div className="absolute top-2 left-2">
                          <Badge variant="secondary" className="text-xs bg-black/60 text-white border-0">
                            <Film className="w-3 h-3 mr-1" />
                            Vidéo
                          </Badge>
                        </div>
                      )}
                    </AspectRatio>
                    <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-b-lg">
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="secondary" className="text-xs capitalize">
                          {image.style}
                        </Badge>
                        <Badge variant="outline" className="text-xs capitalize bg-black/50">
                          {image.emotion}
                        </Badge>
                      </div>
                      <p className="text-xs text-white/80 mt-1 line-clamp-2">
                        {image.scene_type} • {image.character_type}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {images.length < total && (
              <div className="flex justify-center mt-6">
                <Button
                  variant="outline"
                  onClick={handleLoadMore}
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : null}
                  Charger plus ({images.length}/{total})
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
