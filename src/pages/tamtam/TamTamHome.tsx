import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { TamTamMicButton } from '@/components/tamtam/TamTamMicButton';
import { useState, useEffect } from 'react';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';
import { useAudioDescription } from '@/contexts/AudioDescriptionContext';
import { useBilingualAudio } from '@/hooks/useBilingualAudio';
import { tamtamFeedback } from '@/utils/tamtamFeedback';
import { Volume2 } from 'lucide-react';

const services = [
  { icon: '💬', labelKey: 'social', path: '/tamtam/social', color: 'bg-emerald-500' },
  { icon: '🤖', labelKey: 'ia', path: '/tamtam/services', color: 'bg-blue-500' },
  { icon: '🛒', labelKey: 'market', path: '/tamtam/market', color: 'bg-orange-500' },
  { icon: '🆘', labelKey: 'sos', path: '/tamtam/sos', color: 'bg-red-500' },
  { icon: '👤', labelKey: 'profile', path: '/tamtam/profile', color: 'bg-gray-500' },
  { icon: '❓', labelKey: 'help', path: '/tamtam/home', color: 'bg-purple-500' },
];

export default function TamTamHome() {
  const navigate = useNavigate();
  const [isRecording, setIsRecording] = useState(false);
  const { t, currentLang } = useTamTamLanguage();
  const { announceAction } = useAudioDescription();
  const { speakCurrentLang, isSpeaking } = useBilingualAudio();

  // Announce screen on mount
  useEffect(() => {
    announceAction(t('screenHome'));
  }, [announceAction, t]);

  const handleMicPress = () => {
    tamtamFeedback.play('click');
    setIsRecording(!isRecording);
  };

  const handleServiceClick = (path: string, labelKey: string) => {
    tamtamFeedback.play('click');
    speakCurrentLang(t(labelKey));
    navigate(path);
  };

  const handleSpeakLabel = async (labelKey: string, e: React.MouseEvent) => {
    e.stopPropagation();
    tamtamFeedback.play('click');
    await speakCurrentLang(t(labelKey));
  };

  return (
    <div className="min-h-screen bg-tamtam-bg px-4 pt-8 pb-32">
      {/* Welcome visual with translated greeting */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-6"
      >
        <div className="text-4xl mb-2">👋</div>
        <h1 className="text-xl font-bold text-tamtam-text">
          {t('welcomeHome')}
        </h1>
        <p className="text-sm text-tamtam-text-muted mt-1">
          {t('tapToSpeak')}
        </p>
      </motion.div>

      {/* Giant central mic */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", delay: 0.2 }}
        className="flex justify-center mb-10"
      >
        <TamTamMicButton
          size="xl"
          isRecording={isRecording}
          onPress={handleMicPress}
        />
      </motion.div>

      {/* Services grid - 2x3 with translated labels */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="grid grid-cols-3 gap-4 max-w-md mx-auto"
      >
        {services.map((service, index) => (
          <motion.button
            key={service.labelKey}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 + index * 0.1 }}
            onClick={() => handleServiceClick(service.path, service.labelKey)}
            className="aspect-square bg-tamtam-surface rounded-3xl shadow-tamtam-soft flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform relative"
          >
            {/* Icon badge */}
            <div className={`w-14 h-14 ${service.color} rounded-2xl flex items-center justify-center`}>
              <span className="text-2xl">{service.icon}</span>
            </div>
            
            {/* Label in current language */}
            <span className="text-xs font-medium text-tamtam-text truncate px-2">
              {t(service.labelKey)}
            </span>

            {/* Audio button */}
            <button
              onClick={(e) => handleSpeakLabel(service.labelKey, e)}
              className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/80 flex items-center justify-center"
            >
              <Volume2 className="w-3 h-3 text-tamtam-primary" />
            </button>
          </motion.button>
        ))}
      </motion.div>

      {/* Language indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="text-center mt-8"
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
