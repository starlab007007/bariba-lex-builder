/**
 * Asset Analyzer - Client-side utilities for AI-powered asset classification
 * Handles image resizing, video frame extraction, filename parsing, and API calls
 */

import { supabase } from '@/integrations/supabase/client';

export interface ImageSuggestions {
  style?: string;
  emotion?: string;
  scene_type?: string;
  character_type?: string;
  action?: string;
  time_of_day?: string;
  description_en?: string;
  description_fr?: string;
  confidence?: number;
}

export interface MusicSuggestions {
  title?: string;
  artist?: string;
  category?: string;
  mood?: string;
  tags?: string[];
  description_fr?: string;
  confidence?: number;
}

/** Resize image to max dimensions and return base64 data URL */
function resizeImageToBase64(file: File, maxSize = 800): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;
      if (width > maxSize || height > maxSize) {
        const ratio = Math.min(maxSize / width, maxSize / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas context unavailable'));

      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

/** Extract a frame from a video at the given time (seconds) */
function extractVideoFrame(file: File, timeSeconds = 1): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);

    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    video.onloadedmetadata = () => {
      video.currentTime = Math.min(timeSeconds, video.duration * 0.1);
    };

    video.onseeked = () => {
      const canvas = document.createElement('canvas');
      const maxSize = 800;
      let { videoWidth: w, videoHeight: h } = video;

      if (w > maxSize || h > maxSize) {
        const ratio = Math.min(maxSize / w, maxSize / h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }

      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        return reject(new Error('Canvas context unavailable'));
      }

      ctx.drawImage(video, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load video'));
    };

    video.src = url;
  });
}

/** Parse filename to extract title and artist */
export function parseFilename(filename: string): { title?: string; artist?: string } {
  // Remove extension
  const name = filename.replace(/\.[^/.]+$/, '');

  // Pattern: "Artist - Title"
  const dashMatch = name.match(/^(.+?)\s*[-–—]\s*(.+)$/);
  if (dashMatch) {
    return {
      artist: dashMatch[1].trim().replace(/[_]/g, ' '),
      title: dashMatch[2].trim().replace(/[_]/g, ' '),
    };
  }

  // Pattern: "Title_by_Artist" or "Title by Artist"
  const byMatch = name.match(/^(.+?)\s*[_\s]by[_\s]\s*(.+)$/i);
  if (byMatch) {
    return {
      title: byMatch[1].trim().replace(/[_]/g, ' '),
      artist: byMatch[2].trim().replace(/[_]/g, ' '),
    };
  }

  // Pattern: "Title (feat. Artist)"
  const featMatch = name.match(/^(.+?)\s*\(feat\.?\s*(.+?)\)$/i);
  if (featMatch) {
    return {
      title: featMatch[1].trim().replace(/[_]/g, ' '),
      artist: featMatch[2].trim().replace(/[_]/g, ' '),
    };
  }

  // Default: use cleaned filename as title
  const cleanTitle = name.replace(/[_-]/g, ' ').trim();
  return {
    title: cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1),
  };
}

/** Call the analyze-asset edge function with timeout */
async function callAnalyzeAsset(body: Record<string, unknown>, timeoutMs = 20000): Promise<Record<string, any>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const { data, error } = await supabase.functions.invoke('analyze-asset', {
      body,
    });

    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data?.suggestions ?? {};
  } finally {
    clearTimeout(timer);
  }
}

/** Analyze a photo file: resize → base64 → AI classification */
export async function analyzeImage(file: File): Promise<ImageSuggestions> {
  try {
    const base64 = await resizeImageToBase64(file);
    return await callAnalyzeAsset({ type: 'image', imageBase64: base64 });
  } catch (err) {
    console.warn('[assetAnalyzer] Image analysis failed:', err);
    return {};
  }
}

/** Analyze a video file: extract frame → base64 → AI classification */
export async function analyzeVideoFrame(file: File): Promise<ImageSuggestions> {
  try {
    const frameBase64 = await extractVideoFrame(file);
    return await callAnalyzeAsset({ type: 'image', imageBase64: frameBase64 });
  } catch (err) {
    console.warn('[assetAnalyzer] Video analysis failed:', err);
    return {};
  }
}

/** Analyze a music file: parse filename + AI classification */
export async function analyzeMusicFile(file: File, duration: number): Promise<MusicSuggestions> {
  try {
    const localParsed = parseFilename(file.name);
    const aiSuggestions = await callAnalyzeAsset({
      type: 'music',
      filename: file.name,
      duration,
    });

    // Merge: local parsing takes priority for title/artist if AI didn't detect them well
    return {
      title: localParsed.title || aiSuggestions.title,
      artist: localParsed.artist || aiSuggestions.artist,
      category: aiSuggestions.category,
      mood: aiSuggestions.mood,
      tags: aiSuggestions.tags,
      description_fr: aiSuggestions.description_fr,
      confidence: aiSuggestions.confidence,
    };
  } catch (err) {
    console.warn('[assetAnalyzer] Music analysis failed:', err);
    // Fallback to local parsing only
    return parseFilename(file.name);
  }
}
