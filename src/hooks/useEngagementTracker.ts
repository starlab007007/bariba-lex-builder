/**
 * Silent behavioral signal collector for video engagement tracking.
 * Batches engagement data and sends to DB every 5s or on unmount.
 */

import { useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface EngagementSignal {
  video_id: string;
  watch_duration_ms: number;
  video_duration_ms: number;
  completed: boolean;
  replayed: boolean;
  swipe_speed_ms: number | null;
  interaction_type: string;
}

const SESSION_ID = `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const BATCH_INTERVAL = 5000;

export function useEngagementTracker() {
  const batchRef = useRef<EngagementSignal[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  const flush = useCallback(async () => {
    if (batchRef.current.length === 0) return;
    const signals = [...batchRef.current];
    batchRef.current = [];

    const { data: { user } } = await supabase.auth.getUser();

    const rows = signals.map(s => ({
      user_id: user?.id || null,
      video_id: s.video_id,
      // DB expects integers
      watch_duration_ms: Number.isFinite(s.watch_duration_ms) ? Math.round(s.watch_duration_ms) : 0,
      video_duration_ms: Number.isFinite(s.video_duration_ms) ? Math.round(s.video_duration_ms) : 0,
      completed: s.completed,
      replayed: s.replayed,
      swipe_speed_ms: s.swipe_speed_ms == null ? null : (Number.isFinite(s.swipe_speed_ms) ? Math.round(s.swipe_speed_ms) : null),
      interaction_type: s.interaction_type,
      session_id: SESSION_ID,
    }));

    try {
      await supabase.from('video_engagements').insert(rows);
    } catch (e) {
      // Silent fail — don't disrupt UX
      console.debug('[engagement] flush error', e);
    }
  }, []);

  // Batch timer
  useEffect(() => {
    timerRef.current = setInterval(flush, BATCH_INTERVAL);
    return () => {
      clearInterval(timerRef.current);
      flush(); // flush remaining on unmount
    };
  }, [flush]);

  const trackView = useCallback((videoId: string, watchMs: number, totalMs: number, completed: boolean, replayed: boolean) => {
    batchRef.current.push({
      video_id: videoId,
      watch_duration_ms: watchMs,
      video_duration_ms: totalMs,
      completed,
      replayed,
      swipe_speed_ms: null,
      interaction_type: 'view',
    });
  }, []);

  const trackSwipe = useCallback((videoId: string, speedMs: number) => {
    batchRef.current.push({
      video_id: videoId,
      watch_duration_ms: 0,
      video_duration_ms: 0,
      completed: false,
      replayed: false,
      swipe_speed_ms: speedMs,
      interaction_type: 'view',
    });
  }, []);

  const trackInteraction = useCallback((videoId: string, type: 'like' | 'share' | 'comment' | 'bookmark') => {
    batchRef.current.push({
      video_id: videoId,
      watch_duration_ms: 0,
      video_duration_ms: 0,
      completed: false,
      replayed: false,
      swipe_speed_ms: null,
      interaction_type: type,
    });
  }, []);

  // Store local category preferences for personalization
  const recordCategoryEngagement = useCallback((category: string) => {
    try {
      const prefs = JSON.parse(localStorage.getItem('feed_cat_prefs') || '{}');
      prefs[category] = (prefs[category] || 0) + 1;
      localStorage.setItem('feed_cat_prefs', JSON.stringify(prefs));
    } catch {}
  }, []);

  return { trackView, trackSwipe, trackInteraction, recordCategoryEngagement, flush, SESSION_ID };
}
