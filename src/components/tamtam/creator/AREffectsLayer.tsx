// src/components/tamtam/creator/AREffectsLayer.tsx
// AR Effects with animations (sparkles, hearts, rain, etc.)

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { AR_EFFECTS, AREffect } from './CreatorEffectsData';

interface AREffectsLayerProps {
  activeEffects: string[];
  className?: string;
}

// Generate random particles for animations - distributed across full screen
const generateParticles = (count: number, seed: number = 0) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `${seed}-${i}`,
    x: Math.random() * 100,
    y: Math.random() * 100,
    delay: Math.random() * 4,
    duration: 2 + Math.random() * 3,
    size: 0.8 + Math.random() * 1.2,
  }));
};

// ============= ANIMATION COMPONENTS =============

const SparklesAnimation: React.FC = () => {
  const particles = useMemo(() => generateParticles(40, 1), []);
  
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute text-yellow-300"
          style={{ left: `${p.x}%`, top: `${p.y}%`, fontSize: `${p.size * 28}px` }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{
            x: [0, 15, -15, 10, -10, 0],
            y: [0, -30, 20, -20, 10, 0],
            opacity: [0, 1, 0.8, 1, 0.6, 0],
            scale: [0, 1, 0.8, 1, 0.6, 0],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: p.duration + 1,
            delay: p.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          ✨
        </motion.div>
      ))}
    </div>
  );
};

const FloatingHeartsAnimation: React.FC = () => {
  const hearts = useMemo(() => generateParticles(35, 2), []);
  const heartEmojis = ['❤️', '💕', '💗', '💖', '💓'];
  
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {hearts.map((p, i) => (
        <motion.div
          key={p.id}
          className="absolute"
          style={{ left: `${p.x}%`, top: `${p.y}%`, fontSize: `${p.size * 32}px` }}
          initial={{ opacity: 0 }}
          animate={{
            x: [0, 25, -25, 15, -15, 0],
            y: [0, -40, 20, -30, 10, 0],
            opacity: [0, 1, 0.8, 1, 0.6, 0],
            scale: [0.5, 1.2, 0.9, 1.1, 0.8, 0.5],
          }}
          transition={{
            duration: p.duration + 2,
            delay: p.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          {heartEmojis[i % heartEmojis.length]}
        </motion.div>
      ))}
    </div>
  );
};

const RainAnimation: React.FC = () => {
  const drops = useMemo(() => generateParticles(60, 3), []);
  
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {drops.map((p) => (
        <motion.div
          key={p.id}
          className="absolute w-0.5 bg-gradient-to-b from-transparent via-blue-400/60 to-blue-300/80 rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            height: `${25 + p.size * 35}px`,
          }}
          initial={{ opacity: 0 }}
          animate={{
            y: [0, 500],
            opacity: [0, 0.7, 0.7, 0],
          }}
          transition={{
            duration: 0.8 + p.size * 0.4,
            delay: p.delay * 0.5,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      ))}
    </div>
  );
};

const ConfettiAnimation: React.FC = () => {
  const confetti = useMemo(() => generateParticles(50, 4), []);
  const colors = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ff6bd6', '#a855f7'];
  
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {confetti.map((p, i) => (
        <motion.div
          key={p.id}
          className="absolute w-3 h-4 rounded-sm"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            backgroundColor: colors[i % colors.length],
          }}
          initial={{ opacity: 0, rotate: 0 }}
          animate={{
            x: [0, 40, -40, 25, -25, 0],
            y: [0, 60, -30, 50, -20, 0],
            rotate: [0, 360, 720, 1080],
            opacity: [0, 1, 0.8, 1, 0.6, 0],
          }}
          transition={{
            duration: 3 + p.size,
            delay: p.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
};

const SnowAnimation: React.FC = () => {
  const flakes = useMemo(() => generateParticles(50, 5), []);
  
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {flakes.map((p) => (
        <motion.div
          key={p.id}
          className="absolute text-white/80"
          style={{ left: `${p.x}%`, top: `${p.y}%`, fontSize: `${p.size * 22}px` }}
          initial={{ opacity: 0 }}
          animate={{
            y: [0, 300],
            x: [0, 20, -20, 15, -15, 8, 0],
            opacity: [0, 0.8, 0.8, 0.8, 0],
            rotate: [0, 180],
          }}
          transition={{
            duration: 4 + p.size * 2,
            delay: p.delay,
            repeat: Infinity,
            ease: 'linear',
          }}
        >
          ❄️
        </motion.div>
      ))}
    </div>
  );
};

const BubblesAnimation: React.FC = () => {
  const bubbles = useMemo(() => generateParticles(35, 6), []);
  
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {bubbles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full border border-white/30 bg-white/5"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size * 38}px`,
            height: `${p.size * 38}px`,
          }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{
            x: [0, 15, -15, 8, -8, 0],
            y: [0, -60, -30, -80, -50, -100],
            opacity: [0, 0.6, 0.5, 0.6, 0.3, 0],
            scale: [0.3, 1, 0.9, 1, 0.8, 0.5],
          }}
          transition={{
            duration: 4 + p.size * 2,
            delay: p.delay,
            repeat: Infinity,
            ease: 'easeOut',
          }}
        />
      ))}
    </div>
  );
};

