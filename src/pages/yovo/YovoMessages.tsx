import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Edit, Play, Pause, Check, CheckCheck, Send, Mic, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useYovoMessages } from '@/hooks/useYovoRealtime';
import { useYovoAudioRecorder } from '@/hooks/useYovoAudioRecorder';
import { Link } from 'react-router-dom';

export default function YovoMessages() {
  const { user } = useAuth();
  const { messages, loading, sendMessage } = useYovoMessages();
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [isRecordingMessage, setIsRecordingMessage] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const {
    isRecording,
    isUploading,
    duration,
    startRecording,
    stopRecording,
    cancelRecording
  } = useYovoAudioRecorder({
    onRecordingComplete: async (audioUrl, dur) => {
      if (selectedConversation) {
        await sendMessage(selectedConversation, audioUrl, dur);
        setIsRecordingMessage(false);
      }
    }
  });

  // Group messages by conversation
  const conversations = messages.reduce((acc, msg) => {
    const partnerId = msg.sender_id === user?.id ? msg.receiver_id : msg.sender_id;
    if (!acc[partnerId]) {
      acc[partnerId] = [];
    }
    acc[partnerId].push(msg);
    return acc;
  }, {} as Record<string, typeof messages>);

  const playMessage = (messageId: string, audioUrl: string) => {
    if (playingId === messageId) {
      audioRef.current?.pause();
      setPlayingId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.play();
        setPlayingId(messageId);
        audioRef.current.onended = () => setPlayingId(null);
      }
    }
  };

  if (!user) {
    return (
      <div className="px-4 py-6 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-20 h-20 bg-orange-500/20 rounded-full flex items-center justify-center mb-4">
          <Edit className="w-10 h-10 text-orange-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Connexion requise</h2>
        <p className="text-slate-400 mb-4">Connectez-vous pour envoyer des messages vocaux</p>
        <Link to="/yovo/auth">
          <Button className="bg-gradient-to-r from-orange-500 to-pink-500">
            Se connecter
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 space-y-4">
      <audio ref={audioRef} className="hidden" />
      
      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <Input
            placeholder="Rechercher une conversation..."
            className="pl-12 bg-slate-900/50 border-white/10 h-12 rounded-xl text-white placeholder:text-slate-500"
          />
        </div>
        <Button size="icon" className="w-12 h-12 bg-orange-500 hover:bg-orange-600 rounded-xl">
          <Edit className="w-5 h-5" />
        </Button>
      </motion.div>

      {/* Recording overlay */}
      {isRecordingMessage && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-orange-500/20 to-pink-500/20 rounded-2xl p-6 border border-orange-500/30"
        >
          <div className="text-center mb-4">
            <p className="text-2xl font-mono text-white">
              {Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, '0')}
            </p>
            <p className="text-slate-400 text-sm">
              {isRecording ? 'Enregistrement...' : isUploading ? 'Envoi...' : 'Prêt'}
            </p>
          </div>
          <div className="flex items-center justify-center gap-4">
            {isRecording ? (
              <>
                <Button
                  onClick={cancelRecording}
                  variant="outline"
                  className="border-red-500/50 text-red-400"
                >
                  Annuler
                </Button>
                <Button
                  onClick={stopRecording}
                  className="bg-green-500 hover:bg-green-600 gap-2"
                >
                  <Send className="w-4 h-4" />
                  Envoyer
                </Button>
              </>
            ) : isUploading ? (
              <Loader2 className="w-8 h-8 text-orange-400 animate-spin" />
            ) : (
              <Button
                onClick={startRecording}
                className="bg-orange-500 hover:bg-orange-600 gap-2"
              >
                <Mic className="w-4 h-4" />
                Commencer
              </Button>
            )}
          </div>
        </motion.div>
      )}

      {/* Conversations or empty state */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 text-orange-400 animate-spin" />
        </div>
      ) : Object.keys(conversations).length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <div className="w-20 h-20 mx-auto bg-slate-800 rounded-full flex items-center justify-center mb-4">
            <Edit className="w-10 h-10 text-slate-600" />
          </div>
          <p className="text-slate-400">Aucune conversation</p>
          <p className="text-slate-500 text-sm mt-1">Commencez à échanger des messages vocaux!</p>
        </motion.div>
      ) : (
        <div className="space-y-2">
          {Object.entries(conversations).map(([partnerId, msgs], i) => {
            const lastMessage = msgs[msgs.length - 1];
            const isSent = lastMessage.sender_id === user.id;
            
            return (
              <motion.div
                key={partnerId}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => {
                  setSelectedConversation(partnerId);
                  setIsRecordingMessage(true);
                }}
                className="bg-slate-900/50 p-4 rounded-xl border border-white/5 flex items-center gap-4 cursor-pointer hover:bg-slate-800/50 transition-colors"
              >
                <Avatar className="w-14 h-14">
                  <AvatarFallback className="bg-gradient-to-br from-orange-500 to-pink-500 text-white text-lg">
                    {partnerId.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-white truncate">User {partnerId.slice(0, 8)}</span>
                    <span className="text-xs text-slate-500">
                      {new Date(lastMessage.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        playMessage(lastMessage.id, lastMessage.audio_url);
                      }}
                      className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400"
                    >
                      {playingId === lastMessage.id ? (
                        <Pause className="w-4 h-4" />
                      ) : (
                        <Play className="w-4 h-4 ml-0.5" />
                      )}
                    </button>
                    
                    <div className="flex items-center gap-0.5 flex-1">
                      {[...Array(20)].map((_, j) => (
                        <div
                          key={j}
                          className="w-1 bg-slate-600 rounded-full"
                          style={{ height: `${8 + Math.sin(j * 0.8) * 6}px` }}
                        />
                      ))}
                    </div>
                    
                    <span className="text-xs text-slate-500">
                      0:{(lastMessage.duration_seconds || 0).toString().padStart(2, '0')}
                    </span>
                    
                    {isSent && (
                      lastMessage.is_read ? (
                        <CheckCheck className="w-4 h-4 text-blue-400" />
                      ) : (
                        <Check className="w-4 h-4 text-slate-500" />
                      )
                    )}
                  </div>
                </div>

                {msgs.filter(m => !m.is_read && m.sender_id !== user.id).length > 0 && (
                  <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center text-xs text-white font-medium">
                    {msgs.filter(m => !m.is_read && m.sender_id !== user.id).length}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
