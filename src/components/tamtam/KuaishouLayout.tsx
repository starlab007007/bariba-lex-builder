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
    <div className="min-h-screen kuaishou-bg">
      {/* Header */}
      {!fullScreen && (
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
      )}

      {/* Main content */}
      <motion.main
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
        className={`${!fullScreen ? 'pb-24' : ''}`}
      >
        {children}
      </motion.main>

      {/* Bottom navigation */}
      {showNav && !fullScreen && <KuaishouBottomNav />}
    </div>
  );
};

export default KuaishouLayout;
