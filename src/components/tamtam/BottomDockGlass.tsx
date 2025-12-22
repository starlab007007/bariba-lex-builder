import React from 'react';
import { motion } from 'framer-motion';
import { Home, Layers, Plus, MessageCircle, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BottomDockGlassProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onCreateClick: () => void;
  notificationCount?: number;
  className?: string;
}

const dockItems = [
  { id: 'feed', icon: Home, label: 'Accueil' },
  { id: 'discover', icon: Layers, label: 'Découvrir' },
  { id: 'create', icon: Plus, label: 'Créer', isCreate: true },
  { id: 'messages', icon: MessageCircle, label: 'Messages' },
  { id: 'profile', icon: User, label: 'Profil' },
];

export const BottomDockGlass: React.FC<BottomDockGlassProps> = ({
  activeTab,
  onTabChange,
  onCreateClick,
  notificationCount = 0,
  className,
}) => {
  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', damping: 20, stiffness: 300 }}
      className={cn(
        'fixed bottom-4 left-4 right-4 z-50 glass-dock',
        className
      )}
    >
      <div className="flex items-center justify-around py-1">
        {dockItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          if (item.isCreate) {
            return (
              <motion.button
                key={item.id}
                whileTap={{ scale: 0.9 }}
                whileHover={{ scale: 1.1 }}
                onClick={onCreateClick}
                className="dock-item-create"
              >
                <Icon className="w-6 h-6" strokeWidth={2.5} />
              </motion.button>
            );
          }

          return (
            <motion.button
              key={item.id}
              whileTap={{ scale: 0.9 }}
              onClick={() => onTabChange(item.id)}
              className={cn('dock-item relative', isActive && 'active')}
            >
              <Icon className="w-6 h-6" />
              
              {/* Notification badge for messages */}
              {item.id === 'messages' && notificationCount > 0 && (
                <span className="notification-badge">
                  {notificationCount > 99 ? '99+' : notificationCount}
                </span>
              )}
              
              {/* Active indicator dot */}
              {isActive && (
                <motion.div
                  layoutId="dock-indicator"
                  className="absolute -bottom-1 w-1 h-1 rounded-full bg-primary"
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
};
