/**
 * OneTakePro - Placeholder component rétrocompatible
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Construction } from 'lucide-react';

interface OneTakeProProps {
  videoRef?: React.RefObject<HTMLVideoElement>;
  audioUrl?: string;
  mirror?: boolean;
  userText?: string;
  userName?: string;
  onComplete?: (blob: Blob) => void;
  onProgress?: (progress: number) => void;
  onError?: (error: Error) => void;
}

export const OneTakePro: React.FC<OneTakeProProps> = ({
  videoRef,
  audioUrl,
  mirror,
  userText,
  userName,
  onComplete,
  onProgress,
  onError
}) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-amber-500/10 to-orange-500/10 backdrop-blur-sm z-20"
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        className="mb-6"
      >
        <Sparkles className="w-16 h-16 text-amber-400" />
      </motion.div>
      
      <div className="text-center px-6">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Construction className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-xl font-bold text-foreground">One-Take Pro</h2>
        </div>
        <p className="text-muted-foreground text-sm">
          Template en cours de reconstruction...
        </p>
        {userText && (
          <p className="text-primary text-sm mt-2">"{userText}"</p>
        )}
      </div>
    </motion.div>
  );
};

export default OneTakePro;
