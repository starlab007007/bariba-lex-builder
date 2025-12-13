import { useState } from 'react';
import { motion } from 'framer-motion';

const emergencyContacts = [
  { id: 1, avatar: '👨🏾', type: '👨‍👩‍👧' },
  { id: 2, avatar: '👩🏾', type: '🏥' },
  { id: 3, avatar: '👴🏾', type: '👮' },
];

export default function TamTamSOS() {
  const [isActivated, setIsActivated] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  const handleSOSPress = () => {
    if (isActivated) {
      setIsActivated(false);
      setCountdown(null);
      return;
    }

    setIsActivated(true);
    setCountdown(3);

    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          // SOS activated - would trigger actual emergency call
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-tamtam-bg px-4 flex flex-col items-center pt-8">
      {/* Title icon */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="text-5xl mb-8"
      >
        🆘
      </motion.div>

      {/* Giant SOS button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", delay: 0.2 }}
        onClick={handleSOSPress}
        className="relative mb-12"
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
          className={`w-52 h-52 rounded-full flex items-center justify-center transition-all ${
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
              className="text-6xl"
            >
              📞
            </motion.div>
          ) : (
            <span className="text-6xl">🆘</span>
          )}
        </div>
      </motion.button>

      {/* Cancel hint when activated */}
      {isActivated && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex items-center gap-2"
        >
          <span className="text-2xl">👆</span>
          <span className="text-2xl">❌</span>
        </motion.div>
      )}

      {/* Location indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="bg-tamtam-surface rounded-3xl p-4 shadow-tamtam-soft flex items-center gap-3 mb-8"
      >
        <span className="text-3xl">📍</span>
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
        <div className="flex justify-center gap-4">
          {emergencyContacts.map((contact, index) => (
            <motion.button
              key={contact.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.7 + index * 0.1 }}
              className="bg-tamtam-surface rounded-3xl p-4 shadow-tamtam-soft flex flex-col items-center gap-2"
            >
              <span className="text-4xl">{contact.avatar}</span>
              <span className="text-xl">{contact.type}</span>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Add contact button */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="mt-6 w-16 h-16 bg-tamtam-surface rounded-full shadow-tamtam-soft flex items-center justify-center"
      >
        <span className="text-3xl">➕</span>
      </motion.button>
    </div>
  );
}
