import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { uniqueChannelName } from '@/lib/realtime';
import { useAuth } from '@/contexts/AuthContext';

export interface TamTamMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  audio_url: string;
  duration_seconds: number | null;
  is_read: boolean;
  created_at: string;
}

export interface TamTamRoom {
  id: string;
  host_id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  category: string | null;
  is_live: boolean;
  participants_count: number;
  max_participants: number;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
}

export function useTamTamMessages(conversationPartnerId?: string) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<TamTamMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && conversationPartnerId) {
      fetchMessages();
      setupRealtime();
    }
  }, [user, conversationPartnerId]);

  const setupRealtime = () => {
    if (!user || !conversationPartnerId) return;

    const channel = supabase
      .channel(uniqueChannelName(`messages-${conversationPartnerId}`))
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'tamtam_messages'
        },
        (payload) => {
          const newMessage = payload.new as TamTamMessage;
          if (
            (newMessage.sender_id === user.id && newMessage.receiver_id === conversationPartnerId) ||
            (newMessage.sender_id === conversationPartnerId && newMessage.receiver_id === user.id)
          ) {
            setMessages(prev => [...prev, newMessage]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const fetchMessages = async () => {
    if (!user || !conversationPartnerId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tamtam_messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${conversationPartnerId}),and(sender_id.eq.${conversationPartnerId},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data as TamTamMessage[]);
    } catch (err) {
      console.error('Error fetching messages:', err);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = useCallback(async (receiverId: string, audioUrl: string, duration: number) => {
    if (!user) return { error: 'Not authenticated' };

    try {
      const { data, error } = await supabase
        .from('tamtam_messages')
        .insert({
          sender_id: user.id,
          receiver_id: receiverId,
          audio_url: audioUrl,
          duration_seconds: duration
        })
        .select()
        .single();

      if (error) throw error;

      // Create notification
      await supabase
        .from('tamtam_notifications')
        .insert({
          user_id: receiverId,
          type: 'message',
          actor_id: user.id
        });

      return { data, error: null };
    } catch (err: any) {
      return { data: null, error: err.message };
    }
  }, [user]);

  return {
    messages,
    loading,
    sendMessage,
    refetch: fetchMessages
  };
}

export function useTamTamLiveRooms() {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<TamTamRoom[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRooms();
    setupRealtime();
  }, []);

  const setupRealtime = () => {
    const channel = supabase
      .channel(uniqueChannelName('live-rooms'))
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tamtam_rooms'
        },
        () => fetchRooms()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const fetchRooms = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tamtam_rooms')
        .select('*')
        .eq('is_live', true)
        .order('participants_count', { ascending: false });

      if (error) throw error;
      setRooms(data as TamTamRoom[]);
    } catch (err) {
      console.error('Error fetching rooms:', err);
    } finally {
      setLoading(false);
    }
  };

  const createRoom = useCallback(async (title: string, description?: string, category?: string) => {
    if (!user) return { data: null, error: 'Not authenticated' };

    try {
      const { data, error } = await supabase
        .from('tamtam_rooms')
        .insert({
          host_id: user.id,
          title,
          description,
          category,
          is_live: true,
          started_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (err: any) {
      return { data: null, error: err.message };
    }
  }, [user]);

  const joinRoom = useCallback(async (roomId: string) => {
    try {
      await supabase
        .from('tamtam_rooms')
        .update({ participants_count: rooms.find(r => r.id === roomId)?.participants_count ?? 0 + 1 })
        .eq('id', roomId);
      
      return { error: null };
    } catch (err: any) {
      return { error: err.message };
    }
  }, [rooms]);

  const leaveRoom = useCallback(async (roomId: string) => {
    try {
      const room = rooms.find(r => r.id === roomId);
      if (room) {
        await supabase
          .from('tamtam_rooms')
          .update({ participants_count: Math.max(0, (room.participants_count ?? 1) - 1) })
          .eq('id', roomId);
      }
      
      return { error: null };
    } catch (err: any) {
      return { error: err.message };
    }
  }, [rooms]);

  const endRoom = useCallback(async (roomId: string) => {
    if (!user) return { error: 'Not authenticated' };

    try {
      const { error } = await supabase
        .from('tamtam_rooms')
        .update({
          is_live: false,
          ended_at: new Date().toISOString()
        })
        .eq('id', roomId)
        .eq('host_id', user.id);

      if (error) throw error;
      return { error: null };
    } catch (err: any) {
      return { error: err.message };
    }
  }, [user]);

  return {
    rooms,
    loading,
    createRoom,
    joinRoom,
    leaveRoom,
    endRoom,
    refetch: fetchRooms
  };
}
