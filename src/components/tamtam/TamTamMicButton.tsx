import { motion } from 'framer-motion';
import { Mic } from 'lucide-react';

interface TamTamMicButtonProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isRecording?: boolean;
  onPress?: () => void;
}

const sizeClasses = {
  sm: 'w-12 h-12',
  md: 'w-16 h-16',
  lg: 'w-20 h-20',
  xl: 'w-32 h-32',
};

const iconSizes = {
  sm: 'w-5 h-5',
  md: 'w-7 h-7',
  lg: 'w-9 h-9',
  xl: 'w-14 h-14',
};

export function TamTamMicButton({ 
  size = 'md', 
  isRecording = false, 
  onPress 
}: TamTamMicButtonProps) {
  return (
    <motion.button
      onClick={onPress}
      whileTap={{ scale: 0.95 }}
      className="relative"
    >
      {/* Animated rings when recording */}
      {isRecording && (
        <>
          <motion.div
            animate={{ scale: [1, 1.4], opacity: [0.4, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className={`absolute inset-0 bg-tamtam-primary rounded-full`}
          />
          <motion.div
            animate={{ scale: [1, 1.6], opacity: [0.3, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
            className={`absolute inset-0 bg-tamtam-primary rounded-full`}
          />
          <motion.div
            animate={{ scale: [1, 1.8], opacity: [0.2, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.6 }}
            className={`absolute inset-0 bg-tamtam-primary rounded-full`}
          />
        </>
      )}

      {/* Main button */}
      <div
        className={`${sizeClasses[size]} rounded-full flex items-center justify-center transition-all ${
          isRecording
            ? 'bg-red-500 shadow-lg shadow-red-500/40'
            : 'bg-tamtam-primary shadow-tamtam-soft'
        }`}
      >
        {isRecording ? (
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 0.5, repeat: Infinity }}
            className="flex items-center justify-center gap-1"
          >
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                animate={{ height: [8, 20, 8] }}
                transition={{ duration: 0.4, repeat: Infinity, delay: i * 0.1 }}
                className="w-1 bg-white rounded-full"
                style={{ height: 8 }}
              />
            ))}
          </motion.div>
        ) : (
          <Mic className={`${iconSizes[size]} text-white`} />
        )}
      </div>
    </motion.button>
  );
}
