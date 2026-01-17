import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Download, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  ExternalLink,
  ChevronDown,
  Lock,
  Loader2,
  FolderOpen,
  Scan
} from 'lucide-react';
import { EnvatoDownloadInterface } from './EnvatoDownloadInterface';

interface AssetCategory {
  id: string;
  name: string;
  path: string;
  expected: number;
  formats: string[];
  envatoSearchUrl: string;
}

interface MissingAsset {
  filename: string;
  category: string;
  envatoName: string;
  envatoUrl: string;
  selected: boolean;
}

interface CategoryStatus {
  category: string;
  expected: number;
  found: number;
  lfsPointers: number;
  missing: number;
  status: 'complete' | 'partial' | 'missing';
  downloading: boolean;
  downloadProgress: number;
}

const ASSET_CATEGORIES: AssetCategory[] = [
  { id: 'lens-flare', name: 'Lens Flare', path: 'lens-flare', expected: 455, formats: ['png'], envatoSearchUrl: 'https://elements.envato.com/graphic-templates/textures-and-backgrounds/lens-flares' },
  { id: 'light-leak', name: 'Light Leak', path: 'light-leak', expected: 17, formats: ['webm', 'mp4'], envatoSearchUrl: 'https://elements.envato.com/video-templates/light-leaks' },
  { id: 'particles', name: 'Particles', path: 'particles', expected: 37, formats: ['webm', 'mp4'], envatoSearchUrl: 'https://elements.envato.com/video-templates/particles' },
  { id: 'transitions', name: 'Transitions', path: 'transitions', expected: 32, formats: ['mp4'], envatoSearchUrl: 'https://elements.envato.com/video-templates/transitions' },
  { id: 'textures', name: 'Textures', path: 'textures', expected: 215, formats: ['png', 'mp4'], envatoSearchUrl: 'https://elements.envato.com/graphic-templates/textures-and-backgrounds' },
  { id: '3d-models', name: '3D Models', path: '3d-models', expected: 22, formats: ['glb'], envatoSearchUrl: 'https://elements.envato.com/3d/models' },
  { id: 'fonts', name: 'Fonts', path: 'fonts', expected: 9, formats: ['ttf', 'otf'], envatoSearchUrl: 'https://elements.envato.com/fonts' },
  { id: 'audio-modern', name: 'Audio Modern', path: 'audio/modern', expected: 10, formats: ['mp3'], envatoSearchUrl: 'https://elements.envato.com/music/modern' },
  { id: 'audio-traditional', name: 'Audio Traditional', path: 'audio/traditional', expected: 8, formats: ['mp3'], envatoSearchUrl: 'https://elements.envato.com/music/world' },
  { id: 'audio-percussion', name: 'Audio Percussion', path: 'audio/percussion', expected: 8, formats: ['mp3'], envatoSearchUrl: 'https://elements.envato.com/music/percussion' },
];

// Sample known files for scanning
const SAMPLE_FILES: Record<string, string[]> = {
  'lens-flare': ['flare-001.png', 'flare-002.png', 'flare-003.png', 'flare-010.png', 'flare-015.png'],
  'light-leak': ['leak-warm-001.webm', 'leak-cool-001.webm', 'leak-golden-001.mp4'],
  'particles': ['dust-particles-001.webm', 'sparkles-001.webm', 'smoke-001.mp4'],
  'transitions': ['wipe-001.mp4', 'dissolve-001.mp4', 'zoom-001.mp4'],
  'textures': ['grunge-001.png', 'paper-001.png', 'noise-001.png'],
  '3d-models': ['drum-djembe.glb', 'mask-traditional.glb', 'pottery-001.glb'],
  'fonts': ['AfricanFont-Regular.ttf', 'BaribaScript.ttf'],
  'audio/modern': ['afrobeat-groove-001.mp3', 'highlife-rhythm-001.mp3'],
  'audio/traditional': ['talking-drum-001.mp3', 'balafon-melody-001.mp3'],
  'audio/percussion': ['djembe-pattern-001.mp3', 'shekere-loop-001.mp3'],
};

