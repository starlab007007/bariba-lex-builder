import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { X, Users, Search, MessageCircle, SortAsc, SortDesc } from 'lucide-react';
import { TamTamUserCard } from './TamTamUserCard';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';
import { useTamTamFollows } from '@/hooks/useTamTamFollows';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const list = type === 'followers' ? followers : following;

  // Filter and sort
  const filteredList = useMemo(() => {
    let result = [...list];
    
    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(item => {
        const profile = item.profile;
        if (!profile) return false;
        return (
          profile.username?.toLowerCase().includes(query) ||
          profile.display_name?.toLowerCase().includes(query)
        );
      });
    }
    
    // Sort by date
    result.sort((a, b) => {
      const dateA = new Date(a.created_at || 0).getTime();
      const dateB = new Date(b.created_at || 0).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });
    
    return result;
  }, [list, searchQuery, sortOrder]);

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
        className="w-full bg-background rounded-t-3xl max-h-[85vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold">
              {type === 'followers' ? t('followers') : t('following')}
            </h2>
            <span className="px-2 py-0.5 bg-primary/10 rounded-full text-xs text-primary">
              {list.length}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 bg-muted rounded-full flex items-center justify-center"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Search and Sort */}
        <div className="p-4 border-b border-border flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <button
            onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
            className="p-2 bg-muted rounded-lg"
          >
            {sortOrder === 'desc' ? (
              <SortDesc className="w-5 h-5" />
            ) : (
              <SortAsc className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* List */}
        <div className="p-4 space-y-3 overflow-y-auto max-h-[calc(85vh-160px)]">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin text-4xl">⏳</div>
            </div>
          ) : filteredList.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">
                {searchQuery ? '🔍' : type === 'followers' ? '👥' : '🔍'}
              </div>
              <p className="text-muted-foreground">
                {searchQuery
                  ? "Aucun résultat trouvé"
                  : type === 'followers' 
                    ? "Pas encore de followers" 
                    : "Ne suit personne encore"}
              </p>
            </div>
          ) : (
            filteredList.map((item) => {
              const profile = item.profile;
              if (!profile) return null;
              
              const targetId = type === 'followers' ? item.follower_id : item.following_id;
              const isCurrentUser = user?.id === targetId;
              
              // Check if current user follows this person
              const currentUserFollows = following.some(f => f.following_id === targetId);

              return (
                <div key={item.id} className="flex items-center gap-3">
                  <div className="flex-1">
                    <TamTamUserCard
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
                  </div>
                  {!isCurrentUser && onMessage && (
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleMessage(targetId)}
                      className="p-3 bg-primary text-primary-foreground rounded-xl flex items-center gap-2"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span className="text-sm font-medium hidden sm:inline">Message</span>
                    </motion.button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
