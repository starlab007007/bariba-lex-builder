/**
 * VinylAuthorDisc — Rotating vinyl disc with author's photo
 * Displayed in top-right corner of feed posts
 */

import React from 'react';
import { motion } from 'framer-motion';

interface VinylAuthorDiscProps {
  avatarUrl?: string | null;
  size?: number;
  className?: string;
}

export function VinylAuthorDisc({ avatarUrl, size = 48, className = '' }: VinylAuthorDiscProps) {
  const centerSize = Math.round(size * 0.5);
  const borderWidth = Math.max(2, Math.round(size * 0.04));

  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
      className={`relative rounded-full flex-shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        background: `
          radial-gradient(circle at 50% 50%, 
            transparent 0%, transparent 40%,
            rgba(0,0,0,0.4) 41%, transparent 42%,
            transparent 55%, rgba(0,0,0,0.25) 56%, transparent 57%,
            transparent 70%, rgba(0,0,0,0.15) 71%, transparent 72%
          ),
          linear-gradient(135deg, #1a1a1a 0%, #333 50%, #1a1a1a 100%)
        `,
        border: `${borderWidth}px solid #DAA520`,
        boxShadow: '0 2px 8px rgba(0,0,0,0.5), 0 0 0 1px rgba(218,165,32,0.3)'
      }}
    >
      {/* Center — Author Photo */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full overflow-hidden border-2 border-amber-400/60"
        style={{ width: centerSize, height: centerSize }}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt="Auteur"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-amber-900 to-amber-950 flex items-center justify-center">
            <span className="text-xs">🌙</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default VinylAuthorDisc;
