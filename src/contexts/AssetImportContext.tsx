/**
 * TAM-TAM Asset Import Context
 * Contexte global pour la persistance des assets importés avec Supabase Realtime
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { uniqueChannelName } from '@/lib/realtime';
import { toast } from 'sonner';

// ============================================================================
// TYPES
// ============================================================================

export interface ImportedAssetRecord {
  id: string;
  user_id: string | null;
  original_name: string;
  target_name: string;
  category: string;
  storage_path: string;
  public_url: string | null;
  file_size: number;
  mime_type: string | null;
  status: 'pending' | 'uploading' | 'uploaded' | 'converting' | 'converted' | 'failed';
  error_message: string | null;
  needs_conversion: boolean | null;
  original_format: string | null;
  converted_format: string | null;
  conversion_progress: number | null;
  created_at: string | null;
  uploaded_at: string | null;
  converted_at: string | null;
}

export interface AssetStats {
  total: number;
  uploaded: number;
  failed: number;
  pending: number;
  converting: number;
  byCategory: Record<string, {
    total: number;
    uploaded: number;
    failed: number;
    pending: number;
  }>;
}

interface AssetImportContextType {
  // State
  importedAssets: ImportedAssetRecord[];
  stats: AssetStats;
  isLoading: boolean;
  isConnected: boolean;
  
  // Actions
  refreshAssets: () => Promise<void>;
  refreshStats: () => Promise<void>;
  deleteAsset: (id: string) => Promise<boolean>;
  retryAsset: (id: string) => Promise<boolean>;
  getAssetsByCategory: (category: string) => ImportedAssetRecord[];
  getAssetsByStatus: (status: string) => ImportedAssetRecord[];
}

const defaultStats: AssetStats = {
  total: 0,
  uploaded: 0,
  failed: 0,
  pending: 0,
  converting: 0,
  byCategory: {},
};

// ============================================================================
// CONTEXT
// ============================================================================

const AssetImportContext = createContext<AssetImportContextType | undefined>(undefined);

// ============================================================================
// PROVIDER
// ============================================================================

interface AssetImportProviderProps {
  children: ReactNode;
}

export const AssetImportProvider: React.FC<AssetImportProviderProps> = ({ children }) => {
  const [importedAssets, setImportedAssets] = useState<ImportedAssetRecord[]>([]);
  const [stats, setStats] = useState<AssetStats>(defaultStats);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);

  // Calculate stats from assets
  const calculateStats = useCallback((assets: ImportedAssetRecord[]): AssetStats => {
    const byCategory: Record<string, { total: number; uploaded: number; failed: number; pending: number }> = {};
    
    for (const asset of assets) {
      if (!byCategory[asset.category]) {
        byCategory[asset.category] = { total: 0, uploaded: 0, failed: 0, pending: 0 };
      }
      
      byCategory[asset.category].total++;
      
      if (asset.status === 'uploaded' || asset.status === 'converted') {
        byCategory[asset.category].uploaded++;
      } else if (asset.status === 'failed') {
        byCategory[asset.category].failed++;
      } else if (asset.status === 'pending') {
        byCategory[asset.category].pending++;
      }
    }
    
    return {
      total: assets.length,
      uploaded: assets.filter(a => a.status === 'uploaded' || a.status === 'converted').length,
      failed: assets.filter(a => a.status === 'failed').length,
      pending: assets.filter(a => a.status === 'pending').length,
      converting: assets.filter(a => a.status === 'converting').length,
      byCategory,
    };
  }, []);

  // Load all assets from database
  const refreshAssets = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('asset_imports')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error loading assets:', error);
        return;
      }
      
      const assets = (data || []) as ImportedAssetRecord[];
      setImportedAssets(assets);
      setStats(calculateStats(assets));
    } catch (err) {
      console.error('Exception loading assets:', err);
    }
  }, [calculateStats]);

  // Refresh stats only (lighter operation)
  const refreshStats = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('asset_imports')
        .select('id, category, status');
      
      if (error) {
        console.error('Error loading stats:', error);
        return;
      }
      
      const assets = (data || []) as Pick<ImportedAssetRecord, 'id' | 'category' | 'status'>[];
      setStats(calculateStats(assets as ImportedAssetRecord[]));
    } catch (err) {
      console.error('Exception loading stats:', err);
    }
  }, [calculateStats]);

  // Delete an asset
  const deleteAsset = useCallback(async (id: string): Promise<boolean> => {
    try {
      const asset = importedAssets.find(a => a.id === id);
      
      // Delete from storage if exists
      if (asset?.storage_path) {
        await supabase.storage
          .from('envato-assets')
          .remove([asset.storage_path]);
      }
      
      // Delete from database
      const { error } = await supabase
        .from('asset_imports')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('Error deleting asset:', error);
        toast.error('Erreur lors de la suppression');
        return false;
      }
      
      // Update local state
      setImportedAssets(prev => prev.filter(a => a.id !== id));
      toast.success('Asset supprimé');
      return true;
    } catch (err) {
      console.error('Exception deleting asset:', err);
      return false;
    }
  }, [importedAssets]);

  // Retry a failed asset
  const retryAsset = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('asset_imports')
        .update({ status: 'pending', error_message: null })
        .eq('id', id);
      
      if (error) {
        console.error('Error retrying asset:', error);
        toast.error('Erreur lors du retry');
        return false;
      }
      
      // Update local state
      setImportedAssets(prev => prev.map(a => 
        a.id === id ? { ...a, status: 'pending' as const, error_message: null } : a
      ));
      
      toast.info('Asset marqué pour réessai. Veuillez le télécharger à nouveau.');
      return true;
    } catch (err) {
      console.error('Exception retrying asset:', err);
      return false;
    }
  }, []);

  // Get assets by category
  const getAssetsByCategory = useCallback((category: string): ImportedAssetRecord[] => {
    return importedAssets.filter(a => a.category === category);
  }, [importedAssets]);

  // Get assets by status
  const getAssetsByStatus = useCallback((status: string): ImportedAssetRecord[] => {
    return importedAssets.filter(a => a.status === status);
  }, [importedAssets]);

  // Initial load
  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      await refreshAssets();
      setIsLoading(false);
    };
    
    loadInitialData();
  }, [refreshAssets]);

  // Setup Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(uniqueChannelName('asset_imports_changes'))
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'asset_imports',
        },
        (payload) => {
          console.log('Asset import change:', payload);
          
          if (payload.eventType === 'INSERT') {
            const newAsset = payload.new as ImportedAssetRecord;
            setImportedAssets(prev => [newAsset, ...prev]);
            toast.success(`Asset importé: ${newAsset.original_name}`);
          } else if (payload.eventType === 'UPDATE') {
            const updatedAsset = payload.new as ImportedAssetRecord;
            setImportedAssets(prev => prev.map(a => 
              a.id === updatedAsset.id ? updatedAsset : a
            ));
            
            if (updatedAsset.status === 'uploaded' || updatedAsset.status === 'converted') {
              toast.success(`Upload terminé: ${updatedAsset.target_name}`);
            } else if (updatedAsset.status === 'failed') {
              toast.error(`Échec: ${updatedAsset.original_name}`);
            }
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as ImportedAssetRecord).id;
            setImportedAssets(prev => prev.filter(a => a.id !== deletedId));
          }
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
        if (status === 'SUBSCRIBED') {
          console.log('Realtime connected for asset_imports');
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, []);

  // Recalculate stats when assets change
  useEffect(() => {
    setStats(calculateStats(importedAssets));
  }, [importedAssets, calculateStats]);

  const value: AssetImportContextType = {
    importedAssets,
    stats,
    isLoading,
    isConnected,
    refreshAssets,
    refreshStats,
    deleteAsset,
    retryAsset,
    getAssetsByCategory,
    getAssetsByStatus,
  };

  return (
    <AssetImportContext.Provider value={value}>
      {children}
    </AssetImportContext.Provider>
  );
};

// ============================================================================
// HOOK
// ============================================================================

export function useAssetImportContext() {
  const context = useContext(AssetImportContext);
  if (context === undefined) {
    throw new Error('useAssetImportContext must be used within an AssetImportProvider');
  }
  return context;
}

// Optional hook that doesn't throw if used outside provider
export function useAssetImportContextOptional(): AssetImportContextType | null {
  return useContext(AssetImportContext) ?? null;
}
