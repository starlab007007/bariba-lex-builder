/**
 * KuaishouEffects.tsx
 * Composants d'effets visuels natifs Kuaishou
 * Sparkles, Horse, Calligraphy, Warm Glow, Beat Glow, Progress Bar
 */

import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ==========================================
// TYPES
// ==========================================

export interface SparklesConfig {
  enabled: boolean;
  count: number;
  colors: string[];
  sizeRange?: [number, number];
  twinkleSpeed?: number;
}

export interface HorseSilhouetteConfig {
  enabled: boolean;
  animation: 'gallop_across' | 'jump' | 'static';
  color?: string;
  startTime?: number;
  endTime?: number;
}

export interface CalligraphyConfig {
  enabled: boolean;
  texts: string[];
  font?: string;
  color?: string;
}

export interface WarmGlowConfig {
  enabled: boolean;
  intensity?: number;
  color?: string;
}

export interface BeatGlowConfig {
  enabled: boolean;
  syncToBeat: boolean;
  bpm?: number;
  color?: string;
}

export interface ProgressBarConfig {
  enabled: boolean;
  color?: string;
  glowColor?: string;
  height?: number;
}

export interface KuaishouNativeEffects {
  sparkles?: SparklesConfig;
  horseSilhouette?: HorseSilhouetteConfig;
  calligraphy?: CalligraphyConfig;
  warmGlow?: WarmGlowConfig;
  beatGlow?: BeatGlowConfig;
  progressBar?: ProgressBarConfig;
}

// ==========================================
// SPARKLES LAYER
// ==========================================

interface Sparkle {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  delay: number;
}

export const SparklesLayer: React.FC<SparklesConfig> = ({
  count = 16,
  colors = ['#FFD700', '#FFA500', '#FF6347', '#FFFFFF'],
  sizeRange = [3, 8],
  twinkleSpeed = 0.5
}) => {
  const sparkles = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: sizeRange[0] + Math.random() * (sizeRange[1] - sizeRange[0]),
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: Math.random() * 2
    }));
  }, [count, colors, sizeRange]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {sparkles.map(sparkle => (
        <motion.div
          key={sparkle.id}
          className="absolute rounded-full"
          style={{
            left: `${sparkle.x}%`,
            top: `${sparkle.y}%`,
            width: sparkle.size,
            height: sparkle.size,
            backgroundColor: sparkle.color,
            boxShadow: `0 0 ${sparkle.size * 2}px ${sparkle.color}`
          }}
          animate={{
            opacity: [0.2, 1, 0.2],
            scale: [0.8, 1.2, 0.8],
            y: [0, -10, 0]
          }}
          transition={{
            duration: 1.5 + twinkleSpeed,
            repeat: Infinity,
            delay: sparkle.delay,
            ease: 'easeInOut'
          }}
        />
      ))}
    </div>
  );
};

// ==========================================
// WARM GLOW LAYER
// ==========================================

export const WarmGlowLayer: React.FC<WarmGlowConfig> = ({
  intensity = 0.25,
  color = 'rgba(255,200,100,0.25)'
}) => {
  return (
    <motion.div
      className="absolute inset-0 pointer-events-none"
      style={{
        background: `radial-gradient(ellipse at 50% 30%, ${color}, transparent 70%)`
      }}
      animate={{
        opacity: [0.8, 1, 0.8]
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut'
      }}
    />
  );
};

// ==========================================
// BEAT GLOW LAYER
// ==========================================

export const BeatGlowLayer: React.FC<BeatGlowConfig & { currentTime: number }> = ({
  bpm = 128,
  color = 'rgba(255,215,0,0.3)',
  currentTime
}) => {
  const beatDuration = 60 / bpm;
  const beatPhase = (currentTime % beatDuration) / beatDuration;
  const glowIntensity = Math.cos(beatPhase * Math.PI * 2) * 0.2 + 0.8;

  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        boxShadow: `inset 0 0 ${100 * glowIntensity}px ${color}`,
        opacity: glowIntensity
      }}
    />
  );
};

// ==========================================
// VIGNETTE LAYER
// ==========================================

export const VignetteLayer: React.FC<{ intensity?: number; color?: string }> = ({
  intensity = 0.6,
  color = 'rgba(0,0,0,0.7)'
}) => {
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        background: `radial-gradient(ellipse at center, transparent 40%, ${color} 100%)`,
        opacity: intensity
      }}
    />
  );
};

