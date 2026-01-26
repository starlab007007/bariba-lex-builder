import React from 'react';
import { motion } from 'framer-motion';
import { Video, Users, Headphones, Handshake } from 'lucide-react';

interface StatItem {
  icon: React.ReactNode;
  value: number;
  label: string;
  color: string;
  onClick?: () => void;
}

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
  const stats: StatItem[] = [
    {
      icon: <Video className="w-5 h-5" />,
      value: postsCount,
      label: 'Publications',
      color: 'text-[hsl(var(--kuaishou-primary))]',
      onClick: onPostsClick,
    },
    {
      icon: <Users className="w-5 h-5" />,
      value: followersCount,
      label: 'Abonnés',
      color: 'text-[hsl(var(--kuaishou-primary))]',
      onClick: onFollowersClick,
    },
    {
      icon: <Headphones className="w-5 h-5" />,
      value: followingCount,
      label: 'Abonnements',
      color: 'text-[hsl(var(--kuaishou-primary))]',
      onClick: onFollowingClick,
    },
    {
      icon: <Handshake className="w-5 h-5" />,
      value: friendsCount,
      label: 'friends',
      color: 'text-amber-500',
      onClick: onFriendsClick,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="grid grid-cols-4 gap-2 px-4"
    >
      {stats.map((stat, index) => (
        <motion.button
          key={stat.label}
          whileTap={{ scale: 0.95 }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 + index * 0.05 }}
          onClick={stat.onClick}
          className="bg-white rounded-xl border border-[hsl(var(--kuaishou-border))] p-3 sm:p-4 text-center hover:border-[hsl(var(--kuaishou-primary)/0.5)] transition-colors focus:outline-none focus:ring-2 focus:ring-[hsl(var(--kuaishou-primary)/0.3)]"
        >
          <div className={`flex justify-center mb-1 ${stat.color}`}>
            {stat.icon}
          </div>
          <div className="text-lg sm:text-xl font-bold text-foreground">
            {stat.value}
          </div>
          <div className="text-[10px] sm:text-xs text-muted-foreground truncate">
            {stat.label}
          </div>
        </motion.button>
      ))}
    </motion.div>
  );
};

export default KuaishouStatsGrid;
