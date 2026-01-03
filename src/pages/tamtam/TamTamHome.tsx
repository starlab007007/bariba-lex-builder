import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';
import { useAudioDescription } from '@/contexts/AudioDescriptionContext';
import { useUnifiedAudio } from '@/hooks/useUnifiedAudio';
import { useVoiceMenu } from '@/hooks/useVoiceMenu';
import { triggerFeedback } from '@/utils/tamtamFeedback';
import { Volume2, Loader2, MessageCircle, Mic } from 'lucide-react';
import { RaconteMoiAssistant } from '@/components/tamtam/RaconteMoiAssistant';

const services = [
  { icon: '💬', labelKey: 'social', path: '/tamtam/social', color: 'bg-emerald-500' },
  { icon: '🤖', labelKey: 'ia', path: '/tamtam/services', color: 'bg-blue-500' },
  { icon: '🛒', labelKey: 'market', path: '/tamtam/market', color: 'bg-orange-500' },
  { icon: '🆘', labelKey: 'sos', path: '/tamtam/sos', color: 'bg-red-500' },
  { icon: '👤', labelKey: 'profile', path: '/tamtam/profile', color: 'bg-gray-500' },
  { icon: '📖', labelKey: 'dictionary', path: '/tamtam/dictionary', color: 'bg-purple-500' },
];

export default function TamTamHome() {
  const navigate = useNavigate();
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [speakingItemId, setSpeakingItemId] = useState<string | null>(null);
  const { t, currentLang } = useTamTamLanguage();
  const { announceAction } = useAudioDescription();
  const { speakCurrentLang, stop, health } = useUnifiedAudio();
  const { speakLabel, handleLongPress } = useVoiceMenu();

  useEffect(() => {
    announceAction(t('screenHome'));
  }, [announceAction, t]);

  const handleOpenAssistant = () => {
    triggerFeedback('click');
    setIsAssistantOpen(true);
  };

  const handleServiceClick = (path: string, labelKey: string) => {
    triggerFeedback('click');
    // Navigate immediately, TTS in background (non-blocking for Safari)
    navigate(path);
    // Fire and forget - don't await
    speakCurrentLang(t(labelKey)).catch(e => {
      console.warn('[TamTamHome] TTS failed silently:', e);
    });
  };

  const handleSpeakLabel = async (labelKey: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    // If already speaking this item, stop it
    if (speakingItemId === labelKey) {
      stop();
      setSpeakingItemId(null);
      return;
    }
    
    // Stop any previous speech and start new one
    stop();
    setSpeakingItemId(labelKey);
    triggerFeedback('click');
    
    try {
      await speakLabel(labelKey);
    } finally {
      setSpeakingItemId(null);
    }
  };

  return (
    <div className="min-h-screen bg-tamtam-bg px-4 pt-8 pb-32">
      {/* Health status indicator */}
      {health && (
        <div className="absolute top-4 right-4 flex gap-1">
          <div className={`w-2 h-2 rounded-full ${health.baribaTTS.status === 'healthy' ? 'bg-green-500' : health.baribaTTS.status === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'}`} title="TTS Bariba" />
          <div className={`w-2 h-2 rounded-full ${health.frenchTTS.status === 'healthy' ? 'bg-green-500' : 'bg-red-500'}`} title="TTS Français" />
          <div className={`w-2 h-2 rounded-full ${health.translation.status === 'healthy' ? 'bg-green-500' : health.translation.status === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'}`} title="Traduction" />
        </div>
      )}

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

      {/* Giant central Raconte-Moi button */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", delay: 0.2 }}
        className="flex flex-col items-center mb-6"
      >
        <motion.button
          onClick={handleOpenAssistant}
          className="relative w-40 h-40 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 shadow-xl shadow-purple-500/30 flex items-center justify-center"
          whileTap={{ scale: 0.95 }}
          whileHover={{ scale: 1.02 }}
        >
          {/* Pulse ring animation */}
          <motion.div
            className="absolute inset-0 rounded-full bg-purple-400/30"
            animate={{
              scale: [1, 1.3, 1.3],
              opacity: [0.5, 0, 0]
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              ease: "easeOut"
            }}
          />
          <motion.div
            className="absolute inset-0 rounded-full bg-purple-400/20"
            animate={{
              scale: [1, 1.5, 1.5],
              opacity: [0.3, 0, 0]
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              ease: "easeOut",
              delay: 0.6
            }}
          />
          
          {/* Icon */}
          <div className="relative z-10 flex flex-col items-center">
            <MessageCircle className="w-16 h-16 text-white" />
            <motion.span 
              className="absolute -top-2 -right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-md"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              <Mic className="w-4 h-4 text-white" />
            </motion.span>
          </div>
        </motion.button>
        
        <p className="mt-4 text-sm font-medium text-purple-600">
          🎭 Raconte-Moi
        </p>
        <p className="text-xs text-tamtam-text-muted">
          {currentLang === 'ba' ? 'Olùrànlọ́wọ́ ohùn' : 'Assistant vocal IA'}
        </p>
      </motion.div>

      {/* Raconte-Moi Modal */}
      <RaconteMoiAssistant 
        isOpen={isAssistantOpen} 
        onOpenChange={setIsAssistantOpen} 
      />

      {/* Services grid - 2x3 with translated labels */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="grid grid-cols-3 gap-4 max-w-md mx-auto"
      >
        {services.map((service, index) => {
          const longPressHandlers = handleLongPress(service.labelKey as any);
          
          return (
            <motion.button
              key={service.labelKey}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 + index * 0.1 }}
              onClick={() => handleServiceClick(service.path, service.labelKey)}
              {...longPressHandlers}
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

              {/* Audio button - only shows spinner for THIS item */}
              <button
                onClick={(e) => handleSpeakLabel(service.labelKey, e)}
                className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/80 flex items-center justify-center"
              >
                {speakingItemId === service.labelKey ? (
                  <Loader2 className="w-3 h-3 text-tamtam-primary animate-spin" />
                ) : (
                  <Volume2 className="w-3 h-3 text-tamtam-primary" />
                )}
              </button>
            </motion.button>
          );
        })}
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
