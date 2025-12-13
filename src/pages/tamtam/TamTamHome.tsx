import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { TamTamMicButton } from '@/components/tamtam/TamTamMicButton';
import { useState } from 'react';

const services = [
  { icon: '💬', label: 'Social', path: '/tamtam/social', color: 'bg-emerald-500' },
  { icon: '🤖', label: 'IA', path: '/tamtam/services', color: 'bg-blue-500' },
  { icon: '🛒', label: 'Marché', path: '/tamtam/market', color: 'bg-orange-500' },
  { icon: '🆘', label: 'SOS', path: '/tamtam/sos', color: 'bg-red-500' },
  { icon: '👤', label: 'Profil', path: '/tamtam/profile', color: 'bg-gray-500' },
  { icon: '❓', label: 'Aide', path: '/tamtam/home', color: 'bg-purple-500' },
];

export default function TamTamHome() {
  const navigate = useNavigate();
  const [isRecording, setIsRecording] = useState(false);

  const handleMicPress = () => {
    setIsRecording(!isRecording);
  };

  return (
    <div className="min-h-screen bg-tamtam-bg px-4 pt-8 pb-32">
      {/* Welcome visual */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="text-4xl mb-2">👋</div>
      </motion.div>

      {/* Giant central mic */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", delay: 0.2 }}
        className="flex justify-center mb-12"
      >
        <TamTamMicButton
          size="xl"
          isRecording={isRecording}
          onPress={handleMicPress}
        />
      </motion.div>

      {/* Services grid - 2x3 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="grid grid-cols-3 gap-4 max-w-md mx-auto"
      >
        {services.map((service, index) => (
          <motion.button
            key={service.label}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 + index * 0.1 }}
            onClick={() => navigate(service.path)}
            className="aspect-square bg-tamtam-surface rounded-3xl shadow-tamtam-soft flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            <div className={`w-14 h-14 ${service.color} rounded-2xl flex items-center justify-center`}>
              <span className="text-2xl">{service.icon}</span>
            </div>
          </motion.button>
        ))}
      </motion.div>
    </div>
  );
}
