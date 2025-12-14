import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye } from 'lucide-react';
import { tamtamFeedback } from '@/utils/tamtamFeedback';

interface AnimatedViewCounterProps {
  count: number;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const AnimatedViewCounter: React.FC<AnimatedViewCounterProps> = ({
  count,
  showIcon = true,
  size = 'md'
}) => {
  const [displayCount, setDisplayCount] = useState(count);
  const [isAnimating, setIsAnimating] = useState(false);
  
  const sizeClasses = {
    sm: 'text-sm gap-1',
    md: 'text-base gap-1.5',
    lg: 'text-lg gap-2'
  };
  
  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };
  
  useEffect(() => {
    if (count !== displayCount) {
      setIsAnimating(true);
      // Play subtle sound on increment
      if (count > displayCount) {
        tamtamFeedback.play('notification');
      }
      
      // Animate digits flipping
      const timeout = setTimeout(() => {
        setDisplayCount(count);
        setIsAnimating(false);
      }, 300);
      
      return () => clearTimeout(timeout);
    }
  }, [count, displayCount]);
  
  // Split number into digits for flip animation
  const digits = displayCount.toString().split('');
  
  return (
    <div className={`flex items-center ${sizeClasses[size]} text-white/90`}>
      {showIcon && <Eye className={`${iconSizes[size]} opacity-80`} />}
      
      <div className="flex overflow-hidden">
        <AnimatePresence mode="popLayout">
          {digits.map((digit, idx) => (
            <motion.span
              key={`${idx}-${digit}`}
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              transition={{
                type: 'spring',
                stiffness: 300,
                damping: 25,
                delay: idx * 0.05
              }}
              className={`inline-block font-bold ${isAnimating ? 'text-emerald-300' : ''}`}
              style={{ minWidth: '0.6em', textAlign: 'center' }}
            >
              {digit}
            </motion.span>
          ))}
        </AnimatePresence>
      </div>
      
      {/* Glow effect on update */}
      {isAnimating && (
        <motion.div
          initial={{ scale: 1, opacity: 0.5 }}
          animate={{ scale: 2, opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="absolute w-8 h-8 bg-emerald-400 rounded-full -z-10"
        />
      )}
    </div>
  );
};
