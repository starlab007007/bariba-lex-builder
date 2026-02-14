import React from 'react';
import { motion } from 'framer-motion';
import { Plus, MessageCircle, ChevronDown, UserPlus, UserCheck, Clock, Settings } from 'lucide-react';

interface KuaishouActionButtonsProps {
  isOwnProfile: boolean;
  // For own profile
  onBroadcast?: () => void;
  onOpenMessages?: () => void;
  onEditProfile?: () => void;
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
  onEditProfile,
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
        transition={{ delay: 0.4 }}
        className="px-4 pb-4"
      >
        {/* Full width Follow button (Kuaishou orange style) */}
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={onBroadcast}
          className="w-full py-3.5 bg-[hsl(var(--kuaishou-orange))] text-white rounded-full font-semibold flex items-center justify-center gap-2 shadow-lg shadow-[hsl(var(--kuaishou-orange)/0.4)]"
        >
          <Plus className="w-5 h-5" strokeWidth={2.5} />
          <span>Diffuser aux abonnés</span>
        </motion.button>

        {/* Secondary buttons */}
        <div className="flex items-center justify-center gap-6 mt-4">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onOpenMessages}
            className="flex flex-col items-center gap-1"
          >
            <div className="w-11 h-11 rounded-full bg-[hsl(var(--kuaishou-gray-light))] flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-[hsl(var(--kuaishou-text))]" />
            </div>
            <span className="text-[10px] text-[hsl(var(--kuaishou-text-muted))]">Messages</span>
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onEditProfile}
            className="flex flex-col items-center gap-1"
          >
            <div className="w-11 h-11 rounded-full bg-[hsl(var(--kuaishou-gray-light))] flex items-center justify-center">
              <Settings className="w-5 h-5 text-[hsl(var(--kuaishou-text))]" />
            </div>
            <span className="text-[10px] text-[hsl(var(--kuaishou-text-muted))]">Modifier</span>
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.9 }}
            className="flex flex-col items-center gap-1"
          >
            <div className="w-11 h-11 rounded-full bg-[hsl(var(--kuaishou-gray-light))] flex items-center justify-center">
              <ChevronDown className="w-5 h-5 text-[hsl(var(--kuaishou-text))]" />
            </div>
            <span className="text-[10px] text-[hsl(var(--kuaishou-text-muted))]">Plus</span>
          </motion.button>
        </div>
      </motion.div>
    );
  }

  // Other user's profile
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="px-4 pb-4"
    >
      {/* Full width Follow button */}
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={onFollow}
        className={`w-full py-3.5 rounded-full font-semibold flex items-center justify-center gap-2 transition-all ${
          isFollowing
            ? 'bg-[hsl(var(--kuaishou-gray-light))] text-[hsl(var(--kuaishou-text))]'
            : 'bg-[hsl(var(--kuaishou-orange))] text-white shadow-lg shadow-[hsl(var(--kuaishou-orange)/0.4)]'
        }`}
      >
        {isFollowing ? (
          <>
            <UserCheck className="w-5 h-5" />
            <span>Abonné</span>
          </>
        ) : (
          <>
            <Plus className="w-5 h-5" strokeWidth={2.5} />
            <span>Follow</span>
          </>
        )}
      </motion.button>

      {/* Secondary buttons */}
      <div className="flex items-center justify-center gap-6 mt-4">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onMessage}
          className="flex flex-col items-center gap-1"
        >
          <div className="w-11 h-11 rounded-full bg-[hsl(var(--kuaishou-gray-light))] flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-[hsl(var(--kuaishou-text))]" />
          </div>
          <span className="text-[10px] text-[hsl(var(--kuaishou-text-muted))]">Message</span>
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onFriendRequest}
          disabled={friendStatus !== 'none'}
          className="flex flex-col items-center gap-1"
        >
          <div className={`w-11 h-11 rounded-full flex items-center justify-center ${
            friendStatus === 'accepted'
              ? 'bg-green-100'
              : friendStatus === 'pending'
              ? 'bg-amber-100'
              : 'bg-purple-100'
          }`}>
            {friendStatus === 'accepted' ? (
              <span className="text-lg">🤝</span>
            ) : friendStatus === 'pending' ? (
              <Clock className="w-5 h-5 text-amber-600" />
            ) : (
              <UserPlus className="w-5 h-5 text-purple-600" />
            )}
          </div>
          <span className="text-[10px] text-[hsl(var(--kuaishou-text-muted))]">
            {friendStatus === 'accepted' ? 'Ami' : friendStatus === 'pending' ? 'En attente' : 'Ami'}
          </span>
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.9 }}
          className="flex flex-col items-center gap-1"
        >
          <div className="w-11 h-11 rounded-full bg-[hsl(var(--kuaishou-gray-light))] flex items-center justify-center">
            <ChevronDown className="w-5 h-5 text-[hsl(var(--kuaishou-text))]" />
          </div>
          <span className="text-[10px] text-[hsl(var(--kuaishou-text-muted))]">Plus</span>
        </motion.button>
      </div>
    </motion.div>
  );
};

export default KuaishouActionButtons;
