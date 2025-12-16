import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Users, UserPlus } from 'lucide-react';
import { TamTamUserCard } from './TamTamUserCard';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';
import { useTamTamFollows } from '@/hooks/useTamTamFollows';
import { useAuth } from '@/contexts/AuthContext';

interface TamTamFollowersListProps {
  userId: string;
  type: 'followers' | 'following';
  isOpen: boolean;
  onClose: () => void;
  onMessage?: (userId: string) => void;
}

export function TamTamFollowersList({ userId, type, isOpen, onClose, onMessage }: TamTamFollowersListProps) {
  const { t } = useTamTamLanguage();
  const { user } = useAuth();
  const { followers, following, followUser, unfollowUser, loading } = useTamTamFollows(userId);

  const list = type === 'followers' ? followers : following;

  const handleFollow = async (targetUserId: string) => {
    await followUser(targetUserId);
  };

  const handleUnfollow = async (targetUserId: string) => {
    await unfollowUser(targetUserId);
  };

  const handleMessage = (targetUserId: string) => {
    onMessage?.(targetUserId);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-end"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25 }}
        className="w-full bg-tamtam-bg rounded-t-3xl max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-tamtam-border">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-tamtam-primary" />
            <h2 className="text-lg font-bold text-tamtam-text">
              {type === 'followers' ? t('followers') : t('following')}
            </h2>
            <span className="px-2 py-0.5 bg-tamtam-primary/10 rounded-full text-xs text-tamtam-primary">
              {list.length}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 bg-tamtam-surface rounded-full flex items-center justify-center"
          >
            <X className="w-5 h-5 text-tamtam-text-muted" />
          </button>
        </div>

        {/* List */}
        <div className="p-4 space-y-3 overflow-y-auto max-h-[calc(80vh-80px)]">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin text-4xl">⏳</div>
            </div>
          ) : list.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">
                {type === 'followers' ? '👥' : '🔍'}
              </div>
              <p className="text-tamtam-text-muted">
                {type === 'followers' 
                  ? "Pas encore de followers" 
                  : "Ne suit personne encore"}
              </p>
            </div>
          ) : (
            list.map((item) => {
              const profile = item.profile;
              if (!profile) return null;
              
              const targetId = type === 'followers' ? item.follower_id : item.following_id;
              const isCurrentUser = user?.id === targetId;
              
              // Check if current user follows this person
              const currentUserFollows = following.some(f => f.following_id === targetId);

              return (
                <TamTamUserCard
                  key={item.id}
                  user={{
                    id: profile.id,
                    user_id: targetId,
                    username: profile.username,
                    display_name: profile.display_name,
                    avatar_url: profile.avatar_url,
                    bio_audio_url: profile.bio_audio_url
                  }}
                  isFollowing={currentUserFollows}
                  onFollow={!isCurrentUser ? () => handleFollow(targetId) : undefined}
                  onUnfollow={!isCurrentUser ? () => handleUnfollow(targetId) : undefined}
                  onMessage={!isCurrentUser ? () => handleMessage(targetId) : undefined}
                />
              );
            })
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
