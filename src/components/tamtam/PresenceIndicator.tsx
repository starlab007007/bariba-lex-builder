import React from 'react';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface PresenceIndicatorProps {
  isOnline: boolean;
  lastSeenAt?: string | null;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

export function PresenceIndicator({ 
  isOnline, 
  lastSeenAt, 
  size = 'md',
  showText = false,
  className 
}: PresenceIndicatorProps) {
  const sizeClasses = {
    sm: 'w-2.5 h-2.5',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  };

  const getLastSeenText = () => {
    if (isOnline) return 'En ligne';
    if (!lastSeenAt) return 'Hors ligne';
    
    return `Vu ${formatDistanceToNow(new Date(lastSeenAt), {
      addSuffix: false,
      locale: fr
    })}`;
  };

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <motion.div
        className={cn(
          "rounded-full border-2 border-white shadow-sm",
          sizeClasses[size],
          isOnline 
            ? "bg-green-500" 
            : "bg-gray-300"
        )}
        animate={isOnline ? {
          scale: [1, 1.2, 1],
          boxShadow: ['0 0 0 0 rgba(34, 197, 94, 0.4)', '0 0 0 4px rgba(34, 197, 94, 0)', '0 0 0 0 rgba(34, 197, 94, 0)']
        } : {}}
        transition={isOnline ? { 
          repeat: Infinity, 
          duration: 2,
          ease: "easeInOut"
        } : {}}
      />
      {showText && (
        <span className={cn(
          "text-xs",
          isOnline ? "text-green-600 font-medium" : "text-gray-500"
        )}>
          {getLastSeenText()}
        </span>
      )}
    </div>
  );
}
