import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Search, 
  Download, 
  Check, 
  ExternalLink, 
  Play, 
  Star, 
  Filter,
  Grid3X3,
  List,
  Plus,
  X,
  Trash2,
  ArrowUpDown,
  Sparkles,
  FolderOpen,
  HardDrive,
  Eye,
  Heart,
  Scale,
  ChevronRight,
  Clock,
  FileVideo,
  FileImage,
  FileAudio,
  Box,
  Type,
  ShoppingCart,
  Layers
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ENVATO_ASSET_MAP, getEnvatoUrl } from '@/lib/EnvatoDownloader';

// ============================================================================
// TYPES
// ============================================================================

interface EnvatoAsset {
  id: string;
  localName: string;
  envatoName: string;
  category: string;
  author: string;
  rating: number;
  tags: string[];
  thumbnail: string;
  previewUrl?: string;
  resolution: string;
  duration?: number;
  fileSize: string;
  format: string;
  hasAlpha?: boolean;
  isInstalled: boolean;
  isFavorite: boolean;
  isRecommended: boolean;
  license: string;
}

interface Collection {
  id: string;
  name: string;
  description: string;
  assetIds: string[];
  icon: string;
}

// ============================================================================
// MOCK DATA
// ============================================================================

const generateMockAssets = (): EnvatoAsset[] => {
  const assets: EnvatoAsset[] = [];
  
  // Light Leaks
  const lightLeakNames = [
    'Light Leak Orange 4K with Alpha',
    'Blue Cinematic Light Leak',
    'Golden Film Burn Overlay',
    'Warm Sunset Light Leak',
    'Cool Anamorphic Flare',
    'Rainbow Prism Effect',
    'Vintage Film Light Leak',
    'Neon Glow Light Effect',
  ];
  
  lightLeakNames.forEach((name, i) => {
    assets.push({
      id: `leak-${i + 1}`,
      localName: `leak-${String(i + 1).padStart(3, '0')}.webm`,
      envatoName: name,
      category: 'light-leak',
      author: ['VideoFX Pro', 'LightMaster', 'CinematicFX'][i % 3],
      rating: 4 + Math.random(),
      tags: ['4K', 'Alpha', 'Cinematic', 'Loop'].slice(0, 2 + Math.floor(Math.random() * 2)),
      thumbnail: `https://picsum.photos/seed/${name}/400/300`,
      resolution: '3840x2160',
      duration: 5 + Math.floor(Math.random() * 5),
      fileSize: `${10 + Math.floor(Math.random() * 20)} MB`,
      format: 'WebM VP9',
      hasAlpha: true,
      isInstalled: Math.random() > 0.6,
      isFavorite: Math.random() > 0.8,
      isRecommended: i < 3,
      license: 'Envato Elements',
    });
  });

  // Particles
  const particleNames = [
    'Golden Bokeh Particles',
    'Dust Floating Particles',
    'Snow Particles Overlay',
    'Sparkle Magic Particles',
    'Fire Embers Effect',
    'Confetti Celebration',
  ];
  
  particleNames.forEach((name, i) => {
    assets.push({
      id: `particle-${i + 1}`,
      localName: `particle-${String(i + 1).padStart(3, '0')}.webm`,
      envatoName: name,
      category: 'particles',
      author: ['ParticleFX', 'MotionElements', 'VFXStudio'][i % 3],
      rating: 4.2 + Math.random() * 0.8,
      tags: ['4K', 'Seamless', 'Loop'],
      thumbnail: `https://picsum.photos/seed/particle${i}/400/300`,
      resolution: '1920x1080',
      duration: 10,
      fileSize: `${5 + Math.floor(Math.random() * 10)} MB`,
      format: 'WebM VP9',
      hasAlpha: true,
      isInstalled: Math.random() > 0.5,
      isFavorite: Math.random() > 0.8,
      isRecommended: i === 0 || i === 3,
      license: 'Envato Elements',
    });
  });

  // Lens Flares
  for (let i = 1; i <= 10; i++) {
    assets.push({
      id: `flare-${i}`,
      localName: `flare-${String(i).padStart(3, '0')}.png`,
      envatoName: `Lens Flare Pack ${Math.ceil(i / 3)} - ${['Anamorphic', 'Cinematic', 'Natural', 'Warm'][i % 4]}`,
      category: 'lens-flare',
      author: 'LensFlarePro',
      rating: 4.5 + Math.random() * 0.5,
      tags: ['PNG', 'Transparent', 'High-Res'],
      thumbnail: `https://picsum.photos/seed/flare${i}/400/300`,
      resolution: '2048x2048',
      fileSize: `${1 + Math.floor(Math.random() * 3)} MB`,
      format: 'PNG-24',
      hasAlpha: true,
      isInstalled: Math.random() > 0.4,
      isFavorite: false,
      isRecommended: i <= 2,
      license: 'Envato Elements',
    });
  }

  // Audio
  const audioNames = [
    'Afrobeat Modern Groove',
    'African Percussion Pack',
    'Village Celebration Music',
    'Djembe Solo Performance',
    'Tribal Chant Ensemble',
    'Kora Meditation',
  ];
  
  audioNames.forEach((name, i) => {
    assets.push({
      id: `audio-${i + 1}`,
      localName: `audio-${String(i + 1).padStart(3, '0')}.mp3`,
      envatoName: name,
      category: 'audio',
      author: ['AfroBeats Studio', 'WorldMusic', 'TribalSounds'][i % 3],
      rating: 4.3 + Math.random() * 0.7,
      tags: ['MP3', '320kbps', 'Loop'],
      thumbnail: `https://picsum.photos/seed/audio${i}/400/300`,
      resolution: '320 kbps',
      duration: 30 + Math.floor(Math.random() * 60),
      fileSize: `${3 + Math.floor(Math.random() * 5)} MB`,
      format: 'MP3',
      isInstalled: Math.random() > 0.5,
      isFavorite: i === 0,
      isRecommended: i < 2,
      license: 'Envato Elements',
    });
  });

  // 3D Models
  const modelNames = [
    'African Mask 3D',
    'Djembe Drum Model',
    'Tribal Pattern 3D',
    'Baobab Tree',
  ];
  
  modelNames.forEach((name, i) => {
    assets.push({
      id: `model-${i + 1}`,
      localName: `model-${String(i + 1).padStart(3, '0')}.glb`,
      envatoName: name,
      category: '3d-models',
      author: '3DAfricaStudio',
      rating: 4.4 + Math.random() * 0.6,
      tags: ['GLB', 'Low-Poly', 'Textured'],
      thumbnail: `https://picsum.photos/seed/model${i}/400/300`,
      resolution: '12,500 polys',
      fileSize: `${5 + Math.floor(Math.random() * 10)} MB`,
      format: 'GLB',
      isInstalled: Math.random() > 0.6,
      isFavorite: false,
      isRecommended: i === 0,
      license: 'Envato Elements',
    });
  });

  return assets;
};

