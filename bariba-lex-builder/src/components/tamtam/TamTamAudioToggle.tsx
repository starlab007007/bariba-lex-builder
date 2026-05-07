import React from 'react';
import { motion } from 'framer-motion';
import { Volume2, VolumeX } from 'lucide-react';
import { useAudioDescription } from '@/contexts/AudioDescriptionContext';

export const TamTamAudioToggle: React.FC = () => {
  const { isEnabled, setEnabled, isSpeaking } = useAudioDescription();

  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={() => setEnabled(!isEnabled)}
      className={`relative flex items-center gap-2 px-3 py-2 rounded-xl transition-all ${
        isEnabled 
          ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white' 
          : 'bg-gray-100 text-gray-500'
      }`}
    >
      {isEnabled ? (
        <>
          <Volume2 className="w-4 h-4" />
          {isSpeaking && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 1 }}
              className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full"
            />
          )}
        </>
      ) : (
        <VolumeX className="w-4 h-4" />
      )}
    </motion.button>
  );
};
