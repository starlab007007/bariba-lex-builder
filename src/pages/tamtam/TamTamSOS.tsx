import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';
import { useAudioDescription } from '@/contexts/AudioDescriptionContext';
import { useBilingualAudio } from '@/hooks/useBilingualAudio';
import { tamtamFeedback } from '@/utils/tamtamFeedback';

const emergencyContacts = [
  { id: 1, avatar: '👨🏾', type: '👨‍👩‍👧', labelKey: 'family' },
  { id: 2, avatar: '👩🏾', type: '🏥', labelKey: 'hospital' },
  { id: 3, avatar: '👴🏾', type: '👮', labelKey: 'police' },
];

export default function TamTamSOS() {
  const [isActivated, setIsActivated] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const { t } = useTamTamLanguage();
  const { announce } = useAudioDescription();
  const { speakCurrentLang } = useBilingualAudio();

  useEffect(() => {
    announce(t('screenSOS'));
  }, [announce, t]);

  const handleSOSPress = () => {
    tamtamFeedback.play('click');
    
    if (isActivated) {
      setIsActivated(false);
      setCountdown(null);
      speakCurrentLang(t('cancelAlert'));
      return;
    }

    setIsActivated(true);
    setCountdown(3);
    tamtamFeedback.play('sos');
    speakCurrentLang(t('emergency'));

    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          speakCurrentLang(t('callEmergency'));
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleContactPress = (labelKey: string) => {
    tamtamFeedback.play('click');
    speakCurrentLang(t(labelKey));
  };

  const handleAddContact = () => {
    tamtamFeedback.play('click');
    speakCurrentLang(t('addContact'));
  };

  return (
    <div className="min-h-screen bg-tamtam-bg px-4 flex flex-col items-center pt-8">
      {/* Title */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="text-center mb-6"
      >
        <span className="text-5xl">🆘</span>
        <h1 className="text-xl font-bold text-tamtam-text mt-2">
          {t('emergency')}
        </h1>
      </motion.div>

      {/* Giant SOS button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", delay: 0.2 }}
        onClick={handleSOSPress}
        className="relative mb-8"
      >
        {/* Pulsing rings when activated */}
        {isActivated && (
          <>
            <motion.div
              animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="absolute inset-0 bg-red-500 rounded-full"
            />
            <motion.div
              animate={{ scale: [1, 1.8], opacity: [0.3, 0] }}
              transition={{ duration: 1, repeat: Infinity, delay: 0.3 }}
              className="absolute inset-0 bg-red-500 rounded-full"
            />
          </>
        )}

        <div
          className={`w-52 h-52 rounded-full flex flex-col items-center justify-center transition-all ${
            isActivated
              ? 'bg-red-600 shadow-lg shadow-red-500/50'
              : 'bg-red-500 shadow-tamtam-soft'
          }`}
        >
          {countdown !== null ? (
            <span className="text-7xl font-bold text-white">{countdown}</span>
          ) : isActivated ? (
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 0.5, repeat: Infinity }}
              className="text-center"
            >
              <span className="text-6xl">📞</span>
              <p className="text-white text-sm mt-2 font-medium">
                {t('callEmergency')}
              </p>
            </motion.div>
          ) : (
            <div className="text-center">
              <span className="text-6xl">🆘</span>
              <p className="text-white text-sm mt-2 font-medium">
                {t('tapToSpeak')}
              </p>
            </div>
          )}
        </div>
      </motion.button>

      {/* Cancel hint when activated */}
      {isActivated && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex items-center gap-2 bg-tamtam-surface rounded-full px-4 py-2"
        >
          <span className="text-xl">👆</span>
          <span className="text-sm text-tamtam-text">{t('cancelAlert')}</span>
          <span className="text-xl">❌</span>
        </motion.div>
      )}

      {/* Location indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="bg-tamtam-surface rounded-3xl p-4 shadow-tamtam-soft flex items-center gap-3 mb-6"
      >
        <span className="text-3xl">📍</span>
        <span className="text-sm text-tamtam-text">{t('location')}</span>
        <div className="flex gap-1">
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }}
              className="w-3 h-3 bg-green-500 rounded-full"
            />
          ))}
        </div>
        <span className="text-xl">✓</span>
      </motion.div>

      {/* Emergency contacts */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="w-full max-w-sm"
      >
        <h2 className="text-sm font-medium text-tamtam-text-muted mb-3 text-center">
          {t('emergencyContacts')}
        </h2>
        <div className="flex justify-center gap-4">
          {emergencyContacts.map((contact, index) => (
            <motion.button
              key={contact.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.7 + index * 0.1 }}
              onClick={() => handleContactPress(contact.labelKey)}
              className="bg-tamtam-surface rounded-3xl p-4 shadow-tamtam-soft flex flex-col items-center gap-2"
            >
              <span className="text-4xl">{contact.avatar}</span>
              <span className="text-xl">{contact.type}</span>
              <span className="text-xs text-tamtam-text-muted">
                {t(contact.labelKey)}
              </span>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Add contact button */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        onClick={handleAddContact}
        className="mt-6 flex items-center gap-2 bg-tamtam-surface rounded-full px-4 py-3 shadow-tamtam-soft"
      >
        <span className="text-2xl">➕</span>
        <span className="text-sm font-medium text-tamtam-text">
          {t('addContact')}
        </span>
      </motion.button>
    </div>
  );
}
