import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useBaribaSTT } from '@/hooks/useBaribaSTT';
import { useHybridTranslation } from '@/hooks/useHybridTranslation';
import { useToast } from '@/hooks/use-toast';
import { audioServicesMonitoring } from '@/services/AudioServicesMonitoringService';

export interface VoiceMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  audio_url: string;
  duration_seconds: number;
  is_read: boolean;
  created_at: string;
  transcript_ba?: string;
  transcript_fr?: string;
}

export interface Conversation {
  partnerId: string;
  partnerName: string;
  partnerAvatar?: string;
  lastMessage?: VoiceMessage;
  unreadCount: number;
}

export function usePrivateVoiceMessages(conversationPartnerId?: string) {
  const { user } = useAuth();
  const { transcribe, isTranscribing } = useBaribaSTT();
  const { translateBaribaToFrench, translateFrenchToBariba } = useHybridTranslation();
  const { toast } = useToast();
  
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  // Fetch messages for a specific conversation
  useEffect(() => {
    if (!user || !conversationPartnerId) return;

    const fetchMessages = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('yovo_messages')
        .select('*')
        .or(
          `and(sender_id.eq.${user.id},receiver_id.eq.${conversationPartnerId}),` +
          `and(sender_id.eq.${conversationPartnerId},receiver_id.eq.${user.id})`
        )
        .order('created_at', { ascending: true });

      if (!error && data) {
        setMessages(data as VoiceMessage[]);
      }
      setLoading(false);
    };

    fetchMessages();

    // Realtime subscription
    const channel = supabase
      .channel(`messages-${conversationPartnerId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'yovo_messages'
        },
        (payload) => {
          const newMsg = payload.new as VoiceMessage;
          if (
            (newMsg.sender_id === user.id && newMsg.receiver_id === conversationPartnerId) ||
            (newMsg.sender_id === conversationPartnerId && newMsg.receiver_id === user.id)
          ) {
            setMessages(prev => [...prev, newMsg]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, conversationPartnerId]);

  // Fetch all conversations
  const fetchConversations = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('yovo_messages')
      .select('*')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching conversations:', error);
      return;
    }

    // Group by conversation partner
    const conversationMap = new Map<string, VoiceMessage[]>();
    for (const msg of data || []) {
      const partnerId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
      if (!conversationMap.has(partnerId)) {
        conversationMap.set(partnerId, []);
      }
      conversationMap.get(partnerId)!.push(msg as VoiceMessage);
    }

    // Get partner profiles
    const partnerIds = Array.from(conversationMap.keys());
    if (partnerIds.length === 0) {
      setConversations([]);
      return;
    }

    const { data: profiles } = await supabase
      .from('yovo_profiles')
      .select('user_id, display_name, avatar_url')
      .in('user_id', partnerIds);

    const profileMap = new Map(
      (profiles || []).map(p => [p.user_id, p])
    );

    const convList: Conversation[] = [];
    for (const [partnerId, msgs] of conversationMap.entries()) {
      const profile = profileMap.get(partnerId);
      const unreadCount = msgs.filter(m => 
        m.sender_id === partnerId && !m.is_read
      ).length;

      convList.push({
        partnerId,
        partnerName: profile?.display_name || 'Utilisateur',
        partnerAvatar: profile?.avatar_url || undefined,
        lastMessage: msgs[0],
        unreadCount
      });
    }

    setConversations(convList.sort((a, b) => {
      const aTime = a.lastMessage?.created_at || '';
      const bTime = b.lastMessage?.created_at || '';
      return bTime.localeCompare(aTime);
    }));
  }, [user]);

  // Send voice message with automatic transcription and translation
  const sendVoiceMessage = useCallback(async (
    receiverId: string,
    audioBase64: string,
    duration: number,
    sourceLang: 'bariba' | 'french' = 'bariba'
  ): Promise<{ success: boolean; message?: VoiceMessage; error?: string }> => {
    if (!user) return { success: false, error: 'Non authentifié' };

    setIsSending(true);
    const startTime = Date.now();

    try {
      // 1. Upload audio to storage
      const audioBlob = base64ToBlob(audioBase64, 'audio/webm');
      const fileName = `msg_${user.id}_${Date.now()}.webm`;

      const { error: uploadError } = await supabase.storage
        .from('yovo-audio')
        .upload(fileName, audioBlob, { contentType: 'audio/webm' });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('yovo-audio')
        .getPublicUrl(fileName);

      // 2. Transcribe audio
      let transcript_ba = '';
      let transcript_fr = '';

      if (sourceLang === 'bariba') {
        const sttStart = Date.now();
        const result = await transcribe(audioBase64);
        audioServicesMonitoring.logCall({
          serviceType: 'stt',
          language: 'bariba',
          duration: Date.now() - sttStart,
          success: !!result,
          inputLength: audioBase64.length,
          userId: user.id
        });

        if (result?.transcription) {
          transcript_ba = result.transcription;
          // 3. Translate to French
          const transResult = await translateBaribaToFrench(transcript_ba);
          if (transResult?.translation) {
            transcript_fr = transResult.translation;
          }
        }
      } else {
        // For French, we'd use French STT and translate to Bariba
        transcript_fr = ''; // Would be from French STT
        const transResult = await translateFrenchToBariba(transcript_fr);
        if (transResult?.translation) {
          transcript_ba = transResult.translation;
        }
      }

      // 4. Save message to database
      const { data, error } = await supabase
        .from('yovo_messages')
        .insert({
          sender_id: user.id,
          receiver_id: receiverId,
          audio_url: urlData.publicUrl,
          duration_seconds: duration
        })
        .select()
        .single();

      if (error) throw error;

      const message: VoiceMessage = {
        ...data,
        transcript_ba,
        transcript_fr
      };

      setMessages(prev => [...prev, message]);
      
      toast({
        title: "✅ Message envoyé",
        description: transcript_ba ? `"${transcript_ba.slice(0, 50)}..."` : undefined
      });

      return { success: true, message };
    } catch (err: any) {
      console.error('Error sending voice message:', err);
      toast({
        title: "Erreur d'envoi",
        description: err.message,
        variant: "destructive"
      });
      return { success: false, error: err.message };
    } finally {
      setIsSending(false);
    }
  }, [user, transcribe, translateBaribaToFrench, translateFrenchToBariba, toast]);

  // Mark messages as read
  const markAsRead = useCallback(async (messageIds: string[]) => {
    if (!user || messageIds.length === 0) return;

    await supabase
      .from('yovo_messages')
      .update({ is_read: true })
      .in('id', messageIds)
      .eq('receiver_id', user.id);

    setMessages(prev => prev.map(m => 
      messageIds.includes(m.id) ? { ...m, is_read: true } : m
    ));
  }, [user]);

  return {
    messages,
    conversations,
    loading,
    isSending,
    isTranscribing,
    sendVoiceMessage,
    fetchConversations,
    markAsRead
  };
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteCharacters = atob(base64.replace(/^data:.*,/, ''));
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  return new Blob([new Uint8Array(byteNumbers)], { type: mimeType });
}