// ==========================================
// PROGRESS BAR LAYER
// ==========================================

export const ProgressBarLayer: React.FC<ProgressBarConfig & { 
  currentTime: number; 
  duration: number;
}> = ({
  color = '#FFD700',
  glowColor = 'rgba(255,215,0,0.5)',
  height = 4,
  currentTime,
  duration
}) => {
  const progress = Math.min((currentTime / duration) * 100, 100);

  return (
    <div 
      className="absolute bottom-0 left-0 right-0 pointer-events-none"
      style={{ height: height + 4, padding: 2 }}
    >
      <div 
        className="relative w-full h-full rounded-full overflow-hidden"
        style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
      >
        <motion.div
          className="h-full rounded-full"
          style={{
            width: `${progress}%`,
            backgroundColor: color,
            boxShadow: `0 0 10px ${glowColor}, 0 0 20px ${glowColor}`
          }}
          initial={false}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.1 }}
        />
      </div>
    </div>
  );
};

// ==========================================
// HORSE SILHOUETTE LAYER
// ==========================================

export const HorseSilhouetteLayer: React.FC<HorseSilhouetteConfig & { 
  currentTime: number;
}> = ({
  animation = 'gallop_across',
  color = '#FFD700',
  startTime = 5,
  endTime = 10,
  currentTime
}) => {
  const isVisible = currentTime >= startTime && currentTime <= endTime;
  const animProgress = isVisible 
    ? (currentTime - startTime) / (endTime - startTime) 
    : 0;

  if (!isVisible) return null;

  // Position based on animation progress
  const xPos = animation === 'gallop_across' 
    ? -20 + animProgress * 140 // -20% to 120%
    : 50;

  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{
        left: `${xPos}%`,
        top: '40%',
        transform: 'translate(-50%, -50%)',
        filter: `drop-shadow(0 0 15px ${color})`
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <svg
        width="120"
        height="80"
        viewBox="0 0 100 60"
        fill={color}
        className="animate-pulse"
      >
        {/* Horse silhouette path */}
        <path d="M85,30 Q90,25 88,18 Q86,12 80,10 L78,8 Q76,5 72,6 Q68,7 70,12 L68,15 Q62,12 55,14 Q48,16 45,22 L35,25 Q25,27 18,32 Q12,36 10,42 L8,48 Q6,52 10,55 L15,55 Q18,52 22,50 L28,50 Q32,52 36,55 L42,55 Q45,52 48,50 L52,50 Q58,52 65,55 L72,55 Q75,52 78,48 L82,42 Q86,36 85,30 Z" />
        {/* Mane */}
        <path d="M72,12 Q74,8 70,5 Q66,2 62,6 Q58,10 60,15 Q62,12 68,12 Z" opacity="0.8" />
        {/* Tail */}
        <path d="M10,42 Q5,45 3,52 Q2,58 8,58 Q12,55 10,48 Z" opacity="0.8" />
        {/* Eye */}
        <circle cx="78" cy="14" r="2" fill="white" opacity="0.8" />
      </svg>
    </motion.div>
  );
};

// ==========================================
// CALLIGRAPHY LAYER
// ==========================================

interface CalligraphyLayerProps extends CalligraphyConfig {
  currentTime: number;
}

const calligraphyTimings = [
  { text: '2026', start: 0.2, end: 2.5, position: { x: 0.5, y: 0.5 }, style: 'hero' },
  { text: '蛇年大吉', start: 0.8, end: 3.5, position: { x: 0.5, y: 0.35 }, style: 'main' },
  { text: '福满乾坤', start: 1.2, end: 3.5, position: { x: 0.5, y: 0.65 }, style: 'sub' }
];

