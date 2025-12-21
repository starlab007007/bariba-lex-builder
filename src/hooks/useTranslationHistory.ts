import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface TranslationHistoryItem {
  id: string;
  source_text: string;
  translated_text: string;
  source_language: 'bariba' | 'french';
  target_language: 'bariba' | 'french';
  input_mode: string;
  is_favorite: boolean;
  confidence_score?: number;
  context_data?: any;
  created_at: string;
}

interface UseTranslationHistoryReturn {
  history: TranslationHistoryItem[];
  favorites: TranslationHistoryItem[];
  isLoading: boolean;
  sessionId: string;
  addToHistory: (item: Omit<TranslationHistoryItem, 'id' | 'created_at' | 'is_favorite'>) => Promise<void>;
  toggleFavorite: (id: string, isFavorite: boolean) => Promise<void>;
  deleteFromHistory: (id: string) => Promise<void>;
  searchHistory: (query: string) => Promise<TranslationHistoryItem[]>;
  clearHistory: () => Promise<void>;
  getRecentContext: (limit?: number) => TranslationHistoryItem[];
}

export const useTranslationHistory = (): UseTranslationHistoryReturn => {
  const [history, setHistory] = useState<TranslationHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  
  // Generate or retrieve session ID
  const [sessionId] = useState<string>(() => {
    const stored = sessionStorage.getItem('translator_session_id');
    if (stored) return stored;
    const newId = crypto.randomUUID();
    sessionStorage.setItem('translator_session_id', newId);
    return newId;
  });

  // Load history on mount
  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setIsLoading(true);
      
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      let query = supabase
        .from('translation_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (userId) {
        query = query.eq('user_id', userId);
      } else {
        query = query.eq('session_id', sessionId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[TranslationHistory] Load error:', error);
        return;
      }

      setHistory(data as TranslationHistoryItem[] || []);
    } catch (error) {
      console.error('[TranslationHistory] Load error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Get favorites
  const favorites = history.filter(item => item.is_favorite);

  // Add translation to history
  const addToHistory = useCallback(async (
    item: Omit<TranslationHistoryItem, 'id' | 'created_at' | 'is_favorite'>
  ) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      const newItem = {
        ...item,
        user_id: userId || null,
        session_id: sessionId,
        is_favorite: false
      };

      const { data, error } = await supabase
        .from('translation_history')
        .insert(newItem)
        .select()
        .single();

      if (error) {
        console.error('[TranslationHistory] Insert error:', error);
        return;
      }

      if (data) {
        setHistory(prev => [data as TranslationHistoryItem, ...prev]);
      }
    } catch (error) {
      console.error('[TranslationHistory] Insert error:', error);
    }
  }, [sessionId]);

  // Toggle favorite status
  const toggleFavorite = useCallback(async (id: string, isFavorite: boolean) => {
    try {
      const { error } = await supabase
        .from('translation_history')
        .update({ is_favorite: isFavorite })
        .eq('id', id);

      if (error) {
        toast({
          title: 'Erreur',
          description: 'Impossible de modifier le favori',
          variant: 'destructive'
        });
        return;
      }

      setHistory(prev => 
        prev.map(item => 
          item.id === id ? { ...item, is_favorite: isFavorite } : item
        )
      );

      toast({
        title: isFavorite ? '⭐ Ajouté aux favoris' : 'Retiré des favoris'
      });
    } catch (error) {
      console.error('[TranslationHistory] Toggle favorite error:', error);
    }
  }, [toast]);

  // Delete from history
  const deleteFromHistory = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('translation_history')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('[TranslationHistory] Delete error:', error);
        return;
      }

      setHistory(prev => prev.filter(item => item.id !== id));
    } catch (error) {
      console.error('[TranslationHistory] Delete error:', error);
    }
  }, []);

  // Search history
  const searchHistory = useCallback(async (query: string): Promise<TranslationHistoryItem[]> => {
    if (!query.trim()) return history;

    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      let dbQuery = supabase
        .from('translation_history')
        .select('*')
        .or(`source_text.ilike.%${query}%,translated_text.ilike.%${query}%`)
        .order('created_at', { ascending: false })
        .limit(50);

      if (userId) {
        dbQuery = dbQuery.eq('user_id', userId);
      } else {
        dbQuery = dbQuery.eq('session_id', sessionId);
      }

      const { data, error } = await dbQuery;

      if (error) {
        console.error('[TranslationHistory] Search error:', error);
        return [];
      }

      return data as TranslationHistoryItem[] || [];
    } catch (error) {
      console.error('[TranslationHistory] Search error:', error);
      return [];
    }
  }, [history, sessionId]);

  // Clear all history
  const clearHistory = useCallback(async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      let query = supabase.from('translation_history').delete();

      if (userId) {
        query = query.eq('user_id', userId);
      } else {
        query = query.eq('session_id', sessionId);
      }

      const { error } = await query;

      if (error) {
        console.error('[TranslationHistory] Clear error:', error);
        return;
      }

      setHistory([]);
      toast({
        title: 'Historique effacé'
      });
    } catch (error) {
      console.error('[TranslationHistory] Clear error:', error);
    }
  }, [sessionId, toast]);

  // Get recent context for conversation mode
  const getRecentContext = useCallback((limit = 5): TranslationHistoryItem[] => {
    return history.slice(0, limit);
  }, [history]);

  return {
    history,
    favorites,
    isLoading,
    sessionId,
    addToHistory,
    toggleFavorite,
    deleteFromHistory,
    searchHistory,
    clearHistory,
    getRecentContext
  };
};
