import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { TamTamMicButton } from './TamTamMicButton';
import { useState } from 'react';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';
import { useBilingualAudio } from '@/hooks/useBilingualAudio';
import { tamtamFeedback } from '@/utils/tamtamFeedback';

const navItems = [
  { icon: '🏠', path: '/tamtam/home', id: 'home', labelKey: 'home' },
  { icon: '💬', path: '/tamtam/social', id: 'social', labelKey: 'social' },
  { icon: '🛒', path: '/tamtam/market', id: 'market', labelKey: 'market' },
  { icon: '👤', path: '/tamtam/profile', id: 'profile', labelKey: 'profile' },
];

export function TamTamNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isRecording, setIsRecording] = useState(false);
  const { t } = useTamTamLanguage();
  const { speakCurrentLang } = useBilingualAudio();

  const isActive = (path: string) => location.pathname === path;

  const handleMicPress = () => {
    tamtamFeedback.play('click');
    setIsRecording(!isRecording);
    if (!isRecording) {
      speakCurrentLang(t('nowListening'));
    }
  };

  const handleNavPress = (path: string, labelKey: string) => {
    tamtamFeedback.play('click');
    speakCurrentLang(t(labelKey));
    navigate(path);
  };

  return (
    <>
      {/* Floating central mic */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50"
      >
        <TamTamMicButton
          size="lg"
          isRecording={isRecording}
          onPress={handleMicPress}
        />
      </motion.div>

      {/* Bottom navigation bar */}
      <motion.nav
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="fixed bottom-0 left-0 right-0 bg-tamtam-surface border-t border-gray-100 px-6 py-3 z-40"
      >
        <div className="max-w-md mx-auto flex items-center justify-between">
          {navItems.slice(0, 2).map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavPress(item.path, item.labelKey)}
              className={`flex flex-col items-center gap-1 w-16 py-1 rounded-2xl transition-all ${
                isActive(item.path)
                  ? 'bg-tamtam-primary/10'
                  : ''
              }`}
            >
              <span className={`text-2xl ${isActive(item.path) ? 'scale-110' : ''}`}>
                {item.icon}
              </span>
              <span className={`text-xs ${isActive(item.path) ? 'text-tamtam-primary font-medium' : 'text-tamtam-text-muted'}`}>
                {t(item.labelKey)}
              </span>
            </button>
          ))}

          {/* Spacer for central mic */}
          <div className="w-20" />

          {navItems.slice(2).map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavPress(item.path, item.labelKey)}
              className={`flex flex-col items-center gap-1 w-16 py-1 rounded-2xl transition-all ${
                isActive(item.path)
                  ? 'bg-tamtam-primary/10'
                  : ''
              }`}
            >
              <span className={`text-2xl ${isActive(item.path) ? 'scale-110' : ''}`}>
                {item.icon}
              </span>
              <span className={`text-xs ${isActive(item.path) ? 'text-tamtam-primary font-medium' : 'text-tamtam-text-muted'}`}>
                {t(item.labelKey)}
              </span>
            </button>
          ))}
        </div>
      </motion.nav>
    </>
  );
}
