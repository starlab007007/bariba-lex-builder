import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GlassPill } from './GlassUI';

interface TopBarGlassProps {
  activeTab: 'pour_toi' | 'abonnements';
  onTabChange: (tab: 'pour_toi' | 'abonnements') => void;
  onLiveClick?: () => void;
  className?: string;
}

export const TopBarGlass: React.FC<TopBarGlassProps> = ({
  activeTab,
  onTabChange,
  onLiveClick,
  className,
}) => {
  return (
    <motion.div
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className={cn(
        'fixed top-0 left-0 right-0 z-50 safe-area-top',
        'px-4 py-3',
        className
      )}
      style={{
        background: 'rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(32px) saturate(180%)',
        WebkitBackdropFilter: 'blur(32px) saturate(180%)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
      }}
    >
      <div className="flex items-center justify-between">
        {/* Tab Selector */}
        <div className="topbar-tabs">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => onTabChange('pour_toi')}
            className={cn('topbar-tab', activeTab === 'pour_toi' && 'active')}
          >
            Pour toi
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => onTabChange('abonnements')}
            className={cn('topbar-tab', activeTab === 'abonnements' && 'active')}
          >
            Abonnements
          </motion.button>
        </div>

        {/* LIVE Button */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          whileHover={{ scale: 1.05 }}
          onClick={onLiveClick}
          className="live-badge"
        >
          <Sparkles className="w-4 h-4" />
          LIVE
        </motion.button>
      </div>
    </motion.div>
  );
};

interface FeedTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  tabs: { id: string; label: string }[];
  className?: string;
}

export const FeedTabs: React.FC<FeedTabsProps> = ({
  activeTab,
  onTabChange,
  tabs,
  className,
}) => {
  return (
    <div className={cn('flex gap-2 p-2', className)}>
      {tabs.map((tab) => (
        <GlassPill
          key={tab.id}
          active={activeTab === tab.id}
          onClick={() => onTabChange(tab.id)}
          size="sm"
        >
          {tab.label}
        </GlassPill>
      ))}
    </div>
  );
};
