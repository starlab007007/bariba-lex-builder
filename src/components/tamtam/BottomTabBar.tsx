import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Home, MessageCircle, Users, Video as VideoIcon, Plus 
} from 'lucide-react';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';
import { triggerFeedback } from '@/utils/tamtamFeedback';

export type BottomTabId = 'feed' | 'chat' | 'create' | 'groups' | 'direct';

interface BottomTabBarProps {
  activeTab: BottomTabId;
  onTabChange: (tab: BottomTabId) => void;
  onCreatePress: () => void;
  unreadMessages?: number;
  unreadDirect?: number;
}

interface TabConfig {
  id: BottomTabId;
  icon: typeof Home;
  label: string;
  labelBa: string;
}

const tabs: TabConfig[] = [
  { id: 'feed', icon: Home, label: 'Fil', labelBa: 'Ìfọwọ́kọ' },
  { id: 'chat', icon: MessageCircle, label: 'Chat', labelBa: 'Ọ̀rọ̀' },
  { id: 'create', icon: Plus, label: '', labelBa: '' }, // Central button
  { id: 'groups', icon: Users, label: 'Groupes', labelBa: 'Ẹgbẹ́' },
  { id: 'direct', icon: VideoIcon, label: 'Direct', labelBa: 'Tààrà' },
];

export const BottomTabBar: React.FC<BottomTabBarProps> = ({
  activeTab,
  onTabChange,
  onCreatePress,
  unreadMessages = 0,
  unreadDirect = 0
}) => {
  const { currentLang } = useTamTamLanguage();

  const handleTabPress = (tabId: BottomTabId) => {
    triggerFeedback('click');
    if (tabId === 'create') {
      onCreatePress();
    } else {
      onTabChange(tabId);
    }
  };

  return (
    <motion.nav
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      className="fixed bottom-0 left-0 right-0 z-50 safe-area-bottom"
      style={{
        background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.8) 30%, rgba(0,0,0,0.95) 100%)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      <div className="flex items-end justify-around px-2 pt-2 pb-safe">
        {tabs.map((tab, index) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const isCreate = tab.id === 'create';
          
          // Show badge for chat/direct
          const showBadge = (tab.id === 'chat' && unreadMessages > 0) || (tab.id === 'direct' && unreadDirect > 0);
          const badgeCount = tab.id === 'chat' ? unreadMessages : unreadDirect;

          if (isCreate) {
            return (
              <motion.button
                key={tab.id}
                whileTap={{ scale: 0.9 }}
                onClick={() => handleTabPress(tab.id)}
                className="relative -mt-6"
              >
                {/* Glow effect */}
                <motion.div
                  className="absolute inset-0 rounded-full bg-gradient-to-r from-pink-500 via-red-500 to-orange-500 blur-xl opacity-60"
                  animate={{ 
                    scale: [1, 1.2, 1],
                    opacity: [0.4, 0.7, 0.4]
                  }}
                  transition={{ repeat: Infinity, duration: 2 }}
                />
                
                {/* Button */}
                <div className="relative w-14 h-14 rounded-full bg-gradient-to-r from-pink-500 via-red-500 to-orange-500 flex items-center justify-center shadow-2xl">
                  <Plus className="w-7 h-7 text-white" strokeWidth={3} />
                </div>
              </motion.button>
            );
          }

          return (
            <motion.button
              key={tab.id}
              whileTap={{ scale: 0.9 }}
              onClick={() => handleTabPress(tab.id)}
              className="relative flex flex-col items-center gap-0.5 py-2 px-4"
            >
              <div className="relative">
                <Icon 
                  className={`w-6 h-6 transition-colors ${
                    isActive ? 'text-white' : 'text-white/50'
                  }`}
                />
                
                {/* Badge */}
                {showBadge && (
                  <motion.span 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center"
                  >
                    {badgeCount > 9 ? '9+' : badgeCount}
                  </motion.span>
                )}
              </div>
              
              <span className={`text-[10px] font-medium transition-colors ${
                isActive ? 'text-white' : 'text-white/50'
              }`}>
                {currentLang === 'ba' ? tab.labelBa : tab.label}
              </span>
              
              {/* Active indicator */}
              {isActive && (
                <motion.div
                  layoutId="activeBottomTab"
                  className="absolute -bottom-0.5 w-4 h-1 rounded-full bg-white"
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </motion.nav>
  );
};

export default BottomTabBar;
