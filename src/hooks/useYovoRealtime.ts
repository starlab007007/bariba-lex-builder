import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { RealtimeChannel } from '@supabase/supabase-js';

interface YovoMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  audio_url: string;
  duration_seconds: number;
  is_read: boolean;
  created_at: string;
}

interface YovoRoom {
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

export function useYovoMessages(conversationPartnerId?: string) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<YovoMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    // Fetch initial messages
    const fetchMessages = async () => {
      setLoading(true);
      let query = supabase
        .from('yovo_messages')
        .select('*')
        .order('created_at', { ascending: true });

      if (conversationPartnerId) {
        query = query.or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
          .or(`sender_id.eq.${conversationPartnerId},receiver_id.eq.${conversationPartnerId}`);
      } else {
        query = query.or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);
      }

      const { data, error } = await query;
      
      if (!error && data) {
        setMessages(data);
      }
      setLoading(false);
    };

    fetchMessages();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('yovo-messages-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'yovo_messages',
          filter: conversationPartnerId 
            ? `sender_id=eq.${conversationPartnerId}` 
            : undefined
        },
        (payload) => {
          const newMessage = payload.new as YovoMessage;
          if (newMessage.receiver_id === user.id || newMessage.sender_id === user.id) {
            setMessages(prev => [...prev, newMessage]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, conversationPartnerId]);

  const sendMessage = useCallback(async (receiverId: string, audioUrl: string, duration: number) => {
    if (!user) return { error: 'Not authenticated' };

    const { data, error } = await supabase
      .from('yovo_messages')
      .insert({
        sender_id: user.id,
        receiver_id: receiverId,
        audio_url: audioUrl,
        duration_seconds: duration
      })
      .select()
      .single();

    if (error) return { error: error.message };
    
    setMessages(prev => [...prev, data]);
    return { data };
  }, [user]);

  return { messages, loading, sendMessage };
}

export function useYovoLiveRooms() {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<YovoRoom[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch initial rooms
    const fetchRooms = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('yovo_rooms')
        .select('*')
        .eq('is_live', true)
        .order('participants_count', { ascending: false });

      if (!error && data) {
        setRooms(data);
      }
      setLoading(false);
    };

    fetchRooms();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('yovo-rooms-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'yovo_rooms'
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newRoom = payload.new as YovoRoom;
            if (newRoom.is_live) {
              setRooms(prev => [newRoom, ...prev]);
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedRoom = payload.new as YovoRoom;
            setRooms(prev => {
              if (!updatedRoom.is_live) {
                return prev.filter(r => r.id !== updatedRoom.id);
              }
              return prev.map(r => r.id === updatedRoom.id ? updatedRoom : r);
            });
          } else if (payload.eventType === 'DELETE') {
            setRooms(prev => prev.filter(r => r.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const createRoom = useCallback(async (title: string, description?: string, category?: string) => {
    if (!user) return { error: 'Not authenticated' };

    const { data, error } = await supabase
      .from('yovo_rooms')
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

    if (error) return { error: error.message };
    return { data };
  }, [user]);

  const joinRoom = useCallback(async (roomId: string) => {
    const { error } = await supabase
      .from('yovo_rooms')
      .update({ participants_count: rooms.find(r => r.id === roomId)?.participants_count ?? 0 + 1 })
      .eq('id', roomId);

    return { error: error?.message };
  }, [rooms]);

  const leaveRoom = useCallback(async (roomId: string) => {
    const room = rooms.find(r => r.id === roomId);
    if (!room) return { error: 'Room not found' };

    const { error } = await supabase
      .from('yovo_rooms')
      .update({ participants_count: Math.max(0, room.participants_count - 1) })
      .eq('id', roomId);

    return { error: error?.message };
  }, [rooms]);

  const endRoom = useCallback(async (roomId: string) => {
    if (!user) return { error: 'Not authenticated' };

    const { error } = await supabase
      .from('yovo_rooms')
      .update({ 
        is_live: false, 
        ended_at: new Date().toISOString() 
      })
      .eq('id', roomId)
      .eq('host_id', user.id);

    return { error: error?.message };
  }, [user]);

  return { rooms, loading, createRoom, joinRoom, leaveRoom, endRoom };
}
