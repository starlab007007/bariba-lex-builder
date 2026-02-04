/**
 * Anime Library Grid Component
 * Displays generated images with filters
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { LibraryImage } from '@/hooks/useAnimeLibrary';
import { Loader2, Filter, Grid3X3, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const STYLES = ['all', 'african', 'fantasy', 'manga', 'chibi'];
const EMOTIONS = ['all', 'joy', 'sadness', 'wonder', 'fear', 'excitement', 'peace', 'tension'];
const SCENES = ['all', 'village', 'forest', 'river', 'mountain', 'market', 'home', 'night', 'journey', 'gathering', 'spirit'];

export function AnimeLibraryGrid() {
  const [images, setImages] = useState<LibraryImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [filters, setFilters] = useState({
    style: 'all',
    emotion: 'all',
    scene_type: 'all'
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

      const { data, error } = await supabase.functions.invoke('generate-anime-library', {
        body: params
      });

      if (error) throw error;

      if (resetOffset) {
        setImages(data.images || []);
        setOffset(0);
      } else {
        setImages(prev => [...prev, ...(data.images || [])]);
      }
      setTotal(data.total || 0);
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

            <Button variant="ghost" size="icon" onClick={() => loadImages(true)}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {loading && images.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : images.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            Aucune image trouvée avec ces filtres
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {images.map(image => (
                <div key={image.id} className="group relative">
                  <AspectRatio ratio={9/16} className="bg-muted rounded-lg overflow-hidden">
                    <img
                      src={image.image_url}
                      alt={image.description_en}
                      className="object-cover w-full h-full transition-transform group-hover:scale-105"
                      loading="lazy"
                    />
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
              ))}
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
