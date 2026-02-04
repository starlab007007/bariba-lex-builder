/**
 * useGriotDraft - Cloud draft management for Griot Animé
 * Handles auto-save, restore, and deletion of drafts in Supabase
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { AnimeStyleName } from '../AnimeStyleSelector';
import type { StoryScene } from './useAnimeStoryGenerator';

export interface GriotDraft {
  id: string;
  title: string | null;
  style: AnimeStyleName;
  duration: number;
  audioUrl: string | null;
  scenes: StoryScene[] | null;
  narratorAvatarUrl: string | null;
  step: string;
  createdAt: string;
  updatedAt: string;
}

export interface UseGriotDraftReturn {
  draft: GriotDraft | null;
  drafts: GriotDraft[];
  isLoading: boolean;
  isSaving: boolean;
  saveDraft: (data: Partial<Omit<GriotDraft, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<string | null>;
  loadDraft: (draftId: string) => Promise<GriotDraft | null>;
  deleteDraft: (draftId: string) => Promise<boolean>;
  fetchDrafts: () => Promise<void>;
  clearDraft: () => void;
  hasDraft: boolean;
}

export function useGriotDraft(): UseGriotDraftReturn {
  const { toast } = useToast();
  const [draft, setDraft] = useState<GriotDraft | null>(null);
  const [drafts, setDrafts] = useState<GriotDraft[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const draftIdRef = useRef<string | null>(null);

  // Convert DB row to GriotDraft
  const rowToDraft = (row: any): GriotDraft => ({
    id: row.id,
    title: row.title,
    style: (row.style as AnimeStyleName) || 'african',
    duration: row.duration || 30,
    audioUrl: row.audio_url,
    scenes: row.scenes as StoryScene[] | null,
    narratorAvatarUrl: row.narrator_avatar_url,
    step: row.step || 'create',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });

  // Fetch all drafts for current user
  const fetchDrafts = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setDrafts([]);
        return;
      }

      const { data, error } = await supabase
        .from('griot_drafts')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setDrafts((data || []).map(rowToDraft));
    } catch (err) {
      console.error('[useGriotDraft] fetchDrafts error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load a specific draft
  const loadDraft = useCallback(async (draftId: string): Promise<GriotDraft | null> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('griot_drafts')
        .select('*')
        .eq('id', draftId)
        .single();

      if (error) throw error;
      const loaded = rowToDraft(data);
      setDraft(loaded);
      draftIdRef.current = loaded.id;
      return loaded;
    } catch (err) {
      console.error('[useGriotDraft] loadDraft error:', err);
      toast({
        title: '❌ Erreur',
        description: 'Impossible de charger le brouillon',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Save (upsert) draft
  const saveDraft = useCallback(async (
    data: Partial<Omit<GriotDraft, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<string | null> => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: '⚠️ Connexion requise',
          description: 'Connecte-toi pour sauvegarder ton brouillon.',
        });
        return null;
      }

      const payload: Record<string, unknown> = {
        user_id: user.id,
        title: data.title ?? draft?.title ?? null,
        style: data.style ?? draft?.style ?? 'african',
        duration: data.duration ?? draft?.duration ?? 30,
        audio_url: data.audioUrl ?? draft?.audioUrl ?? null,
        scenes: data.scenes ?? draft?.scenes ?? null,
        narrator_avatar_url: data.narratorAvatarUrl ?? draft?.narratorAvatarUrl ?? null,
        step: data.step ?? draft?.step ?? 'create',
      };

      let result: any;
      if (draftIdRef.current) {
        // Update existing
        const { data: updated, error } = await supabase
          .from('griot_drafts')
          .update(payload)
          .eq('id', draftIdRef.current)
          .select()
          .single();
        if (error) throw error;
        result = updated;
      } else {
        // Insert new
        const { data: inserted, error } = await supabase
          .from('griot_drafts')
          .insert(payload as any)
          .select()
          .single();
        if (error) throw error;
        result = inserted;
        draftIdRef.current = result.id;
      }

      const saved = rowToDraft(result);
      setDraft(saved);
      console.log('[useGriotDraft] Draft saved:', saved.id);
      return saved.id;
    } catch (err) {
      console.error('[useGriotDraft] saveDraft error:', err);
      toast({
        title: '❌ Erreur',
        description: 'Impossible de sauvegarder le brouillon',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [draft, toast]);

  // Delete a draft
  const deleteDraft = useCallback(async (draftId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('griot_drafts')
        .delete()
        .eq('id', draftId);
      if (error) throw error;

      setDrafts(prev => prev.filter(d => d.id !== draftId));
      if (draftIdRef.current === draftId) {
        draftIdRef.current = null;
        setDraft(null);
      }
      console.log('[useGriotDraft] Draft deleted:', draftId);
      return true;
    } catch (err) {
      console.error('[useGriotDraft] deleteDraft error:', err);
      return false;
    }
  }, []);

  // Clear current draft context (without deleting from DB)
  const clearDraft = useCallback(() => {
    draftIdRef.current = null;
    setDraft(null);
  }, []);

  // Fetch drafts on mount
  useEffect(() => {
    fetchDrafts();
  }, [fetchDrafts]);

  return {
    draft,
    drafts,
    isLoading,
    isSaving,
    saveDraft,
    loadDraft,
    deleteDraft,
    fetchDrafts,
    clearDraft,
    hasDraft: drafts.length > 0,
  };
}

export default useGriotDraft;
