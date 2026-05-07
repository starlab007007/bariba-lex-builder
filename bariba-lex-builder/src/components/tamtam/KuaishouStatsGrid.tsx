import React from 'react';
import { motion } from 'framer-motion';
import { ShoppingBag, Users } from 'lucide-react';

interface KuaishouStatsGridProps {
  postsCount: number;
  followersCount: number;
  followingCount: number;
  friendsCount: number;
  onPostsClick?: () => void;
  onFollowersClick?: () => void;
  onFollowingClick?: () => void;
  onFriendsClick?: () => void;
}

export const KuaishouStatsGrid: React.FC<KuaishouStatsGridProps> = ({
  postsCount,
  followersCount,
  followingCount,
  friendsCount,
  onPostsClick,
  onFollowersClick,
  onFollowingClick,
  onFriendsClick,
}) => {
  return (
    <div className="px-4 py-3">
      {/* Secondary action cards (Kuaishou style) */}
      <div className="flex gap-2">
        {/* Shop/Portfolio card */}
        <motion.button
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          whileTap={{ scale: 0.98 }}
          onClick={onPostsClick}
          className="flex-1 flex items-center gap-3 p-3 bg-[hsl(var(--kuaishou-white))] rounded-xl border border-[hsl(var(--kuaishou-border))] hover:border-[hsl(var(--kuaishou-orange)/0.5)] transition-colors"
        >
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
            <ShoppingBag className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-[hsl(var(--kuaishou-text))]">Portfolio</p>
            <p className="text-xs text-[hsl(var(--kuaishou-text-muted))]">{postsCount} publications</p>
          </div>
        </motion.button>

        {/* Fan group card */}
        <motion.button
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.35 }}
          whileTap={{ scale: 0.98 }}
          onClick={onFriendsClick}
          className="flex-1 flex items-center gap-3 p-3 bg-[hsl(var(--kuaishou-white))] rounded-xl border border-[hsl(var(--kuaishou-border))] hover:border-[hsl(var(--kuaishou-orange)/0.5)] transition-colors"
        >
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-[hsl(var(--kuaishou-text))]">Fan group</p>
            <p className="text-xs text-[hsl(var(--kuaishou-text-muted))]">{friendsCount} amis • Rejoindre</p>
          </div>
        </motion.button>
      </div>
    </div>
  );
};

export default KuaishouStatsGrid;
