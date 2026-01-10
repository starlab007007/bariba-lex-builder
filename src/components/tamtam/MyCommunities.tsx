import React from 'react';
import { motion } from 'framer-motion';
import { Users, ChevronRight, Crown, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Community {
  id: string;
  name: string;
  description?: string | null;
  category?: string | null;
  cover_url?: string | null;
  members_count?: number | null;
  is_verified?: boolean | null;
  owner_id?: string | null;
}

interface MyCommunitiesProps {
  communities: Community[];
  currentUserId?: string;
  onOpenChat?: (communityId: string) => void;
}

const CATEGORY_ICONS: Record<string, string> = {
  agriculture: '🌾',
  education: '📚',
  sante: '🏥',
  commerce: '🛒',
  culture: '🎭',
  sport: '⚽',
  musique: '🎵',
  religion: '🕌',
  default: '🏘️',
};

export const MyCommunities: React.FC<MyCommunitiesProps> = ({
  communities,
  currentUserId,
  onOpenChat,
}) => {
  const navigate = useNavigate();

  if (communities.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center py-12 px-4"
      >
        <div className="text-5xl mb-4">🏘️</div>
        <h3 className="text-lg font-semibold mb-2">Aucune communauté</h3>
        <p className="text-muted-foreground text-sm mb-4">
          Rejoignez des communautés pour partager avec d'autres membres
        </p>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/tamtam/social')}
          className="px-6 py-2 bg-primary text-primary-foreground rounded-full font-medium"
        >
          Explorer les communautés
        </motion.button>
      </motion.div>
    );
  }

  return (
    <div className="space-y-3 px-4">
      {communities.map((community, index) => (
        <motion.div
          key={community.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05 }}
          className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border hover:bg-muted/50 transition-colors"
        >
          {/* Avatar/Icon */}
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-2xl overflow-hidden">
            {community.cover_url ? (
              <img src={community.cover_url} alt="" className="w-full h-full object-cover" />
            ) : (
              CATEGORY_ICONS[community.category || 'default'] || CATEGORY_ICONS.default
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold truncate">{community.name}</span>
              {community.is_verified && (
                <span className="text-blue-500">✓</span>
              )}
              {community.owner_id === currentUserId && (
                <Crown className="w-4 h-4 text-yellow-500" />
              )}
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {community.members_count || 0}
              </span>
              {community.category && (
                <span className="capitalize">{community.category}</span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {onOpenChat && (
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => onOpenChat(community.id)}
                className="p-2 bg-primary/10 text-primary rounded-full"
              >
                <MessageCircle className="w-4 h-4" />
              </motion.button>
            )}
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </div>
        </motion.div>
      ))}
    </div>
  );
};
