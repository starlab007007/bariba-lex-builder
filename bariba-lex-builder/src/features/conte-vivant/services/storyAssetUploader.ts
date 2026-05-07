import { supabase } from '@/integrations/supabase/client';
import type { StoryGraph, SegmentDraft } from '../types/story.types';

const isBlobUrl = (url?: string) => url?.startsWith('blob:');

type BlobMap = Record<string, { narrationBlob?: Blob; audioBlob?: Blob }>;

/**
 * Fetch a blob URL and return the Blob object
 */
async function fetchBlob(blobUrl: string): Promise<Blob> {
  const res = await fetch(blobUrl);
  return res.blob();
}

/**
 * Upload a single blob to Supabase storage and return the public URL
 */
async function uploadBlob(
  blob: Blob,
  path: string,
  contentType?: string,
): Promise<string> {
  const { error } = await supabase.storage
    .from('videos')
    .upload(path, blob, {
      contentType: contentType || blob.type || 'application/octet-stream',
      upsert: true,
    });
  if (error) throw error;

  const { data } = supabase.storage.from('videos').getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Upload all blob URLs in a story graph to persistent storage.
 * Uses blobs from SegmentDraft when available, otherwise fetches from blob URL.
 */
export async function uploadStoryAssets(
  graph: StoryGraph,
  blobMap: BlobMap,
): Promise<StoryGraph> {
  const storyId = crypto.randomUUID().slice(0, 8);
  const updatedSegments = { ...graph.segments };

  for (const [segId, segment] of Object.entries(updatedSegments)) {
    const updated = { ...segment };
    const blobs = blobMap[segId];

    // Upload narrator audio
    const narrationUrl = updated.narrator_audio_url || updated.audio_url;
    if (isBlobUrl(narrationUrl)) {
      try {
        const blob = blobs?.narrationBlob || await fetchBlob(narrationUrl!);
        const ext = blob.type?.includes('webm') ? 'webm' : 'mp3';
        const path = `stories/${storyId}/${segId}-narration.${ext}`;
        const publicUrl = await uploadBlob(blob, path, blob.type);
        updated.narrator_audio_url = publicUrl;
        updated.audio_url = publicUrl;
      } catch (e) {
        console.error(`[storyAssetUploader] Failed to upload narration for ${segId}:`, e);
      }
    }

    // Upload media (photo/video)
    if (isBlobUrl(updated.media_url)) {
      try {
        const blob = await fetchBlob(updated.media_url!);
        const isVideo = updated.mediaType === 'video' || blob.type?.includes('video');
        const ext = isVideo ? 'mp4' : 'jpg';
        const path = `stories/${storyId}/${segId}-media.${ext}`;
        const publicUrl = await uploadBlob(blob, path, blob.type);
        updated.media_url = publicUrl;
      } catch (e) {
        console.error(`[storyAssetUploader] Failed to upload media for ${segId}:`, e);
      }
    }

    // Upload background music
    if (isBlobUrl(updated.background_music_url)) {
      try {
        const blob = await fetchBlob(updated.background_music_url!);
        const path = `stories/${storyId}/${segId}-bgmusic.mp3`;
        const publicUrl = await uploadBlob(blob, path, blob.type);
        updated.background_music_url = publicUrl;
      } catch (e) {
        console.error(`[storyAssetUploader] Failed to upload bg music for ${segId}:`, e);
      }
    }

    updatedSegments[segId] = updated;
  }

  return { ...graph, segments: updatedSegments };
}

/**
 * Collect blob references from SegmentDrafts for upload
 */
export function collectBlobsFromDrafts(
  introSegment: SegmentDraft,
  branches: Array<{ segment: SegmentDraft; sub_branches?: Array<{ segment: SegmentDraft }> }>,
): BlobMap {
  const map: BlobMap = {};

  const addSegment = (seg: SegmentDraft) => {
    if (seg.narrator_audio_blob || seg.audio_blob) {
      map[seg.id] = {
        narrationBlob: seg.narrator_audio_blob,
        audioBlob: seg.audio_blob,
      };
    }
  };

  addSegment(introSegment);
  branches.forEach(b => {
    addSegment(b.segment);
    b.sub_branches?.forEach(sub => addSegment(sub.segment));
  });

  return map;
}
