import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TamTamMicButton } from '@/components/tamtam/TamTamMicButton';
import { Volume2 } from 'lucide-react';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';
import { useAudioDescription } from '@/contexts/AudioDescriptionContext';
import { useBilingualAudio } from '@/hooks/useBilingualAudio';
import { tamtamFeedback } from '@/utils/tamtamFeedback';

const badges = [
  { icon: '⭐', color: 'bg-yellow-100' },
  { icon: '🎯', color: 'bg-blue-100' },
  { icon: '🏆', color: 'bg-amber-100' },
  { icon: '💎', color: 'bg-purple-100' },
];

const settingsItems = [
  { icon: '🔔', id: 'notifications', labelKey: 'notifications' },
  { icon: '🌐', id: 'language', labelKey: 'language' },
  { icon: '❓', id: 'help', labelKey: 'help' },
];

const stats = [
  { icon: '📢', value: '42', labelKey: 'posts' },
  { icon: '👥', value: '128', labelKey: 'followers' },
  { icon: '❤️', value: '1.2K', labelKey: 'likes' },
];

export default function TamTamProfile() {
  const [isRecording, setIsRecording] = useState(false);
  const [hasBio, setHasBio] = useState(false);
  const { t, currentLang } = useTamTamLanguage();
  const { announceAction } = useAudioDescription();
  const { speakCurrentLang } = useBilingualAudio();

  useEffect(() => {
    announceAction(t('screenProfile'));
  }, [announceAction, t]);

  const handleRecordBio = () => {
    tamtamFeedback.play('click');
    
    if (!isRecording) {
      setIsRecording(true);
      speakCurrentLang(t('recordBio'));
      
      setTimeout(() => {
        setIsRecording(false);
        setHasBio(true);
        tamtamFeedback.play('success');
      }, 3000);
    } else {
      setIsRecording(false);
      setHasBio(true);
    }
  };

  const handleSettingPress = (labelKey: string) => {
    tamtamFeedback.play('click');
    speakCurrentLang(t(labelKey));
  };

  const handleSpeakStat = (labelKey: string) => {
    tamtamFeedback.play('click');
    speakCurrentLang(t(labelKey));
  };

  return (
    <div className="min-h-screen bg-tamtam-bg px-4 pt-8 pb-32">
      {/* Profile photo */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="flex justify-center mb-4"
      >
        <button className="relative">
          <div className="w-32 h-32 bg-tamtam-surface rounded-full shadow-tamtam-soft flex items-center justify-center">
            <span className="text-6xl">👤</span>
          </div>
          <div className="absolute bottom-0 right-0 w-10 h-10 bg-tamtam-primary rounded-full flex items-center justify-center">
            <span className="text-xl">📷</span>
          </div>
        </button>
      </motion.div>

      {/* Title */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center mb-6"
      >
        <h1 className="text-xl font-bold text-tamtam-text">{t('profile')}</h1>
        <span className="inline-flex items-center gap-1 mt-1 px-3 py-1 bg-tamtam-secondary/10 rounded-full">
          <span className="text-sm">🌐</span>
          <span className="text-xs font-medium text-tamtam-secondary">
            {currentLang === 'ba' ? 'Bàátɔ̀nú' : 'Français'}
          </span>
        </span>
      </motion.div>

      {/* Voice bio section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-tamtam-surface rounded-3xl p-6 shadow-tamtam-soft mb-6"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-3xl">🎙️</span>
            <span className="text-sm font-medium text-tamtam-text">
              {t('audioBio')}
            </span>
          </div>
          {hasBio && (
            <div className="flex items-center gap-2">
              <span className="text-xl text-green-500">✓</span>
            </div>
          )}
        </div>

        {/* Audio wave or record button */}
        {hasBio ? (
          <div className="h-16 bg-tamtam-bg rounded-2xl flex items-center justify-center px-4 gap-1">
            {[...Array(30)].map((_, i) => (
              <div
                key={i}
                className="w-1 bg-tamtam-primary rounded-full"
                style={{ height: 8 + Math.random() * 24 }}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <TamTamMicButton
              size="md"
              isRecording={isRecording}
              onPress={handleRecordBio}
            />
            <span className="text-xs text-tamtam-text-muted">
              {t('recordBio')}
            </span>
          </div>
        )}
      </motion.div>

      {/* Badges */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-tamtam-surface rounded-3xl p-4 shadow-tamtam-soft mb-6"
      >
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">🏅</span>
          <span className="text-sm font-medium text-tamtam-text">{t('badges')}</span>
        </div>
        <div className="flex justify-center gap-4">
          {badges.map((badge, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 + index * 0.1 }}
              className={`w-14 h-14 ${badge.color} rounded-2xl flex items-center justify-center`}
            >
              <span className="text-2xl">{badge.icon}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="grid grid-cols-3 gap-4 mb-6"
      >
        {stats.map((stat, index) => (
          <button
            key={stat.labelKey}
            onClick={() => handleSpeakStat(stat.labelKey)}
            className="bg-tamtam-surface rounded-3xl p-4 shadow-tamtam-soft text-center active:scale-95 transition-transform"
          >
            <span className="text-2xl">{stat.icon}</span>
            <div className="text-2xl font-bold text-tamtam-text mt-1">{stat.value}</div>
            <div className="text-xs text-tamtam-text-muted">{t(stat.labelKey)}</div>
          </button>
        ))}
      </motion.div>

      {/* Settings items */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="space-y-3"
      >
        {settingsItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleSettingPress(item.labelKey)}
            className="w-full bg-tamtam-surface rounded-2xl p-4 shadow-tamtam-soft flex items-center gap-4 active:scale-[0.98] transition-transform"
          >
            <span className="text-2xl">{item.icon}</span>
            <span className="flex-1 text-left font-medium text-tamtam-text">
              {t(item.labelKey)}
            </span>
            <Volume2 className="w-5 h-5 text-tamtam-text-muted" />
            <span className="text-xl text-tamtam-text-muted">→</span>
          </button>
        ))}
      </motion.div>
    </div>
  );
}
