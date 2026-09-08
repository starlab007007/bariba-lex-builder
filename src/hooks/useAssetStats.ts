/**
 * TAM-TAM Unified Asset Stats Hook
 * Hook unifié pour les statistiques d'assets en temps réel
 * Combine les données de asset_imports DB + AssetRealMapping
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { uniqueChannelName } from '@/lib/realtime';
import { ASSET_INVENTORY, getAssetStats as getLocalAssetStats } from '@/lib/AssetRealMapping';

// ============================================================================
// TYPES
// ============================================================================

export interface CategoryStats {
  // From database (imported assets)
  dbTotal: number;
  dbUploaded: number;
  dbFailed: number;
  dbPending: number;
  
  // From local mapping (expected assets)
  localAvailable: number;
  localExpected: number;
  
  // Combined
  totalInstalled: number;
  completionRate: number;
  status: 'complete' | 'partial' | 'empty' | 'error';
}

export interface UnifiedAssetStats {
  // Global stats
  totalExpected: number;
  totalInstalled: number;
  totalMissing: number;
  totalPending: number;
  totalFailed: number;
  globalCompletionRate: number;
  
  // By category
  byCategory: Record<string, CategoryStats>;
  
  // Quick accessors
  categoriesComplete: string[];
  categoriesPartial: string[];
  categoriesEmpty: string[];
  categoriesWithErrors: string[];
  
  // Metadata
  lastUpdated: Date;
  isLoading: boolean;
  isConnected: boolean;
}

const CATEGORIES = [
  'lens-flare',
  'light-leak', 
  'particles',
  'transitions',
  'textures',
  'audio',
  '3d-models',
  'fonts',
];

// ============================================================================
// HOOK
// ============================================================================

export function useAssetStats() {
  const [stats, setStats] = useState<UnifiedAssetStats>({
    totalExpected: 0,
    totalInstalled: 0,
    totalMissing: 0,
    totalPending: 0,
    totalFailed: 0,
    globalCompletionRate: 0,
    byCategory: {},
    categoriesComplete: [],
    categoriesPartial: [],
    categoriesEmpty: [],
    categoriesWithErrors: [],
    lastUpdated: new Date(),
    isLoading: true,
    isConnected: false,
  });

  // Calculate unified stats
  const calculateStats = useCallback(async () => {
    try {
      // 1. Get local asset stats from mapping
      const localStats = getLocalAssetStats();
      
      // 2. Get database import stats
      const { data: dbImports, error } = await supabase
        .from('asset_imports')
        .select('id, category, status');
      
      if (error) {
        console.error('Error fetching import stats:', error);
      }
      
      const imports = dbImports || [];
      
      // 3. Build category stats
      const byCategory: Record<string, CategoryStats> = {};
      
      for (const category of CATEGORIES) {
        const localInventory = ASSET_INVENTORY[category];
        const localCategoryStats = localStats.byCategory[category];
        const categoryImports = imports.filter(i => i.category === category);
        
        const dbUploaded = categoryImports.filter(i => 
          i.status === 'uploaded' || i.status === 'converted'
        ).length;
        const dbFailed = categoryImports.filter(i => i.status === 'failed').length;
        const dbPending = categoryImports.filter(i => 
          i.status === 'pending' || i.status === 'uploading' || i.status === 'converting'
        ).length;
        
        // Total installed = max of local available OR db uploaded (avoid double counting)
        const totalInstalled = Math.max(
          localCategoryStats?.available || 0,
          dbUploaded
        );
        
        const expected = localInventory?.expected || 0;
        const completionRate = expected > 0 
          ? Math.round((totalInstalled / expected) * 100) 
          : 0;
        
        let status: CategoryStats['status'] = 'empty';
        if (dbFailed > 0) {
          status = 'error';
        } else if (completionRate >= 100) {
          status = 'complete';
        } else if (completionRate > 0) {
          status = 'partial';
        }
        
        byCategory[category] = {
          dbTotal: categoryImports.length,
          dbUploaded,
          dbFailed,
          dbPending,
          localAvailable: localCategoryStats?.available || 0,
          localExpected: expected,
          totalInstalled,
          completionRate,
          status,
        };
      }
      
      // 4. Calculate global stats
      let totalExpected = 0;
      let totalInstalled = 0;
      let totalPending = 0;
      let totalFailed = 0;
      const categoriesComplete: string[] = [];
      const categoriesPartial: string[] = [];
      const categoriesEmpty: string[] = [];
      const categoriesWithErrors: string[] = [];
      
      for (const [category, catStats] of Object.entries(byCategory)) {
        totalExpected += catStats.localExpected;
        totalInstalled += catStats.totalInstalled;
        totalPending += catStats.dbPending;
        totalFailed += catStats.dbFailed;
        
        if (catStats.status === 'complete') {
          categoriesComplete.push(category);
        } else if (catStats.status === 'partial') {
          categoriesPartial.push(category);
        } else if (catStats.status === 'empty') {
          categoriesEmpty.push(category);
        }
        
        if (catStats.dbFailed > 0) {
          categoriesWithErrors.push(category);
        }
      }
      
      const globalCompletionRate = totalExpected > 0 
        ? Math.round((totalInstalled / totalExpected) * 100) 
        : 0;
      
      setStats({
        totalExpected,
        totalInstalled,
        totalMissing: totalExpected - totalInstalled,
        totalPending,
        totalFailed,
        globalCompletionRate,
        byCategory,
        categoriesComplete,
        categoriesPartial,
        categoriesEmpty,
        categoriesWithErrors,
        lastUpdated: new Date(),
        isLoading: false,
        isConnected: true,
      });
      
    } catch (err) {
      console.error('Error calculating asset stats:', err);
      setStats(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  // Initial load
  useEffect(() => {
    calculateStats();
  }, [calculateStats]);

  // Setup Realtime subscription for live updates
  useEffect(() => {
    const channel = supabase
      .channel(uniqueChannelName('asset_stats_updates'))
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'asset_imports',
        },
        () => {
          // Recalculate stats on any change
          calculateStats();
        }
      )
      .subscribe((status) => {
        setStats(prev => ({ ...prev, isConnected: status === 'SUBSCRIBED' }));
      });

    return () => {
      channel.unsubscribe();
    };
  }, [calculateStats]);

  // Manual refresh function
  const refresh = useCallback(() => {
    setStats(prev => ({ ...prev, isLoading: true }));
    return calculateStats();
  }, [calculateStats]);

  // Get stats for a specific category
  const getCategoryStats = useCallback((category: string): CategoryStats | null => {
    return stats.byCategory[category] || null;
  }, [stats.byCategory]);

  // Check if a category is complete
  const isCategoryComplete = useCallback((category: string): boolean => {
    return stats.categoriesComplete.includes(category);
  }, [stats.categoriesComplete]);

  // Get categories that need attention
  const getCategoriesNeedingAttention = useMemo(() => {
    return [...stats.categoriesWithErrors, ...stats.categoriesEmpty];
  }, [stats.categoriesWithErrors, stats.categoriesEmpty]);

  return {
    stats,
    refresh,
    getCategoryStats,
    isCategoryComplete,
    getCategoriesNeedingAttention,
  };
}

// ============================================================================
// QUICK STATS HOOK (Lighter version for summary displays)
// ============================================================================

export function useQuickAssetStats() {
  const [quickStats, setQuickStats] = useState({
    total: 0,
    installed: 0,
    pending: 0,
    failed: 0,
    completionRate: 0,
  });

  useEffect(() => {
    const fetchQuickStats = async () => {
      try {
        const { data, error } = await supabase
          .from('asset_imports')
          .select('status');
        
        if (error) return;
        
        const imports = data || [];
        const uploaded = imports.filter(i => 
          i.status === 'uploaded' || i.status === 'converted'
        ).length;
        const pending = imports.filter(i => 
          i.status === 'pending' || i.status === 'uploading'
        ).length;
        const failed = imports.filter(i => i.status === 'failed').length;
        
        // Combine with local stats
        const localStats = getLocalAssetStats();
        const totalInstalled = Math.max(localStats.totalAvailable, uploaded);
        
        setQuickStats({
          total: localStats.totalExpected,
          installed: totalInstalled,
          pending,
          failed,
          completionRate: localStats.totalExpected > 0 
            ? Math.round((totalInstalled / localStats.totalExpected) * 100)
            : 0,
        });
      } catch (err) {
        console.error('Error fetching quick stats:', err);
      }
    };

    fetchQuickStats();

    // Subscribe to changes
    const channel = supabase
      .channel(uniqueChannelName('quick_stats'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'asset_imports' }, fetchQuickStats)
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  return quickStats;
}
