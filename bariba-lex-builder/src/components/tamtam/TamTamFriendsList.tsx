import { motion } from 'framer-motion';
import { X, Users, UserCheck } from 'lucide-react';
import { TamTamUserCard } from './TamTamUserCard';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';
import { useTamTamFriends } from '@/hooks/useTamTamFriends';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface TamTamFriendsListProps {
  isOpen: boolean;
  onClose: () => void;
  onMessage?: (userId: string) => void;
}

export function TamTamFriendsList({ isOpen, onClose, onMessage }: TamTamFriendsListProps) {
  const { t } = useTamTamLanguage();
  const { user } = useAuth();
  const { 
    friends, 
    pendingRequests, 
    sentRequests, 
    acceptFriendRequest, 
    rejectFriendRequest,
    loading 
  } = useTamTamFriends();

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
            <span className="text-xl">🤝</span>
            <h2 className="text-lg font-bold text-tamtam-text">{t('friends')}</h2>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 bg-tamtam-surface rounded-full flex items-center justify-center"
          >
            <X className="w-5 h-5 text-tamtam-text-muted" />
          </button>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="friends" className="w-full">
          <TabsList className="w-full bg-tamtam-surface rounded-none border-b border-tamtam-border">
            <TabsTrigger value="friends" className="flex-1 gap-2">
              <span>👥</span>
              <span>{t('friends')}</span>
              <span className="text-xs bg-tamtam-primary/10 px-2 rounded-full">
                {friends.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="requests" className="flex-1 gap-2">
              <span>📥</span>
              <span>Demandes</span>
              {pendingRequests.length > 0 && (
                <span className="text-xs bg-red-500 text-white px-2 rounded-full">
                  {pendingRequests.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="friends" className="p-4 space-y-3 overflow-y-auto max-h-[calc(80vh-140px)]">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin text-4xl">⏳</div>
              </div>
            ) : friends.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-2">🤝</div>
                <p className="text-tamtam-text-muted">Pas encore d'amis</p>
              </div>
            ) : (
              friends.map((friendship) => {
                const friendId = friendship.requester_id === user?.id 
                  ? friendship.addressee_id 
                  : friendship.requester_id;
                const profile = friendship.profile;
                
                if (!profile) return null;

                return (
                  <TamTamUserCard
                    key={friendship.id}
                    user={{
                      id: profile.id,
                      user_id: friendId,
                      username: profile.username,
                      display_name: profile.display_name,
                      avatar_url: profile.avatar_url,
                      bio_audio_url: profile.bio_audio_url
                    }}
                    isFriend={true}
                    friendshipStatus="accepted"
                    onMessage={() => handleMessage(friendId)}
                  />
                );
              })
            )}
          </TabsContent>

          <TabsContent value="requests" className="p-4 space-y-3 overflow-y-auto max-h-[calc(80vh-140px)]">
            {pendingRequests.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-2">📭</div>
                <p className="text-tamtam-text-muted">Aucune demande en attente</p>
              </div>
            ) : (
              pendingRequests.map((friendship) => {
                const profile = friendship.profile;
                if (!profile) return null;

                return (
                  <div key={friendship.id} className="space-y-2">
                    <TamTamUserCard
                      user={{
                        id: profile.id,
                        user_id: friendship.requester_id,
                        username: profile.username,
                        display_name: profile.display_name,
                        avatar_url: profile.avatar_url,
                        bio_audio_url: profile.bio_audio_url
                      }}
                      friendshipStatus="pending"
                    />
                    <div className="flex gap-2 pl-16">
                      <button
                        onClick={() => acceptFriendRequest(friendship.id, friendship.requester_id)}
                        className="flex-1 py-2 bg-green-500 text-white rounded-xl flex items-center justify-center gap-2"
                      >
                        <UserCheck className="w-4 h-4" />
                        <span>Accepter</span>
                      </button>
                      <button
                        onClick={() => rejectFriendRequest(friendship.id)}
                        className="flex-1 py-2 bg-red-100 text-red-600 rounded-xl"
                      >
                        Refuser
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  );
}
