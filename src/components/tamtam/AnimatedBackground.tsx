import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

export type BackgroundTheme = 
  | 'savanna' 
  | 'night_village' 
  | 'harvest' 
  | 'festival' 
  | 'sunrise'
  | 'ocean'
  | 'forest';

interface AnimatedBackgroundProps {
  theme: BackgroundTheme;
  intensity?: number;
  particles?: boolean;
  children?: React.ReactNode;
  className?: string;
}

const THEME_CONFIG: Record<BackgroundTheme, {
  gradientFrom: string;
  gradientVia: string;
  gradientTo: string;
  animation: string;
  particleColor: string;
}> = {
  savanna: {
    gradientFrom: 'from-amber-400',
    gradientVia: 'via-orange-500',
    gradientTo: 'to-red-600',
    animation: 'animate-gradient-savanna',
    particleColor: 'rgba(255, 200, 100, 0.6)'
  },
  night_village: {
    gradientFrom: 'from-indigo-900',
    gradientVia: 'via-purple-800',
    gradientTo: 'to-slate-900',
    animation: 'animate-gradient-night',
    particleColor: 'rgba(255, 255, 255, 0.8)'
  },
  harvest: {
    gradientFrom: 'from-green-500',
    gradientVia: 'via-emerald-400',
    gradientTo: 'to-teal-500',
    animation: 'animate-gradient-harvest',
    particleColor: 'rgba(100, 200, 100, 0.6)'
  },
  festival: {
    gradientFrom: 'from-pink-500',
    gradientVia: 'via-rose-400',
    gradientTo: 'to-orange-500',
    animation: 'animate-gradient-festival',
    particleColor: 'rgba(255, 100, 150, 0.6)'
  },
  sunrise: {
    gradientFrom: 'from-yellow-300',
    gradientVia: 'via-orange-400',
    gradientTo: 'to-rose-500',
    animation: 'animate-gradient-sunrise',
    particleColor: 'rgba(255, 220, 100, 0.6)'
  },
  ocean: {
    gradientFrom: 'from-blue-400',
    gradientVia: 'via-cyan-500',
    gradientTo: 'to-teal-600',
    animation: 'animate-gradient-ocean',
    particleColor: 'rgba(100, 200, 255, 0.6)'
  },
  forest: {
    gradientFrom: 'from-green-700',
    gradientVia: 'via-emerald-600',
    gradientTo: 'to-lime-500',
    animation: 'animate-gradient-forest',
    particleColor: 'rgba(50, 150, 50, 0.6)'
  }
};

export const AnimatedBackground: React.FC<AnimatedBackgroundProps> = ({
  theme,
  intensity = 0.5,
  particles = true,
  children,
  className = ''
}) => {
  const config = THEME_CONFIG[theme];
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Array<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    opacity: number;
  }>>([]);
  const animationRef = useRef<number>();

  // Initialize particles
  useEffect(() => {
    if (!particles || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();
    window.addEventListener('resize', resize);

    // Create particles
    const particleCount = Math.floor(30 * intensity);
    particlesRef.current = Array.from({ length: particleCount }, () => ({
      x: Math.random() * canvas.offsetWidth,
      y: Math.random() * canvas.offsetHeight,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5 - 0.3,
      size: Math.random() * 4 + 2,
      opacity: Math.random() * 0.5 + 0.3
    }));

    const animate = () => {
      ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
      
      particlesRef.current.forEach(p => {
        // Update position
        p.x += p.vx;
        p.y += p.vy;
        
        // Wrap around
        if (p.y < -10) p.y = canvas.offsetHeight + 10;
        if (p.y > canvas.offsetHeight + 10) p.y = -10;
        if (p.x < -10) p.x = canvas.offsetWidth + 10;
        if (p.x > canvas.offsetWidth + 10) p.x = -10;
        
        // Draw particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = config.particleColor.replace('0.6', String(p.opacity));
        ctx.fill();
      });
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animate();

    return () => {
      window.removeEventListener('resize', resize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [particles, intensity, config.particleColor]);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Animated gradient background */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: intensity }}
        className={`absolute inset-0 bg-gradient-to-br ${config.gradientFrom} ${config.gradientVia} ${config.gradientTo} ${config.animation}`}
        style={{ backgroundSize: '400% 400%' }}
      />
      
      {/* Particles canvas */}
      {particles && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ opacity: intensity }}
        />
      )}
      
      {/* Overlay gradient for better content readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/30" />
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

// Background selector component for creation flow
interface BackgroundSelectorProps {
  selected: BackgroundTheme | null;
  onSelect: (theme: BackgroundTheme) => void;
}

const THEME_PREVIEWS: { id: BackgroundTheme; label: string; emoji: string }[] = [
  { id: 'savanna', label: 'Savane', emoji: '🌅' },
  { id: 'night_village', label: 'Village Nuit', emoji: '🌙' },
  { id: 'harvest', label: 'Récolte', emoji: '🌾' },
  { id: 'festival', label: 'Festival', emoji: '🎉' },
  { id: 'sunrise', label: 'Lever Soleil', emoji: '☀️' },
  { id: 'ocean', label: 'Océan', emoji: '🌊' },
  { id: 'forest', label: 'Forêt', emoji: '🌳' }
];

export const BackgroundSelector: React.FC<BackgroundSelectorProps> = ({
  selected,
  onSelect
}) => {
  return (
    <div className="grid grid-cols-4 gap-2">
      {THEME_PREVIEWS.map(({ id, label, emoji }) => {
        const config = THEME_CONFIG[id];
        return (
          <motion.button
            key={id}
            whileTap={{ scale: 0.95 }}
            onClick={() => onSelect(id)}
            className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${
              selected === id 
                ? 'border-white ring-2 ring-blue-500' 
                : 'border-transparent'
            }`}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${config.gradientFrom} ${config.gradientVia} ${config.gradientTo}`} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl">{emoji}</span>
              <span className="text-[10px] text-white font-medium mt-1 drop-shadow-lg">{label}</span>
            </div>
            {selected === id && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute top-1 right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center"
              >
                <span className="text-white text-[8px]">✓</span>
              </motion.div>
            )}
          </motion.button>
        );
      })}
    </div>
  );
};

export default AnimatedBackground;
