import React from 'react';
import { motion } from 'framer-motion';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { BadgeCheck, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KuaishouAvatarProps {
  src?: string | null;
  fallback?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isVerified?: boolean;
  showFollowButton?: boolean;
  isFollowing?: boolean;
  onFollowClick?: () => void;
  onClick?: () => void;
  className?: string;
}

export const KuaishouAvatar: React.FC<KuaishouAvatarProps> = ({
  src,
  fallback = '?',
  size = 'md',
  isVerified = false,
  showFollowButton = false,
  isFollowing = false,
  onFollowClick,
  onClick,
  className,
}) => {
  const sizeStyles = {
    sm: 'w-10 h-10',
    md: 'w-16 h-16',
    lg: 'w-22 h-22',
    xl: 'w-28 h-28',
  };

  const sizeClasses = {
    sm: { avatar: 'w-10 h-10', text: 'text-sm', badge: 'w-4 h-4', follow: 'w-5 h-5' },
    md: { avatar: 'w-16 h-16', text: 'text-xl', badge: 'w-5 h-5', follow: 'w-6 h-6' },
    lg: { avatar: 'w-[88px] h-[88px]', text: 'text-2xl', badge: 'w-6 h-6', follow: 'w-6 h-6' },
    xl: { avatar: 'w-28 h-28', text: 'text-4xl', badge: 'w-7 h-7', follow: 'w-7 h-7' },
  };

  const config = sizeClasses[size];

  return (
    <div className={cn('relative inline-block', className)}>
      {/* Avatar */}
      <motion.div
        whileTap={onClick ? { scale: 0.95 } : undefined}
        onClick={onClick}
        className={cn('cursor-pointer', onClick && 'cursor-pointer')}
      >
        <Avatar className={cn(config.avatar, 'border-3 border-white shadow-lg')}>
          <AvatarImage src={src || undefined} className="object-cover" />
          <AvatarFallback className={cn('bg-gradient-to-br from-[hsl(var(--kuaishou-orange))] to-[hsl(var(--kuaishou-primary-dark))] text-white font-bold', config.text)}>
            {fallback[0]?.toUpperCase() || '?'}
          </AvatarFallback>
        </Avatar>
      </motion.div>

      {/* Verified badge */}
      {isVerified && (
        <div className="absolute -bottom-0.5 -right-0.5 bg-white rounded-full p-0.5">
          <BadgeCheck className={cn(config.badge, 'text-[hsl(var(--kuaishou-verified))]')} />
        </div>
      )}

      {/* Follow button (overlapping at bottom) */}
      {showFollowButton && (
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={(e) => {
            e.stopPropagation();
            onFollowClick?.();
          }}
          className={cn(
            'absolute -bottom-2.5 left-1/2 -translate-x-1/2 rounded-full flex items-center justify-center shadow-lg',
            config.follow,
            isFollowing
              ? 'bg-[hsl(var(--kuaishou-gray-light))]'
              : 'bg-[hsl(var(--kuaishou-accent-red))]'
          )}
        >
          <Plus
            className={cn(
              'w-3 h-3',
              isFollowing ? 'text-[hsl(var(--kuaishou-text-muted))]' : 'text-white'
            )}
            strokeWidth={3}
          />
        </motion.button>
      )}
    </div>
  );
};

export default KuaishouAvatar;
