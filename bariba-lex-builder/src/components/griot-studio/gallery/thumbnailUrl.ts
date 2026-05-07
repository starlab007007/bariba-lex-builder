/**
 * thumbnailUrl — Generate optimized thumbnail URLs using Supabase Storage
 * image render transforms. Instead of loading full-size originals (500KB+),
 * this generates URLs that serve resized images directly from CDN.
 *
 * WHY THIS IS FASTER:
 * - Grid thumbnails: 320px wide (~15KB vs ~500KB original) = 30x smaller
 * - Preview: 800px wide (~60KB)
 * - Videos use their image_url as poster with same transform
 *
 * Supabase render endpoint: /render/image/public/BUCKET/PATH?width=X&quality=Q
 */

const RENDER_BASE_REGEX = /\/storage\/v1\/object\/public\//;
const RENDER_REPLACE = '/storage/v1/render/image/public/';
const VIDEO_EXT_REGEX = /\.(mp4|webm|mov)(\?|$)/i;

/** Check if a URL points to a video file (not an image) */
export function isVideoFileUrl(url: string): boolean {
  if (!url) return false;
  return VIDEO_EXT_REGEX.test(url);
}

/**
 * Convert a public Supabase storage URL to a render-transformed thumbnail.
 * Falls back to original URL if format is unrecognized.
 * Returns empty string for video file URLs (can't render as image).
 */
export function thumbUrl(originalUrl: string, width = 320, quality = 60): string {
  if (!originalUrl) return '';
  
  // Only transform Supabase storage URLs
  if (!RENDER_BASE_REGEX.test(originalUrl)) return originalUrl;
  
  // Don't transform video files — they can't be rendered as images
  if (isVideoFileUrl(originalUrl)) return '';
  
  const transformed = originalUrl.replace(
    RENDER_BASE_REGEX,
    RENDER_REPLACE
  );
  
  const separator = transformed.includes('?') ? '&' : '?';
  return `${transformed}${separator}width=${width}&quality=${quality}`;
}

/** Grid thumbnail — small, fast */
export const gridThumb = (url: string) => thumbUrl(url, 320, 55);

/** Preview — medium quality */
export const previewThumb = (url: string) => thumbUrl(url, 800, 75);
