import React from 'react';
import { motion } from 'framer-motion';
import { Send, MessageCircle, UserPlus, UserCheck, Clock } from 'lucide-react';

interface KuaishouActionButtonsProps {
  isOwnProfile: boolean;
  // For own profile
  onBroadcast?: () => void;
  onOpenMessages?: () => void;
  // For other profiles
  isFollowing?: boolean;
  friendStatus?: 'none' | 'pending' | 'accepted';
  onFollow?: () => void;
  onFriendRequest?: () => void;
  onMessage?: () => void;
}

export const KuaishouActionButtons: React.FC<KuaishouActionButtonsProps> = ({
  isOwnProfile,
  onBroadcast,
  onOpenMessages,
  isFollowing = false,
  friendStatus = 'none',
  onFollow,
  onFriendRequest,
  onMessage,
}) => {
  if (isOwnProfile) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="flex gap-2 px-4 mt-4"
      >
        {/* Broadcast button */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={onBroadcast}
          className="flex-1 py-3 bg-gradient-to-r from-[hsl(var(--kuaishou-primary))] to-[hsl(var(--kuaishou-primary-dark))] text-white rounded-xl font-medium flex items-center justify-center gap-2 shadow-lg shadow-[hsl(var(--kuaishou-primary)/0.3)] hover:shadow-xl transition-shadow"
        >
          <Send className="w-5 h-5" />
          <span className="text-sm sm:text-base">Message aux abonnés</span>
        </motion.button>

        {/* Messages button */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onOpenMessages}
          className="w-12 h-12 bg-white border border-[hsl(var(--kuaishou-border))] rounded-xl flex items-center justify-center hover:bg-[hsl(var(--kuaishou-bg))] transition-colors"
        >
          <MessageCircle className="w-5 h-5 text-[hsl(var(--kuaishou-primary))]" />
        </motion.button>
      </motion.div>
    );
  }

  // Other user's profile
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
      className="flex gap-2 px-4 mt-4"
    >
      {/* Message button */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={onMessage}
        className="flex-1 py-3 bg-gradient-to-r from-[hsl(var(--kuaishou-primary))] to-[hsl(var(--kuaishou-primary-dark))] text-white rounded-xl font-medium flex items-center justify-center gap-2 shadow-lg shadow-[hsl(var(--kuaishou-primary)/0.3)]"
      >
        <MessageCircle className="w-5 h-5" />
        <span>Envoyer un message</span>
      </motion.button>

      {/* Follow button */}
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={onFollow}
        className={`px-5 py-3 rounded-xl font-medium flex items-center gap-2 transition-colors ${
          isFollowing
            ? 'bg-muted text-foreground'
            : 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
        }`}
      >
        {isFollowing ? (
          <>
            <UserCheck className="w-5 h-5" />
            <span className="hidden sm:inline">Abonné</span>
          </>
        ) : (
          <>
            <UserPlus className="w-5 h-5" />
            <span className="hidden sm:inline">Suivre</span>
          </>
        )}
      </motion.button>

      {/* Friend request button */}
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={onFriendRequest}
        disabled={friendStatus !== 'none'}
        className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
          friendStatus === 'accepted'
            ? 'bg-green-100 text-green-700'
            : friendStatus === 'pending'
            ? 'bg-amber-100 text-amber-700'
            : 'bg-purple-500 text-white shadow-lg shadow-purple-500/30'
        }`}
      >
        {friendStatus === 'accepted' ? (
          <span className="text-lg">🤝</span>
        ) : friendStatus === 'pending' ? (
          <Clock className="w-5 h-5" />
        ) : (
          <span className="text-lg">🤝</span>
        )}
      </motion.button>
    </motion.div>
  );
};

export default KuaishouActionButtons;
