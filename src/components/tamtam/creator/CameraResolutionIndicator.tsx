// src/components/tamtam/creator/CameraResolutionIndicator.tsx
// Visual indicator showing current camera resolution (HD, Full HD, 4K)

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Monitor, Smartphone, Zap, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PerformanceTier } from '@/hooks/useDevicePerformance';

export type ResolutionLabel = 'SD' | 'HD' | 'FHD' | '2K' | '4K';

interface CameraResolutionIndicatorProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  performanceTier?: PerformanceTier | null;
  className?: string;
  /** Show "HD Quality Preserved" indicator for native quality mode */
  showQualityPreserved?: boolean;
}

function getResolutionLabel(width: number, height: number): { label: ResolutionLabel; color: string; description: string } {
  const maxDim = Math.max(width, height);
  const minDim = Math.min(width, height);
  
  // Check by vertical resolution (common for portrait mode)
  if (maxDim >= 3840 || minDim >= 2160) {
    return { label: '4K', color: 'from-purple-500 to-pink-500', description: '3840×2160' };
  }
  if (maxDim >= 2560 || minDim >= 1440) {
    return { label: '2K', color: 'from-blue-500 to-purple-500', description: '2560×1440' };
  }
  if (maxDim >= 1920 || minDim >= 1080) {
    return { label: 'FHD', color: 'from-green-500 to-emerald-500', description: '1920×1080' };
  }
  if (maxDim >= 1280 || minDim >= 720) {
    return { label: 'HD', color: 'from-yellow-500 to-orange-500', description: '1280×720' };
  }
  return { label: 'SD', color: 'from-gray-500 to-gray-600', description: `${width}×${height}` };
}

function getTierIcon(tier: PerformanceTier) {
  switch (tier) {
    case 'high':
      return <Zap className="w-3 h-3" />;
    case 'medium':
      return <Monitor className="w-3 h-3" />;
    case 'low':
      return <Smartphone className="w-3 h-3" />;
  }
}

function getTierColor(tier: PerformanceTier) {
  switch (tier) {
    case 'high':
      return 'text-green-400';
    case 'medium':
      return 'text-yellow-400';
    case 'low':
      return 'text-orange-400';
  }
}

export default function CameraResolutionIndicator({
  videoRef,
  performanceTier,
  className,
  showQualityPreserved = false,
}: CameraResolutionIndicatorProps) {
  const [resolution, setResolution] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateResolution = () => {
      const w = video.videoWidth;
      const h = video.videoHeight;
      if (w > 0 && h > 0) {
        setResolution({ width: w, height: h });
      }
    };

    // Initial check
    updateResolution();

    // Listen for metadata load
    video.addEventListener('loadedmetadata', updateResolution);
    video.addEventListener('resize', updateResolution);

    // Poll periodically for stream changes
    const interval = setInterval(updateResolution, 2000);

    return () => {
      video.removeEventListener('loadedmetadata', updateResolution);
      video.removeEventListener('resize', updateResolution);
      clearInterval(interval);
    };
  }, [videoRef]);

  if (!resolution || resolution.width === 0) return null;

  const { label, color, description } = getResolutionLabel(resolution.width, resolution.height);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.8, x: 20 }}
        animate={{ opacity: 1, scale: 1, x: 0 }}
        exit={{ opacity: 0, scale: 0.8, x: 20 }}
        className={cn(
          "flex items-center gap-1.5 px-2 py-1 rounded-lg",
          "bg-black/60 backdrop-blur-md border border-white/10",
          "text-xs font-medium",
          className
        )}
      >
        {/* Resolution badge */}
        <div className={cn(
          "px-1.5 py-0.5 rounded text-[10px] font-bold text-white",
          "bg-gradient-to-r",
          color
        )}>
          {label}
        </div>

        {/* Actual dimensions */}
        <span className="text-white/70 text-[10px] hidden sm:inline">
          {resolution.width}×{resolution.height}
        </span>

        {/* ✅ Quality Preserved indicator (when K-Engine active with native quality) */}
        {showQualityPreserved && (
          <div className="flex items-center gap-0.5 pl-1.5 border-l border-white/20 text-green-400">
            <Check className="w-3 h-3" />
            <span className="text-[10px] hidden sm:inline">HD</span>
          </div>
        )}

        {/* Performance tier indicator */}
        {performanceTier && (
          <div className={cn(
            "flex items-center gap-0.5 pl-1.5 border-l border-white/20",
            getTierColor(performanceTier)
          )}>
            {getTierIcon(performanceTier)}
            <span className="text-[10px] uppercase hidden sm:inline">
              {performanceTier}
            </span>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

// Compact version for tight spaces
export function CameraResolutionBadge({
  videoRef,
  className,
}: {
  videoRef: React.RefObject<HTMLVideoElement>;
  className?: string;
}) {
  const [resolution, setResolution] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateResolution = () => {
      const w = video.videoWidth;
      const h = video.videoHeight;
      if (w > 0 && h > 0) {
        setResolution({ width: w, height: h });
      }
    };

    updateResolution();
    video.addEventListener('loadedmetadata', updateResolution);
    const interval = setInterval(updateResolution, 2000);

    return () => {
      video.removeEventListener('loadedmetadata', updateResolution);
      clearInterval(interval);
    };
  }, [videoRef]);

  if (!resolution || resolution.width === 0) return null;

  const { label, color } = getResolutionLabel(resolution.width, resolution.height);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "px-1.5 py-0.5 rounded text-[10px] font-bold text-white",
        "bg-gradient-to-r shadow-lg",
        color,
        className
      )}
    >
      {label}
    </motion.div>
  );
}
