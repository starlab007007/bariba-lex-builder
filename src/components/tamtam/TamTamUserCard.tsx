import { motion } from 'framer-motion';
import { Volume2, UserPlus, UserMinus, UserCheck, MessageCircle } from 'lucide-react';
import { useBilingualAudio } from '@/hooks/useBilingualAudio';
import { tamtamFeedback } from '@/utils/tamtamFeedback';

interface TamTamUserCardProps {
  user: {
    id: string;
    user_id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    bio_audio_url: string | null;
  };
  isFollowing?: boolean;
  isFriend?: boolean;
  friendshipStatus?: 'none' | 'pending' | 'accepted';
  onFollow?: () => void;
  onUnfollow?: () => void;
  onSendFriendRequest?: () => void;
  onAcceptFriend?: () => void;
  onMessage?: () => void;
  onPress?: () => void;
}

export function TamTamUserCard({
  user,
  isFollowing = false,
  isFriend = false,
  friendshipStatus = 'none',
  onFollow,
  onUnfollow,
  onSendFriendRequest,
  onAcceptFriend,
  onMessage,
  onPress
}: TamTamUserCardProps) {
  const { speakFrench } = useBilingualAudio();

  const handlePlayBio = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user.bio_audio_url) return;
    
    tamtamFeedback.play('click');
    try {
      const audio = new Audio(user.bio_audio_url);
      await audio.play();
    } catch (err) {
      console.error('[TamTamUserCard] Play bio error:', err);
    }
  };

  const handleFollowClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    tamtamFeedback.play('click');
    
    if (isFollowing) {
      onUnfollow?.();
    } else {
      onFollow?.();
      tamtamFeedback.play('success');
    }
  };

  const handleFriendClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    tamtamFeedback.play('click');
    
    if (friendshipStatus === 'pending') {
      onAcceptFriend?.();
      tamtamFeedback.play('success');
    } else if (friendshipStatus === 'none') {
      onSendFriendRequest?.();
    }
  };

  const handleMessageClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    tamtamFeedback.play('click');
    onMessage?.();
  };

  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.98 }}
      onClick={onPress}
      className="w-full bg-tamtam-surface rounded-2xl p-4 shadow-tamtam-soft flex items-center gap-3"
    >
      {/* Avatar */}
      <div className="relative">
        <div className="w-14 h-14 bg-tamtam-bg rounded-full flex items-center justify-center overflow-hidden">
          {user.avatar_url ? (
            <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-2xl">👤</span>
          )}
        </div>
        {isFriend && (
          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
            <span className="text-xs">✓</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 text-left">
        <p className="font-medium text-tamtam-text">
          {user.display_name || user.username}
        </p>
        <p className="text-xs text-tamtam-text-muted">@{user.username}</p>
      </div>

      {/* Bio audio button */}
      {user.bio_audio_url && (
        <button
          onClick={handlePlayBio}
          className="w-10 h-10 bg-tamtam-bg rounded-full flex items-center justify-center"
        >
          <Volume2 className="w-5 h-5 text-tamtam-primary" />
        </button>
      )}

      {/* Message button */}
      {onMessage && (
        <button
          onClick={handleMessageClick}
          className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center hover:bg-blue-200 transition-colors"
        >
          <MessageCircle className="w-5 h-5 text-blue-600" />
        </button>
      )}

      {/* Follow/Friend buttons */}
      <div className="flex gap-2">
        {onFollow && (
          <button
            onClick={handleFollowClick}
            className={`w-10 h-10 rounded-full flex items-center justify-center ${
              isFollowing 
                ? 'bg-tamtam-primary/20 text-tamtam-primary' 
                : 'bg-tamtam-primary text-white'
            }`}
          >
            {isFollowing ? (
              <UserMinus className="w-5 h-5" />
            ) : (
              <UserPlus className="w-5 h-5" />
            )}
          </button>
        )}

        {onSendFriendRequest && friendshipStatus !== 'accepted' && (
          <button
            onClick={handleFriendClick}
            className={`w-10 h-10 rounded-full flex items-center justify-center ${
              friendshipStatus === 'pending'
                ? 'bg-amber-100 text-amber-600'
                : 'bg-tamtam-secondary text-white'
            }`}
          >
            {friendshipStatus === 'pending' ? (
              <UserCheck className="w-5 h-5" />
            ) : (
              <span className="text-lg">🤝</span>
            )}
          </button>
        )}
      </div>
    </motion.button>
  );
}
