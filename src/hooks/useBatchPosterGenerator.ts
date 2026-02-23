/**
 * useBatchPosterGenerator — Client-side batch video poster generation.
 *
 * WHY CLIENT-SIDE:
 * Edge Functions (Deno Deploy) have no video decoder (no FFmpeg, no VideoDecoder).
 * Browsers DO — they can decode any video format natively.
 *
 * FLOW:
 * 1. Call Edge Function "list" → get videos without real poster
 * 2. For each video: load in hidden <video>, seek to 0.5s, capture with <canvas>
 * 3. Send base64 JPEG to Edge Function "save" → uploads to storage + updates DB
 * 4. Process 3 videos in parallel for speed
 *
 * RESULT: Each video gets a real poster image at anime-library/posters/<id>.jpg
 * The grid thumbnail transform (gridThumb) then works on these JPEGs.
 */

import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/** Extract a single frame from a video URL using browser's native decoder */
function extractVideoFrame(videoUrl: string, targetWidth = 320): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.preload = 'metadata';
    video.playsInline = true;

    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('timeout'));
    }, 20_000);

    function cleanup() {
      clearTimeout(timeout);
      video.pause();
      video.removeAttribute('src');
      video.load();
    }

    video.addEventListener('loadeddata', () => {
      video.currentTime = Math.min(0.5, video.duration || 0);
    }, { once: true });

    video.addEventListener('seeked', () => {
      try {
        const aspectRatio = video.videoHeight / video.videoWidth || 1.5;
        const w = targetWidth;
        const h = Math.round(w * aspectRatio);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(video, 0, 0, w, h);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
        cleanup();
        resolve(dataUrl.split(',')[1]); // base64 without prefix
      } catch (e) {
        cleanup();
        reject(e);
      }
    }, { once: true });

    video.addEventListener('error', () => {
      cleanup();
      reject(new Error('video_load_error'));
    }, { once: true });

    video.src = videoUrl;
  });
}

export interface PosterProgress {
  total: number;
  done: number;
  errors: number;
  current: string | null;
}

export function useBatchPosterGenerator() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<PosterProgress>({
    total: 0, done: 0, errors: 0, current: null,
  });
  const abortRef = useRef(false);

  const stop = useCallback(() => {
    abortRef.current = true;
  }, []);

  const generate = useCallback(async (batchSize = 20) => {
    abortRef.current = false;
    setIsProcessing(true);
    setProgress({ total: 0, done: 0, errors: 0, current: null });

    try {
      // 1. Get videos needing posters from Edge Function
      const { data, error } = await supabase.functions.invoke('generate-video-posters', {
        body: { action: 'list', limit: batchSize },
      });

      if (error) throw error;

      const videos = data?.videos || [];
      if (videos.length === 0) {
        toast.info('✅ Toutes les vidéos ont déjà un poster !');
        setIsProcessing(false);
        return;
      }

      setProgress(p => ({ ...p, total: videos.length }));
      toast.info(`🎬 Génération de ${videos.length} posters... (${data?.remaining || 0} restants après ce batch)`);

      // 2. Process 3 at a time (browser can handle 3 concurrent video loads)
      const CONCURRENCY = 3;
      for (let i = 0; i < videos.length; i += CONCURRENCY) {
        if (abortRef.current) break;

        const batch = videos.slice(i, i + CONCURRENCY);
        await Promise.allSettled(
          batch.map(async (video: { id: string; video_url: string; scene_type: string }) => {
            if (abortRef.current) return;
            setProgress(p => ({ ...p, current: video.scene_type }));

            try {
              // Extract frame from video (browser-native decoding)
              const posterBase64 = await extractVideoFrame(video.video_url);

              // Send to Edge Function for storage + DB update
              await supabase.functions.invoke('generate-video-posters', {
                body: { action: 'save', video_id: video.id, poster_base64: posterBase64 },
              });

              setProgress(p => ({ ...p, done: p.done + 1 }));
            } catch {
              setProgress(p => ({ ...p, errors: p.errors + 1, done: p.done + 1 }));
            }
          })
        );
      }

      const remaining = data?.remaining || 0;
      toast.success(
        remaining > 0
          ? `Batch terminé ! Encore ~${remaining} vidéos sans poster.`
          : '✅ Tous les posters ont été générés !'
      );
    } catch (e: any) {
      toast.error(`Erreur: ${e.message}`);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  return { generate, stop, isProcessing, progress };
}
