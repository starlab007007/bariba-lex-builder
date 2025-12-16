import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Loader2, Users } from 'lucide-react';
import { useTamTamSearch } from '@/hooks/useTamTamSearch';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';
import { useTamTamFollows } from '@/hooks/useTamTamFollows';
import { useTamTamFriends } from '@/hooks/useTamTamFriends';
import { TamTamUserCard } from './TamTamUserCard';
import { useNavigate } from 'react-router-dom';
import { triggerFeedback } from '@/utils/tamtamFeedback';

interface TamTamUserSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onMessage?: (userId: string) => void;
}

export function TamTamUserSearch({ isOpen, onClose, onMessage }: TamTamUserSearchProps) {
  const { t } = useTamTamLanguage();
  const navigate = useNavigate();
  const { query, results, isSearching, searchUsers, clearSearch } = useTamTamSearch();
  const { following, followUser, unfollowUser } = useTamTamFollows();
  const { friends, pendingRequests, sendFriendRequest, acceptFriendRequest } = useTamTamFriends();

  const handleClose = () => {
    clearSearch();
    onClose();
  };

  // Check if we're following a user by comparing following_id
  const isFollowing = (userId: string) => following.some(f => f.following_id === userId);
  
  const getFriendStatus = (userId: string): 'none' | 'pending' | 'accepted' => {
    // Check friends by comparing requester_id or addressee_id
    if (friends.some(f => f.requester_id === userId || f.addressee_id === userId)) return 'accepted';
    if (pendingRequests.some(r => r.requester_id === userId)) return 'pending';
    return 'none';
  };

  const handleFollow = async (userId: string) => {
    triggerFeedback('notification');
    if (isFollowing(userId)) {
      await unfollowUser(userId);
    } else {
      await followUser(userId);
    }
  };

  const handleFriend = async (userId: string) => {
    triggerFeedback('notification');
    const status = getFriendStatus(userId);
    if (status === 'none') {
      await sendFriendRequest(userId);
    } else if (status === 'pending') {
      const request = pendingRequests.find(r => r.requester_id === userId);
      if (request) {
        await acceptFriendRequest(request.id, request.requester_id);
      }
    }
  };

  const handleViewProfile = (userId: string) => {
    triggerFeedback('notification');
    handleClose();
    navigate(`/tamtam/user/${userId}`);
  };

  const handleMessage = (userId: string) => {
    triggerFeedback('send');
    handleClose();
    onMessage?.(userId);
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
      onClick={handleClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25 }}
        onClick={(e) => e.stopPropagation()}
        className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[85vh] flex flex-col"
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Search className="w-5 h-5 text-blue-500" />
              {t('search') || 'Rechercher'}
            </h2>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => searchUsers(e.target.value)}
              placeholder="Rechercher un ami par nom..."
              className="w-full pl-12 pr-10 py-3 bg-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-gray-800 placeholder-gray-400"
              autoFocus
            />
            {query && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 rounded-full"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-4">
          <AnimatePresence mode="wait">
            {isSearching ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-12"
              >
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                <p className="mt-2 text-gray-500">Recherche...</p>
              </motion.div>
            ) : results.length > 0 ? (
              <motion.div
                key="results"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-3"
              >
                {results.map(searchUser => (
                  <TamTamUserCard
                    key={searchUser.user_id}
                    user={{
                      id: searchUser.user_id,
                      user_id: searchUser.user_id,
                      username: searchUser.username,
                      display_name: searchUser.display_name,
                      avatar_url: searchUser.avatar_url,
                      bio_audio_url: searchUser.bio_audio_url
                    }}
                    isFollowing={isFollowing(searchUser.user_id)}
                    friendshipStatus={getFriendStatus(searchUser.user_id)}
                    onFollow={() => handleFollow(searchUser.user_id)}
                    onUnfollow={() => handleFollow(searchUser.user_id)}
                    onSendFriendRequest={() => handleFriend(searchUser.user_id)}
                    onAcceptFriend={() => handleFriend(searchUser.user_id)}
                    onMessage={() => handleMessage(searchUser.user_id)}
                    onPress={() => handleViewProfile(searchUser.user_id)}
                  />
                ))}
              </motion.div>
            ) : query ? (
              <motion.div
                key="no-results"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-12"
              >
                <Users className="w-12 h-12 text-gray-300 mb-3" />
                <p className="text-gray-500">Aucun utilisateur trouvé</p>
                <p className="text-sm text-gray-400 mt-1">Essayez un autre nom</p>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-12"
              >
                <Search className="w-12 h-12 text-gray-300 mb-3" />
                <p className="text-gray-500">Trouvez vos amis</p>
                <p className="text-sm text-gray-400 mt-1">Recherchez par nom ou username</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}
