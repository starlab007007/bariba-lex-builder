/**
 * Hook for publishing videos to the feed
 * Handles upload to Supabase Storage and insertion into videos table
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface VideoPublishData {
  video: Blob;
  thumbnail: Blob;
  title: string;
  description?: string;
  templateId?: string;
  templateName?: string;
  duration?: number;
}

export interface PublishResult {
  success: boolean;
  videoId?: string;
  videoUrl?: string;
  error?: string;
}

export interface UseVideoPublishReturn {
  publishVideo: (data: VideoPublishData) => Promise<PublishResult>;
  isPublishing: boolean;
  publishProgress: number;
  publishStage: string;
}

export function useVideoPublish(): UseVideoPublishReturn {
  const { toast } = useToast();
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishProgress, setPublishProgress] = useState(0);
  const [publishStage, setPublishStage] = useState('');

  const publishVideo = useCallback(async (data: VideoPublishData): Promise<PublishResult> => {
    setIsPublishing(true);
    setPublishProgress(0);
    setPublishStage('Préparation...');

    try {
      // Get current user (optional - can publish anonymously)
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || null;
      const userFolder = userId || 'anonymous';

      // 1. Upload video to Storage
      setPublishStage('Upload de la vidéo...');
      setPublishProgress(10);

      // Detect video format from blob type
      const isMP4 = data.video.type.includes('mp4');
      const videoExtension = isMP4 ? 'mp4' : 'webm';
      const videoContentType = isMP4 ? 'video/mp4' : 'video/webm';

      const videoFileName = `${userFolder}/${Date.now()}-video.${videoExtension}`;
      const { data: videoUpload, error: videoError } = await supabase.storage
        .from('videos')
        .upload(videoFileName, data.video, {
          contentType: videoContentType,
          cacheControl: '3600'
        });

      if (videoError) {
        throw new Error(`Video upload failed: ${videoError.message}`);
      }

      setPublishProgress(50);

      // 2. Upload thumbnail
      setPublishStage('Upload de la miniature...');
      
      const thumbnailFileName = `${userFolder}/${Date.now()}-thumb.jpg`;
      const { data: thumbUpload, error: thumbError } = await supabase.storage
        .from('videos')
        .upload(thumbnailFileName, data.thumbnail, {
          contentType: 'image/jpeg',
          cacheControl: '3600'
        });

      if (thumbError) {
        console.warn('Thumbnail upload failed:', thumbError);
        // Continue without thumbnail
      }

      setPublishProgress(70);

      // 3. Get public URLs
      const { data: videoUrlData } = supabase.storage
        .from('videos')
        .getPublicUrl(videoFileName);

      const videoUrl = videoUrlData.publicUrl;

      let thumbnailUrl: string | null = null;
      if (thumbUpload) {
        const { data: thumbUrlData } = supabase.storage
          .from('videos')
          .getPublicUrl(thumbnailFileName);
        thumbnailUrl = thumbUrlData.publicUrl;
      }

      setPublishProgress(80);

      // 4. Insert into videos table
      setPublishStage('Publication...');
      
      // Insert into videos table - cast result to avoid type inference issues
      const insertPayload = {
        user_id: userId,
        title: data.title,
        description: data.description || null,
        video_url: videoUrl,
        thumbnail_url: thumbnailUrl,
        template_id: data.templateId || 'griot-digital',
        template_name: data.templateName || 'Griot Digital',
        duration_seconds: data.duration ? Math.floor(data.duration) : null,
        is_public: true
      };

      const { data: insertResult, error: insertError } = await supabase
        .from('videos')
        .insert(insertPayload as any)
        .select('id')
        .single();

      if (insertError) {
        throw new Error(`Database insert failed: ${insertError.message}`);
      }

      // Extract id safely with type assertion
      const videoId = (insertResult as { id: string } | null)?.id;

      setPublishProgress(100);
      setPublishStage('Publié!');

      toast({
        title: '🎉 Vidéo publiée!',
        description: 'Votre création est maintenant visible dans le feed',
      });

      return {
        success: true,
        videoId: videoId || undefined,
        videoUrl: videoUrl
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Publication échouée';
      console.error('Publish error:', error);
      
      toast({
        title: 'Erreur de publication',
        description: errorMessage,
        variant: 'destructive'
      });

      return {
        success: false,
        error: errorMessage
      };

    } finally {
      setIsPublishing(false);
    }
  }, [toast]);

  return {
    publishVideo,
    isPublishing,
    publishProgress,
    publishStage
  };
}

export default useVideoPublish;
