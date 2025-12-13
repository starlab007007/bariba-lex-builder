import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { TamTamMicButton } from './TamTamMicButton';
import { useState } from 'react';

const navItems = [
  { icon: '🏠', path: '/tamtam/home', id: 'home' },
  { icon: '💬', path: '/tamtam/social', id: 'social' },
  { icon: '🛒', path: '/tamtam/market', id: 'market' },
  { icon: '👤', path: '/tamtam/profile', id: 'profile' },
];

export function TamTamNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isRecording, setIsRecording] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const handleMicPress = () => {
    setIsRecording(!isRecording);
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
              onClick={() => navigate(item.path)}
              className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl transition-all ${
                isActive(item.path)
                  ? 'bg-tamtam-primary/10'
                  : ''
              }`}
            >
              <span className={isActive(item.path) ? 'scale-110' : ''}>
                {item.icon}
              </span>
            </button>
          ))}

          {/* Spacer for central mic */}
          <div className="w-20" />

          {navItems.slice(2).map((item) => (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl transition-all ${
                isActive(item.path)
                  ? 'bg-tamtam-primary/10'
                  : ''
              }`}
            >
              <span className={isActive(item.path) ? 'scale-110' : ''}>
                {item.icon}
              </span>
            </button>
          ))}
        </div>
      </motion.nav>
    </>
  );
}
