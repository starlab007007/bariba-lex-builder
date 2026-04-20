/**
 * Adaptive recommendation algorithm for TikTok-style video feed.
 * Replaces chronological sort with engagement-based ranking + exploration.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { FeedVideo } from './useVideoFeed';

interface VideoWithScore extends FeedVideo {
  _score: number;
}

interface AggregateStats {
  video_id: string;
  avg_watch_ratio: number;
  completion_rate: number;
  replay_rate: number;
  avg_swipe_speed: number | null;
  engagement_count: number;
  view_count: number;
}

const PAGE_SIZE = 30;
const EXPLORATION_RATIO = 0.2; // 20% exploration
const RESHUFFLE_INTERVAL_MS = 90_000; // re-rank every 90s
const FRESH_BOOST_HOURS = 1;
const FRESH_BOOST_POINTS = 25;
const NOISE_AMPLITUDE = 8; // ± points (Thompson-style soft randomization)

// Box-Muller gaussian noise (mean 0, std ~1) → scaled
function gaussianNoise(amplitude: number): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const n = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return Math.max(-amplitude, Math.min(amplitude, n * amplitude * 0.5));
}

export function useAdaptiveFeed() {
  const [videos, setVideos] = useState<FeedVideo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const offsetRef = useRef(0);
  const isFetchingRef = useRef(false);
  const seenIdsRef = useRef(new Set<string>());
  const statsCache = useRef<Map<string, AggregateStats>>(new Map());

  // Get user category preferences from localStorage
  const categoryPrefs = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('feed_cat_prefs') || '{}') as Record<string, number>;
    } catch { return {}; }
  }, []);

  // Fetch aggregate engagement stats for a batch of video IDs
  const fetchAggregateStats = useCallback(async (videoIds: string[]) => {
    if (videoIds.length === 0) return;
    
    try {
      const { data } = await supabase
        .from('video_engagements')
        .select('video_id, watch_duration_ms, video_duration_ms, completed, replayed, swipe_speed_ms, interaction_type')
        .in('video_id', videoIds);

      if (!data) return;

      // Aggregate per video
      const grouped = new Map<string, typeof data>();
      for (const row of data) {
        const arr = grouped.get(row.video_id) || [];
        arr.push(row);
        grouped.set(row.video_id, arr);
      }

      for (const [videoId, rows] of grouped) {
        const views = rows.filter(r => r.interaction_type === 'view');
        const viewCount = Math.max(views.length, 1);
        
        const avgWatchRatio = views.length > 0
          ? views.reduce((sum, r) => {
              const dur = r.video_duration_ms || 1;
              return sum + Math.min((r.watch_duration_ms || 0) / dur, 2);
            }, 0) / viewCount
          : 0.5;

        const completionRate = views.length > 0
          ? views.filter(r => r.completed).length / viewCount
          : 0;

        const replayRate = views.length > 0
          ? views.filter(r => r.replayed).length / viewCount
          : 0;

        const swipeSpeeds = views.filter(r => r.swipe_speed_ms != null).map(r => r.swipe_speed_ms!);
        const avgSwipeSpeed = swipeSpeeds.length > 0
          ? swipeSpeeds.reduce((a, b) => a + b, 0) / swipeSpeeds.length
          : null;

        const engagementCount = rows.filter(r => 
          r.interaction_type !== 'view'
        ).length;

        statsCache.current.set(videoId, {
          video_id: videoId,
          avg_watch_ratio: avgWatchRatio,
          completion_rate: completionRate,
          replay_rate: replayRate,
          avg_swipe_speed: avgSwipeSpeed,
          engagement_count: engagementCount,
          view_count: viewCount,
        });
      }
    } catch (e) {
      console.debug('[adaptiveFeed] stats fetch error', e);
    }
  }, []);

  // Score a single video
  const scoreVideo = useCallback((video: FeedVideo): number => {
    const stats = statsCache.current.get(video.id);
    
    // Base scores from aggregate engagement data
    const watchRatio = stats ? Math.min(stats.avg_watch_ratio, 1.5) : 0.5;
    const completionRate = stats?.completion_rate ?? 0;
    const replayRate = stats?.replay_rate ?? 0;
    const engagementNorm = stats ? Math.min(stats.engagement_count / Math.max(stats.view_count, 1), 1) : 0;
    
    // Recency: decay over 7 days
    const ageHours = (Date.now() - new Date(video.createdAt).getTime()) / (1000 * 60 * 60);
    const recency = Math.max(0, 1 - ageHours / (7 * 24));

    // Freshness boost: < 1h published → +25 points
    const freshBoost = ageHours < FRESH_BOOST_HOURS ? FRESH_BOOST_POINTS : 0;

    // Quick swipe penalty
    let swipePenalty = 0;
    if (stats?.avg_swipe_speed != null && stats.avg_swipe_speed < 2000) {
      swipePenalty = (2000 - stats.avg_swipe_speed) / 2000 * 15;
    }

    // Category boost from user preferences
    const category = (video.metadata as any)?.category || video.templateName || 'general';
    const totalPrefs = Object.values(categoryPrefs).reduce((a, b) => a + b, 0) || 1;
    const catBoost = ((categoryPrefs[category] || 0) / totalPrefs) * 10;

    // Weighted score
    const score = (watchRatio * 35)
      + (completionRate * 25)
      + (replayRate * 20)
      + (engagementNorm * 10)
      + (recency * 10)
      - swipePenalty
      + catBoost
      + freshBoost
      + gaussianNoise(NOISE_AMPLITUDE);

    return score;
  }, [categoryPrefs]);

  // Rank videos with exploration mix
  const rankVideos = useCallback((raw: FeedVideo[]): FeedVideo[] => {
    const explorationCount = Math.ceil(raw.length * EXPLORATION_RATIO);
    const exploitationCount = raw.length - explorationCount;

    // Score all
    const scored: VideoWithScore[] = raw.map(v => ({ ...v, _score: scoreVideo(v) }));

    // Sort by score descending
    scored.sort((a, b) => b._score - a._score);

    // Take top exploitation slots
    const exploitation = scored.slice(0, exploitationCount);

    // Random exploration from remaining
    const remaining = scored.slice(exploitationCount);
    const exploration: VideoWithScore[] = [];
    const pool = [...remaining];
    for (let i = 0; i < explorationCount && pool.length > 0; i++) {
      const idx = Math.floor(Math.random() * pool.length);
      exploration.push(pool.splice(idx, 1)[0]);
    }

    // Interleave: every 5th slot is exploration
    const result: FeedVideo[] = [];
    let expIdx = 0, explIdx = 0;
    for (let i = 0; i < raw.length; i++) {
      if (i % 5 === 4 && explIdx < exploration.length) {
        result.push(exploration[explIdx++]);
      } else if (expIdx < exploitation.length) {
        result.push(exploitation[expIdx++]);
      } else if (explIdx < exploration.length) {
        result.push(exploration[explIdx++]);
      }
    }

    // Diversité forcée : éviter 2 templates identiques consécutifs
    for (let i = 1; i < result.length - 1; i++) {
      const prevTpl = result[i - 1].templateId;
      if (result[i].templateId && result[i].templateId === prevTpl) {
        // chercher swap plus loin
        for (let j = i + 1; j < result.length; j++) {
          if (result[j].templateId !== prevTpl) {
            [result[i], result[j]] = [result[j], result[i]];
            break;
          }
        }
      }
    }

    return result;
  }, [scoreVideo]);

  const fetchVideos = useCallback(async (reset = true) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      setError(null);
      if (reset) {
        setIsLoading(true);
        offsetRef.current = 0;
        seenIdsRef.current.clear();
        statsCache.current.clear();
      }

      // Fetch candidate videos — NOT ordered by created_at (random-ish for exploration)
      const { data, error: fetchError } = await supabase
        .from('videos')
        .select('*, tamtam_profiles!videos_user_id_fkey(user_id, username, display_name, avatar_url, is_verified)')
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .range(offsetRef.current, offsetRef.current + PAGE_SIZE - 1);

      if (fetchError) throw fetchError;

      if (data && data.length > 0) {
        const mapped: FeedVideo[] = (data as any[])
          .filter(v => !seenIdsRef.current.has(v.id))
          .map(v => {
            seenIdsRef.current.add(v.id);
            return {
              id: v.id,
              videoUrl: v.video_url,
              thumbnailUrl: v.thumbnail_url,
              title: v.title,
              description: v.description,
              templateId: v.template_id,
              templateName: v.template_name,
              duration: v.duration_seconds || 30,
              viewsCount: v.views_count || 0,
              likesCount: v.likes_count || 0,
              sharesCount: v.shares_count || 0,
              createdAt: v.created_at,
              metadata: v.metadata || null,
              author: {
                id: v.user_id,
                name: v.tamtam_profiles?.display_name || v.template_name || 'Créateur FITILA',
                username: v.tamtam_profiles?.username ? `@${v.tamtam_profiles.username}` : '@fitila_user',
                avatarUrl: v.tamtam_profiles?.avatar_url || undefined,
              },
            };
          });

        // Fetch engagement stats for these videos
        await fetchAggregateStats(mapped.map(v => v.id));

        // Rank with algorithm
        const ranked = rankVideos(mapped);

        if (reset) {
          setVideos(ranked);
        } else {
          setVideos(prev => [...prev, ...ranked]);
        }

        setHasMore(data.length === PAGE_SIZE);
        offsetRef.current += data.length;
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error('[adaptiveFeed] error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load feed');
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, [fetchAggregateStats, rankVideos]);

  const loadMore = useCallback(async () => {
    if (!hasMore || isFetchingRef.current) return;
    fetchVideos(false);
  }, [hasMore, fetchVideos]);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  // Re-shuffle périodique (toutes les 90s) — réordonne sans recharger
  useEffect(() => {
    const id = setInterval(() => {
      setVideos(prev => {
        if (prev.length <= 2) return prev;
        // Garder les 2 premières (l'utilisateur peut être dessus) + reshuffle le reste
        const head = prev.slice(0, 2);
        const tail = rankVideos(prev.slice(2));
        return [...head, ...tail];
      });
    }, RESHUFFLE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [rankVideos]);

  // Realtime INSERT : nouveaux posts publics → push en haut
  useEffect(() => {
    const channel = supabase
      .channel('adaptive-feed-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'videos' }, async (payload) => {
        const v = payload.new as any;
        if (!v?.is_public || seenIdsRef.current.has(v.id)) return;
        seenIdsRef.current.add(v.id);
        // Récup profil auteur
        let profile: any = null;
        if (v.user_id) {
          const { data } = await supabase.from('tamtam_profiles')
            .select('user_id,username,display_name,avatar_url,is_verified')
            .eq('user_id', v.user_id).maybeSingle();
          profile = data;
        }
        const fresh: FeedVideo = {
          id: v.id,
          videoUrl: v.video_url,
          thumbnailUrl: v.thumbnail_url,
          title: v.title,
          description: v.description,
          templateId: v.template_id,
          templateName: v.template_name,
          duration: v.duration_seconds || 30,
          viewsCount: v.views_count || 0,
          likesCount: v.likes_count || 0,
          sharesCount: v.shares_count || 0,
          createdAt: v.created_at,
          metadata: v.metadata || null,
          author: {
            id: v.user_id,
            name: profile?.display_name || v.template_name || 'Créateur FITILA',
            username: profile?.username ? `@${profile.username}` : '@fitila_user',
            avatarUrl: profile?.avatar_url || undefined,
          },
        };
        setVideos(prev => [fresh, ...prev]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  return {
    videos,
    isLoading,
    error,
    hasMore,
    loadMore,
    refetch: () => fetchVideos(true),
  };
}
