import { motion } from 'framer-motion';

interface SoundWaveAnimationProps {
  isActive: boolean;
  color?: string;
  barCount?: number;
  className?: string;
}

export function SoundWaveAnimation({ 
  isActive, 
  color = 'currentColor',
  barCount = 5,
  className = ''
}: SoundWaveAnimationProps) {
  return (
    <div className={`flex items-center justify-center gap-1 h-8 ${className}`}>
      {Array.from({ length: barCount }).map((_, i) => (
        <motion.div
          key={i}
          className="w-1 rounded-full"
          style={{ backgroundColor: color }}
          animate={isActive ? {
            height: [8, 24, 12, 28, 8],
            opacity: [0.6, 1, 0.8, 1, 0.6]
          } : {
            height: 8,
            opacity: 0.4
          }}
          transition={isActive ? {
            duration: 0.8,
            repeat: Infinity,
            delay: i * 0.1,
            ease: "easeInOut"
          } : {
            duration: 0.3
          }}
        />
      ))}
    </div>
  );
}
