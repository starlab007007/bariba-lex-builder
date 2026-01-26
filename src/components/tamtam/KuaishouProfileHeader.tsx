import React from 'react';
import { motion } from 'framer-motion';
import { Camera, Loader2, Globe } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

interface KuaishouProfileHeaderProps {
  displayName: string;
  username: string;
  avatarUrl: string | null;
  isOwnProfile?: boolean;
  isUploading?: boolean;
  onAvatarClick?: () => void;
  language?: string;
}

export const KuaishouProfileHeader: React.FC<KuaishouProfileHeaderProps> = ({
  displayName,
  username,
  avatarUrl,
  isOwnProfile = false,
  isUploading = false,
  onAvatarClick,
  language = 'Français',
}) => {
  return (
    <div className="flex flex-col items-center pt-8 pb-6 px-4">
      {/* Avatar with camera button */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200 }}
        className="relative mb-4"
      >
        <button
          onClick={onAvatarClick}
          disabled={!isOwnProfile || isUploading}
          className="relative group focus:outline-none"
        >
          <Avatar className="w-28 h-28 sm:w-32 sm:h-32 border-4 border-[hsl(var(--kuaishou-primary)/0.3)] shadow-xl">
            <AvatarImage src={avatarUrl || undefined} className="object-cover" />
            <AvatarFallback className="bg-gradient-to-br from-[hsl(var(--kuaishou-primary))] to-[hsl(var(--kuaishou-primary-dark))] text-white text-4xl font-bold">
              {displayName?.[0]?.toUpperCase() || username?.[0]?.toUpperCase() || '?'}
            </AvatarFallback>
          </Avatar>

          {/* Camera overlay on hover (own profile only) */}
          {isOwnProfile && (
            <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Camera className="w-8 h-8 text-white" />
            </div>
          )}

          {/* Camera button indicator */}
          {isOwnProfile && (
            <motion.div
              whileTap={{ scale: 0.9 }}
              className="absolute bottom-1 right-1 w-9 h-9 bg-[hsl(var(--kuaishou-primary))] rounded-full flex items-center justify-center shadow-lg border-2 border-white"
            >
              {isUploading ? (
                <Loader2 className="w-4 h-4 text-white animate-spin" />
              ) : (
                <Camera className="w-4 h-4 text-white" />
              )}
            </motion.div>
          )}
        </button>
      </motion.div>

      {/* Display name */}
      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-xl sm:text-2xl font-bold text-foreground"
      >
        {displayName || username}
      </motion.h1>

      {/* Username */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="text-sm text-muted-foreground mb-2"
      >
        @{username}
      </motion.p>

      {/* Language badge */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="inline-flex items-center gap-1.5 px-3 py-1 bg-muted/60 rounded-full"
      >
        <Globe className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">{language}</span>
      </motion.div>
    </div>
  );
};

export default KuaishouProfileHeader;
