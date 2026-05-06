import React from 'react';
import { motion } from 'framer-motion';

const shimmer = 'animate-pulse';

/** Skeleton card that fills one viewport height — matches audio/video feed card layout */
export const FeedSkeletonCard: React.FC<{ variant?: 'audio' | 'video' }> = ({ variant = 'audio' }) => (
  <div className="h-[100dvh] h-screen w-full snap-start snap-always relative overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
    {variant === 'audio' ? (
      <div className="absolute inset-0 flex flex-col items-center justify-center px-8 gap-5">
        {/* Disc */}
        <div className={`w-44 h-44 rounded-full bg-white/5 ${shimmer}`} />
        {/* Karaoke bar */}
        <div className={`w-64 h-14 rounded-2xl bg-white/5 ${shimmer}`} />
        {/* Author */}
        <div className="flex items-center gap-3">
          <div className={`w-20 h-4 rounded bg-white/5 ${shimmer}`} />
          <div className={`w-16 h-6 rounded-full bg-white/5 ${shimmer}`} />
        </div>
        {/* Controls */}
        <div className="flex items-center gap-5">
          <div className={`w-11 h-11 rounded-full bg-white/5 ${shimmer}`} />
          <div className={`w-16 h-16 rounded-full bg-white/8 ${shimmer}`} />
          <div className={`w-11 h-11 rounded-full bg-white/5 ${shimmer}`} />
        </div>
        {/* Progress */}
        <div className={`w-64 h-1 rounded-full bg-white/5 ${shimmer}`} />
      </div>
    ) : (
      <div className="absolute inset-0 flex flex-col justify-end p-5 gap-3">
        <div className={`w-3/4 h-5 rounded bg-white/5 ${shimmer}`} />
        <div className={`w-1/2 h-4 rounded bg-white/5 ${shimmer}`} />
        <div className="flex items-center gap-3 mt-2">
          <div className={`w-10 h-10 rounded-full bg-white/5 ${shimmer}`} />
          <div className={`w-24 h-4 rounded bg-white/5 ${shimmer}`} />
        </div>
      </div>
    )}
    {/* Right sidebar skeleton */}
    <div className="absolute right-4 bottom-36 flex flex-col items-center gap-5">
      {[0,1,2,3].map(i => (
        <div key={i} className={`w-12 h-12 rounded-full bg-white/5 ${shimmer}`} />
      ))}
    </div>
  </div>
);

/** Multiple skeleton cards for initial loading */
export const FeedSkeletonList: React.FC<{ count?: number; variant?: 'audio' | 'video' }> = ({ count = 3, variant = 'audio' }) => (
  <>
    {Array.from({ length: count }).map((_, i) => (
      <FeedSkeletonCard key={i} variant={variant} />
    ))}
  </>
);

/** Inline loading spinner for infinite scroll bottom */
export const FeedLoadingMore: React.FC = () => (
  <div className="h-20 flex items-center justify-center">
    <motion.div
      className="w-6 h-6 border-2 border-white/20 border-t-amber-500 rounded-full"
      animate={{ rotate: 360 }}
      transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
    />
  </div>
);

export default FeedSkeletonList;