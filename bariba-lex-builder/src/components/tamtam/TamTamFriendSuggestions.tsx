import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, MessageCircle, Eye, X, Users, MapPin, Sparkles } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useFriendSuggestions, FriendSuggestion } from '@/hooks/useFriendSuggestions';
import { useTamTamFriends } from '@/hooks/useTamTamFriends';
import { triggerFeedback } from '@/utils/tamtamFeedback';
import { useToast } from '@/hooks/use-toast';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';

interface TamTamFriendSuggestionsProps {
  onMessage?: (userId: string) => void;
  onViewProfile?: (userId: string) => void;
}

export function TamTamFriendSuggestions({ onMessage, onViewProfile }: TamTamFriendSuggestionsProps) {
  const { suggestions, loading, dismissSuggestion } = useFriendSuggestions();
  const { sendFriendRequest } = useTamTamFriends();
  const { toast } = useToast();
  const { t } = useTamTamLanguage();

  const handleAddFriend = async (suggestion: FriendSuggestion) => {
    triggerFeedback('friend_request');
    const { error } = await sendFriendRequest(suggestion.suggested_user_id);
    if (error) {
      toast({ title: "Erreur", description: error, variant: "destructive" });
    } else {
      toast({ title: "✅ Demande envoyée !" });
      dismissSuggestion(suggestion.suggested_user_id);
    }
  };

  const getReasonBadge = (reason: string | null, mutualCount: number) => {
    switch (reason) {
      case 'mutual_friends':
        return (
          <span className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
            <Users className="w-3 h-3" />
            {mutualCount} {mutualCount > 1 ? 'amis' : 'ami'} en commun
          </span>
        );
      case 'same_community':
        return (
          <span className="flex items-center gap-1 text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
            <Sparkles className="w-3 h-3" />
            Même communauté
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
            <Sparkles className="w-3 h-3" />
            Populaire
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="flex gap-3 overflow-x-auto pb-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="w-36 h-48 bg-gray-100 rounded-2xl animate-pulse flex-shrink-0" />
          ))}
        </div>
      </div>
    );
  }

  if (suggestions.length === 0) return null;

  return (
    <div className="p-4">
      <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
        <UserPlus className="w-5 h-5 text-blue-500" />
        Suggestions d'amis
      </h3>

      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
        <AnimatePresence>
          {suggestions.map((suggestion, index) => (
            <motion.div
              key={suggestion.id}
              initial={{ opacity: 0, scale: 0.8, x: 50 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.8, x: -50 }}
              transition={{ delay: index * 0.1 }}
              className="w-40 flex-shrink-0 bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100"
            >
              {/* Dismiss button */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  triggerFeedback('notification');
                  dismissSuggestion(suggestion.suggested_user_id);
                }}
                className="absolute top-2 right-2 z-10 w-6 h-6 bg-white/80 rounded-full flex items-center justify-center shadow"
              >
                <X className="w-3 h-3 text-gray-500" />
              </motion.button>

              {/* Profile Card */}
              <div className="relative p-4 flex flex-col items-center">
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  onClick={() => onViewProfile?.(suggestion.suggested_user_id)}
                  className="cursor-pointer"
                >
                  <Avatar className="w-16 h-16 ring-2 ring-blue-100">
                    <AvatarImage src={suggestion.profile?.avatar_url || ''} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-400 to-blue-600 text-white text-xl">
                      {suggestion.profile?.display_name?.[0] || suggestion.profile?.username?.[0] || '?'}
                    </AvatarFallback>
                  </Avatar>
                </motion.div>

                <h4 className="font-medium text-gray-800 mt-2 text-sm text-center truncate w-full">
                  {suggestion.profile?.display_name || suggestion.profile?.username || 'Utilisateur'}
                </h4>

                {suggestion.profile?.location && (
                  <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3" />
                    {suggestion.profile.location}
                  </p>
                )}

                <div className="mt-2">
                  {getReasonBadge(suggestion.reason, suggestion.mutual_friends_count)}
                </div>
              </div>

              {/* Actions */}
              <div className="border-t border-gray-100 p-2 flex gap-2">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleAddFriend(suggestion)}
                  className="flex-1 flex items-center justify-center gap-1 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl text-xs font-medium"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Ajouter
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onMessage?.(suggestion.suggested_user_id)}
                  className="p-2 bg-gray-100 rounded-xl"
                >
                  <MessageCircle className="w-4 h-4 text-gray-600" />
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onViewProfile?.(suggestion.suggested_user_id)}
                  className="p-2 bg-gray-100 rounded-xl"
                >
                  <Eye className="w-4 h-4 text-gray-600" />
                </motion.button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default TamTamFriendSuggestions;
