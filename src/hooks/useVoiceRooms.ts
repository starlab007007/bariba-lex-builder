import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { uniqueChannelName } from '@/lib/realtime';
import { useAuth } from '@/contexts/AuthContext';

export interface VoiceRoom {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  host_id: string | null;
  is_live: boolean;
  participants_count: number;
  max_participants: number;
  cover_url: string | null;
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
  host?: {
    display_name: string;
    avatar_url: string;
  };
}

export function useVoiceRooms() {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<VoiceRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentRoom, setCurrentRoom] = useState<VoiceRoom | null>(null);

  // Fetch active rooms
  const fetchRooms = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tamtam_rooms')
        .select('*')
        .eq('is_live', true)
        .order('participants_count', { ascending: false });

      if (error) throw error;
      
      // Fetch host profiles separately
      const roomsWithHosts: VoiceRoom[] = [];
      for (const room of data || []) {
        let hostData = null;
        if (room.host_id) {
          const { data: profile } = await supabase
            .from('tamtam_profiles')
            .select('display_name, avatar_url')
            .eq('user_id', room.host_id)
            .single();
          hostData = profile;
        }
        roomsWithHosts.push({
          ...room,
          host: hostData || undefined
        });
      }
      
      setRooms(roomsWithHosts);
    } catch (error) {
      console.error('Error fetching rooms:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Create a new room
  const createRoom = useCallback(async (
    title: string, 
    description?: string, 
    category?: string
  ) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('tamtam_rooms')
        .insert({
          title,
          description,
          category,
          host_id: user.id,
          is_live: true,
          participants_count: 1,
          started_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      
      setCurrentRoom(data);
      return data;
    } catch (error) {
      console.error('Error creating room:', error);
      return null;
    }
  }, [user]);

  // Join a room
  const joinRoom = useCallback(async (roomId: string) => {
    if (!user) return false;

    try {
      // Get current count and increment
      const { data: roomData } = await supabase
        .from('tamtam_rooms')
        .select('participants_count')
        .eq('id', roomId)
        .single();

      if (roomData) {
        await supabase
          .from('tamtam_rooms')
          .update({ 
            participants_count: (roomData.participants_count || 0) + 1
          })
          .eq('id', roomId);
      }

      const room = rooms.find(r => r.id === roomId);
      if (room) {
        setCurrentRoom({ ...room, participants_count: (room.participants_count || 0) + 1 });
      }
      
      return true;
    } catch (error) {
      console.error('Error joining room:', error);
      return false;
    }
  }, [user, rooms]);

  // Leave room
  const leaveRoom = useCallback(async () => {
    if (!currentRoom) return;

    try {
      // Decrement participants
      await supabase
        .from('tamtam_rooms')
        .update({ 
          participants_count: Math.max(0, (currentRoom.participants_count || 1) - 1)
        })
        .eq('id', currentRoom.id);

      // If host is leaving, end the room
      if (currentRoom.host_id === user?.id) {
        await supabase
          .from('tamtam_rooms')
          .update({ 
            is_live: false,
            ended_at: new Date().toISOString()
          })
          .eq('id', currentRoom.id);
      }

      setCurrentRoom(null);
    } catch (error) {
      console.error('Error leaving room:', error);
    }
  }, [currentRoom, user]);

  // Subscribe to room updates
  useEffect(() => {
    fetchRooms();

    const channel = supabase
      .channel(uniqueChannelName('voice-rooms'))
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tamtam_rooms'
        },
        () => {
          fetchRooms();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchRooms]);

  return {
    rooms,
    loading,
    currentRoom,
    createRoom,
    joinRoom,
    leaveRoom,
    fetchRooms
  };
}