export function EnvatoAssetManager() {
  const [isConnected, setIsConnected] = useState(false);
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const [categoryStatuses, setCategoryStatuses] = useState<CategoryStatus[]>([]);
  const [missingAssets, setMissingAssets] = useState<MissingAsset[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const checkIfLfsPointer = async (url: string): Promise<boolean> => {
    try {
      const response = await fetch(url);
      const contentLength = response.headers.get('content-length');
      if (contentLength && parseInt(contentLength) < 200) {
        const text = await response.text();
        return text.includes('version https://git-lfs.github.com');
      }
      return false;
    } catch {
      return true; // Consider missing files as needing download
    }
  };

  const runScan = useCallback(async () => {
    setIsScanning(true);
    setScanComplete(false);
    const statuses: CategoryStatus[] = [];
    const missing: MissingAsset[] = [];

    for (const category of ASSET_CATEGORIES) {
      const sampleFiles = SAMPLE_FILES[category.path] || [];
      let foundCount = 0;
      let lfsCount = 0;

      for (const filename of sampleFiles) {
        const url = `/assets/envato/${category.path}/${filename}`;
        try {
          const isLfs = await checkIfLfsPointer(url);
          if (isLfs) {
            lfsCount++;
            missing.push({
              filename,
              category: category.id,
              envatoName: filename.replace(/[-_]/g, ' ').replace(/\.\w+$/, ''),
              envatoUrl: `${category.envatoSearchUrl}?q=${encodeURIComponent(filename.replace(/[-_\d]/g, ' ').trim())}`,
              selected: false,
            });
          } else {
            foundCount++;
          }
        } catch {
          lfsCount++;
        }
      }

      // Extrapolate based on sample
      const sampleRatio = sampleFiles.length > 0 ? foundCount / sampleFiles.length : 0;
      const estimatedFound = Math.round(category.expected * sampleRatio);
      const estimatedLfs = Math.round(category.expected * (lfsCount / Math.max(sampleFiles.length, 1)));
      const estimatedMissing = category.expected - estimatedFound;

      statuses.push({
        category: category.id,
        expected: category.expected,
        found: estimatedFound,
        lfsPointers: estimatedLfs,
        missing: estimatedMissing,
        status: estimatedFound === category.expected ? 'complete' : estimatedFound > 0 ? 'partial' : 'missing',
        downloading: false,
        downloadProgress: 0,
      });
    }

    setCategoryStatuses(statuses);
    setMissingAssets(missing);
    setIsScanning(false);
    setScanComplete(true);
  }, []);

  const handleConnect = async () => {
    if (!email || !token) return;
    setIsConnecting(true);
    
    // Simulate connection - in real implementation, validate with Envato API
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Store credentials securely (in real app, use secure storage)
    localStorage.setItem('envato_connected', 'true');
    setIsConnected(true);
    setIsConnecting(false);
  };

  const handleDownloadCategory = async (categoryId: string) => {
    setCategoryStatuses(prev => prev.map(s => 
      s.category === categoryId ? { ...s, downloading: true, downloadProgress: 0 } : s
    ));

    // Simulate download progress
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(resolve => setTimeout(resolve, 200));
      setCategoryStatuses(prev => prev.map(s => 
        s.category === categoryId ? { ...s, downloadProgress: i } : s
      ));
    }

    setCategoryStatuses(prev => prev.map(s => 
      s.category === categoryId ? { ...s, downloading: false, status: 'complete', found: s.expected, missing: 0 } : s
    ));
  };

  const toggleAssetSelection = (filename: string) => {
    setMissingAssets(prev => prev.map(a => 
      a.filename === filename ? { ...a, selected: !a.selected } : a
    ));
  };

  const toggleCategoryExpand = (categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const getStatusBadge = (status: CategoryStatus['status']) => {
    switch (status) {
      case 'complete':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><CheckCircle2 className="w-3 h-3 mr-1" />Complet</Badge>;
      case 'partial':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30"><AlertTriangle className="w-3 h-3 mr-1" />Partiel</Badge>;
      case 'missing':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30"><XCircle className="w-3 h-3 mr-1" />Manquant</Badge>;
    }
  };

  const totalExpected = ASSET_CATEGORIES.reduce((sum, c) => sum + c.expected, 0);
  const totalFound = categoryStatuses.reduce((sum, s) => sum + s.found, 0);
  const totalMissing = categoryStatuses.reduce((sum, s) => sum + s.missing, 0);

  return (
    <Tabs defaultValue="scan" className="space-y-6">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="scan" className="flex items-center gap-2">
          <Scan className="h-4 w-4" />
          Scan Assets
        </TabsTrigger>
        <TabsTrigger value="download" className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          📥 Download
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="download">
        <EnvatoDownloadInterface />
      </TabsContent>
      
      <TabsContent value="scan" className="space-y-6">
      {/* Envato Authentication */}
      <Card className="bg-card/50 backdrop-blur border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary" />
            Connexion Envato Elements
          </CardTitle>
          <CardDescription>
            Connectez-vous pour télécharger les assets premium manquants
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isConnected ? (
            <div className="flex items-center gap-3 p-4 bg-green-500/10 rounded-lg border border-green-500/30">
              <CheckCircle2 className="w-6 h-6 text-green-400" />
              <div>
                <p className="font-medium text-green-400">✅ Connected to Envato Elements</p>
                <p className="text-sm text-muted-foreground">{email}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Envato</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="votre@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-background/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="token">API Token / Password</Label>
                  <Input
                    id="token"
                    type="password"
                    placeholder="••••••••••••"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    className="bg-background/50"
                  />
                </div>
              </div>
              <Button 
                onClick={handleConnect} 
                disabled={isConnecting || !email || !token}
                className="w-full md:w-auto"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Connexion...
                  </>
                ) : (
                  <>
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Connect to Envato Elements
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scan Controls */}
      <Card className="bg-card/50 backdrop-blur border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-primary" />
                Scanner les Assets
              </CardTitle>
              <CardDescription>
                Détecte les pointeurs Git LFS et assets manquants dans public/assets/envato/
              </CardDescription>
            </div>
            <Button onClick={runScan} disabled={isScanning} variant="outline">
              {isScanning ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Scan en cours...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {scanComplete ? 'Re-scan' : 'Lancer le scan'}
                </>
              )}
            </Button>
          </div>
        </CardHeader>

        {scanComplete && (
          <CardContent className="space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-muted/30 rounded-lg text-center">
                <p className="text-2xl font-bold text-primary">{totalExpected}</p>
                <p className="text-sm text-muted-foreground">Attendus</p>
              </div>
              <div className="p-4 bg-green-500/10 rounded-lg text-center">
                <p className="text-2xl font-bold text-green-400">{totalFound}</p>
                <p className="text-sm text-muted-foreground">Trouvés</p>
              </div>
              <div className="p-4 bg-red-500/10 rounded-lg text-center">
                <p className="text-2xl font-bold text-red-400">{totalMissing}</p>
                <p className="text-sm text-muted-foreground">Manquants</p>
              </div>
            </div>

            {/* Category Table */}
            <Table>
              <TableHeader>
                <TableRow className="border-primary/20">
                  <TableHead>Catégorie</TableHead>
                  <TableHead className="text-center">Attendus</TableHead>
                  <TableHead className="text-center">Trouvés</TableHead>
                  <TableHead className="text-center">Manquants</TableHead>
                  <TableHead>Progression</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categoryStatuses.map((status) => {
                  const category = ASSET_CATEGORIES.find(c => c.id === status.category);
                  const categoryMissing = missingAssets.filter(a => a.category === status.category);
                  const isExpanded = expandedCategories.has(status.category);

                  return (
                    <Collapsible key={status.category} open={isExpanded}>
                      <TableRow className="border-primary/10 hover:bg-muted/30">
                        <TableCell>
                          <CollapsibleTrigger asChild>
                            <button 
                              className="flex items-center gap-2 font-medium hover:text-primary transition-colors"
                              onClick={() => toggleCategoryExpand(status.category)}
                            >
                              <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                              {category?.name}
                            </button>
                          </CollapsibleTrigger>
                        </TableCell>
                        <TableCell className="text-center">{status.expected}</TableCell>
                        <TableCell className="text-center text-green-400">{status.found}</TableCell>
                        <TableCell className="text-center text-red-400">{status.missing}</TableCell>
                        <TableCell className="w-32">
                          <Progress 
                            value={status.downloading ? status.downloadProgress : (status.found / status.expected) * 100} 
                            className="h-2"
                          />
                        </TableCell>
                        <TableCell>{getStatusBadge(status.status)}</TableCell>
                        <TableCell className="text-right">
                          {status.status !== 'complete' && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={!isConnected || status.downloading}
                              onClick={() => handleDownloadCategory(status.category)}
                              className="text-xs"
                            >
                              {status.downloading ? (
                                <>
                                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                  {status.downloadProgress}%
                                </>
                              ) : (
                                <>
                                  <Download className="w-3 h-3 mr-1" />
                                  Download
                                </>
                              )}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                      <CollapsibleContent asChild>
                        <TableRow className="bg-muted/10">
                          <TableCell colSpan={7} className="p-0">
                            <ScrollArea className="max-h-48">
                              <div className="p-4 space-y-2">
                                {categoryMissing.length > 0 ? (
                                  categoryMissing.map((asset) => (
                                    <div 
                                      key={asset.filename}
                                      className="flex items-center justify-between p-2 bg-background/50 rounded border border-primary/10"
                                    >
                                      <div className="flex items-center gap-3">
                                        <Checkbox
                                          checked={asset.selected}
                                          onCheckedChange={() => toggleAssetSelection(asset.filename)}
                                        />
                                        <div>
                                          <p className="font-mono text-sm">{asset.filename}</p>
                                          <p className="text-xs text-muted-foreground">{asset.envatoName}</p>
                                        </div>
                                      </div>
                                      <a
                                        href={asset.envatoUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1 text-xs text-primary hover:underline"
                                      >
                                        <ExternalLink className="w-3 h-3" />
                                        Envato
                                      </a>
                                    </div>
                                  ))
                                ) : (
                                  <p className="text-sm text-muted-foreground text-center py-4">
                                    Tous les assets de cette catégorie sont présents
                                  </p>
                                )}
                              </div>
                            </ScrollArea>
                          </TableCell>
                        </TableRow>
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        )}
      </Card>
      </TabsContent>
    </Tabs>
  );
}