export const CalligraphyLayer: React.FC<CalligraphyLayerProps> = ({
  texts = ['2026', '蛇年大吉', '福满乾坤'],
  font = 'Ma Shan Zheng, serif',
  color = '#FFD700',
  currentTime
}) => {
  return (
    <div className="absolute inset-0 pointer-events-none">
      <AnimatePresence>
        {calligraphyTimings.map((item, index) => {
          const isVisible = currentTime >= item.start && currentTime <= item.end;
          const displayText = texts[index] || item.text;
          
          if (!isVisible) return null;

          return (
            <motion.div
              key={item.text}
              className="absolute"
              style={{
                left: `${item.position.x * 100}%`,
                top: `${item.position.y * 100}%`,
                transform: 'translate(-50%, -50%)',
                fontFamily: font,
                color: color,
                textShadow: `0 0 20px ${color}, 0 0 40px ${color}`,
                fontSize: item.style === 'hero' ? '4rem' : item.style === 'main' ? '2.5rem' : '1.5rem',
                fontWeight: 'bold'
              }}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.2 }}
              transition={{ 
                duration: 0.6,
                ease: [0.34, 1.56, 0.64, 1]
              }}
            >
              {displayText}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

// ==========================================
// OUTRO LAYER (TAM-TAM Branding)
// ==========================================

interface OutroLayerProps {
  currentTime: number;
  duration: number;
}

export const OutroLayer: React.FC<OutroLayerProps> = ({ 
  currentTime, 
  duration 
}) => {
  const outroStart = duration - 2.2;
  const isVisible = currentTime >= outroStart;

  if (!isVisible) return null;

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
      <AnimatePresence>
        <motion.div
          className="text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.h1
            className="text-4xl font-bold mb-4"
            style={{
              background: 'linear-gradient(135deg, #0066FF, #00D4FF, #FFD700)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textShadow: '0 0 30px rgba(0, 102, 255, 0.5)'
            }}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0 }}
          >
            ✨ TAM-TAM
          </motion.h1>
          <motion.p
            className="text-lg text-white/90"
            style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.4 }}
          >
            Créez. Partagez. Inspirez. 🐴
          </motion.p>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

// ==========================================
// MESSAGE LAYER (Middle section)
// ==========================================

interface MessageLayerProps {
  currentTime: number;
  mainText?: string;
  subText?: string;
  startTime?: number;
  endTime?: number;
}

export const MessageLayer: React.FC<MessageLayerProps> = ({
  currentTime,
  mainText = '✨ TAM-TAM',
  subText = 'Créez. Partagez. Inspirez.',
  startTime = 4,
  endTime = 9
}) => {
  const isVisible = currentTime >= startTime && currentTime <= endTime;

  if (!isVisible) return null;

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
      <motion.h2
        className="text-3xl font-bold text-white mb-2"
        style={{ textShadow: '0 2px 20px rgba(0,0,0,0.7)' }}
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
      >
        {mainText}
      </motion.h2>
      <motion.p
        className="text-lg text-white/80"
        style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        {subText}
      </motion.p>
    </div>
  );
};

// ==========================================
// COMBINED KUAISHOU EFFECTS OVERLAY
// ==========================================

interface KuaishouEffectsOverlayProps {
  effects: KuaishouNativeEffects;
  currentTime: number;
  duration: number;
  isRecording?: boolean;
}

export const KuaishouEffectsOverlay: React.FC<KuaishouEffectsOverlayProps> = ({
  effects,
  currentTime,
  duration,
  isRecording = false
}) => {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* Background effects */}
      {effects.warmGlow?.enabled && (
        <WarmGlowLayer {...effects.warmGlow} />
      )}
      
      <VignetteLayer intensity={0.5} />
      
      {effects.beatGlow?.enabled && (
        <BeatGlowLayer 
          {...effects.beatGlow} 
          currentTime={currentTime} 
        />
      )}
      
      {/* Particles */}
      {effects.sparkles?.enabled && (
        <SparklesLayer {...effects.sparkles} />
      )}
      
      {/* Graphics */}
      {effects.horseSilhouette?.enabled && (
        <HorseSilhouetteLayer 
          {...effects.horseSilhouette} 
          currentTime={currentTime}
        />
      )}
      
      {/* Text overlays (only during preview, not recording) */}
      {!isRecording && effects.calligraphy?.enabled && (
        <CalligraphyLayer 
          {...effects.calligraphy} 
          currentTime={currentTime}
        />
      )}
      
      {!isRecording && currentTime >= 4 && currentTime <= 9 && (
        <MessageLayer currentTime={currentTime} />
      )}
      
      {!isRecording && (
        <OutroLayer currentTime={currentTime} duration={duration} />
      )}
      
      {/* UI */}
      {effects.progressBar?.enabled && (
        <ProgressBarLayer 
          {...effects.progressBar} 
          currentTime={currentTime}
          duration={duration}
        />
      )}
    </div>
  );
};

export default KuaishouEffectsOverlay;
