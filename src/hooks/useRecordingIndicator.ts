import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface TypingStatus {
  isRecording: boolean;
  userId: string;
  conversationId: string;
  timestamp: number;
}

export function useRecordingIndicator(conversationPartnerId?: string) {
  const { user } = useAuth();
  const [partnerIsRecording, setPartnerIsRecording] = useState(false);

  // Broadcast own recording status
  const broadcastRecording = useCallback(async (isRecording: boolean) => {
    if (!user || !conversationPartnerId) return;

    const channel = supabase.channel(`recording:${conversationPartnerId}`);
    
    await channel.send({
      type: 'broadcast',
      event: 'recording_status',
      payload: {
        isRecording,
        userId: user.id,
        conversationId: conversationPartnerId,
        timestamp: Date.now()
      }
    });
  }, [user, conversationPartnerId]);

  // Listen for partner's recording status
  useEffect(() => {
    if (!user || !conversationPartnerId) return;

    const channel = supabase
      .channel(`recording:${user.id}`)
      .on('broadcast', { event: 'recording_status' }, (payload) => {
        const status = payload.payload as TypingStatus;
        
        if (status.userId === conversationPartnerId) {
          setPartnerIsRecording(status.isRecording);
          
          // Auto-clear after 10 seconds if no update
          if (status.isRecording) {
            setTimeout(() => {
              setPartnerIsRecording(false);
            }, 10000);
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, conversationPartnerId]);

  return {
    partnerIsRecording,
    broadcastRecording
  };
}
