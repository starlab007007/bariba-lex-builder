import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye } from 'lucide-react';

interface AnimatedViewCounterProps {
  count: number;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

const AnimatedViewCounter: React.FC<AnimatedViewCounterProps> = ({
  count,
  size = 'md',
  showIcon = true,
  className = ''
}) => {
  const [displayCount, setDisplayCount] = useState(count);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (count !== displayCount) {
      setIsAnimating(true);
      const timer = setTimeout(() => {
        setDisplayCount(count);
        setIsAnimating(false);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [count, displayCount]);

  const sizeClasses = {
    sm: 'text-xs gap-1',
    md: 'text-sm gap-1.5',
    lg: 'text-base gap-2'
  };

  const iconSizes = {
    sm: 12,
    md: 14,
    lg: 18
  };

  const digits = displayCount.toString().split('');

  return (
    <div className={`flex items-center ${sizeClasses[size]} ${className}`}>
      {showIcon && (
        <motion.div
          animate={isAnimating ? { scale: [1, 1.3, 1] } : {}}
          transition={{ duration: 0.3 }}
        >
          <Eye 
            size={iconSizes[size]} 
            className={`${isAnimating ? 'text-primary' : 'text-muted-foreground'} transition-colors`}
          />
        </motion.div>
      )}
      
      <div className="flex overflow-hidden">
        <AnimatePresence mode="popLayout">
          {digits.map((digit, index) => (
            <motion.span
              key={`${index}-${digit}`}
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              transition={{ 
                type: 'spring', 
                stiffness: 300, 
                damping: 25,
                delay: index * 0.05
              }}
              className="inline-block font-medium text-foreground"
            >
              {digit}
            </motion.span>
          ))}
        </AnimatePresence>
      </div>

      {isAnimating && (
        <motion.span
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          className="text-primary text-xs"
        >
          +1
        </motion.span>
      )}
    </div>
  );
};

export default AnimatedViewCounter;