const COLLECTIONS: Collection[] = [
  {
    id: 'radio-village',
    name: 'For Radio Village Pro',
    description: 'Assets recommandés pour le template Radio Village Pro',
    assetIds: ['leak-1', 'particle-1', 'audio-1', 'audio-2'],
    icon: '📻',
  },
  {
    id: 'african-cultural',
    name: 'African Cultural Pack',
    description: 'Assets culturels africains pour storytelling authentique',
    assetIds: ['model-1', 'model-2', 'audio-3', 'audio-4'],
    icon: '🌍',
  },
  {
    id: 'cinematic',
    name: 'Cinematic Light Leaks',
    description: 'Collection premium de light leaks cinématiques',
    assetIds: ['leak-1', 'leak-2', 'leak-3', 'flare-1', 'flare-2'],
    icon: '🎬',
  },
];

// ============================================================================
// COMPONENT
// ============================================================================

export const EnvatoAssetCatalog: React.FC = () => {
  const { toast } = useToast();
  
  // État principal
  const [assets] = useState<EnvatoAsset[]>(() => generateMockAssets());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [qualityFilter, setQualityFilter] = useState<string>('all');
  const [styleFilter, setStyleFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Download queue
  const [downloadQueue, setDownloadQueue] = useState<string[]>([]);
  
  // Comparaison
  const [compareList, setCompareList] = useState<string[]>([]);
  const [showCompare, setShowCompare] = useState(false);
  
  // Preview modal
  const [previewAsset, setPreviewAsset] = useState<EnvatoAsset | null>(null);
  
  // Collections
  const [collections] = useState<Collection[]>(COLLECTIONS);
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);

  // Catégories disponibles
  const categories = useMemo(() => {
    const cats = [...new Set(assets.map(a => a.category))];
    return ['all', ...cats];
  }, [assets]);

  // Stats par catégorie
  const categoryStats = useMemo(() => {
    const stats: Record<string, { installed: number; total: number }> = {};
    assets.forEach(asset => {
      if (!stats[asset.category]) {
        stats[asset.category] = { installed: 0, total: 0 };
      }
      stats[asset.category].total++;
      if (asset.isInstalled) stats[asset.category].installed++;
    });
    return stats;
  }, [assets]);

  // Filtrer les assets
  const filteredAssets = useMemo(() => {
    return assets.filter(asset => {
      // Recherche
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!asset.envatoName.toLowerCase().includes(query) &&
            !asset.localName.toLowerCase().includes(query) &&
            !asset.tags.some(t => t.toLowerCase().includes(query))) {
          return false;
        }
      }
      
      // Catégorie
      if (selectedCategory !== 'all' && asset.category !== selectedCategory) {
        return false;
      }
      
      // Statut
      if (statusFilter === 'installed' && !asset.isInstalled) return false;
      if (statusFilter === 'missing' && asset.isInstalled) return false;
      
      // Qualité
      if (qualityFilter === '4k' && !asset.tags.includes('4K')) return false;
      if (qualityFilter === 'alpha' && !asset.hasAlpha) return false;
      
      // Collection
      if (selectedCollection) {
        const collection = collections.find(c => c.id === selectedCollection);
        if (collection && !collection.assetIds.includes(asset.id)) {
          return false;
        }
      }
      
      return true;
    });
  }, [assets, searchQuery, selectedCategory, statusFilter, qualityFilter, selectedCollection, collections]);

  // Assets recommandés
  const recommendedAssets = useMemo(() => {
    return assets.filter(a => a.isRecommended);
  }, [assets]);

  // Ajouter à la queue
  const addToQueue = (assetId: string) => {
    if (!downloadQueue.includes(assetId)) {
      setDownloadQueue(prev => [...prev, assetId]);
      toast({
        title: "Ajouté à la queue",
        description: "L'asset sera téléchargé avec les autres",
      });
    }
  };

  // Retirer de la queue
  const removeFromQueue = (assetId: string) => {
    setDownloadQueue(prev => prev.filter(id => id !== assetId));
  };

  // Télécharger la queue
  const downloadQueue_ = async () => {
    toast({
      title: `Téléchargement de ${downloadQueue.length} assets`,
      description: "Ouvrez chaque page Envato et glissez-déposez les fichiers",
    });
    
    // Ouvrir les liens Envato
    downloadQueue.forEach(assetId => {
      const asset = assets.find(a => a.id === assetId);
      if (asset) {
        const url = getEnvatoUrl(asset.category, asset.envatoName);
        window.open(url, '_blank');
      }
    });
  };

  // Toggle comparaison
  const toggleCompare = (assetId: string) => {
    if (compareList.includes(assetId)) {
      setCompareList(prev => prev.filter(id => id !== assetId));
    } else if (compareList.length < 4) {
      setCompareList(prev => [...prev, assetId]);
    } else {
      toast({
        title: "Maximum 4 assets",
        description: "Retirez un asset pour en ajouter un autre",
        variant: "destructive",
      });
    }
  };

  // Rendu des étoiles
  const renderRating = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map(star => (
          <Star 
            key={star} 
            className={`h-3 w-3 ${star <= rating ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground'}`} 
          />
        ))}
        <span className="text-xs text-muted-foreground ml-1">{rating.toFixed(1)}</span>
      </div>
    );
  };

  // Icône catégorie
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'light-leak': return <Sparkles className="h-4 w-4" />;
      case 'particles': return <Sparkles className="h-4 w-4" />;
      case 'lens-flare': return <FileImage className="h-4 w-4" />;
      case 'transitions': return <FileVideo className="h-4 w-4" />;
      case 'textures': return <Layers className="h-4 w-4" />;
      case '3d-models': return <Box className="h-4 w-4" />;
      case 'fonts': return <Type className="h-4 w-4" />;
      case 'audio': return <FileAudio className="h-4 w-4" />;
      default: return <FolderOpen className="h-4 w-4" />;
    }
  };

  // Stats globales
  const globalStats = useMemo(() => {
    const installed = assets.filter(a => a.isInstalled).length;
    const total = assets.length;
    const totalSize = assets.reduce((sum, a) => sum + parseInt(a.fileSize), 0);
    return { installed, total, totalSize };
  }, [assets]);

  return (
    <div className="space-y-6">
      {/* Header avec stats */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Envato Asset Catalog
              </CardTitle>
              <CardDescription>
                Catalogue visuel des assets Envato Elements pour TAM-TAM
              </CardDescription>
            </div>
            <div className="flex items-center gap-4">
              {/* Download Queue Badge */}
              {downloadQueue.length > 0 && (
                <Badge className="bg-primary gap-1">
                  <ShoppingCart className="h-3 w-3" />
                  {downloadQueue.length} in queue
                </Badge>
              )}
              {/* Compare Badge */}
              {compareList.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCompare(true)}
                >
                  <Scale className="h-4 w-4 mr-1" />
                  Compare ({compareList.length})
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Stats globales */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold">{globalStats.total}</div>
              <div className="text-sm text-muted-foreground">Total Assets</div>
            </div>
            <div className="text-center p-3 bg-green-500/10 rounded-lg">
              <div className="text-2xl font-bold text-green-500">{globalStats.installed}</div>
              <div className="text-sm text-muted-foreground">Installed</div>
            </div>
            <div className="text-center p-3 bg-orange-500/10 rounded-lg">
              <div className="text-2xl font-bold text-orange-500">{globalStats.total - globalStats.installed}</div>
              <div className="text-sm text-muted-foreground">Missing</div>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold flex items-center justify-center gap-1">
                <HardDrive className="h-5 w-5" />
                ~{globalStats.totalSize} MB
              </div>
              <div className="text-sm text-muted-foreground">Est. Size</div>
            </div>
          </div>
          
          {/* Progress par catégorie */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {Object.entries(categoryStats).map(([cat, stats]) => (
              <div key={cat} className="p-2 bg-muted/50 rounded flex items-center gap-2">
                {getCategoryIcon(cat)}
                <div className="flex-1">
                  <div className="text-xs font-medium capitalize">{cat.replace('-', ' ')}</div>
                  <Progress value={(stats.installed / stats.total) * 100} className="h-1 mt-1" />
                </div>
                <Badge variant="outline" className="text-xs">
                  {stats.installed}/{stats.total}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Filtres */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4">
            {/* Recherche */}
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher assets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            {/* Catégorie */}
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Catégorie" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat} className="capitalize">
                    {cat === 'all' ? 'Toutes' : cat.replace('-', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Statut */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="installed">Installés</SelectItem>
                <SelectItem value="missing">Manquants</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Qualité */}
            <Select value={qualityFilter} onValueChange={setQualityFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Qualité" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                <SelectItem value="4k">4K</SelectItem>
                <SelectItem value="alpha">Alpha Channel</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Collection */}
            <Select value={selectedCollection || 'none'} onValueChange={(v) => setSelectedCollection(v === 'none' ? null : v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Collection" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucune collection</SelectItem>
                {collections.map(col => (
                  <SelectItem key={col.id} value={col.id}>
                    {col.icon} {col.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* View mode */}
            <div className="flex border rounded-lg">
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      {recommendedAssets.length > 0 && selectedCategory === 'all' && !searchQuery && (
        <Card className="border-primary/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              Recommended for TAM-TAM
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="w-full">
              <div className="flex gap-4 pb-4">
                {recommendedAssets.slice(0, 6).map(asset => (
                  <Card 
                    key={asset.id} 
                    className="flex-shrink-0 w-[200px] cursor-pointer hover:border-primary transition-colors"
                    onClick={() => setPreviewAsset(asset)}
                  >
                    <div className="relative">
                      <img 
                        src={asset.thumbnail} 
                        alt={asset.envatoName}
                        className="w-full h-[120px] object-cover rounded-t-lg"
                      />
                      <Badge className="absolute top-2 left-2 bg-yellow-500 text-black">
                        ⭐ TAM-TAM Pick
                      </Badge>
                      {asset.isInstalled && (
                        <Badge className="absolute top-2 right-2 bg-green-500">
                          <Check className="h-3 w-3" />
                        </Badge>
                      )}
                    </div>
                    <CardContent className="p-3">
                      <div className="text-sm font-medium truncate">{asset.envatoName}</div>
                      <div className="text-xs text-muted-foreground truncate">{asset.localName}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Collections */}
      {!selectedCollection && selectedCategory === 'all' && !searchQuery && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              Collections
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {collections.map(collection => (
                <Card 
                  key={collection.id}
                  className="cursor-pointer hover:border-primary transition-colors"
                  onClick={() => setSelectedCollection(collection.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="text-3xl">{collection.icon}</div>
                      <div>
                        <div className="font-medium">{collection.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {collection.assetIds.length} assets
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 ml-auto text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Download Queue */}
      {downloadQueue.length > 0 && (
        <Card className="border-primary">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Download Queue ({downloadQueue.length})
              </CardTitle>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setDownloadQueue([])}>
                  <Trash2 className="h-4 w-4 mr-1" />
                  Clear
                </Button>
                <Button size="sm" onClick={downloadQueue_}>
                  <Download className="h-4 w-4 mr-1" />
                  Download All
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {downloadQueue.map(assetId => {
                const asset = assets.find(a => a.id === assetId);
                if (!asset) return null;
                return (
                  <Badge key={assetId} variant="secondary" className="gap-1 pr-1">
                    {asset.localName}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 ml-1"
                      onClick={() => removeFromQueue(assetId)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Grid des assets */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">
            {selectedCollection 
              ? collections.find(c => c.id === selectedCollection)?.name 
              : 'All Assets'
            } ({filteredAssets.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredAssets.map(asset => (
                <Card 
                  key={asset.id} 
                  className={`overflow-hidden cursor-pointer transition-all hover:shadow-lg ${
                    compareList.includes(asset.id) ? 'ring-2 ring-primary' : ''
                  }`}
                >
                  <div className="relative group">
                    <img 
                      src={asset.thumbnail} 
                      alt={asset.envatoName}
                      className="w-full h-[140px] object-cover"
                    />
                    
                    {/* Overlay on hover */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button size="sm" variant="secondary" onClick={() => setPreviewAsset(asset)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleCompare(asset.id);
                        }}
                      >
                        <Scale className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    {/* Badges */}
                    <div className="absolute top-2 left-2 flex flex-col gap-1">
                      {asset.isRecommended && (
                        <Badge className="bg-yellow-500 text-black text-xs">⭐ Pick</Badge>
                      )}
                      {asset.hasAlpha && (
                        <Badge variant="outline" className="bg-black/50 text-xs">Alpha</Badge>
                      )}
                    </div>
                    
                    {asset.isInstalled && (
                      <Badge className="absolute top-2 right-2 bg-green-500">
                        <Check className="h-3 w-3" />
                      </Badge>
                    )}
                  </div>
                  
                  <CardContent className="p-3">
                    <div className="text-sm font-medium truncate">{asset.envatoName}</div>
                    <div className="text-xs text-muted-foreground truncate mb-1">{asset.localName}</div>
                    
                    <div className="flex flex-wrap gap-1 mb-2">
                      {asset.tags.slice(0, 2).map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs px-1">{tag}</Badge>
                      ))}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      {renderRating(asset.rating)}
                      
                      {asset.isInstalled ? (
                        <Badge variant="secondary" className="text-xs">Installed</Badge>
                      ) : (
                        <Button 
                          size="sm" 
                          variant="ghost"
                          className="h-6 px-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            addToQueue(asset.id);
                          }}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="space-y-2">
                {filteredAssets.map(asset => (
                  <div 
                    key={asset.id}
                    className={`p-3 rounded-lg border flex items-center gap-4 hover:bg-muted/50 transition-colors ${
                      compareList.includes(asset.id) ? 'border-primary' : ''
                    }`}
                  >
                    <img 
                      src={asset.thumbnail} 
                      alt={asset.envatoName}
                      className="w-20 h-14 object-cover rounded"
                    />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{asset.envatoName}</span>
                        {asset.isRecommended && <Badge className="bg-yellow-500 text-black text-xs">⭐</Badge>}
                      </div>
                      <div className="text-sm text-muted-foreground">{asset.localName}</div>
                    </div>
                    
                    <div className="text-sm text-muted-foreground hidden md:block">
                      {asset.resolution}
                    </div>
                    
                    <div className="text-sm text-muted-foreground hidden md:block">
                      {asset.fileSize}
                    </div>
                    
                    {renderRating(asset.rating)}
                    
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="ghost" onClick={() => setPreviewAsset(asset)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => toggleCompare(asset.id)}>
                        <Scale className="h-4 w-4" />
                      </Button>
                      {asset.isInstalled ? (
                        <Badge className="bg-green-500"><Check className="h-3 w-3" /></Badge>
                      ) : (
                        <Button size="sm" onClick={() => addToQueue(asset.id)}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Preview Modal */}
      <Dialog open={!!previewAsset} onOpenChange={() => setPreviewAsset(null)}>
        <DialogContent className="max-w-4xl">
          {previewAsset && (
            <>
              <DialogHeader>
                <DialogTitle>{previewAsset.envatoName}</DialogTitle>
                <DialogDescription>
                  {previewAsset.localName} • {previewAsset.author}
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid md:grid-cols-2 gap-6">
                {/* Preview */}
                <div>
                  <img 
                    src={previewAsset.thumbnail} 
                    alt={previewAsset.envatoName}
                    className="w-full rounded-lg"
                  />
                </div>
                
                {/* Details */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="text-sm text-muted-foreground">Resolution</div>
                      <div className="font-medium">{previewAsset.resolution}</div>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="text-sm text-muted-foreground">File Size</div>
                      <div className="font-medium">{previewAsset.fileSize}</div>
                    </div>
                    {previewAsset.duration && (
                      <div className="p-3 bg-muted rounded-lg">
                        <div className="text-sm text-muted-foreground">Duration</div>
                        <div className="font-medium">{previewAsset.duration}s</div>
                      </div>
                    )}
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="text-sm text-muted-foreground">Format</div>
                      <div className="font-medium">{previewAsset.format}</div>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {previewAsset.tags.map(tag => (
                      <Badge key={tag} variant="outline">{tag}</Badge>
                    ))}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Rating:</span>
                    {renderRating(previewAsset.rating)}
                  </div>
                  
                  <div className="text-sm text-muted-foreground">
                    License: {previewAsset.license}
                  </div>
                </div>
              </div>
              
              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" asChild>
                  <a 
                    href={getEnvatoUrl(previewAsset.category, previewAsset.envatoName)} 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View on Envato
                  </a>
                </Button>
                <Button variant="outline" onClick={() => addToQueue(previewAsset.id)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add to Queue
                </Button>
                <Button onClick={() => {
                  const url = getEnvatoUrl(previewAsset.category, previewAsset.envatoName);
                  window.open(url, '_blank');
                  setPreviewAsset(null);
                }}>
                  <Download className="h-4 w-4 mr-2" />
                  Download Now
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Compare Modal */}
      <Dialog open={showCompare} onOpenChange={setShowCompare}>
        <DialogContent className="max-w-6xl">
          <DialogHeader>
            <DialogTitle>Compare Assets ({compareList.length})</DialogTitle>
          </DialogHeader>
          
          <div className={`grid gap-4 ${
            compareList.length === 2 ? 'grid-cols-2' : 
            compareList.length === 3 ? 'grid-cols-3' : 
            'grid-cols-4'
          }`}>
            {compareList.map(assetId => {
              const asset = assets.find(a => a.id === assetId);
              if (!asset) return null;
              
              return (
                <Card key={asset.id}>
                  <img 
                    src={asset.thumbnail} 
                    alt={asset.envatoName}
                    className="w-full h-[150px] object-cover"
                  />
                  <CardContent className="p-3 space-y-2">
                    <div className="font-medium text-sm truncate">{asset.envatoName}</div>
                    
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Resolution</span>
                        <span>{asset.resolution}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Size</span>
                        <span>{asset.fileSize}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Format</span>
                        <span>{asset.format}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Alpha</span>
                        <span>{asset.hasAlpha ? '✓ Yes' : '✗ No'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Rating</span>
                        <span>{asset.rating.toFixed(1)} ⭐</span>
                      </div>
                    </div>
                    
                    <Button 
                      className="w-full" 
                      size="sm"
                      variant="outline"
                      onClick={() => toggleCompare(asset.id)}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Remove
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompareList([])}>
              Clear All
            </Button>
            <DialogClose asChild>
              <Button>Done</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EnvatoAssetCatalog;
