import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface SearchResult {
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio_audio_url: string | null;
  is_verified: boolean;
  followers_count: number;
}

export function useTamTamSearch() {
  const { user } = useAuth();
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [query, setQuery] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchUsers = useCallback(async (searchQuery: string) => {
    setQuery(searchQuery);
    
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    // Debounce search
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      
      try {
        const { data, error } = await supabase
          .from('tamtam_profiles')
          .select('user_id, username, display_name, avatar_url, bio_audio_url, is_verified, followers_count')
          .or(`username.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%`)
          .neq('user_id', user?.id || '')
          .limit(20);

        if (error) throw error;
        
        setResults(data || []);
      } catch (err) {
        console.error('Search error:', err);
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  }, [user?.id]);

  const clearSearch = useCallback(() => {
    setQuery('');
    setResults([]);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
  }, []);

  return {
    query,
    results,
    isSearching,
    searchUsers,
    clearSearch
  };
}
