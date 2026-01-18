/**
 * Import History Panel
 * Shows all asset imports with filters, status, and retry actions
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  History, 
  RefreshCw, 
  Search, 
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  Upload,
  FileVideo,
  AlertTriangle,
  RotateCcw,
  ExternalLink,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAssetImport, ImportHistoryEntry, ImportStats } from '@/hooks/useAssetImport';

// ============================================================================
// COMPONENT
// ============================================================================

export const ImportHistoryPanel: React.FC = () => {
  const { 
    importHistory, 
    importStats,
    loadImportHistory, 
    loadImportStats,
    retryImport 
  } = useAssetImport();
  
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Load data on mount
  useEffect(() => {
    handleRefresh();
  }, []);

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        loadImportHistory(),
        loadImportStats()
      ]);
      toast.success('Historique actualisé');
    } catch (error) {
      toast.error('Erreur lors du chargement');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = async (importId: string) => {
    const success = await retryImport(importId);
    if (success) {
      toast.success('Import relancé');
      handleRefresh();
    }
  };

  // Filter entries
  const filteredHistory = importHistory.filter(entry => {
    const matchesSearch = 
      entry.original_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.target_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === 'all' || entry.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || entry.status === statusFilter;
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Get unique categories for filter
  const categories = Array.from(new Set(importHistory.map(e => e.category)));

  // Status badge helper
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'uploaded':
      case 'converted':
        return <Badge className="bg-green-500/20 text-green-500 border-green-500/30"><CheckCircle className="h-3 w-3 mr-1" /> Uploadé</Badge>;
      case 'failed':
        return <Badge className="bg-red-500/20 text-red-500 border-red-500/30"><XCircle className="h-3 w-3 mr-1" /> Échec</Badge>;
      case 'uploading':
        return <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/30"><Upload className="h-3 w-3 mr-1 animate-pulse" /> Upload...</Badge>;
      case 'converting':
        return <Badge className="bg-purple-500/20 text-purple-500 border-purple-500/30"><FileVideo className="h-3 w-3 mr-1 animate-spin" /> Conversion...</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30"><Clock className="h-3 w-3 mr-1" /> En attente</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Format file size
  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {importStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <History className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{importStats.total}</p>
                  <p className="text-xs text-muted-foreground">Total imports</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{importStats.uploaded}</p>
                  <p className="text-xs text-muted-foreground">Réussis</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/10">
                  <XCircle className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{importStats.failed}</p>
                  <p className="text-xs text-muted-foreground">Échecs</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <FileVideo className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{importStats.converting}</p>
                  <p className="text-xs text-muted-foreground">En conversion</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Errors Alert */}
      {importStats && importStats.recentErrors.length > 0 && (
        <Card className="border-red-500/30 bg-red-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-red-500">
              <AlertTriangle className="h-4 w-4" />
              Erreurs récentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {importStats.recentErrors.slice(0, 3).map((error) => (
                <div key={error.id} className="text-xs flex items-center justify-between p-2 bg-background/50 rounded">
                  <span className="font-mono truncate flex-1">{error.file}</span>
                  <span className="text-red-400 ml-2 truncate max-w-[200px]">{error.error}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main History Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Historique des Imports
              </CardTitle>
              <CardDescription>
                Tous les fichiers importés avec leur statut
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un fichier..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[150px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Catégorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="uploaded">Uploadé</SelectItem>
                <SelectItem value="converted">Converti</SelectItem>
                <SelectItem value="failed">Échec</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="uploading">Upload...</SelectItem>
                <SelectItem value="converting">Conversion...</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Fichier original</TableHead>
                  <TableHead>Fichier cible</TableHead>
                  <TableHead>Catégorie</TableHead>
                  <TableHead>Taille</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHistory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      {isLoading ? 'Chargement...' : 'Aucun import trouvé'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredHistory.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(new Date(entry.created_at), 'dd MMM yyyy HH:mm', { locale: fr })}
                      </TableCell>
                      <TableCell className="font-mono text-xs max-w-[150px] truncate" title={entry.original_name}>
                        {entry.original_name}
                      </TableCell>
                      <TableCell className="font-mono text-xs max-w-[150px] truncate" title={entry.target_name}>
                        {entry.target_name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{entry.category}</Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {formatSize(entry.file_size)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(entry.status)}
                        {entry.error_message && (
                          <p className="text-xs text-red-400 mt-1 max-w-[150px] truncate" title={entry.error_message}>
                            {entry.error_message}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {entry.status === 'failed' && (
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleRetry(entry.id)}
                              title="Réessayer"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          )}
                          {entry.public_url && (
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => window.open(entry.public_url!, '_blank')}
                              title="Ouvrir"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Category Breakdown */}
      {importStats && Object.keys(importStats.byCategory).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Répartition par Catégorie</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(importStats.byCategory).map(([category, stats]) => (
                <div key={category} className="p-3 rounded-lg border bg-muted/30">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline" className="text-xs">{category}</Badge>
                    <span className="text-sm font-medium">{stats.total}</span>
                  </div>
                  <div className="flex gap-2 text-xs">
                    <span className="text-green-500">{stats.uploaded} ✓</span>
                    {stats.failed > 0 && (
                      <span className="text-red-500">{stats.failed} ✗</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ImportHistoryPanel;
