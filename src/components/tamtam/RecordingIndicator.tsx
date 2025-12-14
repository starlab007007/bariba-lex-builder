import React from 'react';
import { motion } from 'framer-motion';
import { Mic } from 'lucide-react';

interface RecordingIndicatorProps {
  userName?: string;
  className?: string;
}

export function RecordingIndicator({ userName = 'Utilisateur', className }: RecordingIndicatorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className={`flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-red-50 to-orange-50 rounded-full border border-red-200 ${className}`}
    >
      {/* Animated recording dot */}
      <motion.div
        className="relative w-6 h-6 rounded-full bg-red-500 flex items-center justify-center"
        animate={{
          scale: [1, 1.1, 1],
          boxShadow: [
            '0 0 0 0 rgba(239, 68, 68, 0.4)',
            '0 0 0 8px rgba(239, 68, 68, 0)',
            '0 0 0 0 rgba(239, 68, 68, 0)'
          ]
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        <Mic className="w-3 h-3 text-white" />
      </motion.div>
      
      {/* Animated sound waves */}
      <div className="flex items-center gap-0.5">
        {[...Array(4)].map((_, i) => (
          <motion.div
            key={i}
            className="w-1 bg-red-400 rounded-full"
            animate={{
              height: [4, 12, 4]
            }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              delay: i * 0.1,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>
      
      <span className="text-sm text-red-600 font-medium">
        {userName} enregistre...
      </span>
    </motion.div>
  );
}
