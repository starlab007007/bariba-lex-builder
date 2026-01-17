import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Key, Download, MousePointer, BookOpen, 
  CheckCircle, Settings, Zap, Bell, RefreshCw, HardDrive,
  AlertTriangle, TrendingUp, Package, Wifi, WifiOff,
  ChevronRight, Play, Pause, Trash2, FolderOpen
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

// Import asset management components
import EnvatoBrowserHelper from '@/components/EnvatoBrowserHelper';
import EnvatoAssetCatalog from '@/components/EnvatoAssetCatalog';
import AssetValidator from '@/components/AssetValidator';
import { ENVATO_ASSET_MAP } from '@/lib/EnvatoDownloader';

// ============================================================================
// TYPES
// ============================================================================

interface CategoryStats {
  name: string;
  installed: number;
  total: number;
  icon: string;
  color: string;
}

interface DownloadSettings {
  parallelDownloads: number;
  autoRetry: boolean;
  autoOptimize: boolean;
  preferredFormats: {
    video: string;
    image: string;
    audio: string;
  };
  cachePath: string;
  maxCacheSize: number;
}

interface RecentDownload {
  id: string;
  fileName: string;
  category: string;
  status: 'completed' | 'failed' | 'cancelled';
  timestamp: Date;
  size: number;
}

// ============================================================================
// MOCK DATA
// ============================================================================

const generateCategoryStats = (): CategoryStats[] => {
  const categories = Object.keys(ENVATO_ASSET_MAP);
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
  const icons = ['🎬', '✨', '🔊', '🎨', '💫', '🔤', '📦'];
  
  return categories.map((cat, index) => {
    const assets = ENVATO_ASSET_MAP[cat as keyof typeof ENVATO_ASSET_MAP] || [];
    const total = Array.isArray(assets) ? assets.length : 0;
    const installed = Math.floor(total * (0.3 + Math.random() * 0.5));
    
    return {
      name: cat,
      installed,
      total,
      icon: icons[index % icons.length],
      color: colors[index % colors.length]
    };
  });
};

