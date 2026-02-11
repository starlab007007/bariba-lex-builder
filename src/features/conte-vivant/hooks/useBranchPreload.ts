import { useEffect, useRef, useCallback } from 'react';
import type { StoryChoice } from '../types/story.types';

const preloadCache = new Map<string, string>(); // segment_id -> blob URL

export function useBranchPreload() {
  const activeRequests = useRef<Map<string, AbortController>>(new Map());

  const preloadSegments = useCallback((choices: StoryChoice[], getVideoUrl: (segmentId: string) => string | undefined) => {
    choices.forEach(choice => {
      const segId = choice.next_segment;
      if (preloadCache.has(segId)) return;

      const url = getVideoUrl(segId);
      if (!url) return;

      const controller = new AbortController();
      activeRequests.current.set(segId, controller);

      fetch(url, { signal: controller.signal })
        .then(res => res.blob())
        .then(blob => {
          const blobUrl = URL.createObjectURL(blob);
          preloadCache.set(segId, blobUrl);
        })
        .catch(() => {/* aborted or failed */})
        .finally(() => {
          activeRequests.current.delete(segId);
        });
    });
  }, []);

  const getCachedUrl = useCallback((segmentId: string): string | undefined => {
    return preloadCache.get(segmentId);
  }, []);

  const clearUnused = useCallback((keepSegmentIds: string[]) => {
    const keepSet = new Set(keepSegmentIds);
    for (const [id, blobUrl] of preloadCache.entries()) {
      if (!keepSet.has(id)) {
        URL.revokeObjectURL(blobUrl);
        preloadCache.delete(id);
      }
    }
  }, []);

  const cancelAll = useCallback(() => {
    activeRequests.current.forEach(controller => controller.abort());
    activeRequests.current.clear();
  }, []);

  useEffect(() => {
    return () => {
      cancelAll();
      preloadCache.forEach(url => URL.revokeObjectURL(url));
      preloadCache.clear();
    };
  }, [cancelAll]);

  return { preloadSegments, getCachedUrl, clearUnused, cancelAll };
}