const FirefliesAnimation: React.FC = () => {
  const flies = useMemo(() => generateParticles(40, 7), []);
  
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {flies.map((p) => (
        <motion.div
          key={p.id}
          className="absolute w-3 h-3 rounded-full bg-yellow-300"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            boxShadow: '0 0 14px #fde047, 0 0 28px #fde047',
          }}
          animate={{
            x: [0, 50, -40, 60, -50, 30, 0],
            y: [0, -40, 50, -30, 40, -50, 0],
            opacity: [0.2, 1, 0.3, 1, 0.5, 1, 0.2],
            scale: [0.8, 1.4, 0.9, 1.3, 0.8],
          }}
          transition={{
            duration: 5 + p.size * 3,
            delay: p.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
};

// ============= MAIN COMPONENT =============

export const AREffectsLayer: React.FC<AREffectsLayerProps> = ({
  activeEffects,
  className,
}) => {
  const effects = useMemo(() => 
    activeEffects.map(id => AR_EFFECTS.find(e => e.id === id)).filter(Boolean) as AREffect[],
    [activeEffects]
  );

  const overlayEffects = effects.filter(e => e.type === 'overlay');

  return (
    <div className={`absolute inset-0 pointer-events-none z-20 ${className || ''}`}>
      {overlayEffects.map((effect) => {
        switch (effect.animation) {
          case 'sparkles':
            return <SparklesAnimation key={effect.id} />;
          case 'floating-hearts':
            return <FloatingHeartsAnimation key={effect.id} />;
          case 'rain':
            return <RainAnimation key={effect.id} />;
          case 'confetti':
            return <ConfettiAnimation key={effect.id} />;
          case 'snow':
            return <SnowAnimation key={effect.id} />;
          case 'bubbles':
            return <BubblesAnimation key={effect.id} />;
          case 'fireflies':
            return <FirefliesAnimation key={effect.id} />;
          default:
            return null;
        }
      })}
    </div>
  );
};

// ============= SHOT TIPS OVERLAY =============

interface ShotTipOverlayProps {
  tipId: string | undefined;
}

export const ShotTipOverlay: React.FC<ShotTipOverlayProps> = ({ tipId }) => {
  if (!tipId) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      {tipId === 'rule_of_thirds' && (
        <div className="absolute inset-0 grid grid-cols-3 grid-rows-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <div
              key={i}
              className="border border-white/30"
            />
          ))}
        </div>
      )}
      
      {tipId === 'center_focus' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-24 h-24 rounded-full border-2 border-white/40" />
          <div className="absolute w-12 h-12 rounded-full border border-white/60" />
          <div className="absolute w-1 h-8 bg-white/40" />
          <div className="absolute w-8 h-1 bg-white/40" />
        </div>
      )}
      
      {tipId === 'golden_spiral' && (
        <svg className="absolute inset-0 w-full h-full opacity-30" viewBox="0 0 100 100">
          <path
            d="M100,0 L100,61.8 L38.2,61.8 L38.2,23.6 L61.8,23.6 L61.8,38.2 L52.8,38.2 L52.8,32.8 L56.2,32.8"
            fill="none"
            stroke="white"
            strokeWidth="0.5"
          />
        </svg>
      )}
      
      {tipId === 'diagonal_lines' && (
        <svg className="absolute inset-0 w-full h-full opacity-30" preserveAspectRatio="none">
          <line x1="0" y1="0" x2="100%" y2="100%" stroke="white" strokeWidth="1" />
          <line x1="100%" y1="0" x2="0" y2="100%" stroke="white" strokeWidth="1" />
        </svg>
      )}
    </div>
  );
};

export default AREffectsLayer;
