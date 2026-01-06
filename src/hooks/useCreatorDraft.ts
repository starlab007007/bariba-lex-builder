// Auto-save draft system for creator content
import { useState, useEffect, useCallback, useRef } from 'react';
import { MiniTimelineSegment } from '@/components/tamtam/creator/MiniTimeline';
import { CaptureEffects } from '@/components/tamtam/creator/CreatorEffectsData';
import { Caption } from '@/components/tamtam/creator/CaptionsDrawer';
import { SelectedMusic } from '@/components/tamtam/creator/MusicDrawer';

export interface CreatorDraft {
  id: string;
  timestamp: number;
  segments: MiniTimelineSegment[];
  effects: CaptureEffects;
  caption: string;
  captions: Caption[];
  selectedMusic: SelectedMusic | null;
  transcript: string;
  transcriptBa: string;
  mode: string;
  canvasRatio: string;
  previewBlobUrl?: string;
}

const DRAFT_STORAGE_KEY = 'tamtam_creator_draft';
const AUTO_SAVE_INTERVAL = 10000; // 10 seconds
const MAX_DRAFTS = 5;

export function useCreatorDraft() {
  const [drafts, setDrafts] = useState<CreatorDraft[]>([]);
  const [currentDraft, setCurrentDraft] = useState<CreatorDraft | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load drafts from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as CreatorDraft[];
        setDrafts(parsed);
      }
    } catch (error) {
      console.error('[Draft] Failed to load drafts:', error);
    }
  }, []);

  // Save drafts to localStorage
  const persistDrafts = useCallback((newDrafts: CreatorDraft[]) => {
    try {
      // Keep only latest MAX_DRAFTS
      const trimmed = newDrafts.slice(0, MAX_DRAFTS);
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(trimmed));
      setDrafts(trimmed);
    } catch (error) {
      console.error('[Draft] Failed to persist drafts:', error);
    }
  }, []);

  // Save current state as draft
  const saveDraft = useCallback((data: Omit<CreatorDraft, 'id' | 'timestamp'>) => {
    setIsSaving(true);
    
    const draft: CreatorDraft = {
      ...data,
      id: currentDraft?.id || `draft-${Date.now()}`,
      timestamp: Date.now(),
    };

    setCurrentDraft(draft);
    
    // Update drafts list
    const existingIndex = drafts.findIndex(d => d.id === draft.id);
    let newDrafts: CreatorDraft[];
    
    if (existingIndex >= 0) {
      newDrafts = [...drafts];
      newDrafts[existingIndex] = draft;
    } else {
      newDrafts = [draft, ...drafts];
    }
    
    persistDrafts(newDrafts);
    setLastSaved(new Date());
    setIsSaving(false);
    
    console.log('[Draft] Saved:', draft.id);
    return draft;
  }, [currentDraft, drafts, persistDrafts]);

  // Start auto-save timer
  const startAutoSave = useCallback((getData: () => Omit<CreatorDraft, 'id' | 'timestamp'>) => {
    if (autoSaveTimerRef.current) {
      clearInterval(autoSaveTimerRef.current);
    }
    
    autoSaveTimerRef.current = setInterval(() => {
      const data = getData();
      // Only save if there's actual content
      if (data.segments.length > 0 || data.transcript || data.caption) {
        saveDraft(data);
      }
    }, AUTO_SAVE_INTERVAL);
    
    return () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
      }
    };
  }, [saveDraft]);

  // Stop auto-save
  const stopAutoSave = useCallback(() => {
    if (autoSaveTimerRef.current) {
      clearInterval(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
  }, []);

  // Restore a draft
  const restoreDraft = useCallback((draftId: string): CreatorDraft | null => {
    const draft = drafts.find(d => d.id === draftId);
    if (draft) {
      setCurrentDraft(draft);
      console.log('[Draft] Restored:', draftId);
    }
    return draft || null;
  }, [drafts]);

  // Delete a draft
  const deleteDraft = useCallback((draftId: string) => {
    const newDrafts = drafts.filter(d => d.id !== draftId);
    persistDrafts(newDrafts);
    
    if (currentDraft?.id === draftId) {
      setCurrentDraft(null);
    }
    
    console.log('[Draft] Deleted:', draftId);
  }, [drafts, currentDraft, persistDrafts]);

  // Clear all drafts
  const clearAllDrafts = useCallback(() => {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    setDrafts([]);
    setCurrentDraft(null);
    console.log('[Draft] All drafts cleared');
  }, []);

  // Clear current draft (after successful publish)
  const clearCurrentDraft = useCallback(() => {
    if (currentDraft) {
      deleteDraft(currentDraft.id);
    }
    setCurrentDraft(null);
  }, [currentDraft, deleteDraft]);

  // Check if there's a recent draft
  const hasRecentDraft = useCallback(() => {
    if (drafts.length === 0) return false;
    const mostRecent = drafts[0];
    const hourAgo = Date.now() - (60 * 60 * 1000);
    return mostRecent.timestamp > hourAgo;
  }, [drafts]);

  // Format last saved time
  const formatLastSaved = useCallback(() => {
    if (!lastSaved) return null;
    const now = new Date();
    const diff = now.getTime() - lastSaved.getTime();
    
    if (diff < 60000) return 'À l\'instant';
    if (diff < 3600000) return `Il y a ${Math.floor(diff / 60000)} min`;
    return `Il y a ${Math.floor(diff / 3600000)}h`;
  }, [lastSaved]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAutoSave();
    };
  }, [stopAutoSave]);

  return {
    drafts,
    currentDraft,
    isSaving,
    lastSaved,
    saveDraft,
    startAutoSave,
    stopAutoSave,
    restoreDraft,
    deleteDraft,
    clearAllDrafts,
    clearCurrentDraft,
    hasRecentDraft,
    formatLastSaved,
  };
}

export default useCreatorDraft;
