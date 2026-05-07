import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Menu, Bell, Volume2, Shield } from 'lucide-react';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSideMenu } from '@/pages/fitila/FitilaApp';
import { useBilingualAudio } from '@/hooks/useBilingualAudio';
import { triggerFeedback } from '@/utils/tamtamFeedback';

interface KuaishouHeaderProps {
  titleFr: string;
  titleBa?: string;
  emoji?: string;
  showBack?: boolean;
  showMenu?: boolean;
  showVoiceHelp?: boolean;
  transparent?: boolean;
  onBackClick?: () => void;
}

export const KuaishouHeader: React.FC<KuaishouHeaderProps> = ({
  titleFr,
  titleBa,
  emoji,
  showBack = true,
  showMenu = true,
  showVoiceHelp = true,
  transparent = false,
  onBackClick,
}) => {
  const navigate = useNavigate();
  const { currentLang } = useTamTamLanguage();
  const { isAdmin } = useAuth();
  const { open: openMenu } = useSideMenu();
  const { speakCurrentLang, isSpeaking } = useBilingualAudio();

  const handleBack = () => {
    triggerFeedback('click');
    if (onBackClick) {
      onBackClick();
    } else {
      navigate(-1);
    }
  };

  const handleMenuOpen = () => {
    triggerFeedback('click');
    openMenu();
  };

  const handleSpeakTitle = async () => {
    triggerFeedback('click');
    const text = currentLang === 'ba' && titleBa ? titleBa : titleFr;
    await speakCurrentLang(text);
  };

  const displayTitle = currentLang === 'ba' && titleBa ? titleBa : titleFr;

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className={`sticky top-0 z-50 px-4 py-3 ${
        transparent
          ? 'bg-transparent'
          : 'kuaishou-header'
      }`}
    >
      <div className="flex items-center justify-between">
        {/* Left: Back button */}
        <div className="flex items-center gap-2">
          {showBack && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleBack}
              className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/10"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </motion.button>
          )}
        </div>

        {/* Center: Title */}
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          className="flex items-center gap-2"
        >
          {emoji && <span className="text-xl">{emoji}</span>}
          <h1 className="text-lg font-bold text-white">{displayTitle}</h1>
        </motion.div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Admin Badge */}
          {isAdmin && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => navigate('/admin')}
              className="w-10 h-10 rounded-full flex items-center justify-center border border-[#FF7A00]/30 bg-[#FF7A00]/20 backdrop-blur-md"
            >
              <Shield className="w-5 h-5 text-[#FF7A00]" />
            </motion.button>
          )}

          {showVoiceHelp && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleSpeakTitle}
              disabled={isSpeaking}
              className={`w-10 h-10 rounded-full flex items-center justify-center border border-white/10 ${
                isSpeaking
                  ? 'bg-[#FF7A00]/30'
                  : 'bg-white/10 backdrop-blur-md'
              }`}
            >
              <Volume2 className={`w-5 h-5 ${isSpeaking ? 'text-[#FF7A00]' : 'text-white'}`} />
            </motion.button>
          )}
          
          {showMenu && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleMenuOpen}
              className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/10"
            >
              <Menu className="w-5 h-5 text-white" />
            </motion.button>
          )}
        </div>
      </div>
    </motion.header>
  );
};

export default KuaishouHeader;
