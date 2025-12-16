import React, { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  MessageCircle, 
  UserPlus, 
  UserCheck, 
  Clock, 
  Play, 
  Pause,
  BadgeCheck,
  Loader2
} from 'lucide-react';
import { usePublicProfile } from '@/hooks/usePublicProfile';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';
import { TamTamPrivateMessages } from '@/components/tamtam/TamTamPrivateMessages';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { triggerFeedback } from '@/utils/tamtamFeedback';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function TamTamPublicProfile() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { t } = useTamTamLanguage();
  const { profile, posts, isLoading, isOwnProfile, isFollowing, friendStatus, followUser, sendFriendRequest } = usePublicProfile(userId);
  
  const [showMessages, setShowMessages] = useState(false);
  const [isPlayingBio, setIsPlayingBio] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleBack = () => {
    triggerFeedback('notification');
    navigate(-1);
  };

  const handleFollow = async () => {
    triggerFeedback('notification');
    await followUser();
  };

  const handleFriendRequest = async () => {
    triggerFeedback('send');
    await sendFriendRequest();
  };

  const handleMessage = () => {
    triggerFeedback('send');
    setShowMessages(true);
  };

  const handlePlayBio = async () => {
    if (!profile?.bio_audio_url) return;
    
    triggerFeedback('notification');
    if (isPlayingBio && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlayingBio(false);
    } else {
      setIsPlayingBio(true);
      audioRef.current = new Audio(profile.bio_audio_url);
      audioRef.current.onended = () => setIsPlayingBio(false);
      await audioRef.current.play();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center p-4">
        <p className="text-gray-500">Utilisateur non trouvé</p>
        <button
          onClick={handleBack}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-xl"
        >
          Retour
        </button>
      </div>
    );
  }

  const stats = [
    { label: 'Posts', value: profile.posts_count || 0 },
    { label: 'Abonnés', value: profile.followers_count || 0 },
    { label: 'Abonnements', value: profile.following_count || 0 },
    { label: 'Amis', value: profile.friends_count || 0 },
  ];

  return (
    <div className="min-h-screen bg-[#FAFAFA] pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 py-3">
        <div className="flex items-center gap-3">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleBack}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </motion.button>
          <h1 className="text-lg font-semibold text-gray-800">
            @{profile.username}
          </h1>
          {profile.is_verified && (
            <BadgeCheck className="w-5 h-5 text-blue-500" />
          )}
        </div>
      </div>

      {/* Profile Header */}
      <div className="bg-white p-6 border-b border-gray-100">
        <div className="flex items-start gap-4">
          <Avatar className="w-20 h-20 border-2 border-gray-100">
            <AvatarImage src={profile.avatar_url || undefined} />
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-emerald-500 text-white text-2xl">
              {profile.display_name?.[0] || profile.username[0]}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              {profile.display_name || profile.username}
              {profile.is_verified && <BadgeCheck className="w-5 h-5 text-blue-500" />}
            </h2>
            <p className="text-gray-500">@{profile.username}</p>
            
            {/* Bio Audio */}
            {profile.bio_audio_url && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handlePlayBio}
                className="mt-2 flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full text-sm"
              >
                {isPlayingBio ? (
                  <Pause className="w-4 h-4 text-blue-500" />
                ) : (
                  <Play className="w-4 h-4 text-blue-500" />
                )}
                <span className="text-gray-600">Écouter la bio</span>
              </motion.button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2 mt-6">
          {stats.map(stat => (
            <div key={stat.label} className="text-center">
              <p className="text-lg font-bold text-gray-800">{stat.value}</p>
              <p className="text-xs text-gray-500">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        {!isOwnProfile && (
          <div className="flex gap-3 mt-6">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleMessage}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-medium shadow-lg shadow-blue-500/30"
            >
              <MessageCircle className="w-5 h-5" />
              Envoyer un message
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleFollow}
              className={`px-6 py-3 rounded-xl font-medium flex items-center gap-2 ${
                isFollowing
                  ? 'bg-gray-100 text-gray-700'
                  : 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
              }`}
            >
              {isFollowing ? (
                <>
                  <UserCheck className="w-5 h-5" />
                  Abonné
                </>
              ) : (
                <>
                  <UserPlus className="w-5 h-5" />
                  Suivre
                </>
              )}
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleFriendRequest}
              disabled={friendStatus !== 'none'}
              className={`px-4 py-3 rounded-xl font-medium ${
                friendStatus === 'accepted'
                  ? 'bg-green-100 text-green-700'
                  : friendStatus === 'pending'
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-purple-500 text-white shadow-lg shadow-purple-500/30'
              }`}
            >
              {friendStatus === 'accepted' ? (
                '🤝 Ami'
              ) : friendStatus === 'pending' ? (
                <Clock className="w-5 h-5" />
              ) : (
                '🤝'
              )}
            </motion.button>
          </div>
        )}
      </div>

      {/* User Posts */}
      <div className="p-4">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Publications</h3>
        
        {posts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Aucune publication</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1">
            {posts.map(post => (
              <motion.div
                key={post.id}
                whileTap={{ scale: 0.98 }}
                className="aspect-square bg-gray-100 rounded-lg overflow-hidden relative"
              >
                {post.media_url ? (
                  <img 
                    src={post.media_url} 
                    alt="" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-100 to-emerald-100 flex items-center justify-center">
                    <Play className="w-8 h-8 text-blue-500" />
                  </div>
                )}
                <div className="absolute bottom-1 left-1 text-xs text-white bg-black/50 px-1 rounded">
                  {format(new Date(post.created_at), 'd MMM', { locale: fr })}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Private Messages Modal */}
      <TamTamPrivateMessages
        isOpen={showMessages}
        onClose={() => setShowMessages(false)}
        initialConversationId={userId}
      />
    </div>
  );
}
