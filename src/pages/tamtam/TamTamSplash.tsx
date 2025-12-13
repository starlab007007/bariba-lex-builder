import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { TamTamMicButton } from '@/components/tamtam/TamTamMicButton';

export default function TamTamSplash() {
  const navigate = useNavigate();
  const [isListening, setIsListening] = useState(false);

  const handleMicPress = () => {
    setIsListening(true);
    // Simulate voice recognition then navigate
    setTimeout(() => {
      setIsListening(false);
      navigate('/tamtam/home');
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-tamtam-bg flex flex-col items-center justify-center px-6">
      {/* Logo with animated waves */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8, type: "spring" }}
        className="mb-12"
      >
        <div className="relative">
          {/* Animated sound waves behind logo */}
          <motion.div
            animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.1, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-0 bg-tamtam-primary/20 rounded-full blur-3xl"
            style={{ width: 200, height: 200, left: -50, top: -50 }}
          />
          
          <div className="w-32 h-32 bg-gradient-to-br from-tamtam-primary to-tamtam-secondary rounded-[32px] flex items-center justify-center shadow-tamtam-soft">
            <span className="text-5xl">🥁</span>
          </div>
        </div>
      </motion.div>

      {/* App name */}
      <motion.h1
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.6 }}
        className="text-4xl font-bold text-tamtam-text mb-3"
      >
        TAM-TAM
      </motion.h1>

      {/* Slogan with icons instead of text */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.6 }}
        className="flex items-center gap-4 mb-16"
      >
        <span className="text-3xl">🎙️</span>
        <span className="text-3xl">→</span>
        <span className="text-3xl">⚡</span>
        <span className="text-3xl">→</span>
        <span className="text-3xl">🤝</span>
      </motion.div>

      {/* Giant mic button */}
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.7, duration: 0.6 }}
      >
        <TamTamMicButton
          size="xl"
          isRecording={isListening}
          onPress={handleMicPress}
        />
      </motion.div>

      {/* Visual hint - tap the mic */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.6 }}
        className="mt-8 flex items-center gap-2"
      >
        <motion.span
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="text-2xl"
        >
          👆
        </motion.span>
      </motion.div>
    </div>
  );
}
