import { useCallback, useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface CorpusPhrase {
  id: string;
  text_bariba: string;
  text_french: string | null;
  category: string;
  source: string | null;
  word_count: number;
  difficulty: string;
  recordings_count: number;
}

export interface CorpusStats {
  total_phrases: number;
  user_recorded: number;
  remaining: number;
}

export interface CategoryInfo {
  name: string;
  count: number;
  user_recorded: number;
  remaining: number;
}

const QUEUE_REFILL_THRESHOLD = 5;
const QUEUE_FETCH_SIZE = 30;

export function useVoiceCorpus(category: string | 'all') {
  const { user } = useAuth();
  const [queue, setQueue] = useState<CorpusPhrase[]>([]);
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [stats, setStats] = useState<CorpusStats>({ total_phrases: 0, user_recorded: 0, remaining: 0 });
  const [loading, setLoading] = useState(false);
  const recordedIdsRef = useRef<Set<string>>(new Set());

  // Fetch user's already-recorded phrase IDs
  const refreshUserRecordings = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('bariba_voice_recordings')
      .select('phrase_id')
      .eq('user_id', user.id);
    recordedIdsRef.current = new Set((data || []).map(r => r.phrase_id));
  }, [user]);

  // Fetch categories with counts (one-shot, refreshed when user changes)
  const refreshCategories = useCallback(async () => {
    const { data: phrasesData } = await supabase
      .from('bariba_corpus_phrases')
      .select('category')
      .eq('is_active', true);
    if (!phrasesData) return;

    const totals: Record<string, number> = {};
    phrasesData.forEach(p => { totals[p.category] = (totals[p.category] || 0) + 1; });

    let userRecordedByCat: Record<string, number> = {};
    if (user) {
      const { data: recs } = await supabase
        .from('bariba_voice_recordings')
        .select('phrase_id, bariba_corpus_phrases!inner(category)')
        .eq('user_id', user.id);
      (recs || []).forEach((r: any) => {
        const cat = r.bariba_corpus_phrases?.category;
        if (cat) userRecordedByCat[cat] = (userRecordedByCat[cat] || 0) + 1;
      });
    }

    const list: CategoryInfo[] = Object.entries(totals)
      .map(([name, count]) => ({
        name,
        count,
        user_recorded: userRecordedByCat[name] || 0,
        remaining: Math.max(count - (userRecordedByCat[name] || 0), 0),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
    setCategories(list);
  }, [user]);

  useEffect(() => { refreshCategories(); }, [refreshCategories]);

  // Fetch global stats
  const refreshStats = useCallback(async () => {
    if (!user) return;
    const [{ count: total }, { count: recorded }] = await Promise.all([
      supabase.from('bariba_corpus_phrases').select('id', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('bariba_voice_recordings').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    ]);
    setStats({
      total_phrases: total || 0,
      user_recorded: recorded || 0,
      remaining: Math.max((total || 0) - (recorded || 0), 0),
    });
  }, [user]);

  // Fetch a fresh batch of phrases not yet recorded by this user
  const fetchBatch = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      await refreshUserRecordings();
      const recordedArray = Array.from(recordedIdsRef.current);

      let query = supabase
        .from('bariba_corpus_phrases')
        .select('*')
        .eq('is_active', true);

      if (category !== 'all') {
        query = query.eq('category', category);
      }

      // Exclude already-recorded ones (limit to a reasonable size to avoid URL bloat)
      if (recordedArray.length > 0 && recordedArray.length < 1000) {
        query = query.not('id', 'in', `(${recordedArray.join(',')})`);
      }

      // Privilege under-represented phrases, then random
      const { data, error } = await query
        .order('recordings_count', { ascending: true })
        .limit(QUEUE_FETCH_SIZE * 3);

      if (error) throw error;
      // shuffle client-side and keep first N
      const shuffled = (data || []).sort(() => Math.random() - 0.5).slice(0, QUEUE_FETCH_SIZE);
      setQueue(prev => {
        const existingIds = new Set(prev.map(p => p.id));
        const newOnes = shuffled.filter(p => !existingIds.has(p.id));
        return [...prev, ...newOnes];
      });
    } catch (e: any) {
      console.error('[useVoiceCorpus] fetchBatch error:', e);
      toast.error('Erreur de chargement des phrases');
    } finally {
      setLoading(false);
    }
  }, [user, category, refreshUserRecordings]);

  // Reset queue when category changes
  useEffect(() => {
    setQueue([]);
    if (user) {
      fetchBatch();
      refreshStats();
    }
  }, [category, user]);

  // Auto-refill
  useEffect(() => {
    if (!loading && queue.length < QUEUE_REFILL_THRESHOLD && user) {
      fetchBatch();
    }
  }, [queue.length, loading, user, fetchBatch]);

  // Pop the current phrase off the queue
  const advance = useCallback(() => {
    setQueue(prev => prev.slice(1));
  }, []);

  // Submit a recording
  const submitRecording = useCallback(async (
    phrase: CorpusPhrase,
    blob: Blob,
    durationSec: number,
  ) => {
    if (!user) {
      toast.error('Vous devez être connecté');
      return false;
    }

    const ext = blob.type.includes('mp4') ? 'mp4' : (blob.type.includes('webm') ? 'webm' : 'wav');
    const safeBaribaSlug = phrase.text_bariba
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .slice(0, 30);
    const fileName = `${phrase.category.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 20)}_${safeBaribaSlug}_${Date.now()}.${ext}`;
    const storagePath = `${user.id}/${phrase.id}_${fileName}`;

    try {
      // Upload to storage
      const { error: upErr } = await supabase.storage
        .from('bariba-voice-corpus')
        .upload(storagePath, blob, {
          contentType: blob.type,
          upsert: false,
        });
      if (upErr) throw upErr;

      // Insert DB row
      const { error: dbErr } = await supabase
        .from('bariba_voice_recordings')
        .insert({
          user_id: user.id,
          phrase_id: phrase.id,
          storage_path: storagePath,
          file_name: fileName,
          duration_seconds: durationSec,
          mime_type: blob.type,
          file_size_bytes: blob.size,
        });

      if (dbErr) {
        // Cleanup orphan file
        await supabase.storage.from('bariba-voice-corpus').remove([storagePath]);
        throw dbErr;
      }

      recordedIdsRef.current.add(phrase.id);
      setStats(s => ({
        ...s,
        user_recorded: s.user_recorded + 1,
        remaining: Math.max(s.remaining - 1, 0),
      }));
      return true;
    } catch (e: any) {
      console.error('[submitRecording] error:', e);
      toast.error(e.message || "Erreur lors de l'envoi");
      return false;
    }
  }, [user]);

  return {
    queue,
    categories,
    stats,
    loading,
    advance,
    submitRecording,
    refreshStats,
  };
}
