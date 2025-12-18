import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface MediaAttachment {
  type: 'photo' | 'video' | 'emoji';
  url?: string;
  emojiCode?: string;
  thumbnailUrl?: string;
}

export function useRichMediaMessages() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const uploadMedia = useCallback(async (
    file: File,
    type: 'photo' | 'video'
  ): Promise<{ url: string; thumbnailUrl?: string } | null> => {
    if (!user) return null;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${type}_${user.id}_${Date.now()}.${fileExt}`;
      const filePath = `messages/${fileName}`;

      // Upload to storage
      const { error: uploadError, data } = await supabase.storage
        .from('tamtam-audio')
        .upload(filePath, file, {
          contentType: file.type,
          cacheControl: '3600',
        });

      if (uploadError) throw uploadError;

      setUploadProgress(100);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('tamtam-audio')
        .getPublicUrl(filePath);

      // For videos, create a thumbnail (placeholder for now)
      let thumbnailUrl: string | undefined;
      if (type === 'video') {
        thumbnailUrl = urlData.publicUrl; // Could generate actual thumbnail
      }

      return {
        url: urlData.publicUrl,
        thumbnailUrl
      };
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Erreur d'upload",
        description: error.message,
        variant: "destructive"
      });
      return null;
    } finally {
      setIsUploading(false);
    }
  }, [user, toast]);

  const sendMediaMessage = useCallback(async (
    receiverId: string,
    audioUrl: string,
    duration: number,
    media?: MediaAttachment
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('tamtam_messages')
        .insert({
          sender_id: user.id,
          receiver_id: receiverId,
          audio_url: audioUrl,
          duration_seconds: duration,
          message_type: media?.type || 'audio',
          media_url: media?.url || null,
          thumbnail_url: media?.thumbnailUrl || null,
          emoji_code: media?.emojiCode || null
        });

      if (error) throw error;

      toast({
        title: "✅ Message envoyé",
        description: media ? `Avec ${media.type}` : undefined
      });

      return true;
    } catch (error: any) {
      console.error('Send error:', error);
      toast({
        title: "Erreur d'envoi",
        description: error.message,
        variant: "destructive"
      });
      return false;
    }
  }, [user, toast]);

  const sendEmojiMessage = useCallback(async (
    receiverId: string,
    emoji: string
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      // For emoji-only messages, we still need an audio_url (can be empty or placeholder)
      const { error } = await supabase
        .from('tamtam_messages')
        .insert({
          sender_id: user.id,
          receiver_id: receiverId,
          audio_url: '', // No audio for emoji-only
          duration_seconds: 0,
          message_type: 'emoji',
          emoji_code: emoji
        });

      if (error) throw error;

      return true;
    } catch (error: any) {
      console.error('Emoji send error:', error);
      return false;
    }
  }, [user]);

  return {
    uploadMedia,
    sendMediaMessage,
    sendEmojiMessage,
    isUploading,
    uploadProgress
  };
}
