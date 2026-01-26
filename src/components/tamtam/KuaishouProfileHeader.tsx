import React from 'react';
import { motion } from 'framer-motion';
import { Camera, Loader2, BadgeCheck, Copy, Award } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { KuaishouProfileBackground } from './KuaishouProfileBackground';
import { useToast } from '@/hooks/use-toast';

interface KuaishouProfileHeaderProps {
  displayName: string;
  username: string;
  avatarUrl: string | null;
  isOwnProfile?: boolean;
  isUploading?: boolean;
  onAvatarClick?: () => void;
  isVerified?: boolean;
  followersCount?: number;
  followingCount?: number;
  likesCount?: number;
}

// Format number with K notation
const formatCount = (count: number): string => {
  if (count >= 1000000) {
    return (count / 1000000).toFixed(1) + 'M';
  }
  if (count >= 1000) {
    return (count / 1000).toFixed(1) + 'k';
  }
  return count.toString();
};

export const KuaishouProfileHeader: React.FC<KuaishouProfileHeaderProps> = ({
  displayName,
  username,
  avatarUrl,
  isOwnProfile = false,
  isUploading = false,
  onAvatarClick,
  isVerified = false,
  followersCount = 0,
  followingCount = 0,
  likesCount = 0,
}) => {
  const { toast } = useToast();

  const handleCopyId = () => {
    navigator.clipboard.writeText(username);
    toast({ title: 'ID copié !', description: `FITILA ID: ${username}` });
  };

  return (
    <KuaishouProfileBackground>
      <div className="px-4 py-6 pb-8">
        {/* Top section: Avatar + Stats horizontal */}
        <div className="flex items-start gap-4">
          {/* Avatar with camera button */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
            className="relative shrink-0"
          >
            <button
              onClick={onAvatarClick}
              disabled={!isOwnProfile || isUploading}
              className="relative group focus:outline-none"
            >
              <Avatar className="w-20 h-20 sm:w-24 sm:h-24 border-3 border-white shadow-xl">
                <AvatarImage src={avatarUrl || undefined} className="object-cover" />
                <AvatarFallback className="bg-gradient-to-br from-[hsl(var(--kuaishou-orange))] to-[hsl(var(--kuaishou-primary-dark))] text-white text-2xl font-bold">
                  {displayName?.[0]?.toUpperCase() || username?.[0]?.toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>

              {/* Camera overlay on hover (own profile only) */}
              {isOwnProfile && (
                <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera className="w-6 h-6 text-white" />
                </div>
              )}

              {/* Camera button indicator */}
              {isOwnProfile && (
                <motion.div
                  whileTap={{ scale: 0.9 }}
                  className="absolute bottom-0 right-0 w-7 h-7 bg-[hsl(var(--kuaishou-orange))] rounded-full flex items-center justify-center shadow-lg border-2 border-white"
                >
                  {isUploading ? (
                    <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                  ) : (
                    <Camera className="w-3.5 h-3.5 text-white" />
                  )}
                </motion.div>
              )}
            </button>
          </motion.div>

          {/* Stats horizontal (Kuaishou style) */}
          <div className="flex-1 flex justify-around pt-2">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-center"
            >
              <p className="text-xl sm:text-2xl font-bold text-white">{formatCount(followersCount)}</p>
              <p className="text-xs text-white/70">Followers</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="text-center"
            >
              <p className="text-xl sm:text-2xl font-bold text-white">{formatCount(followingCount)}</p>
              <p className="text-xs text-white/70">Follow</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-center"
            >
              <p className="text-xl sm:text-2xl font-bold text-white">{formatCount(likesCount)}</p>
              <p className="text-xs text-white/70">Likes</p>
            </motion.div>
          </div>
        </div>

        {/* Display name + verified badge */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mt-4"
        >
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-xl font-bold text-white">
              {displayName || username}
            </h1>
            {isVerified && (
              <BadgeCheck className="w-5 h-5 text-[hsl(var(--kuaishou-verified))]" />
            )}
          </div>
        </motion.div>

        {/* FITILA ID */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          onClick={handleCopyId}
          className="flex items-center gap-1.5 mt-1 group"
        >
          <span className="text-xs text-white/60">FITILA ID: {username}</span>
          <Copy className="w-3 h-3 text-white/40 group-hover:text-white/60 transition-colors" />
        </motion.button>

        {/* Medal badge button */}
        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.35 }}
          whileTap={{ scale: 0.95 }}
          className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 backdrop-blur-sm rounded-full border border-white/20"
        >
          <Award className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-xs font-medium text-white">+ Medal</span>
        </motion.button>
      </div>
    </KuaishouProfileBackground>
  );
};

export default KuaishouProfileHeader;
