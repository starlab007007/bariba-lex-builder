import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { TamTamMicButton } from '@/components/tamtam/TamTamMicButton';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';
import { useBilingualAudio } from '@/hooks/useBilingualAudio';
import { tamtamFeedback } from '@/utils/tamtamFeedback';

export default function TamTamSplash() {
  const navigate = useNavigate();
  const [isListening, setIsListening] = useState(false);
  const { t, currentLang } = useTamTamLanguage();
  const { speakCurrentLang } = useBilingualAudio();

  // Auto-announce welcome in Bariba on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      speakCurrentLang(t('welcomeHome'));
    }, 1500);
    return () => clearTimeout(timer);
  }, [speakCurrentLang, t]);

  const handleMicPress = () => {
    tamtamFeedback.play('click');
    setIsListening(true);
    speakCurrentLang(t('nowListening'));
    
    setTimeout(() => {
      setIsListening(false);
      tamtamFeedback.play('success');
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
        className="mb-10"
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

      {/* Slogan - translated */}
      <motion.p
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.6 }}
        className="text-lg text-tamtam-text-muted mb-2"
      >
        {t('slogan')}
      </motion.p>

      {/* Slogan with icons */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.6 }}
        className="flex items-center gap-4 mb-12"
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
        className="mt-6 text-center"
      >
        <motion.span
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="text-2xl inline-block"
        >
          👆
        </motion.span>
        <p className="text-sm text-tamtam-text-muted mt-2">
          {t('tapMicToStart')}
        </p>
      </motion.div>

      {/* Language indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-8"
      >
        <span className="inline-flex items-center gap-2 px-4 py-2 bg-tamtam-surface rounded-full shadow-tamtam-soft">
          <span className="text-lg">🌐</span>
          <span className="text-sm font-medium text-tamtam-text">
            {currentLang === 'ba' ? 'Bàátɔ̀nú' : 'Français'}
          </span>
        </span>
      </motion.div>
    </div>
  );
}
