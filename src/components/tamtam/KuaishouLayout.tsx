import React from 'react';
import { motion } from 'framer-motion';
import { KuaishouHeader } from './KuaishouHeader';
import { KuaishouBottomNav } from './KuaishouBottomNav';

interface KuaishouLayoutProps {
  children: React.ReactNode;
  titleFr: string;
  titleBa?: string;
  emoji?: string;
  showBack?: boolean;
  showMenu?: boolean;
  showVoiceHelp?: boolean;
  showNav?: boolean;
  transparentHeader?: boolean;
  fullScreen?: boolean;
  onBackClick?: () => void;
}

export const KuaishouLayout: React.FC<KuaishouLayoutProps> = ({
  children,
  titleFr,
  titleBa,
  emoji,
  showBack = true,
  showMenu = true,
  showVoiceHelp = true,
  showNav = true,
  transparentHeader = false,
  fullScreen = false,
  onBackClick,
}) => {
  return (
    <div className="h-[100dvh] flex flex-col kuaishou-bg">
      {/* Header */}
      {!fullScreen && (
        <div className="flex-shrink-0">
          <KuaishouHeader
            titleFr={titleFr}
            titleBa={titleBa}
            emoji={emoji}
            showBack={showBack}
            showMenu={showMenu}
            showVoiceHelp={showVoiceHelp}
            transparent={transparentHeader}
            onBackClick={onBackClick}
          />
        </div>
      )}

      {/* Main content */}
      <motion.main
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
        className={`flex-1 overflow-y-auto ${!fullScreen ? 'pb-4' : ''}`}
      >
        {children}
      </motion.main>

      {/* Bottom navigation */}
      {showNav && !fullScreen && (
        <div className="flex-shrink-0">
          <KuaishouBottomNav />
        </div>
      )}
    </div>
  );
};

export default KuaishouLayout;
