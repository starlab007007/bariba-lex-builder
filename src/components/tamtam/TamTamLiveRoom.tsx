import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Users, Heart, Flame, PartyPopper, ThumbsUp, Mic, MicOff, 
  Volume2, Share2, MoreVertical
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useTamTamLive, TamTamLive, LiveReaction } from '@/hooks/useTamTamLive';
import { triggerFeedback } from '@/utils/tamtamFeedback';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface TamTamLiveRoomProps {
  live: TamTamLive;
  onClose: () => void;
}

const REACTIONS = [
  { type: 'heart', emoji: '❤️', color: 'from-red-400 to-red-600' },
  { type: 'fire', emoji: '🔥', color: 'from-orange-400 to-orange-600' },
  { type: 'clap', emoji: '👏', color: 'from-yellow-400 to-yellow-600' },
  { type: 'laugh', emoji: '😂', color: 'from-green-400 to-green-600' },
];

export function TamTamLiveRoom({ live, onClose }: TamTamLiveRoomProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { 
    reactions, viewerCount, leaveLive, sendReaction, endLive 
  } = useTamTamLive();
  
  const [isMuted, setIsMuted] = useState(false);
  const [floatingReactions, setFloatingReactions] = useState<Array<{ id: string; type: string; x: number }>>([]);
  
  const isHost = user?.id === live.host_id;

  useEffect(() => {
    // Add reactions to floating display
    reactions.forEach((reaction) => {
      const id = `${reaction.id}-${Date.now()}`;
      const x = Math.random() * 60 + 20; // Random x position between 20-80%
      setFloatingReactions(prev => [...prev, { id, type: reaction.reaction_type, x }]);
      
      // Remove after animation
      setTimeout(() => {
        setFloatingReactions(prev => prev.filter(r => r.id !== id));
      }, 3000);
    });
  }, [reactions]);

  const handleSendReaction = async (type: string) => {
    triggerFeedback(type === 'heart' ? 'heart_like' : 'notification');
    await sendReaction(live.id, type);
  };

  const handleLeave = async () => {
    triggerFeedback('notification');
    await leaveLive(live.id);
    onClose();
  };

  const handleEndLive = async () => {
    triggerFeedback('success');
    await endLive(live.id);
    toast({ title: "🔴 Direct terminé" });
    onClose();
  };

  const getEmojiForType = (type: string) => {
    return REACTIONS.find(r => r.type === type)?.emoji || '❤️';
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-gradient-to-b from-gray-900 via-gray-800 to-black z-50 flex flex-col"
    >
      {/* Floating Reactions */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <AnimatePresence>
          {floatingReactions.map((reaction) => (
            <motion.div
              key={reaction.id}
              initial={{ y: '100%', x: `${reaction.x}%`, opacity: 1, scale: 1 }}
              animate={{ y: '-20%', opacity: 0, scale: 1.5 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 3, ease: 'easeOut' }}
              className="absolute text-4xl"
            >
              {getEmojiForType(reaction.type)}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between p-4 relative z-10">
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10 ring-2 ring-red-500">
            <AvatarImage src={live.host?.avatar_url || ''} />
            <AvatarFallback className="bg-gradient-to-br from-red-400 to-red-600 text-white">
              {live.host?.display_name?.[0] || live.host?.username?.[0] || '?'}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold text-white">{live.host?.display_name || live.host?.username}</h3>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-xs text-red-400">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                EN DIRECT
              </span>
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <Users className="w-3 h-3" />
                {viewerCount}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              navigator.share?.({ title: live.title, url: window.location.href });
            }}
            className="p-2 bg-white/10 rounded-full"
          >
            <Share2 className="w-5 h-5 text-white" />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleLeave}
            className="p-2 bg-red-500 rounded-full"
          >
            <X className="w-5 h-5 text-white" />
          </motion.button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center relative">
        {/* Host Avatar (Large) */}
        <motion.div
          animate={{ scale: [1, 1.02, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="relative"
        >
          <Avatar className="w-32 h-32 ring-4 ring-red-500 ring-offset-4 ring-offset-gray-900">
            <AvatarImage src={live.host?.avatar_url || ''} />
            <AvatarFallback className="bg-gradient-to-br from-red-400 to-red-600 text-white text-4xl">
              {live.host?.display_name?.[0] || '?'}
            </AvatarFallback>
          </Avatar>
          
          {/* Audio Visualization Ring */}
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.2, 0.5] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="absolute inset-0 rounded-full border-4 border-red-500"
          />
          <motion.div
            animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0.1, 0.3] }}
            transition={{ repeat: Infinity, duration: 1.5, delay: 0.2 }}
            className="absolute inset-0 rounded-full border-2 border-red-400"
          />
        </motion.div>

        <h2 className="text-xl font-bold text-white mt-6 text-center px-4">{live.title}</h2>
        <p className="text-gray-400 text-sm mt-2">En direct depuis {live.community_id ? 'une communauté' : 'leur profil'}</p>
      </div>

      {/* Bottom Controls */}
      <div className="p-6 space-y-4">
        {/* Reactions */}
        <div className="flex justify-center gap-4">
          {REACTIONS.map((reaction) => (
            <motion.button
              key={reaction.type}
              whileTap={{ scale: 0.8 }}
              onClick={() => handleSendReaction(reaction.type)}
              className={`w-14 h-14 rounded-full bg-gradient-to-r ${reaction.color} flex items-center justify-center text-2xl shadow-lg`}
            >
              {reaction.emoji}
            </motion.button>
          ))}
        </div>

        {/* Host Controls */}
        {isHost && (
          <div className="flex justify-center gap-4">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsMuted(!isMuted)}
              className={`px-6 py-3 rounded-xl flex items-center gap-2 ${
                isMuted ? 'bg-red-500 text-white' : 'bg-white/10 text-white'
              }`}
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              {isMuted ? 'Muet' : 'Micro'}
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleEndLive}
              className="px-6 py-3 bg-red-600 text-white rounded-xl font-medium"
            >
              Terminer le direct
            </motion.button>
          </div>
        )}

        {/* Volume Control for Viewers */}
        {!isHost && (
          <div className="flex justify-center">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsMuted(!isMuted)}
              className={`px-6 py-3 rounded-xl flex items-center gap-2 ${
                isMuted ? 'bg-white/10 text-gray-400' : 'bg-white/20 text-white'
              }`}
            >
              <Volume2 className="w-5 h-5" />
              {isMuted ? 'Son coupé' : 'Son activé'}
            </motion.button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default TamTamLiveRoom;
