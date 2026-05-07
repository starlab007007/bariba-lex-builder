/**
 * VinylAuthorDisc — Author signature badge for the feed
 * Gold-bordered circle with author photo + "Griot" label
 * Matches the reference design (capture 1)
 */

import React from 'react';
import { motion } from 'framer-motion';

interface VinylAuthorDiscProps {
  avatarUrl?: string | null;
  size?: number;
  className?: string;
  showLabel?: boolean;
}

export function VinylAuthorDisc({ avatarUrl, size = 52, className = '', showLabel = true }: VinylAuthorDiscProps) {
  const borderWidth = Math.max(2, Math.round(size * 0.05));

  return (
    <div className={`flex flex-col items-center gap-1 ${className}`}>
      {/* Gold-bordered circle with photo */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
        className="relative rounded-full flex-shrink-0 overflow-hidden"
        style={{
          width: size,
          height: size,
          border: `${borderWidth}px solid #DAA520`,
          boxShadow: '0 2px 10px rgba(218,165,32,0.4), 0 0 0 1px rgba(218,165,32,0.2)',
        }}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt="Auteur"
            className="w-full h-full object-cover rounded-full"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-amber-800 to-amber-950 flex items-center justify-center">
            <span className="text-lg" style={{ fontSize: size * 0.4 }}>🌙</span>
          </div>
        )}
      </motion.div>

      {/* Label */}
      {showLabel && (
        <span
          className="text-white font-semibold drop-shadow-lg leading-none"
          style={{ fontSize: Math.max(9, size * 0.2) }}
        >
          Griot
        </span>
      )}
    </div>
  );
}

export default VinylAuthorDisc;