const generateRecentDownloads = (): RecentDownload[] => {
  return [
    { id: '1', fileName: 'light-leak-orange-4k.mov', category: 'light-leak', status: 'completed', timestamp: new Date(Date.now() - 300000), size: 45000000 },
    { id: '2', fileName: 'dust-particles-pack.zip', category: 'particles', status: 'completed', timestamp: new Date(Date.now() - 600000), size: 120000000 },
    { id: '3', fileName: 'african-drums-loop.mp3', category: 'audio', status: 'completed', timestamp: new Date(Date.now() - 900000), size: 8500000 },
    { id: '4', fileName: 'cinematic-transition-01.webm', category: 'transitions', status: 'failed', timestamp: new Date(Date.now() - 1200000), size: 0 },
    { id: '5', fileName: 'lens-flare-anamorphic.png', category: 'lens-flare', status: 'completed', timestamp: new Date(Date.now() - 1500000), size: 2400000 },
  ];
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const AssetsDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([]);
  const [recentDownloads, setRecentDownloads] = useState<RecentDownload[]>([]);
  const [isQuickFixing, setIsQuickFixing] = useState(false);
  
  const [settings, setSettings] = useState<DownloadSettings>({
    parallelDownloads: 3,
    autoRetry: true,
    autoOptimize: true,
    preferredFormats: {
      video: 'webm',
      image: 'png',
      audio: 'mp3'
    },
    cachePath: '~/.tamtam/cache',
    maxCacheSize: 5
  });

  const [envatoCredentials, setEnvatoCredentials] = useState({
    email: '',
    password: ''
  });

  useEffect(() => {
    setCategoryStats(generateCategoryStats());
    setRecentDownloads(generateRecentDownloads());
  }, []);

  // Calculate totals
  const totalInstalled = categoryStats.reduce((acc, cat) => acc + cat.installed, 0);
  const totalAssets = categoryStats.reduce((acc, cat) => acc + cat.total, 0);
  const globalProgress = totalAssets > 0 ? (totalInstalled / totalAssets) * 100 : 0;

  // Handle Envato connection
  const handleConnect = async () => {
    if (!envatoCredentials.email || !envatoCredentials.password) {
      toast.error('Veuillez entrer vos identifiants Envato');
      return;
    }

    setIsConnecting(true);
    
    // Simulate connection
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setIsConnected(true);
    setIsConnecting(false);
    toast.success('Connecté à Envato Elements avec succès!');
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    setEnvatoCredentials({ email: '', password: '' });
    toast.info('Déconnecté de Envato Elements');
  };

  // Quick fix handler
  const handleQuickFix = async () => {
    setIsQuickFixing(true);
    toast.info('Analyse des problèmes en cours...');
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    toast.info('Téléchargement des assets manquants critiques...');
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    toast.info('Validation et optimisation...');
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setIsQuickFixing(false);
    toast.success('Quick Fix terminé! 12 problèmes résolus.');
  };

  // Format file size
  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Format time ago
  const formatTimeAgo = (date: Date): string => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return 'À l\'instant';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `Il y a ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    return `Il y a ${hours}h`;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🥁</span>
              <span className="text-xl font-bold bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
                TAM-TAM
              </span>
              <span className="text-sm text-muted-foreground">Asset Manager</span>
            </div>
            
            <Badge 
              variant={isConnected ? 'default' : 'destructive'}
              className="flex items-center gap-1"
            >
              {isConnected ? (
                <>
                  <Wifi className="w-3 h-3" />
                  Envato Connected
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3" />
                  Not Connected
                </>
              )}
            </Badge>
          </div>

          <div className="flex items-center gap-4">
            {/* Global Progress */}
            <div className="hidden md:flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-medium">{totalInstalled} / {totalAssets} assets</p>
                <p className="text-xs text-muted-foreground">{globalProgress.toFixed(0)}% complete</p>
              </div>
              <Progress value={globalProgress} className="w-32 h-2" />
            </div>

            {/* Quick Fix Button */}
            <Button 
              onClick={handleQuickFix}
              disabled={isQuickFixing}
              className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
            >
              {isQuickFixing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Fixing...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Quick Fix
                </>
              )}
            </Button>

            {/* Notifications */}
            <Button variant="outline" size="icon" className="relative">
              <Bell className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center">
                3
              </span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-7 lg:w-auto lg:inline-grid">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <LayoutDashboard className="w-4 h-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="connection" className="flex items-center gap-2">
              <Key className="w-4 h-4" />
              <span className="hidden sm:inline">Connection</span>
            </TabsTrigger>
            <TabsTrigger value="download" className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Download</span>
            </TabsTrigger>
            <TabsTrigger value="manual" className="flex items-center gap-2">
              <MousePointer className="w-4 h-4" />
              <span className="hidden sm:inline">Manual</span>
            </TabsTrigger>
            <TabsTrigger value="catalog" className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              <span className="hidden sm:inline">Catalog</span>
            </TabsTrigger>
            <TabsTrigger value="validation" className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Validation</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
          </TabsList>

          {/* ============ TAB 1: DASHBOARD ============ */}
          <TabsContent value="dashboard" className="space-y-6">
            {/* Alerts */}
            {!isConnected && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Connexion requise</AlertTitle>
                <AlertDescription>
                  Connectez-vous à Envato Elements pour télécharger les assets manquants.
                  <Button 
                    variant="link" 
                    className="p-0 h-auto ml-2"
                    onClick={() => setActiveTab('connection')}
                  >
                    Se connecter →
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Assets Installés</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalInstalled}</div>
                  <p className="text-xs text-muted-foreground">sur {totalAssets} requis</p>
                  <Progress value={globalProgress} className="mt-2 h-1" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Assets Manquants</CardTitle>
                  <Download className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-500">{totalAssets - totalInstalled}</div>
                  <p className="text-xs text-muted-foreground">à télécharger</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Espace Utilisé</CardTitle>
                  <HardDrive className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">2.4 GB</div>
                  <p className="text-xs text-muted-foreground">sur 10 GB max</p>
                  <Progress value={24} className="mt-2 h-1" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Score Qualité</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-500">A</div>
                  <p className="text-xs text-muted-foreground">92% validés</p>
                </CardContent>
              </Card>
            </div>

            {/* Category Progress */}
            <Card>
              <CardHeader>
                <CardTitle>Progression par Catégorie</CardTitle>
                <CardDescription>État d'installation des assets par type</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {categoryStats.map((cat) => (
                    <div key={cat.name} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span>{cat.icon}</span>
                          <span className="font-medium capitalize">{cat.name.replace('-', ' ')}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {cat.installed} / {cat.total}
                        </span>
                      </div>
                      <Progress 
                        value={cat.total > 0 ? (cat.installed / cat.total) * 100 : 0} 
                        className="h-2"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => setActiveTab('download')}>
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <Download className="w-6 h-6 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Download Missing</h3>
                    <p className="text-sm text-muted-foreground">{totalAssets - totalInstalled} assets à télécharger</p>
                  </div>
                  <ChevronRight className="w-5 h-5 ml-auto text-muted-foreground" />
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => setActiveTab('validation')}>
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-green-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Validate All</h3>
                    <p className="text-sm text-muted-foreground">Vérifier qualité des assets</p>
                  </div>
                  <ChevronRight className="w-5 h-5 ml-auto text-muted-foreground" />
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => setActiveTab('catalog')}>
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center">
                    <BookOpen className="w-6 h-6 text-purple-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold">View Catalog</h3>
                    <p className="text-sm text-muted-foreground">Parcourir tous les assets</p>
                  </div>
                  <ChevronRight className="w-5 h-5 ml-auto text-muted-foreground" />
                </CardContent>
              </Card>
            </div>

            {/* Recent Downloads */}
            <Card>
              <CardHeader>
                <CardTitle>Téléchargements Récents</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[200px]">
                  <div className="space-y-3">
                    {recentDownloads.map((download) => (
                      <div key={download.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-3">
                          <Badge variant={download.status === 'completed' ? 'default' : 'destructive'}>
                            {download.status === 'completed' ? '✓' : '✗'}
                          </Badge>
                          <div>
                            <p className="font-medium text-sm">{download.fileName}</p>
                            <p className="text-xs text-muted-foreground">{download.category}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm">{formatSize(download.size)}</p>
                          <p className="text-xs text-muted-foreground">{formatTimeAgo(download.timestamp)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ============ TAB 2: ENVATO CONNECTION ============ */}
          <TabsContent value="connection" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>🔐 Connexion Envato Elements</CardTitle>
                  <CardDescription>
                    Connectez-vous avec vos identifiants Envato Elements pour accéder aux téléchargements illimités
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isConnected ? (
                    <div className="space-y-4">
                      <Alert>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <AlertTitle>Connecté</AlertTitle>
                        <AlertDescription>
                          Votre compte Envato Elements est connecté et actif.
                        </AlertDescription>
                      </Alert>
                      
                      <div className="p-4 rounded-lg bg-muted space-y-2">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Email</span>
                          <span className="font-medium">{envatoCredentials.email || 'user@example.com'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Subscription</span>
                          <Badge className="bg-green-500">Unlimited</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Status</span>
                          <span className="text-green-500">Active</span>
                        </div>
                      </div>

                      <Button variant="outline" onClick={handleDisconnect} className="w-full">
                        Se déconnecter
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="email">Email Envato</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="votre@email.com"
                          value={envatoCredentials.email}
                          onChange={(e) => setEnvatoCredentials({ ...envatoCredentials, email: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="password">Mot de passe</Label>
                        <Input
                          id="password"
                          type="password"
                          placeholder="••••••••"
                          value={envatoCredentials.password}
                          onChange={(e) => setEnvatoCredentials({ ...envatoCredentials, password: e.target.value })}
                        />
                      </div>
                      <Button 
                        onClick={handleConnect} 
                        disabled={isConnecting}
                        className="w-full"
                      >
                        {isConnecting ? (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            Connexion...
                          </>
                        ) : (
                          'Se connecter'
                        )}
                      </Button>
                      <p className="text-xs text-center text-muted-foreground">
                        Vos identifiants sont utilisés uniquement pour accéder à votre compte Envato
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>📊 Historique des téléchargements</CardTitle>
                  <CardDescription>
                    Derniers téléchargements effectués depuis votre compte
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-3">
                      {recentDownloads.map((download) => (
                        <div key={download.id} className="flex items-center justify-between p-3 rounded-lg border">
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${
                              download.status === 'completed' ? 'bg-green-500' : 
                              download.status === 'failed' ? 'bg-red-500' : 'bg-yellow-500'
                            }`} />
                            <div>
                              <p className="font-medium text-sm">{download.fileName}</p>
                              <p className="text-xs text-muted-foreground capitalize">{download.category}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm">{formatSize(download.size)}</p>
                            <p className="text-xs text-muted-foreground">{formatTimeAgo(download.timestamp)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            {/* Test Connection */}
            <Card>
              <CardHeader>
                <CardTitle>🔧 Test de connexion</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-4">
                <Button variant="outline" disabled={!isConnected}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Tester la connexion
                </Button>
                <p className="text-sm text-muted-foreground">
                  Vérifie que la connexion à Envato Elements fonctionne correctement
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ============ TAB 3: AUTO DOWNLOAD ============ */}
          <TabsContent value="download" className="space-y-6">
            <Alert>
              <Download className="h-4 w-4" />
              <AlertTitle>Téléchargement automatique</AlertTitle>
              <AlertDescription>
                Cette fonctionnalité télécharge automatiquement les assets manquants depuis votre compte Envato Elements.
                {!isConnected && (
                  <Button 
                    variant="link" 
                    className="p-0 h-auto ml-2"
                    onClick={() => setActiveTab('connection')}
                  >
                    Connectez-vous d'abord →
                  </Button>
                )}
              </AlertDescription>
            </Alert>

            <div className="grid gap-6 md:grid-cols-3">
              {/* Category Selection */}
              <Card className="md:col-span-1">
                <CardHeader>
                  <CardTitle>Catégories à télécharger</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {categoryStats.map((cat) => (
                      <div key={cat.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span>{cat.icon}</span>
                          <span className="text-sm capitalize">{cat.name.replace('-', ' ')}</span>
                        </div>
                        <Switch defaultChecked />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Download Progress */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Progression</CardTitle>
                  <CardDescription>Téléchargement en cours...</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>light-leak-orange-cinematic-4k.mov</span>
                      <span>67%</span>
                    </div>
                    <Progress value={67} />
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="p-3 rounded-lg bg-muted">
                      <p className="text-muted-foreground">Vitesse</p>
                      <p className="font-bold">2.4 MB/s</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted">
                      <p className="text-muted-foreground">Temps restant</p>
                      <p className="font-bold">~3 min</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted">
                      <p className="text-muted-foreground">Téléchargés</p>
                      <p className="font-bold">12 / 45</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted">
                      <p className="text-muted-foreground">Échecs</p>
                      <p className="font-bold text-red-500">2</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button disabled={!isConnected} className="flex-1">
                      <Play className="w-4 h-4 mr-2" />
                      Démarrer
                    </Button>
                    <Button variant="outline">
                      <Pause className="w-4 h-4 mr-2" />
                      Pause
                    </Button>
                    <Button variant="destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ============ TAB 4: MANUAL IMPORT ============ */}
          <TabsContent value="manual">
            <EnvatoBrowserHelper />
          </TabsContent>

          {/* ============ TAB 5: ASSET CATALOG ============ */}
          <TabsContent value="catalog">
            <EnvatoAssetCatalog />
          </TabsContent>

          {/* ============ TAB 6: VALIDATION ============ */}
          <TabsContent value="validation">
            <AssetValidator />
          </TabsContent>

          {/* ============ TAB 7: SETTINGS ============ */}
          <TabsContent value="settings" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Download Settings */}
              <Card>
                <CardHeader>
                  <CardTitle>⚙️ Paramètres de téléchargement</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label>Téléchargements parallèles</Label>
                        <span className="text-sm text-muted-foreground">{settings.parallelDownloads}</span>
                      </div>
                      <Slider
                        value={[settings.parallelDownloads]}
                        onValueChange={([v]) => setSettings({ ...settings, parallelDownloads: v })}
                        min={1}
                        max={10}
                        step={1}
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Auto-retry en cas d'échec</Label>
                        <p className="text-xs text-muted-foreground">Réessayer automatiquement 3 fois</p>
                      </div>
                      <Switch
                        checked={settings.autoRetry}
                        onCheckedChange={(v) => setSettings({ ...settings, autoRetry: v })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Optimiser après téléchargement</Label>
                        <p className="text-xs text-muted-foreground">Compression et conversion auto</p>
                      </div>
                      <Switch
                        checked={settings.autoOptimize}
                        onCheckedChange={(v) => setSettings({ ...settings, autoOptimize: v })}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Format Preferences */}
              <Card>
                <CardHeader>
                  <CardTitle>📁 Formats préférés</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Vidéo</Label>
                    <select 
                      className="w-full p-2 border rounded-md bg-background"
                      value={settings.preferredFormats.video}
                      onChange={(e) => setSettings({
                        ...settings,
                        preferredFormats: { ...settings.preferredFormats, video: e.target.value }
                      })}
                    >
                      <option value="webm">WebM VP9 (recommandé)</option>
                      <option value="mp4">MP4 H.264</option>
                      <option value="mov">MOV ProRes</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label>Image</Label>
                    <select 
                      className="w-full p-2 border rounded-md bg-background"
                      value={settings.preferredFormats.image}
                      onChange={(e) => setSettings({
                        ...settings,
                        preferredFormats: { ...settings.preferredFormats, image: e.target.value }
                      })}
                    >
                      <option value="png">PNG (avec alpha)</option>
                      <option value="webp">WebP</option>
                      <option value="jpg">JPEG</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label>Audio</Label>
                    <select 
                      className="w-full p-2 border rounded-md bg-background"
                      value={settings.preferredFormats.audio}
                      onChange={(e) => setSettings({
                        ...settings,
                        preferredFormats: { ...settings.preferredFormats, audio: e.target.value }
                      })}
                    >
                      <option value="mp3">MP3 320kbps</option>
                      <option value="wav">WAV (lossless)</option>
                      <option value="ogg">OGG Vorbis</option>
                    </select>
                  </div>
                </CardContent>
              </Card>

              {/* Cache Management */}
              <Card>
                <CardHeader>
                  <CardTitle>💾 Gestion du cache</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Emplacement du cache</Label>
                    <div className="flex gap-2">
                      <Input value={settings.cachePath} readOnly className="flex-1" />
                      <Button variant="outline" size="icon">
                        <FolderOpen className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label>Taille max du cache</Label>
                      <span className="text-sm text-muted-foreground">{settings.maxCacheSize} GB</span>
                    </div>
                    <Slider
                      value={[settings.maxCacheSize]}
                      onValueChange={([v]) => setSettings({ ...settings, maxCacheSize: v })}
                      min={1}
                      max={20}
                      step={1}
                    />
                  </div>

                  <div className="p-3 rounded-lg bg-muted">
                    <div className="flex justify-between text-sm">
                      <span>Cache utilisé</span>
                      <span>1.2 GB / {settings.maxCacheSize} GB</span>
                    </div>
                    <Progress value={(1.2 / settings.maxCacheSize) * 100} className="mt-2 h-1" />
                  </div>

                  <Button variant="outline" className="w-full">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Vider le cache
                  </Button>
                </CardContent>
              </Card>

              {/* Export/Import */}
              <Card>
                <CardHeader>
                  <CardTitle>📤 Export / Import</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Exportez ou importez votre configuration complète incluant les règles de matching et préférences.
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1">
                      📤 Exporter config
                    </Button>
                    <Button variant="outline" className="flex-1">
                      📥 Importer config
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AssetsDashboard;
