import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Users, Settings, Volume2, VolumeX, Mic, Send, 
  MoreVertical, Play, Pause, Globe
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { TamTamGroup, useTamTamCommunities, GroupPost } from '@/hooks/useTamTamCommunities';
import { SmartVoiceRecorder } from '@/components/voice/SmartVoiceRecorder';
import { triggerFeedback } from '@/utils/tamtamFeedback';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface CommunityMessage {
  id: string;
  community_id: string;
  user_id: string;
  message_type: string;
  audio_url: string | null;
  media_url: string | null;
  transcript_ba: string | null;
  transcript_fr: string | null;
  emoji_code: string | null;
  duration_seconds: number | null;
  created_at: string;
  profile?: {
    display_name: string | null;
    username: string;
    avatar_url: string | null;
  };
}

interface TamTamCommunityChatProps {
  community: TamTamGroup;
  onClose: () => void;
}

export function TamTamCommunityChat({ community, onClose }: TamTamCommunityChatProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { getGroupMembers } = useTamTamCommunities();
  
  const [messages, setMessages] = useState<CommunityMessage[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [showTranscript, setShowTranscript] = useState(true);
  const [continuousMode, setContinuousMode] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    fetchMessages();
    fetchMembers();

    // Realtime subscription
    const channel = supabase
      .channel(`community-${community.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'tamtam_community_messages',
          filter: `community_id=eq.${community.id}`
        },
        async (payload) => {
          const newMsg = payload.new as CommunityMessage;
          // Fetch profile
          const { data: profile } = await supabase
            .from('tamtam_profiles')
            .select('display_name, username, avatar_url')
            .eq('user_id', newMsg.user_id)
            .single();
          
          setMessages(prev => [...prev, { ...newMsg, profile }]);
          triggerFeedback('tamtam_message');
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [community.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tamtam_community_messages')
        .select('*')
        .eq('community_id', community.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Fetch profiles
      const userIds = [...new Set(data?.map(m => m.user_id) || [])];
      const { data: profiles } = await supabase
        .from('tamtam_profiles')
        .select('user_id, display_name, username, avatar_url')
        .in('user_id', userIds);

      const enrichedMessages = data?.map(m => ({
        ...m,
        profile: profiles?.find(p => p.user_id === m.user_id)
      })) || [];

      setMessages(enrichedMessages);
    } catch (err) {
      console.error('Error fetching messages:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    const membersList = await getGroupMembers(community.id);
    setMembers(membersList);
  };

  const sendMessage = async (audioBase64: string, duration: number) => {
    if (!user) return;
    setIsSending(true);

    try {
      // Upload audio
      const audioBlob = base64ToBlob(audioBase64, 'audio/webm');
      const fileName = `community_${community.id}_${Date.now()}.webm`;
      
      const { error: uploadError } = await supabase.storage
        .from('tamtam-audio')
        .upload(fileName, audioBlob, { contentType: 'audio/webm' });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('tamtam-audio')
        .getPublicUrl(fileName);

      // Insert message
      const { error } = await supabase
        .from('tamtam_community_messages')
        .insert({
          community_id: community.id,
          user_id: user.id,
          message_type: 'audio',
          audio_url: urlData.publicUrl,
          duration_seconds: duration
        });

      if (error) throw error;

      triggerFeedback('send');
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  const playAudio = (message: CommunityMessage) => {
    if (!message.audio_url) return;

    if (playingId === message.id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }

    audioRef.current = new Audio(message.audio_url);
    audioRef.current.onended = () => {
      setPlayingId(null);
      if (continuousMode) {
        const currentIndex = messages.findIndex(m => m.id === message.id);
        const nextMessage = messages[currentIndex + 1];
        if (nextMessage?.audio_url) {
          playAudio(nextMessage);
        }
      }
    };
    audioRef.current.play();
    setPlayingId(message.id);
    triggerFeedback('notification');
  };

  const base64ToBlob = (base64: string, mimeType: string): Blob => {
    const byteCharacters = atob(base64.replace(/^data:.*,/, ''));
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    return new Blob([new Uint8Array(byteNumbers)], { type: mimeType });
  };

  return (
    <div className="flex flex-col h-full bg-[#FAFAFA]">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3 flex items-center gap-3">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-xl"
        >
          <ArrowLeft className="w-5 h-5" />
        </motion.button>

        <Avatar className="w-10 h-10">
          <AvatarImage src={community.cover_url || ''} />
          <AvatarFallback className="bg-gradient-to-br from-purple-400 to-purple-600 text-white">
            {community.name[0]}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-800 truncate">{community.name}</h3>
          <p className="text-xs text-gray-500">{members.length} membres en ligne</p>
        </div>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setContinuousMode(!continuousMode)}
          className={`p-2 rounded-xl ${continuousMode ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}
        >
          {continuousMode ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowTranscript(!showTranscript)}
          className={`p-2 rounded-xl ${showTranscript ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'}`}
        >
          <Globe className="w-5 h-5" />
        </motion.button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
              className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full"
            />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12">
            <Mic className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">Aucun message</p>
            <p className="text-sm text-gray-400">Soyez le premier à parler !</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.user_id === user?.id;
            const isPlaying = playingId === msg.id;

            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}
              >
                {!isOwn && (
                  <Avatar className="w-8 h-8 flex-shrink-0">
                    <AvatarImage src={msg.profile?.avatar_url || ''} />
                    <AvatarFallback className="bg-gray-200 text-gray-600 text-xs">
                      {msg.profile?.display_name?.[0] || msg.profile?.username?.[0] || '?'}
                    </AvatarFallback>
                  </Avatar>
                )}

                <div className={`max-w-[75%] ${isOwn ? 'items-end' : 'items-start'}`}>
                  {!isOwn && (
                    <p className="text-xs text-gray-500 mb-1 ml-1">
                      {msg.profile?.display_name || msg.profile?.username}
                    </p>
                  )}

                  {msg.message_type === 'emoji' && msg.emoji_code ? (
                    <div className="text-5xl">{msg.emoji_code}</div>
                  ) : msg.audio_url ? (
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => playAudio(msg)}
                      className={`flex items-center gap-2 px-4 py-3 rounded-2xl ${
                        isOwn 
                          ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white' 
                          : 'bg-white shadow-sm border border-gray-100'
                      }`}
                    >
                      <div className={`p-2 rounded-full ${isOwn ? 'bg-white/20' : 'bg-blue-100'}`}>
                        {isPlaying ? (
                          <Pause className={`w-4 h-4 ${isOwn ? 'text-white' : 'text-blue-600'}`} />
                        ) : (
                          <Play className={`w-4 h-4 ${isOwn ? 'text-white' : 'text-blue-600'}`} />
                        )}
                      </div>
                      
                      {/* Audio Wave */}
                      <div className="flex items-center gap-0.5 h-6">
                        {[...Array(12)].map((_, i) => (
                          <motion.div
                            key={i}
                            animate={isPlaying ? {
                              height: [4, 16, 4],
                              transition: { repeat: Infinity, duration: 0.5, delay: i * 0.05 }
                            } : {}}
                            className={`w-0.5 rounded-full ${isOwn ? 'bg-white/60' : 'bg-gray-300'}`}
                            style={{ height: isPlaying ? undefined : Math.random() * 12 + 4 }}
                          />
                        ))}
                      </div>

                      <span className={`text-xs ${isOwn ? 'text-white/80' : 'text-gray-500'}`}>
                        {msg.duration_seconds}s
                      </span>
                    </motion.button>
                  ) : null}

                  {/* Transcript */}
                  {showTranscript && (msg.transcript_fr || msg.transcript_ba) && (
                    <div className={`mt-1 px-2 text-xs ${isOwn ? 'text-right' : ''}`}>
                      {msg.transcript_ba && (
                        <p className="text-orange-600">🇧🇯 {msg.transcript_ba}</p>
                      )}
                      {msg.transcript_fr && (
                        <p className="text-blue-600">🇫🇷 {msg.transcript_fr}</p>
                      )}
                    </div>
                  )}

                  <p className={`text-[10px] text-gray-400 mt-1 ${isOwn ? 'text-right mr-1' : 'ml-1'}`}>
                    {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true, locale: fr })}
                  </p>
                </div>
              </motion.div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t p-4">
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-gray-50 rounded-2xl p-3">
            <SmartVoiceRecorder
              onRecordingComplete={(audio) => sendMessage(audio, 5)}
            />
          </div>
        </div>
        
        {isRecording && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-2 text-center text-sm text-red-500"
          >
            🔴 Enregistrement en cours...
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default TamTamCommunityChat;
