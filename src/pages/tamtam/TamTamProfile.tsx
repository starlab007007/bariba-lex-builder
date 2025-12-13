import { useState } from 'react';
import { motion } from 'framer-motion';
import { TamTamMicButton } from '@/components/tamtam/TamTamMicButton';

const badges = [
  { icon: '⭐', color: 'bg-yellow-100' },
  { icon: '🎯', color: 'bg-blue-100' },
  { icon: '🏆', color: 'bg-amber-100' },
  { icon: '💎', color: 'bg-purple-100' },
];

const settingsItems = [
  { icon: '🔔', id: 'notifications' },
  { icon: '🌐', id: 'language' },
  { icon: '❓', id: 'help' },
];

export default function TamTamProfile() {
  const [isRecording, setIsRecording] = useState(false);
  const [hasBio, setHasBio] = useState(false);

  const handleRecordBio = () => {
    if (!isRecording) {
      setIsRecording(true);
      // Simulate recording
      setTimeout(() => {
        setIsRecording(false);
        setHasBio(true);
      }, 3000);
    } else {
      setIsRecording(false);
      setHasBio(true);
    }
  };

  return (
    <div className="min-h-screen bg-tamtam-bg px-4 pt-8">
      {/* Profile photo */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="flex justify-center mb-6"
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

      {/* Voice bio section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-tamtam-surface rounded-3xl p-6 shadow-tamtam-soft mb-6"
      >
        <div className="flex items-center justify-between mb-4">
          <span className="text-3xl">🎙️</span>
          {hasBio && (
            <div className="flex items-center gap-2">
              <span className="text-xl">✓</span>
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
          <div className="flex justify-center">
            <TamTamMicButton
              size="md"
              isRecording={isRecording}
              onPress={handleRecordBio}
            />
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
        <div className="bg-tamtam-surface rounded-3xl p-4 shadow-tamtam-soft text-center">
          <span className="text-2xl">📢</span>
          <div className="text-2xl font-bold text-tamtam-text mt-1">42</div>
        </div>
        <div className="bg-tamtam-surface rounded-3xl p-4 shadow-tamtam-soft text-center">
          <span className="text-2xl">👥</span>
          <div className="text-2xl font-bold text-tamtam-text mt-1">128</div>
        </div>
        <div className="bg-tamtam-surface rounded-3xl p-4 shadow-tamtam-soft text-center">
          <span className="text-2xl">❤️</span>
          <div className="text-2xl font-bold text-tamtam-text mt-1">1.2K</div>
        </div>
      </motion.div>

      {/* Settings items */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="space-y-3"
      >
        {settingsItems.map((item, index) => (
          <button
            key={item.id}
            className="w-full bg-tamtam-surface rounded-2xl p-4 shadow-tamtam-soft flex items-center gap-4"
          >
            <span className="text-2xl">{item.icon}</span>
            <div className="flex-1" />
            <span className="text-xl text-tamtam-text-muted">→</span>
          </button>
        ))}
      </motion.div>
    </div>
  );
}
